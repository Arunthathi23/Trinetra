from random import randint
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.violation import ViolationCreateSchema, ViolationSchema
from app.models.database import Violation, get_db
from app.services.analytics_integration import AnalyticsIntegrationService

router = APIRouter()


@router.get("", response_model=List[ViolationSchema], tags=["Violations"])
def get_violations(db: Session = Depends(get_db)):
    """Fetch all violations from the database."""
    db_violations = db.query(Violation).all()
    return [
        ViolationSchema(
            id=db_violation.id,
            vehicle_number=db_violation.vehicle_number,
            vehicle_type=db_violation.vehicle_type,
            violation_type=db_violation.violation_type,
            severity=db_violation.severity,
            confidence=db_violation.confidence,
            location=db_violation.location,
            timestamp=db_violation.timestamp,
            status=db_violation.status,
        )
        for db_violation in db_violations
    ]


@router.post("", response_model=ViolationSchema, status_code=201, tags=["Violations"])
def create_violation(payload: ViolationCreateSchema, db: Session = Depends(get_db)):
    """Add a new violation record to the database."""
    violation_id = str(uuid4())
    db_violation = Violation(
        id=violation_id,
        vehicle_number=payload.vehicle_number,
        vehicle_type=payload.vehicle_type,
        violation_type=payload.violation_type,
        severity=payload.severity,
        confidence=payload.confidence,
        location=payload.location,
        timestamp=payload.timestamp,
        status=payload.status,
    )
    db.add(db_violation)
    db.commit()
    db.refresh(db_violation)

    # Process through analytics pipeline
    try:
        analytics_results = AnalyticsIntegrationService.process_violation_for_analytics(
            db, db_violation
        )
        # Attach analytics results to response (optional, depends on frontend needs)
        # We'll return the violation normally, but analytics are processed in background
    except Exception as e:
        # Log error but don't fail the violation creation
        print(f"Analytics processing error: {e}")

    return ViolationSchema(
        id=db_violation.id,
        vehicle_number=db_violation.vehicle_number,
        vehicle_type=db_violation.vehicle_type,
        violation_type=db_violation.violation_type,
        severity=db_violation.severity,
        confidence=db_violation.confidence,
        location=db_violation.location,
        timestamp=db_violation.timestamp,
        status=db_violation.status,
    )

