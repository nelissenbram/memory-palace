"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";

const STORAGE_KEY = "mp_landscape_nudge_dismissed_v1";

/**
 * Subtle bottom-right hint suggesting the user rotate to landscape for a
 * better view of the Palace exterior. Only shows on mobile in portrait
 * orientation, and stays dismissed once tapped away.
 */
export default function LandscapeNudge() {
  const { t } = useTranslation("exterior3d");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {}

    const check = () => {
      const isMobile = window.innerWidth < 768;
      const isPortrait = window.innerHeight > window.innerWidth;
      setVisible(isMobile && isPortrait);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setVisible(false);
  };

  return (
    <button
      type="button"
      onClick={dismiss}
      aria-label={t("rotateHint")}
      title={t("rotateHint")}
      style={{
        position: "absolute",
        right: "0.875rem",
        bottom: "5.5rem",
        zIndex: 45,
        width: "3rem",
        height: "3rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        borderRadius: "50%",
        background: "rgba(42,34,24,0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(212,175,55,0.35)",
        boxShadow: "0 0.5rem 1.5rem rgba(0,0,0,0.3)",
        color: "#E8C870",
        cursor: "pointer",
        pointerEvents: "auto",
        animation: "mpRotateIn 0.4s ease both",
      }}
    >
      <style>{`
        @keyframes mpRotateIn { from { opacity:0; transform:translateY(0.5rem) scale(0.9);} to { opacity:1; transform:translateY(0) scale(1);} }
        @keyframes mpPhoneRotate {
          0%, 60% { transform: rotate(0deg); }
          75% { transform: rotate(-90deg); }
          90% { transform: rotate(-90deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes mpArrowPulse {
          0%, 60%, 100% { opacity: 0.35; }
          70%, 85% { opacity: 1; }
        }
      `}</style>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
        {/* phone outline that rotates from portrait to landscape */}
        <g
          style={{
            transformOrigin: "16px 16px",
            animation: "mpPhoneRotate 3s ease-in-out infinite",
          }}
        >
          <rect
            x="11" y="5" width="10" height="18" rx="1.6"
            stroke="#E8C870" strokeWidth="1.6" fill="none"
          />
          <circle cx="16" cy="20.5" r="0.7" fill="#E8C870" />
          <line x1="14.5" y1="7.2" x2="17.5" y2="7.2" stroke="#E8C870" strokeWidth="0.9" strokeLinecap="round" />
        </g>
        {/* curved rotation arrow underneath, pulses to suggest motion */}
        <g style={{ animation: "mpArrowPulse 3s ease-in-out infinite" }}>
          <path
            d="M6 26 Q 16 30 26 26"
            stroke="#E8C870"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M25 24.4 L26.4 26.2 L24.4 26.6 Z"
            fill="#E8C870"
          />
        </g>
      </svg>
    </button>
  );
}
