"use client";
import { useState, useEffect, useCallback, useRef, lazy, Suspense, type CSSProperties } from "react";
import { T } from "@/lib/theme";
import { Sheet } from "@/components/ui/Sheet";
import RelayIcons from "@/components/ui/RelayIcons";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useReducedMotion } from "@/lib/hooks/useIsMobile";
import { useInterviewStore } from "@/lib/stores/interviewStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { translateWingName, translateRoomName, type Wing, type WingRoom } from "@/lib/constants/wings";
import type { InterviewTemplate } from "@/lib/constants/interviews";
import { CREAM, TRAY, HAIRLINE, INK, MUTED, EMBER, SAGE, GOLD } from "@/lib/libraryTokens";

// Full-screen interview dialog, loaded only when a chapter interview starts.
const InterviewPanel = lazy(() => import("@/components/ui/InterviewPanel"));

/* ------------------------------------------------------------------ types */

interface Chapter {
  id: string;
  title: string;
  period_label: string | null;
  content: string | null;
  memory_ids: string[] | null;
  position: number;
  created_at: string;
}

interface MemoryItem {
  id: string;
  title: string | null;
  type: string | null;
  created_at: string | null;
  room_id: string | null; // DB room uuid — mapped to a palace room via RoomRef
}

/** DB room uuid → the client-side palace location (rooms.name stores the local
 *  room id like "ro1"; wings.slug stores the local wing id like "roots"). */
interface RoomRef {
  localRoomId: string;
  wingId: string;
}

type ChapterPatch = Partial<Pick<Chapter, "title" | "period_label" | "content" | "memory_ids" | "position">>;

const CHAPTER_COLUMNS = "id, title, period_label, content, memory_ids, position, created_at";
const DANGER = "#A6432E"; // library token: DANGER (warm on-brand destructive)
const CARD_SHADOW = "0 0.25rem 1rem rgba(64,59,54,0.07)"; // library token: SHADOW[1]

/* ------------------------------------------------------------ shared bits */

const iconButtonStyle = (reducedMotion: boolean): CSSProperties => ({
  minWidth: "2.75rem", minHeight: "2.75rem",
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  background: "transparent", border: "none", borderRadius: "0.625rem",
  color: MUTED, fontSize: "1rem", cursor: "pointer", padding: 0,
  transition: reducedMotion ? "none" : "background 0.2s ease, color 0.2s ease",
});

const inputStyle: CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "0.625rem 0.75rem", minHeight: "2.75rem",
  borderRadius: "0.625rem", border: `0.0625rem solid ${HAIRLINE}`,
  background: T.color.white, color: INK,
  fontFamily: T.font.body, fontSize: "1rem", // ≥1rem: no iOS focus zoom
  outline: "none",
};

/** Small glyph per memory type for the attach tree rows. */
const TYPE_GLYPHS: Record<string, string> = {
  photo: "\u{1F4F7}", image: "\u{1F4F7}", video: "\u{1F39E}️", audio: "\u{1F399}️",
  voice: "\u{1F399}️", interview: "\u{1F3A4}", text: "\u{1F4DD}", note: "\u{1F4DD}",
};
const typeGlyph = (type: string | null): string => TYPE_GLYPHS[type ?? ""] ?? "\u{1F4C4}";

/** Attached-count pill shown on wing/room rows. */
const countPillStyle: CSSProperties = {
  fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 700, color: EMBER,
  background: "rgba(184,92,56,0.10)", borderRadius: "0.625rem",
  padding: "0.125rem 0.5rem", flexShrink: 0,
};

/* ---------------------------------------------------------- chapter card */

interface ChapterCardProps {
  chapter: Chapter;
  index: number;
  count: number;
  t: (key: string, params?: Record<string, string>) => string;
  memories: MemoryItem[] | null;
  memoriesLoading: boolean;
  ensureMemories: () => void;
  persist: (id: string, patch: ChapterPatch) => Promise<boolean>;
  patchLocal: (id: string, patch: ChapterPatch) => void;
  onDelete: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  reducedMotion: boolean;
  roomMap: Record<string, RoomRef> | null;
  wings: Wing[];
  getWingRooms: (wingId: string) => WingRoom[];
  tWings: (key: string) => string;
}

