"use client";
import React from "react";
import { TypeIcon } from "@/lib/constants/type-icons";
import type { Mem } from "@/lib/constants/defaults";

/**
 * Lightweight thumbnail for any memory type.
 * - Photos/paintings: shows dataUrl directly via <img>
 * - Video/audio with stored thumbnailUrl: shows it
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

  // For images, use dataUrl directly
  const imageUrl = isImage && mem.dataUrl ? mem.dataUrl : null;

  // For video/audio, only use stored thumbnailUrl (no runtime extraction — too heavy)
  const mediaThumb = (isVideo || isAudio) ? (mem.thumbnailUrl || null) : null;

  const thumbSrc = imageUrl || mediaThumb;

  const gradient = `linear-gradient(135deg, hsl(${mem.hue},${mem.s}%,${mem.l}%), hsl(${(mem.hue + 20) % 360},${Math.max(mem.s - 5, 15)}%,${Math.max(mem.l - 8, 35)}%))`;

  const sizeStyle = typeof size === "number" ? `${size}rem` : size;

  return (
    <div
      style={{
        width: sizeStyle,
        height: sizeStyle,
        borderRadius,
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
        background: gradient,
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
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
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
