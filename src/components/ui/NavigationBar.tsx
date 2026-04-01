"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NavigationBarProps {
  currentMode: "atrium" | "library" | "3d";
  onModeChange: (mode: "atrium" | "library" | "3d") => void;
  isMobile: boolean;
  userName?: string | null;
  /** Hide on mobile during certain interactions (upload panel open, etc.) */
  hidden?: boolean;
}

type ModeKey = "atrium" | "library" | "3d";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MODES: ModeKey[] = ["atrium", "library", "3d"];

const MODE_META: Record<ModeKey, { icon: string; labelKey: string }> = {
  atrium:  { icon: "\u{1F3DB}\uFE0F", labelKey: "mode_atrium" },
  library: { icon: "\u{1F4DA}",       labelKey: "mode_library" },
  "3d":    { icon: "\u{1F3DB}\uFE0F", labelKey: "mode_palace" },
};

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/* ------------------------------------------------------------------ */
/*  Keyframe styles (injected once)                                    */
/* ------------------------------------------------------------------ */

const KEYFRAMES = `
@keyframes navBarFadeIn {
  from { opacity: 0; transform: translateY(-0.5rem); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes navBarFadeInMobile {
  from { opacity: 0; transform: translateY(0.5rem); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes navIndicatorSlide {
  from { opacity: 0.6; }
  to   { opacity: 1; }
}
@keyframes navPulse {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}
`;

/* ------------------------------------------------------------------ */
/*  Active-mode background helpers                                     */
/* ------------------------------------------------------------------ */

function activeBackground(mode: ModeKey): string {
  switch (mode) {
    case "atrium":
      return `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`;
    case "library":
      return T.color.warmStone;
    case "3d":
      return T.color.charcoal;
    default:
      return "transparent";
  }
}

function activeColor(mode: ModeKey): string {
  switch (mode) {
    case "atrium":
      return T.color.white;
    case "library":
      return T.color.charcoal;
    case "3d":
      return T.color.linen;
    default:
      return T.color.walnut;
  }
}

