"use client";

export interface ActionItem {
  id: string;
  icon: string;
  labelKey: string;
  category: "content" | "social" | "explore";
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
  onAddMemory: () => void;
  onUploadPhotos: () => void;
  onRecordInterview: () => void;
  onWriteStory: () => void;
  onMemoryMap: () => void;
  onTimeline: () => void;
  onStatistics: () => void;
  onFamilyTree: () => void;
  onShareRoom: () => void;
  onInvites: () => void;
  onSharedWithMe: () => void;
}): ActionGroup[] {
  const groups: ActionGroup[] = [];

  // Content — creating & capturing
  groups.push({
    category: "content",
    titleKey: "actionMenu.moreContent",
    items: [
      { id: "addMemory",       icon: "plus",    labelKey: "actionMenu.addMemory",       category: "content", action: handlers.onAddMemory },
      { id: "uploadPhotos",    icon: "upload",  labelKey: "actionMenu.uploadPhotos",    category: "content", action: handlers.onUploadPhotos },
      { id: "recordInterview", icon: "mic",     labelKey: "actionMenu.recordInterview", category: "content", action: handlers.onRecordInterview },
      { id: "writeStory",      icon: "quill",   labelKey: "actionMenu.writeStory",      category: "content", action: handlers.onWriteStory },
    ],
  });

  // Explore — browsing & insights
  groups.push({
    category: "explore",
    titleKey: "actionMenu.moreExplore",
    items: [
      { id: "memoryMap",   icon: "map",       labelKey: "actionMenu.memoryMap",   category: "explore", action: handlers.onMemoryMap },
      { id: "timeline",    icon: "timeline",  labelKey: "actionMenu.timeline",    category: "explore", action: handlers.onTimeline },
      { id: "statistics",  icon: "chart",     labelKey: "actionMenu.statistics",  category: "explore", action: handlers.onStatistics },
      { id: "familyTree",  icon: "tree",      labelKey: "actionMenu.familyTree",  category: "explore", action: handlers.onFamilyTree },
    ],
  });

  // Social — sharing & collaboration
  groups.push({
    category: "social",
    titleKey: "actionMenu.moreSocial",
    items: [
      { id: "shareRoom",    icon: "share",  labelKey: "actionMenu.shareRoom",      category: "social", action: handlers.onShareRoom },
      { id: "inviteFamily",  icon: "mail",   labelKey: "actionMenu.inviteFamily",   category: "social", action: handlers.onInvites },
      { id: "viewShared",    icon: "users",  labelKey: "actionMenu.viewShared",     category: "social", action: handlers.onSharedWithMe },
    ],
  });

  return groups;
}
