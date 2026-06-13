"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface PublishedWing {
  id: string;
  slug: string;
  custom_name: string | null;
  accent_color: string | null;
  publish_description: string | null;
  published_at: string;
  owner_id: string;
  owner_name: string | null;
  owner_avatar: string | null;
  room_count: number;
  visit_count: number;
}

export interface PublishedRoom {
  id: string;
  name: string;
  icon: string;
  cover_hue: number;
  publish_description: string | null;
  published_at: string;
  wing_id: string;
  owner_id: string;
  memory_count: number;
  visit_count: number;
}

/** Get published wings for a user */
export async function getPublishedWings(
  userId: string
): Promise<PublishedWing[]> {
  const supabase = createAdminClient();

  const { data: wings } = await supabase
    .from("wings")
    .select("id, slug, custom_name, accent_color, publish_description, published_at, user_id")
    .eq("user_id", userId)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (!wings || wings.length === 0) return [];

  const wingIds = wings.map((w) => w.id);

  // Batch: owner profile + room counts + visit counts in parallel
  const [{ data: owner }, { data: roomRows }, { data: visitRows }] = await Promise.all([
    supabase.from("public_profiles").select("display_name, avatar_url").eq("id", userId).single(),
    supabase.from("rooms").select("wing_id").in("wing_id", wingIds),
    supabase.from("palace_visits").select("wing_id").in("wing_id", wingIds),
  ]);

  // Count per wing
  const roomCounts = new Map<string, number>();
  for (const r of roomRows || []) {
    roomCounts.set(r.wing_id, (roomCounts.get(r.wing_id) || 0) + 1);
  }
  const visitCounts = new Map<string, number>();
  for (const v of visitRows || []) {
    visitCounts.set(v.wing_id, (visitCounts.get(v.wing_id) || 0) + 1);
  }

  return wings.map((w) => ({
    id: w.id,
    slug: w.slug,
    custom_name: w.custom_name,
    accent_color: w.accent_color,
    publish_description: w.publish_description,
    published_at: w.published_at!,
    owner_id: w.user_id,
    owner_name: owner?.display_name || null,
    owner_avatar: owner?.avatar_url || null,
    room_count: roomCounts.get(w.id) || 0,
    visit_count: visitCounts.get(w.id) || 0,
  }));
}

/** Get published rooms for a wing */
export async function getPublishedRooms(
  wingId: string
): Promise<PublishedRoom[]> {
  const supabase = createAdminClient();

  // Get ALL rooms in the wing (if the wing is published, all its rooms are visible)
  const [{ data: rooms }, { data: wing }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, icon, cover_hue, publish_description, published_at, wing_id, user_id")
      .eq("wing_id", wingId)
      .order("sort_order", { ascending: true }),
    supabase.from("wings").select("slug, user_id").eq("id", wingId).single(),
  ]);

  if (!rooms || rooms.length === 0) return [];

  const roomIds = rooms.map((r) => r.id);

  // Batch: memory counts + visit counts in parallel
  const [{ data: memoryRows }, { data: visitRows }] = await Promise.all([
    supabase.from("memories").select("room_id").in("room_id", roomIds),
    supabase.from("palace_visits").select("room_id").in("room_id", roomIds),
  ]);

  // Fetch owner settings for room name resolution
  const { data: ownerProfile } = wing
    ? await supabase.from("profiles").select("local_settings").eq("id", wing.user_id).single()
    : { data: null };

  // Resolve room display names
  const { WING_ROOMS } = await import("@/lib/constants/wings");
  let ownerCustomRooms: Record<string, { id: string; name: string; icon: string }[]> = {};
  try {
    const ls = ownerProfile?.local_settings as Record<string, unknown> | null;
    if (ls) {
      const rawRooms = ls.mp_custom_rooms;
      if (typeof rawRooms === "string") {
        try { ownerCustomRooms = JSON.parse(rawRooms); } catch { /* ignore */ }
      } else if (rawRooms && typeof rawRooms === "object") {
        ownerCustomRooms = rawRooms as typeof ownerCustomRooms;
      }
    }
  } catch { /* ignore */ }
  const wingSlug = wing?.slug || "";
  const effectiveRooms = ownerCustomRooms[wingSlug] || WING_ROOMS[wingSlug] || [];
  const roomNameMap = new Map<string, { name: string; icon: string }>();
  for (const er of effectiveRooms) {
    roomNameMap.set(er.id, { name: er.name, icon: er.icon });
  }

  const memoryCounts = new Map<string, number>();
  for (const m of memoryRows || []) {
    memoryCounts.set(m.room_id, (memoryCounts.get(m.room_id) || 0) + 1);
  }
  const visitCounts = new Map<string, number>();
  for (const v of visitRows || []) {
    if (v.room_id) visitCounts.set(v.room_id, (visitCounts.get(v.room_id) || 0) + 1);
  }

  return rooms.map((r) => ({
    id: r.id,
    name: roomNameMap.get(r.name)?.name || r.name,
    icon: roomNameMap.get(r.name)?.icon || r.icon,
    cover_hue: r.cover_hue,
    publish_description: r.publish_description,
    published_at: r.published_at!,
    wing_id: r.wing_id,
    owner_id: r.user_id,
    memory_count: memoryCounts.get(r.id) || 0,
    visit_count: visitCounts.get(r.id) || 0,
  }));
}

