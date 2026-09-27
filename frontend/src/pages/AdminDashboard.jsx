import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import DashboardLayout from '../layouts/DashboardLayout';
import api from '../services/api';

const links = [{ to: '/admin/dashboard', label: 'Overview' }];

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard/admin').then((r) => setData(r.data.data));
  }, []);

  return (
    <div>
      <Navbar />
      <DashboardLayout title="Admin" links={links}>
        <h1 className="section-title" style={{ marginTop: 0 }}>Platform Overview</h1>
        {!data ? <p className="muted">Loading…</p> : (
          <div className="grid grid-4">
            <div className="card stat-card"><span className="stat-value">{data.totalFarmers}</span><span className="stat-label">Total Farmers</span></div>
            <div className="card stat-card"><span className="stat-value">{data.totalBuyers}</span><span className="stat-label">Total Buyers</span></div>
            <div className="card stat-card"><span className="stat-value">{data.activeAuctions}</span><span className="stat-label">Active Auctions</span></div>
            <div className="card stat-card"><span className="stat-value">{data.completedAuctions}</span><span className="stat-label">Completed Auctions</span></div>
            <div className="card stat-card"><span className="stat-value">{data.totalTransactions}</span><span className="stat-label">Total Transactions</span></div>
            <div className="card stat-card"><span className="stat-value">₹{data.totalTradeValue.toLocaleString('en-IN')}</span><span className="stat-label">Total Trade Value</span></div>
            <div className="card stat-card"><span className="stat-value">₹{data.totalFeesRevenue.toLocaleString('en-IN')}</span><span className="stat-label">Platform + Mandi Fees</span></div>
            <div className="card stat-card"><span className="stat-value">{data.registeredMandis}</span><span className="stat-label">Registered Mandis</span></div>
          </div>
        )}
        <p className="muted" style={{ marginTop: 24 }}>
          User, lot, auction, payment and audit-log management tables live under their respective REST endpoints
          (<code>/api/users</code>, <code>/api/lots</code>, <code>/api/auctions</code>, <code>/api/payments</code>) — wire up
          additional admin table views here as the platform grows.
        </p>
      </DashboardLayout>
    </div>
  );
}
