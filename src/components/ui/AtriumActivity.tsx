"use client";
import { useMemo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { Mem } from "@/lib/constants/defaults";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════
   CSS KEYFRAMES
   ═══════════════════════════════════════════════════════════ */
const ATRIUM_KEYFRAMES = `
@keyframes atriumSlideUp {
  from { opacity: 0; transform: translateY(1rem); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes atriumFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes atriumPulseGold {
  0%, 100% { border-left-color: ${T.color.gold}; box-shadow: -0.25rem 0 1.5rem -0.5rem rgba(212,175,55,0.08); }
  50%      { border-left-color: ${T.color.goldLight}; box-shadow: -0.25rem 0 1.5rem -0.25rem rgba(212,175,55,0.18); }
}
@keyframes atriumSubtlePulse {
  0%, 100% { opacity: 0.85; }
  50%      { opacity: 1; }
}
`;

/* ═══════════════════════════════════════════════════════════
   TYPE ICONS
   ═══════════════════════════════════════════════════════════ */
const TYPE_ICONS: Record<string, string> = {
  photo: "\u{1F5BC}\uFE0F", video: "\u{1F3AC}", album: "\u{1F4D6}",
  orb: "\u{1F52E}", case: "\u{1F3FA}", voice: "\u{1F399}\uFE0F",
  document: "\u{1F4DC}", audio: "\u{1F3B5}", painting: "\u{1F3A8}",
};

/* ═══════════════════════════════════════════════════════════
   SHARED STYLES
   ═══════════════════════════════════════════════════════════ */
const frostedGlass: React.CSSProperties = {
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(1.5rem)",
  WebkitBackdropFilter: "blur(1.5rem)",
  border: `0.0625rem solid ${T.color.cream}`,
  borderRadius: "1rem",
};

const sectionTitle: React.CSSProperties = {
  fontFamily: T.font.display,
  fontWeight: 600,
  color: T.color.charcoal,
  margin: 0,
};

/* ═══════════════════════════════════════════════════════════
   1. OnThisDayCard
   ═══════════════════════════════════════════════════════════ */
export interface OnThisDayCardProps {
  memories: { mem: Mem; wingName: string; year: number }[];
  onMemoryClick: (mem: Mem) => void;
  isMobile: boolean;
}

export function OnThisDayCard({ memories, onMemoryClick, isMobile }: OnThisDayCardProps) {
  const { t } = useTranslation("atrium");

  const yearBadges = useMemo(() => {
    const years = Array.from(new Set(memories.map(m => m.year))).sort((a, b) => b - a);
    return years;
  }, [memories]);

  if (memories.length === 0) return null;

  return (
    <>
      <style>{ATRIUM_KEYFRAMES}</style>
      <div
        style={{
          ...frostedGlass,
          background: "linear-gradient(135deg, rgba(255,252,245,0.7) 0%, rgba(255,255,255,0.55) 100%)",
          borderLeft: `0.1875rem solid ${T.color.gold}`,
          padding: isMobile ? "1rem" : "1.25rem 1.5rem",
          animation: "atriumSlideUp 0.6s ease both, atriumPulseGold 4s ease-in-out 1.5s infinite",
          boxShadow: "0 0.25rem 1.5rem rgba(44,44,42,0.05)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.125rem" }}>{"\u{1F4C5}"}</span>
          <h3 style={{ ...sectionTitle, fontSize: isMobile ? "1.0625rem" : "1.25rem" }}>
            {t("onThisDay")}
          </h3>
          <div style={{ display: "flex", gap: "0.375rem", marginLeft: "auto" }}>
            {yearBadges.map(year => (
              <span
                key={year}
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  color: T.color.gold,
                  background: `${T.color.gold}12`,
                  padding: "0.125rem 0.5rem",
                  borderRadius: "1rem",
                  letterSpacing: "0.02em",
                }}
              >
                {year}
              </span>
            ))}
          </div>
        </div>

        {/* Memory thumbnails strip */}
        <div
          style={{
            display: "flex",
            gap: "0.625rem",
            overflowX: "auto",
            paddingBottom: "0.25rem",
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {memories.map(({ mem, wingName, year }) => {
            const hasImage = mem.dataUrl && !mem.dataUrl.startsWith("data:audio") && !mem.videoBlob;
            return (
              <div
                key={mem.id}
                onClick={() => onMemoryClick(mem)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter") onMemoryClick(mem); }}
                style={{
                  minWidth: isMobile ? "7rem" : "8.5rem",
                  maxWidth: isMobile ? "7rem" : "8.5rem",
                  borderRadius: "0.625rem",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.7)",
                  border: `0.0625rem solid rgba(212,175,55,0.15)`,
                  cursor: "pointer",
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "scale(1.03)";
                  e.currentTarget.style.boxShadow = "0 0.25rem 1rem rgba(212,175,55,0.12)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    height: "5rem",
                    position: "relative",
                    overflow: "hidden",
                    background: hasImage ? "transparent" : `hsl(${mem.hue}, ${mem.s}%, ${mem.l}%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {hasImage ? (
                    <Image
                      src={mem.dataUrl!}
                      alt={mem.title}
                      fill
                      style={{ objectFit: "cover" }}
                      sizes="136px"
                      unoptimized={mem.dataUrl!.startsWith("data:")}
                    />
                  ) : (
                    <span style={{ fontSize: "1.25rem", opacity: 0.6 }}>
                      {TYPE_ICONS[mem.type] || "\u{1F4C4}"}
                    </span>
                  )}
                </div>
                {/* Info */}
                <div style={{ padding: "0.375rem 0.5rem" }}>
                  <p style={{
                    fontFamily: T.font.display,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: T.color.charcoal,
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {mem.title}
                  </p>
                  <p style={{
                    fontFamily: T.font.body,
                    fontSize: "0.5625rem",
                    color: T.color.muted,
                    margin: "0.125rem 0 0",
                  }}>
                    {year} · {wingName}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   2. SharedRoomsPreview
   ═══════════════════════════════════════════════════════════ */
export interface SharedRoomsPreviewProps {
  sharedRooms: { id: string; name: string; icon: string; ownerName: string; memoryCount: number }[];
  onRoomClick: (roomId: string) => void;
  onViewAll: () => void;
  isMobile: boolean;
}

export function SharedRoomsPreview({ sharedRooms, onRoomClick, onViewAll, isMobile }: SharedRoomsPreviewProps) {
  const { t } = useTranslation("atrium");

  if (sharedRooms.length === 0) return null;

  const displayed = sharedRooms.slice(0, 3);

  return (
    <div
      style={{
        animation: "atriumSlideUp 0.6s ease 0.1s both",
      }}
    >
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.125rem" }}>{"\u{1F465}"}</span>
          <h3 style={{ ...sectionTitle, fontSize: isMobile ? "1.0625rem" : "1.25rem" }}>
            {t("sharedWithYou")}
          </h3>
        </div>
        <button
          onClick={onViewAll}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.sage,
            padding: "0.25rem 0",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = T.color.charcoal; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.color.sage; }}
        >
          {t("viewAllShared")} {"\u2192"}
        </button>
      </div>

      {/* Shared room cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.min(displayed.length, 3)}, 1fr)`,
          gap: "0.75rem",
        }}
      >
        {displayed.map((room, i) => (
          <div
            key={room.id}
            onClick={() => onRoomClick(room.id)}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === "Enter") onRoomClick(room.id); }}
            style={{
              ...frostedGlass,
              borderLeft: `0.1875rem solid ${T.color.sage}`,
              padding: isMobile ? "0.875rem" : "1rem 1.125rem",
              cursor: "pointer",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              animation: `atriumSlideUp 0.5s ease ${0.15 + i * 0.08}s both`,
              boxShadow: "0 0.125rem 0.75rem rgba(44,44,42,0.04)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-0.125rem)";
              e.currentTarget.style.boxShadow = "0 0.375rem 1.25rem rgba(74,103,65,0.1)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 0.125rem 0.75rem rgba(44,44,42,0.04)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              {/* Room icon */}
              <span style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "0.625rem",
                background: `${T.color.sage}14`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.125rem",
                flexShrink: 0,
              }}>
                {room.icon}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: T.font.display,
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: T.color.charcoal,
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {room.name}
                </p>
                <p style={{
                  fontFamily: T.font.body,
                  fontSize: "0.6875rem",
                  color: T.color.muted,
                  margin: "0.125rem 0 0",
                }}>
                  {t("from")} {room.ownerName}
                </p>
              </div>

              {/* Memory count badge */}
              <span style={{
                fontFamily: T.font.body,
                fontSize: "0.625rem",
                fontWeight: 600,
                color: T.color.sage,
                background: `${T.color.sage}14`,
                padding: "0.1875rem 0.5rem",
                borderRadius: "1rem",
                flexShrink: 0,
              }}>
                {room.memoryCount}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   3. InterviewPrompt
   ═══════════════════════════════════════════════════════════ */
export interface InterviewPromptProps {
  hasInterviews: boolean;
  interviewCount: number;
  onStartInterview: () => void;
  onViewInterviews: () => void;
  isMobile: boolean;
}

export function InterviewPrompt({
  hasInterviews,
  interviewCount,
  onStartInterview,
  onViewInterviews,
  isMobile,
}: InterviewPromptProps) {
  const { t } = useTranslation("atrium");

  if (!hasInterviews) {
    /* ── No interviews: warm CTA ── */
    return (
      <div
        style={{
          borderRadius: "1rem",
          overflow: "hidden",
          background: `linear-gradient(135deg, ${T.color.terracotta}10 0%, ${T.color.gold}08 60%, ${T.color.warmStone} 100%)`,
          border: `0.0625rem solid ${T.color.cream}`,
          padding: isMobile ? "1.25rem" : "1.5rem 1.75rem",
          animation: "atriumSlideUp 0.6s ease 0.2s both",
          position: "relative",
        }}
      >
        {/* Decorative mic glow */}
        <div style={{
          position: "absolute",
          top: isMobile ? "0.75rem" : "1rem",
          right: isMobile ? "0.75rem" : "1.25rem",
          width: "3.5rem",
          height: "3.5rem",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${T.color.terracotta}15 0%, transparent 70%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.5rem",
          animation: "atriumSubtlePulse 3s ease-in-out infinite",
          pointerEvents: "none",
        }}>
          {"\u{1F399}\uFE0F"}
        </div>

        <h3 style={{
          ...sectionTitle,
          fontSize: isMobile ? "1.125rem" : "1.375rem",
          marginBottom: "0.375rem",
        }}>
          {t("preserveStories")}
        </h3>
        <p style={{
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          color: T.color.walnut,
          margin: "0 0 1rem",
          maxWidth: "24rem",
          lineHeight: 1.5,
        }}>
          {t("interviewDescription")}
        </p>
        <button
          onClick={onStartInterview}
          style={{
            fontFamily: T.font.display,
            fontSize: "0.875rem",
            fontWeight: 600,
            color: T.color.white,
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.625rem 1.25rem",
            cursor: "pointer",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            boxShadow: `0 0.25rem 1rem ${T.color.terracotta}30`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-0.0625rem)";
            e.currentTarget.style.boxShadow = `0 0.375rem 1.25rem ${T.color.terracotta}40`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = `0 0.25rem 1rem ${T.color.terracotta}30`;
          }}
        >
          {t("startInterview")}
        </button>
      </div>
    );
  }

  /* ── Has interviews: continue prompt ── */
  return (
    <div
      style={{
        ...frostedGlass,
        padding: isMobile ? "1rem" : "1.125rem 1.375rem",
        animation: "atriumSlideUp 0.6s ease 0.2s both",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        flexWrap: "wrap",
      }}
    >
      <span style={{
        width: "2.25rem",
        height: "2.25rem",
        borderRadius: "0.625rem",
        background: `${T.color.terracotta}14`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.125rem",
        flexShrink: 0,
      }}>
        {"\u{1F399}\uFE0F"}
      </span>

      <div style={{ flex: 1, minWidth: "8rem" }}>
        <h3 style={{
          ...sectionTitle,
          fontSize: isMobile ? "1rem" : "1.125rem",
        }}>
          {t("continueStory")}
        </h3>
        <p style={{
          fontFamily: T.font.body,
          fontSize: "0.75rem",
          color: T.color.muted,
          margin: "0.125rem 0 0",
        }}>
          {interviewCount} {interviewCount === 1 ? t("interviewSingular") : t("interviewPlural")}
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <button
          onClick={onViewInterviews}
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.walnut,
            background: "none",
            border: `0.0625rem solid ${T.color.cream}`,
            borderRadius: "0.5rem",
            padding: "0.4375rem 0.875rem",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${T.color.cream}`; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
        >
          {t("viewInterviews")}
        </button>
        <button
          onClick={onStartInterview}
          style={{
            fontFamily: T.font.display,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: T.color.white,
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.4375rem 0.875rem",
            cursor: "pointer",
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {t("continueInterview")}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   4. StorageIndicator
   ═══════════════════════════════════════════════════════════ */
export interface StorageIndicatorProps {
  usedMB: number;
  limitMB: number;
  isMobile: boolean;
}

export function StorageIndicator({ usedMB, limitMB, isMobile }: StorageIndicatorProps) {
  const { t } = useTranslation("atrium");

  const pct = limitMB > 0 ? Math.min((usedMB / limitMB) * 100, 100) : 0;

  // Color based on usage: sage (< 60%), gold (60-85%), terracotta (> 85%)
  const barColor = pct < 60 ? T.color.sage : pct < 85 ? T.color.gold : T.color.terracotta;

  return (
    <div
      style={{
        animation: "atriumFadeIn 0.5s ease 0.3s both",
        display: "flex",
        alignItems: "center",
        gap: isMobile ? "0.5rem" : "0.75rem",
        padding: "0.5rem 0",
      }}
    >
      {/* Icon */}
      <span style={{
        fontSize: "0.875rem",
        flexShrink: 0,
        opacity: 0.7,
      }}>
        {"\u{1F4BE}"}
      </span>

      {/* Bar + text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Progress bar */}
        <div style={{
          width: "100%",
          height: "0.25rem",
          borderRadius: "0.125rem",
          background: `${T.color.cream}`,
          overflow: "hidden",
        }}>
          <div style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "0.125rem",
            background: barColor,
            transition: "width 0.5s ease, background 0.3s ease",
          }} />
        </div>

        {/* Text */}
        <p style={{
          fontFamily: T.font.body,
          fontSize: "0.625rem",
          color: T.color.muted,
          margin: "0.1875rem 0 0",
          letterSpacing: "0.01em",
        }}>
          {usedMB.toFixed(0)} MB {t("of")} {limitMB.toFixed(0)} MB {t("used")}
        </p>
      </div>

      {/* Percentage */}
      <span style={{
        fontFamily: T.font.body,
        fontSize: "0.6875rem",
        fontWeight: 600,
        color: barColor,
        flexShrink: 0,
      }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}
