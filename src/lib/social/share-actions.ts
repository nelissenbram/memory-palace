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

  // Notify followers about the publish
  try {
    const { createBulkNotifications } = await import("@/lib/auth/notification-actions");
    const { getUserLocale, serverTf } = await import("@/lib/i18n/server");
    // Throttle: skip if same user published within last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
    const { count: recentPublishes } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("from_user_id", user.id)
      .eq("type", "followed_published")
      .gte("created_at", oneHourAgo);
    if ((recentPublishes || 0) === 0) {
      const { data: followers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id)
        .limit(500);
      if (followers && followers.length > 0) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();
        const myName = myProfile?.display_name || "Someone";
        const items = await Promise.all(
          followers.map(async (f) => {
            const locale = await getUserLocale(f.follower_id);
            return {
              userId: f.follower_id,
              type: "followed_published",
              message: serverTf("notif_followed_published", locale, { name: myName }),
              fromUserId: user.id,
              fromUserName: myName,
              wingId: input.wingId,
            };
          }),
        );
        await createBulkNotifications(items);
      }
    }
  } catch {
    // Notifications may not be available
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

  // Notify followers about the publish
  try {
    const { createBulkNotifications } = await import("@/lib/auth/notification-actions");
    const { getUserLocale, serverTf } = await import("@/lib/i18n/server");
    const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
    const { count: recentPublishes } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("from_user_id", user.id)
      .eq("type", "followed_published")
      .gte("created_at", oneHourAgo);
    if ((recentPublishes || 0) === 0) {
      const { data: followers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id)
        .limit(500);
      if (followers && followers.length > 0) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();
        const myName = myProfile?.display_name || "Someone";
        const items = await Promise.all(
          followers.map(async (f) => {
            const locale = await getUserLocale(f.follower_id);
            return {
              userId: f.follower_id,
              type: "followed_published",
              message: serverTf("notif_followed_published", locale, { name: myName }),
              fromUserId: user.id,
              fromUserName: myName,
              roomId: dbRoomId,
            };
          }),
        );
        await createBulkNotifications(items);
      }
    }
  } catch {
    // Notifications may not be available
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

  const { WINGS, WING_ROOMS } = await import("@/lib/constants/wings");
  type Wing = (typeof WINGS)[number];

  // ── 1. Load effective room/wing config from profiles.local_settings (source of truth) ──
  const { data: profile } = await supabase
    .from("profiles")
    .select("local_settings")
    .eq("id", user.id)
    .single();

  let customRooms: Record<string, { id: string; name: string; icon: string }[]> = {};
  let customWings: Record<string, { name?: string; icon?: string }> = {};
  let extraWings: Wing[] = [];
  try {
    const ls = profile?.local_settings as Record<string, unknown> | null;
    if (ls) {
      const rawRooms = ls.mp_custom_rooms;
      if (typeof rawRooms === "string") {
        try { customRooms = JSON.parse(rawRooms); } catch { /* ignore */ }
      } else if (rawRooms && typeof rawRooms === "object") {
        customRooms = rawRooms as typeof customRooms;
      }
      const rawWings = ls.mp_custom_wings;
      if (typeof rawWings === "string") {
        try { customWings = JSON.parse(rawWings); } catch { /* ignore */ }
      } else if (rawWings && typeof rawWings === "object") {
        customWings = rawWings as typeof customWings;
      }
      const rawExtra = ls.mp_extra_wings;
      if (typeof rawExtra === "string") {
        try { extraWings = JSON.parse(rawExtra); } catch { /* ignore */ }
      } else if (Array.isArray(rawExtra)) {
        extraWings = rawExtra as Wing[];
      }
    }
  } catch {}

  // Build effective wing list (standard + extra, excluding attic)
  const allWingDefs = [...WINGS.filter((w) => w.id !== "attic"), ...extraWings];

  // ── 2. Query DB for publish status ──
  const { data: dbWings } = await supabase
    .from("wings")
    .select("id, slug, published_at")
    .eq("user_id", user.id);

  const { data: dbRooms } = await supabase
    .from("rooms")
    .select("id, name, icon, wing_id, published_at")
    .eq("user_id", user.id);

  // Map: wing slug → DB wing row
  const dbWingMap = new Map<string, { id: string; published: boolean }>();
  for (const w of dbWings || []) {
    dbWingMap.set(w.slug, { id: w.id, published: !!w.published_at });
  }

  // Map: room localId → DB room row (use localId since rooms may be in different wings in DB vs roomStore)
  const dbRoomMap = new Map<string, { id: string; published: boolean; icon: string }>();
  for (const r of dbRooms || []) {
    dbRoomMap.set(r.name, { id: r.id, published: !!r.published_at, icon: r.icon });
  }

  // ── 3. Build wing tree from effective config with DB publish status ──
  return allWingDefs
    .map((w) => {
      const cw = customWings[w.id];
      const effectiveRooms = customRooms[w.id] || WING_ROOMS[w.id] || [];
      const dbWing = dbWingMap.get(w.id);

      return {
        id: dbWing?.id || w.id,
        slug: w.id,
        name: cw?.name || w.name,
        published: dbWing?.published || false,
        rooms: effectiveRooms.map((cr) => {
          const dbRoom = dbRoomMap.get(cr.id);
          return {
            id: dbRoom?.id || cr.id,
            name: cr.name,
            icon: cr.icon || dbRoom?.icon || "📁",
            published: dbRoom?.published || false,
          };
        }),
      };
    })
    .filter((w) => w.rooms.length > 0);
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
