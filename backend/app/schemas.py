from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# Auth schemas
class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str
    remember_me: bool = False

    def get_identifier(self) -> str:
        return (self.email or self.username or "").strip()

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str
    full_name: str
    redirect_url: str

class UserProfile(BaseModel):
    id: str
    email: str
    role: str
    full_name: str
    department: Optional[str] = None

class AuthConfigResponse(BaseModel):
    demo_mode: bool
    version: str
    demo_accounts: List[Dict[str, str]]

# Simulation & What-If schemas
class SimulationRequest(BaseModel):
    hotspot_id: str
    rain_intensity_mmh: float = Field(0.0, ge=0.0, le=75.0)
    visibility_meters: float = Field(5000.0, ge=100.0, le=10000.0)
    hour_of_day: int = Field(12, ge=0, le=23)
    is_school_hour: int = Field(0, ge=0, le=1)
    road_closure_active: int = Field(0, ge=0, le=1)
    construction_active: int = Field(0, ge=0, le=1)
    vehicle_count: Optional[int] = None
    avg_speed_kmh: Optional[float] = None
    pedestrian_count: Optional[int] = None
    close_call_count: Optional[int] = None

class SimulationResponse(BaseModel):
    hotspot_id: str
    recomputed_risk_score: float
    recomputed_risk_class: str
    recomputed_congestion: str
    latency_ms: float
    top_shap_factors: List[Dict[str, Any]]
    recommendation: Dict[str, Any]
    public_warning_text: str
    groundedness_verified: bool
    evidence_trail: List[str]
    provenance: str = "DEMO / SYNTHETIC ENGINE"

# Hotspot approval schema
class ApprovalRequest(BaseModel):
    status: str = Field(..., pattern="^(APPROVED|REJECTED)$")
    rejection_reason: Optional[str] = None

class WorkOrderUpdateRequest(BaseModel):
    work_order_status: str = Field(..., pattern="^(REPORTED|IN_PROGRESS|REPAIRED|VERIFIED)$")
    assigned_contractor: Optional[str] = None
    rescan_verified: Optional[bool] = None

# Signal Optimization schema for Traffic Police
class SignalOptimizationRequest(BaseModel):
    junction_id: str
    action_type: str = Field(..., pattern="^(ADJUST_CYCLE|DEPLOY_STAFF|DYNAMIC_VSL|EMERGENCY_CLEARANCE)$")
    parameters: Dict[str, Any]

# Vision processing response
class VisionAggregateResponse(BaseModel):
    video_ref: str
    frames_processed: int
    fps: float
    vehicle_count: int
    avg_speed_kmh: float
    queue_length_m: float
    pedestrian_count: int
    close_call_count: int
    brightness_index: float
    contrast_index: float
    privacy_notice: str = "All license plates & facial regions blurred. All tracker IDs discarded post-aggregation."
    risk_score_derived: float
    latency_ms: float
