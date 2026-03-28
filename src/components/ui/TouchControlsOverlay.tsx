"use client";
import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

const LS_KEY = "mp_touch_tutorial_seen";

interface TouchControlsOverlayProps {
  view: string;
}

export default function TouchControlsOverlay({ view }: TouchControlsOverlayProps) {
  const { t } = useTranslation("touchControls");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (view !== "corridor" && view !== "room" && view !== "entrance") return;
    if (localStorage.getItem(LS_KEY)) return;
    setVisible(true);
    const timer = setTimeout(() => dismiss(), 5000);
    return () => clearTimeout(timer);
  }, [view]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(LS_KEY, "1");
  };

  if (!visible) return null;

  const isCorridor = view === "corridor" || view === "entrance";

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 16,
        right: 16,
        zIndex: 46,
        animation: "fadeUp .4s ease",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          background: "rgba(42, 34, 24, 0.72)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: 16,
          padding: "16px 20px",
          border: "1px solid rgba(212, 197, 178, 0.2)",
          boxShadow: "0 8px 32px rgba(44, 44, 42, 0.3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Instruction text */}
        <div
          style={{
            fontFamily: T.font.body,
            fontSize: 13,
            fontWeight: 500,
            color: T.color.linen,
            textAlign: "center",
            lineHeight: 1.5,
            letterSpacing: 0.2,
          }}
        >
          {isCorridor
            ? t("desktopHint")
            : t("mobileHint")}
        </div>

        {/* Diagram for room view */}
        {!isCorridor && (
          <div
            style={{
              display: "flex",
              gap: 2,
              width: "100%",
              maxWidth: 220,
              height: 48,
              borderRadius: 10,
              overflow: "hidden",
              border: "1px solid rgba(212, 197, 178, 0.25)",
            }}
          >
            {/* Left half — movement */}
            <div
              style={{
                flex: 1,
                background: "rgba(74, 103, 65, 0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="rgba(250,250,247,0.5)" strokeWidth="1.5" fill="none" />
                <circle cx="10" cy="10" r="3" fill="rgba(250,250,247,0.6)" />
                <path d="M10 4L10 7M10 13L10 16M4 10L7 10M13 10L16 10" stroke="rgba(250,250,247,0.4)" strokeWidth="1" />
              </svg>
              <span style={{ fontFamily: T.font.body, fontSize: 9, color: "rgba(250,250,247,0.7)" }}>{t("move")}</span>
            </div>
            {/* Right half — camera */}
            <div
              style={{
                flex: 1,
                background: "rgba(193, 127, 89, 0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="7" stroke="rgba(250,250,247,0.5)" strokeWidth="1.5" fill="none" />
                <path d="M10 5L10 10L14 8" stroke="rgba(250,250,247,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontFamily: T.font.body, fontSize: 9, color: "rgba(250,250,247,0.7)" }}>{t("look")}</span>
            </div>
          </div>
        )}

        {/* Got it button */}
        <button
          onClick={dismiss}
          style={{
            background: "rgba(250, 250, 247, 0.15)",
            border: "1px solid rgba(250, 250, 247, 0.25)",
            borderRadius: 20,
            padding: "6px 24px",
            fontFamily: T.font.body,
            fontSize: 12,
            fontWeight: 600,
            color: T.color.linen,
            cursor: "pointer",
            letterSpacing: 0.5,
          }}
        >
          {t("gotIt")}
        </button>
      </div>
    </div>
  );
}
