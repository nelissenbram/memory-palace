"use client";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { Mem } from "@/lib/constants/defaults";
import { TypeIcon } from "@/lib/constants/type-icons";
import Image from "next/image";
import TuscanCard from "./TuscanCard";
import { TuscanSectionHeader } from "./TuscanCard";

/* ═══════════════════════════════════════════════════════════
   P2-9: Collaborator avatar color from initial
   ═══════════════════════════════════════════════════════════ */
const AVATAR_COLORS = [
  T.color.terracotta, T.color.sage, T.color.gold,
  "#7B68AE", "#4A8C9F", "#C17F59", "#8B6F4E",
  "#6B8E6B", "#9B6B8E", "#5A7D9A",
];

function avatarColorForName(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

/* ═══════════════════════════════════════════════════════════
   1. OnThisDayCard — "Memory Lane" nostalgia card
   ═══════════════════════════════════════════════════════════ */
export interface OnThisDayCardProps {
  memories: { mem: Mem; wingName: string; year: number }[];
  onMemoryClick: (mem: Mem) => void;
  isMobile: boolean;
}

/** Thumbnail with onError fallback — extracted so each card has independent imgFailed state */
function OTDThumb({ mem, isMobile, year }: { mem: Mem; isMobile: boolean; year: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = mem.dataUrl && !mem.dataUrl.startsWith("data:audio") && !mem.videoBlob && !imgFailed;

  return (
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
            style={{ objectFit: "cover", filter: "saturate(0.75) contrast(1.04) sepia(0.12) brightness(1.02)" }}
            sizes="144px"
            unoptimized={mem.dataUrl!.startsWith("data:") || mem.dataUrl!.startsWith("/api/")}
            onError={() => setImgFailed(true)}
          />
          {/* Warm nostalgic vignette overlay on image */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(193,127,89,0.06) 0%, transparent 40%, rgba(139,115,85,0.18) 100%)",
            pointerEvents: "none",
          }} />
        </>
      ) : (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>
          <TypeIcon type={mem.type} size={24} color={T.color.walnut} />
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
  );
}

