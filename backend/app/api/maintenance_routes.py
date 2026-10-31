from fastapi import APIRouter, HTTPException, Depends
from backend.app.schemas import WorkOrderUpdateRequest
from backend.app.services.damage_service import damage_service
from backend.app.auth import require_role

router = APIRouter(prefix="/maintenance", tags=["Road Maintenance Console"])

@router.get("/damages")
async def list_damages(
    current_user: dict = Depends(require_role(["road_maintenance", "maintenance", "admin"]))
):
    """
    Returns the prioritized road damage queue (RDD2022 categories: D00, D10, D20, D40)
    with severity, responsible body, and work order status.
    """
    return damage_service.get_priority_damages()

@router.put("/damages/{damage_id}")
async def update_damage_work_order(
    damage_id: str,
    payload: WorkOrderUpdateRequest,
    current_user: dict = Depends(require_role(["road_maintenance", "maintenance", "admin"]))
):
    try:
        updated = damage_service.update_work_order(
            damage_id=damage_id,
            new_status=payload.work_order_status,
            contractor=payload.assigned_contractor,
            rescan_verified=payload.rescan_verified
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/damages/{damage_id}/rescan")
async def trigger_rescan_verification(
    damage_id: str,
    current_user: dict = Depends(require_role(["road_maintenance", "maintenance", "admin"]))
):
    """
    Simulates automated re-scan to verify pavement repair (Phase 5).
    """
    try:
        verified = damage_service.trigger_rescan_verification(damage_id)
        return {
            "damage_id": damage_id,
            "status": "VERIFIED",
            "rescan_metric": verified["rescan_metric"],
            "verified_by": "Automated Laser/Vision Profiler"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
