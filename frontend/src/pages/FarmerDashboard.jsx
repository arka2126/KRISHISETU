import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import DashboardLayout from '../layouts/DashboardLayout';
import ShipmentTracker from '../components/ShipmentTracker';
import api from '../services/api';

const links = [
  { to: '/farmer/dashboard', label: 'Overview' },
  { to: '/marketplace', label: 'My Produce' },
  { to: '/auctions', label: 'Active Auctions' },
  { to: '/prices', label: 'AI Price Intelligence' },
];

export default function FarmerDashboard() {
  const [data, setData] = useState(null);
  const [shipments, setShipments] = useState([]);

  useEffect(() => {
    api.get('/dashboard/farmer').then((res) => setData(res.data.data));
    api.get('/logistics/mine').then((res) => setShipments(res.data.data)).catch(() => setShipments([]));
  }, []);

  return (
    <div>
      <Navbar />
      <DashboardLayout title="Farmer" links={links}>
        <h1 className="section-title" style={{ marginTop: 0 }}>Overview</h1>
        {!data ? <p className="muted">Loading…</p> : (
          <>
            <div className="grid grid-4">
              <div className="card stat-card"><span className="stat-value">{data.totalLots}</span><span className="stat-label">Total Lots</span></div>
              <div className="card stat-card"><span className="stat-value">{data.activeAuctions}</span><span className="stat-label">Active Auctions</span></div>
              <div className="card stat-card"><span className="stat-value">{data.soldLots}</span><span className="stat-label">Sold Lots</span></div>
              <div className="card stat-card"><span className="stat-value">₹{data.totalSales.toLocaleString('en-IN')}</span><span className="stat-label">Total Sales</span></div>
            </div>

            <h2 className="section-title">Recent Settlements</h2>
            <div className="card">
              <table>
                <thead><tr><th>Gross Amount</th><th>Fees + Commission</th><th>You Receive</th><th>Status</th></tr></thead>
                <tbody>
                  {data.recentSettlements.map((s) => (
                    <tr key={s._id}>
                      <td>₹{s.grossAmount.toLocaleString('en-IN')}</td>
                      <td>₹{(s.mandiFee + s.platformFee + s.commission).toLocaleString('en-IN')}</td>
                      <td><strong>₹{s.farmerAmount.toLocaleString('en-IN')}</strong></td>
                      <td><span className="badge badge-green">{s.status}</span></td>
                    </tr>
                  ))}
                  {data.recentSettlements.length === 0 && <tr><td colSpan={4} className="muted">No settlements yet.</td></tr>}
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
