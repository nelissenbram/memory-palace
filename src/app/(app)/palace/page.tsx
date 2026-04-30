"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import PalaceLoadingScreen from "@/components/ui/PalaceLoadingScreen";

// Warm the browser cache for the heaviest exterior assets as early as possible,
// in parallel with the MemoryPalace chunk download. This measurably cuts perceived
// time-to-first-frame when the user taps the Palace mode button.
const PRELOAD_URLS = [
  "/textures/hdri/courtyard_1k.hdr",
  "/textures/hdri/tuscan_landscape_2k.hdr",
  // ballroom_1k.hdr removed — only needed in entrance hall, not on every palace visit
];
function useWarmPalaceAssets() {
  useEffect(() => {
    PRELOAD_URLS.forEach((u) => {
      try { fetch(u, { cache: "force-cache" }).catch(() => {}); } catch {}
    });
  }, []);
}

const MemoryPalace = dynamic(() => import("@/components/MemoryPalace"), {
  ssr: false,
  loading: () => <PalaceLoadingScreen />,
});

export default function PalacePage() {
  useWarmPalaceAssets();
  return <MemoryPalace />;
}
