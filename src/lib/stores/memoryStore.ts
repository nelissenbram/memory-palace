import { create } from "zustand";
import { createMemory, updateMemoryAction, deleteMemoryAction, moveMemoryAction, fetchMemories, fetchAllMemories } from "@/lib/auth/memory-actions";
import { getDemoMems, markDemoDeleted } from "@/lib/constants/defaults";
import { syncSettingsToServer } from "@/lib/stores/settingsSync";
import type { Mem, SharingInfo } from "@/lib/constants/defaults";
import { useRoomStore } from "@/lib/stores/roomStore";
import { enqueueMemory, cacheMemories, getCachedMemories, type CachedMemory } from "@/lib/offline/db";
import { track } from "@/lib/analytics";
import { getPlatform } from "@/lib/native/platform";

interface MemoryState {
  userMems: Record<string, Mem[]>;
  /** true while a room's memories fetch is in flight — drives "Gathering memories…" UI */
  roomLoading: Record<string, boolean>;
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
  fetchAllRoomMemories: () => Promise<void>;
  addMemory: (roomId: string, mem: Mem) => Promise<boolean>;
  /** resolves true when the change is persisted (or running local-only) */
  updateMemory: (roomId: string, memId: string, updates: Partial<Mem>) => Promise<boolean>;
  deleteMemory: (roomId: string, memId: string) => Promise<void>;
  /** resolves true when the move is persisted (or running local-only) */
  moveMemory: (fromRoomId: string, toRoomId: string, memId: string) => Promise<boolean>;
  getRoomSharing: (roomId: string, activeWing: string | null) => SharingInfo;
  updateRoomSharing: (roomId: string, activeWing: string | null, updates: Partial<SharingInfo>) => void;
}

function isSupabaseReady() { return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); }

// One in-flight fetch per room at a time — duplicate callers await the same promise
const _inflightRoomFetches = new Map<string, Promise<void>>();

