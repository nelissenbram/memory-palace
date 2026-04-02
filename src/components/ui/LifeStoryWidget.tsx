"use client";

import React, { useState } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import TuscanCard from "./TuscanCard";
import { TuscanSectionHeader } from "./TuscanCard";

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
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function useAtriumT() {
  return useTranslation("atrium" as "common");
}

/** Color-coded ring based on completeness tier */
function getRingColor(pct: number): { start: string; end: string } {
  if (pct < 25) return { start: T.color.terracotta, end: T.color.gold };
  if (pct < 75) return { start: T.color.gold, end: T.color.goldLight };
  return { start: T.color.sage, end: T.color.goldLight };
}

function getMotivationKey(pct: number): string {
  if (pct < 25) return "lifeStory.motivation25";
  if (pct < 50) return "lifeStory.motivation50";
  if (pct < 75) return "lifeStory.motivation75";
  return "lifeStory.motivation100";
}

/* ═══════════════════════════════════════════════════════════════════
   Completeness Ring (SVG) — now with contextual labels
   ═══════════════════════════════════════════════════════════════════ */

function CompletenessRing({
  percentage,
  isMobile,
  capturedLabel,
  statsLabel,
}: {
  percentage: number;
  isMobile: boolean;
  capturedLabel: string;
  statsLabel: string;
}) {
  const size = isMobile ? 160 : 200;
  const strokeWidth = isMobile ? 8 : 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const targetOffset = circumference - (clamped / 100) * circumference;
  const ringColor = getRingColor(clamped);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      {/* Ring */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: `${size / 16}rem`,
          height: `${size / 16}rem`,
        }}
      >
        {/* Pulsing glow behind ring */}
        <div
          style={{
            position: "absolute",
            inset: "0.5rem",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${ringColor.start}22 0%, transparent 70%)`,
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
          {/* Gradient definition — color-coded by tier */}
          <defs>
            <linearGradient id="lsw-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={ringColor.start} />
              <stop offset="100%" stopColor={ringColor.end} />
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
            {capturedLabel}
          </div>
        </div>
      </div>

      {/* Stats line below ring */}
      <div
        style={{
          fontFamily: T.font.body,
          fontSize: "0.75rem",
          color: T.color.muted,
          textAlign: "center",
          animation: "lsw-fadeIn 0.6s ease-out 0.8s both",
        }}
      >
        {statsLabel}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Life Area Card — with improved empty state + CTA text
   ═══════════════════════════════════════════════════════════════════ */

function LifeAreaCard({
  area,
  index,
  onExplore,
  emptyCtaLabel,
  ofLabel,
}: {
  area: LifeArea;
  index: number;
  onExplore: () => void;
  emptyCtaLabel: string;
  ofLabel: string;
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
        background: isEmpty
          ? `linear-gradient(135deg, rgba(255,255,255,0.55), ${T.color.gold}08)`
          : "rgba(255,255,255,0.55)",
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
        animation: isEmpty
          ? `lsw-fadeSlideUp 0.4s ease-out ${0.8 + index * 0.06}s both, lsw-ctaGlow 2.5s ease-in-out infinite`
          : `lsw-fadeSlideUp 0.4s ease-out ${0.8 + index * 0.06}s both`,
        position: "relative",
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

      {/* Count or CTA label */}
      <div
        style={{
          fontFamily: T.font.body,
          fontSize: "0.6875rem",
          color: isEmpty ? T.color.terracotta : T.color.muted,
          fontWeight: isEmpty ? 600 : 400,
        }}
      >
        {isEmpty
          ? emptyCtaLabel
          : `${area.memoriesCount} ${ofLabel} ${area.suggestedCount}`}
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

  const motivationKey = getMotivationKey(overallCompleteness);

  return (
    <TuscanCard variant="glass" padding={isMobile ? "1.25rem 1rem" : "1.5rem 1.75rem"}>
      {/* Title */}
      <TuscanSectionHeader>{t("lifeStory.title")}</TuscanSectionHeader>

      {/* NEW i18n key: lifeStory.subtitle
          Explanatory subtitle so users understand the widget's purpose.
          Example value: "Map your life's chapters. Each area represents a
          part of your story — add memories to build a complete portrait." */}
      <p
        style={{
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          color: T.color.walnut,
          lineHeight: 1.55,
          margin: "0 0 1.25rem",
          animation: "lsw-fadeIn 0.5s ease-out 0.2s both",
        }}
      >
        {t("lifeStory.subtitle")}
      </p>

      {/* Completeness Ring — now with contextual labels */}
      <CompletenessRing
        percentage={overallCompleteness}
        isMobile={isMobile}
        /* NEW i18n key: lifeStory.captured
           Short label inside the ring. Example: "captured" */
        capturedLabel={t("lifeStory.captured")}
        /* Stats line uses existing keys + interpolation.
           NEW i18n key: lifeStory.ringStats
           Example: "{areas} life areas \u2022 {memories} memories recorded"
           We build the string from parts for flexibility. */
        statsLabel={`${lifeAreas.length} ${t("lifeStory.areasCount")} \u2022 ${totalMemories} ${t("lifeStory.memoriesRecorded")}`}
      />

      {/* Spacer before grid */}
      <div style={{ height: "1.25rem" }} />

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
            /* NEW i18n key: lifeStory.startAdding
               CTA shown on empty area cards. Example: "Start adding" */
            emptyCtaLabel={t("lifeStory.startAdding")}
            /* NEW i18n key: lifeStory.of
               Separator for "3 of 5". Example: "of" */
            ofLabel={t("lifeStory.of")}
          />
        ))}
      </div>

      {/* Motivational prompt — contextual based on progress tier */}
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

      {/* Dual CTA Buttons */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          animation: "lsw-fadeSlideUp 0.5s ease-out 1.4s both",
        }}
      >
        {/* Primary: Start an Interview */}
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
            width: isMobile ? "100%" : "auto",
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

        {/* Secondary: Add a Memory */}
        {/* NEW i18n key: lifeStory.addMemory
            Secondary CTA label. Example: "Add a Memory" */}
        <button
          onClick={() => onExploreArea("_manual")}
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            color: T.color.terracotta,
            background: "transparent",
            border: `1.5px solid ${T.color.terracotta}`,
            borderRadius: "0.5rem",
            padding: "0.6875rem 1.75rem",
            cursor: "pointer",
            transition: "transform 0.2s ease, background 0.2s ease",
            width: isMobile ? "100%" : "auto",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-0.0625rem)";
            e.currentTarget.style.background = `${T.color.terracotta}0A`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          {t("lifeStory.addMemory")}
        </button>
      </div>
    </TuscanCard>
  );
}
