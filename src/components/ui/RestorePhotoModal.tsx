"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { Sheet } from "@/components/ui/Sheet";
import RelayIcons from "@/components/ui/RelayIcons";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { isIOS } from "@/lib/native/platform";
import { IAP_ENABLED } from "@/lib/native/iap-flags";
import type { Mem } from "@/lib/constants/defaults";

interface RestoreQuota {
  allowed: boolean;
  used: number;
  limit: number;
  period: "lifetime" | "month";
}

interface RestorePhotoModalProps {
  /** The photo memory being restored. */
  memory: Mem;
  /** Local room id (e.g. "ro1") the memory lives in — required to save a new memory into the same room. */
  roomId: string;
  onClose: () => void;
  /** Called after a restored copy is successfully saved into the library. */
  onSaved?: () => void;
  /** "right" renders as the Atrium's right-anchored side sheet (used by the
   *  restore picker); default stays the centered modal (Library detail view). */
  side?: "center" | "right";
}

type Phase = "consent" | "processing" | "compare" | "saving" | "done" | "error";

/**
 * "Restore a Photo" client flow. Calls the secure POST /api/ai-enhance backend
 * (which restores the caller's OWN stored photo via Replicate), shows a
 * before/after comparison, and — on Save — persists the restored image as a NEW
 * memory ("<title> (restored)") in the SAME room via the app's normal upload
 * path (memoryStore.addMemory → /api/upload). The original is never touched.
 *
 * Canon: inline styles, rem, T.color tokens, Fraunces + Source Sans, >=2.75rem
 * touch targets, reduced-motion guard on the spinner. iOS IAP seal respected:
 * the quota-upgrade hint is hidden when (isIOS && !IAP_ENABLED).
 */
