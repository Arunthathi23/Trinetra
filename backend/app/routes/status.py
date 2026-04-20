from fastapi import APIRouter

from app.models.models import APIResponse, HealthCheck, SystemStatus
from app.services.database_service import get_health_check, get_realtime_status

router = APIRouter(tags=["Status"])


@router.get("/status", response_model=APIResponse)
def get_status():
    """Get current TRINETRA system status."""
    status = get_realtime_status()
    return APIResponse(success=True, message="Current system status.", data=status)


@router.get("/health", response_model=APIResponse)
def health_check():
    """Get health status of all backend services."""
    health = get_health_check()
    return APIResponse(success=True, message="Health check completed.", data=health)
