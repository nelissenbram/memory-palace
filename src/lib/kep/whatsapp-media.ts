/**
 * WhatsApp media downloader.
 * Fetches media from Meta Graph API and stores in Supabase Storage.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface DownloadResult {
  url: string;
  mimeType: string;
  size: number;
  storagePath: string;
}

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";
const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * Get the download URL for a WhatsApp media ID.
 */
async function getMediaUrl(mediaId: string): Promise<{ url: string; mime_type: string; file_size: number }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN not configured");

  const res = await fetch(`${GRAPH_API_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to get media URL: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Download media binary from WhatsApp CDN.
 */
async function downloadMedia(url: string): Promise<{ buffer: ArrayBuffer; contentType: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN not configured");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download media: ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const buffer = await res.arrayBuffer();

  if (buffer.byteLength > MAX_MEDIA_SIZE) {
    throw new Error(`Media too large: ${buffer.byteLength} bytes (max ${MAX_MEDIA_SIZE})`);
  }

  return { buffer, contentType };
}

/**
 * Determine file extension from MIME type.
 */
function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "audio/aac": "aac",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "application/pdf": "pdf",
    "audio/opus": "opus",
  };
  return map[mimeType] || "bin";
}

/**
 * Download WhatsApp media and store in Supabase Storage.
 *
 * @param supabase - Admin Supabase client
 * @param mediaId - WhatsApp media ID from webhook
 * @param userId - Owner user ID (for path namespacing)
 * @param kepId - Kep ID (for path namespacing)
 * @returns Download result with storage path and public URL
 */
export async function downloadAndStoreMedia(
  supabase: SupabaseClient,
  mediaId: string,
  userId: string,
  kepId: string,
): Promise<DownloadResult> {
  // Step 1: Get the actual download URL from Meta
  const mediaInfo = await getMediaUrl(mediaId);

  // Step 2: Download the binary
  const { buffer, contentType } = await downloadMedia(mediaInfo.url);

  // Step 3: Upload to Supabase Storage
  const ext = getExtension(mediaInfo.mime_type || contentType);
  const filename = `${Date.now()}-${mediaId.slice(-8)}.${ext}`;
  const storagePath = `kep-media/${userId}/${kepId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(storagePath, buffer, {
      contentType: mediaInfo.mime_type || contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Step 4: Get public URL
  const { data: urlData } = supabase.storage
    .from("media")
    .getPublicUrl(storagePath);

  return {
    url: urlData.publicUrl,
    mimeType: mediaInfo.mime_type || contentType,
    size: buffer.byteLength,
    storagePath,
  };
}

/**
 * Delete stored media (for cleanup on rejection).
 */
export async function deleteStoredMedia(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from("media")
    .remove([storagePath]);

  if (error) {
    console.error(`[Kep] Failed to delete media ${storagePath}:`, error.message);
  }
}
