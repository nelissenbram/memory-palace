// Service Worker — clears old caches and serves fresh content
// Generated to replace stale PWA cache from previous builds

const CACHE_VERSION = 'v2026-04-06c';

// Activate immediately, take control
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete ALL old caches to force fresh content
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      // Notify all clients to reload for fresh content
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED' }));
      });
    })
  );
});

// Network-first for everything — ensures users always get fresh content
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Let the browser handle it normally (no caching)
  return;
});
