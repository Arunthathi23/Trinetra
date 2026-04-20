import random
from datetime import datetime, timedelta
from typing import Dict, List

from app.models.models import HotspotAnalysis, PredictionData

LOCATIONS = [
    "Downtown Intersection",
    "Highway 7 Northbound",
    "Market Street Corridor",
    "River Road Bridge",
    "East End Signal",
]


def generate_predictions() -> List[PredictionData]:
    predictions = []
    for index, location in enumerate(LOCATIONS, start=1):
        predicted = random.randint(15, 120)
        confidence = round(random.uniform(0.65, 0.98), 2)
        predictions.append(
            PredictionData(
                location=location,
                predicted_violations=predicted,
                confidence=confidence,
                time_window="next 3 hours",
                risk_level="high" if predicted > 80 else "medium" if predicted > 40 else "low",
            )
        )
    return predictions


def analyze_hotspots() -> List[HotspotAnalysis]:
    hotspots = []
    for location in LOCATIONS[:3]:
        hotspots.append(
            HotspotAnalysis(
                location=location,
                latitude=12.9700 + random.random() * 0.05,
                longitude=77.5900 + random.random() * 0.05,
                violation_count=random.randint(50, 200),
                risk_score=round(random.uniform(0.55, 0.98), 2),
                primary_violation_types=["speeding", "red_light", "no_seatbelt"],
                peak_hours=["08:00-09:00", "17:00-18:00"],
                trend="rising",
            )
        )
    return hotspots


def analyze_traffic_patterns() -> Dict[str, str]:
    return {
        "summary": "Traffic is showing a moderate increase in violations during peak hours.",
        "recommendation": "Dispatch additional enforcement units to Downtown Intersection and Market Street Corridor.",
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }


def generate_insights() -> Dict[str, object]:
    violation_types = [
        "helmet",
        "red_light",
        "speeding",
        "seatbelt",
        "parking",
        "lane_violation",
        "mobile_phone",
    ]
    repeat_offenders = [
        {
            "vehicle_number": f"KA{random.randint(1, 99):02d}{random.choice(['AB', 'CD', 'EF'])}{random.randint(1000, 9999):04d}",
            "offenses": random.randint(2, 6),
        }
        for _ in range(3)
    ]

    return {
        "total_violations": random.randint(120, 460),
        "most_common_violation": random.choice(violation_types),
        "peak_violation_time": random.choice([
            "08:00-09:00",
            "17:00-18:00",
            "12:00-13:00",
            "19:00-20:00",
        ]),
        "repeat_offenders": repeat_offenders,
    }
