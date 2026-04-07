"use client";

import { useReportWebVitals } from "next/web-vitals";

export default function WebVitals() {
  useReportWebVitals((metric) => {
    // In development, log to console for debugging
    if (process.env.NODE_ENV === "development") {
      console.log(`[Web Vital] ${metric.name}:`, {
        value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
        rating: metric.rating, // "good" | "needs-improvement" | "poor"
        id: metric.id,
      });
    }

    // In production, report poor metrics.
    // When /api/analytics/vitals exists, the fetch call will deliver data;
    // until then the request silently fails and the console.warn provides
    // structured output for log-aggregation tools (e.g. Vercel Log Drain).
    if (process.env.NODE_ENV === "production" && metric.rating === "poor") {
      const payload = {
        name: metric.name,
        value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
        rating: metric.rating,
        id: metric.id,
        page: window.location.pathname,
        timestamp: Date.now(),
      };

      console.warn("[Web Vital][poor]", JSON.stringify(payload));

      // Fire-and-forget beacon to analytics endpoint (gracefully ignored if route doesn't exist)
      try {
        if (typeof navigator.sendBeacon === "function") {
          navigator.sendBeacon(
            "/api/analytics/vitals",
            new Blob([JSON.stringify(payload)], { type: "application/json" }),
          );
        } else {
          fetch("/api/analytics/vitals", {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" },
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Silently ignore — endpoint may not exist yet
      }
    }
  });

  return null;
}
