"use client";

/**
 * Legacy USP card — "The Second Key".
 * Two keyholders (E and M) in a warm ledger: E's key is settled and gold since
 * frame zero; M's key hovers as a muted ghost, then is handed over, clicks
 * true (gold crossfade), the slot blooms once like a wax-seal press, and the
 * status line brightens. One CSS-only 10s loop with a long settled rest and a
 * masked dissolve reset (never reverse motion). Base styles are the settled
 * end-state, so reduced motion shows "the keys are taken care of".
 */

import React from "react";
import UspCardShell, { U } from "./UspCardShell";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const SLOT_INSET = "inset 0 1px 2px rgba(36, 28, 21, 0.08)";

const HEADER_ICON = (
  <svg
    width={22}
    height={22}
    viewBox="0 0 22 22"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="6.2" cy="6.2" r="2.6" />
    <circle cx="15.8" cy="6.2" r="2.6" />
    <path d="M8.1 8.1 L17.5 17.5 M17.5 17.5 L18.7 16.3 M15.6 15.6 L16.8 14.4" />
    <path d="M13.9 8.1 L4.5 17.5 M4.5 17.5 L3.3 16.3 M6.4 15.6 L5.2 14.4" />
  </svg>
);

/** Skeleton key, drawn twice (muted base + gold overlay crossfade). */
function KeyGlyph({ stroke, className }: { stroke: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 10"
      fill="none"
      stroke={stroke}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 1,
      }}
    >
      <circle cx="5" cy="5" r="3" />
      <circle cx="5" cy="5" r="1.2" />
      <path d="M8 5 H22 M18 5 V7.5 M21 5 V7.5" />
    </svg>
  );
}

function KeyholderRow({
  initial,
  sigPath,
  animated,
}: {
  initial: string;
  sigPath: string;
  animated: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        minHeight: "3.5rem",
        padding: "0.625rem 0.75rem",
        background: U.surface,
        border: `1px solid ${U.hairline}`,
        borderRadius: "0.75rem",
      }}
    >
      {/* Monogram avatar */}
      <span
        style={{
          flex: "none",
          width: "2.25rem",
          height: "2.25rem",
          borderRadius: "50%",
          background: "rgba(154, 79, 42, 0.10)",
          border: `1px solid ${U.hairline}`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: U.fontDisplay,
          fontSize: "1.125rem",
          fontWeight: 600,
          color: U.accent,
        }}
      >
        {initial}
      </span>

      {/* Signature trace + ledger rule */}
      <span style={{ flex: 1, minWidth: "2.5rem", overflow: "hidden" }}>
        <svg
          viewBox="0 0 88 14"
          preserveAspectRatio="xMinYMid meet"
          fill="none"
          stroke={U.muted}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ display: "block", width: "100%", height: "0.875rem" }}
        >
          <path d={sigPath} />
        </svg>
        <span
          style={{
            display: "block",
            width: "70%",
            maxWidth: "4.5rem",
            height: "1px",
            background: U.hairline,
            marginTop: "0.25rem",
          }}
        />
      </span>

      {/* Key rest slot */}
      <span
        className={animated ? "lv2u-leg-mslot" : undefined}
        style={{
          flex: "none",
          marginLeft: "auto",
          width: "2.5rem",
          height: "1.25rem",
          borderRadius: "9999px",
          background: "rgba(36, 28, 21, 0.05)",
          border: `1px solid ${U.hairline}`,
          boxShadow: SLOT_INSET,
          overflow: "visible",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          className={animated ? "lv2u-leg-mkey" : undefined}
          style={{
            position: "relative",
            width: "1.5rem",
            height: "0.625rem",
            display: "inline-block",
            transformOrigin: "25% 50%",
            opacity: 1,
            transform: "none",
          }}
        >
          <KeyGlyph stroke={U.muted} />
          <KeyGlyph stroke={U.gold} className={animated ? "lv2u-leg-mgold" : undefined} />
        </span>
      </span>

      {/* Success dot */}
      <span
        className={animated ? "lv2u-leg-mdot" : undefined}
        style={{
          flex: "none",
          marginLeft: "0.5rem",
          width: "0.375rem",
          height: "0.375rem",
          borderRadius: "50%",
          background: U.success,
          opacity: 1,
        }}
      />
    </div>
  );
}

