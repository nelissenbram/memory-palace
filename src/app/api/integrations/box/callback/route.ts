import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import { getAuthenticatedUser, getBaseUrl, upsertConnectedAccount } from "@/lib/integrations/helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserInfo } from "@/lib/integrations/box";

// NOTE: Box OAuth 2.0 does not support PKCE (code_challenge / code_verifier).
// PKCE is intentionally omitted for this provider.

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const baseUrl = getBaseUrl();

    if (!(await checkRateLimit(`${user.id}:oauth-callback`, 10, 60_000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");
    const state = request.nextUrl.searchParams.get("state");

    if (error) {
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=auth_failed&provider=box`);
    }
    if (!code) {
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=auth_failed&provider=box`);
    }

    // Verify CSRF state parameter
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state_box")?.value;
    const stateMatch = state && storedState && state.length === storedState.length && timingSafeEqual(Buffer.from(state), Buffer.from(storedState));
    if (!stateMatch) {
      const resp = NextResponse.redirect(`${baseUrl}/settings/connections?error=invalid_state&provider=box`);
      resp.cookies.delete("oauth_state_box");
      return resp;
    }

    // Box requires redirect_uri in the token exchange body
    const redirectUri = `${baseUrl}/api/integrations/box/callback`;
    const tokenRes = await fetch("https://api.box.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.BOX_CLIENT_ID!,
        client_secret: process.env.BOX_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error(`Box token exchange failed (HTTP ${tokenRes.status})`);
      const resp = NextResponse.redirect(`${baseUrl}/settings/connections?error=auth_failed&provider=box`);
      resp.cookies.delete("oauth_state_box");
      return resp;
    }

    const tokens = await tokenRes.json();

    let providerEmail = "";
    let providerUserId = "";
    try {
      const info = await getUserInfo(tokens.access_token);
      providerEmail = info.email;
      providerUserId = info.id;
    } catch { /* ignore */ }

    await upsertConnectedAccount({
      userId: user.id,
      provider: "box",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenExpiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      providerUserId,
      providerEmail,
    });

    const resp = NextResponse.redirect(`${baseUrl}/settings/connections?connected=box`);
    resp.cookies.delete("oauth_state_box");
    return resp;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Box OAuth callback error:", message);
    return NextResponse.redirect(`${getBaseUrl()}/settings/connections?error=auth_failed&provider=box`);
  }
}
