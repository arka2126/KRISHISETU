from typing import Optional

from pydantic import BaseModel, Field


class TrainRequest(BaseModel):
    commodity: str = Field(..., examples=["Tomato"])
    market: str = Field(..., examples=["Vashi APMC"])
    history_days: int = Field(365, ge=60, le=1825)


class PredictPriceRequest(BaseModel):
    commodity: str
    market: str
    horizon_days: int = Field(1, ge=1, le=3)


class ForecastRequest(BaseModel):
    commodity: str
    market: str
    horizon_days: int = Field(7, ge=1, le=60)
    history_days: int = Field(180, ge=60, le=1825)


class TrendAnalysisRequest(BaseModel):
    commodity: str
    market: str
    window_days: int = Field(14, ge=5, le=90)
    history_days: int = Field(180, ge=30, le=1825)


class AnomalyDetectionRequest(BaseModel):
    commodity: str
    market: str
    history_days: int = Field(180, ge=30, le=1825)
    z_threshold: float = Field(2.5, ge=1.0, le=5.0)


class MarketComparisonRequest(BaseModel):
    commodity: str
    markets: Optional[list[str]] = None
    history_days: int = Field(120, ge=30, le=1825)


class DemandSupplyRequest(BaseModel):
    commodity: str
    market: str
    history_days: int = Field(120, ge=30, le=1825)


class RecommendationRequest(BaseModel):
    commodity: str
    markets: Optional[list[str]] = None


class MarketInsightsRequest(BaseModel):
    commodity: str
    market: str
