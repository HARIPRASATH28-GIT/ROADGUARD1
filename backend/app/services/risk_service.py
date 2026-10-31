import os
import json
import time
import logging
import numpy as np
import pandas as pd
import xgboost as xgb
import shap
from typing import Dict, Any, List, Tuple
from backend.app.config import settings

logger = logging.getLogger(__name__)

FEATURE_NAMES = [
    "vehicle_count",
    "avg_speed_kmh",
    "queue_length_m",
    "pedestrian_count",
    "close_call_count",
    "rain_intensity_mmh",
    "visibility_meters",
    "hour_of_day",
    "distance_to_school_m",
    "distance_to_hospital_m",
    "road_type_code",
    "road_damage_severity",
    "is_school_hour",
    "road_closure_active",
    "construction_active"
]

FACTOR_READABLE_NAMES = {
    "vehicle_count": "Vehicular Volume",
    "avg_speed_kmh": "Approach Velocity",
    "queue_length_m": "Queue Length & Spillback",
    "pedestrian_count": "Pedestrian Crossing Density",
    "close_call_count": "Pedestrian-Vehicle Conflicts",
    "rain_intensity_mmh": "Rainfall & Surface Moisture",
    "visibility_meters": "Visibility & Lighting Index",
    "hour_of_day": "Diurnal Rush Period",
    "distance_to_school_m": "School Zone Proximity",
    "distance_to_hospital_m": "Hospital Ambulance Corridor",
    "road_type_code": "Junction Road Hierarchy",
    "road_damage_severity": "Pothole & Pavement Distress",
    "is_school_hour": "School Bell-Time Peak Window",
    "road_closure_active": "Upstream Bottleneck / Closure",
    "construction_active": "Work-Zone Lane Restriction"
}

class RiskService:
    def __init__(self):
        self.risk_model: xgb.XGBRegressor = None
        self.congestion_model: xgb.XGBClassifier = None
        self.explainer: shap.TreeExplainer = None
        self._load_models()

    def _load_models(self):
        risk_path = os.path.join(settings.ML_MODELS_DIR, "xgboost_risk.json")
        cong_path = os.path.join(settings.ML_MODELS_DIR, "xgboost_congestion.json")
        
        if os.path.exists(risk_path) and os.path.exists(cong_path):
            try:
                self.risk_model = xgb.XGBRegressor()
                self.risk_model.load_model(risk_path)
                
                self.congestion_model = xgb.XGBClassifier()
                self.congestion_model.load_model(cong_path)
                
                self.explainer = shap.TreeExplainer(self.risk_model)
                logger.info("XGBoost risk & congestion models and SHAP explainer loaded successfully.")
            except Exception as e:
                logger.error(f"Error loading XGBoost models: {e}")
        else:
            logger.warning(f"Model files not found in {settings.ML_MODELS_DIR}. Please run ml/train_risk_model.py")

    def predict_risk(self, feature_dict: Dict[str, Any]) -> Tuple[float, str, str, List[Dict[str, Any]], float]:
        """
        Runs XGBoost inference and SHAP local attribution.
        Returns:
            (risk_score, risk_class, congestion_level, ranked_shap_factors, latency_ms)
        """
        start_time = time.perf_counter()
        
        # Prepare feature vector
        vector = []
        for feat in FEATURE_NAMES:
            val = feature_dict.get(feat, 0.0)
            vector.append(float(val))
            
        df_row = pd.DataFrame([vector], columns=FEATURE_NAMES)
        
        if self.risk_model and self.congestion_model and self.explainer:
            # Inference
            raw_risk = float(self.risk_model.predict(df_row)[0])
            risk_score = float(np.clip(raw_risk, 0.0, 100.0))
            
            cong_code = int(self.congestion_model.predict(df_row)[0])
            cong_map = {0: "Free Flow", 1: "Moderate", 2: "Congested", 3: "Gridlock"}
            congestion_str = cong_map.get(cong_code, "Moderate")
            
            # SHAP explanation
            shap_values = self.explainer(df_row)
            vals = shap_values.values[0]
            
            ranked_factors = []
            for i, name in enumerate(FEATURE_NAMES):
                attribution = float(vals[i])
                ranked_factors.append({
                    "factor": name,
                    "label": FACTOR_READABLE_NAMES.get(name, name),
                    "shap_value": round(attribution, 3),
                    "raw_input_value": vector[i],
                    "direction": "+Risk" if attribution >= 0 else "-Risk"
                })
            # Sort by absolute impact
            ranked_factors.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        else:
            # Physics-based heuristic fallback if model file missing
            close_calls = feature_dict.get("close_call_count", 0)
            avg_speed = feature_dict.get("avg_speed_kmh", 40.0)
            rain = feature_dict.get("rain_intensity_mmh", 0.0)
            damage = feature_dict.get("road_damage_severity", 0)
            
            heuristic_risk = (close_calls * 5.0) + (avg_speed * 0.4) + (rain * 0.5) + (damage * 4.0)
            risk_score = float(np.clip(heuristic_risk, 5.0, 95.0))
            congestion_str = "Moderate"
            ranked_factors = [
                {"factor": "close_call_count", "label": "Pedestrian-Vehicle Conflicts", "shap_value": 4.5, "direction": "+Risk"},
                {"factor": "avg_speed_kmh", "label": "Approach Velocity", "shap_value": 3.2, "direction": "+Risk"},
                {"factor": "road_damage_severity", "label": "Pavement Distress", "shap_value": 2.1, "direction": "+Risk"}
            ]
        
        # Risk classification
        if risk_score < 35.0:
            risk_class = "Low"
        elif risk_score < 65.0:
            risk_class = "Medium"
        else:
            risk_class = "High / Critical"
            
        end_time = time.perf_counter()
        latency_ms = round((end_time - start_time) * 1000, 2)
        
        return round(risk_score, 1), risk_class, congestion_str, ranked_factors, latency_ms

risk_service = RiskService()
