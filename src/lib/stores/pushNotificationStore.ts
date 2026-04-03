import { create } from "zustand";

export interface NotificationPreferences {
  pushEnabled: boolean;
  onThisDay: boolean;
  timeCapsule: boolean;
  memoryMilestones: boolean;
  familyActivity: boolean;
  interviewReminders: boolean;
  weeklySummaryPush: boolean;
  systemUpdates: boolean;
  emailDigest: boolean;
  monthlyHighlights: boolean;
  familyUpdatesEmail: boolean;
}

const STORAGE_KEY = "mp_notification_prefs";

const DEFAULT_PREFS: NotificationPreferences = {
  pushEnabled: false,
  onThisDay: true,
  timeCapsule: true,
  memoryMilestones: true,
  familyActivity: true,
  interviewReminders: true,
  weeklySummaryPush: false,
  systemUpdates: true,
  emailDigest: true,
  monthlyHighlights: true,
  familyUpdatesEmail: true,
};

function loadPrefs(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_PREFS;
}

function savePrefs(prefs: NotificationPreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

interface PushNotificationStore {
  prefs: NotificationPreferences;
  visitCount: number;
  init: () => void;
  setPrefs: (partial: Partial<NotificationPreferences>) => void;
  incrementVisit: () => void;
}

export const usePushNotificationStore = create<PushNotificationStore>((set, get) => ({
  prefs: DEFAULT_PREFS,
  visitCount: 0,

  init: () => {
    const prefs = loadPrefs();
    const visits = parseInt(localStorage.getItem("mp_visit_count") || "0", 10);
    set({ prefs, visitCount: visits });
  },

  setPrefs: (partial) => {
    const current = get().prefs;
    const next = { ...current, ...partial };
    savePrefs(next);
    set({ prefs: next });
  },

  incrementVisit: () => {
    const next = get().visitCount + 1;
    localStorage.setItem("mp_visit_count", String(next));
    set({ visitCount: next });
  },
}));
