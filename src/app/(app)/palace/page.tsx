"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import PalaceLoadingScreen from "@/components/ui/PalaceLoadingScreen";
import { getGPUTier } from "@/lib/3d/mobilePerf";

// Warm the browser cache for the heaviest exterior assets as early as possible,
// in parallel with the MemoryPalace chunk download. This measurably cuts perceived
// time-to-first-frame when the user taps the Palace mode button.
const PRELOAD_URLS = [
  "/textures/hdri/courtyard_1k.hdr",
  // tuscan_landscape_2k.hdr (6.3MB) removed — only the retired !w3_exterior path
  // ever consumed it, so every launch (desktop AND mobile) downloaded it for
  // nothing. The W3 backdrop is the owner pano below (desktop + mobile).
  // ballroom_1k.hdr removed — only needed in entrance hall, not on every palace visit
  "/textures/hdri/tuscan_pano_photo_4k.jpg",
];
function useWarmPalaceAssets() {
  useEffect(() => {
    // Potato tier never loads the photo backdrop — skip its prewarm there.
    const urls = getGPUTier() === "potato" ? PRELOAD_URLS.slice(0, 1) : PRELOAD_URLS;
    urls.forEach((u) => {
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
