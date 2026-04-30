"use client";
import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useUserStore } from "@/lib/stores/userStore";
import { useWalkthroughStore } from "@/lib/stores/walkthroughStore";
import { useTranslation, detectBrowserLocale } from "@/lib/hooks/useTranslation";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { WINGS } from "@/lib/constants/wings";
import { updateProfile } from "@/lib/auth/profile-actions";
import { track } from "@/lib/analytics";

const OnboardingSceneHost = lazy(() => import("@/components/ui/OnboardingSceneHost"));
const OnboardingTooltip = lazy(() => import("@/components/ui/OnboardingTooltip"));
const OnboardingCelebration = lazy(() => import("@/components/ui/OnboardingCelebration"));
const ImportHub = lazy(() => import("@/components/ui/ImportHub"));

/* ── State machine ── */
type Phase =
  | "video_intro"      // Emotional video plays first
  | "lang_a11y"        // Language + text size (video loops bg)
  | "name"             // Name input (video loops bg)
  | "quiz"             // Personalization quiz (3 questions)
  | "style_era"        // Roman vs Renaissance (video loops bg)
  | "cinematic"        // Live 3D — "Welcome to X's Palace"
  | "walk_exterior"
  | "walk_entrance"
  | "walk_corridor"
  | "walk_room"
  | "paywall"          // Soft paywall — trial offer after sunk-cost walkthrough
  | "upload"
  | "celebration"
  | "done";

const WALK_PHASES: Phase[] = ["walk_exterior", "walk_entrance", "walk_corridor", "walk_room"];
const SETUP_PHASES: Phase[] = ["video_intro", "lang_a11y", "name", "quiz", "style_era"];
const PHASE_ORDER: Phase[] = [
  "video_intro", "lang_a11y", "name", "quiz", "style_era", "cinematic",
  "walk_exterior", "walk_entrance", "walk_corridor", "walk_room",
  "upload", "paywall", "celebration", "done",
];

const STORAGE_KEY = "mp_onboarding_phase";
const WALK_DONE_KEY = "mp_onboarding_walk_done";

function persistPhase(p: Phase) { try { localStorage.setItem(STORAGE_KEY, p); } catch {} }
function loadPhase(): Phase | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as Phase | null;
    if (v && PHASE_ORDER.includes(v)) return v;
  } catch {}
  return null;
}
function cleanupStorage() { try { localStorage.removeItem(STORAGE_KEY); } catch {} }

/* ── Text size ── */
type TextSize = "standard" | "comfortable" | "large";
const TEXT_SIZE_SCALE: Record<TextSize, number> = { standard: 1, comfortable: 1.125, large: 1.25 };

/* ── (flags removed — clean text-only language buttons) ── */

