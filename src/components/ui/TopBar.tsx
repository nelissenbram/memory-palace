"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { useSignOut } from "@/lib/hooks/useSignOut";
import SignOutOverlay from "@/components/ui/SignOutOverlay";
import { useUserStore } from "@/lib/stores/userStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { isIOS, isNative } from "@/lib/native/platform";
import { IAP_ENABLED } from "@/lib/native/iap-flags";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useAccessibility } from "@/components/providers/AccessibilityProvider";
import { useDaylight } from "@/components/providers/DaylightProvider";
import NotificationBell from "@/components/ui/NotificationBell";
import type { Crumb } from "@/lib/hooks/useNavigation";
import { locales, type Locale } from "@/i18n/config";
import { useUIPanelStore } from "@/lib/stores/uiPanelStore";
import { translateWingName, translateRoomName, WINGS } from "@/lib/constants/wings";
import { WingIcon, RoomIcon } from "@/components/ui/WingRoomIcons";

/* ─── Local stroke-SVG glyphs for the mobile menu ───
 * Matches the crafted 24×24 stroke language of WingRoomIcons / MobileBottomBar
 * (stroke=currentColor, 1.6 width) so the menu's action buttons stop relying on
 * platform emoji fonts. Tinted MUTED/accent by the caller via `color`.
 */
type TopBarIconName =
  | "directory" | "familyTree" | "settings" | "shared"
  | "palace" | "back" | "profile" | "family" | "star"
  | "link" | "bell" | "shield" | "signout";
