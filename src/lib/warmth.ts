/**
 * Palace warmth model — ONE shared state that every surface reads from
 * (villa hero windows, Keeper's Ledger, later: widget & rosette).
 *
 * Principles (activating-menu research, docs/ACTIVATING_MENU_RESEARCH.md):
 *  - warmth degrades, memories never do — this only dims ambience;
 *  - cadence is WEEKS, not a daily cliff: quiet weeks pause, one memory rekindles;
 *  - copy stays invitational, never scolding.
 */

export type WarmthLevel = 0 | 1 | 2; // 0 = quiet, 1 = embers, 2 = candlelit
export type TimeOfDay = "morning" | "day" | "golden" | "night";

/** Days since the most recent memory → warmth of the villa windows. */
export function computeWarmthLevel(creationDates: string[], now: Date = new Date()): WarmthLevel {
  const times = creationDates.map((d) => new Date(d).getTime()).filter((t) => Number.isFinite(t) && t <= now.getTime() + 86400000);
  if (times.length === 0) return 0;
  const days = (now.getTime() - Math.max(...times)) / 86400000;
  if (days <= 3) return 2; // candlelit gold
  if (days <= 14) return 1; // embers
  return 0; // quiet — one visit relights it
}

/** Monday 00:00 of the week containing d (local time). */
function weekStart(d: Date): number {
  const dt = new Date(d);
  const day = (dt.getDay() + 6) % 7; // Mon=0 … Sun=6
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
}

/**
 * "Kept warm" chain: consecutive weeks with at least one memory added,
 * counting back from this week. Forgiving: a still-quiet CURRENT week does
 * not break the chain — it simply starts counting from last week.
 */
export function computeWarmWeeks(creationDates: string[], now: Date = new Date()): number {
  if (creationDates.length === 0) return 0;
  const weeks = new Set(
    creationDates
      .map((s) => new Date(s))
      .filter((d) => Number.isFinite(d.getTime()))
      .map((d) => weekStart(d))
  );
  const WEEK = 7 * 86400000;
  let cursor = weekStart(now);
  if (!weeks.has(cursor)) cursor -= WEEK; // grace: current week may still be quiet
  let n = 0;
  while (weeks.has(cursor)) {
    n++;
    cursor -= WEEK;
  }
  return n;
}

/**
 * Last n weeks as warm/quiet booleans, oldest → newest (this week last).
 * Feeds the ledger's 12-week strip — dots, never numerals.
 */
export function computeWeekHistory(creationDates: string[], n = 12, now: Date = new Date()): boolean[] {
  const weeks = new Set(
    creationDates
      .map((s) => new Date(s))
      .filter((d) => Number.isFinite(d.getTime()))
      .map((d) => weekStart(d))
  );
  const WEEK = 7 * 86400000;
  const current = weekStart(now);
  const out: boolean[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(weeks.has(current - i * WEEK));
  return out;
}

/** Coarse time-of-day bucket for ambient tinting of the atrium. */
export function getTimeOfDay(now: Date = new Date()): TimeOfDay {
  const h = now.getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "day";
  if (h >= 17 && h < 21) return "golden";
  return "night";
}

/** Subtle wash laid over the board top per time of day (INK & EMBER tints). */
export const TIME_WASH: Record<TimeOfDay, string> = {
  morning: "linear-gradient(180deg, rgba(122,140,100,0.055) 0%, rgba(252,250,245,0) 55%)",
  day: "linear-gradient(180deg, rgba(201,154,46,0.035) 0%, rgba(252,250,245,0) 45%)",
  golden: "linear-gradient(180deg, rgba(184,92,56,0.06) 0%, rgba(201,154,46,0.03) 30%, rgba(252,250,245,0) 60%)",
  night: "linear-gradient(180deg, rgba(64,59,54,0.075) 0%, rgba(86,104,60,0.02) 35%, rgba(252,250,245,0) 62%)",
};
