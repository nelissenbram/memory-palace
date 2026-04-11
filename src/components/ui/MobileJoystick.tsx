"use client";
import { useRef, useCallback, useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface MobileJoystickProps {
  onMove: (direction: { x: number; y: number }) => void;
  visible: boolean;
}

/**
 * A visible semi-transparent joystick overlay for mobile 3D navigation.
 * Renders in the bottom-left corner, above the MobileBottomBar.
 * Dispatches synthetic keyboard events so the existing InteriorScene
 * and CorridorScene movement code picks them up.
 */
export default function MobileJoystick({ onMove, visible }: MobileJoystickProps) {
  const { t } = useTranslation("mobileJoystick");
  const outerRef = useRef<HTMLDivElement | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const activeKeysRef = useRef<Set<string>>(new Set());
  const OUTER_SIZE_REM = 6.25; // 100px equivalent in rem
  const OUTER_R = 50; // outer radius in px (for SVG/knob math)
  const KNOB_R = 20;  // knob radius
  const DEAD_ZONE = 0.15;

  // Dispatch synthetic keyboard events to drive the 3D scene
  const updateKeys = useCallback((nx: number, ny: number) => {
    const newKeys = new Set<string>();
    if (ny < -DEAD_ZONE) newKeys.add("w");
    if (ny > DEAD_ZONE) newKeys.add("s");
    if (nx < -DEAD_ZONE) newKeys.add("a");
    if (nx > DEAD_ZONE) newKeys.add("d");

    // Release old keys
    activeKeysRef.current.forEach(k => {
      if (!newKeys.has(k)) {
        window.dispatchEvent(new KeyboardEvent("keyup", { key: k, bubbles: true }));
      }
    });
    // Press new keys
    newKeys.forEach(k => {
      if (!activeKeysRef.current.has(k)) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
      }
    });
    activeKeysRef.current = newKeys;
    onMove({ x: nx, y: ny });
  }, [onMove]);

  const releaseAll = useCallback(() => {
    activeKeysRef.current.forEach(k => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: k, bubbles: true }));
    });
    activeKeysRef.current = new Set();
    setKnobPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  }, [onMove]);

  // Release keys on unmount
  useEffect(() => {
    return () => {
      activeKeysRef.current.forEach(k => {
        window.dispatchEvent(new KeyboardEvent("keyup", { key: k, bubbles: true }));
      });
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    touchIdRef.current = touch.identifier;
    const rect = outerRef.current?.getBoundingClientRect();
    if (rect) {
      centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    e.stopPropagation();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier !== touchIdRef.current) continue;
      const dx = touch.clientX - centerRef.current.x;
      const dy = touch.clientY - centerRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = OUTER_R - KNOB_R;
      const clampedDist = Math.min(dist, maxDist);
      const angle = Math.atan2(dy, dx);
      const cx = clampedDist * Math.cos(angle);
      const cy = clampedDist * Math.sin(angle);
      setKnobPos({ x: cx, y: cy });

      // Normalize to -1..1
      const nx = cx / maxDist;
      const ny = cy / maxDist;
      updateKeys(nx, ny);
    }
  }, [updateKeys]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        releaseAll();
        break;
      }
    }
    e.stopPropagation();
  }, [releaseAll]);

  if (!visible) return null;

  return (
    <div
      ref={outerRef}
      role="application"
      data-mp-joystick="1"
      aria-label={t("joystickLabel")}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        position: "absolute",
        bottom: "calc(7.5rem + env(safe-area-inset-bottom, 0px))",
        left: "1.25rem",
        width: `${OUTER_SIZE_REM}rem`,
        height: `${OUTER_SIZE_REM}rem`,
        borderRadius: "50%",
        background: "rgba(42, 34, 24, 0.25)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        border: "1.5px solid rgba(212, 197, 178, 0.3)",
        zIndex: 47,
        touchAction: "none",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Directional indicators */}
      <svg
        width={OUTER_R * 2}
        height={OUTER_R * 2}
        viewBox={`0 0 ${OUTER_R * 2} ${OUTER_R * 2}`}
        style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
      >
        {/* Up arrow */}
        <path
          d={`M${OUTER_R} ${14} L${OUTER_R - 6} ${22} L${OUTER_R + 6} ${22} Z`}
          fill="rgba(250,250,247,0.25)"
        />
        {/* Down arrow */}
        <path
          d={`M${OUTER_R} ${OUTER_R * 2 - 14} L${OUTER_R - 6} ${OUTER_R * 2 - 22} L${OUTER_R + 6} ${OUTER_R * 2 - 22} Z`}
          fill="rgba(250,250,247,0.25)"
        />
        {/* Left arrow */}
        <path
          d={`M${14} ${OUTER_R} L${22} ${OUTER_R - 6} L${22} ${OUTER_R + 6} Z`}
          fill="rgba(250,250,247,0.25)"
        />
        {/* Right arrow */}
        <path
          d={`M${OUTER_R * 2 - 14} ${OUTER_R} L${OUTER_R * 2 - 22} ${OUTER_R - 6} L${OUTER_R * 2 - 22} ${OUTER_R + 6} Z`}
          fill="rgba(250,250,247,0.25)"
        />
      </svg>

      {/* Inner knob */}
      <div
        style={{
          width: KNOB_R * 2,
          height: KNOB_R * 2,
          borderRadius: "50%",
          background: "rgba(250, 250, 247, 0.35)",
          border: "1.5px solid rgba(250, 250, 247, 0.45)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          transition: touchIdRef.current !== null ? "none" : "transform 0.15s ease-out",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
