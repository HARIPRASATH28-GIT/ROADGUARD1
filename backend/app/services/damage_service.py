import os
import json
import logging
from typing import Dict, Any, List
from backend.app.config import settings
from backend.app.database import db

logger = logging.getLogger(__name__)

class DamageService:
    def get_priority_damages(self) -> List[Dict[str, Any]]:
        return db.get_all_damages()

    def update_work_order(self, damage_id: str, new_status: str, contractor: str = None, rescan_verified: bool = None) -> Dict[str, Any]:
        damages = db.get_all_damages()
        target = next((d for d in damages if d["id"] == damage_id), None)
        if not target:
            raise ValueError(f"Damage record {damage_id} not found.")

        target["work_order_status"] = new_status
        if contractor:
            target["assigned_contractor"] = contractor
        if rescan_verified is not None:
            target["rescan_verified"] = rescan_verified
            if rescan_verified:
                target["rescan_metric"] = "Post-repair laser profiler verified: Zero depression detected."

        db.update_damage(damage_id, target)
        db.log_audit("Road Maintenance Officer", "maintenance", "UPDATE_WORK_ORDER", damage_id, f"Status updated to {new_status}")
        return target

    def trigger_rescan_verification(self, damage_id: str) -> Dict[str, Any]:
        """
        Simulates automated re-scan to verify pavement repair (Phase 5 requirement).
        """
        damages = db.get_all_damages()
        target = next((d for d in damages if d["id"] == damage_id), None)
        if not target:
            raise ValueError(f"Damage record {damage_id} not found.")

        # Simulate camera / sensor re-scan
        target["rescan_verified"] = True
        target["work_order_status"] = "VERIFIED"
        target["rescan_metric"] = "Automated LiDAR/Vision Re-scan Passed: Pavement surface restored to IRC:SP:98 standard."
        
        db.update_damage(damage_id, target)
        db.log_audit("Automated Vision Re-scan", "system", "RESCAN_VERIFIED", damage_id, "Pavement surface verified smooth")
        return target

damage_service = DamageService()
