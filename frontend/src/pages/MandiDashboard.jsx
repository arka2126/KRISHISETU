import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/mandi/dashboard', label: 'Overview' },
  { to: '/mandi/gate-entry', label: 'Gate Entry & Lot Creation' },
];

export default function MandiDashboard() {
  const [data, setData] = useState(null);
  const [lots, setLots] = useState([]);

  useEffect(() => {
    api.get('/dashboard/mandi').then((res) => setData(res.data.data));
    api.get('/lots', { params: { status: 'quality_done' } }).then((res) => setLots(res.data.data));
  }, []);

  const approveLot = async (id) => {
    await api.put(`/lots/${id}`, { status: 'approved' });
    setLots((prev) => prev.filter((l) => l._id !== id));
  };

  return (
    <div>
      <Navbar />
      <DashboardLayout title="Mandi Staff" links={links}>
        <h1 className="section-title" style={{ marginTop: 0 }}>Overview</h1>
        {!data ? <p className="muted">Loading…</p> : (
          <div className="grid grid-4">
            <div className="card stat-card"><span className="stat-value">{data.pendingGateEntries}</span><span className="stat-label">Pending Gate Entries</span></div>
            <div className="card stat-card"><span className="stat-value">{data.lotsAwaitingQuality}</span><span className="stat-label">Awaiting Quality Test</span></div>
            <div className="card stat-card"><span className="stat-value">{data.scheduledAuctions}</span><span className="stat-label">Scheduled Auctions</span></div>
            <div className="card stat-card"><span className="stat-value">{data.activeAuctions}</span><span className="stat-label">Active Auctions</span></div>
          </div>
        )}

        <h2 className="section-title">Lots Ready for Approval (quality certified)</h2>
        <div className="card">
          <table>
            <thead><tr><th>Lot ID</th><th>Commodity</th><th>Farmer</th><th>Grade</th><th></th></tr></thead>
            <tbody>
              {lots.map((l) => (
                <tr key={l._id}>
                  <td>{l.lotId}</td>
                  <td>{l.commodity?.name}</td>
                  <td>{l.farmer?.name}</td>
                  <td>{l.qualityReport?.grade || '—'}</td>
                  <td><button className="btn btn-primary btn-sm" onClick={() => approveLot(l._id)}>Approve</button></td>
                </tr>
              ))}
              {lots.length === 0 && <tr><td colSpan={5} className="muted">No lots pending approval.</td></tr>}
            </tbody>
          </table>
        </div>
      </DashboardLayout>
    </div>
  );
}
