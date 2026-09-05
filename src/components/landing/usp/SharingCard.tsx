"use client";

/**
 * Sharing USP card — "Who may enter this room?"
 *
 * Wordless mini-story on a believable per-room settings row: the Sunday
 * Lunches room starts private (padlock, one avatar). A fingertip halo taps
 * "Family" — the chip warms, a green check draws in, two family avatars
 * arrive. A second calm tap on "Friends" brings a third guest and flips the
 * padlock into a two-people glyph; the room's border warms to gold now that
 * people are in it. "Just me" never moves: private stays a real choice.
 * One shared 10s CSS loop drives every beat via keyframe percentages so
 * nothing can drift.
 */

import UspCardShell, { U } from "./UspCardShell";

const SHARING_ICON = (
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
    <path d="M3 16.75V8.5a3.25 3.25 0 0 1 6.5 0v8.25Z" />
    <path d="M11.2 8.4 15.7 5.8M11.3 11h4.2M11.2 13.6l4.5 2.6" />
    <path d="M19.3 4.8a1.9 1.9 0 1 0-3.8 0a1.9 1.9 0 1 0 3.8 0ZM19.3 11a1.9 1.9 0 1 0-3.8 0a1.9 1.9 0 1 0 3.8 0ZM19.3 17.2a1.9 1.9 0 1 0-3.8 0a1.9 1.9 0 1 0 3.8 0Z" />
  </svg>
);

/** Person silhouette used inside the avatar discs (dots alone read as beads). */
function Silhouette({ fill }: { fill: string }) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 20 20"
      fill={fill}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <circle cx="10" cy="7.4" r="3" />
      <path d="M3.4 18.8c0-3.7 3-6 6.6-6s6.6 2.3 6.6 6Z" />
    </svg>
  );
}

const photoRestShadow = `inset 0 0 0 0.1875rem ${U.canvas}, 0 0 0 1px ${U.hairline}, 0 1px 2px rgba(36, 28, 21, 0.12)`;

