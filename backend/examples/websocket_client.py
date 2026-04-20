"""
WebSocket Client Examples for Real-time AI Detection Streaming

This module demonstrates how to connect to and use the TRINETRA real-time
detection streaming endpoints.
"""

import asyncio
import websockets
import json
from datetime import datetime
from typing import Optional


class TrinletraStreamingClient:
    """Client for connecting to TRINETRA real-time detection streams."""

    def __init__(self, base_url: str = "ws://localhost:8000"):
        """
        Initialize the streaming client.

        Args:
            base_url: Base WebSocket URL (default: localhost)
        """
        self.base_url = base_url
        self.websocket = None

    async def connect_live_detections(
        self,
        video_source: str = "0",
        skip_frames: int = 2,
    ):
        """
        Connect to the live detections stream endpoint.

        Receives all detections for every processed frame.

        Args:
            video_source: Video file path or camera index (default: 0 for webcam)
            skip_frames: Process every nth frame (default: 2)

        Yields:
            Detection data containing frame info, detections, and violations
        """
        url = f"{self.base_url}/ws/live-detections?video_source={video_source}&skip_frames={skip_frames}"

        async with websockets.connect(url) as websocket:
            self.websocket = websocket
            try:
                while True:
                    data = await websocket.recv()
                    message = json.loads(data)
                    yield message
            except websockets.exceptions.ConnectionClosed:
                print("Connection closed")

    async def connect_violations_stream(
        self,
        video_source: str = "0",
        skip_frames: int = 2,
    ):
        """
        Connect to the violations-only stream endpoint.

        Only receives frames where violations are detected (reduced bandwidth).

        Args:
            video_source: Video file path or camera index
            skip_frames: Process every nth frame

        Yields:
            Violation alert messages with detected violations
        """
        url = f"{self.base_url}/ws/violations-stream?video_source={video_source}&skip_frames={skip_frames}"

        async with websockets.connect(url) as websocket:
            self.websocket = websocket
            try:
                while True:
                    data = await websocket.recv()
                    message = json.loads(data)
                    yield message
            except websockets.exceptions.ConnectionClosed:
                print("Connection closed")

    async def connect_multi_stream(
        self,
        stream_id: str,
        video_source: str = "0",
        skip_frames: int = 2,
    ):
        """
        Connect to a multi-stream endpoint with unique ID tracking.

        Allows managing multiple independent streams.

        Args:
            stream_id: Unique identifier for this stream
            video_source: Video file path or camera index
            skip_frames: Process every nth frame

        Yields:
            Detection data with stream_id tracking
        """
        url = f"{self.base_url}/ws/multi-stream/{stream_id}?video_source={video_source}&skip_frames={skip_frames}"

        async with websockets.connect(url) as websocket:
            self.websocket = websocket
            try:
                while True:
                    data = await websocket.recv()
                    message = json.loads(data)
                    yield message
            except websockets.exceptions.ConnectionClosed:
                print(f"Stream {stream_id} closed")


# Example: Monitor live detections
async def example_live_detections():
    """Example of monitoring all live detections from webcam."""
    client = TrinletraStreamingClient()

    print("🎥 Streaming live detections from webcam...")
    print("Press Ctrl+C to stop\n")

    frame_count = 0
    violation_count = 0

    try:
        async for message in client.connect_live_detections(video_source="0", skip_frames=2):
            if message["type"] == "detection_frame":
                data = message["data"]
                frame_num = data.get("frame_number")
                detections = data.get("detections", [])
                violations = data.get("violations", [])

                frame_count += 1
                if violations:
                    violation_count += len(violations)

                # Print summary every 30 frames
                if frame_num % 30 == 0:
                    print(f"[Frame {frame_num}] Detections: {len(detections)} | Violations: {len(violations)}")

                    # Print violation details
                    for violation in violations:
                        print(f"  ⚠️  {violation['violation_type'].upper()}: "
                              f"{violation['vehicle_type']} "
                              f"(Confidence: {violation['confidence']:.2%})")

    except KeyboardInterrupt:
        print(f"\n✓ Stopped. Processed {frame_count} frames, detected {violation_count} violations")


# Example: Monitor violations only
async def example_violations_only():
    """Example of monitoring only violations (optimized for bandwidth)."""
    client = TrinletraStreamingClient()

    print("⚠️  Monitoring violations only (filtered stream)...")
    print("Press Ctrl+C to stop\n")

    violation_count = 0

    try:
        async for message in client.connect_violations_stream(video_source="0", skip_frames=2):
            if message["type"] == "violation_alert":
                frame_num = message.get("frame_number")
                violations = message.get("violations", [])
                timestamp = message.get("timestamp")

                violation_count += len(violations)

                print(f"\n🚨 VIOLATION ALERT - Frame {frame_num}")
                print(f"   Time: {timestamp}")
                print(f"   Detections in frame: {message.get('detections_count', 0)}")

                for violation in violations:
                    severity = violation.get("severity", "UNKNOWN")
                    print(f"   - {violation['violation_type'].upper()} ({severity})")
                    print(f"     Vehicle: {violation['vehicle_type']}")
                    print(f"     Confidence: {violation['confidence']:.2%}")

    except KeyboardInterrupt:
        print(f"\n✓ Stopped. Total violations detected: {violation_count}")


# Example: Multi-stream monitoring
async def example_multi_streams():
    """Example of monitoring multiple independent streams."""
    client1 = TrinletraStreamingClient()
    client2 = TrinletraStreamingClient()

    print("📹 Monitoring 2 streams concurrently...\n")

    async def stream_task(client, stream_id, source):
        frame_count = 0
        async for message in client.connect_multi_stream(stream_id, video_source=str(source)):
            if message["type"] == "detection_frame":
                frame_count += 1
                if frame_count % 30 == 0:
                    violations = message["data"].get("violations", [])
                    print(f"Stream {stream_id}: Frame {frame_count}, Violations: {len(violations)}")

    try:
        # Run two streams concurrently
        await asyncio.gather(
            stream_task(client1, "camera-1", "0"),  # Webcam
            stream_task(client2, "camera-2", "video.mp4"),  # Video file
        )
    except KeyboardInterrupt:
        print("\n✓ Stopped multi-stream monitoring")


if __name__ == "__main__":
    # Choose which example to run:
    # asyncio.run(example_live_detections())
    asyncio.run(example_violations_only())
    # asyncio.run(example_multi_streams())
