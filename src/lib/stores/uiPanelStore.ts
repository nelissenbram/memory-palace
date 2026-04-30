import { create } from "zustand";

interface UIPanelState {
  // Panel visibility
  showFamilyTree: boolean;
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
  showImportHub: boolean;

  // Gallery initial memory — when clicking a 3D object, open gallery at that memory
  galleryInitialMemId: string | null;
  // Gallery initial tab — "gallery" when clicking furniture in 3D, "library" otherwise
  galleryInitialTab: "library" | "gallery";
  setGalleryInitialTab: (tab: "library" | "gallery") => void;
  // Auto-assign display unit after upload (e.g. clicking empty painting frame → auto-assign "painting")
  galleryAutoAssignUnit: string | null;
  setGalleryAutoAssignUnit: (unit: string | null) => void;

  // Setters
  setShowFamilyTree: (v: boolean) => void;
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
  setShowImportHub: (v: boolean) => void;
  setGalleryInitialMemId: (id: string | null) => void;

  // Convenience: close all panels
  closeAllPanels: () => void;
}

export const useUIPanelStore = create<UIPanelState>((set) => ({
  // Panel visibility — all default to false
  showFamilyTree: false,
  showMemoryMap: false,
  showTimeline: false,
  showStatistics: false,
  showMassImport: false,
  showGallery: false,
  galleryInitialMemId: null,
  galleryInitialTab: "library" as "library" | "gallery",
  setGalleryInitialTab: (tab) => set({ galleryInitialTab: tab }),
  galleryAutoAssignUnit: null,
  setGalleryAutoAssignUnit: (unit) => set({ galleryAutoAssignUnit: unit }),
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
  showImportHub: false,

  // Setters
  setShowFamilyTree: (v) => set({ showFamilyTree: v }),
  setShowMemoryMap: (v) => set({ showMemoryMap: v }),
  setShowTimeline: (v) => set({ showTimeline: v }),
  setShowStatistics: (v) => set({ showStatistics: v }),
  setShowMassImport: (v) => set({ showMassImport: v }),
  setShowGallery: (v) => set({ showGallery: v, ...(v ? {} : { galleryInitialMemId: null, galleryInitialTab: "library" as "library" | "gallery", galleryAutoAssignUnit: null }) }),
  setGalleryInitialMemId: (id) => set({ galleryInitialMemId: id }),
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
  setShowImportHub: (v) => set({ showImportHub: v }),

  // Close all panels at once
  closeAllPanels: () =>
    set({
      showFamilyTree: false,
      showMemoryMap: false,
      showTimeline: false,
      showStatistics: false,
      showMassImport: false,
      showGallery: false,
      galleryInitialMemId: null,
      galleryInitialTab: "library" as "library" | "gallery",
      galleryAutoAssignUnit: null,
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
      showImportHub: false,
    }),
}));
