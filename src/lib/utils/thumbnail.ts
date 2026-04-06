/** Generate a small thumbnail data URL from a File. Returns null for unsupported types. */
export async function generateThumbnail(
  file: File,
  maxDim: number = 200
): Promise<string | null> {
  if (file.type.startsWith("image/")) return thumbnailFromImage(file, maxDim);
  if (file.type.startsWith("video/")) return thumbnailFromVideo(file, maxDim);
  return null;
}

function thumbnailFromImage(file: File, maxDim: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const { width: w, height: h } = img;
      const scale = Math.min(maxDim / w, maxDim / h, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function thumbnailFromVideo(file: File, maxDim: number): Promise<string | null> {
  const url = URL.createObjectURL(file);
  return thumbnailFromVideoUrl(url, maxDim).then((result) => {
    URL.revokeObjectURL(url);
    return result;
  });
}

/** Generate a thumbnail from a video URL. Cached per-URL in memory. */
const _thumbCache = new Map<string, string | null>();

export function thumbnailFromVideoUrl(
  url: string,
  maxDim: number = 200,
): Promise<string | null> {
  const cached = _thumbCache.get(url);
  if (cached !== undefined) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.playsInline = true;
    // Only set crossOrigin for cross-origin URLs; same-origin doesn't need it
    // and setting it can break loading when the server lacks CORS headers.
    const isCrossOrigin = /^https?:\/\//i.test(url) &&
      typeof window !== "undefined" &&
      !url.startsWith(window.location.origin);
    if (isCrossOrigin) video.crossOrigin = "anonymous";

    let resolved = false;
    const done = (result: string | null) => {
      if (resolved) return;
      resolved = true;
      _thumbCache.set(url, result);
      video.pause();
      video.removeAttribute("src");
      video.load();
      resolve(result);
    };

    const extractFrame = () => {
      const { videoWidth: w, videoHeight: h } = video;
      if (!w || !h) { done(null); return; }
      const scale = Math.min(maxDim / w, maxDim / h, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { done(null); return; }
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        done(null); // CORS tainted canvas
      }
    };

    video.onloadeddata = () => {
      // Seek to a frame for the thumbnail
      const target = Math.min(1, video.duration * 0.1);
      if (target > 0 && video.currentTime !== target) {
        video.currentTime = target;
      } else {
        // Duration 0 or already at target — extract immediately
        extractFrame();
      }
    };
    video.onseeked = extractFrame;

    video.onerror = () => done(null);
    setTimeout(() => done(null), 8000);

    video.src = url;
    // On mobile, calling play() helps trigger data loading (autoplay policy
    // allows muted playback). We pause after loadeddata via the seek.
    video.play().catch(() => {});
  });
}
