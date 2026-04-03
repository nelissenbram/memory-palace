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

    // In production, send to analytics endpoint when one is configured.
    // TODO: send poor metrics to analytics/monitoring service
    if (process.env.NODE_ENV === "production" && metric.rating === "poor") {
      // Placeholder: integrate with analytics provider
    }
  });

  return null;
}
