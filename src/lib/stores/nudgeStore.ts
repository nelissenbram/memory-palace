import { create } from "zustand";

const STORAGE_KEY = "mp_nudges_seen";
const ONBOARD_DATE_KEY = "mp_onboard_date";
const SKIPPED_KEY = "mp_nudges_skipped";
const MAX_AGE_DAYS = 7;

export type NudgeId =
  | "atrium_nav_modes"
  | "atrium_tools_button"
  | "atrium_notifications"
  | "atrium_help_button"
  | "atrium_user_settings"
  | "atrium_overview"
  | "atrium_go_library"
  // Mobile nav bar buttons (left to right)
  | "atrium_mob_home"
  | "atrium_mob_library"
  | "atrium_mob_palace"
  | "atrium_mob_notif"
  | "atrium_mob_help"
  | "atrium_mob_me"
  | "library_wing_sidebar"
  | "library_room_bar"
  | "library_search"
  | "library_tools"
  | "library_overview"
  | "library_import"
  | "library_go_palace"
  | "palace_subnav"
  | "palace_walk_intro"
  | "palace_click_entrance"
  | "palace_entrance_info"
  | "palace_click_wing"
  | "palace_corridor_info"
  | "palace_click_room"
  | "palace_room_overview"
  | "palace_room_info"
  | "palace_room_layout"
  | "palace_room_upload"
  | "palace_room_memory"
  | "palace_room_share";

type PageId = "atrium" | "library" | "palace";

// Ordered sequence per page — ends with a bridge nudge to the next page
const PAGE_NUDGES: Record<PageId, NudgeId[]> = {
  atrium: [
    "atrium_nav_modes", "atrium_tools_button", "atrium_notifications",
    "atrium_help_button", "atrium_user_settings",
    "atrium_overview", "atrium_go_library",
  ],
  library: [
    "library_wing_sidebar", "library_room_bar",
    "library_search", "library_tools",
    "library_import", "library_overview",
    "library_go_palace",
  ],
  palace: [
    "palace_subnav", "palace_walk_intro",
    "palace_click_entrance",
    "palace_entrance_info", "palace_click_wing",
    "palace_corridor_info", "palace_click_room",
    "palace_room_overview",
    "palace_room_info", "palace_room_layout",
    "palace_room_upload", "palace_room_memory", "palace_room_share",
  ],
};

// Mobile: explain each bottom nav button left-to-right, then overview + bridge
const MOBILE_PAGE_NUDGES: Record<PageId, NudgeId[]> = {
  atrium: [
    "atrium_mob_home", "atrium_mob_library", "atrium_mob_palace",
    "atrium_mob_notif", "atrium_mob_help", "atrium_mob_me",
    "atrium_overview", "atrium_go_library",
  ],
  library: PAGE_NUDGES.library,
  palace: PAGE_NUDGES.palace,
};

interface NudgeState {
  seenNudges: Set<string>;
  activeNudge: NudgeId | null;
  queue: NudgeId[];
  activePage: PageId | null;
  _advanceTimer: ReturnType<typeof setTimeout> | null;
  _forceCurrentPage: boolean;
  _resetCount: number;
  autoWalking: boolean;

  initPage: (page: PageId, isMobile?: boolean) => void;
  dismiss: () => void;
  skipAll: () => void;
  isActive: (id: NudgeId) => boolean;
  isNudging: () => boolean;
  reset: () => void;
  setAutoWalking: (val: boolean) => void;
}

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
  } catch {}
}

function shouldShowNudges(): boolean {
  try {
    // Once skipped, never auto-start again (? button clears this flag)
    if (localStorage.getItem(SKIPPED_KEY) === "true") return false;

    // Always respect the onboarding window — stop nudges after MAX_AGE_DAYS
    const d = localStorage.getItem(ONBOARD_DATE_KEY);
    if (d && Date.now() - new Date(d).getTime() > MAX_AGE_DAYS * 86400000) return false;

    const raw = localStorage.getItem(STORAGE_KEY);
    const seen = raw ? JSON.parse(raw) : [];
    if (seen.length === 0) return true;

    const allNudges = new Set([
      ...PAGE_NUDGES.atrium, ...PAGE_NUDGES.library, ...PAGE_NUDGES.palace,
      ...MOBILE_PAGE_NUDGES.atrium,
    ]);
    const seenSet = new Set(seen);
    if ([...allNudges].some((id) => !seenSet.has(id))) return true;

    return false;
  } catch {
    return false;
  }
}

