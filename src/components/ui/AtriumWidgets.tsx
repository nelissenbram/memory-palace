"use client";

import React, { useEffect, useState, useRef } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { Mem } from "@/lib/constants/defaults";
import TuscanCard from "./TuscanCard";
import { TuscanSectionHeader } from "./TuscanCard";

/* ═══════════════════════════════════════════════════════════════════
   Shared helpers
   ═══════════════════════════════════════════════════════════════════ */

function useAtriumT() {
  return useTranslation("atrium" as "common");
}

/** Animated golden accent line at top of cards */
function GoldAccentLine({ delay = 0 }: { delay?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "0.1875rem",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          background: `linear-gradient(90deg, transparent, ${T.color.gold}, ${T.color.goldLight}, transparent)`,
          animation: `aw-goldLine 0.8s ease-out ${delay}s both`,
          borderRadius: "0 0 0.125rem 0.125rem",
        }}
      />
    </div>
  );
}

function ViewAllButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className="aw-viewall"
      onClick={onClick}
      style={{
        fontFamily: T.font.body,
        fontSize: "0.8125rem",
        fontWeight: 600,
        color: T.color.terracotta,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0.375rem 0",
        marginTop: "0.875rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        letterSpacing: "0.02em",
        transition: "color 0.2s ease",
      }}
    >
      {label}
      <span className="aw-viewall-arrow" style={{ fontSize: "0.875rem" }}>
        &rarr;
      </span>
    </button>
  );
}

/** Roman column divider SVG for desktop QuickStats */
function ColumnDivider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "1.5rem",
        flexShrink: 0,
        opacity: 0.2,
      }}
    >
      <svg
        width="6"
        height="80"
        viewBox="0 0 6 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Capital */}
        <rect x="0" y="0" width="6" height="3" rx="0.5" fill={T.color.walnut} />
        <rect x="0.5" y="3" width="5" height="2" rx="0.3" fill={T.color.walnut} />
        {/* Shaft with fluting */}
        <rect x="1.5" y="5" width="3" height="70" rx="0.5" fill={T.color.walnut} />
        <line x1="2.5" y1="7" x2="2.5" y2="73" stroke={T.color.sandstone} strokeWidth="0.3" />
        <line x1="3.5" y1="7" x2="3.5" y2="73" stroke={T.color.sandstone} strokeWidth="0.3" />
        {/* Base */}
        <rect x="0.5" y="75" width="5" height="2" rx="0.3" fill={T.color.walnut} />
        <rect x="0" y="77" width="6" height="3" rx="0.5" fill={T.color.walnut} />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Animated number hook
   ═══════════════════════════════════════════════════════════════════ */

function useAnimatedNumber(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setDisplay(0);
      return;
    }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quart for a luxurious deceleration
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

function AnimatedNumber({ value }: { value: number }) {
  const display = useAnimatedNumber(value);
  return <>{display}</>;
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

const STAT_ICONS = [
  // Memories - scroll/papyrus
  <svg key="mem" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  // Wings - column
  <svg key="wing" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="2" rx="0.5"/><rect x="10" y="4" width="4" height="16" rx="0.5"/><rect x="9" y="20" width="6" height="2" rx="0.5"/></svg>,
  // Rooms - archway
  <svg key="room" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V6a9 9 0 0118 0v16"/><path d="M9 22v-6a3 3 0 016 0v6"/></svg>,
  // Shared - people
  <svg key="share" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
];

export function QuickStats({
  totalMemories,
  wingsUsed,
  roomsCreated,
  sharedRooms,
  isMobile,
}: QuickStatsProps) {
  const { t } = useAtriumT();


  const cards = [
    { value: totalMemories, label: t("stat.memories"), icon: STAT_ICONS[0] },
    { value: wingsUsed, label: t("stat.wings"), icon: STAT_ICONS[1] },
    { value: roomsCreated, label: t("stat.rooms"), icon: STAT_ICONS[2] },
    { value: sharedRooms, label: t("stat.shared"), icon: STAT_ICONS[3] },
  ];

  if (isMobile) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
          animation: "aw-fadeSlideUp 0.5s ease-out both",
        }}
      >
        {cards.map((card, i) => (
          <QuickStatCard
            key={i}
            value={card.value}
            label={card.label}
            icon={card.icon}
            delay={i * 0.1}
          />
        ))}
      </div>
    );
  }

  // Desktop: cards with column dividers between them
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 0,
        animation: "aw-fadeSlideUp 0.5s ease-out both",
      }}
    >
      {cards.map((card, i) => (
        <React.Fragment key={i}>
          <div style={{ flex: 1 }}>
            <QuickStatCard
              value={card.value}
              label={card.label}
              icon={card.icon}
              delay={i * 0.1}
            />
          </div>
          {i < cards.length - 1 && <ColumnDivider />}
        </React.Fragment>
      ))}
    </div>
  );
}

