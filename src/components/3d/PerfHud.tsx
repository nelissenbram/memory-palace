"use client";
/**
 * MUSEO VIVO perf HUD (WS11-1) — dev/staging overlay behind `?perfhud=1`.
 *
 * Shows FPS plus renderer.info of the pooled renderer (draw calls, triangles,
 * geometries / textures / programs), refreshed ~2×/s. Demo-checklist budgets
 * (≤150 draw calls) tint the offending line EMBER. Canon-styled: INK on
 * PLASTER, monospace, rem units. Dev-only — no i18n by design.
 *
 * This mount also owns the WS11-3 staging-assertion lifecycle (perfAssert),
 * so the four scene monoliths stay untouched. The assertion sampler gates
 * itself on flag3d("w1_assert") and runs even when the HUD overlay is hidden.
 */
import { useEffect, useState } from "react";
import { getPooledRenderer } from "@/lib/3d/rendererPool";
import { startPerfAssert, stopPerfAssert } from "@/lib/3d/perfAssert";
import { INK, PLASTER, EMBER } from "@/lib/3d/canon";

const DRAW_CALL_BUDGET = 150;

interface HudStats {
  fps: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
}

export default function PerfHud() {
  // URL param read once at mount (flags3d rule: never per frame).
  const [enabled] = useState<boolean>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("perfhud") === "1"
  );
  const [stats, setStats] = useState<HudStats | null>(null);

  // WS11-3 assertions: alive for the whole mount, HUD visible or not.
  useEffect(() => { startPerfAssert(); return () => stopPerfAssert(); }, []);

  useEffect(() => {
    if (!enabled) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = () => { frames++; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    const tick = setInterval(() => {
      const now = performance.now();
      const fps = Math.round((frames * 1000) / Math.max(1, now - last));
      frames = 0; last = now;
      // renderer.info.render holds the last completed frame (autoReset).
      const info = getPooledRenderer()?.info;
      setStats({
        fps,
        calls: info?.render.calls ?? 0,
        triangles: info?.render.triangles ?? 0,
        geometries: info?.memory.geometries ?? 0,
        textures: info?.memory.textures ?? 0,
        programs: info?.programs?.length ?? 0,
      });
    }, 500); // ~2×/s
    return () => { cancelAnimationFrame(raf); clearInterval(tick); };
  }, [enabled]);

  if (!enabled || !stats) return null;

  const overBudget = stats.calls > DRAW_CALL_BUDGET;
  const row = (label: string, value: string, warn = false) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", color: warn ? EMBER : INK, fontWeight: warn ? 700 : 400 }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );

  return (
    <div
      aria-hidden
      style={{
        position: "fixed", top: "0.5rem", left: "0.5rem", zIndex: 100000,
        background: PLASTER, color: INK,
        border: `0.0625rem solid ${INK}`, borderRadius: "0.25rem",
        padding: "0.375rem 0.5rem", minWidth: "10.5rem",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: "0.6875rem", lineHeight: 1.5,
        pointerEvents: "none", opacity: 0.92,
      }}
    >
      {row("fps", String(stats.fps))}
      {row("draw calls", `${stats.calls}${overBudget ? ` >${DRAW_CALL_BUDGET}!` : ""}`, overBudget)}
      {row("triangles", stats.triangles.toLocaleString())}
      {row("geometries", String(stats.geometries))}
      {row("textures", String(stats.textures))}
      {row("programs", String(stats.programs))}
    </div>
  );
}