/* ── Branding header shared across all 3 setup screens ── */
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ position: "absolute", top: "2rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i + 1 === current ? "1.5rem" : "0.375rem", height: "0.375rem", borderRadius: "0.1875rem",
          background: i < current ? T.color.terracotta : "rgba(255,255,255,0.12)",
          transition: "all .4s ease",
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
`;

interface OnboardingWizardProps {
  onFinish: (memoryUploaded?: boolean) => void;
}

export default function OnboardingWizard({ onFinish }: OnboardingWizardProps) {
  const isMobile = useIsMobile();
  const { t, locale, setLocaleNoReload } = useTranslation("onboarding");
  const { t: tPalace } = useTranslation("palace");
  const {
    userName, styleEra,
    setUserName, setUserGoal, setFirstWing, setStyleEra, setOnboarded,
  } = useUserStore();

  useEffect(() => {
    // Goal is now set by the quiz phase; only default firstWing here
    setFirstWing("roots");
  }, [setFirstWing]);

  // ── Phase state ──
  const [phase, setPhaseRaw] = useState<Phase>(() => {
    const saved = loadPhase();
    if (saved && WALK_PHASES.includes(saved)) return "walk_exterior";
    if (saved && SETUP_PHASES.includes(saved)) return "video_intro";
    if (saved === "cinematic" || saved === "upload" || saved === "paywall") return "walk_exterior";
    if (saved === "celebration") return "celebration";
    return "video_intro";
  });

  const setPhase = useCallback((p: Phase) => {
    setPhaseRaw(p);
    persistPhase(p);
  }, []);

  const memoryUploadedRef = useRef(false);
  const [uploadedMemory, setUploadedMemory] = useState<any>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [cinematicPaused, setCinematicPaused] = useState(false);
  const [cinematicResumed, setCinematicResumed] = useState(false);
  const [corridorStep, setCorridorStep] = useState(-1);
  const [roomStep, setRoomStep] = useState(-1);

  // ── Language / A11y state ──
  // Check localStorage directly — the hook's `locale` hasn't hydrated yet on first render
  const [selectedLocale, setSelectedLocale] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem("mp_locale") as Locale | null;
      if (stored && locales.includes(stored)) return stored;
    } catch {}
    return detectBrowserLocale();
  });
  const [textSize, setTextSize] = useState<TextSize>("standard");
  const [selectedEra, setSelectedEra] = useState<"roman" | "renaissance">(
    (styleEra as "roman" | "renaissance") || "roman"
  );

  // ── Quiz state ──
  const [quizStep, setQuizStep] = useState(0);
  const [quizGoal, setQuizGoal] = useState<string | null>(null);
  const [quizScale, setQuizScale] = useState<string | null>(null);
  const [quizAudience, setQuizAudience] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.style.fontSize = `${TEXT_SIZE_SCALE[textSize] * 100}%`;
    return () => { document.documentElement.style.fontSize = ""; };
  }, [textSize]);

  // ── Video state ──
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlayed, setVideoPlayed] = useState(false);

  // Force-play on mobile — autoplay can fail silently on iOS/Android
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (phase === "video_intro") {
      v.play().catch(() => {
        // Autoplay blocked — skip directly to next phase
        setVideoPlayed(true);
        setPhase("lang_a11y");
      });
    } else if (SETUP_PHASES.includes(phase)) {
      // Ensure video keeps playing as background during setup phases
      v.loop = true;
      v.play().catch(() => {});
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preload 3D scene modules during setup phases (before user reaches cinematic) ──
  useEffect(() => {
    if (phase === "name" || phase === "quiz" || phase === "style_era") {
      // User is filling in their name / picking era — perfect time to warm the module cache
      import("@/lib/3d/scenePreloader").then(({ preloadScene }) => {
        preloadScene("exterior");
        preloadScene("entrance");
      }).catch(() => {});
    }
  }, [phase]);

  // ── Skip ──
  const handleSkip = useCallback(() => {
    track("onboarding_skipped", { phase });
    // Use quiz answer if already chosen, otherwise fall back to "preserve"
    const savedGoal = (() => { try { return localStorage.getItem("mp_user_goal"); } catch { return null; } })();
    setUserGoal(savedGoal || "preserve");
    setStyleEra(selectedEra);
    setFirstWing("roots");
    useWalkthroughStore.getState().skip();
    setOnboarded(true);
    cleanupStorage();
    onFinish(false);
  }, [setUserGoal, setStyleEra, setFirstWing, setOnboarded, onFinish, selectedEra, phase]);

  // ── Scene arrival handlers ──
  const handleExteriorRoomClick = useCallback((id: string) => {
    // Cinematic phase zooms to entrance → 3s pause, then entrance hall
    if (id === "__entrance__" && (phase === "cinematic" || phase === "walk_exterior")) {
      setTimeout(() => setPhase("walk_entrance"), 3000);
    }
  }, [phase, setPhase]);

  const handleEntranceDoorClick = useCallback((id: string) => {
    if (id === "roots" && phase === "walk_entrance") setPhase("walk_corridor");
  }, [phase, setPhase]);

  const [corridorEnterClicked, setCorridorEnterClicked] = useState(false);
  const handleCorridorDoorClick = useCallback((id: string) => {
    // Auto-walk arrived at door → auto-transition to room
    if (id === "ro1" && phase === "walk_corridor") {
      setPhase("walk_room");
    }
  }, [phase, setPhase]);

  // Safety fallback: auto-transition to room 4s after Enter Room clicked
  useEffect(() => {
    if (corridorEnterClicked && phase === "walk_corridor") {
      const t = setTimeout(() => setPhase("walk_room"), 4000);
      return () => clearTimeout(t);
    }
  }, [corridorEnterClicked, phase, setPhase]);

  const handleRoomPaintingClick = useCallback((id: string) => {
    if (id === "__upload_painting__" && phase === "walk_room" && roomStep >= 9) {
      setPhase("upload");
    }
  }, [phase, roomStep, setPhase]);

  // ── Upload ──
  const handleMemoryAdded = useCallback(() => {
    memoryUploadedRef.current = true;
    setPhase("paywall");
  }, [setPhase]);

  // ── Done ──
  useEffect(() => {
    if (phase === "done") {
      track("onboarding_completed", { memoryUploaded: memoryUploadedRef.current });
      try { localStorage.setItem(WALK_DONE_KEY, "true"); } catch {}
      cleanupStorage();
      onFinish(memoryUploadedRef.current);
    }
  }, [phase, onFinish]);

  // ── Onboarding room data ──
  const onboardingRoomName: string | undefined = undefined; // Keep default room names from WING_ROOMS

  // ══════════════════════════════════════════════
  // SHARED: Video background for setup phases
  // ══════════════════════════════════════════════
  const isSetupPhase = SETUP_PHASES.includes(phase);

  const videoBackground = (
    <video
      ref={videoRef}
      autoPlay={phase === "video_intro"}
      muted
      loop={videoPlayed}
      playsInline
      preload="metadata"
      onEnded={() => {
        setVideoPlayed(true);
        // After first play, switch to loop mode and transition to lang_a11y
        if (videoRef.current) {
          videoRef.current.loop = true;
          videoRef.current.play().catch(() => {});
        }
        if (phase === "video_intro") setPhase("lang_a11y");
      }}
      style={{
        position: "fixed", inset: 0,
        width: "100%", height: "100%",
        objectFit: "cover",
        objectPosition: isMobile ? "60% center" : "center center",
        // During intro: brighter. During setup: match landing page warmth
        opacity: phase === "video_intro" ? 0.65 : 0.45,
        filter: phase === "video_intro"
          ? "saturate(0.7) brightness(1.1)"
          : "saturate(0.7) brightness(1.0) blur(2px)",
        transition: "opacity 1.2s ease, filter 1.2s ease",
        zIndex: 0,
      }}
    >
      <source src="/video/hero-ob.mp4" type="video/mp4" />
    </video>
  );

  const gradientOverlay = (
    <div style={{
      position: "fixed", inset: 0,
      background: phase === "video_intro"
        ? "linear-gradient(180deg, rgba(26,25,23,0.15) 0%, rgba(26,25,23,0.3) 50%, rgba(26,25,23,0.7) 100%)"
        : "radial-gradient(ellipse at center, rgba(26,25,23,0.4), rgba(26,25,23,0.65))",
      transition: "background 1s ease",
      pointerEvents: "none",
      zIndex: 1,
    }} />
  );

  // ══════════════════════════════════════════════
  // PHASE RENDERS
  // ══════════════════════════════════════════════

  /* ── Video intro — plays once, then transitions ── */
  if (phase === "video_intro") {
    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", overflow: "hidden", background: "#1a1917" }}>
        <style>{KEYFRAMES}</style>
        {videoBackground}
        {gradientOverlay}

        {/* Skip button */}
        <button
          onClick={() => {
            setVideoPlayed(true);
            if (videoRef.current) { videoRef.current.loop = true; videoRef.current.play().catch(() => {}); }
            setPhase("lang_a11y");
          }}
          style={{
            position: "absolute", top: "1.5rem", right: "1.5rem", zIndex: 20,
            fontFamily: T.font.body, fontSize: "0.75rem",
            color: "rgba(255,255,255,0.35)", background: "rgba(0,0,0,0.2)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.375rem", padding: "0.5rem 0.875rem",
            cursor: "pointer", backdropFilter: "blur(4px)", minHeight: "2.5rem",
          }}
        >
          {t("cinematicSkip")}
        </button>

        {/* Auto-advance after 15s if video hasn't ended */}
        <VideoAutoAdvance seconds={15} onAdvance={() => {
          setVideoPlayed(true);
          if (videoRef.current) { videoRef.current.loop = true; videoRef.current.play().catch(() => {}); }
          setPhase("lang_a11y");
        }} />
      </div>
    );
  }

  /* ── Language + Accessibility — elevated design ── */
  if (phase === "lang_a11y") {
    return (
      <div style={{ width: "100vw", minHeight: "100vh", height: "100dvh", position: "relative", overflow: isMobile ? "auto" : "hidden", background: "#1a1917" }}>
        <style>{KEYFRAMES}</style>
        {videoBackground}
        {gradientOverlay}

        <div style={{
          position: "relative", zIndex: 2,
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <StepIndicator current={1} total={4} />

          {/* Glass card container — warm bronze tint */}
          <div style={{
            maxWidth: "30rem", width: "92%",
            padding: isMobile ? "2rem 1.25rem" : "2.5rem 2rem",
            background: "rgba(40, 34, 26, 0.6)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderRadius: "1.25rem",
            border: "1px solid rgba(193,127,89,0.1)",
            boxShadow: "0 1rem 3rem rgba(0,0,0,0.3), inset 0 1px 0 rgba(193,127,89,0.06)",
            animation: "onb-fadeUp .6s ease",
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem" }}>

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

              <h2 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "1.75rem",
                fontWeight: 300, color: "#F2EDE7", lineHeight: 1.25, margin: 0,
              }}>
                {t("chooseLangTitle")}
              </h2>

              {/* Language grid — text only, no flags */}
              <div style={{ width: "100%" }}>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.625rem",
                  color: "#7A6F63", textAlign: "left", marginBottom: "0.5rem",
                  fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px",
                }}>
                  {t("chooseLangSubtitle")}
                </p>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
                  gap: "0.4375rem",
                }}>
                  {locales.map((loc) => {
                    const active = loc === selectedLocale;
                    return (
                      <button
                        key={loc}
                        onClick={() => { setSelectedLocale(loc); setLocaleNoReload(loc); }}
                        style={{
                          fontFamily: T.font.body, fontSize: "0.8125rem",
                          fontWeight: active ? 600 : 400,
                          padding: "0.6875rem 0.5rem", borderRadius: "0.5rem",
                          border: `1.5px solid ${active ? T.color.terracotta : "rgba(255,255,255,0.06)"}`,
                          background: active ? `${T.color.terracotta}12` : "rgba(255,255,255,0.02)",
                          color: active ? T.color.terracotta : "#C4B8A8",
                          cursor: "pointer", transition: "all .2s", minHeight: "2.75rem",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                        }}
                      >
                        {localeNames[loc]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: "100%", height: "1px", background: "rgba(255,255,255,0.05)" }} />

              {/* Text size */}
              <div style={{ width: "100%" }}>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.625rem",
                  color: "#7A6F63", textAlign: "left", marginBottom: "0.5rem",
                  fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px",
                }}>
                  {t("textSizeTitle")}
                </p>
                <div style={{ display: "flex", gap: "0.375rem" }}>
                  {(["standard", "comfortable", "large"] as TextSize[]).map((size) => {
                    const active = size === textSize;
                    const label = t(`textSize${size.charAt(0).toUpperCase() + size.slice(1)}` as any);
                    const fz = size === "standard" ? "0.9375rem" : size === "comfortable" ? "1.0625rem" : "1.25rem";
                    return (
                      <button
                        key={size}
                        onClick={() => setTextSize(size)}
                        style={{
                          flex: 1, fontFamily: T.font.body, fontSize: "0.6875rem",
                          fontWeight: active ? 600 : 400,
                          padding: "0.75rem 0.25rem", borderRadius: "0.5rem",
                          border: `1.5px solid ${active ? T.color.terracotta : "rgba(255,255,255,0.06)"}`,
                          background: active ? `${T.color.terracotta}12` : "rgba(255,255,255,0.02)",
                          color: active ? T.color.terracotta : "#A09889",
                          cursor: "pointer", transition: "all .2s", minHeight: "3.25rem",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: "0.125rem",
                        }}
                      >
                        <span style={{ fontSize: fz, fontFamily: T.font.display, fontWeight: 300, lineHeight: 1 }}>Aa</span>
                        <span style={{ fontSize: size === "comfortable" ? "0.8125rem" : size === "large" ? "0.9375rem" : undefined }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Continue */}
              <button
                onClick={() => setPhase("name")}
                style={{
                  fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                  padding: "0.8125rem 0", borderRadius: "0.5rem", border: "none",
                  background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  color: "#FFF", cursor: "pointer", transition: "all .3s",
                  boxShadow: "0 0.25rem 1.25rem rgba(193,127,89,.25)",
                  minHeight: "3rem", width: "100%",
                }}
              >
                {t("continueButton")}
              </button>

              <button onClick={handleSkip} style={{
                fontFamily: T.font.body, fontSize: "0.6875rem",
                color: "#5A5248", background: "none", border: "none",
                cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "0.1875rem",
              }}>
                {t("skipExploreOwn")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Name screen — same glass card style ── */
  if (phase === "name") {
    return (
      <div style={{ width: "100vw", minHeight: "100vh", height: "100dvh", position: "relative", overflow: isMobile ? "auto" : "hidden", background: "#1a1917" }}>
        <style>{KEYFRAMES}</style>
        {videoBackground}
        {gradientOverlay}

        <div style={{
          position: "relative", zIndex: 2,
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <StepIndicator current={2} total={4} />

          {/* Glass card — warm bronze tint */}
          <div style={{
            maxWidth: "30rem", width: "92%",
            padding: isMobile ? "2rem 1.25rem" : "2.5rem 2rem",
            background: "rgba(40, 34, 26, 0.6)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderRadius: "1.25rem",
            border: "1px solid rgba(193,127,89,0.1)",
            boxShadow: "0 1rem 3rem rgba(0,0,0,0.3), inset 0 1px 0 rgba(193,127,89,0.06)",
            animation: "onb-fadeUp .5s ease",
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem" }}>

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

              <h2 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "1.75rem",
                fontWeight: 300, color: "#F2EDE7", lineHeight: 1.25, margin: 0,
              }}>
                {t("whatToCallYou")}
              </h2>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem",
                color: "#A09889", maxWidth: "22rem", lineHeight: 1.6, margin: 0,
              }}>
                {t("nameDescription")}
              </p>
              <div style={{ width: "100%", maxWidth: "20rem" }}>
                <input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  style={{
                    fontFamily: T.font.display, fontSize: isMobile ? "1.125rem" : "1.5rem", textAlign: "center",
                    padding: "0.875rem 1.5rem", border: "1.5px solid rgba(193,127,89,0.18)",
                    borderRadius: "0.625rem", background: "rgba(40,34,26,0.4)", color: "#F2EDE7",
                    outline: "none", width: "100%", transition: "border-color .2s",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = T.color.terracotta; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(193,127,89,0.18)"; }}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter" && userName.trim()) setPhase("quiz"); }}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
                <button
                  onClick={() => setPhase("lang_a11y")}
                  style={{
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                    padding: "0.75rem 1.5rem", borderRadius: "0.5rem",
                    border: "1px solid rgba(193,127,89,0.15)", background: "transparent",
                    color: "#A09889", cursor: "pointer", minHeight: "3rem",
                  }}
                >
                  {"\u2190"} {t("backButton")}
                </button>
                <button
                  onClick={() => setPhase("quiz")}
                  disabled={!userName.trim()}
                  style={{
                    flex: 1, fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600,
                    padding: "0.75rem 2rem", borderRadius: "0.5rem", minHeight: "3rem", border: "none",
                    background: userName.trim() ? `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})` : "rgba(255,255,255,0.06)",
                    color: userName.trim() ? "#FFF" : "#6B6155",
                    cursor: userName.trim() ? "pointer" : "default",
                    boxShadow: userName.trim() ? "0 0.25rem 1rem rgba(193,127,89,.3)" : "none",
                  }}
                >
                  {t("continueButton")} {"\u2192"}
                </button>
              </div>

              <button onClick={handleSkip} style={{
                fontFamily: T.font.body, fontSize: "0.6875rem",
                color: "#5A5248", background: "none", border: "none",
                cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "0.1875rem",
              }}>
                {t("skipExploreOwn")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Personalization Quiz — 3 questions ── */
  if (phase === "quiz") {
    const QUIZ_QUESTIONS = [
      {
        key: "quizQ1" as const,
        options: [
          { label: "quizQ1o1" as const, icon: "\uD83C\uDFDB\uFE0F", value: "preserve" },
          { label: "quizQ1o2" as const, icon: "\uD83D\uDCD6", value: "stories" },
          { label: "quizQ1o3" as const, icon: "\uD83C\uDF33", value: "genealogy" },
          { label: "quizQ1o4" as const, icon: "\uD83D\uDCF8", value: "organize" },
        ],
        selected: quizGoal,
        onSelect: (v: string) => {
          setQuizGoal(v);
          try { localStorage.setItem("mp_user_goal", v); } catch {}
          setUserGoal(v);
          setTimeout(() => setPhase("style_era"), 300);
        },
      },
    ];

    const currentQ = QUIZ_QUESTIONS[quizStep];

    return (
      <div style={{ width: "100vw", minHeight: "100vh", height: "100dvh", position: "relative", overflow: isMobile ? "auto" : "hidden", background: "#1a1917" }}>
        <style>{KEYFRAMES}{`
