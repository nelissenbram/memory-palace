import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { completeOnboarding } from "@/lib/auth/profile-actions";

export interface BustPedestalData {
  faceUrl: string;
  name: string;
  gender: "male" | "female";
}

interface UserState {
  profileLoading: boolean;
  onboarded: boolean;
  onboardStep: number;
  userName: string;
  userGoal: string;
  firstWing: string | null;
  styleEra: string | null;
  bustTextureUrl: string | null;
  bustModelUrl: string | null;
  bustProportions: Record<string, number> | null;
  bustName: string | null;
  bustGender: string | null;
  accessibilityMode: boolean;
  bustPedestals: Record<number, BustPedestalData>;
  setAccessibilityMode: (v: boolean) => void;
  setOnboardStep: (step: number | ((s: number) => number)) => void;
  setUserName: (name: string) => void;
  setUserGoal: (goal: string) => void;
  setFirstWing: (wing: string | null) => void;
  setStyleEra: (era: string) => void;
  setOnboarded: (v: boolean) => void;
  setBustModelUrl: (url: string | null) => void;
  setBustProportions: (p: Record<string, number> | null) => void;
  setBustName: (name: string | null) => void;
  setBustGender: (gender: string | null) => void;
  setBustPedestal: (index: number, data: BustPedestalData) => void;
  removeBustPedestal: (index: number) => void;
  loadProfile: () => Promise<void>;
  finishOnboarding: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profileLoading: true,
  onboarded: false,
  onboardStep: 0,
  userName: "",
  userGoal: "",
  firstWing: null,
  styleEra: null,
  bustTextureUrl: null,
  bustModelUrl: null,
  bustProportions: null,
  bustName: null,
  bustGender: null,
  accessibilityMode: false,
  bustPedestals: {},

  setAccessibilityMode: (v) => set({ accessibilityMode: v }),
  setOnboardStep: (step) =>
    set((s) => ({ onboardStep: typeof step === "function" ? step(s.onboardStep) : step })),
  setUserName: (name) => set({ userName: name }),
  setUserGoal: (goal) => set({ userGoal: goal }),
  setFirstWing: (wing) => set({ firstWing: wing }),
  setStyleEra: (era) => set({ styleEra: era }),
  setOnboarded: (v) => set({ onboarded: v }),
  setBustModelUrl: (url) => set({ bustModelUrl: url }),
  setBustProportions: (p) => set({ bustProportions: p }),
  setBustName: (name) => set({ bustName: name }),
  setBustGender: (gender) => set({ bustGender: gender }),
  setBustPedestal: (index, data) => set((s) => ({
    bustPedestals: { ...s.bustPedestals, [index]: data },
    // Also keep legacy fields in sync for pedestal 0
    ...(index === 0 ? { bustTextureUrl: data.faceUrl, bustName: data.name, bustGender: data.gender } : {}),
  })),
  removeBustPedestal: (index) => set((s) => {
    const next = { ...s.bustPedestals };
    delete next[index];
    return {
      bustPedestals: next,
      ...(index === 0 ? { bustTextureUrl: null, bustName: null, bustGender: null } : {}),
    };
  }),

  loadProfile: async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // Fallback: check localStorage for cached onboarded state to prevent
      // false onboarding when Supabase is unavailable
      try {
        if (localStorage.getItem("mp_onboarded") === "true") {
          set({ onboarded: true, userName: localStorage.getItem("mp_userName") || "" });
        }
      } catch { /* SSR or storage error */ }
      set({ profileLoading: false });
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ profileLoading: false }); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profile) {
      if (profile.onboarded) {
        // Parse per-pedestal data from JSON column, or build from legacy single-bust fields
        let pedestals: Record<number, BustPedestalData> = {};
        if (profile.bust_pedestals) {
          try { pedestals = typeof profile.bust_pedestals === "string" ? JSON.parse(profile.bust_pedestals) : profile.bust_pedestals; } catch { /* ignore */ }
        } else if (profile.bust_texture_url) {
          pedestals = { 0: { faceUrl: profile.bust_texture_url, name: profile.bust_name || profile.display_name || "", gender: (profile.bust_gender as "male" | "female") || "male" } };
        }
        set({ onboarded: true, userName: profile.display_name || "", styleEra: profile.style_era || null, bustTextureUrl: profile.bust_texture_url || null, bustModelUrl: profile.bust_model_url || null, bustName: profile.bust_name || null, bustGender: profile.bust_gender || null, bustPedestals: pedestals, accessibilityMode: !!profile.accessibility_mode });
        // Cache onboarded state for offline/fallback scenarios
        try { localStorage.setItem("mp_onboarded", "true"); localStorage.setItem("mp_userName", profile.display_name || ""); } catch { /* ignore */ }
      }
      else set({ onboarded: false });
    }
    set({ profileLoading: false });
  },

  finishOnboarding: async () => {
    const { userName, userGoal, firstWing, styleEra } = get();
    const result = await completeOnboarding({ displayName: userName, goal: userGoal, firstWing: firstWing || "", styleEra: styleEra || "roman" });
    if (result.error) console.error("Onboarding error:", result.error);
    set({ onboarded: true });
    // Cache onboarded state in localStorage as fallback
    try {
      localStorage.setItem("mp_onboarded", "true");
      localStorage.setItem("mp_userName", get().userName);
    } catch { /* SSR or storage error */ }
  },
}));
