import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getConnectedAccount } from "@/lib/integrations/helpers";
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

    const token = await ensureValidToken(account.id, "dropbox", {
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

    const supabase = await createClient();
    const results: Array<{ path: string; success: boolean; error?: string; memoryId?: string }> = [];

    for (const filePath of filePaths) {
      try {
        const { data, mimeType, filename } = await downloadPhoto(token, filePath);

        const ext = filename.split(".").pop() || "bin";
        const storagePath = `${user.id}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

        const { error: uploadErr } = await supabase.storage
          .from("memories")
          .upload(storagePath, data, { contentType: mimeType, upsert: false });

        if (uploadErr) {
          results.push({ path: filePath, success: false, error: uploadErr.message });
          continue;
        }

        const { data: publicUrl } = supabase.storage.from("memories").getPublicUrl(storagePath);

        const isImage = mimeType.startsWith("image/");
        const isVideo = mimeType.startsWith("video/");
        const hue = Math.floor(Math.random() * 360);

        const { data: memory, error: memErr } = await supabase
          .from("memories")
          .insert({
            room_id: roomId,
            user_id: user.id,
            title: cleanFilename(filename),
            type: isVideo ? "video" : isImage ? "photo" : "document",
            file_path: storagePath,
            file_url: publicUrl.publicUrl,
            hue,
            saturation: 45 + Math.floor(Math.random() * 15),
            lightness: 55 + Math.floor(Math.random() * 15),
            metadata: { source: "dropbox", originalPath: filePath },
          })
          .select("id")
          .single();

        if (memErr) {
          results.push({ path: filePath, success: false, error: memErr.message });
        } else {
          results.push({ path: filePath, success: true, memoryId: memory.id });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({ path: filePath, success: false, error: message });
      }
    }

    await supabase
      .from("connected_accounts")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", account.id);

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({ results, summary: { total: filePaths.length, succeeded, failed } });
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
    .trim() || "Imported File";
}
