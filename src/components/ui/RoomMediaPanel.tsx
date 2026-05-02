"use client";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { translateWingName, translateRoomName } from "@/lib/constants/wings";
import { RoomIcon, WingIcon } from "@/components/ui/WingRoomIcons";
import RoomMediaPlayer from "@/components/ui/RoomMediaPlayer";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";

// Library-system imports
import { LibraryMemoryCard } from "@/components/ui/LibraryCards";
import { LibraryStyles, LibraryEmptyState } from "@/components/ui/LibraryAnimations";
import { LibrarySearch } from "@/components/ui/LibrarySearch";
import { LibraryFilterBar } from "@/components/ui/LibrarySearch";
import ImportHub from "@/components/ui/ImportHub";
import type { QueuedFile } from "@/components/ui/ImportHub";
import CloudBrowser from "@/components/ui/CloudBrowser";
import type { CloudItem } from "@/components/ui/CloudBrowser";
import { ROOM_LAYOUTS } from "@/lib/3d/roomLayouts";

// ─── Constants (kept from original) ──────────────────────────────────────────
const ROOM_SLOT_COUNTS: Record<string, number> = {
  painting: 1,
  frame: 1,
  photo: 1,
  album: 3,
  video: 1,
  audio: 3,
  case: 3,
  document: 5,
};

function normalizeType(mem: Mem): string {
  if (mem.type === "voice") return "audio";
  if (mem.type === "interview") return "audio";
  if (mem.type === "orb") return "case";
  if (mem.type === "text") return "document";
  return mem.type;
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  mems: Mem[];
  wing: Wing | null | undefined;
  room: WingRoom | null | undefined;
  onClose: () => void;
  onUpdate: (memId: string, updates: Partial<Mem>) => void;
  onDelete: (memId: string) => void;
  onAdd: (mem: Mem) => void;
  onSelect?: (mem: Mem) => void;
  initialMemId?: string | null;
  initialTab?: "library" | "gallery";
  roomLayout?: string;
  onRoomLayoutChange?: (layoutId: string) => void;
}

// ─── Furniture slots for the Room Gallery ─────────────────────────────────────
const FURNITURE_SLOTS = [
  { key: "painting", unitKey: "painting", slotType: "painting", compatTypes: ["photo", "painting"], icon: "\uD83D\uDDBC\uFE0F" },
  { key: "frame", unitKey: "frame", slotType: "frame", compatTypes: ["photo"], icon: "\uD83D\uDDBC" },
  { key: "screen", unitKey: "screen", slotType: "video", compatTypes: ["video"], icon: "\uD83D\uDCFA" },
  { key: "vinyl", unitKey: "vinyl", slotType: "audio", compatTypes: ["audio", "voice", "interview"], icon: "\uD83C\uDFB5" },
  { key: "vitrine", unitKey: "vitrine", slotType: "case", compatTypes: ["photo", "case", "orb"], icon: "\uD83C\uDFDB\uFE0F" },
  { key: "album", unitKey: "album", slotType: "album", compatTypes: ["photo", "album"], icon: "\uD83D\uDCD4" },
] as const;

// ─── Eye icons (SVG) ────────────────────────────────────────────────────────
function EyeOpenIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeClosedIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

// ─── Display unit options per memory type ────────────────────────────────────
const DISPLAY_UNITS: Record<string, { key: string; label: string; slotType: string }[]> = {
  photo: [
    { key: "frame", label: "frame", slotType: "frame" },
    { key: "painting", label: "painting", slotType: "painting" },
    { key: "album", label: "album", slotType: "album" },
    { key: "vitrine", label: "vitrine", slotType: "case" },
  ],
  video: [{ key: "screen", label: "screen", slotType: "video" }],
  audio: [{ key: "vinyl", label: "vinyl", slotType: "audio" }],
  painting: [{ key: "painting", label: "painting", slotType: "painting" }],
  document: [{ key: "bookshelf", label: "bookshelf", slotType: "document" }],
  case: [{ key: "vitrine", label: "vitrine", slotType: "case" }],
  orb: [{ key: "vitrine", label: "vitrine", slotType: "case" }],
  album: [{ key: "album", label: "album", slotType: "album" }],
  text: [{ key: "bookshelf", label: "bookshelf", slotType: "document" }],
};

