/**
 * Server-side resolution of an owner's TAILORED wing/room display names for
 * the sharing/invite flows.
 *
 * Why this exists: `rooms.name` in the DB stores the LOCAL room id (e.g.
 * "ro1"), and the owner's custom renames live client-side in
 * `profiles.local_settings` (synced from localStorage by settingsSync):
 *   - mp_custom_rooms:  JSON Record<wingSlug, WingRoom[]> — per-wing FULL
 *     override of WING_ROOMS (each entry: { id, name, icon, ... })
 *   - mp_custom_wings:  JSON Record<wingId, { name?, icon?, accent?, desc? }>
 *   - mp_extra_wings:   JSON Wing[] (user-created wings)
 * `room_shares` has no name column, so every reader that surfaces share data
 * to a RECIPIENT must resolve names through the OWNER's local_settings, then
 * fall back to the WINGS/WING_ROOMS defaults — and must NEVER surface a raw
 * local id like "ro1".
 *
 * RLS note: local_settings sits on the OWNER's profiles row; recipients
 * cannot read another user's profile under RLS, so callers pass the
 * server-only admin client (createAdminClient) for this narrow read.
 *
 * This module is deliberately NOT a "use server" file: these helpers take an
 * admin client / arbitrary ownerId and must not be exposed as POST-invokable
 * server actions.
 */

import { WINGS, WING_ROOMS } from "@/lib/constants/wings";
import type { createAdminClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Local room ids look like "ro1", "tv4", "cf12" — 2 letters + digits. */
const LOCAL_ROOM_ID_RE = /^[a-z]{2}\d+$/i;

export function isLocalRoomId(name: string): boolean {
  return LOCAL_ROOM_ID_RE.test(name);
}

interface CustomRoomEntry {
  id: string;
  name?: string;
  icon?: string;
}

interface CustomWingEntry {
  name?: string;
  icon?: string;
}

interface ExtraWingEntry {
  id: string;
  name?: string;
  icon?: string;
}

export interface OwnerNameMaps {
  /** mp_custom_rooms — keyed by wing slug; full per-wing room list override. */
  customRooms: Record<string, CustomRoomEntry[]>;
  /** mp_custom_wings — keyed by wing id/slug; partial overrides. */
  customWings: Record<string, CustomWingEntry>;
  /** mp_extra_wings — user-created wings. */
  extraWings: ExtraWingEntry[];
}

const EMPTY_MAPS: OwnerNameMaps = { customRooms: {}, customWings: {}, extraWings: [] };

/** Defensive parse: settingsSync stores each key as a JSON *string* inside the
 *  local_settings jsonb, but tolerate an already-parsed object too. */
function parseJsonish<T>(raw: unknown): T | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as T; } catch { return null; }
  }
  if (typeof raw === "object") return raw as T;
  return null;
}

export function parseOwnerNameMaps(localSettings: unknown): OwnerNameMaps {
  if (!localSettings || typeof localSettings !== "object") return EMPTY_MAPS;
  const ls = localSettings as Record<string, unknown>;
  return {
    customRooms: parseJsonish<Record<string, CustomRoomEntry[]>>(ls.mp_custom_rooms) || {},
    customWings: parseJsonish<Record<string, CustomWingEntry>>(ls.mp_custom_wings) || {},
    extraWings: parseJsonish<ExtraWingEntry[]>(ls.mp_extra_wings) || [],
  };
}

/** Fetch + parse one owner's name maps (admin client — see RLS note above). */
export async function loadOwnerNameMaps(admin: AdminClient, ownerId: string): Promise<OwnerNameMaps> {
  try {
    const { data } = await admin
      .from("profiles")
      .select("local_settings")
      .eq("id", ownerId)
      .maybeSingle();
    return parseOwnerNameMaps(data?.local_settings);
  } catch {
    return EMPTY_MAPS;
  }
}

/** Batch variant: one query for many owners (share list readers). */
export async function loadOwnerNameMapsBulk(
  admin: AdminClient,
  ownerIds: string[]
): Promise<Record<string, OwnerNameMaps>> {
  const out: Record<string, OwnerNameMaps> = {};
  const ids = [...new Set(ownerIds)].filter(Boolean);
  if (ids.length === 0) return out;
  try {
    const { data } = await admin
      .from("profiles")
      .select("id, local_settings")
      .in("id", ids);
    for (const row of (data || []) as { id: string; local_settings: unknown }[]) {
      out[row.id] = parseOwnerNameMaps(row.local_settings);
    }
  } catch { /* fall through to defaults */ }
  for (const id of ids) if (!out[id]) out[id] = EMPTY_MAPS;
  return out;
}

/**
 * Resolve a room's display name + icon from its DB `rooms.name` (a local id
 * for standard rooms). Order: owner's custom list for the wing → WING_ROOMS
 * defaults for the wing → global search across all custom lists → global
 * defaults. Returns name `null` when the stored name is an unresolvable local
 * id — callers substitute their localized "a room" fallback so a raw id is
 * never shown.
 */
export function resolveRoomDisplay(
  maps: OwnerNameMaps,
  dbRoomName: string,
  wingSlug?: string
): { name: string | null; icon: string } {
  const lists: CustomRoomEntry[][] = [];
  if (wingSlug) {
    if (maps.customRooms[wingSlug]) lists.push(maps.customRooms[wingSlug]);
    if (WING_ROOMS[wingSlug]) lists.push(WING_ROOMS[wingSlug]);
  }
  lists.push(...Object.values(maps.customRooms));
  lists.push(...Object.values(WING_ROOMS));

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    const match = list.find((r) => r && r.id === dbRoomName);
    if (match && match.name) return { name: match.name, icon: match.icon || "" };
  }

  // Not a known id. If it doesn't look like a local id it IS a display name.
  if (dbRoomName && !isLocalRoomId(dbRoomName)) return { name: dbRoomName, icon: "" };
  return { name: null, icon: "" };
}

/**
 * Resolve a wing's display name + icon from its slug. Order: owner's
 * mp_custom_wings rename → DB wings.custom_name → mp_extra_wings (custom
 * wings) → WINGS defaults → capitalized slug.
 */
export function resolveWingDisplayName(
  maps: OwnerNameMaps,
  slug: string,
  dbCustomName?: string | null
): { name: string; icon: string } {
  const custom = maps.customWings[slug];
  const extra = maps.extraWings.find((w) => w && w.id === slug);
  const def = WINGS.find((w) => w.id === slug);
  const name =
    custom?.name ||
    dbCustomName ||
    extra?.name ||
    def?.name ||
    (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "");
  const icon = custom?.icon || extra?.icon || def?.icon || "";
  return { name, icon };
}
