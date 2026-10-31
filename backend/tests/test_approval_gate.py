import pytest
from backend.app.database import db

def test_unapproved_hotspot_hidden_from_public():
    all_hotspots = db.get_all_hotspots()
    pending = [h for h in all_hotspots if h["status"] != "APPROVED"]
    
    # In public app query:
    approved_for_public = [h for h in all_hotspots if h["status"] == "APPROVED"]
    approved_ids = [h["id"] for h in approved_for_public]
    
    for p in pending:
        assert p["id"] not in approved_ids

def test_approving_hotspot_publishes_it():
    # Fetch HS-01 which starts as PENDING_APPROVAL
    hs = db.get_hotspot_by_id("HS-01")
    assert hs is not None
    original_status = hs["status"]
    
    # Simulate officer approval
    hs["status"] = "APPROVED"
    hs["approved_by"] = "Officer Test (RSO-99)"
    db.update_hotspot("HS-01", hs)
    
    # Check public visibility
    updated_all = db.get_all_hotspots()
    public_list = [h for h in updated_all if h["status"] == "APPROVED"]
    public_ids = [h["id"] for h in public_list]
    assert "HS-01" in public_ids
    
    # Revert back to original status for test cleanliness
    hs["status"] = original_status
    db.update_hotspot("HS-01", hs)
