"""
RoadGuard AI - Synthetic Risk Dataset Generator
==============================================
Generates physics-informed, realistic traffic hazard records with clear synthetic labeling.
Used for training the Phase 2 XGBoost Risk & Congestion model.
"""

import json
import os
import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
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
    "road_type_code",         # 0: arterial, 1: collector, 2: local, 3: roundabout, 4: multi-leg
    "road_damage_severity",   # 0 to 4
    "is_school_hour",         # 0 or 1
    "road_closure_active",     # 0 or 1
    "construction_active"      # 0 or 1
]

def generate_synthetic_dataset(num_samples: int = 5000, random_seed: int = 42) -> pd.DataFrame:
    np.random.seed(random_seed)
    
    # 1. Temporal distributions
    raw_hour_probs = np.array([
        0.01, 0.01, 0.01, 0.01, 0.02, 0.03,  # 00-05
        0.06, 0.09, 0.10, 0.07, 0.05, 0.04,  # 06-11 (morning rush)
        0.05, 0.05, 0.07, 0.08, 0.06, 0.07,  # 12-17 (afternoon rush)
        0.06, 0.04, 0.03, 0.02, 0.01, 0.01   # 18-23
    ], dtype=np.float64)
    hour_probs = raw_hour_probs / raw_hour_probs.sum()
    hour = np.random.choice(range(24), size=num_samples, p=hour_probs)
    
    is_school_hour = np.array([
        1 if (7 <= h <= 8 or 14 <= h <= 15) else 0 for h in hour
    ])
    
    # 2. Weather conditions (tropical / monsoon distribution)
    is_rainy = np.random.binomial(1, 0.22, size=num_samples)
    rain_intensity = np.where(is_rainy, np.random.gamma(shape=2.5, scale=4.0, size=num_samples), 0.0)
    rain_intensity = np.clip(rain_intensity, 0.0, 65.0)
    
    # Visibility correlates with rain and night
    is_night = np.array([1 if (h < 6 or h > 19) else 0 for h in hour])
    base_visibility = np.random.uniform(3000, 10000, size=num_samples)
    visibility = base_visibility - (rain_intensity * 110.0) - (is_night * 1500.0)
    visibility = np.clip(visibility, 150.0, 10000.0)
    
    # 3. Road geometry & environment
    road_type = np.random.choice([0, 1, 2, 3, 4], size=num_samples, p=[0.35, 0.25, 0.15, 0.15, 0.10])
    dist_school = np.random.exponential(scale=600.0, size=num_samples) + 20.0
    dist_school = np.clip(dist_school, 20.0, 2500.0)
    
    dist_hospital = np.random.exponential(scale=900.0, size=num_samples) + 40.0
    dist_hospital = np.clip(dist_hospital, 30.0, 3500.0)
    
    road_closure = np.random.binomial(1, 0.07, size=num_samples)
    construction = np.random.binomial(1, 0.11, size=num_samples)
    road_damage = np.random.choice([0, 1, 2, 3, 4], size=num_samples, p=[0.40, 0.28, 0.18, 0.10, 0.04])
    
    # 4. Traffic Flow Dynamics
    # Rush hours drive high vehicle & pedestrian volume
    is_rush = np.array([1 if (8 <= h <= 10 or 16 <= h <= 19) else 0 for h in hour])
    
    base_vehicles = np.where(is_rush, np.random.normal(70, 15, num_samples), np.random.normal(30, 12, num_samples))
    vehicle_count = np.clip(base_vehicles.astype(int), 3, 140)
    
    # Speed is inversely related to congestion and weather
    ideal_speed = np.random.normal(55, 10, num_samples)
    speed_drag = (vehicle_count / 140.0) * 28.0 + (rain_intensity / 65.0) * 14.0 + (road_damage * 3.5)
    avg_speed = np.clip(ideal_speed - speed_drag, 8.0, 85.0)
    
    # Queue length scales with vehicle count, road closures, construction
    queue_base = (vehicle_count * 1.1) + (road_closure * 45.0) + (construction * 25.0) + (road_damage * 5.0)
    queue_length = np.clip(np.random.normal(queue_base, 8.0), 0.0, 220.0)
    
    # Pedestrians surge near schools and during afternoon/morning
    ped_base = np.where(is_school_hour, np.random.normal(65, 18, num_samples), np.random.normal(20, 10, num_samples))
    ped_surge_school = np.where(dist_school < 300, 30.0, 0.0)
    pedestrian_count = np.clip((ped_base + ped_surge_school).astype(int), 0, 180)
    
    # Close-calls: physically driven by high speed + high pedestrians + low visibility
    vulnerability_index = (pedestrian_count / 100.0) * (avg_speed / 50.0)
    school_multiplier = np.where(is_school_hour == 1, 1.6, 1.0)
    conflict_factor = vulnerability_index * (1.0 + (rain_intensity / 25.0)) * school_multiplier
    close_calls = np.random.poisson(lam=np.clip(conflict_factor * 1.8, 0.1, 14.0))
    close_calls = np.clip(close_calls, 0, 15)
    
    # 5. Grounded Risk Formulation (0 - 100 index)
    # Calibrated to reflect true physical danger mechanisms
    risk_raw = (
        (close_calls * 4.5) +                                   # Direct conflict (dominant)
        ((avg_speed - 30.0).clip(0) * 0.45) +                   # Speed kinetic energy
        ((1000.0 - visibility).clip(0) / 1000.0 * 12.0) +       # Blindness risk
        (rain_intensity * 0.40) +                               # Hydroplaning / stopping loss
        (road_damage * 3.5) +                                   # Sudden pothole swerves
        (np.where((dist_school < 250) & (is_school_hour == 1), 16.0, 0.0)) + # School zone surge
        (np.where((dist_hospital < 300) & (queue_length > 70), 12.0, 0.0)) + # Emergency block
        (road_closure * 8.0) +                                  # Bottleneck chaos
        (construction * 6.0)                                    # Lane restriction
    )
    
    # Normalization to 0-100 scale with gentle sigmoid-like dampening
    risk_score = np.clip(risk_raw + np.random.normal(0, 2.0, num_samples), 5.0, 98.5)
    
    # Risk class: 0=Low (<35), 1=Medium (35-65), 2=High/Critical (>65)
    risk_class = np.where(risk_score < 35.0, 0, np.where(risk_score < 65.0, 1, 2))
    
    # Congestion level: 0=Free Flow, 1=Moderate, 2=Congested, 3=Gridlock
    congestion = np.where(queue_length < 25.0, 0,
                 np.where(queue_length < 60.0, 1,
                 np.where(queue_length < 110.0, 2, 3)))
    
    df = pd.DataFrame({
        "vehicle_count": vehicle_count,
        "avg_speed_kmh": np.round(avg_speed, 1),
        "queue_length_m": np.round(queue_length, 1),
        "pedestrian_count": pedestrian_count,
        "close_call_count": close_calls,
        "rain_intensity_mmh": np.round(rain_intensity, 1),
        "visibility_meters": np.round(visibility, 1),
        "hour_of_day": hour,
        "distance_to_school_m": np.round(dist_school, 1),
        "distance_to_hospital_m": np.round(dist_hospital, 1),
        "road_type_code": road_type,
        "road_damage_severity": road_damage,
        "is_school_hour": is_school_hour,
        "road_closure_active": road_closure,
        "construction_active": construction,
        "risk_score": np.round(risk_score, 1),
        "risk_class": risk_class,
        "congestion_level": congestion,
        "data_provenance": "SYNTHETIC_DEMO_DATA"  # Non-negotiable guardrail
    })
    
    return df

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    df = generate_synthetic_dataset(num_samples=6000)
    output_path = os.path.join("data", "synthetic_risk_dataset.csv")
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} synthetic traffic risk records at {output_path}")
    print("Class distribution:")
    print(df["risk_class"].value_counts(normalize=True))
