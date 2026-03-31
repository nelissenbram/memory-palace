/**
 * Microsoft OneDrive / Graph API wrapper.
 * Uses the Microsoft Graph API v1.0 for file browsing and downloading.
 */

import { TokenExpiredError } from "./helpers";

const GRAPH_URL = "https://graph.microsoft.com/v1.0";

function assertNotUnauthorized(res: Response, body: string): void {
  if (res.status === 401) {
    throw new TokenExpiredError(
      `OneDrive token expired or revoked. Please reconnect your account.`,
      "onedrive"
    );
  }
}

export interface OneDriveItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  file?: {
    mimeType: string;
    hashes?: { sha1Hash?: string };
  };
  folder?: {
    childCount: number;
  };
  image?: {
    width: number;
    height: number;
  };
  video?: {
    width: number;
    height: number;
    duration: number;
  };
  photo?: {
    cameraMake?: string;
    cameraModel?: string;
    takenDateTime?: string;
  };
  thumbnails?: Array<{
    small?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
  }>;
  "@microsoft.graph.downloadUrl"?: string;
}

export interface OneDriveListResult {
  items: OneDriveItem[];
  nextPageToken: string | null;
}

/**
 * List files in a OneDrive folder (paginated).
 * Pass folderId = "root" or a specific folder ID.
 */
export async function listPhotos(
  token: string,
  cursor?: string,
  folderId: string = "root"
): Promise<OneDriveListResult> {
  const url = cursor
    ? cursor // nextLink is a full URL
    : `${GRAPH_URL}/me/drive/${folderId === "root" ? "root" : `items/${folderId}`}/children?$top=50&$expand=thumbnails&$orderby=lastModifiedDateTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    assertNotUnauthorized(res, err);
    throw new Error(`OneDrive API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    items: data.value || [],
    nextPageToken: data["@odata.nextLink"] || null,
  };
}

/**
 * Get a download URL for a file.
 */
export async function getPhotoUrl(
  token: string,
  itemId: string
): Promise<string> {
  const res = await fetch(`${GRAPH_URL}/me/drive/items/${itemId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    assertNotUnauthorized(res, err);
    throw new Error(`OneDrive API error (${res.status}): ${err}`);
  }

  const item: OneDriveItem = await res.json();
  const downloadUrl = item["@microsoft.graph.downloadUrl"];
  if (!downloadUrl) {
    throw new Error("No download URL available for this item");
  }
  return downloadUrl;
}

/**
 * Download a file from OneDrive.
 */
export async function downloadPhoto(
  token: string,
  itemId: string
): Promise<{ data: ArrayBuffer; mimeType: string; filename: string }> {
  // Get item details first for filename and mime type
  const res = await fetch(`${GRAPH_URL}/me/drive/items/${itemId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    assertNotUnauthorized(res, err);
    throw new Error(`OneDrive API error (${res.status}): ${err}`);
  }

  const item: OneDriveItem = await res.json();
  const downloadUrl = item["@microsoft.graph.downloadUrl"];
  if (!downloadUrl) {
    throw new Error("No download URL available");
  }

  const downloadRes = await fetch(downloadUrl);
  if (!downloadRes.ok) {
    throw new Error(`Failed to download from OneDrive: ${downloadRes.status}`);
  }

  const data = await downloadRes.arrayBuffer();
  return {
    data,
    mimeType: item.file?.mimeType || "application/octet-stream",
    filename: item.name,
  };
}

/**
 * Get OneDrive user info.
 */
export async function getUserInfo(token: string): Promise<{ email: string; name: string; id: string }> {
  const res = await fetch(`${GRAPH_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to get OneDrive user info");
  const data = await res.json();
  return {
    email: data.mail || data.userPrincipalName || "",
    name: data.displayName || "",
    id: data.id,
  };
}
