"use client";

import React, { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import TuscanCard from "@/components/ui/TuscanCard";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsCompact } from "@/lib/hooks/useIsMobile";
import type { SocialProfile } from "@/lib/social/profile-actions";
import { toggleFollow } from "@/lib/social/profile-actions";
import { track } from "@/lib/analytics";
import SafetyMenu from "./SafetyMenu";

/** Canon interactive/CTA color. */
const EMBER = "#B85C38";
const EMBER_DEEP = "#9A4F2A";

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
  const compactLayout = compact || isCompactViewport;
  const reduceMotion = useReducedMotion();
  const [isFollowing, setIsFollowing] = useState(profile.is_following);
  const [followerCount, setFollowerCount] = useState(profile.follower_count);
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
            background: profile.avatar_url
              ? `url(${profile.avatar_url}) center/cover`
              : // Calmer ember-tint identity circle; gold stays palace-only.
                `linear-gradient(135deg, ${EMBER}, ${EMBER_DEEP})`,
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
          {!profile.avatar_url &&
            (profile.display_name?.[0]?.toUpperCase() || "?")}
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

          {/* Stats */}
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
        </div>

        {/* Follow button */}
        {!profile.is_own && (
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
        {!profile.is_own && (
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
        )}
      </div>
    </TuscanCard>
  );
}
