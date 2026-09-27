"""
Data source adapters for KrishiSetu AI service.

DESIGN PRINCIPLE (see project spec, "DO NOT CHEAT" section):
- Every adapter implements the same `MarketDataAdapter` / `WeatherAdapter` interface.
- A REAL adapter (Agmarknet/e-NAM, a weather provider, etc.) can be dropped in later
  by implementing the interface and reading its API key from the environment.
- Until real credentials exist, `MockMarketDataProvider` / `MockWeatherProvider`
  generate clearly-labeled synthetic data so the rest of the pipeline (cleaning,
  feature engineering, modeling) can be built and tested end-to-end.
- Every record returned carries a `source` field: "MOCK_DATA" or the real
  provider's name. The API layer forwards this to the frontend so users are never
  told synthetic data is verified real-world data.
"""

from __future__ import annotations

import math
import os
import random
from abc import ABC, abstractmethod
from datetime import date, timedelta
from typing import Optional

import numpy as np
import pandas as pd

SEASON_BY_MONTH = {
    12: "winter", 1: "winter", 2: "winter",
    3: "spring", 4: "spring", 5: "spring",
    6: "monsoon", 7: "monsoon", 8: "monsoon", 9: "monsoon",
    10: "autumn", 11: "autumn",
}

# Base price/volatility/seasonality profile per commodity (INR per quintal), used only
# to make the MOCK data look like plausible Indian mandi prices. Not real market data.
COMMODITY_PROFILES = {
    "Rice": {"base": 2100, "volatility": 0.04, "season_peak": 10, "season_amp": 0.10},
    "Wheat": {"base": 2300, "volatility": 0.03, "season_peak": 4, "season_amp": 0.08},
    "Potato": {"base": 1200, "volatility": 0.12, "season_peak": 1, "season_amp": 0.30},
    "Tomato": {"base": 1500, "volatility": 0.22, "season_peak": 7, "season_amp": 0.45},
    "Onion": {"base": 1800, "volatility": 0.18, "season_peak": 5, "season_amp": 0.35},
    "Maize": {"base": 1900, "volatility": 0.05, "season_peak": 10, "season_amp": 0.09},
}

MARKETS = ["Azadpur Mandi", "Vashi APMC", "Koyambedu Market", "Bowenpally Market", "Gultekdi Market"]


class MarketDataAdapter(ABC):
    """Interface every market-data source (real or mock) must implement."""

    name: str

    @abstractmethod
    def get_historical_prices(
        self, commodity: str, market: Optional[str], days: int
    ) -> pd.DataFrame:
        """Return columns: date, commodity, market, price, arrivals, source."""
        raise NotImplementedError

    @abstractmethod
    def get_current_price(self, commodity: str, market: str) -> dict:
        raise NotImplementedError


class WeatherAdapter(ABC):
    name: str

    @abstractmethod
    def get_weather_series(self, location: str, days: int) -> pd.DataFrame:
        """Return columns: date, location, rainfall_mm, temp_c, source."""
        raise NotImplementedError


class AgmarknetAdapter(MarketDataAdapter):
    """
    Real adapter placeholder for Agmarknet / e-NAM.

    NOT IMPLEMENTED: Agmarknet does not offer a public, credentialed REST API for
    programmatic per-commodity historical price pulls at the time of writing; e-NAM
    market data requires registered-market API access. To wire this up for real:
      1. Obtain e-NAM / Agmarknet API access (state APMC registration required).
      2. Set AGMARKNET_API_KEY and AGMARKNET_BASE_URL in the environment.
      3. Implement get_historical_prices/get_current_price against that API,
         mapping its response into the same DataFrame shape as MockMarketDataProvider.
    Until then, instantiating this class raises clearly rather than silently
    returning fabricated "live" data.
    """

    name = "agmarknet"

    def __init__(self):
        self.api_key = os.getenv("AGMARKNET_API_KEY")
        self.base_url = os.getenv("AGMARKNET_BASE_URL")
        if not self.api_key or not self.base_url:
            raise RuntimeError(
                "AgmarknetAdapter requires AGMARKNET_API_KEY and AGMARKNET_BASE_URL "
                "to be configured. Use MockMarketDataProvider for local/demo use."
            )

    def get_historical_prices(self, commodity, market, days):
        raise NotImplementedError("Real Agmarknet integration not implemented yet.")

    def get_current_price(self, commodity, market):
        raise NotImplementedError("Real Agmarknet integration not implemented yet.")


class OpenWeatherAdapter(WeatherAdapter):
    """
    Real adapter placeholder for a weather provider (e.g. OpenWeatherMap).
    Requires OPENWEATHER_API_KEY. Not implemented — see AgmarknetAdapter docstring
    for the same reasoning: no fabricated network calls without real credentials.
    """

    name = "openweather"

    def __init__(self):
        self.api_key = os.getenv("OPENWEATHER_API_KEY")
        if not self.api_key:
            raise RuntimeError(
                "OpenWeatherAdapter requires OPENWEATHER_API_KEY. "
                "Use MockWeatherProvider for local/demo use."
            )

    def get_weather_series(self, location, days):
        raise NotImplementedError("Real weather integration not implemented yet.")


