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
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { downloadPhoto } from "@/lib/integrations/dropbox";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

    const account = await getConnectedAccount(user.id, "dropbox");
    if (!account) {
      return NextResponse.json({ error: "Dropbox not connected" }, { status: 404 });
    }

    let token = await ensureValidToken(account.id, "dropbox", {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: account.token_expires_at,
    });

    const body = await request.json();
    const { filePaths, roomId } = body as { filePaths: string[]; roomId: string };

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return NextResponse.json({ error: "filePaths required" }, { status: 400 });
    }
    if (!roomId) {
      return NextResponse.json({ error: "roomId required" }, { status: 400 });
    }

    // Batch limit
    if (filePaths.length > MAX_IMPORT_BATCH_SIZE) {
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

    // Check for duplicates: find which paths are already imported for this user
    const { data: existingMemories } = await supabase
      .from("memories")
      .select("metadata")
      .eq("user_id", user.id)
      .in(
        "metadata->>originalPath",
        filePaths,
      );

    const alreadyImportedPaths = new Set(
      (existingMemories || [])
        .map((m) => (m.metadata as Record<string, unknown>)?.originalPath as string)
        .filter(Boolean),
    );

    const results: Array<{ id: string; success: boolean; error?: string; memoryId?: string }> = [];
    let tokenRefreshed = false;

    for (const filePath of filePaths) {
      // Skip duplicates
      if (alreadyImportedPaths.has(filePath)) {
        results.push({ id: filePath, success: false, error: "Already imported" });
        continue;
      }

      try {
        const downloaded = await downloadWithRetry(token, filePath, async () => {
          if (tokenRefreshed) return null;
          try {
            token = await ensureValidToken(account.id, "dropbox", {
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
          results.push({ id: filePath, success: false, error: "Authentication expired. Please reconnect." });
          continue;
        }

        const { data, mimeType: rawMimeType, filename } = downloaded;

        // Dropbox often returns application/octet-stream — infer from extension
        const mimeType = rawMimeType === "application/octet-stream"
          ? mimeFromExtension(filename) || rawMimeType
          : rawMimeType;

        // File type validation
        if (!isImportable(mimeType) && !isImportableByExtension(filename)) {
          results.push({ id: filePath, success: false, error: `File type not supported: ${mimeType}` });
          continue;
        }

        // File size validation
        if (data.byteLength > MAX_IMPORT_FILE_SIZE) {
          results.push({ id: filePath, success: false, error: `File too large (${Math.round(data.byteLength / 1024 / 1024)}MB). Maximum is 50MB.` });
          continue;
        }

        const storagePath = `${user.id}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

        const { error: uploadErr } = await supabase.storage
          .from("memories")
          .upload(storagePath, Buffer.from(data), { contentType: mimeType, upsert: false });

        if (uploadErr) {
          results.push({ id: filePath, success: false, error: uploadErr.message });
          continue;
        }

        const { data: signedUrlData } = await supabase.storage.from("memories").createSignedUrl(storagePath, 60 * 60 * 24 * 365);
        const fileUrl = signedUrlData?.signedUrl || "";

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
            metadata: { source: "dropbox", originalPath: filePath },
          })
          .select("id")
          .single();

        if (memErr) {
          results.push({ id: filePath, success: false, error: memErr.message });
        } else {
          results.push({ id: filePath, success: true, memoryId: memory.id });
        }
      } catch (err: unknown) {
        if (err instanceof TokenExpiredError) {
          results.push({ id: filePath, success: false, error: "Authentication expired. Please reconnect." });
          for (const remainingPath of filePaths.slice(filePaths.indexOf(filePath) + 1)) {
            results.push({ id: remainingPath, success: false, error: "Skipped: authentication expired" });
          }
          break;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({ id: filePath, success: false, error: message });
      }
    }

    await supabase
      .from("connected_accounts")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", account.id);

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({ results, summary: { total: filePaths.length, succeeded, failed } }, {
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
  filePath: string,
  refreshToken: () => Promise<string | null>,
): Promise<{ data: ArrayBuffer; mimeType: string; filename: string } | null> {
  try {
    return await downloadPhoto(token, filePath);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("401") || message.includes("Unauthorized")) {
      const newToken = await refreshToken();
      if (newToken) {
        return await downloadPhoto(newToken, filePath);
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

/** Infer MIME type from file extension (Dropbox often returns application/octet-stream). */
function mimeFromExtension(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", heic: "image/heic",
    heif: "image/heif", tiff: "image/tiff", bmp: "image/bmp",
    mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
    webm: "video/webm", mkv: "video/x-matroska",
    mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4",
    pdf: "application/pdf", txt: "text/plain",
  };
  return map[ext || ""] || null;
}
