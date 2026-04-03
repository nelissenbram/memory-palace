import { create } from "zustand";

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

  setNavMode: (mode: NavMode) => void;
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
  roomLayouts: {},

  setNavMode: (mode) => {
    set({ navMode: mode });
    try { localStorage.setItem("mp_nav_mode", mode); } catch {}
  },
  setHovWing: (v) => set({ hovWing: v }),
  setHovDoor: (v) => set({ hovDoor: v }),

  fade: (cb) => {
    const { _timer } = get();
    if (_timer) clearTimeout(_timer);
    set({ portalAnim: true, opacity: 0 });
    const t = setTimeout(() => {
      cb();
      set({ portalAnim: false });
    }, 500);
    set({ _timer: t });
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

  setRoomLayout: (roomId, layoutId) => set((s) => ({
    roomLayouts: { ...s.roomLayouts, [roomId]: layoutId },
  })),

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
