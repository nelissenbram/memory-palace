"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ScaleLevel = "standard" | "comfortable" | "large";

const SCALE_MAP: Record<ScaleLevel, number> = {
  standard: 1.0,
  comfortable: 1.125,
  large: 1.25,
};

const LS_KEY = "mp_a11y_scale";

interface AccessibilityContextValue {
  /** Current scale level */
  scaleLevel: ScaleLevel;
  /** Backward compat: true when scaleLevel !== "standard" */
  accessibilityMode: boolean;
  /** Numeric scale factor (1.0 / 1.125 / 1.25) */
  scale: number;
  /** Set a specific scale level */
  setScaleLevel: (level: ScaleLevel) => void;
  /** Backward compat: toggles between standard and large */
  toggleAccessibility: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextValue>({
  scaleLevel: "standard",
  accessibilityMode: false,
  scale: 1.0,
  setScaleLevel: () => {},
  toggleAccessibility: () => {},
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function loadLocal(): ScaleLevel {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw && (raw === "standard" || raw === "comfortable" || raw === "large")) {
      return raw;
    }
  } catch {}
  return "standard";
}

function saveLocal(level: ScaleLevel) {
  try {
    localStorage.setItem(LS_KEY, level);
  } catch {}
}

/** Handle stale boolean DB values */
function normalizeDbValue(val: unknown): ScaleLevel {
  if (val === true || val === "true") return "large";
  if (val === false || val === "false" || val === null || val === undefined) return "standard";
  if (val === "standard" || val === "comfortable" || val === "large") return val;
  return "standard";
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [scaleLevel, setScaleLevelState] = useState<ScaleLevel>(loadLocal);
  const dbPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  const scale = SCALE_MAP[scaleLevel];
  const accessibilityMode = scaleLevel !== "standard";

  // Apply scale to document
  useEffect(() => {
    const root = document.documentElement;
    if (scaleLevel === "standard") {
      root.style.fontSize = "";
    } else {
      root.style.fontSize = `${scale * 100}%`;
    }
    root.style.setProperty("--a11y-scale", String(scale));
    root.dataset.a11yLevel = scaleLevel;
  }, [scaleLevel, scale]);

  // Load from DB on mount (DB is source of truth, localStorage is instant cache)
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
        if (profile) {
          const dbLevel = normalizeDbValue(profile.accessibility_mode);
          setScaleLevelState(dbLevel);
          saveLocal(dbLevel);
        }
      } catch {
        // ignore — use localStorage / default
      }
    }
    load();
  }, []);

  // Debounced DB persist
  const persistToDb = useCallback((level: ScaleLevel) => {
    if (dbPersistTimer.current) clearTimeout(dbPersistTimer.current);
    dbPersistTimer.current = setTimeout(async () => {
      try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
          .from("profiles")
          .update({ accessibility_mode: level })
          .eq("id", user.id);
      } catch {
        // ignore — local state already updated
      }
    }, 500);
  }, []);

  const setScaleLevel = useCallback((level: ScaleLevel) => {
    setScaleLevelState(level);
    saveLocal(level);
    persistToDb(level);
    // Announce change for screen readers
    if (announceRef.current) {
      const labels: Record<ScaleLevel, string> = {
        standard: "Standard",
        comfortable: "Comfortable",
        large: "Large",
      };
      announceRef.current.textContent = `Text size changed to ${labels[level]}`;
    }
  }, [persistToDb]);

  // Backward compat toggle
  const toggleAccessibility = useCallback(() => {
    setScaleLevel(scaleLevel === "standard" ? "large" : "standard");
  }, [scaleLevel, setScaleLevel]);

  const contextValue = useMemo(() => ({ scaleLevel, accessibilityMode, scale, setScaleLevel, toggleAccessibility }), [scaleLevel, accessibilityMode, scale, setScaleLevel, toggleAccessibility]);

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      {/* Visually hidden live region for screen reader announcements */}
      <div
        ref={announceRef}
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
