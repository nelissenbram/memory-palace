import type { CSSProperties } from "react";
import { CREAM, HAIRLINE, TRAY } from "@/lib/libraryTokens";

/**
 * Skeleton mirroring the final Explore layout (same maxWidth, flat cream,
 * title + search + pill rail + card grid) so the force-dynamic page doesn't
 * double-layout on every visit. Static — no animation.
 */
export default function Loading() {
  const bone: CSSProperties = {
    background: TRAY,
    borderRadius: "0.5rem",
  };
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: CREAM,
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div style={{ maxWidth: "60rem", margin: "0 auto", padding: "0 1rem" }}>
        {/* Title + subtitle */}
        <div style={{ padding: "1.5rem 0 1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ ...bone, width: "14rem", height: "2rem" }} />
          <div style={{ ...bone, width: "20rem", maxWidth: "90%", height: "1rem" }} />
        </div>
        {/* Search bar */}
        <div
          style={{
            maxWidth: "32rem",
            margin: "0 auto 1.5rem",
            height: "3rem",
            borderRadius: "0.875rem",
            background: CREAM,
            border: `0.0625rem solid ${HAIRLINE}`,
          }}
        />
        {/* Pill rail */}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1.75rem" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ ...bone, width: "6rem", height: "2.75rem", borderRadius: "2rem" }} />
          ))}
        </div>
        {/* Card grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))", gap: "0.875rem" }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                height: "9rem",
                borderRadius: "1rem",
                background: CREAM,
                border: `0.0625rem solid ${HAIRLINE}`,
                boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
