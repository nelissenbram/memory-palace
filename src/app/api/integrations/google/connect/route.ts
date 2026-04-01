import { NextResponse } from "next/server";
import { getAuthenticatedUser, getBaseUrl, generateOAuthState, generateCodeVerifier, computeCodeChallenge } from "@/lib/integrations/helpers";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();

    if (!(await checkRateLimit(`${user.id}:oauth-connect`, 5, 60_000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "Google OAuth not configured" }, { status: 503 });
    }

    const state = generateOAuthState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = computeCodeChallenge(codeVerifier);
    const redirectUri = `${getBaseUrl()}/api/integrations/google/callback`;
    const scopes = [
      "https://www.googleapis.com/auth/photoslibrary.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    const response = NextResponse.redirect(authUrl);

    // Store state in an HttpOnly cookie for CSRF verification in the callback
    response.cookies.set("oauth_state_google", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    // Store PKCE code_verifier in an HttpOnly cookie for the token exchange
    response.cookies.set("oauth_pkce_google", codeVerifier, {
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
