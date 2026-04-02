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
  /** Toggle universal actions popover */
  onToolsClick?: () => void;
  /** Whether the tools popover is currently open */
  toolsOpen?: boolean;
}

type ModeKey = "atrium" | "library" | "3d";

/* ------------------------------------------------------------------ */
/*  SVG Icon Components                                                */
/* ------------------------------------------------------------------ */

/** Atrium — bird's-eye open courtyard with central fountain & colonnade */
function AtriumIcon({ color = "currentColor", size = 16 }: { color?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* central fountain basin */}
      <circle cx="8" cy="8" r="2" />
      {/* fountain spout dot */}
      <circle cx="8" cy="8" r="0.5" fill={color} stroke="none" />
      {/* four colonnade arcs around the courtyard */}
      <path d="M3.5 3.5 A1.5 1.5 0 0 1 5 2.5" />
      <path d="M12.5 3.5 A1.5 1.5 0 0 0 11 2.5" />
      <path d="M3.5 12.5 A1.5 1.5 0 0 0 5 13.5" />
      <path d="M12.5 12.5 A1.5 1.5 0 0 1 11 13.5" />
      {/* corner column dots */}
      <circle cx="3" cy="3" r="0.7" fill={color} stroke="none" />
      <circle cx="13" cy="3" r="0.7" fill={color} stroke="none" />
      <circle cx="3" cy="13" r="0.7" fill={color} stroke="none" />
      <circle cx="13" cy="13" r="0.7" fill={color} stroke="none" />
      {/* outer courtyard boundary — open/airy dashed feel */}
      <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" strokeDasharray="2 1.5" strokeWidth="1" />
    </svg>
  );
}

/** Library — open book with radiating knowledge lines */
function LibraryIcon({ color = "currentColor", size = 16 }: { color?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* book spine / center fold */}
      <path d="M8 3.5 V13" />
      {/* left page */}
      <path d="M8 3.5 C7 3 4.5 2.5 2 3 V12.5 C4.5 12 7 12.5 8 13" />
      {/* right page */}
      <path d="M8 3.5 C9 3 11.5 2.5 14 3 V12.5 C11.5 12 9 12.5 8 13" />
      {/* left page text lines */}
      <line x1="4" y1="5.5" x2="6.5" y2="5.5" strokeWidth="0.8" />
      <line x1="4" y1="7.2" x2="6.2" y2="7.2" strokeWidth="0.8" />
      <line x1="4.2" y1="8.9" x2="6.5" y2="8.9" strokeWidth="0.8" />
      {/* right page text lines */}
      <line x1="9.5" y1="5.5" x2="12" y2="5.5" strokeWidth="0.8" />
      <line x1="9.5" y1="7.2" x2="11.8" y2="7.2" strokeWidth="0.8" />
      <line x1="9.5" y1="8.9" x2="12" y2="8.9" strokeWidth="0.8" />
    </svg>
  );
}

/** Palace — front-facing temple with columns in perspective, grand & immersive */
function PalaceIcon({ color = "currentColor", size = 16 }: { color?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* pediment / roof triangle */}
      <path d="M2.5 5.5 L8 1.5 L13.5 5.5" />
      {/* architrave / horizontal beam */}
      <line x1="2.5" y1="5.5" x2="13.5" y2="5.5" />
      {/* base / steps */}
      <line x1="2" y1="13" x2="14" y2="13" />
      <line x1="2.5" y1="12" x2="13.5" y2="12" strokeWidth="1" />
      {/* columns — outer pair wider, inner pair narrower for perspective depth */}
      <line x1="3.5" y1="5.5" x2="3.5" y2="12" />
      <line x1="12.5" y1="5.5" x2="12.5" y2="12" />
      {/* inner columns — slightly inset for depth */}
      <line x1="6" y1="5.5" x2="6" y2="12" strokeWidth="1" />
      <line x1="10" y1="5.5" x2="10" y2="12" strokeWidth="1" />
      {/* center column accent */}
      <line x1="8" y1="5.5" x2="8" y2="12" strokeWidth="0.8" strokeDasharray="1.5 1" />
    </svg>
  );
}

/** Me — user silhouette (kept from existing) */
function MeIcon({ color = "currentColor", size = 16 }: { color?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Mode icon renderer                                                 */
/* ------------------------------------------------------------------ */

function ModeIcon({ mode, active, size = 16 }: { mode: ModeKey | "me"; active: boolean; size?: number }) {
  const activeColor = T.color.gold;
  const inactiveColor = "currentColor";
  const color = active ? activeColor : inactiveColor;

  switch (mode) {
    case "atrium":
      return <AtriumIcon color={color} size={size} />;
    case "library":
      return <LibraryIcon color={color} size={size} />;
    case "3d":
      return <PalaceIcon color={color} size={size} />;
    case "me":
      return <MeIcon color={color} size={size} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MODES: ModeKey[] = ["atrium", "library", "3d"];

const MODE_LABEL: Record<ModeKey, string> = {
  atrium: "mode_atrium",
  library: "mode_library",
  "3d": "mode_palace",
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
  onToolsClick,
  toolsOpen = false,
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
    const mobileTabs: { mode: ModeKey | "me"; labelKey: string }[] = [
      { mode: "atrium",  labelKey: "mode_atrium" },
      { mode: "library", labelKey: "mode_library" },
      { mode: "3d",      labelKey: "mode_palace" },
      { mode: "me",      labelKey: "tab_me" },
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

          {mobileTabs.map(({ mode, labelKey }) => {
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
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
                  <ModeIcon mode={mode} active={isActive} size={20} />
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
            const labelKey = MODE_LABEL[mode];
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                    transition: `transform 0.3s ${EASE_SPRING}`,
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  <ModeIcon mode={mode} active={isActive} size={16} />
                </span>
                <span>{t(labelKey)}</span>
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

        {/* ---- tools button ---- */}
        {onToolsClick && (
          <button
            onClick={onToolsClick}
            aria-label={t("tools")}
            style={{
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "50%",
              border: `0.0625rem solid ${toolsOpen ? T.color.gold : T.color.cream}`,
              background: toolsOpen ? `${T.color.gold}15` : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: `all 0.25s ${EASE}`,
              marginRight: "0.375rem",
              flexShrink: 0,
              fontSize: "0.875rem",
              color: toolsOpen ? T.color.gold : T.color.walnut,
            }}
            onMouseEnter={e => { if (!toolsOpen) { e.currentTarget.style.background = `${T.color.gold}08`; e.currentTarget.style.borderColor = T.color.goldLight; }}}
            onMouseLeave={e => { if (!toolsOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = T.color.cream; }}}
          >
            {toolsOpen ? "\u00D7" : "+"}
          </button>
        )}

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
