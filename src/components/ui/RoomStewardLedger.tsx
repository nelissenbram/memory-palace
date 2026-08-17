"use client";
// ─────────────────────────────────────────────────────────────────────────────
// The Steward's Ledger — the room's MEDIA manager (Wave 1 shell).
// One room-scoped surface in the shared Sheet primitive (right rail on desktop,
// bottom sheet on mobile), organised by the room's physical STATIONS. Reuses the
// Atrium tray/lane + Library card grammar. No tabs, no room-type picker, no
// Library/Gallery. See docs/ROOM_UI_MEDIA_PLAYER_MASTERPLAN.md ("The Steward's
// Ledger"). Gated behind flag3d("w1_roomui").
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useState } from "react";
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
import { importFilesToRoom } from "@/lib/ui/roomImport";

const MUTED = "#716A5E";
const SAND = T.color.sandstone;
// The three atrium tray hexes (Atrium relay palette) — never invent a 4th.
const TRAY = { terracotta: "#F6EBE3", gold: "#FAF3E0", sage: "#EFF2E8" } as const;

type StationId = "portraits" | "vitrine" | "library" | "gramophone" | "screen";

interface StationDef { id: StationId; tray: string; }
const STATIONS: StationDef[] = [
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
/** The displayUnit a memory takes when SHOWN (photos default to the wall). */
function impliedUnit(mem: Mem): string {
  const u = mem.displayUnit;
  if (u === "vitrine" || u === "bookshelf" || u === "vinyl" || u === "screen" || u === "painting" || u === "frame") return u;
  switch (normType(mem)) {
    case "audio": return "vinyl";
    case "video": return "screen";
    case "document": return "bookshelf";
    case "case": return "vitrine";
    default: return "painting"; // photos / frames
  }
}
/** Which station a memory belongs to right now. */
function stationOf(mem: Mem): StationId {
  const u = mem.displayUnit;
  if (u === "vitrine") return "vitrine";
  if (u === "bookshelf") return "library";
  if (u === "vinyl") return "gramophone";
  if (u === "screen") return "screen";
  if (u === "painting" || u === "photo" || u === "frame") return "portraits";
  switch (normType(mem)) {
    case "audio": return "gramophone";
    case "video": return "screen";
    case "document": return "library";
    case "case": return "vitrine";
    default: return "portraits";
  }
}
/** Only photos/frames can choose between the wall and the vitrine. */
function isPhotoLike(mem: Mem): boolean {
  const nt = normType(mem);
  return nt === "photo" || nt === "frame" || nt === "painting";
}

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
  /** "top" opens the manager; "nowPlaying" scrolls to the player (Wave 3). */
  anchor?: "top" | "nowPlaying";
}

