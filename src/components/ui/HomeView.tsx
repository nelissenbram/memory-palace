"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useAchievementStore, ACHIEVEMENTS } from "@/lib/stores/achievementStore";
import { useInterviewStore } from "@/lib/stores/interviewStore";
import { useUIPanelStore } from "@/lib/stores/uiPanelStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import { TRACKS } from "@/lib/constants/tracks";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";

import AtriumHero from "@/components/ui/AtriumHero";
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
import PersonalProfile from "./PersonalProfile";
import EnhanceMemories from "./EnhanceMemories";
import FeatureDiscovery from "./FeatureDiscovery";

import TuscanStyles from "./TuscanStyles";

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
  const isMobile = useIsMobile();
  const { t } = useTranslation("atrium");
  const { t: tTracks } = useTranslation("tracksPanel");
  const { t: tAch } = useTranslation("achievementsPanel");
  const { userName } = useUserStore();
  const { navMode, setNavMode } = usePalaceStore();
  const { getWings, getWingRooms } = useRoomStore();
  const { userMems, fetchRoomMemories } = useMemoryStore();
  const {
    tracks: trackProgressMap,
    totalPoints,
    getTrackProgress,
    getNextStep,
    setShowTracksPanel,
    setSelectedTrackId,
    getLevel,
    getLevelProgressInfo,
  } = useTrackStore();
  const {
    setShowPanel: setShowAchievementPanel,
    getProgress: getAchievementProgress,
    earnedIds,
    earnedDates,
  } = useAchievementStore();
  const {
    sessions: interviewSessions,
    setShowLibrary: setShowInterviewLibrary,
    setShowInterview: setShowInterview,
  } = useInterviewStore();
  const { setShowMemoryMap, setShowTimeline, setShowStatistics, setShowMassImport, setShowSharedWithMe } = useUIPanelStore();


  const { startTransition, transitionProps } = useModeTransition();

  const wings = getWings();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Prefetch all memories on mount
  useEffect(() => {
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        fetchRoomMemories(r.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── DATA GATHERING ─── */

  // All memories across all wings with wing/room context
  const allMemories = useMemo<EnrichedMemory[]>(() => {
    const result: EnrichedMemory[] = [];
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        const mems = userMems[r.id] || ROOM_MEMS[r.id] || [];
        for (const m of mems) {
          result.push({ mem: m, wing: w, room: r });
        }
      }
    }
    return result;
  }, [wings, getWingRooms, userMems]);

  // Total memories
  const totalMemories = allMemories.length;

  // Wings with at least 1 memory
  const totalWings = useMemo(() => {
    const used = new Set<string>();
    for (const { wing } of allMemories) used.add(wing.id);
    return used.size;
  }, [allMemories]);

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
      if (!mem.createdAt) return false;
      const d = new Date(mem.createdAt);
      return d.getMonth() === month && d.getDate() === day && d.getFullYear() !== year;
    });
  }, [allMemories]);

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
  }, [trackProgressMap, getTrackProgress]);

  // Achievement data — mapped to expected {id, name, icon, earnedAt?}
  const achievementProgress = getAchievementProgress();
  const achievementsList = useMemo(() => {
    return earnedIds.map((id) => {
      const ach = ACHIEVEMENTS.find((a) => a.id === id);
      return {
        id,
        name: ach?.titleKey ? tAch(ach.titleKey) : id,
        descKey: ach?.descKey,
        icon: ach?.icon ?? "🏆",
        earnedAt: earnedDates[id],
      };
    });
  }, [earnedIds, earnedDates]);

  // Shared rooms data for preview
  const sharedRoomsList = useMemo(() => {
    const result: { room: WingRoom; wing: Wing; memCount: number }[] = [];
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        if (r.shared) {
          const memCount = (userMems[r.id] || ROOM_MEMS[r.id] || []).length;
          result.push({ room: r, wing: w, memCount });
        }
      }
    }
    return result;
  }, [wings, getWingRooms, userMems]);

  /* ─── WINGS DATA FOR PERSONAL PROFILE ─── */

  const wingsData = useMemo(() => wings.map(w => ({
    id: w.id, name: w.name, icon: w.icon,
    memoryCount: allMemories.filter(m => m.wing.id === w.id).length,
  })), [wings, allMemories]);

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

  /* ─── STAGGER ANIMATION HELPER ─── */
  const sectionStyle = (index: number): React.CSSProperties => ({
    animation: mounted
      ? `atriumFadeSlideIn 0.6s ease ${0.1 + index * 0.07}s both`
      : "none",
  });

  /* ─── RENDER ─── */
  return (
    <div
      style={{
        width: "100vw",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(175deg, ${T.color.linen} 0%, ${T.color.warmStone} 55%, ${T.color.cream} 100%)`,
        fontFamily: T.font.body,
        overflow: "hidden",
      }}
    >
      <TuscanStyles />

      {/* ── SCROLLABLE CONTENT AREA ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          style={{
            maxWidth: "72rem",
            margin: "0 auto",
            padding: isMobile
              ? "1.5rem 1rem 4rem"
              : "2.5rem 2.5rem 4rem",
          }}
        >
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
          </div>

          {/* ── 2. YOUR JOURNEY (TRACK PROGRESS) ── */}
          <div
            style={{
              marginTop: "2.5rem",
              ...sectionStyle(1),
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
            />
          </div>

          {/* ── 3. INTERVIEW PROMPT ── */}
          <div
            style={{
              marginTop: "2.5rem",
              ...sectionStyle(2),
            }}
          >
            <InterviewPrompt
              hasInterviews={interviewSessions.length > 0}
              interviewCount={interviewSessions.length}
              onStartInterview={() => setShowInterview(true)}
              onViewInterviews={() => setShowInterviewLibrary(true)}
              isMobile={isMobile}
            />
          </div>

          {/* ── 4. ENHANCE MEMORIES ── */}
          <div
            style={{
              marginTop: "2.5rem",
              ...sectionStyle(3),
            }}
          >
            <EnhanceMemories
              onUploadPhotos={() => setShowMassImport(true)}
              onAIEnhance={() => handleNavigateLibrary()}
              onAddDescription={() => handleNavigateLibrary()}
              onOrganize={() => handleNavigateLibrary()}
              isMobile={isMobile}
            />
          </div>

          {/* ── 5. PERSONAL PROFILE ── */}
          <div
            style={{
              marginTop: "2.5rem",
              ...sectionStyle(4),
            }}
          >
            <PersonalProfile
              totalMemories={totalMemories}
              totalWings={totalWings}
              wingsData={wingsData}
              userName={userName}
              onViewFullProfile={() => { window.location.href = "/settings/profile"; }}
              onStartInterview={() => setShowInterview(true)}
              isMobile={isMobile}
            />
          </div>

          {/* ── 6. FEATURE DISCOVERY ── */}
          <div
            style={{
              marginTop: "2.5rem",
              ...sectionStyle(5),
            }}
          >
            <FeatureDiscovery
              onMemoryMap={() => setShowMemoryMap(true)}
              onTimeline={() => setShowTimeline(true)}
              onStatistics={() => setShowStatistics(true)}
              onFamilyTree={() => { alert("Coming soon!"); }}
              isMobile={isMobile}
            />
          </div>

          {/* ── 7. RECENT MEMORIES ── */}
          {recentMemories.length > 0 && (
            <div
              style={{
                marginTop: "2.5rem",
                ...sectionStyle(6),
              }}
            >
              <RecentMemories
                memories={recentMemories.map(({ mem, wing, room }) => ({
                  mem,
                  wingName: wing.name,
                  roomName: room.name,
                  wingIcon: wing.icon,
                }))}
                onMemoryClick={(mem) => handleMemoryClick(mem)}
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
                  wingName: wing.name,
                  year: mem.createdAt ? new Date(mem.createdAt).getFullYear() : 0,
                }))}
                onMemoryClick={(mem) => handleMemoryClick(mem)}
                isMobile={isMobile}
              />
            </div>
          )}

          {/* ── 10. SHARED ROOMS PREVIEW ── */}
          {sharedRoomsList.length > 0 && (
            <div
              style={{
                marginTop: "2.5rem",
                ...sectionStyle(9),
              }}
            >
              <SharedRoomsPreview
                sharedRooms={sharedRoomsList.map(({ room, wing, memCount }) => ({
                  id: room.id,
                  name: room.name,
                  icon: room.icon,
                  ownerName: wing.name,
                  memoryCount: memCount,
                }))}
                onRoomClick={() => setShowSharedWithMe(true)}
                onViewAll={() => setShowSharedWithMe(true)}
                isMobile={isMobile}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── MODE TRANSITION OVERLAY ── */}
      <ModeTransition {...transitionProps} />
    </div>
  );
}
