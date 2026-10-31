import pytest
from backend.app.services.groundedness_service import groundedness_service

def test_grounded_statement_passes():
    telemetry = {
        "rain_intensity_mmh": 18.5,
        "avg_speed_kmh": 62.0,
        "close_call_count": 5
    }
    top_factors = [{"factor": "rain_intensity_mmh"}, {"factor": "avg_speed_kmh"}]
    
    text = "High approach speed and wet surface conditions elevate hydroplaning hazard."
    eval_result = groundedness_service.evaluate_groundedness(text, telemetry, top_factors)
    
    assert eval_result["groundedness_score"] == 1.0
    assert eval_result["verified_claims"] >= 1

def test_ungrounded_statement_flagged():
    telemetry = {
        "rain_intensity_mmh": 0.0,
        "avg_speed_kmh": 20.0,
        "close_call_count": 0,
        "road_damage_severity": 0
    }
    top_factors = []
    
    # Text falsely claiming severe potholes and rain when there are none
    fake_text = "Severe pothole craters and heavy torrential rain pose critical hydroplaning danger."
    eval_result = groundedness_service.evaluate_groundedness(fake_text, telemetry, top_factors)
    
    # Groundedness must fail / flag insufficient evidence
    assert eval_result["groundedness_score"] == 0.0
    assert "insufficient evidence" in eval_result["sanitized_text"]
