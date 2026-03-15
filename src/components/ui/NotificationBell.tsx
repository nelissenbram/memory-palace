"use client";

import { useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { useNotificationStore } from "@/lib/stores/notificationStore";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default function NotificationBell() {
  const { notifications, open, loading, setOpen, toggle, load, markRead, markAllRead, unreadCount } =
    useNotificationStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const count = unreadCount();

  // Load notifications on mount and every 60s
  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, setOpen]);

  return (
    <div ref={panelRef} style={{ position: "relative", zIndex: 42 }}>
      {/* Bell button */}
      <button
        onClick={toggle}
        title="Notifications"
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
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
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: T.color.terracotta,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              border: `1.5px solid ${T.color.linen}`,
            }}
          >
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: 9,
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

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            width: 320,
            maxHeight: 400,
            background: `${T.color.linen}f8`,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: 16,
            border: `1px solid ${T.color.cream}`,
            boxShadow: "0 12px 48px rgba(44,44,42,.18)",
            overflow: "hidden",
            animation: "fadeUp .2s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px 10px",
              borderBottom: `1px solid ${T.color.cream}`,
            }}
          >
            <span
              style={{
                fontFamily: T.font.display,
                fontSize: 15,
                fontWeight: 600,
                color: T.color.charcoal,
              }}
            >
              Notifications
            </span>
            {count > 0 && (
              <button
                onClick={() => markAllRead()}
                style={{
                  fontFamily: T.font.body,
                  fontSize: 11,
                  color: T.color.terracotta,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 6px",
                  borderRadius: 6,
                  transition: "background .15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = `${T.color.terracotta}12`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "none";
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", maxHeight: 340, padding: "4px 0" }}>
            {loading && notifications.length === 0 && (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  fontFamily: T.font.body,
                  fontSize: 12,
                  color: T.color.muted,
                }}
              >
                Loading...
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>
                  {"\uD83D\uDD14"}
                </div>
                <div
                  style={{
                    fontFamily: T.font.body,
                    fontSize: 13,
                    color: T.color.muted,
                  }}
                >
                  No new notifications
                </div>
                <div
                  style={{
                    fontFamily: T.font.body,
                    fontSize: 11,
                    color: T.color.muted,
                    marginTop: 4,
                    opacity: 0.7,
                  }}
                >
                  When collaborators add memories to your shared rooms, you&#39;ll see it here.
                </div>
              </div>
            )}

            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read) markRead(n.id);
                  setOpen(false);
                  // Navigation could be added here in the future
                }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  width: "100%",
                  padding: "10px 16px",
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
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: n.read
                      ? `${T.color.sandstone}18`
                      : `${T.color.terracotta}12`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {n.type === "new_contribution" ? "\u{1F4DD}" : "\u{1F514}"}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: T.font.body,
                      fontSize: 12,
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
                      fontSize: 10,
                      color: T.color.muted,
                      marginTop: 2,
                    }}
                  >
                    {timeAgo(n.created_at)}
                  </div>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: T.color.terracotta,
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
