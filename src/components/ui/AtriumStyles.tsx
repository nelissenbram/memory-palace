import React from "react";
import { T } from "@/lib/theme";

/* ─────────────────────────────────────────────
   Animation name constants
   ───────────────────────────────────────────── */

export const ANIM = {
  // Entrance
  fadeSlideUp: "atriumFadeSlideUp",
  fadeSlideRight: "atriumFadeSlideRight",
  scaleIn: "atriumScaleIn",
  reveal: "atriumReveal",
  // Ambient / loop
  float: "atriumFloat",
  glow: "atriumGlow",
  shimmer: "atriumShimmer",
  particle: "atriumParticle",
  pulseRing: "atriumPulseRing",
  // Interaction
  lift: "atriumLift",
  press: "atriumPress",
  borderGlow: "atriumBorderGlow",
} as const;

/* ─────────────────────────────────────────────
   Premium easing & durations
   ───────────────────────────────────────────── */

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

/* ─────────────────────────────────────────────
   AtriumStyles — injects global keyframes
   ───────────────────────────────────────────── */

export default function AtriumStyles() {
  return (
    <style>{`
      /* ── Custom properties ─────────────────── */
      :root {
        --atrium-gold: ${T.color.gold};
        --atrium-gold-light: ${T.color.goldLight};
        --atrium-gold-dark: ${T.color.goldDark};
        --atrium-charcoal: ${T.color.charcoal};
        --atrium-linen: ${T.color.linen};
        --atrium-ease: ${EASE_OUT};
      }

      /* ════════════════════════════════════════
         1. ENTRANCE ANIMATIONS
         ════════════════════════════════════════ */

      /* Fade in + slide up */
      @keyframes ${ANIM.fadeSlideUp} {
        from {
          opacity: 0;
          transform: translateY(1.25rem);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Fade in + slide from left */
      @keyframes ${ANIM.fadeSlideRight} {
        from {
          opacity: 0;
          transform: translateX(-1.25rem);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      /* Fade in + scale */
      @keyframes ${ANIM.scaleIn} {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      /* Clip-path reveal left to right */
      @keyframes ${ANIM.reveal} {
        from {
          clip-path: inset(0 100% 0 0);
        }
        to {
          clip-path: inset(0 0% 0 0);
        }
      }

      /* ════════════════════════════════════════
         2. AMBIENT / LOOP ANIMATIONS
         ════════════════════════════════════════ */

      /* Gentle floating motion */
      @keyframes ${ANIM.float} {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-0.375rem);
        }
      }

      /* Subtle golden glow pulse */
      @keyframes ${ANIM.glow} {
        0%, 100% {
          opacity: 0.7;
        }
        50% {
          opacity: 1;
        }
      }

      /* Shimmer gradient sweep */
      @keyframes ${ANIM.shimmer} {
        0% {
          background-position: -200% center;
        }
        100% {
          background-position: 200% center;
        }
      }

      /* Particle float upward + fade */
      @keyframes ${ANIM.particle} {
        0% {
          opacity: 0;
          transform: translateY(0) scale(1);
        }
        20% {
          opacity: 1;
        }
        100% {
          opacity: 0;
          transform: translateY(-3rem) scale(0.4);
        }
      }

      /* Expanding ring that fades out */
      @keyframes ${ANIM.pulseRing} {
        0% {
          transform: scale(0.9);
          opacity: 0.8;
        }
        100% {
          transform: scale(1.6);
          opacity: 0;
        }
      }

      /* ════════════════════════════════════════
         3. INTERACTION ANIMATIONS
         ════════════════════════════════════════ */

      /* Hover lift with shadow */
      @keyframes ${ANIM.lift} {
        from {
          transform: translateY(0);
          box-shadow: 0 0.125rem 0.5rem rgba(0,0,0,0.08);
        }
        to {
          transform: translateY(-0.125rem);
          box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.15);
        }
      }

      /* Active press */
      @keyframes ${ANIM.press} {
        from {
          transform: scale(1);
        }
        to {
          transform: scale(0.97);
        }
      }

      /* Border glow pulse */
      @keyframes ${ANIM.borderGlow} {
        0%, 100% {
          border-color: var(--atrium-gold-dark);
          box-shadow: 0 0 0 0 rgba(212, 175, 55, 0);
        }
        50% {
          border-color: var(--atrium-gold-light);
          box-shadow: 0 0 0.75rem 0.125rem rgba(212, 175, 55, 0.25);
        }
      }

      /* ════════════════════════════════════════
         4. UTILITY CLASSES
         ════════════════════════════════════════ */

      .atrium-entrance {
        animation: ${ANIM.fadeSlideUp} 0.6s var(--atrium-ease) both;
      }

      .atrium-float {
        animation: ${ANIM.float} 3s ease-in-out infinite;
      }

      .atrium-glow {
        animation: ${ANIM.glow} 2.5s ease-in-out infinite;
      }

      .atrium-shimmer-text {
        background: linear-gradient(
          90deg,
          var(--atrium-gold-dark) 0%,
          var(--atrium-gold-light) 40%,
          var(--atrium-gold) 50%,
          var(--atrium-gold-light) 60%,
          var(--atrium-gold-dark) 100%
        );
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: ${ANIM.shimmer} 3s linear infinite;
      }

      .atrium-lift {
        transition: transform 0.3s var(--atrium-ease),
                    box-shadow 0.3s var(--atrium-ease);
      }
      .atrium-lift:hover {
        transform: translateY(-0.125rem);
        box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.15);
      }
      .atrium-lift:active {
        transform: scale(0.97);
      }

      .atrium-border-glow {
        animation: ${ANIM.borderGlow} 2s ease-in-out infinite;
      }

      .atrium-pulse-ring {
        animation: ${ANIM.pulseRing} 2s ease-out infinite;
      }
    `}</style>
  );
}

