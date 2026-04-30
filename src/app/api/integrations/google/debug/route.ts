import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount } from "@/lib/integrations/helpers";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { getPickerSession, createPickerSession } from "@/lib/integrations/google-photos";

/**
 * GET — Debug endpoint for Google Photos Picker.
 * TEMPORARY — remove after debugging.
 *
 * ?action=create  → create a new picker session
 * ?action=poll&sessionId=xxx → poll a session
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    const account = await getConnectedAccount(user.id, "google_photos");
    if (!account) {
      return NextResponse.json({ error: "Not connected" });
    }

    const token = await ensureValidToken(account.id, "google_photos", {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: account.token_expires_at,
    });

    // Check token scopes
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
    const tokenInfo = tokenInfoRes.ok ? await tokenInfoRes.json() : { error: await tokenInfoRes.text() };

    const action = request.nextUrl.searchParams.get("action");
    const sessionId = request.nextUrl.searchParams.get("sessionId");

    if (action === "create") {
      const session = await createPickerSession(token);
      return NextResponse.json({ tokenScopes: tokenInfo?.scope, session });
    }

    if (action === "poll" && sessionId) {
      // Raw fetch to see exact response
      const res = await fetch(`https://photospicker.googleapis.com/v1/sessions/${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = await res.json();
      return NextResponse.json({ status: res.status, raw });
    }

    if (action === "items" && sessionId) {
      const fetchUrl = `https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}`;
      const res = await fetch(fetchUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rawText = await res.text();
      let raw;
      try { raw = JSON.parse(rawText); } catch { raw = rawText; }
      return NextResponse.json({
        status: res.status,
        receivedSessionId: sessionId,
        sessionIdLength: sessionId.length,
        fetchUrl,
        raw,
      });
    }

    // Test downloading from a baseUrl
    if (action === "download" && request.nextUrl.searchParams.get("baseUrl")) {
      const baseUrl = request.nextUrl.searchParams.get("baseUrl")!;
      const downloadUrl = `${baseUrl}=d`;
      const res = await fetch(downloadUrl);
      const contentType = res.headers.get("content-type") || "unknown";
      const contentLength = res.headers.get("content-length") || "unknown";
      return NextResponse.json({
        downloadUrl,
        status: res.status,
        contentType,
        contentLength,
        isImage: contentType.startsWith("image/"),
      });
    }

    return NextResponse.json({
      connected: true,
      tokenScopes: tokenInfo?.scope,
      usage: "?action=create | ?action=poll&sessionId=xxx | ?action=items&sessionId=xxx | ?action=download&baseUrl=xxx",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
