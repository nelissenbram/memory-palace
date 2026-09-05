import type { CSSProperties } from "react";
import { CREAM, HAIRLINE, TRAY, SHADOW, TOP_HIGHLIGHT } from "@/lib/libraryTokens";

/**
 * Skeleton mirroring MeClient's 5-band anatomy (identity row + name + two
 * actions + doors card) so the force-dynamic /me page paints instantly on tap
 * instead of leaving the Me tab feeling dead while 4 server fetches settle.
 * Shimmer is gated behind prefers-reduced-motion: no-preference; reduced
 * motion gets calm static bones (same canon as the Explore skeleton).
 */
export default function Loading() {
  const bone: CSSProperties = {
    background: TRAY,
    borderRadius: "0.5rem",
  };
  return (
    <div
      className="mp-me-skel"
      style={{
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
        background: CREAM,
        zIndex: 1,
      }}
    >
      <div style={{ maxWidth: "38rem", margin: "0 auto", padding: "1.5rem 1.25rem 2rem" }}>
        {/* ── BAND 1: identity row — portrait + three stewardship stats ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <div className="mp-me-skel-bone" style={{ ...bone, width: "4.5rem", height: "4.5rem", borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", justifyContent: "space-around", gap: "0.5rem" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  minHeight: "2.75rem", flex: 1, justifyContent: "center",
                  gap: "0.375rem", padding: "0.25rem 0.375rem",
                }}
              >
                <div className="mp-me-skel-bone" style={{ ...bone, width: "2rem", height: "1.375rem" }} />
                <div className="mp-me-skel-bone" style={{ ...bone, width: "3.25rem", height: "0.75rem" }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: "0.0625rem", background: HAIRLINE, margin: "1.25rem 0" }} aria-hidden="true" />

        {/* ── BAND 2: name + handle ── */}
        <div className="mp-me-skel-bone" style={{ ...bone, width: "11rem", maxWidth: "60%", height: "1.5rem" }} />
        <div className="mp-me-skel-bone" style={{ ...bone, width: "6.5rem", height: "0.875rem", marginTop: "0.5rem" }} />

        {/* ── BAND 3: two action pills ── */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
          <div className="mp-me-skel-bone" style={{ ...bone, flex: 1, height: "2.75rem", borderRadius: "2rem" }} />
          <div className="mp-me-skel-bone" style={{ ...bone, flex: 1, height: "2.75rem", borderRadius: "2rem" }} />
        </div>

        {/* ── BAND 4: doors card ── */}
        <div style={{ marginTop: "1.75rem" }}>
          {/* Lane header bone */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
            <div className="mp-me-skel-bone" style={{ ...bone, width: "0.6rem", height: "0.6rem", borderRadius: "50%", flexShrink: 0 }} />
            <div className="mp-me-skel-bone" style={{ ...bone, width: "5rem", height: "0.75rem" }} />
          </div>
          <div
            style={{
              background: "#FFFDFA",
              borderRadius: "1rem",
              border: `0.0625rem solid ${HAIRLINE}`,
              boxShadow: `${SHADOW[1]}, ${TOP_HIGHLIGHT}`,
              overflow: "hidden",
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  minHeight: "3rem", padding: "0.75rem 1.125rem",
                  borderBottom: i < 6 ? `0.0625rem solid ${HAIRLINE}` : "none",
                }}
              >
                <div className="mp-me-skel-bone" style={{ ...bone, width: "1.125rem", height: "1.125rem", borderRadius: "0.375rem", flexShrink: 0 }} />
                <div className="mp-me-skel-bone" style={{ ...bone, width: `${7 + (i % 3)}rem`, height: "0.875rem" }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shimmer — motion only for users who allow it */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes mpMeSkelShimmer {
            0% { opacity: 1; }
            50% { opacity: 0.55; }
            100% { opacity: 1; }
          }
          .mp-me-skel .mp-me-skel-bone { animation: mpMeSkelShimmer 1.4s ease-in-out infinite; }
        }
      `}</style>
    </div>
  );
}
