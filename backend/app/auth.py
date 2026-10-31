import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
import jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.app.config import settings
from backend.app.database import db

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

# In-memory rate limiting for failed login attempts
# Format: { "normalized_email": { "failures": int, "locked_until": float } }
LOGIN_ATTEMPTS: Dict[str, Dict[str, Any]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 60.0  # Brief lockout after 5 failures

def check_rate_limit(identifier: str):
    key = identifier.lower().strip()
    record = LOGIN_ATTEMPTS.get(key)
    if record:
        now = time.time()
        if record["locked_until"] > now:
            remaining = int(record["locked_until"] - now)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Account temporarily locked for {remaining} seconds. Please try again later."
            )

def record_login_failure(identifier: str):
    key = identifier.lower().strip()
    now = time.time()
    record = LOGIN_ATTEMPTS.get(key, {"failures": 0, "locked_until": 0.0})
    record["failures"] += 1
    if record["failures"] >= MAX_FAILED_ATTEMPTS:
        record["locked_until"] = now + LOCKOUT_DURATION_SECONDS
        record["failures"] = 0  # reset for next window
    LOGIN_ATTEMPTS[key] = record

def clear_login_failure(identifier: str):
    key = identifier.lower().strip()
    LOGIN_ATTEMPTS.pop(key, None)

def hash_password(plain_password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(plain_password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        # Short token expiry for security
        expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.AUTH_SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def authenticate_user(email_or_username: str, password: str) -> Dict[str, Any]:
    check_rate_limit(email_or_username)
    
    user = db.get_user_by_email(email_or_username)
    
    # Generic security: prevent user enumeration by not revealing whether email exists
    if not user:
        record_login_failure(email_or_username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    if not verify_password(password, user["password_hash"]):
        record_login_failure(email_or_username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    clear_login_failure(email_or_username)
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.AUTH_SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        user_id: str = payload.get("user_id")
        if email is None or role is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims"
            )
        user = db.get_user_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account no longer active"
            )
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Normalized role alias mapping
ROLE_ALIASES = {
    "traffic_police": ["traffic_police", "police"],
    "road_safety_officer": ["road_safety_officer", "officer"],
    "road_maintenance": ["road_maintenance", "maintenance"]
}

def require_role(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(get_current_user)):
        user_role = current_user["role"]
        
        # Check direct or aliased match
        matched = False
        for req in allowed_roles:
            if req == user_role or user_role in ROLE_ALIASES.get(req, []):
                matched = True
                break
            if req == "admin" and user_role == "admin":
                matched = True
                break
                
        if not matched:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Operation requires role in {allowed_roles}, but caller has role '{user_role}'"
            )
        return current_user
    return role_checker
