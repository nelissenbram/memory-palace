import { Capacitor } from "@capacitor/core";

/**
 * Request an in-app rating/review prompt.
 * Uses the native App Store (iOS) or Play Store (Android) review dialog.
 * Falls back to no-op on web.
 *
 * Trigger conditions (caller is responsible):
 * - After 3rd achievement unlocked, OR after 25th memory created
 * - Not during onboarding or upload
 * - Max once per 90 days (tracked via localStorage)
 */
export async function requestAppRating(): Promise<boolean> {
  // Rate limit: once per 90 days
  const STORAGE_KEY = "mp_last_rating_prompt";
  const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

  try {
    const last = localStorage.getItem(STORAGE_KEY);
    if (last && Date.now() - parseInt(last, 10) < COOLDOWN_MS) {
      return false;
    }
  } catch {}

  if (!Capacitor.isNativePlatform()) return false;

  try {
    const { RateApp } = await import("capacitor-rate-app");
    await RateApp.requestReview();
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
    return true;
  } catch {
    return false;
  }
}
