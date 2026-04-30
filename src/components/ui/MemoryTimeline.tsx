"use client";
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { localeDateCodes, type Locale } from "@/i18n/config";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { getAllDemoMems } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { translateRoomName } from "@/lib/constants/wings";
import { RoomIcon } from "@/components/ui/WingRoomIcons";
import { DateInputAssisted } from "@/app/(app)/family-tree/DateInputAssisted";
import { syncSettingsToServer } from "@/lib/stores/settingsSync";

/** Thumbnail with fallback — uses plain <img> to avoid Next.js Image optimization issues */
function TimelineThumbnail({ src, roomId, wingId, color }: {
  src: string; roomId: string; wingId: string; color: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <RoomIcon roomId={roomId} wingId={wingId} size={14} color={color} />;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "0.5rem", display: "block" }}
    />
  );
}

const MONTH_KEYS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

/* ── Category icon definitions ── */

interface CategoryIconDef {
  id: string;
  labelKey: string; // i18n key under memoryTimeline.*
  paths: string[];  // SVG path d-attributes
}

const ICON_CHOICES: CategoryIconDef[] = [
  { id: "star",        labelKey: "iconStar",        paths: ["M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"] },
  { id: "heart",       labelKey: "iconHeart",       paths: ["M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"] },
  { id: "milestone",   labelKey: "iconMilestone",   paths: ["M3 21h18", "M12 3v18", "M12 3l7 4-7 4"] },
  { id: "celebration", labelKey: "iconCelebration", paths: ["M5.8 11.3L2 22l10.7-3.8", "M4 3h.01", "M22 8h.01", "M15 2h.01", "M22 20h.01", "M22 2l-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10", "M22 13l-1.34-.56a2.9 2.9 0 0 0-3.12 1.96v0c-.3.86-1.2 1.3-2.06 1L14 15"] },
  { id: "travel",      labelKey: "iconTravel",      paths: ["M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"] },
  { id: "family",      labelKey: "iconFamily",      paths: ["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"] },
  { id: "achievement", labelKey: "iconAchievement", paths: ["M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7", "M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7", "M4 22h16", "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22", "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22", "M18 2H6v7a6 6 0 0 0 12 0V2z"] },
  { id: "nature",      labelKey: "iconNature",      paths: ["M12 22V8", "M5 12H2a10 10 0 0 0 20 0h-3", "M8 5.14C9.26 3.8 10.6 3 12 3c1.4 0 2.74.8 4 2.14", "M8 5a4 4 0 0 0 8 0"] },
  { id: "home",        labelKey: "iconHome",        paths: ["M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z", "M9 22V12h6v10"] },
  { id: "work",        labelKey: "iconWork",        paths: ["M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z", "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"] },
  { id: "health",      labelKey: "iconHealth",      paths: ["M22 12h-4l-3 9L9 3l-3 9H2"] },
  { id: "education",   labelKey: "iconEducation",   paths: ["M22 10l-10-6L2 10l10 6 10-6z", "M6 12v5c0 2 3 4 6 4s6-2 6-4v-5", "M22 10v6"] },
  { id: "music",       labelKey: "iconMusic",       paths: ["M9 18V5l12-2v13", "M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z", "M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"] },
  { id: "art",         labelKey: "iconArt",         paths: ["M12 2a10 10 0 0 1 10 10c0 2-1 3.5-3 3.5h-2.5c-1.4 0-2.5 1.1-2.5 2.5 0 .7.3 1.3.7 1.7.3.4.3.7.3 1.3a2.5 2.5 0 0 1-5 0A10 10 0 0 1 12 2z", "M12 7.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z", "M7 12a1 1 0 1 1 0-2 1 1 0 0 1 0 2z", "M16 9.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"] },
  { id: "ring",        labelKey: "iconRing",        paths: ["M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z", "M8.5 8.5L6 3", "M15.5 8.5L18 3", "M12 3v2", "M9 21l3-6 3 6"] },
];

const DEFAULT_ICON_ID = "star";