export interface PublishedMemory {
  id: string;
  title: string;
  description: string | null;
  type: string;
  file_url: string | null;
  thumbnail_url: string | null;
  hue: number;
  saturation: number;
  lightness: number;
}

/** Get memories for a room (admin client to bypass RLS for cross-user reads) */
export async function getPublishedMemories(
  roomId: string
): Promise<PublishedMemory[]> {
  const supabase = createAdminClient();

  const { data: memories } = await supabase
    .from("memories")
    .select("id, title, description, type, file_url, thumbnail_url, hue, saturation, lightness")
    .eq("room_id", roomId)
    .order("sort_order", { ascending: true });

  if (!memories || memories.length === 0) return [];

  return memories.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    type: m.type,
    file_url: m.file_url,
    thumbnail_url: m.thumbnail_url,
    hue: m.hue ?? 30,
    saturation: m.saturation ?? 50,
    lightness: m.lightness ?? 60,
  }));
}

/** Record a visit to a published wing/room */
export async function recordVisit(input: {
  ownerId: string;
  wingId?: string;
  roomId?: string;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id === input.ownerId) return;

  try {
    // Dedup: skip if same visitor visited same target in last 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    let dedupQuery = supabase
      .from("palace_visits")
      .select("id", { count: "exact", head: true })
      .eq("visitor_id", user.id)
      .eq("owner_id", input.ownerId)
      .gte("visited_at", fiveMinAgo);
    if (input.wingId) dedupQuery = dedupQuery.eq("wing_id", input.wingId);
    if (input.roomId) dedupQuery = dedupQuery.eq("room_id", input.roomId);
    const { count } = await dedupQuery;
    if ((count || 0) > 0) return;

    await supabase.from("palace_visits").insert({
      visitor_id: user.id,
      owner_id: input.ownerId,
      wing_id: input.wingId || null,
      room_id: input.roomId || null,
    });

    // Record activity
    const { recordActivity } = await import("./feed-actions");
    await recordActivity({
      actionType: "visited",
      targetType: input.roomId ? "room" : "wing",
      targetId: input.roomId || input.wingId,
      targetUserId: input.ownerId,
      metadata: {
        wingId: input.wingId,
        roomId: input.roomId,
      },
    });

    // Notify palace owner about the visit
    try {
      const { createNotification } = await import("@/lib/auth/notification-actions");
      const { getUserLocale, serverTf } = await import("@/lib/i18n/server");
      const ownerLocale = await getUserLocale(input.ownerId);
      const { data: visitorProfile } = await supabase
        .from("public_profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      const fromName = visitorProfile?.display_name || "Someone";
      const msg = serverTf("notif_palace_visit", ownerLocale, { name: fromName });
      await createNotification({
        userId: input.ownerId,
        type: "palace_visit",
        message: msg,
        fromUserId: user.id,
        fromUserName: fromName,
        wingId: input.wingId,
      });
    } catch {
      // Notifications may not be available
    }
  } catch {
    // Silently fail
  }
}

/** Get full 3D-ready data for a published wing (rooms + memories) */
export interface VisitorWingData {
  wing: {
    id: string;
    slug: string;
    name: string;
    accent_color: string;
    wall_color: string;
    floor_color: string;
  };
  rooms: {
    id: string;
    name: string;
    icon: string;
    coverHue: number;
    memories: {
      id: string;
      title: string;
      desc: string | null;
      type: string;
      hue: number;
      s: number;
      l: number;
      dataUrl: string | null;
      thumbnailUrl: string | null;
      displayed: boolean;
      displayUnit?: string;
    }[];
  }[];
  owner: {
    id: string;
    name: string | null;
    username: string | null;
    styleEra: string;
  };
}

export async function getVisitorWingData(
  userId: string,
  wingSlug: string
): Promise<VisitorWingData | null> {
  const supabase = createAdminClient();

  // Get wing
  const { data: wing } = await supabase
    .from("wings")
    .select("id, slug, custom_name, accent_color")
    .eq("user_id", userId)
    .eq("slug", wingSlug)
    .not("published_at", "is", null)
    .single();

  if (!wing) return null;

  // Get rooms + owner profile + owner local_settings in parallel
  const [{ data: rooms }, { data: profile }, { data: ownerProfile }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, icon, cover_hue")
      .eq("wing_id", wing.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("public_profiles")
      .select("display_name, username")
      .eq("id", userId)
      .single(),
    supabase
      .from("profiles")
      .select("local_settings")
      .eq("id", userId)
      .single(),
  ]);

  const safeRooms = rooms || [];

  // Get all memories for all rooms in parallel
  const roomIds = safeRooms.map((r) => r.id);
  const { data: allMemories } = await supabase
    .from("memories")
    .select("id, title, description, type, hue, saturation, lightness, file_url, thumbnail_url, room_id, displayed, sort_order, display_unit")
    .in("room_id", roomIds)
    .order("sort_order", { ascending: true });

  // Group memories by room
  const memsByRoom = new Map<string, typeof allMemories>();
  for (const m of allMemories || []) {
    const list = memsByRoom.get(m.room_id) || [];
    list.push(m);
    memsByRoom.set(m.room_id, list);
  }

  // Find wing accent from WINGS defaults
  const { WINGS, WING_ROOMS } = await import("@/lib/constants/wings");
  const defaultWing = WINGS.find((w) => w.id === wing.slug);

  // Resolve room display names from owner's custom rooms or WING_ROOMS defaults
  // DB rooms.name stores the local room ID (e.g. "ne2"), not the display name
  let ownerCustomRooms: Record<string, { id: string; name: string; icon: string }[]> = {};
  try {
    const ls = ownerProfile?.local_settings as Record<string, unknown> | null;
    if (ls) {
      const rawRooms = ls.mp_custom_rooms;
      if (typeof rawRooms === "string") {
        try { ownerCustomRooms = JSON.parse(rawRooms); } catch { /* ignore */ }
      } else if (rawRooms && typeof rawRooms === "object") {
        ownerCustomRooms = rawRooms as typeof ownerCustomRooms;
      }
    }
  } catch { /* ignore */ }

  const effectiveRooms = ownerCustomRooms[wing.slug] || WING_ROOMS[wing.slug] || [];
  const roomNameMap = new Map<string, { name: string; icon: string }>();
  for (const er of effectiveRooms) {
    roomNameMap.set(er.id, { name: er.name, icon: er.icon });
  }

  // Also resolve wing display name from owner's custom wings
  let wingDisplayName = wing.custom_name || defaultWing?.name || wing.slug;
  try {
    const ls = ownerProfile?.local_settings as Record<string, unknown> | null;
    if (ls) {
      const rawWings = ls.mp_custom_wings;
      let customWings: Record<string, { name?: string }> = {};
      if (typeof rawWings === "string") {
        try { customWings = JSON.parse(rawWings); } catch { /* ignore */ }
      } else if (rawWings && typeof rawWings === "object") {
        customWings = rawWings as typeof customWings;
      }
      if (customWings[wing.slug]?.name) {
        wingDisplayName = customWings[wing.slug].name!;
      }
    }
  } catch { /* ignore */ }

  return {
    wing: {
      id: wing.id,
      slug: wing.slug,
      name: wingDisplayName,
      accent_color: wing.accent_color || defaultWing?.accent || "#C66B3D",
      wall_color: defaultWing?.wall || "#DDD4C6",
      floor_color: defaultWing?.floor || "#9E8264",
    },
    rooms: safeRooms.map((r) => ({
      id: r.id,
      name: roomNameMap.get(r.name)?.name || r.name,
      icon: roomNameMap.get(r.name)?.icon || r.icon,
      coverHue: r.cover_hue,
      memories: (memsByRoom.get(r.id) || []).map((m) => ({
        id: m.id,
        title: m.title,
        desc: m.description,
        type: m.type,
        hue: m.hue ?? 30,
        s: m.saturation ?? 50,
        l: m.lightness ?? 60,
        dataUrl: m.file_url,
        thumbnailUrl: m.thumbnail_url,
        displayed: m.displayed !== false,
        displayUnit: m.display_unit || undefined,
      })),
    })),
    owner: {
      id: userId,
      name: profile?.display_name || null,
      username: profile?.username || null,
      styleEra: "roman",
    },
  };
}

/** Get full 3D-ready data for ALL published wings of a user (for palace-level walk) */
export interface VisitorPalaceData {
  wings: VisitorWingData[];
  owner: {
    id: string;
    name: string | null;
    username: string | null;
    styleEra: string;
  };
}

export async function getVisitorPalaceData(
  userId: string
): Promise<VisitorPalaceData | null> {
  const supabase = createAdminClient();

  // Get all published wings
  const { data: wings } = await supabase
    .from("wings")
    .select("id, slug, custom_name, accent_color")
    .eq("user_id", userId)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (!wings || wings.length === 0) return null;

  const wingIds = wings.map((w) => w.id);

  // Get rooms, owner profile, owner local_settings in parallel
  const [{ data: allRooms }, { data: profile }, { data: ownerProfile }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, icon, cover_hue, wing_id")
      .in("wing_id", wingIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("public_profiles")
      .select("display_name, username")
      .eq("id", userId)
      .single(),
    supabase
      .from("profiles")
      .select("local_settings")
      .eq("id", userId)
      .single(),
  ]);

  const safeRooms = allRooms || [];
  const roomIds = safeRooms.map((r) => r.id);

  // Get all memories for all rooms
  const { data: allMemories } = roomIds.length > 0
    ? await supabase
        .from("memories")
        .select("id, title, description, type, hue, saturation, lightness, file_url, thumbnail_url, room_id, displayed, sort_order, display_unit")
        .in("room_id", roomIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  // Group rooms by wing
  const roomsByWing = new Map<string, typeof safeRooms>();
  for (const r of safeRooms) {
    const list = roomsByWing.get(r.wing_id) || [];
    list.push(r);
    roomsByWing.set(r.wing_id, list);
  }

  // Group memories by room
  const memsByRoom = new Map<string, typeof allMemories>();
  for (const m of allMemories || []) {
    const list = memsByRoom.get(m.room_id) || [];
    list.push(m);
    memsByRoom.set(m.room_id, list);
  }

  // Resolve custom names
  const { WINGS: DEFAULT_WINGS, WING_ROOMS } = await import("@/lib/constants/wings");

  let ownerCustomRooms: Record<string, { id: string; name: string; icon: string }[]> = {};
  let ownerCustomWings: Record<string, { name?: string }> = {};
  try {
    const ls = ownerProfile?.local_settings as Record<string, unknown> | null;
    if (ls) {
      const rawRooms = ls.mp_custom_rooms;
      if (typeof rawRooms === "string") {
        try { ownerCustomRooms = JSON.parse(rawRooms); } catch { /* ignore */ }
      } else if (rawRooms && typeof rawRooms === "object") {
        ownerCustomRooms = rawRooms as typeof ownerCustomRooms;
      }
      const rawWings = ls.mp_custom_wings;
      if (typeof rawWings === "string") {
        try { ownerCustomWings = JSON.parse(rawWings); } catch { /* ignore */ }
      } else if (rawWings && typeof rawWings === "object") {
        ownerCustomWings = rawWings as typeof ownerCustomWings;
      }
    }
  } catch { /* ignore */ }

  const owner = {
    id: userId,
    name: profile?.display_name || null,
    username: profile?.username || null,
    styleEra: "roman",
  };

  const wingDataList: VisitorWingData[] = wings.map((w) => {
    const defaultWing = DEFAULT_WINGS.find((dw) => dw.id === w.slug);
    let wingDisplayName = ownerCustomWings[w.slug]?.name || w.custom_name || defaultWing?.name || w.slug;

    const effectiveRooms = ownerCustomRooms[w.slug] || WING_ROOMS[w.slug] || [];
    const roomNameMap = new Map<string, { name: string; icon: string }>();
    for (const er of effectiveRooms) {
      roomNameMap.set(er.id, { name: er.name, icon: er.icon });
    }

    const wingRooms = roomsByWing.get(w.id) || [];

    return {
      wing: {
        id: w.id,
        slug: w.slug,
        name: wingDisplayName,
        accent_color: w.accent_color || defaultWing?.accent || "#C66B3D",
        wall_color: defaultWing?.wall || "#DDD4C6",
        floor_color: defaultWing?.floor || "#9E8264",
      },
      rooms: wingRooms.map((r) => ({
        id: r.id,
        name: roomNameMap.get(r.name)?.name || r.name,
        icon: roomNameMap.get(r.name)?.icon || r.icon,
        coverHue: r.cover_hue,
        memories: (memsByRoom.get(r.id) || []).map((m: any) => ({
          id: m.id,
          title: m.title,
          desc: m.description,
          type: m.type,
          hue: m.hue ?? 30,
          s: m.saturation ?? 50,
          l: m.lightness ?? 60,
          dataUrl: m.file_url,
          thumbnailUrl: m.thumbnail_url,
          displayed: m.displayed !== false,
          displayUnit: m.display_unit || undefined,
        })),
      })),
      owner,
    };
  });

  return { wings: wingDataList, owner };
}

/** Get visit count for a wing or room */
export async function getVisitCount(
  targetType: "wing" | "room",
  targetId: string
): Promise<number> {
  const supabase = await createClient();
  const column = targetType === "wing" ? "wing_id" : "room_id";

  const { count } = await supabase
    .from("palace_visits")
    .select("*", { count: "exact", head: true })
    .eq(column, targetId);

  return count || 0;
}
