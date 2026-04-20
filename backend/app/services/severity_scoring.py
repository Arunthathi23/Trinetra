"""
Severity Scoring Service

Calculates numeric severity scores (0-100) for violations based on:
- Violation type
- Time of day
- Location risk
- Weather conditions
- Vehicle type
"""

from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from uuid import uuid4

from app.models.database import SeverityScore, LocationRisk, RepeatOffender


class SeverityScorer:
    """Service for calculating violation severity scores."""

    # Base scores for each violation type (0-100)
    BASE_SCORES = {
        "helmet": 25,          # Moderate risk
        "speeding": 45,        # High risk
        "red_light": 60,       # Very high risk
        "wrong_side": 35,      # Significant risk
        "triple_riding": 50,   # High risk
    }

    # Time-based multipliers
    # Higher multiplier during night hours (more dangerous)
    TIME_MULTIPLIERS = {
        "night": 1.5,    # 22:00 - 06:00
        "evening": 1.2,  # 18:00 - 22:00
        "day": 1.0,      # 06:00 - 18:00
    }

    # Vehicle type risk factors
    VEHICLE_RISK_FACTORS = {
        "bike": 1.3,          # Higher risk for motorcycles
        "car": 1.0,           # Baseline
        "truck": 1.1,         # Slightly higher
        "bicycle": 1.2,       # High risk (vulnerable)
    }

    @staticmethod
    def initialize_severity_scores(db: Session) -> None:
        """
        Initialize severity reference table with default scores.

        Args:
            db: Database session
        """
        default_scores = {
            "helmet": {
                "base_score": 25,
                "time_factor": 1.2,
                "location_factor": 1.0,
                "repeat_factor": 1.3,
                "description": "Not wearing helmet while riding motorcycle/bicycle",
            },
            "speeding": {
                "base_score": 45,
                "time_factor": 1.4,
                "location_factor": 1.3,
                "repeat_factor": 1.5,
                "description": "Vehicle exceeding speed limit",
            },
            "red_light": {
                "base_score": 60,
                "time_factor": 1.2,
                "location_factor": 1.2,
                "repeat_factor": 1.6,
                "description": "Running red light at intersection",
            },
            "wrong_side": {
                "base_score": 35,
                "time_factor": 1.3,
                "location_factor": 1.1,
                "repeat_factor": 1.4,
                "description": "Driving on wrong side of road",
            },
            "triple_riding": {
                "base_score": 50,
                "time_factor": 1.2,
                "location_factor": 1.0,
                "repeat_factor": 1.4,
                "description": "Carrying more than 2 people on motorcycle",
            },
        }

        for violation_type, config in default_scores.items():
            existing = db.query(SeverityScore).filter(
                SeverityScore.violation_type == violation_type
            ).first()

            if not existing:
                score = SeverityScore(
                    id=str(uuid4()),
                    violation_type=violation_type,
                    base_score=config["base_score"],
                    time_factor=config["time_factor"],
                    location_factor=config["location_factor"],
                    repeat_factor=config["repeat_factor"],
                    description=config["description"],
                )
                db.add(score)

        db.commit()

    @staticmethod
    def get_time_multiplier(timestamp: datetime) -> float:
        """
        Get time-based severity multiplier based on hour of day.

        Args:
            timestamp: Violation timestamp

        Returns:
            Multiplier (1.0 = baseline)
        """
        hour = timestamp.hour

        if 22 <= hour or hour < 6:
            return SeverityScorer.TIME_MULTIPLIERS["night"]
        elif 18 <= hour < 22:
            return SeverityScorer.TIME_MULTIPLIERS["evening"]
        else:
            return SeverityScorer.TIME_MULTIPLIERS["day"]

    @staticmethod
    def get_location_multiplier(db: Session, location: str) -> float:
        """
        Get location-based severity multiplier based on area risk.

        Args:
            db: Database session
            location: Location identifier

        Returns:
            Multiplier (1.0 = baseline)
        """
        location_risk = db.query(LocationRisk).filter(
            LocationRisk.location == location
        ).first()

        if not location_risk:
            return 1.0

        # Scale risk score to multiplier (0-100 -> 0.8-1.5)
        multiplier = 0.8 + (location_risk.risk_score / 100) * 0.7
        return round(multiplier, 2)

    @staticmethod
    def get_repeat_offender_multiplier(db: Session, vehicle_number: str) -> float:
        """
        Get repeat offender multiplier for fine increase.

        Args:
            db: Database session
            vehicle_number: Vehicle identifier

        Returns:
            Multiplier (1.0 = no increase)
        """
        offender = db.query(RepeatOffender).filter(
            RepeatOffender.vehicle_number == vehicle_number
        ).first()

        if not offender:
            return 1.0

        # Return multiplier based on violation count
        if offender.violation_count <= 1:
            return 1.0
        elif offender.violation_count <= 3:
            return 1.25
        elif offender.violation_count <= 5:
            return 1.5
        elif offender.violation_count <= 10:
            return 2.0
        else:
            return 2.5

    @staticmethod
    def calculate_score(
        db: Session,
        violation_type: str,
        timestamp: datetime,
        location: str,
        vehicle_number: str,
        vehicle_type: str,
        confidence: float,
    ) -> int:
        """
        Calculate comprehensive severity score for a violation.

        Args:
            db: Database session
            violation_type: Type of violation
            timestamp: When violation occurred
            location: Where violation occurred
            vehicle_number: Vehicle involved
            vehicle_type: Type of vehicle
            confidence: Detection confidence

        Returns:
            Severity score (0-100)
        """
        # Get base score
        base_score = SeverityScorer.BASE_SCORES.get(violation_type, 30)

        # Apply time multiplier
        time_mult = SeverityScorer.get_time_multiplier(timestamp)

        # Apply location multiplier
        location_mult = SeverityScorer.get_location_multiplier(db, location)

        # Apply vehicle risk factor
        vehicle_factor = SeverityScorer.VEHICLE_RISK_FACTORS.get(vehicle_type, 1.0)

        # Apply repeat offender multiplier
        repeat_mult = SeverityScorer.get_repeat_offender_multiplier(db, vehicle_number)

        # Apply detection confidence factor (higher confidence = higher score)
        confidence_factor = 0.5 + (confidence * 0.5)  # 0.5-1.0 range

        # Calculate final score
        score = (
            base_score
            * time_mult
            * location_mult
            * vehicle_factor
            * repeat_mult
            * confidence_factor
        )

        # Cap at 100
        return int(min(100, max(0, score)))

    @staticmethod
    def get_score_category(score: int) -> str:
        """
        Categorize severity score into risk levels.

        Args:
            score: Severity score (0-100)

        Returns:
            Risk category string
        """
        if score < 20:
            return "low"
        elif score < 40:
            return "medium"
        elif score < 70:
            return "high"
        else:
            return "critical"

    @staticmethod
    def get_score_details(score: int) -> Dict[str, Any]:
        """
        Get detailed information about a severity score.

        Args:
            score: Severity score

        Returns:
            Dictionary with score details
        """
        category = SeverityScorer.get_score_category(score)

        categories = {
            "low": {
                "range": "0-20",
                "description": "Minor violation, routine enforcement",
                "enforcement": "Warning or minor fine",
            },
            "medium": {
                "range": "20-40",
                "description": "Moderate violation, standard enforcement",
                "enforcement": "Standard fine, possible license points",
            },
            "high": {
                "range": "40-70",
                "description": "Serious violation, strict enforcement",
                "enforcement": "Higher fine, license suspension possible",
            },
            "critical": {
                "range": "70-100",
                "description": "Critical violation, immediate action required",
                "enforcement": "Maximum fine, license revocation possible",
            },
        }

        return {
            "score": score,
            "category": category,
            **categories.get(category, {}),
        }

    @staticmethod
    def bulk_calculate_scores(
        db: Session,
        violations: list[Dict[str, Any]],
    ) -> list[Dict[str, Any]]:
        """
        Calculate scores for multiple violations efficiently.

        Args:
            db: Database session
            violations: List of violation data dictionaries

        Returns:
            List of violations with calculated scores
        """
        scored_violations = []

        for violation in violations:
            score = SeverityScorer.calculate_score(
                db,
                violation.get("violation_type"),
                violation.get("timestamp"),
                violation.get("location"),
                violation.get("vehicle_number"),
                violation.get("vehicle_type"),
                violation.get("confidence", 0.5),
            )

            violation["severity_score"] = score
            violation["severity_category"] = SeverityScorer.get_score_category(score)
            scored_violations.append(violation)

        return scored_violations
