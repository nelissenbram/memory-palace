"use client";
import { useEffect } from "react";
import type { Mem } from "@/lib/constants/defaults";
import { thumbnailFromVideoUrl } from "@/lib/utils/thumbnail";
import { updateMemoryAction } from "@/lib/auth/memory-actions";
import { useMemoryStore } from "@/lib/stores/memoryStore";

/**
 * Background task: for any video memory missing a thumbnail, extract a frame
 * client-side, upload it, persist the URL to the DB, and update local state.
 * Throttled to one video at a time globally to avoid hammering Supabase or
 * stalling the UI. Once a thumbnail is generated, it's permanent.
 */

const _attempted = new Set<string>();
let _running = false;
const _queue: Array<() => Promise<void>> = [];

async function processQueue() {
  if (_running) return;
  _running = true;
  while (_queue.length > 0) {
    const task = _queue.shift();
    if (task) {
      try { await task(); } catch { /* swallow — non-critical */ }
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  _running = false;
}

function looksLikeUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export function useThumbnailBackfill(roomId: string | null, mems: Mem[]) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!roomId) return;

    for (const mem of mems) {
      const isVideo = mem.type === "video" || !!mem.videoBlob;
      if (!isVideo) continue;
      if (mem.thumbnailUrl) continue;
      if (!mem.dataUrl) continue;
      if (!looksLikeUuid(mem.id)) continue;
      if (_attempted.has(mem.id)) continue;
      _attempted.add(mem.id);

      const memId = mem.id;
      const memDataUrl = mem.dataUrl;

      _queue.push(async () => {
        // 1. Extract frame to data URL
        const thumbDataUrl = await thumbnailFromVideoUrl(memDataUrl, 240);
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
          const cur = s.userMems[roomId];
          if (!cur) return s;
          const updated = cur.map((m) => m.id === memId ? { ...m, thumbnailUrl: url } : m);
          return { userMems: { ...s.userMems, [roomId]: updated } };
        });
      });
    }

    processQueue();
  }, [roomId, mems]);
}
