"use client";

/**
 * MeClient — the identity-first Me landing (Explore/Me revision, change 15).
 *
 * Instagram/Airbnb 5-band anatomy on the Atrium canon:
 *   1. identity row (portrait + three stewardship stats)
 *   2. name + one-line bio
 *   3. exactly two actions: Edit profile / View my public profile
 *   4. quiet doors to the settings sub-pages
 *
 * iOS free-tier seal (Apple 3.1.1): the Subscription door is hidden in the
 * native iOS app — server-detected (isNativeIOS via mp_platform cookie / UA)
 * AND client-detected (isIOS()), mirroring hideInNative in settings/layout.tsx.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import { useSignOut } from "@/lib/hooks/useSignOut";
import SignOutOverlay from "@/components/ui/SignOutOverlay";
import NavigationBar from "@/components/ui/NavigationBar";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { isIOS } from "@/lib/native/platform";
import { CREAM, INK, MUTED, EMBER, EMBER_GLYPH, HAIRLINE, SHADOW, TOP_HIGHLIGHT } from "@/lib/libraryTokens";

interface MeProfile {
  displayName: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  email: string | null;
}

interface MeStats {
  wings: number;
  memories: number;
  visitors: number;
}

interface MeClientProps {
  profile: MeProfile;
  stats: MeStats;
  isNativeIOS?: boolean;
}

/* ── Door icons (same visual family as the settings tab icons) ── */
function DoorIcon({ name, size = 18 }: { name: string; size?: number }) {
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
    case "family":
      return (
        <svg {...s} aria-hidden="true">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      );
    case "sharing":
      return (
        <svg {...s} aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...s} aria-hidden="true">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      );
    case "legacy":
      return (
        <svg {...s} aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "security":
      return (
        <svg {...s} aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "subscription":
      return (
        <svg {...s} aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "signOut":
      return (
        <svg {...s} aria-hidden="true">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    default:
      return null;
  }
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function MeClient({ profile, stats, isNativeIOS = false }: MeClientProps) {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const router = useRouter();
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  // iPad portrait (768-1024px): the NavigationBar renders as a bottom bar there
  // (same treatment as settings/layout.tsx), so pad like mobile.
  const stacked = isMobile || isCompact;
  const { signingOut, handleSignOut } = useSignOut();
  const navMode = usePalaceStore((s) => s.navMode);
  const setNavMode = usePalaceStore((s) => s.setNavMode);
  const [avatarFailed, setAvatarFailed] = useState(false);

  // iOS free-tier seal: server signal first (no SSR flash), client check second.
  const [clientIsIOS, setClientIsIOS] = useState(false);
  useEffect(() => { setClientIsIOS(isIOS()); }, []);
  const hideSubscription = isNativeIOS || clientIsIOS;

  // i18n fallback helper — new keys work before the locale files land.
  const tf = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const displayName = profile.displayName || profile.email || "";
  const initial = (profile.displayName || profile.email || "?").trim().charAt(0).toUpperCase() || "?";
  const hasPublicPage = profile.isPublic && !!profile.username;

  const doors: { key: string; icon: string; label: string; href: string }[] = [
    { key: "family", icon: "family", label: tc("family"), href: "/settings/family" },
    { key: "sharing", icon: "sharing", label: tc("sharingSettings"), href: "/settings/sharing" },
    { key: "notifications", icon: "notifications", label: tc("alerts"), href: "/settings/notifications" },
    { key: "legacy", icon: "legacy", label: tc("legacy"), href: "/settings/legacy" },
    { key: "security", icon: "security", label: tc("security"), href: "/settings/security" },
    // iOS is free-tier only (Apple 3.1.1) — never show the Subscription door
    // (or any route toward billing/plans) inside the native app.
    ...(!hideSubscription
      ? [{ key: "subscription", icon: "subscription", label: tc("subscription"), href: "/settings/subscription" }]
      : []),
  ];

  const stewardStats: { key: string; label: string; value: number }[] = [
    { key: "wings", label: tf("meStatsWings", "Wings"), value: stats.wings },
    { key: "memories", label: tf("meStatsMemories", "Memories"), value: stats.memories },
    { key: "visitors", label: tf("meStatsVisitors", "Visitors"), value: stats.visitors },
  ];

  return (
    <>
      {signingOut && <SignOutOverlay />}
      <div style={{
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        paddingTop: stacked ? "env(safe-area-inset-top, 0px)" : "3.5rem",
        paddingBottom: stacked ? "calc(3.5rem + env(safe-area-inset-bottom, 0px))" : "2rem",
        background: CREAM,
        zIndex: 1,
      }}>
        {/* Desktop NavigationBar — "Me" tab highlighted */}
        {!isMobile && (
          <NavigationBar
            currentMode={navMode}
            onModeChange={(mode) => { setNavMode(mode); router.push(mode === "3d" ? "/palace" : `/${mode}`); }}
            onNotifications={() => router.push("/atrium?notifications=1")}
            isMobile={false}
            activeTab="me"
          />
        )}

        <div className="mp-me-board" style={{ maxWidth: "38rem", margin: "0 auto", padding: "1.5rem 1.25rem 2rem" }}>

          {/* ── BAND 1: identity row — portrait + three stewardship stats ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            {/* Portrait */}
            <div
              aria-hidden="true"
              style={{
                width: "4.5rem", height: "4.5rem", borderRadius: "50%",
                flexShrink: 0,
                background: "linear-gradient(135deg, #B85C38, #9A4F2A)",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
                color: "#FFF",
                fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 600,
              }}
            >
              {profile.avatarUrl && !avatarFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={() => setAvatarFailed(true)}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                initial
              )}
            </div>

            {/* Three stewardship stats */}
            <div style={{ flex: 1, display: "flex", justifyContent: "space-around", gap: "0.5rem" }}>
              {stewardStats.map((s) => (
                <div key={s.key} style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  minHeight: "2.75rem", minWidth: "2.75rem",
                  justifyContent: "center",
                  padding: "0.25rem 0.375rem",
                }}>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600,
                    color: INK, lineHeight: 1.15,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {s.value}
                  </span>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED,
                    marginTop: "0.125rem",
                  }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: "0.0625rem", background: HAIRLINE, margin: "1.25rem 0" }} />

          {/* ── BAND 2: name + one-line bio ── */}
          <h1 style={{
            fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600,
            color: INK, margin: 0, lineHeight: 1.15,
          }}>
            {displayName || tf("meUnnamed", "Your palace")}
          </h1>
          {profile.username && (
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, marginTop: "0.25rem",
            }}>
              @{profile.username}
            </div>
          )}
          {profile.bio && (
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", color: MUTED,
              margin: "0.5rem 0 0", lineHeight: 1.4,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {profile.bio.length > 150 ? `${profile.bio.slice(0, 150)}…` : profile.bio}
            </p>
          )}

          {/* ── BAND 3: exactly two actions ── */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
            <Link
              href="/settings/profile"
              className="mp-me-action"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                minHeight: "2.75rem", padding: "0.625rem 1.375rem",
                borderRadius: "2rem",
                border: `0.0625rem solid ${EMBER}`,
                background: "transparent",
                color: EMBER,
                fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                textDecoration: "none",
                flex: isMobile ? 1 : undefined,
              }}
            >
              {tf("meEditProfile", "Edit profile")}
            </Link>
            {hasPublicPage ? (
              <Link
                href={`/u/${profile.username}`}
                className="mp-me-action"
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minHeight: "2.75rem", padding: "0.625rem 1.375rem",
                  borderRadius: "2rem",
                  border: `0.0625rem solid ${HAIRLINE}`,
                  background: "transparent",
                  color: INK,
                  fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                  textDecoration: "none",
                  flex: isMobile ? 1 : undefined,
                }}
              >
                {tf("meViewPublicProfile", "View my public profile")}
              </Link>
            ) : (
              <Link
                href="/settings/sharing"
                className="mp-me-action"
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minHeight: "2.75rem", padding: "0.625rem 1.375rem",
                  borderRadius: "2rem",
                  border: `0.0625rem solid ${HAIRLINE}`,
                  background: "transparent",
                  color: MUTED,
                  fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                  textDecoration: "none",
                  flex: isMobile ? 1 : undefined,
                }}
              >
                {tf("mePublishPrompt", "Publish to get your public page")}
              </Link>
            )}
          </div>

          {/* ── BAND 4: quiet doors ── */}
          <div style={{ marginTop: "1.75rem" }}>
            {/* Lane header (canon overline) */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
              <span style={{
                width: "0.6rem", height: "0.6rem", borderRadius: "50%",
                background: EMBER_GLYPH, flexShrink: 0,
              }} aria-hidden="true" />
              <span style={{
                fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: EMBER_GLYPH,
              }}>
                {tc("settings")}
              </span>
              <span style={{
                flex: 1, height: "0.0625rem",
                background: `linear-gradient(90deg, ${HAIRLINE}, transparent)`,
              }} aria-hidden="true" />
            </div>

            <div style={{
              background: "#FFFFFF",
              borderRadius: "1rem",
              border: `0.0625rem solid ${HAIRLINE}`,
              boxShadow: `${SHADOW[1]}, ${TOP_HIGHLIGHT}`,
              overflow: "hidden",
            }}>
              {doors.map((door, i) => (
                <Link
                  key={door.key}
                  href={door.href}
                  className="mp-me-door"
                  style={{
                    display: "flex", alignItems: "center", gap: "0.875rem",
                    minHeight: "3rem",
                    padding: "0.75rem 1.125rem",
                    textDecoration: "none",
                    color: INK,
                    borderBottom: `0.0625rem solid ${HAIRLINE}`,
                    background: "transparent",
                  }}
                >
                  <span style={{ color: EMBER_GLYPH, display: "inline-flex", flexShrink: 0 }}>
                    <DoorIcon name={door.icon} />
                  </span>
                  <span style={{
                    flex: 1,
                    fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                  }}>
                    {door.label}
                  </span>
                  <Chevron />
                </Link>
              ))}
              {/* Sign out — last door */}
              <button
                onClick={handleSignOut}
                className="mp-me-door"
                style={{
                  display: "flex", alignItems: "center", gap: "0.875rem",
                  width: "100%",
                  minHeight: "3rem",
                  padding: "0.75rem 1.125rem",
                  border: "none",
                  background: "transparent",
                  color: MUTED,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "inline-flex", flexShrink: 0 }}>
                  <DoorIcon name="signOut" />
                </span>
                <span style={{
                  flex: 1,
                  fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 500,
                }}>
                  {tc("signOut")}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* One guarded entrance + hover/pressed states */}
        <style>{`
          @media (prefers-reduced-motion: no-preference) {
            @keyframes mpMeRise { from { opacity: 0; transform: translateY(0.375rem); } to { opacity: 1; transform: translateY(0); } }
            .mp-me-board { animation: mpMeRise 0.35s ease-out both; }
          }
          @media (prefers-reduced-motion: reduce) {
            .mp-me-board { animation: none !important; }
          }
          @media (hover: hover) {
            .mp-me-door:hover { background: rgba(154,79,42,0.07) !important; }
            .mp-me-action:hover { background: rgba(154,79,42,0.07) !important; }
          }
          .mp-me-door:active, .mp-me-action:active { background: rgba(154,79,42,0.12) !important; }
          .mp-me-door:focus-visible, .mp-me-action:focus-visible {
            outline: 0.1875rem solid #D4AF37;
            outline-offset: -0.1875rem;
          }
        `}</style>

        {/* Mobile bottom nav bar — "Me" tab highlighted */}
        {isMobile && (
          <NavigationBar
            currentMode={navMode}
            onModeChange={(mode) => { setNavMode(mode); router.push(mode === "3d" ? "/palace" : `/${mode}`); }}
            onNotifications={() => router.push("/atrium?notifications=1")}
            isMobile={true}
            activeTab="me"
          />
        )}
      </div>
    </>
  );
}
