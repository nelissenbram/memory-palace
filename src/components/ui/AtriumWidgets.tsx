"use client";

import React, { useEffect, useState, useRef } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { Mem } from "@/lib/constants/defaults";

/* ═══════════════════════════════════════════════════════════════════
   CSS keyframes (injected once)
   ═══════════════════════════════════════════════════════════════════ */

const STYLE_ID = "atrium-widgets-keyframes";

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes aw-fadeSlideUp {
      from { opacity: 0; transform: translateY(1rem); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes aw-countUp {
      from { opacity: 0; transform: scale(0.6); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes aw-barFill {
      from { width: 0; }
    }
    @keyframes aw-cardStagger {
      from { opacity: 0; transform: translateX(1rem); }
      to   { opacity: 1; transform: translateX(0); }
    }
  `;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════════════════════════════
   Shared helpers
   ═══════════════════════════════════════════════════════════════════ */

// useTranslation requires a known section; "atrium" will be added to
// the message JSON files separately. We cast to satisfy the type until then.
function useAtriumT() {
  return useTranslation("atrium" as "common");
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: T.font.display,
  fontSize: "1.125rem",
  fontWeight: 600,
  color: T.color.charcoal,
  margin: 0,
  paddingBottom: "0.375rem",
};

const goldUnderline: React.CSSProperties = {
  height: "0.125rem",
  width: "3rem",
  background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight})`,
  borderRadius: "0.125rem",
  marginBottom: "1rem",
};

const linkStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: T.color.terracotta,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  marginTop: "0.75rem",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h3 style={sectionTitleStyle}>{children}</h3>
      <div style={goldUnderline} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   1. QuickStats
   ═══════════════════════════════════════════════════════════════════ */

export interface QuickStatsProps {
  totalMemories: number;
  wingsUsed: number;
  roomsCreated: number;
  sharedRooms: number;
  isMobile: boolean;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 800;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display}</>;
}

export function QuickStats({
  totalMemories,
  wingsUsed,
  roomsCreated,
  sharedRooms,
  isMobile,
}: QuickStatsProps) {
  const { t } = useAtriumT();

  useEffect(ensureKeyframes, []);

  const cards = [
    { value: totalMemories, label: t("stat.memories") },
    { value: wingsUsed, label: t("stat.wings") },
    { value: roomsCreated, label: t("stat.rooms") },
    { value: sharedRooms, label: t("stat.shared") },
  ];

  const containerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
    gap: "0.75rem",
    animation: "aw-fadeSlideUp 0.5s ease-out both",
  };

  return (
    <div style={containerStyle}>
      {cards.map((card, i) => (
        <QuickStatCard key={i} value={card.value} label={card.label} delay={i * 0.08} />
      ))}
    </div>
  );
}

function QuickStatCard({
  value,
  label,
  delay,
}: {
  value: number;
  label: string;
  delay: number;
}) {
  const [hovered, setHovered] = useState(false);

  const style: React.CSSProperties = {
    background: "rgba(255,255,255,0.6)",
    backdropFilter: "blur(0.5rem)",
    WebkitBackdropFilter: "blur(0.5rem)",
    border: `1px solid ${T.color.cream}`,
    borderRadius: "0.75rem",
    padding: "1rem",
    textAlign: "center",
    animation: `aw-countUp 0.5s ease-out ${delay}s both`,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    transform: hovered ? "translateY(-0.125rem)" : "translateY(0)",
    boxShadow: hovered
      ? "0 0.25rem 0.75rem rgba(0,0,0,0.08)"
      : "0 0.0625rem 0.1875rem rgba(0,0,0,0.04)",
    cursor: "default",
  };

  return (
    <div
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          fontFamily: T.font.display,
          fontSize: "2rem",
          fontWeight: 600,
          color: T.color.gold,
          lineHeight: 1.1,
        }}
      >
        <AnimatedNumber value={value} />
      </div>
      <div
        style={{
          fontFamily: T.font.body,
          fontSize: "0.75rem",
          color: T.color.muted,
          marginTop: "0.25rem",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   2. TrackProgress
   ═══════════════════════════════════════════════════════════════════ */

export interface TrackProgressProps {
  tracks: {
    id: string;
    name: string;
    icon: string;
    progress: number;
    total: number;
  }[];
  onViewAll: () => void;
  isMobile: boolean;
}

export function TrackProgress({ tracks, onViewAll, isMobile }: TrackProgressProps) {
  const { t } = useAtriumT();

  useEffect(ensureKeyframes, []);

  const displayed = tracks.slice(0, 3);

  return (
    <div style={{ animation: "aw-fadeSlideUp 0.5s ease-out 0.15s both" }}>
      <SectionTitle>{t("tracks.title")}</SectionTitle>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {displayed.map((track) => (
          <TrackBar key={track.id} track={track} isMobile={isMobile} />
        ))}
      </div>

      <button style={linkStyle} onClick={onViewAll}>
        {t("tracks.viewAll")} &rarr;
      </button>
    </div>
  );
}

function TrackBar({
  track,
  isMobile,
}: {
  track: TrackProgressProps["tracks"][number];
  isMobile: boolean;
}) {
  const pct = track.total > 0 ? (track.progress / track.total) * 100 : 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "2rem 1fr 3rem" : "2rem 1fr 3.5rem",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: "1rem", textAlign: "center" }}>{track.icon}</span>
      <div>
        <div
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: T.color.charcoal,
            marginBottom: "0.25rem",
          }}
        >
          {track.name}
        </div>
        {/* Bar background */}
        <div
          style={{
            height: "0.375rem",
            borderRadius: "0.1875rem",
            background: T.color.cream,
            overflow: "hidden",
          }}
        >
          {/* Fill */}
          <div
            style={{
              height: "100%",
              borderRadius: "0.1875rem",
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight})`,
              animation: "aw-barFill 0.8s ease-out both",
            }}
          />
        </div>
      </div>
      {/* Count */}
      <span
        style={{
          fontFamily: T.font.body,
          fontSize: "0.75rem",
          color: T.color.muted,
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        {track.progress}/{track.total}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   3. AchievementShowcase
   ═══════════════════════════════════════════════════════════════════ */

export interface AchievementShowcaseProps {
  achievements: {
    id: string;
    name: string;
    icon: string;
    earnedAt?: string;
  }[];
  totalEarned: number;
  totalAvailable: number;
  onViewAll: () => void;
  isMobile: boolean;
}

export function AchievementShowcase({
  achievements,
  totalEarned,
  totalAvailable,
  onViewAll,
  isMobile,
}: AchievementShowcaseProps) {
  const { t } = useAtriumT();

  useEffect(ensureKeyframes, []);

  const slots = 4;
  const earned = achievements.filter((a) => a.earnedAt).slice(0, slots);
  const emptyCount = Math.max(0, slots - earned.length);

  const circleSize = isMobile ? "2.5rem" : "3rem";

  const circleBase: React.CSSProperties = {
    width: circleSize,
    height: circleSize,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: isMobile ? "1.25rem" : "1.5rem",
    flexShrink: 0,
  };

  return (
    <div style={{ animation: "aw-fadeSlideUp 0.5s ease-out 0.25s both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <h3 style={{ ...sectionTitleStyle, paddingBottom: 0 }}>
          {t("achievements.title")}
        </h3>
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            fontWeight: 600,
            color: T.color.gold,
            background: `${T.color.gold}18`,
            borderRadius: "0.5rem",
            padding: "0.125rem 0.5rem",
          }}
        >
          {totalEarned}/{totalAvailable}
        </span>
      </div>
      <div style={goldUnderline} />

      {totalEarned === 0 ? (
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.muted,
            fontStyle: "italic",
            margin: 0,
          }}
        >
          {t("achievements.empty")}
        </p>
      ) : (
        <div style={{ display: "flex", gap: "0.625rem", alignItems: "center" }}>
          {earned.map((a) => (
            <div
              key={a.id}
              style={{
                ...circleBase,
                border: `2px solid ${T.color.gold}`,
                background: `${T.color.gold}12`,
              }}
              title={a.name}
            >
              {a.icon}
            </div>
          ))}
          {Array.from({ length: emptyCount }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                ...circleBase,
                border: `2px dashed ${T.color.sandstone}`,
                background: "transparent",
              }}
            />
          ))}
        </div>
      )}

      <button style={linkStyle} onClick={onViewAll}>
        {t("achievements.viewAll")} &rarr;
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   4. RecentMemories
   ═══════════════════════════════════════════════════════════════════ */

export interface RecentMemoriesProps {
  memories: {
    mem: Mem;
    wingName: string;
    roomName: string;
    wingIcon: string;
  }[];
  onMemoryClick: (mem: Mem, wingId: string, roomId: string) => void;
  isMobile: boolean;
}

export function RecentMemories({
  memories,
  onMemoryClick,
  isMobile,
}: RecentMemoriesProps) {
  const { t } = useAtriumT();

  useEffect(ensureKeyframes, []);

  const scrollRef = useRef<HTMLDivElement>(null);

  const typeIcons: Record<string, string> = {
    photo: "\uD83D\uDCF7",
    video: "\uD83C\uDFAC",
    audio: "\uD83C\uDFB5",
    orb: "\uD83D\uDD2E",
    case: "\uD83D\uDCBC",
    album: "\uD83D\uDCDA",
  };

  return (
    <div style={{ animation: "aw-fadeSlideUp 0.5s ease-out 0.35s both" }}>
      <SectionTitle>{t("recent.title")}</SectionTitle>

      <style>{`
        .aw-scroll-strip::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        ref={scrollRef}
        className="aw-scroll-strip"
        style={{
          display: "flex",
          gap: "0.75rem",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBottom: "0.25rem",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {memories.map((item, i) => (
          <MemoryCard
            key={item.mem.id}
            item={item}
            index={i}
            typeIcons={typeIcons}
            onMemoryClick={onMemoryClick}
          />
        ))}
      </div>
    </div>
  );
}

