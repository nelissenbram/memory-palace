"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import StagingChrome from "../StagingChrome";

// Lazy-load the real corridor scene (no SSR — Three.js).
const CorridorScene = dynamic(() => import("@/components/3d/CorridorScene"), { ssr: false });

const noop = () => {};

// Demo wing rooms + paintings — mirrors FlythroughClient so the corridor
// auto-dresses with real doors + salon paintings. The ?wing param overrides the
// wing inside CorridorScene (it reads its own URLSearchParams), so this default
// set is only used for door count/labels on the Roots hall.
const DEMO_CORRIDOR_ROOMS = [
  { id: "ro1", name: "Me, Over Time", icon: "🪞", shared: false, sharedWith: [], coverHue: 18 },
  { id: "ro2", name: "Sunday Lunches", icon: "🍝", shared: false, sharedWith: [], coverHue: 32 },
  { id: "ro3", name: "Dad's Garage", icon: "🛠", shared: false, sharedWith: [], coverHue: 42 },
  { id: "ro4", name: "School Days", icon: "🎒", shared: false, sharedWith: [], coverHue: 48 },
];

const DEMO_CORRIDOR_PAINTINGS: Record<string, { url?: string; title?: string; size?: string }> = {
  ro1: { url: "/demo/graduation.jpg", title: "Graduation" },
  ro2: { url: "/demo/quiet-morning.jpg", title: "Sunday Lunch" },
  ro3: { url: "/demo/between-two-hands.jpg", title: "The Garage" },
  ro4: { url: "/demo/edge-of-water.jpg", title: "School Days" },
};

const WING_IDS = ["roots", "nest", "craft", "travel", "passions"];

/**
 * More rooms than the four demo ones, for the corridor-growth takes: the hall's
 * length is totalSlots * spacing + 14, so adding rooms literally extends the
 * architecture. ?rooms=N slices or extends this list.
 */
const EXTRA_ROOMS = [
  { id: "ro5", name: "The Allotment", icon: "🌿", shared: false, sharedWith: [], coverHue: 26 },
  { id: "ro6", name: "Nonna's Kitchen", icon: "🥖", shared: false, sharedWith: [], coverHue: 36 },
  { id: "ro7", name: "Summers at the Lake", icon: "⛵", shared: false, sharedWith: [], coverHue: 22 },
  { id: "ro8", name: "The Long Drive Home", icon: "🚗", shared: false, sharedWith: [], coverHue: 44 },
];

export default function StagingCorridorClient() {
  const [mounted, setMounted] = useState(false);
  const [chrome, setChrome] = useState(false);
  const [wingId, setWingId] = useState("roots");
  const [rooms, setRooms] = useState(DEMO_CORRIDOR_ROOMS);
  useEffect(() => {
    setMounted(true);
    setChrome(new URLSearchParams(window.location.search).get("chrome") === "1");
    // ?wing= picks which wing's corridor (and therefore which centrepiece
    // statue) renders — read after mount so SSR and client markup agree.
    const q = new URLSearchParams(window.location.search);
    const w = q.get("wing");
    if (w && WING_IDS.includes(w)) setWingId(w);
    // ?rooms=N — how many doors the hall has, and so how long it is.
    const n = parseInt(q.get("rooms") || "", 10);
    if (Number.isFinite(n) && n >= 1) {
      setRooms([...DEMO_CORRIDOR_ROOMS, ...EXTRA_ROOMS].slice(0, Math.min(n, 8)));
    }
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0b0b0d", overflow: "hidden" }}>
      {mounted && (
        <div style={{ position: "absolute", inset: 0 }}>
          <CorridorScene
            key={`${wingId}:${rooms.length}`}
            wingId={wingId}
            rooms={rooms as never}
            corridorPaintings={DEMO_CORRIDOR_PAINTINGS}
            onDoorHover={noop}
            onDoorClick={noop}
            hoveredDoor={null}
            styleEra="roman"
            // Warm-grade parity with the app look (skip the async ballroom-HDRI
            // swap that washes the golden grade on some GPU paths).
            envHDRI={false}
          />
        </div>
      )}
      {mounted && chrome && <StagingChrome wing={wingId.toUpperCase()}  />}
      <div
        id="staging-dev-panel"
        style={{
          position: "absolute", top: 12, left: 12, zIndex: 10, maxWidth: 320,
          padding: "10px 12px", background: "rgba(20,18,16,0.82)", backdropFilter: "blur(6px)",
          borderRadius: 12, border: "1px solid rgba(200,168,104,0.35)", color: "#EAE2D4",
          fontFamily: "system-ui, sans-serif", fontSize: 12, lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "#C8A868", letterSpacing: 0.5 }}>CORRIDOR STAGING · dev</strong>
        <div style={{ marginTop: 6, color: "#B8AE9C" }}>
          Drag = look · W/A/S/D = move.<br />
          URL knobs: <code>?wing=roots|nest|craft|travel|passions</code> (statue + dims),
          <code> ?cam=statue|portal|door|terminus</code> (fixed angle),
          <code> ?walk=1|left|right</code> (scripted dolly).
        </div>
      </div>
    </div>
  );
}