function TopBarIcon({ name, size = 18, color = "currentColor" }: { name: TopBarIconName; size?: number; color?: string }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth: 1.6, strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const, "aria-hidden": true,
    style: { display: "block" } as React.CSSProperties,
  };
  switch (name) {
    case "directory": // open folder
      return (<svg {...p}><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h3.6l1.7 2H19a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 18H5a1.5 1.5 0 0 1-1.5-1.5z" /></svg>);
    case "familyTree": // tree of nodes
      return (<svg {...p}><circle cx="12" cy="5" r="2.2" /><circle cx="6" cy="18.5" r="2.2" /><circle cx="18" cy="18.5" r="2.2" /><path d="M12 7.2v3.3M12 10.5H6v5.8M12 10.5h6v5.8" /></svg>);
    case "settings": // gear
      return (<svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19" /></svg>);
    case "shared": // handshake / two people
      return (<svg {...p}><circle cx="8" cy="9" r="2.6" /><path d="M3.5 19c0-2.7 2-4.6 4.5-4.6S12.5 16.3 12.5 19" /><circle cx="16.5" cy="7.5" r="2.1" /><path d="M14 13.4c2.3-.7 6 .2 6 4.6" /></svg>);
    case "palace": // classical building with columns
      return (<svg {...p}><path d="M3.5 9 12 4l8.5 5" /><path d="M5 9v8M9 9v8M15 9v8M19 9v8" /><path d="M3.5 20.5h17M4.5 17h15" /></svg>);
    case "back": // arrow left
      return (<svg {...p}><path d="M14.5 5.5 8 12l6.5 6.5" /><path d="M8 12h11" /></svg>);
    case "profile": // single person
      return (<svg {...p}><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></svg>);
    case "family": // two people
      return (<svg {...p}><circle cx="8" cy="9" r="2.6" /><circle cx="16" cy="9" r="2.6" /><path d="M3.5 19c0-2.7 2-4.6 4.5-4.6S12.5 16.3 12.5 19" /><path d="M11.5 19c0-2.7 2-4.6 4.5-4.6S20.5 16.3 20.5 19" /></svg>);
    case "star": // five-point star
      return (<svg {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L12 17.9l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9z" /></svg>);
    case "link": // chain link
      return (<svg {...p}><path d="M9.5 14.5 14.5 9.5" /><path d="M10.5 7.5l1.7-1.7a3.5 3.5 0 0 1 5 5l-1.7 1.7" /><path d="M13.5 16.5l-1.7 1.7a3.5 3.5 0 0 1-5-5l1.7-1.7" /></svg>);
    case "bell": // notification bell
      return (<svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 4 1.2 5.5 2 6.5H4c.8-1 2-2.5 2-6.5z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>);
    case "shield": // shield
      return (<svg {...p}><path d="M12 3.5 5 6v5.5c0 4.3 3 7.2 7 9 4-1.8 7-4.7 7-9V6z" /></svg>);
    case "signout": // door with arrow out
      return (<svg {...p}><path d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14" /><path d="M17 8.5 20.5 12 17 15.5" /><path d="M10 12h10.5" /></svg>);
    default:
      return null;
  }
}

/**
 * Resolve a shared wing's display name. Shares carry only a wingId slug; when
 * that slug matches a canonical wing (roots / nest / craft / …) we render its
 * localized name via translateWingName so shared wings read the same as your
 * own — never a raw lowercase slug. Custom-named wings (no canonical match)
 * fall back to a title-cased slug only when neither a real custom `name` nor a
 * canonical match is available. Once the shares fetch layer threads the wing's
 * real display name into SharedWingItem.name, it is used verbatim.
 */
function resolveSharedWingName(
  wingId: string,
  tWings: (k: string) => string,
  name?: string,
): string {
  // A real, user-custom display name from the share always wins.
  if (name && name.trim()) return name;
  const canon = WINGS.find((w) => w.id === wingId);
  if (canon) return translateWingName(canon, tWings);
  return wingId.charAt(0).toUpperCase() + wingId.slice(1);
}

function formatDaylightHour(h: number): string {
  const hr = Math.floor(h) % 24;
  const min = Math.round((h - Math.floor(h)) * 60);
  return `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function daylightPeriodLabel(h: number, t: (k: string) => string): string {
  if (h >= 22 || h < 5) return t("daylight_night");
  if (h >= 5 && h < 9) return t("daylight_morning");
  if (h >= 9 && h < 16) return t("daylight_midday");
  return t("daylight_evening");
}

interface SharedWingItem {
  shareId: string;
  wingId: string;
  ownerName: string;
  ownerId: string;
  permission: string;
  /** Real custom display name of the shared wing, when the fetch layer
   *  provides it. Falls back to canonical/slug resolution when absent. */
  name?: string;
}

interface TopBarProps {
  crumbs: Crumb[];
  sharedWings?: SharedWingItem[];
  onNavigateSharedWing?: (shareId: string, wingSlug: string) => void;
  onSharingSettings?: () => void;
}

export default function TopBar({crumbs, sharedWings, onNavigateSharedWing, onSharingSettings}: TopBarProps){
  const isMobile = useIsMobile();
  const { signingOut, handleSignOut } = useSignOut();
  const { t, locale, setLocale } = useTranslation("common");
  const { t: tWings } = useTranslation("wings");
  const { scaleLevel, setScaleLevel } = useAccessibility();
  const { daylightEnabled, daylightMode, customHour, toggleDaylight, setDaylightMode, setCustomHour } = useDaylight();
  const { userName } = useUserStore();
  const { view, activeWing, switchWing, exitToPalace } = usePalaceStore();
  const { showDirectory, setShowDirectory } = useMemoryStore();
  const setShowFamilyTree = useUIPanelStore((s) => s.setShowFamilyTree);
  const { getWings } = useRoomStore();
  const WINGS = getWings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userBtnRef = useRef<HTMLButtonElement>(null);
  const mobileMenuPanelRef = useRef<HTMLDivElement>(null);

  // Close user menu on Escape or click outside
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setUserMenuOpen(false); userBtnRef.current?.focus(); }
    };
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => { document.removeEventListener("keydown", handleKey); document.removeEventListener("mousedown", handleClick); };
  }, [userMenuOpen]);

  // Close mobile menu on Escape + focus trap
  useEffect(() => {
    if (!menuOpen) return;
    const panel = mobileMenuPanelRef.current;
    if (!panel) return;

    // Move focus to first focusable element on mount
    const getFocusables = () =>
      panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
    const focusables = getFocusables();
    if (focusables.length > 0) focusables[0].focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMenuOpen(false); return; }
      if (e.key === "Tab") {
        const els = getFocusables();
        if (els.length === 0) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  // Mobile: show only current location + menu toggle
  if (isMobile) {
    return (
      <>
        {signingOut && <SignOutOverlay />}
        {/* Focus-visible styles for TopBar mobile buttons */}
        <style>{`
          [data-topbar] button:focus-visible,
          [data-topbar] a:focus-visible {
            outline: 0.125rem solid ${T.color.terracotta};
            outline-offset: 0.125rem;
          }
        `}</style>
        <div data-topbar style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: "calc(3rem + env(safe-area-inset-top, 0px))",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 0.75rem", paddingTop: "env(safe-area-inset-top, 0px)",
          paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0px))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right, 0px))",
          zIndex: 40,
          background: "linear-gradient(180deg,rgba(221,213,200,.95),rgba(221,213,200,0))",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", minWidth: 0, flex: 1 }}>
            <button onClick={()=>{if(view!=="exterior")exitToPalace();}} aria-label={t("backToPalace")} style={{
              width: "2.75rem", height: "2.75rem", borderRadius: "0.375rem", flexShrink: 0,
              background: `linear-gradient(135deg,${T.color.warmStone},${T.color.sandstone})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1px solid ${T.color.sandstone}`, cursor: view!=="exterior"?"pointer":"default", padding: 0,
            }}><TopBarIcon name="palace" size={19} color={T.color.walnut} /></button>
            {/* Current location breadcrumb */}
            <nav aria-label={t("breadcrumb")} style={{ display: "flex", alignItems: "center", gap: "0.375rem", overflow: "hidden", minWidth: 0 }}>
              {crumbs.map((c, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.25rem", minWidth: 0 }}>
                  {i > 0 && <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, flexShrink: 0 }}>/</span>}
                  {c.action ? (
                    <button onClick={c.action} aria-current={i === crumbs.length - 1 ? "page" : undefined} style={{
                      fontFamily: T.font.display, fontSize: i === crumbs.length - 1 ? "0.9375rem" : "0.8125rem",
                      fontWeight: 500, color: i === crumbs.length - 1 ? T.color.charcoal : T.color.muted,
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      textDecoration: "underline", textDecorationColor: `${T.color.sandstone}88`,
                      textUnderlineOffset: "0.1875rem", minWidth: 0,
                    }}>{c.label}</button>
                  ) : (
                    <span aria-current={i === crumbs.length - 1 ? "page" : undefined} style={{
                      fontFamily: T.font.display, fontSize: i === crumbs.length - 1 ? "0.9375rem" : "0.8125rem",
                      fontWeight: 500, color: T.color.charcoal,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
                    }}>{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? t("closeMenu") : t("openMenu")} aria-expanded={menuOpen} style={{
            width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", flexShrink: 0,
            border: `1px solid ${T.color.cream}`,
            background: menuOpen ? `${T.color.sandstone}30` : `${T.color.white}bb`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.125rem", cursor: "pointer", color: T.color.muted,
          }}>
            {menuOpen ? "\u2715" : "\u2630"}
          </button>
        </div>
        {/* Mobile menu overlay */}
        {menuOpen && (
          <div onClick={() => setMenuOpen(false)} role="dialog" aria-modal="true" aria-label={t("navigationMenu")} style={{
            position: "absolute", inset: 0, zIndex: 39, background: "rgba(42,34,24,.3)",
          }}>
            <div ref={mobileMenuPanelRef} onClick={e => e.stopPropagation()} style={{
              position: "absolute", top: "3rem", right: "0.5rem", left: "0.5rem",
              maxHeight: "calc(100vh - 4rem)", overflowY: "auto",
              background: `${T.color.linen}f5`, backdropFilter: "blur(1rem)",
              borderRadius: "0.875rem", border: `1px solid ${T.color.cream}`,
              boxShadow: "0 0.5rem 2.5rem rgba(64,59,54,.15)", padding: "0.75rem",
              animation: "fadeUp .2s ease",
            }}>
              {userName && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: "0.625rem", padding: "0 0.25rem",
                }}>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "0.875rem", fontStyle: "italic",
                    color: T.color.walnut,
                  }}>
                    {userName ? t("palace", { name: userName }) : t("palaceDefault")}
                  </span>
                  <LevelBadgeMobile />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.625rem" }}>
                {WINGS.map(w => (
                  <button key={w.id} onClick={() => { switchWing(w.id); setMenuOpen(false); }} style={{
                    padding: "0.625rem 0.75rem", borderRadius: "0.625rem",
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: activeWing === w.id ? 600 : 500,
                    border: activeWing === w.id ? `1.5px solid ${w.accent}` : `1px solid ${T.color.cream}`,
                    background: activeWing === w.id ? `${w.accent}15` : T.color.white,
                    color: activeWing === w.id ? w.accent : T.color.muted,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
                    textAlign: "left", minHeight: "2.75rem",
                  }}>
                    <span style={{ display: "inline-flex", flexShrink: 0 }} aria-hidden="true">
                      <WingIcon wingId={w.id} size={18} color={activeWing === w.id ? w.accent : T.color.muted} />
                    </span>{translateWingName(w, tWings)}
                  </button>
                ))}
                {/* Shared wings in mobile menu */}
                {sharedWings && sharedWings.length > 0 && (
                  <>
                    <div style={{ padding: "0.375rem 0.25rem 0.25rem", marginTop: "0.25rem", borderTop: `1px solid ${T.color.cream}` }}>
                      <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600, color: T.color.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {t("sharedWithYou")}
                      </span>
                    </div>
                    {sharedWings.map(sw => {
                      const wingName = resolveSharedWingName(sw.wingId, tWings, sw.name);
                      return (
                        <button key={sw.shareId} onClick={() => { onNavigateSharedWing?.(sw.shareId, sw.wingId); setMenuOpen(false); }} style={{
                          padding: "0.625rem 0.75rem", borderRadius: "0.625rem",
                          fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
                          border: `1px solid ${T.color.cream}`, background: T.color.white,
                          color: T.color.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
                          textAlign: "left", minHeight: "2.75rem",
                        }}>
                          <span style={{ display: "inline-flex", flexShrink: 0 }} aria-hidden="true">
                            <TopBarIcon name="shared" size={18} color={T.color.muted} />
                          </span>
                          <span style={{ flex: 1 }}>{wingName}</span>
                          <span style={{ fontSize: "0.5625rem", color: T.color.sandstone }}>{sw.ownerName}</span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", padding: "0 0.125rem" }}>
                <NotificationBell />
                <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut }}>{t("activity")}</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => { setShowDirectory(!showDirectory); setMenuOpen(false); }} style={{
                  flex: 1, padding: "0.625rem 0.75rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                }}>
                  <TopBarIcon name="directory" size={16} color={T.color.walnut} /> {t("directory")}
                </button>
                <button onClick={() => { setMenuOpen(false); setShowFamilyTree(true); }} style={{
                  flex: 1, padding: "0.625rem 0.75rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                }}>
                  <TopBarIcon name="familyTree" size={16} color={T.color.walnut} /> {t("familyTree")}
                </button>
                <a href="/settings" onClick={() => setMenuOpen(false)} style={{
                  flex: 1, padding: "0.625rem 0.75rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                  textDecoration: "none",
                }}>
                  <TopBarIcon name="settings" size={16} color={T.color.walnut} /> {t("settings")}
                </a>
                <button onClick={() => { handleSignOut(); setMenuOpen(false); }} disabled={signingOut} style={{
                  flex: 1, padding: "0.625rem 0.75rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, cursor: signingOut ? "wait" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                  opacity: signingOut ? 0.5 : 1,
                }}>
                  {t("signOut")}
                </button>
              </div>
              {/* Preferences */}
              <div style={{
                marginTop: "0.5rem", padding: "0.5rem 0.25rem 0",
                borderTop: `1px solid ${T.color.cream}`,
                display: "flex", flexDirection: "column", gap: "0.5rem",
              }}>
                <span style={{
                  fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600,
                  color: T.color.muted, textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}>
                  {t("preferences")}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, marginRight: "auto" }}>
                    {t("language")}
                  </span>
                  {locales.map((l) => (
                    <button key={l} onClick={() => setLocale(l)} aria-pressed={locale === l} style={{
                      padding: "0.375rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.75rem", fontFamily: T.font.body,
                      fontWeight: locale === l ? 600 : 500,
                      border: `1px solid ${locale === l ? T.color.terracotta : T.color.cream}`,
                      background: locale === l ? `${T.color.terracotta}12` : T.color.white,
                      color: locale === l ? T.color.terracotta : T.color.muted, cursor: "pointer",
                      minHeight: "2.75rem",
                    }}>{l.toUpperCase()}</button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, marginRight: "auto" }}>
                    {t("accessibilityMode")}
                  </span>
                  <div style={{ display: "flex", gap: "0.125rem", background: T.color.warmStone, borderRadius: "0.5rem", padding: "0.125rem" }}>
                    {(["standard", "comfortable", "large"] as const).map((lvl) => {
                      const label = { standard: "S", comfortable: "M", large: "L" }[lvl];
                      const isActive = scaleLevel === lvl;
                      return (
                        <button key={lvl} onClick={() => setScaleLevel(lvl)} aria-pressed={isActive} title={lvl} style={{
                          padding: "0.25rem 0.5rem", borderRadius: "0.375rem", fontSize: "0.6875rem", fontFamily: T.font.body,
                          fontWeight: isActive ? 700 : 500, border: "none", minHeight: "1.75rem",
                          background: isActive ? T.color.sage : "transparent",
                          color: isActive ? T.color.white : T.color.muted, cursor: "pointer",
                          transition: "all 0.15s",
                        }}>{label}</button>
                      );
                    })}
                  </div>
                </div>
                {/* Daylight toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ marginRight: "auto" }}>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, display: "block" }}>
                      {t("daylightMode")}
                    </span>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted }}>
                      {t("daylightDesc")}
                    </span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={daylightEnabled}
                    onClick={toggleDaylight}
                    style={{
                      width: "2.75rem", height: "1.5rem", borderRadius: "0.75rem",
                      border: `1px solid ${daylightEnabled ? T.color.gold : T.color.cream}`,
                      background: daylightEnabled ? T.color.gold : T.color.warmStone,
                      cursor: "pointer", position: "relative",
                      transition: "background 0.2s, border-color 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute", top: "0.125rem", left: daylightEnabled ? "1.375rem" : "0.125rem",
                      width: "1.125rem", height: "1.125rem", borderRadius: "0.5625rem",
                      background: T.color.white,
                      boxShadow: "0 1px 3px rgba(0,0,0,.15)",
                      transition: "left 0.2s",
                    }} />
                  </button>
                </div>
                {/* Daylight slider */}
                {daylightEnabled && (() => {
                  const isAuto = daylightMode === "auto";
                  const displayHour = isAuto
                    ? new Date().getHours() + new Date().getMinutes() / 60
                    : customHour;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        fontFamily: T.font.body, fontSize: "0.6875rem",
                      }}>
                        <span style={{ color: isAuto ? T.color.muted : T.color.charcoal, fontWeight: 500 }}>
                          {formatDaylightHour(displayHour)} — {daylightPeriodLabel(displayHour, t)}
                        </span>
                        <button
                          aria-pressed={isAuto}
                          onClick={() => isAuto ? setCustomHour(displayHour) : setDaylightMode("auto")}
                          style={{
                            padding: "0.125rem 0.5rem", borderRadius: "0.375rem",
                            border: `1px solid ${isAuto ? T.color.gold : T.color.cream}`,
                            background: isAuto ? `${T.color.gold}18` : T.color.white,
                            cursor: "pointer", fontFamily: T.font.body,
                            fontSize: "0.625rem", fontWeight: isAuto ? 600 : 500,
                            color: isAuto ? T.color.walnut : T.color.muted,
                          }}
                        >
                          {t("daylight_auto")}
                        </button>
                      </div>
                      <input
                        type="range" min={0} max={24} step={0.5}
                        value={displayHour}
                        onChange={(e) => setCustomHour(parseFloat(e.target.value))}
                        aria-label={t("daylightSlider")}
                        style={{ width: "100%", accentColor: T.color.gold, cursor: "pointer" }}
                      />
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop: original layout with user menu
  const initials = userName ? userName.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2) : "";

  return(
    <>
    {/* Focus-visible styles for TopBar desktop buttons */}
    <style>{`
      [data-topbar] button:focus-visible,
      [data-topbar] a:focus-visible {
        outline: 0.125rem solid ${T.color.terracotta};
        outline-offset: 0.125rem;
      }
    `}</style>
    <div data-topbar style={{position:"absolute",top:0,left:0,right:0,height:"3.375rem",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1.375rem",zIndex:40,background:"linear-gradient(180deg,rgba(221,213,200,.92),rgba(221,213,200,0))"}}>
      <div style={{display:"flex",alignItems:"center",gap:"0.625rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
          <button onClick={()=>{if(view!=="exterior")exitToPalace();}} title={t("backToPalace")} aria-label={t("backToPalace")} style={{width:"2.25rem",height:"2.25rem",borderRadius:"0.4375rem",background:`linear-gradient(135deg,${T.color.warmStone},${T.color.sandstone})`,display:"flex",alignItems:"center",justifyContent:"center",border:`1px solid ${T.color.sandstone}`,cursor:view!=="exterior"?"pointer":"default",padding:0}}><TopBarIcon name="palace" size={18} color={T.color.walnut} /></button>
          <button onClick={()=>setShowDirectory(!showDirectory)} title={t("directory")} aria-label={t("directory")} aria-pressed={showDirectory} style={{width:"2.25rem",height:"2.25rem",borderRadius:"0.4375rem",border:`1px solid ${showDirectory?T.color.sandstone:T.color.cream}`,background:showDirectory?`${T.color.sandstone}30`:`${T.color.white}bb`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:T.color.muted}}><TopBarIcon name="directory" size={17} color={T.color.muted} /></button>
          {userName&&<span style={{fontFamily:T.font.display,fontSize:"0.875rem",fontWeight:600,fontStyle:"italic",color:T.color.charcoal,background:`${T.color.linen}cc`,padding:"0.125rem 0.5rem",borderRadius:"0.375rem",textShadow:"0 1px 2px rgba(255,255,255,.9)"}}>{t("palace", { name: userName })}</span>}
          <nav aria-label={t("breadcrumb")} style={{display:"flex",alignItems:"center",gap:"0.25rem",background:`${T.color.linen}cc`,padding:"0.125rem 0.5rem",borderRadius:"0.375rem"}}>
            {crumbs.map((c,i)=><span key={i} style={{display:"flex",alignItems:"center",gap:"0.25rem"}}>
              {i>0&&<span style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted}}>/</span>}
              {c.action?<button onClick={c.action} aria-current={i===crumbs.length-1?"page":undefined} style={{fontFamily:T.font.display,fontSize:i===0?"0.9375rem":"0.8125rem",fontWeight:600,color:i===crumbs.length-1?T.color.charcoal:T.color.walnut,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",textDecorationColor:`${T.color.sandstone}88`,textUnderlineOffset:"0.1875rem",padding:0}}>{c.label}</button>
              :<span aria-current={i===crumbs.length-1?"page":undefined} style={{fontFamily:T.font.display,fontSize:i===0?"0.9375rem":"0.8125rem",fontWeight:600,color:T.color.charcoal}}>{c.label}</span>}
            </span>)}
          </nav>
        </div>
      </div>
      <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
        <NotificationBell />
        <WingsDropdown wings={WINGS} activeWing={activeWing} switchWing={switchWing} sharedWings={sharedWings} onNavigateSharedWing={onNavigateSharedWing} onSharingSettings={onSharingSettings} />

        {/* User menu button + dropdown */}
        <div ref={userMenuRef} style={{ position: "relative", marginLeft: "0.375rem" }}>
          <button
            ref={userBtnRef}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label={t("userMenu")}
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
            style={{
              width: "2.25rem", height: "2.25rem", borderRadius: "1.125rem", cursor: "pointer",
              border: userMenuOpen ? `2px solid ${T.color.terracotta}` : `2px solid ${T.color.sandstone}`,
              background: `linear-gradient(135deg, ${T.color.walnut}, ${T.color.terracotta})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 700,
              color: T.color.white, letterSpacing: "0.03125rem",
              boxShadow: userMenuOpen ? `0 0 0 3px ${T.color.terracotta}30` : "0 0.0625rem 0.25rem rgba(64,59,54,.15)",
            }}
          >
            {initials || <TopBarIcon name="profile" size={18} color={T.color.white} />}
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <DesktopUserMenu
              userName={userName}
              locale={locale}
              setLocale={setLocale}
              scaleLevel={scaleLevel}
              setScaleLevel={setScaleLevel}
              daylightEnabled={daylightEnabled}
              daylightMode={daylightMode}
              customHour={customHour}
              toggleDaylight={toggleDaylight}
              setDaylightMode={setDaylightMode}
              setCustomHour={setCustomHour}
              t={t}
              onClose={() => { setUserMenuOpen(false); userBtnRef.current?.focus(); }}
              handleSignOut={handleSignOut}
            />
          )}
        </div>
      </div>
    </div>
    </>
  );
}

