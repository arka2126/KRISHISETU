// Quality Assessor: pick a pending lot, submit test parameters, generate certificate
import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../services/api';

const links = [{ to: '/quality/dashboard', label: 'Pending Tests' }];

export default function QualityAssessment() {
  const [pending, setPending] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ moisture: '', foreignMatter: '', grainSize: '', damagedPercentage: '', otherParameters: '', grade: 'A' });
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/quality-reports/pending').then((r) => setPending(r.data.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/quality-reports', { lot: selected._id, ...form });
      setCertificate({ ...data.data, lotId: selected.lotId, commodity: selected.commodity?.name });
      setSelected(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit report');
    }
  };

  return (
    <div>
      <Navbar />
      <DashboardLayout title="Quality Assessor" links={links}>
        <h1 className="section-title" style={{ marginTop: 0 }}>Pending Quality Tests</h1>

        {!selected && !certificate && (
          <div className="card">
            <table>
              <thead><tr><th>Lot ID</th><th>Commodity</th><th>Farmer</th><th>Mandi</th><th></th></tr></thead>
              <tbody>
                {pending.map((l) => (
                  <tr key={l._id}>
                    <td>{l.lotId}</td><td>{l.commodity?.name}</td><td>{l.farmer?.name}</td><td>{l.mandi}</td>
                    <td><button className="btn btn-primary btn-sm" onClick={() => setSelected(l)}>Test Lot</button></td>
                  </tr>
                ))}
                {pending.length === 0 && <tr><td colSpan={5} className="muted">No lots pending quality tests.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <form className="card" onSubmit={submit} style={{ maxWidth: 480 }}>
            <h3 style={{ marginTop: 0 }}>Testing Lot #{selected.lotId} — {selected.commodity?.name}</h3>
            {error && <div className="badge badge-red" style={{ marginBottom: 12 }}>{error}</div>}
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Moisture %</label>
                <input className="form-input" type="number" step="0.1" required value={form.moisture} onChange={(e) => setForm({ ...form, moisture: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Foreign Matter %</label>
                <input className="form-input" type="number" step="0.1" required value={form.foreignMatter} onChange={(e) => setForm({ ...form, foreignMatter: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Grain Size</label>
                <input className="form-input" value={form.grainSize} onChange={(e) => setForm({ ...form, grainSize: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Damaged Grains %</label>
                <input className="form-input" type="number" step="0.1" value={form.damagedPercentage} onChange={(e) => setForm({ ...form, damagedPercentage: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Other Parameters</label>
              <input className="form-input" value={form.otherParameters} onChange={(e) => setForm({ ...form, otherParameters: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Quality Grade</label>
              <select className="form-select" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                {['A+', 'A', 'B+', 'B', 'C'].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="flex gap-12">
              <button className="btn btn-primary">Submit &amp; Certify</button>
              <button type="button" className="btn btn-secondary" onClick={() => setSelected(null)}>Cancel</button>
            </div>
          </form>
        )}

        {certificate && (
          <div className="card" style={{ maxWidth: 480, border: '2px solid var(--green-600)' }}>
            <div className="badge badge-green" style={{ marginBottom: 12 }}>QUALITY CERTIFIED</div>
            <p><strong>Lot ID:</strong> {certificate.lotId}</p>
            <p><strong>Commodity:</strong> {certificate.commodity}</p>
            <p><strong>Grade:</strong> {certificate.grade}</p>
            <p><strong>Moisture:</strong> {certificate.moisture}% &nbsp; <strong>Foreign Matter:</strong> {certificate.foreignMatter}%</p>
            <p><strong>Test Date:</strong> {new Date(certificate.testDate).toLocaleDateString()}</p>
            <button className="btn btn-secondary btn-sm" onClick={() => setCertificate(null)}>Test Another Lot</button>
          </div>
        )}
      </DashboardLayout>
    </div>
  );
}
