from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
from datetime import datetime
from typing import List, Dict, Any

app = FastAPI(title="TRINETRA Mock Backend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock data
mock_violations = [
    {
        "id": 1,
        "vehicle_number": "TR-0123",
        "violation_type": "Speeding",
        "location": "Highway 4, Lane 2",
        "severity": "High",
        "timestamp": "2026-04-07T14:23:45Z",
        "status": "Open",
        "confidence": 0.94,
        "location_lat": 12.9716,
        "location_lng": 77.5946
    },
    {
        "id": 2,
        "vehicle_number": "VG-4911",
        "violation_type": "Illegal Stop",
        "location": "Main Street Intersection",
        "severity": "Medium",
        "timestamp": "2026-04-07T16:45:12Z",
        "status": "Open",
        "confidence": 0.87,
        "location_lat": 12.9720,
        "location_lng": 77.5950
    }
]

mock_insights = {
    "total_violations": 42,
    "repeat_offenders": [
        {"vehicle": "TR-0123", "count": 3},
        {"vehicle": "VG-4911", "count": 2}
    ]
}

# WebSocket connections for real-time updates
active_connections = []

@app.get("/")
def root():
    return {"message": "TRINETRA Mock Backend is running"}

@app.get("/violations")
def get_violations():
    return mock_violations

@app.get("/insights")
def get_insights():
    return {"data": mock_insights}

@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    # Simulate processing time
    await asyncio.sleep(1)

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Mock successful upload
    return {
        "filename": file.filename,
        "message": "Video uploaded successfully",
        "status": "uploaded"
    }

@app.post("/detect-video")
async def detect_video(data: Dict[str, Any]):
    filename = data.get("filename")
    if not filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Simulate processing time
    await asyncio.sleep(2)

    # Mock detection results
    return {
        "filename": filename,
        "status": "processing_complete",
        "violations": mock_violations,
        "total_frames": 150,
        "processing_time": 2.5
    }

@app.post("/detect-frame")
async def detect_frame(file: UploadFile = File(...)):
    # Simulate processing time
    await asyncio.sleep(0.5)

    # Mock frame detection results
    return {
        "detections": [
            {
                "class_id": 1,
                "label": "car",
                "confidence": 0.95,
                "bbox": [100, 150, 200, 180]
            }
        ],
        "violations": [
            {
                "id": len(mock_violations) + 1,
                "vehicle_number": "Unknown",
                "violation_type": "Test Violation",
                "location": "Camera View",
                "severity": "Low",
                "timestamp": datetime.now().isoformat(),
                "status": "Active",
                "confidence": 0.8
            }
        ]
    }

# WebSocket endpoint for real-time violations
@app.websocket("/ws/violations")
async def websocket_endpoint(websocket):
    await websocket.accept()
    active_connections.append(websocket)

    try:
        # Send initial data
        await websocket.send_json({
            "type": "initial_data",
            "violations": mock_violations[:2]  # Send first 2 violations
        })

        # Simulate real-time updates every 10 seconds
        while True:
            await asyncio.sleep(10)
            new_violation = {
                "id": len(mock_violations) + 1,
                "vehicle_number": f"TEST-{len(mock_violations) + 1:04d}",
                "violation_type": "Speeding",
                "location": f"Location {len(mock_violations) + 1}",
                "severity": "Medium",
                "timestamp": datetime.now().isoformat(),
                "status": "Active",
                "confidence": 0.85,
                "location_lat": 12.9716 + (len(mock_violations) * 0.001),
                "location_lng": 77.5946 + (len(mock_violations) * 0.001)
            }
            mock_violations.append(new_violation)

            await websocket.send_json({
                "type": "new_violation",
                "violation": new_violation
            })

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)