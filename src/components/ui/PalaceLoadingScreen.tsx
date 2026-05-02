"use client";
import { useMemo } from "react";
import { T } from "@/lib/theme";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { useTranslation } from "@/lib/hooks/useTranslation";

const LOADING_PHRASE_COUNT = 10;

export default function PalaceLoadingScreen({
  overlay = false,
  fadeDelay = 0,
}: {
  overlay?: boolean;
  fadeDelay?: number;
}) {
  const { t } = useTranslation("palace");

  const phrase = useMemo(() => {
    const idx = Math.floor(Math.random() * LOADING_PHRASE_COUNT);
    return `loadingPhrase${idx}` as const;
  }, []);

  const progressBar = (
    <>
      <style>{`@keyframes palaceProgressSlide{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div style={{
        width: "min(16rem, 60vw)",
        height: "0.25rem",
        borderRadius: "0.125rem",
        background: `${T.color.sandstone}40`,
        overflow: "hidden",
        marginTop: "1.5rem",
      }}>
        <div style={{
          width: "40%",
          height: "100%",
          background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.gold})`,
          borderRadius: "0.125rem",
          animation: "palaceProgressSlide 1.4s ease-in-out infinite",
        }} />
      </div>
    </>
  );

  const content = (
    <>
      <div style={{ marginBottom: "1.5rem" }}>
        <PalaceLogo variant="mark" color="dark" size="xl" />
      </div>
      <div style={{
        fontSize: "1.75rem",
        fontWeight: 300,
        color: T.color.charcoal,
      }}>
        {t("appTitle")}
      </div>
      <div style={{
        fontSize: "0.9375rem",
        color: T.color.muted,
        marginTop: "0.75rem",
        fontFamily: T.font.body,
        fontStyle: "italic",
      }}>
        {t(phrase)}
      </div>
      {progressBar}
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
      {content}
    </div>
  );
}
