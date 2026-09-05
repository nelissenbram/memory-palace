"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const CorridorScene = dynamic(() => import("@/components/3d/CorridorScene"), { ssr: false });

const noop = () => {};

// Each wing gets a different centrepiece on the central pedestal — see the
// CENTRAL STATUE block in CorridorScene. "passions" falls through to the
// default classical marble bust.
const WING_STATUES = [
  { id: "roots", label: "Roots", statue: "Family tree — trunk, exposed roots, leaf canopy" },
  { id: "travel", label: "Travel", statue: "Armillary sphere — gilt core, three rings, axis" },
  { id: "nest", label: "Nest", statue: "Woven nest cradling three eggs" },
  { id: "craft", label: "Craft", statue: "Fluted obelisk with gilt pyramidion" },
  { id: "passions", label: "Passions", statue: "Classical marble bust (default)" },
];

const DEMO_CORRIDOR_ROOMS = [
  { id: "ro1", name: "Me, Over Time", icon: "🪞", shared: false, sharedWith: [], coverHue: 18 },
  { id: "ro2", name: "Sunday Lunches", icon: "🍝", shared: false, sharedWith: [], coverHue: 32 },
  { id: "ro3", name: "Dad's Garage", icon: "🛠", shared: false, sharedWith: [], coverHue: 42 },
  { id: "ro4", name: "School Days", icon: "🎒", shared: false, sharedWith: [], coverHue: 48 },
];

export default function StagingStatuesClient() {
  const [mounted, setMounted] = useState(false);
  const [wingIdx, setWingIdx] = useState(0);
  useEffect(() => setMounted(true), []);

  // Only ONE corridor is mounted at a time: the renderer pool holds a single
  // renderer, so five simultaneous scenes would each spin up their own WebGL
  // context. Switching remounts via `key`, which is fast enough to A/B by eye.
  const wing = WING_STATUES[wingIdx];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0b0b0d", overflow: "hidden" }}>
      {mounted && (
        <div style={{ position: "absolute", inset: 0 }}>
          <CorridorScene
            key={wing.id}
            wingId={wing.id}
            rooms={DEMO_CORRIDOR_ROOMS as never}
            onDoorHover={noop}
            onDoorClick={noop}
            hoveredDoor={null}
            styleEra="roman"
            envHDRI={false}
          />
        </div>
      )}
      <div
        id="staging-dev-panel"
        style={{
          position: "absolute", top: 12, left: 12, zIndex: 10, maxWidth: 380,
          padding: "10px 12px", background: "rgba(20,18,16,0.86)", backdropFilter: "blur(6px)",
          borderRadius: 12, border: "1px solid rgba(200,168,104,0.35)", color: "#EAE2D4",
          fontFamily: "system-ui, sans-serif", fontSize: 12, lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "#C8A868", letterSpacing: 0.5 }}>STATUE COMPARISON · dev</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
          {WING_STATUES.map((w, i) => (
            <button
              key={w.id}
              onClick={() => setWingIdx(i)}
              style={{
                padding: "5px 10px", borderRadius: 8, cursor: "pointer",
                fontFamily: "inherit", fontSize: 12,
                background: i === wingIdx ? "#C8A868" : "rgba(255,255,255,0.08)",
                color: i === wingIdx ? "#1A1712" : "#EAE2D4",
                border: "1px solid rgba(200,168,104,0.4)",
                fontWeight: i === wingIdx ? 600 : 400,
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
        <div style={{ color: "#B8AE9C" }}>
          <strong style={{ color: "#EAE2D4" }}>{wing.label}:</strong> {wing.statue}
          <br />
          Add <code>?cam=statue</code> to the URL to frame the pedestal. Drag = look · W/A/S/D = move.
        </div>
      </div>
    </div>
  );
}
