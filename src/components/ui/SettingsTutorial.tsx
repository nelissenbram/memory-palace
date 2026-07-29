"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { isIOS } from "@/lib/native/platform";
import { IAP_ENABLED } from "@/lib/native/iap-flags";
import { CREAM, INK, MUTED, HAIRLINE, EMBER, EMBER_GLYPH, SHADOW } from "@/lib/libraryTokens";

interface SettingsTourState {
  open: boolean;
  setOpen: (v: boolean) => void;
}
export const useSettingsTourStore = create<SettingsTourState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
}));

// Mirrors the collapsed 7-item settings nav: Cookies folded into Security,
// Connections folded under Profile — so no separate tutorial bullets for them.
const FEATURE_KEYS = [
  { titleKey: "feat_profile_title", descKey: "feat_profile_desc" },
  { titleKey: "feat_family_title", descKey: "feat_family_desc" },
  { titleKey: "feat_subscription_title", descKey: "feat_subscription_desc" },
  { titleKey: "feat_notifications_title", descKey: "feat_notifications_desc" },
  { titleKey: "feat_legacy_title", descKey: "feat_legacy_desc" },
  { titleKey: "feat_security_title", descKey: "feat_security_desc" },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsTutorial({ open, onClose }: Props) {
  const { t } = useTranslation("settingsTour");
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [targetBox, setTargetBox] = useState<DOMRect | null>(null);
  // Reactive viewport width so tooltip geometry re-lays-out on rotation/resize
  // even when the measured target rect is unchanged.
  const [vw, setVw] = useState(0);
  // Live root font size (px per rem). Tracked reactively so the spotlight
  // cutout and tooltip geometry — which must be expressed in px because they
  // feed getBoundingClientRect() math and SVG rect coordinates — still scale
  // when the user changes their browser/OS text-size preference.
  const [remPx, setRemPx] = useState(16);
  const primaryBtnRef = useRef<HTMLButtonElement | null>(null);
  const skipBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (open) setStep(0); }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setVw(window.innerWidth);
  }, []);

  // Read the live px-per-rem so geometry constants below track text scaling.
  const measureRem = useCallback(() => {
    if (typeof window === "undefined") return;
    const fs = parseFloat(getComputedStyle(document.documentElement).fontSize);
    if (fs > 0) setRemPx(fs);
  }, []);

  // Lock body scroll only while tutorial overlay is visible
  useEffect(() => {
    if (!open || !mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, mounted]);

  // Track viewport width reactively so both the highlight cutout and the
  // tooltip re-position on rotation/resize.
  useEffect(() => {
    if (!open || !mounted) return;
    const onResize = () => { setVw(window.innerWidth); measureRem(); };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, mounted, measureRem]);

  // Measure the tab bar for step 0
  useLayoutEffect(() => {
    if (!open || step !== 0) { setTargetBox(null); return; }
    const measure = () => {
      const el = document.querySelector("[data-mp-settings-tabs]") as HTMLElement | null;
      if (el) setTargetBox(el.getBoundingClientRect());
    };
    measure();
    let ticking = false;
    const throttled = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => { measure(); ticking = false; });
      }
    };
    window.addEventListener("resize", throttled);
    window.addEventListener("scroll", throttled, { passive: true, capture: true });
    return () => {
      window.removeEventListener("resize", throttled);
      window.removeEventListener("scroll", throttled, { passive: true, capture: true } as any);
    };
  }, [open, step]);

  // a11y: Escape closes; focus the primary control on open/step change; trap
  // focus between Skip and Next/Done to honour the aria-modal contract.
  const trapFocus = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
    if (e.key !== "Tab") return;
    const first = skipBtnRef.current;
    const last = primaryBtnRef.current;
    if (!first || !last) return;
    const active = document.activeElement;
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }, [onClose]);

  useEffect(() => {
    if (!open || !mounted) return;
    const id = requestAnimationFrame(() => primaryBtnRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, mounted, step]);

  if (!mounted || !open) return null;

  const viewportW = vw || (typeof window !== "undefined" ? window.innerWidth : 320);

  const totalSteps = 2;
  // ── Canon re-skin: cream card, ink text, hairline border, warm-ink shadow. ──
  const cardBg = CREAM;
  const cardBorder = HAIRLINE;
  const cardShadow = SHADOW[2];
  const scrim = "rgba(64,59,54,0.45)"; // warm-ink veil

  // ── Step 0: highlight top tab bar with a cream tooltip ──
  if (step === 0) {
    // SVG rect + getBoundingClientRect() math is inherently px, but the px
    // values are derived from rem via the live root font size so the spotlight
    // and tooltip track the user's text-scaling preference.
    const rem = (n: number) => n * remPx; // rem → px at the current root size
    const padPx = rem(0.375);
    const r = "0.75rem";
    const rPx = rem(0.75);
    const t_ = targetBox ? targetBox.top - padPx : 0;
    const l_ = targetBox ? targetBox.left - padPx : 0;
    const w_ = targetBox ? targetBox.width + padPx * 2 : 0;
    const h_ = targetBox ? targetBox.height + padPx * 2 : 0;

    // Tooltip position: above the highlighted bar (all offsets in rem→px)
    const gutter = rem(1);      // 1rem viewport gutter
    const tipWidth = isMobile ? Math.min(viewportW - rem(2), rem(20)) : rem(17.5);
    const tipEstH = rem(7.5);   // estimated tooltip height (~120px @16)
    const tipGap = rem(0.75);   // gap between tooltip and highlighted bar
    const tipTop = targetBox ? Math.max(gutter, t_ - tipEstH - tipGap) : rem(5);
    const tipLeft = targetBox
      ? Math.max(gutter, Math.min(viewportW - tipWidth - gutter, l_ + w_ / 2 - tipWidth / 2))
      : gutter;

    const overlay = (
      <div role="dialog" aria-modal="true" aria-label={t("step1Title")} onKeyDown={trapFocus} style={{ position: "fixed", inset: 0, zIndex: 57 }}>
        <style>{`
          @keyframes mpTipIn { from { opacity:0; transform:translateY(0.375rem);} to { opacity:1; transform:translateY(0);} }
          @keyframes mpPulse { 0%,100% { box-shadow:0 0 0 0 rgba(184,92,56,0.45);} 50% { box-shadow:0 0 0 0.5rem rgba(184,92,56,0);} }
          @media (prefers-reduced-motion:reduce){ .mp-tour-pulse, .mp-tour-tip{ animation:none !important; } }
        `}</style>
        {targetBox && (
          <>
            <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>
              <defs>
                <mask id="mp-settings-cutout">
                  <rect width="100%" height="100%" fill="white" />
                  <rect x={l_} y={t_} width={w_} height={h_} rx={rPx} fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill={scrim} mask="url(#mp-settings-cutout)" />
            </svg>
            <div className="mp-tour-pulse" style={{
              position: "absolute", top: t_, left: l_, width: w_, height: h_,
              borderRadius: r, border: `0.125rem solid ${EMBER}`,
              animation: "mpPulse 2s ease-in-out infinite", pointerEvents: "none",
            }} />
          </>
        )}
        <div className="mp-tour-tip" style={{
          position: "absolute", top: tipTop, left: tipLeft, width: tipWidth,
          animation: "mpTipIn .3s ease both",
        }}>
          <div style={{
            background: cardBg,
            borderRadius: "0.875rem", padding: "0.875rem 1rem",
            border: `0.0625rem solid ${cardBorder}`, boxShadow: cardShadow,
            display: "flex", flexDirection: "column", gap: "0.5rem",
          }}>
            <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: INK, letterSpacing: "0.02em" }}>
              {t("step1Title")}
            </div>
            <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, lineHeight: 1.5 }}>
              {t("step1Body")}
            </div>
            <TourControls total={totalSteps} onSkip={onClose} onNext={() => setStep(1)} t={t} primaryRef={primaryBtnRef} skipRef={skipBtnRef} />
          </div>
        </div>
      </div>
    );
    return createPortal(overlay, document.body);
  }

  // ── Step 1: centered overview card with bullet list ──
  // Match settings/layout + SettingsInline: drop the Subscription bullet on iOS
  // ONLY while IAP is off. With IAP live the Subscription tab is visible, so the
  // overview must mention it.
  const items: { title: string; desc: string }[] = FEATURE_KEYS
    .filter((f) => !(isIOS() && !IAP_ENABLED && f.titleKey === "feat_subscription_title"))
    .map((f) => ({
      title: t(f.titleKey),
      desc: t(f.descKey),
    }));

  const overlay2 = (
    <div role="dialog" aria-modal="true" aria-label={t("step2Title")} onKeyDown={trapFocus} style={{
      position: "fixed", inset: 0, zIndex: 57,
      background: scrim,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }}>
      <style>{`
        @keyframes mpCardIn { from { opacity:0; transform:scale(0.95);} to { opacity:1; transform:scale(1);} }
        @media (prefers-reduced-motion:reduce){ .mp-tour-card{ animation:none !important; } }
      `}</style>
      <div className="mp-tour-card" style={{
        width: isMobile ? "calc(100vw - 2rem)" : "22rem", maxWidth: "24rem",
        maxHeight: "calc(100dvh - 4rem)", overflowY: "auto",
        animation: "mpCardIn .3s ease both",
      }}>
        <div style={{
          background: cardBg,
          borderRadius: "1rem", padding: "1.25rem 1.25rem 1rem",
          border: `0.0625rem solid ${cardBorder}`, boxShadow: cardShadow,
          display: "flex", flexDirection: "column", gap: "0.75rem",
        }}>
          <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: INK, letterSpacing: "0.02em" }}>
            {t("step2Title")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4375rem" }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                <div style={{
                  width: "0.375rem", height: "0.375rem", borderRadius: "50%",
                  flexShrink: 0, marginTop: "0.4375rem",
                  background: EMBER,
                }} />
                <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: INK, lineHeight: 1.5 }}>
                  <strong style={{ fontWeight: 600, color: EMBER_GLYPH }}>{it.title}</strong> — {it.desc}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: MUTED, fontStyle: "italic", marginTop: "0.125rem" }}>
            {t("step2Body")}
          </div>
          <TourControls total={totalSteps} onSkip={onClose} onNext={onClose} t={t} lastStep primaryRef={primaryBtnRef} skipRef={skipBtnRef} />
        </div>
      </div>
    </div>
  );
  return createPortal(overlay2, document.body);
}

