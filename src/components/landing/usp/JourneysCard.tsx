"use client";

/**
 * Journeys USP card — "The Chapter Ledger, down the Lit Corridor".
 *
 * A crafted mini product window: a chapter header with a line-drawn house
 * vignette, a corridor of 12 doorway-arches standing on a hairline floor
 * (chapters 1-2 lit, chapter 3 being lit by lamplight on a shared 10s clock),
 * a small ledger of completed chapters, and a hero "next question" row.
 *
 * NOTE: the hard-coded 12 arches / 3 lit mirror the numbers baked into
 * m.journeyChapter ("Chapter 3 of 12 — ...", en.json:5382). If that copy
 * changes, this visual must change with it.
 */

import React from "react";
import UspCardShell, { U } from "./UspCardShell";

const LIT_ARCH_BACKGROUND = `linear-gradient(180deg, rgba(212, 175, 55, 0.35), transparent 60%), ${U.accent}`;

const TOTAL_ARCHES = 12; // ties to "of 12" in m.journeyChapter (en.json:5382)
const ANIMATED_ARCH_INDEX = 2; // chapter 3, zero-based — ties to "Chapter 3"

export default function JourneysCard({
  m,
  aiLabel,
}: {
  m: Record<string, string>;
  aiLabel?: string;
}) {
  const archRadius = "0.5rem 0.5rem 0.1875rem 0.1875rem";

  const litArchStyle: React.CSSProperties = {
    flex: 1,
    height: "1.125rem",
    boxSizing: "border-box",
    borderRadius: archRadius,
    background: LIT_ARCH_BACKGROUND,
    border: `1px solid ${U.accent}`,
  };

  const unlitArchStyle: React.CSSProperties = {
    flex: 1,
    height: "1.125rem",
    boxSizing: "border-box",
    borderRadius: archRadius,
    background: U.surface,
    border: `1px solid ${U.hairline}`,
  };

  return (
    <UspCardShell
      icon={
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 20 V10 a7 7 0 0 1 14 0 V20" />
          <path d="M11 20 C7.8 18.2 14.2 15.8 11 14" />
          <path d="M9.6 9.4 a1.4 1.4 0 1 0 2.8 0 a1.4 1.4 0 1 0 -2.8 0" />
        </svg>
      }
      name={m.journeyName} role={m.journeyRole}
      aiLabel={aiLabel}
      label={m.journeyName}
    >
      <style>{`
        .lv2u-jrn-body {
          container-type: inline-size;
          display: flex;
          flex-direction: column;
        }
        .lv2u-jrn-title {
          font-size: 1.0625rem;
        }
        .lv2u-jrn-track {
          gap: 0.25rem;
        }
        @container (max-width: 20rem) {
          .lv2u-jrn-title { font-size: 1rem; }
        }
        @container (max-width: 18rem) {
          .lv2u-jrn-track { gap: 0.1875rem; }
        }

        /* One shared 10s clock; beats are keyframe percentages so nothing drifts.
           Non-animated defaults below each keyframe block are the RESOLVED story
           state, so reduced-motion is purely subtractive. */
        .lv2u-jrn-fill {
          transform-origin: left;
          animation: lv2u-jrn-fill 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        @keyframes lv2u-jrn-fill {
          0%, 12% { transform: scaleX(0); opacity: 1; }
          24%     { transform: scaleX(1); opacity: 1; }
          94%     { transform: scaleX(1); opacity: 1; }
          100%    { transform: scaleX(1); opacity: 0; }
        }
        .lv2u-jrn-tip {
          opacity: 0;
          animation: lv2u-jrn-tip 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        @keyframes lv2u-jrn-tip {
          0%, 11% { opacity: 0; }
          12%, 24% { opacity: 1; }
          31%, 100% { opacity: 0; }
        }
        .lv2u-jrn-bloom {
          animation: lv2u-jrn-bloom 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        @keyframes lv2u-jrn-bloom {
          0%, 24% { box-shadow: none; }
          27.5%   { box-shadow: 0 0 0.5rem rgba(212, 175, 55, 0.5); }
          31%, 100% { box-shadow: none; }
        }
        .lv2u-jrn-star {
          animation: lv2u-jrn-star 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        @keyframes lv2u-jrn-star {
          0%, 30% {
            transform: scale(0.9);
            opacity: 0.85;
            box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.45);
          }
          33.5% {
            transform: scale(1.12);
            opacity: 1;
            box-shadow: 0 0 0 0.25rem rgba(212, 175, 55, 0.2);
          }
          37%, 94% {
            transform: scale(1);
            opacity: 1;
            box-shadow: 0 0 0 0.5rem rgba(212, 175, 55, 0);
          }
          100% {
            transform: scale(0.9);
            opacity: 0.85;
            box-shadow: 0 0 0 0.5rem rgba(212, 175, 55, 0);
          }
        }
        .lv2u-jrn-row {
          animation: lv2u-jrn-row 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        @keyframes lv2u-jrn-row {
          0%, 30% { background-color: ${U.surface}; }
          38%     { background-color: rgba(212, 175, 55, 0.08); }
          46%, 100% { background-color: ${U.surface}; }
        }

        @media (prefers-reduced-motion: reduce) {
          .lv2u-jrn-body,
          .lv2u-jrn-title,
          .lv2u-jrn-track,
          .lv2u-jrn-fill,
          .lv2u-jrn-tip,
          .lv2u-jrn-bloom,
          .lv2u-jrn-star,
          .lv2u-jrn-row {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <div className="lv2u-jrn-body" aria-hidden="true">
        {/* ROW 1 — chapter header */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
          <span
            style={{
              width: "2.75rem",
              height: "2.75rem",
              background: U.surface,
              border: `1px solid ${U.hairline}`,
              borderRadius: "0.5rem",
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke={U.accent}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: "1.5rem", height: "1.5rem" }}
            >
              <path d="M4 11 L12 4.5 L20 11" />
              <path d="M5.5 10 V19.5 H18.5 V10" />
              <path d="M10.5 19.5 V14.5 H13.5 V19.5" />
              <path d="M7.5 12.5 h2.5 v2.5 h-2.5 z" />
            </svg>
          </span>
          <span
            className="lv2u-jrn-title"
            style={{
              fontFamily: U.fontDisplay,
              fontWeight: 600,
              color: U.ink,
              lineHeight: 1.35,
              minHeight: "2.875rem",
            }}
          >
            {m.journeyChapter}
          </span>
        </div>

        {/* ROW 2 — doorway progress track (12 arches on a hairline floor) */}
        <div
          className="lv2u-jrn-track"
          style={{
            marginTop: "0.625rem",
            display: "flex",
            alignItems: "flex-end",
            paddingBottom: "0.125rem",
            borderBottom: `1px solid ${U.hairline}`,
          }}
        >
          {Array.from({ length: TOTAL_ARCHES }, (_, i) => {
            if (i === ANIMATED_ARCH_INDEX) {
              return (
                <span
                  key={i}
                  className="lv2u-jrn-bloom"
                  style={{
                    ...unlitArchStyle,
                    position: "relative",
                    overflow: "hidden", // clips the fill so scaleX never distorts the arch corners
                  }}
                >
                  <span
                    className="lv2u-jrn-fill"
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: LIT_ARCH_BACKGROUND,
                    }}
                  >
                    {/* gilded leading edge rides the sweep at the fill's right edge */}
                    <span
                      className="lv2u-jrn-tip"
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        right: 0,
                        width: "0.125rem",
                        background: U.gold,
                      }}
                    />
                  </span>
                </span>
              );
            }
            return (
              <span
                key={i}
                style={i < ANIMATED_ARCH_INDEX ? litArchStyle : unlitArchStyle}
              />
            );
          })}
        </div>

        {/* DIVIDER */}
        <div style={{ height: "1px", background: U.hairline, margin: "0.9375rem 0" }} />

        {/* ROWS 3-4 — completed-chapter ledger */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {["62%", "48%"].map((width) => (
            <div key={width} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  width: "0.875rem",
                  height: "0.875rem",
                  borderRadius: "50%",
                  background: "rgba(74, 103, 65, 0.14)",
                  border: "1px solid rgba(74, 103, 65, 0.35)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  fill="none"
                  stroke={U.success}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: "0.5rem", height: "0.5rem" }}
                >
                  <path d="M1.5 4.2 L3.3 6 L6.5 2.2" />
                </svg>
              </span>
              <span
                style={{
                  height: "0.4375rem",
                  borderRadius: "999px",
                  background: U.surface,
                  border: `1px solid ${U.hairline}`,
                  width,
                }}
              />
            </div>
          ))}
        </div>

        {/* ROW 5 — hero next row */}
        <div
          className="lv2u-jrn-row"
          style={{
            marginTop: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            backgroundColor: U.surface,
            border: `1px solid ${U.hairline}`,
            borderRadius: "0.625rem",
            padding: "0.625rem 0.75rem",
          }}
        >
          <span
            className="lv2u-jrn-star"
            style={{
              width: "1.625rem",
              height: "1.625rem",
              borderRadius: "50%",
              background: "rgba(212, 175, 55, 0.16)",
              border: "1px solid rgba(212, 175, 55, 0.5)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill={U.gold}
              stroke={U.accent}
              strokeWidth={0.5}
              strokeLinejoin="round"
              style={{ width: "0.875rem", height: "0.875rem" }}
            >
              <path d="M7 0.8 L8.85 4.55 L13 5.15 L10 8.05 L10.7 12.2 L7 10.25 L3.3 12.2 L4 8.05 L1 5.15 L5.15 4.55 Z" />
            </svg>
          </span>
          <span
            style={{
              fontFamily: U.fontBody,
              fontSize: "0.875rem",
              fontWeight: 600,
              color: U.ink,
              lineHeight: 1.35,
            }}
          >
            {m.journeyNext}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke={U.muted}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              width: "0.875rem",
              height: "0.875rem",
              marginLeft: "auto",
              flexShrink: 0,
            }}
          >
            <path d="M5 3 L9 7 L5 11" />
          </svg>
        </div>
      </div>
    </UspCardShell>
  );
}
