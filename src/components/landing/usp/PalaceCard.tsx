"use client";

/**
 * PALACE USP card — "The Hall Where Rooms Introduce Themselves".
 * A crafted product viewport into the 3D entrance hall: three doors receive
 * their localized name chips once (one-shot intro), then the scene rests with
 * a slow 12s Ken-Burns breath and a faint halo pulse on the door anchors.
 */

import React from "react";
import Image from "next/image";
import UspCardShell, { U, USP_BODY_MIN_HEIGHT } from "./UspCardShell";

const CSS = `
.lv2u-palace-root {
  container-type: inline-size;
}
.lv2u-palace-img {
  animation: lv2u-palace-kenburns 12s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
  will-change: transform;
}
.lv2u-palace-chips {
  animation: lv2u-palace-parallax 12s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
  will-change: transform;
}
@keyframes lv2u-palace-kenburns {
  0% { transform: scale(1); }
  66.667% { transform: scale(1.04); }
  100% { transform: scale(1); }
}
@keyframes lv2u-palace-parallax {
  0% { transform: scale(1); }
  66.667% { transform: scale(1.015); }
  100% { transform: scale(1); }
}
/* Resting state is FULLY VISIBLE: if JS is disabled or the IntersectionObserver
   perf gate never adds .usp-live (so the intro animation is paused at 0% and
   never plays), the door labels + stems must still be readable rather than
   stuck hidden. The hide→reveal intro only applies once the card is live. */
.lv2u-palace-stem {
  transform: scaleY(1);
  transform-origin: top;
}
.lv2u-palace-pill {
  opacity: 1;
  transform: translateY(0);
}
[data-usp-idx].usp-live .lv2u-palace-stem {
  transform: scaleY(0);
  animation: lv2u-palace-stemdraw 0.2s ease-out forwards;
}
@keyframes lv2u-palace-stemdraw {
  to { transform: scaleY(1); }
}
[data-usp-idx].usp-live .lv2u-palace-pill {
  opacity: 0;
  transform: translateY(0.375rem);
  animation: lv2u-palace-pillin 0.6s cubic-bezier(0.22, 0.8, 0.3, 1) forwards;
}
@keyframes lv2u-palace-pillin {
  to { opacity: 1; transform: translateY(0); }
}
.lv2u-palace-halo {
  opacity: 0.25;
  animation: lv2u-palace-halopulse 6s ease-in-out infinite;
}
@keyframes lv2u-palace-halopulse {
  0% { opacity: 0.25; }
  50% { opacity: 0.45; }
  100% { opacity: 0.25; }
}
.lv2u-palace-d1 { animation-delay: 0.6s; }
.lv2u-palace-d2 { animation-delay: 0.8s; }
.lv2u-palace-d3 { animation-delay: 1.4s; }
.lv2u-palace-d4 { animation-delay: 1.6s; }
.lv2u-palace-d5 { animation-delay: 2.2s; }
.lv2u-palace-d6 { animation-delay: 2.4s; }
.lv2u-palace-h1 { animation-delay: 0s; }
.lv2u-palace-h2 { animation-delay: 0.5s; }
.lv2u-palace-h3 { animation-delay: 1s; }
/* INTENTIONAL container-query exception (documented so audits don't revert it):
   this vignette must respond to the CARD's own rendered width, not the viewport,
   because the same card appears in a 1-, 2- and 3-up grid at identical viewport
   widths. useIsMobile/useIsCompact only read the viewport and cannot express
   "this card is narrow", so a self-scoped @container on .lv2u-palace-root is the
   correct tool here. These rules only nudge decorative chip placement — no
   layout/legibility depends on them, and everything degrades gracefully where
   container queries are unsupported. */
@container (max-width: 18rem) {
  .lv2u-palace-dot { display: none; }
}
/* On narrow phones pull the outer door pills inward so the right-most one
   (centered at 82%) cannot clip against the frame edge. */
@container (max-width: 22rem) {
  .lv2u-palace-chips > div:nth-child(1) { left: 24% !important; }
  .lv2u-palace-chips > div:nth-child(3) { left: 76% !important; }
}
@media (prefers-reduced-motion: reduce) {
  .lv2u-palace-root,
  .lv2u-palace-img,
  .lv2u-palace-chips,
  .lv2u-palace-stem,
  .lv2u-palace-pill,
  .lv2u-palace-halo,
  .lv2u-palace-dot {
    animation: none !important;
    transition: none !important;
  }
  .lv2u-palace-img,
  .lv2u-palace-chips { transform: scale(1) !important; }
  .lv2u-palace-stem { transform: scaleY(1) !important; }
  .lv2u-palace-pill { opacity: 1 !important; transform: none !important; }
  .lv2u-palace-halo { opacity: 0.25 !important; }
}
`;

