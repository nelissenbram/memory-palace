import { NextResponse } from "next/server";
import { getAuthenticatedUser, getBaseUrl, checkRateLimit, generateOAuthState, generateCodeVerifier, computeCodeChallenge } from "@/lib/integrations/helpers";

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();

    if (!checkRateLimit(`${user.id}:oauth-connect`, 5, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const appKey = process.env.DROPBOX_APP_KEY;
    if (!appKey) {
      return NextResponse.json({ error: "Dropbox OAuth not configured" }, { status: 503 });
    }

    const state = generateOAuthState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = computeCodeChallenge(codeVerifier);
    const redirectUri = `${getBaseUrl()}/api/integrations/dropbox/callback`;
    const params = new URLSearchParams({
      client_id: appKey,
      redirect_uri: redirectUri,
      response_type: "code",
      token_access_type: "offline",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `https://www.dropbox.com/oauth2/authorize?${params}`;
    const response = NextResponse.redirect(authUrl);

    response.cookies.set("oauth_state_dropbox", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    // Store PKCE code_verifier in an HttpOnly cookie for the token exchange
    response.cookies.set("oauth_pkce_dropbox", codeVerifier, {
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
