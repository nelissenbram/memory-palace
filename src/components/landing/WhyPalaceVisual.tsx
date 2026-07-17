"use client";

/**
 * "Why a palace?" — a pinned three-beat scroll sequence over one golden-hour
 * render (round-7 army decision). The image (band-together.jpg) never changes;
 * a constant eyebrow + H2 sit in the dark lower-left while three beats deepen
 * the argument as you scroll: the method of loci, then dignity (everyone
 * already carries a palace), then enrich (add the voice and story), resolving
 * on "You walk up and touch it." A gold hairline grows with scroll progress.
 *
 * The section is the scroll track; the figure is sticky-centered. Scroll maps
 * only to opacity/progress (never hijacked). On mobile and under reduced motion
 * the pin collapses to one static figure with all three beats stacked beneath.
 */

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

const C = {
  canvas: "#FCFAF5",
  cream: "#FCFAF5",
  parchment: "#EFE6D4",
  hairline: "#E3D6BC",
  gold: "#D4AF37",
  fontDisplay: "var(--font-display, Georgia, serif)",
  fontBody: "var(--font-body, sans-serif)",
  fontNote: "var(--font-note, cursive)",
} as const;

export default function WhyPalaceVisual({ w }: { w: Record<string, string> }) {
  const trackRef = useRef<HTMLElement>(null);
  const [pinned, setPinned] = useState(false); // desktop + motion-ok
  const [progress, setProgress] = useState(0);

  const beats = [
    { lead: w.b1lead, sub: w.b1sub },
    { lead: w.b2lead, sub: w.b2sub },
    { lead: w.b3lead, sub: w.b3sub },
  ];
  const active = Math.min(2, Math.floor(progress * 3));

  useEffect(() => {
    const mqMobile = window.matchMedia("(max-width: 48rem)");
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setPinned(!mqMobile.matches && !mqReduce.matches);
    decide();
    mqMobile.addEventListener("change", decide);
    mqReduce.addEventListener("change", decide);
    return () => { mqMobile.removeEventListener("change", decide); mqReduce.removeEventListener("change", decide); };
  }, []);

  useEffect(() => {
    if (!pinned) { setProgress(0); return; }
    const el = trackRef.current;
    if (!el) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      setProgress(p);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [pinned]);

  const hairlineWidth = pinned ? `calc(2.5rem + (100% - 2.5rem) * ${progress})` : "2.5rem";
  const kenBurns = pinned && progress >= 0.66 ? 1 + ((progress - 0.66) / 0.34) * 0.05 : 1;

  return (
    <section
      ref={trackRef}
      aria-label={w.h2}
      className="lv2why-track"
      style={{
        position: "relative",
        background: C.canvas,
        minHeight: pinned ? "260vh" : "auto",
      }}
    >
      <style>{`
        .lv2why-fig { position: relative; margin: 0 auto; width: 100%; max-width: 64rem; overflow: hidden;
          border-radius: 1.25rem; border: 1px solid ${C.hairline};
          box-shadow: 0 1.5rem 3rem rgba(36,28,21,0.18); aspect-ratio: 16 / 9; }
        .lv2why-fig::after { content: ""; position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(105deg, rgba(36,28,21,0.74) 0%, rgba(36,28,21,0.34) 40%, transparent 66%), linear-gradient(to top, rgba(36,28,21,0.55) 0%, transparent 42%); }
        .lv2why-beat { transition: opacity 0.4s ease, transform 0.4s ease; }
        @media (max-width: 48rem) {
          .lv2why-fig { aspect-ratio: 4 / 5; }
          .lv2why-note, .lv2why-handcap { display: none !important; }
        }
      `}</style>

      <div
        className="lv2why-stage"
        style={
          pinned
            ? { position: "sticky", top: 0, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 clamp(1rem, 4vw, 2rem)" }
            : { padding: "clamp(3rem, 6vw, 5rem) clamp(1rem, 4vw, 2rem)" }
        }
      >
        <figure role="img" aria-label={w.aria || w.h2} className="lv2why-fig">
          <Image
            src="/landing/band-together.jpg"
            alt=""
            fill
            sizes="(max-width: 48rem) 100vw, 64rem"
            style={{ objectFit: "cover", objectPosition: "68% 42%", transform: `scale(${kenBurns})`, transition: "transform 0.2s linear" }}
          />

          {/* Beat-1 near-frame label / Beat-2 hand caption (desktop, pinned only) */}
          {pinned ? (
            <>
              <span className="lv2why-note" style={{ position: "absolute", top: "12%", right: "7%", transform: "rotate(-2deg)", fontFamily: C.fontNote, fontWeight: 600, fontSize: "1.15rem", color: C.gold, textShadow: "0 1px 6px rgba(36,28,21,0.6)", opacity: active === 0 ? 1 : 0, transition: "opacity 0.4s ease" }}>
                {w.b1label}
              </span>
              <span className="lv2why-handcap" style={{ position: "absolute", top: "20%", right: "6%", transform: "rotate(-2deg)", fontFamily: C.fontNote, fontWeight: 600, fontSize: "1.25rem", color: C.gold, textShadow: "0 1px 6px rgba(36,28,21,0.6)", opacity: active === 1 ? 1 : 0, transition: "opacity 0.4s ease" }}>
                {w.b2caption}
              </span>
            </>
          ) : null}

          {/* Text well */}
          <figcaption style={{ position: "absolute", left: 0, bottom: 0, maxWidth: "32rem", padding: "clamp(1.5rem, 4vw, 2.5rem)" }}>
            <span style={{ fontFamily: C.fontNote, fontWeight: 600, fontSize: "1.15rem", letterSpacing: "0.02em", color: C.gold }}>
              {w.eyebrow}
            </span>
            <span aria-hidden="true" style={{ display: "block", width: hairlineWidth, maxWidth: "100%", height: "1px", background: C.gold, opacity: 0.45, margin: "0.75rem 0", transition: "width 0.2s linear" }} />
            <h2 style={{ fontFamily: C.fontDisplay, fontStyle: "italic", fontWeight: 500, fontSize: "clamp(1.6rem, 4vw, 2.75rem)", lineHeight: 1.06, color: C.cream, margin: 0, textShadow: "0 1px 12px rgba(36,28,21,0.45)", textWrap: "balance" }}>
              {w.h2}
            </h2>

            {pinned ? (
              /* One beat at a time, crossfaded */
              <div style={{ position: "relative", marginTop: "1rem", minHeight: "6.5rem" }}>
                {beats.map((b, i) => (
                  <div
                    key={i}
                    className="lv2why-beat"
                    aria-hidden={i !== active}
                    style={{ position: "absolute", inset: 0, opacity: i === active ? 1 : 0, transform: i === active ? "none" : "translateY(0.4rem)" }}
                  >
                    <span style={{ display: "block", fontFamily: C.fontDisplay, fontStyle: "italic", fontWeight: 500, fontSize: "clamp(1.15rem, 2vw, 1.5rem)", lineHeight: 1.2, color: C.cream }}>
                      {i === 2 ? w.payoff : b.lead}
                    </span>
                    <span style={{ display: "block", fontFamily: C.fontBody, fontSize: "clamp(0.9375rem, 1.4vw, 1.0625rem)", lineHeight: 1.5, color: C.parchment, opacity: 0.92, marginTop: "0.5rem", textWrap: "pretty" }}>
                      {b.sub}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Static fallback: all three beats stacked + the summary body */
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {beats.map((b, i) => (
                  <div key={i}>
                    <span style={{ display: "block", fontFamily: C.fontDisplay, fontStyle: "italic", fontWeight: 500, fontSize: "1.25rem", lineHeight: 1.2, color: C.cream }}>
                      {i === 2 ? w.payoff : b.lead}
                    </span>
                    <span style={{ display: "block", fontFamily: C.fontBody, fontSize: "1rem", lineHeight: 1.5, color: C.parchment, opacity: 0.92, marginTop: "0.25rem" }}>
                      {b.sub}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
