import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { r2Download, isR2Configured } from "@/lib/storage/r2";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";

export const dynamic = "force-dynamic";

/**
 * Media proxy endpoint. Authenticates the user, checks file ownership
 * or shared access, then streams the file from R2 or Supabase Storage.
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

  const bucket = segments[0] as "memories" | "busts";
  const filePath = segments.slice(1).join("/");

  // Busts are public — serve directly
  if (bucket === "busts") {
    const ip = getClientIp(request);
    const rl = await rateLimit(`media-busts:${ip}`, 120, 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
    }
    return streamFile(bucket, filePath, null);
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

  // Check ownership: file_path matches and user owns it, OR has shared access
  const { data: memory } = await supabase
    .from("memories")
    .select("id, user_id, storage_backend, room_id")
    .eq("file_path", filePath)
    .single();

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
      .eq("shared_with_user_id", user.id)
      .eq("status", "accepted")
      .limit(1)
      .single();
    authorized = !!share;
  }

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return streamFile(bucket, filePath, memory.storage_backend);
}

async function streamFile(
  bucket: "memories" | "busts",
  filePath: string,
  storageBackend: string | null,
): Promise<NextResponse> {
  const backend = storageBackend || "supabase";

  try {
    if (backend === "r2" && isR2Configured()) {
      const { data, contentType } = await r2Download(bucket, filePath);
      return new NextResponse(data, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=86400, immutable",
          "X-Storage-Backend": "r2",
        },
      });
    }

    // Fallback to Supabase Storage
    const { createClient: createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const { data, error } = await supabase.storage.from(bucket).download(filePath);
    if (error || !data) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = await data.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Cache-Control": "private, max-age=86400",
        "X-Storage-Backend": "supabase",
      },
    });
  } catch (err) {
    console.error("[media] Stream error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