function activeBorder(mode: ModeKey): string {
  if (mode === "library") return `2px solid ${T.color.terracotta}`;
  return "2px solid transparent";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function NavigationBar({
  currentMode,
  onModeChange,
  isMobile,
  userName,
  hidden = false,
}: NavigationBarProps) {
  const { t } = useTranslation("navigation" as any);

  /* ---- refs for sliding indicator ---- */
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<ModeKey, HTMLButtonElement | null>>({
    atrium: null,
    library: null,
    "3d": null,
  });

  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const [pulsingMode, setPulsingMode] = useState<ModeKey | null>(null);
  const [hoveringMode, setHoveringMode] = useState<ModeKey | null>(null);

  /* ---- mount fade-in ---- */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---- sliding indicator position ---- */
  const updateIndicator = useCallback(() => {
    const btn = buttonRefs.current[currentMode];
    const container = containerRef.current;
    if (!btn || !container) return;

    if (isMobile) {
      /* top-border style indicator for mobile */
      const cRect = container.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setIndicatorStyle({
        position: "absolute" as const,
        top: 0,
        left: `${bRect.left - cRect.left}px`,
        width: `${bRect.width}px`,
        height: "0.125rem",
        background: T.color.terracotta,
        borderRadius: "0 0 0.125rem 0.125rem",
        transition: `left 0.3s ${EASE}, width 0.3s ${EASE}`,
      });
    } else {
      /* pill highlight behind the active desktop button */
      const cRect = container.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setIndicatorStyle({
        position: "absolute" as const,
        top: `${bRect.top - cRect.top}px`,
        left: `${bRect.left - cRect.left}px`,
        width: `${bRect.width}px`,
        height: `${bRect.height}px`,
        background: activeBackground(currentMode),
        borderRadius: "1.75rem",
        borderLeft: activeBorder(currentMode),
        transition: `all 0.3s ${EASE}`,
        animation: "navIndicatorSlide 0.3s ease",
        pointerEvents: "none" as const,
      });
    }
  }, [currentMode, isMobile]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  /* ---- pulse on mode change ---- */
  const handleModeChange = useCallback(
    (mode: ModeKey) => {
      if (mode === currentMode) return;
      setPulsingMode(mode);
      onModeChange(mode);
      setTimeout(() => setPulsingMode(null), 350);
    },
    [currentMode, onModeChange],
  );

  /* ---- user initial ---- */
  const userInitial = userName ? userName.charAt(0).toUpperCase() : null;

  /* ================================================================ */
  /*  MOBILE                                                           */
  /* ================================================================ */

  if (isMobile) {
    const mobileTabs: { mode: ModeKey | "me"; icon: string; labelKey: string }[] = [
      { mode: "atrium",  icon: "\u{1F3DB}\uFE0F", labelKey: "mode_atrium" },
      { mode: "library", icon: "\u{1F4DA}",       labelKey: "mode_library" },
      { mode: "3d",      icon: "\u{1F3DB}\uFE0F", labelKey: "mode_palace" },
      { mode: "me",      icon: "\u{1F464}",       labelKey: "tab_me" },
    ];

    return (
      <>
        <style>{KEYFRAMES}</style>
        <nav
          ref={containerRef}
          aria-label={t("nav_label")}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: "rgba(250,250,247,0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: `1px solid ${T.color.cream}`,
            display: "flex",
            alignItems: "stretch",
            justifyContent: "space-around",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            transform: hidden ? "translateY(100%)" : "translateY(0)",
            opacity: hidden ? 0 : 1,
            transition: `transform 0.3s ${EASE}, opacity 0.25s ${EASE}`,
            animation: mounted ? "navBarFadeInMobile 0.3s ease both" : "none",
            fontFamily: T.font.body,
          }}
        >
          {/* sliding top indicator */}
          <div style={indicatorStyle} />

          {mobileTabs.map(({ mode, icon, labelKey }) => {
            const isMe = mode === "me";
            const isActive = !isMe && mode === currentMode;
            const color = isActive ? T.color.terracotta : T.color.muted;

            return (
              <button
                key={mode}
                ref={(el) => {
                  if (!isMe) buttonRefs.current[mode as ModeKey] = el;
                }}
                onClick={() => {
                  if (isMe) {
                    window.location.href = "/settings";
                  } else {
                    handleModeChange(mode as ModeKey);
                  }
                }}
                aria-current={isActive ? "page" : undefined}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.125rem",
                  padding: "0.5rem 0",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color,
                  fontFamily: T.font.body,
                  fontSize: "0.625rem",
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: "0.02em",
                  transition: `color 0.25s ${EASE}`,
                  WebkitTapHighlightColor: "transparent",
                  animation:
                    pulsingMode === mode ? "navPulse 0.35s ease" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: "1.25rem",
                    lineHeight: 1,
                  }}
                  aria-hidden
                >
                  {icon}
                </span>
                <span>{t(labelKey)}</span>
              </button>
            );
          })}
        </nav>
      </>
    );
  }

  /* ================================================================ */
  /*  DESKTOP                                                          */
  /* ================================================================ */

  return (
    <>
      <style>{KEYFRAMES}</style>
      <nav
        aria-label={t("nav_label")}
        style={{
          position: "fixed",
          top: "1rem",
          left: "50%",
          transform: hidden
            ? "translateX(-50%) translateY(-120%)"
            : "translateX(-50%) translateY(0)",
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          background: "rgba(250,250,247,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${T.color.cream}`,
          boxShadow: "0 4px 24px rgba(44,44,42,0.08)",
          borderRadius: "2rem",
          padding: "0.25rem",
          height: "3rem",
          fontFamily: T.font.body,
          opacity: hidden ? 0 : 1,
          transition: `transform 0.3s ${EASE}, opacity 0.25s ${EASE}`,
          animation: mounted ? "navBarFadeIn 0.3s ease both" : "none",
        }}
      >
        {/* ---- mode button group with sliding indicator ---- */}
        <div
          ref={containerRef}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "0.125rem",
          }}
        >
          {/* animated indicator pill behind active button */}
          <div style={indicatorStyle} aria-hidden />

          {MODES.map((mode) => {
            const meta = MODE_META[mode];
            const isActive = mode === currentMode;

            return (
              <button
                key={mode}
                ref={(el) => {
                  buttonRefs.current[mode] = el;
                }}
                onClick={() => handleModeChange(mode)}
                aria-current={isActive ? "page" : undefined}
                onMouseEnter={() => setHoveringMode(mode)}
                onMouseLeave={() => setHoveringMode(null)}
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.5rem 1.25rem",
                  borderRadius: "1.75rem",
                  border: "none",
                  background:
                    !isActive && hoveringMode === mode
                      ? "rgba(44,44,42,0.05)"
                      : "transparent",
                  color: isActive ? activeColor(mode) : T.color.walnut,
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: `color 0.25s ${EASE}, background 0.25s ${EASE}`,
                  animation:
                    pulsingMode === mode ? "navPulse 0.35s ease" : "none",
                }}
              >
                <span aria-hidden style={{ fontSize: "0.9375rem", lineHeight: 1 }}>
                  {meta.icon}
                </span>
                <span>{t(meta.labelKey)}</span>
              </button>
            );
          })}
        </div>

        {/* ---- divider ---- */}
        <div
          aria-hidden
          style={{
            width: "1px",
            height: "1.5rem",
            background: T.color.cream,
            margin: "0 0.5rem",
            flexShrink: 0,
          }}
        />

        {/* ---- right actions ---- */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          {/* user avatar */}
          <button
            onClick={() => { window.location.href = "/settings"; }}
            aria-label={t("user_settings")}
            onMouseEnter={(e) => {
              (e.currentTarget.style.background = `rgba(44,44,42,0.08)`);
            }}
            onMouseLeave={(e) => {
              (e.currentTarget.style.background = "none");
            }}
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              border: `1px solid ${T.color.cream}`,
              background: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              fontWeight: 600,
              color: T.color.walnut,
              transition: `background 0.2s ${EASE}`,
            }}
          >
            {userInitial ?? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </button>

          {/* settings gear */}
          <button
            onClick={() => { window.location.href = "/settings"; }}
            aria-label={t("settings")}
            onMouseEnter={(e) => {
              (e.currentTarget.style.background = `rgba(44,44,42,0.08)`);
            }}
            onMouseLeave={(e) => {
              (e.currentTarget.style.background = "none");
            }}
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              border: "none",
              background: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: T.color.walnut,
              transition: `background 0.2s ${EASE}`,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </nav>
    </>
  );
}