// ─── Display unit allocator pill ─────────────────────────────────────────────
function DisplayedPill({
  mem,
  accent,
  t,
  onUpdate,
  allMems,
  slotCounts,
  isExhibition,
}: {
  mem: Mem;
  accent: string;
  t: (k: string, params?: Record<string, string>) => string;
  onUpdate: (memId: string, updates: Partial<Mem>) => void;
  allMems: Mem[];
  slotCounts?: Record<string, number>;
  isExhibition?: boolean;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const nType = normalizeType(mem);
  const allUnits = DISPLAY_UNITS[nType] || [];
  // In exhibition mode, only painting + screen slots are available
  const units = isExhibition
    ? allUnits.filter(u => u.key === "painting" || u.key === "screen")
    : allUnits;
  const currentUnit = mem.displayUnit || null;
  const isDisplayed = mem.displayed !== false && !!currentUnit;

  // Count occupancy per slot type
  const slotOccupancy = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of allMems) {
      if (m.displayed !== false && m.displayUnit) {
        const unit = DISPLAY_UNITS[normalizeType(m)]?.find(u => u.key === m.displayUnit);
        if (unit) {
          map[unit.slotType] = (map[unit.slotType] || 0) + 1;
        }
      }
    }
    return map;
  }, [allMems]);

  const handleSelect = useCallback((unitKey: string, slotType: string) => {
    const limit = (slotCounts || ROOM_SLOT_COUNTS)[slotType] || 1;
    const occupants = allMems.filter(
      m => m.displayed !== false && m.displayUnit && m.id !== mem.id &&
        DISPLAY_UNITS[normalizeType(m)]?.find(u => u.key === m.displayUnit)?.slotType === slotType
    );
    if (occupants.length >= limit) {
      // Auto-unassign the oldest
      const oldest = occupants[0];
      if (oldest) onUpdate(oldest.id, { displayed: false, displayUnit: undefined });
      setToast(t("unitFull"));
      setTimeout(() => setToast(null), 2000);
    }
    onUpdate(mem.id, { displayed: true, displayUnit: unitKey });
    setDropdownOpen(false);
  }, [mem, allMems, onUpdate, t]);

  const handleUnassign = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(mem.id, { displayed: false, displayUnit: undefined });
    setDropdownOpen(false);
  }, [mem, onUpdate]);

  const pillLabel = isDisplayed && currentUnit
    ? t(currentUnit) || currentUnit
    : t("notDisplayed");

  return (
    <>
      <div style={{ position: "absolute", top: "0.375rem", right: "0.375rem", zIndex: 5 }}>
        <button
          onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
          style={{
            padding: "0.1875rem 0.5rem",
            borderRadius: "0.75rem",
            border: "none",
            background: isDisplayed ? accent : "rgba(42,34,24,0.55)",
            backdropFilter: "blur(0.5rem)",
            color: "#FFF",
            fontFamily: T.font.body,
            fontSize: "0.5625rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
            lineHeight: 1.4,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          {isDisplayed ? <EyeOpenIcon /> : <EyeClosedIcon />}
          {pillLabel}
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points={dropdownOpen?"18 15 12 9 6 15":"6 9 12 15 18 9"}/></svg>
        </button>
        {dropdownOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              zIndex: 20,
              marginTop: "0.25rem",
              background: T.color.white,
              borderRadius: "0.75rem",
              border: `0.0625rem solid ${T.color.cream}`,
              boxShadow: "0 0.5rem 1.5rem rgba(44,44,42,0.12)",
              padding: "0.375rem",
              minWidth: "9rem",
              animation: "fadeIn 0.15s ease both",
            }}
          >
            {units.map((unit) => {
              const limit = (slotCounts || ROOM_SLOT_COUNTS)[unit.slotType] || 1;
              const count = slotOccupancy[unit.slotType] || 0;
              const isActive = currentUnit === unit.key;
              return (
                <button
                  key={unit.key}
                  onClick={(e) => { e.stopPropagation(); handleSelect(unit.key, unit.slotType); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    width: "100%",
                    padding: "0.375rem 0.625rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: isActive ? `${accent}15` : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                >
                  <span style={{
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? accent : T.color.charcoal,
                  }}>
                    {t(unit.label) || unit.label}
                  </span>
                  <span style={{
                    fontFamily: T.font.body,
                    fontSize: "0.625rem",
                    color: T.color.muted,
                    marginLeft: "auto",
                  }}>
                    ({count}/{limit})
                  </span>
                  {isActive && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
            {isDisplayed && (
              <button
                onClick={handleUnassign}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.375rem 0.625rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  marginTop: "0.125rem",
                  borderTop: `0.0625rem solid ${T.color.cream}`,
                }}
              >
                <span style={{
                  fontFamily: T.font.body,
                  fontSize: "0.75rem",
                  color: T.color.muted,
                }}>
                  {t("notDisplayed")}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
      {toast && (
        <div
          style={{
            position: "absolute",
            top: "2rem",
            right: "0.375rem",
            zIndex: 6,
            padding: "0.25rem 0.5rem",
            borderRadius: "0.5rem",
            background: "rgba(42,34,24,0.85)",
            color: "#FFF",
            fontFamily: T.font.body,
            fontSize: "0.5rem",
            animation: "fadeIn .2s ease",
            whiteSpace: "nowrap",
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}

// ─── Showing count per type ─────────────────────────────────────────────────
function ShowingCounts({
  mems,
  t,
  isExhibition,
  slotCounts,
}: {
  mems: Mem[];
  t: (k: string, vars?: Record<string, string>) => string;
  isExhibition?: boolean;
  slotCounts?: Record<string, number>;
}) {
  const counts = useMemo(() => {
    const map: Record<string, { displayed: number; total: number }> = {};
    for (const m of mems) {
      const nt = normalizeType(m);
      if (!map[nt]) map[nt] = { displayed: 0, total: 0 };
      map[nt].total++;
      if (m.displayed !== false) map[nt].displayed++;
    }
    return map;
  }, [mems]);

  // In exhibition mode, show slot availability based on display units
  const displayEntries = useMemo(() => {
    if (!isExhibition || !slotCounts) return null;
    const unitMap: { unitKey: string; label: string; slots: number }[] = [
      { unitKey: "painting", label: "painting", slots: slotCounts.painting ?? 0 },
      { unitKey: "screen", label: "screen", slots: slotCounts.video ?? 0 },
      { unitKey: "frame", label: "frame", slots: 0 },
      { unitKey: "vitrine", label: "vitrine", slots: 0 },
      { unitKey: "album", label: "tableAlbum", slots: 0 },
    ];
    return unitMap.map(u => {
      const used = mems.filter(m => m.displayed !== false && m.displayUnit === u.unitKey).length;
      return { ...u, used };
    });
  }, [isExhibition, slotCounts, mems]);

  const entries = Object.entries(counts);
  if (entries.length === 0 && !displayEntries) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        padding: "0.25rem 0",
      }}
    >
      {displayEntries
        ? displayEntries.map(e => (
            <span
              key={e.unitKey}
              style={{
                fontFamily: T.font.body,
                fontSize: "0.625rem",
                color: e.slots === 0 ? T.color.cream : T.color.muted,
              }}
            >
              {t(e.label)}: {e.used}/{e.slots}
            </span>
          ))
        : entries.map(([type, c]) => (
            <span
              key={type}
              style={{
                fontFamily: T.font.body,
                fontSize: "0.625rem",
                color: T.color.muted,
              }}
            >
              {t(type)}: {t("showingCount", { x: String(c.displayed), y: String(c.total) })}
            </span>
          ))
      }
    </div>
  );
}

// ─── Sort icons (inline SVG) ────────────────────────────────────────────────
function SortIcon({ mode, color }: { mode: string; color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {mode === "newest" && <><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></>}
      {mode === "oldest" && <><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>}
      {mode === "alpha" && <><path d="M3 6h7M3 12h5M3 18h3" /><path d="M17 3l4 4-4 4" /><path d="M21 7H14" /></>}
      {mode === "type" && <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>}
    </svg>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function RoomMediaPanel({ mems, wing, room, onClose, onUpdate, onDelete, onAdd, onSelect, initialMemId, initialTab = "library", roomLayout, onRoomLayoutChange }: Props) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("roomMedia");
  const { t: tLib } = useTranslation("library");
  const { t: tLayout } = useTranslation("roomLayouts");
  const { t: tWings } = useTranslation("wings");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const accent = wing?.accent || T.color.terracotta;

  const [activeTab, setActiveTab] = useState<"library" | "gallery">(initialTab);
  // Upload panel removed — Import Hub handles both import and upload
  const [showImportHub, setShowImportHub] = useState(false);
  const [cloudBrowserProvider, setCloudBrowserProvider] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "alpha" | "type">("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [mediaPlayerMemId, setMediaPlayerMemId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastConsumedMemId = useRef<string | null>(null);
  const [pickingSlot, setPickingSlot] = useState<string | null>(null);
  const [movingMem, setMovingMem] = useState<Mem | null>(null);
  const [expandedMoveWing, setExpandedMoveWing] = useState<string | null>(null);
  const [movedToast, setMovedToast] = useState(false);
  const { moveMemory } = useMemoryStore();
  const { getWings, getWingRooms } = useRoomStore();

  // ── Exhibition-aware furniture slots ──
  const currentLayout = useMemo(() => {
    if (!roomLayout) return null;
    return ROOM_LAYOUTS.find(l => l.id === roomLayout) || null;
  }, [roomLayout]);
  const isExhibition = !!currentLayout?.isExhibition;

  const activeFurnitureSlots = useMemo(() => {
    if (isExhibition) {
      // Exhibition: only paintings (20 slots) + screen (1 slot)
      return [
        { key: "painting", unitKey: "painting", slotType: "painting", compatTypes: ["photo", "painting"] as readonly string[], icon: "\uD83D\uDDBC\uFE0F" },
        { key: "screen", unitKey: "screen", slotType: "video", compatTypes: ["video"] as readonly string[], icon: "\uD83D\uDCFA" },
      ];
    }
    return FURNITURE_SLOTS as unknown as { key: string; unitKey: string; slotType: string; compatTypes: readonly string[]; icon: string }[];
  }, [isExhibition]);

  const activeSlotCounts = useMemo<Record<string, number>>(() => {
    if (isExhibition) {
      return { painting: 20, video: 1 };
    }
    return ROOM_SLOT_COUNTS;
  }, [isExhibition]);

  // Sync initialTab from parent (e.g. clicking furniture in 3D)
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  const handleDelete = useCallback((memId: string) => {
    if (typeof window !== "undefined" && !window.confirm(t("confirmDelete"))) return;
    onDelete(memId);
  }, [onDelete, t]);

  // Helper: read file as data URL with timeout (prevents Samsung browser hangs)
  const readFileWithTimeout = useCallback((file: File, timeoutMs: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const timer = setTimeout(() => { reader.abort(); reject(new Error("FileReader timeout")); }, timeoutMs);
      reader.onload = () => { clearTimeout(timer); resolve(reader.result as string); };
      reader.onerror = () => { clearTimeout(timer); reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }, []);

  const addMemory = useMemoryStore((s) => s.addMemory);

  const handleImportFiles = useCallback(async (files: QueuedFile[]) => {
    const targetRoom = room?.id;
    if (!targetRoom) return;
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
              dataUrl = uploadData.url;
              directFilePath = uploadData.path;
              directStorageBackend = uploadData.storageBackend;
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
                    if (w > maxDim || h > maxDim) {
                      const ratio = Math.min(maxDim / w, maxDim / h);
                      w = Math.round(w * ratio); h = Math.round(h * ratio);
                    }
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
            } catch {
              dataUrl = await readFileWithTimeout(item.file, 15000);
            }
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
              if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                dataUrl = uploadData.url;
                directFilePath = uploadData.path;
                directStorageBackend = uploadData.storageBackend;
              }
            } catch { /* give up */ }
          }
        }
      } else if (item.previewUrl) {
        dataUrl = item.previewUrl;
      }
      await addMemory(targetRoom, {
        id: `import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: item.name,
        hue: Math.floor(Math.random() * 360), s: 50, l: 70,
        type: isVideo ? "video" : isAudio ? "audio" : "photo",
        dataUrl,
        desc: "",
        createdAt: new Date().toISOString(),
        ...(directFilePath ? { _filePath: directFilePath, _storageBackend: directStorageBackend } : {}),
      } as Mem);
    }
    setShowImportHub(false);
  }, [room, addMemory, readFileWithTimeout]);

  // ─── Derived data ───────────────────────────────────────────────────────────
  // Normalize display types to match Library — painting→photo, voice→interview
  const normalizeDisplayType = useCallback((type: string) => {
    if (type === "painting") return "photo";
    if (type === "voice") return "interview";
    return type;
  }, []);

  const roomTypes = useMemo(() => {
    const s = new Set<string>();
    for (const m of mems) s.add(normalizeDisplayType(m.type));
    return Array.from(s).sort();
  }, [mems, normalizeDisplayType]);

  const roomTypeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of mems) {
      const t = normalizeDisplayType(m.type);
      c[t] = (c[t] || 0) + 1;
    }
    return c;
  }, [mems, normalizeDisplayType]);

  const displayedMems = useMemo(() => {
    let result = [...mems];
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.title.toLowerCase().includes(q)
        || (m.desc || "").toLowerCase().includes(q)
        || m.type.toLowerCase().includes(q)
      );
    }
    // Filter
    if (filterType) result = result.filter(m => normalizeDisplayType(m.type) === filterType);
    // Sort
    result.sort((a, b) => {
      switch (sortMode) {
        case "newest": return (b.createdAt || "").localeCompare(a.createdAt || "");
        case "oldest": return (a.createdAt || "").localeCompare(b.createdAt || "");
        case "alpha": return a.title.localeCompare(b.title);
        case "type": return a.type.localeCompare(b.type);
        default: return 0;
      }
    });
    return result;
  }, [mems, searchQuery, filterType, sortMode]);

  // Resolve mediaPlayerMemId to an index in displayedMems at render time
  // This ensures the index is always fresh even if displayedMems changes
  const mediaPlayerIndex = useMemo(() => {
    if (!mediaPlayerMemId) return null;
    const idx = displayedMems.findIndex(m => m.id === mediaPlayerMemId);
    return idx >= 0 ? idx : null;
  }, [mediaPlayerMemId, displayedMems]);

  // Auto-open player when initialMemId is provided (clicking a 3D object)
  useEffect(() => {
    if (!initialMemId) { lastConsumedMemId.current = null; return; }
    if (initialMemId === lastConsumedMemId.current) return;
    // Check the memory exists in the full (unfiltered) mems list
    const exists = mems.some(m => m.id === initialMemId);
    if (exists) {
      // Clear any active filter/search so the clicked memory is visible in displayedMems
      setFilterType(null);
      setSearchQuery("");
      setMediaPlayerMemId(initialMemId);
      lastConsumedMemId.current = initialMemId;
    }
  }, [initialMemId, mems]);

  // ─── Select mode callbacks ─────────────────────────────────────────────────
  const toggleSelect = useCallback((memId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(memId)) next.delete(memId); else next.add(memId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === displayedMems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedMems.map(m => m.id)));
    }
  }, [selectedIds.size, displayedMems]);

  const handleDeleteSelected = useCallback(() => {
    if (typeof window !== "undefined" && !window.confirm(t("confirmDelete"))) return;
    for (const id of selectedIds) onDelete(id);
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [selectedIds, onDelete, t]);

  const handleMoveSelected = useCallback(() => {
    const firstId = Array.from(selectedIds)[0];
    const mem = mems.find(m => m.id === firstId);
    if (mem) setMovingMem(mem);
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [selectedIds, mems]);

  const handleMoveToRoom = useCallback((targetRoomId: string) => {
    if (!movingMem || !room) return;
    moveMemory(room.id, targetRoomId, movingMem.id);
    setMovingMem(null);
    setExpandedMoveWing(null);
    setMovedToast(true);
    setTimeout(() => setMovedToast(false), 2200);
  }, [movingMem, room, moveMemory]);

  // ─── Styles ────────────────────────────────────────────────────────────────
  const panelW = isMobile ? "100%" : "min(27.5rem, 92vw)";
  const glassBg = "rgba(255,255,255,0.82)";
  const touchMin = "2.75rem";

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      role="button" tabIndex={0}
      onClick={() => { if (!showImportHub && !cloudBrowserProvider) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!showImportHub && !cloudBrowserProvider) onClose(); } }}
      style={{ position: "absolute", inset: 0, background: "rgba(42,34,24,.4)", backdropFilter: "blur(0.5rem)", zIndex: 55, animation: "fadeIn .2s ease" }}
    >
      <LibraryStyles />
      <div
        ref={containerRef}
        role="dialog" aria-modal="true" aria-label={t("title")}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0,
          width: panelW,
          background: glassBg,
          backdropFilter: "blur(1.5rem) saturate(1.4)",
          WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
          borderLeft: isMobile ? "none" : `0.0625rem solid ${T.color.cream}`,
          boxShadow: `-1rem 0 2.5rem rgba(44,44,42,0.12), inset 0 0.0625rem 0 rgba(255,255,255,0.7)`,
          padding: isMobile ? "1.25rem 1rem" : "1.75rem 1.5rem",
          overflowY: "auto",
          animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)",
          display: "flex", flexDirection: "column", gap: "1rem",
        }}
      >
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(2.5rem)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* ─── Header + Tab bar (unified sticky block) ─── */}
        <div style={{
          position: "sticky", top: isMobile ? "-1.25rem" : "-1.75rem", zIndex: 5,
          background: glassBg, backdropFilter: "blur(1.5rem) saturate(1.4)", WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
          margin: isMobile ? "-1.25rem -1rem 0" : "-1.75rem -1.5rem 0",
          padding: isMobile ? "1.25rem 1rem 0.5rem" : "1.75rem 1.5rem 0.5rem",
          borderBottom: `0.0625rem solid ${T.color.cream}`,
          display: "flex", flexDirection: "column", gap: "0.625rem",
        }}>
          {/* Row 1: Room info + close */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
              <div style={{
                width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem",
                background: `${accent}18`, border: `0.0625rem solid ${accent}35`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <RoomIcon roomId={room?.id || ""} size={26} color={accent} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500, color: T.color.charcoal, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {room?.name || t("title")}
                </h3>
                <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: accent, margin: "0.25rem 0 0" }}>
                  {wing?.name || ""} {t("wing")}
                </p>
              </div>
            </div>
            <button onClick={onClose} aria-label={t("close")} style={{
              width: isMobile ? "2.75rem" : "2rem", height: isMobile ? "2.75rem" : "2rem", borderRadius: "1rem",
              border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone,
              color: T.color.muted, fontSize: "0.875rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              minWidth: touchMin, minHeight: touchMin,
            }}>{"\u2715"}</button>
          </div>
          {/* Row 2: Tab switcher */}
          <div style={{
            display: "flex", gap: 0, borderRadius: "0.625rem",
            background: T.color.warmStone, border: `0.0625rem solid ${T.color.cream}`,
            padding: "0.1875rem",
          }}>
            {(["library", "gallery"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
                  border: "none", cursor: "pointer",
                  background: activeTab === tab ? T.color.white : "transparent",
                  boxShadow: activeTab === tab ? "0 0.0625rem 0.25rem rgba(44,44,42,0.08)" : "none",
                  fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: activeTab === tab ? 600 : 500,
                  color: activeTab === tab ? accent : T.color.muted,
                  transition: "all 0.2s ease",
                }}
              >
                {t(tab === "library" ? "tabLibrary" : "tabGallery")}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ LIBRARY TAB ═══ */}
        {activeTab === "library" && <>

        {/* ─── Search bar ─── */}
        <LibrarySearch
          query={searchQuery}
          onQueryChange={setSearchQuery}
          accent={accent}
          resultCount={searchQuery ? displayedMems.length : undefined}
          totalCount={mems.length}
          isMobile={isMobile}
        />

        {/* ─── Import / Upload button + sort ─── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button onClick={() => setShowImportHub(true)} style={{
            display: "inline-flex", alignItems: "center", gap: "0.375rem",
            padding: "0.375rem 0.875rem",
            borderRadius: "0.5rem",
            background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
            border: "none",
            cursor: "pointer",
            fontFamily: T.font.body, fontSize: "0.75rem",
            fontWeight: 600, color: T.color.white,
            letterSpacing: "0.02em",
            boxShadow: "0 0.0625rem 0.25rem rgba(212,175,55,0.2)",
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3v10M6 9l4 4 4-4" />
              <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" />
            </svg>
            {t("importButton")}
          </button>

          {/* Select toggle */}
          <button
            onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelectedIds(new Set()); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.25rem",
              padding: "0.375rem 0.625rem",
              borderRadius: "0.5rem",
              border: `1px solid ${selectMode ? accent : T.color.cream}`,
              background: selectMode ? `${accent}15` : T.color.warmStone,
              cursor: "pointer",
              fontFamily: T.font.body, fontSize: "0.75rem",
              fontWeight: 500, color: selectMode ? accent : T.color.walnut,
              flexShrink: 0,
            }}
          >
            {selectMode ? t("done") : t("select")}
          </button>

          <div style={{ flex: 1 }} />

          {/* Sort dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setSortOpen(!sortOpen)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.25rem",
                padding: "0.375rem 0.625rem",
                borderRadius: "0.5rem",
                border: `1px solid ${T.color.cream}`,
                background: T.color.warmStone,
                cursor: "pointer",
                fontFamily: T.font.body, fontSize: "0.6875rem",
                fontWeight: 500, color: T.color.walnut,
              }}
            >
              <SortIcon mode={sortMode} color={T.color.muted} />
              {tLib(`sort${sortMode.charAt(0).toUpperCase() + sortMode.slice(1)}` as "sortNewest")}
            </button>
            {sortOpen && (
              <div style={{
                position: "absolute", top: "100%", right: 0, zIndex: 20,
                marginTop: "0.25rem",
                background: T.color.white, borderRadius: "0.75rem",
                border: `0.0625rem solid ${T.color.cream}`,
                boxShadow: "0 0.5rem 1.5rem rgba(44,44,42,0.12)",
                padding: "0.375rem", minWidth: "10rem",
                animation: "fadeIn 0.15s ease both",
              }}>
                {(["newest", "oldest", "alpha", "type"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setSortMode(mode); setSortOpen(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      width: "100%", padding: "0.5rem 0.75rem",
                      borderRadius: "0.5rem", border: "none",
                      background: sortMode === mode ? `${accent}10` : "transparent",
                      cursor: "pointer", textAlign: "left",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <SortIcon mode={mode} color={sortMode === mode ? accent : T.color.muted} />
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem",
                      fontWeight: sortMode === mode ? 600 : 500,
                      color: sortMode === mode ? accent : T.color.charcoal,
                    }}>
                      {tLib(`sort${mode.charAt(0).toUpperCase() + mode.slice(1)}` as "sortNewest")}
                    </span>
                    {sortMode === mode && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Filter bar ─── */}
        {roomTypes.length > 1 && (
          <LibraryFilterBar
            types={roomTypes}
            activeType={filterType}
            onFilterChange={setFilterType}
            accent={accent}
            typeCounts={roomTypeCounts}
          />
        )}

        {/* ─── Bulk actions bar (select mode) ─── */}
        {selectMode && (
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            background: `${accent}08`,
            border: `0.0625rem solid ${accent}20`,
          }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.375rem", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal }}>
              <input
                type="checkbox"
                checked={selectedIds.size === displayedMems.length && displayedMems.length > 0}
                onChange={handleSelectAll}
                style={{ accentColor: accent, width: "1rem", height: "1rem" }}
              />
              {t("selectAll")}
            </label>
            <div style={{ flex: 1 }} />
            {selectedIds.size > 0 && (
              <>
                <button onClick={handleDeleteSelected} style={{
                  padding: "0.25rem 0.625rem", borderRadius: "0.375rem",
                  border: "none", background: T.color.error, color: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                  cursor: "pointer",
                }}>
                  {t("deleteSelected")} ({selectedIds.size})
                </button>
                {onSelect && (
                  <button onClick={handleMoveSelected} style={{
                    padding: "0.25rem 0.625rem", borderRadius: "0.375rem",
                    border: "none", background: accent, color: T.color.white,
                    fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                    cursor: "pointer",
                  }}>
                    {t("moveSelected")}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── Media grid ─── */}
        {displayedMems.length === 0 ? (
          <LibraryEmptyState type={searchQuery || filterType ? "search" : "room"} accent={accent} />
        ) : (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "1.25rem",
            }}>
              {displayedMems.map((mem, i) => (
                <div key={mem.id} style={{ position: "relative", animation: `libCardEnter 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${0.03 + i * 0.03}s both` }}>
                  {selectMode && (
                    <div style={{ position: "absolute", top: "0.375rem", left: "0.375rem", zIndex: 6 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(mem.id)}
                        onChange={() => toggleSelect(mem.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ accentColor: accent, width: "1.125rem", height: "1.125rem", cursor: "pointer" }}
                      />
                    </div>
                  )}
                  <LibraryMemoryCard
                    mem={mem}
                    accent={accent}
                    onClick={() => selectMode ? toggleSelect(mem.id) : setMediaPlayerMemId(mem.id)}
                    animationIndex={i}
                    onMove={() => setMovingMem(mem)}
                    searchQuery={searchQuery}
                  />
                  <DisplayedPill
                    mem={mem}
                    accent={accent}
                    t={t}
                    onUpdate={onUpdate}
                    allMems={mems}
                    slotCounts={activeSlotCounts}
                    isExhibition={isExhibition}
                  />
                </div>
              ))}
            </div>
            <ShowingCounts mems={mems} t={t} isExhibition={isExhibition} slotCounts={activeSlotCounts} />
          </>
        )}

        </>}

        {/* ═══ GALLERY TAB ═══ */}
        {activeTab === "gallery" && <>
          <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, margin: 0, lineHeight: 1.5 }}>
            {t("galleryHint")}
          </p>

          {/* Room type selector — Tuscan pill chips */}
          {onRoomLayoutChange && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap" }}>
              <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, marginRight: "0.125rem" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", marginRight: "0.25rem" }}>
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
                {t("roomType")}
              </span>
              {[{ id: "", name: "Auto", nameKey: "" }, ...ROOM_LAYOUTS].map(l => {
                const isActive = (roomLayout || "") === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => onRoomLayoutChange(l.id)}
                    style={{
                      padding: "0.375rem 0.75rem",
                      minHeight: "2.75rem",
                      borderRadius: "1rem",
                      border: isActive ? `0.0625rem solid ${accent}` : `0.0625rem solid ${T.color.cream}`,
                      background: isActive ? `${accent}15` : T.color.white,
                      fontFamily: T.font.display,
                      fontSize: "0.75rem",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? accent : T.color.walnut,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: isActive ? `0 0.0625rem 0.25rem ${accent}20` : "none",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {l.id ? tLayout(l.id) : tLayout("auto")}
                  </button>
                );
              })}
            </div>
          )}

          {/* Furniture slot grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
            width: "100%",
          }}>
            {(() => {
              // For exhibition mode, expand painting into 20 individual slots + 1 screen
              const galleryItems: { key: string; unitKey: string; slotType: string; compatTypes: readonly string[]; icon: string; slotIdx: number }[] = [];
              if (isExhibition) {
                for (let i = 0; i < 20; i++) {
                  galleryItems.push({ key: `painting-${i}`, unitKey: "painting", slotType: "painting", compatTypes: ["photo", "painting"], icon: "\uD83D\uDDBC\uFE0F", slotIdx: i });
                }
                galleryItems.push({ key: "screen-0", unitKey: "screen", slotType: "video", compatTypes: ["video"], icon: "\uD83D\uDCFA", slotIdx: 0 });
              } else {
                for (const slot of activeFurnitureSlots) {
                  galleryItems.push({ ...slot, slotIdx: 0 });
                }
              }
              return galleryItems;
            })().map((slot) => {
              const allAssigned = mems.filter(m => m.displayed !== false && m.displayUnit === slot.unitKey);
              // For exhibition individual slots, match by displayOrder; fallback to next unplaced mem
              const firstMem = isExhibition
                ? allAssigned.find(m => m.displayOrder === slot.slotIdx)
                  || (slot.slotIdx === 0 ? null : null) // exact match only for numbered slots
                  || (() => {
                    // Find mems assigned to painting but without a specific displayOrder
                    const placedOrders = new Set(allAssigned.filter(m => m.displayOrder !== undefined && m.displayOrder !== null).map(m => m.displayOrder));
                    const unplaced = allAssigned.filter(m => m.displayOrder === undefined || m.displayOrder === null);
                    // Assign unplaced mems to empty slots sequentially
                    let unplacedIdx = 0;
                    for (let s = 0; s < 20; s++) {
                      if (!placedOrders.has(s)) {
                        if (s === slot.slotIdx) return unplaced[unplacedIdx] || null;
                        unplacedIdx++;
                      }
                    }
                    return null;
                  })()
                : allAssigned[0] || null;
              const isPicking = pickingSlot === slot.key;
              const slotLabel = isExhibition && slot.unitKey === "painting"
                ? `${t("painting")} ${slot.slotIdx + 1}`
                : slot.unitKey === "screen" ? t("screen")
                : slot.key === "album" ? t("tableAlbum") : t(slot.key);
              const limit = isExhibition ? 1 : (activeSlotCounts[slot.slotType] || 1);
              const assigned = isExhibition ? (firstMem ? [firstMem] : []) : allAssigned;
              return (
                <button
                  key={slot.key}
                  onClick={() => setPickingSlot(slot.key)}
                  style={{
                    background: "rgba(255,255,255,0.72)",
                    backdropFilter: "blur(0.75rem) saturate(1.3)",
                    WebkitBackdropFilter: "blur(0.75rem) saturate(1.3)",
                    borderRadius: "1rem",
                    border: `0.0625rem solid ${isPicking ? accent + "70" : T.color.cream}`,
                    boxShadow: isPicking
                      ? `0 0.5rem 1.5rem ${accent}25, inset 0 0.0625rem 0 rgba(255,255,255,0.7)`
                      : `0 0.125rem 0.5rem rgba(44,44,42,0.05), inset 0 0.0625rem 0 rgba(255,255,255,0.5)`,
                    padding: "0.625rem",
                    transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    position: "relative",
                    minWidth: 0,
                    overflow: "hidden",
                  }}
                >
                  {/* Thumbnail area */}
                  {(() => {
                    // For video memories, prefer thumbnailUrl; for others use dataUrl
                    const thumbSrc = firstMem
                      ? (firstMem.type === "video" && firstMem.thumbnailUrl)
                        ? (firstMem.thumbnailUrl.startsWith("/api/media/") ? firstMem.thumbnailUrl + (firstMem.thumbnailUrl.includes("?") ? "&" : "?") + "stream=1" : firstMem.thumbnailUrl)
                        : (firstMem.dataUrl && firstMem.type !== "video" && firstMem.type !== "audio")
                          ? (firstMem.dataUrl.startsWith("/api/media/") ? firstMem.dataUrl + (firstMem.dataUrl.includes("?") ? "&" : "?") + "stream=1" : firstMem.dataUrl)
                          : null
                      : null;
                    return (
                  <div style={{
                    width: "100%", aspectRatio: "4 / 3", borderRadius: "0.625rem",
                    border: `0.0625rem solid ${T.color.cream}`,
                    overflow: "hidden", position: "relative",
                    background: thumbSrc
                      ? `url(${thumbSrc}) center/cover no-repeat`
                      : firstMem
                        ? `linear-gradient(135deg, hsl(${firstMem.hue}, ${firstMem.s}%, ${firstMem.l + 15}%), hsl(${firstMem.hue}, ${firstMem.s - 10}%, ${firstMem.l}%))`
                        : `linear-gradient(135deg, ${accent}35, ${accent}15)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {/* Show icon for video/audio without thumbnail */}
                    {firstMem && !thumbSrc && (
                      <span style={{ fontSize: "1.75rem", opacity: 0.6 }}>{slot.icon}</span>
                    )}
                    {!firstMem && (
                      <span style={{ fontSize: "1.75rem", opacity: 0.5 }}>{slot.icon}</span>
                    )}
                    {firstMem && (
                      <span
                        role="button"
                        aria-label={t("clearSlot")}
                        onClick={(e) => { e.stopPropagation(); onUpdate(firstMem.id, { displayed: false, displayUnit: undefined, displayOrder: undefined }); }}
                        style={{
                          position: "absolute", top: "0.3125rem", right: "0.3125rem",
                          width: "1.5rem", height: "1.5rem", borderRadius: "50%",
                          background: "rgba(42,34,24,0.75)", color: "#FFF",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.75rem", cursor: "pointer",
                        }}
                      >{"\u2715"}</span>
                    )}
                    {/* Count badge */}
                    <span style={{
                      position: "absolute", bottom: "0.3125rem", right: "0.3125rem",
                      padding: "0.125rem 0.375rem", borderRadius: "0.375rem",
                      background: assigned.length > 0 ? accent : "rgba(42,34,24,0.55)",
                      color: "#FFF", fontFamily: T.font.body, fontSize: "0.5625rem", fontWeight: 600,
                    }}>
                      {assigned.length}/{limit}
                    </span>
                  </div>
                    );
                  })()}
                  {/* Label */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem", minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 500, color: T.color.charcoal,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {slotLabel}
                    </div>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.625rem",
                      color: firstMem ? accent : T.color.muted,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {firstMem?.title || t("tapToChoose")}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Picker modal — opens when a furniture slot is tapped */}
          {pickingSlot && (() => {
            // Exhibition slots have keys like "painting-5", "screen-0"; parse them
            const exhibitionMatch = isExhibition ? pickingSlot.match(/^(painting|screen)-(\d+)$/) : null;
            const slot = exhibitionMatch
              ? { key: pickingSlot, unitKey: exhibitionMatch[1], slotType: exhibitionMatch[1] === "painting" ? "painting" : "video", compatTypes: exhibitionMatch[1] === "painting" ? ["photo", "painting"] : ["video"], icon: exhibitionMatch[1] === "painting" ? "\uD83D\uDDBC\uFE0F" : "\uD83D\uDCFA", slotIdx: parseInt(exhibitionMatch[2]) }
              : activeFurnitureSlots.find(s => s.key === pickingSlot);
            if (!slot) return null;
            const compatible = mems.filter(m => m.dataUrl && slot.compatTypes.includes(m.type));
            const slotIdx = exhibitionMatch ? parseInt(exhibitionMatch[2]) : -1;
            const slotLabel = exhibitionMatch
              ? (exhibitionMatch[1] === "painting" ? `${t("painting")} ${slotIdx + 1}` : t("screen"))
              : (slot.key === "album" ? t("tableAlbum") : t(slot.key));
            return createPortal(
              <div
                onClick={() => setPickingSlot(null)}
                style={{
                  position: "fixed", inset: 0, zIndex: 60,
                  background: "rgba(42,34,24,0.55)",
                  backdropFilter: "blur(0.75rem)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "1rem",
                  animation: "fadeIn .2s ease",
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(1.5rem) saturate(1.4)",
                    WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
                    borderRadius: "1.25rem",
                    border: `0.0625rem solid ${T.color.cream}`,
                    boxShadow: `0 1.5rem 3rem rgba(44,44,42,0.25), inset 0 0.0625rem 0 rgba(255,255,255,0.7)`,
                    padding: "1.25rem",
                    width: "min(40rem, 100%)",
                    maxHeight: "85vh",
                    display: "flex", flexDirection: "column", gap: "0.875rem",
                  }}
                >
                  {/* Picker header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 500, color: T.color.charcoal }}>
                      {slotLabel}
                    </div>
                    <button
                      onClick={() => setPickingSlot(null)}
                      aria-label={t("close")}
                      style={{
                        width: "2.25rem", height: "2.25rem", borderRadius: "50%",
                        border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone,
                        color: T.color.muted, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >{"\u2715"}</button>
                  </div>

                  {/* Picker grid */}
                  <div style={{ overflowY: "auto", maxHeight: "65vh" }}>
                    {compatible.length === 0 ? (
                      <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, textAlign: "center", padding: "2rem 0" }}>
                        {t("noCompatible")}
                      </p>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(7rem, 1fr))", gap: "0.625rem" }}>
                        {compatible.map((mem) => {
                          const isAssigned = mem.displayed !== false && mem.displayUnit === slot.unitKey
                            && (exhibitionMatch ? mem.displayOrder === slotIdx : true);
                          return (
                            <button
                              key={mem.id}
                              onClick={() => {
                                if (isAssigned) {
                                  onUpdate(mem.id, { displayed: false, displayUnit: undefined, displayOrder: undefined });
                                } else if (isExhibition && exhibitionMatch) {
                                  // Exhibition: assign to specific slot position, evict current occupant by displayOrder
                                  const currentOccupant = mems.find(m =>
                                    m.displayed !== false && m.displayUnit === slot.unitKey && m.displayOrder === slotIdx && m.id !== mem.id
                                  );
                                  if (currentOccupant) {
                                    onUpdate(currentOccupant.id, { displayed: false, displayUnit: undefined, displayOrder: undefined });
                                  }
                                  onUpdate(mem.id, { displayed: true, displayUnit: slot.unitKey, displayOrder: slotIdx });
                                } else {
                                  // Check slot capacity and auto-evict (use exhibition-aware counts)
                                  const limit = activeSlotCounts[slot.slotType] || ROOM_SLOT_COUNTS[slot.slotType] || 1;
                                  const occupants = mems.filter(m => m.displayed !== false && m.displayUnit === slot.unitKey && m.id !== mem.id);
                                  if (occupants.length >= limit) {
                                    const oldest = occupants[0];
                                    if (oldest) onUpdate(oldest.id, { displayed: false, displayUnit: undefined });
                                  }
                                  onUpdate(mem.id, { displayed: true, displayUnit: slot.unitKey });
                                }
                                setPickingSlot(null);
                              }}
                              style={{
                                background: isAssigned ? `${accent}15` : "rgba(255,255,255,0.8)",
                                borderRadius: "0.75rem",
                                border: `0.0625rem solid ${isAssigned ? accent : T.color.cream}`,
                                padding: "0.375rem",
                                cursor: "pointer",
                                textAlign: "left",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.375rem",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {(() => {
                                const pSrc = (mem.type === "video" && mem.thumbnailUrl)
                                  ? (mem.thumbnailUrl.startsWith("/api/media/") ? mem.thumbnailUrl + (mem.thumbnailUrl.includes("?") ? "&" : "?") + "stream=1" : mem.thumbnailUrl)
                                  : (mem.dataUrl && mem.type !== "audio")
                                    ? (mem.dataUrl.startsWith("/api/media/") ? mem.dataUrl + (mem.dataUrl.includes("?") ? "&" : "?") + "stream=1" : mem.dataUrl)
                                    : null;
                                return <div style={{
                                  width: "100%", aspectRatio: "4 / 3", borderRadius: "0.5rem",
                                  overflow: "hidden",
                                  background: pSrc
                                    ? `url(${pSrc}) center/cover no-repeat`
                                    : `hsl(${mem.hue}, ${mem.s}%, ${mem.l}%)`,
                                }} />;
                              })()}
                              <div style={{
                                fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 500,
                                color: isAssigned ? accent : T.color.charcoal,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {mem.title}
                              </div>
                              {isAssigned && (
                                <div style={{
                                  fontFamily: T.font.body, fontSize: "0.5rem",
                                  color: accent, fontWeight: 600, textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}>
                                  {t("assigned")}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            , document.body);
          })()}
        </>}

      </div>

      {/* Upload removed — Import Hub handles both import and upload */}

      {/* ─── IMPORT HUB (overlay) ─── */}
      {showImportHub && (
        <ImportHub
          onClose={() => setShowImportHub(false)}
          onImportFiles={handleImportFiles}
          onOpenCloudProvider={(provider) => { setShowImportHub(false); setCloudBrowserProvider(provider); }}
          initialRoomId={room?.id}
        />
      )}

      {cloudBrowserProvider && (
        <CloudBrowser
          provider={cloudBrowserProvider}
          onClose={() => setCloudBrowserProvider(null)}
          onImport={async (cloudItems: CloudItem[]) => {
            const targetRoom = room?.id;
            if (!targetRoom || cloudItems.length === 0) return;
            const provider = cloudItems[0].provider;
            const endpointMap: Record<string, string> = {
              dropbox: "/api/integrations/dropbox/import",
              googlePhotos: "/api/integrations/google/import",
              onedrive: "/api/integrations/onedrive/import",
              box: "/api/integrations/box/import",
            };
            const endpoint = endpointMap[provider];
            if (endpoint) {
              let body: Record<string, unknown>;
              if (provider === "dropbox") {
                body = { filePaths: cloudItems.map((i) => i.path || i.id), roomId: targetRoom };
              } else if (provider === "googlePhotos") {
                body = { photoIds: cloudItems.map((i) => i.id), roomId: targetRoom };
              } else if (provider === "onedrive") {
                body = { itemIds: cloudItems.map((i) => i.id), roomId: targetRoom };
              } else {
                body = { fileIds: cloudItems.map((i) => i.id), roomId: targetRoom };
              }
              try {
                const res = await fetch(endpoint, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                if (res.ok) {
                  await useMemoryStore.getState().fetchRoomMemories(targetRoom);
                }
              } catch { /* ignore */ }
            }
            setCloudBrowserProvider(null);
          }}
        />
      )}

      {/* ─── ROOM MEDIA PLAYER (full-screen viewer) ─── */}
      {mediaPlayerIndex !== null && (
        <div onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()} style={{ position: "fixed", inset: 0, zIndex: 100 }}>
          <RoomMediaPlayer
            memories={displayedMems}
            initialIndex={mediaPlayerIndex}
            onClose={() => setMediaPlayerMemId(null)}
            onEdit={(mem) => {
              setMediaPlayerMemId(null);
              onSelect?.(mem);
            }}
            onUpdate={onUpdate}
          />
        </div>
      )}

      {/* ─── MOVE-TO-ROOM DIALOG ─── */}
      {movingMem && (
        <div
          onClick={() => { setMovingMem(null); setExpandedMoveWing(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(44,44,42,.35)",
            backdropFilter: "blur(0.75rem)",
            WebkitBackdropFilter: "blur(0.75rem)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.2s ease both",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,.96)",
              backdropFilter: "blur(1.5rem) saturate(1.4)",
              WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
              borderRadius: "1.25rem",
              boxShadow: "0 1.5rem 3rem rgba(44,44,42,.18), 0 0.5rem 1.25rem rgba(44,44,42,.08)",
              border: `0.0625rem solid ${T.color.cream}`,
              width: "min(26rem, 90vw)",
              maxHeight: "min(32rem, 80vh)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `0.0625rem solid ${T.color.cream}`, flexShrink: 0 }}>
              <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: T.color.charcoal, margin: 0 }}>
                {t("moveTo")}
              </h3>
              <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: "0.25rem 0 0" }}>
                <strong>{movingMem.title}</strong>
              </p>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "0.75rem 0" }}>
              {getWings().map(w => {
                const wRooms = getWingRooms(w.id);
                const isExpanded = expandedMoveWing === w.id;
                return (
                  <div key={w.id}>
                    <button
                      onClick={() => setExpandedMoveWing(isExpanded ? null : w.id)}
                      style={{
                        width: "100%", padding: "0.625rem 1.5rem",
                        background: isExpanded ? `${w.accent}0A` : "transparent",
                        border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "0.625rem",
                        fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                        color: T.color.charcoal,
                      }}
                    >
                      <WingIcon wingId={w.id} size={18} color={w.accent} />
                      <span style={{ flex: 1, textAlign: "left" }}>{translateWingName(w, tWings)}</span>
                      <span style={{ fontSize: "0.6875rem", color: T.color.muted, fontWeight: 500 }}>{wRooms.length}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={T.color.muted} strokeWidth="1.5" strokeLinecap="round"
                        style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}>
                        <path d="M4 2l4 4-4 4" />
                      </svg>
                    </button>
                    {isExpanded && wRooms.map(r => {
                      const isCurrent = r.id === room?.id;
                      return (
                        <button key={r.id}
                          onClick={() => { if (!isCurrent) handleMoveToRoom(r.id); }}
                          disabled={isCurrent}
                          style={{
                            width: "100%", padding: "0.5rem 1.5rem 0.5rem 3.25rem",
                            background: isCurrent ? `${w.accent}08` : "transparent",
                            border: "none", cursor: isCurrent ? "default" : "pointer",
                            display: "flex", alignItems: "center", gap: "0.5rem",
                            fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
                            color: isCurrent ? T.color.muted : T.color.walnut,
                            opacity: isCurrent ? 0.6 : 1,
                          }}
                          onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = `${w.accent}12`; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? `${w.accent}08` : "transparent"; }}
                        >
                          <RoomIcon roomId={r.id} size={15} color={w.accent} />
                          <span style={{ flex: 1, textAlign: "left" }}>{translateRoomName(r, tWings)}</span>
                          {isCurrent && <span style={{ fontSize: "0.625rem", fontWeight: 500, color: w.accent, textTransform: "uppercase" as const }}>{t("currentRoom")}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── MOVED TOAST ─── */}
      {movedToast && (
        <div style={{
          position: "fixed", bottom: "6rem", left: "50%", transform: "translateX(-50%)",
          background: `${T.color.charcoal}f0`, color: "#fff",
          padding: "0.625rem 1.25rem", borderRadius: "0.75rem",
          fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
          boxShadow: "0 0.5rem 1.5rem rgba(0,0,0,0.3)",
          zIndex: 10000, animation: "fadeIn 0.2s ease both",
        }}>
          {t("memoryMoved")}
        </div>
      )}
    </div>
  );
}
