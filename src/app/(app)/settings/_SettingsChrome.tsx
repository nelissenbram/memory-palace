"use client";

/**
 * _SettingsChrome — shared body chrome for the settings sub-pages.
 *
 * The settings SHELL (layout.tsx sidebar/tab-bar + the /me identity page) is
 * already premium; these helpers bring each sub-page BODY up to the same canon:
 *
 *   • SettingsPageHeader — the warm page header used across all 8 sub-pages:
 *       ember-tinted icon medallion (reusing the SettingsIcon glyph family from
 *       layout.tsx) + Fraunces ink title + one muted subtitle line. Desktop-only
 *       by default (the nav tab carries context on mobile), matching how the
 *       pages already gate their old <h2> headers on !isMobile.
 *
 *   • SectionOverline — the canon section overline: ember dot + 0.6875rem/700/
 *       uppercase/0.12em label + a fading hairline rule (identical grammar to the
 *       MeClient lane header and libraryTokens accentRule).
 *
 * Style only — no logic, handlers, data or routes live here.
 */

import { T } from "@/lib/theme";
import { INK, MUTED, EMBER, EMBER_GLYPH, HAIRLINE } from "@/lib/libraryTokens";

/* ── Icon set (same visual family as layout.tsx SettingsIcon) ── */
export function SettingsGlyph({ name, size = 20 }: { name: string; size?: number }) {
  const s = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "profile":
      return (
        <svg {...s} aria-hidden="true">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "family":
      return (
        <svg {...s} aria-hidden="true">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case "subscription":
      return (
        <svg {...s} aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "connections":
      return (
        <svg {...s} aria-hidden="true">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...s} aria-hidden="true">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      );
    case "legacy":
      return (
        <svg {...s} aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "security":
      return (
        <svg {...s} aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "sharing":
      return (
        <svg {...s} aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * The warm page header — ember medallion + Fraunces title + muted subtitle.
 * `hidden` lets callers preserve their existing `!isMobile` gate.
 */
export function SettingsPageHeader({
  icon,
  title,
  subtitle,
  hidden = false,
  action,
}: {
  icon: string;
  title: string;
  subtitle: string;
  hidden?: boolean;
  action?: React.ReactNode;
}) {
  if (hidden) return null;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "1rem",
      marginBottom: "2rem",
    }}>
      {/* Ember medallion (matches layout.tsx active-door medallion grammar) */}
      <span aria-hidden="true" style={{
        width: "3rem", height: "3rem", borderRadius: "50%",
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(184,92,56,0.09)",
        color: EMBER_GLYPH,
        boxShadow: "inset 0 0.0625rem 0 rgba(255,255,255,0.35)",
      }}>
        <SettingsGlyph name={icon} size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{
          fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 600,
          color: INK, margin: "0 0 0.375rem", lineHeight: 1.15,
        }}>
          {title}
        </h2>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED,
          margin: 0, lineHeight: 1.45, maxWidth: "34rem",
        }}>
          {subtitle}
        </p>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}

/**
 * The canon section overline: ember dot + uppercase small-caps label + a fading
 * hairline rule. Use to lead a section card's content.
 */
export function SectionOverline({ label, style }: { label: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      marginBottom: "1rem", ...style,
    }}>
      <span aria-hidden="true" style={{
        width: "0.5rem", height: "0.5rem", borderRadius: "50%",
        background: EMBER_GLYPH, flexShrink: 0,
      }} />
      <span style={{
        fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: EMBER_GLYPH, whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      <span aria-hidden="true" style={{
        flex: 1, height: "0.0625rem",
        background: `linear-gradient(90deg, ${HAIRLINE}, transparent)`,
      }} />
    </div>
  );
}

/* Shared canon values re-exported for convenience in the sub-pages. */
export { INK, MUTED, EMBER, EMBER_GLYPH, HAIRLINE };
