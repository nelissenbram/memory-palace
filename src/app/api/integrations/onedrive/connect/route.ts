import { NextResponse } from "next/server";
import { getAuthenticatedUser, getBaseUrl } from "@/lib/integrations/helpers";

export async function GET() {
  try {
    await getAuthenticatedUser();

    const clientId = process.env.ONEDRIVE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "OneDrive OAuth not configured" }, { status: 500 });
    }

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
    });

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message === "Not authenticated") {
      return NextResponse.redirect(`${getBaseUrl()}/login`);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
