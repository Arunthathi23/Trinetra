from __future__ import annotations

from enum import Enum
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, validator


class VehicleType(str, Enum):
    CAR = "car"
    BIKE = "bike"
    TRUCK = "truck"
    BUS = "bus"
    VAN = "van"
    TAXI = "taxi"
    OTHER = "other"


class ViolationSeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ViolationStatusType(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class ViolationBaseSchema(BaseModel):
    vehicle_number: str = Field(..., min_length=1, max_length=20)
    vehicle_type: VehicleType = Field(...)
    violation_type: str = Field(..., min_length=1, max_length=100)
    severity: ViolationSeverityLevel = Field(...)
    confidence: float = Field(..., ge=0.0, le=1.0)
    location: str = Field(..., min_length=1, max_length=200)

    @validator("vehicle_number")
    def validate_vehicle_number(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not normalized:
            raise ValueError("vehicle_number must not be empty")
        return normalized

    @validator("violation_type")
    def validate_violation_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("violation_type must not be empty")
        return normalized

    @validator("location")
    def validate_location(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("location must not be empty")
        return normalized


class ViolationCreateSchema(ViolationBaseSchema):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: ViolationStatusType = Field(default=ViolationStatusType.PENDING)


class ViolationSchema(ViolationCreateSchema):
    """Reusable violation model schema for requests and responses."""
    id: str


__all__ = [
    "VehicleType",
    "ViolationSeverityLevel",
    "ViolationStatusType",
    "ViolationBaseSchema",
    "ViolationCreateSchema",
    "ViolationSchema",
]
