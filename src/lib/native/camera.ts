import { Capacitor } from "@capacitor/core";

let Camera: typeof import("@capacitor/camera").Camera | null = null;

// Lazy-load Camera only on native platforms
async function getCamera() {
  if (Camera) return Camera;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import("@capacitor/camera");
    Camera = mod.Camera;
    return Camera;
  } catch {
    return null;
  }
}

/** Open native camera and capture a photo. Returns base64 data URL or null. */
export async function capturePhoto(): Promise<string | null> {
  const cam = await getCamera();
  if (!cam) return null;
  try {
    const { CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await cam.getPhoto({
      quality: 80,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      allowEditing: false,
      width: 1920,
      height: 1920,
    });
    return photo.dataUrl ?? null;
  } catch {
    return null;
  }
}

/** Open native gallery picker. Returns base64 data URL or null. */
export async function pickFromGallery(): Promise<string | null> {
  const cam = await getCamera();
  if (!cam) return null;
  try {
    const { CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await cam.getPhoto({
      quality: 80,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      allowEditing: false,
      width: 1920,
      height: 1920,
    });
    return photo.dataUrl ?? null;
  } catch {
    return null;
  }
}

/** Prompt user to choose camera or gallery. Returns base64 data URL or null. */
export async function captureOrPick(): Promise<string | null> {
  const cam = await getCamera();
  if (!cam) return null;
  try {
    const { CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await cam.getPhoto({
      quality: 80,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      allowEditing: false,
      width: 1920,
      height: 1920,
    });
    return photo.dataUrl ?? null;
  } catch {
    return null;
  }
}
