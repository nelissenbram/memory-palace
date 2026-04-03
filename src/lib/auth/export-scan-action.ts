"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { WINGS, WING_ROOMS } from "@/lib/constants/wings";

export interface ExportRoomNode {
  roomId: string;
  localId: string;
  name: string;
  icon: string;
  memoryCount: number;
  photoCount: number;
}

export interface ExportWingNode {
  slug: string;
  name: string;
  icon: string;
  rooms: ExportRoomNode[];
}

export interface ExportSharedWingNode {
  shareId: string;
  wingSlug: string;
  wingName: string;
  wingIcon: string;
  ownerName: string;
  rooms: ExportRoomNode[];
}

export interface ExportTree {
  wings: ExportWingNode[];
  shared: ExportSharedWingNode[];
  meta: Record<string, number>;
}

function roomDisplayName(dbName: string): string {
  for (const rooms of Object.values(WING_ROOMS)) {
    const match = rooms.find((r: { id: string; name: string }) => r.id === dbName);
    if (match) return match.name;
  }
  return dbName;
}

function roomDisplayIcon(dbName: string): string {
  for (const rooms of Object.values(WING_ROOMS)) {
    const match = rooms.find((r: { id: string; icon: string }) => r.id === dbName);
    if (match) return match.icon;
  }
  return "";
}

