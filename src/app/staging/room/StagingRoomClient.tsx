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
// ⚠️ Titles are keyed to THEIR PHOTO, not to a running index. A first pass drew
// from a flat title list while images cycled separately, so "Last Harvest" landed
// on a beach at sunset — plausible words, wrong picture. Each photo now carries
// its own variants, and the plaque under the mantel is legible in every clip, so
// the wording is written to carry feeling rather than to label a file.
const PHOTO_STORIES: { src: string; takes: [string, string][] }[] = [
  { src: "/demo/graduation.jpg", takes: [            // caps thrown against the sky
    ["The Day She Made It", "1998"],
    ["First in the Family", "1998"],
    ["We Threw Our Hats", "2001"],
  ] },
  { src: "/demo/quiet-morning.jpg", takes: [         // coffee and flowers on a table
    ["Her Kitchen Table", "1987"],
    ["The Cup She Always Used", "1991"],
    ["Sunday, Before Anyone Woke", "1987"],
  ] },
  { src: "/demo/between-two-hands.jpg", takes: [     // sepia, a man and his horse
    ["Grandpa and the Mare", "1961"],
    ["Before the Farm Was Sold", "1958"],
    ["He Named Her Bella", "1961"],
  ] },
  { src: "/demo/edge-of-water.jpg", takes: [         // a figure at the water at dusk
    ["The Summer We Almost Stayed", "1994"],
    ["Watching the Tide Come In", "1994"],
    ["Her Last Evening by the Sea", "1996"],
  ] },
  { src: "/demo/pexels-alexander-mass-748453803-28107011.jpg", takes: [ // two walking a field
    ["Walking Home Together", "1972"],
    ["Fifty Years Next June", "1972"],
    ["They Still Held Hands", "1975"],
  ] },
];

const dm = (i: number, extra: Partial<Mem>): Mem => {
  const ph = PHOTO_STORIES[i % PHOTO_STORIES.length];
  const [title, year] = ph.takes[Math.floor(i / PHOTO_STORIES.length) % ph.takes.length];
  return {
    id: `demo-${extra.type || "photo"}-${i}`,
    title,
    hue: 24 + (i * 29) % 60, s: 42, l: 58,
    type: "photo",
    dataUrl: ph.src,
    displayed: true,
    createdAt: `${year}-${String(1 + (i % 9)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`,
    ...extra,
  } as Mem;
};

const SAMPLE_MEMORIES: Mem[] = [
  ...Array.from({ length: 14 }, (_, i) => dm(i, {})),
  ...Array.from({ length: 4 }, (_, i) => dm(i + 3, { displayUnit: "vitrine" })),
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
