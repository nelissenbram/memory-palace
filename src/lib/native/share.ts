import { Capacitor } from "@capacitor/core";

export async function shareAchievement(title: string, text: string): Promise<boolean> {
  const shareData = {
    title,
    text,
    url: "https://thememorypalace.ai",
  };

  // Try native share first (Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share(shareData);
      return true;
    } catch {
      // fall through
    }
  }

  // Fall back to Web Share API
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch {
      // fall through
    }
  }

  // Final fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(`${text}\n${shareData.url}`);
    return true;
  } catch {
    return false;
  }
}
