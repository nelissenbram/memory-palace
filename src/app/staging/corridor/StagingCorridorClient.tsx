"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

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

export default function StagingCorridorClient() {
  const [mounted, setMounted] = useState(false);
  const [wingId, setWingId] = useState("roots");
  useEffect(() => {
    setMounted(true);
    // ?wing= picks which wing's corridor (and therefore which centrepiece
    // statue) renders — read after mount so SSR and client markup agree.
    const w = new URLSearchParams(window.location.search).get("wing");
    if (w && WING_IDS.includes(w)) setWingId(w);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0b0b0d", overflow: "hidden" }}>
      {mounted && (
        <div style={{ position: "absolute", inset: 0 }}>
          <CorridorScene
            key={wingId}
            wingId={wingId}
            rooms={DEMO_CORRIDOR_ROOMS as never}
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
