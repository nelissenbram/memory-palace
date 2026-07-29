"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import type { NotificationRow } from "@/lib/auth/notification-actions";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  groupNotifications,
  filterByTab,
  getDateSection,
  getNotificationAction,
  buildGroupMessage,
  type NotificationTab,
  type GroupedNotification,
  type DateSection,
} from "@/lib/utils/notification-grouping";
import {
  INK,
  MUTED,
  EMBER,
  EMBER_GLYPH,
  HAIRLINE,
  CREAM,
  GOLD,
  SHADOW,
  TOP_HIGHLIGHT,
} from "@/lib/libraryTokens";

const TUTORIAL_KEY = "mp_activity_tutorial_v1";

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
  new_contribution: "✎", // ✎
  achievement:      "⚜", // ⚜
  family_invite:    "❦", // ❦
  share_accepted:   "❦", // ❦
  on_this_day:      "❧", // ❧
  welcome:          "✧", // ✧
  reminder:         "⧗", // ⧗
  system:           "❖", // ❖
  kep_capture:      "📸", // 📸
  new_follower:     "✦", // ✦
  collab_invite:    "⚔", // ⚔
  comment_reply:    "✎", // ✎
  reaction:         "❤", // ❤
  palace_visit:     "⇨", // ⇨
  followed_published: "✦", // ✦
};

function getTranslatedMessage(
  n: NotificationRow,
  t: (key: string, params?: Record<string, string>) => string,
): string {
  const name = n.from_user_name || "";
  const room = n.room_name || "";

  switch (n.type) {
    case "new_contribution":
      if (name && room) return t("msg_new_contribution", { name, room });
      break;
    case "achievement": {
      if (room) return t("msg_first_in_room", { room });
      const achMsg = t("msg_achievement");
      if (achMsg !== "msg_achievement") return achMsg;
      break;
    }
    case "family_invite":
      if (name) return t("msg_family_invite", { name });
      break;
    case "share_accepted":
      if (name) return t("msg_share_accepted", { name });
      break;
    case "on_this_day": {
      const otdMatch = n.message.match(
        /(\d+)\s+(?:years?|jaar|Jahren?|años?|ans?)\s.*[—–-]\s*"?(.+?)"?\.?\s*$/i,
      );
      if (otdMatch) {
        return t("msg_on_this_day", { years: otdMatch[1], title: otdMatch[2] });
      }
      break;
    }
    case "welcome": {
      const wMsg = t("msg_welcome");
      if (wMsg !== "msg_welcome") return wMsg;
      break;
    }
    case "reminder": {
      const rMsg = t("msg_reminder");
      if (rMsg !== "msg_reminder") return rMsg;
      break;
    }
    case "system": {
      const sMsg = t("msg_system");
      if (sMsg !== "msg_system") return sMsg;
      break;
    }
    case "palace_visit":
      if (name) return t("msg_palace_visit", { name });
      break;
    case "comment_reply":
      if (name) return t("msg_comment_reply", { name });
      break;
    case "reaction":
      if (name) return t("msg_reaction", { name, target: n.room_name || "content" });
      break;
    case "new_follower":
      if (name) return t("msg_new_follower", { name });
      break;
    case "followed_published":
      if (name) return t("msg_followed_published", { name });
      break;
    case "collab_invite":
      if (name) return t("msg_collab_invite", { name });
      break;
  }

  return n.message;
}

const TABS: { key: NotificationTab; labelKey: string }[] = [
  { key: "all", labelKey: "tabAll" },
  { key: "yourPalace", labelKey: "tabYourPalace" },
  { key: "following", labelKey: "tabFollowing" },
  { key: "system", labelKey: "tabSystem" },
];

const EMPTY_KEYS: Record<NotificationTab, string> = {
  all: "emptySubtitle",
  yourPalace: "emptyYourPalace",
  following: "emptyFollowing",
  system: "emptySystem",
};

const DATE_SECTION_KEYS: Record<DateSection, string> = {
  today: "today",
  yesterday: "yesterday",
  thisWeek: "thisWeek",
  earlier: "earlier",
};