export const useMemoryStore = create<MemoryState>((set, get) => ({
  userMems: {},
  roomLoading: {},
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

    // Dedupe concurrent fetches for the same room (mount sweeps + card
    // clicks used to fire 2+ identical requests per room).
    const inflight = _inflightRoomFetches.get(roomId);
    if (inflight) return inflight;
    const p = (async () => {
    // Owner R2 #5: the FIRST fetch after (mobile) app start can race the auth
    // session — the server action then answers `{ memories: [] }` (its `!user` /
    // `!room` guards) or throws outright, and the room sat "empty" until a 30s
    // poll finally landed data (~1 min on device). A failed/empty first load is
    // retried twice (2s / 5s) before we accept it; a thrown action never
    // rejects this promise (callers fire-and-forget from effects).
    const firstLoad = get().userMems[roomId] === undefined;
    const delays = firstLoad ? [0, 2000, 5000] : [0];
    let memories: any[] | null = null;
    for (const delay of delays) {
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
      try {
        const res = await fetchMemories(roomId);
        if (res && !("error" in res && res.error) && res.memories) memories = res.memories;
      } catch (e) {
        console.error("[memoryStore] fetchRoomMemories failed:", e);
      }
      if (memories && memories.length > 0) break;
    }
    // All attempts failed → keep this room UNDEFINED (not []) so the UI keeps
    // its loading affordance and the fast retry / 30s poll can still fill it.
    if (memories) {
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
        ...(m.display_scale ? { displayScale: m.display_scale } : {}),
        ...(m.sort_order != null ? { sortOrder: m.sort_order } : {}),
        ...(m.source ? { source: m.source } : {}),
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
    })();
    _inflightRoomFetches.set(roomId, p);
    set((s) => ({ roomLoading: { ...s.roomLoading, [roomId]: true } }));
    try { await p; } finally {
      _inflightRoomFetches.delete(roomId);
      set((s) => ({ roomLoading: { ...s.roomLoading, [roomId]: false } }));
    }
  },

  fetchAllRoomMemories: async () => {
    if (!isSupabaseReady()) return;
    let roomMemories: Record<string, any[]>;
    try {
      ({ roomMemories } = await fetchAllMemories());
    } catch (e) {
      console.error("[memoryStore] fetchAllRoomMemories failed:", e);
      return;
    }
    // Owner R2 #5: an EMPTY snapshot (auth-session race → the action's `!user`
    // guard) must never clobber rooms that already hold data — that made the
    // in-room media pill vanish until the next successful poll.
    if (Object.keys(roomMemories).length === 0 && Object.keys(get().userMems).length > 0) return;
    const allMapped: Record<string, Mem[]> = {};
    for (const [roomId, mems] of Object.entries(roomMemories)) {
      allMapped[roomId] = mems.map((m: any) => ({
        id: m.id, title: m.title, hue: m.hue, s: m.saturation, l: m.lightness,
        type: m.type, desc: m.description || "", dataUrl: m.file_url || null,
        thumbnailUrl: m.thumbnail_url || null,
        ...(m.location_name ? { locationName: m.location_name } : {}),
        ...(m.lat != null ? { lat: m.lat } : {}),
        ...(m.lng != null ? { lng: m.lng } : {}),
        ...(m.created_at ? { createdAt: m.created_at } : {}),
        ...(m.displayed != null ? { displayed: m.displayed } : {}),
        ...(m.display_unit ? { displayUnit: m.display_unit } : {}),
        ...(m.display_scale ? { displayScale: m.display_scale } : {}),
        ...(m.sort_order != null ? { sortOrder: m.sort_order } : {}),
        ...(m.source ? { source: m.source } : {}),
      }));
    }
    set({ userMems: allMapped });
  },

  addMemory: async (roomId, mem) => {
    // Optimistic local update
    set((s) => {
      const cur = s.userMems[roomId] || getDemoMems(roomId);
      return { userMems: { ...s.userMems, [roomId]: [...cur, mem] } };
    });
    if (!isSupabaseReady()) return true;

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
      } catch (e) { console.error("[Offline] Queue error:", e); return false; }
      return true;
    }

    // Upload file via server-side upload endpoint
    let fileUrl = mem.dataUrl;
    let filePath: string | null = null;
    let fileSize: number | null = null;
    let storageBackend: string | null = null;

    // Week-4 resurface: EXIF taken-date from /api/upload (best-effort) → event_date
    let eventDate: string | null = mem._eventDate || null;

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
          if (uploadData.eventDate) eventDate = uploadData.eventDate;
        } else {
          // Upload failed — roll back optimistic add
          console.error("[memoryStore] addMemory upload failed:", uploadRes.status);
          set((s) => {
            const cur = s.userMems[roomId] || [];
            return { userMems: { ...s.userMems, [roomId]: cur.filter((m) => m.id !== mem.id) } };
          });
          return false;
        }
      } catch (e) {
        console.error("Upload error:", e);
        // Roll back optimistic add on network error
        set((s) => {
          const cur = s.userMems[roomId] || [];
          return { userMems: { ...s.userMems, [roomId]: cur.filter((m) => m.id !== mem.id) } };
        });
        return false;
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
      eventDate,
      // LEG-003: AI provenance flag (restored photos, interview narratives,
      // AI-tagged imports) — persisted best-effort by createMemory.
      ...(mem.source === "ai" ? { source: "ai" as const } : {}),
    });
    if (result.memory) {
      // OPS-010: first_photo_saved — client-side funnel milestone on the very
      // first successful memory save. Heuristic: once per browser, guarded by a
      // localStorage flag (all client save paths — onboarding, ImportHub, upload
      // panels — funnel through this store method). track() is consent-gated
      // and a no-op in the native shell, so this only fires for consenting web
      // sessions; native activation stays covered by the server-side
      // memory_created event.
      try {
        if (!localStorage.getItem("mp_first_photo_saved")) {
          localStorage.setItem("mp_first_photo_saved", "1");
          track("first_photo_saved", { platform: getPlatform(), memoryType: mem.type });
        }
      } catch { /* storage unavailable — skip the milestone, never the save */ }
      set((s) => {
        const cur = s.userMems[roomId] || [];
        const updated = cur.map((m) => m.id === mem.id ? { ...m, id: result.memory.id, dataUrl: fileUrl, ...(thumbnailUrl ? { thumbnailUrl } : {}) } : m);
        return { userMems: { ...s.userMems, [roomId]: updated } };
      });
      return true;
    } else if (result.error) {
      // DB save failed — roll back optimistic add
      console.error("[memoryStore] addMemory createMemory failed:", result.error);
      set((s) => {
        const cur = s.userMems[roomId] || [];
        return { userMems: { ...s.userMems, [roomId]: cur.filter((m) => m.id !== mem.id) } };
      });
      return false;
    }
    // No server result returned at all — treat as not persisted.
    return false;
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
    if (!isSupabaseReady()) return true;

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
      ...("displayScale" in updates ? { display_scale: (updates as { displayScale?: string | null }).displayScale ?? null } : {}),
      ...("sortOrder" in updates ? { sort_order: updates.sortOrder ?? 0 } : {}),
      // LEG-003: mark AI-edited content (e.g. AI labels merged into the
      // description). Only ever escalates to 'ai' — never back to 'user'.
      ...(updates.source === "ai" ? { source: "ai" } : {}),
    };
    // Client-only fields (e.g. hero ★) can leave nothing to persist — an empty
    // Supabase update() would error, and there is nothing to send anyway.
    if (Object.keys(supaUpdates).length === 0) return true;
    try {
      let result = await updateMemoryAction(memId, supaUpdates);
      let err = (result as { error?: string } | null)?.error;
      // display_scale ships ahead of its migration (20260821_display_scale.sql):
      // if the column doesn't exist yet, retry without it — the size sticks
      // optimistically for the session and persists once the owner migrates.
      if (err && "display_scale" in supaUpdates && /display_scale/i.test(err)) {
        const { display_scale: _dropped, ...rest } = supaUpdates as Record<string, unknown>;
        if (Object.keys(rest).length === 0) return true; // nothing else to persist
        result = await updateMemoryAction(memId, rest as Parameters<typeof updateMemoryAction>[1]);
        err = (result as { error?: string } | null)?.error;
      }
      // source (LEG-003 AI provenance) ships ahead of its migration
      // (20260905130000_ai_provenance.sql) the same way: never lose the
      // underlying content update over the missing provenance column.
      if (err && "source" in supaUpdates && /source/i.test(err)) {
        const { source: _droppedSource, ...rest } = supaUpdates as Record<string, unknown>;
        if (Object.keys(rest).length === 0) return true; // nothing else to persist
        result = await updateMemoryAction(memId, rest as Parameters<typeof updateMemoryAction>[1]);
        err = (result as { error?: string } | null)?.error;
      }
      if (err) {
        console.error("[memoryStore] updateMemory failed:", err);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Supabase update failed:", e);
      return false;
    }
  },

  deleteMemory: async (roomId, memId) => {
    const prev = get().userMems[roomId] || getDemoMems(roomId);
    // If this is a demo memory (ID starts with "d" or "f"), track deletion so it won't reappear
    if (memId.match(/^[df]\d+$/)) { markDemoDeleted(memId); syncSettingsToServer(); }
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
    if (!mem) return false;

    // Optimistic: remove from source, add to target (mark as stored in new room)
    const movedMem = { ...mem, displayed: false };
    set((s) => {
      const from = (s.userMems[fromRoomId] || getDemoMems(fromRoomId)).filter((m) => m.id !== memId);
      const to = [...(s.userMems[toRoomId] || getDemoMems(toRoomId)), movedMem];
      return { userMems: { ...s.userMems, [fromRoomId]: from, [toRoomId]: to } };
    });

    if (!isSupabaseReady()) return true;
    // In DB: update room_id in a single operation to avoid data loss
    const result = await moveMemoryAction(memId, toRoomId);
    if (result.error) {
      // Roll back optimistic update
      console.error("[memoryStore] moveMemory failed:", result.error);
      set((s) => ({ userMems: { ...s.userMems, [fromRoomId]: prevFrom, [toRoomId]: prevTo } }));
      return false;
    }
    return true;
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
