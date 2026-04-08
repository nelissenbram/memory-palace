"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";

/**
 * Persistent bottom-right hint suggesting the user rotate to landscape for a
 * better view of the Palace exterior. Shown only on mobile + portrait. Does
 * not auto-dismiss — disappears on its own once the device is rotated.
 *
 * Visual: terracotta-on-glass circular badge with an animated phone that
 * smoothly tilts from portrait to landscape and back, on a soft loop.
 */
export default function LandscapeNudge() {
  const { t } = useTranslation("exterior3d");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
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

  // Terracotta from theme is roughly #C97B57 — keep it in CSS for clarity
  const terracotta = "#C97B57";
  const terracottaLight = "#E8B19A";

  return (
    <div
      aria-label={t("rotateHint")}
      title={t("rotateHint")}
      style={{
        position: "absolute",
        right: "0.875rem",
        bottom: "5.5rem",
        zIndex: 45,
        width: "3.25rem",
        height: "3.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, rgba(201,123,87,0.35), rgba(201,123,87,0.12) 70%, rgba(201,123,87,0.05) 100%)`,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: `1px solid ${terracotta}55`,
        boxShadow: `0 0.5rem 1.75rem rgba(0,0,0,0.25), inset 0 0 1rem ${terracotta}22`,
        pointerEvents: "none",
        animation: "mpRotateIn 0.5s ease both",
      }}
    >
      <style>{`
        @keyframes mpRotateIn {
          from { opacity: 0; transform: translateY(0.5rem) scale(0.85); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes mpPhoneTilt {
          0%   { transform: rotate(0deg); }
          35%  { transform: rotate(0deg); }
          55%  { transform: rotate(-90deg); }
          80%  { transform: rotate(-90deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes mpHaloPulse {
          0%, 100% { opacity: 0.25; transform: scale(0.9); }
          50%      { opacity: 0.55; transform: scale(1.15); }
        }
      `}</style>

      {/* soft pulsing halo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: "-0.25rem",
          borderRadius: "50%",
          border: `1px solid ${terracotta}66`,
          animation: "mpHaloPulse 2.6s ease-in-out infinite",
        }}
      />

      <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden>
        {/* Phone outline that tilts from portrait to landscape and back */}
        <g
          style={{
            transformOrigin: "20px 20px",
            animation: "mpPhoneTilt 3.4s cubic-bezier(0.65,0,0.35,1) infinite",
          }}
        >
          <rect
            x="13.5" y="6" width="13" height="22" rx="2"
            stroke={terracottaLight} strokeWidth="1.6" fill={`${terracotta}22`}
          />
          {/* speaker bar */}
          <line x1="17.5" y1="8.6" x2="22.5" y2="8.6"
            stroke={terracottaLight} strokeWidth="1" strokeLinecap="round" />
          {/* home dot */}
          <circle cx="20" cy="25" r="0.85" fill={terracottaLight} />
          {/* screen highlight */}
          <rect x="14.7" y="10" width="10.6" height="13.5" rx="0.6"
            fill={`${terracotta}1a`} />
        </g>

        {/* curved rotation arrow at the bottom, always visible */}
        <g opacity="0.85">
          <path
            d="M9 33 Q 20 37.5 31 33"
            stroke={terracottaLight}
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M30 31.2 L31.5 33.2 L29.3 33.6 Z"
            fill={terracottaLight}
          />
        </g>
      </svg>
    </div>
  );
}
