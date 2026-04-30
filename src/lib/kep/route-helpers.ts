/**
 * Client-side helpers for Kep capture routing.
 */

import type { AiRoutingSuggestion, KepCapture } from "@/types/kep";

/**
 * Get a human-readable status label.
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending review",
    processed: "Awaiting routing",
    routed: "Routed to room",
    rejected: "Rejected",
    failed: "Failed",
  };
  return labels[status] || status;
}

/**
 * Get status color for UI badges.
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "#f59e0b",
    processed: "#3b82f6",
    routed: "#10b981",
    rejected: "#6b7280",
    failed: "#ef4444",
  };
  return colors[status] || "#6b7280";
}

/**
 * Format confidence percentage for display.
 */
export function formatConfidence(suggestion: AiRoutingSuggestion | null): string {
  if (!suggestion) return "";
  return `${Math.round(suggestion.confidence * 100)}%`;
}

/**
 * Get media type icon for display.
 */
export function getMediaTypeIcon(mediaType: string | null): string {
  const icons: Record<string, string> = {
    image: "🖼️",
    video: "🎬",
    audio: "🎤",
    text: "📝",
    document: "📄",
  };
  return icons[mediaType || ""] || "📎";
}

/**
 * Group captures by date for timeline display.
 */
export function groupCapturesByDate(captures: KepCapture[]): Record<string, KepCapture[]> {
  const groups: Record<string, KepCapture[]> = {};

  for (const capture of captures) {
    const date = new Date(capture.created_at).toLocaleDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(capture);
  }

  return groups;
}

/**
 * Check if a capture can be manually routed.
 */
export function canRoute(capture: KepCapture): boolean {
  return capture.status === "pending" || capture.status === "processed";
}

/**
 * Check if a capture can be rejected.
 */
export function canReject(capture: KepCapture): boolean {
  return capture.status === "pending" || capture.status === "processed";
}
