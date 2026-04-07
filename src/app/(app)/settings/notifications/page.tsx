"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { T } from "@/lib/theme";
import { usePushNotificationStore, NotificationPreferences } from "@/lib/stores/pushNotificationStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import Toast, { type ToastData } from "@/components/ui/Toast";
import { seedTestActivities } from "@/lib/auth/notification-actions";
import { useNotificationStore } from "@/lib/stores/notificationStore";

// ── Custom SVG Icons (Roman/Tuscan aesthetic) ──

function IconBell() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 2 12.5 2 13 2.5C13.5 3 14 4 14 5V5.5C16.5 6.5 18 9 18 12V16L20 18H4L6 16V12C6 9 7.5 6.5 10 5.5V5C10 4 10.5 3 11 2.5C11.5 2 12 2 12 2Z" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 18C10 19.1 10.9 20 12 20C13.1 20 14 19.1 14 18" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="5" r="1" fill={T.color.gold} opacity="0.4" />
    </svg>
  );
}

function IconOnThisDay() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke={T.color.gold} strokeWidth="1.5" />
      <path d="M3 9H21" stroke={T.color.gold} strokeWidth="1.5" />
      <path d="M8 2V5" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 2V5" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 13L13.1 15.3L15.7 15.6L13.8 17.3L14.3 19.9L12 18.6L9.7 19.9L10.2 17.3L8.3 15.6L10.9 15.3L12 13Z" fill={T.color.gold} opacity="0.5" stroke={T.color.gold} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

function IconTimeCapsule() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C9 2 8 3.5 8 5V6H16V5C16 3.5 15 2 12 2Z" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="7" y="6" width="10" height="4" rx="1" stroke={T.color.gold} strokeWidth="1.5" />
      <path d="M8 10L7 20C7 21 7.5 22 9 22H15C16.5 22 17 21 17 20L16 10" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14V18" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="14" r="1" fill={T.color.gold} opacity="0.5" />
    </svg>
  );
}

function IconMilestone() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14.5 7.5L20.5 8.2L16 12.4L17.2 18.3L12 15.5L6.8 18.3L8 12.4L3.5 8.2L9.5 7.5L12 2Z" stroke={T.color.gold} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2" fill={T.color.gold} opacity="0.3" />
      <path d="M8 21H16" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 18V21" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconFamily() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="7" r="3" stroke={T.color.gold} strokeWidth="1.5" />
      <circle cx="17" cy="7" r="2.5" stroke={T.color.gold} strokeWidth="1.5" />
      <path d="M3 20C3 16.7 5.7 14 9 14C10.5 14 11.8 14.5 12.8 15.4" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 20C14 17.2 15.3 15 17 15C18.7 15 20 17.2 20 20" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 19L7 17L9 19L11 17" stroke={T.color.gold} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  );
}

function IconInterview() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="10" r="5" stroke={T.color.gold} strokeWidth="1.5" />
      <path d="M12 7V10L14 11.5" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18C5 16 8 14.5 12 14.5" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M17 17L19 19" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 19L17 17L19 19" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWeeklySummary() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke={T.color.gold} strokeWidth="1.5" />
      <path d="M8 8H16" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 12H14" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 16H12" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="17" r="1.5" fill={T.color.gold} opacity="0.4" />
    </svg>
  );
}

function IconScroll() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 3C4.9 3 4 3.9 4 5V19C4 20.1 4.9 21 6 21" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 3H18C19.1 3 20 3.9 20 5V17C20 18.1 19.1 19 18 19H8C6.9 19 6 19.9 6 21V3Z" stroke={T.color.gold} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 8H16" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 12H15" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="20" r="2" stroke={T.color.gold} strokeWidth="1.5" fill={T.color.gold} opacity="0.3" />
    </svg>
  );
}

