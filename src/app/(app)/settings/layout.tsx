"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";
import { isNative } from "@/lib/native/platform";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { signOut } from "@/lib/auth/actions";

const NAV_ITEMS = [
  { href: "/settings/profile", label: "Profile", icon: "\u{1F464}" },
  { href: "/settings/family", label: "Family", icon: "\u{1F46A}" },
  { href: "/settings/subscription", label: "Subscription", icon: "\u{2B50}", hideInNative: true },
  { href: "/settings/connections", label: "Connections", icon: "\u{1F517}" },
  { href: "/settings/notifications", label: "Notifications", icon: "\u{1F514}" },
  { href: "/settings/legacy", label: "Legacy", icon: "\u{1F3DB}\u{FE0F}" },
  { href: "/security", label: "Security & Privacy", icon: "\u{1F6E1}\u{FE0F}", external: true },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const filteredItems = NAV_ITEMS.filter((item) => !("hideInNative" in item && item.hideInNative && isNative()));

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
    }}>
      {/* Top bar */}
      <header style={{
        padding: isMobile ? "12px 16px" : "16px 28px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        borderBottom: `1px solid ${T.color.cream}`,
        background: `${T.color.linen}e0`,
        backdropFilter: "blur(12px)",
      }}>
        <Link href="/palace" style={{
          display: "flex", alignItems: "center", gap: 8,
          textDecoration: "none", color: T.color.muted,
          fontFamily: T.font.body,
          fontSize: isMobile ? 15 : 13,
          minHeight: isMobile ? 44 : undefined,
          transition: "color .2s",
        }}>
          <span style={{ fontSize: isMobile ? 20 : 18 }}>{"\u2190"}</span>
          Back to Palace
        </Link>
        <div style={{ width: 1, height: 20, background: T.color.cream }} />
        <h1 style={{
          fontFamily: T.font.display, fontSize: 22, fontWeight: 500,
          color: T.color.charcoal, margin: 0,
        }}>
          Settings
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
          <nav style={{
            overflowX: "auto",
            whiteSpace: "nowrap",
            borderBottom: `1px solid ${T.color.cream}`,
            background: T.color.white,
            padding: "4px 8px",
            WebkitOverflowScrolling: "touch",
          }}>
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  minHeight: 44,
                  padding: "10px 16px",
                  borderRadius: 10,
                  textDecoration: "none",
                  background: isActive ? `${T.color.terracotta}10` : "transparent",
                  color: isActive ? T.color.terracotta : T.color.charcoal,
                  fontFamily: T.font.body, fontSize: 14, fontWeight: isActive ? 600 : 400,
                  transition: "all .15s",
                }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            {/* Sign Out button – last item in tab bar on mobile */}
            <button
              onClick={() => signOut()}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                minHeight: 44,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: "transparent",
                color: T.color.muted,
                fontFamily: T.font.body, fontSize: 14, fontWeight: 400,
                cursor: "pointer",
                transition: "all .15s",
              }}
            >
              <span style={{ fontSize: 16 }}>{"\u{1F6AA}"}</span>
              Sign Out
            </button>
          </nav>

          {/* Content */}
          <main style={{ flex: 1, minWidth: 0, padding: "16px 12px" }}>
            {children}
          </main>
        </div>
      ) : (
        /* ── Desktop layout: sidebar + content side-by-side (unchanged) ── */
        <div style={{
          display: "flex",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 28px",
          gap: 32,
        }}>
          {/* Sidebar */}
          <nav style={{
            width: 220,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{
              background: T.color.white,
              borderRadius: 16,
              border: `1px solid ${T.color.cream}`,
              padding: 8,
              boxShadow: "0 2px 8px rgba(44,44,42,.04)",
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}>
              {filteredItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 14px", borderRadius: 10,
                    textDecoration: "none",
                    background: isActive ? `${T.color.terracotta}10` : "transparent",
                    color: isActive ? T.color.terracotta : T.color.charcoal,
                    fontFamily: T.font.body, fontSize: 14, fontWeight: isActive ? 600 : 400,
                    transition: "all .15s",
                  }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
              {/* Sign Out button – bottom of sidebar on desktop */}
              <div style={{ flex: 1 }} />
              <button
                onClick={() => signOut()}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  color: T.color.muted,
                  fontFamily: T.font.body, fontSize: 14, fontWeight: 400,
                  cursor: "pointer",
                  transition: "all .15s",
                  width: "100%",
                  marginTop: 4,
                }}
              >
                <span style={{ fontSize: 16 }}>{"\u{1F6AA}"}</span>
                Sign Out
              </button>
            </div>
          </nav>

          {/* Content */}
          <main style={{ flex: 1, minWidth: 0 }}>
            {children}
          </main>
        </div>
      )}
    </div>
  );
}
