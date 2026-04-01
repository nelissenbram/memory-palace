"use client";

import React, { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface LifeArea {
  id: string;
  name: string;
  icon: string;
  memoriesCount: number;
  suggestedCount: number;
}

interface LifeStoryWidgetProps {
  lifeAreas: LifeArea[];
  overallCompleteness: number; // 0-100
  totalMemories: number;
  onExploreArea: (areaId: string) => void;
  onStartInterview: () => void;
  isMobile: boolean;
}

/* ═══════════════════════════════════════════════════════════════════
   CSS keyframes (injected once)
   ═══════════════════════════════════════════════════════════════════ */

const STYLE_ID = "life-story-widget-keyframes";

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes lsw-ringDraw {
      from { stroke-dashoffset: var(--lsw-circumference); }
      to   { stroke-dashoffset: var(--lsw-target-offset); }
    }
    @keyframes lsw-fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes lsw-fadeSlideUp {
      from { opacity: 0; transform: translateY(0.75rem); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes lsw-pulse {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50%      { opacity: 0.7; transform: scale(1.06); }
    }
    @keyframes lsw-ctaGlow {
      0%, 100% { box-shadow: 0 0 0.5rem rgba(212, 175, 55, 0.15); }
      50%      { box-shadow: 0 0 1rem rgba(212, 175, 55, 0.35); }
    }
  `;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function useAtriumT() {
  return useTranslation("atrium" as "common");
}

function getMotivationKey(pct: number): string {
  if (pct < 25) return "lifeStory.motivation25";
  if (pct < 50) return "lifeStory.motivation50";
  if (pct < 75) return "lifeStory.motivation75";
  return "lifeStory.motivation100";
}

/* ═══════════════════════════════════════════════════════════════════
   Completeness Ring (SVG)
   ═══════════════════════════════════════════════════════════════════ */

function CompletenessRing({
  percentage,
  isMobile,
  label,
}: {
  percentage: number;
  isMobile: boolean;
  label: string;
}) {
  const size = isMobile ? 160 : 200;
  const strokeWidth = isMobile ? 8 : 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const targetOffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${size / 16}rem`,
        height: `${size / 16}rem`,
        margin: "0 auto",
      }}
    >
      {/* Pulsing glow behind ring */}
      <div
        style={{
          position: "absolute",
          inset: "0.5rem",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${T.color.gold}22 0%, transparent 70%)`,
          animation: "lsw-pulse 3s ease-in-out infinite",
        }}
      />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: "absolute", transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={T.color.cream}
          strokeWidth={strokeWidth}
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="lsw-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={T.color.gold} />
            <stop offset="100%" stopColor={T.color.goldLight} />
          </linearGradient>
        </defs>
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#lsw-ring-grad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={targetOffset}
          style={{
            "--lsw-circumference": circumference,
            "--lsw-target-offset": targetOffset,
            animation: "lsw-ringDraw 1.2s ease-out both",
          } as React.CSSProperties}
        />
      </svg>

      {/* Center text */}
      <div
        style={{
          position: "relative",
          textAlign: "center",
          animation: "lsw-fadeIn 0.8s ease-out 0.6s both",
        }}
      >
        <div
          style={{
            fontFamily: T.font.display,
            fontWeight: 300,
            fontSize: isMobile ? "2.5rem" : "3rem",
            lineHeight: 1,
            color: T.color.charcoal,
          }}
        >
          {Math.round(clamped)}%
        </div>
        <div
          style={{
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            color: T.color.muted,
            marginTop: "0.125rem",
            maxWidth: "6rem",
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Life Area Card
   ═══════════════════════════════════════════════════════════════════ */

function LifeAreaCard({
  area,
  index,
  onExplore,
}: {
  area: LifeArea;
  index: number;
  onExplore: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pct =
    area.suggestedCount > 0
      ? Math.min(100, (area.memoriesCount / area.suggestedCount) * 100)
      : 0;
  const isComplete = area.memoriesCount >= area.suggestedCount && area.suggestedCount > 0;
  const isEmpty = area.memoriesCount === 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onExplore}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onExplore();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(0.5rem)",
        WebkitBackdropFilter: "blur(0.5rem)",
        border: `1px solid ${isEmpty ? `${T.color.gold}40` : T.color.cream}`,
        borderRadius: "0.75rem",
        padding: "0.75rem",
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        transform: hovered ? "translateY(-0.125rem)" : "translateY(0)",
        boxShadow: hovered
          ? "0 0.25rem 0.75rem rgba(0,0,0,0.08)"
          : "0 0.0625rem 0.1875rem rgba(0,0,0,0.04)",
        animation: `lsw-fadeSlideUp 0.4s ease-out ${0.8 + index * 0.06}s both`,
        position: "relative",
        ...(isEmpty
          ? { animation: `lsw-fadeSlideUp 0.4s ease-out ${0.8 + index * 0.06}s both, lsw-ctaGlow 2.5s ease-in-out infinite` }
          : {}),
      }}
    >
      {/* Golden checkmark badge for complete areas */}
      {isComplete && (
        <div
          style={{
            position: "absolute",
            top: "-0.375rem",
            right: "-0.375rem",
            width: "1.25rem",
            height: "1.25rem",
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldLight})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.625rem",
            color: T.color.white,
            boxShadow: `0 0.125rem 0.375rem ${T.color.gold}40`,
          }}
        >
          &#10003;
        </div>
      )}

      {/* Icon + Name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          marginBottom: "0.5rem",
        }}
      >
        <span style={{ fontSize: "1.125rem" }}>{area.icon}</span>
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: T.color.charcoal,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {area.name}
        </span>
      </div>

      {/* Mini progress bar */}
      <div
        style={{
          height: "0.25rem",
          borderRadius: "0.125rem",
          background: T.color.cream,
          overflow: "hidden",
          marginBottom: "0.25rem",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: "0.125rem",
            width: `${pct}%`,
            background: isComplete
              ? `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight})`
              : `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.gold})`,
            transition: "width 0.6s ease-out",
          }}
        />
      </div>

      {/* Count */}
      <div
        style={{
          fontFamily: T.font.body,
          fontSize: "0.6875rem",
          color: T.color.muted,
        }}
      >
        {area.memoriesCount} / {area.suggestedCount}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export default function LifeStoryWidget({
  lifeAreas,
  overallCompleteness,
  totalMemories,
  onExploreArea,
  onStartInterview,
  isMobile,
}: LifeStoryWidgetProps) {
  const { t } = useAtriumT();

  useEffect(ensureKeyframes, []);

  const motivationKey = getMotivationKey(overallCompleteness);

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.45)",
    backdropFilter: "blur(1rem)",
    WebkitBackdropFilter: "blur(1rem)",
    borderRadius: "1rem",
    border: `1px solid ${T.color.cream}`,
    borderTop: `2px solid ${T.color.gold}`,
    padding: isMobile ? "1.25rem 1rem" : "1.5rem 1.75rem",
    animation: "lsw-fadeSlideUp 0.5s ease-out both",
  };

  return (
    <div style={cardStyle}>
      {/* Title */}
      <h3
        style={{
          fontFamily: T.font.display,
          fontSize: "1.125rem",
          fontWeight: 600,
          color: T.color.charcoal,
          margin: 0,
          textAlign: "center",
          marginBottom: "0.25rem",
        }}
      >
        {t("lifeStory.title")}
      </h3>
      <div
        style={{
          height: "0.125rem",
          width: "3rem",
          background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight})`,
          borderRadius: "0.125rem",
          margin: "0 auto 1.25rem",
        }}
      />

      {/* Completeness Ring */}
      <CompletenessRing
        percentage={overallCompleteness}
        isMobile={isMobile}
        label={t("lifeStory.completeness")}
      />

      {/* Total memories note */}
      <div
        style={{
          fontFamily: T.font.body,
          fontSize: "0.75rem",
          color: T.color.muted,
          textAlign: "center",
          marginTop: "0.5rem",
          marginBottom: "1.25rem",
          animation: "lsw-fadeIn 0.6s ease-out 0.8s both",
        }}
      >
        {totalMemories} {t("lifeStory.memoriesRecorded")}
      </div>

      {/* Life Area Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
          gap: "0.625rem",
          marginBottom: "1.25rem",
        }}
      >
        {lifeAreas.map((area, i) => (
          <LifeAreaCard
            key={area.id}
            area={area}
            index={i}
            onExplore={() => onExploreArea(area.id)}
          />
        ))}
      </div>

      {/* Motivational prompt */}
      <p
        style={{
          fontFamily: T.font.display,
          fontSize: "0.9375rem",
          fontWeight: 400,
          fontStyle: "italic",
          color: T.color.walnut,
          textAlign: "center",
          margin: "0 0 1.25rem",
          lineHeight: 1.5,
          animation: "lsw-fadeIn 0.6s ease-out 1.2s both",
        }}
      >
        {t(motivationKey)}
      </p>

      {/* CTA Button */}
      <div style={{ textAlign: "center" }}>
        <button
          onClick={onStartInterview}
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            color: T.color.white,
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.era.roman.mosaic})`,
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.75rem 1.75rem",
            cursor: "pointer",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            boxShadow: `0 0.125rem 0.5rem ${T.color.terracotta}40`,
            animation: "lsw-fadeSlideUp 0.5s ease-out 1.4s both",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-0.0625rem)";
            e.currentTarget.style.boxShadow = `0 0.25rem 0.75rem ${T.color.terracotta}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = `0 0.125rem 0.5rem ${T.color.terracotta}40`;
          }}
        >
          {t("lifeStory.recordCta")}
        </button>
      </div>
    </div>
  );
}
