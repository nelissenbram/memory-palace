/**
 * Social login helpers for Google and Apple OAuth via Supabase Auth.
 *
 * On web: uses standard Supabase redirect (navigates to OAuth provider).
 * On native iOS/Android: uses skipBrowserRedirect + Capacitor Browser plugin
 * so the OAuth flow opens in SFSafariViewController (in-app browser sheet)
 * instead of external Safari. This satisfies Apple Guideline 4 (Design).
 */

import { createClient } from "@/lib/supabase/client";
import { isNative } from "@/lib/native/platform";

async function openOAuthInApp(url: string) {
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url, presentationStyle: "popover" });
}

export async function signInWithGoogle() {
  const supabase = createClient();
  const redirectTo = window.location.origin + "/auth/callback";

  if (isNative()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error || !data.url) {
      console.error("[OAuth] Google error:", error);
      return;
    }
    await openOAuthInApp(data.url);
    return;
  }

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

  if (isNative()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) {
      console.error("[OAuth] Apple error:", error);
      return;
    }
    await openOAuthInApp(data.url);
    return;
  }

  await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo,
    },
  });
}
