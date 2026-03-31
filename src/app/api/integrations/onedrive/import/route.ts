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
import { downloadPhoto } from "@/lib/integrations/onedrive";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();

    const account = await getConnectedAccount(user.id, "onedrive");
    if (!account) {
      return NextResponse.json({ error: "OneDrive not connected" }, { status: 404 });
    }

    let token = await ensureValidToken(account.id, "onedrive", {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: account.token_expires_at,
    });

    const body = await request.json();
    const { itemIds, roomId } = body as { itemIds: string[]; roomId: string };

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: "itemIds required" }, { status: 400 });
    }
    if (!roomId) {
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

    // Check for duplicates: find which itemIds are already imported for this user
    const { data: existingMemories } = await supabase
      .from("memories")
      .select("metadata")
      .eq("user_id", user.id)
      .in(
        "metadata->>originalId",
        itemIds,
      );

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

        const { data, mimeType, filename } = downloaded;

        // File type validation
        if (!isImportable(mimeType) && !isImportableByExtension(filename)) {
          results.push({ id: itemId, success: false, error: `File type not supported: ${mimeType}` });
          continue;
        }

        // File size validation
        if (data.byteLength > MAX_IMPORT_FILE_SIZE) {
          results.push({ id: itemId, success: false, error: `File too large (${Math.round(data.byteLength / 1024 / 1024)}MB). Maximum is 50MB.` });
          continue;
        }

        const ext = filename.split(".").pop() || "bin";
        const storagePath = `${user.id}/${Date.now()}_${itemId}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("memories")
          .upload(storagePath, data, { contentType: mimeType, upsert: false });

        if (uploadErr) {
          results.push({ id: itemId, success: false, error: uploadErr.message });
          continue;
        }

        const { data: publicUrl } = supabase.storage.from("memories").getPublicUrl(storagePath);

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
            metadata: { source: "onedrive", originalId: itemId },
          })
          .select("id")
          .single();

        if (memErr) {
          results.push({ id: itemId, success: false, error: memErr.message });
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

    await supabase
      .from("connected_accounts")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", account.id);

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

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
    if (message.includes("401") || message.includes("Unauthorized")) {
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
