"use client";
import { useState, useEffect } from "react";
import { thumbnailFromVideoUrl } from "@/lib/utils/thumbnail";

/** Extracts a thumbnail frame from a video URL. Returns data URL or null. */
export function useVideoThumbnail(videoUrl: string | null | undefined): string | null {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    if (!videoUrl) return;
    let cancelled = false;
    thumbnailFromVideoUrl(videoUrl, 280).then((result) => {
      if (!cancelled) setThumb(result);
    });
    return () => { cancelled = true; };
  }, [videoUrl]);

  return thumb;
}
