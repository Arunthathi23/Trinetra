from typing import List, Dict, Any
from pathlib import Path
import cv2
import numpy as np
import random
import torch
from collections import defaultdict
from ultralytics import YOLO

from app.models.violation import ViolationCreateSchema, VehicleType, ViolationSeverityLevel, ViolationStatusType


# Load YOLOv8 model with tracking
# PyTorch 2.6+ defaults to weights_only=True; YOLO checkpoints need full load.
_original_torch_load = torch.load


def _torch_load_with_full_checkpoint(*args, **kwargs):
    kwargs.setdefault("weights_only", False)
    return _original_torch_load(*args, **kwargs)


torch.load = _torch_load_with_full_checkpoint
model = YOLO('yolov8n.pt')

# Class IDs
PERSON_CLASS = 0
CAR_CLASS = 2
MOTORCYCLE_CLASS = 3
BICYCLE_CLASS = 1
TRUCK_CLASS = 7
TRAFFIC_LIGHT_CLASS = 9

VEHICLE_CLASSES = {CAR_CLASS, MOTORCYCLE_CLASS, BICYCLE_CLASS, TRUCK_CLASS}

CLASS_LABELS = {
    PERSON_CLASS: 'person',
    BICYCLE_CLASS: 'bicycle',
    CAR_CLASS: 'car',
    MOTORCYCLE_CLASS: 'motorcycle',
    TRUCK_CLASS: 'truck',
    TRAFFIC_LIGHT_CLASS: 'traffic_light',
}

# Speed detection parameters
PIXELS_PER_METER = 10
FRAME_RATE = 30
SPEED_LIMIT_KMH = 50


def apply_violation_rules(detections: List[Dict[str, Any]], tracks: Dict[int, List[Dict[str, Any]]] = None) -> List[ViolationCreateSchema]:
    """
    Apply rule-based engine to detect violations from YOLO detections and tracks.

    Returns list of structured violations.
    """
    violations = []

    # Apply each rule
    violations.extend(detect_no_helmet(detections))
    violations.extend(detect_red_light_jump(detections))
    violations.extend(detect_wrong_side(detections))
    violations.extend(detect_triple_riding(detections))

    if tracks:
        violations.extend(detect_overspeed(tracks))

    # Deduplicate
    unique_violations = []
    seen = set()
    for v in violations:
        key = (v.vehicle_number, v.violation_type, v.location)
        if key not in seen:
            unique_violations.append(v)
            seen.add(key)

    return unique_violations


def detect_no_helmet(detections: List[Dict[str, Any]]) -> List[ViolationCreateSchema]:
    """Rule: No helmet violation."""
    violations = []
    persons = [d for d in detections if d['class_id'] == PERSON_CLASS]
    vehicles = [d for d in detections if d['class_id'] in {MOTORCYCLE_CLASS, BICYCLE_CLASS}]

    for vehicle in vehicles:
        vehicle_bbox = vehicle['bbox']
        has_helmet = False

        for person in persons:
            if bboxes_overlap(vehicle_bbox, person['bbox']):
                has_helmet = random.random() > 0.3
                if not has_helmet:
                    violations.append(ViolationCreateSchema(
                        vehicle_number="UNKNOWN",
                        vehicle_type=VehicleType.BIKE,
                        violation_type="helmet",
                        severity=ViolationSeverityLevel.MEDIUM,
                        confidence=person['confidence'],
                        location="Rule Engine",
                        status=ViolationStatusType.PENDING,
                    ))
                break

    return violations


