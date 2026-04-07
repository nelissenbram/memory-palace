"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useUserStore } from "@/lib/stores/userStore";
import { useWalkthroughStore } from "@/lib/stores/walkthroughStore";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface OnboardingWizardProps {
  onFinish: () => void;
}

/* ── SVG icons — exact copies from NavigationBar ── */

function AtriumIcon({ size = 48 }: { size?: number }) {
  const c = T.color.terracotta;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2" />
      <circle cx="8" cy="8" r="0.5" fill={c} stroke="none" />
      <path d="M3.5 3.5 A1.5 1.5 0 0 1 5 2.5" />
      <path d="M12.5 3.5 A1.5 1.5 0 0 0 11 2.5" />
      <path d="M3.5 12.5 A1.5 1.5 0 0 0 5 13.5" />
      <path d="M12.5 12.5 A1.5 1.5 0 0 1 11 13.5" />
      <circle cx="3" cy="3" r="0.7" fill={c} stroke="none" />
      <circle cx="13" cy="3" r="0.7" fill={c} stroke="none" />
      <circle cx="3" cy="13" r="0.7" fill={c} stroke="none" />
      <circle cx="13" cy="13" r="0.7" fill={c} stroke="none" />
      <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" strokeDasharray="2 1.5" strokeWidth="1" />
    </svg>
  );
}

function LibraryIcon({ size = 48 }: { size?: number }) {
  const c = T.color.terracotta;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3.5 V13" />
      <path d="M8 3.5 C7 3 4.5 2.5 2 3 V12.5 C4.5 12 7 12.5 8 13" />
      <path d="M8 3.5 C9 3 11.5 2.5 14 3 V12.5 C11.5 12 9 12.5 8 13" />
      <line x1="4" y1="5.5" x2="6.5" y2="5.5" strokeWidth="0.8" />
      <line x1="4" y1="7.2" x2="6.2" y2="7.2" strokeWidth="0.8" />
      <line x1="4.2" y1="8.9" x2="6.5" y2="8.9" strokeWidth="0.8" />
      <line x1="9.5" y1="5.5" x2="12" y2="5.5" strokeWidth="0.8" />
      <line x1="9.5" y1="7.2" x2="11.8" y2="7.2" strokeWidth="0.8" />
      <line x1="9.5" y1="8.9" x2="12" y2="8.9" strokeWidth="0.8" />
    </svg>
  );
}

function PalaceIcon({ size = 48 }: { size?: number }) {
  const c = T.color.terracotta;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 5.5 L8 1.5 L13.5 5.5" />
      <line x1="2.5" y1="5.5" x2="13.5" y2="5.5" />
      <line x1="2" y1="13" x2="14" y2="13" />
      <line x1="2.5" y1="12" x2="13.5" y2="12" strokeWidth="1" />
      <line x1="3.5" y1="5.5" x2="3.5" y2="12" />
      <line x1="12.5" y1="5.5" x2="12.5" y2="12" />
      <line x1="6" y1="5.5" x2="6" y2="12" strokeWidth="1" />
      <line x1="10" y1="5.5" x2="10" y2="12" strokeWidth="1" />
      <line x1="8" y1="5.5" x2="8" y2="12" strokeWidth="0.8" strokeDasharray="1.5 1" />
    </svg>
  );
}

