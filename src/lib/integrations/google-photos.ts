/**
 * Google Photos Library API wrapper.
 * Uses the Google Photos Library API v1 for listing and downloading media items.
 */

import { TokenExpiredError } from "./helpers";

const BASE_URL = "https://photoslibrary.googleapis.com/v1";

function assertNotUnauthorized(res: Response, body: string): void {
  if (res.status === 401) {
    throw new TokenExpiredError(
      `Google Photos token expired or revoked. Please reconnect your account.`,
      "google_photos"
    );
  }
}

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
    assertNotUnauthorized(res, err);
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
    assertNotUnauthorized(res, err);
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
    assertNotUnauthorized(res, err);
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

/* ------------------------------------------------------------------ */
/*  Google Photos Picker API                                          */
/* ------------------------------------------------------------------ */

const PICKER_BASE_URL = "https://photospicker.googleapis.com/v1";

export interface PickerSession {
  id: string;
  pickerUri: string;
  expireTime: string;
  mediaItemsSet?: boolean;
}

export interface PickerMediaItem {
  id: string;
  mediaFile: {
    baseUrl: string;
    mimeType: string;
    filename: string;
  };
}

export interface PickerMediaItemsResult {
  mediaItems: PickerMediaItem[];
  nextPageToken?: string;
}

/**
 * Create a new Picker session. The user should be redirected to `pickerUri`.
 */
export async function createPickerSession(token: string): Promise<PickerSession> {
  const res = await fetch(`${PICKER_BASE_URL}/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    assertNotUnauthorized(res, err);
    throw new Error(`Picker API error (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Poll an existing Picker session to check if the user has finished picking.
 */
export async function getPickerSession(token: string, sessionId: string): Promise<PickerSession> {
  const res = await fetch(`${PICKER_BASE_URL}/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    assertNotUnauthorized(res, err);
    throw new Error(`Picker API error (${res.status}): ${err}`);
  }

  return res.json();
}

/**
 * Retrieve the media items the user picked (paginated).
 */
export async function getPickerMediaItems(
  token: string,
  sessionId: string,
  pageToken?: string,
): Promise<PickerMediaItemsResult> {
  const url = new URL(`${PICKER_BASE_URL}/mediaItems`);
  url.searchParams.set("sessionId", sessionId);
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    assertNotUnauthorized(res, err);
    throw new Error(`Picker API error (${res.status}): ${err}`);
  }

  return res.json();
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
