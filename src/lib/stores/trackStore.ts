import { create } from "zustand";
import { TRACKS, TRACK_MAP, GOAL_TRACK_PRIORITY } from "@/lib/constants/tracks";
import type { Track, TrackStep } from "@/lib/constants/tracks";
import { checkAllTrackProgress, type TrackCheckState } from "@/lib/tracks/progress-checker";
import { fetchTrackProgress, completeTrackStep, completeTrackBonus } from "@/lib/auth/track-actions";
import { getLevelForPoints, getLevelProgress, type Level } from "@/lib/constants/levels";

// ─── Types ───

export interface TrackProgress {
  trackId: string;
  stepsCompleted: string[];
  percentage: number;
  startedAt: string | null;
  completedAt: string | null;
}

interface PointEntry {
  id: string;
  points: number;
  reason: string;
  referenceId: string;
  stepId?: string;
  earnedAt: string;
}

interface TrackState {
  // Data
  tracks: Record<string, TrackProgress>;
  totalPoints: number;
  pointsHistory: PointEntry[];
  loaded: boolean;

  // UI
  showTracksPanel: boolean;
  selectedTrackId: string | null;
  showLegacyPanel: boolean;
  toast: { stepTitleKey: string; trackNameKey: string; points: number } | null;
  celebration: { trackId: string; trackNameKey: string; bonus: number } | null;

  // Persisted local flags
  hasUsedMassImport: boolean;
  legacyReviewed: boolean;

  // Floating points animation queue
  floatingPoints: { id: string; amount: number; label: string }[];

  // Computed
  getLevel: () => number;
  getLevelInfo: () => Level;
  getLevelTitle: () => string;
  getPointsToNextLevel: () => { current: number; needed: number; progress: number };
  getLevelProgressInfo: () => ReturnType<typeof getLevelProgress>;
  getRecommendedTrack: (userGoal: string) => Track | null;
  getTrackProgress: (trackId: string) => TrackProgress;
  getNextStep: (trackId: string) => TrackStep | null;

  // Actions
  setShowTracksPanel: (v: boolean) => void;
  setSelectedTrackId: (id: string | null) => void;
  setShowLegacyPanel: (v: boolean) => void;
  dismissToast: () => void;
  dismissCelebration: () => void;
  dismissFloatingPoints: (id: string) => void;
  loadProgress: () => Promise<void>;
  runProgressCheck: (state: TrackCheckState) => void;
  markMassImportUsed: () => void;
  markLegacyReviewed: () => void;
}

// ─── Local persistence helpers ───

function loadFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(key) === "true"; } catch { return false; }
}

function saveFlag(key: string, val: boolean) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, val ? "true" : "false"); } catch { /* noop */ }
}

function loadLocalTracks(): Record<string, TrackProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("mp_track_progress");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveLocalTracks(tracks: Record<string, TrackProgress>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("mp_track_progress", JSON.stringify(tracks)); } catch { /* noop */ }
}

function loadLocalPoints(): { total: number; history: PointEntry[] } {
  if (typeof window === "undefined") return { total: 0, history: [] };
  try {
    const raw = localStorage.getItem("mp_memory_points");
    return raw ? JSON.parse(raw) : { total: 0, history: [] };
  } catch { return { total: 0, history: [] }; }
}

function saveLocalPoints(total: number, history: PointEntry[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("mp_memory_points", JSON.stringify({ total, history })); } catch { /* noop */ }
}

// ─── Store ───

