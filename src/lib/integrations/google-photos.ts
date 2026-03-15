/**
 * Google Photos Library API wrapper.
 * Uses the Google Photos Library API v1 for listing and downloading media items.
 */

const BASE_URL = "https://photoslibrary.googleapis.com/v1";

export interface GooglePhotoItem {
  id: string;
  filename: string;
  mimeType: string;
  description?: string;
  productUrl: string;
  baseUrl: string;
  mediaMetadata: {
    creationTime: string;
    width: string;
    height: string;
    photo?: {
      cameraMake?: string;
      cameraModel?: string;
      focalLength?: number;
      apertureFNumber?: number;
      isoEquivalent?: number;
    };
    video?: {
      cameraMake?: string;
      cameraModel?: string;
      fps?: number;
      status?: string;
    };
  };
}

export interface GooglePhotosListResult {
  items: GooglePhotoItem[];
  nextPageToken: string | null;
  totalCount?: number;
}

/**
 * List media items from Google Photos (paginated).
 * Default page size is 50 (max 100 per Google API).
 */
export async function listPhotos(
  token: string,
  cursor?: string,
  pageSize: number = 50
): Promise<GooglePhotosListResult> {
  const body: Record<string, unknown> = { pageSize };
  if (cursor) body.pageToken = cursor;

  const res = await fetch(`${BASE_URL}/mediaItems:search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Photos API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    items: data.mediaItems || [],
    nextPageToken: data.nextPageToken || null,
  };
}

/**
 * Get a download URL for a specific media item.
 * Appends =d to baseUrl for original quality download.
 */
export async function getPhotoUrl(
  token: string,
  photoId: string
): Promise<string> {
  const res = await fetch(`${BASE_URL}/mediaItems/${photoId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Photos API error (${res.status}): ${err}`);
  }

  const item = await res.json();
  // Append =d for full resolution download
  return `${item.baseUrl}=d`;
}

/**
 * Download the actual file bytes for a photo/video.
 */
export async function downloadPhoto(
  token: string,
  photoId: string
): Promise<{ data: ArrayBuffer; mimeType: string; filename: string }> {
  // First get the media item details
  const res = await fetch(`${BASE_URL}/mediaItems/${photoId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Photos API error (${res.status}): ${err}`);
  }

  const item: GooglePhotoItem = await res.json();
  const isVideo = item.mimeType.startsWith("video/");

  // Build download URL
  // For photos: baseUrl=d for full resolution
  // For videos: baseUrl=dv for video download
  const downloadUrl = isVideo ? `${item.baseUrl}=dv` : `${item.baseUrl}=d`;

  const downloadRes = await fetch(downloadUrl);
  if (!downloadRes.ok) {
    throw new Error(`Failed to download from Google Photos: ${downloadRes.status}`);
  }

  const data = await downloadRes.arrayBuffer();
  return {
    data,
    mimeType: item.mimeType,
    filename: item.filename || `photo_${photoId}`,
  };
}

/**
 * Get user info from Google (email, name).
 */
export async function getUserInfo(token: string): Promise<{ email: string; name: string; id: string }> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to get Google user info");
  return res.json();
}
