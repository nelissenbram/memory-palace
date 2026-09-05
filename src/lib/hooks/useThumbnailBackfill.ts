"use client";
import { useEffect } from "react";
import type { Mem } from "@/lib/constants/defaults";
import { thumbnailFromVideoUrl, thumbnailFromImageUrl } from "@/lib/utils/thumbnail";
import { updateMemoryAction } from "@/lib/auth/memory-actions";
import { useMemoryStore } from "@/lib/stores/memoryStore";

/**
 * Background task: for any video memory missing a thumbnail, extract a frame
 * client-side, upload it, persist the URL to the DB, and update local state.
 * Throttled to one video at a time globally to avoid hammering Supabase or
 * stalling the UI. Once a thumbnail is generated, it's permanent.
 */

const _attempted = new Set<string>();
const _queue: Array<() => Promise<void>> = [];

// Drain the queue with a small pool of concurrent workers instead of one task
// at a time. On a fresh/large library, thumbnails are the ONLY thing that lets
// the wall stop painting full-resolution originals into ~116-200px tiles
// (see PhotoWall.tileSources / MediaThumb), so getting thumbnailUrl populated
// quickly is the win. Bounded (3) + a short inter-task yield keeps this from
// hammering /api/upload or stalling the main thread — same tasks, same DB
// writes, same result, just parallelised.
const _POOL = 3;
const _GAP_MS = 60;
let _activeWorkers = 0;

async function worker() {
  while (_queue.length > 0) {
    const task = _queue.shift();
    if (!task) break;
    try { await task(); } catch { /* swallow — non-critical */ }
    if (_queue.length > 0) await new Promise((r) => setTimeout(r, _GAP_MS));
  }
}

function processQueue() {
  while (_activeWorkers < _POOL && _queue.length > 0) {
    _activeWorkers++;
    void worker().finally(() => { _activeWorkers--; });
  }
}

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export function useThumbnailBackfill(
  roomId: string | null,
  mems: Mem[],
  /** resolves a memory's room when no single room is selected (unified wall) */
  roomOf?: (memId: string) => string | null,
) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!roomId && !roomOf) return;

    for (const mem of mems) {
      const isVideo = mem.type === "video" || !!mem.videoBlob;
      // Photos (and painting/album/document image tiles) that never got a stored
      // thumbnail: everything that isn't a video and carries image pixel data.
      const isPhoto = !isVideo && (mem.type === "photo" || mem.type === "painting" || mem.type === "album");
      if (!isVideo && !isPhoto) continue;
      if (mem.thumbnailUrl) continue;
      if (!mem.dataUrl) continue;
      // Only backfill from real image data (not a remote http URL we can't taint-safely draw).
      if (isPhoto && !mem.dataUrl.startsWith("data:image/")) continue;
      if (!looksLikeUuid(mem.id)) continue;
      if (_attempted.has(mem.id)) continue;
      _attempted.add(mem.id);

      const memId = mem.id;
      const memDataUrl = mem.dataUrl;
      const memRoomId = roomId || roomOf?.(mem.id) || null;
      if (!memRoomId) { _attempted.delete(mem.id); continue; }

      _queue.push(async () => {
        // 1. Generate a downscaled thumbnail data URL (frame for video, 280px for photo)
        const thumbDataUrl = isVideo
          ? await thumbnailFromVideoUrl(memDataUrl, 240)
          : await thumbnailFromImageUrl(memDataUrl, 280);
        if (!thumbDataUrl) return;

        // 2. Convert data URL → Blob without fetch() (CSP blocks data: in connect-src)
        const commaIdx = thumbDataUrl.indexOf(",");
        const header = thumbDataUrl.slice(0, commaIdx);
        const b64 = thumbDataUrl.slice(commaIdx + 1);
        const mime = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });

        // 3. Upload to storage
        const form = new FormData();
        form.append("file", new File([blob], "thumb.jpg", { type: "image/jpeg" }));
        form.append("bucket", "memories");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
        if (!uploadRes.ok) return;
        const { url } = await uploadRes.json();
        if (!url) return;

        // 4. Persist to DB
        const result = await updateMemoryAction(memId, { thumbnail_url: url });
        if (result.error) return;

        // 5. Update local state so the card re-renders with the thumbnail
        useMemoryStore.setState((s) => {
          const cur = s.userMems[memRoomId];
          if (!cur) return s;
          const updated = cur.map((m) => m.id === memId ? { ...m, thumbnailUrl: url } : m);
          return { userMems: { ...s.userMems, [memRoomId]: updated } };
        });
      });
    }

    processQueue();
  }, [roomId, mems, roomOf]);
}
