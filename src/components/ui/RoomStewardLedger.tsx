"use client";
// ─────────────────────────────────────────────────────────────────────────────
// The Steward's Ledger — the room's MEDIA + PLAYER manager.
// One room-scoped surface in the shared Sheet primitive (right rail on desktop,
// bottom sheet on mobile), organised by the room's physical STATIONS. Reuses the
// Atrium tray/lane + Library card grammar. No tabs, no room-type picker, no
// Library/Gallery. See docs/ROOM_UI_MEDIA_PLAYER_MASTERPLAN.md ("The Steward's
// Ledger"). Gated behind flag3d("w1_roomui").
//   Wave 1: shell + station lanes + binary Shown/Archive toggle + photo chip.
//   Wave 2: import→station assign, Write composer, search, archive footer, Undo.
//   Wave 3: a "Now Playing" anchor card (audio + video transport).
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
}

export default function RoomStewardLedger({ mems, room, onClose, onUpdate, onDelete, onSelect, canEdit = true }: Props) {
  const { t } = useTranslation("roomMedia");
  const tr = useCallback((k: string, fallback: string) => { const v = t(k); return v && v !== k ? v : fallback; }, [t]);
  const addMemory = useMemoryStore((s) => s.addMemory);

  const [importUnit, setImportUnit] = useState<string | null | undefined>(undefined);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [writeOpen, setWriteOpen] = useState(false);
  const [wTitle, setWTitle] = useState(""); const [wBody, setWBody] = useState("");
  const [expanded, setExpanded] = useState<Set<StationId>>(new Set());
  const [undo, setUndo] = useState<{ label: string; run: () => void } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [now, setNow] = useState<Mem | null>(null);

  const showUndo = (label: string, run: () => void) => {
    setUndo({ label, run });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };

  const roomName = room ? translateRoomName(room, (k: string) => t(k)) : "";
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => q ? mems.filter((m) => (m.title || "").toLowerCase().includes(q)) : mems, [mems, q]);
  const kept = useMemo(() => mems.filter((m) => m.displayed), [mems]);
  const byStation = useMemo(() => {
    const g: Record<StationId, Mem[]> = { portraits: [], vitrine: [], library: [], gramophone: [], screen: [] };
    for (const m of filtered) g[stationOf(m)].push(m);
    return g;
  }, [filtered]);

  const stationLabel = (id: StationId) => tr(`station_${id}`, { portraits: "Portraits", vitrine: "Vitrine", library: "Library", gramophone: "Gramophone", screen: "Screen" }[id]);
  const stationWhere = (id: StationId) => tr(`stationWhere_${id}`, { portraits: "Along the hall · over the mantel", vitrine: "Front-right corner", library: "Front-left corner", gramophone: "Back-right corner", screen: "Recessed over the mantel" }[id]);

  const setShown = (mem: Mem, shown: boolean) => {
    if (shown) { onUpdate(mem.id, { displayed: true, displayUnit: impliedUnit(mem) }); return; }
    const prevUnit = mem.displayUnit;
    onUpdate(mem.id, { displayed: false });
    showUndo(tr("archivedToast", "Kept safe in the archive"), () => onUpdate(mem.id, { displayed: true, displayUnit: prevUnit || impliedUnit(mem) }));
  };
  const setPhotoStation = (mem: Mem, to: "wall" | "vitrine") => onUpdate(mem.id, { displayed: true, displayUnit: to === "vitrine" ? "vitrine" : "painting" });

  const toggleSelect = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulkHide = () => { const ids = [...selected]; ids.forEach((id) => onUpdate(id, { displayed: false })); setSelected(new Set()); setSelectMode(false); showUndo(tr("archivedNToast", `${ids.length} kept safe`), () => ids.forEach((id) => { const m = mems.find((x) => x.id === id); if (m) onUpdate(id, { displayed: true, displayUnit: impliedUnit(m) }); })); };
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

  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const anyMem = mems.length > 0;

  return (
    <Sheet open onClose={onClose} side="right" maxWidth="30rem" background={T.color.linen}
      title={<span style={{ fontFamily: T.font.display }}>{roomName || tr("thisRoom", "This room")}</span>}>
      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, marginTop: "-0.25rem", marginBottom: T.space.sm }}>
        {kept.length === 1 ? tr("keptOne", "1 memory kept here") : tr("keptN", "{n} memories kept here").replace("{n}", String(kept.length))}
      </div>

      {/* Now Playing (Wave 3) */}
      {now && <NowPlaying mem={now} tr={tr} onClose={() => setNow(null)} />}

      {/* action band + search */}
      {canEdit && (
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem", marginBottom: "0.5rem" }}>
          {Pill(tr("bringIn", "Bring in a memory"), () => setImportUnit(null), { primary: true, icon: "⬇" })}
          {Pill(tr("writeMemory", "Write"), () => setWriteOpen((v) => !v), { icon: "✎" })}
          {Pill(selectMode ? tr("done", "Done") : tr("select", "Select"), () => { setSelectMode((v) => !v); setSelected(new Set()); }, { icon: "☰" })}
        </div>
      )}
      {anyMem && (
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("searchMemories", "Search memories…")}
          style={{ width: "100%", boxSizing: "border-box", padding: "0.5rem 0.75rem", marginBottom: T.space.md, borderRadius: T.radius.pill, border: `0.0625rem solid ${SAND}`, background: T.color.white, color: INK, fontFamily: T.font.body, fontSize: "0.8125rem" }} />
      )}

      {/* write composer (Wave 2) */}
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

      {/* station lanes */}
      {anyMem && STATIONS.map((s) => {
        const items = byStation[s.id];
        if (items.length === 0) return null;
        const shownItems = items.filter((m) => m.displayed);
        const archivedItems = items.filter((m) => !m.displayed);
        const open = expanded.has(s.id);
        const visible = open ? items : shownItems;
        return (
          <section key={s.id} style={{ background: s.tray, borderRadius: T.radius.lg, padding: "0.75rem", marginBottom: T.space.md, borderLeft: `0.1875rem solid ${EMBER}`, boxShadow: "inset 0 0.0625rem 0.25rem rgba(64,59,54,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
              <div style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: INK }}>{stationLabel(s.id)}</div>
              <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>{stationWhere(s.id)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {visible.map((m) => (
                <Card key={m.id} mem={m} station={s.id} tr={tr} canEdit={canEdit} selectMode={selectMode}
                  selected={selected.has(m.id)} onToggleSelect={() => toggleSelect(m.id)}
                  shown={!!m.displayed} onShown={(v) => setShown(m, v)}
                  onPhotoStation={(to) => setPhotoStation(m, to)} onOpen={() => onSelect?.(m)}
                  onPlay={isPlayable(m) ? () => setNow(m) : undefined} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
              <button onClick={() => archivedItems.length ? setExpanded((e) => { const n = new Set(e); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; }) : undefined}
                style={{ background: "none", border: "none", padding: 0, cursor: archivedItems.length ? "pointer" : "default", fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED, textAlign: "left" }}>
                {shownItems.length} {tr("shownWord", "shown")}{archivedItems.length ? ` · ${open ? "▾" : "▸"} ${archivedItems.length} ${tr("inArchiveShort", "in the archive")}` : ""}
              </button>
              {canEdit && <button onClick={() => setImportUnit(s.id === "library" ? "bookshelf" : stationUnit[s.id])} style={addTile()}>+ {tr("add", "Add")}</button>}
            </div>
          </section>
        );
      })}

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
          <button onClick={() => { undo.run(); setUndo(null); }} style={{ background: "none", border: "none", color: "#D4AF37", fontWeight: 700, cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem" }}>{tr("undo", "Undo")}</button>
        </div>
      )}

      {importUnit !== undefined && (
        <ImportHub onClose={() => setImportUnit(undefined)} onImportFiles={onImported} initialRoomId={room?.id} lockRoom onOpenCloudProvider={() => {}} />
      )}
    </Sheet>
  );
}

// ── a "Now Playing" transport card (Wave 3) ──
function NowPlaying({ mem, tr, onClose }: { mem: Mem; tr: (k: string, f: string) => string; onClose: () => void }) {
  const isVideo = normType(mem) === "video";
  const aRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [cur, setCur] = useState(0); const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1); const [loop, setLoop] = useState(false);

  useEffect(() => { const a = aRef.current; if (!a) return; a.volume = vol; }, [vol]);
  useEffect(() => { const a = aRef.current; if (!a) return; a.loop = loop; }, [loop]);
  useEffect(() => { const a = aRef.current; if (!a || isVideo) return; a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }, [mem.id, isVideo]);
  const fmt = (s: number) => { if (!isFinite(s)) return "0:00"; const m = Math.floor(s / 60); const ss = Math.floor(s % 60); return `${m}:${ss < 10 ? "0" : ""}${ss}`; };
  const toggle = () => { const a = aRef.current; if (!a) return; if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); } };

  return (
    <div style={{ background: "#241A12", borderRadius: T.radius.lg, padding: "0.75rem", marginBottom: T.space.md, border: `0.0625rem solid ${T.color.gold}`, color: "#F3ECDA" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
        <span style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.625rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#D4AF37" }}>▸ {tr("nowPlaying", "Now playing")}</span>
        <button onClick={onClose} aria-label="close player" style={{ background: "none", border: "none", color: "#C9BFA8", cursor: "pointer", fontSize: "1rem" }}>✕</button>
      </div>
      <div style={{ fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mem.title || tr("untitled", "Untitled")}</div>
      {isVideo ? (
        <video src={mem.dataUrl || undefined} controls autoPlay loop={loop} style={{ width: "100%", borderRadius: T.radius.sm, background: "#000", maxHeight: "16rem" }} />
      ) : (
        <>
          <audio ref={aRef} src={mem.dataUrl || undefined} onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} onEnded={() => setPlaying(false)} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <button onClick={toggle} aria-label={playing ? tr("pause", "Pause") : tr("play", "Play")} style={{ width: "2.2rem", height: "2.2rem", borderRadius: "50%", border: "none", background: "#D4AF37", color: "#241A12", fontSize: "1rem", cursor: "pointer", flexShrink: 0 }}>{playing ? "❚❚" : "▶"}</button>
            <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "#C9BFA8", width: "2.5rem" }}>{fmt(cur)}</span>
            <input type="range" min={0} max={dur || 0} value={cur} onChange={(e) => { const a = aRef.current; if (a) { a.currentTime = Number(e.target.value); setCur(Number(e.target.value)); } }} style={{ flex: 1, accentColor: "#D4AF37" }} />
            <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "#C9BFA8", width: "2.5rem" }}>{fmt(dur)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.5rem" }}>
            <span aria-hidden style={{ color: "#C9BFA8" }}>🔊</span>
            <input type="range" min={0} max={1} step={0.02} value={vol} onChange={(e) => setVol(Number(e.target.value))} style={{ width: "6rem", accentColor: "#D4AF37" }} aria-label={tr("volumeLabel", "Volume")} />
            <button onClick={() => setLoop((v) => !v)} aria-pressed={loop} style={{ marginLeft: "auto", background: loop ? "#D4AF37" : "transparent", color: loop ? "#241A12" : "#C9BFA8", border: `0.0625rem solid ${loop ? "#D4AF37" : "#5A4A34"}`, borderRadius: T.radius.pill, padding: "0.2rem 0.6rem", fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer" }}>⟲ {tr("loopLabel", "Loop")}</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── one memory row ──
function Card({ mem, station, tr, canEdit, selectMode, selected, onToggleSelect, shown, onShown, onPhotoStation, onOpen, onPlay }: {
  mem: Mem; station: StationId; tr: (k: string, f: string) => string; canEdit: boolean; selectMode: boolean; selected: boolean;
  onToggleSelect: () => void; shown: boolean; onShown: (v: boolean) => void; onPhotoStation: (to: "wall" | "vitrine") => void; onOpen: () => void; onPlay?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: T.space.sm, padding: "0.5rem", borderRadius: T.radius.md, background: T.color.white, border: `0.0625rem solid ${selected ? EMBER : "rgba(64,59,54,0.08)"}` }}>
      {selectMode && (
        <button aria-label="select" onClick={onToggleSelect} style={{ width: "1.25rem", height: "1.25rem", borderRadius: "0.3rem", flexShrink: 0, cursor: "pointer", border: `0.125rem solid ${selected ? EMBER : SAND}`, background: selected ? EMBER : "transparent", color: "#fff", fontSize: "0.8rem", lineHeight: 1 }}>{selected ? "✓" : ""}</button>
      )}
      <button onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: T.space.sm, flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
        <div style={{ width: "2.6rem", height: "2.6rem", borderRadius: T.radius.sm, flexShrink: 0, overflow: "hidden", background: `hsl(${mem.hue || 30},35%,86%)`, display: "grid", placeItems: "center" }}>
          {mem.dataUrl && (normType(mem) === "photo" || normType(mem) === "painting")
            ? <img src={mem.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: "1.1rem" }}><TypeIcon type={mem.type} /></span>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mem.title || tr("untitled", "Untitled")}</div>
          {!shown && <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>{tr("inArchive", "In the archive")}</div>}
        </div>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
        {onPlay && <button onClick={onPlay} aria-label={tr("play", "Play")} style={{ width: "1.8rem", height: "1.8rem", borderRadius: "50%", border: "none", background: EMBER, color: "#fff", cursor: "pointer", fontSize: "0.8rem" }}>▶</button>}
        {canEdit && station === "portraits" && isPhotoLike(mem) && shown && (
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
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap", padding: "0.5rem 0.85rem", borderRadius: T.radius.pill, cursor: "pointer", border: opts?.primary ? "none" : `0.0625rem solid ${SAND}`, background: opts?.primary ? INK : T.color.white, color: opts?.primary ? "#F3ECDA" : INK, fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600 }}>
      {opts?.icon && <span aria-hidden style={{ color: opts?.primary ? "#D4AF37" : EMBER }}>{opts.icon}</span>}{label}
    </button>
  );
}
function seg(active: boolean): React.CSSProperties { return { padding: "0.32rem 0.55rem", fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer", border: "none", background: active ? EMBER : "transparent", color: active ? "#fff" : MUTED }; }
function chip(): React.CSSProperties { return { padding: "0.32rem 0.5rem", borderRadius: T.radius.pill, border: `0.0625rem solid ${SAND}`, background: T.color.white, color: INK, fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer" }; }
function addTile(): React.CSSProperties { return { padding: "0.3rem 0.6rem", borderRadius: T.radius.pill, border: `0.09375rem dashed ${SAND}`, background: "transparent", color: EMBER, fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer" }; }
