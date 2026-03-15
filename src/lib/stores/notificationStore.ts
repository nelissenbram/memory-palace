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
    // Filter to last 30 days
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return items.filter((n) => new Date(n.created_at).getTime() > cutoff);
  } catch {
    return [];
  }
}

function lsSet(items: NotificationRow[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
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
      if (notifications.length > 0 || !get().useLocalFallback) {
        set({ notifications, loading: false, useLocalFallback: false });
        return;
      }
    } catch {
      // Supabase table likely doesn't exist — fall back to localStorage
    }
    // Fallback: load from localStorage
    set({ notifications: lsGet(), loading: false, useLocalFallback: true });
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