function ChapterCard({
  chapter, index, count, t, memories, memoriesLoading, ensureMemories,
  persist, patchLocal, onDelete, onMove, reducedMotion,
  roomMap, wings, getWingRooms, tWings,
}: ChapterCardProps) {
  // Header inline edit
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(chapter.title);
  const [periodDraft, setPeriodDraft] = useState(chapter.period_label ?? "");

  // Attach-memories expander — collapsible wings → rooms → media tree
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [memFilter, setMemFilter] = useState("");
  const [expandedWings, setExpandedWings] = useState<Record<string, boolean>>({});
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});
  const autoExpandedRef = useRef(false);

  // Chapter-specific interview
  const startDynamicSession = useInterviewStore((s) => s.startDynamicSession);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewStarting, setInterviewStarting] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);

  // Weave
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Content textarea — shown once content exists (or right after a weave)
  const [draft, setDraft] = useState<string | null>(
    chapter.content && chapter.content.length > 0 ? chapter.content : null
  );
  const [savedFlash, setSavedFlash] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Two-step delete confirm
  const [deleteArmed, setDeleteArmed] = useState(false);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current);
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
  }, []);

  const attachedIds = chapter.memory_ids ?? [];

  const startEdit = () => {
    setTitleDraft(chapter.title);
    setPeriodDraft(chapter.period_label ?? "");
    setEditing(true);
  };

  const saveHeader = () => {
    setEditing(false);
    const title = titleDraft.trim() || chapter.title; // title stays required
    const period = periodDraft.trim() || null;
    if (title !== chapter.title || period !== (chapter.period_label ?? null)) {
      void persist(chapter.id, { title, period_label: period });
    }
  };

  const toggleMemory = (memId: string) => {
    const prev = attachedIds;
    const next = prev.includes(memId) ? prev.filter((x) => x !== memId) : [...prev, memId];
    patchLocal(chapter.id, { memory_ids: next }); // optimistic
    void persist(chapter.id, { memory_ids: next }).then((ok) => {
      if (!ok) patchLocal(chapter.id, { memory_ids: prev }); // revert on failure
    });
  };

  /** Attach/detach a whole room's memories at once — same optimistic + revert
   *  contract as toggleMemory, but with a single persist round-trip. */
  const setRoomAll = (memIds: string[], select: boolean) => {
    if (memIds.length === 0) return;
    const prev = attachedIds;
    const idSet = new Set(memIds);
    const next = select
      ? [...prev, ...memIds.filter((x) => !prev.includes(x))]
      : prev.filter((x) => !idSet.has(x));
    patchLocal(chapter.id, { memory_ids: next }); // optimistic
    void persist(chapter.id, { memory_ids: next }).then((ok) => {
      if (!ok) patchLocal(chapter.id, { memory_ids: prev }); // revert on failure
    });
  };

  // Collapsed by default; auto-expand the wings/rooms that already contain
  // attached memories, once per open of the expander.
  useEffect(() => {
    if (!memoriesOpen) { autoExpandedRef.current = false; return; }
    if (autoExpandedRef.current || memories === null || roomMap === null) return;
    autoExpandedRef.current = true;
    const attached = new Set(chapter.memory_ids ?? []);
    const w: Record<string, boolean> = {};
    const r: Record<string, boolean> = {};
    for (const m of memories) {
      if (!attached.has(m.id) || !m.room_id) continue;
      const ref = roomMap[m.room_id];
      if (!ref) continue;
      w[ref.wingId] = true;
      r[`${ref.wingId}/${ref.localRoomId}`] = true;
    }
    setExpandedWings(w);
    setExpandedRooms(r);
    // attachedIds intentionally read once at open — this is an init, not a sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoriesOpen, memories, roomMap]);

  /** Dynamic interview template for this chapter. Localization contract with
   *  InterviewPanel: it renders tTpl(textKey) in the "interviewLibrary"
   *  namespace and falls back to `question.text` when the lookup returns the
   *  key unchanged. So textKey is a deliberate miss ("lifestory-qN") and `text`
   *  carries the localized, {chapter}-interpolated question from the lifeStory
   *  section. titleKey/descKey hold already-localized literals for the same
   *  reason — a missed lookup renders them verbatim. */
  const buildChapterTemplate = (): InterviewTemplate => {
    const chapterRef = chapter.period_label
      ? `${chapter.title} (${chapter.period_label})`
      : chapter.title;
    return {
      id: `lifestory-${chapter.id}`,
      titleKey: chapter.title,
      descKey: t("chapterInterviewDesc"),
      wingId: "general",
      icon: "\u{1F4D6}",
      difficulty: "light",
      estimatedTotalMinutes: 10,
      questions: [1, 2, 3, 4, 5].map((n) => ({
        id: `lsq-${n}`,
        textKey: `lifestory-q${n}`,
        text: t(`q${n}`, { chapter: chapterRef }),
        estimatedMinutes: 2,
      })),
    };
  };

  const startChapterInterview = async () => {
    if (interviewStarting || interviewOpen) return;
    setGenError(null);
    setInterviewStarting(true);
    try {
      const ok = await startDynamicSession(buildChapterTemplate());
      if (ok) setInterviewOpen(true);
      else setGenError(t("errorGeneric"));
    } finally {
      setInterviewStarting(false);
    }
  };

  const closeChapterInterview = () => {
    setInterviewOpen(false);
    // Only surface the "re-weaving will use this" hint when the interview was
    // actually completed (abandon clears currentSession in the store).
    const s = useInterviewStore.getState().currentSession;
    if (s && s.status === "completed" && s.templateId === `lifestory-${chapter.id}`) {
      setInterviewDone(true);
    }
  };

  const weave = async () => {
    setGenError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/life-story/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: chapter.id }),
      });
      if (!res.ok) {
        setGenError(res.status === 503 ? t("errorNotConfigured") : t("errorGeneric"));
        return;
      }
      const data: { content?: string } = await res.json();
      if (typeof data.content === "string" && data.content.length > 0) {
        setDraft(data.content); // server already persisted it
        patchLocal(chapter.id, { content: data.content });
      } else {
        setGenError(t("errorGeneric"));
      }
    } catch {
      setGenError(t("errorGeneric"));
    } finally {
      setGenerating(false);
    }
  };

  const saveContent = () => {
    if (draft === null || draft === (chapter.content ?? "")) return;
    void persist(chapter.id, { content: draft }).then((ok) => {
      if (!ok) return;
      setSavedFlash(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSavedFlash(false), 2000);
    });
  };

  const armOrDelete = () => {
    if (deleteArmed) {
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
      onDelete(chapter.id);
      return;
    }
    setDeleteArmed(true);
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    deleteTimer.current = setTimeout(() => setDeleteArmed(false), 3000);
  };

  const autogrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 128)}px`;
  };

  const filterLower = memFilter.trim().toLowerCase();
  const matchesFilter = (m: MemoryItem) =>
    !filterLower || (m.title ?? "").toLowerCase().includes(filterLower);

  // ── Tree grouping: wings → rooms → this chapter's attachable memories ──
  // (counts use the full set; the filter only narrows what is displayed)
  const allMems = memories ?? [];
  const refFor = (m: MemoryItem): RoomRef | undefined =>
    m.room_id && roomMap ? roomMap[m.room_id] : undefined;
  const wingsTree = wings.map((wing) => ({
    wing,
    rooms: getWingRooms(wing.id).map((room) => ({
      room,
      mems: allMems.filter((m) => {
        const ref = refFor(m);
        return ref?.wingId === wing.id && ref.localRoomId === room.id;
      }),
    })),
  }));
  const groupedIds = new Set<string>();
  for (const w of wingsTree) for (const r of w.rooms) for (const m of r.mems) groupedIds.add(m.id);
  // Memories whose room maps to no known wing/room → final flat group.
  const ungrouped = allMems.filter((m) => !groupedIds.has(m.id));

  const hasContent = draft !== null || (chapter.content !== null && chapter.content !== "");

  return (
    <div style={{
      background: CREAM, border: `0.0625rem solid ${HAIRLINE}`, borderRadius: "0.75rem",
      boxShadow: CARD_SHADOW, padding: "1rem",
    }}>
      {/* ---- header: title + period, inline-editable ---- */}
      {editing ? (
        <div
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) saveHeader(); }}
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}
        >
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            placeholder={t("chapterTitlePlaceholder")}
            aria-label={t("chapterTitlePlaceholder")}
            style={inputStyle}
          />
          <input
            value={periodDraft}
            onChange={(e) => setPeriodDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            placeholder={t("periodPlaceholder")}
            aria-label={t("periodPlaceholder")}
            style={inputStyle}
          />
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.25rem", marginBottom: "0.5rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, color: INK, lineHeight: 1.15, overflowWrap: "anywhere" }}>
              {chapter.title}
            </div>
            {chapter.period_label && (
              <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, marginTop: "0.125rem" }}>
                {chapter.period_label}
              </div>
            )}
          </div>
          <button onClick={startEdit} aria-label="Edit chapter title" style={iconButtonStyle(reducedMotion)}>
            {"✎"}
          </button>
          <button
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label="Move chapter up"
            style={{ ...iconButtonStyle(reducedMotion), opacity: index === 0 ? 0.3 : 1, cursor: index === 0 ? "default" : "pointer" }}
          >
            {"↑"}
          </button>
          <button
            onClick={() => onMove(index, 1)}
            disabled={index === count - 1}
            aria-label="Move chapter down"
            style={{ ...iconButtonStyle(reducedMotion), opacity: index === count - 1 ? 0.3 : 1, cursor: index === count - 1 ? "default" : "pointer" }}
          >
            {"↓"}
          </button>
        </div>
      )}

      {/* ---- attach memories expander ---- */}
      <button
        onClick={() => {
          const opening = !memoriesOpen;
          setMemoriesOpen(opening);
          if (opening) ensureMemories();
        }}
        aria-expanded={memoriesOpen}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
          minHeight: "2.75rem", padding: "0.5rem 0.75rem", boxSizing: "border-box",
          background: TRAY, border: `0.0625rem solid ${HAIRLINE}`, borderRadius: "0.625rem",
          cursor: "pointer", textAlign: "left",
          transition: reducedMotion ? "none" : "background 0.2s ease",
        }}
      >
        <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: INK }}>
          {t("attachMemories")}
        </span>
        <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
          {attachedIds.length > 0
            ? t("memoriesAttached", { count: String(attachedIds.length) })
            : t("noMemoriesAttached")}
          <span aria-hidden="true">{memoriesOpen ? "▴" : "▾"}</span>
        </span>
      </button>

      {memoriesOpen && (
        <div style={{
          marginTop: "0.5rem", padding: "0.75rem",
          background: T.color.white, border: `0.0625rem solid ${HAIRLINE}`, borderRadius: "0.625rem",
        }}>
          {memoriesLoading || memories === null || roomMap === null ? (
            <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, padding: "0.5rem 0" }}>
              {"…"}
            </div>
          ) : memories.length === 0 ? (
            <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, padding: "0.5rem 0" }}>
              {t("noMemoriesAttached")}
            </div>
          ) : (
            <>
              <input
                value={memFilter}
                onChange={(e) => setMemFilter(e.target.value)}
                placeholder={t("attachMemories")}
                aria-label={t("attachMemories")}
                style={{ ...inputStyle, marginBottom: "0.5rem" }}
              />
              <div className="mp-scroll" style={{ maxHeight: "18rem", overflowY: "auto", display: "flex", flexDirection: "column" }}>
                {wingsTree.map(({ wing, rooms }) => {
                  const wingMems = rooms.flatMap((r) => r.mems);
                  const wingAttached = wingMems.reduce((n, m) => n + (attachedIds.includes(m.id) ? 1 : 0), 0);
                  // While filtering, hide wings without matches and force-expand the rest.
                  if (filterLower && !wingMems.some(matchesFilter)) return null;
                  const wingOpen = filterLower ? true : !!expandedWings[wing.id];
                  const wingEmpty = wingMems.length === 0; // shown collapsed-muted, still expandable
                  return (
                    <div key={wing.id}>
                      <button
                        onClick={() => setExpandedWings((prev) => ({ ...prev, [wing.id]: !prev[wing.id] }))}
                        aria-expanded={wingOpen}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.5rem", width: "100%",
                          minHeight: "2.75rem", padding: "0.25rem", boxSizing: "border-box",
                          background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                          borderBottom: `0.0625rem solid ${HAIRLINE}40`,
                          opacity: wingEmpty ? 0.55 : 1,
                          transition: reducedMotion ? "none" : "background 0.2s ease",
                        }}
                      >
                        <span aria-hidden="true" style={{ color: MUTED, fontSize: "0.75rem", width: "1rem", flexShrink: 0 }}>
                          {wingOpen ? "▾" : "▸"}
                        </span>
                        <span aria-hidden="true" style={{ flexShrink: 0 }}>{wing.icon}</span>
                        <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: INK, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {translateWingName(wing, tWings)}
                        </span>
                        {wingAttached > 0 && (
                          <span aria-label={t("memoriesAttached", { count: String(wingAttached) })} style={countPillStyle}>
                            {wingAttached}
                          </span>
                        )}
                      </button>
                      {wingOpen && rooms.map(({ room, mems }) => {
                        const roomKey = `${wing.id}/${room.id}`;
                        const visibleRoomMems = mems.filter(matchesFilter);
                        if (filterLower && visibleRoomMems.length === 0) return null;
                        const roomOpen = filterLower ? true : !!expandedRooms[roomKey];
                        const roomAttached = mems.reduce((n, m) => n + (attachedIds.includes(m.id) ? 1 : 0), 0);
                        const allAttached = visibleRoomMems.length > 0 && visibleRoomMems.every((m) => attachedIds.includes(m.id));
                        return (
                          <div key={roomKey}>
                            <div style={{ display: "flex", alignItems: "center", borderBottom: `0.0625rem solid ${HAIRLINE}40` }}>
                              <button
                                onClick={() => setExpandedRooms((prev) => ({ ...prev, [roomKey]: !prev[roomKey] }))}
                                aria-expanded={roomOpen}
                                style={{
                                  display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0,
                                  minHeight: "2.75rem", padding: "0.25rem 0.25rem 0.25rem 1.375rem", boxSizing: "border-box",
                                  background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                                  transition: reducedMotion ? "none" : "background 0.2s ease",
                                }}
                              >
                                <span aria-hidden="true" style={{ color: MUTED, fontSize: "0.75rem", width: "1rem", flexShrink: 0 }}>
                                  {roomOpen ? "▾" : "▸"}
                                </span>
                                <span style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: INK, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {translateRoomName(room, tWings)}
                                </span>
                                {roomAttached > 0 && (
                                  <span aria-label={t("memoriesAttached", { count: String(roomAttached) })} style={countPillStyle}>
                                    {roomAttached}
                                  </span>
                                )}
                              </button>
                              {visibleRoomMems.length > 0 && (
                                <label
                                  title={t("selectAllRoom")}
                                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "2.75rem", minHeight: "2.75rem", cursor: "pointer", flexShrink: 0 }}
                                >
                                  <input
                                    type="checkbox"
                                    aria-label={t("selectAllRoom")}
                                    checked={allAttached}
                                    onChange={() => setRoomAll(visibleRoomMems.map((m) => m.id), !allAttached)}
                                    style={{ width: "1.125rem", height: "1.125rem", accentColor: EMBER, cursor: "pointer" }}
                                  />
                                </label>
                              )}
                            </div>
                            {roomOpen && (
                              visibleRoomMems.length === 0 ? (
                                <div style={{ padding: "0.375rem 0.25rem 0.625rem 2.5rem", fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED }}>
                                  {t("treeNoMedia")}
                                </div>
                              ) : (
                                visibleRoomMems.map((m) => {
                                  const checked = attachedIds.includes(m.id);
                                  return (
                                    <label
                                      key={m.id}
                                      style={{
                                        display: "flex", alignItems: "center", gap: "0.625rem",
                                        minHeight: "2.75rem", padding: "0.25rem 0.25rem 0.25rem 2.5rem", cursor: "pointer",
                                        borderBottom: `0.0625rem solid ${HAIRLINE}40`,
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleMemory(m.id)}
                                        style={{ width: "1.125rem", height: "1.125rem", accentColor: EMBER, flexShrink: 0, cursor: "pointer" }}
                                      />
                                      <span aria-hidden="true" style={{ fontSize: "0.875rem", flexShrink: 0 }}>{typeGlyph(m.type)}</span>
                                      <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: checked ? INK : MUTED, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {m.title || "—"}
                                      </span>
                                      {m.created_at && (
                                        <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, flexShrink: 0 }}>
                                          {m.created_at.slice(0, 4)}
                                        </span>
                                      )}
                                    </label>
                                  );
                                })
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {/* Memories whose room maps to no known wing/room — final flat group */}
                {ungrouped.filter(matchesFilter).length > 0 && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", minHeight: "2.75rem", padding: "0.25rem", fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: MUTED, borderBottom: `0.0625rem solid ${HAIRLINE}40` }}>
                      {t("attachMemories")}
                    </div>
                    {ungrouped.filter(matchesFilter).map((m) => {
                      const checked = attachedIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          style={{
                            display: "flex", alignItems: "center", gap: "0.625rem",
                            minHeight: "2.75rem", padding: "0.25rem", cursor: "pointer",
                            borderBottom: `0.0625rem solid ${HAIRLINE}40`,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMemory(m.id)}
                            style={{ width: "1.125rem", height: "1.125rem", accentColor: EMBER, flexShrink: 0, cursor: "pointer" }}
                          />
                          <span aria-hidden="true" style={{ fontSize: "0.875rem", flexShrink: 0 }}>{typeGlyph(m.type)}</span>
                          <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: checked ? INK : MUTED, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {m.title || "—"}
                          </span>
                          {m.created_at && (
                            <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, flexShrink: 0 }}>
                              {m.created_at.slice(0, 4)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ---- weave ---- */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
        <button
          onClick={weave}
          disabled={generating}
          style={{
            padding: "0.625rem 1.25rem", minHeight: "2.75rem", borderRadius: "0.75rem", border: "none",
            background: generating ? MUTED : EMBER, color: T.color.white,
            fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
            cursor: generating ? "default" : "pointer",
            transition: reducedMotion ? "none" : "background 0.2s ease",
          }}
        >
          {generating ? t("generating") : hasContent ? t("regenerate") : t("generate")}
        </button>
        {savedFlash && (
          <span role="status" style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: SAGE }}>
            {t("saved")}
          </span>
        )}
      </div>

      {/* ---- chapter-specific interview ---- */}
      <div style={{ marginTop: "0.625rem" }}>
        <button
          onClick={() => void startChapterInterview()}
          disabled={interviewStarting}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "0.5rem 1rem", minHeight: "2.75rem", borderRadius: "0.75rem",
            border: `0.0625rem solid ${HAIRLINE}`, background: TRAY,
            fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
            color: interviewStarting ? MUTED : EMBER,
            cursor: interviewStarting ? "default" : "pointer",
            transition: reducedMotion ? "none" : "background 0.2s ease, color 0.2s ease",
          }}
        >
          <span aria-hidden="true">{"\u{1F399}️"}</span>
          {t("recordInterview")}
        </button>
        <p
          role={interviewDone ? "status" : undefined}
          style={{
            fontFamily: T.font.body, fontSize: "0.8125rem",
            color: interviewDone ? SAGE : MUTED, fontWeight: interviewDone ? 600 : 400,
            margin: "0.375rem 0 0", lineHeight: 1.4,
          }}
        >
          {interviewDone ? `✓ ${t("recordInterviewHint")}` : t("recordInterviewHint")}
        </p>
      </div>

      {genError && (
        <p role="alert" style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: DANGER, margin: "0.5rem 0 0", lineHeight: 1.4 }}>
          {genError}
        </p>
      )}

      {/* ---- woven content, freely editable ---- */}
      {/* LEG-003 (AI Act art. 50): chapter prose is AI-woven — badge its origin.
          Content only ever originates from /api/life-story/generate; user edits
          afterwards do not remove the AI-origin marker. */}
      {hasContent && (
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.3125rem",
            marginTop: "0.75rem", padding: "0.1875rem 0.5625rem",
            borderRadius: "0.75rem", border: `0.0625rem solid ${HAIRLINE}`,
            background: T.color.white, color: MUTED,
            fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.09 6.26L20 10l-4.91 3.74L17.18 20 12 16.27 6.82 20l2.09-6.26L4 10l5.91-1.74z" />
          </svg>
          {t("aiBadge")}
        </div>
      )}
      {hasContent && (
        <textarea
          ref={(el) => { textareaRef.current = el; if (el) { el.style.height = "auto"; el.style.height = `${Math.max(el.scrollHeight, 128)}px`; } }}
          value={draft ?? chapter.content ?? ""}
          onChange={(e) => { setDraft(e.target.value); autogrow(); }}
          onBlur={saveContent}
          placeholder={t("contentPlaceholder")}
          aria-label={t("contentPlaceholder")}
          style={{
            width: "100%", boxSizing: "border-box", marginTop: "0.75rem",
            minHeight: "8rem", resize: "vertical",
            padding: "0.75rem", borderRadius: "0.625rem",
            border: `0.0625rem solid ${HAIRLINE}`, background: T.color.white,
            color: INK, fontFamily: T.font.body, fontSize: "1rem", lineHeight: 1.5,
            outline: "none",
          }}
        />
      )}

      {/* ---- delete: two-step inline confirm ---- */}
      <div style={{ marginTop: "0.5rem", textAlign: "right" }}>
        <button
          onClick={armOrDelete}
          aria-label={deleteArmed ? t("confirmDelete") : t("deleteChapter")}
          style={{
            minHeight: "2.75rem", padding: "0.5rem 0.75rem", border: "none",
            background: "transparent", borderRadius: "0.625rem",
            fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: deleteArmed ? 700 : 500,
            color: DANGER, cursor: "pointer",
            transition: reducedMotion ? "none" : "color 0.2s ease",
          }}
        >
          {deleteArmed ? t("confirmDelete") : t("deleteChapter")}
        </button>
      </div>

      {/* ---- full-screen chapter interview (self-contained dialog) ---- */}
      {interviewOpen && (
        <Suspense fallback={null}>
          <InterviewPanel onClose={closeChapterInterview} />
        </Suspense>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- panel */

export default function LifeStoryPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("lifeStory");
  const { t: tWings } = useTranslation("wings");
  const reducedMotion = useReducedMotion();
  const [supabase] = useState(() => createClient());

  // Wing/room structure for the attach tree — same client-side, localStorage-
  // backed store HomeView uses.
  const getWings = useRoomStore((s) => s.getWings);
  const getWingRooms = useRoomStore((s) => s.getWingRooms);
  const wings = getWings();

  const [userId, setUserId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Lazily-fetched memory list, shared by all cards (null = not fetched yet),
  // plus the DB-room-uuid → palace-location map that drives the tree grouping.
  const [memories, setMemories] = useState<MemoryItem[] | null>(null);
  const [roomMap, setRoomMap] = useState<Record<string, RoomRef> | null>(null);
  const [memoriesLoading, setMemoriesLoading] = useState(false);

  // Add-chapter form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPeriod, setNewPeriod] = useState("");
  const [adding, setAdding] = useState(false);

  const cancelledRef = useRef(false);
  useEffect(() => {
    cancelledRef.current = false;
    return () => { cancelledRef.current = true; };
  }, []);

  const loadChapters = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelledRef.current) return;
      if (!user) { setError(true); return; }
      setUserId(user.id);
      const { data, error: qError } = await supabase
        .from("life_story_chapters")
        .select(CHAPTER_COLUMNS)
        .eq("user_id", user.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (cancelledRef.current) return;
      if (qError) { setError(true); return; }
      setChapters((data as Chapter[] | null) ?? []);
    } catch {
      if (!cancelledRef.current) setError(true);
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { void loadChapters(); }, [loadChapters]);

  const ensureMemories = useCallback(() => {
    if (memories !== null || memoriesLoading || !userId) return;
    setMemoriesLoading(true);
    void (async () => {
      try {
        const [memRes, roomRes, wingRes] = await Promise.all([
          supabase
            .from("memories")
            .select("id, title, type, created_at, room_id")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase.from("rooms").select("id, name, wing_id").eq("user_id", userId),
          supabase.from("wings").select("id, slug").eq("user_id", userId),
        ]);
        if (cancelledRef.current) return;
        // rooms.name stores the LOCAL room id (e.g. "ro1") and wings.slug the
        // local wing id (e.g. "roots") — build db-uuid → palace location.
        const wingSlugById: Record<string, string> = {};
        for (const w of (wingRes.data as { id: string; slug: string }[] | null) ?? []) {
          wingSlugById[w.id] = w.slug;
        }
        const map: Record<string, RoomRef> = {};
        for (const r of (roomRes.data as { id: string; name: string; wing_id: string }[] | null) ?? []) {
          const slug = wingSlugById[r.wing_id];
          if (slug) map[r.id] = { localRoomId: r.name, wingId: slug };
        }
        setRoomMap(map);
        setMemories((memRes.data as MemoryItem[] | null) ?? []);
      } catch {
        if (!cancelledRef.current) {
          setRoomMap({}); // degrade gracefully: everything lands in the flat group
          setMemories([]);
        }
      } finally {
        if (!cancelledRef.current) setMemoriesLoading(false);
      }
    })();
  }, [memories, memoriesLoading, userId, supabase]);

  const patchLocal = useCallback((id: string, patch: ChapterPatch) => {
    setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const persist = useCallback(async (id: string, patch: ChapterPatch): Promise<boolean> => {
    if (!userId) return false;
    const { error: uError } = await supabase
      .from("life_story_chapters")
      .update(patch)
      .eq("id", id)
      .eq("user_id", userId); // owner-scoped (RLS enforces this too)
    if (uError) return false;
    if (!cancelledRef.current) patchLocal(id, patch);
    return true;
  }, [supabase, userId, patchLocal]);

  const addChapter = useCallback(async () => {
    const title = newTitle.trim();
    if (!title || !userId || adding) return;
    setAdding(true);
    try {
      const maxPos = chapters.reduce((m, c) => Math.max(m, c.position), -1);
      const { data, error: iError } = await supabase
        .from("life_story_chapters")
        .insert({
          user_id: userId,
          title,
          period_label: newPeriod.trim() || null,
          position: maxPos + 1,
        })
        .select(CHAPTER_COLUMNS)
        .single();
      if (cancelledRef.current) return;
      if (iError || !data) return;
      setChapters((prev) => [...prev, data as Chapter]);
      setNewTitle("");
      setNewPeriod("");
      setShowAddForm(false);
    } finally {
      if (!cancelledRef.current) setAdding(false);
    }
  }, [newTitle, newPeriod, userId, adding, chapters, supabase]);

  const deleteChapter = useCallback((id: string) => {
    if (!userId) return;
    setChapters((prev) => prev.filter((c) => c.id !== id)); // optimistic
    void supabase
      .from("life_story_chapters")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .then(({ error: dError }) => {
        if (dError && !cancelledRef.current) void loadChapters(); // resync on failure
      });
  }, [supabase, userId, loadChapters]);

  const moveChapter = useCallback((index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= chapters.length || !userId) return;
    const a = chapters[index];
    const b = chapters[j];
    let posA = a.position;
    let posB = b.position;
    if (posA === posB) { posA = index; posB = j; } // legacy rows may share a position
    // Optimistic swap in the list…
    const next = [...chapters];
    next[index] = { ...b, position: posA };
    next[j] = { ...a, position: posB };
    setChapters(next);
    // …persisted for both rows (owner-scoped).
    void Promise.all([
      supabase.from("life_story_chapters").update({ position: posB }).eq("id", a.id).eq("user_id", userId),
      supabase.from("life_story_chapters").update({ position: posA }).eq("id", b.id).eq("user_id", userId),
    ]);
  }, [chapters, supabase, userId]);

  /* ---------------------------------------------------------- rendering */

  const addForm = showAddForm ? (
    <div style={{
      background: CREAM, border: `0.0625rem solid ${HAIRLINE}`, borderRadius: "0.75rem",
      boxShadow: CARD_SHADOW, padding: "1rem",
      display: "flex", flexDirection: "column", gap: "0.5rem",
    }}>
      <input
        autoFocus
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && newTitle.trim()) void addChapter(); }}
        placeholder={t("chapterTitlePlaceholder")}
        aria-label={t("chapterTitlePlaceholder")}
        style={inputStyle}
      />
      <input
        value={newPeriod}
        onChange={(e) => setNewPeriod(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && newTitle.trim()) void addChapter(); }}
        placeholder={t("periodPlaceholder")}
        aria-label={t("periodPlaceholder")}
        style={inputStyle}
      />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
        <button
          onClick={() => void addChapter()}
          disabled={!newTitle.trim() || adding}
          style={{
            flex: 1, padding: "0.625rem 1.25rem", minHeight: "2.75rem", borderRadius: "0.75rem", border: "none",
            background: !newTitle.trim() || adding ? MUTED : EMBER, color: T.color.white,
            fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
            cursor: !newTitle.trim() || adding ? "default" : "pointer",
          }}
        >
          {t("addChapter")}
        </button>
        <button
          onClick={() => { setShowAddForm(false); setNewTitle(""); setNewPeriod(""); }}
          style={{
            padding: "0.625rem 1rem", minHeight: "2.75rem", borderRadius: "0.75rem",
            border: `0.0625rem solid ${HAIRLINE}`, background: "transparent",
            fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500, color: MUTED, cursor: "pointer",
          }}
        >
          {t("close")}
        </button>
      </div>
    </div>
  ) : (
    <button
      onClick={() => setShowAddForm(true)}
      style={{
        width: "100%", padding: "0.75rem 1.25rem", minHeight: "2.75rem", borderRadius: "0.75rem",
        border: `0.0625rem dashed ${HAIRLINE}`, background: TRAY,
        fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: EMBER, cursor: "pointer",
        transition: reducedMotion ? "none" : "background 0.2s ease",
      }}
    >
      {"+ "}{t("addChapter")}
    </button>
  );

  return (
    <Sheet open onClose={onClose} title={t("title")} icon={<RelayIcons.lifestory />} side="right" maxWidth="30rem">
      <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, margin: "-0.5rem 0 0.75rem" }}>
        {t("subtitle")}
      </p>
      {/* Gilt seam — the palace speaking, one thin line only. */}
      <div aria-hidden="true" style={{
        height: "0.0625rem", marginBottom: "1.25rem",
        background: `linear-gradient(to right, ${GOLD}, rgba(212,175,55,0.35) 40%, transparent)`,
      }} />

      {loading ? (
        <div style={{ textAlign: "center", padding: "2.5rem", color: MUTED, fontFamily: T.font.body, fontSize: "0.8125rem" }}>
          {"…"}
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "2.5rem" }}>
          <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>{"⚠️"}</div>
          <p style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: INK, margin: "0 0 1rem", lineHeight: 1.4 }}>
            {t("errorGeneric")}
          </p>
          <button
            onClick={() => void loadChapters()}
            aria-label="Retry"
            style={{
              padding: "0.625rem 1.25rem", borderRadius: "0.75rem", border: "none",
              background: EMBER, color: T.color.white,
              fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600, cursor: "pointer",
              minHeight: "2.75rem", minWidth: "2.75rem",
            }}
          >
            {"↻"}
          </button>
        </div>
      ) : chapters.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem 0.5rem" }}>
          <div style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>{"\u{1F4D6}"}</div>
          <p style={{ fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, color: INK, margin: "0 0 0.5rem" }}>
            {t("emptyTitle")}
          </p>
          <p style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED, margin: "0 0 1.5rem", lineHeight: 1.4 }}>
            {t("emptyBody")}
          </p>
          {addForm}
          <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, margin: "1.25rem 0 0", lineHeight: 1.4 }}>
            {t("interviewHint")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: INK, margin: 0, lineHeight: 1.4 }}>
            {t("intro")}
          </p>
          {chapters.map((chapter, index) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              index={index}
              count={chapters.length}
              t={t}
              memories={memories}
              memoriesLoading={memoriesLoading}
              ensureMemories={ensureMemories}
              persist={persist}
              patchLocal={patchLocal}
              onDelete={deleteChapter}
              onMove={moveChapter}
              reducedMotion={reducedMotion}
              roomMap={roomMap}
              wings={wings}
              getWingRooms={getWingRooms}
              tWings={tWings}
            />
          ))}
          {addForm}
          <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, margin: 0, lineHeight: 1.4 }}>
            {t("interviewHint")}
          </p>
        </div>
      )}
    </Sheet>
  );
}
