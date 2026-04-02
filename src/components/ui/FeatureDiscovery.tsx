"use client";

import React, { useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { TuscanSectionHeader } from "./TuscanCard";
import { EASE, ANIM } from "./TuscanStyles";

/* ─────────────────────────────────────────────
   FeatureDiscovery — surfaces key features
   that were hidden behind the plus/tools button
   ───────────────────────────────────────────── */

export interface FeatureDiscoveryProps {
  onMemoryMap: () => void;
  onTimeline: () => void;
  onStatistics: () => void;
  onFamilyTree: () => void;
  isMobile: boolean;
}

/* ── SVG Icons (32x32 viewBox) ── */

function MapIcon() {
  return (
    <svg
      width="2rem"
      height="2rem"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Globe outline */}
      <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" />
      {/* Latitude lines */}
      <ellipse cx="16" cy="16" rx="12" ry="5" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <ellipse cx="16" cy="16" rx="5" ry="12" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      {/* Pin marker */}
      <circle cx="20" cy="11" r="2.5" fill={T.color.gold} />
      <path d="M20 13.5 L20 17" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      {/* Second pin */}
      <circle cx="11" cy="18" r="1.5" fill="rgba(255,255,255,0.7)" />
      <path d="M11 19.5 L11 22" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function TimelineIcon() {
  return (
    <svg
      width="2rem"
      height="2rem"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Horizontal line */}
      <line x1="4" y1="16" x2="28" y2="16" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Dot markers */}
      <circle cx="8" cy="16" r="2.5" fill="rgba(255,255,255,0.7)" />
      <circle cx="16" cy="16" r="3" fill={T.color.gold} />
      <circle cx="23" cy="16" r="2" fill="rgba(255,255,255,0.6)" />
      {/* Vertical ticks */}
      <line x1="8" y1="10" x2="8" y2="13" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round" />
      <line x1="16" y1="9" x2="16" y2="12.5" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="23" y1="10.5" x2="23" y2="13.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function InsightsIcon() {
  return (
    <svg
      width="2rem"
      height="2rem"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Bar chart bars */}
      <rect x="5" y="18" width="4" height="8" rx="1" fill="rgba(255,255,255,0.5)" />
      <rect x="11" y="12" width="4" height="14" rx="1" fill="rgba(255,255,255,0.7)" />
      <rect x="17" y="8" width="4" height="18" rx="1" fill={T.color.gold} />
      <rect x="23" y="14" width="4" height="12" rx="1" fill="rgba(255,255,255,0.6)" />
      {/* Trend line */}
      <polyline
        points="7,17 13,11 19,7 25,13"
        stroke={T.color.gold}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function FamilyTreeIcon() {
  return (
    <svg
      width="2rem"
      height="2rem"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Root node */}
      <circle cx="16" cy="7" r="3" fill={T.color.gold} />
      {/* Branches */}
      <line x1="16" y1="10" x2="16" y2="14" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
      <line x1="16" y1="14" x2="8" y2="19" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="14" x2="24" y2="19" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Child nodes */}
      <circle cx="8" cy="21" r="2.5" fill="rgba(255,255,255,0.7)" />
      <circle cx="24" cy="21" r="2.5" fill="rgba(255,255,255,0.7)" />
      {/* Grandchild branches */}
      <line x1="8" y1="23.5" x2="5" y2="27" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinecap="round" />
      <line x1="8" y1="23.5" x2="11" y2="27" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinecap="round" />
      {/* Grandchild nodes */}
      <circle cx="5" cy="28" r="1.5" fill="rgba(255,255,255,0.5)" />
      <circle cx="11" cy="28" r="1.5" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}

/* ── Feature card data ── */

interface FeatureCardDef {
  key: string;
  icon: React.FC;
  titleKey: string;
  descKey: string;
  gradient: string;
  glowColor: string;
}

const FEATURES: FeatureCardDef[] = [
  {
    key: "map",
    icon: MapIcon,
    titleKey: "mapTitle",
    descKey: "mapDesc",
    gradient: `linear-gradient(135deg, ${T.color.sage}, #3A5A32, #2E4A28)`,
    glowColor: "rgba(74, 103, 65, 0.4)",
  },
  {
    key: "timeline",
    icon: TimelineIcon,
    titleKey: "timelineTitle",
    descKey: "timelineDesc",
    gradient: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark}, #9A7A20)`,
    glowColor: "rgba(212, 175, 55, 0.35)",
  },
  {
    key: "insights",
    icon: InsightsIcon,
    titleKey: "insightsTitle",
    descKey: "insightsDesc",
    gradient: `linear-gradient(135deg, ${T.color.charcoal}, #3A3A38, #1E1E1C)`,
    glowColor: "rgba(44, 44, 42, 0.5)",
  },
  {
    key: "family",
    icon: FamilyTreeIcon,
    titleKey: "familyTitle",
    descKey: "familyDesc",
    gradient: `linear-gradient(135deg, ${T.color.terracotta}, #A86840, #8A5030)`,
    glowColor: "rgba(193, 127, 89, 0.35)",
  },
];

