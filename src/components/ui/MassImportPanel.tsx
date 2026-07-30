"use client";
import { useState, useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useImportStore, type ImportItem } from "@/lib/stores/importStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { extractExif } from "@/lib/utils/exif";
import { generateThumbnail } from "@/lib/utils/thumbnail";
import { geocodeLocationName } from "@/lib/geocode";
import Image from "next/image";
import type { Mem } from "@/lib/constants/defaults";
import { TypeIcon } from "@/lib/constants/type-icons";

const CloudImportPanel = lazy(() => import("./CloudImportPanel"));

interface Props {
  onClose: () => void;
  initialWingId?: string | null;
  initialRoomId?: string | null;
}

// ═══ Display type options ═══
// [value, labelKey] — the glyph column was dropped: native <option> elements
// cannot render SVG line-art, and OS color emoji broke the Tuscan glyph
// language, so the type select reads as plain text. The type’s Tuscan
// line-art icon is shown alongside via <TypeIcon> in the card row + thumbnail.
const DISPLAY_TYPES: [string, string][] = [
  ["photo", "typeFrame"], ["painting", "typePainting"],
  ["video", "typeScreen"], ["album", "typeAlbum"],
  ["orb", "typeOrb"], ["case", "typeVitrine"],
  ["audio", "typeAudio"], ["document", "typeDocument"],
];

/* ═══ Tuscan line-art icons (terracotta glyph #9A4F2A) — matches ImportHub ═══ */
// Atrium accent split: EMBER #B85C38 = interactive (buttons/active borders/CTAs),
// GLYPH #9A4F2A = at-rest terracotta (line-art strokes, quiet labels). Keep them
// distinct so the two oranges never drift into one another's role.
const MI_GLYPH = "#9A4F2A"; // Atrium token: terracotta glyph (at-rest)