export default function PalaceCard({
  m,
  aiLabel,
}: {
  m: Record<string, string>;
  aiLabel?: string;
}) {
  const chips: {
    label: string;
    left: string;
    top: string;
    stemDelay: string;
    pillDelay: string;
    haloDelay: string;
    minWidth?: string;
  }[] = [
    {
      label: m.room1,
      left: "18%",
      top: "38%",
      stemDelay: "lv2u-palace-d1",
      pillDelay: "lv2u-palace-d2",
      haloDelay: "lv2u-palace-h1",
    },
    {
      label: m.room2,
      left: "50%",
      top: "33%",
      stemDelay: "lv2u-palace-d3",
      pillDelay: "lv2u-palace-d4",
      haloDelay: "lv2u-palace-h2",
      // Sized to fully cover the baked-in door plate beneath it.
      minWidth: "5.5rem",
    },
    {
      label: m.room3,
      left: "82%",
      top: "40%",
      stemDelay: "lv2u-palace-d5",
      pillDelay: "lv2u-palace-d6",
      haloDelay: "lv2u-palace-h3",
    },
  ];

  return (
    <UspCardShell
      icon={
        <svg
          viewBox="0 0 22 22"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19V9l7-5.5L18 9v10" />
          <path d="M4 9h14" />
          <path d="M8.2 19v-5.4a2.8 2.8 0 0 1 5.6 0V19" />
          <path d="M2.5 19h17" />
        </svg>
      }
      name={m.palaceName} role={m.palaceRole}
      aiLabel={aiLabel}
      label={`${m.palaceName}: ${m.room1} · ${m.room2} · ${m.room3}`}
    >
      <style>{CSS}</style>
      <div
        className="lv2u-palace-root"
        aria-hidden="true"
        style={{
          // Shared USP body rhythm so this card aligns in height with siblings
          // (e.g. KepCard) across the landing grid.
          minHeight: USP_BODY_MIN_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* ROW 1 — engraved plaque header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.875rem",
          }}
        >
          <span
            style={{ flex: 1, height: "0.0625rem", background: U.hairline }}
          />
          {/* The sub-brand name already shows once in the shell header; here we
             keep only the two gold diamonds as a ceremonial ornament divider so
             the name is not repeated a second time on the same card. */}
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: "0.3125rem",
                height: "0.3125rem",
                background: U.gold,
                transform: "rotate(45deg)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                width: "0.3125rem",
                height: "0.3125rem",
                background: U.gold,
                transform: "rotate(45deg)",
                flexShrink: 0,
              }}
            />
          </span>
          <span
            style={{ flex: 1, height: "0.0625rem", background: U.hairline }}
          />
        </div>

        {/* ROW 2 — the viewport */}
        <div
          style={{
            position: "relative",
            aspectRatio: "16 / 9",
            borderRadius: "0.625rem",
            border: `0.0625rem solid ${U.hairline}`,
            overflow: "hidden",
            background: U.dark,
            boxShadow: "inset 0 0 0 0.0625rem rgba(212, 175, 55, 0.22)",
          }}
        >
          {/* [1] a corridor of framed memories */}
          <Image
            src="/landing/band-corridor.jpg"
            alt=""
            width={1600}
            height={534}
            className="lv2u-palace-img"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "50% 50%",
            }}
          />

          {/* [2] scrims */}
          <div
            style={{
              position: "absolute",
              inset: "0 0 auto 0",
              height: "22%",
              background:
                "linear-gradient(to bottom, rgba(36, 28, 21, 0.28), transparent)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "auto 0 0 0",
              height: "18%",
              background:
                "linear-gradient(to top, rgba(36, 28, 21, 0.22), transparent)",
            }}
          />

          {/* [3] chip layer — same crop as the image, phase-locked parallax */}
          <div
            className="lv2u-palace-chips"
            style={{ position: "absolute", inset: 0 }}
          >
            {chips.map((chip) => (
              <div
                key={chip.label + chip.left}
                style={{
                  position: "absolute",
                  left: chip.left,
                  top: chip.top,
                  transform: "translateX(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <span
                  className={`lv2u-palace-pill ${chip.pillDelay}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    padding: "0.375rem 0.75rem",
                    borderRadius: "999rem",
                    background: "rgba(252, 250, 245, 0.94)",
                    border: `0.0625rem solid ${U.hairline}`,
                    boxShadow: "0 0.25rem 0.75rem rgba(36, 28, 21, 0.25)",
                    minWidth: chip.minWidth,
                    // Never let a long localized door label (fr "Déjeuners du
                    // dimanche") push the pill past the 16:9 frame on phones.
                    maxWidth: "min(11rem, 44cqw)",
                  }}
                >
                  <span
                    className="lv2u-palace-dot"
                    style={{
                      width: "0.375rem",
                      height: "0.375rem",
                      borderRadius: "50%",
                      background: U.gold,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: U.fontBody,
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      color: U.ink,
                      letterSpacing: "0.01em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      minWidth: 0,
                    }}
                  >
                    {chip.label}
                  </span>
                </span>
                <span
                  className={`lv2u-palace-stem ${chip.stemDelay}`}
                  style={{
                    width: "0.0625rem",
                    height: "0.875rem",
                    background: "rgba(252, 250, 245, 0.8)",
                  }}
                />
                <span
                  style={{
                    position: "relative",
                    width: "0.3125rem",
                    height: "0.3125rem",
                    display: "inline-flex",
                  }}
                >
                  <span
                    className={`lv2u-palace-halo ${chip.haloDelay}`}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "0.6875rem",
                      height: "0.6875rem",
                      marginTop: "-0.34375rem",
                      marginLeft: "-0.34375rem",
                      borderRadius: "50%",
                      background: "rgba(212, 175, 55, 0.25)",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      background: U.gold,
                    }}
                  />
                </span>
              </div>
            ))}
          </div>

          {/* [4] walk affordance — static "this is walkable" cue */}
          <div
            style={{
              position: "absolute",
              bottom: "0.75rem",
              left: "50%",
              transform: "translateX(-50%)",
              width: "1.75rem",
              height: "1.75rem",
              borderRadius: "50%",
              border: "0.0625rem solid rgba(252, 250, 245, 0.7)",
              opacity: 0.7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: "0.375rem",
                height: "0.375rem",
                borderRadius: "50%",
                background: U.canvas,
              }}
            />
          </div>
        </div>
      </div>
    </UspCardShell>
  );
}
