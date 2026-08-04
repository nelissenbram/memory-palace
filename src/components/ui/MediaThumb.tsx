"use client";
import React from "react";
import { TypeIcon } from "@/lib/constants/type-icons";
import { T } from "@/lib/theme";
import { CREAM, INK, TRAY, EMBER_GLYPH } from "@/lib/libraryTokens";
import type { Mem } from "@/lib/constants/defaults";

/** Small quill line-glyph for the paper-note tile (Tuscan line-art voice). */
function QuillGlyph({ size, color, opacity = 1 }: { size: string; color: string; opacity?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ opacity, display: "block" }}
    >
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" y1="8" x2="2" y2="22" />
      <line x1="17.5" y1="15" x2="9" y2="15" />
    </svg>
  );
}

/** Best-effort rem value from the size prop (number = rem). Null = unknown
 *  (e.g. "100%"), which we treat as large enough for the note excerpt. */
function toRem(size: string | number): number | null {
  if (typeof size === "number") return size;
  const rem = /^([\d.]+)rem$/.exec(size.trim());
  if (rem) return parseFloat(rem[1]);
  const px = /^([\d.]+)px$/.exec(size.trim());
  if (px) return parseFloat(px[1]) / 16;
  return null;
}

/**
 * Lightweight thumbnail for any memory type.
 * - Photos/paintings: shows dataUrl directly via <img>
 * - Video/audio with stored thumbnailUrl: shows it
 * - Text/note/story: deliberate "paper note" (cream paper, corner fold, quill,
 *   first words of the memory in the display serif) — content, not a placeholder
 * - Everything else: gradient + type icon (NO video preloading)
 */
