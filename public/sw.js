// __BUILD_ID__ is stamped with a content hash by scripts/stamp-sw.mjs at build time.
const CACHE_PREFIX = 'midnightledger-app-';
const CACHE_NAME = `${CACHE_PREFIX}__BUILD_ID__`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

async function cacheResponse(request, response) {
  if (!response || !response.ok) return;
  const copy = response.clone();
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, copy);
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Financial API traffic is never served from or written to the app cache.
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          void cacheResponse('/index.html', response);
          return response;
        })
        .catch(() => caches.match('/index.html').then(cached => cached || Response.error())),
    );
    return;
  }

  // Hashed /assets/ files are immutable; other same-origin static files are
  // refreshed by the versioned cache on each deployment.
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      void cacheResponse(request, response);
      return response;
    })),
  );
});
