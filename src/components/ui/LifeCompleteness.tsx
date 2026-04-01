"use client";

import React, { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

/* ═══════════════════════════════════════════════════════════════════
   Life Areas — canonical list
   ═══════════════════════════════════════════════════════════════════ */

export const LIFE_AREAS = [
  { id: "childhood", name: "Childhood", icon: "🧒", target: 15, color: "#E8A87C" },
  { id: "family", name: "Family & Love", icon: "💕", target: 20, color: "#C17F59" },
  { id: "career", name: "Career & Purpose", icon: "💼", target: 15, color: "#8B7355" },
  { id: "travel", name: "Adventures", icon: "✈️", target: 15, color: "#4A6741" },
  { id: "milestones", name: "Milestones", icon: "🏆", target: 10, color: "#D4AF37" },
  { id: "creativity", name: "Passions", icon: "🎨", target: 10, color: "#7B68AE" },
  { id: "wisdom", name: "Wisdom & Values", icon: "📖", target: 10, color: "#6B8E9B" },
  { id: "daily", name: "Daily Life", icon: "☀️", target: 10, color: "#C9956B" },
  { id: "relationships", name: "Friendships", icon: "🤝", target: 10, color: "#85A886" },
] as const;

/* ═══════════════════════════════════════════════════════════════════
   CSS keyframes (injected once)
   ═══════════════════════════════════════════════════════════════════ */

const STYLE_ID = "life-completeness-keyframes";

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes lc-ringDraw {
      from { stroke-dashoffset: var(--lc-circumference); }
      to   { stroke-dashoffset: var(--lc-target-offset); }
    }
    @keyframes lc-fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes lc-fadeSlideUp {
      from { opacity: 0; transform: translateY(0.75rem); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes lc-pulse {
      0%, 100% { opacity: 0.35; transform: scale(1); }
      50%      { opacity: 0.65; transform: scale(1.05); }
    }
    @keyframes lc-miniRingDraw {
      from { stroke-dashoffset: var(--lc-mini-circ); }
      to   { stroke-dashoffset: var(--lc-mini-offset); }
    }
  `;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════════════════════════════
   i18n helper
   ═══════════════════════════════════════════════════════════════════ */

function useAtriumT() {
  return useTranslation("atrium" as "common");
}

/* ═══════════════════════════════════════════════════════════════════
   Component 1 — LifeCompletenessRing
   ═══════════════════════════════════════════════════════════════════ */

interface LifeCompletenessRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
}

export function LifeCompletenessRing({
  percentage,
  size = 10,
  strokeWidth = 0.5,
  animated = true,
}: LifeCompletenessRingProps) {
  const { t } = useAtriumT();

  useEffect(ensureKeyframes, []);

  const clamped = Math.max(0, Math.min(100, percentage));
  // Convert rem to px for SVG viewBox (use 16 as base)
  const sizePx = size * 16;
  const swPx = strokeWidth * 16;
  const radius = (sizePx - swPx) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (clamped / 100) * circumference;

  const gradientId = "lc-ring-gradient";

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${size}rem`,
        height: `${size}rem`,
        margin: "0 auto",
      }}
    >
      {/* Subtle glow behind the ring */}
      <div
        style={{
          position: "absolute",
          inset: "0.5rem",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${T.color.gold}20 0%, transparent 70%)`,
          animation: animated ? "lc-pulse 3.5s ease-in-out infinite" : "none",
        }}
      />

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${sizePx} ${sizePx}`}
        style={{ position: "absolute", transform: "rotate(-90deg)" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={T.color.goldDark} />
            <stop offset="50%" stopColor={T.color.gold} />
            <stop offset="100%" stopColor={T.color.goldLight} />
          </linearGradient>
        </defs>

        {/* Track circle */}
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={radius}
          fill="none"
          stroke={T.color.cream}
          strokeWidth={swPx}
        />

        {/* Filled arc */}
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={swPx}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? undefined : targetOffset}
          style={
            animated
              ? ({
                  "--lc-circumference": circumference,
                  "--lc-target-offset": targetOffset,
                  animation: "lc-ringDraw 1.4s cubic-bezier(0.4,0,0.2,1) both",
                } as React.CSSProperties)
              : undefined
          }
        />
      </svg>

      {/* Center text */}
      <div
        style={{
          position: "relative",
          textAlign: "center",
          animation: animated ? "lc-fadeIn 0.8s ease-out 0.7s both" : "none",
        }}
      >
        <div
          style={{
            fontFamily: T.font.display,
            fontWeight: 300,
            fontSize: `${size * 0.3}rem`,
            lineHeight: 1,
            color: T.color.charcoal,
            letterSpacing: "-0.02em",
          }}
        >
          {Math.round(clamped)}%
        </div>
        <div
          style={{
            fontFamily: T.font.body,
            fontSize: `${size * 0.075}rem`,
            color: T.color.muted,
            marginTop: "0.125rem",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {t("life.complete")}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Component 2 — LifeAreaGrid
   ═══════════════════════════════════════════════════════════════════ */

interface LifeAreaGridArea {
  id: string;
  name: string;
  icon: string;
  count: number;
  target: number;
  color: string;
}

interface LifeAreaGridProps {
  areas: LifeAreaGridArea[];
  onAreaClick: (areaId: string) => void;
  isMobile: boolean;
}

/* --- Mini circular progress for each area card --- */

function MiniProgress({
  count,
  target,
  color,
  isComplete,
}: {
  count: number;
  target: number;
  color: string;
  isComplete: boolean;
}) {
  const size = 32;
  const sw = 3;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, count / target) : 0;
  const offset = circ - pct * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={T.color.cream}
        strokeWidth={sw}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={isComplete ? T.color.gold : color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={circ}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={
          {
            "--lc-mini-circ": circ,
            "--lc-mini-offset": offset,
            animation: "lc-miniRingDraw 0.8s ease-out both",
          } as React.CSSProperties
        }
      />
      {isComplete && (
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={T.color.gold}
          fontSize="14"
          fontWeight="bold"
        >
          &#10003;
        </text>
      )}
    </svg>
  );
}

/* --- Area card --- */

function AreaCard({
  area,
  index,
  onClick,
}: {
  area: LifeAreaGridArea;
  index: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { t } = useAtriumT();

  const isEmpty = area.count === 0;
  const isComplete = area.count >= area.target && area.target > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(0.5rem)",
        WebkitBackdropFilter: "blur(0.5rem)",
        border: isEmpty
          ? `1px dashed ${T.color.muted}60`
          : isComplete
          ? `1px solid ${T.color.gold}80`
          : `1px solid ${T.color.cream}`,
        borderRadius: "0.75rem",
        padding: "0.875rem",
        cursor: "pointer",
        transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
        transform: hovered ? "translateY(-0.1875rem)" : "translateY(0)",
        boxShadow: hovered
          ? isComplete
            ? `0 0.375rem 1rem ${T.color.gold}25`
            : `0 0.375rem 1rem rgba(0,0,0,0.09)`
          : "0 0.0625rem 0.25rem rgba(0,0,0,0.04)",
        animation: `lc-fadeSlideUp 0.4s ease-out ${0.3 + index * 0.07}s both`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.375rem",
        textAlign: "center",
        ...(hovered && !isComplete && !isEmpty
          ? { borderColor: `${area.color}60` }
          : {}),
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{area.icon}</span>

      {/* Name */}
      <span
        style={{
          fontFamily: T.font.body,
          fontSize: "0.75rem",
          fontWeight: 600,
          color: T.color.charcoal,
          lineHeight: 1.2,
        }}
      >
        {area.name}
      </span>

      {/* Mini progress ring or Start label */}
      {isEmpty ? (
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.625rem",
            fontWeight: 600,
            color: T.color.terracotta,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginTop: "0.125rem",
          }}
        >
          {t("life.start")}
        </span>
      ) : (
        <MiniProgress
          count={area.count}
          target={area.target}
          color={area.color}
          isComplete={isComplete}
        />
      )}

      {/* Count / target */}
      {!isEmpty && (
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.625rem",
            color: T.color.muted,
          }}
        >
          {area.count} / {area.target}
        </span>
      )}

      {/* Complete badge */}
      {isComplete && (
        <div
          style={{
            position: "absolute",
            top: "-0.3125rem",
            right: "-0.3125rem",
            width: "1.125rem",
            height: "1.125rem",
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldLight})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.5625rem",
            color: T.color.white,
            boxShadow: `0 0.125rem 0.375rem ${T.color.gold}40`,
          }}
        >
          &#10003;
        </div>
      )}
    </div>
  );
}

