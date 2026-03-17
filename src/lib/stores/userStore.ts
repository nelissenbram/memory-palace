import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import { completeOnboarding } from "@/lib/auth/profile-actions";

interface UserState {
  profileLoading: boolean;
  onboarded: boolean;
  onboardStep: number;
  userName: string;
  userGoal: string;
  firstWing: string | null;
  styleEra: string | null;
  bustTextureUrl: string | null;
  setOnboardStep: (step: number | ((s: number) => number)) => void;
  setUserName: (name: string) => void;
  setUserGoal: (goal: string) => void;
  setFirstWing: (wing: string | null) => void;
  setStyleEra: (era: string) => void;
  setOnboarded: (v: boolean) => void;
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

  setOnboardStep: (step) =>
    set((s) => ({ onboardStep: typeof step === "function" ? step(s.onboardStep) : step })),
  setUserName: (name) => set({ userName: name }),
  setUserGoal: (goal) => set({ userGoal: goal }),
  setFirstWing: (wing) => set({ firstWing: wing }),
  setStyleEra: (era) => set({ styleEra: era }),
  setOnboarded: (v) => set({ onboarded: v }),

  loadProfile: async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      set({ profileLoading: false });
      return;
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ profileLoading: false }); return; }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (profile) {
      if (profile.onboarded) set({ onboarded: true, userName: profile.display_name || "", styleEra: profile.style_era || null, bustTextureUrl: profile.bust_texture_url || null });
      else set({ onboarded: false });
    }
    set({ profileLoading: false });
  },

  finishOnboarding: async () => {
    const { userName, userGoal, firstWing, styleEra } = get();
    const result = await completeOnboarding({ displayName: userName, goal: userGoal, firstWing: firstWing || "", styleEra: styleEra || "roman" });
    if (result.error) console.error("Onboarding error:", result.error);
    set({ onboarded: true });
  },
}));
