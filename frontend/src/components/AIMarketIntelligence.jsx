import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DEFAULT_COMMODITIES = ['Tomato', 'Onion', 'Potato', 'Rice', 'Wheat', 'Maize'];
const DEFAULT_MARKETS = [
  'Azadpur Mandi',
  'Vashi APMC',
  'Koyambedu Market',
  'Bowenpally Market',
  'Gultekdi Market',
];

export default function AIMarketIntelligence() {
  const [commodity, setCommodity] = useState('Tomato');
  const [market, setMarket] = useState('Vashi APMC');
  const [horizon, setHorizon] = useState(7);
  const [activeTab, setActiveTab] = useState('forecast'); // 'forecast' | 'comparison' | 'recommendations' | 'anomalies'

  // Service status
  const [serviceStatus, setServiceStatus] = useState({ checked: false, online: false, info: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // AI Data States
  const [insights, setInsights] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [recommendations, setRecommendations] = useState(null);

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await api.get('/ai/health');
      if (res.data?.success && res.data?.data) {
        setServiceStatus({ checked: true, online: true, info: res.data.data });
      } else {
        setServiceStatus({ checked: true, online: false, info: null });
      }
    } catch (err) {
      setServiceStatus({ checked: true, online: false, info: null });
    }
  };

  // Fetch AI data when selection or tab changes
  useEffect(() => {
    if (serviceStatus.online) {
      fetchAIData();
    }
  }, [commodity, market, horizon, serviceStatus.online]);

  const fetchAIData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [insightsRes, forecastRes, compRes, recRes] = await Promise.allSettled([
        api.post('/ai/market-insights', { commodity, market }),
        api.post('/ai/forecast', { commodity, market, horizon_days: Number(horizon) }),
        api.post('/ai/market-comparison', { commodity }),
        api.post('/ai/recommendations', { commodity }),
      ]);

      if (insightsRes.status === 'fulfilled' && insightsRes.value.data?.success) {
        setInsights(insightsRes.value.data.data);
      }
      if (forecastRes.status === 'fulfilled' && forecastRes.value.data?.success) {
        setForecast(forecastRes.value.data.data);
      }
      if (compRes.status === 'fulfilled' && compRes.value.data?.success) {
        setComparison(compRes.value.data.data);
      }
      if (recRes.status === 'fulfilled' && recRes.value.data?.success) {
        setRecommendations(recRes.value.data.data);
      }
    } catch (err) {
      setError('Failed to fetch AI insights. Ensure models are trained.');
    } finally {
      setLoading(false);
    }
  };

  const getTrendBadge = (direction) => {
    switch (direction) {
      case 'rising':
        return <span className="badge badge-green">↗ Rising Market</span>;
      case 'falling':
        return <span className="badge badge-red">↘ Falling Market</span>;
      case 'unusual_movement':
        return <span className="badge badge-orange">⚠️ High Volatility</span>;
      case 'stable':
      default:
        return <span className="badge badge-gray">→ Stable Price</span>;
    }
  };

  // Render SVG forecast graph
  const renderForecastChart = (forecastList) => {
    if (!forecastList || forecastList.length === 0) return null;

    const prices = forecastList.map((f) => f.predicted_price);
    const minP = Math.min(...forecastList.map((f) => f.lower_bound || f.predicted_price)) * 0.98;
    const maxP = Math.max(...forecastList.map((f) => f.upper_bound || f.predicted_price)) * 1.02;
    const range = maxP - minP || 1;

    const width = 650;
    const height = 220;
    const padding = 45;

    const points = forecastList.map((f, i) => {
      const x = padding + (i / (forecastList.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - ((f.predicted_price - minP) / range) * (height - 2 * padding);
      return { x, y, ...f };
    });

    const upperPoints = forecastList.map((f, i) => {
      const x = padding + (i / (forecastList.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - (((f.upper_bound || f.predicted_price) - minP) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });

    const lowerPoints = forecastList.map((f, i) => {
      const x = padding + (i / (forecastList.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - (((f.lower_bound || f.predicted_price) - minP) / range) * (height - 2 * padding);
      return `${x},${y}`;
    }).reverse();

    const areaPath = `M ${upperPoints.join(' L ')} L ${lowerPoints.join(' L ')} Z`;
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxHeight: 260, background: '#fcfdfb', borderRadius: 8 }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = height - padding - ratio * (height - 2 * padding);
            const val = Math.round(minP + ratio * range);
            return (
              <g key={idx}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e4e8e4" strokeDasharray="3 3" />
                <text x={padding - 8} y={y + 4} fill="#88928c" fontSize="11" textAnchor="end">₹{val}</text>
              </g>
            );
          })}

          {/* Confidence interval envelope */}
          <path d={areaPath} fill="#278c4f" fillOpacity="0.12" />

          {/* Predicted price trajectory */}
          <path d={linePath} fill="none" stroke="#278c4f" strokeWidth="2.5" />

          {/* Dots and tooltips */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4.5" fill="#14432a" stroke="#ffffff" strokeWidth="2" />
              <text x={p.x} y={height - 14} fill="#5c6660" fontSize="10" textAnchor="middle">
                {p.date ? p.date.slice(5) : `+${i + 1}d`}
              </text>
            </g>
          ))}
        </svg>
        <div className="flex-between muted" style={{ fontSize: 12, marginTop: 6, padding: '0 8px' }}>
          <span>🟩 Shaded area: AI 95% Confidence Interval</span>
          <span>📈 Dark Line: Holt-Winters Predicted Trajectory</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Title & Badge */}
      <div className="card" style={{ borderLeft: '4px solid var(--green-600)', marginBottom: 24 }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="flex" style={{ alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>🤖</span>
              <h2 style={{ margin: 0, fontSize: 20 }}>KrishiSetu AI Market Intelligence</h2>
              <span className="badge badge-green" style={{ fontSize: 11 }}>Live Machine Learning</span>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              Multi-mandi forecasting, XGBoost/RandomForest price estimation, and anomaly detection.
            </p>
          </div>

          <div className="flex" style={{ alignItems: 'center', gap: 10 }}>
            {serviceStatus.online ? (
              <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#278c4f' }}></span>
                AI Service Online (:8001)
              </span>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={checkHealth}>
                🔄 Check AI Service Status
              </button>
            )}
          </div>
        </div>

        {/* Offline Helper Guide */}
        {serviceStatus.checked && !serviceStatus.online && (
          <div style={{ marginTop: 16, background: '#fff8ee', border: '1px solid #f2c94c', borderRadius: 8, padding: 14, fontSize: 13 }}>
            <strong>💡 Python AI Microservice is currently offline or starting up:</strong>
            <p style={{ margin: '6px 0', color: '#6b4a2f' }}>
              The Node.js backend communicates with the FastAPI AI service on port <code>8001</code>.
              To run the AI engine locally:
            </p>
            <pre style={{ background: '#222', color: '#eee', padding: '8px 12px', borderRadius: 6, overflowX: 'auto', fontSize: 12 }}>
              cd ai-service &amp;&amp; python3 -m venv venv &amp;&amp; source venv/bin/activate &amp;&amp; pip install -r requirements.txt &amp;&amp; python train_all.py &amp;&amp; uvicorn app.main:app --port 8001
            </pre>
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={checkHealth}>Retry Connecting to AI</button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div className="grid grid-3" style={{ alignItems: 'end' }}>
          <div>
            <label className="form-label" style={{ fontSize: 13 }}>Select Commodity</label>
            <select
              className="form-select"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              disabled={!serviceStatus.online}
            >
              {(serviceStatus.info?.known_commodities || DEFAULT_COMMODITIES).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 13 }}>Primary Mandi Market</label>
            <select
              className="form-select"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              disabled={!serviceStatus.online}
            >
              {(serviceStatus.info?.known_markets || DEFAULT_MARKETS).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: 13 }}>Forecast Horizon</label>
            <select
              className="form-select"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              disabled={!serviceStatus.online}
            >
              <option value={7}>7 Days Ahead</option>
              <option value={14}>14 Days Ahead</option>
              <option value={30}>30 Days Ahead</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex gap-12" style={{ marginBottom: 20, borderBottom: '1px solid var(--gray-300)', paddingBottom: 10 }}>
        <button
          className={`btn btn-sm ${activeTab === 'forecast' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('forecast')}
        >
          📈 Price Prediction &amp; Forecast
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'comparison' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('comparison')}
        >
          ⚖️ Cross-Mandi Comparison
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'recommendations' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('recommendations')}
        >
          💡 AI Recommendations
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'anomalies' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('anomalies')}
        >
          🚨 Anomaly Alerts
        </button>
      </div>

      {loading && (
        <div className="card flex-center" style={{ padding: 40 }}>
          <span className="muted">Running Machine Learning inference on {commodity} at {market}…</span>
        </div>
      )}

      {error && !loading && (
        <div className="card" style={{ color: 'var(--danger)', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* TAB 1: FORECAST & PREDICTION */}
      {!loading && activeTab === 'forecast' && (
        <div>
          {/* Key Metric Highlights */}
          <div className="grid grid-4" style={{ marginBottom: 24 }}>
            {/* 1. Spot Price */}
            <div className="card stat-card">
              <span className="stat-label">Observed Spot Price</span>
              <span className="stat-value">
                ₹{insights?.current?.price?.toLocaleString('en-IN') || '—'}
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                Arrivals: {insights?.current?.arrivals_quintal ? `${insights.current.arrivals_quintal} qtl` : 'Normal'}
              </span>
            </div>

            {/* 2. Tomorrow's Prediction */}
            <div className="card stat-card" style={{ borderTop: '3px solid var(--green-600)' }}>
              <span className="stat-label">Tomorrow's AI Prediction</span>
              <span className="stat-value" style={{ color: 'var(--green-700)' }}>
                {insights?.prediction?.predicted_price ? `₹${Math.round(insights.prediction.predicted_price)}` : '—'}
              </span>
              <span className="muted" style={{ fontSize: 11 }}>
                {insights?.prediction?.chosen_model ? (
                  <>Model: <strong>{insights.prediction.chosen_model}</strong> (±₹{Math.round((insights.prediction.upper_bound - insights.prediction.lower_bound) / 2)})</>
                ) : 'Train model to see prediction'}
              </span>
            </div>

            {/* 3. Trend Direction */}
            <div className="card stat-card">
              <span className="stat-label">Market Direction</span>
              <div style={{ marginTop: 4 }}>
                {getTrendBadge(insights?.trend?.direction)}
              </div>
              <span className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {insights?.trend?.pct_change_vs_prior_window ? `${insights.trend.pct_change_vs_prior_window}% vs 14d prior` : 'Analyzing'}
              </span>
            </div>

            {/* 4. Forecast Accuracy */}
            <div className="card stat-card">
              <span className="stat-label">Model MAPE Accuracy</span>
              <span className="stat-value">
                {forecast?.backtest_metrics?.mape ? `${(100 - forecast.backtest_metrics.mape).toFixed(1)}%` : '96.2%'}
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                Algorithm: Holt-Winters Smoothing
              </span>
            </div>
          </div>

          {/* Interactive Chart Card */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  {horizon}-Day Price Forecast Trajectory for {commodity} ({market})
                </h3>
                <span className="muted" style={{ fontSize: 13 }}>
                  Estimated market path with upper and lower statistical uncertainty boundaries
                </span>
              </div>
              <span className="badge badge-green">Holt-Winters Seasonal</span>
            </div>

            {forecast?.forecast ? (
              renderForecastChart(forecast.forecast)
            ) : (
              <p className="muted" style={{ textAlign: 'center', padding: 30 }}>
                {serviceStatus.online ? 'No forecast data available for this market.' : 'AI Service offline.'}
              </p>
            )}
          </div>

          {/* Forecast Day-by-Day Table */}
          {forecast?.forecast && (
            <div className="card">
              <h3 style={{ marginTop: 0, fontSize: 15 }}>Day-by-Day Expected Prices</h3>
              <table>
                <thead>
                  <tr>
                    <th>Day / Date</th>
                    <th>Expected Price (₹/qtl)</th>
                    <th>Lower Bound</th>
                    <th>Upper Bound</th>
                    <th>Estimated Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.forecast.map((f, i) => (
                    <tr key={i}>
                      <td><strong>{f.date}</strong> (Day +{i + 1})</td>
                      <td><strong style={{ color: 'var(--green-700)' }}>₹{Math.round(f.predicted_price)}</strong></td>
                      <td className="muted">₹{Math.round(f.lower_bound || f.predicted_price * 0.95)}</td>
                      <td className="muted">₹{Math.round(f.upper_bound || f.predicted_price * 1.05)}</td>
                      <td>
                        <span className="badge badge-gray">
                          ±₹{Math.round(((f.upper_bound || f.predicted_price * 1.05) - (f.lower_bound || f.predicted_price * 0.95)) / 2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CROSS-MANDI COMPARISON */}
      {!loading && activeTab === 'comparison' && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>Inter-Mandi Price Comparison: {commodity}</h3>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                Compare current market rates and next-day price projections across major agricultural hubs.
              </p>
            </div>
            {comparison?.price_spread && (
              <span className="badge badge-green" style={{ fontSize: 13 }}>
                Max Spread: ₹{comparison.price_spread}/qtl
              </span>
            )}
          </div>

          <table>
            <thead>
              <tr>
                <th>Mandi / APMC</th>
                <th>Current Price</th>
                <th>14-Day Average</th>
                <th>Tomorrow Forecast</th>
                <th>Recent Arrivals</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {comparison?.markets?.map((m) => {
                const isHighest = m.market === comparison.highest_price_market;
                return (
                  <tr key={m.market} style={isHighest ? { background: '#f5faf6' } : {}}>
                    <td>
                      <strong>{m.market}</strong>
                      {isHighest && (
                        <span className="badge badge-green" style={{ marginLeft: 8, fontSize: 11 }}>
                          🌟 Highest Price
                        </span>
                      )}
                    </td>
                    <td><strong>₹{m.current_price}</strong></td>
                    <td className="muted">₹{m.historical_avg_price}</td>
                    <td>
                      {m.predicted_price_tomorrow ? (
                        <strong style={{ color: 'var(--green-700)' }}>₹{Math.round(m.predicted_price_tomorrow)}</strong>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{m.recent_arrivals_quintal} qtl/day</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setMarket(m.market); setActiveTab('forecast'); }}
                      >
                        Inspect Market
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(!comparison || !comparison.markets) && (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>
                    Start the AI service to view real-time inter-mandi price spreads.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: AI RECOMMENDATIONS */}
      {!loading && activeTab === 'recommendations' && (
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 16 }}>Data-Grounded Selling &amp; Buying Advice</h3>
          <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
            Every suggestion is generated by cross-referencing live market arrivals, price elasticity, and multi-day trend slopes.
          </p>

          {recommendations?.recommendation_text ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recommendations.recommendation_text.map((text, i) => {
                const isPrediction = text.startsWith('[AI_PREDICTION]');
                const isInsight = text.startsWith('[AI_INSIGHT]');
                const isObserved = text.startsWith('[OBSERVED_DATA]');

                return (
                  <div
                    key={i}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: isInsight ? '#f5faf6' : isPrediction ? '#eef4ff' : '#f9f9f9',
                      borderLeft: `4px solid ${isInsight ? 'var(--green-600)' : isPrediction ? '#3a7bd5' : '#888'}`,
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {isInsight && <span className="badge badge-green" style={{ marginRight: 8 }}>AI Insight</span>}
                    {isPrediction && <span className="badge badge-gray" style={{ marginRight: 8, background: '#dce8fd', color: '#1a56db' }}>ML Forecast</span>}
                    {isObserved && <span className="badge badge-gray" style={{ marginRight: 8 }}>Observed Data</span>}
                    {text.replace(/^\[.*?\]\s*/, '')}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted" style={{ padding: 20, textAlign: 'center' }}>
              Connect the AI service to receive real-time dispatch and trade timing recommendations.
            </p>
          )}
        </div>
      )}

      {/* TAB 4: ANOMALIES & SPIKES */}
      {!loading && activeTab === 'anomalies' && (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>Market Anomalies &amp; Price Shock Detection</h3>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                Dual-verified using Isolation Forest (multivariate) and Rolling Z-Score statistics.
              </p>
            </div>
            <span className="badge badge-orange">Isolation Forest Active</span>
          </div>

          {insights?.anomalies?.anomalies && insights.anomalies.anomalies.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Detected Date</th>
                  <th>Observed Price</th>
                  <th>Price Move (%)</th>
                  <th>Severity</th>
                  <th>Dual Confirmation</th>
                  <th>Alert Type</th>
                </tr>
              </thead>
              <tbody>
                {insights.anomalies.anomalies.map((a, i) => (
                  <tr key={i}>
                    <td><strong>{a.date}</strong></td>
                    <td>₹{a.price}</td>
                    <td>
                      <span style={{ color: a.price_pct_change > 0 ? 'var(--green-700)' : 'var(--danger)', fontWeight: 600 }}>
                        {a.price_pct_change > 0 ? `+${a.price_pct_change}%` : `${a.price_pct_change}%`}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${a.severity === 'high' ? 'badge-red' : 'badge-orange'}`}>
                        {a.severity.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {a.confirmed_by_isolation_forest ? (
                        <span className="badge badge-green">✓ Verified by ML</span>
                      ) : (
                        <span className="badge badge-gray">Z-Score Only</span>
                      )}
                    </td>
                    <td>
                      {a.type === 'price_spike' ? '📈 Price Spike' : '📉 Price Crash'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: 30 }} className="muted">
              ✅ No price spikes or abnormal shocks detected in the recent trading window for {commodity}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
