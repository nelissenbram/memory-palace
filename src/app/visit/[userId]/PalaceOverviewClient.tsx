"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { ANIM } from "@/components/ui/TuscanStyles";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import TuscanCard, { TuscanSectionHeader } from "@/components/ui/TuscanCard";
import NavigationBar from "@/components/ui/NavigationBar";
import CommentThread from "@/components/social/CommentThread";
import ReactionBar from "@/components/social/ReactionBar";
import SafetyMenu from "@/components/social/SafetyMenu";
import type { Comment, ReactionSummary } from "@/lib/social/comment-actions";

interface WingRoom {
  id: string;
  name: string;
  icon: string;
  coverHue: number;
  memoryCount: number;
}

interface WingData {
  id: string;
  slug: string;
  name: string;
  accentColor: string | null;
  description: string | null;
  roomCount: number;
  visitCount: number;
  rooms: WingRoom[];
}

interface PalaceOverviewClientProps {
  owner: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
    bio: string | null;
  } | null;
  wings: WingData[];
  initialComments: Comment[];
  initialReactions: ReactionSummary[];
  currentUserId?: string;
  isAuthenticated?: boolean;
  isFollowing?: boolean;
}

/* ── SVG Illustrations ─────────────────────────────── */

function GrandVillaSvg() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 480 120"
      preserveAspectRatio="xMidYMax meet"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.color.gold} stopOpacity="0.05" />
          <stop offset="100%" stopColor={T.color.terracotta} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="480" height="120" fill="url(#skyG)" />
      <rect x="0" y="108" width="480" height="12" fill={T.color.terracotta} opacity="0.1" />
      <rect x="200" y="108" width="80" height="12" fill={T.color.sandstone} opacity="0.12" rx="1" />
      <ellipse cx="50" cy="60" rx="9" ry="38" fill={T.color.charcoal} opacity="0.13" />
      <rect x="48" y="96" width="4" height="14" fill={T.color.walnut} opacity="0.18" />
      <ellipse cx="430" cy="60" rx="9" ry="38" fill={T.color.charcoal} opacity="0.13" />
      <rect x="428" y="96" width="4" height="14" fill={T.color.walnut} opacity="0.18" />
      <ellipse cx="100" cy="68" rx="6" ry="28" fill={T.color.charcoal} opacity="0.1" />
      <ellipse cx="380" cy="68" rx="6" ry="28" fill={T.color.charcoal} opacity="0.1" />
      <rect x="160" y="42" width="160" height="66" fill={T.color.cream} opacity="0.55" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.2" />
      <polygon points="150,42 240,8 330,42" fill={T.color.terracotta} opacity="0.4" />
      <line x1="150" y1="42" x2="330" y2="42" stroke={T.color.terracotta} strokeWidth="1.2" strokeOpacity="0.3" />
      <circle cx="240" cy="28" r="5" fill={T.color.gold} opacity="0.12" />
      <rect x="110" y="56" width="50" height="52" fill={T.color.cream} opacity="0.4" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.2" />
      <rect x="110" y="52" width="50" height="4" fill={T.color.terracotta} opacity="0.32" rx="0.5" />
      <rect x="320" y="56" width="50" height="52" fill={T.color.cream} opacity="0.4" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.2" />
      <rect x="320" y="52" width="50" height="4" fill={T.color.terracotta} opacity="0.32" rx="0.5" />
      <rect x="225" y="66" width="30" height="42" fill={T.color.walnut} opacity="0.28" rx="1" />
      <path d="M225,74 A15,15 0 0,1 255,74" fill={T.color.walnut} opacity="0.22" />
      <rect x="222" y="106" width="36" height="3" fill={T.color.sandstone} opacity="0.35" rx="1" />
      <circle cx="249" cy="88" r="2" fill={T.color.gold} opacity="0.25" />
      <rect x="218" y="46" width="4.5" height="62" fill={T.color.sandstone} opacity="0.38" rx="0.5" />
      <rect x="257" y="46" width="4.5" height="62" fill={T.color.sandstone} opacity="0.38" rx="0.5" />
      <rect x="216" y="44" width="8" height="3" fill={T.color.sandstone} opacity="0.4" rx="1" />
      <rect x="255" y="44" width="8" height="3" fill={T.color.sandstone} opacity="0.4" rx="1" />
      <rect x="174" y="56" width="18" height="22" fill={T.color.gold} opacity="0.1" rx="1" stroke={T.color.walnut} strokeWidth="0.5" strokeOpacity="0.18" />
      <rect x="288" y="56" width="18" height="22" fill={T.color.gold} opacity="0.1" rx="1" stroke={T.color.walnut} strokeWidth="0.5" strokeOpacity="0.18" />
      <rect x="126" y="66" width="14" height="16" fill={T.color.gold} opacity="0.08" rx="0.5" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.15" />
      <rect x="340" y="66" width="14" height="16" fill={T.color.gold} opacity="0.08" rx="0.5" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.15" />
      <rect x="210" y="102" width="6" height="5" fill={T.color.terracotta} opacity="0.18" rx="0.5" />
      <ellipse cx="213" cy="100" rx="4" ry="3" fill={T.color.charcoal} opacity="0.07" />
      <rect x="264" y="102" width="6" height="5" fill={T.color.terracotta} opacity="0.18" rx="0.5" />
      <ellipse cx="267" cy="100" rx="4" ry="3" fill={T.color.charcoal} opacity="0.07" />
    </svg>
  );
}

