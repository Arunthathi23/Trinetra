"""
Repeat Offender Detection Service

Tracks vehicles with multiple violations and flags repeat offenders.
Updates risk levels based on violation patterns.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models.database import Violation, RepeatOffender


class RepeatOffenderService:
    """Service for tracking and managing repeat offenders."""

    # Risk level thresholds
    RISK_THRESHOLDS = {
        "low": 1,        # 1 violation
        "medium": 3,     # 3+ violations
        "high": 5,       # 5+ violations
        "critical": 10,  # 10+ violations
    }

    # Time window for recent violations (in days)
    RECENT_WINDOW_DAYS = 90

    @staticmethod
    def get_or_create_offender(
        db: Session,
        vehicle_number: str,
    ) -> RepeatOffender:
        """
        Get existing repeat offender record or create new one.

        Args:
            db: Database session
            vehicle_number: Vehicle identifier

        Returns:
            RepeatOffender record
        """
        offender = db.query(RepeatOffender).filter(
            RepeatOffender.vehicle_number == vehicle_number
        ).first()

        if offender:
            return offender

        # Create new offender record
        now = datetime.utcnow()
        offender = RepeatOffender(
            id=str(uuid4()),
            vehicle_number=vehicle_number,
            violation_count=0,
            first_violation_date=now,
            last_violation_date=now,
            is_flagged=False,
            risk_level="low",
            total_fine_amount=0.0,
        )
        db.add(offender)
        db.commit()
        db.refresh(offender)

        return offender

    @staticmethod
    def record_violation(
        db: Session,
        vehicle_number: str,
        violation_id: str,
        fine_amount: float = 0.0,
    ) -> RepeatOffender:
        """
        Record a new violation for a vehicle.

        Args:
            db: Database session
            vehicle_number: Vehicle identifier
            violation_id: Associated violation ID
            fine_amount: Fine amount for this violation

        Returns:
            Updated RepeatOffender record
        """
        offender = RepeatOffenderService.get_or_create_offender(db, vehicle_number)

        # Update violation count
        offender.violation_count += 1
        offender.last_violation_date = datetime.utcnow()
        offender.total_fine_amount += fine_amount

        # Update risk level
        offender.risk_level = RepeatOffenderService._calculate_risk_level(
            offender.violation_count
        )

        # Flag if critical
        if offender.violation_count >= 10:
            offender.is_flagged = True

        db.add(offender)
        db.commit()
        db.refresh(offender)

        return offender

    @staticmethod
    def _calculate_risk_level(violation_count: int) -> str:
        """Calculate risk level based on violation count."""
        for level, threshold in sorted(
            RepeatOffenderService.RISK_THRESHOLDS.items(),
            key=lambda x: x[1],
            reverse=True,
        ):
            if violation_count >= threshold:
                return level
        return "low"

    @staticmethod
    def get_recent_violations(
        db: Session,
        vehicle_number: str,
        days: int = 90,
    ) -> int:
        """
        Count recent violations for a vehicle.

        Args:
            db: Database session
            vehicle_number: Vehicle identifier
            days: Time window in days

        Returns:
            Number of violations in recent period
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        count = db.query(Violation).filter(
            Violation.vehicle_number == vehicle_number,
            Violation.timestamp >= cutoff_date,
        ).count()

        return count

    @staticmethod
    def get_violation_pattern(
        db: Session,
        vehicle_number: str,
        days: int = 90,
    ) -> Dict[str, int]:
        """
        Get violation type distribution for a vehicle.

        Args:
            db: Database session
            vehicle_number: Vehicle identifier
            days: Time window in days

        Returns:
            Dictionary with violation type counts
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        violations = db.query(Violation).filter(
            Violation.vehicle_number == vehicle_number,
            Violation.timestamp >= cutoff_date,
        ).all()

        pattern = {}
        for violation in violations:
            pattern[violation.violation_type] = (
                pattern.get(violation.violation_type, 0) + 1
            )

        return pattern

    @staticmethod
    def get_offender_summary(
        db: Session,
        vehicle_number: str,
    ) -> Dict[str, Any]:
        """
        Get comprehensive summary of repeat offender.

        Args:
            db: Database session
            vehicle_number: Vehicle identifier

        Returns:
            Dictionary with offender information
        """
        offender = RepeatOffenderService.get_or_create_offender(db, vehicle_number)
        recent_count = RepeatOffenderService.get_recent_violations(db, vehicle_number)
        pattern = RepeatOffenderService.get_violation_pattern(db, vehicle_number)

        days_since_first = (
            datetime.utcnow() - offender.first_violation_date
        ).days
        violation_frequency = (
            offender.violation_count / max(1, days_since_first) * 365
        )  # Per year

        return {
            "vehicle_number": vehicle_number,
            "total_violations": offender.violation_count,
            "recent_violations": recent_count,
            "risk_level": offender.risk_level,
            "is_flagged": offender.is_flagged,
            "total_fine_amount": offender.total_fine_amount,
            "first_violation_date": offender.first_violation_date.isoformat(),
            "last_violation_date": offender.last_violation_date.isoformat(),
            "violation_pattern": pattern,
            "violation_frequency_per_year": round(violation_frequency, 2),
            "days_since_first": days_since_first,
        }

    @staticmethod
    def get_repeat_offender_multiplier(
        db: Session,
        vehicle_number: str,
    ) -> float:
        """
        Get fine multiplier based on repeat offender status.

        Args:
            db: Database session
            vehicle_number: Vehicle identifier

        Returns:
            Multiplier for fine amount (1.0 = no multiplier)
        """
        offender = RepeatOffenderService.get_or_create_offender(db, vehicle_number)

        # Base multiplier
        if offender.violation_count <= 1:
            return 1.0
        elif offender.violation_count <= 3:
            return 1.25  # 25% increase
        elif offender.violation_count <= 5:
            return 1.5  # 50% increase
        elif offender.violation_count <= 10:
            return 2.0  # 100% increase (double fine)
        else:
            return 2.5  # 150% increase (critical)

    @staticmethod
    def flag_offender(
        db: Session,
        vehicle_number: str,
        reason: str = "Critical repeat offender",
    ) -> RepeatOffender:
        """
        Manually flag a vehicle as repeat offender.

        Args:
            db: Database session
            vehicle_number: Vehicle identifier
            reason: Reason for flagging

        Returns:
            Updated RepeatOffender record
        """
        offender = RepeatOffenderService.get_or_create_offender(db, vehicle_number)
        offender.is_flagged = True
        db.add(offender)
        db.commit()
        db.refresh(offender)

        return offender

    @staticmethod
    def unflag_offender(
        db: Session,
        vehicle_number: str,
    ) -> RepeatOffender:
        """
        Remove repeat offender flag (e.g., after rehabilitation).

        Args:
            db: Database session
            vehicle_number: Vehicle identifier

        Returns:
            Updated RepeatOffender record
        """
        offender = RepeatOffenderService.get_or_create_offender(db, vehicle_number)
        offender.is_flagged = False
        db.add(offender)
        db.commit()
        db.refresh(offender)

        return offender

    @staticmethod
    def get_all_flagged_offenders(db: Session) -> list[Dict[str, Any]]:
        """
        Get all flagged repeat offenders.

        Args:
            db: Database session

        Returns:
            List of flagged offender summaries
        """
        flagged = db.query(RepeatOffender).filter(
            RepeatOffender.is_flagged == True
        ).all()

        return [
            RepeatOffenderService.get_offender_summary(db, offender.vehicle_number)
            for offender in flagged
        ]

    @staticmethod
    def get_top_offenders(
        db: Session,
        limit: int = 10,
        days: int = 90,
    ) -> list[Dict[str, Any]]:
        """
        Get top repeat offenders by recent violations.

        Args:
            db: Database session
            limit: Maximum number to return
            days: Time window for recent violations

        Returns:
            List of top offenders
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        offenders = (
            db.query(RepeatOffender)
            .filter(RepeatOffender.last_violation_date >= cutoff_date)
            .order_by(RepeatOffender.violation_count.desc())
            .limit(limit)
            .all()
        )

        return [
            RepeatOffenderService.get_offender_summary(db, offender.vehicle_number)
            for offender in offenders
        ]
