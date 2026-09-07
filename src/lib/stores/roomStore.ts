import { create } from "zustand";
import { WINGS, WING_ROOMS } from "@/lib/constants/wings";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { syncSettingsToServer } from "@/lib/stores/settingsSync";
import { track } from "@/lib/analytics";

// Max rooms per wing (corridor can grow but keep it sensible)
export const MAX_ROOMS_PER_WING = 8;

type WingCustom = Partial<{ name: string; icon: string; accent: string; desc: string }>;

export const MAX_WINGS = 7; // 5 standard + 2 custom (excluding attic)

interface RoomState {
  // Per-wing custom room lists. If a wing has an entry here, it overrides WING_ROOMS entirely.
  customRooms: Record<string, WingRoom[]>;
  // Per-wing customizations (name, icon, accent)
  customWings: Record<string, WingCustom>;
  // User-created wings (on top of the 5 standard ones)
  extraWings: Wing[];

  // Get effective rooms for a wing (custom if set, else defaults)
  getWingRooms: (wingId: string) => WingRoom[];

  // Wing customization
  getWing: (wingId: string) => Wing;
  getWings: () => Wing[];
  renameWing: (wingId: string, name: string) => void;
  changeWingIcon: (wingId: string, icon: string) => void;
  changeWingAccent: (wingId: string, accent: string) => void;
  changeWingDesc: (wingId: string, desc: string) => void;
  addWing: (name: string, icon: string, accent: string) => string | null;
  deleteWing: (wingId: string) => void;

  // Actions
  renameRoom: (wingId: string, roomId: string, name: string) => void;
  changeRoomIcon: (wingId: string, roomId: string, icon: string) => void;
  addRoom: (wingId: string, name: string, icon: string, defaultName?: string) => void;
  deleteRoom: (wingId: string, roomId: string) => void;
  reorderRoom: (wingId: string, roomId: string, direction: -1 | 1) => void;
}

// Generate next room ID for a wing (e.g., "ro4", "tv5")
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

