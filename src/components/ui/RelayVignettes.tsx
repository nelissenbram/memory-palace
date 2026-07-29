"use client";

/**
 * RelayVignettes — miniature scene illustrations for the relay tiles, in the
 * landing-page USP visual language (MapCard/TimelineCard et al.): parchment
 * grid, faint contour lines, engraved line-art subjects, zone-ink strokes
 * with one gilt detail. Pure static SVG — the back-card's slide IS the
 * motion; the scene itself stays settled (and costs nothing on mobile).
 *
 * Each vignette draws in a wide 200×56 strip, sliced to fill the card.
 */

import React from "react";
import { CREAM, HAIRLINE } from "@/lib/libraryTokens";

export type VignettePalette = { ink: string; soft: string; gold: string };
type Vig = React.FC<{ c: VignettePalette }>;

const HAIR = HAIRLINE;

function Scene({ c, children }: { c: VignettePalette; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 200 56" preserveAspectRatio="xMidYMid slice" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden="true">
      {/* parchment survey grid + one contour line — the USP ground */}
      <path d="M0 14h200M0 28h200M0 42h200" stroke={HAIR} strokeWidth="0.5" opacity="0.5" />
      <path d="M40 0v56M100 0v56M160 0v56" stroke={HAIR} strokeWidth="0.5" opacity="0.35" />
      <path d="M-5 48 C 40 38, 80 52, 130 44 S 190 34, 205 40" fill="none" stroke={HAIR} strokeWidth="0.8" opacity="0.6" />
      {children}
    </svg>
  );
}

/* small shared pieces */
const pin = (x: number, y: number, c: VignettePalette, r = 4) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="none" stroke={c.ink} strokeWidth="1.2" />
    <circle cx={x} cy={y} r={r * 0.42} fill={c.ink} opacity="0.7" />
    <path d={`M${x - 1.6} ${y + r} L${x} ${y + r + 3.5} L${x + 1.6} ${y + r}`} fill={c.ink} />
  </g>
);
const star = (x: number, y: number, gold: string, s = 3) => (
  <path d={`M${x} ${y - s}l${s * 0.35} ${s * 0.65}L${x + s} ${y}l-${s * 0.65} ${s * 0.35}L${x} ${y + s}l-${s * 0.35}-${s * 0.65}L${x - s} ${y}l${s * 0.65}-${s * 0.35}z`} fill={gold} opacity="0.85" />
);
const frame = (x: number, y: number, w: number, h: number, c: VignettePalette, tilt = 0) => (
  <g transform={`rotate(${tilt}, ${x + w / 2}, ${y + h / 2})`}>
    <rect x={x} y={y} width={w} height={h} rx="1" fill={CREAM} stroke={c.ink} strokeWidth="1" />
    <rect x={x + 2} y={y + 2} width={w - 4} height={h - 7} rx="0.5" fill={c.soft} />
    <circle cx={x + w * 0.35} cy={y + h * 0.4} r={1.4} fill={c.ink} opacity="0.5" />
    <path d={`M${x + 2} ${y + h - 6} l${(w - 4) * 0.4} -3 l${(w - 4) * 0.25} 2 l${(w - 4) * 0.35} -2`} fill="none" stroke={c.ink} strokeWidth="0.7" opacity="0.5" />
  </g>
);

