"use client";

import React from "react";

type PalaceLogoProps = {
  variant?: "full" | "mark";
  color?: "dark" | "light";
  size?: "sm" | "md" | "lg" | "xl";
  style?: React.CSSProperties;
};

const SIZES = {
  sm: { icon: "1.5rem", fontSize: "0.875rem", gap: "0.375rem", letterSpacing: "0.12em" },
  md: { icon: "2rem", fontSize: "1.125rem", gap: "0.5rem", letterSpacing: "0.14em" },
  lg: { icon: "3rem", fontSize: "1.625rem", gap: "0.75rem", letterSpacing: "0.16em" },
  xl: { icon: "4.5rem", fontSize: "2rem", gap: "1rem", letterSpacing: "0.18em" },
} as const;

const COLORS = {
  dark: "#2C2C2A",
  light: "#FAFAF7",
} as const;

/**
 * Palace icon — classical temple with 4 pillars + 5th pillar (oval) being raised.
 * The oval at 70% opacity symbolises the memory yet to be built.
 *
 * viewBox 0 0 100 100, matches the finalized brand icon kit.
 */
function PalaceIcon({ size, color }: { size: string; color: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <g fill={color}>
        {/* pediment (roof) */}
        <path d="M10 32 L50 12 L90 32 L88 40 L12 40 Z" />
        {/* 4 pillars */}
        <rect x="18" y="40" width="8" height="32" />
        <rect x="32" y="40" width="8" height="32" />
        <rect x="46" y="40" width="8" height="32" />
        <rect x="60" y="40" width="8" height="32" />
        {/* 5th pillar — being raised */}
        <ellipse cx="78" cy="56" rx="4" ry="14" opacity="0.7" />
        {/* base / steps */}
        <rect x="10" y="72" width="80" height="4" />
        <rect x="6" y="78" width="88" height="4" />
        <rect x="2" y="84" width="96" height="4" />
      </g>
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
          fontWeight: 500,
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
