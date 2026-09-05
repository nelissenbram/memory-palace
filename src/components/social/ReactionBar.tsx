"use client";

import React, { useState, useTransition, useRef } from "react";
import { T } from "@/lib/theme";
import { INK, HAIRLINE, EMBER, EMBER_GLYPH } from "@/lib/libraryTokens";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { ReactionSummary } from "@/lib/social/comment-actions";
import { toggleReaction } from "@/lib/social/comment-actions";

// The reaction system is deliberately limited to a single "heart" (love)
// reaction. Legacy non-heart reactions (candle/key/scroll/star/amphora) may
// still exist as DB rows for other users, but they are never rendered — the
// count shown is the heart count only.
const HEART = "heart";

interface ReactionBarProps {
  targetType: string;
  targetId: string;
  initialReactions: ReactionSummary[];
}

export default function ReactionBar({
  targetType,
  targetId,
  initialReactions,
}: ReactionBarProps) {
  const { t } = useTranslation("social");
  const [reactions, setReactions] = useState<ReactionSummary[]>(initialReactions);
  const [isPending, startTransition] = useTransition();
  // Monotonic token guarding against out-of-order toggle responses: only the
  // most recently started toggle may commit the authoritative server summary.
  const toggleSeqRef = useRef(0);

  const heart = reactions.find((r) => r.emoji === HEART);
  const heartCount = heart?.count ?? 0;
  const hearted = heart?.reacted ?? false;

  const handleToggle = () => {
    const seq = ++toggleSeqRef.current;
    startTransition(async () => {
      const { reacted, summary } = await toggleReaction({
        targetType,
        targetId,
        emoji: HEART,
      });

      // Ignore a stale response if a newer toggle has since started, so an
      // out-of-order server reply can't clobber fresher state (last-write race).
      if (seq !== toggleSeqRef.current) return;

      // toggleReaction returns the authoritative fresh summary in the same
      // round-trip, so no separate getReactions read is needed. This keeps
      // cross-user heart counts accurate.
      if (summary) {
        setReactions(summary);
        return;
      }

      // Fallback (e.g. unauthenticated, where no summary is returned): apply the
      // optimistic delta so this viewer still sees instant feedback.
      setReactions((prev) => {
        const existing = prev.find((r) => r.emoji === HEART);
        if (existing) {
          const newCount = existing.count + (reacted ? 1 : -1);
          if (newCount <= 0) return prev.filter((r) => r.emoji !== HEART);
          return prev.map((r) =>
            r.emoji === HEART ? { ...r, count: newCount, reacted } : r
          );
        }
        if (reacted) return [...prev, { emoji: HEART, count: 1, reacted: true }];
        return prev;
      });
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <button
        onClick={handleToggle}
        disabled={isPending}
        aria-label={t("reaction_heart")}
        aria-pressed={hearted}
        title={t("reaction_heart")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.375rem",
          minHeight: "2.75rem",
          minWidth: "2.75rem",
          padding: "0.5rem 0.875rem",
          borderRadius: "1.375rem",
          border: `0.0625rem solid ${hearted ? EMBER : HAIRLINE}`,
          background: hearted ? `${EMBER}15` : "transparent",
          cursor: "pointer",
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          color: hearted ? EMBER_GLYPH : INK,
          transition:
            "border-color 0.15s ease, background 0.15s ease, color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (!hearted) {
            (e.currentTarget as HTMLElement).style.background = T.color.warmStone;
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = hearted
            ? `${EMBER}15`
            : "transparent";
        }}
      >
        {/* Line-art heart; fills with the ember accent when hearted. */}
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={hearted ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          style={{ display: "inline-block", flexShrink: 0 }}
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        {heartCount > 0 && <span>{heartCount}</span>}
      </button>
    </div>
  );
}