/** ─── Desktop User Dropdown Menu ─── */

const USER_MENU_ITEMS = [
  { href: "/settings/profile", labelKey: "profile", icon: "profile" },
  { href: "/family-tree", labelKey: "familyTree", icon: "familyTree" },
  { href: "/settings/family", labelKey: "family", icon: "family" },
  { href: "/settings/subscription", labelKey: "subscription", icon: "star" },
  { href: "/settings/connections", labelKey: "connections", icon: "link" },
  { href: "/settings/notifications", labelKey: "notifications", icon: "bell" },
  { href: "/settings/legacy", labelKey: "legacy", icon: "palace" },
  { href: "/security", labelKey: "security", icon: "shield" },
] as const satisfies ReadonlyArray<{ href: string; labelKey: string; icon: TopBarIconName }>;

function DesktopUserMenu({ userName, locale, setLocale, scaleLevel, setScaleLevel, daylightEnabled, daylightMode, customHour, toggleDaylight, setDaylightMode, setCustomHour, t, onClose, handleSignOut }: {
  userName: string;
  locale: Locale;
  setLocale: (l: Locale) => void;
  scaleLevel: "standard" | "comfortable" | "large";
  setScaleLevel: (level: "standard" | "comfortable" | "large") => void;
  daylightEnabled: boolean;
  daylightMode: string;
  customHour: number;
  toggleDaylight: () => void;
  setDaylightMode: (m: "auto" | "custom") => void;
  setCustomHour: (h: number) => void;
  t: (key: string, params?: Record<string, string>) => string;
  onClose: () => void;
  handleSignOut: () => void;
}) {
  const menuListRef = useRef<HTMLDivElement>(null);
  const [focusIdx, setFocusIdx] = useState(-1);
  const { t: tl } = useTranslation("levels");
  const setShowFamilyTree = useUIPanelStore((s) => s.setShowFamilyTree);
  const { totalPoints, getLevelInfo } = useTrackStore();
  const levelInfo = getLevelInfo();

  // Subscription link shows on web always, and on iOS only when IAP is live
  // (IAP_ENABLED) so users can reach the IAP paywall / manage their subscription.
  // Android has no IAP path, so it stays hidden there. This menu renders on iPad
  // (viewport-width based), so the iOS gating must be explicit.
  const menuItems = USER_MENU_ITEMS.filter(
    (item) =>
      item.href !== "/settings/subscription" ||
      !isNative() ||
      (isIOS() && IAP_ENABLED)
  );

  // Total focusable items: menu links + 2 lang buttons + a11y toggle + daylight toggle + sign-out
  // When daylight panel is expanded, there's also the auto/manual button (+1)
  const totalItems = menuItems.length + 5 + (daylightEnabled ? 1 : 0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx(prev => (prev + 1) % totalItems);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx(prev => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === "Tab") {
      // Let tab work naturally but close on shift-tab from first or tab from last
    }
  }, [totalItems]);

  // Focus the active item when focusIdx changes
  useEffect(() => {
    if (focusIdx >= 0 && menuListRef.current) {
      const focusables = menuListRef.current.querySelectorAll<HTMLElement>("[data-menu-item]");
      focusables[focusIdx]?.focus();
    }
  }, [focusIdx]);

  const itemBase: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.625rem",
    padding: "0.625rem 0.875rem", borderRadius: "0.625rem",
    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
    color: T.color.charcoal, textDecoration: "none",
    border: "none", background: "transparent",
    cursor: "pointer", width: "100%", textAlign: "left",
    minHeight: "2.625rem",
  };

  return (
    <div
      role="menu"
      aria-label={t("userMenu")}
      onKeyDown={handleKeyDown}
      ref={menuListRef}
      style={{
        position: "absolute", top: "calc(100% + 0.5rem)", right: 0,
        width: "17.5rem", maxHeight: "calc(100vh - 4.5rem)", overflowY: "auto",
        background: `${T.color.linen}f8`,
        backdropFilter: "blur(1.25rem)", WebkitBackdropFilter: "blur(1.25rem)",
        borderRadius: "1rem", border: `1px solid ${T.color.cream}`,
        boxShadow: "0 0.75rem 3rem rgba(64,59,54,.18), 0 0.125rem 0.5rem rgba(64,59,54,.08)",
        padding: 0, zIndex: 100,
      }}
    >
      {/* User header */}
      <div style={{
        padding: "1rem 1rem 0.75rem", borderBottom: `1px solid ${T.color.cream}`,
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        <div style={{
          width: "2.625rem", height: "2.625rem", borderRadius: "1.3125rem", flexShrink: 0,
          background: `linear-gradient(135deg, ${T.color.walnut}, ${T.color.terracotta})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 700,
          color: T.color.white, letterSpacing: "0.03125rem",
        }}>
          {userName ? userName.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2) : <TopBarIcon name="profile" size={20} color={T.color.white} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
            color: T.color.charcoal,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            maxWidth: "11rem",
          }}>
            {userName || t("palaceDefault")}
          </div>
          {totalPoints > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.1875rem",
            }}>
              <div style={{
                width: "1rem", height: "1rem", borderRadius: "0.5rem",
                background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}cc)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.5rem", fontWeight: 700, color: T.color.white, fontFamily: T.font.body,
              }}>
                {levelInfo.rank}
              </div>
              <span style={{
                fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                color: levelInfo.color,
              }}>
                {tl(levelInfo.titleKey)}
              </span>
              <span style={{
                fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
              }}>
                {t("mpPoints", { points: String(totalPoints) })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Menu items */}
      <div style={{ padding: "0.375rem" }}>
        {menuItems.map((item, i) => {
          const isFamilyTree = item.href === "/family-tree";
          const Tag = isFamilyTree ? "button" : "a";
          const extra = isFamilyTree
            ? { onClick: () => { onClose(); setShowFamilyTree(true); } }
            : { href: item.href, onClick: onClose };
          return (
            <Tag
              key={item.href}
              role="menuitem"
              data-menu-item
              tabIndex={-1}
              onMouseEnter={() => setFocusIdx(i)}
              onFocus={() => setFocusIdx(i)}
              style={{
                ...itemBase,
                ...(isFamilyTree ? { textDecoration: "none", width: "100%", textAlign: "left" as const } : {}),
                ...(focusIdx === i ? {
                  background: `${T.color.terracotta}10`,
                  color: T.color.terracotta,
                } : {}),
              }}
              {...extra as any}
            >
              <span style={{ width: "1.375rem", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TopBarIcon name={item.icon} size={18} color={focusIdx === i ? T.color.terracotta : T.color.charcoal} />
              </span>
              {t(item.labelKey)}
            </Tag>
          );
        })}
      </div>

      {/* Preferences section */}
      <div style={{
        padding: "0.5rem 0.875rem", borderTop: `1px solid ${T.color.cream}`,
        display: "flex", flexDirection: "column", gap: "0.5rem",
      }}>
        <span style={{
          fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
          color: T.color.muted, textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}>
          {t("preferences")}
        </span>

        {/* Language */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{
            fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal, marginRight: "auto",
          }}>
            {t("language")}
          </span>
          {locales.map((l, li) => (
            <button
              key={l}
              role="menuitem"
              data-menu-item
              tabIndex={-1}
              aria-pressed={locale === l}
              onClick={() => { setLocale(l); onClose(); }}
              onMouseEnter={() => setFocusIdx(menuItems.length + li)}
              onFocus={() => setFocusIdx(menuItems.length + li)}
              style={{
                padding: "0.3125rem 0.75rem", borderRadius: "0.5rem",
                fontSize: "0.8125rem", fontFamily: T.font.body,
                fontWeight: locale === l ? 600 : 500,
                border: `1px solid ${locale === l ? T.color.terracotta : T.color.cream}`,
                background: locale === l ? `${T.color.terracotta}12` : T.color.white,
                color: locale === l ? T.color.terracotta : T.color.muted,
                cursor: "pointer",
                ...(focusIdx === menuItems.length + li ? {
                  outline: `2px solid ${T.color.terracotta}`,
                  outlineOffset: 1,
                } : {}),
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Text size selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{
            fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
            marginRight: "auto",
          }}>
            {t("accessibilityMode")}
          </span>
          <div style={{ display: "flex", gap: "0.125rem", background: T.color.warmStone, borderRadius: "0.5rem", padding: "0.125rem" }}>
            {(["standard", "comfortable", "large"] as const).map((lvl) => {
              const label = { standard: "S", comfortable: "M", large: "L" }[lvl];
              const isActive = scaleLevel === lvl;
              return (
                <button key={lvl} onClick={() => setScaleLevel(lvl)} aria-pressed={isActive}
                  data-menu-item tabIndex={-1} title={lvl}
                  onMouseEnter={() => setFocusIdx(menuItems.length + 2)}
                  onFocus={() => setFocusIdx(menuItems.length + 2)}
                  style={{
                    padding: "0.25rem 0.625rem", borderRadius: "0.375rem", fontSize: "0.75rem", fontFamily: T.font.body,
                    fontWeight: isActive ? 700 : 500, border: "none", minHeight: "1.75rem",
                    background: isActive ? T.color.sage : "transparent",
                    color: isActive ? T.color.white : T.color.muted, cursor: "pointer",
                    transition: "all 0.15s",
                  }}>{label}</button>
              );
            })}
          </div>
        </div>

        {/* Daylight toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ marginRight: "auto" }}>
            <span style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
              display: "block",
            }}>
              {t("daylightMode")}
            </span>
            <span style={{
              fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
            }}>
              {t("daylightDesc")}
            </span>
          </div>
          <button
            role="switch"
            aria-checked={daylightEnabled}
            data-menu-item
            tabIndex={-1}
            onClick={toggleDaylight}
            onMouseEnter={() => setFocusIdx(menuItems.length + 3)}
            onFocus={() => setFocusIdx(menuItems.length + 3)}
            style={{
              width: "2.75rem", height: "1.5rem", borderRadius: "0.75rem",
              border: `1px solid ${daylightEnabled ? T.color.gold : T.color.cream}`,
              background: daylightEnabled ? T.color.gold : T.color.warmStone,
              cursor: "pointer", position: "relative",
              transition: "background 0.2s, border-color 0.2s",
              flexShrink: 0,
              ...(focusIdx === menuItems.length + 3 ? {
                outline: `2px solid ${T.color.terracotta}`,
                outlineOffset: 1,
              } : {}),
            }}
          >
            <span style={{
              position: "absolute", top: "0.125rem", left: daylightEnabled ? "1.375rem" : "0.125rem",
              width: "1.125rem", height: "1.125rem", borderRadius: "0.5625rem",
              background: T.color.white,
              boxShadow: "0 1px 3px rgba(0,0,0,.15)",
              transition: "left 0.2s",
            }} />
          </button>
        </div>
        {/* Daylight slider */}
        {daylightEnabled && (() => {
          const isAuto = daylightMode === "auto";
          const displayHour = isAuto
            ? new Date().getHours() + new Date().getMinutes() / 60
            : customHour;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0 0.375rem" }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                fontFamily: T.font.body, fontSize: "0.6875rem",
              }}>
                <span style={{ color: isAuto ? T.color.muted : T.color.charcoal, fontWeight: 500 }}>
                  {formatDaylightHour(displayHour)} — {daylightPeriodLabel(displayHour, t)}
                </span>
                <button
                  aria-pressed={isAuto}
                  data-menu-item
                  tabIndex={-1}
                  onClick={() => isAuto ? setCustomHour(displayHour) : setDaylightMode("auto")}
                  style={{
                    padding: "0.125rem 0.5rem", borderRadius: "0.375rem",
                    border: `1px solid ${isAuto ? T.color.gold : T.color.cream}`,
                    background: isAuto ? `${T.color.gold}18` : T.color.white,
                    cursor: "pointer", fontFamily: T.font.body,
                    fontSize: "0.625rem", fontWeight: isAuto ? 600 : 500,
                    color: isAuto ? T.color.walnut : T.color.muted,
                  }}
                >
                  {t("daylight_auto")}
                </button>
              </div>
              <input
                type="range" min={0} max={24} step={0.5}
                value={displayHour}
                onChange={(e) => setCustomHour(parseFloat(e.target.value))}
                aria-label={t("daylightSlider")}
                style={{ width: "100%", accentColor: T.color.gold, cursor: "pointer" }}
              />
            </div>
          );
        })()}
      </div>

      {/* Sign out */}
      <div style={{ padding: "0.375rem 0.375rem 0.5rem", borderTop: `1px solid ${T.color.cream}` }}>
        <button
          role="menuitem"
          data-menu-item
          tabIndex={-1}
          onClick={() => { handleSignOut(); onClose(); }}
          onMouseEnter={() => setFocusIdx(totalItems - 1)}
          onFocus={() => setFocusIdx(totalItems - 1)}
          style={{
            ...itemBase,
            color: T.color.muted,
            fontWeight: 500,
            ...(focusIdx === totalItems - 1 ? {
              background: `${T.color.error}08`,
              color: T.color.error,
            } : {}),
          }}
        >
          <span style={{ width: "1.375rem", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TopBarIcon name="signout" size={18} color={focusIdx === totalItems - 1 ? T.color.error : T.color.muted} />
          </span>
          {t("signOut")}
        </button>
      </div>
    </div>
  );
}

/** Wings dropdown — shows wings with expandable room lists for direct navigation */
function WingsDropdown({ wings, activeWing, switchWing, sharedWings, onNavigateSharedWing, onSharingSettings }: {
  wings: { id: string; name: string; nameKey?: string; icon: string; accent: string }[];
  activeWing: string | null;
  switchWing: (id: string) => void;
  sharedWings?: SharedWingItem[];
  onNavigateSharedWing?: (shareId: string, wingSlug: string) => void;
  onSharingSettings?: () => void;
}) {
  const { t: tc } = useTranslation("common");
  const { t: tWings } = useTranslation("wings");
  const [wingsOpen, setWingsOpen] = useState(false);
  const [expandedWing, setExpandedWing] = useState<string | null>(null);
  const [sharedWingRoomsCache, setSharedWingRoomsCache] = useState<Record<string, { id: string; name: string; icon: string }[]>>({});
  const [sharedWingRoomsLoading, setSharedWingRoomsLoading] = useState<Record<string, boolean>>({});
  const wingsRef = useRef<HTMLDivElement>(null);
  const { getWingRooms } = useRoomStore();
  const { enterCorridor, enterRoom, enterWing } = usePalaceStore();

  useEffect(() => {
    if (!wingsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (wingsRef.current && !wingsRef.current.contains(e.target as Node)) {
        setWingsOpen(false);
        setExpandedWing(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setWingsOpen(false); setExpandedWing(null); }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleKey); };
  }, [wingsOpen]);

  const activeWingData = wings.find(w => w.id === activeWing);

  return (
    <div ref={wingsRef} style={{ position: "relative" }}>
      <button
        onClick={() => { setWingsOpen(!wingsOpen); setExpandedWing(null); }}
        aria-haspopup="true"
        aria-expanded={wingsOpen}
        aria-label={tc("palaceMap")}
        style={{
          padding: "0.375rem 0.875rem", borderRadius: "1rem",
          fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
          border: `1px solid ${activeWingData ? activeWingData.accent : T.color.cream}`,
          background: activeWingData ? `${activeWingData.accent}15` : `${T.color.white}bb`,
          color: activeWingData ? activeWingData.accent : T.color.walnut,
          cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3125rem",
        }}
      >
        <span style={{ display: "inline-flex", flexShrink: 0 }} aria-hidden="true">
          {activeWingData
            ? <WingIcon wingId={activeWingData.id} size={15} color={activeWingData.accent} />
            : <TopBarIcon name="palace" size={15} color={T.color.walnut} />}
        </span>
        {activeWingData ? translateWingName(activeWingData, tWings) : tc("palaceMap")}
        <span style={{ fontSize: "0.625rem", marginLeft: "0.125rem", transition: "transform .2s", transform: wingsOpen ? "rotate(180deg)" : "none" }} aria-hidden="true">{"\u25BE"}</span>
      </button>

      {wingsOpen && (
        <div role="menu" aria-label={tc("palaceMap")} style={{
          position: "absolute", top: "calc(100% + 0.375rem)", right: 0,
          minWidth: "15rem", maxHeight: "26.25rem", overflowY: "auto",
          background: `${T.color.linen}f8`,
          backdropFilter: "blur(1.25rem)", WebkitBackdropFilter: "blur(1.25rem)",
          borderRadius: "0.875rem", border: `1px solid ${T.color.cream}`,
          boxShadow: "0 0.5rem 2rem rgba(64,59,54,.14)",
          padding: "0.375rem", zIndex: 100,
          display: "flex", flexDirection: "column", gap: "0.125rem",
        }}>
          {wings.map(w => {
            const rooms = getWingRooms(w.id);
            const isExpanded = expandedWing === w.id;
            return (
              <div key={w.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <button
                    role="menuitem"
                    onClick={() => { enterCorridor(w.id); setWingsOpen(false); setExpandedWing(null); }}
                    style={{
                      flex: 1, padding: "0.5625rem 0.75rem", borderRadius: isExpanded ? "0.625rem 0 0 0" : "0.625rem 0 0 0.625rem",
                      fontFamily: T.font.body, fontSize: "0.8125rem",
                      fontWeight: activeWing === w.id ? 600 : 500,
                      border: activeWing === w.id ? `1.5px solid ${w.accent}` : `1px solid transparent`,
                      borderRight: "none",
                      background: activeWing === w.id ? `${w.accent}15` : "transparent",
                      color: activeWing === w.id ? w.accent : T.color.charcoal,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
                      textAlign: "left",
                    }}
                    onMouseEnter={e => { if (activeWing !== w.id) e.currentTarget.style.background = `${T.color.sandstone}20`; }}
                    onMouseLeave={e => { if (activeWing !== w.id) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ display: "inline-flex", flexShrink: 0 }} aria-hidden="true">
                      <WingIcon wingId={w.id} size={18} color={activeWing === w.id ? w.accent : T.color.muted} />
                    </span>
                    {translateWingName(w, tWings)}
                  </button>
                  {rooms.length > 0 && (
                    <button
                      onClick={() => setExpandedWing(isExpanded ? null : w.id)}
                      style={{
                        padding: "0.5625rem 0.625rem", borderRadius: isExpanded ? "0 0.625rem 0 0" : "0 0.625rem 0.625rem 0",
                        border: activeWing === w.id ? `1.5px solid ${w.accent}` : `1px solid transparent`,
                        borderLeft: "none",
                        background: isExpanded ? `${w.accent}15` : "transparent",
                        cursor: "pointer", fontSize: "0.625rem", color: T.color.muted,
                        display: "flex", alignItems: "center",
                        transition: "transform .2s",
                      }}
                      title={tc("showRooms")}
                      aria-label={tc("showRooms")}
                    >
                      <span style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform .2s" }}>{"\u25BE"}</span>
                    </button>
                  )}
                </div>
                {isExpanded && rooms.length > 0 && (
                  <div style={{
                    padding: "0.125rem 0 0.25rem 1.75rem",
                    borderLeft: `2px solid ${w.accent}30`,
                    marginLeft: "1.125rem", marginBottom: "0.25rem",
                    display: "flex", flexDirection: "column", gap: "0.0625rem",
                  }}>
                    {rooms.map(r => (
                      <button
                        key={r.id}
                        role="menuitem"
                        onClick={() => { enterWing(w.id); setTimeout(() => enterRoom(r.id), 100); setWingsOpen(false); setExpandedWing(null); }}
                        style={{
                          padding: "0.375rem 0.625rem", borderRadius: "0.5rem",
                          fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                          border: "none", background: "transparent",
                          color: T.color.charcoal, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: "0.375rem",
                          textAlign: "left", width: "100%",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${w.accent}12`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ display: "inline-flex", flexShrink: 0 }} aria-hidden="true">
                          <RoomIcon roomId={r.id} wingId={w.id} size={15} color={T.color.muted} />
                        </span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{translateRoomName(r, tWings)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Shared wings section */}
          {sharedWings && sharedWings.length > 0 && (
            <>
              <div style={{
                margin: "0.25rem 0.5rem", padding: "0.375rem 0",
                borderTop: `1px solid ${T.color.cream}`,
              }}>
                <span style={{
                  fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600,
                  color: T.color.muted, textTransform: "uppercase", letterSpacing: "0.06em",
                }}>{tc("sharedWithYou")}</span>
              </div>
              {sharedWings.map(sw => {
                const isActive = activeWing === `shared:${sw.wingId}:${sw.shareId}`;
                const isExpanded = expandedWing === `shared:${sw.shareId}`;
                const cachedRooms = sharedWingRoomsCache[sw.shareId];
                return (
                  <div key={sw.shareId}>
                    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                      <button
                        role="menuitem"
                        onClick={() => {
                          onNavigateSharedWing?.(sw.shareId, sw.wingId);
                          setWingsOpen(false); setExpandedWing(null);
                        }}
                        style={{
                          flex: 1, padding: "0.5625rem 0.75rem", borderRadius: isExpanded ? "0.625rem 0 0 0" : "0.625rem 0 0 0.625rem",
                          fontFamily: T.font.body, fontSize: "0.8125rem",
                          fontWeight: isActive ? 600 : 500,
                          border: isActive ? `1.5px solid ${T.color.terracotta}` : `1px solid transparent`,
                          borderRight: "none",
                          background: isActive ? `${T.color.terracotta}15` : "transparent",
                          color: isActive ? T.color.terracotta : T.color.charcoal,
                          cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
                          textAlign: "left",
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `${T.color.sandstone}20`; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ display: "inline-flex", flexShrink: 0 }} aria-hidden="true">
                          <TopBarIcon name="shared" size={17} color={isActive ? T.color.terracotta : T.color.muted} />
                        </span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {resolveSharedWingName(sw.wingId, tWings, sw.name)}
                        </span>
                        <span style={{ fontSize: "0.5625rem", color: T.color.sandstone, fontWeight: 500 }}>
                          {sw.ownerName}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          const key = `shared:${sw.shareId}`;
                          if (isExpanded) { setExpandedWing(null); }
                          else {
                            setExpandedWing(key);
                            if (!sharedWingRoomsCache[sw.shareId]) {
                              setSharedWingRoomsLoading(prev => ({ ...prev, [sw.shareId]: true }));
                              import("@/lib/auth/sharing-actions").then(mod => mod.getSharedWingData(sw.shareId)).then(result => {
                                if (result.rooms) {
                                  setSharedWingRoomsCache(prev => ({ ...prev, [sw.shareId]: result.rooms as { id: string; name: string; icon: string }[] }));
                                }
                                setSharedWingRoomsLoading(prev => ({ ...prev, [sw.shareId]: false }));
                              }).catch(() => setSharedWingRoomsLoading(prev => ({ ...prev, [sw.shareId]: false })));
                            }
                          }
                        }}
                        style={{
                          padding: "0.5625rem 0.625rem", borderRadius: isExpanded ? "0 0.625rem 0 0" : "0 0.625rem 0.625rem 0",
                          border: isActive ? `1.5px solid ${T.color.terracotta}` : `1px solid transparent`,
                          borderLeft: "none",
                          background: isExpanded ? `${T.color.terracotta}15` : "transparent",
                          cursor: "pointer", fontSize: "0.625rem", color: T.color.muted,
                          display: "flex", alignItems: "center",
                        }}
                        title={tc("showRooms")}
                        aria-label={tc("showRooms")}
                      >
                        <span style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform .2s" }}>{"\u25BE"}</span>
                      </button>
                    </div>
                    {isExpanded && (
                      <div style={{
                        padding: "0.125rem 0 0.25rem 1.75rem",
                        borderLeft: `2px solid ${T.color.terracotta}30`,
                        marginLeft: "1.125rem", marginBottom: "0.25rem",
                        display: "flex", flexDirection: "column", gap: "0.0625rem",
                      }}>
                        {sharedWingRoomsLoading[sw.shareId] ? (
                          <span style={{ padding: "0.375rem 0.625rem", fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>...</span>
                        ) : cachedRooms && cachedRooms.length > 0 ? cachedRooms.map((r: { id: string; name: string; icon: string }) => (
                          <button
                            key={r.id}
                            role="menuitem"
                            onClick={() => {
                              onNavigateSharedWing?.(sw.shareId, sw.wingId);
                              setTimeout(() => enterRoom(r.id), 600);
                              setWingsOpen(false); setExpandedWing(null);
                            }}
                            style={{
                              padding: "0.375rem 0.625rem", borderRadius: "0.5rem",
                              fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                              border: "none", background: "transparent",
                              color: T.color.charcoal, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: "0.375rem",
                              textAlign: "left", width: "100%",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${T.color.terracotta}12`; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                          >
                            <span style={{ display: "inline-flex", flexShrink: 0 }} aria-hidden="true">
                              <RoomIcon roomId={r.id} wingId={sw.wingId} size={15} color={T.color.muted} />
                            </span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{translateRoomName(r, tWings)}</span>
                          </button>
                        )) : (
                          <span style={{ padding: "0.375rem 0.625rem", fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, fontStyle: "italic" }}>{tc("noRooms")}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Manage shares link */}
          {onSharingSettings && (
            <button
              role="menuitem"
              onClick={() => { onSharingSettings(); setWingsOpen(false); setExpandedWing(null); }}
              style={{
                padding: "0.5rem 0.75rem", borderRadius: "0.625rem",
                fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                border: "none", background: "transparent",
                color: T.color.walnut, cursor: "pointer",
                display: "flex", alignItems: "center", gap: "0.5rem",
                textAlign: "left", width: "100%",
                marginTop: "0.125rem", borderTop: `1px solid ${T.color.cream}`,
                paddingTop: "0.625rem",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${T.color.sandstone}15`; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ display: "inline-flex", flexShrink: 0 }} aria-hidden="true">
                <TopBarIcon name="settings" size={16} color={T.color.walnut} />
              </span>
              {tc("manageShares")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact level badge for the mobile menu header */
function LevelBadgeMobile() {
  const { t } = useTranslation("common");
  const { t: tl } = useTranslation("levels");
  const { totalPoints, getLevelInfo } = useTrackStore();
  const levelInfo = getLevelInfo();

  if (totalPoints === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.3125rem",
      padding: "0.1875rem 0.5rem 0.1875rem 0.25rem", borderRadius: "0.75rem",
      background: `${levelInfo.color}10`,
      border: `1px solid ${levelInfo.color}20`,
    }}>
      <div style={{
        width: "1.125rem", height: "1.125rem", borderRadius: "0.5625rem",
        background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}cc)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.5625rem", fontWeight: 700, color: T.color.white, fontFamily: T.font.body,
      }}>
        {levelInfo.rank}
      </div>
      <span style={{
        fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 500,
        color: levelInfo.color,
      }}>
        {tl(levelInfo.titleKey)}
      </span>
      <span style={{
        fontFamily: T.font.body, fontSize: "0.5625rem", color: T.color.muted,
      }}>
        {t("mpPoints", { points: String(totalPoints) })}
      </span>
    </div>
  );
}
