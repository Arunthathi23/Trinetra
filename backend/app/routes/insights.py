from fastapi import APIRouter

from app.models.models import APIResponse, HotspotAnalysis, PredictionData
from app.services.ai_service import (
    analyze_hotspots,
    analyze_traffic_patterns,
    generate_insights,
    generate_predictions,
)

router = APIRouter()


@router.get("", response_model=APIResponse, tags=["Insights"])
def get_insights():
    """Return dummy analytics summary for traffic violations."""
    insights = generate_insights()
    return APIResponse(success=True, message="Insights summary generated.", data=insights)


@router.get("/predictions", response_model=APIResponse, tags=["Insights"])
def get_predictions():
    """Return traffic violation predictions for strategic planning."""
    predictions = generate_predictions()
    return APIResponse(success=True, message="Predictions generated.", data=predictions)


@router.get("/hotspots", response_model=APIResponse, tags=["Insights"])
def get_hotspots():
    """Return identified traffic hotspots."""
    hotspots = analyze_hotspots()
    return APIResponse(success=True, message="Hotspot analysis complete.", data=hotspots)


@router.post("/analyze", response_model=APIResponse, tags=["Insights"])
def analyze_traffic():
    """Analyze current traffic patterns and return insights."""
    analysis = analyze_traffic_patterns()
    return APIResponse(success=True, message="Traffic analysis complete.", data=analysis)
