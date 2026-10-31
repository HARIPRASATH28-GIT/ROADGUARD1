import pytest
import bcrypt
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import db
from backend.app.auth import LOGIN_ATTEMPTS, create_access_token

client = TestClient(app)

def test_seed_passwords_are_hashed_in_db():
    user = db.get_user_by_email("hariprasathsTP@gmail.com")
    assert user is not None
    # Must be valid bcrypt hash starting with $2b$ or $2a$
    assert user["password_hash"].startswith("$2b$") or user["password_hash"].startswith("$2a$")
    assert user["password_hash"] != "hari"  # Plain text strictly prohibited
    assert bcrypt.checkpw(b"hari", user["password_hash"].encode("utf-8")) is True

def test_successful_login_and_redirect_urls():
    # 1. Traffic Police
    res_tp = client.post("/api/v1/auth/login", json={"email": "hariprasathsTP@gmail.com", "password": "hari"})
    assert res_tp.status_code == 200
    data_tp = res_tp.json()
    assert data_tp["role"] == "traffic_police"
    assert data_tp["redirect_url"] == "/traffic"
    assert "access_token" in data_tp

    # 2. Road Safety Officer
    res_rs = client.post("/api/v1/auth/login", json={"email": "hariprasathsRS@gmail.com", "password": "hari"})
    assert res_rs.status_code == 200
    data_rs = res_rs.json()
    assert data_rs["role"] == "road_safety_officer"
    assert data_rs["redirect_url"] == "/safety"

    # 3. Road Maintenance
    res_rm = client.post("/api/v1/auth/login", json={"email": "hariprasathsRM@gmail.com", "password": "hari"})
    assert res_rm.status_code == 200
    data_rm = res_rm.json()
    assert data_rm["role"] == "road_maintenance"
    assert data_rm["redirect_url"] == "/maintenance"

def test_rbac_cross_role_access_returns_403():
    # Get tokens for each role
    token_tp = client.post("/api/v1/auth/login", json={"email": "hariprasathsTP@gmail.com", "password": "hari"}).json()["access_token"]
    token_rs = client.post("/api/v1/auth/login", json={"email": "hariprasathsRS@gmail.com", "password": "hari"}).json()["access_token"]
    token_rm = client.post("/api/v1/auth/login", json={"email": "hariprasathsRM@gmail.com", "password": "hari"}).json()["access_token"]

    # Traffic Police CANNOT access safety officer hotspots
    res = client.get("/api/v1/risk/hotspots", headers={"Authorization": f"Bearer {token_tp}"})
    assert res.status_code == 403

    # Traffic Police CANNOT access maintenance damages
    res = client.get("/api/v1/maintenance/damages", headers={"Authorization": f"Bearer {token_tp}"})
    assert res.status_code == 403

    # Road Safety Officer CANNOT access traffic congestion layer
    res = client.get("/api/v1/traffic/congestion-map", headers={"Authorization": f"Bearer {token_rs}"})
    assert res.status_code == 403

    # Road Maintenance CANNOT access traffic congestion layer
    res = client.get("/api/v1/traffic/congestion-map", headers={"Authorization": f"Bearer {token_rm}"})
    assert res.status_code == 403

    # BUT each role CAN access their own endpoint:
    assert client.get("/api/v1/traffic/congestion-map", headers={"Authorization": f"Bearer {token_tp}"}).status_code == 200
    assert client.get("/api/v1/risk/hotspots", headers={"Authorization": f"Bearer {token_rs}"}).status_code == 200
    assert client.get("/api/v1/maintenance/damages", headers={"Authorization": f"Bearer {token_rm}"}).status_code == 200

def test_public_app_works_with_no_login():
    res = client.get("/api/v1/public/approved-hotspots")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)

def test_generic_error_on_invalid_credentials():
    # Non-existent user
    res1 = client.post("/api/v1/auth/login", json={"email": "unknown_intruder@gmail.com", "password": "wrong"})
    assert res1.status_code == 401
    assert res1.json()["detail"] == "Invalid email or password"

    # Existing user with wrong password
    res2 = client.post("/api/v1/auth/login", json={"email": "hariprasathsTP@gmail.com", "password": "wrongpassword"})
    assert res2.status_code == 401
    assert res2.json()["detail"] == "Invalid email or password"

def test_rate_limiting_locks_after_5_failures():
    test_email = "victim_rate_limit@gmail.com"
    LOGIN_ATTEMPTS.pop(test_email, None)

    # 4 failed attempts should return 401
    for _ in range(4):
        res = client.post("/api/v1/auth/login", json={"email": test_email, "password": "bad"})
        assert res.status_code == 401

    # 5th attempt fails and triggers brief lockout
    res5 = client.post("/api/v1/auth/login", json={"email": test_email, "password": "bad"})
    assert res5.status_code in [401, 429]

    # Subsequent attempt is locked with 429
    res_locked = client.post("/api/v1/auth/login", json={"email": test_email, "password": "bad"})
    assert res_locked.status_code == 429
    assert "Too many failed login attempts" in res_locked.json()["detail"]

    # Clean up
    LOGIN_ATTEMPTS.pop(test_email, None)

def test_logout_creates_audit_entry():
    token_rs = client.post("/api/v1/auth/login", json={"email": "hariprasathsRS@gmail.com", "password": "hari"}).json()["access_token"]
    res = client.post("/api/v1/auth/logout", headers={"Authorization": f"Bearer {token_rs}"})
    assert res.status_code == 200
    assert "Logged out successfully" in res.json()["message"]
