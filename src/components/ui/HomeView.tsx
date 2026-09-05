"use client";

import { useMemo, useCallback, useEffect, useState, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { T } from "@/lib/theme";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useAchievementStore, ACHIEVEMENTS } from "@/lib/stores/achievementStore";
import { useInterviewStore } from "@/lib/stores/interviewStore";
import { useUIPanelStore } from "@/lib/stores/uiPanelStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useNotificationStore } from "@/lib/stores/notificationStore";
import { computeWarmthLevel, computeWarmWeeks, computeWeekHistory, getTimeOfDay, TIME_WASH } from "@/lib/warmth";
import { Overline } from "@/components/ui/AtriumRelay";
import { getDemoMems } from "@/lib/constants/defaults";
import { TRACKS } from "@/lib/constants/tracks";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { translateWingName, translateRoomName } from "@/lib/constants/wings";

import AtriumHero from "@/components/ui/AtriumHero";
import AtriumRelay from "@/components/ui/AtriumRelay";
import AtriumVilla from "@/components/ui/AtriumVilla";
import { PalaceIllustration, LibraryIllustration } from "@/components/ui/AnchorArt";
import {
  TrackProgress,
  AchievementShowcase,
  RecentMemories,
} from "@/components/ui/AtriumWidgets";
import {
  OnThisDayCard,
  SharedRoomsPreview,
  InterviewPrompt,
} from "@/components/ui/AtriumActivity";
import ModeTransition, {
  useModeTransition,
} from "@/components/ui/ModeTransition";
import EnhanceMemories from "./EnhanceMemories";
import FeatureDiscovery from "./FeatureDiscovery";
import PersonaSelector from "./PersonaSelector";
import LifeStoryPanel from "./LifeStoryPanel";
import RestorePhotoPicker from "./RestorePhotoPicker";
import type { RestorablePhoto } from "./RestorePhotoPicker";

import TuscanCard from "./TuscanCard";
import TuscanStyles from "./TuscanStyles";
import { useRouter } from "next/navigation";

/* ═══════════════════════════════════════════════════════════
   P2-1: SKELETON SHIMMER BLOCK
   ═══════════════════════════════════════════════════════════ */
function SkeletonBlock({ height = "6rem", width = "100%", borderRadius = "0.75rem" }: {
  height?: string; width?: string; borderRadius?: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        height,
        width,
        borderRadius,
        background: `linear-gradient(90deg, ${T.color.cream} 25%, ${T.color.warmStone}40 50%, ${T.color.cream} 75%)`,
        backgroundSize: "40rem 100%",
        animation: "atrium-skeletonShimmer 1.8s ease-in-out infinite",
      }}
    />
  );
}

function SkeletonSection({ rows = 1, isMobile }: { rows?: number; isMobile: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} height={i === 0 ? "5rem" : "3.5rem"} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   P2-4: STREAK CALCULATION HELPER
   ═══════════════════════════════════════════════════════════ */
function computeStreak(creationDates: string[]): number {
  if (creationDates.length === 0) return 0;
  const uniqueDays = new Set(
    creationDates.map((d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    })
  );
  const sorted = Array.from(uniqueDays).sort().reverse();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  // If the most recent day is not today or yesterday, no active streak
  const mostRecent = sorted[0];
  const mrDate = new Date(mostRecent);
  const diffMs = today.getTime() - mrDate.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays > 1) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const cur = new Date(sorted[i]);
    const gap = Math.floor((prev.getTime() - cur.getTime()) / 86400000);
    if (gap === 1) streak++;
    else break;
  }
  return streak;
}

/* ═══════════════════════════════════════════════════════════
   P2-6: CONFETTI OVERLAY
   ═══════════════════════════════════════════════════════════ */
const CONFETTI_COLORS = [
  T.color.gold, T.color.terracotta, T.color.sage,
  T.color.goldLight, "#E8A87C", "#D5A6BD",
];

function ConfettiOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  const pieces = useMemo(() =>
    Array.from({ length: 40 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.8}s`,
      duration: `${1.5 + Math.random() * 1.5}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: `${0.3 + Math.random() * 0.4}rem`,
      isCircle: Math.random() > 0.5,
    })),
  []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
        animation: "atrium-confettiFadeOut 2.5s ease-out forwards",
        overflow: "hidden",
      }}
    >
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "-1rem",
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.isCircle ? "50%" : "0.0625rem",
            animation: `atrium-confettiFall ${p.duration} ease-in ${p.delay} forwards`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── PERSONA → RECOMMENDED TRACKS (ordered by relevance) ─── */
const PERSONA_TRACKS: Record<string, string[]> = {
  historian: ["preserve", "capture", "enhance", "legacy"],
  storyteller: ["enhance", "resolutions", "cocreate", "connect"],
  curator: ["visualize", "preserve", "capture", "enhance"],
  explorer: ["resolutions", "cocreate", "connect", "visualize"],
};

/* ═══════════════════════════════════════════════════════════
   ENRICHED MEMORY — memory + wing/room context
   ═══════════════════════════════════════════════════════════ */
export interface EnrichedMemory {
  mem: Mem;
  wing: Wing;
  room: WingRoom;
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function HomeView() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  const { t } = useTranslation("atrium");
  const { t: tTracks } = useTranslation("tracksPanel");
  const { t: tAch } = useTranslation("achievementsPanel");
  const { t: tPersona } = useTranslation("persona" as "common");
  const { t: tWings } = useTranslation("wings");
  const userName = useUserStore((s) => s.userName);
  // Atomic selectors — actions/getters are stable in Zustand, so selecting each
  // individually avoids the whole-store subscription that re-rendered this tree
  // on every unrelated set() (palaceStore hover/opacity/portalAnim ticks,
  // memoryStore per-memory optimistic writes + the poll). navMode was
  // destructured but never read in render, so it is dropped entirely.
  const setNavMode = usePalaceStore((s) => s.setNavMode);
  const enterEntrance = usePalaceStore((s) => s.enterEntrance);
  const getWings = useRoomStore((s) => s.getWings);
  const getWingRooms = useRoomStore((s) => s.getWingRooms);
  // Subscribe to the raw slices getWings() derives from so `wings` recomputes
  // ONLY when wing state actually changes identity (customWings/extraWings), not
  // on every render. Without this, calling getWings() bare in render made `wings`
  // an unstable dep of allMemories/totalRooms/sharedRooms/wingsData and the whole
  // derived-data pyramid re-ran on every unrelated tick (persona toggle, confetti,
  // 10-min timeOfDay, notification load, locale change, any store update).
  const customWings = useRoomStore((s) => s.customWings);
  const extraWings = useRoomStore((s) => s.extraWings);
  const userMems = useMemoryStore((s) => s.userMems);
  const fetchAllRoomMemories = useMemoryStore((s) => s.fetchAllRoomMemories);
  // useShallow grouped reads — subscribe only to these named slices/actions and
  // re-render on shallow-equality change, not on any set() to the whole store.
  const {
    tracks: trackProgressMap,
    totalPoints,
    getTrackProgress,
    getNextStep,
    setShowTracksPanel,
    setSelectedTrackId,
    setShowLegacyPanel,
    legacyReviewed,
    getLevel,
    getLevelProgressInfo,
  } = useTrackStore(useShallow((s) => ({
    tracks: s.tracks,
    totalPoints: s.totalPoints,
    getTrackProgress: s.getTrackProgress,
    getNextStep: s.getNextStep,
    setShowTracksPanel: s.setShowTracksPanel,
    setSelectedTrackId: s.setSelectedTrackId,
    setShowLegacyPanel: s.setShowLegacyPanel,
    legacyReviewed: s.legacyReviewed,
    getLevel: s.getLevel,
    getLevelProgressInfo: s.getLevelProgressInfo,
  })));
  const {
    setShowPanel: setShowAchievementPanel,
    openWithHighlight: openAchievementWithHighlight,
    getProgress: getAchievementProgress,
    earnedIds,
    earnedDates,
  } = useAchievementStore(useShallow((s) => ({
    setShowPanel: s.setShowPanel,
    openWithHighlight: s.openWithHighlight,
    getProgress: s.getProgress,
    earnedIds: s.earnedIds,
    earnedDates: s.earnedDates,
  })));
  const {
    sessions: interviewSessions,
    setShowLibrary: setShowInterviewLibrary,
    setShowInterview: setShowInterview,
    startSession: startInterviewSession,
  } = useInterviewStore(useShallow((s) => ({
    sessions: s.sessions,
    setShowLibrary: s.setShowLibrary,
    setShowInterview: s.setShowInterview,
    startSession: s.startSession,
  })));
  const setShowMemoryMap = useUIPanelStore((s) => s.setShowMemoryMap);
  const setShowTimeline = useUIPanelStore((s) => s.setShowTimeline);
  const setShowStatistics = useUIPanelStore((s) => s.setShowStatistics);
  const setShowSharedWithMe = useUIPanelStore((s) => s.setShowSharedWithMe);
  const setShowFamilyTree = useUIPanelStore((s) => s.setShowFamilyTree);
  const setShowKepCapture = useUIPanelStore((s) => s.setShowKepCapture);


