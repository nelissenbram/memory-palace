"use client";
import { useMemo } from "react";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { PLASTER, INK, GOLD } from "@/lib/3d/canon";

const LOADING_PHRASE_COUNT = 10;

/**
 * WS10-3 — the ONE canon loading card. Owner and visitor loaders alike render
 * this exact card while a 3D scene loads: warm plaster ground, ink type set in
 * Fraunces, a single subtle gold accent. No cold or blue spinners, ever.
 */
const FRAUNCES = "'Fraunces', Georgia, serif";

export default function PalaceLoadingScreen({
  overlay = false,
  fadeDelay = 0,
  destination,
}: {
  overlay?: boolean;
  fadeDelay?: number;
  /** Name of the place being entered (wing, room, hall) — shown when known. */
  destination?: string;
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
        height: "0.1875rem",
        borderRadius: "0.125rem",
        background: `${GOLD}2E`,
        overflow: "hidden",
        marginTop: "1.5rem",
      }}>
        <div style={{
          width: "40%",
          height: "100%",
          background: GOLD,
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
        fontFamily: FRAUNCES,
        fontSize: "1.75rem",
        fontWeight: 300,
        color: INK,
      }}>
        {t("appTitle")}
      </div>
      {destination && (
        <div style={{
          fontFamily: FRAUNCES,
          fontSize: "1.0625rem",
          fontWeight: 500,
          color: INK,
          marginTop: "0.75rem",
        }}>
          {t("loadingDestination", { name: destination })}
        </div>
      )}
      <div style={{
        fontFamily: FRAUNCES,
        fontSize: "0.9375rem",
        fontStyle: "italic",
        color: `${INK}A6`,
        marginTop: destination ? "0.375rem" : "0.75rem",
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
          background: PLASTER,
          fontFamily: FRAUNCES,
          animation: `sceneLoadFadeOut 0.8s ease-in-out ${fadeDelay}s forwards`,
          pointerEvents: "none",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
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
        background: PLASTER,
        fontFamily: FRAUNCES,
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {content}
    </div>
  );
}
