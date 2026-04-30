"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { T } from "@/lib/theme";
import PalaceLogo from "@/components/landing/PalaceLogo";

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
/*  Timing constants (seconds)                                         */
/* ------------------------------------------------------------------ */

const HALF = 0.3;
const TOTAL = HALF * 2;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/* ------------------------------------------------------------------ */
/*  Keyframes                                                          */
/* ------------------------------------------------------------------ */

const KEYFRAMES = `
/* ---- Global ---- */
@keyframes mt-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes mt-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}

/* ---- ATRIUM: radial golden light burst ---- */
@keyframes mt-atrium-burst {
  0%   { transform: scale(0); opacity: 0; }
  20%  { opacity: 0.9; }
  60%  { opacity: 1; }
  100% { transform: scale(3.5); opacity: 0; }
}
@keyframes mt-atrium-burst-ring {
  0%   { transform: scale(0); opacity: 0; border-width: 0.25rem; }
  30%  { opacity: 0.8; }
  100% { transform: scale(4); opacity: 0; border-width: 0.0625rem; }
}
@keyframes mt-atrium-icon {
  0%   { transform: scale(0.3) rotate(-8deg); opacity: 0; filter: brightness(1.8); }
  35%  { opacity: 1; transform: scale(1.05) rotate(0deg); filter: brightness(1.2); }
  65%  { opacity: 1; transform: scale(1.1) rotate(0deg); }
  100% { transform: scale(1.3) rotate(2deg); opacity: 0; filter: brightness(1); }
}
@keyframes mt-atrium-glow {
  0%   { opacity: 0; transform: scale(0.5); }
  40%  { opacity: 0.6; }
  100% { opacity: 0; transform: scale(2); }
}
@keyframes mt-atrium-particle {
  0%   { transform: translateY(-1rem) scale(0); opacity: 0; }
  15%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(6rem) scale(0.3); }
}

/* ---- LIBRARY: page-turn wipe ---- */
@keyframes mt-library-wipe {
  0%   { transform: translateX(-101%) skewX(-3deg); }
  100% { transform: translateX(0%) skewX(0deg); }
}
@keyframes mt-library-wipe-out {
  0%   { transform: translateX(0%) skewX(0deg); }
  100% { transform: translateX(101%) skewX(3deg); }
}
@keyframes mt-library-line {
  0%   { transform: scaleX(0); opacity: 0; }
  20%  { opacity: 1; }
  100% { transform: scaleX(1); opacity: 0.8; }
}
@keyframes mt-library-line-out {
  0%   { transform: scaleX(1); opacity: 0.8; }
  80%  { opacity: 0.6; }
  100% { transform: scaleX(0); opacity: 0; }
}
@keyframes mt-library-icon {
  0%   { transform: translateX(-4rem) rotateY(90deg); opacity: 0; }
  35%  { opacity: 1; transform: translateX(0) rotateY(15deg); }
  55%  { transform: translateX(0) rotateY(0deg); opacity: 1; }
  100% { transform: translateX(2rem) rotateY(-5deg); opacity: 0; }
}
@keyframes mt-library-texture {
  0%   { opacity: 0; }
  30%  { opacity: 0.08; }
  70%  { opacity: 0.08; }
  100% { opacity: 0; }
}

/* ---- 3D PALACE: portal ---- */
@keyframes mt-portal-expand {
  0%   { transform: scale(0); border-radius: 50%; opacity: 0; }
  100% { transform: scale(1); border-radius: 0; opacity: 1; }
}
@keyframes mt-portal-collapse {
  0%   { transform: scale(1); border-radius: 0; opacity: 1; }
  100% { transform: scale(1.5); border-radius: 0; opacity: 0; }
}
@keyframes mt-portal-rim {
  0%   { transform: scale(0); opacity: 0; box-shadow: 0 0 0 0.125rem ${T.color.gold}, 0 0 1.5rem 0.25rem ${T.color.gold}; }
  40%  { opacity: 0.9; }
  100% { transform: scale(3.2); opacity: 0; box-shadow: 0 0 0 0.0625rem ${T.color.goldLight}, 0 0 3rem 0.5rem ${T.color.gold}; }
}
@keyframes mt-portal-icon {
  0%   { transform: scale(0.3); opacity: 0; filter: drop-shadow(0 0 0rem ${T.color.gold}); }
  30%  { opacity: 1; filter: drop-shadow(0 0 1rem ${T.color.gold}); }
  50%  { transform: scale(1.1); filter: drop-shadow(0 0 1.5rem ${T.color.gold}); }
  70%  { opacity: 1; transform: scale(1.15); filter: drop-shadow(0 0 1rem ${T.color.gold}); }
  100% { transform: scale(1.4); opacity: 0; filter: drop-shadow(0 0 2.5rem ${T.color.gold}); }
}
@keyframes mt-portal-pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%      { opacity: 0.7; transform: scale(1.15); }
}
@keyframes mt-portal-inner-glow {
  0%   { opacity: 0; }
  40%  { opacity: 0.5; }
  100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

/* ------------------------------------------------------------------ */
/*  Particle helper for Atrium                                         */
/* ------------------------------------------------------------------ */

function AtriumParticles({ count }: { count: number }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const left = 15 + (i / count) * 70 + Math.sin(i * 2.3) * 8;
      const delay = (i / count) * HALF * 0.6;
      const size = 0.15 + (i % 3) * 0.1;
      const drift = Math.sin(i * 1.7) * 2;
      return { left, delay, size, drift, key: i };
    });
  }, [count]);

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.key}
          style={{
            position: "absolute",
            top: "20%",
            left: `${p.left}%`,
            width: `${p.size}rem`,
            height: `${p.size}rem`,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${T.color.gold} 30%, ${T.color.goldLight} 100%)`,
            boxShadow: `0 0 0.375rem ${T.color.gold}`,
            animation: `mt-atrium-particle ${TOTAL}s ${EASE} ${p.delay}s forwards`,
            opacity: 0,
            transform: `translateX(${p.drift}rem)`,
          }}
        />
      ))}
    </>
  );
}

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

    /* Start phase-in */
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
      /* ============================================================ */
      /*  ATRIUM — radial golden light burst, particles, grandeur     */
      /* ============================================================ */
      case "atrium":
        return (
          <>
            {/* Full-screen warm radial background */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(ellipse at 50% 50%, ${T.color.gold}40 0%, ${T.color.linen}cc 50%, ${T.color.linen} 100%)`,
              }}
            />

            {/* Soft outer glow ring */}
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
                  width: "12rem",
                  height: "12rem",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${T.color.gold}60 0%, transparent 70%)`,
                  animation: `mt-atrium-glow ${TOTAL}s ${EASE} forwards`,
                  opacity: 0,
                }}
              />
            </div>

            {/* Central burst disc */}
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
                  width: "10rem",
                  height: "10rem",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${T.color.gold} 0%, ${T.color.goldLight}80 35%, transparent 70%)`,
                  animation: `mt-atrium-burst ${TOTAL}s ${EASE} forwards`,
                  opacity: 0,
                }}
              />
            </div>

            {/* Expanding ring */}
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
                  width: "8rem",
                  height: "8rem",
                  borderRadius: "50%",
                  border: `0.125rem solid ${T.color.gold}`,
                  background: "transparent",
                  animation: `mt-atrium-burst-ring ${TOTAL}s ${EASE} 0.05s forwards`,
                  opacity: 0,
                }}
              />
            </div>

            {/* Golden particle shower */}
            <AtriumParticles count={14} />

            {/* Icon */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3.5rem",
                animation: `mt-atrium-icon ${TOTAL}s ${EASE} forwards`,
                opacity: 0,
                textShadow: `0 0 1.5rem ${T.color.gold}`,
              }}
            >
              <PalaceLogo variant="mark" color="light" size="lg" />
            </div>
          </>
        );

      /* ============================================================ */
      /*  LIBRARY — horizontal page-turn wipe, golden line            */
      /* ============================================================ */
      case "library":
        return (
          <>
            {/* Paper texture overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 1.5rem,
                  ${T.color.sandstone}10 1.5rem,
                  ${T.color.sandstone}10 1.5625rem
                )`,
                animation: `mt-library-texture ${TOTAL}s ease forwards`,
                opacity: 0,
              }}
            />

            {/* Wipe panel — warm linen sweep */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(90deg, ${T.color.linen} 0%, ${T.color.warmStone} 40%, ${T.color.cream} 80%, ${T.color.linen} 100%)`,
                animation:
                  phase === "in"
                    ? `mt-library-wipe ${HALF}s ${EASE} forwards`
                    : `mt-library-wipe-out ${HALF}s ${EASE} forwards`,
                transformOrigin: phase === "in" ? "left center" : "right center",
              }}
            />

            {/* Thin golden line drawing across */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "5%",
                right: "5%",
                height: "0.125rem",
                background: `linear-gradient(90deg, transparent, ${T.color.gold}, ${T.color.goldLight}, ${T.color.gold}, transparent)`,
                transformOrigin: "left center",
                animation:
                  phase === "in"
                    ? `mt-library-line ${HALF}s ${EASE} forwards`
                    : `mt-library-line-out ${HALF}s ${EASE} forwards`,
                boxShadow: `0 0 0.5rem ${T.color.gold}60`,
              }}
            />

            {/* Icon — slides in with book-opening rotation */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3.5rem",
                perspective: "31.25rem",
                animation: `mt-library-icon ${TOTAL}s ${EASE} forwards`,
                opacity: 0,
                textShadow: `0 0.125rem 0.5rem ${T.color.walnut}40`,
              }}
            >
              📚
            </div>
          </>
        );

      /* ============================================================ */
      /*  3D PALACE — portal expanding from center                    */
      /* ============================================================ */
      case "3d":
        return (
          <>
            {/* Deep charcoal background with warm center glow */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(ellipse at 50% 50%, ${T.color.walnut}50 0%, ${T.color.charcoal} 60%)`,
                willChange: "transform, opacity",
                animation:
                  phase === "in"
                    ? `mt-portal-expand ${HALF}s ${EASE} forwards`
                    : `mt-portal-collapse ${HALF}s ${EASE} forwards`,
              }}
            />

            {/* Inner warm glow at center */}
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
                  width: "18rem",
                  height: "18rem",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${T.color.gold}30 0%, ${T.color.walnut}20 40%, transparent 70%)`,
                  animation: `mt-portal-inner-glow ${TOTAL}s ${EASE} forwards`,
                  opacity: 0,
                }}
              />
            </div>

            {/* Golden rim glow — expanding circle edge */}
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
                  width: "6rem",
                  height: "6rem",
                  borderRadius: "50%",
                  background: "transparent",
                  animation: `mt-portal-rim ${TOTAL}s ${EASE} forwards`,
                  opacity: 0,
                }}
              />
            </div>

            {/* Pulsing aura behind icon */}
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
                  width: "5rem",
                  height: "5rem",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${T.color.gold}50 0%, transparent 70%)`,
                  animation: `mt-portal-pulse ${HALF}s ease-in-out 2`,
                }}
              />
            </div>

            {/* Icon with golden drop-shadow */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "3.5rem",
                animation: `mt-portal-icon ${TOTAL}s ${EASE} forwards`,
                opacity: 0,
              }}
            >
              <PalaceLogo variant="mark" color="light" size="lg" />
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
              ? `mt-fade-in ${HALF}s ${EASE} forwards`
              : `mt-fade-out ${HALF}s ${EASE} forwards`,
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
      if (active) return;
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
