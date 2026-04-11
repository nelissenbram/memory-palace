import { create } from "zustand";
import { createMemory, updateMemoryAction, deleteMemoryAction, moveMemoryAction, fetchMemories } from "@/lib/auth/memory-actions";
import { getDemoMems } from "@/lib/constants/defaults";
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

function isSupabaseReady() { return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); }

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
    if (!isSupabaseReady()) return;

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
        thumbnailUrl: m.thumbnail_url || null,
        ...(m.location_name ? { locationName: m.location_name } : {}),
        ...(m.lat != null ? { lat: m.lat } : {}),
        ...(m.lng != null ? { lng: m.lng } : {}),
        ...(m.created_at ? { createdAt: m.created_at } : {}),
        ...(m.displayed != null ? { displayed: m.displayed } : {}),
        ...(m.display_unit ? { displayUnit: m.display_unit } : {}),
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
      const cur = s.userMems[roomId] || getDemoMems(roomId);
      return { userMems: { ...s.userMems, [roomId]: [...cur, mem] } };
    });
    if (!isSupabaseReady()) return;

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

    // Upload file via server-side upload endpoint
    let fileUrl = mem.dataUrl;
    let filePath: string | null = null;
    let fileSize: number | null = null;
    let storageBackend: string | null = null;

    // If file was already uploaded directly (via FormData in handleImportFiles)
    if (mem._filePath) {
      filePath = mem._filePath;
      storageBackend = mem._storageBackend || null;
    } else if (mem.dataUrl && mem.dataUrl.startsWith("data:")) {
      try {
        // Manual decode — CSP blocks fetch() on data: URLs
        const commaIdx = mem.dataUrl.indexOf(",");
        const header = mem.dataUrl.slice(0, commaIdx);
        const b64 = mem.dataUrl.slice(commaIdx + 1);
        const mime = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        fileSize = blob.size;
        const ext = mime.match(/image\/(\w+)/)?.[1] || "jpg";
        const formData = new FormData();
        formData.append("file", new File([blob], `memory.${ext}`, { type: mime }));
        formData.append("bucket", "memories");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          filePath = uploadData.path;
          fileUrl = uploadData.url;
          storageBackend = uploadData.storageBackend;
        } else {
          // Upload failed — roll back optimistic add
          console.error("[memoryStore] addMemory upload failed:", uploadRes.status);
          set((s) => {
            const cur = s.userMems[roomId] || [];
            return { userMems: { ...s.userMems, [roomId]: cur.filter((m) => m.id !== mem.id) } };
          });
          return;
        }
      } catch (e) {
        console.error("Upload error:", e);
        // Roll back optimistic add on network error
        set((s) => {
          const cur = s.userMems[roomId] || [];
          return { userMems: { ...s.userMems, [roomId]: cur.filter((m) => m.id !== mem.id) } };
        });
        return;
      }
    }

    // Upload thumbnail if present (video/audio)
    let thumbnailUrl: string | null = mem.thumbnailUrl || null;
    if (thumbnailUrl && thumbnailUrl.startsWith("data:")) {
      try {
        // Manual decode — CSP blocks fetch() on data: URLs
        const commaIdx = thumbnailUrl.indexOf(",");
        const header = thumbnailUrl.slice(0, commaIdx);
        const b64 = thumbnailUrl.slice(commaIdx + 1);
        const mime = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const thumbBlob = new Blob([bytes], { type: mime });
        const thumbForm = new FormData();
        thumbForm.append("file", new File([thumbBlob], "thumb.jpg", { type: "image/jpeg" }));
        thumbForm.append("bucket", "memories");
        const thumbUpload = await fetch("/api/upload", { method: "POST", body: thumbForm });
        if (thumbUpload.ok) {
          const thumbData = await thumbUpload.json();
          thumbnailUrl = thumbData.url;
        }
      } catch { /* thumbnail upload failed — non-critical */ }
    }

    // Save to DB
    const result = await createMemory({
      roomId, title: mem.title, description: mem.desc || "", type: mem.type,
      hue: mem.hue, saturation: mem.s, lightness: mem.l, fileUrl, filePath, fileSize, storageBackend,
      thumbnailUrl,
      locationName: mem.locationName || null, lat: mem.lat ?? null, lng: mem.lng ?? null,
    });
    if (result.memory) {
      set((s) => {
        const cur = s.userMems[roomId] || [];
        const updated = cur.map((m) => m.id === mem.id ? { ...m, id: result.memory.id, dataUrl: fileUrl, ...(thumbnailUrl ? { thumbnailUrl } : {}) } : m);
        return { userMems: { ...s.userMems, [roomId]: updated } };
      });
    } else if (result.error) {
      // DB save failed — roll back optimistic add
      console.error("[memoryStore] addMemory createMemory failed:", result.error);
      set((s) => {
        const cur = s.userMems[roomId] || [];
        return { userMems: { ...s.userMems, [roomId]: cur.filter((m) => m.id !== mem.id) } };
      });
    }
  },

  updateMemory: async (roomId, memId, updates) => {
    // Optimistic local update
    set((s) => {
      const cur = s.userMems[roomId] || getDemoMems(roomId);
      const updated = cur.map((m) => m.id === memId ? { ...m, ...updates } : m);
      // Also update selMem if it's the one being edited
      const selMem = s.selMem?.id === memId ? { ...s.selMem, ...updates } : s.selMem;
      return { userMems: { ...s.userMems, [roomId]: updated }, selMem };
    });
    if (!isSupabaseReady()) return;

    // If dataUrl changed (image was edited), upload the new version
    let fileUrl = updates.dataUrl;
    let filePath: string | null = null;
    let editStorageBackend: string | null = null;
    if (updates.dataUrl && updates.dataUrl.startsWith("data:")) {
      try {
        const ext = updates.dataUrl.match(/data:image\/(\w+)/)?.[1] || "jpg";
        const res = await fetch(updates.dataUrl);
        const blob = await res.blob();
        const formData = new FormData();
        formData.append("file", new File([blob], `memory_edited.${ext}`, { type: blob.type }));
        formData.append("bucket", "memories");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          filePath = uploadData.path;
          fileUrl = uploadData.url;
          editStorageBackend = uploadData.storageBackend;
          set((s) => {
            const cur = s.userMems[roomId] || [];
            const updated = cur.map((m) => m.id === memId ? { ...m, dataUrl: fileUrl } : m);
            const selMem = s.selMem?.id === memId ? { ...s.selMem, dataUrl: fileUrl } : s.selMem;
            return { userMems: { ...s.userMems, [roomId]: updated }, selMem };
          });
        }
      } catch (e) { console.error("Edit upload error:", e); }
    }

    const supaUpdates = {
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.desc !== undefined ? { description: updates.desc } : {}),
      ...(updates.type !== undefined ? { type: updates.type } : {}),
      ...(fileUrl && fileUrl !== updates.dataUrl ? { file_url: fileUrl } : {}),
      ...(filePath ? { file_path: filePath } : {}),
      ...(editStorageBackend ? { storage_backend: editStorageBackend } : {}),
      ...(updates.locationName !== undefined ? { location_name: updates.locationName } : {}),
      ...(updates.lat !== undefined ? { lat: updates.lat } : {}),
      ...(updates.lng !== undefined ? { lng: updates.lng } : {}),
      ...("displayed" in updates ? { displayed: updates.displayed ?? null } : {}),
      ...("displayUnit" in updates ? { display_unit: updates.displayUnit ?? null } : {}),
    };
    try {
      await updateMemoryAction(memId, supaUpdates);
    } catch (e) {
      console.error("Supabase update failed:", e);
    }
  },

  deleteMemory: async (roomId, memId) => {
    const prev = get().userMems[roomId] || getDemoMems(roomId);
    set((s) => {
      const cur = s.userMems[roomId] || getDemoMems(roomId);
      return { userMems: { ...s.userMems, [roomId]: cur.filter((m) => m.id !== memId) } };
    });
    if (!isSupabaseReady()) return;
    const result = await deleteMemoryAction(memId);
    if (result.error) {
      // Roll back optimistic update
      console.error("[memoryStore] deleteMemory failed:", result.error);
      set((s) => ({ userMems: { ...s.userMems, [roomId]: prev } }));
    }
  },

  moveMemory: async (fromRoomId, toRoomId, memId) => {
    const state = get();
    const prevFrom = state.userMems[fromRoomId] || getDemoMems(fromRoomId);
    const prevTo = state.userMems[toRoomId] || getDemoMems(toRoomId);
    const mem = prevFrom.find((m) => m.id === memId);
    if (!mem) return;

    // Optimistic: remove from source, add to target (mark as stored in new room)
    const movedMem = { ...mem, displayed: false };
    set((s) => {
      const from = (s.userMems[fromRoomId] || getDemoMems(fromRoomId)).filter((m) => m.id !== memId);
      const to = [...(s.userMems[toRoomId] || getDemoMems(toRoomId)), movedMem];
      return { userMems: { ...s.userMems, [fromRoomId]: from, [toRoomId]: to } };
    });

    if (!isSupabaseReady()) return;
    // In DB: update room_id in a single operation to avoid data loss
    const result = await moveMemoryAction(memId, toRoomId);
    if (result.error) {
      // Roll back optimistic update
      console.error("[memoryStore] moveMemory failed:", result.error);
      set((s) => ({ userMems: { ...s.userMems, [fromRoomId]: prevFrom, [toRoomId]: prevTo } }));
    }
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
