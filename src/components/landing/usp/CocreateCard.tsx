"use client";

/**
 * CocreateCard — "Build Together" USP vignette (landing page, USP grid).
 *
 * Story: three family members (avatar cluster M/B/E) share one palace; Mia
 * lays a photo onto Summer 1998 (photo-stack + activity line), captioned
 * "Three generations, one palace".
 *
 * Note: the avatar initials M / B / E are hardcoded decorative glyphs
 * (aria-hidden); the shell's aria-label carries m.cocreateName, and the
 * body text comes from m.adding + m.generations only.
 */

import React from "react";
import Image from "next/image";
import UspCardShell, { U } from "./UspCardShell";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const avatarBase: React.CSSProperties = {
  position: "relative",
  width: "2.75rem",
  height: "2.75rem",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: U.fontDisplay,
  fontSize: "1.25rem",
  fontWeight: 600,
  boxShadow: `0 0 0 0.1875rem ${U.canvas}`,
};

const ghostBase: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "2.75rem",
  height: "2.75rem",
  background: U.hairline,
  borderRadius: "0.5rem",
};

export default function CocreateCard({
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
          <circle cx="11" cy="8.2" r="4.7" />
          <circle cx="7.6" cy="13.8" r="4.7" />
          <circle cx="14.4" cy="13.8" r="4.7" />
        </svg>
      }
      name={m.cocreateName}
      aiLabel={aiLabel}
      label={m.cocreateName}
    >
      <style>{`
        .lv2u-cocreate-avM {
          animation:
            lv2u-cocreate-join-m 0.7s ${EASE} both,
            lv2u-cocreate-pulse 10s ${EASE} 1.8s infinite;
        }
        .lv2u-cocreate-avE {
          animation: lv2u-cocreate-join-e 0.7s ${EASE} 0.5s both;
        }
        .lv2u-cocreate-adding {
          opacity: 0;
          animation: lv2u-cocreate-fade 0.6s ${EASE} 1.2s forwards;
        }
        .lv2u-cocreate-caption {
          opacity: 0;
          animation: lv2u-cocreate-rise 0.6s ${EASE} 1.4s forwards;
        }
        .lv2u-cocreate-thumb {
          opacity: 0;
          animation: lv2u-cocreate-lay 10s ${EASE} 1.8s infinite;
        }
        @keyframes lv2u-cocreate-join-m {
          from { opacity: 0; transform: scale(0.7) translateX(0.375rem); }
          to { opacity: 1; transform: scale(1) translateX(0); }
        }
        @keyframes lv2u-cocreate-join-e {
          from { opacity: 0; transform: scale(0.7) translateX(-0.375rem); }
          to { opacity: 1; transform: scale(1) translateX(0); }
        }
        @keyframes lv2u-cocreate-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lv2u-cocreate-rise {
          from { opacity: 0; transform: translateY(0.25rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lv2u-cocreate-lay {
          0% { opacity: 0; transform: scale(0.88) rotate(-3deg); }
          8% { opacity: 1; transform: scale(1) rotate(0deg); }
          95% { opacity: 1; transform: scale(1) rotate(0deg); }
          100% { opacity: 0; transform: scale(1) rotate(0deg); }
        }
        @keyframes lv2u-cocreate-pulse {
          0%, 6% {
            box-shadow: 0 0 0 0.1875rem ${U.canvas}, 0 0 0 0 rgba(154, 79, 42, 0.4);
          }
          16%, 100% {
            box-shadow: 0 0 0 0.1875rem ${U.canvas}, 0 0 0 0.5rem rgba(154, 79, 42, 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .lv2u-cocreate-avM,
          .lv2u-cocreate-avE,
          .lv2u-cocreate-adding,
          .lv2u-cocreate-caption,
          .lv2u-cocreate-thumb {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* ROW 1 — avatar cluster (decorative; label carried by the shell) */}
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            justifyContent: "center",
            height: "2.75rem",
            marginBottom: "1rem",
          }}
        >
          <span
            className="lv2u-cocreate-avM"
            style={{
              ...avatarBase,
              background: U.accent,
              color: U.canvas,
              zIndex: 2,
            }}
          >
            M
            <span
              style={{
                position: "absolute",
                right: "-0.0625rem",
                bottom: "-0.0625rem",
                width: "0.625rem",
                height: "0.625rem",
                borderRadius: "50%",
                background: U.success,
                boxShadow: `0 0 0 0.125rem ${U.canvas}`,
              }}
            />
          </span>
          <span
            style={{
              ...avatarBase,
              background: U.gold,
              color: U.dark,
              marginLeft: "-0.75rem",
              zIndex: 3,
            }}
          >
            B
          </span>
          <span
            className="lv2u-cocreate-avE"
            style={{
              ...avatarBase,
              background: U.success,
              color: U.canvas,
              marginLeft: "-0.75rem",
              zIndex: 1,
            }}
          >
            E
          </span>
        </div>

        {/* ROW 2 — activity line */}
        <div
          style={{
            width: "100%",
            background: U.surface,
            border: `0.0625rem solid ${U.hairline}`,
            borderRadius: "0.625rem",
            padding: "0.5625rem 0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            minHeight: "3.5rem",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "relative",
              flexShrink: 0,
              width: "2.75rem",
              height: "2.75rem",
              margin: "0 0.45rem 0.45rem 0",
              display: "block",
            }}
          >
            <span
              style={{
                ...ghostBase,
                transform: "translate(0.45rem, 0.45rem) rotate(6deg)",
              }}
            />
            <span
              style={{
                ...ghostBase,
                transform: "translate(0.25rem, 0.25rem) rotate(3deg)",
              }}
            />
            <Image
              className="lv2u-cocreate-thumb"
              src="/landing/demo-morning.jpg"
              alt=""
              width={44}
              height={44}
              loading="lazy"
              style={{
                position: "absolute",
                inset: 0,
                width: "2.75rem",
                height: "2.75rem",
                objectFit: "cover",
                objectPosition: "50% 40%",
                borderRadius: "0.5rem",
                border: `0.125rem solid ${U.canvas}`,
                boxShadow: "0 0.125rem 0.375rem rgba(36, 28, 21, 0.15)",
              }}
            />
          </span>
          <span
            className="lv2u-cocreate-adding"
            style={{
              fontFamily: U.fontBody,
              fontSize: "0.875rem",
              fontWeight: 600,
              color: U.ink,
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {m.adding}
          </span>
        </div>

        {/* ROW 3 — caption */}
        <div
          className="lv2u-cocreate-caption"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "0.9375rem",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "relative",
              width: "1.75rem",
              height: "0.0625rem",
              background: U.hairline,
              display: "block",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: "0.25rem",
                height: "0.25rem",
                background: U.gold,
                transform: "translate(-50%, -50%) rotate(45deg)",
              }}
            />
          </span>
          <span
            style={{
              fontFamily: U.fontDisplay,
              fontStyle: "italic",
              fontSize: "1.0625rem",
              color: U.muted,
              letterSpacing: "0.01em",
              marginTop: "0.5rem",
              textAlign: "center",
            }}
          >
            {m.generations}
          </span>
        </div>
      </div>
    </UspCardShell>
  );
}
