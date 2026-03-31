/**
 * Token refresh utility for connected cloud accounts.
 * Checks if an access token is expired and refreshes it using the provider's
 * refresh endpoint before making API calls.
 */

import { createClient } from "@/lib/supabase/server";
import { TokenExpiredError } from "./helpers";

export interface TokenInfo {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
}

interface RefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

// Buffer: refresh 5 minutes before actual expiry
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Check if a token is expired (or about to expire).
 */
export function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true; // No expiry info — treat as expired to force refresh
  const expiryTime = new Date(expiresAt).getTime();
  if (isNaN(expiryTime)) return true; // Invalid date — treat as expired
  return Date.now() > expiryTime - EXPIRY_BUFFER_MS;
}

/**
 * Refresh a Google OAuth2 token.
 */
async function refreshGoogleToken(refreshToken: string): Promise<RefreshResult> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed (${res.status})`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || undefined,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh a Dropbox OAuth2 token.
 */
async function refreshDropboxToken(refreshToken: string): Promise<RefreshResult> {
  const credentials = Buffer.from(
    `${process.env.DROPBOX_APP_KEY}:${process.env.DROPBOX_APP_SECRET}`
  ).toString("base64");

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Dropbox token refresh failed (${res.status})`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    refreshToken: data.refresh_token || undefined,
  };
}

/**
 * Refresh a OneDrive (Microsoft) OAuth2 token.
 */
async function refreshOneDriveToken(refreshToken: string): Promise<RefreshResult> {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.ONEDRIVE_CLIENT_ID!,
      client_secret: process.env.ONEDRIVE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`OneDrive token refresh failed (${res.status})`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || undefined,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh a Box OAuth2 token.
 */
async function refreshBoxToken(refreshToken: string): Promise<RefreshResult> {
  const res = await fetch("https://api.box.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.BOX_CLIENT_ID!,
      client_secret: process.env.BOX_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Box token refresh failed (${res.status})`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || undefined,
    expiresIn: data.expires_in,
  };
}

const REFRESH_FNS: Record<string, (rt: string) => Promise<RefreshResult>> = {
  google_photos: refreshGoogleToken,
  dropbox: refreshDropboxToken,
  onedrive: refreshOneDriveToken,
  box: refreshBoxToken,
};

/**
 * Ensure a valid access token for the given provider account.
 * Refreshes the token if expired and persists the new token to the DB.
 * Returns the current (or refreshed) access token.
 */
export async function ensureValidToken(
  accountId: string,
  provider: string,
  tokenInfo: TokenInfo
): Promise<string> {
  // If token is still valid, return it as-is
  if (!isTokenExpired(tokenInfo.expiresAt)) {
    return tokenInfo.accessToken;
  }

  // Need to refresh
  if (!tokenInfo.refreshToken) {
    throw new Error(`Token expired for ${provider} and no refresh token available. Please reconnect.`);
  }

  const refreshFn = REFRESH_FNS[provider];
  if (!refreshFn) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  let result: RefreshResult;
  try {
    result = await refreshFn(tokenInfo.refreshToken);
  } catch (err) {
    // Refresh failed — the user needs to re-authenticate
    throw new TokenExpiredError(
      `Token refresh failed for ${provider}. Please reconnect your account.`,
      provider
    );
  }

  // Persist the refreshed token.
  // Security: createClient() returns an RLS-scoped Supabase client (anon key + user cookies),
  // so the UPDATE is already restricted to rows where user_id = auth.uid(). No extra
  // .eq("user_id", ...) is needed — RLS on connected_accounts enforces ownership.
  const supabase = await createClient();
  const updates: Record<string, unknown> = {
    access_token: result.accessToken,
  };
  if (result.refreshToken) {
    updates.refresh_token = result.refreshToken;
  }
  if (result.expiresIn) {
    updates.token_expires_at = new Date(Date.now() + result.expiresIn * 1000).toISOString();
  }

  const { error: updateError } = await supabase
    .from("connected_accounts")
    .update(updates)
    .eq("id", accountId);

  if (updateError) {
    console.error("Failed to persist refreshed token:", updateError.message);
    // Token still works for this request, but next request may fail
  }

  return result.accessToken;
}
