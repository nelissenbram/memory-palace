import { T } from "@/lib/theme";

export default function Loading() {
  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto", padding: "max(2rem, calc(2rem + env(safe-area-inset-top, 0px))) 1rem calc(2rem + env(safe-area-inset-bottom, 0px))", minHeight: "100vh", background: T.color.linen }}>
      <div style={{ padding: "1.5rem", borderRadius: "1rem", background: T.color.cream }}>
        <div style={{ width: "70%", height: "2rem", borderRadius: "0.375rem", background: T.color.sandstone, opacity: 0.3, marginBottom: "0.75rem" }} />
        <div style={{ width: "50%", height: "1rem", borderRadius: "0.375rem", background: T.color.sandstone, opacity: 0.2 }} />
      </div>
    </div>
  );
}
