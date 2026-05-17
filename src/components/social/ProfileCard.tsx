"use client";

import React, { useState, useTransition } from "react";
import { T } from "@/lib/theme";
import TuscanCard from "@/components/ui/TuscanCard";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { SocialProfile } from "@/lib/social/profile-actions";
import { toggleFollow } from "@/lib/social/profile-actions";
import { track } from "@/lib/analytics";

interface ProfileCardProps {
  profile: SocialProfile;
  compact?: boolean;
  onFollowChange?: (following: boolean) => void;
}

export default function ProfileCard({
  profile,
  compact = false,
  onFollowChange,
}: ProfileCardProps) {
  const { t } = useTranslation("social");
  const [isFollowing, setIsFollowing] = useState(profile.is_following);
  const [followerCount, setFollowerCount] = useState(profile.follower_count);
  const [isPending, startTransition] = useTransition();

  const handleFollow = () => {
    startTransition(async () => {
      const { following } = await toggleFollow(profile.id);
      setIsFollowing(following);
      setFollowerCount((c) => c + (following ? 1 : -1));
      onFollowChange?.(following);
      track("social_follow_toggle", { targetId: profile.id, following });
    });
  };

  const avatarSize = compact ? "2.5rem" : "4rem";
  const nameSize = compact ? "1rem" : "1.375rem";

  return (
    <TuscanCard variant="glass" padding={compact ? "1rem" : "1.5rem"}>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
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
              : `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
            border: `2px solid ${T.color.gold}`,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.color.cream,
            fontFamily: T.font.display,
            fontSize: compact ? "1rem" : "1.5rem",
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
                color: T.color.charcoal,
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

          {!compact && profile.bio && (
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                color: T.color.walnut,
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
              marginTop: compact ? "0.25rem" : "0.5rem",
            }}
          >
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: T.color.muted,
              }}
            >
              <strong style={{ color: T.color.charcoal }}>
                {followerCount}
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
              <strong style={{ color: T.color.charcoal }}>
                {profile.following_count}
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
              cursor: isPending ? "wait" : "pointer",
              opacity: isPending ? 0.6 : 1,
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
          >
            {isFollowing ? t("following") : t("follow")}
          </button>
        )}
      </div>
    </TuscanCard>
  );
}
