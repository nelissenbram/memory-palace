"use client";

import React, { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import TuscanCard from "@/components/ui/TuscanCard";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsCompact } from "@/lib/hooks/useIsMobile";
import { useIsPortrait } from "@/lib/hooks/useIsPortrait";
import type { SocialProfile } from "@/lib/social/profile-actions";
import { toggleFollow } from "@/lib/social/profile-actions";
import { track } from "@/lib/analytics";
import SafetyMenu from "./SafetyMenu";

/** Canon interactive/CTA color. */
const EMBER = "#B85C38";
const EMBER_DEEP = "#9A4F2A";
/** Canon recessed tray for neutral shimmer/skeleton (libraryTokens TRAY). */
const TRAY = "#F6EBE3";
/** Slightly lighter cream highlight that sweeps across the tray on load. */
const TRAY_SHEEN = "#FBF3EC";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/** True when the user has requested reduced motion. */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(REDUCED_MOTION_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

/**
 * Loading placeholder for a ProfileCard. Mirrors the real card's footprint so
 * lists don't reflow on hydration. The shimmer sweep is suppressed under
 * prefers-reduced-motion (a calm static tint is shown instead) — all in-canon
 * (warm tray, no cool greys, no gold).
 */
export function ProfileCardSkeleton({ compact = false }: { compact?: boolean }) {
  const reduceMotion = useReducedMotion();

  const shimmer: React.CSSProperties = reduceMotion
    ? { background: TRAY }
    : {
        background: `linear-gradient(100deg, ${TRAY} 30%, ${TRAY_SHEEN} 50%, ${TRAY} 70%)`,
        backgroundSize: "200% 100%",
        animation: "mp-profile-card-shimmer 1.4s ease-in-out infinite",
      };

  const avatarSize = compact ? "2.5rem" : "4rem";

  const block = (
    w: string,
    h: string,
    extra?: React.CSSProperties,
  ): React.CSSProperties => ({
    width: w,
    height: h,
    borderRadius: "0.375rem",
    ...shimmer,
    ...extra,
  });

  return (
    <TuscanCard variant="glass" padding={compact ? "1rem" : "1.5rem"}>
      {/* Keyframes are inert under reduced-motion since the animation is unset. */}
      <style>{`@keyframes mp-profile-card-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div
        aria-hidden="true"
        style={{ display: "flex", gap: "1rem", alignItems: "center" }}
      >
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: "50%",
            flexShrink: 0,
            border: `1px solid ${T.color.hairline}`,
            ...shimmer,
          }}
        />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div style={block("50%", compact ? "1rem" : "1.375rem")} />
          <div style={block("30%", "0.8125rem")} />
          {!compact && <div style={block("80%", "0.875rem", { marginTop: "0.25rem" })} />}
        </div>
      </div>
    </TuscanCard>
  );
}

interface ProfileCardProps {
  profile: SocialProfile;
  compact?: boolean;
  onFollowChange?: (following: boolean) => void;
  /** When false, Follow routes to /login instead of a no-op server call. */
  isAuthenticated?: boolean;
}

export default function ProfileCard({
  profile,
  compact = false,
  onFollowChange,
  isAuthenticated = true,
}: ProfileCardProps) {
  const { t, locale } = useTranslation("social");
  const router = useRouter();
  // Self-adapt on small screens instead of relying solely on the parent prop.
  const isCompactViewport = useIsCompact();
  const isPortrait = useIsPortrait();
  const compactLayout = compact || isCompactViewport;
  const reduceMotion = useReducedMotion();
  // A private profile viewed by someone else returns known-zeroed placeholder
  // stats and can't be followed here — suppress the Follow affordance and the
  // misleading "0 followers / 0 following" row rather than showing them.
  const isLimited = profile.is_limited === true;
  const [isFollowing, setIsFollowing] = useState(profile.is_following);
  const [followerCount, setFollowerCount] = useState(profile.follower_count);
  const [avatarError, setAvatarError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const nf = React.useMemo(
    () => new Intl.NumberFormat(locale),
    [locale],
  );

  const handleFollow = () => {
    // Anonymous visitors can't follow — send them to login rather than firing a
    // no-op server call + misleading optimistic UI/analytics.
    if (!isAuthenticated) {
      const back = typeof window !== "undefined" ? window.location.pathname : "/";
      router.push(`/login?redirect=${encodeURIComponent(back)}`);
      return;
    }
    const prevFollowing = isFollowing;
    const prevCount = followerCount;
    startTransition(async () => {
      try {
        const { following, changed } = await toggleFollow(profile.id);
        setIsFollowing(following);
        // Only mutate the count when the server actually changed state, so a
        // redundant/no-op response can't drift the counter or push it negative.
        if (changed) {
          setFollowerCount((c) => Math.max(0, c + (following ? 1 : -1)));
        }
        onFollowChange?.(following);
        track("social_follow_toggle", { targetId: profile.id, following });
      } catch {
        // Roll back to the last known-good state on a network/server error so the
        // control never gets stuck in a stale/pending-looking state.
        setIsFollowing(prevFollowing);
        setFollowerCount(prevCount);
      }
    });
  };

  const avatarSize = compactLayout ? "2.5rem" : "4rem";
  const nameSize = compactLayout ? "1rem" : "1.375rem";
  const showAvatarImage = Boolean(profile.avatar_url) && !avatarError;

  return (
    <TuscanCard variant="glass" padding={compactLayout ? "1rem" : "1.5rem"}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        {/* Avatar */}
        <div
          role="img"
          aria-label={profile.display_name || t("anonymous")}
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: "50%",
            overflow: "hidden",
            // Calmer ember-tint identity circle; gold stays palace-only. Kept as
            // the base so the initial shows through if the image fails to load.
            background: `linear-gradient(135deg, ${EMBER}, ${EMBER_DEEP})`,
            border: `1px solid ${T.color.hairline}`,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.color.cream,
            fontFamily: T.font.display,
            fontSize: compactLayout ? "1rem" : "1.5rem",
            fontWeight: 600,
          }}
        >
          {showAvatarImage ? (
            <img
              src={profile.avatar_url as string}
              alt=""
              // On a broken/expired avatar URL, fall back to the ember-tint
              // initial rather than a torn image glyph.
              onError={() => setAvatarError(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            profile.display_name?.[0]?.toUpperCase() || "?"
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                fontFamily: T.font.display,
                fontSize: nameSize,
                fontWeight: 600,
                color: T.color.inkSoft,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {profile.display_name || t("anonymous")}
            </span>
            {profile.username && (
              <span
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.muted,
                }}
              >
                @{profile.username}
              </span>
            )}
          </div>

          {!compactLayout && profile.bio && (
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                color: T.color.muted,
                margin: "0.375rem 0 0",
                lineHeight: 1.5,
              }}
            >
              {profile.bio}
            </p>
          )}

          {/* Stats — hidden on a limited (private) profile where the counts are
              known-zeroed placeholders, not real numbers. A calm "Private
              profile" note takes their place instead of a misleading "0". */}
          {isLimited ? (
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontStyle: "italic",
                color: T.color.muted,
                marginTop: compactLayout ? "0.25rem" : "0.5rem",
              }}
            >
              {t("privateProfile")}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginTop: compactLayout ? "0.25rem" : "0.5rem",
              }}
            >
              <span
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.muted,
                }}
              >
                <strong style={{ color: T.color.inkSoft }}>
                  {nf.format(followerCount)}
                </strong>{" "}
                {t("followers")}
              </span>
              <span
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.muted,
                }}
              >
                <strong style={{ color: T.color.inkSoft }}>
                  {nf.format(profile.following_count)}
                </strong>{" "}
                {t("following")}
              </span>
            </div>
          )}
        </div>

        {/* Action group: Follow + safety menu. Kept together so that when the
            row wraps in portrait they align to the end of the card as a unit
            (marginLeft:auto) instead of stacking against the left edge under the
            avatar. */}
        {!profile.is_own && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexShrink: 0,
            marginLeft: isPortrait ? "auto" : undefined,
          }}
        >
        {!isLimited && (
          <button
            onClick={handleFollow}
            disabled={isPending}
            aria-pressed={isFollowing}
            aria-label={isFollowing ? t("unfollowUser") : t("followUser")}
            onFocus={(e) => {
              e.currentTarget.style.outline = `0.1875rem solid ${T.color.gold}`;
              e.currentTarget.style.outlineOffset = "0.1875rem";
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = "none";
            }}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              fontWeight: 600,
              padding: "0.5rem 1.25rem",
              minHeight: "2.75rem",
              minWidth: "2.75rem",
              borderRadius: "2rem",
              border: isFollowing
                ? `1px solid ${T.color.hairline}`
                : "none",
              background: isFollowing ? "transparent" : EMBER,
              color: isFollowing ? T.color.muted : T.color.cream,
              cursor: isPending ? "wait" : "pointer",
              opacity: isPending ? 0.6 : 1,
              transition: reduceMotion
                ? "none"
                : "background 0.2s ease, color 0.2s ease, opacity 0.2s ease",
              flexShrink: 0,
            }}
          >
            {isFollowing ? t("following") : t("follow")}
          </button>
        )}

        {/* Report / block (Apple Guideline 1.2) */}
        <SafetyMenu
          targetType="user"
          targetId={profile.id}
          targetUserId={profile.id}
          showBlock
          onBlocked={() => {
            setIsFollowing(false);
            onFollowChange?.(false);
          }}
        />
        </div>
        )}
      </div>
    </TuscanCard>
  );
}
