"use client";

import { useState, lazy, Suspense, memo } from "react";
import { T } from "@/lib/theme";
import { isNative } from "@/lib/native/platform";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useSignOut } from "@/lib/hooks/useSignOut";
import SignOutOverlay from "@/components/ui/SignOutOverlay";
import { useAccessibility } from "@/components/providers/AccessibilityProvider";
import { useTranslation } from "@/lib/hooks/useTranslation";
import SettingsTutorial, { useSettingsTutorial } from "@/components/ui/SettingsTutorial";

/* ── Lazy-loaded settings pages ── */
const ProfilePage = lazy(() => import("@/app/(app)/settings/profile/page"));
const FamilyPage = lazy(() => import("@/app/(app)/settings/family/page"));
const SubscriptionPage = lazy(() => import("@/app/(app)/settings/subscription/page"));
const ConnectionsPage = lazy(() => import("@/app/(app)/settings/connections/page"));
const NotificationsSettingsPage = lazy(() => import("@/app/(app)/settings/notifications/page"));
const LegacyPage = lazy(() => import("@/app/(app)/settings/legacy/page"));
const SecurityPage = lazy(() => import("@/app/(app)/settings/security/page"));
const CookiesPage = lazy(() => import("@/app/(app)/settings/cookies/page"));

type SettingsTab = "profile" | "family" | "subscription" | "connections" | "notifications" | "legacy" | "security" | "cookies";

