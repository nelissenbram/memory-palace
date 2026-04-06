"use client";
import React, { useState, useMemo, useId } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useVideoThumbnail } from "@/lib/hooks/useVideoThumbnail";
import type { Mem } from "@/lib/constants/defaults";
import type { WingRoom } from "@/lib/constants/wings";
import Image from "next/image";
import { TuscanSectionHeader } from "./TuscanCard";
import { RoomIcon } from "./WingRoomIcons";

/* ── Shared constants ── */

import { TYPE_ICONS, TypeIcon } from "@/lib/constants/type-icons";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_OUT = "cubic-bezier(0.0, 0, 0.2, 1)";

/* ── Helpers ── */

function relativeDate(iso: string, t: (k: string, p?: Record<string, string>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("justNow");
  if (mins < 60) return t("minutesAgo", { count: String(mins) });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("hoursAgo", { count: String(hrs) });
  const days = Math.floor(hrs / 24);
  if (days < 30) return t("daysAgo", { count: String(days) });
  const months = Math.floor(days / 30);
  if (months < 12) return t("monthsAgo", { count: String(months) });
  const years = Math.floor(months / 12);
  return t("yearsAgo", { count: String(years) });
}

function isTimeCapsuleLocked(mem: Mem): boolean {
  if (!mem.revealDate) return false;
  return new Date(mem.revealDate).getTime() > Date.now();
}

function formatRevealDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

/* ── Injected keyframes (singleton) ── */

const KEYFRAMES_ID = "library-cards-keyframes";

function KeyframesStyle() {
  return (
    <style id={KEYFRAMES_ID}>{`
      @keyframes lc-wave {
        0%, 100% { transform: scaleY(0.4); }
        50% { transform: scaleY(1); }
      }
      @keyframes lc-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes lc-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-0.125rem); }
      }
      @keyframes lc-card-fade-in {
        from { opacity: 0; transform: translateY(0.75rem) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes lc-empty-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-0.625rem); }
      }
    `}</style>
  );
}


/* ══════════════════════════════════════════════════════════
   LibraryRoomCard
   ══════════════════════════════════════════════════════════ */

export interface LibraryRoomCardProps {
  room: WingRoom;
  memCount: number;
  thumbUrl: string | null;
  accent: string;
  onClick: () => void;
  onAdd: () => void;
}

export const LibraryRoomCard = React.memo(function LibraryRoomCard({ room, memCount, thumbUrl, accent, onClick, onAdd, animationIndex }: LibraryRoomCardProps & { animationIndex?: number }) {
  const { t } = useTranslation("library");
  const [hovered, setHovered] = useState(false);
  const [addHovered, setAddHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const coverGradient = useMemo(() => {
    const h = room.coverHue;
    return `linear-gradient(145deg,
      hsl(${h}, 35%, 80%) 0%,
      hsl(${(h + 20) % 360}, 30%, 74%) 40%,
      hsl(${(h + 45) % 360}, 26%, 68%) 100%)`;
  }, [room.coverHue]);

  /* Subtle tile pattern for no-image covers */
  const patternBg = useMemo(() => {
    const h = room.coverHue;
    return {
      background: coverGradient,
      backgroundImage: `
        radial-gradient(circle at 25% 25%, hsla(${h}, 20%, 95%, 0.12) 1px, transparent 1px),
        radial-gradient(circle at 75% 75%, hsla(${h}, 20%, 95%, 0.08) 1px, transparent 1px)
      `,
      backgroundSize: "1.5rem 1.5rem",
    };
  }, [room.coverHue, coverGradient]);

  return (
    <>
      <KeyframesStyle />
      <div
        role="button"
        aria-label={room.name}
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: "1rem",
          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(1.5rem) saturate(1.4)",
          WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
          cursor: "pointer",
          overflow: "hidden",
          position: "relative",
          border: `0.0625rem solid ${hovered ? accent + "50" : T.color.cream}`,
          boxShadow: hovered
            ? `0 1.25rem 2.5rem rgba(44,44,42,.14),
               0 0.5rem 1rem rgba(44,44,42,.07),
               0 0 0 0.0625rem ${accent}18,
               inset 0 0.0625rem 0 rgba(255,255,255,.7)`
            : `0 0.0625rem 0.25rem rgba(44,44,42,.05),
               0 0.25rem 0.75rem rgba(44,44,42,.04),
               inset 0 0.0625rem 0 rgba(255,255,255,.5)`,
          transform: hovered ? "translateY(-0.25rem)" : "translateY(0)",
          transition: `all 0.4s ${EASE}`,
        }}
      >
        {/* ── Cover area ── */}
        <div style={{
          aspectRatio: "2 / 1",
          position: "relative",
          overflow: "hidden",
          borderRadius: "1rem 1rem 0 0",
          ...(thumbUrl && !imgFailed ? { background: T.color.cream } : patternBg),
        }}>
          {thumbUrl && !imgFailed ? (
            <>
              <Image
                src={thumbUrl}
                alt=""
                fill
                style={{
                  objectFit: "cover",
                  transform: hovered ? "scale(1.05)" : "scale(1)",
                  transition: `transform 0.6s ${EASE}`,
                }}
                sizes="320px"
                unoptimized={thumbUrl.startsWith("data:") || thumbUrl.startsWith("/api/")}
                onError={() => setImgFailed(true)}
              />
              {/* Warm overlay gradient */}
              <div style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(
                  to top,
                  rgba(44,44,42,.4) 0%,
                  rgba(44,44,42,.1) 35%,
                  rgba(180,150,100,.06) 65%,
                  transparent 100%
                )`,
                pointerEvents: "none",
              }} />
            </>
          ) : (
            /* No-image: large floating icon with glow */
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                filter: "drop-shadow(0 0.375rem 0.75rem rgba(0,0,0,.15))",
                transform: hovered ? "scale(1.08) translateY(-0.125rem)" : "scale(1)",
                transition: `transform 0.5s ${EASE}`,
                lineHeight: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <RoomIcon roomId={room.id} size={56} color={`hsl(${room.coverHue}, 30%, 40%)`} />
              </span>
            </div>
          )}

          {/* + Add button — floating top-right */}
          <button
            onClick={e => { e.stopPropagation(); onAdd(); }}
            onMouseEnter={() => setAddHovered(true)}
            onMouseLeave={() => setAddHovered(false)}
            title={t("addMemory")}
            aria-label={t("addMemory")}
            style={{
              position: "absolute",
              top: "0.625rem",
              right: "0.625rem",
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              background: addHovered ? accent : `${accent}E8`,
              color: T.color.white,
              border: "none",
              cursor: "pointer",
              fontSize: "1rem",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: addHovered
                ? `0 0.25rem 0.75rem ${accent}60, 0 0 0 0.1875rem rgba(255,255,255,.3)`
                : `0 0.125rem 0.375rem ${accent}30`,
              transform: addHovered ? "scale(1.15)" : "scale(1)",
              transition: `all 0.25s ${EASE}`,
              zIndex: 2,
              backdropFilter: "blur(0.25rem)",
              WebkitBackdropFilter: "blur(0.25rem)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="6" y1="1" x2="6" y2="11" />
              <line x1="1" y1="6" x2="11" y2="6" />
            </svg>
          </button>

          {/* Shared badge */}
          {room.shared && (
            <span style={{
              position: "absolute", top: "0.625rem", left: "0.625rem",
              background: "rgba(255,255,255,.82)",
              backdropFilter: "blur(0.75rem)",
              WebkitBackdropFilter: "blur(0.75rem)",
              borderRadius: "1rem",
              padding: "0.25rem 0.5rem",
              fontSize: "0.625rem",
              fontFamily: T.font.body,
              fontWeight: 600,
              color: T.color.sage,
              display: "flex", alignItems: "center", gap: "0.25rem",
              letterSpacing: "0.03em",
              boxShadow: "0 0.125rem 0.375rem rgba(0,0,0,.08), inset 0 0.0625rem 0 rgba(255,255,255,.5)",
              zIndex: 2,
            }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3zm10-8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm1.5 6h2a4 4 0 00-6.32-3.26A5.97 5.97 0 0114.5 12z"/>
              </svg>
              {t("shared")}
            </span>
          )}
        </div>

        {/* ── Floating icon badge (cover/content boundary) ── */}
        <div style={{
          position: "absolute",
          left: "0.875rem",
          top: "calc(50% - 1.125rem)", /* overlap the cover/content boundary */
          width: "2.25rem",
          height: "2.25rem",
          borderRadius: "50%",
          background: "rgba(255,255,255,.92)",
          backdropFilter: "blur(0.5rem)",
          WebkitBackdropFilter: "blur(0.5rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0.125rem 0.5rem rgba(44,44,42,.12), 0 0 0 0.0625rem rgba(255,255,255,.6)`,
          zIndex: 3,
          transition: `transform 0.3s ${EASE}`,
          transform: hovered ? "scale(1.08)" : "scale(1)",
        }}>
          <RoomIcon roomId={room.id} size={18} color={accent} />
        </div>

        {/* ── Info area ── */}
        <div style={{
          padding: "1rem 0.875rem 0.875rem 3.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.125rem",
          position: "relative",
        }}>
          <p style={{
            fontFamily: T.font.display,
            fontSize: "1rem",
            fontWeight: 700,
            color: T.color.charcoal,
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
            lineHeight: 1.3,
          }}>
            <span style={{ fontWeight: 400, color: T.color.muted, fontSize: "0.8125rem", marginRight: "0.25rem" }}>{t("room")}</span>
            {room.name}
          </p>
          <p style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: T.color.muted,
            margin: 0,
            fontWeight: 400,
            letterSpacing: "0.02em",
          }}>
            {t("memoryCount", { count: String(memCount) })}
          </p>
        </div>
      </div>
    </>
  );
});