/** Tuscan wing illustration — arched colonnade with accent color */
function WingArchSvg({ accent }: { accent: string }) {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 320 72"
      preserveAspectRatio="xMidYMax meet"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={`wg_${accent.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.08" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="72" fill={`url(#wg_${accent.replace("#","")})`} />
      {/* Ground line */}
      <rect x="0" y="66" width="320" height="6" fill={accent} opacity="0.1" />
      {/* Three arches */}
      {[80, 160, 240].map((cx) => (
        <g key={cx}>
          {/* Column left */}
          <rect x={cx - 30} y="24" width="3.5" height="42" fill={T.color.sandstone} opacity="0.35" rx="0.5" />
          <rect x={cx - 31.5} y="22" width="6.5" height="3" fill={T.color.sandstone} opacity="0.4" rx="0.5" />
          {/* Column right */}
          <rect x={cx + 26.5} y="24" width="3.5" height="42" fill={T.color.sandstone} opacity="0.35" rx="0.5" />
          <rect x={cx + 25} y="22" width="6.5" height="3" fill={T.color.sandstone} opacity="0.4" rx="0.5" />
          {/* Arch */}
          <path d={`M${cx - 26},66 L${cx - 26},36 A26,26 0 0,1 ${cx + 26},36 L${cx + 26},66`} fill="none" stroke={accent} strokeWidth="1.5" strokeOpacity="0.25" />
          {/* Keystone */}
          <rect x={cx - 2.5} y="12" width="5" height="7" fill={accent} opacity="0.18" rx="1" />
        </g>
      ))}
      {/* Entablature */}
      <rect x="44" y="19" width="232" height="3.5" fill={accent} opacity="0.2" rx="0.5" />
      {/* Pediment triangle */}
      <polygon points="130,19 160,4 190,19" fill={accent} opacity="0.15" />
      <circle cx="160" cy="13" r="3" fill={T.color.gold} opacity="0.12" />
    </svg>
  );
}

/** Guestbook scroll SVG */
function GuestbookSvg() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 320 60"
      preserveAspectRatio="xMidYMax meet"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="gbGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.color.gold} stopOpacity="0.06" />
          <stop offset="100%" stopColor={T.color.sandstone} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="60" fill="url(#gbGrad)" />
      {/* Scroll / book */}
      <rect x="120" y="12" width="80" height="42" fill={T.color.cream} opacity="0.6" rx="2" stroke={T.color.walnut} strokeWidth="0.8" strokeOpacity="0.2" />
      {/* Scroll rolls */}
      <ellipse cx="120" cy="33" rx="4" ry="22" fill={T.color.sandstone} opacity="0.3" />
      <ellipse cx="200" cy="33" rx="4" ry="22" fill={T.color.sandstone} opacity="0.3" />
      {/* Text lines */}
      <rect x="132" y="20" width="56" height="2" fill={T.color.walnut} opacity="0.12" rx="1" />
      <rect x="132" y="26" width="48" height="2" fill={T.color.walnut} opacity="0.1" rx="1" />
      <rect x="132" y="32" width="52" height="2" fill={T.color.walnut} opacity="0.1" rx="1" />
      <rect x="132" y="38" width="40" height="2" fill={T.color.walnut} opacity="0.08" rx="1" />
      <rect x="132" y="44" width="44" height="2" fill={T.color.walnut} opacity="0.08" rx="1" />
      {/* Quill */}
      <line x1="215" y1="10" x2="225" y2="48" stroke={T.color.walnut} strokeWidth="1.2" strokeOpacity="0.2" />
      <polygon points="225,48 223,42 227,43" fill={T.color.walnut} opacity="0.25" />
      {/* Feather */}
      <path d="M215,10 Q210,18 213,22 Q216,18 215,10" fill={T.color.gold} opacity="0.15" />
      {/* Ink well */}
      <rect x="100" y="42" width="10" height="12" fill={T.color.charcoal} opacity="0.12" rx="1.5" />
      <ellipse cx="105" cy="42" rx="6" ry="2" fill={T.color.charcoal} opacity="0.15" />
    </svg>
  );
}

