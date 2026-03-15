import { create } from "zustand";
import type { Mem } from "@/lib/constants/defaults";
import type { WingRoom } from "@/lib/constants/wings";
import { WINGS, WING_ROOMS } from "@/lib/constants/wings";

// ─── Types ───

export interface Achievement {
  id: string;
  title: string;
  desc: string;
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
  { id: "first_memory", title: "First Memory", desc: "Upload your very first memory to the palace.", icon: "\u{1F31F}", category: "memories", check: (s) => s.totalMemories >= 1 },
  { id: "collector", title: "Collector", desc: "Amass a collection of 10 memories.", icon: "\u{1F4E6}", category: "memories", check: (s) => s.totalMemories >= 10 },
  { id: "archivist", title: "Archivist", desc: "Preserve 50 memories in your palace.", icon: "\u{1F3DB}\uFE0F", category: "memories", check: (s) => s.totalMemories >= 50 },
  { id: "centurion", title: "Centurion", desc: "Reach the milestone of 100 memories.", icon: "\u{1F4AF}", category: "memories", check: (s) => s.totalMemories >= 100 },
  { id: "diverse_collector", title: "Diverse Collector", desc: "Use 5 or more different memory types.", icon: "\u{1F3AD}", category: "memories", check: (s) => s.memoryTypes.size >= 5 },

  // Social
  { id: "generous_host", title: "Generous Host", desc: "Share a room with someone special.", icon: "\u{1F91D}", category: "social", check: (s) => s.sharedRooms >= 1 },
  { id: "social_butterfly", title: "Social Butterfly", desc: "Share 3 or more rooms with others.", icon: "\u{1F98B}", category: "social", check: (s) => s.sharedRooms >= 3 },
  { id: "open_palace", title: "Open Palace", desc: "Share rooms across 3 or more wings.", icon: "\u{1F3F0}", category: "social", check: (s) => s.totalWingsVisited >= 3 && s.sharedRooms >= 3 },

  // Explore
  { id: "explorer", title: "Explorer", desc: "Visit all 5 wings of your palace.", icon: "\u{1F9ED}", category: "explore", check: (s) => s.totalWingsVisited >= 5 },
  { id: "decorator", title: "Decorator", desc: "Change the layout of a room.", icon: "\u{1F3A8}", category: "explore", check: (s) => s.layoutsChanged >= 1 },
  { id: "architect", title: "Architect", desc: "Add a custom room to a wing.", icon: "\u{1F528}", category: "explore", check: (s) => s.roomsAdded >= 1 },
  { id: "curator", title: "Curator", desc: "Rename a room to make it your own.", icon: "\u270F\uFE0F", category: "explore", check: (s) => s.roomsRenamed >= 1 },
  { id: "palace_master", title: "Palace Master", desc: "Visit every room in your palace.", icon: "\u{1F451}", category: "explore", check: (s) => s.totalRoomsInPalace > 0 && s.roomsVisited >= s.totalRoomsInPalace },

  // Create
  { id: "filmmaker", title: "Filmmaker", desc: "Upload a video memory.", icon: "\u{1F3AC}", category: "create", check: (s) => s.hasVideo },
  { id: "dj", title: "DJ", desc: "Upload an audio memory.", icon: "\u{1F3B5}", category: "create", check: (s) => s.hasAudio },
  { id: "time_traveler", title: "Time Traveler", desc: "Create a time capsule memory.", icon: "\u231B", category: "create", check: (s) => s.hasTimeCapsule },
  { id: "storyteller", title: "Storyteller", desc: "Add descriptions to 10 or more memories.", icon: "\u{1F4D6}", category: "create", check: (s) => s.memoriesWithDesc >= 10 },
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
