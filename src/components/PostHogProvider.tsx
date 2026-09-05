"use client";
import { useEffect } from "react";
import { identify, initAnalytics } from "@/lib/analytics";
import { firstTouchPersonProperties, recordFirstTouch } from "@/lib/first-touch";
import { createClient } from "@/lib/supabase/client";

/**
 * Identify the current authed user to PostHog (SUCCESS_PLAYBOOK 1.3).
 * Idempotent — posthog-js dedupes repeat identify() calls for the same id —
 * and consent-gated / native no-op inside identify() itself. Attaches the
 * stored first-touch attribution as $set_once person properties so the first
 * acquisition source survives on the person forever.
 *
 * Uses getSession() (local read, no network) — we only need the uid for
 * analytics identity, not a server-verified user.
 */
export async function identifyCurrentUser(): Promise<void> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    identify(uid, undefined, firstTouchPersonProperties());
  } catch {
    // analytics must never break the app shell
  }
}

export default function PostHogProvider() {
  useEffect(() => {
    // Persist first-touch attribution on the very first load (localStorage only;
    // sent to PostHog exclusively via consent-gated identify()).
    recordFirstTouch();

    // Init (no-op without consent / in native), then identify any existing
    // session; re-identify on every auth transition (email login redirect,
    // OAuth callback return, token restore) so ≥90% of signups get identified.
    let unsub: (() => void) | undefined;
    initAnalytics().then(() => {
      void identifyCurrentUser();
      try {
        const supabase = createClient();
        const { data: sub } = supabase.auth.onAuthStateChange((event) => {
          if (event === "SIGNED_IN" || event === "INITIAL_SESSION") void identifyCurrentUser();
        });
        unsub = () => sub.subscription.unsubscribe();
      } catch {
        // supabase env missing (e.g. preview shells) — skip auth-driven identify
      }
    });
    return () => unsub?.();
  }, []);
  return null;
}