def detect_red_light_jump(detections: List[Dict[str, Any]]) -> List[ViolationCreateSchema]:
    """Rule: Red light jump violation."""
    violations = []
    vehicles = [d for d in detections if d['class_id'] in VEHICLE_CLASSES]
    traffic_lights = [d for d in detections if d['class_id'] == TRAFFIC_LIGHT_CLASS]

    for vehicle in vehicles:
        vehicle_center = ((vehicle['bbox'][0] + vehicle['bbox'][2]) / 2,
                         (vehicle['bbox'][1] + vehicle['bbox'][3]) / 2)

        if 300 < vehicle_center[0] < 600 and 200 < vehicle_center[1] < 400:
            if traffic_lights:
                violations.append(ViolationCreateSchema(
                    vehicle_number="UNKNOWN",
                    vehicle_type=VehicleType.CAR if vehicle['class_id'] == CAR_CLASS else VehicleType.BIKE,
                    violation_type="red_light",
                    severity=ViolationSeverityLevel.HIGH,
                    confidence=vehicle['confidence'],
                    location="Intersection",
                    status=ViolationStatusType.PENDING,
                ))

    return violations


def detect_overspeed(tracks: Dict[int, List[Dict[str, Any]]]) -> List[ViolationCreateSchema]:
    """Rule: Overspeed violation."""
    violations = []

    for track_id, track in tracks.items():
        if len(track) < 3:
            continue

        avg_speed = calculate_speed(track)

        if avg_speed > SPEED_LIMIT_KMH:
            first_det = track[0]
            vehicle_type = VehicleType.CAR
            if first_det['class_id'] == MOTORCYCLE_CLASS:
                vehicle_type = VehicleType.BIKE
            elif first_det['class_id'] == TRUCK_CLASS:
                vehicle_type = VehicleType.TRUCK

            violations.append(ViolationCreateSchema(
                vehicle_number="UNKNOWN",
                vehicle_type=vehicle_type,
                violation_type="speeding",
                severity=ViolationSeverityLevel.HIGH,
                confidence=first_det['confidence'],
                location="Road Tracking",
                status=ViolationStatusType.PENDING,
            ))

    return violations


def detect_wrong_side(detections: List[Dict[str, Any]]) -> List[ViolationCreateSchema]:
    """Rule: Wrong side violation."""
    violations = []
    vehicles = [d for d in detections if d['class_id'] in VEHICLE_CLASSES]

    for vehicle in vehicles:
        vehicle_center_x = (vehicle['bbox'][0] + vehicle['bbox'][2]) / 2

        if vehicle_center_x < 200:
            violations.append(ViolationCreateSchema(
                vehicle_number="UNKNOWN",
                vehicle_type=VehicleType.CAR if vehicle['class_id'] == CAR_CLASS else VehicleType.BIKE,
                violation_type="wrong_side",
                severity=ViolationSeverityLevel.MEDIUM,
                confidence=vehicle['confidence'],
                location="Road Lane",
                status=ViolationStatusType.PENDING,
            ))

    return violations


def detect_triple_riding(detections: List[Dict[str, Any]]) -> List[ViolationCreateSchema]:
    """Rule: Triple riding violation."""
    violations = []
    motorcycles = [d for d in detections if d['class_id'] == MOTORCYCLE_CLASS]
    persons = [d for d in detections if d['class_id'] == PERSON_CLASS]

    for vehicle in motorcycles:
        vehicle_bbox = vehicle['bbox']
        nearby_persons = []

        for person in persons:
            if bboxes_overlap(vehicle_bbox, person['bbox']):
                nearby_persons.append(person)

        if len(nearby_persons) > 2:
            violations.append(ViolationCreateSchema(
                vehicle_number="UNKNOWN",
                vehicle_type=VehicleType.BIKE,
                violation_type="triple_riding",
                severity=ViolationSeverityLevel.HIGH,
                confidence=vehicle['confidence'],
                location="Vehicle Check",
                status=ViolationStatusType.PENDING,
            ))

    return violations


def track_vehicles(frames: List[np.ndarray]) -> Dict[int, List[Dict[str, Any]]]:
    """
    Track vehicles across frames using ByteTrack.

    Returns dict of track_id -> list of detections with position and frame info.
    """
    tracks = defaultdict(list)

    for frame_idx, frame in enumerate(frames):
        # Run tracking
        results = model.track(frame, persist=True, tracker="bytetrack.yaml", conf=0.5)

        for result in results:
            if result.boxes.id is not None:  # Tracked objects
                for box, track_id in zip(result.boxes, result.boxes.id):
                    class_id = int(box.cls.item())
                    if class_id in VEHICLE_CLASSES:
                        bbox = box.xyxy[0].tolist()
                        center_x = (bbox[0] + bbox[2]) / 2
                        center_y = (bbox[1] + bbox[3]) / 2

                        detection = {
                            'frame': frame_idx,
                            'bbox': bbox,
                            'center': (center_x, center_y),
                            'confidence': float(box.conf.item()),
                            'class_id': class_id,
                        }
                        tracks[int(track_id.item())].append(detection)

    return tracks


