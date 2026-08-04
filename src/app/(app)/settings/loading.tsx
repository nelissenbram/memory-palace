import type { CSSProperties } from "react";
import { HAIRLINE, TRAY, SHADOW, TOP_HIGHLIGHT } from "@/lib/libraryTokens";

/**
 * Content-slot skeleton for /settings/* sub-pages. The settings layout
 * (sidebar on desktop, tab rail on mobile) is a client layout that paints
 * immediately — this fills its content <section> while a sub-page segment
 * loads: a page-header bone plus two card bones, mirroring the
 * SettingsPageHeader + card anatomy every sub-page uses. Shimmer is gated
 * behind prefers-reduced-motion: no-preference (canon: Explore skeleton).
 */
export default function Loading() {
  const bone: CSSProperties = {
    background: TRAY,
    borderRadius: "0.5rem",
  };
  const card: CSSProperties = {
    background: "#FFFDFA",
    borderRadius: "1rem",
    border: `0.0625rem solid ${HAIRLINE}`,
    boxShadow: `${SHADOW[1]}, ${TOP_HIGHLIGHT}`,
    padding: "1.25rem",
    marginBottom: "1.25rem",
  };
  return (
    <div className="mp-set-skel">
      {/* Page header — title + one-line subtitle */}
      <div className="mp-set-skel-bone" style={{ ...bone, width: "10rem", maxWidth: "55%", height: "1.5rem" }} />
      <div className="mp-set-skel-bone" style={{ ...bone, width: "16rem", maxWidth: "85%", height: "0.875rem", margin: "0.625rem 0 1.5rem" }} />

      {/* Two card bones with field rows */}
      {[1, 2].map((c) => (
        <div key={c} style={card}>
          {[1, 2, 3].map((r) => (
            <div key={r} style={{ display: "flex", alignItems: "center", gap: "0.875rem", minHeight: "2.75rem" }}>
              <div className="mp-set-skel-bone" style={{ ...bone, width: "1.125rem", height: "1.125rem", borderRadius: "0.375rem", flexShrink: 0 }} />
              <div className="mp-set-skel-bone" style={{ ...bone, width: `${8 + r}rem`, maxWidth: "60%", height: "0.875rem" }} />
            </div>
          ))}
        </div>
      ))}

      {/* Shimmer — motion only for users who allow it */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes mpSetSkelShimmer {
            0% { opacity: 1; }
            50% { opacity: 0.55; }
            100% { opacity: 1; }
          }
          .mp-set-skel .mp-set-skel-bone { animation: mpSetSkelShimmer 1.4s ease-in-out infinite; }
        }
      `}</style>
    </div>
  );
}