export const useTrackStore = create<TrackState>((set, get) => ({
  tracks: loadLocalTracks(),
  totalPoints: loadLocalPoints().total,
  pointsHistory: loadLocalPoints().history,
  loaded: false,
  showTracksPanel: false,
  selectedTrackId: null,
  showLegacyPanel: false,
  toast: null,
  celebration: null,
  floatingPoints: [],
  hasUsedMassImport: loadFlag("mp_mass_import_used"),
  legacyReviewed: loadFlag("mp_legacy_reviewed"),

  getLevel: () => getLevelForPoints(get().totalPoints).rank,

  getLevelInfo: () => getLevelForPoints(get().totalPoints),

  getLevelTitle: () => getLevelForPoints(get().totalPoints).titleKey,

  getPointsToNextLevel: () => {
    const info = getLevelProgress(get().totalPoints);
    return {
      current: info.pointsInLevel,
      needed: info.pointsNeeded || 1,
      progress: info.progress,
    };
  },

  getLevelProgressInfo: () => getLevelProgress(get().totalPoints),

  getRecommendedTrack: (userGoal: string) => {
    const priority = GOAL_TRACK_PRIORITY[userGoal] || GOAL_TRACK_PRIORITY["preserve"];
    const { tracks } = get();
    // Find first track that isn't completed
    for (const trackId of priority) {
      const progress = tracks[trackId];
      if (!progress || !progress.completedAt) {
        return TRACK_MAP[trackId] || null;
      }
    }
    return null;
  },

  getTrackProgress: (trackId: string) => {
    return get().tracks[trackId] || {
      trackId,
      stepsCompleted: [],
      percentage: 0,
      startedAt: null,
      completedAt: null,
    };
  },

  getNextStep: (trackId: string) => {
    const track = TRACK_MAP[trackId];
    if (!track) return null;
    const progress = get().getTrackProgress(trackId);
    return track.steps.find((s) => !progress.stepsCompleted.includes(s.id)) || null;
  },

  setShowTracksPanel: (v) => set({ showTracksPanel: v }),
  setSelectedTrackId: (id) => set({ selectedTrackId: id }),
  setShowLegacyPanel: (v) => set({ showLegacyPanel: v }),
  dismissToast: () => set({ toast: null }),
  dismissCelebration: () => set({ celebration: null }),
  dismissFloatingPoints: (id: string) => set((s) => ({
    floatingPoints: s.floatingPoints.filter((f) => f.id !== id),
  })),

  markMassImportUsed: () => {
    set({ hasUsedMassImport: true });
    saveFlag("mp_mass_import_used", true);
  },

  markLegacyReviewed: () => {
    set({ legacyReviewed: true });
    saveFlag("mp_legacy_reviewed", true);
  },

  loadProgress: async () => {
    try {
      const result = await fetchTrackProgress();
      if (result.tracks && result.tracks.length > 0) {
        const trackMap: Record<string, TrackProgress> = {};
        for (const t of result.tracks) {
          trackMap[t.track_id] = {
            trackId: t.track_id,
            stepsCompleted: t.steps_completed || [],
            percentage: t.percentage,
            startedAt: t.started_at,
            completedAt: t.completed_at,
          };
        }
        const history: PointEntry[] = (result.history || []).map((h: any) => ({
          id: h.id, points: h.points, reason: h.reason,
          referenceId: h.reference_id || "", stepId: h.step_id,
          earnedAt: h.earned_at,
        }));
        set({ tracks: trackMap, totalPoints: result.points, pointsHistory: history, loaded: true });
        saveLocalTracks(trackMap);
        saveLocalPoints(result.points, history);
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  runProgressCheck: (checkState: TrackCheckState) => {
    const completed = checkAllTrackProgress(checkState);
    const { tracks, totalPoints, pointsHistory } = get();

    let newPoints = totalPoints;
    let newHistory = [...pointsHistory];
    const newTracks = { ...tracks };
    let toastInfo: { stepTitleKey: string; trackNameKey: string; points: number } | null = null;
    let celebrationInfo: { trackId: string; trackNameKey: string; bonus: number } | null = null;
    const newFloating: { id: string; amount: number; label: string }[] = [];

    for (const track of TRACKS) {
      const newSteps = completed[track.id] || [];
      const existing = newTracks[track.id] || {
        trackId: track.id, stepsCompleted: [], percentage: 0,
        startedAt: null, completedAt: null,
      };

      // Find newly completed steps
      const newlyCompleted = newSteps.filter((s) => !existing.stepsCompleted.includes(s));

      if (newlyCompleted.length > 0) {
        const mergedSteps = [...new Set([...existing.stepsCompleted, ...newSteps])];
        const pct = Math.round((mergedSteps.length / track.steps.length) * 100);
        const isNowComplete = pct >= 100 && !existing.completedAt;

        newTracks[track.id] = {
          trackId: track.id,
          stepsCompleted: mergedSteps,
          percentage: pct,
          startedAt: existing.startedAt || new Date().toISOString(),
          completedAt: isNowComplete ? new Date().toISOString() : existing.completedAt,
        };

        // Award points for each new step
        for (const stepId of newlyCompleted) {
          const step = track.steps.find((s) => s.id === stepId);
          if (step) {
            newPoints += step.pointValue;
            const entry: PointEntry = {
              id: `local_${Date.now()}_${stepId}`,
              points: step.pointValue,
              reason: "track_step",
              referenceId: track.id,
              stepId,
              earnedAt: new Date().toISOString(),
            };
            newHistory = [entry, ...newHistory];

            // Show toast for the most recent step
            toastInfo = { stepTitleKey: step.titleKey, trackNameKey: track.nameKey, points: step.pointValue };

            // Queue floating points animation
            newFloating.push({
              id: `float_${Date.now()}_${stepId}`,
              amount: step.pointValue,
              label: step.titleKey,
            });

            // Persist to server (fire and forget)
            completeTrackStep(track.id, stepId, step.pointValue).catch(() => {});
          }
        }

        // Track completion bonus
        if (isNowComplete) {
          newPoints += track.completionBonus;
          const bonusEntry: PointEntry = {
            id: `local_bonus_${Date.now()}_${track.id}`,
            points: track.completionBonus,
            reason: "track_complete",
            referenceId: track.id,
            earnedAt: new Date().toISOString(),
          };
          newHistory = [bonusEntry, ...newHistory];
          celebrationInfo = { trackId: track.id, trackNameKey: track.nameKey, bonus: track.completionBonus };
          newFloating.push({
            id: `float_bonus_${Date.now()}_${track.id}`,
            amount: track.completionBonus,
            label: track.nameKey,
          });
          completeTrackBonus(track.id, track.completionBonus).catch(() => {});
        }
      }
    }

    // Only update if something changed
    const hasChanges = JSON.stringify(newTracks) !== JSON.stringify(tracks);
    if (hasChanges) {
      set((s) => ({
        tracks: newTracks,
        totalPoints: newPoints,
        pointsHistory: newHistory.slice(0, 100), // keep last 100
        toast: toastInfo,
        celebration: celebrationInfo,
        floatingPoints: [...s.floatingPoints, ...newFloating],
      }));
      saveLocalTracks(newTracks);
      saveLocalPoints(newPoints, newHistory.slice(0, 100));
    }
  },
}));
