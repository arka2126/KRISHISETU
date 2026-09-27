// Price Intelligence & AI Forecasting Dashboard
import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import AIMarketIntelligence from '../components/AIMarketIntelligence';
import api from '../services/api';

export default function PriceDashboard() {
  const [auctions, setAuctions] = useState([]);

  useEffect(() => {
    api.get('/auctions', { params: { status: 'closed_sold' } })
      .then((r) => setAuctions(r.data.data || []))
      .catch(() => setAuctions([]));
  }, []);

  const byCommodity = {};
  auctions.forEach((a) => {
    const name = a.lot?.commodity?.name || 'Unknown';
    if (!byCommodity[name]) byCommodity[name] = [];
    byCommodity[name].push(a.currentHighestBid);
  });

  return (
    <div>
      <Navbar />
      <div className="container" style={{ padding: '32px 20px' }}>
        {/* Core AI Market Intelligence & Predictive Engine */}
        <AIMarketIntelligence />

        {/* Completed Auction Data from KrishiSetu Platform */}
        <h2 className="section-title" style={{ marginTop: 40 }}>
          KrishiSetu Live Auction Trade Benchmarks
        </h2>
        <p className="muted" style={{ marginBottom: 20 }}>
          Historical realized prices from completed, settled auctions executed on the KrishiSetu platform.
        </p>

        <div className="grid grid-3">
          {Object.entries(byCommodity).map(([name, prices]) => {
            const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
            return (
              <div className="card" key={name}>
                <div className="flex-between">
                  <strong>{name}</strong>
                  <span className="badge badge-green">Closed Auction Data</span>
                </div>
                <div className="grid grid-2" style={{ marginTop: 12, fontSize: 13 }}>
                  <div><span className="muted">Highest</span><br /><strong>₹{Math.max(...prices)}</strong></div>
                  <div><span className="muted">Lowest</span><br /><strong>₹{Math.min(...prices)}</strong></div>
                  <div><span className="muted">Average</span><br /><strong>₹{avg}</strong></div>
                  <div><span className="muted">Trades</span><br /><strong>{prices.length}</strong></div>
                </div>
              </div>
            );
          })}
          {Object.keys(byCommodity).length === 0 && (
            <p className="muted">No completed auctions yet — prices will appear here once live auctions settle.</p>
          )}
        </div>
      </div>
    </div>
  );
}
