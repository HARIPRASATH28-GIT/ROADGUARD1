import os
import json
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, status, Depends, Response, Request
from backend.app.schemas import LoginRequest, TokenResponse, UserProfile, AuthConfigResponse
from backend.app.auth import authenticate_user, create_access_token, get_current_user
from backend.app.config import settings
from backend.app.database import db

router = APIRouter(prefix="/auth", tags=["Authentication & Agency Command"])

ROLE_REDIRECTS = {
    "traffic_police": "/traffic",
    "police": "/traffic",
    "road_safety_officer": "/safety",
    "officer": "/safety",
    "road_maintenance": "/maintenance",
    "maintenance": "/maintenance"
}

@router.get("/config", response_model=AuthConfigResponse)
async def get_auth_config():
    """
    Returns public auth configurations and demo accounts hint (if DEMO_MODE is true).
    """
    demo_accounts = []
    if settings.DEMO_MODE:
        seed_file = os.path.join(settings.DATA_DIR, "seed_users.json")
        if os.path.exists(seed_file):
            try:
                with open(seed_file, "r") as f:
                    seeds = json.load(f)
                    for s in seeds:
                        demo_accounts.append({
                            "email": s["email"],
                            "role": s["role"],
                            "password_hint": s.get("password_plain", "hari"),
                            "department": s.get("department", "Agency Command")
                        })
            except Exception:
                pass

    return AuthConfigResponse(
        demo_mode=settings.DEMO_MODE,
        version=settings.APP_VERSION,
        demo_accounts=demo_accounts
    )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, response: Response):
    identifier = credentials.get_identifier()
    if not identifier or not credentials.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    user = authenticate_user(identifier, credentials.password)
    
    # Short-lived signed JWT access token
    token = create_access_token({
        "sub": user["email"],
        "user_id": user["id"],
        "role": user["role"],
        "full_name": user["full_name"]
    })

    redirect_url = ROLE_REDIRECTS.get(user["role"], "/safety")

    # If remember_me is enabled, set httpOnly cookie (never storing password!)
    if credentials.remember_me:
        response.set_cookie(
            key="roadguard_refresh_token",
            value=token,
            httponly=True,
            max_age=30 * 86400,
            samesite="lax",
            secure=not settings.DEBUG
        )

    # Immutable audit log entry (role + timestamp, zero personal tracking)
    db.log_audit(
        actor=user["email"],
        role=user["role"],
        action="LOGIN",
        target_id=user["id"],
        details=f"Successful agency login redirected to {redirect_url}"
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user["role"],
        email=user["email"],
        full_name=user["full_name"],
        redirect_url=redirect_url
    )

@router.post("/logout")
async def logout(response: Response, current_user: dict = Depends(get_current_user)):
    # Clear remember-me cookie
    response.delete_cookie(key="roadguard_refresh_token")

    # Audit log entry for logout
    db.log_audit(
        actor=current_user["email"],
        role=current_user["role"],
        action="LOGOUT",
        target_id=current_user["id"],
        details="User signed out of agency workspace"
    )

    return {"message": "Logged out successfully", "user": current_user["email"]}

@router.get("/me", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return UserProfile(
        id=current_user["id"],
        email=current_user["email"],
        role=current_user["role"],
        full_name=current_user["full_name"],
        department=current_user.get("department")
    )
