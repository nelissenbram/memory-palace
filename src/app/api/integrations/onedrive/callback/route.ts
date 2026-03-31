import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import { getAuthenticatedUser, getBaseUrl, checkRateLimit, upsertConnectedAccount } from "@/lib/integrations/helpers";
import { getUserInfo } from "@/lib/integrations/onedrive";

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const baseUrl = getBaseUrl();

    if (!checkRateLimit(`${user.id}:oauth-callback`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");
    const state = request.nextUrl.searchParams.get("state");

    if (error) {
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=auth_failed&provider=onedrive`);
    }
    if (!code) {
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=auth_failed&provider=onedrive`);
    }

    // Verify CSRF state parameter
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state_onedrive")?.value;
    const stateMatch = state && storedState && state.length === storedState.length && timingSafeEqual(Buffer.from(state), Buffer.from(storedState));
    if (!stateMatch) {
      const resp = NextResponse.redirect(`${baseUrl}/settings/connections?error=invalid_state&provider=onedrive`);
      resp.cookies.delete("oauth_state_onedrive");
      resp.cookies.delete("oauth_pkce_onedrive");
      return resp;
    }

    // Retrieve PKCE code_verifier from cookie
    const codeVerifier = cookieStore.get("oauth_pkce_onedrive")?.value;
    if (!codeVerifier) {
      const resp = NextResponse.redirect(`${baseUrl}/settings/connections?error=auth_failed&provider=onedrive`);
      resp.cookies.delete("oauth_state_onedrive");
      resp.cookies.delete("oauth_pkce_onedrive");
      return resp;
    }

    const redirectUri = `${baseUrl}/api/integrations/onedrive/callback`;
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.ONEDRIVE_CLIENT_ID!,
        client_secret: process.env.ONEDRIVE_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("OneDrive token exchange failed:", errText);
      const resp = NextResponse.redirect(`${baseUrl}/settings/connections?error=auth_failed&provider=onedrive`);
      resp.cookies.delete("oauth_state_onedrive");
      resp.cookies.delete("oauth_pkce_onedrive");
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
      provider: "onedrive",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenExpiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      providerUserId,
      providerEmail,
    });

    const resp = NextResponse.redirect(`${baseUrl}/settings/connections?connected=onedrive`);
    resp.cookies.delete("oauth_state_onedrive");
    resp.cookies.delete("oauth_pkce_onedrive");
    return resp;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("OneDrive OAuth callback error:", message);
    return NextResponse.redirect(`${getBaseUrl()}/settings/connections?error=auth_failed&provider=onedrive`);
  }
}
