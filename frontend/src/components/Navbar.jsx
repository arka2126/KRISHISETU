import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const dashboardPath = {
    farmer: '/farmer/dashboard',
    buyer: '/buyer/dashboard',
    mandi_staff: '/mandi/dashboard',
    quality_assessor: '/quality/dashboard',
    admin: '/admin/dashboard',
  }[user?.role];

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="logo" onClick={closeMenu}>
          <span className="logo-mark">🌾</span> KrishiSetu
        </Link>

        <button
          className="nav-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <div className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
          <Link to="/" onClick={closeMenu}>Home</Link>
          <Link to="/marketplace" onClick={closeMenu}>Marketplace</Link>
          <Link to="/auctions" onClick={closeMenu}>Live Auctions</Link>
          <Link to="/prices" onClick={closeMenu}>AI Price Intelligence</Link>
          <Link to="/how-it-works" onClick={closeMenu}>How It Works</Link>
          {user ? (
            <>
              <Link to={dashboardPath || '/'} className="btn btn-secondary btn-sm" onClick={closeMenu}>Dashboard</Link>
              <Link to="/profile" title="My Profile" className="logo-mark" style={{ width: 32, height: 32, fontSize: 14, textDecoration: 'none' }} onClick={closeMenu}>
                {user.name?.[0]?.toUpperCase() || '?'}
              </Link>
              <button className="btn btn-primary btn-sm" onClick={() => { logout(); closeMenu(); navigate('/'); }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu}>Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={closeMenu}>Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
