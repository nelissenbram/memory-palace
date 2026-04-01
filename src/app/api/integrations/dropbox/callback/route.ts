import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import { getAuthenticatedUser, getBaseUrl, upsertConnectedAccount } from "@/lib/integrations/helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { getUserInfo } from "@/lib/integrations/dropbox";

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
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=auth_failed&provider=dropbox`);
    }
    if (!code) {
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=auth_failed&provider=dropbox`);
    }

    // Verify CSRF state parameter
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state_dropbox")?.value;
    const stateMatch = state && storedState && state.length === storedState.length && timingSafeEqual(Buffer.from(state), Buffer.from(storedState));
    if (!stateMatch) {
      const resp = NextResponse.redirect(`${baseUrl}/settings/connections?error=invalid_state&provider=dropbox`);
      resp.cookies.delete("oauth_state_dropbox");
      resp.cookies.delete("oauth_pkce_dropbox");
      return resp;
    }

    // Retrieve PKCE code_verifier from cookie
    const codeVerifier = cookieStore.get("oauth_pkce_dropbox")?.value;
    if (!codeVerifier) {
      const resp = NextResponse.redirect(`${baseUrl}/settings/connections?error=auth_failed&provider=dropbox`);
      resp.cookies.delete("oauth_state_dropbox");
      resp.cookies.delete("oauth_pkce_dropbox");
      return resp;
    }

    const redirectUri = `${baseUrl}/api/integrations/dropbox/callback`;
    const credentials = Buffer.from(
      `${process.env.DROPBOX_APP_KEY}:${process.env.DROPBOX_APP_SECRET}`
    ).toString("base64");

    const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      console.error(`Dropbox token exchange failed (HTTP ${tokenRes.status})`);
      const resp = NextResponse.redirect(`${baseUrl}/settings/connections?error=auth_failed&provider=dropbox`);
      resp.cookies.delete("oauth_state_dropbox");
      resp.cookies.delete("oauth_pkce_dropbox");
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
      provider: "dropbox",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenExpiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      providerUserId,
      providerEmail,
    });

    const resp = NextResponse.redirect(`${baseUrl}/settings/connections?connected=dropbox`);
    resp.cookies.delete("oauth_state_dropbox");
    resp.cookies.delete("oauth_pkce_dropbox");
    return resp;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Dropbox OAuth callback error:", message);
    return NextResponse.redirect(`${getBaseUrl()}/settings/connections?error=auth_failed&provider=dropbox`);
  }
}
