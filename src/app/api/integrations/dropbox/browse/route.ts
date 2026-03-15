import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount } from "@/lib/integrations/helpers";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { listPhotos } from "@/lib/integrations/dropbox";

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

    return NextResponse.json({
      items: result.items.map((entry) => ({
        id: entry.id,
        name: entry.name,
        path: entry.path_display,
        isFolder: entry[".tag"] === "folder",
        size: entry.size || 0,
        modified: entry.server_modified || entry.client_modified,
        isMedia: entry.media_info != null,
        mediaType: entry.media_info?.metadata?.[".tag"],
      })),
      cursor: result.hasMore ? result.cursor : null,
      hasMore: result.hasMore,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
