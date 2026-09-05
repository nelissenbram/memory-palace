"use client";
import { useRef, useCallback, useEffect } from "react";
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
  const knobRef = useRef<HTMLDivElement | null>(null);
  const touchIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const outerRadiusRef = useRef(50); // measured outer radius in px, refreshed on touch start
  const activeKeysRef = useRef<Set<string>>(new Set());
  const OUTER_SIZE_REM = 6.25; // outer diameter in rem
  const KNOB_SIZE_REM = 2.5;   // knob diameter in rem (was 40px)
  const OUTER_R = 50; // SVG viewBox reference only (internal coordinate space)
  const KNOB_R = 20;  // knob radius in the same SVG-nominal space (touch math ratio)
  const DEAD_ZONE = 0.15;

  // Dispatch synthetic keyboard events to drive the 3D scene.
  // When pulled far (>0.7), also press shift for fast walk.
  const updateKeys = useCallback((nx: number, ny: number) => {
    const newKeys = new Set<string>();
    if (ny < -DEAD_ZONE) newKeys.add("w");
    if (ny > DEAD_ZONE) newKeys.add("s");
    if (nx < -DEAD_ZONE) newKeys.add("a");
    if (nx > DEAD_ZONE) newKeys.add("d");
    // Fast mode when joystick is pulled far from center
    const magnitude = Math.sqrt(nx * nx + ny * ny);
    if (magnitude > 0.7) newKeys.add("shift");

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
    // Snap the knob back to center imperatively (with the ease-out transition)
    // rather than via React state, avoiding a re-render.
    const knob = knobRef.current;
    if (knob) {
      knob.style.transition = "transform 0.15s ease-out";
      knob.style.transform = "translate(0px, 0px)";
    }
    onMove({ x: 0, y: 0 });
  }, [onMove]);

  // When the joystick is hidden mid-hold (e.g. a menu/overlay opens while the
  // user is still pressing the stick), the component returns null without
  // unmounting — so the unmount cleanup never runs and held keys leak, causing
  // the avatar to walk forever. Fire keyup for every held key, reset the knob,
  // and clear touchIdRef so a later re-show is responsive again.
  useEffect(() => {
    if (!visible) {
      touchIdRef.current = null;
      releaseAll();
    }
  }, [visible, releaseAll]);

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
      outerRadiusRef.current = rect.width / 2;
    }
    // Drop the snap-back transition while dragging so the knob tracks the finger
    // immediately (the imperative transform updates every touchmove).
    if (knobRef.current) knobRef.current.style.transition = "none";
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
      // Track the actual rendered size (root font-size / zoom) rather than the
      // nominal px constants — scale the knob radius by the measured/nominal ratio.
      const measuredR = outerRadiusRef.current;
      const maxDist = measuredR - KNOB_R * (measuredR / OUTER_R);
      const clampedDist = Math.min(dist, maxDist);
      const angle = Math.atan2(dy, dx);
      const cx = clampedDist * Math.cos(angle);
      const cy = clampedDist * Math.sin(angle);
      // Drive the knob imperatively — this is a pure presentational transform
      // that fires on every touchmove (60-120Hz). Routing it through React state
      // would schedule a full re-render each event, competing with the R3F
      // render loop while the user is navigating the palace.
      if (knobRef.current) {
        knobRef.current.style.transform = `translate(${cx}px, ${cy}px)`;
      }

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
        left: "calc(1.25rem + env(safe-area-inset-left, 0px))",
        width: `${OUTER_SIZE_REM}rem`,
        height: `${OUTER_SIZE_REM}rem`,
        borderRadius: "50%",
        background: "rgba(42, 34, 24, 0.25)",
        backdropFilter: "blur(0.375rem)",
        WebkitBackdropFilter: "blur(0.375rem)",
        border: "0.09375rem solid rgba(212, 197, 178, 0.3)",
        zIndex: 47,
        touchAction: "none",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Directional indicators — SVG scales with the rem-sized container via
          its viewBox, so it stays correct under a non-16px root font-size. */}
      <svg
        width="100%"
        height="100%"
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

      {/* Inner knob — position driven imperatively via knobRef during drag to
          avoid a React re-render on every touchmove event. */}
      <div
        ref={knobRef}
        style={{
          width: `${KNOB_SIZE_REM}rem`,
          height: `${KNOB_SIZE_REM}rem`,
          borderRadius: "50%",
          background: "rgba(250, 250, 247, 0.35)",
          border: "0.09375rem solid rgba(250, 250, 247, 0.45)",
          boxShadow: "0 0.125rem 0.5rem rgba(64,59,54,0.15)",
          transform: "translate(0px, 0px)",
          transition: "transform 0.15s ease-out",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
