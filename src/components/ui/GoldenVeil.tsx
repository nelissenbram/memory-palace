"use client";
import { PLASTER, INK, GOLD } from "@/lib/3d/canon";
import { useTranslation } from "@/lib/hooks/useTranslation";

const FRAUNCES = "'Fraunces', Georgia, serif";

/**
 * MUSEO VIVO WS9-8 — the golden veil for WARM scene hops (flag w2_veil).
 *
 * When the target scene's module is already loaded and that scene type has
 * fired onReady this session, transitions show this ≤1s cream→gold crossfade
 * instead of the full canon loading card (which stays reserved for cold
 * loads). Same canon language as PalaceLoadingScreen: plaster ground, one
 * subtle gold accent, Fraunces destination line — no logo, no progress bar.
 *
 * Lifecycle is parent-driven (MemoryPalace): mounts fading in (~0.18s),
 * `fading` flips on the scene's onReady (or the 1s fallback) and the veil
 * crossfades to transparent (~0.45s) before the parent unmounts it.
 */
export default function GoldenVeil({
  destination,
  fading = false,
}: {
  /** Name of the place being entered (wing, room, hall) — shown when known. */
  destination?: string;
  /** True once the destination scene is ready — starts the fade-out. */
  fading?: boolean;
}) {
  const { t } = useTranslation("palace");
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        // Canon plaster with a barely-there golden bloom at the horizon line.
        background: `radial-gradient(120% 85% at 50% 42%, #F7F0E3 0%, ${PLASTER} 55%, #EADCC2 100%)`,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.45s ease",
        // Fill-mode animation only while entering; removed when fading so the
        // inline opacity + transition take over for the crossfade out.
        animation: fading ? "none" : "goldenVeilIn 0.18s ease both",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <style>{`@keyframes goldenVeilIn{from{opacity:0}to{opacity:1}}`}</style>
      <div
        style={{
          width: "2.25rem",
          height: "0.125rem",
          borderRadius: "0.0625rem",
          background: GOLD,
          opacity: 0.85,
          marginBottom: "0.875rem",
        }}
      />
      {destination && (
        <div
          style={{
            fontFamily: FRAUNCES,
            fontSize: "1.25rem",
            fontWeight: 500,
            color: INK,
          }}
        >
          {t("loadingDestination", { name: destination })}
        </div>
      )}
    </div>
  );
}
