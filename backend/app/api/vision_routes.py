from typing import Optional
from fastapi import APIRouter, Query
from backend.app.services.vision_pipeline import vision_pipeline
from backend.app.services.risk_service import risk_service

router = APIRouter(prefix="/vision", tags=["Vision Pipeline & Video Aggregation"])

@router.post("/process-clip")
async def process_clip(clip_name: Optional[str] = Query("silkboard_traffic_sample.mp4")):
    """
    Executes Phase 4 video aggregation:
    - Runs OpenCV frame extraction
    - Applies YOLOv8 and ByteTrack tracking
    - Blurs faces and license plates
    - Computes close-calls and visibility
    - Drops all tracker IDs immediately (Guardrail)
    - Feeds aggregates into XGBoost risk engine
    """
    aggregates = vision_pipeline.process_video_clip(video_path=None, max_frames=60)
    
    # Feed aggregates into Phase 2 risk engine
    feature_dict = {
        "vehicle_count": aggregates["vehicle_count"],
        "avg_speed_kmh": aggregates["avg_speed_kmh"],
        "queue_length_m": aggregates["queue_length_m"],
        "pedestrian_count": aggregates["pedestrian_count"],
        "close_call_count": aggregates["close_call_count"],
        "rain_intensity_mmh": 0.0,
        "visibility_meters": aggregates["brightness_index"] * 60.0,
        "hour_of_day": 14,
        "distance_to_school_m": 310.0,
        "distance_to_hospital_m": 240.0,
        "road_type_code": 0,
        "road_damage_severity": 1,
        "is_school_hour": 0,
        "road_closure_active": 0,
        "construction_active": 0
    }
    
    risk_score, risk_class, congestion, top_factors, latency_ms = risk_service.predict_risk(feature_dict)
    
    aggregates["derived_risk_score"] = risk_score
    aggregates["derived_risk_class"] = risk_class
    aggregates["derived_congestion"] = congestion
    aggregates["top_contributing_factors"] = top_factors[:3]
    
    return aggregates
