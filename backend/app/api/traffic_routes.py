from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from backend.app.database import db
from backend.app.auth import require_role
from backend.app.schemas import SignalOptimizationRequest

router = APIRouter(prefix="/traffic", tags=["Traffic Police Console"])

@router.get("/congestion-map")
async def get_traffic_congestion_layer(
    current_user: dict = Depends(require_role(["traffic_police", "police", "admin"]))
):
    """
    Returns live congestion map points across junctions.
    Strictly aggregates: counts, speeds, queue lengths, and congestion status.
    No individual vehicles or plates.
    """
    hotspots = db.get_all_hotspots()
    layer = []
    for h in hotspots:
        tel = h.get("telemetry", {})
        layer.append({
            "junction_id": h["id"],
            "name": h["name"],
            "lat": h["lat"],
            "lng": h["lng"],
            "congestion_level": h.get("current_congestion", "Moderate"),
            "vehicle_volume_5min": tel.get("vehicle_count", 50),
            "avg_speed_kmh": tel.get("avg_speed_kmh", 40.0),
            "queue_length_m": tel.get("queue_length_m", 45.0),
            "rush_indicator": "HIGH RUSH" if tel.get("vehicle_count", 0) > 80 else "NORMAL FLOW"
        })
    return layer

@router.get("/vulnerable-zones")
async def get_vulnerable_zones(
    current_user: dict = Depends(require_role(["traffic_police", "police", "admin"]))
):
    """
    Returns school and hospital spatial layers with risky peak time windows.
    """
    hotspots = db.get_all_hotspots()
    zones = []
    for h in hotspots:
        if h.get("distance_to_school_m", 1000) < 400:
            zones.append({
                "type": "SCHOOL_ZONE",
                "name": h.get("school_name", "School Area"),
                "junction_id": h["id"],
                "lat": h["lat"],
                "lng": h["lng"],
                "distance_m": h["distance_to_school_m"],
                "risky_time_windows": ["07:30 - 08:45 AM (Morning Bell)", "14:00 - 15:30 PM (Dispersal Bell)"],
                "recommended_speed_limit_kmh": 20,
                "current_hour_active": h.get("telemetry", {}).get("is_school_hour") == 1
            })
        if h.get("distance_to_hospital_m", 1000) < 400:
            zones.append({
                "type": "HOSPITAL_CORRIDOR",
                "name": h.get("hospital_name", "Emergency Hospital"),
                "junction_id": h["id"],
                "lat": h["lat"],
                "lng": h["lng"],
                "distance_m": h["distance_to_hospital_m"],
                "risky_time_windows": ["24x7 Ambulance Priority Corridor", "17:00 - 20:30 PM (Evening Peak Bottleneck)"],
                "queue_threat": h.get("telemetry", {}).get("queue_length_m", 0) > 60
            })
    return zones

@router.get("/optimization-suggestions")
async def get_optimization_suggestions(
    current_user: dict = Depends(require_role(["traffic_police", "police", "admin"]))
):
    """
    Actionable tactical suggestions for signal timing, staff deployment, and lane changes.
    """
    hotspots = db.get_all_hotspots()
    suggestions = []
    for h in hotspots:
        tel = h.get("telemetry", {})
        if tel.get("queue_length_m", 0) > 80:
            suggestions.append({
                "suggestion_id": f"SUG-SIG-{h['id']}",
                "junction_id": h["id"],
                "junction_name": h["name"],
                "action": "Increase Green Phase Split by +18 Seconds",
                "reason": f"Queue spillback at {tel.get('queue_length_m')}m on primary arterial approach.",
                "estimated_delay_reduction_pct": 24.5,
                "status": "PROPOSED"
            })
        if tel.get("is_school_hour") == 1 and h.get("distance_to_school_m", 1000) < 300:
            suggestions.append({
                "suggestion_id": f"SUG-STAFF-{h['id']}",
                "junction_id": h["id"],
                "junction_name": h["name"],
                "action": "Deploy 1 Traffic Warden at School Crosswalk Gate",
                "reason": "School closing rush with high crossing density.",
                "estimated_delay_reduction_pct": 35.0,
                "status": "PROPOSED"
            })
        if tel.get("road_closure_active") == 1:
            suggestions.append({
                "suggestion_id": f"SUG-DIV-{h['id']}",
                "junction_id": h["id"],
                "junction_name": h["name"],
                "action": "Activate Upstream VMS Sign to Divert Heavy Vehicles",
                "reason": "Active road closure upstream causing merge choke.",
                "estimated_delay_reduction_pct": 31.0,
                "status": "PROPOSED"
            })
    return suggestions

@router.post("/respond-suggestion")
async def respond_to_suggestion(
    suggestion_id: str,
    action: str, # ACCEPT or REJECT
    current_user: dict = Depends(require_role(["traffic_police", "police", "admin"]))
):
    db.log_audit(
        current_user.get("full_name") or current_user.get("email", "traffic_officer"),
        current_user.get("role", "traffic_police"),
        f"POLICE_{action}_SUGGESTION",
        suggestion_id,
        f"Tactical response {action} applied by traffic operations."
    )
    return {
        "suggestion_id": suggestion_id,
        "action": action,
        "acknowledged_by": current_user["full_name"],
        "message": f"Suggestion {suggestion_id} marked as {action}ed."
    }
