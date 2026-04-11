"use client";

import { useEffect, useState } from "react";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { useTranslation } from "@/lib/hooks/useTranslation";

/**
 * Bottom strip on mobile portrait: three Palace logo marks, each paired with
 * its own instruction — pinch to zoom, drag to rotate, rotate for better view.
 * The small logo pulses in scale; the middle one flips on its Y-axis (slow);
 * the right one rocks portrait→landscape. No backgrounds. All drop-shadowed.
 */
export default function LandscapeNudge() {
  const { t } = useTranslation("exterior3d");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      // Show on any phone-sized viewport (portrait OR landscape). Landscape
      // phones still need the drag/pinch/rotate hints.
      const isPhone = window.innerWidth < 768 || window.innerHeight < 500;
      setVisible(isPhone);
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

  // All three logo animations share the same period so they feel coordinated.
  const PERIOD = "4.8s";

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: "0.75rem",
    fontStyle: "italic",
    fontWeight: 500,
    color: "#F5EFE4",
    letterSpacing: "0.04em",
    textAlign: "center",
    maxWidth: "6.5rem",
    lineHeight: 1.25,
    textShadow:
      "0 0.0625rem 0.25rem rgba(0,0,0,0.65), 0 0 0.75rem rgba(0,0,0,0.4)",
  };

  const columnStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "0.5rem",
    flex: 1,
  };

  const logoWrap: React.CSSProperties = {
    height: "3rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    filter: "drop-shadow(0 0.25rem 0.5rem rgba(0,0,0,0.45))",
  };

  return (<>
    <style>{`
      @keyframes mpLNFadeIn {
        from { opacity: 0; transform: translateY(0.5rem); }
        to   { opacity: 0.95; transform: translateY(0); }
      }
      @keyframes mpLNRock {
        0%, 25%  { transform: rotate(0deg); }
        50%      { transform: rotate(-24deg); }
        75%,100% { transform: rotate(0deg); }
      }
      @keyframes mpLNSpinY {
        0%   { transform: perspective(240px) rotateY(0deg); }
        100% { transform: perspective(240px) rotateY(360deg); }
      }
      @keyframes mpLNGrow {
        0%,100% { transform: scale(0.45); opacity: 0.55; }
        50%     { transform: scale(1.05); opacity: 1; }
      }
    `}</style>

    {/* Bottom strip of three paired logo+instruction columns */}
    <div
      aria-label={t("rotateHint")}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "5.5rem",
        zIndex: 45,
        pointerEvents: "none",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-around",
        padding: "0 1rem",
        animation: "mpLNFadeIn 0.6s cubic-bezier(0.2,0.8,0.2,1) both",
      }}
    >
      {/* Column 1: Growing logo → pinch to zoom */}
      <div style={columnStyle}>
        <div style={logoWrap}>
          <div
            style={{
              transformOrigin: "center",
              animation: `mpLNGrow ${PERIOD} ease-in-out infinite`,
            }}
          >
            <PalaceLogo variant="mark" color="dark" size="md" />
          </div>
        </div>
        <span style={labelStyle}>{t("pinchHint")}</span>
      </div>

      {/* Column 2: Y-axis spinning logo → drag to rotate */}
      <div style={columnStyle}>
        <div style={logoWrap}>
          <div
            style={{
              transformStyle: "preserve-3d",
              animation: `mpLNSpinY ${PERIOD} linear infinite`,
            }}
          >
            <PalaceLogo variant="mark" color="dark" size="md" />
          </div>
        </div>
        <span style={labelStyle}>{t("dragHint")}</span>
      </div>

      {/* Column 3: Rocking logo → rotate for better view */}
      <div style={columnStyle}>
        <div style={logoWrap}>
          <div
            style={{
              transformOrigin: "50% 60%",
              animation: `mpLNRock ${PERIOD} cubic-bezier(0.65,0,0.35,1) infinite`,
            }}
          >
            <PalaceLogo variant="mark" color="dark" size="md" />
          </div>
        </div>
        <span style={labelStyle}>{t("rotateHint")}</span>
      </div>
    </div>
  </>);
}
