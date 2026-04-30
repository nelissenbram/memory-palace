import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount } from "@/lib/integrations/helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { getPickerMediaItems } from "@/lib/integrations/google-photos";

/**
 * GET — Retrieve all media items from a completed Picker session.
 * Query param: sessionId
 * Returns { items: [{ id, baseUrl, mimeType, filename }] }
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!(await checkRateLimit(`picker-items:${user.id}`, 30, 60_000))) {
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

    // Fetch all pages of picked media items
    const allItems: Array<{ id: string; baseUrl: string; mimeType: string; filename: string }> = [];
    let pageToken: string | undefined;

    do {
      const result = await getPickerMediaItems(token, sessionId, pageToken);
      for (const item of result.mediaItems || []) {
        allItems.push({
          id: item.id,
          baseUrl: item.mediaFile.baseUrl,
          mimeType: item.mediaFile.mimeType,
          filename: item.mediaFile.filename,
        });
      }
      pageToken = result.nextPageToken;
    } while (pageToken);

    return NextResponse.json(
      { items: allItems },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[Picker items] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
