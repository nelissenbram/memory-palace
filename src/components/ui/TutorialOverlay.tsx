"use client";
import { useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTutorialStore, TUTORIAL_STEPS } from "@/lib/stores/tutorialStore";

// ═══ TUTORIAL OVERLAY — speech bubble + controls ═══
export default function TutorialOverlay() {
  const isMobile = useIsMobile();
  const { active, stepIndex, fadeIn, next, skip } = useTutorialStore();
  const [typewriterText, setTypewriterText] = useState("");
  const [typing, setTyping] = useState(false);

  const step = TUTORIAL_STEPS[stepIndex];

  // Typewriter effect for message
  useEffect(() => {
    if (!active || !step) return;
    setTypewriterText("");
    setTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypewriterText(step.message.slice(0, i));
      if (i >= step.message.length) {
        clearInterval(interval);
        setTyping(false);
      }
    }, 18);
    return () => clearInterval(interval);
  }, [active, stepIndex, step]);

  if (!active || !step) return null;

  const progress = ((stepIndex + 1) / TUTORIAL_STEPS.length) * 100;

  // Position map for highlight indicator
  const highlightPositionMap: Record<string, React.CSSProperties> = {
    "top-right": { top: 58, right: 18 },
    "bottom-right": { bottom: 100, right: 24 },
    "bottom-left": { bottom: 12, left: 12 },
    "bottom-center": { bottom: 70, left: "50%", transform: "translateX(-50%)" },
    "center": { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    "top-left": { top: 58, left: 18 },
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
          gap: 6,
        }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            border: "2.5px solid #D4AF37",
            background: "transparent",
            boxShadow: "0 0 18px rgba(212, 175, 55, 0.35), inset 0 0 18px rgba(212, 175, 55, 0.1)",
            animation: "tutorialPulse 1.5s ease-in-out infinite",
          }} />
          {hl.label && (
            <span style={{
              fontFamily: T.font.body,
              fontSize: 11,
              fontWeight: 600,
              color: "#FFEEBB",
              textShadow: "0 1px 6px rgba(0,0,0,0.5)",
              whiteSpace: "nowrap",
              letterSpacing: 0.3,
            }}>{hl.label}</span>
          )}
        </div>
      )}
    <div style={{
      position: "absolute",
      bottom: isMobile ? 80 : 32,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 80,
      width: isMobile ? "calc(100% - 32px)" : 520,
      maxWidth: "95vw",
      animation: fadeIn ? "fadeUp .5s ease" : undefined,
      pointerEvents: "auto",
    }}>
      {/* Spirit speech bubble */}
      <div style={{
        background: "rgba(42, 34, 24, 0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 20,
        border: "1px solid rgba(212, 175, 55, 0.25)",
        boxShadow: "0 12px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,240,200,0.08)",
        padding: isMobile ? "18px 20px 16px" : "24px 28px 20px",
        position: "relative",
      }}>
        {/* Spirit indicator */}
        <div style={{
          position: "absolute",
          top: -14,
          left: 28,
          width: 28,
          height: 28,
          borderRadius: 14,
          background: "radial-gradient(circle, #FFEEBB 0%, #FFD080 50%, rgba(255,208,128,0) 100%)",
          boxShadow: "0 0 16px rgba(255,224,160,0.5)",
        }} />

        {/* Title */}
        <div style={{
          fontFamily: T.font.display,
          fontSize: isMobile ? 17 : 20,
          fontWeight: 600,
          color: "#FFEEBB",
          marginBottom: 8,
          letterSpacing: 0.3,
        }}>
          {step.title}
        </div>

        {/* Message with typewriter */}
        <div style={{
          fontFamily: T.font.body,
          fontSize: isMobile ? 13 : 14,
          lineHeight: 1.6,
          color: "rgba(250, 250, 247, 0.88)",
          minHeight: isMobile ? 48 : 56,
          marginBottom: 16,
        }}>
          {typewriterText}
          {typing && <span style={{
            display: "inline-block",
            width: 2,
            height: 14,
            background: "#FFD080",
            marginLeft: 2,
            animation: "blink 1s step-end infinite",
            verticalAlign: "text-bottom",
          }} />}
        </div>

        {/* Progress bar */}
        <div style={{
          height: 2,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 1,
          marginBottom: 14,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #D4AF37, #FFEEBB)",
            borderRadius: 1,
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
            style={{
              background: "transparent",
              border: "none",
              fontFamily: T.font.body,
              fontSize: 12,
              color: "rgba(250,250,247,0.4)",
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: 8,
              transition: "color 0.2s",
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color = "rgba(250,250,247,0.7)"; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color = "rgba(250,250,247,0.4)"; }}
          >
            {isMobile ? "Skip" : "Skip tour"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Step dots */}
            <div style={{ display: "flex", gap: 4, marginRight: 8 }}>
              {TUTORIAL_STEPS.map((_, i) => (
                <div key={i} style={{
                  width: i === stepIndex ? 16 : 5,
                  height: 5,
                  borderRadius: 3,
                  background: i === stepIndex
                    ? "linear-gradient(90deg, #D4AF37, #FFEEBB)"
                    : i < stepIndex
                      ? "rgba(212,175,55,0.5)"
                      : "rgba(255,255,255,0.12)",
                  transition: "all 0.3s ease",
                }} />
              ))}
            </div>

            <button
              onClick={() => { if (typing) { setTypewriterText(step.message); setTyping(false); } else { next(); } }}
              style={{
                background: "linear-gradient(135deg, #D4AF37, #B8922E)",
                border: "none",
                fontFamily: T.font.body,
                fontSize: 13,
                fontWeight: 600,
                color: "#1A1408",
                padding: "8px 20px",
                borderRadius: 12,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(212,175,55,0.3)",
                transition: "transform 0.15s, box-shadow 0.15s",
                letterSpacing: 0.3,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1.04)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(212,175,55,0.45)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = "none";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(212,175,55,0.3)";
              }}
            >
              {typing ? "Show all" : (step.nextLabel || "Next")}
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
  const { active, start } = useTutorialStore();
  if (active) return null;

  return (
    <button
      onClick={start}
      title="Take a guided tour of your Memory Palace"
      style={{
        background: `${T.color.white}ee`,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: `1px solid ${T.color.cream}`,
        borderRadius: 18,
        height: 36,
        padding: "0 14px 0 10px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        boxShadow: "0 2px 10px rgba(44,44,42,.08)",
        transition: "transform .2s",
        fontFamily: T.font.body,
        fontSize: 11,
        fontWeight: 500,
        color: T.color.walnut,
        ...style,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
    >
      <span style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        background: "radial-gradient(circle, #FFEEBB 0%, #FFD080 60%, transparent 100%)",
        display: "inline-block",
        flexShrink: 0,
      }} />
      <span>{isMobile ? "Tour" : "Take the Tour"}</span>
    </button>
  );
}
