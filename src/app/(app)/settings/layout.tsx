"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { isNative } from "@/lib/native/platform";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { signOut } from "@/lib/auth/actions";
import { useAccessibility } from "@/components/providers/AccessibilityProvider";
import { useTranslation } from "@/lib/hooks/useTranslation";
import NavigationBar from "@/components/ui/NavigationBar";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import SettingsTutorial, { useSettingsTutorial } from "@/components/ui/SettingsTutorial";

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

const NAV_ITEMS = [
  { href: "/settings/profile", labelKey: "profile", iconKey: "profile" },
  { href: "/settings/family", labelKey: "family", iconKey: "family" },
  { href: "/settings/subscription", labelKey: "subscription", iconKey: "subscription", hideInNative: true },
  { href: "/settings/connections", labelKey: "connections", iconKey: "connections" },
  { href: "/settings/notifications", labelKey: "notifications", iconKey: "notifications" },
  { href: "/settings/legacy", labelKey: "legacy", iconKey: "legacy" },
  { href: "/settings/security", labelKey: "security", iconKey: "security" },
  { href: "/settings/cookies", labelKey: "cookies", iconKey: "cookies" },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { scale } = useAccessibility();
  const { t: tc } = useTranslation("common");

  const settingsRouter = useRouter();
  const filteredItems = NAV_ITEMS.filter((item) => !("hideInNative" in item && item.hideInNative && isNative()));
  const navMode = usePalaceStore((s) => s.navMode);
  const setNavMode = usePalaceStore((s) => s.setNavMode);
  const [tourOpen, setTourOpen] = useSettingsTutorial();

  return (
    <div style={{
      minHeight: "100vh",
      paddingBottom: isMobile ? "calc(3.5rem + env(safe-area-inset-bottom, 0px))" : undefined,
      background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
    }}>
      {/* Top bar — desktop only (mobile uses bottom NavigationBar) */}
      {!isMobile && (
        <header style={{
          padding: "1rem 1.75rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          borderBottom: `1px solid ${T.color.cream}`,
          background: `${T.color.linen}e0`,
          backdropFilter: "blur(12px)",
        }}>
          <Link href="/palace" style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            textDecoration: "none", color: T.color.muted,
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            transition: "color .2s",
          }}>
            <span style={{ fontSize: "1.125rem" }}>{"\u2190"}</span>
            {tc("backToPalace")}
          </Link>
          <div style={{ width: 1, height: "1.25rem", background: T.color.cream }} />
          <h1 style={{
            fontFamily: T.font.display, fontSize: `${1.375 * scale}rem`, fontWeight: 500,
            color: T.color.charcoal, margin: 0,
          }}>
            {tc("settings")}
          </h1>
          <div style={{ flex: 1 }} />
        </header>
      )}

      {isMobile ? (
        /* ── Mobile layout: tab bar on top + content below ── */
        <div style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: 1100,
          margin: "0 auto",
        }}>
          {/* Horizontal scrollable tab bar */}
          <nav aria-label={tc("settingsNavigation")} style={{
            overflowX: "auto",
            whiteSpace: "nowrap",
            borderBottom: `1px solid ${T.color.cream}`,
            background: T.color.white,
            padding: "0.25rem 0.5rem",
            WebkitOverflowScrolling: "touch",
          }}>
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} style={{
                  display: "inline-flex", alignItems: "center", gap: "0.375rem",
                  minHeight: "2.75rem",
                  padding: "0.625rem 1rem",
                  borderRadius: "0.625rem",
                  textDecoration: "none",
                  background: isActive ? `${T.color.terracotta}10` : "transparent",
                  color: isActive ? T.color.terracotta : T.color.charcoal,
                  fontFamily: T.font.body, fontSize: `${0.875 * scale}rem`, fontWeight: isActive ? 600 : 400,
                  transition: "all .15s",
                }}>
                  <SettingsIcon name={item.iconKey} size={16} />
                  {tc(item.labelKey)}
                </Link>
              );
            })}
            {/* Sign Out button – last item in tab bar on mobile */}
            <button
              onClick={() => signOut()}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.375rem",
                minHeight: "2.75rem",
                padding: "0.625rem 1rem",
                borderRadius: "0.625rem",
                border: "none",
                background: "transparent",
                color: T.color.muted,
                fontFamily: T.font.body, fontSize: `${0.875 * scale}rem`, fontWeight: 400,
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
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{
              background: T.color.white,
              borderRadius: "1rem",
              border: `1px solid ${T.color.cream}`,
              padding: "0.5rem",
              boxShadow: "0 2px 8px rgba(44,44,42,.04)",
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}>
              {filteredItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} aria-current={isActive ? "page" : undefined} style={{
                    display: "flex", alignItems: "center", gap: "0.625rem",
                    padding: "0.75rem 0.875rem", borderRadius: "0.625rem",
                    textDecoration: "none",
                    background: isActive ? `${T.color.terracotta}10` : "transparent",
                    color: isActive ? T.color.terracotta : T.color.charcoal,
                    fontFamily: T.font.body, fontSize: `${0.875 * scale}rem`, fontWeight: isActive ? 600 : 400,
                    transition: "all .15s",
                  }}>
                    <SettingsIcon name={item.iconKey} size={16} />
                    {tc(item.labelKey)}
                  </Link>
                );
              })}
              {/* Sign Out button – bottom of sidebar on desktop */}
              <div style={{ flex: 1 }} />
              <button
                onClick={() => signOut()}
                style={{
                  display: "flex", alignItems: "center", gap: "0.625rem",
                  padding: "0.75rem 0.875rem", borderRadius: "0.625rem",
                  border: "none",
                  background: "transparent",
                  color: T.color.muted,
                  fontFamily: T.font.body, fontSize: `${0.875 * scale}rem`, fontWeight: 400,
                  cursor: "pointer",
                  transition: "all .15s",
                  width: "100%",
                  marginTop: "0.25rem",
                }}
              >
                <SettingsIcon name="signOut" size={16} />
                {tc("signOut")}
              </button>
            </div>
          </nav>

          {/* Content */}
          <section style={{ flex: 1, minWidth: 0 }}>
            {children}
          </section>
        </div>
      )}
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
          .mp-settings-mobile-content button {
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
          onModeChange={(mode) => { setNavMode(mode); settingsRouter.push(`/palace?mode=${mode}`); }}
          onNotifications={() => settingsRouter.push("/palace?notifications=1")}
          isMobile={true}
          activeTab="me"
        />
      )}
    </div>
  );
}
