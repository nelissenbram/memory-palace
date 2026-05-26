"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { ANIM } from "@/components/ui/TuscanStyles";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
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

function TuscanVillaSvg() {
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 320 80"
      preserveAspectRatio="xMidYMax meet"
      style={{ display: "block" }}
    >
      <rect x="0" y="72" width="320" height="8" fill={T.color.terracotta} opacity="0.12" />
      <ellipse cx="60" cy="44" rx="7" ry="26" fill={T.color.charcoal} opacity="0.18" />
      <rect x="58" y="68" width="4" height="6" fill={T.color.walnut} opacity="0.25" />
      <ellipse cx="260" cy="44" rx="7" ry="26" fill={T.color.charcoal} opacity="0.18" />
      <rect x="258" y="68" width="4" height="6" fill={T.color.walnut} opacity="0.25" />
      <rect x="110" y="34" width="100" height="38" fill={T.color.cream} opacity="0.5" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.3" />
      <polygon points="105,34 160,12 215,34" fill={T.color.terracotta} opacity="0.4" />
      <line x1="105" y1="34" x2="215" y2="34" stroke={T.color.terracotta} strokeWidth="1" strokeOpacity="0.35" />
      <line x1="160" y1="12" x2="160" y2="34" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.2" />
      <rect x="80" y="44" width="30" height="28" fill={T.color.cream} opacity="0.4" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.25" />
      <rect x="80" y="40" width="30" height="4" fill={T.color.terracotta} opacity="0.35" rx="0.5" />
      <rect x="210" y="44" width="30" height="28" fill={T.color.cream} opacity="0.4" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.25" />
      <rect x="210" y="40" width="30" height="4" fill={T.color.terracotta} opacity="0.35" rx="0.5" />
      <rect x="150" y="50" width="20" height="22" fill={T.color.walnut} opacity="0.3" rx="1" />
      <path d="M150,54 A10,10 0 0,1 170,54" fill={T.color.walnut} opacity="0.25" />
      <rect x="148" y="70" width="24" height="2" fill={T.color.sandstone} opacity="0.4" rx="0.5" />
      <rect x="120" y="44" width="14" height="16" fill={T.color.gold} opacity="0.15" rx="1" stroke={T.color.walnut} strokeWidth="0.6" strokeOpacity="0.25" />
      <rect x="116" y="43" width="4" height="18" fill={T.color.terracotta} opacity="0.3" rx="0.5" />
      <rect x="134" y="43" width="4" height="18" fill={T.color.terracotta} opacity="0.3" rx="0.5" />
      <line x1="127" y1="44" x2="127" y2="60" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.25" />
      <line x1="120" y1="52" x2="134" y2="52" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.25" />
      <rect x="186" y="44" width="14" height="16" fill={T.color.gold} opacity="0.15" rx="1" stroke={T.color.walnut} strokeWidth="0.6" strokeOpacity="0.25" />
      <rect x="182" y="43" width="4" height="18" fill={T.color.terracotta} opacity="0.3" rx="0.5" />
      <rect x="200" y="43" width="4" height="18" fill={T.color.terracotta} opacity="0.3" rx="0.5" />
      <line x1="193" y1="44" x2="193" y2="60" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.25" />
      <line x1="186" y1="52" x2="200" y2="52" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.25" />
      <rect x="88" y="52" width="10" height="12" fill={T.color.gold} opacity="0.12" rx="0.5" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.2" />
      <rect x="222" y="52" width="10" height="12" fill={T.color.gold} opacity="0.12" rx="0.5" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.2" />
      <rect x="146" y="38" width="3" height="34" fill={T.color.sandstone} opacity="0.35" rx="0.5" />
      <rect x="171" y="38" width="3" height="34" fill={T.color.sandstone} opacity="0.35" rx="0.5" />
      <rect x="145" y="36" width="5" height="3" fill={T.color.sandstone} opacity="0.4" rx="0.5" />
      <rect x="170" y="36" width="5" height="3" fill={T.color.sandstone} opacity="0.4" rx="0.5" />
      <line x1="80" y1="72" x2="110" y2="72" stroke={T.color.sandstone} strokeWidth="0.8" strokeOpacity="0.3" />
      <line x1="210" y1="72" x2="240" y2="72" stroke={T.color.sandstone} strokeWidth="0.8" strokeOpacity="0.3" />
    </svg>
  );
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
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
        padding: isMobile ? "1rem 0.75rem 4rem" : "2rem 1rem 4rem",
      }}
    >
      <div style={{ maxWidth: "52rem", margin: "0 auto" }}>
        {/* Back to explore / profile */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1rem",
            animation: `${ANIM.tuscanFadeSlideUp} 0.4s ease-out both`,
          }}
        >
          <a
            href="/explore"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              color: T.color.walnut,
              textDecoration: "none",
              padding: "0.5rem 0",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.color.goldDark; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.color.walnut; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {t("exploreBackToExplore")}
          </a>

          {owner?.username && (
            <>
              <span style={{ color: T.color.muted, fontSize: "0.75rem" }}>/</span>
              <a
                href={`/u/${owner.username}`}
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.875rem",
                  color: T.color.walnut,
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.color.goldDark; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.color.walnut; }}
              >
                {owner.name || `@${owner.username}`}
              </a>
            </>
          )}
        </div>

        {/* Wing header with villa illustration */}
        <TuscanCard
          variant="glass"
          padding="0"
          style={{
            overflow: "hidden",
            animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out both`,
          }}
        >
          {/* Villa illustration header */}
          <div style={{
            width: "100%",
            height: isMobile ? "5rem" : "6rem",
            overflow: "hidden",
            background: `linear-gradient(135deg, ${wing.accentColor || T.color.gold}18, ${T.color.terracotta}12)`,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}>
            <TuscanVillaSvg />
          </div>

          <div style={{ padding: isMobile ? "1.25rem 1rem 1.5rem" : "1.5rem 1.5rem 1.75rem" }}>
            <h1
              style={{
                fontFamily: T.font.display,
                fontSize: isMobile ? "1.5rem" : "1.75rem",
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
                  margin: "0.5rem 0 0",
                  lineHeight: 1.6,
                }}
              >
                {wing.description}
              </p>
            )}

            {/* Owner attribution */}
            {owner && (
              <a
                href={owner.username ? `/u/${owner.username}` : undefined}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginTop: "1rem",
                  textDecoration: "none",
                  padding: "0.375rem 0.75rem 0.375rem 0.375rem",
                  borderRadius: "2rem",
                  background: `${T.color.sandstone}20`,
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${T.color.sandstone}35`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = `${T.color.sandstone}20`; }}
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
                    fontWeight: 500,
                  }}
                >
                  {owner.name || t("anonymous")}
                </span>
              </a>
            )}

            {/* Walk Through 3D + Reactions */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginTop: "1rem",
              flexWrap: "wrap",
            }}>
              <a
                href={`/visit/${owner?.id}/${wing.slug}/walk`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.625rem 1.25rem",
                  borderRadius: "2rem",
                  background: `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
                  color: "#fff",
                  fontFamily: T.font.display,
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                {t("walkThrough3D")}
              </a>
              <ReactionBar
                targetType="wing"
                targetId={wing.id}
                initialReactions={initialReactions}
              />
            </div>
          </div>
        </TuscanCard>

        {/* Rooms list */}
        {rooms.length > 0 && (
          <section style={{
            marginTop: "2rem",
            animation: `${ANIM.tuscanFadeSlideUp} 0.6s ease-out 0.15s both`,
          }}>
            <TuscanSectionHeader>{t("rooms")}</TuscanSectionHeader>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fill, minmax(15rem, 1fr))",
                gap: "0.875rem",
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
                  <TuscanCard variant="elevated" padding="0" style={{ overflow: "hidden" }}>
                    {/* Room color header */}
                    <div
                      style={{
                        height: "3rem",
                        background: `linear-gradient(135deg, hsl(${room.cover_hue ?? 30}, 45%, 65%), hsl(${room.cover_hue ?? 30}, 35%, 55%))`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.375rem",
                      }}
                    >
                      {room.icon}
                    </div>
                    <div style={{ padding: "0.875rem 1rem 1rem" }}>
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
                            fontSize: "1.0625rem",
                            fontWeight: 600,
                            color: T.color.charcoal,
                          }}
                        >
                          {room.name}
                        </div>
                        <span
                          style={{
                            fontFamily: T.font.body,
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: T.color.goldDark,
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
                          marginTop: "0.375rem",
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
                    </div>
                  </TuscanCard>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Comments */}
        <section style={{
          marginTop: "2rem",
          animation: `${ANIM.tuscanFadeSlideUp} 0.6s ease-out 0.3s both`,
        }}>
          <TuscanSectionHeader>{t("guestbook")}</TuscanSectionHeader>
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
    </div>
  );
}
