import { create } from "zustand";

export interface TutorialStep {
  id: string;
  view: "exterior" | "entrance" | "corridor" | "room";
  titleKey: string;
  messageKey: string;
  /** Spirit orb target position in 3D (x, y, z) — null means hide spirit */
  spiritPos?: [number, number, number];
  /** Action label key for the "Next" button */
  nextLabelKey?: string;
  /** Optional highlight indicator pointing to a UI element on screen */
  highlight?: {
    position: "top-right" | "bottom-right" | "bottom-left" | "top-left" | "center" | "bottom-center";
    labelKey?: string;
  };
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    view: "entrance",
    titleKey: "tutorial.steps.welcome.title",
    messageKey: "tutorial.steps.welcome.message",
    nextLabelKey: "tutorial.steps.welcome.nextLabel",
  },
  {
    id: "navigation",
    view: "entrance",
    titleKey: "tutorial.steps.navigation.title",
    messageKey: "tutorial.steps.navigation.message",
    nextLabelKey: "tutorial.steps.navigation.nextLabel",
  },
  {
    id: "entrance_hall",
    view: "entrance",
    titleKey: "tutorial.steps.entrance_hall.title",
    messageKey: "tutorial.steps.entrance_hall.message",
    nextLabelKey: "tutorial.steps.entrance_hall.nextLabel",
    highlight: { position: "center", labelKey: "tutorial.steps.entrance_hall.highlightLabel" },
  },
  {
    id: "five_wings",
    view: "entrance",
    titleKey: "tutorial.steps.five_wings.title",
    messageKey: "tutorial.steps.five_wings.message",
    nextLabelKey: "tutorial.steps.five_wings.nextLabel",
    highlight: { position: "center", labelKey: "tutorial.steps.five_wings.highlightLabel" },
  },
  {
    id: "attic",
    view: "entrance",
    titleKey: "tutorial.steps.attic.title",
    messageKey: "tutorial.steps.attic.message",
    nextLabelKey: "tutorial.steps.attic.nextLabel",
  },
  {
    id: "inside_wing",
    view: "entrance",
    titleKey: "tutorial.steps.inside_wing.title",
    messageKey: "tutorial.steps.inside_wing.message",
    nextLabelKey: "tutorial.steps.inside_wing.nextLabel",
  },
  {
    id: "rooms_memories",
    view: "entrance",
    titleKey: "tutorial.steps.rooms_memories.title",
    messageKey: "tutorial.steps.rooms_memories.message",
    nextLabelKey: "tutorial.steps.rooms_memories.nextLabel",
    highlight: { position: "center" },
  },
  {
    id: "adding_memories",
    view: "entrance",
    titleKey: "tutorial.steps.adding_memories.title",
    messageKey: "tutorial.steps.adding_memories.message",
    nextLabelKey: "tutorial.steps.adding_memories.nextLabel",
    highlight: { position: "bottom-right", labelKey: "tutorial.steps.adding_memories.highlightLabel" },
  },
  {
    id: "sharing",
    view: "entrance",
    titleKey: "tutorial.steps.sharing.title",
    messageKey: "tutorial.steps.sharing.message",
    nextLabelKey: "tutorial.steps.sharing.nextLabel",
    highlight: { position: "bottom-right", labelKey: "tutorial.steps.sharing.highlightLabel" },
  },
  {
    id: "action_menu",
    view: "entrance",
    titleKey: "tutorial.steps.action_menu.title",
    messageKey: "tutorial.steps.action_menu.message",
    nextLabelKey: "tutorial.steps.action_menu.nextLabel",
    highlight: { position: "bottom-right", labelKey: "tutorial.steps.action_menu.highlightLabel" },
  },
  {
    id: "life_interviews",
    view: "entrance",
    titleKey: "tutorial.steps.life_interviews.title",
    messageKey: "tutorial.steps.life_interviews.message",
    nextLabelKey: "tutorial.steps.life_interviews.nextLabel",
    highlight: { position: "bottom-right", labelKey: "tutorial.steps.life_interviews.highlightLabel" },
  },
  {
    id: "tracks_achievements",
    view: "entrance",
    titleKey: "tutorial.steps.tracks_achievements.title",
    messageKey: "tutorial.steps.tracks_achievements.message",
    nextLabelKey: "tutorial.steps.tracks_achievements.nextLabel",
    highlight: { position: "bottom-left", labelKey: "tutorial.steps.tracks_achievements.highlightLabel" },
  },
  {
    id: "closing",
    view: "entrance",
    titleKey: "tutorial.steps.closing.title",
    messageKey: "tutorial.steps.closing.message",
    nextLabelKey: "tutorial.steps.closing.nextLabel",
  },
];

interface TutorialState {
  /** Is the tutorial currently active? */
  active: boolean;
  /** Current step index */
  stepIndex: number;
  /** Has the user completed the tutorial at least once? */
  completed: boolean;
  /** Fade-in animation trigger */
  fadeIn: boolean;

  start: () => void;
  next: () => void;
  skip: () => void;
  reset: () => void;
}

const STORAGE_KEY = "mp_tutorial_completed";

export const useTutorialStore = create<TutorialState>((set, get) => ({
  active: false,
  stepIndex: 0,
  completed: typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) === "true" : false,
  fadeIn: false,

  start: () => {
    set({ active: true, stepIndex: 0, fadeIn: true });
    setTimeout(() => set({ fadeIn: false }), 600);
  },

  next: () => {
    const { stepIndex } = get();
    if (stepIndex >= TUTORIAL_STEPS.length - 1) {
      // Last step — finish
      get().skip();
      return;
    }
    set({ stepIndex: stepIndex + 1, fadeIn: true });
    setTimeout(() => set({ fadeIn: false }), 600);
  },

  skip: () => {
    set({ active: false, stepIndex: 0, completed: true });
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
  },

  reset: () => {
    set({ active: false, stepIndex: 0, completed: false });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  },
}));
