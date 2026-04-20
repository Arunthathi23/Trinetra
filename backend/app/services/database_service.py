import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.models.models import (
    Camera,
    HealthCheck,
    MonitoringStats,
    PredictionData,
    SystemAlert,
    SystemStatus,
    Violation,
    ViolationCreate,
    ViolationUpdate,
    ViolationAlert,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
VIOLATIONS_FILE = DATA_DIR / "violations.json"
CAMERAS_FILE = DATA_DIR / "cameras.json"
ALERTS_FILE = DATA_DIR / "alerts.json"


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except json.JSONDecodeError:
        return default


def _save_json(path: Path, data: Any) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, default=str)


def get_realtime_status() -> SystemStatus:
    return SystemStatus(
        status="operational",
        timestamp=_now_iso(),
        version="0.1.0",
        uptime=round((datetime.utcnow() - datetime.utcnow() + timedelta(days=1)).total_seconds(), 2),
        system_info={
            "service": "TRINETRA Backend",
            "region": "local",
            "environment": "development",
        },
        services={
            "database": "connected",
            "ai_engine": "idle",
            "video_streaming": "available",
            "alerts": "active",
        },
    )


def get_health_check() -> HealthCheck:
    return HealthCheck(
        status="healthy",
        timestamp=_now_iso(),
        response_time_ms=14.2,
        services={
            "database": "healthy",
            "websocket": "healthy",
            "ai_service": "healthy",
        },
    )


def _build_violation(data: Dict[str, Any]) -> Violation:
    return Violation(**data)


def _read_violations() -> List[Dict[str, Any]]:
    return _load_json(VIOLATIONS_FILE, [])


def _write_violations(violations: List[Dict[str, Any]]) -> None:
    _save_json(VIOLATIONS_FILE, violations)


def list_violations(page: int = 1, page_size: int = 20, status: Optional[str] = None) -> Tuple[List[Violation], int]:
    raw = _read_violations()
    if status:
        raw = [item for item in raw if item.get("status") == status]
    total = len(raw)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = [_build_violation(item) for item in raw[start:end]]
    return page_items, total


def create_violation(payload: ViolationCreate) -> Violation:
    record = payload.model_dump()
    record.update(
        {
            "id": str(uuid.uuid4()),
            "timestamp": _now_iso(),
            "status": "pending",
            "processed_at": None,
        }
    )
    violations = _read_violations()
    violations.insert(0, record)
    _write_violations(violations)
    return _build_violation(record)


def get_violation_by_id(violation_id: str) -> Optional[Violation]:
    records = _read_violations()
    for entry in records:
        if entry.get("id") == violation_id:
            return _build_violation(entry)
    return None


def update_violation(violation_id: str, payload: ViolationUpdate) -> Optional[Violation]:
    records = _read_violations()
    for index, entry in enumerate(records):
        if entry.get("id") == violation_id:
            changes = payload.model_dump(exclude_none=True)
            if changes:
                entry.update(changes)
                entry["processed_at"] = _now_iso()
                records[index] = entry
                _write_violations(records)
            return _build_violation(entry)
    return None


def delete_violation(violation_id: str) -> bool:
    records = _read_violations()
    filtered = [entry for entry in records if entry.get("id") != violation_id]
    if len(filtered) == len(records):
        return False
    _write_violations(filtered)
    return True


def _read_cameras() -> List[Dict[str, Any]]:
    default_cameras = [
        {
            "id": "CAM-101",
            "location": "Downtown Intersection",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "status": "active",
            "last_seen": _now_iso(),
            "resolution": "1920x1080",
            "fps": 25,
            "violations_detected": 58,
        },
        {
            "id": "CAM-102",
            "location": "Highway 7 Northbound",
            "latitude": 12.9853,
            "longitude": 77.5671,
            "status": "maintenance",
            "last_seen": _now_iso(),
            "resolution": "1280x720",
            "fps": 15,
            "violations_detected": 23,
        },
    ]
    return _load_json(CAMERAS_FILE, default_cameras)


def list_cameras() -> List[Camera]:
    raw = _read_cameras()
    return [Camera(**camera) for camera in raw]


def get_monitoring_stats() -> MonitoringStats:
    cameras = list_cameras()
    return MonitoringStats(
        active_cameras=sum(1 for camera in cameras if camera.status == "active"),
        total_violations_today=42,
        system_uptime=98765.12,
        alerts_count=5,
        timestamp=datetime.utcnow(),
    )


def get_realtime_violation_alert() -> ViolationAlert:
    return ViolationAlert(
        id=str(uuid.uuid4()),
        timestamp=_now_iso(),
        location="Downtown Intersection",
        violation_type="speeding",
        vehicle_id="KA01AB1234",
        confidence=0.92,
        severity="high",
        location_lat=12.9716,
        location_lng=77.5946,
    )


def get_system_alerts() -> List[SystemAlert]:
    default_alerts = [
        {
            "id": str(uuid.uuid4()),
            "type": "system",
            "severity": "low",
            "message": "Backend CPU utilization normal.",
            "timestamp": _now_iso(),
            "camera_id": None,
            "resolved": False,
            "resolved_at": None,
            "resolved_by": None,
        }
    ]
    return [SystemAlert(**alert) for alert in _load_json(ALERTS_FILE, default_alerts)]
