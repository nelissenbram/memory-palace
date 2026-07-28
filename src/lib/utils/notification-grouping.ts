import type { NotificationRow } from "@/lib/auth/notification-actions";

export interface GroupedNotification {
  /** Primary notification (most recent in group) */
  primary: NotificationRow;
  /** All notifications in this group (including primary) */
  items: NotificationRow[];
  /** Number of items in group */
  count: number;
  /** Whether this is a collapsed group (count > 1) */
  grouped: boolean;
}

/** Types that should never be grouped */
const NEVER_GROUP = new Set([
  "achievement",
  "welcome",
  "on_this_day",
  "system",
  "kep_capture",
]);

/** Group window: 2 hours */
const GROUP_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * Group notifications of the same type + same target within a 2h window.
 * Returns newest-first order.
 */
export function groupNotifications(
  notifications: NotificationRow[],
): GroupedNotification[] {
  const result: GroupedNotification[] = [];
  const used = new Set<string>();

  for (const n of notifications) {
    if (used.has(n.id)) continue;

    if (NEVER_GROUP.has(n.type)) {
      result.push({ primary: n, items: [n], count: 1, grouped: false });
      used.add(n.id);
      continue;
    }

    // Find siblings: same type, same target (wing_id or room_id), within 2h
    const siblings = [n];
    const nTime = new Date(n.created_at).getTime();

    for (const other of notifications) {
      if (other.id === n.id || used.has(other.id)) continue;
      if (other.type !== n.type) continue;

      // Same target check
      const sameTarget =
        (n.wing_id && n.wing_id === other.wing_id) ||
        (n.room_id && n.room_id === other.room_id) ||
        (!n.wing_id && !n.room_id && !other.wing_id && !other.room_id);
      if (!sameTarget) continue;

      const otherTime = new Date(other.created_at).getTime();
      if (Math.abs(nTime - otherTime) <= GROUP_WINDOW_MS) {
        siblings.push(other);
      }
    }

    for (const s of siblings) used.add(s.id);
    result.push({
      primary: siblings[0],
      items: siblings,
      count: siblings.length,
      grouped: siblings.length > 1,
    });
  }

  return result;
}

/** Notification tab categories */
export type NotificationTab = "all" | "yourPalace" | "following" | "system";

const YOUR_PALACE_TYPES = new Set([
  "palace_visit",
  "comment_reply",
  "reaction",
  "new_follower",
  "collab_invite",
  "new_contribution",
]);

const FOLLOWING_TYPES = new Set(["followed_published"]);

const SYSTEM_TYPES = new Set([
  "achievement",
  "welcome",
  "on_this_day",
  "reminder",
  "system",
  "kep_capture",
]);

export function filterByTab(
  notifications: NotificationRow[],
  tab: NotificationTab,
): NotificationRow[] {
  if (tab === "all") return notifications;
  const typeSet =
    tab === "yourPalace"
      ? YOUR_PALACE_TYPES
      : tab === "following"
        ? FOLLOWING_TYPES
        : SYSTEM_TYPES;
  return notifications.filter((n) => typeSet.has(n.type));
}

/** Date section labels */
export type DateSection = "today" | "yesterday" | "thisWeek" | "earlier";

export function getDateSection(dateStr: string): DateSection {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 1 && now.getDate() === date.getDate()) return "today";
  if (diffDays < 2) return "yesterday";
  if (diffDays < 7) return "thisWeek";
  return "earlier";
}

/** Build a grouped message like "Ana, Marco, and 1 other visited your palace" */
export function buildGroupMessage(
  group: GroupedNotification,
  andOthersTemplate: (count: string) => string,
): string {
  if (!group.grouped) return group.primary.message;

  const names = group.items
    .map((n) => n.from_user_name)
    .filter(Boolean) as string[];

  if (names.length === 0) return group.primary.message;
  if (names.length === 1) return group.primary.message;
  if (names.length === 2) {
    return group.primary.message.replace(names[0], `${names[0]}, ${names[1]}`);
  }

  const rest = names.length - 2;
  const others = andOthersTemplate(String(rest));
  return group.primary.message.replace(
    names[0],
    `${names[0]}, ${names[1]}, ${others}`,
  );
}

/** Get the click-through URL for a notification */
export function getNotificationAction(n: NotificationRow): string | null {
  switch (n.type) {
    case "palace_visit":
      return n.from_user_id ? `/visit/${n.from_user_id}/walk` : null;
    case "comment_reply":
    case "reaction":
      if (n.room_id) return `/palace?room=${n.room_id}`;
      if (n.wing_id) return `/palace?wing=${n.wing_id}`;
      return "/palace";
    case "new_follower":
      // /u/[username] accepts UUIDs too — the old /explore/profile/{id} 404'd
      return n.from_user_id ? `/u/${n.from_user_id}` : "/explore";
    case "followed_published":
      return n.from_user_id ? `/visit/${n.from_user_id}/walk` : "/explore";
    case "collab_invite":
      if (n.room_id) return `/palace?room=${n.room_id}`;
      return "/palace";
    case "new_contribution":
      if (n.room_id) return `/palace?room=${n.room_id}`;
      return "/palace";
    case "achievement":
      return "/palace?achievements=1";
    case "kep_capture":
      return "/palace";
    default:
      return null;
  }
}
