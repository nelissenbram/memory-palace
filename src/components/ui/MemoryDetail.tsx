"use client";
import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { localeDateCodes, type Locale } from "@/i18n/config";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { translateWingName, translateRoomName } from "@/lib/constants/wings";
const ImageEditor = lazy(() => import("@/components/ui/ImageEditor"));
import ShareCard from "@/components/ui/ShareCard";
import { geocodeLocationName, geocodeAutocomplete } from "@/lib/geocode";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { WingIcon, RoomIcon } from "@/components/ui/WingRoomIcons";
import type { GeocodeSuggestion } from "@/lib/geocode";

/* ═══════════════════════════════════════════════════════════
   SVG ICONS — elegant thin-line Roman-aesthetic icons
   20x20 viewBox, 1.5 strokeWidth, rounded caps
   ═══════════════════════════════════════════════════════════ */

const Icon = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
    stroke={color || T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    {children}
  </svg>
);

const QuillIcon = ({ color }: { color?: string }) => (
  <Icon color={color}><path d="M3 17l4-4"/><path d="M7 13L15 3c1.5-1.5 3.5-.5 3 2L14 13c-.5 1-1.5 1.5-3 1.5H7z"/><path d="M10 10l-3 3"/></Icon>
);

const CalendarIcon = ({ color }: { color?: string }) => (
  <Icon color={color}><rect x="3" y="4" width="14" height="14" rx="2"/><line x1="3" y1="8" x2="17" y2="8"/><line x1="7" y1="2" x2="7" y2="5"/><line x1="13" y1="2" x2="13" y2="5"/></Icon>
);

const MapPinIcon = ({ color }: { color?: string }) => (
  <Icon color={color}><path d="M10 18S4 12.5 4 8a6 6 0 1112 0c0 4.5-6 10-6 10z"/><circle cx="10" cy="8" r="2"/></Icon>
);

const TagIcon = ({ color }: { color?: string }) => (
  <Icon color={color}><path d="M2 10V4a2 2 0 012-2h6l8 8-6 6-8-8z"/><circle cx="6" cy="6" r="1" fill={color || T.color.gold} stroke="none"/></Icon>
);

const FrameIcon = ({ color }: { color?: string }) => (
  <Icon color={color}><rect x="2" y="3" width="16" height="14" rx="1.5"/><rect x="4.5" y="5.5" width="11" height="9" rx="0.5"/></Icon>
);

const PaletteIcon = ({ color }: { color?: string }) => (
  <Icon color={color}><path d="M10 2a8 8 0 00-1 15.9c1 .1 1.5-.7 1.5-1.4 0-.5 0-1-.7-1.5-.4-.3-.5-.8-.5-1.2A1.8 1.8 0 0111 12c2.2 0 5-1 5-5A6 6 0 0010 2z"/><circle cx="6.5" cy="8" r="1" fill={color || T.color.gold} stroke="none"/><circle cx="9" cy="5.5" r="1" fill={color || T.color.gold} stroke="none"/><circle cx="12.5" cy="5.5" r="1" fill={color || T.color.gold} stroke="none"/><circle cx="14.5" cy="8" r="1" fill={color || T.color.gold} stroke="none"/></Icon>
);

const PeopleIcon = ({ color }: { color?: string }) => (
  <Icon color={color}><circle cx="7" cy="6" r="2.5"/><circle cx="14" cy="7" r="2"/><path d="M2 16c0-3 2.5-5 5-5s5 2 5 5"/><path d="M12 16c0-2.5 1.5-4 3-4s2.5 1.5 2.5 4"/></Icon>
);

const EyeIcon = ({ color }: { color?: string }) => (
  <Icon color={color}><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/></Icon>
);

const DoorIcon = ({ color }: { color?: string }) => (
  <Icon color={color}><rect x="4" y="2" width="12" height="16" rx="1.5"/><path d="M4 18h12"/><circle cx="13" cy="11" r="0.8" fill={color || T.color.gold} stroke="none"/><path d="M8 2v16"/></Icon>
);

const HourglassIcon = ({ color }: { color?: string }) => (
  <Icon color={color}><path d="M5 2h10"/><path d="M5 18h10"/><path d="M6 2c0 4 4 5 4 8s-4 4-4 8"/><path d="M14 2c0 4-4 5-4 8s4 4 4 8"/></Icon>
);

const ShareIcon = ({ color }: { color?: string }) => (
  <Icon color={color}><circle cx="14" cy="4" r="2.5"/><circle cx="4" cy="10" r="2.5"/><circle cx="14" cy="16" r="2.5"/><line x1="6.3" y1="11.2" x2="11.7" y2="14.8"/><line x1="6.3" y1="8.8" x2="11.7" y2="5.2"/></Icon>
);

const TrashIcon = ({ color }: { color?: string }) => (
  <Icon color={color || T.color.error}><path d="M4 5h12"/><path d="M8 5V3.5a1 1 0 011-1h2a1 1 0 011 1V5"/><path d="M5.5 5l.8 11.5a1.5 1.5 0 001.5 1.5h4.4a1.5 1.5 0 001.5-1.5L14.5 5"/></Icon>
);

const CloseIcon = ({ color }: { color?: string }) => (
  <Icon color={color || T.color.charcoal}><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></Icon>
);

const ExpandIcon = ({ color }: { color?: string }) => (
  <Icon color={color || "#FFF"}><polyline points="4 14 4 16 6 16"/><polyline points="14 4 16 4 16 6"/><polyline points="16 14 16 16 14 16"/><polyline points="4 4 4 6 6 4"/></Icon>
);

const LockIcon = ({ color }: { color?: string }) => (
  <Icon color={color}><rect x="5" y="9" width="10" height="8" rx="1.5"/><path d="M7 9V6a3 3 0 016 0v3"/></Icon>
);

const CheckIcon = ({ color }: { color?: string }) => (
  <Icon color={color || T.color.success}><polyline points="4 10 8 14 16 5"/></Icon>
);

const ChevronIcon = ({ color, down }: { color?: string; down?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    stroke={color || T.color.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: down ? "rotate(90deg)" : "rotate(0deg)", transition: "transform .2s ease", flexShrink: 0 }}>
    <polyline points="5 3 9 7 5 11"/>
  </svg>
);

/* ═══════════════════════════════════════════════════════════
   DISPLAY TYPE SVG ICONS (replacing emoji)
   ═══════════════════════════════════════════════════════════ */

