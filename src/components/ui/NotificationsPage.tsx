"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import type { NotificationRow } from "@/lib/auth/notification-actions";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

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
  new_contribution: "\u270E", // ✎
  achievement:      "\u269C", // ⚜
  family_invite:    "\u2766", // ❦
  share_accepted:   "\u2766", // ❦
  on_this_day:      "\u2767", // ❧
  welcome:          "\u2727", // ✧
  reminder:         "\u29D7", // ⧗
  system:           "\u2756", // ❖
};

/**
 * Re-translate a notification message using the viewer's current locale.
 * Uses the notification `type` plus stored fields (from_user_name, room_name)
 * to reconstruct a translated string from the i18n keys.
 * Falls back to the pre-rendered `n.message` when no template exists.
 */
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
      // Achievement messages may be milestone or first-in-room.
      // Try first-in-room if room_name is present.
      if (room) return t("msg_first_in_room", { room });
      // Generic achievement fallback
      const achKey = "msg_achievement";
      const achMsg = t(achKey);
      if (achMsg !== achKey) return achMsg;
      break;
    }
    case "family_invite":
      if (name) return t("msg_family_invite", { name });
      break;
    case "share_accepted":
      if (name) return t("msg_share_accepted", { name });
      break;
    case "on_this_day": {
      // Try to extract {years} and {title} from the pre-rendered English message.
      // Pattern: "On this day, X years ago — "Title"."
      // Also handle other locale patterns loosely.
      const otdMatch = n.message.match(
        /(\d+)\s+(?:years?|jaar|Jahren?|años?|ans?)\s.*[—–-]\s*"?(.+?)"?\.?\s*$/i,
      );
      if (otdMatch) {
        return t("msg_on_this_day", { years: otdMatch[1], title: otdMatch[2] });
      }
      break;
    }
    case "welcome": {
      const wKey = "msg_welcome";
      const wMsg = t(wKey);
      if (wMsg !== wKey) return wMsg;
      break;
    }
    case "reminder": {
      const rKey = "msg_reminder";
      const rMsg = t(rKey);
      if (rMsg !== rKey) return rMsg;
      break;
    }
    case "system": {
      const sKey = "msg_system";
      const sMsg = t(sKey);
      if (sMsg !== sKey) return sMsg;
      break;
    }
  }

  // Fallback: return the pre-rendered message from the DB
  return n.message;
}

export default function NotificationsPage() {
  const { t } = useTranslation("notificationBell");
  const isMobile = useIsMobile();
  const { notifications, loading, load, markRead, markAllRead } = useNotificationStore();
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
              {EMOJI[n.type] || "\u2726"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: "0.875rem",
                fontWeight: n.read ? 400 : 600,
                color: T.color.charcoal,
                margin: 0,
                lineHeight: 1.4,
              }}>
                {getTranslatedMessage(n, t)}
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

      {tutorialOpen && typeof document !== "undefined" && createPortal(
        <>
          <style>{`
            @keyframes nudgeCardIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.95); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
          `}</style>
          <div
            style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.35)", pointerEvents:"auto" }}
          />
          <div
            style={{
              position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:1001,
              width: isMobile ? "calc(100vw - 2rem)" : "22rem", maxWidth:"24rem",
              maxHeight: "calc(100dvh - 4rem)", overflowY: "auto",
              animation: "nudgeCardIn .3s ease both",
            }}
          >
            <div style={{
              background:"rgba(42,34,24,0.94)",
              backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
              borderRadius:"1rem", padding:"1.25rem 1.25rem 1rem",
              border:"1px solid rgba(212,175,55,0.25)",
              boxShadow:"0 1rem 3rem rgba(0,0,0,0.4)",
              display:"flex", flexDirection:"column", gap:"0.75rem",
            }}>
              <div style={{
                fontFamily:T.font.display, fontSize:"0.9375rem", fontWeight:600,
                color:T.color.goldLight, letterSpacing:"0.02em",
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
                      background:`linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
                    }} />
                    <span style={{
                      fontFamily:T.font.body, fontSize:"0.8125rem",
                      color:"rgba(250,250,247,0.88)", lineHeight:1.5,
                    }}>
                      {text}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{
                fontFamily:T.font.body, fontSize:"0.75rem",
                color:"rgba(250,250,247,0.5)", fontStyle:"italic", marginTop:"0.125rem",
              }}>
                {t("tutorialFooter")}
              </div>
              <div style={{
                display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"0.125rem",
              }}>
                <button
                  onClick={closeTutorial}
                  style={{
                    fontFamily:T.font.body, fontSize:"0.75rem", fontWeight:500, color:"rgba(250,250,247,0.55)",
                    background:"transparent", border:"none", padding:"0.4375rem 0.5rem",
                    cursor:"pointer", transition:"all .2s", letterSpacing:"0.02em",
                  }}
                >
                  {t("tutorialSkip")}
                </button>
                <button
                  onClick={closeTutorial}
                  style={{
                    fontFamily:T.font.body, fontSize:"0.75rem", fontWeight:600, color:"#FFF",
                    background:`linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                    border:"none", borderRadius:"0.5rem", padding:"0.4375rem 1.125rem",
                    cursor:"pointer", transition:"all .2s", letterSpacing:"0.02em",
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
