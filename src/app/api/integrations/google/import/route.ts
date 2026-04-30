import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  getConnectedAccount,
  isImportable,
  isImportableByExtension,
  resolveRoomId,
  MAX_IMPORT_FILE_SIZE,
  MAX_IMPORT_BATCH_SIZE,
  TokenExpiredError,
} from "@/lib/integrations/helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { downloadPhoto } from "@/lib/integrations/google-photos";
import { createClient } from "@/lib/supabase/server";
import { checkLimit } from "@/lib/auth/plan-limits";
import { r2Upload, r2Remove, isR2Configured } from "@/lib/storage/r2";

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

    if (!(await checkRateLimit(`import:${user.id}`, 10, 60_000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const account = await getConnectedAccount(user.id, "google_photos");
    if (!account) {
      return NextResponse.json({ error: "Google Photos not connected" }, { status: 404 });
    }

    let token = await ensureValidToken(account.id, "google_photos", {
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
    const { photoIds, mediaItems, roomId } = body as {
      photoIds?: string[];
      mediaItems?: Array<{ id: string; baseUrl: string; mimeType: string; filename: string }>;
      roomId: string;
    };

    // Support both legacy photoIds (Library API) and new mediaItems (Picker API)
    const usePickerFlow = Array.isArray(mediaItems) && mediaItems.length > 0;

    if (!usePickerFlow && (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0)) {
      return NextResponse.json({ error: "photoIds or mediaItems required" }, { status: 400 });
    }
    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json({ error: "roomId required" }, { status: 400 });
    }

    const itemCount = usePickerFlow ? mediaItems!.length : photoIds!.length;

    // Batch limit
    if (itemCount > MAX_IMPORT_BATCH_SIZE) {
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

    const storageCheck = await checkLimit(user.id, "storageMb");
    if (!storageCheck.allowed) {
      return NextResponse.json({ error: "Storage quota exceeded", limit: storageCheck.limit, current: storageCheck.current }, { status: 403 });
    }

    // Build the list of IDs to check for duplicates
    const allIds = usePickerFlow
      ? mediaItems!.map((m) => m.id)
      : photoIds!;

    // Check for duplicates: find which IDs are already imported for this user
    const { data: existingMemories, error: dupCheckError } = await supabase
      .from("memories")
      .select("metadata")
      .eq("user_id", user.id)
      .in(
        "metadata->>originalId",
        allIds,
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

    // Build a unified iteration list
    const iterationItems = usePickerFlow
      ? mediaItems!.map((m) => ({ id: m.id, pickerItem: m }))
      : photoIds!.map((id) => ({ id, pickerItem: undefined as undefined }));

    for (const { id: photoId, pickerItem } of iterationItems) {
      // Skip duplicates
      if (alreadyImportedIds.has(photoId)) {
        results.push({ id: photoId, success: false, error: "Already imported" });
        continue;
      }

      try {
        let data: ArrayBuffer;
        let rawMimeType: string;
        let filename: string;

        if (pickerItem) {
          // Picker flow: download directly from baseUrl
          const isVideo = pickerItem.mimeType.startsWith("video/");
          const suffixedUrl = isVideo
            ? `${pickerItem.baseUrl}=dv`
            : `${pickerItem.baseUrl}=d`;

          // Picker API baseUrls require OAuth token for download
          const authHeaders = { Authorization: `Bearer ${token}` };

          // Try with =d suffix first, fall back to raw baseUrl
          let downloadRes = await fetch(suffixedUrl, { headers: authHeaders });
          let usedFallback = false;
          if (!downloadRes.ok) {
            console.log(`[Google Import] Suffixed URL failed (${downloadRes.status}), trying raw baseUrl`);
            downloadRes = await fetch(pickerItem.baseUrl, { headers: authHeaders });
            usedFallback = true;
          }
          if (!downloadRes.ok) {
            results.push({ id: photoId, success: false, error: `Download failed (${downloadRes.status})` });
            continue;
          }

          // Verify we got actual media, not an error page
          const contentType = downloadRes.headers.get("content-type") || "";
          if (contentType.includes("text/html")) {
            results.push({ id: photoId, success: false, error: "Download returned HTML instead of media — baseUrl may have expired" });
            continue;
          }

          data = await downloadRes.arrayBuffer();

          // Log download details for diagnostics
          console.log(`[Google Import] Downloaded ${data.byteLength} bytes, content-type: ${contentType}, fallback: ${usedFallback}`);

          // Reject error responses disguised as successful downloads
          if (data.byteLength < 100) {
            const snippet = new TextDecoder().decode(new Uint8Array(data).slice(0, 200));
            console.error(`[Google Import] Tiny response (${data.byteLength}B): ${snippet}`);
            results.push({ id: photoId, success: false, error: `Download returned only ${data.byteLength} bytes — not a valid file` });
            continue;
          }

          // Reject JSON/XML error bodies from Google
          if (contentType.includes("application/json") || contentType.includes("text/xml") || contentType.includes("application/xml")) {
            const snippet = new TextDecoder().decode(new Uint8Array(data).slice(0, 500));
            console.error(`[Google Import] Error response (${contentType}): ${snippet}`);
            results.push({ id: photoId, success: false, error: `Download returned ${contentType} instead of media` });
            continue;
          }

          rawMimeType = pickerItem.mimeType;
          filename = pickerItem.filename || `photo_${photoId}`;
        } else {
          // Legacy Library API flow
          const downloaded = await downloadWithRetry(token, photoId, async () => {
            if (tokenRefreshed) return null; // Only retry once
            try {
              token = await ensureValidToken(account.id, "google_photos", {
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
            results.push({ id: photoId, success: false, error: "Authentication expired. Please reconnect." });
            continue;
          }

          data = downloaded.data;
          rawMimeType = downloaded.mimeType;
          filename = downloaded.filename;
        }

        // Google Photos may return application/octet-stream — infer from extension
        const mimeType = rawMimeType === "application/octet-stream"
          ? mimeFromExtension(filename) || rawMimeType
          : rawMimeType;

        // File type validation
        if (!isImportable(mimeType) && !isImportableByExtension(filename)) {
          results.push({ id: photoId, success: false, error: `File type not supported: ${mimeType}` });
          continue;
        }

        // File size validation
        if (data.byteLength > MAX_IMPORT_FILE_SIZE) {
          results.push({ id: photoId, success: false, error: `File too large (${Math.round(data.byteLength / 1024 / 1024)}MB). Maximum is ${MAX_IMPORT_FILE_SIZE / (1024 * 1024)}MB.` });
          continue;
        }

        // Upload to storage (R2 if configured, otherwise Supabase)
        const ext = filename.split(".").pop() || "jpg";
        const BLOCKED_EXTS = new Set(["exe", "sh", "bat", "cmd", "ps1", "msi", "dll", "com", "scr", "vbs"]);
        const safeExt = /^[a-zA-Z0-9]{1,10}$/.test(ext) && !BLOCKED_EXTS.has(ext.toLowerCase()) ? ext : "bin";
        const sanitizedId = photoId.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${user.id}/${Date.now()}_${randomBytes(4).toString("hex")}_${sanitizedId}.${safeExt}`;

        let fileUrl: string;
        let storageBackend: string;

        if (isR2Configured()) {
          try {
            await r2Upload("memories", storagePath, new Uint8Array(data), mimeType);
            fileUrl = `/api/media/memories/${storagePath}`;
            storageBackend = "r2";
          } catch (uploadErr) {
            results.push({ id: photoId, success: false, error: "Upload failed" });
            continue;
          }
        } else {
          const { error: uploadErr } = await supabase.storage
            .from("memories")
            .upload(storagePath, Buffer.from(data), { contentType: mimeType, upsert: false });
          if (uploadErr) {
            results.push({ id: photoId, success: false, error: uploadErr.message });
            continue;
          }
          const { data: signedUrlData } = await supabase.storage.from("memories").createSignedUrl(storagePath, 60 * 60 * 24 * 7);
          if (!signedUrlData?.signedUrl) {
            await supabase.storage.from("memories").remove([storagePath]);
            results.push({ id: photoId, success: false, error: "Failed to generate file URL" });
            continue;
          }
          fileUrl = signedUrlData.signedUrl;
          storageBackend = "supabase";
        }

        // Create memory record
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
            file_size: data.byteLength,
            storage_backend: storageBackend,
            hue,
            saturation: 45 + Math.floor(Math.random() * 15),
            lightness: 55 + Math.floor(Math.random() * 15),
            metadata: { source: "google_photos", originalId: photoId },
          })
          .select("id")
          .single();

        if (memErr) {
          // Rollback: remove uploaded file from the correct backend
          if (storageBackend === "r2" && isR2Configured()) {
            try { await r2Remove("memories", [storagePath]); } catch { /* best-effort */ }
          } else {
            await supabase.storage.from("memories").remove([storagePath]);
          }
          const isDuplicate = memErr.code === "23505" || memErr.message?.includes("duplicate");
          results.push({ id: photoId, success: false, error: isDuplicate ? "Already imported" : memErr.message });
        } else {
          results.push({ id: photoId, success: true, memoryId: memory.id });
        }
      } catch (err: unknown) {
        if (err instanceof TokenExpiredError) {
          results.push({ id: photoId, success: false, error: "Authentication expired. Please reconnect." });
          // Stop processing remaining items — token is dead
          const currentIdx = iterationItems.findIndex((item) => item.id === photoId);
          for (const remaining of iterationItems.slice(currentIdx + 1)) {
            const remainingId = remaining.id;
            results.push({ id: remainingId, success: false, error: "Skipped: authentication expired" });
          }
          break;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({ id: photoId, success: false, error: message });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    // Only update last_sync_at if at least one file succeeded
    if (succeeded > 0) {
      await supabase
        .from("connected_accounts")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", account.id);
    }

    return NextResponse.json({ results, summary: { total: itemCount, succeeded, failed } }, {
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
  photoId: string,
  refreshToken: () => Promise<string | null>,
): Promise<{ data: ArrayBuffer; mimeType: string; filename: string } | null> {
  try {
    return await downloadPhoto(token, photoId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
      const newToken = await refreshToken();
      if (newToken) {
        return await downloadPhoto(newToken, photoId);
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
    .trim() || "Imported Photo";
}

/** Infer MIME type from file extension (provider may return application/octet-stream). */
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
