"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { T } from "@/lib/theme";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ModeTransitionProps {
  /** Set to true to show the transition overlay */
  active: boolean;
  /** The mode being transitioned TO */
  targetMode: "atrium" | "library" | "3d";
  /** Called when the transition animation is complete (halfway point — when content should swap) */
  onMidpoint: () => void;
  /** Called when the full transition is complete */
  onComplete: () => void;
}

/* ------------------------------------------------------------------ */
/*  Keyframes (injected once via <style>)                              */
/* ------------------------------------------------------------------ */

const KEYFRAMES = `
@keyframes mt-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes mt-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}

/* Atrium — radial gold burst + emoji scale */
@keyframes mt-atrium-burst {
  0%   { transform: scale(0.3); opacity: 0; }
  40%  { opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}
@keyframes mt-atrium-icon {
  0%   { transform: scale(0.5); opacity: 0; }
  30%  { opacity: 1; }
  70%  { opacity: 1; transform: scale(1.3); }
  100% { transform: scale(1.5); opacity: 0; }
}

/* Library — horizontal wipe + icon slide */
@keyframes mt-library-wipe {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(0%); }
}
@keyframes mt-library-wipe-out {
  0%   { transform: translateX(0%); }
  100% { transform: translateX(100%); }
}
@keyframes mt-library-icon {
  0%   { transform: translateX(-3rem); opacity: 0; }
  40%  { opacity: 1; transform: translateX(0); }
  70%  { opacity: 1; }
  100% { opacity: 0; }
}

/* 3D — portal circle expand + glow */
@keyframes mt-portal-expand {
  0%   { clip-path: circle(0% at 50% 50%); }
  100% { clip-path: circle(75% at 50% 50%); }
}
@keyframes mt-portal-collapse {
  0%   { clip-path: circle(75% at 50% 50%); }
  100% { clip-path: circle(150% at 50% 50%); }
}
@keyframes mt-portal-icon {
  0%   { transform: scale(0.5); opacity: 0; filter: drop-shadow(0 0 0rem ${T.color.gold}); }
  40%  { opacity: 1; filter: drop-shadow(0 0 0.75rem ${T.color.gold}); }
  70%  { opacity: 1; transform: scale(1.2); filter: drop-shadow(0 0 1.5rem ${T.color.gold}); }
  100% { transform: scale(1.5); opacity: 0; filter: drop-shadow(0 0 2.5rem ${T.color.gold}); }
}
`;

/* ------------------------------------------------------------------ */
/*  Timing constants (seconds)                                         */
/* ------------------------------------------------------------------ */

const HALF = 0.3; // fade-in / fade-out duration
const TOTAL = HALF * 2;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ModeTransition({
  active,
  targetMode,
  onMidpoint,
  onComplete,
}: ModeTransitionProps) {
  const [phase, setPhase] = useState<"idle" | "in" | "out">("idle");
  const midpointFired = useRef(false);
  const completeFired = useRef(false);

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      midpointFired.current = false;
      completeFired.current = false;
      return;
    }

    /* Start fade-in */
    setPhase("in");
    midpointFired.current = false;
    completeFired.current = false;

    const midTimer = setTimeout(() => {
      if (!midpointFired.current) {
        midpointFired.current = true;
        onMidpoint();
      }
      setPhase("out");
    }, HALF * 1000);

    const endTimer = setTimeout(() => {
      if (!completeFired.current) {
        completeFired.current = true;
        onComplete();
      }
      setPhase("idle");
    }, TOTAL * 1000);

    return () => {
      clearTimeout(midTimer);
      clearTimeout(endTimer);
    };
  }, [active, onMidpoint, onComplete]);

  if (phase === "idle") return null;

  /* ---- Mode-specific inner content ---- */

  const renderContent = () => {
    switch (targetMode) {
      /* ---------- ATRIUM ---------- */
      case "atrium":
        return (
          <>
            {/* Radial burst */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "25rem",
                  height: "25rem",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${T.color.gold} 0%, ${T.color.linen} 50%, transparent 70%)`,
                  animation: `mt-atrium-burst ${TOTAL}s ease-out forwards`,
                }}
              />
            </div>
            {/* Icon */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3.5rem",
                animation: `mt-atrium-icon ${TOTAL}s ease-out forwards`,
              }}
            >
              🏛️
            </div>
          </>
        );

      /* ---------- LIBRARY ---------- */
      case "library":
        return (
          <>
            {/* Wipe panel */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: T.color.linen,
                animation:
                  phase === "in"
                    ? `mt-library-wipe ${HALF}s ease-in-out forwards`
                    : `mt-library-wipe-out ${HALF}s ease-in-out forwards`,
              }}
            />
            {/* Icon */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3.5rem",
                animation: `mt-library-icon ${TOTAL}s ease-out forwards`,
              }}
            >
              📚
            </div>
          </>
        );

      /* ---------- 3D PALACE ---------- */
      case "3d":
        return (
          <>
            {/* Dark portal circle */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: T.color.charcoal,
                animation:
                  phase === "in"
                    ? `mt-portal-expand ${HALF}s ease-out forwards`
                    : `mt-portal-collapse ${HALF}s ease-in forwards`,
              }}
            />
            {/* Glowing icon */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3.5rem",
                animation: `mt-portal-icon ${TOTAL}s ease-out forwards`,
              }}
            >
              🏛️
            </div>
          </>
        );
    }
  };

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          pointerEvents: "none",
          animation:
            phase === "in"
              ? `mt-fade-in ${HALF}s ease-out forwards`
              : `mt-fade-out ${HALF}s ease-in forwards`,
        }}
      >
        {renderContent()}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  useModeTransition hook                                             */
/* ------------------------------------------------------------------ */

export function useModeTransition(): {
  transitioning: boolean;
  targetMode: string | null;
  startTransition: (
    target: "atrium" | "library" | "3d",
    onSwap: () => void,
  ) => void;
  transitionProps: ModeTransitionProps;
} {
  const [active, setActive] = useState(false);
  const [target, setTarget] = useState<"atrium" | "library" | "3d" | null>(
    null,
  );
  const swapRef = useRef<(() => void) | null>(null);

  const startTransition = useCallback(
    (t: "atrium" | "library" | "3d", onSwap: () => void) => {
      if (active) return; // ignore if already transitioning
      swapRef.current = onSwap;
      setTarget(t);
      setActive(true);
    },
    [active],
  );

  const handleMidpoint = useCallback(() => {
    swapRef.current?.();
  }, []);

  const handleComplete = useCallback(() => {
    setActive(false);
    setTarget(null);
    swapRef.current = null;
  }, []);

  return {
    transitioning: active,
    targetMode: target,
    startTransition,
    transitionProps: {
      active,
      targetMode: target ?? "atrium",
      onMidpoint: handleMidpoint,
      onComplete: handleComplete,
    },
  };
}
