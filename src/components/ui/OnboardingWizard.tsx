"use client";
import React, { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useIsPortrait } from "@/lib/hooks/useIsPortrait";
import { isIOS, isNative } from "@/lib/native/platform";
import { IAP_ENABLED } from "@/lib/native/iap-flags";
import { useUserStore } from "@/lib/stores/userStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useWalkthroughStore } from "@/lib/stores/walkthroughStore";
import { useTranslation, detectBrowserLocale } from "@/lib/hooks/useTranslation";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { updateProfile } from "@/lib/auth/profile-actions";
import { track } from "@/lib/analytics";
import { useAccessibility, type ScaleLevel } from "@/components/providers/AccessibilityProvider";
import { CREAM, INK, MUTED, HAIRLINE, EMBER, EMBER_GLYPH, GOLD, SHADOW, TOP_HIGHLIGHT } from "@/lib/libraryTokens";

const OnboardingSceneHost = lazy(() => import("@/components/ui/OnboardingSceneHost"));
const OnboardingCelebration = lazy(() => import("@/components/ui/OnboardingCelebration"));
const ImportHub = lazy(() => import("@/components/ui/ImportHub"));
const OnboardingWingOrientStep = lazy(() => import("@/components/ui/OnboardingWingOrientStep"));

/* ── State machine ──
   Surviving flow: lang_a11y -> name -> style_era(confirmation) -> celebration(threshold)
   -> done (lands the user into the seeded room to place their first memory). The
   intro video, quiz, cinematic pre-roll, 4-leg auto-walk gauntlet and paywall are cut. */
type Phase =
  | "video_intro"      // Intro video plays first (full-screen)
  | "lang_a11y"        // Language + legibility (warm-cream card)
  | "name"             // Name input
  | "style_era"        // Roman Tuscany confirmation
  | "wing_orient"      // "One palace, five wings" orientation (step 4/4)
  | "upload"           // Seeded room + ImportHub (first memory)
  | "celebration"      // Gold ceremonial threshold
  | "paywall"          // Soft trial offer (non-iOS only)
  | "done";

const SETUP_PHASES: Phase[] = ["video_intro", "lang_a11y", "name", "style_era", "wing_orient"];
const PHASE_ORDER: Phase[] = [
  "video_intro", "lang_a11y", "name", "style_era", "wing_orient", "upload", "celebration", "paywall", "done",
];

/* Retired phases from the old flow -> nearest surviving phase, so any stale saved
   state resolves instead of resurrecting a removed phase. */
const RETIRED_PHASE_MAP: Record<string, Phase> = {
  quiz: "name",
  cinematic: "name",
  walk_exterior: "name",
  walk_entrance: "name",
  walk_corridor: "name",
  walk_room: "name",
};

const STORAGE_KEY = "mp_onboarding_phase";
const WALK_DONE_KEY = "mp_onboarding_walk_done";

/* Centralized paywall platform gate (canon — mirrors MemoryPalace's upgrade
   gate): web always; iOS only when IAP is live (Apple 3.1.1 — /pricing drives
   StoreKit there); Android native NEVER (no Play Billing — routing the
   Capacitor Android app to Stripe would violate Play's payments policy). */
function paywallAllowed(): boolean {
  return !isNative() || (isIOS() && IAP_ENABLED);
}

function persistPhase(p: Phase) { try { localStorage.setItem(STORAGE_KEY, p); } catch {} }
function loadPhase(): Phase | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as string | null;
    if (!v) return null;
    // Paywall platform gate: /pricing drives Apple IAP on iOS (never Stripe)
    // and Stripe on web. A saved 'paywall' may only resume where the paywall is
    // allowed (web, or iOS with IAP live) — on iOS while IAP is off (3.1.1
    // seal) and on Android native (no Play Billing) it remaps to 'done'.
    if (v === "paywall" && !paywallAllowed()) return "done";
    // Reduced-motion: a resumed 'video_intro' skips the 12.5s video to the same
    // phase the fresh-run RM path starts at (initial-phase pick below).
    if (v === "video_intro" && prefersReducedMotion()) return "lang_a11y";
    if (PHASE_ORDER.includes(v as Phase)) return v as Phase;
    if (RETIRED_PHASE_MAP[v]) return RETIRED_PHASE_MAP[v];
  } catch {}
  return null;
}
function cleanupStorage() { try { localStorage.removeItem(STORAGE_KEY); } catch {} }

/* Reduced-motion — mirrors OnboardingSceneHost/OnboardingCelebration so the
   intro video (the most prominent motion in the flow) is skipped for
   motion-sensitive users instead of autoplaying 12.5s of moving footage. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* ── Text size (mirrors AccessibilityProvider ScaleLevel) ── */
type TextSize = ScaleLevel;

/* ── Quiet canon step dots (AtriumRelay lane-dot grammar): filled=EMBER_GLYPH,
   unfilled=HAIRLINE, no numeric total, no growing bar. Intentionally scoped to
   the 4 setup cards (lang_a11y 1/4, name 2/4, style_era 3/4, wing_orient 4/4) —
   the full-screen video intro and the do-first upload/celebration are ceremonial
   beats, not numbered setup steps, so they carry no dot. ── */
function StepDots({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={label}
      style={{ position: "absolute", top: "calc(2rem + env(safe-area-inset-top, 0px))", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "0.5rem", alignItems: "center" }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div key={i} aria-hidden style={{
          width: "0.6rem", height: "0.6rem", borderRadius: "50%",
          background: i + 1 <= current ? EMBER_GLYPH : HAIRLINE,
          transition: "background .4s ease",
        }} />
      ))}
    </div>
  );
}

/* ── Canon stroked check ── a thin, round-capped tick drawn in the same hand as
   the laurel wreath and divider ticks (strokeWidth ~1.6, round caps, currentColor),
   replacing the literal '✓' glyph for a more intentional selected affordance.
   Size + color are driven by the caller via width/height/color. ── */
function CheckMark({ size = "0.875rem", color = EMBER, strokeWidth = 2.4 }: { size?: string; color?: string; strokeWidth?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display: "block", flexShrink: 0 }}>
      <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Keyframes ── */
const KEYFRAMES = `
@keyframes onb-fadeUp{from{opacity:0;transform:translateY(1.5rem)}to{opacity:1;transform:translateY(0)}}
@keyframes onb-titleReveal{0%{opacity:0;letter-spacing:0.6em;transform:scale(0.92)}60%{opacity:1;letter-spacing:0.12em}100%{opacity:1;letter-spacing:0.04em;transform:scale(1)}}
@keyframes onb-subtitleReveal{0%{opacity:0;transform:translateY(0.5rem)}100%{opacity:1;transform:translateY(0)}}
@keyframes onb-pulse{0%,100%{opacity:0.4}50%{opacity:0.8}}
@keyframes onb-slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
@keyframes onb-welcomeIn{0%{opacity:0}30%{opacity:0}100%{opacity:1}}
@keyframes onb-taglineIn{from{opacity:0;transform:translateY(0.75rem)}to{opacity:1;transform:translateY(0)}}
`;

interface OnboardingWizardProps {
  onFinish: (memoryUploaded?: boolean) => void;
}

