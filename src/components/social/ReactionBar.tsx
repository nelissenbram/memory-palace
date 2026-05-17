"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { ReactionSummary } from "@/lib/social/comment-actions";
import { toggleReaction } from "@/lib/social/comment-actions";

const REACTION_EMOJIS = [
  { emoji: "candle", label: "Candle" },
  { emoji: "key", label: "Key" },
  { emoji: "scroll", label: "Scroll" },
  { emoji: "heart", label: "Heart" },
  { emoji: "star", label: "Star" },
  { emoji: "amphora", label: "Amphora" },
] as const;

const REACTION_EMOJI_SET = new Set<string>(REACTION_EMOJIS.map((r) => r.emoji));

// Palace-themed SVG reaction icons
const REACTION_SVG: Record<string, string> = {
  candle:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2c0 0-2 3-2 5s1 3 2 3 2-1 2-3-2-5-2-5z" fill="currentColor" opacity="0.3"/><rect x="10" y="10" width="4" height="10" rx="0.5"/><path d="M8 20h8"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="4"/><path d="M11 11l9 9m-2-4l3 3m-5-1l3 3"/></svg>',
  scroll:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3c-1 0-2 1-2 2v14c0 1 1 2 2 2h1V5h10c0-1-1-2-2-2H6z"/><path d="M9 5v16h9c1 0 2-1 2-2V7c0-1-1-2-2-2H9z"/><path d="M12 9h5m-5 3h5m-5 3h3"/></svg>',
  heart:
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  amphora:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3h8M9 3v2c0 2-3 4-3 8v5c0 2 2 3 6 3s6-1 6-3v-5c0-4-3-6-3-8V3"/><path d="M6 7c-2 1-3 2-3 3s1 2 3 2m12-5c2 1 3 2 3 3s-1 2-3 2"/></svg>',
};

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
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const handleToggle = (emoji: string) => {
    startTransition(async () => {
      const { reacted } = await toggleReaction({ targetType, targetId, emoji });

      setReactions((prev) => {
        const existing = prev.find((r) => r.emoji === emoji);
        if (existing) {
          const newCount = existing.count + (reacted ? 1 : -1);
          if (newCount <= 0) return prev.filter((r) => r.emoji !== emoji);
          return prev.map((r) =>
            r.emoji === emoji ? { ...r, count: newCount, reacted } : r
          );
        }
        if (reacted) return [...prev, { emoji, count: 1, reacted: true }];
        return prev;
      });

      setShowPicker(false);
    });
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "0.375rem",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {/* Existing reactions */}
      {reactions.filter((r) => REACTION_EMOJI_SET.has(r.emoji)).map((r) => (
        <button
          key={r.emoji}
          onClick={() => handleToggle(r.emoji)}
          disabled={isPending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.375rem 0.625rem",
            borderRadius: "1rem",
            border: `1px solid ${r.reacted ? T.color.gold : T.color.sandstone}`,
            background: r.reacted ? `${T.color.gold}15` : "transparent",
            cursor: "pointer",
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: r.reacted ? T.color.goldDark : T.color.walnut,
            transition: "all 0.15s ease",
          }}
          title={t(`reaction_${r.emoji}`)}
        >
          {REACTION_SVG[r.emoji] ? (
            <span
              style={{ width: "1rem", height: "1rem", display: "inline-block" }}
              dangerouslySetInnerHTML={{ __html: REACTION_SVG[r.emoji] }}
            />
          ) : (
            <span style={{ width: "1rem", height: "1rem", display: "inline-block" }}>{r.emoji}</span>
          )}
          <span>{r.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div ref={pickerRef} style={{ position: "relative" }}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          aria-label={t("addReaction")}
          style={{
            width: "2.75rem",
            height: "2.75rem",
            borderRadius: "50%",
            border: `1px dashed ${T.color.sandstone}`,
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.muted,
            transition: "border-color 0.15s ease",
          }}
          title={t("addReaction")}
        >
          +
        </button>

        {/* Picker popup */}
        {showPicker && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 0.5rem)",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "0.25rem",
              padding: "0.5rem",
              borderRadius: "0.75rem",
              background: T.color.cream,
              border: `1px solid ${T.color.sandstone}`,
              boxShadow: "0 0.25rem 1rem rgba(0,0,0,0.1)",
              zIndex: 10,
            }}
          >
            {REACTION_EMOJIS.map((r) => (
              <button
                key={r.emoji}
                onClick={() => handleToggle(r.emoji)}
                disabled={isPending}
                title={t(`reaction_${r.emoji}`)}
                style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "0.375rem",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.color.walnut,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    T.color.warmStone;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
                }}
              >
                {REACTION_SVG[r.emoji] ? (
                <span
                  style={{
                    width: "1.25rem",
                    height: "1.25rem",
                    display: "inline-block",
                  }}
                  dangerouslySetInnerHTML={{ __html: REACTION_SVG[r.emoji] }}
                />
              ) : (
                <span
                  style={{
                    width: "1.25rem",
                    height: "1.25rem",
                    display: "inline-block",
                  }}
                >{r.emoji}</span>
              )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
