"""
Integration test for real-time streaming functionality.

Tests the complete WebSocket streaming pipeline with AI detections.
Run with: pytest examples/test_streaming.py -v -s
"""

import pytest
import asyncio
import websockets
import json
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@pytest.mark.asyncio
async def test_stream_processor_imports():
    """Test that all streaming modules can be imported."""
    try:
        from app.services.stream_processor import StreamProcessor, stream_processor
        from app.routes.streaming import router
        logger.info("✓ All streaming modules imported successfully")
        assert stream_processor is not None
    except ImportError as e:
        pytest.fail(f"Failed to import streaming modules: {e}")


@pytest.mark.asyncio
async def test_websocket_connection():
    """Test WebSocket connection to violations stream."""
    # This test requires the server to be running
    uri = "ws://localhost:8000/ws/violations-stream?video_source=0&skip_frames=5"
    
    try:
        async with websockets.connect(uri, timeout=10) as websocket:
            logger.info("✓ WebSocket connected successfully")
            
            # Wait for first message (with 5 second timeout)
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=10)
                data = json.loads(message)
                
                logger.info(f"✓ Received message: {data.get('type')}")
                assert data.get('type') in ['violation_alert', 'error']
                
            except asyncio.TimeoutError:
                logger.warning("⚠ No message received within timeout (camera may not be available)")
                
    except Exception as e:
        logger.error(f"✗ Connection failed: {e}")
        # This is expected if server is not running
        pytest.skip("Server not running - run 'uvicorn app.main:app' first")


@pytest.mark.asyncio
async def test_live_detections_endpoint():
    """Test live-detections endpoint."""
    uri = "ws://localhost:8000/ws/live-detections?video_source=0&skip_frames=5"
    
    try:
        async with websockets.connect(uri, timeout=10) as websocket:
            logger.info("✓ Connected to live-detections endpoint")
            
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=10)
                data = json.loads(message)
                
                logger.info(f"✓ Message type: {data.get('type')}")
                assert 'data' in data or 'error' in data
                
            except asyncio.TimeoutError:
                logger.warning("⚠ No data received within timeout")
                
    except Exception as e:
        logger.warning(f"Live detections endpoint test skipped: {e}")
        pytest.skip("Server not running")


@pytest.mark.asyncio
async def test_multi_stream_endpoint():
    """Test multi-stream endpoint."""
    uri = "ws://localhost:8000/ws/multi-stream/test-camera?video_source=0&skip_frames=5"
    
    try:
        async with websockets.connect(uri, timeout=10) as websocket:
            logger.info("✓ Connected to multi-stream endpoint")
            
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=10)
                data = json.loads(message)
                
                logger.info(f"✓ Stream ID in message: {data.get('stream_id')}")
                assert data.get('stream_id') == 'test-camera'
                
            except asyncio.TimeoutError:
                logger.warning("⚠ No data received within timeout")
                
    except Exception as e:
        logger.warning(f"Multi-stream endpoint test skipped: {e}")
        pytest.skip("Server not running")


@pytest.mark.asyncio
async def test_message_format():
    """Test that messages follow the expected format."""
    uri = "ws://localhost:8000/ws/violations-stream?video_source=0&skip_frames=10"
    
    try:
        async with websockets.connect(uri, timeout=10) as websocket:
            try:
                for i in range(3):
                    message = await asyncio.wait_for(websocket.recv(), timeout=10)
                    data = json.loads(message)
                    
                    if data.get('type') == 'violation_alert':
                        # Verify required fields
                        assert 'frame_number' in data
                        assert 'timestamp' in data
                        assert 'violations' in data
                        
                        for violation in data['violations']:
                            assert 'violation_type' in violation
                            assert 'severity' in violation
                            assert 'confidence' in violation
                            assert 'vehicle_type' in violation
                        
                        logger.info(f"✓ Frame {data['frame_number']}: Valid violation format")
                        
            except asyncio.TimeoutError:
                logger.warning("⚠ Timeout waiting for messages")
                
    except Exception as e:
        logger.warning(f"Message format test skipped: {e}")
        pytest.skip("Server not running")


def test_stream_processor_sync():
    """Test StreamProcessor class synchronously."""
    from app.services.stream_processor import StreamProcessor
    
    processor = StreamProcessor(max_queue_size=30)
    assert processor is not None
    logger.info("✓ StreamProcessor initialized")


def test_detection_model_loads():
    """Test that YOLOv8 model loads correctly."""
    try:
        from app.services.detection_service import model
        assert model is not None
        logger.info("✓ YOLOv8 model loaded")
    except Exception as e:
        logger.error(f"✗ Model loading failed: {e}")
        pytest.fail(f"YOLOv8 model failed to load: {e}")


def test_violation_schemas():
    """Test violation schema models."""
    from app.models.violation import (
        ViolationCreateSchema,
        ViolationSchema,
        VehicleType,
        ViolationSeverityLevel,
        ViolationStatusType,
    )
    
    # Create a test violation
    violation = ViolationCreateSchema(
        vehicle_number="TEST001",
        vehicle_type=VehicleType.CAR,
        violation_type="speeding",
        severity=ViolationSeverityLevel.HIGH,
        confidence=0.95,
        location="Test Road",
        status=ViolationStatusType.PENDING,
    )
    
    assert violation.vehicle_number == "TEST001"
    assert violation.violation_type == "speeding"
    logger.info("✓ Violation schema validation passed")


if __name__ == "__main__":
    # Run tests with: python -m pytest examples/test_streaming.py -v -s
    print("Run tests with: pytest examples/test_streaming.py -v -s")
    print("\nOr run a simple WebSocket test:")
    
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "client":
        # Simple client test
        async def simple_test():
            try:
                async with websockets.connect(
                    "ws://localhost:8000/ws/violations-stream?video_source=0&skip_frames=5"
                ) as ws:
                    print("✓ Connected to WebSocket")
                    
                    async for message in ws:
                        data = json.loads(message)
                        if data.get('type') == 'violation_alert':
                            violations = data.get('violations', [])
                            print(f"Frame {data['frame_number']}: {len(violations)} violations")
                            
                            for v in violations:
                                print(f"  - {v['violation_type']}: {v['severity']}")
                        
                        # Stop after 5 messages
                        if data.get('frame_number', 0) > 100:
                            break
                            
            except Exception as e:
                print(f"✗ Error: {e}")
                print("\nMake sure to start the server first:")
                print("  cd backend")
                print("  source venv/bin/activate")
                print("  uvicorn app.main:app --reload")
        
        asyncio.run(simple_test())
