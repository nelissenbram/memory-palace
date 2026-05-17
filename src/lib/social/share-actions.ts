"use server";

import { createClient } from "@/lib/supabase/server";

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
