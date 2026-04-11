import { create } from "zustand";

// Tracks which media control bar (video/audio) is currently open inside
// the Room interior scene. Only one bar may be open at a time so the two
// buttons in MemoryPalace and the bar inside InteriorScene stay in sync.
export type RoomMediaBarKind = "video" | "audio" | null;

interface RoomMediaBarState {
  open: RoomMediaBarKind;
  setOpen: (v: RoomMediaBarKind) => void;
  toggle: (v: Exclude<RoomMediaBarKind, null>) => void;
}

export const useRoomMediaBarStore = create<RoomMediaBarState>((set, get) => ({
  open: null,
  setOpen: (v) => set({ open: v }),
  toggle: (v) => set({ open: get().open === v ? null : v }),
}));
