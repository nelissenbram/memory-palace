"use client";
import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useTutorialStore, TUTORIAL_STEPS } from "@/lib/stores/tutorialStore";

const GOLD_GLOW = "#FFEEBB";
const GOLD_WARM = "#FFD080";
const GOLD_INK = "#1A1408";

// ═══ TUTORIAL OVERLAY — speech bubble + controls ═══
export default function TutorialOverlay() {
  const isMobile = useIsMobile();
  const { t } = useTranslation("tutorial");
  const { active, stepIndex, fadeIn, next, skip } = useTutorialStore();
  const [typewriterText, setTypewriterText] = useState("");
  const [typing, setTyping] = useState(false);

  const step = TUTORIAL_STEPS[stepIndex];
  const message = step ? t(step.messageKey) : "";

  // Typewriter effect for message
  useEffect(() => {
    if (!active || !step) return;
    setTypewriterText("");
    setTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypewriterText(message.slice(0, i));
      if (i >= message.length) {
        clearInterval(interval);
        setTyping(false);
      }
    }, 18);
    return () => clearInterval(interval);
  }, [active, stepIndex, step, message]);

  if (!active || !step) return null;

  const progress = ((stepIndex + 1) / TUTORIAL_STEPS.length) * 100;

  // Position map for highlight indicator
  const highlightPositionMap: Record<string, React.CSSProperties> = {
    "top-right": { top: "3.625rem", right: "1.125rem" },
    "bottom-right": { bottom: "6.25rem", right: "1.5rem" },
    "bottom-left": { bottom: "0.75rem", left: "0.75rem" },
    "bottom-center": { bottom: "4.375rem", left: "50%", transform: "translateX(-50%)" },
    "center": { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    "top-left": { top: "3.625rem", left: "1.125rem" },
  };

  const hl = step.highlight;
  const hlPos = hl ? highlightPositionMap[hl.position] : null;

  return (
    <>
      {/* Highlight ring indicator */}
      {hl && hlPos && (
        <div style={{
          position: "absolute",
          ...hlPos,
          zIndex: 79,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.375rem",
        }}>
          <div style={{
            width: "3.75rem",
            height: "3.75rem",
            borderRadius: "1.875rem",
            border: `0.15625rem solid ${T.color.gold}`,
            background: "transparent",
            boxShadow: `0 0 1.125rem ${T.color.gold}59, inset 0 0 1.125rem ${T.color.gold}1A`,
            animation: "tutorialPulse 1.5s ease-in-out infinite",
          }} />
          {hl.labelKey && (
            <span style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              fontWeight: 600,
              color: GOLD_GLOW,
              textShadow: "0 1px 6px rgba(0,0,0,0.5)",
              whiteSpace: "nowrap",
              letterSpacing: "0.01875rem",
            }}>{t(hl.labelKey)}</span>
          )}
        </div>
      )}
    <div style={{
      position: "absolute",
      bottom: isMobile ? "5rem" : "2rem",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 80,
      width: isMobile ? "calc(100% - 2rem)" : "32.5rem",
      maxWidth: "95vw",
      animation: fadeIn ? "fadeUp .5s ease" : undefined,
      pointerEvents: "auto",
    }}>
      {/* Spirit speech bubble */}
      <div style={{
        background: "rgba(42, 34, 24, 0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "1.25rem",
        border: `1px solid ${T.color.gold}40`,
        boxShadow: "0 0.75rem 3rem rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,240,200,0.08)",
        padding: isMobile ? "1.125rem 1.25rem 1rem" : "1.5rem 1.75rem 1.25rem",
        position: "relative",
      }}>
        {/* Spirit indicator */}
        <div style={{
          position: "absolute",
          top: "-0.875rem",
          left: "1.75rem",
          width: "1.75rem",
          height: "1.75rem",
          borderRadius: "0.875rem",
          background: `radial-gradient(circle, ${GOLD_GLOW} 0%, ${GOLD_WARM} 50%, rgba(255,208,128,0) 100%)`,
          boxShadow: "0 0 1rem rgba(255,224,160,0.5)",
        }} />

        {/* Title */}
        <div style={{
          fontFamily: T.font.display,
          fontSize: isMobile ? "1.0625rem" : "1.25rem",
          fontWeight: 600,
          color: GOLD_GLOW,
          marginBottom: "0.5rem",
          letterSpacing: "0.01875rem",
        }}>
          {t(step.titleKey)}
        </div>

        {/* Message with typewriter */}
        <div style={{
          fontFamily: T.font.body,
          fontSize: isMobile ? "0.8125rem" : "0.875rem",
          lineHeight: 1.6,
          color: `${T.color.linen}E0`,
          minHeight: isMobile ? "3rem" : "3.5rem",
          marginBottom: "1rem",
        }}>
          {typewriterText}
          {typing && <span style={{
            display: "inline-block",
            width: "0.125rem",
            height: "0.875rem",
            background: GOLD_WARM,
            marginLeft: "0.125rem",
            animation: "blink 1s step-end infinite",
            verticalAlign: "text-bottom",
          }} />}
        </div>

        {/* Progress bar */}
        <div style={{
          height: "0.125rem",
          background: "rgba(255,255,255,0.08)",
          borderRadius: "0.0625rem",
          marginBottom: "0.875rem",
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${T.color.gold}, ${GOLD_GLOW})`,
            borderRadius: "0.0625rem",
            transition: "width 0.4s ease",
          }} />
        </div>

        {/* Controls */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <button
            onClick={skip}
            aria-label={t("skipTourAriaLabel")}
            style={{
              background: "transparent",
              border: "none",
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: `${T.color.linen}66`,
              cursor: "pointer",
              padding: "0.375rem 0.75rem",
              borderRadius: "0.5rem",
              transition: "color 0.2s",
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = `${T.color.linen}B3`; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = `${T.color.linen}66`; }}
          >
            {isMobile ? t("skip") : t("skipTour")}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {/* Step dots */}
            <div style={{ display: "flex", gap: "0.25rem", marginRight: "0.5rem" }}>
              {TUTORIAL_STEPS.map((_, i) => (
                <div key={i} role="presentation" aria-label={t("stepDot", { current: String(i + 1), total: String(TUTORIAL_STEPS.length) })} style={{
                  width: i === stepIndex ? "1rem" : "0.3125rem",
                  height: "0.3125rem",
                  borderRadius: "0.1875rem",
                  background: i === stepIndex
                    ? `linear-gradient(90deg, ${T.color.gold}, ${GOLD_GLOW})`
                    : i < stepIndex
                      ? `${T.color.gold}80`
                      : "rgba(255,255,255,0.12)",
                  transition: "all 0.3s ease",
                }} />
              ))}
            </div>

            <button
              onClick={() => { if (typing) { setTypewriterText(message); setTyping(false); } else { next(); } }}
              aria-label={t("nextStepAriaLabel")}
              style={{
                background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
                border: "none",
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: GOLD_INK,
                padding: "0.5rem 1.25rem",
                borderRadius: "0.75rem",
                cursor: "pointer",
                boxShadow: `0 0.25rem 1rem ${T.color.gold}4D`,
                transition: "transform 0.15s, box-shadow 0.15s",
                letterSpacing: "0.01875rem",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1.04)";
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0.375rem 1.25rem ${T.color.gold}73`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "none";
                (e.currentTarget as HTMLElement).style.boxShadow = `0 0.25rem 1rem ${T.color.gold}4D`;
              }}
            >
              {typing ? t("showAll") : (step.nextLabelKey ? t(step.nextLabelKey) : t("next"))}
            </button>
          </div>
        </div>
      </div>

      {/* Blink keyframe */}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}@keyframes tutorialPulse{0%,100%{transform:scale(1);opacity:0.8}50%{transform:scale(1.4);opacity:0.3}}`}</style>
    </div>
    </>
  );
}

/** "Take the Tour" button — place anywhere in the UI */
export function TourButton({ style }: { style?: React.CSSProperties }) {
  const isMobile = useIsMobile();
  const { t: tTour } = useTranslation("tutorial");
  const { active, start } = useTutorialStore();
  if (active) return null;

  return (
    <button
      onClick={start}
      title={tTour("tourTitle")}
      style={{
        background: `${T.color.white}ee`,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: `1px solid ${T.color.cream}`,
        borderRadius: "1.125rem",
        height: "2.25rem",
        padding: "0 0.875rem 0 0.625rem",
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
        cursor: "pointer",
        boxShadow: "0 0.125rem 0.625rem rgba(44,44,42,.08)",
        transition: "transform .2s",
        fontFamily: T.font.body,
        fontSize: "0.6875rem",
        fontWeight: 500,
        color: T.color.walnut,
        ...style,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
    >
      <span style={{
        width: "1.125rem",
        height: "1.125rem",
        borderRadius: "0.5625rem",
        background: `radial-gradient(circle, ${GOLD_GLOW} 0%, ${GOLD_WARM} 60%, transparent 100%)`,
        display: "inline-block",
        flexShrink: 0,
      }} />
      <span>{isMobile ? tTour("tour") : tTour("takeTour")}</span>
    </button>
  );
}
