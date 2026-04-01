"use client";
import { useMemo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { Mem } from "@/lib/constants/defaults";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════
   CSS KEYFRAMES — World-class animations
   ═══════════════════════════════════════════════════════════ */
const ATRIUM_KEYFRAMES = `
@keyframes atriumPageTurn {
  0%   { opacity: 0; transform: perspective(60rem) rotateY(-4deg) translateY(0.75rem); }
  60%  { opacity: 1; transform: perspective(60rem) rotateY(1deg) translateY(-0.125rem); }
  100% { opacity: 1; transform: perspective(60rem) rotateY(0deg) translateY(0); }
}
@keyframes atriumSlideUp {
  from { opacity: 0; transform: translateY(1rem); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes atriumFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes atriumGoldShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes atriumBorderGlow {
  0%, 100% { border-left-color: ${T.color.gold}; box-shadow: -0.125rem 0 1.5rem -0.25rem rgba(212,175,55,0.06); }
  50%      { border-left-color: ${T.color.goldLight}; box-shadow: -0.125rem 0 2rem -0.125rem rgba(212,175,55,0.14); }
}
@keyframes atriumSoundWave {
  0%, 100% { transform: scaleY(0.3); }
  50%      { transform: scaleY(1); }
}
@keyframes atriumPulseGlow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%      { opacity: 0.7; transform: scale(1.05); }
}
@keyframes atriumArrowSlide {
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(0.25rem); }
}
@keyframes atriumThumbEnter {
  from { opacity: 0; transform: translateX(0.5rem) scale(0.95); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes atriumCardRise {
  from { opacity: 0; transform: translateY(0.5rem) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes atriumProgressFill {
  from { width: 0; }
}
@keyframes atriumStorageFade {
  from { opacity: 0; transform: scaleX(0.6); }
  to   { opacity: 1; transform: scaleX(1); }
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
   1. OnThisDayCard — "Memory Lane" nostalgia card
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
          position: "relative",
          background: "linear-gradient(135deg, rgba(255,252,243,0.85) 0%, rgba(255,250,240,0.7) 40%, rgba(255,255,255,0.6) 100%)",
          backdropFilter: "blur(1.5rem)",
          WebkitBackdropFilter: "blur(1.5rem)",
          borderRadius: "1.125rem",
          border: `0.0625rem solid rgba(212,175,55,0.12)`,
          borderLeft: `0.25rem solid ${T.color.gold}`,
          padding: isMobile ? "1.125rem 1rem" : "1.5rem 1.75rem",
          animation: "atriumPageTurn 0.8s cubic-bezier(0.23, 1, 0.32, 1) both, atriumBorderGlow 5s ease-in-out 2s infinite",
          boxShadow: `0 0.5rem 2rem rgba(44,44,42,0.05), 0 0.0625rem 0.25rem rgba(212,175,55,0.06), inset 0 0.0625rem 0 rgba(255,255,255,0.6)`,
          overflow: "hidden",
          transformOrigin: "left center",
        }}
      >
        {/* Sepia decorative top-right corner flourish */}
        <div style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "6rem",
          height: "6rem",
          background: `radial-gradient(ellipse at top right, rgba(212,175,55,0.06) 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        {/* Header row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}>
          {/* Calendar icon with gold accent */}
          <div style={{
            width: "2.125rem",
            height: "2.125rem",
            borderRadius: "0.5rem",
            background: `linear-gradient(135deg, ${T.color.gold}14 0%, ${T.color.gold}08 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: `0.0625rem solid ${T.color.gold}18`,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.85 }}>
              <rect x="1.5" y="3" width="13" height="11" rx="1.5" stroke={T.color.gold} strokeWidth="1.2" fill="none" />
              <line x1="1.5" y1="6.5" x2="14.5" y2="6.5" stroke={T.color.gold} strokeWidth="1" opacity="0.4" />
              <line x1="5" y1="1.5" x2="5" y2="4.5" stroke={T.color.gold} strokeWidth="1.2" strokeLinecap="round" />
              <line x1="11" y1="1.5" x2="11" y2="4.5" stroke={T.color.gold} strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="8" cy="10" r="1.2" fill={T.color.gold} opacity="0.6" />
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontFamily: T.font.display,
              fontWeight: 600,
              fontSize: isMobile ? "1.125rem" : "1.3125rem",
              color: T.color.charcoal,
              margin: 0,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
            }}>
              {t("onThisDay")}
            </h3>
          </div>

          {/* Year badges as golden pills */}
          <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
            {yearBadges.map(year => (
              <span
                key={year}
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: T.color.goldDark,
                  background: `linear-gradient(135deg, ${T.color.gold}18 0%, ${T.color.gold}10 100%)`,
                  padding: "0.1875rem 0.625rem",
                  borderRadius: "1rem",
                  letterSpacing: "0.04em",
                  border: `0.0625rem solid ${T.color.gold}20`,
                  lineHeight: 1.4,
                }}
              >
                {year}
              </span>
            ))}
          </div>
        </div>

        {/* Thin separator with gold gradient */}
        <div style={{
          height: "0.0625rem",
          background: `linear-gradient(90deg, ${T.color.gold}20, ${T.color.gold}08, transparent)`,
          marginBottom: "1rem",
        }} />

        {/* Memory thumbnails horizontal strip */}
        <div style={{ position: "relative" }}>
          {/* Vignette overlay left */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1.5rem",
            height: "100%",
            background: "linear-gradient(90deg, rgba(255,252,243,0.9) 0%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 2,
            borderRadius: "0.5rem 0 0 0.5rem",
          }} />
          {/* Vignette overlay right */}
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "2rem",
            height: "100%",
            background: "linear-gradient(270deg, rgba(255,252,243,0.9) 0%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 2,
            borderRadius: "0 0.5rem 0.5rem 0",
          }} />

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              overflowX: "auto",
              paddingBottom: "0.375rem",
              paddingLeft: "0.125rem",
              paddingRight: "0.125rem",
              scrollSnapType: "x mandatory",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {memories.map(({ mem, wingName, year }, idx) => {
              const hasImage = mem.dataUrl && !mem.dataUrl.startsWith("data:audio") && !mem.videoBlob;
              return (
                <div
                  key={mem.id}
                  onClick={() => onMemoryClick(mem)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter") onMemoryClick(mem); }}
                  style={{
                    minWidth: isMobile ? "7.5rem" : "9rem",
                    maxWidth: isMobile ? "7.5rem" : "9rem",
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.8)",
                    border: `0.0625rem solid rgba(212,175,55,0.1)`,
                    cursor: "pointer",
                    flexShrink: 0,
                    scrollSnapAlign: "start",
                    transition: "transform 0.25s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.25s ease",
                    animation: `atriumThumbEnter 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${0.3 + idx * 0.07}s both`,
                    boxShadow: "0 0.125rem 0.625rem rgba(44,44,42,0.04)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-0.1875rem) scale(1.02)";
                    e.currentTarget.style.boxShadow = "0 0.5rem 1.5rem rgba(212,175,55,0.12), 0 0.125rem 0.5rem rgba(44,44,42,0.04)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.boxShadow = "0 0.125rem 0.625rem rgba(44,44,42,0.04)";
                  }}
                >
                  {/* Thumbnail with sepia overlay */}
                  <div
                    style={{
                      height: isMobile ? "5rem" : "5.5rem",
                      position: "relative",
                      overflow: "hidden",
                      background: hasImage ? "transparent" : `linear-gradient(135deg, hsl(${mem.hue}, ${mem.s}%, ${mem.l}%) 0%, hsl(${mem.hue}, ${Math.max(0, mem.s - 10)}%, ${Math.min(100, mem.l + 8)}%) 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {hasImage ? (
                      <>
                        <Image
                          src={mem.dataUrl!}
                          alt={mem.title}
                          fill
                          style={{ objectFit: "cover", filter: "saturate(0.85) contrast(1.03)" }}
                          sizes="144px"
                          unoptimized={mem.dataUrl!.startsWith("data:")}
                        />
                        {/* Sepia vignette overlay on image */}
                        <div style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(180deg, transparent 50%, rgba(139,115,85,0.15) 100%)",
                          pointerEvents: "none",
                        }} />
                      </>
                    ) : (
                      <span style={{ fontSize: "1.5rem", opacity: 0.5, filter: "grayscale(0.2)" }}>
                        {TYPE_ICONS[mem.type] || "\u{1F4C4}"}
                      </span>
                    )}
                    {/* Year tag on thumbnail */}
                    <span style={{
                      position: "absolute",
                      top: "0.375rem",
                      right: "0.375rem",
                      fontFamily: T.font.body,
                      fontSize: "0.5625rem",
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.95)",
                      background: "rgba(44,44,42,0.45)",
                      backdropFilter: "blur(0.5rem)",
                      WebkitBackdropFilter: "blur(0.5rem)",
                      padding: "0.0625rem 0.375rem",
                      borderRadius: "0.25rem",
                      letterSpacing: "0.03em",
                    }}>
                      {year}
                    </span>
                  </div>
                  {/* Info area */}
                  <div style={{ padding: "0.4375rem 0.5625rem 0.5rem" }}>
                    <p style={{
                      fontFamily: T.font.display,
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: T.color.charcoal,
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      lineHeight: 1.3,
                    }}>
                      {mem.title}
                    </p>
                    <p style={{
                      fontFamily: T.font.body,
                      fontSize: "0.5625rem",
                      color: T.color.muted,
                      margin: "0.1875rem 0 0",
                      letterSpacing: "0.01em",
                      opacity: 0.85,
                    }}>
                      {wingName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   2. SharedRoomsPreview — "Shared Spaces" with sage theme
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
    <div style={{ animation: "atriumSlideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1) 0.1s both" }}>
      {/* Section header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "0.875rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          {/* Leaf/connection icon in sage circle */}
          <div style={{
            width: "2rem",
            height: "2rem",
            borderRadius: "0.5rem",
            background: `linear-gradient(135deg, ${T.color.sage}14 0%, ${T.color.sage}08 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `0.0625rem solid ${T.color.sage}18`,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="4.5" cy="5.5" r="2.5" stroke={T.color.sage} strokeWidth="1.2" fill="none" />
              <circle cx="9.5" cy="5.5" r="2.5" stroke={T.color.sage} strokeWidth="1.2" fill="none" />
              <path d="M7 7.5v3.5" stroke={T.color.sage} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
            </svg>
          </div>
          <h3 style={{
            fontFamily: T.font.display,
            fontWeight: 600,
            fontSize: isMobile ? "1.0625rem" : "1.25rem",
            color: T.color.charcoal,
            margin: 0,
            letterSpacing: "-0.01em",
          }}>
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
            fontWeight: 600,
            color: T.color.sage,
            padding: "0.3125rem 0.125rem",
            transition: "color 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            letterSpacing: "0.01em",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = T.color.charcoal; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.color.sage; }}
        >
          {t("viewAllShared")}
          <span style={{ display: "inline-block", animation: "atriumArrowSlide 2s ease-in-out infinite", fontSize: "0.875rem" }}>
            {"\u2192"}
          </span>
        </button>
      </div>

      {/* Shared room cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.min(displayed.length, 3)}, 1fr)`,
          gap: "0.75rem",
        }}
      >
        {displayed.map((room, i) => {
          const initial = room.ownerName.charAt(0).toUpperCase();
          return (
            <div
              key={room.id}
              onClick={() => onRoomClick(room.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter") onRoomClick(room.id); }}
              style={{
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(1rem)",
                WebkitBackdropFilter: "blur(1rem)",
                borderRadius: "1rem",
                border: `0.0625rem solid ${T.color.sage}12`,
                borderLeft: `0.1875rem solid ${T.color.sage}`,
                padding: isMobile ? "1rem" : "1.125rem 1.25rem",
                cursor: "pointer",
                transition: "transform 0.25s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.25s ease, border-color 0.25s ease",
                animation: `atriumCardRise 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${0.2 + i * 0.1}s both`,
                boxShadow: "0 0.125rem 0.75rem rgba(44,44,42,0.03)",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-0.25rem)";
                e.currentTarget.style.boxShadow = `0 0.5rem 1.75rem rgba(74,103,65,0.1), 0 0.125rem 0.5rem rgba(44,44,42,0.03)`;
                e.currentTarget.style.borderColor = `${T.color.sage}25`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 0.125rem 0.75rem rgba(44,44,42,0.03)";
                e.currentTarget.style.borderColor = `${T.color.sage}12`;
              }}
            >
              {/* Subtle green gradient background accent */}
              <div style={{
                position: "absolute",
                top: "-1rem",
                right: "-1rem",
                width: "4rem",
                height: "4rem",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${T.color.sage}08 0%, transparent 70%)`,
                pointerEvents: "none",
              }} />

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", position: "relative" }}>
                {/* Owner initial avatar with room icon overlay */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "0.75rem",
                    background: `linear-gradient(135deg, ${T.color.sage}18 0%, ${T.color.sage}0C 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.25rem",
                    border: `0.0625rem solid ${T.color.sage}15`,
                  }}>
                    {room.icon}
                  </div>
                  {/* Owner initial badge */}
                  <div style={{
                    position: "absolute",
                    bottom: "-0.1875rem",
                    right: "-0.1875rem",
                    width: "1.125rem",
                    height: "1.125rem",
                    borderRadius: "50%",
                    background: T.color.sage,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `0.125rem solid rgba(255,255,255,0.9)`,
                    boxShadow: "0 0.0625rem 0.25rem rgba(44,44,42,0.1)",
                  }}>
                    <span style={{
                      fontFamily: T.font.body,
                      fontSize: "0.5rem",
                      fontWeight: 700,
                      color: T.color.white,
                      lineHeight: 1,
                    }}>
                      {initial}
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: T.font.display,
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    color: T.color.charcoal,
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.3,
                  }}>
                    {room.name}
                  </p>
                  <p style={{
                    fontFamily: T.font.body,
                    fontSize: "0.6875rem",
                    color: T.color.muted,
                    margin: "0.1875rem 0 0",
                    letterSpacing: "0.01em",
                  }}>
                    {t("from")} {room.ownerName}
                  </p>
                </div>

                {/* Memory count badge — sage pill */}
                <span style={{
                  fontFamily: T.font.body,
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  color: T.color.sage,
                  background: `linear-gradient(135deg, ${T.color.sage}14 0%, ${T.color.sage}0A 100%)`,
                  padding: "0.25rem 0.5625rem",
                  borderRadius: "1rem",
                  flexShrink: 0,
                  border: `0.0625rem solid ${T.color.sage}15`,
                  letterSpacing: "0.02em",
                  lineHeight: 1.3,
                }}>
                  {room.memoryCount}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   3. InterviewPrompt — "Preserve Your Voice" emotional CTA
   ═══════════════════════════════════════════════════════════ */
export interface InterviewPromptProps {
  hasInterviews: boolean;
  interviewCount: number;
  onStartInterview: () => void;
  onViewInterviews: () => void;
  isMobile: boolean;
}

/** CSS sound-wave bars (decorative) */
function SoundWaveBars({ color, count = 5 }: { color: string; count?: number }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.1875rem",
      height: "1.5rem",
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: "0.1875rem",
            height: "100%",
            borderRadius: "0.125rem",
            background: color,
            opacity: 0.5,
            animation: `atriumSoundWave ${0.8 + i * 0.15}s ease-in-out ${i * 0.1}s infinite`,
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
}

/** CSS microphone illustration */
function MicrophoneIllustration({ size = "3.5rem" }: { size?: string }) {
  return (
    <div style={{
      width: size,
      height: size,
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Outer glow ring */}
      <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${T.color.terracotta}12 0%, transparent 70%)`,
        animation: "atriumPulseGlow 3s ease-in-out infinite",
      }} />
      {/* Mic SVG */}
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ position: "relative", zIndex: 1 }}>
        {/* Mic body */}
        <rect x="10" y="4" width="8" height="13" rx="4" fill={`${T.color.terracotta}30`} stroke={T.color.terracotta} strokeWidth="1.2" />
        {/* Mic stand arc */}
        <path d="M8 14.5C8 18 10.5 20.5 14 20.5C17.5 20.5 20 18 20 14.5" stroke={T.color.terracotta} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
        {/* Stand */}
        <line x1="14" y1="20.5" x2="14" y2="24" stroke={T.color.terracotta} strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
        <line x1="11" y1="24" x2="17" y2="24" stroke={T.color.terracotta} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
        {/* Grill lines */}
        <line x1="11.5" y1="8" x2="16.5" y2="8" stroke={T.color.terracotta} strokeWidth="0.6" opacity="0.25" />
        <line x1="11.5" y1="10" x2="16.5" y2="10" stroke={T.color.terracotta} strokeWidth="0.6" opacity="0.25" />
        <line x1="11.5" y1="12" x2="16.5" y2="12" stroke={T.color.terracotta} strokeWidth="0.6" opacity="0.25" />
      </svg>
    </div>
  );
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
    /* ── No interviews: stunning emotional CTA ── */
    return (
      <div
        style={{
          borderRadius: "1.125rem",
          overflow: "hidden",
          background: `linear-gradient(145deg, rgba(255,252,245,0.9) 0%, rgba(193,127,89,0.07) 40%, rgba(212,175,55,0.04) 70%, ${T.color.warmStone} 100%)`,
          border: `0.0625rem solid rgba(193,127,89,0.1)`,
          padding: isMobile ? "1.5rem 1.25rem" : "2rem 2.25rem",
          animation: "atriumSlideUp 0.7s cubic-bezier(0.23, 1, 0.32, 1) 0.2s both",
          position: "relative",
          boxShadow: "0 0.25rem 1.5rem rgba(44,44,42,0.04), inset 0 0.0625rem 0 rgba(255,255,255,0.6)",
        }}
      >
        {/* Decorative top-right accent gradient */}
        <div style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "40%",
          height: "100%",
          background: `radial-gradient(ellipse at 80% 20%, ${T.color.terracotta}06 0%, transparent 60%)`,
          pointerEvents: "none",
        }} />

        <div style={{
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? "1rem" : "1.5rem",
          flexDirection: isMobile ? "column" : "row",
          position: "relative",
        }}>
          {/* Left: Mic illustration + sound waves */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            flexShrink: 0,
          }}>
            <MicrophoneIllustration size={isMobile ? "3rem" : "3.75rem"} />
            <SoundWaveBars color={T.color.terracotta} count={5} />
          </div>

          {/* Right: Copy + CTA */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontFamily: T.font.display,
              fontWeight: 600,
              fontSize: isMobile ? "1.1875rem" : "1.4375rem",
              color: T.color.charcoal,
              margin: "0 0 0.5rem",
              letterSpacing: "-0.01em",
              lineHeight: 1.25,
            }}>
              {t("preserveStories")}
            </h3>
            <p style={{
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              color: T.color.walnut,
              margin: "0 0 1.25rem",
              maxWidth: "26rem",
              lineHeight: 1.6,
              letterSpacing: "0.005em",
            }}>
              {t("interviewDescription")}
            </p>
            <button
              onClick={onStartInterview}
              style={{
                fontFamily: T.font.display,
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: T.color.white,
                background: `linear-gradient(135deg, ${T.color.terracotta} 0%, ${T.color.walnut} 100%)`,
                border: "none",
                borderRadius: "0.625rem",
                padding: "0.75rem 1.5rem",
                cursor: "pointer",
                transition: "transform 0.25s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.25s ease",
                boxShadow: `0 0.25rem 1.25rem ${T.color.terracotta}25, 0 0.0625rem 0.25rem rgba(44,44,42,0.08)`,
                letterSpacing: "0.01em",
                lineHeight: 1,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-0.125rem)";
                e.currentTarget.style.boxShadow = `0 0.5rem 1.75rem ${T.color.terracotta}35, 0 0.125rem 0.375rem rgba(44,44,42,0.08)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = `0 0.25rem 1.25rem ${T.color.terracotta}25, 0 0.0625rem 0.25rem rgba(44,44,42,0.08)`;
              }}
            >
              {t("startInterview")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Has interviews: elegant compact card ── */
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(1.5rem)",
        WebkitBackdropFilter: "blur(1.5rem)",
        borderRadius: "1rem",
        border: `0.0625rem solid ${T.color.cream}`,
        padding: isMobile ? "1rem 1.125rem" : "1.125rem 1.5rem",
        animation: "atriumSlideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1) 0.2s both",
        display: "flex",
        alignItems: "center",
        gap: "0.875rem",
        flexWrap: "wrap",
        boxShadow: "0 0.125rem 0.75rem rgba(44,44,42,0.03), inset 0 0.0625rem 0 rgba(255,255,255,0.5)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle background accent */}
      <div style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "8rem",
        height: "100%",
        background: `linear-gradient(90deg, transparent, ${T.color.terracotta}04)`,
        pointerEvents: "none",
      }} />

      {/* Mic icon with mini sound wave */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        flexShrink: 0,
        position: "relative",
      }}>
        <div style={{
          width: "2.5rem",
          height: "2.5rem",
          borderRadius: "0.75rem",
          background: `linear-gradient(135deg, ${T.color.terracotta}14 0%, ${T.color.terracotta}08 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `0.0625rem solid ${T.color.terracotta}15`,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="5.5" y="2" width="5" height="8" rx="2.5" fill={`${T.color.terracotta}25`} stroke={T.color.terracotta} strokeWidth="1" />
            <path d="M4 8.5C4 10.7 5.8 12.5 8 12.5C10.2 12.5 12 10.7 12 8.5" stroke={T.color.terracotta} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
            <line x1="8" y1="12.5" x2="8" y2="14" stroke={T.color.terracotta} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
          </svg>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: "8rem", position: "relative" }}>
        <h3 style={{
          fontFamily: T.font.display,
          fontWeight: 600,
          fontSize: isMobile ? "1rem" : "1.125rem",
          color: T.color.charcoal,
          margin: 0,
          letterSpacing: "-0.01em",
          lineHeight: 1.3,
        }}>
          {t("continueStory")}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
          <p style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: T.color.muted,
            margin: 0,
          }}>
            {interviewCount} {interviewCount === 1 ? t("interviewSingular") : t("interviewPlural")}
          </p>
          {/* Mini progress dots */}
          <div style={{ display: "flex", gap: "0.1875rem" }}>
            {Array.from({ length: Math.min(interviewCount, 5) }).map((_, i) => (
              <div key={i} style={{
                width: "0.3125rem",
                height: "0.3125rem",
                borderRadius: "50%",
                background: T.color.terracotta,
                opacity: 0.25 + (i * 0.15),
              }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, position: "relative" }}>
        <button
          onClick={onViewInterviews}
          style={{
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: T.color.walnut,
            background: "rgba(255,255,255,0.5)",
            border: `0.0625rem solid ${T.color.cream}`,
            borderRadius: "0.5rem",
            padding: "0.4375rem 0.9375rem",
            cursor: "pointer",
            transition: "background 0.2s ease, border-color 0.2s ease",
            letterSpacing: "0.005em",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = T.color.cream;
            e.currentTarget.style.borderColor = T.color.sandstone;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(255,255,255,0.5)";
            e.currentTarget.style.borderColor = T.color.cream;
          }}
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
            padding: "0.4375rem 0.9375rem",
            cursor: "pointer",
            transition: "transform 0.2s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.2s ease",
            boxShadow: `0 0.125rem 0.5rem ${T.color.terracotta}20`,
            letterSpacing: "0.01em",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "translateY(-0.0625rem)";
            e.currentTarget.style.boxShadow = `0 0.25rem 0.75rem ${T.color.terracotta}30`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = `0 0.125rem 0.5rem ${T.color.terracotta}20`;
          }}
        >
          {t("continueInterview")}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   4. StorageIndicator — Minimal, elegant bar
   ═══════════════════════════════════════════════════════════ */
export interface StorageIndicatorProps {
  usedMB: number;
  limitMB: number;
  isMobile: boolean;
}

export function StorageIndicator({ usedMB, limitMB, isMobile }: StorageIndicatorProps) {
  const { t } = useTranslation("atrium");

  const pct = limitMB > 0 ? Math.min((usedMB / limitMB) * 100, 100) : 0;

  /* Only visible if > 0% used */
  if (pct <= 0) return null;

  /* Gradient fill: sage -> gold -> terracotta as it fills */
  const barGradient = pct < 50
    ? `linear-gradient(90deg, ${T.color.sage}90 0%, ${T.color.sage} 100%)`
    : pct < 80
      ? `linear-gradient(90deg, ${T.color.sage} 0%, ${T.color.gold} 100%)`
      : `linear-gradient(90deg, ${T.color.sage} 0%, ${T.color.gold} 50%, ${T.color.terracotta} 100%)`;

  const labelColor = pct < 60 ? T.color.sage : pct < 85 ? T.color.goldDark : T.color.terracotta;

  return (
    <div
      style={{
        animation: "atriumFadeIn 0.5s ease 0.3s both",
        display: "flex",
        alignItems: "center",
        gap: isMobile ? "0.625rem" : "0.875rem",
        padding: "0.375rem 0",
      }}
    >
      {/* Thin progress bar with gradient fill */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}>
        <div style={{
          width: "100%",
          height: "0.25rem",
          borderRadius: "0.125rem",
          background: `${T.color.cream}`,
          overflow: "hidden",
          position: "relative",
        }}>
          <div style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "0.125rem",
            background: barGradient,
            transition: "width 0.8s cubic-bezier(0.23, 1, 0.32, 1), background 0.5s ease",
            animation: "atriumStorageFade 0.8s ease 0.4s both",
            transformOrigin: "left center",
          }} />
        </div>
      </div>

      {/* Compact text */}
      <span style={{
        fontFamily: T.font.body,
        fontSize: "0.6875rem",
        fontWeight: 500,
        color: labelColor,
        flexShrink: 0,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        opacity: 0.85,
      }}>
        {usedMB.toFixed(0)} MB {t("of")} {limitMB.toFixed(0)} MB
      </span>
    </div>
  );
}
