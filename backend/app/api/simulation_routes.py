from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from backend.app.schemas import SimulationRequest, SimulationResponse
from backend.app.database import db
from backend.app.services.risk_service import risk_service
from backend.app.services.rules_engine import rules_engine
from backend.app.services.groundedness_service import groundedness_service
from backend.app.services.osm_service import osm_service

router = APIRouter(prefix="/simulate", tags=["Dynamic Adaptation & Sliders"])

@router.post("", response_model=SimulationResponse)
async def run_simulation(params: SimulationRequest):
    """
    Recomputes junction risk, SHAP feature attributions, countermeasure recommendation,
    and public warning text in milliseconds when sliders (weather, hour, closure, construction) change.
    """
    hotspot = db.get_hotspot_by_id(params.hotspot_id)
    if not hotspot:
        raise HTTPException(status_code=404, detail=f"Hotspot {params.hotspot_id} not found")

    telemetry = hotspot.get("telemetry", {}).copy()

    # Dynamic adaptation: apply what-if slider overrides
    telemetry["rain_intensity_mmh"] = params.rain_intensity_mmh
    telemetry["visibility_meters"] = params.visibility_meters
    telemetry["hour_of_day"] = params.hour_of_day
    telemetry["is_school_hour"] = params.is_school_hour
    telemetry["road_closure_active"] = params.road_closure_active
    telemetry["construction_active"] = params.construction_active

    if params.vehicle_count is not None:
        telemetry["vehicle_count"] = params.vehicle_count
    if params.avg_speed_kmh is not None:
        telemetry["avg_speed_kmh"] = params.avg_speed_kmh
    if params.pedestrian_count is not None:
        telemetry["pedestrian_count"] = params.pedestrian_count
    if params.close_call_count is not None:
        telemetry["close_call_count"] = params.close_call_count

    # Physics reaction: if road closure is active, queue length surges
    if params.road_closure_active == 1:
        telemetry["queue_length_m"] = min(220.0, telemetry.get("queue_length_m", 60.0) + 55.0)

    # Physics reaction: if rain is heavy (> 15mm/h) and visibility drops, close calls increase
    if params.rain_intensity_mmh > 15.0:
        telemetry["close_call_count"] = max(telemetry.get("close_call_count", 2), int(telemetry.get("close_call_count", 2) * 1.5) + 2)

    # Recompute with XGBoost and TreeSHAP
    risk_score, risk_class, congestion, ranked_factors, latency_ms = risk_service.predict_risk(telemetry)

    # Get OSM geometry context
    osm_ctx = osm_service.get_junction_context(params.hotspot_id, hotspot["lat"], hotspot["lng"])

    # Evaluate new intervention recommendation
    recommendation = rules_engine.recommend_intervention(ranked_factors, telemetry, osm_ctx)

    # Generate public warning
    warning_text = rules_engine.generate_public_warning(recommendation, ranked_factors)

    # Check groundedness of recommendation text against computed evidence
    combined_text = f"{recommendation.get('why_dangerous', '')} {recommendation.get('recommended_fix', '')} {warning_text}"
    eval_result = groundedness_service.evaluate_groundedness(combined_text, telemetry, ranked_factors)

    # Log simulation latency
    db.log_simulation(params.hotspot_id, risk_score, latency_ms, params.model_dump())

    return SimulationResponse(
        hotspot_id=params.hotspot_id,
        recomputed_risk_score=risk_score,
        recomputed_risk_class=risk_class,
        recomputed_congestion=congestion,
        latency_ms=latency_ms,
        top_shap_factors=ranked_factors[:5],
        recommendation=recommendation,
        public_warning_text=warning_text,
        groundedness_verified=eval_result["groundedness_score"] >= 0.8,
        evidence_trail=eval_result["evidence_trail"],
        provenance="DEMO / SYNTHETIC ENGINE"
    )