/* ─────────────────────────────────────────────
   Decorative sub-components
   ───────────────────────────────────────────── */

/** Golden gradient horizontal divider with faded edges */
export function AtriumDivider({
  width = "100%",
  margin = "1.5rem 0",
}: {
  width?: string;
  margin?: string;
}) {
  return (
    <div
      style={{
        width,
        margin,
        height: "0.0625rem",
        background: `linear-gradient(90deg, transparent 0%, ${T.color.goldLight} 20%, ${T.color.gold} 50%, ${T.color.goldLight} 80%, transparent 100%)`,
        borderRadius: "1rem",
      }}
      aria-hidden="true"
    />
  );
}

/** Floating golden particle circles with staggered animation */
export function AtriumParticles({ count = 10 }: { count?: number }) {
  const particles = Array.from({ length: count }, (_, i) => {
    const size = 0.125 + Math.random() * 0.25; // 0.125–0.375rem
    const left = Math.random() * 100;
    const delay = Math.random() * 4;
    const duration = 2.5 + Math.random() * 2; // 2.5–4.5s

    return (
      <span
        key={i}
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          left: `${left}%`,
          width: `${size}rem`,
          height: `${size}rem`,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${T.color.gold} 0%, ${T.color.goldLight} 60%, transparent 100%)`,
          opacity: 0,
          animation: `${ANIM.particle} ${duration}s ease-out ${delay}s infinite`,
          pointerEvents: "none" as const,
        }}
      />
    );
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      {particles}
    </div>
  );
}

/** Text with animated golden shimmer gradient */
export function AtriumGradientText({
  children,
  size = "1rem",
}: {
  children: React.ReactNode;
  size?: string;
}) {
  return (
    <span
      className="atrium-shimmer-text"
      style={{
        fontSize: size,
        fontFamily: T.font.display,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

/** Premium frosted glass container */
export function GlassCard({
  children,
  golden = false,
  style,
}: {
  children: React.ReactNode;
  golden?: boolean;
  style?: React.CSSProperties;
}) {
  const borderColor = golden
    ? `rgba(212, 175, 55, 0.3)`
    : `rgba(255, 255, 255, 0.12)`;
  const bgColor = golden
    ? `rgba(212, 175, 55, 0.06)`
    : `rgba(255, 255, 255, 0.04)`;
  const shadowGlow = golden
    ? `0 0 1.5rem rgba(212, 175, 55, 0.08)`
    : `0 0 1rem rgba(0, 0, 0, 0.06)`;

  return (
    <div
      style={{
        backdropFilter: "blur(1rem)",
        WebkitBackdropFilter: "blur(1rem)",
        background: bgColor,
        border: `0.0625rem solid ${borderColor}`,
        borderRadius: "0.75rem",
        padding: "1.25rem",
        boxShadow: `0 0.25rem 1.5rem rgba(0,0,0,0.1), ${shadowGlow}`,
        transition: `border-color 0.3s ${EASE_OUT}, box-shadow 0.3s ${EASE_OUT}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
