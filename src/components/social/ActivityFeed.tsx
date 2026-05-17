"use client";

import React, { useState, useCallback, useTransition } from "react";
import { T } from "@/lib/theme";
import TuscanCard from "@/components/ui/TuscanCard";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { FeedItem } from "@/lib/social/feed-actions";
import { getFeed, getUserActivities } from "@/lib/social/feed-actions";

interface ActivityFeedProps {
  initialItems: FeedItem[];
  initialCursor: string | null;
  userId?: string;
}

const ACTION_ICONS: Record<string, string> = {
  shared_room: "\u273F",
  shared_wing: "\u273F",
  commented: "\u270E",
  reacted: "\u2764",
  followed: "\u2726",
  visited: "\u21E8",
  published: "\u2691",
  achieved: "\u269C",
  grounded_memory: "\u2756",
};

function timeAgo(dateStr: string, t: (k: string, p?: Record<string, string>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("justNow");
  if (mins < 60) return t("minutesAgo", { count: String(mins) });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("hoursAgo", { count: String(hours) });
  const days = Math.floor(hours / 24);
  if (days === 1) return t("yesterday");
  return t("daysAgo", { count: String(days) });
}

export default function ActivityFeed({
  initialItems,
  initialCursor,
  userId,
}: ActivityFeedProps) {
  const { t } = useTranslation("social");
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isPending, startTransition] = useTransition();

  const loadMore = useCallback(() => {
    if (!cursor || isPending) return;
    startTransition(async () => {
      const { items: more, nextCursor } = userId
        ? await getUserActivities(userId, cursor)
        : await getFeed(cursor);
      setItems((prev) => [...prev, ...more]);
      setCursor(nextCursor);
    });
  }, [cursor, isPending]);

  function getActionText(item: FeedItem): string {
    const name = item.actor_name || t("someone");
    const targetName =
      (item.metadata?.roomName as string) ||
      (item.metadata?.wingName as string) ||
      "";

    switch (item.action_type) {
      case "published":
        return t("feedPublished", { name, target: targetName });
      case "followed":
        return t("feedFollowed", { name });
      case "commented":
        return t("feedCommented", { name, target: targetName });
      case "reacted":
        return t("feedReacted", { name, target: targetName });
      case "visited":
        return t("feedVisited", { name, target: targetName });
      case "shared_room":
      case "shared_wing":
        return t("feedShared", { name, target: targetName });
      case "achieved":
        return t("feedAchieved", { name });
      case "grounded_memory":
        return t("feedGrounded", { name });
      default:
        return `${name} ${item.action_type}`;
    }
  }

  if (items.length === 0) {
    return (
      <TuscanCard variant="glass" padding="2rem">
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.9375rem",
            color: T.color.muted,
            textAlign: "center",
          }}
        >
          {t("feedEmpty")}
        </p>
      </TuscanCard>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {items.map((item) => (
        <TuscanCard
          key={item.id}
          variant="glass"
          padding="1rem"
          animate={false}
        >
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            {/* Actor avatar */}
            <div
              style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "50%",
                background: item.actor_avatar
                  ? `url(${item.actor_avatar}) center/cover`
                  : `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
                border: `1.5px solid ${T.color.goldLight}`,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.color.cream,
                fontFamily: T.font.display,
                fontSize: "0.875rem",
                fontWeight: 600,
              }}
            >
              {!item.actor_avatar &&
                (item.actor_name?.[0]?.toUpperCase() || "?")}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Action icon + text */}
              <div style={{ display: "flex", gap: "0.375rem", alignItems: "baseline" }}>
                <span style={{ fontSize: "0.75rem" }} aria-hidden="true">
                  {ACTION_ICONS[item.action_type] || "\u25CF"}
                </span>
                <span
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.875rem",
                    color: T.color.charcoal,
                    lineHeight: 1.5,
                  }}
                >
                  {getActionText(item)}
                </span>
              </div>

              {/* Preview text from metadata */}
              {typeof item.metadata?.bodyPreview === "string" && (
                <p
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.8125rem",
                    color: T.color.muted,
                    margin: "0.25rem 0 0",
                    fontStyle: "italic",
                  }}
                >
                  &ldquo;{String(item.metadata.bodyPreview)}&rdquo;
                </p>
              )}

              {/* Timestamp */}
              <span
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.75rem",
                  color: T.color.muted,
                  marginTop: "0.25rem",
                  display: "block",
                }}
              >
                {timeAgo(item.created_at, t)}
              </span>
            </div>
          </div>
        </TuscanCard>
      ))}

      {cursor && (
        <button
          onClick={loadMore}
          disabled={isPending}
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            fontWeight: 500,
            padding: "0.75rem",
            borderRadius: "0.75rem",
            border: `1px solid ${T.color.sandstone}`,
            background: "transparent",
            color: T.color.walnut,
            cursor: isPending ? "wait" : "pointer",
            opacity: isPending ? 0.5 : 1,
            marginTop: "0.5rem",
          }}
        >
          {isPending ? t("loading") : t("loadMore")}
        </button>
      )}
    </div>
  );
}
