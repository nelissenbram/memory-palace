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
    exitToPalace, exitToCorridor, enterRoom } = usePalaceStore();
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
  if (activeWing)
    crumbs.push({
      label: `${wingData?.icon} ${wingData?.name}`,
      action: view === "room" ? exitToCorridor : null,
    });
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
