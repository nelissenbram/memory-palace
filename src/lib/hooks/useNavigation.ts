import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useCallback } from "react";

export interface Crumb {
  label: string;
  action: (() => void) | null;
}

export function useNavigation() {
  const { view, activeWing, activeRoomId, hovWing,
    exitToPalace, exitToCorridor, exitToEntrance, enterRoom } = usePalaceStore();
  const { setSelMem, setShowUpload } = useMemoryStore();
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

  // InteriorScene sends "__back__" or "__upload__" as special clicks
  const handleMemClick = useCallback((m: any) => {
    if (m === "__back__") exitToCorridor();
    else if (m === "__upload__") setShowUpload(true);
    else setSelMem(m);
  }, [exitToCorridor, setSelMem, setShowUpload]);

  return { wingData, hovWingData, activeRoomData, crumbs, handleMemClick, allWings };
}
