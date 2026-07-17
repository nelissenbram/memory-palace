"use client";

/**
 * "Why a palace?" — The Museum Wall Label (round-8 army decision).
 *
 * Every reading word lives on the clean cream page as dark ink (~9:1), never
 * over the photograph. Left column: rust eyebrow, gold hairline, an upright ink
 * H2, then three numbered rows carrying the whole argument at once (the method
 * of loci, everyone already has a palace, then enrich), closing on a rust-ruled
 * italic payoff. Right column: the golden render hung once in a parchment mat,
 * with no text on it. One gentle one-time fade-and-rise on entry; no scroll pin,
 * no beat-swap. Fixes four prior failures by construction.
 */

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

const C = {
  canvas: "#FCFAF5",
  parchment: "#EFE6D4",
  hairline: "#E3D6BC",
  ink: "#403B36",
  rust: "#9A4F2A",
  gold: "#D4AF37",
  fontDisplay: "var(--font-display, Georgia, serif)",
  fontBody: "var(--font-body, sans-serif)",
  fontNote: "var(--font-note, cursive)",
} as const;

export default function WhyPalaceVisual({ w }: { w: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setInView(true); return; }
    if (el.getBoundingClientRect().top < window.innerHeight) { setInView(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    const failSafe = window.setTimeout(() => setInView(true), 2500);
    return () => { io.disconnect(); window.clearTimeout(failSafe); };
  }, []);

  const rows = [
    { n: "1", lead: w.b1lead, sub: w.b1sub },
    { n: "2", lead: w.b2lead, sub: w.b2sub },
    { n: "3", lead: w.b3lead, sub: w.b3sub },
  ];

  const rise = (delay: string): React.CSSProperties => ({
    opacity: inView ? 1 : 0,
    transform: inView ? "none" : "translateY(0.75rem)",
    transition: `opacity 0.6s ease ${delay}, transform 0.6s ease ${delay}`,
  });

  return (
    <section aria-label={w.h2} style={{ background: C.canvas, padding: "clamp(4rem, 8vw, 7rem) clamp(1.25rem, 5vw, 3rem)" }}>
      <style>{`
        .lv2why-grid { max-width: 72rem; margin: 0 auto; display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          grid-template-areas: "head fig" "rows fig";
          column-gap: clamp(2.5rem, 5vw, 4.5rem); align-items: start; }
        .lv2why-head { grid-area: head; max-width: 34rem; }
        .lv2why-rows { grid-area: rows; max-width: 34rem; margin-top: clamp(2rem, 4vw, 2.75rem); }
        .lv2why-figcol { grid-area: fig; align-self: center; }
        @media (max-width: 48rem) {
          .lv2why-grid { grid-template-columns: 1fr; grid-template-areas: "head" "fig" "rows"; row-gap: 2rem; }
          .lv2why-head, .lv2why-rows { max-width: 100%; }
          .lv2why-rows { margin-top: 0; }
        }
      `}</style>

      <div className="lv2why-grid" ref={ref}>
        {/* HEAD — eyebrow, hairline, H2 */}
        <div className="lv2why-head">
          <p style={{ ...rise("0.05s"), fontFamily: C.fontNote, fontWeight: 600, fontSize: "1.25rem", letterSpacing: "0.02em", color: C.rust, margin: 0 }}>
            {w.eyebrow}
          </p>
          <span aria-hidden="true" style={{ ...rise("0.05s"), display: "block", width: "3rem", height: "2px", background: C.gold, opacity: 0.6, margin: "0.75rem 0 1.75rem" }} />
          <h2 style={{ ...rise("0.1s"), fontFamily: C.fontDisplay, fontWeight: 600, fontSize: "clamp(2rem, 4.5vw, 3.25rem)", lineHeight: 1.08, color: C.ink, margin: 0, textWrap: "balance" }}>
            {w.h2}
          </h2>
        </div>

        {/* ROWS — the three numbered ideas + payoff */}
        <div className="lv2why-rows">
          <div>
            {rows.map((r, i) => (
              <div
                key={r.n}
                style={{
                  ...rise(`${0.15 + i * 0.08}s`),
                  display: "grid",
                  gridTemplateColumns: "2.5rem 1fr",
                  columnGap: "1rem",
                  paddingTop: i === 0 ? 0 : "1.75rem",
                  marginTop: i === 0 ? 0 : "1.75rem",
                  borderTop: i === 0 ? "none" : `1px solid ${C.hairline}`,
                }}
              >
                <span aria-hidden="true" style={{ fontFamily: C.fontDisplay, fontWeight: 600, fontSize: "1.75rem", lineHeight: 1, color: C.gold }}>
                  {r.n}
                </span>
                <div>
                  <p style={{ fontFamily: C.fontDisplay, fontWeight: 600, fontSize: "clamp(1.375rem, 2vw, 1.5rem)", lineHeight: 1.2, color: C.ink, margin: 0 }}>
                    {r.lead}
                  </p>
                  <p style={{ fontFamily: C.fontBody, fontWeight: 400, fontSize: "clamp(1.0625rem, 1.4vw, 1.125rem)", lineHeight: 1.55, color: C.ink, margin: "0.375rem 0 0", maxWidth: "27rem" }}>
                    {r.sub}
                  </p>
                </div>
              </div>
            ))}

            {/* Payoff pull-quote */}
            <p style={{ ...rise("0.42s"), fontFamily: C.fontDisplay, fontStyle: "italic", fontWeight: 500, fontSize: "clamp(1.5rem, 2.6vw, 2rem)", lineHeight: 1.25, color: C.ink, margin: "clamp(2.25rem, 4vw, 3rem) 0 0", paddingLeft: "1.25rem", borderLeft: `3px solid ${C.rust}` }}>
              {w.payoff}
            </p>
          </div>
        </div>

        {/* RIGHT — the photo, hung once in a parchment mat */}
        <figure className="lv2why-figcol" role="img" aria-label={w.aria || w.h2} style={{ ...rise("0s"), margin: 0 }}>
          <div style={{ padding: "0.75rem", background: C.parchment, border: `1px solid ${C.hairline}`, borderRadius: "0.5rem", boxShadow: "0 1.5rem 3rem rgba(36,28,21,0.16)" }}>
            <div style={{ position: "relative", aspectRatio: "4 / 5", overflow: "hidden", borderRadius: "0.25rem" }}>
              <Image
                src="/landing/band-together.jpg"
                alt=""
                fill
                sizes="(max-width: 48rem) 100vw, 34rem"
                style={{ objectFit: "cover", objectPosition: "64% 40%" }}
              />
            </div>
          </div>
        </figure>
      </div>
    </section>
  );
}