/* ══════════════════════════════════════════════════════════
   LibraryMemoryCard
   ══════════════════════════════════════════════════════════ */

export interface LibraryMemoryCardProps {
  mem: Mem;
  accent: string;
  onClick: () => void;
  subtitle?: string;
  onMove?: (mem: Mem) => void;
  searchQuery?: string;
  animationIndex?: number;
}

/* ── Search highlight helper ── */
function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query || !text) return <>{text}</>;
  const lq = query.toLowerCase();
  const lt = text.toLowerCase();
  const idx = lt.indexOf(lq);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: `${T.color.gold}55`, color: "inherit", borderRadius: "0.125rem", padding: "0 0.0625rem" }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export const LibraryMemoryCard = React.memo(function LibraryMemoryCard({ mem, accent, onClick, subtitle, onMove, searchQuery, animationIndex }: LibraryMemoryCardProps) {
  const { t } = useTranslation("library");
  const [hovered, setHovered] = useState(false);
  const [moveHovered, setMoveHovered] = useState(false);
  const [imgRetries, setImgRetries] = useState(0);
  const imgFailed = imgRetries > 1; // Allow one retry
  const waveId = useId();

  const isInterview = mem.type === "interview";
  const isAudio = !isInterview && (mem.type === "audio" || mem.type === "voice" || !!mem.voiceBlob);
  const isVideo = mem.type === "video" || !!mem.videoBlob;
  const hasImage = mem.dataUrl && !isAudio && !isVideo && !isInterview && !mem.dataUrl.startsWith("data:audio");
  const isDocument = mem.type === "document" || mem.documentBlob;
  const isText = mem.type === "orb" || mem.type === "case" || isInterview;
  const locked = isTimeCapsuleLocked(mem);
  // Generate video thumbnail from the video URL (cached in memory)
  const videoThumb = useVideoThumbnail((isVideo || isAudio) && mem.dataUrl ? mem.dataUrl : null);
  const mediaThumbnail = mem.thumbnailUrl || videoThumb;

  const bgGradient = useMemo(() => {
    const h = mem.hue;
    const s = mem.s;
    const l = mem.l;
    if (isAudio) {
      return `linear-gradient(145deg,
        hsl(${h}, ${s}%, ${l}%) 0%,
        hsl(${(h + 20) % 360}, ${Math.max(s - 8, 18)}%, ${Math.max(l - 6, 42)}%) 60%,
        hsl(${(h + 40) % 360}, ${Math.max(s - 14, 12)}%, ${Math.max(l - 12, 35)}%) 100%)`;
    }
    if (isDocument) {
      return `linear-gradient(160deg, #F5F0E6 0%, #EDE5D6 50%, #E2D8C6 100%)`;
    }
    return `linear-gradient(145deg,
      hsl(${h}, ${s}%, ${l}%) 0%,
      hsl(${(h + 30) % 360}, ${Math.max(s - 6, 22)}%, ${Math.max(l - 8, 42)}%) 60%,
      hsl(${(h + 50) % 360}, ${Math.max(s - 12, 15)}%, ${Math.max(l - 14, 38)}%) 100%)`;
  }, [mem.hue, mem.s, mem.l, isAudio, isDocument]);

  /* HSL accent strip color from mem properties */
  const accentStrip = useMemo(() =>
    `hsl(${mem.hue}, ${Math.min(mem.s + 5, 70)}%, ${Math.min(mem.l + 5, 65)}%)`,
    [mem.hue, mem.s, mem.l],
  );

  /* Waveform bar heights for audio */
  const waveBars = useMemo(() =>
    [0.55, 0.85, 0.45, 1.0, 0.65, 0.9, 0.5].map((h, i) => ({
      height: h,
      delay: i * 0.12,
    })),
    [],
  );

  /* ── Hover preview ref ── */
  const cardRef = React.useRef<HTMLDivElement>(null);

  /* P2 #12: staggered animation delay */
  const staggerDelay = animationIndex !== undefined ? `${animationIndex * 0.05}s` : "0s";

  return (
    <>
      <KeyframesStyle />
      <div
        ref={cardRef}
        role={locked ? undefined : "button"}
        aria-label={mem.title}
        tabIndex={locked ? undefined : 0}
        onClick={locked ? undefined : onClick}
        onKeyDown={locked ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: "1rem",
          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(1.5rem) saturate(1.4)",
          WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
          cursor: locked ? "default" : "pointer",
          overflow: "visible",
          position: "relative",
          border: `0.0625rem solid ${hovered && !locked ? accent + "40" : T.color.cream}`,
          boxShadow: hovered && !locked
            ? `0 1.25rem 2.5rem rgba(44,44,42,.12),
               0 0.5rem 1rem rgba(44,44,42,.06),
               0 0 1.5rem ${accentStrip}18,
               inset 0 0.0625rem 0 rgba(255,255,255,.7)`
            : `0 0.0625rem 0.25rem rgba(44,44,42,.05),
               0 0.25rem 0.75rem rgba(44,44,42,.04),
               inset 0 0.0625rem 0 rgba(255,255,255,.5)`,
          transform: hovered && !locked ? "translateY(-0.25rem)" : "translateY(0)",
          transition: `all 0.4s ${EASE}`,
          opacity: locked ? 0.88 : 1,
          animation: animationIndex !== undefined ? `lc-card-fade-in 0.4s ${EASE} ${staggerDelay} both` : undefined,
        }}
      >
        {/* P2 #10: Hover preview tooltip (desktop) */}
        {hovered && !locked && (mem.desc || mem.createdAt) && (
          <div style={{
            position: "absolute",
            bottom: "calc(100% + 0.5rem)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            background: "rgba(44,44,42,.92)",
            backdropFilter: "blur(0.75rem)",
            WebkitBackdropFilter: "blur(0.75rem)",
            color: T.color.linen,
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            maxWidth: "18rem",
            pointerEvents: "none",
            boxShadow: "0 0.25rem 1rem rgba(0,0,0,.2)",
            animation: `lc-float 0s ease both`,
          }}>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.6875rem", margin: 0,
              lineHeight: 1.4, overflow: "hidden", display: "-webkit-box",
              WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const,
            }}>
              {mem.desc ? mem.desc.slice(0, 100) + (mem.desc.length > 100 ? "..." : "") : t("hoverPreviewNoDesc")}
            </p>
            {mem.createdAt && (
              <p style={{
                fontFamily: T.font.body, fontSize: "0.5625rem",
                color: "rgba(255,255,255,.6)", margin: "0.25rem 0 0",
              }}>
                {new Date(mem.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
        {/* ── Media section ── */}
        <div style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: "1rem 1rem 0 0",
          background: hasImage && !imgFailed ? T.color.cream : bgGradient,
          minHeight: hasImage && !imgFailed ? "8rem" : "7rem",
        }}>
          {/* --- Photo / Image --- */}
          {hasImage && !imgFailed ? (
            <>
              <Image
                src={mem.dataUrl!}
                alt={mem.title}
                fill
                style={{
                  objectFit: "cover",
                  transform: hovered && !locked ? "scale(1.05)" : "scale(1)",
                  transition: `transform 0.6s ${EASE}`,
                  position: "absolute",
                }}
                sizes="280px"
                unoptimized={mem.dataUrl!.startsWith("data:") || mem.dataUrl!.startsWith("/api/")}
                onError={() => setImgRetries((r) => r + 1)}
              />
              {/* Warm corner vignette */}
              <div style={{
                position: "absolute", inset: 0,
                background: `
                  radial-gradient(ellipse at 0% 0%, rgba(180,130,80,.12) 0%, transparent 50%),
                  radial-gradient(ellipse at 100% 100%, rgba(44,44,42,.2) 0%, transparent 50%),
                  linear-gradient(to top, rgba(44,44,42,.25) 0%, transparent 40%)
                `,
                pointerEvents: "none",
              }} />
            </>
          ) : (isVideo || isAudio) && mediaThumbnail ? (
            /* --- Video/Audio with extracted thumbnail (BEFORE waveform fallback) --- */
            <>
              <img
                src={mediaThumbnail}
                alt={mem.title}
                style={{
                  position: "absolute", inset: 0, width: "100%", height: "100%",
                  objectFit: "cover",
                  transform: hovered && !locked ? "scale(1.05)" : "scale(1)",
                  transition: `transform 0.6s ${EASE}`,
                }}
              />
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(44,44,42,.35) 0%, transparent 50%)",
                pointerEvents: "none",
              }} />
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: "2.5rem", height: "2.5rem", borderRadius: "50%",
                  background: "rgba(0,0,0,.45)",
                  backdropFilter: "blur(0.5rem)",
                  WebkitBackdropFilter: "blur(0.5rem)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0.25rem 1rem rgba(0,0,0,.2)",
                  border: "0.0625rem solid rgba(255,255,255,.2)",
                }}>
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="rgba(255,255,255,.9)">
                    <path d="M1 1.5v11l10-5.5L1 1.5z"/>
                  </svg>
                </div>
              </div>
            </>
          ) : isAudio ? (
            /* --- Audio: waveform visualization (fallback when no thumbnail) --- */
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "0.375rem", padding: "0 2rem",
            }}>
              {waveBars.map((bar, i) => (
                <div key={`${waveId}-${i}`} style={{
                  width: "0.25rem",
                  height: `${bar.height * 3}rem`,
                  background: "rgba(255,255,255,.55)",
                  borderRadius: "0.125rem",
                  flexShrink: 0,
                  animation: hovered
                    ? `lc-wave 1.2s ease-in-out ${bar.delay}s infinite`
                    : "none",
                  transformOrigin: "center",
                  boxShadow: "0 0 0.375rem rgba(255,255,255,.15)",
                }} />
              ))}
            </div>
          ) : isDocument ? (
            /* --- Document: parchment with scroll --- */
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: "0.375rem",
            }}>
              <span style={{
                filter: "drop-shadow(0 0.125rem 0.375rem rgba(0,0,0,.1))",
              }}>
                <TypeIcon type="document" size={32} color="rgba(139,115,85,.7)" />
              </span>
              {/* Fake text lines */}
              {[0.55, 0.75, 0.6, 0.45].map((w, i) => (
                <div key={i} style={{
                  width: `${w * 55}%`,
                  height: "0.125rem",
                  background: `rgba(139,115,85,${0.12 + i * 0.02})`,
                  borderRadius: "0.0625rem",
                }} />
              ))}
            </div>
          ) : isVideo && mem.dataUrl ? (
            /* --- Video (no extracted thumb): native <video> shows first frame --- */
            <>
              <video
                src={mem.dataUrl}
                muted
                playsInline
                preload="metadata"
                style={{
                  position: "absolute", inset: 0, width: "100%", height: "100%",
                  objectFit: "cover", pointerEvents: "none",
                }}
              />
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,.15)",
              }}>
                <div style={{
                  width: "2.5rem", height: "2.5rem", borderRadius: "50%",
                  background: "rgba(0,0,0,.45)",
                  backdropFilter: "blur(0.5rem)",
                  WebkitBackdropFilter: "blur(0.5rem)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0.25rem 1rem rgba(0,0,0,.2)",
                  border: "0.0625rem solid rgba(255,255,255,.2)",
                }}>
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="rgba(255,255,255,.9)">
                    <path d="M1 1.5v11l10-5.5L1 1.5z"/>
                  </svg>
                </div>
              </div>
            </>
          ) : isVideo ? (
            /* --- Video with no URL: gradient + play icon --- */
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: "3rem", height: "3rem", borderRadius: "50%",
                background: "rgba(255,255,255,.2)",
                backdropFilter: "blur(0.75rem)",
                WebkitBackdropFilter: "blur(0.75rem)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0.25rem 1rem rgba(0,0,0,.15), inset 0 0.0625rem 0 rgba(255,255,255,.2)",
                border: "0.0625rem solid rgba(255,255,255,.25)",
                transform: hovered ? "scale(1.08)" : "scale(1)",
                transition: `transform 0.4s ${EASE}`,
              }}>
                <svg width="14" height="16" viewBox="0 0 12 14" fill="rgba(255,255,255,.9)">
                  <path d="M1 1.5v11l10-5.5L1 1.5z"/>
                </svg>
              </div>
            </div>
          ) : isText ? (
            /* --- Text/Note: quotation mark --- */
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontFamily: T.font.display,
                fontSize: "4.5rem",
                fontWeight: 700,
                color: "rgba(255,255,255,.2)",
                lineHeight: 1,
                transform: hovered ? "scale(1.06)" : "scale(1)",
                transition: `transform 0.4s ${EASE}`,
                userSelect: "none",
              }}>
                {"\u201C"}
              </span>
            </div>
          ) : (
            /* --- Orb / case / other --- */
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontSize: "2.25rem",
                filter: "drop-shadow(0 0.25rem 0.75rem rgba(0,0,0,.18))",
                transform: hovered ? "scale(1.1)" : "scale(1)",
                transition: `transform 0.4s ${EASE}`,
              }}>
                <TypeIcon type={mem.type} size={36} color="rgba(255,255,255,0.85)" />
              </span>
            </div>
          )}

          {/* Video play overlay (when image present) */}
          {isVideo && hasImage && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(0,0,0,.12)",
              pointerEvents: "none",
            }}>
              <div style={{
                width: "2.75rem", height: "2.75rem", borderRadius: "50%",
                background: "rgba(255,255,255,.22)",
                backdropFilter: "blur(0.75rem)",
                WebkitBackdropFilter: "blur(0.75rem)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0.25rem 1rem rgba(0,0,0,.2), inset 0 0.0625rem 0 rgba(255,255,255,.25)",
                border: "0.0625rem solid rgba(255,255,255,.2)",
              }}>
                <svg width="13" height="15" viewBox="0 0 12 14" fill="rgba(255,255,255,.95)">
                  <path d="M1 1.5v11l10-5.5L1 1.5z"/>
                </svg>
              </div>
            </div>
          )}

          {/* Relative date badge — top right */}
          {mem.createdAt && !locked && (
            <span style={{
              position: "absolute", top: "0.5rem", right: "0.5rem",
              background: "rgba(44,44,42,.5)",
              backdropFilter: "blur(0.5rem)",
              WebkitBackdropFilter: "blur(0.5rem)",
              color: "rgba(255,255,255,.92)",
              borderRadius: "0.375rem",
              padding: "0.1875rem 0.4375rem",
              fontSize: "0.5625rem",
              fontFamily: T.font.body,
              fontWeight: 500,
              letterSpacing: "0.03em",
              zIndex: 2,
            }}>
              {relativeDate(mem.createdAt, t)}
            </span>
          )}

          {/* Type icon badge — bottom left circle */}
          <span style={{
            position: "absolute", bottom: "0.5rem", left: "0.5rem",
            width: "1.625rem", height: "1.625rem",
            borderRadius: "50%",
            background: "rgba(255,255,255,.82)",
            backdropFilter: "blur(0.5rem)",
            WebkitBackdropFilter: "blur(0.5rem)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0.0625rem 0.25rem rgba(0,0,0,.1)",
            zIndex: 2,
            color: accent,
          }}>
            <TypeIcon type={mem.type} size={13} color={accent} />
          </span>

          {/* Move button — top left, appears on hover */}
          {onMove && !locked && (
            <button
              onClick={e => { e.stopPropagation(); onMove(mem); }}
              onMouseEnter={() => setMoveHovered(true)}
              onMouseLeave={() => setMoveHovered(false)}
              title={t("moveMemory")}
              aria-label={t("moveMemory")}
              style={{
                position: "absolute",
                top: "0.5rem",
                left: "0.5rem",
                width: "1.75rem",
                height: "1.75rem",
                borderRadius: "50%",
                background: moveHovered ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.72)",
                backdropFilter: "blur(0.5rem)",
                WebkitBackdropFilter: "blur(0.5rem)",
                border: moveHovered ? `0.0625rem solid ${accent}66` : "0.0625rem solid rgba(255,255,255,.4)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 4,
                opacity: hovered ? 1 : 0,
                transform: hovered ? "scale(1)" : "scale(0.8)",
                transition: `all 0.25s ${EASE}`,
                boxShadow: moveHovered
                  ? `0 0.25rem 0.75rem rgba(44,44,42,.15)`
                  : `0 0.0625rem 0.25rem rgba(0,0,0,.1)`,
                padding: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={moveHovered ? accent : "rgba(44,44,42,.7)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10L1 13l3 3" />
                <path d="M1 13h10a4 4 0 000-8H4" />
                <path d="M4 5L1 2l3-3" />
              </svg>
            </button>
          )}

          {/* Time capsule locked overlay */}
          {locked && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(44,44,42,.55)",
              backdropFilter: "blur(0.5rem)",
              WebkitBackdropFilter: "blur(0.5rem)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: "0.5rem",
              zIndex: 3,
            }}>
              {/* Lock icon */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 018 0v4" />
                <circle cx="12" cy="16" r="1" fill={T.color.gold} />
              </svg>
              <span style={{
                fontFamily: T.font.display,
                fontSize: "0.75rem",
                fontWeight: 600,
                color: T.color.gold,
                letterSpacing: "0.04em",
                textShadow: "0 0.0625rem 0.25rem rgba(0,0,0,.3)",
              }}>
                {t("opensOn", { date: formatRevealDate(mem.revealDate!) })}
              </span>
            </div>
          )}
        </div>

        {/* ── Info area ── */}
        <div style={{ padding: "0.625rem 0.75rem 0.5rem", position: "relative", overflow: "hidden", borderRadius: "0 0 1rem 1rem" }}>
          {/* Title */}
          <p style={{
            fontFamily: T.font.display,
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: T.color.charcoal,
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
            lineHeight: 1.35,
          }}>
            <HighlightText text={mem.title} query={searchQuery} />
          </p>

          {/* Subtitle (wing/room breadcrumb) or description */}
          {subtitle ? (
            <p style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              color: T.color.muted,
              margin: "0.1875rem 0 0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: "0.01em",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}>
              {subtitle}
            </p>
          ) : mem.desc ? (
            <p style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              color: T.color.muted,
              margin: "0.1875rem 0 0",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              lineHeight: 1.45,
            }}>
              <HighlightText text={mem.desc} query={searchQuery} />
            </p>
          ) : null}

          {/* Location badge */}
          {mem.locationName && (
            <p style={{
              fontFamily: T.font.body,
              fontSize: "0.625rem",
              color: T.color.walnut,
              margin: "0.25rem 0 0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "0.1875rem",
              letterSpacing: "0.01em",
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {mem.locationName.length > 25 ? mem.locationName.slice(0, 25) + "\u2026" : mem.locationName}
            </p>
          )}
        </div>

        {/* ── HSL accent strip at bottom ── */}
        <div style={{
          height: "0.1875rem",
          background: `linear-gradient(90deg,
            ${accentStrip} 0%,
            hsl(${(mem.hue + 30) % 360}, ${Math.min(mem.s + 8, 70)}%, ${Math.min(mem.l + 10, 70)}%) 50%,
            ${accentStrip} 100%)`,
          opacity: hovered ? 1 : 0.6,
          transition: `opacity 0.3s ${EASE_OUT}`,
        }} />
      </div>
    </>
  );
});