function SettingsIcon({ name, size = 16 }: { name: string; size?: number }) {
  const s = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "profile": return <svg {...s}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    case "family": return <svg {...s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>;
    case "subscription": return <svg {...s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
    case "connections": return <svg {...s}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>;
    case "notifications": return <svg {...s}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>;
    case "legacy": return <svg {...s}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
    case "security": return <svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    case "cookies": return <svg {...s}><circle cx="12" cy="12" r="9" /><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="14" cy="8.5" r="0.75" fill="currentColor" stroke="none" /><circle cx="10.5" cy="14.5" r="0.9" fill="currentColor" stroke="none" /><circle cx="15" cy="13.5" r="1" fill="currentColor" stroke="none" /></svg>;
    case "signOut": return <svg {...s}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
    default: return null;
  }
}

const NAV_ITEMS: { tab: SettingsTab; labelKey: string; iconKey: string; hideInNative?: boolean }[] = [
  { tab: "profile", labelKey: "profile", iconKey: "profile" },
  { tab: "family", labelKey: "family", iconKey: "family" },
  { tab: "subscription", labelKey: "subscription", iconKey: "subscription", hideInNative: true },
  { tab: "connections", labelKey: "connections", iconKey: "connections" },
  { tab: "notifications", labelKey: "alerts", iconKey: "notifications" },
  { tab: "legacy", labelKey: "legacy", iconKey: "legacy" },
  { tab: "security", labelKey: "security", iconKey: "security" },
  { tab: "cookies", labelKey: "cookies", iconKey: "cookies" },
];

const PAGE_MAP: Record<SettingsTab, React.LazyExoticComponent<any>> = {
  profile: ProfilePage,
  family: FamilyPage,
  subscription: SubscriptionPage,
  connections: ConnectionsPage,
  notifications: NotificationsSettingsPage,
  legacy: LegacyPage,
  security: SecurityPage,
  cookies: CookiesPage,
};

const fallback = (
  <div style={{ padding: "2rem", textAlign: "center", color: T.color.muted, fontFamily: T.font.body, fontSize: "0.875rem" }}>
    Loading...
  </div>
);

function SettingsInline() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const isMobile = useIsMobile();
  const { signingOut, handleSignOut } = useSignOut();
  const { scale } = useAccessibility();
  const { t: tc } = useTranslation("common");
  const [tourOpen, setTourOpen] = useSettingsTutorial();

  const filteredItems = NAV_ITEMS.filter((item) => !(item.hideInNative && isNative()));
  const ActivePage = PAGE_MAP[activeTab];

  return (
    <>
    {signingOut && <SignOutOverlay />}
    <div style={{
      position: "fixed",
      inset: 0,
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      paddingTop: isMobile ? undefined : "3.5rem",
      background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
      paddingBottom: isMobile ? "calc(4.5rem + env(safe-area-inset-bottom, 0px))" : "2rem",
      zIndex: 1,
    }}>
      {/* Mobile: horizontal scrollable tab bar */}
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1100, margin: "0 auto" }}>
          <nav data-mp-settings-tabs aria-label={tc("settingsNavigation")} style={{
            position: "sticky", top: 0, zIndex: 10,
            overflowX: "auto", whiteSpace: "nowrap",
            borderBottom: `1px solid ${T.color.cream}`,
            background: T.color.white,
            padding: "0.25rem 0.5rem",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}>
            <style>{`.settings-tabs::-webkit-scrollbar{display:none}`}</style>
            {filteredItems.map((item) => {
              const isActive = item.tab === activeTab;
              return (
                <button
                  key={item.tab}
                  onClick={() => setActiveTab(item.tab)}
                  aria-current={isActive ? "page" : undefined}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.375rem",
                    minHeight: "2.75rem",
                    padding: "0.625rem 1rem",
                    borderRadius: "0.625rem",
                    border: "none",
                    textDecoration: "none",
                    background: isActive ? `${T.color.terracotta}10` : "transparent",
                    color: isActive ? T.color.terracotta : T.color.charcoal,
                    fontFamily: T.font.body, fontSize: `${0.875 * scale}rem`, fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                >
                  <SettingsIcon name={item.iconKey} size={16} />
                  {tc(item.labelKey)}
                </button>
              );
            })}
            <button
              onClick={handleSignOut}
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
          <section style={{ flex: 1, minWidth: 0, padding: "1rem 0.75rem" }}>
            <Suspense fallback={fallback}><ActivePage /></Suspense>
          </section>
        </div>
      ) : (
        /* Desktop: sidebar + content */
        <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto", padding: "2rem 1.75rem", gap: "2rem" }}>
          <nav data-mp-settings-tabs aria-label={tc("settingsNavigation")} style={{ width: "13.75rem", flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <div style={{
              background: T.color.white, borderRadius: "1rem",
              border: `1px solid ${T.color.cream}`, padding: "0.5rem",
              boxShadow: "0 2px 8px rgba(44,44,42,.04)",
              display: "flex", flexDirection: "column", flex: 1,
            }}>
              {filteredItems.map((item) => {
                const isActive = item.tab === activeTab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => setActiveTab(item.tab)}
                    aria-current={isActive ? "page" : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.625rem",
                      padding: "0.75rem 0.875rem", borderRadius: "0.625rem",
                      border: "none", width: "100%", textAlign: "left",
                      background: isActive ? `${T.color.terracotta}10` : "transparent",
                      color: isActive ? T.color.terracotta : T.color.charcoal,
                      fontFamily: T.font.body, fontSize: `${0.875 * scale}rem`, fontWeight: isActive ? 600 : 400,
                      cursor: "pointer",
                      transition: "all .15s",
                    }}
                  >
                    <SettingsIcon name={item.iconKey} size={16} />
                    {tc(item.labelKey)}
                  </button>
                );
              })}
              <div style={{ flex: 1 }} />
              <button
                onClick={handleSignOut}
                style={{
                  display: "flex", alignItems: "center", gap: "0.625rem",
                  padding: "0.75rem 0.875rem", borderRadius: "0.625rem",
                  border: "none", width: "100%", textAlign: "left",
                  background: "transparent",
                  color: T.color.muted,
                  fontFamily: T.font.body, fontSize: `${0.875 * scale}rem`, fontWeight: 400,
                  cursor: "pointer",
                  transition: "all .15s",
                  marginTop: "0.25rem",
                }}
              >
                <SettingsIcon name="signOut" size={16} />
                {tc("signOut")}
              </button>
            </div>
          </nav>
          <section style={{ flex: 1, minWidth: 0 }}>
            <Suspense fallback={fallback}><ActivePage /></Suspense>
          </section>
        </div>
      )}
      <SettingsTutorial open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
    </>
  );
}

export default memo(SettingsInline);
