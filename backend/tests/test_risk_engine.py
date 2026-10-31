import pytest
from backend.app.services.risk_service import risk_service

def test_risk_prediction_valid_features():
    features = {
        "vehicle_count": 80,
        "avg_speed_kmh": 65.0,
        "queue_length_m": 120.0,
        "pedestrian_count": 90,
        "close_call_count": 7,
        "rain_intensity_mmh": 15.0,
        "visibility_meters": 1200.0,
        "hour_of_day": 17,
        "distance_to_school_m": 150.0,
        "distance_to_hospital_m": 200.0,
        "road_type_code": 0,
        "road_damage_severity": 2,
        "is_school_hour": 1,
        "road_closure_active": 1,
        "construction_active": 0
    }
    risk_score, risk_class, congestion, ranked_factors, latency_ms = risk_service.predict_risk(features)
    
    assert 0.0 <= risk_score <= 100.0
    assert risk_class in ["Low", "Medium", "High / Critical"]
    assert congestion in ["Free Flow", "Moderate", "Congested", "Gridlock"]
    assert len(ranked_factors) == 15
    assert latency_ms < 500.0  # Fast sub-second execution
    # Severe conditions should yield high risk
    assert risk_score > 60.0

def test_risk_increases_with_close_calls():
    base_features = {
        "vehicle_count": 40,
        "avg_speed_kmh": 40.0,
        "queue_length_m": 30.0,
        "pedestrian_count": 20,
        "close_call_count": 0,
        "rain_intensity_mmh": 0.0,
        "visibility_meters": 8000.0,
        "hour_of_day": 12,
        "distance_to_school_m": 800.0,
        "distance_to_hospital_m": 1200.0,
        "road_type_code": 1,
        "road_damage_severity": 0,
        "is_school_hour": 0,
        "road_closure_active": 0,
        "construction_active": 0
    }
    low_risk, _, _, _, _ = risk_service.predict_risk(base_features)
    
    hazardous_features = base_features.copy()
    hazardous_features["close_call_count"] = 8
    hazardous_features["rain_intensity_mmh"] = 25.0
    high_risk, _, _, _, _ = risk_service.predict_risk(hazardous_features)
    
    assert high_risk > low_risk
