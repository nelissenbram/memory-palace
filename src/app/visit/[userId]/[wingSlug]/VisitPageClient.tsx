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

function TuscanVillaSvg({ height = "100%" }: { height?: string }) {
  return (
    <svg
      width="100%" height={height}
      viewBox="0 0 400 100"
      preserveAspectRatio="xMidYMax meet"
      style={{ display: "block" }}
    >
      {/* Sky gradient */}
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.color.gold} stopOpacity="0.06" />
          <stop offset="100%" stopColor={T.color.terracotta} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="400" height="100" fill="url(#skyGrad)" />

      {/* Ground with path */}
      <rect x="0" y="88" width="400" height="12" fill={T.color.terracotta} opacity="0.1" />
      <rect x="170" y="88" width="60" height="12" fill={T.color.sandstone} opacity="0.15" rx="1" />

      {/* Left cypress tree */}
      <ellipse cx="55" cy="50" rx="8" ry="32" fill={T.color.charcoal} opacity="0.15" />
      <rect x="53" y="80" width="4" height="10" fill={T.color.walnut} opacity="0.2" />
      {/* Left small bush */}
      <ellipse cx="35" cy="82" rx="12" ry="6" fill={T.color.charcoal} opacity="0.08" />

      {/* Right cypress tree */}
      <ellipse cx="345" cy="50" rx="8" ry="32" fill={T.color.charcoal} opacity="0.15" />
      <rect x="343" y="80" width="4" height="10" fill={T.color.walnut} opacity="0.2" />
      {/* Right small bush */}
      <ellipse cx="365" cy="82" rx="12" ry="6" fill={T.color.charcoal} opacity="0.08" />

      {/* Main villa body */}
      <rect x="130" y="38" width="140" height="50" fill={T.color.cream} opacity="0.55" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.25" />

      {/* Pediment / roof */}
      <polygon points="122,38 200,10 278,38" fill={T.color.terracotta} opacity="0.4" />
      <line x1="122" y1="38" x2="278" y2="38" stroke={T.color.terracotta} strokeWidth="1.2" strokeOpacity="0.35" />
      {/* Roof ridge */}
      <line x1="200" y1="10" x2="200" y2="38" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.15" />
      {/* Pediment ornament */}
      <circle cx="200" cy="26" r="4" fill={T.color.gold} opacity="0.12" />

      {/* Left wing */}
      <rect x="88" y="50" width="42" height="38" fill={T.color.cream} opacity="0.45" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.2" />
      <rect x="88" y="46" width="42" height="4" fill={T.color.terracotta} opacity="0.35" rx="0.5" />

      {/* Right wing */}
      <rect x="270" y="50" width="42" height="38" fill={T.color.cream} opacity="0.45" stroke={T.color.terracotta} strokeWidth="0.5" strokeOpacity="0.2" />
      <rect x="270" y="46" width="42" height="4" fill={T.color.terracotta} opacity="0.35" rx="0.5" />

      {/* Grand arched doorway */}
      <rect x="188" y="58" width="24" height="30" fill={T.color.walnut} opacity="0.3" rx="1" />
      <path d="M188,64 A12,12 0 0,1 212,64" fill={T.color.walnut} opacity="0.25" />
      {/* Door step */}
      <rect x="185" y="86" width="30" height="3" fill={T.color.sandstone} opacity="0.4" rx="1" />
      {/* Door handle */}
      <circle cx="207" cy="74" r="1.5" fill={T.color.gold} opacity="0.25" />

      {/* Columns at entrance */}
      <rect x="182" y="42" width="4" height="46" fill={T.color.sandstone} opacity="0.4" rx="0.5" />
      <rect x="214" y="42" width="4" height="46" fill={T.color.sandstone} opacity="0.4" rx="0.5" />
      {/* Column capitals */}
      <rect x="180" y="40" width="8" height="3" fill={T.color.sandstone} opacity="0.45" rx="1" />
      <rect x="212" y="40" width="8" height="3" fill={T.color.sandstone} opacity="0.45" rx="1" />

      {/* Main windows with shutters (left) */}
      <rect x="142" y="50" width="18" height="20" fill={T.color.gold} opacity="0.12" rx="1" stroke={T.color.walnut} strokeWidth="0.6" strokeOpacity="0.2" />
      <rect x="137" y="49" width="5" height="22" fill={T.color.terracotta} opacity="0.28" rx="0.5" />
      <rect x="160" y="49" width="5" height="22" fill={T.color.terracotta} opacity="0.28" rx="0.5" />
      <line x1="151" y1="50" x2="151" y2="70" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.2" />
      <line x1="142" y1="60" x2="160" y2="60" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.2" />

      {/* Main windows with shutters (right) */}
      <rect x="240" y="50" width="18" height="20" fill={T.color.gold} opacity="0.12" rx="1" stroke={T.color.walnut} strokeWidth="0.6" strokeOpacity="0.2" />
      <rect x="235" y="49" width="5" height="22" fill={T.color.terracotta} opacity="0.28" rx="0.5" />
      <rect x="258" y="49" width="5" height="22" fill={T.color.terracotta} opacity="0.28" rx="0.5" />
      <line x1="249" y1="50" x2="249" y2="70" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.2" />
      <line x1="240" y1="60" x2="258" y2="60" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.2" />

      {/* Wing windows */}
      <rect x="100" y="58" width="14" height="16" fill={T.color.gold} opacity="0.1" rx="0.5" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.18" />
      <rect x="286" y="58" width="14" height="16" fill={T.color.gold} opacity="0.1" rx="0.5" stroke={T.color.walnut} strokeWidth="0.4" strokeOpacity="0.18" />

      {/* Balustrade walls */}
      <line x1="88" y1="88" x2="130" y2="88" stroke={T.color.sandstone} strokeWidth="1" strokeOpacity="0.25" />
      <line x1="270" y1="88" x2="312" y2="88" stroke={T.color.sandstone} strokeWidth="1" strokeOpacity="0.25" />

      {/* Decorative flower pots */}
      <rect x="175" y="84" width="6" height="4" fill={T.color.terracotta} opacity="0.2" rx="0.5" />
      <ellipse cx="178" cy="82" rx="4" ry="3" fill={T.color.charcoal} opacity="0.08" />
      <rect x="219" y="84" width="6" height="4" fill={T.color.terracotta} opacity="0.2" rx="0.5" />
      <ellipse cx="222" cy="82" rx="4" ry="3" fill={T.color.charcoal} opacity="0.08" />
    </svg>
  );
}

