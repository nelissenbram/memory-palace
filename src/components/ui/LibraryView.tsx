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
import MemoryDetail from "@/components/ui/MemoryDetail";
import UploadPanel from "@/components/ui/UploadPanel";
import NotificationBell from "@/components/ui/NotificationBell";
import { LibraryRoomCard, LibraryMemoryCard } from "@/components/ui/LibraryCards";
import LibrarySidebar from "@/components/ui/LibrarySidebar";
import { LibrarySearch, LibraryFilterBar } from "@/components/ui/LibrarySearch";
import { LibraryStyles, LibraryHeader, LibraryEmptyState } from "@/components/ui/LibraryAnimations";
import TuscanStyles from "./TuscanStyles";
import TuscanCard from "./TuscanCard";

export default function LibraryView() {
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

  // Prefetch all wings on mount for cross-wing search
  useEffect(() => {
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        fetchRoomMemories(r.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Get unique types in room for filter chips + counts
  const roomTypes = useMemo(() => {
    if (!selectedRoom) return [];
    const mems = getMemsForRoom(selectedRoom);
    return [...new Set(mems.map(m => m.type))];
  }, [selectedRoom, getMemsForRoom]);

  const roomTypeCounts = useMemo(() => {
    if (!selectedRoom) return {};
    const mems = getMemsForRoom(selectedRoom);
    const counts: Record<string, number> = {};
    for (const m of mems) { counts[m.type] = (counts[m.type] || 0) + 1; }
    return counts;
  }, [selectedRoom, getMemsForRoom]);

  // Result count for search badge
  const searchResultCount = useMemo(() => {
    if (!query) return undefined;
    if (selectedRoom) return filteredRoomMems.length;
    if (crossWingResults) return crossWingResults.length;
    return 0;
  }, [query, selectedRoom, filteredRoomMems, crossWingResults]);

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

  // Keyboard: Escape to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (detailMem) setDetailMem(null);
        else if (showUploadFor) setShowUploadFor(null);
        else if (selectedRoom) handleBackToRooms();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [detailMem, showUploadFor, selectedRoom]);

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
      background: `linear-gradient(175deg, ${T.color.linen} 0%, ${T.color.warmStone} 55%, ${T.color.cream} 100%)`, fontFamily: T.font.body, overflow: "hidden",
    }}>
      <LibraryStyles />
      <TuscanStyles />

      {/* ═══ WING SIDEBAR ═══ */}
      <LibrarySidebar
        wings={wings}
        selectedWing={selectedWing}
        onSelectWing={(wingId: string) => { setSelectedWing(wingId); setSelectedRoom(null); setQuery(""); setFilterType(null); }}
        wingMemCount={wingMemCount}
        onEnter3D={handleEnter3D}
        isMobile={isMobile}
      />

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{
        flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden", minWidth: 0,
        animation: "libFadeIn 0.4s ease both",
      }}>
        {/* Header bar — LibraryHeader + search/actions */}
        <div style={{ display: "flex", alignItems: "stretch", flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <LibraryHeader
              wingIcon={currentWing.icon}
              wingName={currentWing.name}
              wingDesc={currentWing.desc}
              roomName={selectedRoom ? (wingRooms.find(r => r.id === selectedRoom)?.name || undefined) : undefined}
              accent={currentWing.accent}
              onBack={selectedRoom ? handleBackToRooms : undefined}
              onAdd={selectedRoom ? () => setShowUploadFor({ wingId: selectedWing, roomId: selectedRoom }) : undefined}
              isMobile={isMobile}
            />
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: isMobile ? "0.75rem 0.75rem 0.75rem 0" : "1rem 1.5rem 1rem 0",
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(0.75rem)",
            WebkitBackdropFilter: "blur(0.75rem)",
          }}>
            <LibrarySearch
              query={query}
              onQueryChange={setQuery}
              accent={currentWing.accent}
              resultCount={searchResultCount}
              isMobile={isMobile}
            />

            <NotificationBell />

            {/* Settings — mobile */}
            {isMobile && (
              <a href="/settings" style={{ fontSize: "1.125rem", lineHeight: 1, color: T.color.walnut, textDecoration: "none" }}>
                {"\u2699\uFE0F"}
              </a>
            )}

            {/* 3D toggle — mobile */}
            {isMobile && (
              <button
                onClick={handleEnter3D}
                style={{
                  padding: "0.375rem 0.75rem", borderRadius: "1.25rem",
                  background: `linear-gradient(135deg, ${T.color.charcoal}, #3D3D3A)`,
                  color: T.color.linen,
                  border: "none", cursor: "pointer",
                  fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                  whiteSpace: "nowrap", letterSpacing: "0.06em",
                  flexShrink: 0,
                  boxShadow: "0 0.0625rem 0.25rem rgba(44,44,42,0.15)",
                }}
              >
                3D
              </button>
            )}
          </div>
        </div>

        {/* Filter chips — only when inside a room */}
        {selectedRoom && roomTypes.length > 1 && (
          <LibraryFilterBar
            types={roomTypes}
            activeType={filterType}
            onFilterChange={setFilterType}
            accent={currentWing.accent}
            typeCounts={roomTypeCounts}
          />
        )}

        {/* Content area */}
        <div style={{
          flex: 1, overflow: "auto",
          padding: isMobile ? "1.25rem 1rem" : "2rem 2.5rem",
          animation: "libFadeIn 0.35s ease both",
        }}>
          {/* Cross-wing search results */}
          {crossWingResults && (
            <div style={{ animation: "libSlideUp 0.35s ease both" }}>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
                marginBottom: "1.25rem", letterSpacing: "0.02em",
              }}>
                {t("searchResults", { count: String(crossWingResults.length), query })}
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(17rem, 1fr))",
                gap: "1.25rem",
              }}>
                {crossWingResults.slice(0, 50).map(({ wing, room, mem }, i) => (
                  <div key={mem.id} style={{
                    animation: `libCardEnter 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${0.05 + i * 0.035}s both`,
                  }}>
                    <LibraryMemoryCard
                      mem={mem}
                      subtitle={`${wing.icon} ${wing.name} / ${room.icon} ${room.name}`}
                      accent={wing.accent}
                      onClick={() => setDetailMem({ mem, wingId: wing.id, roomId: room.id })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Room list (when no room selected and no cross-wing search) */}
          {!selectedRoom && !crossWingResults && (
            <div style={{ animation: "libFadeIn 0.35s ease both" }}>
              {/* Section header with decorative accent */}
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{
                  display: "flex", alignItems: "baseline", gap: "0.625rem",
                  marginBottom: "0.5rem",
                }}>
                  <h3 style={{
                    fontFamily: T.font.display, fontSize: "1rem",
                    fontWeight: 400, color: T.color.muted,
                    margin: 0, letterSpacing: "0.1em", textTransform: "uppercase",
                  }}>
                    {t("roomsIn")}
                  </h3>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "1rem",
                    fontWeight: 600, color: T.color.charcoal,
                    letterSpacing: "0.03em",
                  }}>
                    {currentWing.name}
                  </span>
                </div>
                <div style={{
                  height: "0.0625rem", maxWidth: "10rem",
                  background: `linear-gradient(90deg, ${currentWing.accent}55, ${T.color.cream}33, transparent)`,
                  animation: "libFadeIn 0.6s ease 0.2s both",
                }} />
              </div>

              {wingRooms.length > 0 ? (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(17rem, 1fr))",
                  gap: "1.25rem",
                }}>
                  {wingRooms.map((room, i) => {
                    const mems = getMemsForRoom(room.id);
                    const thumbMem = mems.find(m => m.dataUrl && m.type === "photo") || mems.find(m => m.dataUrl);
                    return (
                      <div key={room.id} style={{
                        animation: `libCardEnter 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${0.1 + i * 0.06}s both`,
                      }}>
                        <LibraryRoomCard
                          room={room}
                          memCount={mems.length}
                          thumbUrl={thumbMem?.dataUrl || null}
                          accent={currentWing.accent}
                          onClick={() => {
                            setSelectedRoom(room.id);
                            fetchRoomMemories(room.id);
                          }}
                          onAdd={() => setShowUploadFor({ wingId: selectedWing, roomId: room.id })}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <LibraryEmptyState
                  type="wing"
                  accent={currentWing.accent}
                />
              )}
            </div>
          )}

          {/* Memory grid (when room selected) */}
          {selectedRoom && !crossWingResults && (
            <div style={{ animation: "libSlideRight 0.35s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              {filteredRoomMems.length > 0 ? (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(15rem, 1fr))",
                  gap: "1.25rem",
                }}>
                  {filteredRoomMems.map((mem, i) => (
                    <div key={mem.id} style={{
                      animation: `libCardEnter 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${0.03 + i * 0.03}s both`,
                    }}>
                      <LibraryMemoryCard
                        mem={mem}
                        accent={currentWing.accent}
                        onClick={() => setDetailMem({ mem, wingId: selectedWing, roomId: selectedRoom })}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <LibraryEmptyState
                  type={(!!q || !!filterType) ? "search" : "room"}
                  accent={currentWing.accent}
                  onAdd={() => setShowUploadFor({ wingId: selectedWing, roomId: selectedRoom })}
                  query={query || undefined}
                />
              )}

              {/* Gallery / 3D action buttons */}
              {getMemsForRoom(selectedRoom).length > 0 && (
                <div style={{
                  marginTop: "2.5rem", display: "flex", gap: "0.75rem",
                  animation: "libSlideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both",
                }}>
                  <button
                    onClick={() => {
                      setNavMode("3d");
                      enterCorridor(selectedWing);
                      setTimeout(() => enterRoom(selectedRoom), 600);
                    }}
                    style={{
                      padding: "0.625rem 1.375rem", borderRadius: "0.75rem",
                      background: "rgba(255, 255, 255, 0.85)",
                      backdropFilter: "blur(0.625rem)",
                      WebkitBackdropFilter: "blur(0.625rem)",
                      border: `0.0625rem solid ${T.color.cream}`,
                      cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem",
                      fontWeight: 500, letterSpacing: "0.015em",
                      color: T.color.walnut, display: "flex", alignItems: "center", gap: "0.5rem",
                      transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                      boxShadow: "0 0.0625rem 0.25rem rgba(44,44,42,0.04)",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = T.color.white;
                      e.currentTarget.style.borderColor = `${currentWing.accent}44`;
                      e.currentTarget.style.transform = "translateY(-0.125rem)";
                      e.currentTarget.style.boxShadow = `0 0.375rem 1rem rgba(44,44,42,0.08)`;
                      e.currentTarget.style.color = T.color.charcoal;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.85)";
                      e.currentTarget.style.borderColor = T.color.cream;
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "0 0.0625rem 0.25rem rgba(44,44,42,0.04)";
                      e.currentTarget.style.color = T.color.walnut;
                    }}
                  >
                    <span style={{ fontSize: "0.9375rem", lineHeight: 1 }}>{"\u{1F5BC}\uFE0F"}</span>
                    {t("openGallery")}
                  </button>
                  <button
                    onClick={() => {
                      setNavMode("3d");
                      enterCorridor(selectedWing);
                      setTimeout(() => enterRoom(selectedRoom), 600);
                    }}
                    style={{
                      padding: "0.625rem 1.375rem", borderRadius: "0.75rem",
                      background: "rgba(255, 255, 255, 0.85)",
                      backdropFilter: "blur(0.625rem)",
                      WebkitBackdropFilter: "blur(0.625rem)",
                      border: `0.0625rem solid ${T.color.cream}`,
                      cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem",
                      fontWeight: 500, letterSpacing: "0.015em",
                      color: T.color.walnut, display: "flex", alignItems: "center", gap: "0.5rem",
                      transition: "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                      boxShadow: "0 0.0625rem 0.25rem rgba(44,44,42,0.04)",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = T.color.white;
                      e.currentTarget.style.borderColor = `${currentWing.accent}44`;
                      e.currentTarget.style.transform = "translateY(-0.125rem)";
                      e.currentTarget.style.boxShadow = `0 0.375rem 1rem rgba(44,44,42,0.08)`;
                      e.currentTarget.style.color = T.color.charcoal;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.85)";
                      e.currentTarget.style.borderColor = T.color.cream;
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "0 0.0625rem 0.25rem rgba(44,44,42,0.04)";
                      e.currentTarget.style.color = T.color.walnut;
                    }}
                  >
                    <span style={{ fontSize: "0.9375rem", lineHeight: 1 }}>{"\u{1F3DB}\uFE0F"}</span>
                    {t("viewIn3D")}
                  </button>
                </div>
              )}
            </div>
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