export default function SharingCard({
  m,
  aiLabel,
}: {
  m: Record<string, string>;
  aiLabel?: string;
}) {
  const avatarBase: React.CSSProperties = {
    boxSizing: "border-box",
    width: "1.25rem",
    height: "1.25rem",
    borderRadius: "50%",
    border: `2px solid ${U.canvas}`,
    overflow: "hidden",
    flexShrink: 0,
  };

  const chipBase: React.CSSProperties = {
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4375rem",
    height: "2.125rem",
    padding: "0 0.875rem 0 0.5rem",
    borderRadius: "2rem",
    fontFamily: U.fontBody,
    fontSize: "0.875rem",
    fontWeight: 600,
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    background: U.canvas,
    border: `1px solid ${U.hairline}`,
    color: U.muted,
  };

  const seatBase: React.CSSProperties = {
    position: "relative",
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "1rem",
    height: "1rem",
    borderRadius: "50%",
    flexShrink: 0,
  };

  const haloBase: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "1.75rem",
    height: "1.75rem",
    margin: "-0.875rem 0 0 -0.875rem",
    borderRadius: "50%",
    border: `1.5px solid ${U.accent}`,
    opacity: 0,
    transform: "scale(0.4)",
  };

  const checkSvg = (cls: string) => (
    <svg
      className={cls}
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      stroke={U.canvas}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block", width: "0.5rem", height: "0.5rem" }}
    >
      <polyline points="1.5,4.2 3.2,6 6.5,2" pathLength={8} strokeDasharray={8} />
    </svg>
  );

  return (
    <UspCardShell icon={SHARING_ICON} name={m.sharingName} role={m.sharingRole} aiLabel={aiLabel} label={m.sharingName}>
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "0.875rem",
          minHeight: "14rem",
        }}
      >
        {/* Row 1 — the room being shared (per-room settings row). */}
        <div
          className="mp-usp-share-room"
          style={{
            boxSizing: "border-box",
            background: U.surface,
            border: `1px solid ${U.hairline}`,
            borderRadius: "0.75rem",
            padding: "0.75rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            minHeight: "4.5rem",
          }}
        >
          {/* Photo thumb — CSS-painted print of a lunch table, matte border. */}
          <div
            className="mp-usp-share-photo"
            style={{
              position: "relative",
              width: "3rem",
              height: "3rem",
              borderRadius: "0.5rem",
              flexShrink: 0,
              transform: "rotate(-2deg) translateZ(0)",
              background: `linear-gradient(transparent 80%, rgba(64, 59, 54, 0.25)), linear-gradient(160deg, rgba(212, 175, 55, 0.35), rgba(154, 79, 42, 0.30)), ${U.surface}`,
              boxShadow: photoRestShadow,
            }}
          />

          {/* Title block — room name + who's inside. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.375rem",
              minWidth: 0,
              flex: 1,
            }}
          >
            <span
              style={{
                fontFamily: U.fontDisplay,
                fontSize: "1.1875rem",
                fontWeight: 600,
                color: U.ink,
                lineHeight: 1.15,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {m.room3}
            </span>
            <span style={{ display: "flex" }}>
              <span
                style={{
                  ...avatarBase,
                  background: U.surface,
                  boxShadow: `inset 0 0 0 1px ${U.hairline}`,
                }}
              >
                <Silhouette fill={U.accent} />
              </span>
              <span
                className="mp-usp-share-av1"
                style={{
                  ...avatarBase,
                  marginLeft: "-0.375rem",
                  background: "rgba(154, 79, 42, 0.15)",
                  opacity: 0,
                  transform: "translateX(0.25rem)",
                }}
              >
                <Silhouette fill={U.accent} />
              </span>
              <span
                className="mp-usp-share-av2"
                style={{
                  ...avatarBase,
                  marginLeft: "-0.375rem",
                  background: "rgba(154, 79, 42, 0.15)",
                  opacity: 0,
                  transform: "translateX(0.25rem)",
                }}
              >
                <Silhouette fill={U.accent} />
              </span>
              <span
                className="mp-usp-share-av3"
                style={{
                  ...avatarBase,
                  marginLeft: "-0.375rem",
                  background: "rgba(212, 175, 55, 0.22)",
                  opacity: 0,
                  transform: "translateX(0.25rem)",
                }}
              >
                <Silhouette fill="rgba(36, 28, 21, 0.62)" />
              </span>
            </span>
          </div>

          {/* Status — padlock crossfades into a two-people glyph. */}
          <span
            style={{
              position: "relative",
              width: "1rem",
              height: "1rem",
              marginLeft: "auto",
              flexShrink: 0,
            }}
          >
            <svg
              className="mp-usp-share-lock"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke={U.muted}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, width: "1rem", height: "1rem", opacity: 1 }}
            >
              <rect x="3.2" y="7.2" width="9.6" height="6" rx="1.3" />
              <path d="M5.4 7.2V5.2a2.6 2.6 0 0 1 5.2 0v2" />
            </svg>
            <svg
              className="mp-usp-share-people"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke={U.accent}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                width: "1rem",
                height: "1rem",
                opacity: 0,
                transform: "translateY(0.125rem)",
              }}
            >
              <circle cx="5.6" cy="5.1" r="2.1" />
              <circle cx="11" cy="5.9" r="1.7" />
              <path d="M2.1 13a3.5 3.5 0 0 1 7 0" />
              <path d="M9.1 13a3 3 0 0 1 5.2-2" />
            </svg>
          </span>
        </div>

        {/* Row 2 — audience chips. */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {/* Chip A — Family. */}
          <span className="mp-usp-share-chipA" style={chipBase}>
            <span
              className="mp-usp-share-discA"
              style={{
                ...seatBase,
                border: "0.09375rem solid rgba(113, 106, 94, 0.45)",
                background: "rgba(74, 103, 65, 0)",
              }}
            >
              {checkSvg("mp-usp-share-checkA")}
              <span className="mp-usp-share-haloA" style={haloBase} />
            </span>
            {m.shareFamily}
          </span>

          {/* Chip B — Friends. */}
          <span className="mp-usp-share-chipB" style={chipBase}>
            <span
              className="mp-usp-share-discB"
              style={{
                ...seatBase,
                border: "0.09375rem solid rgba(113, 106, 94, 0.45)",
                background: "rgba(74, 103, 65, 0)",
              }}
            >
              {checkSvg("mp-usp-share-checkB")}
              <span className="mp-usp-share-haloB" style={haloBase} />
            </span>
            {m.shareFriends}
          </span>

          {/* Chip C — Just me. Deliberately still: private is a real choice. */}
          <span style={chipBase}>
            <span style={seatBase}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke={U.muted}
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ display: "block", width: "0.75rem", height: "0.75rem" }}
              >
                <rect x="2.4" y="5.4" width="7.2" height="4.6" rx="1" />
                <path d="M4 5.4V4a2 2 0 0 1 4 0v1.4" />
              </svg>
            </span>
            {m.sharePrivate}
          </span>
        </div>
      </div>

      <style>{`
        .mp-usp-share-photo::after {
          content: "";
          position: absolute;
          top: 0.1875rem;
          left: 0.1875rem;
          width: 0.875rem;
          height: 0.875rem;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 25%, rgba(212, 175, 55, 0.5), transparent 60%);
        }

        .mp-usp-share-room {
          animation: mp-usp-share-room 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-photo {
          animation: mp-usp-share-photo 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-av1 {
          animation: mp-usp-share-av1 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-av2 {
          animation: mp-usp-share-av2 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-av3 {
          animation: mp-usp-share-av3 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-lock {
          animation: mp-usp-share-lock 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-people {
          animation: mp-usp-share-people 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-chipA {
          animation: mp-usp-share-chipA 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-discA {
          animation: mp-usp-share-discA 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-checkA {
          animation: mp-usp-share-checkA 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-haloA {
          animation: mp-usp-share-haloA 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-chipB {
          animation: mp-usp-share-chipB 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-discB {
          animation: mp-usp-share-discB 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-checkB {
          animation: mp-usp-share-checkB 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
        .mp-usp-share-haloB {
          animation: mp-usp-share-haloB 10s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        @keyframes mp-usp-share-room {
          0%, 42% { border-color: ${U.hairline}; }
          49%, 94% { border-color: rgba(212, 175, 55, 0.55); }
          100% { border-color: ${U.hairline}; }
        }
        @keyframes mp-usp-share-photo {
          0%, 42% { box-shadow: ${photoRestShadow}, 0 0 0.75rem rgba(212, 175, 55, 0); }
          49%, 94% { box-shadow: ${photoRestShadow}, 0 0 0.75rem rgba(212, 175, 55, 0.35); }
          100% { box-shadow: ${photoRestShadow}, 0 0 0.75rem rgba(212, 175, 55, 0); }
        }
        @keyframes mp-usp-share-av1 {
          0%, 18% { opacity: 0; transform: translateX(0.25rem); }
          22%, 94% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(0); }
        }
        @keyframes mp-usp-share-av2 {
          0%, 19.5% { opacity: 0; transform: translateX(0.25rem); }
          23.5%, 94% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(0); }
        }
        @keyframes mp-usp-share-av3 {
          0%, 34% { opacity: 0; transform: translateX(0.25rem); }
          38%, 94% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(0); }
        }
        @keyframes mp-usp-share-lock {
          0%, 34% { opacity: 1; }
          40%, 94% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes mp-usp-share-people {
          0%, 34% { opacity: 0; transform: translateY(0.125rem); }
          40%, 94% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(0); }
        }
        @keyframes mp-usp-share-haloA {
          0%, 14% { opacity: 0; transform: scale(0.4); }
          15% { opacity: 0.35; transform: scale(0.7); }
          18.5% { opacity: 0; transform: scale(1.3); }
          19%, 100% { opacity: 0; transform: scale(0.4); }
        }
        @keyframes mp-usp-share-chipA {
          0%, 15% { background: ${U.canvas}; border-color: ${U.hairline}; color: ${U.muted}; }
          0%, 14% { transform: scale(1); }
          15.5% { transform: scale(0.97); }
          17%, 100% { transform: scale(1); }
          19%, 94% { background: rgba(154, 79, 42, 0.10); border-color: rgba(154, 79, 42, 0.40); color: ${U.ink}; }
          100% { background: ${U.canvas}; border-color: ${U.hairline}; color: ${U.muted}; }
        }
        @keyframes mp-usp-share-discA {
          0%, 15% { background: rgba(74, 103, 65, 0); border-color: rgba(113, 106, 94, 0.45); transform: scale(1); }
          15.5% { background: ${U.success}; border-color: rgba(113, 106, 94, 0); transform: scale(0.6); }
          18% { transform: scale(1.08); }
          20%, 94% { background: ${U.success}; border-color: rgba(113, 106, 94, 0); transform: scale(1); }
          100% { background: rgba(74, 103, 65, 0); border-color: rgba(113, 106, 94, 0.45); transform: scale(1); }
        }
        @keyframes mp-usp-share-checkA {
          0%, 15% { stroke-dashoffset: 8; opacity: 1; }
          20%, 94% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes mp-usp-share-haloB {
          0%, 30% { opacity: 0; transform: scale(0.4); }
          31% { opacity: 0.35; transform: scale(0.7); }
          34.5% { opacity: 0; transform: scale(1.3); }
          35%, 100% { opacity: 0; transform: scale(0.4); }
        }
        @keyframes mp-usp-share-chipB {
          0%, 31% { background: ${U.canvas}; border-color: ${U.hairline}; color: ${U.muted}; }
          0%, 30% { transform: scale(1); }
          31.5% { transform: scale(0.97); }
          33%, 100% { transform: scale(1); }
          35%, 94% { background: rgba(154, 79, 42, 0.10); border-color: rgba(154, 79, 42, 0.40); color: ${U.ink}; }
          100% { background: ${U.canvas}; border-color: ${U.hairline}; color: ${U.muted}; }
        }
        @keyframes mp-usp-share-discB {
          0%, 31% { background: rgba(74, 103, 65, 0); border-color: rgba(113, 106, 94, 0.45); transform: scale(1); }
          31.5% { background: ${U.success}; border-color: rgba(113, 106, 94, 0); transform: scale(0.6); }
          34% { transform: scale(1.08); }
          36%, 94% { background: ${U.success}; border-color: rgba(113, 106, 94, 0); transform: scale(1); }
          100% { background: rgba(74, 103, 65, 0); border-color: rgba(113, 106, 94, 0.45); transform: scale(1); }
        }
        @keyframes mp-usp-share-checkB {
          0%, 31% { stroke-dashoffset: 8; opacity: 1; }
          36%, 94% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .mp-usp-share-room,
          .mp-usp-share-photo,
          .mp-usp-share-av1,
          .mp-usp-share-av2,
          .mp-usp-share-av3,
          .mp-usp-share-lock,
          .mp-usp-share-people,
          .mp-usp-share-chipA,
          .mp-usp-share-discA,
          .mp-usp-share-checkA,
          .mp-usp-share-haloA,
          .mp-usp-share-chipB,
          .mp-usp-share-discB,
          .mp-usp-share-checkB,
          .mp-usp-share-haloB {
            animation: none !important;
            transition: none !important;
          }
          /* Pin the complete story state: room shared with Family + Friends. */
          .mp-usp-share-room {
            border-color: rgba(212, 175, 55, 0.55) !important;
          }
          .mp-usp-share-photo {
            box-shadow: ${photoRestShadow}, 0 0 0.75rem rgba(212, 175, 55, 0.35) !important;
          }
          .mp-usp-share-av1,
          .mp-usp-share-av2,
          .mp-usp-share-av3 {
            opacity: 1 !important;
            transform: none !important;
          }
          .mp-usp-share-lock {
            opacity: 0 !important;
          }
          .mp-usp-share-people {
            opacity: 1 !important;
            transform: none !important;
          }
          .mp-usp-share-chipA,
          .mp-usp-share-chipB {
            background: rgba(154, 79, 42, 0.10) !important;
            border-color: rgba(154, 79, 42, 0.40) !important;
            color: ${U.ink} !important;
          }
          .mp-usp-share-discA,
          .mp-usp-share-discB {
            background: ${U.success} !important;
            border-color: transparent !important;
          }
          .mp-usp-share-checkA,
          .mp-usp-share-checkB {
            stroke-dashoffset: 0 !important;
          }
        }
      `}</style>
    </UspCardShell>
  );
}
