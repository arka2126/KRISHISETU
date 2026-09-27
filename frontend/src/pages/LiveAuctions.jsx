import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

const statusBadge = { scheduled: 'badge-gray', active: 'badge-green', closed_sold: 'badge-orange', closed_unsold: 'badge-red' };

export default function LiveAuctions() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/auctions');
        setAuctions(data.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <Navbar />
      <div className="container" style={{ padding: '32px 20px' }}>
        <h1 className="section-title" style={{ marginTop: 0 }}>Live &amp; Upcoming Auctions</h1>
        {loading ? <p className="muted">Loading auctions…</p> : (
          <div className="grid grid-3">
            {auctions.map((a) => (
              <Link key={a._id} to={`/auctions/${a._id}`} className="card card-hover">
                <div className="flex-between" style={{ marginBottom: 10 }}>
                  <strong>{a.lot?.commodity?.name}</strong>
                  <span className={`badge ${statusBadge[a.status]}`}>{a.status.replace('_', ' ')}</span>
                </div>
                <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
                  Lot #{a.lot?.lotId} · {a.lot?.mandi}
                </div>
                <div className="grid grid-2" style={{ fontSize: 13 }}>
                  <div><span className="muted">Base Price</span><br /><strong>₹{a.basePrice}</strong></div>
                  <div><span className="muted">Highest Bid</span><br /><strong>₹{a.currentHighestBid}</strong></div>
                </div>
              </Link>
            ))}
            {auctions.length === 0 && <p className="muted">No auctions scheduled yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
