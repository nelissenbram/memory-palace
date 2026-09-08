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
  // ⚠️ Rewritten twice over. The first pass drew titles from a flat list while
  // images cycled separately, so "Last Harvest" landed on a beach. The second
  // kept the pairing but the wording aged badly — "Grandpa and the Mare" is
  // museum-label English nobody says aloud, and the owner said so.
  //
  // These three lead now, and they are one couple's arc: the wedding, dancing
  // years later, and a lane walked together decades after that. A clip that asks
  // what you never got round to asking needs people on the wall, not scenery.
  // Sourced from scripts/populate/media (1586 photos across 42 personas) — the
  // library was there all along while five stock images were being recycled.
  { src: "/demo/the-wedding.jpg", takes: [
    ["The Day They Married", "1961"],
    ["Everyone Came", "1961"],
    ["Before Any of Us", "1961"],
  ] },
  { src: "/demo/still-dancing.jpg", takes: [
    ["Still Dancing", "1974"],
    ["He Always Led", "1974"],
    ["Their Song Came On", "1978"],
  ] },
  { src: "/demo/the-long-walk.jpg", takes: [
    ["The Walk They Always Took", "1996"],
    ["Same Lane, Fifty Years", "1996"],
    ["Neither of Them Talked Much", "1999"],
  ] },
  { src: "/demo/graduation.jpg", takes: [
    ["The Day She Made It", "1998"],
    ["First in the Family", "1998"],
    ["We Threw Our Hats", "2001"],
  ] },
  { src: "/demo/quiet-morning.jpg", takes: [
    ["Her Kitchen Table", "1987"],
    ["The Cup She Always Used", "1991"],
    ["Sunday, Before Anyone Woke", "1987"],
  ] },
  { src: "/demo/between-two-hands.jpg", takes: [
    ["Him and the Horse", "1961"],
    ["Before the Farm Was Sold", "1958"],
    ["He Named Her Bella", "1961"],
  ] },
  { src: "/demo/edge-of-water.jpg", takes: [
    ["The Summer We Almost Stayed", "1994"],
    ["Watching the Tide Come In", "1994"],
    ["Her Last Evening by the Sea", "1996"],
  ] },
];
// ⚠️ Titles are keyed to THEIR PHOTO, not to a running index. A first pass drew
// from a flat title list while images cycled separately, so "Last Harvest" landed
// on a beach at sunset — plausible words, wrong picture. Each photo now carries
// its own variants, and the plaque under the mantel is legible in every clip, so
// the wording is written to carry feeling rather than to label a file.
/**
 * ?hero=N rotates which photo leads the set, and so which one hangs over the
 * mantel. Every room beat in the clip library was shot from the same default
 * set, so five different clips all ended on the same photograph of the same two
 * people — the palace looked like it contained one memory. (The dev panel has
 * long advertised ?heroUrl= for this; that was never implemented here, only in
 * /flythrough. This rotates the deck instead, which keeps each photo paired with
 * its own titles — the reason PHOTO_STORIES exists.)
 */
const heroOffset = (): number => {
  if (typeof window === "undefined") return 0;
  const n = parseInt(new URLSearchParams(window.location.search).get("hero") || "", 10);
  return Number.isFinite(n) ? ((n % PHOTO_STORIES.length) + PHOTO_STORIES.length) % PHOTO_STORIES.length : 0;
};

const dm = (i: number, extra: Partial<Mem>, offset = 0): Mem => {
  const ph = PHOTO_STORIES[(i + offset) % PHOTO_STORIES.length];
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

/**
 * ⚠️ Built per MOUNT, not at module load. As a module-level const this was
 * evaluated before the component ever read the URL, so ?hero=N silently did
 * nothing — five "different" takes came back with the same photograph over the
 * mantel. The mantel picks wallMems[0] (InteriorScene heroSel), so rotating the
 * deck is what changes it.
 */
const buildMemories = (offset: number): Mem[] => [
  // ⚠️ The mantel is chosen by FLAG, not by order. InteriorScene's heroSel is
  // `wallMems.find(m => m.hero === true) || wallMems[0]`, and wallMems comes out
  // date-sorted — so with no flag the oldest photo always wins, and that is the
  // 1961 one. Rotating the deck therefore changed the salon walls while the
  // mantel kept the same picture through every "variant" take. Flagging the
  // lead memory is what actually moves it.
  ...Array.from({ length: 14 }, (_, i) => dm(i, i === 0 ? { hero: true } as Partial<Mem> : {}, offset)),
  ...Array.from({ length: 4 }, (_, i) => dm(i + 3, { displayUnit: "vitrine" }, offset)),
];

export default function StagingRoomClient() {
  const [mounted, setMounted] = useState(false);
  const [chrome, setChrome] = useState(false);
  const [memories, setMemories] = useState<Mem[]>(() => buildMemories(0));
  useEffect(() => {
    setMounted(true);
    // ?chrome=1 overlays the app UI so the shot reads as a screenshot, not a render.
    setChrome(new URLSearchParams(window.location.search).get("chrome") === "1");
    setMemories(buildMemories(heroOffset()));
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0b0b0d", overflow: "hidden" }}>
      {mounted && (
        <div style={{ position: "absolute", inset: 0 }}>
          <InteriorScene
            roomId="roots"
            actualRoomId="ro1"
            memories={memories}
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
