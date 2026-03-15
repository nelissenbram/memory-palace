// ═══ TRACK PROGRESS CHECKER ═══
// Scans current app state to determine which track steps are completed.

import type { Mem, SharingInfo } from "@/lib/constants/defaults";
import type { WingRoom } from "@/lib/constants/wings";
import { WINGS, WING_ROOMS } from "@/lib/constants/wings";

export interface TrackCheckState {
  /** All memories keyed by room ID */
  userMems: Record<string, Mem[]>;
  /** Custom rooms per wing */
  customRooms: Record<string, WingRoom[]>;
  /** Room layout overrides */
  roomLayouts: Record<string, string>;
  /** Room sharing info */
  roomSharing: Record<string, SharingInfo>;
  /** Wings the user has visited */
  visitedWings: string[];
  /** Custom wing data (names/icons changed) */
  customWings: Record<string, { name?: string; icon?: string; accent?: string }>;
  /** Whether legacy contacts exist */
  legacyContactCount: number;
  /** Whether wing access is configured for legacy */
  legacyWingAccessConfigured: boolean;
  /** Whether legacy settings have been reviewed */
  legacyReviewed: boolean;
  /** Whether user has used mass import */
  hasUsedMassImport: boolean;
}

export type CompletedStepsMap = Record<string, string[]>;

/** Get all memories flattened from all rooms */
function getAllMems(userMems: Record<string, Mem[]>): Mem[] {
  return Object.values(userMems).flat();
}

/** Count memories by type */
function countByType(mems: Mem[], type: string): number {
  return mems.filter((m) => m.type === type).length;
}

/** Count rooms with at least N memories */
function roomsWithMemories(userMems: Record<string, Mem[]>, minCount = 1): number {
  return Object.values(userMems).filter((ms) => ms.length >= minCount).length;
}

/** Get wing ID from room ID prefix */
function wingFromRoomId(roomId: string): string {
  const prefix = roomId.slice(0, 2);
  const map: Record<string, string> = { fr: "family", tr: "travel", cr: "childhood", kr: "career", rr: "creativity", at: "attic" };
  return map[prefix] || "";
}

/** Count unique wings that have memories */
function wingsWithMemories(userMems: Record<string, Mem[]>): number {
  const wings = new Set<string>();
  for (const [roomId, mems] of Object.entries(userMems)) {
    if (mems.length > 0) wings.add(wingFromRoomId(roomId));
  }
  return wings.size;
}

/** Count shared rooms */
function countSharedRooms(
  customRooms: Record<string, WingRoom[]>,
  roomSharing: Record<string, SharingInfo>,
): number {
  let count = 0;
  for (const wId of WINGS.map((w) => w.id)) {
    const rooms = customRooms[wId] || WING_ROOMS[wId] || [];
    for (const r of rooms) {
      const sharing = roomSharing[r.id];
      if (sharing ? sharing.shared : r.shared) count++;
    }
  }
  return count;
}

/** Count unique people shared with */
function uniqueSharedPeople(
  customRooms: Record<string, WingRoom[]>,
  roomSharing: Record<string, SharingInfo>,
): number {
  const people = new Set<string>();
  for (const wId of WINGS.map((w) => w.id)) {
    const rooms = customRooms[wId] || WING_ROOMS[wId] || [];
    for (const r of rooms) {
      const sharing = roomSharing[r.id];
      const sharedWith = sharing ? sharing.sharedWith : r.sharedWith;
      for (const email of sharedWith) people.add(email.toLowerCase());
    }
  }
  return people.size;
}

/** Count wings with shared rooms */
function wingsWithSharedRooms(
  customRooms: Record<string, WingRoom[]>,
  roomSharing: Record<string, SharingInfo>,
): number {
  const wings = new Set<string>();
  for (const wId of WINGS.map((w) => w.id)) {
    const rooms = customRooms[wId] || WING_ROOMS[wId] || [];
    for (const r of rooms) {
      const sharing = roomSharing[r.id];
      if (sharing ? sharing.shared : r.shared) wings.add(wId);
    }
  }
  return wings.size;
}

/** Count rooms renamed from defaults */
function countRoomsRenamed(customRooms: Record<string, WingRoom[]>): number {
  let count = 0;
  for (const wId of WINGS.map((w) => w.id)) {
    const defaults = WING_ROOMS[wId] || [];
    const custom = customRooms[wId];
    if (!custom) continue;
    const defaultNames = new Map(defaults.map((r) => [r.id, r.name]));
    for (const r of custom) {
      if (defaultNames.has(r.id) && defaultNames.get(r.id) !== r.name) count++;
    }
  }
  return count;
}

/** Count custom rooms added */
function countRoomsAdded(customRooms: Record<string, WingRoom[]>): number {
  let count = 0;
  for (const wId of WINGS.map((w) => w.id)) {
    const defaults = WING_ROOMS[wId] || [];
    const custom = customRooms[wId];
    if (!custom) continue;
    const defaultIds = new Set(defaults.map((r) => r.id));
    for (const r of custom) {
      if (!defaultIds.has(r.id)) count++;
    }
  }
  return count;
}

/** Check if any wing has been customized */
function hasCustomizedWing(customWings: Record<string, { name?: string; icon?: string }>): boolean {
  return Object.values(customWings).some((w) => w.name !== undefined || w.icon !== undefined);
}

/** Check if a description has a year/date reference */
function hasDateReference(desc: string): boolean {
  return /\b(1[89]\d{2}|20[0-9]{2})\b/.test(desc) || /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(desc);
}