function IconCalendarTablet() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={T.color.gold} strokeWidth="1.5" />
      <path d="M3 8H21" stroke={T.color.gold} strokeWidth="1.5" />
      <rect x="6" y="11" width="3" height="2.5" rx="0.5" fill={T.color.gold} opacity="0.3" />
      <rect x="10.5" y="11" width="3" height="2.5" rx="0.5" fill={T.color.gold} opacity="0.3" />
      <rect x="15" y="11" width="3" height="2.5" rx="0.5" fill={T.color.gold} opacity="0.3" />
      <rect x="6" y="15.5" width="3" height="2.5" rx="0.5" fill={T.color.gold} opacity="0.2" />
      <rect x="10.5" y="15.5" width="3" height="2.5" rx="0.5" fill={T.color.gold} opacity="0.2" />
    </svg>
  );
}

function IconMemories() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke={T.color.gold} strokeWidth="1.5" />
      <rect x="6" y="6" width="12" height="12" rx="1" stroke={T.color.gold} strokeWidth="1" opacity="0.4" />
      <path d="M6 16L10 12L13 15L16 11L18 14" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 8C1.5 6 2 4 2 4" stroke={T.color.gold} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M22 8C22.5 6 22 4 22 4" stroke={T.color.gold} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M2 16C1.5 18 2 20 2 20" stroke={T.color.gold} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M22 16C22.5 18 22 20 22 20" stroke={T.color.gold} strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function IconInfoPillar() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="6" width="8" height="14" stroke={T.color.gold} strokeWidth="1.5" />
      <path d="M6 6H18" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 20H18" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 4H19" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 22H19" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="11" r="1.5" fill={T.color.gold} opacity="0.5" />
      <path d="M12 14V17" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconSystemUpdates() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8" stroke={T.color.gold} strokeWidth="1.5" />
      <path d="M12 8V12L15 14" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 3L3 5" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 3L21 5" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 4V2" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Notification Category Config ──

type PushPrefKey = "onThisDay" | "timeCapsule" | "memoryMilestones" | "familyActivity" | "interviewReminders" | "weeklySummaryPush" | "systemUpdates";
type EmailPrefKey = "emailDigest" | "monthlyHighlights" | "familyUpdatesEmail";

interface CategoryItem<K> {
  key: K;
  titleKey: string;
  descKey: string;
  icon: ReactNode;
}

const PUSH_CATEGORIES: CategoryItem<PushPrefKey>[] = [
  { key: "onThisDay", titleKey: "onThisDayTitle", descKey: "onThisDayDesc", icon: <IconOnThisDay /> },
  { key: "timeCapsule", titleKey: "timeCapsuleTitle", descKey: "timeCapsuleDesc", icon: <IconTimeCapsule /> },
  { key: "memoryMilestones", titleKey: "memoryMilestonesTitle", descKey: "memoryMilestonesDesc", icon: <IconMilestone /> },
  { key: "familyActivity", titleKey: "familyActivityTitle", descKey: "familyActivityDesc", icon: <IconFamily /> },
  { key: "interviewReminders", titleKey: "interviewRemindersTitle", descKey: "interviewRemindersDesc", icon: <IconInterview /> },
  { key: "weeklySummaryPush", titleKey: "weeklySummaryPushTitle", descKey: "weeklySummaryPushDesc", icon: <IconWeeklySummary /> },
  { key: "systemUpdates", titleKey: "systemUpdatesTitle", descKey: "systemUpdatesDesc", icon: <IconSystemUpdates /> },
];

const EMAIL_CATEGORIES: CategoryItem<EmailPrefKey>[] = [
  { key: "emailDigest", titleKey: "weeklyDigestTitle", descKey: "weeklyDigestDesc", icon: <IconScroll /> },
  { key: "monthlyHighlights", titleKey: "monthlyHighlightsTitle", descKey: "monthlyHighlightsDesc", icon: <IconCalendarTablet /> },
  { key: "familyUpdatesEmail", titleKey: "familyUpdatesEmailTitle", descKey: "familyUpdatesEmailDesc", icon: <IconMemories /> },
];

// ── Main Page ──

