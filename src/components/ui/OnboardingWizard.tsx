"use client";
import React, { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useIsPortrait } from "@/lib/hooks/useIsPortrait";
import { navigateInApp, isIOS } from "@/lib/native/platform";
import { IAP_ENABLED } from "@/lib/native/iap-flags";
import { useUserStore } from "@/lib/stores/userStore";
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

/* ── State machine ──
   Surviving flow: lang_a11y -> name -> style_era(confirmation) -> celebration(threshold)
   -> done (lands the user into the seeded room to place their first memory). The
   intro video, quiz, cinematic pre-roll, 4-leg auto-walk gauntlet and paywall are cut. */
type Phase =
  | "video_intro"      // Intro video plays first (full-screen)
  | "lang_a11y"        // Language + legibility (warm-cream card)
  | "name"             // Name input
  | "style_era"        // Roman Tuscany confirmation
  | "upload"           // Seeded room + ImportHub (first memory)
  | "celebration"      // Gold ceremonial threshold
  | "paywall"          // Soft trial offer (non-iOS only)
  | "done";

const SETUP_PHASES: Phase[] = ["video_intro", "lang_a11y", "name", "style_era"];
const PHASE_ORDER: Phase[] = [
  "video_intro", "lang_a11y", "name", "style_era", "upload", "celebration", "paywall", "done",
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

function persistPhase(p: Phase) { try { localStorage.setItem(STORAGE_KEY, p); } catch {} }
function loadPhase(): Phase | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as string | null;
    if (!v) return null;
    // iOS purchase gate: the paywall routes to /pricing, which on iOS drives the
    // Apple IAP flow (never Stripe). When IAP is live (IAP_ENABLED) iOS may resume
    // the paywall; while IAP is off, a saved 'paywall' remaps to 'done' (3.1.1 seal).
    if (v === "paywall" && isIOS() && !IAP_ENABLED) return "done";
    if (PHASE_ORDER.includes(v as Phase)) return v as Phase;
    if (RETIRED_PHASE_MAP[v]) return RETIRED_PHASE_MAP[v];
  } catch {}
  return null;
}
function cleanupStorage() { try { localStorage.removeItem(STORAGE_KEY); } catch {} }

/* ── Text size (mirrors AccessibilityProvider ScaleLevel) ── */
type TextSize = ScaleLevel;

