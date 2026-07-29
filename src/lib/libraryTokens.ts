/**
 * libraryTokens — the Library speaks the exact same design language as the
 * Atrium board. These constants mirror AtriumRelay.tsx (RT ramp, SHADOW
 * grammar, INK & EMBER palette, hairline, tray, wing accents) so the Library
 * can never drift from the Atrium again.
 *
 * THE ONE RULE (codified so it stays durable):
 *   - wing accent  = identity / zone colour AT REST
 *   - EMBER #B85C38 = interactive / active / unread state
 *   - GOLD #D4AF37  = "the palace itself" ONLY: wing seals, focus rings,
 *     on-this-day frames, the sealed time-capsule.
 * Never spend gold on a generic button, filter, divider or accent.
 */

/* Type ramp (rem) — one small-caps voice at 0.6875 (700/0.12em/uppercase). */
export const RT = {
  overline: "0.6875rem", meta: "0.8125rem", body: "0.9375rem",
  titleS: "1.0625rem", titleM: "1.1875rem", titleL: "1.375rem",
  h1m: "1.75rem", h1: "2.25rem", lhDisplay: 1.15, lhBody: 1.4,
} as const;

/* Three steps of ONE warm ink. */
export const SHADOW = {
  0: "none",
  1: "0 0.25rem 1rem rgba(64,59,54,0.07)",
  2: "0 0.5rem 1.5rem rgba(64,59,54,0.14)",
} as const;
export const HOVER_SHADOW = "0 0.75rem 1.75rem rgba(64,59,54,0.16)";
export const TOP_HIGHLIGHT = "inset 0 0.0625rem 0 rgba(255,255,255,0.5)";

/* Named low steps for inset fields (search/inputs) — same warm ink, tighter. */
export const INPUT_SHADOW = "0 0.0625rem 0.25rem rgba(64,59,54,0.05)";
export const INPUT_SHADOW_FOCUS = "0 0.125rem 0.5rem rgba(64,59,54,0.08)";

/* INK & EMBER. */
export const INK = "#403B36";
export const INK_DEEP = "#2E2A26";        // darkest ink stop — keystone CTA gradient base
export const MUTED = "#716A5E";          // secondary text — FULL opacity, never double-dimmed
export const EMBER_GLYPH = "#9A4F2A";     // terracotta glyph / at-rest accent ink
export const EMBER = "#B85C38";           // interactive / active / unread
export const GOLD = "#D4AF37";            // palace-only
export const GOLD_SOFT = "#C99A2E";
export const SAGE = "#56683C";
export const SAGE_SOFT = "#7A8C64";
export const CREAM = "#FCFAF5";
export const HAIRLINE = "#E3D6BC";
export const TRAY = "#F6EBE3";            // recessed sandstone tray

/* Warm card surface — the tile gradient + its resting edge, shared so sibling
 * board surfaces (Atrium, Explore) reuse the identical value instead of drifting. */
export const CARD_BG = "linear-gradient(160deg, #FBF2EC 0%, #FCFAF5 78%)";
export const CARD_BORDER = "#E7D9C4";     // warm hairline for the card gradient edge

/* Per-wing accent (identity colour at rest). Falls back to ember glyph. */
export const WING_ACCENT: Record<string, string> = {
  roots: "#9A4F2A",
  nest: "#4A6D8C",
  craft: "#8B6B3D",
  travel: "#4A6741",
  passions: "#8A4F73",
  attic: "#6E6456",
};
export function wingAccent(id: string): string {
  return WING_ACCENT[id] || EMBER_GLYPH;
}

/* The one calm hover language: lift + one shadow step. */
export const HOVER_LIFT = "translateY(-0.1875rem)";
export const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/* Gilt section rule (palace seam) vs a wing-accent rule (inside a room). */
export const giltRule = "linear-gradient(to right, #D4AF37, rgba(212,175,55,0.35) 40%, transparent)";
export function accentRule(color: string): string {
  return `linear-gradient(90deg, ${color}59, transparent)`;
}

/* Focus ring — palace gold. Spread into a :focus-visible style. */
export const focusRing = { outline: `0.1875rem solid ${GOLD}`, outlineOffset: "0.1875rem" } as const;