const DisplayIcon = ({ type, color, size = 20 }: { type: string; color: string; size?: number }) => {
  const s = size;
  const vb = `0 0 ${s} ${s}`;
  const props = { width: s, height: s, viewBox: vb, fill: "none", stroke: color, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "photo": return <svg {...props}><rect x="2" y="3" width="16" height="14" rx="1.5"/><circle cx="7" cy="8" r="2"/><path d="M2 14l4-4 3 3 4-5 5 6"/></svg>;
    case "painting": return <svg {...props}><rect x="1" y="2" width="18" height="16" rx="0.5"/><rect x="3" y="4" width="14" height="12" rx="0.5"/><path d="M6 10c2-3 4 1 6-2"/></svg>;
    case "video": return <svg {...props}><rect x="2" y="4" width="12" height="12" rx="1.5"/><path d="M14 8l4-2v8l-4-2"/></svg>;
    case "album": return <svg {...props}><path d="M4 3h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M5 3V2"/><path d="M15 3V2"/><line x1="7" y1="8" x2="13" y2="8"/><line x1="7" y1="11" x2="11" y2="11"/></svg>;
    case "orb": return <svg {...props}><circle cx="10" cy="10" r="7"/><ellipse cx="10" cy="10" rx="3" ry="7"/><path d="M3 10h14"/></svg>;
    case "case": return <svg {...props}><path d="M4 18V4c0-1 .5-2 2-2h8c1.5 0 2 1 2 2v14"/><path d="M3 18h14"/><ellipse cx="10" cy="10" rx="3" ry="4"/></svg>;
    case "audio": return <svg {...props}><path d="M3 8v4"/><path d="M6 6v8"/><path d="M9 4v12"/><path d="M12 7v6"/><path d="M15 5v10"/><path d="M18 8v4"/></svg>;
    case "document": return <svg {...props}><path d="M5 2h7l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M12 2v4h4"/><line x1="7" y1="10" x2="13" y2="10"/><line x1="7" y1="13" x2="11" y2="13"/></svg>;
    default: return <svg {...props}><rect x="2" y="3" width="16" height="14" rx="1.5"/></svg>;
  }
};

