"use client";

/**
 * "Why a palace?" — a single-column, multimodal block (round-8b).
 *
 * A moving image banner on top (the woman walking up to touch her framed
 * memories, a sharp golden-hour clip), then all the words below on the clean
 * cream page as dark ink (~9:1), never over the footage: rust eyebrow, gold
 * hairline, upright ink H2, three numbered rows carrying the argument (loci,
 * everyone-has-a-palace, enrich), closing on a rust-ruled italic payoff.
 *
 * One column that reads the same on phone, tablet and desktop. The clip
 * autoplays muted and loops with a pause control; reduced-motion / constrained
 * connections get the sharp poster still instead of the video.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

const C = {
  canvas: "#FCFAF5",
  parchment: "#EFE6D4",
  hairline: "#E3D6BC",
  ink: "#403B36",
  rust: "#9A4F2A",
  gold: "#D4AF37",
  cream: "#FCFAF5",
  fontDisplay: "var(--font-display, Georgia, serif)",
  fontBody: "var(--font-body, sans-serif)",
  fontNote: "var(--font-note, cursive)",
} as const;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function connectionConstrained() {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (!!c.saveData || /(^|\b)(slow-2g|2g|3g)\b/.test(c.effectiveType ?? ""));
}

export default function WhyPalaceVisual({ w }: { w: Record<string, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [wantVideo, setWantVideo] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reveal = () => setInView(true);
    if (prefersReducedMotion() || el.getBoundingClientRect().top < window.innerHeight) reveal();
    else {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { reveal(); io.disconnect(); } }, { rootMargin: "0px 0px -12% 0px" });
      io.observe(el);
      const t = window.setTimeout(reveal, 2500);
      return () => { io.disconnect(); window.clearTimeout(t); };
    }
  }, []);

  useEffect(() => {
    if (prefersReducedMotion() || connectionConstrained()) return;
    setWantVideo(true);
  }, []);

  useEffect(() => {
    if (!wantVideo) return;
    const v = videoRef.current;
    if (!v) return;
    const attempt = () => { if (v.paused && !paused) { v.muted = true; v.play().catch(() => {}); } };
    v.addEventListener("canplay", attempt);
    v.load();
    const timers = [600, 1800, 3600].map((ms) => window.setTimeout(attempt, ms));
    return () => { v.removeEventListener("canplay", attempt); timers.forEach((t) => window.clearTimeout(t)); };
  }, [wantVideo, paused]);

  const toggle = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().then(() => setPaused(false)).catch(() => {}); }
    else { v.pause(); setPaused(true); }
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
      <div ref={ref} style={{ maxWidth: "58rem", margin: "0 auto" }}>
        {/* Moving image banner (never a text bed) */}
        <figure role="img" aria-label={w.aria || w.h2} style={{ ...rise("0s"), margin: "0 0 clamp(2rem, 4vw, 3rem)", position: "relative" }}>
          <div style={{ position: "relative", aspectRatio: "16 / 9", overflow: "hidden", borderRadius: "1rem", border: `1px solid ${C.hairline}`, boxShadow: "0 1.5rem 3rem rgba(36,28,21,0.16)", background: C.parchment }}>
            <Image src="/video/why-poster.jpg" alt="" fill priority={false} sizes="(max-width: 62rem) 100vw, 58rem" style={{ objectFit: "cover", objectPosition: "50% 42%" }} />
            {wantVideo ? (
              <video
                ref={videoRef}
                muted
                loop
                playsInline
                preload="none"
                poster="/video/why-poster.jpg"
                aria-hidden="true"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 42%" }}
              >
                <source src="/video/why-clip.mp4" type="video/mp4" />
              </video>
            ) : null}
            {wantVideo ? (
              <button
                type="button"
                onClick={toggle}
                aria-label={paused ? (w.play || "Play") : (w.pause || "Pause")}
                style={{ position: "absolute", right: "0.75rem", bottom: "0.75rem", width: "2.75rem", height: "2.75rem", borderRadius: "50%", border: "1px solid rgba(252,250,245,0.5)", background: "rgba(36,28,21,0.5)", color: C.cream, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}
              >
                {paused ? (
                  <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6V2z" fill="currentColor" /></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z" fill="currentColor" /></svg>
                )}
              </button>
            ) : null}
          </div>
        </figure>

        {/* The words, on bare cream, left-aligned to the banner */}
        <div style={{ maxWidth: "46rem" }}>
          <p style={{ ...rise("0.08s"), fontFamily: C.fontNote, fontWeight: 600, fontSize: "1.25rem", letterSpacing: "0.02em", color: C.rust, margin: 0 }}>
            {w.eyebrow}
          </p>
          <span aria-hidden="true" style={{ ...rise("0.08s"), display: "block", width: "3rem", height: "2px", background: C.gold, opacity: 0.6, margin: "0.75rem 0 1.5rem" }} />
          <h2 style={{ ...rise("0.12s"), fontFamily: C.fontDisplay, fontWeight: 600, fontSize: "clamp(2rem, 4.5vw, 3rem)", lineHeight: 1.1, color: C.ink, margin: 0, textWrap: "balance" }}>
            {w.h2}
          </h2>

          <div style={{ marginTop: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            {rows.map((r, i) => (
              <div
                key={r.n}
                style={{
                  ...rise(`${0.16 + i * 0.08}s`),
                  display: "grid",
                  gridTemplateColumns: "2.5rem 1fr",
                  columnGap: "1rem",
                  paddingTop: i === 0 ? 0 : "1.5rem",
                  marginTop: i === 0 ? 0 : "1.5rem",
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
                  <p style={{ fontFamily: C.fontBody, fontWeight: 400, fontSize: "clamp(1.0625rem, 1.4vw, 1.125rem)", lineHeight: 1.55, color: C.ink, margin: "0.375rem 0 0" }}>
                    {r.sub}
                  </p>
                </div>
              </div>
            ))}

            <p style={{ ...rise("0.42s"), fontFamily: C.fontDisplay, fontStyle: "italic", fontWeight: 500, fontSize: "clamp(1.5rem, 2.6vw, 2rem)", lineHeight: 1.25, color: C.ink, margin: "clamp(2rem, 4vw, 2.75rem) 0 0", paddingLeft: "1.25rem", borderLeft: `3px solid ${C.rust}` }}>
              {w.payoff}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