export default function LegacyCard({
  m,
  aiLabel,
}: {
  m: Record<string, string>;
  aiLabel?: string;
}) {
  return (
    <UspCardShell icon={HEADER_ICON} name={m.legacyName} aiLabel={aiLabel} label={m.legacyName}>
      <style>{`
        @keyframes lv2u-leg-keymove {
          0%, 20% {
            opacity: 0.35;
            transform: translateY(-0.45rem) rotate(-24deg) scale(1);
            animation-timing-function: ${EASE};
          }
          34% {
            opacity: 1;
            transform: translateY(0) rotate(3deg) scale(1.02);
            animation-timing-function: ${EASE};
          }
          38%, 94% {
            opacity: 1;
            transform: translateY(0) rotate(0deg) scale(1);
          }
          97% {
            opacity: 0;
            transform: translateY(0) rotate(0deg) scale(1);
          }
          97.4% {
            opacity: 0;
            transform: translateY(-0.45rem) rotate(-24deg) scale(1);
          }
          100% {
            opacity: 0.35;
            transform: translateY(-0.45rem) rotate(-24deg) scale(1);
          }
        }
        @keyframes lv2u-leg-goldfade {
          0%, 34% { opacity: 0; animation-timing-function: ${EASE}; }
          38%, 94% { opacity: 1; }
          97%, 100% { opacity: 0; }
        }
        @keyframes lv2u-leg-slotbloom {
          0%, 37% {
            box-shadow: ${SLOT_INSET}, 0 0 0 0 rgba(212, 175, 55, 0);
            border-color: ${U.hairline};
          }
          38% {
            box-shadow: ${SLOT_INSET}, 0 0 0 0 rgba(212, 175, 55, 0.45);
            border-color: rgba(212, 175, 55, 0.55);
            animation-timing-function: ${EASE};
          }
          46% {
            box-shadow: ${SLOT_INSET}, 0 0 0 0.5rem rgba(212, 175, 55, 0);
          }
          52%, 100% {
            box-shadow: ${SLOT_INSET}, 0 0 0 0.5rem rgba(212, 175, 55, 0);
            border-color: ${U.hairline};
          }
        }
        @keyframes lv2u-leg-dotfade {
          0%, 38% { opacity: 0; animation-timing-function: ${EASE}; }
          42%, 94% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes lv2u-leg-statusfade {
          0%, 38% { opacity: 0.7; animation-timing-function: ${EASE}; }
          52%, 94% { opacity: 1; }
          100% { opacity: 0.7; }
        }
        .lv2u-leg-mkey { animation: lv2u-leg-keymove 10s linear infinite; }
        .lv2u-leg-mgold { animation: lv2u-leg-goldfade 10s linear infinite; }
        .lv2u-leg-mslot { animation: lv2u-leg-slotbloom 10s linear infinite; }
        .lv2u-leg-mdot { animation: lv2u-leg-dotfade 10s linear infinite; }
        .lv2u-leg-status { animation: lv2u-leg-statusfade 10s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .lv2u-leg-mkey,
          .lv2u-leg-mgold,
          .lv2u-leg-mslot,
          .lv2u-leg-mdot,
          .lv2u-leg-status {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <div aria-hidden="true" style={{ display: "flex", flexDirection: "column" }}>
        {/* ROW 1 — title + pen-flourish underline */}
        <div
          style={{
            fontFamily: U.fontDisplay,
            fontSize: "1.375rem",
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: "0.005em",
            color: U.ink,
          }}
        >
          {m.keysTitle}
        </div>
        <svg
          viewBox="0 0 88 4"
          fill="none"
          stroke={U.gold}
          strokeWidth={1.5}
          strokeLinecap="round"
          style={{
            display: "block",
            width: "5.5rem",
            height: "0.25rem",
            marginTop: "0.375rem",
            marginBottom: "0.875rem",
          }}
        >
          <path d="M1 3 C 18 0.6, 42 3.4, 62 2.2 C 72 1.6, 80 2.2, 87 1.8" />
        </svg>

        {/* ROWS 2 + 3 — keyholders */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          <KeyholderRow
            initial="E"
            sigPath="M6 11 C4 4 9 1 11 4 C13 7 8 12 14 11 C22 9.5 27 11.5 35 10 C45 8 53 10.5 63 9 C71 7.8 77 9.5 82 8.8"
            animated={false}
          />
          <KeyholderRow
            initial="M"
            sigPath="M5 7 C8 3.5 11 4 12.5 7.5 C14 10.5 17 10 19 6.5 C21 3.5 24 4 25.5 7.5 C28 11 42 8.5 60 8 C74 7.6 82 8 82 9.5 C82 12 56 12.5 32 12"
            animated
          />
        </div>

        {/* ROW 4 — status line */}
        <div
          className="lv2u-leg-status"
          style={{
            marginTop: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            opacity: 1,
          }}
        >
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke={U.muted}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flex: "none", width: "0.75rem", height: "0.75rem" }}
          >
            <circle cx="6" cy="4.4" r="2.3" />
            <path d="M4.9 6.2 L3.7 10.3 H8.3 L7.1 6.2" />
          </svg>
          <span
            style={{
              fontFamily: U.fontBody,
              fontSize: "0.8125rem",
              fontWeight: 500,
              letterSpacing: "0.02em",
              lineHeight: 1.4,
              color: U.muted,
            }}
          >
            {m.keyWhen}
          </span>
        </div>
      </div>
    </UspCardShell>
  );
}
