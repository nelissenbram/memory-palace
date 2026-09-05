"use client";

import React from "react";
import { T } from "@/lib/theme";
import { EASE, ANIM } from "./TuscanStyles";

/* ─────────────────────────────────────────────
   TuscanCard — reusable card with 4 variants
   ───────────────────────────────────────────── */

export type TuscanCardVariant = "glass" | "solid" | "dark" | "elevated";

export interface TuscanCardProps {
  variant?: TuscanCardVariant;
  padding?: string;
  animate?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const variantStyles: Record<TuscanCardVariant, React.CSSProperties> = {
  // Canon: opaque CREAM card on a HAIRLINE border with the warm-ink shadow ramp.
  // No backdrop-blur "glass" and no gold accent — gold is palace-only.
  glass: {
    background: T.color.cream,
    border: `1px solid ${T.color.hairline}`,
    borderRadius: "1rem",
    boxShadow: T.shadow[1],
  },
  solid: {
    background: T.color.warmStone,
    border: `1px solid ${T.color.hairline}`,
    borderRadius: "1rem",
    boxShadow: T.shadow[1],
  },
  dark: {
    background: T.color.charcoal,
    color: T.color.linen,
    border: `1px solid rgba(255,255,255,0.08)`,
    borderRadius: "1rem",
    boxShadow: "0 0.25rem 1.5rem rgba(64,59,54,0.24)",
  },
  elevated: {
    background: T.color.cream,
    border: `1px solid ${T.color.hairline}`,
    borderRadius: "1rem",
    boxShadow: T.shadow[2],
  },
};

/** Whether the variant supports a subtle hover lift */
const liftableVariants = new Set<TuscanCardVariant>(["glass", "elevated"]);

export default function TuscanCard({
  variant = "glass",
  padding = "1.5rem",
  animate = true,
  children,
  style,
  className,
}: TuscanCardProps) {
  const base = variantStyles[variant];
  const liftable = liftableVariants.has(variant);

  return (
    <div
      style={{
        ...base,
        padding,
        position: "relative",
        overflow: "hidden",
        ...(animate
          ? { animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out both` }
          : {}),
        ...(liftable
          ? {
              transition: `transform 0.3s ${EASE}`,
            }
          : {}),
        ...style,
      }}
      className={[className, liftable ? "tuscan-card-liftable" : ""].filter(Boolean).join(" ")}
    >
      {children}
      {liftable && (
        <style>{`
          .tuscan-card-liftable:hover {
            transform: translateY(-0.125rem);
            box-shadow: 0 0.75rem 1.75rem rgba(64,59,54,0.16) !important;
          }
        `}</style>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TuscanSectionHeader — section title with a
   neutral hairline underline seam (canon)
   ───────────────────────────────────────────── */

export interface TuscanSectionHeaderProps {
  children: React.ReactNode;
  badge?: React.ReactNode;
  style?: React.CSSProperties;
}

export function TuscanSectionHeader({
  children,
  badge,
  style,
}: TuscanSectionHeaderProps) {
  return (
    <div style={{ marginBottom: "1.125rem", ...style }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          marginBottom: "0.5rem",
        }}
      >
        <h3
          style={{
            fontFamily: T.font.display,
            fontSize: "1.25rem",
            fontWeight: 600,
            color: T.color.charcoal,
            margin: 0,
            letterSpacing: "0.015em",
          }}
        >
          {children}
        </h3>
        {badge}
      </div>
      <div
        aria-hidden="true"
        style={{
          height: "0.125rem",
          width: "3.5rem",
          // Canon: neutral HAIRLINE seam, not a gold rule (gold is palace-only).
          background: `linear-gradient(90deg, ${T.color.hairline}, transparent)`,
          borderRadius: "0.125rem",
        }}
      />
    </div>
  );
}