export default function RoomStewardLedger({ mems, room, onClose, onUpdate, onDelete, onAdd, onSelect, canEdit = true }: Props) {
  const { t } = useTranslation("roomMedia");
  const tr = (k: string, fallback: string) => { const v = t(k); return v && v !== k ? v : fallback; };
  const addMemory = useMemoryStore((s) => s.addMemory);
  const [importUnit, setImportUnit] = useState<string | null | undefined>(undefined); // undefined = closed
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const roomName = room ? translateRoomName(room, (k: string) => t(k)) : "";
  const kept = useMemo(() => mems.filter((m) => m.displayed), [mems]);

  // Group memories by their station (both shown + archived, so you can un-archive).
  const byStation = useMemo(() => {
    const g: Record<StationId, Mem[]> = { portraits: [], vitrine: [], library: [], gramophone: [], screen: [] };
    for (const m of mems) g[stationOf(m)].push(m);
    return g;
  }, [mems]);

  const stationLabel = (id: StationId) => tr(`station_${id}`, {
    portraits: "Portraits", vitrine: "Vitrine", library: "Library", gramophone: "Gramophone", screen: "Screen",
  }[id]);
  const stationWhere = (id: StationId) => tr(`stationWhere_${id}`, {
    portraits: "Along the hall · over the mantel", vitrine: "Front-right corner", library: "Front-left corner",
    gramophone: "Back-right corner", screen: "Recessed over the mantel",
  }[id]);

  const setShown = (mem: Mem, shown: boolean) =>
    onUpdate(mem.id, shown ? { displayed: true, displayUnit: impliedUnit(mem) } : { displayed: false });
  const setPhotoStation = (mem: Mem, to: "wall" | "vitrine") =>
    onUpdate(mem.id, { displayed: true, displayUnit: to === "vitrine" ? "vitrine" : "painting" });

  const toggleSelect = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulkHide = () => { selected.forEach((id) => { const m = mems.find((x) => x.id === id); if (m) onUpdate(id, { displayed: false }); }); setSelected(new Set()); setSelectMode(false); };
  const bulkDelete = async () => {
    if (!(await confirmDialog({ title: tr("deleteTitle", "Remove memories?"), message: tr("deleteN", `Remove ${selected.size} memories from this room? This cannot be undone.`), confirmText: tr("remove", "Remove"), destructive: true }))) return;
    selected.forEach((id) => onDelete(id)); setSelected(new Set()); setSelectMode(false);
  };

  const pill = (label: string, onClick: () => void, opts?: { primary?: boolean; icon?: string }) => (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap",
      padding: "0.5rem 0.85rem", borderRadius: T.radius.pill, cursor: "pointer",
      border: opts?.primary ? "none" : `0.0625rem solid ${SAND}`,
      background: opts?.primary ? INK : T.color.white, color: opts?.primary ? "#F3ECDA" : INK,
      fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
    }}>
      {opts?.icon && <span aria-hidden style={{ color: opts?.primary ? "#D4AF37" : EMBER }}>{opts.icon}</span>}{label}
    </button>
  );

  // ── one memory row ──
  const Card = ({ mem, station }: { mem: Mem; station: StationId }) => {
    const shown = !!mem.displayed;
    const sel = selected.has(mem.id);
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: T.space.sm, padding: "0.5rem",
        borderRadius: T.radius.md, background: T.color.white, border: `0.0625rem solid ${sel ? EMBER : "rgba(64,59,54,0.08)"}`,
      }}>
        {selectMode && (
          <button aria-label="select" onClick={() => toggleSelect(mem.id)} style={{
            width: "1.25rem", height: "1.25rem", borderRadius: "0.3rem", flexShrink: 0, cursor: "pointer",
            border: `0.125rem solid ${sel ? EMBER : SAND}`, background: sel ? EMBER : "transparent", color: "#fff", fontSize: "0.8rem", lineHeight: 1,
          }}>{sel ? "✓" : ""}</button>
        )}
        <button onClick={() => onSelect?.(mem)} style={{ display: "flex", alignItems: "center", gap: T.space.sm, flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
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
        {canEdit && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
            {station === "portraits" && isPhotoLike(mem) && shown && (
              <button onClick={() => setPhotoStation(mem, mem.displayUnit === "vitrine" ? "vitrine" : "vitrine")} title={tr("moveToVitrine", "Move to vitrine")} style={chip()}>{tr("toVitrine", "▸ Vitrine")}</button>
            )}
            {/* binary toggle — always writes explicit booleans */}
            <div style={{ display: "inline-flex", borderRadius: T.radius.pill, overflow: "hidden", border: `0.0625rem solid ${SAND}` }}>
              <button onClick={() => setShown(mem, true)} style={seg(shown)}>{tr("shownHere", "Shown")}</button>
              <button onClick={() => setShown(mem, false)} style={seg(!shown)}>{tr("archived", "Archive")}</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const anyMem = mems.length > 0;

  return (
    <Sheet open onClose={onClose} side="right" maxWidth="30rem" background={T.color.linen}
      title={<span style={{ fontFamily: T.font.display }}>{roomName || tr("thisRoom", "This room")}</span>}>
      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, marginTop: "-0.25rem", marginBottom: T.space.md }}>
        {kept.length === 1 ? tr("keptOne", "1 memory kept here") : tr("keptN", `${kept.length} memories kept here`).replace("{n}", String(kept.length))}
      </div>

      {/* action band */}
      {canEdit && (
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem", marginBottom: T.space.md }}>
          {pill(tr("bringIn", "Bring in a memory"), () => setImportUnit(null), { primary: true, icon: "⬇" })}
          {pill(tr("writeMemory", "Write"), () => setImportUnit("bookshelf"), { icon: "✎" })}
          {pill(selectMode ? tr("done", "Done") : tr("select", "Select"), () => { setSelectMode((v) => !v); setSelected(new Set()); }, { icon: "☰" })}
        </div>
      )}

      {/* empty state */}
      {!anyMem && (
        <div style={{ textAlign: "center", padding: `${T.space.xl} ${T.space.md}`, color: MUTED, fontFamily: T.font.body, fontSize: "0.875rem" }}>
          {tr("emptyRoomLedger", "This room is waiting for its first memory. Bring one in to begin.")}
        </div>
      )}

      {/* station lanes */}
      {anyMem && STATIONS.map((s) => {
        const items = byStation[s.id];
        if (items.length === 0) return null;
        const shownCount = items.filter((m) => m.displayed).length;
        const archived = items.length - shownCount;
        return (
          <section key={s.id} style={{
            background: s.tray, borderRadius: T.radius.lg, padding: "0.75rem", marginBottom: T.space.md,
            borderLeft: `0.1875rem solid ${EMBER}`, boxShadow: "inset 0 0.0625rem 0.25rem rgba(64,59,54,0.05)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
              <div style={{ fontFamily: T.font.body, fontWeight: 700, fontSize: "0.6875rem", letterSpacing: "0.12em", textTransform: "uppercase", color: INK }}>
                {stationLabel(s.id)}
              </div>
              <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>{stationWhere(s.id)}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {items.map((m) => <Card key={m.id} mem={m} station={s.id} />)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
              <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>
                {shownCount} {tr("shownWord", "shown")}{archived > 0 ? ` · ${archived} ${tr("inArchiveShort", "in the archive")}` : ""}
              </span>
              {canEdit && <button onClick={() => setImportUnit(s.id === "portraits" ? "painting" : s.id === "vitrine" ? "vitrine" : s.id === "library" ? "bookshelf" : s.id === "gramophone" ? "vinyl" : "screen")} style={addTile()}>+ {tr("add", "Add")}</button>}
            </div>
          </section>
        );
      })}

      {/* bulk footer */}
      {selectMode && selected.size > 0 && (
        <div style={{ position: "sticky", bottom: 0, display: "flex", gap: "0.5rem", padding: "0.6rem 0", background: T.color.linen }}>
          {pill(`${tr("hide", "Archive")} (${selected.size})`, bulkHide)}
          {pill(`${tr("remove", "Remove")} (${selected.size})`, bulkDelete)}
        </div>
      )}

      {/* import */}
      {importUnit !== undefined && (
        <ImportHub
          onClose={() => setImportUnit(undefined)}
          onImportFiles={async (fs) => { await importFilesToRoom(fs, room?.id, addMemory); setImportUnit(undefined); }}
          initialRoomId={room?.id}
          lockRoom
          onOpenCloudProvider={() => {}}
        />
      )}
    </Sheet>
  );
}

// ── small style helpers ──
function seg(active: boolean): React.CSSProperties {
  return { padding: "0.32rem 0.55rem", fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer", border: "none", background: active ? EMBER : "transparent", color: active ? "#fff" : MUTED };
}
function chip(): React.CSSProperties {
  return { padding: "0.32rem 0.5rem", borderRadius: T.radius.pill, border: `0.0625rem solid ${SAND}`, background: T.color.white, color: INK, fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer" };
}
function addTile(): React.CSSProperties {
  return { padding: "0.3rem 0.6rem", borderRadius: T.radius.pill, border: `0.09375rem dashed ${SAND}`, background: "transparent", color: EMBER, fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer" };
}
