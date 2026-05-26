"use client";

import React from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import ProfileCard from "@/components/social/ProfileCard";
import ActivityFeed from "@/components/social/ActivityFeed";
import TuscanCard, { TuscanSectionHeader } from "@/components/ui/TuscanCard";
import { ANIM, EASE } from "@/components/ui/TuscanStyles";
import { useRouter } from "next/navigation";
import NavigationBar from "@/components/ui/NavigationBar";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
// Note: do NOT import usePalaceStore — Profile is outside the (app) layout group
import type { SocialProfile } from "@/lib/social/profile-actions";
import type { FeedItem } from "@/lib/social/feed-actions";
import type { PublishedWing } from "@/lib/social/visit-actions";

interface ProfilePageClientProps {
  profile: SocialProfile;
  activities: FeedItem[];
  activitiesCursor: string | null;
  publishedWings: PublishedWing[];
  isAuthenticated?: boolean;
}

export default function ProfilePageClient({
  profile,
  activities,
  activitiesCursor,
  publishedWings,
  isAuthenticated = false,
}: ProfilePageClientProps) {
  const { t } = useTranslation("social");
  const router = useRouter();
  const isMobile = useIsMobile();
  // Navigate to app modes via full page navigation (not soft nav)
  // to avoid conflicts with MemoryPalace's history management
  const handleModeChange = (mode: "atrium" | "library" | "3d") => {
    window.location.href = mode === "3d" ? "/palace" : `/${mode}`;
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
        paddingTop: isAuthenticated && !isMobile ? "3.5rem" : undefined,
        paddingBottom: isAuthenticated && isMobile
          ? "calc(3.5rem + env(safe-area-inset-bottom, 0px))"
          : "2rem",
      }}
    >
      {/* Desktop NavigationBar */}
      {isAuthenticated && !isMobile && (
        <NavigationBar
          currentMode={"atrium"}
          onModeChange={handleModeChange}
          onNotifications={() => router.push("/palace?notifications=1")}
          isMobile={false}
          activeTab="explore"
        />
      )}

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "0 1rem" }}>

        {/* ── Back Button ──────────────────────────────── */}
        <div style={{
          padding: isMobile ? "1rem 0 0.75rem" : "1.5rem 0 1rem",
          animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out both`,
        }}>
          <button
            onClick={() => router.push("/explore")}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.375rem",
              fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
              color: T.color.walnut, background: "none", border: "none",
              cursor: "pointer", padding: "0.375rem 0.75rem 0.375rem 0.25rem",
              borderRadius: "0.5rem",
              transition: `background 0.2s ${EASE}`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${T.color.sandstone}30`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            {t("exploreBackToExplore")}
          </button>
        </div>

        {/* ── Profile Header ──────────────────────────── */}
        <div style={{
          animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out 0.05s both`,
        }}>
          <TuscanCard variant="elevated" padding="1.5rem">
            <ProfileCard profile={profile} />
          </TuscanCard>
        </div>

        {/* ── Enter Palace Button ─────────────────────── */}
        {publishedWings.length > 0 && (
          <div style={{
            textAlign: "center",
            marginTop: "1.25rem",
            animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out 0.07s both`,
          }}>
            <button
              onClick={() => router.push(`/visit/${profile.id}/${publishedWings[0].slug}`)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.625rem",
                fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
                padding: "0.875rem 2rem", borderRadius: "2rem",
                border: "none",
                background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
                color: T.color.cream, cursor: "pointer",
                boxShadow: `0 3px 16px ${T.color.gold}40`,
                transition: `transform 0.2s ${EASE}, box-shadow 0.2s ${EASE}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 24px ${T.color.gold}50`; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 3px 16px ${T.color.gold}40`; }}
            >
              {/* Door/arch icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21V8a9 9 0 0 1 18 0v13" />
                <rect x="9" y="13" width="6" height="8" rx="1" />
              </svg>
              {t("enterPalaceButton")}
            </button>
          </div>
        )}

        {/* ── Stats Bar ──────────────────────────────── */}
        <div style={{
          display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap",
          padding: "1.25rem 0",
          animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out 0.08s both`,
        }}>
          {[
            { label: t("publishedWings"), value: publishedWings.length },
            { label: t("rooms"), value: publishedWings.reduce((sum, w) => sum + w.room_count, 0) },
            { label: t("visits"), value: publishedWings.reduce((sum, w) => sum + w.visit_count, 0) },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: "center", minWidth: "4rem" }}>
              <div style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 700, color: T.color.charcoal }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {stat.label}
              </div>
            </div>
          ))}
          <div style={{ textAlign: "center", minWidth: "4rem" }}>
            <div style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 700, color: T.color.charcoal }}>
              {new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
            </div>
            <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {t("memberSince")}
            </div>
          </div>
        </div>

        {/* ── Published Wings ─────────────────────────── */}
        {publishedWings.length > 0 && (
          <section style={{
            marginTop: "2rem",
            animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out 0.1s both`,
          }}>
            <TuscanSectionHeader
              badge={
                <span style={{
                  fontFamily: T.font.body, fontSize: "0.75rem",
                  color: T.color.muted,
                }}>
                  {publishedWings.length}
                </span>
              }
            >
              {t("publishedWings")}
            </TuscanSectionHeader>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100%" : "16rem"}, 1fr))`,
              gap: "0.875rem",
            }}>
              {publishedWings.map((wing, i) => (
                <WingCard
                  key={wing.id}
                  wing={wing}
                  profileId={profile.id}
                  delay={i * 0.05}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Activity Feed ───────────────────────────── */}
        {activities.length > 0 && (
          <section style={{
            marginTop: "2rem",
            marginBottom: "2rem",
            animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out 0.2s both`,
          }}>
            <TuscanSectionHeader>{t("recentActivity")}</TuscanSectionHeader>
            <ActivityFeed
              initialItems={activities}
              initialCursor={activitiesCursor}
              userId={profile.id}
            />
          </section>
        )}

        {/* ── Empty State ─────────────────────────────── */}
        {publishedWings.length === 0 && activities.length === 0 && (
          <div style={{
            textAlign: "center", padding: "3rem 1rem",
            animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out 0.1s both`,
          }}>
            <p style={{
              fontFamily: T.font.display, fontSize: "1.25rem",
              color: T.color.charcoal, margin: "0 0 0.375rem",
            }}>
              {t("profileEmpty")}
            </p>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.875rem",
              color: T.color.muted, margin: 0,
            }}>
              {t("profileEmptyHint")}
            </p>
          </div>
        )}
      </div>

      {/* Mobile NavigationBar */}
      {isAuthenticated && isMobile && (
        <NavigationBar
          currentMode={"atrium"}
          onModeChange={handleModeChange}
          onNotifications={() => router.push("/palace?notifications=1")}
          isMobile={true}
          activeTab="explore"
        />
      )}
    </div>
  );
}

/* ── Wing Card ────────────────────────────────────── */

function WingCard({
  wing,
  profileId,
  delay = 0,
}: {
  wing: PublishedWing;
  profileId: string;
  delay?: number;
}) {
  const { t } = useTranslation("social");
  const router = useRouter();

  // Wing accent color or fallback gradient
  const accentGradient = wing.accent_color
    ? `linear-gradient(135deg, ${wing.accent_color}30, ${wing.accent_color}10)`
    : `linear-gradient(135deg, ${T.color.gold}15, ${T.color.terracotta}08)`;

  return (
    <TuscanCard
      variant="glass"
      padding="0"
      style={{
        cursor: "pointer",
        animationDelay: `${delay}s`,
      }}
    >
      <div
        onClick={() => router.push(`/visit/${profileId}/${wing.slug}`)}
        role="button"
        tabIndex={0}
        aria-label={wing.custom_name || wing.slug}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            router.push(`/visit/${profileId}/${wing.slug}`);
          }
        }}
      >
        {/* Tuscan arch header */}
        <div style={{
          height: "3.5rem",
          background: wing.accent_color
            ? `linear-gradient(135deg, ${wing.accent_color}25, ${wing.accent_color}08)`
            : `linear-gradient(135deg, ${T.color.gold}20, ${T.color.terracotta}10)`,
          borderRadius: "1rem 1rem 0 0",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}>
          {/* Decorative arches */}
          <svg width="100%" height="100%" viewBox="0 0 200 50" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
            <path d="M30 50 L30 25 A20 20 0 0 1 70 25 L70 50" fill="none" stroke={wing.accent_color || T.color.gold} strokeWidth="1.5" opacity="0.3" />
            <path d="M80 50 L80 20 A20 20 0 0 1 120 20 L120 50" fill="none" stroke={wing.accent_color || T.color.gold} strokeWidth="1.5" opacity="0.4" />
            <path d="M130 50 L130 25 A20 20 0 0 1 170 25 L170 50" fill="none" stroke={wing.accent_color || T.color.gold} strokeWidth="1.5" opacity="0.3" />
            {/* Column bases */}
            <rect x="27" y="45" width="6" height="5" fill={wing.accent_color || T.color.gold} opacity="0.15" rx="1" />
            <rect x="67" y="45" width="6" height="5" fill={wing.accent_color || T.color.gold} opacity="0.15" rx="1" />
            <rect x="77" y="45" width="6" height="5" fill={wing.accent_color || T.color.gold} opacity="0.15" rx="1" />
            <rect x="117" y="45" width="6" height="5" fill={wing.accent_color || T.color.gold} opacity="0.15" rx="1" />
            <rect x="127" y="45" width="6" height="5" fill={wing.accent_color || T.color.gold} opacity="0.15" rx="1" />
            <rect x="167" y="45" width="6" height="5" fill={wing.accent_color || T.color.gold} opacity="0.15" rx="1" />
          </svg>
        </div>

        <div style={{ padding: "1.125rem" }}>
          {/* Wing name */}
          <div style={{
            fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600,
            color: T.color.charcoal, marginBottom: "0.25rem",
          }}>
            {wing.custom_name || wing.slug}
          </div>

          {/* Description */}
          {wing.publish_description && (
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem",
              color: T.color.walnut, margin: "0 0 0.625rem",
              lineHeight: 1.5, display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {wing.publish_description}
            </p>
          )}

          {/* Stats row */}
          <div style={{
            display: "flex", alignItems: "center", gap: "1rem",
            fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
            paddingTop: "0.5rem",
            borderTop: `1px solid ${T.color.lineFaint}`,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              {wing.room_count} {t("rooms")}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
              {wing.visit_count} {t("visits")}
            </span>
            <span style={{
              marginLeft: "auto", color: T.color.goldDark, fontWeight: 500,
              display: "flex", alignItems: "center", gap: "0.25rem",
            }}>
              {t("exploreVisitWing")} →
            </span>
          </div>
        </div>
      </div>
    </TuscanCard>
  );
}
