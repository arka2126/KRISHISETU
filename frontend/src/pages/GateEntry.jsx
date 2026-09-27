// Mandi staff: create a gate entry + lot in one step (simplified for the prototype)
import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../services/api';

const links = [
  { to: '/mandi/dashboard', label: 'Overview' },
  { to: '/mandi/gate-entry', label: 'Gate Entry & Lot Creation' },
];

export default function GateEntry() {
  const [farmers, setFarmers] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [form, setForm] = useState({
    farmer: '', commodity: '', variety: '', mandi: 'Nashik Mandi', vehicleNumber: '',
    quantity: '', weight: '', basePrice: '', reservePrice: '',
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users', { params: { role: 'farmer', limit: 100 } }).then((r) => setFarmers(r.data.data)).catch(() => {});
    api.get('/commodities').then((r) => setCommodities(r.data.data)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null);
    try {
      const { data } = await api.post('/lots', form);
      setResult(data.data);
      setForm({ ...form, vehicleNumber: '', quantity: '', weight: '', basePrice: '', reservePrice: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create lot');
    }
  };

  return (
    <div>
      <Navbar />
      <DashboardLayout title="Mandi Staff" links={links}>
        <h1 className="section-title" style={{ marginTop: 0 }}>Gate Entry &amp; Lot Creation</h1>
        <div className="grid grid-cols-2-responsive" style={{ gap: 24 }}>
          <form className="card" onSubmit={submit}>
            {error && <div className="badge badge-red" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="form-group">
              <label className="form-label">Farmer</label>
              <select className="form-select" required value={form.farmer} onChange={(e) => setForm({ ...form, farmer: e.target.value })}>
                <option value="">Select farmer</option>
                {farmers.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Commodity</label>
              <select className="form-select" required value={form.commodity} onChange={(e) => setForm({ ...form, commodity: e.target.value })}>
                <option value="">Select commodity</option>
                {commodities.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Vehicle Number</label>
              <input className="form-input" value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="MH-12-AB-1234" />
            </div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Quantity (qtl)</label>
                <input className="form-input" type="number" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Weight (kg)</label>
                <input className="form-input" type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Base Price (₹/qtl)</label>
                <input className="form-input" type="number" required value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Reserve Price (₹/qtl)</label>
                <input className="form-input" type="number" required value={form.reservePrice} onChange={(e) => setForm({ ...form, reservePrice: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary btn-block">Create Gate Entry &amp; Lot</button>
          </form>

          <div className="card">
            <strong>Result</strong>
            {result ? (
              <div style={{ marginTop: 12 }}>
                <p>Gate Entry ID: <strong>{result.gateEntryId}</strong></p>
                <p>Lot ID: <strong>{result.lotId}</strong></p>
                <p className="muted">Status: {result.status}</p>
              </div>
            ) : <p className="muted" style={{ marginTop: 12 }}>Submit the form to generate a Gate Entry ID and Lot ID.</p>}
          </div>
        </div>
      </DashboardLayout>
    </div>
  );
}
