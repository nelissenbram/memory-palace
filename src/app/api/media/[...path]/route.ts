import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isR2Configured, r2PresignedUrl } from "@/lib/storage/r2";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const dynamic = "force-dynamic";

/**
 * Reject path segments that could cause traversal or injection.
 *
 * The allowlist `[A-Za-z0-9._/-]` (applied per-segment; `/` never appears
 * inside a decoded segment but is allowed defensively) is deliberately strict:
 * it rejects the SQL LIKE metacharacters `%` and `_`, which — combined with the
 * legacy `.ilike('thumbnail_url', '%<filePath>%')` fallback below — would let a
 * crafted path match an ARBITRARY memory row (a bare `%` matches every
 * thumbnail_url), driving the authorization check off a row the caller does not
 * own while bytes for the attacker-supplied path are streamed.
 */
function isPathSafe(segments: string[]): boolean {
  const SAFE = /^[A-Za-z0-9._/-]+$/;
  for (const seg of segments) {
    if (
      seg === "" ||
      seg === "." ||
      seg === ".." ||
      seg.includes("\0") ||
      seg.includes("\\") ||
      !SAFE.test(seg)
    ) return false;
  }
  return true;
}

/** Escape SQL LIKE/ILIKE metacharacters so user input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Media proxy endpoint. Authenticates the user, checks file ownership
 * or shared access, then redirects to a presigned R2 URL or streams
 * from Supabase Storage.
 *
 * URL format: /api/media/{bucket}/{user_id}/{filename}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path;
  if (!segments || segments.length < 2) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!isPathSafe(segments)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const bucket = segments[0] as "memories" | "busts";
  const filePath = segments.slice(1).join("/");

  // Busts are public — redirect to R2 presigned URL or stream from Supabase
  if (bucket === "busts") {
    const ip = getClientIp(request);
    const rl = await rateLimit(`media-busts:${ip}`, 120, 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }
    if (isR2Configured()) {
      return redirectToR2(bucket, filePath);
    }
    return streamFromSupabase(request, bucket, filePath);
  }

  // Memories are private — authenticate
  if (bucket !== "memories") {
    return NextResponse.json({ error: "Unknown bucket" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Prefer the admin client (bypasses RLS for shared/published/ANONYMOUS access);
  // on environments WITHOUT a service-role key (e.g. Vercel Preview deploys, where
  // it is Production-only) fall back to the authenticated session client. RLS then
  // scopes lookups to the user's OWN memories — which only REDUCES access, never
  // grants it — so owners still see their own media on previews.
  let adminClient = supabase;
  let hasAdmin = false;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/server");
      adminClient = createAdminClient();
      hasAdmin = true;
    } catch (err) {
      console.error("[media] admin client unavailable, using session client:", err);
    }
  }

  // Anonymous visitors (public share links) can be served ONLY published-wing
  // media, which requires the admin client to look up + authorize (RLS hides it
  // from an anonymous session). Without a service-role key we can't safely
  // authorize an anonymous read → 401.
  if (!user && !hasAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit per-user, or per-IP for anonymous public viewers.
  const rlIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(user ? `media:${user.id}` : `media:anon:${rlIp}`, 200, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  // Check ownership: file_path matches the video OR thumbnail_url references this
  // path (thumbnails are uploaded as separate files but linked via thumbnail_url).
  let { data: memory } = await adminClient
    .from("memories")
    .select("id, user_id, storage_backend, room_id")
    .eq("file_path", filePath)
    .maybeSingle();

  let matchedViaThumbnail = false;
  if (!memory) {
    // Try matching by thumbnail_url. Use ilike with %filePath% to handle any URL format
    // (proxy path, full URL with token, signed URL, etc.) — the file path is unique enough.
    // LIKE metacharacters in filePath are escaped so it is matched LITERALLY: a bare `%`
    // or `_` must never widen the match to an unrelated row (defense-in-depth alongside
    // isPathSafe, which already rejects those characters).
    const { data: thumbMatch } = await adminClient
      .from("memories")
      .select("id, user_id, storage_backend, room_id")
      .ilike("thumbnail_url", `%${escapeLike(filePath)}%`)
      .limit(1)
      .maybeSingle();
    memory = thumbMatch;
    matchedViaThumbnail = !!thumbMatch;
  }

  if (!memory) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let authorized = !!user && memory.user_id === user.id;

  // Check shared access if not the owner (authenticated users only)
  if (!authorized && user) {
    const { data: share } = await supabase
      .from("room_shares")
      .select("id")
      .eq("room_id", memory.room_id)
      .eq("shared_with_id", user.id)
      .eq("status", "accepted")
      .limit(1)
      .single();
    authorized = !!share;
  }

  // Check published wing access — visitors can view memories in published wings
  if (!authorized && memory.room_id) {
    const { data: room } = await adminClient
      .from("rooms")
      .select("wing_id")
      .eq("id", memory.room_id)
      .single();
    if (room) {
      const { data: wing } = await adminClient
        .from("wings")
        .select("id")
        .eq("id", room.wing_id)
        .not("published_at", "is", null)
        .single();
      authorized = !!wing;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Redirect to R2 presigned URL (Cloudflare CDN — fast, no buffering)
  // Thumbnails are always uploaded to R2 when configured, even for legacy supabase-backed videos.
  const useR2 = matchedViaThumbnail
    ? isR2Configured()
    : (memory.storage_backend || "supabase") === "r2" && isR2Configured();

  // ?stream=1 forces direct streaming (no redirect) — needed for WebGL canvas textures
  // which can't use cross-origin redirected images (tainted canvas)
  const wantsStream = request.nextUrl.searchParams.get("stream") === "1";

  if (useR2) {
    if (wantsStream) {
      return streamFromR2(request, bucket, filePath);
    }
    return redirectToR2(bucket, filePath);
  }

  // Fallback: stream from Supabase (for legacy files not yet migrated to R2).
  // Pass the admin-or-session client chosen above: storage RLS has no policy
  // for published-wing visitors, so a session-client download would 404 for
  // authorized non-owners. With a service-role key this is the admin client;
  // without one (e.g. Vercel Preview) it falls back to the session client,
  // which still works for owners.
  return streamFromSupabase(request, bucket, filePath, adminClient);
}

/**
 * Redirect to a short-lived R2 presigned URL.
 * The browser loads directly from Cloudflare's edge network — no buffering,
 * no Vercel bandwidth, native range requests, and global CDN.
 */