export default function NotificationsPage() {
  const { t } = useTranslation("notificationBell");
  const isMobile = useIsMobile();
  const router = useRouter();
  const { notifications, loading, load, markRead, markAllRead, activeTab, setTab } = useNotificationStore();
  const unread = notifications.filter((n) => !n.read).length;
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(TUTORIAL_KEY)) {
      setTutorialOpen(true);
    }
    const reopen = () => setTutorialOpen(true);
    window.addEventListener("mp:open-activity-tutorial", reopen);
    return () => window.removeEventListener("mp:open-activity-tutorial", reopen);
  }, []);

  const closeTutorial = () => {
    setTutorialOpen(false);
    try { window.localStorage.setItem(TUTORIAL_KEY, "1"); } catch { /* ignore */ }
  };

  const filtered = useMemo(() => filterByTab(notifications, activeTab), [notifications, activeTab]);
  const grouped = useMemo(() => groupNotifications(filtered), [filtered]);

  // Group by date section
  const sections = useMemo(() => {
    const map = new Map<DateSection, GroupedNotification[]>();
    for (const g of grouped) {
      const section = getDateSection(g.primary.created_at);
      const list = map.get(section) || [];
      list.push(g);
      map.set(section, list);
    }
    return map;
  }, [grouped]);

  const sectionOrder: DateSection[] = ["today", "yesterday", "thisWeek", "earlier"];

  const handleNotificationClick = (group: GroupedNotification) => {
    const n = group.primary;
    if (!n.read) markRead(n.id);
    // Mark all items in group as read
    for (const item of group.items) {
      if (!item.read) markRead(item.id);
    }
    const url = getNotificationAction(n);
    if (url) router.push(url);
  };

  return (
    <div style={{
      width: "100%",
      minHeight: "100dvh",
      background: CREAM,
      fontFamily: T.font.body,
      // Clear the fixed NavigationBar: the desktop top bar (~3.5rem) otherwise
      // overlaps the "Activity" title; mobile's bar is at the bottom (safe-area top).
      paddingTop: isMobile ? "env(safe-area-inset-top, 0px)" : "3.5rem",
      paddingBottom: isMobile ? "calc(4.5rem + env(safe-area-inset-bottom, 0px))" : "2rem",
    }}>
      <div className="np-board" style={{
        maxWidth: "40rem",
        margin: "0 auto",
        padding: isMobile ? "0 1rem" : "0 1.25rem",
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? "1.25rem 0 0.75rem" : "2rem 0 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}>
          <h1 style={{
            fontFamily: T.font.display,
            fontSize: "1.375rem", // canon titleL
            fontWeight: 600,
            lineHeight: 1.15,
            color: INK,
            margin: 0,
          }}>
            {t("title")}
            {unread > 0 && (
              <span style={{
                marginLeft: "0.5rem",
                fontSize: "0.8125rem", // canon meta
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: EMBER, // ember — unread
                background: "rgba(184,92,56,0.11)",
                padding: "0.125rem 0.5rem",
                borderRadius: "2rem",
              }}>
                {unread}
              </span>
            )}
          </h1>
          {unread > 0 && (
            <button
              onClick={() => markAllRead()}
              className="np-quiet"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: MUTED,
                background: "transparent",
                border: `0.0625rem solid ${T.color.warmStone}`,
                borderRadius: "2rem",
                minHeight: "2.75rem",
                padding: "0 1.25rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t("markAllRead")}
            </button>
          )}
        </div>

        {/* Filter tabs — Explore pill grammar */}
        <div style={{
          display: "flex",
          gap: "0.5rem",
          padding: "0 0 1rem",
          overflowX: "auto",
        }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                aria-pressed={active}
                className="np-pill"
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.875rem",
                  fontWeight: active ? 600 : 500,
                  color: active ? EMBER : MUTED,
                  background: "transparent",
                  border: `0.0625rem solid ${active ? EMBER : T.color.warmStone}`,
                  borderRadius: "2rem",
                  minHeight: "2.75rem",
                  padding: "0 1.25rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Notification list */}
        {loading && notifications.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "3rem 1rem",
            color: MUTED,
            fontSize: "0.8125rem",
          }}>
            {t("loading")}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{
            textAlign: "center",
            padding: "4rem 1rem",
            color: MUTED,
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={HAIRLINE} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "0.75rem" }} aria-hidden="true">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <p style={{ fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 600, color: INK, margin: "0 0 0.375rem" }}>
              {t("emptyTitle")}
            </p>
            <p style={{ fontSize: "0.875rem", margin: 0 }}>{t(EMPTY_KEYS[activeTab])}</p>
          </div>
        )}

        {sectionOrder.map((sectionKey) => {
          const items = sections.get(sectionKey);
          if (!items || items.length === 0) return null;
          return (
            <div key={sectionKey}>
              {/* Date section header — canon overline: dot + small caps + fading rule */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                margin: "1rem 0 0.625rem",
              }}>
                <span aria-hidden="true" style={{
                  width: "0.6rem", height: "0.6rem", borderRadius: "50%",
                  background: EMBER_GLYPH, flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: T.font.body,
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: EMBER_GLYPH,
                  whiteSpace: "nowrap",
                }}>
                  {t(DATE_SECTION_KEYS[sectionKey])}
                </span>
                <span aria-hidden="true" style={{
                  flex: 1, height: "0.0625rem",
                  background: `linear-gradient(90deg, ${HAIRLINE}, transparent)`,
                }} />
              </div>

              {items.map((group) => (
                <div
                  key={group.primary.id}
                  className="np-row"
                  onClick={() => handleNotificationClick(group)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") handleNotificationClick(group); }}
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    padding: "1rem",
                    marginBottom: "0.5rem",
                    minHeight: "2.75rem",
                    borderRadius: "1rem",
                    background: group.primary.read ? CREAM : "#FFFFFF",
                    border: `0.0625rem solid ${HAIRLINE}`,
                    boxShadow: group.primary.read ? "none" : `${SHADOW[1]}, ${TOP_HIGHLIGHT}`,
                    cursor: "pointer",
                  }}
                >
                  <span style={{
                    fontSize: "1.25rem",
                    lineHeight: 1,
                    flexShrink: 0,
                    marginTop: "0.125rem",
                    color: EMBER_GLYPH,
                  }} aria-hidden="true">
                    {EMOJI[group.primary.type] || "✦"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: "0.9375rem", // canon body
                      fontWeight: group.primary.read ? 500 : 600,
                      color: INK,
                      margin: 0,
                      lineHeight: 1.4,
                    }}>
                      {group.grouped
                        ? buildGroupMessage(group, (c) => t("andOthers", { count: c }))
                        : getTranslatedMessage(group.primary, t)
                      }
                    </p>
                    {group.grouped && group.count > 1 && (
                      <p style={{
                        fontSize: "0.6875rem",
                        color: MUTED,
                        margin: "0.125rem 0 0",
                        fontStyle: "italic",
                      }}>
                        {group.count} {t("tabAll").toLowerCase()}
                      </p>
                    )}
                    <p style={{
                      fontSize: "0.8125rem", // canon meta
                      color: MUTED,
                      margin: "0.25rem 0 0",
                    }}>
                      {timeAgo(group.primary.created_at, t)}
                    </p>
                  </div>
                  {!group.primary.read && (
                    <span style={{
                      width: "0.5rem",
                      height: "0.5rem",
                      borderRadius: "50%",
                      background: EMBER, // ember — unread
                      flexShrink: 0,
                      marginTop: "0.375rem",
                    }} />
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* One guarded entrance + CSS-only hover + gold focus rings */}
      <style>{`
        .np-row, .np-pill, .np-quiet { transition: border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease; }
        @media (hover: hover) {
          .np-row:hover { background: rgba(154,79,42,0.07) !important; }
          .np-pill:hover, .np-quiet:hover { border-color: ${EMBER}; color: ${EMBER}; }
        }
        .np-row:active { background: rgba(154,79,42,0.12) !important; }
        .np-pill:active, .np-quiet:active { opacity: 0.8; }
        .np-row:focus-visible, .np-pill:focus-visible, .np-quiet:focus-visible {
          outline: 0.1875rem solid ${GOLD};
          outline-offset: 0.1875rem;
        }
        @media (prefers-reduced-motion: no-preference) {
          .np-board { animation: np-rise 0.35s ease-out both; }
        }
        @keyframes np-rise { from { opacity: 0; transform: translateY(0.375rem); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .np-board, .np-row, .np-pill, .np-quiet { animation: none !important; transition: none !important; }
        }
      `}</style>

      {tutorialOpen && typeof document !== "undefined" && createPortal(
        <>
          <style>{`
            @media (prefers-reduced-motion: no-preference) {
              .np-tutorial-card { animation: npNudgeCardIn 0.3s ease both; }
            }
            @keyframes npNudgeCardIn { from { opacity:0; transform:translate(-50%,calc(-50% + 0.375rem)); } to { opacity:1; transform:translate(-50%,-50%); } }
            @media (prefers-reduced-motion: reduce) { .np-tutorial-card { animation: none !important; } }
            @media (hover: hover) {
              .np-tutorial-skip:hover { color: #E8C766; }
              .np-tutorial-cta:hover { box-shadow: ${SHADOW[2]}; }
            }
            .np-tutorial-skip:focus-visible, .np-tutorial-cta:focus-visible {
              outline: 0.1875rem solid ${GOLD};
              outline-offset: 0.1875rem;
            }
          `}</style>
          <div
            style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(64,59,54,0.4)", pointerEvents:"auto" }} /* warm-ink scrim */
          />
          <div
            className="np-tutorial-card"
            style={{
              position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:1001,
              width: isMobile ? "calc(100vw - 2rem)" : "22rem", maxWidth:"24rem",
              maxHeight: "calc(100dvh - 4rem)", overflowY: "auto",
            }}
          >
            <div style={{
              background:"linear-gradient(160deg, #2A2018 0%, #201811 100%)",
              borderRadius:"1rem", padding:"1.25rem 1.25rem 1rem",
              border:"0.0625rem solid rgba(212,175,55,0.35)",
              boxShadow:"0 0.75rem 2rem rgba(0,0,0,0.42), inset 0 0.0625rem 0 rgba(212,175,55,0.12)",
              display:"flex", flexDirection:"column", gap:"0.75rem",
            }}>
              <div style={{
                fontFamily:T.font.display, fontStyle:"italic", fontSize:"1.0625rem", fontWeight:600,
                color:"#E8C766", lineHeight:1.15,
              }}>
                {t("tutorialTitle")}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.4375rem" }}>
                {[
                  t("tutorialBullet1"),
                  t("tutorialBullet2"),
                  t("tutorialBullet3"),
                  t("tutorialBullet4"),
                  t("tutorialBullet5"),
                  t("tutorialBullet6"),
                ].map((text, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"0.625rem" }}>
                    <div style={{
                      width:"0.375rem", height:"0.375rem", borderRadius:"50%", flexShrink:0, marginTop:"0.4375rem",
                      background:"linear-gradient(135deg, #D4AF37, #B85C38)",
                    }} aria-hidden="true" />
                    <span style={{
                      fontFamily:T.font.body, fontSize:"0.8125rem",
                      color:"rgba(250,247,235,0.9)", lineHeight:1.5,
                    }}>
                      {text}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{
                fontFamily:T.font.body, fontSize:"0.8125rem", /* canon meta */
                color:"rgba(232,215,180,0.55)", fontStyle:"italic", marginTop:"0.125rem",
              }}>
                {t("tutorialFooter")}
              </div>
              <div style={{
                display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"0.125rem",
              }}>
                <button
                  onClick={closeTutorial}
                  className="np-tutorial-skip"
                  style={{
                    display:"inline-flex", alignItems:"center", justifyContent:"center",
                    fontFamily:T.font.body, fontSize:"0.875rem", fontWeight:500, color:"rgba(232,215,180,0.55)",
                    background:"transparent", border:"none",
                    minHeight:"2.75rem", padding:"0 0.75rem",
                    cursor:"pointer",
                  }}
                >
                  {t("tutorialSkip")}
                </button>
                <button
                  onClick={closeTutorial}
                  className="np-tutorial-cta"
                  style={{
                    display:"inline-flex", alignItems:"center", justifyContent:"center",
                    fontFamily:T.font.body, fontSize:"0.875rem", fontWeight:600, color:CREAM,
                    background:EMBER,
                    border:"none", borderRadius:"2rem",
                    minHeight:"2.75rem", padding:"0 1.375rem",
                    cursor:"pointer",
                    boxShadow: SHADOW[1],
                  }}
                >
                  {t("tutorialGotIt")}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
