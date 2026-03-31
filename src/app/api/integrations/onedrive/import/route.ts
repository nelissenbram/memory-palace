import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  getConnectedAccount,
  isImportable,
  isImportableByExtension,
  resolveRoomId,
  checkRateLimit,
  MAX_IMPORT_FILE_SIZE,
  MAX_IMPORT_BATCH_SIZE,
  TokenExpiredError,
} from "@/lib/integrations/helpers";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { downloadPhoto } from "@/lib/integrations/onedrive";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!checkRateLimit(`import:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const account = await getConnectedAccount(user.id, "onedrive");
    if (!account) {
      return NextResponse.json({ error: "OneDrive not connected" }, { status: 404 });
    }

    let token = await ensureValidToken(account.id, "onedrive", {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: account.token_expires_at,
    });

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { itemIds, roomId } = body as { itemIds: string[]; roomId: string };

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: "itemIds required" }, { status: 400 });
    }
    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json({ error: "roomId required" }, { status: 400 });
    }

    // Batch limit
    if (itemIds.length > MAX_IMPORT_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Too many files. Maximum ${MAX_IMPORT_BATCH_SIZE} per request.` },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Resolve local room ID to database UUID
    const dbRoomId = await resolveRoomId(supabase, user.id, roomId);
    if (!dbRoomId) {
      return NextResponse.json({ error: "Could not resolve room" }, { status: 400 });
    }

    // Check for duplicates: find which itemIds are already imported for this user
    const { data: existingMemories, error: dupCheckError } = await supabase
      .from("memories")
      .select("metadata")
      .eq("user_id", user.id)
      .in(
        "metadata->>originalId",
        itemIds,
      );

    if (dupCheckError) {
      console.error("Duplicate check failed:", dupCheckError.message);
      // Continue without duplicate detection rather than failing the whole import
    }

    const alreadyImportedIds = new Set(
      (existingMemories || [])
        .map((m) => (m.metadata as Record<string, unknown>)?.originalId as string)
        .filter(Boolean),
    );

    const results: Array<{ id: string; success: boolean; error?: string; memoryId?: string }> = [];
    let tokenRefreshed = false;

    for (const itemId of itemIds) {
      // Skip duplicates
      if (alreadyImportedIds.has(itemId)) {
        results.push({ id: itemId, success: false, error: "Already imported" });
        continue;
      }

      try {
        const downloaded = await downloadWithRetry(token, itemId, async () => {
          if (tokenRefreshed) return null;
          try {
            token = await ensureValidToken(account.id, "onedrive", {
              accessToken: token,
              refreshToken: account.refresh_token,
              expiresAt: null, // Force refresh
            });
            tokenRefreshed = true;
            return token;
          } catch {
            return null;
          }
        });

        if (!downloaded) {
          results.push({ id: itemId, success: false, error: "Authentication expired. Please reconnect." });
          continue;
        }

        const { data, mimeType: rawMimeType, filename } = downloaded;

        // OneDrive may return application/octet-stream — infer from extension
        const mimeType = rawMimeType === "application/octet-stream"
          ? mimeFromExtension(filename) || rawMimeType
          : rawMimeType;

        // File type validation
        if (!isImportable(mimeType) && !isImportableByExtension(filename)) {
          results.push({ id: itemId, success: false, error: `File type not supported: ${mimeType}` });
          continue;
        }

        // File size validation
        if (data.byteLength > MAX_IMPORT_FILE_SIZE) {
          results.push({ id: itemId, success: false, error: `File too large (${Math.round(data.byteLength / 1024 / 1024)}MB). Maximum is ${MAX_IMPORT_FILE_SIZE / (1024 * 1024)}MB.` });
          continue;
        }

        const ext = filename.split(".").pop() || "bin";
        const BLOCKED_EXTS = new Set(["exe", "sh", "bat", "cmd", "ps1", "msi", "dll", "com", "scr", "vbs"]);
        const safeExt = /^[a-zA-Z0-9]{1,10}$/.test(ext) && !BLOCKED_EXTS.has(ext.toLowerCase()) ? ext : "bin";
        const sanitizedId = itemId.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${user.id}/${Date.now()}_${randomBytes(4).toString("hex")}_${sanitizedId}.${safeExt}`;

        const { error: uploadErr } = await supabase.storage
          .from("memories")
          .upload(storagePath, Buffer.from(data), { contentType: mimeType, upsert: false });

        if (uploadErr) {
          results.push({ id: itemId, success: false, error: uploadErr.message });
          continue;
        }

        const { data: signedUrlData } = await supabase.storage.from("memories").createSignedUrl(storagePath, 60 * 60 * 24 * 365);
        if (!signedUrlData?.signedUrl) {
          await supabase.storage.from("memories").remove([storagePath]);
          results.push({ id: itemId, success: false, error: "Failed to generate file URL" });
          continue;
        }
        const fileUrl = signedUrlData.signedUrl;

        const isImage = mimeType.startsWith("image/");
        const isVideo = mimeType.startsWith("video/");
        const isAudio = mimeType.startsWith("audio/");
        const hue = Math.floor(Math.random() * 360);

        const { data: memory, error: memErr } = await supabase
          .from("memories")
          .insert({
            room_id: dbRoomId,
            user_id: user.id,
            title: cleanFilename(filename),
            type: isVideo ? "video" : isAudio ? "audio" : isImage ? "photo" : "document",
            file_path: storagePath,
            file_url: fileUrl,
            hue,
            saturation: 45 + Math.floor(Math.random() * 15),
            lightness: 55 + Math.floor(Math.random() * 15),
            metadata: { source: "onedrive", originalId: itemId },
          })
          .select("id")
          .single();

        if (memErr) {
          await supabase.storage.from("memories").remove([storagePath]);
          const isDuplicate = memErr.code === "23505" || memErr.message?.includes("duplicate");
          results.push({ id: itemId, success: false, error: isDuplicate ? "Already imported" : memErr.message });
        } else {
          results.push({ id: itemId, success: true, memoryId: memory.id });
        }
      } catch (err: unknown) {
        if (err instanceof TokenExpiredError) {
          results.push({ id: itemId, success: false, error: "Authentication expired. Please reconnect." });
          for (const remainingId of itemIds.slice(itemIds.indexOf(itemId) + 1)) {
            results.push({ id: remainingId, success: false, error: "Skipped: authentication expired" });
          }
          break;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({ id: itemId, success: false, error: message });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    if (succeeded > 0) {
      await supabase
        .from("connected_accounts")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", account.id);
    }

    return NextResponse.json({ results, summary: { total: itemIds.length, succeeded, failed } }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Download with a single token-refresh retry on 401.
 */
async function downloadWithRetry(
  token: string,
  itemId: string,
  refreshToken: () => Promise<string | null>,
): Promise<{ data: ArrayBuffer; mimeType: string; filename: string } | null> {
  try {
    return await downloadPhoto(token, itemId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
      const newToken = await refreshToken();
      if (newToken) {
        return await downloadPhoto(newToken, itemId);
      }
      return null;
    }
    throw err;
  }
}

function cleanFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || "Imported File";
}

/** Infer MIME type from file extension (OneDrive may return application/octet-stream). */
function mimeFromExtension(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
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
  return map[ext || ""] || null;
}
