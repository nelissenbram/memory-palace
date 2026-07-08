"use client";
import { useState, useCallback } from "react";
import { signOut } from "@/lib/auth/actions";

/**
 * Hook that wraps signOut with immediate visual feedback.
 * Shows a full-screen overlay and navigates to /login once the session is
 * actually cleared.
 */
export function useSignOut() {
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return; // re-entrancy guard — a second tap must not race
    setSigningOut(true);

    // Single-shot navigation: fallback and the normal path must never both fire
    // (the old double window.location.href could interrupt the in-flight load and
    // strand the loading veil = blank "Memory Palace" screen).
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.location.href = "/login";
    };
    // Hang-guard ONLY — well above realistic latency. The old 3s fallback fired
    // WHILE the signOut POST was still in flight, aborting the cookie-clearing
    // response so the session survived ("signed out but re-login auto-logs-in").
    const guard = setTimeout(go, 8000);

    // Clear stale per-user client state so the next account on this device doesn't
    // inherit it (onboarding is keyed in localStorage; keep mp_locale/theme).
    try {
      ["mp_onboarding_phase", "mp_onboarding_walk_done", "mp_discovery_menu_shown", "mp_user_goal"]
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* non-critical */ }

    // Server revoke first: its POST still carries the live cookies, so the server
    // clears them (and actions.signOut unconditionally expires the sb-* cookies).
    const server = signOut().catch(() => {});
    // Then clear THIS device's browser session deterministically — @supabase/ssr
    // cookies are not HttpOnly, so the browser client removes them via
    // document.cookie and stops the in-memory autoRefresh timer that could
    // otherwise re-mint a session on the still-mounted native WebView.
    try {
      const { createClient } = await import("@/lib/supabase/client");
      await createClient().auth.signOut({ scope: "local" });
    } catch { /* best-effort — the server action + cookie purge is authoritative */ }

    await server;
    clearTimeout(guard);
    go();
  }, [signingOut]);

  return { signingOut, handleSignOut };
}