/* Visibility SVG icons */
const VisIcon = ({ vis, color, size = 18 }: { vis: string; color: string; size?: number }) => {
  const props = { width: size, height: size, viewBox: `0 0 ${size} ${size}`, fill: "none", stroke: color, strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (vis) {
    case "private": return <svg {...props}><rect x="4" y="8" width="10" height="7" rx="1.5"/><path d="M6 8V5.5a3 3 0 016 0V8"/></svg>;
    case "shared": return <svg {...props}><circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><path d="M2 15c0-2.5 2-4 4-4s4 1.5 4 4"/><path d="M10 15c0-2.5 1.5-4 3-4s3 1.5 3 4"/></svg>;
    case "family": return <svg {...props}><circle cx="9" cy="4" r="2"/><path d="M5 15c0-3 2-5 4-5s4 2 4 5"/><circle cx="4" cy="8" r="1.5"/><circle cx="14" cy="8" r="1.5"/><path d="M2 14c0-1.5 1-2.5 2-2.5"/><path d="M16 14c0-1.5-1-2.5-2-2.5"/></svg>;
    case "public": return <svg {...props}><circle cx="9" cy="9" r="7"/><ellipse cx="9" cy="9" rx="3" ry="7"/><line x1="2" y1="9" x2="16" y2="9"/></svg>;
    default: return null;
  }
};

/* ═══════════════════════════════════════════════════════════
   DISPLAY TYPES constant
   ═══════════════════════════════════════════════════════════ */
const DISPLAY_TYPES: [string, string][] = [
  ["photo", "typeFrame"], ["painting", "typePainting"], ["video", "typeScreen"], ["album", "typeAlbum"],
  ["orb", "typeOrb"], ["case", "typeVitrine"], ["audio", "typeAudio"], ["document", "typeDocument"],
  ["interview", "typeInterview"], ["voice", "typeInterview"],
];

const VISIBILITY_OPTIONS = ["private", "shared", "family", "public"] as const;

/* ═══════════════════════════════════════════════════════════
   SAVED TOAST
   ═══════════════════════════════════════════════════════════ */
function SavedToast({ visible }: { visible: boolean }) {
  const { t } = useTranslation("memoryDetail");
  return (
    <div style={{
      position: "fixed", bottom: "2rem", left: "50%", transform: `translateX(-50%) translateY(${visible ? 0 : "1rem"})`,
      opacity: visible ? 1 : 0, transition: "all .3s ease",
      background: T.color.charcoal, color: T.color.white, fontFamily: T.font.body,
      fontSize: "0.8125rem", fontWeight: 600, padding: "0.5rem 1.25rem",
      borderRadius: "2rem", boxShadow: "0 4px 20px rgba(0,0,0,.2)",
      display: "flex", alignItems: "center", gap: "0.375rem", zIndex: 200, pointerEvents: "none",
    }}>
      <CheckIcon color="#FFF" /> {t("saved")}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ACTION CARD COMPONENT
   ═══════════════════════════════════════════════════════════ */
interface ActionCardProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  value: string;
  isOpen: boolean;
  onToggle: () => void;
  accent: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}

function ActionCard({ id, icon, title, value, isOpen, onToggle, accent, children, extra }: ActionCardProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen, children]);

  return (
    <div style={{
      background: T.color.white,
      border: `1px solid ${isOpen ? accent + "40" : T.color.cream}`,
      borderRadius: "0.75rem",
      overflow: "hidden",
      transition: "border-color .2s ease, box-shadow .2s ease",
      boxShadow: isOpen ? `0 2px 12px ${accent}12` : "none",
    }}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`action-${id}`}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "0.625rem",
          padding: "0.75rem 1rem", background: "none", border: "none", cursor: "pointer",
          fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
          textAlign: "left",
        }}
      >
        {icon}
        <span style={{ fontWeight: 600, flex: "0 0 auto" }}>{title}</span>
        <span style={{
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          color: T.color.muted, fontSize: "0.75rem", fontStyle: value ? "normal" : "italic",
        }}>{value}</span>
        {extra && !isOpen && <span style={{ flexShrink: 0 }}>{extra}</span>}
        <ChevronIcon color={isOpen ? accent : T.color.muted} down={isOpen} />
      </button>
      <div
        id={`action-${id}`}
        style={{
          maxHeight: isOpen ? "62.5rem" : "0", overflow: "hidden",
          transition: "max-height .25s cubic-bezier(.23,1,.32,1)",
        }}
      >
        <div ref={contentRef} style={{ padding: "0 1rem 1rem" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

interface MemoryDetailProps {
  mem: Mem;
  room: WingRoom | null | undefined;
  wing: Wing | null | undefined;
  onClose: () => void;
  onDelete: (memId: string) => void;
  onUpdate: (memId: string, updates: Partial<Mem>) => void;
}

export default function MemoryDetail({ mem, room, wing, onClose, onDelete, onUpdate }: MemoryDetailProps) {
  const isMobile = useIsMobile();
  const { t, locale } = useTranslation("memoryDetail");
  const { t: tc } = useTranslation("common");
  const { t: tWings } = useTranslation("wings");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const accent = wing?.accent || T.color.terracotta;

  // ── State ──
  const [title, setTitle] = useState(mem.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [desc, setDesc] = useState(mem.desc || "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [openAction, setOpenAction] = useState<string | null>(null);
  const [imageEditing, setImageEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Action-specific state
  const [historicalContext, setHistoricalContext] = useState(mem.historicalContext || "");
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState("");
  const [memDate, setMemDate] = useState(mem.createdAt ? mem.createdAt.slice(0, 10) : "");
  const [locationName, setLocationName] = useState(mem.locationName || "");
  const [locationLat, setLocationLat] = useState(mem.lat?.toString() || "");
  const [locationLng, setLocationLng] = useState(mem.lng?.toString() || "");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocodeSuccess, setGeocodeSuccess] = useState(false);
  const autocompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationWrapperRef = useRef<HTMLDivElement>(null);
  const [displayType, setDisplayType] = useState(mem.type);
  const [visibility, setVisibility] = useState<"private" | "shared" | "family" | "public">(mem.visibility || "private");
  const [peopleTags, setPeopleTags] = useState<string[]>((mem as any).people || []);
  const [aiLabelLoading, setAiLabelLoading] = useState(false);
  const [aiLabelError, setAiLabelError] = useState<string | null>(null);
  const [aiLabelResult, setAiLabelResult] = useState<string | null>(null);
  const [expandedMoveWing, setExpandedMoveWing] = useState<string | null>(null);
  const [movedToast, setMovedToast] = useState(false);
  const { moveMemory } = useMemoryStore();
  const { getWings, getWingRooms } = useRoomStore();
  const [newPerson, setNewPerson] = useState("");
  const [revealDate, setRevealDate] = useState(mem.revealDate || "");
  const [resolutionGoal, setResolutionGoal] = useState(mem.resolution?.goal || "");
  const [resProgress, setResProgress] = useState(mem.resolution?.progress ?? 0);

  // ── Time Capsule logic ──
  const todayStr = new Date().toLocaleDateString("sv-SE");
  const isTimeCapsule = !!mem.revealDate;
  const isLocked = isTimeCapsule && (mem.revealDate as string) > todayStr;
  const isRevealed = isTimeCapsule && !isLocked;
  const daysUntilReveal = isLocked
    ? Math.ceil((new Date(mem.revealDate! + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  // ── Auto-save helper ──
  const showSaved = useCallback(() => {
    setSavedVisible(true);
    setTimeout(() => setSavedVisible(false), 1600);
  }, []);

  const autoSave = useCallback((updates: Partial<Mem>) => {
    onUpdate(mem.id, updates);
    showSaved();
  }, [mem.id, onUpdate, showSaved]);

  // ── Title save ──
  const saveTitle = useCallback(() => {
    if (title.trim() && title !== mem.title) {
      autoSave({ title: title.trim() });
    }
    setEditingTitle(false);
  }, [title, mem.title, autoSave]);

  // ── Desc save ──
  const saveDesc = useCallback(() => {
    if (desc !== (mem.desc || "")) {
      autoSave({ desc });
    }
    setEditingDesc(false);
  }, [desc, mem.desc, autoSave]);

  // ── Location autocomplete ──
  const handleLocationInput = useCallback((value: string) => {
    setLocationName(value);
    setGeocodeError("");
    setGeocodeSuccess(false);
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
    if (value.trim().length < 2) {
      setGeocodeSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    autocompleteTimer.current = setTimeout(async () => {
      const results = await geocodeAutocomplete(value);
      setGeocodeSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 300);
  }, []);

  const selectSuggestion = useCallback((s: GeocodeSuggestion) => {
    setLocationName(s.label);
    setLocationLat(s.lat.toFixed(6));
    setLocationLng(s.lng.toFixed(6));
    setGeocodeSuggestions([]);
    setShowSuggestions(false);
    setGeocodeSuccess(true);
    setTimeout(() => setGeocodeSuccess(false), 3000);
    autoSave({ locationName: s.label, lat: s.lat, lng: s.lng });
  }, [autoSave]);

  // Click outside to dismiss suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locationWrapperRef.current && !locationWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Historical context ──
  const fetchHistoricalContext = useCallback(async () => {
    setContextLoading(true);
    setContextError("");
    try {
      const res = await fetch("/api/ai-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: mem.title, description: mem.desc,
          date: mem.createdAt, location: mem.locationName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("failedToGenerateContext"));
      setHistoricalContext(data.context);
      autoSave({ historicalContext: data.context });
    } catch (err: any) {
      setContextError(err.message || t("couldNotGenerateContext"));
    } finally {
      setContextLoading(false);
    }
  }, [mem.id, mem.title, mem.desc, mem.createdAt, mem.locationName, autoSave, t]);

  // ── Image save ──
  const handleImageSave = (editedDataUrl: string) => {
    autoSave({ dataUrl: editedDataUrl });
    setImageEditing(false);
  };

  // ── Action toggle (accordion) ──
  const toggleAction = (id: string) => {
    setOpenAction(prev => prev === id ? null : id);
  };

  // ── Breadcrumb ──
  const breadcrumb = [wing?.name, room?.name, mem.title].filter(Boolean).join("  /  ");

  // ── Panel dimensions ──
  const panelWidth = isMobile ? "100%" : "32rem";

  // ── Styles ──
  const labelStyle: React.CSSProperties = {
    fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
    letterSpacing: ".5px", textTransform: "uppercase", display: "block",
    marginBottom: "0.375rem", fontWeight: 600,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
    border: `1px solid ${T.color.cream}`, background: T.color.white,
    fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
    outline: "none", boxSizing: "border-box",
  };

  const goldDivider: React.CSSProperties = {
    height: "1px", background: `linear-gradient(90deg, transparent, ${T.color.gold}40, transparent)`,
    margin: "0.75rem 0",
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        role="button"
        aria-label={tc("close")}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(42,34,24,.45)", backdropFilter: "blur(12px)",
          zIndex: 50, animation: "mdFadeIn .25s ease",
        }}
      />

      {/* Slide-in panel */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("panelTitle")}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }}
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: panelWidth,
          maxWidth: "100vw",
          background: T.color.linen,
          zIndex: 51,
          display: "flex", flexDirection: "column",
          boxShadow: "-8px 0 40px rgba(44,44,42,.15)",
          animation: isMobile ? "mdSlideUp .3s cubic-bezier(.23,1,.32,1)" : "mdSlideIn .3s cubic-bezier(.23,1,.32,1)",
          overflow: "hidden",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* ── Header bar ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.75rem 1rem",
          borderBottom: `1px solid ${T.color.cream}`,
          background: T.color.white,
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            flex: 1, marginRight: "0.5rem",
          }}>
            {breadcrumb}
          </div>
          <button
            onClick={onClose}
            aria-label={tc("close")}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "0.25rem", borderRadius: "0.375rem",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

          {/* ═══ SECTION 1: MEDIA DISPLAY ═══ */}
          <div style={{
            position: "relative",
            height: isMobile ? "40vh" : "16rem",
            background: isLocked
              ? `linear-gradient(145deg, hsl(${mem.hue},${Math.max(mem.s - 20, 10)}%,${Math.max(mem.l - 25, 20)}%), hsl(${mem.hue + 18},${Math.max(mem.s - 25, 8)}%,${Math.max(mem.l - 30, 15)}%))`
              : mem.dataUrl
                ? `url(${mem.dataUrl}) center/cover`
                : `linear-gradient(145deg, hsl(${mem.hue},${mem.s}%,${mem.l}%), hsl(${mem.hue + 18},${mem.s - 5}%,${mem.l - 6}%))`,
            overflow: "hidden",
          }}>
            {/* Warm vignette overlay for photos */}
            {!isLocked && mem.dataUrl && (
              <div style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse at center, transparent 50%, rgba(42,34,24,.35) 100%)",
                pointerEvents: "none",
              }} />
            )}

            {/* Gradient at bottom */}
            <div style={{
              position: "absolute", inset: 0,
              background: isLocked
                ? "linear-gradient(180deg, transparent 20%, rgba(20,15,10,.8) 100%)"
                : "linear-gradient(180deg, transparent 50%, rgba(42,34,24,.5) 100%)",
              pointerEvents: "none",
            }} />

            {/* Locked capsule state */}
            {isLocked && (
              <>
                <div style={{
                  position: "absolute", inset: 0, display: "flex",
                  alignItems: "center", justifyContent: "center", zIndex: 1,
                }}>
                  <LockIcon color="rgba(255,220,150,.6)" />
                </div>
                <div style={{
                  position: "absolute", inset: 0,
                  background: "radial-gradient(ellipse at center, rgba(255,220,150,.08) 0%, transparent 70%)",
                  animation: "mdCapsuleShimmer 3s ease-in-out infinite",
                }} />
              </>
            )}

            {/* No image placeholder */}
            {!isLocked && !mem.dataUrl && (
              <div style={{
                position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center", opacity: 0.2,
              }}>
                <DisplayIcon type="photo" color={T.color.cream} size={48} />
              </div>
            )}

            {/* Time capsule revealed badge */}
            {isRevealed && (
              <div style={{
                position: "absolute", top: "0.75rem", right: "0.875rem",
                background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
                color: "#FFF", fontFamily: T.font.body, fontSize: "0.6875rem",
                fontWeight: 600, padding: "0.25rem 0.625rem", borderRadius: "0.5rem",
                boxShadow: "0 2px 8px rgba(0,0,0,.2)", zIndex: 2,
              }}>
                {t("timeCapsuleOpened")}
              </div>
            )}

            {/* View Full button */}
            {!isLocked && mem.dataUrl && (
              <button
                onClick={() => setShowFullImage(true)}
                style={{
                  position: "absolute", top: "0.75rem", left: "0.875rem",
                  background: "rgba(42,34,24,.5)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,.15)", borderRadius: "0.5rem",
                  padding: "0.375rem 0.625rem", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "0.375rem",
                  color: "#FFF", fontFamily: T.font.body, fontSize: "0.6875rem",
                  zIndex: 2,
                }}
              >
                <ExpandIcon /> {t("viewFull")}
              </button>
            )}

            {/* Edit picture button */}
            {!isLocked && mem.dataUrl && (
              <button
                onClick={() => setImageEditing(true)}
                style={{
                  position: "absolute", bottom: "0.75rem", right: "0.875rem",
                  background: "rgba(42,34,24,.5)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,.15)", borderRadius: "0.5rem",
                  padding: "0.375rem 0.625rem", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "0.375rem",
                  color: "#FFF", fontFamily: T.font.body, fontSize: "0.6875rem",
                  zIndex: 2,
                }}
              >
                <PaletteIcon color="#FFF" /> {t("editImage")}
              </button>
            )}
          </div>

          {/* ═══ SECTION 2: STORY & DETAILS ═══ */}
          <div style={{ padding: "1.25rem 1.5rem 2rem" }}>

            {/* ── Locked capsule info ── */}
            {isLocked && (
              <div style={{
                background: "linear-gradient(135deg, rgba(42,34,24,.06), rgba(200,168,104,.1))",
                border: `1px solid ${T.color.cream}`, borderRadius: "0.75rem",
                padding: "1.25rem", marginBottom: "1.25rem", textAlign: "center",
              }}>
                <div style={{ marginBottom: "0.625rem" }}>
                  <LockIcon color={T.color.gold} />
                </div>
                <div style={{
                  fontFamily: T.font.display, fontSize: "1.125rem", color: T.color.charcoal,
                  marginBottom: "0.25rem",
                }}>
                  {daysUntilReveal === 1
                    ? t("opensTomorrow")
                    : daysUntilReveal <= 30
                      ? t("opensInDays", { count: String(daysUntilReveal) })
                      : t("opensOn", { date: new Date(mem.revealDate! + "T00:00:00").toLocaleDateString(localeDateCodes[locale as Locale], { month: "long", day: "numeric", year: "numeric" }) })}
                </div>
                <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>
                  {t("capsuleSealed")}
                </div>
                {mem.resolution && (
                  <div style={{
                    marginTop: "0.75rem", padding: "0.625rem 0.875rem",
                    borderRadius: "0.625rem", background: "rgba(74,103,65,.08)",
                    border: `1px solid ${T.color.sage}30`,
                  }}>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.75rem", fontStyle: "italic",
                      color: T.color.walnut, lineHeight: 1.5,
                    }}>
                      {t("resolutionGoal", { date: new Date(mem.revealDate! + "T00:00:00").toLocaleDateString(localeDateCodes[locale as Locale], { month: "long", day: "numeric", year: "numeric" }) })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── A. Title — large editable ── */}
            {!isLocked && (
              editingTitle ? (
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitle(mem.title); setEditingTitle(false); } }}
                  autoFocus
                  style={{
                    fontFamily: T.font.display, fontSize: "1.625rem", color: T.color.charcoal,
                    background: "transparent", border: "none", borderBottom: `2px solid ${accent}`,
                    width: "100%", outline: "none", padding: "0.25rem 0",
                    marginBottom: "0.5rem", boxSizing: "border-box",
                  }}
                />
              ) : (
                <h2
                  onClick={() => setEditingTitle(true)}
                  title={t("clickToEdit")}
                  style={{
                    fontFamily: T.font.display, fontSize: "1.625rem", fontWeight: 600,
                    color: T.color.charcoal, margin: "0 0 0.5rem 0",
                    cursor: "text", lineHeight: 1.3,
                    borderBottom: "2px solid transparent",
                    transition: "border-color .15s",
                    display: "flex", alignItems: "baseline", gap: "0.5rem",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = T.color.cream)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
                >
                  {mem.title}
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke={T.color.sandstone} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.5 }}>
                    <path d="M3 17l4-4"/><path d="M7 13L15 3c1.5-1.5 3.5-.5 3 2L14 13c-.5 1-1.5 1.5-3 1.5H7z"/>
                  </svg>
                </h2>
              )
            )}

            {/* ── B. Description/Story — always visible ── */}
            {!isLocked && (
              editingDesc ? (
                <textarea
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  onBlur={saveDesc}
                  placeholder={t("descriptionPlaceholder")}
                  rows={6}
                  autoFocus
                  style={{
                    width: "100%", padding: "1rem", borderRadius: "0.75rem",
                    border: `1px solid ${accent}40`, background: T.color.white,
                    fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.charcoal,
                    outline: "none", boxSizing: "border-box", marginBottom: "1.25rem",
                    resize: "vertical", lineHeight: 1.8, minHeight: "8rem",
                  }}
                />
              ) : (
                <div
                  onClick={() => setEditingDesc(true)}
                  title={t("clickToEdit")}
                  style={{
                    fontFamily: T.font.body, fontSize: "0.9375rem",
                    color: (mem.desc || desc) ? T.color.charcoal : T.color.muted,
                    lineHeight: 1.8, marginBottom: "1.25rem", cursor: "text",
                    padding: "0.875rem 1rem", borderRadius: "0.75rem",
                    background: (mem.desc || desc) ? `${accent}06` : T.color.white,
                    border: `1px solid ${(mem.desc || desc) ? `${accent}15` : T.color.cream}`,
                    fontStyle: (mem.desc || desc) ? "normal" : "italic",
                    transition: "border-color .2s, background .2s, box-shadow .2s",
                    minHeight: (mem.desc || desc) ? "auto" : "3rem",
                    position: "relative",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${accent}30`; e.currentTarget.style.boxShadow = `0 2px 8px ${accent}08`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = (mem.desc || desc) ? `${accent}15` : T.color.cream; e.currentTarget.style.boxShadow = "none"; }}
                >
                  {(mem.desc || desc) ? (
                    <>
                      {(mem.desc || desc)}
                      <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke={T.color.sandstone} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", marginLeft: "0.375rem", opacity: 0.4, verticalAlign: "middle" }}>
                        <path d="M3 17l4-4"/><path d="M7 13L15 3c1.5-1.5 3.5-.5 3 2L14 13c-.5 1-1.5 1.5-3 1.5H7z"/>
                      </svg>
                    </>
                  ) : t("descriptionPlaceholder")}
                </div>
              )
            )}

            {/* ── Resolution progress (if revealed time capsule or has resolution) ── */}
            {!isLocked && mem.resolution && (
              <div style={{
                marginBottom: "1rem", padding: "1rem", borderRadius: "0.75rem",
                border: `1px solid ${T.color.sage}30`,
                background: "linear-gradient(135deg, rgba(74,103,65,.06), rgba(74,103,65,.02))",
              }}>
                <div style={{ ...labelStyle, color: T.color.sage }}>{t("resolutionLabel")}</div>
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.charcoal,
                  lineHeight: 1.5, marginBottom: "0.75rem",
                }}>{mem.resolution.goal}</div>
                {mem.resolution.targetDate && (
                  <div style={{
                    fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
                    marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.375rem",
                  }}>
                    <span>{t("target")}</span>
                    <span style={{ fontWeight: 600, color: T.color.walnut }}>
                      {new Date(mem.resolution.targetDate + "T00:00:00").toLocaleDateString(localeDateCodes[locale as Locale], { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {(() => {
                      const d = Math.ceil((new Date(mem.resolution.targetDate! + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return d > 0
                        ? <span style={{ color: T.color.sage, fontStyle: "italic" }}>{t("daysLeft", { count: String(d) })}</span>
                        : <span style={{ color: T.color.error, fontStyle: "italic" }}>{t("pastDue")}</span>;
                    })()}
                  </div>
                )}
                {typeof mem.resolution.progress === "number" && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
                      <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>{t("progress")}</span>
                      <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: resProgress >= 100 ? T.color.success : T.color.sage }}>{resProgress}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={resProgress}
                      onChange={e => setResProgress(Number(e.target.value))}
                      style={{ width: "100%", accentColor: T.color.sage, marginBottom: "0.5rem" }}
                    />
                    <div style={{
                      width: "100%", height: "0.375rem", borderRadius: "0.1875rem",
                      background: `${T.color.sandstone}25`, overflow: "hidden", marginBottom: "0.625rem",
                    }}>
                      <div style={{
                        width: `${resProgress}%`, height: "100%", borderRadius: "0.1875rem",
                        background: resProgress >= 100
                          ? `linear-gradient(90deg, ${T.color.success}, #5A8751)`
                          : `linear-gradient(90deg, ${T.color.sage}cc, ${T.color.sage})`,
                        transition: "width .3s ease",
                      }} />
                    </div>
                    {resProgress !== (mem.resolution.progress ?? 0) && (
                      <button onClick={() => {
                        const updatedRes = { ...mem.resolution!, progress: resProgress };
                        autoSave({ resolution: updatedRes });
                      }} style={{
                        width: "100%", padding: "0.5rem 0.875rem", borderRadius: "0.5rem",
                        border: "none", background: T.color.sage, color: "#FFF",
                        fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                        cursor: "pointer", transition: "all .15s",
                      }}>
                        {t("updateProgress")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Gold divider ── */}
            {!isLocked && <div style={goldDivider} />}

            {/* ═══ C. ACTION GRID ═══ */}
            {!isLocked && (
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "0.5rem",
              }}>

                {/* 1. Historical Context */}
                <div style={{ gridColumn: isMobile ? undefined : "1 / -1" }}>
                  <ActionCard
                    id="context"
                    icon={<QuillIcon color={openAction === "context" ? accent : T.color.gold} />}
                    title={t("historicalContext")}
                    value={historicalContext ? historicalContext.slice(0, 40) + "..." : t("addContextCta")}
                    isOpen={openAction === "context"}
                    onToggle={() => toggleAction("context")}
                    accent={accent}
                  >
                    {historicalContext ? (
                      <div>
                        <p style={{
                          fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.walnut,
                          lineHeight: 1.7, margin: "0 0 0.625rem 0", whiteSpace: "pre-wrap",
                        }}>
                          {historicalContext}
                        </p>
                        <button onClick={() => { setHistoricalContext(""); autoSave({ historicalContext: "" }); }}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                            padding: 0, textDecoration: "underline",
                          }}>{t("remove")}</button>
                      </div>
                    ) : contextLoading ? (
                      <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
                        <div style={{
                          fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                        }}>
                          <span style={{
                            display: "inline-block", width: "0.875rem", height: "0.875rem",
                            border: `2px solid ${T.color.sandstone}`, borderTopColor: "transparent",
                            borderRadius: "50%", animation: "mdSpin 1s linear infinite",
                          }} />
                          {t("discoveringContext")}
                        </div>
                      </div>
                    ) : contextError ? (
                      <div>
                        <div role="alert" style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.error, marginBottom: "0.5rem" }}>{contextError}</div>
                        <button onClick={fetchHistoricalContext} style={{ ...inputStyle, cursor: "pointer", textAlign: "center", color: accent, fontWeight: 600 }}>{t("tryAgain")}</button>
                      </div>
                    ) : (
                      <button onClick={fetchHistoricalContext} style={{
                        width: "100%", padding: "0.625rem", fontFamily: T.font.body, fontSize: "0.8125rem",
                        background: `${accent}08`, border: `1px dashed ${accent}40`,
                        borderRadius: "0.5rem", cursor: "pointer", color: accent,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                      }}>
                        <QuillIcon color={accent} /> {t("generateContext")}
                      </button>
                    )}
                  </ActionCard>
                </div>

                {/* 2. Date */}
                <ActionCard
                  id="date"
                  icon={<CalendarIcon color={openAction === "date" ? accent : T.color.gold} />}
                  title={t("dateLabel")}
                  value={memDate
                    ? new Date(memDate + "T00:00:00").toLocaleDateString(localeDateCodes[locale as Locale], { month: "short", day: "numeric", year: "numeric" })
                    : t("addDateCta")}
                  isOpen={openAction === "date"}
                  onToggle={() => toggleAction("date")}
                  accent={accent}
                >
                  <input
                    type="date"
                    value={memDate}
                    onChange={e => {
                      setMemDate(e.target.value);
                      if (e.target.value) {
                        autoSave({ createdAt: new Date(e.target.value + "T12:00:00").toISOString() });
                      }
                    }}
                    style={{ ...inputStyle }}
                  />
                </ActionCard>

                {/* 3. Location */}
                <ActionCard
                  id="location"
                  icon={<MapPinIcon color={openAction === "location" ? accent : T.color.gold} />}
                  title={t("locationLabel")}
                  value={locationName || t("addLocationCta")}
                  isOpen={openAction === "location"}
                  onToggle={() => toggleAction("location")}
                  accent={accent}
                  extra={locationLat && locationLng ? (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "0.25rem",
                      fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.success,
                    }}>
                      <MapPinIcon color={T.color.success} /> {t("hasCoordinates")}
                    </span>
                  ) : undefined}
                >
                  <div ref={locationWrapperRef} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ position: "relative" }}>
                      <input
                        value={locationName}
                        onChange={e => handleLocationInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Escape") setShowSuggestions(false);
                        }}
                        onBlur={async () => {
                          // Delay to allow suggestion click to register
                          setTimeout(async () => {
                            if (locationName !== (mem.locationName || "") && !showSuggestions) {
                              autoSave({ locationName });
                              if (locationName.trim()) {
                                setGeocoding(true);
                                setGeocodeError("");
                                const coords = await geocodeLocationName(locationName);
                                setGeocoding(false);
                                if (coords) {
                                  setLocationLat(coords.lat.toFixed(6));
                                  setLocationLng(coords.lng.toFixed(6));
                                  setGeocodeSuccess(true);
                                  setTimeout(() => setGeocodeSuccess(false), 3000);
                                  autoSave({ locationName, lat: coords.lat, lng: coords.lng });
                                } else {
                                  setGeocodeError(t("geocodeFailed"));
                                }
                              }
                            }
                          }, 200);
                        }}
                        placeholder={t("locationNamePlaceholder")}
                        style={inputStyle}
                      />
                      {/* Autocomplete dropdown */}
                      {showSuggestions && geocodeSuggestions.length > 0 && (
                        <div style={{
                          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                          background: T.color.linen, border: `1px solid ${accent}40`,
                          borderRadius: "0 0 0.5rem 0.5rem", boxShadow: "0 0.25rem 0.75rem rgba(0,0,0,0.15)",
                          overflow: "hidden", marginTop: "-1px",
                        }}>
                          {geocodeSuggestions.map((s, i) => (
                            <button
                              key={`${s.lat}-${s.lng}-${i}`}
                              onMouseDown={e => { e.preventDefault(); selectSuggestion(s); }}
                              style={{
                                display: "flex", alignItems: "center", gap: "0.375rem",
                                width: "100%", padding: "0.5rem 0.625rem",
                                background: "transparent", border: "none", borderBottom: i < geocodeSuggestions.length - 1 ? `1px solid ${accent}15` : "none",
                                cursor: "pointer", textAlign: "left",
                                fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal,
                                transition: "background 0.15s ease",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = `${accent}10`)}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                              <MapPinIcon color={accent} />
                              <span>{s.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {geocoding && (
                      <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: accent, margin: 0, fontStyle: "italic" }}>
                        {t("geocoding")}
                      </p>
                    )}
                    {geocodeError && (
                      <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.terracotta, margin: 0 }}>
                        {geocodeError}
                      </p>
                    )}
                    {geocodeSuccess && (
                      <p style={{
                        fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.success,
                        margin: 0, display: "flex", alignItems: "center", gap: "0.25rem",
                        animation: "fadeIn 0.3s ease",
                      }}>
                        <CheckIcon color={T.color.success} /> {t("coordinatesSaved")}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      <input
                        value={locationLat}
                        onChange={e => setLocationLat(e.target.value)}
                        onBlur={() => {
                          const lat = parseFloat(locationLat);
                          const lng = parseFloat(locationLng);
                          if (!isNaN(lat) && !isNaN(lng)) autoSave({ lat, lng });
                        }}
                        placeholder={t("latPlaceholder")}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <input
                        value={locationLng}
                        onChange={e => setLocationLng(e.target.value)}
                        onBlur={() => {
                          const lat = parseFloat(locationLat);
                          const lng = parseFloat(locationLng);
                          if (!isNaN(lat) && !isNaN(lng)) autoSave({ lat, lng });
                        }}
                        placeholder={t("lngPlaceholder")}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(pos => {
                            const lat = pos.coords.latitude.toFixed(6);
                            const lng = pos.coords.longitude.toFixed(6);
                            setLocationLat(lat);
                            setLocationLng(lng);
                            setGeocodeSuccess(true);
                            setTimeout(() => setGeocodeSuccess(false), 3000);
                            autoSave({ lat: parseFloat(lat), lng: parseFloat(lng) });
                          });
                        }
                      }}
                      style={{
                        padding: "0.5rem", fontFamily: T.font.body, fontSize: "0.75rem",
                        background: `${accent}08`, border: `1px solid ${accent}30`,
                        borderRadius: "0.5rem", cursor: "pointer", color: accent,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                      }}
                    >
                      <MapPinIcon color={accent} /> {t("useCurrentLocation")}
                    </button>
                  </div>
                </ActionCard>

                {/* 4. AI Labels */}
                <ActionCard
                  id="labels"
                  icon={<TagIcon color={openAction === "labels" ? accent : T.color.gold} />}
                  title={t("aiLabelsTitle")}
                  value={aiLabelResult || (mem as any).labels?.join(", ") || t("generateLabelsCta")}
                  isOpen={openAction === "labels"}
                  onToggle={() => toggleAction("labels")}
                  accent={accent}
                >
                  {mem.type === "photo" && mem.dataUrl ? (
                    <div>
                      {aiLabelLoading ? (
                        <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted }}>{t("aiLabelsLoading")}</p>
                      ) : aiLabelError ? (
                        <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#c62828" }}>{aiLabelError}</p>
                      ) : aiLabelResult ? (
                        <div>
                          <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal, lineHeight: 1.5, margin: "0 0 0.5rem" }}>{aiLabelResult}</p>
                          <button
                            onClick={() => {
                              onUpdate(mem.id, { desc: (desc ? desc + "\n\n" : "") + aiLabelResult });
                              setDesc((prev) => (prev ? prev + "\n\n" : "") + aiLabelResult);
                              setAiLabelResult(null);
                            }}
                            style={{
                              padding: "0.375rem 0.875rem", borderRadius: "0.375rem",
                              background: accent, color: "#fff", border: "none",
                              fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {t("aiLabelsSave")}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            setAiLabelLoading(true); setAiLabelError(null);
                            try {
                              const res = await fetch("/api/ai-label", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ imageUrl: mem.dataUrl, memoryTitle: mem.title }),
                              });
                              if (res.status === 403) { setAiLabelError(t("aiLabelsConsentNeeded")); return; }
                              if (res.status === 503) { setAiLabelError(t("aiLabelsNotConfigured")); return; }
                              if (!res.ok) { setAiLabelError(t("aiLabelsFailed")); return; }
                              const data = await res.json();
                              const result = data.description + (data.labels?.length ? ` [${data.labels.join(", ")}]` : "");
                              setAiLabelResult(result);
                            } catch {
                              setAiLabelError(t("aiLabelsFailed"));
                            } finally {
                              setAiLabelLoading(false);
                            }
                          }}
                          style={{
                            padding: "0.5rem 1rem", borderRadius: "0.5rem",
                            background: `linear-gradient(135deg, ${accent}, ${T.color.walnut})`,
                            color: "#fff", border: "none",
                            fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                            cursor: "pointer", display: "flex", alignItems: "center", gap: "0.375rem",
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2l2.09 6.26L20 10l-4.91 3.74L17.18 20 12 16.27 6.82 20l2.09-6.26L4 10l5.91-1.74z"/>
                          </svg>
                          {t("aiLabelsGenerate")}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, fontStyle: "italic" }}>
                      {t("aiLabelsPhotoOnly")}
                    </p>
                  )}
                </ActionCard>

                {/* 5. Display Type */}
                <ActionCard
                  id="displayType"
                  icon={<FrameIcon color={openAction === "displayType" ? accent : T.color.gold} />}
                  title={t("displayAs")}
                  value={t(DISPLAY_TYPES.find(d => d[0] === displayType)?.[1] || "typeFrame")}
                  isOpen={openAction === "displayType"}
                  onToggle={() => toggleAction("displayType")}
                  accent={accent}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.375rem" }}>
                    {DISPLAY_TYPES.map(([val, labelKey]) => (
                      <button
                        key={val}
                        onClick={() => {
                          setDisplayType(val);
                          autoSave({ type: val });
                        }}
                        style={{
                          padding: "0.625rem 0.375rem", borderRadius: "0.5rem",
                          border: displayType === val ? `2px solid ${accent}` : `1px solid ${T.color.cream}`,
                          background: displayType === val ? `${accent}10` : T.color.white,
                          cursor: "pointer", textAlign: "center", transition: "all .15s",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem",
                        }}
                      >
                        <DisplayIcon type={val} color={displayType === val ? accent : T.color.muted} />
                        <div style={{
                          fontFamily: T.font.body, fontSize: "0.5625rem",
                          color: displayType === val ? accent : T.color.muted,
                          fontWeight: displayType === val ? 600 : 400,
                        }}>{t(labelKey)}</div>
                      </button>
                    ))}
                  </div>
                </ActionCard>

                {/* 6. Picture Edit */}
                {mem.dataUrl && (
                  <ActionCard
                    id="pictureEdit"
                    icon={<PaletteIcon color={openAction === "pictureEdit" ? accent : T.color.gold} />}
                    title={t("editImage")}
                    value={t("openEditor")}
                    isOpen={openAction === "pictureEdit"}
                    onToggle={() => toggleAction("pictureEdit")}
                    accent={accent}
                  >
                    <button
                      onClick={() => setImageEditing(true)}
                      style={{
                        width: "100%", padding: "0.75rem", fontFamily: T.font.body,
                        fontSize: "0.8125rem", fontWeight: 600, background: accent,
                        border: "none", borderRadius: "0.5rem", cursor: "pointer",
                        color: T.color.white, display: "flex", alignItems: "center",
                        justifyContent: "center", gap: "0.375rem",
                      }}
                    >
                      <PaletteIcon color="#FFF" /> {t("openImageEditor")}
                    </button>
                  </ActionCard>
                )}

                {/* 7. Tag People */}
                <ActionCard
                  id="people"
                  icon={<PeopleIcon color={openAction === "people" ? accent : T.color.gold} />}
                  title={t("tagPeople")}
                  value={peopleTags.length > 0 ? peopleTags.join(", ") : t("addPeopleCta")}
                  isOpen={openAction === "people"}
                  onToggle={() => toggleAction("people")}
                  accent={accent}
                >
                  <div>
                    {peopleTags.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.5rem" }}>
                        {peopleTags.map((p, i) => (
                          <span key={i} style={{
                            fontFamily: T.font.body, fontSize: "0.75rem",
                            background: `${accent}12`, color: accent,
                            padding: "0.25rem 0.625rem", borderRadius: "1rem",
                            display: "flex", alignItems: "center", gap: "0.25rem",
                          }}>
                            {p}
                            <button onClick={() => {
                              const next = peopleTags.filter((_, j) => j !== i);
                              setPeopleTags(next);
                              autoSave({ people: next } as any);
                            }} style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: accent, fontSize: "0.875rem", padding: 0, lineHeight: 1,
                            }}>&times;</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      <input
                        value={newPerson}
                        onChange={e => setNewPerson(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && newPerson.trim()) {
                            const next = [...peopleTags, newPerson.trim()];
                            setPeopleTags(next);
                            setNewPerson("");
                            autoSave({ people: next } as any);
                          }
                        }}
                        placeholder={t("personNamePlaceholder")}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button
                        onClick={() => {
                          if (newPerson.trim()) {
                            const next = [...peopleTags, newPerson.trim()];
                            setPeopleTags(next);
                            setNewPerson("");
                            autoSave({ people: next } as any);
                          }
                        }}
                        style={{
                          padding: "0.5rem 0.75rem", background: accent, color: "#FFF",
                          border: "none", borderRadius: "0.5rem", cursor: "pointer",
                          fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                        }}
                      >+</button>
                    </div>
                  </div>
                </ActionCard>

                {/* 8. Visibility */}
                <ActionCard
                  id="visibility"
                  icon={<EyeIcon color={openAction === "visibility" ? accent : T.color.gold} />}
                  title={t("visibility")}
                  value={t(`vis${visibility.charAt(0).toUpperCase() + visibility.slice(1)}` as any)}
                  isOpen={openAction === "visibility"}
                  onToggle={() => toggleAction("visibility")}
                  accent={accent}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.375rem" }}>
                    {VISIBILITY_OPTIONS.map(val => (
                      <button
                        key={val}
                        onClick={() => {
                          setVisibility(val);
                          autoSave({ visibility: val });
                        }}
                        style={{
                          padding: "0.625rem 0.375rem", borderRadius: "0.5rem",
                          border: visibility === val ? `2px solid ${accent}` : `1px solid ${T.color.cream}`,
                          background: visibility === val ? `${accent}10` : T.color.white,
                          cursor: "pointer", textAlign: "center", transition: "all .15s",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem",
                        }}
                      >
                        <VisIcon vis={val} color={visibility === val ? accent : T.color.muted} />
                        <div style={{
                          fontFamily: T.font.body, fontSize: "0.5625rem",
                          color: visibility === val ? accent : T.color.muted,
                          fontWeight: visibility === val ? 600 : 400,
                        }}>
                          {t(`vis${val.charAt(0).toUpperCase() + val.slice(1)}` as any)}
                        </div>
                      </button>
                    ))}
                  </div>
                </ActionCard>

                {/* 9. Move to Room */}
                <ActionCard
                  id="moveRoom"
                  icon={<DoorIcon color={openAction === "moveRoom" ? accent : T.color.gold} />}
                  title={t("moveToRoom")}
                  value={room ? translateRoomName(room, tWings) : t("unknownRoom")}
                  isOpen={openAction === "moveRoom"}
                  onToggle={() => toggleAction("moveRoom")}
                  accent={accent}
                >
                  <div style={{ maxHeight: "16rem", overflowY: "auto" }}>
                    {getWings().map(w => {
                      const wRooms = getWingRooms(w.id);
                      const isExpanded = expandedMoveWing === w.id;
                      return (
                        <div key={w.id}>
                          <button
                            onClick={() => setExpandedMoveWing(isExpanded ? null : w.id)}
                            style={{
                              width: "100%", padding: "0.5rem 0.75rem",
                              background: isExpanded ? `${w.accent}0A` : "transparent",
                              border: "none", cursor: "pointer",
                              display: "flex", alignItems: "center", gap: "0.5rem",
                              fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                              color: T.color.charcoal,
                            }}
                          >
                            <WingIcon wingId={w.id} size={16} color={w.accent} />
                            <span style={{ flex: 1, textAlign: "left" }}>{translateWingName(w, tWings)}</span>
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke={T.color.muted} strokeWidth="1.5" strokeLinecap="round"
                              style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                              <path d="M4 2l4 4-4 4" />
                            </svg>
                          </button>
                          {isExpanded && wRooms.map(r => {
                            const isCurrent = r.id === room?.id;
                            return (
                              <button key={r.id}
                                onClick={() => {
                                  if (!isCurrent && room) {
                                    moveMemory(room.id, r.id, mem.id);
                                    setMovedToast(true);
                                    setTimeout(() => { setMovedToast(false); onClose(); }, 1500);
                                  }
                                }}
                                disabled={isCurrent}
                                style={{
                                  width: "100%", padding: "0.375rem 0.75rem 0.375rem 2.25rem",
                                  background: isCurrent ? `${w.accent}08` : "transparent",
                                  border: "none", cursor: isCurrent ? "default" : "pointer",
                                  display: "flex", alignItems: "center", gap: "0.375rem",
                                  fontFamily: T.font.body, fontSize: "0.75rem",
                                  color: isCurrent ? T.color.muted : T.color.walnut,
                                  opacity: isCurrent ? 0.6 : 1,
                                }}
                              >
                                <RoomIcon roomId={r.id} size={14} color={w.accent} />
                                <span style={{ flex: 1, textAlign: "left" }}>{translateRoomName(r, tWings)}</span>
                                {isCurrent && <span style={{ fontSize: "0.5625rem", fontWeight: 500, color: w.accent, textTransform: "uppercase" as const }}>{t("currentRoom")}</span>}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                  {movedToast && (
                    <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, color: accent, marginTop: "0.5rem" }}>
                      {t("memoryMoved")}
                    </div>
                  )}
                </ActionCard>

                {/* 10. Time Capsule */}
                <ActionCard
                  id="timeCapsule"
                  icon={<HourglassIcon color={openAction === "timeCapsule" ? accent : T.color.gold} />}
                  title={t("timeCapsuleTitle")}
                  value={revealDate
                    ? new Date(revealDate + "T00:00:00").toLocaleDateString(localeDateCodes[locale as Locale], { month: "short", day: "numeric", year: "numeric" })
                    : t("setRevealDate")}
                  isOpen={openAction === "timeCapsule"}
                  onToggle={() => toggleAction("timeCapsule")}
                  accent={accent}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={labelStyle}>{t("revealDateLabel")}</label>
                    <input
                      type="date"
                      value={revealDate}
                      min={new Date().toLocaleDateString("sv-SE")}
                      onChange={e => {
                        setRevealDate(e.target.value);
                        if (e.target.value) autoSave({ revealDate: e.target.value });
                      }}
                      style={inputStyle}
                    />
                    <label style={labelStyle}>{t("resolutionOptional")}</label>
                    <textarea
                      value={resolutionGoal}
                      onChange={e => setResolutionGoal(e.target.value)}
                      onBlur={() => {
                        if (resolutionGoal.trim()) {
                          autoSave({
                            resolution: {
                              goal: resolutionGoal.trim(),
                              targetDate: revealDate || undefined,
                              progress: 0,
                            },
                          });
                        }
                      }}
                      placeholder={t("resolutionPlaceholder")}
                      rows={2}
                      style={{ ...inputStyle, resize: "none", lineHeight: 1.6 }}
                    />
                  </div>
                </ActionCard>

                {/* 11. Share */}
                <ActionCard
                  id="share"
                  icon={<ShareIcon color={openAction === "share" ? accent : T.color.gold} />}
                  title={t("shareBtn")}
                  value={t("shareDesc")}
                  isOpen={openAction === "share"}
                  onToggle={() => toggleAction("share")}
                  accent={accent}
                >
                  <button
                    onClick={() => setSharing(true)}
                    style={{
                      width: "100%", padding: "0.75rem", fontFamily: T.font.body,
                      fontSize: "0.8125rem", fontWeight: 600, background: accent,
                      border: "none", borderRadius: "0.5rem", cursor: "pointer",
                      color: T.color.white, display: "flex", alignItems: "center",
                      justifyContent: "center", gap: "0.375rem",
                    }}
                  >
                    <ShareIcon color="#FFF" /> {t("openShareCard")}
                  </button>
                </ActionCard>

                {/* 12. Delete */}
                <ActionCard
                  id="delete"
                  icon={<TrashIcon />}
                  title={t("deleteBtn")}
                  value=""
                  isOpen={openAction === "delete"}
                  onToggle={() => { toggleAction("delete"); setConfirmDelete(false); }}
                  accent={T.color.error}
                >
                  {confirmDelete ? (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        style={{
                          flex: 1, padding: "0.625rem", fontFamily: T.font.body,
                          fontSize: "0.8125rem", background: "transparent",
                          border: `1px solid ${T.color.cream}`, borderRadius: "0.5rem",
                          cursor: "pointer", color: T.color.muted,
                        }}
                      >{t("cancel")}</button>
                      <button
                        onClick={() => { onDelete(mem.id); onClose(); }}
                        style={{
                          flex: 1, padding: "0.625rem", fontFamily: T.font.body,
                          fontSize: "0.8125rem", fontWeight: 600, background: T.color.error,
                          border: "none", borderRadius: "0.5rem", cursor: "pointer",
                          color: "#FFF",
                        }}
                      >{t("confirmDelete")}</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{
                        width: "100%", padding: "0.625rem", fontFamily: T.font.body,
                        fontSize: "0.8125rem", background: `${T.color.error}08`,
                        border: `1px solid ${T.color.error}30`, borderRadius: "0.5rem",
                        cursor: "pointer", color: T.color.error,
                      }}
                    >
                      {t("deleteMemoryPermanently")}
                    </button>
                  )}
                </ActionCard>

              </div>
            )}

            {/* Info line for locked memories */}
            {isLocked && (
              <div style={{
                display: "flex", gap: "0.625rem", marginTop: "1rem",
              }}>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, padding: "0.75rem", fontFamily: T.font.body,
                    fontSize: "0.8125rem", background: "transparent",
                    border: `1px solid ${T.color.cream}`, borderRadius: "0.625rem",
                    cursor: "pointer", color: T.color.muted,
                  }}
                >{t("closeBtn")}</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Full-screen image viewer ── */}
      {showFullImage && mem.dataUrl && (
        <div
          onClick={() => setShowFullImage(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.9)",
            zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", animation: "mdFadeIn .2s ease",
          }}
        >
          <img
            src={mem.dataUrl}
            alt={mem.title}
            style={{ maxWidth: "95vw", maxHeight: "95vh", objectFit: "contain", borderRadius: "0.5rem" }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setShowFullImage(false)}
            style={{
              position: "absolute", top: "1rem", right: "1rem",
              background: "rgba(255,255,255,.1)", border: "none",
              borderRadius: "50%", width: "2.5rem", height: "2.5rem",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <CloseIcon color="#FFF" />
          </button>
        </div>
      )}

      {/* ── Image editor overlay ── */}
      {imageEditing && mem.dataUrl && (
        <Suspense fallback={<div style={{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,background:"rgba(0,0,0,.3)",backdropFilter:"blur(0.25rem)"}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{width:"2.5rem",height:"2.5rem",border:"0.1875rem solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} /></div>}>
        <ImageEditor
          dataUrl={mem.dataUrl}
          accent={accent}
          onSave={handleImageSave}
          onCancel={() => setImageEditing(false)}
        />
        </Suspense>
      )}

      {/* ── Share card overlay ── */}
      {sharing && (
        <ShareCard
          mem={mem}
          roomName={room?.name}
          roomIcon={room?.icon}
          wingName={wing?.name}
          wingIcon={wing?.icon}
          accent={accent}
          onClose={() => setSharing(false)}
        />
      )}

      {/* ── Saved toast ── */}
      <SavedToast visible={savedVisible} />

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes mdFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes mdSlideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes mdSlideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes mdCapsuleShimmer { 0%,100% { opacity: .3 } 50% { opacity: .8 } }
        @keyframes mdSpin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}
