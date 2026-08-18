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
  anchor?: "top" | "nowPlaying";
  /** Other rooms the user may borrow memories from (owner #4 — only rooms the
   *  user can access; the caller applies the access filter). */
  otherRooms?: OtherRoomFeed[];
  /** Viewer/demo override: add memories locally instead of via the memory store. */
  addMemoryOverride?: (roomId: string, mem: Mem) => Promise<boolean> | boolean;
}

export default function RoomStewardLedger({ mems, room, onClose, onUpdate, onDelete, onAdd, onSelect, canEdit = true, otherRooms, addMemoryOverride }: Props) {
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
  const [undo, setUndo] = useState<{ label: string; run: () => void } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [trackIdx, setTrackIdx] = useState(0);

  const showUndo = (label: string, run: () => void) => {
    setUndo({ label, run });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };

  const roomName = room ? translateRoomName(room, (k: string) => t(k)) : "";
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => q ? mems.filter((m) => (m.title || "").toLowerCase().includes(q)) : mems, [mems, q]);
  const kept = useMemo(() => mems.filter((m) => m.displayed), [mems]);
  const archived = useMemo(() => filtered.filter((m) => m.displayed === false), [filtered]);
  const playables = useMemo(() => mems.filter(isPlayable), [mems]);
  const hero = useMemo(() => {
    const shownPortraits = mems.filter((m) => m.displayed && stationOf(m) === "portraits");
    return shownPortraits.find(isHero) || shownPortraits[0] || null;
  }, [mems]);
  const byStation = useMemo(() => {
    const g: Record<StationId, Mem[]> = { portraits: [], vitrine: [], library: [], gramophone: [], screen: [] };
    for (const m of filtered) { if (m.displayed && m !== hero) g[stationOf(m)].push(m); }
    return g;
  }, [filtered, hero]);

  const stationLabel = (id: StationId) => tr(`station_${id}`, { portraits: "Portraits", vitrine: "Vitrine", library: "Library", gramophone: "Gramophone", screen: "Screen" }[id]);
  const stationWhere = (id: StationId) => tr(`stationWhere_${id}`, { portraits: "Along the hall", vitrine: "Front-right corner", library: "Front-left corner", gramophone: "Back-right corner", screen: "Recessed over the mantel" }[id]);

  const setShown = (mem: Mem, shown: boolean) => {
    if (shown) { onUpdate(mem.id, { displayed: true, displayUnit: impliedUnit(mem) }); return; }
    const prevUnit = mem.displayUnit;
    onUpdate(mem.id, { displayed: false });
    showUndo(tr("archivedToast", "Kept safe in the archive"), () => onUpdate(mem.id, { displayed: true, displayUnit: prevUnit || impliedUnit(mem) }));
  };
  const setPhotoStation = (mem: Mem, to: "wall" | "vitrine") => onUpdate(mem.id, { displayed: true, displayUnit: to === "vitrine" ? "vitrine" : "painting" });
  const featureHero = (mem: Mem) => {
    mems.forEach((m) => { if (isHero(m) && m.id !== mem.id) onUpdate(m.id, { hero: false } as unknown as Partial<Mem>); });
    onUpdate(mem.id, { hero: true, displayed: true, displayUnit: "painting" } as unknown as Partial<Mem>);
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
        {kept.length === 1 ? tr("keptOne", "1 memory kept here") : tr("keptN", "{n} memories kept here").replace("{n}", String(kept.length))}
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

      {!anyMem && !writeOpen && (
        <div style={{ textAlign: "center", padding: `${T.space.xl} ${T.space.md}` }}>
          <div style={{ fontFamily: T.font.display, fontSize: "1.1rem", color: INK, marginBottom: "0.5rem" }}>{tr("emptyRoomTitle", "An empty room, waiting")}</div>
          <div style={{ color: MUTED, fontFamily: T.font.body, fontSize: "0.875rem", marginBottom: T.space.md }}>{tr("emptyRoomLedger", "Bring in a photo, write a note, or add a recording to begin filling this room.")}</div>
          {canEdit && Pill(tr("bringIn", "Bring in a memory"), () => setImportUnit(null), { primary: true, icon: "⬇" })}
        </div>
      )}

      {/* ── MANTELPIECE — its own lane (owner #2) ── */}
      {hero && (
        <section style={{ background: TRAY.gold, borderRadius: T.radius.lg, padding: "0.75rem", marginBottom: T.space.md, borderLeft: `0.1875rem solid ${BRONZE}`, boxShadow: "inset 0 0.0625rem 0.25rem rgba(64,59,54,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
            <div style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: INK }}>★ {tr("stationMantel", "Mantelpiece")}</div>
            <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>{tr("stationWhereMantel", "Above the fireplace")}</div>
          </div>
          <Card mem={hero} station="portraits" tr={tr} canEdit={canEdit} selectMode={selectMode} selected={selected.has(hero.id)}
            onToggleSelect={() => toggleSelect(hero.id)} shown onShown={(v) => setShown(hero, v)}
            onPhotoStation={(to) => setPhotoStation(hero, to)} onOpen={() => onSelect?.(hero)} heroCard />
        </section>
      )}

      {/* ── station lanes (shown items only — the archive is grouped below) ── */}
      {anyMem && STATIONS.map((s) => {
        const items = byStation[s.id];
        if (items.length === 0) return null;
        return (
          <section key={s.id} style={{ background: s.tray, borderRadius: T.radius.lg, padding: "0.75rem", marginBottom: T.space.md, borderLeft: `0.1875rem solid ${EMBER}`, boxShadow: "inset 0 0.0625rem 0.25rem rgba(64,59,54,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
              <div style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: INK }}>{stationLabel(s.id)}</div>
              <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>{stationWhere(s.id)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {items.map((m) => (
                <Card key={m.id} mem={m} station={s.id} tr={tr} canEdit={canEdit} selectMode={selectMode}
                  selected={selected.has(m.id)} onToggleSelect={() => toggleSelect(m.id)}
                  shown onShown={(v) => setShown(m, v)}
                  onPhotoStation={(to) => setPhotoStation(m, to)} onOpen={() => onSelect?.(m)}
                  onPlay={isPlayable(m) ? () => setTrackIdx(Math.max(0, playables.indexOf(m))) : undefined}
                  onFeature={s.id === "portraits" && isPhotoLike(m) ? () => featureHero(m) : undefined} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              {canEdit && <button onClick={() => setImportUnit(s.id === "library" ? "bookshelf" : stationUnit[s.id])} style={addTile()}>+ {tr("add", "Add")}</button>}
            </div>
          </section>
        );
      })}

      {/* ── THE ARCHIVE — every archived memory, grouped under its own name (owner #1) ── */}
      {archived.length > 0 && (
        <section style={{ background: "#EDE6D8", borderRadius: T.radius.lg, padding: "0.75rem", marginBottom: T.space.md, borderLeft: `0.1875rem solid ${MUTED}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
            <div style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>{tr("archiveLane", "In the archive")}</div>
            <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>{tr("archiveKeptSafe", "{n} kept safe").replace("{n}", String(archived.length))}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {archived.map((m) => (
              <Card key={m.id} mem={m} station={stationOf(m)} tr={tr} canEdit={canEdit} selectMode={selectMode}
                selected={selected.has(m.id)} onToggleSelect={() => toggleSelect(m.id)}
                shown={false} onShown={(v) => setShown(m, v)}
                onPhotoStation={(to) => setPhotoStation(m, to)} onOpen={() => onSelect?.(m)} />
            ))}
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

      {/* Undo toast */}
      {undo && (
        <div style={{ position: "sticky", bottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.6rem 0.9rem", borderRadius: T.radius.lg, background: INK, color: "#F3ECDA", fontFamily: T.font.body, fontSize: "0.8125rem", boxShadow: "0 0.5rem 1.5rem rgba(20,16,12,0.35)" }}>
          <span>{undo.label}</span>
          <button onClick={() => { undo.run(); setUndo(null); }} style={{ background: "none", border: "none", color: "#E9D7AC", fontWeight: 700, cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem" }}>{tr("undo", "Undo")}</button>
        </div>
      )}

      {importUnit !== undefined && (
        <ImportHub onClose={() => setImportUnit(undefined)} onImportFiles={onImported} initialRoomId={room?.id} lockRoom onOpenCloudProvider={() => {}} />
      )}
    </Sheet>
  );
}

// ── PLAYER anchor card: track list + transport (audio transport / native video) ──
function PlayerCard({ tracks, index, onIndex, tr }: { tracks: Mem[]; index: number; onIndex: (i: number) => void; tr: (k: string, f: string) => string }) {
  const mem = tracks[index];
  const isVideo = mem ? normType(mem) === "video" : false;
  const aRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0); const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1); const [loop, setLoop] = useState(false);

  useEffect(() => { const a = aRef.current; if (a) a.volume = vol; }, [vol]);
  useEffect(() => { const a = aRef.current; if (a) a.loop = loop; }, [loop]);
  useEffect(() => { setCur(0); setDur(0); setPlaying(false); }, [mem?.id]);
  const fmt = (s: number) => { if (!isFinite(s)) return "0:00"; const m = Math.floor(s / 60); const ss = Math.floor(s % 60); return `${m}:${ss < 10 ? "0" : ""}${ss}`; };
  const toggle = () => { const a = aRef.current; if (!a) return; if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); } };
  const step = (d: number) => onIndex((index + d + tracks.length) % tracks.length);
  if (!mem) return null;

  return (
    <div style={{ background: "#241A12", borderRadius: T.radius.lg, padding: "0.75rem", marginBottom: T.space.md, border: `0.0625rem solid ${BRONZE}`, color: "#F3ECDA" }}>
      <div style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.625rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#C9A87C", marginBottom: "0.35rem" }}>▸ {tr("roomPlayer", "Player")}</div>
      <div style={{ fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mem.title || tr("untitled", "Untitled")}</div>
      {isVideo ? (
        <video key={mem.id} src={mem.dataUrl || undefined} controls loop={loop} style={{ width: "100%", borderRadius: T.radius.sm, background: "#000", maxHeight: "15rem" }} />
      ) : (
        <>
          <audio key={mem.id} ref={aRef} src={mem.dataUrl || undefined} onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} onEnded={() => { setPlaying(false); if (tracks.length > 1) step(1); }} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button onClick={() => step(-1)} aria-label={tr("previous", "Previous")} style={miniBtn()}>◀◀</button>
            <button onClick={toggle} aria-label={playing ? tr("pause", "Pause") : tr("play", "Play")} style={{ width: "2.2rem", height: "2.2rem", borderRadius: "50%", border: "none", background: "#C9A87C", color: "#241A12", fontSize: "1rem", cursor: "pointer", flexShrink: 0 }}>{playing ? "❚❚" : "▶"}</button>
            <button onClick={() => step(1)} aria-label={tr("next", "Next")} style={miniBtn()}>▶▶</button>
            <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "#C9BFA8", width: "2.4rem" }}>{fmt(cur)}</span>
            <input type="range" min={0} max={dur || 0} value={cur} onChange={(e) => { const a = aRef.current; if (a) { a.currentTime = Number(e.target.value); setCur(Number(e.target.value)); } }} style={{ flex: 1, accentColor: "#C9A87C" }} />
            <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "#C9BFA8", width: "2.4rem" }}>{fmt(dur)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.45rem" }}>
            <span aria-hidden style={{ color: "#C9BFA8" }}>🔊</span>
            <input type="range" min={0} max={1} step={0.02} value={vol} onChange={(e) => setVol(Number(e.target.value))} style={{ width: "6rem", accentColor: "#C9A87C" }} aria-label={tr("volumeLabel", "Volume")} />
            <button onClick={() => setLoop((v) => !v)} aria-pressed={loop} style={{ marginLeft: "auto", background: loop ? "#C9A87C" : "transparent", color: loop ? "#241A12" : "#C9BFA8", border: `0.0625rem solid ${loop ? "#C9A87C" : "#5A4A34"}`, borderRadius: T.radius.pill, padding: "0.2rem 0.6rem", fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer" }}>⟲ {tr("loopLabel", "Loop")}</button>
          </div>
        </>
      )}
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
function Card({ mem, station, tr, canEdit, selectMode, selected, onToggleSelect, shown, onShown, onPhotoStation, onOpen, onPlay, onFeature, heroCard }: {
  mem: Mem; station: StationId; tr: (k: string, f: string) => string; canEdit: boolean; selectMode: boolean; selected: boolean;
  onToggleSelect: () => void; shown: boolean; onShown: (v: boolean) => void; onPhotoStation: (to: "wall" | "vitrine") => void; onOpen: () => void; onPlay?: () => void; onFeature?: () => void; heroCard?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: T.space.sm, padding: "0.5rem", borderRadius: T.radius.md, background: T.color.white, border: `0.0625rem solid ${selected ? EMBER : heroCard ? BRONZE : "rgba(64,59,54,0.08)"}` }}>
      {selectMode && (
        <button aria-label="select" onClick={onToggleSelect} style={{ width: "1.25rem", height: "1.25rem", borderRadius: "0.3rem", flexShrink: 0, cursor: "pointer", border: `0.125rem solid ${selected ? EMBER : SAND}`, background: selected ? EMBER : "transparent", color: "#fff", fontSize: "0.8rem", lineHeight: 1 }}>{selected ? "✓" : ""}</button>
      )}
      <button onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: T.space.sm, flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
        <Thumb mem={mem} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mem.title || tr("untitled", "Untitled")}</div>
          {!shown && <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>{tr("wasAt", "From")} {tr(`station_${station}`, station)}</div>}
        </div>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
        {onPlay && <button onClick={onPlay} aria-label={tr("play", "Play")} style={{ width: "1.8rem", height: "1.8rem", borderRadius: "50%", border: "none", background: EMBER, color: "#fff", cursor: "pointer", fontSize: "0.8rem" }}>▶</button>}
        {canEdit && onFeature && !heroCard && (
          <button onClick={onFeature} title={tr("featureAboveFireplace", "Feature above the fireplace")} style={chip()}>★</button>
        )}
        {canEdit && station === "portraits" && isPhotoLike(mem) && shown && !heroCard && (
          <button onClick={() => onPhotoStation("vitrine")} title={tr("moveToVitrine", "Move to the vitrine")} style={chip()}>{tr("toVitrine", "▸ Vitrine")}</button>
        )}
        {canEdit && (
          <div style={{ display: "inline-flex", borderRadius: T.radius.pill, overflow: "hidden", border: `0.0625rem solid ${SAND}` }}>
            <button onClick={() => onShown(true)} style={seg(shown)}>{tr("shownHere", "Shown")}</button>
            <button onClick={() => onShown(false)} style={seg(!shown)}>{tr("archived", "Archive")}</button>
          </div>
        )}
      </div>
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
