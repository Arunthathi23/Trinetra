# Real-time AI Detection Streaming - Quick Start Guide

## 🚀 Quick Start (5 Minutes)

### 1. Start the Backend Server

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
Uvicorn running on http://0.0.0.0:8000
Press CTRL+C to quit
```

### 2. Test the Endpoint (Browser)

Open any WebSocket testing tool or terminal:

#### Option A: Test with wscat (Node.js)
```bash
npm install -g wscat
wscat -c "ws://localhost:8000/ws/violations-stream?video_source=0&skip_frames=2"
```

#### Option B: Test with websocat (Rust)
```bash
websocat "ws://localhost:8000/ws/violations-stream?video_source=0&skip_frames=2"
```

#### Option C: Python test script
```python
import asyncio
import websockets
import json

async def test():
    uri = "ws://localhost:8000/ws/violations-stream?video_source=0&skip_frames=2"
    async with websockets.connect(uri) as websocket:
        print("✓ Connected!")
        async for message in websocket:
            data = json.loads(message)
            print(f"Frame {data['frame_number']}: {len(data['violations'])} violations")

asyncio.run(test())
```

### 3. Available Endpoints

#### Live Detections (All Frames)
```
ws://localhost:8000/ws/live-detections?video_source=0&skip_frames=2
```
Streams every detection on every frame

#### Violations Only (Optimized)
```
ws://localhost:8000/ws/violations-stream?video_source=0&skip_frames=2
```
⭐ **Recommended** - Only streams frames with violations

#### Multi-Stream (Multiple Cameras)
```
ws://localhost:8000/ws/multi-stream/camera-1?video_source=0&skip_frames=2
ws://localhost:8000/ws/multi-stream/camera-2?video_source=1&skip_frames=2
```
Independent stream management

---

## 📺 Video Source Examples

### Webcam (Default)
```
video_source=0          # Primary camera
video_source=1          # Secondary camera
video_source=2          # Tertiary camera
```

### Video File
```
video_source=/path/to/video.mp4
video_source=C:\\Videos\\traffic.mp4     # Windows absolute path
video_source=./videos/traffic_sample.mp4 # Relative path
```

### IP Camera (RTSP)
```
video_source=rtsp://192.168.1.100:554/stream
video_source=http://192.168.1.100:8080/video
```

---

## ⚙️ Performance Tuning

### For High-Performance Real-time (Good Hardware)
```
skip_frames=1           # Every frame, ~30 FPS, High CPU/GPU
```

### For Balanced Real-time (Recommended)
```
skip_frames=2           # Every 2nd frame, ~15 FPS, Medium load ✅
```

### For Low-Resource Devices
```
skip_frames=3           # Every 3rd frame, ~10 FPS, Low load
skip_frames=5           # Every 5th frame, ~6 FPS, Very low load
```

---

## 🎯 Frontend Integration

### React Component Usage

```jsx
import ViolationMonitor from './components/ViolationMonitor';

function App() {
  return (
    <ViolationMonitor 
      videoSource="0"           // Camera index or file path
      skipFrames={2}            // Process every nth frame
      monitorType="violations"  // 'violations', 'detections', 'all'
    />
  );
}

