import { T } from "@/lib/theme";

export default function Loading() {
  const shimmer = `linear-gradient(90deg, ${T.color.sandstone}20 25%, ${T.color.sandstone}40 50%, ${T.color.sandstone}20 75%)`;
  const pulse = "pulse 1.8s ease-in-out infinite";

  return (
    <>
      <style>{`@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.7; } }`}</style>
      <div style={{
        minHeight: "100dvh",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
        paddingTop: "max(3.5rem, calc(3.5rem + env(safe-area-inset-top, 0px)))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0 1rem" }}>
          {/* Back button skeleton */}
          <div style={{ padding: "1.5rem 0 1rem" }}>
            <div style={{ width: "8rem", height: "1.5rem", borderRadius: "0.375rem", background: shimmer, animation: pulse }} />
          </div>

          {/* Profile card skeleton — matches TuscanCard: glass bg, gold top seam, warm-ink shadow */}
          <div style={{
            padding: "1.5rem", borderRadius: "1rem",
            background: `${T.color.ivory}CC`,
            borderTop: `2px solid ${T.color.gold}`,
            border: `1px solid ${T.color.lineFaint}`,
            boxShadow: "0 2px 12px rgba(64,59,54,0.06)",
          }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div style={{ width: "4.5rem", height: "4.5rem", borderRadius: "50%", background: shimmer, animation: pulse, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ width: "50%", height: "1.5rem", borderRadius: "0.375rem", background: shimmer, animation: pulse, marginBottom: "0.5rem" }} />
                <div style={{ width: "30%", height: "1rem", borderRadius: "0.375rem", background: shimmer, animation: pulse, marginBottom: "0.75rem" }} />
                <div style={{ width: "7rem", height: "2rem", borderRadius: "1rem", background: shimmer, animation: pulse }} />
              </div>
            </div>
          </div>

          {/* Stats bar skeleton */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", padding: "1.25rem 0" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ width: "4rem", height: "2.5rem", borderRadius: "0.5rem", background: shimmer, animation: pulse }} />
            ))}
          </div>

          {/* Wings section skeleton */}
          <div style={{ marginTop: "1.5rem" }}>
            <div style={{ width: "10rem", height: "1.25rem", borderRadius: "0.375rem", background: shimmer, animation: pulse, marginBottom: "1rem" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))", gap: "0.875rem" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  borderRadius: "1rem",
                  overflow: "hidden",
                  background: `${T.color.ivory}CC`,
                  border: `1px solid ${T.color.lineFaint}`,
                  boxShadow: "0 1px 4px rgba(64,59,54,0.04)",
                }}>
                  {/* Arch-header block */}
                  <div style={{
                    height: "3.5rem",
                    background: `linear-gradient(135deg, ${T.color.gold}20, ${T.color.terracotta}10)`,
                    animation: pulse,
                  }} />
                  <div style={{ padding: "1.125rem" }}>
                    <div style={{ width: "60%", height: "1.125rem", borderRadius: "0.375rem", background: shimmer, animation: pulse, marginBottom: "0.75rem" }} />
                    <div style={{ width: "40%", height: "0.75rem", borderRadius: "0.375rem", background: shimmer, animation: pulse }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