export default function OnboardingWizard({ onFinish }: OnboardingWizardProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("onboarding");
  const wizardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    onboardStep, userName,
    setOnboardStep, setUserName, setUserGoal, setFirstWing, setStyleEra, setOnboarded,
  } = useUserStore();

  const [showThreshold, setShowThreshold] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [thresholdFadingOut, setThresholdFadingOut] = useState(false);

  // Always set defaults for removed questions
  useEffect(() => {
    setStyleEra("roman");
    setUserGoal("preserve");
    setFirstWing("family");
  }, [setStyleEra, setUserGoal, setFirstWing]);

  useEffect(() => { wizardRef.current?.focus(); }, []);

  // Enter from threshold → step 0 (name)
  const handleEnterFromThreshold = useCallback(() => {
    setThresholdFadingOut(true);
    setTimeout(() => {
      setShowThreshold(false);
      setOnboardStep(0);
    }, 600);
  }, [setOnboardStep]);

  // Skip everything from threshold
  const handleSkip = useCallback(() => {
    setUserGoal("preserve");
    setStyleEra("roman");
    setFirstWing("family");
    useWalkthroughStore.getState().skip();
    setOnboarded(true);
  }, [setUserGoal, setStyleEra, setFirstWing, setOnboarded]);

  // Complete wizard — start tour
  const handleStartTour = useCallback(() => {
    onFinish();
  }, [onFinish]);

  // Complete wizard — skip tour
  const handleSkipTour = useCallback(() => {
    useWalkthroughStore.getState().skip();
    onFinish();
  }, [onFinish]);

  const TOTAL_STEPS = 3;
  const canNext =
    onboardStep === 0 ? userName.trim().length > 0 :
    true;
  const isLast = onboardStep === 2;

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showThreshold) {
      if (e.key === "Enter") handleEnterFromThreshold();
      return;
    }
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") return;
    if ((e.key === "Enter" || e.key === "ArrowRight") && canNext) {
      if (isLast) handleStartTour();
      else setOnboardStep(s => s + 1);
    } else if (e.key === "ArrowLeft" && onboardStep > 0) {
      setOnboardStep(s => s - 1);
    }
  }, [canNext, isLast, onboardStep, showThreshold, handleEnterFromThreshold, handleStartTour, setOnboardStep]);

  /* ── Step 0: Threshold — Video hero + emotional hook ── */
  if (showThreshold) {
    return (
      <div
        ref={wizardRef}
        role="dialog"
        aria-label={t("wizardAriaLabel")}
        aria-modal="true"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={{
          width: "100vw", minHeight: "100vh", height: "100dvh",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
          background: "#1a1917",
          opacity: thresholdFadingOut ? 0 : 1,
          transition: "opacity 0.6s ease",
        }}
      >
        <video
          ref={videoRef}
          autoPlay muted loop playsInline
          onCanPlay={() => setVideoLoaded(true)}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            opacity: videoLoaded ? 0.35 : 0,
            filter: "saturate(0.6) brightness(0.85)",
            transition: "opacity 1.2s ease",
          }}
        >
          <source src="/video/hero-bg.mp4" type="video/mp4" />
        </video>

        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(26,25,23,0.3) 0%, rgba(26,25,23,0.6) 60%, rgba(26,25,23,0.85) 100%)",
          pointerEvents: "none",
        }} />

        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
          gap: "1.5rem", padding: "2rem",
          animation: "fadeUp .8s ease 0.3s both",
          maxWidth: "32rem",
        }}>
          <p style={{
            fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 500,
            color: T.color.terracotta, letterSpacing: "3px", textTransform: "uppercase", margin: 0,
          }}>
            {t("welcomeTitle")}
          </p>
          <h1 style={{
            fontFamily: T.font.display, fontSize: isMobile ? "2.5rem" : "3.25rem",
            fontWeight: 300, color: "#F2EDE7", letterSpacing: "0.5px", lineHeight: 1.1, margin: 0,
          }}>
            {t("appName")}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0.25rem 0" }}>
            <span style={{ width: "2.5rem", height: "1px", background: `${T.color.terracotta}60` }} />
            <span style={{ width: "0.375rem", height: "0.375rem", borderRadius: "50%", border: `1px solid ${T.color.terracotta}80` }} />
            <span style={{ width: "2.5rem", height: "1px", background: `${T.color.terracotta}60` }} />
          </div>

          <p style={{
            fontFamily: T.font.body, fontSize: "1.0625rem",
            color: "#D4C5B2", lineHeight: 1.7, margin: 0, maxWidth: "26rem",
          }}>
            {t("thresholdMessage")}
          </p>

          <button
            onClick={handleEnterFromThreshold}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 0.5rem 2rem rgba(193,127,89,.5)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 0.25rem 1.25rem rgba(193,127,89,.35)"; }}
            style={{
              fontFamily: T.font.body, fontSize: "1.0625rem", fontWeight: 600,
              padding: "1rem 3rem", borderRadius: "0.75rem", border: "none",
              background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
              color: "#FFF", cursor: "pointer", transition: "all .3s",
              boxShadow: "0 0.25rem 1.25rem rgba(193,127,89,.35)", marginTop: "0.5rem",
            }}
          >
            {t("enterButton")}
          </button>

          <button
            onClick={handleSkip}
            onMouseEnter={e => { e.currentTarget.style.color = "#D4C5B2"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#8B7355"; }}
            style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#8B7355",
              background: "none", border: "none", cursor: "pointer",
              textDecoration: "underline", textUnderlineOffset: "0.1875rem",
            }}
          >
            {t("skipExploreOwn")}
          </button>
        </div>
      </div>
    );
  }

  /* ── Wizard steps ── */
  const SPACES = [
    { key: "atrium", Icon: AtriumIcon, titleKey: "atriumTitle", descKey: "atriumDesc" },
    { key: "library", Icon: LibraryIcon, titleKey: "libraryTitle", descKey: "libraryDesc" },
    { key: "palace", Icon: PalaceIcon, titleKey: "palaceTitle", descKey: "palaceDesc" },
  ] as const;

  const steps = [
    // Step 0: Name
    () => (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.25rem", animation: "fadeUp .6s ease" }}>
        <h2 style={{ fontFamily: T.font.display, fontSize: isMobile ? "1.75rem" : "2rem", fontWeight: 300, color: T.color.charcoal, lineHeight: 1.2 }}>
          {t("whatToCallYou")}
        </h2>
        <p style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted, maxWidth: "22rem", lineHeight: 1.6 }}>
          {t("nameDescription")}
        </p>
        <div style={{ width: "100%", maxWidth: "21.25rem" }}>
          <input
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder={t("namePlaceholder")}
            style={{
              fontFamily: T.font.display, fontSize: isMobile ? "1rem" : "1.375rem", textAlign: "center",
              padding: "0.75rem 1.5rem", border: `0.125rem solid ${T.color.sandstone}`,
              borderRadius: "0.75rem", background: T.color.linen, color: T.color.charcoal,
              outline: "none", width: "100%", transition: "border-color .2s",
            }}
            onFocus={e => { e.target.style.borderColor = T.color.terracotta; }}
            onBlur={e => { e.target.style.borderColor = T.color.sandstone; }}
            autoFocus
            onKeyDown={e => { if (e.key === "Enter" && userName.trim()) { setOnboardStep(1); } }}
          />
        </div>
      </div>
    ),

    // Step 1: Three spaces — big tiles
    () => (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem", animation: "fadeUp .6s ease" }}>
        <h2 style={{ fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "1.75rem", fontWeight: 400, color: T.color.charcoal, lineHeight: 1.2 }}>
          {userName ? t("discoverTitle", { name: userName }) : t("discoverTitleDefault")}
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
          gap: "1rem",
          width: "100%",
          maxWidth: "52rem",
        }}>
          {SPACES.map(({ key, Icon, titleKey, descKey }) => (
            <div
              key={key}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: "0.75rem", padding: isMobile ? "0.875rem 0.75rem" : "1.75rem 1.25rem",
                borderRadius: "1rem",
                border: `1.5px solid ${T.color.sandstone}`,
                background: T.color.linen,
                transition: "all .25s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.color.terracotta; e.currentTarget.style.transform = "translateY(-0.125rem)"; e.currentTarget.style.boxShadow = `0 0.5rem 1.5rem ${T.color.terracotta}15`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.color.sandstone; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{
                width: "4rem", height: "4rem", borderRadius: "1rem",
                background: `linear-gradient(135deg, ${T.color.terracotta}12, ${T.color.walnut}08)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={isMobile ? 28 : 40} />
              </div>
              <h3 style={{
                fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 500,
                color: T.color.charcoal, margin: 0,
              }}>
                {t(titleKey)}
              </h3>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem",
                color: T.color.muted, lineHeight: 1.6, margin: 0,
              }}>
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    ),

    // Step 2: Ready to get started?
    () => (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem", animation: "fadeUp .6s ease" }}>
        <div style={{
          width: "4.5rem", height: "4.5rem", borderRadius: "50%",
          background: `linear-gradient(135deg, ${T.color.terracotta}18, ${T.color.walnut}12)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AtriumIcon size={44} />
        </div>
        <h2 style={{ fontFamily: T.font.display, fontSize: isMobile ? "1.75rem" : "2rem", fontWeight: 300, color: T.color.charcoal, lineHeight: 1.2 }}>
          {userName ? t("readyTitlePersonal", { name: userName }) : t("readyTitle")}
        </h2>
        <p style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: T.color.muted, maxWidth: "26rem", lineHeight: 1.7 }}>
          {t("readyDesc")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", maxWidth: "20rem", marginTop: "0.5rem" }}>
          <button
            onClick={handleStartTour}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 0.375rem 1.25rem rgba(193,127,89,.45)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 0.25rem 1rem rgba(193,127,89,.3)"; }}
            style={{
              fontFamily: T.font.body, fontSize: "1.0625rem", fontWeight: 600,
              padding: "0.9375rem 2rem", borderRadius: "0.75rem", border: "none",
              background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
              color: "#FFF", cursor: "pointer", transition: "all .3s",
              boxShadow: "0 0.25rem 1rem rgba(193,127,89,.3)",
            }}
          >
            {t("startTour")}
          </button>
          <button
            onClick={handleSkipTour}
            onMouseEnter={e => { e.currentTarget.style.color = T.color.walnut; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.color.muted; }}
            style={{
              fontFamily: T.font.body, fontSize: "0.875rem",
              color: T.color.muted, background: "none", border: "none",
              cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "0.1875rem",
              padding: "0.5rem",
            }}
          >
            {t("skipTour")}
          </button>
        </div>
      </div>
    ),
  ];

  return (
    <div
      ref={wizardRef}
      role="dialog"
      aria-label={t("wizardAriaLabel")}
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      style={{
        width: "100vw", minHeight: "100vh", height: "100dvh",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}55 100%)`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: isMobile ? "auto" : "hidden",
      }}
    >
      {/* Decorative blobs */}
      <div style={{ position: "absolute", top: "-7.5rem", right: "-5rem", width: "23.75rem", height: "23.75rem", borderRadius: "50%", background: `radial-gradient(circle, ${T.color.terracotta}08, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-6.25rem", left: "-3.75rem", width: "18.75rem", height: "18.75rem", borderRadius: "50%", background: `radial-gradient(circle, ${T.color.sage}08, transparent 70%)`, pointerEvents: "none" }} />

      {/* Progress dots */}
      <div style={{ position: "absolute", top: "2rem", display: "flex", gap: "0.625rem", alignItems: "center" }} role="group" aria-label={t("progressAriaLabel")}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            role="presentation"
            aria-label={t("stepIndicator", { current: String(i + 1), total: String(TOTAL_STEPS) })}
            aria-current={i === onboardStep ? "step" : undefined}
            style={{
              width: i === onboardStep ? "1.75rem" : "0.5rem",
              height: "0.5rem",
              borderRadius: "0.25rem",
              background: i <= onboardStep ? T.color.terracotta : `${T.color.sandstone}60`,
              transition: "all .4s ease",
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div key={onboardStep} style={{ maxWidth: onboardStep === 1 ? "56rem" : "35rem", width: "92%", padding: isMobile ? "1.5rem 1rem" : "2.5rem 1.25rem" }}>
        {steps[onboardStep]()}
      </div>

      {/* Navigation buttons (not shown on last step — it has its own buttons) */}
      {onboardStep < 2 && (
        <div style={{ display: "flex", gap: "0.875rem", marginTop: "0.5rem" }}>
          {onboardStep > 0 && (
            <button
              onClick={() => setOnboardStep(s => s - 1)}
              onMouseEnter={e => { e.currentTarget.style.background = `${T.color.sandstone}20`; e.currentTarget.style.borderColor = T.color.walnut; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = T.color.sandstone; }}
              style={{
                fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                padding: "0.75rem 1.75rem", borderRadius: "0.625rem",
                border: `0.09375rem solid ${T.color.sandstone}`, background: "transparent",
                color: T.color.walnut, cursor: "pointer", transition: "all .2s",
              }}
            >
              {"\u2190"} {t("backButton")}
            </button>
          )}
          <button
            onClick={() => setOnboardStep(s => s + 1)}
            disabled={!canNext}
            onMouseEnter={e => { if (canNext) { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 0.375rem 1.25rem rgba(193,127,89,.45)"; } }}
            onMouseLeave={e => { if (canNext) { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 0.25rem 1rem rgba(193,127,89,.3)"; } }}
            style={{
              fontFamily: T.font.body, fontSize: isMobile ? "1.0625rem" : "1rem", fontWeight: 600,
              padding: isMobile ? "0.9375rem 2rem" : "0.8125rem 2.25rem",
              borderRadius: "0.625rem", minHeight: "3rem", border: "none",
              background: canNext ? `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})` : `${T.color.sandstone}50`,
              color: canNext ? "#FFF" : T.color.muted,
              cursor: canNext ? "pointer" : "default",
              transition: "all .3s",
              boxShadow: canNext ? "0 0.25rem 1rem rgba(193,127,89,.3)" : "none",
            }}
          >
            {t("continueButton")} {"\u2192"}
          </button>
        </div>
      )}

      {/* Skip link */}
      {onboardStep < 2 && (
        <button
          onClick={handleSkip}
          onMouseEnter={e => { e.currentTarget.style.color = T.color.walnut; }}
          onMouseLeave={e => { e.currentTarget.style.color = T.color.muted; }}
          style={{
            position: "absolute", bottom: "1.75rem",
            fontFamily: T.font.body, fontSize: "0.8125rem",
            color: T.color.muted, background: "none", border: "none",
            cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "0.1875rem",
          }}
        >
          {t("skipExploreOwn")}
        </button>
      )}
    </div>
  );
}
