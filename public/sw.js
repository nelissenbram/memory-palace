// Self-destructing service worker — clears all caches, unregisters, and force-reloads all tabs
self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      return self.registration.unregister();
    }).then(function() {
      // Force all open tabs to reload with fresh content
      return self.clients.matchAll({ type: 'window' });
    }).then(function(clients) {
      clients.forEach(function(client) {
        client.navigate(client.url);
      });
    })
  );
});

// Pass everything straight to the network — no caching
self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});
