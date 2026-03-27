"use client";
import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { WINGS } from "@/lib/constants/wings";
import type { Wing, WingRoom } from "@/lib/constants/wings";

export interface CorridorPaintingOverride {
  url?: string;
  title?: string;
  memId?: string;
  roomId?: string;
}

export type CorridorPaintings = Record<string, CorridorPaintingOverride>;

function loadCorridorPaintings(wingId: string): CorridorPaintings {
  try {
    const raw = localStorage.getItem(`mp_corridor_paintings_${wingId}`);
    return raw ? JSON.parse(raw) : {};
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
  const accent = wing.accent;
  const userMems = useMemoryStore((s) => s.userMems);
  const { getWingRooms } = useRoomStore();

  const [paintings, setPaintings] = useState<CorridorPaintings>(currentPaintings);
  const [pickingSlot, setPickingSlot] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<"all" | "wing" | "upload">("all");

  // Painting slots — 1 per 2 doors (every other gap between adjacent doors)
  const slots = rooms.filter((_, i) => i % 2 === 0 && i < rooms.length - 1).map((r) => r.id);

  // Get all memories with images from ALL wings (not just current wing)
  const allMems: { mem: Mem; room: WingRoom; wingName: string }[] = [];
  WINGS.forEach((w) => {
    const wRooms = getWingRooms(w.id);
    wRooms.forEach((room) => {
      const mems = userMems[room.id] || ROOM_MEMS[room.id] || [];
      mems.forEach((mem) => {
        if (mem.dataUrl && mem.type === "photo") {
          allMems.push({ mem, room, wingName: w.name || w.id });
        }
      });
    });
  });

  // Filtered mems based on source filter
  const wingRooms = getWingRooms(wing.id);
  const wingRoomIds = new Set(wingRooms.map((r) => r.id));
  const filteredMems = sourceFilter === "wing"
    ? allMems.filter(({ room }) => wingRoomIds.has(room.id))
    : allMems;

  const handleAssign = useCallback((slotRoomId: string, mem: Mem, fromRoomId: string) => {
    const next: CorridorPaintings = {
      ...paintings,
      [slotRoomId]: { url: mem.dataUrl || undefined, title: mem.title, memId: mem.id, roomId: fromRoomId },
    };
    setPaintings(next);
    saveCorridorPaintings(wing.id, next);
    onPaintingsChange(next);
    setPickingSlot(null);
  }, [paintings, wing.id, onPaintingsChange]);

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
        const next: CorridorPaintings = {
          ...paintings,
          [slotRoomId]: { url: dataUrl, title },
        };
        setPaintings(next);
        saveCorridorPaintings(wing.id, next);
        onPaintingsChange(next);
        setPickingSlot(null);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [paintings, wing.id, onPaintingsChange]);

  const handleClear = useCallback((slotRoomId: string) => {
    const next = { ...paintings };
    delete next[slotRoomId];
    setPaintings(next);
    saveCorridorPaintings(wing.id, next);
    onPaintingsChange(next);
  }, [paintings, wing.id, onPaintingsChange]);

  const handleResetAll = useCallback(() => {
    setPaintings({});
    saveCorridorPaintings(wing.id, {});
    onPaintingsChange({});
    setPickingSlot(null);
  }, [wing.id, onPaintingsChange]);

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(42,34,24,.4)", backdropFilter: "blur(8px)", zIndex: 55, animation: "fadeIn .2s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: "absolute", right: 0, top: 0, bottom: 0,
        width: isMobile ? "100%" : "min(440px, 92vw)",
        background: `${T.color.linen}f8`,
        backdropFilter: "blur(20px)",
        borderLeft: isMobile ? "none" : `1px solid ${T.color.cream}`,
        padding: isMobile ? "20px 16px" : "28px 24px",
        overflowY: "auto",
        animation: "slideInRight .3s cubic-bezier(.23,1,.32,1)",
      }}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: T.font.display, fontSize: 22, fontWeight: 500, color: T.color.charcoal, margin: 0 }}>Corridor Gallery</h3>
            <p style={{ fontFamily: T.font.body, fontSize: 12, color: accent, margin: "4px 0 0" }}>{wing.icon} {wing.name} Wing</p>
          </div>
          <button onClick={onClose} style={{
            width: isMobile ? 40 : 32, height: isMobile ? 40 : 32, borderRadius: isMobile ? 20 : 16,
            border: `1px solid ${T.color.cream}`, background: T.color.warmStone,
            color: T.color.muted, fontSize: isMobile ? 16 : 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            minWidth: 44, minHeight: 44,
          }}>{"\u2715"}</button>
        </div>

        {/* Description */}
        <p style={{ fontFamily: T.font.body, fontSize: 13, color: T.color.muted, marginBottom: 18, lineHeight: 1.5 }}>
          Customize the paintings on your corridor walls. Choose photos from any wing, or upload your own images.
        </p>

        {/* Reset button */}
        {Object.keys(paintings).length > 0 && (
          <button onClick={handleResetAll} style={{
            marginBottom: 16, padding: "8px 16px", borderRadius: 10,
            border: `1px solid ${T.color.cream}`, background: T.color.warmStone,
            fontFamily: T.font.body, fontSize: 12, color: T.color.walnut,
            cursor: "pointer", transition: "all .15s",
          }}>
            Reset to defaults
          </button>
        )}

        {/* Painting slots */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {slots.map((roomId, idx) => {
            const room = rooms.find((r) => r.id === roomId);
            if (!room) return null;
            const override = paintings[roomId];
            const isPicking = pickingSlot === roomId;

            return (
              <div key={roomId} style={{
                background: T.color.white, borderRadius: 14,
                border: `1px solid ${isPicking ? accent : T.color.cream}`,
                padding: "14px 14px", transition: "all .15s",
              }}>
                {/* Slot header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isPicking ? 12 : 0 }}>
                  {/* Thumbnail preview */}
                  <div style={{
                    width: 56, height: 40, borderRadius: 8, flexShrink: 0,
                    border: `1px solid ${T.color.cream}`,
                    overflow: "hidden", position: "relative",
                    background: override?.url
                      ? `url(${override.url}) center/cover no-repeat`
                      : `linear-gradient(135deg, hsl(${room.coverHue},40%,35%), hsl(${(room.coverHue + 30) % 360},30%,22%))`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {!override?.url && (
                      <span style={{ fontSize: 18 }}>{room.icon}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.font.display, fontSize: 14, fontWeight: 500, color: T.color.charcoal }}>
                      Painting {idx + 1}
                    </div>
                    <div style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {override?.title ? override.title : `${room.icon} ${room.name} (default)`}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {override && (
                      <button onClick={() => handleClear(roomId)} title="Remove override" style={{
                        width: 30, height: 30, borderRadius: 8,
                        border: `1px solid ${T.color.cream}`, background: T.color.warmStone,
                        color: T.color.muted, fontSize: 12, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{"\u2715"}</button>
                    )}
                    <button onClick={() => setPickingSlot(isPicking ? null : roomId)} style={{
                      padding: "6px 12px", borderRadius: 8,
                      border: `1px solid ${isPicking ? accent : T.color.cream}`,
                      background: isPicking ? `${accent}15` : T.color.warmStone,
                      fontFamily: T.font.body, fontSize: 11, fontWeight: 500,
                      color: isPicking ? accent : T.color.walnut, cursor: "pointer",
                    }}>
                      {isPicking ? "Cancel" : "Choose"}
                    </button>
                  </div>
                </div>

                {/* Memory picker */}
                {isPicking && (
                  <div>
                    {/* Upload + source filter */}
                    <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                      <button onClick={() => handleUpload(roomId)} style={{
                        padding: "6px 12px", borderRadius: 8,
                        border: `1px solid ${accent}`, background: `${accent}15`,
                        fontFamily: T.font.body, fontSize: 11, fontWeight: 500,
                        color: accent, cursor: "pointer",
                      }}>
                        Upload Image
                      </button>
                      <button onClick={() => setSourceFilter("all")} style={{
                        padding: "5px 10px", borderRadius: 8,
                        border: `1px solid ${sourceFilter === "all" ? accent : T.color.cream}`,
                        background: sourceFilter === "all" ? `${accent}15` : T.color.warmStone,
                        fontFamily: T.font.body, fontSize: 10, color: sourceFilter === "all" ? accent : T.color.muted,
                        cursor: "pointer",
                      }}>All Wings</button>
                      <button onClick={() => setSourceFilter("wing")} style={{
                        padding: "5px 10px", borderRadius: 8,
                        border: `1px solid ${sourceFilter === "wing" ? accent : T.color.cream}`,
                        background: sourceFilter === "wing" ? `${accent}15` : T.color.warmStone,
                        fontFamily: T.font.body, fontSize: 10, color: sourceFilter === "wing" ? accent : T.color.muted,
                        cursor: "pointer",
                      }}>This Wing</button>
                    </div>
                    {filteredMems.length === 0 ? (
                      <p style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.muted, textAlign: "center", padding: "16px 0" }}>
                        No photo memories found. Add photos to your rooms or upload an image.
                      </p>
                    ) : (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${isMobile ? 3 : 4}, 1fr)`,
                        gap: 8, maxHeight: 240, overflowY: "auto",
                        padding: 2,
                      }}>
                        {filteredMems.map(({ mem, room: memRoom, wingName }) => (
                          <button key={mem.id} onClick={() => handleAssign(roomId, mem, memRoom.id)} style={{
                            border: paintings[roomId]?.memId === mem.id ? `2px solid ${accent}` : `1px solid ${T.color.cream}`,
                            borderRadius: 10, overflow: "hidden", cursor: "pointer",
                            padding: 0, background: T.color.warmStone,
                            aspectRatio: "4/3", position: "relative",
                            transition: "all .15s",
                          }}>
                            <div style={{
                              width: "100%", height: "100%",
                              background: `url(${mem.dataUrl}) center/cover no-repeat`,
                            }} />
                            <div style={{
                              position: "absolute", bottom: 0, left: 0, right: 0,
                              background: "linear-gradient(transparent, rgba(42,34,24,.7))",
                              padding: "12px 6px 4px",
                            }}>
                              <div style={{
                                fontFamily: T.font.body, fontSize: 9, color: "#FFF",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>{mem.title}</div>
                              <div style={{
                                fontFamily: T.font.body, fontSize: 8, color: "rgba(255,255,255,.6)",
                              }}>{memRoom.icon} {memRoom.name} — {wingName}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <p style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.muted, marginTop: 20, textAlign: "center", lineHeight: 1.5 }}>
          Photos assigned here will appear as paintings in the corridor. Click a painting in-scene to enter its room.
        </p>
      </div>
    </div>
  );
}
