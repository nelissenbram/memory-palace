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
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.muted = true;
    video.preload = "auto";
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration * 0.1);
    };
    video.onseeked = () => {
      const { videoWidth: w, videoHeight: h } = video;
      if (!w || !h) { URL.revokeObjectURL(url); resolve(null); return; }
      const scale = Math.min(maxDim / w, maxDim / h, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    // timeout fallback
    setTimeout(() => { URL.revokeObjectURL(url); resolve(null); }, 8000);
    video.src = url;
  });
}