export const useNudgeStore = create<NudgeState>((set, get) => ({
  seenNudges: new Set(),
  activeNudge: null,
  queue: [],
  activePage: null,
  _advanceTimer: null,
  _forceCurrentPage: false,
  _resetCount: 0,
  autoWalking: false,

  setAutoWalking: (val) => set({ autoWalking: val }),

  initPage: (page, isMobile) => {
    const prev = get()._advanceTimer;
    if (prev) clearTimeout(prev);

    if (!shouldShowNudges()) {
      set({ activeNudge: null, queue: [], activePage: page, _advanceTimer: null, _forceCurrentPage: false });
      return;
    }

    const seen = loadSeen();
    const forceCurrentPage = get()._forceCurrentPage;
    const nudges = isMobile ? MOBILE_PAGE_NUDGES[page] : PAGE_NUDGES[page];
    // Also count desktop nudges as "seen" for cross-page ordering
    const allAtriumSeen = [...PAGE_NUDGES.atrium, ...MOBILE_PAGE_NUDGES.atrium];
    let candidates = nudges.filter((id) => !seen.has(id));

    // Cross-page ordering: only require the bridge nudge from the previous page
    // (or any nudge on the previous page), not ALL previous nudges
    if (!forceCurrentPage) {
      if (page === "library") {
        const atriumVisited = allAtriumSeen.some((id) => seen.has(id));
        if (!atriumVisited) candidates = [];
      }
      if (page === "palace") {
        const libraryVisited = PAGE_NUDGES.library.some((id) => seen.has(id));
        const atriumVisited = allAtriumSeen.some((id) => seen.has(id));
        if (!libraryVisited && !atriumVisited) candidates = [];
      }
    }

    if (candidates.length === 0) {
      set({ seenNudges: seen, activeNudge: null, queue: [], activePage: page, _advanceTimer: null, _forceCurrentPage: false });
      return;
    }

    const [first, ...rest] = candidates;
    const timer = setTimeout(() => {
      set({ activeNudge: first });
    }, 50);

    set({ seenNudges: seen, activeNudge: null, queue: rest, activePage: page, _advanceTimer: timer, _forceCurrentPage: false });
  },

  dismiss: () => {
    const { activeNudge, queue, seenNudges } = get();
    const prev = get()._advanceTimer;
    if (prev) clearTimeout(prev);

    if (activeNudge) {
      seenNudges.add(activeNudge);
      saveSeen(seenNudges);
    }

    if (queue.length > 0) {
      const [next, ...rest] = queue;
      const timer = setTimeout(() => {
        set({ activeNudge: next });
      }, 150);
      set({ activeNudge: null, queue: rest, seenNudges, _advanceTimer: timer });
    } else {
      set({ activeNudge: null, queue: [], seenNudges, _advanceTimer: null });
    }
  },

  skipAll: () => {
    const { seenNudges, activeNudge, queue } = get();
    const prev = get()._advanceTimer;
    if (prev) clearTimeout(prev);

    // Mark ALL nudges across ALL pages (desktop + mobile) as seen
    if (activeNudge) seenNudges.add(activeNudge);
    for (const id of queue) seenNudges.add(id);
    for (const page of Object.keys(PAGE_NUDGES) as PageId[]) {
      for (const id of PAGE_NUDGES[page]) seenNudges.add(id);
      for (const id of MOBILE_PAGE_NUDGES[page]) seenNudges.add(id);
    }
    saveSeen(seenNudges);
    // Set skipped flag — tutorial never auto-starts again
    try { localStorage.setItem(SKIPPED_KEY, "true"); } catch {}
    set({ activeNudge: null, queue: [], seenNudges, _advanceTimer: null, autoWalking: false });
  },

  isActive: (id) => get().activeNudge === id,

  isNudging: () => {
    const { activeNudge, queue, _advanceTimer } = get();
    return activeNudge !== null || queue.length > 0 || _advanceTimer !== null;
  },

  reset: () => {
    const prev = get()._advanceTimer;
    if (prev) clearTimeout(prev);
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(SKIPPED_KEY); localStorage.setItem(ONBOARD_DATE_KEY, new Date().toISOString()); } catch {}
    set((s) => ({ seenNudges: new Set(), activeNudge: null, queue: [], _advanceTimer: null, _forceCurrentPage: true, _resetCount: s._resetCount + 1, autoWalking: false }));
  },
}));
