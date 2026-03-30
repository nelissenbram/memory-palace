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
}
