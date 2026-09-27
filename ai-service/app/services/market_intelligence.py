"""
Composes the lower-level models (price predictor, trend, anomaly) into the
higher-level "market intelligence" outputs: market comparison, demand/supply
analysis, and templated (not random) recommendations.

Every value returned is traced back to something computed above; recommendation
text only ever references numbers that are also returned in the payload, and each
top-level section is tagged OBSERVED_DATA / AI_PREDICTION / AI_INSIGHT per spec.
"""

from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from app.data.adapters import get_market_adapter, list_known_markets
from app.models import price_predictor
from app.models.trend_anomaly import analyze_trend


def _safe_trend(df: pd.DataFrame) -> Optional[dict]:
    try:
        return analyze_trend(df)
    except Exception:
        return None


def _safe_predict(commodity: str, market: str) -> Optional[dict]:
    try:
        return price_predictor.predict_price(commodity, market, horizon_days=1)
    except Exception:
        return None


def compare_markets(commodity: str, markets: Optional[list[str]] = None, history_days: int = 120) -> dict:
    adapter = get_market_adapter()
    markets = markets or list_known_markets()

    rows = []
    for market in markets:
        df = adapter.get_historical_prices(commodity, market, days=history_days)
        current = adapter.get_current_price(commodity, market)
        trend = _safe_trend(df)
        prediction = _safe_predict(commodity, market)

        rows.append({
            "market": market,
            "current_price": round(current["price"], 2),
            "historical_avg_price": round(float(df["price"].mean()), 2),
            "predicted_price_tomorrow": prediction["predicted_price"] if prediction else None,
            "prediction_confidence_interval": (
                [prediction["lower_bound"], prediction["upper_bound"]] if prediction else None
            ),
            "trend": trend["direction"] if trend else "unknown",
            "recent_arrivals_quintal": round(float(df["arrivals_quintal"].tail(7).mean()), 1),
            "data_source": current["source"],
        })

    if not rows:
        raise ValueError("No markets to compare.")

    best = max(rows, key=lambda r: r["current_price"])
    worst = min(rows, key=lambda r: r["current_price"])
    price_spread = round(best["current_price"] - worst["current_price"], 2)

    return {
        "commodity": commodity,
        "markets": rows,
        "highest_price_market": best["market"],
        "lowest_price_market": worst["market"],
        "price_spread": price_spread,
        "price_spread_pct_of_lowest": round(price_spread / worst["current_price"] * 100, 2) if worst["current_price"] else None,
        "basis": {"current_price": "OBSERVED_DATA", "predicted_price_tomorrow": "AI_PREDICTION", "trend": "OBSERVED_DATA"},
    }


def demand_supply_analysis(commodity: str, market: str, history_days: int = 120) -> dict:
    adapter = get_market_adapter()
    df = adapter.get_historical_prices(commodity, market, days=history_days)
    df = df.sort_values("date")

    recent = df.tail(14)
    prior = df.tail(28).head(14)

    arrivals_change_pct = None
    if len(prior) and prior["arrivals_quintal"].mean():
        arrivals_change_pct = (
            (recent["arrivals_quintal"].mean() - prior["arrivals_quintal"].mean())
            / prior["arrivals_quintal"].mean() * 100
        )

    # Naive price-arrivals elasticity: correlation between % change in arrivals and
    # % change in price over the recent window (a real, if simple, computed signal —
    # negative correlation is the textbook demand/supply relationship).
    merged = df.tail(30).copy()
    merged["price_pct"] = merged["price"].pct_change()
    merged["arrivals_pct"] = merged["arrivals_quintal"].pct_change()
    valid = merged.dropna(subset=["price_pct", "arrivals_pct"])
    correlation = float(valid["price_pct"].corr(valid["arrivals_pct"])) if len(valid) >= 5 else None

    if arrivals_change_pct is None:
        supply_signal = "insufficient_data"
    elif arrivals_change_pct > 10:
        supply_signal = "supply_increasing"
    elif arrivals_change_pct < -10:
        supply_signal = "supply_decreasing"
    else:
        supply_signal = "supply_stable"

    return {
        "commodity": commodity,
        "market": market,
        "recent_avg_arrivals_quintal": round(float(recent["arrivals_quintal"].mean()), 1),
        "prior_avg_arrivals_quintal": round(float(prior["arrivals_quintal"].mean()), 1) if len(prior) else None,
        "arrivals_change_pct": round(float(arrivals_change_pct), 2) if arrivals_change_pct is not None else None,
        "price_arrivals_correlation": round(correlation, 3) if correlation is not None else None,
        "supply_signal": supply_signal,
        "basis": "OBSERVED_DATA",
    }


def generate_recommendation(commodity: str, markets: Optional[list[str]] = None) -> dict:
    comparison = compare_markets(commodity, markets)
    rows = comparison["markets"]
    best_current = max(rows, key=lambda r: r["current_price"])
    best_predicted = max(
        (r for r in rows if r["predicted_price_tomorrow"] is not None),
        key=lambda r: r["predicted_price_tomorrow"],
        default=None,
    )

    lines = []
    lines.append(
        f"[OBSERVED_DATA] For {commodity}, {best_current['market']} currently has the highest "
        f"observed price at ₹{best_current['current_price']}/quintal, "
        f"₹{comparison['price_spread']} above the lowest ({comparison['lowest_price_market']})."
    )

    rising_markets = [r["market"] for r in rows if r["trend"] == "rising"]
    falling_markets = [r["market"] for r in rows if r["trend"] == "falling"]
    if rising_markets:
        lines.append(f"[OBSERVED_DATA] Prices are trending up recently in: {', '.join(rising_markets)}.")
    if falling_markets:
        lines.append(f"[OBSERVED_DATA] Prices are trending down recently in: {', '.join(falling_markets)}.")

    if best_predicted:
        lines.append(
            f"[AI_PREDICTION] The model's highest next-day price forecast is "
            f"{best_predicted['market']} at ₹{best_predicted['predicted_price_tomorrow']} "
            f"(range ₹{best_predicted['prediction_confidence_interval'][0]}–"
            f"₹{best_predicted['prediction_confidence_interval'][1]})."
        )
        if best_predicted["market"] != best_current["market"]:
            lines.append(
                f"[AI_INSIGHT] {best_predicted['market']} is forecast to close the gap with "
                f"{best_current['market']} — consider comparing transport cost against the "
                f"potential price difference before choosing where to sell."
            )
        else:
            lines.append(
                f"[AI_INSIGHT] {best_current['market']} is both currently highest-priced and "
                f"forecast to remain so; it looks like the stronger option for this commodity "
                f"among the markets compared."
            )
    else:
        lines.append("[AI_INSIGHT] Not enough trained model data yet to forecast next-day prices for these markets.")

    lines.append(
        "This is a data-informed suggestion, not a guarantee — actual prices depend on "
        "factors (transport cost, buyer demand on the day, quality grading) beyond this model."
    )

    return {
        "commodity": commodity,
        "recommendation_text": lines,
        "supporting_comparison": comparison,
        "basis": "AI_INSIGHT",
    }
