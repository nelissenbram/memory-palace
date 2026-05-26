"use client";

import React from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import TuscanCard, { TuscanSectionHeader } from "@/components/ui/TuscanCard";
import CommentThread from "@/components/social/CommentThread";
import ReactionBar from "@/components/social/ReactionBar";
import { ANIM } from "@/components/ui/TuscanStyles";
import type { PublishedMemory } from "@/lib/social/visit-actions";
import type { Comment, ReactionSummary } from "@/lib/social/comment-actions";

interface RoomVisitClientProps {
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

function MemoryCard({
  memory,
  index,
  isMobile,
}: {
  memory: PublishedMemory;
  index: number;
  isMobile: boolean;
}) {
  const isImage =
    memory.type === "photo" || memory.type === "image" || memory.type === "video";
  const isAudio = memory.type === "audio";
  const hasMedia = isImage && (memory.file_url || memory.thumbnail_url);
  const bgColor = `hsl(${memory.hue}, ${memory.saturation}%, ${memory.lightness}%)`;

  return (
    <TuscanCard
      variant="glass"
      padding="0"
      style={{
        overflow: "hidden",
        animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease ${index * 0.06}s both`,
      }}
    >
      {/* Image / thumbnail */}
      {hasMedia && (
        <div
          style={{
            width: "100%",
            aspectRatio: isMobile ? "4 / 3" : "16 / 10",
            overflow: "hidden",
            background: bgColor,
          }}
        >
          <img
            src={memory.file_url || memory.thumbnail_url || ""}
            alt={memory.title}
            loading="lazy"
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

      {/* Colored header for text-only memories */}
      {!hasMedia && !isAudio && (
        <div
          style={{
            width: "100%",
            height: "4.5rem",
            background: `linear-gradient(135deg, ${bgColor}, hsl(${memory.hue}, ${Math.max(memory.saturation - 10, 0)}%, ${Math.min(memory.lightness + 15, 90)}%))`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.5rem",
            color: "rgba(255,255,255,0.8)",
            fontFamily: T.font.display,
            fontWeight: 600,
          }}
        >
          {memory.title?.[0]?.toUpperCase() || "?"}
        </div>
      )}

      {/* Audio player */}
      {isAudio && memory.file_url && (
        <div
          style={{
            padding: "1rem 1rem 0.5rem",
            background: `linear-gradient(135deg, ${bgColor}30, transparent)`,
          }}
        >
          <audio
            controls
            preload="none"
            src={memory.file_url}
            style={{
              width: "100%",
              height: "2.5rem",
              borderRadius: "0.5rem",
            }}
          />
        </div>
      )}

      {/* Text content */}
      <div style={{ padding: "0.875rem 1rem 1rem" }}>
        <h3
          style={{
            fontFamily: T.font.display,
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: T.color.charcoal,
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
              color: T.color.walnut,
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

export default function RoomVisitClient({
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 50%, ${T.color.sandstone}40 100%)`,
        padding: isMobile ? "1rem 0.75rem 4rem" : "2rem 1rem 4rem",
      }}
    >
      <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
        {/* Back button */}
        <a
          href={`/visit/${owner?.id}/${wing.slug}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.walnut,
            textDecoration: "none",
            padding: "0.5rem 0",
            marginBottom: "1rem",
            transition: "color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = T.color.goldDark;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = T.color.walnut;
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {t("backToWing", { name: wing.name })}
        </a>

        {/* Room header */}
        <TuscanCard
          variant="glass"
          padding="1.5rem"
          style={{
            animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease both`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                width: "3rem",
                height: "3rem",
                borderRadius: "0.75rem",
                background: `linear-gradient(135deg, hsl(${room.coverHue}, 45%, 65%), hsl(${room.coverHue}, 35%, 50%))`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                flexShrink: 0,
              }}
            >
              {room.icon}
            </div>
            <div>
              <h1
                style={{
                  fontFamily: T.font.display,
                  fontSize: isMobile ? "1.375rem" : "1.75rem",
                  fontWeight: 600,
                  color: T.color.charcoal,
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
                    margin: "0.25rem 0 0",
                  }}
                >
                  {wing.name} &middot; {owner.name || t("anonymous")}
                </p>
              )}
            </div>
          </div>

          {/* Reactions */}
          <div style={{ marginTop: "1rem" }}>
            <ReactionBar
              targetType="room"
              targetId={room.id}
              initialReactions={initialReactions}
            />
          </div>
        </TuscanCard>

        {/* Memory gallery */}
        <section style={{ marginTop: "2rem" }}>
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
        <section style={{ marginTop: "2.5rem" }}>
          <TuscanSectionHeader>{t("guestbook")}</TuscanSectionHeader>
          <TuscanCard
            variant="glass"
            padding="1.25rem"
            style={{
              animation: `${ANIM.tuscanFadeSlideUp} 0.5s ease 0.2s both`,
            }}
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
