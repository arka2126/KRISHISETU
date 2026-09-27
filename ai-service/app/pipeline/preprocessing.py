"""
Raw Data -> Validation -> Cleaning -> Missing Value Handling -> Outlier Detection
-> Feature Engineering -> Training Dataset

Each stage is a small, testable function so problems can be traced to a stage.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


class DataValidationError(ValueError):
    pass


REQUIRED_COLUMNS = {"date", "commodity", "market", "price", "arrivals_quintal"}


def validate_raw(df: pd.DataFrame) -> pd.DataFrame:
    missing_cols = REQUIRED_COLUMNS - set(df.columns)
    if missing_cols:
        raise DataValidationError(f"Missing required columns: {sorted(missing_cols)}")
    if df.empty:
        raise DataValidationError("No data rows provided.")
    if (df["price"] <= 0).any():
        raise DataValidationError("Non-positive price values found in raw data.")
    return df


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.drop_duplicates(subset=["date", "commodity", "market"])
    df = df.sort_values("date").reset_index(drop=True)
    return df


def handle_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Forward-fill short gaps in price/arrivals (typical for market holidays),
    # then drop any rows still missing after fill (e.g. leading NaNs).
    df["price"] = df["price"].ffill().bfill()
    df["arrivals_quintal"] = df["arrivals_quintal"].ffill().bfill()
    df = df.dropna(subset=["price", "arrivals_quintal"])
    return df


def detect_and_clip_outliers(df: pd.DataFrame, column: str = "price", iqr_multiplier: float = 3.0) -> pd.DataFrame:
    """IQR-based clipping (not deletion) so extreme-but-real spikes aren't lost for
    anomaly detection downstream, but training data isn't dominated by them."""
    df = df.copy()
    q1, q3 = df[column].quantile(0.25), df[column].quantile(0.75)
    iqr = q3 - q1
    lower = q1 - iqr_multiplier * iqr
    upper = q3 + iqr_multiplier * iqr
    df[f"{column}_is_outlier"] = (df[column] < lower) | (df[column] > upper)
    df[f"{column}_clipped"] = df[column].clip(lower=max(lower, 1.0), upper=upper)
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["day_of_year"] = df["date"].dt.dayofyear
    df["month"] = df["date"].dt.month
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

    price_col = "price_clipped" if "price_clipped" in df.columns else "price"

    for lag in (1, 3, 7, 14):
        df[f"price_lag_{lag}"] = df[price_col].shift(lag)

    df["price_roll_mean_7"] = df[price_col].shift(1).rolling(7, min_periods=3).mean()
    df["price_roll_std_7"] = df[price_col].shift(1).rolling(7, min_periods=3).std()
    df["price_roll_mean_30"] = df[price_col].shift(1).rolling(30, min_periods=7).mean()

    df["arrivals_roll_mean_7"] = df["arrivals_quintal"].shift(1).rolling(7, min_periods=3).mean()
    df["arrivals_change_pct"] = df["arrivals_quintal"].pct_change().replace([np.inf, -np.inf], np.nan)

    df["target_price"] = df[price_col]

    return df


def build_training_dataset(raw_df: pd.DataFrame) -> pd.DataFrame:
    """Runs the full Raw -> Training Dataset pipeline described in the spec."""
    df = validate_raw(raw_df)
    df = clean(df)
    df = handle_missing_values(df)
    df = detect_and_clip_outliers(df, "price")
    df = engineer_features(df)
    df = df.dropna().reset_index(drop=True)
    if df.empty:
        raise DataValidationError("No rows remained after feature engineering (insufficient history).")
    return df


FEATURE_COLUMNS = [
    "day_of_year", "month", "day_of_week", "month_sin", "month_cos",
    "price_lag_1", "price_lag_3", "price_lag_7", "price_lag_14",
    "price_roll_mean_7", "price_roll_std_7", "price_roll_mean_30",
    "arrivals_quintal", "arrivals_roll_mean_7", "arrivals_change_pct",
]
