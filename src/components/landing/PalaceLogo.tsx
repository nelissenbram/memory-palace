"use client";

import React from "react";

type PalaceLogoProps = {
  variant?: "full" | "mark";
  color?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  style?: React.CSSProperties;
};

const SIZES = {
  sm: { icon: "1.5rem", fontSize: "0.875rem", gap: "0.375rem", letterSpacing: "0.12em" },
  md: { icon: "2rem", fontSize: "1.125rem", gap: "0.5rem", letterSpacing: "0.14em" },
  lg: { icon: "3rem", fontSize: "1.625rem", gap: "0.75rem", letterSpacing: "0.16em" },
} as const;

const COLORS = {
  dark: "#2C2C2A",
  light: "#FAFAF7",
} as const;

const TERRACOTTA = "#C17F59";

/**
 * Palace icon — classical Roman villa silhouette with a subtle flame
 * in the central arch representing preserved memories.
 *
 * viewBox 0 0 64 64, designed to work at any size.
 */
function PalaceIcon({ size, color }: { size: string; color: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      {/* ---------- pediment (triangular roof) ---------- */}
      <polygon points="32,4 6,22 58,22" fill={TERRACOTTA} />

      {/* small acroterion / peak ornament */}
      <circle cx="32" cy="6" r="1.6" fill={TERRACOTTA} />

      {/* cornice line across pediment base */}
      <rect x="6" y="15" width="52" height="0.7" rx="0.35" fill={color} opacity="0.10" />

      {/* ---------- entablature ---------- */}
      <rect x="5" y="22" width="54" height="3.5" rx="0.5" fill={TERRACOTTA} />
      <rect x="5" y="22" width="54" height="1" rx="0.5" fill={color} opacity="0.08" />

      {/* ---------- columns (6 Ionic-style) ---------- */}
      {[10, 18.8, 27.6, 36.4, 45.2, 54].map((cx, i) => (
        <g key={i}>
          {/* capital */}
          <rect x={cx - 3} y="25.5" width={6} height="1.8" rx="0.9" fill={TERRACOTTA} />
          {/* shaft — slight entasis via rx */}
          <rect x={cx - 2.2} y="27.3" width={4.4} height="22.2" rx="1.4" fill={TERRACOTTA} />
          {/* fluting highlight */}
          <rect x={cx - 0.4} y="27.3" width={0.8} height="22.2" rx="0.4" fill={color} opacity="0.07" />
          {/* base */}
          <rect x={cx - 3.2} y="49.5" width={6.4} height="1.8" rx="0.9" fill={TERRACOTTA} />
        </g>
      ))}

      {/* ---------- central arch ---------- */}
      <path
        d="M26 51.3 L26 38 Q32 30 38 38 L38 51.3"
        fill={TERRACOTTA}
      />
      {/* arch opening (cut-out effect) */}
      <path
        d="M28.4 51.3 L28.4 39.6 Q32 33.2 35.6 39.6 L35.6 51.3"
        fill="#1A1A18"
        opacity="0.85"
      />

      {/* ---------- flame / memory light ---------- */}
      <path
        d="M32 44.5 Q30.2 41.5 32 37.8 Q33.8 41.5 32 44.5Z"
        fill="#E8A74E"
        opacity="0.9"
      />
      <ellipse cx="32" cy="44.8" rx="1.1" ry="0.6" fill="#E8A74E" opacity="0.5" />

      {/* ---------- stylobate / steps ---------- */}
      <rect x="4" y="51.3" width="56" height="3" rx="0.5" fill={TERRACOTTA} />
      <rect x="2" y="54.3" width="60" height="3.2" rx="0.5" fill={TERRACOTTA} />
      <rect x="0" y="57.5" width="64" height="3" rx="0.5" fill={TERRACOTTA} />

      {/* step highlight */}
      <rect x="4" y="51.3" width="56" height="0.6" rx="0.3" fill={color} opacity="0.06" />
      <rect x="2" y="54.3" width="60" height="0.6" rx="0.3" fill={color} opacity="0.06" />
    </svg>
  );
}

export default function PalaceLogo({
  variant = "full",
  color = "dark",
  size = "md",
  style,
}: PalaceLogoProps) {
  const s = SIZES[size];
  const textColor = COLORS[color];

  if (variant === "mark") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", ...style }}>
        <PalaceIcon size={s.icon} color={textColor} />
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: s.gap,
        ...style,
      }}
    >
      <PalaceIcon size={s.icon} color={textColor} />
      <span
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 400,
          fontSize: s.fontSize,
          letterSpacing: s.letterSpacing,
          color: textColor,
          lineHeight: 1.1,
          whiteSpace: "nowrap",
          textTransform: "uppercase",
        }}
      >
        The Memory Palace
      </span>
    </span>
  );
}
