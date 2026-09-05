"use client";

/**
 * TREE USP card — "The lines find their way home".
 * A fan-chart vignette of three generations: connecting lines draw themselves
 * branch by branch, saving the gold grandmother for last, then a single quiet
 * halo ripple honors her before a long, fully-drawn rest. One shared 10s loop;
 * reduced-motion users see the finished chart.
 */

import React from "react";
import UspCardShell, { U } from "./UspCardShell";

const CSS = `
.lv2u-tree-line {
  stroke-dashoffset: 0;
}
.lv2u-tree-lines {
  opacity: 1;
  animation: lv2u-tree-fade 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
.lv2u-tree-l1 { animation: lv2u-tree-draw-l1 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
.lv2u-tree-l2 { animation: lv2u-tree-draw-l2 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
.lv2u-tree-l3 { animation: lv2u-tree-draw-l3 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
.lv2u-tree-l4 { animation: lv2u-tree-draw-l4 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
.lv2u-tree-l5 { animation: lv2u-tree-draw-l5 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
.lv2u-tree-l6 { animation: lv2u-tree-draw-l6 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
.lv2u-tree-ripple {
  opacity: 0;
  animation: lv2u-tree-ripple 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
@keyframes lv2u-tree-draw-l1 {
  0% { stroke-dashoffset: 1; }
  10% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; }
}
@keyframes lv2u-tree-draw-l2 {
  0%, 3% { stroke-dashoffset: 1; }
  13% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; }
}
@keyframes lv2u-tree-draw-l4 {
  0%, 14% { stroke-dashoffset: 1; }
  26% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; }
}
@keyframes lv2u-tree-draw-l5 {
  0%, 16% { stroke-dashoffset: 1; }
  28% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; }
}
@keyframes lv2u-tree-draw-l6 {
  0%, 18% { stroke-dashoffset: 1; }
  30% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; }
}
@keyframes lv2u-tree-draw-l3 {
  0%, 28% { stroke-dashoffset: 1; }
  40% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; }
}
@keyframes lv2u-tree-ripple {
  0%, 40% { r: 7px; opacity: 0; }
  43% { opacity: 0.5; }
  52% { r: 13px; opacity: 0; }
  100% { r: 13px; opacity: 0; }
}
@keyframes lv2u-tree-fade {
  0%, 97% { opacity: 1; }
  100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .lv2u-tree-line,
  .lv2u-tree-lines,
  .lv2u-tree-l1,
  .lv2u-tree-l2,
  .lv2u-tree-l3,
  .lv2u-tree-l4,
  .lv2u-tree-l5,
  .lv2u-tree-l6,
  .lv2u-tree-ripple {
    animation: none !important;
    transition: none !important;
  }
}
`;

