"use client";
import { useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

interface OnboardingCelebrationProps {
  title: string;
  subtitle: string;
  buttonLabel: string;
  onContinue: () => void;
  /** When true, no dark background — confetti + CTA float over the scene */
  transparent?: boolean;
}

export default function OnboardingCelebration({
  title,
  subtitle,
  buttonLabel,
  onContinue,
  transparent = false,
}: OnboardingCelebrationProps) {
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simple confetti animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#C66B3D", "#D4AF37", "#4A6741", "#8B7355", "#F2EDE7", "#B85C38"];
    const pieces: { x: number; y: number; w: number; h: number; c: string; vx: number; vy: number; rot: number; vr: number }[] = [];

    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height * 0.5,
        w: 4 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        c: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: 1.5 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.15,
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.vy += 0.02; // gravity
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (pieces.some((p) => p.y < canvas.height + 20)) {
        raf = requestAnimationFrame(draw);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: transparent ? "flex-end" : "center",
        ...(transparent ? { pointerEvents: "none" } : { background: "rgba(26, 25, 23, 0.85)", backdropFilter: "blur(8px)" }),
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "1.25rem",
          padding: transparent ? "1.5rem 2rem 2.5rem" : "2rem",
          maxWidth: "28rem",
          animation: "fadeUp .6s ease 0.3s both",
          ...(transparent ? {
            background: "linear-gradient(transparent 0%, rgba(26,25,23,0.7) 40%, rgba(26,25,23,0.9) 100%)",
            width: "100%",
            maxWidth: "100%",
            borderRadius: 0,
          } : {}),
        }}
      >
        {!transparent && (
          <div
            style={{
              width: "4.5rem",
              height: "4.5rem",
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.color.terracotta}30, ${T.color.gold}20)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
            }}
          >
            &#x2728;
          </div>
        )}
        <h2
          style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? "1.75rem" : "2.25rem",
            fontWeight: 300,
            color: "#F2EDE7",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "1rem",
            color: "#D4C5B2",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {subtitle}
        </p>
        <button
          onClick={onContinue}
          style={{
            fontFamily: T.font.body,
            fontSize: "1.0625rem",
            fontWeight: 600,
            padding: "1rem 3rem",
            borderRadius: "0.75rem",
            border: "none",
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
            color: "#FFF",
            cursor: "pointer",
            transition: "all .3s",
            boxShadow: "0 0.25rem 1.25rem rgba(198,107,61,.35)",
            marginTop: "0.5rem",
            minHeight: "3rem",
            pointerEvents: "auto",
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
