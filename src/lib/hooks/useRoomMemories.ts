import { useEffect } from "react";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";

export function useRoomMemories() {
  const { activeWing, activeRoomId } = usePalaceStore();
  const { userMems, fetchRoomMemories, addMemory, updateMemory, deleteMemory, getRoomSharing, updateRoomSharing } =
    useMemoryStore();

  // Fetch from Supabase when entering a room
  useEffect(() => {
    if (activeRoomId) fetchRoomMemories(activeRoomId);
  }, [activeRoomId, fetchRoomMemories]);

  // Derived room memories
  const roomMemsRaw: Mem[] = activeRoomId
    ? userMems[activeRoomId] || ROOM_MEMS[activeRoomId] || []
    : [];
  const roomMemsKey = JSON.stringify(roomMemsRaw.map((m) => m.id));
  const roomMems = roomMemsRaw;

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

  return { roomMems, roomMemsKey, handleAddMemory, handleUpdateMemory, handleDeleteMemory, currentSharing, updateSharing };
}
