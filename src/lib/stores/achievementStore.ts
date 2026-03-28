import { create } from "zustand";
import type { Mem } from "@/lib/constants/defaults";
import type { WingRoom } from "@/lib/constants/wings";
import { WINGS, WING_ROOMS } from "@/lib/constants/wings";

// ─── Types ───

export interface Achievement {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  category: "memories" | "social" | "explore" | "create";
  check: (stats: PalaceStats) => boolean;
}

export interface PalaceStats {
  totalMemories: number;
  totalRooms: number; // rooms with at least 1 memory
  totalWingsVisited: number;
  sharedRooms: number;
  memoryTypes: Set<string>;
  hasTimeCapsule: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  daysActive: number;
  consecutiveDays: number;
  memoriesWithDesc: number;
  roomsRenamed: number;
  roomsAdded: number;
  layoutsChanged: number;
  totalRoomsInPalace: number;
  roomsVisited: number;
}

// ─── Achievement definitions ───

export const ACHIEVEMENTS: Achievement[] = [
  // Memories
  { id: "first_memory", titleKey: "achievements.first_memory.title", descKey: "achievements.first_memory.desc", icon: "\u{1F31F}", category: "memories", check: (s) => s.totalMemories >= 1 },
  { id: "collector", titleKey: "achievements.collector.title", descKey: "achievements.collector.desc", icon: "\u{1F4E6}", category: "memories", check: (s) => s.totalMemories >= 10 },
  { id: "archivist", titleKey: "achievements.archivist.title", descKey: "achievements.archivist.desc", icon: "\u{1F3DB}\uFE0F", category: "memories", check: (s) => s.totalMemories >= 50 },
  { id: "centurion", titleKey: "achievements.centurion.title", descKey: "achievements.centurion.desc", icon: "\u{1F4AF}", category: "memories", check: (s) => s.totalMemories >= 100 },
  { id: "diverse_collector", titleKey: "achievements.diverse_collector.title", descKey: "achievements.diverse_collector.desc", icon: "\u{1F3AD}", category: "memories", check: (s) => s.memoryTypes.size >= 5 },

  // Social
  { id: "generous_host", titleKey: "achievements.generous_host.title", descKey: "achievements.generous_host.desc", icon: "\u{1F91D}", category: "social", check: (s) => s.sharedRooms >= 1 },
  { id: "social_butterfly", titleKey: "achievements.social_butterfly.title", descKey: "achievements.social_butterfly.desc", icon: "\u{1F98B}", category: "social", check: (s) => s.sharedRooms >= 3 },
  { id: "open_palace", titleKey: "achievements.open_palace.title", descKey: "achievements.open_palace.desc", icon: "\u{1F3F0}", category: "social", check: (s) => s.totalWingsVisited >= 3 && s.sharedRooms >= 3 },

  // Explore
  { id: "explorer", titleKey: "achievements.explorer.title", descKey: "achievements.explorer.desc", icon: "\u{1F9ED}", category: "explore", check: (s) => s.totalWingsVisited >= 5 },
  { id: "decorator", titleKey: "achievements.decorator.title", descKey: "achievements.decorator.desc", icon: "\u{1F3A8}", category: "explore", check: (s) => s.layoutsChanged >= 1 },
  { id: "architect", titleKey: "achievements.architect.title", descKey: "achievements.architect.desc", icon: "\u{1F528}", category: "explore", check: (s) => s.roomsAdded >= 1 },
  { id: "curator", titleKey: "achievements.curator.title", descKey: "achievements.curator.desc", icon: "\u270F\uFE0F", category: "explore", check: (s) => s.roomsRenamed >= 1 },
  { id: "palace_master", titleKey: "achievements.palace_master.title", descKey: "achievements.palace_master.desc", icon: "\u{1F451}", category: "explore", check: (s) => s.totalRoomsInPalace > 0 && s.roomsVisited >= s.totalRoomsInPalace },

  // Create
  { id: "filmmaker", titleKey: "achievements.filmmaker.title", descKey: "achievements.filmmaker.desc", icon: "\u{1F3AC}", category: "create", check: (s) => s.hasVideo },
  { id: "dj", titleKey: "achievements.dj.title", descKey: "achievements.dj.desc", icon: "\u{1F3B5}", category: "create", check: (s) => s.hasAudio },
  { id: "time_traveler", titleKey: "achievements.time_traveler.title", descKey: "achievements.time_traveler.desc", icon: "\u231B", category: "create", check: (s) => s.hasTimeCapsule },
  { id: "storyteller", titleKey: "achievements.storyteller.title", descKey: "achievements.storyteller.desc", icon: "\u{1F4D6}", category: "create", check: (s) => s.memoriesWithDesc >= 10 },
];

// ─── Store ───

interface AchievementState {
  earnedIds: string[];
  earnedDates: Record<string, string>; // id → ISO date
  lastCheck: string;
  toast: Achievement | null;
  stats: PalaceStats;
  showPanel: boolean;
  // Tracked data persisted to localStorage
  visitedWings: string[];
  visitedRooms: string[];
  activeDays: string[]; // ISO date strings

  checkAchievements: (
    mems: Record<string, Mem[]>,
    customRooms: Record<string, WingRoom[]>,
    roomLayouts: Record<string, string>,
    roomSharing: Record<string, { shared: boolean; sharedWith: string[] }>,
  ) => void;
  dismissToast: () => void;
  getProgress: () => { earned: number; total: number; percentage: number };
  setShowPanel: (v: boolean) => void;
  trackWingVisit: (wingId: string) => void;
  trackRoomVisit: (roomId: string) => void;
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveJSON(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ }
}