export default function NotificationsPage() {
  const { t } = useTranslation("notifications");
  const isMobile = useIsMobile();
  const { prefs, init, setPrefs } = usePushNotificationStore();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribing, setSubscribing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    init();
    if (!("Notification" in window)) {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
    // Load email preferences from server profile
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email_digest, monthly_highlights, family_updates_email")
            .eq("id", user.id)
            .single();
          if (profile) {
            const updates: Partial<NotificationPreferences> = {};
            if (typeof profile.email_digest === "boolean") updates.emailDigest = profile.email_digest;
            if (typeof profile.monthly_highlights === "boolean") updates.monthlyHighlights = profile.monthly_highlights;
            if (typeof profile.family_updates_email === "boolean") updates.familyUpdatesEmail = profile.family_updates_email;
            if (Object.keys(updates).length > 0) setPrefs(updates);
          }
        }
      } catch {
        // Silently fail — localStorage default will be used
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        setToast({ message: t("pushDisabled"), type: "success" });
      } catch (err) {
        console.error("Failed to unsubscribe:", err);
        setToast({ message: t("pushDisableFailed"), type: "error" });
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
        setToast({ message: t("pushPermissionDenied"), type: "error" });
        setSubscribing(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setToast({ message: t("pushNotConfigured"), type: "error" });
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
      setToast({ message: t("pushEnabled"), type: "success" });
    } catch (err) {
      console.error("Failed to subscribe:", err);
      setToast({ message: t("pushEnableFailed"), type: "error" });
    }
    setSubscribing(false);
  }, [prefs.pushEnabled, setPrefs, t]);

  const handleToggleCategory = useCallback(async (key: keyof NotificationPreferences) => {
    const newVal = !prefs[key];
    setPrefs({ [key]: newVal });

    setSaving(true);
    try {
      await fetch("/api/notifications/subscribe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newVal }),
      });
    } catch {
      setPrefs({ [key]: !newVal });
      setToast({ message: t("saveFailed"), type: "error" });
    }
    setSaving(false);
  }, [prefs, setPrefs, t]);

  const isUnsupported = permission === "unsupported";
  const isDenied = permission === "denied";

  return (
    <div>
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      {/* Page header — desktop only */}
      {!isMobile && (
        <div style={{ marginBottom: "1.75rem" }}>
          <h2 style={{
            fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 500,
            color: T.color.charcoal, margin: "0 0 0.5rem",
          }}>
            {t("title")}
          </h2>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
            margin: 0, lineHeight: 1.5,
          }}>
            {t("description")}
          </p>
        </div>
      )}

      {/* Browser support warning */}
      {isUnsupported && (
        <div style={{
          padding: "1rem 1.25rem", borderRadius: "0.75rem", marginBottom: "1.25rem",
          background: `${T.color.terracotta}08`,
          border: `1px solid ${T.color.terracotta}20`,
        }}>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.walnut,
            margin: 0, lineHeight: 1.5,
          }}>
            {t("browserUnsupported")}
          </p>
        </div>
      )}

      {/* Permission denied warning */}
      {isDenied && !isUnsupported && (
        <div style={{
          padding: "1rem 1.25rem", borderRadius: "0.75rem", marginBottom: "1.25rem",
          background: `${T.color.terracotta}08`,
          border: `1px solid ${T.color.terracotta}20`,
        }}>
          <p style={{
            fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.walnut,
            margin: 0, lineHeight: 1.5,
          }}>
            {t("permissionDenied")}
          </p>
        </div>
      )}

      {/* ── Push Notifications Section ── */}
      <div style={{
        background: T.color.white,
        borderRadius: "1rem",
        border: `1px solid ${T.color.cream}`,
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        overflow: "hidden",
      }}>
        {/* Section header */}
        <div style={{
          padding: "1rem 1.5rem 0.5rem",
        }}>
          <h3 style={{
            fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
            color: T.color.muted, margin: 0,
            textTransform: "uppercase" as const,
            letterSpacing: "0.03125rem",
          }}>
            {t("pushSectionHeader")}
          </h3>
        </div>

        {/* Main push toggle */}
        <div style={{
          padding: "1rem 1.5rem",
          display: "flex", alignItems: "center", gap: "1rem",
        }}>
          <div style={{
            width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", flexShrink: 0,
            background: prefs.pushEnabled ? `${T.color.gold}14` : T.color.warmStone,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <IconBell />
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{
              fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600,
              color: T.color.charcoal, margin: "0 0 0.125rem",
            }}>
              {t("pushNotifications")}
            </h3>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
              margin: 0,
            }}>
              {t("pushDescription")}
            </p>
          </div>

          <ToggleSwitch
            enabled={prefs.pushEnabled}
            onChange={handleTogglePush}
            disabled={isUnsupported || isDenied || subscribing}
            loading={subscribing}
          />
        </div>

        {/* Push sub-category toggles */}
        {prefs.pushEnabled && (
          <>
            {PUSH_CATEGORIES.map((cat, i) => (
              <div key={cat.key}>
                <div style={{ height: "0.0625rem", background: T.color.cream, margin: "0 1.5rem" }} />
                <div style={{
                  padding: "0.875rem 1.5rem",
                  display: "flex", alignItems: "center", gap: "0.875rem",
                }}>
                  <div style={{
                    width: "2.25rem", height: "2.25rem", borderRadius: "0.625rem", flexShrink: 0,
                    background: prefs[cat.key] ? `${T.color.gold}10` : T.color.warmStone,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {cat.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                      color: T.color.charcoal, margin: "0 0 0.0625rem",
                    }}>
                      {t(cat.titleKey)}
                    </h4>
                    <p style={{
                      fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
                      margin: 0, lineHeight: 1.4,
                    }}>
                      {t(cat.descKey)}
                    </p>
                  </div>
                  <ToggleSwitch
                    enabled={prefs[cat.key]}
                    onChange={() => handleToggleCategory(cat.key)}
                    disabled={saving}
                  />
                </div>
              </div>
            ))}
            <div style={{ height: "0.5rem" }} />
          </>
        )}
      </div>

      {/* ── Email Notifications Section ── */}
      <div style={{
        marginTop: "1.5rem",
        background: T.color.white,
        borderRadius: "1rem",
        border: `1px solid ${T.color.cream}`,
        boxShadow: "0 2px 8px rgba(44,44,42,.04)",
        overflow: "hidden",
      }}>
        {/* Section header */}
        <div style={{
          padding: "1rem 1.5rem 0.5rem",
        }}>
          <h3 style={{
            fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
            color: T.color.muted, margin: 0,
            textTransform: "uppercase" as const,
            letterSpacing: "0.03125rem",
          }}>
            {t("emailSectionHeader")}
          </h3>
        </div>

        {EMAIL_CATEGORIES.map((cat, i) => (
          <div key={cat.key}>
            {i > 0 && (
              <div style={{ height: "0.0625rem", background: T.color.cream, margin: "0 1.5rem" }} />
            )}
            <div style={{
              padding: "0.875rem 1.5rem",
              display: "flex", alignItems: "center", gap: "0.875rem",
            }}>
              <div style={{
                width: "2.25rem", height: "2.25rem", borderRadius: "0.625rem", flexShrink: 0,
                background: prefs[cat.key] ? `${T.color.gold}10` : T.color.warmStone,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {cat.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{
                  fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                  color: T.color.charcoal, margin: "0 0 0.0625rem",
                }}>
                  {t(cat.titleKey)}
                </h4>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
                  margin: 0, lineHeight: 1.4,
                }}>
                  {t(cat.descKey)}
                </p>
              </div>
              <ToggleSwitch
                enabled={prefs[cat.key]}
                onChange={() => handleToggleCategory(cat.key)}
                disabled={saving}
              />
            </div>
          </div>
        ))}
        <div style={{ height: "0.5rem" }} />
      </div>

      {/* Notification Schedule note */}
      <div style={{
        marginTop: "1.5rem", padding: "1rem 1.25rem", borderRadius: "0.75rem",
        background: `${T.color.sage}08`,
        border: `1px solid ${T.color.sage}15`,
        display: "flex", alignItems: "flex-start", gap: "0.75rem",
      }}>
        <div style={{ flexShrink: 0, marginTop: "0.125rem" }}>
          <IconInfoPillar />
        </div>
        <p style={{
          fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut,
          margin: 0, lineHeight: 1.5,
        }}>
          {t("scheduleNote")}
        </p>
      </div>

      {/* Test Activities — dev helper */}
      <div style={{
        marginTop: "1.5rem", padding: "1.25rem", borderRadius: "0.875rem",
        background: `${T.color.gold}08`,
        border: `1px solid ${T.color.gold}25`,
      }}>
        <div style={{
          fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600,
          color: T.color.charcoal, marginBottom: "0.25rem",
        }}>
          {t("testSectionHeader")}
        </div>
        <div style={{
          fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
          marginBottom: "0.875rem", lineHeight: 1.5,
        }}>
          {t("testSectionDesc")}
        </div>
        <button
          type="button"
          onClick={async () => {
            let diag: Awaited<ReturnType<typeof seedTestActivities>> | null = null;
            let threw: string | null = null;
            try {
              diag = await seedTestActivities();
              // eslint-disable-next-line no-console
              console.log("[seedTestActivities]", diag);
            } catch (err) {
              threw = (err as Error)?.message || String(err);
              // eslint-disable-next-line no-console
              console.error("[seedTestActivities] threw", err);
            }

            // Always inject the samples locally so the bell shows them,
            // even if the notifications DB table is missing.
            const samples = diag?.samples || [
              { type: "welcome",          message: "✧ Welcome to your Memory Palace — let's preserve something beautiful." },
              { type: "achievement",      message: "⚜ Ten memories preserved — you're off to a beautiful start." },
              { type: "achievement",      message: "❀ First memory in \"Atrium\" — this room just came alive." },
              { type: "family_invite",    message: "❦ Sofia joined your family palace." },
              { type: "new_contribution", message: "✎ Marcus added a memory to \"Living Room\"." },
              { type: "on_this_day",      message: "❧ On this day, 3 years ago — \"Grandpa's 80th birthday\"." },
              { type: "reminder",         message: "⧗ A quiet nudge: the Library has been patient. Want to add a story?" },
              { type: "system",           message: "⚜ A new feature has arrived in your palace. Explore the Atrium." },
            ];
            try {
              const store = useNotificationStore.getState();
              for (const s of samples) {
                store.addLocal({
                  user_id: "",
                  type: s.type,
                  message: s.message,
                  room_id: null,
                  room_name: null,
                  wing_id: null,
                  from_user_id: null,
                  from_user_name: null,
                  read: false,
                });
              }
              // Do NOT call store.load() — that would overwrite the local rows
              // if the server returns an empty list.
            } catch { /* ignore */ }

            // Build a diagnostic toast
            if (diag) {
              const parts: string[] = [];
              parts.push(`DB: ${diag.dbInserted}/${samples.length}`);
              parts.push(`Push: ${diag.pushSent}`);
              parts.push(`Devices: ${diag.subscriptionCount}`);
              parts.push(`VAPID: ${diag.vapidConfigured ? "✓" : "✗"}`);
              if (diag.dbError) parts.push(`Err: ${diag.dbError.slice(0, 40)}`);
              setToast({
                message: `Added 8 locally · ${parts.join(" · ")}`,
                type: "success",
              });
            } else {
              setToast({
                message: `Added 8 locally (server error: ${(threw || "unknown").slice(0, 60)})`,
                type: "success",
              });
            }
          }}
          style={{
            fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
            color: "#FFF",
            background: `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
            border: "none", borderRadius: "0.625rem",
            padding: "0.625rem 1.125rem", cursor: "pointer",
            minHeight: "2.75rem",
            boxShadow: "0 2px 8px rgba(193,127,89,.2)",
          }}
        >
          {t("sendTest")}
        </button>
      </div>

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
        width: "3rem",
        height: "1.75rem",
        borderRadius: "0.875rem",
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
          width: "1.375rem",
          height: "1.375rem",
          borderRadius: "0.6875rem",
          background: "#FFF",
          position: "absolute",
          top: 3,
          left: enabled ? "1.4375rem" : 3,
          transition: "left .2s ease",
          boxShadow: "0 1px 4px rgba(0,0,0,.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {loading && (
          <div style={{
            width: "0.75rem", height: "0.75rem", border: `2px solid ${T.color.muted}40`,
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
