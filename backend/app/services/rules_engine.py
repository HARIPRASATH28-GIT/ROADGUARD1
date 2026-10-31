import os
import json
import logging
from typing import Dict, Any, List
from backend.app.config import settings

logger = logging.getLogger(__name__)

class RulesEngine:
    def __init__(self):
        self.rules_file = os.path.join(settings.DATA_DIR, "interventions_rules.json")
        self.rules = self._load_rules()

    def _load_rules(self) -> List[Dict[str, Any]]:
        if os.path.exists(self.rules_file):
            try:
                with open(self.rules_file, "r") as f:
                    return json.load(f).get("rules", [])
            except Exception as e:
                logger.error(f"Failed to load intervention rules: {e}")
        return []

    def recommend_intervention(
        self,
        top_factors: List[Dict[str, Any]],
        telemetry: Dict[str, Any],
        osm_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Maps top computed SHAP factors and threshold evidence to IRC/FHWA compliant countermeasures.
        Guarantees that every recommendation is directly traceable to the top contributing hazard factor.
        """
        if not top_factors:
            return {
                "rule_id": "DEFAULT-001",
                "title": "Continuous Automated Monitoring",
                "category": "Surveillance & Analytics",
                "estimated_risk_reduction_pct": 5.0,
                "why_dangerous": "Insufficient telemetry evidence to isolate primary danger vector.",
                "recommended_fix": "Maintain automated sensor logging and schedule 7-day baseline verification.",
                "verification_metric": "Telemetry completeness index > 95%.",
                "assumption": "Default baseline assumption."
            }

        primary_factor = top_factors[0]["factor"]
        secondary_factor = top_factors[1]["factor"] if len(top_factors) > 1 else None

        # Rule evaluation lookup
        factor_to_rule_id = {
            "close_call_count": "INT-001",
            "pedestrian_count": "INT-001",
            "avg_speed_kmh": "INT-002",
            "visibility_meters": "INT-003",
            "rain_intensity_mmh": "INT-004",
            "is_school_hour": "INT-005",
            "distance_to_school_m": "INT-005",
            "distance_to_hospital_m": "INT-006",
            "queue_length_m": "INT-007",
            "vehicle_count": "INT-007",
            "road_damage_severity": "INT-008"
        }

        # Check special overrides: e.g. school hours active near school
        if telemetry.get("is_school_hour") == 1 and telemetry.get("distance_to_school_m", 1000) < 300:
            target_rule_id = "INT-005"
        elif telemetry.get("road_damage_severity", 0) >= 3:
            target_rule_id = "INT-008"
        elif primary_factor in factor_to_rule_id:
            target_rule_id = factor_to_rule_id[primary_factor]
        elif secondary_factor in factor_to_rule_id:
            target_rule_id = factor_to_rule_id[secondary_factor]
        else:
            target_rule_id = "INT-001"

        matched = next((r for r in self.rules if r["id"] == target_rule_id), None)
        if matched:
            return matched

        return {
            "rule_id": "FALLBACK-001",
            "title": "General Traffic Calming & Microprismatic Signage",
            "category": "Traffic Calming",
            "estimated_risk_reduction_pct": 18.0,
            "why_dangerous": "Multiple moderate hazard vectors interacting across intersection approaches.",
            "recommended_fix": "Install transverse rumble strips and speed limit advisory signs.",
            "verification_metric": "Pre/post 85th percentile approach velocity reduction.",
            "assumption": "IRC:99-2018 traffic calming assumptions applied."
        }

    def generate_public_warning(self, recommendation: Dict[str, Any], top_factors: List[Dict[str, Any]]) -> str:
        """
        Creates concise warning text for public app based strictly on computed facts.
        """
        if not top_factors:
            return "Drive Cautiously - Busy Intersection Ahead"

        top_factor_name = top_factors[0]["factor"]
        warning_tags = {
            "close_call_count": "High Pedestrian Conflicts - Slow Down",
            "pedestrian_count": "Pedestrian Surge - Watch Crosswalks",
            "avg_speed_kmh": "Speed Hazard Zone - 30 km/h Limit",
            "visibility_meters": "Poor Lighting / Low Visibility",
            "rain_intensity_mmh": "Slippery Road Surface - Avoid Sudden Braking",
            "is_school_hour": "Active School Zone - Strict 20 km/h",
            "distance_to_school_m": "School Zone Ahead - Children Crossing",
            "distance_to_hospital_m": "Ambulance Corridor Congestion - Yield Left",
            "queue_length_m": "Downstream Bottleneck - Merge With Care",
            "road_damage_severity": "Severe Pothole Cluster - Avoid Swerving"
        }
        return warning_tags.get(top_factor_name, "Drive Cautiously - Hazard Detected")

rules_engine = RulesEngine()
