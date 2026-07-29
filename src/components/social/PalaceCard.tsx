"use client";

import React, { useSyncExternalStore } from "react";
import { T } from "@/lib/theme";
import TuscanCard from "@/components/ui/TuscanCard";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { DirectoryPalace } from "@/lib/social/directory-actions";

/** Canon interactive/CTA color. */
const EMBER = "#B85C38";
const EMBER_DEEP = "#9A4F2A";
/** Canon recessed tray for neutral chips (libraryTokens TRAY). */
const TRAY = "#F6EBE3";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/** True when the user has requested reduced motion (SSR-safe). */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(REDUCED_MOTION_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

interface PalaceCardProps {
  palace: DirectoryPalace;
  onClick?: () => void;
}

/**
 * Loading placeholder for a PalaceCard. Mirrors the real card's footprint so
 * rails don't reflow on hydration. The shimmer sweep is suppressed under
 * prefers-reduced-motion (a calm static tint is shown instead).
 */
export function PalaceCardSkeleton() {
  const reduceMotion = useReducedMotion();

  // Warm recessed tray as the base, with a slightly lighter cream highlight
  // sweeping across — all in-canon (no cool greys, no gold).
  const shimmer: React.CSSProperties = reduceMotion
    ? { background: TRAY }
    : {
        background: `linear-gradient(100deg, ${TRAY} 30%, #FBF3EC 50%, ${TRAY} 70%)`,
        backgroundSize: "200% 100%",
        animation: "mp-palace-card-shimmer 1.4s ease-in-out infinite",
      };

  const block = (w: string, h: string, extra?: React.CSSProperties): React.CSSProperties => ({
    width: w,
    height: h,
    borderRadius: "0.375rem",
    ...shimmer,
    ...extra,
  });

  return (
    <TuscanCard variant="elevated" padding="1.25rem">
      {/* Keyframes are inert under reduced-motion since the animation is unset. */}
      <style>{`@keyframes mp-palace-card-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div
        aria-hidden="true"
        style={{ display: "flex", gap: "0.875rem", alignItems: "center" }}
      >
        <div
          style={{
            width: "3.25rem",
            height: "3.25rem",
            borderRadius: "50%",
            flexShrink: 0,
            border: `1px solid ${T.color.hairline}`,
            ...shimmer,
          }}
        />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={block("55%", "1.125rem")} />
          <div style={block("35%", "0.8125rem")} />
          <div style={block("90%", "0.8125rem", { marginTop: "0.25rem" })} />
        </div>
      </div>
    </TuscanCard>
  );
}

export default function PalaceCard({ palace, onClick }: PalaceCardProps) {
  const { t } = useTranslation("social");

  return (
    <TuscanCard
      variant="elevated"
      padding="1.25rem"
      style={{ cursor: onClick ? "pointer" : undefined }}
    >
      <div
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={palace.display_name || t("anonymous")}
        onKeyDown={(e) => {
          if (onClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick();
          }
        }}
        onFocus={(e) => {
          if (!onClick) return;
          // The one legitimate use of gold on this surface: keyboard focus ring.
          e.currentTarget.style.outline = `0.1875rem solid ${T.color.gold}`;
          e.currentTarget.style.outlineOffset = "0.1875rem";
          e.currentTarget.style.borderRadius = "0.75rem";
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = "none";
        }}
        style={{ display: "flex", gap: "0.875rem", alignItems: "center" }}
      >
        {/* Avatar — name is already announced via the row's aria-label. */}
        <div
          aria-hidden="true"
          style={{
            width: "3.25rem",
            height: "3.25rem",
            borderRadius: "50%",
            background: palace.avatar_url
              ? `url(${palace.avatar_url}) center/cover`
              : `linear-gradient(135deg, ${EMBER}, ${EMBER_DEEP})`,
            border: `1px solid ${T.color.hairline}`,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.color.cream,
            fontFamily: T.font.display,
            fontSize: "1.25rem",
            fontWeight: 600,
          }}
        >
          {!palace.avatar_url &&
            (palace.display_name?.[0]?.toUpperCase() || "?")}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: T.font.display,
              fontSize: "1.125rem",
              fontWeight: 600,
              color: T.color.ink,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {palace.display_name || t("anonymous")}
          </div>
          {palace.username && (
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: T.color.muted,
                marginTop: "0.125rem",
              }}
            >
              @{palace.username}
            </div>
          )}
          {palace.bio && (
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: T.color.muted,
                margin: "0.375rem 0 0",
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {palace.bio}
            </p>
          )}

          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginTop: "0.5rem",
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
            }}
          >
            {palace.total_visit_count > 0 && (
              <span>
                {palace.total_visit_count} {t("visits")}
              </span>
            )}
            {palace.category && (
              <span
                style={{
                  padding: "0.125rem 0.5rem",
                  borderRadius: "1rem",
                  // Canon: neutral recessed tray, not ceremonial palace-gold.
                  background: TRAY,
                  border: `1px solid ${T.color.hairline}`,
                  color: T.color.muted,
                  fontWeight: 500,
                }}
              >
                {palace.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </TuscanCard>
  );
}
