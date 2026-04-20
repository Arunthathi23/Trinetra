"""
Fine Generation Service

Automatically generates traffic fines based on violation type, severity,
repeat offender status, and jurisdiction rules.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models.database import Fine, Violation, RepeatOffender
from app.services.repeat_offender_service import RepeatOffenderService
from app.services.severity_scoring import SeverityScorer


class FineGenerator:
    """Service for generating traffic fines."""

    # Base fine amounts by violation type (in local currency)
    BASE_FINES = {
        "helmet": 500,          # Base fine for no helmet
        "speeding": 1000,       # Base fine for speeding
        "red_light": 2500,      # Base fine for red light jump (highest)
        "wrong_side": 750,      # Base fine for wrong side
        "triple_riding": 1500,  # Base fine for triple riding
    }

    # Fine due date offset (days from violation)
    FINE_DUE_OFFSET_DAYS = 30

    # Maximum fine cap per violation
    MAX_FINE_CAP = 10000

    @staticmethod
    def generate_fine(
        db: Session,
        violation_id: str,
        generate_if_exists: bool = False,
    ) -> Optional[Fine]:
        """
        Generate a fine for a violation.

        Args:
            db: Database session
            violation_id: Violation ID
            generate_if_exists: Whether to generate if fine already exists

        Returns:
            Generated Fine object or None if already exists
        """
        # Check if fine already exists
        existing_fine = db.query(Fine).filter(
            Fine.violation_id == violation_id
        ).first()

        if existing_fine and not generate_if_exists:
            return existing_fine

        # Get violation details
        violation = db.query(Violation).filter(
            Violation.id == violation_id
        ).first()

        if not violation:
            return None

        # Calculate base fine
        base_fine = FineGenerator.BASE_FINES.get(violation.violation_type, 500)

        # Get repeat offender multiplier
        repeat_multiplier = RepeatOffenderService.get_repeat_offender_multiplier(
            db, violation.vehicle_number
        )

        # Calculate severity adjustment
        severity_score = violation.severity_score or SeverityScorer.calculate_score(
            db,
            violation.violation_type,
            violation.timestamp,
            violation.location,
            violation.vehicle_number,
            violation.vehicle_type,
            violation.confidence,
        )

        # Severity adjustment (score 0-100 -> multiplier 0.5-1.5)
        severity_multiplier = 0.5 + (severity_score / 100) * 1.0

        # Calculate total fine
        total_fine = base_fine * repeat_multiplier * severity_multiplier

        # Apply cap
        total_fine = min(FineGenerator.MAX_FINE_CAP, total_fine)

        # Create fine record
        fine = Fine(
            id=str(uuid4()),
            violation_id=violation_id,
            vehicle_number=violation.vehicle_number,
            violation_type=violation.violation_type,
            base_fine=base_fine,
            penalty_multiplier=repeat_multiplier * severity_multiplier,
            total_fine=round(total_fine, 2),
            is_paid=False,
            is_waived=False,
            generated_date=datetime.utcnow(),
            due_date=violation.timestamp
            + timedelta(days=FineGenerator.FINE_DUE_OFFSET_DAYS),
            description=FineGenerator._generate_description(
                violation, severity_score, repeat_multiplier
            ),
        )

        db.add(fine)
        db.commit()
        db.refresh(fine)

        # Record violation for repeat offender tracking
        RepeatOffenderService.record_violation(
            db, violation.vehicle_number, violation_id, total_fine
        )

        return fine

    @staticmethod
    def _generate_description(
        violation: Violation,
        severity_score: int,
        repeat_multiplier: float,
    ) -> str:
        """
        Generate a descriptive fine explanation.

        Args:
            violation: Violation object
            severity_score: Calculated severity score
            repeat_multiplier: Repeat offender multiplier

        Returns:
            Description string
        """
        base_description = f"{violation.violation_type.upper()} violation detected at {violation.location}"

        additions = []

        if severity_score >= 70:
            additions.append("Critical severity")
        elif severity_score >= 50:
            additions.append("High severity")

        if repeat_multiplier > 1.5:
            additions.append("Repeat offender surcharge applied")
        elif repeat_multiplier > 1.0:
            additions.append("Repeat offender penalty")

        if additions:
            return f"{base_description}. {'; '.join(additions)}."
        return base_description

    @staticmethod
    def get_fine_summary(db: Session, fine_id: str) -> Dict[str, Any]:
        """
        Get comprehensive summary of a fine.

        Args:
            db: Database session
            fine_id: Fine ID

        Returns:
            Dictionary with fine details
        """
        fine = db.query(Fine).filter(Fine.id == fine_id).first()

        if not fine:
            return {}

        violation = db.query(Violation).filter(
            Violation.id == fine.violation_id
        ).first()

        days_until_due = (fine.due_date - datetime.utcnow()).days

        return {
            "fine_id": fine.id,
            "violation_id": fine.violation_id,
            "vehicle_number": fine.vehicle_number,
            "violation_type": fine.violation_type,
            "base_fine": fine.base_fine,
            "multiplier": round(fine.penalty_multiplier, 2),
            "total_fine": fine.total_fine,
            "is_paid": fine.is_paid,
            "is_waived": fine.is_waived,
            "generated_date": fine.generated_date.isoformat(),
            "due_date": fine.due_date.isoformat(),
            "days_until_due": days_until_due,
            "status": "PAID"
            if fine.is_paid
            else "WAIVED"
            if fine.is_waived
            else "OVERDUE"
            if days_until_due < 0
            else "PENDING",
            "description": fine.description,
            "violation_location": violation.location if violation else None,
            "violation_timestamp": violation.timestamp.isoformat() if violation else None,
        }

    @staticmethod
    def mark_as_paid(db: Session, fine_id: str) -> Fine:
        """
        Mark a fine as paid.

        Args:
            db: Database session
            fine_id: Fine ID

        Returns:
            Updated Fine object
        """
        fine = db.query(Fine).filter(Fine.id == fine_id).first()

        if fine:
            fine.is_paid = True
            db.add(fine)
            db.commit()
            db.refresh(fine)

        return fine

    @staticmethod
    def waive_fine(
        db: Session,
        fine_id: str,
        reason: str = "Administrative decision",
    ) -> Fine:
        """
        Waive a fine (e.g., appeal decision).

        Args:
            db: Database session
            fine_id: Fine ID
            reason: Reason for waiving

        Returns:
            Updated Fine object
        """
        fine = db.query(Fine).filter(Fine.id == fine_id).first()

        if fine:
            fine.is_waived = True
            fine.description = f"{fine.description} [Waived: {reason}]"
            db.add(fine)
            db.commit()
            db.refresh(fine)

        return fine

    @staticmethod
    def get_pending_fines(
        db: Session,
        vehicle_number: Optional[str] = None,
        limit: int = 100,
    ) -> list[Dict[str, Any]]:
        """
        Get all pending (unpaid and not waived) fines.

        Args:
            db: Database session
            vehicle_number: Optional vehicle filter
            limit: Maximum number to return

        Returns:
            List of pending fine summaries
        """
        query = db.query(Fine).filter(
            Fine.is_paid == False,
            Fine.is_waived == False,
        )

        if vehicle_number:
            query = query.filter(Fine.vehicle_number == vehicle_number)

        fines = query.order_by(Fine.due_date).limit(limit).all()

        return [FineGenerator.get_fine_summary(db, fine.id) for fine in fines]

    @staticmethod
    def get_overdue_fines(db: Session, limit: int = 100) -> list[Dict[str, Any]]:
        """
        Get all overdue fines.

        Args:
            db: Database session
            limit: Maximum number to return

        Returns:
            List of overdue fine summaries
        """
        now = datetime.utcnow()

        fines = (
            db.query(Fine)
            .filter(
                Fine.is_paid == False,
                Fine.is_waived == False,
                Fine.due_date < now,
            )
            .order_by(Fine.due_date)
            .limit(limit)
            .all()
        )

        return [FineGenerator.get_fine_summary(db, fine.id) for fine in fines]

    @staticmethod
    def get_total_fines_for_vehicle(
        db: Session,
        vehicle_number: str,
        include_paid: bool = False,
    ) -> Dict[str, Any]:
        """
        Get total fine amount for a vehicle.

        Args:
            db: Database session
            vehicle_number: Vehicle identifier
            include_paid: Whether to include paid fines

        Returns:
            Dictionary with fine totals
        """
        query = db.query(Fine).filter(
            Fine.vehicle_number == vehicle_number,
            Fine.is_waived == False,
        )

        if not include_paid:
            query = query.filter(Fine.is_paid == False)

        fines = query.all()

        total_fine = sum(fine.total_fine for fine in fines)
        pending_count = sum(1 for fine in fines if not fine.is_paid)
        paid_count = sum(1 for fine in fines if fine.is_paid)

        return {
            "vehicle_number": vehicle_number,
            "total_fine_amount": round(total_fine, 2),
            "pending_fine_count": pending_count,
            "paid_fine_count": paid_count,
            "total_fine_count": len(fines),
        }

    @staticmethod
    def get_fine_statistics(db: Session) -> Dict[str, Any]:
        """
        Get system-wide fine statistics.

        Args:
            db: Database session

        Returns:
            Dictionary with fine statistics
        """
        all_fines = db.query(Fine).all()
        paid_fines = [f for f in all_fines if f.is_paid]
        pending_fines = [f for f in all_fines if not f.is_paid and not f.is_waived]
        overdue_fines = [
            f for f in pending_fines if f.due_date < datetime.utcnow()
        ]

        total_revenue = sum(fine.total_fine for fine in paid_fines)
        pending_amount = sum(fine.total_fine for fine in pending_fines)

        return {
            "total_fines_generated": len(all_fines),
            "paid_fines": len(paid_fines),
            "pending_fines": len(pending_fines),
            "overdue_fines": len(overdue_fines),
            "waived_fines": sum(1 for f in all_fines if f.is_waived),
            "total_revenue": round(total_revenue, 2),
            "pending_amount": round(pending_amount, 2),
            "average_fine": round(
                sum(f.total_fine for f in all_fines) / max(1, len(all_fines)), 2
            ),
        }
