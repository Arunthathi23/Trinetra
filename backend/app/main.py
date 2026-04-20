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
    video_source: str = Query("0"),
    skip_frames: int = Query(2),
):
    """
    Stream live YOLO-based violation detections over WebSocket.

    This endpoint replaces the legacy dummy generator and persists detected violations to the database.
    """
    await websocket.accept()

    try:
        try:
            video_source_val = int(video_source)
        except ValueError:
            video_source_val = video_source

        db = SessionLocal()
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
                await websocket.send_json(violation)

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
