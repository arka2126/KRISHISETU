// Small fixed banner that tells the user when their device has lost internet
// connectivity. Matters a lot on mobile/Android where connections drop
// often (lifts, basements, moving between towers) — without this, pages
// just silently fail to load with no explanation.
import React, { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--danger, #d64545)',
        color: '#fff',
        textAlign: 'center',
        padding: '8px 12px',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      You're offline — some features won't work until your connection is back.
    </div>
  );
}
