// Shared room-import engine — converts queued files into room memories (upload /
// resize / read), writing via the memory store. Extracted so the Steward's Ledger
// and (eventually) the legacy panel share ONE import path. See
// docs/ROOM_UI_MEDIA_PLAYER_MASTERPLAN.md §6.
import type { Mem } from "@/lib/constants/defaults";
import type { QueuedFile } from "@/components/ui/ImportHub";

export function readFileWithTimeout(file: File, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const timer = setTimeout(() => { reader.abort(); reject(new Error("FileReader timeout")); }, timeoutMs);
    reader.onload = () => { clearTimeout(timer); resolve(reader.result as string); };
    reader.onerror = () => { clearTimeout(timer); reject(reader.error); };
    reader.readAsDataURL(file);
  });
}

export async function importFilesToRoom(
  files: QueuedFile[],
  roomId: string | undefined,
  addMemory: (roomId: string, mem: Mem) => Promise<boolean> | boolean,
): Promise<{ anyFailed: boolean }> {
  if (!roomId) return { anyFailed: false };
  let anyFailed = false;
  for (const item of files) {
    const isVideo = (item.type || "").startsWith("video/") || /\.(mp4|mov|webm|3gp)$/i.test(item.name);
    const isAudio = (item.type || "").startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg)$/i.test(item.name);
    const isImage = !isVideo && !isAudio;
    let dataUrl = item.url || "";
    let directFilePath: string | null = null;
    let directStorageBackend: string | null = null;

    if (item.file) {
      try {
        if ((isVideo || isAudio) && item.file.size > 0) {
          const formData = new FormData();
          formData.append("file", item.file, item.name);
          formData.append("bucket", "memories");
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            dataUrl = uploadData.url; directFilePath = uploadData.path; directStorageBackend = uploadData.storageBackend;
          } else {
            dataUrl = await readFileWithTimeout(item.file, 15000);
          }
        } else if (isImage && item.file.size > 2 * 1024 * 1024) {
          try {
            dataUrl = await new Promise<string>((resolve, reject) => {
              const img = new window.Image();
              const blobUrl = URL.createObjectURL(item.file!);
              img.onload = () => {
                try {
                  const maxDim = 1600;
                  let w = img.naturalWidth, h = img.naturalHeight;
                  if (w > maxDim || h > maxDim) { const ratio = Math.min(maxDim / w, maxDim / h); w = Math.round(w * ratio); h = Math.round(h * ratio); }
                  const canvas = document.createElement("canvas");
                  canvas.width = w; canvas.height = h;
                  const ctx = canvas.getContext("2d");
                  if (!ctx) { reject(new Error("no canvas")); return; }
                  ctx.drawImage(img, 0, 0, w, h);
                  resolve(canvas.toDataURL("image/jpeg", 0.82));
                } finally { URL.revokeObjectURL(blobUrl); }
              };
              img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("img load")); };
              img.src = blobUrl;
            });
          } catch { dataUrl = await readFileWithTimeout(item.file, 15000); }
        } else {
          dataUrl = await readFileWithTimeout(item.file, 15000);
        }
      } catch {
        if (item.file) {
          try {
            const formData = new FormData();
            formData.append("file", item.file, item.name);
            formData.append("bucket", "memories");
            const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
            if (uploadRes.ok) { const uploadData = await uploadRes.json(); dataUrl = uploadData.url; directFilePath = uploadData.path; directStorageBackend = uploadData.storageBackend; }
          } catch { /* give up */ }
        }
      }
    } else if (item.previewUrl) {
      dataUrl = item.previewUrl;
    }
    if (item.file && !dataUrl && !directFilePath) { anyFailed = true; continue; }
    await addMemory(roomId, {
      id: `import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: item.name,
      hue: Math.floor(Math.random() * 360), s: 50, l: 70,
      type: isVideo ? "video" : isAudio ? "audio" : "photo",
      dataUrl, desc: "", createdAt: new Date().toISOString(),
      ...(directFilePath ? { _filePath: directFilePath, _storageBackend: directStorageBackend } : {}),
    } as Mem);
  }
  return { anyFailed };
}
