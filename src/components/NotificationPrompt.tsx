"use client";

import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { usePushNotificationStore } from "@/lib/stores/pushNotificationStore";

/**
 * Tasteful push-notification opt-in prompt.
 * - Only appears after the 3rd visit (not on first visit)
 * - Only appears if the browser supports notifications
 * - Only appears if user hasn't already granted/denied or opted in
 * - Auto-dismisses after interaction
 */
export default function NotificationPrompt() {
  const { t } = useTranslation("notificationPrompt");
  const { prefs, visitCount, init, incrementVisit, setPrefs } = usePushNotificationStore();
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    init();
    incrementVisit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Don't show if push already enabled or explicitly dismissed
    if (prefs.pushEnabled) return;
    if (localStorage.getItem("mp_push_prompt_dismissed")) return;

    // Don't show until 3rd visit
    if (visitCount < 3) return;

    // Don't show if browser doesn't support notifications
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    // Don't show if already granted or denied
    if (Notification.permission !== "default") return;

    const timer = setTimeout(() => {
      setShow(true);
      requestAnimationFrame(() => setVisible(true));
    }, 3000); // Wait 3s after page load

    return () => clearTimeout(timer);
  }, [prefs.pushEnabled, visitCount]);

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        // Subscribe to push
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          dismiss();
          return;
        }

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
        });

        // Send subscription to server
        await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });

        setPrefs({ pushEnabled: true });
      }
    } catch (err) {
      console.error("[NotificationPrompt] Failed to subscribe:", err);
    }
    dismiss();
  };

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => {
      setShow(false);
      localStorage.setItem("mp_push_prompt_dismissed", "1");
    }, 300);
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 50,
        width: "21.25rem",
        background: `linear-gradient(135deg, ${T.color.linen}f8, ${T.color.warmStone}f8)`,
        backdropFilter: "blur(16px)",
        borderRadius: "1rem",
        border: `1px solid ${T.color.cream}`,
        boxShadow: "0 8px 40px rgba(44,44,42,.12), 0 0 24px rgba(139,115,85,.08)",
        padding: 0,
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity .3s ease, transform .3s ease",
      }}
    >
      {/* Top accent */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.walnut})`,
        }}
      />

      <div style={{ padding: "1.125rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <div
            style={{
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "0.75rem",
              background: `${T.color.terracotta}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              flexShrink: 0,
            }}
          >
            {"\uD83D\uDD14"}
          </div>
          <div style={{ flex: 1 }}>
            <h4
              style={{
                fontFamily: T.font.display,
                fontSize: "1.0625rem",
                fontWeight: 500,
                color: T.color.charcoal,
                margin: "0 0 4px",
              }}
            >
              {t("title")}
            </h4>
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: "0.78125rem",
                color: T.color.muted,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {t("description")}
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginTop: "1rem",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={dismiss}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.625rem",
              border: `1px solid ${T.color.cream}`,
              background: "transparent",
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              color: T.color.muted,
              cursor: "pointer",
            }}
          >
            {t("notNow")}
          </button>
          <button
            onClick={handleEnable}
            style={{
              padding: "0.5rem 1.125rem",
              borderRadius: "0.625rem",
              border: "none",
              background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
              fontFamily: T.font.body,
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#FFF",
              cursor: "pointer",
              boxShadow: `0 2px 8px ${T.color.terracotta}40`,
            }}
          >
            {t("enable")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Convert a VAPID key from base64url to Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
