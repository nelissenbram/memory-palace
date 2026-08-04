import { T } from "@/lib/theme";

/** Skeleton mirroring the palace overview: CREAM canvas, back-link bone,
 *  owner header card (avatar + name + action chip), then a grid of wing-card
 *  placeholders, so the load→loaded transition is seamless and canon-colored.
 *  Shimmer is opt-in only (prefers-reduced-motion: no-preference). */
export default function Loading() {
  const bone = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: T.color.hairline,
    opacity: 0.4,
    borderRadius: "0.375rem",
    ...extra,
  });

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: T.color.cream,
        padding:
          "max(2rem, calc(2rem + env(safe-area-inset-top, 0px))) 1rem calc(4rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .visit-skel { animation: visit-skel-pulse 1.8s ease-in-out infinite; }
          @keyframes visit-skel-pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.65; }
          }
        }
      `}</style>
      <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
        {/* Back-link / breadcrumb placeholder */}
        <div className="visit-skel" style={bone({ width: "10rem", height: "1rem", marginBottom: "1rem" })} />

        {/* Owner header card: avatar + name lines + action chip */}
        <div
          style={{
            background: T.color.cream,
            border: `1px solid ${T.color.hairline}`,
            borderRadius: "1rem",
            boxShadow: T.shadow[1],
            padding: "1.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div
              className="visit-skel"
              style={bone({ width: "4rem", height: "4rem", borderRadius: "50%", flexShrink: 0 })}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="visit-skel" style={bone({ width: "50%", height: "1.5rem", marginBottom: "0.5rem" })} />
              <div className="visit-skel" style={bone({ width: "30%", height: "1rem" })} />
            </div>
            <div className="visit-skel" style={bone({ width: "6rem", height: "2.25rem", borderRadius: "2rem" })} />
          </div>
        </div>

        {/* Wing-card grid of placeholders */}
        <div
          style={{
            marginTop: "2rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))",
            gap: "0.875rem",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: T.color.cream,
                border: `1px solid ${T.color.hairline}`,
                borderRadius: "1rem",
                boxShadow: T.shadow[1],
                overflow: "hidden",
              }}
            >
              <div
                className="visit-skel"
                style={{ height: "3.5rem", background: T.color.hairline, opacity: 0.5 }}
              />
              <div style={{ padding: "1rem 1.125rem 1.125rem" }}>
                <div className="visit-skel" style={bone({ width: "65%", height: "1.125rem", marginBottom: "0.625rem" })} />
                <div className="visit-skel" style={bone({ width: "40%", height: "0.75rem" })} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
