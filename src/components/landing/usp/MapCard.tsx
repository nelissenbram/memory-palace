"use client";

import React from "react";
import Image from "next/image";
import UspCardShell, { U } from "./UspCardShell";

/**
 * Memory Map USP card — "where life happened".
 * A parchment survey map on which three photo pins land one by one,
 * a dashed rust route inks itself between them, and the localized
 * count line arrives as the payoff. One 10s CSS master loop; the
 * default (non-animated) CSS is the complete, settled scene.
 */

const PINS = [
  { key: "A", left: "20%", top: "62%", src: "/landing/demo-morning.jpg" },
  { key: "B", left: "48%", top: "38%", src: "/landing/demo-graduation.jpg" },
  { key: "C", left: "78%", top: "66%", src: "/landing/demo-hands.jpg" },
] as const;

const css = `
.lv2u-map-scene { opacity: 1; }
.lv2u-map-dropA, .lv2u-map-dropB, .lv2u-map-dropC { opacity: 1; transform: translateY(0) scale(1); }
.lv2u-map-shdA, .lv2u-map-shdB, .lv2u-map-shdC { opacity: 1; }
.lv2u-map-ringA, .lv2u-map-ringB, .lv2u-map-ringC { opacity: 0; transform: scale(3); }
.lv2u-map-routemask { stroke-dashoffset: 0; }
.lv2u-map-status { opacity: 1; transform: translateY(0); }

@media (prefers-reduced-motion: no-preference) {
  .lv2u-map-scene { animation: lv2u-map-scene 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
  .lv2u-map-dropA { animation: lv2u-map-dropA 10s cubic-bezier(0.34, 1.3, 0.5, 1) infinite; }
  .lv2u-map-dropB { animation: lv2u-map-dropB 10s cubic-bezier(0.34, 1.3, 0.5, 1) infinite; }
  .lv2u-map-dropC { animation: lv2u-map-dropC 10s cubic-bezier(0.34, 1.3, 0.5, 1) infinite; }
  .lv2u-map-shdA { animation: lv2u-map-shdA 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
  .lv2u-map-shdB { animation: lv2u-map-shdB 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
  .lv2u-map-shdC { animation: lv2u-map-shdC 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
  .lv2u-map-ringA { animation: lv2u-map-ringA 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
  .lv2u-map-ringB { animation: lv2u-map-ringB 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
  .lv2u-map-ringC { animation: lv2u-map-ringC 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
  .lv2u-map-routemask { animation: lv2u-map-route 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
  .lv2u-map-status { animation: lv2u-map-status 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }

  @keyframes lv2u-map-scene {
    0%, 95% { opacity: 1; }
    100% { opacity: 0; }
  }
  @keyframes lv2u-map-dropA {
    0%, 6% { opacity: 0; transform: translateY(-0.9rem) scale(0.7); }
    9% { opacity: 1; transform: translateY(0.08rem) scale(1.05); }
    12%, 100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes lv2u-map-dropB {
    0%, 18% { opacity: 0; transform: translateY(-0.9rem) scale(0.7); }
    21% { opacity: 1; transform: translateY(0.08rem) scale(1.05); }
    24%, 100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes lv2u-map-dropC {
    0%, 30% { opacity: 0; transform: translateY(-0.9rem) scale(0.7); }
    33% { opacity: 1; transform: translateY(0.08rem) scale(1.05); }
    36%, 100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes lv2u-map-shdA {
    0%, 10% { opacity: 0; }
    12%, 100% { opacity: 1; }
  }
  @keyframes lv2u-map-shdB {
    0%, 22% { opacity: 0; }
    24%, 100% { opacity: 1; }
  }
  @keyframes lv2u-map-shdC {
    0%, 34% { opacity: 0; }
    36%, 100% { opacity: 1; }
  }
  @keyframes lv2u-map-ringA {
    0%, 6% { opacity: 0; transform: scale(1); }
    7% { opacity: 0.5; }
    12%, 100% { opacity: 0; transform: scale(3); }
  }
  @keyframes lv2u-map-ringB {
    0%, 18% { opacity: 0; transform: scale(1); }
    19% { opacity: 0.5; }
    24%, 100% { opacity: 0; transform: scale(3); }
  }
  @keyframes lv2u-map-ringC {
    0%, 30% { opacity: 0; transform: scale(1); }
    31% { opacity: 0.5; }
    36%, 100% { opacity: 0; transform: scale(3); }
  }
  @keyframes lv2u-map-route {
    0%, 42% { stroke-dashoffset: 100; }
    56%, 100% { stroke-dashoffset: 0; }
  }
  @keyframes lv2u-map-status {
    0%, 56% { opacity: 0; transform: translateY(0.25rem); }
    62%, 95% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(0.25rem); }
  }
}

@media (prefers-reduced-motion: reduce) {
  [class*="lv2u-map-"] {
    animation: none !important;
    transition: none !important;
  }
}
`;

