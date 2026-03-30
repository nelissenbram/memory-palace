import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount } from "@/lib/integrations/helpers";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { listPhotos } from "@/lib/integrations/dropbox";

/**
 * GET — Browse Dropbox files and folders (paginated).
 * Query params: path (folder path, default ""), cursor (pagination)
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

    const account = await getConnectedAccount(user.id, "dropbox");
    if (!account) {
      return NextResponse.json({ error: "Dropbox not connected" }, { status: 404 });
    }

    const token = await ensureValidToken(account.id, "dropbox", {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: account.token_expires_at,
    });

    const cursor = request.nextUrl.searchParams.get("cursor") || undefined;
    const path = request.nextUrl.searchParams.get("path") || "";

    const result = await listPhotos(token, cursor, path);

    // Map to the CloudItem shape expected by CloudImportPanel
    const items = result.items.map((entry) => {
      const isFolder = entry[".tag"] === "folder";
      const mimeType = isFolder ? undefined : guessMimeFromName(entry.name);
      const isImage = !!mimeType?.startsWith("image/");
      const isVideo = !!mimeType?.startsWith("video/");

      return {
        id: entry.id,
        name: entry.name,
        filename: entry.name,
        path: entry.path_display || entry.path_lower,
        isFolder,
        isImage: !isFolder && isImage,
        isVideo: !isFolder && isVideo,
        isMedia: !isFolder && (isImage || isVideo || entry.media_info != null),
        size: entry.size || 0,
        mimeType,
        modified: entry.server_modified || entry.client_modified,
      };
    });

    return NextResponse.json({
      items,
      nextCursor: result.hasMore ? result.cursor : null,
    }, {
      headers: { "Cache-Control": "private, no-cache" },
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
