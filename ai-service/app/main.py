import logging
import os
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.data.adapters import get_market_adapter, list_known_commodities, list_known_markets
from app.models import price_predictor
from app.models.forecaster import forecast_price
from app.models.trend_anomaly import analyze_trend, detect_anomalies
from app.services.market_intelligence import compare_markets, demand_supply_analysis, generate_recommendation
from app.schemas import (
    AnomalyDetectionRequest,
    DemandSupplyRequest,
    ForecastRequest,
    MarketComparisonRequest,
    MarketInsightsRequest,
    PredictPriceRequest,
    RecommendationRequest,
    TrainRequest,
    TrendAnalysisRequest,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("krishisetu-ai")

APP_START_TIME = time.time()

app = FastAPI(
    title="KrishiSetu AI Market Intelligence Service",
    description=(
        "Price prediction, forecasting, trend/anomaly detection, market comparison "
        "and AI-generated insights for the KrishiSetu marketplace. Data is sourced "
        "from pluggable adapters; until real Agmarknet/e-NAM/weather credentials are "
        "configured (see .env.example), all data is clearly labeled MOCK_DATA."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("NODE_BACKEND_URL", "http://localhost:5000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _handle(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception("Unhandled error in %s", fn.__name__)
        raise HTTPException(status_code=500, detail=f"Internal AI service error: {e}")


@app.get("/health")
def health():
    adapter = get_market_adapter()
    return {
        "status": "ok",
        "uptime_seconds": round(time.time() - APP_START_TIME, 1),
        "market_data_source": adapter.name,
        "known_commodities": list_known_commodities(),
        "known_markets": list_known_markets(),
    }


@app.get("/api/v1/model-status")
def model_status():
    statuses = []
    for commodity in list_known_commodities():
        for market in list_known_markets():
            meta = price_predictor.load_model_meta(commodity, market)
            statuses.append({
                "commodity": commodity,
                "market": market,
                "trained": meta is not None,
                "chosen_model": meta["chosen_model"] if meta else None,
                "metrics": meta["metrics"][meta["chosen_model"]] if meta else None,
            })
    return {"models": statuses, "trained_count": sum(1 for s in statuses if s["trained"])}


@app.post("/api/v1/train")
def train(req: TrainRequest):
    def _run():
        adapter = get_market_adapter()
        raw_df = adapter.get_historical_prices(req.commodity, req.market, days=req.history_days)
        return price_predictor.train_price_model(raw_df, req.commodity, req.market)

    return _handle(_run)


@app.post("/api/v1/predict-price")
def predict_price(req: PredictPriceRequest):
    return _handle(price_predictor.predict_price, req.commodity, req.market, req.horizon_days)


@app.post("/api/v1/forecast")
def forecast(req: ForecastRequest):
    def _run():
        adapter = get_market_adapter()
        raw_df = adapter.get_historical_prices(req.commodity, req.market, days=req.history_days)
        return forecast_price(raw_df, req.horizon_days)

    return _handle(_run)


@app.post("/api/v1/trend-analysis")
def trend_analysis(req: TrendAnalysisRequest):
    def _run():
        adapter = get_market_adapter()
        raw_df = adapter.get_historical_prices(req.commodity, req.market, days=req.history_days)
        return analyze_trend(raw_df, req.window_days)

    return _handle(_run)


@app.post("/api/v1/anomaly-detection")
def anomaly_detection(req: AnomalyDetectionRequest):
    def _run():
        adapter = get_market_adapter()
        raw_df = adapter.get_historical_prices(req.commodity, req.market, days=req.history_days)
        return detect_anomalies(raw_df, req.z_threshold)

    return _handle(_run)


@app.post("/api/v1/market-comparison")
def market_comparison(req: MarketComparisonRequest):
    return _handle(compare_markets, req.commodity, req.markets, req.history_days)


@app.post("/api/v1/demand-supply")
def demand_supply(req: DemandSupplyRequest):
    return _handle(demand_supply_analysis, req.commodity, req.market, req.history_days)


@app.post("/api/v1/recommendations")
def recommendations(req: RecommendationRequest):
    return _handle(generate_recommendation, req.commodity, req.markets)


@app.post("/api/v1/market-insights")
def market_insights(req: MarketInsightsRequest):
    """Bundles current price, trend, anomalies and prediction into one payload —
    the single call the frontend's AI Market Intelligence dashboard uses."""
    def _run():
        adapter = get_market_adapter()
        raw_df = adapter.get_historical_prices(req.commodity, req.market, days=180)
        current = adapter.get_current_price(req.commodity, req.market)

        trend = None
        try:
            trend = analyze_trend(raw_df)
        except Exception as e:
            trend = {"error": str(e)}

        anomalies = None
        try:
            anomalies = detect_anomalies(raw_df)
        except Exception as e:
            anomalies = {"error": str(e)}

        prediction = None
        try:
            prediction = price_predictor.predict_price(req.commodity, req.market, 1)
        except FileNotFoundError:
            prediction = {"error": "Model not trained yet. Call /api/v1/train first."}

        return {
            "commodity": req.commodity,
            "market": req.market,
            "current": {**current, "basis": "OBSERVED_DATA"},
            "trend": trend,
            "anomalies": anomalies,
            "prediction": prediction,
        }

    return _handle(_run)
