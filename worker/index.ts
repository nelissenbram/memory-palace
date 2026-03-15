// @ts-nocheck
// Custom service worker code for push notifications.
// This file is picked up by @ducanh2912/next-pwa and merged into the generated sw.js.
// We use @ts-nocheck because this runs in ServiceWorkerGlobalScope, not Window.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Memory Palace", body: event.data.text() };
  }

  const title = payload.title || "Memory Palace";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/apple-touch-icon.png",
    badge: payload.badge || "/favicon.svg",
    tag: payload.tag,
    data: { url: payload.url || "/palace" },
    vibrate: [100, 50, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/palace";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If there's already an open window, focus it and navigate
      for (const client of windowClients) {
        if ("focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise, open a new window
      return self.clients.openWindow(url);
    })
  );
});
