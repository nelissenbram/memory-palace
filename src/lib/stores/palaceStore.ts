import { create } from "zustand";
import { syncSettingsToServer } from "@/lib/stores/settingsSync";

type NavMode = "atrium" | "library" | "3d";

interface PalaceState {
  navMode: NavMode;
  view: string; // "exterior" | "entrance" | "corridor" | "room"
  activeWing: string | null;
  activeRoomId: string | null;
  hovWing: string | null;
  hovDoor: string | null;
  opacity: number;
  portalAnim: boolean;
  _timer: ReturnType<typeof setTimeout> | null;
  roomLayouts: Record<string, string>; // roomId → layout override id
  /** Deep-link target for Library view — consumed once then cleared */
  libraryTarget: { wingId: string; roomId: string; memoryId?: string } | null;

  setNavMode: (mode: NavMode) => void;
  setLibraryTarget: (target: { wingId: string; roomId: string; memoryId?: string } | null) => void;
  setHovWing: (v: string | null) => void;
  setHovDoor: (v: string | null) => void;
  fade: (cb: () => void) => void;
  enterWing: (id: string) => void;
  enterEntrance: () => void;
  enterCorridor: (wingId: string) => void;
  exitToPalace: () => void;
  exitToEntrance: () => void;
  enterRoom: (roomId: string) => void;
  exitToCorridor: () => void;
  switchWing: (id: string) => void;
  setRoomLayout: (roomId: string, layoutId: string) => void;
}

function loadRoomLayouts(): Record<string, string> {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("mp_room_layouts") : null;
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function loadNavMode(): NavMode {
  // Always start in atrium on fresh page load.
  // localStorage is still written on mode switch (for mid-session nav)
  // but never restored on initial load.
  return "atrium";
}

export const usePalaceStore = create<PalaceState>((set, get) => ({
  navMode: loadNavMode(),
  view: "exterior",
  activeWing: null,
  activeRoomId: null,
  hovWing: null,
  hovDoor: null,
  opacity: 1,
  portalAnim: false,
  _timer: null,
  roomLayouts: loadRoomLayouts(),
  libraryTarget: null,

  setNavMode: (mode) => {
    set({ navMode: mode });
    try { localStorage.setItem("mp_nav_mode", mode); } catch {}
  },
  setLibraryTarget: (target) => set({ libraryTarget: target }),
  setHovWing: (v) => set({ hovWing: v }),
  setHovDoor: (v) => set({ hovDoor: v }),

  fade: (cb) => {
    const { _timer } = get();
    if (_timer) clearTimeout(_timer);
    const t = setTimeout(() => {
      cb();
      set({ portalAnim: false });
    }, 500);
    set({ portalAnim: true, opacity: 0, _timer: t });
  },

  enterWing: (id) => {
    set({ activeWing: id });
    get().fade(() => set({ view: "entrance", opacity: 1 }));
  },

  enterEntrance: () => {
    get().fade(() => set({ view: "entrance", activeRoomId: null, opacity: 1 }));
  },

  enterCorridor: (wingId) => {
    set({ activeWing: wingId });
    get().fade(() => set({ view: "corridor", activeRoomId: null, opacity: 1 }));
  },

  exitToPalace: () => {
    get().fade(() => set({ view: "exterior", activeWing: null, activeRoomId: null, opacity: 1 }));
  },

  exitToEntrance: () => {
    get().fade(() => set({ view: "entrance", activeRoomId: null, opacity: 1 }));
  },

  enterRoom: (roomId) => {
    if (roomId === "__portal__") { get().exitToEntrance(); return; }
    if (roomId === "__back__") { get().exitToCorridor(); return; }
    set({ activeRoomId: roomId });
    get().fade(() => set({ view: "room", opacity: 1 }));
  },

  exitToCorridor: () => {
    get().fade(() => set({ view: "corridor", activeRoomId: null, opacity: 1 }));
  },

  setRoomLayout: (roomId, layoutId) => set((s) => {
    const updated = { ...s.roomLayouts, [roomId]: layoutId };
    try { localStorage.setItem("mp_room_layouts", JSON.stringify(updated)); syncSettingsToServer(); } catch {}
    return { roomLayouts: updated };
  }),

  switchWing: (id) => {
    const { activeWing, view } = get();
    if (view === "exterior") { get().enterCorridor(id); return; }
    if (view === "entrance") { get().enterCorridor(id); return; }
    if (activeWing !== id) {
      get().fade(() => set({ activeWing: id, activeRoomId: null, view: "corridor", opacity: 1 }));
    } else if (view === "room") {
      get().exitToCorridor();
    }
  },
}));

// Re-read localStorage when cross-device sync completes
if (typeof window !== "undefined") {
  window.addEventListener("mp-settings-synced", () => {
    usePalaceStore.setState({ roomLayouts: loadRoomLayouts() });
  });
}
