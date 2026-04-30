"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { setDaylightHour } from "@/lib/3d/daylightCycle";

type DaylightMode = "auto" | "custom";

interface DaylightContextValue {
  /** Whether dynamic daylight is enabled (vs always-midday default) */
  daylightEnabled: boolean;
  /** Current mode: auto follows device time, custom uses slider hour */
  daylightMode: DaylightMode;
  /** The custom hour set by the slider (0-24) */
  customHour: number;
  /** Toggle daylight on/off */
  toggleDaylight: () => void;
  /** Set a specific mode */
  setDaylightMode: (mode: DaylightMode) => void;
  /** Set the custom hour (also switches to custom mode) */
  setCustomHour: (hour: number) => void;
  /** Resolved hour (0-24) to pass to getLightingPreset() */
  resolvedHour: number | undefined;
}

const DaylightContext = createContext<DaylightContextValue>({
  daylightEnabled: false,
  daylightMode: "auto",
  customHour: 13,
  toggleDaylight: () => {},
  setDaylightMode: () => {},
  setCustomHour: () => {},
  resolvedHour: undefined,
});

const LS_KEY = "mp_daylight";

interface DaylightLocal { enabled: boolean; mode: DaylightMode; customHour: number }

function loadLocal(): DaylightLocal {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old preset modes (morning/midday/evening/night) to custom+hour
      if (parsed.mode && !["auto", "custom"].includes(parsed.mode)) {
        const hourMap: Record<string, number> = { morning: 8, midday: 13, evening: 19, night: 23 };
        return { enabled: parsed.enabled, mode: "custom", customHour: hourMap[parsed.mode] ?? 13 };
      }
      return { enabled: parsed.enabled, mode: parsed.mode || "auto", customHour: parsed.customHour ?? 13 };
    }
  } catch {}
  return { enabled: false, mode: "auto", customHour: 13 };
}

function saveLocal(enabled: boolean, mode: DaylightMode, customHour: number) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ enabled, mode, customHour }));
  } catch {}
}

export function DaylightProvider({ children }: { children: ReactNode }) {
  const [daylightEnabled, setDaylightEnabled] = useState(false);
  const [daylightMode, setDaylightModeState] = useState<DaylightMode>("auto");
  const [customHour, setCustomHourState] = useState(13);
  const [autoHour, setAutoHour] = useState<number>(() => {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60;
  });

  // Load from localStorage + Supabase on mount
  useEffect(() => {
    const local = loadLocal();
    setDaylightEnabled(local.enabled);
    setDaylightModeState(local.mode);
    setCustomHourState(local.customHour);

    async function loadFromDb() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("daylight_mode")
          .eq("id", user.id)
          .single();
        if (profile?.daylight_mode) {
          const dbVal = profile.daylight_mode as string;
          // Migrate old preset names to custom+hour
          const presetHours: Record<string, number> = { morning: 8, midday: 13, evening: 19, night: 23 };
          if (dbVal in presetHours && dbVal !== "auto") {
            const h = presetHours[dbVal];
            const en = dbVal !== "midday";
            setDaylightEnabled(en);
            setDaylightModeState(en ? "custom" : "auto");
            setCustomHourState(h);
            saveLocal(en, en ? "custom" : "auto", h);
          } else if (dbVal === "auto") {
            setDaylightEnabled(true);
            setDaylightModeState("auto");
            saveLocal(true, "auto", local.customHour);
          } else {
            // Try parsing as hour number (new format)
            const parsed = parseFloat(dbVal);
            if (!isNaN(parsed)) {
              setDaylightEnabled(true);
              setDaylightModeState("custom");
              setCustomHourState(parsed);
              saveLocal(true, "custom", parsed);
            }
          }
        }
      } catch {}
    }
    loadFromDb();
  }, []);

  // Update auto hour every 60 seconds
  useEffect(() => {
    if (!daylightEnabled || daylightMode !== "auto") return;
    const interval = setInterval(() => {
      const now = new Date();
      setAutoHour(now.getHours() + now.getMinutes() / 60);
    }, 60_000);
    return () => clearInterval(interval);
  }, [daylightEnabled, daylightMode]);

  const persistToDb = useCallback(async (enabled: boolean, mode: DaylightMode, hour: number) => {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Store as: "midday" (=off), "auto", or hour number as string (e.g. "8", "19.5")
      const val = enabled ? (mode === "auto" ? "auto" : String(hour)) : "midday";
      await supabase
        .from("profiles")
        .update({ daylight_mode: val })
        .eq("id", user.id);
    } catch {}
  }, []);

  const toggleDaylight = useCallback(() => {
    const next = !daylightEnabled;
    setDaylightEnabled(next);
    const mode: DaylightMode = "auto";
    setDaylightModeState(mode);
    saveLocal(next, mode, customHour);
    persistToDb(next, mode, customHour);
  }, [daylightEnabled, customHour, persistToDb]);

  const setDaylightMode = useCallback((mode: DaylightMode) => {
    setDaylightModeState(mode);
    setDaylightEnabled(true);
    saveLocal(true, mode, customHour);
    persistToDb(true, mode, customHour);
  }, [customHour, persistToDb]);

  const dbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setCustomHour = useCallback((hour: number) => {
    setCustomHourState(hour);
    setDaylightModeState("custom");
    setDaylightEnabled(true);
    saveLocal(true, "custom", hour);
    // Debounce DB persistence — slider fires on every pixel
    if (dbTimerRef.current) clearTimeout(dbTimerRef.current);
    dbTimerRef.current = setTimeout(() => persistToDb(true, "custom", hour), 500);
  }, [persistToDb]);

  // Resolve the hour: if disabled → undefined (use default midday), if auto → system time, else → custom slider hour
  const resolvedHour = daylightEnabled
    ? (daylightMode === "auto" ? autoHour : customHour)
    : undefined;

  // Sync to the global override used by 3D scenes
  useEffect(() => {
    setDaylightHour(resolvedHour);
  }, [resolvedHour]);

  const contextValue = useMemo(() => ({ daylightEnabled, daylightMode, customHour, toggleDaylight, setDaylightMode, setCustomHour, resolvedHour }), [daylightEnabled, daylightMode, customHour, toggleDaylight, setDaylightMode, setCustomHour, resolvedHour]);

  return (
    <DaylightContext.Provider value={contextValue}>
      {children}
    </DaylightContext.Provider>
  );
}

export function useDaylight() {
  return useContext(DaylightContext);
}
