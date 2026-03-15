// Self-destructing service worker — clears all caches and unregisters itself
self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      console.log('[SW] All caches cleared, unregistering...');
      return self.registration.unregister();
    }).then(function() {
      return self.clients.matchAll();
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({ type: 'SW_CACHE_CLEARED' });
      });
    })
  );
});

// Don't intercept any requests — let everything go to the network
self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});
