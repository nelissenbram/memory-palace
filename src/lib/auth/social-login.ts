/**
 * Social login helpers for Google and Apple OAuth via Supabase Auth.
 *
 * Configuration:
 * - Google OAuth: configured in Supabase Dashboard > Authentication > Providers > Google
 * - Apple OAuth: configured in Supabase Dashboard > Authentication > Providers > Apple
 * - No additional env vars are needed in the Next.js app — Supabase handles the OAuth flow.
 */

import { createClient } from "@/lib/supabase/client";

export async function signInWithGoogle() {
  const supabase = createClient();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/auth/callback",
    },
  });
}

export async function signInWithApple() {
  const supabase = createClient();
  return supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: window.location.origin + "/auth/callback",
    },
  });
}