export default App;
```

### Using with Custom Hook

```jsx
function useRealTimeDetections(videoSource = '0', skipFrames = 2) {
  const [violations, setViolations] = useState([]);
  const [frameCount, setFrameCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const url = new URL('ws://localhost:8000/ws/violations-stream');
    url.searchParams.append('video_source', videoSource);
    url.searchParams.append('skip_frames', skipFrames);

    const ws = new WebSocket(url);
    
    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (e) => {
      const { frame_number, violations: v } = JSON.parse(e.data).data;
      setFrameCount(frame_number);
      setViolations(v);
    };
    ws.onclose = () => setIsConnected(false);

    return () => ws.close();
  }, [videoSource, skipFrames]);

  return { violations, frameCount, isConnected };
}
```

---

## 📊 Response Format

### Violation Alert Message
```json
{
  "type": "violation_alert",
  "frame_number": 42,
  "timestamp": "2026-04-08T12:34:56.789Z",
  "detections_count": 5,
  "violations": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "vehicle_number": "UNKNOWN",
      "vehicle_type": "bike",
      "violation_type": "helmet",
      "severity": "medium",
      "confidence": 0.87,
      "location": "Rule Engine",
      "timestamp": "2026-04-08T12:34:56.789Z",
      "status": "pending"
    }
  ]
}
```

### Detection Frame Message (live-detections only)
```json
{
  "type": "detection_frame",
  "data": {
    "frame_number": 42,
    "timestamp": "2026-04-08T12:34:56.789Z",
    "fps": 30.0,
    "detections": [
      {
        "class_id": 2,
        "class_name": "car",
        "confidence": 0.92,
        "bbox": [150.5, 200.3, 450.2, 500.1]
      }
    ],
    "violations": [/* same as above */]
  }
}
```

---

## 🔍 Violation Types Reference

| Type | Severity | Requires |
|------|----------|----------|
| `helmet` | MEDIUM | Person detection on motorcycle |
| `speeding` | HIGH | Vehicle tracking across frames |
| `red_light` | HIGH | Traffic light detection |
| `wrong_side` | MEDIUM | Lane detection |
| `triple_riding` | HIGH | Multiple person detection on motorcycle |

---

## 🛠️ Troubleshooting

### "Cannot open video source"
- **Webcam**: Ensure camera is connected and not used by another app
- **Video file**: Check file path exists and format is supported
- **IP Camera**: Verify network connectivity and RTSP URL

### "Connection refused"
- Check FastAPI server is running
- Verify port 8000 is not blocked by firewall
- Try `http://localhost:8000/docs` in browser to test API

### "High latency / slow processing"
- Increase `skip_frames` value
- Reduce video resolution (if using video file)
- Check system resources: `nvidia-smi` (GPU) or `top` (CPU)

### "No violations detected"
- Stream is working but no violations in current frame
- Check camera view includes traffic scenarios
- Try different `skip_frames` value
- Monitor "Detections" count to verify objects are detected

### "WebSocket keeps disconnecting"
- Implement auto-reconnect logic
- Check network stability
- Try with lower `skip_frames` to reduce CPU load

---

## 📈 Performance Metrics

### Example System (NVIDIA RTX 3060)

| Config | FPS | Latency | GPU | CPU |
|--------|-----|---------|-----|-----|
| skip_frames=1, 1080p | 28 | 35ms | 72% | 45% |
| skip_frames=2, 1080p | 15 | 65ms | 38% | 25% |
| skip_frames=3, 720p | 10 | 100ms | 22% | 15% |

---

## 🔄 Auto-Reconnect Example (JavaScript)

```javascript
function connectWithRetry(url, maxRetries = 5) {
  let retries = 0;

  function connect() {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('✓ Connected');
      retries = 0; // Reset on successful connection

      ws.onmessage = (e) => {
        const message = JSON.parse(e.data);
        handleViolation(message);
      };

      ws.onerror = () => {
        console.error('WebSocket error');
        scheduleReconnect();
      };

      ws.onclose = () => {
        console.log('Connection closed');
        scheduleReconnect();
      };
    };

    return ws;
  }

  function scheduleReconnect() {
    if (retries < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retries), 30000);
      console.log(`Reconnecting in ${delay}ms... (attempt ${retries + 1}/${maxRetries})`);
      
      retries++;
      setTimeout(connect, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  return connect();
}

// Usage
const ws = connectWithRetry('ws://localhost:8000/ws/violations-stream?video_source=0');
```

---

## 📚 Advanced Configuration

### Custom Detection Thresholds
Edit `app/services/detection_service.py`:
```python
SPEED_LIMIT_KMH = 50  # Adjust speed threshold
```

### Frame Quality Settings
Edit `app/services/stream_processor.py`:
```python
max(h, w) > 1280  # Resize threshold for inference
```

### Processing Queue Size
```python
StreamProcessor(max_queue_size=30)  # Default buffer size
```

---

## 🎓 Next Steps

1. ✅ Start the server
2. ✅ Test WebSocket connection
3. ✅ Integrate into frontend
4. ✅ Configure video sources
5. ✅ Tune performance for your hardware
6. ✅ Deploy to production

See [STREAMING.md](./STREAMING.md) for complete API documentation.
