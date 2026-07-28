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
import {
  INK,
  MUTED,
  EMBER,
  EMBER_GLYPH,
  HAIRLINE,
  CREAM,
  GOLD,
  TRAY,
  SHADOW,
  TOP_HIGHLIGHT,
} from "@/lib/libraryTokens";

const EMBER_WASH = "rgba(154,79,42,0.07)";
const UNREAD_WASH = "rgba(184,92,56,0.06)";

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
  new_contribution: "✎",
  achievement:      "⚜",
  family_invite:    "❦",
  on_this_day:      "❧",
  welcome:          "✧",
  reminder:         "⧗",
  system:           "❖",
  kep_capture:      "📸",
  new_follower:     "✦",
  collab_invite:    "⚔",
  comment_reply:    "✎",
  reaction:         "❤",
  palace_visit:     "⇨",
  followed_published: "✦",
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
          borderBottom: `0.0625rem solid ${HAIRLINE}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: T.font.display,
            fontSize: "1.0625rem",
            fontWeight: 600,
            color: INK,
          }}
        >
          {t("title")}
          {count > 0 && (
            <span style={{
              marginLeft: "0.375rem",
              fontSize: "0.6875rem",
              fontWeight: 600,
              fontFamily: T.font.body,
              fontVariantNumeric: "tabular-nums",
              color: EMBER,
              background: "rgba(184,92,56,0.11)",
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
            className="mp-bell-quiet"
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              fontWeight: 600,
              color: EMBER,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0.125rem 0.375rem",
              minHeight: "2.75rem",
              minWidth: "2.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.375rem",
            }}
          >
            {t("markAllRead")}
          </button>
        )}
      </div>

      {/* Mobile filter tabs — Explore pill grammar */}
      {isMobile && (
        <div style={{
          display: "flex",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          borderBottom: `0.0625rem solid ${HAIRLINE}`,
          flexShrink: 0,
          overflowX: "auto",
        }}>
          {(["all", "yourPalace", "following", "system"] as NotificationTab[]).map((tab) => {
            const active = mobileTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                aria-pressed={active}
                className="mp-bell-pill"
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: active ? 600 : 500,
                  color: active ? EMBER : MUTED,
                  background: "transparent",
                  border: `0.0625rem solid ${active ? EMBER : T.color.warmStone}`,
                  borderRadius: "2rem",
                  padding: "0 1rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  minHeight: "2.75rem",
                  flexShrink: 0,
                }}
              >
                {t(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}` as "tabAll")}
              </button>
            );
          })}
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
              color: MUTED,
            }}
          >
            {t("loading")}
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div style={{ padding: "2rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem", color: EMBER_GLYPH, opacity: 0.5 }}>
              {"✦"}
            </div>
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                color: INK,
                fontWeight: 500,
              }}
            >
              {t("noNew")}
            </div>
            <div
              style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                color: MUTED,
                marginTop: "0.25rem",
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
            className={group.primary.read ? "mp-bell-row" : "mp-bell-row mp-bell-row-unread"}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.625rem",
              width: "100%",
              minHeight: "2.75rem",
              padding: "0.625rem 1rem",
              border: "none",
              background: group.primary.read ? "transparent" : UNREAD_WASH,
              cursor: "pointer",
              textAlign: "left",
              borderLeft: group.primary.read ? "0.1875rem solid transparent" : `0.1875rem solid ${EMBER}`,
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: "2rem",
                height: "2rem",
                borderRadius: "0.625rem",
                background: group.primary.read ? TRAY : "rgba(184,92,56,0.12)",
                color: EMBER_GLYPH,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.875rem",
                flexShrink: 0,
                marginTop: "0.0625rem",
              }}
              aria-hidden="true"
            >
              {ICON_MAP[group.primary.type] || "✦"}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: group.primary.read ? 500 : 600,
                  color: group.primary.read ? MUTED : INK,
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
                  fontSize: "0.6875rem",
                  color: MUTED,
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
                  background: EMBER,
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
          borderTop: `0.0625rem solid ${HAIRLINE}`,
          padding: "0.25rem 1rem",
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
            className="mp-bell-quiet"
            style={{
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              fontWeight: 600,
              color: EMBER,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              minHeight: "2.75rem",
              padding: "0.25rem 0.75rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.375rem",
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
      {/* One motion voice + hover language, all guarded */}
      <style>{`
        .mp-bell-btn, .mp-bell-row, .mp-bell-pill, .mp-bell-quiet { transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.2s ease; }
        @media (hover: hover) {
          .mp-bell-btn:hover { transform: scale(1.05); }
          .mp-bell-row:hover { background: ${EMBER_WASH} !important; }
          .mp-bell-pill:hover { border-color: ${EMBER}; color: ${EMBER}; }
          .mp-bell-quiet:hover { background: ${EMBER_WASH}; }
        }
        .mp-bell-row:active { background: rgba(154,79,42,0.12) !important; }
        .mp-bell-pill:active, .mp-bell-quiet:active { opacity: 0.8; }
        .mp-bell-btn:focus-visible, .mp-bell-row:focus-visible, .mp-bell-pill:focus-visible, .mp-bell-quiet:focus-visible {
          outline: 0.1875rem solid ${GOLD};
          outline-offset: 0.1875rem;
        }
        .mp-bell-row:focus-visible { outline-offset: -0.1875rem; }
        @media (prefers-reduced-motion: no-preference) {
          .mp-bell-panel { animation: mpBellPanelIn 0.25s ease both; }
        }
        @keyframes mpBellPanelIn { from { opacity: 0; transform: translateY(0.375rem); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .mp-bell-btn, .mp-bell-panel, .mp-bell-row, .mp-bell-pill, .mp-bell-quiet { animation: none !important; transition: none !important; }
          .mp-bell-btn:hover { transform: none !important; }
        }
      `}</style>

      {/* Bell button */}
      <button
        onClick={toggle}
        title={t("title")}
        aria-label={count > 0 ? t("title") + ` (${count})` : t("title")}
        aria-haspopup="true"
        aria-expanded={open}
        className="mp-bell-btn"
        style={{
          width: isMobile ? "2.75rem" : "2.25rem",
          height: isMobile ? "2.75rem" : "2.25rem",
          borderRadius: isMobile ? "1.375rem" : "1.125rem",
          border: `0.0625rem solid ${open ? EMBER : HAIRLINE}`,
          background: open ? TRAY : CREAM,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          position: "relative",
          boxShadow: "none",
          pointerEvents: "auto",
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
            stroke={INK}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M6.5 10.5C6.5 11.3 7.2 12 8 12C8.8 12 9.5 11.3 9.5 10.5"
            stroke={INK}
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {/* Unread badge — count when > 3, dot otherwise */}
        {count > 0 && (
          <>
            <style>{`
              @keyframes mpBellPulse { 0%,100% { box-shadow:0 0 0 0 rgba(184,92,56,0.45);} 50% { box-shadow:0 0 0 0.375rem rgba(184,92,56,0);} }
              .mp-bell-dot { animation: none; }
              @media (prefers-reduced-motion: no-preference) { .mp-bell-dot { animation: mpBellPulse 4s ease-in-out infinite; } }
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
                  background: EMBER,
                  border: `0.09375rem solid ${CREAM}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.5625rem",
                  fontWeight: 700,
                  color: CREAM,
                  padding: "0 0.1875rem",
                  fontFamily: T.font.body,
                }}
              >
                {count > 99 ? "99+" : count}
              </span>
            ) : (
              <span
                aria-label={t("unreadNotifications", { count: String(count) })}
                className="mp-bell-dot"
                style={{
                  position: "absolute",
                  top: "0.25rem",
                  right: "0.25rem",
                  width: "0.5rem",
                  height: "0.5rem",
                  borderRadius: "50%",
                  background: EMBER,
                  border: `0.09375rem solid ${CREAM}`,
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
              background: "rgba(64,59,54,0.4)", /* warm-ink scrim */
              zIndex: 98,
            }}
          />
          <div
            ref={dropdownRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            className="mp-bell-panel"
            style={{
              position: "fixed",
              bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
              left: 0,
              right: 0,
              maxHeight: "65dvh",
              background: "#FFFFFF",
              borderRadius: "1rem 1rem 0 0",
              border: `0.0625rem solid ${HAIRLINE}`,
              borderBottom: "none",
              boxShadow: `${SHADOW[2]}, ${TOP_HIGHLIGHT}`,
              overflow: "hidden",
              zIndex: 99,
            }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "0.5rem 0 0.25rem" }}>
              <div style={{ width: "2rem", height: "0.1875rem", borderRadius: "0.125rem", background: HAIRLINE }} />
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
          className="mp-bell-panel"
          style={{
            position: "absolute",
            top: "2.75rem",
            right: 0,
            width: "20rem",
            maxHeight: "25rem",
            background: "#FFFFFF",
            borderRadius: "1rem",
            border: `0.0625rem solid ${HAIRLINE}`,
            boxShadow: `${SHADOW[2]}, ${TOP_HIGHLIGHT}`,
            overflow: "hidden",
          }}
        >
          {dropdownContent}
        </div>
      )}
    </div>
  );
}
