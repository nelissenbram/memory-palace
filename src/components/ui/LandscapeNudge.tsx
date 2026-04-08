"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";

/**
 * Persistent bottom-right hint suggesting the user rotate to landscape for a
 * better view of the Palace exterior. Shown only on mobile + portrait.
 *
 * Classier v3: wide frosted-glass pill with gold→terracotta gradient border,
 * animated tilting phone + arc arrow, and a short label. Elevated but subtle.
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

  const terracotta = "#C97B57";
  const gold = "#D4A574";
  const cream = "#F5EFE4";

  return (
    <div
      aria-label={t("rotateHint")}
      style={{
        position: "absolute",
        right: "0.75rem",
        bottom: "5.5rem",
        zIndex: 45,
        pointerEvents: "none",
        animation: "mpLNIn 0.55s cubic-bezier(0.2,0.8,0.2,1) both",
      }}
    >
      <style>{`
        @keyframes mpLNIn {
          from { opacity: 0; transform: translateY(0.625rem) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes mpLNPhoneTilt {
          0%, 25%  { transform: rotate(0deg); }
          45%, 70% { transform: rotate(-90deg); }
          90%,100% { transform: rotate(0deg); }
        }
        @keyframes mpLNArc {
          0%, 20%   { stroke-dashoffset: 28; opacity: 0; }
          35%, 60%  { stroke-dashoffset: 0;  opacity: 1; }
          80%, 100% { stroke-dashoffset: 28; opacity: 0; }
        }
        @keyframes mpLNGlow {
          0%, 100% { box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.22), 0 0 0 0 rgba(201,123,87,0.0); }
          50%      { box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.22), 0 0 0 0.375rem rgba(201,123,87,0.12); }
        }
      `}</style>

      {/* gradient-border wrapper */}
      <div
        style={{
          padding: "1px",
          borderRadius: "999px",
          background: `linear-gradient(135deg, ${gold}, ${terracotta}, ${gold})`,
          animation: "mpLNGlow 3.2s ease-in-out infinite",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 0.875rem 0.5rem 0.625rem",
            borderRadius: "999px",
            background: `linear-gradient(135deg, rgba(42,34,24,0.72), rgba(42,34,24,0.58))`,
            backdropFilter: "blur(14px) saturate(140%)",
            WebkitBackdropFilter: "blur(14px) saturate(140%)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden>
            <g
              style={{
                transformOrigin: "20px 20px",
                animation: "mpLNPhoneTilt 3.4s cubic-bezier(0.65,0,0.35,1) infinite",
              }}
            >
              <rect x="14" y="6.5" width="12" height="21" rx="2.2"
                stroke={gold} strokeWidth="1.6" fill={`${terracotta}33`} />
              <line x1="18" y1="9.2" x2="22" y2="9.2"
                stroke={gold} strokeWidth="1" strokeLinecap="round" />
              <circle cx="20" cy="24.6" r="0.8" fill={gold} />
            </g>
            {/* arc arrow */}
            <g>
              <path
                d="M9 33 Q 20 38 31 33"
                stroke={cream}
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
                strokeDasharray="28"
                style={{ animation: "mpLNArc 3.4s ease-in-out infinite" }}
              />
              <path d="M30.2 31 L31.8 33.4 L29.2 33.8 Z" fill={cream} opacity="0.85" />
            </g>
          </svg>
          <span
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: cream,
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
              textShadow: "0 1px 2px rgba(0,0,0,0.4)",
            }}
          >
            {t("rotateHint")}
          </span>
        </div>
      </div>
    </div>
  );
}
