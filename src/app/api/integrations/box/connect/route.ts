import { NextResponse } from "next/server";
import { getAuthenticatedUser, getBaseUrl, checkRateLimit, generateOAuthState } from "@/lib/integrations/helpers";

// NOTE: Box OAuth 2.0 does not support PKCE (code_challenge / code_verifier).
// PKCE is intentionally omitted for this provider.

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();

    if (!checkRateLimit(`${user.id}:oauth-connect`, 5, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const clientId = process.env.BOX_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "Box OAuth not configured" }, { status: 503 });
    }

    const state = generateOAuthState();
    const redirectUri = `${getBaseUrl()}/api/integrations/box/callback`;
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
