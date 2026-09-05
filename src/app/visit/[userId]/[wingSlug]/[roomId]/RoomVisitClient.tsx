"use client";

import React from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import TuscanCard, { TuscanSectionHeader } from "@/components/ui/TuscanCard";
import CommentThread from "@/components/social/CommentThread";
import ReactionBar from "@/components/social/ReactionBar";
import { ANIM } from "@/components/ui/TuscanStyles";
import type { PublishedMemory } from "@/lib/social/visit-actions";
import type { Comment, ReactionSummary } from "@/lib/social/comment-actions";

interface RoomVisitClientProps {
  /** Route userId — always defined, used to build breadcrumb hrefs. */
  userId: string;
  room: {
    id: string;
    name: string;
    icon: string;
    coverHue: number;
  };
  wing: {
    id: string;
    slug: string;
    name: string;
  };
  owner: {
    id: string;
    name: string | null;
    username: string | null;
  } | null;
  memories: PublishedMemory[];
  initialComments: Comment[];
  initialReactions: ReactionSummary[];
  currentUserId?: string;
}

/** Constrain a stored memory hue toward the warm canon palette: cap saturation
 *  so vivid blues/greens stop clashing with the cream ground, and keep lightness
 *  in a soft mid-band. Returns an HSL string that harmonizes with CREAM/EMBER. */
function warmHsl(hue: number, saturation: number, lightness: number, opts?: { satCap?: number; lightBias?: number }) {
  const satCap = opts?.satCap ?? 34;
  const lightBias = opts?.lightBias ?? 0;
  const s = Math.min(saturation, satCap);
  const l = Math.min(Math.max(lightness + lightBias, 52), 78);
  return `hsl(${hue}, ${s}%, ${l}%)`;
}