/* ── Main Component ─────────────────────────────────── */

export default function PalaceOverviewClient({
  owner,
  wings,
  initialComments,
  initialReactions,
  currentUserId,
  isAuthenticated,
  isFollowing: initialIsFollowing,
}: PalaceOverviewClientProps) {
  const { t } = useTranslation("social");
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
  const [isFollowPending, startFollowTransition] = useTransition();

  const showFollowButton = isAuthenticated && owner && currentUserId !== owner.id;

  const handleToggleFollow = () => {
    if (!owner) return;
    startFollowTransition(async () => {
      const { toggleFollow } = await import("@/lib/social/profile-actions");
      const { following } = await toggleFollow(owner.id);
      setIsFollowing(following);
    });
  };

  const totalRooms = wings.reduce((sum, w) => sum + w.roomCount, 0);
  const totalVisits = wings.reduce((sum, w) => sum + w.visitCount, 0);
  const totalMemories = wings.reduce(
    (sum, w) => sum + w.rooms.reduce((rs, r) => rs + r.memoryCount, 0),
    0
  );

  const handleModeChange = (mode: "atrium" | "library" | "3d") => {
    window.location.replace(mode === "3d" ? "/palace" : `/${mode}`);
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
        paddingTop: isAuthenticated && !isMobile
          ? "3.5rem"
          : "env(safe-area-inset-top, 0px)",
        paddingBottom: isAuthenticated && isMobile
          ? "calc(5rem + env(safe-area-inset-bottom, 0px))"
          : "max(4rem, env(safe-area-inset-bottom, 0px))",
        paddingLeft: isMobile ? "0.75rem" : "1rem",
        paddingRight: isMobile ? "0.75rem" : "1rem",
      }}
    >
      {/* Desktop NavBar */}
      {isAuthenticated && !isMobile && (
        <NavigationBar
          currentMode="atrium"
          onModeChange={handleModeChange}
          onNotifications={() => router.push("/palace?notifications=1")}
          isMobile={false}
          activeTab="explore"
        />
      )}

      <div style={{ maxWidth: "56rem", margin: "0 auto", paddingTop: isMobile ? "1rem" : "2rem" }}>
        {/* Back to explore */}
        <a
          href="/explore"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.muted,
            textDecoration: "none",
            marginBottom: "1rem",
            transition: "color 0.15s ease",
            animation: `${ANIM.tuscanFadeSlideUp} 0.3s ease-out both`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = T.color.goldDark; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.color.muted; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {t("exploreBackToExplore")}
        </a>

        {/* Grand palace header */}
        <TuscanCard
          variant="glass"
          padding="0"
          style={{
            overflow: "hidden",
            animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out both`,
          }}
        >
          <div style={{
            width: "100%",
            height: isMobile ? "7rem" : "9rem",
            overflow: "hidden",
            background: `linear-gradient(135deg, ${T.color.gold}12, ${T.color.terracotta}08, ${T.color.linen}50)`,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}>
            <GrandVillaSvg />
          </div>

          <div style={{ padding: isMobile ? "1.25rem 1rem 1.5rem" : "1.75rem 2rem 2rem" }}>
            {/* Owner info */}
            {owner && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.875rem",
                marginBottom: "1.25rem",
                flexWrap: isMobile ? "wrap" : "nowrap",
              }}>
                <div
                  style={{
                    width: "3.5rem",
                    height: "3.5rem",
                    borderRadius: "50%",
                    background: owner.avatarUrl
                      ? `url(${owner.avatarUrl}) center/cover`
                      : `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
                    border: `2px solid ${T.color.goldLight}`,
                    flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: T.color.cream,
                    fontFamily: T.font.display,
                    fontSize: "1.25rem",
                    fontWeight: 600,
                  }}
                >
                  {!owner.avatarUrl && (owner.name?.[0]?.toUpperCase() || "?")}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1
                    style={{
                      fontFamily: T.font.display,
                      fontSize: isMobile ? "1.5rem" : "1.875rem",
                      fontWeight: 600,
                      color: T.color.charcoal,
                      margin: 0,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {owner.name ? `${owner.name}'s Palace` : t("anonymous")}
                  </h1>
                  {owner.username && (
                    <a
                      href={`/u/${owner.username}`}
                      style={{
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        color: T.color.muted,
                        textDecoration: "none",
                      }}
                    >
                      @{owner.username}
                    </a>
                  )}
                </div>
                {showFollowButton && (
                  <button
                    onClick={handleToggleFollow}
                    disabled={isFollowPending}
                    aria-label={isFollowing ? t("unfollowUser") : t("followUser")}
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      padding: "0.5rem 1.25rem",
                      borderRadius: "2rem",
                      border: isFollowing
                        ? `1px solid ${T.color.sandstone}`
                        : "none",
                      background: isFollowing
                        ? "transparent"
                        : `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
                      color: isFollowing ? T.color.walnut : T.color.cream,
                      cursor: isFollowPending ? "wait" : "pointer",
                      opacity: isFollowPending ? 0.6 : 1,
                      transition: "all 0.2s ease",
                      flexShrink: 0,
                    }}
                  >
                    {isFollowing ? t("following") : t("follow")}
                  </button>
                )}
                {/* Report (guests included) / block this palace owner (Apple Guideline 1.2).
                    Reporting works logged-out via the public /api/report; Block stays login-only. */}
                {owner && currentUserId !== owner.id && (
                  <SafetyMenu
                    targetType="palace"
                    targetId={owner.id}
                    targetUserId={owner.id}
                    showBlock={isAuthenticated}
                  />
                )}
              </div>
            )}

            {/* Bio */}
            {owner?.bio && (
              <p style={{
                fontFamily: T.font.body,
                fontSize: "0.9375rem",
                color: T.color.walnut,
                margin: "0 0 1.25rem",
                lineHeight: 1.6,
                maxWidth: "36rem",
              }}>
                {owner.bio}
              </p>
            )}

            {/* Stats bar */}
            <div style={{
              display: "flex",
              gap: isMobile ? "1rem" : "1.5rem",
              flexWrap: "wrap",
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.muted,
              marginBottom: "1.25rem",
            }}>
              <span><strong style={{ color: T.color.charcoal, fontWeight: 600 }}>{wings.length}</strong> {wings.length === 1 ? "wing" : "wings"}</span>
              <span><strong style={{ color: T.color.charcoal, fontWeight: 600 }}>{totalRooms}</strong> {t("rooms").toLowerCase()}</span>
              <span><strong style={{ color: T.color.charcoal, fontWeight: 600 }}>{totalMemories}</strong> {t("memories").toLowerCase()}</span>
              {totalVisits > 0 && (
                <span><strong style={{ color: T.color.charcoal, fontWeight: 600 }}>{totalVisits}</strong> {t("visits").toLowerCase()}</span>
              )}
            </div>

            {/* Enter 3D Palace — primary CTA + reactions */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              paddingTop: "1.25rem",
              borderTop: `1px solid ${T.color.lineFaint}`,
              flexWrap: "wrap",
            }}>
              <a
                href={`/visit/${owner?.id}/walk`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: isMobile ? "0.75rem 1.5rem" : "0.875rem 2rem",
                  borderRadius: "2rem",
                  background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
                  color: "#fff",
                  fontFamily: T.font.display,
                  fontSize: isMobile ? "0.9375rem" : "1.0625rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 3px 12px rgba(0,0,0,0.18)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  letterSpacing: "0.01em",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.22)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 3px 12px rgba(0,0,0,0.18)";
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                {t("walkThrough3D")}
              </a>
              <ReactionBar
                targetType="palace"
                targetId={owner?.id || ""}
                initialReactions={initialReactions}
              />
            </div>
          </div>
        </TuscanCard>

        {/* ── Wing Subcards ──────────────────────────────── */}
        <section style={{
          marginTop: "2rem",
          animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out 0.1s both`,
        }}>
          <TuscanSectionHeader>{wings.length === 1 ? "Wing" : "Wings"}</TuscanSectionHeader>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : wings.length === 1 ? "1fr" : "repeat(auto-fill, minmax(22rem, 1fr))",
            gap: "1rem",
          }}>
            {wings.map((wing, wi) => (
              <div
                key={wing.id}
                role="button"
                tabIndex={0}
                style={{
                  cursor: "pointer",
                  borderRadius: "0.75rem",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out ${0.2 + wi * 0.08}s both`,
                }}
                onClick={() => router.push(`/visit/${owner?.id}/${wing.slug}/walk`)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/visit/${owner?.id}/${wing.slug}/walk`); } }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <TuscanCard variant="elevated" padding="0" style={{ overflow: "hidden" }}>
                  {/* Wing arch illustration */}
                  <div style={{
                    height: isMobile ? "4rem" : "4.5rem",
                    overflow: "hidden",
                    background: `linear-gradient(135deg, ${wing.accentColor || T.color.gold}10, ${T.color.linen}60)`,
                  }}>
                    <WingArchSvg accent={wing.accentColor || T.color.gold} />
                  </div>

                  <div style={{ padding: "1rem 1.25rem 1.25rem" }}>
                    {/* Wing name + visit arrow */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}>
                      <div>
                        <h3 style={{
                          fontFamily: T.font.display,
                          fontSize: "1.1875rem",
                          fontWeight: 600,
                          color: T.color.charcoal,
                          margin: 0,
                        }}>
                          {wing.name}
                        </h3>
                        {wing.description && (
                          <p style={{
                            fontFamily: T.font.body,
                            fontSize: "0.8125rem",
                            color: T.color.walnut,
                            margin: "0.25rem 0 0",
                            lineHeight: 1.5,
                          }}>
                            {wing.description}
                          </p>
                        )}
                      </div>
                      <span style={{
                        fontFamily: T.font.body,
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        color: T.color.goldDark,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        marginTop: "0.125rem",
                      }}>
                        {t("walkThrough3D")} →
                      </span>
                    </div>

                    {/* Stats row */}
                    <div style={{
                      display: "flex",
                      gap: "0.75rem",
                      marginTop: "0.5rem",
                      fontFamily: T.font.body,
                      fontSize: "0.6875rem",
                      color: T.color.muted,
                    }}>
                      <span>{wing.roomCount} {t("rooms").toLowerCase()}</span>
                      {wing.visitCount > 0 && <span>{wing.visitCount} {t("visits").toLowerCase()}</span>}
                    </div>

                    {/* Room chips */}
                    {wing.rooms.length > 0 && (
                      <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.375rem",
                        marginTop: "0.75rem",
                        paddingTop: "0.75rem",
                        borderTop: `1px solid ${T.color.lineFaint}`,
                      }}>
                        {wing.rooms.map((room) => (
                          <div
                            key={room.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.1875rem 0.5rem",
                              borderRadius: "1rem",
                              background: `hsl(${room.coverHue}, 35%, 92%)`,
                              fontFamily: T.font.body,
                              fontSize: "0.6875rem",
                              color: `hsl(${room.coverHue}, 30%, 40%)`,
                            }}
                          >
                            <span>{room.icon}</span>
                            {room.name}
                            {room.memoryCount > 0 && (
                              <span style={{ color: `hsl(${room.coverHue}, 20%, 60%)`, fontSize: "0.625rem" }}>
                                ({room.memoryCount})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TuscanCard>
              </div>
            ))}
          </div>
        </section>

        {/* ── Passcode Entry ──────────────────────────────── */}
        <PasscodeEntryInline />

        {/* ── Guestbook Subcard ────────────────────────────── */}
        <section style={{
          marginTop: "2rem",
          animation: `${ANIM.tuscanFadeSlideUp} 0.6s ease-out 0.3s both`,
        }}>
          <TuscanSectionHeader>{t("palaceGuestbook")}</TuscanSectionHeader>
          <TuscanCard variant="glass" padding="0" style={{ overflow: "hidden" }}>
            {/* Guestbook scroll illustration */}
            <div style={{
              height: isMobile ? "3rem" : "3.75rem",
              overflow: "hidden",
              background: `linear-gradient(135deg, ${T.color.gold}08, ${T.color.sandstone}06, ${T.color.linen}50)`,
            }}>
              <GuestbookSvg />
            </div>
            <div style={{ padding: "1.25rem" }}>
              <p style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: T.color.muted,
                margin: "0 0 1rem",
                fontStyle: "italic",
              }}>
                {t("palaceGuestbookHint")}
              </p>
              <CommentThread
                targetType="palace"
                targetId={owner?.id || ""}
                initialComments={initialComments}
                currentUserId={currentUserId}
              />
            </div>
          </TuscanCard>
        </section>
      </div>

      {/* Mobile NavBar */}
      {isAuthenticated && isMobile && (
        <NavigationBar
          currentMode="atrium"
          onModeChange={handleModeChange}
          onNotifications={() => router.push("/palace?notifications=1")}
          isMobile={true}
          activeTab="explore"
        />
      )}
    </div>
  );
}

