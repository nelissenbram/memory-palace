/**
 * MUSEO VIVO staging flags (WS11-13) — THE one flag mechanism (master plan §5
 * flag rule). Named flags gate each wave's per-scene work: staging-ON /
 * prod-OFF defaults, `?flag3d=` override, read once at scene mount — never per
 * frame. Overrides persist in sessionStorage so SPA navigation between scenes
 * keeps them.
 *
 *   ?flag3d=w1_hall,w1_interior   force those ON (anywhere, including prod)
 *   ?flag3d=-w1_hall              force OFF
 *   ?flag3d=all / ?flag3d=none    everything ON / OFF
 *
 * Flag retirement is part of each wave's exit: before a wave promotes, the
 * previous wave's flags are deleted and their code paths made unconditional.
 */

const PROD_HOSTS = new Set(["thememorypalace.ai", "www.thememorypalace.ai"]);
const STORE_KEY = "mp_flag3d";

// Retired flags (waves promoted to production; exterior owner-approved
// 2026-08-12, hall "full go" 2026-08-13, corridor "op naar productie"
// 2026-08-16, interior + room-UI "promoot alles naar productie" 2026-08-18):
// unconditionally ON everywhere.
// `?flag3d=-name` still works as an emergency kill switch.
const RETIRED_ON = new Set([
  "w1_exterior", "w2_exterior", "w3_exterior",
  "w1_hall", "w2_hall", "w3_hall",
  "w1_corridor", "w2_corridor", "w3_corridor",
  "w1_interior", "w2_interior", "w3_interior",
  "w1_roomui",
]);

function readOverrides(): Map<string, boolean> {
  const map = new Map<string, boolean>();
  if (typeof window === "undefined") return map;
  let raw: string | null = null;
  try {
    raw = new URLSearchParams(window.location.search).get("flag3d");
    if (raw !== null) window.sessionStorage.setItem(STORE_KEY, raw);
    else raw = window.sessionStorage.getItem(STORE_KEY);
  } catch {
    // sessionStorage unavailable (private mode) — fall through with URL value only
  }
  if (!raw) return map;
  for (const tok of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (tok === "all") map.set("*", true);
    else if (tok === "none" || tok === "off") map.set("*", false);
    else if (tok.startsWith("-") || tok.startsWith("!")) map.set(tok.slice(1), false);
    else map.set(tok, true);
  }
  return map;
}

/** True when the named flag is on for this session (default: on everywhere except production hostnames). */
export function flag3d(name: string): boolean {
  if (typeof window === "undefined") return false;
  const ov = readOverrides();
  if (ov.has(name)) return ov.get(name)!;
  if (ov.has("*")) return ov.get("*")!;
  if (RETIRED_ON.has(name)) return true;
  return !PROD_HOSTS.has(window.location.hostname);
}
