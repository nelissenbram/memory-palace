"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";

/* ═══════════════════════════════════════════════════════
   SVG Icons — Roman / Tuscan style line-art
   ═══════════════════════════════════════════════════════ */

const DropZoneIcon = () => (
  <svg width="2.5rem" height="2.5rem" viewBox="0 0 40 40" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="8" width="32" height="24" rx="3" />
    <path d="M20 14v12M14 20l6 6 6-6" />
    <path d="M4 12l16-6 16 6" strokeDasharray="2 2" opacity="0.5" />
  </svg>
);

const ComputerIcon = () => (
  <svg width="2.5rem" height="2.5rem" viewBox="0 0 40 40" fill="none" stroke={T.color.walnut} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="6" width="28" height="20" rx="2" />
    <path d="M14 26v4h12v-4" />
    <path d="M10 30h20" />
    <path d="M16 14h8M20 12v6" />
  </svg>
);

const LinkIcon = () => (
  <svg width="2.5rem" height="2.5rem" viewBox="0 0 40 40" fill="none" stroke={T.color.walnut} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 23a6 6 0 008.5.6l4-4a6 6 0 00-8.5-8.5l-2 2" />
    <path d="M23 17a6 6 0 00-8.5-.6l-4 4a6 6 0 008.5 8.5l2-2" />
  </svg>
);

const CloudIcon = () => (
  <svg width="2.5rem" height="2.5rem" viewBox="0 0 40 40" fill="none" stroke={T.color.walnut} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 28h16a6 6 0 000-12 8 8 0 00-15-2 6 6 0 00-1 12" />
    <path d="M20 20v8M17 25l3 3 3-3" />
  </svg>
);

