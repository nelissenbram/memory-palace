"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import Image from "next/image";
import MemoryDetail from "@/components/ui/MemoryDetail";
import UploadPanel from "@/components/ui/UploadPanel";

const TYPE_ICONS: Record<string, string> = {
  photo: "\u{1F5BC}\uFE0F", video: "\u{1F3AC}", album: "\u{1F4D6}",
  orb: "\u{1F52E}", case: "\u{1F3FA}", voice: "\u{1F399}\uFE0F",
  document: "\u{1F4DC}", audio: "\u{1F3B5}", painting: "\u{1F3A8}",
};

interface LibraryViewProps {
  onOpenUpload: (wingId: string, roomId: string) => void;
  onSelectMemory: (mem: Mem, wingId: string, roomId: string) => void;
  onOpenGallery: (wingId: string, roomId: string) => void;
}

export default function LibraryView({ onOpenUpload, onSelectMemory, onOpenGallery }: LibraryViewProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { getWings, getWingRooms } = useRoomStore();
  const { userMems, fetchRoomMemories } = useMemoryStore();
  const { setNavMode, enterCorridor, enterRoom, activeWing: storeActiveWing } = usePalaceStore();

  const { addMemory, updateMemory, deleteMemory } = useMemoryStore();

  const wings = getWings();
  const [selectedWing, setSelectedWing] = useState<string>(wings[0]?.id || "family");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [detailMem, setDetailMem] = useState<{ mem: Mem; wingId: string; roomId: string } | null>(null);
  const [showUploadFor, setShowUploadFor] = useState<{ wingId: string; roomId: string } | null>(null);

  const wingRooms = getWingRooms(selectedWing);
  // Fetch memories for all rooms of selected wing on mount/change
  const wingRoomIds = wingRooms.map(r => r.id).join(",");
  useEffect(() => {
    for (const id of wingRoomIds.split(",")) {
      if (id) fetchRoomMemories(id);
    }
  }, [wingRoomIds, fetchRoomMemories]);

  // Get memories for a room
  const getMemsForRoom = useCallback((roomId: string): Mem[] => {
    return userMems[roomId] || ROOM_MEMS[roomId] || [];
  }, [userMems]);

  // All memories across selected wing
  const allWingMems = useMemo(() => {
    return wingRooms.flatMap(r => getMemsForRoom(r.id));
  }, [wingRooms, getMemsForRoom]);

  // Filtered memories
  const q = query.toLowerCase();
  const filteredRoomMems = useMemo(() => {
    if (!selectedRoom) return [];
    let mems = getMemsForRoom(selectedRoom);
    if (q) mems = mems.filter(m => m.title.toLowerCase().includes(q) || (m.desc || "").toLowerCase().includes(q));
    if (filterType) mems = mems.filter(m => m.type === filterType);
    return mems;
  }, [selectedRoom, getMemsForRoom, q, filterType]);

  // Cross-wing search results
  const crossWingResults = useMemo(() => {
    if (!q || selectedRoom) return null;
    const results: { wing: Wing; room: WingRoom; mem: Mem }[] = [];
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        const mems = getMemsForRoom(r.id);
        for (const m of mems) {
          if (m.title.toLowerCase().includes(q) || (m.desc || "").toLowerCase().includes(q)) {
            results.push({ wing: w, room: r, mem: m });
          }
        }
      }
    }
    return results.length > 0 ? results : null;
  }, [q, selectedRoom, wings, getWingRooms, getMemsForRoom]);

  // Get unique types in room for filter chips
  const roomTypes = useMemo(() => {
    if (!selectedRoom) return [];
    const mems = getMemsForRoom(selectedRoom);
    return [...new Set(mems.map(m => m.type))];
  }, [selectedRoom, getMemsForRoom]);

  // Wing memory count
  const wingMemCount = useCallback((wingId: string) => {
    return getWingRooms(wingId).reduce((sum, r) => sum + (getMemsForRoom(r.id)).length, 0);
  }, [getWingRooms, getMemsForRoom]);

  const currentWing = wings.find(w => w.id === selectedWing) || wings[0];

  const handleBackToRooms = () => {
    setSelectedRoom(null);
    setQuery("");
    setFilterType(null);
  };

  const handleAddMemory = useCallback((mem: Mem) => {
    if (showUploadFor) {
      addMemory(showUploadFor.roomId, mem);
    }
  }, [showUploadFor, addMemory]);

  const handleUpdateMemory = useCallback((memId: string, updates: Partial<Mem>) => {
    if (detailMem) {
      updateMemory(detailMem.roomId, memId, updates);
    }
  }, [detailMem, updateMemory]);

  const handleDeleteMemory = useCallback((memId: string) => {
    if (detailMem) {
      deleteMemory(detailMem.roomId, memId);
      setDetailMem(null);
    }
  }, [detailMem, deleteMemory]);

  const handleEnter3D = () => {
    setNavMode("3d");
    if (selectedRoom) {
      enterCorridor(selectedWing);
      setTimeout(() => enterRoom(selectedRoom), 600);
    } else {
      enterCorridor(selectedWing);
    }
  };

  return (
    <div style={{
      width: "100vw", height: "100dvh", display: "flex", flexDirection: isMobile ? "column" : "row",
      background: T.color.linen, fontFamily: T.font.body, overflow: "hidden",
    }}>
      {/* ═══ WING SIDEBAR ═══ */}
      <nav style={{
        width: isMobile ? "100%" : 240,
        minWidth: isMobile ? undefined : 240,
        height: isMobile ? "auto" : "100%",
        background: T.color.warmStone,
        borderRight: isMobile ? "none" : `1px solid ${T.color.cream}`,
        borderBottom: isMobile ? `1px solid ${T.color.cream}` : "none",
        display: "flex",
        flexDirection: isMobile ? "row" : "column",
        overflowX: isMobile ? "auto" : "hidden",
        overflowY: isMobile ? "hidden" : "auto",
        flexShrink: 0,
      }}>
        {/* Header */}
        {!isMobile && (
          <div style={{ padding: "1.25rem 1rem 0.75rem", borderBottom: `1px solid ${T.color.cream}` }}>
            <h1 style={{
              fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 600,
              color: T.color.charcoal, margin: 0, letterSpacing: "0.02em",
            }}>
              {t("title")}
            </h1>
            <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: "0.25rem 0 0" }}>
              {t("subtitle", { count: String(wings.reduce((s, w) => s + wingMemCount(w.id), 0)) })}
            </p>
          </div>
        )}

        {/* Wing list */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "row" : "column",
          padding: isMobile ? "0.5rem" : "0.5rem 0",
          gap: isMobile ? "0.25rem" : 0,
        }}>
          {wings.filter(w => w.id !== "attic").map(w => {
            const active = w.id === selectedWing;
            const count = wingMemCount(w.id);
            return (
              <button
                key={w.id}
                onClick={() => { setSelectedWing(w.id); setSelectedRoom(null); setQuery(""); setFilterType(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: isMobile ? "0.5rem 0.75rem" : "0.625rem 1rem",
                  background: active ? `${T.color.white}` : "transparent",
                  border: "none", borderRadius: isMobile ? "0.5rem" : 0,
                  borderLeft: !isMobile && active ? `3px solid ${w.accent}` : !isMobile ? "3px solid transparent" : "none",
                  cursor: "pointer", width: isMobile ? "auto" : "100%", textAlign: "left",
                  transition: "background 0.15s ease",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                <span style={{ fontSize: isMobile ? "1rem" : "1.125rem" }}>{w.icon}</span>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: active ? 600 : 500,
                    color: active ? T.color.charcoal : T.color.walnut,
                  }}>
                    {w.name}
                  </span>
                  {!isMobile && (
                    <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted }}>
                      {t("wingCount", { rooms: String(getWingRooms(w.id).length), memories: String(count) })}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom actions — desktop only */}
        {!isMobile && (
          <div style={{ marginTop: "auto", padding: "0.75rem 1rem", borderTop: `1px solid ${T.color.cream}`, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <a
              href="/settings"
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.5rem 0.75rem", borderRadius: "0.375rem",
                fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.walnut,
                textDecoration: "none",
              }}
            >
              {"\u2699\uFE0F"} {tc("settings")}
            </a>
            <button
              onClick={handleEnter3D}
              style={{
                width: "100%", padding: "0.625rem", borderRadius: "0.5rem",
                background: T.color.charcoal, color: T.color.linen,
                border: "none", cursor: "pointer",
                fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 500,
                letterSpacing: "0.03em",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}
            >
              <span style={{ fontSize: "0.875rem" }}>{"\u{1F3DB}\uFE0F"}</span>
              {t("enterPalace")}
            </button>
          </div>
        )}
      </nav>

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{
        flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden", minWidth: 0,
      }}>
        {/* Header bar */}
        <header style={{
          padding: isMobile ? "0.75rem 1rem" : "1rem 1.5rem",
          borderBottom: `1px solid ${T.color.cream}`,
          display: "flex", alignItems: "center", gap: "0.75rem",
          background: T.color.white, flexShrink: 0,
        }}>
          {selectedRoom && (
            <button
              onClick={handleBackToRooms}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.walnut,
                padding: "0.25rem 0.5rem", borderRadius: "0.25rem",
                display: "flex", alignItems: "center", gap: "0.25rem",
              }}
            >
              {"\u2190"} {tc("back")}
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: "1.25rem" }}>{currentWing.icon}</span>
            <div style={{ minWidth: 0 }}>
              <h2 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1rem" : "1.125rem",
                fontWeight: 600, color: T.color.charcoal, margin: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {selectedRoom
                  ? wingRooms.find(r => r.id === selectedRoom)?.name || ""
                  : currentWing.name}
              </h2>
              {!selectedRoom && (
                <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: 0 }}>
                  {currentWing.desc}
                </p>
              )}
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", width: isMobile ? 160 : 220 }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              style={{
                width: "100%", padding: "0.4375rem 0.75rem 0.4375rem 2rem",
                border: `1px solid ${T.color.cream}`, borderRadius: "0.5rem",
                fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
                background: T.color.linen, outline: "none",
              }}
            />
            <span style={{
              position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)",
              fontSize: "0.75rem", color: T.color.muted, pointerEvents: "none",
            }}>
              {"\u{1F50D}"}
            </span>
          </div>

          {/* 3D toggle — mobile */}
          {isMobile && (
            <button
              onClick={handleEnter3D}
              style={{
                padding: "0.375rem 0.625rem", borderRadius: "0.375rem",
                background: T.color.charcoal, color: T.color.linen,
                border: "none", cursor: "pointer",
                fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              3D
            </button>
          )}
        </header>

        {/* Filter chips — only when inside a room */}
        {selectedRoom && roomTypes.length > 1 && (
          <div style={{
            padding: "0.5rem 1rem", display: "flex", gap: "0.375rem",
            overflowX: "auto", flexShrink: 0, borderBottom: `1px solid ${T.color.cream}`,
            background: T.color.white,
          }}>
            <FilterChip
              label={t("all")}
              active={!filterType}
              accent={currentWing.accent}
              onClick={() => setFilterType(null)}
            />
            {roomTypes.map(type => (
              <FilterChip
                key={type}
                label={`${TYPE_ICONS[type] || ""} ${type}`}
                active={filterType === type}
                accent={currentWing.accent}
                onClick={() => setFilterType(filterType === type ? null : type)}
              />
            ))}
          </div>
        )}

        {/* Content area */}
        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "0.75rem" : "1.25rem 1.5rem" }}>
          {/* Cross-wing search results */}
          {crossWingResults && (
            <div>
              <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, marginBottom: "0.75rem" }}>
                {t("searchResults", { count: String(crossWingResults.length), query })}
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(16rem, 1fr))",
                gap: "0.75rem",
              }}>
                {crossWingResults.slice(0, 50).map(({ wing, room, mem }) => (
                  <MemoryCard
                    key={mem.id}
                    mem={mem}
                    subtitle={`${wing.icon} ${wing.name} / ${room.icon} ${room.name}`}
                    accent={wing.accent}
                    onClick={() => setDetailMem({ mem, wingId: wing.id, roomId: room.id })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Room list (when no room selected and no cross-wing search) */}
          {!selectedRoom && !crossWingResults && (
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(16rem, 1fr))",
              gap: "0.75rem",
            }}>
              {wingRooms.map(room => {
                const mems = getMemsForRoom(room.id);
                const thumbMem = mems.find(m => m.dataUrl && m.type === "photo") || mems.find(m => m.dataUrl);
                return (
                  <RoomCard
                    key={room.id}
                    room={room}
                    memCount={mems.length}
                    thumbUrl={thumbMem?.dataUrl || null}
                    accent={currentWing.accent}
                    t={t}
                    onClick={() => {
                      setSelectedRoom(room.id);
                      fetchRoomMemories(room.id);
                    }}
                    onAdd={() => setShowUploadFor({ wingId: selectedWing, roomId: room.id })}
                  />
                );
              })}
            </div>
          )}

          {/* Memory grid (when room selected) */}
          {selectedRoom && !crossWingResults && (
            <>
              {filteredRoomMems.length > 0 ? (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(14rem, 1fr))",
                  gap: "0.75rem",
                }}>
                  {filteredRoomMems.map(mem => (
                    <MemoryCard
                      key={mem.id}
                      mem={mem}
                      accent={currentWing.accent}
                      onClick={() => setDetailMem({ mem, wingId: selectedWing, roomId: selectedRoom })}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  hasQuery={!!q || !!filterType}
                  t={t}
                  accent={currentWing.accent}
                  onAdd={() => setShowUploadFor({ wingId: selectedWing, roomId: selectedRoom })}
                />
              )}

              {/* Gallery button */}
              {getMemsForRoom(selectedRoom).length > 0 && (
                <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => onOpenGallery(selectedWing, selectedRoom)}
                    style={{
                      padding: "0.5rem 1rem", borderRadius: "0.5rem",
                      background: T.color.white, border: `1px solid ${T.color.cream}`,
                      cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem",
                      color: T.color.walnut, display: "flex", alignItems: "center", gap: "0.375rem",
                    }}
                  >
                    {"\u{1F5BC}\uFE0F"} {t("openGallery")}
                  </button>
                  <button
                    onClick={() => {
                      setNavMode("3d");
                      enterCorridor(selectedWing);
                      setTimeout(() => enterRoom(selectedRoom), 600);
                    }}
                    style={{
                      padding: "0.5rem 1rem", borderRadius: "0.5rem",
                      background: T.color.white, border: `1px solid ${T.color.cream}`,
                      cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem",
                      color: T.color.walnut, display: "flex", alignItems: "center", gap: "0.375rem",
                    }}
                  >
                    {"\u{1F3DB}\uFE0F"} {t("viewIn3D")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ═══ OVERLAY PANELS ═══ */}

      {/* Memory detail overlay */}
      {detailMem && (
        <MemoryDetail
          mem={detailMem.mem}
          room={getWingRooms(detailMem.wingId).find(r => r.id === detailMem.roomId) || null}
          wing={wings.find(w => w.id === detailMem.wingId) || null}
          onClose={() => setDetailMem(null)}
          onDelete={handleDeleteMemory}
          onUpdate={handleUpdateMemory}
        />
      )}

      {/* Upload panel overlay */}
      {showUploadFor && (
        <UploadPanel
          wing={wings.find(w => w.id === showUploadFor.wingId) || null}
          room={getWingRooms(showUploadFor.wingId).find(r => r.id === showUploadFor.roomId) || null}
          onClose={() => setShowUploadFor(null)}
          onAdd={handleAddMemory}
          roomMemories={getMemsForRoom(showUploadFor.roomId)}
          onUpdateMemory={(memId: string, updates: Partial<Mem>) => updateMemory(showUploadFor.roomId, memId, updates)}
        />
      )}
    </div>
  );
}

/* ── Sub-components ── */

function RoomCard({ room, memCount, thumbUrl, accent, t, onClick, onAdd }: {
  room: WingRoom; memCount: number; thumbUrl: string | null; accent: string;
  t: (key: string, params?: Record<string, string>) => string;
  onClick: () => void; onAdd: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: "0.75rem", border: `1px solid ${T.color.cream}`,
        background: T.color.white, cursor: "pointer", overflow: "hidden",
        transition: "box-shadow 0.15s ease, transform 0.15s ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 20px rgba(44,44,42,.08)`; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
    >
      {/* Cover */}
      <div style={{
        height: "6.5rem", background: `hsl(${room.coverHue}, 25%, 88%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden",
      }}>
        {thumbUrl ? (
          <Image
            src={thumbUrl}
            alt=""
            fill
            style={{ objectFit: "cover" }}
            sizes="260px"
            unoptimized={thumbUrl.startsWith("data:")}
          />
        ) : (
          <span style={{ fontSize: "2rem", opacity: 0.5 }}>{room.icon}</span>
        )}
        {room.shared && (
          <span style={{
            position: "absolute", top: "0.375rem", right: "0.375rem",
            background: `${T.color.white}cc`, borderRadius: "0.25rem",
            padding: "0.125rem 0.375rem", fontSize: "0.625rem",
            fontFamily: T.font.body, color: T.color.sage,
          }}>
            {t("shared")}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "0.625rem 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1rem" }}>{room.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 600,
            color: T.color.charcoal, margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {room.name}
          </p>
          <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, margin: 0 }}>
            {t("memoryCount", { count: String(memCount) })}
          </p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onAdd(); }}
          title={t("addMemory")}
          style={{
            width: "1.75rem", height: "1.75rem", borderRadius: "50%",
            background: accent, color: T.color.white, border: "none",
            cursor: "pointer", fontSize: "1rem", lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function MemoryCard({ mem, subtitle, accent, onClick }: {
  mem: Mem; subtitle?: string; accent: string; onClick: () => void;
}) {
  const hasImage = mem.dataUrl && !mem.dataUrl.startsWith("data:audio") && !mem.videoBlob;

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: "0.625rem", border: `1px solid ${T.color.cream}`,
        background: T.color.white, cursor: "pointer", overflow: "hidden",
        transition: "box-shadow 0.15s ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 2px 12px rgba(44,44,42,.07)`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Thumbnail */}
      <div style={{
        height: "7rem", position: "relative", overflow: "hidden",
        background: hasImage ? "transparent" : `hsl(${mem.hue}, ${mem.s}%, ${mem.l}%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {hasImage ? (
          <Image
            src={mem.dataUrl!}
            alt={mem.title}
            fill
            style={{ objectFit: "cover" }}
            sizes="240px"
            unoptimized={mem.dataUrl!.startsWith("data:")}
          />
        ) : (
          <span style={{ fontSize: "1.5rem", opacity: 0.7 }}>{TYPE_ICONS[mem.type] || "\u{1F4C4}"}</span>
        )}
        {/* Type badge */}
        <span style={{
          position: "absolute", bottom: "0.25rem", right: "0.25rem",
          background: `${T.color.charcoal}aa`, color: T.color.white,
          borderRadius: "0.25rem", padding: "0.0625rem 0.375rem",
          fontSize: "0.625rem", fontFamily: T.font.body,
        }}>
          {TYPE_ICONS[mem.type] || ""} {mem.type}
        </span>
      </div>

      {/* Info */}
      <div style={{ padding: "0.5rem 0.625rem" }}>
        <p style={{
          fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 600,
          color: T.color.charcoal, margin: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {mem.title}
        </p>
        {subtitle && (
          <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, margin: "0.125rem 0 0" }}>
            {subtitle}
          </p>
        )}
        {mem.desc && !subtitle && (
          <p style={{
            fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
            margin: "0.125rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {mem.desc}
          </p>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, accent, onClick }: {
  label: string; active: boolean; accent: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.25rem 0.625rem", borderRadius: "1rem",
        border: `1px solid ${active ? accent : T.color.cream}`,
        background: active ? accent : T.color.white,
        color: active ? T.color.white : T.color.walnut,
        cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem",
        whiteSpace: "nowrap", flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

function EmptyState({ hasQuery, t, accent, onAdd }: {
  hasQuery: boolean; t: (key: string) => string; accent: string; onAdd: () => void;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "3rem 1rem", gap: "0.75rem",
    }}>
      <span style={{ fontSize: "2.5rem", opacity: 0.4 }}>
        {hasQuery ? "\u{1F50D}" : "\u{1F4F7}"}
      </span>
      <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted, textAlign: "center" }}>
        {hasQuery ? t("noResults") : t("emptyRoom")}
      </p>
      {!hasQuery && (
        <button
          onClick={onAdd}
          style={{
            padding: "0.5rem 1.25rem", borderRadius: "0.5rem",
            background: accent, color: T.color.white, border: "none",
            cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem",
          }}
        >
          {t("addFirst")}
        </button>
      )}
    </div>
  );
}
