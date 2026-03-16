/**
 * Social login helpers for Google and Apple OAuth via Supabase Auth.
 *
 * Configuration:
 * - Google OAuth: configured in Supabase Dashboard > Authentication > Providers > Google
 * - Apple OAuth: configured in Supabase Dashboard > Authentication > Providers > Apple
 * - No additional env vars are needed in the Next.js app — Supabase handles the OAuth flow.
 */

import { createClient } from "@/lib/supabase/client";
import { isNative } from "@/lib/native/platform";

function getRedirectUrl(): string {
  // In Capacitor, window.location.origin is "https://localhost" which won't work
  // for OAuth callbacks. Use the production URL so Android App Links can
  // intercept the redirect and open it back in the app.
  if (isNative()) {
    return "https://thememorypalace.ai/auth/callback";
  }
  return window.location.origin + "/auth/callback";
}

export async function signInWithGoogle() {
  const supabase = createClient();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getRedirectUrl(),
    },
  });
}

export async function signInWithApple() {
  const supabase = createClient();
  return supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: getRedirectUrl(),
    },
  });
}
