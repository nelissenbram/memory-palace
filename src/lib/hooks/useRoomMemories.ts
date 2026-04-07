import { useEffect } from "react";
import { getDemoMems } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";

export function useRoomMemories() {
  const { activeWing, activeRoomId } = usePalaceStore();
  const { userMems, searchQuery, filterType, fetchRoomMemories, addMemory, updateMemory, deleteMemory, getRoomSharing, updateRoomSharing, setSearchQuery, setFilterType } =
    useMemoryStore();

  // Fetch from Supabase when entering a room + reset search
  useEffect(() => {
    if (activeRoomId) fetchRoomMemories(activeRoomId);
    setSearchQuery("");
    setFilterType(null);
  }, [activeRoomId, fetchRoomMemories, setSearchQuery, setFilterType]);

  // Derived room memories (all)
  const allRoomMems: Mem[] = activeRoomId
    ? userMems[activeRoomId] || getDemoMems(activeRoomId)
    : [];

  // Filtered memories
  const roomMems = allRoomMems.filter((m) => {
    if (filterType && m.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!m.title.toLowerCase().includes(q) && !(m.desc || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const roomMemsKey = JSON.stringify(roomMems.map((m) => m.id));

  // Wrappers that bind activeRoomId
  const handleAddMemory = (mem: Mem) => {
    if (!activeRoomId) {
      console.warn("addMemory: no activeRoomId");
      return;
    }
    addMemory(activeRoomId, mem);
  };

  const handleUpdateMemory = (memId: string, updates: Partial<Mem>) => {
    if (!activeRoomId) return;
    updateMemory(activeRoomId, memId, updates);
  };

  const handleDeleteMemory = (memId: string) => {
    if (!activeRoomId) return;
    deleteMemory(activeRoomId, memId);
  };

  const currentSharing = (roomId: string) => getRoomSharing(roomId, activeWing);
  const updateSharing = (roomId: string, updates: any) => updateRoomSharing(roomId, activeWing, updates);

  return { roomMems, allRoomMems, roomMemsKey, handleAddMemory, addMemoryToRoom: addMemory, handleUpdateMemory, handleDeleteMemory, currentSharing, updateSharing };
}
