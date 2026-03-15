import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount } from "@/lib/integrations/helpers";
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

    const token = await ensureValidToken(account.id, "google_photos", {
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

    const supabase = await createClient();
    const results: Array<{ id: string; success: boolean; error?: string; memoryId?: string }> = [];

    for (const photoId of photoIds) {
      try {
        // Download from Google Photos
        const { data, mimeType, filename } = await downloadPhoto(token, photoId);

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
        const hue = Math.floor(Math.random() * 360);
        const { data: memory, error: memErr } = await supabase
          .from("memories")
          .insert({
            room_id: roomId,
            user_id: user.id,
            title: cleanFilename(filename),
            type: mimeType.startsWith("video/") ? "video" : "photo",
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

    return NextResponse.json({ results, summary: { total: photoIds.length, succeeded, failed } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function cleanFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || "Imported Photo";
}
