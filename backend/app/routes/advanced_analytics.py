"""
Advanced Analytics Routes

API endpoints for repeat offender tracking, severity scoring,
location risk analysis, and fine management.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.services.repeat_offender_service import RepeatOffenderService
from app.services.severity_scoring import SeverityScorer
from app.services.location_risk_service import LocationRiskService
from app.services.fine_generation_service import FineGenerator

router = APIRouter()


# ============================================================================
# REPEAT OFFENDER ENDPOINTS
# ============================================================================


@router.get("/repeat-offenders/summary/{vehicle_number}", tags=["Repeat Offenders"])
def get_offender_summary(
    vehicle_number: str,
    db: Session = Depends(get_db),
):
    """Get comprehensive summary of repeat offender."""
    return RepeatOffenderService.get_offender_summary(db, vehicle_number)


@router.get("/repeat-offenders/flagged", tags=["Repeat Offenders"])
def get_flagged_offenders(db: Session = Depends(get_db)):
    """Get all flagged repeat offenders."""
    return RepeatOffenderService.get_all_flagged_offenders(db)


@router.get("/repeat-offenders/top", tags=["Repeat Offenders"])
def get_top_offenders(
    limit: int = Query(10, ge=1, le=50),
    days: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db),
):
    """Get top repeat offenders by recent violations."""
    return RepeatOffenderService.get_top_offenders(db, limit=limit, days=days)


@router.post("/repeat-offenders/flag/{vehicle_number}", tags=["Repeat Offenders"])
def flag_offender(
    vehicle_number: str,
    reason: str = Query("Critical repeat offender"),
    db: Session = Depends(get_db),
):
    """Manually flag a vehicle as repeat offender."""
    offender = RepeatOffenderService.flag_offender(db, vehicle_number, reason)
    return RepeatOffenderService.get_offender_summary(db, vehicle_number)


@router.post("/repeat-offenders/unflag/{vehicle_number}", tags=["Repeat Offenders"])
def unflag_offender(
    vehicle_number: str,
    db: Session = Depends(get_db),
):
    """Remove repeat offender flag."""
    offender = RepeatOffenderService.unflag_offender(db, vehicle_number)
    return RepeatOffenderService.get_offender_summary(db, vehicle_number)


# ============================================================================
# SEVERITY SCORING ENDPOINTS
# ============================================================================


@router.post("/severity/initialize", tags=["Severity Scoring"])
def initialize_severity_scores(db: Session = Depends(get_db)):
    """Initialize severity score reference table."""
    SeverityScorer.initialize_severity_scores(db)
    return {
        "status": "success",
        "message": "Severity scores initialized",
    }


@router.get("/severity/score-details/{score}", tags=["Severity Scoring"])
def get_score_details(
    score: int,
):
    """Get details about a severity score."""
    if score < 0 or score > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Score must be between 0 and 100",
        )
    return SeverityScorer.get_score_details(score)


@router.get("/severity/violation-scores", tags=["Severity Scoring"])
def get_violation_base_scores():
    """Get base severity scores for all violation types."""
    return {
        "violation_type": SeverityScorer.BASE_SCORES,
        "time_multipliers": SeverityScorer.TIME_MULTIPLIERS,
        "vehicle_factors": SeverityScorer.VEHICLE_RISK_FACTORS,
    }


# ============================================================================
# LOCATION RISK ENDPOINTS
# ============================================================================


@router.get("/location-risk/summary/{location}", tags=["Location Risk"])
def get_location_risk(
    location: str,
    db: Session = Depends(get_db),
):
    """Get location risk summary."""
    return LocationRiskService.get_location_summary(db, location)


@router.get("/location-risk/high-risk-areas", tags=["Location Risk"])
def get_high_risk_areas(
    risk_level: str = Query("high", pattern="^(low|medium|high|critical)$"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get locations with high violation risk."""
    return LocationRiskService.get_high_risk_locations(db, risk_level, limit)


@router.get("/location-risk/trend/{location}", tags=["Location Risk"])
def get_location_trend(
    location: str,
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
):
    """Get violation trend for a location."""
    return LocationRiskService.get_location_trend(db, location, days)


@router.get("/location-risk/enforcement-recommendations", tags=["Location Risk"])
def get_enforcement_recommendations(db: Session = Depends(get_db)):
    """Get enforcement resource allocation recommendations."""
    return LocationRiskService.recommend_enforcement(db)


