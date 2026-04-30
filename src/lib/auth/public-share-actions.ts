"use server";

import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { serverError } from "@/lib/i18n/server-errors";

// Generate a short, URL-friendly slug
function generateSlug(): string {
  return crypto.randomBytes(6).toString("base64url"); // 8 chars, URL-safe
}

// Map local room ID prefix to wing slug
function wingSlugFromRoomId(localRoomId: string): string {
  const prefix = localRoomId.slice(0, 2);
  const map: Record<string, string> = {
    ro: "roots",
    ne: "nest",
    cf: "craft",
    tv: "travel",
    pa: "passions",
    at: "attic",
  };
  return map[prefix] || "roots";
}

// Resolve local room ID to DB UUID
async function resolveRoomId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  localRoomId: string
) {
  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("user_id", userId)
    .eq("name", localRoomId)
    .single();
  if (room) return room.id;

  // Create room if it doesn't exist
  const wingSlug = wingSlugFromRoomId(localRoomId);
  const { data: wing } = await supabase
    .from("wings")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", wingSlug)
    .single();
  if (!wing) return null;

  const { data: newRoom } = await supabase
    .from("rooms")
    .insert({ wing_id: wing.id, user_id: userId, name: localRoomId })
    .select("id")
    .single();
  return newRoom?.id || null;
}

/**
 * Fetch the current public share for a room (if any).
 */
export async function fetchPublicShare(localRoomId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { publicShare: null };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { publicShare: null };

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", localRoomId)
    .single();
  if (!room) return { publicShare: null };

  const { data: share } = await supabase
    .from("public_shares")
    .select("id, slug, is_active, created_at")
    .eq("room_id", room.id)
    .eq("created_by", user.id)
    .single();

  return { publicShare: share || null };
}

/**
 * Create or toggle a public share for a room.
 * If no share exists, create one. If one exists, toggle is_active.
 */
export async function togglePublicShare(localRoomId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const dbRoomId = await resolveRoomId(supabase, user.id, localRoomId);
  if (!dbRoomId) { const t = await serverError(); return { error: t("couldNotResolveRoom") }; }

  // Find the wing for this room
  const { data: room } = await supabase
    .from("rooms")
    .select("id, wing_id")
    .eq("id", dbRoomId)
    .single();

  // Check for existing public share
  const { data: existing } = await supabase
    .from("public_shares")
    .select("id, slug, is_active")
    .eq("room_id", dbRoomId)
    .eq("created_by", user.id)
    .single();

  if (existing) {
    // Toggle is_active
    const newState = !existing.is_active;
    const { error } = await supabase
      .from("public_shares")
      .update({ is_active: newState })
      .eq("id", existing.id);
    if (error) return { error: error.message };
    return { publicShare: { ...existing, is_active: newState } };
  }

  // Create new public share
  const slug = generateSlug();
  const { data: share, error } = await supabase
    .from("public_shares")
    .insert({
      room_id: dbRoomId,
      wing_id: room?.wing_id || null,
      slug,
      created_by: user.id,
      is_active: true,
    })
    .select("id, slug, is_active, created_at")
    .single();

  if (error) return { error: error.message };
  return { publicShare: share };
}

/**
 * Deactivate (but don't delete) a public share.
 */
export async function deactivatePublicShare(localRoomId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    { const t = await serverError(); return { error: t("supabaseNotConfigured") }; }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { const t = await serverError(); return { error: t("notAuthenticated") }; }

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", localRoomId)
    .single();
  if (!room) { const t = await serverError(); return { error: t("roomNotFound") }; }

  const { error } = await supabase
    .from("public_shares")
    .update({ is_active: false })
    .eq("room_id", room.id)
    .eq("created_by", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
