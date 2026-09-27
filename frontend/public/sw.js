// Minimal service worker for offline resilience on flaky mobile connections.
//
// What it does:
//  - caches the built app shell (JS/CSS/fonts/images) with a cache-first
//    strategy, so once someone has loaded the app it opens instantly even
//    with zero signal
//  - serves the cached shell as a fallback for page navigations when the
//    network is unreachable, instead of a browser "no internet" error page
//  - NEVER caches /api/ or /socket.io/ traffic — that's live, per-user,
//    auth-sensitive data and must always go to the network
//
// Bump this on every deploy so old clients pick up the new build instead of
// being stuck on a stale cached shell.
const CACHE_NAME = 'krishisetu-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Always hit the network for API calls and websocket handshakes — never
  // serve stale bidding/pricing/auth data from cache.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    return;
  }

  // Page navigations: try the network first (fresh app), fall back to the
  // cached shell if the device is offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static build assets (hashed JS/CSS/images): cache-first, refresh in the
  // background so the next load picks up updates.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
