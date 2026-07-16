"use client";

/**
 * CLOUD USP CARD — "The Developing Tray"
 * A mini product window showing a cloud import job: photos develop in a
 * thumbnail strip while a progress bar fills, then the AI sorts them into
 * three room chips. One shared 10s CSS loop, transform/opacity only.
 */

import UspCardShell, { U } from "./UspCardShell";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const PHOTO_GRADIENTS = [
  "linear-gradient(135deg, rgba(212,175,55,0.35), rgba(154,79,42,0.25))",
  "linear-gradient(160deg, rgba(154,79,42,0.30) 0%, rgba(212,175,55,0.15) 70%)",
  "linear-gradient(180deg, rgba(212,175,55,0.20) 0%, rgba(74,103,65,0.25) 60%)",
  "linear-gradient(135deg, rgba(74,103,65,0.22) 0%, rgba(212,175,55,0.18) 100%)",
  "linear-gradient(200deg, rgba(154,79,42,0.28) 0%, rgba(242,237,228,0) 85%)",
];

function CloudGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 22 22"
      fill="none"
      stroke={U.accent}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.03 14A6.42 6.42 0 1 1 14.4 7.33h1.64a4.13 4.13 0 0 1 2.23 7.59" />
      <path d="M11 11.5v6.3M7.9 14.9l3.1 2.9 3.1-2.9" />
    </svg>
  );
}

function DoorGlyph() {
  return (
    <svg
      width="8"
      height="10"
      viewBox="0 0 8 10"
      fill="none"
      stroke={U.accent}
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M1 9.4V4.2a3 3 0 0 1 6 0v5.2" />
    </svg>
  );
}

