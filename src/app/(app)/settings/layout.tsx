"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { T } from "@/lib/theme";

const NAV_ITEMS = [
  { href: "/settings/profile", label: "Profile", icon: "\u{1F464}" },
  { href: "/settings/subscription", label: "Subscription", icon: "\u{2B50}" },
  { href: "/settings/connections", label: "Connections", icon: "\u{1F517}" },
  { href: "/settings/notifications", label: "Notifications", icon: "\u{1F514}" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
    }}>
      {/* Top bar */}
      <header style={{
        padding: "16px 28px",
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
          fontFamily: T.font.body, fontSize: 13,
          transition: "color .2s",
        }}>
          <span style={{ fontSize: 18 }}>{"\u2190"}</span>
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
        }}>
          <div style={{
            background: T.color.white,
            borderRadius: 16,
            border: `1px solid ${T.color.cream}`,
            padding: 8,
            boxShadow: "0 2px 8px rgba(44,44,42,.04)",
          }}>
            {NAV_ITEMS.map((item) => {
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
          </div>
        </nav>

        {/* Content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
