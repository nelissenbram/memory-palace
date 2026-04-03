import { create } from "zustand";
import { WINGS, WING_ROOMS } from "@/lib/constants/wings";
import type { Wing, WingRoom } from "@/lib/constants/wings";

// Max rooms per wing (corridor can grow but keep it sensible)
export const MAX_ROOMS_PER_WING = 8;

type WingCustom = Partial<{ name: string; icon: string; accent: string; desc: string }>;

interface RoomState {
  // Per-wing custom room lists. If a wing has an entry here, it overrides WING_ROOMS entirely.
  customRooms: Record<string, WingRoom[]>;
  // Per-wing customizations (name, icon, accent)
  customWings: Record<string, WingCustom>;

  // Get effective rooms for a wing (custom if set, else defaults)
  getWingRooms: (wingId: string) => WingRoom[];

  // Wing customization
  getWing: (wingId: string) => Wing;
  getWings: () => Wing[];
  renameWing: (wingId: string, name: string) => void;
  changeWingIcon: (wingId: string, icon: string) => void;
  changeWingAccent: (wingId: string, accent: string) => void;
  changeWingDesc: (wingId: string, desc: string) => void;

  // Actions
  renameRoom: (wingId: string, roomId: string, name: string) => void;
  changeRoomIcon: (wingId: string, roomId: string, icon: string) => void;
  addRoom: (wingId: string, name: string, icon: string) => void;
  deleteRoom: (wingId: string, roomId: string) => void;
  reorderRoom: (wingId: string, roomId: string, direction: -1 | 1) => void;
}

// Generate next room ID for a wing (e.g., "fr4", "tr5")
function nextRoomId(wingId: string, rooms: WingRoom[]): string {
  const prefix = wingId.slice(0, 2);
  let max = 0;
  rooms.forEach(r => {
    const m = r.id.match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1]));
  });
  return `${prefix}${max + 1}`;
}

// Load from localStorage
function loadCustomRooms(): Record<string, WingRoom[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("mp_custom_rooms");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCustomRooms(rooms: Record<string, WingRoom[]>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("mp_custom_rooms", JSON.stringify(rooms)); } catch {}
}

function loadCustomWings(): Record<string, WingCustom> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("mp_custom_wings");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCustomWings(wings: Record<string, WingCustom>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("mp_custom_wings", JSON.stringify(wings)); } catch {}
}

function applyWingCustom(wing: Wing, custom?: WingCustom): Wing {
  if (!custom) return wing;
  return {
    ...wing,
    ...(custom.name !== undefined ? { name: custom.name } : {}),
    ...(custom.icon !== undefined ? { icon: custom.icon } : {}),
    ...(custom.accent !== undefined ? { accent: custom.accent } : {}),
    ...(custom.desc !== undefined ? { desc: custom.desc } : {}),
  };
}

export const useRoomStore = create<RoomState>((set, get) => ({
  customRooms: loadCustomRooms(),
  customWings: loadCustomWings(),

  getWingRooms: (wingId: string) => {
    const { customRooms } = get();
    return customRooms[wingId] || WING_ROOMS[wingId] || [];
  },

  getWing: (wingId: string) => {
    const base = WINGS.find(w => w.id === wingId);
    if (!base) return WINGS[0]; // fallback
    return applyWingCustom(base, get().customWings[wingId]);
  },

  getWings: () => {
    const { customWings } = get();
    return WINGS.map(w => applyWingCustom(w, customWings[w.id]));
  },

  renameWing: (wingId, name) => {
    const customWings = { ...get().customWings, [wingId]: { ...get().customWings[wingId], name: name.trim() || undefined } };
    set({ customWings });
    saveCustomWings(customWings);
  },

  changeWingIcon: (wingId, icon) => {
    const customWings = { ...get().customWings, [wingId]: { ...get().customWings[wingId], icon } };
    set({ customWings });
    saveCustomWings(customWings);
  },

  changeWingAccent: (wingId, accent) => {
    const customWings = { ...get().customWings, [wingId]: { ...get().customWings[wingId], accent } };
    set({ customWings });
    saveCustomWings(customWings);
  },

  changeWingDesc: (wingId, desc) => {
    const customWings = { ...get().customWings, [wingId]: { ...get().customWings[wingId], desc: desc.trim() || undefined } };
    set({ customWings });
    saveCustomWings(customWings);
  },

  renameRoom: (wingId, roomId, name) => {
    const rooms = [...get().getWingRooms(wingId)];
    const idx = rooms.findIndex(r => r.id === roomId);
    if (idx < 0) return;
    rooms[idx] = { ...rooms[idx], name: name.trim() || rooms[idx].name };
    const customRooms = { ...get().customRooms, [wingId]: rooms };
    set({ customRooms });
    saveCustomRooms(customRooms);
  },

  changeRoomIcon: (wingId, roomId, icon) => {
    const rooms = [...get().getWingRooms(wingId)];
    const idx = rooms.findIndex(r => r.id === roomId);
    if (idx < 0) return;
    rooms[idx] = { ...rooms[idx], icon };
    const customRooms = { ...get().customRooms, [wingId]: rooms };
    set({ customRooms });
    saveCustomRooms(customRooms);
  },

  addRoom: (wingId, name, icon) => {
    const rooms = [...get().getWingRooms(wingId)];
    if (rooms.length >= MAX_ROOMS_PER_WING) return;
    const id = nextRoomId(wingId, rooms);
    rooms.push({
      id,
      name: name.trim() || "New Room",
      icon: icon || "fr1",
      shared: false,
      sharedWith: [],
      coverHue: Math.floor(Math.random() * 360),
    });
    const customRooms = { ...get().customRooms, [wingId]: rooms };
    set({ customRooms });
    saveCustomRooms(customRooms);
  },

  deleteRoom: (wingId, roomId) => {
    const rooms = get().getWingRooms(wingId).filter(r => r.id !== roomId);
    if (rooms.length === 0) return; // Must have at least 1 room
    const customRooms = { ...get().customRooms, [wingId]: rooms };
    set({ customRooms });
    saveCustomRooms(customRooms);
  },

  reorderRoom: (wingId, roomId, direction) => {
    const rooms = [...get().getWingRooms(wingId)];
    const idx = rooms.findIndex(r => r.id === roomId);
    const newIdx = idx + direction;
    if (idx < 0 || newIdx < 0 || newIdx >= rooms.length) return;
    [rooms[idx], rooms[newIdx]] = [rooms[newIdx], rooms[idx]];
    const customRooms = { ...get().customRooms, [wingId]: rooms };
    set({ customRooms });
    saveCustomRooms(customRooms);
  },
}));
