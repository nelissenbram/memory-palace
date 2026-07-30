"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useRoomStore } from "@/lib/stores/roomStore";
import { translateWingName, translateRoomName } from "@/lib/constants/wings";
import { isNative } from "@/lib/native/platform";

/* ═══════════════════════════════════════════════════════
   SVG Icons — Roman / Tuscan style line-art
   ═══════════════════════════════════════════════════════ */

const DropZoneIcon = () => (
  <svg width="2.5rem" height="2.5rem" viewBox="0 0 40 40" fill="none" stroke="#9A4F2A" /* Atrium token: terracotta glyph */ strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="8" width="32" height="24" rx="3" />
    <path d="M20 14v12M14 20l6 6 6-6" />
    <path d="M4 12l16-6 16 6" strokeDasharray="2 2" opacity="0.5" />
  </svg>
);

const ComputerIcon = () => (
  <svg width="2.5rem" height="2.5rem" viewBox="0 0 40 40" fill="none" stroke="#9A4F2A" /* Atrium token: terracotta glyph */ strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="6" width="28" height="20" rx="2" />
    <path d="M14 26v4h12v-4" />
    <path d="M10 30h20" />
    <path d="M16 14h8M20 12v6" />
  </svg>
);

const LinkIcon = () => (
  <svg width="2.5rem" height="2.5rem" viewBox="0 0 40 40" fill="none" stroke="#9A4F2A" /* Atrium token: terracotta glyph */ strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 23a6 6 0 008.5.6l4-4a6 6 0 00-8.5-8.5l-2 2" />
    <path d="M23 17a6 6 0 00-8.5-.6l-4 4a6 6 0 008.5 8.5l2-2" />
  </svg>
);

const CloudIcon = () => (
  <svg width="2.5rem" height="2.5rem" viewBox="0 0 40 40" fill="none" stroke="#9A4F2A" /* Atrium token: terracotta glyph */ strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 28h16a6 6 0 000-12 8 8 0 00-15-2 6 6 0 00-1 12" />
    <path d="M20 20v8M17 25l3 3 3-3" />
  </svg>
);

const ClipboardIcon = () => (
  <svg width="2.5rem" height="2.5rem" viewBox="0 0 40 40" fill="none" stroke="#9A4F2A" /* Atrium token: terracotta glyph */ strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="10" y="8" width="20" height="26" rx="2" />
    <path d="M16 8V6a4 4 0 018 0v2" />
    <rect x="15" y="5" width="10" height="4" rx="1" />
    <path d="M15 18h10M15 22h6" />
  </svg>
);

const CloseIcon = () => (
  <svg width="1.25rem" height="1.25rem" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
);

const TrashIcon = () => (
  <svg width="0.875rem" height="0.875rem" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" />
  </svg>
);

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */

export interface QueuedFile {
  id: string;
  file?: File;
  url?: string;
  name: string;
  size: number;
  type: string;
  previewUrl: string | null;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
}

interface ImportHubProps {
  onClose: () => void;
  onImportFiles: (files: QueuedFile[], roomId?: string) => Promise<void> | void;
  /** roomId = the Destination selector's choice, so cloud imports land where the user aimed */
  onOpenCloudProvider: (provider: string, roomId?: string | null) => void;
  initialRoomId?: string | null;
  /** When true, hide wing/room selectors — used in onboarding */
  lockRoom?: boolean;
}

/* ═══════════════════════════════════════════════════════
   Accepted file types
   ═══════════════════════════════════════════════════════ */

const ACCEPT_IMAGES = ".jpg,.jpeg,.png,.webp,.heic,.heif";
const ACCEPT_VIDEO = ".mp4,.mov,.webm";
const ACCEPT_AUDIO = ".mp3,.wav,.m4a";
const ACCEPT_ALL = [ACCEPT_IMAGES, ACCEPT_VIDEO, ACCEPT_AUDIO].join(",");

