"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Update the user's last_seen_at timestamp.
 * Called from the palace on mount, throttled client-side to once per session.
 * This is critical for the legacy inactivity detection system.
 */
export async function updateLastSeen(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  // Auto-reset "triggered" status when user comes back online.
  // If the user was marked as inactive but has now returned, clear the
  // verification state so the inactivity timer restarts from scratch.
  const { data: settings } = await supabase
    .from("legacy_settings")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (settings?.status === "triggered") {
    await supabase
      .from("legacy_settings")
      .update({
        status: "active",
        verification_sent_at: null,
        verification_token: null,
        verification_expires_at: null,
        verifier_confirmation_token: null,
      })
      .eq("id", user.id);
  }
}
