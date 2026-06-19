"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { WINGS, WING_ROOMS } from "@/lib/constants/wings";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { serverT, getServerLocale } from "@/lib/i18n/server";

export interface ExportRoomNode {
  roomId: string;
  localId: string;
  name: string;
  nameKey?: string;
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

/**
 * Load the effective room/wing configuration from profiles.local_settings.
 * This mirrors what the client-side roomStore computes from localStorage,
 * giving us the true room tree the user sees in the palace.
 */
async function loadEffectiveConfig(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  let customRooms: Record<string, WingRoom[]> = {};
  let customWings: Record<string, Partial<{ name: string; icon: string; accent: string; desc: string }>> = {};
  let extraWings: Wing[] = [];

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("local_settings")
      .eq("id", userId)
      .single();
    const ls = profile?.local_settings as Record<string, unknown> | null;
    if (ls) {
      // Custom rooms per wing
      const rawRooms = ls.mp_custom_rooms;
      if (typeof rawRooms === "string") {
        try { customRooms = JSON.parse(rawRooms); } catch { /* ignore */ }
      } else if (rawRooms && typeof rawRooms === "object") {
        customRooms = rawRooms as typeof customRooms;
      }

      // Custom wing overrides (name, icon, accent)
      const rawWings = ls.mp_custom_wings;
      if (typeof rawWings === "string") {
        try { customWings = JSON.parse(rawWings); } catch { /* ignore */ }
      } else if (rawWings && typeof rawWings === "object") {
        customWings = rawWings as typeof customWings;
      }

      // Extra user-created wings
      const rawExtra = ls.mp_extra_wings;
      if (typeof rawExtra === "string") {
        try { extraWings = JSON.parse(rawExtra); } catch { /* ignore */ }
      } else if (Array.isArray(rawExtra)) {
        extraWings = rawExtra as Wing[];
      }
    }
  } catch { /* proceed with defaults */ }

  return { customRooms, customWings, extraWings };
}

