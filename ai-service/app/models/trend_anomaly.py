"""
Trend classification (rising/falling/stable/unusual) and anomaly detection
(price spikes/drops, abnormal arrivals) using computed statistics only.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from app.pipeline.preprocessing import clean, handle_missing_values, validate_raw


def _prep(raw_df: pd.DataFrame) -> pd.DataFrame:
    df = validate_raw(raw_df)
    df = clean(df)
    df = handle_missing_values(df)
    return df


def analyze_trend(raw_df: pd.DataFrame, window: int = 14) -> dict:
    df = _prep(raw_df)
    if len(df) < window + 5:
        raise ValueError(f"Need at least {window + 5} days of history for trend analysis.")

    recent = df.tail(window)
    prior = df.tail(window * 2).head(window)

    recent_mean = recent["price"].mean()
    prior_mean = prior["price"].mean() if len(prior) else recent_mean
    pct_change = (recent_mean - prior_mean) / prior_mean * 100 if prior_mean else 0.0

    # slope via simple linear fit on the recent window
    x = np.arange(len(recent))
    slope, _ = np.polyfit(x, recent["price"].values, 1)
    volatility = df["price"].pct_change().std() * 100  # daily volatility, %

    # classify: unusual if the move is large relative to the series' own volatility
    volatility_threshold = max(volatility * 2.5, 3.0)
    if abs(pct_change) >= volatility_threshold:
        direction = "unusual_movement"
    elif pct_change > 1.5:
        direction = "rising"
    elif pct_change < -1.5:
        direction = "falling"
    else:
        direction = "stable"

    return {
        "direction": direction,
        "pct_change_vs_prior_window": round(float(pct_change), 2),
        "recent_avg_price": round(float(recent_mean), 2),
        "prior_avg_price": round(float(prior_mean), 2),
        "slope_per_day": round(float(slope), 3),
        "daily_volatility_pct": round(float(volatility), 2),
        "window_days": window,
        "basis": "OBSERVED_DATA",
    }


def detect_anomalies(raw_df: pd.DataFrame, z_threshold: float = 2.5) -> dict:
    df = _prep(raw_df)
    if len(df) < 30:
        raise ValueError("Need at least 30 days of history for anomaly detection.")

    df = df.copy()
    df["price_pct_change"] = df["price"].pct_change()
    df["arrivals_pct_change"] = df["arrivals_quintal"].pct_change()
    df["price_z"] = (df["price_pct_change"] - df["price_pct_change"].mean()) / df["price_pct_change"].std()
    df["arrivals_z"] = (df["arrivals_pct_change"] - df["arrivals_pct_change"].mean()) / df["arrivals_pct_change"].std()

    zscore_flags = df[(df["price_z"].abs() >= z_threshold) | (df["arrivals_z"].abs() >= z_threshold)]

    # Isolation Forest as a second, independent detector over multivariate features
    feature_cols = ["price_pct_change", "arrivals_pct_change"]
    iso_df = df.dropna(subset=feature_cols)
    iso_flags_idx = set()
    if len(iso_df) >= 30:
        iso = IsolationForest(contamination=0.05, random_state=42, n_estimators=200)
        preds = iso.fit_predict(iso_df[feature_cols])
        iso_flags_idx = set(iso_df.index[preds == -1])

    anomalies = []
    seen_dates = set()
    for idx, row in zscore_flags.iterrows():
        d = row["date"].date().isoformat()
        if d in seen_dates:
            continue
        seen_dates.add(d)
        confirmed_by_isolation_forest = idx in iso_flags_idx
        anomalies.append({
            "date": d,
            "price": round(float(row["price"]), 2),
            "price_pct_change": round(float(row["price_pct_change"]) * 100, 2),
            "arrivals_pct_change": round(float(row["arrivals_pct_change"]) * 100, 2)
                if pd.notna(row["arrivals_pct_change"]) else None,
            "price_z_score": round(float(row["price_z"]), 2) if pd.notna(row["price_z"]) else None,
            "severity": "high" if abs(row["price_z"]) >= z_threshold * 1.5 else "moderate",
            "confirmed_by_isolation_forest": confirmed_by_isolation_forest,
            "type": "price_spike" if row["price_pct_change"] > 0 else "price_drop",
        })

    anomalies.sort(key=lambda a: a["date"], reverse=True)

    return {
        "method": "rolling_zscore + isolation_forest",
        "z_threshold": z_threshold,
        "total_days_analyzed": len(df),
        "anomalies_found": len(anomalies),
        "anomalies": anomalies[:30],
        "basis": "OBSERVED_DATA",
    }
