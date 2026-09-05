import { create } from "zustand";

/**
 * Legacy tutorial store — gutted per PALACE_TUTORIAL_SPEC §4.2.
 *
 * The old 13-step guided TUTORIAL_STEPS walkthrough (spirit orb, per-step
 * `tutorial.steps.*` i18n keys) was retired by the per-scene tour system
 * (PalaceExteriorTutorial / EntranceHallTutorial / CorridorTutorial /
 * RoomTutorial); its i18n section no longer exists. Only the `active`
 * suppression flag remains: MemoryPalace reads it to keep contextual tooltips
 * and the feature spotlight quiet while a legacy tutorial would have been
 * running. Nothing sets it anymore, so it is permanently false.
 */
interface TutorialState {
  /** Is the (retired) guided tutorial currently active? Always false. */
  active: boolean;
}

export const useTutorialStore = create<TutorialState>(() => ({
  active: false,
}));
