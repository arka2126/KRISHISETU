import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, languages, t } = useLanguage();
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
          <Link to="/" onClick={closeMenu}>{t('nav.home', 'Home')}</Link>
          <Link to="/marketplace" onClick={closeMenu}>{t('nav.marketplace', 'Marketplace')}</Link>
          <Link to="/auctions" onClick={closeMenu}>{t('nav.liveAuctions', 'Live Auctions')}</Link>
          <Link to="/prices" onClick={closeMenu}>{t('nav.priceIntel', 'AI Price Intelligence')}</Link>
          <Link to="/how-it-works" onClick={closeMenu}>{t('nav.howItWorks', 'How It Works')}</Link>
          
          <div className="lang-picker-container" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 4px' }}>
            <span style={{ fontSize: 15 }} title={t('nav.selectLanguage', 'Language')}>🌐</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label={t('nav.selectLanguage', 'Select Language')}
              style={{
                background: 'var(--gray-100, #f3f4f6)',
                border: '1px solid var(--gray-300, #d1d5db)',
                borderRadius: 6,
                padding: '4px 6px',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--gray-800, #1f2937)',
                cursor: 'pointer',
              }}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} ({l.label})
                </option>
              ))}
            </select>
          </div>

          {user ? (
            <>
              <Link to={dashboardPath || '/'} className="btn btn-secondary btn-sm" onClick={closeMenu}>
                {t('nav.dashboard', 'Dashboard')}
              </Link>
              <Link to="/profile" title={t('nav.profile', 'Profile')} className="logo-mark" style={{ width: 32, height: 32, fontSize: 14, textDecoration: 'none' }} onClick={closeMenu}>
                {user.name?.[0]?.toUpperCase() || '?'}
              </Link>
              <button className="btn btn-primary btn-sm" onClick={() => { logout(); closeMenu(); navigate('/'); }}>
                {t('nav.logout', 'Logout')}
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu}>{t('nav.login', 'Login')}</Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={closeMenu}>
                {t('nav.register', 'Register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
