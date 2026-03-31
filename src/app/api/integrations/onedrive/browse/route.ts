import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount, checkRateLimit } from "@/lib/integrations/helpers";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { listPhotos } from "@/lib/integrations/onedrive";

/**
 * GET — Browse OneDrive files and folders (paginated).
 * Query params: folderId (default "root"), cursor (nextLink URL)
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!checkRateLimit(`browse:${user.id}`, 30, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const account = await getConnectedAccount(user.id, "onedrive");
    if (!account) {
      return NextResponse.json({ error: "OneDrive not connected" }, { status: 404 });
    }

    const token = await ensureValidToken(account.id, "onedrive", {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: account.token_expires_at,
    });

    const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
    if (cursor && cursor.length > 2048) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    const folderId = request.nextUrl.searchParams.get("folderId") || "root";

    const result = await listPhotos(token, cursor, folderId);

    // Map to the CloudItem shape expected by CloudImportPanel
    const items = result.items.map((item) => {
      const isFolder = !!item.folder;
      const mimeType = item.file?.mimeType || "";
      const isImage = mimeType.startsWith("image/");
      const isVideo = mimeType.startsWith("video/");

      return {
        id: item.id,
        name: item.name,
        filename: item.name,
        isFolder,
        childCount: item.folder?.childCount,
        size: item.size,
        mimeType: isFolder ? undefined : mimeType,
        modified: item.lastModifiedDateTime,
        isImage: !isFolder && isImage,
        isVideo: !isFolder && isVideo,
        isMedia: !isFolder && (isImage || isVideo),
        thumbnailUrl: item.thumbnails?.[0]?.medium?.url || item.thumbnails?.[0]?.small?.url,
      };
    });

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
