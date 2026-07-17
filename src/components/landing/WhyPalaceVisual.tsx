"use client";

/**
 * "Why a palace?" hero — decided by a 40-idea army + 3 judge panels (round 6).
 *
 * One full-bleed golden-hour render (a woman reaching up to touch a framed
 * photo on a warm wall) with the argument seated in the naturally-dark
 * lower-left, over a mandatory legibility scrim. One gold hairline, one
 * handwritten caption, one restrained Ken-Burns push-in that goes static under
 * reduced motion. No diagrams, no composites — the picture makes the case.
 *
 * The parent renders nothing else for this block; all copy lives here so the
 * image + text stay locked together. `w` = the landingV2.why slice.
 */

import React, { useEffect, useRef } from "react";
import Image from "next/image";

const C = {
  cream: "#FCFAF5",
  parchment: "#EFE6D4",
  hairline: "#E3D6BC",
  gold: "#D4AF37",
  fontDisplay: "var(--font-display, Georgia, serif)",
  fontBody: "var(--font-body, sans-serif)",
  fontNote: "var(--font-note, cursive)",
} as const;

export default function WhyPalaceVisual({ w }: { w: Record<string, string> }) {
  const figRef = useRef<HTMLElement>(null);

  // Trigger the one Ken-Burns push-in when scrolled into view (decorative only;
  // copy is always visible, so a failed observer never hides content).
  useEffect(() => {
    const el = figRef.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < window.innerHeight) { el.classList.add("lv2why-in"); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("lv2why-in"); io.disconnect(); } },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure
      ref={figRef}
      role="img"
      aria-label={w.aria || w.h2}
      className="lv2why-fig"
      style={{
        position: "relative",
        margin: "0 auto",
        maxWidth: "64rem",
        overflow: "hidden",
        borderRadius: "1.25rem",
        border: `1px solid ${C.hairline}`,
        boxShadow: "0 1.5rem 3rem rgba(36, 28, 21, 0.18)",
      }}
    >
      <style>{`
        .lv2why-fig { --lv2why-ar: 16 / 9; aspect-ratio: var(--lv2why-ar); }
        .lv2why-img { transform: scale(1.02); transform-origin: 70% 45%; }
        .lv2why-fig.lv2why-in .lv2why-img { transform: scale(1.06); transition: transform 6s ease-out; }
        @media (max-width: 48rem) {
          .lv2why-fig { --lv2why-ar: 4 / 5; }
          .lv2why-note { display: none !important; }
          .lv2why-copy { padding: 1.5rem !important; max-width: 22rem !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lv2why-img, .lv2why-fig.lv2why-in .lv2why-img { transform: none !important; transition: none !important; }
          .lv2why-copy, .lv2why-fig.lv2why-in .lv2why-copy { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
      `}</style>

      {/* The one image */}
      <Image
        src="/landing/band-together.jpg"
        alt=""
        fill
        className="lv2why-img"
        sizes="(max-width: 48rem) 100vw, 64rem"
        style={{ objectFit: "cover", objectPosition: "68% 42%" }}
      />

      {/* Mandatory legibility scrim — dark left + lower-left only */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(105deg, rgba(36,28,21,0.74) 0%, rgba(36,28,21,0.34) 40%, transparent 66%), linear-gradient(to top, rgba(36,28,21,0.55) 0%, transparent 42%)",
          pointerEvents: "none",
        }}
      />

      {/* Handwritten caption near the hand (hidden on mobile) */}
      <span
        aria-hidden="true"
        className="lv2why-note"
        style={{
          position: "absolute",
          top: "14%",
          right: "6%",
          transform: "rotate(-2deg)",
          fontFamily: C.fontNote,
          fontWeight: 600,
          fontSize: "1.25rem",
          color: C.gold,
          textShadow: "0 1px 6px rgba(36,28,21,0.5)",
        }}
      >
        {w.caption}
      </span>

      {/* Argument, seated bottom-left */}
      <figcaption
        className="lv2why-copy"
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          maxWidth: "30rem",
          padding: "2.5rem",
        }}
      >
        <span
          style={{
            fontFamily: C.fontNote,
            fontWeight: 600,
            fontSize: "1.15rem",
            letterSpacing: "0.02em",
            color: C.gold,
          }}
        >
          {w.eyebrow}
        </span>
        <span
          aria-hidden="true"
          style={{ display: "block", width: "2.5rem", height: "1px", background: C.gold, opacity: 0.4, margin: "0.75rem 0" }}
        />
        <h2
          style={{
            fontFamily: C.fontDisplay,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "clamp(1.75rem, 4.5vw, 3rem)",
            lineHeight: 1.05,
            color: C.cream,
            margin: 0,
            textShadow: "0 1px 12px rgba(36,28,21,0.45)",
            textWrap: "balance",
          }}
        >
          {w.h2}
        </h2>
        <p
          style={{
            fontFamily: C.fontBody,
            fontSize: "clamp(1rem, 1.4vw, 1.0625rem)",
            lineHeight: 1.5,
            color: C.parchment,
            opacity: 0.92,
            margin: "1rem 0 0",
            textWrap: "pretty",
          }}
        >
          {w.body}
        </p>
      </figcaption>
    </figure>
  );
}
