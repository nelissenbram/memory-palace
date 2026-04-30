import { Capacitor } from "@capacitor/core";

let Haptics: typeof import("@capacitor/haptics").Haptics | null = null;

// Lazy-load Haptics only on native platforms
async function getHaptics() {
  if (Haptics) return Haptics;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const mod = await import("@capacitor/haptics");
    Haptics = mod.Haptics;
    return Haptics;
  } catch {
    return null;
  }
}

/** Light tap — navigation, button press */
export async function hapticLight() {
  const h = await getHaptics();
  if (!h) return;
  try {
    const { ImpactStyle } = await import("@capacitor/haptics");
    await h.impact({ style: ImpactStyle.Light });
  } catch {}
}

/** Medium tap — memory created, room entered */
export async function hapticMedium() {
  const h = await getHaptics();
  if (!h) return;
  try {
    const { ImpactStyle } = await import("@capacitor/haptics");
    await h.impact({ style: ImpactStyle.Medium });
  } catch {}
}

/** Success — achievement unlocked, upload complete */
export async function hapticSuccess() {
  const h = await getHaptics();
  if (!h) return;
  try {
    const { NotificationType } = await import("@capacitor/haptics");
    await h.notification({ type: NotificationType.Success });
  } catch {}
}
