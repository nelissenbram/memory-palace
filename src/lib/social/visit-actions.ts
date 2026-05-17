"use server";

import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();

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
  const supabase = await createClient();

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, icon, cover_hue, publish_description, published_at, wing_id, user_id")
    .eq("wing_id", wingId)
    .not("published_at", "is", null)
    .order("sort_order", { ascending: true });

  if (!rooms || rooms.length === 0) return [];

  const roomIds = rooms.map((r) => r.id);

  // Batch: memory counts + visit counts in parallel
  const [{ data: memoryRows }, { data: visitRows }] = await Promise.all([
    supabase.from("memories").select("room_id").in("room_id", roomIds),
    supabase.from("palace_visits").select("room_id").in("room_id", roomIds),
  ]);

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
    name: r.name,
    icon: r.icon,
    cover_hue: r.cover_hue,
    publish_description: r.publish_description,
    published_at: r.published_at!,
    wing_id: r.wing_id,
    owner_id: r.user_id,
    memory_count: memoryCounts.get(r.id) || 0,
    visit_count: visitCounts.get(r.id) || 0,
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
  } catch {
    // Silently fail
  }
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