function MemoryCard({
  memory,
  index,
  isMobile,
}: {
  memory: PublishedMemory;
  index: number;
  isMobile: boolean;
}) {
  const isImage = memory.type === "photo" || memory.type === "image";
  const isVideo = memory.type === "video";
  const isAudio = memory.type === "audio";
  const hasImage = isImage && (memory.file_url || memory.thumbnail_url);
  const hasVideo = isVideo && !!memory.file_url;
  const hasMedia = hasImage || hasVideo;
  // Full-saturation hue only backs real media (hidden behind the image/video).
  const bgColor = `hsl(${memory.hue}, ${memory.saturation}%, ${memory.lightness}%)`;
  // Warm, cream-friendly tones for the color-only text and audio surfaces.
  const warmBase = warmHsl(memory.hue, memory.saturation, memory.lightness);
  const warmSoft = warmHsl(memory.hue, memory.saturation, memory.lightness, { satCap: 24, lightBias: 10 });

  return (
    <TuscanCard
      variant="glass"
      padding="0"
      style={{
        overflow: "hidden",
        animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease ${0.1 + index * 0.06}s both`,
      }}
    >
      {/* Image / thumbnail */}
      {hasImage && (
        <div
          style={{
            width: "100%",
            aspectRatio: isMobile ? "4 / 3" : "16 / 10",
            overflow: "hidden",
            background: bgColor,
          }}
        >
          <img
            // Grid cards are ~16rem wide; prefer the pre-scaled thumbnail so an
            // image-heavy room doesn't download full-resolution originals into a
            // tiny card (falls back to file_url when no thumbnail exists). hasImage
            // already guards on (file_url || thumbnail_url), so this order is free.
            src={memory.thumbnail_url || memory.file_url || ""}
            alt={memory.title}
            loading="lazy"
            decoding="async"
            sizes={isMobile ? "100vw" : "16rem"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              borderRadius: 0,
            }}
          />
        </div>
      )}

      {/* Video with native controls */}
      {hasVideo && (
        <div
          style={{
            width: "100%",
            aspectRatio: isMobile ? "4 / 3" : "16 / 10",
            overflow: "hidden",
            background: bgColor,
          }}
        >
          <video
            controls
            preload="none"
            playsInline
            poster={memory.thumbnail_url || undefined}
            src={memory.file_url || undefined}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              background: "#000",
            }}
          />
        </div>
      )}

      {/* Colored header for text-only memories — warm, desaturated wash with a
          cream veil so the initial reads in ink rather than on a vivid banner. */}
      {!hasMedia && !isAudio && (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "4.5rem",
            background: `linear-gradient(135deg, ${warmBase}, ${warmSoft})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* Cream veil to knock back saturation and lift toward canon. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(135deg, rgba(252,250,245,0.42), rgba(252,250,245,0.14))",
            }}
          />
          <span
            style={{
              position: "relative",
              fontSize: "1.75rem",
              color: T.color.ink,
              opacity: 0.72,
              fontFamily: T.font.display,
              fontWeight: 600,
            }}
          >
            {memory.title?.[0]?.toUpperCase() || "?"}
          </span>
        </div>
      )}

      {/* Audio player — framed in a warm, desaturated strip with a small
          waveform glyph so the raw native control sits in canon rather than
          floating on a saturated tint. */}
      {isAudio && memory.file_url && (
        <div
          style={{
            padding: "0.875rem 1rem 0.625rem",
            background: `linear-gradient(135deg, ${warmSoft}, ${T.color.cream})`,
            borderBottom: `0.0625rem solid ${T.color.hairline}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: T.color.cream,
                border: `0.0625rem solid ${T.color.hairline}`,
                color: T.color.ember,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <path d="M4 12v0M8 8v8M12 5v14M16 8v8M20 12v0" />
              </svg>
            </span>
            <audio
              controls
              preload="none"
              src={memory.file_url}
              style={{
                flex: 1,
                minWidth: 0,
                height: "2.5rem",
                borderRadius: "0.5rem",
              }}
            />
          </div>
        </div>
      )}

      {/* Text content */}
      <div style={{ padding: "0.875rem 1rem 1rem" }}>
        <h3
          style={{
            fontFamily: T.font.display,
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: T.color.ink,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {memory.title}
        </h3>
        {memory.description && (
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.inkMuted,
              margin: "0.375rem 0 0",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {memory.description}
          </p>
        )}
      </div>
    </TuscanCard>
  );
}

// Reactions are heart-only now (ReactionBar was reduced to a single love
// toggle); the guest view mirrors that — legacy candle/key/scroll/star/amphora
// rows still exist in the DB but render nowhere.
const GUEST_REACTION_SVG: Record<string, string> = {
  heart:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
};

/** Read-only reaction summary + sign-in nudge shown to logged-out visitors,
 *  in place of the interactive ReactionBar (which needs an auth session). */
function GuestReactions({
  reactions,
  t,
}: {
  reactions: ReactionSummary[];
  t: (key: string, vars?: Record<string, string>) => string;
}) {
  const known = reactions.filter((r) => GUEST_REACTION_SVG[r.emoji] && r.count > 0);
  return (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {known.map((r) => (
        <span
          key={r.emoji}
          aria-label={t(`reaction_${r.emoji}`)}
          title={t(`reaction_${r.emoji}`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.375rem 0.625rem",
            borderRadius: "1rem",
            border: `0.0625rem solid ${T.color.hairline}`,
            background: "transparent",
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: T.color.ink,
          }}
        >
          <span
            aria-hidden="true"
            style={{ width: "1rem", height: "1rem", display: "inline-block", color: T.color.inkMuted }}
            dangerouslySetInnerHTML={{ __html: GUEST_REACTION_SVG[r.emoji] }}
          />
          <span>{r.count}</span>
        </span>
      ))}
      <a
        href="/login"
        style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: "2.75rem",
          padding: "0.375rem 0.75rem",
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: T.color.ember,
          textDecoration: "none",
          transition: "opacity 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
      >
        {t("guestReactPrompt")}
      </a>
    </div>
  );
}

export default function RoomVisitClient({
  userId,
  room,
  wing,
  owner,
  memories,
  initialComments,
  initialReactions,
  currentUserId,
}: RoomVisitClientProps) {
  const { t } = useTranslation("social");
  const isMobile = useIsMobile();
  // Compact = phone landscape / iPad split-view (≤1024px). Narrow the reading
  // column and trim the banner so the header doesn't dominate a short viewport.
  const isCompact = useIsCompact();

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: T.color.cream,
        padding: isMobile ? "1rem 0.75rem 4rem" : "2rem 1rem 4rem",
      }}
    >
      <div style={{ maxWidth: isCompact ? "48rem" : "56rem", margin: "0 auto" }}>
        {/* Breadcrumb navigation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
            flexWrap: "wrap",
            animation: `${ANIM.tuscanFadeSlideUp} 0.4s ease-out both`,
          }}
        >
          <a
            href="/explore"
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.muted,
              textDecoration: "none",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.color.ember; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.color.muted; }}
          >
            {t("exploreBackToExplore")}
          </a>
          <span style={{ color: T.color.muted, fontSize: "0.75rem" }}>/</span>

          {owner && (
            <>
              <a
                href={owner.username ? `/u/${owner.username}` : `/visit/${userId}`}
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.muted,
                  textDecoration: "none",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.color.ember; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.color.muted; }}
              >
                {owner.name || t("anonymous")}
              </a>
              <span style={{ color: T.color.muted, fontSize: "0.75rem" }}>/</span>
            </>
          )}

          {/* Wing subpage no longer exists — /visit/[userId]/[wingSlug]
              redirects to the palace overview, so link there directly to
              avoid the extra hop. */}
          <a
            href={`/visit/${userId}`}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.walnut,
              textDecoration: "none",
              fontWeight: 500,
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.color.ember; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.color.walnut; }}
          >
            {wing.name}
          </a>
        </div>

        {/* Room header */}
        <TuscanCard
          variant="glass"
          padding="0"
          style={{
            overflow: "hidden",
            animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease both`,
          }}
        >
          {/* Room color banner */}
          <div
            style={{
              height: isMobile ? "3.5rem" : isCompact ? "4rem" : "4.5rem",
              background: `linear-gradient(135deg, hsl(${room.coverHue}, 45%, 65%), hsl(${room.coverHue}, 35%, 50%))`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isMobile ? "1.5rem" : "2rem",
            }}
          >
            {room.icon}
          </div>

          <div style={{ padding: isMobile ? "1.25rem 1rem 1.5rem" : "1.5rem 1.5rem 1.75rem" }}>
            <h1
              style={{
                fontFamily: T.font.display,
                fontSize: isMobile ? "1.375rem" : "1.75rem",
                fontWeight: 600,
                color: T.color.ink,
                margin: 0,
              }}
            >
              {room.name}
            </h1>
            {owner && (
              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.muted,
                  margin: "0.375rem 0 0",
                }}
              >
                {wing.name} &middot; {owner.name || t("anonymous")}
              </p>
            )}

            {/* Reactions — interactive only for signed-in visitors, since
                toggling a reaction requires an authenticated session and would
                fail server-side for guests. Guests see the existing reaction
                counts (read-only) plus a gentle sign-in nudge. */}
            <div style={{ marginTop: "1rem" }}>
              {currentUserId ? (
                <ReactionBar
                  targetType="room"
                  targetId={room.id}
                  initialReactions={initialReactions}
                />
              ) : (
                <GuestReactions reactions={initialReactions} t={t} />
              )}
            </div>
          </div>
        </TuscanCard>

        {/* Memory gallery */}
        <section style={{
          marginTop: "2rem",
          animation: `${ANIM.tuscanFadeSlideUp} 0.6s ease-out 0.15s both`,
        }}>
          <TuscanSectionHeader>{t("memoryGallery")}</TuscanSectionHeader>

          {memories.length === 0 ? (
            <TuscanCard variant="glass" padding="2rem">
              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.9375rem",
                  color: T.color.muted,
                  textAlign: "center",
                  margin: 0,
                }}
              >
                {t("noMemories")}
              </p>
            </TuscanCard>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fill, minmax(16rem, 1fr))",
                gap: "0.875rem",
              }}
            >
              {memories.map((memory, i) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  index={i}
                  isMobile={isMobile}
                />
              ))}
            </div>
          )}
        </section>

        {/* Guestbook */}
        <section style={{
          marginTop: "2.5rem",
          animation: `${ANIM.tuscanFadeSlideUp} 0.6s ease-out 0.3s both`,
        }}>
          <TuscanSectionHeader>{t("guestbook")}</TuscanSectionHeader>
          <TuscanCard
            variant="glass"
            padding="1.25rem"
          >
            <CommentThread
              targetType="room"
              targetId={room.id}
              initialComments={initialComments}
              currentUserId={currentUserId}
            />
          </TuscanCard>
        </section>
      </div>
    </div>
  );
}