let _roomSaveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveRooms(rooms: Record<string, WingRoom[]>) {
  if (_roomSaveTimer) clearTimeout(_roomSaveTimer);
  _roomSaveTimer = setTimeout(() => { saveCustomRooms(rooms); syncSettingsToServer(); }, 500);
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

let _wingSaveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveWings(wings: Record<string, WingCustom>) {
  if (_wingSaveTimer) clearTimeout(_wingSaveTimer);
  _wingSaveTimer = setTimeout(() => { saveCustomWings(wings); syncSettingsToServer(); }, 500);
}

function loadExtraWings(): Wing[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("mp_extra_wings");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveExtraWings(wings: Wing[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("mp_extra_wings", JSON.stringify(wings)); } catch {}
}

let _extraWingSaveTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSaveExtraWings(wings: Wing[]) {
  if (_extraWingSaveTimer) clearTimeout(_extraWingSaveTimer);
  _extraWingSaveTimer = setTimeout(() => { saveExtraWings(wings); syncSettingsToServer(); }, 500);
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

// ── Stable-identity caches (perf) ─────────────────────────────────────────
// getWings()/getWingRooms() used to allocate a fresh array on every call, which
// defeated every downstream useMemo/effect that listed them as deps (the deps
// were "new" every render). We memoize the derived results here and only
// recompute when the underlying state slices (customWings/extraWings/customRooms)
// change identity. Zustand only ever REPLACES these slices (never mutates in
// place — every action spreads into a new object), so an identity check is a
// correct cache key.
let _wingsCache: { key: string; value: Wing[] } | null = null;
function computeWings(customWings: Record<string, WingCustom>, extraWings: Wing[]): Wing[] {
  // Cache key = identities of the two source slices. Different identity ⇒ recompute.
  const key = `${_identityId(customWings)}|${_identityId(extraWings)}`;
  if (_wingsCache && _wingsCache.key === key) return _wingsCache.value;
  const value = [...WINGS, ...extraWings].map(w => applyWingCustom(w, customWings[w.id]));
  _wingsCache = { key, value };
  return value;
}

// Per-wing room-array cache. Invalidated wholesale whenever the customRooms
// slice identity changes (any room mutation replaces customRooms).
let _roomsSource: Record<string, WingRoom[]> | null = null;
const _roomsCache = new Map<string, WingRoom[]>();
function computeWingRooms(customRooms: Record<string, WingRoom[]>, wingId: string): WingRoom[] {
  if (_roomsSource !== customRooms) { _roomsSource = customRooms; _roomsCache.clear(); }
  const cached = _roomsCache.get(wingId);
  if (cached) return cached;
  const value = customRooms[wingId] || WING_ROOMS[wingId] || _EMPTY_ROOMS;
  _roomsCache.set(wingId, value);
  return value;
}

// Stable empty array so wings with no rooms don't hand back a fresh [] each call.
const _EMPTY_ROOMS: WingRoom[] = [];

// Assign a stable id to an object so we can use it in a cache key. WeakMap keeps
// this from leaking and ties the id to the object's identity.
let _idSeq = 0;
const _idMap = new WeakMap<object, number>();
function _identityId(obj: object): number {
  let id = _idMap.get(obj);
  if (id === undefined) { id = ++_idSeq; _idMap.set(obj, id); }
  return id;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  customRooms: loadCustomRooms(),
  customWings: loadCustomWings(),
  extraWings: loadExtraWings(),

  getWingRooms: (wingId: string) => {
    return computeWingRooms(get().customRooms, wingId);
  },

  getWing: (wingId: string) => {
    const base = WINGS.find(w => w.id === wingId) || get().extraWings.find(w => w.id === wingId);
    if (!base) return WINGS[0]; // fallback
    return applyWingCustom(base, get().customWings[wingId]);
  },

  getWings: () => {
    const { customWings, extraWings } = get();
    return computeWings(customWings, extraWings);
  },

  renameWing: (wingId, name) => {
    const customWings = { ...get().customWings, [wingId]: { ...get().customWings[wingId], name: name.trim() || undefined } };
    set({ customWings });
    debouncedSaveWings(customWings);
  },

  changeWingIcon: (wingId, icon) => {
    const customWings = { ...get().customWings, [wingId]: { ...get().customWings[wingId], icon } };
    set({ customWings });
    debouncedSaveWings(customWings);
  },

  changeWingAccent: (wingId, accent) => {
    const customWings = { ...get().customWings, [wingId]: { ...get().customWings[wingId], accent } };
    set({ customWings });
    debouncedSaveWings(customWings);
  },

  changeWingDesc: (wingId, desc) => {
    const customWings = { ...get().customWings, [wingId]: { ...get().customWings[wingId], desc: desc.trim() || undefined } };
    set({ customWings });
    debouncedSaveWings(customWings);
  },

  addWing: (name, icon, accent) => {
    const { extraWings } = get();
    // Count non-attic wings: 5 standard + extras
    const standardCount = WINGS.filter(w => w.id !== "attic").length;
    if (standardCount + extraWings.length >= MAX_WINGS) return null;

    // Generate unique ID
    const id = `cw${Date.now().toString(36)}`;
    const newWing: Wing = {
      id,
      name: name.trim() || "New Wing",
      nameKey: "",
      icon,
      accent,
      wall: "#DDD4C6",
      floor: "#9E8264",
      desc: "",
      descKey: "",
      layout: "L-shaped gallery",
    };
    const updated = [...extraWings, newWing];
    set({ extraWings: updated });
    debouncedSaveExtraWings(updated);

    // Create a default first room
    const roomId = `${id.slice(0, 2)}1`;
    const defaultRoom: WingRoom = { id: roomId, name: "Room 1", icon: "\uD83D\uDCC1", shared: false, sharedWith: [], coverHue: 30 };
    const customRooms = { ...get().customRooms, [id]: [defaultRoom] };
    set({ customRooms });
    debouncedSaveRooms(customRooms);

    // Feature taxonomy: all wing-creation UIs funnel through this store method.
    // Fires only on success (limit checks passed). track() is consent-gated and
    // a no-op in the native shell; no PII props (never the wing name).
    track("feature_used", { feature: "wing_created" });

    return id;
  },

  deleteWing: (wingId) => {
    const { extraWings, customRooms, customWings } = get();
    // Only allow deleting user-created wings
    if (!extraWings.find(w => w.id === wingId)) return;
    const updated = extraWings.filter(w => w.id !== wingId);
    const newCustomRooms = { ...customRooms };
    delete newCustomRooms[wingId];
    const newCustomWings = { ...customWings };
    delete newCustomWings[wingId];
    set({ extraWings: updated, customRooms: newCustomRooms, customWings: newCustomWings });
    debouncedSaveExtraWings(updated);
    debouncedSaveRooms(newCustomRooms);
    debouncedSaveWings(newCustomWings);
  },

  renameRoom: (wingId, roomId, name) => {
    const rooms = [...get().getWingRooms(wingId)];
    const idx = rooms.findIndex(r => r.id === roomId);
    if (idx < 0) return;
    rooms[idx] = { ...rooms[idx], name: name.trim() || rooms[idx].name };
    const customRooms = { ...get().customRooms, [wingId]: rooms };
    set({ customRooms });
    debouncedSaveRooms(customRooms);
  },

  changeRoomIcon: (wingId, roomId, icon) => {
    const rooms = [...get().getWingRooms(wingId)];
    const idx = rooms.findIndex(r => r.id === roomId);
    if (idx < 0) return;
    rooms[idx] = { ...rooms[idx], icon };
    const customRooms = { ...get().customRooms, [wingId]: rooms };
    set({ customRooms });
    debouncedSaveRooms(customRooms);
  },

  addRoom: (wingId, name, icon, defaultName) => {
    const rooms = [...get().getWingRooms(wingId)];
    if (rooms.length >= MAX_ROOMS_PER_WING) return;
    const id = nextRoomId(wingId, rooms);
    rooms.push({
      id,
      name: name.trim() || defaultName || "New Room",
      icon: icon || "ro1",
      shared: false,
      sharedWith: [],
      coverHue: Math.floor(Math.random() * 360),
    });
    const customRooms = { ...get().customRooms, [wingId]: rooms };
    set({ customRooms });
    debouncedSaveRooms(customRooms);

    // Feature taxonomy: all room-creation UIs funnel through this store method.
    // Fires only on success (room limit passed); no PII props (never the room name).
    track("feature_used", { feature: "room_created" });
  },

  deleteRoom: (wingId, roomId) => {
    const rooms = get().getWingRooms(wingId).filter(r => r.id !== roomId);
    if (rooms.length === 0) return; // Must have at least 1 room
    const customRooms = { ...get().customRooms, [wingId]: rooms };
    set({ customRooms });
    debouncedSaveRooms(customRooms);
  },

  reorderRoom: (wingId, roomId, direction) => {
    const rooms = [...get().getWingRooms(wingId)];
    const idx = rooms.findIndex(r => r.id === roomId);
    const newIdx = idx + direction;
    if (idx < 0 || newIdx < 0 || newIdx >= rooms.length) return;
    [rooms[idx], rooms[newIdx]] = [rooms[newIdx], rooms[idx]];
    const customRooms = { ...get().customRooms, [wingId]: rooms };
    set({ customRooms });
    debouncedSaveRooms(customRooms);
  },
}));

// Re-read localStorage when cross-device sync completes
if (typeof window !== "undefined") {
  window.addEventListener("mp-settings-synced", () => {
    useRoomStore.setState({
      customRooms: loadCustomRooms(),
      customWings: loadCustomWings(),
    });
  });
}
