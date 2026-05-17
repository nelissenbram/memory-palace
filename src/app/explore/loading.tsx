import { T } from "@/lib/theme";

export default function Loading() {
  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "2rem 1rem", minHeight: "100vh", background: T.color.linen }}>
      <div style={{ width: "12rem", height: "2rem", borderRadius: "0.375rem", background: T.color.sandstone, opacity: 0.3, marginBottom: "1.5rem" }} />
      <div style={{ width: "100%", height: "3rem", borderRadius: "0.75rem", background: T.color.cream, marginBottom: "2rem" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(16rem, 1fr))", gap: "0.75rem" }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: "8rem", borderRadius: "1rem", background: T.color.cream, opacity: 0.5 }} />
        ))}
      </div>
    </div>
  );
}
