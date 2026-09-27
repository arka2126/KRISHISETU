"""
Pre-trains a price model for every known (commodity, market) pair on synthetic
demo history, so the AI Market Intelligence dashboard has real predictions
available immediately after `npm run seed` on the Node side.

Usage:
    ./venv/bin/python train_all.py
"""

from app.data.adapters import get_market_adapter, list_known_commodities, list_known_markets
from app.models.price_predictor import train_price_model


def main():
    adapter = get_market_adapter()
    commodities = list_known_commodities()
    markets = list_known_markets()
    print(f"Training price models for {len(commodities)} commodities x {len(markets)} markets "
          f"using data source: {adapter.name}")

    trained, failed = 0, 0
    for commodity in commodities:
        for market in markets:
            try:
                raw_df = adapter.get_historical_prices(commodity, market, days=365)
                meta = train_price_model(raw_df, commodity, market)
                mape = meta["metrics"][meta["chosen_model"]]["mape"]
                print(f"  OK   {commodity:10s} / {market:20s} -> {meta['chosen_model']:13s} MAPE={mape:.2f}%")
                trained += 1
            except Exception as e:
                print(f"  FAIL {commodity:10s} / {market:20s} -> {e}")
                failed += 1

    print(f"\nDone. {trained} models trained, {failed} failed.")


if __name__ == "__main__":
    main()
