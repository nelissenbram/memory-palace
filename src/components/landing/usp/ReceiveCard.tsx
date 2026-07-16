"use client";

/**
 * RECEIVE USP card — "A room arrives, and becomes yours."
 *
 * Anna's shared room arrives as a mounted photograph under a pale
 * "not yet yours" veil; the Accept pill breathes once, is pressed,
 * turns green with a drawn check, the veil lifts to full colour, the
 * unread dot goes out, and a gold seal is pressed into the photo
 * corner. Then a long rest at the completed state.
 *
 * Base (no-animation) styles depict the ACCEPTED end state, so the
 * prefers-reduced-motion override (animation: none) rests on the
 * calm, complete story with zero extra fallback code.
 */

import React from "react";
import Image from "next/image";
import UspCardShell, { U } from "./UspCardShell";

export default function ReceiveCard({
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
          <circle cx="4.8" cy="4.8" r="3.2" />
          <path d="M13 6.5h6a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5V8a1.5 1.5 0 0 1 1.5-1.5z" />
          <path d="M14 16.5v-4a2 2 0 0 1 4 0v4" />
          <path d="M4.8 10.5c0 3.6 1.7 5.5 5.2 5.5M8 13.9l2.2 2.1L8 18.1" />
        </svg>
      }
      name={m.receiveName}
      aiLabel={aiLabel}
      label={m.receiveName}
    >
      <style>{`
        @keyframes lv2u-rcv-row1 {
          0% { opacity: 0; transform: translateY(-0.375rem); }
          6%, 100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes lv2u-rcv-row23 {
          0%, 2% { opacity: 0; transform: translateY(-0.375rem); }
          8%, 100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes lv2u-rcv-halo {
          0% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0); }
          4% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.35); }
          13%, 100% { box-shadow: 0 0 0 0.5rem rgba(212, 175, 55, 0); }
        }
        @keyframes lv2u-rcv-dot {
          0%, 46% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes lv2u-rcv-veil {
          0%, 46% { opacity: 0.35; }
          54%, 100% { opacity: 0; }
        }
        @keyframes lv2u-rcv-photo {
          0%, 46% { filter: saturate(0.75); }
          54%, 100% { filter: saturate(1); }
        }
        @keyframes lv2u-rcv-seal {
          0%, 50% { opacity: 0; transform: scale(1.35); }
          53.5% { opacity: 1; transform: scale(0.96); }
          55%, 100% { opacity: 1; transform: scale(1); }
        }
        @keyframes lv2u-rcv-pill {
          0%, 26% {
            background: ${U.accent};
            transform: scale(1);
            box-shadow: 0 0.125rem 0.5rem rgba(154, 79, 42, 0.25),
              0 0 0 0 rgba(154, 79, 42, 0.30);
          }
          30% {
            background: ${U.accent};
            transform: scale(1.04);
            box-shadow: 0 0.125rem 0.5rem rgba(154, 79, 42, 0.25),
              0 0 0 0.25rem rgba(154, 79, 42, 0.15);
          }
          34%, 38% {
            background: ${U.accent};
            transform: scale(1);
            box-shadow: 0 0.125rem 0.5rem rgba(154, 79, 42, 0.25),
              0 0 0 0.5rem rgba(154, 79, 42, 0);
          }
          39.2% {
            background: ${U.accent};
            transform: scale(0.96);
          }
          40.5% {
            background: ${U.accent};
            transform: scale(1);
          }
          46%, 100% {
            background: ${U.success};
            transform: scale(1);
            box-shadow: 0 0.125rem 0.5rem rgba(154, 79, 42, 0.25),
              0 0 0 0.5rem rgba(154, 79, 42, 0);
          }
        }
        @keyframes lv2u-rcv-label {
          0%, 40.5% { opacity: 1; }
          42.5%, 100% { opacity: 0; }
        }
        @keyframes lv2u-rcv-check {
          0%, 42% { opacity: 0; stroke-dashoffset: 22; }
          43.5% { opacity: 1; stroke-dashoffset: 15; }
          46.5%, 100% { opacity: 1; stroke-dashoffset: 0; }
        }
        .lv2u-rcv-row1 { animation: lv2u-rcv-row1 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
        .lv2u-rcv-room { animation: lv2u-rcv-row23 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
        .lv2u-rcv-row3 { animation: lv2u-rcv-row23 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
        .lv2u-rcv-halo { animation: lv2u-rcv-halo 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
        .lv2u-rcv-dot { animation: lv2u-rcv-dot 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
        .lv2u-rcv-veil { animation: lv2u-rcv-veil 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
        .lv2u-rcv-photo { animation: lv2u-rcv-photo 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
        .lv2u-rcv-seal { animation: lv2u-rcv-seal 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
        .lv2u-rcv-pill { animation: lv2u-rcv-pill 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
        .lv2u-rcv-label { animation: lv2u-rcv-label 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
        .lv2u-rcv-check { animation: lv2u-rcv-check 10s cubic-bezier(0.22, 1, 0.36, 1) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .lv2u-rcv-row1, .lv2u-rcv-room, .lv2u-rcv-row3, .lv2u-rcv-halo,
          .lv2u-rcv-dot, .lv2u-rcv-veil, .lv2u-rcv-photo, .lv2u-rcv-seal,
          .lv2u-rcv-pill, .lv2u-rcv-label, .lv2u-rcv-check {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
      <div
        aria-hidden="true"
        style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
      >
        {/* ROW 1 — sender */}
        <div
          className="lv2u-rcv-row1"
          style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
        >
          <div
            style={{
              position: "relative",
              width: "2.75rem",
              height: "2.75rem",
              flexShrink: 0,
            }}
          >
            <div
              className="lv2u-rcv-halo"
              style={{
                position: "absolute",
                inset: "-0.1875rem",
                borderRadius: "50%",
                boxShadow: "0 0 0 0 rgba(212, 175, 55, 0)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                width: "2.75rem",
                height: "2.75rem",
                borderRadius: "50%",
                background: "rgba(154, 79, 42, 0.12)",
                border: `1px solid ${U.hairline}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Decorative initial mirroring the sender name: m.sharedBy
                  leads with "Anna" in all 5 locales (verified 2026-07-16). */}
              <span
                style={{
                  fontFamily: U.fontDisplay,
                  fontSize: "1.375rem",
                  fontWeight: 600,
                  color: U.accent,
                  lineHeight: 1,
                }}
              >
                A
              </span>
            </div>
          </div>
          <span
            style={{
              fontFamily: U.fontBody,
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: U.ink,
              lineHeight: 1.4,
              flex: 1,
            }}
          >
            {m.sharedBy}
          </span>
          <span
            className="lv2u-rcv-dot"
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              background: U.gold,
              boxShadow: "0 0 0 0.1875rem rgba(212, 175, 55, 0.18)",
              alignSelf: "flex-start",
              marginTop: "0.25rem",
              flexShrink: 0,
              opacity: 0,
            }}
          />
        </div>

        {/* ROW 2 — the shared room as a mounted print */}
        <div
          className="lv2u-rcv-room"
          style={{
            background: U.surface,
            border: `1px solid ${U.hairline}`,
            borderRadius: "0.75rem",
            padding: "0.375rem 0.375rem 0",
            boxShadow: "0 0.25rem 0.75rem rgba(36, 28, 21, 0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: "0.5rem",
            }}
          >
            <Image
              className="lv2u-rcv-photo"
              src="/landing/demo-graduation.jpg"
              alt=""
              width={480}
              height={319}
              loading="lazy"
              style={{
                width: "100%",
                height: "6.5rem",
                objectFit: "cover",
                display: "block",
                filter: "saturate(1)",
              }}
            />
            <div
              className="lv2u-rcv-veil"
              style={{
                position: "absolute",
                inset: 0,
                background: U.canvas,
                opacity: 0,
                pointerEvents: "none",
              }}
            />
            <div
              className="lv2u-rcv-seal"
              style={{
                position: "absolute",
                right: "0.5rem",
                bottom: "0.5rem",
                width: "1.5rem",
                height: "1.5rem",
                borderRadius: "50%",
                background: U.gold,
                border: `2px solid ${U.canvas}`,
                boxShadow: "0 0.125rem 0.375rem rgba(36, 28, 21, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 1,
                transform: "scale(1)",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                style={{ width: "0.75rem", height: "0.75rem" }}
              >
                <path
                  d="M2.5 6.5 L5 9 L9.5 3"
                  stroke={U.dark}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.5rem",
              padding: "0.625rem 0.5rem 0.75rem",
            }}
          >
            <span
              style={{
                width: "0.375rem",
                height: "0.375rem",
                borderRadius: "50%",
                background: U.gold,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: U.fontDisplay,
                fontSize: "1.0625rem",
                fontWeight: 600,
                color: U.ink,
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {m.sharedRoom}
            </span>
          </div>
        </div>

        {/* ROW 3 — accept action */}
        <div
          className="lv2u-rcv-row3"
          style={{ display: "flex", justifyContent: "flex-end" }}
        >
          <span
            className="lv2u-rcv-pill"
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "7rem",
              height: "2.75rem",
              padding: "0 1.5rem",
              borderRadius: "1.5rem",
              background: U.success,
              boxShadow: "0 0.125rem 0.5rem rgba(154, 79, 42, 0.25)",
            }}
          >
            <span
              className="lv2u-rcv-label"
              style={{
                fontFamily: U.fontBody,
                fontSize: "0.9375rem",
                fontWeight: 700,
                letterSpacing: "0.02em",
                color: U.canvas,
                opacity: 0,
              }}
            >
              {m.accept}
            </span>
            <svg
              viewBox="0 0 16 16"
              fill="none"
              style={{
                position: "absolute",
                inset: 0,
                margin: "auto",
                width: "1rem",
                height: "1rem",
              }}
            >
              <path
                className="lv2u-rcv-check"
                d="M3 8.5 L6.5 12 L13 4"
                stroke={U.canvas}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={22}
                style={{ strokeDashoffset: 0, opacity: 1 }}
              />
            </svg>
          </span>
        </div>
      </div>
    </UspCardShell>
  );
}
