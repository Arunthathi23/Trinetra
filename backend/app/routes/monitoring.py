from fastapi import APIRouter

from app.models.models import APIResponse, Camera, MonitoringStats
from app.services.database_service import get_monitoring_stats, list_cameras

router = APIRouter()


@router.get("/cameras", response_model=APIResponse)
def get_cameras():
    """Retrieve the list of active monitoring cameras."""
    cameras = list_cameras()
    return APIResponse(success=True, message="Active cameras retrieved.", data=cameras)


@router.get("/stats", response_model=APIResponse)
def get_stats():
    """Get real-time monitoring statistics."""
    stats = get_monitoring_stats()
    return APIResponse(success=True, message="Monitoring stats retrieved.", data=stats)
