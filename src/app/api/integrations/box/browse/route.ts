import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount } from "@/lib/integrations/helpers";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { listPhotos } from "@/lib/integrations/box";

/**
 * GET — Browse Box files and folders (paginated).
 * Query params: folderId (default "0" = root), cursor (offset string)
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

    const account = await getConnectedAccount(user.id, "box");
    if (!account) {
      return NextResponse.json({ error: "Box not connected" }, { status: 404 });
    }

    const token = await ensureValidToken(account.id, "box", {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: account.token_expires_at,
    });

    const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
    const folderId = request.nextUrl.searchParams.get("folderId") || "0";

    const result = await listPhotos(token, cursor, folderId);

    // Map to the CloudItem shape expected by CloudImportPanel
    const items = result.items.map((item) => {
      const isFolder = item.type === "folder";
      const mimeType = isFolder ? undefined : guessMimeFromName(item.name);
      const isImage = !!mimeType?.startsWith("image/");
      const isVideo = !!mimeType?.startsWith("video/");

      return {
        id: item.id,
        name: item.name,
        filename: item.name,
        isFolder,
        isImage: !isFolder && isImage,
        isVideo: !isFolder && isVideo,
        isMedia: !isFolder && (isImage || isVideo),
        size: item.size,
        mimeType,
        modified: item.modified_at,
        childCount: item.item_collection?.total_count,
      };
    });

    return NextResponse.json({
      items,
      nextCursor: result.nextPageToken,
      totalCount: result.totalCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function guessMimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", heic: "image/heic",
    heif: "image/heif", tiff: "image/tiff", bmp: "image/bmp",
    mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
    webm: "video/webm", mkv: "video/x-matroska",
  };
  return map[ext || ""] || "application/octet-stream";
}
