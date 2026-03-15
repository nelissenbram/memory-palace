import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getBaseUrl, upsertConnectedAccount } from "@/lib/integrations/helpers";
import { getUserInfo } from "@/lib/integrations/onedrive";

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const baseUrl = getBaseUrl();

    const code = request.nextUrl.searchParams.get("code");
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=${encodeURIComponent(error)}`);
    }
    if (!code) {
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=no_code`);
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
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("OneDrive token exchange failed:", errText);
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=token_exchange_failed`);
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

    return NextResponse.redirect(`${baseUrl}/settings/connections?connected=onedrive`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("OneDrive OAuth callback error:", message);
    return NextResponse.redirect(`${getBaseUrl()}/settings/connections?error=${encodeURIComponent(message)}`);
  }
}
