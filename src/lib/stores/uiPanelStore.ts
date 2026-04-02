import { create } from "zustand";

interface UIPanelState {
  // Panel visibility
  showMemoryMap: boolean;
  showTimeline: boolean;
  showStatistics: boolean;
  showMassImport: boolean;
  showGallery: boolean;
  showBustBuilder: boolean;
  showInvites: boolean;
  showSharedWithMe: boolean;
  showSharingSettings: boolean;
  showCorridorGallery: boolean;
  showEraPicker: boolean;
  showUpgradePrompt: boolean;
  showRoomManager: boolean;
  showRoomShare: boolean;
  showStoragePlayer: boolean;
  showWingManager: boolean;

  // Setters
  setShowMemoryMap: (v: boolean) => void;
  setShowTimeline: (v: boolean) => void;
  setShowStatistics: (v: boolean) => void;
  setShowMassImport: (v: boolean) => void;
  setShowGallery: (v: boolean) => void;
  setShowBustBuilder: (v: boolean) => void;
  setShowInvites: (v: boolean) => void;
  setShowSharedWithMe: (v: boolean) => void;
  setShowSharingSettings: (v: boolean) => void;
  setShowCorridorGallery: (v: boolean) => void;
  setShowEraPicker: (v: boolean) => void;
  setShowUpgradePrompt: (v: boolean) => void;
  setShowRoomManager: (v: boolean) => void;
  setShowRoomShare: (v: boolean) => void;
  setShowStoragePlayer: (v: boolean) => void;
  setShowWingManager: (v: boolean) => void;

  // Convenience: close all panels
  closeAllPanels: () => void;
}

export const useUIPanelStore = create<UIPanelState>((set) => ({
  // Panel visibility — all default to false
  showMemoryMap: false,
  showTimeline: false,
  showStatistics: false,
  showMassImport: false,
  showGallery: false,
  showBustBuilder: false,
  showInvites: false,
  showSharedWithMe: false,
  showSharingSettings: false,
  showCorridorGallery: false,
  showEraPicker: false,
  showUpgradePrompt: false,
  showRoomManager: false,
  showRoomShare: false,
  showStoragePlayer: false,
  showWingManager: false,

  // Setters
  setShowMemoryMap: (v) => set({ showMemoryMap: v }),
  setShowTimeline: (v) => set({ showTimeline: v }),
  setShowStatistics: (v) => set({ showStatistics: v }),
  setShowMassImport: (v) => set({ showMassImport: v }),
  setShowGallery: (v) => set({ showGallery: v }),
  setShowBustBuilder: (v) => set({ showBustBuilder: v }),
  setShowInvites: (v) => set({ showInvites: v }),
  setShowSharedWithMe: (v) => set({ showSharedWithMe: v }),
  setShowSharingSettings: (v) => set({ showSharingSettings: v }),
  setShowCorridorGallery: (v) => set({ showCorridorGallery: v }),
  setShowEraPicker: (v) => set({ showEraPicker: v }),
  setShowUpgradePrompt: (v) => set({ showUpgradePrompt: v }),
  setShowRoomManager: (v) => set({ showRoomManager: v }),
  setShowRoomShare: (v) => set({ showRoomShare: v }),
  setShowStoragePlayer: (v) => set({ showStoragePlayer: v }),
  setShowWingManager: (v) => set({ showWingManager: v }),

  // Close all panels at once
  closeAllPanels: () =>
    set({
      showMemoryMap: false,
      showTimeline: false,
      showStatistics: false,
      showMassImport: false,
      showGallery: false,
      showBustBuilder: false,
      showInvites: false,
      showSharedWithMe: false,
      showSharingSettings: false,
      showCorridorGallery: false,
      showEraPicker: false,
      showUpgradePrompt: false,
      showRoomManager: false,
      showRoomShare: false,
      showStoragePlayer: false,
      showWingManager: false,
    }),
}));
