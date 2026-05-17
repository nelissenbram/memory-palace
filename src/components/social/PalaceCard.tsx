"use client";

import React from "react";
import { T } from "@/lib/theme";
import TuscanCard from "@/components/ui/TuscanCard";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { DirectoryPalace } from "@/lib/social/directory-actions";

interface PalaceCardProps {
  palace: DirectoryPalace;
  onClick?: () => void;
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
        style={{ display: "flex", gap: "0.875rem", alignItems: "center" }}
      >
        {/* Avatar */}
        <div
          style={{
            width: "3.25rem",
            height: "3.25rem",
            borderRadius: "50%",
            background: palace.avatar_url
              ? `url(${palace.avatar_url}) center/cover`
              : `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
            border: `2px solid ${T.color.gold}`,
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
              color: T.color.charcoal,
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
                color: T.color.walnut,
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
                  background: `${T.color.gold}15`,
                  color: T.color.goldDark,
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
