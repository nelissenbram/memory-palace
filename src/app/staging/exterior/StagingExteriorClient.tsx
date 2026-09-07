"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import StagingChrome from "../StagingChrome";

// Lazy-load the real exterior scene (no SSR — Three.js).
const ExteriorScene = dynamic(() => import("@/components/3d/ExteriorScene"), { ssr: false });

const noop = () => {};

export default function StagingExteriorClient() {
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
          <ExteriorScene onRoomHover={noop} onRoomClick={noop} hoveredRoom={null} styleEra="roman" />
        </div>
      )}
      {mounted && chrome && <StagingChrome showJoystick={false} showMedia={false} />}
      <div
        id="staging-dev-panel"
        style={{
          position: "absolute", top: 12, left: 12, zIndex: 10, maxWidth: 300,
          padding: "10px 12px", background: "rgba(20,18,16,0.82)", backdropFilter: "blur(6px)",
          borderRadius: 12, border: "1px solid rgba(200,168,104,0.35)", color: "#EAE2D4",
          fontFamily: "system-ui, sans-serif", fontSize: 12, lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "#C8A868", letterSpacing: 0.5 }}>EXTERIOR STAGING · dev</strong>
        <div style={{ marginTop: 6, color: "#B8AE9C" }}>
          Drag = orbit. The capture pipeline hides this panel automatically.
        </div>
      </div>
    </div>
  );
}
