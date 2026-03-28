"use client";
import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { useTrackStore } from "@/lib/stores/trackStore";

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
    { x: -16, y: -12, delay: 0.1, size: 3 },
    { x: 22, y: -8, delay: 0.3, size: 2.5 },
    { x: -8, y: -24, delay: 0.5, size: 2 },
    { x: 14, y: -20, delay: 0.2, size: 3 },
    { x: -20, y: -4, delay: 0.4, size: 2 },
  ];

  return (
    <div style={{
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
            background: "linear-gradient(135deg, #D4AF37, #C9A84C)",
            left: "50%",
            top: "50%",
            animation: `sparkleFloat 1.2s ease ${s.delay}s both`,
            "--sx": `${s.x}px`,
            "--sy": `${s.y}px`,
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
        background: "linear-gradient(135deg, rgba(201,168,76,0.15), rgba(212,175,55,0.1))",
        border: "1px solid rgba(201,168,76,0.3)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: "0 4px 16px rgba(201,168,76,0.2)",
      }}>
        <span style={{
          fontFamily: T.font.body,
          fontSize: "1rem",
          fontWeight: 700,
          color: "#C9A84C",
          textShadow: "0 1px 2px rgba(201,168,76,0.2)",
        }}>
          +{amount} MP
        </span>
      </div>
    </div>
  );
}
