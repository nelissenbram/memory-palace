"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import PalaceLogo from "@/components/landing/PalaceLogo";

// Warm the browser cache for the heaviest exterior assets as early as possible,
// in parallel with the MemoryPalace chunk download. This measurably cuts perceived
// time-to-first-frame when the user taps the Palace mode button.
const PRELOAD_URLS = [
  "/textures/hdri/courtyard_1k.hdr",
  "/textures/hdri/tuscan_landscape_2k.hdr",
];
function useWarmPalaceAssets() {
  useEffect(() => {
    PRELOAD_URLS.forEach((u) => {
      try { fetch(u, { cache: "force-cache" }).catch(() => {}); } catch {}
    });
  }, []);
}

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
      <div style={{ marginBottom: "1.25rem" }}><PalaceLogo variant="mark" color="dark" size="lg" /></div>
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
  useWarmPalaceAssets();
  return <MemoryPalace />;
}
