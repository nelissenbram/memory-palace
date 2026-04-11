"use client";

import { useEffect } from "react";

// Version stamp — change on each deploy to force SW update detection
const APP_VERSION = "2026-04-10-v4";

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
      // Guard against infinite reload loops (e.g. if localStorage.setItem fails)
      const reloadCountKey = "mp_reload_count";
      const reloadCount = parseInt(sessionStorage.getItem(reloadCountKey) || "0", 10);
      if (reloadCount >= 2) {
        console.warn("[MP] Reload limit reached, skipping cache clear to prevent loop");
        return;
      }
      console.log(`[MP] Version changed: ${storedVersion} → ${APP_VERSION}, clearing caches`);
      caches.keys().then(names => {
        Promise.all(names.map(n => caches.delete(n))).then(() => {
          try { localStorage.setItem(versionKey, APP_VERSION); } catch (e) { console.warn("[MP] Could not persist version:", e); }
          // Track reload attempts in sessionStorage
          try { sessionStorage.setItem(reloadCountKey, String(reloadCount + 1)); } catch {}
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
        console.error("SW registration failed:", error);
      });
  }, []);

  return null;
}
