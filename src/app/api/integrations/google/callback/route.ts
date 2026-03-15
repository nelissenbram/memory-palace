import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getBaseUrl, upsertConnectedAccount } from "@/lib/integrations/helpers";
import { getUserInfo } from "@/lib/integrations/google-photos";

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

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/integrations/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Google token exchange failed:", errText);
      return NextResponse.redirect(`${baseUrl}/settings/connections?error=token_exchange_failed`);
    }

    const tokens = await tokenRes.json();

    // Get user info from Google
    let providerEmail = "";
    let providerUserId = "";
    try {
      const info = await getUserInfo(tokens.access_token);
      providerEmail = info.email;
      providerUserId = info.id;
    } catch { /* ignore — not critical */ }

    // Store the connection
    await upsertConnectedAccount({
      userId: user.id,
      provider: "google_photos",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      tokenExpiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      providerUserId,
      providerEmail,
    });

    return NextResponse.redirect(`${baseUrl}/settings/connections?connected=google_photos`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Google OAuth callback error:", message);
    return NextResponse.redirect(`${getBaseUrl()}/settings/connections?error=${encodeURIComponent(message)}`);
  }
}
