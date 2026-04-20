from datetime import datetime
import asyncio
from uuid import uuid4

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

from app.routes.status import router as status_router
from app.routes.violations import router as violations_router
from app.routes.monitoring import router as monitoring_router
from app.routes.insights import router as insights_router
from app.routes.upload import router as upload_router
from app.routes.streaming import router as streaming_router
from app.routes.advanced_analytics import router as analytics_router
from app.services.database_service import get_realtime_status
from app.services.dummy_generator import generate_dummy_violation
from app.services.stream_processor import stream_processor
from app.models.database import SessionLocal, Violation as DBViolation
from app.models.models import APIResponse
from app.models.violation import ViolationSchema

app = FastAPI(
    title="TRINETRA Backend API",
    description="Traffic violation detection, monitoring, and analytics backend.",
    version="0.1.0",
)

origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(status_router)
app.include_router(violations_router, prefix="/violations", tags=["Violations"])
app.include_router(monitoring_router, prefix="/monitoring", tags=["Monitoring"])
app.include_router(insights_router, prefix="/insights", tags=["Insights"])
app.include_router(upload_router)
app.include_router(streaming_router, tags=["Real-time Streaming"])
app.include_router(analytics_router, prefix="/analytics", tags=["Advanced Analytics"])


@app.get("/", response_model=APIResponse, tags=["Status"])
def root_status():
    """Return the overall TRINETRA system status."""
    status = get_realtime_status()
    return APIResponse(success=True, message="TRINETRA system status", data=status)


@app.websocket("/ws/violations")
async def websocket_violations(
    websocket: WebSocket,
    video_source: str = Query("dummy"),
    skip_frames: int = Query(2),
):
    """
    Stream live YOLO-based violation detections over WebSocket.

    This endpoint persists detected violations to the database.
    It defaults to a dummy stream so camera access only happens when explicitly requested
    (for example with `video_source=0`).
    """
    await websocket.accept()

    async def _stream_dummy_violations(db_session):
        """Fallback stream when camera/file source is not available."""
        while True:
            dummy = generate_dummy_violation()
            violation = {
                "id": str(uuid4()),
                "vehicle_number": dummy.vehicle_number,
                "vehicle_id": dummy.vehicle_number,
                "vehicle_type": dummy.vehicle_type.value,
                "violation_type": dummy.violation_type,
                "severity": dummy.severity.value,
                "confidence": float(dummy.confidence),
                "location": dummy.location,
                "timestamp": dummy.timestamp.isoformat(),
                "status": dummy.status.value,
            }

            try:
                existing = db_session.query(DBViolation).filter(DBViolation.id == violation["id"]).first()
                if not existing:
                    db_violation = DBViolation(
                        id=violation["id"],
                        vehicle_number=violation["vehicle_number"],
                        vehicle_type=violation["vehicle_type"],
                        violation_type=violation["violation_type"],
                        severity=violation["severity"],
                        confidence=violation["confidence"],
                        location=violation["location"],
                        timestamp=datetime.fromisoformat(violation["timestamp"]),
                        status=violation["status"],
                    )
                    db_session.add(db_violation)
                    db_session.commit()
            except Exception as db_error:
                db_session.rollback()
                print(f"Fallback violation persistence failed: {db_error}")

            await websocket.send_json(violation)
            await asyncio.sleep(2)

    try:
        try:
            video_source_val = int(video_source)
        except ValueError:
            video_source_val = video_source

        db = SessionLocal()
        try:
            sent_violations = False
            async for detection_data in stream_processor.process_video_stream(
                video_source_val,
                skip_frames=skip_frames,
            ):
                violations = detection_data.get("violations") or []
                if not violations:
                    continue

                # Persist each detected violation to the database if not already stored.
                try:
                    for violation in violations:
                        existing = db.query(DBViolation).filter(DBViolation.id == violation.get("id")).first()
                        if existing:
                            continue

                        db_violation = DBViolation(
                            id=violation.get("id"),
                            vehicle_number=violation.get("vehicle_number", "UNKNOWN"),
                            vehicle_type=violation.get("vehicle_type", "other"),
                            violation_type=violation.get("violation_type", "other"),
                            severity=violation.get("severity", "low"),
                            confidence=violation.get("confidence", 0.0),
                            location=violation.get("location", "Unknown"),
                            timestamp=violation.get("timestamp"),
                            status=violation.get("status", "pending"),
                        )
                        db.add(db_violation)
                    db.commit()
                except Exception as db_error:
                    db.rollback()
                    print(f"Violation persistence failed: {db_error}")

                for violation in violations:
                    if "vehicle_id" not in violation:
                        violation["vehicle_id"] = violation.get("vehicle_number", "UNKNOWN")
                    await websocket.send_json(violation)
                    sent_violations = True

            if not sent_violations:
                print("Primary stream ended without violations; switching to dummy violation stream")
                await _stream_dummy_violations(db)
        except ValueError as stream_error:
            print(f"Primary stream unavailable ({stream_error}); switching to dummy violation stream")
            await _stream_dummy_violations(db)

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        try:
            db.close()
        except Exception:
            pass
        try:
            await websocket.close()
        except Exception:
            pass
