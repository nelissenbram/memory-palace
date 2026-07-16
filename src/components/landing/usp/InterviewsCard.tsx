"use client";

/**
 * Interviews USP card — "The Kitchen Question".
 *
 * A crafted mini product window: a warm interview question resting on a
 * notebook baseline, a recorder pill whose waveform breathes like a human
 * voice, and a quiet green confirmation once the answer is filed. One shared
 * 10s CSS clock drives every animated element (compositor-only properties);
 * the long REST beat (60–94%) is the card's default face, and reduced motion
 * renders that settled state statically.
 */

import React, { useEffect, useRef, useState } from "react";
import UspCardShell, { U } from "./UspCardShell";

const SETTLE = "cubic-bezier(0.4, 0, 0.2, 1)";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const BAR_INDICES = [0, 1, 2, 3, 4, 5, 6] as const;
/** Per-bar swell amplitude (scaleY) — a voice envelope, center loudest. */
const PEAKS = [0.5, 0.68, 0.82, 0.92, 0.82, 0.68, 0.5];
/** Settled symmetric arch (scaleY) — visual 0.25/0.4/0.55/0.7 rem on 1.5rem bars. */
const ARCH = [0.17, 0.27, 0.37, 0.47, 0.37, 0.27, 0.17];
const CENTER = 3;

/**
 * One 10s keyframe track per bar. Swells are staggered ~0.1s (1%) left to
 * right with per-swell amplitude variation so ripples travel across the pill.
 * The center bar keeps full opacity and crossfades accent→gold at the payoff.
 */
function barKeyframes(i: number): string {
  const p = PEAKS[i] ?? 0.5;
  const a = ARCH[i] ?? 0.17;
  const s = i; // 1% ≈ 0.1s stagger on the 10s clock
  const gold = i === CENTER;
  const rows: string[] = [];
  const sy = (v: number) => `transform: scaleY(${v.toFixed(3)});`;
  const add = (pct: number, decl: string) => rows.push(`  ${pct}% { ${decl} }`);

  add(0, `${sy(0.17)} opacity: 1;${gold ? ` background-color: ${U.accent};` : ""}`);
  add(8, sy(0.3));
  // She answers: ~0.9–1.1s swells, ease-in-out, human amplitudes.
  const swell: Array<[number, number]> = [
    [12 + s, 0.85 * p],
    [16.5 + s, 0.3 * p],
    [21 + s, p],
    [25.5 + s, 0.42 * p],
    [30 + s, 0.9 * p],
    [34 + s, 0.32 * p],
    [38.5 + s, 0.7 * p],
  ];
  for (const [pct, v] of swell) add(pct, sy(Math.max(v, 0.14)));
  // The voice comes to rest → settled arch, dimmed except the center bar.
  add(46, `${sy(0.24)} opacity: 1; animation-timing-function: ${SETTLE};`);
  add(
    54,
    `${sy(a)} opacity: ${gold ? 1 : 0.55};${gold ? ` background-color: ${U.accent};` : ""}`
  );
  if (gold) add(60, `background-color: ${U.gold};`);
  // REST until 94%, then the ordered soft reset (gold→accent first).
  add(
    94,
    `${sy(a)} opacity: ${gold ? 1 : 0.55};${
      gold ? ` background-color: ${U.gold};` : ""
    } animation-timing-function: ${EASE};`
  );
  if (gold) add(97, `background-color: ${U.accent};`);
  add(100, `${sy(0.17)} opacity: 1;${gold ? ` background-color: ${U.accent};` : ""}`);
  return `@keyframes lv2u-int-bar${i} {\n${rows.join("\n")}\n}`;
}

const CSS = `
${BAR_INDICES.map(barKeyframes).join("\n")}
@keyframes lv2u-int-dot {
  0% { transform: scale(1); opacity: 0.7; background-color: ${U.accent}; }
  6% { transform: scale(1.25); opacity: 1; }
  12% { transform: scale(1); opacity: 0.7; }
  18% { transform: scale(1.25); opacity: 1; }
  24% { transform: scale(1); opacity: 0.7; }
  30% { transform: scale(1.25); opacity: 1; }
  36% { transform: scale(1); opacity: 0.7; }
  42% { transform: scale(1.25); opacity: 1; }
  46% { transform: scale(1); opacity: 1; background-color: ${U.accent}; }
  50% { background-color: ${U.success}; }
  94% { transform: scale(1); opacity: 1; background-color: ${U.success}; }
  100% { transform: scale(1); opacity: 0.7; background-color: ${U.accent}; }
}
@keyframes lv2u-int-chip {
  0% { opacity: 0; transform: translateY(0.25rem); }
  54% { opacity: 0; transform: translateY(0.25rem); }
  60% { opacity: 1; transform: translateY(0); }
  95% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(0); }
}
@keyframes lv2u-int-check {
  0% { stroke-dashoffset: 10; }
  56.5% { stroke-dashoffset: 10; }
  60% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 0; }
}
.lv2u-int-anim {
  animation-duration: 10s;
  animation-iteration-count: infinite;
  animation-timing-function: ease-in-out;
  animation-play-state: paused;
}
.lv2u-int-play .lv2u-int-anim { animation-play-state: running; }
${BAR_INDICES.map((i) => `.lv2u-int-b${i} { animation-name: lv2u-int-bar${i}; }`).join("\n")}
.lv2u-int-dot { animation-name: lv2u-int-dot; }
.lv2u-int-chip { animation-name: lv2u-int-chip; animation-timing-function: ${EASE}; }
.lv2u-int-check { animation-name: lv2u-int-check; animation-timing-function: ${EASE}; }
@container (max-width: 18rem) {
  .lv2u-int-q { font-size: 1.25rem; }
}
@media (prefers-reduced-motion: reduce) {
  .lv2u-int-root,
  .lv2u-int-root * {
    animation: none !important;
    transition: none !important;
  }
}
`;

