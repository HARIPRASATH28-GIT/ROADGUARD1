"""
RoadGuard AI - Risk & Congestion Model Training Script
=====================================================
Trains XGBoost regressors/classifiers on junction hazard features.
Extracts TreeSHAP explainability baselines and saves metrics.
"""

import os
import json
import numpy as np
import pandas as pd
import xgboost as xgb
import shap
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, classification_report, precision_score, recall_score
from data_generator import generate_synthetic_dataset, FEATURE_COLUMNS

def train_and_export():
    os.makedirs(os.path.join("ml", "models"), exist_ok=True)
    os.makedirs("data", exist_ok=True)
    
    print("[1/5] Generating labeled synthetic dataset with ethical guardrails...")
    df = generate_synthetic_dataset(num_samples=7500, random_seed=42)
    df.to_csv(os.path.join("data", "synthetic_risk_dataset.csv"), index=False)
    
    X = df[FEATURE_COLUMNS]
    y_risk = df["risk_score"]
    y_congestion = df["congestion_level"]
    y_class = df["risk_class"]
    
    X_train, X_test, y_risk_train, y_risk_test, y_cong_train, y_cong_test, y_class_train, y_class_test = train_test_split(
        X, y_risk, y_congestion, y_class, test_size=0.2, random_state=42
    )
    
    print("[2/5] Training XGBoost Risk Regressor (0-100 scale)...")
    risk_model = xgb.XGBRegressor(
        n_estimators=160,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42
    )
    risk_model.fit(X_train, y_risk_train)
    
    risk_preds = risk_model.predict(X_test)
    mse = float(mean_squared_error(y_risk_test, risk_preds))
    r2 = float(r2_score(y_risk_test, risk_preds))
    print(f"Risk Regressor MSE: {mse:.3f}, R2: {r2:.3f}")
    
    # Hazard-detection precision/recall on High Risk (>= 65)
    high_risk_true = (y_risk_test >= 65.0).astype(int)
    high_risk_pred = (risk_preds >= 65.0).astype(int)
    hazard_precision = float(precision_score(high_risk_true, high_risk_pred, zero_division=0))
    hazard_recall = float(recall_score(high_risk_true, high_risk_pred, zero_division=0))
    
    # False alarms per day estimate based on test error distribution (rate of false positive high-risk alerts)
    false_positives = int(np.sum((high_risk_pred == 1) & (high_risk_true == 0)))
    total_samples = len(high_risk_true)
    fp_rate = false_positives / total_samples
    est_false_alarms_day = round(fp_rate * 288 * 0.12, 2)  # assuming 288 5-min cycles with ~10% active alerts
    
    print(f"Hazard Precision: {hazard_precision:.3f}, Recall: {hazard_recall:.3f}, Est False Alarms/Day: {est_false_alarms_day}")
    
    print("[3/5] Training XGBoost Congestion Classifier (0 to 3)...")
    cong_model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42
    )
    cong_model.fit(X_train, y_cong_train)
    cong_preds = cong_model.predict(X_test)
    cong_acc = float(np.mean(cong_preds == y_cong_test))
    print(f"Congestion Classifier Accuracy: {cong_acc:.3f}")
    
    print("[4/5] Initializing SHAP TreeExplainer & Background Distribution...")
    # Use subset for fast TreeExplainer background
    explainer = shap.TreeExplainer(risk_model)
    sample_shap = explainer(X_test.iloc[:100])
    mean_abs_shap = np.mean(np.abs(sample_shap.values), axis=0).tolist()
    feature_importance = dict(zip(FEATURE_COLUMNS, mean_abs_shap))
    sorted_importance = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    print("Top global SHAP factors:", sorted_importance[:5])
    
    print("[5/5] Exporting model artifacts and performance metrics...")
    risk_model_path = os.path.join("ml", "models", "xgboost_risk.json")
    cong_model_path = os.path.join("ml", "models", "xgboost_congestion.json")
    risk_model.save_model(risk_model_path)
    cong_model.save_model(cong_model_path)
    
    metadata = {
        "features": FEATURE_COLUMNS,
        "feature_types": {
            "vehicle_count": "int",
            "avg_speed_kmh": "float",
            "queue_length_m": "float",
            "pedestrian_count": "int",
            "close_call_count": "int",
            "rain_intensity_mmh": "float",
            "visibility_meters": "float",
            "hour_of_day": "int",
            "distance_to_school_m": "float",
            "distance_to_hospital_m": "float",
            "road_type_code": "int",
            "road_damage_severity": "int",
            "is_school_hour": "int",
            "road_closure_active": "int",
            "construction_active": "int"
        },
        "road_type_mapping": {
            0: "Arterial Highway",
            1: "Collector Avenue",
            2: "Local Street",
            3: "Roundabout Junction",
            4: "Multi-leg Unsignalized"
        },
        "congestion_classes": {
            0: "Free Flow",
            1: "Moderate",
            2: "Congested",
            3: "Gridlock"
        },
        "model_type": "XGBoost + SHAP TreeExplainer",
        "provenance": "SYNTHETIC_DEMO_DATA"
    }
    
    metrics = {
        "hazard_precision": round(hazard_precision, 4),
        "hazard_recall": round(hazard_recall, 4),
        "false_alarms_per_day": est_false_alarms_day,
        "r2_score": round(r2, 4),
        "mse": round(mse, 4),
        "congestion_accuracy": round(cong_acc, 4),
        "dataset_size": len(df),
        "top_global_shap_factors": [item[0] for item in sorted_importance[:5]],
        "provenance": "DEMO / SYNTHETIC EVALUATION"
    }
    
    with open(os.path.join("ml", "models", "feature_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
        
    with open(os.path.join("ml", "models", "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
        
    print(f"Successfully trained and exported models to ml/models/")

if __name__ == "__main__":
    train_and_export()