function QuickStatCard({
  value,
  label,
  icon,
  delay,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
  delay: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(1rem)",
        WebkitBackdropFilter: "blur(1rem)",
        border: "0.0625rem solid rgba(238,234,227,0.7)",
        borderRadius: "1rem",
        position: "relative",
        overflow: "hidden",
        padding: "1.25rem 1rem 1rem",
        textAlign: "center",
        animation: `aw-countUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both`,
        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease",
        transform: hovered ? "translateY(-0.25rem) scale(1.02)" : "translateY(0) scale(1)",
        boxShadow: hovered
          ? `0 0.5rem 1.5rem rgba(0,0,0,0.08), 0 0 0 0.0625rem ${T.color.gold}30`
          : "0 0.125rem 0.5rem rgba(0,0,0,0.04)",
        cursor: "default",
      }}
    >
      <GoldAccentLine delay={delay} />

      {/* Icon */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "0.5rem",
          opacity: 0.7,
          transition: "opacity 0.2s ease",
          ...(hovered ? { opacity: 1 } : {}),
        }}
      >
        {icon}
      </div>

      {/* Number */}
      <div
        style={{
          fontFamily: T.font.display,
          fontSize: "2.25rem",
          fontWeight: 600,
          color: T.color.charcoal,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          background: `linear-gradient(135deg, ${T.color.charcoal}, ${T.color.walnut})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        <AnimatedNumber value={value} />
      </div>

      {/* Label */}
      <div
        style={{
          fontFamily: T.font.body,
          fontSize: "0.75rem",
          fontWeight: 500,
          color: T.color.muted,
          marginTop: "0.375rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
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
    description?: string;
    color?: string;
  }[];
  onViewAll: () => void;
  onTrackAction?: (trackId: string) => void;
  isMobile: boolean;
}

export function TrackProgress({
  tracks,
  onViewAll,
  onTrackAction,
  isMobile,
}: TrackProgressProps) {
  const { t } = useAtriumT();

  return (
    <div style={{ animation: "aw-fadeSlideUp 0.5s ease-out 0.15s both" }}>
      {/* Section header */}
      <div style={{ marginBottom: "1rem" }}>
        <h3
          style={{
            fontFamily: T.font.display,
            fontSize: "1.375rem",
            fontWeight: 600,
            color: T.color.charcoal,
            margin: 0,
            letterSpacing: "0.015em",
          }}
        >
          {t("yourJourney")}
        </h3>
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.muted,
            margin: "0.25rem 0 0",
            lineHeight: 1.4,
          }}
        >
          {t("tracks.description")}
        </p>
      </div>

      {/* Track cards grid — 2 columns on desktop, 1 on mobile */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "1rem",
        }}
      >
        {tracks.map((track, i) => (
          <TrackCard
            key={track.id}
            track={track}
            index={i}
            isMobile={isMobile}
            onAction={onTrackAction}
            t={t}
          />
        ))}
      </div>

      <ViewAllButton onClick={onViewAll} label={t("tracks.viewAll")} />
    </div>
  );
}

/* ── Track SVG Icons ── */
const TRACK_SVG_ICONS: Record<string, (color: string, size: number) => React.ReactElement> = {
  preserve: (color, size) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Open chest */}
      <rect x="2" y="9" width="16" height="9" rx="1.5" stroke={color} strokeWidth="1.3" />
      <path d="M2 12h16" stroke={color} strokeWidth="1.2" />
      {/* Lid open */}
      <path d="M3 9V5.5a1.5 1.5 0 011.5-1.5h11A1.5 1.5 0 0117 5.5V9" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      {/* Photo rectangle peeking out */}
      <rect x="7" y="6" width="6" height="4.5" rx="0.5" stroke={color} strokeWidth="1.2" fill={`${color}15`} />
      <circle cx="9" cy="8" r="0.7" fill={color} opacity="0.5" />
    </svg>
  ),
  visualize: (color, size) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Palette */}
      <path d="M10 2C5.58 2 2 5.58 2 10c0 4.42 3.58 8 8 8 .78 0 1.42-.64 1.42-1.42 0-.36-.14-.68-.38-.94-.22-.24-.36-.56-.36-.92 0-.78.64-1.42 1.42-1.42H14c3.31 0 4-2.69 4-6 0-3.87-3.58-5.3-8-5.3z" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Color dots */}
      <circle cx="6.5" cy="9" r="1.2" fill={color} opacity="0.7" />
      <circle cx="9" cy="5.8" r="1.2" fill={color} opacity="0.5" />
      <circle cx="13" cy="6.5" r="1.2" fill={color} opacity="0.35" />
    </svg>
  ),
  enhance: (color, size) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Magnifying glass */}
      <circle cx="8.5" cy="8.5" r="5" stroke={color} strokeWidth="1.3" />
      <line x1="12" y1="12" x2="17" y2="17" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {/* Sparkles */}
      <path d="M15 3l.5 1.5L17 5l-1.5.5L15 7l-.5-1.5L13 5l1.5-.5z" fill={color} opacity="0.6" />
      <path d="M3 14l.35 1 1 .35-1 .35L3 16.7l-.35-1-1-.35 1-.35z" fill={color} opacity="0.45" />
      <path d="M16.5 10l.3.8.8.3-.8.3-.3.8-.3-.8-.8-.3.8-.3z" fill={color} opacity="0.35" />
    </svg>
  ),
  resolutions: (color, size) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Hourglass */}
      <path d="M5 2h10M5 18h10" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6 2v4c0 1.5 4 3 4 4s-4 2.5-4 4v4" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v4c0 1.5-4 3-4 4s4 2.5 4 4v4" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Forward arrow */}
      <path d="M16 8l2 2-2 2" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  ),
  legacy: (color, size) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pediment */}
      <path d="M3 7l7-4 7 4" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="7" x2="3" y2="8" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="17" y1="7" x2="17" y2="8" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      {/* Columns */}
      <line x1="5.5" y1="8" x2="5.5" y2="16" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <line x1="14.5" y1="8" x2="14.5" y2="16" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      {/* Base */}
      <line x1="2" y1="16.5" x2="18" y2="16.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      {/* Heart */}
      <path d="M10 14.5c-.8-1.2-3-2.5-3-4a1.7 1.7 0 013-1.1 1.7 1.7 0 013 1.1c0 1.5-2.2 2.8-3 4z" fill={color} opacity="0.4" stroke={color} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  ),
  cocreate: (color, size) => (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Two overlapping circles (Venn) */}
      <circle cx="7.5" cy="10" r="5" stroke={color} strokeWidth="1.3" />
      <circle cx="12.5" cy="10" r="5" stroke={color} strokeWidth="1.3" />
      {/* Connecting dots in overlap */}
      <circle cx="10" cy="8.5" r="0.6" fill={color} opacity="0.5" />
      <circle cx="10" cy="10" r="0.6" fill={color} opacity="0.7" />
      <circle cx="10" cy="11.5" r="0.6" fill={color} opacity="0.5" />
    </svg>
  ),
};

function TrackCard({
  track,
  index,
  isMobile,
  onAction,
  t,
}: {
  track: TrackProgressProps["tracks"][number];
  index: number;
  isMobile: boolean;
  onAction?: (trackId: string) => void;
  t: (key: string) => string;
}) {
  const [hovered, setHovered] = useState(false);
  const pct = track.total > 0 ? (track.progress / track.total) * 100 : 0;
  const trackColor = track.color || T.color.gold;
  const isStarted = track.progress > 0;
  const isComplete = track.progress >= track.total;

  return (
    <TuscanCard
      variant="elevated"
      padding="1.25rem"
      style={{
        animation: `aw-fadeSlideUp 0.4s ease-out ${0.2 + index * 0.08}s both`,
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease",
        transform: hovered ? "translateY(-0.125rem)" : "translateY(0)",
        boxShadow: hovered
          ? `0 0.5rem 1.5rem rgba(0,0,0,0.08), 0 0 0 0.0625rem ${trackColor}30`
          : undefined,
        cursor: onAction ? "pointer" : "default",
      }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Colored accent line at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "0.1875rem",
            background: `linear-gradient(90deg, ${trackColor}, ${trackColor}80, transparent)`,
            borderRadius: "0 0 0.125rem 0.125rem",
          }}
        />

        {/* Icon row + name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.625rem",
          }}
        >
          {/* Icon in colored circle */}
          <div
            style={{
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "50%",
              background: `${trackColor}18`,
              border: `0.0625rem solid ${trackColor}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.375rem",
              flexShrink: 0,
              transition: "transform 0.3s ease, background 0.3s ease",
              transform: hovered ? "scale(1.08)" : "scale(1)",
            }}
          >
            {TRACK_SVG_ICONS[track.id]?.(trackColor, 20) || <span>{track.icon}</span>}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: T.font.display,
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: T.color.charcoal,
                letterSpacing: "0.01em",
                lineHeight: 1.2,
              }}
            >
              {track.name}
            </div>
          </div>
        </div>

        {/* Description */}
        {track.description && (
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
              margin: "0 0 0.75rem",
              lineHeight: 1.45,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {track.description}
          </p>
        )}

        {/* Progress bar */}
        <div style={{ marginBottom: "0.625rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.375rem",
            }}
          >
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: T.color.walnut,
                letterSpacing: "0.02em",
              }}
            >
              {track.progress} {t("tracks.stepsOf")} {track.total} {t("tracks.steps")}
            </span>
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                fontWeight: 700,
                color: trackColor,
              }}
            >
              {Math.round(pct)}%
            </span>
          </div>
          {/* Bar background */}
          <div
            style={{
              height: "0.375rem",
              borderRadius: "0.25rem",
              background: T.color.cream,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Fill */}
            <div
              style={{
                height: "100%",
                borderRadius: "0.25rem",
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${trackColor}, ${trackColor}BB)`,
                animation: `aw-barFill 1s cubic-bezier(0.4, 0, 0.2, 1) ${0.4 + index * 0.1}s both`,
                position: "relative",
              }}
            >
              {/* Shimmer overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                  backgroundSize: "12.5rem 100%",
                  animation: "aw-shimmer 2s linear infinite",
                  borderRadius: "0.25rem",
                }}
              />
            </div>
          </div>
        </div>

        {/* CTA button */}
        {!isComplete && onAction && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(track.id);
            }}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#fff",
              background: trackColor,
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.4375rem 1rem",
              cursor: "pointer",
              letterSpacing: "0.03em",
              transition: "opacity 0.2s ease, transform 0.2s ease",
              opacity: hovered ? 1 : 0.9,
              transform: hovered ? "scale(1.02)" : "scale(1)",
              width: "100%",
              textAlign: "center",
            }}
          >
            {isStarted ? t("tracks.continue") : t("tracks.start")}
          </button>
        )}

        {/* Complete state */}
        {isComplete && (
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              fontWeight: 700,
              color: trackColor,
              textAlign: "center",
              padding: "0.4375rem 0",
              letterSpacing: "0.03em",
            }}
          >
            {t("tracks.complete")}
          </div>
        )}
      </div>
    </TuscanCard>
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

  const slots = isMobile ? 4 : 6;
  const earned = achievements.filter((a) => a.earnedAt).slice(0, slots);
  const emptyCount = Math.max(0, slots - earned.length);

  const earnedDisplay = useAnimatedNumber(totalEarned, 800);

  return (
    <TuscanCard
      variant="glass"
      padding="1.5rem"
      style={{
        animation: "aw-fadeSlideUp 0.5s ease-out 0.25s both",
        boxShadow: `0 0.25rem 1rem rgba(0,0,0,0.04), inset 0 0.0625rem 0 rgba(255,255,255,0.6)`,
        borderImage: `linear-gradient(135deg, ${T.color.gold}40, transparent 40%, transparent 60%, ${T.color.gold}40) 1`,
        borderImageSlice: 1,
        borderWidth: "0.0625rem",
        borderStyle: "solid",
      }}
    >
      <GoldAccentLine delay={0.25} />

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          marginBottom: "0.25rem",
        }}
      >
        <h3
          style={{
            fontFamily: T.font.display,
            fontSize: "1.25rem",
            fontWeight: 600,
            color: T.color.charcoal,
            margin: 0,
            letterSpacing: "0.015em",
          }}
        >
          {t("achievements.title")}
        </h3>
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            fontWeight: 700,
            color: T.color.gold,
            background: `linear-gradient(135deg, ${T.color.gold}15, ${T.color.gold}08)`,
            borderRadius: "1rem",
            padding: "0.1875rem 0.625rem",
            border: `0.0625rem solid ${T.color.gold}25`,
            letterSpacing: "0.03em",
          }}
        >
          {earnedDisplay} / {totalAvailable}
        </span>
      </div>

      {/* Description line */}
      <p
        style={{
          fontFamily: T.font.body,
          fontSize: "0.75rem",
          color: T.color.muted,
          margin: "0 0 0.75rem",
          lineHeight: 1.4,
        }}
      >
        {t("achievements.description")}
      </p>

      <div
        style={{
          height: "0.125rem",
          width: "3.5rem",
          background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight}, transparent)`,
          borderRadius: "0.125rem",
          marginBottom: "1.125rem",
        }}
      />

      {totalEarned === 0 ? (
        /* Empty state */
        <div
          style={{
            textAlign: "center",
            padding: "1.5rem 1rem",
          }}
        >
          {/* Decorative laurel wreath SVG */}
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            style={{ opacity: 0.3, marginBottom: "0.75rem" }}
          >
            <path
              d="M24 4C18 8 14 16 14 24s4 16 10 20M24 4c6 4 10 12 10 20s-4 16-10 20"
              stroke={T.color.gold}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="24" cy="24" r="3" fill={T.color.gold} opacity="0.4" />
          </svg>
          <p
            style={{
              fontFamily: T.font.display,
              fontSize: "1rem",
              fontStyle: "italic",
              color: T.color.muted,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {t("achievements.empty")}
          </p>
        </div>
      ) : (
        /* Badge grid — larger, more striking */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "repeat(4, 1fr)"
              : "repeat(6, 1fr)",
            gap: "0.75rem",
            justifyItems: "center",
          }}
        >
          {earned.map((a, i) => (
            <AchievementBadge key={a.id} achievement={a} index={i} isMobile={isMobile} />
          ))}
          {Array.from({ length: emptyCount }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                width: isMobile ? "3rem" : "3.5rem",
                height: isMobile ? "3rem" : "3.5rem",
                borderRadius: "50%",
                border: `0.125rem dashed ${T.color.gold}30`,
                background: `radial-gradient(circle at 50% 50%, ${T.color.gold}06, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: `aw-fadeIn 0.4s ease-out ${0.5 + (earned.length + i) * 0.05}s both`,
                transition: "border-color 0.3s ease, background 0.3s ease",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" opacity="0.35">
                <circle cx="12" cy="12" r="10" strokeDasharray="3 3" />
                <path d="M12 8v8M8 12h8" />
              </svg>
            </div>
          ))}
        </div>
      )}

      <ViewAllButton onClick={onViewAll} label={t("achievements.viewAll")} />
    </TuscanCard>
  );
}

function AchievementBadge({
  achievement,
  index,
  isMobile,
}: {
  achievement: AchievementShowcaseProps["achievements"][number];
  index: number;
  isMobile: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const size = isMobile ? "3rem" : "3.5rem";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.375rem",
        animation: `aw-scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.3 + index * 0.08}s both`,
      }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={achievement.name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `0.125rem solid ${T.color.gold}`,
          background: `radial-gradient(circle at 30% 30%, ${T.color.gold}25, ${T.color.gold}0A)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isMobile ? "1.375rem" : "1.625rem",
          flexShrink: 0,
          position: "relative",
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease",
          transform: hovered ? "scale(1.15)" : "scale(1)",
          boxShadow: hovered
            ? `0 0 1.25rem 0.25rem ${T.color.gold}40, inset 0 0 0.5rem ${T.color.gold}15`
            : `0 0 0.75rem ${T.color.gold}20, inset 0 0 0.25rem ${T.color.gold}08`,
          cursor: "default",
          overflow: "hidden",
        }}
      >
        {/* Gold shimmer/particle effect on earned badges */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: `conic-gradient(from 0deg, transparent, ${T.color.gold}15, transparent, ${T.color.gold}10, transparent)`,
            animation: "aw-shimmer 3s linear infinite",
            pointerEvents: "none",
          }}
        />

        <span
          style={{
            position: "relative",
            zIndex: 1,
            animation: hovered ? "aw-float 2s ease-in-out infinite" : "none",
            filter: `drop-shadow(0 0 0.25rem ${T.color.gold}40)`,
          }}
        >
          {achievement.icon}
        </span>

        {/* Tooltip on hover */}
        {hovered && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 0.5rem)",
              left: "50%",
              transform: "translateX(-50%)",
              background: T.color.charcoal,
              color: T.color.white,
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              fontWeight: 600,
              padding: "0.25rem 0.625rem",
              borderRadius: "0.375rem",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              animation: "aw-fadeIn 0.15s ease-out",
              zIndex: 10,
            }}
          >
            {achievement.name}
            {/* Arrow */}
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "0.3125rem solid transparent",
                borderRight: "0.3125rem solid transparent",
                borderTop: `0.3125rem solid ${T.color.charcoal}`,
              }}
            />
          </div>
        )}
      </div>

      {/* Always-visible badge name */}
      <div
        style={{
          fontFamily: T.font.body,
          fontSize: "0.5625rem",
          color: T.color.muted,
          textAlign: "center",
          maxWidth: "4.5rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: 1.2,
        }}
      >
        {achievement.name}
      </div>
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

