"""
Analytics Integration Service

Integrates advanced analytics services with the violation processing pipeline.
Automatically triggers severity scoring, repeat offender detection, location risk
updates, and fine generation when violations are recorded.
"""

from datetime import datetime
from sqlalchemy.orm import Session

from app.models.database import Violation
from app.services.repeat_offender_service import RepeatOffenderService
from app.services.severity_scoring import SeverityScorer
from app.services.location_risk_service import LocationRiskService
from app.services.fine_generation_service import FineGenerator


class AnalyticsIntegrationService:
    """Service to integrate analytics with violation processing pipeline."""

    @staticmethod
    def process_violation_for_analytics(
        db: Session,
        violation: Violation,
    ) -> dict:
        """
        Process a violation through the complete analytics pipeline.

        Steps:
        1. Calculate severity score
        2. Record repeat offender data
        3. Update location risk
        4. Generate fine

        Args:
            db: Database session
            violation: Violation model instance

        Returns:
            Dictionary with analytics results
        """
        results = {
            "violation_id": violation.id,
            "timestamp": datetime.utcnow().isoformat(),
            "analytics": {},
        }

        try:
            # Step 1: Calculate Severity Score
            severity_details = AnalyticsIntegrationService._calculate_severity(
                db, violation
            )
            results["analytics"]["severity"] = severity_details

            # Step 2: Record Repeat Offender Data
            repeat_offender_data = AnalyticsIntegrationService._record_repeat_offender(
                db, violation
            )
            results["analytics"]["repeat_offender"] = repeat_offender_data

            # Step 3: Update Location Risk
            location_risk_data = AnalyticsIntegrationService._update_location_risk(
                db, violation
            )
            results["analytics"]["location_risk"] = location_risk_data

            # Step 4: Generate Fine
            fine_data = AnalyticsIntegrationService._generate_fine(db, violation)
            results["analytics"]["fine"] = fine_data

            results["status"] = "success"

        except Exception as e:
            results["status"] = "error"
            results["error"] = str(e)

        return results

    @staticmethod
    def _calculate_severity(db: Session, violation: Violation) -> dict:
        """Calculate and update violation severity score."""
        # Get repeat offender multiplier
        repeat_multiplier = RepeatOffenderService.get_repeat_offender_multiplier(
            db, violation.vehicle_number
        )

        # Get location risk multiplier
        location_data = LocationRiskService.get_or_create_location(
            db, violation.location
        )
        location_multiplier = SeverityScorer.get_location_multiplier(
            location_data.risk_score if location_data.risk_score else 0
        )

        # Calculate severity score
        severity_score = SeverityScorer.calculate_score(
            db=db,
            violation_type=violation.violation_type,
            time_of_day=violation.timestamp.hour,
            location_risk_score=location_data.risk_score if location_data.risk_score else 0,
            vehicle_type=violation.vehicle_type,
            detection_confidence=violation.confidence,
            is_repeat_offender=violation.vehicle_number
            in [
                v.vehicle_number
                for v in RepeatOffenderService.get_all_flagged_offenders(db)
            ],
        )

        # Update violation record
        violation.severity_score = severity_score
        db.commit()

        return {
            "score": severity_score,
            "category": SeverityScorer.get_score_category(severity_score),
            "multipliers": {
                "location": location_multiplier,
                "repeat_offender": repeat_multiplier,
                "time": SeverityScorer.get_time_multiplier(violation.timestamp.hour),
            },
        }

    @staticmethod
    def _record_repeat_offender(db: Session, violation: Violation) -> dict:
        """Record violation for repeat offender tracking."""
        offender = RepeatOffenderService.get_or_create_offender(
            db, violation.vehicle_number
        )

        # Record the violation
        updated_offender = RepeatOffenderService.record_violation(
            db,
            violation.vehicle_number,
            violation.violation_type,
            violation.severity_score if hasattr(violation, "severity_score") else 50,
        )

        return {
            "vehicle_number": violation.vehicle_number,
            "violation_count": updated_offender.violation_count,
            "risk_level": updated_offender.risk_level,
            "is_flagged": updated_offender.is_flagged,
            "multiplier": RepeatOffenderService.get_repeat_offender_multiplier(
                db, violation.vehicle_number
            ),
        }

    @staticmethod
    def _update_location_risk(db: Session, violation: Violation) -> dict:
        """Update location risk scores."""
        location = LocationRiskService.get_or_create_location(db, violation.location)

        # Update location risk
        LocationRiskService.update_location_risk(
            db, violation.location, violation.violation_type
        )

        updated_location = LocationRiskService.get_location_summary(
            db, violation.location
        )

        return {
            "location": violation.location,
            "risk_score": updated_location.get("risk_score", 0),
            "risk_level": updated_location.get("risk_level", "low"),
            "violation_count": updated_location.get("violation_count", 0),
        }

    @staticmethod
    def _generate_fine(db: Session, violation: Violation) -> dict:
        """Generate fine for violation."""
        fine = FineGenerator.generate_fine(db, violation.id)

        if not fine:
            return {
                "status": "failed",
                "reason": "Could not generate fine",
            }

        fine_summary = FineGenerator.get_fine_summary(db, fine.id)

        return {
            "fine_id": fine.id,
            "vehicle_number": violation.vehicle_number,
            "base_fine": fine.base_fine,
            "total_fine": fine.total_fine,
            "multipliers": {
                "severity": fine.severity_multiplier,
                "repeat_offender": fine.repeat_offender_multiplier,
            },
            "status": fine.status,
            "due_date": fine.due_date.isoformat() if fine.due_date else None,
        }

    @staticmethod
    def get_violation_analytics(db: Session, violation_id: str) -> dict:
        """Get complete analytics for a violation."""
        violation = db.query(Violation).filter(Violation.id == violation_id).first()

        if not violation:
            return {"error": "Violation not found"}

        return {
            "violation": {
                "id": violation.id,
                "vehicle_number": violation.vehicle_number,
                "violation_type": violation.violation_type,
                "location": violation.location,
                "timestamp": violation.timestamp.isoformat(),
                "severity_score": violation.severity_score,
            },
            "offender_profile": RepeatOffenderService.get_offender_summary(
                db, violation.vehicle_number
            ),
            "location_summary": LocationRiskService.get_location_summary(
                db, violation.location
            ),
            "fines": FineGenerator.get_vehicle_fines(db, violation.vehicle_number),
        }

    @staticmethod
    def initialize_analytics(db: Session) -> dict:
        """Initialize all analytics systems (run on startup)."""
        try:
            SeverityScorer.initialize_severity_scores(db)
            return {
                "status": "success",
                "message": "Analytics systems initialized",
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
            }
