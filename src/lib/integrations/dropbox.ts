/**
 * Dropbox API v2 wrapper.
 * Handles file browsing and downloading from Dropbox.
 */

import { TokenExpiredError } from "./helpers";

const API_URL = "https://api.dropboxapi.com/2";

function assertNotUnauthorized(res: Response, body: string): void {
  if (res.status === 401) {
    throw new TokenExpiredError(
      `Dropbox token expired or revoked. Please reconnect your account.`,
      "dropbox"
    );
  }
}
const CONTENT_URL = "https://content.dropboxapi.com/2";

export interface DropboxEntry {
  ".tag": "file" | "folder" | "deleted";
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
  size?: number;
  is_downloadable?: boolean;
  client_modified?: string;
  server_modified?: string;
  media_info?: {
    ".tag": "metadata";
    metadata: {
      ".tag": "photo" | "video";
      dimensions?: { width: number; height: number };
      time_taken?: string;
    };
  };
}

export interface DropboxListResult {
  items: DropboxEntry[];
  cursor: string | null;
  hasMore: boolean;
}

/**
 * List files and folders in a Dropbox path (paginated).
 */
export async function listPhotos(
  token: string,
  cursor?: string,
  path: string = ""
): Promise<DropboxListResult> {
  let res: Response;

  if (cursor) {
    // Continue from cursor
    res = await fetch(`${API_URL}/files/list_folder/continue`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cursor }),
    });
  } else {
    // Initial listing
    res = await fetch(`${API_URL}/files/list_folder`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: path || "",
        recursive: false,
        include_media_info: true,
        include_deleted: false,
        limit: 100,
      }),
    });
  }

  if (!res.ok) {
    const err = await res.text();
    assertNotUnauthorized(res, err);
    throw new Error(`Dropbox API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    items: data.entries || [],
    cursor: data.cursor || null,
    hasMore: data.has_more || false,
  };
}

/**
 * Get a temporary download URL for a file.
 */
export async function getPhotoUrl(
  token: string,
  filePath: string
): Promise<string> {
  const res = await fetch(`${API_URL}/files/get_temporary_link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: filePath }),
  });

  if (!res.ok) {
    const err = await res.text();
    assertNotUnauthorized(res, err);
    throw new Error(`Dropbox API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.link;
}

/**
 * Download a file from Dropbox.
 */
export async function downloadPhoto(
  token: string,
  filePath: string
): Promise<{ data: ArrayBuffer; mimeType: string; filename: string }> {
  const res = await fetch(`${CONTENT_URL}/files/download`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Dropbox-API-Arg": JSON.stringify({ path: filePath }),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    assertNotUnauthorized(res, err);
    throw new Error(`Dropbox download error (${res.status}): ${err}`);
  }

  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const apiResult = res.headers.get("dropbox-api-result");
  let filename = filePath.split("/").pop() || "download";
  if (apiResult) {
    try {
      const parsed = JSON.parse(apiResult);
      filename = parsed.name || filename;
    } catch { /* ignore */ }
  }

  const data = await res.arrayBuffer();
  return { data, mimeType: contentType, filename };
}

/**
 * Get Dropbox account info.
 */
export async function getUserInfo(token: string): Promise<{ email: string; name: string; id: string }> {
  const res = await fetch(`${API_URL}/users/get_current_account`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to get Dropbox user info");
  const data = await res.json();
  return {
    email: data.email,
    name: data.name?.display_name || data.email,
    id: data.account_id,
  };
}

/**
 * Get a thumbnail for a file (useful for previews).
 */
export async function getThumbnail(
  token: string,
  filePath: string,
  size: "w32h32" | "w64h64" | "w128h128" | "w256h256" = "w128h128"
): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(`${CONTENT_URL}/files/get_thumbnail_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({
          resource: { ".tag": "path", path: filePath },
          format: { ".tag": "jpeg" },
          size: { ".tag": size },
        }),
      },
    });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}