  const { startTransition, transitionProps } = useModeTransition();

  // Referentially stable across renders — recomputes only when customWings or
  // extraWings change. (getWings() itself is cached in roomStore on the same
  // slice identities, so this returns the same array reference; the memo makes
  // the dependency explicit and shields the pyramid from getWings identity.)
  const wings = useMemo(() => getWings(), [getWings, customWings, extraWings]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [personaType, setPersonaType] = useState<string | null>(null);
  const [personaExpanded, setPersonaExpanded] = useState(false);
  const personaSectionRef = useRef<HTMLDivElement>(null);
  const [legacyExpanded, setLegacyExpanded] = useState(false);

  /* P2-3: Last visited room */
  const [lastVisitedRoom, setLastVisitedRoom] = useState<{ id: string; name: string } | null>(null);

  /* Life Story panel (change 11): opened from the lifestory relay tile */
  const [showLifeStory, setShowLifeStory] = useState(false);
  const [showRestorePicker, setShowRestorePicker] = useState(false);

  /* P2-6: Confetti on achievement unlock */
  const [showConfetti, setShowConfetti] = useState(false);
  const achievementToast = useAchievementStore((s) => s.toast);
  const prevToastRef = useRef<string | null>(null);

  /* P2-1: Data ready flag for skeleton loading */
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    setPersonaType(localStorage.getItem("mp_persona_type"));

    // P2-3: Read last visited room from localStorage
    try {
      const stored = localStorage.getItem("mp_last_visited_room");
      if (stored) setLastVisitedRoom(JSON.parse(stored));
    } catch { /* ignore parse errors */ }

    // Deep-link from the Settings "Retake / Take quiz" CTA (/atrium?persona=1):
    // expand the persona selector and scroll it into view, then strip the param
    // so a refresh doesn't re-trigger it.
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("persona") === "1") {
        setPersonaExpanded(true);
        setTimeout(() => {
          personaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 350);
        params.delete("persona");
        const q = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : ""));
      }
    } catch { /* SSR / malformed URL — ignore */ }
  }, []);

  // Prefetch every room's memories on mount with ONE batched query
  // (fetchAllMemories → single .in('room_id', …) round-trip), the same pattern
  // LibraryView adopted. This replaces the old per-room loop that fired up to
  // ~50 concurrent Supabase requests + IndexedDB writes (and, combined with the
  // now-stable getWings/getWingRooms, re-ran the allMemories memo 50x on cold
  // load). The room-count threshold is gone: the batch is one query regardless
  // of palace size.
  useEffect(() => {
    fetchAllRoomMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* P2-1: Mark data as ready after a short delay to allow stores to populate */
  useEffect(() => {
    const timer = setTimeout(() => setDataReady(true), 400);
    return () => clearTimeout(timer);
  }, []);

  /* P2-6: Trigger confetti when a new achievement toast appears */
  useEffect(() => {
    if (achievementToast && achievementToast.id !== prevToastRef.current) {
      prevToastRef.current = achievementToast.id;
      setShowConfetti(true);
    }
  }, [achievementToast]);

  /* ─── DATA GATHERING ─── */

  // Grief-mute (change 15): memory ids the user asked to see less of. Consulted
  // by every resurfacing path (on-this-day, evening return, memories strip);
  // the "show less" affordance lands in MemoryDetail next.
  const [griefMuted] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("mp_grief_mute") || "[]") as string[]); } catch { return new Set(); }
  });

  // "This day" glow is earned once per day, then rests (change 15).
  const [otdSeen, setOtdSeen] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = JSON.parse(localStorage.getItem("mp_otd_seen") || "{}") as Record<string, string[]>;
      return new Set(stored[new Date().toDateString()] || []);
    } catch { return new Set(); }
  });
  const markOtdSeen = useCallback((id: string) => {
    setOtdSeen((prev) => {
      const next = new Set(prev); next.add(id);
      try { localStorage.setItem("mp_otd_seen", JSON.stringify({ [new Date().toDateString()]: Array.from(next) })); } catch { /* full */ }
      return next;
    });
  }, []);

  // Sources that pass the validity guard can still 404/expire — track actual
  // load failures so broken thumbs drop out instead of showing blank squares.
  const [brokenImgIds, setBrokenImgIds] = useState<Set<string>>(() => new Set());
  const markImgBroken = useCallback((id: string) => {
    setBrokenImgIds((prev) => { const next = new Set(prev); next.add(id); return next; });
  }, []);

  // All memories across all wings with wing/room context
  const allMemories = useMemo<EnrichedMemory[]>(() => {
    const result: EnrichedMemory[] = [];
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        const mems = userMems[r.id] || getDemoMems(r.id);
        for (const m of mems) {
          result.push({ mem: m, wing: w, room: r });
        }
      }
    }
    return result;
  }, [wings, getWingRooms, userMems]);

  // Total memories
  const totalMemories = allMemories.length;

  // Total wings (always all defined wings, for coverage map denominator)
  const totalWings = wings.length;

  // Total rooms across all wings
  const totalRooms = useMemo(() => {
    let count = 0;
    for (const w of wings) count += getWingRooms(w.id).length;
    return count;
  }, [wings, getWingRooms]);

  // Shared rooms count
  const sharedRooms = useMemo(() => {
    let count = 0;
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        if (r.shared) count++;
      }
    }
    return count;
  }, [wings, getWingRooms]);

  // Recent 8 memories sorted by createdAt descending
  const recentMemories = useMemo<EnrichedMemory[]>(() => {
    return [...allMemories]
      .filter(({ mem }) => !!mem.createdAt)
      .sort((a, b) => {
        const da = new Date(a.mem.createdAt!).getTime();
        const db = new Date(b.mem.createdAt!).getTime();
        return db - da;
      })
      .slice(0, 8);
  }, [allMemories]);

  // "On this day" — memories where month+day matches today but year differs
  const onThisDayMemories = useMemo<EnrichedMemory[]>(() => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    const year = now.getFullYear();
    return allMemories.filter(({ mem }) => {
      if (!mem.createdAt || griefMuted.has(mem.id)) return false;
      const d = new Date(mem.createdAt);
      return d.getMonth() === month && d.getDate() === day && d.getFullYear() !== year;
    });
  }, [allMemories, griefMuted]);

  // Track data for TrackProgress widget — mapped to expected {id, name, icon, progress, total, description, color}
  const trackData = useMemo(() => {
    return TRACKS.map((track) => {
      const progress = getTrackProgress(track.id);
      return {
        id: track.id,
        name: tTracks(track.nameKey),
        icon: track.icon,
        progress: progress.stepsCompleted.length,
        total: track.steps.length,
        description: tTracks(track.descriptionKey),
        color: track.color,
      };
    });
  }, [trackProgressMap, getTrackProgress, tTracks]);

  // Achievement data — mapped to expected {id, name, icon, earnedAt?}
  const achievementProgress = getAchievementProgress();
  const achievementsList = useMemo(() => {
    return ACHIEVEMENTS.map((ach) => ({
      id: ach.id,
      name: ach.titleKey ? tAch(ach.titleKey) : ach.id,
      descKey: ach.descKey,
      icon: ach.icon,
      category: ach.category,
      earnedAt: earnedDates[ach.id] ?? undefined,
    }));
  }, [earnedIds, earnedDates, tAch]);

  /* P2-4: Memory creation streak */
  const memoryStreak = useMemo(() => {
    const dates = allMemories
      .map(({ mem }) => mem.createdAt)
      .filter((d): d is string => !!d);
    return computeStreak(dates);
  }, [allMemories]);

  /* ── Palace warmth (ONE shared model: hero windows, Keeper's Ledger, time wash) ── */
  const creationDates = useMemo(
    () => allMemories.map(({ mem }) => mem.createdAt).filter((d): d is string => !!d),
    [allMemories]
  );
  const warmthLevel = useMemo(() => computeWarmthLevel(creationDates), [creationDates]);
  const warmWeeks = useMemo(() => computeWarmWeeks(creationDates), [creationDates]);
  const [timeOfDay, setTimeOfDay] = useState(() => getTimeOfDay());
  useEffect(() => {
    // Re-evaluate the ambient bucket every 10 minutes so a long-open tab
    // drifts naturally from golden hour into night.
    const id = setInterval(() => setTimeOfDay(getTimeOfDay()), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Family Embers: loved-one presence from existing notifications ── */
  const notifications = useNotificationStore((s) => s.notifications);
  const setNotificationsOpen = useNotificationStore((s) => s.setOpen);
  const loadNotifications = useNotificationStore((s) => s.load);
  useEffect(() => { loadNotifications().catch(() => {}); }, [loadNotifications]);
  /* ── Steward brain inputs: daily question, evening return ── */
  // Evening Return (change 10): remember whether MP was already opened earlier
  // today, so the dusk visit becomes "collect what the steward found".
  const [openedEarlierToday, setOpenedEarlierToday] = useState(false);
  useEffect(() => {
    try {
      const today = new Date().toDateString();
      const raw = localStorage.getItem("mp_last_open");
      if (raw) {
        const prev = JSON.parse(raw) as { date: string; hour: number };
        if (prev.date === today && prev.hour < 17) setOpenedEarlierToday(true);
      }
      localStorage.setItem("mp_last_open", JSON.stringify({ date: today, hour: new Date().getHours() }));
    } catch { /* storage unavailable */ }
  }, []);

  const emberPeople = useMemo(() => {
    const byName = new Map<string, { name: string; unseen: number; latest?: string; latestAt: number }>();
    for (const n of notifications) {
      const name = n.from_user_name?.trim();
      if (!name) continue;
      const at = new Date(n.created_at).getTime() || 0;
      const cur = byName.get(name.toLowerCase());
      if (cur) {
        if (!n.read) cur.unseen++;
        if (at > cur.latestAt) { cur.latestAt = at; cur.latest = n.message; }
      } else {
        byName.set(name.toLowerCase(), { name, unseen: n.read ? 0 : 1, latest: n.message, latestAt: at });
      }
    }
    return Array.from(byName.values())
      .sort((a, b) => (b.unseen - a.unseen) || (b.latestAt - a.latestAt))
      .slice(0, 8)
      .map((p) => ({ key: p.name.toLowerCase(), name: p.name, unseen: p.unseen, latest: p.latest }));
  }, [notifications]);

  // Shared wings — wings shared WITH the user by others
  const [sharedWithMe, setSharedWithMe] = useState<{ id: string; name: string; wingName: string; memoryCount: number; icon: string; wingId?: string }[]>([]);
  const [sharedLoading, setSharedLoading] = useState(true);
  useEffect(() => {
    import("@/lib/auth/sharing-actions").then(({ getWingsSharedWithMe }) => {
      getWingsSharedWithMe().then(({ shares }) => {
        if (shares && shares.length > 0) {
          setSharedWithMe(shares.map((s: { id: string; wing_id: string; owner_name?: string }) => ({
            id: s.id,
            name: s.wing_id.replace(/_/g, " "),
            wingName: s.owner_name || t("shared.unknownOwner"),
            memoryCount: 0,
            icon: "",
            wingId: s.wing_id,
          })));
        }
      }).catch(() => {}).finally(() => setSharedLoading(false));
    }).catch(() => setSharedLoading(false));
  }, []);

  /* ─── WINGS DATA FOR PERSONAL PROFILE ─── */

  const wingsData = useMemo(() => wings.map(w => ({
    id: w.id, name: translateWingName(w, tWings), icon: w.icon,
    memoryCount: allMemories.filter(m => m.wing.id === w.id).length,
  })), [wings, allMemories, tWings]);

  /* ─── MODE SWITCHING ─── */

  const handleNavigateLibrary = useCallback(() => {
    startTransition("library", () => setNavMode("library"));
  }, [startTransition, setNavMode]);

  /**
   * Navigate to Library with a specific wing pre-selected.
   * Sets activeWing in palaceStore as a hint for LibraryView.
   * NOTE: LibraryView currently initialises selectedWing from wings[0],
   * not from palaceStore.activeWing. A future enhancement should sync
   * LibraryView's selectedWing with palaceStore.activeWing on mount.
   */
  const handleNavigateToWing = useCallback((wingId: string) => {
    usePalaceStore.setState({ activeWing: wingId });
    startTransition("library", () => setNavMode("library"));
  }, [startTransition, setNavMode]);

  /** Look up enriched memory and navigate to its wing in library */
  const handleMemoryClick = useCallback((mem: Mem) => {
    const found = allMemories.find((e) => e.mem.id === mem.id);
    if (found) {
      handleNavigateToWing(found.wing.id);
    } else {
      handleNavigateLibrary();
    }
  }, [allMemories, handleNavigateToWing, handleNavigateLibrary]);

  const handleNavigatePalace = useCallback(() => {
    startTransition("3d", () => setNavMode("3d"));
  }, [startTransition, setNavMode]);

  /* P2-3: Navigate to last visited room */
  const handleContinueLastRoom = useCallback(() => {
    if (lastVisitedRoom) {
      handleNavigateLibrary();
    }
  }, [lastVisitedRoom, handleNavigateLibrary]);

  /* ─── P2-2: STAGGER ANIMATION HELPER (increased delays) ─── */
  const sectionStyle = (index: number): React.CSSProperties => ({
    opacity: 0,
    animation: mounted
      ? `atriumFadeSlideIn 0.5s ease ${index * 0.1}s both`
      : "none",
  });

  /* ─── RENDER ─── */
  // Legacy 12-widget stack is kept (disabled) beneath the new relay for now;
  // typed boolean so TS keeps normal control-flow narrowing inside it.
  const SHOW_LEGACY_WIDGETS: boolean = false;
  // "Het paleis doet de deur open" — the drastic villa hub (AtriumVilla)
  // replaces the relay board; flip to false for instant rollback during review.
  const USE_VILLA_HUB: boolean = false;

  // ── Atrium Relay config ("The Maggiordomo" concierge board) ──
  // Phase 1: full board wired to the existing handlers. Copy is English for
  // this model-approval pass; i18n + steward-brain buckets land next.
  const _hr = new Date().getHours();
  const _greetKey = _hr < 12 ? "goodMorning" : _hr < 18 ? "goodAfternoon" : "goodEvening";
  const relayGreeting = t(_greetKey);
  const relayDatum = totalMemories > 0
    ? `${totalWings === 1 ? t("relay.wingsCountOne", { count: String(totalWings) }) : t("relay.wingsCount", { count: String(totalWings) })} · ${totalRooms === 1 ? t("relay.roomsCountOne", { count: String(totalRooms) }) : t("relay.roomsCount", { count: String(totalRooms) })} · ${totalMemories === 1 ? t("relay.memoriesCountOne", { count: String(totalMemories) }) : t("relay.memoriesCount", { count: String(totalMemories) })}`
    : t("firstMemoryPrompt");
  const goUpload = useCallback(() => { localStorage.setItem("mp_spotlight_target", "import-upload"); handleNavigateLibrary(); }, [handleNavigateLibrary]);
  const yearRange = useMemo(() => {
    const yrs = allMemories.map((m) => (m.mem.createdAt ? new Date(m.mem.createdAt).getFullYear() : 0)).filter(Boolean);
    return yrs.length ? `${Math.min(...yrs)}–${Math.max(...yrs)}` : undefined;
  }, [allMemories]);
  // Same source logic as MediaThumb (the component the Library itself uses):
  // photos/paintings/albums paint their dataUrl DIRECTLY; video/audio only a
  // stored thumbnailUrl. Preferring thumbnailUrl for photos was the source of
  // the dead fan thumbs (stale/expired poster references).
  // Pure source-resolvers, stabilised with useCallback so the memoized strip /
  // thumb lists below can list them as deps without breaking on every render.
  const validImg = useCallback((s: string | null | undefined): string | null =>
    s && (s.startsWith("data:image") || s.startsWith("http") || s.startsWith("blob:") || s.startsWith("/")) ? s : null, []);
  const memSrc = useCallback((m: Mem): string | null => {
    const isImage = m.type === "photo" || m.type === "painting" || m.type === "album";
    if (isImage) return validImg(m.dataUrl) || validImg(m.thumbnailUrl);
    const isVideo = m.type === "video" || !!m.videoBlob;
    const isAudio = m.type === "audio" || m.type === "voice" || m.type === "interview" || !!m.voiceBlob;
    if (isVideo || isAudio) return validImg(m.thumbnailUrl);
    return validImg(m.dataUrl) || validImg(m.thumbnailUrl);
  }, [validImg]);
  const libThumbs = useMemo(() => Array.from(new Set(
    recentMemories.map((r) => memSrc(r.mem)).filter((x): x is string => !!x)
  )).slice(0, 3), [recentMemories, memSrc]);
  // Photos eligible for AI restore: the user's OWN photos, straight from
  // userMems (NO demo fallback — demo mems 404 at the backend). Deliberately no
  // https check on dataUrl: a just-uploaded photo can still carry its local
  // data: preview client-side while the DB row (which is what /api/ai-enhance
  // reads) already holds the https URL — filtering on the client URL made
  // fresh uploads invisible here. Newest first.
  const restorablePhotos = useMemo<RestorablePhoto[]>(() => {
    const out: RestorablePhoto[] = [];
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        for (const m of userMems[r.id] || []) {
          if (m.type === "photo" && !m._offline && (m.dataUrl || m.thumbnailUrl)) out.push({ mem: m, roomId: r.id });
        }
      }
    }
    return out.sort((a, b) => new Date(b.mem.createdAt || 0).getTime() - new Date(a.mem.createdAt || 0).getTime());
  }, [wings, getWingRooms, userMems]);
  // Where an upload-from-the-picker lands: the newest photo's room, else the first room.
  const restoreUploadRoomId = useMemo<string | undefined>(() => {
    if (restorablePhotos.length > 0) return restorablePhotos[0].roomId;
    for (const w of wings) { const rs = getWingRooms(w.id); if (rs.length > 0) return rs[0].id; }
    return undefined;
  }, [restorablePhotos, wings, getWingRooms]);
  // Steward brain — one smart, non-duplicative suggestion (never re-offers the
  // Palace/Library anchors that already sit right below).
  // Memory tracks brought forward: an in-progress (persona-informed) journey
  // becomes the steward suggestion, with a real progress bar.
  const activeTrack = useMemo(() =>
    trackData.find((tk) => tk.progress > 0 && tk.progress < tk.total)
    || (personaType ? trackData.find((tk) => (PERSONA_TRACKS[personaType] || []).includes(tk.id) && tk.progress < tk.total) : undefined)
    || trackData.find((tk) => tk.progress < tk.total),
  [trackData, personaType]);
  // Evening Return (change 10): at dusk, if MP was already opened this morning,
  // the steward comes back from the archives with a find. Grief-mute respected.
  const eveningFind = useMemo(() => (timeOfDay === "golden" || timeOfDay === "night") && openedEarlierToday
    ? (() => {
        const pool = allMemories.filter(({ mem }) => mem.createdAt && !griefMuted.has(mem.id));
        if (pool.length === 0) return null;
        const now = new Date();
        const anniversary = pool.find(({ mem }) => { const d = new Date(mem.createdAt!); return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() !== now.getFullYear(); });
        const audio = pool.find(({ mem }) => mem.dataUrl?.startsWith("data:audio"));
        const oldest = [...pool].sort((a, b) => new Date(a.mem.createdAt!).getTime() - new Date(b.mem.createdAt!).getTime())[0];
        return anniversary || audio || oldest;
      })()
    : null,
  [timeOfDay, openedEarlierToday, allMemories, griefMuted]);
  // Daily Question (change 9): exactly one sealed prompt per day; answered
  // (memory added today) falls through to the next branch.
  const dailyQuestion = useMemo(() => {
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const answeredToday = allMemories.some(({ mem }) => mem.createdAt && new Date(mem.createdAt).toDateString() === now.toDateString());
    return totalMemories > 0 && !answeredToday ? t(`relay.q${(dayOfYear % 30) + 1}`) : null;
  }, [allMemories, totalMemories, t]);

  const relaySuggestion = useMemo(() => eveningFind
    ? { key: "lantern", title: t("relay.eveningFind"), reason: `${eveningFind.mem.title || t("relay.aMemory")} · ${translateWingName(eveningFind.wing, tWings)}${eveningFind.mem.createdAt ? `, ${new Date(eveningFind.mem.createdAt).getFullYear()}` : ""}`, onClick: () => handleMemoryClick(eveningFind.mem) }
    : (!sharedLoading && sharedWithMe.length > 0)
    ? { key: "shared", title: t("relay.sgFamilySharedTitle"), reason: t("relay.sgFamilySharedReason"), onClick: () => setShowSharedWithMe(true) }
    : dailyQuestion
    ? { key: "letter", title: dailyQuestion, reason: t("relay.sixtySeconds"), onClick: () => { localStorage.setItem("mp_spotlight_target", "write-stories"); handleNavigateLibrary(); } }
    : onThisDayMemories.length > 0
      ? { key: "timeline", title: t("relay.sgOnThisDayTitle"), reason: onThisDayMemories[0].mem.title || t("relay.sgOnThisDayReason"), onClick: () => handleMemoryClick(onThisDayMemories[0].mem) }
      : totalMemories === 0
        ? { key: "photos", title: t("relay.sgFirstPhotosTitle"), reason: t("relay.sgFirstPhotosReason"), onClick: goUpload }
        : activeTrack
          ? { key: "journeys", title: t("relay.sgContinueTrack", { name: activeTrack.name }), reason: t("relay.sgStepsOf", { done: String(activeTrack.progress), total: String(activeTrack.total) }), onClick: () => { setSelectedTrackId(activeTrack.id); setShowTracksPanel(true); }, progress: { done: activeTrack.progress, total: activeTrack.total } }
          : lastVisitedRoom
            ? { key: "continue", title: t("continueWhereLeft"), reason: lastVisitedRoom.name, onClick: handleContinueLastRoom }
            : { key: "record", title: t("relay.sgRecordTitle"), reason: t("relay.sgRecordReason"), onClick: () => setShowInterviewLibrary(true) },
  [eveningFind, sharedWithMe, sharedLoading, dailyQuestion, onThisDayMemories, totalMemories, activeTrack, lastVisitedRoom, t, tWings, handleMemoryClick, setShowSharedWithMe, handleNavigateLibrary, goUpload, setSelectedTrackId, setShowTracksPanel, handleContinueLastRoom, setShowInterviewLibrary]);
  // Personalization returns: compact "tuned for you" summary, or the full
  // selector when no persona is set yet.
  // Style quiz: label (subtle chip) when taken; the full selector otherwise.
  const personaLabel = (personaType && !personaExpanded) ? tPersona(`${personaType}Label`) : null;
  const personaQuiz = (
    // personaSectionRef rides on the quiz wherever it renders (the relay's
    // steward slot), so "change style" can scroll it into view (change 9).
    <div ref={personaSectionRef}>
      <PersonaSelector onPersonaSelected={(p) => { localStorage.setItem("mp_persona_type", p); setPersonaType(p); setPersonaExpanded(false); }} currentPersona={personaType} isMobile={isMobile} />
    </div>
  );

  // "Your memories" strip — brings back Recent Memories + On This Day + a
  // compact portrait, the emotional content that the plain relay had dropped.
  const memImg = memSrc;
  // No blank squares: on-this-day items always show (imageless ones get the
  // story-card treatment), the recent long-tail only when it has an image.
  const stripItems = useMemo(() => {
    const otdIds = new Set(onThisDayMemories.map((x) => x.mem.id));
    return [
      ...onThisDayMemories.filter((x) => memImg(x.mem) || x.mem.title).map((x) => ({ mem: x.mem, otd: true })),
      ...recentMemories.filter((x) => !otdIds.has(x.mem.id) && !!memImg(x.mem)).map((x) => ({ mem: x.mem, otd: false })),
    ].filter((it) => it.otd || !brokenImgIds.has(it.mem.id)).slice(0, 10);
  }, [onThisDayMemories, recentMemories, brokenImgIds, memImg]);
  const mtc = useMemo(() => {
    const c = { photo: 0, video: 0, story: 0 };
    for (const { mem } of allMemories) {
      if (mem.type === "photo" || mem.type === "album") c.photo++;
      else if (mem.type === "video") c.video++;
      else c.story++;
    }
    return c;
  }, [allMemories]);
  const memoriesStrip = useMemo(() => stripItems.length > 0 ? (
    <section aria-label={t("relay.yourMemories")} style={{ borderRadius: "1rem", border: "0.0625rem solid #E3D6BC", background: T.color.cream, boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.06)", padding: "1rem 1.1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
        <Overline color="#8A6410">{t("relay.yourMemories")}</Overline>
        <span aria-hidden="true" style={{ flex: 1, height: "0.0625rem", background: "linear-gradient(90deg, rgba(169,116,27,0.35), transparent)" }} />
        <button type="button" onClick={() => { localStorage.setItem("mp_library_sort", "recent"); handleNavigateLibrary(); }} style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: T.color.muted, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>{t("relay.seeAll")} →</button>
      </div>
      <div style={{ display: "flex", gap: "0.6rem", overflowX: "auto", paddingBottom: "0.35rem" }}>
        {stripItems.map((it, i) => {
          const src = brokenImgIds.has(it.mem.id) ? null : memImg(it.mem);
          // Anniversary = frame, never a badge (change 15): a double gilt frame
          // that breathes gold until opened today, then rests.
          const unseen = it.otd && !otdSeen.has(it.mem.id);
          const size = unseen ? "7rem" : "6rem";
          return (
            <button key={it.mem.id + "_" + i} type="button" onClick={() => { if (it.otd) markOtdSeen(it.mem.id); handleMemoryClick(it.mem); }} style={{ position: "relative", flex: "0 0 auto", width: size, height: size, borderRadius: "0.6rem", overflow: "hidden", border: it.otd ? "0.125rem solid #D4AF37" : "0.0625rem solid #E3D6BC", boxShadow: it.otd ? "inset 0 0 0 0.0625rem #FCFAF5" : "none", cursor: "pointer", padding: 0, background: "#F2E4D5", transition: "width 0.25s ease, height 0.25s ease" }}>
              {src ? (
                // real <img> so load failures surface via onError and the
                // broken thumb drops out of the strip on the next render
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" onError={() => markImgBroken(it.mem.id)} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", filter: "saturate(0.92)" }} />
              ) : (
                // Story card: parchment leaf with an opening quote — a written
                // memory presented as a keepsake, never a blank square.
                <span style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", justifyContent: "flex-start", background: "linear-gradient(165deg, #FCF6E5 0%, #F6ECD2 100%)", padding: "0.4rem 0.45rem", textAlign: "left" }}>
                  <span aria-hidden="true" style={{ fontFamily: T.font.display, fontSize: "1.5rem", lineHeight: 0.9, color: "#C99A2E", fontStyle: "italic" }}>&ldquo;</span>
                  <span style={{ fontFamily: T.font.display, fontStyle: "italic", fontSize: "0.6875rem", color: "#5A4A38", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{it.mem.title}</span>
                </span>
              )}
              {unseen ? <span aria-hidden="true" className="relay-ember-breathe" style={{ position: "absolute", inset: 0, background: "radial-gradient(closest-side, rgba(212,175,55,0.4), transparent 75%)", pointerEvents: "none" }} /> : null}
            </button>
          );
        })}
      </div>
      <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginTop: "0.6rem", fontVariantNumeric: "tabular-nums" }}>
        {t("relay.stripSummary", { photos: String(mtc.photo), videos: String(mtc.video), stories: String(mtc.story), wings: String(totalWings) })}
      </div>
    </section>
  ) : null, [stripItems, t, handleNavigateLibrary, brokenImgIds, memImg, otdSeen, markOtdSeen, handleMemoryClick, markImgBroken, mtc, totalWings]);
  // Keeper's Ledger — forgiving weekly "kept warm" line; always invitational,
  // never "streak lost" (grief-adjacent product, see ACTIVATING_MENU_RESEARCH).
  const relayLedger = useMemo(() => totalMemories === 0
    ? null
    : warmWeeks > 1
      ? { text: t("relay.keptWarm", { count: String(warmWeeks) }), warm: true }
      : warmWeeks === 1
        ? { text: t("relay.keptWarmOne"), warm: true }
        : { text: t("relay.quietHearth"), warm: false }, [totalMemories, warmWeeks, t]);
  const relayEmbers = useMemo(() => emberPeople.length > 0
    ? { title: t("relay.familyEmbers"), people: emberPeople, onOpen: () => setNotificationsOpen(true), scrollHint: t("relay.embersScrollHint") }
    : null, [emberPeople, t, setNotificationsOpen]);
  // Stable identities for the board's remaining scalar props so the React.memo
  // wrapper on AtriumRelay can actually skip reconciliation on unrelated ticks.
  const relayWeekHistory = useMemo(() => computeWeekHistory(creationDates), [creationDates]);
  const relayLabels = useMemo(() => ({ suggested: t("relay.suggestedForYou"), addYourName: t("relay.addYourName"), soon: t("relay.soon"), weeksWarm: t("relay.weeksWarm"), quietKept: t("relay.quietKept"), laneJourneysPill: t("relay.laneJourneysPill") }), [t]);
  // Per-lane journey pills (change 4, scoring rework): every track mapped to
  // one of the three verb lanes by its nature — collect/record new material →
  // capture; making existing content vivid → bring to life; social/legacy →
  // share. Owner feedback ("5/20 is confusing"): done/total are now JOURNEY
  // COUNTS (completed tracks over mapped tracks), xp is the earned XP for the
  // lane (sum of completed steps' pointValue + completionBonus per finished
  // track), and percent is the step-weighted progress that drives the bar.
  const laneJourneys = useMemo(() => {
    const LANE_TRACKS: Record<"capture" | "bring" | "share", string[]> = {
      capture: ["preserve", "capture", "resolutions"],
      bring: ["visualize", "enhance"],
      share: ["cocreate", "connect", "legacy"],
    };
    const openJourneys = () => setShowTracksPanel(true);
    const mk = (ids: string[]) => {
      let done = 0, total = 0, xp = 0, stepsDone = 0, stepsTotal = 0;
      for (const track of TRACKS) {
        if (!ids.includes(track.id)) continue;
        total++;
        const prog = getTrackProgress(track.id);
        const isComplete = !!prog.completedAt || prog.percentage >= 100;
        if (isComplete) done++;
        // Only count steps that are actually defined on the track (guards
        // against stale ids lingering in stepsCompleted).
        const doneSteps = track.steps.filter((s) => prog.stepsCompleted.includes(s.id));
        xp += doneSteps.reduce((sum, s) => sum + s.pointValue, 0);
        if (isComplete) xp += track.completionBonus;
        stepsDone += doneSteps.length;
        stepsTotal += track.steps.length;
      }
      const percent = stepsTotal > 0 ? Math.round((100 * stepsDone) / stepsTotal) : 0;
      return {
        done, total, xp, percent, onClick: openJourneys,
        ofLabel: t("relay.laneJourneysOf", { done: String(done), total: String(total) }),
        xpLabel: t("relay.laneJourneysXp", { xp: String(xp) }),
      };
    };
    return { capture: mk(LANE_TRACKS.capture), bring: mk(LANE_TRACKS.bring), share: mk(LANE_TRACKS.share) };
  }, [trackProgressMap, getTrackProgress, setShowTracksPanel, t]);
  // Palace + Library stay ON TOP as anchors. The Palace card's counterpart to
  // the Library's photo fan: wing seals — the lived-in wings with their counts.
  // The complete set: every wing gets its seal (canonical order); untouched
  // wings rest as quiet empty frames — the fan doubles as a coverage map.
  const wingChips = useMemo(() => wingsData.slice(0, 6).map((w) => ({ id: w.id, label: String(w.memoryCount), empty: w.memoryCount === 0 })), [wingsData]);
  // The two 300×180 anchor SVG subtrees are the single heaviest render cost on
  // the board and depend ONLY on warmth + time-of-day. Memoize the ELEMENTS so
  // unrelated re-renders (10-min timeOfDay tick, notifications load, shared-with-me
  // fetch, persona/panel/store ticks) reuse the identical element reference —
  // React then bails out of reconciling the SVG subtree entirely.
  const palaceArt = useMemo(() => <PalaceIllustration hover={false} warmth={warmthLevel} timeOfDay={timeOfDay} />, [warmthLevel, timeOfDay]);
  const libraryArt = useMemo(() => <LibraryIllustration hover={false} warmth={warmthLevel} />, [warmthLevel]);
  const relayAnchors = useMemo(() => [
    { key: "palace", title: t("relay.enterPalaceTitle"), desc: t("relay.enterPalaceDesc"), onClick: handleNavigatePalace, datum: totalMemories > 0 ? `${totalWings === 1 ? t("relay.wingsCountOne", { count: String(totalWings) }) : t("relay.wingsCount", { count: String(totalWings) })} · ${totalRooms === 1 ? t("relay.roomsCountOne", { count: String(totalRooms) }) : t("relay.roomsCount", { count: String(totalRooms) })}` : undefined, art: palaceArt, chips: wingChips },
    { key: "library", title: t("relay.enterLibraryTitle"), desc: t("relay.enterLibraryDesc"), onClick: handleNavigateLibrary, datum: totalMemories > 0 ? (totalMemories === 1 ? t("relay.memoriesCountOne", { count: String(totalMemories) }) : t("relay.memoriesCount", { count: String(totalMemories) })) : undefined, thumbs: libThumbs, art: libraryArt },
  ], [t, handleNavigatePalace, handleNavigateLibrary, totalMemories, totalWings, totalRooms, palaceArt, libraryArt, wingChips, libThumbs]);
  // score & badge total, for those who like keeping count.
  const relayScore = useMemo(() => ({ points: totalPoints, badgesEarned: achievementProgress.earned, badgesTotal: achievementProgress.total, onClick: () => setShowAchievementPanel(true) }), [totalPoints, achievementProgress.earned, achievementProgress.total, setShowAchievementPanel]);
  // Grouped by the LANDING triptych, each verb-zone its own key colour.
  // Hero-per-lane (elevation change 5): the steward leads each verb with ONE
  // full tile. The suggestion key is NEVER the lane hero (item 5): the top
  // steward card already carries that action with richer copy/progress, so
  // promoting it again would show the same action twice. Each lane instead
  // leads with a sensible default, skipping the suggested key if it collides.
  const relayLanes = useMemo(() => {
  const heroFor = (laneId: string, tileKeys: string[]): string => {
    const sug = relaySuggestion.key;
    const pick = (...prefs: string[]): string => {
      // first preference present in the lane that isn't the suggested key
      const nonDup = prefs.find((k) => tileKeys.includes(k) && k !== sug);
      if (nonDup) return nonDup;
      // else the first present-but-suggested preference (avoids empty lead),
      // finally any non-suggested tile so a hero still leads the lane
      return prefs.find((k) => tileKeys.includes(k))
        ?? tileKeys.find((k) => k !== sug)
        ?? tileKeys[0];
    };
    if (laneId === "capture") return pick(totalMemories > 0 ? "record" : "photos", "photos", "record", "write");
    if (laneId === "bringtolife") return pick("timeline", "map", "family", "insights");
    // Only lead the share lane with "shared" when the tile is genuinely
    // present (loaded AND non-empty) — tileKeys already excludes hidden tiles.
    const shareLead = sharedWithMe.length > 0 && tileKeys.includes("shared") ? "shared" : "familyGroup";
    return pick(shareLead, "familyGroup", "publish");
  };
  const markHero = <Tl extends { key: string; hidden?: boolean; soon?: boolean }>(laneId: string, tiles: Tl[]): (Tl & { hero?: boolean })[] => {
    const hk = heroFor(laneId, tiles.filter((tl) => !tl.hidden && !tl.soon).map((tl) => tl.key));
    return tiles.map((tl) => (tl.key === hk && !tl.soon && !tl.hidden ? { ...tl, hero: true } : tl));
  };
  return [
    {
      id: "capture", overline: t("relay.laneCapture"), accent: "terracotta" as const,
      tiles: [
        { key: "photos", title: t("relay.tilePhotos"), desc: t("relay.tilePhotosDesc"), onClick: goUpload, datum: mtc.photo > 0 ? (mtc.photo === 1 ? t("relay.photosCountNOne", { count: String(mtc.photo) }) : t("relay.photosCountN", { count: String(mtc.photo) })) : undefined },
        { key: "cloud", title: t("relay.tileCloud"), desc: t("relay.tileCloudDesc"), dest: t("relay.destLibrary"), onClick: () => { localStorage.setItem("mp_spotlight_target", "import-cloud"); handleNavigateLibrary(); } },
        { key: "restore", title: t("relay.tileRestore"), desc: t("relay.tileRestoreDesc"), onClick: () => setShowRestorePicker(true) },
        { key: "write", title: t("relay.tileWrite"), desc: t("relay.tileWriteDesc"), dest: t("relay.destLibrary"), onClick: () => { localStorage.setItem("mp_spotlight_target", "write-stories"); handleNavigateLibrary(); }, datum: mtc.story > 0 ? (mtc.story === 1 ? t("relay.storiesCountNOne", { count: String(mtc.story) }) : t("relay.storiesCountN", { count: String(mtc.story) })) : undefined },
        { key: "record", title: t("relay.tileInterviews"), desc: t("relay.tileInterviewsDesc"), onClick: () => setShowInterviewLibrary(true), datum: interviewSessions.length > 0 ? (interviewSessions.length === 1 ? t("relay.recordedCountOne", { count: String(interviewSessions.length) }) : t("relay.recordedCount", { count: String(interviewSessions.length) })) : undefined },
        { key: "whatsapp", title: t("relay.tileWhatsapp"), desc: t("relay.tileWhatsappDesc"), onClick: () => setShowKepCapture(true) },
        { key: "capsule", title: t("relay.tileCapsule"), desc: t("relay.tileCapsuleDesc"), dest: t("relay.destLibrary"), onClick: () => { localStorage.setItem("mp_spotlight_target", "time-capsule"); localStorage.setItem("mp_upload_time_capsule", "true"); handleNavigateLibrary(); } },
      ],
    },
    {
      id: "bringtolife", overline: t("relay.laneBringToLife"), accent: "gold" as const,
      tiles: [
        { key: "map", title: t("relay.tileMap"), desc: t("relay.tileMapDesc"), onClick: () => setShowMemoryMap(true) },
        { key: "timeline", title: t("relay.tileTimeline"), desc: t("relay.tileTimelineDesc"), onClick: () => setShowTimeline(true), datum: yearRange },
        { key: "insights", title: t("relay.tileHighlights"), desc: t("relay.tileHighlightsDesc"), onClick: () => setShowStatistics(true) },
        { key: "family", title: t("relay.tileFamilyTree"), desc: t("relay.tileFamilyTreeDesc"), onClick: () => setShowFamilyTree(true) },
        { key: "organize", title: t("relay.tileOrganize"), desc: t("relay.tileOrganizeDesc"), dest: t("relay.destPalace"), onClick: () => { startTransition("3d", () => { setNavMode("3d"); setTimeout(() => enterEntrance(), 300); }); } },
        { key: "explore", title: t("relay.tileExplore"), desc: t("relay.tileExploreDesc"), dest: t("relay.destExplore"), onClick: () => router.push("/explore") },
        { key: "lifestory", title: t("relay.tileLifeStory"), desc: t("relay.tileLifeStoryDesc"), onClick: () => setShowLifeStory(true) },
      ],
    },
    {
      id: "share", overline: t("relay.laneShare"), accent: "sage" as const,
      tiles: [
        { key: "familyGroup", title: t("relay.tileFamilyGroup"), desc: t("relay.tileFamilyGroupDesc"), dest: t("relay.destMe"), onClick: () => router.push("/settings/family") },
        { key: "invite", title: t("relay.tileInvite"), desc: t("relay.tileInviteDesc"), dest: t("relay.destMe"), onClick: () => router.push("/settings/sharing") },
        { key: "publish", title: t("relay.tilePublish"), desc: t("relay.tilePublishDesc"), dest: t("relay.destExplore"), onClick: () => router.push("/explore") },
        { key: "shared", title: t("relay.tileShared"), desc: t("relay.tileSharedDesc"), onClick: () => setShowSharedWithMe(true), datum: sharedWithMe.length > 0 ? (sharedWithMe.length === 1 ? t("relay.sharedCountOne", { count: String(sharedWithMe.length) }) : t("relay.sharedCount", { count: String(sharedWithMe.length) })) : undefined, hidden: !(sharedLoading || sharedWithMe.length > 0) },
        { key: "legacy", title: t("relay.tileLegacy"), desc: t("relay.tileLegacyDesc"), dest: t("relay.destMe"), onClick: () => router.push("/settings/legacy") },
      ],
    },
  ].map((lane) => ({ ...lane, tiles: markHero(lane.id, lane.tiles) }));
  }, [t, goUpload, mtc, handleNavigateLibrary, setShowInterviewLibrary, interviewSessions, setShowKepCapture, setShowMemoryMap, setShowTimeline, yearRange, setShowStatistics, setShowFamilyTree, startTransition, setNavMode, enterEntrance, router, setShowSharedWithMe, sharedWithMe, sharedLoading, relaySuggestion.key, totalMemories, setShowLifeStory, setShowRestorePicker]);
  const relayYou = useMemo(() => [
    { key: "journeys", label: t("relay.youJourneys"), onClick: () => setShowTracksPanel(true) },
    { key: "milestones", label: t("relay.youMilestones"), onClick: () => setShowAchievementPanel(true) },
    { key: "profile", label: t("relay.youProfile"), onClick: () => router.push("/settings/profile") },
    { key: "help", label: t("relay.youHelp"), onClick: () => router.push("/help") },
  ], [t, setShowTracksPanel, setShowAchievementPanel, router]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#FCFAF5",
        fontFamily: T.font.body,
        overflow: "hidden",
      }}
    >
      <TuscanStyles />

      {/* P2-6: Confetti overlay */}
      {showConfetti && <ConfettiOverlay onDone={() => setShowConfetti(false)} />}

      {/* ── SCROLLABLE CONTENT AREA ── */}
      <div
        className="mp-scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div
          style={{
            maxWidth: "72rem",
            margin: "0 auto",
            // top padding clears the floating NavigationBar pill (top ~4.4rem) on
            // desktop; on iPad portrait (compact) the nav is the BOTTOM bar like
            // mobile, so the 5.5rem top band is dead space — use the mobile clearance.
            padding: (isMobile || isCompact)
              ? "3rem 1.25rem calc(4.5rem + env(safe-area-inset-bottom, 0px))"
              : "5.5rem 2.5rem 6rem",
          }}
        >
          {/* ── P2-1: SKELETON LOADING STATE ── */}
          {!dataReady && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <SkeletonBlock height="10rem" />
              <SkeletonSection rows={2} isMobile={isMobile} />
              <SkeletonSection rows={2} isMobile={isMobile} />
              <SkeletonSection rows={1} isMobile={isMobile} />
            </div>
          )}

          {dataReady && (
          <>
          {USE_VILLA_HUB ? (
          <AtriumVilla
            greeting={relayGreeting}
            userName={userName}
            datumLine={relayDatum}
            ledger={relayLedger}
            embers={relayEmbers}
            timeOfDay={timeOfDay}
            warmth={warmthLevel}
            warmWeeks={warmWeeks}
            suggestion={relaySuggestion}
            onEnterPalace={handleNavigatePalace}
            onEnterLibrary={handleNavigateLibrary}
            enterPalaceLabel={t("relay.enterPalace")}
            libraryLabel={t("relay.libraryPlate")}
            suggestedOverline={t("relay.stewardSuggests")}
            palaceDatum={totalMemories > 0 ? `${totalWings} ${t("wings")} · ${totalRooms} ${t("rooms")}` : undefined}
            libraryDatum={totalMemories > 0 ? `${totalMemories}` : undefined}
            lanes={relayLanes}
            you={relayYou}
            score={relayScore}
            memoriesStrip={memoriesStrip}
            personaLabel={personaLabel}
            personaQuiz={personaQuiz}
            onAddName={() => router.push("/settings/profile")}
            isMobile={isMobile}
          />
          ) : (
          <AtriumRelay
            greeting={relayGreeting}
            userName={userName}
            datumLine={relayDatum}
            ledger={relayLedger}
            embers={relayEmbers}
            topWash={TIME_WASH[timeOfDay]}
            warmth={warmthLevel}
            weekHistory={relayWeekHistory}
            labels={relayLabels}
            laneJourneys={laneJourneys}
            score={relayScore}
            suggestion={relaySuggestion}
            personaLabel={personaLabel}
            personaQuiz={personaQuiz}
            onChangeStyle={() => {
              // The quiz replaces the steward card at the TOP of the board;
              // the persona chip lives at the bottom — scroll the quiz into
              // view so the tap visibly does something (change 9).
              setPersonaExpanded(true);
              setTimeout(() => {
                personaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 350);
            }}
            onAddName={() => router.push("/settings/profile")}
            memoriesStrip={memoriesStrip}
            anchors={relayAnchors}
            lanes={relayLanes}
            you={relayYou}
            isMobile={isMobile}
          />
          )}
          {SHOW_LEGACY_WIDGETS && (<>
          {/* ── 1. ATRIUM HERO ── */}
          <div style={sectionStyle(0)}>
            <AtriumHero
              userName={userName}
              totalMemories={totalMemories}
              totalWings={totalWings}
              totalRooms={totalRooms}
              onNavigateLibrary={handleNavigateLibrary}
              onNavigatePalace={handleNavigatePalace}
              isMobile={isMobile}
            />

            {/* Streak flame badge removed (round-10 Calm Sanctuary): gamified
                streak pressure is the wrong note for grieving 60+ Keepers. */}
            {false && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  marginTop: "0.75rem",
                  padding: "0.375rem 0.875rem",
                  borderRadius: "1rem",
                  background: `linear-gradient(135deg, ${T.color.gold}20, ${T.color.gold}08)`,
                  border: `0.0625rem solid ${T.color.gold}30`,
                  animation: "atriumFadeSlideIn 0.5s ease 0.2s both",
                }}
              >
                <span style={{ fontSize: "1rem" }}>{"\uD83D\uDD25"}</span>
                <span
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: T.color.gold,
                  }}
                >
                  {t("streak.label", { count: String(memoryStreak) })}
                </span>
                <span
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    color: T.color.muted,
                  }}
                >
                  {t("streak.keep")}
                </span>
              </div>
            )}
          </div>

          {/* ── P2-3: CONTINUE WHERE YOU LEFT OFF ── */}
          {lastVisitedRoom && (
            <div style={{ marginTop: "1.25rem", ...sectionStyle(0.5) }}>
              <div
                role="button"
                tabIndex={0}
                onClick={handleContinueLastRoom}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleContinueLastRoom(); } }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: isMobile ? "0.75rem 1rem" : "0.875rem 1.25rem",
                  borderRadius: "0.75rem",
                  background: `linear-gradient(135deg, ${T.color.terracotta}0A, ${T.color.gold}08)`,
                  border: `0.0625rem solid ${T.color.terracotta}20`,
                  cursor: "pointer",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-0.0625rem)";
                  e.currentTarget.style.boxShadow = `0 0.25rem 0.75rem ${T.color.terracotta}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Arrow-right icon */}
                <div
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "0.5rem",
                    background: `linear-gradient(135deg, ${T.color.terracotta}18, ${T.color.terracotta}08)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke={T.color.terracotta} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      color: T.color.muted,
                      margin: 0,
                    }}
                  >
                    {t("continueWhereLeft")}
                  </p>
                  <p
                    style={{
                      fontFamily: T.font.display,
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                      color: T.color.charcoal,
                      margin: "0.125rem 0 0",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {(() => { const wr = wings.flatMap(w => getWingRooms(w.id)).find(r => r.id === lastVisitedRoom.id); return wr ? translateRoomName(wr, tWings) : lastVisitedRoom.name; })()}
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                  <path d="M5 3L9 7L5 11" stroke={T.color.charcoal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          )}

          {/* ── 2. FEATURE DISCOVERY ── */}
          <div
            style={{
              marginTop: "2.5rem",
              ...sectionStyle(1),
            }}
          >
            <FeatureDiscovery
              onMemoryMap={() => setShowMemoryMap(true)}
              onTimeline={() => setShowTimeline(true)}
              onStatistics={() => setShowStatistics(true)}
              onFamilyTree={() => setShowFamilyTree(true)}
              onKep={() => setShowKepCapture(true)}
              onExplore={() => router.push("/explore")}
              isMobile={isMobile}
            />
          </div>

          {/* ── 2b. PERSONA SELECTOR (collapsible after taken) ── */}
          <div ref={personaSectionRef} style={{ marginTop: "2.5rem", ...sectionStyle(2) }}>
            {personaType && !personaExpanded ? (
              /* Compact summary when persona already selected */
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  background: `${T.color.warmStone}`,
                  border: `0.0625rem solid ${T.color.cream}`,
                }}
              >
                <span
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.875rem",
                    color: T.color.walnut,
                    fontWeight: 500,
                  }}
                >
                  {tPersona("yourStyle").replace("{type}", tPersona(`${personaType}Label`))}
                </span>
                <button
                  onClick={() => setPersonaExpanded(true)}
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: T.color.terracotta,
                    background: "none",
                    border: `0.0625rem solid ${T.color.terracotta}30`,
                    borderRadius: "0.375rem",
                    padding: "0.25rem 0.625rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    flexShrink: 0,
                    marginLeft: "0.75rem",
                  }}
                >
                  {tPersona("change")}
                </button>
              </div>
            ) : (
              /* Full PersonaSelector — expanded by default when no persona, or when user clicks Change */
              <div
                style={{
                  overflow: "hidden",
                  transition: "max-height 0.4s ease, opacity 0.3s ease",
                  maxHeight: "62.5rem",
                  opacity: 1,
                }}
              >
                <PersonaSelector
                  onPersonaSelected={(p) => {
                    localStorage.setItem("mp_persona_type", p);
                    setPersonaType(p);
                    setPersonaExpanded(false);
                  }}
                  currentPersona={personaType}
                  isMobile={isMobile}
                />
              </div>
            )}
          </div>

          {/* ── 3. YOUR JOURNEY (TRACK PROGRESS) ── */}
          <div
            style={{
              marginTop: "2.5rem",
              ...sectionStyle(2),
            }}
          >
            <TrackProgress
              tracks={trackData}
              onViewAll={() => setShowTracksPanel(true)}
              onTrackAction={(trackId) => {
                setSelectedTrackId(trackId);
                setShowTracksPanel(true);
              }}
              isMobile={isMobile}
              recommendedTrackIds={personaType ? PERSONA_TRACKS[personaType] : undefined}
              personaType={personaType ?? undefined}
              totalPoints={totalPoints}
            />
          </div>

          {/* ── 4. INTERVIEW PROMPT ── */}
          <div
            style={{
              marginTop: "2.5rem",
              ...sectionStyle(3),
            }}
          >
            <InterviewPrompt
              hasInterviews={interviewSessions.length > 0}
              interviewCount={interviewSessions.length}
              onStartInterview={() => setShowInterviewLibrary(true)}
              onStartSpecificInterview={async (templateId: string) => {
                await startInterviewSession(templateId);
                setShowInterview(true);
              }}
              onViewInterviews={() => setShowInterviewLibrary(true)}
              isMobile={isMobile}
            />
          </div>

          {/* ── 5. ENHANCE MEMORIES ── */}
          <div
            style={{
              marginTop: "2.5rem",
              ...sectionStyle(4),
            }}
          >
            <EnhanceMemories
              onUploadPhotos={() => {
                localStorage.setItem("mp_spotlight_target", "import-upload");
                handleNavigateLibrary();
              }}
              onAIEnhance={() => {
                localStorage.setItem("mp_spotlight_target", "ai-enhance");
                handleNavigateLibrary();
              }}
              onAddDescription={() => {
                localStorage.setItem("mp_spotlight_target", "write-stories");
                handleNavigateLibrary();
              }}
              onOrganize={() => {
                startTransition("3d", () => {
                  setNavMode("3d");
                  setTimeout(() => enterEntrance(), 300);
                });
              }}
              onSetupGallery={() => handleNavigateLibrary()}
              onCreateFamilyGroup={() => { router.push("/settings/family"); }}
              onCreateTimeCapsule={() => {
                localStorage.setItem("mp_upload_time_capsule", "true");
                handleNavigateLibrary();
              }}
              onSendViaWhatsApp={() => setShowKepCapture(true)}
              onPublishExplore={() => router.push("/explore")}
              isMobile={isMobile}
            />
          </div>

          {/* ── 7. RECENT MEMORIES ── */}
          {recentMemories.length > 0 && (
            <div
              style={{
                marginTop: "2.5rem",
                ...sectionStyle(5.5),
              }}
            >
              <RecentMemories
                memories={recentMemories.map(({ mem, wing, room }) => ({
                  mem,
                  wingName: translateWingName(wing, tWings),
                  roomName: translateRoomName(room, tWings),
                  wingId: wing.id,
                }))}
                onMemoryClick={(mem, wingId, roomId) => handleMemoryClick(mem)}
                onShowMore={() => {
                  localStorage.setItem("mp_library_sort", "recent");
                  handleNavigateLibrary();
                }}
                isMobile={isMobile}
              />
            </div>
          )}

          {/* ── 8. ACHIEVEMENT SHOWCASE ── */}
          <div
            style={{
              marginTop: "2.5rem",
              ...sectionStyle(7),
            }}
          >
            <AchievementShowcase
              achievements={achievementsList}
              totalEarned={achievementProgress.earned}
              totalAvailable={achievementProgress.total}
              onViewAll={() => setShowAchievementPanel(true)}
              onAchievementClick={(id) => openAchievementWithHighlight(id)}
              isMobile={isMobile}
            />
          </div>

          {/* ── 9. ON THIS DAY ── */}
          {onThisDayMemories.length > 0 && (
            <div
              style={{
                marginTop: "2.5rem",
                ...sectionStyle(8),
              }}
            >
              <OnThisDayCard
                memories={onThisDayMemories.map(({ mem, wing }) => ({
                  mem,
                  wingName: translateWingName(wing, tWings),
                  year: mem.createdAt ? new Date(mem.createdAt).getFullYear() : 0,
                }))}
                onMemoryClick={handleMemoryClick}
                isMobile={isMobile}
              />
            </div>
          )}

          {/* ── 10. SHARED ROOMS PREVIEW ── */}
          {(sharedLoading || sharedWithMe.length > 0) && (
            <div
              style={{
                marginTop: "2.5rem",
                ...sectionStyle(9),
              }}
            >
              <SharedRoomsPreview
                sharedRooms={sharedWithMe}
                onRoomClick={(roomId) => {
                  const share = sharedWithMe.find(s => s.id === roomId);
                  if (share && share.wingId) {
                    handleNavigateToWing(share.wingId);
                  } else {
                    setShowSharedWithMe(true);
                  }
                }}
                onViewAll={() => setShowSharedWithMe(true)}
                isMobile={isMobile}
                loading={sharedLoading}
              />
            </div>
          )}

          {/* ── 11. YOUR LEGACY ── */}
          <div
            style={{
              marginTop: "2.5rem",
              ...sectionStyle(10),
            }}
          >
            <TuscanCard padding={isMobile ? "1.25rem 1rem" : "1.5rem 1.75rem"}>
              {/* Header — clickable to expand/collapse */}
              <button
                onClick={() => setLegacyExpanded(!legacyExpanded)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  textAlign: "left",
                }}
              >
                {/* Scroll icon */}
                <div
                  style={{
                    width: "2.75rem",
                    height: "2.75rem",
                    borderRadius: "0.75rem",
                    background: `linear-gradient(135deg, ${T.color.gold}18, ${T.color.gold}08)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.89 20.1 3 19 3Z" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M3 9L12 13L21 9" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 5L12 9L21 5" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontFamily: T.font.display,
                      fontSize: "1.125rem",
                      fontWeight: 600,
                      color: T.color.charcoal,
                      margin: "0 0 0.25rem",
                    }}
                  >
                    {t("legacy.title")}
                  </h3>
                  <p
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.875rem",
                      color: T.color.muted,
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {t("legacy.description")}
                  </p>
                </div>

                {/* Chevron */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{
                  flexShrink: 0,
                  transform: legacyExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}>
                  <path d="M4 6L8 10L12 6" stroke={T.color.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Sub-option cards — collapsed by default */}
              {legacyExpanded && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginTop: "1.25rem" }}>
                {/* 1. Legacy Contacts */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowLegacyPanel(true)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowLegacyPanel(true); } }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    background: `linear-gradient(135deg, ${T.color.gold}08, transparent)`,
                    border: `0.0625rem solid ${T.color.gold}15`,
                    cursor: "pointer",
                    transition: "background 0.2s ease, border-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${T.color.gold}14, ${T.color.gold}08)`;
                    e.currentTarget.style.borderColor = `${T.color.gold}30`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${T.color.gold}08, transparent)`;
                    e.currentTarget.style.borderColor = `${T.color.gold}15`;
                  }}
                >
                  <div style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "0.5rem",
                    background: `linear-gradient(135deg, ${T.color.gold}14, ${T.color.gold}08)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {/* People/contacts icon — two silhouettes */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="9" cy="7" r="3.5" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2.5 20C2.5 16.5 5.5 14 9 14C10.2 14 11.3 14.3 12.3 14.8" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="17" cy="9" r="2.5" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 20C14 17.5 15.3 15.5 17 15.5C18.7 15.5 20 17.5 20 20" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: T.font.display,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: T.color.charcoal,
                      margin: 0,
                    }}>
                      {t("legacy.contacts.title")}
                    </p>
                    <p style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      color: T.color.muted,
                      margin: "0.125rem 0 0",
                      lineHeight: 1.4,
                    }}>
                      {t("legacy.contacts.desc")}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                    <path d="M5 3L9 7L5 11" stroke={T.color.charcoal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* 2. Final Messages */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { localStorage.setItem("mp_legacy_tab", "messages"); router.push("/settings/legacy"); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); localStorage.setItem("mp_legacy_tab", "messages"); router.push("/settings/legacy"); } }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    background: `linear-gradient(135deg, ${T.color.gold}08, transparent)`,
                    border: `0.0625rem solid ${T.color.gold}15`,
                    cursor: "pointer",
                    transition: "background 0.2s ease, border-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${T.color.gold}14, ${T.color.gold}08)`;
                    e.currentTarget.style.borderColor = `${T.color.gold}30`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${T.color.gold}08, transparent)`;
                    e.currentTarget.style.borderColor = `${T.color.gold}15`;
                  }}
                >
                  <div style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "0.5rem",
                    background: `linear-gradient(135deg, ${T.color.gold}14, ${T.color.gold}08)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {/* Video letter icon — camera with play triangle */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="5" width="14" height="14" rx="2" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M16 10L21 7V17L16 14" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 9.5V14.5L12 12L8 9.5Z" fill={T.color.gold} stroke={T.color.gold} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: T.font.display,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: T.color.charcoal,
                      margin: 0,
                    }}>
                      {t("legacy.messages.title")}
                    </p>
                    <p style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      color: T.color.muted,
                      margin: "0.125rem 0 0",
                      lineHeight: 1.4,
                    }}>
                      {t("legacy.messages.desc")}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                    <path d="M5 3L9 7L5 11" stroke={T.color.charcoal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* 3. Wing Access Control */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { localStorage.setItem("mp_legacy_tab", "settings"); router.push("/settings/legacy"); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); localStorage.setItem("mp_legacy_tab", "settings"); router.push("/settings/legacy"); } }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    background: `linear-gradient(135deg, ${T.color.gold}08, transparent)`,
                    border: `0.0625rem solid ${T.color.gold}15`,
                    cursor: "pointer",
                    transition: "background 0.2s ease, border-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${T.color.gold}14, ${T.color.gold}08)`;
                    e.currentTarget.style.borderColor = `${T.color.gold}30`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${T.color.gold}08, transparent)`;
                    e.currentTarget.style.borderColor = `${T.color.gold}15`;
                  }}
                >
                  <div style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "0.5rem",
                    background: `linear-gradient(135deg, ${T.color.gold}14, ${T.color.gold}08)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {/* Home/wing icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10.5Z" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      <path d="M9 21V13H15V21" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: T.font.display,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: T.color.charcoal,
                      margin: 0,
                    }}>
                      {t("legacy.wingAccess.title")}
                    </p>
                    <p style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      color: T.color.muted,
                      margin: "0.125rem 0 0",
                      lineHeight: 1.4,
                    }}>
                      {t("legacy.wingAccess.desc")}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                    <path d="M5 3L9 7L5 11" stroke={T.color.charcoal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* 4. Legacy Settings */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { localStorage.setItem("mp_legacy_tab", "settings"); router.push("/settings/legacy"); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); localStorage.setItem("mp_legacy_tab", "settings"); router.push("/settings/legacy"); } }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    background: `linear-gradient(135deg, ${T.color.gold}08, transparent)`,
                    border: `0.0625rem solid ${T.color.gold}15`,
                    cursor: "pointer",
                    transition: "background 0.2s ease, border-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${T.color.gold}14, ${T.color.gold}08)`;
                    e.currentTarget.style.borderColor = `${T.color.gold}30`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${T.color.gold}08, transparent)`;
                    e.currentTarget.style.borderColor = `${T.color.gold}15`;
                  }}
                >
                  <div style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "0.5rem",
                    background: `linear-gradient(135deg, ${T.color.gold}14, ${T.color.gold}08)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {/* Cog/settings icon */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="3" stroke={T.color.gold} strokeWidth="1.5" fill="none" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={T.color.gold} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: T.font.display,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: T.color.charcoal,
                      margin: 0,
                    }}>
                      {t("legacy.settings.title")}
                    </p>
                    <p style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      color: T.color.muted,
                      margin: "0.125rem 0 0",
                      lineHeight: 1.4,
                    }}>
                      {t("legacy.settings.desc")}
                    </p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                    <path d="M5 3L9 7L5 11" stroke={T.color.charcoal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              )}
            </TuscanCard>
          </div>
          </>)}
          </>
          )}
        </div>
      </div>

      {/* ── LIFE STORY PANEL (change 11) ── */}
      {showLifeStory && <LifeStoryPanel onClose={() => setShowLifeStory(false)} />}

      {/* ── RESTORE-PHOTO PICKER (Atrium tile → pick a photo in place, no Library detour) ── */}
      {showRestorePicker && (
        <RestorePhotoPicker
          photos={restorablePhotos}
          uploadRoomId={restoreUploadRoomId}
          onClose={() => setShowRestorePicker(false)}
        />
      )}

      {/* ── MODE TRANSITION OVERLAY ── */}
      <ModeTransition {...transitionProps} />
    </div>
  );
}
