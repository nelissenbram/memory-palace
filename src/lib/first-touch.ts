// First-touch attribution (SUCCESS_PLAYBOOK 1.3).
//
// On the very first page load we persist the acquisition context (UTM params,
// referrer, landing path) to localStorage. It never leaves the device on its
// own — it is only sent to PostHog as $set_once person properties when
// identify() fires, which is consent-gated and a no-op in the native shell.
// "If absent" semantics make this first-touch: later visits never overwrite it.

const KEY = "mp_first_touch";

export interface FirstTouch {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  landing_path: string;
  ts: string;
}

/** Persist first-touch attribution once, on the very first load. Safe to call on every mount. */
export function recordFirstTouch(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(KEY)) return; // first touch already captured — never overwrite
    const params = new URLSearchParams(window.location.search);
    const ft: FirstTouch = {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      referrer: document.referrer || null,
      landing_path: window.location.pathname,
      ts: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(ft));
  } catch {
    // localStorage unavailable (private mode / quota) — attribution is best-effort
  }
}

/** Read the stored first-touch record, or null if none / unreadable. */
export function getFirstTouch(): FirstTouch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FirstTouch) : null;
  } catch {
    return null;
  }
}

/** First-touch as $set_once-style person properties (only defined fields). */
export function firstTouchPersonProperties(): Record<string, unknown> | undefined {
  const ft = getFirstTouch();
  if (!ft) return undefined;
  return {
    first_utm_source: ft.utm_source,
    first_utm_medium: ft.utm_medium,
    first_utm_campaign: ft.utm_campaign,
    first_referrer: ft.referrer,
    first_landing_path: ft.landing_path,
    first_touch_ts: ft.ts,
  };
}
