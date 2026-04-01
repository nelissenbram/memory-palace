import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { r2Upload, isR2Configured } from "@/lib/storage/r2";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * POST /api/upload
 *
 * Server-side file upload. Writes to R2 if configured, otherwise Supabase Storage.
 * Returns the file path and a stable proxy URL.
 *
 * Body: FormData with fields:
 *   - file: Blob
 *   - bucket: "memories" | "busts" (default: "memories")
 *   - filename: optional desired filename (sanitized server-side)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`upload:${user.id}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rl) });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const bucket = (formData.get("bucket") as string) === "busts" ? "busts" : "memories";
  const ext = file.name?.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "bin";
  const safeExt = ext.slice(0, 10);
  const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const contentType = file.type || "application/octet-stream";

  let storageBackend: "r2" | "supabase";

  try {
    if (isR2Configured()) {
      const buffer = new Uint8Array(await file.arrayBuffer());
      await r2Upload(bucket as "memories" | "busts", path, buffer, contentType);
      storageBackend = "r2";
    } else {
      const buffer = await file.arrayBuffer();
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, Buffer.from(buffer), { contentType });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      storageBackend = "supabase";
    }
  } catch (err) {
    console.error("[upload] Error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const url = `/api/media/${bucket}/${path}`;

  return NextResponse.json({
    path,
    url,
    storageBackend,
    size: file.size,
  });
}