const ClipboardIcon = () => (
  <svg width="2.5rem" height="2.5rem" viewBox="0 0 40 40" fill="none" stroke={T.color.walnut} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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

const CheckIcon = () => (
  <svg width="1rem" height="1rem" viewBox="0 0 16 16" fill="none" stroke={T.color.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8l4 4 6-7" />
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
  onImportFiles: (files: QueuedFile[]) => void;
  onOpenCloudProvider: (provider: string) => void;
}

/* ═══════════════════════════════════════════════════════
   Accepted file types
   ═══════════════════════════════════════════════════════ */

const ACCEPT_IMAGES = ".jpg,.jpeg,.png,.webp,.heic,.heif";
const ACCEPT_VIDEO = ".mp4,.mov,.webm";
const ACCEPT_AUDIO = ".mp3,.wav,.m4a";
const ACCEPT_ALL = [ACCEPT_IMAGES, ACCEPT_VIDEO, ACCEPT_AUDIO].join(",");

const ACCEPT_MIME_RE = /^(image\/(jpeg|png|webp|heic|heif)|video\/(mp4|quicktime|webm)|audio\/(mpeg|wav|mp4|x-m4a))$/i;

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

const CLOUD_PROVIDERS = [
  { key: "googlePhotos", icon: (
    <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none"><path d="M12 7.5V1.5A4.5 4.5 0 007.5 6v1.5H12z" fill="#EA4335"/><path d="M16.5 12H22.5A4.5 4.5 0 0018 7.5H16.5V12z" fill="#4285F4"/><path d="M12 16.5V22.5A4.5 4.5 0 0016.5 18V16.5H12z" fill="#34A853"/><path d="M7.5 12H1.5A4.5 4.5 0 006 16.5H7.5V12z" fill="#FBBC05"/></svg>
  )},
  { key: "dropbox", icon: (
    <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none"><path d="M12 2L6 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4z" fill="#0061FE"/><path d="M6 6l6 4-6 4" fill="#0061FE" opacity="0.7"/><path d="M18 6l-6 4 6 4" fill="#0061FE" opacity="0.7"/></svg>
  )},
  { key: "onedrive", icon: (
    <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none"><path d="M9 17h10a4 4 0 000-8 5 5 0 00-9.5-1A4 4 0 005 12.5 3.5 3.5 0 005 19" stroke="#0078D4" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
  )},
  { key: "applePhotos", icon: (
    <svg width="1.25rem" height="1.25rem" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#999" strokeWidth="1.5" fill="none"/><circle cx="12" cy="10" r="3.5" fill="#999"/><path d="M12 14.5c-4 0-6 2-6 4h12c0-2-2-4-6-4z" fill="#999"/></svg>
  )},
];

/* ═══════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════ */

export default function ImportHub({ onClose, onImportFiles, onOpenCloudProvider }: ImportHubProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");

  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragFileInfo, setDragFileInfo] = useState<{ count: number; size: number } | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlPreview, setUrlPreview] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [clipboardAvailable, setClipboardAvailable] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

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
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    return {
      id: makeId(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl,
      status: "queued",
      progress: 0,
    };
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const valid = files.filter(f => ACCEPT_MIME_RE.test(f.type));
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
      let size = 0;
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].kind === "file") {
          count++;
        }
      }
      setDragFileInfo({ count, size });
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

  /* ── URL import ────────────────────────── */

  const handleUrlAdd = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;
    setUrlLoading(true);
    setUrlPreview(null);

    // Try to detect type from URL
    const isYouTube = /youtube\.com\/watch|youtu\.be\//.test(url);
    let previewUrl: string | null = null;
    let name = url.split("/").pop() || "link";

    if (isYouTube) {
      const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match) {
        previewUrl = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
        name = `YouTube: ${match[1]}`;
      }
    } else if (/\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url)) {
      previewUrl = url;
    }

    setUrlPreview(previewUrl);

    const item: QueuedFile = {
      id: makeId(),
      url,
      name,
      size: 0,
      type: isYouTube ? "video/youtube" : "image/url",
      previewUrl,
      status: "queued",
      progress: 0,
    };
    setQueue(prev => [...prev, item]);
    setUrlInput("");
    setUrlLoading(false);
  }, [urlInput]);

  /* ── Clipboard paste ───────────────────── */

  const handleClipboardPaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const file = new File([blob], `clipboard-${Date.now()}.png`, { type });
            addFiles([file]);
            return;
          }
        }
      }
    } catch {
      /* user denied or no image on clipboard */
    }
  }, [addFiles]);

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

  const handleImportAll = useCallback(() => {
    if (queue.length === 0) return;
    setImporting(true);
    onImportFiles(queue);
    setTimeout(() => {
      clearQueue();
      setImporting(false);
      onClose();
    }, 300);
  }, [queue, onImportFiles, clearQueue, onClose]);

  /* ── Total queue stats ─────────────────── */

  const totalSize = queue.reduce((s, q) => s + q.size, 0);

  /* ═══════════════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════════════ */

  const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    padding: "1.25rem 1rem",
    borderRadius: "0.75rem",
    border: `0.0625rem solid ${T.color.cream}`,
    background: T.color.linen,
    cursor: "pointer",
    transition: "all 0.25s ease",
    textAlign: "center",
    minHeight: "7rem",
    justifyContent: "center",
  };

  const cardHover = (e: React.MouseEvent, enter: boolean) => {
    const el = e.currentTarget as HTMLElement;
    if (enter) {
      el.style.background = T.color.white;
      el.style.borderColor = `${T.color.gold}66`;
      el.style.transform = "translateY(-0.125rem)";
      el.style.boxShadow = `0 0.375rem 1rem rgba(212,175,55,0.1)`;
    } else {
      el.style.background = T.color.linen;
      el.style.borderColor = T.color.cream;
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
          from { opacity: 0; transform: translateY(1.5rem) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes impHubPulse {
          0%, 100% { border-color: ${T.color.gold}88; }
          50% { border-color: ${T.color.gold}; box-shadow: 0 0 1.5rem rgba(212,175,55,0.15); }
        }
        @keyframes impHubSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Backdrop ───────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 8000,
          background: "rgba(44,44,42,0.55)",
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
          padding: isMobile ? "1rem" : "2rem",
          pointerEvents: "none",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: "40rem",
            maxHeight: "90vh",
            overflow: "auto",
            background: T.color.linen,
            borderRadius: "1rem",
            border: `0.0625rem solid ${T.color.cream}`,
            boxShadow: "0 1.5rem 4rem rgba(44,44,42,0.2), 0 0.5rem 1.5rem rgba(44,44,42,0.1)",
            animation: "impHubSlideUp 0.3s ease both",
          }}
        >
          {/* ── Header ─────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: isMobile ? "1rem 1.25rem" : "1.25rem 1.75rem",
            borderBottom: `0.0625rem solid ${T.color.cream}`,
          }}>
            <div>
              <h2 style={{
                fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600,
                color: T.color.charcoal, margin: 0, letterSpacing: "0.01em",
              }}>
                {t("importHubTitle")}
              </h2>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
                margin: "0.25rem 0 0", lineHeight: 1.4,
              }}>
                {t("importHubSubtitle")}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label={tc("close")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: T.color.muted, padding: "0.25rem",
                borderRadius: "0.375rem", transition: "color 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = T.color.charcoal; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.color.muted; }}
            >
              <CloseIcon />
            </button>
          </div>

          <div style={{ padding: isMobile ? "1rem 1.25rem" : "1.5rem 1.75rem" }}>

            {/* ═══ A. DRAG & DROP ZONE ═══ */}
            <div
              ref={dropRef}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                padding: "1.75rem 1rem",
                borderRadius: "0.75rem",
                border: `0.125rem dashed ${dragOver ? T.color.gold : T.color.sandstone}`,
                background: dragOver ? `${T.color.gold}08` : "transparent",
                textAlign: "center",
                cursor: "default",
                transition: "border-color 0.25s, background 0.25s",
                animation: dragOver ? "impHubPulse 1.2s ease infinite" : "none",
                marginBottom: "1.25rem",
              }}
            >
              <DropZoneIcon />
              <p style={{
                fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
                color: dragOver ? T.color.gold : T.color.charcoal,
                margin: "0.625rem 0 0.25rem",
                transition: "color 0.25s",
              }}>
                {t("importDropTitle")}
              </p>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, margin: 0,
              }}>
                {t("importDropHint")}
              </p>
              {dragOver && dragFileInfo && dragFileInfo.count > 0 && (
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem",
                  color: T.color.gold, fontWeight: 600,
                  margin: "0.5rem 0 0",
                }}>
                  {t("importDropCount", { count: String(dragFileInfo.count) })}
                </p>
              )}
            </div>

            {/* ═══ OPTION CARDS GRID ═══ */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}>
              {/* B. Choose from Computer */}
              <div
                style={cardStyle}
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={e => cardHover(e, true)}
                onMouseLeave={e => cardHover(e, false)}
              >
                <ComputerIcon />
                <span style={{
                  fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600,
                  color: T.color.charcoal, lineHeight: 1.3,
                }}>
                  {t("importFromComputer")}
                </span>
                <span style={{
                  fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, lineHeight: 1.3,
                }}>
                  {t("importFromComputerDesc")}
                </span>
              </div>

              {/* C. Paste URL / Link */}
              <div
                style={cardStyle}
                onClick={() => setActiveSection(activeSection === "url" ? null : "url")}
                onMouseEnter={e => cardHover(e, true)}
                onMouseLeave={e => cardHover(e, false)}
              >
                <LinkIcon />
                <span style={{
                  fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600,
                  color: T.color.charcoal, lineHeight: 1.3,
                }}>
                  {t("importPasteUrl")}
                </span>
                <span style={{
                  fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, lineHeight: 1.3,
                }}>
                  {t("importPasteUrlDesc")}
                </span>
              </div>

              {/* E. From Clipboard */}
              {clipboardAvailable && (
                <div
                  style={cardStyle}
                  onClick={handleClipboardPaste}
                  onMouseEnter={e => cardHover(e, true)}
                  onMouseLeave={e => cardHover(e, false)}
                >
                  <ClipboardIcon />
                  <span style={{
                    fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600,
                    color: T.color.charcoal, lineHeight: 1.3,
                  }}>
                    {t("importClipboard")}
                  </span>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, lineHeight: 1.3,
                  }}>
                    {t("importClipboardDesc")}
                  </span>
                </div>
              )}
            </div>

            {/* ═══ URL INPUT SECTION (expanded) ═══ */}
            {activeSection === "url" && (
              <div style={{
                marginBottom: "1.25rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "rgba(255,255,255,0.7)",
                border: `0.0625rem solid ${T.color.cream}`,
                animation: "impHubFadeIn 0.2s ease both",
              }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleUrlAdd(); }}
                    placeholder={t("importUrlPlaceholder")}
                    style={{
                      flex: 1,
                      padding: "0.625rem 0.875rem",
                      borderRadius: "0.5rem",
                      border: `0.0625rem solid ${T.color.cream}`,
                      fontFamily: T.font.body, fontSize: "0.875rem",
                      color: T.color.charcoal,
                      background: T.color.white,
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={handleUrlAdd}
                    disabled={!urlInput.trim() || urlLoading}
                    style={{
                      padding: "0.625rem 1rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      background: urlInput.trim() ? T.color.gold : T.color.sandstone,
                      color: T.color.white, fontFamily: T.font.body,
                      fontSize: "0.8125rem", fontWeight: 600,
                      cursor: urlInput.trim() ? "pointer" : "default",
                      opacity: urlInput.trim() ? 1 : 0.5,
                      transition: "all 0.2s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t("importUrlAdd")}
                  </button>
                </div>
                {urlPreview && (
                  <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
                    <img
                      src={urlPreview}
                      alt="Preview"
                      style={{
                        maxWidth: "100%", maxHeight: "8rem",
                        borderRadius: "0.5rem", objectFit: "contain",
                      }}
                    />
                  </div>
                )}
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                  margin: "0.5rem 0 0", lineHeight: 1.4,
                }}>
                  {t("importUrlHint")}
                </p>
              </div>
            )}

            {/* ═══ D. CLOUD SERVICES ═══ */}
            <div style={{ marginBottom: "1.25rem" }}>
              <p style={{
                fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600,
                color: T.color.charcoal, margin: "0 0 0.625rem",
              }}>
                {t("importCloudTitle")}
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
              }}>
                {CLOUD_PROVIDERS.map(({ key, icon }) => (
                  <button
                    key={key}
                    onClick={() => onOpenCloudProvider(key)}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.625rem 0.875rem",
                      borderRadius: "0.625rem",
                      background: T.color.white,
                      border: `0.0625rem solid ${T.color.cream}`,
                      cursor: "pointer",
                      fontFamily: T.font.body, fontSize: "0.8125rem",
                      fontWeight: 500, color: T.color.walnut,
                      transition: "all 0.2s ease",
                      textAlign: "left",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = `${T.color.walnut}44`;
                      e.currentTarget.style.transform = "translateY(-0.0625rem)";
                      e.currentTarget.style.boxShadow = "0 0.25rem 0.75rem rgba(44,44,42,0.06)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = T.color.cream;
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {icon}
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>

            {/* ═══ PREVIEW QUEUE ═══ */}
            {queue.length > 0 && (
              <div style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                background: "rgba(255,255,255,0.8)",
                border: `0.0625rem solid ${T.color.cream}`,
                marginBottom: "1rem",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: "0.75rem",
                }}>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600,
                    color: T.color.charcoal,
                  }}>
                    {t("importQueueTitle", { count: String(queue.length) })}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {totalSize > 0 && (
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
                      }}>
                        {formatBytes(totalSize)}
                      </span>
                    )}
                    <button
                      onClick={clearQueue}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.error,
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
                      border: `0.0625rem solid ${T.color.cream}`,
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
                            fontFamily: T.font.body, fontSize: "0.5625rem",
                            color: T.color.muted, textAlign: "center",
                            overflow: "hidden", textOverflow: "ellipsis",
                            display: "-webkit-box", WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}>
                            {item.name}
                          </span>
                        </div>
                      )}
                      {/* Remove button */}
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        style={{
                          position: "absolute", top: "0.125rem", right: "0.125rem",
                          width: "1.25rem", height: "1.25rem",
                          borderRadius: "50%",
                          background: "rgba(44,44,42,0.65)",
                          border: "none",
                          cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: T.color.white,
                          fontSize: "0.625rem",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = T.color.error; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(44,44,42,0.65)"; }}
                        aria-label={tc("remove")}
                      >
                        <TrashIcon />
                      </button>
                      {/* Status indicator */}
                      {item.status === "done" && (
                        <div style={{
                          position: "absolute", bottom: "0.125rem", right: "0.125rem",
                          background: "rgba(255,255,255,0.9)", borderRadius: "50%",
                          width: "1rem", height: "1rem",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <CheckIcon />
                        </div>
                      )}
                      {item.status === "uploading" && (
                        <div style={{
                          position: "absolute", inset: 0,
                          background: "rgba(44,44,42,0.3)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <div style={{
                            width: "1.25rem", height: "1.25rem",
                            border: `0.125rem solid ${T.color.white}`,
                            borderTopColor: "transparent",
                            borderRadius: "50%",
                            animation: "impHubSpin 0.8s linear infinite",
                          }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ IMPORT BUTTON ═══ */}
            {queue.length > 0 && (
              <button
                onClick={handleImportAll}
                disabled={importing}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "0.625rem",
                  border: "none",
                  background: importing
                    ? T.color.sandstone
                    : `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
                  color: T.color.white,
                  fontFamily: T.font.display,
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: importing ? "default" : "pointer",
                  transition: "all 0.25s",
                  letterSpacing: "0.02em",
                  boxShadow: importing ? "none" : `0 0.25rem 1rem rgba(212,175,55,0.25)`,
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ALL}
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
    </>
  );
}