/** Render one of the category SVG icons by id */
function CategoryIcon({ iconId, size = 18, color = "currentColor" }: { iconId: string; size?: number; color?: string }) {
  const def = ICON_CHOICES.find((ic) => ic.id === iconId);
  if (!def) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      {def.paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/* ── SVG icons ── */

function CalendarIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function PlusIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function BookIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function PencilIcon({ size = 12, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon({ size = 12, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function DotsIcon({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <circle cx="12" cy="5" r="1" fill={color} />
      <circle cx="12" cy="12" r="1" fill={color} />
      <circle cx="12" cy="19" r="1" fill={color} />
    </svg>
  );
}

/* ── Important date type ── */

type Recurrence = "none" | "yearly" | "monthly";

interface ImportantDate {
  id: string;
  title: string;
  date: string; // ISO date string
  desc?: string;
  icon?: string;
  recurrence?: Recurrence;
}

const STORAGE_KEY = "mp_important_dates";

function loadImportantDates(): ImportantDate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveImportantDates(dates: ImportantDate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dates));
  syncSettingsToServer();
}

/** Generate recurring instances of an important date — only forward-looking from the original date */
function expandRecurrences(dates: ImportantDate[]): ImportantDateEntry[] {
  const entries: ImportantDateEntry[] = [];
  const maxYear = new Date().getFullYear() + 2;

  for (const id of dates) {
    const base = new Date(id.date);
    const recurrence = id.recurrence || "none";

    // Always include the original date
    entries.push({ importantDate: id, date: base, isRecurring: false });

    if (recurrence === "yearly") {
      // Only future years after the original
      for (let y = base.getFullYear() + 1; y <= maxYear; y++) {
        const d = new Date(y, base.getMonth(), base.getDate());
        entries.push({ importantDate: id, date: d, isRecurring: true });
      }
    } else if (recurrence === "monthly") {
      // Only future months after the original
      const startMonth = base.getFullYear() * 12 + base.getMonth() + 1; // next month after original
      const endMonth = maxYear * 12 + 11;
      for (let absMonth = startMonth; absMonth <= endMonth; absMonth++) {
        const y = Math.floor(absMonth / 12);
        const m = absMonth % 12;
        const d = new Date(y, m, Math.min(base.getDate(), new Date(y, m + 1, 0).getDate()));
        entries.push({ importantDate: id, date: d, isRecurring: true });
      }
    }
  }
  return entries;
}

/* ── Timeline types ── */

interface TimelineEntry {
  mem: Mem;
  roomId: string;
  roomName: string;
  roomIcon: string;
  wingId: string;
  wingAccent: string;
  date: Date;
}

interface ImportantDateEntry {
  importantDate: ImportantDate;
  date: Date;
  isRecurring: boolean;
}

type MixedEntry =
  | { kind: "memory"; entry: TimelineEntry }
  | { kind: "importantDate"; entry: ImportantDateEntry };

interface MonthGroup {
  year: number;
  month: number;
  label: string;
  entries: MixedEntry[];
  memoryCount: number;
}

interface MemoryTimelineProps {
  onClose: () => void;
  onNavigateLibrary: () => void;
}

export default function MemoryTimeline({ onClose, onNavigateLibrary }: MemoryTimelineProps) {
  const isMobile = useIsMobile();
  const { t, locale } = useTranslation("memoryTimeline");
  const { t: tc } = useTranslation("common");
  const { t: tWings } = useTranslation("wings");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const { userMems, setSelMem, fetchRoomMemories } = useMemoryStore();
  const { getWings, getWingRooms } = useRoomStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Prefetch all room memories on mount (same pattern as LibraryView)
  useEffect(() => {
    const wings = getWings();
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        fetchRoomMemories(r.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formIcon, setFormIcon] = useState(DEFAULT_ICON_ID);
  const [formRecurrence, setFormRecurrence] = useState<Recurrence>("none");

  // Edit state
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editIcon, setEditIcon] = useState(DEFAULT_ICON_ID);
  const [editRecurrence, setEditRecurrence] = useState<Recurrence>("none");

  // Memory context menu
  const [memMenuId, setMemMenuId] = useState<string | null>(null);
  // Important date context menu
  const [dateMenuId, setDateMenuId] = useState<string | null>(null);

  useEffect(() => {
    setImportantDates(loadImportantDates());
  }, []);

  const handleAddDate = useCallback(() => {
    if (!formTitle.trim() || !formDate) return;
    const newDate: ImportantDate = {
      id: `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: formTitle.trim(),
      date: formDate,
      desc: formDesc.trim() || undefined,
      icon: formIcon,
      recurrence: formRecurrence,
    };
    const updated = [...importantDates, newDate];
    setImportantDates(updated);
    saveImportantDates(updated);
    setFormTitle("");
    setFormDate("");
    setFormDesc("");
    setFormIcon(DEFAULT_ICON_ID);
    setFormRecurrence("none");
    setShowAddForm(false);
  }, [formTitle, formDate, formDesc, formIcon, formRecurrence, importantDates]);

  const handleDeleteDate = useCallback((id: string) => {
    const updated = importantDates.filter((d) => d.id !== id);
    setImportantDates(updated);
    saveImportantDates(updated);
  }, [importantDates]);

  const startEditDate = useCallback((d: ImportantDate) => {
    setEditingDateId(d.id);
    setEditTitle(d.title);
    setEditDate(d.date);
    setEditDesc(d.desc || "");
    setEditIcon(d.icon || DEFAULT_ICON_ID);
    setEditRecurrence(d.recurrence || "none");
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editTitle.trim() || !editDate || !editingDateId) return;
    const updated = importantDates.map((d) =>
      d.id === editingDateId
        ? { ...d, title: editTitle.trim(), date: editDate, desc: editDesc.trim() || undefined, icon: editIcon, recurrence: editRecurrence }
        : d
    );
    setImportantDates(updated);
    saveImportantDates(updated);
    setEditingDateId(null);
  }, [editingDateId, editTitle, editDate, editDesc, editIcon, editRecurrence, importantDates]);

  const groups = useMemo(() => {
    const wings = getWings();
    const roomToWing: Record<string, { wingId: string; wingAccent: string; roomName: string; roomIcon: string }> = {};
    for (const wing of wings) {
      for (const room of getWingRooms(wing.id)) {
        roomToWing[room.id] = {
          wingId: wing.id,
          wingAccent: wing.accent,
          roomName: translateRoomName(room, tWings),
          roomIcon: room.icon,
        };
      }
    }

    const merged: Record<string, Mem[]> = { ...getAllDemoMems() };
    for (const [k, v] of Object.entries(userMems)) {
      merged[k] = v;
    }

    const mixedEntries: MixedEntry[] = [];

    for (const [roomId, mems] of Object.entries(merged)) {
      const info = roomToWing[roomId];
      if (!info) continue;
      for (const mem of mems) {
        const dateStr = mem.createdAt || (mem as unknown as Record<string, unknown>).created_at as string | undefined || new Date().toISOString();
        mixedEntries.push({
          kind: "memory",
          entry: {
            mem,
            roomId,
            roomName: info.roomName,
            roomIcon: info.roomIcon,
            wingId: info.wingId,
            wingAccent: info.wingAccent,
            date: new Date(dateStr),
          },
        });
      }
    }

    // Expand recurring important dates
    const expandedDates = expandRecurrences(importantDates);
    for (const entry of expandedDates) {
      mixedEntries.push({ kind: "importantDate", entry });
    }

    // Sort newest first
    const getDate = (e: MixedEntry) => e.kind === "memory" ? e.entry.date : e.entry.date;
    mixedEntries.sort((a, b) => getDate(b).getTime() - getDate(a).getTime());

    // Group by month/year — skip empty months
    const grouped: MonthGroup[] = [];
    let current: MonthGroup | null = null;
    for (const mixed of mixedEntries) {
      const d = getDate(mixed);
      const y = d.getFullYear();
      const m = d.getMonth();
      if (!current || current.year !== y || current.month !== m) {
        current = { year: y, month: m, label: `${MONTH_KEYS[m]}|${y}`, entries: [], memoryCount: 0 };
        grouped.push(current);
      }
      current.entries.push(mixed);
      if (mixed.kind === "memory") current.memoryCount++;
    }
    return grouped;
  }, [userMems, getWings, getWingRooms, importantDates, tWings]);

  // Year navigation: collect unique years
  const years = useMemo(() => {
    const s = new Set<number>();
    for (const g of groups) s.add(g.year);
    return Array.from(s).sort((a, b) => b - a);
  }, [groups]);

  const scrollToYear = useCallback((year: number) => {
    const el = document.getElementById(`timeline-year-${year}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const totalCount = groups.reduce((n, g) => n + g.entries.length, 0);

  const inputStyle: React.CSSProperties = {
    fontFamily: T.font.body,
    fontSize: "0.8125rem",
    color: T.color.charcoal,
    padding: "0.4375rem 0.625rem",
    borderRadius: "0.375rem",
    border: `1px solid ${T.color.cream}`,
    background: T.color.white,
    outline: "none",
    width: "100%",
  };

  const smallBtnStyle: React.CSSProperties = {
    background: "none",
    border: `1px solid ${T.color.cream}`,
    cursor: "pointer",
    padding: "0.5rem",
    borderRadius: "0.375rem",
    minWidth: "2.25rem",
    minHeight: "2.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  /** Render the add/edit date form fields — inlined to avoid nested component re-mount on state change */
  const renderDateFormFields = (
    title: string, setTitle: (v: string) => void,
    date: string, setDate: (v: string) => void,
    desc: string, setDesc: (v: string) => void,
    icon: string, setIcon: (v: string) => void,
    recurrence: Recurrence, setRecurrence: (v: Recurrence) => void,
  ) => {
    const recOptions: { key: Recurrence; labelKey: string }[] = [
      { key: "none", labelKey: "recurrenceNone" },
      { key: "yearly", labelKey: "recurrenceYearly" },
      { key: "monthly", labelKey: "recurrenceMonthly" },
    ];
    return (
      <>
        <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.charcoal }}>
          {t("dateTitle")}
        </label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("datePlaceholder")} style={inputStyle} />

        <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.charcoal }}>
          {t("dateDate")}
        </label>
        <DateInputAssisted id="tl-imp-date" value={date} onChange={setDate} isMobile={isMobile} />

        <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.charcoal }}>
          {t("dateDesc")}
        </label>
        <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("dateDescPlaceholder")} style={inputStyle} />

        <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.charcoal }}>
          {t("dateIcon")}
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", maxWidth: "15rem" }}>
          {ICON_CHOICES.map((ic) => (
            <button
              key={ic.id}
              type="button"
              onClick={() => setIcon(ic.id)}
              title={t(ic.labelKey)}
              style={{
                width: "2rem", height: "2rem",
                border: icon === ic.id ? `2px solid ${T.color.gold}` : `1px solid ${T.color.cream}`,
                borderRadius: "0.375rem",
                background: icon === ic.id ? `${T.color.gold}18` : T.color.white,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}
              aria-label={t(ic.labelKey)}
            >
              <CategoryIcon iconId={ic.id} size={16} color={icon === ic.id ? T.color.gold : T.color.walnut} />
            </button>
          ))}
        </div>

        <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.charcoal, marginTop: "0.25rem" }}>
          {t("recurrence")}
        </label>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {recOptions.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setRecurrence(o.key)}
              style={{
                fontFamily: T.font.body, fontSize: "0.6875rem",
                fontWeight: recurrence === o.key ? 600 : 400,
                color: recurrence === o.key ? T.color.gold : T.color.muted,
                background: recurrence === o.key ? `${T.color.gold}15` : "none",
                border: `1px solid ${recurrence === o.key ? T.color.gold + "40" : T.color.cream}`,
                borderRadius: "0.375rem", padding: "0.25rem 0.5rem", cursor: "pointer",
              }}
            >
              {t(o.labelKey)}
            </button>
          ))}
        </div>
      </>
    );
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(42,34,24,.4)",
        backdropFilter: "blur(8px)",
        zIndex: 55,
        animation: "fadeIn .2s ease",
      }}
    >
      <div
        ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: isMobile ? "100%" : "min(28rem, 94vw)",
          background: `${T.color.linen}f8`,
          backdropFilter: "blur(20px)",
          borderRight: `1px solid ${T.color.cream}`,
          padding: 0,
          overflowY: "auto",
          animation: "slideInLeft .3s cubic-bezier(.23,1,.32,1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <style>{`@keyframes slideInLeft{from{opacity:0;transform:translateX(-2.5rem)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* Header */}
        <div
          style={{
            padding: "1.5rem 1.5rem 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
            flexShrink: 0,
          }}
        >
          <div>
            <h3
              style={{
                fontFamily: T.font.display,
                fontSize: "1.5rem",
                fontWeight: 500,
                color: T.color.charcoal,
                margin: 0,
              }}
            >
              {t("title")}
            </h3>
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                color: T.color.muted,
                margin: "0.25rem 0 0",
              }}
            >
              {t("memoriesAcrossTime", { count: String(totalCount) })}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={tc("close")}
            style={{
              width: "2rem",
              height: "2rem",
              minWidth: "2.75rem",
              minHeight: "2.75rem",
              borderRadius: "1rem",
              border: `1px solid ${T.color.cream}`,
              background: T.color.warmStone,
              color: T.color.muted,
              fontSize: "0.875rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {"\u2715"}
          </button>
        </div>

        {/* Toolbar */}
        <div
          style={{
            padding: "0 1.5rem 0.75rem",
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            borderBottom: `1px solid ${T.color.cream}`,
            marginBottom: "0",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              fontWeight: 600,
              color: T.color.gold,
              background: `${T.color.gold}12`,
              border: `1px solid ${T.color.gold}30`,
              borderRadius: "0.375rem",
              padding: "0.375rem 0.625rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <PlusIcon size={12} color={T.color.gold} /> {t("addImportantDate")}
          </button>
          <button
            onClick={() => { onClose(); onNavigateLibrary(); }}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              fontWeight: 600,
              color: T.color.walnut,
              background: `${T.color.walnut}10`,
              border: `1px solid ${T.color.walnut}25`,
              borderRadius: "0.375rem",
              padding: "0.375rem 0.625rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <BookIcon size={12} color={T.color.walnut} /> {t("goToLibrary")}
          </button>
        </div>

        {/* Year navigation strip */}
        {years.length > 1 && (
          <div
            style={{
              padding: "0.5rem 1.5rem",
              display: "flex",
              gap: "0.375rem",
              flexWrap: "wrap",
              borderBottom: `1px solid ${T.color.cream}`,
              flexShrink: 0,
            }}
          >
            {years.map((year) => (
              <button
                key={year}
                onClick={() => scrollToYear(year)}
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  color: T.color.walnut,
                  background: `${T.color.walnut}0a`,
                  border: `1px solid ${T.color.walnut}20`,
                  borderRadius: "1rem",
                  padding: "0.1875rem 0.625rem",
                  cursor: "pointer",
                  transition: "all .15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `${T.color.walnut}18`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `${T.color.walnut}0a`;
                }}
              >
                {year}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable content */}
        <div ref={scrollContainerRef} style={{ flex: 1, overflowY: "auto", padding: "0", contain: "layout" }}>

          {/* Inline add date form */}
          {showAddForm && (
            <div
              style={{
                margin: "1rem 1.5rem",
                padding: "0.875rem",
                borderRadius: "0.625rem",
                background: `${T.color.gold}08`,
                border: `1px solid ${T.color.gold}25`,
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              {renderDateFormFields(
                formTitle, setFormTitle,
                formDate, setFormDate,
                formDesc, setFormDesc,
                formIcon, setFormIcon,
                formRecurrence, setFormRecurrence,
              )}
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.25rem" }}>
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    color: T.color.muted,
                    background: "none",
                    border: `1px solid ${T.color.cream}`,
                    borderRadius: "0.375rem",
                    padding: "0.375rem 0.75rem",
                    cursor: "pointer",
                  }}
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleAddDate}
                  disabled={!formTitle.trim() || !formDate}
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: T.color.white,
                    background: T.color.gold,
                    border: "none",
                    borderRadius: "0.375rem",
                    padding: "0.375rem 0.75rem",
                    cursor: formTitle.trim() && formDate ? "pointer" : "default",
                    opacity: formTitle.trim() && formDate ? 1 : 0.5,
                  }}
                >
                  {t("addDate")}
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div style={{ padding: "0.5rem 1rem 2rem 1.75rem" }}>
            {groups.map((group, gi) => {
              // Mark first group of each year with an id for scroll-to
              const isFirstOfYear = gi === 0 || groups[gi - 1].year !== group.year;

              return (
                <div key={group.label} style={{ position: "relative" }} id={isFirstOfYear ? `timeline-year-${group.year}` : undefined}>
                  {/* Month/year header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      marginBottom: "0.75rem",
                      marginTop: gi > 0 ? "1.25rem" : 0,
                    }}
                  >
                    {/* Timeline dot */}
                    <div
                      style={{
                        width: "0.75rem",
                        height: "0.75rem",
                        borderRadius: "0.375rem",
                        background: T.color.walnut,
                        border: `2px solid ${T.color.warmStone}`,
                        flexShrink: 0,
                        position: "relative",
                        zIndex: 2,
                      }}
                    />
                    <h4
                      style={{
                        fontFamily: T.font.display,
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: T.color.walnut,
                        margin: 0,
                        flex: 1,
                      }}
                    >
                      {t(group.label.split("|")[0])} {group.label.split("|")[1]}
                    </h4>
                    {/* Entry count badge */}
                    <span
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.625rem",
                        fontWeight: 600,
                        color: T.color.muted,
                        background: `${T.color.walnut}0c`,
                        borderRadius: "0.75rem",
                        padding: "0.125rem 0.5rem",
                        flexShrink: 0,
                      }}
                    >
                      {t("memoryCount", { count: String(group.memoryCount) })}
                    </span>
                  </div>

                  {/* Entries */}
                  {group.entries.map((mixed, ei) => {
                    const isLast = ei === group.entries.length - 1;
                    const isFirst = ei === 0;

                    if (mixed.kind === "importantDate") {
                      const { importantDate, date, isRecurring } = mixed.entry;
                      const isEditing = editingDateId === importantDate.id;
                      const showDateMenu = dateMenuId === `${importantDate.id}-${date.getTime()}`;
                      const displayIconId = importantDate.icon || DEFAULT_ICON_ID;

                      return (
                        <div
                          key={`${importantDate.id}-${date.getTime()}`}
                          style={{
                            position: "relative",
                            paddingLeft: "1.375rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          {/* Vertical line */}
                          <div
                            style={{
                              position: "absolute",
                              left: "0.3125rem",
                              top: isFirst ? "-0.75rem" : "-0.5rem",
                              bottom: isLast ? "50%" : "-0.5rem",
                              width: 2,
                              background: T.color.cream,
                              zIndex: 1,
                            }}
                          />
                          {/* Gold dot */}
                          <div
                            style={{
                              position: "absolute",
                              left: "0.125rem",
                              top: "0.875rem",
                              width: "0.5rem",
                              height: "0.5rem",
                              borderRadius: "0.25rem",
                              background: T.color.gold,
                              zIndex: 2,
                            }}
                          />

                          {isEditing ? (
                            /* Inline edit form */
                            <div
                              style={{
                                width: "100%",
                                padding: "0.75rem",
                                borderRadius: "0.75rem",
                                border: `1px solid ${T.color.gold}50`,
                                background: `${T.color.gold}0a`,
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                              }}
                            >
                              {renderDateFormFields(
                                editTitle, setEditTitle,
                                editDate, setEditDate,
                                editDesc, setEditDesc,
                                editIcon, setEditIcon,
                                editRecurrence, setEditRecurrence,
                              )}
                              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.25rem" }}>
                                <button onClick={() => setEditingDateId(null)} style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, background: "none", border: `1px solid ${T.color.cream}`, borderRadius: "0.375rem", padding: "0.375rem 0.75rem", cursor: "pointer" }}>
                                  {t("cancel")}
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={!editTitle.trim() || !editDate}
                                  style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, color: T.color.white, background: T.color.gold, border: "none", borderRadius: "0.375rem", padding: "0.375rem 0.75rem", cursor: editTitle.trim() && editDate ? "pointer" : "default", opacity: editTitle.trim() && editDate ? 1 : 0.5 }}
                                >
                                  {t("saveEdit")}
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Important Date Card */
                            <div
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.625rem",
                                padding: "0.625rem 0.75rem",
                                borderRadius: "0.75rem",
                                border: `1px solid ${T.color.gold}35`,
                                background: isRecurring ? `${T.color.gold}05` : `${T.color.gold}08`,
                                textAlign: "left",
                              }}
                            >
                              {/* Icon thumbnail */}
                              <div
                                style={{
                                  width: "2.25rem",
                                  height: "2.25rem",
                                  borderRadius: "0.5rem",
                                  background: `linear-gradient(135deg, ${T.color.gold}30, ${T.color.gold}15)`,
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: T.color.gold,
                                }}
                              >
                                <CategoryIcon iconId={displayIconId} size={18} color={T.color.gold} />
                              </div>

                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontFamily: T.font.body,
                                    fontSize: "0.8125rem",
                                    fontWeight: 600,
                                    color: T.color.charcoal,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {importantDate.title}
                                </div>
                                <div
                                  style={{
                                    fontFamily: T.font.body,
                                    fontSize: "0.625rem",
                                    color: T.color.muted,
                                    marginTop: "0.0625rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span style={{ color: T.color.gold, fontWeight: 600 }}>{t("importantDate")}</span>
                                  {isRecurring && (
                                    <span style={{ color: T.color.sandstone, fontStyle: "italic" }}>
                                      ({importantDate.recurrence === "yearly" ? t("recurrenceYearly") : t("recurrenceMonthly")})
                                    </span>
                                  )}
                                  <span style={{ color: T.color.sandstone }}>{"\u00B7"}</span>
                                  <span>
                                    {date.toLocaleDateString(localeDateCodes[locale as Locale], {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                                {importantDate.desc && (
                                  <div
                                    style={{
                                      fontFamily: T.font.body,
                                      fontSize: "0.625rem",
                                      color: T.color.muted,
                                      marginTop: "0.125rem",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {importantDate.desc}
                                  </div>
                                )}
                              </div>

                              {/* Three-dot menu */}
                              <div style={{ position: "relative", flexShrink: 0 }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDateMenuId(showDateMenu ? null : `${importantDate.id}-${date.getTime()}`); }}
                                  aria-label={t("memoryOptions")}
                                  style={{
                                    ...smallBtnStyle,
                                    color: T.color.muted,
                                  }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${T.color.gold}15`; }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                                >
                                  <DotsIcon size={14} color={T.color.muted} />
                                </button>

                                {showDateMenu && (
                                  <div style={{
                                    position: "absolute", right: 0, top: "2.25rem", zIndex: 10,
                                    background: T.color.white, border: `1px solid ${T.color.cream}`,
                                    borderRadius: "0.5rem", boxShadow: "0 0.25rem 1rem rgba(0,0,0,.1)",
                                    minWidth: "8rem", overflow: "hidden",
                                  }}>
                                    <button
                                      onClick={() => { setDateMenuId(null); startEditDate(importantDate); }}
                                      style={{
                                        width: "100%", fontFamily: T.font.body, fontSize: "0.75rem",
                                        color: T.color.charcoal, background: "none", border: "none",
                                        padding: "0.5rem 0.75rem", cursor: "pointer", textAlign: "left",
                                        display: "flex", alignItems: "center", gap: "0.375rem",
                                      }}
                                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.color.warmStone; }}
                                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                                    >
                                      <PencilIcon size={12} color={T.color.gold} />
                                      {t("editDate")}
                                    </button>
                                    <button
                                      onClick={() => { setDateMenuId(null); handleDeleteDate(importantDate.id); }}
                                      style={{
                                        width: "100%", fontFamily: T.font.body, fontSize: "0.75rem",
                                        color: T.color.error, background: "none", border: "none",
                                        padding: "0.5rem 0.75rem", cursor: "pointer", textAlign: "left",
                                        display: "flex", alignItems: "center", gap: "0.375rem",
                                      }}
                                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${T.color.error}08`; }}
                                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                                    >
                                      <TrashIcon size={12} color={T.color.error} />
                                      {t("deleteDate")}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Gold accent indicator */}
                              <div
                                style={{
                                  width: "0.25rem",
                                  height: "1.5rem",
                                  borderRadius: "0.125rem",
                                  background: T.color.gold,
                                  opacity: isRecurring ? 0.25 : 0.5,
                                  flexShrink: 0,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Memory entry
                    const { entry } = mixed;
                    const showMenu = memMenuId === entry.mem.id;

                    return (
                      <div
                        key={entry.mem.id}
                        style={{
                          position: "relative",
                          paddingLeft: "1.375rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {/* Vertical line */}
                        <div
                          style={{
                            position: "absolute",
                            left: "0.3125rem",
                            top: isFirst ? "-0.75rem" : "-0.5rem",
                            bottom: isLast ? "50%" : "-0.5rem",
                            width: 2,
                            background: T.color.cream,
                            zIndex: 1,
                          }}
                        />
                        {/* Small dot */}
                        <div
                          style={{
                            position: "absolute",
                            left: "0.125rem",
                            top: "0.875rem",
                            width: "0.5rem",
                            height: "0.5rem",
                            borderRadius: "0.25rem",
                            background: entry.wingAccent,
                            zIndex: 2,
                          }}
                        />

                        {/* Card */}
                        <div
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.625rem",
                            padding: "0.625rem 0.75rem",
                            borderRadius: "0.75rem",
                            border: `1px solid ${T.color.cream}`,
                            background: T.color.white,
                            textAlign: "left",
                            transition: "all .15s",
                            position: "relative",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = `${entry.wingAccent}08`;
                            (e.currentTarget as HTMLElement).style.borderColor = `${entry.wingAccent}40`;
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = T.color.white;
                            (e.currentTarget as HTMLElement).style.borderColor = T.color.cream;
                          }}
                        >
                          {/* Thumbnail — clickable */}
                          <button
                            onClick={() => setSelMem(entry.mem)}
                            style={{
                              width: "2.25rem",
                              height: "2.25rem",
                              borderRadius: "0.5rem",
                              background: `linear-gradient(135deg, hsl(${entry.mem.hue},${entry.mem.s}%,${entry.mem.l}%), hsl(${entry.mem.hue},${Math.max(0, entry.mem.s - 10)}%,${Math.max(0, entry.mem.l - 10)}%))`,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              position: "relative",
                            }}
                          >
                            {(entry.mem.dataUrl || entry.mem.thumbnailUrl) ? (
                              <TimelineThumbnail
                                src={(entry.mem.thumbnailUrl || entry.mem.dataUrl)!}
                                roomId={entry.roomId}
                                wingId={entry.wingId}
                                color={entry.wingAccent || T.color.muted}
                              />
                            ) : (
                              <RoomIcon roomId={entry.roomId} wingId={entry.wingId} size={14} color={entry.wingAccent || T.color.muted} />
                            )}
                          </button>

                          {/* Info — clickable */}
                          <button
                            onClick={() => setSelMem(entry.mem)}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <div
                              style={{
                                fontFamily: T.font.body,
                                fontSize: "0.8125rem",
                                fontWeight: 600,
                                color: T.color.charcoal,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {entry.mem.title}
                            </div>
                            <div
                              style={{
                                fontFamily: T.font.body,
                                fontSize: "0.625rem",
                                color: T.color.muted,
                                marginTop: "0.0625rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              <RoomIcon roomId={entry.roomId} wingId={entry.wingId} size={10} color={entry.wingAccent || T.color.muted} />
                              <span>{entry.roomName}</span>
                              <span style={{ color: T.color.sandstone }}>{"\u00B7"}</span>
                              <span>
                                {entry.date.toLocaleDateString(localeDateCodes[locale as Locale], {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </button>

                          {/* "..." menu button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setMemMenuId(showMenu ? null : entry.mem.id); }}
                            aria-label={t("memoryOptions")}
                            style={{
                              ...smallBtnStyle,
                              flexShrink: 0,
                              color: T.color.muted,
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${T.color.walnut}10`; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                          >
                            <DotsIcon size={14} color={T.color.muted} />
                          </button>

                          {/* Dropdown menu */}
                          {showMenu && (
                            <div
                              style={{
                                position: "absolute",
                                right: "0.5rem",
                                top: "2.75rem",
                                background: T.color.white,
                                border: `1px solid ${T.color.cream}`,
                                borderRadius: "0.5rem",
                                boxShadow: "0 0.25rem 1rem rgba(0,0,0,.1)",
                                zIndex: 10,
                                minWidth: "9rem",
                                overflow: "hidden",
                              }}
                            >
                              <button
                                onClick={() => { onClose(); onNavigateLibrary(); setMemMenuId(null); }}
                                style={{
                                  width: "100%",
                                  fontFamily: T.font.body,
                                  fontSize: "0.75rem",
                                  color: T.color.charcoal,
                                  background: "none",
                                  border: "none",
                                  padding: "0.5rem 0.75rem",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.375rem",
                                }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${T.color.warmStone}`; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                              >
                                <BookIcon size={12} color={T.color.walnut} />
                                {t("viewInLibrary")}
                              </button>
                              <button
                                onClick={() => { setSelMem(entry.mem); setMemMenuId(null); }}
                                style={{
                                  width: "100%",
                                  fontFamily: T.font.body,
                                  fontSize: "0.75rem",
                                  color: T.color.charcoal,
                                  background: "none",
                                  border: "none",
                                  padding: "0.5rem 0.75rem",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.375rem",
                                }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${T.color.warmStone}`; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                              >
                                <PencilIcon size={12} color={T.color.walnut} />
                                {t("editDetails")}
                              </button>
                            </div>
                          )}

                          {/* Wing accent indicator */}
                          <div
                            style={{
                              width: "0.25rem",
                              height: "1.5rem",
                              borderRadius: "0.125rem",
                              background: entry.wingAccent,
                              opacity: 0.5,
                              flexShrink: 0,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Connecting line to next group */}
                  {gi < groups.length - 1 && (
                    <div
                      style={{
                        position: "relative",
                        height: "1rem",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: "0.3125rem",
                          top: 0,
                          bottom: 0,
                          width: 2,
                          background: T.color.cream,
                          zIndex: 1,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {groups.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <CalendarIcon size={36} color={T.color.muted} />
                <p
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.875rem",
                    color: T.color.muted,
                    marginTop: "0.75rem",
                  }}
                >
                  {t("noMemories")}
                </p>
                <p
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    color: T.color.sandstone,
                    marginTop: "0.25rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  {t("noMemoriesDesc")}
                </p>
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <button
                    onClick={() => { onClose(); onNavigateLibrary(); }}
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: T.color.walnut,
                      background: `${T.color.walnut}12`,
                      border: `1px solid ${T.color.walnut}30`,
                      borderRadius: "0.375rem",
                      padding: "0.5rem 0.875rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <BookIcon size={13} color={T.color.walnut} /> {t("goToLibrary")}
                  </button>
                  <button
                    onClick={() => setShowAddForm(true)}
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: T.color.gold,
                      background: `${T.color.gold}12`,
                      border: `1px solid ${T.color.gold}30`,
                      borderRadius: "0.375rem",
                      padding: "0.5rem 0.875rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <PlusIcon size={12} color={T.color.gold} /> {t("addImportantDate")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
