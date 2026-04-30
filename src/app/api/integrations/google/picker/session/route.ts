import { NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount } from "@/lib/integrations/helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { createPickerSession } from "@/lib/integrations/google-photos";

/**
 * POST — Create a new Google Photos Picker session.
 * Returns { sessionId, pickerUri } for the client to open.
 */
export async function POST() {
  try {
    const { user } = await getAuthenticatedUser();

    if (!(await checkRateLimit(`picker-session:${user.id}`, 10, 60_000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
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

    const session = await createPickerSession(token);

    return NextResponse.json(
      { sessionId: session.id, pickerUri: session.pickerUri },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[Picker session] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
