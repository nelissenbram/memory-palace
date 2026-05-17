"use client";

import React from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import ProfileCard from "@/components/social/ProfileCard";
import ActivityFeed from "@/components/social/ActivityFeed";
import { TuscanSectionHeader } from "@/components/ui/TuscanCard";
import type { SocialProfile } from "@/lib/social/profile-actions";
import type { FeedItem } from "@/lib/social/feed-actions";
import type { PublishedWing } from "@/lib/social/visit-actions";

interface ProfilePageClientProps {
  profile: SocialProfile;
  activities: FeedItem[];
  activitiesCursor: string | null;
  publishedWings: PublishedWing[];
}

export default function ProfilePageClient({
  profile,
  activities,
  activitiesCursor,
  publishedWings,
}: ProfilePageClientProps) {
  const { t } = useTranslation("social");

  return (
    <div
      style={{
        maxWidth: "42rem",
        margin: "0 auto",
        padding: "2rem 1rem 4rem",
        minHeight: "100vh",
        background: T.color.linen,
      }}
    >
      {/* Profile header */}
      <ProfileCard profile={profile} />

      {/* Published wings */}
      {publishedWings.length > 0 && (
        <section style={{ marginTop: "2rem" }}>
          <TuscanSectionHeader>{t("publishedWings")}</TuscanSectionHeader>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))",
              gap: "0.75rem",
            }}
          >
            {publishedWings.map((wing) => (
              <a
                key={wing.id}
                href={`/visit/${profile.id}/${wing.slug}`}
                style={{
                  display: "block",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  background: T.color.cream,
                  border: `1px solid ${T.color.lineFaint}`,
                  textDecoration: "none",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
              >
                <div
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    color: T.color.charcoal,
                  }}
                >
                  {wing.custom_name || wing.slug}
                </div>
                {wing.publish_description && (
                  <p
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.8125rem",
                      color: T.color.walnut,
                      margin: "0.25rem 0 0",
                      lineHeight: 1.4,
                    }}
                  >
                    {wing.publish_description}
                  </p>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    marginTop: "0.5rem",
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    color: T.color.muted,
                  }}
                >
                  <span>
                    {wing.room_count} {t("rooms")}
                  </span>
                  <span>
                    {wing.visit_count} {t("visits")}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Activity feed */}
      <section style={{ marginTop: "2rem" }}>
        <TuscanSectionHeader>{t("recentActivity")}</TuscanSectionHeader>
        <ActivityFeed
          initialItems={activities}
          initialCursor={activitiesCursor}
          userId={profile.id}
        />
      </section>
    </div>
  );
}
