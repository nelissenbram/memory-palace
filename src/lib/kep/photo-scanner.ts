/**
 * Google Photos background scanner.
 * Periodically scans connected Google Photos for new items matching filters.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueJob } from "@/lib/queue";

const PHOTOS_API_BASE = "https://photoslibrary.googleapis.com/v1";

interface PhotosFilter {
  dateRanges?: { startDate: string; endDate: string }[];
  albumId?: string;
  mediaTypes?: ("PHOTO" | "VIDEO")[];
}

/**
 * Handle a kep_scan job — scan Google Photos for new items.
 */
export async function handleKepScanJob(
  supabase: SupabaseClient,
  job: { payload: { kepId: string; userId: string; cursor?: string } },
): Promise<void> {
  const { kepId, userId, cursor } = job.payload;

  // Load kep
  const { data: kep } = await supabase
    .from("keps")
    .select("*")
    .eq("id", kepId)
    .eq("status", "active")
    .single();

  if (!kep) return;

  // Get OAuth token
  const { data: account } = await supabase
    .from("connected_accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "google_photos")
    .single();

  if (!account) {
    console.error(`[Kep Photos] No Google Photos connection for user ${userId}`);
    return;
  }

  // Check if token needs refresh
  let accessToken = account.access_token;
  if (new Date(account.expires_at) < new Date()) {
    accessToken = await refreshGoogleToken(supabase, userId, account.refresh_token);
    if (!accessToken) return;
  }

  // Build search filter from kep config
  const config = kep.source_config as PhotosFilter;
  const searchBody: Record<string, unknown> = {
    pageSize: 25,
    pageToken: cursor || undefined,
  };

  if (config.albumId) {
    searchBody.albumId = config.albumId;
  } else {
    const filters: Record<string, unknown> = {};
    if (config.mediaTypes) {
      filters.mediaTypeFilter = { mediaTypes: config.mediaTypes };
    }
    if (config.dateRanges && config.dateRanges.length > 0) {
      filters.dateFilter = { ranges: config.dateRanges.map((r) => ({
        startDate: parseDate(r.startDate),
        endDate: parseDate(r.endDate),
      })) };
    }
    if (Object.keys(filters).length > 0) {
      searchBody.filters = filters;
    }
  }

  // Search Google Photos
  const res = await fetch(`${PHOTOS_API_BASE}/mediaItems:search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(searchBody),
  });

  if (!res.ok) {
    throw new Error(`Google Photos API error: ${res.status}`);
  }

  const data = await res.json();
  const items = data.mediaItems || [];

  // Process each item
  for (const item of items) {
    // Check for duplicates (by payload_hash = Google media item ID)
    const { data: existing } = await supabase
      .from("kep_captures")
      .select("id")
      .eq("kep_id", kepId)
      .eq("payload_hash", item.id)
      .single();

    if (existing) continue;

    // Download and store the media
    const mediaType = item.mimeType?.startsWith("video/") ? "video" : "image";
    const downloadUrl = `${item.baseUrl}=${mediaType === "video" ? "dv" : "d"}`;

    const mediaRes = await fetch(downloadUrl);
    if (!mediaRes.ok) continue;

    const buffer = await mediaRes.arrayBuffer();
    const ext = item.mimeType?.split("/")[1] || "jpg";
    const storagePath = `kep-media/${userId}/${kepId}/${Date.now()}-${item.id.slice(-8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(storagePath, buffer, {
        contentType: item.mimeType || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error(`[Kep Photos] Upload failed:`, uploadError.message);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(storagePath);

    // Create capture
    const { data: capture } = await supabase
      .from("kep_captures")
      .insert({
        kep_id: kepId,
        user_id: userId,
        source_message_id: item.id,
        source_timestamp: item.mediaMetadata?.creationTime || null,
        media_type: mediaType,
        media_url: urlData.publicUrl,
        media_size: buffer.byteLength,
        status: "pending",
        payload_hash: item.id,
        payload_preview: {
          filename: item.filename,
          description: item.description || null,
          width: item.mediaMetadata?.width,
          height: item.mediaMetadata?.height,
        },
      })
      .select("id")
      .single();

    if (capture) {
      await enqueueJob(supabase, "kep_capture", {
        captureId: capture.id,
        kepId,
        userId,
      });
    }
  }

  // If there's a next page, enqueue another scan job
  if (data.nextPageToken) {
    await enqueueJob(supabase, "kep_scan", {
      kepId,
      userId,
      cursor: data.nextPageToken,
    });
  }
}

async function refreshGoogleToken(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string,
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;

  const tokens = await res.json();

  // Update stored token
  await supabase
    .from("connected_accounts")
    .update({
      access_token: tokens.access_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "google_photos");

  return tokens.access_token;
}

function parseDate(dateStr: string): { year: number; month: number; day: number } {
  const d = new Date(dateStr);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}
