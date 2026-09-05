"use client";
// ─────────────────────────────────────────────────────────────────────────────
// The Steward's Ledger — the room's MEDIA + PLAYER manager.
// One room-scoped surface in the shared Sheet primitive (right rail on desktop,
// bottom sheet on mobile), organised by the room's physical STATIONS. Reuses the
// Atrium tray/lane + Library card grammar. No tabs, no room-type picker, no
// Library/Gallery. See docs/ROOM_UI_MEDIA_PLAYER_MASTERPLAN.md.
//   W1: shell + station lanes + binary Shown/Archive toggle + photo chip.
//   W2: import→station assign, Write composer, search, Undo.
//   W3: player anchor card.
//   Owner 2026-08-18: ALL media visible (archived grouped in their own tray);
//   MANTELPIECE as its own lane (★ feature); full-screen item view via onSelect;
//   add FROM OTHER ROOMS; the player is always present when the room has AV.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { INK, EMBER } from "@/lib/libraryTokens";
import { Sheet } from "@/components/ui/Sheet";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { confirmDialog } from "@/lib/ui/confirm";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { translateRoomName } from "@/lib/constants/wings";
import { TypeIcon } from "@/lib/constants/type-icons";
import ImportHub from "@/components/ui/ImportHub";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { importFilesToRoom, writeTextMemory } from "@/lib/ui/roomImport";
import { byLaneOrder } from "@/lib/ui/spotOrder";

const MUTED = "#716A5E";
const SAND = T.color.sandstone;
const BRONZE = "#8B6B4A";
const TRAY = { terracotta: "#F6EBE3", gold: "#FAF3E0", sage: "#EFF2E8" } as const;

type StationId = "portraits" | "vitrine" | "library" | "gramophone" | "screen";
const STATIONS: { id: StationId; tray: string }[] = [
  { id: "portraits", tray: TRAY.terracotta },
  { id: "vitrine", tray: TRAY.sage },
  { id: "library", tray: TRAY.sage },
  { id: "gramophone", tray: TRAY.terracotta },
  { id: "screen", tray: TRAY.terracotta },
];

function normType(mem: Mem): string {
  if (mem.type === "voice" || mem.type === "interview") return "audio";
  if (mem.type === "orb") return "case";
  if (mem.type === "text") return "document";
  return mem.type;
}
function impliedUnit(mem: Mem): string {
  const u = mem.displayUnit;
  if (u === "vitrine" || u === "bookshelf" || u === "vinyl" || u === "screen" || u === "painting" || u === "frame") return u;
  switch (normType(mem)) {
    case "audio": return "vinyl"; case "video": return "screen";
    case "document": return "bookshelf"; case "case": return "vitrine";
    default: return "painting";
  }
}
function stationOf(mem: Mem): StationId {
  const u = mem.displayUnit;
  if (u === "vitrine") return "vitrine";
  if (u === "bookshelf") return "library";
  if (u === "vinyl") return "gramophone";
  if (u === "screen") return "screen";
  if (u === "painting" || u === "photo" || u === "frame") return "portraits";
  switch (normType(mem)) {
    case "audio": return "gramophone"; case "video": return "screen";
    case "document": return "library"; case "case": return "vitrine";
    default: return "portraits";
  }
}
function isPhotoLike(mem: Mem): boolean { const nt = normType(mem); return nt === "photo" || nt === "frame" || nt === "painting"; }
function isPlayable(mem: Mem): boolean { const nt = normType(mem); return (nt === "audio" || nt === "video") && !!mem.dataUrl; }
const stationUnit: Record<StationId, string> = { portraits: "painting", vitrine: "vitrine", library: "bookshelf", gramophone: "vinyl", screen: "screen" };
const isHero = (m: Mem) => (m as unknown as { hero?: boolean }).hero === true;

export interface OtherRoomFeed { id: string; name: string; mems: Mem[] }

interface Props {
  mems: Mem[];
  wing: Wing | null | undefined;
  room: WingRoom | null | undefined;
  onClose: () => void;
  onUpdate: (memId: string, updates: Partial<Mem>) => void;
  onDelete: (memId: string) => void;
  onAdd: (mem: Mem) => void;
  onSelect?: (mem: Mem) => void;
  canEdit?: boolean;
  /** true while the room's memories are still being fetched — shows "Gathering memories…" instead of 0-count/empty copy */
  loading?: boolean;
  anchor?: "top" | "nowPlaying";
  /** Other rooms the user may borrow memories from (owner #4 — only rooms the
   *  user can access; the caller applies the access filter). */
  otherRooms?: OtherRoomFeed[];
  /** Viewer/demo override: add memories locally instead of via the memory store. */
  addMemoryOverride?: (roomId: string, mem: Mem) => Promise<boolean> | boolean;
}