export default function CloudImportCard({
  m,
  aiLabel,
}: {
  m: Record<string, string>;
  aiLabel?: string;
}) {
  const chipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.35rem 0.8rem",
    borderRadius: "2rem",
    background: U.canvas,
    border: `1px solid ${U.hairline}`,
    boxShadow: "0 1px 2px rgba(36,28,21,0.06)",
  };
  const chipLabelStyle: React.CSSProperties = {
    fontFamily: U.fontDisplay,
    fontWeight: 600,
    fontStyle: "normal",
    fontSize: "0.9375rem",
    color: U.ink,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  };

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
          <path d="M4.03 14A6.42 6.42 0 1 1 14.4 7.33h1.64a4.13 4.13 0 0 1 2.23 7.59" />
          <path d="M11 11.5v6.3M7.9 14.9l3.1 2.9 3.1-2.9" />
          <path d="M6.6 20.4h8.8" />
        </svg>
      }
      name={m.cloudName}
      aiLabel={aiLabel}
      label={`${m.importTitle} — ${m.importCount}. ${m.importSorted}: ${m.room1}, ${m.room2}, ${m.room3}.`}
    >
      <div aria-hidden="true" style={{ minHeight: "14rem" }}>
        {/* Zone 1 — job header row */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div
            style={{
              width: "2.25rem",
              height: "2.25rem",
              flexShrink: 0,
              background: U.surface,
              border: `1px solid ${U.hairline}`,
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CloudGlyph />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: U.fontBody,
                fontWeight: 700,
                fontSize: "0.9375rem",
                color: U.ink,
                lineHeight: 1.25,
              }}
            >
              {m.importTitle}
            </div>
            <div
              style={{
                fontFamily: U.fontBody,
                fontWeight: 500,
                fontSize: "0.8125rem",
                color: U.muted,
                fontVariantNumeric: "tabular-nums",
                marginTop: "0.125rem",
                lineHeight: 1.25,
              }}
            >
              {m.importCount}
            </div>
          </div>
          {/* Status chip: importing / done, cross-faded */}
          <div
            style={{
              marginLeft: "auto",
              alignSelf: "flex-start",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <span
              className="lv2u-cloud-imp"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.2rem 0.6rem",
                borderRadius: "2rem",
                background: "rgba(154,79,42,0.09)",
                border: "1px solid rgba(154,79,42,0.25)",
                minHeight: "1.125rem",
                opacity: 0,
              }}
            >
              <span
                className="lv2u-cloud-pulse"
                style={{
                  width: "0.375rem",
                  height: "0.375rem",
                  borderRadius: "50%",
                  background: U.accent,
                }}
              />
            </span>
            <span
              className="lv2u-cloud-done"
              style={{
                position: "absolute",
                inset: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.2rem 0.6rem",
                borderRadius: "2rem",
                background: "rgba(74,103,65,0.10)",
                border: "1px solid rgba(74,103,65,0.28)",
                opacity: 1,
              }}
            >
              <svg
                width="8"
                height="8"
                viewBox="0 0 10 10"
                fill="none"
                stroke={U.success}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1.5 5.5l2.4 2.4L8.5 2.6" />
              </svg>
            </span>
          </div>
        </div>

        {/* Zone 2 — developing thumbnail strip */}
        <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.875rem" }}>
          {PHOTO_GRADIENTS.map((g, i) => (
            <div
              key={i}
              style={{
                width: "1.75rem",
                height: "1.75rem",
                borderRadius: "0.3125rem",
                border: `1px solid ${U.hairline}`,
                overflow: "hidden",
                position: "relative",
                background: U.surface,
                flexShrink: 0,
              }}
            >
              <div
                className={`lv2u-cloud-ph${i + 1}`}
                style={{ position: "absolute", inset: 0, background: g, opacity: 1 }}
              />
            </div>
          ))}
          {/* Overflow tile — "and more" affordance, textless */}
          <div
            style={{
              width: "1.75rem",
              height: "1.75rem",
              borderRadius: "0.3125rem",
              border: `1px solid ${U.hairline}`,
              overflow: "hidden",
              position: "relative",
              background: U.surface,
              flexShrink: 0,
            }}
          >
            <div
              className="lv2u-cloud-ph6"
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(36,28,21,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 1,
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke={U.muted}
                strokeWidth={1.5}
                strokeLinecap="round"
              >
                <path d="M5 1v8M1 5h8" />
              </svg>
            </div>
          </div>
        </div>

        {/* Zone 3 — progress bar */}
        <div
          style={{
            marginTop: "0.875rem",
            width: "100%",
            height: "0.5rem",
            borderRadius: "999rem",
            background: U.surface,
            boxShadow: `inset 0 0 0 1px ${U.hairline}`,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            className="lv2u-cloud-fill"
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: "left",
              transform: "scaleX(1)",
              background: `linear-gradient(90deg, ${U.accent}, ${U.gold})`,
            }}
          />
          <div
            className="lv2u-cloud-dotwrap"
            style={{ position: "absolute", inset: 0, opacity: 0 }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                marginTop: "-0.1875rem",
                width: "0.375rem",
                height: "0.375rem",
                borderRadius: "50%",
                background: U.gold,
                boxShadow: "0 0 0.375rem rgba(212,175,55,0.5)",
              }}
            />
          </div>
          <div
            className="lv2u-cloud-sweep"
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "30%",
              background:
                "linear-gradient(90deg, transparent, rgba(252,250,245,0.25), transparent)",
              opacity: 0,
            }}
          />
        </div>

        {/* Zone 4 — divider */}
        <div style={{ height: "1px", background: U.hairline, margin: "1rem 0" }} />

        {/* Zone 5 — result zone */}
        <div style={{ minHeight: "4.5rem" }}>
          <div
            className="lv2u-cloud-sorted"
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              opacity: 1,
              transform: "translateY(0)",
            }}
          >
            <span
              style={{
                width: "1rem",
                height: "1rem",
                borderRadius: "50%",
                background: "rgba(74,103,65,0.12)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke={U.success}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path
                  className="lv2u-cloud-check"
                  d="M2 5.5l2.2 2.2L8 3.2"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={0}
                />
              </svg>
            </span>
            <span
              style={{
                fontFamily: U.fontBody,
                fontWeight: 700,
                fontSize: "0.875rem",
                color: U.success,
                lineHeight: 1.25,
              }}
            >
              {m.importSorted}
            </span>
          </div>
          <div
            style={{
              marginTop: "0.625rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            {[m.room1, m.room2, m.room3].map((room, i) => (
              <span key={i} className={`lv2u-cloud-chip${i + 1}`} style={chipStyle}>
                <DoorGlyph />
                <span style={chipLabelStyle}>{room}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .lv2u-cloud-fill { animation: lv2u-cloud-fill 10s ${EASE} infinite; }
        .lv2u-cloud-dotwrap { animation: lv2u-cloud-dot 10s ${EASE} infinite; }
        .lv2u-cloud-ph1 { animation: lv2u-cloud-ph1 10s ${EASE} infinite; }
        .lv2u-cloud-ph2 { animation: lv2u-cloud-ph2 10s ${EASE} infinite; }
        .lv2u-cloud-ph3 { animation: lv2u-cloud-ph3 10s ${EASE} infinite; }
        .lv2u-cloud-ph4 { animation: lv2u-cloud-ph4 10s ${EASE} infinite; }
        .lv2u-cloud-ph5 { animation: lv2u-cloud-ph5 10s ${EASE} infinite; }
        .lv2u-cloud-ph6 { animation: lv2u-cloud-ph6 10s ${EASE} infinite; }
        .lv2u-cloud-imp { animation: lv2u-cloud-imp 10s ${EASE} infinite; }
        .lv2u-cloud-pulse { animation: lv2u-cloud-pulse 10s linear infinite; }
        .lv2u-cloud-done { animation: lv2u-cloud-done 10s ${EASE} infinite; }
        .lv2u-cloud-sweep { animation: lv2u-cloud-sweep 10s ${EASE} infinite; }
        .lv2u-cloud-sorted { animation: lv2u-cloud-sorted 10s ${EASE} infinite; }
        .lv2u-cloud-check { animation: lv2u-cloud-check 10s ${EASE} infinite; }
        .lv2u-cloud-chip1 { animation: lv2u-cloud-chip1 10s ${EASE} infinite; }
        .lv2u-cloud-chip2 { animation: lv2u-cloud-chip2 10s ${EASE} infinite; }
        .lv2u-cloud-chip3 { animation: lv2u-cloud-chip3 10s ${EASE} infinite; }

        @keyframes lv2u-cloud-fill {
          0% { transform: scaleX(0); }
          5% { transform: scaleX(0.09); }
          27% { transform: scaleX(0.91); }
          32%, 95% { transform: scaleX(1); }
          100% { transform: scaleX(0); }
        }
        @keyframes lv2u-cloud-dot {
          0% { transform: translateX(0); opacity: 1; }
          5% { transform: translateX(calc((100% - 0.375rem) * 0.09)); opacity: 1; }
          27% { transform: translateX(calc((100% - 0.375rem) * 0.91)); opacity: 1; }
          32% { transform: translateX(calc(100% - 0.375rem)); opacity: 1; }
          36%, 100% { transform: translateX(calc(100% - 0.375rem)); opacity: 0; }
        }
        @keyframes lv2u-cloud-ph1 { 0%, 4% { opacity: 0; } 7.5%, 95% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes lv2u-cloud-ph2 { 0%, 9% { opacity: 0; } 12.5%, 95% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes lv2u-cloud-ph3 { 0%, 14% { opacity: 0; } 17.5%, 95% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes lv2u-cloud-ph4 { 0%, 19% { opacity: 0; } 22.5%, 95% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes lv2u-cloud-ph5 { 0%, 24% { opacity: 0; } 27.5%, 95% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes lv2u-cloud-ph6 { 0%, 29% { opacity: 0; } 32.5%, 95% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes lv2u-cloud-imp {
          0%, 32% { opacity: 1; }
          36%, 95% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes lv2u-cloud-pulse {
          0% { opacity: 1; }
          8% { opacity: 0.35; }
          16% { opacity: 1; }
          24% { opacity: 0.35; }
          32%, 100% { opacity: 1; }
        }
        @keyframes lv2u-cloud-done {
          0%, 32% { opacity: 0; }
          36%, 95% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes lv2u-cloud-sweep {
          0%, 32% { transform: translateX(-100%); opacity: 0; }
          34% { opacity: 0.6; }
          36%, 100% { transform: translateX(400%); opacity: 0; }
        }
        @keyframes lv2u-cloud-sorted {
          0%, 38% { opacity: 0; transform: translateY(0.25rem); }
          41.5%, 95% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(0.25rem); }
        }
        @keyframes lv2u-cloud-check {
          0%, 38% { stroke-dashoffset: 1; }
          41.5%, 100% { stroke-dashoffset: 0; }
        }
        @keyframes lv2u-cloud-chip1 {
          0%, 42% { opacity: 0; transform: scale(0.85); }
          45.2% { opacity: 1; transform: scale(1.04); }
          46%, 95% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.85); }
        }
        @keyframes lv2u-cloud-chip2 {
          0%, 45% { opacity: 0; transform: scale(0.85); }
          48.2% { opacity: 1; transform: scale(1.04); }
          49%, 95% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.85); }
        }
        @keyframes lv2u-cloud-chip3 {
          0%, 48% { opacity: 0; transform: scale(0.85); }
          51.2% { opacity: 1; transform: scale(1.04); }
          52%, 95% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.85); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lv2u-cloud-fill, .lv2u-cloud-dotwrap,
          .lv2u-cloud-ph1, .lv2u-cloud-ph2, .lv2u-cloud-ph3,
          .lv2u-cloud-ph4, .lv2u-cloud-ph5, .lv2u-cloud-ph6,
          .lv2u-cloud-imp, .lv2u-cloud-pulse, .lv2u-cloud-done,
          .lv2u-cloud-sweep, .lv2u-cloud-sorted, .lv2u-cloud-check,
          .lv2u-cloud-chip1, .lv2u-cloud-chip2, .lv2u-cloud-chip3 {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </UspCardShell>
  );
}
