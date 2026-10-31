from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from backend.app.database import db
from backend.app.schemas import ApprovalRequest
from backend.app.auth import require_role
from backend.app.services.rules_engine import rules_engine

router = APIRouter(prefix="/risk", tags=["Risk Engine & Officer Console"])

@router.get("/hotspots")
async def list_hotspots(
    status_filter: Optional[str] = Query(None, description="Filter by APPROVED, PENDING_APPROVAL, REJECTED"),
    min_risk: Optional[float] = Query(None),
    current_user: dict = Depends(require_role(["road_safety_officer", "officer", "admin"]))
):
    hotspots = db.get_all_hotspots()
    if status_filter:
        hotspots = [h for h in hotspots if h["status"] == status_filter]
    if min_risk is not None:
        hotspots = [h for h in hotspots if h["current_risk_score"] >= min_risk]
    return hotspots

@router.get("/hotspots/{hotspot_id}")
async def get_hotspot_details(
    hotspot_id: str,
    current_user: dict = Depends(require_role(["road_safety_officer", "officer", "admin"]))
):
    hotspot = db.get_hotspot_by_id(hotspot_id)
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    return hotspot

@router.post("/hotspots/{hotspot_id}/approval")
async def update_hotspot_approval(
    hotspot_id: str,
    payload: ApprovalRequest,
    current_user: dict = Depends(require_role(["road_safety_officer", "officer", "admin"]))
):
    """
    HUMAN APPROVAL GATE (Strict Non-Negotiable Guardrail):
    Only authenticated Road Safety Officers can approve a hotspot.
    Unapproved or rejected hotspots are strictly blocked from the public app.
    """
    hotspot = db.get_hotspot_by_id(hotspot_id)
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    if payload.status == "APPROVED":
        hotspot["status"] = "APPROVED"
        hotspot["approved_by"] = f"{current_user['full_name']} ({current_user.get('badge_id', 'RSO')})"
        hotspot["approved_at"] = now_iso
        hotspot["rejection_reason"] = None
        db.log_audit(
            current_user.get("email") or current_user.get("username", "road_safety_officer"),
            current_user["role"],
            "APPROVE_HOTSPOT",
            hotspot_id,
            f"Hotspot '{hotspot['name']}' published to public alert system."
        )
    elif payload.status == "REJECTED":
        hotspot["status"] = "REJECTED"
        hotspot["approved_by"] = None
        hotspot["approved_at"] = None
        hotspot["rejection_reason"] = payload.rejection_reason or "Insufficient hazard threshold per safety review."
        db.log_audit(
            current_user.get("email") or current_user.get("username", "road_safety_officer"),
            current_user["role"],
            "REJECT_HOTSPOT",
            hotspot_id,
            f"Hotspot rejected: {hotspot['rejection_reason']}"
        )

    db.update_hotspot(hotspot_id, hotspot)
    return {
        "hotspot_id": hotspot_id,
        "new_status": hotspot["status"],
        "approved_by": hotspot["approved_by"],
        "approved_at": hotspot["approved_at"],
        "rejection_reason": hotspot["rejection_reason"],
        "published_to_public": hotspot["status"] == "APPROVED"
    }

@router.get("/rules")
async def get_intervention_rules():
    """
    Returns the IRC/FHWA intervention rules table with estimated risk reductions and assumptions.
    """
    return {
        "rules": rules_engine.rules,
        "standard_reference": "Indian Roads Congress (IRC:99, IRC:SP:98) and FHWA Safety Countermeasures",
        "provenance": "ESTABLISHED_EMPIRICAL_ASSUMPTIONS"
    }
