import { WINGS, WING_ROOMS } from "@/lib/constants/wings";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";

export interface Crumb {
  label: string;
  action: (() => void) | null;
}

export function useNavigation() {
  const { view, activeWing, activeRoomId, hovWing,
    exitToPalace, exitToCorridor, enterRoom } = usePalaceStore();
  const { setSelMem } = useMemoryStore();

  const wingData = activeWing ? WINGS.find((w) => w.id === activeWing) ?? null : null;
  const hovWingData = hovWing ? WINGS.find((w) => w.id === hovWing) ?? null : null;
  const activeRoomData =
    activeRoomId && activeWing
      ? (WING_ROOMS[activeWing] || []).find((r) => r.id === activeRoomId) ?? null
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

  // InteriorScene sends "__back__" as a special memory click
  const handleMemClick = (m: any) => {
    if (m === "__back__") exitToCorridor();
    else setSelMem(m);
  };

  return { wingData, hovWingData, activeRoomData, crumbs, handleMemClick };
}
