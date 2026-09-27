import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import CommodityCard from '../components/CommodityCard';
import api from '../services/api';

export default function Marketplace() {
  const [lots, setLots] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [filters, setFilters] = useState({ commodity: '', search: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [lotsRes, commRes] = await Promise.all([
          api.get('/lots', { params: { status: 'auction_scheduled' } }).catch(() => ({ data: { data: [] } })),
          api.get('/commodities'),
        ]);
        // Also merge in-auction / approved lots so the marketplace never looks empty
        const inAuction = await api.get('/lots', { params: { status: 'in_auction' } }).catch(() => ({ data: { data: [] } }));
        const approved = await api.get('/lots', { params: { status: 'approved' } }).catch(() => ({ data: { data: [] } }));
        const combined = [...lotsRes.data.data, ...inAuction.data.data, ...approved.data.data];
        setLots(combined);
        setCommodities(commRes.data.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = lots.filter((lot) => {
    if (filters.commodity && lot.commodity?._id !== filters.commodity) return false;
    if (filters.search && !lot.commodity?.name.toLowerCase().includes(filters.search.toLowerCase())
        && !lot.mandi.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <Navbar />
      <div className="container" style={{ padding: '32px 20px' }}>
        <h1 className="section-title" style={{ marginTop: 0 }}>Marketplace</h1>
        <div className="card flex gap-16" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
          <input className="form-input" placeholder="Search commodity or mandi…" style={{ maxWidth: 260 }}
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <select className="form-select" style={{ maxWidth: 220 }} value={filters.commodity}
            onChange={(e) => setFilters({ ...filters, commodity: e.target.value })}>
            <option value="">All commodities</option>
            {commodities.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>

        {loading ? <p className="muted">Loading lots…</p> : (
          filtered.length === 0 ? <p className="muted">No lots match your filters right now.</p> : (
            <div className="grid grid-3">
              {filtered.map((lot) => <CommodityCard key={lot._id} lot={lot} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