export default function InterviewsCard({
  m,
  aiLabel,
}: {
  m: Record<string, string>;
  aiLabel?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(true);

  // Off-screen cards stay inert: 13 cards share the landing page.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setInView(entry.isIntersecting);
      },
      { rootMargin: "10%" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <UspCardShell
      icon={
        <svg
          viewBox="0 0 22 22"
          style={{ width: "1.375rem", height: "1.375rem" }}
          stroke="currentColor"
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 5.2C8.2 3.1 9.6 1.9 11.4 1.9c2.1 0 3.4 1.3 3.3 3.2-.1 2.4-3.7 2.6-4 5.2" />
          <path d="M10.4 12.9v.01" />
          <path d="M3.5 17.25v1M7.25 16.25v3M11 15.25v5.1M14.75 16.25v3M18.5 17.25v1" />
        </svg>
      }
      name={m.interviewName}
      aiLabel={aiLabel}
      label={m.interviewName}
    >
      <div
        ref={rootRef}
        aria-hidden="true"
        className={`lv2u-int-root${inView ? " lv2u-int-play" : ""}`}
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "12.5rem",
          containerType: "inline-size",
        }}
      >
        <style>{CSS}</style>

        {/* Row 1 — the question, resting on a notebook baseline */}
        <div style={{ minHeight: "5.8rem" }}>
          <p
            className="lv2u-int-q"
            style={{
              margin: 0,
              fontFamily: U.fontDisplay,
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: "1.375rem",
              lineHeight: 1.4,
              letterSpacing: "0.005em",
              color: U.ink,
              maxWidth: "16rem",
            }}
          >
            {m.interviewQ}
          </p>
        </div>
        <div
          style={{
            marginTop: "0.5rem",
            height: "1px",
            width: "70%",
            background: U.hairline,
          }}
        />

        {/* Row 2 — recorder pill: mic disc, status dot, breathing waveform */}
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: U.surface,
            border: `1px solid ${U.hairline}`,
            borderRadius: "0.75rem",
            padding: "0.625rem 0.875rem",
            boxShadow: "inset 0 1px 2px rgba(36, 28, 21, 0.05)",
          }}
        >
          <span
            style={{
              position: "relative",
              width: "1.75rem",
              height: "1.75rem",
              flexShrink: 0,
              borderRadius: "50%",
              background: "rgba(154, 79, 42, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              style={{ width: "1rem", height: "1rem" }}
              stroke={U.accent}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
              <path d="M6 11a6 6 0 0 0 12 0" />
              <path d="M12 17v3.5" />
            </svg>
            {/* Status dot: base styles = REST (captured, green) */}
            <span
              className="lv2u-int-anim lv2u-int-dot"
              style={{
                position: "absolute",
                top: "-0.09375rem",
                right: "-0.09375rem",
                width: "0.375rem",
                height: "0.375rem",
                borderRadius: "50%",
                background: U.success,
              }}
            />
          </span>
          <span
            style={{
              flex: 1,
              height: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.3125rem",
            }}
          >
            {/* Bars: base styles = REST (settled arch, golden heart) */}
            {BAR_INDICES.map((i) => (
              <span
                key={i}
                className={`lv2u-int-anim lv2u-int-b${i}`}
                style={{
                  width: "0.1875rem",
                  height: "1.5rem",
                  borderRadius: "999rem",
                  background: i === CENTER ? U.gold : U.accent,
                  opacity: i === CENTER ? 1 : 0.55,
                  transform: `scaleY(${ARCH[i] ?? 0.17})`,
                  transformOrigin: "center",
                }}
              />
            ))}
          </span>
        </div>

        {/* Row 3 — confirmation chip: base styles = REST (visible, check drawn) */}
        <div
          className="lv2u-int-anim lv2u-int-chip"
          style={{
            marginTop: "0.75rem",
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "flex-start",
            gap: "0.5rem",
            background: "rgba(74, 103, 65, 0.08)",
            border: "1px solid rgba(74, 103, 65, 0.22)",
            borderRadius: "0.625rem",
            padding: "0.5rem 0.75rem",
          }}
        >
          <span
            style={{
              width: "1.125rem",
              height: "1.125rem",
              flexShrink: 0,
              marginTop: "0.125rem",
              borderRadius: "50%",
              background: U.success,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 12 12" style={{ width: "0.625rem", height: "0.625rem" }} fill="none">
              <path
                className="lv2u-int-anim lv2u-int-check"
                d="M3 6.3l2.2 2.2L9.2 4.1"
                stroke={U.canvas}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={10}
              />
            </svg>
          </span>
          <span
            style={{
              fontFamily: U.fontBody,
              fontWeight: 600,
              fontSize: "0.9375rem",
              lineHeight: 1.45,
              color: U.success,
            }}
          >
            {m.interviewA}
          </span>
        </div>
      </div>
    </UspCardShell>
  );
}