const today = () => new Date().toISOString().slice(0, 10);

export const useAchievementStore = create<AchievementState>((set, get) => ({
  earnedIds: loadJSON<string[]>("mp_achievements", []),
  earnedDates: loadJSON<Record<string, string>>("mp_achievement_dates", {}),
  lastCheck: "",
  toast: null,
  stats: {
    totalMemories: 0, totalRooms: 0, totalWingsVisited: 0, sharedRooms: 0,
    memoryTypes: new Set(), hasTimeCapsule: false, hasVideo: false, hasAudio: false,
    daysActive: 0, consecutiveDays: 0, memoriesWithDesc: 0, roomsRenamed: 0,
    roomsAdded: 0, layoutsChanged: 0, totalRoomsInPalace: 0, roomsVisited: 0,
  },
  showPanel: false,
  visitedWings: loadJSON<string[]>("mp_visited_wings", []),
  visitedRooms: loadJSON<string[]>("mp_visited_rooms", []),
  activeDays: loadJSON<string[]>("mp_active_days", []),

  trackWingVisit: (wingId) => {
    const { visitedWings, activeDays } = get();
    let changed = false;
    const newWings = [...visitedWings];
    if (!newWings.includes(wingId)) { newWings.push(wingId); changed = true; }
    const newDays = [...activeDays];
    const d = today();
    if (!newDays.includes(d)) { newDays.push(d); changed = true; }
    if (changed) {
      set({ visitedWings: newWings, activeDays: newDays });
      saveJSON("mp_visited_wings", newWings);
      saveJSON("mp_active_days", newDays);
    }
  },

  trackRoomVisit: (roomId) => {
    const { visitedRooms } = get();
    if (!visitedRooms.includes(roomId)) {
      const newRooms = [...visitedRooms, roomId];
      set({ visitedRooms: newRooms });
      saveJSON("mp_visited_rooms", newRooms);
    }
  },

  checkAchievements: (mems, customRooms, roomLayouts, roomSharing) => {
    const { earnedIds, visitedWings, visitedRooms, activeDays } = get();

    // Compute stats
    const allMems: Mem[] = Object.values(mems).flat();
    const types = new Set(allMems.map((m) => m.type));
    const roomsWithMems = Object.entries(mems).filter(([, ms]) => ms.length > 0).length;

    // Count shared rooms across all wings
    let sharedRooms = 0;
    const allRooms: WingRoom[] = [];
    for (const wId of WINGS.map((w) => w.id)) {
      const rooms = customRooms[wId] || WING_ROOMS[wId] || [];
      for (const r of rooms) {
        allRooms.push(r);
        const sharing = roomSharing[r.id];
        if (sharing ? sharing.shared : r.shared) sharedRooms++;
      }
    }

    // Count custom rooms added (rooms in customRooms but not in WING_ROOMS)
    let roomsAdded = 0;
    let roomsRenamed = 0;
    for (const wId of WINGS.map((w) => w.id)) {
      const defaults = WING_ROOMS[wId] || [];
      const custom = customRooms[wId];
      if (!custom) continue;
      const defaultIds = new Set(defaults.map((r) => r.id));
      const defaultNames = new Map(defaults.map((r) => [r.id, r.name]));
      for (const r of custom) {
        if (!defaultIds.has(r.id)) roomsAdded++;
        else if (defaultNames.get(r.id) !== r.name) roomsRenamed++;
      }
    }

    const stats: PalaceStats = {
      totalMemories: allMems.length,
      totalRooms: roomsWithMems,
      totalWingsVisited: visitedWings.length,
      sharedRooms,
      memoryTypes: types,
      hasTimeCapsule: allMems.some((m) => !!m.revealDate),
      hasVideo: allMems.some((m) => m.type === "video" || !!m.videoBlob),
      hasAudio: allMems.some((m) => m.type === "audio" || !!m.voiceBlob),
      daysActive: activeDays.length,
      consecutiveDays: 0, // simplified
      memoriesWithDesc: allMems.filter((m) => m.desc && m.desc.trim().length > 0).length,
      roomsRenamed,
      roomsAdded,
      layoutsChanged: Object.keys(roomLayouts).length,
      totalRoomsInPalace: allRooms.length,
      roomsVisited: visitedRooms.length,
    };

    // Check for newly earned achievements
    const newEarned: Achievement[] = [];
    for (const ach of ACHIEVEMENTS) {
      if (!earnedIds.includes(ach.id) && ach.check(stats)) {
        newEarned.push(ach);
      }
    }

    if (newEarned.length > 0) {
      const newIds = [...earnedIds, ...newEarned.map((a) => a.id)];
      const newDates = { ...get().earnedDates };
      const d = today();
      for (const a of newEarned) newDates[a.id] = d;

      saveJSON("mp_achievements", newIds);
      saveJSON("mp_achievement_dates", newDates);
      set({ earnedIds: newIds, earnedDates: newDates, stats, toast: newEarned[0], lastCheck: d });
    } else {
      set({ stats, lastCheck: today() });
    }
  },

  dismissToast: () => set({ toast: null }),

  getProgress: () => {
    const { earnedIds } = get();
    const total = ACHIEVEMENTS.length;
    const earned = earnedIds.length;
    return { earned, total, percentage: total > 0 ? Math.round((earned / total) * 100) : 0 };
  },

  setShowPanel: (v) => set({ showPanel: v }),
}));
