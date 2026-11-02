import logging
import os
import threading
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

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

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS") or os.getenv("NODE_BACKEND_URL")
if allowed_origins_raw and allowed_origins_raw != "*":
    origins = [orig.strip() for orig in allowed_origins_raw.split(",") if orig.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def _background_model_train():
    try:
        commodities = list_known_commodities()
        markets = list_known_markets()
        adapter = get_market_adapter()
        trained_new = 0
        for c in commodities:
            for m in markets:
                if price_predictor.load_model_meta(c, m) is None:
                    raw_df = adapter.get_historical_prices(c, m, days=365)
                    price_predictor.train_price_model(raw_df, c, m)
                    trained_new += 1
        if trained_new > 0:
            logger.info("Background model check: trained %d missing models.", trained_new)
        else:
            logger.info("Background model check: all models already present.")
    except Exception as e:
        logger.warning("Background model check failed: %s", e)


@app.on_event("startup")
def startup_model_check():
    """Start background training thread so Uvicorn opens port and answers /health immediately."""
    threading.Thread(target=_background_model_train, daemon=True).start()


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


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
            try:
                price_predictor.train_price_model(raw_df, req.commodity, req.market)
                prediction = price_predictor.predict_price(req.commodity, req.market, 1)
            except Exception:
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
