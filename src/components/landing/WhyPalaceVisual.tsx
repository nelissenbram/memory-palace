"use client";

/**
 * "A box goes dark. A palace stays lit." — the WHY-a-palace block visual.
 *
 * A warm palace facade at dusk. Its windows start dark and light up one by one
 * as memories are placed, until the whole house glows; three windows carry a
 * memory label. The loop rests for a long beat at "all lit" — the point of the
 * argument. Under reduced motion every window is lit from the start.
 *
 * Renders only the scene + labels + closing line. The parent renders the
 * section's eyebrow / h2 / body.
 */

import React from "react";

const C = {
  cream: "#FCFAF5",
  gold: "#D4AF37",
  glow: "#FFD98A",
  accent: "#9A4F2A",
  muted: "#B5ADA3",
  fontDisplay: "var(--font-display, Georgia, serif)",
  fontBody: "var(--font-body, sans-serif)",
  fontNote: "var(--font-note, cursive)",
} as const;

/* Window grid over the facade, in % of the scene box. `lit` order = light-up
   sequence; three windows carry a caption. */
type Win = { x: number; y: number; w: number; h: number; order: number; label?: 1 | 2 | 3 };

const WINDOWS: Win[] = [
  // left wing — lower
  { x: 12, y: 62, w: 4.5, h: 9, order: 3 },
  { x: 19, y: 62, w: 4.5, h: 9, order: 6, label: 1 },
  // left wing — upper
  { x: 12, y: 48, w: 4.5, h: 8, order: 8 },
  { x: 19, y: 48, w: 4.5, h: 8, order: 4 },
  // central block — lower (either side of the door)
  { x: 40, y: 60, w: 5, h: 11, order: 1 },
  { x: 55, y: 60, w: 5, h: 11, order: 2, label: 2 },
  // central block — upper
  { x: 40, y: 43, w: 5, h: 9, order: 7 },
  { x: 55, y: 43, w: 5, h: 9, order: 5 },
  // right wing — lower
  { x: 76.5, y: 62, w: 4.5, h: 9, order: 9, label: 3 },
  { x: 83.5, y: 62, w: 4.5, h: 9, order: 11 },
  // right wing — upper
  { x: 76.5, y: 48, w: 4.5, h: 8, order: 10 },
  { x: 83.5, y: 48, w: 4.5, h: 8, order: 12 },
];

const CYCLE = 13; // seconds
const LIT_START = 0.06; // fraction of cycle when the first window lights
const LIT_SPAN = 0.5; // windows finish lighting by this fraction; then long rest

