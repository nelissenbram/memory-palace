"use client";

import { useState, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useNotificationStore } from "@/lib/stores/notificationStore";

export default function NotificationsPage() {
  const { prefs, init, setPrefs } = useNotificationStore();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribing, setSubscribing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    init();
    if (!("Notification" in window)) {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleTogglePush = useCallback(async () => {
    if (prefs.pushEnabled) {
      // Disable: unsubscribe from push and remove server-side subscription
      setSubscribing(true);
      try {
        const reg = await navigator.serviceWorker?.ready;
        const subscription = await reg?.pushManager?.getSubscription();
        if (subscription) {
          await fetch("/api/notifications/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        }
        setPrefs({ pushEnabled: false });
        setToast({ message: "Push notifications disabled", type: "success" });
      } catch (err) {
        console.error("Failed to unsubscribe:", err);
        setToast({ message: "Failed to disable notifications", type: "error" });
      }
      setSubscribing(false);
      return;
    }

    // Enable: request permission, subscribe, save to server
    setSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setToast({ message: "Permission denied by browser", type: "error" });
        setSubscribing(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setToast({ message: "Push not configured (missing VAPID key)", type: "error" });
        setSubscribing(false);
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!res.ok) throw new Error("Server rejected subscription");

      setPrefs({ pushEnabled: true });
      setToast({ message: "Push notifications enabled!", type: "success" });
    } catch (err) {
      console.error("Failed to subscribe:", err);
      setToast({ message: "Failed to enable notifications", type: "error" });
    }
    setSubscribing(false);
  }, [prefs.pushEnabled, setPrefs]);

  const handleToggleType = useCallback(async (key: "onThisDay" | "timeCapsule") => {
    const newVal = !prefs[key];
    setPrefs({ [key]: newVal });

    // Sync preference to server
    setSaving(true);
    try {
      await fetch("/api/notifications/subscribe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newVal }),
      });
    } catch {
      // Revert on failure
      setPrefs({ [key]: !newVal });
      setToast({ message: "Failed to save preference", type: "error" });
    }
    setSaving(false);
  }, [prefs, setPrefs]);

  const isUnsupported = permission === "unsupported";
  const isDenied = permission === "denied";

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 100,
          padding: "14px 20px", borderRadius: 12,
          background: toast.type === "success" ? "#4A6741" : "#C05050",
          color: "#FFF",
          fontFamily: T.font.body, fontSize: 13, fontWeight: 500,
          boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          animation: "fadeIn .2s ease",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span>{toast.type === "success" ? "\u2713" : "\u26A0"}</span>
          {toast.message}
          <button onClick={() => setToast(null)} style={{
            background: "none", border: "none", color: "#FFF",
            fontSize: 14, cursor: "pointer", marginLeft: 8, opacity: 0.7,
          }}>{"\u2715"}</button>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{
          fontFamily: T.font.display, fontSize: 28, fontWeight: 500,
          color: T.color.charcoal, margin: "0 0 8px",
        }}>
          Notifications
        </h2>
        <p style={{
          fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
          margin: 0, lineHeight: 1.5,
        }}>
          Choose how and when Memory Palace reminds you about your memories.
        </p>
      </div>

      {/* Browser support warning */}
      {isUnsupported && (
        <div style={{
          padding: "16px 20px", borderRadius: 12, marginBottom: 20,
          background: `${T.color.terracotta}08`,
          border: `1px solid ${T.color.terracotta}20`,
        }}>
          <p style={{
            fontFamily: T.font.body, fontSize: 13, color: T.color.walnut,
            margin: 0, lineHeight: 1.5,
          }}>
            Your browser does not support push notifications. Try using Chrome, Edge, or Firefox
            for the full experience.
          </p>
        </div>
      )}

      {/* Permission denied warning */}
      {isDenied && !isUnsupported && (
        <div style={{
          padding: "16px 20px", borderRadius: 12, marginBottom: 20,
          background: `${T.color.terracotta}08`,
          border: `1px solid ${T.color.terracotta}20`,
        }}>
          <p style={{
            fontFamily: T.font.body, fontSize: 13, color: T.color.walnut,
            margin: 0, lineHeight: 1.5,
          }}>
            Notifications are blocked by your browser. To enable them, click the lock icon in
            your address bar and allow notifications for this site, then refresh the page.
          </p>
        </div>
      )}

      {/* Push notifications toggle */}
      <div style={{
        background: T.color.white,
        borderRadius: 16,
        border: `1px solid ${T.color.cream}`,
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        overflow: "hidden",
      }}>
        {/* Main push toggle */}
        <div style={{
          padding: "20px 24px",
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: prefs.pushEnabled ? `${T.color.sage}12` : T.color.warmStone,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
          }}>
            {"\uD83D\uDD14"}
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{
              fontFamily: T.font.display, fontSize: 18, fontWeight: 600,
              color: T.color.charcoal, margin: "0 0 2px",
            }}>
              Push Notifications
            </h3>
            <p style={{
              fontFamily: T.font.body, fontSize: 13, color: T.color.muted,
              margin: 0,
            }}>
              Receive notifications even when the app is closed
            </p>
          </div>

          <ToggleSwitch
            enabled={prefs.pushEnabled}
            onChange={handleTogglePush}
            disabled={isUnsupported || isDenied || subscribing}
            loading={subscribing}
          />
        </div>

        {/* Divider + notification type toggles */}
        {prefs.pushEnabled && (
          <>
            <div style={{ height: 1, background: T.color.cream, margin: "0 24px" }} />

            {/* On This Day */}
            <div style={{
              padding: "16px 24px 16px 84px",
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <h4 style={{
                  fontFamily: T.font.body, fontSize: 14, fontWeight: 600,
                  color: T.color.charcoal, margin: "0 0 2px",
                }}>
                  &ldquo;On This Day&rdquo; reminders
                </h4>
                <p style={{
                  fontFamily: T.font.body, fontSize: 12, color: T.color.muted,
                  margin: 0,
                }}>
                  Daily reminder when you have memory anniversaries
                </p>
              </div>
              <ToggleSwitch
                enabled={prefs.onThisDay}
                onChange={() => handleToggleType("onThisDay")}
                disabled={saving}
              />
            </div>

            <div style={{ height: 1, background: T.color.cream, margin: "0 24px" }} />

            {/* Time Capsule */}
            <div style={{
              padding: "16px 24px 16px 84px",
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <h4 style={{
                  fontFamily: T.font.body, fontSize: 14, fontWeight: 600,
                  color: T.color.charcoal, margin: "0 0 2px",
                }}>
                  Time Capsule reveals
                </h4>
                <p style={{
                  fontFamily: T.font.body, fontSize: 12, color: T.color.muted,
                  margin: 0,
                }}>
                  Get notified when a time capsule is ready to open
                </p>
              </div>
              <ToggleSwitch
                enabled={prefs.timeCapsule}
                onChange={() => handleToggleType("timeCapsule")}
                disabled={saving}
              />
            </div>

            <div style={{ height: 8 }} />
          </>
        )}
      </div>

      {/* Info note */}
      <div style={{
        marginTop: 24, padding: "16px 20px", borderRadius: 12,
        background: `${T.color.sage}08`,
        border: `1px solid ${T.color.sage}15`,
      }}>
        <p style={{
          fontFamily: T.font.body, fontSize: 12, color: T.color.walnut,
          margin: 0, lineHeight: 1.5,
        }}>
          Notifications are sent once daily around 9:00 AM. Your subscription data is stored
          securely and only used to deliver the notifications you opt into. You can disable
          notifications at any time.
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ── Toggle Switch Component ──

function ToggleSwitch({
  enabled,
  onChange,
  disabled = false,
  loading = false,
}: {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        border: "none",
        background: enabled
          ? `linear-gradient(135deg, ${T.color.sage}, #5A7751)`
          : T.color.sandstone,
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background .2s ease",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          background: "#FFF",
          position: "absolute",
          top: 3,
          left: enabled ? 23 : 3,
          transition: "left .2s ease",
          boxShadow: "0 1px 4px rgba(0,0,0,.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {loading && (
          <div style={{
            width: 12, height: 12, border: `2px solid ${T.color.muted}40`,
            borderTopColor: T.color.muted, borderRadius: "50%",
            animation: "spin .6s linear infinite",
          }} />
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
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
