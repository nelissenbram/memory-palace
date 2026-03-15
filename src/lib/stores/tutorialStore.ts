import { create } from "zustand";

export interface TutorialStep {
  id: string;
  view: "exterior" | "entrance" | "corridor" | "room";
  title: string;
  message: string;
  /** Spirit orb target position in 3D (x, y, z) — null means hide spirit */
  spiritPos?: [number, number, number];
  /** Action label for the "Next" button */
  nextLabel?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    view: "entrance",
    title: "Welcome to Your Memory Palace",
    message:
      "This is your Memory Palace — a place where your most treasured memories live forever. Each wing holds a different chapter of your life. I am your guide, and I will show you around.",
    nextLabel: "Show me",
  },
  {
    id: "entrance_hall",
    view: "entrance",
    title: "The Entrance Hall",
    message:
      "You stand in the grand Entrance Hall — the heart of your palace. From here, five magnificent doorways lead to the wings of your life. Each door is adorned with the symbol of what it holds.",
    nextLabel: "Tell me about the wings",
  },
  {
    id: "wings_overview",
    view: "entrance",
    title: "Five Chapters of Your Life",
    message:
      "Family, Travel, Childhood, Career, and Creativity — each wing is a gallery of rooms. Inside each room, your memories are displayed as paintings, videos, albums, glowing orbs, and more.",
    nextLabel: "How do I add memories?",
  },
  {
    id: "adding_memories",
    view: "entrance",
    title: "Filling Your Palace",
    message:
      "Enter any wing, then step through a door into a room. Use the + button to upload photos, videos, or documents. You can also record life stories through our AI-guided interviews.",
    nextLabel: "What about sharing?",
  },
  {
    id: "sharing",
    view: "entrance",
    title: "Sharing Your Legacy",
    message:
      "Every room can be shared with loved ones. Invite family and friends to view, or even contribute their own memories. Together, you build a living family archive.",
    nextLabel: "I'm ready to explore",
  },
  {
    id: "closing",
    view: "entrance",
    title: "Your Journey Begins",
    message:
      "Walk through any door to begin. I will always be here if you need me — just look for the 'Take the Tour' button. Now go — your memories are waiting.",
    nextLabel: "Let's go!",
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
