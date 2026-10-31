from typing import List, Dict, Any
from fastapi import APIRouter
from backend.app.database import db

router = APIRouter(prefix="/public", tags=["Public Safety App (Zero-Knowledge)"])

@router.get("/approved-hotspots")
async def get_approved_hotspots_for_public():
    """
    CRITICAL GUARDRAIL:
    Only officer-approved hotspots are returned.
    Unapproved or rejected hotspots never leak to the public app.
    
    ZERO-KNOWLEDGE GPS:
    No device coordinates are sent to this endpoint. The browser downloads
    the approved hotspots dataset once and executes geofencing entirely on-device.
    """
    all_hotspots = db.get_all_hotspots()
    approved = []
    for h in all_hotspots:
        if h["status"] == "APPROVED":
            approved.append({
                "id": h["id"],
                "name": h["name"],
                "lat": h["lat"],
                "lng": h["lng"],
                "warning_tag": h.get("public_warning_tag", "Caution: Busy Crossing Ahead"),
                "cause_tag": h["top_factors"][0]["label"] if h.get("top_factors") else "General Traffic Caution",
                "recommended_action": "Reduce speed, maintain lane discipline, watch for pedestrians.",
                "geofence_radius_meters": 300,
                "approved_at": h.get("approved_at"),
                "approved_by": h.get("approved_by")
            })
    return approved

@router.get("/approved-damages")
async def get_approved_damages_for_public():
    """
    Public display of active road damages that drivers should beware of (e.g., potholes).
    """
    all_damages = db.get_all_damages()
    public_damages = []
    for d in all_damages:
        if d.get("work_order_status") in ["REPORTED", "IN_PROGRESS"]:
            public_damages.append({
                "id": d["id"],
                "damage_type": d["damage_type"],
                "lat": d["lat"],
                "lng": d["lng"],
                "severity": d["severity"],
                "warning_tag": "Road Surface Defect Ahead - Maintain Steady Trajectory",
                "responsible_body": d["responsible_body"]
            })
    return public_damages