class MockMarketDataProvider(MarketDataAdapter):
    """
    Deterministic synthetic data generator (seeded by commodity+market name) so
    repeated calls are stable within a run. Simulates: yearly seasonality,
    day-to-day noise, a slow trend, occasional demand/arrival shocks, and a small
    number of injected anomalies (price spikes/drops) so anomaly detection has
    something real to find.
    """

    name = "MOCK_DATA"

    def _seed(self, *parts: str) -> random.Random:
        return random.Random("|".join(parts))

    def get_historical_prices(self, commodity: str, market: Optional[str], days: int) -> pd.DataFrame:
        profile = COMMODITY_PROFILES.get(commodity, {"base": 2000, "volatility": 0.08, "season_peak": 6, "season_amp": 0.15})
        market = market or MARKETS[0]
        rng = self._seed(commodity, market)
        np_rng = np.random.default_rng(abs(hash((commodity, market))) % (2**32))

        end = date.today()
        dates = [end - timedelta(days=i) for i in range(days - 1, -1, -1)]

        base = profile["base"]
        vol = profile["volatility"]
        peak_month = profile["season_peak"]
        amp = profile["season_amp"]

        # slow multi-year-ish trend component (kept small)
        trend_slope = rng.uniform(-0.15, 0.25) / 365.0

        records = []
        price = base
        anomaly_days = set(rng.sample(range(days), k=max(1, days // 90)))
        for i, d in enumerate(dates):
            month_angle = 2 * math.pi * ((d.month - peak_month) % 12) / 12.0
            seasonal = amp * math.cos(month_angle)
            trend = trend_slope * i
            noise = np_rng.normal(0, vol)
            daily_return = seasonal * 0.01 + trend * 0.01 + noise * 0.3
            price = max(50.0, price * (1 + daily_return * 0.05) + np_rng.normal(0, base * vol * 0.02))

            arrivals = max(5.0, np_rng.normal(500 * (1 + seasonal), 80))

            shock = 0.0
            if i in anomaly_days:
                shock = rng.choice([-1, 1]) * rng.uniform(0.25, 0.45)
                price = price * (1 + shock)

            records.append({
                "date": d.isoformat(),
                "commodity": commodity,
                "market": market,
                "price": round(price, 2),
                "arrivals_quintal": round(arrivals, 1),
                "is_injected_anomaly": bool(shock != 0.0),
                "source": self.name,
            })

        return pd.DataFrame.from_records(records)

    def get_current_price(self, commodity: str, market: str) -> dict:
        df = self.get_historical_prices(commodity, market, days=7)
        latest = df.iloc[-1]
        return {
            "commodity": commodity,
            "market": market,
            "price": float(latest["price"]),
            "date": latest["date"],
            "arrivals_quintal": float(latest["arrivals_quintal"]),
            "source": self.name,
        }


class MockWeatherProvider(WeatherAdapter):
    name = "MOCK_DATA"

    def get_weather_series(self, location: str, days: int) -> pd.DataFrame:
        rng = np.random.default_rng(abs(hash(location)) % (2**32))
        end = date.today()
        dates = [end - timedelta(days=i) for i in range(days - 1, -1, -1)]
        records = []
        for d in dates:
            season = SEASON_BY_MONTH[d.month]
            base_rain = {"monsoon": 12.0, "winter": 1.0, "spring": 2.5, "autumn": 3.0}[season]
            base_temp = {"monsoon": 29.0, "winter": 18.0, "spring": 28.0, "autumn": 27.0}[season]
            records.append({
                "date": d.isoformat(),
                "location": location,
                "rainfall_mm": max(0.0, round(float(rng.normal(base_rain, base_rain * 0.6 + 0.5)), 1)),
                "temp_c": round(float(rng.normal(base_temp, 2.5)), 1),
                "source": self.name,
            })
        return pd.DataFrame.from_records(records)


def get_market_adapter() -> MarketDataAdapter:
    """Factory: real adapter if credentials exist, else the mock provider."""
    if os.getenv("AGMARKNET_API_KEY") and os.getenv("AGMARKNET_BASE_URL"):
        try:
            return AgmarknetAdapter()
        except Exception:
            pass
    return MockMarketDataProvider()


def get_weather_adapter() -> WeatherAdapter:
    if os.getenv("OPENWEATHER_API_KEY"):
        try:
            return OpenWeatherAdapter()
        except Exception:
            pass
    return MockWeatherProvider()


def list_known_commodities() -> list[str]:
    return list(COMMODITY_PROFILES.keys())


def list_known_markets() -> list[str]:
    return list(MARKETS)
