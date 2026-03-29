// ═══ MEMORY PALACE LEVEL SYSTEM ═══
// Museum membership-style tiers derived from Memory Points.

export interface Level {
  rank: number;
  titleKey: string;
  minPoints: number;
  color: string; // accent color for the tier
}

export const LEVELS: Level[] = [
  { rank: 0, titleKey: "newcomer",  minPoints: 0,    color: "#9A9183" },
  { rank: 1, titleKey: "explorer",  minPoints: 50,   color: "#8B7355" },
  { rank: 2, titleKey: "keeper",    minPoints: 150,  color: "#C17F59" },
  { rank: 3, titleKey: "guardian",  minPoints: 300,  color: "#4A6741" },
  { rank: 4, titleKey: "curator",   minPoints: 500,  color: "#5B8FA8" },
  { rank: 5, titleKey: "master",    minPoints: 1000, color: "#C9A84C" },
];

/** Get the current level for a given point total */
export function getLevelForPoints(points: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) return LEVELS[i];
  }
  return LEVELS[0];
}

/** Get the next level (or null if at max) */
export function getNextLevel(points: number): Level | null {
  const current = getLevelForPoints(points);
  const nextIdx = LEVELS.findIndex((l) => l.rank === current.rank) + 1;
  return nextIdx < LEVELS.length ? LEVELS[nextIdx] : null;
}

/** Get progress toward the next level: { current, needed, progress (0-1) } */
export function getLevelProgress(points: number): {
  currentLevel: Level;
  nextLevel: Level | null;
  pointsInLevel: number;
  pointsNeeded: number;
  progress: number;
} {
  const currentLevel = getLevelForPoints(points);
  const nextLevel = getNextLevel(points);

  if (!nextLevel) {
    return { currentLevel, nextLevel: null, pointsInLevel: 0, pointsNeeded: 0, progress: 1 };
  }

  const pointsInLevel = points - currentLevel.minPoints;
  const pointsNeeded = nextLevel.minPoints - currentLevel.minPoints;
  const progress = Math.min(pointsInLevel / pointsNeeded, 1);

  return { currentLevel, nextLevel, pointsInLevel, pointsNeeded, progress };
}
