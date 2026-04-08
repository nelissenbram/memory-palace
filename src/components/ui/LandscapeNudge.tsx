"use client";

import { useEffect, useState } from "react";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { useTranslation } from "@/lib/hooks/useTranslation";

/**
 * Bottom-right rotate hint on mobile portrait. Minimal: the Palace logo
 * (no background), the word "Rotate" underneath, and a subtle tilt animation
 * so the logo gently rocks portrait → landscape → portrait.
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

  return (
    <div
      aria-label={t("rotateHint")}
      style={{
        position: "absolute",
        right: "1rem",
        bottom: "6rem",
        zIndex: 45,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.375rem",
        animation: "mpLNFadeIn 0.55s cubic-bezier(0.2,0.8,0.2,1) both",
      }}
    >
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
      `}</style>
      <div
        style={{
          transformOrigin: "50% 60%",
          animation: "mpLNRock 3.6s cubic-bezier(0.65,0,0.35,1) infinite",
          filter: "drop-shadow(0 0.25rem 0.5rem rgba(0,0,0,0.35))",
        }}
      >
        <PalaceLogo variant="mark" color="dark" size="md" />
      </div>
      <span
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "0.8125rem",
          fontStyle: "italic",
          fontWeight: 500,
          color: "#F5EFE4",
          letterSpacing: "0.08em",
          textTransform: "lowercase",
          textShadow: "0 0.0625rem 0.25rem rgba(0,0,0,0.6), 0 0 0.75rem rgba(0,0,0,0.4)",
        }}
      >
        {t("rotateHint")}
      </span>
    </div>
  );
}
