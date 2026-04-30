import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount } from "@/lib/integrations/helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { getPickerSession } from "@/lib/integrations/google-photos";

/**
 * GET — Poll a Picker session to check if the user has finished picking.
 * Query param: sessionId
 * Returns { mediaItemsSet: boolean }
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!(await checkRateLimit(`picker-poll:${user.id}`, 60, 60_000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const sessionId = request.nextUrl.searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const account = await getConnectedAccount(user.id, "google_photos");
    if (!account) {
      return NextResponse.json({ error: "Google Photos not connected" }, { status: 404 });
    }

    const token = await ensureValidToken(account.id, "google_photos", {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: account.token_expires_at,
    });

    const session = await getPickerSession(token, sessionId);

    return NextResponse.json(
      { mediaItemsSet: session.mediaItemsSet === true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[Picker poll] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
