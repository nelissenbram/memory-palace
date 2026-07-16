"use client";

/**
 * Capsule USP card — "The Letter on the Desk".
 *
 * A sealed envelope resting on a desk mat: back-of-envelope fold lines, a
 * hand-poured wax seal holding the flap shut, the sub-brand inscribed on the
 * face, then a lock line (closed padlock + release date) and a dedication.
 * One 9s ambient beat: afternoon light sweeps the paper, then the wax a
 * heartbeat later, then ~7.8s of absolute stillness — sealed and patient.
 * No open affordance anywhere: the card's message is that it stays shut.
 */

import React from "react";
import UspCardShell, { U } from "./UspCardShell";

const SHEEN_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export default function CapsuleCard({
  m,
  aiLabel,
}: {
  m: Record<string, string>;
  aiLabel?: string;
}) {
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
          <path d="M4.5 4.5h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
          <path d="M2.5 6.5l6.2 4.2M19.5 6.5l-6.2 4.2" />
          <circle cx="11" cy="12.3" r="2.8" />
        </svg>
      }
      name={m.capsuleName}
      aiLabel={aiLabel}
      label={`${m.capsuleName} — ${m.sealedUntil}. ${m.capsuleFor}`}
    >
      <style>{`
        /* One shared sweep: Layer A (paper) at 0s, Layer B (wax) 0.15s behind —
           the paper-then-wax delay is what sells it as ambient sunlight.
           1.08s of travel, then ~7.8s of rest: the stillness IS the message. */
        @keyframes lv2u-cap-sheen {
          0%   { transform: translateX(-160%); }
          12%  { transform: translateX(160%); }
          100% { transform: translateX(160%); }
        }
        .lv2u-cap-sheen-paper {
          will-change: transform;
          animation: lv2u-cap-sheen 9s ${SHEEN_EASE} infinite;
        }
        .lv2u-cap-sheen-wax {
          will-change: transform;
          animation: lv2u-cap-sheen 9s ${SHEEN_EASE} infinite;
          animation-delay: 0.15s;
        }
        @media (prefers-reduced-motion: reduce) {
          .lv2u-cap-sheen-paper,
          .lv2u-cap-sheen-wax {
            animation: none !important;
            transition: none !important;
          }
          /* Complete story state without motion: no roaming paper glint, and
             the wax keeps a static diagonal highlight for dimensionality. */
          .lv2u-cap-sheen-paper { display: none; }
          .lv2u-cap-sheen-wax {
            transform: translateX(-10%);
            opacity: 0.45;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
      >
        {/* ROW 1 — desk mat with the sealed envelope */}
        <div
          style={{
            background: U.surface,
            borderRadius: "0.75rem",
            padding: "0.75rem",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "7.5rem",
              background: U.canvas,
              border: `1px solid ${U.hairline}`,
              borderRadius: "0.375rem",
              boxShadow: `0 1px 0 ${U.hairline}, 0 0.375rem 0.875rem rgba(36, 28, 21, 0.06)`,
              overflow: "hidden",
            }}
          >
            {/* a. stationery inner hairline */}
            <div
              style={{
                position: "absolute",
                inset: "0.375rem",
                border: "1px solid rgba(227, 214, 188, 0.55)",
                borderRadius: "0.25rem",
                pointerEvents: "none",
              }}
            />

            {/* b. envelope fold lines (seen from the back) */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
            >
              <path
                d="M0,0 L50,48 L100,0 Z"
                fill="rgba(227, 214, 188, 0.22)"
                stroke={U.hairline}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M0,100 L50,48"
                fill="none"
                stroke="rgba(227, 214, 188, 0.55)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M100,100 L50,48"
                fill="none"
                stroke="rgba(227, 214, 188, 0.55)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* c. paper sheen — Layer A */}
            <div
              className="lv2u-cap-sheen-paper"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "60%",
                height: "100%",
                background:
                  "linear-gradient(115deg, transparent 35%, rgba(252, 250, 245, 0.5) 50%, transparent 65%)",
                opacity: 0.12,
              }}
            />

            {/* d. wax seal — hand-poured blob holding the flap shut */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "48%",
                transform: "translate(-50%, -50%)",
                width: "3rem",
                height: "3rem",
                borderRadius: "47% 53% 51% 49% / 52% 48% 55% 45%",
                background: `radial-gradient(circle at 35% 30%, rgba(252, 250, 245, 0.24) 0%, rgba(252, 250, 245, 0) 55%), radial-gradient(circle at 68% 78%, rgba(36, 28, 21, 0.30) 0%, rgba(36, 28, 21, 0) 60%), ${U.accent}`,
                border: "1px solid rgba(36, 28, 21, 0.35)",
                boxShadow:
                  "0 0.2rem 0.4rem rgba(36, 28, 21, 0.22), inset 0 0.08rem 0.12rem rgba(255, 255, 255, 0.28), inset 0 -0.12rem 0.18rem rgba(36, 28, 21, 0.30)",
                overflow: "hidden",
                isolation: "isolate",
                display: "grid",
                placeItems: "center",
              }}
            >
              {/* debossed medallion with a two-leaf laurel sprig (no letterforms) */}
              <div
                style={{
                  width: "1.75rem",
                  height: "1.75rem",
                  borderRadius: "50% 50% 48% 52% / 52% 48% 50% 50%",
                  border: "1px solid rgba(252, 250, 245, 0.28)",
                  boxShadow:
                    "inset 0 0.0625rem 0.0625rem rgba(255, 255, 255, 0.20), inset 0 -0.0625rem 0.125rem rgba(36, 28, 21, 0.28)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="rgba(36, 28, 21, 0.40)"
                  strokeWidth={1.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: "1rem", height: "1rem" }}
                >
                  <path d="M8 13 C8 10.2 8 7 8 3.8" />
                  <path d="M8 8.6 C6.1 8.1 4.9 6.6 4.9 4.9 C6.7 5.3 7.8 6.7 8 8.6 Z" />
                  <path d="M8 8.6 C9.9 8.1 11.1 6.6 11.1 4.9 C9.3 5.3 8.2 6.7 8 8.6 Z" />
                </svg>
              </div>

              {/* wax sheen — Layer B, one beat behind the paper */}
              <div
                className="lv2u-cap-sheen-wax"
                style={{
                  position: "absolute",
                  left: "-50%",
                  top: 0,
                  width: "200%",
                  height: "100%",
                  background:
                    "linear-gradient(115deg, transparent 40%, rgba(252, 250, 245, 0.28) 50%, transparent 60%)",
                }}
              />
            </div>

            {/* e. inscription on the envelope face */}
            <div
              style={{
                position: "absolute",
                left: "0.5rem",
                right: "0.5rem",
                bottom: "0.625rem",
                textAlign: "center",
                fontFamily: U.fontDisplay,
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: "1.0625rem",
                lineHeight: 1.3,
                letterSpacing: "0.02em",
                color: U.ink,
              }}
            >
              {m.capsuleName}
            </div>
          </div>
        </div>

        {/* ROWS 2 + 3 — lock line and dedication as one sub-stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {/* ROW 2 — closed padlock + release date (never animated) */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
              borderTop: `1px solid ${U.hairline}`,
              paddingTop: "0.75rem",
            }}
          >
            <svg
              viewBox="0 0 14 14"
              fill="none"
              stroke={U.accent}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                width: "0.875rem",
                height: "0.875rem",
                flexShrink: 0,
                marginTop: "0.125rem",
              }}
            >
              <rect x="2.5" y="6" width="9" height="6" rx="1.25" />
              <path d="M4.5 6 V4.25 a2.5 2.5 0 0 1 5 0 V6" />
            </svg>
            <span
              style={{
                fontFamily: U.fontBody,
                fontWeight: 600,
                fontSize: "0.8125rem",
                lineHeight: 1.4,
                letterSpacing: "0.01em",
                color: U.ink,
                whiteSpace: "normal",
              }}
            >
              {m.sealedUntil}
            </span>
          </div>

          {/* ROW 3 — dedication, aligned under the lock-line text */}
          <div
            style={{
              paddingLeft: "1.375rem",
              fontFamily: U.fontDisplay,
              fontStyle: "italic",
              fontSize: "0.9375rem",
              lineHeight: 1.35,
              color: U.muted,
            }}
          >
            {m.capsuleFor}
          </div>
        </div>
      </div>
    </UspCardShell>
  );
}