async function redirectToR2(
  bucket: "memories" | "busts",
  filePath: string,
): Promise<NextResponse> {
  try {
    const url = await r2PresignedUrl(bucket, filePath, 3600); // 1 hour
    return NextResponse.redirect(url, {
      status: 302,
      headers: {
        "Cache-Control": "private, max-age=1800", // cache redirect for 30 min
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[media] R2 presign error:", err);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }
}

/** Download from R2 and serve directly (same-origin — avoids canvas tainting for WebGL). */
async function streamFromR2(
  request: NextRequest,
  bucket: "memories" | "busts",
  filePath: string,
): Promise<NextResponse> {
  try {
    const { r2Download } = await import("@/lib/storage/r2");
    const rangeHeader = request.headers.get("range") || undefined;
    const { data, contentType, contentLength, contentRange } = await r2Download(bucket, filePath, rangeHeader);
    const ct = resolveContentType(contentType, filePath);
    const headers: Record<string, string> = {
      "Content-Type": ct,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=604800",
      "X-Content-Type-Options": "nosniff",
    };
    if (contentLength != null) headers["Content-Length"] = String(contentLength);
    if (contentRange) headers["Content-Range"] = contentRange;
    // 206 for range responses, 200 for full downloads
    const status = contentRange ? 206 : 200;
    return new NextResponse(data as unknown as BodyInit, { status, headers });
  } catch (err) {
    console.error("[media] R2 stream error:", err);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }
}

/**
 * Resolve a trustworthy Content-Type. Storage backends report generic/wrong
 * types for files uploaded without explicit metadata — Supabase Storage
 * defaults to `text/plain;charset=UTF-8`, S3/R2 to `application/octet-stream`.
 * Mobile <video>/<audio> REFUSES to play media served under those types, so
 * the file extension wins over any generic reported type (owner R2 #6).
 */
function resolveContentType(provided: string | null | undefined, filePath: string): string {
  const p = (provided || "").toLowerCase();
  if (!p || p === "application/octet-stream" || p.startsWith("text/plain") || p === "application/json" || p === "binary/octet-stream") {
    return inferContentType(filePath);
  }
  return provided as string;
}

/** Infer Content-Type from file extension when storage doesn't provide one. */
function inferContentType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    pdf: "application/pdf",
  };
  return (ext && map[ext]) || "application/octet-stream";
}

/** Stream from Supabase Storage (fallback for non-R2 files). */
async function streamFromSupabase(
  request: NextRequest,
  bucket: "memories" | "busts",
  filePath: string,
  client?: Awaited<ReturnType<typeof createClient>>,
): Promise<NextResponse> {
  try {
    // Use the caller-provided client when given (memories route passes the
    // admin client when available, else the session client). Otherwise
    // (public busts) create a session client here.
    let supabase = client;
    if (!supabase) {
      const { createClient: createServerClient } = await import("@/lib/supabase/server");
      supabase = await createServerClient();
    }
    const { data, error } = await supabase.storage.from(bucket).download(filePath);
    if (error || !data) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const arrayBuf = await data.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    // Supabase reports text/plain for uploads without explicit contentType —
    // mobile <video> refuses those; the file extension wins (owner R2 #6).
    const ct = resolveContentType(data.type, filePath);
    const size = buf.byteLength;
    const rangeHeader = request.headers.get("range");

    const headers: Record<string, string> = {
      "Content-Type": ct,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=604800", // 7 days
      "X-Content-Type-Options": "nosniff",
    };

    if (rangeHeader) {
      // Full single-range grammar incl. suffix form (`bytes=-N` = last N bytes);
      // out-of-range starts get a proper 416 instead of a 200 full-body reply
      // (mobile players treat that as a broken stream).
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (match && (match[1] || match[2])) {
        let start: number;
        let end: number;
        if (match[1]) {
          start = parseInt(match[1], 10);
          end = match[2] ? Math.min(parseInt(match[2], 10), size - 1) : size - 1;
        } else {
          const suffix = Math.min(parseInt(match[2], 10), size);
          start = size - suffix;
          end = size - 1;
        }
        if (start >= size || start > end || Number.isNaN(start)) {
          return new NextResponse(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" },
          });
        }
        headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
        headers["Content-Length"] = String(end - start + 1);
        const slice = buf.subarray(start, end + 1);
        return new NextResponse(new Uint8Array(slice) as unknown as BodyInit, { status: 206, headers });
      }
    }

    headers["Content-Length"] = String(size);
    return new NextResponse(new Uint8Array(buf) as unknown as BodyInit, { status: 200, headers });
  } catch (err) {
    console.error("[media] Supabase stream error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
