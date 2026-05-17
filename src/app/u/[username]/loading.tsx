import { T } from "@/lib/theme";

export default function Loading() {
  return (
    <div style={{ maxWidth: "42rem", margin: "0 auto", padding: "2rem 1rem", minHeight: "100vh", background: T.color.linen }}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", padding: "1.5rem", borderRadius: "1rem", background: T.color.cream }}>
        <div style={{ width: "4rem", height: "4rem", borderRadius: "50%", background: T.color.sandstone, opacity: 0.3 }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: "60%", height: "1.5rem", borderRadius: "0.375rem", background: T.color.sandstone, opacity: 0.3, marginBottom: "0.5rem" }} />
          <div style={{ width: "40%", height: "1rem", borderRadius: "0.375rem", background: T.color.sandstone, opacity: 0.2 }} />
        </div>
      </div>
    </div>
  );
}
