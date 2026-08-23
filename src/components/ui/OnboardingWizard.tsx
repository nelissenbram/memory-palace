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
import { useTranslation } from "@/lib/hooks/useTranslation";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { updateProfile } from "@/lib/auth/profile-actions";
import { track } from "@/lib/analytics";
import { useAccessibility, type ScaleLevel } from "@/components/providers/AccessibilityProvider";
import { CREAM, INK, MUTED, HAIRLINE, EMBER, EMBER_GLYPH, GOLD, SHADOW, TOP_HIGHLIGHT } from "@/lib/libraryTokens";
import WalkCinematicCaption, { WalkCaptionPill, WalkCtaButton } from "@/components/ui/OnboardingWalkCaption";
import type { OnboardingScene } from "@/components/ui/OnboardingSceneHost";

const OnboardingSceneHost = lazy(() => import("@/components/ui/OnboardingSceneHost"));
const OnboardingCelebration = lazy(() => import("@/components/ui/OnboardingCelebration"));
const ConfettiBurst = lazy(() =>
  import("@/components/ui/OnboardingCelebration").then((m) => ({ default: m.ConfettiBurst })),
);
const ImportHub = lazy(() => import("@/components/ui/ImportHub"));

/* ── State machine (WALKTHROUGH RESTORE) ──
   video_intro -> lang_a11y -> name -> guided walkthrough (cinematic exterior
   flyover, entrance-hall look-around+blinks, corridor procession, room reveal)
   -> upload (first memory) -> celebration (gold threshold + confetti) ->
   paywall (gated) -> done. The walkthrough teaches wings physically — the
   style_era confirmation and wing_orient card are unrouted (components kept
   for settings/reuse; saved phases remapped below). */
type Phase =
  | "video_intro"      // Intro video plays first (full-screen)
  | "lang_a11y"        // Language + legibility (warm-cream card)
  | "name"             // Name input
  | "cinematic"        // Live 3D exterior — WP1 hold -> prompt -> 5-waypoint flyover
  | "walk_exterior"    // Skip-path exterior leg: direct auto-walk to the entrance
  | "walk_entrance"    // Hall look-around + blinks -> slow walk to the roots door
  | "walk_corridor"    // Corridor steps 0-7: demo painting -> room prompt -> door
  | "walk_room"        // Room steps 0-9: look-around -> empty painting prompt
  | "upload"           // Seeded room + ImportHub (first memory)
  | "celebration"      // Gold ceremonial threshold + confetti
  | "paywall"          // Soft trial offer (web / iOS-with-IAP only)
  | "done";

const SETUP_PHASES: Phase[] = ["video_intro", "lang_a11y", "name"];
const WALK_PHASES: Phase[] = ["walk_exterior", "walk_entrance", "walk_corridor", "walk_room"];
const PHASE_ORDER: Phase[] = [
  "video_intro", "lang_a11y", "name",
  "cinematic", "walk_exterior", "walk_entrance", "walk_corridor", "walk_room",
  "upload", "celebration", "paywall", "done",
];

/* Retired phases -> nearest surviving phase, so any stale saved state resolves
   instead of resurrecting a removed phase. quiz sat between name and style_era
   (resume at name — its inputs may be missing); style_era/wing_orient sat after
   name (resume at the walkthrough, which now teaches the wings physically).
   cinematic/walk_* are LIVE phases again and resume in place — each leg's scene
   replays its own choreography from the top of that leg on mount. */
