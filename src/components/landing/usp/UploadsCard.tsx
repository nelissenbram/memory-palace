"use client";

/**
 * Uploads USP card — "Three photographs come home".
 * Three photo prints drift into a dashed drop tray, each landing marked by a
 * frame breath and a green check, then a warm gold glow settles over the
 * scene. CSS-only, one shared 10s loop (stagger via keyframe percentages, no
 * animation-delay). Base styles are the settled end-state so reduced motion
 * simply shows the completed scene.
 */

import React from "react";
import Image from "next/image";
import UspCardShell, { U } from "./UspCardShell";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const MAT_SHADOW = "0 0.375rem 0.75rem rgba(36, 28, 21, 0.15)";

const PRINTS: {
  src: string;
  rotate: string;
  zIndex: number;
  marginLeft?: string;
  printClass: string;
  badgeClass: string;
}[] = [
  {
    src: "/landing/demo-graduation.jpg",
    rotate: "-6deg",
    zIndex: 1,
    printClass: "lv2u-up-p1",
    badgeClass: "lv2u-up-b1",
  },
  {
    src: "/landing/demo-hands.jpg",
    rotate: "4deg",
    zIndex: 3,
    marginLeft: "-0.625rem",
    printClass: "lv2u-up-p2",
    badgeClass: "lv2u-up-b2",
  },
  {
    src: "/landing/demo-morning.jpg",
    rotate: "-3deg",
    zIndex: 2,
    marginLeft: "-0.625rem",
    printClass: "lv2u-up-p3",
    badgeClass: "lv2u-up-b3",
  },
];

