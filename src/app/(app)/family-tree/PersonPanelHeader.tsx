"use client";

import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { glassBorder } from "./PersonPanelShared";

interface PersonPanelHeaderProps {
  fullName: string;
  isCurrentUser: boolean;
  relationToSelf: string | null;
  onClose: () => void;
}

export default function PersonPanelHeader({
  fullName,
  isCurrentUser,
  relationToSelf,
  onClose,
}: PersonPanelHeaderProps) {
  const { t } = useTranslation("familyTree");

  return (
    <div
      style={{
        padding: "1.25rem 1.5rem",
        borderBottom: `1px solid ${T.color.gold}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(255,255,255,0.3)",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h2
            style={{
              fontFamily: T.font.display,
              fontSize: "1.375rem",
              fontWeight: 600,
              color: T.color.charcoal,
              margin: 0,
            }}
          >
            {fullName}
          </h2>
          {isCurrentUser && (
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: T.color.sage,
                background: `${T.color.sage}18`,
                padding: "0.125rem 0.5rem",
                borderRadius: "999rem",
              }}
            >
              {t("isYou")}
            </span>
          )}
        </div>
        {/* Relationship to user */}
        {relationToSelf && !isCurrentUser && (
          <div
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
              fontStyle: "italic",
              marginTop: "0.125rem",
            }}
          >
            {t("relationToYou", { relation: relationToSelf })}
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label={t("close")}
        style={{
          width: "2.75rem",
          height: "2.75rem",
          borderRadius: "999rem",
          border: glassBorder,
          background: "rgba(255,255,255,0.6)",
          fontSize: "1.125rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: T.color.muted,
          minWidth: "2.75rem",
          minHeight: "2.75rem",
          transition: "all .15s ease",
        }}
      >
        {"\u2715"}
      </button>
    </div>
  );
}
