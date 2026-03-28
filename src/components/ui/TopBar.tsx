"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { signOut } from "@/lib/auth/actions";
import { useUserStore } from "@/lib/stores/userStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import NotificationBell from "@/components/ui/NotificationBell";
import type { Crumb } from "@/lib/hooks/useNavigation";
import type { Locale } from "@/i18n/config";

interface TopBarProps {
  crumbs: Crumb[];
}

export default function TopBar({crumbs}: TopBarProps){
  const isMobile = useIsMobile();
  const { t, locale, setLocale } = useTranslation("common");
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

  // Mobile: show only current location + menu toggle
  if (isMobile) {
    return (
      <>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 48,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 12px", zIndex: 40,
          background: "linear-gradient(180deg,rgba(221,213,200,.95),rgba(221,213,200,0))",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
            <button onClick={()=>{if(view!=="exterior")exitToPalace();}} style={{
              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
              background: `linear-gradient(135deg,${T.color.warmStone},${T.color.sandstone})`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
              border: `1px solid ${T.color.sandstone}`, cursor: view!=="exterior"?"pointer":"default", padding: 0,
            }}>{"\u{1F3DB}\uFE0F"}</button>
            {/* Current location breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden", minWidth: 0 }}>
              {crumbs.map((c, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
                  {i > 0 && <span style={{ fontFamily: T.font.body, fontSize: 10, color: T.color.muted, flexShrink: 0 }}>/</span>}
                  {c.action ? (
                    <button onClick={c.action} style={{
                      fontFamily: T.font.display, fontSize: i === crumbs.length - 1 ? 14 : 12,
                      fontWeight: 500, color: i === crumbs.length - 1 ? T.color.charcoal : T.color.muted,
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      textDecoration: "underline", textDecorationColor: `${T.color.sandstone}88`,
                      textUnderlineOffset: 3, minWidth: 0,
                    }}>{c.label}</button>
                  ) : (
                    <span style={{
                      fontFamily: T.font.display, fontSize: i === crumbs.length - 1 ? 14 : 12,
                      fontWeight: 500, color: T.color.charcoal,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
                    }}>{c.label}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            border: `1px solid ${T.color.cream}`,
            background: menuOpen ? `${T.color.sandstone}30` : `${T.color.white}bb`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, cursor: "pointer", color: T.color.muted,
          }}>
            {menuOpen ? "\u2715" : "\u2630"}
          </button>
        </div>
        {/* Mobile menu overlay */}
        {menuOpen && (
          <div onClick={() => setMenuOpen(false)} style={{
            position: "absolute", inset: 0, zIndex: 39, background: "rgba(42,34,24,.3)",
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              position: "absolute", top: 48, right: 8, left: 8,
              background: `${T.color.linen}f5`, backdropFilter: "blur(16px)",
              borderRadius: 14, border: `1px solid ${T.color.cream}`,
              boxShadow: "0 8px 40px rgba(44,44,42,.15)", padding: 12,
              animation: "fadeUp .2s ease",
            }}>
              {userName && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  marginBottom: 10, padding: "0 4px",
                }}>
                  <span style={{
                    fontFamily: T.font.display, fontSize: 14, fontStyle: "italic",
                    color: T.color.walnut,
                  }}>
                    {userName ? t("palace", { name: userName }) : t("palaceDefault")}
                  </span>
                  <LevelBadgeMobile />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                {WINGS.map(w => (
                  <button key={w.id} onClick={() => { switchWing(w.id); setMenuOpen(false); }} style={{
                    padding: "10px 12px", borderRadius: 10,
                    fontFamily: T.font.body, fontSize: 13, fontWeight: activeWing === w.id ? 600 : 400,
                    border: activeWing === w.id ? `1.5px solid ${w.accent}` : `1px solid ${T.color.cream}`,
                    background: activeWing === w.id ? `${w.accent}15` : T.color.white,
                    color: activeWing === w.id ? w.accent : T.color.muted,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                    textAlign: "left", minHeight: 44,
                  }}>
                    <span style={{ fontSize: 16 }}>{w.icon}</span>{w.name}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "0 2px" }}>
                <NotificationBell />
                <span style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.walnut }}>{t("notifications")}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setShowDirectory(!showDirectory); setMenuOpen(false); }} style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10, minHeight: 44,
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: 12, color: T.color.walnut, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  {"\u{1F4C2}"} {t("directory")}
                </button>
                <a href="/family-tree" onClick={() => setMenuOpen(false)} style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10, minHeight: 44,
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: 12, color: T.color.walnut, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  textDecoration: "none",
                }}>
                  {"\u{1F333}"} {t("familyTree")}
                </a>
                <a href="/settings" onClick={() => setMenuOpen(false)} style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10, minHeight: 44,
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: 12, color: T.color.walnut, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  textDecoration: "none",
                }}>
                  {"\u2699\uFE0F"} {t("settings")}
                </a>
                <button onClick={() => { signOut(); setMenuOpen(false); }} style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10, minHeight: 44,
                  border: `1px solid ${T.color.cream}`, background: T.color.white,
                  fontFamily: T.font.body, fontSize: 12, color: T.color.muted, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  {t("signOut")}
                </button>
              </div>
              {/* Language switcher */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 8, padding: "0 2px" }}>
                <button onClick={() => setLocale("en")} style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 12, fontFamily: T.font.body,
                  fontWeight: locale === "en" ? 600 : 400,
                  border: `1px solid ${locale === "en" ? T.color.terracotta : T.color.cream}`,
                  background: locale === "en" ? `${T.color.terracotta}12` : T.color.white,
                  color: locale === "en" ? T.color.terracotta : T.color.muted, cursor: "pointer",
                }}>EN</button>
                <button onClick={() => setLocale("nl")} style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 12, fontFamily: T.font.body,
                  fontWeight: locale === "nl" ? 600 : 400,
                  border: `1px solid ${locale === "nl" ? T.color.terracotta : T.color.cream}`,
                  background: locale === "nl" ? `${T.color.terracotta}12` : T.color.white,
                  color: locale === "nl" ? T.color.terracotta : T.color.muted, cursor: "pointer",
                }}>NL</button>
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
    <div style={{position:"absolute",top:0,left:0,right:0,height:54,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 22px",zIndex:40,background:"linear-gradient(180deg,rgba(221,213,200,.92),rgba(221,213,200,0))"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>{if(view!=="exterior")exitToPalace();}} title="Back to Palace" style={{width:30,height:30,borderRadius:7,background:`linear-gradient(135deg,${T.color.warmStone},${T.color.sandstone})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,border:`1px solid ${T.color.sandstone}`,cursor:view!=="exterior"?"pointer":"default",padding:0}}>{"\u{1F3DB}\uFE0F"}</button>
          <button onClick={()=>setShowDirectory(!showDirectory)} title="Directory" style={{width:30,height:30,borderRadius:7,border:`1px solid ${showDirectory?T.color.sandstone:T.color.cream}`,background:showDirectory?`${T.color.sandstone}30`:`${T.color.white}bb`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,cursor:"pointer",color:T.color.muted}}>{"\u{1F4C2}"}</button>
          {userName&&<span style={{fontFamily:T.font.display,fontSize:14,fontWeight:600,fontStyle:"italic",color:T.color.charcoal,background:`${T.color.linen}cc`,padding:"2px 8px",borderRadius:6,textShadow:"0 1px 2px rgba(255,255,255,.9)"}}>{t("palace", { name: userName })}</span>}
          <div style={{display:"flex",alignItems:"center",gap:4,background:`${T.color.linen}cc`,padding:"2px 8px",borderRadius:6}}>
            {crumbs.map((c,i)=><span key={i} style={{display:"flex",alignItems:"center",gap:4}}>
              {i>0&&<span style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted}}>/</span>}
              {c.action?<button onClick={c.action} style={{fontFamily:T.font.display,fontSize:i===0?15:13,fontWeight:600,color:i===crumbs.length-1?T.color.charcoal:T.color.walnut,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",textDecorationColor:`${T.color.sandstone}88`,textUnderlineOffset:3,padding:0}}>{c.label}</button>
              :<span style={{fontFamily:T.font.display,fontSize:i===0?15:13,fontWeight:600,color:T.color.charcoal}}>{c.label}</span>}
            </span>)}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <NotificationBell />
        <WingsDropdown wings={WINGS} activeWing={activeWing} switchWing={switchWing} />

        {/* User menu button + dropdown */}
        <div ref={userMenuRef} style={{ position: "relative", marginLeft: 6 }}>
          <button
            ref={userBtnRef}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label={t("userMenu")}
            aria-expanded={userMenuOpen}
            aria-haspopup="true"
            style={{
              width: 36, height: 36, borderRadius: 18, cursor: "pointer",
              border: userMenuOpen ? `2px solid ${T.color.terracotta}` : `2px solid ${T.color.sandstone}`,
              background: `linear-gradient(135deg, ${T.color.walnut}, ${T.color.terracotta})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: T.font.body, fontSize: 13, fontWeight: 700,
              color: T.color.white, letterSpacing: 0.5,
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

function DesktopUserMenu({ userName, locale, setLocale, t, onClose }: {
  userName: string;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
  onClose: () => void;
}) {
  const menuListRef = useRef<HTMLDivElement>(null);
  const [focusIdx, setFocusIdx] = useState(-1);
  const { totalPoints, getLevelInfo } = useTrackStore();
  const levelInfo = getLevelInfo();

  // Total focusable items: menu links + sign-out + 2 lang buttons = items.length + 3
  const totalItems = USER_MENU_ITEMS.length + 3;

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
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px", borderRadius: 10,
    fontFamily: T.font.body, fontSize: 14, fontWeight: 400,
    color: T.color.charcoal, textDecoration: "none",
    border: "none", background: "transparent",
    cursor: "pointer", width: "100%", textAlign: "left",
    minHeight: 42,
  };

  return (
    <div
      role="menu"
      aria-label={t("userMenu")}
      onKeyDown={handleKeyDown}
      ref={menuListRef}
      style={{
        position: "absolute", top: "calc(100% + 8px)", right: 0,
        width: 280, background: `${T.color.linen}f8`,
        backdropFilter: "blur(20px)",
        borderRadius: 16, border: `1px solid ${T.color.cream}`,
        boxShadow: "0 12px 48px rgba(44,44,42,.18), 0 2px 8px rgba(44,44,42,.08)",
        padding: 0, overflow: "hidden", zIndex: 100,
      }}
    >
      {/* User header */}
      <div style={{
        padding: "16px 16px 12px", borderBottom: `1px solid ${T.color.cream}`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 21, flexShrink: 0,
          background: `linear-gradient(135deg, ${T.color.walnut}, ${T.color.terracotta})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: T.font.body, fontSize: 15, fontWeight: 700,
          color: T.color.white, letterSpacing: 0.5,
        }}>
          {userName ? userName.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2) : "\u{1F464}"}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: T.font.display, fontSize: 16, fontWeight: 600,
            color: T.color.charcoal,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {userName || t("palaceDefault")}
          </div>
          {totalPoints > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginTop: 3,
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: 8,
                background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}cc)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 700, color: "#FFF", fontFamily: T.font.body,
              }}>
                {levelInfo.rank}
              </div>
              <span style={{
                fontFamily: T.font.body, fontSize: 12, fontWeight: 500,
                color: levelInfo.color,
              }}>
                {levelInfo.title}
              </span>
              <span style={{
                fontFamily: T.font.body, fontSize: 11, color: T.color.muted,
              }}>
                {totalPoints} MP
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Menu items */}
      <div style={{ padding: "6px 6px" }}>
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
            <span style={{ fontSize: 16, width: 22, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
            {t(item.labelKey)}
          </a>
        ))}
      </div>

      {/* Language switcher */}
      <div style={{
        padding: "8px 16px", borderTop: `1px solid ${T.color.cream}`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{
          fontFamily: T.font.body, fontSize: 13, color: T.color.muted, marginRight: "auto",
        }}>
          {t("language")}
        </span>
        {(["en", "nl"] as Locale[]).map((l, li) => (
          <button
            key={l}
            role="menuitem"
            data-menu-item
            tabIndex={-1}
            onClick={() => { setLocale(l); onClose(); }}
            onMouseEnter={() => setFocusIdx(USER_MENU_ITEMS.length + li)}
            onFocus={() => setFocusIdx(USER_MENU_ITEMS.length + li)}
            style={{
              padding: "5px 12px", borderRadius: 8,
              fontSize: 13, fontFamily: T.font.body,
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

      {/* Sign out */}
      <div style={{ padding: "6px 6px 8px", borderTop: `1px solid ${T.color.cream}` }}>
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
          <span style={{ fontSize: 15, width: 22, textAlign: "center", flexShrink: 0 }}>{"\u{1F6AA}"}</span>
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
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [wingsOpen]);

  const activeWingData = wings.find(w => w.id === activeWing);

  return (
    <div ref={wingsRef} style={{ position: "relative" }}>
      <button
        onClick={() => { setWingsOpen(!wingsOpen); setExpandedWing(null); }}
        style={{
          padding: "6px 14px", borderRadius: 16,
          fontFamily: T.font.body, fontSize: 12, fontWeight: 500,
          border: `1px solid ${activeWingData ? activeWingData.accent : T.color.cream}`,
          background: activeWingData ? `${activeWingData.accent}15` : `${T.color.white}bb`,
          color: activeWingData ? activeWingData.accent : T.color.walnut,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
        }}
      >
        <span style={{ fontSize: 12 }}>{activeWingData ? activeWingData.icon : "\u{1F3DB}\uFE0F"}</span>
        {activeWingData ? activeWingData.name : tc("palaceMap")}
        <span style={{ fontSize: 10, marginLeft: 2, transition: "transform .2s", transform: wingsOpen ? "rotate(180deg)" : "none" }}>{"\u25BE"}</span>
      </button>

      {wingsOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          minWidth: 240, maxHeight: 420, overflowY: "auto",
          background: `${T.color.linen}f8`,
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderRadius: 14, border: `1px solid ${T.color.cream}`,
          boxShadow: "0 8px 32px rgba(44,44,42,.14)",
          padding: 6, zIndex: 100,
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {wings.map(w => {
            const rooms = getWingRooms(w.id);
            const isExpanded = expandedWing === w.id;
            return (
              <div key={w.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <button
                    onClick={() => { enterCorridor(w.id); setWingsOpen(false); setExpandedWing(null); }}
                    style={{
                      flex: 1, padding: "9px 12px", borderRadius: isExpanded ? "10px 0 0 0" : "10px 0 0 10px",
                      fontFamily: T.font.body, fontSize: 13,
                      fontWeight: activeWing === w.id ? 600 : 400,
                      border: activeWing === w.id ? `1.5px solid ${w.accent}` : `1px solid transparent`,
                      borderRight: "none",
                      background: activeWing === w.id ? `${w.accent}15` : "transparent",
                      color: activeWing === w.id ? w.accent : T.color.charcoal,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                      textAlign: "left",
                    }}
                    onMouseEnter={e => { if (activeWing !== w.id) e.currentTarget.style.background = `${T.color.sandstone}20`; }}
                    onMouseLeave={e => { if (activeWing !== w.id) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 15 }}>{w.icon}</span>
                    {w.name}
                  </button>
                  {rooms.length > 0 && (
                    <button
                      onClick={() => setExpandedWing(isExpanded ? null : w.id)}
                      style={{
                        padding: "9px 10px", borderRadius: isExpanded ? "0 10px 0 0" : "0 10px 10px 0",
                        border: activeWing === w.id ? `1.5px solid ${w.accent}` : `1px solid transparent`,
                        borderLeft: "none",
                        background: isExpanded ? `${w.accent}15` : "transparent",
                        cursor: "pointer", fontSize: 10, color: T.color.muted,
                        display: "flex", alignItems: "center",
                        transition: "transform .2s",
                      }}
                      title="Show rooms"
                    >
                      <span style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform .2s" }}>{"\u25BE"}</span>
                    </button>
                  )}
                </div>
                {isExpanded && rooms.length > 0 && (
                  <div style={{
                    padding: "2px 0 4px 28px",
                    borderLeft: `2px solid ${w.accent}30`,
                    marginLeft: 18, marginBottom: 4,
                    display: "flex", flexDirection: "column", gap: 1,
                  }}>
                    {rooms.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { enterWing(w.id); setTimeout(() => enterRoom(r.id), 100); setWingsOpen(false); setExpandedWing(null); }}
                        style={{
                          padding: "6px 10px", borderRadius: 8,
                          fontFamily: T.font.body, fontSize: 12, fontWeight: 400,
                          border: "none", background: "transparent",
                          color: T.color.charcoal, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 6,
                          textAlign: "left", width: "100%",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${w.accent}12`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontSize: 13 }}>{r.icon}</span>
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
  const { totalPoints, getLevelInfo } = useTrackStore();
  const levelInfo = getLevelInfo();

  if (totalPoints === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "3px 8px 3px 4px", borderRadius: 12,
      background: `${levelInfo.color}10`,
      border: `1px solid ${levelInfo.color}20`,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 9,
        background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}cc)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, color: "#FFF", fontFamily: T.font.body,
      }}>
        {levelInfo.rank}
      </div>
      <span style={{
        fontFamily: T.font.body, fontSize: 10, fontWeight: 500,
        color: levelInfo.color,
      }}>
        {levelInfo.title}
      </span>
      <span style={{
        fontFamily: T.font.body, fontSize: 9, color: T.color.muted,
      }}>
        {totalPoints} MP
      </span>
    </div>
  );
}
