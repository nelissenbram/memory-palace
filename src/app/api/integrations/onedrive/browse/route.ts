import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount } from "@/lib/integrations/helpers";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { listPhotos } from "@/lib/integrations/onedrive";

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

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
    const folderId = request.nextUrl.searchParams.get("folderId") || "root";

    const result = await listPhotos(token, cursor, folderId);

    return NextResponse.json({
      items: result.items.map((item) => ({
        id: item.id,
        name: item.name,
        isFolder: !!item.folder,
        childCount: item.folder?.childCount,
        size: item.size,
        mimeType: item.file?.mimeType,
        modified: item.lastModifiedDateTime,
        isImage: !!item.image,
        isVideo: !!item.video,
        width: item.image?.width || item.video?.width,
        height: item.image?.height || item.video?.height,
        thumbnailUrl: item.thumbnails?.[0]?.medium?.url,
        camera: item.photo
          ? `${item.photo.cameraMake || ""} ${item.photo.cameraModel || ""}`.trim()
          : undefined,
        takenAt: item.photo?.takenDateTime,
      })),
      nextCursor: result.nextPageToken,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
