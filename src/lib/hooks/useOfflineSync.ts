"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getQueuedMemories,
  removeQueuedMemory,
  getQueueCount,
  type QueuedMemory,
} from "@/lib/offline/db";
import { createMemory } from "@/lib/auth/memory-actions";

const supabaseReady = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state (SSR-safe)
    setIsOnline(navigator.onLine);

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}

interface SyncState {
  isSyncing: boolean;
  syncProgress: { done: number; total: number } | null;
  queueCount: number;
}

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    syncProgress: null,
    queueCount: 0,
  });
  const syncingRef = useRef(false);

  const refreshQueueCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setState((s) => ({ ...s, queueCount: count }));
    } catch {
      // IndexedDB may not be available
    }
  }, []);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current || !supabaseReady) return;
    syncingRef.current = true;

    try {
      const queued = await getQueuedMemories();
      if (queued.length === 0) {
        syncingRef.current = false;
        return;
      }

      setState((s) => ({
        ...s,
        isSyncing: true,
        syncProgress: { done: 0, total: queued.length },
      }));

      let done = 0;
      for (const item of queued) {
        try {
          await syncSingleMemory(item);
          if (item.queueId != null) {
            await removeQueuedMemory(item.queueId);
          }
        } catch (err) {
          console.error("[Offline sync] Failed to sync memory:", item.clientId, err);
          // Leave in queue for next attempt
        }
        done++;
        setState((s) => ({
          ...s,
          syncProgress: { done, total: queued.length },
        }));
      }

      const remaining = await getQueueCount();
      setState({ isSyncing: false, syncProgress: null, queueCount: remaining });
    } catch (err) {
      console.error("[Offline sync] Queue read error:", err);
      setState((s) => ({ ...s, isSyncing: false, syncProgress: null }));
    } finally {
      syncingRef.current = false;
    }
  }, []);

  // Sync when coming online
  useEffect(() => {
    if (isOnline) {
      syncQueue();
    }
  }, [isOnline, syncQueue]);

  // Sync on app focus
  useEffect(() => {
    const onFocus = () => {
      if (navigator.onLine) syncQueue();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [syncQueue]);

  // Check queue count on mount
  useEffect(() => {
    refreshQueueCount();
  }, [refreshQueueCount]);

  return {
    isOnline,
    ...state,
    refreshQueueCount,
    syncQueue,
  };
}

/**
 * Upload a single queued memory to Supabase, including file upload if needed.
 */
async function syncSingleMemory(item: QueuedMemory): Promise<void> {
  let fileUrl: string | null = item.fileData;
  let filePath: string | null = null;
  let fileSize: number | null = null;
  let storageBackend: string | null = null;

  // Upload file via server-side upload endpoint
  if (item.fileData && item.fileData.startsWith("data:")) {
    try {
      const ext = item.fileData.match(/data:image\/(\w+)/)?.[1] || "jpg";
      const res = await fetch(item.fileData);
      const blob = await res.blob();
      fileSize = blob.size;
      const formData = new FormData();
      formData.append("file", new File([blob], `memory.${ext}`, { type: blob.type }));
      formData.append("bucket", "memories");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        filePath = uploadData.path;
        fileUrl = uploadData.url;
        storageBackend = uploadData.storageBackend;
      }
    } catch (e) {
      console.error("[Offline sync] File upload error:", e);
    }
  }

  const result = await createMemory({
    roomId: item.roomId,
    title: item.title,
    description: item.description,
    type: item.type,
    hue: item.hue,
    saturation: item.saturation,
    lightness: item.lightness,
    fileUrl,
    filePath,
    fileSize,
    storageBackend,
  });

  if (result.error) {
    throw new Error(result.error);
  }
}
