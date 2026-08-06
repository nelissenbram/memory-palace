// ── Global scene-tutorial mute ──────────────────────────────────────────────
// Owner feedback 2026-08-06 #4: explicitly dismissing ONE scene tutorial
// (skip button / backdrop tap / Escape) must stop ALL scene tutorials
// (exterior, entrance hall, corridor, room) from auto-firing — until the user
// manually restarts a tutorial (help menu "tour" action), which clears the
// mute so the sequence runs again.
//
// This is an extra layer ON TOP of the per-tutorial "seen" flags
// (mp_*_tour_seen_v1): while muted, auto-fire checks bail out WITHOUT
// consuming their seen flag, so un-muting resumes the not-yet-seen tutorials.
// Completing a tutorial (Done on the last step) never mutes.

export const TUTORIALS_MUTED_KEY = "mp_tutorials_muted";

/** True when scene tutorials must not auto-fire. Manual opens ignore this. */
export function tutorialsMuted(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.localStorage.getItem(TUTORIALS_MUTED_KEY) === "1"
    );
  } catch {
    return false;
  }
}

/** Called when the user explicitly skips/dismisses a scene tutorial. */
export function muteTutorials(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TUTORIALS_MUTED_KEY, "1");
    }
  } catch {}
}

/** Called on any manual tutorial (re)start — the sequence may run again. */
export function unmuteTutorials(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TUTORIALS_MUTED_KEY);
    }
  } catch {}
}
