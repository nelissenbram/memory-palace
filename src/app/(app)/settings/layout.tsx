"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { isNative } from "@/lib/native/platform";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { signOut } from "@/lib/auth/actions";
import { useAccessibility } from "@/components/providers/AccessibilityProvider";
import { useTranslation } from "@/lib/hooks/useTranslation";

const NAV_ITEMS = [
  { href: "/settings/profile", labelKey: "profile", icon: "\u{1F464}" },
  { href: "/settings/family", labelKey: "family", icon: "\u{1F46A}" },
  { href: "/settings/subscription", labelKey: "subscription", icon: "\u{2B50}", hideInNative: true },
  { href: "/settings/connections", labelKey: "connections", icon: "\u{1F517}" },
  { href: "/settings/notifications", labelKey: "notifications", icon: "\u{1F514}" },
  { href: "/settings/legacy", labelKey: "legacy", icon: "\u{1F3DB}\u{FE0F}" },
  { href: "/security", labelKey: "security", icon: "\u{1F6E1}\u{FE0F}", external: true },
] as const;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { scale } = useAccessibility();
  const { t: tc } = useTranslation("common");

  const filteredItems = NAV_ITEMS.filter((item) => !("hideInNative" in item && item.hideInNative && isNative()));

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
    }}>
      {/* Top bar */}
      <header style={{
        padding: isMobile ? "0.75rem 1rem" : "1rem 1.75rem",
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
          fontSize: isMobile ? "0.9375rem" : "0.8125rem",
          minHeight: isMobile ? "2.75rem" : undefined,
          transition: "color .2s",
        }}>
          <span style={{ fontSize: isMobile ? "1.25rem" : "1.125rem" }}>{"\u2190"}</span>
          {tc("backToPalace")}
        </Link>
        <div style={{ width: 1, height: "1.25rem", background: T.color.cream }} />
        <h1 style={{
          fontFamily: T.font.display, fontSize: `${1.375 * scale}rem`, fontWeight: 500,
          color: T.color.charcoal, margin: 0,
        }}>
          {tc("settings")}
        </h1>
      </header>

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
                  <span style={{ fontSize: "1rem" }}>{item.icon}</span>
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
                fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 400,
                cursor: "pointer",
                transition: "all .15s",
              }}
            >
              <span style={{ fontSize: "1rem" }}>{"\u{1F6AA}"}</span>
              {tc("signOut")}
            </button>
          </nav>

          {/* Content */}
          <section style={{ flex: 1, minWidth: 0, padding: "1rem 0.75rem" }}>
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
                    <span style={{ fontSize: "1rem" }}>{item.icon}</span>
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
                  fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 400,
                  cursor: "pointer",
                  transition: "all .15s",
                  width: "100%",
                  marginTop: "0.25rem",
                }}
              >
                <span style={{ fontSize: "1rem" }}>{"\u{1F6AA}"}</span>
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
    </div>
  );
}