export function LifeAreaGrid({ areas, onAreaClick, isMobile }: LifeAreaGridProps) {
  useEffect(ensureKeyframes, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
        gap: "0.75rem",
      }}
    >
      {areas.map((area, i) => (
        <AreaCard
          key={area.id}
          area={area}
          index={i}
          onClick={() => onAreaClick(area.id)}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Component 3 — LifePrompt
   ═══════════════════════════════════════════════════════════════════ */

interface LifePromptProps {
  percentage: number;
  nextSuggestion?: { areaName: string; icon: string };
  onAction: () => void;
  isMobile: boolean;
}

function getPromptGradient(pct: number): string {
  if (pct < 25) return `linear-gradient(135deg, ${T.color.cream}E0, ${T.color.sandstone}60)`;
  if (pct < 50) return `linear-gradient(135deg, ${T.color.sandstone}80, ${T.color.terracotta}25)`;
  if (pct < 75) return `linear-gradient(135deg, ${T.color.terracotta}30, ${T.color.gold}20)`;
  return `linear-gradient(135deg, ${T.color.gold}30, ${T.color.goldLight}20)`;
}

function getMotivationKey(pct: number): string {
  if (pct < 25) return "life.motivation25";
  if (pct < 50) return "life.motivation50";
  if (pct < 75) return "life.motivation75";
  return "life.motivation100";
}

export function LifePrompt({
  percentage,
  nextSuggestion,
  onAction,
  isMobile,
}: LifePromptProps) {
  const { t } = useAtriumT();

  useEffect(ensureKeyframes, []);

  const clamped = Math.max(0, Math.min(100, percentage));
  const motivationKey = getMotivationKey(clamped);
  const gradient = getPromptGradient(clamped);

  return (
    <div
      style={{
        background: gradient,
        backdropFilter: "blur(0.75rem)",
        WebkitBackdropFilter: "blur(0.75rem)",
        borderRadius: "0.75rem",
        border: `1px solid ${clamped >= 75 ? T.color.gold + "40" : T.color.cream}`,
        padding: isMobile ? "1rem" : "1.25rem 1.5rem",
        textAlign: "center",
        animation: "lc-fadeSlideUp 0.5s ease-out 0.6s both",
      }}
    >
      {/* Motivational message */}
      <p
        style={{
          fontFamily: T.font.display,
          fontSize: isMobile ? "0.9375rem" : "1.0625rem",
          fontWeight: 400,
          fontStyle: "italic",
          color: T.color.walnut,
          margin: 0,
          lineHeight: 1.5,
          marginBottom: nextSuggestion ? "0.5rem" : "0.875rem",
        }}
      >
        {t(motivationKey)}
      </p>

      {/* Next suggestion */}
      {nextSuggestion && (
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.muted,
            margin: "0 0 0.875rem",
          }}
        >
          {t("life.next")}: {nextSuggestion.icon} {nextSuggestion.areaName}
        </p>
      )}

      {/* CTA button */}
      <button
        onClick={onAction}
        style={{
          fontFamily: T.font.body,
          fontSize: "0.875rem",
          fontWeight: 600,
          color: T.color.white,
          background:
            clamped >= 75
              ? `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldLight})`
              : `linear-gradient(135deg, ${T.color.terracotta}, ${T.era.roman.mosaic})`,
          border: "none",
          borderRadius: "0.5rem",
          padding: "0.6875rem 1.5rem",
          cursor: "pointer",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          boxShadow:
            clamped >= 75
              ? `0 0.125rem 0.5rem ${T.color.gold}40`
              : `0 0.125rem 0.5rem ${T.color.terracotta}40`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-0.0625rem)";
          e.currentTarget.style.boxShadow =
            clamped >= 75
              ? `0 0.25rem 0.875rem ${T.color.gold}55`
              : `0 0.25rem 0.875rem ${T.color.terracotta}55`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow =
            clamped >= 75
              ? `0 0.125rem 0.5rem ${T.color.gold}40`
              : `0 0.125rem 0.5rem ${T.color.terracotta}40`;
        }}
      >
        {t("life.continueCta")}
      </button>
    </div>
  );
}
