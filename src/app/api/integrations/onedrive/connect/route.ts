import { NextResponse } from "next/server";
import { getAuthenticatedUser, getBaseUrl, generateOAuthState, generateCodeVerifier, computeCodeChallenge } from "@/lib/integrations/helpers";

export async function GET() {
  try {
    await getAuthenticatedUser();

    const clientId = process.env.ONEDRIVE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "OneDrive OAuth not configured" }, { status: 500 });
    }

    const state = generateOAuthState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = computeCodeChallenge(codeVerifier);
    const redirectUri = `${getBaseUrl()}/api/integrations/onedrive/callback`;
    const scopes = [
      "Files.Read",
      "Files.Read.All",
      "User.Read",
      "offline_access",
    ];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      response_mode: "query",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
    const response = NextResponse.redirect(authUrl);

    response.cookies.set("oauth_state_onedrive", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    // Store PKCE code_verifier in an HttpOnly cookie for the token exchange
    response.cookies.set("oauth_pkce_onedrive", codeVerifier, {
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
