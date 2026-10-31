from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from pydantic import BaseModel, Field
from backend.app.database import db
from backend.app.services.video_analysis_service import video_analysis_service
from backend.app.auth import require_role

router = APIRouter(prefix="/incidents", tags=["Geospatial Incident Intelligence & Video Analytics"])

class AnalyzeMediaRequest(BaseModel):
    media_filename: Optional[str] = "dashcam_video_feed.mp4"
    lat_hint: Optional[float] = None
    lng_hint: Optional[float] = None
    road_name_hint: Optional[str] = None
    landmark_hint: Optional[str] = None
    sample_frames: int = Field(5, ge=1, le=30)

class LocationConfirmationRequest(BaseModel):
    lat: float
    lng: float
    road_name: str
    landmark: Optional[str] = None

class AlertStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(ACTIVE|ACKNOWLEDGED|ACTIONED)$")

@router.post("/analyze-media")
async def analyze_road_media(
    payload: AnalyzeMediaRequest,
    current_user: dict = Depends(require_role(["road_safety_officer", "traffic_police", "road_maintenance", "officer", "police", "maintenance", "admin"]))
):
    """
    Analyses uploaded road video or photographic evidence:
    - Runs road damage detection (YOLO26m / YOLO11 / YOLOv8 RDD2022)
    - Runs traffic volume & conflict detection (YOLOv8 COCO + ByteTrack)
    - Extracts timestamps, bounding boxes, and confidence values
    - Binds findings to confirmed geospatial coordinates
    - Dispatches 3 tailored departmental alerts
    """
    try:
        result = video_analysis_service.analyze_road_media(
            media_filename=payload.media_filename,
            lat_hint=payload.lat_hint,
            lng_hint=payload.lng_hint,
            road_name_hint=payload.road_name_hint,
            landmark_hint=payload.landmark_hint,
            sample_frames=payload.sample_frames
        )
        db.log_audit(
            current_user.get("full_name", "Operator"),
            current_user.get("role", "staff"),
            "ANALYZE_VIDEO_MEDIA",
            result["id"],
            f"Analyzed {payload.media_filename}: Risk {result['risk_score']} ({result['risk_class']})"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video analysis pipeline error: {str(e)}")

@router.get("")
async def list_incidents():
    """
    Returns all detected road incidents with confirmed locations for geospatial map display.
    """
    return db.get_all_incidents()

@router.get("/{incident_id}")
async def get_incident_detail(incident_id: str):
    inc = db.get_incident_by_id(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")
    return inc

@router.post("/{incident_id}/confirm-location")
async def confirm_incident_location(
    incident_id: str,
    payload: LocationConfirmationRequest,
    current_user: dict = Depends(require_role(["road_safety_officer", "traffic_police", "road_maintenance", "officer", "police", "maintenance", "admin"]))
):
    """
    Confirms or refines the exact GPS location of a detected road incident.
    """
    inc = db.get_incident_by_id(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found.")

    db.update_incident_location(
        incident_id=incident_id,
        lat=payload.lat,
        lng=payload.lng,
        road_name=payload.road_name,
        landmark=payload.landmark,
        confirmed=True
    )
    db.log_audit(
        current_user.get("full_name", "Operator"),
        current_user.get("role", "staff"),
        "CONFIRM_INCIDENT_LOCATION",
        incident_id,
        f"GPS confirmed at ({payload.lat}, {payload.lng}) on {payload.road_name}"
    )
    return db.get_incident_by_id(incident_id)

@router.get("/alerts/{department}")
async def get_departmental_alerts(department: str):
    """
    Returns incident alerts tailored to the requested department (safety, traffic, maintenance, or all).
    """
    return db.get_alerts_by_department(department)

@router.put("/alerts/{alert_id}/status")
async def update_alert_status(
    alert_id: str,
    payload: AlertStatusUpdateRequest,
    current_user: dict = Depends(require_role(["road_safety_officer", "traffic_police", "road_maintenance", "officer", "police", "maintenance", "admin"]))
):
    db.update_alert_status(alert_id, payload.status)
    db.log_audit(
        current_user.get("full_name", "Operator"),
        current_user.get("role", "staff"),
        "UPDATE_ALERT_STATUS",
        alert_id,
        f"Alert status updated to {payload.status}"
    )
    return {"id": alert_id, "status": payload.status}

@router.get("/road-segments/corridors")
async def get_hazard_road_segments():
    """
    Returns multi-point polylines for high-risk road corridors color-coded by hazard tier.
    """
    return db.get_road_segments()
