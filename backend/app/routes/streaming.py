"""
Real-time streaming routes using WebSocket for continuous AI detections.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import asyncio
import json
from typing import Set

from app.models.database import SessionLocal, Violation as DBViolation
from app.services.stream_processor import stream_processor, multi_stream

router = APIRouter()

# Track active connections per stream
active_streams: dict = {}


@router.websocket("/ws/live-detections")
async def websocket_live_detections(
    websocket: WebSocket,
    video_source: str = Query("0"),  # Default to webcam
    skip_frames: int = Query(2),  # Skip frames for performance
):
    """
    WebSocket endpoint for streaming real-time AI detections.

    Query Parameters:
    - video_source: Path to video file or camera index (default: 0 for webcam)
    - skip_frames: Process every nth frame (default: 2)

    Example:
    ws://localhost:8000/ws/live-detections?video_source=0&skip_frames=2
    ws://localhost:8000/ws/live-detections?video_source=path/to/video.mp4&skip_frames=1
    """
    await websocket.accept()

    try:
        # Convert video_source to int if it's a camera index
        try:
            video_source_val = int(video_source)
        except ValueError:
            video_source_val = video_source

        # Stream detections
        async for detection_data in stream_processor.process_video_stream(
            video_source_val,
            skip_frames=skip_frames,
        ):
            try:
                await websocket.send_json({
                    "type": "detection_frame",
                    "data": detection_data,
                })
            except RuntimeError:
                # Client disconnected
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e),
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


@router.websocket("/ws/violations-stream")
async def websocket_violations_stream(
    websocket: WebSocket,
    video_source: str = Query("0"),
    skip_frames: int = Query(2),
):
    """
    WebSocket endpoint for streaming only detected violations.

    Filters out frames with no violations for reduced bandwidth.

    Query Parameters:
    - video_source: Path to video file or camera index (default: 0)
    - skip_frames: Process every nth frame (default: 2)
    """
    await websocket.accept()

    try:
        try:
            video_source_val = int(video_source)
        except ValueError:
            video_source_val = video_source

        async for detection_data in stream_processor.process_video_stream(
            video_source_val,
            skip_frames=skip_frames,
        ):
            # Only send frames with violations
            violations = detection_data.get("violations") or []
            if violations:
                try:
                    db = SessionLocal()
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
                    finally:
                        db.close()
                except Exception as db_open_error:
                    print(f"Database connection failed: {db_open_error}")

                try:
                    await websocket.send_json({
                        "type": "violation_alert",
                        "frame_number": detection_data["frame_number"],
                        "timestamp": detection_data["timestamp"],
                        "violations": violations,
                        "detections_count": len(detection_data.get("detections", [])),
                    })
                except RuntimeError:
                    break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e),
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


@router.websocket("/ws/multi-stream/{stream_id}")
async def websocket_multi_stream(
    stream_id: str,
    websocket: WebSocket,
    video_source: str = Query("0"),
    skip_frames: int = Query(2),
):
    """
    WebSocket endpoint for managing multiple concurrent streams.

    Each stream gets a unique ID for independent tracking.

    Path Parameters:
    - stream_id: Unique identifier for this stream

    Query Parameters:
    - video_source: Path to video file or camera index
    - skip_frames: Process every nth frame
    """
    await websocket.accept()

    try:
        try:
            video_source_val = int(video_source)
        except ValueError:
            video_source_val = video_source

        # Track this connection
        if stream_id not in active_streams:
            active_streams[stream_id] = set()
        active_streams[stream_id].add(id(websocket))

        async for detection_data in multi_stream.start_stream(
            stream_id,
            video_source_val,
            skip_frames=skip_frames,
        ):
            try:
                await websocket.send_json({
                    "type": "detection_frame",
                    "stream_id": stream_id,
                    "data": detection_data,
                })
            except RuntimeError:
                break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({
                "type": "error",
                "stream_id": stream_id,
                "message": str(e),
            })
        except:
            pass
    finally:
        # Cleanup
        if stream_id in active_streams:
            active_streams[stream_id].discard(id(websocket))
            if not active_streams[stream_id]:
                await multi_stream.stop_stream(stream_id)
                del active_streams[stream_id]

        try:
            await websocket.close()
        except:
            pass
