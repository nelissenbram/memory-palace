"use client";

import React, { useEffect, useState, useRef } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { Mem } from "@/lib/constants/defaults";
import TuscanCard from "./TuscanCard";
import { TuscanSectionHeader } from "./TuscanCard";
import TrackIcon from "./TrackIcons";
import { WingIcon } from "./WingRoomIcons";

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
      aria-label={label}
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
        aria-hidden="true"
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
  <svg key="mem" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  // Wings - column
  <svg key="wing" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="2" rx="0.5"/><rect x="10" y="4" width="4" height="16" rx="0.5"/><rect x="9" y="20" width="6" height="2" rx="0.5"/></svg>,
  // Rooms - archway
  <svg key="room" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V6a9 9 0 0118 0v16"/><path d="M9 22v-6a3 3 0 016 0v6"/></svg>,
  // Shared - people
  <svg key="share" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
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
            key={card.label}
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
        <React.Fragment key={card.label}>
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

const QuickStatCard = React.memo(function QuickStatCard({
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
      aria-label={`${label}: ${value}`}
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
});

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
  recommendedTrackIds?: string[];
  personaType?: string;
  totalPoints?: number;
}

export function TrackProgress({
  tracks,
  onViewAll,
  onTrackAction,
  isMobile,
  recommendedTrackIds,
  personaType,
  totalPoints,
}: TrackProgressProps) {
  const { t } = useAtriumT();

  const allComplete = tracks.length > 0 && tracks.every((tr) => tr.progress >= tr.total);
  const recommendedTracks = recommendedTrackIds
    ? tracks.filter((tr) => recommendedTrackIds.includes(tr.id) && tr.progress < tr.total)
    : [];

  return (
    <div style={{ animation: "aw-fadeSlideUp 0.5s ease-out 0.15s both" }}>
      {/* Section header */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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
          {typeof totalPoints === "number" && totalPoints > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.1875rem 0.625rem",
                borderRadius: "1rem",
                background: `linear-gradient(135deg, ${T.color.gold}20, ${T.color.gold}10)`,
                border: `0.0625rem solid ${T.color.gold}30`,
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: T.color.gold,
                letterSpacing: "0.02em",
              }}
            >
              {t("totalPointsBadge", { points: String(totalPoints) })}
            </span>
          )}
        </div>
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

      {/* All-complete congratulatory banner */}
      {allComplete && (
        <TuscanCard
          variant="elevated"
          padding="1.25rem"
          style={{ marginBottom: "1rem", textAlign: "center" }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            {/* Gold laurel wreath */}
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ display: "inline-block", verticalAlign: "middle" }}>
              <path d="M20 4l1.5 4.5L26 6l-1.5 4.5L29 12l-4.5 1.5L26 18l-4.5-1.5L20 21l-1.5-4.5L14 18l1.5-4.5L11 12l4.5-1.5L14 6l4.5 2.5z" fill={T.color.gold} opacity="0.8" />
              <path d="M8 20c0-2 1-4 3-5M32 20c0-2-1-4-3-5" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8 20c-1 3 0 7 3 10M32 20c1 3 0 7-3 10" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
              <path d="M11 30c2 2 5 4 9 4s7-2 9-4" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div
            style={{
              fontFamily: T.font.display,
              fontSize: "1.125rem",
              fontWeight: 600,
              color: T.color.charcoal,
              marginBottom: "0.25rem",
            }}
          >
            {t("tracks.allComplete")}
          </div>
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.muted,
              lineHeight: 1.5,
            }}
          >
            {t("tracks.allCompleteDesc")}
          </div>
        </TuscanCard>
      )}

      {/* Persona recommendation — show recommended tracks */}
      {personaType && recommendedTracks.length > 0 && !allComplete && (
        <TuscanCard
          variant="glass"
          padding="1rem 1.25rem"
          style={{ marginBottom: "1rem" }}
        >
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: T.color.charcoal,
              margin: "0 0 0.75rem",
            }}
          >
            {t("tracks.personaTracks", { persona: personaType.charAt(0).toUpperCase() + personaType.slice(1) })}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recommendedTracks.map((track, i) => (
              <button
                key={track.id}
                onClick={() => onTrackAction?.(track.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  background: i === 0 ? `${track.color || T.color.gold}10` : "transparent",
                  border: i === 0 ? `1px solid ${track.color || T.color.gold}25` : `1px solid ${T.color.cream}`,
                  borderRadius: "0.625rem",
                  padding: "0.625rem 0.875rem",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: T.font.body,
                  transition: "all .15s",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: "1.75rem",
                    height: "1.75rem",
                    borderRadius: "50%",
                    background: `${track.color || T.color.gold}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: track.color || T.color.gold,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: T.color.charcoal }}>
                    {track.name}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: T.color.muted, marginTop: "0.125rem" }}>
                    {track.progress}/{track.total} {t("tracks.stepsLabel")}
                    {i === 0 && <span style={{ color: track.color || T.color.terracotta, fontWeight: 600, marginLeft: "0.375rem" }}>{t("tracks.startHere")}</span>}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M5 3l4 4-4 4" stroke={T.color.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </TuscanCard>
      )}

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
            isRecommended={recommendedTrackIds?.includes(track.id) ?? false}
          />
        ))}
      </div>

      <ViewAllButton onClick={onViewAll} label={t("tracks.viewAll")} />
    </div>
  );
}

/* ── Track SVG Icons: now uses shared <TrackIcon> component ── */

const TrackCard = React.memo(function TrackCard({
  track,
  index,
  isMobile,
  onAction,
  t,
  isRecommended,
}: {
  track: TrackProgressProps["tracks"][number];
  index: number;
  isMobile: boolean;
  onAction?: (trackId: string) => void;
  t: (key: string) => string;
  isRecommended?: boolean;
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
            <TrackIcon trackId={track.id} size="1.25rem" primaryColor={trackColor} secondaryColor={`${trackColor}99`} />
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
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {track.name}
              {isRecommended && (
                <span
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    color: T.color.gold,
                    background: `${T.color.gold}18`,
                    border: `0.0625rem solid ${T.color.gold}40`,
                    borderRadius: "0.375rem",
                    padding: "0.125rem 0.4375rem",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("tracks.recommended")}
                </span>
              )}
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
              background: isStarted
                ? trackColor
                : `linear-gradient(135deg, ${trackColor}, ${trackColor}CC)`,
              border: "none",
              borderRadius: "0.5rem",
              padding: isStarted ? "0.4375rem 1rem" : "0.5625rem 1rem",
              cursor: "pointer",
              letterSpacing: "0.03em",
              transition: "opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
              opacity: hovered ? 1 : 0.9,
              transform: hovered ? "scale(1.02)" : "scale(1)",
              width: "100%",
              textAlign: "center",
              boxShadow: !isStarted
                ? `0 0.125rem 0.5rem ${trackColor}40`
                : "none",
            }}
          >
            {isStarted ? t("tracks.continue") : t("tracks.beginTrack")}
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
});

/* ═══════════════════════════════════════════════════════════════════
   3. AchievementShowcase
   ═══════════════════════════════════════════════════════════════════ */

export interface AchievementShowcaseProps {
  achievements: {
    id: string;
    name: string;
    descKey?: string;
    icon: string;
    category?: string;
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
  const [activeTab, setActiveTab] = useState<string>("all");

  const earnedDisplay = useAnimatedNumber(totalEarned, 800);

  // Sort: earned first, then locked
  const sorted = [...achievements].sort((a, b) => {
    if (a.earnedAt && !b.earnedAt) return -1;
    if (!a.earnedAt && b.earnedAt) return 1;
    return 0;
  });

  // Filter by category tab
  const filtered = activeTab === "all" ? sorted : sorted.filter((a) => a.category === activeTab);

  const TABS = [
    { key: "all", labelKey: "achievements.allCategories" },
    { key: "memories", labelKey: "achievements.catMemories" },
    { key: "social", labelKey: "achievements.catSocial" },
    { key: "explore", labelKey: "achievements.catExplore" },
    { key: "create", labelKey: "achievements.catCreate" },
  ];

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

      {/* Progress summary */}
      <p
        style={{
          fontFamily: T.font.body,
          fontSize: "0.75rem",
          color: T.color.muted,
          margin: "0 0 0.625rem",
          lineHeight: 1.4,
        }}
      >
        {t("achievements.earnedCount", { earned: String(totalEarned), total: String(totalAvailable) })}
      </p>

      <div
        style={{
          height: "0.125rem",
          width: "3.5rem",
          background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight}, transparent)`,
          borderRadius: "0.125rem",
          marginBottom: "0.75rem",
        }}
      />

      {/* Category tabs */}
      <div
        role="tablist"
        aria-label={t("achievements.title")}
        style={{
          display: "flex",
          gap: "0.375rem",
          marginBottom: "1rem",
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? T.color.gold : T.color.muted,
              background: activeTab === tab.key
                ? `linear-gradient(135deg, ${T.color.gold}18, ${T.color.gold}08)`
                : "transparent",
              border: activeTab === tab.key
                ? `0.0625rem solid ${T.color.gold}30`
                : `0.0625rem solid ${T.color.sandstone}40`,
              borderRadius: "1rem",
              padding: "0.25rem 0.625rem",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Scrollable badge grid showing ALL achievements */}
      <div
        style={{
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "thin",
          paddingBottom: "0.5rem",
          marginBottom: "0.25rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(filtered.length, isMobile ? 4 : 6)}, ${isMobile ? "3.75rem" : "4.25rem"})`,
            gap: "0.625rem",
            justifyItems: "center",
            minWidth: "min-content",
          }}
        >
          {filtered.map((a, i) => (
            <AchievementBadge
              key={a.id}
              achievement={a}
              index={i}
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>

      <ViewAllButton onClick={onViewAll} label={t("achievements.viewAll")} />
    </TuscanCard>
  );
}

/* ─── Achievement SVG Icons ─── */

export const AchievementIcon = React.memo(function AchievementIcon({ id, size = 20 }: { id: string; size?: number }) {
  const gold = T.color.gold;
  const terracotta = T.color.terracotta;
  const sage = T.color.sage;
  const sw = 1.3; // default strokeWidth

  const props = {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  } as const;

  switch (id) {
    /* ── Memories ── */
    case "first_memory": // star / sparkle
      return (
        <svg {...props}>
          <path d="M10 2l2.2 5.2 5.8.5-4.4 3.8 1.4 5.5L10 14l-5 3 1.4-5.5L2 7.7l5.8-.5L10 2z" stroke={gold} strokeWidth={sw} strokeLinejoin="round" fill={`${gold}30`} />
          <circle cx="10" cy="9" r="1" fill={gold} stroke="none" />
        </svg>
      );
    case "collector": // treasure chest
      return (
        <svg {...props}>
          <rect x="3" y="8" width="14" height="8" rx="1.2" stroke={terracotta} strokeWidth={sw} fill={`${terracotta}15`} />
          <path d="M3 11h14" stroke={terracotta} strokeWidth="0.8" />
          <path d="M5 8V6.5a5 5 0 0 1 10 0V8" stroke={terracotta} strokeWidth={sw} strokeLinecap="round" />
          <rect x="8.5" y="11" width="3" height="2.5" rx="0.6" fill={`${gold}40`} stroke={gold} strokeWidth="0.8" />
        </svg>
      );
    case "archivist": // Roman temple / archive
      return (
        <svg {...props}>
          <path d="M4 8l6-4.5L16 8" stroke={gold} strokeWidth={sw} strokeLinejoin="round" fill={`${gold}18`} />
          <line x1="4" y1="8" x2="16" y2="8" stroke={gold} strokeWidth={sw} />
          <line x1="6" y1="8" x2="6" y2="15" stroke={sage} strokeWidth={sw} />
          <line x1="10" y1="8" x2="10" y2="15" stroke={sage} strokeWidth="0.9" />
          <line x1="14" y1="8" x2="14" y2="15" stroke={sage} strokeWidth={sw} />
          <line x1="3.5" y1="15" x2="16.5" y2="15" stroke={gold} strokeWidth={sw} strokeLinecap="round" />
          <line x1="3" y1="16.5" x2="17" y2="16.5" stroke={gold} strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      );
    case "centurion": // Roman centurion helmet
      return (
        <svg {...props}>
          <path d="M5 13c0-4 2.5-8 5-8s5 4 5 8" stroke={terracotta} strokeWidth={sw} strokeLinecap="round" fill={`${terracotta}18`} />
          <path d="M4 13h12" stroke={terracotta} strokeWidth={sw} strokeLinecap="round" />
          <path d="M5 14.5c0 1 1.5 2 5 2s5-1 5-2" stroke={terracotta} strokeWidth="0.9" strokeLinecap="round" />
          {/* plume crest */}
          <path d="M10 5c0-2.5 2.5-2.5 3-1" stroke={gold} strokeWidth={sw} strokeLinecap="round" fill="none" />
          <path d="M10.5 5.5c0.5-1.5 2-1.5 2.5-0.5" stroke={gold} strokeWidth="0.7" fill="none" />
          {/* face opening */}
          <path d="M7 12v-2c0-1 1.3-2 3-2s3 1 3 2v2" stroke={terracotta} strokeWidth="0.8" fill={`${gold}15`} />
        </svg>
      );
    case "diverse_collector": // mosaic / theater masks
      return (
        <svg {...props}>
          {/* happy mask */}
          <circle cx="7.5" cy="8.5" r="4" stroke={gold} strokeWidth={sw} fill={`${gold}15`} />
          <path d="M5.8 9.5c.5 1.2 2.2 1.5 3.4.5" stroke={gold} strokeWidth="0.9" strokeLinecap="round" fill="none" />
          <circle cx="6.5" cy="7.5" r="0.5" fill={gold} stroke="none" />
          <circle cx="8.5" cy="7.5" r="0.5" fill={gold} stroke="none" />
          {/* sad mask */}
          <circle cx="12.5" cy="11.5" r="4" stroke={terracotta} strokeWidth={sw} fill={`${terracotta}15`} />
          <path d="M10.8 13c.5-1 2.2-1.2 3.4-.3" stroke={terracotta} strokeWidth="0.9" strokeLinecap="round" fill="none" />
          <circle cx="11.5" cy="10.5" r="0.5" fill={terracotta} stroke="none" />
          <circle cx="13.5" cy="10.5" r="0.5" fill={terracotta} stroke="none" />
        </svg>
      );

    /* ── Social ── */
    case "generous_host": // hand offering
      return (
        <svg {...props}>
          <path d="M4 14c2-1 3-2 5-2 1 0 2 .5 2.5 1.5" stroke={terracotta} strokeWidth={sw} strokeLinecap="round" fill="none" />
          <path d="M11.5 13.5c1-.5 2.5-.5 4.5.5" stroke={terracotta} strokeWidth={sw} strokeLinecap="round" fill="none" />
          <path d="M6 12c0-1.5 1-3 2.5-3s2 .8 2.5 1.5" stroke={sage} strokeWidth="0.9" strokeLinecap="round" fill="none" />
          {/* gift / offering sparkle */}
          <circle cx="9" cy="7" r="2" stroke={gold} strokeWidth={sw} fill={`${gold}20`} />
          <path d="M9 5v4M7 7h4" stroke={gold} strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      );
    case "social_butterfly": // butterfly
      return (
        <svg {...props}>
          {/* body */}
          <line x1="10" y1="5" x2="10" y2="15" stroke={terracotta} strokeWidth={sw} strokeLinecap="round" />
          {/* antennae */}
          <path d="M10 5c-1.5-2-3-2.5-4-1.5" stroke={gold} strokeWidth="0.8" strokeLinecap="round" fill="none" />
          <path d="M10 5c1.5-2 3-2.5 4-1.5" stroke={gold} strokeWidth="0.8" strokeLinecap="round" fill="none" />
          {/* left wings */}
          <path d="M10 7c-2-1-5-1-5 2s3 3 5 2" stroke={gold} strokeWidth={sw} fill={`${gold}18`} strokeLinejoin="round" />
          <path d="M10 12c-2 0-4 0.5-4 2.5s2.5 1.5 4 0.5" stroke={terracotta} strokeWidth="0.9" fill={`${terracotta}15`} strokeLinejoin="round" />
          {/* right wings */}
          <path d="M10 7c2-1 5-1 5 2s-3 3-5 2" stroke={gold} strokeWidth={sw} fill={`${gold}18`} strokeLinejoin="round" />
          <path d="M10 12c2 0 4 0.5 4 2.5s-2.5 1.5-4 0.5" stroke={terracotta} strokeWidth="0.9" fill={`${terracotta}15`} strokeLinejoin="round" />
        </svg>
      );
    case "open_palace": // palace gates opening
      return (
        <svg {...props}>
          {/* left gate */}
          <path d="M2 16V6l4-2v12H2z" stroke={gold} strokeWidth={sw} fill={`${gold}10`} />
          <line x1="4.5" y1="7" x2="4.5" y2="14" stroke={gold} strokeWidth="0.6" />
          {/* right gate */}
          <path d="M18 16V6l-4-2v12h4z" stroke={gold} strokeWidth={sw} fill={`${gold}10`} />
          <line x1="15.5" y1="7" x2="15.5" y2="14" stroke={gold} strokeWidth="0.6" />
          {/* arch */}
          <path d="M6 4a4 4 0 0 1 8 0" stroke={terracotta} strokeWidth={sw} strokeLinecap="round" fill="none" />
          {/* light rays from opening */}
          <line x1="10" y1="6" x2="10" y2="10" stroke={gold} strokeWidth="0.6" strokeDasharray="1.2 1" />
          <line x1="8" y1="7" x2="7" y2="10" stroke={gold} strokeWidth="0.5" strokeDasharray="1 1" />
          <line x1="12" y1="7" x2="13" y2="10" stroke={gold} strokeWidth="0.5" strokeDasharray="1 1" />
          <line x1="3" y1="16" x2="17" y2="16" stroke={terracotta} strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      );

    /* ── Explore ── */
    case "explorer": // compass rose
      return (
        <svg {...props}>
          <circle cx="10" cy="10" r="7" stroke={gold} strokeWidth={sw} fill={`${gold}10`} />
          <circle cx="10" cy="10" r="1" fill={terracotta} stroke="none" />
          {/* N */}
          <polygon points="10,3.5 11,8.5 9,8.5" fill={terracotta} stroke={terracotta} strokeWidth="0.3" />
          {/* S */}
          <polygon points="10,16.5 11,11.5 9,11.5" fill={`${gold}60`} stroke={gold} strokeWidth="0.3" />
          {/* E */}
          <polygon points="16.5,10 11.5,11 11.5,9" fill={`${gold}60`} stroke={gold} strokeWidth="0.3" />
          {/* W */}
          <polygon points="3.5,10 8.5,11 8.5,9" fill={`${gold}60`} stroke={gold} strokeWidth="0.3" />
          {/* tick marks */}
          <line x1="10" y1="3" x2="10" y2="4" stroke={gold} strokeWidth="0.6" />
          <line x1="10" y1="16" x2="10" y2="17" stroke={gold} strokeWidth="0.6" />
          <line x1="3" y1="10" x2="4" y2="10" stroke={gold} strokeWidth="0.6" />
          <line x1="16" y1="10" x2="17" y2="10" stroke={gold} strokeWidth="0.6" />
        </svg>
      );
    case "decorator": // paintbrush / palette
      return (
        <svg {...props}>
          {/* palette shape */}
          <path d="M10 3C5 3 2 6.5 2 10c0 3.5 2.5 6.5 7 7 1 0 1.5-.8 1-1.5-.5-.7-.5-1.5.5-1.5 2 0 3.5-.5 4.5-2 2-3 0-9-5-9z" stroke={terracotta} strokeWidth={sw} fill={`${terracotta}12`} />
          {/* paint dots */}
          <circle cx="6" cy="8" r="1" fill={gold} stroke="none" />
          <circle cx="8" cy="6" r="0.8" fill={terracotta} stroke="none" />
          <circle cx="11" cy="6.5" r="0.9" fill={sage} stroke="none" />
          <circle cx="5.5" cy="11" r="0.7" fill={`${gold}90`} stroke="none" />
        </svg>
      );
    case "architect": // hammer and chisel
      return (
        <svg {...props}>
          {/* chisel */}
          <line x1="4" y1="16" x2="9" y2="8" stroke={sage} strokeWidth={sw} strokeLinecap="round" />
          <path d="M8 9l2-1-1-2" stroke={sage} strokeWidth="0.9" strokeLinecap="round" fill="none" />
          {/* hammer */}
          <line x1="11" y1="14" x2="16" y2="5" stroke={terracotta} strokeWidth={sw} strokeLinecap="round" />
          <rect x="14.5" y="3" width="3.5" height="2.5" rx="0.5" transform="rotate(-25 16 4)" stroke={gold} strokeWidth={sw} fill={`${gold}25`} />
          {/* sparks */}
          <circle cx="10" cy="11" r="0.4" fill={gold} stroke="none" />
          <circle cx="9" cy="12.5" r="0.3" fill={gold} stroke="none" />
        </svg>
      );
    case "curator": // quill pen
      return (
        <svg {...props}>
          {/* feather / quill */}
          <path d="M14 3c-3 1-5 4-7 8l-2 5 5-2c4-2 7-4 8-7" stroke={gold} strokeWidth={sw} strokeLinecap="round" fill={`${gold}15`} />
          <path d="M7 11l1.5 1.5" stroke={terracotta} strokeWidth="0.8" strokeLinecap="round" />
          {/* quill spine */}
          <line x1="5" y1="16" x2="14" y2="3" stroke={gold} strokeWidth="0.6" />
          {/* feather barb accents */}
          <path d="M11 5c-1.5.5-2 2-2 2" stroke={gold} strokeWidth="0.5" fill="none" />
          <path d="M12.5 4.5c-2 1-2.5 3-2.5 3" stroke={gold} strokeWidth="0.4" fill="none" />
          {/* ink dot */}
          <circle cx="5" cy="16" r="0.8" fill={terracotta} stroke="none" />
        </svg>
      );
    case "palace_master": // crown with laurel
      return (
        <svg {...props}>
          {/* crown */}
          <path d="M4 13l1.5-5 2.5 3 2-4 2 4 2.5-3 1.5 5z" stroke={gold} strokeWidth={sw} strokeLinejoin="round" fill={`${gold}20`} />
          <line x1="4" y1="13" x2="16" y2="13" stroke={gold} strokeWidth={sw} />
          <line x1="4.5" y1="14.5" x2="15.5" y2="14.5" stroke={gold} strokeWidth="0.8" />
          {/* jewels */}
          <circle cx="10" cy="11.5" r="0.6" fill={terracotta} stroke="none" />
          <circle cx="7" cy="12" r="0.4" fill={sage} stroke="none" />
          <circle cx="13" cy="12" r="0.4" fill={sage} stroke="none" />
          {/* laurel leaves */}
          <path d="M3 16c1-1.5 2-1.5 3-.5" stroke={sage} strokeWidth="0.7" fill="none" strokeLinecap="round" />
          <path d="M17 16c-1-1.5-2-1.5-3-.5" stroke={sage} strokeWidth="0.7" fill="none" strokeLinecap="round" />
        </svg>
      );

    /* ── Create ── */
    case "filmmaker": // film reel / clapboard
      return (
        <svg {...props}>
          {/* clapboard top */}
          <path d="M3 7h14l-1.5-3H4.5L3 7z" stroke={terracotta} strokeWidth={sw} fill={`${terracotta}20`} />
          {/* stripes on clapper */}
          <line x1="6" y1="4.5" x2="5" y2="7" stroke={terracotta} strokeWidth="0.7" />
          <line x1="9" y1="4.5" x2="8" y2="7" stroke={terracotta} strokeWidth="0.7" />
          <line x1="12" y1="4.5" x2="11" y2="7" stroke={terracotta} strokeWidth="0.7" />
          <line x1="15" y1="4.5" x2="14" y2="7" stroke={terracotta} strokeWidth="0.7" />
          {/* board body */}
          <rect x="3" y="7" width="14" height="9" rx="0.8" stroke={gold} strokeWidth={sw} fill={`${gold}10`} />
          {/* play triangle */}
          <polygon points="8.5,9.5 8.5,14 13,11.75" fill={gold} stroke={gold} strokeWidth="0.5" />
        </svg>
      );
    case "dj": // music note with vinyl
      return (
        <svg {...props}>
          {/* vinyl record */}
          <circle cx="10" cy="11" r="6" stroke={terracotta} strokeWidth={sw} fill={`${terracotta}10`} />
          <circle cx="10" cy="11" r="2" stroke={terracotta} strokeWidth="0.7" fill="none" />
          <circle cx="10" cy="11" r="0.8" fill={gold} stroke="none" />
          {/* groove lines */}
          <circle cx="10" cy="11" r="4" stroke={terracotta} strokeWidth="0.3" fill="none" strokeDasharray="2 2" />
          {/* music note */}
          <line x1="15" y1="3" x2="15" y2="9" stroke={gold} strokeWidth={sw} strokeLinecap="round" />
          <circle cx="13.5" cy="9" r="1.5" fill={gold} stroke="none" />
          <path d="M15 3c1-.5 2.5-.5 3 .5" stroke={gold} strokeWidth="0.8" strokeLinecap="round" fill="none" />
        </svg>
      );
    case "time_traveler": // hourglass
      return (
        <svg {...props}>
          {/* glass fill */}
          <path d="M6 3c0 3 4 5 4 7s-4 4-4 7h8c0-3-4-4-4-7s4-4 4-7z" fill={`${terracotta}12`} stroke="none" />
          {/* top frame */}
          <line x1="5" y1="3" x2="15" y2="3" stroke={gold} strokeWidth={sw} strokeLinecap="round" />
          {/* bottom frame */}
          <line x1="5" y1="17" x2="15" y2="17" stroke={gold} strokeWidth={sw} strokeLinecap="round" />
          {/* glass shape */}
          <path d="M6 3c0 3 4 5 4 7s-4 4-4 7" stroke={terracotta} strokeWidth={sw} fill="none" />
          <path d="M14 3c0 3-4 5-4 7s4 4 4 7" stroke={terracotta} strokeWidth={sw} fill="none" />
          {/* sand top */}
          <path d="M7.5 5.5h5" stroke={gold} strokeWidth="0.7" strokeLinecap="round" />
          <path d="M8.5 7h3" stroke={gold} strokeWidth="0.5" strokeLinecap="round" />
          {/* sand stream */}
          <line x1="10" y1="9" x2="10" y2="11" stroke={gold} strokeWidth="0.5" strokeDasharray="0.8 0.8" />
          {/* sand bottom */}
          <path d="M7 15.5c1 .5 2 1 3 1s2-.5 3-1" stroke={gold} strokeWidth="0.6" fill={`${gold}30`} strokeLinecap="round" />
        </svg>
      );
    case "storyteller": // open book with feather pen
      return (
        <svg {...props}>
          {/* book spine */}
          <line x1="10" y1="5" x2="10" y2="16" stroke={terracotta} strokeWidth="0.7" />
          {/* left page */}
          <path d="M10 5C9 4.5 6 4 3.5 4.5v10c2.5-.5 5 0 6.5.5" stroke={gold} strokeWidth={sw} fill={`${gold}12`} />
          {/* right page */}
          <path d="M10 5c1-.5 4-1 6.5-.5v10c-2.5-.5-5 0-6.5.5" stroke={gold} strokeWidth={sw} fill={`${gold}12`} />
          {/* text lines */}
          <line x1="5" y1="7.5" x2="8" y2="7.5" stroke={sage} strokeWidth="0.5" />
          <line x1="5" y1="9" x2="7.5" y2="9" stroke={sage} strokeWidth="0.5" />
          <line x1="5" y1="10.5" x2="8" y2="10.5" stroke={sage} strokeWidth="0.5" />
          {/* feather pen accent */}
          <path d="M14 3c-1 1-2 3-2.5 5" stroke={terracotta} strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <path d="M14 3c.5-.5 1.5-1 2-.5" stroke={terracotta} strokeWidth="0.6" fill="none" strokeLinecap="round" />
        </svg>
      );

    default:
      // Fallback: simple star
      return (
        <svg {...props}>
          <circle cx="10" cy="10" r="6" stroke={gold} strokeWidth={sw} fill={`${gold}15`} />
          <circle cx="10" cy="10" r="1" fill={gold} stroke="none" />
        </svg>
      );
  }
});

/** Locked-state SVG icon: a Roman padlock */
function LockedIcon({ size = 20 }: { size?: number }) {
  const grey = T.color.muted;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Lock body */}
      <rect x="4" y="9" width="12" height="8" rx="1.5" stroke={grey} strokeWidth="1.3" fill={`${grey}15`} />
      {/* Shackle */}
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke={grey} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      {/* Keyhole */}
      <circle cx="10" cy="13" r="1.2" fill={grey} stroke="none" />
      <rect x="9.4" y="13" width="1.2" height="2" rx="0.3" fill={grey} stroke="none" />
    </svg>
  );
}

const AchievementBadge = React.memo(function AchievementBadge({
  achievement,
  index,
  isMobile,
}: {
  achievement: AchievementShowcaseProps["achievements"][number];
  index: number;
  isMobile: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const { t } = useAtriumT();
  const isEarned = !!achievement.earnedAt;
  const size = isMobile ? "3rem" : "3.5rem";
  const goldColor = T.color.gold;
  const greyColor = T.color.muted;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "0.25rem",
        width: isMobile ? "3.75rem" : "4.25rem",
        animation: `aw-scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.3 + index * 0.04}s both`,
      }}
    >
      {/* Badge circle */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={achievement.name}
        role="img"
        aria-label={isEarned ? achievement.name : `${achievement.name} — ${t("achievements.locked")}`}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: isEarned
            ? `0.125rem solid ${goldColor}`
            : `0.125rem dashed ${greyColor}50`,
          background: isEarned
            ? `radial-gradient(circle at 30% 30%, ${goldColor}35, ${goldColor}0A)`
            : `radial-gradient(circle at 50% 50%, ${greyColor}0A, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, opacity 0.2s ease",
          transform: hovered && isEarned ? "scale(1.15)" : "scale(1)",
          boxShadow: isEarned
            ? (hovered
              ? `0 0 1.5rem 0.375rem ${goldColor}55, inset 0 0 0.625rem ${goldColor}20`
              : `0 0 1rem 0.125rem ${goldColor}30, inset 0 0 0.375rem ${goldColor}12`)
            : "none",
          opacity: isEarned ? 1 : 0.5,
          cursor: "default",
          overflow: "hidden",
        }}
      >
        {/* Shimmer effect for earned badges only */}
        {isEarned && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: `conic-gradient(from 0deg, transparent, ${goldColor}15, transparent, ${goldColor}10, transparent)`,
              animation: "aw-shimmer 3s linear infinite",
              pointerEvents: "none",
            }}
          />
        )}

        <span
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: hovered && isEarned ? "aw-float 2s ease-in-out infinite" : "none",
            filter: isEarned ? `drop-shadow(0 0 0.25rem ${goldColor}40)` : "none",
          }}
        >
          {isEarned
            ? <AchievementIcon id={achievement.id} size={isMobile ? 24 : 28} />
            : <LockedIcon size={isMobile ? 18 : 22} />
          }
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

      {/* Badge name — vertically centered below */}
      <div
        style={{
          fontFamily: T.font.body,
          fontSize: "0.5625rem",
          color: isEarned ? T.color.walnut : T.color.muted,
          textAlign: "center",
          maxWidth: isMobile ? "3.75rem" : "4.25rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: 1.3,
        }}
      >
        {achievement.name}
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   4. RecentMemories
   ═══════════════════════════════════════════════════════════════════ */

export interface RecentMemoriesProps {
  memories: {
    mem: Mem;
    wingName: string;
    roomName: string;
    wingId: string;
  }[];
  onMemoryClick: (mem: Mem, wingId: string, roomId: string) => void;
  isMobile: boolean;
}

function relativeDate(iso: string | undefined, t: (key: string, params?: Record<string, string>) => string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("recent.justNow");
  if (mins < 60) return t("recent.minutesAgo", { count: String(mins) });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("recent.hoursAgo", { count: String(hrs) });
  const days = Math.floor(hrs / 24);
  if (days < 7) return t("recent.daysAgo", { count: String(days) });
  return t("recent.weeksAgo", { count: String(Math.floor(days / 7)) });
}

export function RecentMemories({
  memories,
  onMemoryClick,
  isMobile,
}: RecentMemoriesProps) {
  const { t } = useAtriumT();
  const [showAll, setShowAll] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const INITIAL_LIMIT = 6;
  const visibleMemories = showAll ? memories : memories.slice(0, INITIAL_LIMIT);
  const hasMore = memories.length > INITIAL_LIMIT;

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
        {visibleMemories.map((item, i) => (
          <MemoryCard
            key={item.mem.id}
            item={item}
            index={i}
            typeIcons={typeIcons}
            onMemoryClick={onMemoryClick}
          />
        ))}
      </div>

      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: T.color.terracotta,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.5rem 0",
            marginTop: "0.5rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            letterSpacing: "0.02em",
            transition: "color 0.2s ease",
          }}
        >
          {t("recent.showMore")}
          <span style={{ fontSize: "0.875rem" }}>&rarr;</span>
        </button>
      )}
    </div>
  );
}

const MemoryCard = React.memo(function MemoryCard({
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
  const { t } = useAtriumT();
  const [hovered, setHovered] = useState(false);
  const { mem, wingName, roomName, wingId } = item;

  const bg = `hsl(${mem.hue}, ${mem.s}%, ${mem.l}%)`;
  const icon = typeIcons[mem.type] || "\uD83D\uDCCC";
  const dateStr = relativeDate(mem.createdAt, t);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onMemoryClick(mem, wingId, "")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onMemoryClick(mem, wingId, "");
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
          <WingIcon wingId={wingId} size={14} color={T.color.muted} />
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
});