const BoxGlyph = ({ size = 22, color = "#FCFAF5" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5v-9z" />
    <path d="M3 7.5L12 12l9-4.5M12 12v9" />
  </svg>
);

const DownloadGlyph = ({ size = 36, color = MI_GLYPH }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6v18M12 18l8 8 8-8" />
    <path d="M6 30v2a2 2 0 002 2h24a2 2 0 002-2v-2" />
  </svg>
);

const SparkGlyph = ({ size = 36, color = MI_GLYPH }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 5l3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9z" />
  </svg>
);

const ArrowRightGlyph = ({ size = 16, color = "#FCFAF5" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

const CheckCircleGlyph = ({ size = 48, color = "#56683C" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="24" cy="24" r="19" />
    <path d="M15 24l6 6 12-13" />
  </svg>
);

const ColumnsGlyph = ({ size = 16, color = "#FCFAF5" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 21V9l4-4 4 4v12M12 21V11l4-4 4 4v10M2 21h20" />
  </svg>
);

const ClipboardGlyph = ({ size = 24, color = MI_GLYPH }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="6" y="4" width="12" height="17" rx="2" />
    <rect x="9" y="2.5" width="6" height="3" rx="1" />
    <path d="M9 11h6M9 15h4" />
  </svg>
);

const FolderGlyph = ({ size = 16, color = MI_GLYPH }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);

const CloudGlyph = ({ size = 16, color = MI_GLYPH }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 18h10a4 4 0 000-8 5 5 0 00-9.5-1.2A3.5 3.5 0 007 18z" />
  </svg>
);

const CloseGlyph = ({ size = 18, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
);

const EditGlyph = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);
const CalendarGlyph = ({ size = 13, color = MI_GLYPH }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </svg>
);
const PinGlyph = ({ size = 13, color = MI_GLYPH }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
const CameraGlyph = ({ size = 13, color = MI_GLYPH }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

function formatBytes(b: number): string {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

// ── Date helpers for the editable ReviewCard date field ──
// A <input type="date"> speaks "yyyy-mm-dd" (local), while we store a full ISO
// timestamp on exif.dateTaken (also used verbatim as the memory's createdAt).
function toDateInputValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fromDateInputValue(value: string, prevIso?: string): string {
  if (!value) return prevIso || "";
  // Preserve the original time-of-day (if any) so we only edit the calendar date.
  const prev = prevIso ? new Date(prevIso) : null;
  const [y, m, d] = value.split("-").map(Number);
  const next = prev && !isNaN(prev.getTime()) ? new Date(prev) : new Date();
  next.setFullYear(y, (m || 1) - 1, d || 1);
  return next.toISOString();
}

const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

// WCAG AA compliant alternative to "#716A5E" on linen backgrounds
const MUTED_AA = "#716A5E"; // Atrium token: muted

function isFileTooLarge(file: File): boolean {
  const maxSize = file.type.startsWith("video/") ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  return file.size > maxSize;
}

// ═══ Main Panel ═══
export default function MassImportPanel({ onClose, initialWingId, initialRoomId }: Props) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("massImport");
  const { t: tc } = useTranslation("common");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const store = useImportStore();
  const addMemory = useMemoryStore((s) => s.addMemory);
  const { getWings, getWingRooms } = useRoomStore();
  const wings = getWings();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState<"review" | "accepted" | "rejected" | "all">("review");
  const [showCloud, setShowCloud] = useState(false);
  const [skippedOversized, setSkippedOversized] = useState(0);

  // Initialize targets from props
  useEffect(() => {
    if (initialWingId) store.setTarget(initialWingId, initialRoomId || null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke blob object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      for (const item of useImportStore.getState().items) {
        if (item.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
    };
  }, []);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const supported = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/") || f.type.startsWith("audio/") ||
        f.type.includes("pdf") || f.type.includes("document") || f.type.includes("word")
    );
    const oversized = supported.filter(isFileTooLarge);
    const arr = supported.filter((f) => !isFileTooLarge(f));
    if (oversized.length > 0) setSkippedOversized((prev) => prev + oversized.length);
    if (arr.length > 0) store.addFiles(arr);
  }, [store]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Processing pipeline ──
  const startProcessing = async () => {
    const items = store.items.filter((i) => i.status === "queued");
    if (items.length === 0) return;
    store.setStep("processing");
    store.setProgress({ total: items.length, processed: 0, errors: 0 });

    // Phase 1: Read files, extract EXIF, generate thumbnails
    for (const item of items) {
      try {
        store.updateItem(item.localId, { status: "reading" });

        // Read as dataUrl
        const maxLabel = item.file.type.startsWith("video/") ? "100 MB" : "50 MB";
        const fileTooLargeMsg = t("fileTooLarge", { size: (item.file.size / (1024 * 1024)).toFixed(1), max: maxLabel });
        const readErrorMsg = t("readError");
        const dataUrl = await readFileAsDataUrl(item.file, fileTooLargeMsg, readErrorMsg);
        const previewUrl = await generateThumbnail(item.file) || (item.file.type.startsWith("image/") ? URL.createObjectURL(item.file) : null);

        store.updateItem(item.localId, { status: "extracting", dataUrl, previewUrl });

        // Extract EXIF
        const exif = await extractExif(item.file);
        const updates: Partial<ImportItem> = { exif };
        if (exif?.lat && exif?.lng) {
          updates.confirmed = {
            ...useImportStore.getState().items.find((i) => i.localId === item.localId)!.confirmed,
            lat: exif.lat, lng: exif.lng,
          };
        }
        if (exif?.dateTaken) {
          // Use EXIF date for createdAt later
        }
        store.updateItem(item.localId, updates);
        store.setProgress({ processed: (useImportStore.getState().progress.processed || 0) + 1 });
      } catch (err: any) {
        store.updateItem(item.localId, { status: "error", error: err.message || t("failedToReadFile") });
        store.setProgress({ errors: (useImportStore.getState().progress.errors || 0) + 1 });
      }
    }

    // Phase 2: AI tagging (if AI mode + API key)
    const readyItems = useImportStore.getState().items.filter((i) => i.status === "extracting");
    if (store.mode === "ai") {
      // Batch into groups of 10
      for (let i = 0; i < readyItems.length; i += 10) {
        const batch = readyItems.slice(i, i + 10);
        for (const item of batch) store.updateItem(item.localId, { status: "tagging" });

        try {
          const wingsData = wings.map((w) => ({
            id: w.id, name: w.name, desc: w.desc,
            rooms: getWingRooms(w.id).map((r) => ({ id: r.id, name: r.name })),
          }));

          const res = await fetch("/api/ai-tag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: batch.map((item) => ({
                fileName: item.fileName,
                fileType: item.fileType,
                exif: item.exif,
                thumbnailBase64: item.previewUrl?.startsWith("data:") ? item.previewUrl : null,
              })),
              wings: wingsData,
            }),
          });

          if (res.ok) {
            const { suggestions } = await res.json();
            for (let j = 0; j < batch.length && j < suggestions.length; j++) {
              const s = suggestions[j];
              const needsReview = Math.random() < store.reviewSampleRate;
              store.updateItem(batch[j].localId, {
                aiSuggestions: s,
                confirmed: {
                  ...useImportStore.getState().items.find((it) => it.localId === batch[j].localId)!.confirmed,
                  title: s.title || batch[j].confirmed.title,
                  desc: s.desc || "",
                  type: (s.type === "painting" ? "photo" : s.type) || batch[j].confirmed.type,
                  wingId: s.wingId || batch[j].confirmed.wingId,
                  roomId: s.roomId || batch[j].confirmed.roomId,
                  locationName: s.locationName || "",
                },
                status: needsReview ? "ready" : "accepted",
                needsReview,
              });
            }
          } else {
            // AI failed — fall back to smart defaults
            for (const item of batch) {
              store.updateItem(item.localId, { status: "ready", needsReview: true });
            }
          }
        } catch {
          for (const item of batch) {
            store.updateItem(item.localId, { status: "ready", needsReview: true });
          }
        }
      }
    } else {
      // Manual mode or no API key — all go to ready, all need review
      // (needsReview:true so the default Review tab shows every processed item;
      // otherwise the manual pipeline lands on an empty Review tab).
      for (const item of readyItems) {
        store.updateItem(item.localId, { status: "ready", needsReview: true });
      }
    }

    // Mark remaining extracting items as ready
    for (const item of useImportStore.getState().items) {
      if (item.status === "extracting" || item.status === "tagging") {
        store.updateItem(item.localId, { status: "ready" });
      }
    }

    store.setStep("review");
  };

  // ── Commit ──
  const commitAll = async () => {
    store.setStep("committing");
    const accepted = useImportStore.getState().items.filter((i) => i.status === "accepted");
    store.setProgress({ total: accepted.length, committed: 0, errors: 0 });

    for (const item of accepted) {
      try {
        const hue = Math.floor(Math.random() * 360);
        const mem: Mem = {
          id: Date.now().toString() + "_" + item.localId,
          title: item.confirmed.title,
          hue,
          s: 45 + Math.floor(Math.random() * 15),
          l: 55 + Math.floor(Math.random() * 15),
          type: item.confirmed.type,
          desc: item.confirmed.desc,
          dataUrl: item.dataUrl || null,
          videoBlob: item.fileType.startsWith("video/"),
          createdAt: item.exif?.dateTaken || new Date().toISOString(),
          // Pass the generated downscaled thumbnail through so the Library wall
          // loads it instead of the full-res original. Only a data: URL is
          // uploadable by addMemory; a blob: preview fallback is skipped.
          ...(item.previewUrl?.startsWith("data:") ? { thumbnailUrl: item.previewUrl } : {}),
        };
        if (item.confirmed.lat !== null && item.confirmed.lng !== null) {
          mem.lat = item.confirmed.lat;
          mem.lng = item.confirmed.lng;
        }
        // Geocode location name if lat/lng not set
        if (item.confirmed.locationName && mem.lat === undefined && mem.lng === undefined) {
          const coords = await geocodeLocationName(item.confirmed.locationName);
          if (coords) { mem.lat = coords.lat; mem.lng = coords.lng; }
        }
        if (item.confirmed.locationName) mem.locationName = item.confirmed.locationName;

        await addMemory(item.confirmed.roomId, mem);
        store.updateItem(item.localId, { status: "committed" });
        store.setProgress({ committed: (useImportStore.getState().progress.committed || 0) + 1 });
      } catch (err: any) {
        store.updateItem(item.localId, { status: "error", error: err.message });
        store.setProgress({ errors: (useImportStore.getState().progress.errors || 0) + 1 });
      }
    }

    store.setStep("done");
  };

  const { step, items, mode, progress, targetWingId, targetRoomId } = store;
  const totalSize = items.reduce((n, i) => n + i.fileSizeBytes, 0);

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(64,59,54,0.55)", backdropFilter: "blur(10px)", zIndex: 60, animation: "fadeIn .2s ease", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@media(prefers-reduced-motion:reduce){[style*="fadeIn"],[style*="fadeUp"]{animation:none!important}[style*="transition"]{transition:none!important}}
[role="dialog"] :is(select,input,textarea,button,[role="button"]):focus-visible{outline:0.1875rem solid #D4AF37;outline-offset:0.1875rem}`}</style>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={(e) => e.stopPropagation()} style={{
        width: isMobile ? "100%" : "min(51.25rem, 94vw)",
        maxHeight: isMobile ? "100%" : "90vh",
        height: isMobile ? "100%" : undefined,
        overflow: "hidden", display: "flex", flexDirection: "column",
        background: `${T.color.linen}f8`, backdropFilter: "blur(20px)",
        borderRadius: isMobile ? 0 : "1rem", // Atrium token: card radius
        border: isMobile ? "none" : "0.0625rem solid #E3D6BC", // Atrium token: hairline
        boxShadow: isMobile ? "none" : "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token: S2
        animation: isMobile ? "fadeIn .2s ease" : "fadeUp .3s ease",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.5rem 1.75rem 0", flexShrink: 0,
          paddingTop: isMobile ? "max(1.5rem, env(safe-area-inset-top, 0px))" : undefined,
          paddingLeft: isMobile ? "max(1.75rem, env(safe-area-inset-left, 0px))" : undefined,
          paddingRight: isMobile ? "max(1.75rem, env(safe-area-inset-right, 0px))" : undefined,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", background: "linear-gradient(135deg, #B85C38, #9A4F2A)", display: "flex", alignItems: "center", justifyContent: "center" }}><BoxGlyph size={22} color="#FCFAF5" /></div>
              <div>
                <h3 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, color: "#403B36", margin: 0 }}>{t("heading")}</h3>
                <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", margin: "0.125rem 0 0" }}>
                  {step === "drop" && t("dropToBegin")}
                  {step === "processing" && t("processing", { processed: String(progress.processed), total: String(progress.total) })}
                  {step === "review" && t("reviewConfirm")}
                  {step === "committing" && t("committing", { committed: String(progress.committed), total: String(progress.total) })}
                  {step === "done" && t("importComplete")}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label={tc("close")} style={{ width: "2.75rem", height: "2.75rem", borderRadius: "1.375rem", border: "0.0625rem solid #E3D6BC", background: T.color.warmStone, color: "#716A5E", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><CloseGlyph size={16} /></button>
          </div>

          {/* Source toggle: Local / Cloud */}
          {step === "drop" && (
            <div role="tablist" style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem", background: T.color.warmStone, borderRadius: "0.625rem", padding: "0.1875rem", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <button role="tab" aria-selected={!showCloud} onClick={() => setShowCloud(false)} style={{
                flex: "1 0 auto", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "none",
                background: !showCloud ? T.color.white : "transparent",
                color: !showCloud ? "#403B36" : "#716A5E",
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: !showCloud ? 600 : 500, cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", minHeight: "2.75rem",
              }}>
                <FolderGlyph size={16} color={!showCloud ? "#403B36" : "#716A5E"} /> {t("localFiles")}
              </button>
              <button role="tab" aria-selected={showCloud} onClick={() => setShowCloud(true)} style={{
                flex: "1 0 auto", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "none",
                background: showCloud ? T.color.white : "transparent",
                color: showCloud ? "#403B36" : "#716A5E",
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: showCloud ? 600 : 500, cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", minHeight: "2.75rem",
              }}>
                <CloudGlyph size={16} color={showCloud ? "#403B36" : "#716A5E"} /> {t("importFromCloud")}
              </button>
            </div>
          )}

          {/* Step indicator */}
          {!showCloud && (
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem" }}>
              {(["drop", "processing", "review", "committing", "done"] as const).map((s, i) => (
                <div key={s} style={{
                  flex: 1, height: "0.1875rem", borderRadius: "0.125rem",
                  background: (["drop", "processing", "review", "committing", "done"].indexOf(step) >= i) ? "#B85C38" : "#E3D6BC", // Atrium token: ember / hairline
                  transition: "background .3s",
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Cloud Import Panel (replaces entire content area) */}
        {showCloud && step === "drop" ? (
          <Suspense fallback={
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem", fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED_AA, gap: "0.75rem" }}>
              <div aria-hidden="true" style={{
                width: "2rem", height: "2rem", borderRadius: "50%",
                border: "0.1875rem solid #E3D6BC", // Atrium token: hairline
                borderTopColor: "#B85C38", // Atrium token: ember
                animation: "massCloudSpin .7s linear infinite",
              }} />
              {t("loadingCloudImport")}
              <style>{`@keyframes massCloudSpin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){[style*="massCloudSpin"]{animation:none!important}}`}</style>
            </div>
          }>
            <CloudImportPanel onClose={onClose} embedded />
          </Suspense>
        ) : (
        /* Content area (scrollable) */
        <div className="mp-scroll" style={{
          flex: 1, overflow: "auto", padding: "0 1.75rem 1.5rem",
          paddingBottom: isMobile ? "max(1.5rem, env(safe-area-inset-bottom, 0px))" : undefined,
          paddingLeft: isMobile ? "max(1.75rem, env(safe-area-inset-left, 0px))" : undefined,
          paddingRight: isMobile ? "max(1.75rem, env(safe-area-inset-right, 0px))" : undefined,
        }}>

          {/* ════ STEP: DROP ════ */}
          {step === "drop" && <>
            {/* Mode selection */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginBottom: "1.25rem" }}>
              <button onClick={() => store.setMode("ai")} style={{
                padding: "1rem 0.875rem", borderRadius: "1rem", // Atrium token: card radius
                border: mode === "ai" ? "0.125rem solid #B85C38" : "0.0625rem solid #E3D6BC",
                background: mode === "ai" ? "#FBF2EC" : T.color.white, // Atrium token: terracotta tray
                cursor: "pointer", textAlign: "left",
              }}>
                <div style={{ marginBottom: "0.375rem" }}><SparkGlyph size={24} color={mode === "ai" ? "#9A4F2A" : "#716A5E"} /></div>
                <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: mode === "ai" ? "#9A4F2A" : "#403B36" }}>{t("aiAssisted")}</div>
                <div style={{ fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.6875rem", color: "#716A5E", lineHeight: 1.4, marginTop: "0.25rem" }}>{t("aiAssistedDesc")}</div>
              </button>
              <button onClick={() => store.setMode("manual")} style={{
                padding: "1rem 0.875rem", borderRadius: "1rem", // Atrium token: card radius
                border: mode === "manual" ? "0.125rem solid #B85C38" : "0.0625rem solid #E3D6BC",
                background: mode === "manual" ? "#FBF2EC" : T.color.white, // Atrium token: terracotta tray
                cursor: "pointer", textAlign: "left",
              }}>
                <div style={{ marginBottom: "0.375rem" }}><ClipboardGlyph size={24} color={mode === "manual" ? "#9A4F2A" : "#716A5E"} /></div>
                <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: mode === "manual" ? "#9A4F2A" : "#403B36" }}>{t("manual")}</div>
                <div style={{ fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.6875rem", color: "#716A5E", lineHeight: 1.4, marginTop: "0.25rem" }}>{t("manualDesc")}</div>
              </button>
            </div>

            {/* Target selection */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.625rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", color: "#716A5E", textTransform: "uppercase", display: "block", marginBottom: "0.375rem" }}>
                  {mode === "manual" ? t("targetWing") : t("defaultWingAi")}
                </label>
                <select value={targetWingId || ""} onChange={(e) => store.setTarget(e.target.value || null, null)}
                  style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "0.625rem", border: "0.0625rem solid #E3D6BC", background: T.color.white, fontFamily: T.font.body, fontSize: isMobile ? "1rem" : "0.8125rem", color: "#403B36", cursor: "pointer" }}>
                  <option value="">{t("selectWing")}</option>
                  {wings.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", color: "#716A5E", textTransform: "uppercase", display: "block", marginBottom: "0.375rem" }}>
                  {mode === "manual" ? t("targetRoom") : t("defaultRoomAi")}
                </label>
                <select value={targetRoomId || ""} onChange={(e) => store.setTarget(targetWingId, e.target.value || null)}
                  disabled={!targetWingId}
                  style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "0.625rem", border: "0.0625rem solid #E3D6BC", background: !targetWingId ? `${T.color.warmStone}` : T.color.white, fontFamily: T.font.body, fontSize: isMobile ? "1rem" : "0.8125rem", color: !targetWingId ? "#716A5E" : "#403B36", cursor: targetWingId ? "pointer" : "not-allowed" }}>
                  <option value="">{t("selectRoom")}</option>
                  {targetWingId && getWingRooms(targetWingId).map((r) => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
                </select>
              </div>
            </div>

            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
              aria-label={t("dropOrBrowse")}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `0.125rem dashed ${dragOver ? "#B85C38" : T.color.sandstone}`,
                borderRadius: "1rem", padding: items.length > 0 ? "1.25rem" : "2.5rem", textAlign: "center", cursor: "pointer",
                background: dragOver ? "#FBF2EC" : T.color.warmStone, // Atrium token: terracotta tray
                marginBottom: "1rem", transition: "all .2s",
              }}
            >
              <div style={{ marginBottom: "0.375rem", display: "flex", justifyContent: "center" }}>{dragOver ? <SparkGlyph size={36} color="#B85C38" /> : <DownloadGlyph size={36} />}</div>
              <p style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: "#403B36", margin: 0, fontWeight: 500 }}>
                {items.length > 0 ? t("dropMoreOrBrowse") : t("dropOrBrowse")}
              </p>
              <p style={{ fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.6875rem", color: "#716A5E", margin: "0.25rem 0 0" }}>
                {t("supportedTypes")}
              </p>
            </div>
            <input ref={fileRef} type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />

            {/* Oversized files warning */}
            {skippedOversized > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.625rem 0.875rem", borderRadius: "0.75rem", background: "#F7EEEA", border: "0.0625rem solid #EBD4D0", marginBottom: "0.75rem" }}> {/* Atrium: pre-mixed opaque state tint, no alpha bands */}
                <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#A63D3D", lineHeight: 1.5, flex: 1 }}>
                  {t("filesSkipped", { count: String(skippedOversized) })}
                </span>
                <button onClick={() => setSkippedOversized(0)} aria-label={tc("dismiss")} style={{ background: "none", border: "none", color: "#A63D3D", fontSize: "0.9375rem", cursor: "pointer", padding: "0.25rem", flexShrink: 0, minWidth: "2.75rem", minHeight: "2.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
              </div>
            )}

            {/* File list */}
            {items.length > 0 && <>
              <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", marginBottom: "0.5rem", display: "flex", justifyContent: "space-between" }}>
                <span>{t("fileCount", { count: String(items.length), size: formatBytes(totalSize) })}</span>
                <button onClick={() => store.reset()} style={{ background: "none", border: "none", color: "#9A4F2A", fontFamily: T.font.body, fontSize: "0.8125rem", cursor: "pointer", minHeight: "2.75rem", padding: "0.25rem 0.5rem" }}>{t("clearAll")}</button>
              </div>
              <div style={{ maxHeight: "12.5rem", overflowY: "auto", borderRadius: "0.75rem", border: "0.0625rem solid #E3D6BC", background: T.color.white }}>
                {items.map((item) => (
                  <div key={item.localId} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.75rem", borderBottom: "0.0625rem solid #E3D6BC" }}>
                    <div style={{ width: "2rem", height: "2rem", borderRadius: "0.375rem", background: T.color.warmStone, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0, minWidth: "2.75rem", minHeight: "2.75rem" }}>
                      <TypeIcon type={item.confirmed.type} size={18} color={"#9A4F2A"} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#403B36", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.fileName}</div>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" }}>{formatBytes(item.fileSizeBytes)}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); store.removeItem(item.localId); }}
                      aria-label={tc("remove")}
                      style={{ background: "none", border: "none", color: "#716A5E", fontSize: "0.9375rem", cursor: "pointer", padding: "0.25rem", minWidth: "2.75rem", minHeight: "2.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
                  </div>
                ))}
              </div>
            </>}

            {/* Start button */}
            {items.length > 0 && <button
              onClick={startProcessing}
              disabled={mode === "manual" && (!targetWingId || !targetRoomId)}
              style={{
                width: "100%", padding: "0.875rem", borderRadius: "0.75rem", border: "none", marginTop: "1rem",
                background: (mode === "manual" && (!targetWingId || !targetRoomId)) ? "#E3D6BC" : "linear-gradient(135deg, #B85C38, #9A4F2A)", // Atrium token: ember→glyph
                color: (mode === "manual" && (!targetWingId || !targetRoomId)) ? "#716A5E" : "#FCFAF5",
                fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, cursor: (mode === "manual" && (!targetWingId || !targetRoomId)) ? "default" : "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
              }}
            >
              {mode === "ai" ? t("processWithAi", { count: String(items.length) }) : t("processFiles", { count: String(items.length) })} <ArrowRightGlyph size={16} color={(mode === "manual" && (!targetWingId || !targetRoomId)) ? "#716A5E" : "#FCFAF5"} />
            </button>}
          </>}

          {/* ════ STEP: PROCESSING ════ */}
          {step === "processing" && <>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", marginBottom: "0.375rem" }}>
                <span>{t("processingFiles")}</span>
                <span>{progress.processed}/{progress.total}</span>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.total ? Math.round(((progress.processed + progress.errors) / progress.total) * 100) : 0} aria-label={t("processingFiles")} style={{ width: "100%", height: "0.5rem", borderRadius: "0.25rem", background: "#E3D6BC", overflow: "hidden" }}>
                <div style={{ width: `${progress.total ? ((progress.processed + progress.errors) / progress.total) * 100 : 0}%`, height: "100%", borderRadius: "0.25rem", background: "linear-gradient(90deg, #B85C38, #9A4F2A)", transition: "width .3s" }} />
              </div>
            </div>
            <div style={{ maxHeight: "25rem", overflowY: "auto" }}>
              {items.map((item) => (
                <div key={item.localId} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0", borderBottom: "0.0625rem solid #E3D6BC" }}>
                  <StatusBadge status={item.status} />
                  <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#403B36", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.fileName}</span>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" }}>{t(`status_${item.status}`) || item.status}</span>
                </div>
              ))}
            </div>
          </>}

          {/* ════ STEP: REVIEW ════ */}
          {step === "review" && <>
            {/* Tabs */}
            <div role="tablist" style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", background: T.color.warmStone, borderRadius: "0.625rem", padding: "0.1875rem" }}>
              {([
                ["review", t("tabReview", { count: String(items.filter((i) => i.status === "ready" && i.needsReview).length) })],
                ["accepted", t("tabAccepted", { count: String(items.filter((i) => i.status === "accepted").length) })],
                ["rejected", t("tabRejected", { count: String(items.filter((i) => i.status === "rejected").length) })],
                ["all", t("tabAll", { count: String(items.filter((i) => !["error", "committed"].includes(i.status)).length) })],
              ] as [typeof tab, string][]).map(([key, label]) => (
                <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} style={{
                  flex: 1, padding: "0.4375rem 0.5rem", borderRadius: "0.5rem", border: "none",
                  background: tab === key ? T.color.white : "transparent",
                  color: tab === key ? "#403B36" : "#716A5E",
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: tab === key ? 600 : 500, cursor: "pointer",
                  minHeight: "2.75rem",
                }}>{label}</button>
              ))}
            </div>

            {/* Batch actions */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <button onClick={() => store.acceptAll()} style={{
                padding: "0.5rem 0.875rem", borderRadius: "0.5rem", border: "0.0625rem solid #E3D6BC",
                background: T.color.white, fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: "#56683C", cursor: "pointer",
                minHeight: "2.75rem",
              }}>{t("acceptAllReady")}</button>
            </div>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "25rem", overflowY: "auto" }}>
              {filteredItems(items, tab).map((item) => (
                <ReviewCard key={item.localId} item={item} wings={wings} getWingRooms={getWingRooms} />
              ))}
              {filteredItems(items, tab).length === 0 && (
                <div style={{ textAlign: "center", padding: "2rem", fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" }}>
                  {t("noItemsInTab")}
                </div>
              )}
            </div>

            {/* Commit button */}
            {items.some((i) => i.status === "accepted") && (
              <button onClick={commitAll} style={{
                width: "100%", padding: "0.875rem", borderRadius: "0.75rem", border: "none", marginTop: "1rem",
                background: "linear-gradient(135deg, #B85C38, #9A4F2A)",
                color: "#FCFAF5", fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
              }}>
                {t("commitMemories", { count: String(items.filter((i) => i.status === "accepted").length) })} <ColumnsGlyph size={16} color="#FCFAF5" />
              </button>
            )}
          </>}

          {/* ════ STEP: COMMITTING ════ */}
          {step === "committing" && <>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", marginBottom: "0.375rem" }}>
                <span>{t("addingMemories")}</span>
                <span>{progress.committed}/{progress.total}</span>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.total ? Math.round((progress.committed / progress.total) * 100) : 0} aria-label={t("addingMemories")} style={{ width: "100%", height: "0.5rem", borderRadius: "0.25rem", background: "#E3D6BC", overflow: "hidden" }}>
                <div style={{ width: `${progress.total ? (progress.committed / progress.total) * 100 : 0}%`, height: "100%", borderRadius: "0.25rem", background: "linear-gradient(90deg, #56683C, #7A8C64)", transition: "width .3s" }} />
              </div>
            </div>
          </>}

          {/* ════ STEP: DONE ════ */}
          {step === "done" && <>
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "center" }}><CheckCircleGlyph size={48} color="#56683C" /></div>
              <h3 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, color: "#403B36", margin: "0 0 0.5rem" }}>{t("importCompleteHeading")}</h3>
              <p style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED_AA, margin: "0 0 0.25rem" }}>
                {t("memoriesAdded", { count: String(progress.committed) })}
              </p>
              {progress.errors > 0 && (() => {
                const errorItems = items.filter((i) => i.status === "error");
                const skippedItems = errorItems.filter((i) => {
                  const lower = (i.error || "").toLowerCase();
                  return lower.includes("already") || lower.includes("duplicate") || lower.includes("skipped");
                });
                const realErrors = errorItems.filter((i) => !skippedItems.includes(i));
                return (
                  <>
                    {skippedItems.length > 0 && (
                      <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" }}>
                        {t("itemsSkipped", { count: String(skippedItems.length) })}
                      </p>
                    )}
                    {realErrors.length > 0 && (
                      <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#A63D3D" }}>
                        {t("itemsHadErrors", { count: String(realErrors.length) })}
                      </p>
                    )}
                  </>
                );
              })()}
              <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center", marginTop: "1.25rem" }}>
                <button onClick={() => store.reset()} style={{
                  padding: "0.75rem 1.5rem", borderRadius: "0.75rem", border: "0.0625rem solid #E3D6BC",
                  background: T.color.white, fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: "#403B36", cursor: "pointer", minHeight: "2.75rem",
                }}>{t("importMore")}</button>
                <button onClick={onClose} style={{
                  padding: "0.75rem 1.5rem", borderRadius: "0.75rem", border: "none",
                  background: "linear-gradient(135deg, #B85C38, #9A4F2A)",
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#FCFAF5", cursor: "pointer", minHeight: "2.75rem",
                }}>{t("close")}</button>
              </div>
            </div>
          </>}
        </div>
        )}
      </div>
    </div>
  );
}