export default function RestorePhotoModal({ memory, roomId, onClose, onSaved, side = "center" }: RestorePhotoModalProps) {
  const { t } = useTranslation("memoryDetail");
  const { t: tc } = useTranslation("common");
  const isMobile = useIsMobile();
  const { addMemory } = useMemoryStore();

  const [phase, setPhase] = useState<Phase>(() => {
    // One-time consent notice before the first restore (LEG-004). Once acknowledged
    // we skip straight to processing on subsequent restores.
    if (typeof window !== "undefined") {
      try { if (localStorage.getItem("mp_restore_consent") === "1") return "processing"; } catch {}
    }
    return "consent";
  });
  const [originalUrl, setOriginalUrl] = useState<string>(memory.dataUrl || "");
  const [restoredUrl, setRestoredUrl] = useState<string>("");
  const [quota, setQuota] = useState<RestoreQuota | null>(null);
  const [errorKind, setErrorKind] = useState<"generic" | "notConfigured" | "quota" | "service" | "notPhoto">("generic");
  const [sliderPct, setSliderPct] = useState(50);
  const startedRef = useRef(false);
  // Loader theatre for the (possibly minutes-long) restore wait: rotating step
  // copy + an asymptotic progress bar that keeps creeping (never "stuck"),
  // reaching ~90% around the 2-minute cold-start mark and capping at 97%.
  const [loaderStep, setLoaderStep] = useState(0);
  const [loaderPct, setLoaderPct] = useState(0);
  useEffect(() => {
    if (phase !== "processing") return;
    const t0 = Date.now();
    setLoaderStep(0);
    setLoaderPct(0);
    const stepTimer = setInterval(() => setLoaderStep((s) => s + 1), 6000);
    const pctTimer = setInterval(() => {
      const elapsed = (Date.now() - t0) / 1000;
      setLoaderPct(Math.min(97, Math.round(100 * (1 - Math.exp(-elapsed / 52)))));
    }, 500);
    return () => { clearInterval(stepTimer); clearInterval(pctTimer); };
  }, [phase]);

  // Whether we may show a paid upgrade hint at all (iOS free/IAP seal).
  const showUpgradeHint = !(isIOS() && !IAP_ENABLED);

  // ── Kick off the restore on open (once) ──
  const runRestore = useCallback(async () => {
    setPhase("processing");
    setErrorKind("generic");
    try {
      const res = await fetch("/api/ai-enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryId: memory.id }),
      });

      if (res.status === 503) { setErrorKind("notConfigured"); setPhase("error"); return; }
      if (res.status === 422) { setErrorKind("notPhoto"); setPhase("error"); return; }
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        if (data?.quota) setQuota(data.quota as RestoreQuota);
        setErrorKind("quota");
        setPhase("error");
        return;
      }
      if (!res.ok) { setErrorKind("service"); setPhase("error"); return; }

      const data = await res.json();
      if (!data?.ok || !data?.restoredUrl) { setErrorKind("service"); setPhase("error"); return; }
      setOriginalUrl(data.originalUrl || memory.dataUrl || "");
      setRestoredUrl(data.restoredUrl);
      if (data.quota) setQuota(data.quota as RestoreQuota);
      setPhase("compare");
    } catch {
      setErrorKind("service");
      setPhase("error");
    }
  }, [memory.id, memory.dataUrl]);

  useEffect(() => {
    if (phase === "consent") return; // hold until the user acknowledges the notice
    if (startedRef.current) return;
    startedRef.current = true;
    runRestore();
  }, [phase, runRestore]);

  const acceptConsent = useCallback(() => {
    try { localStorage.setItem("mp_restore_consent", "1"); } catch {}
    setPhase("processing");
  }, []);

  // ── Save: fetch the (short-lived) Replicate image → data URL → reuse addMemory,
  //    which decodes + uploads via /api/upload and persists via createMemory. ──
  const handleSave = useCallback(async () => {
    if (!restoredUrl) return;
    setPhase("saving");
    try {
      const imgRes = await fetch(restoredUrl);
      if (!imgRes.ok) throw new Error("fetch failed");
      const blob = await imgRes.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      await addMemory(roomId, {
        id: `restored-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: t("restoreNewTitle", { title: memory.title || tc("untitled") }),
        hue: memory.hue,
        s: memory.s,
        l: memory.l,
        type: "photo",
        dataUrl,
        desc: memory.desc || "",
        createdAt: new Date().toISOString(),
        // LEG-003 (AI Act art. 50): the restored image is AI-generated output.
        source: "ai",
      });

      setPhase("done");
      onSaved?.();
    } catch {
      setErrorKind("service");
      setPhase("error");
    }
  }, [restoredUrl, addMemory, roomId, memory, t, tc, onSaved]);

  const quotaLeft = quota ? Math.max(quota.limit - quota.used, 0) : null;
  const tierKey = quota
    ? quota.period === "lifetime" ? "restoreTierFree" : quota.limit >= 200 ? "restoreTierGuardian" : "restoreTierKeeper"
    : "restoreTierFree";

  // ── Shared style tokens ──
  const primaryBtn: React.CSSProperties = {
    minHeight: T.touch, padding: "0 1.25rem", borderRadius: T.radius.md,
    border: "none", background: T.color.ember, color: T.color.cream,
    fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600, cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
  };
  const ghostBtn: React.CSSProperties = {
    minHeight: T.touch, padding: "0 1.25rem", borderRadius: T.radius.md,
    border: `0.0625rem solid ${T.color.hairline}`, background: T.color.cream, color: T.color.ink,
    fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600, cursor: "pointer",
  };
  const imgStyle: React.CSSProperties = {
    display: "block", width: "100%", height: "100%", objectFit: "contain", background: T.color.warmStone,
  };
  const captionStyle: React.CSSProperties = {
    fontFamily: T.font.body, fontSize: T.fontSize.xs, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", color: T.color.inkMuted, textAlign: "center", marginTop: "0.375rem",
  };

  return (
    <Sheet open onClose={onClose} title={t("restoreModalTitle")} icon={<RelayIcons.restore />} iconTint="terracotta" side={side} maxWidth={side === "right" ? "30rem" : "42rem"}>
      <style>{`
        @keyframes mp-restore-spin { to { transform: rotate(360deg); } }
        @keyframes mp-restore-pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes mp-restore-sweep { 0% { transform: translateX(-100%); } 55%, 100% { transform: translateX(100%); } }
        @media (prefers-reduced-motion: reduce) {
          .mp-restore-spin, .mp-restore-pulse, .mp-restore-sweep { animation: none !important; }
          .mp-restore-sweep { display: none; }
        }
      `}</style>

      {/* ── CONSENT (one-time notice before the first restore) ── */}
      {phase === "consent" && (
        <div style={{ padding: "1.5rem 1rem 0.5rem" }}>
          <p style={{ fontFamily: T.font.display, fontSize: T.fontSize.lg, color: T.color.ink, margin: "0 0 0.75rem" }}>
            {t("restoreConsentTitle")}
          </p>
          <p style={{ fontFamily: T.font.body, fontSize: T.fontSize.base, color: T.color.inkMuted, lineHeight: 1.55, margin: "0 0 1.5rem" }}>
            {t("restoreConsentBody")}
          </p>
          <div style={{ display: "flex", gap: T.space.sm, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button onClick={onClose} style={ghostBtn}>{tc("cancel")}</button>
            <button onClick={acceptConsent} style={primaryBtn}>{t("restoreConsentContinue")}</button>
          </div>
        </div>
      )}

      {/* ── PROCESSING (loader theatre: the photo itself under a sweeping light,
             rotating step copy, and a slowly filling progress bar) ── */}
      {phase === "processing" && (() => {
        const loaderMsgs = [
          t("restoreLoaderStep1"), t("restoreLoaderStep2"),
          t("restoreLoaderStep3"), t("restoreLoaderStep4"),
        ];
        return (
          <div style={{ textAlign: "center", padding: "1.5rem 1rem 2rem" }}>
            {originalUrl ? (
              <div style={{ position: "relative", width: "min(15rem, 75%)", aspectRatio: "1 / 1", margin: "0 auto 1.5rem", borderRadius: T.radius.md, overflow: "hidden", background: T.color.warmStone, boxShadow: T.shadow[1] }}>
                <img src={originalUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "sepia(0.2) contrast(0.95)" }} />
                <div
                  className="mp-restore-sweep"
                  aria-hidden
                  style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(105deg, transparent 38%, rgba(255,243,214,0.6) 50%, transparent 62%)",
                    animation: "mp-restore-sweep 2.6s ease-in-out infinite",
                  }}
                />
              </div>
            ) : (
              <div
                className="mp-restore-spin"
                aria-hidden
                style={{
                  width: "2.75rem", height: "2.75rem", margin: "0 auto 1.25rem",
                  border: `0.1875rem solid ${T.color.hairline}`, borderTopColor: T.color.ember,
                  borderRadius: "50%", animation: "mp-restore-spin 0.9s linear infinite",
                }}
              />
            )}
            <p style={{ fontFamily: T.font.display, fontSize: T.fontSize.lg, color: T.color.ink, margin: "0 0 0.375rem" }}>
              {t("restoreProcessingTitle")}
            </p>
            <p
              className="mp-restore-pulse"
              aria-live="polite"
              style={{ fontFamily: T.font.body, fontSize: T.fontSize.base, color: T.color.inkMuted, margin: 0, animation: "mp-restore-pulse 2s ease-in-out infinite" }}
            >
              {loaderMsgs[loaderStep % loaderMsgs.length]}
            </p>
            <div style={{ height: "0.375rem", maxWidth: "15rem", margin: "1.25rem auto 0", borderRadius: "0.1875rem", background: T.color.hairline, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${loaderPct}%`, background: T.color.ember, borderRadius: "0.1875rem", transition: "width 0.5s ease" }} />
            </div>
            <p style={{ fontFamily: T.font.body, fontSize: T.fontSize.xs, color: T.color.inkMuted, margin: "0.5rem 0 0" }}>
              {t("restoreProcessingBody")}
            </p>
          </div>
        );
      })()}

      {/* ── COMPARE (before / after) ── */}
      {(phase === "compare" || phase === "saving") && (
        <div>
          {isMobile || side === "right" ? (
            /* Mobile + right-rail sheet: draggable slider over stacked before/after
               (the 30rem rail is too narrow for a side-by-side pair). */
            <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: T.radius.md, overflow: "hidden", background: T.color.warmStone }}>
              <img src={originalUrl} alt={t("restoreBeforeLabel")} style={{ position: "absolute", inset: 0, ...imgStyle }} />
              <div style={{ position: "absolute", inset: 0, width: `${sliderPct}%`, overflow: "hidden" }}>
                <img src={restoredUrl} alt={t("restoreAfterLabel")} style={{ ...imgStyle, position: "absolute", inset: 0, width: `${sliderPct > 0 ? 10000 / sliderPct : 100}%`, maxWidth: "none" }} />
              </div>
              {/* Divider handle */}
              <div style={{ position: "absolute", top: 0, bottom: 0, left: `${sliderPct}%`, width: "0.125rem", background: T.color.cream, boxShadow: T.shadow[1], transform: "translateX(-50%)", pointerEvents: "none" }} />
              <input
                type="range" min={0} max={100} value={sliderPct}
                aria-label={t("restoreSliderLabel")}
                onChange={(e) => setSliderPct(Number(e.target.value))}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", margin: 0, opacity: 0, cursor: "ew-resize" }}
              />
              <span style={{ position: "absolute", top: "0.5rem", left: "0.5rem", background: "rgba(20,16,12,0.6)", color: T.color.cream, fontFamily: T.font.body, fontSize: T.fontSize.xs, fontWeight: 700, padding: "0.125rem 0.5rem", borderRadius: T.radius.sm }}>{t("restoreBeforeLabel")}</span>
              <span style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "rgba(184,92,56,0.85)", color: T.color.cream, fontFamily: T.font.body, fontSize: T.fontSize.xs, fontWeight: 700, padding: "0.125rem 0.5rem", borderRadius: T.radius.sm }}>{t("restoreAfterLabel")}</span>
            </div>
          ) : (
            /* Desktop: side by side. */
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: T.space.sm }}>
              <div>
                <div style={{ aspectRatio: "1 / 1", borderRadius: T.radius.md, overflow: "hidden", background: T.color.warmStone }}>
                  <img src={originalUrl} alt={t("restoreBeforeLabel")} style={imgStyle} />
                </div>
                <div style={captionStyle}>{t("restoreBeforeLabel")}</div>
              </div>
              <div>
                <div style={{ aspectRatio: "1 / 1", borderRadius: T.radius.md, overflow: "hidden", background: T.color.warmStone, outline: `0.125rem solid ${T.color.ember}`, outlineOffset: "-0.125rem" }}>
                  <img src={restoredUrl} alt={t("restoreAfterLabel")} style={imgStyle} />
                </div>
                <div style={{ ...captionStyle, color: T.color.ember }}>{t("restoreAfterLabel")}</div>
              </div>
            </div>
          )}

          {quotaLeft !== null && (
            <p style={{ fontFamily: T.font.body, fontSize: T.fontSize.sm, color: T.color.inkMuted, textAlign: "center", margin: `${T.space.md} 0 0` }}>
              {t("restoreQuotaLeft", { left: String(quotaLeft), limit: String(quota!.limit) })}
            </p>
          )}

          <div style={{ display: "flex", gap: T.space.sm, justifyContent: "flex-end", flexWrap: "wrap", marginTop: T.space.md }}>
            <button onClick={onClose} style={ghostBtn} disabled={phase === "saving"}>{t("restoreDiscard")}</button>
            <button onClick={handleSave} style={{ ...primaryBtn, opacity: phase === "saving" ? 0.7 : 1 }} disabled={phase === "saving"}>
              {phase === "saving" ? t("restoreSaving") : t("restoreSave")}
            </button>
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {phase === "done" && (
        <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <p style={{ fontFamily: T.font.display, fontSize: T.fontSize.lg, color: T.color.ink, margin: "0 0 0.5rem" }}>{t("restoreSavedTitle")}</p>
          <p style={{ fontFamily: T.font.body, fontSize: T.fontSize.base, color: T.color.inkMuted, margin: "0 0 1.25rem" }}>{t("restoreSavedBody")}</p>
          <button onClick={onClose} style={primaryBtn}>{tc("done")}</button>
        </div>
      )}

      {/* ── ERROR STATES ── */}
      {phase === "error" && (
        <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
          <p style={{ fontFamily: T.font.display, fontSize: T.fontSize.lg, color: T.color.ink, margin: "0 0 0.5rem" }}>
            {errorKind === "notConfigured" ? t("restoreNotConfiguredTitle")
              : errorKind === "quota" ? t("restoreQuotaTitle")
              : errorKind === "notPhoto" ? t("restoreNotPhotoTitle")
              : t("restoreErrorTitle")}
          </p>
          <p style={{ fontFamily: T.font.body, fontSize: T.fontSize.base, color: T.color.inkMuted, margin: "0 0 1.25rem" }}>
            {errorKind === "notConfigured" ? t("restoreNotConfiguredBody")
              : errorKind === "quota" ? t("restoreQuotaBody", { tier: t(tierKey), limit: String(quota?.limit ?? 0) })
              : errorKind === "notPhoto" ? t("restoreNotPhotoBody")
              : t("restoreErrorBody")}
          </p>

          {/* Quota upgrade hint — hidden on iOS while IAP is sealed. */}
          {errorKind === "quota" && showUpgradeHint && quota?.period === "lifetime" && (
            <p style={{ fontFamily: T.font.body, fontSize: T.fontSize.sm, color: T.color.inkMuted, margin: "0 0 1.25rem" }}>{t("restoreQuotaUpgradeHint")}</p>
          )}

          <div style={{ display: "flex", gap: T.space.sm, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={onClose} style={ghostBtn}>{tc("close")}</button>
            {errorKind === "service" && (
              <button onClick={runRestore} style={primaryBtn}>{t("tryAgain")}</button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
