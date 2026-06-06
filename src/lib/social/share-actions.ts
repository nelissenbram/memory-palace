"use server";

import { createClient } from "@/lib/supabase/server";

/** Ensure the current user's profile is public (called on any publish action) */
async function ensureProfilePublic(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<void> {
  // Try conditional update first (no-op if already public)
  const { error } = await supabase
    .from("profiles")
    .update({ is_public: true })
    .eq("id", userId)
    .eq("is_public", false);

  // If that failed, force-set without the is_public=false guard
  if (error) {
    await supabase
      .from("profiles")
      .update({ is_public: true })
      .eq("id", userId);
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

/** Publish a room — handles both DB UUIDs and local room IDs (e.g. "cr3") */
export async function publishRoom(input: {
  roomId: string;
  wingId?: string; // required if roomId is a local room ID
  description?: string;
  visibility?: "public" | "followers";
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  let dbRoomId = input.roomId;

  // If roomId looks like a local room ID (2 letters + digits), ensure DB row exists
  if (/^[a-z]{2}\d+$/.test(input.roomId) && input.wingId) {
    const { data: existing } = await supabase
      .from("rooms")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", input.roomId)
      .single();

    if (existing) {
      dbRoomId = existing.id;
    } else {
      // Create the room in DB
      const { data: newRoom, error: createErr } = await supabase
        .from("rooms")
        .insert({ wing_id: input.wingId, user_id: user.id, name: input.roomId })
        .select("id")
        .single();
      if (createErr || !newRoom) return { ok: false, error: createErr?.message || "Could not create room" };
      dbRoomId = newRoom.id;
    }
  }

  const { error } = await supabase
    .from("rooms")
    .update({
      published_at: new Date().toISOString(),
      publish_description: input.description?.slice(0, 500) || null,
      publish_visibility: input.visibility || "public",
    })
    .eq("id", dbRoomId)
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

/** Get current user's wings + rooms with publish status (for granular publish modal) */
export interface PublishableWing {
  id: string;
  slug: string;
  name: string;
  published: boolean;
  rooms: { id: string; name: string; icon: string; published: boolean }[];
}

export async function getMyPublishableContent(): Promise<PublishableWing[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: wings } = await supabase
    .from("wings")
    .select("id, slug, custom_name, published_at")
    .eq("user_id", user.id)
    .order("slug", { ascending: true });

  if (!wings || wings.length === 0) return [];

  const wingIds = wings.map((w) => w.id);
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, icon, wing_id, published_at")
    .in("wing_id", wingIds)
    .order("sort_order", { ascending: true });

  // Cross-reference with constants for display names
  // DB room.name stores the local room ID (e.g. "ro1", "kr2"), not the display name
  const { WINGS, WING_ROOMS } = await import("@/lib/constants/wings");

  // Also load user's custom rooms from profile local_settings
  const { data: profile } = await supabase
    .from("profiles")
    .select("local_settings")
    .eq("id", user.id)
    .single();
  let customRooms: Record<string, { id: string; name: string; icon: string }[]> = {};
  let customWings: Record<string, { name?: string; icon?: string }> = {};
  try {
    const ls = profile?.local_settings as Record<string, unknown> | null;
    if (ls) {
      // mp_custom_rooms: may be a JSON string (from localStorage sync) or already parsed
      const rawRooms = ls.mp_custom_rooms;
      if (typeof rawRooms === "string") {
        customRooms = JSON.parse(rawRooms);
      } else if (rawRooms && typeof rawRooms === "object") {
        customRooms = rawRooms as typeof customRooms;
      }
      // mp_custom_wings: same treatment
      const rawWings = ls.mp_custom_wings;
      if (typeof rawWings === "string") {
        customWings = JSON.parse(rawWings);
      } else if (rawWings && typeof rawWings === "object") {
        customWings = rawWings as typeof customWings;
      }
    }
  } catch {}

  // Build a flat lookup: localRoomId → display name, across ALL wings in customRooms
  const roomNameMap = new Map<string, { name: string; icon: string }>();
  for (const wingRooms of Object.values(customRooms)) {
    if (Array.isArray(wingRooms)) {
      for (const cr of wingRooms) {
        if (cr.id && cr.name) roomNameMap.set(cr.id, { name: cr.name, icon: cr.icon });
      }
    }
  }
  // Also add defaults
  for (const defRooms of Object.values(WING_ROOMS)) {
    for (const dr of defRooms) {
      if (!roomNameMap.has(dr.id)) {
        roomNameMap.set(dr.id, { name: dr.name, icon: dr.icon });
      }
    }
  }

  // Build DB room lookup: localRoomId → { dbId, wingId, published, icon }
  const dbRoomMap = new Map<string, { id: string; wing_id: string; published: boolean; icon: string }>();
  for (const r of rooms || []) {
    dbRoomMap.set(`${r.wing_id}:${r.name}`, { id: r.id, wing_id: r.wing_id, published: !!r.published_at, icon: r.icon });
  }

  return wings.map((w) => {
    const defaultWing = WINGS.find((dw) => dw.id === w.slug);
    const cw = customWings[w.slug];

    // Build the full room list from client-side sources (customRooms or WING_ROOMS)
    // then overlay DB publish status
    const clientRooms: { id: string; name: string; icon: string }[] =
      customRooms[w.slug] && Array.isArray(customRooms[w.slug]) && customRooms[w.slug].length > 0
        ? customRooms[w.slug]
        : WING_ROOMS[w.slug] || [];

    // Also include any DB-only rooms not in the client list (edge case)
    const clientRoomIds = new Set(clientRooms.map((cr) => cr.id));
    const dbOnlyRooms = (rooms || [])
      .filter((r) => r.wing_id === w.id && !clientRoomIds.has(r.name))
      .map((r) => {
        const mapped = roomNameMap.get(r.name);
        let displayName = mapped?.name || r.name;
        if (!mapped && /^[a-z]{2}\d+$/.test(r.name)) {
          displayName = `Room ${r.name.replace(/^[a-z]+/, "")}`;
        }
        return { id: r.name, name: displayName, icon: r.icon || mapped?.icon || "📁" };
      });

    const allRooms = [...clientRooms, ...dbOnlyRooms];

    return {
      id: w.id,
      slug: w.slug,
      name: w.custom_name || cw?.name || defaultWing?.name || w.slug,
      published: !!w.published_at,
      rooms: allRooms.map((cr) => {
        const dbRoom = dbRoomMap.get(`${w.id}:${cr.id}`);
        return {
          id: dbRoom?.id || cr.id, // Use DB UUID if exists, else local room ID
          name: cr.name,
          icon: cr.icon || "📁",
          published: dbRoom?.published || false,
        };
      }),
    };
  });
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
