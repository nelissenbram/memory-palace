"use client";

import React, { useState, useCallback, useMemo, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ANIM } from "@/components/ui/TuscanStyles";
import type { VisitorWingData } from "@/lib/social/visit-actions";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import type { Mem } from "@/lib/constants/defaults";

const CorridorScene = lazy(() => import("@/components/3d/CorridorScene"));
const InteriorScene = lazy(() => import("@/components/3d/InteriorScene"));

interface VisitorPalaceProps {
  data: VisitorWingData;
}

export default function VisitorPalace({ data }: VisitorPalaceProps) {
  const router = useRouter();
  const { t } = useTranslation("social");
  const { t: tPalace } = useTranslation("palace");
  const isMobile = useIsMobile();
  const [view, setView] = useState<"corridor" | "room">("corridor");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [hoveredDoor, setHoveredDoor] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(1);

  // Transform data to 3D-compatible formats
  const wingData: Wing = useMemo(() => ({
    id: data.wing.slug,
    name: data.wing.name,
    nameKey: data.wing.slug,
    icon: "",
    accent: data.wing.accent_color,
    wall: data.wing.wall_color,
    floor: data.wing.floor_color,
    desc: "",
    descKey: "",
    layout: "L-shaped gallery",
  }), [data.wing]);

  const wingRooms: WingRoom[] = useMemo(() =>
    data.rooms.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      shared: false,
      sharedWith: [],
      coverHue: r.coverHue,
    })),
  [data.rooms]);

  const roomMemories: Record<string, Mem[]> = useMemo(() => {
    const map: Record<string, Mem[]> = {};
    for (const room of data.rooms) {
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
      }));
    }
    return map;
  }, [data.rooms]);

  const fade = useCallback((cb: () => void) => {
    setOpacity(0);
    setTimeout(() => { cb(); setOpacity(1); }, 400);
  }, []);

  const handleDoorClick = useCallback((roomId: string) => {
    fade(() => {
      setActiveRoomId(roomId);
      setView("room");
    });
  }, [fade]);

  const handleBack = useCallback(() => {
    if (view === "room") {
      fade(() => {
        setActiveRoomId(null);
        setView("corridor");
      });
    } else {
      router.push(`/visit/${data.owner.id}/${data.wing.slug}`);
    }
  }, [view, fade, router, data.owner.id, data.wing.slug]);

  const currentMems = activeRoomId ? (roomMemories[activeRoomId] || []) : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#1a1510",
        overflow: "hidden",
      }}
    >
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
        {view === "corridor" && (
          <Suspense fallback={null}>
            <CorridorScene
              wingId={data.wing.slug}
              rooms={wingRooms}
              onDoorHover={setHoveredDoor}
              onDoorClick={handleDoorClick}
              hoveredDoor={hoveredDoor}
              wingData={wingData}
              corridorPaintings={{}}
              styleEra={data.owner.styleEra || "roman"}
              isMobile={isMobile}
            />
          </Suspense>
        )}
        {view === "room" && activeRoomId && (
          <Suspense fallback={null}>
            <InteriorScene
              roomId={data.wing.slug}
              actualRoomId={activeRoomId}
              memories={currentMems}
              onMemoryClick={() => {}}
              wingData={wingData}
              styleEra={data.owner.styleEra || "roman"}
              isMobile={isMobile}
            />
          </Suspense>
        )}
      </div>

      {/* Visitor overlay UI */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: isMobile ? "0.75rem" : "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        {/* Back button */}
        <button
          onClick={handleBack}
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 0.875rem",
            borderRadius: "2rem",
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(0.5rem)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.25)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {view === "room" ? t("backToWing", { name: data.wing.name }) : t("exploreBackToExplore")}
        </button>

        {/* Current location */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? "0.875rem" : "1rem",
            fontWeight: 600,
            color: "rgba(255,255,255,0.9)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {view === "room" && activeRoomId
              ? data.rooms.find((r) => r.id === activeRoomId)?.name || ""
              : data.wing.name}
          </div>
          <div style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.6)",
          }}>
            {data.owner.name || t("anonymous")} &middot; {t("visitorMode")}
          </div>
        </div>
      </div>

      {/* Door hover tooltip */}
      {view === "corridor" && hoveredDoor && (
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
          {wingRooms.find((r) => r.id === hoveredDoor)?.icon}{" "}
          {wingRooms.find((r) => r.id === hoveredDoor)?.name}
        </div>
      )}
    </div>
  );
}
