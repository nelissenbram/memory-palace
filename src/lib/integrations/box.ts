/**
 * Box API wrapper.
 * Uses the Box Content API v2.0 for file browsing and downloading.
 */

import { TokenExpiredError } from "./helpers";

const API_URL = "https://api.box.com/2.0";

function assertNotUnauthorized(res: Response, body: string): void {
  if (res.status === 401) {
    throw new TokenExpiredError(
      `Box token expired or revoked. Please reconnect your account.`,
      "box"
    );
  }
}

export interface BoxItem {
  type: "file" | "folder" | "web_link";
  id: string;
  name: string;
  size: number;
  created_at: string;
  modified_at: string;
  content_created_at?: string;
  content_modified_at?: string;
  description?: string;
  sha1?: string;
  parent?: {
    type: string;
    id: string;
    name: string;
  };
  path_collection?: {
    total_count: number;
    entries: Array<{ type: string; id: string; name: string }>;
  };
  item_collection?: {
    total_count: number;
    entries: BoxItem[];
    offset: number;
    limit: number;
  };
}

export interface BoxListResult {
  items: BoxItem[];
  nextPageToken: string | null;
  totalCount: number;
}

/**
 * List files in a Box folder (paginated).
 * folderId "0" is the root folder.
 */
export async function listPhotos(
  token: string,
  cursor?: string,
  folderId: string = "0"
): Promise<BoxListResult> {
  const offset = cursor ? parseInt(cursor, 10) : 0;
  const limit = 50;

  const url = `${API_URL}/folders/${folderId}/items?offset=${offset}&limit=${limit}&fields=id,name,type,size,created_at,modified_at,content_created_at,description,sha1,parent,path_collection`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    assertNotUnauthorized(res, err);
    throw new Error(`Box API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const entries: BoxItem[] = data.entries || [];
  const totalCount: number = data.total_count || 0;
  const nextOffset = offset + entries.length;
  const hasMore = nextOffset < totalCount;

  return {
    items: entries,
    nextPageToken: hasMore ? String(nextOffset) : null,
    totalCount,
  };
}

/**
 * Get a download URL for a file.
 */
export async function getPhotoUrl(
  token: string,
  fileId: string
): Promise<string> {
  const res = await fetch(`${API_URL}/files/${fileId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: "manual",
  });

  // Box returns 302 redirect to the actual download URL
  if (res.status === 302) {
    const location = res.headers.get("location");
    if (location) return location;
  }

  // If we got 200, the content came directly
  if (res.ok) {
    return `${API_URL}/files/${fileId}/content`;
  }

  const err = await res.text();
  throw new Error(`Box API error (${res.status}): ${err}`);
}

/**
 * Download a file from Box.
 */
export async function downloadPhoto(
  token: string,
  fileId: string
): Promise<{ data: ArrayBuffer; mimeType: string; filename: string }> {
  // Get file info for name and type
  const infoRes = await fetch(`${API_URL}/files/${fileId}?fields=name,size`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!infoRes.ok) {
    const err = await infoRes.text();
    assertNotUnauthorized(infoRes, err);
    throw new Error(`Box API error (${infoRes.status}): ${err}`);
  }

  const info = await infoRes.json();

  // Download the file
  const res = await fetch(`${API_URL}/files/${fileId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    assertNotUnauthorized(res, err);
    throw new Error(`Box download error (${res.status}): ${err}`);
  }

  const contentType = res.headers.get("content-type") || guessMimeType(info.name);
  const data = await res.arrayBuffer();
  return {
    data,
    mimeType: contentType,
    filename: info.name,
  };
}

/**
 * Get Box user info.
 */
export async function getUserInfo(token: string): Promise<{ email: string; name: string; id: string }> {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to get Box user info");
  const data = await res.json();
  return {
    email: data.login || "",
    name: data.name || "",
    id: data.id,
  };
}

/**
 * Get thumbnail for a Box file.
 */
export async function getThumbnail(
  token: string,
  fileId: string,
  width: number = 128,
  height: number = 128
): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      `${API_URL}/files/${fileId}/thumbnail.jpg?min_width=${width}&min_height=${height}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

function guessMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", heic: "image/heic",
    mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
    pdf: "application/pdf", doc: "application/msword",
  };
  return map[ext || ""] || "application/octet-stream";
}
