import { Capacitor } from "@capacitor/core";

type PushNotifications = typeof import("@capacitor/push-notifications").PushNotifications;

let PushNotificationsPlugin: PushNotifications | null = null;

async function getPushPlugin(): Promise<PushNotifications | null> {
  if (PushNotificationsPlugin) return PushNotificationsPlugin;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import("@capacitor/push-notifications");
    PushNotificationsPlugin = mod.PushNotifications;
    return PushNotificationsPlugin;
  } catch {
    return null;
  }
}

/**
 * Initialize push notifications on native platforms.
 * Requests permission, registers for push, and sends token to backend.
 */
export async function initPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const push = await getPushPlugin();
    if (!push) return;

    // Set up listeners first (before any permission/register calls)
    await push.addListener("registration", async (token) => {
      try {
        await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: token.value,
            platform: Capacitor.getPlatform(),
          }),
        });
      } catch (e) {
        console.warn("[push] Failed to send token to server:", e);
      }
    });

    await push.addListener("pushNotificationReceived", (notification) => {
      console.log("[push] Foreground notification:", notification);
    });

    await push.addListener("pushNotificationActionPerformed", (action) => {
      const url = action.notification.data?.url;
      if (url && typeof url === "string") {
        window.location.href = url;
      }
    });

    // Check current permission status without triggering a system alert
    const status = await push.checkPermissions();

    if (status.receive === "granted") {
      // Already granted — register silently
      await push.register();
    }
    // Otherwise do NOT auto-prompt. Apple (Guideline 4.5.4) and good UX require
    // an explicit, contextual opt-in. The permission is requested only when the
    // user enables notifications in settings via requestPushPermission().
  } catch (e) {
    console.warn("[push] Init failed:", e);
  }
}

/**
 * Standalone permission request — can be called from settings UI.
 * Returns true if permission was granted.
 */
export async function requestPushPermission(): Promise<boolean> {
  try {
    const push = await getPushPlugin();
    if (!push) return false;

    const result = await push.requestPermissions();
    if (result.receive === "granted") {
      // Register now that the user has explicitly opted in (listeners were
      // attached by initPushNotifications on app mount).
      try { await push.register(); } catch { /* registration retried on next launch */ }
      return true;
    }
    return false;
  } catch (e) {
    console.warn("[push] Permission request failed:", e);
    return false;
  }
}

/**
 * Get current push notification permission status.
 * Returns 'prompt' | 'granted' | 'denied' or null if not on native.
 */
export async function getPushPermissionStatus(): Promise<string | null> {
  try {
    const push = await getPushPlugin();
    if (!push) return null;

    const result = await push.checkPermissions();
    return result.receive;
  } catch (e) {
    console.warn("[push] Permission check failed:", e);
    return null;
  }
}