export const RelayVignettes: Record<string, Vig> = {
  /* ── CAPTURE ── */
  photos: ({ c }) => (
    <Scene c={c}>
      {frame(120, 10, 26, 32, c, -5)}
      {frame(146, 12, 26, 32, c, 4)}
      {frame(132, 8, 26, 32, c, 0)}
      {star(178, 14, c.gold)}
      <path d="M112 46h64" stroke={c.ink} strokeWidth="0.8" opacity="0.35" />
    </Scene>
  ),
  cloud: ({ c }) => (
    <Scene c={c}>
      <path d="M128 26a9 9 0 0 1 17-3.5A7 7 0 0 1 158 26a6 6 0 0 1-2 11h-24a7 7 0 0 1-4-11z" fill={CREAM} stroke={c.ink} strokeWidth="1.1" />
      <path d="M143 46V32M138 37l5-5 5 5" fill="none" stroke={c.ink} strokeWidth="1.2" />
      {star(166, 16, c.gold)}
      <circle cx="120" cy="14" r="2" fill="none" stroke={c.ink} strokeWidth="0.7" opacity="0.4" />
    </Scene>
  ),
  restore: ({ c }) => (
    <Scene c={c}>
      {/* torn photo healed: left half faded, right half fresh, stitched by gold */}
      <g transform="rotate(-3,146,27)">
        <rect x="122" y="11" width="24" height="32" rx="1" fill={CREAM} stroke={c.ink} strokeWidth="1" opacity="0.55" />
        <rect x="146" y="11" width="24" height="32" rx="1" fill={CREAM} stroke={c.ink} strokeWidth="1" />
        <rect x="148" y="13" width="20" height="22" fill={c.soft} />
        <path d="M146 12v30" stroke={c.gold} strokeWidth="1.2" strokeDasharray="2.4 2" />
      </g>
      {star(178, 12, c.gold)}
    </Scene>
  ),
  write: ({ c }) => (
    <Scene c={c}>
      <rect x="120" y="10" width="42" height="34" rx="1.5" fill={CREAM} stroke={c.ink} strokeWidth="1" transform="rotate(-2,141,27)" />
      <path d="M126 20h30M126 26h30M126 32h18" stroke={c.ink} strokeWidth="0.9" opacity="0.55" transform="rotate(-2,141,27)" />
      <path d="M158 40 L172 22 L176 25 L162 43 L156 44z" fill={CREAM} stroke={c.ink} strokeWidth="1" />
      <path d="M172 22l4 3" stroke={c.gold} strokeWidth="1.4" />
    </Scene>
  ),
  record: ({ c }) => (
    <Scene c={c}>
      <rect x="128" y="10" width="10" height="18" rx="5" fill={CREAM} stroke={c.ink} strokeWidth="1.2" />
      <path d="M123 22a10 10 0 0 0 20 0M133 32v6M128 38h10" fill="none" stroke={c.ink} strokeWidth="1.1" />
      {[150, 155, 160, 165, 170, 175].map((x, i) => (
        <path key={x} d={`M${x} ${28 - [4, 9, 6, 12, 7, 4][i]}v${[8, 18, 12, 24, 14, 8][i]}`} stroke={i === 3 ? c.gold : c.ink} strokeWidth="1.6" strokeLinecap="round" opacity={i === 3 ? 0.9 : 0.55} />
      ))}
    </Scene>
  ),
  whatsapp: ({ c }) => (
    <Scene c={c}>
      <rect x="118" y="12" width="34" height="22" rx="6" fill={CREAM} stroke={c.ink} strokeWidth="1.1" />
      <path d="M124 34l-2 7 8-5" fill={CREAM} stroke={c.ink} strokeWidth="1.1" />
      <rect x="124" y="17" width="12" height="12" rx="1" fill={c.soft} stroke={c.ink} strokeWidth="0.7" />
      <path d="M140 20h8M140 25h6" stroke={c.ink} strokeWidth="1" opacity="0.5" />
      <rect x="156" y="24" width="26" height="16" rx="5" fill={c.soft} stroke={c.ink} strokeWidth="0.9" opacity="0.9" />
      <path d="M162 30h14M162 34h9" stroke={c.ink} strokeWidth="0.9" opacity="0.55" />
      {star(160, 14, c.gold)}
    </Scene>
  ),
  capsule: ({ c }) => (
    <Scene c={c}>
      <rect x="128" y="16" width="34" height="24" rx="12" fill={CREAM} stroke={c.ink} strokeWidth="1.2" />
      <path d="M145 16v24" stroke={c.ink} strokeWidth="0.9" opacity="0.5" />
      <circle cx="145" cy="28" r="4.2" fill="none" stroke={c.gold} strokeWidth="1.2" />
      <path d="M145 25.5V28l1.8 1.2" stroke={c.gold} strokeWidth="1" fill="none" />
      <path d="M120 44h50" stroke={c.ink} strokeWidth="0.8" opacity="0.35" />
      {star(172, 14, c.gold)}
    </Scene>
  ),

  /* ── BRING TO LIFE ── */
  map: ({ c }) => (
    <Scene c={c}>
      {/* the landing MapCard, miniaturised: dashed route between three pins + compass */}
      <path d="M120 42 Q136 24 152 28 Q170 32 180 18" fill="none" stroke={c.ink} strokeWidth="1.1" strokeDasharray="2.2 2.8" strokeLinecap="round" opacity="0.75" />
      {pin(120, 40, c, 4.5)}
      {pin(152, 26, c, 4.5)}
      {pin(180, 16, c, 4.5)}
      <path d="M191 40l1.7 4.6 4.6 1.4-4.6 1.4-1.7 4.6-1.7-4.6-4.6-1.4 4.6-1.4z" fill={c.gold} opacity="0.9" transform="translate(-4,-8)" />
    </Scene>
  ),
  timeline: ({ c }) => (
    <Scene c={c}>
      <path d="M114 32h72" stroke={c.ink} strokeWidth="1.2" />
      {[124, 144, 164, 180].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={32} r={i === 2 ? 3.4 : 2.4} fill={i === 2 ? c.gold : CREAM} stroke={c.ink} strokeWidth="1" />
          <path d={`M${x} ${i % 2 ? 35 : 29} v${i % 2 ? 7 : -7}`} stroke={c.ink} strokeWidth="0.8" opacity="0.55" />
          <rect x={x - 5} y={i % 2 ? 43 : 11} width="10" height="7" rx="1" fill={c.soft} stroke={c.ink} strokeWidth="0.6" opacity="0.9" />
        </g>
      ))}
    </Scene>
  ),
  insights: ({ c }) => (
    <Scene c={c}>
      {/* constellation of moments: dots joined by hairlines, one gilt */}
      {[[122, 38], [136, 22], [152, 30], [166, 14], [180, 26]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 3 ? 3 : 2.2} fill={i === 3 ? c.gold : c.ink} opacity={i === 3 ? 0.95 : 0.7} />
      ))}
      <path d="M122 38 L136 22 L152 30 L166 14 L180 26" fill="none" stroke={c.ink} strokeWidth="0.8" opacity="0.45" />
      <path d="M114 46h74" stroke={c.ink} strokeWidth="0.8" opacity="0.3" />
    </Scene>
  ),
  family: ({ c }) => (
    <Scene c={c}>
      <path d="M150 14v8M150 22h-20v6M150 22h20v6" fill="none" stroke={c.ink} strokeWidth="1" opacity="0.8" />
      <circle cx="150" cy="10" r="5" fill={CREAM} stroke={c.gold} strokeWidth="1.2" />
      <circle cx="130" cy="34" r="5" fill={CREAM} stroke={c.ink} strokeWidth="1.1" />
      <circle cx="170" cy="34" r="5" fill={CREAM} stroke={c.ink} strokeWidth="1.1" />
      <circle cx="150" cy="9" r="1.8" fill={c.ink} opacity="0.5" />
      <circle cx="130" cy="33" r="1.8" fill={c.ink} opacity="0.5" />
      <circle cx="170" cy="33" r="1.8" fill={c.ink} opacity="0.5" />
      <path d="M130 39v5M170 39v5" stroke={c.ink} strokeWidth="0.8" opacity="0.4" />
    </Scene>
  ),
  gallery: ({ c }) => (
    <Scene c={c}>
      <path d="M112 8h80" stroke={c.ink} strokeWidth="1" opacity="0.5" />
      {frame(118, 14, 18, 24, c)}
      {frame(142, 12, 24, 30, c)}
      {frame(172, 16, 16, 20, c)}
      <path d="M130 8l-3 6M154 8l-2 4M180 8l-2 8" stroke={c.ink} strokeWidth="0.6" opacity="0.4" />
      {star(168, 47, c.gold)}
    </Scene>
  ),
  organize: ({ c }) => (
    <Scene c={c}>
      {/* villa floor plan, one room glowing gold */}
      <rect x="122" y="12" width="56" height="32" rx="1" fill={CREAM} stroke={c.ink} strokeWidth="1.1" />
      <path d="M146 12v32M146 28h32M162 28v16" stroke={c.ink} strokeWidth="0.9" opacity="0.7" />
      <rect x="148" y="14" width="28" height="12" fill={c.gold} opacity="0.28" />
      <path d="M134 44v-6M146 20h-6" stroke={c.ink} strokeWidth="0.8" opacity="0.5" />
      <circle cx="133" cy="27" r="2" fill={c.ink} opacity="0.4" />
    </Scene>
  ),
  explore: ({ c }) => (
    <Scene c={c}>
      {/* a row of distant palaces to visit */}
      <path d="M118 42h70" stroke={c.ink} strokeWidth="0.9" opacity="0.5" />
      <path d="M124 42V30l8-6 8 6v12M128 42v-7h8v7" fill="none" stroke={c.ink} strokeWidth="1" />
      <path d="M150 42V28l9-7 9 7v14M154 42v-8h4v8M162 42v-8h4v8" fill="none" stroke={c.ink} strokeWidth="1.1" />
      <path d="M178 42V32l6-5 6 5v10" fill="none" stroke={c.ink} strokeWidth="0.9" opacity="0.7" />
      {star(159, 16, c.gold, 3.4)}
    </Scene>
  ),
  lifestory: ({ c }) => (
    <Scene c={c}>
      <path d="M130 40c0-2 2-3 8-3h20V13h-20c-6 0-8 2-8 3z" fill={CREAM} stroke={c.ink} strokeWidth="1.1" />
      <path d="M186 40c0-2-2-3-8-3h-20V13h20c6 0 8 2 8 3z" fill={CREAM} stroke={c.ink} strokeWidth="1.1" />
      <path d="M136 20h16M136 25h16M136 30h10M164 20h16M164 25h16" stroke={c.ink} strokeWidth="0.8" opacity="0.5" />
      <path d="M158 13v24" stroke={c.gold} strokeWidth="1.2" />
      <path d="M158 8l2 4h-4z" fill={c.gold} />
    </Scene>
  ),

  /* ── SHARE & PASS ON ── */
  familyGroup: ({ c }) => (
    <Scene c={c}>
      <circle cx="134" cy="20" r="5.5" fill={CREAM} stroke={c.ink} strokeWidth="1.1" />
      <circle cx="152" cy="17" r="4.5" fill={CREAM} stroke={c.ink} strokeWidth="1" />
      <circle cx="168" cy="21" r="5" fill={CREAM} stroke={c.gold} strokeWidth="1.2" />
      <path d="M124 44c0-8 5-12 10-12s10 4 10 12M144 44c0-7 4-10 8-10s8 3 8 10M158 44c0-7 5-11 10-11s10 4 10 11" fill="none" stroke={c.ink} strokeWidth="1" opacity="0.75" />
    </Scene>
  ),
  cocreate: ({ c }) => (
    <Scene c={c}>
      {frame(138, 10, 28, 34, c)}
      <path d="M120 38l14-10M118 40l4-3" stroke={c.ink} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M184 36l-14-8M186 38l-4-2.5" stroke={c.gold} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="119" cy="39" r="1.6" fill={c.ink} />
      <circle cx="185" cy="37" r="1.6" fill={c.gold} />
    </Scene>
  ),
  invite: ({ c }) => (
    <Scene c={c}>
      <rect x="126" y="14" width="40" height="28" rx="1.5" fill={CREAM} stroke={c.ink} strokeWidth="1.1" transform="rotate(-2,146,28)" />
      <path d="M128 17l18 13 18-13" fill="none" stroke={c.ink} strokeWidth="1" transform="rotate(-2,146,28)" />
      <circle cx="146" cy="32" r="4.2" fill={c.gold} opacity="0.9" />
      <path d="M172 20c4-2 8-2 11 1" fill="none" stroke={c.ink} strokeWidth="0.8" opacity="0.5" />
      {star(180, 14, c.gold)}
    </Scene>
  ),
  publish: ({ c }) => (
    <Scene c={c}>
      <path d="M134 42V26l12-9 12 9v16M140 42v-9h12v9" fill="none" stroke={c.ink} strokeWidth="1.2" />
      <path d="M126 42h44" stroke={c.ink} strokeWidth="1" opacity="0.6" />
      <circle cx="146" cy="27" r="14" fill="none" stroke={c.gold} strokeWidth="0.9" strokeDasharray="2.4 3" opacity="0.9" />
      <path d="M172 18c3 1 5 3 6 6M178 12c2 1 4 2 5 4" fill="none" stroke={c.ink} strokeWidth="0.8" opacity="0.5" strokeLinecap="round" />
    </Scene>
  ),
  shared: ({ c }) => (
    <Scene c={c}>
      {frame(130, 12, 26, 32, c, -3)}
      <path d="M143 12c0-4 3-6 6-4s1 6-2 6" fill="none" stroke={c.gold} strokeWidth="1.2" />
      <path d="M143 12c0-4-3-6-6-4s-1 6 2 6" fill="none" stroke={c.gold} strokeWidth="1.2" />
      <path d="M164 24h14M164 30h10M164 36h12" stroke={c.ink} strokeWidth="0.9" opacity="0.5" />
      <circle cx="160" cy="24" r="1" fill={c.ink} opacity="0.6" />
      <circle cx="160" cy="30" r="1" fill={c.ink} opacity="0.6" />
      <circle cx="160" cy="36" r="1" fill={c.ink} opacity="0.6" />
    </Scene>
  ),
  legacy: ({ c }) => (
    <Scene c={c}>
      <path d="M146 10l14 5v10c0 8-5.5 14-14 17-8.5-3-14-9-14-17V15z" fill={CREAM} stroke={c.ink} strokeWidth="1.1" />
      <circle cx="146" cy="24" r="4" fill="none" stroke={c.gold} strokeWidth="1.2" />
      <path d="M146 28v6M144 32h4" stroke={c.gold} strokeWidth="1.1" />
      <path d="M170 38c4-1 8-1 12 1" fill="none" stroke={c.ink} strokeWidth="0.8" opacity="0.45" />
      {star(176, 18, c.gold)}
    </Scene>
  ),

  /* anchors' companions — used if ever rendered in a lane */
  palace: ({ c }) => (
    <Scene c={c}>
      <path d="M130 42V24l16-10 16 10v18M136 42v-8h8v8M152 42v-8h8v8" fill="none" stroke={c.ink} strokeWidth="1.1" />
      <path d="M122 42h48" stroke={c.ink} strokeWidth="0.9" opacity="0.6" />
      {star(146, 12, c.gold)}
    </Scene>
  ),
  library: ({ c }) => (
    <Scene c={c}>
      <rect x="128" y="12" width="10" height="30" rx="1" fill={CREAM} stroke={c.ink} strokeWidth="1" />
      <rect x="141" y="12" width="10" height="30" rx="1" fill={c.soft} stroke={c.ink} strokeWidth="1" />
      <rect x="154" y="12" width="10" height="30" rx="1" fill={CREAM} stroke={c.ink} strokeWidth="1" />
      <path d="M168 13l6 1-4 28-6-1z" fill={CREAM} stroke={c.gold} strokeWidth="1" />
    </Scene>
  ),
};

export default RelayVignettes;