function MemoryCard({
  item,
  index,
  typeIcons,
  onMemoryClick,
}: {
  item: RecentMemoriesProps["memories"][number];
  index: number;
  typeIcons: Record<string, string>;
  onMemoryClick: RecentMemoriesProps["onMemoryClick"];
}) {
  const [hovered, setHovered] = useState(false);
  const { mem, wingName, wingIcon } = item;

  const bg = `hsl(${mem.hue}, ${mem.s}%, ${mem.l}%)`;
  const icon = typeIcons[mem.type] || "\uD83D\uDCCC";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onMemoryClick(mem, "", "")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onMemoryClick(mem, "", "");
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        scrollSnapAlign: "start",
        flexShrink: 0,
        width: "10rem",
        cursor: "pointer",
        animation: `aw-cardStagger 0.4s ease-out ${index * 0.05}s both`,
        transition: "transform 0.2s ease",
        transform: hovered ? "translateY(-0.125rem)" : "translateY(0)",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: "10rem",
          height: "6.5rem",
          borderRadius: "0.625rem",
          overflow: "hidden",
          position: "relative",
          background: mem.dataUrl ? undefined : bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {mem.dataUrl ? (
          <img
            src={mem.dataUrl}
            alt={mem.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span style={{ fontSize: "1.75rem", opacity: 0.7 }}>{icon}</span>
        )}
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: T.color.charcoal,
          marginTop: "0.375rem",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {mem.title}
      </div>

      {/* Wing subtitle */}
      <div
        style={{
          fontFamily: T.font.body,
          fontSize: "0.6875rem",
          color: T.color.muted,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {wingIcon} {wingName}
      </div>
    </div>
  );
}