export default function OnboardingWizard({ onFinish }: OnboardingWizardProps) {
  const isMobile = useIsMobile();
  const isPortrait = useIsPortrait();
  // Landscape phone: setup cards now scroll on ALL viewports (R8, pageScrollerStyle);
  // this flag remains only for the celebration/paywall landscape forks below.
  const isLandscapePhone = isMobile && !isPortrait;
  const { t, setLocaleNoReload } = useTranslation("onboarding");
  // Selector: subscribe ONLY to userName (the sole reactive store field this
  // render reads). Setters are stable action references, pulled once via
  // getState() so the wizard no longer re-renders on every unrelated store write
  // (styleEra/bust*/goal/wing) the 3D host makes while the canvas is live.
  const userName = useUserStore((s) => s.userName);
  const { setUserName, setUserGoal, setFirstWing, setStyleEra } = useUserStore.getState();
  const { scaleLevel, setScaleLevel } = useAccessibility();

  useEffect(() => {
    // Default firstWing; goal default is set explicitly at completion (change 21).
    setFirstWing("roots");
  }, [setFirstWing]);

  // Apply the detected/stored locale to the ACTIVE translation on mount, so the
  // very first onboarding screen renders in the user's language (nl by default)
  // — not the app's fallback English until they tap a language. Runs once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLocaleNoReload(selectedLocale); }, []);

  // ── Phase state ── (retired saved phases remapped by loadPhase) ──
  // Brand-new run (no saved phase) -> "video_intro" (the intro video plays first),
  // UNLESS the user prefers reduced motion — then skip straight to the first setup
  // card (no autoplaying full-screen video), mirroring the reduced-motion swaps in
  // OnboardingSceneHost/OnboardingCelebration.
  const [phase, setPhaseRaw] = useState<Phase>(() => loadPhase() || (prefersReducedMotion() ? "lang_a11y" : "video_intro"));

  const setPhase = useCallback((p: Phase) => {
    setPhaseRaw(p);
    persistPhase(p);
  }, []);

  const memoryUploadedRef = useRef(false);
  const [uploadedMemory, setUploadedMemory] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ── Language / A11y state ──
  // Check localStorage directly — the hook's `locale` hasn't hydrated yet on first render
  const [selectedLocale, setSelectedLocale] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem("mp_locale") as Locale | null;
      if (stored && locales.includes(stored)) return stored;
    } catch {}
    return detectBrowserLocale();
  });
  // Text size is owned by the app-wide AccessibilityProvider (persists to
  // localStorage + DB + documentElement, survives unmount). Change here writes
  // through it — no local documentElement writer that wipes on unmount (change 11).
  const textSize = scaleLevel;
  const setTextSize = setScaleLevel;
  const [selectedEra] = useState<"roman">("roman");

  // ── Video state ── (intro video plays first, then loops as a soft background) ──
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlayed, setVideoPlayed] = useState(false);
  // Graceful outro: instead of cutting straight to the first menu, fade in a
  // "Welcome to your Memory Palace" title over the last moments of the video,
  // then advance — softening the transition.
  const [showWelcome, setShowWelcome] = useState(false);
  const outroRef = useRef(false);
  const outroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beginOutro = useCallback(() => {
    if (outroRef.current) return;
    outroRef.current = true;
    setVideoPlayed(true);
    if (videoRef.current) { videoRef.current.loop = true; videoRef.current.play().catch(() => {}); }
    setShowWelcome(true);
    outroTimerRef.current = setTimeout(() => setPhase("lang_a11y"), 2600);
  }, [setPhase]);
  // Own the outro timer's teardown — clear it on unmount so a fast skip/unmount
  // never fires setPhase on a gone component.
  useEffect(() => () => { if (outroTimerRef.current) clearTimeout(outroTimerRef.current); }, []);

  // ── Tagline beat (§3 SPEC A, R3): ONE centered lockup — in @1.2s, out @6s.
  // Two setTimeouts; cleared on phase leave (skip advances phase → effect
  // cleanup), on outro (showWelcome effect below), and on unmount. Reduced-motion
  // users never mount video_intro (initial-phase pick); the guard here is cheap
  // defense-in-depth only.
  const [introBeat, setIntroBeat] = useState<"hidden" | "in" | "out">("hidden");
  const beatTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  useEffect(() => {
    if (phase !== "video_intro" || prefersReducedMotion()) return;
    beatTimersRef.current = [
      setTimeout(() => setIntroBeat("in"), 1200),
      setTimeout(() => setIntroBeat("out"), 6000),
    ];
    return () => { beatTimersRef.current.forEach(clearTimeout); beatTimersRef.current = []; };
  }, [phase]);
  // Outro cancels the beat: an early outro (autoplay-blocked path) must never
  // have the tagline pop in over the welcome title.
  useEffect(() => {
    if (showWelcome) {
      beatTimersRef.current.forEach(clearTimeout);
      beatTimersRef.current = [];
      setIntroBeat("out");
    }
  }, [showWelcome]);

  // ── Progress hairline (§3 SPEC A.6): rAF-driven fill (`timeupdate` fires ~4Hz
  // on iOS Safari = visible stutter). Rendered only after loadedmetadata reports
  // a real duration (no 0-jump mid-video); writes transform directly on the fill
  // node (no per-frame React state); cancelled on phase leave/unmount.
  const [videoMetaReady, setVideoMetaReady] = useState(false);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (phase !== "video_intro" || !videoMetaReady) return;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      const fill = progressFillRef.current;
      if (v && fill && Number.isFinite(v.duration) && v.duration > 0) {
        fill.style.transform = `scaleX(${Math.min(v.currentTime / v.duration, 1)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, videoMetaReady]);

  // Force-play on mobile — autoplay can fail silently on iOS/Android. If it's
  // blocked during the intro, skip straight to the first setup card.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (phase === "video_intro") {
      v.play().catch(() => {
        // Autoplay blocked (common on iOS/Android): route through the same
        // graceful welcome outro desktop gets, rather than hard-cutting — the
        // outro beat then advances to lang_a11y on its own timer.
        beginOutro();
      });
    } else if (SETUP_PHASES.includes(phase)) {
      v.loop = true;
      v.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Name validation (change 13) ──
  const trimmedName = userName.trim();

  // ── Unified completion (change 21): skip and normal finish converge on the SAME
  // atomic path. Persist the trimmed name, set a default goal explicitly (the quiz
  // was the only goal writer), then advance to 'done' whose effect calls onFinish. ──
  const completeAndFinish = useCallback((target: Phase = "done") => {
    setUserName(trimmedName);
    const savedGoal = (() => { try { return localStorage.getItem("mp_user_goal"); } catch { return null; } })();
    setUserGoal(savedGoal || "preserve");
    setStyleEra(selectedEra);
    setFirstWing("roots");
    useWalkthroughStore.getState().skip();
    setPhase(target);
  }, [trimmedName, setUserName, setUserGoal, setStyleEra, setFirstWing, selectedEra, setPhase]);

  const handleSkip = useCallback(() => {
    track("onboarding_skipped", { phase });
    completeAndFinish();
  }, [completeAndFinish, phase]);

  // ── Paywall trial CTA (change 2): completing onboarding and routing to /pricing
  // must be ONE coherent flow — never fire setPhase('done') (which lands the user
  // in the atrium via onFinish) alongside navigation, which races the route/tab.
  // Instead: persist the wizard fields, AWAIT the atomic onboarding DB write, then
  // hard-navigate the SAME document to /pricing (Apple IAP on iOS, Stripe on web).
  // No detached tab, no atrium jump — purchase intent is preserved. ──
  const trialNavigatingRef = useRef(false);
  const handleTrialCta = useCallback(async () => {
    if (trialNavigatingRef.current) return;
    trialNavigatingRef.current = true;
    track("paywall_trial_clicked", { source: "onboarding" });
    // Persist the wizard fields exactly as the unified completion path does.
    setUserName(trimmedName);
    const savedGoal = (() => { try { return localStorage.getItem("mp_user_goal"); } catch { return null; } })();
    setUserGoal(savedGoal || "preserve");
    setStyleEra(selectedEra);
    setFirstWing("roots");
    useWalkthroughStore.getState().skip();
    try {
      // Atomic authoritative write — must confirm before we leave onboarding, so a
      // fresh-device relogin never re-onboards after a purchase.
      await useUserStore.getState().finishOnboarding();
    } catch {
      trialNavigatingRef.current = false;
      try { window.dispatchEvent(new CustomEvent("mp:toast", { detail: { message: t("paywallFinishError") !== "paywallFinishError" ? t("paywallFinishError") : t("uploadFailed"), type: "error" } })); } catch {}
      return;
    }
    try { localStorage.setItem(WALK_DONE_KEY, "true"); } catch {}
    cleanupStorage();
    track("onboarding_completed", { memoryUploaded: memoryUploadedRef.current });
    // Same-document navigation to /pricing (new tab would orphan purchase intent on
    // web; a detached nav would race the WKWebView on iOS). window.location.href
    // stays in the current tab on web AND inside the WKWebView on native.
    window.location.href = "/pricing";
  }, [trimmedName, selectedEra, setUserName, setUserGoal, setStyleEra, setFirstWing, t]);

  // ── Upload ──
  const handleMemoryAdded = useCallback(() => {
    memoryUploadedRef.current = true;
    setPhase("celebration");
  }, [setPhase]);

  // ── Paywall platform gate: where the paywall is disallowed (iOS while IAP is
  // off — Apple 3.1.1; Android native — no Play Billing) it must be UNREACHABLE
  // — coerce any stray 'paywall' to 'done'. Web (Stripe) and iOS-with-IAP
  // (Apple IAP via /pricing) keep it. ──
  useEffect(() => {
    if (phase === "paywall" && !paywallAllowed()) setPhase("done");
  }, [phase, setPhase]);

  // ── Done ──
  useEffect(() => {
    if (phase === "done") {
      track("onboarding_completed", { memoryUploaded: memoryUploadedRef.current });
      try { localStorage.setItem(WALK_DONE_KEY, "true"); } catch {}
      cleanupStorage();
      onFinish(memoryUploadedRef.current);
    }
  }, [phase, onFinish]);

  // ── Preload ImportHub + the wing-orient card during setup so they're ready
  // when the user reaches them (no lazy-chunk spinner between setup cards) ──
  useEffect(() => {
    if (phase === "style_era") {
      import("@/components/ui/OnboardingWingOrientStep");
      import("@/components/ui/ImportHub");
    }
  }, [phase]);

  // ── Onboarding room data ──
  const onboardingRoomName: string | undefined = undefined; // Keep default room names from WING_ROOMS

  // ══════════════════════════════════════════════
  // SHARED: warm-cream Library canon primitives
  // ══════════════════════════════════════════════
  const canonStyle = (
    <style>{`
${KEYFRAMES}
@keyframes onb-spin{to{transform:rotate(360deg)}}
.onb-cta{transition:transform .16s ease, filter .16s ease}
.onb-cta:hover{transform:translateY(-1px);filter:brightness(1.06)}
.onb-focusable:focus-visible{outline:0.1875rem solid ${EMBER};outline-offset:0.1875rem}
@media (prefers-reduced-motion: reduce){.onb-anim,.onb-cta,.onb-orient-in{animation:none!important;transition:none!important;transform:none!important}}
    `}</style>
  );

  // Opaque warm-cream card (hairline border, no backdrop blur).
  // margin:auto (R8): inside the flex-start scroller below this yields the SAME
  // visual centering as justify-content:center when the card fits the viewport,
  // but degrades to a scrollable top-aligned card when it doesn't (tall cards on
  // short phones, keyboard-up name card) — auto margins collapse to 0 on overflow.
  const cardStyle: React.CSSProperties = {
    maxWidth: "30rem", width: "92%",
    padding: isMobile ? "2rem 1.25rem" : "2.5rem 2rem",
    background: CREAM,
    borderRadius: "1rem",
    border: `0.0625rem solid ${HAIRLINE}`,
    boxShadow: `${SHADOW[1]}, ${TOP_HIGHLIGHT}`,
    animation: "onb-fadeUp .5s ease",
    margin: "auto",
  };

  const pageStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    // height:100dvh ONLY — a 100vh minHeight floor exceeds the VISIBLE viewport
    // while mobile URL-bar chrome is expanded, so the inner 100% scroller thinks
    // its content fits and won't scroll, hiding the card bottom / skip link
    // behind the browser chrome (R8).
    width: "100vw", height: "100dvh", position: "relative",
    overflow: "hidden", background: CREAM, ...extra,
  });

  // Universal setup-card scroller (R8): flex-start + overflowY:auto on EVERY
  // viewport (not just landscape phones) so no card can ever clip off-screen;
  // cardStyle's margin:auto restores centering whenever content fits. Top
  // padding clears the absolute StepDots row; bottom padding respects the
  // home-indicator safe area.
  const pageScrollerStyle: React.CSSProperties = {
    position: "relative", zIndex: 2,
    width: "100%", height: "100%",
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "flex-start",
    overflowY: "auto",
    padding: "calc(3.5rem + env(safe-area-inset-top, 0px)) 0 calc(1.5rem + env(safe-area-inset-bottom, 0px))",
  };

  // Canon overline: 0.6875rem / 700 / 0.12em / uppercase / ember-glyph ink.
  const Overline = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
      <span style={{ width: "2rem", height: "1px", background: `${EMBER_GLYPH}40` }} />
      <span style={{
        fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
        color: EMBER_GLYPH, letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        {children}
      </span>
      <span style={{ width: "2rem", height: "1px", background: `${EMBER_GLYPH}40` }} />
    </div>
  );

  // One primary EMBER CTA per card (ctaGrad, EMBER focus ring via .onb-focusable, >=3.25rem).
  const primaryCtaStyle: React.CSSProperties = {
    fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600,
    padding: "0 1.25rem", borderRadius: "0.75rem", border: "none",
    background: T.land.ctaGrad, color: "#FFF", cursor: "pointer",
    minHeight: "3.25rem",
  };

  const skipLinkStyle: React.CSSProperties = {
    fontFamily: T.font.body, fontSize: "0.8125rem",
    color: MUTED, background: "none", border: "none",
    cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "0.1875rem",
    minHeight: "2.75rem", padding: "0.5rem",
  };

  // Visible fallback for lazy 3D scenes / panels: a spinner plus an always-clickable
  // Skip, so a slow or failed chunk in WKWebView never leaves a frozen cream screen.
  const sceneLoadingFallback = (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: "1.5rem",
      background: CREAM, zIndex: 30,
      paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))",
    }}>
      <style>{`@keyframes onb-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: "2.5rem", height: "2.5rem", borderRadius: "50%",
        border: `0.1875rem solid ${HAIRLINE}`, borderTopColor: EMBER,
        animation: "onb-spin 0.8s linear infinite",
      }} />
      <button className="onb-focusable" onClick={handleSkip} style={{
        fontFamily: T.font.body, fontSize: "0.8125rem",
        color: MUTED, background: "#FFF",
        border: `0.0625rem solid ${HAIRLINE}`, borderRadius: "0.5rem",
        padding: "0.625rem 1.25rem", cursor: "pointer", minHeight: "2.75rem",
      }}>
        {t("skipExploreOwn")}
      </button>
    </div>
  );

  // Roving-tabindex radiogroup keyboard pattern: Arrow keys (and Home/End) move
  // selection+focus; only the checked radio is a Tab stop. Fulfills the ARIA
  // radiogroup contract both radiogroups assert.
  const handleRadioKeyDown = <V,>(
    e: React.KeyboardEvent,
    values: readonly V[],
    current: V,
    onSelect: (v: V) => void,
  ) => {
    const idx = values.indexOf(current);
    if (idx < 0) return;
    let next = idx;
    switch (e.key) {
      case "ArrowRight": case "ArrowDown": next = (idx + 1) % values.length; break;
      case "ArrowLeft": case "ArrowUp": next = (idx - 1 + values.length) % values.length; break;
      case "Home": next = 0; break;
      case "End": next = values.length - 1; break;
      default: return;
    }
    e.preventDefault();
    onSelect(values[next]);
    // Move focus to the newly selected radio within the same group.
    const group = e.currentTarget as HTMLElement;
    const radios = group.querySelectorAll<HTMLElement>('[role="radio"]');
    radios[next]?.focus();
  };

  // ══════════════════════════════════════════════
  // PHASE RENDERS
  // ══════════════════════════════════════════════

  /* ── Video intro — full-screen /video/hero-ob.mp4, plays once then advances ── */
  if (phase === "video_intro") {
    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", overflow: "hidden", background: "#1a1917" }}>
        {/* Full canon style block (not bare KEYFRAMES): the skip chip needs the
            .onb-focusable EMBER focus ring in this phase too. */}
        {canonStyle}

        {/* Warm-dark fallback UNDER the video — covers decode/network gaps so a
            slow start never shows a flat black frame (§3.1). */}
        <div aria-hidden style={{
          position: "fixed", inset: 0, zIndex: 0,
          background: "radial-gradient(ellipse at 50% 40%, #2A2622 0%, #1a1917 70%)",
        }} />

        {/* Background video */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop={videoPlayed}
          playsInline
          preload="metadata"
          poster="/video/hero-ob-poster.jpg"
          onEnded={beginOutro}
          onLoadedMetadata={(e) => {
            // Progress hairline gate: only a real duration may drive the fill —
            // rendering before this fires would 0-jump mid-video (§3.6).
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setVideoMetaReady(true);
          }}
          style={{
            position: "fixed", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            objectPosition: isMobile ? "60% center" : "center center",
            opacity: 0.65,
            filter: "saturate(0.7) brightness(1.1)",
            zIndex: 0,
          }}
        >
          <source src="/video/hero-ob.mp4" type="video/mp4" />
        </video>

        {/* Gradient overlay for legibility */}
        <div style={{
          position: "fixed", inset: 0,
          background: "linear-gradient(180deg, rgba(26,25,23,0.15) 0%, rgba(26,25,23,0.3) 50%, rgba(26,25,23,0.7) 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }} />

        {/* Tagline beat (§3.3, R3) — the ONE text lockup of the playing state:
            centered overline + tagline, in @1.2s, out @6s, inert to pointer/SR
            timing (decorative brand beat). Never rendered once the outro owns
            the frame. */}
        {introBeat !== "hidden" && !showWelcome && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 12,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "0.75rem", textAlign: "center", pointerEvents: "none", padding: "0 1.5rem",
            ...(introBeat === "in" && !prefersReducedMotion()
              ? { animation: "onb-taglineIn 1s ease both" }
              : introBeat === "in"
                ? {}
                : { opacity: 0, transition: "opacity 0.9s ease" }),
          }}>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: "rgba(255,255,255,0.72)",
            }}>
              {t("appName")}
            </div>
            <div style={{
              fontFamily: T.font.display, fontStyle: "italic", fontWeight: 500,
              fontSize: isMobile ? "1.1875rem" : "1.5rem",
              color: "rgba(255,255,255,0.92)", lineHeight: 1.35, maxWidth: "26rem",
              textShadow: "0 0.125rem 1rem rgba(0,0,0,0.5)",
            }}>
              {t("videoTagline") !== "videoTagline" ? t("videoTagline") : "A home for the moments that made you."}
            </div>
          </div>
        )}

        {/* Welcome outro — fades in over the last moments of the video, in the
            app's warm gold display voice, so the hand-off to the first menu
            isn't an abrupt cut. */}
        {showWelcome && (
          <div style={{ position: "absolute", inset: 0, zIndex: 15, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", padding: "0 1.5rem", background: "radial-gradient(ellipse at center, rgba(26,25,23,0.35) 0%, rgba(26,25,23,0.72) 100%)", animation: "onb-welcomeIn 1.1s ease both" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{
                fontFamily: T.font.display, fontStyle: "italic",
                fontSize: isMobile ? "1.875rem" : "2.75rem", fontWeight: 600,
                color: GOLD, textAlign: "center", lineHeight: 1.2, letterSpacing: "0.01em",
                textShadow: "0 0.25rem 1.75rem rgba(0,0,0,0.55)",
              }}>
                {t("welcomeToPalace") !== "welcomeToPalace" ? t("welcomeToPalace") : "Welcome to your Memory Palace"}
              </div>
              {/* Outro subline (R2 — the single subline key) */}
              <div style={{
                fontFamily: T.font.body, fontSize: "0.9375rem",
                color: "rgba(255,255,255,0.85)", lineHeight: 1.5,
                marginTop: "0.75rem", maxWidth: "24rem",
                animation: "onb-subtitleReveal 0.8s ease 0.6s both",
              }}>
                {t("welcomeSub") !== "welcomeSub" ? t("welcomeSub") : "Let's make it yours — it takes about two minutes."}
              </div>
            </div>
          </div>
        )}

        {/* Skip button — warm-ink chrome so even the video overlay stays on palette */}
        <button
          className="onb-focusable"
          onClick={() => {
            outroRef.current = true;
            if (outroTimerRef.current) { clearTimeout(outroTimerRef.current); outroTimerRef.current = null; }
            setVideoPlayed(true);
            if (videoRef.current) { videoRef.current.loop = true; videoRef.current.play().catch(() => {}); }
            setPhase("lang_a11y");
          }}
          style={{
            position: "absolute", top: "calc(1.5rem + env(safe-area-inset-top, 0px))", right: "calc(1.5rem + env(safe-area-inset-right, 0px))", zIndex: 20,
            fontFamily: T.font.body, fontSize: "0.75rem",
            color: "rgba(255,255,255,0.9)", background: "rgba(64,59,54,0.45)",
            border: "0.0625rem solid rgba(64,59,54,0.55)",
            borderRadius: "0.5rem", padding: "0.5rem 1rem",
            cursor: "pointer", backdropFilter: "blur(0.25rem)", minHeight: "2.75rem", minWidth: "2.75rem",
          }}
        >
          {t("cinematicSkip")}
        </button>

        {/* Progress hairline (§3.6) — decorative playback trace, aria-hidden,
            fill driven by the rAF loop (transform-only, no re-render). Lifted
            above the home-indicator gesture zone; hidden once the outro owns
            the frame; rendered only after loadedmetadata reports a duration. */}
        {videoMetaReady && !showWelcome && (
          <div aria-hidden style={{
            position: "fixed", left: 0, right: 0,
            bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
            height: "0.125rem", background: "rgba(255,255,255,0.12)",
            zIndex: 10, overflow: "hidden", pointerEvents: "none",
          }}>
            <div ref={progressFillRef} style={{
              width: "100%", height: "100%",
              background: "rgba(255,255,255,0.4)",
              transform: "scaleX(0)", transformOrigin: "left center",
            }} />
          </div>
        )}

        {/* Start the welcome outro at ~12.5s (then advance ~2.6s later), so a
            long/looping video still hands off gracefully. */}
        <VideoAutoAdvance seconds={12.5} onAdvance={beginOutro} />
      </div>
    );
  }

  /* ── Language + Legibility — warm-cream Library canon ── */
  if (phase === "lang_a11y") {
    const langLabel = t("chooseLangSubtitle");
    const sizeLabel = t("textSizeTitle");
    return (
      <div style={pageStyle()}>
        {canonStyle}

        <div style={pageScrollerStyle}>
          <StepDots current={1} total={4} label={t("stepOf", { current: "1", total: "4" })} />

          <div className="onb-anim" style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem" }}>

              <Overline>{t("appName")}</Overline>

              <h2 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "1.75rem",
                fontWeight: 600, color: INK, lineHeight: 1.25, margin: 0,
              }}>
                {t("langA11yTitle") !== "langA11yTitle" ? t("langA11yTitle") : "Let's make this comfortable to read"}
              </h2>

              {/* Language radiogroup */}
              <div style={{ width: "100%" }}>
                <h3 style={{
                  fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
                  color: EMBER_GLYPH, textAlign: "left", margin: "0 0 0.5rem",
                  textTransform: "uppercase", letterSpacing: "0.12em",
                }}>
                  {langLabel}
                </h3>
                <div role="radiogroup" aria-label={langLabel}
                  onKeyDown={(e) => handleRadioKeyDown(e, locales, selectedLocale, (loc) => { setSelectedLocale(loc); setLocaleNoReload(loc); })}
                  style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
                  gap: "0.4375rem",
                }}>
                  {locales.map((loc) => {
                    const active = loc === selectedLocale;
                    return (
                      <button
                        key={loc}
                        className="onb-focusable"
                        role="radio"
                        aria-checked={active}
                        tabIndex={active ? 0 : -1}
                        onClick={() => { setSelectedLocale(loc); setLocaleNoReload(loc); }}
                        style={{
                          fontFamily: T.font.body, fontSize: "0.9375rem",
                          fontWeight: active ? 700 : 500,
                          padding: "0.6875rem 0.5rem", borderRadius: "0.5rem",
                          border: `0.125rem solid ${active ? EMBER : HAIRLINE}`,
                          background: active ? `${EMBER}12` : "#FFF",
                          color: active ? EMBER : INK,
                          cursor: "pointer", transition: "all .2s", minHeight: "2.75rem",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                        }}
                      >
                        {active && <CheckMark color={EMBER} size="0.875rem" />}
                        {localeNames[loc]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: "100%", height: "1px", background: HAIRLINE }} />

              {/* Text size radiogroup — persists app-wide via AccessibilityProvider */}
              <div style={{ width: "100%" }}>
                <h3 style={{
                  fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
                  color: EMBER_GLYPH, textAlign: "left", margin: "0 0 0.5rem",
                  textTransform: "uppercase", letterSpacing: "0.12em",
                }}>
                  {sizeLabel}
                </h3>
                <div role="radiogroup" aria-label={sizeLabel}
                  onKeyDown={(e) => handleRadioKeyDown(e, ["standard", "comfortable", "large"] as TextSize[], textSize, setTextSize)}
                  style={{ display: "flex", gap: "0.375rem" }}>
                  {(["standard", "comfortable", "large"] as TextSize[]).map((size) => {
                    const active = size === textSize;
                    const label = t(`textSize${size.charAt(0).toUpperCase() + size.slice(1)}` as any);
                    const fz = size === "standard" ? "0.9375rem" : size === "comfortable" ? "1.0625rem" : "1.25rem";
                    return (
                      <button
                        key={size}
                        className="onb-focusable"
                        role="radio"
                        aria-checked={active}
                        tabIndex={active ? 0 : -1}
                        onClick={() => setTextSize(size)}
                        style={{
                          // minWidth:0 + minHeight (not fixed height) + wrapping
                          // label span: long unbreakable labels ("Komfortabel"
                          // at the Large root scale on 360px) wrap to a second
                          // line instead of clipping past the button edge.
                          flex: 1, minWidth: 0, fontFamily: T.font.body, fontSize: "0.75rem",
                          fontWeight: active ? 700 : 500,
                          padding: "0.5rem 0.25rem", borderRadius: "0.5rem",
                          border: `0.125rem solid ${active ? EMBER : HAIRLINE}`,
                          background: active ? `${EMBER}12` : "#FFF",
                          color: active ? EMBER : INK,
                          cursor: "pointer", transition: "all .2s", minHeight: "3.5rem",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.125rem",
                          position: "relative",
                        }}
                      >
                        {active && (
                          <span aria-hidden style={{
                            position: "absolute", top: "0.25rem", right: "0.375rem",
                            display: "flex",
                          }}>
                            <CheckMark color={EMBER} size="0.8125rem" />
                          </span>
                        )}
                        <span style={{ fontSize: fz, fontFamily: T.font.display, fontWeight: 400, lineHeight: 1 }}>Aa</span>
                        <span style={{ maxWidth: "100%", overflowWrap: "anywhere", lineHeight: 1.15, textAlign: "center" }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Continue */}
              <button
                className="onb-cta onb-focusable"
                onClick={() => setPhase("name")}
                style={{ ...primaryCtaStyle, width: "100%" }}
              >
                {t("continueButton")}
              </button>

              <button className="onb-focusable" onClick={handleSkip} style={skipLinkStyle}>
                {t("skipExploreOwn")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Name screen — warm-cream card, validated + labeled ── */
  if (phase === "name") {
    const nameValid = trimmedName.length > 0;
    const advanceFromName = () => { if (nameValid) { setUserName(trimmedName); setPhase("style_era"); } };
    return (
      <div style={pageStyle()}>
        {canonStyle}

        <div style={pageScrollerStyle}>
          <StepDots current={2} total={4} label={t("stepOf", { current: "2", total: "4" })} />

          <div className="onb-anim" style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem" }}>

              <Overline>{t("appName")}</Overline>

              <h2 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "1.75rem",
                fontWeight: 600, color: INK, lineHeight: 1.25, margin: 0,
              }}>
                {t("nameTitle") !== "nameTitle" ? t("nameTitle") : "Every palace bears a name"}
              </h2>
              <p style={{
                fontFamily: T.font.display, fontStyle: "italic", fontSize: "0.9375rem",
                color: MUTED, maxWidth: "22rem", lineHeight: 1.6, margin: 0,
              }}>
                {t("nameAside") !== "nameAside" ? t("nameAside") : "Tell us yours, and we'll carve it above the door."}
              </p>

              {/* Foundation plaque (§6.5) — live derived-title preview, placed
                  ABOVE the input so it stays visible while the mobile keyboard
                  scrolls the focused input into view. Height is ALWAYS reserved
                  (2-line clamp fits inside 5.75rem) so typing never jumps the
                  nav row. Plain div — no aria-live (chatty per keystroke); the
                  empty state is aria-hidden. Title reuses cinematicPalaceName
                  (R13) — the one source of truth for "{name}'s Palace". */}
              <div
                aria-hidden={!nameValid}
                style={{
                  minHeight: "5.75rem", width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <div style={{
                  width: "100%", maxWidth: "20rem",
                  padding: "0.75rem 1rem", borderRadius: "0.625rem",
                  border: `0.0625rem solid ${HAIRLINE}`, background: "#FFFFFF99",
                  textAlign: "center",
                  opacity: nameValid ? 1 : 0,
                  transform: prefersReducedMotion() ? undefined : (nameValid ? "translateY(0)" : "translateY(0.25rem)"),
                  transition: prefersReducedMotion() ? "opacity .01s linear" : "opacity .3s ease, transform .3s ease",
                }}>
                  <div style={{
                    fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 700,
                    letterSpacing: "0.14em", textTransform: "uppercase", color: EMBER,
                    marginBottom: "0.375rem",
                  }}>
                    {t("namePlaqueOverline") !== "namePlaqueOverline" ? t("namePlaqueOverline") : "Founding deed"}
                  </div>
                  <div style={{
                    fontFamily: T.font.display, fontStyle: "italic", fontSize: "1.125rem",
                    color: INK, lineHeight: 1.3, overflowWrap: "anywhere",
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {t("cinematicPalaceName", { name: trimmedName }) !== "cinematicPalaceName"
                      ? t("cinematicPalaceName", { name: trimmedName })
                      : `${trimmedName}'s Palace`}
                  </div>
                </div>
              </div>

              <div style={{ width: "100%", maxWidth: "20rem" }}>
                <label htmlFor="onb-name-input" style={{ position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
                  {t("namePlaceholder")}
                </label>
                <input
                  id="onb-name-input"
                  className="onb-focusable"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  aria-label={t("namePlaceholder")}
                  maxLength={40}
                  style={{
                    // max(1rem, 16px): stays ≥16px computed even under a11y
                    // down-scaling — kills the iOS focus auto-zoom (§6.6).
                    fontFamily: T.font.display, fontSize: "max(1rem, 16px)", textAlign: "center",
                    padding: "0.875rem 1.5rem", border: `0.09375rem solid ${HAIRLINE}`,
                    borderRadius: "0.625rem", background: "#FFF", color: INK,
                    outline: "none", width: "100%", transition: "border-color .2s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = EMBER; }}
                  onBlur={(e) => { e.target.style.borderColor = HAIRLINE; }}
                  // Desktop keeps the convenience; on mobile skip autoFocus so we
                  // don't force the keyboard up / scroll-jump on the AT/touch flow.
                  autoFocus={!isMobile}
                  onKeyDown={(e) => { if (e.key === "Enter") advanceFromName(); }}
                />
                {!nameValid && (
                  <p style={{
                    fontFamily: T.font.body, fontSize: "0.75rem", color: MUTED,
                    margin: "0.5rem 0 0", lineHeight: 1.4,
                  }}>
                    {t("nameHint") !== "nameHint" ? t("nameHint") : "Please enter a name to continue."}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
                <button
                  className="onb-focusable"
                  onClick={() => setPhase("lang_a11y")}
                  style={{
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                    padding: "0 1.25rem", borderRadius: "0.75rem", minHeight: "3.25rem",
                    border: `0.0625rem solid ${HAIRLINE}`, background: "#FFF",
                    color: MUTED, cursor: "pointer",
                  }}
                >
                  {"\u2190"} {t("backButton")}
                </button>
                <button
                  className="onb-cta onb-focusable"
                  onClick={advanceFromName}
                  disabled={!nameValid}
                  style={{
                    ...primaryCtaStyle, flex: 1,
                    opacity: nameValid ? 1 : 0.5,
                    cursor: nameValid ? "pointer" : "not-allowed",
                  }}
                >
                  {t("continueButton")} {"\u2192"}
                </button>
              </div>

              <button className="onb-focusable" onClick={handleSkip} style={skipLinkStyle}>
                {t("skipExploreOwn")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Style confirmation — one calm Roman-Tuscany confirmation, not a choice ── */
  if (phase === "style_era") {
    return (
      <div style={pageStyle()}>
        {canonStyle}

        <div style={pageScrollerStyle}>
          <StepDots current={3} total={4} label={t("stepOf", { current: "3", total: "4" })} />

          <div className="onb-anim" style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem" }}>

              <Overline>{t("appName")}</Overline>

              {/* Laurel wreath — Roman identity glyph, ember-glyph ink */}
              <svg style={{ width: "3.25rem", height: "3.25rem" }} viewBox="0 0 44 44" fill="none" aria-hidden>
                <path d="M22 6C18 10 14 16 14 22C14 28 17 32 22 34C27 32 30 28 30 22C30 16 26 10 22 6Z"
                  stroke={EMBER_GLYPH} strokeWidth="1.2" fill="none" opacity="0.55" />
                <path d="M10 20C12 16 16 13 20 12" stroke={EMBER_GLYPH} strokeWidth="1" opacity="0.45" strokeLinecap="round" />
                <path d="M34 20C32 16 28 13 24 12" stroke={EMBER_GLYPH} strokeWidth="1" opacity="0.45" strokeLinecap="round" />
                <path d="M8 26C11 22 15 20 19 19" stroke={EMBER_GLYPH} strokeWidth="1" opacity="0.4" strokeLinecap="round" />
                <path d="M36 26C33 22 29 20 25 19" stroke={EMBER_GLYPH} strokeWidth="1" opacity="0.4" strokeLinecap="round" />
                <line x1="16" y1="36" x2="28" y2="36" stroke={EMBER_GLYPH} strokeWidth="1.2" opacity="0.65" />
                <line x1="18" y1="38" x2="26" y2="38" stroke={EMBER_GLYPH} strokeWidth="0.8" opacity="0.45" />
              </svg>

              <h2 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "1.75rem",
                fontWeight: 600, color: INK, lineHeight: 1.25, margin: 0,
              }}>
                {t("styleConfirmTitle") !== "styleConfirmTitle" ? t("styleConfirmTitle") : "Your palace style: Roman Tuscany"}
              </h2>
              <p style={{
                fontFamily: T.font.display, fontStyle: "italic", fontSize: "1rem",
                color: MUTED, maxWidth: "24rem", lineHeight: 1.6, margin: 0,
              }}>
                {t("styleConfirmAside") !== "styleConfirmAside" ? t("styleConfirmAside") : "Marble atriums, colonnaded gardens — we'll build it around you."}
              </p>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem",
                color: MUTED, maxWidth: "24rem", lineHeight: 1.5, margin: 0,
              }}>
                {t("styleConfirmReversible") !== "styleConfirmReversible" ? t("styleConfirmReversible") : "You can change this anytime."}
              </p>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", width: "100%", marginTop: "0.25rem" }}>
                <button
                  className="onb-focusable"
                  onClick={() => setPhase("name")}
                  style={{
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                    padding: "0 1.25rem", borderRadius: "0.75rem", minHeight: "3.25rem",
                    border: `0.0625rem solid ${HAIRLINE}`, background: "#FFF",
                    color: MUTED, cursor: "pointer",
                  }}
                >
                  {"←"} {t("backButton")}
                </button>
                <button
                  className="onb-cta onb-focusable"
                  onClick={() => {
                    setStyleEra("roman");
                    updateProfile({ styleEra: "roman" }).catch(() => {});
                    setPhase("wing_orient");
                  }}
                  style={{ ...primaryCtaStyle, flex: 1 }}
                >
                  {t("continueButton")} {"→"}
                </button>
              </div>

              <button className="onb-focusable" onClick={handleSkip} style={skipLinkStyle}>
                {t("skipExploreOwn")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Wing orientation — "One palace, five wings" (step 4/4, §7 SPEC E) ──
     Self-contained full-page card: brings its own R8 page container, scoped
     keyframes, EMBER focus ring and RM guard — no wrapper canonStyle needed. */
  if (phase === "wing_orient") {
    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", background: CREAM }}>
        <Suspense fallback={sceneLoadingFallback}>
          <OnboardingWingOrientStep
            onBack={() => setPhase("style_era")}
            onContinue={() => setPhase("upload")}
            onSkip={handleSkip}
          />
        </Suspense>
      </div>
    );
  }

  /* ── Upload — seeded room + first-memory placement (do-first) ── */
  if (phase === "upload") {
    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", background: CREAM }}>
        {canonStyle}
        <Suspense fallback={sceneLoadingFallback}>
          <OnboardingSceneHost scene="room" wingId="roots" roomId="ro1" roomName={onboardingRoomName} isMobile={isMobile} />
        </Suspense>

        {/* No seeded-memory tooltip here — the ImportHub's own upload prompt is
            the guidance; a floating tooltip overlapped it (owner feedback). The
            ImportHub close button doubles as "skip". */}

        {uploadError && (
          <div role="alert" style={{
            position: "absolute",
            top: "calc(1rem + env(safe-area-inset-top, 0px))", left: "50%", transform: "translateX(-50%)",
            zIndex: 8100, maxWidth: "26rem", width: "90%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            padding: "0.75rem 1rem", borderRadius: "0.75rem",
            background: "#F7EEEA", border: `0.0625rem solid #EBD4D0`,
            boxShadow: SHADOW[2],
          }}>
            <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#A63D3D", lineHeight: 1.5, textAlign: "center" }}>
              {uploadError}
            </span>
          </div>
        )}

        <Suspense fallback={sceneLoadingFallback}>
          <ImportHub
            onClose={() => { if (!memoryUploadedRef.current) completeAndFinish(paywallAllowed() ? "paywall" : "done"); }}
            onImportFiles={async (files) => {
              if (files.length === 0) return;
              const f = files[0];
              let dataUrl = f.previewUrl || f.url || "";
              if (f.file) {
                try {
                  dataUrl = await new Promise<string>((res, rej) => {
                    const reader = new FileReader();
                    reader.onload = () => res(reader.result as string);
                    reader.onerror = rej;
                    reader.readAsDataURL(f.file!);
                  });
                } catch { /* use previewUrl fallback */ }
              }
              // If nothing renderable survived all fallbacks, don't persist/celebrate
              // an empty memory — surface an error and keep the user on upload.
              if (!dataUrl) {
                setUploadError(t("uploadFailed"));
                throw new Error("no-dataurl");
              }
              const mem = {
                id: `onboarding-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                title: f.name,
                type: "photo",
                dataUrl,
                hue: 18, s: 50, l: 60, desc: "",
                createdAt: new Date().toISOString(),
              };
              // Persist the first memory through the SAME store path the in-app
              // ImportHub uses (optimistic local add + server upload + DB create).
              // addMemory returns true ONLY when the write actually persisted
              // (server id assigned, offline-queued, or supabase not configured).
              // We must gate on that boolean — inferring persistence from store
              // length is unreliable because the optimistic add seeds ro1 with the
              // 5 demo memories (getDemoMems fallback), so a rolled-back failure
              // still leaves length > 0 and would falsely celebrate an unsaved memory.
              setUploadError(null);
              const store = useMemoryStore.getState();
              let persisted = false;
              try {
                persisted = await store.addMemory("ro1", mem as any);
              } catch {
                setUploadError(t("uploadFailed"));
                throw new Error("save-failed");
              }
              if (!persisted) {
                // Optimistic add was rolled back — the write did NOT persist.
                setUploadError(t("uploadFailed"));
                throw new Error("save-rolled-back");
              }
              setUploadedMemory(mem);
              handleMemoryAdded();
            }}
            onOpenCloudProvider={() => {}}
            initialRoomId="ro1"
            lockRoom
            titleOverride={t("firstMemHubTitle") !== "firstMemHubTitle" ? t("firstMemHubTitle") : "Your first memory"}
            subtitleOverride={t("firstMemHubSubtitle") !== "firstMemHubSubtitle" ? t("firstMemHubSubtitle") : "A photo of yourself, family, or a place you love. You can add everything else later."}
          />
        </Suspense>
      </div>
    );
  }

  /* ── Celebration — calm gold threshold echoing the user's name (change 15) ── */
  if (phase === "celebration") {
    // Personalized copy that already exists in all 5 locales; degrade the {name}
    // token gracefully when empty (change 13). The threshold CTA branches on the
    // centralized paywall gate: where disallowed (iOS with IAP off — Apple
    // 3.1.1; Android native — no Play Billing) it always ENTERS the palace
    // (celebrationContinue -> done, no paywall); elsewhere it offers the soft
    // trial step (celebrationAtrium "Select your plan" -> paywall).
    const displayName = trimmedName || t("namePlaceholder");
    const celebTitle = (t("celebrationTitle") !== "celebrationTitle"
      ? t("celebrationTitle")
      : "Welcome home, {name}!").replace("{name}", displayName);
    const celebSubtitle = t("celebrationSubtitle") !== "celebrationSubtitle"
      ? t("celebrationSubtitle")
      : "Your palace is ready. Every memory you add makes it more yours.";
    // Tutorial-handoff hint (§9): points at the Atrium nudge tour that follows.
    // Free-tier-safe copy — passed to BOTH forks and BOTH platform branches.
    const celebHint = t("celebrationHandoffHint") !== "celebrationHandoffHint"
      ? t("celebrationHandoffHint")
      : "Step inside — a short tour of your Atrium is waiting.";
    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", background: CREAM }}>
        {canonStyle}
        <Suspense fallback={sceneLoadingFallback}>
          <OnboardingSceneHost scene="room" wingId="roots" roomId="ro1" roomName={onboardingRoomName} isMobile={isMobile} memories={uploadedMemory ? [uploadedMemory] : []} initialCameraZ={0} />
        </Suspense>
        {/* Ceremonial threshold. On short landscape phones the bottom-anchored
            fixed overlay inside OnboardingCelebration can push the CTA past the
            viewport, so this file renders a top-aligned, scrollable in-place
            threshold instead (mirroring the setup-card + paywall landscape
            treatment) keeping the CTA reachable without touching the shared
            celebration component. */}
        {isLandscapePhone ? (
          <div style={{
            position: "absolute", inset: 0, zIndex: 10000,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "flex-start",
            overflowY: "auto", padding: "1.5rem 0",
          }}>
            <div className="onb-anim" style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              textAlign: "center", gap: "1.25rem",
              padding: "2rem 1.5rem", maxWidth: "30rem", width: "92%",
              background: "#FFFFFF",
              border: `0.0625rem solid ${HAIRLINE}`,
              borderRadius: "1.25rem",
              boxShadow: `${SHADOW[2]}, ${TOP_HIGHLIGHT}`,
              animation: "onb-fadeUp .6s ease",
            }}>
              <span aria-hidden style={{
                display: "block", width: "3rem", height: "0.125rem",
                background: GOLD, borderRadius: "0.0625rem", opacity: 0.7,
              }} />
              <h2 style={{
                fontFamily: T.font.display, fontSize: "1.875rem", fontWeight: 600,
                color: INK, lineHeight: 1.15, margin: 0, fontStyle: "italic",
              }}>
                {celebTitle}
              </h2>
              <p style={{
                fontFamily: T.font.body, fontSize: "1.0625rem", fontWeight: 400,
                color: MUTED, lineHeight: 1.55, margin: 0, maxWidth: "24rem",
              }}>
                {celebSubtitle}
              </p>
              {/* Tutorial-handoff hint (§9 row [4]) — mirrors the shared
                  OnboardingCelebration hint row; this landscape fork doesn't
                  use the component, so the row is replicated inline. */}
              <p style={{
                fontFamily: T.font.body, fontStyle: "italic", fontSize: "0.9375rem",
                fontWeight: 400, color: MUTED, lineHeight: 1.5, margin: 0,
                maxWidth: "22rem", textAlign: "center",
              }}>
                <span aria-hidden style={{ color: EMBER, opacity: 0.8, marginRight: "0.375rem" }}>✦</span>
                {celebHint}
              </p>
              <button
                className="onb-cta onb-focusable"
                onClick={() => setPhase(paywallAllowed() ? "paywall" : "done")}
                style={{
                  fontFamily: T.font.body, fontSize: "1.0625rem", fontWeight: 600,
                  padding: "0 2.75rem", minHeight: "3.25rem", borderRadius: "0.75rem",
                  border: "none",
                  background: T.land.ctaGrad,
                  color: "#FFFFFF", cursor: "pointer",
                  boxShadow: SHADOW[1], marginTop: "0.5rem",
                }}
              >
                {paywallAllowed() ? t("celebrationAtrium") : t("celebrationContinue")}
              </button>
            </div>
          </div>
        ) : (
          <Suspense fallback={sceneLoadingFallback}>
            <OnboardingCelebration
              title={celebTitle}
              subtitle={celebSubtitle}
              buttonLabel={paywallAllowed() ? t("celebrationAtrium") : t("celebrationContinue")}
              onContinue={() => setPhase(paywallAllowed() ? "paywall" : "done")}
              hint={celebHint}
              transparent
            />
          </Suspense>
        )}
      </div>
    );
  }

  /* ── Paywall — soft trial offer after the celebration ──
     The trial CTA routes to /pricing, which on iOS drives the Apple IAP flow
     (StoreKit, never Stripe) and on web drives Stripe. The centralized gate
     (paywallAllowed) keeps it UNREACHABLE on iOS while IAP is off (Apple
     3.1.1) AND on Android native (no Play Billing — Stripe in the Android app
     would breach Play's payments policy); when IAP is live iOS reaches it and
     buys through Apple. */
  if (phase === "paywall" && paywallAllowed()) {
    const paywallFeatures = [
      t("paywallFeat1"),
      t("paywallFeat2"),
      t("paywallFeat3"),
      t("paywallFeat4"),
    ];

    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", background: CREAM }}>
        {canonStyle}
        <Suspense fallback={sceneLoadingFallback}>
          <OnboardingSceneHost scene="room" wingId="roots" roomId="ro1" roomName={onboardingRoomName} isMobile={isMobile} />
        </Suspense>

        {/* Warm-cream scrim (matches the calm celebration hand-off, not a dark
            cut). R8 scroller on EVERY viewport — flex-start + overflowY:auto
            with the card's margin:auto restoring centering when it fits — so a
            tall card (Comfortable/Large text scale on a short portrait phone)
            scrolls instead of flex-center clipping the trial CTA and the
            free-continue link off both edges. */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "rgba(252,250,245,0.72)",
          backdropFilter: "blur(0.375rem)", WebkitBackdropFilter: "blur(0.375rem)",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "flex-start",
          overflowY: "auto",
          padding: "calc(1.5rem + env(safe-area-inset-top, 0px)) 0 calc(1.5rem + env(safe-area-inset-bottom, 0px))",
        }}>
          {/* Opaque warm-cream card (Library canon) */}
          <div className="onb-anim" style={{
            maxWidth: "28rem", width: "92%", margin: "auto",
            padding: isMobile ? "2rem 1.5rem" : "2.5rem 2.25rem",
            background: CREAM,
            borderRadius: "1rem",
            border: `0.0625rem solid ${HAIRLINE}`,
            boxShadow: `${SHADOW[2]}, ${TOP_HIGHLIGHT}`,
            animation: "onb-fadeUp .6s ease",
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.25rem" }}>

              {/* Canon overline */}
              <Overline>{t("appName")}</Overline>

              {/* Title */}
              <h2 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.375rem" : "1.625rem",
                fontWeight: 600, color: INK, lineHeight: 1.25, margin: 0,
              }}>
                {t("paywallTitle", { name: trimmedName || t("namePlaceholder") })}
              </h2>

              {/* Subtitle */}
              <p style={{
                fontFamily: T.font.body, fontSize: "0.875rem",
                color: MUTED, maxWidth: "24rem", lineHeight: 1.6, margin: 0,
              }}>
                {t("paywallSubtitle")}
              </p>

              {/* Features */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem", textAlign: "left" }}>
                {paywallFeatures.map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <span aria-hidden style={{
                      width: "1.25rem", height: "1.25rem", borderRadius: "50%",
                      background: `${EMBER}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <CheckMark color={EMBER_GLYPH} size="0.75rem" strokeWidth={2.2} />
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", color: INK, lineHeight: 1.4,
                    }}>
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* Trial CTA — completes onboarding atomically, THEN same-document
                  nav to /pricing (Apple IAP on iOS, Stripe on web). One coherent
                  flow: no detached tab, no setPhase('done')/atrium race. */}
              <button
                className="onb-cta onb-focusable"
                onClick={handleTrialCta}
                style={{ ...primaryCtaStyle, width: "100%" }}
              >
                {t("paywallTrialCta")}
              </button>

              {/* Subscription disclosure — platform-forked: the Apple 3.1.2
                  wording ("billed to your Apple ID… Settings") only on the
                  iOS/IAP branch; web (Stripe) gets neutral renewal copy. */}
              <p style={{
                fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED,
                lineHeight: 1.5, margin: "-0.5rem 0 0", textAlign: "center", maxWidth: "22rem",
              }}>
                {isIOS()
                  ? (t("paywallAutoRenew") !== "paywallAutoRenew" ? t("paywallAutoRenew") : "Auto-renewable subscription billed to your Apple ID. Cancel anytime in Settings.")
                  : (t("paywallAutoRenewWeb") !== "paywallAutoRenewWeb" ? t("paywallAutoRenewWeb") : "Auto-renewing subscription. Cancel anytime.")}
              </p>

              {/* Legal links — own row with ≥2.75rem targets and a spacer glyph
                  between them (adjacent inline anchors were ~1.5rem mis-tap
                  hazards inside the disclosure paragraph). */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", margin: "-1rem 0 -0.75rem" }}>
                <a href="/terms" className="onb-focusable" style={{ display: "inline-flex", alignItems: "center", minHeight: "2.75rem", padding: "0 0.75rem", fontFamily: T.font.body, fontSize: "0.6875rem", color: EMBER_GLYPH, textDecoration: "underline", textUnderlineOffset: "0.1875rem" }}>{t("paywallTerms") !== "paywallTerms" ? t("paywallTerms") : "Terms"}</a>
                <span aria-hidden style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: MUTED }}>·</span>
                <a href="/privacy" className="onb-focusable" style={{ display: "inline-flex", alignItems: "center", minHeight: "2.75rem", padding: "0 0.75rem", fontFamily: T.font.body, fontSize: "0.6875rem", color: EMBER_GLYPH, textDecoration: "underline", textUnderlineOffset: "0.1875rem" }}>{t("paywallPrivacy") !== "paywallPrivacy" ? t("paywallPrivacy") : "Privacy"}</a>
              </div>

              {/* Free continue */}
              <button
                className="onb-focusable"
                onClick={() => {
                  track("paywall_skipped", { source: "onboarding" });
                  setPhase("done");
                }}
                style={skipLinkStyle}
              >
                {t("paywallContinueFree")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/* ── Helper: auto-advance after N seconds ── */
function VideoAutoAdvance({ seconds, onAdvance }: { seconds: number; onAdvance: () => void }) {
  const firedRef = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!firedRef.current) { firedRef.current = true; onAdvance(); }
    }, seconds * 1000);
    return () => clearTimeout(t);
  }, [seconds, onAdvance]);
  return null;
}
