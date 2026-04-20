from sqlalchemy import Column, DateTime, Enum, Float, Integer, String, create_engine, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.models.violation import VehicleType, ViolationSeverityLevel, ViolationStatusType

DATABASE_URL = "sqlite:///./trinetra.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


class Violation(Base):
    __tablename__ = "violations"

    id = Column(String, primary_key=True, index=True)
    vehicle_number = Column(String, nullable=False, index=True)
    vehicle_type = Column(Enum(VehicleType), nullable=False)
    violation_type = Column(String, nullable=False)
    severity = Column(Enum(ViolationSeverityLevel), nullable=False)
    confidence = Column(Float, nullable=False)
    location = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False)
    status = Column(Enum(ViolationStatusType), nullable=False)
    severity_score = Column(Integer, default=0)  # 0-100 numeric score


class RepeatOffender(Base):
    """Track repeat violations for a vehicle/driver."""
    __tablename__ = "repeat_offenders"

    id = Column(String, primary_key=True, index=True)
    vehicle_number = Column(String, nullable=False, unique=True, index=True)
    violation_count = Column(Integer, default=1)
    first_violation_date = Column(DateTime, nullable=False)
    last_violation_date = Column(DateTime, nullable=False)
    is_flagged = Column(Boolean, default=False)
    risk_level = Column(String, default="low")  # low, medium, high, critical
    total_fine_amount = Column(Float, default=0.0)


class LocationRisk(Base):
    """Track risk metrics per location."""
    __tablename__ = "location_risks"

    id = Column(String, primary_key=True, index=True)
    location = Column(String, nullable=False, unique=True, index=True)
    violation_count = Column(Integer, default=0)
    risk_score = Column(Float, default=0.0)  # 0-100
    risk_level = Column(String, default="low")  # low, medium, high, critical
    helmet_violations = Column(Integer, default=0)
    speeding_violations = Column(Integer, default=0)
    red_light_violations = Column(Integer, default=0)
    wrong_side_violations = Column(Integer, default=0)
    triple_riding_violations = Column(Integer, default=0)
    last_updated = Column(DateTime, nullable=False)


class Fine(Base):
    """Generated traffic fines."""
    __tablename__ = "fines"

    id = Column(String, primary_key=True, index=True)
    violation_id = Column(String, ForeignKey("violations.id"), nullable=False, index=True)
    vehicle_number = Column(String, nullable=False, index=True)
    violation_type = Column(String, nullable=False)
    base_fine = Column(Float, nullable=False)
    penalty_multiplier = Column(Float, default=1.0)  # For repeat offenders
    total_fine = Column(Float, nullable=False)
    is_paid = Column(Boolean, default=False)
    is_waived = Column(Boolean, default=False)
    generated_date = Column(DateTime, nullable=False)
    due_date = Column(DateTime, nullable=False)
    description = Column(String, nullable=True)


class SeverityScore(Base):
    """Reference table for violation severity scores."""
    __tablename__ = "severity_scores"

    id = Column(String, primary_key=True, index=True)
    violation_type = Column(String, nullable=False, unique=True, index=True)
    base_score = Column(Integer, nullable=False)  # Base score 1-100
    time_factor = Column(Float, default=1.0)  # Multiply by hour (night=1.5, day=1.0)
    location_factor = Column(Float, default=1.0)  # Based on area safety
    repeat_factor = Column(Float, default=1.5)  # Multiplier for repeat offenders
    description = Column(String, nullable=True)


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
