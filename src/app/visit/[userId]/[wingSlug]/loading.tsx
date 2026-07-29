import { T } from "@/lib/theme";

/** Skeleton mirroring the room deep view: CREAM canvas, banner + title bar,
 *  then a grid of memory-card placeholders, so the load→loaded transition
 *  is seamless and canon-colored. */
export default function Loading() {
  const block = (extra?: React.CSSProperties): React.CSSProperties => ({
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
      <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
        {/* Breadcrumb placeholder */}
        <div style={block({ width: "12rem", height: "1rem", marginBottom: "1rem" })} />

        {/* Room header card: banner + title bar */}
        <div
          style={{
            background: T.color.cream,
            border: `1px solid ${T.color.hairline}`,
            borderRadius: "1rem",
            boxShadow: T.shadow[1],
            overflow: "hidden",
          }}
        >
          <div style={{ height: "4.5rem", background: T.color.hairline, opacity: 0.55 }} />
          <div style={{ padding: "1.5rem" }}>
            <div style={block({ width: "60%", height: "1.75rem", marginBottom: "0.75rem" })} />
            <div style={block({ width: "40%", height: "1rem" })} />
          </div>
        </div>

        {/* Memory gallery grid of placeholders */}
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
              <div style={{ aspectRatio: "16 / 10", background: T.color.hairline, opacity: 0.5 }} />
              <div style={{ padding: "0.875rem 1rem 1rem" }}>
                <div style={block({ width: "70%", height: "1rem", marginBottom: "0.5rem" })} />
                <div style={block({ width: "90%", height: "0.75rem" })} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
