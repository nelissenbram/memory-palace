import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  getConnectedAccount,
  isImportable,
  isImportableByExtension,
  MAX_IMPORT_FILE_SIZE,
  MAX_IMPORT_BATCH_SIZE,
  TokenExpiredError,
} from "@/lib/integrations/helpers";
import { ensureValidToken } from "@/lib/integrations/token-refresh";
import { downloadPhoto } from "@/lib/integrations/google-photos";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

    const account = await getConnectedAccount(user.id, "google_photos");
    if (!account) {
      return NextResponse.json({ error: "Google Photos not connected" }, { status: 404 });
    }

    let token = await ensureValidToken(account.id, "google_photos", {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: account.token_expires_at,
    });

    const body = await request.json();
    const { photoIds, roomId } = body as { photoIds: string[]; roomId: string };

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: "photoIds required" }, { status: 400 });
    }
    if (!roomId) {
      return NextResponse.json({ error: "roomId required" }, { status: 400 });
    }

    // Batch limit
    if (photoIds.length > MAX_IMPORT_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Too many files. Maximum ${MAX_IMPORT_BATCH_SIZE} per request.` },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Check for duplicates: find which photoIds are already imported for this user
    const { data: existingMemories } = await supabase
      .from("memories")
      .select("metadata")
      .eq("user_id", user.id)
      .in(
        "metadata->>originalId",
        photoIds,
      );

    const alreadyImportedIds = new Set(
      (existingMemories || [])
        .map((m) => (m.metadata as Record<string, unknown>)?.originalId as string)
        .filter(Boolean),
    );

    const results: Array<{ id: string; success: boolean; error?: string; memoryId?: string }> = [];
    let tokenRefreshed = false;

    for (const photoId of photoIds) {
      // Skip duplicates
      if (alreadyImportedIds.has(photoId)) {
        results.push({ id: photoId, success: false, error: "Already imported" });
        continue;
      }

      try {
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

        const { data, mimeType, filename } = downloaded;

        // File type validation
        if (!isImportable(mimeType) && !isImportableByExtension(filename)) {
          results.push({ id: photoId, success: false, error: `File type not supported: ${mimeType}` });
          continue;
        }

        // File size validation
        if (data.byteLength > MAX_IMPORT_FILE_SIZE) {
          results.push({ id: photoId, success: false, error: `File too large (${Math.round(data.byteLength / 1024 / 1024)}MB). Maximum is 50MB.` });
          continue;
        }

        // Upload to Supabase Storage
        const ext = filename.split(".").pop() || "jpg";
        const storagePath = `${user.id}/${Date.now()}_${photoId}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("memories")
          .upload(storagePath, data, { contentType: mimeType, upsert: false });

        if (uploadErr) {
          results.push({ id: photoId, success: false, error: uploadErr.message });
          continue;
        }

        // Get public URL
        const { data: publicUrl } = supabase.storage.from("memories").getPublicUrl(storagePath);

        // Create memory record
        const isImage = mimeType.startsWith("image/");
        const isVideo = mimeType.startsWith("video/");
        const isAudio = mimeType.startsWith("audio/");
        const hue = Math.floor(Math.random() * 360);
        const { data: memory, error: memErr } = await supabase
          .from("memories")
          .insert({
            room_id: roomId,
            user_id: user.id,
            title: cleanFilename(filename),
            type: isVideo ? "video" : isAudio ? "audio" : isImage ? "photo" : "document",
            file_path: storagePath,
            file_url: publicUrl.publicUrl,
            hue,
            saturation: 45 + Math.floor(Math.random() * 15),
            lightness: 55 + Math.floor(Math.random() * 15),
            metadata: { source: "google_photos", originalId: photoId },
          })
          .select("id")
          .single();

        if (memErr) {
          results.push({ id: photoId, success: false, error: memErr.message });
        } else {
          results.push({ id: photoId, success: true, memoryId: memory.id });
        }
      } catch (err: unknown) {
        if (err instanceof TokenExpiredError) {
          results.push({ id: photoId, success: false, error: "Authentication expired. Please reconnect." });
          // Stop processing remaining items — token is dead
          for (const remainingId of photoIds.slice(photoIds.indexOf(photoId) + 1)) {
            results.push({ id: remainingId, success: false, error: "Skipped: authentication expired" });
          }
          break;
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({ id: photoId, success: false, error: message });
      }
    }

    // Update last_sync_at
    await supabase
      .from("connected_accounts")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", account.id);

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({ results, summary: { total: photoIds.length, succeeded, failed } }, {
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
    if (message.includes("401") || message.includes("Unauthorized")) {
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