function TourControls({
  onSkip, onNext, t, lastStep = false, primaryRef, skipRef,
}: {
  total?: number; onSkip?: () => void; onNext: () => void;
  t: (k: string) => string; lastStep?: boolean;
  primaryRef?: React.Ref<HTMLButtonElement>; skipRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.125rem" }}>
      <button ref={skipRef} type="button" onClick={(e) => { e.stopPropagation(); onSkip?.(); }} style={{
        fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: MUTED,
        background: "transparent", border: "none",
        minHeight: "2.75rem", padding: "0 0.75rem",
        display: "inline-flex", alignItems: "center",
        cursor: "pointer", transition: "all .2s", letterSpacing: "0.02em",
      }}>
        {t("skip")}
      </button>
      <button ref={primaryRef} type="button" onClick={(e) => { e.stopPropagation(); onNext(); }} style={{
        fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#FFF",
        background: EMBER,
        border: "none", borderRadius: "0.5rem",
        minHeight: "2.75rem", padding: "0 1.25rem",
        display: "inline-flex", alignItems: "center",
        cursor: "pointer", transition: "all .2s", letterSpacing: "0.02em",
      }}>
        {lastStep ? t("done") : t("next")}
      </button>
    </div>
  );
}

// Module-level guard so the ?tour=1 bootstrap fires exactly once per page
// load, even if two mounted settings shells both invoke useSettingsTutorial().
// Without this, each shell would independently read the URL and call setOpen,
// producing duplicate portals / double reset side-effects. The store itself is
// a singleton, so a single flip is enough for every consumer to react.
let tourBootstrapped = false;

/** Hook helper: returns [open, setOpen] and opens the tour when the URL
 *  contains ?tour=1 (or when a Help button flips the store directly).
 */
export function useSettingsTutorial(): [boolean, (v: boolean) => void] {
  const open = useSettingsTourStore((s) => s.open);
  const setOpen = useSettingsTourStore((s) => s.setOpen);
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      // Bootstrap the ?tour=1 request only once per page load. Secondary shells
      // that also call this hook simply subscribe to the shared store above
      // (open) without re-running the URL read / setOpen.
      if (tourBootstrapped) return;
      tourBootstrapped = true;
      const params = new URLSearchParams(window.location.search);
      // Only open on explicit request (?tour=1 or the help button). The old
      // auto-fire-on-first-visit was jarring when tapping a settings submenu
      // and is retired now that each page carries its own clear header.
      if (params.get("tour") === "1") {
        setOpen(true);
      }
    } catch {}
  }, [setOpen]);
  return [open, setOpen];
}
