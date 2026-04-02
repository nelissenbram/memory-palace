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
  glass: {
    backdropFilter: "blur(1rem)",
    WebkitBackdropFilter: "blur(1rem)",
    background: "rgba(255,255,255,0.45)",
    border: `1px solid ${T.color.cream}`,
    borderTop: `2px solid ${T.color.gold}`,
    borderRadius: "1rem",
    boxShadow: "0 0.25rem 1.5rem rgba(0,0,0,0.06)",
  },
  solid: {
    background: T.color.warmStone,
    border: `1px solid ${T.color.cream}`,
    borderRadius: "1rem",
    boxShadow: "0 0.125rem 0.5rem rgba(0,0,0,0.04)",
  },
  dark: {
    background: T.color.charcoal,
    color: T.color.linen,
    borderTop: `2px solid ${T.color.gold}`,
    border: `1px solid rgba(255,255,255,0.08)`,
    borderRadius: "1rem",
    boxShadow: "0 0.25rem 1.5rem rgba(0,0,0,0.12)",
  },
  elevated: {
    backdropFilter: "blur(0.5rem)",
    WebkitBackdropFilter: "blur(0.5rem)",
    background: "rgba(255,255,255,0.55)",
    border: `1px solid ${T.color.cream}`,
    borderRadius: "1rem",
    boxShadow:
      "0 0.5rem 2rem rgba(0,0,0,0.08), 0 0.125rem 0.5rem rgba(0,0,0,0.04)",
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
      className={className}
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
              transition: `transform 0.3s ${EASE}, box-shadow 0.3s ${EASE}`,
            }
          : {}),
        ...style,
      }}
      onMouseEnter={
        liftable
          ? (e) => {
              const el = e.currentTarget;
              el.style.transform = "translateY(-0.125rem)";
              el.style.boxShadow =
                "0 0.75rem 2rem rgba(0,0,0,0.1), 0 0.125rem 0.5rem rgba(0,0,0,0.04)";
            }
          : undefined
      }
      onMouseLeave={
        liftable
          ? (e) => {
              const el = e.currentTarget;
              el.style.transform = "";
              el.style.boxShadow = "";
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TuscanSectionHeader — section title with
   gold underline accent
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
          background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight}, transparent)`,
          borderRadius: "0.125rem",
        }}
      />
    </div>
  );
}