/* ── Quiet canon step dots (AtriumRelay lane-dot grammar): filled=EMBER_GLYPH,
   unfilled=HAIRLINE, no numeric total, no growing bar. ── */
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ position: "absolute", top: "calc(2rem + env(safe-area-inset-top, 0px))", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: "0.6rem", height: "0.6rem", borderRadius: "50%",
          background: i + 1 <= current ? EMBER_GLYPH : HAIRLINE,
          transition: "background .4s ease",
        }} />
      ))}
    </div>
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
`;

interface OnboardingWizardProps {
  onFinish: (memoryUploaded?: boolean) => void;
}

export default function OnboardingWizard({ onFinish }: OnboardingWizardProps) {
  const isMobile = useIsMobile();
  const isPortrait = useIsPortrait();
  // Landscape phone: full-screen centered setup cards clip at the top when taller
  // than the short viewport. Switch to top-aligned + scrollable. Portrait unchanged.
  const isLandscapePhone = isMobile && !isPortrait;
  const { t, setLocaleNoReload } = useTranslation("onboarding");
  const {
    userName,
    setUserName, setUserGoal, setFirstWing, setStyleEra,
  } = useUserStore();
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
  // Brand-new run (no saved phase) -> "video_intro" (the intro video plays first).
  const [phase, setPhaseRaw] = useState<Phase>(() => loadPhase() || "video_intro");

  const setPhase = useCallback((p: Phase) => {
    setPhaseRaw(p);
    persistPhase(p);
  }, []);

  const memoryUploadedRef = useRef(false);
  const [uploadedMemory, setUploadedMemory] = useState<any>(null);

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
  const beginOutro = useCallback(() => {
    if (outroRef.current) return;
    outroRef.current = true;
    setVideoPlayed(true);
    if (videoRef.current) { videoRef.current.loop = true; videoRef.current.play().catch(() => {}); }
    setShowWelcome(true);
    setTimeout(() => setPhase("lang_a11y"), 2600);
  }, [setPhase]);

  // Force-play on mobile — autoplay can fail silently on iOS/Android. If it's
  // blocked during the intro, skip straight to the first setup card.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (phase === "video_intro") {
      v.play().catch(() => {
        setVideoPlayed(true);
        setPhase("lang_a11y");
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

  // ── Upload ──
  const handleMemoryAdded = useCallback(() => {
    memoryUploadedRef.current = true;
    setPhase("celebration");
  }, [setPhase]);

  // ── iOS purchase gate: while IAP is off (IAP_ENABLED=false) the paywall must be
  // UNREACHABLE on iOS (Apple 3.1.1) — coerce any stray 'paywall' to 'done'. When
  // IAP is live, iOS keeps the paywall (its /pricing CTA drives Apple IAP). ──
  useEffect(() => {
    if (phase === "paywall" && isIOS() && !IAP_ENABLED) setPhase("done");
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

  // ── Preload ImportHub during setup so it's ready when the user reaches the room ──
  useEffect(() => {
    if (phase === "style_era") {
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
.onb-focusable:focus-visible{outline:0.1875rem solid ${GOLD};outline-offset:0.1875rem}
    `}</style>
  );

  // Opaque warm-cream card (hairline border, no backdrop blur).
  const cardStyle: React.CSSProperties = {
    maxWidth: "30rem", width: "92%",
    padding: isMobile ? "2rem 1.25rem" : "2.5rem 2rem",
    background: CREAM,
    borderRadius: "1rem",
    border: `0.0625rem solid ${HAIRLINE}`,
    boxShadow: `${SHADOW[1]}, ${TOP_HIGHLIGHT}`,
    animation: "onb-fadeUp .5s ease",
  };

  const pageStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: "100vw", minHeight: "100vh", height: "100dvh", position: "relative",
    overflow: isMobile ? "auto" : "hidden", background: CREAM, ...extra,
  });

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

  // One primary EMBER CTA (ctaGrad, GOLD focus ring via .onb-focusable, >=3.25rem).
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
        border: `3px solid ${HAIRLINE}`, borderTopColor: EMBER,
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

  // ══════════════════════════════════════════════
  // PHASE RENDERS
  // ══════════════════════════════════════════════

  /* ── Video intro — full-screen /video/hero-ob.mp4, plays once then advances ── */
  if (phase === "video_intro") {
    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", overflow: "hidden", background: "#1a1917" }}>
        <style>{KEYFRAMES}</style>

        {/* Background video */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop={videoPlayed}
          playsInline
          preload="metadata"
          onEnded={beginOutro}
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

        {/* Welcome outro — fades in over the last moments of the video, in the
            app's warm gold display voice, so the hand-off to the first menu
            isn't an abrupt cut. */}
        {showWelcome && (
          <div style={{ position: "absolute", inset: 0, zIndex: 15, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", padding: "0 1.5rem", background: "radial-gradient(ellipse at center, rgba(26,25,23,0.35) 0%, rgba(26,25,23,0.72) 100%)", animation: "onb-welcomeIn 1.1s ease both" }}>
            <div style={{
              fontFamily: T.font.display, fontStyle: "italic",
              fontSize: isMobile ? "1.875rem" : "2.75rem", fontWeight: 600,
              color: "#E8C766", textAlign: "center", lineHeight: 1.2, letterSpacing: "0.01em",
              textShadow: "0 0.25rem 1.75rem rgba(0,0,0,0.55)",
            }}>
              {t("welcomeToPalace") !== "welcomeToPalace" ? t("welcomeToPalace") : "Welcome to your Memory Palace"}
            </div>
          </div>
        )}

        {/* Skip button */}
        <button
          onClick={() => {
            outroRef.current = true;
            setVideoPlayed(true);
            if (videoRef.current) { videoRef.current.loop = true; videoRef.current.play().catch(() => {}); }
            setPhase("lang_a11y");
          }}
          style={{
            position: "absolute", top: "calc(1.5rem + env(safe-area-inset-top, 0px))", right: "calc(1.5rem + env(safe-area-inset-right, 0px))", zIndex: 20,
            fontFamily: T.font.body, fontSize: "0.75rem",
            color: "rgba(255,255,255,0.85)", background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "0.375rem", padding: "0.5rem 0.875rem",
            cursor: "pointer", backdropFilter: "blur(4px)", minHeight: "2.5rem",
          }}
        >
          {t("cinematicSkip")}
        </button>

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

        <div style={{
          position: "relative", zIndex: 2,
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: isLandscapePhone ? "flex-start" : "center",
          overflowY: isLandscapePhone ? "auto" : undefined,
        }}>
          <StepDots current={1} total={3} />

          <div style={cardStyle}>
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
                <div role="radiogroup" aria-label={langLabel} style={{
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
                        {active && <span aria-hidden style={{ color: EMBER, fontWeight: 700 }}>{"✓"}</span>}
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
                <div role="radiogroup" aria-label={sizeLabel} style={{ display: "flex", gap: "0.375rem" }}>
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
                        onClick={() => setTextSize(size)}
                        style={{
                          flex: 1, fontFamily: T.font.body, fontSize: "0.75rem",
                          fontWeight: active ? 700 : 500,
                          padding: "0.5rem 0.25rem", borderRadius: "0.5rem",
                          border: `0.125rem solid ${active ? EMBER : HAIRLINE}`,
                          background: active ? `${EMBER}12` : "#FFF",
                          color: active ? EMBER : INK,
                          cursor: "pointer", transition: "all .2s", height: "3.5rem",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.125rem",
                          position: "relative",
                        }}
                      >
                        {active && (
                          <span aria-hidden style={{
                            position: "absolute", top: "0.25rem", right: "0.375rem",
                            color: EMBER, fontSize: "0.75rem", fontWeight: 700,
                          }}>{"✓"}</span>
                        )}
                        <span style={{ fontSize: fz, fontFamily: T.font.display, fontWeight: 400, lineHeight: 1 }}>Aa</span>
                        <span>{label}</span>
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

        <div style={{
          position: "relative", zIndex: 2,
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: isLandscapePhone ? "flex-start" : "center",
          overflowY: isLandscapePhone ? "auto" : undefined,
        }}>
          <StepDots current={2} total={3} />

          <div style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem" }}>

              <Overline>{t("appName")}</Overline>

              <h2 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "1.75rem",
                fontWeight: 600, color: INK, lineHeight: 1.25, margin: 0,
              }}>
                {t("nameTitle") !== "nameTitle" ? t("nameTitle") : t("whatToCallYou")}
              </h2>
              <p style={{
                fontFamily: T.font.display, fontStyle: "italic", fontSize: "0.9375rem",
                color: MUTED, maxWidth: "22rem", lineHeight: 1.6, margin: 0,
              }}>
                {t("nameAside") !== "nameAside" ? t("nameAside") : "So the house knows whose it is."}
              </p>
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
                  style={{
                    fontFamily: T.font.display, fontSize: "1rem", textAlign: "center",
                    padding: "0.875rem 1.5rem", border: `0.09375rem solid ${HAIRLINE}`,
                    borderRadius: "0.625rem", background: "#FFF", color: INK,
                    outline: "none", width: "100%", transition: "border-color .2s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = EMBER; }}
                  onBlur={(e) => { e.target.style.borderColor = HAIRLINE; }}
                  autoFocus
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

        <div style={{
          position: "relative", zIndex: 2,
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: isLandscapePhone ? "flex-start" : "center",
          overflowY: isLandscapePhone ? "auto" : undefined,
        }}>
          <StepDots current={3} total={3} />

          <div style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem" }}>

              <Overline>{t("appName")}</Overline>

              {/* Laurel wreath — Roman identity glyph, ember-glyph ink */}
              <svg width="52" height="52" viewBox="0 0 44 44" fill="none" aria-hidden>
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
                    setPhase("upload");
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

        <Suspense fallback={sceneLoadingFallback}>
          <ImportHub
            onClose={() => { if (!memoryUploadedRef.current) completeAndFinish((isIOS() && !IAP_ENABLED) ? "done" : "paywall"); }}
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
              setUploadedMemory({
                id: "onboarding-upload",
                title: f.name,
                type: "photo",
                dataUrl,
                hue: 18, s: 50, l: 60,
                createdAt: new Date().toISOString(),
              });
              handleMemoryAdded();
            }}
            onOpenCloudProvider={() => {}}
            initialRoomId="ro1"
            lockRoom
          />
        </Suspense>
      </div>
    );
  }

  /* ── Celebration — calm gold threshold echoing the user's name (change 15) ── */
  if (phase === "celebration") {
    // Personalized copy that already exists in all 5 locales; degrade the {name}
    // token gracefully when empty (change 13). CTA always enters (never a paywall).
    const displayName = trimmedName || t("namePlaceholder");
    const celebTitle = (t("celebrationTitle") !== "celebrationTitle"
      ? t("celebrationTitle")
      : "Welcome home, {name}!").replace("{name}", displayName);
    const celebSubtitle = t("celebrationSubtitle") !== "celebrationSubtitle"
      ? t("celebrationSubtitle")
      : "Your palace is ready. Every memory you add makes it more yours.";
    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", background: CREAM }}>
        {canonStyle}
        <Suspense fallback={sceneLoadingFallback}>
          <OnboardingSceneHost scene="room" wingId="roots" roomId="ro1" roomName={onboardingRoomName} isMobile={isMobile} memories={uploadedMemory ? [uploadedMemory] : []} initialCameraZ={0} />
        </Suspense>
        <Suspense fallback={sceneLoadingFallback}>
          <OnboardingCelebration
            title={celebTitle}
            subtitle={celebSubtitle}
            buttonLabel={(isIOS() && !IAP_ENABLED) ? t("celebrationContinue") : t("celebrationAtrium")}
            onContinue={() => setPhase((isIOS() && !IAP_ENABLED) ? "done" : "paywall")}
            transparent
          />
        </Suspense>
      </div>
    );
  }

  /* ── Paywall — soft trial offer after the celebration ──
     The trial CTA routes to /pricing, which on iOS drives the Apple IAP flow
     (StoreKit, never Stripe) and on web drives Stripe. While IAP is off
     (IAP_ENABLED=false) the paywall stays UNREACHABLE on iOS (Apple 3.1.1) via
     every isIOS()-guard; when IAP is live iOS reaches it and buys through Apple. */
  if (phase === "paywall" && (!isIOS() || IAP_ENABLED)) {
    const paywallFeatures = [
      t("paywallFeat1"),
      t("paywallFeat2"),
      t("paywallFeat3"),
      t("paywallFeat4"),
    ];

    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", background: "#1a1917" }}>
        <style>{KEYFRAMES}</style>
        <Suspense fallback={sceneLoadingFallback}>
          <OnboardingSceneHost scene="room" wingId="roots" roomId="ro1" roomName={onboardingRoomName} isMobile={isMobile} />
        </Suspense>

        {/* Dark overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          background: "rgba(26,25,23,0.75)",
          backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* Glass card */}
          <div style={{
            maxWidth: "28rem", width: "92%",
            padding: isMobile ? "2rem 1.5rem" : "2.5rem 2.25rem",
            background: "rgba(40, 34, 26, 0.85)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderRadius: "1.25rem",
            border: "1px solid rgba(198,107,61,0.15)",
            boxShadow: "0 1.5rem 4rem rgba(0,0,0,0.4), inset 0 1px 0 rgba(198,107,61,0.08)",
            animation: "onb-fadeUp .6s ease",
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.25rem" }}>

              {/* Ornamental header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <span style={{ width: "2rem", height: "1px", background: `${T.color.terracotta}40` }} />
                <span style={{
                  fontFamily: T.font.display, fontSize: "0.5625rem", fontWeight: 500,
                  color: T.color.terracotta, letterSpacing: "3px", textTransform: "uppercase",
                }}>
                  {t("appName")}
                </span>
                <span style={{ width: "2rem", height: "1px", background: `${T.color.terracotta}40` }} />
              </div>

              {/* Title */}
              <h2 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.375rem" : "1.625rem",
                fontWeight: 300, color: "#F2EDE7", lineHeight: 1.25, margin: 0,
              }}>
                {t("paywallTitle", { name: trimmedName || t("namePlaceholder") })}
              </h2>

              {/* Subtitle */}
              <p style={{
                fontFamily: T.font.body, fontSize: "0.875rem",
                color: "#A09889", maxWidth: "24rem", lineHeight: 1.6, margin: 0,
              }}>
                {t("paywallSubtitle")}
              </p>

              {/* Features */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem", textAlign: "left" }}>
                {paywallFeatures.map((feat) => (
                  <div key={feat} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <span style={{
                      width: "1.25rem", height: "1.25rem", borderRadius: "50%",
                      background: `${T.color.terracotta}18`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.625rem", color: T.color.terracotta, flexShrink: 0,
                    }}>
                      {"✓"}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", color: "#D4CBC0", lineHeight: 1.4,
                    }}>
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* Trial CTA — /pricing drives Apple IAP on iOS, Stripe on web */}
              <button
                onClick={() => {
                  track("paywall_trial_clicked", { source: "onboarding" });
                  navigateInApp("/pricing");
                  setPhase("done");
                }}
                style={{
                  width: "100%", fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                  padding: "0.875rem 0", borderRadius: "0.625rem", border: "none",
                  background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  color: "#FFF", cursor: "pointer", transition: "all .3s",
                  boxShadow: "0 0.25rem 1.25rem rgba(198,107,61,.3)",
                  minHeight: "3rem",
                }}
              >
                {t("paywallTrialCta")}
              </button>

              {/* Subscription disclosure (Apple Guideline 3.1.2) */}
              <p style={{
                fontFamily: T.font.body, fontSize: "0.625rem", color: "#8A8073",
                lineHeight: 1.5, margin: "-0.5rem 0 0", textAlign: "center", maxWidth: "22rem",
              }}>
                {t("paywallAutoRenew") !== "paywallAutoRenew" ? t("paywallAutoRenew") : "Auto-renewable subscription billed to your Apple ID. Cancel anytime in Settings."}{" "}
                <a href="/terms" style={{ color: T.color.terracotta, textDecoration: "none" }}>{t("paywallTerms") !== "paywallTerms" ? t("paywallTerms") : "Terms"}</a>
                {" · "}
                <a href="/privacy" style={{ color: T.color.terracotta, textDecoration: "none" }}>{t("paywallPrivacy") !== "paywallPrivacy" ? t("paywallPrivacy") : "Privacy"}</a>
              </p>

              {/* Free continue */}
              <button
                onClick={() => {
                  track("paywall_skipped", { source: "onboarding" });
                  setPhase("done");
                }}
                style={{
                  fontFamily: T.font.body, fontSize: "0.75rem",
                  color: "#6B6155", background: "none", border: "none",
                  cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "0.1875rem",
                }}
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
