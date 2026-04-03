/**
 * Service Worker for The Memory Palace
 *
 * Handles:
 * - Push notification display
 * - Notification click routing
 * - Basic offline caching for the app shell
 */

const CACHE_NAME = "mp-cache-v1";

// ── Push notification handling ──

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Memory Palace",
      body: event.data.text(),
    };
  }

  const options = {
    body: payload.body || "",
    icon: payload.icon || "/apple-touch-icon.png",
    badge: payload.badge || "/icons/icon-192x192.png",
    tag: payload.tag || "mp-notification",
    data: {
      url: payload.url || "/palace",
    },
    vibrate: [100, 50, 100],
    actions: [],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "Memory Palace", options)
  );
});

// ── Notification click handling ──

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/palace";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if one is open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      return clients.openWindow(url);
    })
  );
});

// ── Install: pre-cache app shell ──

self.addEventListener("install", (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// ── Activate: clean up old caches ──

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// ── Fetch: network-first strategy with cache fallback ──

self.addEventListener("fetch", (event) => {
  // Only cache GET requests, skip API calls and auth
  if (
    event.request.method !== "GET" ||
    event.request.url.includes("/api/") ||
    event.request.url.includes("/auth/")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fall back to cache on network failure
        return caches.match(event.request);
      })
  );
});
