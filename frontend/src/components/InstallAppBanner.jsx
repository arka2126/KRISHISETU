import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function InstallAppBanner() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed previously this session
    try {
      if (sessionStorage.getItem('ks_pwa_dismissed')) {
        setDismissed(true);
      }
    } catch {
      // Ignore sessionStorage errors
    }

    const handler = (e) => {
      // Prevent the mini-infobar from appearing automatically on mobile
      e.preventDefault();
      // Stash the event so it can be triggered on demand
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('ks_pwa_dismissed', 'true');
    } catch {
      // Ignore
    }
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: '92%',
        maxWidth: 480,
        background: '#ffffff',
        border: '1px solid var(--green-600, #1f6b3f)',
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 26 }}>🌾</span>
        <div>
          <strong style={{ fontSize: 14, color: 'var(--green-800, #14432a)', display: 'block' }}>
            {t('pwa.installTitle', 'Install KrishiSetu App')}
          </strong>
          <span className="muted" style={{ fontSize: 12, lineHeight: 1.3 }}>
            {t('pwa.installDesc', 'Add to phone screen for fast auctions and offline mandi rates.')}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <button
          onClick={handleInstallClick}
          className="btn btn-primary btn-sm"
          style={{ whiteSpace: 'nowrap', fontWeight: 600, padding: '6px 12px' }}
        >
          {t('pwa.installBtn', 'Install App')}
        </button>
        <button
          onClick={handleDismiss}
          aria-label={t('pwa.dismiss', 'Dismiss')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--gray-500, #6b7280)',
            cursor: 'pointer',
            fontSize: 16,
            padding: '4px',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
