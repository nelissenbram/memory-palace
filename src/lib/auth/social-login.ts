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

// Where Supabase sends the user back after the OAuth provider step.
// - Web: the standard same-origin callback page.
// - Native: a CUSTOM-SCHEME url. iOS does not reliably fire an https Universal
//   Link for the OAuth redirect chain inside the in-app auth sheet, which left
//   the app frozen on the login page. A custom scheme is handed back to the app
//   by the OS every time (intercepted in src/lib/native/deep-links.ts).
//   ⚠️ This scheme MUST be allowlisted in Supabase → Authentication → URL
//   Configuration → Redirect URLs, or Supabase rejects the redirect.
const NATIVE_OAUTH_REDIRECT = "ai.thememorypalace.app://auth/callback";

// Only deep-link destinations the password path also honors (actions.ts
// allowlist) may be threaded through OAuth — never an arbitrary open redirect.
function safeDeepLink(redirect?: string | null): string | null {
  if (redirect && (redirect.startsWith("/invite/") || redirect.startsWith("/kep/"))) {
    return redirect;
  }
  return null;
}

function callbackRedirect(redirect?: string | null): string {
  const base = isNative() ? NATIVE_OAUTH_REDIRECT : window.location.origin + "/auth/callback";
  const dest = safeDeepLink(redirect);
  return dest ? `${base}?redirect=${encodeURIComponent(dest)}` : base;
}

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
  // Default full-screen sheet — NOT "popover". On iPad a popover-presented
  // SFSafariViewController does not reliably hand first-responder back to the
  // WKWebView when dismissed, leaving the app tap-dead after login until a
  // force-quit (Apple 2.1a). The full-screen sheet dismissal restores touch
  // input cleanly. This is still an in-app browser, so Guideline 4 is satisfied.
  await Browser.open({ url });
}

type OAuthOpts = { onDismiss?: () => void; redirect?: string | null };

export async function signInWithGoogle(opts?: OAuthOpts): Promise<{ error?: string }> {
  const supabase = createClient();
  const redirectTo = callbackRedirect(opts?.redirect);

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
  const redirectTo = callbackRedirect(opts?.redirect);

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
