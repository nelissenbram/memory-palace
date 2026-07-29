"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { isIOS } from "@/lib/native/platform";
import { IAP_ENABLED } from "@/lib/native/iap-flags";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import { useSignOut } from "@/lib/hooks/useSignOut";
import SignOutOverlay from "@/components/ui/SignOutOverlay";
import { useTranslation } from "@/lib/hooks/useTranslation";
import NavigationBar from "@/components/ui/NavigationBar";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import SettingsTutorial, { useSettingsTutorial } from "@/components/ui/SettingsTutorial";
import { CREAM, INK, MUTED, EMBER, EMBER_GLYPH, HAIRLINE, GOLD, SHADOW, TOP_HIGHLIGHT } from "@/lib/libraryTokens";

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
  { href: "/settings/profile", labelKey: "profile", iconKey: "profile", descKey: "navDescProfile", descFallback: "Your name, photo and public page" },
  { href: "/settings/family", labelKey: "family", iconKey: "family", descKey: "navDescFamily", descFallback: "The people you build the palace with" },
  // iOS is free-tier only (Apple 3.1.1) — hide the Subscription tab and its
  // link to the billing/plan page inside the native app.
  { href: "/settings/subscription", labelKey: "subscription", iconKey: "subscription", hideInNative: true, descKey: "navDescSubscription", descFallback: "Your plan and billing" },
  { href: "/settings/sharing", labelKey: "sharingSettings", iconKey: "sharing", descKey: "navDescSharing", descFallback: "Who can see your wings" },
  { href: "/settings/notifications", labelKey: "alerts", iconKey: "notifications", descKey: "navDescNotifications", descFallback: "Emails and gentle reminders" },
  { href: "/settings/legacy", labelKey: "legacy", iconKey: "legacy", descKey: "navDescLegacy", descFallback: "What becomes of your palace one day" },
  { href: "/settings/security", labelKey: "security", iconKey: "security", descKey: "navDescSecurity", descFallback: "Password, privacy and your data" },
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
  const { t: ts } = useTranslation("settings");
  const navDesc = (item: { descKey: string; descFallback: string }) => {
    const v = ts(item.descKey);
    return v !== item.descKey ? v : item.descFallback;
  };

  const settingsRouter = useRouter();
  // hideInNative items (Subscription) stay hidden on iOS UNLESS IAP is live —
  // then the subscription tab shows so users can reach the IAP paywall / manage
  // their subscription. Android has no IAP, so isIOS() keeps it hidden there.
  const filteredItems = NAV_ITEMS.filter((item) => !("hideInNative" in item && item.hideInNative && isIOS() && !IAP_ENABLED));
  const navMode = usePalaceStore((s) => s.navMode);
  const setNavMode = usePalaceStore((s) => s.setNavMode);
  const [tourOpen, setTourOpen] = useSettingsTutorial();

  // Auto-scroll the active tab into view on the stacked (mobile/iPad) tab bar so
  // overflow items past the active one are never silently hidden. Honour
  // reduced-motion by falling back to an instant scroll.
  const stackedNavRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!stacked) return;
    const nav = stackedNavRef.current;
    if (!nav) return;
    const active = nav.querySelector('[aria-current="page"]') as HTMLElement | null;
    if (!active) return;
    const reduce = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    active.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [pathname, stacked]);

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
      {/* No page-title header and no back button — the NavigationBar (Me tab)
          is the nav; each sub-page carries its own title. */}

      {stacked ? (
        /* ── Stacked layout: tab bar on top + content below (phones + iPad portrait) ── */
        <div style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: "68.75rem",
          margin: "0 auto",
        }}>
          {/* Horizontal scrollable tab bar */}
          <nav ref={stackedNavRef} aria-label={tc("settingsNavigation")} data-mp-settings-tabs style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            overflowX: "auto",
            whiteSpace: "nowrap",
            scrollSnapType: "x proximity",
            borderBottom: `0.0625rem solid ${HAIRLINE}`,
            background: CREAM,
            padding: "0.25rem 0.5rem",
            paddingTop: "calc(0.25rem + env(safe-area-inset-top, 0px))",
            WebkitOverflowScrolling: "touch",
          }}>
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className="mp-set-tab" style={{
                  display: "inline-flex", alignItems: "center", gap: "0.4rem",
                  minHeight: "2.75rem",
                  padding: "0.5rem 1rem",
                  margin: "0.25rem 0.125rem",
                  scrollSnapAlign: "center",
                  scrollMargin: "0.5rem",
                  borderRadius: "1.5rem",
                  textDecoration: "none",
                  background: isActive ? EMBER : "transparent",
                  border: `0.0625rem solid ${isActive ? EMBER : HAIRLINE}`,
                  color: isActive ? CREAM : INK,
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
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              aria-busy={signingOut}
              className="mp-set-tab"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                minHeight: "2.75rem",
                padding: "0.5rem 1rem",
                margin: "0.25rem 0.125rem",
                borderRadius: "1.5rem",
                border: `0.0625rem solid ${HAIRLINE}`,
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
        /* ── Desktop layout: premium sidebar + content side-by-side ── */
        <div style={{
          display: "flex",
          maxWidth: "73.75rem",
          margin: "0 auto",
          padding: "2.25rem 1.75rem 3rem",
          gap: "2.5rem",
        }}>
          {/* Sidebar — a designed nav, not a plain list: icon medallions,
              one-line descriptions, warm active state. */}
          <nav aria-label={tc("settingsNavigation")} data-mp-settings-tabs style={{
            width: "19rem",
            flexShrink: 0,
            alignSelf: "flex-start",
            position: "sticky",
            top: "5rem",
          }}>
            <div style={{
              background: "#FFFFFF",
              borderRadius: "1.25rem",
              border: `0.0625rem solid ${HAIRLINE}`,
              boxShadow: `${SHADOW[1]}, ${TOP_HIGHLIGHT}`,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              padding: "0.5rem",
              gap: "0.125rem",
            }}>
              {filteredItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} className="mp-set-door" style={{
                    position: "relative",
                    display: "flex", alignItems: "center", gap: "0.875rem",
                    minHeight: "3.5rem",
                    padding: "0.625rem 0.75rem",
                    borderRadius: "0.875rem",
                    textDecoration: "none",
                    background: isActive ? "rgba(184,92,56,0.08)" : "transparent",
                    transition: "background .15s",
                  }}>
                    {/* Active left rule */}
                    {isActive && (
                      <span aria-hidden="true" style={{
                        position: "absolute", left: 0, top: "0.75rem", bottom: "0.75rem",
                        width: "0.1875rem", borderRadius: "0 0.1875rem 0.1875rem 0",
                        background: EMBER,
                      }} />
                    )}
                    {/* Icon medallion */}
                    <span aria-hidden="true" style={{
                      width: "2.25rem", height: "2.25rem", borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isActive ? EMBER : "rgba(184,92,56,0.09)",
                      color: isActive ? CREAM : EMBER_GLYPH,
                      boxShadow: isActive ? "inset 0 0.0625rem 0 rgba(255,255,255,0.25)" : "none",
                      transition: "background .15s, color .15s",
                    }}>
                      <SettingsIcon name={item.iconKey} size={17} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        display: "block",
                        fontFamily: T.font.body, fontSize: "0.9375rem",
                        fontWeight: 600,
                        color: isActive ? EMBER : INK,
                        lineHeight: 1.2,
                      }}>{tc(item.labelKey)}</span>
                      <span title={navDesc(item)} style={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        fontFamily: T.font.body, fontSize: "0.75rem",
                        color: MUTED, marginTop: "0.125rem", lineHeight: 1.3,
                        overflow: "hidden", textOverflow: "ellipsis",
                      }}>{navDesc(item)}</span>
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isActive ? EMBER : HAIRLINE} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                );
              })}
              {/* Divider + Sign Out */}
              <div style={{ height: "0.0625rem", background: HAIRLINE, margin: "0.375rem 0.75rem" }} />
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                aria-busy={signingOut}
                className="mp-set-door"
                style={{
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  minHeight: "3rem",
                  padding: "0.625rem 0.75rem",
                  borderRadius: "0.875rem",
                  border: "none",
                  background: "transparent",
                  color: MUTED,
                  cursor: "pointer",
                  transition: "background .15s",
                  width: "100%",
                  textAlign: "left",
                }}
              >
                <span aria-hidden="true" style={{
                  width: "2.25rem", height: "2.25rem", borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(113,106,94,0.10)", color: MUTED,
                }}>
                  <SettingsIcon name="signOut" size={17} />
                </span>
                <span style={{ flex: 1, fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600, color: INK }}>{tc("signOut")}</span>
              </button>
            </div>
          </nav>

          {/* Content — comfortable reading measure for a 60+ audience */}
          <section style={{ flex: 1, minWidth: 0, maxWidth: "46rem" }}>
            {children}
          </section>
        </div>
      )}
      {/* Canon hover / pressed / focus states (hover only where hover exists;
          never override an active [aria-current] ember pill/door) */}
      <style>{`
        @media (hover: hover) {
          .mp-set-door:not([aria-current="page"]):hover { background: rgba(184,92,56,0.08) !important; }
          .mp-set-tab:not([aria-current="page"]):hover { background: rgba(184,92,56,0.08) !important; border-color: rgba(184,92,56,0.4) !important; }
        }
        .mp-set-door:not([aria-current="page"]):active, .mp-set-tab:not([aria-current="page"]):active { background: rgba(184,92,56,0.14) !important; }
        .mp-set-door:focus-visible, .mp-set-tab:focus-visible {
          outline: 0.1875rem solid ${GOLD};
          outline-offset: -0.1875rem;
        }
      `}</style>
      {/* Mobile-specific style overrides — tighter cards, full-width buttons, 16px inputs */}
      {isMobile && (
        <style>{`
          .mp-settings-mobile-content > div > div[style*="border-radius:1rem"],
          .mp-settings-mobile-content > div > div[style*="border-radius: 1rem"],
          .mp-settings-mobile-content .mp-settings-card {
            padding: 1.125rem 1rem !important;
            border-radius: 0.875rem !important;
            margin-bottom: 1rem !important;
            box-shadow: none !important;
          }
          .mp-settings-mobile-content input,
          .mp-settings-mobile-content select,
          .mp-settings-mobile-content textarea {
            font-size: 1rem !important;
          }
          .mp-settings-mobile-content input:not([type="checkbox"]):not([type="radio"]),
          .mp-settings-mobile-content select {
            min-height: 2.75rem;
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
