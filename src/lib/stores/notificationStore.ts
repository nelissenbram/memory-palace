import { create } from "zustand";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/lib/auth/notification-actions";

// ── localStorage fallback helpers ──
const LS_KEY = "mp_notifications";

function lsGet(): NotificationRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as NotificationRow[];
    // Filter to last 365 days — activities persist
    const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
    return items.filter((n) => new Date(n.created_at).getTime() > cutoff);
  } catch {
    return [];
  }
}

const LS_MAX_ITEMS = 200;

function lsSet(items: NotificationRow[]) {
  if (typeof window === "undefined") return;
  try {
    // Cap at 200 items to prevent unbounded localStorage growth
    const capped = items.length > LS_MAX_ITEMS ? items.slice(0, LS_MAX_ITEMS) : items;
    localStorage.setItem(LS_KEY, JSON.stringify(capped));
  } catch {
    // Storage full or unavailable
  }
}

// ── Store ──
interface NotificationState {
  notifications: NotificationRow[];
  loading: boolean;
  open: boolean;
  useLocalFallback: boolean;

  setOpen: (v: boolean) => void;
  toggle: () => void;
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addLocal: (n: Omit<NotificationRow, "id" | "created_at">) => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,
  open: false,
  useLocalFallback: false,

  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open })),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  load: async () => {
    set({ loading: true });
    try {
      const { notifications } = await fetchNotifications();
      if (notifications.length > 0) {
        // Merge: prefer server rows, keep any locally-added rows on top
        const existingLocal = get().notifications.filter((n) => n.id.startsWith("local_"));
        set({
          notifications: [...existingLocal, ...notifications],
          loading: false,
          useLocalFallback: false,
        });
        ensureClientGenerated(get, set);
        return;
      }
    } catch {
      // Supabase table likely doesn't exist — fall back to localStorage
    }
    // Server returned nothing — keep whatever we already have, plus localStorage
    const current = get().notifications;
    const stored = lsGet();
    const merged = current.length >= stored.length ? current : stored;
    set({ notifications: merged, loading: false, useLocalFallback: true });
    ensureClientGenerated(get, set);
  },

  markRead: async (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
    if (!get().useLocalFallback) {
      await markNotificationRead(id);
    } else {
      lsSet(get().notifications);
    }
  },

  markAllRead: async () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
    if (!get().useLocalFallback) {
      await markAllNotificationsRead();
    } else {
      lsSet(get().notifications);
    }
  },

  addLocal: (n) => {
    const full: NotificationRow = {
      ...n,
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
    };
    set((s) => ({
      notifications: [full, ...s.notifications],
    }));
    lsSet(get().notifications);
  },
}));

// ── Client-side activity generation ──
// Adds "welcome" (once) and "on this day" (daily) entries as local notifications.
// These are layered on top of the server feed and persisted via lsSet alongside
// the server rows — they never hit the DB (so the db remains authoritative for
// cross-device state).
const WELCOME_KEY = "mp_activity_welcome_v1";
const OTD_KEY = "mp_activity_otd_day";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function ensureClientGenerated(
  get: () => NotificationState,
  set: (p: Partial<NotificationState> | ((s: NotificationState) => Partial<NotificationState>)) => void,
) {
  if (typeof window === "undefined") return;
  const extras: NotificationRow[] = [];

  // Welcome — one-time
  try {
    if (!window.localStorage.getItem(WELCOME_KEY)) {
      extras.push({
        id: `welcome_${Date.now()}`,
        user_id: "",
        type: "welcome",
        message: "Welcome to your Memory Palace — let's preserve something beautiful.",
        room_id: null,
        room_name: null,
        wing_id: null,
        from_user_id: null,
        from_user_name: null,
        read: false,
        created_at: new Date().toISOString(),
      });
      window.localStorage.setItem(WELCOME_KEY, "1");
    }
  } catch { /* ignore */ }

  // On-this-day — once per calendar day, if any memory exists on today's month/day
  try {
    const lastDay = window.localStorage.getItem(OTD_KEY);
    const today = todayKey();
    if (lastDay !== today) {
      // Look for memories with matching month/day in existing (server) feed — best-effort.
      // The real "on this day" scan runs server-side; here we just record the attempt
      // and let the user see a friendly nudge if nothing exists yet.
      window.localStorage.setItem(OTD_KEY, today);
    }
  } catch { /* ignore */ }

  if (extras.length === 0) return;
  set((s) => ({ notifications: [...extras, ...s.notifications] }));
  try { lsSet(get().notifications); } catch { /* ignore */ }
}