const ACCEPT_MIME_RE = /^(image\/(jpeg|jpg|png|webp|heic|heif)|video\/(mp4|quicktime|webm|3gpp)|audio\/(mpeg|wav|mp4|x-m4a|aac|ogg))$/i;
const ACCEPT_EXT_RE = /\.(jpe?g|png|webp|heic|heif|mp4|mov|webm|mp3|wav|m4a|3gp|aac|ogg)$/i;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function makeId() {
  return `imp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ═══════════════════════════════════════════════════════
   Cloud provider data
   ═══════════════════════════════════════════════════════ */

// Disabled providers are faded out — to be reactivated later
const DISABLED_PROVIDERS = new Set<string>([]);

const CLOUD_PROVIDERS = [
  { key: "google_photos", labelKey: "googlePhotos", icon: (
    <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none"><path d="M12 7.5V1.5A4.5 4.5 0 007.5 6v1.5H12z" fill="#EA4335"/><path d="M16.5 12H22.5A4.5 4.5 0 0018 7.5H16.5V12z" fill="#4285F4"/><path d="M12 16.5V22.5A4.5 4.5 0 0016.5 18V16.5H12z" fill="#34A853"/><path d="M7.5 12H1.5A4.5 4.5 0 006 16.5H7.5V12z" fill="#FBBC05"/></svg>
  )},
  { key: "onedrive", labelKey: "onedrive", icon: (
    <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none"><path d="M9 17h10a4 4 0 000-8 5 5 0 00-9.5-1A4 4 0 005 12.5 3.5 3.5 0 005 19" stroke="#0078D4" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
  )},
  { key: "dropbox", labelKey: "dropbox", icon: (
    <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none"><path d="M12 2L6 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4z" fill="#0061FE"/><path d="M6 6l6 4-6 4" fill="#0061FE" opacity="0.7"/><path d="M18 6l-6 4 6 4" fill="#0061FE" opacity="0.7"/></svg>
  )},
];

/* ═══════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════ */

export default function ImportHub({ onClose, onImportFiles, onOpenCloudProvider, initialRoomId, lockRoom = false }: ImportHubProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { t: tWings } = useTranslation("wings");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const roomStore = useRoomStore();
  const allWings = roomStore.getWings();

  // Initialize wing/room selection from the initial room (if provided)
  const initialWingId = (() => {
    if (!initialRoomId) return allWings[0]?.id || "";
    for (const w of allWings) {
      if (roomStore.getWingRooms(w.id).some((r) => r.id === initialRoomId)) return w.id;
    }
    return allWings[0]?.id || "";
  })();
  const [targetWingId, setTargetWingId] = useState<string>(initialWingId);
  const [targetRoomId, setTargetRoomId] = useState<string>(initialRoomId || "");
  const targetRooms = roomStore.getWingRooms(targetWingId);
  // If no room yet selected, default to the first in the wing
  useEffect(() => {
    if (!targetRoomId && targetRooms.length > 0) setTargetRoomId(targetRooms[0].id);
    else if (targetRoomId && !targetRooms.some((r) => r.id === targetRoomId)) {
      setTargetRoomId(targetRooms[0]?.id || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetWingId]);

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  // Only the file count is knowable on dragenter (dataTransfer.files is empty
  // until drop), so we don't track a bogus size here.
  const [dragFileInfo, setDragFileInfo] = useState<{ count: number } | null>(null);
  const [clipboardAvailable, setClipboardAvailable] = useState(false);
  const [, setActiveSection] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  /* Detect clipboard image availability */
  useEffect(() => {
    async function checkClipboard() {
      try {
        if (navigator.clipboard && typeof navigator.clipboard.read === "function") {
          setClipboardAvailable(true);
        }
      } catch {
        /* clipboard API not available */
      }
    }
    checkClipboard();
  }, []);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  /* ── helpers ────────────────────────────── */

  const fileToQueued = useCallback((file: File): QueuedFile => {
    // Detect image by MIME or extension (iOS may report empty type for HEIC)
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(file.name);
    const previewUrl = isImage ? URL.createObjectURL(file) : null;
    // Infer MIME type from extension if browser didn't set one
    let fileType = file.type;
    if (!fileType) {
      if (/\.(jpe?g)$/i.test(file.name)) fileType = "image/jpeg";
      else if (/\.png$/i.test(file.name)) fileType = "image/png";
      else if (/\.webp$/i.test(file.name)) fileType = "image/webp";
      else if (/\.heic$/i.test(file.name)) fileType = "image/heic";
      else if (/\.(mp4)$/i.test(file.name)) fileType = "video/mp4";
      else if (/\.(mov)$/i.test(file.name)) fileType = "video/quicktime";
      else if (/\.(mp3)$/i.test(file.name)) fileType = "audio/mpeg";
      else if (/\.(wav)$/i.test(file.name)) fileType = "audio/wav";
      else if (/\.(m4a)$/i.test(file.name)) fileType = "audio/mp4";
    }
    return {
      id: makeId(),
      file,
      name: file.name,
      size: file.size,
      type: fileType,
      previewUrl,
      status: "queued",
      progress: 0,
    };
  }, []);

  const addFiles = useCallback((files: File[]) => {
    // Accept by MIME type or by file extension (iOS may report empty/non-standard types)
    const valid = files.filter(f => ACCEPT_MIME_RE.test(f.type) || ACCEPT_EXT_RE.test(f.name));
    if (valid.length === 0) return;
    setQueue(prev => [...prev, ...valid.map(fileToQueued)]);
    setActiveSection(null);
  }, [fileToQueued]);

  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => {
      const item = prev.find(q => q.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(q => q.id !== id);
    });
  }, []);

  const clearQueue = useCallback(() => {
    queue.forEach(q => { if (q.previewUrl) URL.revokeObjectURL(q.previewUrl); });
    setQueue([]);
  }, [queue]);

  /* ── Drag & Drop ───────────────────────── */

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
    if (e.dataTransfer.items) {
      let count = 0;
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].kind === "file") {
          count++;
        }
      }
      setDragFileInfo({ count });
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {
      setDragOver(false);
      setDragFileInfo(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    setDragFileInfo(null);
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }, [addFiles]);

  /* ── File picker ───────────────────────── */

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [addFiles]);

  /* ── Clipboard paste ───────────────────── */

  const handleClipboardPaste = useCallback(async () => {
    try {
      if (!navigator.clipboard?.read) {
        alert(t("importClipboardUnsupported"));
        return;
      }
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const ext = type.split("/")[1]?.split(";")[0] || "png";
            const file = new File([blob], `clipboard-${Date.now()}.${ext}`, { type });
            addFiles([file]);
            return;
          }
        }
      }
      alert(t("importClipboardEmpty"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("importClipboardDenied");
      alert(`${t("importClipboardError")}: ${msg}`);
    }
  }, [addFiles, t]);

  /* ── Global paste listener ─────────────── */

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (e.clipboardData?.files?.length) {
        addFiles(Array.from(e.clipboardData.files));
      }
    };
    window.addEventListener("paste", handler);
    return () => window.removeEventListener("paste", handler);
  }, [addFiles]);

  /* ── Import all ────────────────────────── */

  const handleImportAll = useCallback(async () => {
    if (queue.length === 0) return;
    if (!targetRoomId) return;
    setImporting(true);
    setImportError(null);
    try {
      await onImportFiles(queue, targetRoomId);
      // Only clear the queue and close on success — a failed import must keep
      // the user's queue intact so they can retry.
      clearQueue();
      setImporting(false);
      onClose();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : t("importFailedRetry"));
      setImporting(false);
    }
  }, [queue, onImportFiles, clearQueue, onClose, targetRoomId, t]);

  /* ── Total queue stats ─────────────────── */

  const totalSize = queue.reduce((s, q) => s + q.size, 0);

  /* ═══════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════ */

  const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: isMobile ? "0.25rem" : "0.5rem",
    padding: isMobile ? "0.75rem 0.625rem" : "1.25rem 1rem",
    borderRadius: "0.75rem",
    border: "0.0625rem solid #E3D6BC", /* Atrium token: hairline */
    background: T.color.linen,
    cursor: "pointer",
    transition: "all 0.25s ease",
    textAlign: "center",
    minHeight: isMobile ? "auto" : "7rem",
    justifyContent: "center",
  };

  const cardHover = (e: React.MouseEvent, enter: boolean) => {
    const el = e.currentTarget as HTMLElement;
    if (enter) {
      el.style.background = T.color.white;
      el.style.borderColor = "#E3D6BC"; /* Atrium token: hairline */
      el.style.transform = "translateY(-0.1875rem)";
      el.style.boxShadow = "0 0.25rem 1rem rgba(64,59,54,0.07)"; /* Atrium S1 */
    } else {
      el.style.background = T.color.linen;
      el.style.borderColor = "#E3D6BC";
      el.style.transform = "none";
      el.style.boxShadow = "none";
    }
  };

  return (
    <>
      {/* ── Keyframes ──────────────────────── */}
      <style>{`
        @keyframes impHubFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes impHubSlideUp {
          from { opacity: 0; transform: translateY(1.5rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .imp-hub-anim { animation: none !important; transition: none !important; }
        }
        .imp-hub-focus:focus-visible { outline: 0.1875rem solid #D4AF37; /* Atrium token: gold focus ring */ outline-offset: 0.1875rem; }
      `}</style>

      {/* ── Backdrop ───────────────────────── */}
      <div
        onClick={onClose}
        className="imp-hub-anim"
        style={{
          position: "fixed", inset: 0, zIndex: 8000,
          background: "rgba(64,59,54,0.55)", /* Atrium token: warm ink scrim */
          backdropFilter: "blur(0.5rem)",
          WebkitBackdropFilter: "blur(0.5rem)",
          animation: "impHubFadeIn 0.2s ease both",
        }}
      />

      {/* ── Modal ──────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("importHubTitle")}
        style={{
          position: "fixed", inset: 0, zIndex: 8001,
          display: "flex", alignItems: "center", justifyContent: "center",
          paddingTop: isMobile ? `max(1rem, env(safe-area-inset-top, 0px))` : "2rem",
          paddingBottom: isMobile ? `max(1rem, env(safe-area-inset-bottom, 0px))` : "2rem",
          paddingLeft: isMobile ? `max(1rem, env(safe-area-inset-left, 0px))` : "2rem",
          paddingRight: isMobile ? `max(1rem, env(safe-area-inset-right, 0px))` : "2rem",
          pointerEvents: "none",
        }}
      >
        <div
          ref={containerRef}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          className="mp-scroll imp-hub-anim"
          style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: "40rem",
            maxHeight: "90vh",
            overflow: "auto",
            background: T.color.linen,
            borderRadius: "1rem",
            border: "0.0625rem solid #E3D6BC", /* Atrium token: hairline */
            boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", /* Atrium S2 */
            animation: "impHubSlideUp 0.3s ease both",
          }}
        >
          {/* ── Header ─────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: isMobile ? "0.75rem 1rem" : "1.25rem 1.75rem",
            borderBottom: "0.0625rem solid #E3D6BC", /* Atrium token: hairline */
          }}>
            <div>
              <h2 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.1875rem" : "1.375rem", fontWeight: 600,
                color: "#403B36", /* Atrium ink */ margin: 0, letterSpacing: "0.01em",
              }}>
                {t("importHubTitle")}
              </h2>
              {!isMobile && <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", /* Atrium muted */
                margin: "0.25rem 0 0", lineHeight: 1.4,
              }}>
                {t("importHubSubtitle")}
              </p>}
            </div>
            <button
              onClick={onClose}
              aria-label={tc("close")}
              className="imp-hub-anim imp-hub-focus"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#716A5E", /* Atrium muted */ padding: "0.25rem",
                borderRadius: "0.375rem", transition: "color 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
                minWidth: "2.75rem", minHeight: "2.75rem",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#403B36"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#716A5E"; }}
            >
              <CloseIcon />
            </button>
          </div>

          <div style={{ padding: isMobile ? "0.75rem 1rem" : "1.5rem 1.75rem" }}>

            {/* ═══ DESTINATION SELECTOR ═══ */}
            {!lockRoom && <div style={{
              display: "flex", gap: isMobile ? "0.75rem" : "1rem",
              marginBottom: isMobile ? "1rem" : "1.5rem",
              flexDirection: isMobile ? "column" : "row",
              padding: isMobile ? "0.875rem 1rem" : "1rem 1.25rem",
              background: T.color.cream,
              borderRadius: "0.75rem",
              border: "0.0625rem solid #E3D6BC", /* Atrium token: hairline */
            }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: "block", fontFamily: T.font.display,
                  fontSize: "0.8125rem",
                  fontWeight: 600, color: "#403B36", /* Atrium ink */
                  marginBottom: "0.375rem",
                }}>{t("importTargetWing")}</label>
                <select
                  value={targetWingId}
                  onChange={(e) => setTargetWingId(e.target.value)}
                  className="imp-hub-focus"
                  style={{
                    width: "100%",
                    padding: isMobile ? "0.75rem 0.875rem" : "0.625rem 0.875rem",
                    borderRadius: "0.75rem",
                    border: "0.0625rem solid #E3D6BC", /* Atrium token: hairline */
                    background: T.color.white,
                    fontFamily: T.font.body,
                    fontSize: isMobile ? "1rem" : "0.9375rem",
                    color: "#403B36", /* Atrium ink */
                    cursor: "pointer",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none' stroke='%23716A5E' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M1 1l5 5 5-5'/></svg>")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.875rem center",
                    paddingRight: "2rem",
                  }}
                >
                  {allWings.map((w) => (
                    <option key={w.id} value={w.id}>{translateWingName(w, tWings) || w.id}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: "block", fontFamily: T.font.display,
                  fontSize: "0.8125rem",
                  fontWeight: 600, color: "#403B36", /* Atrium ink */
                  marginBottom: "0.375rem",
                }}>{t("importTargetRoom")}</label>
                <select
                  value={targetRoomId}
                  onChange={(e) => setTargetRoomId(e.target.value)}
                  className="imp-hub-focus"
                  style={{
                    width: "100%",
                    padding: isMobile ? "0.75rem 0.875rem" : "0.625rem 0.875rem",
                    borderRadius: "0.75rem",
                    border: "0.0625rem solid #E3D6BC", /* Atrium token: hairline */
                    background: T.color.white,
                    fontFamily: T.font.body,
                    fontSize: isMobile ? "1rem" : "0.9375rem",
                    color: "#403B36", /* Atrium ink */
                    cursor: "pointer",
                    appearance: "none",
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none' stroke='%23716A5E' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M1 1l5 5 5-5'/></svg>")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.875rem center",
                    paddingRight: "2rem",
                  }}
                >
                  {targetRooms.map((r) => (
                    <option key={r.id} value={r.id}>{translateRoomName(r, tWings) || r.id}</option>
                  ))}
                </select>
              </div>
            </div>}

            {/* ═══ A. DRAG & DROP ZONE (desktop only — mobile uses file picker directly) ═══ */}
            {!isMobile && (
            <div
              ref={dropRef}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="imp-hub-anim"
              style={{
                padding: "1.75rem 1rem",
                borderRadius: "0.75rem",
                border: `0.125rem dashed ${dragOver ? "#B85C38" : "#E3D6BC"}`, /* Atrium ember / hairline */
                background: dragOver ? "rgba(184,92,56,0.05)" : "transparent",
                textAlign: "center",
                cursor: "default",
                transition: "border-color 0.25s, background 0.25s",
                animation: "none",
                marginBottom: "1.25rem",
              }}
            >
              <DropZoneIcon />
              <p className="imp-hub-anim" style={{
                fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
                color: dragOver ? "#B85C38" : "#403B36", /* Atrium ember / ink */
                margin: "0.625rem 0 0.25rem",
                transition: "color 0.25s",
              }}>
                {t("importDropTitle")}
              </p>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", /* Atrium muted */ margin: 0,
              }}>
                {t("importDropHint")}
              </p>
              {dragOver && dragFileInfo && dragFileInfo.count > 0 && (
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem",
                  color: "#B85C38", /* Atrium ember */ fontWeight: 600,
                  margin: "0.5rem 0 0",
                }}>
                  {t("importDropCount", { count: String(dragFileInfo.count) })}
                </p>
              )}
            </div>
            )}

            {/* ═══ OPTION CARDS GRID ═══ */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "1fr 1fr 1fr",
              gap: isMobile ? "0.5rem" : "0.75rem",
              marginBottom: isMobile ? "0.75rem" : "1.25rem",
            }}>
              {/* B. Choose from Device */}
              <div
                role="button"
                tabIndex={0}
                aria-label={t("importFromComputer")}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
                className="imp-hub-anim imp-hub-focus"
                style={cardStyle}
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={e => cardHover(e, true)}
                onMouseLeave={e => cardHover(e, false)}
              >
                <div style={{ transform: isMobile ? "scale(0.7)" : "none", lineHeight: 0 }}><ComputerIcon /></div>
                <span style={{
                  fontFamily: T.font.display, fontSize: isMobile ? "0.8125rem" : "0.9375rem", fontWeight: 600, /* Atrium meta/body */
                  color: "#403B36", /* Atrium ink */ lineHeight: 1.3,
                }}>
                  {t("importFromComputer")}
                </span>
                {!isMobile && <span style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", /* Atrium meta */ color: "#716A5E", /* Atrium muted */ lineHeight: 1.3,
                }}>
                  {t("importFromComputerDesc")}
                </span>}
              </div>

              {/* E. From Clipboard */}
              {clipboardAvailable && (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={t("importClipboard")}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClipboardPaste(); } }}
                  className="imp-hub-anim imp-hub-focus"
                  style={cardStyle}
                  onClick={handleClipboardPaste}
                  onMouseEnter={e => cardHover(e, true)}
                  onMouseLeave={e => cardHover(e, false)}
                >
                  <div style={{ transform: isMobile ? "scale(0.7)" : "none", lineHeight: 0 }}><ClipboardIcon /></div>
                  <span style={{
                    fontFamily: T.font.display, fontSize: isMobile ? "0.8125rem" : "0.9375rem", fontWeight: 600, /* Atrium meta/body */
                    color: "#403B36", /* Atrium ink */ lineHeight: 1.3,
                  }}>
                    {t("importClipboard")}
                  </span>
                  {!isMobile && <span style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", /* Atrium meta */ color: "#716A5E", /* Atrium muted */ lineHeight: 1.3,
                  }}>
                    {t("importClipboardDesc")}
                  </span>}
                </div>
              )}
            </div>

            {/* ═══ D. CLOUD SERVICES — hidden during onboarding (lockRoom): the buttons are wired to a no-op there ═══ */}
            {/* Cloud import is WEB ONLY. It is hidden in native apps (matching our
                App Review notes) to avoid external-account OAuth flows and to keep
                third-party brand logos (Google Photos / OneDrive / Dropbox) off
                iOS (Apple Guideline 2.3.10). */}
            {!lockRoom && !isNative() && (
            <div style={{ marginBottom: isMobile ? "0.75rem" : "1.25rem" }}>
              <p style={{
                fontFamily: T.font.display, fontSize: isMobile ? "0.8125rem" : "0.9375rem", fontWeight: 600,
                color: "#403B36", /* Atrium ink */ margin: isMobile ? "0 0 0.375rem" : "0 0 0.625rem",
              }}>
                {t("importCloudTitle")}
              </p>
              <div style={{
                // On small phones the three brand chips can overflow their
                // grid tracks and truncate their labels; let the row scroll
                // horizontally instead (matching CloudImportPanel's provider
                // tabs). On wider viewports keep the tidy equal 3-up grid.
                display: isMobile ? "flex" : "grid",
                gridTemplateColumns: isMobile ? undefined : "1fr 1fr 1fr",
                gap: isMobile ? "0.375rem" : "0.5rem",
                overflowX: isMobile ? "auto" : undefined,
                WebkitOverflowScrolling: isMobile ? "touch" : undefined,
                paddingBottom: isMobile ? "0.125rem" : undefined,
              }}>
                {CLOUD_PROVIDERS.map(({ key, labelKey, icon }) => {
                  const disabled = DISABLED_PROVIDERS.has(key);
                  return (
                  <button
                    key={key}
                    onClick={() => { if (!disabled) onOpenCloudProvider(key, targetRoomId || null); }}
                    disabled={disabled}
                    className="imp-hub-anim imp-hub-focus"
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      padding: isMobile ? "0.5rem 0.625rem" : "0.625rem 0.875rem",
                      borderRadius: "0.75rem",
                      background: T.color.white,
                      border: "0.0625rem solid #E3D6BC", /* Atrium token: hairline */
                      cursor: disabled ? "default" : "pointer",
                      fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.8125rem",
                      fontWeight: 500, color: "#403B36", /* Atrium ink */
                      transition: "all 0.2s ease",
                      textAlign: "left",
                      whiteSpace: "nowrap",
                      flex: isMobile ? "0 0 auto" : undefined,
                      opacity: disabled ? 0.35 : 1,
                      pointerEvents: disabled ? "none" : "auto",
                    }}
                    onMouseEnter={e => {
                      if (disabled) return;
                      e.currentTarget.style.borderColor = "#E3D6BC"; /* Atrium token: hairline */
                      e.currentTarget.style.transform = "translateY(-0.1875rem)";
                      e.currentTarget.style.boxShadow = "0 0.25rem 1rem rgba(64,59,54,0.07)"; /* Atrium S1 */
                    }}
                    onMouseLeave={e => {
                      if (disabled) return;
                      e.currentTarget.style.borderColor = "#E3D6BC";
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Brand marks are framed in a hairline pill so their loud
                        brand colors read as intentional badges against the muted
                        Tuscan palette rather than as stray accents. */}
                    <span aria-hidden="true" style={{
                      flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: "1.75rem", height: "1.75rem",
                      borderRadius: "50%",
                      background: T.color.cream,
                      border: "0.0625rem solid #E3D6BC", /* Atrium token: hairline */
                    }}>
                      {icon}
                    </span>
                    <span>{t(labelKey)}{disabled && <span style={{ fontSize: "0.8125rem", /* Atrium meta */ color: "#716A5E", marginLeft: "0.25rem" }}>{t("comingSoon")}</span>}</span>
                  </button>
                  );
                })}
              </div>
            </div>
            )}

            {/* ═══ PREVIEW QUEUE ═══ */}
            {queue.length > 0 && (
              <div style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "#FCFAF5", /* Atrium cream, opaque */
                border: "0.0625rem solid #E3D6BC", /* Atrium token: hairline */
                marginBottom: "1rem",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: "0.75rem",
                }}>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600,
                    color: "#403B36", /* Atrium ink */
                  }}>
                    {t("importQueueTitle", { count: String(queue.length) })}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {totalSize > 0 && (
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", /* Atrium muted */
                      }}>
                        {formatBytes(totalSize)}
                      </span>
                    )}
                    <button
                      onClick={clearQueue}
                      className="imp-hub-focus"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.error,
                        textDecoration: "underline",
                      }}
                    >
                      {t("importClearAll")}
                    </button>
                  </div>
                </div>

                {/* Thumbnail grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(4.5rem, 1fr))",
                  gap: "0.5rem",
                  maxHeight: "12rem",
                  overflow: "auto",
                }}>
                  {queue.map((item) => (
                    <div key={item.id} style={{
                      position: "relative",
                      aspectRatio: "1",
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                      background: T.color.warmStone,
                      border: "0.0625rem solid #E3D6BC", /* Atrium token: hairline */
                    }}>
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          style={{
                            width: "100%", height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div style={{
                          width: "100%", height: "100%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexDirection: "column", gap: "0.125rem",
                          padding: "0.25rem",
                        }}>
                          <span style={{
                            fontFamily: T.font.body, fontSize: "0.8125rem", /* Atrium meta */
                            color: "#716A5E", /* Atrium muted */ textAlign: "center",
                            overflow: "hidden", textOverflow: "ellipsis",
                            display: "-webkit-box", WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}>
                            {item.name}
                          </span>
                        </div>
                      )}
                      {/* Remove button — on mobile the hit area is expanded to the
                          2.75rem touch minimum via padding while the visible chip
                          stays compact (the trash glyph sits in a small circle). */}
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        className="imp-hub-anim imp-hub-focus"
                        style={{
                          position: "absolute", top: 0, right: 0,
                          width: isMobile ? "2.75rem" : "1.5rem",
                          height: isMobile ? "2.75rem" : "1.5rem",
                          padding: 0,
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
                        }}
                        aria-label={tc("remove")}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            margin: "0.125rem",
                            width: "1.25rem", height: "1.25rem",
                            borderRadius: "50%",
                            background: "rgba(64,59,54,0.65)", /* Atrium warm ink */
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: T.color.white,
                            transition: "background 0.2s",
                          }}
                        >
                          <TrashIcon />
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ IMPORT ERROR ═══ */}
            {importError && (
              <div role="alert" style={{
                display: "flex", alignItems: "center", gap: "0.625rem",
                padding: "0.75rem 1rem", borderRadius: "0.75rem",
                background: "#F7EEEA", border: "0.0625rem solid #EBD4D0", /* Atrium: opaque warning tint */
                marginBottom: "0.75rem",
              }}>
                <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#A63D3D", lineHeight: 1.5 }}>
                  {importError}
                </span>
              </div>
            )}

            {/* ═══ IMPORT BUTTON ═══ */}
            {queue.length > 0 && (
              <button
                onClick={handleImportAll}
                disabled={importing}
                className="imp-hub-anim imp-hub-focus"
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: importing
                    ? T.color.sandstone
                    : "linear-gradient(135deg, #B85C38, #9A4F2A)", /* Atrium ember → terracotta */
                  color: T.color.white,
                  fontFamily: T.font.display,
                  fontSize: "1.0625rem",
                  fontWeight: 600,
                  cursor: importing ? "default" : "pointer",
                  transition: "all 0.25s",
                  letterSpacing: "0.02em",
                  boxShadow: importing ? "none" : "0 0.25rem 1rem rgba(64,59,54,0.07)", /* Atrium S1 */
                }}
              >
                {importing
                  ? t("importImporting")
                  : t("importConfirm", { count: String(queue.length) })
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file inputs — broad accept for mobile compatibility */}
      {/* Wrapped in a portal-like fixed div to prevent click events from bubbling
          to parent backdrops (RoomMediaPanel) when the file picker closes on mobile */}
      <div onClick={(e) => e.stopPropagation()} style={{ position: "fixed", zIndex: 8002, pointerEvents: "none" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept={`${ACCEPT_ALL},image/*,video/*,audio/*`}
          multiple
          onChange={handleFileSelect}
          onClick={(e) => e.stopPropagation()}
          style={{ display: "none" }}
        />
      </div>
    </>
  );
}
