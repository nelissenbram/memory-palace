import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isR2Configured, r2PresignedUrl } from "@/lib/storage/r2";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const dynamic = "force-dynamic";

/** Reject path segments that could cause traversal or injection. */
function isPathSafe(segments: string[]): boolean {
  for (const seg of segments) {
    if (
      seg === "" ||
      seg === "." ||
      seg === ".." ||
      seg.includes("\0") ||
      seg.includes("\\")
    ) return false;
  }
  return true;
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
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`media:${user.id}`, 200, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  // Check ownership: file_path matches the video OR thumbnail_url references this path
  // (thumbnails are uploaded as separate files but linked via thumbnail_url)
  let { data: memory } = await supabase
    .from("memories")
    .select("id, user_id, storage_backend, room_id")
    .eq("file_path", filePath)
    .maybeSingle();

  let matchedViaThumbnail = false;
  if (!memory) {
    // Try matching by thumbnail_url. Use ilike with %filePath% to handle any URL format
    // (proxy path, full URL with token, signed URL, etc.) — the file path is unique enough.
    const { data: thumbMatch } = await supabase
      .from("memories")
      .select("id, user_id, storage_backend, room_id")
      .ilike("thumbnail_url", `%${filePath}%`)
      .limit(1)
      .maybeSingle();
    memory = thumbMatch;
    matchedViaThumbnail = !!thumbMatch;
  }

  if (!memory) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let authorized = memory.user_id === user.id;

  // Check shared access if not the owner
  if (!authorized) {
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

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Redirect to R2 presigned URL (Cloudflare CDN — fast, no buffering)
  // Thumbnails are always uploaded to R2 when configured, even for legacy supabase-backed videos.
  const useR2 = matchedViaThumbnail
    ? isR2Configured()
    : (memory.storage_backend || "supabase") === "r2" && isR2Configured();
  if (useR2) {
    return redirectToR2(bucket, filePath);
  }

  // Fallback: stream from Supabase (for legacy files not yet migrated to R2)
  return streamFromSupabase(request, bucket, filePath);
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
): Promise<NextResponse> {
  try {
    const { createClient: createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const { data, error } = await supabase.storage.from(bucket).download(filePath);
    if (error || !data) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const arrayBuf = await data.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const ct = data.type || inferContentType(filePath);
    const size = buf.byteLength;
    const rangeHeader = request.headers.get("range");

    const headers: Record<string, string> = {
      "Content-Type": ct,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=604800", // 7 days
      "X-Content-Type-Options": "nosniff",
    };

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : size - 1;
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