function relativeDate(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function RecentMemories({
  memories,
  onMemoryClick,
  isMobile,
}: RecentMemoriesProps) {
  const { t } = useAtriumT();

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
      <TuscanSectionHeader>{t("recent.title")}</TuscanSectionHeader>

      <div
        ref={scrollRef}
        className="aw-scroll-strip"
        style={{
          display: "flex",
          gap: "1rem",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBottom: "0.5rem",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          // Slight padding to allow hover lift to be visible
          padding: "0.5rem 0.125rem 0.5rem 0.125rem",
          margin: "-0.5rem -0.125rem",
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
  const { mem, wingName, roomName, wingIcon } = item;

  const bg = `hsl(${mem.hue}, ${mem.s}%, ${mem.l}%)`;
  const icon = typeIcons[mem.type] || "\uD83D\uDCCC";
  const dateStr = relativeDate(mem.createdAt);

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
        width: "12rem",
        cursor: "pointer",
        animation: `aw-cardStagger 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.06}s both`,
        transition:
          "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease",
        transform: hovered
          ? "translateY(-0.375rem) scale(1.02)"
          : "translateY(0) scale(1)",
        borderRadius: "0.875rem",
        overflow: "hidden",
        background: "rgba(255,255,255,0.5)",
        backdropFilter: "blur(0.5rem)",
        WebkitBackdropFilter: "blur(0.5rem)",
        boxShadow: hovered
          ? `0 0.75rem 2rem rgba(0,0,0,0.1), 0 0 0 0.0625rem ${T.color.gold}20`
          : "0 0.125rem 0.5rem rgba(0,0,0,0.06)",
        position: "relative",
      }}
    >
      {/* Gold top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "0.125rem",
          background: `linear-gradient(90deg, ${T.color.gold}60, ${T.color.goldLight}40, transparent)`,
          zIndex: 2,
        }}
      />

      {/* Thumbnail */}
      <div
        style={{
          width: "100%",
          height: "8rem",
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
              transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: hovered ? "scale(1.08)" : "scale(1)",
            }}
          />
        ) : (
          <span
            style={{
              fontSize: "2rem",
              opacity: 0.6,
              transition: "transform 0.3s ease",
              transform: hovered ? "scale(1.15)" : "scale(1)",
            }}
          >
            {icon}
          </span>
        )}

        {/* Gradient overlay at bottom for text legibility */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "2rem",
            background:
              "linear-gradient(transparent, rgba(0,0,0,0.08))",
            pointerEvents: "none",
          }}
        />

        {/* Date badge */}
        {dateStr && (
          <div
            style={{
              position: "absolute",
              top: "0.375rem",
              right: "0.375rem",
              fontFamily: T.font.body,
              fontSize: "0.625rem",
              fontWeight: 600,
              color: "rgba(255,255,255,0.95)",
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(0.25rem)",
              WebkitBackdropFilter: "blur(0.25rem)",
              padding: "0.125rem 0.4375rem",
              borderRadius: "0.5rem",
              letterSpacing: "0.02em",
            }}
          >
            {dateStr}
          </div>
        )}
      </div>

      {/* Content area */}
      <div style={{ padding: "0.625rem 0.75rem 0.75rem" }}>
        {/* Title */}
        <div
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: T.color.charcoal,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.3,
          }}
        >
          {mem.title}
        </div>

        {/* Wing / Room breadcrumb */}
        <div
          style={{
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            color: T.color.muted,
            marginTop: "0.1875rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <span>{wingIcon}</span>
          <span>{wingName}</span>
          {roomName && (
            <>
              <span style={{ opacity: 0.4 }}>/</span>
              <span>{roomName}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