export default function UploadsCard({
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
          viewBox="0 0 22 22"
          width="22"
          height="22"
          stroke="currentColor"
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M5 12h12a2 2 0 0 1 2 2v3.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V14a2 2 0 0 1 2-2Z"
            strokeDasharray="2.2 2.7"
          />
          <path
            d="M4.5 2.5h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z"
            transform="rotate(-12 6 5)"
          />
          <path
            d="M14.5 2h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"
            transform="rotate(10 16 4.5)"
          />
          <path
            d="M9.5 7h3.5a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1H9.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"
            transform="rotate(-6 11.25 9.75)"
          />
        </svg>
      }
      name={m.uploadsName} role={m.uploadsRole}
      aiLabel={aiLabel}
      label={m.uploadsName}
    >
      <style>{`
        .lv2u-up-frame rect {
          x: 1.5px;
          y: 1.5px;
          width: calc(100% - 3px);
          height: calc(100% - 3px);
        }
        .lv2u-up-frame-rect {
          animation: lv2u-up-frame 10s ease-in-out infinite;
        }
        .lv2u-up-glow {
          animation: lv2u-up-glow 10s ease-in-out infinite;
        }
        .lv2u-up-p1 { animation: lv2u-up-p1 10s ${EASE} infinite; }
        .lv2u-up-p2 { animation: lv2u-up-p2 10s ${EASE} infinite; }
        .lv2u-up-p3 { animation: lv2u-up-p3 10s ${EASE} infinite; }
        .lv2u-up-b1 { animation: lv2u-up-b1 10s ease-out infinite; }
        .lv2u-up-b2 { animation: lv2u-up-b2 10s ease-out infinite; }
        .lv2u-up-b3 { animation: lv2u-up-b3 10s ease-out infinite; }

        @keyframes lv2u-up-p1 {
          0%, 8% {
            opacity: 0;
            transform: translateY(-3rem) rotate(-11deg);
            box-shadow: 0 0.375rem 0.75rem rgba(36, 28, 21, 0.15);
          }
          11% { opacity: 1; }
          20% {
            transform: translateY(0.15rem) rotate(-5deg);
            box-shadow: 0 0.375rem 0.75rem rgba(36, 28, 21, 0.22);
          }
          22% { transform: translateY(0) rotate(-6deg); }
          25% { box-shadow: 0 0.375rem 0.75rem rgba(36, 28, 21, 0.15); }
          94% { opacity: 1; transform: translateY(0) rotate(-6deg); }
          100% { opacity: 0; transform: translateY(-0.25rem) rotate(-6deg); }
        }
        @keyframes lv2u-up-p2 {
          0%, 16% { opacity: 0; transform: translateY(-3rem) rotate(9deg); }
          19% { opacity: 1; }
          28% { transform: translateY(0.15rem) rotate(5deg); }
          30%, 94% { opacity: 1; transform: translateY(0) rotate(4deg); }
          100% { opacity: 0; transform: translateY(-0.25rem) rotate(4deg); }
        }
        @keyframes lv2u-up-p3 {
          0%, 24% { opacity: 0; transform: translateY(-3rem) rotate(-8deg); }
          27% { opacity: 1; }
          36% { transform: translateY(0.15rem) rotate(-2deg); }
          38%, 94% { opacity: 1; transform: translateY(0) rotate(-3deg); }
          100% { opacity: 0; transform: translateY(-0.25rem) rotate(-3deg); }
        }
        @keyframes lv2u-up-b1 {
          0%, 42% { opacity: 0; transform: scale(0.8); }
          45.5%, 94% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1) translateY(-0.25rem); }
        }
        @keyframes lv2u-up-b2 {
          0%, 44% { opacity: 0; transform: scale(0.8); }
          47.5%, 94% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1) translateY(-0.25rem); }
        }
        @keyframes lv2u-up-b3 {
          0%, 46% { opacity: 0; transform: scale(0.8); }
          49.5%, 94% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1) translateY(-0.25rem); }
        }
        @keyframes lv2u-up-glow {
          0%, 42% { opacity: 0; }
          48%, 94% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes lv2u-up-frame {
          0%, 20% { stroke-opacity: 0.35; }
          22.5% { stroke-opacity: 0.6; }
          25%, 28% { stroke-opacity: 0.35; }
          30.5% { stroke-opacity: 0.6; }
          33%, 36% { stroke-opacity: 0.35; }
          38.5% { stroke-opacity: 0.6; }
          41%, 100% { stroke-opacity: 0.35; }
        }

        @media (prefers-reduced-motion: reduce) {
          .lv2u-up-frame-rect,
          .lv2u-up-glow,
          .lv2u-up-p1, .lv2u-up-p2, .lv2u-up-p3,
          .lv2u-up-b1, .lv2u-up-b2, .lv2u-up-b3 {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {/* Row 1 — drop tray */}
        <div
          aria-hidden="true"
          style={{
            position: "relative",
            width: "100%",
            minHeight: "10.25rem",
            borderRadius: "0.75rem",
            background: "rgba(242, 237, 228, 0.55)",
            overflow: "hidden",
          }}
        >
          {/* Gold radial glow (settled state: on) */}
          <div
            aria-hidden="true"
            className="lv2u-up-glow"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(closest-side at 50% 62%, rgba(212, 175, 55, 0.10), transparent 60%)",
              pointerEvents: "none",
            }}
          />

          {/* Dashed drop frame */}
          <svg
            aria-hidden="true"
            className="lv2u-up-frame"
            style={{
              position: "absolute",
              inset: "1px",
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            <rect
              className="lv2u-up-frame-rect"
              rx="11"
              fill="none"
              stroke={U.accent}
              strokeOpacity={0.35}
              strokeWidth={1.5}
              strokeDasharray="5 7"
              strokeLinecap="round"
            />
          </svg>

          {/* Label zone — never animates, always fully legible */}
          <div
            style={{
              position: "relative",
              minHeight: "2.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
              paddingTop: "0.875rem",
              paddingLeft: "0.75rem",
              paddingRight: "0.75rem",
              textAlign: "center",
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 18 18"
              style={{ width: "1.125rem", height: "1.125rem", flexShrink: 0 }}
              stroke={U.accent}
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 2.5v7.5" />
              <path d="M5.75 7 9 10.25 12.25 7" />
              <path d="M3 11.5v2A1.75 1.75 0 0 0 4.75 15.25h8.5A1.75 1.75 0 0 0 15 13.5v-2" />
            </svg>
            <span
              style={{
                fontFamily: U.fontDisplay,
                fontSize: "1.125rem",
                fontWeight: 600,
                color: U.ink,
                letterSpacing: "0.01em",
              }}
            >
              {m.dropHere}
            </span>
          </div>

          {/* Thumbnail band — three polaroid prints */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: "1rem",
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
            }}
          >
            {PRINTS.map((p) => (
              <div
                key={p.src}
                className={p.printClass}
                style={{
                  position: "relative",
                  zIndex: p.zIndex,
                  marginLeft: p.marginLeft,
                  background: U.canvas,
                  padding: "0.25rem 0.25rem 0.45rem",
                  border: `1px solid ${U.hairline}`,
                  borderRadius: "0.25rem",
                  boxShadow: MAT_SHADOW,
                  transform: `rotate(${p.rotate})`,
                }}
              >
                <Image
                  src={p.src}
                  alt=""
                  width={112}
                  height={112}
                  style={{
                    display: "block",
                    width: "3.5rem",
                    height: "3.5rem",
                    objectFit: "cover",
                    borderRadius: "0.125rem",
                    backgroundColor: U.surface,
                  }}
                />
                {/* Check badge — "received" */}
                <span
                  className={p.badgeClass}
                  style={{
                    position: "absolute",
                    top: "-0.3rem",
                    right: "-0.3rem",
                    width: "1rem",
                    height: "1rem",
                    borderRadius: "50%",
                    background: U.success,
                    boxShadow: `0 0 0 0.09375rem ${U.canvas}`,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transformOrigin: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 10 10"
                    style={{ width: "0.55rem", height: "0.55rem" }}
                    fill="none"
                    stroke="#FCFAF5"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1.8 5.4 4 7.4 8.2 2.8" />
                  </svg>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 — "drop in, or sync automatically" */}
        <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.625rem" }}>
          <span
            style={{
              fontFamily: U.fontBody,
              fontSize: "0.8125rem",
              fontWeight: 700,
              color: U.muted,
              letterSpacing: "0.02em",
              textAlign: "center",
            }}
          >
            {m.dropOrSync}
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            {/* format chip */}
            <span
              style={{
                fontFamily: U.fontBody,
                fontSize: "0.75rem",
                fontWeight: 600,
                color: U.muted,
                background: U.surface,
                border: `1px solid ${U.hairline}`,
                borderRadius: "2rem",
                padding: "0.3rem 0.7rem",
              }}
            >
              {m.anyFormat}
            </span>
            {/* auto cloud-sync chip */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontFamily: U.fontBody,
                fontSize: "0.75rem",
                fontWeight: 700,
                color: U.accent,
                background: "rgba(154, 79, 42, 0.08)",
                border: `1px solid rgba(154, 79, 42, 0.25)`,
                borderRadius: "2rem",
                padding: "0.3rem 0.7rem",
              }}
            >
              <svg viewBox="0 0 22 16" style={{ width: "1rem", height: "0.75rem", flexShrink: 0 }} fill="none" stroke={U.accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 13.5A4.5 4.5 0 0 1 6 4.5a5.5 5.5 0 0 1 10.4 1.6A3.8 3.8 0 0 1 16 13.5z" />
                <path d="M11 11.5V6.5M8.8 8.4 11 6.2l2.2 2.2" />
              </svg>
              {m.cloudConnected}
              <span
                className="lv2u-up-glow"
                style={{ width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: U.success, flexShrink: 0 }}
              />
            </span>
          </div>
        </div>
      </div>
    </UspCardShell>
  );
}
