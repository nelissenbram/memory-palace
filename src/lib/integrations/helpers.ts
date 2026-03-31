/**
 * Shared helpers for integration API routes.
 */

import { createClient } from "@/lib/supabase/server";
import { randomBytes, createHash } from "crypto";

/**
 * Custom error thrown when a provider token is expired/invalid and re-auth is needed.
 * Callers can check `instanceof TokenExpiredError` to show "re-authenticate" UI
 * instead of a generic 500.
 */
export class TokenExpiredError extends Error {
  public readonly provider: string;
  public readonly code = "TOKEN_EXPIRED";

  constructor(message: string, provider: string) {
    super(message);
    this.name = "TokenExpiredError";
    this.provider = provider;
  }
}

/**
 * Get the authenticated user or throw.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/**
 * Get the base URL for OAuth redirect URIs.
 */
export function getBaseUrl(): string {
  // Use the canonical site URL for stable OAuth redirect URIs.
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Store or update a connected account.
 */
export async function upsertConnectedAccount(params: {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  providerUserId?: string | null;
  providerEmail?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("connected_accounts")
    .upsert(
      {
        user_id: params.userId,
        provider: params.provider,
        access_token: params.accessToken,
        refresh_token: params.refreshToken || null,
        token_expires_at: params.tokenExpiresAt || null,
        provider_user_id: params.providerUserId || null,
        provider_email: params.providerEmail || null,
        metadata: params.metadata || {},
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to store connection: ${error.message}`);
  return data;
}

/**
 * Get a connected account for a user + provider.
 */
export async function getConnectedAccount(userId: string, provider: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();
  return data;
}

/**
 * Generate a random OAuth state parameter for CSRF protection.
 * The state is stored in an HttpOnly cookie and verified in the callback.
 */
export function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generate a PKCE code_verifier (RFC 7636).
 * Returns a random 64-character URL-safe string.
 */
export function generateCodeVerifier(): string {
  return randomBytes(48)
    .toString("base64url")
    .slice(0, 64);
}

/**
 * Compute the S256 code_challenge from a code_verifier (RFC 7636).
 */
export function computeCodeChallenge(verifier: string): string {
  return createHash("sha256")
    .update(verifier)
    .digest("base64url");
}

/**
 * Supported image MIME types for import.
 */
export const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "image/heic", "image/heif", "image/tiff", "image/bmp",
]);

/**
 * Supported video MIME types for import.
 */
export const SUPPORTED_VIDEO_TYPES = new Set([
  "video/mp4", "video/quicktime", "video/x-msvideo",
  "video/webm", "video/x-matroska",
]);

/**
 * Supported audio MIME types for import.
 */
export const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/mpeg", "audio/wav", "audio/x-wav", "audio/x-m4a", "audio/mp4",
]);

/**
 * Supported document MIME types for import.
 */
export const SUPPORTED_DOCUMENT_TYPES = new Set([
  "application/pdf", "text/plain",
]);

/**
 * Allowed file extensions for import (used when MIME type is unreliable).
 */
export const IMPORTABLE_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "tiff", "bmp",
  "mp4", "mov", "avi", "webm", "mkv",
  "mp3", "wav", "m4a",
  "pdf", "txt",
]);

/** Maximum file size for import: 50 MB */
export const MAX_IMPORT_FILE_SIZE = 50 * 1024 * 1024;

/** Maximum number of files per import request */
export const MAX_IMPORT_BATCH_SIZE = 50;

/**
 * Check if a file type is importable by MIME type.
 */
export function isImportable(mimeType: string): boolean {
  return (
    SUPPORTED_IMAGE_TYPES.has(mimeType) ||
    SUPPORTED_VIDEO_TYPES.has(mimeType) ||
    SUPPORTED_AUDIO_TYPES.has(mimeType) ||
    SUPPORTED_DOCUMENT_TYPES.has(mimeType)
  );
}

/**
 * Check if a file is importable by extension (fallback when MIME is unknown).
 */
export function isImportableByExtension(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return IMPORTABLE_EXTENSIONS.has(ext);
}

// ---------------------------------------------------------------------------
// Room ID resolution — map local room IDs (e.g. "tr4") to database UUIDs
// ---------------------------------------------------------------------------

/**
 * Map a local room ID prefix to a wing slug.
 * E.g. "tr4" → prefix "tr" → "travel".
 */
export function wingSlugFromRoomId(localRoomId: string): string {
  const prefix = localRoomId.slice(0, 2);
  const map: Record<string, string> = {
    fr: "family",
    tr: "travel",
    cr: "childhood",
    kr: "career",
    rr: "creativity",
  };
  return map[prefix] || "family";
}

/**
 * Resolve a local room ID (e.g. "tr4") to a database UUID.
 * Looks up an existing room by name, or creates one in the correct wing.
 * Works with any Supabase client that has the `from()` method.
 */
export async function resolveRoomId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (...args: any[]) => any; },
  userId: string,
  localRoomId: string,
): Promise<string | null> {
  // Check for existing room with this name
  const { data: existing } = await supabase
    .from("rooms")
    .select("id")
    .eq("user_id", userId)
    .eq("name", localRoomId)
    .single();

  if (existing) return existing.id;

  // Find the wing for this room
  const wingSlug = wingSlugFromRoomId(localRoomId);
  const { data: wing } = await supabase
    .from("wings")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", wingSlug)
    .single();

  if (!wing) return null;

  // Create the room
  const { data: room } = await supabase
    .from("rooms")
    .insert({ wing_id: wing.id, user_id: userId, name: localRoomId })
    .select("id")
    .single();

  return room?.id || null;
}

// ---------------------------------------------------------------------------
// In-memory rate limiter
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Simple in-memory fixed-window rate limiter.
 * Returns `true` if the request is allowed, `false` if rate-limited.
 *
 * @param key       Unique key (e.g. `userId:action`)
 * @param maxRequests  Max number of requests within the window
 * @param windowMs     Window duration in milliseconds
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now >= entry.resetAt) {
    // First request in window or window has expired — start fresh
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count < maxRequests) {
    entry.count++;
    return true;
  }

  // Rate limit exceeded
  return false;
}

/**
 * Revoke an OAuth token at the provider's revocation endpoint.
 * Best-effort: logs a warning on failure but never throws.
 */
export async function revokeProviderToken(
  provider: string,
  accessToken: string,
): Promise<void> {
  try {
    switch (provider) {
      case "google_photos": {
        const res = await fetch(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`,
          { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );
        if (!res.ok) {
          console.warn(`[revoke] Google token revocation returned ${res.status}: ${await res.text()}`);
        }
        break;
      }
      case "dropbox": {
        const res = await fetch("https://api.dropboxapi.com/2/auth/token/revoke", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          console.warn(`[revoke] Dropbox token revocation returned ${res.status}: ${await res.text()}`);
        }
        break;
      }
      case "onedrive": {
        // Microsoft/OneDrive does not provide a standard token revocation endpoint.
        // Deleting from the DB is sufficient.
        break;
      }
      case "box": {
        const res = await fetch("https://api.box.com/oauth2/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.BOX_CLIENT_ID!,
            client_secret: process.env.BOX_CLIENT_SECRET!,
            token: accessToken,
          }),
        });
        if (!res.ok) {
          console.warn(`[revoke] Box token revocation returned ${res.status}: ${await res.text()}`);
        }
        break;
      }
      default:
        console.warn(`[revoke] No revocation handler for provider: ${provider}`);
    }
  } catch (err) {
    console.warn(`[revoke] Failed to revoke ${provider} token:`, err);
  }
}
