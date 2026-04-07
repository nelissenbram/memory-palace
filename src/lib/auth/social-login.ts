/**
 * Social login helpers for Google and Apple OAuth via Supabase Auth.
 *
 * Uses the Supabase SDK's signInWithOAuth() which properly handles PKCE
 * (stores code_verifier in cookies so exchangeCodeForSession works).
 */

import { createClient } from "@/lib/supabase/client";

export async function signInWithGoogle() {
  const supabase = createClient();
  const redirectTo = window.location.origin + "/auth/callback";

  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
}

export async function signInWithApple() {
  const supabase = createClient();
  const redirectTo = window.location.origin + "/auth/callback";

  await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo,
    },
  });
}
