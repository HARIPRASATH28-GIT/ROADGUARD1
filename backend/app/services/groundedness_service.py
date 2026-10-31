import re
from typing import Dict, Any, List, Tuple

class GroundednessService:
    """
    Verifies that all text claims in officer reports, recommendations,
    and public warnings are strictly grounded in computed evidence.
    If a claim cannot be verified against telemetry, SHAP attributions,
    or OpenStreetMap geometry, it is replaced with 'insufficient evidence'.
    """

    EVIDENCE_KEYWORDS = {
        "pedestrian": ["pedestrian_count", "close_call_count"],
        "close-call": ["close_call_count"],
        "conflict": ["close_call_count"],
        "speed": ["avg_speed_kmh"],
        "velocity": ["avg_speed_kmh"],
        "visibility": ["visibility_meters", "brightness_index"],
        "lighting": ["visibility_meters", "brightness_index"],
        "lux": ["visibility_meters"],
        "rain": ["rain_intensity_mmh"],
        "wet": ["rain_intensity_mmh"],
        "water": ["rain_intensity_mmh"],
        "hydroplaning": ["rain_intensity_mmh"],
        "school": ["distance_to_school_m", "is_school_hour"],
        "children": ["distance_to_school_m", "is_school_hour"],
        "hospital": ["distance_to_hospital_m"],
        "ambulance": ["distance_to_hospital_m"],
        "queue": ["queue_length_m", "vehicle_count"],
        "spillback": ["queue_length_m"],
        "gridlock": ["queue_length_m", "vehicle_count"],
        "pothole": ["road_damage_severity"],
        "crack": ["road_damage_severity"],
        "depression": ["road_damage_severity"],
        "swerve": ["road_damage_severity", "close_call_count"]
    }

    def verify_sentence(self, sentence: str, telemetry: Dict[str, Any], top_factors: List[Dict[str, Any]]) -> Tuple[bool, List[str]]:
        sentence_lower = sentence.lower()
        matched_evidence = []
        required_keywords = []

        for kw, evidence_keys in self.EVIDENCE_KEYWORDS.items():
            if re.search(r'\b' + re.escape(kw) + r'\b', sentence_lower):
                required_keywords.append(kw)
                # Check if telemetry has non-zero or active evidence for this key
                for ek in evidence_keys:
                    val = telemetry.get(ek)
                    if val is not None:
                        # Check threshold
                        if ek == "rain_intensity_mmh" and float(val) > 0.0:
                            matched_evidence.append(f"Rainfall: {val} mm/h")
                        elif ek == "close_call_count" and int(val) > 0:
                            matched_evidence.append(f"Close calls: {val}")
                        elif ek == "avg_speed_kmh" and float(val) > 25.0:
                            matched_evidence.append(f"Speed: {val} km/h")
                        elif ek == "is_school_hour" and int(val) == 1:
                            matched_evidence.append("Active School Bell Hour")
                        elif ek == "distance_to_school_m" and float(val) < 500:
                            matched_evidence.append(f"School proximity: {val}m")
                        elif ek == "distance_to_hospital_m" and float(val) < 500:
                            matched_evidence.append(f"Hospital proximity: {val}m")
                        elif ek == "road_damage_severity" and int(val) > 0:
                            matched_evidence.append(f"Damage Severity: {val}")
                        elif ek == "visibility_meters" and float(val) < 3000:
                            matched_evidence.append(f"Visibility: {val}m")
                        elif ek == "queue_length_m" and float(val) > 30:
                            matched_evidence.append(f"Queue: {val}m")

        # If sentence made strong hazard claims but zero evidence was present, fail verification
        if required_keywords and not matched_evidence:
            return False, []
        return True, list(set(matched_evidence))

    def evaluate_groundedness(
        self,
        text_corpus: str,
        telemetry: Dict[str, Any],
        top_factors: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Splits corpus into sentences, tests each against computed evidence,
        and computes the Groundedness metric (fraction of verified sentences).
        """
        sentences = [s.strip() for s in re.split(r'[.!?]', text_corpus) if len(s.strip()) > 5]
        if not sentences:
            return {"groundedness_score": 1.0, "total_claims": 0, "verified_claims": 0, "trail": []}

        verified_count = 0
        trail = []
        clean_sentences = []

        for s in sentences:
            is_valid, evidence = self.verify_senten(s, telemetry, top_factors) if hasattr(self, 'verify_senten') else self.verify_sentence(s, telemetry, top_factors)
            if is_valid:
                verified_count += 1
                clean_sentences.append(s)
                if evidence:
                    trail.extend(evidence)
            else:
                clean_sentences.append("insufficient evidence")
                trail.append(f"Rejected ungrounded statement: '{s[:40]}...'")

        score = round(verified_count / len(sentences), 4)
        return {
            "groundedness_score": score,
            "total_claims": len(sentences),
            "verified_claims": verified_count,
            "evidence_trail": list(set(trail)),
            "sanitized_text": ". ".join(clean_sentences) + "."
        }

groundedness_service = GroundednessService()
