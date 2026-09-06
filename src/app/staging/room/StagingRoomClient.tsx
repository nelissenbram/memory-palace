"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import StagingChrome from "../StagingChrome";
import type { Mem } from "@/lib/constants/defaults";

// Lazy-load the real room scene (no SSR — Three.js).
const InteriorScene = dynamic(() => import("@/components/3d/InteriorScene"), { ssr: false });

// Photo-rich sample set (viewer-only) so the salon walls fill and the room
// auto-sizes to a real tier — mirrors FlythroughClient's SAMPLE_MEMORIES.
const DEMO_PHOTOS = [
  "/demo/graduation.jpg",
  "/demo/quiet-morning.jpg",
  "/demo/between-two-hands.jpg",
  "/demo/edge-of-water.jpg",
  "/demo/pexels-alexander-mass-748453803-28107011.jpg",
];
const dm = (i: number, extra: Partial<Mem>): Mem => ({
  id: `demo-${extra.type || "photo"}-${i}`,
  title: `Memory ${i + 1}`,
  hue: 24 + (i * 29) % 60, s: 42, l: 58,
  type: "photo",
  dataUrl: DEMO_PHOTOS[i % DEMO_PHOTOS.length],
  displayed: true,
  createdAt: `2026-${String(1 + (i % 9)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`,
  ...extra,
} as Mem);

const SAMPLE_MEMORIES: Mem[] = [
  ...Array.from({ length: 14 }, (_, i) => dm(i, {})),
  ...Array.from({ length: 4 }, (_, i) => dm(100 + i, { type: "photo", displayUnit: "vitrine", title: `Keepsake ${i + 1}` })),
];

export default function StagingRoomClient() {
  const [mounted, setMounted] = useState(false);
  const [chrome, setChrome] = useState(false);
  useEffect(() => {
    setMounted(true);
    // ?chrome=1 overlays the app UI so the shot reads as a screenshot, not a render.
    setChrome(new URLSearchParams(window.location.search).get("chrome") === "1");
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0b0b0d", overflow: "hidden" }}>
      {mounted && (
        <div style={{ position: "absolute", inset: 0 }}>
          <InteriorScene
            roomId="roots"
            actualRoomId="ro1"
            memories={SAMPLE_MEMORIES}
            onMemoryClick={() => {}}
            styleEra="roman"
            // Warm-grade parity with the app look (the async HDRI swap drops the
            // warm salon into gloom on some GPU paths — pinned like /flythrough).
            envHDRI={false}
          />
        </div>
      )}
      {mounted && chrome && <StagingChrome wing="ROOTS" room="ME, OVER TIME"  />}
      <div
        id="staging-dev-panel"
        style={{
          position: "absolute", top: 12, left: 12, zIndex: 10, maxWidth: 300,
          padding: "10px 12px", background: "rgba(20,18,16,0.82)", backdropFilter: "blur(6px)",
          borderRadius: 12, border: "1px solid rgba(200,168,104,0.35)", color: "#EAE2D4",
          fontFamily: "system-ui, sans-serif", fontSize: 12, lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "#C8A868", letterSpacing: 0.5 }}>ROOM STAGING · dev (W3 prod room)</strong>
        <div style={{ marginTop: 6, color: "#B8AE9C" }}>
          Drag = look · W/A/S/D = move.<br />
          URL knobs: <code>?rcam=hearth</code> (face the mantel), <code>?wallcount=3</code>,
          <code> ?heroUrl=/demo/graduation.jpg&amp;heroTitle=…&amp;heroYear=2004</code>.
        </div>
      </div>
    </div>
  );
}
