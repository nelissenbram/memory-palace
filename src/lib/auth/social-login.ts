/**
 * Social login helpers for Google and Apple OAuth via Supabase Auth.
 *
 * Uses the custom auth domain (auth.thememorypalace.ai) so the Google/Apple
 * consent screen shows a branded domain instead of the raw Supabase project ref.
 *
 * Configuration:
 * - Google OAuth: configured in Supabase Dashboard > Authentication > Providers > Google
 * - Apple OAuth: configured in Supabase Dashboard > Authentication > Providers > Apple
 */

import { isNative } from "@/lib/native/platform";

const AUTH_BASE =
  process.env.NEXT_PUBLIC_SUPABASE_CUSTOM_AUTH_URL ||
  `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/auth/v1`;

function getRedirectUrl(): string {
  if (isNative()) {
    return "https://thememorypalace.ai/auth/callback";
  }
  return window.location.origin + "/auth/callback";
}

function oauthRedirect(provider: "google" | "apple") {
  // Generate CSRF state token — Supabase validates it on return via PKCE flow
  const state = crypto.randomUUID();
  sessionStorage.setItem("oauth_state", state);

  const params = new URLSearchParams({
    provider,
    redirect_to: getRedirectUrl(),
    scopes: provider === "google" ? "email profile" : "email name",
    state,
  });
  window.location.href = `${AUTH_BASE}/authorize?${params.toString()}`;
}

export async function signInWithGoogle() {
  oauthRedirect("google");
}

export async function signInWithApple() {
  oauthRedirect("apple");
}
