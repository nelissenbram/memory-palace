"use client";

import React, { useMemo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import TuscanCard from "./TuscanCard";

/* ═══════════════════════════════════════════════════════════════════
   i18n keys (namespace: "atrium")
   ─────────────────────────────────────────────────────────────────
   profile.title              → "Your Personal Portrait"
   profile.subtitle           → "AI-powered insights from your memory collection"
   profile.lifeChapters       → "Life Chapters"
   profile.memoryStyle        → "Memory Style"
   profile.coverageMap        → "Coverage"
   profile.exploreProfile     → "Explore Full Profile"
   profile.helpAiLearn        → "Help AI learn more"
   profile.emptyState         → "Start adding memories and watch your portrait emerge"
   profile.mostActive         → "Most active"
   profile.daysSinceFirst     → "days of memories"
   profile.visualStoryteller  → "Visual storyteller"
   profile.mixedStoryteller   → "Mixed storyteller"
   profile.writtenStoryteller → "Written storyteller"
   ═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface PersonalProfileProps {
  totalMemories: number;
  totalWings: number;
  wingsData: { id: string; name: string; icon: string; memoryCount: number }[];
  userName: string | null;
  onViewFullProfile: () => void;
  onStartInterview: () => void;
  isMobile: boolean;
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function useAtriumT() {
  return useTranslation("atrium" as "common");
}

/** CSS keyframes injected once via <style> tag */
const KEYFRAMES = `
@keyframes pp-fadeIn {
  from { opacity: 0; transform: translateY(0.5rem); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pp-nodeFloat1 {
  0%, 100% { transform: translate(0, 0); opacity: 0.25; }
  50%      { transform: translate(0.75rem, -0.5rem); opacity: 0.5; }
}
@keyframes pp-nodeFloat2 {
  0%, 100% { transform: translate(0, 0); opacity: 0.2; }
  50%      { transform: translate(-0.5rem, 0.75rem); opacity: 0.45; }
}
@keyframes pp-nodeFloat3 {
  0%, 100% { transform: translate(0, 0); opacity: 0.15; }
  50%      { transform: translate(0.5rem, 0.5rem); opacity: 0.35; }
}
@keyframes pp-linePulse {
  0%, 100% { opacity: 0.08; }
  50%      { opacity: 0.18; }
}
@keyframes pp-barGrow {
  from { width: 0; }
}
@keyframes pp-donutDraw {
  from { stroke-dashoffset: var(--pp-circumference); }
}
`;

/* ═══════════════════════════════════════════════════════════════════
   Neural Background — animated CSS dots & lines
   ═══════════════════════════════════════════════════════════════════ */

function NeuralBackground() {
  const nodes: { top: string; left: string; size: string; anim: string }[] = [
    { top: "8%", left: "12%", size: "0.375rem", anim: "pp-nodeFloat1 6s ease-in-out infinite" },
    { top: "15%", left: "85%", size: "0.25rem", anim: "pp-nodeFloat2 7s ease-in-out infinite 1s" },
    { top: "55%", left: "8%", size: "0.3125rem", anim: "pp-nodeFloat3 8s ease-in-out infinite 0.5s" },
    { top: "70%", left: "90%", size: "0.25rem", anim: "pp-nodeFloat1 7s ease-in-out infinite 2s" },
    { top: "85%", left: "25%", size: "0.1875rem", anim: "pp-nodeFloat2 6s ease-in-out infinite 1.5s" },
    { top: "30%", left: "92%", size: "0.25rem", anim: "pp-nodeFloat3 9s ease-in-out infinite 0.8s" },
    { top: "90%", left: "75%", size: "0.3125rem", anim: "pp-nodeFloat1 8s ease-in-out infinite 3s" },
  ];

  const lines: { top: string; left: string; width: string; angle: string; delay: string }[] = [
    { top: "12%", left: "14%", width: "4.5rem", angle: "25deg", delay: "0s" },
    { top: "60%", left: "6%", width: "3.5rem", angle: "-15deg", delay: "1s" },
    { top: "78%", left: "72%", width: "5rem", angle: "40deg", delay: "2s" },
    { top: "20%", left: "80%", width: "3rem", angle: "-35deg", delay: "0.5s" },
  ];

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        borderRadius: "1rem",
      }}
    >
      {nodes.map((n, i) => (
        <div
          key={`node-${i}`}
          style={{
            position: "absolute",
            top: n.top,
            left: n.left,
            width: n.size,
            height: n.size,
            borderRadius: "50%",
            background: T.color.gold,
            animation: n.anim,
          }}
        />
      ))}
      {lines.map((l, i) => (
        <div
          key={`line-${i}`}
          style={{
            position: "absolute",
            top: l.top,
            left: l.left,
            width: l.width,
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${T.color.gold}30, transparent)`,
            transform: `rotate(${l.angle})`,
            animation: `pp-linePulse 4s ease-in-out infinite ${l.delay}`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Header SVG — silhouette with neural nodes
   ═══════════════════════════════════════════════════════════════════ */

function ProfileIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head silhouette */}
      <circle cx="16" cy="12" r="6" fill={T.color.gold} opacity={0.85} />
      <path
        d="M8 28c0-4.418 3.582-8 8-8s8 3.582 8 8"
        stroke={T.color.gold}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Neural nodes radiating out */}
      <circle cx="4" cy="8" r="1.5" fill={T.color.goldLight} opacity={0.6} />
      <circle cx="28" cy="8" r="1.5" fill={T.color.goldLight} opacity={0.6} />
      <circle cx="6" cy="22" r="1.2" fill={T.color.goldLight} opacity={0.5} />
      <circle cx="26" cy="22" r="1.2" fill={T.color.goldLight} opacity={0.5} />
      <circle cx="16" cy="2" r="1.2" fill={T.color.goldLight} opacity={0.5} />
      {/* Connection lines */}
      <line x1="10" y1="9" x2="5.5" y2="8" stroke={T.color.goldLight} strokeWidth="0.5" opacity={0.4} />
      <line x1="22" y1="9" x2="26.5" y2="8" stroke={T.color.goldLight} strokeWidth="0.5" opacity={0.4} />
      <line x1="16" y1="6" x2="16" y2="3.2" stroke={T.color.goldLight} strokeWidth="0.5" opacity={0.4} />
      <line x1="10" y1="23" x2="7" y2="22" stroke={T.color.goldLight} strokeWidth="0.5" opacity={0.4} />
      <line x1="22" y1="23" x2="25" y2="22" stroke={T.color.goldLight} strokeWidth="0.5" opacity={0.4} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Insight Card: Life Chapters (bar chart)
   ═══════════════════════════════════════════════════════════════════ */

function LifeChaptersCard({
  wingsData,
  isMobile,
  label,
}: {
  wingsData: PersonalProfileProps["wingsData"];
  isMobile: boolean;
  label: string;
}) {
  const sorted = useMemo(
    () => [...wingsData].sort((a, b) => b.memoryCount - a.memoryCount).slice(0, 5),
    [wingsData],
  );
  const maxCount = sorted[0]?.memoryCount ?? 1;

  return (
    <div style={insightCardStyle(isMobile)}>
      <h4 style={insightTitleStyle}>{label}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        {sorted.map((w, i) => (
          <div key={w.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", width: "1.25rem", textAlign: "center" }}>
              {w.icon}
            </span>
            <div style={{ flex: 1, position: "relative", height: "0.5rem", borderRadius: "0.25rem", background: "rgba(255,255,255,0.08)" }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "0.25rem",
                  width: `${Math.max(4, (w.memoryCount / maxCount) * 100)}%`,
                  background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight})`,
                  animation: `pp-barGrow 0.8s ease-out ${0.3 + i * 0.1}s both`,
                }}
              />
            </div>
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                color: T.color.gold,
                minWidth: "1.5rem",
                textAlign: "right",
                fontWeight: 600,
              }}
            >
              {w.memoryCount}
            </span>
          </div>
        ))}
      </div>
      {sorted[0] && (
        <p style={insightSummaryStyle}>
          <span style={{ color: T.color.gold, fontWeight: 600 }}>{sorted[0].name}</span>{" "}
          {sorted[0].icon}{" "}
          <span style={{ color: T.color.linen, opacity: 0.7 }}>
            — {sorted[0].memoryCount} memories
          </span>
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Insight Card: Memory Style (donut chart)
   ═══════════════════════════════════════════════════════════════════ */

function MemoryStyleCard({
  totalMemories,
  isMobile,
  label,
  storytellerLabel,
}: {
  totalMemories: number;
  isMobile: boolean;
  label: string;
  storytellerLabel: string;
}) {
  /* Since we don't have per-type breakdowns in props, we derive a
     placeholder split. In production this would come from real data. */
  const visual = Math.round(totalMemories * 0.55);
  const audio = Math.round(totalMemories * 0.15);
  const text = totalMemories - visual - audio;

  const total = Math.max(1, totalMemories);
  const size = 64;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { pct: visual / total, color: T.color.gold },
    { pct: audio / total, color: T.color.terracotta },
    { pct: text / total, color: T.color.sage },
  ];

  let offset = 0;

  return (
    <div style={insightCardStyle(isMobile)}>
      <h4 style={insightTitleStyle}>{label}</h4>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Donut */}
        <div style={{ position: "relative", width: `${size / 16}rem`, height: `${size / 16}rem`, flexShrink: 0 }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={strokeWidth}
            />
            {segments.map((seg, i) => {
              const dashLen = seg.pct * circumference;
              const gapLen = circumference - dashLen;
              const currentOffset = offset;
              offset += dashLen;
              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLen} ${gapLen}`}
                  strokeDashoffset={-currentOffset}
                  strokeLinecap="butt"
                  style={{
                    "--pp-circumference": circumference,
                    animation: `pp-donutDraw 0.8s ease-out ${0.3 + i * 0.15}s both`,
                  } as React.CSSProperties}
                />
              );
            })}
          </svg>
        </div>
        {/* Legend */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {[
            { label: "Photos", count: visual, color: T.color.gold },
            { label: "Audio", count: audio, color: T.color.terracotta },
            { label: "Text", count: text, color: T.color.sage },
          ].map((item) => (
            <div
              key={item.label}
              style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
            >
              <div
                style={{
                  width: "0.5rem",
                  height: "0.5rem",
                  borderRadius: "50%",
                  background: item.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.6875rem",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {item.label} ({item.count})
              </span>
            </div>
          ))}
        </div>
      </div>
      <p style={insightSummaryStyle}>
        <span style={{ color: T.color.gold, fontWeight: 600 }}>{storytellerLabel}</span>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Insight Card: Coverage Map (mini grid)
   ═══════════════════════════════════════════════════════════════════ */

function CoverageMapCard({
  wingsData,
  totalWings,
  isMobile,
  label,
}: {
  wingsData: PersonalProfileProps["wingsData"];
  totalWings: number;
  isMobile: boolean;
  label: string;
}) {
  const filledCount = wingsData.filter((w) => w.memoryCount > 0).length;

  return (
    <div style={insightCardStyle(isMobile)}>
      <h4 style={insightTitleStyle}>{label}</h4>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(totalWings, 5)}, 1fr)`,
          gap: "0.375rem",
          marginBottom: "0.5rem",
        }}
      >
        {wingsData.slice(0, totalWings).map((w) => {
          const filled = w.memoryCount > 0;
          return (
            <div
              key={w.id}
              title={`${w.name}: ${w.memoryCount}`}
              style={{
                aspectRatio: "1",
                borderRadius: "0.375rem",
                background: filled
                  ? `linear-gradient(135deg, ${T.color.gold}50, ${T.color.goldLight}30)`
                  : "rgba(255,255,255,0.05)",
                border: `1px solid ${filled ? `${T.color.gold}40` : "rgba(255,255,255,0.08)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.875rem",
                transition: "background 0.3s ease",
              }}
            >
              {w.icon}
            </div>
          );
        })}
      </div>
      <p style={insightSummaryStyle}>
        <span style={{ color: T.color.gold, fontWeight: 600 }}>
          {filledCount} of {totalWings}
        </span>{" "}
        <span style={{ color: T.color.linen, opacity: 0.7 }}>life areas have memories</span>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Shared insight card styles
   ═══════════════════════════════════════════════════════════════════ */

function insightCardStyle(isMobile: boolean): React.CSSProperties {
  return {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0.75rem",
    padding: isMobile ? "0.875rem" : "1rem",
    animation: "pp-fadeIn 0.5s ease-out 0.3s both",
  };
}

const insightTitleStyle: React.CSSProperties = {
  fontFamily: T.font.display,
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: T.color.gold,
  margin: "0 0 0.625rem",
  letterSpacing: "0.02em",
};

const insightSummaryStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.75rem",
  color: T.color.linen,
  margin: "0.5rem 0 0",
  lineHeight: 1.4,
};

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export default function PersonalProfile({
  totalMemories,
  totalWings,
  wingsData,
  userName,
  onViewFullProfile,
  onStartInterview,
  isMobile,
}: PersonalProfileProps) {
  const { t } = useAtriumT();

  /* Determine storyteller type label */
  const visual = Math.round(totalMemories * 0.55);
  const text = totalMemories - visual - Math.round(totalMemories * 0.15);
  let storytellerKey = "profile.mixedStoryteller";
  if (totalMemories > 0) {
    if (visual / totalMemories > 0.5) storytellerKey = "profile.visualStoryteller";
    else if (text / totalMemories > 0.5) storytellerKey = "profile.writtenStoryteller";
  }

  /* Most active wing */
  const mostActive = useMemo(() => {
    if (wingsData.length === 0) return null;
    return [...wingsData].sort((a, b) => b.memoryCount - a.memoryCount)[0];
  }, [wingsData]);

  /* ── Empty state ─────────────────────────────────────────────── */
  if (totalMemories === 0) {
    return (
      <TuscanCard variant="dark" padding={isMobile ? "1.5rem 1rem" : "2rem 1.75rem"}>
        <style>{KEYFRAMES}</style>
        <NeuralBackground />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "1rem",
            padding: "1.5rem 0",
          }}
        >
          <ProfileIcon size={48} />
          <h3
            style={{
              fontFamily: T.font.display,
              fontSize: "1.375rem",
              fontWeight: 600,
              color: T.color.linen,
              margin: 0,
            }}
          >
            {t("profile.title")}
          </h3>
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
              color: "rgba(255,255,255,0.6)",
              margin: 0,
              maxWidth: "20rem",
              lineHeight: 1.6,
            }}
          >
            {t("profile.emptyState")}
          </p>
          <button
            onClick={onStartInterview}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              fontWeight: 600,
              color: T.color.charcoal,
              background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldLight})`,
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.75rem 1.75rem",
              cursor: "pointer",
              marginTop: "0.5rem",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              boxShadow: `0 0.125rem 0.75rem ${T.color.gold}40`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-0.0625rem)";
              e.currentTarget.style.boxShadow = `0 0.25rem 1rem ${T.color.gold}60`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = `0 0.125rem 0.75rem ${T.color.gold}40`;
            }}
          >
            {t("profile.helpAiLearn")}
          </button>
        </div>
      </TuscanCard>
    );
  }

  /* ── Full state ──────────────────────────────────────────────── */
  return (
    <TuscanCard variant="dark" padding={isMobile ? "1.25rem 1rem" : "1.75rem 1.75rem"}>
      <style>{KEYFRAMES}</style>
      <NeuralBackground />

      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "0.375rem",
        }}
      >
        <ProfileIcon />
        <div>
          <h3
            style={{
              fontFamily: T.font.display,
              fontSize: "1.25rem",
              fontWeight: 600,
              color: T.color.linen,
              margin: 0,
              letterSpacing: "0.015em",
            }}
          >
            {t("profile.title")}
          </h3>
        </div>
      </div>

      {/* Subtitle */}
      <p
        style={{
          position: "relative",
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          color: "rgba(255,255,255,0.55)",
          margin: "0 0 1.25rem",
          lineHeight: 1.5,
          animation: "pp-fadeIn 0.5s ease-out 0.15s both",
        }}
      >
        {t("profile.subtitle")}
      </p>

      {/* Gold accent line */}
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          height: "0.125rem",
          width: "3.5rem",
          background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight}, transparent)`,
          borderRadius: "0.125rem",
          marginBottom: "1.25rem",
        }}
      />

      {/* ── AI Insight Cards ───────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}
      >
        <LifeChaptersCard
          wingsData={wingsData}
          isMobile={isMobile}
          label={t("profile.lifeChapters")}
        />
        <MemoryStyleCard
          totalMemories={totalMemories}
          isMobile={isMobile}
          label={t("profile.memoryStyle")}
          storytellerLabel={t(storytellerKey)}
        />
        <CoverageMapCard
          wingsData={wingsData}
          totalWings={totalWings}
          isMobile={isMobile}
          label={t("profile.coverageMap")}
        />
      </div>

      {/* ── Key Stats Row ──────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          animation: "pp-fadeIn 0.5s ease-out 0.5s both",
        }}
      >
        {/* Total memories */}
        <StatCell value={totalMemories} label="Memories" />
        {/* Active wings */}
        <StatCell
          value={wingsData.filter((w) => w.memoryCount > 0).length}
          label="Wings active"
        />
        {/* Most active wing */}
        {mostActive && (
          <StatCell
            value={`${mostActive.icon} ${mostActive.name}`}
            label={t("profile.mostActive")}
            isText
          />
        )}
        {/* Placeholder for days since first memory (would need real data) */}
        <StatCell value="—" label={t("profile.daysSinceFirst")} isText />
      </div>

      {/* ── CTA Buttons ────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          animation: "pp-fadeIn 0.5s ease-out 0.7s both",
        }}
      >
        {/* Primary: Explore Full Profile */}
        <button
          onClick={onViewFullProfile}
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            color: T.color.charcoal,
            background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldLight})`,
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.75rem 1.75rem",
            cursor: "pointer",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            boxShadow: `0 0.125rem 0.75rem ${T.color.gold}40`,
            width: isMobile ? "100%" : "auto",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-0.0625rem)";
            e.currentTarget.style.boxShadow = `0 0.25rem 1rem ${T.color.gold}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = `0 0.125rem 0.75rem ${T.color.gold}40`;
          }}
        >
          {t("profile.exploreProfile")}
        </button>

        {/* Secondary: Help AI learn more */}
        <button
          onClick={onStartInterview}
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 600,
            color: T.color.gold,
            background: "transparent",
            border: `1.5px solid ${T.color.gold}60`,
            borderRadius: "0.5rem",
            padding: "0.6875rem 1.75rem",
            cursor: "pointer",
            transition: "transform 0.2s ease, background 0.2s ease, border-color 0.2s ease",
            width: isMobile ? "100%" : "auto",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-0.0625rem)";
            e.currentTarget.style.background = `${T.color.gold}10`;
            e.currentTarget.style.borderColor = `${T.color.gold}90`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = `${T.color.gold}60`;
          }}
        >
          {t("profile.helpAiLearn")}
        </button>
      </div>
    </TuscanCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   StatCell — a single key stat
   ═══════════════════════════════════════════════════════════════════ */

function StatCell({
  value,
  label,
  isText = false,
}: {
  value: number | string;
  label: string;
  isText?: boolean;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "0.625rem",
        padding: "0.75rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: isText ? T.font.body : T.font.display,
          fontSize: isText ? "0.8125rem" : "1.5rem",
          fontWeight: isText ? 600 : 300,
          color: T.color.gold,
          lineHeight: 1.2,
          marginBottom: "0.25rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: T.font.body,
          fontSize: "0.6875rem",
          color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </div>
    </div>
  );
}
