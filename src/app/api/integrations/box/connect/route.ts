import { NextResponse } from "next/server";
import { getAuthenticatedUser, getBaseUrl, generateOAuthState } from "@/lib/integrations/helpers";
import { checkRateLimit } from "@/lib/rate-limit";

// NOTE: Box OAuth 2.0 does not support PKCE (code_challenge / code_verifier).
// PKCE is intentionally omitted for this provider.

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();

    if (!(await checkRateLimit(`${user.id}:oauth-connect`, 5, 60_000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const clientId = process.env.BOX_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "Box OAuth not configured" }, { status: 503 });
    }

    const state = generateOAuthState();
    const redirectUri = `${getBaseUrl()}/api/integrations/box/callback`;
    // Box OAuth has no select_account/prompt/force-reauth param (unlike Google/Microsoft/Dropbox),
    // so we cannot force an account picker here for the wrong-account-linked bug. Box shows its own
    // login screen whenever no matching Box/SSO session exists in the browser.
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });

    const authUrl = `https://account.box.com/api/oauth2/authorize?${params}`;
    const response = NextResponse.redirect(authUrl);

    response.cookies.set("oauth_state_box", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message === "Not authenticated") {
      return NextResponse.redirect(`${getBaseUrl()}/login`);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
