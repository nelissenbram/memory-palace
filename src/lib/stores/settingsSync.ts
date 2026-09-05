"use client";

/**
 * Syncs localStorage-only settings to Supabase profiles.local_settings
 * so they stay consistent across devices.
 *
 * Synced keys:
 *   mp_custom_rooms, mp_custom_wings,
 *   mp_important_dates, mp_demos_hidden, mp_deleted_demos,
 *   mp_persona_type, mp_persona_scores,
 *   mp_corridor_paintings_<wingId> (by prefix; data-URI uploads stay local)
 */

import { createBrowserClient } from "@supabase/ssr";

const SYNCED_KEYS = [
  "mp_custom_rooms",
  "mp_custom_wings",
  "mp_extra_wings",
  "mp_important_dates",
  "mp_demos_hidden",
  "mp_deleted_demos",
  "mp_persona_type",
  "mp_persona_scores",
] as const;

// Dynamic key families synced by prefix (one localStorage key per wing id,
// including custom wings): mp_corridor_paintings_<wingId> = manual corridor
// curation (CorridorGalleryPanel). Values are sanitized on push — see
// sanitizeCorridorValue — so device-local base64 uploads never enter the
// profiles.local_settings JSONB blob.
const CORRIDOR_PREFIX = "mp_corridor_paintings_";

type SyncedSettings = Record<string, string | null>;

/** All localStorage keys in a synced prefix family present on this device. */
function localPrefixKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CORRIDOR_PREFIX)) keys.push(k);
    }
  } catch {}
  return keys;
}

type CorridorEntry = { url?: string; memId?: string; [k: string]: unknown };

/**
 * Corridor entries can hold base64 data-URIs (the panel's direct upload path).
 * Those are device-local by nature and far too heavy for the settings blob:
 * an entry WITH a memId travels without its url (the receiving device
 * re-resolves the url from the memory store — see corridorPaintingsSeeded);
 * an entry WITHOUT a memId can never be resolved elsewhere and is omitted
 * (remote devices fall back to the F09 seed for that slot).
 */
function sanitizeCorridorValue(raw: string | null): string | null {
  if (!raw) return raw;
  try {
    const map = JSON.parse(raw) as Record<string, CorridorEntry | null>;
    const out: Record<string, CorridorEntry> = {};
    for (const [slot, e] of Object.entries(map)) {
      if (!e || typeof e !== "object") continue;
      if (typeof e.url === "string" && e.url.startsWith("data:")) {
        if (!e.memId) continue;
        const { url: _url, ...rest } = e;
        out[slot] = rest;
      } else {
        out[slot] = e;
      }
    }
    return JSON.stringify(out);
  } catch { return raw; }
}

/**
 * Per-slot merge for a corridor key on pull. Server wins per slot, EXCEPT a
 * local data-URI upload survives when the server has nothing for that slot —
 * otherwise every login would wipe the uploading device's own curation (its
 * uploads are stripped from what it pushes).
 */
function mergeCorridorValue(server: string | null | undefined, local: string | null): string | null {
  if (server === undefined || server === null) return local;
  let sMap: Record<string, CorridorEntry | null>;
  try { sMap = JSON.parse(server) || {}; } catch { return local ?? server; }
  let lMap: Record<string, CorridorEntry | null> = {};
  try { lMap = local ? JSON.parse(local) || {} : {}; } catch {}
  const out: Record<string, CorridorEntry | null> = { ...sMap };
  for (const [slot, e] of Object.entries(lMap)) {
    if (out[slot] === undefined && e && typeof e === "object"
      && typeof e.url === "string" && e.url.startsWith("data:")) {
      out[slot] = e;
    }
  }
  return JSON.stringify(out);
}

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

/** Gather all synced keys from localStorage. `sanitize` strips what must not
 *  reach the server (corridor data-URI uploads) — pass true for every push. */
function gatherLocal(sanitize: boolean): SyncedSettings {
  const out: SyncedSettings = {};
  for (const k of SYNCED_KEYS) {
    try { out[k] = localStorage.getItem(k); } catch { out[k] = null; }
  }
  for (const k of localPrefixKeys()) {
    try {
      const raw = localStorage.getItem(k);
      out[k] = sanitize ? sanitizeCorridorValue(raw) : raw;
    } catch { out[k] = null; }
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
  for (const [k, val] of Object.entries(server)) {
    if (!k.startsWith(CORRIDOR_PREFIX)) continue;
    try { if (val !== undefined && val !== null) localStorage.setItem(k, val); } catch {}
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
    // Raw (unsanitized) local view: the pull-merge must see this device's own
    // data-URI uploads so mergeCorridorValue can preserve them locally.
    const localSettings = gatherLocal(false);

    // Merge: server wins for existing keys, keep local-only keys
    const merged: SyncedSettings = { ...localSettings };
    for (const k of SYNCED_KEYS) {
      if (serverSettings[k] !== undefined && serverSettings[k] !== null) {
        merged[k] = serverSettings[k];
      }
    }
    // Corridor keys: per-slot merge (server wins per slot, local uploads
    // survive) over the union of both sides' keys.
    for (const k of new Set([...Object.keys(serverSettings), ...Object.keys(localSettings)])) {
      if (!k.startsWith(CORRIDOR_PREFIX)) continue;
      merged[k] = mergeCorridorValue(serverSettings[k], localSettings[k] ?? null);
    }

    // Apply merged settings to localStorage
    applyToLocal(merged);

    // Notify Zustand stores to re-read from updated localStorage
    window.dispatchEvent(new Event("mp-settings-synced"));

    // Push merged back to server (fills in any local-only keys) — sanitized,
    // so local-only upload entries never inflate the JSONB blob.
    const hasNewKeys = Object.keys(merged).some(k =>
      merged[k] !== null && (serverSettings[k] === undefined || serverSettings[k] === null)
    );
    if (hasNewKeys) {
      const push: SyncedSettings = { ...merged };
      for (const k of Object.keys(push)) {
        if (k.startsWith(CORRIDOR_PREFIX)) push[k] = sanitizeCorridorValue(push[k]);
      }
      await sb.from("profiles")
        .update({ local_settings: push })
        .eq("id", user.id);
    }
  } catch (e) {
    console.warn("[settingsSync] load failed:", e);
  }
}

/**
 * Immediately push current localStorage settings to server (non-debounced).
 * Use before server-side queries that depend on local_settings.
 */
export async function flushSettingsToServer() {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const settings = gatherLocal(true);
    await sb.from("profiles")
      .update({ local_settings: settings })
      .eq("id", user.id);
  } catch (e) {
    console.warn("[settingsSync] flush failed:", e);
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
      const settings = gatherLocal(true);
      await sb.from("profiles")
        .update({ local_settings: settings })
        .eq("id", user.id);
    } catch (e) {
      console.warn("[settingsSync] save failed:", e);
    }
  }, 2000);
}