/** Main checker: returns which steps in each track are complete */
export function checkAllTrackProgress(state: TrackCheckState): CompletedStepsMap {
  const allMems = getAllMems(state.userMems);
  const photoCount = allMems.filter((m) => m.type === "photo" || (m.dataUrl && !m.videoBlob && !m.voiceBlob)).length;
  const memsWithDesc = allMems.filter((m) => m.desc && m.desc.trim().length > 0);
  const memsWithLocation = allMems.filter((m) => m.lat !== undefined && m.lng !== undefined);
  const allTypes = new Set(allMems.map((m) => m.type));
  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  const fiveYearsLater = new Date(now);
  fiveYearsLater.setFullYear(fiveYearsLater.getFullYear() + 5);

  const result: CompletedStepsMap = {};

  // ─── Track 1: Preserve ───
  const preserve: string[] = [];
  if (photoCount >= 1) preserve.push("p_first_photo");
  if (photoCount >= 10) preserve.push("p_10_photos");
  if (photoCount >= 50) preserve.push("p_50_photos");
  if (photoCount >= 100) preserve.push("p_100_photos");
  if (allMems.some((m) => m.type === "video" || m.videoBlob)) preserve.push("p_first_video");
  if (allMems.some((m) => m.type === "audio" || m.voiceBlob)) preserve.push("p_first_audio");
  if (roomsWithMemories(state.userMems) >= 3) preserve.push("p_3_rooms");
  if (state.hasUsedMassImport) preserve.push("p_mass_import");
  if (memsWithDesc.length >= 10) preserve.push("p_10_descriptions");
  if (memsWithLocation.length >= 5) preserve.push("p_5_locations");
  result["preserve"] = preserve;

  // ─── Track 2: Visualize ───
  const visualize: string[] = [];
  if (state.visitedWings.length >= 5) visualize.push("v_visit_5_wings");
  if (hasCustomizedWing(state.customWings)) visualize.push("v_customize_wing");
  if (Object.keys(state.roomLayouts).length > 0) visualize.push("v_change_layout");
  if (countRoomsAdded(state.customRooms) > 0) visualize.push("v_create_room");
  if (countRoomsRenamed(state.customRooms) >= 3) visualize.push("v_rename_3_rooms");
  // Check hue customization — count memories where hue was likely customized
  // (simplified: count mems that exist, since hue is always set)
  if (allMems.length >= 5) visualize.push("v_set_5_hues");
  // Reorder: check if user has moved memories between rooms (simplified: directory usage)
  if (allMems.length >= 2 && Object.keys(state.userMems).filter((k) => (state.userMems[k]?.length || 0) > 0).length >= 1) visualize.push("v_reorder");
  result["visualize"] = visualize;

  // ─── Track 3: Enhance ───
  const enhance: string[] = [];
  if (memsWithDesc.some((m) => (m.desc || "").split(/\s+/).length > 100)) enhance.push("e_long_desc");
  if (allMems.some((m) => m.voiceBlob || (m.type === "journal" && m.voiceBlob))) enhance.push("e_voice_memo");
  if (allMems.some((m) => m.type === "journal")) enhance.push("e_journal");
  if (memsWithDesc.some((m) => hasDateReference(m.desc || ""))) enhance.push("e_historical");
  if (wingsWithMemories(state.userMems) >= 4) enhance.push("e_4_wings");
  const requiredTypes = ["photo", "video", "album", "orb", "journal", "case"];
  if (requiredTypes.every((t) => allTypes.has(t))) enhance.push("e_all_types");
  result["enhance"] = enhance;

  // ─── Track 4: Resolutions ───
  const resolutions: string[] = [];
  const futureMems = allMems.filter((m) => m.revealDate && new Date(m.revealDate) > now);
  if (futureMems.length >= 1) resolutions.push("r_first_capsule");
  if (futureMems.some((m) => new Date(m.revealDate!) >= oneYearLater)) resolutions.push("r_next_year");
  if (futureMems.some((m) => new Date(m.revealDate!) >= fiveYearsLater)) resolutions.push("r_5_years");
  const goalMems = allMems.filter((m) => m.type === "journal" && m.desc && /\b(goal|resolution|aspir|dream|hope|plan)\b/i.test(m.desc));
  if (goalMems.length >= 3) resolutions.push("r_3_goals");
  if (futureMems.some((m) => m.type === "journal")) resolutions.push("r_future_letter");
  result["resolutions"] = resolutions;

  // ─── Track 5: Legacy ───
  const legacy: string[] = [];
  if (state.legacyContactCount > 0) legacy.push("l_legacy_contact");
  // Final message: check for a journal memory that could serve as a final message
  if (allMems.some((m) => m.type === "journal" && m.desc && (m.desc || "").length > 50)) legacy.push("l_final_message");
  if (state.legacyWingAccessConfigured) legacy.push("l_wing_access");
  if (state.legacyReviewed) legacy.push("l_review");
  result["legacy"] = legacy;

  // ─── Track 6: Co-create ───
  const cocreate: string[] = [];
  if (countSharedRooms(state.customRooms, state.roomSharing) >= 1) cocreate.push("c_first_share");
  // Accepted shares — simplified check: if shared rooms exist with email contacts
  const sharedCount = countSharedRooms(state.customRooms, state.roomSharing);
  if (sharedCount >= 1 && uniqueSharedPeople(state.customRooms, state.roomSharing) >= 1) cocreate.push("c_accepted");
  // Receive a contribution — hard to check client-side, skip auto-detect
  if (wingsWithSharedRooms(state.customRooms, state.roomSharing) >= 3) cocreate.push("c_3_wings");
  if (uniqueSharedPeople(state.customRooms, state.roomSharing) >= 5) cocreate.push("c_5_people");
  result["cocreate"] = cocreate;

  return result;
}