/* ── Inline Passcode Entry ─────────────────────────── */

function PasscodeEntryInline() {
  const { t } = useTranslation("social");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    startTransition(async () => {
      setError(null);
      const { validatePasscode } = await import("@/lib/social/passcode-actions");
      const result = await validatePasscode(code);
      if (!result.ok) {
        setError(result.error || t("passcodeInvalid"));
        return;
      }
      // Redirect to the share page
      window.location.href = `/public/${result.share!.slug}`;
    });
  };

  return (
    <section style={{
      marginTop: "2rem",
      animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out 0.25s both`,
    }}>
      <TuscanCard variant="glass" padding="1.25rem">
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          flexWrap: "wrap",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span style={{
            fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600,
            color: T.color.charcoal, flexShrink: 0,
          }}>
            {t("passcodeEntryTitle")}
          </span>
          <form onSubmit={handleSubmit} style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            flex: 1, minWidth: "12rem",
          }}>
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
              placeholder={t("passcodePlaceholder")}
              maxLength={20}
              autoComplete="off"
              autoCapitalize="characters"
              style={{
                flex: 1, fontFamily: "monospace", fontSize: "0.875rem",
                fontWeight: 600, letterSpacing: "0.1em",
                padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
                border: `1.5px solid ${error ? T.color.error : T.color.sandstone}`,
                background: T.color.cream, color: T.color.charcoal,
                outline: "none", minWidth: 0,
              }}
            />
            <button
              type="submit"
              disabled={isPending || !code.trim()}
              style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "none",
                background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
                color: T.color.cream, cursor: isPending ? "wait" : "pointer",
                opacity: isPending || !code.trim() ? 0.5 : 1,
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {isPending ? "..." : t("passcodeSubmit")}
            </button>
          </form>
        </div>
        {error && (
          <p style={{
            fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.error,
            margin: "0.5rem 0 0 0", paddingLeft: "2rem",
          }}>
            {error}
          </p>
        )}
      </TuscanCard>
    </section>
  );
}
