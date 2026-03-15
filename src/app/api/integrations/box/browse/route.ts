import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount } from "@/lib/integrations/helpers";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { listPhotos } from "@/lib/integrations/box";

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

    return NextResponse.json({
      items: result.items.map((item) => ({
        id: item.id,
        name: item.name,
        isFolder: item.type === "folder",
        size: item.size,
        modified: item.modified_at,
        created: item.content_created_at || item.created_at,
      })),
      nextCursor: result.nextPageToken,
      totalCount: result.totalCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
