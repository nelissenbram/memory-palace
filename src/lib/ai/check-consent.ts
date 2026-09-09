import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Check whether a user has granted AI consent.
 *
 * @param supabase  Authenticated Supabase client
 * @param userId    The authenticated user's ID
 * @returns `{ ok: true }` if consented, or `{ ok: false, error: string }` if not.
 */
export async function checkAiConsent(
  supabase: SupabaseClient,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("ai_consent")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return { ok: false, error: "Could not verify AI consent" };
  }

  if (!profile.ai_consent) {
    return { ok: false, error: "AI consent required" };
  }

  return { ok: true };
}
