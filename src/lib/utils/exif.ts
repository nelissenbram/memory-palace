export interface ExifData {
  dateTaken?: string;
  lat?: number;
  lng?: number;
  cameraMake?: string;
  cameraModel?: string;
}

export async function extractExif(file: File): Promise<ExifData | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const exifr = await import("exifr").then(m => m.default);
    const data = await exifr.parse(file, {
      pick: ["DateTimeOriginal", "GPSLatitude", "GPSLongitude", "Make", "Model"],
    });
    if (!data) return null;
    return {
      dateTaken: data.DateTimeOriginal?.toISOString?.() || undefined,
      lat: data.latitude ?? undefined,
      lng: data.longitude ?? undefined,
      cameraMake: data.Make || undefined,
      cameraModel: data.Model || undefined,
    };
  } catch {
    return null;
  }
}
