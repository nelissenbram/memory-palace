"use client";

/**
 * PHOTO RESTORE USP CARD — "The Restoration Bench"
 * A single framed photo tile loops a gentle before→after restoration: a
 * damaged, desaturated print (scratches + heavy corner vignette) cross-fades
 * into a warm, crisp restored keepsake while Before/After chips highlight in
 * sync and a thin diagonal shimmer sweeps the transition. One shared 9s CSS
 * loop, transform/opacity only; fully disabled under reduced motion (the
 * inline styles then show the restored end state).
 */

import React from "react";
import UspCardShell, { U, hexAlpha, USP_BODY_MIN_HEIGHT } from "./UspCardShell";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function PhaseChip({
  label,
  activeClass,
  activeOpacity,
}: {
  label: string;
  activeClass: string;
  /** Pre-animation / reduced-motion resting opacity of the highlight. */
  activeOpacity: number;
}) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.25rem 0.7rem",
        borderRadius: "2rem",
        background: U.canvas,
        border: `1px solid ${U.hairline}`,
        boxShadow: `0 1px 2px ${hexAlpha(U.ink, 0.06)}`,
      }}
    >
      <span
        className={activeClass}
        style={{
          position: "absolute",
          inset: "-1px",
          borderRadius: "2rem",
          background: hexAlpha(U.accent, 0.1),
          border: `1px solid ${hexAlpha(U.accent, 0.45)}`,
          opacity: activeOpacity,
        }}
      />
      <span
        style={{
          position: "relative",
          fontFamily: U.fontBody,
          fontWeight: 700,
          fontSize: "0.75rem",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: U.ink,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </span>
  );
}

