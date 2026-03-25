"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface AccessibilityContextValue {
  accessibilityMode: boolean;
  scale: number;
  toggleAccessibility: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue>({
  accessibilityMode: false,
  scale: 1.0,
  toggleAccessibility: () => {},
});

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  // Load initial value from Supabase profile
  useEffect(() => {
    async function load() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("accessibility_mode")
          .eq("id", user.id)
          .single();
        if (profile?.accessibility_mode) {
          setAccessibilityMode(true);
        }
      } catch {
        // ignore — default to false
      }
    }
    load();
  }, []);

  const toggleAccessibility = useCallback(async () => {
    const next = !accessibilityMode;
    setAccessibilityMode(next);

    // Persist to Supabase
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ accessibility_mode: next })
        .eq("id", user.id);
    } catch {
      // ignore — local state already updated
    }
  }, [accessibilityMode]);

  const scale = accessibilityMode ? 1.25 : 1.0;

  // Apply scale as a CSS custom property so all components can use it
  useEffect(() => {
    document.documentElement.style.setProperty("--a11y-scale", String(scale));
    if (accessibilityMode) {
      document.documentElement.style.fontSize = `${scale * 100}%`;
    } else {
      document.documentElement.style.fontSize = "";
    }
  }, [scale, accessibilityMode]);

  return (
    <AccessibilityContext.Provider value={{ accessibilityMode, scale, toggleAccessibility }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