export async function scanExportTree(): Promise<ExportTree> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { wings: [], shared: [], meta: {} };

  const admin = createAdminClient();
  const uid = user.id;

  // Fetch user's wings and rooms
  const [{ data: dbWings }, { data: dbRooms }] = await Promise.all([
    supabase.from("wings").select("id, slug").eq("user_id", uid),
    supabase.from("rooms").select("id, name, icon, wing_id").eq("user_id", uid),
  ]);

  // Fetch all memories (just room_id + file info for counting)
  const { data: allMems } = await supabase
    .from("memories")
    .select("room_id, file_path, file_url")
    .eq("user_id", uid);

  // Count memories and photos per room
  const memCountByRoom: Record<string, number> = {};
  const photoCountByRoom: Record<string, number> = {};
  for (const m of allMems || []) {
    memCountByRoom[m.room_id] = (memCountByRoom[m.room_id] || 0) + 1;
    if (m.file_path || m.file_url) {
      photoCountByRoom[m.room_id] = (photoCountByRoom[m.room_id] || 0) + 1;
    }
  }

  // Map wing UUID → slug
  const wingUuidToSlug: Record<string, string> = {};
  for (const w of dbWings || []) {
    wingUuidToSlug[w.id] = w.slug;
  }

  // Build wing tree
  const wingMap: Record<string, ExportRoomNode[]> = {};
  for (const r of dbRooms || []) {
    const slug = wingUuidToSlug[r.wing_id];
    if (!slug) continue;
    if (!wingMap[slug]) wingMap[slug] = [];
    wingMap[slug].push({
      roomId: r.id,
      localId: r.name,
      name: roomDisplayName(r.name),
      icon: r.icon || roomDisplayIcon(r.name),
      memoryCount: memCountByRoom[r.id] || 0,
      photoCount: photoCountByRoom[r.id] || 0,
    });
  }

  const wings: ExportWingNode[] = WINGS
    .filter(w => w.id !== "attic")
    .map(w => ({
      slug: w.id,
      name: w.name,
      icon: w.icon,
      rooms: wingMap[w.id] || [],
    }))
    .filter(w => w.rooms.length > 0);

  // Fetch shared wings (accepted)
  const { data: wingShares } = await admin
    .from("wing_shares")
    .select("id, wing_id, owner_id, permission")
    .eq("shared_with_id", uid)
    .eq("status", "accepted");

  const shared: ExportSharedWingNode[] = [];
  if (wingShares && wingShares.length > 0) {
    // Resolve owner names
    const ownerIds = [...new Set(wingShares.map(s => s.owner_id))];
    const nameMap: Record<string, string> = {};
    if (ownerIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", ownerIds);
      for (const p of profiles || []) {
        nameMap[p.id] = p.display_name || "Someone";
      }
    }

    for (const share of wingShares) {
      const wingDef = WINGS.find(w => w.id === share.wing_id);

      // Fetch owner's wing UUID
      const { data: wing } = await admin
        .from("wings")
        .select("id")
        .eq("slug", share.wing_id)
        .eq("user_id", share.owner_id)
        .single();

      if (!wing) continue;

      // Fetch rooms
      const { data: rooms } = await admin
        .from("rooms")
        .select("id, name, icon")
        .eq("wing_id", wing.id)
        .eq("user_id", share.owner_id);

      // Count memories per room
      const roomIds = (rooms || []).map((r: { id: string }) => r.id);
      const sharedMemsByRoom: Record<string, { total: number; photos: number }> = {};
      if (roomIds.length > 0) {
        const { data: mems } = await admin
          .from("memories")
          .select("room_id, file_path, file_url")
          .in("room_id", roomIds);
        for (const m of mems || []) {
          if (!sharedMemsByRoom[m.room_id]) sharedMemsByRoom[m.room_id] = { total: 0, photos: 0 };
          sharedMemsByRoom[m.room_id].total++;
          if (m.file_path || m.file_url) sharedMemsByRoom[m.room_id].photos++;
        }
      }

      shared.push({
        shareId: share.id,
        wingSlug: share.wing_id,
        wingName: wingDef?.name || share.wing_id.charAt(0).toUpperCase() + share.wing_id.slice(1),
        wingIcon: wingDef?.icon || "",
        ownerName: nameMap[share.owner_id] || "Someone",
        rooms: (rooms || []).map((r: { id: string; name: string; icon: string }) => ({
          roomId: r.id,
          localId: r.name,
          name: roomDisplayName(r.name),
          icon: r.icon || roomDisplayIcon(r.name),
          memoryCount: sharedMemsByRoom[r.id]?.total || 0,
          photoCount: sharedMemsByRoom[r.id]?.photos || 0,
        })),
      });
    }
  }

  // Meta counts (non-palace data)
  const sq = async (table: string, col: string) => {
    try {
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq(col, uid);
      return count || 0;
    } catch { return 0; }
  };

  const [interviews, progress, points, familyTree, familyGroups, legacy, sharing, notifications, connections] = await Promise.all([
    sq("interview_sessions", "user_id"),
    sq("track_progress", "user_id"),
    sq("memory_points", "user_id"),
    sq("family_tree_persons", "user_id"),
    sq("family_groups", "created_by"),
    sq("legacy_contacts", "user_id"),
    sq("room_shares", "owner_id"),
    sq("notifications", "user_id"),
    sq("connected_accounts", "user_id"),
  ]);

  return {
    wings,
    shared,
    meta: {
      interviews, progress, points, family_tree: familyTree,
      family_groups: familyGroups, legacy, sharing, notifications, connections,
    },
  };
}

/** Fetch memories for a shared room (bypasses RLS via admin) */
export async function fetchSharedRoomMemoriesForExport(shareId: string, roomId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  // Verify the caller has access
  const { data: share } = await admin
    .from("wing_shares")
    .select("id, wing_id, owner_id")
    .eq("id", shareId)
    .eq("shared_with_id", user.id)
    .eq("status", "accepted")
    .single();

  if (!share) return [];

  // Verify room belongs to the shared wing
  const { data: wing } = await admin
    .from("wings")
    .select("id")
    .eq("slug", share.wing_id)
    .eq("user_id", share.owner_id)
    .single();

  if (!wing) return [];

  const { data: room } = await admin
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .eq("wing_id", wing.id)
    .single();

  if (!room) return [];

  const { data: memories } = await admin
    .from("memories")
    .select("*")
    .eq("room_id", roomId)
    .order("position_index", { ascending: true });

  return memories || [];
}
