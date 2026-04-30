"use client";
import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useTranslation } from "@/lib/hooks/useTranslation";

/**
 * Floating "+10 MP" animation that appears when points are earned.
 * Renders near the points badge area with a gentle rise-and-fade effect.
 * Includes subtle sparkle particles for a tasteful celebration.
 */
export default function FloatingPoints() {
  const { floatingPoints, dismissFloatingPoints } = useTrackStore();

  return (
    <>
      <style>{`
        @keyframes floatPointsUp {
          0% { opacity: 0; transform: translateY(0.5rem) scale(0.9); }
          15% { opacity: 1; transform: translateY(0) scale(1); }
          70% { opacity: 1; transform: translateY(-1.75rem) scale(1); }
          100% { opacity: 0; transform: translateY(-3rem) scale(0.95); }
        }
        @keyframes sparkleFloat {
          0% { opacity: 0; transform: translate(0, 0) scale(0); }
          20% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0); }
        }
      `}</style>
      {floatingPoints.map((fp) => (
        <FloatingEntry key={fp.id} id={fp.id} amount={fp.amount} onDone={dismissFloatingPoints} />
      ))}
    </>
  );
}

function FloatingEntry({ id, amount, onDone }: { id: string; amount: number; onDone: (id: string) => void }) {
  const { t } = useTranslation("floatingPoints");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone(id);
    }, 2600);
    return () => clearTimeout(timer);
  }, [id, onDone]);

  if (!visible) return null;

  // Generate a few subtle sparkle positions
  const sparkles = [
    { x: "-1rem", y: "-0.75rem", delay: 0.1, size: "0.1875rem" },
    { x: "1.375rem", y: "-0.5rem", delay: 0.3, size: "0.15625rem" },
    { x: "-0.5rem", y: "-1.5rem", delay: 0.5, size: "0.125rem" },
    { x: "0.875rem", y: "-1.25rem", delay: 0.2, size: "0.1875rem" },
    { x: "-1.25rem", y: "-0.25rem", delay: 0.4, size: "0.125rem" },
  ];

  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed",
      bottom: "7.5rem",
      left: "1.75rem",
      zIndex: 100,
      pointerEvents: "none",
    }}>
      {/* Sparkle particles */}
      {sparkles.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldLight})`,
            left: "50%",
            top: "50%",
            animation: `sparkleFloat 1.2s ease ${s.delay}s both`,
            "--sx": s.x,
            "--sy": s.y,
          } as React.CSSProperties}
        />
      ))}

      {/* Main floating text */}
      <div style={{
        animation: "floatPointsUp 2.4s ease both",
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.375rem 0.875rem",
        borderRadius: "1.25rem",
        background: `linear-gradient(135deg, ${T.color.goldLight}26, ${T.color.gold}1a)`,
        border: `1px solid ${T.color.goldLight}4d`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: `0 0.25rem 1rem ${T.color.goldLight}33`,
      }}>
        <span style={{
          fontFamily: T.font.body,
          fontSize: "1rem",
          fontWeight: 700,
          color: T.color.goldLight,
          textShadow: `0 1px 2px ${T.color.goldLight}33`,
        }}>
          {t("pointsEarned", { amount: String(amount) })}
        </span>
      </div>
    </div>
  );
}
