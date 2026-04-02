"use client";

import { useCallback } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { usePalaceStore } from "@/lib/stores/palaceStore";

export interface ActionItem {
  id: string;
  icon: string;
  labelKey: string;
  category: "content" | "social" | "explore" | "settings";
  action: () => void;
}

export interface ActionGroup {
  category: string;
  titleKey: string;
  items: ActionItem[];
}

/**
 * Returns grouped actions available for the current navigation mode.
 * Accepts callbacks for opening various panels.
 */
export function useActions(handlers: {
  onTimeline: () => void;
  onMemoryMap: () => void;
  onInterviews: () => void;
  onMassImport: () => void;
  onTracks: () => void;
  onAchievements: () => void;
  onSharingSettings: () => void;
  onWingManager: () => void;
  onInvites: () => void;
  onSharedWithMe: () => void;
}): ActionGroup[] {
  const { navMode } = usePalaceStore();

  const groups: ActionGroup[] = [];

  // Explore — available in all modes
  groups.push({
    category: "explore",
    titleKey: "actionMenu.moreExplore",
    items: [
      { id: "timeline", icon: "\uD83D\uDCC5", labelKey: "actionMenu.timeline", category: "explore", action: handlers.onTimeline },
      { id: "map", icon: "\uD83C\uDF0D", labelKey: "actionMenu.memoryMap", category: "explore", action: handlers.onMemoryMap },
      { id: "interviews", icon: "\uD83C\uDF99\uFE0F", labelKey: "actionMenu.lifeInterviews", category: "explore", action: handlers.onInterviews },
      { id: "tracks", icon: "\uD83D\uDCDC", labelKey: "actionMenu.tracks", category: "explore", action: handlers.onTracks },
      { id: "achievements", icon: "\u{1F3C6}", labelKey: "actionMenu.awards", category: "explore", action: handlers.onAchievements },
    ],
  });

  // Content
  groups.push({
    category: "content",
    titleKey: "actionMenu.moreContent",
    items: [
      { id: "import", icon: "\u{1F4E6}", labelKey: "actionMenu.massImport", category: "content", action: handlers.onMassImport },
    ],
  });

  // Social
  groups.push({
    category: "social",
    titleKey: "actionMenu.moreSocial",
    items: [
      { id: "invites", icon: "\u{1F4EC}", labelKey: "actionMenu.invites", category: "social", action: handlers.onInvites },
      { id: "shared", icon: "\u{1F91D}", labelKey: "actionMenu.shared", category: "social", action: handlers.onSharedWithMe },
      { id: "sharingSettings", icon: "\u{1F6E0}\uFE0F", labelKey: "actionMenu.manageShares", category: "social", action: handlers.onSharingSettings },
    ],
  });

  // Settings
  groups.push({
    category: "settings",
    titleKey: "actionMenu.moreSettings",
    items: [
      { id: "wingManager", icon: "\u2699\uFE0F", labelKey: "actionMenu.customizeWings", category: "settings", action: handlers.onWingManager },
    ],
  });

  return groups;
}