export const MediaThumb = React.memo(function MediaThumb({
  mem,
  size,
  borderRadius = "0.375rem",
  iconSize = 16,
  iconColor = "rgba(255,255,255,0.5)",
}: {
  mem: Mem;
  size: string | number;
  borderRadius?: string;
  iconSize?: number;
  iconColor?: string;
}) {
  const isVideo = mem.type === "video" || !!mem.videoBlob;
  const isInterview = mem.type === "interview" || mem.type === "voice";
  const isAudio = !isInterview && (mem.type === "audio" || !!mem.voiceBlob);
  const isImage = mem.type === "photo" || mem.type === "painting" || mem.type === "album";
  const isTextNote = mem.type === "text" || mem.type === "note" || mem.type === "story";

  // For images, use dataUrl directly
  const imageUrl = isImage && mem.dataUrl ? mem.dataUrl : null;

  // For video/audio, only use stored thumbnailUrl (no runtime extraction — too heavy)
  const mediaThumb = (isVideo || isAudio) ? (mem.thumbnailUrl || null) : null;

  const candidateSrc = imageUrl || mediaThumb;

  // A failed load falls back to the type glyph instead of the browser's
  // broken-image icon (and never re-requests the known-dead URL).
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const thumbSrc = candidateSrc && candidateSrc !== failedSrc ? candidateSrc : null;

  const gradient = `linear-gradient(135deg, hsl(${mem.hue},${mem.s}%,${mem.l}%), hsl(${(mem.hue + 20) % 360},${Math.max(mem.s - 5, 15)}%,${Math.max(mem.l - 8, 35)}%))`;

  const sizeStyle = typeof size === "number" ? `${size}rem` : size;

  /* ── Paper-note (text/note/story) ── */
  const remSize = toRem(size);
  const tinyNote = remSize !== null && remSize < 3; // too small for words: paper + quill only
  const noteExcerpt = React.useMemo(() => {
    if (!isTextNote) return "";
    const raw = (mem.desc || mem.title || "").trim();
    if (!raw) return "";
    const words = raw.split(/\s+/);
    const slice = words.slice(0, 10).join(" ");
    return words.length > 10 ? `${slice}…` : slice;
  }, [isTextNote, mem.desc, mem.title]);
  const showNoteText = isTextNote && !tinyNote && noteExcerpt.length > 0;

  /* Warm per-memory tint for the paper note: the memory's own hue as a soft
     wash over the cream, a deeper tone for the fold flap + quill, and faint
     ruled lines. Falls back to EMBER/TRAY tones when no hue is set. */
  const hasHue = typeof mem.hue === "number" && Number.isFinite(mem.hue);
  const noteHue = hasHue ? ((mem.hue % 360) + 360) % 360 : 0;
  // Full-tile pastel in the memory's hue (deeper at the top-left, lighter at
  // the bottom-right) so notes read as distinctly colored cards on the wall —
  // the earlier near-white wash (93% → cream) had too little contrast.
  const paperWash = hasHue
    ? `linear-gradient(150deg, hsl(${noteHue},52%,82%) 0%, hsl(${noteHue},45%,90%) 100%)`
    : `linear-gradient(150deg, ${TRAY} 0%, ${CREAM} 100%)`;
  const noteDeep = hasHue ? `hsl(${noteHue},50%,38%)` : EMBER_GLYPH;
  const flapFold = hasHue
    ? `linear-gradient(225deg, rgba(64,59,54,0.10) 0%, rgba(64,59,54,0.10) 50%, hsl(${noteHue},48%,48%) 50%, hsl(${noteHue},45%,40%) 100%)`
    : `linear-gradient(225deg, rgba(64,59,54,0.10) 0%, rgba(64,59,54,0.10) 50%, ${TRAY} 50%, ${TRAY} 100%)`;
  const noteRule = hasHue ? `hsl(${noteHue},38%,72%)` : "rgba(227,214,188,0.9)";

  return (
    <div
      style={{
        width: sizeStyle,
        height: sizeStyle,
        borderRadius,
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
        background: isTextNote ? paperWash : gradient,
        // Hairline edge so the paper reads as a card, never a blank hole —
        // tinted along with the paper for definition against cream surfaces
        boxShadow: isTextNote
          ? `inset 0 0 0 0.0625rem ${hasHue ? `hsl(${noteHue},40%,68%)` : "rgba(227,214,188,0.9)"}`
          : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(thumbSrc)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : isTextNote ? (
        /* ── Paper note: warm cream card, corner fold, quill, first words ── */
        <div style={{ position: "absolute", inset: 0 }}>
          {/* Corner fold — top right: cut-away shadow + folded TRAY flap */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: tinyNote ? "28%" : "1.125rem",
              height: tinyNote ? "28%" : "1.125rem",
              maxWidth: "1.25rem",
              maxHeight: "1.25rem",
              background: flapFold,
              borderBottomLeftRadius: "0.125rem",
              boxShadow: "-0.0625rem 0.0625rem 0.125rem rgba(64,59,54,0.08)",
            }}
          />
          {showNoteText ? (
            <>
              {/* Faint ruled lines under the text — handwritten-note feel.
                  One rule per text line (0.9625rem = 0.6875rem × 1.4), capped
                  at 3 via the no-repeat background height. */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "0.5625rem",
                  right: "0.625rem",
                  top: "1.5625rem",
                  bottom: "0.25rem",
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent calc(0.9625rem - 0.0625rem), ${noteRule} calc(0.9625rem - 0.0625rem), ${noteRule} 0.9625rem)`,
                  backgroundSize: "100% 2.8875rem",
                  backgroundRepeat: "no-repeat",
                }}
              />
              {/* Quill top-left */}
              <span style={{ position: "absolute", top: "0.4375rem", left: "0.5rem", color: noteDeep, lineHeight: 0 }}>
                <QuillGlyph size="0.875rem" color={noteDeep} opacity={0.8} />
              </span>
              {/* First words, like a handwritten card */}
              <p
                style={{
                  position: "absolute",
                  left: "0.5625rem",
                  right: "0.625rem",
                  top: "1.5625rem",
                  bottom: "0.25rem",
                  margin: 0,
                  fontFamily: T.font.display,
                  fontStyle: "italic",
                  fontWeight: 500,
                  fontSize: "0.6875rem",
                  lineHeight: 1.4,
                  color: INK,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: remSize !== null && remSize < 6 ? 2 : 3,
                  WebkitBoxOrient: "vertical" as const,
                  wordBreak: "break-word",
                }}
              >
                {noteExcerpt}
              </p>
            </>
          ) : (
            /* No text (or tile too small): centered larger quill on the paper */
            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: noteDeep,
              }}
            >
              <QuillGlyph size={tinyNote ? "45%" : "38%"} color={noteDeep} opacity={0.7} />
            </span>
          )}
        </div>
      ) : (
        <TypeIcon type={isInterview ? "interview" : mem.type} size={iconSize} color={iconColor} />
      )}
      {/* Play icon overlay for video/audio with thumbnail */}
      {(isVideo || isAudio) && thumbSrc && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <svg
            width={Math.max(10, iconSize * 0.7)}
            height={Math.max(10, iconSize * 0.7)}
            viewBox="0 0 12 14"
            fill="rgba(255,255,255,0.9)"
          >
            <path d="M1 1.5v11l10-5.5L1 1.5z" />
          </svg>
        </div>
      )}
      {/* Play icon for video/audio without thumbnail */}
      {(isVideo || isAudio) && !thumbSrc && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{
            width: `${Math.max(1.5, iconSize * 0.12)}rem`,
            height: `${Math.max(1.5, iconSize * 0.12)}rem`,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <svg
              width={Math.max(8, iconSize * 0.5)}
              height={Math.max(8, iconSize * 0.5)}
              viewBox="0 0 12 14"
              fill="rgba(255,255,255,0.8)"
            >
              <path d="M1 1.5v11l10-5.5L1 1.5z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
});
