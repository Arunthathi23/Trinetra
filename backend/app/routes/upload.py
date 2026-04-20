import mimetypes
from pathlib import Path
from uuid import uuid4

import cv2
import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile, status, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.services.detection_service import detect_frame_image, process_video

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/x-matroska",
    "video/x-msvideo",
    "video/webm",
}

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
}


def _is_allowed_video(file: UploadFile) -> bool:
    content_type = file.content_type
    extension = Path(file.filename).suffix.lower()
    return content_type in ALLOWED_VIDEO_TYPES and extension in ALLOWED_EXTENSIONS


@router.post("/upload-video", tags=["Upload"])
async def upload_video(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Accept a video upload, validate its type, save it, and process for violations."""
    if not _is_allowed_video(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported video type. Allowed formats: mp4, mov, mkv, avi, webm.",
        )

    safe_name = Path(file.filename).name
    destination_name = f"{uuid4().hex}_{safe_name}"
    destination_path = UPLOAD_DIR / destination_name

    content = await file.read()
    destination_path.write_bytes(content)

    # Process video for violations
    try:
        violations = process_video(str(destination_path))
        # Save violations to database
        for violation in violations:
            from app.models.database import DBViolation
            db_violation = DBViolation(
                id=str(uuid4()),
                vehicle_number=violation.vehicle_number,
                vehicle_type=violation.vehicle_type,
                violation_type=violation.violation_type,
                severity=violation.severity,
                confidence=violation.confidence,
                location=violation.location,
                timestamp=violation.timestamp,
                status=violation.status,
            )
            db.add(db_violation)
        db.commit()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video processing failed: {str(e)}",
        )

    return {
        "filename": destination_name,
        "status": "uploaded_and_processed",
        "violations_detected": len(violations),
    }


def _decode_image_bytes(data: bytes) -> np.ndarray:
    array = np.frombuffer(data, np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode image frame.")
    return image


@router.post("/detect-frame", tags=["Upload"])
async def detect_frame(frame: UploadFile = File(...)):
    if frame.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported frame type. Allowed formats: jpg, jpeg, png.",
        )

    frame_data = await frame.read()
    try:
        image_frame = _decode_image_bytes(frame_data)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )

    try:
        detection_payload = detect_frame_image(image_frame)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Frame detection failed: {str(error)}",
        )

    return detection_payload


class DetectVideoRequest(BaseModel):
    filename: str


@router.post("/detect-video", tags=["Upload"])
async def detect_video(request: DetectVideoRequest):
    safe_name = Path(request.filename).name
    destination_path = UPLOAD_DIR / safe_name

    if not destination_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded video not found.",
        )

    try:
        violations = process_video(str(destination_path))
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video detection failed: {str(error)}",
        )

    return {
        "filename": safe_name,
        "status": "detected",
        "violations": [violation.model_dump() for violation in violations],
    }
