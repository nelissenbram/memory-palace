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
      { id: "timeline", icon: "timeline", labelKey: "actionMenu.timeline", category: "explore", action: handlers.onTimeline },
      { id: "map", icon: "map", labelKey: "actionMenu.memoryMap", category: "explore", action: handlers.onMemoryMap },
      { id: "interviews", icon: "mic", labelKey: "actionMenu.lifeInterviews", category: "explore", action: handlers.onInterviews },
      { id: "tracks", icon: "scroll", labelKey: "actionMenu.tracks", category: "explore", action: handlers.onTracks },
      { id: "achievements", icon: "trophy", labelKey: "actionMenu.awards", category: "explore", action: handlers.onAchievements },
    ],
  });

  // Content
  groups.push({
    category: "content",
    titleKey: "actionMenu.moreContent",
    items: [
      { id: "import", icon: "upload", labelKey: "actionMenu.massImport", category: "content", action: handlers.onMassImport },
    ],
  });

  // Social
  groups.push({
    category: "social",
    titleKey: "actionMenu.moreSocial",
    items: [
      { id: "invites", icon: "mail", labelKey: "actionMenu.invites", category: "social", action: handlers.onInvites },
      { id: "shared", icon: "users", labelKey: "actionMenu.shared", category: "social", action: handlers.onSharedWithMe },
      { id: "sharingSettings", icon: "settings", labelKey: "actionMenu.manageShares", category: "social", action: handlers.onSharingSettings },
    ],
  });

  // Settings
  groups.push({
    category: "settings",
    titleKey: "actionMenu.moreSettings",
    items: [
      { id: "wingManager", icon: "columns", labelKey: "actionMenu.customizeWings", category: "settings", action: handlers.onWingManager },
    ],
  });

  return groups;
}