export default function RoomStewardLedger({ mems, room, onClose, onUpdate, onDelete, onAdd, onSelect, canEdit = true, loading = false, otherRooms, addMemoryOverride }: Props) {
  const { t } = useTranslation("roomMedia");
  const tr = useCallback((k: string, fallback: string) => { const v = t(k); return v && v !== k ? v : fallback; }, [t]);
  const storeAddMemory = useMemoryStore((s) => s.addMemory);
  const addMemory = addMemoryOverride ?? storeAddMemory;

  const [importUnit, setImportUnit] = useState<string | null | undefined>(undefined);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [writeOpen, setWriteOpen] = useState(false);
  const [fromRoomsOpen, setFromRoomsOpen] = useState(false);
  const [wTitle, setWTitle] = useState(""); const [wBody, setWBody] = useState("");
  const [undo, setUndo] = useState<{ label: string; run: (() => void) | null } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [trackIdx, setTrackIdx] = useState(0);
  // ── Drag & drop to a specific display spot (owner 2026-08-26) ──
  const [dragId, setDragId] = useState<string | null>(null);
  // index = insertion slot in the DISPLAYED lane (for the indicator line);
  // beforeId = the lane member to insert before (null = end of the full lane).
  const [dropHint, setDropHint] = useState<{ lane: StationId | "mantel" | "archive"; index: number; beforeId: string | null } | null>(null);
  // Touch fallback: per-card "Move to…" two-step picker (station → spot)
  const [movePick, setMovePick] = useState<{ id: string; station: StationId | null } | null>(null);

  const showUndo = (label: string, run: (() => void) | null) => {
    setUndo({ label, run });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };

  const roomName = room ? translateRoomName(room, (k: string) => t(k)) : "";
  const q = search.trim().toLowerCase();
  // Binary Shown/Archive: only an EXPLICIT displayed:false is archived. Memories
  // that were never toggled (displayed undefined/null — e.g. Library imports) are
  // shown, matching InteriorScene/Library — they used to vanish from the Ledger
  // entirely ("0 memories kept here" while the room and Library showed media).
  const isShown = (m: Mem) => m.displayed !== false;
  // Spot canon (drag & drop): the SAME order InteriorScene mounts anchors in —
  // explicit picks → sort_order (1-based) → date. See lib/ui/spotOrder.ts.
  const sorted = useMemo(() => [...mems].sort(byLaneOrder), [mems]);
  const filtered = useMemo(() => q ? sorted.filter((m) => (m.title || "").toLowerCase().includes(q)) : sorted, [sorted, q]);
  const kept = useMemo(() => sorted.filter(isShown), [sorted]);
  const archived = useMemo(() => filtered.filter((m) => m.displayed === false), [filtered]);
  const playables = useMemo(() => sorted.filter(isPlayable), [sorted]);
  const hero = useMemo(() => {
    const shownPortraits = sorted.filter((m) => isShown(m) && stationOf(m) === "portraits");
    return shownPortraits.find(isHero) || shownPortraits[0] || null;
  }, [sorted]);
  // Full (unfiltered) lane lists — reorder math + spot numbers must include
  // items a search is currently hiding, or drops would renumber a partial lane.
  const laneFull = useMemo(() => {
    const g: Record<StationId, Mem[]> = { portraits: [], vitrine: [], library: [], gramophone: [], screen: [] };
    for (const m of sorted) { if (isShown(m) && m !== hero) g[stationOf(m)].push(m); }
    return g;
  }, [sorted, hero]);
  const byStation = useMemo(() => {
    if (!q) return laneFull;
    const g: Record<StationId, Mem[]> = { portraits: [], vitrine: [], library: [], gramophone: [], screen: [] };
    for (const s of Object.keys(g) as StationId[]) g[s] = laneFull[s].filter((m) => filtered.includes(m));
    return g;
  }, [laneFull, filtered, q]);
  // memId → 1-based spot number within its station (position = 3D anchor index)
  const spotIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of Object.keys(laneFull) as StationId[]) laneFull[s].forEach((m, i) => map.set(m.id, i + 1));
    return map;
  }, [laneFull]);

  // Spot identity — mirrors InteriorScene's anchor order per station:
  // portraits fill the salon walls in run order, vitrine holds 12 shelf slots,
  // the library 6 scroll cubbies (first also open on the table), the gramophone
  // 6 records (first on the turntable), the screen 1 canvas + the player queue.
  const spotLabelText = useCallback((s: StationId, n: number): string => {
    const num = (k: string, f: string) => tr(k, f).replace("{n}", String(n));
    switch (s) {
      case "portraits": return num("spotWall", "Wall spot {n}");
      case "vitrine": return n <= 12 ? num("spotShelf", "Shelf {n} of 12") : tr("spotWaiting", "Awaiting a spot");
      case "library": return n === 1 ? tr("spotOpenBook", "Open on the reading table") : n <= 6 ? num("spotCubby", "Cubby {n} of 6") : tr("spotWaiting", "Awaiting a spot");
      case "gramophone": return n === 1 ? tr("spotTurntable", "On the turntable") : n <= 6 ? num("spotRecord", "Record {n} of 6") : tr("spotWaiting", "Awaiting a spot");
      case "screen": return n === 1 ? tr("spotOnScreen", "On the screen") : num("spotQueue", "Queue · {n}");
    }
  }, [tr]);

  // displayUnit that PINS a memory to the target station (keeps a compatible
  // existing unit — e.g. a "frame" photo dropped elsewhere on the wall stays a frame).
  const pinUnit = (target: StationId, mem: Mem): string => {
    if (target === "portraits") {
      const u = mem.displayUnit;
      return u === "painting" || u === "photo" || u === "frame" ? u : "painting";
    }
    return stationUnit[target];
  };

  /** Place a memory on a specific spot: renumber the whole target lane so the
   *  drop round-trips into the exact 3D anchor. beforeId = insert before that
   *  lane member (null = end). Persists sort_order via the normal update path. */
  const placeAt = (mem: Mem, target: StationId | "mantel", beforeId: string | null) => {
    if (target === "mantel" && !isPhotoLike(mem)) { showUndo(tr("mantelOnlyPhotos", "Only pictures can rest on the mantelpiece"), null); return; }
    const writes = new Map<string, Partial<Mem>>();
    const snaps = new Map<string, Partial<Mem>>();
    const touch = (m: Mem, upd: Partial<Mem>) => {
      const w = writes.get(m.id) || {};
      const sn = snaps.get(m.id) || {};
      let any = writes.has(m.id);
      for (const k of Object.keys(upd) as (keyof Mem)[]) {
        const cur = k in w ? (w as Record<string, unknown>)[k] : (m as unknown as Record<string, unknown>)[k];
        if (cur !== (upd as Record<string, unknown>)[k]) {
          (w as Record<string, unknown>)[k] = (upd as Record<string, unknown>)[k];
          if (!(k in sn)) (sn as Record<string, unknown>)[k] = (m as unknown as Record<string, unknown>)[k];
          any = true;
        }
      }
      if (any) { writes.set(m.id, w); snaps.set(m.id, sn); }
    };

    let toastSpot: string;
    if (target === "mantel") {
      // New portraits sequence: mem takes the mantel (spot 1), the previous
      // occupant becomes wall spot 1, the wall keeps its order.
      const seq = [mem, ...(hero && hero.id !== mem.id ? [hero] : []), ...laneFull.portraits.filter((m2) => m2.id !== mem.id)];
      seq.forEach((m2, i) => touch(m2, { sortOrder: i + 1, displayed: true }));
      touch(mem, { displayUnit: pinUnit("portraits", mem), hero: true });
      if (hero && hero.id !== mem.id && isHero(hero)) touch(hero, { hero: false });
      toastSpot = tr("stationMantel", "Mantelpiece");
    } else if (target === "portraits") {
      const wasHero = !!hero && hero.id === mem.id;
      // The visible wall list the user aimed at (mantel occupant excluded).
      let wall = laneFull.portraits.filter((m2) => m2.id !== mem.id);
      let keeper = hero && hero.id !== mem.id ? hero : null; // stays on the mantel
      if (wasHero) { keeper = wall[0] || null; wall = wall.slice(1); } // demote: old wall spot 1 takes the mantel
      let j = beforeId ? wall.findIndex((m2) => m2.id === beforeId) : -1;
      if (beforeId && keeper && keeper.id === beforeId) j = 0; // aimed at the promoted piece → spot 1
      if (j < 0) j = wall.length;
      const seq = [...(keeper ? [keeper] : []), ...wall.slice(0, j), mem, ...wall.slice(j)];
      seq.forEach((m2, i) => touch(m2, { sortOrder: i + 1, displayed: true }));
      touch(mem, { displayUnit: pinUnit("portraits", mem) });
      if (isHero(mem) && seq[0]?.id !== mem.id) touch(mem, { hero: false });
      const n = seq.findIndex((m2) => m2.id === mem.id); // 0 = mantel (no other portraits left)
      toastSpot = n === 0 ? tr("stationMantel", "Mantelpiece") : spotLabelText("portraits", n);
    } else {
      const lane = laneFull[target].filter((m2) => m2.id !== mem.id);
      let j = beforeId ? lane.findIndex((m2) => m2.id === beforeId) : -1;
      if (j < 0) j = lane.length;
      lane.splice(j, 0, mem);
      lane.forEach((m2, i) => touch(m2, { sortOrder: i + 1, displayed: true }));
      touch(mem, { displayUnit: pinUnit(target, mem) });
      if (isHero(mem)) touch(mem, { hero: false }); // left the portraits — the wall's first piece takes the mantel
      toastSpot = `${stationLabel(target)} · ${spotLabelText(target, j + 1)}`;
    }

    writes.forEach((upd, id) => onUpdate(id, upd));
    showUndo(tr("movedToast", "Moved to {spot}").replace("{spot}", toastSpot), () => snaps.forEach((prev, id) => onUpdate(id, prev)));
  };

  const dragMem = dragId ? sorted.find((m) => m.id === dragId) || null : null;
  const endDrag = () => { setDragId(null); setDropHint(null); };
  const dropOn = (target: StationId | "mantel" | "archive") => {
    if (!dragMem) return;
    if (target === "archive") { if (isShown(dragMem)) setShown(dragMem, false); }
    else placeAt(dragMem, target, (dropHint && dropHint.lane === target ? dropHint.beforeId : null));
    endDrag();
  };

  const stationLabel = (id: StationId) => tr(`station_${id}`, { portraits: "Portraits", vitrine: "Vitrine", library: "Library", gramophone: "Gramophone", screen: "Screen" }[id]);
  const stationWhere = (id: StationId) => tr(`stationWhere_${id}`, { portraits: "Along the hall", vitrine: "Front-right corner", library: "Front-left corner", gramophone: "Back-right corner", screen: "Set into the right wall" }[id]);

  const setShown = (mem: Mem, shown: boolean) => {
    if (shown) { onUpdate(mem.id, { displayed: true, displayUnit: impliedUnit(mem) }); return; }
    const prevUnit = mem.displayUnit;
    onUpdate(mem.id, { displayed: false });
    showUndo(tr("archivedToast", "Kept safe in the archive"), () => onUpdate(mem.id, { displayed: true, displayUnit: prevUnit || impliedUnit(mem) }));
  };
  const setScale = (mem: Mem, v: "sm" | "md" | "lg") => onUpdate(mem.id, { displayScale: v } as unknown as Partial<Mem>);

  // ── Touch fallback for drag & drop: "Move to…" → station → numbered spot ──
  const renderMovePicker = (m: Mem) => {
    const pick = movePick;
    if (!pick || pick.id !== m.id) return null;
    const stations: StationId[] = ["portraits", "vitrine", "library", "gramophone", "screen"];
    const title: React.CSSProperties = { fontFamily: T.font.body, fontWeight: 700, fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: "0.4rem" };
    return (
      <div style={{ background: T.color.white, border: `0.0625rem solid ${SAND}`, borderRadius: T.radius.md, padding: "0.6rem", marginTop: "-0.1rem" }}>
        {pick.station === null ? (
          <>
            <div style={title}>{tr("moveTo", "Move to…")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {isPhotoLike(m) && (!hero || hero.id !== m.id) && (
                <button style={spotChip()} onClick={() => { placeAt(m, "mantel", null); setMovePick(null); }}>★ {tr("stationMantel", "Mantelpiece")}</button>
              )}
              {stations.map((s) => (
                <button key={s} style={spotChip()} onClick={() => setMovePick({ id: m.id, station: s })}>{stationLabel(s)}</button>
              ))}
              {isShown(m) && <button style={spotChip()} onClick={() => { setShown(m, false); setMovePick(null); }}>{tr("archived", "Archive")}</button>}
            </div>
          </>
        ) : (
          <>
            <div style={title}>{tr("pickSpot", "Pick a spot in {station}").replace("{station}", stationLabel(pick.station))}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {(() => {
                const lane = laneFull[pick.station].filter((x) => x.id !== m.id);
                const st = pick.station;
                return Array.from({ length: Math.min(lane.length + 1, 12) }, (_, i) => (
                  <button key={i} style={spotChip()} title={spotLabelText(st, i + 1)} aria-label={spotLabelText(st, i + 1)}
                    onClick={() => { placeAt(m, st, lane[i]?.id ?? null); setMovePick(null); }}>{i + 1}</button>
                ));
              })()}
              <button style={spotChip()} onClick={() => { placeAt(m, pick.station!, null); setMovePick(null); }}>{tr("lastSpot", "Last")}</button>
              <button style={{ ...spotChip(), border: "none", background: "transparent", color: MUTED }} onClick={() => setMovePick({ id: m.id, station: null })}>‹ {tr("cancel", "Cancel")}</button>
            </div>
          </>
        )}
      </div>
    );
  };

  const toggleSelect = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulkHide = () => { const ids = [...selected]; ids.forEach((id) => onUpdate(id, { displayed: false })); setSelected(new Set()); setSelectMode(false); showUndo(tr("archivedNToast", "{n} kept safe").replace("{n}", String(ids.length)), () => ids.forEach((id) => { const m = mems.find((x) => x.id === id); if (m) onUpdate(id, { displayed: true, displayUnit: impliedUnit(m) }); })); };
  const bulkDelete = async () => {
    if (!(await confirmDialog({ title: tr("deleteTitle", "Remove memories?"), message: tr("deleteN", `Remove ${selected.size} memories from this room? This cannot be undone.`), confirmText: tr("remove", "Remove"), destructive: true }))) return;
    selected.forEach((id) => onDelete(id)); setSelected(new Set()); setSelectMode(false);
  };

  const onImported = async (fs: import("@/components/ui/ImportHub").QueuedFile[]) => {
    const { created } = await importFilesToRoom(fs, room?.id, addMemory);
    if (importUnit && importUnit !== "bookshelf") created.forEach((m) => setTimeout(() => onUpdate(m.id, { displayed: true, displayUnit: importUnit as string }), 40));
    setImportUnit(undefined);
  };
  const submitWrite = async () => {
    if (!wBody.trim() && !wTitle.trim()) { setWriteOpen(false); return; }
    await writeTextMemory(room?.id, wTitle, wBody, addMemory);
    setWTitle(""); setWBody(""); setWriteOpen(false);
  };
  const borrowFromRoom = (mem: Mem, fromName: string) => {
    const copy = { ...mem, id: `copy-${Date.now()}-${Math.random().toString(36).slice(2)}`, displayed: true, displayUnit: impliedUnit(mem) } as Mem;
    onAdd(copy);
    showUndo(tr("borrowedToast", "Brought over from {room}").replace("{room}", fromName), () => onDelete(copy.id));
  };

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);
  useEffect(() => { if (trackIdx >= playables.length) setTrackIdx(0); }, [playables.length, trackIdx]);

  const anyMem = mems.length > 0;

  return (
    <Sheet open onClose={onClose} side="right" maxWidth="30rem" background={T.color.linen}
      title={<span style={{ fontFamily: T.font.display }}>{roomName || tr("thisRoom", "This room")}</span>}>
      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, marginTop: "-0.25rem", marginBottom: T.space.sm }}>
        {loading && !anyMem
          ? tr("gatheringMemories", "Gathering memories…")
          : kept.length === 1 ? tr("keptOne", "1 memory kept here") : tr("keptN", "{n} memories kept here").replace("{n}", String(kept.length))}
      </div>

      {/* ── PLAYER — always present when the room has audio/video (owner #5) ── */}
      {playables.length > 0 && (
        <PlayerCard tracks={playables} index={Math.min(trackIdx, playables.length - 1)} onIndex={setTrackIdx} tr={tr} />
      )}

      {/* action band + search */}
      {canEdit && (
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem", marginBottom: "0.5rem" }}>
          {Pill(tr("bringIn", "Bring in a memory"), () => setImportUnit(null), { primary: true, icon: "⬇" })}
          {Pill(tr("writeMemory", "Write"), () => setWriteOpen((v) => !v), { icon: "✎" })}
          {(otherRooms?.length ?? 0) > 0 && Pill(tr("fromOtherRoom", "From another room"), () => setFromRoomsOpen((v) => !v), { icon: "⇄" })}
          {Pill(selectMode ? tr("done", "Done") : tr("select", "Select"), () => { setSelectMode((v) => !v); setSelected(new Set()); }, { icon: "☰" })}
        </div>
      )}
      {anyMem && (
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("searchMemories", "Search memories…")}
          style={{ width: "100%", boxSizing: "border-box", padding: "0.5rem 0.75rem", marginBottom: T.space.md, borderRadius: T.radius.pill, border: `0.0625rem solid ${SAND}`, background: T.color.white, color: INK, fontFamily: T.font.body, fontSize: "0.8125rem" }} />
      )}

      {/* borrow from another room (owner #4) */}
      {fromRoomsOpen && (otherRooms?.length ?? 0) > 0 && (
        <div style={{ background: T.color.white, border: `0.0625rem solid ${SAND}`, borderRadius: T.radius.lg, padding: "0.6rem", marginBottom: T.space.md }}>
          <div style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.6875rem", letterSpacing: "0.1em", textTransform: "uppercase", color: INK, marginBottom: "0.4rem" }}>{tr("fromOtherRoom", "From another room")}</div>
          {otherRooms!.map((r) => (
            <div key={r.id} style={{ marginBottom: "0.5rem" }}>
              <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: MUTED, marginBottom: "0.25rem" }}>{r.name}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {r.mems.slice(0, 6).map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Thumb mem={m} />
                    <span style={{ flex: 1, minWidth: 0, fontFamily: T.font.body, fontSize: "0.8125rem", color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</span>
                    <button onClick={() => borrowFromRoom(m, r.name)} style={chip()}>+ {tr("bringHere", "Bring here")}</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* write composer */}
      {writeOpen && (
        <div style={{ background: T.color.white, border: `0.0625rem solid ${SAND}`, borderRadius: T.radius.lg, padding: "0.75rem", marginBottom: T.space.md }}>
          <input value={wTitle} onChange={(e) => setWTitle(e.target.value)} placeholder={tr("noteTitle", "A title…")} style={{ width: "100%", boxSizing: "border-box", padding: "0.4rem 0.6rem", marginBottom: "0.5rem", border: `0.0625rem solid ${SAND}`, borderRadius: T.radius.sm, fontFamily: T.font.body, fontSize: "0.875rem", color: INK }} />
          <textarea value={wBody} onChange={(e) => setWBody(e.target.value)} placeholder={tr("writeStoryPlaceholder", "Write the memory…")} rows={4} style={{ width: "100%", boxSizing: "border-box", padding: "0.4rem 0.6rem", border: `0.0625rem solid ${SAND}`, borderRadius: T.radius.sm, fontFamily: T.font.body, fontSize: "0.875rem", color: INK, resize: "vertical" }} />
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
            {Pill(tr("cancel", "Cancel"), () => setWriteOpen(false))}
            {Pill(tr("save", "Save to the library"), submitWrite, { primary: true })}
          </div>
        </div>
      )}

      {!anyMem && loading && (
        <div style={{ textAlign: "center", padding: `${T.space.xl} ${T.space.md}`, color: MUTED, fontFamily: T.font.body, fontSize: "0.875rem" }}>
          {tr("gatheringMemories", "Gathering memories…")}
        </div>
      )}
      {!anyMem && !writeOpen && !loading && (
        <div style={{ textAlign: "center", padding: `${T.space.xl} ${T.space.md}` }}>
          <div style={{ fontFamily: T.font.display, fontSize: "1.1rem", color: INK, marginBottom: "0.5rem" }}>{tr("emptyRoomTitle", "An empty room, waiting")}</div>
          <div style={{ color: MUTED, fontFamily: T.font.body, fontSize: "0.875rem", marginBottom: T.space.md }}>{tr("emptyRoomLedger", "Bring in a photo, write a note, or add a recording to begin filling this room.")}</div>
          {canEdit && Pill(tr("bringIn", "Bring in a memory"), () => setImportUnit(null), { primary: true, icon: "⬇" })}
        </div>
      )}

      {/* ── MANTELPIECE — its own lane (owner #2); drop a picture here to feature it ── */}
      {(hero || (canEdit && dragMem && isPhotoLike(dragMem))) && (
        <section
          onDragOver={canEdit && dragMem && isPhotoLike(dragMem) ? (e) => { e.preventDefault(); if (dropHint?.lane !== "mantel") setDropHint({ lane: "mantel", index: 0, beforeId: null }); } : undefined}
          onDrop={canEdit && dragMem ? (e) => { e.preventDefault(); dropOn("mantel"); } : undefined}
          style={{ background: TRAY.gold, borderRadius: T.radius.lg, padding: "0.75rem", marginBottom: T.space.md, borderLeft: `0.1875rem solid ${BRONZE}`, boxShadow: "inset 0 0.0625rem 0.25rem rgba(64,59,54,0.05)", outline: dropHint?.lane === "mantel" ? `0.125rem solid ${EMBER}` : undefined, outlineOffset: "-0.125rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
            <div style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: INK }}>★ {tr("stationMantel", "Mantelpiece")}</div>
            <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>{tr("stationWhereMantel", "Above the fireplace")}</div>
          </div>
          {hero ? (
            <>
              <Card mem={hero} station="portraits" tr={tr} canEdit={canEdit} selectMode={selectMode} selected={selected.has(hero.id)}
                onToggleSelect={() => toggleSelect(hero.id)} shown onShown={(v) => setShown(hero, v)}
                onOpen={() => onSelect?.(hero)} heroCard dimmed={dragId === hero.id}
                onMoveTo={canEdit && !selectMode ? () => setMovePick(movePick?.id === hero.id ? null : { id: hero.id, station: null }) : undefined}
                outerProps={canEdit && !selectMode ? { draggable: true, onDragStart: (e) => { setDragId(hero.id); setMovePick(null); try { e.dataTransfer.setData("text/plain", hero.id); e.dataTransfer.effectAllowed = "move"; } catch { } }, onDragEnd: endDrag } : undefined} />
              {movePick?.id === hero.id && renderMovePicker(hero)}
            </>
          ) : (
            <div style={dropStub()}>{tr("dropHere", "Drop here")}</div>
          )}
        </section>
      )}

      {/* ── station lanes (shown items only — the archive is grouped below).
           Drag a card between/within lanes to give it a SPECIFIC display spot;
           the lane order below IS the 3D anchor order (spotOrder canon). ── */}
      {anyMem && STATIONS.map((s) => {
        const items = byStation[s.id];
        const laneDroppable = canEdit && !!dragMem;
        if (items.length === 0 && !laneDroppable) return null;
        const hintIdx = dropHint?.lane === s.id ? dropHint.index : null;
        return (
          <section key={s.id}
            onDragOver={laneDroppable ? (e) => { e.preventDefault(); setDropHint((h) => (h?.lane === s.id ? h : { lane: s.id, index: items.length, beforeId: null })); } : undefined}
            onDrop={laneDroppable ? (e) => { e.preventDefault(); dropOn(s.id); } : undefined}
            onDragLeave={laneDroppable ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropHint((h) => (h?.lane === s.id ? null : h)); } : undefined}
            style={{ background: s.tray, borderRadius: T.radius.lg, padding: "0.75rem", marginBottom: T.space.md, borderLeft: `0.1875rem solid ${EMBER}`, boxShadow: "inset 0 0.0625rem 0.25rem rgba(64,59,54,0.05)", outline: hintIdx !== null ? `0.125rem solid ${EMBER}` : undefined, outlineOffset: "-0.125rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
              <div style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: INK }}>{stationLabel(s.id)}</div>
              <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>{stationWhere(s.id)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {items.map((m, i) => (
                <React.Fragment key={m.id}>
                  {hintIdx === i && <DropLine />}
                  <Card mem={m} station={s.id} tr={tr} canEdit={canEdit} selectMode={selectMode}
                    selected={selected.has(m.id)} onToggleSelect={() => toggleSelect(m.id)}
                    shown onShown={(v) => setShown(m, v)}
                    onOpen={() => onSelect?.(m)}
                    onPlay={isPlayable(m) ? () => setTrackIdx(Math.max(0, playables.indexOf(m))) : undefined}
                    onScale={s.id === "portraits" && isPhotoLike(m) ? (v) => setScale(m, v) : undefined}
                    spotBadge={spotLabelText(s.id, spotIndex.get(m.id) || i + 1)}
                    dimmed={dragId === m.id}
                    onMoveTo={canEdit && !selectMode ? () => setMovePick(movePick?.id === m.id ? null : { id: m.id, station: null }) : undefined}
                    outerProps={canEdit && !selectMode ? {
                      draggable: true,
                      onDragStart: (e) => { setDragId(m.id); setMovePick(null); try { e.dataTransfer.setData("text/plain", m.id); e.dataTransfer.effectAllowed = "move"; } catch { } },
                      onDragEnd: endDrag,
                      onDragOver: (e) => {
                        if (!dragMem || dragMem.id === m.id) return;
                        e.preventDefault(); e.stopPropagation();
                        const r = e.currentTarget.getBoundingClientRect();
                        const idx = e.clientY < r.top + r.height / 2 ? i : i + 1;
                        const before = items[idx]?.id === dragMem.id ? items[idx + 1] : items[idx];
                        setDropHint({ lane: s.id, index: idx, beforeId: before?.id ?? null });
                      },
                      onDrop: (e) => { e.preventDefault(); e.stopPropagation(); dropOn(s.id); },
                    } : undefined} />
                  {movePick?.id === m.id && renderMovePicker(m)}
                </React.Fragment>
              ))}
              {hintIdx === items.length && <DropLine />}
              {items.length === 0 && <div style={dropStub()}>{tr("dropHere", "Drop here")}</div>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              {canEdit && <button onClick={() => setImportUnit(s.id === "library" ? "bookshelf" : stationUnit[s.id])} style={addTile()}>+ {tr("add", "Add")}</button>}
            </div>
          </section>
        );
      })}

      {/* ── THE ARCHIVE — every archived memory, grouped under its own name (owner #1).
           Also a drop target: drag a card here to keep it safe off-display. ── */}
      {(archived.length > 0 || (canEdit && dragMem && isShown(dragMem))) && (
        <section
          onDragOver={canEdit && dragMem ? (e) => { e.preventDefault(); if (dropHint?.lane !== "archive") setDropHint({ lane: "archive", index: 0, beforeId: null }); } : undefined}
          onDrop={canEdit && dragMem ? (e) => { e.preventDefault(); dropOn("archive"); } : undefined}
          style={{ background: "#EDE6D8", borderRadius: T.radius.lg, padding: "0.75rem", marginBottom: T.space.md, borderLeft: `0.1875rem solid ${MUTED}`, outline: dropHint?.lane === "archive" ? `0.125rem solid ${EMBER}` : undefined, outlineOffset: "-0.125rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
            <div style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>{tr("archiveLane", "In the archive")}</div>
            <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>{tr("archiveKeptSafe", "{n} kept safe").replace("{n}", String(archived.length))}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {archived.map((m) => (
              <React.Fragment key={m.id}>
                <Card mem={m} station={stationOf(m)} tr={tr} canEdit={canEdit} selectMode={selectMode}
                  selected={selected.has(m.id)} onToggleSelect={() => toggleSelect(m.id)}
                  shown={false} onShown={(v) => setShown(m, v)}
                  onOpen={() => onSelect?.(m)}
                  dimmed={dragId === m.id}
                  onMoveTo={canEdit && !selectMode ? () => setMovePick(movePick?.id === m.id ? null : { id: m.id, station: null }) : undefined}
                  outerProps={canEdit && !selectMode ? { draggable: true, onDragStart: (e) => { setDragId(m.id); setMovePick(null); try { e.dataTransfer.setData("text/plain", m.id); e.dataTransfer.effectAllowed = "move"; } catch { } }, onDragEnd: endDrag } : undefined} />
                {movePick?.id === m.id && renderMovePicker(m)}
              </React.Fragment>
            ))}
            {archived.length === 0 && <div style={dropStub()}>{tr("dropHere", "Drop here")}</div>}
          </div>
        </section>
      )}

      {/* bulk footer */}
      {selectMode && selected.size > 0 && (
        <div style={{ position: "sticky", bottom: 0, display: "flex", gap: "0.5rem", padding: "0.6rem 0", background: T.color.linen }}>
          {Pill(`${tr("hide", "Archive")} (${selected.size})`, bulkHide)}
          {Pill(`${tr("remove", "Remove")} (${selected.size})`, bulkDelete)}
        </div>
      )}

      {/* Undo toast (run=null → plain notice without an Undo button) */}
      {undo && (
        <div style={{ position: "sticky", bottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.6rem 0.9rem", borderRadius: T.radius.lg, background: INK, color: "#F3ECDA", fontFamily: T.font.body, fontSize: "0.8125rem", boxShadow: "0 0.5rem 1.5rem rgba(20,16,12,0.35)" }}>
          <span>{undo.label}</span>
          {undo.run && <button onClick={() => { undo.run?.(); setUndo(null); }} style={{ background: "none", border: "none", color: "#E9D7AC", fontWeight: 700, cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem" }}>{tr("undo", "Undo")}</button>}
        </div>
      )}

      {importUnit !== undefined && (
        <ImportHub onClose={() => setImportUnit(undefined)} onImportFiles={onImported} initialRoomId={room?.id} lockRoom onOpenCloudProvider={() => {}} />
      )}
    </Sheet>
  );
}

// ── PLAYER anchor card: track list + transport (audio transport / native video) ──
export function PlayerCard({ tracks, index, onIndex, tr }: { tracks: Mem[]; index: number; onIndex: (i: number) => void; tr: (k: string, f: string) => string }) {
  const mem = tracks[index];
  const isVideo = mem ? normType(mem) === "video" : false;
  // ONE transport drives BOTH kinds (owner #9): the ref points at whichever
  // media element is mounted (video without native controls, or audio).
  const mRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0); const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1); const [loop, setLoop] = useState(false);

  // Re-apply on mem?.id too: the media element remounts per track (key), so a
  // fresh element would otherwise ignore the user's slider/loop and play at the
  // default volume. Also force muted OFF — this transport is always audible.
  useEffect(() => { const a = mRef.current; if (a) { a.volume = vol; a.muted = false; } }, [vol, mem?.id]);
  useEffect(() => { const a = mRef.current; if (a) a.loop = loop; }, [loop, mem?.id]);
  useEffect(() => { setCur(0); setDur(0); setPlaying(false); }, [mem?.id]);
  const fmt = (s: number) => { if (!isFinite(s)) return "0:00"; const m = Math.floor(s / 60); const ss = Math.floor(s % 60); return `${m}:${ss < 10 ? "0" : ""}${ss}`; };
  const toggle = () => { const a = mRef.current; if (!a) return; if (a.paused) { a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); } else { a.pause(); setPlaying(false); } };
  const step = (d: number) => onIndex((index + d + tracks.length) % tracks.length);
  const mediaEvents = {
    onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => setCur(e.currentTarget.currentTime),
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement>) => setDur(e.currentTarget.duration),
    onPlay: () => setPlaying(true), onPause: () => setPlaying(false),
    onEnded: () => { setPlaying(false); if (tracks.length > 1) step(1); },
  };
  if (!mem) return null;

  return (
    <div style={{ background: "#241A12", borderRadius: T.radius.lg, padding: "0.75rem", marginBottom: T.space.md, border: `0.0625rem solid ${BRONZE}`, color: "#F3ECDA" }}>
      <div style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.625rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#C9A87C", marginBottom: "0.35rem" }}>▸ {tr("roomPlayer", "Player")}</div>
      <div style={{ fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mem.title || tr("untitled", "Untitled")}</div>
      {isVideo ? (
        <video key={mem.id} ref={mRef as React.RefObject<HTMLVideoElement>} src={mem.dataUrl || undefined} preload="metadata" playsInline onClick={toggle} {...mediaEvents} style={{ width: "100%", borderRadius: T.radius.sm, background: "#000", maxHeight: "15rem", cursor: "pointer" }} />
      ) : (
        <audio key={mem.id} ref={mRef as React.RefObject<HTMLAudioElement>} src={mem.dataUrl || undefined} preload="metadata" {...mediaEvents} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: isVideo ? "0.5rem" : 0 }}>
        <button onClick={() => step(-1)} aria-label={tr("previous", "Previous")} style={miniBtn()}>◀◀</button>
        <button onClick={toggle} aria-label={playing ? tr("pause", "Pause") : tr("play", "Play")} style={{ width: "2.2rem", height: "2.2rem", borderRadius: "50%", border: "none", background: "#C9A87C", color: "#241A12", fontSize: "1rem", cursor: "pointer", flexShrink: 0 }}>{playing ? "❚❚" : "▶"}</button>
        <button onClick={() => step(1)} aria-label={tr("next", "Next")} style={miniBtn()}>▶▶</button>
        <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "#C9BFA8", width: "2.4rem" }}>{fmt(cur)}</span>
        <input type="range" min={0} max={dur || 0} value={cur} onChange={(e) => { const a = mRef.current; if (a) { a.currentTime = Number(e.target.value); setCur(Number(e.target.value)); } }} style={{ flex: 1, accentColor: "#C9A87C" }} />
        <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "#C9BFA8", width: "2.4rem" }}>{fmt(dur)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.45rem" }}>
        <span aria-hidden style={{ color: "#C9BFA8" }}>🔊</span>
        <input type="range" min={0} max={1} step={0.02} value={vol} onChange={(e) => setVol(Number(e.target.value))} style={{ width: "6rem", accentColor: "#C9A87C" }} aria-label={tr("volumeLabel", "Volume")} />
        <button onClick={() => setLoop((v) => !v)} aria-pressed={loop} style={{ marginLeft: "auto", background: loop ? "#C9A87C" : "transparent", color: loop ? "#241A12" : "#C9BFA8", border: `0.0625rem solid ${loop ? "#C9A87C" : "#5A4A34"}`, borderRadius: T.radius.pill, padding: "0.2rem 0.6rem", fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer" }}>⟲ {tr("loopLabel", "Loop")}</button>
      </div>
      {/* track tray */}
      {tracks.length > 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", marginTop: "0.55rem", borderTop: "0.0625rem solid rgba(201,168,124,0.25)", paddingTop: "0.45rem" }}>
          {tracks.map((tk, i) => (
            <button key={tk.id} onClick={() => onIndex(i)} style={{ display: "flex", alignItems: "center", gap: "0.45rem", background: i === index ? "rgba(201,168,124,0.16)" : "none", border: "none", borderRadius: T.radius.sm, padding: "0.25rem 0.4rem", cursor: "pointer", color: i === index ? "#F3ECDA" : "#C9BFA8", fontFamily: T.font.body, fontSize: "0.75rem", textAlign: "left" }}>
              <span aria-hidden>{normType(tk) === "video" ? "🎬" : "♪"}</span>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tk.title}</span>
              {i === index && <span aria-hidden style={{ color: "#C9A87C" }}>▸</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Thumb({ mem }: { mem: Mem }) {
  return (
    <div style={{ width: "2rem", height: "2rem", borderRadius: T.radius.sm, flexShrink: 0, overflow: "hidden", background: `hsl(${mem.hue || 30},35%,86%)`, display: "grid", placeItems: "center" }}>
      {mem.dataUrl && (normType(mem) === "photo" || normType(mem) === "painting")
        ? <img src={mem.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ fontSize: "0.9rem" }}><TypeIcon type={mem.type} /></span>}
    </div>
  );
}

// ── one memory row ──
const SIZE_STEPS = ["sm", "md", "lg"] as const;
export type DisplayScale = (typeof SIZE_STEPS)[number];
const scaleOf = (m: Mem): DisplayScale => { const v = (m as unknown as { displayScale?: string }).displayScale; return v === "sm" || v === "lg" ? v : "md"; };

function Card({ mem, station, tr, canEdit, selectMode, selected, onToggleSelect, shown, onShown, onOpen, onPlay, onScale, heroCard, spotBadge, dimmed, onMoveTo, outerProps }: {
  mem: Mem; station: StationId; tr: (k: string, f: string) => string; canEdit: boolean; selectMode: boolean; selected: boolean;
  onToggleSelect: () => void; shown: boolean; onShown: (v: boolean) => void; onOpen: () => void; onPlay?: () => void; onScale?: (v: DisplayScale) => void; heroCard?: boolean;
  /** the specific display spot this card occupies in the 3D room (e.g. "Wall spot 2") */
  spotBadge?: string;
  /** true while this card is being dragged */
  dimmed?: boolean;
  /** opens the tap-based "Move to…" spot picker (touch fallback for drag & drop) */
  onMoveTo?: () => void;
  /** drag & drop wiring spread on the card's outer div (draggable, onDragStart, …) */
  outerProps?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean };
}) {
  const scale = scaleOf(mem);
  const sizeWord = (v: DisplayScale) => v === "sm" ? tr("sizeSmall", "Small") : v === "lg" ? tr("sizeLarge", "Large") : tr("sizeMedium", "Medium");
  return (
    <div {...outerProps} style={{ padding: "0.5rem", borderRadius: T.radius.md, background: T.color.white, border: `0.0625rem solid ${selected ? EMBER : heroCard ? BRONZE : "rgba(64,59,54,0.08)"}`, opacity: dimmed ? 0.45 : 1, cursor: outerProps?.draggable ? "grab" : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: T.space.sm }}>
        {selectMode && (
          <button aria-label="select" onClick={onToggleSelect} style={{ width: "1.25rem", height: "1.25rem", borderRadius: "0.3rem", flexShrink: 0, cursor: "pointer", border: `0.125rem solid ${selected ? EMBER : SAND}`, background: selected ? EMBER : "transparent", color: "#fff", fontSize: "0.8rem", lineHeight: 1 }}>{selected ? "✓" : ""}</button>
        )}
        {outerProps?.draggable && !selectMode && (
          <span aria-hidden title={tr("dragToPlace", "Drag to place")} style={{ color: MUTED, fontSize: "0.8rem", flexShrink: 0, cursor: "grab", letterSpacing: "-0.1em" }}>⠿</span>
        )}
        <button onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: T.space.sm, flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
          <Thumb mem={mem} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mem.title || tr("untitled", "Untitled")}</div>
            {shown && spotBadge && <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: BRONZE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>◈ {spotBadge}</div>}
            {!shown && <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>{tr("wasAt", "From")} {tr(`station_${station}`, station)}</div>}
          </div>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
          {onPlay && <button onClick={onPlay} aria-label={tr("play", "Play")} style={{ width: "1.8rem", height: "1.8rem", borderRadius: "50%", border: "none", background: EMBER, color: "#fff", cursor: "pointer", fontSize: "0.8rem" }}>▶</button>}
          {onMoveTo && (
            <button onClick={onMoveTo} aria-label={tr("moveTo", "Move to…")} title={tr("moveTo", "Move to…")}
              style={{ width: "1.8rem", height: "1.8rem", borderRadius: "50%", border: `0.0625rem solid ${SAND}`, background: T.color.white, color: INK, cursor: "pointer", fontSize: "0.8rem", flexShrink: 0 }}>⇄</button>
          )}
          {canEdit && (
            <div style={{ display: "inline-flex", borderRadius: T.radius.pill, overflow: "hidden", border: `0.0625rem solid ${SAND}` }}>
              <button onClick={() => onShown(true)} style={seg(shown)}>{tr("shownHere", "Shown")}</button>
              <button onClick={() => onShown(false)} style={seg(!shown)}>{tr("archived", "Archive")}</button>
            </div>
          )}
        </div>
      </div>
      {/* per-painting wall size (owner item 3): S · M · L, persists as displayScale */}
      {canEdit && onScale && shown && (
        <div role="group" aria-label={tr("paintingSize", "Painting size")} style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.35rem" }}>
          <div style={{ display: "inline-flex", borderRadius: T.radius.pill, overflow: "hidden", border: `0.0625rem solid ${SAND}` }}>
            {SIZE_STEPS.map((v) => (
              <button key={v} onClick={() => onScale(v)} aria-pressed={scale === v} aria-label={sizeWord(v)} title={sizeWord(v)}
                style={{ ...seg(scale === v), minWidth: "2.75rem", minHeight: "2.75rem" }}>{v === "sm" ? "S" : v === "lg" ? "L" : "M"}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── style helpers ──
function Pill(label: string, onClick: () => void, opts?: { primary?: boolean; icon?: string }) {
  return (
    <button key={label} onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap", padding: "0.5rem 0.85rem", borderRadius: T.radius.pill, cursor: "pointer", border: opts?.primary ? "none" : `0.0625rem solid ${SAND}`, background: opts?.primary ? INK : T.color.white, color: opts?.primary ? "#F3ECDA" : INK, fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600 }}>
      {opts?.icon && <span aria-hidden style={{ color: opts?.primary ? "#C9A87C" : EMBER }}>{opts.icon}</span>}{label}
    </button>
  );
}
function seg(active: boolean): React.CSSProperties { return { padding: "0.32rem 0.55rem", fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer", border: "none", background: active ? EMBER : "transparent", color: active ? "#fff" : MUTED }; }
function miniBtn(): React.CSSProperties { return { background: "none", border: "0.0625rem solid #5A4A34", borderRadius: T.radius.pill, color: "#C9BFA8", padding: "0.25rem 0.45rem", fontSize: "0.7rem", cursor: "pointer" }; }
function chip(): React.CSSProperties { return { padding: "0.32rem 0.5rem", borderRadius: T.radius.pill, border: `0.0625rem solid ${SAND}`, background: T.color.white, color: INK, fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer" }; }
function addTile(): React.CSSProperties { return { padding: "0.3rem 0.6rem", borderRadius: T.radius.pill, border: `0.09375rem dashed ${SAND}`, background: "transparent", color: EMBER, fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer" }; }
/** insertion indicator between cards while dragging */
function DropLine() { return <div aria-hidden style={{ height: "0.1875rem", borderRadius: "0.09375rem", background: EMBER, margin: "0.05rem 0.25rem" }} />; }
function dropStub(): React.CSSProperties { return { padding: "0.6rem", borderRadius: T.radius.md, border: `0.09375rem dashed ${SAND}`, color: MUTED, fontFamily: T.font.body, fontSize: "0.75rem", textAlign: "center" }; }
/** touch-target-friendly chips for the "Move to…" spot picker */
function spotChip(): React.CSSProperties { return { minWidth: "2.4rem", minHeight: "2.4rem", padding: "0.4rem 0.7rem", borderRadius: T.radius.pill, border: `0.0625rem solid ${SAND}`, background: T.color.white, color: INK, fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }; }