// ═══ Sub-components ═══

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation("massImport");
  const colors: Record<string, string> = {
    queued: T.color.sandstone, reading: "#9A4F2A", extracting: "#9A4F2A", // Atrium token: glyph
    tagging: "#9A4F2A", ready: "#B85C38", accepted: "#56683C", // Atrium tokens: ember / sage
    rejected: "#A63D3D", committed: "#56683C", error: "#A63D3D",
  };
  // Atrium: pre-mixed opaque badge fills (state color at ~19% over cream), no alpha bands
  const fills: Record<string, string> = {
    queued: "#F5F1EA", ready: "#EFDCD2", accepted: "#DDDFD2",
    rejected: "#ECD6D2", committed: "#DDDFD2", error: "#ECD6D2",
  };
  const isSpinning = ["reading", "extracting", "tagging"].includes(status);
  return (
    <div aria-label={t(`status_${status}`)} style={{
      width: "1.25rem", height: "1.25rem", borderRadius: "0.625rem", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: isSpinning ? `0.125rem solid ${colors[status] || "#716A5E"}` : "none",
      borderTopColor: isSpinning ? "transparent" : undefined,
      animation: isSpinning ? "spin .6s linear infinite" : undefined,
      background: isSpinning ? "transparent" : (colors[status] || T.color.sandstone) + "30",
      color: colors[status] || "#716A5E", fontSize: "0.6875rem", // Atrium token: overline (smallest ramp step)
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce) { .indeterminate-bar, [style*="animation"] { animation: none !important; } }`}</style>
      {!isSpinning && (status === "accepted" || status === "committed" ? "\u2713" : status === "rejected" ? "\u2715" : status === "error" ? "!" : "\u2022")}
    </div>
  );
}

function ReviewCard({ item, wings, getWingRooms }: {
  item: ImportItem;
  wings: Array<{ id: string; name: string; icon: string; accent: string }>;
  getWingRooms: (wingId: string) => Array<{ id: string; name: string; icon: string }>;
}) {
  const store = useImportStore();
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation("massImport");

  const accent = wings.find((w) => w.id === item.confirmed.wingId)?.accent || T.color.terracotta;

  return (
    <div style={{
      background: T.color.white, borderRadius: "1rem", border: `0.0625rem solid ${item.status === "accepted" ? "#DBDDD0" : item.status === "rejected" ? "#EBD4D0" : "#E3D6BC"}`, // Atrium: pre-mixed opaque state tints
      padding: "0.75rem 0.875rem", transition: "all 0.2s ease",
      opacity: item.status === "rejected" ? 0.5 : 1,
    }}>
      <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
        {/* Thumbnail */}
        <div style={{
          width: "3rem", height: "3rem", borderRadius: "0.5rem", flexShrink: 0, overflow: "hidden",
          background: T.color.warmStone, display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
        }}>
          {item.previewUrl ? (
            <Image src={item.previewUrl} alt="" fill sizes="48px" style={{ objectFit: "cover" }} unoptimized />
          ) : (
            <TypeIcon type={item.confirmed.type} size={22} color={"#9A4F2A"} />
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: "#403B36", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.confirmed.title}
          </div>
          <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", display: "flex", gap: "0.5rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.1875rem" }}><TypeIcon type={item.confirmed.type} size={12} color={"#716A5E"} /> {item.confirmed.type}</span>
            {item.confirmed.wingId && <span>{"\u2192"} {wings.find((w) => w.id === item.confirmed.wingId)?.icon} {getWingRooms(item.confirmed.wingId).find((r) => r.id === item.confirmed.roomId)?.name || "?"}</span>}
            {item.aiSuggestions && <span style={{ color: "#9A4F2A" }}>{Math.round(item.aiSuggestions.confidence * 100)}% AI</span>}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
          <button onClick={() => setExpanded(!expanded)} aria-label={t("editItem")} style={{
            width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", border: "0.0625rem solid #E3D6BC",
            background: T.color.warmStone, fontSize: "0.6875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#716A5E",
          }}><EditGlyph size={16} color="#716A5E" /></button>
          {item.status !== "accepted" && <button onClick={() => store.acceptItem(item.localId)} aria-label={t("acceptItem")} style={{
            width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", border: "0.0625rem solid #DBDDD0", // Atrium: pre-mixed sage tint
            background: "#F2F1E9", fontSize: "0.6875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#56683C",
          }}>{"\u2713"}</button>}
          {item.status !== "rejected" && <button onClick={() => store.rejectItem(item.localId)} aria-label={t("rejectItem")} style={{
            width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", border: "0.0625rem solid #EBD4D0", // Atrium: pre-mixed warning tint
            background: "#F7EEEA", fontSize: "0.6875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#A63D3D",
          }}>{"\u2715"}</button>}
        </div>
      </div>

      {/* Expanded edit area */}
      {expanded && (
        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "0.0625rem solid #E3D6BC" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginBottom: "0.625rem" }}>
            <div>
              <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", color: "#716A5E", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{t("title")}</label>
              <input value={item.confirmed.title} onChange={(e) => store.updateConfirmed(item.localId, { title: e.target.value })}
                style={{ width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: "0.0625rem solid #E3D6BC", background: T.color.white, fontFamily: T.font.body, fontSize: "1rem", color: "#403B36", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", color: "#716A5E", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{t("location")}</label>
              <input value={item.confirmed.locationName} onChange={(e) => store.updateConfirmed(item.localId, { locationName: e.target.value })} placeholder={t("locationPlaceholder")}
                style={{ width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: "0.0625rem solid #E3D6BC", background: T.color.white, fontFamily: T.font.body, fontSize: "1rem", color: "#403B36", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ marginBottom: "0.625rem" }}>
            <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", color: "#716A5E", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{t("description")}</label>
            <textarea value={item.confirmed.desc} onChange={(e) => store.updateConfirmed(item.localId, { desc: e.target.value })} rows={2} placeholder={t("descriptionPlaceholder")}
              style={{ width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: "0.0625rem solid #E3D6BC", background: T.color.white, fontFamily: T.font.body, fontSize: "1rem", color: "#403B36", boxSizing: "border-box", resize: "none" }} />
          </div>
          {/* Editable date — resolves to the memory's createdAt at commit time.
              Pre-filled from EXIF dateTaken when present so users can correct a
              wrong or missing capture date before committing. Persisted onto
              item.exif.dateTaken via the store's public updateItem(). */}
          <div style={{ marginBottom: "0.625rem" }}>
            <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", color: "#716A5E", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{t("dateTaken")}</label>
            <input
              type="date"
              value={toDateInputValue(item.exif?.dateTaken)}
              max={toDateInputValue(new Date().toISOString())}
              onChange={(e) => {
                const iso = fromDateInputValue(e.target.value, item.exif?.dateTaken);
                store.updateItem(item.localId, { exif: { ...(item.exif || {}), dateTaken: iso } });
              }}
              aria-label={t("dateTaken")}
              style={{ width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: "0.0625rem solid #E3D6BC", background: T.color.white, fontFamily: T.font.body, fontSize: "1rem", color: "#403B36", boxSizing: "border-box", cursor: "pointer" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.625rem" }}>
            <div>
              <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", color: "#716A5E", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{t("type")}</label>
              <select value={item.confirmed.type} onChange={(e) => store.updateConfirmed(item.localId, { type: e.target.value })}
                style={{ width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: "0.0625rem solid #E3D6BC", background: T.color.white, fontFamily: T.font.body, fontSize: isMobile ? "1rem" : "0.8125rem", color: "#403B36", cursor: "pointer" }}>
                {DISPLAY_TYPES.map(([v, labelKey]) => <option key={v} value={v}>{t(labelKey)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", color: "#716A5E", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{t("wing")}</label>
              <select value={item.confirmed.wingId} onChange={(e) => {
                const rooms = getWingRooms(e.target.value);
                store.updateConfirmed(item.localId, { wingId: e.target.value, roomId: rooms[0]?.id || "" });
              }}
                style={{ width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: "0.0625rem solid #E3D6BC", background: T.color.white, fontFamily: T.font.body, fontSize: isMobile ? "1rem" : "0.8125rem", color: "#403B36", cursor: "pointer" }}>
                <option value="">—</option>
                {wings.map((w) => <option key={w.id} value={w.id}>{w.icon} {w.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.12em", color: "#716A5E", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>{t("room")}</label>
              <select value={item.confirmed.roomId} onChange={(e) => store.updateConfirmed(item.localId, { roomId: e.target.value })}
                disabled={!item.confirmed.wingId}
                style={{ width: "100%", padding: "0.5rem 0.625rem", borderRadius: "0.5rem", border: "0.0625rem solid #E3D6BC", background: !item.confirmed.wingId ? T.color.warmStone : T.color.white, fontFamily: T.font.body, fontSize: isMobile ? "1rem" : "0.8125rem", color: !item.confirmed.wingId ? "#716A5E" : "#403B36", cursor: item.confirmed.wingId ? "pointer" : "not-allowed" }}>
                <option value="">—</option>
                {item.confirmed.wingId && getWingRooms(item.confirmed.wingId).map((r) => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
              </select>
            </div>
          </div>
          {item.exif && (item.exif.dateTaken || item.exif.lat) && (
            <div style={{ marginTop: "0.5rem", fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", display: "flex", gap: "0.75rem" }}>
              {item.exif.dateTaken && <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><CalendarGlyph size={13} /> {new Date(item.exif.dateTaken).toLocaleDateString()}</span>}
              {item.exif.lat && item.exif.lng && <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><PinGlyph size={13} /> {item.exif.lat.toFixed(4)}, {item.exif.lng.toFixed(4)}</span>}
              {item.exif.cameraMake && <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}><CameraGlyph size={13} /> {item.exif.cameraMake} {item.exif.cameraModel || ""}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function filteredItems(items: ImportItem[], tab: string): ImportItem[] {
  switch (tab) {
    case "review": return items.filter((i) => i.status === "ready" && i.needsReview);
    case "accepted": return items.filter((i) => i.status === "accepted");
    case "rejected": return items.filter((i) => i.status === "rejected");
    default: return items.filter((i) => !["error", "committed"].includes(i.status));
  }
}

function readFileAsDataUrl(file: File, fileTooLargeMsg: string, readErrorMsg: string): Promise<string> {
  if (isFileTooLarge(file)) {
    return Promise.reject(new Error(fileTooLargeMsg));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(readErrorMsg));
    reader.readAsDataURL(file);
  });
}
