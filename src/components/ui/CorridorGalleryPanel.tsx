"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { T } from "@/lib/theme";
import { HAIRLINE } from "@/lib/libraryTokens";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { ROOM_MEMS, DEFAULT_CORRIDOR_PAINTINGS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { WINGS } from "@/lib/constants/wings";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { WingIcon, RoomIcon } from "@/components/ui/WingRoomIcons";

/** Frame size per corridor slot (owner 2026-08-06 #1). Absent in older saved data = "normal". */
export type CorridorPaintingSize = "small" | "normal" | "large";

export interface CorridorPaintingOverride {
  url?: string;
  title?: string;
  memId?: string;
  roomId?: string;
  size?: CorridorPaintingSize;
}

export type CorridorPaintings = Record<string, CorridorPaintingOverride>;

function loadCorridorPaintings(wingId: string): CorridorPaintings {
  try {
    const raw = localStorage.getItem(`mp_corridor_paintings_${wingId}`);
    if (raw) return JSON.parse(raw);
    // Fall back to default demo paintings if nothing saved yet
    if (DEFAULT_CORRIDOR_PAINTINGS[wingId]) {
      return { ...DEFAULT_CORRIDOR_PAINTINGS[wingId] };
    }
    return {};
  } catch { return {}; }
}

function saveCorridorPaintings(wingId: string, paintings: CorridorPaintings) {
  try {
    localStorage.setItem(`mp_corridor_paintings_${wingId}`, JSON.stringify(paintings));
  } catch { /* quota exceeded */ }
}

export { loadCorridorPaintings, saveCorridorPaintings };

interface CorridorGalleryPanelProps {
  wing: Wing;
  rooms: WingRoom[];
  onClose: () => void;
  onPaintingsChange: (paintings: CorridorPaintings) => void;
  currentPaintings: CorridorPaintings;
}

export default function CorridorGalleryPanel({ wing, rooms, onClose, onPaintingsChange, currentPaintings }: CorridorGalleryPanelProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("corridorGallery");
  const { t: tWings } = useTranslation("wings");
  const { t: tDemos } = useTranslation("demos");
  const accent = wing.accent;
  const userMems = useMemoryStore((s) => s.userMems);
  // Select the static action non-reactively (actions are stable → never re-renders),
  // and subscribe only to the room DATA the panel consumes so we don't re-render on
  // unrelated roomStore mutations (renameWing, changeWingAccent, sync events, …).
  const getWingRooms = useRoomStore((s) => s.getWingRooms);
  const customRooms = useRoomStore((s) => s.customRooms);

  const [paintings, setPaintings] = useState<CorridorPaintings>(currentPaintings);
  const [pickingSlot, setPickingSlot] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"all" | "wing" | "upload">("all");

  // Drive each trap by its dialog's open state so focus moves in on open and
  // restores on close. The panel trap yields while the picker is open so the two
  // don't fight over Tab; the picker trap activates only once its dialog mounts.
  const { containerRef, handleKeyDown } = useFocusTrap(!pickingSlot);
  const { containerRef: pickerRef, handleKeyDown: pickerHandleKeyDown } = useFocusTrap(!!pickingSlot);

  // Sync external prop changes into the open panel (memory deleted/moved, reset elsewhere).
  useEffect(() => { setPaintings(currentPaintings); }, [currentPaintings]);

  // Painting slots — 1 per room (one painting next to each door). Stable identity
  // so it doesn't rebuild on every unrelated render.
  const slots = useMemo(() => rooms.map((r) => r.id), [rooms]);

  // Get all memories with images from ALL wings (not just current wing).
  // Memoized on the actual data it reads (userMems + customRooms via getWingRooms,
  // plus the wing-name translator) so it doesn't re-walk WINGS×rooms×mems on every
  // picker toggle, filter change, or unrelated store mutation.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- customRooms is read via getWingRooms
  const allMems = useMemo<{ mem: Mem; room: WingRoom; wingName: string }[]>(() => {
    const out: { mem: Mem; room: WingRoom; wingName: string }[] = [];
    WINGS.forEach((w) => {
      const wRooms = getWingRooms(w.id);
      wRooms.forEach((room) => {
        const mems = userMems[room.id] || ROOM_MEMS[room.id] || [];
        mems.forEach((mem) => {
          if (mem.dataUrl && mem.type === "photo") {
            out.push({ mem, room, wingName: (w.nameKey ? tWings(w.nameKey) : w.name) || w.id });
          }
        });
      });
    });
    return out;
  }, [userMems, customRooms, getWingRooms, tWings]);

  // Room ids for the current wing (used by the "this wing" filter). Recomputes only
  // when the wing or its room data changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- customRooms is read via getWingRooms
  const wingRoomIds = useMemo(
    () => new Set(getWingRooms(wing.id).map((r) => r.id)),
    [wing.id, customRooms, getWingRooms],
  );

  // Filtered mems based on source filter — preserves the exact same set/order.
  const filteredMems = useMemo(
    () => (sourceFilter === "wing"
      ? allMems.filter(({ room }) => wingRoomIds.has(room.id))
      : allMems),
    [sourceFilter, allMems, wingRoomIds],
  );

  const handleAssign = useCallback((slotRoomId: string, mem: Mem, fromRoomId: string) => {
    setPaintings((prev) => {
      const next: CorridorPaintings = {
        ...prev,
        // Keep the slot's chosen frame size when swapping the photo.
        [slotRoomId]: { url: mem.dataUrl || undefined, title: mem.title, memId: mem.id, roomId: fromRoomId, size: prev[slotRoomId]?.size },
      };
      saveCorridorPaintings(wing.id, next);
      onPaintingsChange(next);
      return next;
    });
    // Keep picker open so user can change selection or pick for next painting.
  }, [wing.id, onPaintingsChange]);

  const handleUpload = useCallback((slotRoomId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const title = file.name.replace(/\.[^.]+$/, "");
        setPaintings((prev) => {
          const next: CorridorPaintings = {
            ...prev,
            [slotRoomId]: { url: dataUrl, title, size: prev[slotRoomId]?.size },
          };
          saveCorridorPaintings(wing.id, next);
          onPaintingsChange(next);
          return next;
        });
        setPickingSlot(null);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [wing.id, onPaintingsChange]);

  const handleSize = useCallback((slotRoomId: string, size: CorridorPaintingSize) => {
    setPaintings((prev) => {
      const cur = prev[slotRoomId];
      if (!cur?.url) return prev; // size only applies to a hung photo
      const next: CorridorPaintings = { ...prev, [slotRoomId]: { ...cur, size } };
      saveCorridorPaintings(wing.id, next);
      onPaintingsChange(next);
      return next;
    });
  }, [wing.id, onPaintingsChange]);

  const handleClear = useCallback((slotRoomId: string) => {
    setPaintings((prev) => {
      const next = { ...prev };
      delete next[slotRoomId];
      saveCorridorPaintings(wing.id, next);
      onPaintingsChange(next);
      return next;
    });
  }, [wing.id, onPaintingsChange]);

  const handleResetAll = useCallback(() => {
    // "Reset to defaults" restores the seeded demo paintings for this wing (not an empty wall).
    const def: CorridorPaintings = DEFAULT_CORRIDOR_PAINTINGS[wing.id]
      ? { ...DEFAULT_CORRIDOR_PAINTINGS[wing.id] }
      : {};
    setPaintings(def);
    saveCorridorPaintings(wing.id, def);
    onPaintingsChange(def);
    setPickingSlot(null);
  }, [wing.id, onPaintingsChange]);

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(42,34,24,.4)", backdropFilter: "blur(8px)", zIndex: 55, animation: "fadeIn .2s ease" }}>
      <div ref={containerRef} className="mp-scroll" role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={(e) => e.stopPropagation()} style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: isMobile ? "100%" : "min(27.5rem, 92vw)",
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(1.5rem) saturate(1.4)",
        WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
        borderLeft: isMobile ? "none" : `0.0625rem solid ${HAIRLINE}`,
        boxShadow: `-1rem 0 2.5rem rgba(44,44,42,0.12), inset 0 0.0625rem 0 rgba(255,255,255,0.7)`,
        paddingTop: `max(${isMobile ? "1.25rem" : "1.75rem"}, env(safe-area-inset-top, 0px))`,
        paddingBottom: `max(${isMobile ? "1.25rem" : "1.75rem"}, env(safe-area-inset-bottom, 0px))`,
        paddingLeft: `max(${isMobile ? "1rem" : "1.5rem"}, env(safe-area-inset-left, 0px))`,
        paddingRight: `max(${isMobile ? "1rem" : "1.5rem"}, env(safe-area-inset-right, 0px))`,
        overflowY: "auto",
        animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)",
      }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
          .corridor-focusable:focus-visible{outline:0.1875rem solid ${T.color.gold};outline-offset:0.1875rem;border-radius:0.5rem;}
          @media (prefers-reduced-motion: reduce){.mp-scroll{animation:none !important;}}`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem",
              background: `${accent}18`,
              border: `0.0625rem solid ${accent}35`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <WingIcon wingId={wing.id} size={26} color={accent} />
            </div>
            <div>
              <h3 style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500, color: T.color.charcoal, margin: 0 }}>{t("title")}</h3>
              <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: accent, margin: "0.25rem 0 0" }}>{tWings(wing.nameKey) || wing.name} {t("wing")}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label={t("close")} className="corridor-focusable" style={{
            width: isMobile ? "2.5rem" : "2rem", height: isMobile ? "2.5rem" : "2rem", borderRadius: isMobile ? "1.25rem" : "1rem",
            border: `1px solid ${HAIRLINE}`, background: T.color.warmStone,
            color: T.color.muted, fontSize: isMobile ? "1rem" : "0.875rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            minWidth: "2.75rem", minHeight: "2.75rem",
          }}>{"\u2715"}</button>
        </div>

        {/* Description */}
        <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginBottom: "1.125rem", lineHeight: 1.5 }}>
          {t("description")}
        </p>

        {/* Reset button */}
        {Object.keys(paintings).length > 0 && (
          <button onClick={handleResetAll} className="corridor-focusable" style={{
            marginBottom: "1rem", padding: "0.5rem 1rem", borderRadius: "0.625rem",
            border: `1px solid ${HAIRLINE}`, background: T.color.warmStone,
            fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut,
            cursor: "pointer", transition: "all .15s",
          }}>
            {t("resetDefaults")}
          </button>
        )}

        {/* Painting slots — compact grid of tiles. Clicking a tile opens a single picker modal. */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "0.75rem",
        }}>
          {slots.map((roomId, idx) => {
            const override = paintings[roomId];
            const isPicking = pickingSlot === roomId;
            return (
              <div
                key={roomId}
                style={{
                  background: "rgba(255,255,255,0.72)",
                  backdropFilter: "blur(0.75rem) saturate(1.3)",
                  WebkitBackdropFilter: "blur(0.75rem) saturate(1.3)",
                  borderRadius: "1rem",
                  border: `0.0625rem solid ${isPicking ? accent + "70" : HAIRLINE}`,
                  boxShadow: isPicking
                    ? `0 0.5rem 1.5rem ${accent}25, inset 0 0.0625rem 0 rgba(255,255,255,0.7)`
                    : `0 0.125rem 0.5rem rgba(44,44,42,0.05), inset 0 0.0625rem 0 rgba(255,255,255,0.5)`,
                  padding: "0.625rem",
                  transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                  position: "relative",
                }}
              >
                <button
                  onClick={() => setPickingSlot(roomId)}
                  className="corridor-focusable"
                  style={{
                    all: "unset",
                    boxSizing: "border-box",
                    width: "100%",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{
                    width: "100%", aspectRatio: "4 / 3", borderRadius: "0.625rem",
                    border: `0.0625rem solid ${HAIRLINE}`,
                    overflow: "hidden", position: "relative",
                    background: override?.url
                      ? `url(${override.url}) center/cover no-repeat`
                      : `linear-gradient(135deg, ${accent}35, ${accent}15)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {!override?.url && (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                        <rect x="3" y="4" width="18" height="14" rx="1.5"/>
                        <circle cx="8.5" cy="9.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 18"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem", minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 500, color: T.color.charcoal,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {t("painting")} {idx + 1}
                    </div>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.625rem",
                      color: override ? accent : T.color.muted,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {override?.title || t("tapToChoose")}
                    </div>
                  </div>
                </button>
                {/* Frame size — small/normal/large per slot (owner 2026-08-06 #1) */}
                {override?.url && (
                  <div role="radiogroup" aria-label={t("sizeLabel")} style={{ display: "flex", gap: "0.25rem", marginTop: "0.5rem" }}>
                    {(["small", "normal", "large"] as const).map((sz) => {
                      const active = (override.size || "normal") === sz;
                      return (
                        <button
                          key={sz}
                          role="radio"
                          aria-checked={active}
                          onClick={(e) => { e.stopPropagation(); handleSize(roomId, sz); }}
                          className="corridor-focusable"
                          style={{
                            flex: 1, minHeight: "2rem", padding: "0.25rem 0",
                            borderRadius: "0.5rem",
                            border: `0.0625rem solid ${active ? accent : HAIRLINE}`,
                            background: active ? `${accent}15` : T.color.warmStone,
                            fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: active ? 500 : 400,
                            color: active ? accent : T.color.muted,
                            cursor: "pointer", transition: "all .15s",
                          }}
                        >
                          {t(sz === "small" ? "sizeSmall" : sz === "large" ? "sizeLarge" : "sizeNormal")}
                        </button>
                      );
                    })}
                  </div>
                )}
                {override && (
                  <button
                    type="button"
                    aria-label={t("removeOverride")}
                    onClick={(e) => { e.stopPropagation(); handleClear(roomId); }}
                    className="corridor-focusable"
                    style={{
                      position: "absolute", top: "0.375rem", right: "0.375rem",
                      width: "2.75rem", height: "2.75rem", borderRadius: "50%",
                      border: "none", padding: 0,
                      background: "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{
                      width: "1.5rem", height: "1.5rem", borderRadius: "50%",
                      background: "rgba(64,59,54,0.75)", color: "#FFF",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem",
                    }}>{"\u2715"}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Single picker modal — opens when a slot is tapped */}
        {pickingSlot && (
          <div
            onClick={() => setPickingSlot(null)}
            style={{
              position: "fixed", inset: 0, zIndex: 60,
              background: "rgba(42,34,24,0.55)",
              backdropFilter: "blur(0.75rem)",
              display: "flex", alignItems: "center", justifyContent: "center",
              paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
              paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
              paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
              paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
              animation: "fadeIn .2s ease",
            }}
          >
            <div
              ref={pickerRef}
              role="dialog"
              aria-modal="true"
              aria-label={t("title")}
              onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setPickingSlot(null); return; } pickerHandleKeyDown(e); }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "rgba(255,255,255,0.95)",
                backdropFilter: "blur(1.5rem) saturate(1.4)",
                WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
                borderRadius: "1.25rem",
                border: `0.0625rem solid ${HAIRLINE}`,
                boxShadow: `0 1.5rem 3rem rgba(44,44,42,0.25), inset 0 0.0625rem 0 rgba(255,255,255,0.7)`,
                padding: "1.25rem",
                width: "min(40rem, 100%)",
                maxHeight: "85vh",
                display: "flex", flexDirection: "column", gap: "0.875rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 500, color: T.color.charcoal }}>
                  {t("painting")} {slots.indexOf(pickingSlot) + 1}
                </div>
                <button
                  onClick={() => setPickingSlot(null)}
                  aria-label={t("close")}
                  className="corridor-focusable"
                  style={{
                    width: "2.75rem", height: "2.75rem", borderRadius: "50%",
                    border: `0.0625rem solid ${HAIRLINE}`, background: T.color.warmStone,
                    color: T.color.muted, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >{"\u2715"}</button>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button onClick={() => handleUpload(pickingSlot)} className="corridor-focusable" style={{
                  padding: "0.5rem 0.875rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                  border: `0.0625rem solid ${accent}`, background: `${accent}15`,
                  fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                  color: accent, cursor: "pointer",
                }}>{t("uploadImage")}</button>
                <div style={{ flex: 1 }} />
                <div role="radiogroup" aria-label={t("filterSource")} style={{ display: "flex", gap: "0.5rem" }}>
                  <button role="radio" aria-checked={sourceFilter === "all"} onClick={() => setSourceFilter("all")} className="corridor-focusable" style={{
                    padding: "0.5rem 0.875rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                    border: `0.0625rem solid ${sourceFilter === "all" ? accent : HAIRLINE}`,
                    background: sourceFilter === "all" ? `${accent}15` : T.color.warmStone,
                    fontFamily: T.font.body, fontSize: "0.6875rem",
                    color: sourceFilter === "all" ? accent : T.color.muted,
                    cursor: "pointer",
                  }}>{t("allWings")}</button>
                  <button role="radio" aria-checked={sourceFilter === "wing"} onClick={() => setSourceFilter("wing")} className="corridor-focusable" style={{
                    padding: "0.5rem 0.875rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                    border: `0.0625rem solid ${sourceFilter === "wing" ? accent : HAIRLINE}`,
                    background: sourceFilter === "wing" ? `${accent}15` : T.color.warmStone,
                    fontFamily: T.font.body, fontSize: "0.6875rem",
                    color: sourceFilter === "wing" ? accent : T.color.muted,
                    cursor: "pointer",
                  }}>{t("thisWing")}</button>
                </div>
              </div>
              {filteredMems.length === 0 ? (
                <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, textAlign: "center", padding: "2rem 0" }}>
                  {t("noPhotos")}
                </p>
              ) : (
                <div className="mp-scroll" style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  overflowY: "auto",
                  paddingRight: "0.25rem",
                  minHeight: 0,
                  flex: 1,
                  contain: "layout",
                }}>
                  {filteredMems.map(({ mem, room: memRoom, wingName }) => {
                    const selected = paintings[pickingSlot]?.memId === mem.id;
                    return (
                      <button key={mem.id} onClick={() => handleAssign(pickingSlot, mem, memRoom.id)} className="corridor-focusable" style={{
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        width: "100%", height: "4.5rem", flexShrink: 0,
                        border: selected ? `0.125rem solid ${accent}` : `0.0625rem solid ${HAIRLINE}`,
                        borderRadius: "0.75rem", overflow: "hidden", cursor: "pointer",
                        padding: "0.375rem", background: selected ? `${accent}12` : "rgba(255,255,255,0.7)",
                        textAlign: "left", transition: "all .15s",
                      }}>
                        <div style={{
                          width: "5rem", height: "100%", flexShrink: 0,
                          borderRadius: "0.5rem",
                          background: `url(${mem.dataUrl}) center/cover no-repeat ${T.color.warmStone}`,
                        }} />
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.1875rem" }}>
                          <div style={{
                            fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 500, color: T.color.charcoal,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>{(mem.titleKey && tDemos(mem.titleKey)) || mem.title}</div>
                          <div style={{
                            fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            display: "flex", alignItems: "center", gap: "0.3125rem",
                          }}>
                            <RoomIcon roomId={memRoom.id} size={12} color={T.color.muted} />
                            <span>{(memRoom.nameKey && tWings(memRoom.nameKey)) || memRoom.name} · {wingName}</span>
                          </div>
                        </div>
                        {selected && (
                          <div style={{
                            width: "1.25rem", height: "1.25rem", borderRadius: "50%",
                            background: accent, color: "#FFF", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.75rem", marginRight: "0.25rem",
                          }}>{"\u2713"}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, marginTop: "1.25rem", textAlign: "center", lineHeight: 1.5 }}>
          {t("hint")}
        </p>
      </div>
    </div>
  );
}
