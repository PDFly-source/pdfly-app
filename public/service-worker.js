// PDFly Service Worker - High Performance Local-First PWA Cache
const CACHE_NAME = 'pdfly-shell-v11';

// Core shell and assets to precache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/workspace',
  '/install',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.png',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-192x192.png',
  '/pwa-maskable-512x512.png',
  '/pdfly-mark.png',
  '/pdfly-logo.png',
  '/og-image.png'
];

// Install: Pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          PRECACHE_ASSETS.map((asset) =>
            cache.add(asset).catch((err) => {
              console.warn('[PDFly SW] Precache skip:', asset, err);
            })
          )
        );
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate: Clean up old or obsolete cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[PDFly SW] Cleaning obsolete cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Message listener for manual update triggers
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: Secure, selective routing strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only intercept standard GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // SECURITY RULE: NEVER cache API routes or dynamic AI completions
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Bypass non-http schemes (e.g. blob:, data:, chrome-extension:)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation requests (HTML documents) - Network First with Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback to app shell
          return caches.match('/') || caches.match('/install');
        })
    );
    return;
  }

  // 2. Next.js Script Chunks & Runtime: Network First with Cache Fallback
  // Prevents hydration mismatches by ensuring client JavaScript matches server HTML when online
  const isScriptOrChunk =
    url.pathname.startsWith('/_next/') ||
    url.pathname.endsWith('.js');

  if (isScriptOrChunk) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          return caches.match(request);
        })
    );
    return;
  }

  // 3. Static Media, Fonts, & Brand Assets - Cache First with Background Update
  const isStaticMedia =
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.css');

  if (isStaticMedia) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Stale-while-revalidate for static media in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});
