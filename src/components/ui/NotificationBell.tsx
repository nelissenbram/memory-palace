"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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

export default function NotificationBell() {
  const { t } = useTranslation("notificationBell");
  const isMobile = useIsMobile();
  const { notifications, open, loading, setOpen, toggle, load, markRead, markAllRead, unreadCount } =
    useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const count = unreadCount();

  // Load notifications on mount and every 60s
  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  // Close on outside click/touch — check both panelRef (bell) and dropdownRef (portal)
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

  /* ── Shared dropdown content (header + list) ── */
  const dropdownContent = (
    <>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.875rem 1rem 0.625rem",
          borderBottom: `1px solid ${T.color.cream}`,
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

      {/* List */}
      <div style={{ overflowY: "auto", maxHeight: isMobile ? "60dvh" : "21.25rem", padding: "0.25rem 0" }}>
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
              {"\uD83D\uDD14"}
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

        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              if (!n.read) markRead(n.id);
              setOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.625rem",
              width: "100%",
              padding: "0.625rem 1rem",
              border: "none",
              background: n.read ? "transparent" : `${T.color.terracotta}06`,
              cursor: "pointer",
              textAlign: "left",
              transition: "background .15s",
              borderLeft: n.read ? "3px solid transparent" : `3px solid ${T.color.terracotta}`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = `${T.color.sandstone}18`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = n.read
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
                background: n.read
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
              {n.type === "new_contribution" ? "\u{1F4DD}" : "\u{1F514}"}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.75rem",
                  fontWeight: n.read ? 400 : 500,
                  color: n.read ? T.color.muted : T.color.charcoal,
                  lineHeight: 1.4,
                }}
              >
                {n.message}
              </div>
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.625rem",
                  color: T.color.muted,
                  marginTop: "0.125rem",
                }}
              >
                {timeAgo(n.created_at, t)}
              </div>
            </div>

            {/* Unread dot */}
            {!n.read && (
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
    </>
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

        {/* Unread badge */}
        {count > 0 && (
          <div
            aria-label={t("unreadNotifications", { count: String(count) })}
            style={{
              position: "absolute",
              top: "-0.125rem",
              right: "-0.125rem",
              minWidth: "1rem",
              height: "1rem",
              borderRadius: "0.5rem",
              background: T.color.terracotta,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 0.25rem",
              border: `1.5px solid ${T.color.linen}`,
            }}
          >
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: "0.5625rem",
                fontWeight: 700,
                color: "#FFF",
                lineHeight: 1,
              }}
            >
              {count > 9 ? "9+" : count}
            </span>
          </div>
        )}
      </button>

      {/* Dropdown — mobile uses portal to escape nav stacking context */}
      {open && isMobile && createPortal(
        <>
          <div
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
