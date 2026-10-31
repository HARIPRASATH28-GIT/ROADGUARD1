import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import db

client = TestClient(app)

def get_auth_token(role="traffic_police", email="hariprasathsTP@gmail.com"):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": "hari"})
    return res.json()["access_token"]

def test_get_road_segments():
    res = client.get("/api/v1/incidents/road-segments/corridors")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 6
    assert any(s["hazard_level"] == "CRITICAL" for s in data)

def test_get_incidents_and_alerts():
    res = client.get("/api/v1/incidents")
    assert res.status_code == 200
    incidents = res.json()
    assert len(incidents) >= 1

    res_alt = client.get("/api/v1/incidents/alerts/all")
    assert res_alt.status_code == 200
    alerts = res_alt.json()
    assert len(alerts) >= 1

def test_analyze_media_and_confirm_location():
    token = get_auth_token("road_safety_officer", "hariprasathsRS@gmail.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Analyze media
    res = client.post("/api/v1/incidents/analyze-media", json={
        "media_filename": "orrr_test_footage.mp4",
        "lat_hint": 12.9176,
        "lng_hint": 77.6238,
        "road_name_hint": "Outer Ring Road (Silk Board West)",
        "sample_frames": 3
    }, headers=headers)
    assert res.status_code == 200
    inc_data = res.json()
    assert "id" in inc_data
    assert inc_data["risk_score"] > 0
    assert len(inc_data["department_alerts"]) == 3

    inc_id = inc_data["id"]

    # 2. Confirm location
    res_conf = client.post(f"/api/v1/incidents/{inc_id}/confirm-location", json={
        "lat": 12.9180,
        "lng": 77.6245,
        "road_name": "Outer Ring Road (Silk Board Central Bus Bay)",
        "landmark": "Metro Pillar #150"
    }, headers=headers)
    assert res_conf.status_code == 200
    conf_data = res_conf.json()
    assert conf_data["location_confirmed"] == 1
    assert conf_data["road_name"] == "Outer Ring Road (Silk Board Central Bus Bay)"
