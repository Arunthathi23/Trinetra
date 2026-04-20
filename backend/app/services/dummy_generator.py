import random
import string
from datetime import datetime

from app.models.violation import (
    VehicleType,
    ViolationCreateSchema,
    ViolationSeverityLevel,
    ViolationStatusType,
)

VIOLATION_TYPES = [
    "helmet",
    "red_light",
    "speeding",
    "seatbelt",
    "parking",
    "lane_violation",
    "no_headlight",
    "wrong_way",
    "mobile_phone",
]

STATE_CODES = [
    "KA",
    "TN",
    "MH",
    "DL",
    "KA",
    "AP",
    "GJ",
    "RJ",
    "UP",
    "WB",
]

SERIES_LETTERS = list(string.ascii_uppercase)


def _make_vehicle_number() -> str:
    state = random.choice(STATE_CODES)
    region = f"{random.randint(1, 99):02d}"
    series = "".join(random.choices(SERIES_LETTERS, k=2))
    number = f"{random.randint(1, 9999):04d}"
    return f"{state}{region}{series}{number}"


def generate_dummy_violation() -> ViolationCreateSchema:
    """Generate a realistic dummy violation payload matching the Pydantic schema."""
    return ViolationCreateSchema(
        vehicle_number=_make_vehicle_number(),
        vehicle_type=random.choice(list(VehicleType)),
        violation_type=random.choice(VIOLATION_TYPES),
        severity=random.choice(list(ViolationSeverityLevel)),
        confidence=round(random.uniform(0.72, 0.98), 2),
        location=random.choice(
            [
                "Downtown Intersection",
                "Highway 7 Northbound",
                "Market Street Corridor",
                "River Road Bridge",
                "East End Signal",
            ]
        ),
        timestamp=datetime.utcnow(),
        status=ViolationStatusType.PENDING,
    )
