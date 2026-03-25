import { NextResponse } from "next/server";
import { getAuthenticatedUser, getBaseUrl, generateOAuthState } from "@/lib/integrations/helpers";

export async function GET() {
  try {
    await getAuthenticatedUser();

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
    }

    const state = generateOAuthState();
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

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message === "Not authenticated") {
      return NextResponse.redirect(`${getBaseUrl()}/login`);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
