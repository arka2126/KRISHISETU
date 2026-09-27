import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import DashboardLayout from '../layouts/DashboardLayout';
import ShipmentTracker from '../components/ShipmentTracker';
import api from '../services/api';

const links = [
  { to: '/buyer/dashboard', label: 'Overview' },
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/auctions', label: 'My Active Bids' },
  { to: '/prices', label: 'AI Price Intelligence' },
];

export default function BuyerDashboard() {
  const [data, setData] = useState(null);
  const [shipments, setShipments] = useState([]);

  useEffect(() => {
    api.get('/dashboard/buyer').then((res) => setData(res.data.data));
    api.get('/logistics/mine').then((res) => setShipments(res.data.data)).catch(() => setShipments([]));
  }, []);

  return (
    <div>
      <Navbar />
      <DashboardLayout title="Buyer" links={links}>
        <h1 className="section-title" style={{ marginTop: 0 }}>Overview</h1>
        {!data ? <p className="muted">Loading…</p> : (
          <>
            <div className="grid grid-4">
              <div className="card stat-card"><span className="stat-value">{data.activeBids}</span><span className="stat-label">Active Bids</span></div>
              <div className="card stat-card"><span className="stat-value">{data.auctionsWon}</span><span className="stat-label">Auctions Won</span></div>
              <div className="card stat-card"><span className="stat-value">₹{data.totalPurchases.toLocaleString('en-IN')}</span><span className="stat-label">Total Purchases</span></div>
              <div className="card stat-card"><span className="stat-value">{data.pendingPayments}</span><span className="stat-label">Pending Payments</span></div>
            </div>

            <h2 className="section-title">Recent Purchases</h2>
            <div className="card">
              <table>
                <thead><tr><th>Transaction ID</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
                <tbody>
                  {data.recentPurchases.map((p) => (
                    <tr key={p._id}>
                      <td>{p.transactionId}</td>
                      <td>₹{p.totalAmount.toLocaleString('en-IN')}</td>
                      <td>{p.paymentMethod.replace('_', ' ')}</td>
                      <td><span className="badge badge-green">{p.status}</span></td>
                    </tr>
                  ))}
                  {data.recentPurchases.length === 0 && <tr><td colSpan={4} className="muted">No purchases yet.</td></tr>}
                </tbody>
              </table>
            </div>

            {shipments.length > 0 && (
              <>
                <h2 className="section-title">My Shipments</h2>
                <div className="grid grid-2">
                  {shipments.map((s) => (
                    <div className="card" key={s._id}><ShipmentTracker logistics={s} compact /></div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </DashboardLayout>
    </div>
  );
}