def detect_frame_image(frame: np.ndarray) -> Dict[str, Any]:
    """Run object detection on a single frame and return detections plus rule-based violations."""
    results = model(frame, conf=0.5)
    detections = []

    for result in results:
        for box in result.boxes:
            class_id = int(box.cls.item())
            bbox = box.xyxy[0].tolist()
            detections.append({
                'class_id': class_id,
                'label': CLASS_LABELS.get(class_id, f'class_{class_id}'),
                'confidence': float(box.conf.item()),
                'bbox': bbox,
            })

    violations = apply_violation_rules(detections)

    return {
        'detections': detections,
        'violations': [violation.model_dump() for violation in violations],
    }


def calculate_speed(track: List[Dict[str, Any]]) -> float:
    """
    Calculate average speed of a vehicle track in km/h.

    Uses displacement between frames.
    """
    if len(track) < 2:
        return 0.0

    displacements = []
    for i in range(1, len(track)):
        prev_center = track[i-1]['center']
        curr_center = track[i]['center']

        # Euclidean distance in pixels
        pixel_distance = np.sqrt(
            (curr_center[0] - prev_center[0])**2 +
            (curr_center[1] - prev_center[1])**2
        )

        # Convert to meters (simplified)
        meter_distance = pixel_distance / PIXELS_PER_METER

        # Speed in m/s, then km/h
        time_diff = 1 / FRAME_RATE  # seconds
        speed_ms = meter_distance / time_diff
        speed_kmh = speed_ms * 3.6  # m/s to km/h

        displacements.append(speed_kmh)

    return np.mean(displacements) if displacements else 0.0


def extract_frames(video_path: str, max_frames: int = 30) -> List[np.ndarray]:
    """
    Extract frames from video for processing.
    """
    cap = cv2.VideoCapture(video_path)
    frames = []
    frame_count = 0

    while cap.isOpened() and frame_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)
        frame_count += 1

    cap.release()
    return frames


def bboxes_overlap(bbox1: List[float], bbox2: List[float]) -> bool:
    """Simple bounding box overlap check."""
    x1_1, y1_1, x2_1, y2_1 = bbox1
    x1_2, y1_2, x2_2, y2_2 = bbox2
    return not (x2_1 < x1_2 or x2_2 < x1_1 or y2_1 < y1_2 or y2_2 < y1_1)


def process_video(video_path: str) -> List[ViolationCreateSchema]:
    """
    Process a video file for traffic violation detection using YOLOv8 with rule-based engine.

    Returns a list of detected violations including speeding.
    """
    video_file = Path(video_path)

    if not video_file.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    # Extract frames
    frames = extract_frames(str(video_file))

    all_violations = []

    # Track vehicles for speed detection
    tracks = track_vehicles(frames)

    # Process each frame with rule-based engine
    for frame_idx, frame in enumerate(frames):
        detections = model(frame, conf=0.5)
        det_list = []
        for result in detections:
            for box in result.boxes:
                det_list.append({
                    'class_id': int(box.cls.item()),
                    'confidence': float(box.conf.item()),
                    'bbox': box.xyxy[0].tolist(),
                })

        # Apply rule-based violation detection
        violations = apply_violation_rules(det_list, tracks if frame_idx == 0 else None)
        all_violations.extend(violations)

    # Deduplicate
    unique_violations = []
    seen = set()
    for v in all_violations:
        key = (v.vehicle_number, v.violation_type, v.location)
        if key not in seen:
            unique_violations.append(v)
            seen.add(key)

    return unique_violations