export async function scanExportTree(): Promise<ExportTree> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { wings: [], shared: [], meta: {} };

  const admin = createAdminClient();
  const uid = user.id;

  // ── 1. Load the effective room/wing config (source of truth) ──
  const { customRooms, customWings, extraWings } = await loadEffectiveConfig(supabase, uid);

  // Build effective wing list (standard + extra, excluding attic)
  const allWingDefs = [
    ...WINGS.filter(w => w.id !== "attic"),
    ...extraWings,
  ];

  // Build effective rooms per wing (custom overrides defaults)
  const effectiveRooms: Record<string, WingRoom[]> = {};
  for (const w of allWingDefs) {
    effectiveRooms[w.id] = customRooms[w.id] || WING_ROOMS[w.id] || [];
  }

  // ── 2. Query DB rooms to map localId → UUID ──
  const { data: dbRooms } = await supabase
    .from("rooms")
    .select("id, name")
    .eq("user_id", uid);

  // Map: room local ID (e.g. "ro1", "ne1") → DB UUID
  const localIdToUuid: Record<string, string> = {};
  for (const r of dbRooms || []) {
    localIdToUuid[r.name] = r.id;
  }

  // ── 3. Query all memories for counting ──
  const { data: allMems } = await supabase
    .from("memories")
    .select("room_id, file_path, file_url")
    .eq("user_id", uid);

  const memCountByRoom: Record<string, number> = {};
  const photoCountByRoom: Record<string, number> = {};
  for (const m of allMems || []) {
    memCountByRoom[m.room_id] = (memCountByRoom[m.room_id] || 0) + 1;
    if (m.file_path || m.file_url) {
      photoCountByRoom[m.room_id] = (photoCountByRoom[m.room_id] || 0) + 1;
    }
  }

  // ── 4. Build wing tree from effective config ──
  const wings: ExportWingNode[] = allWingDefs
    .map(w => {
      const wc = customWings[w.id];
      const rooms = effectiveRooms[w.id] || [];
      return {
        slug: w.id,
        name: wc?.name || w.name,
        icon: wc?.icon || w.icon,
        rooms: rooms.map(r => {
          const dbId = localIdToUuid[r.id];
          return {
            roomId: dbId || `local:${r.id}`,
            localId: r.id,
            name: r.name,
            nameKey: r.nameKey,
            icon: r.icon,
            memoryCount: dbId ? (memCountByRoom[dbId] || 0) : 0,
            photoCount: dbId ? (photoCountByRoom[dbId] || 0) : 0,
          };
        }),
      };
    })
    .filter(w => w.rooms.length > 0);

  // ── 5. Fetch shared wings (accepted) ──
  const { data: wingShares } = await admin
    .from("wing_shares")
    .select("id, wing_id, owner_id, permission")
    .eq("shared_with_id", uid)
    .eq("status", "accepted");

  const expLocale = await getServerLocale();
  const shared: ExportSharedWingNode[] = [];
  if (wingShares && wingShares.length > 0) {
    // Resolve owner names
    const ownerIds = [...new Set(wingShares.map(s => s.owner_id))];
    const ownerNameMap: Record<string, string> = {};
    if (ownerIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", ownerIds);
      for (const p of profiles || []) {
        ownerNameMap[p.id] = p.display_name || serverT("someone", expLocale);
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

      // For shared rooms, load owner's custom room names
      let ownerNameMap2: Map<string, { name: string; nameKey?: string; icon: string }> | undefined;
      try {
        const { data: ownerProfile } = await admin
          .from("profiles")
          .select("local_settings")
          .eq("id", share.owner_id)
          .single();
        const ownerLs = ownerProfile?.local_settings as Record<string, unknown> | null;
        if (ownerLs) {
          let ownerCustomRooms: Record<string, { id: string; name: string; nameKey?: string; icon: string }[]> = {};
          const rawOwnerRooms = ownerLs.mp_custom_rooms;
          if (typeof rawOwnerRooms === "string") {
            try { ownerCustomRooms = JSON.parse(rawOwnerRooms); } catch { /* ignore */ }
          } else if (rawOwnerRooms && typeof rawOwnerRooms === "object") {
            ownerCustomRooms = rawOwnerRooms as typeof ownerCustomRooms;
          }
          ownerNameMap2 = new Map();
          for (const wingRooms of Object.values(ownerCustomRooms)) {
            if (Array.isArray(wingRooms)) {
              for (const cr of wingRooms) {
                if (cr.id && cr.name) ownerNameMap2.set(cr.id, { name: cr.name, nameKey: cr.nameKey, icon: cr.icon });
              }
            }
          }
        }
      } catch { /* ignore */ }

      const resolveSharedRoomName = (dbName: string): string => {
        if (ownerNameMap2?.has(dbName)) return ownerNameMap2.get(dbName)!.name;
        for (const defRooms of Object.values(WING_ROOMS)) {
          const match = defRooms.find(r => r.id === dbName);
          if (match) return match.name;
        }
        return dbName;
      };
      const resolveSharedRoomNameKey = (dbName: string): string | undefined => {
        if (ownerNameMap2?.has(dbName)) return ownerNameMap2.get(dbName)!.nameKey;
        for (const defRooms of Object.values(WING_ROOMS)) {
          const match = defRooms.find(r => r.id === dbName);
          if (match?.nameKey) return match.nameKey;
        }
        return undefined;
      };
      const resolveSharedRoomIcon = (dbName: string): string => {
        if (ownerNameMap2?.has(dbName)) return ownerNameMap2.get(dbName)!.icon;
        for (const defRooms of Object.values(WING_ROOMS)) {
          const match = defRooms.find(r => r.id === dbName);
          if (match) return match.icon;
        }
        return "";
      };

      shared.push({
        shareId: share.id,
        wingSlug: share.wing_id,
        wingName: wingDef?.name || share.wing_id.charAt(0).toUpperCase() + share.wing_id.slice(1),
        wingIcon: wingDef?.icon || "",
        ownerName: ownerNameMap[share.owner_id] || serverT("someone", expLocale),
        rooms: (rooms || []).map((r: { id: string; name: string; icon: string }) => ({
          roomId: r.id,
          localId: r.name,
          name: resolveSharedRoomName(r.name),
          nameKey: resolveSharedRoomNameKey(r.name),
          icon: r.icon || resolveSharedRoomIcon(r.name),
          memoryCount: sharedMemsByRoom[r.id]?.total || 0,
          photoCount: sharedMemsByRoom[r.id]?.photos || 0,
        })),
      });
    }
  }

  // ── 6. Meta counts (non-palace data) ──
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
