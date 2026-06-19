"use client";

import React, { useState, useCallback, useMemo, lazy, Suspense } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ANIM } from "@/components/ui/TuscanStyles";
import PalaceLoadingScreen from "@/components/ui/PalaceLoadingScreen";
import MobileJoystick from "@/components/ui/MobileJoystick";
import PalaceSubNav from "@/components/ui/PalaceSubNav";
import type { PalacePending } from "@/components/ui/PalaceSubNav";
import type { VisitorPalaceData, VisitorWingData } from "@/lib/social/visit-actions";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import type { Mem } from "@/lib/constants/defaults";

const ExteriorScene = lazy(() => import("@/components/3d/ExteriorScene"));
const EntranceHallScene = lazy(() => import("@/components/3d/EntranceHallScene"));
const CorridorScene = lazy(() => import("@/components/3d/CorridorScene"));
const InteriorScene = lazy(() => import("@/components/3d/InteriorScene"));

type View = "exterior" | "entrance" | "corridor" | "room";

interface VisitorPalaceWalkProps {
  data: VisitorPalaceData;
}

export default function VisitorPalaceWalk({ data }: VisitorPalaceWalkProps) {
  const { t } = useTranslation("social");
  const { t: tPalace } = useTranslation("palace");
  const { t: tCommon } = useTranslation("common");
  const isMobile = useIsMobile();
  const [view, setView] = useState<View>("exterior");
  const [activeWingSlug, setActiveWingSlug] = useState<string | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [hoveredWing, setHoveredWing] = useState<string | null>(null);
  const [hoveredDoor, setHoveredDoor] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(1);
  const [sceneLoading, setSceneLoading] = useState(false);
  const [pending, setPending] = useState<PalacePending>(null);
  const [showGuestbook, setShowGuestbook] = useState(false);

  // Build Wing[] array for ExteriorScene and EntranceHallScene (only published wings)
  const publishedWings: Wing[] = useMemo(() =>
    data.wings.map((wd) => ({
      id: wd.wing.slug,
      name: wd.wing.name,
      nameKey: wd.wing.slug,
      icon: "",
      accent: wd.wing.accent_color,
      wall: wd.wing.wall_color,
      floor: wd.wing.floor_color,
      desc: "",
      descKey: "",
      layout: "L-shaped gallery",
    })),
  [data.wings]);

  // WingItem[] for PalaceSubNav
  const navWings = useMemo(() =>
    data.wings.map((wd) => ({
      id: wd.wing.slug,
      name: wd.wing.name,
      nameKey: wd.wing.slug,
      icon: "",
      accent: wd.wing.accent_color,
    })),
  [data.wings]);

  // wingRooms map for PalaceSubNav: Record<wingSlug, RoomItem[]>
  const navWingRooms = useMemo(() => {
    const map: Record<string, { id: string; name: string; nameKey?: string; icon: string }[]> = {};
    for (const wd of data.wings) {
      map[wd.wing.slug] = wd.rooms.map((r) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
      }));
    }
    return map;
  }, [data.wings]);

  // Active wing data (full VisitorWingData for current wing)
  const activeWingData: VisitorWingData | null = useMemo(() => {
    if (!activeWingSlug) return null;
    return data.wings.find((w) => w.wing.slug === activeWingSlug) || null;
  }, [data.wings, activeWingSlug]);

  // Wing data for 3D scene
  const wingData: Wing | undefined = useMemo(() => {
    if (!activeWingData) return undefined;
    return {
      id: activeWingData.wing.slug,
      name: activeWingData.wing.name,
      nameKey: activeWingData.wing.slug,
      icon: "",
      accent: activeWingData.wing.accent_color,
      wall: activeWingData.wing.wall_color,
      floor: activeWingData.wing.floor_color,
      desc: "",
      descKey: "",
      layout: "L-shaped gallery",
    };
  }, [activeWingData]);

  // Room list for corridor
  const corridorRooms: WingRoom[] = useMemo(() => {
    if (!activeWingData) return [];
    return activeWingData.rooms.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      shared: false,
      sharedWith: [],
      coverHue: r.coverHue,
    }));
  }, [activeWingData]);

  // Memories grouped by room
  const roomMemories: Record<string, Mem[]> = useMemo(() => {
    if (!activeWingData) return {};
    const map: Record<string, Mem[]> = {};
    for (const room of activeWingData.rooms) {
      map[room.id] = room.memories.map((m) => ({
        id: m.id,
        title: m.title,
        hue: m.hue,
        s: m.s,
        l: m.l,
        type: m.type,
        desc: m.desc || undefined,
        dataUrl: m.dataUrl,
        thumbnailUrl: m.thumbnailUrl,
        displayed: m.displayed,
        displayUnit: m.displayUnit,
      }));
    }
    return map;
  }, [activeWingData]);

  const fade = useCallback((cb: () => void) => {
    setSceneLoading(true);
    setOpacity(0);
    setTimeout(() => {
      cb();
      setOpacity(1);
      setTimeout(() => setSceneLoading(false), 600);
    }, 400);
  }, []);

  // --- Navigation handlers ---

  const navigateTo = useCallback((target: View, wingSlug?: string | null, roomId?: string | null) => {
    fade(() => {
      if (target === "exterior" || target === "entrance") {
        setActiveWingSlug(null);
        setActiveRoomId(null);
      } else if (target === "corridor") {
        if (wingSlug) setActiveWingSlug(wingSlug);
        setActiveRoomId(null);
      } else if (target === "room") {
        if (wingSlug) setActiveWingSlug(wingSlug);
        if (roomId) setActiveRoomId(roomId);
      }
      setView(target);
    });
  }, [fade]);

  const handleExteriorClick = useCallback((wingId: string) => {
    if (wingId === "__entrance__") {
      navigateTo("entrance");
    }
  }, [navigateTo]);

  const handleEntranceDoorClick = useCallback((wingId: string) => {
    if (wingId === "__exterior__") {
      navigateTo("exterior");
      return;
    }
    if (wingId.startsWith("locked") || wingId === "attic") return;
    const found = data.wings.find((w) => w.wing.slug === wingId);
    if (!found) return;
    navigateTo("corridor", wingId);
  }, [navigateTo, data.wings]);

  const handleCorridorDoorClick = useCallback((roomId: string) => {
    if (roomId === "__portal__") {
      window.location.href = "/explore";
      return;
    }
    navigateTo("room", activeWingSlug, roomId);
  }, [navigateTo, activeWingSlug]);

  // PalaceSubNav callbacks
  const handleExitToPalace = useCallback(() => navigateTo("exterior"), [navigateTo]);
  const handleEntranceHall = useCallback(() => navigateTo("entrance"), [navigateTo]);
  const handleSwitchWing = useCallback((wingId: string) => navigateTo("corridor", wingId), [navigateTo]);
  const handleNavigateRoom = useCallback((wingId: string, roomId: string) => navigateTo("room", wingId, roomId), [navigateTo]);

  const currentMems = activeRoomId ? (roomMemories[activeRoomId] || []) : [];

  // Guestbook target — general, wing-specific, or room-specific
  const guestbookTarget = useMemo(() => {
    if (view === "room" && activeRoomId) {
      const roomName = activeWingData?.rooms.find((r) => r.id === activeRoomId)?.name || "";
      return { type: "room" as const, id: activeRoomId, name: roomName };
    }
    if ((view === "corridor") && activeWingData) {
      return { type: "wing" as const, id: activeWingData.wing.id, name: activeWingData.wing.name };
    }
    return { type: "palace" as const, id: data.owner.id, name: data.owner.name || "" };
  }, [view, activeRoomId, activeWingData, data.owner]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#1a1510",
        overflow: "hidden",
      }}
    >
      {/* Loading screen during transitions */}
      {sceneLoading && <PalaceLoadingScreen overlay fadeDelay={0.2} />}

      {/* 3D Scene */}
      <div
        role="application"
        aria-label={tPalace("sceneAriaLabel")}
        style={{
          position: "absolute",
          inset: 0,
          opacity,
          transition: "opacity 0.4s ease",
          touchAction: "none",
        }}
      >
        {view === "exterior" && (
          <Suspense fallback={<PalaceLoadingScreen />}>
            <ExteriorScene
              onRoomHover={setHoveredWing}
              onRoomClick={handleExteriorClick}
              hoveredRoom={hoveredWing}
              wings={publishedWings}
              styleEra={data.owner.styleEra || "roman"}
            />
          </Suspense>
        )}
        {view === "entrance" && (
          <Suspense fallback={<PalaceLoadingScreen />}>
            <EntranceHallScene
              onDoorClick={handleEntranceDoorClick}
              wings={publishedWings}
              styleEra={data.owner.styleEra || "roman"}
            />
          </Suspense>
        )}
        {view === "corridor" && activeWingSlug && wingData && (
          <Suspense fallback={<PalaceLoadingScreen />}>
            <CorridorScene
              wingId={activeWingSlug}
              rooms={corridorRooms}
              onDoorHover={setHoveredDoor}
              onDoorClick={handleCorridorDoorClick}
              hoveredDoor={hoveredDoor}
              wingData={wingData}
              corridorPaintings={{}}
              styleEra={data.owner.styleEra || "roman"}
              isMobile={isMobile}
            />
          </Suspense>
        )}
        {view === "room" && activeRoomId && activeWingSlug && (
          <Suspense fallback={<PalaceLoadingScreen />}>
            <InteriorScene
              roomId={activeWingSlug}
              actualRoomId={activeRoomId}
              memories={currentMems}
              onMemoryClick={(mem: unknown) => {
                if (mem === "__back__") navigateTo("corridor", activeWingSlug);
              }}
              wingData={wingData}
              styleEra={data.owner.styleEra || "roman"}
              isMobile={isMobile}
            />
          </Suspense>
        )}
      </div>

      {/* PalaceSubNav — same as own palace but visitor-colored */}
      <PalaceSubNav
        view={view}
        wingName={activeWingData?.wing.name}
        wingAccent={activeWingData?.wing.accent_color}
        wingIcon=""
        roomName={activeRoomId ? (activeWingData?.rooms.find((r) => r.id === activeRoomId)?.name) : undefined}
        roomId={activeRoomId || undefined}
        roomIcon={activeRoomId ? (activeWingData?.rooms.find((r) => r.id === activeRoomId)?.icon) : undefined}
        wings={navWings}
        wingRooms={navWingRooms}
        isMobile={isMobile}
        pending={pending}
        onPendingChange={setPending}
        onExitToPalace={handleExitToPalace}
        onEntranceHall={handleEntranceHall}
        onSwitchWing={handleSwitchWing}
        onNavigateRoom={handleNavigateRoom}
        onUpload={() => {}}
        onGallery={() => {}}
        onWingManager={() => {}}
        onRoomManager={() => {}}
        onCorridorGallery={() => {}}
        onMassImport={() => {}}
        onShare={() => {}}
        onSharingSettings={() => {}}
        onBack={() => { window.location.href = "/explore"; }}
      />

      {/* "Back To Your Palace" button — always visible */}
      <button
        onClick={() => { window.location.href = "/explore"; }}
        style={{
          position: "fixed",
          bottom: isMobile ? "5.5rem" : "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.625rem 1.25rem",
          borderRadius: "2rem",
          background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
          border: `1px solid ${T.color.gold}55`,
          color: T.color.cream,
          fontFamily: T.font.display,
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: `0 0.25rem 1rem rgba(0,0,0,0.3), 0 0 0 1px ${T.color.gold}22`,
          transition: "all 0.2s ease",
          zIndex: 44,
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateX(-50%) scale(1.04)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateX(-50%)"; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        {tCommon("backToPalace")}
      </button>

      {/* Guestbook / Leave a message button */}
      <button
        onClick={() => setShowGuestbook(true)}
        style={{
          position: "fixed",
          bottom: isMobile ? "5.5rem" : "1.5rem",
          right: isMobile ? "1rem" : "1.5rem",
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          padding: isMobile ? "0.625rem" : "0.625rem 1rem",
          borderRadius: isMobile ? "50%" : "2rem",
          background: `${T.color.linen}ee`,
          backdropFilter: "blur(0.5rem)",
          border: `1px solid ${T.color.gold}55`,
          color: T.color.walnut,
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          fontWeight: 500,
          cursor: "pointer",
          boxShadow: `0 0.125rem 0.75rem rgba(0,0,0,0.15)`,
          transition: "all 0.2s ease",
          zIndex: 44,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.color.gold; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${T.color.gold}55`; }}
        title={t("guestbook")}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        {!isMobile && t("guestbook")}
      </button>

      {/* Guestbook panel */}
      {showGuestbook && (
        <GuestbookPanel
          target={guestbookTarget}
          ownerName={data.owner.name || t("anonymous")}
          onClose={() => setShowGuestbook(false)}
          isMobile={isMobile}
        />
      )}

      {/* Door hover tooltip — entrance hall wings */}
      {view === "entrance" && hoveredWing && (
        <HoverTooltip isMobile={isMobile}>
          {publishedWings.find((w) => w.id === hoveredWing)?.name || hoveredWing}
        </HoverTooltip>
      )}

      {/* Door hover tooltip — corridor rooms */}
      {view === "corridor" && hoveredDoor && (
        <HoverTooltip isMobile={isMobile}>
          {corridorRooms.find((r) => r.id === hoveredDoor)?.icon}{" "}
          {corridorRooms.find((r) => r.id === hoveredDoor)?.name}
        </HoverTooltip>
      )}

      {/* Visitor mode label */}
      <div style={{
        position: "fixed",
        top: isMobile ? "calc(env(safe-area-inset-top, 0px) + 0.5rem)" : "0.75rem",
        right: isMobile ? "0.75rem" : "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.375rem 0.75rem",
        borderRadius: "2rem",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(0.5rem)",
        border: "1px solid rgba(255,255,255,0.15)",
        color: "rgba(255,255,255,0.8)",
        fontFamily: T.font.body,
        fontSize: "0.6875rem",
        fontWeight: 500,
        zIndex: 45,
        pointerEvents: "none",
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {data.owner.name || t("anonymous")} &middot; {t("visitorMode")}
      </div>

      {/* Mobile joystick */}
      {isMobile && (
        <MobileJoystick
          visible={true}
          onMove={() => {}}
        />
      )}
    </div>
  );
}

// --- Sub-components ---

function HoverTooltip({ children, isMobile }: { children: React.ReactNode; isMobile: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: isMobile ? "5rem" : "2rem",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "0.625rem 1.25rem",
        borderRadius: "2rem",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(0.5rem)",
        border: "1px solid rgba(255,255,255,0.15)",
        color: "#fff",
        fontFamily: T.font.display,
        fontSize: "0.9375rem",
        fontWeight: 500,
        textAlign: "center",
        zIndex: 10,
        pointerEvents: "none",
        animation: `${ANIM.tuscanFadeSlideUp} 0.3s ease both`,
      }}
    >
      {children}
    </div>
  );
}

// --- Guestbook Panel ---

interface GuestbookTarget {
  type: "palace" | "wing" | "room";
  id: string;
  name: string;
}

function GuestbookPanel({ target, ownerName, onClose, isMobile }: {
  target: GuestbookTarget;
  ownerName: string;
  onClose: () => void;
  isMobile: boolean;
}) {
  const { t } = useTranslation("social");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [comments, setComments] = useState<{ id: string; user_name: string | null; body: string; created_at: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load comments on mount
  React.useEffect(() => {
    (async () => {
      try {
        const { getComments } = await import("@/lib/social/comment-actions");
        const result = await getComments(target.type, target.id);
        setComments(result.map((c) => ({
          id: c.id,
          user_name: c.user_name,
          body: c.body,
          created_at: c.created_at,
        })));
      } catch {
        // Comments may not load for unauthenticated users
      }
      setLoaded(true);
    })();
  }, [target.type, target.id]);

  const handleSend = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const { addComment } = await import("@/lib/social/comment-actions");
      const result = await addComment({
        targetType: target.type,
        targetId: target.id,
        body: body.trim(),
      });
      if (result.ok && result.comment) {
        setComments((prev) => [...prev, {
          id: result.comment!.id,
          user_name: result.comment!.user_name,
          body: result.comment!.body,
          created_at: result.comment!.created_at,
        }]);
        setBody("");
        setSent(true);
        setTimeout(() => setSent(false), 2000);
      } else {
        setError(result.error || "Failed");
      }
    } catch {
      setError("Failed to send");
    }
    setSending(false);
  };

  const title = target.type === "wing"
    ? t("wingGuestbook", { name: target.name })
    : target.type === "room"
      ? t("roomGuestbook", { name: target.name })
      : t("palaceGuestbook");

  const hint = target.type === "wing"
    ? t("wingGuestbookHint")
    : target.type === "room"
      ? t("roomGuestbookHint")
      : t("palaceGuestbookHint");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: isMobile ? "flex-end" : "center",
        justifyContent: "center",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(0.25rem)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          width: isMobile ? "100%" : "28rem",
          maxHeight: isMobile ? "80vh" : "70vh",
          background: T.color.linen,
          borderRadius: isMobile ? "1.25rem 1.25rem 0 0" : "1rem",
          border: `1px solid ${T.color.gold}33`,
          boxShadow: `0 0.5rem 2rem rgba(0,0,0,0.25)`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: `${ANIM.tuscanFadeSlideUp} 0.3s ease both`,
        }}
      >
        {/* Header */}
        <div style={{
          padding: "1rem 1.25rem",
          borderBottom: `1px solid ${T.color.cream}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{
              fontFamily: T.font.display,
              fontSize: "1rem",
              fontWeight: 600,
              color: T.color.charcoal,
            }}>
              {title}
            </div>
            <div style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
              marginTop: "0.125rem",
            }}>
              {hint}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              border: `1px solid ${T.color.cream}`,
              background: T.color.white,
              color: T.color.muted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages list */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.75rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.625rem",
        }}>
          {!loaded && (
            <div style={{ textAlign: "center", padding: "2rem 0", color: T.color.muted, fontSize: "0.8125rem" }}>...</div>
          )}
          {loaded && comments.length === 0 && (
            <div style={{
              textAlign: "center",
              padding: "2rem 0",
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.muted,
              fontStyle: "italic",
            }}>
              {t("guestbookEmpty")}
            </div>
          )}
          {comments.map((c) => (
            <div key={c.id} style={{
              padding: "0.625rem 0.75rem",
              borderRadius: "0.625rem",
              background: T.color.white,
              border: `1px solid ${T.color.cream}`,
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.25rem",
              }}>
                <span style={{
                  fontFamily: T.font.display,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: T.color.walnut,
                }}>
                  {c.user_name || t("anonymous")}
                </span>
                <span style={{
                  fontFamily: T.font.body,
                  fontSize: "0.625rem",
                  color: T.color.muted,
                }}>
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
              <div style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: T.color.charcoal,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}>
                {c.body}
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div style={{
          padding: "0.75rem 1.25rem",
          paddingBottom: isMobile ? "calc(0.75rem + env(safe-area-inset-bottom, 0px))" : "0.75rem",
          borderTop: `1px solid ${T.color.cream}`,
          display: "flex",
          gap: "0.5rem",
          alignItems: "flex-end",
        }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("guestbookPlaceholder")}
            rows={2}
            style={{
              flex: 1,
              padding: "0.625rem 0.75rem",
              borderRadius: "0.625rem",
              border: `1px solid ${T.color.cream}`,
              background: T.color.white,
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.charcoal,
              resize: "none",
              outline: "none",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = T.color.gold; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = T.color.cream; }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending}
            style={{
              padding: "0.625rem 1rem",
              borderRadius: "0.625rem",
              border: "none",
              background: body.trim() && !sending
                ? `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`
                : T.color.cream,
              color: body.trim() && !sending ? T.color.cream : T.color.muted,
              fontFamily: T.font.display,
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: body.trim() && !sending ? "pointer" : "not-allowed",
              transition: "all 0.15s ease",
              flexShrink: 0,
            }}
          >
            {sending ? "..." : t("guestbookSend")}
          </button>
        </div>

        {/* Status messages */}
        {sent && (
          <div style={{
            position: "absolute",
            bottom: isMobile ? "calc(5rem + env(safe-area-inset-bottom, 0px))" : "4.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "0.375rem 0.75rem",
            borderRadius: "1rem",
            background: T.color.gold,
            color: T.color.cream,
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            fontWeight: 600,
            animation: `${ANIM.tuscanFadeSlideUp} 0.3s ease both`,
          }}>
            {t("guestbookSent")}
          </div>
        )}
        {error && (
          <div style={{
            position: "absolute",
            bottom: isMobile ? "calc(5rem + env(safe-area-inset-bottom, 0px))" : "4.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "0.375rem 0.75rem",
            borderRadius: "1rem",
            background: "#c0392b",
            color: "#fff",
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            fontWeight: 600,
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
