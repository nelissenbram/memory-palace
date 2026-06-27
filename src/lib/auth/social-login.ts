/**
 * Social login helpers for Google and Apple OAuth via Supabase Auth.
 *
 * On web: uses standard Supabase redirect (navigates to OAuth provider).
 * On native iOS/Android: uses skipBrowserRedirect + Capacitor Browser plugin
 * so the OAuth flow opens in SFSafariViewController (in-app browser sheet)
 * instead of external Safari. This satisfies Apple Guideline 4 (Design).
 *
 * Robustness (Apple Guideline 2.1 "not responsive"): the in-app auth sheet is
 * a separate context, so if the user cancels it — or the provider flow fails —
 * the calling screen must NOT be left on a dead spinner. We register a
 * `browserFinished` listener that resets the pending UI when the sheet closes
 * without a successful redirect. Successful logins are navigated by
 * initDeepLinkListener()'s `appUrlOpen` handler. We also return an error string
 * so the button can surface failures instead of silently doing nothing.
 */

import { createClient } from "@/lib/supabase/client";
import { isNative } from "@/lib/native/platform";

let browserListenerAdded = false;
let pendingReset: (() => void) | null = null;

async function ensureBrowserDismissReset() {
  const { Browser } = await import("@capacitor/browser");
  if (browserListenerAdded) return;
  browserListenerAdded = true;
  // Fires when the SFSafariViewController sheet is dismissed (user swipes it
  // away, or it closes after a failed flow). If a successful redirect occurred,
  // appUrlOpen already navigated the app; this just clears a stuck spinner.
  Browser.addListener("browserFinished", () => {
    const cb = pendingReset;
    pendingReset = null;
    if (cb) cb();
  });
}

async function openOAuthInApp(url: string) {
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url, presentationStyle: "popover" });
}

type OAuthOpts = { onDismiss?: () => void };

export async function signInWithGoogle(opts?: OAuthOpts): Promise<{ error?: string }> {
  const supabase = createClient();
  const redirectTo = window.location.origin + "/auth/callback";

  if (isNative()) {
    await ensureBrowserDismissReset();
    pendingReset = opts?.onDismiss ?? null;
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
      pendingReset = null;
      return { error: error?.message || "Could not start Google sign-in. Please try again." };
    }
    await openOAuthInApp(data.url);
    return {};
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
  return {};
}

export async function signInWithApple(opts?: OAuthOpts): Promise<{ error?: string }> {
  const supabase = createClient();
  const redirectTo = window.location.origin + "/auth/callback";

  if (isNative()) {
    await ensureBrowserDismissReset();
    pendingReset = opts?.onDismiss ?? null;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) {
      console.error("[OAuth] Apple error:", error);
      pendingReset = null;
      return { error: error?.message || "Could not start Apple sign-in. Please try again." };
    }
    await openOAuthInApp(data.url);
    return {};
  }

  await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo,
    },
  });
  return {};
}
