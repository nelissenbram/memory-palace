"use client";

import React, { useEffect, useState, useTransition } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { getBlockedUsers, unblockUser } from "@/lib/social/safety-actions";

interface BlockedUser {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export default function BlockedAccountsPanel() {
  const { t } = useTranslation("social");
  const [users, setUsers] = useState<BlockedUser[] | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getBlockedUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  const handleUnblock = (id: string) => {
    startTransition(async () => {
      await unblockUser(id);
      setUsers((prev) => (prev || []).filter((u) => u.id !== id));
    });
  };

  // Still loading — don't flash an empty state.
  if (users === null) return null;

  return (
    <div
      style={{
        background: T.color.cream,
        borderRadius: "1rem",
        border: `1px solid ${T.color.hairline}`,
        padding: "1.5rem 1.75rem",
        boxShadow: T.shadow[1],
        marginBottom: "1rem",
      }}
    >
      <h3
        style={{
          fontFamily: T.font.display,
          fontSize: "1.25rem",
          fontWeight: 500,
          color: T.color.charcoal,
          margin: "0 0 0.5rem",
        }}
      >
        {t("blockedAccounts")}
      </h3>
      {/* Always-visible explainer so blocking/management is discoverable even
          before anyone is blocked (Apple Guideline 1.2). */}
      <p
        style={{
          fontFamily: T.font.body,
          fontSize: "0.875rem",
          color: T.color.walnut,
          lineHeight: 1.5,
          margin: "0 0 1rem",
        }}
      >
        {t("blockedAccountsHint")}
      </p>
      {users.length === 0 ? (
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.muted,
            margin: 0,
            fontStyle: "italic",
          }}
        >
          {t("blockedAccountsEmpty")}
        </p>
      ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {users.map((u) => (
          <div
            key={u.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.875rem",
              borderRadius: "0.625rem",
              background: T.color.linen,
              border: `1px solid ${T.color.hairline}`,
            }}
          >
            <div
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                flexShrink: 0,
                background: u.avatar_url
                  ? `url(${u.avatar_url}) center/cover`
                  : `linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
              }}
            />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                color: T.color.charcoal,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {u.display_name || (u.username ? `@${u.username}` : t("anonymous"))}
            </span>
            <button
              onClick={() => handleUnblock(u.id)}
              disabled={isPending}
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: 600,
                padding: "0.5rem 1rem",
                borderRadius: "2rem",
                border: `1px solid ${T.color.sandstone}`,
                background: "transparent",
                color: T.color.walnut,
                cursor: isPending ? "wait" : "pointer",
                minHeight: "2.75rem",
                flexShrink: 0,
              }}
            >
              {t("unblock")}
            </button>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
