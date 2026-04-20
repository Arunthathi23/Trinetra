# TRINETRA Backend API

A FastAPI backend service for the TRINETRA traffic violation detection, monitoring, and analytics system.

## Features

- FastAPI application with modular route structure
- CORS configured for React frontend integration at `http://localhost:5173`
- WebSocket endpoint for streaming live violation alerts
- Pydantic models for request and response validation
- Mock persistence layer with JSON-based storage for rapid prototyping
- Ready for incremental database and AI model integration

## Project Structure

```
backend/
├── app/
│   ├── main.py
│   ├── __init__.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py
│   ├── routes/
│   │   ├── insights.py
│   │   ├── monitoring.py
│   │   ├── status.py
│   │   └── violations.py
│   ├── services/
│   │   ├── ai_service.py
│   │   └── database_service.py
│   └── data/
│       └── .gitkeep
├── requirements.txt
├── .gitignore
└── README.md
```

## Running Locally

1. Create and activate a Python virtual environment:

```bash
python -m venv venv
venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Start the server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

4. Visit the API docs:

- http://localhost:8000/docs
- http://localhost:8000/redoc

## Endpoints

- `GET /` - Root system status
- `GET /status` - System status
- `GET /health` - Health check
- `GET /violations` - List violations
- `POST /violations` - Create a violation
- `GET /violations/{id}` - Get a violation
- `PUT /violations/{id}` - Update a violation
- `DELETE /violations/{id}` - Delete a violation
- `GET /monitoring/cameras` - List cameras
- `GET /monitoring/stats` - Monitoring stats
- `GET /insights/predictions` - Insights predictions
- `GET /insights/hotspots` - Hotspot analytics
- `POST /insights/analyze` - Traffic pattern analysis
- `WebSocket /ws/violations` - Live violation alerts

## Notes

This backend is a prototype foundation. For production, integrate a real database, authentication, logging, and AI inference pipelines.
