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
import { useTranslation } from "@/lib/hooks/useTranslation";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import { TRACKS } from "@/lib/constants/tracks";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";

import NavigationBar from "@/components/ui/NavigationBar";
import AtriumHero from "@/components/ui/AtriumHero";
import {
  QuickStats,
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

/* ═══════════════════════════════════════════════════════════
   CSS KEYFRAMES — injected once via <style>
   ═══════════════════════════════════════════════════════════ */
const KEYFRAMES = `
@keyframes atriumFadeSlideIn {
  from { opacity: 0; transform: translateY(1.25rem); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

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

  // Track data for TrackProgress widget — mapped to expected {id, name, icon, progress, total}
  const trackData = useMemo(() => {
    return TRACKS.map((track) => {
      const progress = getTrackProgress(track.id);
      return {
        id: track.id,
        name: track.nameKey, // nameKey serves as display name
        icon: track.icon,
        progress: progress.stepsCompleted.length,
        total: track.steps.length,
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
        name: ach?.titleKey ?? id,
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

  /* ─── MODE SWITCHING ─── */

  const handleNavigateLibrary = useCallback(() => {
    startTransition("library", () => setNavMode("library"));
  }, [startTransition, setNavMode]);

  const handleNavigatePalace = useCallback(() => {
    startTransition("3d", () => setNavMode("3d"));
  }, [startTransition, setNavMode]);

  const handleModeChange = useCallback(
    (mode: "atrium" | "library" | "3d") => {
      if (mode === "library") {
        startTransition("library", () => setNavMode("library"));
      } else if (mode === "3d") {
        startTransition("3d", () => setNavMode("3d"));
      } else {
        setNavMode("atrium");
      }
    },
    [startTransition, setNavMode],
  );

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
      <style>{KEYFRAMES}</style>

      {/* ── 1. NAVIGATION BAR — always visible at top ── */}
      <NavigationBar
        currentMode={navMode}
        onModeChange={handleModeChange}
        isMobile={isMobile}
        userName={userName}
      />

      {/* ── 2. SCROLLABLE CONTENT AREA ── */}
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
          {/* ── 3. ATRIUM HERO ── */}
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

          {/* ── 4. QUICK STATS ── */}
          <div
            style={{
              marginTop: "2.5rem",
              ...sectionStyle(1),
            }}
          >
            <QuickStats
              totalMemories={totalMemories}
              wingsUsed={totalWings}
              roomsCreated={totalRooms}
              sharedRooms={sharedRooms}
              isMobile={isMobile}
            />
          </div>

          {/* ── 5. RECENT MEMORIES ── */}
          {recentMemories.length > 0 && (
            <div
              style={{
                marginTop: "2.5rem",
                ...sectionStyle(2),
              }}
            >
              <RecentMemories
                memories={recentMemories.map(({ mem, wing, room }) => ({
                  mem,
                  wingName: wing.name,
                  roomName: room.name,
                  wingIcon: wing.icon,
                }))}
                onMemoryClick={() => handleNavigateLibrary()}
                isMobile={isMobile}
              />
            </div>
          )}

          {/* ── 6 & 7. TRACK PROGRESS + ACHIEVEMENT SHOWCASE ── */}
          <div
            style={{
              marginTop: "2.5rem",
              display: isMobile ? "flex" : "grid",
              flexDirection: isMobile ? "column" : undefined,
              gridTemplateColumns: isMobile ? undefined : "1fr 1fr",
              gap: "1.5rem",
              ...sectionStyle(3),
            }}
          >
            <TrackProgress
              tracks={trackData}
              onViewAll={() => setShowTracksPanel(true)}
              isMobile={isMobile}
            />
            <AchievementShowcase
              achievements={achievementsList}
              totalEarned={achievementProgress.earned}
              totalAvailable={achievementProgress.total}
              onViewAll={() => setShowAchievementPanel(true)}
              isMobile={isMobile}
            />
          </div>

          {/* ── 8. ON THIS DAY ── */}
          {onThisDayMemories.length > 0 && (
            <div
              style={{
                marginTop: "2.5rem",
                ...sectionStyle(4),
              }}
            >
              <OnThisDayCard
                memories={onThisDayMemories.map(({ mem, wing }) => ({
                  mem,
                  wingName: wing.name,
                  year: mem.createdAt ? new Date(mem.createdAt).getFullYear() : 0,
                }))}
                onMemoryClick={() => handleNavigateLibrary()}
                isMobile={isMobile}
              />
            </div>
          )}

          {/* ── 9. SHARED ROOMS PREVIEW ── */}
          {sharedRoomsList.length > 0 && (
            <div
              style={{
                marginTop: "2.5rem",
                ...sectionStyle(5),
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
                onRoomClick={() => handleNavigateLibrary()}
                onViewAll={handleNavigateLibrary}
                isMobile={isMobile}
              />
            </div>
          )}

          {/* ── 10. INTERVIEW PROMPT ── */}
          <div
            style={{
              marginTop: "2.5rem",
              ...sectionStyle(6),
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
        </div>
      </div>

      {/* ── 11. MODE TRANSITION OVERLAY ── */}
      <ModeTransition {...transitionProps} />
    </div>
  );
}