export default function TreeCard({
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
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: "1rem", height: "1rem" }}
        >
          <path d="M3 6.8A11 11 0 0 1 19 6.8" />
          <path d="M11 16.4C11 13.6 6 14.8 6 11.6M11 16.4C11 13.6 16 14.8 16 11.6" />
          <path d="M9.1 18.3a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0" />
          <path d="M4.1 9.7a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0M14.1 9.7a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0" />
        </svg>
      }
      name={m.treeName} role={m.treeRole}
      aiLabel={aiLabel}
      label={`${m.treeName} — ${m.treeGen}`}
    >
      <style>{CSS}</style>

      {/* ROW 1 — fan-chart vignette panel */}
      <div
        aria-hidden="true"
        style={{
          background: U.surface,
          border: `1px solid ${U.hairline}`,
          borderRadius: "0.75rem",
          padding: "1rem",
          height: "10.5rem",
          overflow: "hidden",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 240 130"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {/* 1. Static generation guide arcs (fan-chart stationery) */}
          <circle
            cx={120}
            cy={116}
            r={62}
            fill="none"
            stroke={U.hairline}
            strokeWidth={1}
            strokeDasharray="2 4"
            opacity={0.5}
          />
          <circle
            cx={120}
            cy={116}
            r={100}
            fill="none"
            stroke={U.hairline}
            strokeWidth={1}
            strokeDasharray="2 4"
            opacity={0.5}
          />

          {/* 2. Static gold halo behind the grandmother node */}
          <circle cx={36} cy={24} r={11} fill="rgba(212,175,55,0.16)" />

          {/* 3. Connecting lines — drawn branch by branch, gold line last */}
          <g className="lv2u-tree-lines">
            <path
              className="lv2u-tree-line lv2u-tree-l1"
              d="M120,100 Q90,98 66,77"
              pathLength={1}
              strokeDasharray={1}
              fill="none"
              stroke={U.accent}
              strokeWidth={1.75}
              strokeLinecap="round"
            />
            <path
              className="lv2u-tree-line lv2u-tree-l2"
              d="M120,100 Q150,98 174,77"
              pathLength={1}
              strokeDasharray={1}
              fill="none"
              stroke={U.accent}
              strokeWidth={1.75}
              strokeLinecap="round"
            />
            <path
              className="lv2u-tree-line lv2u-tree-l4"
              d="M66,59 Q86,53 96,31"
              pathLength={1}
              strokeDasharray={1}
              fill="none"
              stroke={U.accent}
              strokeWidth={1.75}
              strokeLinecap="round"
            />
            <path
              className="lv2u-tree-line lv2u-tree-l5"
              d="M174,59 Q154,53 144,31"
              pathLength={1}
              strokeDasharray={1}
              fill="none"
              stroke={U.accent}
              strokeWidth={1.75}
              strokeLinecap="round"
            />
            <path
              className="lv2u-tree-line lv2u-tree-l6"
              d="M174,59 Q194,53 204,31"
              pathLength={1}
              strokeDasharray={1}
              fill="none"
              stroke={U.accent}
              strokeWidth={1.75}
              strokeLinecap="round"
            />
            <path
              className="lv2u-tree-line lv2u-tree-l3"
              d="M66,59 Q46,53 36,31"
              pathLength={1}
              strokeDasharray={1}
              fill="none"
              stroke={U.accent}
              strokeWidth={1.75}
              strokeLinecap="round"
            />
          </g>

          {/* 4. Nodes — always visible, fully static */}
          {/* Gen 3 (grandparents) */}
          <circle cx={36} cy={24} r={7} fill={U.gold} stroke={U.accent} strokeWidth={1.5} />
          <circle cx={36} cy={24} r={2} fill={U.canvas} />
          <circle cx={96} cy={24} r={7} fill={U.canvas} stroke={U.muted} strokeWidth={1.25} />
          <circle cx={144} cy={24} r={7} fill={U.canvas} stroke={U.muted} strokeWidth={1.25} />
          <circle cx={204} cy={24} r={7} fill={U.canvas} stroke={U.muted} strokeWidth={1.25} />
          {/* Gen 2 (parents) */}
          <circle cx={66} cy={68} r={9} fill={U.canvas} stroke={U.accent} strokeWidth={1.5} />
          <circle cx={174} cy={68} r={9} fill={U.canvas} stroke={U.accent} strokeWidth={1.5} />
          {/* Gen 1 (couple) — interlocked rings */}
          <circle cx={108} cy={110} r={10} fill={U.surface} stroke={U.ink} strokeWidth={1.5} />
          <circle cx={132} cy={110} r={10} fill={U.surface} stroke={U.ink} strokeWidth={1.5} />

          {/* 5. Engraved name lines */}
          <rect x={108} y={123} width={24} height={2} rx={1} fill={U.hairline} />
          <rect x={58} y={80} width={16} height={2} rx={1} fill={U.hairline} />
          <rect x={166} y={80} width={16} height={2} rx={1} fill={U.hairline} />

          {/* 6. Halo ripple — one quiet gold hello per loop */}
          <circle
            className="lv2u-tree-ripple"
            cx={36}
            cy={24}
            r={7}
            fill="none"
            stroke={U.gold}
            strokeWidth={1.5}
          />
        </svg>
      </div>

      {/* ROW 2 — caption */}
      <div
        aria-hidden="true"
        style={{
          marginTop: "0.875rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.625rem",
        }}
      >
        <span
          style={{ width: "1.5rem", height: "1px", background: U.hairline, flexShrink: 0 }}
        />
        <span
          style={{
            fontFamily: U.fontDisplay,
            fontSize: "1.0625rem",
            fontWeight: 600,
            color: U.ink,
            letterSpacing: "0.01em",
            textAlign: "center",
          }}
        >
          {m.treeGen}
        </span>
        <span
          style={{ width: "1.5rem", height: "1px", background: U.hairline, flexShrink: 0 }}
        />
      </div>
    </UspCardShell>
  );
}
