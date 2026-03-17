import { create } from "zustand";

interface WalkthroughState {
  isActive: boolean;
  phase: number; // 0=exterior, 1=entrance-intro, 2=entrance-navigate, 3=corridor, 4=room, 5=done
  completed: boolean;
  showDiscoveryMenu: boolean;
  targetWing: string | null;
  targetRoom: string | null;

  start: (wing: string, roomId: string) => void;
  advancePhase: () => void;
  complete: () => void;
  skip: () => void;
  setShowDiscoveryMenu: (v: boolean) => void;
}

function isCompleted(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem("mp_walkthrough_completed") === "true"; } catch { return false; }
}

export const useWalkthroughStore = create<WalkthroughState>((set, get) => ({
  isActive: false,
  phase: 0,
  completed: isCompleted(),
  showDiscoveryMenu: false,
  targetWing: null,
  targetRoom: null,

  start: (wing, roomId) => {
    // Reset completed flag — allows walkthrough to restart after re-onboarding
    try { localStorage.removeItem("mp_walkthrough_completed"); } catch {}
    set({ isActive: true, phase: 0, completed: false, targetWing: wing, targetRoom: roomId });
  },

  advancePhase: () => {
    const { phase } = get();
    if (phase >= 5) return;
    const next = phase + 1;
    if (next >= 5) {
      // Walkthrough finished — mark done but keep isActive briefly for fade-out
      set({ phase: next, isActive: false });
      try { localStorage.setItem("mp_walkthrough_completed", "true"); } catch {}
      set({ completed: true });
    } else {
      set({ phase: next });
    }
  },

  complete: () => {
    set({ isActive: false, phase: 5, completed: true });
    try { localStorage.setItem("mp_walkthrough_completed", "true"); } catch {}
  },

  skip: () => {
    set({ isActive: false, phase: 5, completed: true });
    try { localStorage.setItem("mp_walkthrough_completed", "true"); } catch {}
  },

  setShowDiscoveryMenu: (v) => set({ showDiscoveryMenu: v }),
}));
