from __future__ import annotations

from enum import Enum
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


class ViolationSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ViolationType(str, Enum):
    SPEEDING = "speeding"
    RED_LIGHT = "red_light"
    STOP_SIGN = "stop_sign"
    LANE_VIOLATION = "lane_violation"
    PARKING = "parking"
    NO_HELMET = "no_helmet"
    NO_SEATBELT = "no_seatbelt"
    OTHER = "other"


class ViolationStatus(str, Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    APPROVED = "approved"
    REJECTED = "rejected"
    CLOSED = "closed"


class ViolationBase(BaseModel):
    vehicle_id: str = Field(..., min_length=1, max_length=20)
    violation_type: ViolationType
    severity: ViolationSeverity
    location: str = Field(..., min_length=1, max_length=200)
    location_lat: Optional[float] = Field(None, ge=-90, le=90)
    location_lng: Optional[float] = Field(None, ge=-180, le=180)
    confidence: float = Field(..., ge=0.0, le=1.0)
    description: Optional[str] = Field(None, max_length=500)
    image_url: Optional[str] = None

    @validator("vehicle_id")
    def normalize_vehicle_id(cls, value: str) -> str:
        return value.strip().upper()


class ViolationCreate(ViolationBase):
    pass


class Violation(ViolationBase):
    id: str
    timestamp: str
    status: ViolationStatus = ViolationStatus.PENDING
    processed_at: Optional[str] = None
    officer_id: Optional[str] = None
    fine_amount: Optional[float] = None


class ViolationUpdate(BaseModel):
    status: Optional[ViolationStatus] = None
    officer_id: Optional[str] = None
    fine_amount: Optional[float] = None
    description: Optional[str] = None


class CameraStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"


class Camera(BaseModel):
    id: str
    location: str
    latitude: float
    longitude: float
    status: CameraStatus
    last_seen: str
    resolution: str
    fps: int
    violations_detected: int


class AlertType(str, Enum):
    VIOLATION = "violation"
    SYSTEM = "system"
    MAINTENANCE = "maintenance"
    SECURITY = "security"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SystemAlert(BaseModel):
    id: str
    type: AlertType
    severity: AlertSeverity
    message: str
    timestamp: str
    camera_id: Optional[str] = None
    resolved: bool = False
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None


class ViolationAlert(BaseModel):
    id: str
    timestamp: str
    location: str
    violation_type: str
    vehicle_id: str
    confidence: float
    severity: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None


class PredictionData(BaseModel):
    location: str
    predicted_violations: int
    confidence: float
    time_window: str
    risk_level: str


class HotspotAnalysis(BaseModel):
    location: str
    latitude: float
    longitude: float
    violation_count: int
    risk_score: float
    primary_violation_types: List[str]
    peak_hours: List[str]
    trend: str


class SystemStatus(BaseModel):
    status: str
    timestamp: str
    version: str
    uptime: float
    system_info: Dict[str, Any]
    services: Dict[str, str]


class HealthCheck(BaseModel):
    status: str
    timestamp: str
    response_time_ms: float
    services: Dict[str, str]


class MonitoringStats(BaseModel):
    active_cameras: int
    total_violations_today: int
    system_uptime: float
    alerts_count: int
    timestamp: datetime


class RepeatOffender(BaseModel):
    vehicle_number: str
    offenses: int


class InsightsSummary(BaseModel):
    total_violations: int
    most_common_violation: str
    peak_violation_time: str
    repeat_offenders: List[RepeatOffender]


class APIResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None
    errors: Optional[List[str]] = None


class PaginatedResponse(APIResponse):
    total: int
    page: int
    page_size: int
    total_pages: int


class WebSocketMessage(BaseModel):
    type: str
    data: Dict[str, Any]
    timestamp: str