export default function RestoreCard({
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
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Photo frame */}
          <rect x="2.5" y="4.5" width="13" height="13" rx="1.5" />
          {/* Hills inside the photo */}
          <path d="M2.5 14l3.4-3.4 2.9 2.9 3-3.4 3.7 3.7" />
          {/* Sun */}
          <circle cx="7" cy="8.4" r="1.2" />
          {/* Restoration sparkle */}
          <path d="M18.3 2.6l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" />
        </svg>
      }
      name={m.restoreName}
      role={m.restoreRole}
      aiLabel={aiLabel}
      label={`${m.restoreBefore} → ${m.restoreAfter}: an old photo restored`}
    >
      <div aria-hidden="true" style={{ minHeight: USP_BODY_MIN_HEIGHT }}>
        {/* Zone 1 — the framed photo */}
        <div
          style={{
            padding: "0.5rem",
            background: U.canvas,
            border: `1px solid ${U.hairline}`,
            borderRadius: "0.75rem",
            boxShadow: `0 0.25rem 0.75rem ${hexAlpha(U.ink, 0.08)}`,
          }}
        >
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "0.4rem",
              height: "11.5rem",
              background: U.surface,
            }}
          >
            {/* Restored photo (base layer) — warm, crisp */}
            <div
              className="lv2u-rest-photo"
              style={{
                position: "absolute",
                inset: 0,
                transform: "scale(1)",
                background: `linear-gradient(135deg, ${hexAlpha(U.gold, 0.4)} 0%, ${hexAlpha(
                  U.accent,
                  0.32
                )} 55%, ${hexAlpha(U.success, 0.3)} 100%)`,
              }}
            >
              {/* Sun */}
              <div
                style={{
                  position: "absolute",
                  top: "18%",
                  right: "20%",
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "50%",
                  background: hexAlpha(U.gold, 0.75),
                  boxShadow: `0 0 1rem ${hexAlpha(U.gold, 0.5)}`,
                }}
              />
              {/* Back hill */}
              <div
                style={{
                  position: "absolute",
                  bottom: "-42%",
                  left: "-18%",
                  width: "85%",
                  height: "80%",
                  borderRadius: "50%",
                  background: hexAlpha(U.success, 0.5),
                }}
              />
              {/* Front hill */}
              <div
                style={{
                  position: "absolute",
                  bottom: "-52%",
                  right: "-22%",
                  width: "95%",
                  height: "85%",
                  borderRadius: "50%",
                  background: hexAlpha(U.accent, 0.45),
                }}
              />
            </div>

            {/* Damaged overlay — desaturated wash + scratches + corner vignette */}
            <div
              className="lv2u-rest-damaged"
              style={{ position: "absolute", inset: 0, opacity: 0 }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(160deg, ${hexAlpha(U.muted, 0.82)} 0%, ${hexAlpha(
                    U.ink,
                    0.78
                  )} 100%)`,
                }}
              />
              {/* Faint scratch lines */}
              <div
                style={{
                  position: "absolute",
                  top: "-10%",
                  left: "30%",
                  width: "1px",
                  height: "120%",
                  background: hexAlpha(U.canvas, 0.5),
                  transform: "rotate(12deg)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "-10%",
                  left: "64%",
                  width: "1px",
                  height: "120%",
                  background: hexAlpha(U.canvas, 0.35),
                  transform: "rotate(-8deg)",
                }}
              />
              {/* Heavy corner vignette */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(ellipse at center, transparent 38%, ${hexAlpha(
                    U.ink,
                    0.72
                  )} 100%)`,
                }}
              />
            </div>

            {/* Thin diagonal shimmer sweep at the transition */}
            <div
              className="lv2u-rest-sweep"
              style={{
                position: "absolute",
                top: "-30%",
                bottom: "-30%",
                left: 0,
                width: "32%",
                background: `linear-gradient(105deg, transparent, ${hexAlpha(
                  U.canvas,
                  0.55
                )}, transparent)`,
                transform: "translateX(-180%) skewX(-18deg)",
                opacity: 0,
              }}
            />
          </div>
        </div>

        {/* Zone 2 — Before / After phase chips */}
        <div
          style={{
            marginTop: "0.875rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.625rem",
          }}
        >
          <PhaseChip label={m.restoreBefore} activeClass="lv2u-rest-before" activeOpacity={0} />
          <svg
            width="14"
            height="10"
            viewBox="0 0 14 10"
            fill="none"
            stroke={U.muted}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <path d="M1 5h11M8.6 1.6L12 5l-3.4 3.4" />
          </svg>
          <PhaseChip label={m.restoreAfter} activeClass="lv2u-rest-after" activeOpacity={1} />
        </div>
      </div>

      <style>{`
        .lv2u-rest-photo { animation: lv2u-rest-photo 9s ${EASE} infinite; }
        .lv2u-rest-damaged { animation: lv2u-rest-damaged 9s ${EASE} infinite; }
        .lv2u-rest-sweep { animation: lv2u-rest-sweep 9s ${EASE} infinite; }
        .lv2u-rest-before { animation: lv2u-rest-before 9s ${EASE} infinite; }
        .lv2u-rest-after { animation: lv2u-rest-after 9s ${EASE} infinite; }

        @keyframes lv2u-rest-damaged {
          0%, 42% { opacity: 1; }
          50%, 93% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes lv2u-rest-photo {
          0%, 42% { transform: scale(1.03); }
          52%, 93% { transform: scale(1); }
          100% { transform: scale(1.03); }
        }
        @keyframes lv2u-rest-sweep {
          0%, 40% { transform: translateX(-180%) skewX(-18deg); opacity: 0; }
          44% { opacity: 0.75; }
          52%, 100% { transform: translateX(430%) skewX(-18deg); opacity: 0; }
        }
        @keyframes lv2u-rest-before {
          0%, 42% { opacity: 1; }
          50%, 93% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes lv2u-rest-after {
          0%, 44% { opacity: 0; }
          52%, 93% { opacity: 1; }
          100% { opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .lv2u-rest-photo, .lv2u-rest-damaged, .lv2u-rest-sweep,
          .lv2u-rest-before, .lv2u-rest-after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </UspCardShell>
  );
}
