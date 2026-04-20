"""
Location Risk Analysis Service

Tracks violation patterns by location and calculates location-based risk scores.
Identifies high-risk areas requiring enhanced enforcement.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import uuid4

from app.models.database import LocationRisk, Violation


class LocationRiskService:
    """Service for analyzing location-based risk metrics."""

    # Risk score thresholds
    RISK_THRESHOLDS = {
        "low": (0, 25),
        "medium": (25, 50),
        "high": (50, 75),
        "critical": (75, 100),
    }

    # Time window for analysis (in days)
    ANALYSIS_WINDOW_DAYS = 30

    @staticmethod
    def get_or_create_location(db: Session, location: str) -> LocationRisk:
        """
        Get existing location risk or create new one.

        Args:
            db: Database session
            location: Location identifier

        Returns:
            LocationRisk record
        """
        risk = db.query(LocationRisk).filter(
            LocationRisk.location == location
        ).first()

        if risk:
            return risk

        # Create new location risk record
        risk = LocationRisk(
            id=str(uuid4()),
            location=location,
            violation_count=0,
            risk_score=0.0,
            risk_level="low",
            helmet_violations=0,
            speeding_violations=0,
            red_light_violations=0,
            wrong_side_violations=0,
            triple_riding_violations=0,
            last_updated=datetime.utcnow(),
        )
        db.add(risk)
        db.commit()
        db.refresh(risk)

        return risk

    @staticmethod
    def update_location_risk(db: Session, location: str) -> LocationRisk:
        """
        Recalculate and update risk metrics for a location.

        Args:
            db: Database session
            location: Location identifier

        Returns:
            Updated LocationRisk record
        """
        risk = LocationRiskService.get_or_create_location(db, location)

        # Get violations in time window
        cutoff_date = datetime.utcnow() - timedelta(
            days=LocationRiskService.ANALYSIS_WINDOW_DAYS
        )

        violations = db.query(Violation).filter(
            Violation.location == location,
            Violation.timestamp >= cutoff_date,
        ).all()

        # Count violations by type
        type_counts = {}
        for violation in violations:
            type_counts[violation.violation_type] = (
                type_counts.get(violation.violation_type, 0) + 1
            )

        # Update risk record
        risk.violation_count = len(violations)
        risk.helmet_violations = type_counts.get("helmet", 0)
        risk.speeding_violations = type_counts.get("speeding", 0)
        risk.red_light_violations = type_counts.get("red_light", 0)
        risk.wrong_side_violations = type_counts.get("wrong_side", 0)
        risk.triple_riding_violations = type_counts.get("triple_riding", 0)

        # Calculate risk score
        risk.risk_score = LocationRiskService._calculate_risk_score(risk)
        risk.risk_level = LocationRiskService._get_risk_level(risk.risk_score)
        risk.last_updated = datetime.utcnow()

        db.add(risk)
        db.commit()
        db.refresh(risk)

        return risk

    @staticmethod
    def _calculate_risk_score(risk: LocationRisk) -> float:
        """
        Calculate risk score for a location (0-100).

        Based on:
        - Total violation count
        - Severity distribution
        - Frequency

        Args:
            risk: LocationRisk object

        Returns:
            Risk score (0-100)
        """
        if risk.violation_count == 0:
            return 0.0

        # Weighted severity factors
        severity_weights = {
            "helmet_violations": 2,           # Lower impact
            "wrong_side_violations": 3,      # Moderate
            "triple_riding_violations": 5,   # Serious
            "speeding_violations": 6,        # Very serious
            "red_light_violations": 8,       # Critical
        }

        # Calculate weighted sum
        weighted_sum = (
            risk.helmet_violations * severity_weights["helmet_violations"]
            + risk.wrong_side_violations * severity_weights["wrong_side_violations"]
            + risk.triple_riding_violations
            * severity_weights["triple_riding_violations"]
            + risk.speeding_violations * severity_weights["speeding_violations"]
            + risk.red_light_violations * severity_weights["red_light_violations"]
        )

        # Normalize to 0-100 scale
        # Using max possible score as reference
        max_possible = max(
            10,  # Avoid division by zero
            (
                risk.violation_count
                * max(severity_weights.values())
            ),
        )

        score = (weighted_sum / max_possible) * 100

        # Apply frequency multiplier (more violations = higher score)
        frequency_multiplier = min(2.0, 1.0 + (risk.violation_count / 50))
        score *= frequency_multiplier

        return round(min(100, score), 2)

    @staticmethod
    def _get_risk_level(score: float) -> str:
        """Get risk level category from score."""
        for level, (min_score, max_score) in LocationRiskService.RISK_THRESHOLDS.items():
            if min_score <= score < max_score:
                return level
        return "critical"

    @staticmethod
    def get_location_summary(db: Session, location: str) -> Dict[str, Any]:
        """
        Get comprehensive summary of location risk.

        Args:
            db: Database session
            location: Location identifier

        Returns:
            Dictionary with location risk information
        """
        risk = LocationRiskService.update_location_risk(db, location)

        # Calculate violation rates
        total_violations = (
            risk.helmet_violations
            + risk.speeding_violations
            + risk.red_light_violations
            + risk.wrong_side_violations
            + risk.triple_riding_violations
        )

        rates = {}
        if total_violations > 0:
            rates = {
                "helmet_percent": round(
                    (risk.helmet_violations / total_violations) * 100, 1
                ),
                "speeding_percent": round(
                    (risk.speeding_violations / total_violations) * 100, 1
                ),
                "red_light_percent": round(
                    (risk.red_light_violations / total_violations) * 100, 1
                ),
                "wrong_side_percent": round(
                    (risk.wrong_side_violations / total_violations) * 100, 1
                ),
                "triple_riding_percent": round(
                    (risk.triple_riding_violations / total_violations) * 100, 1
                ),
            }

        return {
            "location": location,
            "risk_score": risk.risk_score,
            "risk_level": risk.risk_level,
            "total_violations": total_violations,
            "violation_breakdown": {
                "helmet": risk.helmet_violations,
                "speeding": risk.speeding_violations,
                "red_light": risk.red_light_violations,
                "wrong_side": risk.wrong_side_violations,
                "triple_riding": risk.triple_riding_violations,
            },
            "violation_percentages": rates,
            "last_updated": risk.last_updated.isoformat(),
            "analysis_window_days": LocationRiskService.ANALYSIS_WINDOW_DAYS,
        }

    @staticmethod
    def get_high_risk_locations(
        db: Session,
        risk_level: str = "high",
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Get locations above specified risk threshold.

        Args:
            db: Database session
            risk_level: Risk level threshold (low, medium, high, critical)
            limit: Maximum locations to return

        Returns:
            List of high-risk location summaries
        """
        min_threshold, _ = LocationRiskService.RISK_THRESHOLDS.get(
            risk_level, (50, 100)
        )

        locations = (
            db.query(LocationRisk)
            .filter(LocationRisk.risk_score >= min_threshold)
            .order_by(LocationRisk.risk_score.desc())
            .limit(limit)
            .all()
        )

        return [
            LocationRiskService.get_location_summary(db, loc.location)
            for loc in locations
        ]

    @staticmethod
    def get_location_trend(
        db: Session,
        location: str,
        days: int = 30,
    ) -> Dict[str, Any]:
        """
        Get trend analysis for a location over time.

        Args:
            db: Database session
            location: Location identifier
            days: Number of days to analyze

        Returns:
            Dictionary with trend data
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Get violations by day
        daily_violations = (
            db.query(
                func.date(Violation.timestamp).label("date"),
                func.count(Violation.id).label("count"),
            )
            .filter(
                Violation.location == location,
                Violation.timestamp >= cutoff_date,
            )
            .group_by(func.date(Violation.timestamp))
            .all()
        )

        daily_counts = {str(row[0]): row[1] for row in daily_violations}

        # Calculate trend metrics
        dates = sorted(daily_counts.keys())
        if len(dates) >= 2:
            first_half_avg = sum(
                list(daily_counts.values())[: len(dates) // 2]
            ) / max(1, len(dates) // 2)
            second_half_avg = sum(
                list(daily_counts.values())[len(dates) // 2 :]
            ) / max(1, len(dates) - len(dates) // 2)

            trend = "increasing" if second_half_avg > first_half_avg else "decreasing"
            trend_percent = (
                ((second_half_avg - first_half_avg) / max(0.1, first_half_avg)) * 100
            )
        else:
            trend = "stable"
            trend_percent = 0.0

        return {
            "location": location,
            "period_days": days,
            "daily_violations": daily_counts,
            "trend": trend,
            "trend_percent": round(trend_percent, 1),
            "total_violations": sum(daily_counts.values()),
            "average_daily": round(
                sum(daily_counts.values()) / max(1, len(daily_counts)), 2
            ),
        }

    @staticmethod
    def recommend_enforcement(db: Session) -> List[Dict[str, Any]]:
        """
        Get recommendations for enforcement resource allocation.

        Args:
            db: Database session

        Returns:
            List of enforcement recommendations
        """
        high_risk = LocationRiskService.get_high_risk_locations(
            db, risk_level="high", limit=20
        )

        recommendations = []
        for location_data in high_risk:
            score = location_data["risk_score"]
            violations = location_data["violation_breakdown"]

            # Determine enforcement type based on violation pattern
            if violations["speeding"] > violations["red_light"]:
                enforcement_type = "Speed enforcement cameras/patrol"
            elif violations["red_light"] > violations["speeding"]:
                enforcement_type = "Traffic light enforcement"
            elif violations["helmet"] > violations["triple_riding"]:
                enforcement_type = "Safety gear enforcement"
            else:
                enforcement_type = "General traffic enforcement"

            recommendations.append({
                "location": location_data["location"],
                "risk_score": score,
                "risk_level": location_data["risk_level"],
                "primary_violation": max(
                    violations.items(), key=lambda x: x[1]
                )[0],
                "recommended_enforcement": enforcement_type,
                "priority": "urgent" if score >= 75 else "high",
            })

        return recommendations
