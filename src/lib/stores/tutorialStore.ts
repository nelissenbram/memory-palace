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
  /** Optional highlight indicator pointing to a UI element on screen */
  highlight?: {
    position: "top-right" | "bottom-right" | "bottom-left" | "top-left" | "center" | "bottom-center";
    label?: string;
  };
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    view: "entrance",
    title: "Welcome",
    message:
      "Welcome to your Memory Palace — a living home for your most treasured memories. Let me show you how everything works.",
    nextLabel: "How do I move?",
  },
  {
    id: "navigation",
    view: "entrance",
    title: "Navigation Basics",
    message:
      "Use WASD or arrow keys to walk. Drag to look around. Click on doors and objects to interact. On mobile, use the joystick to move and swipe to look.",
    nextLabel: "Where am I?",
  },
  {
    id: "entrance_hall",
    view: "entrance",
    title: "The Entrance Hall",
    message:
      "This grand hall is the heart of your palace. Five doorways lead to the wings of your life — each one a gallery for a different chapter. Look for the wing names on each door.",
    nextLabel: "Tell me about the wings",
    highlight: { position: "center", label: "Look around" },
  },
  {
    id: "five_wings",
    view: "entrance",
    title: "The Five Wings",
    message:
      "Family, Travel, Childhood, Career, and Creativity — each wing is a corridor lined with rooms. Walk through a door to explore.",
    nextLabel: "What's the Storage Room?",
    highlight: { position: "center", label: "The doors" },
  },
  {
    id: "attic",
    view: "entrance",
    title: "Storage Room",
    message:
      "There's also a special place called the Storage Room — a catch-all space for memories that don't fit neatly into a wing yet. We'll explore that more later.",
    nextLabel: "What's inside a wing?",
  },
  {
    id: "inside_wing",
    view: "entrance",
    title: "Inside a Wing",
    message:
      "Each wing corridor has doors to individual rooms. Paintings on the walls preview what's inside. The wing's name is displayed as a fresco at the far end.",
    nextLabel: "And inside a room?",
  },
  {
    id: "rooms_memories",
    view: "entrance",
    title: "Rooms & Memories",
    message:
      "Inside each room, your memories are displayed as paintings, videos, albums, glowing orbs, and more. Click any memory to view it in detail.",
    nextLabel: "How do I add memories?",
    highlight: { position: "center" },
  },
  {
    id: "adding_memories",
    view: "entrance",
    title: "Adding Memories",
    message:
      "Use the + button to upload photos, videos, or documents. You can also drag and drop files, or use Mass Import to add many at once.",
    nextLabel: "What about sharing?",
    highlight: { position: "bottom-right", label: "Action menu" },
  },
  {
    id: "sharing",
    view: "entrance",
    title: "Sharing",
    message:
      "Every room can be shared with loved ones. Use the Share button to invite family and friends to view or contribute their own memories.",
    nextLabel: "What else can I do?",
    highlight: { position: "bottom-right", label: "Share" },
  },
  {
    id: "action_menu",
    view: "entrance",
    title: "The Action Menu",
    message:
      "Look for the floating action button in the bottom-right corner. It gives you quick access to adding memories, managing rooms, and more features.",
    nextLabel: "Tell me about interviews",
    highlight: { position: "bottom-right", label: "Action button" },
  },
  {
    id: "life_interviews",
    view: "entrance",
    title: "Life Interviews",
    message:
      "Try our AI-guided Life Interviews — they help you capture stories through conversation, available from the action menu or the More menu on mobile.",
    nextLabel: "Anything else?",
    highlight: { position: "bottom-right", label: "Interviews" },
  },
  {
    id: "tracks_achievements",
    view: "entrance",
    title: "Tracks & Achievements",
    message:
      "Complete Memory Building Tracks to earn points and unlock achievements. Check your progress in the status bar at the bottom.",
    nextLabel: "Got it!",
    highlight: { position: "bottom-left", label: "Status bar" },
  },
  {
    id: "closing",
    view: "entrance",
    title: "Ready to Explore",
    message:
      "You're all set! Walk through any door to begin. You can always retake this tour from the 'Take the Tour' button. Now go — your memories are waiting.",
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