/** Small arched door SVG for room cards */
function RoomDoorSvg({ hue }: { hue: number }) {
  const doorColor = `hsl(${hue}, 30%, 45%)`;
  const archColor = `hsl(${hue}, 25%, 55%)`;
  return (
    <svg width="100%" height="100%" viewBox="0 0 120 60" preserveAspectRatio="xMidYMax meet" style={{ display: "block" }}>
      {/* Subtle background */}
      <rect x="0" y="0" width="120" height="60" fill={`hsl(${hue}, 35%, 60%)`} opacity="0.08" />

      {/* Wall texture */}
      <rect x="0" y="52" width="120" height="8" fill={T.color.sandstone} opacity="0.15" />

      {/* Arched doorway */}
      <rect x="42" y="20" width="36" height="32" fill={doorColor} opacity="0.25" rx="1" />
      <path d="M42,28 A18,18 0 0,1 78,28" fill={archColor} opacity="0.2" />

      {/* Arch surround */}
      <path d="M38,52 L38,26 A22,22 0 0,1 82,26 L82,52" fill="none" stroke={T.color.sandstone} strokeWidth="3" strokeOpacity="0.2" />

      {/* Keystone */}
      <rect x="57" y="8" width="6" height="8" fill={T.color.sandstone} opacity="0.25" rx="1" />

      {/* Door handle */}
      <circle cx="70" cy="38" r="2" fill={T.color.gold} opacity="0.3" />

      {/* Step */}
      <rect x="38" y="50" width="44" height="3" fill={T.color.sandstone} opacity="0.2" rx="0.5" />

      {/* Side sconces */}
      <rect x="28" y="28" width="4" height="6" fill={T.color.gold} opacity="0.15" rx="1" />
      <rect x="88" y="28" width="4" height="6" fill={T.color.gold} opacity="0.15" rx="1" />
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
  const accent = wing.accentColor || T.color.gold;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
        padding: isMobile ? "1rem 0.75rem 4rem" : "2rem 1rem 4rem",
      }}
    >
      <div style={{ maxWidth: "52rem", margin: "0 auto" }}>
        {/* Breadcrumb navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
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
              fontSize: "0.8125rem",
              color: T.color.muted,
              textDecoration: "none",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.color.goldDark; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.color.muted; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {t("exploreBackToExplore")}
          </a>

          {owner?.username && (
            <>
              <span style={{ color: T.color.muted, fontSize: "0.625rem" }}>/</span>
              <a
                href={`/u/${owner.username}`}
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
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

        {/* Grand villa header card */}
        <TuscanCard
          variant="glass"
          padding="0"
          style={{
            overflow: "hidden",
            animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease-out both`,
          }}
        >
          {/* Expanded villa illustration */}
          <div style={{
            width: "100%",
            height: isMobile ? "6rem" : "8rem",
            overflow: "hidden",
            background: `linear-gradient(135deg, ${accent}15, ${T.color.terracotta}08, ${T.color.linen}40)`,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}>
            <TuscanVillaSvg />
          </div>

          <div style={{ padding: isMobile ? "1.25rem 1rem 1.5rem" : "1.75rem 2rem 2rem" }}>
            {/* Wing name */}
            <h1
              style={{
                fontFamily: T.font.display,
                fontSize: isMobile ? "1.5rem" : "2rem",
                fontWeight: 600,
                color: T.color.charcoal,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {wing.name}
            </h1>

            {/* Description */}
            {wing.description && (
              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.9375rem",
                  color: T.color.walnut,
                  margin: "0.5rem 0 0",
                  lineHeight: 1.65,
                  maxWidth: "36rem",
                }}
              >
                {wing.description}
              </p>
            )}

            {/* Owner attribution pill */}
            {owner && (
              <a
                href={owner.username ? `/u/${owner.username}` : undefined}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginTop: "1.25rem",
                  textDecoration: "none",
                  padding: "0.375rem 0.875rem 0.375rem 0.375rem",
                  borderRadius: "2rem",
                  background: `${T.color.sandstone}20`,
                  border: `1px solid ${T.color.sandstone}25`,
                  transition: "background 0.15s ease, border-color 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${T.color.sandstone}35`; e.currentTarget.style.borderColor = `${T.color.sandstone}40`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = `${T.color.sandstone}20`; e.currentTarget.style.borderColor = `${T.color.sandstone}25`; }}
              >
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
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

            {/* Actions row: 3D walkthrough + reactions */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginTop: "1.25rem",
              paddingTop: "1.25rem",
              borderTop: `1px solid ${T.color.lineFaint}`,
              flexWrap: "wrap",
            }}>
              {rooms.length > 0 && (
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
              )}
              <ReactionBar
                targetType="wing"
                targetId={wing.id}
                initialReactions={initialReactions}
              />
            </div>
          </div>
        </TuscanCard>

        {/* Rooms as Tuscan doors */}
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
                    {/* Arched door header */}
                    <div style={{
                      height: isMobile ? "3.5rem" : "4rem",
                      background: `linear-gradient(135deg, hsl(${room.cover_hue ?? 30}, 40%, 70%), hsl(${room.cover_hue ?? 30}, 30%, 58%))`,
                      overflow: "hidden",
                    }}>
                      <RoomDoorSvg hue={room.cover_hue ?? 30} />
                    </div>
                    <div style={{ padding: "0.875rem 1rem 1rem" }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}>
                        <div style={{
                          fontFamily: T.font.display,
                          fontSize: "1.0625rem",
                          fontWeight: 600,
                          color: T.color.charcoal,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.375rem",
                        }}>
                          <span>{room.icon}</span>
                          {room.name}
                        </div>
                        <span style={{
                          fontFamily: T.font.body,
                          fontSize: "0.6875rem",
                          fontWeight: 500,
                          color: T.color.goldDark,
                          whiteSpace: "nowrap",
                        }}>
                          {t("exploreVisitWing")} →
                        </span>
                      </div>
                      <div style={{
                        display: "flex",
                        gap: "0.75rem",
                        marginTop: "0.375rem",
                        fontFamily: T.font.body,
                        fontSize: "0.6875rem",
                        color: T.color.muted,
                      }}>
                        <span>{room.memory_count} {t("memories")}</span>
                        <span>{room.visit_count} {t("visits")}</span>
                      </div>
                    </div>
                  </TuscanCard>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Guestbook with decorative header */}
        <section style={{
          marginTop: "2.5rem",
          animation: `${ANIM.tuscanFadeSlideUp} 0.6s ease-out 0.3s both`,
        }}>
          <TuscanSectionHeader>{t("guestbook")}</TuscanSectionHeader>
          <TuscanCard variant="glass" padding="0" style={{ overflow: "hidden" }}>
            {/* Decorative top bar */}
            <div style={{
              height: "0.25rem",
              background: `linear-gradient(90deg, ${T.color.gold}60, ${T.color.terracotta}40, ${T.color.gold}60)`,
            }} />
            <div style={{ padding: "1.25rem" }}>
              <CommentThread
                targetType="wing"
                targetId={wing.id}
                initialComments={initialComments}
                currentUserId={currentUserId}
              />
            </div>
          </TuscanCard>
        </section>
      </div>
    </div>
  );
}
