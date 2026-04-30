import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useUIPanelStore } from "@/lib/stores/uiPanelStore";
import { useCallback } from "react";

export interface Crumb {
  label: string;
  action: (() => void) | null;
}

export function useNavigation() {
  // Use individual selectors to avoid re-renders on unrelated store changes (e.g. hovWing)
  const view = usePalaceStore((s) => s.view);
  const activeWing = usePalaceStore((s) => s.activeWing);
  const activeRoomId = usePalaceStore((s) => s.activeRoomId);
  const hovWing = usePalaceStore((s) => s.hovWing);
  const exitToPalace = usePalaceStore((s) => s.exitToPalace);
  const exitToCorridor = usePalaceStore((s) => s.exitToCorridor);
  const exitToEntrance = usePalaceStore((s) => s.exitToEntrance);
  const { setShowGallery, setGalleryInitialMemId, setGalleryInitialTab, setGalleryAutoAssignUnit } = useUIPanelStore();
  const { getWingRooms, getWings } = useRoomStore();

  const allWings = getWings();
  const wingData = activeWing ? allWings.find((w) => w.id === activeWing) ?? null : null;
  const hovWingData = hovWing ? allWings.find((w) => w.id === hovWing) ?? null : null;
  const activeRoomData =
    activeRoomId && activeWing
      ? getWingRooms(activeWing).find((r) => r.id === activeRoomId) ?? null
      : null;

  // Breadcrumb path
  const crumbs: Crumb[] = [];
  crumbs.push({ label: "Palace", action: view !== "exterior" ? exitToPalace : null });
  if (view === "entrance" || view === "corridor" || view === "room") {
    crumbs.push({
      label: "Entrance Hall",
      action: view === "corridor" || view === "room" ? exitToEntrance : null,
    });
  }
  if (activeWing && (view === "corridor" || view === "room")) {
    let wingLabel: string;
    if (activeWing.startsWith("shared:")) {
      const parts = activeWing.split(":");
      const slug = parts[1] || "wing";
      wingLabel = `\u{1F91D} ${slug.charAt(0).toUpperCase() + slug.slice(1)}`;
    } else {
      wingLabel = `${wingData?.icon || ""} ${wingData?.name || activeWing}`;
    }
    crumbs.push({
      label: wingLabel,
      action: view === "room" ? exitToCorridor : null,
    });
  }
  if (activeRoomData)
    crumbs.push({ label: `${activeRoomData.icon} ${activeRoomData.name}`, action: null });

  // InteriorScene sends "__back__", "__upload__", "__upload_painting__", or a memory object
  const handleMemClick = useCallback((m: any) => {
    if (m === "__back__") exitToCorridor();
    else if (m === "__upload_painting__") { setGalleryInitialMemId(null); setGalleryInitialTab("library"); setGalleryAutoAssignUnit("painting"); setShowGallery(true); }
    else if (m === "__upload__") { setGalleryInitialMemId(null); setGalleryInitialTab("library"); setShowGallery(true); }
    else { setGalleryInitialMemId(null); setGalleryInitialTab("gallery"); setShowGallery(true); }
  }, [exitToCorridor, setShowGallery, setGalleryInitialMemId, setGalleryInitialTab, setGalleryAutoAssignUnit]);

  return { wingData, hovWingData, activeRoomData, crumbs, handleMemClick, allWings };
}
