import { NextResponse } from "next/server";
import { getAuthenticatedUser, getBaseUrl } from "@/lib/integrations/helpers";

export async function GET() {
  try {
    await getAuthenticatedUser();

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
    }

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
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message === "Not authenticated") {
      return NextResponse.redirect(`${getBaseUrl()}/login`);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
