import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import DashboardLayout from '../layouts/DashboardLayout';
import ShipmentTracker from '../components/ShipmentTracker';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function FarmerDashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [shipments, setShipments] = useState([]);

  const links = useMemo(() => [
    { to: '/farmer/dashboard', label: t('farmer.overview', 'Overview') },
    { to: '/marketplace', label: t('farmer.myProduce', 'My Produce') },
    { to: '/auctions', label: t('farmer.activeAuctions', 'Active Auctions') },
    { to: '/prices', label: t('farmer.priceIntel', 'AI Price Intelligence') },
  ], [t]);

  useEffect(() => {
    api.get('/dashboard/farmer').then((res) => setData(res.data.data));
    api.get('/logistics/mine').then((res) => setShipments(res.data.data)).catch(() => setShipments([]));
  }, []);

  const whatsappShareText = encodeURIComponent(
    `${t('farmer.whatsappMessage', 'Check out my crop harvest lot on KrishiSetu digital mandi auction platform:')} ${typeof window !== 'undefined' ? window.location.origin : ''}/marketplace`
  );

  return (
    <div>
      <Navbar />
      <DashboardLayout title={t('farmer.roleTitle', 'Farmer')} links={links}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <h1 className="section-title" style={{ margin: 0 }}>{t('farmer.overview', 'Overview')}</h1>
          <a
            href={`https://wa.me/?text=${whatsappShareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm"
            style={{ background: '#25D366', color: '#fff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <span>💬</span> {t('farmer.shareWhatsapp', 'Share on WhatsApp')}
          </a>
        </div>

        {!data ? <p className="muted">{t('farmer.loading', 'Loading…')}</p> : (
          <>
            <div className="grid grid-4">
              <div className="card stat-card"><span className="stat-value">{data.totalLots}</span><span className="stat-label">{t('farmer.totalLots', 'Total Lots')}</span></div>
              <div className="card stat-card"><span className="stat-value">{data.activeAuctions}</span><span className="stat-label">{t('farmer.activeAuctionsCard', 'Active Auctions')}</span></div>
              <div className="card stat-card"><span className="stat-value">{data.soldLots}</span><span className="stat-label">{t('farmer.soldLots', 'Sold Lots')}</span></div>
              <div className="card stat-card"><span className="stat-value">₹{data.totalSales.toLocaleString('en-IN')}</span><span className="stat-label">{t('farmer.totalSales', 'Total Sales')}</span></div>
            </div>

            <h2 className="section-title">{t('farmer.recentSettlements', 'Recent Settlements')}</h2>
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>{t('farmer.grossAmount', 'Gross Amount')}</th>
                    <th>{t('farmer.feesCommission', 'Fees + Commission')}</th>
                    <th>{t('farmer.youReceive', 'You Receive')}</th>
                    <th>{t('farmer.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSettlements.map((s) => (
                    <tr key={s._id}>
                      <td>₹{s.grossAmount.toLocaleString('en-IN')}</td>
                      <td>₹{(s.mandiFee + s.platformFee + s.commission).toLocaleString('en-IN')}</td>
                      <td><strong>₹{s.farmerAmount.toLocaleString('en-IN')}</strong></td>
                      <td><span className="badge badge-green">{s.status}</span></td>
                    </tr>
                  ))}
                  {data.recentSettlements.length === 0 && <tr><td colSpan={4} className="muted">{t('farmer.noSettlements', 'No settlements yet.')}</td></tr>}
                </tbody>
              </table>
            </div>

            {shipments.length > 0 && (
              <>
                <h2 className="section-title">{t('farmer.myShipments', 'My Shipments')}</h2>
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