const RETIRED_PHASE_MAP: Record<string, Phase> = {
  quiz: "name",
  style_era: "cinematic",
  wing_orient: "cinematic",
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
   the 2 setup cards (lang_a11y 1/2, name 2/2) — the full-screen video intro,
   the guided walkthrough and the do-first upload/celebration are ceremonial
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
  // tr(): inline EN-fallback lookup. t() returns the key itself when a key is
  // missing from every locale (the restored walkthrough keys land in a
  // follow-up i18n pass); tr() then falls back to English copy, applying
  // {var} interpolation to the fallback by hand (a missing key can't).
  const tr = useCallback(
    (key: string, fallback: string, vars?: Record<string, string>): string => {
      const v = t(key as any, vars);
      if (v !== key) return v;
      if (!vars) return fallback;
      return Object.entries(vars).reduce((s, [k, val]) => s.split(`{${k}}`).join(val), fallback);
    },
    [t],
  );
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

  // Apply the initial locale to the ACTIVE translation on mount, so the whole
  // flow renders in the starting language from the first screen. Owner canon:
  // a fresh run STARTS in English (selectedLocale init below) — a mid-flow
  // resume re-applies whatever the user already picked. Runs once.
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

  // ── Walkthrough leg state (restored from the guided walk) ──
  const [cinematicPaused, setCinematicPaused] = useState(false);
  const [cinematicResumed, setCinematicResumed] = useState(false);
  const [corridorStep, setCorridorStep] = useState(-1);
  const [roomStep, setRoomStep] = useState(-1);
  const [corridorEnterClicked, setCorridorEnterClicked] = useState(false);
  // Scene-ready per walk leg (E2E slow-env fix): the anti-stranding ceilings
  // below must NOT burn while a leg's 3D scene is still LOADING (headless/slow
  // devices: 60s+), or they fire mid-choreography. Each leg's ceiling arms only
  // once its scene reports REAL readiness — onSceneReady from
  // OnboardingSceneHost, fired at the scene's first rendered frame (or
  // immediately on the no-WebGL/error fallback, where the ceilings ARE the
  // choreography and must keep their original pacing). NEVER fired by the
  // host's internal 4s reveal-timeout. Reset on every phase change; the
  // scene-name check rejects a stray late signal from the previous leg's scene
  // during the host's 250ms crossfade.
  const [walkSceneReady, setWalkSceneReady] = useState(false);
  const prevWalkPhaseRef = useRef<Phase>(phase);
  useEffect(() => {
    const prev = prevWalkPhaseRef.current;
    prevWalkPhaseRef.current = phase;
    // cinematic → walk_exterior (per-leg skip) keeps the SAME live exterior
    // scene — no fresh onSceneReady will come, so readiness carries over.
    if (prev === "cinematic" && phase === "walk_exterior") return;
    setWalkSceneReady(false);
  }, [phase]);
  const handleWalkSceneReady = useCallback((readyScene: OnboardingScene) => {
    const expected =
      phase === "cinematic" || phase === "walk_exterior" ? "exterior" :
      phase === "walk_entrance" ? "entrance" :
      phase === "walk_corridor" ? "corridor" :
      phase === "walk_room" ? "room" : null;
    if (readyScene === expected) setWalkSceneReady(true);
  }, [phase]);


  // ── Language / A11y state ──
  // Owner canon: a FRESH run starts with ENGLISH visibly pre-selected — NOT the
  // browser/profile locale. Tapping a chip applies + persists immediately
  // (setLocaleNoReload in the chip handler), so a mid-flow resume (saved phase
  // in STORAGE_KEY) restores the user's in-wizard pick from mp_locale; without
  // a saved phase any pre-existing mp_locale is ignored in favor of English.
  const [selectedLocale, setSelectedLocale] = useState<Locale>(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) {
        const stored = localStorage.getItem("mp_locale") as Locale | null;
        if (stored && locales.includes(stored)) return stored;
      }
    } catch {}
    return "en";
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

  // ── Per-leg skip: every walkthrough leg is skippable to the NEXT phase in
  // order (cinematic -> walk_exterior -> walk_entrance -> ...); the final leg's
  // skip lands on upload. Nobody re-walks a skipped leg, nobody strands. ──
  const skipWalkLeg = useCallback(() => {
    track("onboarding_walk_leg_skipped", { phase });
    const idx = PHASE_ORDER.indexOf(phase);
    setPhase(idx >= 0 && idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : "upload");
  }, [phase, setPhase]);

  // ── Scene arrival handlers (restored walkthrough contract) ──
  // Exterior arrival: the flyover (or the walk_exterior auto-walk) reaches the
  // entrance and fires onRoomClick("__entrance__") — hold the door beat 3s,
  // then cut to the entrance hall. Timer owned by a ref so a fast skip/unmount
  // never fires setPhase on a gone component.
  const arrivalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (arrivalTimerRef.current) clearTimeout(arrivalTimerRef.current); }, []);
  const handleExteriorRoomClick = useCallback((id: string) => {
    if (id === "__entrance__" && (phase === "cinematic" || phase === "walk_exterior")) {
      if (arrivalTimerRef.current) clearTimeout(arrivalTimerRef.current);
      arrivalTimerRef.current = setTimeout(() => setPhase("walk_entrance"), 3000);
    }
  }, [phase, setPhase]);

  // Entrance hall: the look-around + blink cinematic ends (or its in-scene skip
  // fires) with onDoorClick("roots") at the roots door -> corridor leg.
  const handleEntranceDoorClick = useCallback((id: string) => {
    if (id === "roots" && phase === "walk_entrance") setPhase("walk_corridor");
  }, [phase, setPhase]);

  // Corridor: after "Enter The Room", the scene auto-walks to ro1 and fires
  // onDoorClick("ro1") on arrival -> room leg.
  const handleCorridorDoorClick = useCallback((id: string) => {
    if (id === "ro1" && phase === "walk_corridor") setPhase("walk_room");
  }, [phase, setPhase]);

  // Room: tapping the empty painting over the mantel fires
  // onMemoryClick("__upload_painting__") — honored immediately (no step gate,
  // a dead-feeling painting reads as "unresponsive") -> upload.
  const handleRoomPaintingClick = useCallback((id: string) => {
    if (id === "__upload_painting__" && phase === "walk_room") setPhase("upload");
  }, [phase, setPhase]);

  // Cinematic prompt fallback: the exterior scene fires onCinematicPause at the
  // WP1 hold; if it never does (stalled GL, reduced-motion stills path), surface
  // the prompt card anyway after 8s so the walk can always be started.
  useEffect(() => {
    if (phase !== "cinematic" || cinematicPaused) return;
    const timer = setTimeout(() => setCinematicPaused(true), 8000);
    return () => clearTimeout(timer);
  }, [phase, cinematicPaused]);

  // Cinematic flyover ceiling: once resumed, the flyover + zoom (up to ~18s)
  // ends in the arrival callback, which holds a 3s door beat before advancing
  // (~21s natural total). The ceiling is STRICTLY anti-stranding (stalled GL),
  // never pacing: full choreography + ~8s buffer = 30s, and it only ARMS after
  // the user resumes (the WP1 prompt wait is unbounded by design) AND the
  // exterior scene is actually live (walkSceneReady) — on a slow device the 8s
  // prompt fallback can surface "Yes, let's go!" while the scene is still
  // loading, and the 30s must not burn during that load. The 90s outer bound
  // below covers a scene that never goes live.
  useEffect(() => {
    if (phase === "cinematic" && cinematicResumed && walkSceneReady) {
      const timer = setTimeout(() => setPhase("walk_entrance"), 30000);
      return () => clearTimeout(timer);
    }
  }, [phase, cinematicResumed, walkSceneReady, setPhase]);

  // Safety fallback after "Enter The Room": the step-7 auto-walk to ro1 covers
  // ~4m at the 2.2m/s comfort cap (~2s) then fires the arrival callback. Only
  // if that callback never comes (stalled loop), open the room after
  // ~2s natural + 8s buffer = 10s — never mid-walk.
  useEffect(() => {
    if (corridorEnterClicked && phase === "walk_corridor") {
      const timer = setTimeout(() => setPhase("walk_room"), 10000);
      return () => clearTimeout(timer);
    }
  }, [corridorEnterClicked, phase, setPhase]);

  // Safety ceilings for the auto-walk legs — STRICTLY anti-stranding, never
  // pacing. The scenes advance only when their WebGL loop fires a callback; if
  // a scene stalls (GL context loss, throttled rAF), advance after a ceiling
  // set to the leg's FULL computed choreography duration + ~8s buffer, so it
  // can never fire mid-animation:
  //  - walk_exterior: 7s cart ride + 3s door beat = 10s        -> 18s ceiling
  //  - walk_entrance: 7.7s look-around + 12s walk  = 19.7s     -> 28s ceiling
  //  - walk_corridor: steps 0-5 = 13.5s (+0.5s/step mobile = 16.5s) -> 25s,
  //    DISARMED once step 6 shows "Enter The Room" (unbounded user decision;
  //    the post-click 10s ceiling above covers the step-7 auto-walk)
  //  - walk_room: steps 0-8 = 20.5s (+0.5s/step mobile = 25s)  -> 33s,
  //    DISARMED once step 9 shows the painting prompt + "Add a Memory" CTA
  //    (unbounded user-wait; the visible CTA already prevents stranding)
  // ARMING (E2E slow-env fix): each ceiling counts from the moment the leg is
  // LIVE — walkSceneReady (real first frame via onSceneReady) or, belt-and-
  // braces, the leg's first choreography step callback — never from phase
  // entry, so scene-load time (60s+ headless) can no longer eat the ceiling
  // and truncate choreography. While not live, the 90s outer bound below is
  // the only timer. DISARM = HARD CANCEL: when a dep flips (step >= 6/9
  // reached, phase leaves, liveness changes), the effect cleanup clears the
  // pending timeout BEFORE re-evaluating — a scheduled advance can never
  // outlive its disarm condition.
  const corridorWaitingForEnter = corridorStep >= 6;
  const roomWaitingForPainting = roomStep >= 9;
  const walkLegLive =
    walkSceneReady ||
    (phase === "walk_corridor" && corridorStep >= 0) ||
    (phase === "walk_room" && roomStep >= 0);
  useEffect(() => {
    if (!walkLegLive) return; // scene still loading — outer bound covers stranding
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (phase === "walk_exterior") {
      timer = setTimeout(() => setPhase("walk_entrance"), 18000);
    } else if (phase === "walk_entrance") {
      timer = setTimeout(() => setPhase("walk_corridor"), 28000);
    } else if (phase === "walk_corridor" && !corridorWaitingForEnter) {
      timer = setTimeout(() => setPhase("walk_room"), 25000);
    } else if (phase === "walk_room" && !roomWaitingForPainting) {
      timer = setTimeout(() => setPhase("upload"), 33000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [phase, walkLegLive, corridorWaitingForEnter, roomWaitingForPainting, setPhase]);

  // OUTER absolute bound — purely anti-infinite-loading: if a leg's scene
  // NEVER goes live (chunk never resolves, GL never produces a first frame),
  // advance 90s after phase entry (cinematic: after resume — the WP1 prompt
  // wait stays unbounded by design). Cancelled the moment the leg goes live,
  // when the armed ceilings above take over — so it can never cut real
  // choreography, and it can never override a step>=6/9 user-wait (steps
  // firing imply the leg is live, which disables this bound).
  useEffect(() => {
    if (walkLegLive) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (phase === "cinematic" && cinematicResumed) {
      timer = setTimeout(() => setPhase("walk_entrance"), 90000);
    } else if (phase === "walk_exterior") {
      timer = setTimeout(() => setPhase("walk_entrance"), 90000);
    } else if (phase === "walk_entrance") {
      timer = setTimeout(() => setPhase("walk_corridor"), 90000);
    } else if (phase === "walk_corridor") {
      timer = setTimeout(() => setPhase("walk_room"), 90000);
    } else if (phase === "walk_room") {
      timer = setTimeout(() => setPhase("upload"), 90000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [phase, cinematicResumed, walkLegLive, setPhase]);

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

  // ── Preload the 3D scene modules while the user types their name — perfect
  // time to warm the module cache before the cinematic; preload ImportHub
  // during the corridor/room legs so the painting tap opens it instantly. ──
  useEffect(() => {
    if (phase === "name") {
      import("@/lib/3d/scenePreloader")
        .then(({ preloadScene }) => {
          preloadScene("exterior");
          preloadScene("entrance");
        })
        .catch(() => {});
    }
    if (phase === "walk_corridor" || phase === "walk_room") {
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

  // Warm-ink glass skip chip for the walkthrough legs — same chrome/anchor as
  // the video skip chip, so "skip" reads as one gesture across the whole flow.
  const walkSkipChipStyle: React.CSSProperties = {
    position: "absolute", top: "calc(1.5rem + env(safe-area-inset-top, 0px))",
    right: "calc(1.5rem + env(safe-area-inset-right, 0px))", zIndex: 20,
    fontFamily: T.font.body, fontSize: "0.75rem",
    color: "rgba(255,255,255,0.9)", background: "rgba(64,59,54,0.45)",
    border: "0.0625rem solid rgba(64,59,54,0.55)",
    borderRadius: "0.5rem", padding: "0.5rem 1rem",
    cursor: "pointer", backdropFilter: "blur(0.25rem)",
    minHeight: "2.75rem", minWidth: "2.75rem",
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
          <StepDots current={1} total={2} label={t("stepOf", { current: "1", total: "2" })} />

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
    // Advancing from name enters the walkthrough. The style-era confirmation is
    // unrouted (walkthrough teaches the palace physically; era stays editable in
    // Settings) — persist the Roman default here, exactly where the old
    // style_era card used to write it.
    const advanceFromName = () => {
      if (!nameValid) return;
      setUserName(trimmedName);
      setStyleEra("roman");
      updateProfile({ styleEra: "roman" }).catch(() => {});
      setPhase("cinematic");
    };
    return (
      <div style={pageStyle()}>
        {canonStyle}

        <div style={pageScrollerStyle}>
          <StepDots current={2} total={2} label={t("stepOf", { current: "2", total: "2" })} />

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

  /* ── Cinematic — "Welcome to [Name]'s Palace" over the live exterior ──
     The scene holds at WP1 (onboardingMode); onCinematicPause surfaces the
     prompt card ("Ready to visit your palace…?" + Yes); cinematicResumed sends
     the camera on the 5-waypoint low flyover from the path to the entrance;
     the arrival fires onRoomClick("__entrance__") -> 3s door beat ->
     walk_entrance. Reduced motion: the scene swaps the flyover for composed
     stills/instant cuts; the 8s prompt fallback + 30s flyover ceiling
     guarantee forward motion even if a callback never fires. */
  if (phase === "cinematic") {
    const displayName = trimmedName || tr("namePlaceholder", "Your name");
    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", background: "#1a1917" }}>
        {canonStyle}
        <Suspense fallback={sceneLoadingFallback}>
          <OnboardingSceneHost
            scene="exterior"
            onboardingMode
            onRoomClick={handleExteriorRoomClick}
            onSceneReady={handleWalkSceneReady}
            onCinematicPause={() => setCinematicPaused(true)}
            cinematicResumed={cinematicResumed}
          />
        </Suspense>

        <WalkCinematicCaption
          isMobile={isMobile}
          overline={tr("welcomeTitle", "Welcome to")}
          title={tr("cinematicPalaceName", "{name}'s Palace", { name: displayName })}
          caption={tr("walkExterior", "This is your Memory Palace — a beautiful place to store everything you treasure.")}
        >
          {cinematicPaused && !cinematicResumed && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
              <p style={{
                fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.9375rem",
                color: "#D4CBC0", margin: 0, lineHeight: 1.5,
                textShadow: "0 0.125rem 0.75rem rgba(0,0,0,0.9), 0 0.0625rem 0.1875rem rgba(0,0,0,0.7)",
              }}>
                {tr("cinematicPrompt", "Ready to visit your palace and fill it with your memories?")}
              </p>
              <WalkCtaButton
                label={tr("cinematicYes", "Yes, let's go!")}
                onClick={() => setCinematicResumed(true)}
              />
            </div>
          )}
        </WalkCinematicCaption>

        {/* Skip chip -> the fast exterior leg (direct auto-walk to the door) */}
        <button className="onb-focusable" onClick={skipWalkLeg} style={walkSkipChipStyle}>
          {t("cinematicSkip")}
        </button>
      </div>
    );
  }

  /* ── Walk legs (restored guided walkthrough, canon captions) ── */
  if (WALK_PHASES.includes(phase)) {
    const sceneMap: Record<string, "exterior" | "entrance" | "corridor" | "room"> = {
      walk_exterior: "exterior",
      walk_entrance: "entrance",
      walk_corridor: "corridor",
      walk_room: "room",
    };
    const currentScene = sceneMap[phase] || "exterior";
    // Exterior skip-leg: direct auto-walk to the entrance. The entrance and
    // corridor scenes drive their own choreography internally (the corridor
    // auto-walks to ro1 at step 7 once corridorEnterClicked flips).
    const autoWalkTarget = phase === "walk_exterior" ? "__entrance__" : null;
    const displayName = trimmedName || tr("namePlaceholder", "Your name");

    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", background: "#1a1917" }}>
        {canonStyle}
        <Suspense fallback={sceneLoadingFallback}>
          <OnboardingSceneHost
            scene={currentScene}
            autoWalkTo={autoWalkTarget}
            onboardingMode
            onRoomClick={handleExteriorRoomClick}
            onSceneReady={handleWalkSceneReady}
            onDoorClick={
              phase === "walk_entrance" ? handleEntranceDoorClick :
              phase === "walk_corridor" ? handleCorridorDoorClick :
              phase === "walk_room" ? handleRoomPaintingClick :
              undefined
            }
            onCinematicStep={
              phase === "walk_corridor" ? setCorridorStep :
              phase === "walk_room" ? setRoomStep :
              undefined
            }
            roomName={onboardingRoomName}
            isMobile={isMobile}
            corridorEnterClicked={corridorEnterClicked}
          />
        </Suspense>

        {/* ── Exterior leg: warm-ink glass caption pill (walking to the door) ── */}
        {phase === "walk_exterior" && (
          <WalkCaptionPill
            isMobile={isMobile}
            message={tr("walkExterior", "This is your Memory Palace — a beautiful place to store everything you treasure.")}
            nextLabel={tr("walkNext", "Next")}
            onNext={skipWalkLeg}
            skipLabel={tr("walkSkip", "Skip tour")}
            onSkip={skipWalkLeg}
          />
        )}

        {/* ── Entrance leg: the hall scene renders its own canon look-around
            overlay + blinks + skip (legacy pre-Wave-1 cinematic branch,
            selected by onboardingMode through OnboardingSceneHost). The wizard
            adds only an SR caption so the leg is announced without doubling
            the on-screen text. ── */}
        {phase === "walk_entrance" && (
          <div role="status" aria-live="polite" style={{ position: "absolute", width: "1px", height: "1px", margin: "-1px", padding: 0, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>
            {tr("walkEntrance", "Through the entrance, you'll find wings for each part of your life.")}
          </div>
        )}

        {/* ── Corridor leg: cinematic caption overlay, steps 0-7 ── */}
        {phase === "walk_corridor" && corridorStep >= 0 && (
          <WalkCinematicCaption
            isMobile={isMobile}
            overline={tr("welcomeTitle", "Welcome to")}
            title={tr("cinematicPossessive", "{name}'s {thing}", { name: displayName, thing: tr("corridorWingName", "Roots Wing") })}
            caption={
              corridorStep >= 2
                ? tr("corridorSubtitle", "Every Wing has Rooms — small spaces within a larger one, each for a chapter with memories of you.")
                : tr("walkCorridor", "Each wing has rooms for your memories — photos, videos, stories.")
            }
          >
            {corridorStep >= 6 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                <p style={{
                  fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.9375rem",
                  color: "#D4CBC0", margin: 0, lineHeight: 1.5,
                  textShadow: "0 0.125rem 0.75rem rgba(0,0,0,0.9), 0 0.0625rem 0.1875rem rgba(0,0,0,0.7)",
                }}>
                  {tr("corridorRoomPromptPrefix", "Your personal Room is")}{" "}
                  <span style={{ color: EMBER, fontWeight: 600 }}>{tr("corridorRoomName", "Me, Over Time")}</span>
                </p>
                <WalkCtaButton
                  label={corridorEnterClicked ? `${tr("corridorEnterRoom", "Enter The Room")}…` : tr("corridorEnterRoom", "Enter The Room")}
                  onClick={() => setCorridorEnterClicked(true)}
                  disabled={corridorEnterClicked}
                />
              </div>
            )}
          </WalkCinematicCaption>
        )}

        {/* ── Room leg: cinematic caption overlay, steps 0-9 ── */}
        {phase === "walk_room" && roomStep >= 0 && (
          <WalkCinematicCaption
            isMobile={isMobile}
            overline={tr("welcomeTitle", "Welcome to")}
            title={tr("cinematicPossessive", "{name}'s {thing}", { name: displayName, thing: tr("roomTitle", "Me, Over Time Room") })}
            caption={
              roomStep >= 4
                ? tr("roomSubtitle", "Every Room in your Palace holds your memories — pictures, videos, voice notes, written stories, and more.")
                : tr("walkRoom", "This is your first room. Ready to place your first memory?")
            }
          >
            {roomStep >= 9 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                <p style={{
                  fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.9375rem",
                  color: "#D4CBC0", margin: 0, lineHeight: 1.5,
                  textShadow: "0 0.125rem 0.75rem rgba(0,0,0,0.9), 0 0.0625rem 0.1875rem rgba(0,0,0,0.7)",
                }}>
                  {tr("roomHangPrompt", "Let's hang your first memory on the wall.")}
                </p>
                {/* Instructional hint chip — points at the empty painting, not a button */}
                <span style={{
                  display: "inline-block",
                  fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600,
                  letterSpacing: "0.04em",
                  padding: "0.5rem 1.5rem",
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(250,250,247,0.65)",
                  border: "0.0625rem solid rgba(255,255,255,0.14)",
                  borderRadius: "0.5rem",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}>
                  {tr("roomClickPainting", "Click on the empty painting")}
                </span>
                <WalkCtaButton
                  label={tr("walkAddMemory", "Add a Memory")}
                  onClick={() => setPhase("upload")}
                />
              </div>
            )}
          </WalkCinematicCaption>
        )}

        {/* Skip chip on the exterior + room legs (the entrance and corridor
            scenes carry their own in-scene skip buttons at this anchor). */}
        {(phase === "walk_exterior" || phase === "walk_room") && (
          <button className="onb-focusable" onClick={skipWalkLeg} style={walkSkipChipStyle}>
            {tr("walkSkip", "Skip tour")}
          </button>
        )}
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

  /* ── Celebration — gold threshold + restored confetti over the room scene
     showing the just-hung memory (walkthrough finale keys). The threshold CTA
     branches on the centralized paywall gate: where disallowed (iOS with IAP
     off — Apple 3.1.1; Android native — no Play Billing) it always ENTERS the
     palace (celebrationContinue -> done, no paywall); elsewhere it offers the
     soft trial step (celebrationAtrium "Select your plan" -> paywall). ── */
  if (phase === "celebration") {
    const celebTitle = tr("celebrationTitle2", "Congratulations!");
    const celebSubtitle = tr("celebrationSubtitle2", "Now continue exploring your Memory Palace");
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
            {/* Restored confetti burst — self-guards under reduced motion */}
            <Suspense fallback={null}>
              <ConfettiBurst />
            </Suspense>
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
