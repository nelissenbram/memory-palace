"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  groupNotifications,
  filterByTab,
  getNotificationAction,
  buildGroupMessage,
  type NotificationTab,
} from "@/lib/utils/notification-grouping";

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

const ICON_MAP: Record<string, string> = {
  new_contribution: "\u270E",
  achievement:      "\u269C",
  family_invite:    "\u2766",
  on_this_day:      "\u2767",
  welcome:          "\u2727",
  reminder:         "\u29D7",
  system:           "\u2756",
  kep_capture:      "\uD83D\uDCF8",
  new_follower:     "\u2726",
  collab_invite:    "\u2694",
  comment_reply:    "\u270E",
  reaction:         "\u2764",
  palace_visit:     "\u21E8",
  followed_published: "\u2726",
};

export default function NotificationBell() {
  const { t } = useTranslation("notificationBell");
  const isMobile = useIsMobile();
  const router = useRouter();
  const { notifications, open, loading, setOpen, toggle, load, markRead, markAllRead, unreadCount } =
    useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const count = unreadCount();

  // Mobile filter tab (local state, separate from full-page tab)
  const [mobileTab, setMobileTab] = useState<NotificationTab>("all");

  // Grouped notifications for dropdown (max 8), filtered by tab on mobile
  const grouped = useMemo(() => {
    const filtered = isMobile ? filterByTab(notifications, mobileTab) : notifications;
    return groupNotifications(filtered).slice(0, 8);
  }, [notifications, isMobile, mobileTab]);

  // Phase 5: Adaptive polling — 30s visible, 120s hidden, immediate on focus
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    load();
    let interval: ReturnType<typeof setInterval>;

    const startPolling = () => {
      clearInterval(interval);
      const delay = document.hidden ? 120_000 : 30_000;
      interval = setInterval(() => loadRef.current(), delay);
    };

    const handleVisibility = () => {
      if (!document.hidden) loadRef.current(); // immediate poll on focus
      startPolling();
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [load]);

  // Reset mobile tab when dropdown closes
  useEffect(() => {
    if (!open) setMobileTab("all");
  }, [open]);

  // Close on outside click/touch
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const inBell = panelRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inBell && !inDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open, setOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  const handleItemClick = useCallback((group: typeof grouped[number]) => {
    const n = group.primary;
    if (!n.read) markRead(n.id);
    for (const item of group.items) {
      if (!item.read) markRead(item.id);
    }
    setOpen(false);
    const url = getNotificationAction(n);
    if (url) router.push(url);
  }, [markRead, setOpen, router]);

  /* ── Shared dropdown content (header + list + footer) ── */
  const dropdownContent = (
    <div style={{ display: "flex", flexDirection: "column", maxHeight: "inherit", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.875rem 1rem 0.625rem",
          borderBottom: `1px solid ${T.color.cream}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: T.font.display,
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: T.color.charcoal,
          }}
        >
          {t("title")}
          {count > 0 && (
            <span style={{
              marginLeft: "0.375rem",
              fontSize: "0.6875rem",
              fontWeight: 600,
              color: T.color.terracotta,
              background: `${T.color.terracotta}12`,
              padding: "0.0625rem 0.375rem",
              borderRadius: "0.625rem",
            }}>
              {count}
            </span>
          )}
        </span>
        {count > 0 && (
          <button
            onClick={() => markAllRead()}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              color: T.color.terracotta,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.125rem 0.375rem",
              minHeight: "2.75rem",
              minWidth: "2.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.375rem",
              transition: "background .15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = `${T.color.terracotta}12`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "none";
            }}
          >
            {t("markAllRead")}
          </button>
        )}
      </div>

      {/* Mobile filter tabs */}
      {isMobile && (
        <div style={{
          display: "flex",
          gap: "0.375rem",
          padding: "0.5rem 1rem",
          borderBottom: `1px solid ${T.color.cream}`,
          flexShrink: 0,
          overflowX: "auto",
        }}>
          {(["all", "yourPalace", "following", "system"] as NotificationTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                fontWeight: mobileTab === tab ? 600 : 500,
                color: mobileTab === tab ? T.color.white : T.color.walnut,
                background: mobileTab === tab ? T.color.terracotta : `${T.color.sandstone}20`,
                border: "none",
                borderRadius: "1rem",
                padding: "0.3125rem 0.625rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
                minHeight: "1.75rem",
                transition: "background .15s, color .15s",
              }}
            >
              {t(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}` as "tabAll")}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "0.25rem 0", contain: "layout" }}>
        {loading && notifications.length === 0 && (
          <div
            style={{
              padding: "2rem 1rem",
              textAlign: "center",
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              color: T.color.muted,
            }}
          >
            {t("loading")}
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div style={{ padding: "2rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem", opacity: 0.5 }}>
              {"\u2726"}
            </div>
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: T.color.muted,
              }}
            >
              {t("noNew")}
            </div>
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                color: T.color.muted,
                marginTop: "0.25rem",
                opacity: 0.7,
              }}
            >
              {t("emptyDesc")}
            </div>
          </div>
        )}

        {grouped.map((group) => (
          <button
            key={group.primary.id}
            onClick={() => handleItemClick(group)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.625rem",
              width: "100%",
              padding: "0.625rem 1rem",
              border: "none",
              background: group.primary.read ? "transparent" : `${T.color.terracotta}06`,
              cursor: "pointer",
              textAlign: "left",
              transition: "background .15s",
              borderLeft: group.primary.read ? "3px solid transparent" : `3px solid ${T.color.terracotta}`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = `${T.color.sandstone}18`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = group.primary.read
                ? "transparent"
                : `${T.color.terracotta}06`;
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "0.625rem",
                background: group.primary.read
                  ? `${T.color.sandstone}18`
                  : `${T.color.terracotta}12`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.875rem",
                flexShrink: 0,
                marginTop: "0.0625rem",
              }}
            >
              {ICON_MAP[group.primary.type] || "\u2726"}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.75rem",
                  fontWeight: group.primary.read ? 500 : 600,
                  color: group.primary.read ? T.color.muted : T.color.charcoal,
                  lineHeight: 1.4,
                }}
              >
                {group.grouped
                  ? buildGroupMessage(group, (c) => t("andOthers", { count: c }))
                  : group.primary.message
                }
              </div>
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.625rem",
                  color: T.color.muted,
                  marginTop: "0.125rem",
                }}
              >
                {timeAgo(group.primary.created_at, t)}
              </div>
            </div>

            {/* Unread dot */}
            {!group.primary.read && (
              <div
                style={{
                  width: "0.375rem",
                  height: "0.375rem",
                  borderRadius: "0.1875rem",
                  background: T.color.terracotta,
                  flexShrink: 0,
                  marginTop: "0.375rem",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Footer — See all activity link */}
      {notifications.length > 0 && (
        <div style={{
          borderTop: `1px solid ${T.color.cream}`,
          padding: "0.5rem 1rem",
          textAlign: "center",
          flexShrink: 0,
        }}>
          <button
            onClick={() => {
              setOpen(false);
              if (window.location.pathname.startsWith("/palace")) {
                window.dispatchEvent(new CustomEvent("mp:open-notifications-page"));
              } else {
                router.push("/palace?notifications=1");
              }
            }}
            style={{
              fontFamily: T.font.body,
              fontSize: "0.6875rem",
              fontWeight: 600,
              color: T.color.terracotta,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.25rem 0.5rem",
              borderRadius: "0.375rem",
              transition: "background .15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = `${T.color.terracotta}08`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "none";
            }}
          >
            {t("seeAllActivity")}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div ref={panelRef} style={{ position: "relative", zIndex: 100 }}>
      {/* Bell button */}
      <button
        onClick={toggle}
        title={t("title")}
        aria-label={count > 0 ? t("title") + ` (${count})` : t("title")}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          width: isMobile ? "2.75rem" : "2.25rem",
          height: isMobile ? "2.75rem" : "2.25rem",
          borderRadius: isMobile ? "1.375rem" : "1.125rem",
          border: `1px solid ${open ? T.color.sandstone : T.color.cream}`,
          background: open ? `${T.color.sandstone}30` : `${T.color.white}ee`,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          transition: "transform .2s, background .2s",
          boxShadow: "0 2px 10px rgba(44,44,42,.08)",
          pointerEvents: "auto",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "none";
        }}
      >
        {/* Bell SVG */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 1.5C5.5 1.5 4 3.5 4 5.5V8L3 10H13L12 8V5.5C12 3.5 10.5 1.5 8 1.5Z"
            stroke={T.color.walnut}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M6.5 10.5C6.5 11.3 7.2 12 8 12C8.8 12 9.5 11.3 9.5 10.5"
            stroke={T.color.walnut}
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Unread badge — count when > 3, dot otherwise */}
        {count > 0 && (
          <>
            <style>{`
              @keyframes mpBellPulse { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.55);} 50% { box-shadow:0 0 0 0.375rem rgba(212,175,55,0);} }
            `}</style>
            {count > 3 ? (
              <span
                aria-label={t("unreadNotifications", { count: String(count) })}
                style={{
                  position: "absolute",
                  top: "-0.125rem",
                  right: "-0.125rem",
                  minWidth: "1rem",
                  height: "1rem",
                  borderRadius: "0.5rem",
                  background: T.color.terracotta,
                  border: `1.5px solid ${T.color.linen}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.5625rem",
                  fontWeight: 700,
                  color: "#FFF",
                  padding: "0 0.1875rem",
                  fontFamily: T.font.body,
                }}
              >
                {count > 99 ? "99+" : count}
              </span>
            ) : (
              <span
                aria-label={t("unreadNotifications", { count: String(count) })}
                style={{
                  position: "absolute",
                  top: "0.25rem",
                  right: "0.25rem",
                  width: "0.5rem",
                  height: "0.5rem",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, #F5D76E 0%, ${T.color.gold} 70%)`,
                  border: `1.5px solid ${T.color.linen}`,
                  animation: "mpBellPulse 2.2s ease-in-out infinite",
                }}
              />
            )}
          </>
        )}
      </button>

      {/* Dropdown — mobile uses portal to escape nav stacking context */}
      {open && isMobile && createPortal(
        <>
          <div
            role="presentation"
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 98,
            }}
          />
          <div
            ref={dropdownRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            style={{
              position: "fixed",
              bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
              left: 0,
              right: 0,
              maxHeight: "65dvh",
              background: `${T.color.linen}f8`,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: "1rem 1rem 0 0",
              border: `1px solid ${T.color.cream}`,
              borderBottom: "none",
              boxShadow: "0 -8px 48px rgba(44,44,42,.18)",
              overflow: "hidden",
              zIndex: 99,
              animation: "fadeUp .25s ease",
            }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "0.5rem 0 0.25rem" }}>
              <div style={{ width: "2rem", height: "0.1875rem", borderRadius: "0.125rem", background: T.color.sandstone }} />
            </div>
            {dropdownContent}
          </div>
        </>,
        document.body,
      )}

      {/* Desktop dropdown — rendered inline */}
      {open && !isMobile && (
        <div
          role="dialog"
          aria-label={t("title")}
          style={{
            position: "absolute",
            top: "2.75rem",
            right: 0,
            width: "20rem",
            maxHeight: "25rem",
            background: `${T.color.linen}f8`,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: "1rem",
            border: `1px solid ${T.color.cream}`,
            boxShadow: "0 12px 48px rgba(44,44,42,.18)",
            overflow: "hidden",
            animation: "fadeUp .2s ease",
          }}
        >
          {dropdownContent}
        </div>
      )}
    </div>
  );
}