export default function MapCard({
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
          <path d="M2 9.2 8 7.2 14 9.2 20 7.2V17l-6 2-6-2-6 2V9.2ZM8 7.2V17M14 9.2V19" />
          <path d="M4.3 13.6c1.2-1.1 2.1.6 3.3-.5" />
          <path d="M16.5 1.8a2.9 2.9 0 0 1 2.9 2.9c0 2.2-2.9 5.1-2.9 5.1s-2.9-2.9-2.9-5.1a2.9 2.9 0 0 1 2.9-2.9Z" />
          <path d="M16.5 4.7h.01" />
        </svg>
      }
      name={m.mapName} role={m.mapRole}
      aiLabel={aiLabel}
      label={m.mapName}
    >
      <style>{css}</style>

      {/* ROW 1 — Map viewport */}
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          width: "100%",
          height: "10.5rem",
          overflow: "hidden",
          border: `1px solid ${U.hairline}`,
          borderRadius: "0.75rem",
          background: U.surface,
          boxShadow: "inset 0 0 1.5rem rgba(36, 28, 21, 0.05)",
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(227, 214, 188, 0.5) 0, rgba(227, 214, 188, 0.5) 1px, transparent 1px, transparent 1.5rem)," +
            "repeating-linear-gradient(90deg, rgba(227, 214, 188, 0.5) 0, rgba(227, 214, 188, 0.5) 1px, transparent 1px, transparent 1.5rem)",
        }}
      >
        {/* Contour lines */}
        <svg
          viewBox="0 0 320 168"
          preserveAspectRatio="xMidYMid slice"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <path
            d="M-10 118 C 50 92, 92 138, 150 116 S 258 74, 330 96"
            fill="none"
            stroke={U.hairline}
            strokeWidth={1}
            opacity={0.55}
          />
          <path
            d="M-10 40 C 56 62, 118 22, 182 44 S 276 80, 330 52"
            fill="none"
            stroke={U.hairline}
            strokeWidth={1}
            opacity={0.55}
          />
        </svg>

        {/* Warm vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 40%, transparent 55%, rgba(36, 28, 21, 0.05) 100%)",
          }}
        />

        {/* Compass rose */}
        <svg
          viewBox="0 0 14 14"
          style={{
            position: "absolute",
            top: "0.625rem",
            right: "0.625rem",
            width: "0.875rem",
            height: "0.875rem",
            opacity: 0.5,
          }}
        >
          <path d="M7 0l1.6 5.4L14 7 8.6 8.6 7 14 5.4 8.6 0 7l5.4-1.6z" fill={U.gold} />
        </svg>

        {/* Scale bar */}
        <div
          style={{
            position: "absolute",
            bottom: "0.75rem",
            left: "0.75rem",
            width: "2.5rem",
            height: "0.25rem",
            borderBottom: `1px solid ${U.muted}`,
            borderLeft: `1px solid ${U.muted}`,
            borderRight: `1px solid ${U.muted}`,
            opacity: 0.4,
          }}
        />

        {/* Zoom pill */}
        <div
          style={{
            position: "absolute",
            bottom: "0.625rem",
            right: "0.625rem",
            width: "1.5rem",
            background: U.canvas,
            border: `1px solid ${U.hairline}`,
            borderRadius: "0.5rem",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span
            style={{
              height: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderBottom: `1px solid ${U.hairline}`,
            }}
          >
            <svg
              viewBox="0 0 12 12"
              style={{ width: "0.75rem", height: "0.75rem" }}
              fill="none"
              stroke={U.muted}
              strokeWidth={1.5}
              strokeLinecap="round"
            >
              <path d="M6 2v8M2 6h8" />
            </svg>
          </span>
          <span
            style={{
              height: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 12 12"
              style={{ width: "0.75rem", height: "0.75rem" }}
              fill="none"
              stroke={U.muted}
              strokeWidth={1.5}
              strokeLinecap="round"
            >
              <path d="M2 6h8" />
            </svg>
          </span>
        </div>

        {/* Scene: route + pins (fades out together at loop reset) */}
        <div className="lv2u-map-scene" style={{ position: "absolute", inset: 0 }}>
          {/* Route — stretched SVG so route coordinates track the pins' % anchors */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          >
            <mask id="lv2u-map-routeReveal" maskContentUnits="userSpaceOnUse">
              <path
                className="lv2u-map-routemask"
                d="M20 62 Q30 46 48 38 Q68 40 78 66"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={6}
                pathLength={100}
                strokeDasharray="100 100"
                vectorEffect="non-scaling-stroke"
              />
            </mask>
            <g mask="url(#lv2u-map-routeReveal)">
              <path
                d="M20 62 Q30 46 48 38 Q68 40 78 66"
                fill="none"
                stroke={U.accent}
                strokeWidth={1.5}
                strokeLinecap="round"
                opacity={0.45}
                pathLength={100}
                strokeDasharray="1.4 2.2"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </svg>

          {/* Photo pins */}
          {PINS.map((p) => (
            <div
              key={p.key}
              style={{
                position: "absolute",
                left: p.left,
                top: p.top,
                width: "2.5rem",
                transform: "translate(-50%, -100%)",
              }}
            >
              {/* Ground shadow */}
              <div
                className={`lv2u-map-shd${p.key}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: "-0.125rem",
                  width: "1rem",
                  height: "0.25rem",
                  marginLeft: "-0.5rem",
                  borderRadius: "50%",
                  background: "rgba(36, 28, 21, 0.12)",
                  filter: "blur(1px)",
                }}
              />
              {/* Ink-soak ring */}
              <div
                className={`lv2u-map-ring${p.key}`}
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: "-0.25rem",
                  width: "0.5rem",
                  height: "0.5rem",
                  marginLeft: "-0.25rem",
                  border: `1px solid ${U.accent}`,
                  borderRadius: "50%",
                }}
              />
              {/* Dropping pin: head + tail */}
              <div
                className={`lv2u-map-drop${p.key}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  transformOrigin: "50% 100%",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: `2px solid ${U.canvas}`,
                    boxShadow: "0 0.125rem 0.375rem rgba(36, 28, 21, 0.2)",
                    background: U.surface,
                  }}
                >
                  <Image
                    src={p.src}
                    alt=""
                    width={96}
                    height={96}
                    quality={60}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                </div>
                <div
                  style={{
                    width: "0.5rem",
                    height: "0.4rem",
                    marginTop: "-0.125rem",
                    background: U.accent,
                    clipPath: "polygon(50% 100%, 0 0, 100% 0)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ROW 2 — Status line */}
      <div
        className="lv2u-map-status"
        style={{
          marginTop: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          minWidth: 0,
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          style={{ width: "0.75rem", height: "0.75rem", flexShrink: 0 }}
        >
          <path
            d="M6 1a3.5 3.5 0 0 1 3.5 3.5C9.5 7 6 11 6 11S2.5 7 2.5 4.5A3.5 3.5 0 0 1 6 1Z"
            fill={U.accent}
          />
          <circle cx="6" cy="4.5" r="1.1" fill={U.canvas} />
        </svg>
        <span
          style={{
            fontFamily: U.fontBody,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: U.muted,
            letterSpacing: "0.01em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {m.mapCount}
        </span>
      </div>
    </UspCardShell>
  );
}
