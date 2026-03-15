import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { createMemory, updateMemoryAction, deleteMemoryAction, fetchMemories } from "@/lib/auth/memory-actions";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem, SharingInfo } from "@/lib/constants/defaults";
import { useRoomStore } from "@/lib/stores/roomStore";
import { enqueueMemory, cacheMemories, getCachedMemories, type CachedMemory } from "@/lib/offline/db";

interface MemoryState {
  userMems: Record<string, Mem[]>;
  selMem: Mem | null;
  showUpload: boolean;
  showSharing: boolean;
  showDirectory: boolean;
  roomSharing: Record<string, SharingInfo>;

  searchQuery: string;
  filterType: string | null;
  setSelMem: (mem: Mem | null) => void;
  setShowUpload: (v: boolean) => void;
  setShowSharing: (v: boolean) => void;
  setShowDirectory: (v: boolean) => void;
  setSearchQuery: (q: string) => void;
  setFilterType: (t: string | null) => void;
  fetchRoomMemories: (roomId: string) => Promise<void>;
  addMemory: (roomId: string, mem: Mem) => Promise<void>;
  updateMemory: (roomId: string, memId: string, updates: Partial<Mem>) => Promise<void>;
  deleteMemory: (roomId: string, memId: string) => Promise<void>;
  moveMemory: (fromRoomId: string, toRoomId: string, memId: string) => Promise<void>;
  getRoomSharing: (roomId: string, activeWing: string | null) => SharingInfo;
  updateRoomSharing: (roomId: string, activeWing: string | null, updates: Partial<SharingInfo>) => void;
}

