"use client";
import { useState, useMemo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { Mem } from "@/lib/constants/defaults";
import type { WingRoom } from "@/lib/constants/wings";
import Image from "next/image";

/* ── Shared constants ── */

const TYPE_ICONS: Record<string, string> = {
  photo: "\u{1F5BC}\uFE0F", video: "\u{1F3AC}", album: "\u{1F4D6}",
  orb: "\u{1F52E}", case: "\u{1F3FA}", voice: "\u{1F399}\uFE0F",
  document: "\u{1F4DC}", audio: "\u{1F3B5}", painting: "\u{1F3A8}",
};

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

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

export function LibraryRoomCard({ room, memCount, thumbUrl, accent, onClick, onAdd }: LibraryRoomCardProps) {
  const { t } = useTranslation("library");
  const [hovered, setHovered] = useState(false);

  const coverGradient = useMemo(() => {
    const h = room.coverHue;
    return `linear-gradient(135deg, hsl(${h}, 32%, 82%) 0%, hsl(${(h + 30) % 360}, 28%, 76%) 50%, hsl(${(h + 60) % 360}, 24%, 70%) 100%)`;
  }, [room.coverHue]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "0.75rem",
        background: T.color.white,
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
        border: `0.0625rem solid ${hovered ? accent + "40" : T.color.cream}`,
        boxShadow: hovered
          ? `0 0.75rem 2rem rgba(44,44,42,.12), 0 0.125rem 0.5rem rgba(44,44,42,.06), 0 0 0 0.0625rem ${accent}20`
          : `0 0.0625rem 0.1875rem rgba(44,44,42,.04)`,
        transform: hovered ? "translateY(-0.25rem)" : "translateY(0)",
        transition: `all 0.3s ${EASE}`,
      }}
    >
      {/* ── Cover area (3:2 ratio) ── */}
      <div style={{
        aspectRatio: "3 / 2",
        position: "relative",
        overflow: "hidden",
        background: thumbUrl ? T.color.cream : coverGradient,
      }}>
        {thumbUrl ? (
          <>
            <Image
              src={thumbUrl}
              alt=""
              fill
              style={{
                objectFit: "cover",
                transform: hovered ? "scale(1.03)" : "scale(1)",
                transition: `transform 0.4s ${EASE}`,
              }}
              sizes="320px"
              unoptimized={thumbUrl.startsWith("data:")}
            />
            {/* Bottom gradient overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(44,44,42,.35) 0%, rgba(44,44,42,.08) 40%, transparent 70%)",
              pointerEvents: "none",
            }} />
          </>
        ) : (
          /* No-image: large floating icon */
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontSize: "3rem",
              filter: "drop-shadow(0 0.25rem 0.5rem rgba(0,0,0,.12))",
              transform: hovered ? "scale(1.06)" : "scale(1)",
              transition: `transform 0.3s ${EASE}`,
              lineHeight: 1,
            }}>
              {room.icon}
            </span>
          </div>
        )}

        {/* Shared badge */}
        {room.shared && (
          <span style={{
            position: "absolute", top: "0.5rem", right: "0.5rem",
            background: "rgba(255,255,255,.85)",
            backdropFilter: "blur(0.5rem)",
            WebkitBackdropFilter: "blur(0.5rem)",
            borderRadius: "1rem",
            padding: "0.1875rem 0.5rem",
            fontSize: "0.625rem",
            fontFamily: T.font.body,
            fontWeight: 600,
            color: T.color.sage,
            display: "flex", alignItems: "center", gap: "0.25rem",
            letterSpacing: "0.02em",
            boxShadow: "0 0.0625rem 0.25rem rgba(0,0,0,.08)",
          }}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6a5 5 0 0110 0H3zm10-8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm1.5 6h2a4 4 0 00-6.32-3.26A5.97 5.97 0 0114.5 12z"/>
            </svg>
            {t("shared")}
          </span>
        )}
      </div>

      {/* ── Info area ── */}
      <div style={{
        padding: "0.625rem 0.75rem 0.625rem 0.75rem",
        display: "flex", alignItems: "center", gap: "0.5rem",
        position: "relative",
      }}>
        <span style={{
          fontSize: "1.125rem", lineHeight: 1, flexShrink: 0,
          filter: "drop-shadow(0 0.0625rem 0.125rem rgba(0,0,0,.06))",
        }}>
          {room.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 700,
            color: T.color.charcoal, margin: 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            letterSpacing: "0.01em",
          }}>
            {room.name}
          </p>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
            margin: "0.0625rem 0 0", fontWeight: 400,
          }}>
            {t("memoryCount", { count: String(memCount) })}
          </p>
        </div>

        {/* Add button */}
        <button
          onClick={e => { e.stopPropagation(); onAdd(); }}
          title={t("addMemory")}
          style={{
            width: "1.75rem", height: "1.75rem", borderRadius: "50%",
            background: hovered ? accent : accent + "E0",
            color: T.color.white, border: "none",
            cursor: "pointer", fontSize: "1rem", lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: hovered
              ? `0 0.125rem 0.5rem ${accent}40`
              : `0 0.0625rem 0.1875rem ${accent}20`,
            transform: hovered ? "scale(1.08)" : "scale(1)",
            transition: `all 0.25s ${EASE}`,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="1" x2="6" y2="11" />
            <line x1="1" y1="6" x2="11" y2="6" />
          </svg>
        </button>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════
   LibraryMemoryCard
   ══════════════════════════════════════════════════════════ */

export interface LibraryMemoryCardProps {
  mem: Mem;
  accent: string;
  onClick: () => void;
  subtitle?: string;
}

export function LibraryMemoryCard({ mem, accent, onClick, subtitle }: LibraryMemoryCardProps) {
  const { t } = useTranslation("library");
  const [hovered, setHovered] = useState(false);

  const hasImage = mem.dataUrl && !mem.dataUrl.startsWith("data:audio") && !mem.videoBlob;
  const isVideo = mem.type === "video" || mem.videoBlob;
  const isAudio = mem.type === "audio" || mem.type === "voice" || mem.voiceBlob;
  const isDocument = mem.type === "document" || mem.documentBlob;
  const locked = isTimeCapsuleLocked(mem);

  const bgGradient = useMemo(() => {
    const h = mem.hue;
    const s = mem.s;
    const l = mem.l;
    if (isAudio) {
      return `linear-gradient(135deg, hsl(${h}, ${s}%, ${l}%) 0%, hsl(${(h + 25) % 360}, ${Math.max(s - 10, 15)}%, ${Math.max(l - 8, 40)}%) 100%)`;
    }
    if (isDocument) {
      return `linear-gradient(160deg, #F5F0E6 0%, #E8DFD0 50%, #DDD4C2 100%)`;
    }
    return `linear-gradient(135deg, hsl(${h}, ${s}%, ${l}%) 0%, hsl(${(h + 40) % 360}, ${Math.max(s - 8, 20)}%, ${Math.max(l - 10, 40)}%) 100%)`;
  }, [mem.hue, mem.s, mem.l, isAudio, isDocument]);

  const typeLabel = TYPE_ICONS[mem.type] || "\u{1F4C4}";

  return (
    <div
      onClick={locked ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "0.75rem",
        background: T.color.white,
        cursor: locked ? "default" : "pointer",
        overflow: "hidden",
        position: "relative",
        border: `0.0625rem solid ${hovered && !locked ? accent + "30" : T.color.cream}`,
        boxShadow: hovered && !locked
          ? `0 0.75rem 1.5rem rgba(44,44,42,.10), 0 0.125rem 0.375rem rgba(44,44,42,.05)`
          : `0 0.0625rem 0.1875rem rgba(44,44,42,.04)`,
        transform: hovered && !locked ? "translateY(-0.25rem)" : "translateY(0)",
        transition: `all 0.3s ${EASE}`,
        opacity: locked ? 0.85 : 1,
      }}
    >
      {/* ── Thumbnail area ── */}
      <div style={{
        position: "relative",
        overflow: "hidden",
        background: hasImage ? T.color.cream : bgGradient,
        aspectRatio: hasImage ? undefined : undefined,
        minHeight: hasImage ? "8rem" : "7rem",
      }}>
        {hasImage ? (
          <Image
            src={mem.dataUrl!}
            alt={mem.title}
            fill
            style={{
              objectFit: "cover",
              transform: hovered && !locked ? "scale(1.03)" : "scale(1)",
              transition: `transform 0.4s ${EASE}`,
              position: "absolute",
            }}
            sizes="280px"
            unoptimized={mem.dataUrl!.startsWith("data:")}
          />
        ) : isAudio ? (
          /* Audio: waveform pattern */
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "0.1875rem", padding: "0 1.5rem",
          }}>
            {Array.from({ length: 24 }).map((_, i) => {
              const h = Math.sin(i * 0.5) * 0.35 + Math.cos(i * 0.3) * 0.25 + 0.5;
              return (
                <div key={i} style={{
                  width: "0.125rem",
                  height: `${h * 3}rem`,
                  background: "rgba(255,255,255,.45)",
                  borderRadius: "0.0625rem",
                  flexShrink: 0,
                }} />
              );
            })}
          </div>
        ) : isDocument ? (
          /* Document: parchment look */
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "0.375rem",
          }}>
            <span style={{
              fontSize: "1.75rem",
              filter: "drop-shadow(0 0.125rem 0.25rem rgba(0,0,0,.08))",
            }}>
              {"\u{1F4DC}"}
            </span>
            {/* Fake text lines */}
            {[0.6, 0.8, 0.5].map((w, i) => (
              <div key={i} style={{
                width: `${w * 60}%`,
                height: "0.125rem",
                background: "rgba(139,115,85,.15)",
                borderRadius: "0.0625rem",
              }} />
            ))}
          </div>
        ) : isVideo ? (
          /* Video: icon with play button */
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontSize: "1.75rem",
              filter: "drop-shadow(0 0.125rem 0.375rem rgba(0,0,0,.15))",
            }}>
              {TYPE_ICONS[mem.type] || "\u{1F3AC}"}
            </span>
          </div>
        ) : (
          /* Orb / case / other */
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{
              fontSize: "2rem",
              filter: "drop-shadow(0 0.25rem 0.75rem rgba(0,0,0,.15))",
              transform: hovered ? "scale(1.08)" : "scale(1)",
              transition: `transform 0.3s ${EASE}`,
            }}>
              {TYPE_ICONS[mem.type] || "\u{1F4C4}"}
            </span>
          </div>
        )}

        {/* Video play overlay */}
        {isVideo && hasImage && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,.15)",
          }}>
            <div style={{
              width: "2.25rem", height: "2.25rem", borderRadius: "50%",
              background: "rgba(255,255,255,.9)",
              backdropFilter: "blur(0.25rem)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0.125rem 0.5rem rgba(0,0,0,.2)",
            }}>
              <svg width="12" height="14" viewBox="0 0 12 14" fill={T.color.charcoal}>
                <path d="M1 1.5v11l10-5.5L1 1.5z"/>
              </svg>
            </div>
          </div>
        )}

        {/* Type badge — frosted glass pill */}
        <span style={{
          position: "absolute", bottom: "0.375rem", right: "0.375rem",
          background: "rgba(44,44,42,.55)",
          backdropFilter: "blur(0.5rem)",
          WebkitBackdropFilter: "blur(0.5rem)",
          color: T.color.white,
          borderRadius: "1rem",
          padding: "0.125rem 0.4375rem",
          fontSize: "0.5625rem",
          fontFamily: T.font.body,
          fontWeight: 500,
          display: "flex", alignItems: "center", gap: "0.1875rem",
          letterSpacing: "0.03em",
          textTransform: "capitalize" as const,
        }}>
          {typeLabel} {mem.type}
        </span>

        {/* Time capsule locked overlay */}
        {locked && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(44,44,42,.6)",
            backdropFilter: "blur(0.375rem)",
            WebkitBackdropFilter: "blur(0.375rem)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "0.375rem",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span style={{
              fontFamily: T.font.display,
              fontSize: "0.6875rem",
              fontWeight: 600,
              color: T.color.gold,
              letterSpacing: "0.03em",
            }}>
              {t("opensOn", { date: formatRevealDate(mem.revealDate!) })}
            </span>
          </div>
        )}
      </div>

      {/* ── Info area ── */}
      <div style={{ padding: "0.5rem 0.625rem 0.5rem" }}>
        {/* Title */}
        <p style={{
          fontFamily: T.font.display,
          fontSize: "0.875rem",
          fontWeight: 700,
          color: T.color.charcoal,
          margin: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: "0.01em",
          lineHeight: 1.3,
        }}>
          {mem.title}
        </p>

        {/* Description (max 2 lines) */}
        {mem.desc && !subtitle && (
          <p style={{
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            color: T.color.muted,
            margin: "0.1875rem 0 0",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            lineHeight: 1.4,
          }}>
            {mem.desc}
          </p>
        )}

        {/* Subtitle (search path) */}
        {subtitle && (
          <p style={{
            fontFamily: T.font.body,
            fontSize: "0.625rem",
            color: T.color.muted,
            margin: "0.1875rem 0 0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
          }}>
            {subtitle}
          </p>
        )}

        {/* Date */}
        {mem.createdAt && (
          <p style={{
            fontFamily: T.font.body,
            fontSize: "0.5625rem",
            color: T.color.sandstone,
            margin: "0.25rem 0 0",
            fontWeight: 400,
            letterSpacing: "0.02em",
          }}>
            {relativeDate(mem.createdAt, t)}
          </p>
        )}
      </div>
    </div>
  );
}
