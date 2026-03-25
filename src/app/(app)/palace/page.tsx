"use client";
import dynamic from "next/dynamic";

const MemoryPalace = dynamic(() => import("@/components/MemoryPalace"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(165deg, #FAFAF7 0%, #F2EDE7 50%, #D4C5B2 100%)",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 20 }}>🏛️</div>
      <div style={{ fontSize: 28, fontWeight: 300, color: "#2C2C2A" }}>
        The Memory Palace
      </div>
      <div
        style={{
          fontSize: 14,
          color: "#9A9183",
          marginTop: 12,
          fontFamily: "'Source Sans 3', system-ui, sans-serif",
        }}
      >
        Preparing your palace...
      </div>
    </div>
  ),
});

export default function PalacePage() {
  // TODO: Render shared wings from family members here (wing_shares table).
  // Use getWingsSharedWithMe() from sharing-actions.ts to fetch shared wings,
  // then pass them to MemoryPalace as a prop to display in the exterior view
  // alongside the user's own wings.
  return <MemoryPalace />;
}
