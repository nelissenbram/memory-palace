import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount, checkRateLimit } from "@/lib/integrations/helpers";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { listPhotos } from "@/lib/integrations/box";

/**
 * GET — Browse Box files and folders (paginated).
 * Query params: folderId (default "0" = root), cursor (offset string)
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!checkRateLimit(`browse:${user.id}`, 30, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

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
    if (cursor && cursor.length > 2048) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    const folderId = request.nextUrl.searchParams.get("folderId") || "0";

    const result = await listPhotos(token, cursor, folderId);

    // Map to the CloudItem shape expected by CloudImportPanel
    const items = result.items.map((item) => {
      const isFolder = item.type === "folder";
      const mimeType = isFolder ? undefined : guessMimeFromName(item.name);
      const isImage = !!mimeType?.startsWith("image/");
      const isVideo = !!mimeType?.startsWith("video/");
      const isAudio = !!mimeType?.startsWith("audio/");

      return {
        id: item.id,
        name: item.name,
        filename: item.name,
        isFolder,
        isImage: !isFolder && isImage,
        isVideo: !isFolder && isVideo,
        isMedia: !isFolder && (isImage || isVideo || isAudio),
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
    mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4",
    flac: "audio/flac", ogg: "audio/ogg", aac: "audio/aac",
    pdf: "application/pdf", txt: "text/plain",
    svg: "image/svg+xml", ico: "image/x-icon",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return map[ext || ""] || "application/octet-stream";
}
