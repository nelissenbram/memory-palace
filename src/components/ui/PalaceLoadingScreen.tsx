"use client";
import { useMemo } from "react";
import { T } from "@/lib/theme";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { useTranslation } from "@/lib/hooks/useTranslation";

const LOADING_PHRASE_COUNT = 10;

/**
 * Unified loading screen used everywhere in the Palace flow:
 *   1. Dynamic-import fallback (page.tsx)
 *   2. Profile-loading gate (MemoryPalace.tsx)
 *   3. Scene-loading overlay (MemoryPalace.tsx)
 *
 * All three render the exact same visuals so the user never sees
 * a font/layout shift between loading stages.
 */
export default function PalaceLoadingScreen({
  overlay = false,
  fadeDelay = 0,
}: {
  /** When true, renders as a positioned overlay with fade-out animation (for scene loading). */
  overlay?: boolean;
  /** Seconds to hold fully visible before starting the fade-out (overlay mode only). */
  fadeDelay?: number;
}) {
  const { t } = useTranslation("palace");

  const phrase = useMemo(() => {
    const idx = Math.floor(Math.random() * LOADING_PHRASE_COUNT);
    return `loadingPhrase${idx}` as const;
  }, []);

  const content = (
    <>
      <div style={{ marginBottom: "1.5rem" }}>
        <PalaceLogo variant="mark" color="dark" size="xl" />
      </div>
      <div
        style={{
          fontSize: "1.75rem",
          fontWeight: 300,
          color: T.color.charcoal,
        }}
      >
        {t("appTitle")}
      </div>
      <div
        style={{
          fontSize: "0.9375rem",
          color: T.color.muted,
          marginTop: "0.75rem",
          fontFamily: T.font.body,
          fontStyle: "italic",
        }}
      >
        {t(phrase)}
      </div>
    </>
  );

  if (overlay) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone} 100%)`,
          fontFamily: T.font.display,
          animation: `sceneLoadFadeOut 0.8s ease-in-out ${fadeDelay}s forwards`,
          pointerEvents: "none",
        }}
      >
        {/* Top progress bar */}
        <style>{`@keyframes palaceProgressSlide{0%{transform:translateX(-100%)}50%{transform:translateX(0%)}100%{transform:translateX(100%)}}`}</style>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "0.1875rem",
          background: `${T.color.warmStone}40`,
          overflow: "hidden",
        }}>
          <div style={{
            width: "40%",
            height: "100%",
            background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.gold})`,
            borderRadius: "0 2px 2px 0",
            animation: "palaceProgressSlide 1.8s ease-in-out infinite",
          }} />
        </div>
        {content}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone} 100%)`,
        fontFamily: T.font.display,
      }}
    >
      {/* Top progress bar */}
      <style>{`@keyframes palaceProgressSlide{0%{transform:translateX(-100%)}50%{transform:translateX(0%)}100%{transform:translateX(100%)}}`}</style>
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "0.1875rem",
        background: `${T.color.warmStone}40`,
        overflow: "hidden",
      }}>
        <div style={{
          width: "40%",
          height: "100%",
          background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.gold})`,
          borderRadius: "0 2px 2px 0",
          animation: "palaceProgressSlide 1.8s ease-in-out infinite",
        }} />
      </div>
      {content}
    </div>
  );
}
