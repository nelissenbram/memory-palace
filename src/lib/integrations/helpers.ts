/**
 * Shared helpers for integration API routes.
 */

import { createClient } from "@/lib/supabase/server";

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
  // In production, use the deployed URL. In dev, use localhost.
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
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
 * Check if a file type is importable.
 */
export function isImportable(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.has(mimeType) || SUPPORTED_VIDEO_TYPES.has(mimeType);
}
