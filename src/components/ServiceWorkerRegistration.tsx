"use client";

import { useEffect } from "react";

// Version stamp — change on each deploy to force SW update detection
const APP_VERSION = "2026-03-15-v2";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) return;

    // On first load, clear ALL caches to bust stale PWA content
    const versionKey = "mp_app_version";
    const storedVersion = localStorage.getItem(versionKey);
    if (storedVersion !== APP_VERSION) {
      console.log(`[MP] Version changed: ${storedVersion} → ${APP_VERSION}, clearing caches`);
      caches.keys().then(names => {
        Promise.all(names.map(n => caches.delete(n))).then(() => {
          localStorage.setItem(versionKey, APP_VERSION);
          // Unregister old SW and reload to get fresh content
          navigator.serviceWorker.getRegistrations().then(regs => {
            Promise.all(regs.map(r => r.unregister())).then(() => {
              window.location.reload();
            });
          });
        });
      });
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered:", registration.scope);

        // Check for updates every 5 minutes (not 60)
        setInterval(() => { registration.update(); }, 1000 * 60 * 5);

        // When a new SW is waiting, activate it immediately
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated") {
              console.log("[MP] New service worker activated, reloading...");
              window.location.reload();
            }
          });
        });
      })
      .catch((error) => {
        console.log("SW registration failed:", error);
      });
  }, []);

  return null;
}
