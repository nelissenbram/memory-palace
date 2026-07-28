"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { isIOS } from "@/lib/native/platform";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import { useSignOut } from "@/lib/hooks/useSignOut";
import SignOutOverlay from "@/components/ui/SignOutOverlay";
import { useTranslation } from "@/lib/hooks/useTranslation";
import NavigationBar from "@/components/ui/NavigationBar";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import SettingsTutorial, { useSettingsTutorial } from "@/components/ui/SettingsTutorial";
import { CREAM, INK, MUTED, EMBER, EMBER_GLYPH, HAIRLINE, SHADOW, TOP_HIGHLIGHT } from "@/lib/libraryTokens";

function SettingsIcon({ name, size = 16 }: { name: string; size?: number }) {
  const s = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "profile":
      return (
        <svg {...s}>
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "family":
      return (
        <svg {...s}>
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case "subscription":
      return (
        <svg {...s}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "connections":
      return (
        <svg {...s}>
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...s}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      );
    case "legacy":
      return (
        <svg {...s}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "security":
      return (
        <svg {...s}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "sharing":
      return (
        <svg {...s}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      );
    case "cookies":
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
          <circle cx="14" cy="8.5" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="10.5" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="15" cy="13.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="7.5" cy="13" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "signOut":
      return (
        <svg {...s}>
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Settings IA (Explore/Me revision, change 16): 7 honest doors.
 * - Cookies folded into Privacy & Security (/settings/cookies redirects there).
 * - Connections reachable from Profile (route survives for OAuth returns/deep links).
 * - All /settings/* sub-pages remain canonical deep-link targets for /me.
 */
const NAV_ITEMS = [
  { href: "/settings/profile", labelKey: "profile", iconKey: "profile" },
  { href: "/settings/family", labelKey: "family", iconKey: "family" },
  // iOS is free-tier only (Apple 3.1.1) — hide the Subscription tab and its
  // link to the billing/plan page inside the native app.
  { href: "/settings/subscription", labelKey: "subscription", iconKey: "subscription", hideInNative: true },
  { href: "/settings/sharing", labelKey: "sharingSettings", iconKey: "sharing" },
  { href: "/settings/notifications", labelKey: "alerts", iconKey: "notifications" },
  { href: "/settings/legacy", labelKey: "legacy", iconKey: "legacy" },
  { href: "/settings/security", labelKey: "security", iconKey: "security" },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  // On iPad portrait (768–1024px) the desktop sidebar + content two-pane crams the
  // content column. Use the stacked tab-bar layout there too — but keep the desktop
  // NavigationBar / top bar (phones get the bottom bar via isMobile).
  const stacked = isMobile || isCompact;
  const { signingOut, handleSignOut } = useSignOut();
  const { t: tc } = useTranslation("common");

  const settingsRouter = useRouter();
  const filteredItems = NAV_ITEMS.filter((item) => !("hideInNative" in item && item.hideInNative && isIOS()));
  const navMode = usePalaceStore((s) => s.navMode);
  const setNavMode = usePalaceStore((s) => s.setNavMode);
  const [tourOpen, setTourOpen] = useSettingsTutorial();

  // i18n fallback — "backToMe" works before the locale files land.
  const meLabel = tc("backToMe") !== "backToMe" ? tc("backToMe") : "Me";

  return (
    <>
    {signingOut && <SignOutOverlay />}
    <div style={{
      position: "fixed",
      inset: 0,
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      paddingTop: stacked ? 0 : "3.5rem",
      paddingBottom: stacked ? "calc(3.5rem + env(safe-area-inset-bottom, 0px))" : "2rem",
      background: CREAM,
      zIndex: 1,
    }}>
      {/* Desktop NavigationBar — "Me" tab highlighted */}
      {!isMobile && (
        <NavigationBar
          currentMode={navMode}
          onModeChange={(mode) => { setNavMode(mode); settingsRouter.push(mode === "3d" ? "/palace" : `/${mode}`); }}
          onNotifications={() => settingsRouter.push("/atrium?notifications=1")}
          isMobile={false}
          activeTab="me"
        />
      )}
      {/* Top bar — desktop only (pushed below NavigationBar) */}
      {!isMobile && (
        <header style={{
          paddingTop: "1.5rem",
          paddingLeft: "1.75rem",
          paddingRight: "1.75rem",
          paddingBottom: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          borderBottom: `0.0625rem solid ${HAIRLINE}`,
          background: CREAM,
        }}>
          <Link href="/atrium" className="mp-set-back" style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            minHeight: "2.75rem",
            textDecoration: "none", color: MUTED,
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            transition: "color .2s",
          }}>
            <span style={{ fontSize: "1.125rem" }} aria-hidden="true">{"\u2190"}</span>
            {tc("backToPalace")}
          </Link>
          <div style={{ width: "0.0625rem", height: "1.25rem", background: HAIRLINE }} />
          <h1 style={{
            fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600,
            color: INK, margin: 0, lineHeight: 1.15,
          }}>
            {tc("settings")}
          </h1>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: "0.625rem", color: MUTED, opacity: 0.5 }}>v0610a</span>
        </header>
      )}

      {stacked ? (
        /* ── Stacked layout: tab bar on top + content below (phones + iPad portrait) ── */
        <div style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: 1100,
          margin: "0 auto",
        }}>
          {/* Horizontal scrollable tab bar */}
          <nav aria-label={tc("settingsNavigation")} style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            overflowX: "auto",
            whiteSpace: "nowrap",
            borderBottom: `0.0625rem solid ${HAIRLINE}`,
            background: CREAM,
            padding: "0.25rem 0.5rem",
            paddingTop: "calc(0.25rem + env(safe-area-inset-top, 0px))",
            WebkitOverflowScrolling: "touch",
          }}>
            {/* Quiet back-to-Me door — the settings world continues the Me page */}
            <Link href="/me" className="mp-set-back" style={{
              display: "inline-flex", alignItems: "center", gap: "0.375rem",
              minHeight: "2.75rem",
              padding: "0.625rem 0.875rem",
              borderRadius: "0.625rem",
              textDecoration: "none",
              color: MUTED,
              fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
              transition: "color .15s",
            }}>
              <span aria-hidden="true">{"←"}</span>
              {meLabel}
            </Link>
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className="mp-set-tab" style={{
                  display: "inline-flex", alignItems: "center", gap: "0.375rem",
                  minHeight: "2.75rem",
                  padding: "0.625rem 1rem",
                  borderRadius: "0.625rem",
                  textDecoration: "none",
                  background: isActive ? "rgba(154,79,42,0.07)" : "transparent",
                  color: isActive ? EMBER : INK,
                  fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: isActive ? 600 : 500,
                  transition: "all .15s",
                }}>
                  <SettingsIcon name={item.iconKey} size={16} />
                  {tc(item.labelKey)}
                </Link>
              );
            })}
            {/* Sign Out button – last item in tab bar on mobile */}
            <button
              onClick={handleSignOut}
              className="mp-set-tab"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.375rem",
                minHeight: "2.75rem",
                padding: "0.625rem 1rem",
                borderRadius: "0.625rem",
                border: "none",
                background: "transparent",
                color: MUTED,
                fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                cursor: "pointer",
                transition: "all .15s",
              }}
            >
              <SettingsIcon name="signOut" size={16} />
              {tc("signOut")}
            </button>
          </nav>

          {/* Content */}
          <section className="mp-settings-mobile-content" style={{ flex: 1, minWidth: 0, padding: "1.25rem 1rem 2rem" }}>
            {children}
          </section>
        </div>
      ) : (
        /* ── Desktop layout: sidebar + content side-by-side (unchanged) ── */
        <div style={{
          display: "flex",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "2rem 1.75rem",
          gap: "2rem",
        }}>
          {/* Sidebar */}
          <nav aria-label={tc("settingsNavigation")} style={{
            width: "13.75rem",
            flexShrink: 0,
            alignSelf: "flex-start",
          }}>
            {/* Quiet back-to-Me door — the settings world continues the Me page */}
            <Link href="/me" className="mp-set-back" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              minHeight: "2.75rem",
              padding: "0.25rem 0.5rem",
              marginBottom: "0.375rem",
              textDecoration: "none",
              color: MUTED,
              fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
              transition: "color .15s",
            }}>
              <span aria-hidden="true">{"←"}</span>
              {meLabel}
            </Link>
            <div style={{
              background: "#FFFFFF",
              borderRadius: "1rem",
              border: `0.0625rem solid ${HAIRLINE}`,
              boxShadow: `${SHADOW[1]}, ${TOP_HIGHLIGHT}`,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}>
              {filteredItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className="mp-set-door" style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    minHeight: "3rem",
                    padding: "0.75rem 1rem",
                    textDecoration: "none",
                    background: isActive ? "rgba(154,79,42,0.07)" : "transparent",
                    boxShadow: isActive ? `inset 0.1875rem 0 0 ${EMBER}` : "none",
                    borderBottom: `0.0625rem solid ${HAIRLINE}`,
                    color: isActive ? EMBER : INK,
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: isActive ? 600 : 500,
                    transition: "all .15s",
                  }}>
                    <span style={{ color: isActive ? EMBER : EMBER_GLYPH, display: "inline-flex", flexShrink: 0 }}>
                      <SettingsIcon name={item.iconKey} size={16} />
                    </span>
                    <span style={{ flex: 1 }}>{tc(item.labelKey)}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                );
              })}
              {/* Sign Out button – bottom of sidebar on desktop */}
              <div style={{ flex: 1 }} />
              <button
                onClick={handleSignOut}
                className="mp-set-door"
                style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  minHeight: "3rem",
                  padding: "0.75rem 1rem",
                  border: "none",
                  background: "transparent",
                  color: MUTED,
                  fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                  cursor: "pointer",
                  transition: "all .15s",
                  width: "100%",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "inline-flex", flexShrink: 0 }}>
                  <SettingsIcon name="signOut" size={16} />
                </span>
                <span style={{ flex: 1 }}>{tc("signOut")}</span>
              </button>
            </div>
          </nav>

          {/* Content */}
          <section style={{ flex: 1, minWidth: 0 }}>
            {children}
          </section>
        </div>
      )}
      {/* Canon hover / pressed / focus states (hover only where hover exists) */}
      <style>{`
        @media (hover: hover) {
          .mp-set-door:hover { background: rgba(154,79,42,0.07) !important; }
          .mp-set-tab:hover { background: rgba(154,79,42,0.07) !important; }
          .mp-set-back:hover { color: ${EMBER} !important; }
        }
        .mp-set-door:active, .mp-set-tab:active { background: rgba(154,79,42,0.12) !important; }
        .mp-set-door:focus-visible, .mp-set-tab:focus-visible, .mp-set-back:focus-visible {
          outline: 0.1875rem solid #D4AF37;
          outline-offset: -0.1875rem;
        }
      `}</style>
      {/* Mobile-specific style overrides — tighter cards, full-width buttons, 16px inputs */}
      {isMobile && (
        <style>{`
          .mp-settings-mobile-content > div > div[style*="border-radius: 1rem"],
          .mp-settings-mobile-content > div > div[style*="borderRadius: \"1rem\""] {
            padding: 1.125rem 1rem !important;
            border-radius: 0.875rem !important;
            margin-bottom: 1rem !important;
            box-shadow: none !important;
          }
          .mp-settings-mobile-content input[type="text"],
          .mp-settings-mobile-content input[type="email"],
          .mp-settings-mobile-content textarea {
            font-size: 1rem !important;
            padding: 0.875rem 1rem !important;
          }
          .mp-settings-mobile-content button:not([role="switch"]) {
            min-height: 2.75rem;
          }
        `}</style>
      )}
      {/* Settings tutorial overlay (auto first visit + manual help button) */}
      <SettingsTutorial open={tourOpen} onClose={() => setTourOpen(false)} />
      {/* Mobile bottom nav bar — "Me" tab highlighted */}
      {isMobile && (
        <NavigationBar
          currentMode={navMode}
          onModeChange={(mode) => { setNavMode(mode); settingsRouter.push(mode === "3d" ? "/palace" : `/${mode}`); }}
          onNotifications={() => settingsRouter.push("/atrium?notifications=1")}
          isMobile={true}
          activeTab="me"
        />
      )}
    </div>
    </>
  );
}
