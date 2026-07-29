"use client";

/**
 * Kep USP card — "The photo that gets framed".
 *
 * Wordless mini-story on the viewer's own phone: a family photo is sent to
 * Kep the porter over chat; Kep types, replies that it is saved to the
 * palace (m.kepSaved), and the moment the "Sorted & framed" chip (m.kepSorted)
 * stamps in, the photo's plain mat turns into a thin gold frame with a soft
 * gilded glow. One shared 10s CSS loop drives every beat via keyframe
 * percentages so nothing can drift.
 */

import Image from "next/image";
import UspCardShell, { U, hexAlpha, USP_BODY_MIN_HEIGHT } from "./UspCardShell";

/* A bellhop / porter cap — Kep is the palace's WhatsApp porter. */
function PorterCap({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 12.5A6.5 6 0 0 1 17.5 12.5" />
      <rect x="4" y="12.5" width="14" height="3.4" rx="1" />
      <path d="M11 6.6V8.6" />
      <circle cx="11" cy="5.4" r="1" />
    </svg>
  );
}

const KEP_ICON = <PorterCap size={22} color="currentColor" />;

export default function KepCard({
  m,
  aiLabel,
}: {
  m: Record<string, string>;
  aiLabel?: string;
}) {
  const bubbleShadow = `0 0.0625rem 0.125rem ${hexAlpha(U.ink, 0.06)}`;

  // Descriptive scene label so the role="img" region announces the wordless
  // story (photo sent → Kep saves & frames it) instead of just the brand name.
  const sceneLabel = m.kepScene
    ? m.kepScene
    : `${m.kepName}: ${m.kepRole} — ${m.kepSaved}, ${m.kepSorted}`;

  return (
    <UspCardShell icon={KEP_ICON} name={m.kepName} aiLabel={aiLabel} label={sceneLabel}>
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: USP_BODY_MIN_HEIGHT,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          background: U.surface,
          border: `1px solid ${U.hairline}`,
          borderRadius: "0.75rem",
          padding: "0.875rem",
        }}
      >
        {/* Faint afternoon light from the top right (static). */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(120% 80% at 85% 0%, rgba(212, 175, 55, 0.06), transparent 55%)",
          }}
        />

        {/* Row 1 — contact header (static; the room exists before the story). */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "0.625rem",
            paddingBottom: "0.625rem",
            borderBottom: `1px solid ${U.hairline}`,
          }}
        >
          <span
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "50%",
              background: U.ink,
              flexShrink: 0,
            }}
          >
            <PorterCap size={18} color={U.gold} />
            <span
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: "0.5rem",
                height: "0.5rem",
                borderRadius: "50%",
                background: U.success,
                boxShadow: `0 0 0 2px ${U.surface}`,
              }}
            />
          </span>
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span
              style={{
                fontFamily: U.fontBody,
                fontWeight: 700,
                fontSize: "0.9375rem",
                color: U.ink,
                lineHeight: 1.3,
              }}
            >
              {m.kepName}
            </span>
            <span
              style={{
                fontFamily: U.fontBody,
                fontWeight: 500,
                fontSize: "0.8125rem",
                color: U.muted,
                lineHeight: 1.3,
              }}
            >
              {m.kepRole}
            </span>
          </span>
        </div>

        {/* Row 2 — outgoing photo bubble (the viewer's own message). */}
        <div
          className="lv2u-kep-photo"
          style={{
            alignSelf: "flex-end",
            width: "62%",
            maxWidth: "11rem",
            display: "flex",
            flexDirection: "column",
            background: "rgba(74, 103, 65, 0.10)",
            border: "1px solid rgba(74, 103, 65, 0.22)",
            borderRadius: "0.875rem",
            borderBottomRightRadius: "0.25rem",
            padding: "0.3rem",
            boxShadow: bubbleShadow,
          }}
        >
          {/* Mat — settles as a thin gold frame with a soft gilded glow. */}
          <div
            className="lv2u-kep-mat"
            style={{
              padding: "0.1875rem",
              background: U.canvas,
              border: `1px solid ${U.gold}`,
              borderRadius: "0.5rem",
              boxShadow: "0 0 0.375rem rgba(212, 175, 55, 0.18)",
            }}
          >
            <Image
              src="/landing/demo-hands.jpg"
              alt=""
              width={480}
              height={319}
              style={{
                display: "block",
                width: "100%",
                height: "6.75rem",
                objectFit: "cover",
                objectPosition: "50% 62%",
                borderRadius: "0.375rem",
              }}
            />
          </div>
          {/* Tick cluster — delivered-to-read cross-fade. */}
          <div
            style={{
              display: "grid",
              justifyContent: "end",
              marginTop: "0.2rem",
              paddingRight: "0.125rem",
            }}
          >
            <svg
              className="lv2u-kep-tick1"
              style={{ gridArea: "1 / 1", opacity: 0 }}
              width="14"
              height="10"
              viewBox="0 0 14 10"
              fill="none"
              stroke={U.muted}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3.5 5.2 6 7.8 10.5 2.2" />
            </svg>
            <svg
              className="lv2u-kep-tick2"
              style={{ gridArea: "1 / 1", opacity: 1 }}
              width="14"
              height="10"
              viewBox="0 0 14 10"
              fill="none"
              stroke={U.success}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1.5 5.2 4 7.8 8.5 2.2" />
              <path d="M6.5 6.6 7.5 7.8 12 2.2" />
            </svg>
          </div>
        </div>

        {/* Row 3 — Kep's reply cluster. */}
        <div
          style={{
            alignSelf: "flex-start",
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            gap: "0.5rem",
            maxWidth: "85%",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "1.75rem",
              height: "1.75rem",
              borderRadius: "50%",
              background: U.ink,
              flexShrink: 0,
            }}
          >
            <PorterCap size={15} color={U.gold} />
          </span>

          {/* Bubble slot: reply in normal flow holds height; typing stacks on top. */}
          <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            <div
              className="lv2u-kep-reply"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                background: U.canvas,
                border: `1px solid ${U.hairline}`,
                borderRadius: "0.875rem",
                borderBottomLeftRadius: "0.25rem",
                padding: "0.625rem 0.75rem",
                boxShadow: bubbleShadow,
              }}
            >
              <span
                style={{
                  fontFamily: U.fontBody,
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: U.ink,
                  lineHeight: 1.45,
                }}
              >
                {m.kepSaved}
              </span>
              <span
                className="lv2u-kep-chip"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  alignSelf: "flex-start",
                  background: "rgba(74, 103, 65, 0.10)",
                  border: "1px solid rgba(74, 103, 65, 0.28)",
                  borderRadius: "2rem",
                  padding: "0.25rem 0.7rem",
                }}
              >
                <svg
                  className="lv2u-kep-frameicon"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  strokeWidth={1.3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                >
                  <rect x="2.6" y="2.6" width="8.8" height="8.8" rx="0.8" stroke={U.gold} />
                  <path d="M1 2.6V1h1.6M11.4 1H13v1.6M13 11.4V13h-1.6M2.6 13H1v-1.6" stroke={U.gold} />
                  <path d="M4.9 7.2 6.4 8.7 9.1 5.3" stroke={U.success} />
                </svg>
                <span
                  style={{
                    fontFamily: U.fontBody,
                    fontWeight: 700,
                    fontSize: "0.8125rem",
                    letterSpacing: "0.02em",
                    color: U.success,
                    lineHeight: 1.3,
                  }}
                >
                  {m.kepSorted}
                </span>
              </span>
            </div>

            {/* Typing bubble, stacked over the reply (never reflows). */}
            <div
              className="lv2u-kep-typing"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "3.5rem",
                display: "flex",
                gap: "0.3rem",
                background: U.canvas,
                border: `1px solid ${U.hairline}`,
                borderRadius: "0.875rem",
                borderBottomLeftRadius: "0.25rem",
                padding: "0.5rem 0.75rem",
                boxShadow: bubbleShadow,
                opacity: 0,
              }}
            >
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`lv2u-kep-dot${n}`}
                  style={{
                    width: "0.375rem",
                    height: "0.375rem",
                    borderRadius: "50%",
                    background: U.muted,
                    opacity: 0.35,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .lv2u-kep-photo {
          animation: lv2u-kep-photo 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .lv2u-kep-mat {
          animation: lv2u-kep-mat 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .lv2u-kep-tick1 {
          animation: lv2u-kep-tick1 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .lv2u-kep-tick2 {
          animation: lv2u-kep-tick2 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .lv2u-kep-typing {
          animation: lv2u-kep-typing 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .lv2u-kep-dot1 {
          animation: lv2u-kep-dot1 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .lv2u-kep-dot2 {
          animation: lv2u-kep-dot2 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .lv2u-kep-dot3 {
          animation: lv2u-kep-dot3 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .lv2u-kep-reply {
          animation: lv2u-kep-reply 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .lv2u-kep-chip {
          animation: lv2u-kep-chip 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .lv2u-kep-frameicon {
          animation: lv2u-kep-frameicon 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        @keyframes lv2u-kep-photo {
          0%, 5% { opacity: 0; transform: translateY(0.5rem); }
          10%, 95% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(0); }
        }
        @keyframes lv2u-kep-mat {
          0%, 41% { border-color: ${U.hairline}; box-shadow: 0 0 0 rgba(212, 175, 55, 0); }
          44% { border-color: ${U.gold}; box-shadow: 0 0 0.75rem rgba(212, 175, 55, 0.35); }
          47%, 100% { border-color: ${U.gold}; box-shadow: 0 0 0.375rem rgba(212, 175, 55, 0.18); }
        }
        @keyframes lv2u-kep-tick1 {
          0%, 5% { opacity: 0; }
          10%, 16% { opacity: 1; }
          18%, 100% { opacity: 0; }
        }
        @keyframes lv2u-kep-tick2 {
          0%, 16% { opacity: 0; }
          18%, 95% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes lv2u-kep-typing {
          0%, 21% { opacity: 0; }
          23.5%, 33% { opacity: 1; }
          35.5%, 100% { opacity: 0; }
        }
        @keyframes lv2u-kep-dot1 {
          0%, 21% { opacity: 0.35; }
          24% { opacity: 1; }
          27% { opacity: 0.35; }
          30% { opacity: 1; }
          33%, 100% { opacity: 0.35; }
        }
        @keyframes lv2u-kep-dot2 {
          0%, 22.5% { opacity: 0.35; }
          25.5% { opacity: 1; }
          28.5% { opacity: 0.35; }
          31.5% { opacity: 1; }
          34.5%, 100% { opacity: 0.35; }
        }
        @keyframes lv2u-kep-dot3 {
          0%, 24% { opacity: 0.35; }
          27% { opacity: 1; }
          30% { opacity: 0.35; }
          33% { opacity: 1; }
          36%, 100% { opacity: 0.35; }
        }
        @keyframes lv2u-kep-reply {
          0%, 33% { opacity: 0; transform: translateY(0.375rem) scale(0.985); }
          37%, 95% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(0) scale(1); }
        }
        @keyframes lv2u-kep-chip {
          0%, 41% { opacity: 0; transform: scale(0.9); }
          45%, 95% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1); }
        }
        @keyframes lv2u-kep-frameicon {
          0%, 41% { transform: rotate(-4deg); }
          45%, 100% { transform: rotate(0deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lv2u-kep-photo,
          .lv2u-kep-mat,
          .lv2u-kep-tick1,
          .lv2u-kep-tick2,
          .lv2u-kep-typing,
          .lv2u-kep-dot1,
          .lv2u-kep-dot2,
          .lv2u-kep-dot3,
          .lv2u-kep-reply,
          .lv2u-kep-chip,
          .lv2u-kep-frameicon {
            animation: none !important;
            transition: none !important;
          }
          .lv2u-kep-typing {
            display: none;
          }
        }
      `}</style>
    </UspCardShell>
  );
}