@keyframes onb-quizFade{from{opacity:0;transform:translateX(1.5rem)}to{opacity:1;transform:translateX(0)}}
        `}</style>
        {videoBackground}
        {gradientOverlay}

        <div style={{
          position: "relative", zIndex: 2,
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <StepIndicator current={3} total={4} />

          {/* Glass card */}
          <div style={{
            maxWidth: "30rem", width: "92%",
            padding: isMobile ? "2rem 1.25rem" : "2.5rem 2rem",
            background: "rgba(40, 34, 26, 0.6)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderRadius: "1.25rem",
            border: "1px solid rgba(193,127,89,0.1)",
            boxShadow: "0 1rem 3rem rgba(0,0,0,0.3), inset 0 1px 0 rgba(193,127,89,0.06)",
            animation: "onb-fadeUp .5s ease",
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem" }}>

              {/* Ornamental header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <span style={{ width: "2rem", height: "1px", background: `${T.color.terracotta}40` }} />
                <span style={{
                  fontFamily: T.font.display, fontSize: "0.5625rem", fontWeight: 500,
                  color: T.color.terracotta, letterSpacing: "3px", textTransform: "uppercase",
                }}>
                  {t("quizTitle")}
                </span>
                <span style={{ width: "2rem", height: "1px", background: `${T.color.terracotta}40` }} />
              </div>

              {/* Question — animated swap */}
              <div key={quizStep} style={{ animation: "onb-quizFade .4s ease", width: "100%" }}>
                <h2 style={{
                  fontFamily: T.font.display, fontSize: isMobile ? "1.25rem" : "1.5rem",
                  fontWeight: 300, color: "#F2EDE7", lineHeight: 1.3, margin: "0 0 0.25rem",
                }}>
                  {t(currentQ.key)}
                </h2>

                {/* Quiz step dots */}
                <div style={{ display: "flex", justifyContent: "center", gap: "0.375rem", marginBottom: "1rem" }}>
                  {QUIZ_QUESTIONS.map((_, i) => (
                    <div key={i} style={{
                      width: "0.375rem", height: "0.375rem", borderRadius: "50%",
                      background: i === quizStep ? T.color.terracotta : i < quizStep ? `${T.color.terracotta}80` : "rgba(255,255,255,0.12)",
                      transition: "all .3s ease",
                    }} />
                  ))}
                </div>

                {/* Option cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {currentQ.options.map((opt) => {
                    const active = currentQ.selected === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => currentQ.onSelect(opt.value)}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.875rem",
                          width: "100%", padding: isMobile ? "0.875rem 1rem" : "1rem 1.25rem",
                          borderRadius: "0.75rem",
                          border: `2px solid ${active ? T.color.terracotta : "rgba(255,255,255,0.06)"}`,
                          background: active ? `${T.color.terracotta}14` : "rgba(255,255,255,0.02)",
                          cursor: "pointer", transition: "all .2s",
                          fontFamily: T.font.body, fontSize: isMobile ? "0.875rem" : "0.9375rem",
                          color: active ? "#F2EDE7" : "#C4B8A8",
                          fontWeight: active ? 600 : 400,
                          textAlign: "left",
                          minHeight: "3.25rem",
                        }}
                      >
                        <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{opt.icon}</span>
                        <span>{t(opt.label)}</span>
                        {active && (
                          <span style={{
                            marginLeft: "auto", width: "1.25rem", height: "1.25rem", borderRadius: "50%",
                            background: T.color.terracotta, display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.625rem", color: "#FFF", flexShrink: 0,
                          }}>&#10003;</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Back button */}
              <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
                <button
                  onClick={() => {
                    if (quizStep > 0) {
                      setQuizStep(quizStep - 1);
                    } else {
                      setPhase("name");
                    }
                  }}
                  style={{
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                    padding: "0.75rem 1.5rem", borderRadius: "0.5rem",
                    border: "1px solid rgba(193,127,89,0.15)", background: "transparent",
                    color: "#A09889", cursor: "pointer", minHeight: "3rem",
                  }}
                >
                  {"\u2190"} {t("backButton")}
                </button>
              </div>

              <button onClick={handleSkip} style={{
                fontFamily: T.font.body, fontSize: "0.6875rem",
                color: "#5A5248", background: "none", border: "none",
                cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "0.1875rem",
              }}>
                {t("skipExploreOwn")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Style era: Roman vs Renaissance ── */
  if (phase === "style_era") {
    return (
      <div style={{ width: "100vw", minHeight: "100vh", height: "100dvh", position: "relative", overflow: isMobile ? "auto" : "hidden", background: "#1a1917" }}>
        <style>{KEYFRAMES}</style>
        {videoBackground}
        {gradientOverlay}

        <div style={{
          position: "relative", zIndex: 2,
          width: "100%", height: "100%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <StepIndicator current={4} total={4} />

          {/* Glass card — warm bronze tint */}
          <div style={{
            maxWidth: "30rem", width: "92%",
            padding: isMobile ? "2rem 1.25rem" : "2.5rem 2rem",
            background: "rgba(40, 34, 26, 0.6)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            borderRadius: "1.25rem",
            border: "1px solid rgba(193,127,89,0.1)",
            boxShadow: "0 1rem 3rem rgba(0,0,0,0.3), inset 0 1px 0 rgba(193,127,89,0.06)",
            animation: "onb-fadeUp .5s ease",
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem" }}>

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

              <h2 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "1.75rem",
                fontWeight: 300, color: "#F2EDE7", lineHeight: 1.25, margin: 0,
              }}>
                {tPalace("eraPickerTitle")}
              </h2>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem",
                color: "#A09889", maxWidth: "24rem", lineHeight: 1.6, margin: 0,
              }}>
                {tPalace("eraPickerSubtitle")}
              </p>

              {/* Era cards */}
              <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
                {/* Roman Tuscany — selectable */}
                <button
                  onClick={() => setSelectedEra("roman")}
                  style={{
                    flex: 1, padding: "1.5rem 0.875rem", borderRadius: "0.875rem",
                    border: `2px solid ${selectedEra === "roman" ? T.era.roman.secondary : "rgba(255,255,255,0.06)"}`,
                    background: selectedEra === "roman" ? `${T.era.roman.secondary}14` : "rgba(255,255,255,0.02)",
                    cursor: "pointer", transition: "all .25s",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.625rem",
                    position: "relative",
                  }}
                >
                  {/* Elegant laurel wreath icon */}
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                    <path d="M22 6C18 10 14 16 14 22C14 28 17 32 22 34C27 32 30 28 30 22C30 16 26 10 22 6Z"
                      stroke={selectedEra === "roman" ? T.era.roman.secondary : "#7A6F63"} strokeWidth="1.2" fill="none" opacity="0.5" />
                    <path d="M10 20C12 16 16 13 20 12" stroke={selectedEra === "roman" ? T.era.roman.secondary : "#7A6F63"} strokeWidth="1" opacity="0.4" strokeLinecap="round" />
                    <path d="M34 20C32 16 28 13 24 12" stroke={selectedEra === "roman" ? T.era.roman.secondary : "#7A6F63"} strokeWidth="1" opacity="0.4" strokeLinecap="round" />
                    <path d="M8 26C11 22 15 20 19 19" stroke={selectedEra === "roman" ? T.era.roman.secondary : "#7A6F63"} strokeWidth="1" opacity="0.35" strokeLinecap="round" />
                    <path d="M36 26C33 22 29 20 25 19" stroke={selectedEra === "roman" ? T.era.roman.secondary : "#7A6F63"} strokeWidth="1" opacity="0.35" strokeLinecap="round" />
                    <line x1="16" y1="36" x2="28" y2="36" stroke={selectedEra === "roman" ? T.era.roman.secondary : "#7A6F63"} strokeWidth="1.2" opacity="0.6" />
                    <line x1="18" y1="38" x2="26" y2="38" stroke={selectedEra === "roman" ? T.era.roman.secondary : "#7A6F63"} strokeWidth="0.8" opacity="0.4" />
                  </svg>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 500,
                    color: selectedEra === "roman" ? "#F2EDE7" : "#A09889",
                    letterSpacing: "0.5px",
                  }}>
                    {tPalace("eraRoman")}
                  </span>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.6875rem",
                    color: selectedEra === "roman" ? "#D4C5B2" : "#6B6155", lineHeight: 1.4,
                  }}>
                    {tPalace("eraRomanDesc")}
                  </span>
                  {selectedEra === "roman" && (
                    <span style={{
                      position: "absolute", top: "0.5rem", right: "0.5rem",
                      width: "1.25rem", height: "1.25rem", borderRadius: "50%",
                      background: T.era.roman.secondary, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.625rem", color: "#FFF",
                    }}>&#10003;</span>
                  )}
                </button>

                {/* Renaissance Florence — locked / coming soon */}
                <div style={{
                  flex: 1, padding: "1.5rem 0.875rem", borderRadius: "0.875rem",
                  border: "2px solid rgba(255,255,255,0.04)",
                  background: "rgba(255,255,255,0.02)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.625rem",
                  position: "relative", overflow: "hidden",
                  cursor: "default",
                }}>
                  {/* Blur + greyscale overlay */}
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "0.875rem",
                    backdropFilter: "blur(2px) grayscale(0.5)", WebkitBackdropFilter: "blur(2px) grayscale(0.5)",
                    background: "rgba(26,25,23,0.35)", zIndex: 1,
                  }} />
                  {/* "Coming soon" badge */}
                  <div style={{
                    position: "absolute", top: "0.5rem", right: "0.5rem", zIndex: 2,
                    fontFamily: T.font.body, fontSize: "0.5rem", fontWeight: 700,
                    color: T.era.renaissance.accent, letterSpacing: "1.5px", textTransform: "uppercase",
                    background: "rgba(26,25,23,0.7)", padding: "0.25rem 0.5rem", borderRadius: "0.25rem",
                    border: `1px solid ${T.era.renaissance.accent}30`,
                  }}>
                    {t("comingSoon")}
                  </div>
                  {/* Elegant dome silhouette icon */}
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.4 }}>
                    <path d="M22 6C22 6 12 14 12 24H32C32 14 22 6 22 6Z" stroke="#7A6F63" strokeWidth="1.2" fill="none" opacity="0.5" />
                    <line x1="10" y1="24" x2="34" y2="24" stroke="#7A6F63" strokeWidth="1.2" opacity="0.6" />
                    <line x1="12" y1="24" x2="12" y2="34" stroke="#7A6F63" strokeWidth="1" opacity="0.4" />
                    <line x1="32" y1="24" x2="32" y2="34" stroke="#7A6F63" strokeWidth="1" opacity="0.4" />
                    <line x1="10" y1="34" x2="34" y2="34" stroke="#7A6F63" strokeWidth="1.2" opacity="0.6" />
                    <circle cx="22" cy="5" r="1.5" fill="#7A6F63" opacity="0.4" />
                    <rect x="19" y="27" width="6" height="7" rx="3" stroke="#7A6F63" strokeWidth="0.8" fill="none" opacity="0.35" />
                  </svg>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 500,
                    color: "#7A6F63", opacity: 0.5,
                    letterSpacing: "0.5px",
                  }}>
                    {tPalace("eraRenaissance")}
                  </span>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.6875rem",
                    color: "#5A5248", lineHeight: 1.4, opacity: 0.5,
                  }}>
                    {tPalace("eraRenaissanceDesc")}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", width: "100%", marginTop: "0.25rem" }}>
                <button
                  onClick={() => setPhase("quiz")}
                  style={{
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                    padding: "0.75rem 1.5rem", borderRadius: "0.5rem",
                    border: "1px solid rgba(193,127,89,0.15)", background: "transparent",
                    color: "#A09889", cursor: "pointer", minHeight: "3rem",
                  }}
                >
                  {"\u2190"} {t("backButton")}
                </button>
                <button
                  onClick={() => {
                    setStyleEra(selectedEra);
                    updateProfile({ styleEra: selectedEra }).catch(() => {});
                    setPhase("cinematic");
                  }}
                  style={{
                    flex: 1, fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600,
                    padding: "0.75rem 2rem", borderRadius: "0.5rem", minHeight: "3rem", border: "none",
                    background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                    color: "#FFF", cursor: "pointer",
                    boxShadow: "0 0.25rem 1rem rgba(193,127,89,.3)",
                  }}
                >
                  {t("continueButton")} {"\u2192"}
                </button>
              </div>

              <button onClick={handleSkip} style={{
                fontFamily: T.font.body, fontSize: "0.6875rem",
                color: "#5A5248", background: "none", border: "none",
                cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "0.1875rem",
              }}>
                {t("skipExploreOwn")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Cinematic — "Welcome to [Name]'s Palace" over live 3D ── */
  if (phase === "cinematic") {
    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", background: "#1a1917" }}>
        <style>{KEYFRAMES}</style>

        <Suspense fallback={
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: "#6B6155", animation: "onb-pulse 1.5s ease infinite" }}>
              {t("cinematicLoading")}
            </p>
          </div>
        }>
          <OnboardingSceneHost
            scene="exterior"
            onboardingMode={true}
            onRoomClick={handleExteriorRoomClick}
            onReady={() => setSceneReady(true)}
            onCinematicPause={() => setCinematicPaused(true)}
            cinematicResumed={cinematicResumed}
          />
        </Suspense>

        {/* Bottom shadow gradient for text readability over 3D scene */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60vh", background: "linear-gradient(transparent 0%, rgba(26,25,23,0.35) 35%, rgba(26,25,23,0.75) 70%, rgba(26,25,23,0.88) 100%)", pointerEvents: "none", zIndex: 5 }} />

        {/* Title floats in from the bottom */}
        <div style={{
          position: "absolute",
          bottom: isMobile ? "10vh" : "8vh",
          left: "50%", transform: "translateX(-50%)",
          textAlign: "center", zIndex: 10, width: "90%",
        }}>
          {/* Decorative line */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
            marginBottom: "1rem",
            animation: "onb-slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
          }}>
            <span style={{ width: "3rem", height: "1px", background: `${T.color.terracotta}50` }} />
            <span style={{ width: "0.3rem", height: "0.3rem", borderRadius: "50%", background: T.color.terracotta, opacity: 0.6 }} />
            <span style={{ width: "3rem", height: "1px", background: `${T.color.terracotta}50` }} />
          </div>

          <p style={{
            fontFamily: T.font.display, fontSize: "0.625rem", fontWeight: 500,
            color: T.color.terracotta, letterSpacing: "4px", textTransform: "uppercase",
            margin: "0 0 0.625rem",
            textShadow: "0 2px 8px rgba(0,0,0,0.7)",
            animation: "onb-slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both",
          }}>
            {t("welcomeTitle")}
          </p>

          <h1 style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? "1.5rem" : "3.5rem",
            fontWeight: 300, color: "#F2EDE7",
            lineHeight: 1.05, margin: 0,
            letterSpacing: "0.04em",
            animation: "onb-titleReveal 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.6s both",
            backgroundImage: `linear-gradient(90deg, #F2EDE7 0%, #F2EDE7 40%, ${T.color.gold} 50%, #F2EDE7 60%, #F2EDE7 100%)`,
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
          }}>
            {t("cinematicPalaceName", { name: userName })}
          </h1>

          <p style={{
            fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.9375rem",
            color: "#D4CBC0", margin: "0.75rem 0 0",
            lineHeight: 1.5,
            textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.7)",
            animation: "onb-slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.5s both",
          }}>
            {t("walkExterior")}
          </p>

          {cinematicPaused && !cinematicResumed && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "1rem", flexWrap: "wrap",
              marginTop: "1.25rem",
              animation: "onb-slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}>
              <p style={{
                fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.9375rem",
                color: "#D4CBC0", margin: 0, lineHeight: 1.5,
                textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.7)",
              }}>
                {t("cinematicPrompt")}
              </p>
              <button
                onClick={() => setCinematicResumed(true)}
                style={{
                  fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600,
                  letterSpacing: "0.04em",
                  padding: "0.625rem 1.5rem",
                  background: T.color.terracotta,
                  color: "#FAFAF7",
                  border: "none", borderRadius: "0.5rem",
                  cursor: "pointer",
                  boxShadow: `0 0.25rem 1rem ${T.color.terracotta}40`,
                  transition: "transform .15s ease, box-shadow .15s ease",
                  whiteSpace: "nowrap",
                  minHeight: "2.75rem",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-0.125rem)"; e.currentTarget.style.boxShadow = `0 0.5rem 1.5rem ${T.color.terracotta}60`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 0.25rem 1rem ${T.color.terracotta}40`; }}
              >
                {t("cinematicYes")}
              </button>
            </div>
          )}
        </div>

        {/* Skip intro */}
        <button
          onClick={() => setPhase("walk_exterior")}
          aria-label={t("cinematicSkip")}
          style={{
            position: "absolute", top: "1.5rem", right: "1.5rem", zIndex: 20,
            fontFamily: T.font.body, fontSize: "0.8125rem",
            color: "rgba(255,255,255,0.85)", background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "0.375rem", padding: "0.5rem 0.875rem",
            cursor: "pointer", backdropFilter: "blur(8px)", minHeight: "2.75rem",
            minWidth: "2.75rem",
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}
        >
          {t("cinematicSkip")}
        </button>
      </div>
    );
  }

  /* ── Walk phases (3D + tooltip) ── */
  if (WALK_PHASES.includes(phase)) {
    const sceneMap: Record<string, "exterior" | "entrance" | "corridor" | "room"> = {
      walk_exterior: "exterior",
      walk_entrance: "entrance",
      walk_corridor: "corridor",
      walk_room: "room",
    };
    const currentScene = sceneMap[phase] || "exterior";
    const autoWalkTarget =
      phase === "walk_exterior" ? "__entrance__" :
      phase === "walk_entrance" ? null : // entrance cinematic handles the walk internally
      phase === "walk_corridor" ? null : // cinematic handles the walk internally, auto-walks to door at step 7
      null;

    const tooltipMessage =
      phase === "walk_exterior" ? t("walkExterior") :
      phase === "walk_entrance" ? t("walkEntrance") :
      phase === "walk_corridor" ? t("walkCorridor") :
      t("walkRoom");

    const showAddMemoryButton = false; // walk_room now uses cinematic overlay, not tooltip button
    const hideTooltip = phase === "walk_entrance" || phase === "walk_corridor" || phase === "walk_room";

    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", background: "#1a1917" }}>
        <style>{KEYFRAMES}</style>
        <Suspense fallback={null}>
          <OnboardingSceneHost
            scene={currentScene}
            autoWalkTo={autoWalkTarget}
            onboardingMode={true}
            onRoomClick={handleExteriorRoomClick}
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

        {/* Bottom shadow gradient for text readability — exterior only */}
        {phase === "walk_exterior" && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60vh", background: "linear-gradient(transparent 0%, rgba(26,25,23,0.35) 35%, rgba(26,25,23,0.75) 70%, rgba(26,25,23,0.88) 100%)", pointerEvents: "none", zIndex: 4 }} />
        )}


        {/* ── Corridor cinematic overlay ── */}
        {phase === "walk_corridor" && corridorStep >= 0 && (
          <>
            {/* Bottom shadow gradient for text readability */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60vh", background: "linear-gradient(transparent 0%, rgba(26,25,23,0.35) 35%, rgba(26,25,23,0.75) 70%, rgba(26,25,23,0.88) 100%)", pointerEvents: "none", zIndex: 5 }} />

            {/* Title text overlay */}
            <div style={{
              position: "absolute",
              bottom: isMobile ? "10vh" : "8vh",
              left: "50%", transform: "translateX(-50%)",
              textAlign: "center", zIndex: 10, width: "90%", maxWidth: "36rem",
            }}>
              {/* Decorative line */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
                marginBottom: "1rem",
                animation: "onb-slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
              }}>
                <span style={{ width: "3rem", height: "1px", background: `${T.color.terracotta}50` }} />
                <span style={{ width: "0.3rem", height: "0.3rem", borderRadius: "50%", background: T.color.terracotta, opacity: 0.6 }} />
                <span style={{ width: "3rem", height: "1px", background: `${T.color.terracotta}50` }} />
              </div>

              <p style={{
                fontFamily: T.font.display, fontSize: "0.625rem", fontWeight: 500,
                color: T.color.terracotta, letterSpacing: "4px", textTransform: "uppercase",
                margin: "0 0 0.625rem", textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                animation: "onb-slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both",
              }}>
                {t("welcomeTitle")}
              </p>

              <h1 style={{
                fontFamily: T.font.display,
                fontSize: isMobile ? "1.75rem" : "3.5rem",
                fontWeight: 300, color: "#F2EDE7",
                lineHeight: 1.05, margin: 0,
                letterSpacing: "0.04em",
                animation: "onb-titleReveal 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.6s both",
                backgroundImage: `linear-gradient(90deg, #F2EDE7 0%, #F2EDE7 40%, ${T.color.gold} 50%, #F2EDE7 60%, #F2EDE7 100%)`,
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
              }}>
                {t("cinematicPossessive", { name: userName, thing: t("corridorWingName") })}
              </h1>

              <p style={{
                fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.9375rem",
                color: "#D4CBC0", margin: "0.75rem 0 0",
                lineHeight: 1.5, textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.7)",
                animation: "onb-slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.5s both",
              }}>
                {t("corridorSubtitle")}
              </p>

              {/* Step 6+: room prompt */}
              {corridorStep >= 6 && (
                <p style={{
                  fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.9375rem",
                  color: "#D4CBC0", margin: "0.75rem 0 0", lineHeight: 1.5, textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.7)",
                  animation: "onb-slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",
                }}>
                  {t("corridorRoomPromptPrefix")}{" "}
                  <span style={{ color: T.color.terracotta, fontWeight: 600 }}>{t("corridorRoomName")}</span>
                </p>
              )}

              {/* Enter Room button — shown after camera arrives at door */}
              {corridorStep >= 6 && !corridorEnterClicked && (
                <button
                  onClick={() => setCorridorEnterClicked(true)}
                  style={{
                    marginTop: "1.25rem",
                    fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600,
                    letterSpacing: "0.04em",
                    padding: "0.625rem 1.75rem",
                    background: T.color.terracotta,
                    color: "#FAFAF7",
                    border: "none", borderRadius: "0.5rem",
                    cursor: "pointer",
                    boxShadow: `0 0.25rem 1rem ${T.color.terracotta}40`,
                    transition: "transform .15s ease, box-shadow .15s ease",
                    whiteSpace: "nowrap",
                    animation: "onb-slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
                    minHeight: "2.75rem",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-0.125rem)"; e.currentTarget.style.boxShadow = `0 0.5rem 1.5rem ${T.color.terracotta}60`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 0.25rem 1rem ${T.color.terracotta}40`; }}
                >
                  {t("corridorEnterRoom")}
                </button>
              )}
            </div>
          </>
        )}

        {/* ── Room cinematic overlay ── */}
        {phase === "walk_room" && roomStep >= 0 && (
          <div style={{ pointerEvents: "none" }}>
            {/* Bottom shadow gradient for text readability */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60vh", background: "linear-gradient(transparent 0%, rgba(26,25,23,0.35) 35%, rgba(26,25,23,0.75) 70%, rgba(26,25,23,0.88) 100%)", pointerEvents: "none", zIndex: 5 }} />

            {/* Title text overlay */}
            <div style={{
              position: "absolute",
              bottom: isMobile ? "10vh" : "8vh",
              left: "50%", transform: "translateX(-50%)",
              textAlign: "center", zIndex: 10, width: "90%", maxWidth: "36rem",
              pointerEvents: "none",
            }}>
              {/* Decorative line */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem",
                marginBottom: "1rem",
                animation: "onb-slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
              }}>
                <span style={{ width: "3rem", height: "1px", background: `${T.color.terracotta}50` }} />
                <span style={{ width: "0.3rem", height: "0.3rem", borderRadius: "50%", background: T.color.terracotta, opacity: 0.6 }} />
                <span style={{ width: "3rem", height: "1px", background: `${T.color.terracotta}50` }} />
              </div>

              <p style={{
                fontFamily: T.font.display, fontSize: "0.625rem", fontWeight: 500,
                color: T.color.terracotta, letterSpacing: "4px", textTransform: "uppercase",
                margin: "0 0 0.625rem", textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                animation: "onb-slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both",
              }}>
                {t("welcomeTitle")}
              </p>

              <h1 style={{
                fontFamily: T.font.display,
                fontSize: isMobile ? "1.75rem" : "3.5rem",
                fontWeight: 300, color: "#F2EDE7",
                lineHeight: 1.05, margin: 0,
                letterSpacing: "0.04em",
                animation: "onb-titleReveal 2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.6s both",
                backgroundImage: `linear-gradient(90deg, #F2EDE7 0%, #F2EDE7 40%, ${T.color.gold} 50%, #F2EDE7 60%, #F2EDE7 100%)`,
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
              }}>
                {t("cinematicPossessive", { name: userName, thing: t("roomTitle") })}
              </h1>

              <p style={{
                fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.9375rem",
                color: "#D4CBC0", margin: "0.75rem 0 0",
                lineHeight: 1.5, textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.7)",
                animation: "onb-slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.5s both",
              }}>
                {t("roomSubtitle")}
              </p>

              {/* Step 9+: "Click on the empty painting" prompt */}
              {roomStep >= 9 && (
                <div style={{
                  marginTop: "1.25rem",
                  animation: "onb-slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",
                }}>
                  <p style={{
                    fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.9375rem",
                    color: "#D4CBC0", margin: "0 0 0.75rem", lineHeight: 1.5,
                    textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.7)",
                  }}>
                    {t("roomHangPrompt")}
                  </p>
                  <span style={{
                    display: "inline-block",
                    fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600,
                    letterSpacing: "0.04em",
                    padding: "0.5rem 1.5rem",
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(250,250,247,0.5)",
                    border: `1px solid rgba(255,255,255,0.12)`,
                    borderRadius: "0.5rem",
                    cursor: "default",
                    whiteSpace: "nowrap",
                  }}>
                    {t("roomClickPainting")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skip intro button — shown during entrance hall, corridor & room cinematics */}
        {hideTooltip && (
          <button
            onClick={handleSkip}
            style={{
              position: "absolute", top: "1.5rem", right: "1.5rem", zIndex: 20,
              fontFamily: T.font.body, fontSize: "0.75rem",
              color: "rgba(255,255,255,0.35)", background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.375rem", padding: "0.5rem 0.875rem",
              cursor: "pointer", backdropFilter: "blur(4px)", minHeight: "2.5rem",
            }}
          >
            {t("cinematicSkip")}
          </button>
        )}

        {/* Tooltip for exterior & other non-cinematic walk phases */}
        {!hideTooltip && (
          <Suspense fallback={null}>
            <OnboardingTooltip
              message={tooltipMessage}
              nextLabel={showAddMemoryButton ? t("walkAddMemory") : t("walkNext")}
              skipLabel={t("walkSkip")}
              onNext={showAddMemoryButton ? () => setPhase("upload") : undefined}
              onSkip={handleSkip}
              showNext={showAddMemoryButton}
              showSkip={true}
            />
          </Suspense>
        )}
      </div>
    );
  }

  /* ── Paywall — soft trial offer after walkthrough ── */
  if (phase === "paywall") {
    const paywallFeatures = [
      t("paywallFeat1"),
      t("paywallFeat2"),
      t("paywallFeat3"),
      t("paywallFeat4"),
    ];

    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", background: "#1a1917" }}>
        <style>{KEYFRAMES}</style>
        <Suspense fallback={null}>
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
            border: "1px solid rgba(193,127,89,0.15)",
            boxShadow: "0 1.5rem 4rem rgba(0,0,0,0.4), inset 0 1px 0 rgba(193,127,89,0.08)",
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
                {t("paywallTitle", { name: userName || t("namePlaceholder") })}
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
                      {"\u2713"}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", color: "#D4CBC0", lineHeight: 1.4,
                    }}>
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* Trial CTA */}
              <button
                onClick={() => {
                  track("paywall_trial_clicked", { source: "onboarding" });
                  window.open("/pricing", "_blank");
                  setPhase(memoryUploadedRef.current ? "celebration" : "done");
                }}
                style={{
                  width: "100%", fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                  padding: "0.875rem 0", borderRadius: "0.625rem", border: "none",
                  background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  color: "#FFF", cursor: "pointer", transition: "all .3s",
                  boxShadow: "0 0.25rem 1.25rem rgba(193,127,89,.3)",
                  minHeight: "3rem",
                }}
              >
                {t("paywallTrialCta")}
              </button>

              {/* Free continue */}
              <button
                onClick={() => {
                  track("paywall_skipped", { source: "onboarding" });
                  setPhase(memoryUploadedRef.current ? "celebration" : "done");
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

  /* ── Upload — selfie prompt ── */
  if (phase === "upload") {
    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", background: "#1a1917" }}>
        <style>{KEYFRAMES}</style>
        <Suspense fallback={null}>
          <OnboardingSceneHost scene="room" wingId="roots" roomId="ro1" roomName={onboardingRoomName} isMobile={isMobile} />
        </Suspense>

        <Suspense fallback={null}>
          <ImportHub
            onClose={() => setPhase("paywall")}
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

  /* ── Celebration — confetti over the room scene, no dark overlay ── */
  if (phase === "celebration") {
    return (
      <div style={{ width: "100vw", height: "100dvh", position: "relative", background: "#1a1917" }}>
        <style>{KEYFRAMES}</style>
        <Suspense fallback={null}>
          <OnboardingSceneHost scene="room" wingId="roots" roomId="ro1" roomName={onboardingRoomName} isMobile={isMobile} memories={uploadedMemory ? [uploadedMemory] : []} initialCameraZ={0} />
        </Suspense>
        <Suspense fallback={null}>
          <OnboardingCelebration
            title={t("celebrationTitle2")}
            subtitle={t("celebrationSubtitle2")}
            buttonLabel={t("celebrationAtrium")}
            onContinue={() => setPhase("done")}
            transparent
          />
        </Suspense>
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
