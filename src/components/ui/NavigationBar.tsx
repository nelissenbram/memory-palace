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
const EASE_OUT = "cubic-bezier(0.0, 0, 0.2, 1)";
const EASE_SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

/* ------------------------------------------------------------------ */
/*  Keyframe styles (injected once)                                    */
/* ------------------------------------------------------------------ */

const KEYFRAMES = `
@keyframes navSlideDown {
  0%   { opacity: 0; transform: translateX(-50%) translateY(-1.5rem) scale(0.96); }
  60%  { opacity: 1; transform: translateX(-50%) translateY(0.1rem) scale(1.005); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes navSlideUp {
  0%   { opacity: 0; transform: translateY(2rem); }
  60%  { opacity: 1; transform: translateY(-0.1rem); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes navPulse {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}
@keyframes navMobileIconPop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.2); }
  100% { transform: scale(1.1); }
}
@keyframes navGlowPulse {
  0%   { box-shadow: 0 0.25rem 1.5rem rgba(209,175,55,0.08); }
  50%  { box-shadow: 0 0.25rem 2rem rgba(209,175,55,0.14); }
  100% { box-shadow: 0 0.25rem 1.5rem rgba(209,175,55,0.08); }
}
@keyframes navAvatarShine {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
`;

/* ------------------------------------------------------------------ */
/*  Active-mode styling helpers                                        */
/* ------------------------------------------------------------------ */

function activeIndicatorBg(mode: ModeKey): string {
  switch (mode) {
    case "atrium":
      return `linear-gradient(135deg, ${T.color.gold} 0%, ${T.color.terracotta} 100%)`;
    case "library":
      return `linear-gradient(135deg, ${T.color.warmStone} 0%, ${T.color.cream} 100%)`;
    case "3d":
      return `linear-gradient(135deg, ${T.color.charcoal} 0%, #3D3D3A 100%)`;
    default:
      return "transparent";
  }
}

