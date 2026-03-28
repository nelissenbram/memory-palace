"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { T } from "@/lib/theme";
import { signOut } from "@/lib/auth/actions";
import { useUserStore } from "@/lib/stores/userStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useAccessibility } from "@/components/providers/AccessibilityProvider";
import NotificationBell from "@/components/ui/NotificationBell";
import type { Crumb } from "@/lib/hooks/useNavigation";
import type { Locale } from "@/i18n/config";

interface TopBarProps {
  crumbs: Crumb[];
}

export default function TopBar({crumbs}: TopBarProps){
  const isMobile = useIsMobile();
  const { t, locale, setLocale } = useTranslation("common");
  const { accessibilityMode, toggleAccessibility } = useAccessibility();
  const { userName } = useUserStore();
  const { view, activeWing, switchWing, exitToPalace } = usePalaceStore();
  const { showDirectory, setShowDirectory } = useMemoryStore();
  const { getWings } = useRoomStore();
  const WINGS = getWings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userBtnRef = useRef<HTMLButtonElement>(null);

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

  // Close mobile menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  // Mobile: show only current location + menu toggle
  if (isMobile) {
    return (
      <>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "3rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 0.75rem", zIndex: 40,
          background: "linear-gradient(180deg,rgba(221,213,200,.95),rgba(221,213,200,0))",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", minWidth: 0, flex: 1 }}>
            <button onClick={()=>{if(view!=="exterior")exitToPalace();}} aria-label={t("backToPalace")} style={{
              width: "2.75rem", height: "2.75rem", borderRadius: "0.375rem", flexShrink: 0,
              background: `linear-gradient(135deg,${T.color.warmStone},${T.color.sandstone})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem",
              border: `1px solid ${T.color.sandstone}`, cursor: view!=="exterior"?"pointer":"default", padding: 0,
            }}>{"\u{1F3DB}\uFE0F"}</button>
            {/* Current location breadcrumb */}
            <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: "0.25rem", overflow: "hidden", minWidth: 0 }}>
              {crumbs.map((c, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.1875rem", minWidth: 0 }}>
                  {i > 0 && <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted, flexShrink: 0 }}>/</span>}
                  {c.action ? (
                    <button onClick={c.action} aria-current={i === crumbs.length - 1 ? "page" : undefined} style={{
                      fontFamily: T.font.display, fontSize: i === crumbs.length - 1 ? "0.875rem" : "0.75rem",
                      fontWeight: 500, color: i === crumbs.length - 1 ? T.color.charcoal : T.color.muted,
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      textDecoration: "underline", textDecorationColor: `${T.color.sandstone}88`,
                      textUnderlineOffset: "0.1875rem", minWidth: 0,
                    }}>{c.label}</button>
                  ) : (
                    <span aria-current={i === crumbs.length - 1 ? "page" : undefined} style={{
                      fontFamily: T.font.display, fontSize: i === crumbs.length - 1 ? "0.875rem" : "0.75rem",
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
            <div onClick={e => e.stopPropagation()} style={{
              position: "absolute", top: "3rem", right: "0.5rem", left: "0.5rem",
              background: `${T.color.linen}f5`, backdropFilter: "blur(16px)",
              borderRadius: "0.875rem", border: `1px solid ${T.color.cream}`,
              boxShadow: "0 8px 40px rgba(44,44,42,.15)", padding: "0.75rem",
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
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: activeWing === w.id ? 600 : 400,
                    border: activeWing === w.id ? `1.5px solid ${w.accent}` : `1px solid ${T.color.cream}`,
                    background: activeWing === w.id ? `${w.accent}15` : T.color.white,
                    color: activeWing === w.id ? w.accent : T.color.muted,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
                    textAlign: "left", minHeight: "2.75rem",
                  }}>
                    <span style={{ fontSize: "1rem" }}>{w.icon}</span>{w.name}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", padding: "0 0.125rem" }}>
                <NotificationBell />
                <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut }}>{t("notifications")}</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={() => { setShowDirectory(!showDirectory); setMenuOpen(false); }} style={{
                  flex: 1, padding: "0.625rem 0.75rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                }}>
                  {"\u{1F4C2}"} {t("directory")}
                </button>
                <a href="/family-tree" onClick={() => setMenuOpen(false)} style={{
                  flex: 1, padding: "0.625rem 0.75rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                  textDecoration: "none",
                }}>
                  {"\u{1F333}"} {t("familyTree")}
                </a>
                <a href="/settings" onClick={() => setMenuOpen(false)} style={{
                  flex: 1, padding: "0.625rem 0.75rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                  textDecoration: "none",
                }}>
                  {"\u2699\uFE0F"} {t("settings")}
                </a>
                <button onClick={() => { signOut(); setMenuOpen(false); }} style={{
                  flex: 1, padding: "0.625rem 0.75rem", borderRadius: "0.625rem", minHeight: "2.75rem",
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
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
                  letterSpacing: "0.03125rem",
                }}>
                  {t("preferences")}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, marginRight: "auto" }}>
                    {t("language")}
                  </span>
                  <button onClick={() => setLocale("en")} aria-pressed={locale === "en"} style={{
                    padding: "0.375rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.75rem", fontFamily: T.font.body,
                    fontWeight: locale === "en" ? 600 : 400,
                    border: `1px solid ${locale === "en" ? T.color.terracotta : T.color.cream}`,
                    background: locale === "en" ? `${T.color.terracotta}12` : T.color.white,
                    color: locale === "en" ? T.color.terracotta : T.color.muted, cursor: "pointer",
                    minHeight: "2.75rem",
                  }}>EN</button>
                  <button onClick={() => setLocale("nl")} aria-pressed={locale === "nl"} style={{
                    padding: "0.375rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.75rem", fontFamily: T.font.body,
                    fontWeight: locale === "nl" ? 600 : 400,
                    border: `1px solid ${locale === "nl" ? T.color.terracotta : T.color.cream}`,
                    background: locale === "nl" ? `${T.color.terracotta}12` : T.color.white,
                    color: locale === "nl" ? T.color.terracotta : T.color.muted, cursor: "pointer",
                    minHeight: "2.75rem",
                  }}>NL</button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ marginRight: "auto" }}>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, display: "block" }}>
                      {t("accessibilityMode")}
                    </span>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted }}>
                      {t("accessibilityOn")}
                    </span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={accessibilityMode}
                    onClick={toggleAccessibility}
                    style={{
                      width: "2.75rem", height: "1.5rem", borderRadius: "0.75rem",
                      border: `1px solid ${accessibilityMode ? T.color.sage : T.color.cream}`,
                      background: accessibilityMode ? T.color.sage : T.color.warmStone,
                      cursor: "pointer", position: "relative",
                      transition: "background 0.2s, border-color 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute", top: "0.125rem", left: accessibilityMode ? "1.375rem" : "0.125rem",
                      width: "1.125rem", height: "1.125rem", borderRadius: "0.5625rem",
                      background: T.color.white,
                      boxShadow: "0 1px 3px rgba(0,0,0,.15)",
                      transition: "left 0.2s",
                    }} />
                  </button>
                </div>
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
    <div style={{position:"absolute",top:0,left:0,right:0,height:"3.375rem",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1.375rem",zIndex:40,background:"linear-gradient(180deg,rgba(221,213,200,.92),rgba(221,213,200,0))"}}>
      <div style={{display:"flex",alignItems:"center",gap:"0.625rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
          <button onClick={()=>{if(view!=="exterior")exitToPalace();}} title={t("backToPalace")} aria-label={t("backToPalace")} style={{width:"2.25rem",height:"2.25rem",borderRadius:"0.4375rem",background:`linear-gradient(135deg,${T.color.warmStone},${T.color.sandstone})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.875rem",border:`1px solid ${T.color.sandstone}`,cursor:view!=="exterior"?"pointer":"default",padding:0}}>{"\u{1F3DB}\uFE0F"}</button>
          <button onClick={()=>setShowDirectory(!showDirectory)} title={t("directory")} aria-label={t("directory")} style={{width:"2.25rem",height:"2.25rem",borderRadius:"0.4375rem",border:`1px solid ${showDirectory?T.color.sandstone:T.color.cream}`,background:showDirectory?`${T.color.sandstone}30`:`${T.color.white}bb`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8125rem",cursor:"pointer",color:T.color.muted}}>{"\u{1F4C2}"}</button>
          {userName&&<span style={{fontFamily:T.font.display,fontSize:"0.875rem",fontWeight:600,fontStyle:"italic",color:T.color.charcoal,background:`${T.color.linen}cc`,padding:"0.125rem 0.5rem",borderRadius:"0.375rem",textShadow:"0 1px 2px rgba(255,255,255,.9)"}}>{t("palace", { name: userName })}</span>}
          <nav aria-label="Breadcrumb" style={{display:"flex",alignItems:"center",gap:"0.25rem",background:`${T.color.linen}cc`,padding:"0.125rem 0.5rem",borderRadius:"0.375rem"}}>
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
        <WingsDropdown wings={WINGS} activeWing={activeWing} switchWing={switchWing} />

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
              boxShadow: userMenuOpen ? `0 0 0 3px ${T.color.terracotta}30` : "0 1px 4px rgba(44,44,42,.15)",
            }}
          >
            {initials || "\u{1F464}"}
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <DesktopUserMenu
              userName={userName}
              locale={locale}
              setLocale={setLocale}
              accessibilityMode={accessibilityMode}
              toggleAccessibility={toggleAccessibility}
              t={t}
              onClose={() => { setUserMenuOpen(false); userBtnRef.current?.focus(); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** ─── Desktop User Dropdown Menu ─── */

const USER_MENU_ITEMS = [
  { href: "/settings/profile", labelKey: "profile", icon: "\u{1F464}" },
  { href: "/family-tree", labelKey: "familyTree", icon: "\u{1F333}" },
  { href: "/settings/family", labelKey: "family", icon: "\u{1F46A}" },
  { href: "/settings/subscription", labelKey: "subscription", icon: "\u2B50" },
  { href: "/settings/connections", labelKey: "connections", icon: "\u{1F517}" },
  { href: "/settings/notifications", labelKey: "notifications", icon: "\u{1F514}" },
  { href: "/settings/legacy", labelKey: "legacy", icon: "\u{1F3DB}\uFE0F" },
  { href: "/security", labelKey: "security", icon: "\u{1F6E1}\uFE0F" },
] as const;

function DesktopUserMenu({ userName, locale, setLocale, accessibilityMode, toggleAccessibility, t, onClose }: {
  userName: string;
  locale: Locale;
  setLocale: (l: Locale) => void;
  accessibilityMode: boolean;
  toggleAccessibility: () => void;
  t: (key: string, params?: Record<string, string>) => string;
  onClose: () => void;
}) {
  const menuListRef = useRef<HTMLDivElement>(null);
  const [focusIdx, setFocusIdx] = useState(-1);
  const { totalPoints, getLevelInfo } = useTrackStore();
  const levelInfo = getLevelInfo();

  // Total focusable items: menu links + a11y toggle + 2 lang buttons + sign-out = items.length + 4
  const totalItems = USER_MENU_ITEMS.length + 4;

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
    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 400,
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
        width: "17.5rem", background: `${T.color.linen}f8`,
        backdropFilter: "blur(20px)",
        borderRadius: "1rem", border: `1px solid ${T.color.cream}`,
        boxShadow: "0 12px 48px rgba(44,44,42,.18), 0 2px 8px rgba(44,44,42,.08)",
        padding: 0, overflow: "hidden", zIndex: 100,
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
          {userName ? userName.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2) : "\u{1F464}"}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
            color: T.color.charcoal,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
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
                fontSize: "0.5rem", fontWeight: 700, color: "#FFF", fontFamily: T.font.body,
              }}>
                {levelInfo.rank}
              </div>
              <span style={{
                fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                color: levelInfo.color,
              }}>
                {levelInfo.title}
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
        {USER_MENU_ITEMS.map((item, i) => (
          <a
            key={item.href}
            href={item.href}
            role="menuitem"
            data-menu-item
            tabIndex={-1}
            onClick={onClose}
            onMouseEnter={() => setFocusIdx(i)}
            onFocus={() => setFocusIdx(i)}
            style={{
              ...itemBase,
              ...(focusIdx === i ? {
                background: `${T.color.terracotta}10`,
                color: T.color.terracotta,
              } : {}),
            }}
          >
            <span style={{ fontSize: "1rem", width: "1.375rem", textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
            {t(item.labelKey)}
          </a>
        ))}
      </div>

      {/* Preferences section */}
      <div style={{
        padding: "0.5rem 0.875rem", borderTop: `1px solid ${T.color.cream}`,
        display: "flex", flexDirection: "column", gap: "0.5rem",
      }}>
        <span style={{
          fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
          color: T.color.muted, textTransform: "uppercase",
          letterSpacing: "0.03125rem",
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
          {(["en", "nl"] as Locale[]).map((l, li) => (
            <button
              key={l}
              role="menuitem"
              data-menu-item
              tabIndex={-1}
              aria-pressed={locale === l}
              onClick={() => { setLocale(l); onClose(); }}
              onMouseEnter={() => setFocusIdx(USER_MENU_ITEMS.length + li)}
              onFocus={() => setFocusIdx(USER_MENU_ITEMS.length + li)}
              style={{
                padding: "0.3125rem 0.75rem", borderRadius: "0.5rem",
                fontSize: "0.8125rem", fontFamily: T.font.body,
                fontWeight: locale === l ? 600 : 400,
                border: `1px solid ${locale === l ? T.color.terracotta : T.color.cream}`,
                background: locale === l ? `${T.color.terracotta}12` : T.color.white,
                color: locale === l ? T.color.terracotta : T.color.muted,
                cursor: "pointer",
                ...(focusIdx === USER_MENU_ITEMS.length + li ? {
                  outline: `2px solid ${T.color.terracotta}`,
                  outlineOffset: 1,
                } : {}),
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Accessibility toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ marginRight: "auto" }}>
            <span style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal,
              display: "block",
            }}>
              {t("accessibilityMode")}
            </span>
            <span style={{
              fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
            }}>
              {t("accessibilityOn")}
            </span>
          </div>
          <button
            role="switch"
            aria-checked={accessibilityMode}
            data-menu-item
            tabIndex={-1}
            onClick={toggleAccessibility}
            onMouseEnter={() => setFocusIdx(USER_MENU_ITEMS.length + 2)}
            onFocus={() => setFocusIdx(USER_MENU_ITEMS.length + 2)}
            style={{
              width: "2.75rem", height: "1.5rem", borderRadius: "0.75rem",
              border: `1px solid ${accessibilityMode ? T.color.sage : T.color.cream}`,
              background: accessibilityMode ? T.color.sage : T.color.warmStone,
              cursor: "pointer", position: "relative",
              transition: "background 0.2s, border-color 0.2s",
              flexShrink: 0,
              ...(focusIdx === USER_MENU_ITEMS.length + 2 ? {
                outline: `2px solid ${T.color.terracotta}`,
                outlineOffset: 1,
              } : {}),
            }}
          >
            <span style={{
              position: "absolute", top: "0.125rem", left: accessibilityMode ? "1.375rem" : "0.125rem",
              width: "1.125rem", height: "1.125rem", borderRadius: "0.5625rem",
              background: T.color.white,
              boxShadow: "0 1px 3px rgba(0,0,0,.15)",
              transition: "left 0.2s",
            }} />
          </button>
        </div>
      </div>

      {/* Sign out */}
      <div style={{ padding: "0.375rem 0.375rem 0.5rem", borderTop: `1px solid ${T.color.cream}` }}>
        <button
          role="menuitem"
          data-menu-item
          tabIndex={-1}
          onClick={() => { signOut(); onClose(); }}
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
          <span style={{ fontSize: "0.9375rem", width: "1.375rem", textAlign: "center", flexShrink: 0 }}>{"\u{1F6AA}"}</span>
          {t("signOut")}
        </button>
      </div>
    </div>
  );
}

/** Wings dropdown — shows wings with expandable room lists for direct navigation */
function WingsDropdown({ wings, activeWing, switchWing }: {
  wings: { id: string; name: string; icon: string; accent: string }[];
  activeWing: string | null;
  switchWing: (id: string) => void;
}) {
  const { t: tc } = useTranslation("common");
  const [wingsOpen, setWingsOpen] = useState(false);
  const [expandedWing, setExpandedWing] = useState<string | null>(null);
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
        style={{
          padding: "0.375rem 0.875rem", borderRadius: "1rem",
          fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
          border: `1px solid ${activeWingData ? activeWingData.accent : T.color.cream}`,
          background: activeWingData ? `${activeWingData.accent}15` : `${T.color.white}bb`,
          color: activeWingData ? activeWingData.accent : T.color.walnut,
          cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3125rem",
        }}
      >
        <span style={{ fontSize: "0.75rem" }}>{activeWingData ? activeWingData.icon : "\u{1F3DB}\uFE0F"}</span>
        {activeWingData ? activeWingData.name : tc("palaceMap")}
        <span style={{ fontSize: "0.625rem", marginLeft: "0.125rem", transition: "transform .2s", transform: wingsOpen ? "rotate(180deg)" : "none" }}>{"\u25BE"}</span>
      </button>

      {wingsOpen && (
        <div role="menu" aria-label={tc("palaceMap")} style={{
          position: "absolute", top: "calc(100% + 0.375rem)", right: 0,
          minWidth: "15rem", maxHeight: "26.25rem", overflowY: "auto",
          background: `${T.color.linen}f8`,
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderRadius: "0.875rem", border: `1px solid ${T.color.cream}`,
          boxShadow: "0 8px 32px rgba(44,44,42,.14)",
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
                      fontWeight: activeWing === w.id ? 600 : 400,
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
                    <span style={{ fontSize: "0.9375rem" }}>{w.icon}</span>
                    {w.name}
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
                          fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 400,
                          border: "none", background: "transparent",
                          color: T.color.charcoal, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: "0.375rem",
                          textAlign: "left", width: "100%",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${w.accent}12`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontSize: "0.8125rem" }}>{r.icon}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Compact level badge for the mobile menu header */
function LevelBadgeMobile() {
  const { t } = useTranslation("common");
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
        fontSize: "0.5625rem", fontWeight: 700, color: "#FFF", fontFamily: T.font.body,
      }}>
        {levelInfo.rank}
      </div>
      <span style={{
        fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 500,
        color: levelInfo.color,
      }}>
        {levelInfo.title}
      </span>
      <span style={{
        fontFamily: T.font.body, fontSize: "0.5625rem", color: T.color.muted,
      }}>
        {t("mpPoints", { points: String(totalPoints) })}
      </span>
    </div>
  );
}
