"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import NotificationBell from "@/components/ui/NotificationBell";
import { useNudgeStore } from "@/lib/stores/nudgeStore";
import { useSettingsTourStore } from "@/components/ui/SettingsTutorial";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import { hapticLight } from "@/lib/native/haptics";

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
  /** Client-side navigation callback — avoids full page reload that tears down the 3D scene */
  onNavigate?: (path: string) => void;
  /** Minimal mode — only show mode buttons (used in 3D Palace view) */
  minimal?: boolean;
  /** Active special tab — used to highlight non-mode tabs like "me" or "notifications" */
  activeTab?: "me" | "notifications" | null;
  /** Callback when notifications tab is tapped */
  onNotifications?: () => void;
  /** Callback when Me/settings tab is tapped */
  onSettings?: () => void;
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
      viewBox="0 0 100 100"
      fill={color}
      aria-hidden
    >
      <path d="M10 32 L50 12 L90 32 L88 40 L12 40 Z" />
      <rect x="18" y="40" width="8" height="32" />
      <rect x="32" y="40" width="8" height="32" />
      <rect x="46" y="40" width="8" height="32" />
      <rect x="60" y="40" width="8" height="32" />
      <ellipse cx="78" cy="56" rx="4" ry="14" opacity="0.7" />
      <rect x="10" y="72" width="80" height="4" />
      <rect x="6" y="78" width="88" height="4" />
      <rect x="2" y="84" width="96" height="4" />
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

function ModeIcon({ mode, active, size = 16, color: colorOverride }: { mode: ModeKey | "me" | "help"; active: boolean; size?: number; color?: string }) {
  const activeColor = T.color.gold;
  const inactiveColor = "currentColor";
  const color = colorOverride ?? (active ? activeColor : inactiveColor);

  switch (mode) {
    case "atrium":
      return <AtriumIcon color={color} size={size} />;
    case "library":
      return <LibraryIcon color={color} size={size} />;
    case "3d":
      return <PalaceIcon color={color} size={size} />;
    case "me":
      return <MeIcon color={color} size={size} />;
    case "help":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
  }
}

function NotificationIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
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
/* Focus-visible outlines for all NavigationBar buttons */
[data-nav-bar] button:focus-visible {
  outline: 0.125rem solid ${T.color.gold} !important;
  outline-offset: 0.125rem !important;
}
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

function activeIndicatorBg(_mode: ModeKey | "me"): string {
  return `linear-gradient(135deg, ${T.color.gold} 0%, ${T.color.terracotta} 100%)`;
}

function activeTextColor(_mode: ModeKey | "me"): string {
  return T.color.white;
}