const supabaseReady = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const useMemoryStore = create<MemoryState>((set, get) => ({
  userMems: {},
  selMem: null,
  showUpload: false,
  showSharing: false,
  showDirectory: false,
  roomSharing: {},

  searchQuery: "",
  filterType: null,
  setSelMem: (mem) => set({ selMem: mem }),
  setShowUpload: (v) => set({ showUpload: v }),
  setShowSharing: (v) => set({ showSharing: v }),
  setShowDirectory: (v) => set({ showDirectory: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterType: (t) => set({ filterType: t }),

  fetchRoomMemories: async (roomId) => {
    if (!supabaseReady) return;

    // If offline, serve from IndexedDB cache
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        const cached = await getCachedMemories(roomId);
        if (cached.length > 0) {
          const mapped: Mem[] = cached.map((m: CachedMemory) => ({
            id: m.id, title: m.title, hue: m.hue, s: m.saturation, l: m.lightness,
            type: m.type, desc: m.description || "", dataUrl: m.fileUrl || null,
            _cached: true,
          }));
          set((s) => ({ userMems: { ...s.userMems, [roomId]: mapped } }));
        }
      } catch { /* IndexedDB unavailable */ }
      return;
    }

    const { memories } = await fetchMemories(roomId);
    if (memories && memories.length > 0) {
      const mapped: Mem[] = memories.map((m: any) => ({
        id: m.id, title: m.title, hue: m.hue, s: m.saturation, l: m.lightness,
        type: m.type, desc: m.description || "", dataUrl: m.file_url || null,
      }));
      set((s) => ({ userMems: { ...s.userMems, [roomId]: mapped } }));

      // Cache in IndexedDB for offline viewing
      try {
        const toCache: CachedMemory[] = memories.map((m: any) => ({
          id: m.id, roomId, title: m.title, description: m.description || "",
          type: m.type, hue: m.hue, saturation: m.saturation, lightness: m.lightness,
          fileUrl: m.file_url || null, cachedAt: Date.now(),
        }));
        cacheMemories(roomId, toCache).catch(() => {});
      } catch { /* IndexedDB unavailable */ }
    }
  },

  addMemory: async (roomId, mem) => {
    // Optimistic local update
    set((s) => {
      const cur = s.userMems[roomId] || ROOM_MEMS[roomId] || [];
      return { userMems: { ...s.userMems, [roomId]: [...cur, mem] } };
    });
    if (!supabaseReady) return;

    // If offline, queue in IndexedDB for later sync
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        await enqueueMemory({
          clientId: mem.id,
          roomId,
          title: mem.title,
          description: mem.desc || "",
          type: mem.type,
          hue: mem.hue,
          saturation: mem.s,
          lightness: mem.l,
          fileData: mem.dataUrl || null,
          createdAt: mem.createdAt || new Date().toISOString(),
        });
        // Mark memory as queued in local state
        set((s) => {
          const cur = s.userMems[roomId] || [];
          const updated = cur.map((m) => m.id === mem.id ? { ...m, _offline: true } : m);
          return { userMems: { ...s.userMems, [roomId]: updated } };
        });
      } catch (e) { console.error("[Offline] Queue error:", e); }
      return;
    }

    // Upload file to Storage if it's a data URL
    let fileUrl = mem.dataUrl;
    let filePath: string | null = null;
    if (mem.dataUrl && mem.dataUrl.startsWith("data:")) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const ext = mem.dataUrl.match(/data:image\/(\w+)/)?.[1] || "jpg";
          const path = `${user.id}/${Date.now()}.${ext}`;
          const res = await fetch(mem.dataUrl);
          const blob = await res.blob();
          const { error: upErr } = await supabase.storage.from("memories").upload(path, blob, { contentType: blob.type });
          if (!upErr) {
            filePath = path;
            const { data: urlData } = await supabase.storage.from("memories").createSignedUrl(path, 60 * 60 * 24 * 365);
            fileUrl = urlData?.signedUrl || mem.dataUrl;
          }
        }
      } catch (e) { console.error("Upload error:", e); }
    }

    // Save to DB
    const result = await createMemory({
      roomId, title: mem.title, description: mem.desc || "", type: mem.type,
      hue: mem.hue, saturation: mem.s, lightness: mem.l, fileUrl, filePath,
    });
    if (result.memory) {
      set((s) => {
        const cur = s.userMems[roomId] || [];
        const updated = cur.map((m) => m.id === mem.id ? { ...m, id: result.memory.id, dataUrl: fileUrl } : m);
        return { userMems: { ...s.userMems, [roomId]: updated } };
      });
    }
  },

  updateMemory: async (roomId, memId, updates) => {
    // Optimistic local update
    set((s) => {
      const cur = s.userMems[roomId] || ROOM_MEMS[roomId] || [];
      const updated = cur.map((m) => m.id === memId ? { ...m, ...updates } : m);
      // Also update selMem if it's the one being edited
      const selMem = s.selMem?.id === memId ? { ...s.selMem, ...updates } : s.selMem;
      return { userMems: { ...s.userMems, [roomId]: updated }, selMem };
    });
    if (!supabaseReady) return;

    // If dataUrl changed (image was edited), upload the new version
    let fileUrl = updates.dataUrl;
    let filePath: string | null = null;
    if (updates.dataUrl && updates.dataUrl.startsWith("data:")) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const ext = updates.dataUrl.match(/data:image\/(\w+)/)?.[1] || "jpg";
          const path = `${user.id}/${Date.now()}_edited.${ext}`;
          const res = await fetch(updates.dataUrl);
          const blob = await res.blob();
          const { error: upErr } = await supabase.storage.from("memories").upload(path, blob, { contentType: blob.type });
          if (!upErr) {
            filePath = path;
            const { data: urlData } = await supabase.storage.from("memories").createSignedUrl(path, 60 * 60 * 24 * 365);
            fileUrl = urlData?.signedUrl || updates.dataUrl;
            // Update local state with the signed URL
            set((s) => {
              const cur = s.userMems[roomId] || [];
              const updated = cur.map((m) => m.id === memId ? { ...m, dataUrl: fileUrl } : m);
              const selMem = s.selMem?.id === memId ? { ...s.selMem, dataUrl: fileUrl } : s.selMem;
              return { userMems: { ...s.userMems, [roomId]: updated }, selMem };
            });
          }
        }
      } catch (e) { console.error("Edit upload error:", e); }
    }

    await updateMemoryAction(memId, {
      title: updates.title,
      description: updates.desc,
      type: updates.type,
      ...(fileUrl && fileUrl !== updates.dataUrl ? { file_url: fileUrl } : {}),
      ...(filePath ? { file_path: filePath } : {}),
    });
  },

  deleteMemory: async (roomId, memId) => {
    set((s) => {
      const cur = s.userMems[roomId] || ROOM_MEMS[roomId] || [];
      return { userMems: { ...s.userMems, [roomId]: cur.filter((m) => m.id !== memId) } };
    });
    if (!supabaseReady) return;
    await deleteMemoryAction(memId);
  },

  moveMemory: async (fromRoomId, toRoomId, memId) => {
    const state = get();
    const fromList = state.userMems[fromRoomId] || ROOM_MEMS[fromRoomId] || [];
    const mem = fromList.find((m) => m.id === memId);
    if (!mem) return;

    // Optimistic: remove from source, add to target (mark as stored in new room)
    const movedMem = { ...mem, displayed: false };
    set((s) => {
      const from = (s.userMems[fromRoomId] || ROOM_MEMS[fromRoomId] || []).filter((m) => m.id !== memId);
      const to = [...(s.userMems[toRoomId] || ROOM_MEMS[toRoomId] || []), movedMem];
      return { userMems: { ...s.userMems, [fromRoomId]: from, [toRoomId]: to } };
    });

    if (!supabaseReady) return;
    // In DB: delete from old room and create in new room
    await deleteMemoryAction(memId);
    await createMemory({
      roomId: toRoomId, title: mem.title, description: mem.desc || "", type: mem.type,
      hue: mem.hue, saturation: mem.s, lightness: mem.l, fileUrl: mem.dataUrl, filePath: null,
    });
  },

  getRoomSharing: (roomId, activeWing) => {
    const { roomSharing } = get();
    if (roomSharing[roomId]) return roomSharing[roomId];
    const rd = activeWing ? useRoomStore.getState().getWingRooms(activeWing).find((r) => r.id === roomId) : null;
    return rd ? { shared: rd.shared, sharedWith: [...rd.sharedWith] } : { shared: false, sharedWith: [] };
  },

  updateRoomSharing: (roomId, activeWing, updates) => {
    const current = get().getRoomSharing(roomId, activeWing);
    set((s) => ({ roomSharing: { ...s.roomSharing, [roomId]: { ...current, ...updates } } }));
  },
}));
