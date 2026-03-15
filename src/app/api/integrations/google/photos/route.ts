import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount } from "@/lib/integrations/helpers";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { listPhotos } from "@/lib/integrations/google-photos";

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

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
    const pageSize = parseInt(request.nextUrl.searchParams.get("pageSize") || "50", 10);

    const result = await listPhotos(token, cursor, pageSize);

    return NextResponse.json({
      items: result.items.map((item) => ({
        id: item.id,
        filename: item.filename,
        mimeType: item.mimeType,
        description: item.description,
        thumbnailUrl: `${item.baseUrl}=w256-h256-c`,
        width: parseInt(item.mediaMetadata.width, 10),
        height: parseInt(item.mediaMetadata.height, 10),
        createdAt: item.mediaMetadata.creationTime,
        isVideo: item.mimeType.startsWith("video/"),
        camera: item.mediaMetadata.photo
          ? `${item.mediaMetadata.photo.cameraMake || ""} ${item.mediaMetadata.photo.cameraModel || ""}`.trim()
          : undefined,
      })),
      nextCursor: result.nextPageToken,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
