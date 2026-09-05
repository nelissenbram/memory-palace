"use client";

/**
 * Shared shell for the 13 USP product-vignette cards on the landing page
 * (STEMMA pattern): a crafted mini-UI window with a header bar carrying the
 * sub-brand (icon + name) and an optional AI badge, and a body rendered by
 * each feature's own card component (src/components/landing/usp/*Card.tsx).
 *
 * Contract for card bodies:
 * - all human-readable text comes from the localized `m` prop (landingV2.mock)
 * - decorative elements are aria-hidden; the card root carries role="img" + label
 * - animations are CSS-only, gentle, and fully disabled under reduced motion
 */

import React from "react";

export const U = {
  canvas: "#FCFAF5",
  surface: "#F6EBE3", // canon TRAY — recessed sandstone tray
  hairline: "#E3D6BC",
  ink: "#403B36",
  muted: "#716A5E",
  accent: "#9A4F2A",
  gold: "#D4AF37",
  success: "#4A6741",
  dark: "#241C15", // deep viewport backdrop (PalaceCard 3D scene only)
  fontBody: "var(--font-body, sans-serif)",
  fontDisplay: "var(--font-display, Georgia, serif)",
} as const;

/**
 * Shared body content min-height so every USP card in the landing grid aligns
 * on a consistent rhythm regardless of its inner vignette. Cards apply this to
 * their own body wrapper (inside the shell's 1.25rem padding).
 */
export const USP_BODY_MIN_HEIGHT = "17rem";

/**
 * Derive a translucent fill from a token hex so alpha surfaces stay locked to
 * the canon color instead of hand-copied rgba() literals.
 */
export function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function UspCardShell({
  icon,
  name,
  role,
  aiLabel,
  label,
  children,
}: {
  icon: React.ReactNode;
  name: string;
  /** Plain descriptor under the name (the Kep pattern); optional. */
  role?: string;
  /** Localized "AI-powered" badge text; omit for non-AI features. */
  aiLabel?: string;
  /** Accessible description of what the vignette depicts. */
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{
        background: U.canvas,
        border: `1px solid ${U.hairline}`,
        borderRadius: "1rem",
        boxShadow: `0 0.625rem 1.875rem ${hexAlpha(U.ink, 0.1)}`,
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.625rem",
          padding: "0.75rem 1rem",
          background: U.surface,
          borderBottom: `1px solid ${U.hairline}`,
        }}
      >
        <span style={{ display: "inline-flex", gap: "0.3rem" }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: "0.5rem",
                height: "0.5rem",
                borderRadius: "50%",
                background: U.hairline,
              }}
            />
          ))}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", marginLeft: "0.25rem", minWidth: 0 }}>
          {/* Sub-brand logo — a prominent warm medallion echoing the "Why" icons:
            a muted-warm tile, the rust glyph enlarged, and one animated gold
            accent (the pulsing glow behind it). Breathe + glow are gated behind
            prefers-reduced-motion in globals.css.
            NOTE: the .lv2-usp-logo / .lv2-usp-logo-glow / .lv2-usp-logo-glyph
            keyframes live in src/app/globals.css and only run once the landing
            page adds the `.usp-live` gate class (perf gate). Keep the class
            names here in sync with that stylesheet. */}
        <span
          className="lv2-usp-logo"
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "2.375rem",
            height: "2.375rem",
            borderRadius: "0.65rem",
            background: hexAlpha(U.accent, 0.08),
            border: `1px solid ${hexAlpha(U.accent, 0.22)}`,
            color: U.accent,
            flexShrink: 0,
          }}
        >
          <span
            aria-hidden="true"
            className="lv2-usp-logo-glow"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              background: `radial-gradient(closest-side, ${hexAlpha(U.gold, 0.5)}, transparent 72%)`,
            }}
          />
          <span className="lv2-usp-logo-glyph" style={{ position: "relative", display: "inline-flex" }}>
            {icon}
          </span>
        </span>
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span
              style={{
                fontFamily: U.fontBody,
                fontWeight: 700,
                fontSize: "0.9375rem",
                color: U.ink,
                letterSpacing: "0.01em",
                lineHeight: 1.15,
              }}
            >
              {name}
            </span>
            {role ? (
              <span
                style={{
                  fontFamily: U.fontBody,
                  fontWeight: 500,
                  fontSize: "0.75rem",
                  color: U.muted,
                  lineHeight: 1.2,
                  // Wrap to at most two lines on narrow phones / long DE-FR
                  // strings instead of clipping the sentence's meaning mid-word.
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  overflowWrap: "anywhere",
                }}
              >
                {role}
              </span>
            ) : null}
          </span>
        </span>
        {aiLabel ? (
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontFamily: U.fontBody,
              fontWeight: 700,
              fontSize: "0.6875rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: U.accent,
              background: hexAlpha(U.accent, 0.09),
              border: `1px solid ${hexAlpha(U.accent, 0.25)}`,
              borderRadius: "2rem",
              padding: "0.2rem 0.6rem",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path
                d="M5 0l1.2 3.3L9.5 4.5 6.2 5.7 5 9 3.8 5.7.5 4.5 3.8 3.3z"
                fill="currentColor"
              />
            </svg>
            {aiLabel}
          </span>
        ) : null}
      </div>
      <div style={{ padding: "1.25rem" }}>{children}</div>
    </div>
  );
}
