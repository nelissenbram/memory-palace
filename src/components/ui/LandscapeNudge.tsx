"use client";

import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
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
    <div
      onClick={dismiss}
      role="button"
      aria-label={t("rotateHint")}
      style={{
        position: "absolute",
        right: "0.75rem",
        bottom: "5.5rem",
        zIndex: 45,
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 0.75rem",
        borderRadius: "0.75rem",
        background: "rgba(42,34,24,0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(212,175,55,0.25)",
        boxShadow: "0 0.5rem 1.5rem rgba(0,0,0,0.3)",
        color: "rgba(250,250,247,0.9)",
        fontFamily: T.font.body,
        fontSize: "0.75rem",
        letterSpacing: "0.02em",
        cursor: "pointer",
        pointerEvents: "auto",
        animation: "mpRotateIn 0.4s ease both",
        maxWidth: "60vw",
      }}
    >
      <style>{`
        @keyframes mpRotateIn { from { opacity:0; transform:translateY(0.5rem);} to { opacity:1; transform:translateY(0);} }
        @keyframes mpRotateWobble { 0%,100% { transform:rotate(0deg);} 50% { transform:rotate(-8deg);} }
        @keyframes mpRotateIconSpin { 0%,70%,100% { transform:rotate(0deg);} 85% { transform:rotate(-90deg);} }
      `}</style>
      <span
        aria-hidden
        style={{
          display: "inline-block",
          fontSize: "1rem",
          lineHeight: 1,
          animation: "mpRotateIconSpin 2.8s ease-in-out infinite",
          transformOrigin: "center",
        }}
      >
        ⟳
      </span>
      <span>{t("rotateHint")}</span>
    </div>
  );
}
