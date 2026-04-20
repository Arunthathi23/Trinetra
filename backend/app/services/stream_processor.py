"""
Real-time video stream processor for continuous violation detection.
Handles frame-by-frame processing and WebSocket broadcasting.
"""

import asyncio
import cv2
import numpy as np
from typing import AsyncGenerator, Optional, Dict, Any, List
from pathlib import Path
from datetime import datetime
from uuid import uuid4

from app.services.detection_service import apply_violation_rules, track_vehicles, model
from app.models.violation import ViolationCreateSchema, ViolationSchema


class StreamProcessor:
    """Process video streams frame-by-frame with real-time AI detection."""

    def __init__(self, max_queue_size: int = 30):
        """
        Initialize stream processor.

        Args:
            max_queue_size: Maximum frames to buffer for smooth streaming
        """
        self.max_queue_size = max_queue_size
        self.frame_queue = asyncio.Queue(maxsize=max_queue_size)
        self.detection_cache = {}
        self.track_state = {}  # Track state across frames

    async def process_video_stream(
        self,
        video_source: str,
        skip_frames: int = 2,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Process video frames continuously and yield detections in real-time.

        Args:
            video_source: Path to video file or camera index (0 for webcam)
            skip_frames: Process every nth frame for performance

        Yields:
            Dictionary containing frame number, detections, and violations
        """
        cap = cv2.VideoCapture(video_source if isinstance(video_source, int) else video_source)

        if not cap.isOpened():
            raise ValueError(f"Cannot open video source: {video_source}")

        frame_count = 0
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_skip_counter = 0

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                frame_skip_counter += 1

                # Skip frames for performance optimization
                if frame_skip_counter < skip_frames:
                    continue

                frame_skip_counter = 0
                frame_count += 1

                # Run detection on frame
                try:
                    detections = self._detect_objects(frame)
                    violations = self._detect_violations(detections, frame_count)

                    # Prepare output
                    output = {
                        "frame_number": frame_count,
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "detections": self._format_detections(detections),
                        "violations": [v.model_dump() for v in violations],
                        "fps": fps,
                    }

                    yield output

                except Exception as e:
                    # Log error but continue processing
                    yield {
                        "frame_number": frame_count,
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "error": str(e),
                    }

                # Yield control to prevent blocking
                await asyncio.sleep(0.001)

        finally:
            cap.release()

    async def process_live_camera(
        self,
        camera_index: int = 0,
        skip_frames: int = 1,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Process live camera feed with continuous detection.

        Args:
            camera_index: Camera device index (0 for default)
            skip_frames: Process every nth frame

        Yields:
            Real-time detection data
        """
        async for data in self.process_video_stream(camera_index, skip_frames):
            yield data

    def _detect_objects(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Run YOLOv8 object detection on frame.

        Returns list of detections with bounding boxes and confidence.
        """
        # Resize frame for faster inference while maintaining aspect ratio
        h, w = frame.shape[:2]
        if max(h, w) > 1280:
            scale = 1280 / max(h, w)
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)))

        results = model(frame, conf=0.5, verbose=False)

        detections = []
        for result in results:
            for box in result.boxes:
                detections.append({
                    'class_id': int(box.cls.item()),
                    'confidence': float(box.conf.item()),
                    'bbox': box.xyxy[0].tolist(),
                    'class_name': model.names.get(int(box.cls.item()), "unknown"),
                })

        return detections

    def _detect_violations(
        self,
        detections: List[Dict[str, Any]],
        frame_num: int,
    ) -> List[ViolationSchema]:
        """
        Apply rule-based engine to detect violations.

        Returns list of violation objects.
        """
        violations = apply_violation_rules(detections, tracks=None)

        # Convert to schema with IDs and timestamps
        violation_schemas = []
        for v in violations:
            violation_schemas.append(
                ViolationSchema(
                    id=str(uuid4()),
                    vehicle_number=v.vehicle_number,
                    vehicle_type=v.vehicle_type,
                    violation_type=v.violation_type,
                    severity=v.severity,
                    confidence=v.confidence,
                    location=v.location,
                    timestamp=datetime.utcnow(),
                    status=v.status,
                )
            )

        return violation_schemas

    def _format_detections(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Format detections for JSON serialization.

        Returns lightweight detection data.
        """
        formatted = []
        for det in detections:
            formatted.append({
                'class_id': det['class_id'],
                'class_name': det.get('class_name', 'unknown'),
                'confidence': round(det['confidence'], 4),
                'bbox': [round(x, 2) for x in det['bbox']],
            })
        return formatted


class MultiStreamProcessor:
    """Manage multiple concurrent video streams."""

    def __init__(self):
        """Initialize multi-stream manager."""
        self.processors: Dict[str, StreamProcessor] = {}
        self.active_streams: Dict[str, asyncio.Task] = {}

    async def start_stream(
        self,
        stream_id: str,
        video_source: str,
        skip_frames: int = 2,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Start processing a video stream.

        Args:
            stream_id: Unique identifier for the stream
            video_source: Path to video file or camera index
            skip_frames: Frame skipping for performance

        Yields:
            Detection data from the stream
        """
        if stream_id not in self.processors:
            self.processors[stream_id] = StreamProcessor()

        processor = self.processors[stream_id]

        async for data in processor.process_video_stream(video_source, skip_frames):
            yield data

    async def stop_stream(self, stream_id: str):
        """Stop processing a stream."""
        if stream_id in self.processors:
            del self.processors[stream_id]
        if stream_id in self.active_streams:
            task = self.active_streams[stream_id]
            task.cancel()
            del self.active_streams[stream_id]


# Global instance for WebSocket use
stream_processor = StreamProcessor()
multi_stream = MultiStreamProcessor()
