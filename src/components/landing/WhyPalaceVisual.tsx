"use client";

/**
 * "Why a palace?" — one calm human argument (round-9, why4).
 *
 * A single centered column, identical on phone, tablet and desktop. A still
 * photograph on top (the woman walking up to her wall, still looking away, on
 * the verge of touching), then all the words below on bare cream as dark ink
 * (~9:1), never over the photo: a small rust eyebrow, a gold hairline, an
 * upright display H2, then ONE flowing proposition that carries loci, then
 * everyone, then enrich in a single breath. Beneath it a quiet row of three
 * dynamic line-icons underlines those three ideas without counting them, and
 * the block closes on the kept rust-ruled italic payoff.
 *
 * The only continuous motion is each icon's single accent element; the ink
 * structure stays still, and every loop is gated behind
 * prefers-reduced-motion: no-preference.
 */

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

const C = {
  canvas: "#FCFAF5",
  parchment: "#EFE6D4",
  hairline: "#E3D6BC",
  ink: "#403B36",
  muted: "#716A5E",
  rust: "#9A4F2A",
  gold: "#D4AF37",
  fontDisplay: "var(--font-display, Georgia, serif)",
  fontBody: "var(--font-body, sans-serif)",
} as const;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function WhyPalaceVisual({ w }: { w: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setReduced(prefersReducedMotion());
    const reveal = () => setInView(true);
    if (prefersReducedMotion() || el.getBoundingClientRect().top < window.innerHeight) reveal();
    else {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { reveal(); io.disconnect(); } }, { rootMargin: "0px 0px -12% 0px" });
      io.observe(el);
      const t = window.setTimeout(reveal, 2500);
      return () => { io.disconnect(); window.clearTimeout(t); };
    }
  }, []);

  const rise = (delay: string): React.CSSProperties =>
    reduced
      ? { opacity: inView ? 1 : 0 }
      : {
          opacity: inView ? 1 : 0,
          transform: inView ? "none" : "translateY(0.75rem)",
          transition: `opacity 0.6s ease ${delay}, transform 0.6s ease ${delay}`,
        };

  const icons = [
    { key: "loci", label: w.iconLoci, glyph: <LociIcon /> },
    { key: "everyone", label: w.iconEveryone, glyph: <EveryoneIcon /> },
    { key: "enrich", label: w.iconEnrich, glyph: <EnrichIcon /> },
  ];

  return (
    <section aria-label={w.h2} style={{ background: C.canvas, padding: "clamp(4rem, 8vw, 7rem) clamp(1.25rem, 5vw, 3rem)" }}>
      <style>{WHY_ICON_CSS}</style>
      <div ref={ref} style={{ maxWidth: "58rem", margin: "0 auto" }}>
        {/* Still photo — a hung companion, never a text bed */}
        <figure role="img" aria-label={w.aria || w.h2} style={{ ...rise("0s"), margin: "0 0 clamp(2rem, 4vw, 3rem)" }}>
          <div style={{ position: "relative", aspectRatio: "16 / 9", overflow: "hidden", borderRadius: "1rem", border: `1px solid ${C.hairline}`, boxShadow: "0 1.5rem 3rem rgba(36,28,21,0.16)", background: C.parchment }}>
            <Image
              src="/video/why-approach.jpg"
              alt=""
              fill
              priority={false}
              sizes="(max-width: 62rem) 100vw, 58rem"
              style={{ objectFit: "cover", objectPosition: "50% 40%" }}
            />
          </div>
        </figure>

        {/* The words, on bare cream, left-aligned to the photo */}
        <div style={{ maxWidth: "46rem" }}>
          <p style={{ ...rise("0.08s"), fontFamily: C.fontBody, fontWeight: 600, fontSize: "0.8125rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.rust, margin: 0 }}>
            {w.eyebrow}
          </p>
          <span aria-hidden="true" style={{ ...rise("0.08s"), display: "block", width: "3rem", height: "2px", background: C.gold, opacity: 0.6, margin: "0.85rem 0 1.5rem" }} />
          <h2 style={{ ...rise("0.12s"), fontFamily: C.fontDisplay, fontWeight: 600, fontSize: "clamp(2rem, 4.5vw, 3rem)", lineHeight: 1.1, color: C.ink, margin: 0, textWrap: "balance" }}>
            {w.h2}
          </h2>

          <p style={{ ...rise("0.2s"), fontFamily: C.fontBody, fontWeight: 400, fontSize: "clamp(1.125rem, 1.6vw, 1.25rem)", lineHeight: 1.6, color: C.ink, maxWidth: "42rem", margin: "clamp(1.5rem, 3vw, 2rem) 0 0" }}>
            {w.proposition}
          </p>

          {/* Three dynamic icons — a matched set that retraces the argument */}
          <div style={{ ...rise("0.3s"), marginTop: "clamp(2rem, 4vw, 2.75rem)", paddingTop: "clamp(1.75rem, 3.5vw, 2.25rem)", borderTop: `1px solid ${C.hairline}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "clamp(1rem, 3vw, 2rem)", maxWidth: "40rem" }}>
              {icons.map((ic) => (
                <div key={ic.key} style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                  {ic.glyph}
                  <span style={{ fontFamily: C.fontBody, fontWeight: 500, fontSize: "1rem", letterSpacing: "0.02em", color: C.muted, marginTop: "0.625rem", lineHeight: 1.3, overflowWrap: "break-word", hyphens: "auto" }}>
                    {ic.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ ...rise("0.42s"), fontFamily: C.fontDisplay, fontStyle: "italic", fontWeight: 500, fontSize: "clamp(1.5rem, 2.6vw, 2rem)", lineHeight: 1.25, color: C.ink, margin: "clamp(2rem, 4vw, 2.75rem) 0 0", paddingLeft: "1.25rem", borderLeft: `3px solid ${C.rust}` }}>
            {w.payoff}
          </p>
        </div>
      </div>
    </section>
  );
}

const ICON_SIZE = "clamp(2.5rem, 6vw, 3rem)";

/* Icon 1 — LOCI: a room with a framed memory on the wall and a doorway; the
   gold memory dot gently pulses where it was set down. */
function LociIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="1" />
      <rect x="6.75" y="9" width="4.5" height="4" rx="0.4" />
      <path d="M15 19 v-7 a2 2 0 0 1 4 0 v7" />
      <circle className="mp-why-loci-dot" cx="9" cy="11" r="1" fill={C.gold} stroke="none" />
    </svg>
  );
}

/* Icon 2 — EVERYONE: a pitched-roof house with a hearth-heart inside; the whole
   glyph breathes softly while the rust heart fades in and out, a slow warm
   heartbeat saying you already carry one. */
function EveryoneIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g className="mp-why-everyone">
        <path d="M4 11 L12 4 L20 11 L20 20 L4 20 Z" />
        <path className="mp-why-everyone-heart" d="M12 17 c -1.3 -1.1 -2.7 -2.1 -2.7 -3.7 a1.35 1.35 0 0 1 2.7 -0.6 a1.35 1.35 0 0 1 2.7 0.6 c 0 1.6 -1.4 2.6 -2.7 3.7 z" fill={C.rust} stroke="none" />
      </g>
    </svg>
  );
}

/* Icon 3 — ENRICH: a framed photo that visibly speaks; the three rust waveform
   bars bounce in a staggered equalizer so the still picture keeps its voice. */
function EnrichIcon() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="10" height="11" rx="1" />
      <path d="M4.75 15 L7 11.5 L8.75 13.5 L10.25 11 L11.75 15" />
      <line className="mp-why-bar" x1="16.5" y1="9" x2="16.5" y2="17" stroke={C.rust} />
      <line className="mp-why-bar mp-why-bar-2" x1="19.25" y1="9" x2="19.25" y2="17" stroke={C.rust} />
      <line className="mp-why-bar mp-why-bar-3" x1="22" y1="9" x2="22" y2="17" stroke={C.rust} />
    </svg>
  );
}

const WHY_ICON_CSS = `
.mp-why-loci-dot, .mp-why-everyone, .mp-why-bar { transform-box: fill-box; }
.mp-why-loci-dot { transform-origin: center; }
.mp-why-everyone { transform-origin: center; }
.mp-why-bar { transform-origin: bottom; }
@media (prefers-reduced-motion: no-preference) {
  .mp-why-loci-dot { animation: mp-why-loci 3.2s ease-in-out infinite; }
  .mp-why-everyone { animation: mp-why-breathe 4s ease-in-out infinite; }
  .mp-why-everyone-heart { animation: mp-why-heart 4s ease-in-out infinite; }
  .mp-why-bar { animation: mp-why-wave 1.2s ease-in-out infinite; }
  .mp-why-bar-2 { animation-delay: 0.15s; }
  .mp-why-bar-3 { animation-delay: 0.30s; }
}
@keyframes mp-why-loci { 0%, 100% { transform: scale(1); opacity: 0.55; } 50% { transform: scale(1.15); opacity: 1; } }
@keyframes mp-why-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes mp-why-heart { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
@keyframes mp-why-wave { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
`;
