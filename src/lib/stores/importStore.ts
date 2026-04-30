import { create } from "zustand";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";

// ─── Types ───

export interface ImportItem {
  localId: string;
  file: File;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  previewUrl: string | null;
  dataUrl: string | null;

  exif: {
    dateTaken?: string;
    lat?: number;
    lng?: number;
    cameraMake?: string;
    cameraModel?: string;
  } | null;

  aiSuggestions: {
    title: string;
    desc: string;
    type: string;
    wingId: string;
    roomId: string;
    locationName?: string;
    confidence: number;
  } | null;

  confirmed: {
    title: string;
    desc: string;
    type: string;
    wingId: string;
    roomId: string;
    locationName: string;
    lat: number | null;
    lng: number | null;
  };

  status: "queued" | "reading" | "extracting" | "tagging" | "ready" | "accepted" | "rejected" | "committed" | "error";
  error: string | null;
  needsReview: boolean;
}

export type ImportStep = "drop" | "processing" | "review" | "committing" | "done";
export type ImportMode = "ai" | "manual";

interface ImportState {
  items: ImportItem[];
  mode: ImportMode;
  step: ImportStep;
  targetWingId: string | null;
  targetRoomId: string | null;
  reviewSampleRate: number;
  progress: { processed: number; total: number; committed: number; errors: number };

  addFiles: (files: File[]) => void;
  removeItem: (localId: string) => void;
  setMode: (mode: ImportMode) => void;
  setTarget: (wingId: string | null, roomId: string | null) => void;
  updateConfirmed: (localId: string, updates: Partial<ImportItem["confirmed"]>) => void;
  acceptItem: (localId: string) => void;
  acceptAll: () => void;
  rejectItem: (localId: string) => void;
  setStep: (step: ImportStep) => void;
  updateItem: (localId: string, updates: Partial<ImportItem>) => void;
  setProgress: (p: Partial<ImportState["progress"]>) => void;
  reset: () => void;
}

function mimeToType(mime: string): string {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("word")) return "document";
  return "photo";
}

const UNTITLED: Record<string, string> = {
  en: "Untitled", nl: "Naamloos", de: "Unbenannt", es: "Sin título", fr: "Sans titre",
};

function titleFromFilename(name: string): string {
  const title = name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  if (title) return title;
  const locale = (typeof localStorage !== "undefined" && localStorage.getItem("mp_locale")?.slice(0, 2)) || "en";
  return UNTITLED[locale] || UNTITLED.en;
}

let idCounter = 0;

export const useImportStore = create<ImportState>((set, get) => ({
  items: [],
  mode: "ai",
  step: "drop",
  targetWingId: null,
  targetRoomId: null,
  reviewSampleRate: 0.3,
  progress: { processed: 0, total: 0, committed: 0, errors: 0 },

  addFiles: (files) => {
    const newItems: ImportItem[] = files.map((file) => ({
      localId: `imp_${Date.now()}_${++idCounter}`,
      file,
      fileName: file.name,
      fileType: file.type,
      fileSizeBytes: file.size,
      previewUrl: null,
      dataUrl: null,
      exif: null,
      aiSuggestions: null,
      confirmed: {
        title: titleFromFilename(file.name),
        desc: "",
        type: mimeToType(file.type),
        wingId: get().targetWingId || "",
        roomId: get().targetRoomId || "",
        locationName: "",
        lat: null,
        lng: null,
      },
      status: "queued",
      error: null,
      needsReview: false,
    }));
    set((s) => ({ items: [...s.items, ...newItems] }));
  },

  removeItem: (localId) => set((s) => ({ items: s.items.filter((i) => i.localId !== localId) })),

  setMode: (mode) => set({ mode }),
  setTarget: (wingId, roomId) => {
    set({ targetWingId: wingId, targetRoomId: roomId });
    // Update all queued items that don't have a target yet
    set((s) => ({
      items: s.items.map((i) =>
        i.status === "queued" ? { ...i, confirmed: { ...i.confirmed, wingId: wingId || i.confirmed.wingId, roomId: roomId || i.confirmed.roomId } } : i
      ),
    }));
  },
  updateConfirmed: (localId, updates) =>
    set((s) => ({
      items: s.items.map((i) => (i.localId === localId ? { ...i, confirmed: { ...i.confirmed, ...updates } } : i)),
    })),

  acceptItem: (localId) =>
    set((s) => ({ items: s.items.map((i) => (i.localId === localId ? { ...i, status: "accepted" as const } : i)) })),

  acceptAll: () =>
    set((s) => ({
      items: s.items.map((i) => (i.status === "ready" || i.status === "accepted" ? { ...i, status: "accepted" as const } : i)),
    })),

  rejectItem: (localId) =>
    set((s) => ({ items: s.items.map((i) => (i.localId === localId ? { ...i, status: "rejected" as const } : i)) })),

  setStep: (step) => set({ step }),

  updateItem: (localId, updates) =>
    set((s) => ({ items: s.items.map((i) => (i.localId === localId ? { ...i, ...updates } : i)) })),

  setProgress: (p) => set((s) => ({ progress: { ...s.progress, ...p } })),

  reset: () => {
    // Revoke all object URLs
    for (const item of get().items) {
      if (item.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
    }
    set({
      items: [],
      step: "drop",
      progress: { processed: 0, total: 0, committed: 0, errors: 0 },
    });
  },
}));
