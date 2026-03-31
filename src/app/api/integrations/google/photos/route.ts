import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount, checkRateLimit } from "@/lib/integrations/helpers";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { listPhotos } from "@/lib/integrations/google-photos";

/**
 * GET — Browse Google Photos media items (paginated).
 * Query params: cursor (optional page token), pageSize (1-100, default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!checkRateLimit(`browse:${user.id}`, 30, 60_000)) {
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

    const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
    const rawPageSize = parseInt(request.nextUrl.searchParams.get("pageSize") || "20", 10);
    const pageSize = Math.max(1, Math.min(100, isNaN(rawPageSize) ? 20 : rawPageSize));

    const result = await listPhotos(token, cursor, pageSize);

    // Map to the CloudItem shape expected by CloudImportPanel
    const items = result.items.map((item) => ({
      id: item.id,
      name: item.filename || item.id,
      filename: item.filename,
      thumbnailUrl: item.baseUrl ? `${item.baseUrl}=w256-h256-c` : undefined,
      isFolder: false,
      isImage: item.mimeType.startsWith("image/"),
      isVideo: item.mimeType.startsWith("video/"),
      isMedia: true,
      mimeType: item.mimeType,
      createdAt: item.mediaMetadata.creationTime,
    }));

    return NextResponse.json({
      items,
      nextCursor: result.nextPageToken,
    }, {
      headers: { "Cache-Control": "private, no-cache" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