function activeTextColor(mode: ModeKey): string {
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

function activeIndicatorShadow(mode: ModeKey): string {
  switch (mode) {
    case "atrium":
      return "0 0.125rem 0.75rem rgba(209,175,55,0.3), 0 0.0625rem 0.25rem rgba(193,127,89,0.2)";
    case "library":
      return "0 0.125rem 0.5rem rgba(139,115,85,0.12)";
    case "3d":
      return "0 0.125rem 0.75rem rgba(44,44,42,0.3)";
    default:
      return "none";
  }
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
  const [scrollShrunk, setScrollShrunk] = useState(false);

  /* ---- mount entrance ---- */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ---- scroll-based shrink for desktop ---- */
  useEffect(() => {
    if (isMobile) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrollShrunk(window.scrollY > 40);
          ticking = false;
        });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  /* ---- sliding indicator position ---- */
  const updateIndicator = useCallback(() => {
    const btn = buttonRefs.current[currentMode];
    const container = containerRef.current;
    if (!btn || !container) return;

    if (isMobile) {
      const cRect = container.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setIndicatorStyle({
        position: "absolute" as const,
        top: 0,
        left: `${bRect.left - cRect.left}px`,
        width: `${bRect.width}px`,
        height: "0.1875rem",
        background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.gold})`,
        borderRadius: "0 0 0.1875rem 0.1875rem",
        transition: `left 0.35s ${EASE_SPRING}, width 0.35s ${EASE}`,
        boxShadow: `0 0.125rem 0.5rem rgba(193,127,89,0.35)`,
      });
    } else {
      const cRect = container.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setIndicatorStyle({
        position: "absolute" as const,
        top: `${bRect.top - cRect.top}px`,
        left: `${bRect.left - cRect.left}px`,
        width: `${bRect.width}px`,
        height: `${bRect.height}px`,
        background: activeIndicatorBg(currentMode),
        borderRadius: "1.5rem",
        boxShadow: activeIndicatorShadow(currentMode),
        transition: `all 0.35s ${EASE_SPRING}`,
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
      setTimeout(() => setPulsingMode(null), 400);
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
            background: "rgba(250,250,247,0.88)",
            backdropFilter: "blur(1.5rem) saturate(180%)",
            WebkitBackdropFilter: "blur(1.5rem) saturate(180%)",
            borderTop: `0.0625rem solid rgba(238,234,227,0.6)`,
            display: "flex",
            alignItems: "stretch",
            justifyContent: "space-around",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            transform: hidden ? "translateY(100%)" : "translateY(0)",
            opacity: hidden ? 0 : 1,
            transition: `transform 0.3s ${EASE}, opacity 0.25s ${EASE}`,
            animation: mounted ? `navSlideUp 0.5s ${EASE_OUT} both` : "none",
            fontFamily: T.font.body,
          }}
        >
          {/* sliding top indicator */}
          <div style={indicatorStyle} aria-hidden />

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
                  padding: "0.5rem 0 0.375rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color,
                  fontFamily: T.font.body,
                  fontSize: "0.625rem",
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase" as const,
                  transition: `color 0.3s ${EASE}, opacity 0.3s ${EASE}`,
                  opacity: isActive ? 1 : 0.7,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span
                  style={{
                    fontSize: "1.375rem",
                    lineHeight: 1,
                    transition: `transform 0.3s ${EASE_SPRING}`,
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                    animation:
                      pulsingMode === mode
                        ? `navMobileIconPop 0.4s ${EASE_SPRING}`
                        : "none",
                  }}
                  aria-hidden
                >
                  {icon}
                </span>
                <span
                  style={{
                    maxHeight: isActive ? "1rem" : "0",
                    overflow: "hidden",
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0)" : "translateY(-0.125rem)",
                    transition: `all 0.3s ${EASE}`,
                  }}
                >
                  {t(labelKey)}
                </span>
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

  const desktopScale = scrollShrunk ? 0.95 : 1;
  const desktopY = hidden ? "-120%" : "0";

  return (
    <>
      <style>{KEYFRAMES}</style>
      <nav
        aria-label={t("nav_label")}
        style={{
          position: "fixed",
          top: "0.875rem",
          left: "50%",
          transform: `translateX(-50%) translateY(${desktopY}) scale(${desktopScale})`,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          background: "rgba(250,250,247,0.78)",
          backdropFilter: "blur(1.5rem) saturate(180%)",
          WebkitBackdropFilter: "blur(1.5rem) saturate(180%)",
          border: `0.0625rem solid rgba(238,234,227,0.5)`,
          boxShadow: scrollShrunk
            ? "0 0.25rem 2rem rgba(44,44,42,0.1), 0 0.0625rem 0.25rem rgba(44,44,42,0.04)"
            : "0 0.25rem 1.5rem rgba(44,44,42,0.07), 0 0.0625rem 0.125rem rgba(44,44,42,0.03)",
          borderRadius: "2.25rem",
          padding: "0.25rem",
          height: "3.25rem",
          fontFamily: T.font.body,
          opacity: hidden ? 0 : 1,
          transition: `transform 0.4s ${EASE}, opacity 0.3s ${EASE}, box-shadow 0.4s ${EASE}`,
          animation: mounted ? `navSlideDown 0.55s ${EASE_OUT} both` : "none",
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
            const isHovered = hoveringMode === mode;

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
                  padding: "0.5rem 1.375rem",
                  borderRadius: "1.5rem",
                  border: "none",
                  background:
                    !isActive && isHovered
                      ? "rgba(44,44,42,0.06)"
                      : "transparent",
                  color: isActive ? activeTextColor(mode) : T.color.walnut,
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: "0.01em",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: `color 0.3s ${EASE}, background 0.3s ${EASE}, font-weight 0.3s ${EASE}`,
                  animation:
                    pulsingMode === mode ? `navPulse 0.35s ${EASE_SPRING}` : "none",
                  opacity: !isActive && !isHovered ? 0.75 : 1,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    fontSize: "0.9375rem",
                    lineHeight: 1,
                    transition: `transform 0.3s ${EASE_SPRING}`,
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                  }}
                >
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
            width: "0.0625rem",
            height: "1.25rem",
            background: `linear-gradient(180deg, transparent, ${T.color.sandstone}44, transparent)`,
            margin: "0 0.625rem",
            flexShrink: 0,
          }}
        />

        {/* ---- user avatar ---- */}
        <button
          onClick={() => {
            window.location.href = "/settings";
          }}
          aria-label={t("user_settings")}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.08)";
            e.currentTarget.style.boxShadow =
              "0 0.125rem 0.75rem rgba(209,175,55,0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
          style={{
            width: "2.25rem",
            height: "2.25rem",
            borderRadius: "50%",
            border: `0.0625rem solid ${T.color.cream}`,
            background: userInitial
              ? `linear-gradient(135deg, ${T.color.gold}40, ${T.color.terracotta}50)`
              : "rgba(242,237,231,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontFamily: T.font.display,
            fontSize: "0.8125rem",
            fontWeight: 700,
            color: T.color.walnut,
            transition: `transform 0.25s ${EASE_SPRING}, box-shadow 0.25s ${EASE}, border-color 0.25s ${EASE}`,
            marginRight: "0.1875rem",
            flexShrink: 0,
          }}
        >
          {userInitial ?? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </button>
      </nav>
    </>
  );
}
