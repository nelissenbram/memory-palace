"use server";

import { createClient } from "@/lib/supabase/server";

/** Ensure the current user's profile is public (called on any publish action) */
async function ensureProfilePublic(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<void> {
  try {
    await supabase
      .from("profiles")
      .update({ is_public: true })
      .eq("id", userId)
      .eq("is_public", false); // no-op if already public
  } catch {
    // Non-fatal — publishing still succeeds
  }
}

/** Publish a wing (make it publicly visitable) */
export async function publishWing(input: {
  wingId: string;
  description?: string;
  visibility?: "public" | "followers";
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("wings")
    .update({
      published_at: new Date().toISOString(),
      publish_description: input.description?.slice(0, 500) || null,
      publish_visibility: input.visibility || "public",
    })
    .eq("id", input.wingId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  // Make profile visible in the directory
  await ensureProfilePublic(supabase, user.id);

  // Record activity
  try {
    const { recordActivity } = await import("./feed-actions");
    await recordActivity({
      actionType: "published",
      targetType: "wing",
      targetId: input.wingId,
    });
  } catch {
    // Feed may not exist
  }

  return { ok: true };
}

/** Publish a room */
export async function publishRoom(input: {
  roomId: string;
  description?: string;
  visibility?: "public" | "followers";
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("rooms")
    .update({
      published_at: new Date().toISOString(),
      publish_description: input.description?.slice(0, 500) || null,
      publish_visibility: input.visibility || "public",
    })
    .eq("id", input.roomId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  // Make profile visible in the directory
  await ensureProfilePublic(supabase, user.id);

  // Record activity
  try {
    const { recordActivity } = await import("./feed-actions");
    await recordActivity({
      actionType: "published",
      targetType: "room",
      targetId: input.roomId,
    });
  } catch {
    // Feed may not exist
  }

  return { ok: true };
}

/** Publish all wings for the current user at once */
export async function publishAllWings(input: {
  description?: string;
  visibility?: "public" | "followers";
}): Promise<{ ok: boolean; count: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, count: 0, error: "Not authenticated" };

  const now = new Date().toISOString();

  const { data: wings, error: fetchError } = await supabase
    .from("wings")
    .select("id")
    .eq("user_id", user.id)
    .is("published_at", null); // only unpublished ones

  if (fetchError) return { ok: false, count: 0, error: fetchError.message };
  if (!wings || wings.length === 0) {
    // All wings already published — still ensure profile is public
    await ensureProfilePublic(supabase, user.id);
    return { ok: true, count: 0 };
  }

  const wingIds = wings.map((w) => w.id);

  const { error } = await supabase
    .from("wings")
    .update({
      published_at: now,
      publish_description: input.description?.slice(0, 500) || null,
      publish_visibility: input.visibility || "public",
    })
    .in("id", wingIds)
    .eq("user_id", user.id);

  if (error) return { ok: false, count: 0, error: error.message };

  // Make profile visible in the directory
  await ensureProfilePublic(supabase, user.id);

  // Record a single "published palace" activity
  try {
    const { recordActivity } = await import("./feed-actions");
    await recordActivity({
      actionType: "published",
      targetType: "wing",
      targetId: wingIds[0],
    });
  } catch {
    // Feed may not exist
  }

  return { ok: true, count: wingIds.length };
}

/** Unpublish a wing */
export async function unpublishWing(wingId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("wings")
    .update({
      published_at: null,
      publish_description: null,
      publish_visibility: "private",
    })
    .eq("id", wingId)
    .eq("user_id", user.id);

  return { ok: true };
}

/** Unpublish a room */
export async function unpublishRoom(roomId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("rooms")
    .update({
      published_at: null,
      publish_description: null,
      publish_visibility: "private",
    })
    .eq("id", roomId)
    .eq("user_id", user.id);

  return { ok: true };
}
