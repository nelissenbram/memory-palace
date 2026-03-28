"use client";
import dynamic from "next/dynamic";
import { useTranslation } from "@/lib/hooks/useTranslation";

function PalaceLoading() {
  const { t } = useTranslation("palace");
  const { t: tLanding } = useTranslation("landing");
  return (
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
      <div style={{ fontSize: "3rem", marginBottom: "1.25rem" }}>🏛️</div>
      <div style={{ fontSize: "1.75rem", fontWeight: 300, color: "#2C2C2A" }}>
        {tLanding("title")}
      </div>
      <div
        style={{
          fontSize: "0.875rem",
          color: "#9A9183",
          marginTop: "0.75rem",
          fontFamily: "'Source Sans 3', system-ui, sans-serif",
        }}
      >
        {t("preparingPalace")}
      </div>
    </div>
  );
}

const MemoryPalace = dynamic(() => import("@/components/MemoryPalace"), {
  ssr: false,
  loading: () => <PalaceLoading />,
});

export default function PalacePage() {
  // TODO: Render shared wings from family members here (wing_shares table).
  // Use getWingsSharedWithMe() from sharing-actions.ts to fetch shared wings,
  // then pass them to MemoryPalace as a prop to display in the exterior view
  // alongside the user's own wings.
  return <MemoryPalace />;
}