export default function WhyPalaceVisual({ w }: { w: Record<string, string> }) {
  const labels: Record<number, string> = { 1: w.windowLabel1, 2: w.windowLabel2, 3: w.windowLabel3 };

  return (
    <figure
      role="img"
      aria-label={w.sceneAria || w.h2}
      style={{ margin: "0 auto", maxWidth: "56rem", width: "100%" }}
    >
      <style>{`
        .lv2why-scene {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 8.2;
          border-radius: 1.25rem;
          overflow: hidden;
          /* dusk sky → warm horizon */
          background:
            radial-gradient(120% 80% at 50% 118%, rgba(255,196,120,0.35) 0%, rgba(255,196,120,0) 55%),
            linear-gradient(180deg, #2A2233 0%, #3A2A2C 46%, #5A3A2E 78%, #7A4A30 100%);
          box-shadow: inset 0 0 6rem rgba(0,0,0,0.5);
        }
        .lv2why-facade { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
        .lv2why-win {
          position: absolute;
          border-radius: 0.15rem 0.15rem 0 0;
          background: #241C15;
          box-shadow: inset 0 0 0 0.09rem rgba(212,175,55,0.28);
          opacity: 1;
        }
        .lv2why-win-glow {
          position: absolute; inset: 0; border-radius: inherit;
          background: linear-gradient(180deg, #FFE6A8 0%, #F5B65A 100%);
          box-shadow: 0 0 0.9rem 0.15rem rgba(255,201,120,0.75);
          opacity: 0;
          animation: lv2whyLight ${CYCLE}s ease-in-out infinite;
        }
        .lv2why-halo {
          position: absolute; left: 50%; bottom: 4%; transform: translateX(-50%);
          width: 78%; height: 60%; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(255,201,120,0.30) 0%, rgba(255,201,120,0) 70%);
          opacity: 0; pointer-events: none;
          animation: lv2whyHalo ${CYCLE}s ease-in-out infinite;
        }
        .lv2why-label {
          position: absolute; transform: translate(-50%, 0);
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.3rem 0.6rem;
          background: rgba(252,250,245,0.94);
          border: 0.0625rem solid rgba(212,175,55,0.5);
          border-radius: 0.5rem;
          box-shadow: 0 0.5rem 1.25rem rgba(0,0,0,0.4);
          white-space: nowrap;
          opacity: 0;
          animation: lv2whyTag ${CYCLE}s ease-in-out infinite;
        }
        .lv2why-label span {
          font-family: ${C.fontNote}; font-weight: 600; font-size: clamp(0.8125rem, 1.9vw, 1.0625rem);
          color: ${C.accent}; line-height: 1;
        }
        .lv2why-label::after {
          content: ""; position: absolute; left: 1.1rem; bottom: -0.4rem;
          border-left: 0.4rem solid transparent; border-right: 0.4rem solid transparent;
          border-top: 0.45rem solid rgba(252,250,245,0.94);
        }
        .lv2why-closing {
          margin-top: 1.25rem; text-align: center;
          font-family: ${C.fontDisplay}; font-style: italic; font-weight: 500;
          font-size: clamp(1.25rem, 3vw, 1.75rem);
          color: ${C.accent};
        }
        @keyframes lv2whyLight {
          0%, ${(LIT_START * 100).toFixed(1)}% { opacity: 0; }
          ${((LIT_START + 0.04) * 100).toFixed(1)}% { opacity: 1; }
          94% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes lv2whyHalo {
          0%, 42% { opacity: 0; }
          58%, 94% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes lv2whyTag {
          0%, 46% { opacity: 0; transform: translate(-50%, 0.4rem); }
          56%, 92% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, 0.4rem); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lv2why-win-glow, .lv2why-halo, .lv2why-label {
            animation: none !important; opacity: 1 !important; transform: translate(-50%, 0) !important;
          }
          .lv2why-halo { transform: translateX(-50%) !important; }
        }
      `}</style>

      <div className="lv2why-scene">
        {/* Palace silhouette at dusk */}
        <svg className="lv2why-facade" viewBox="0 0 100 51" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          {/* ground glow already in the box; draw the warm stone facade */}
          <g fill="rgba(60,44,32,0.92)" stroke="none">
            {/* wings */}
            <rect x="8" y="40" width="22" height="34" rx="0.6" />
            <rect x="70" y="40" width="22" height="34" rx="0.6" />
            {/* central block */}
            <rect x="34" y="34" width="32" height="40" rx="0.6" />
          </g>
          {/* rooflines */}
          <g fill="none" stroke="rgba(212,175,55,0.5)" strokeWidth="0.5" strokeLinejoin="round" strokeLinecap="round">
            <path d="M7 40 L19 34 L31 40" />
            <path d="M69 40 L81 34 L93 40" />
            <path d="M33 34 L50 24 L67 34" />
          </g>
          {/* dome + finial */}
          <path d="M42 34 A8 8 0 0 1 58 34 Z" fill="rgba(74,52,38,0.95)" stroke="rgba(212,175,55,0.55)" strokeWidth="0.5" />
          <line x1="50" y1="24" x2="50" y2="20.5" stroke="rgba(212,175,55,0.7)" strokeWidth="0.5" strokeLinecap="round" />
          <circle cx="50" cy="20" r="0.7" fill={C.gold} />
          {/* portico columns */}
          <g stroke="rgba(212,175,55,0.4)" strokeWidth="0.45">
            {[44, 47, 50, 53, 56].map((x) => (
              <line key={x} x1={x} y1="52" x2={x} y2="74" />
            ))}
          </g>
          {/* doorway (stays warm) */}
          <path d="M46.5 74 V60 A3.5 3.5 0 0 1 53.5 60 V74 Z" fill="rgba(255,201,120,0.5)" />
          {/* floor line */}
          <line x1="4" y1="74" x2="96" y2="74" stroke="rgba(212,175,55,0.5)" strokeWidth="0.6" strokeLinecap="round" />
        </svg>

        {/* Windows lighting up one by one */}
        {WINDOWS.map((win, i) => {
          const delay = LIT_START * CYCLE + (win.order - 1) * ((LIT_SPAN - LIT_START) * CYCLE) / WINDOWS.length;
          return (
            <span
              key={i}
              className="lv2why-win"
              style={{ left: `${win.x}%`, top: `${win.y}%`, width: `${win.w}%`, height: `${win.h}%` }}
              aria-hidden="true"
            >
              <span className="lv2why-win-glow" style={{ animationDelay: `${delay.toFixed(2)}s` }} />
            </span>
          );
        })}

        {/* Whole-facade halo once it's all lit */}
        <span className="lv2why-halo" aria-hidden="true" />

        {/* Three memory labels near their windows */}
        {WINDOWS.filter((win) => win.label).map((win) => (
          <span
            key={`l-${win.label}`}
            className="lv2why-label"
            aria-hidden="true"
            style={{ left: `${win.x + win.w / 2}%`, top: `${win.y - 12}%` }}
          >
            <span>{labels[win.label as number]}</span>
          </span>
        ))}
      </div>

      {w.closingLine ? <figcaption className="lv2why-closing">{w.closingLine}</figcaption> : null}
    </figure>
  );
}
