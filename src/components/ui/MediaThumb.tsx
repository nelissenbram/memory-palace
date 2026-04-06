"use client";
import React from "react";
import { useVideoThumbnail } from "@/lib/hooks/useVideoThumbnail";
import { TypeIcon } from "@/lib/constants/type-icons";
import type { Mem } from "@/lib/constants/defaults";

/**
 * Renders a thumbnail for any memory type.
 * - Photos/paintings: shows dataUrl directly
 * - Video/audio: extracts a frame via useVideoThumbnail, falls back to thumbnailUrl, then gradient+icon
 * - Other types: gradient + type icon
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
  const isAudio = mem.type === "audio" || mem.type === "voice" || !!mem.voiceBlob;
  const isImage = mem.type === "photo" || mem.type === "painting" || mem.type === "album";

  // For images, use dataUrl directly
  const imageUrl = isImage && mem.dataUrl ? mem.dataUrl : null;

  // For video/audio, try stored thumbnailUrl first, then extract from dataUrl
  const extractedThumb = useVideoThumbnail(
    (isVideo || isAudio) && mem.dataUrl && !mem.thumbnailUrl ? mem.dataUrl : null,
  );
  const mediaThumb = (isVideo || isAudio) ? (mem.thumbnailUrl || extractedThumb) : null;

  const thumbSrc = imageUrl || mediaThumb;

  const gradient = `linear-gradient(135deg, hsl(${mem.hue},${mem.s}%,${mem.l}%), hsl(${(mem.hue + 20) % 360},${Math.max(mem.s - 5, 15)}%,${Math.max(mem.l - 8, 35)}%))`;

  return (
    <div
      style={{
        width: typeof size === "number" ? `${size}rem` : size,
        height: typeof size === "number" ? `${size}rem` : size,
        borderRadius,
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
        background: thumbSrc ? undefined : gradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {thumbSrc ? (
        <img
          src={thumbSrc}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <TypeIcon type={mem.type} size={iconSize} color={iconColor} />
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
    </div>
  );
});
