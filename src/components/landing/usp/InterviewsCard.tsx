"use client";

/**
 * AI Interviews USP card — "Your voice, written down."
 *
 * A crafted mini product window that makes the VOICE-TO-TEXT explicit: a gentle
 * question, a recorder pill with a breathing waveform while you speak, the
 * spoken sentence transcribed live (a caret writing it out), and finally the
 * tidy titled memory it's filed as. One shared ~11s CSS clock; the long rest
 * beat is the default face, and reduced motion renders that settled state.
 */

import React, { useEffect, useRef, useState } from "react";
import UspCardShell, { U } from "./UspCardShell";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const BARS = [0, 1, 2, 3, 4, 5, 6];
const ARCH = [0.28, 0.5, 0.74, 1, 0.74, 0.5, 0.28];

const CSS = `
.lv2u-int-anim { animation-duration: 11s; animation-iteration-count: infinite; animation-play-state: paused; }
.lv2u-int-play .lv2u-int-anim { animation-play-state: running; }

${BARS.map(
  (i) => `
.lv2u-int-b${i} { animation-name: lv2u-int-bar${i}; animation-timing-function: ease-in-out; transform: scaleY(${ARCH[i]}); transform-origin: center; }
@keyframes lv2u-int-bar${i} {
  0%, 10% { transform: scaleY(0.22); }
  ${14 + i} % { transform: scaleY(${(0.5 + (ARCH[i] * 0.5)).toFixed(2)}); }
  ${20 + i} % { transform: scaleY(${(0.3 + ARCH[i] * 0.4).toFixed(2)}); }
  ${26 + i} % { transform: scaleY(${ARCH[i].toFixed(2)}); }
  ${32 + i} % { transform: scaleY(${(0.35 + ARCH[i] * 0.3).toFixed(2)}); }
  40% { transform: scaleY(${ARCH[i].toFixed(2)}); }
  48% { transform: scaleY(0.22); }
  100% { transform: scaleY(0.22); }
}`
).join("\n")}

/* "transcribing…" status: on while she speaks, then it becomes the caption */
.lv2u-int-status { animation-name: lv2u-int-status; }
@keyframes lv2u-int-status { 0%, 8% { opacity: 0; } 12%, 46% { opacity: 1; } 52%, 100% { opacity: 0; } }

/* the spoken sentence is written out live (width reveal) with a caret */
.lv2u-int-quote { animation-name: lv2u-int-quote; }
@keyframes lv2u-int-quote {
  0%, 14% { max-width: 0; opacity: 0; }
  16% { opacity: 1; }
  44% { max-width: 100%; opacity: 1; }
  90% { max-width: 100%; opacity: 1; }
  100% { max-width: 100%; opacity: 0; }
}
.lv2u-int-caret { animation-name: lv2u-int-caret; }
@keyframes lv2u-int-caret {
  0%, 14% { opacity: 0; }
  16%, 44% { opacity: 1; }
  47%, 100% { opacity: 0; }
}

/* the filed memory card appears once it's written */
.lv2u-int-filed { animation-name: lv2u-int-filed; animation-timing-function: ${EASE}; }
@keyframes lv2u-int-filed {
  0%, 52% { opacity: 0; transform: translateY(0.375rem); }
  60%, 92% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(0.375rem); }
}
.lv2u-int-check { animation-name: lv2u-int-check; animation-timing-function: ${EASE}; }
@keyframes lv2u-int-check { 0%, 56% { stroke-dashoffset: 12; } 62%, 100% { stroke-dashoffset: 0; } }

@media (prefers-reduced-motion: reduce) {
  .lv2u-int-root, .lv2u-int-root * { animation: none !important; transition: none !important; }
  .lv2u-int-status { opacity: 0 !important; }
  .lv2u-int-quote { max-width: 100% !important; opacity: 1 !important; }
  .lv2u-int-caret { opacity: 0 !important; }
  .lv2u-int-filed { opacity: 1 !important; transform: none !important; }
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

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => { const e = entries[0]; if (e) setInView(e.isIntersecting); },
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
          {/* mic → lines: voice becoming text */}
          <path d="M7 5.5A2.5 2.5 0 0 1 12 5.5v3a2.5 2.5 0 0 1-5 0z" />
          <path d="M4.5 8a5 5 0 0 0 5 5" />
          <path d="M13 14h6M13 17h6M13 20h4" />
        </svg>
      }
      name={m.interviewName} role={m.interviewRole}
      aiLabel={aiLabel}
      label={m.interviewName}
    >
      <div
        ref={rootRef}
        aria-hidden="true"
        className={`lv2u-int-root${inView ? " lv2u-int-play" : ""}`}
        style={{ display: "flex", flexDirection: "column", minHeight: "15rem", containerType: "inline-size" }}
      >
        <style>{CSS}</style>

        {/* The gentle question */}
        <p
          style={{
            margin: 0,
            fontFamily: U.fontDisplay,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "1.25rem",
            lineHeight: 1.35,
            color: U.ink,
            maxWidth: "17rem",
          }}
        >
          {m.interviewQ}
        </p>

        {/* Recorder pill: mic + breathing waveform + live status */}
        <div
          style={{
            marginTop: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            background: U.surface,
            border: `1px solid ${U.hairline}`,
            borderRadius: "0.75rem",
            padding: "0.5rem 0.75rem",
          }}
        >
          <span
            style={{
              width: "1.6rem",
              height: "1.6rem",
              flexShrink: 0,
              borderRadius: "50%",
              background: "rgba(154, 79, 42, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: "0.9rem", height: "0.9rem" }} stroke={U.accent} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" />
              <path d="M6 11a6 6 0 0 0 12 0" />
              <path d="M12 17v3.5" />
            </svg>
          </span>
          <span style={{ flex: 1, height: "1.4rem", display: "flex", alignItems: "center", gap: "0.28rem" }}>
            {BARS.map((i) => (
              <span
                key={i}
                className={`lv2u-int-anim lv2u-int-b${i}`}
                style={{
                  width: "0.1875rem",
                  height: "1.4rem",
                  borderRadius: "999rem",
                  background: i === 3 ? U.gold : U.accent,
                  opacity: i === 3 ? 1 : 0.6,
                }}
              />
            ))}
          </span>
          <span
            className="lv2u-int-anim lv2u-int-status"
            style={{ fontFamily: U.fontBody, fontWeight: 600, fontSize: "0.75rem", color: U.muted, whiteSpace: "nowrap" }}
          >
            {m.transcribing}
          </span>
        </div>

        {/* Voice → text: the spoken sentence, written out live */}
        <div style={{ marginTop: "0.875rem", minHeight: "3.4rem", display: "flex", alignItems: "flex-start", gap: "0.4rem" }}>
          <span
            className="lv2u-int-anim lv2u-int-quote"
            style={{
              overflow: "hidden",
              whiteSpace: "normal",
              fontFamily: U.fontBody,
              fontStyle: "italic",
              fontSize: "0.9375rem",
              lineHeight: 1.5,
              color: U.ink,
            }}
          >
            {m.spoken}
          </span>
          <span
            className="lv2u-int-anim lv2u-int-caret"
            style={{ flexShrink: 0, width: "0.09rem", height: "1.2rem", background: U.accent, marginTop: "0.15rem" }}
          />
        </div>

        {/* Filed as a tidy titled memory */}
        <div
          className="lv2u-int-anim lv2u-int-filed"
          style={{
            marginTop: "auto",
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(74, 103, 65, 0.08)",
            border: "1px solid rgba(74, 103, 65, 0.22)",
            borderRadius: "0.625rem",
            padding: "0.5rem 0.75rem",
          }}
        >
          <span
            style={{
              width: "1.1rem",
              height: "1.1rem",
              flexShrink: 0,
              borderRadius: "50%",
              background: U.success,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 12 12" style={{ width: "0.6rem", height: "0.6rem" }} fill="none">
              <path className="lv2u-int-anim lv2u-int-check" d="M3 6.3l2.2 2.2L9.2 4.1" stroke={U.canvas} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={12} />
            </svg>
          </span>
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: U.fontBody, fontWeight: 700, fontSize: "0.875rem", lineHeight: 1.3, color: U.ink }}>
              {m.transcript}
            </span>
            <span style={{ fontFamily: U.fontBody, fontWeight: 600, fontSize: "0.75rem", color: U.success }}>
              {m.voiceToText}
            </span>
          </span>
        </div>
      </div>
    </UspCardShell>
  );
}