/* ── Individual card ── */

function FeatureCard({
  def,
  onClick,
  index,
}: {
  def: FeatureCardDef;
  onClick: () => void;
  index: number;
}) {
  const { t } = useTranslation("discover");
  const cardRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "scale(1.04)";
    el.style.boxShadow = `0 0.5rem 2rem ${def.glowColor}, 0 0 1rem ${def.glowColor}`;
  }, [def.glowColor]);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = "";
    el.style.boxShadow = "";
  }, []);

  const Icon = def.icon;

  return (
    <button
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background: def.gradient,
        borderRadius: "0.875rem",
        border: "1px solid rgba(255,255,255,0.12)",
        padding: "1.25rem 1rem 1rem",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        minWidth: "10rem",
        flex: "1 1 0",
        position: "relative",
        overflow: "hidden",
        transition: `transform 0.3s ${EASE}, box-shadow 0.3s ${EASE}`,
        animation: `${ANIM.tuscanFadeSlideUp} 0.5s ${EASE} ${index * 0.08}s both`,
        boxShadow: "0 0.25rem 1rem rgba(0,0,0,0.12)",
      }}
      aria-label={t(def.titleKey)}
    >
      {/* Decorative gradient overlay for depth */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Icon container */}
      <div
        style={{
          width: "3.5rem",
          height: "3.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          position: "relative",
        }}
      >
        <Icon />
      </div>

      {/* Title */}
      <span
        style={{
          fontFamily: T.font.display,
          fontSize: "1rem",
          fontWeight: 600,
          color: T.color.white,
          letterSpacing: "0.01em",
          lineHeight: 1.3,
          textAlign: "center",
          position: "relative",
        }}
      >
        {t(def.titleKey)}
      </span>

      {/* Description */}
      <span
        style={{
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          color: "rgba(255,255,255,0.72)",
          lineHeight: 1.4,
          textAlign: "center",
          position: "relative",
        }}
      >
        {t(def.descKey)}
      </span>
    </button>
  );
}

/* ── Main component ── */

export default function FeatureDiscovery({
  onMemoryMap,
  onTimeline,
  onStatistics,
  onFamilyTree,
  isMobile,
}: FeatureDiscoveryProps) {
  const { t } = useTranslation("discover");

  const handlers = [onMemoryMap, onTimeline, onStatistics, onFamilyTree];

  return (
    <section aria-label={t("sectionTitle")}>
      <TuscanSectionHeader>{t("sectionTitle")}</TuscanSectionHeader>

      {isMobile ? (
        /* ── Mobile: horizontal scroll strip ── */
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            overflowX: "auto",
            overflowY: "hidden",
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
            paddingBottom: "0.5rem",
            margin: "0 -0.25rem",
            padding: "0 0.25rem 0.5rem",
          }}
          className="aw-scroll-strip"
        >
          {FEATURES.map((def, i) => (
            <div
              key={def.key}
              style={{
                scrollSnapAlign: "start",
                flexShrink: 0,
                width: "10rem",
              }}
            >
              <FeatureCard def={def} onClick={handlers[i]} index={i} />
            </div>
          ))}
        </div>
      ) : (
        /* ── Desktop: equal-width grid row ── */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
          }}
        >
          {FEATURES.map((def, i) => (
            <FeatureCard key={def.key} def={def} onClick={handlers[i]} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
