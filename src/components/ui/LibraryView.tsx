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
import WingManagerPanel from "@/components/ui/WingManagerPanel";
import RoomManagerPanel from "@/components/ui/RoomManagerPanel";
import { WingIcon, RoomIcon } from "./WingRoomIcons";

export default function LibraryView() {
  const isMobile = useIsMobile();
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { getWings, getWingRooms } = useRoomStore();
  const { userMems, fetchRoomMemories } = useMemoryStore();
  const { setNavMode, enterCorridor, enterRoom, activeWing: storeActiveWing } = usePalaceStore();

  const { addMemory, updateMemory, deleteMemory, moveMemory } = useMemoryStore();

  const wings = getWings();
  const [selectedWing, setSelectedWing] = useState<string>(wings[0]?.id || "family");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [detailMem, setDetailMem] = useState<{ mem: Mem; wingId: string; roomId: string } | null>(null);
  const [showUploadFor, setShowUploadFor] = useState<{ wingId: string; roomId: string } | null>(null);
  const [movingMem, setMovingMem] = useState<{ mem: Mem; fromRoom: string } | null>(null);
  const [expandedMoveWing, setExpandedMoveWing] = useState<string | null>(null);
  const [movedToast, setMovedToast] = useState(false);
  const [showWingManager, setShowWingManager] = useState(false);
  const [showRoomManager, setShowRoomManager] = useState(false);
  const [cloudImportDismissed, setCloudImportDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cloudImportDismissed") === "true";
    }
    return false;
  });
  const [cloudImportExpanded, setCloudImportExpanded] = useState(false);

  const dismissCloudImport = useCallback(() => {
    setCloudImportDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("cloudImportDismissed", "true");
    }
  }, []);

  const handleAiSort = useCallback(() => {
    alert(t("aiSortTitle") + " — " + t("comingSoon"));
  }, [t]);

  const handleCloudProvider = useCallback((provider: string) => {
    alert(`${provider} — ${t("comingSoon")}`);
  }, [t]);

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
        if (movingMem) setMovingMem(null);
        else if (detailMem) setDetailMem(null);
        else if (showUploadFor) setShowUploadFor(null);
        else if (selectedRoom) handleBackToRooms();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [movingMem, detailMem, showUploadFor, selectedRoom]);

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

  const handleMoveToRoom = useCallback((targetRoomId: string) => {
    if (!movingMem) return;
    moveMemory(movingMem.fromRoom, targetRoomId, movingMem.mem.id);
    setMovingMem(null);
    setExpandedMoveWing(null);
    setMovedToast(true);
    setTimeout(() => setMovedToast(false), 2200);
  }, [movingMem, moveMemory]);

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
        onAddWing={() => setShowWingManager(true)}
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
              wingId={currentWing.id}
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

          {/* ═══ CLOUD IMPORT BAR ═══ */}
          {!cloudImportDismissed && (
            <div style={{
              marginBottom: "1.25rem",
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(0.75rem)",
              WebkitBackdropFilter: "blur(0.75rem)",
              borderRadius: "0.75rem",
              border: `0.0625rem solid ${T.color.cream}`,
              overflow: "hidden",
              animation: "libFadeIn 0.35s ease both",
              boxShadow: "0 0.0625rem 0.375rem rgba(44,44,42,0.05)",
            }}>
              {/* Collapsed header */}
              <div
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: isMobile ? "0.625rem 0.75rem" : "0.625rem 1.25rem",
                  cursor: "pointer",
                  gap: "0.75rem",
                }}
                onClick={() => setCloudImportExpanded(prev => !prev)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "1rem", lineHeight: 1, flexShrink: 0, opacity: 0.7 }}>{"\u2601\uFE0F"}</span>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600,
                    color: T.color.charcoal, letterSpacing: "0.02em",
                  }}>
                    {t("cloudImport")}
                  </span>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {t("cloudImportDesc")}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                  <span style={{
                    fontSize: "0.75rem", color: T.color.muted, transition: "transform 0.25s ease",
                    transform: cloudImportExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    display: "inline-block",
                  }}>
                    {"\u25BC"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); dismissCloudImport(); }}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: "0.875rem", color: T.color.muted, padding: "0.125rem 0.25rem",
                      lineHeight: 1, borderRadius: "0.25rem",
                    }}
                    aria-label="Dismiss"
                  >
                    {"\u2715"}
                  </button>
                </div>
              </div>

              {/* Expanded provider buttons */}
              {cloudImportExpanded && (
                <div style={{
                  padding: isMobile ? "0 0.75rem 0.75rem" : "0 1.25rem 1rem",
                  display: "flex", flexWrap: "wrap", gap: "0.625rem",
                  animation: "libFadeIn 0.2s ease both",
                }}>
                  {([
                    { key: "googlePhotos", icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 7.5V1.5A4.5 4.5 0 007.5 6v1.5H12z" fill="#EA4335"/><path d="M16.5 12H22.5A4.5 4.5 0 0018 7.5H16.5V12z" fill="#4285F4"/><path d="M12 16.5V22.5A4.5 4.5 0 0016.5 18V16.5H12z" fill="#34A853"/><path d="M7.5 12H1.5A4.5 4.5 0 006 16.5H7.5V12z" fill="#FBBC05"/></svg>
                    )},
                    { key: "applePhotos", icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#999" strokeWidth="1.5" fill="none"/><circle cx="12" cy="10" r="3.5" fill="#999"/><path d="M12 14.5c-4 0-6 2-6 4h12c0-2-2-4-6-4z" fill="#999"/></svg>
                    )},
                    { key: "dropbox", icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L6 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4z" fill="#0061FE"/><path d="M6 6l6 4-6 4" fill="#0061FE" opacity="0.7"/><path d="M18 6l-6 4 6 4" fill="#0061FE" opacity="0.7"/></svg>
                    )},
                    { key: "onedrive", icon: (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 17h10a4 4 0 000-8 5 5 0 00-9.5-1A4 4 0 005 12.5 3.5 3.5 0 005 19" stroke="#0078D4" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>
                    )},
                  ] as { key: string; icon: React.ReactNode }[]).map(({ key, icon }) => (
                    <button
                      key={key}
                      onClick={() => handleCloudProvider(t(key as any))}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.5rem",
                        padding: "0.5rem 1rem", borderRadius: "0.625rem",
                        background: T.color.linen,
                        border: `0.0625rem solid ${T.color.cream}`,
                        cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem",
                        fontWeight: 500, color: T.color.walnut,
                        transition: "all 0.25s ease",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = T.color.white;
                        e.currentTarget.style.borderColor = `${T.color.walnut}33`;
                        e.currentTarget.style.transform = "translateY(-0.0625rem)";
                        e.currentTarget.style.boxShadow = "0 0.25rem 0.75rem rgba(44,44,42,0.08)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = T.color.linen;
                        e.currentTarget.style.borderColor = T.color.cream;
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {icon}
                      {t(key as any)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
                      onMove={(m) => setMovingMem({ mem: m, fromRoom: room.id })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI SMART SORT BAR - Attic wing only */}
          {!selectedRoom && !crossWingResults && selectedWing === "attic" && allWingMems.length > 0 && (
            <div style={{
              marginBottom: "1.5rem",
              padding: isMobile ? "1rem" : "1.125rem 1.5rem",
              background: "linear-gradient(135deg, rgba(193,127,89,0.08) 0%, rgba(212,175,55,0.06) 100%)",
              borderRadius: "0.75rem",
              border: `0.0625rem solid ${T.color.terracotta}22`,
              display: "flex", flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "center",
              gap: isMobile ? "0.75rem" : "1.25rem",
              animation: "libFadeIn 0.4s ease both",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "1rem", fontWeight: 700,
                    color: T.color.charcoal, letterSpacing: "0.02em",
                  }}>
                    {t("aiSortTitle")}
                  </span>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                    color: T.color.terracotta, background: `${T.color.terracotta}15`,
                    padding: "0.125rem 0.5rem", borderRadius: "1rem",
                    letterSpacing: "0.03em",
                  }}>
                    {t("unsortedCount", { count: String(allWingMems.length) })}
                  </span>
                </div>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
                  margin: 0, lineHeight: 1.45,
                }}>
                  {t("aiSortDesc")}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.625rem", flexShrink: 0, alignItems: "center" }}>
                <button
                  onClick={handleAiSort}
                  style={{
                    padding: "0.5rem 1.25rem", borderRadius: "0.625rem",
                    background: `linear-gradient(135deg, ${T.color.terracotta}, #D4925F)`,
                    color: T.color.white, border: "none", cursor: "pointer",
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                    letterSpacing: "0.03em", whiteSpace: "nowrap",
                    boxShadow: "0 0.125rem 0.5rem rgba(193,127,89,0.25)",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-0.0625rem)";
                    e.currentTarget.style.boxShadow = "0 0.25rem 0.75rem rgba(193,127,89,0.35)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 0.125rem 0.5rem rgba(193,127,89,0.25)";
                  }}
                >
                  {t("aiSortButton")}
                </button>
                <button
                  onClick={() => {/* manual sort - noop for now */}}
                  style={{
                    padding: "0.5rem 1rem", borderRadius: "0.625rem",
                    background: "rgba(255,255,255,0.7)",
                    border: `0.0625rem solid ${T.color.cream}`,
                    cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem",
                    fontWeight: 500, color: T.color.walnut, whiteSpace: "nowrap",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = T.color.white;
                    e.currentTarget.style.borderColor = `${T.color.walnut}33`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.7)";
                    e.currentTarget.style.borderColor = T.color.cream;
                  }}
                >
                  {t("aiSortManual")}
                </button>
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

                  {/* + Add Room card */}
                  <div
                    style={{
                      animation: `libCardEnter 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${0.1 + wingRooms.length * 0.06}s both`,
                    }}
                  >
                    <button
                      onClick={() => setShowRoomManager(true)}
                      style={{
                        width: "100%",
                        minHeight: "10rem",
                        borderRadius: "0.75rem",
                        border: `0.125rem dashed ${T.color.cream}`,
                        background: "rgba(255,255,255,0.35)",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        transition: "all 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                        padding: "1.5rem",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = currentWing.accent;
                        e.currentTarget.style.background = "rgba(255,255,255,0.6)";
                        e.currentTarget.style.transform = "translateY(-0.125rem)";
                        e.currentTarget.style.boxShadow = "0 0.25rem 1rem rgba(44,44,42,0.06)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = T.color.cream;
                        e.currentTarget.style.background = "rgba(255,255,255,0.35)";
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <span style={{
                        fontSize: "1.5rem",
                        lineHeight: 1,
                        color: T.color.muted,
                        fontWeight: 300,
                      }}>
                        +
                      </span>
                      <span style={{
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        color: T.color.muted,
                        letterSpacing: "0.02em",
                      }}>
                        {t("addRoomLabel")}
                      </span>
                    </button>
                  </div>
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
                        onMove={(m) => setMovingMem({ mem: m, fromRoom: selectedRoom! })}
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

      {/* Wing manager overlay */}
      {showWingManager && (
        <WingManagerPanel onClose={() => setShowWingManager(false)} />
      )}

      {/* Room manager overlay */}
      {showRoomManager && currentWing && (
        <RoomManagerPanel
          wing={currentWing}
          onClose={() => setShowRoomManager(false)}
          onEnterRoom={(roomId: string) => {
            setShowRoomManager(false);
            setSelectedRoom(roomId);
            fetchRoomMemories(roomId);
          }}
        />
      )}

      {/* ═══ MOVE TO ROOM MODAL ═══ */}
      {movingMem && (
        <div
          onClick={() => { setMovingMem(null); setExpandedMoveWing(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(44,44,42,.35)",
            backdropFilter: "blur(0.75rem)",
            WebkitBackdropFilter: "blur(0.75rem)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "libFadeIn 0.2s ease both",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,.96)",
              backdropFilter: "blur(1.5rem) saturate(1.4)",
              WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
              borderRadius: "1.25rem",
              boxShadow: "0 1.5rem 3rem rgba(44,44,42,.18), 0 0.5rem 1.25rem rgba(44,44,42,.08), inset 0 0.0625rem 0 rgba(255,255,255,.7)",
              border: `0.0625rem solid ${T.color.cream}`,
              width: "min(26rem, 90vw)",
              maxHeight: "min(32rem, 80vh)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "1.25rem 1.5rem 1rem",
              borderBottom: `0.0625rem solid ${T.color.cream}`,
              flexShrink: 0,
            }}>
              <h3 style={{
                fontFamily: T.font.display, fontSize: "1.125rem",
                fontWeight: 600, color: T.color.charcoal,
                margin: 0, letterSpacing: "0.01em",
              }}>
                {t("moveTo")}
              </h3>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.75rem",
                color: T.color.muted, margin: "0.25rem 0 0",
                letterSpacing: "0.02em",
              }}>
                {t("selectRoom")} — <strong>{movingMem.mem.title}</strong>
              </p>
            </div>

            {/* Wing/Room list */}
            <div style={{
              flex: 1, overflow: "auto",
              padding: "0.75rem 0",
            }}>
              {wings.map(wing => {
                const wRooms = getWingRooms(wing.id);
                const isExpanded = expandedMoveWing === wing.id;
                return (
                  <div key={wing.id}>
                    {/* Wing row */}
                    <button
                      onClick={() => setExpandedMoveWing(isExpanded ? null : wing.id)}
                      style={{
                        width: "100%",
                        padding: "0.625rem 1.5rem",
                        background: isExpanded ? `${wing.accent}0A` : "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        fontFamily: T.font.body,
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: T.color.charcoal,
                        letterSpacing: "0.01em",
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "rgba(44,44,42,.03)"; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = isExpanded ? `${wing.accent}0A` : "transparent"; }}
                    >
                      <WingIcon wingId={wing.id} size={18} color={wing.accent} />
                      <span style={{ flex: 1, textAlign: "left" }}>{wing.name}</span>
                      <span style={{
                        fontSize: "0.6875rem", color: T.color.muted,
                        fontWeight: 400,
                      }}>
                        {wRooms.length}
                      </span>
                      <svg
                        width="12" height="12" viewBox="0 0 12 12"
                        fill="none" stroke={T.color.muted} strokeWidth="1.5" strokeLinecap="round"
                        style={{
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                          flexShrink: 0,
                        }}
                      >
                        <path d="M4 2l4 4-4 4" />
                      </svg>
                    </button>

                    {/* Rooms (expanded) */}
                    {isExpanded && wRooms.map(room => {
                      const isCurrent = room.id === movingMem.fromRoom;
                      return (
                        <button
                          key={room.id}
                          onClick={() => { if (!isCurrent) handleMoveToRoom(room.id); }}
                          disabled={isCurrent}
                          style={{
                            width: "100%",
                            padding: "0.5rem 1.5rem 0.5rem 3.25rem",
                            background: isCurrent ? `${wing.accent}08` : "transparent",
                            border: "none",
                            cursor: isCurrent ? "default" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontFamily: T.font.body,
                            fontSize: "0.8125rem",
                            fontWeight: 400,
                            color: isCurrent ? T.color.muted : T.color.walnut,
                            letterSpacing: "0.01em",
                            opacity: isCurrent ? 0.6 : 1,
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = `${wing.accent}12`; }}
                          onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = isCurrent ? `${wing.accent}08` : "transparent"; }}
                        >
                          <RoomIcon roomId={room.id} size={15} color={wing.accent} />
                          <span style={{ flex: 1, textAlign: "left" }}>{room.name}</span>
                          {isCurrent && (
                            <span style={{
                              fontSize: "0.625rem",
                              fontWeight: 500,
                              color: wing.accent,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase" as const,
                            }}>
                              {t("currentRoom")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer / Cancel */}
            <div style={{
              padding: "0.75rem 1.5rem",
              borderTop: `0.0625rem solid ${T.color.cream}`,
              display: "flex", justifyContent: "flex-end",
              flexShrink: 0,
            }}>
              <button
                onClick={() => { setMovingMem(null); setExpandedMoveWing(null); }}
                style={{
                  padding: "0.4375rem 1rem",
                  borderRadius: "0.5rem",
                  background: "rgba(44,44,42,.06)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: T.color.walnut,
                  letterSpacing: "0.01em",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(44,44,42,.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(44,44,42,.06)"}
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MOVED TOAST ═══ */}
      {movedToast && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          background: "rgba(44,44,42,.88)",
          backdropFilter: "blur(0.75rem)",
          WebkitBackdropFilter: "blur(0.75rem)",
          color: T.color.linen,
          padding: "0.625rem 1.25rem",
          borderRadius: "0.75rem",
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          fontWeight: 500,
          letterSpacing: "0.02em",
          boxShadow: "0 0.5rem 1.5rem rgba(44,44,42,.2)",
          animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}>
          {t("moved")}
        </div>
      )}
    </div>
  );
}
