import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';
import OfflineBanner from './components/OfflineBanner';

// Route-level code splitting: each page ships as its own small chunk that
// only downloads when the user actually navigates there, instead of one
// large bundle everyone has to fetch up front. This matters a lot on slow
// or metered mobile connections, where the first load is what people churn
// on.
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const LiveAuctions = lazy(() => import('./pages/LiveAuctions'));
const AuctionRoom = lazy(() => import('./pages/AuctionRoom'));
const LotDetail = lazy(() => import('./pages/LotDetail'));
const PriceDashboard = lazy(() => import('./pages/PriceDashboard'));
const HowItWorks = lazy(() => import('./pages/HowItWorks'));

const FarmerDashboard = lazy(() => import('./pages/FarmerDashboard'));
const BuyerDashboard = lazy(() => import('./pages/BuyerDashboard'));
const MandiDashboard = lazy(() => import('./pages/MandiDashboard'));
const GateEntry = lazy(() => import('./pages/GateEntry'));
const QualityAssessment = lazy(() => import('./pages/QualityAssessment'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Profile = lazy(() => import('./pages/Profile'));

function PageFallback() {
  return (
    <div className="container flex-center" style={{ padding: 60 }}>
      <span className="muted">Loading…</span>
    </div>
  );
}

export default function App() {
  return (
    <>
      <OfflineBanner />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/lot/:id" element={<LotDetail />} />
          <Route path="/auctions" element={<LiveAuctions />} />
          <Route path="/auctions/:id" element={<AuctionRoom />} />
          <Route path="/prices" element={<PriceDashboard />} />
          <Route path="/how-it-works" element={<HowItWorks />} />

          <Route path="/farmer/dashboard" element={<ProtectedRoute role="farmer"><FarmerDashboard /></ProtectedRoute>} />

          <Route path="/buyer/dashboard" element={<ProtectedRoute role="buyer"><BuyerDashboard /></ProtectedRoute>} />

          <Route path="/mandi/dashboard" element={<ProtectedRoute role="mandi_staff"><MandiDashboard /></ProtectedRoute>} />
          <Route path="/mandi/gate-entry" element={<ProtectedRoute role="mandi_staff"><GateEntry /></ProtectedRoute>} />

          <Route path="/quality/dashboard" element={<ProtectedRoute role="quality_assessor"><QualityAssessment /></ProtectedRoute>} />

          <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </>
  );
}