function activeIndicatorShadow(_mode: ModeKey | "me"): string {
  return "0 0.125rem 0.75rem rgba(209,175,55,0.3), 0 0.0625rem 0.25rem rgba(193,127,89,0.2)";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

function NavigationBar({
  currentMode,
  onModeChange,
  isMobile,
  userName,
  hidden = false,
  onToolsClick,
  toolsOpen = false,
  onNavigate,
  minimal = false,
  activeTab = null,
  onNotifications,
  onSettings,
}: NavigationBarProps) {
  // NOTE: "navigation" namespace exists in en.json — the `as any` cast is needed
  // because the TypeScript namespace union type hasn't been regenerated to include it.
  // Fix: regenerate the Namespace type from the JSON keys, then remove `as any`.
  const { t } = useTranslation("navigation" as any);
  const router = useRouter();
  const pathname = usePathname() || "";
  const isSettingsRoute = pathname.startsWith("/settings") || activeTab === "me";
  const notifCount = useNotificationStore((s) => s.notifications.filter(n => !n.read).length);
  const nudgeActive = useNudgeStore((s) => s.activeNudge !== null || s.queue.length > 0);
  const [helpToast, setHelpToast] = useState(false);

  // Prefetch routes for instant navigation
  useEffect(() => {
    router.prefetch("/settings");
    router.prefetch("/palace");
    router.prefetch("/family-tree");
    router.prefetch("/settings/profile");
  }, [router]);

  /* ---- refs for sliding indicator ---- */
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<ModeKey | "me", HTMLButtonElement | null>>({
    atrium: null,
    library: null,
    "3d": null,
    me: null,
  });
  const allTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);
  const [pulsingMode, setPulsingMode] = useState<ModeKey | null>(null);
  const [hoveringMode, setHoveringMode] = useState<ModeKey | "me" | null>(null);
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
    const container = containerRef.current;
    if (!container) return;

    if (isMobile) {
      // Determine which tab is active — special tabs take priority
      const activeKey = activeTab ? activeTab : nudgeActive ? "help" : currentMode;
      const btn = allTabRefs.current[activeKey] || buttonRefs.current[currentMode];
      if (!btn) return;
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
      // Desktop: pill is rendered directly on the active button (no separate indicator)
      setIndicatorStyle({});
    }
  }, [currentMode, isMobile, activeTab, nudgeActive]);

  useEffect(() => {
    updateIndicator();
    // Re-measure on resize and on orientation change. Some mobile browsers
    // fire orientationchange before the layout settles, so re-run a few times.
    const onOrient = () => {
      updateIndicator();
      setTimeout(updateIndicator, 60);
      setTimeout(updateIndicator, 250);
    };
    window.addEventListener("resize", updateIndicator);
    window.addEventListener("orientationchange", onOrient);
    return () => {
      window.removeEventListener("resize", updateIndicator);
      window.removeEventListener("orientationchange", onOrient);
    };
  }, [updateIndicator]);

  /* ---- pulse on mode change ---- */
  const handleModeChange = useCallback(
    (mode: ModeKey) => {
      // If a nudge tour is active, dismiss it first so a single click navigates
      if (useNudgeStore.getState().isNudging()) {
        useNudgeStore.getState().skipAll();
      }
      // Always call onModeChange — parent decides whether to act on it
      // (needed so clicking a mode from notifications/settings clears the overlay)
      onModeChange(mode);
      if (mode !== currentMode) {
        hapticLight();
        setPulsingMode(mode);
        setTimeout(() => setPulsingMode(null), 400);
      }
    },
    [currentMode, onModeChange],
  );

  /* ---- user initial ---- */
  const userInitial = userName ? userName.charAt(0).toUpperCase() : null;

  /* ================================================================ */
  /*  MOBILE                                                           */
  /* ================================================================ */

  if (isMobile) {
    const mobileTabs: { mode: ModeKey | "notifications" | "me" | "help"; labelKey: string; nudgeId?: string }[] = minimal
      ? [
          { mode: "atrium",  labelKey: "mode_atrium" },
          { mode: "library", labelKey: "mode_library" },
          { mode: "3d",      labelKey: "mode_palace" },
        ]
      : [
          { mode: "atrium",        labelKey: "mode_atrium",        nudgeId: "atrium_mob_home" },
          { mode: "library",       labelKey: "mode_library",       nudgeId: "atrium_mob_library" },
          { mode: "3d",            labelKey: "mode_palace",        nudgeId: "atrium_mob_palace" },
          { mode: "me",            labelKey: "tab_me",             nudgeId: "atrium_mob_me" },
          { mode: "_spacer" as any, labelKey: "" },
          { mode: "notifications", labelKey: "tab_notifications",  nudgeId: "atrium_mob_notif" },
          { mode: "help",          labelKey: "tab_help",           nudgeId: "atrium_mob_help" },
        ];

    return (
      <>
        <style>{KEYFRAMES}</style>
        <nav
          ref={containerRef}
          data-nav-bar
          aria-label={t("nav_label")}
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: "env(safe-area-inset-right, 0px)",
            zIndex: 50,
            background: `${T.color.linen}E0`,
            backdropFilter: isMobile ? "blur(0.75rem)" : "blur(1.5rem) saturate(180%)",
            WebkitBackdropFilter: isMobile ? "blur(0.75rem)" : "blur(1.5rem) saturate(180%)",
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

          {mobileTabs.map(({ mode, labelKey, nudgeId }) => {
            if (mode === ("_spacer" as any)) {
              return (
                <div key="_spacer" aria-hidden style={{
                  width: "0.0625rem",
                  alignSelf: "center",
                  height: "1.25rem",
                  background: `linear-gradient(180deg, transparent, ${T.color.sandstone}44, transparent)`,
                  margin: "0 0.125rem",
                  flexShrink: 0,
                }} />
              );
            }
            const isMe = mode === "me";
            const isHelp = mode === "help";
            const isNotifications = mode === "notifications";
            const isNavMode = !isMe && !isHelp && !isNotifications;
            const hasSpecialActive = !!(activeTab || nudgeActive);
            const isActive = isMe ? activeTab === "me"
              : isNotifications ? activeTab === "notifications"
              : isHelp ? nudgeActive
              : hasSpecialActive ? false  /* suppress mode highlight when a special tab is active */
              : mode === currentMode;
            const color = isActive ? T.color.terracotta : T.color.muted;

            return (
              <button
                key={mode}
                data-nudge={nudgeId}
                ref={(el) => {
                  allTabRefs.current[mode] = el;
                  if (isNavMode) buttonRefs.current[mode as ModeKey] = el;
                }}
                onClick={() => {
                  if (isMe) {
                    if (onSettings) {
                      onSettings();
                    } else {
                      router.push("/settings");
                    }
                  } else if (isHelp) {
                    if (isSettingsRoute) {
                      useSettingsTourStore.getState().setOpen(true);
                      return;
                    }
                    // Activity tab tutorial — dispatch custom event
                    if (activeTab === "notifications") {
                      window.dispatchEvent(new Event("mp:open-activity-tutorial"));
                      return;
                    }
                    // Palace exterior (3D) tutorial
                    if (currentMode === "3d") {
                      window.dispatchEvent(new Event("mp:open-palace-tutorial"));
                      return;
                    }
                    // reset() sets _forceCurrentPage + increments _resetCount,
                    // which triggers NudgeProvider's useEffect → initPage()
                    useNudgeStore.getState().reset();
                    // Check after the useEffect has time to run
                    setTimeout(() => {
                      if (!useNudgeStore.getState().isNudging()) {
                        setHelpToast(true);
                        setTimeout(() => setHelpToast(false), 3000);
                      }
                    }, 200);
                  } else if (isNotifications) {
                    if (onNotifications) {
                      onNotifications();
                    } else {
                      useNotificationStore.getState().toggle();
                    }
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
                  minHeight: "2.75rem",
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
                  position: "relative",
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
                  {isNotifications ? (
                    <NotificationIcon size={20} color={color} />
                  ) : (
                    <ModeIcon mode={mode as ModeKey | "me" | "help"} active={isActive} size={20} />
                  )}
                </span>
                <span
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "scaleY(1) translateY(0)" : "scaleY(0) translateY(-0.125rem)",
                    transformOrigin: "top center",
                    height: isActive ? "1rem" : "0",
                    overflow: "hidden",
                    transition: `opacity 0.3s ${EASE}, transform 0.3s ${EASE}`,
                  }}
                >
                  {t(labelKey)}
                </span>
                {/* Subtle unread indicator — gold dot with gentle pulse */}
                {isNotifications && notifCount > 0 && (
                  <>
                    <style>{`@keyframes mpNavBellPulse { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.55);} 50% { box-shadow:0 0 0 0.375rem rgba(212,175,55,0);} }`}</style>
                    <span style={{
                      position: "absolute",
                      top: "0.25rem",
                      right: "50%",
                      transform: "translateX(0.625rem)",
                      width: "0.5rem",
                      height: "0.5rem",
                      borderRadius: "50%",
                      background: `radial-gradient(circle, #F5D76E 0%, ${T.color.gold} 70%)`,
                      border: `0.0625rem solid ${T.color.linen}`,
                      animation: "mpNavBellPulse 2.2s ease-in-out infinite",
                    }} />
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Help toast — shown when no tutorial available for current page */}
        {helpToast && (
          <div
            onClick={() => setHelpToast(false)}
            style={{
              position: "fixed",
              bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))",
              left: "50%",
              transform: "translateX(-50%)",
              background: T.color.charcoal,
              color: T.color.white,
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              fontWeight: 500,
              padding: "0.75rem 1.25rem",
              borderRadius: "0.75rem",
              boxShadow: "0 0.5rem 2rem rgba(44,44,42,0.25)",
              zIndex: 60,
              cursor: "pointer",
              animation: "navSlideUp 0.3s ease both",
              whiteSpace: "nowrap",
            }}
          >
            {t("noHelpHere")}
          </div>
        )}
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
        data-nav-bar
        aria-label={t("nav_label")}
        style={{
          position: "fixed",
          top: "0.875rem",
          left: "50%",
          transform: `translateX(-50%) translateY(${desktopY}) scale(${desktopScale})`,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          background: `${T.color.linen}C7`,
          backdropFilter: "blur(1.5rem) saturate(180%)",
          WebkitBackdropFilter: "blur(1.5rem) saturate(180%)",
          border: `0.0625rem solid rgba(238,234,227,0.5)`,
          boxShadow: scrollShrunk
            ? "0 0.25rem 2rem rgba(44,44,42,0.1), 0 0.0625rem 0.25rem rgba(44,44,42,0.04)"
            : "0 0.25rem 1.5rem rgba(44,44,42,0.07), 0 0.0625rem 0.125rem rgba(44,44,42,0.03)",
          borderRadius: "2.25rem",
          padding: "0.375rem",
          height: "3.5rem",
          fontFamily: T.font.body,
          opacity: hidden ? 0 : 1,
          transition: `transform 0.4s ${EASE}, opacity 0.3s ${EASE}, box-shadow 0.4s ${EASE}`,
          animation: mounted ? `navSlideDown 0.55s ${EASE_OUT} both` : "none",
        }}
      >
        {/* ---- nav button group ---- */}
        <div
          ref={containerRef}
          data-nudge="atrium_nav_modes"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            flexShrink: 0,
          }}
        >
          {/* Mode buttons: Atrium, Library, Palace */}
          {MODES.map((mode) => {
            const labelKey = MODE_LABEL[mode];
            const isActive = !activeTab && mode === currentMode;
            const isHovered = hoveringMode === mode;

            return (
              <button
                key={mode}
                data-nudge={`nav_${mode}_btn`}
                ref={(el) => {
                  buttonRefs.current[mode] = el;
                }}
                onClick={() => handleModeChange(mode)}
                aria-current={isActive ? "page" : undefined}
                onMouseEnter={() => setHoveringMode(mode)}
                onMouseLeave={() => setHoveringMode(null)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.5rem 0.875rem",
                  borderRadius: "1.5rem",
                  border: "none",
                  background: isActive
                    ? activeIndicatorBg(mode)
                    : isHovered
                      ? "rgba(44,44,42,0.06)"
                      : "transparent",
                  boxShadow: isActive ? activeIndicatorShadow(mode) : "none",
                  color: isActive ? activeTextColor(mode) : T.color.walnut,
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: "0.01em",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: `color 0.3s ${EASE}, background 0.35s ${EASE}, box-shadow 0.35s ${EASE}, font-weight 0.3s ${EASE}`,
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
                    width: "1rem",
                    height: "1rem",
                    lineHeight: 1,
                    flexShrink: 0,
                    transition: `transform 0.3s ${EASE_SPRING}`,
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  <ModeIcon mode={mode} active={isActive} size={16} color={isActive ? activeTextColor(mode) : undefined} />
                </span>
                <span>{t(labelKey)}</span>
              </button>
            );
          })}

          {/* Me button — 4th nav item, same pill styling */}
          {!minimal && (() => {
            const isMeActive = activeTab === "me";
            const isMeHovered = hoveringMode === "me";
            return (
              <button
                data-nudge="nav_me_btn"
                ref={(el) => { buttonRefs.current.me = el; }}
                onClick={() => {
                  if (onSettings) {
                    onSettings();
                  } else {
                    router.push("/settings");
                  }
                }}
                aria-current={isMeActive ? "page" : undefined}
                onMouseEnter={() => setHoveringMode("me")}
                onMouseLeave={() => setHoveringMode(null)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.5rem 0.875rem",
                  borderRadius: "1.5rem",
                  border: "none",
                  background: isMeActive
                    ? activeIndicatorBg("me")
                    : isMeHovered
                      ? "rgba(44,44,42,0.06)"
                      : "transparent",
                  boxShadow: isMeActive ? activeIndicatorShadow("me") : "none",
                  color: isMeActive ? activeTextColor("me") : T.color.walnut,
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: isMeActive ? 600 : 500,
                  letterSpacing: "0.01em",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: `color 0.3s ${EASE}, background 0.35s ${EASE}, box-shadow 0.35s ${EASE}, font-weight 0.3s ${EASE}`,
                  opacity: !isMeActive && !isMeHovered ? 0.75 : 1,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "1rem",
                    height: "1rem",
                    lineHeight: 1,
                    flexShrink: 0,
                    transition: `transform 0.3s ${EASE_SPRING}`,
                    transform: isMeActive ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  <ModeIcon mode="me" active={isMeActive} size={16} color={isMeActive ? activeTextColor("me") : undefined} />
                </span>
                <span>{t("tab_me")}</span>
              </button>
            );
          })()}
        </div>

        {/* ---- divider ---- */}
        {!minimal && (
          <div
            aria-hidden
            style={{
              width: "0.0625rem",
              height: "1.25rem",
              background: `linear-gradient(180deg, transparent, ${T.color.sandstone}44, transparent)`,
              margin: "0 0.5rem",
              flexShrink: 0,
            }}
          />
        )}

        {/* ---- notification bell ---- */}
        {!minimal && (
          <div data-nudge="atrium_notifications" style={{ marginRight: "0.375rem", flexShrink: 0 }}>
            <NotificationBell />
          </div>
        )}

        {/* ---- help / restart tutorial ---- */}
        {!minimal && (
          <button
            data-nudge="atrium_help_button"
            onClick={() => {
              if (isSettingsRoute) {
                useSettingsTourStore.getState().setOpen(true);
                return;
              }
              if (activeTab === "notifications") {
                window.dispatchEvent(new Event("mp:open-activity-tutorial"));
                return;
              }
              if (currentMode === "3d") {
                window.dispatchEvent(new Event("mp:open-palace-tutorial"));
                return;
              }
              // reset() sets _forceCurrentPage + increments _resetCount,
              // which triggers NudgeProvider's useEffect → initPage()
              useNudgeStore.getState().reset();
            }}
            aria-label={t("helpTutorial")}
            style={{
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "50%",
              border: `0.0625rem solid ${T.color.cream}`,
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: `all 0.25s ${EASE}`,
              marginRight: "0.375rem",
              flexShrink: 0,
              fontFamily: T.font.display,
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: T.color.muted,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.color.terracotta; e.currentTarget.style.color = T.color.terracotta; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.color.cream; e.currentTarget.style.color = T.color.muted; }}
          >
            ?
          </button>
        )}

        {/* user avatar removed — Me button is now in the nav pill group */}
      </nav>
    </>
  );
}

export default memo(NavigationBar);
