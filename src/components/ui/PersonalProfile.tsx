"use client";

import React, { useMemo } from "react";
import { T } from "@/lib/theme";
import { useIsCompact } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import TuscanCard from "./TuscanCard";
import { WingIcon } from "./WingRoomIcons";

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
   profile.portraitTitle       → "{name}'s Portrait"
   profile.wikiSummary        → "Based on your {count} memories across ..."
   profile.introInterviewPrompt → "Tell us about yourself — ..."

   i18n keys (namespace: "persona")
   ─────────────────────────────────────────────────────────────────
   baselineCta.title              → "Your Story Starts Here"
   baselineCta.description        → "Take a short introductory interview ..."
   baselineCta.duration           → "~10 minutes"
   baselineCta.durationDetail     → "5-6 thoughtful questions about legacy & memories"
   baselineCta.button             → "Begin Your Baseline Interview"
   baselineCta.completedTitle     → "Baseline Interview Complete"
   baselineCta.completedSummaryLabel → "What we learned about you:"
   ═══════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface PersonalProfileProps {
  totalMemories: number;
  totalWings: number;
  wingsData: { id: string; name: string; icon: string; memoryCount: number }[];
  userName: string | null;
  onStartInterview: () => void;
  onStartBaselineInterview: () => void;
  onNavigateLibrary: () => void;
  onNavigateToWing?: (wingId: string) => void;
  interviewSummaries?: string[];
  baselineInterviewCompleted?: boolean;
  baselineInterviewSummary?: string;
  memoryTypeCounts?: { photo: number; video: number; audio: number; text: number };
  isMobile: boolean;
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function useAtriumT() {
  return useTranslation("atrium" as "common");
}

function usePersonaT() {
  return useTranslation("persona" as "common");
}

/** CSS keyframes injected once via <style> tag */
const KEYFRAMES = `
@keyframes pp-fadeIn {
  from { opacity: 0; transform: translateY(0.5rem); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pp-barGrow {
  from { width: 0; }
}
@keyframes pp-donutDraw {
  from { stroke-dashoffset: var(--pp-circumference); }
}
/* Interactive card hover via CSS class — injected so inline styles get hover */
.pp-interactive-card:hover {
  transform: translateY(-0.1875rem) !important;
  border-color: rgba(184,92,56,0.5) !important;
  box-shadow: 0 0.5rem 1.5rem rgba(64,59,54,0.14) !important; /* Atrium token: hover = lift + one ink shadow step; ember state, not gold */
}
.pp-interactive-card:active {
  transform: translateY(0) !important;
}
@media (prefers-reduced-motion: reduce) {
  .pp-anim { animation: none !important; }
  .pp-interactive-card { transition: none !important; }
  .pp-interactive-card:hover, .pp-interactive-card:active { transform: none !important; box-shadow: 0 0.25rem 1rem rgba(64,59,54,0.07) !important; } /* Atrium token: hold resting S1 */
  .pp-focusable, .pp-trans { transition: none !important; transform: none !important; }
}
.pp-focusable:focus-visible {
  outline: 0.1875rem solid #D4AF37;
  outline-offset: 0.1875rem;
}
`;

/* ═══════════════════════════════════════════════════════════════════
   Neural Background — animated CSS dots & lines
   ═══════════════════════════════════════════════════════════════════ */

function NeuralBackground() {
  const nodes: { top: string; left: string; size: string }[] = [
    { top: "8%", left: "12%", size: "0.375rem" },
    { top: "15%", left: "85%", size: "0.25rem" },
    { top: "55%", left: "8%", size: "0.3125rem" },
    { top: "70%", left: "90%", size: "0.25rem" },
    { top: "85%", left: "25%", size: "0.1875rem" },
    { top: "30%", left: "92%", size: "0.25rem" },
    { top: "90%", left: "75%", size: "0.3125rem" },
  ];

  const lines: { top: string; left: string; width: string; angle: string }[] = [
    { top: "12%", left: "14%", width: "4.5rem", angle: "25deg" },
    { top: "60%", left: "6%", width: "3.5rem", angle: "-15deg" },
    { top: "78%", left: "72%", width: "5rem", angle: "40deg" },
    { top: "20%", left: "80%", width: "3rem", angle: "-35deg" },
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
            background: "#B85C38", /* Atrium token: ember */
            opacity: 0.3,
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
            height: "0.0625rem",
            background: `linear-gradient(90deg, transparent, rgba(184,92,56,0.19), transparent)`,
            transform: `rotate(${l.angle})`,
            opacity: 0.12,
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
      {/* Head silhouette — Atrium token: ember */}
      <circle cx="16" cy="12" r="6" fill="#B85C38" opacity={0.85} />
      <path
        d="M8 28c0-4.418 3.582-8 8-8s8 3.582 8 8"
        stroke="#B85C38"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Neural nodes radiating out */}
      <circle cx="4" cy="8" r="1.5" fill="#B85C38" opacity={0.6} />
      <circle cx="28" cy="8" r="1.5" fill="#B85C38" opacity={0.6} />
      <circle cx="6" cy="22" r="1.2" fill="#B85C38" opacity={0.5} />
      <circle cx="26" cy="22" r="1.2" fill="#B85C38" opacity={0.5} />
      <circle cx="16" cy="2" r="1.2" fill="#B85C38" opacity={0.5} />
      {/* Connection lines */}
      <line x1="10" y1="9" x2="5.5" y2="8" stroke="#B85C38" strokeWidth="0.5" opacity={0.4} />
      <line x1="22" y1="9" x2="26.5" y2="8" stroke="#B85C38" strokeWidth="0.5" opacity={0.4} />
      <line x1="16" y1="6" x2="16" y2="3.2" stroke="#B85C38" strokeWidth="0.5" opacity={0.4} />
      <line x1="10" y1="23" x2="7" y2="22" stroke="#B85C38" strokeWidth="0.5" opacity={0.4} />
      <line x1="22" y1="23" x2="25" y2="22" stroke="#B85C38" strokeWidth="0.5" opacity={0.4} />
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
  onWingClick,
}: {
  wingsData: PersonalProfileProps["wingsData"];
  isMobile: boolean;
  label: string;
  onWingClick?: (wingId: string) => void;
}) {
  const { t } = useAtriumT();
  const sorted = useMemo(
    () => [...wingsData].sort((a, b) => b.memoryCount - a.memoryCount).slice(0, 5),
    [wingsData],
  );
  const maxCount = sorted[0]?.memoryCount ?? 1;

  return (
    <div className="pp-interactive-card pp-anim" style={interactiveCardStyle(isMobile)}>
      <h4 style={insightTitleStyle}>{label}</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        {sorted.map((w, i) => (
          <div
            key={w.id}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: onWingClick ? "pointer" : undefined }}
            onClick={onWingClick ? (e) => { e.stopPropagation(); onWingClick(w.id); } : undefined}
          >
            <span style={{ fontSize: "0.8125rem", width: "1.25rem", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <WingIcon wingId={w.id} size={14} color="#B85C38" />
            </span>
            <div style={{ flex: 1, position: "relative", height: "0.5rem", borderRadius: "0.25rem", background: "rgba(255,255,255,0.08)" }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "0.25rem",
                  width: `${Math.max(4, (w.memoryCount / maxCount) * 100)}%`,
                  background: "linear-gradient(90deg, #9A4F2A, #B85C38)", /* Atrium token: terracotta */
                  animation: `pp-barGrow 0.8s ease-out ${0.3 + i * 0.1}s both`,
                }}
                className="pp-anim"
              />
            </div>
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: "#E8C255", /* Atrium token: gilt datum on ink */
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
          <span style={{ color: "#E8C255", fontWeight: 600 }}>{sorted[0].name}</span>{" "}
          <WingIcon wingId={sorted[0].id} size={12} color="#B85C38" />{" "}
          <span style={{ color: "rgba(252,250,245,0.72)" }}>
            — {sorted[0].memoryCount} {t("profile.memoriesLabel")}
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
  memoryTypeCounts,
  onClick,
}: {
  totalMemories: number;
  isMobile: boolean;
  label: string;
  storytellerLabel: string;
  memoryTypeCounts?: { photo: number; video: number; audio: number; text: number };
  onClick?: () => void;
}) {
  const { t } = useAtriumT();
  /* Use real counts if provided, otherwise fall back to placeholder split */
  const visual = memoryTypeCounts
    ? memoryTypeCounts.photo + memoryTypeCounts.video
    : Math.round(totalMemories * 0.55);
  const audio = memoryTypeCounts
    ? memoryTypeCounts.audio
    : Math.round(totalMemories * 0.15);
  const text = memoryTypeCounts
    ? memoryTypeCounts.text
    : totalMemories - visual - audio;

  const total = Math.max(1, totalMemories);
  const size = 64;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { pct: visual / total, color: "#C99A2E" }, /* Atrium tokens: ochre / ember / sage light */
    { pct: audio / total, color: "#B85C38" },
    { pct: text / total, color: "#7A8C64" },
  ];

  let offset = 0;

  return (
    <div
      className="pp-interactive-card pp-anim pp-focusable"
      style={interactiveCardStyle(isMobile)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
    >
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
                  className="pp-anim"
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
            { label: t("profile.photos"), count: visual, color: "#C99A2E" },
            { label: t("profile.audio"), count: audio, color: "#B85C38" },
            { label: t("profile.text"), count: text, color: "#7A8C64" },
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
                  fontSize: "0.8125rem",
                  color: "rgba(252,250,245,0.72)",
                }}
              >
                {item.label} ({item.count})
              </span>
            </div>
          ))}
        </div>
      </div>
      <p style={insightSummaryStyle}>
        <span style={{ color: "#E8C255", fontWeight: 600 }}>{storytellerLabel}</span>
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
  onWingClick,
}: {
  wingsData: PersonalProfileProps["wingsData"];
  totalWings: number;
  isMobile: boolean;
  label: string;
  onWingClick?: (wingId: string) => void;
}) {
  const { t } = useAtriumT();
  const filledCount = wingsData.filter((w) => w.memoryCount > 0).length;

  return (
    <div className="pp-interactive-card pp-anim" style={interactiveCardStyle(isMobile)}>
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
              className="pp-trans"
              title={`${w.name}: ${w.memoryCount}`}
              onClick={onWingClick ? (e) => { e.stopPropagation(); onWingClick(w.id); } : undefined}
              style={{
                aspectRatio: "1",
                borderRadius: "0.375rem",
                background: filled
                  ? "linear-gradient(135deg, rgba(184,92,56,0.32), rgba(184,92,56,0.14))" /* Atrium token: ember */
                  : "rgba(255,255,255,0.05)",
                border: `0.0625rem solid ${filled ? "rgba(184,92,56,0.4)" : "rgba(255,255,255,0.08)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8125rem",
                cursor: onWingClick ? "pointer" : undefined,
                transition: "background 0.3s ease, transform 0.2s ease",
              }}
            >
              <WingIcon wingId={w.id} size={12} color={filled ? "#B85C38" : "rgba(252,250,245,0.35)"} />
            </div>
          );
        })}
      </div>
      <p style={insightSummaryStyle}>
        <span style={{ color: "#E8C255" /* Atrium token: gilt datum on ink */, fontWeight: 600 }}>
          {filledCount} {t("profile.ofAreas")} {totalWings}
        </span>{" "}
        <span style={{ color: "rgba(252,250,245,0.72)" }}>{t("profile.areasHaveMemories")}</span>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Dialogue Icon — SVG for baseline interview CTA
   ═══════════════════════════════════════════════════════════════════ */

function DialogueIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left speech bubble */}
      <path
        d="M4 6C4 4.895 4.895 4 6 4H18C19.105 4 20 4.895 20 6V14C20 15.105 19.105 16 18 16H10L6 20V16H6C4.895 16 4 15.105 4 14V6Z"
        fill="#B85C38" /* Atrium token: ember */
        opacity={0.85}
      />
      {/* Right speech bubble */}
      <path
        d="M14 12C14 10.895 14.895 10 16 10H26C27.105 10 28 10.895 28 12V20C28 21.105 27.105 22 26 22H24V26L20 22H16C14.895 22 14 21.105 14 20V12Z"
        fill="#B85C38"
        opacity={0.7}
      />
      {/* Dot accents inside left bubble */}
      <circle cx="9" cy="10" r="1" fill={T.color.charcoal} opacity={0.5} />
      <circle cx="12" cy="10" r="1" fill={T.color.charcoal} opacity={0.5} />
      <circle cx="15" cy="10" r="1" fill={T.color.charcoal} opacity={0.5} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Baseline Interview CTA Card
   ═══════════════════════════════════════════════════════════════════ */

function BaselineInterviewCTA({
  isMobile,
  completed,
  summary,
  onStart,
}: {
  isMobile: boolean;
  completed: boolean;
  summary?: string;
  onStart: () => void;
}) {
  const { t } = usePersonaT();

  /* ── Completed state: show summary ────────────────────────── */
  if (completed) {
    return (
      <div
        className="pp-anim"
        style={{
          background: "linear-gradient(135deg, rgba(184,92,56,0.10), rgba(184,92,56,0.04))", /* Atrium token: ember tint */
          border: "0.0625rem solid rgba(184,92,56,0.35)",
          borderRadius: "1rem",
          padding: isMobile ? "1rem" : "1.25rem 1.5rem",
          marginBottom: "1.25rem",
          animation: "pp-fadeIn 0.5s ease-out 0.45s both",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <DialogueIcon size={20} />
          <h4
            style={{
              fontFamily: T.font.display,
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "#FCFAF5", /* Atrium token: titles are cream on ink, never accent */
              margin: 0,
            }}
          >
            {t("baselineCta.completedTitle")}
          </h4>
        </div>
        {summary && (
          <>
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem", /* Atrium token: the one small-caps voice */
                fontWeight: 700,
                color: "rgba(252,250,245,0.72)",
                margin: "0 0 0.375rem",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              {t("baselineCta.completedSummaryLabel")}
            </p>
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                color: "rgba(252,250,245,0.72)",
                margin: 0,
                lineHeight: 1.4,
                fontStyle: "italic",
              }}
            >
              {summary.length > 250 ? summary.slice(0, 250) + "\u2026" : summary}
            </p>
          </>
        )}
      </div>
    );
  }

  /* ── CTA state: invite user to take the interview ─────────── */
  return (
    <div
      className="pp-anim"
      style={{
        position: "relative",
        background: "linear-gradient(135deg, rgba(184,92,56,0.10), rgba(184,92,56,0.04), rgba(252,250,245,0.03))", /* Atrium token: ember tint */
        border: "0.0625rem solid rgba(184,92,56,0.4)",
        borderRadius: "1rem",
        padding: isMobile ? "1.25rem 1rem" : "1.5rem 1.75rem",
        marginBottom: "1.25rem",
        animation: "pp-fadeIn 0.5s ease-out 0.45s both",
        overflow: "hidden",
      }}
    >
      {/* Subtle ember corner glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-1.5rem",
          right: "-1.5rem",
          width: "6rem",
          height: "6rem",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(184,92,56,0.10), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative" }}>
        {/* Icon + Title row */}
        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            gap: "0.75rem",
            marginBottom: "0.75rem",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "0.75rem",
              background: "rgba(184,92,56,0.14)", /* Atrium token: ember medallion tint */
              border: "0.0625rem solid rgba(184,92,56,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DialogueIcon size={24} />
          </div>
          <div>
            <h4
              style={{
                fontFamily: T.font.display,
                fontSize: "1.0625rem",
                fontWeight: 600,
                color: T.color.linen,
                margin: 0,
                letterSpacing: "0.015em",
              }}
            >
              {t("baselineCta.title")}
            </h4>
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: "#E8C255", /* Atrium token: gilt datum on ink */
                fontWeight: 600,
                letterSpacing: "0.02em",
              }}
            >
              {t("baselineCta.duration")} &middot; {t("baselineCta.durationDetail")}
            </span>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.9375rem",
            color: "rgba(252,250,245,0.72)",
            margin: "0 0 1.125rem",
            lineHeight: 1.4,
            maxWidth: "32rem",
          }}
        >
          {t("baselineCta.description")}
        </p>

        {/* CTA Button */}
        <button
          onClick={onStart}
          aria-label={t("baselineCta.button")}
          className="pp-focusable"
          style={{
            fontFamily: T.font.body,
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: "#FCFAF5",
            background: "linear-gradient(135deg, #B85C38, #9A4F2A)", /* Atrium token: ember action */
            border: "none",
            borderRadius: "0.75rem",
            padding: "0.6875rem 1.5rem",
            cursor: "pointer",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", /* Atrium token: S1 */
            letterSpacing: "0.01em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-0.1875rem)";
            e.currentTarget.style.boxShadow = "0 0.75rem 1.75rem rgba(64,59,54,0.16)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 0.25rem 1rem rgba(64,59,54,0.07)";
          }}
          onFocus={(e) => {
            e.currentTarget.style.transform = "translateY(-0.1875rem)";
            e.currentTarget.style.boxShadow = "0 0.75rem 1.75rem rgba(64,59,54,0.16)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 0.25rem 1rem rgba(64,59,54,0.07)";
          }}
        >
          {t("baselineCta.button")}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Shared insight card styles
   ═══════════════════════════════════════════════════════════════════ */

function insightCardStyle(isMobile: boolean): React.CSSProperties {
  return {
    background: "rgba(255,255,255,0.04)",
    border: "0.0625rem solid rgba(255,255,255,0.08)",
    borderRadius: "1rem",
    padding: isMobile ? "0.875rem" : "1rem",
    boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", /* Atrium token: S1 rest, so hover S2 is one step */
    animation: "pp-fadeIn 0.5s ease-out 0.3s both",
  };
}

function interactiveCardStyle(isMobile: boolean): React.CSSProperties {
  return {
    ...insightCardStyle(isMobile),
    cursor: "pointer",
    transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
  };
}

const insightTitleStyle: React.CSSProperties = {
  fontFamily: T.font.display,
  fontSize: "0.9375rem",
  fontWeight: 600,
  color: "#FCFAF5", /* Atrium token: titles are ink/cream, never accent */
  margin: "0 0 0.625rem",
  letterSpacing: "0.02em",
};

const insightSummaryStyle: React.CSSProperties = {
  fontFamily: T.font.body,
  fontSize: "0.8125rem",
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
  onStartInterview,
  onStartBaselineInterview,
  onNavigateLibrary,
  onNavigateToWing,
  interviewSummaries,
  baselineInterviewCompleted,
  baselineInterviewSummary,
  memoryTypeCounts,
  isMobile,
}: PersonalProfileProps) {
  const { t } = useAtriumT();
  // iPad portrait (768–1024px) falls through to desktop; 3 chart cards / 4 stat
  // cells crammed there. Stack/halve on compact while keeping phone behavior.
  const isCompact = useIsCompact();

  /* Determine storyteller type label */
  const visual = memoryTypeCounts
    ? memoryTypeCounts.photo + memoryTypeCounts.video
    : Math.round(totalMemories * 0.55);
  const text = memoryTypeCounts
    ? memoryTypeCounts.text
    : totalMemories - visual - Math.round(totalMemories * 0.15);
  let storytellerKey = "profile.mixedStoryteller";
  if (totalMemories > 0) {
    if (visual / totalMemories > 0.5) storytellerKey = "profile.visualStoryteller";
    else if (text / totalMemories > 0.5) storytellerKey = "profile.writtenStoryteller";
  }

  /* Interview summary excerpt */
  const latestSummaryExcerpt = useMemo(() => {
    if (!interviewSummaries || interviewSummaries.length === 0) return null;
    const latest = interviewSummaries[interviewSummaries.length - 1];
    return latest.length > 200 ? latest.slice(0, 200) + "\u2026" : latest;
  }, [interviewSummaries]);
  const hasInterviewSummaries = interviewSummaries && interviewSummaries.length > 0;

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
              color: "rgba(252,250,245,0.72)",
              margin: 0,
              maxWidth: "20rem",
              lineHeight: 1.4,
            }}
          >
            {t("profile.emptyState")}
          </p>
          <button
            onClick={onStartInterview}
            aria-label={t("profile.helpAiLearn")}
            className="pp-focusable"
            style={{
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "#FCFAF5",
              background: "linear-gradient(135deg, #B85C38, #9A4F2A)", /* Atrium token: ember action */
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.75rem 1.75rem",
              cursor: "pointer",
              marginTop: "0.5rem",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", /* Atrium token: S1 */
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-0.1875rem)";
              e.currentTarget.style.boxShadow = "0 0.75rem 1.75rem rgba(64,59,54,0.16)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 0.25rem 1rem rgba(64,59,54,0.07)";
            }}
            onFocus={(e) => {
              e.currentTarget.style.transform = "translateY(-0.1875rem)";
              e.currentTarget.style.boxShadow = "0 0.75rem 1.75rem rgba(64,59,54,0.16)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 0.25rem 1rem rgba(64,59,54,0.07)";
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
              fontSize: "1.1875rem", /* Atrium token: titleM */
              fontWeight: 600,
              color: T.color.linen,
              margin: 0,
              letterSpacing: "0.015em",
            }}
          >
            {userName
              ? t("profile.portraitTitle", { name: userName })
              : t("profile.title")}
          </h3>
        </div>
      </div>

      {/* Subtitle */}
      <p
        className="pp-anim"
        style={{
          position: "relative",
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          color: "rgba(252,250,245,0.72)",
          margin: "0 0 1.25rem",
          lineHeight: 1.4,
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
          height: "0.0625rem",
          width: "3.5rem",
          background: "linear-gradient(90deg, rgba(184,92,56,0.5), transparent)", /* Atrium token: section hairline rule, ember zone */
          borderRadius: "0.125rem",
          marginBottom: "1.25rem",
        }}
      />

      {/* ── AI Insight Cards ───────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: (isMobile || isCompact) ? "1fr" : "repeat(3, 1fr)",
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}
      >
        <LifeChaptersCard
          wingsData={wingsData}
          isMobile={isMobile}
          label={t("profile.lifeChapters")}
          onWingClick={onNavigateToWing}
        />
        <MemoryStyleCard
          totalMemories={totalMemories}
          isMobile={isMobile}
          label={t("profile.memoryStyle")}
          storytellerLabel={t(storytellerKey)}
          memoryTypeCounts={memoryTypeCounts}
          onClick={onNavigateLibrary}
        />
        <CoverageMapCard
          wingsData={wingsData}
          totalWings={totalWings}
          isMobile={isMobile}
          label={t("profile.coverageMap")}
          onWingClick={onNavigateToWing}
        />
      </div>

      {/* ── Wiki Summary (bio paragraph) ────────────────────────── */}
      {totalMemories > 0 && (
        <div
          className="pp-anim"
          style={{
            position: "relative",
            background: "rgba(255,255,255,0.06)",
            border: "0.0625rem solid rgba(184,92,56,0.3)", /* Atrium token: ember hairline */
            borderRadius: "1rem",
            padding: isMobile ? "1rem" : "1.25rem 1.5rem",
            marginBottom: "1.25rem",
            animation: "pp-fadeIn 0.5s ease-out 0.45s both",
          }}
        >
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
              color: "rgba(252,250,245,0.85)",
              margin: 0,
              lineHeight: 1.4,
              fontStyle: "italic",
            }}
          >
            {t("profile.wikiSummary", {
              count: String(totalMemories),
              wings: String(totalWings),
              name: userName || t("profile.title"),
              storytellerType: t(storytellerKey).toLowerCase(),
              topWing: mostActive?.name ?? "",
              activeWings: String(wingsData.filter((w) => w.memoryCount > 0).length),
            })}
          </p>

        </div>
      )}

      {/* ── Baseline Interview CTA / Summary ─────────────────── */}
      <BaselineInterviewCTA
        isMobile={isMobile}
        completed={!!baselineInterviewCompleted}
        summary={baselineInterviewSummary}
        onStart={onStartBaselineInterview}
      />

      {/* ── Key Stats Row ──────────────────────────────────────── */}
      <div
        className="pp-anim"
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: (isMobile || isCompact) ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          animation: "pp-fadeIn 0.5s ease-out 0.5s both",
        }}
      >
        {/* Total memories */}
        <StatCell value={totalMemories} label={t("profile.memoriesLabel")} />
        {/* Active wings */}
        <StatCell
          value={wingsData.filter((w) => w.memoryCount > 0).length}
          label={t("profile.wingsActive")}
        />
        {/* Most active wing */}
        {mostActive && (
          <StatCell
            value={mostActive.name}
            label={t("profile.mostActive")}
            isText
          />
        )}
        {/* Placeholder for days since first memory (would need real data) */}
        <StatCell value="—" label={t("profile.daysSinceFirst")} isText />
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
        border: "0.0625rem solid rgba(255,255,255,0.08)",
        borderRadius: "0.75rem",
        padding: "0.75rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: isText ? T.font.body : T.font.display,
          fontSize: isText ? "0.8125rem" : "1.375rem", /* Atrium token: titleL */
          fontWeight: 600,
          color: "#E8C255", /* Atrium token: gilt datum on ink */
          lineHeight: 1.15,
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
          fontSize: "0.6875rem", /* Atrium token: the one small-caps voice */
          fontWeight: 700,
          color: "rgba(252,250,245,0.72)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
        }}
      >
        {label}
      </div>
    </div>
  );
}
