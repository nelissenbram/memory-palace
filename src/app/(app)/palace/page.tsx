"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import PalaceLoadingScreen from "@/components/ui/PalaceLoadingScreen";
import { getGPUTier, getQuality } from "@/lib/3d/mobilePerf";

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
// ASSEMBLE-BEFORE-REVEAL prewarm: the W3 exterior holds its reveal until the
// six hero GLBs + cypress have attached (ExteriorScene revealGates) — warming
// them here (same-origin, force-cache, ~0.5-1.1MB each) means loadModel hits
// the HTTP cache and the barrier settles almost immediately.
// MUST match ExteriorScene's paths exactly: same LOD pick (maxEagerTextureSets
// >=12 desktop / <=3 potato lod2 / else lod1) and the same `_domeV`
// cache-bust — keep W3_GLB_V in sync with `_domeV` in ExteriorScene.tsx.
const W3_GLB_V = "?v=25";
function w3GlbUrls(): string[] {
  const q = getQuality();
  const lod = q.maxEagerTextureSets >= 12 ? "" : q.maxEagerTextureSets <= 3 ? "_lod2" : "_lod1";
  return [
    `/models/exterior/dome_w3${lod}.glb${W3_GLB_V}`,
    `/models/exterior/entrance_w3.glb${W3_GLB_V}`,
    `/models/exterior/roofs_w3${lod}.glb${W3_GLB_V}`,
    `/models/exterior/statuary_w3.glb${W3_GLB_V}`,
    `/models/exterior/fountain_w3.glb${W3_GLB_V}`,
    `/models/exterior/obelisk_w3.glb${W3_GLB_V}`,
    `/models/exterior/cypress_w3.glb${W3_GLB_V}`,
  ];
}
function useWarmPalaceAssets() {
  useEffect(() => {
    // Potato tier never loads the photo backdrop — skip its prewarm there.
    // The GLBs load on every tier (potato takes the lod2 variants).
    const urls = [
      ...(getGPUTier() === "potato" ? PRELOAD_URLS.slice(0, 1) : PRELOAD_URLS),
      ...w3GlbUrls(),
    ];
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
