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
const GLOW = "#E8A74E";

/* Column x-centers for 5 evenly spaced columns */
const COLUMNS = [11.7, 22.5, 32.7, 43.2, 53.7];
const MISSING_INDEX = 1; // 2nd column is absent

/**
 * Palace icon — classical temple with 5 columns, one missing.
 * The absent 2nd pillar symbolises memories yet to be built.
 * A faint warm glow marks the gap.
 *
 * viewBox 0 0 64 64, designed to work at any size down to 16px.
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
      <polygon points="32,5 8,22 56,22" fill={TERRACOTTA} />

      {/* peak acroterion */}
      <circle cx="32" cy="7" r="1.5" fill={TERRACOTTA} />

      {/* subtle cornice line */}
      <rect x="8" y="15.5" width="48" height="0.6" rx="0.3" fill={color} opacity="0.08" />

      {/* ---------- entablature ---------- */}
      <rect x="7" y="22" width="50" height="3.5" rx="0.5" fill={TERRACOTTA} />
      <rect x="7" y="22" width="50" height="0.8" rx="0.4" fill={color} opacity="0.07" />

      {/* ---------- columns ---------- */}
      {COLUMNS.map((cx, i) => {
        if (i === MISSING_INDEX) {
          /* Missing column — warm glow placeholder */
          return (
            <g key={i}>
              <ellipse cx={cx} cy="38" rx="2.2" ry="8" fill={GLOW} opacity="0.18" />
              <ellipse cx={cx} cy="38" rx="1.2" ry="5" fill={GLOW} opacity="0.12" />
            </g>
          );
        }
        return (
          <g key={i}>
            {/* capital */}
            <rect x={cx - 2.7} y="25.5" width={5.4} height="1.6" rx="0.8" fill={TERRACOTTA} />
            {/* shaft with slight entasis */}
            <rect x={cx - 1.9} y="27.1" width={3.8} height="22.4" rx="1.2" fill={TERRACOTTA} />
            {/* fluting highlight */}
            <rect x={cx - 0.35} y="27.1" width={0.7} height="22.4" rx="0.35" fill={color} opacity="0.06" />
            {/* base */}
            <rect x={cx - 2.9} y="49.5" width={5.8} height="1.6" rx="0.8" fill={TERRACOTTA} />
          </g>
        );
      })}

      {/* ---------- stylobate / steps ---------- */}
      <rect x="5" y="51.1" width="54" height="3" rx="0.5" fill={TERRACOTTA} />
      <rect x="3" y="54.1" width="58" height="3" rx="0.5" fill={TERRACOTTA} />
      <rect x="1" y="57.1" width="62" height="3.2" rx="0.5" fill={TERRACOTTA} />

      {/* step highlights */}
      <rect x="5" y="51.1" width="54" height="0.5" rx="0.25" fill={color} opacity="0.05" />
      <rect x="3" y="54.1" width="58" height="0.5" rx="0.25" fill={color} opacity="0.05" />
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
