"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { ANIM } from "@/components/ui/TuscanStyles";
import { useTranslation } from "@/lib/hooks/useTranslation";
import TuscanCard, { TuscanSectionHeader } from "@/components/ui/TuscanCard";
import CommentThread from "@/components/social/CommentThread";
import ReactionBar from "@/components/social/ReactionBar";
import type { PublishedRoom } from "@/lib/social/visit-actions";
import type { Comment, ReactionSummary } from "@/lib/social/comment-actions";

interface VisitPageClientProps {
  wing: {
    id: string;
    slug: string;
    name: string;
    accentColor: string | null;
    description: string | null;
  };
  owner: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
  } | null;
  rooms: PublishedRoom[];
  initialComments: Comment[];
  initialReactions: ReactionSummary[];
  currentUserId?: string;
}

export default function VisitPageClient({
  wing,
  owner,
  rooms,
  initialComments,
  initialReactions,
  currentUserId,
}: VisitPageClientProps) {
  const { t } = useTranslation("social");
  const router = useRouter();

  return (
    <div
      style={{
        maxWidth: "48rem",
        margin: "0 auto",
        padding: "2rem 1rem 4rem",
        minHeight: "100dvh",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
      }}
    >
      {/* Wing header */}
      <TuscanCard variant="glass" padding="1.5rem" style={{ animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out both` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1
              style={{
                fontFamily: T.font.display,
                fontSize: "1.75rem",
                fontWeight: 600,
                color: T.color.charcoal,
                margin: 0,
              }}
            >
              {wing.name}
            </h1>
            {wing.description && (
              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.9375rem",
                  color: T.color.walnut,
                  margin: "0.375rem 0 0",
                  lineHeight: 1.5,
                }}
              >
                {wing.description}
              </p>
            )}
          </div>
        </div>

        {/* Owner attribution */}
        {owner && (
          <a
            href={owner.username ? `/u/${owner.username}` : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "1rem",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "1.75rem",
                height: "1.75rem",
                borderRadius: "50%",
                background: owner.avatarUrl
                  ? `url(${owner.avatarUrl}) center/cover`
                  : `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
                border: `1.5px solid ${T.color.goldLight}`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                color: T.color.walnut,
              }}
            >
              {owner.name || t("anonymous")}
            </span>
          </a>
        )}

        {/* Reactions */}
        <div style={{ marginTop: "1rem" }}>
          <ReactionBar
            targetType="wing"
            targetId={wing.id}
            initialReactions={initialReactions}
          />
        </div>
      </TuscanCard>

      {/* Rooms list */}
      {rooms.length > 0 && (
        <section style={{ marginTop: "2rem", animation: `${ANIM.tuscanFadeSlideUp} 0.6s ease-out 0.15s both` }}>
          <TuscanSectionHeader>{t("rooms")}</TuscanSectionHeader>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))",
              gap: "0.75rem",
            }}
          >
            {rooms.map((room, i) => (
              <div
                key={room.id}
                role="button"
                tabIndex={0}
                style={{
                  cursor: "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out ${0.2 + i * 0.06}s both`,
                  borderRadius: "0.75rem",
                }}
                onClick={() =>
                  owner && router.push(`/visit/${owner.id}/${wing.slug}/${room.id}`)
                }
                onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && owner) { e.preventDefault(); router.push(`/visit/${owner.id}/${wing.slug}/${room.id}`); } }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
              <TuscanCard
                variant="elevated"
                padding="1rem"
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
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
                    <span style={{ marginRight: "0.5rem" }}>{room.icon}</span>
                    {room.name}
                  </div>
                  <span
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: T.color.gold,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t("exploreVisitWing")} →
                  </span>
                </div>
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
                    {room.memory_count} {t("memories")}
                  </span>
                  <span>
                    {room.visit_count} {t("visits")}
                  </span>
                </div>
              </TuscanCard>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Comments */}
      <section style={{ marginTop: "2rem", animation: `${ANIM.tuscanFadeSlideUp} 0.6s ease-out 0.3s both` }}>
        <TuscanSectionHeader>{t("comments")}</TuscanSectionHeader>
        <TuscanCard variant="glass" padding="1.25rem">
          <CommentThread
            targetType="wing"
            targetId={wing.id}
            initialComments={initialComments}
            currentUserId={currentUserId}
          />
        </TuscanCard>
      </section>
    </div>
  );
}