export const OnThisDayCard = React.memo(function OnThisDayCard({ memories, onMemoryClick, isMobile }: OnThisDayCardProps) {
  const { t } = useTranslation("atrium");

  const yearBadges = useMemo(() => {
    const years = Array.from(new Set(memories.map(m => m.year))).sort((a, b) => b - a);
    return years;
  }, [memories]);

  if (memories.length === 0) return null;

  return (
    <>
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
            width: "2.375rem",
            height: "2.375rem",
            borderRadius: "0.5rem",
            background: `linear-gradient(135deg, ${T.color.gold}18 0%, ${T.color.gold}0C 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: `0.0625rem solid ${T.color.gold}20`,
          }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.9 }}>
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
              fontWeight: 700,
              fontSize: isMobile ? "1.1875rem" : "1.4375rem",
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
              return (
                <div
                  key={mem.id}
                  onClick={() => onMemoryClick(mem)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onMemoryClick(mem); } }}
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
                  {/* Thumbnail with onError fallback */}
                  <OTDThumb mem={mem} isMobile={isMobile} year={year} />
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
                      fontSize: "0.6875rem",
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
});

/* ═══════════════════════════════════════════════════════════
   2. SharedRoomsPreview — "Shared Spaces" with sage theme
   ═══════════════════════════════════════════════════════════ */
export interface SharedRoomsPreviewProps {
  sharedRooms: { id: string; name: string; nameKey?: string; icon: string; wingName: string; memoryCount: number; wingId?: string }[];
  onRoomClick: (roomId: string) => void;
  onViewAll: () => void;
  isMobile: boolean;
  loading?: boolean;
}

export const SharedRoomsPreview = React.memo(function SharedRoomsPreview({ sharedRooms, onRoomClick, onViewAll, isMobile, loading }: SharedRoomsPreviewProps) {
  const { t } = useTranslation("atrium");
  const { t: tWings } = useTranslation("wings");

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "1.5rem",
          fontFamily: T.font.body,
          fontSize: "0.875rem",
          color: T.color.muted,
        }}
        role="status"
        aria-live="polite"
      >
        {t("sharedLoading")}
      </div>
    );
  }

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
          <div>
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
            <p style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
              margin: "0.125rem 0 0",
              letterSpacing: "0.01em",
            }}>
              {t("sharedWithYouSubtitle")}
            </p>
          </div>
        </div>
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
          const initial = room.wingName.charAt(0).toUpperCase();
          return (
            <div
              key={room.id}
              onClick={() => onRoomClick(room.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRoomClick(room.id); } }}
              style={{
                background: "rgba(255,255,255,0.65)",
                backdropFilter: "blur(1rem)",
                WebkitBackdropFilter: "blur(1rem)",
                borderRadius: "1rem",
                border: `0.0625rem solid ${T.color.sage}15`,
                borderLeft: `0.1875rem solid ${T.color.sage}`,
                padding: isMobile ? "1rem" : "1.125rem 1.25rem",
                cursor: "pointer",
                transition: "transform 0.25s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.3s ease, border-color 0.25s ease",
                animation: `atriumCardRise 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${0.2 + i * 0.1}s both`,
                boxShadow: "0 0.125rem 0.75rem rgba(44,44,42,0.04)",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-0.25rem)";
                e.currentTarget.style.boxShadow = `0 0.5rem 2rem rgba(74,103,65,0.12), 0 0 0.75rem rgba(74,103,65,0.06), 0 0.125rem 0.5rem rgba(44,44,42,0.03)`;
                e.currentTarget.style.borderColor = `${T.color.sage}30`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 0.125rem 0.75rem rgba(44,44,42,0.04)";
                e.currentTarget.style.borderColor = `${T.color.sage}15`;
              }}
            >
              {/* Subtle green gradient background accent */}
              <div style={{
                position: "absolute",
                top: "-1rem",
                right: "-1rem",
                width: "5rem",
                height: "5rem",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${T.color.sage}0A 0%, transparent 70%)`,
                pointerEvents: "none",
              }} />

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", position: "relative" }}>
                {/* Owner initial avatar with room icon overlay */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: "2.75rem",
                    height: "2.75rem",
                    borderRadius: "0.75rem",
                    background: `linear-gradient(135deg, ${T.color.sage}1A 0%, ${T.color.sage}0C 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.375rem",
                    border: `0.0625rem solid ${T.color.sage}18`,
                    boxShadow: `0 0.125rem 0.5rem ${T.color.sage}0A`,
                  }}>
                    {room.icon}
                  </div>
                  {/* P2-9: Collaborator avatar — colored initial circle */}
                  {(() => {
                    const avatarColor = avatarColorForName(room.wingName);
                    return (
                      <div style={{
                        position: "absolute",
                        bottom: "-0.25rem",
                        right: "-0.25rem",
                        width: "1.375rem",
                        height: "1.375rem",
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${avatarColor} 0%, ${avatarColor}DD 100%)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "0.125rem solid rgba(255,255,255,0.95)",
                        boxShadow: `0 0.0625rem 0.375rem ${avatarColor}40`,
                      }}>
                        <span style={{
                          fontFamily: T.font.body,
                          fontSize: "0.5625rem",
                          fontWeight: 700,
                          color: T.color.white,
                          lineHeight: 1,
                        }}>
                          {initial}
                        </span>
                      </div>
                    );
                  })()}
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
                    {(room.nameKey && tWings(room.nameKey)) || room.name}
                  </p>
                  <p style={{
                    fontFamily: T.font.body,
                    fontSize: "0.6875rem",
                    color: T.color.muted,
                    margin: "0.1875rem 0 0",
                    letterSpacing: "0.01em",
                  }}>
                    {t("inWing", { name: room.wingName })}
                  </p>
                </div>

                {/* Type badge — walnut pill */}
                <span style={{
                  fontFamily: T.font.body,
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  color: T.color.walnut,
                  background: `linear-gradient(135deg, ${T.color.sage}14 0%, ${T.color.sage}0A 100%)`,
                  padding: "0.25rem 0.5625rem",
                  borderRadius: "1rem",
                  flexShrink: 0,
                  border: `0.0625rem solid ${T.color.sage}15`,
                  letterSpacing: "0.02em",
                  lineHeight: 1.3,
                }}>
                  {t("sharedTypeWing")}
                </span>
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

      {/* View All button — left-aligned below cards */}
      <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "1rem" }}>
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
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════
   3. InterviewPrompt — "Your Voice Matters" premium CTA
   ═══════════════════════════════════════════════════════════ */
export interface InterviewPromptProps {
  hasInterviews: boolean;
  interviewCount: number;
  onStartInterview: () => void;
  onStartSpecificInterview?: (templateId: string) => void;
  onViewInterviews: () => void;
  isMobile: boolean;
}

/** Maps 1-based example card index to INTERVIEW_TEMPLATES id
 * Must match the order of interview.example{N}Title labels in i18n:
 * 1=Love Story, 2=Growing Up, 3=Family Traditions, 4=Career Journey,
 * 5=Parenthood, 6=Friendship, 7=Life Lessons, 8=Travels & Adventures */
const EXAMPLE_INDEX_TO_TEMPLATE_ID: Record<number, string> = {
  1: "love-story",
  2: "growing-up",
  3: "family-traditions",
  4: "lifes-work",
  5: "raising-children",
  6: "mentors-lessons",
  7: "life-wisdom",
  8: "greatest-adventure",
};

/** CSS sound-wave bars (decorative, cinematic) */
function SoundWaveBars({ color, count = 9 }: { color: string; count?: number }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
      height: "2.25rem",
    }}>
      {Array.from({ length: count }).map((_, i) => {
        const center = (count - 1) / 2;
        const dist = Math.abs(i - center) / center;
        const maxH = 1 - dist * 0.55;
        return (
          <div
            key={i}
            style={{
              width: "0.1875rem",
              height: `${maxH * 100}%`,
              borderRadius: "0.125rem",
              background: color,
              opacity: 0.45 + (1 - dist) * 0.35,
              animation: `atriumSoundWave ${0.7 + i * 0.12}s ease-in-out ${i * 0.08}s infinite`,
              transformOrigin: "center",
            }}
          />
        );
      })}
    </div>
  );
}

/** Expanded CSS microphone illustration with radiant rings */
function MicrophoneIllustration({ size = "5rem" }: { size?: string }) {
  return (
    <div style={{
      width: size,
      height: size,
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Outer pulsing glow ring */}
      <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${T.color.terracotta}14 0%, ${T.color.terracotta}06 50%, transparent 70%)`,
        animation: "atriumPulseGlow 3s ease-in-out infinite",
      }} />
      {/* Middle ring */}
      <div style={{
        position: "absolute",
        inset: "0.5rem",
        borderRadius: "50%",
        border: `0.0625rem solid ${T.color.terracotta}18`,
        animation: "atriumPulseGlow 3s ease-in-out 0.5s infinite",
      }} />
      {/* Inner warm circle */}
      <div style={{
        position: "absolute",
        inset: "1rem",
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${T.color.terracotta}12 0%, ${T.color.gold}08 100%)`,
      }} />
      {/* Mic SVG */}
      <svg width="32" height="32" viewBox="0 0 28 28" fill="none" style={{ position: "relative", zIndex: 1 }}>
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
        {/* Sound wave arcs emanating from mic */}
        <path d="M21 8C22.5 9.5 22.5 13 21 14.5" stroke={T.color.terracotta} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.2" />
        <path d="M23 6.5C25.5 9 25.5 14 23 16.5" stroke={T.color.terracotta} strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.12" />
      </svg>
    </div>
  );
}

const INTERVIEW_DISMISSED_IDS_KEY = "mp_interview_dismissed_ids";
const TOTAL_INTERVIEW_TEMPLATES = 8;

export function InterviewPrompt({
  hasInterviews,
  interviewCount,
  onStartInterview,
  onStartSpecificInterview,
  onViewInterviews,
  isMobile,
}: InterviewPromptProps) {
  const { t } = useTranslation("atrium");

  /* ── Card-cycling state: show 3 cards at a time, skip to next batch ── */
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  const [seenAll, setSeenAll] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(INTERVIEW_DISMISSED_IDS_KEY);
      if (raw) {
        const ids: number[] = JSON.parse(raw);
        setDismissedIds(ids);
        if (ids.length >= TOTAL_INTERVIEW_TEMPLATES) setSeenAll(true);
      }
    } catch {}
  }, []);

  /** The 3 currently-visible template indices (1-based) */
  const visibleTemplates = useMemo(() => {
    const all = Array.from({ length: TOTAL_INTERVIEW_TEMPLATES }, (_, i) => i + 1);
    const remaining = all.filter((n) => !dismissedIds.includes(n));
    if (remaining.length === 0) return all.slice(0, 3); // wrap around — show first 3 again
    return remaining.slice(0, 3);
  }, [dismissedIds]);

  const handleSkipCard = useCallback((templateId: number) => {
    setDismissedIds((prev) => {
      const next = [...prev, templateId];
      try { localStorage.setItem(INTERVIEW_DISMISSED_IDS_KEY, JSON.stringify(next)); } catch {}
      if (next.length >= TOTAL_INTERVIEW_TEMPLATES) setSeenAll(true);
      return next;
    });
  }, []);

  {
    /* ── Premium, emotional invitation — always shown ── */
    return (
      <div
        style={{
          borderRadius: "1.25rem",
          overflow: "hidden",
          background: `linear-gradient(145deg, rgba(255,250,240,0.95) 0%, rgba(193,127,89,0.1) 30%, rgba(212,175,55,0.06) 60%, rgba(193,127,89,0.08) 85%, ${T.color.warmStone} 100%)`,
          border: `0.0625rem solid rgba(193,127,89,0.15)`,
          padding: isMobile ? "2rem 1.5rem" : "2.75rem 3rem",
          animation: "atriumSlideUp 0.7s cubic-bezier(0.23, 1, 0.32, 1) 0.2s both, atriumBorderGlow 6s ease-in-out 3s infinite",
          position: "relative",
          boxShadow: `0 0.5rem 2.5rem rgba(193,127,89,0.08), 0 0.25rem 1rem rgba(44,44,42,0.04), inset 0 0.0625rem 0 rgba(255,255,255,0.7)`,
        }}
      >
        {/* Decorative radial glow top-right */}
        <div style={{
          position: "absolute",
          top: "-2rem",
          right: "-2rem",
          width: "14rem",
          height: "14rem",
          background: `radial-gradient(ellipse at center, ${T.color.terracotta}08 0%, ${T.color.gold}04 40%, transparent 70%)`,
          pointerEvents: "none",
        }} />
        {/* Decorative radial glow bottom-left */}
        <div style={{
          position: "absolute",
          bottom: "-3rem",
          left: "-2rem",
          width: "10rem",
          height: "10rem",
          background: `radial-gradient(ellipse at center, ${T.color.gold}06 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        {/* Decorative quotation mark — top-left warm accent */}
        <div style={{
          position: "absolute",
          top: isMobile ? "0.75rem" : "1rem",
          left: isMobile ? "1rem" : "1.5rem",
          fontFamily: T.font.display,
          fontSize: isMobile ? "4rem" : "5.5rem",
          lineHeight: 1,
          color: `${T.color.terracotta}10`,
          pointerEvents: "none",
          userSelect: "none",
        }}>
          {"\u201C"}
        </div>

        <div style={{
          display: "flex",
          alignItems: isMobile ? "center" : "center",
          gap: isMobile ? "1.5rem" : "2.25rem",
          flexDirection: isMobile ? "column" : "row",
          position: "relative",
        }}>
          {/* Left: Mic illustration + cinematic sound waves */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.625rem",
            flexShrink: 0,
          }}>
            <MicrophoneIllustration size={isMobile ? "5rem" : "6rem"} />
            <SoundWaveBars color={T.color.terracotta} count={11} />
          </div>

          {/* Right: Compelling copy + example cards + CTA */}
          <div style={{ flex: 1, minWidth: 0, textAlign: isMobile ? "center" : "left" }}>
            <h3 style={{
              fontFamily: T.font.display,
              fontWeight: 700,
              fontSize: isMobile ? "1.5rem" : "1.875rem",
              color: T.color.charcoal,
              margin: "0 0 0.625rem",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}>
              {t("interview.headline")}
            </h3>

            <p style={{
              fontFamily: T.font.body,
              fontSize: isMobile ? "0.9375rem" : "1rem",
              color: T.color.walnut,
              margin: "0 0 1.25rem",
              maxWidth: "32rem",
              lineHeight: 1.7,
              letterSpacing: "0.005em",
            }}>
              {t("interview.pitch")}
            </p>

            {/* Example interview cards — cycle through templates */}
            {seenAll && (
              <p style={{
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                color: T.color.terracotta,
                margin: "0 0 0.75rem",
                fontWeight: 500,
              }}>
                {t("interview.seenAllTemplates")}
              </p>
            )}
            <div style={{
              display: "flex",
              gap: "0.625rem",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
            }}>
              {visibleTemplates.map((n) => (
                <div
                  key={n}
                  style={{
                    flex: isMobile ? "1 1 100%" : "1 1 0",
                    minWidth: isMobile ? "auto" : "8rem",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <button
                    onClick={() => {
                      const templateId = EXAMPLE_INDEX_TO_TEMPLATE_ID[n];
                      if (templateId && onStartSpecificInterview) {
                        onStartSpecificInterview(templateId);
                      } else {
                        onStartInterview();
                      }
                    }}
                    style={{
                      flex: 1,
                      background: `rgba(255,255,255,0.7)`,
                      border: `0.0625rem solid ${T.color.sandstone}60`,
                      borderRadius: "0.75rem",
                      padding: "0.75rem 0.875rem",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = T.color.terracotta;
                      e.currentTarget.style.boxShadow = `0 0.25rem 1rem ${T.color.terracotta}15`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = `${T.color.sandstone}60`;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.25rem",
                    }}>
                      <span style={{
                        fontFamily: T.font.display,
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: T.color.charcoal,
                      }}>
                        {t(`interview.example${n}Title`)}
                      </span>
                      <span style={{
                        fontFamily: T.font.body,
                        fontSize: "0.6875rem",
                        color: T.color.terracotta,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}>
                        {t(`interview.example${n}Time`)} {t("interview.minutesShort")}
                      </span>
                    </div>
                    <span style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      color: T.color.muted,
                      lineHeight: 1.4,
                    }}>
                      {t(`interview.example${n}Desc`)}
                    </span>
                  </button>
                  {/* Skip / show-another button per card */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSkipCard(n); }}
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.6875rem",
                      color: T.color.muted,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.25rem 0",
                      marginTop: "0.25rem",
                      opacity: 0.6,
                      transition: "opacity 0.2s",
                      textAlign: "center",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "0.6"; }}
                  >
                    {t("interview.skipTemplate")}
                  </button>
                </div>
              ))}
            </div>

            {/* CTA row */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              justifyContent: isMobile ? "center" : "flex-start",
            }}>
              <button
                onClick={onStartInterview}
                style={{
                  fontFamily: T.font.display,
                  fontSize: isMobile ? "1rem" : "1.0625rem",
                  fontWeight: 600,
                  color: T.color.white,
                  background: `linear-gradient(135deg, ${T.color.terracotta} 0%, ${T.color.walnut} 100%)`,
                  border: "none",
                  borderRadius: "0.875rem",
                  padding: isMobile ? "0.9375rem 2.25rem" : "1rem 2.75rem",
                  cursor: "pointer",
                  transition: "transform 0.25s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.25s ease",
                  boxShadow: `0 0.5rem 2rem ${T.color.terracotta}30, 0 0.0625rem 0.25rem rgba(44,44,42,0.08)`,
                  letterSpacing: "0.015em",
                  lineHeight: 1,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-0.1875rem)";
                  e.currentTarget.style.boxShadow = `0 0.75rem 2.5rem ${T.color.terracotta}40, 0 0.125rem 0.375rem rgba(44,44,42,0.08)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = `0 0.5rem 2rem ${T.color.terracotta}30, 0 0.0625rem 0.25rem rgba(44,44,42,0.08)`;
                }}
              >
                {t("interview.beginFirstSession")}
              </button>
              <button
                onClick={onViewInterviews}
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: T.color.terracotta,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.5rem 0",
                  textDecoration: "underline",
                  textUnderlineOffset: "0.1875rem",
                  opacity: 0.85,
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "0.85"; }}
              >
                {t("interview.browseAll")}
              </button>
            </div>

            <p style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.muted,
              margin: "1rem 0 0",
              fontStyle: "italic",
              letterSpacing: "0.005em",
              lineHeight: 1.5,
              opacity: 0.8,
            }}>
              {t("interview.socialProof")}
            </p>

          </div>
        </div>
      </div>
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   4. StorageIndicator — Minimal, elegant bar
   ═══════════════════════════════════════════════════════════ */
export interface StorageIndicatorProps {
  usedMB: number;
  limitMB: number;
  isMobile: boolean;
}

export const StorageIndicator = React.memo(function StorageIndicator({ usedMB, limitMB, isMobile }: StorageIndicatorProps) {
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
});
