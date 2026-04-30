"use client";

/**
 * Syncs localStorage-only settings to Supabase profiles.local_settings
 * so they stay consistent across devices.
 *
 * Synced keys:
 *   mp_custom_rooms, mp_custom_wings, mp_room_layouts,
 *   mp_important_dates, mp_demos_hidden, mp_deleted_demos,
 *   mp_persona_type, mp_persona_scores
 */

import { createBrowserClient } from "@supabase/ssr";

const SYNCED_KEYS = [
  "mp_custom_rooms",
  "mp_custom_wings",
  "mp_room_layouts",
  "mp_important_dates",
  "mp_demos_hidden",
  "mp_deleted_demos",
  "mp_persona_type",
  "mp_persona_scores",
] as const;

type SyncedSettings = Record<string, string | null>;

let _supabase: ReturnType<typeof createBrowserClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    _supabase = createBrowserClient(url, key);
  }
  return _supabase;
}

/** Gather all synced keys from localStorage */
function gatherLocal(): SyncedSettings {
  const out: SyncedSettings = {};
  for (const k of SYNCED_KEYS) {
    try { out[k] = localStorage.getItem(k); } catch { out[k] = null; }
  }
  return out;
}

/** Apply server settings to localStorage (server wins) */
function applyToLocal(server: SyncedSettings) {
  for (const k of SYNCED_KEYS) {
    try {
      const val = server[k];
      if (val !== undefined && val !== null) {
        localStorage.setItem(k, val);
      }
    } catch {}
  }
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Load settings from server and merge into localStorage.
 * Server wins for any key that exists on the server.
 * Then push any local-only keys back to the server.
 */
export async function syncSettingsFromServer() {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const { data } = await sb.from("profiles")
      .select("local_settings")
      .eq("id", user.id)
      .maybeSingle();

    const serverSettings: SyncedSettings = data?.local_settings ?? {};
    const localSettings = gatherLocal();

    // Merge: server wins for existing keys, keep local-only keys
    const merged: SyncedSettings = { ...localSettings };
    for (const k of SYNCED_KEYS) {
      if (serverSettings[k] !== undefined && serverSettings[k] !== null) {
        merged[k] = serverSettings[k];
      }
    }

    // Apply merged settings to localStorage
    applyToLocal(merged);

    // Notify Zustand stores to re-read from updated localStorage
    window.dispatchEvent(new Event("mp-settings-synced"));

    // Push merged back to server (fills in any local-only keys)
    const hasNewKeys = SYNCED_KEYS.some(k =>
      merged[k] !== null && (serverSettings[k] === undefined || serverSettings[k] === null)
    );
    if (hasNewKeys) {
      await sb.from("profiles")
        .update({ local_settings: merged })
        .eq("id", user.id);
    }
  } catch (e) {
    console.warn("[settingsSync] load failed:", e);
  }
}

/**
 * Debounced save of current localStorage settings to server.
 * Call this whenever a synced key changes.
 */
export function syncSettingsToServer() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async () => {
    const sb = getSupabase();
    if (!sb) return;
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      const settings = gatherLocal();
      await sb.from("profiles")
        .update({ local_settings: settings })
        .eq("id", user.id);
    } catch (e) {
      console.warn("[settingsSync] save failed:", e);
    }
  }, 2000);
}
