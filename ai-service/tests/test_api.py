import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

COMMODITY = "Tomato"
MARKET = "Vashi APMC"


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["market_data_source"] == "MOCK_DATA"
    assert COMMODITY in body["known_commodities"]


def test_train_then_predict():
    r = client.post("/api/v1/train", json={"commodity": COMMODITY, "market": MARKET, "history_days": 365})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["chosen_model"] in ("random_forest", "xgboost")
    assert body["metrics"][body["chosen_model"]]["mape"] < 100  # sanity: model isn't nonsense

    r2 = client.post("/api/v1/predict-price", json={"commodity": COMMODITY, "market": MARKET, "horizon_days": 1})
    assert r2.status_code == 200, r2.text
    pred = r2.json()
    assert pred["predicted_price"] > 0
    assert pred["lower_bound"] <= pred["predicted_price"] <= pred["upper_bound"]
    assert pred["basis"] == "AI_PREDICTION"


def test_predict_without_training_returns_404():
    # Use a commodity/market pair guaranteed never to have been trained (train_all.py
    # only trains the known COMMODITY_PROFILES x MARKETS combinations).
    r = client.post("/api/v1/predict-price", json={"commodity": "ZzUntrainedCrop", "market": "ZzUntrainedMarket", "horizon_days": 1})
    assert r.status_code == 404


def test_forecast():
    r = client.post("/api/v1/forecast", json={"commodity": COMMODITY, "market": MARKET, "horizon_days": 7, "history_days": 200})
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["forecast"]) == 7
    for point in body["forecast"]:
        assert point["lower_bound"] <= point["predicted_price"] <= point["upper_bound"]


def test_trend_analysis():
    r = client.post("/api/v1/trend-analysis", json={"commodity": COMMODITY, "market": MARKET, "window_days": 14, "history_days": 180})
    assert r.status_code == 200, r.text
    assert r.json()["direction"] in ("rising", "falling", "stable", "unusual_movement")


def test_anomaly_detection():
    r = client.post("/api/v1/anomaly-detection", json={"commodity": COMMODITY, "market": MARKET, "history_days": 365})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "anomalies_found" in body
    assert body["anomalies_found"] >= 0


def test_market_comparison():
    r = client.post("/api/v1/market-comparison", json={"commodity": COMMODITY, "history_days": 120})
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["markets"]) >= 3
    assert body["highest_price_market"]


def test_demand_supply():
    r = client.post("/api/v1/demand-supply", json={"commodity": COMMODITY, "market": MARKET, "history_days": 120})
    assert r.status_code == 200, r.text
    assert r.json()["supply_signal"] in ("supply_increasing", "supply_decreasing", "supply_stable", "insufficient_data")


def test_recommendations():
    r = client.post("/api/v1/recommendations", json={"commodity": COMMODITY})
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["recommendation_text"]) > 0
    assert any("[OBSERVED_DATA]" in line for line in body["recommendation_text"])


def test_market_insights_bundle():
    r = client.post("/api/v1/market-insights", json={"commodity": COMMODITY, "market": MARKET})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["current"]["basis"] == "OBSERVED_DATA"


def test_model_status():
    r = client.get("/api/v1/model-status")
    assert r.status_code == 200
    assert "models" in r.json()


def test_invalid_commodity_still_generates_data_but_predict_needs_training():
    # unknown commodity falls back to a generic profile in the mock provider, not an error
    r = client.post("/api/v1/trend-analysis", json={"commodity": "Barley", "market": MARKET, "window_days": 14, "history_days": 180})
    assert r.status_code == 200
