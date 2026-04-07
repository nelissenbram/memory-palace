"use client";

import { useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

function timeAgo(dateStr: string, t: (key: string, params?: Record<string, string>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("justNow");
  if (mins < 60) return t("minutesAgo", { count: String(mins) });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("hoursAgo", { count: String(hrs) });
  const days = Math.floor(hrs / 24);
  if (days === 1) return t("yesterday");
  return t("daysAgo", { count: String(days) });
}

const EMOJI: Record<string, string> = {
  family_invite: "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66",
  share_accepted: "\u2705",
  achievement: "\uD83C\uDFC6",
  reminder: "\u23F0",
  system: "\uD83C\uDFDB\uFE0F",
};

export default function NotificationsPage() {
  const { t } = useTranslation("notificationBell");
  const isMobile = useIsMobile();
  const { notifications, loading, load, markRead, markAllRead } = useNotificationStore();
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{
      width: "100%",
      minHeight: "100dvh",
      background: `linear-gradient(175deg, ${T.color.linen} 0%, ${T.color.warmStone} 55%, ${T.color.cream} 100%)`,
      fontFamily: T.font.body,
      paddingBottom: isMobile ? "calc(4.5rem + env(safe-area-inset-bottom, 0px))" : "2rem",
    }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? "1.25rem 1rem 0.75rem" : "2rem 2.5rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <h1 style={{
          fontFamily: T.font.display,
          fontSize: "1.5rem",
          fontWeight: 600,
          color: T.color.charcoal,
          margin: 0,
        }}>
          {t("title")}
          {unread > 0 && (
            <span style={{
              marginLeft: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: T.color.terracotta,
              background: `${T.color.terracotta}12`,
              padding: "0.125rem 0.5rem",
              borderRadius: "1rem",
            }}>
              {unread}
            </span>
          )}
        </h1>
        {unread > 0 && (
          <button
            onClick={() => markAllRead()}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.terracotta,
              background: `${T.color.terracotta}08`,
              border: `0.0625rem solid ${T.color.terracotta}25`,
              borderRadius: "0.5rem",
              padding: "0.375rem 0.75rem",
              cursor: "pointer",
              fontWeight: 500,
              transition: "all 0.15s",
            }}
          >
            {t("markAllRead")}
          </button>
        )}
      </div>

      {/* Notification list */}
      <div style={{
        maxWidth: "40rem",
        margin: "0 auto",
        padding: isMobile ? "0 0.75rem" : "0 2.5rem",
      }}>
        {loading && notifications.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "3rem 1rem",
            color: T.color.muted,
            fontSize: "0.875rem",
          }}>
            {t("loading")}
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "4rem 1rem",
            color: T.color.muted,
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={T.color.cream} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "0.75rem" }}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <p style={{ fontSize: "0.9375rem", fontWeight: 500, color: T.color.charcoal, marginBottom: "0.25rem" }}>
              {t("emptyTitle")}
            </p>
            <p style={{ fontSize: "0.8125rem" }}>{t("emptySubtitle")}</p>
          </div>
        )}

        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => { if (!n.read) markRead(n.id); }}
            style={{
              display: "flex",
              gap: "0.75rem",
              padding: "1rem",
              marginBottom: "0.5rem",
              borderRadius: "0.75rem",
              background: n.read ? "rgba(255,255,255,0.5)" : `rgba(255,255,255,0.85)`,
              border: `0.0625rem solid ${n.read ? T.color.cream : T.color.terracotta + "25"}`,
              cursor: n.read ? "default" : "pointer",
              transition: "all 0.15s",
              animation: "fadeIn 0.3s ease both",
            }}
          >
            <span style={{
              fontSize: "1.25rem",
              lineHeight: 1,
              flexShrink: 0,
              marginTop: "0.125rem",
            }}>
              {EMOJI[n.type] || "\uD83D\uDD14"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: "0.875rem",
                fontWeight: n.read ? 400 : 600,
                color: T.color.charcoal,
                margin: 0,
                lineHeight: 1.4,
              }}>
                {n.message}
              </p>
              <p style={{
                fontSize: "0.75rem",
                color: T.color.muted,
                margin: "0.25rem 0 0",
              }}>
                {timeAgo(n.created_at, t)}
              </p>
            </div>
            {!n.read && (
              <span style={{
                width: "0.5rem",
                height: "0.5rem",
                borderRadius: "50%",
                background: T.color.terracotta,
                flexShrink: 0,
                marginTop: "0.375rem",
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
