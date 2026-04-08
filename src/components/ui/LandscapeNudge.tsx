"use client";

import { useEffect, useState } from "react";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { useTranslation } from "@/lib/hooks/useTranslation";

/**
 * Bottom-right rotate hint on mobile portrait. A vertical trio of Palace
 * logo marks — small, medium (rotating on its Y-axis like a 3D flip),
 * and the existing gently-rocking larger one — paired with the label
 * "rotate for better view". No backgrounds. All drop-shadowed for legibility
 * over the 3D scene. Also shows a small controls hint on the bottom-left.
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

  return (<>
    <style>{`
      @keyframes mpLNFadeIn {
        from { opacity: 0; transform: translateY(0.5rem); }
        to   { opacity: 0.92; transform: translateY(0); }
      }
      @keyframes mpLNRock {
        0%, 30%  { transform: rotate(0deg); }
        50%, 70% { transform: rotate(-22deg); }
        90%,100% { transform: rotate(0deg); }
      }
      @keyframes mpLNSpinY {
        0%   { transform: perspective(200px) rotateY(0deg); }
        100% { transform: perspective(200px) rotateY(360deg); }
      }
      @keyframes mpLNBreathe {
        0%,100% { opacity: 0.55; transform: scale(1); }
        50%     { opacity: 0.9;  transform: scale(1.08); }
      }
    `}</style>

    {/* ── Controls hint (bottom-left) ── */}
    <div
      aria-label={t("controlsHint")}
      style={{
        position: "absolute",
        left: "1rem",
        bottom: "6rem",
        zIndex: 45,
        pointerEvents: "none",
        maxWidth: "9rem",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: "0.75rem",
        fontStyle: "italic",
        color: "#F5EFE4",
        opacity: 0.85,
        letterSpacing: "0.03em",
        lineHeight: 1.35,
        textShadow: "0 0.0625rem 0.25rem rgba(0,0,0,0.65), 0 0 0.75rem rgba(0,0,0,0.4)",
        animation: "mpLNFadeIn 0.55s cubic-bezier(0.2,0.8,0.2,1) both",
      }}
    >
      {t("controlsHint")}
    </div>

    {/* ── Rotate nudge (bottom-right) — trio of logos + label ── */}
    <div
      aria-label={t("rotateHint")}
      style={{
        position: "absolute",
        right: "0.75rem",
        bottom: "6rem",
        zIndex: 45,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        animation: "mpLNFadeIn 0.55s cubic-bezier(0.2,0.8,0.2,1) both",
      }}
    >
      {/* Row of three logos: small · Y-spinning · rocking */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          filter: "drop-shadow(0 0.25rem 0.5rem rgba(0,0,0,0.4))",
        }}
      >
        {/* Small breathing logo */}
        <div
          style={{
            transform: "scale(0.55)",
            transformOrigin: "center",
            animation: "mpLNBreathe 2.8s ease-in-out infinite",
          }}
        >
          <PalaceLogo variant="mark" color="dark" size="sm" />
        </div>
        {/* Medium logo spinning on Y-axis (3D flip) */}
        <div
          style={{
            transformStyle: "preserve-3d",
            animation: "mpLNSpinY 3.2s linear infinite",
          }}
        >
          <PalaceLogo variant="mark" color="dark" size="md" />
        </div>
        {/* Larger rocking logo (portrait → landscape tilt) */}
        <div
          style={{
            transformOrigin: "50% 60%",
            animation: "mpLNRock 3.6s cubic-bezier(0.65,0,0.35,1) infinite",
          }}
        >
          <PalaceLogo variant="mark" color="dark" size="md" />
        </div>
      </div>

      <span
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "0.75rem",
          fontStyle: "italic",
          fontWeight: 500,
          color: "#F5EFE4",
          letterSpacing: "0.04em",
          textAlign: "center",
          maxWidth: "10rem",
          lineHeight: 1.25,
          textShadow: "0 0.0625rem 0.25rem rgba(0,0,0,0.6), 0 0 0.75rem rgba(0,0,0,0.4)",
        }}
      >
        {t("rotateHint")}
      </span>
    </div>
  </>);
}