# ============================================================================
# FINE GENERATION ENDPOINTS
# ============================================================================


@router.post("/fines/generate/{violation_id}", tags=["Fines"])
def generate_fine(
    violation_id: str,
    db: Session = Depends(get_db),
):
    """Generate a fine for a violation."""
    fine = FineGenerator.generate_fine(db, violation_id)

    if not fine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Violation not found",
        )

    return FineGenerator.get_fine_summary(db, fine.id)


@router.get("/fines/{fine_id}", tags=["Fines"])
def get_fine(
    fine_id: str,
    db: Session = Depends(get_db),
):
    """Get fine details."""
    fine_summary = FineGenerator.get_fine_summary(db, fine_id)

    if not fine_summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fine not found",
        )

    return fine_summary


@router.get("/fines/vehicle/{vehicle_number}", tags=["Fines"])
def get_vehicle_fines(
    vehicle_number: str,
    db: Session = Depends(get_db),
):
    """Get all fines for a vehicle."""
    return FineGenerator.get_total_fines_for_vehicle(db, vehicle_number)


@router.get("/fines/pending", tags=["Fines"])
def get_pending_fines(
    vehicle_number: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Get all pending fines."""
    return FineGenerator.get_pending_fines(db, vehicle_number, limit)


@router.get("/fines/overdue", tags=["Fines"])
def get_overdue_fines(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Get all overdue fines."""
    return FineGenerator.get_overdue_fines(db, limit)


@router.post("/fines/{fine_id}/mark-paid", tags=["Fines"])
def mark_fine_paid(
    fine_id: str,
    db: Session = Depends(get_db),
):
    """Mark a fine as paid."""
    fine = FineGenerator.mark_as_paid(db, fine_id)

    if not fine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fine not found",
        )

    return FineGenerator.get_fine_summary(db, fine_id)


@router.post("/fines/{fine_id}/waive", tags=["Fines"])
def waive_fine(
    fine_id: str,
    reason: str = Query("Administrative decision"),
    db: Session = Depends(get_db),
):
    """Waive a fine."""
    fine = FineGenerator.waive_fine(db, fine_id, reason)

    if not fine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fine not found",
        )

    return FineGenerator.get_fine_summary(db, fine_id)


@router.get("/fines/statistics", tags=["Fines"])
def get_fine_statistics(db: Session = Depends(get_db)):
    """Get system-wide fine statistics."""
    return FineGenerator.get_fine_statistics(db)


# ============================================================================
# INTEGRATED ANALYTICS ENDPOINTS
# ============================================================================


@router.get(
    "/analytics/vehicle/{vehicle_number}",
    tags=["Analytics"],
)
def get_vehicle_analytics(
    vehicle_number: str,
    db: Session = Depends(get_db),
):
    """Get comprehensive analytics for a vehicle."""
    offender_summary = RepeatOffenderService.get_offender_summary(db, vehicle_number)
    fines_summary = FineGenerator.get_total_fines_for_vehicle(db, vehicle_number)

    return {
        "vehicle_number": vehicle_number,
        "offender_profile": offender_summary,
        "fines_summary": fines_summary,
        "multiplier": RepeatOffenderService.get_repeat_offender_multiplier(
            db, vehicle_number
        ),
    }


@router.get(
    "/analytics/location/{location}",
    tags=["Analytics"],
)
def get_location_analytics(
    location: str,
    db: Session = Depends(get_db),
):
    """Get comprehensive analytics for a location."""
    location_summary = LocationRiskService.get_location_summary(db, location)
    location_trend = LocationRiskService.get_location_trend(db, location)

    return {
        "location": location,
        "risk_profile": location_summary,
        "trend_analysis": location_trend,
    }


@router.get(
    "/analytics/dashboard",
    tags=["Analytics"],
)
def get_dashboard_analytics(db: Session = Depends(get_db)):
    """Get dashboard analytics with key metrics."""
    fine_stats = FineGenerator.get_fine_statistics(db)
    high_risk_areas = LocationRiskService.get_high_risk_locations(db, "high", 5)
    top_offenders = RepeatOffenderService.get_top_offenders(db, 5, 30)
    recommendations = LocationRiskService.recommend_enforcement(db)

    return {
        "fine_statistics": fine_stats,
        "high_risk_areas": high_risk_areas,
        "top_offenders": top_offenders,
        "enforcement_recommendations": recommendations,
    }
