#!/usr/bin/env node
/**
 * MUSEO VIVO contrast probe (WS12-11a) — Wave-1 gate check.
 *
 * Parses the canon tokens from src/lib/3d/canon.ts (single source of truth —
 * NO hex values are hardcoded here) and asserts:
 *   1. every wall/floor token (PLASTER family + PLASTER_RAMP + TRAVERTINE_GROUT)
 *      has WCAG relative luminance ≥ BRIGHTNESS_RATIOS.wallMin (0.5);
 *   2. INK-on-PLASTER contrast ratio ≥ 4.5:1 (WCAG AA normal text).
 *
 * Exit 0 = pass, exit 1 = fail. Run: npm run audit:contrast
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const canonPath = join(root, "src", "lib", "3d", "canon.ts");
const src = readFileSync(canonPath, "utf8");

// ── Parse canon.ts ──────────────────────────────────────────────

/** Top-level hex consts: export const NAME = "#RRGGBB" */
const tokens = {};
for (const m of src.matchAll(/export const (\w+)\s*=\s*"(#[0-9A-Fa-f]{6})"/g)) {
  tokens[m[1]] = m[2];
}

/** PLASTER_RAMP entries — hex literals AND identifier refs (base: PLASTER). */
const ramp = {};
const rampBlock = src.match(/export const PLASTER_RAMP\s*=\s*\{([\s\S]*?)\}/);
if (rampBlock) {
  for (const m of rampBlock[1].matchAll(/(\w+):\s*"(#[0-9A-Fa-f]{6})"/g)) ramp[m[1]] = m[2];
  for (const m of rampBlock[1].matchAll(/(\w+):\s*([A-Z_][A-Z0-9_]*)\s*,/g)) {
    if (tokens[m[2]]) ramp[m[1]] = tokens[m[2]];
  }
}

const wallMin = parseFloat(src.match(/wallMin:\s*([\d.]+)/)?.[1] ?? "0.5");

// Sanity: the tokens this probe depends on must exist in canon.ts.
for (const required of ["PLASTER", "TRAVERTINE_GROUT", "INK"]) {
  if (!tokens[required]) {
    console.error(`FATAL: could not parse ${required} from ${canonPath}`);
    process.exit(1);
  }
}
if (Object.keys(ramp).length === 0) {
  console.error(`FATAL: could not parse PLASTER_RAMP from ${canonPath}`);
  process.exit(1);
}

// ── WCAG math (mirrors canon.ts relLuminance) ───────────────────

function relLuminance(hex) {
  const v = parseInt(hex.replace("#", ""), 16);
  const chan = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * chan((v >> 16) & 0xff) +
    0.7152 * chan((v >> 8) & 0xff) +
    0.0722 * chan(v & 0xff)
  );
}

function contrastRatio(hexA, hexB) {
  const [hi, lo] = [relLuminance(hexA), relLuminance(hexB)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

// ── Assertions ──────────────────────────────────────────────────

let failures = 0;
const pad = (s, n) => String(s).padEnd(n);

console.log(`MUSEO VIVO contrast probe — canon: ${canonPath}\n`);

// 1. Wall/floor luminance floor (brightness dogma: wallMin)
console.log(`Wall/floor tokens — relative luminance >= ${wallMin} (BRIGHTNESS_RATIOS.wallMin):`);
const wallFloor = {
  PLASTER: tokens.PLASTER,
  TRAVERTINE_GROUT: tokens.TRAVERTINE_GROUT,
  ...Object.fromEntries(Object.entries(ramp).map(([k, v]) => [`PLASTER_RAMP.${k}`, v])),
};
for (const [name, hex] of Object.entries(wallFloor)) {
  const L = relLuminance(hex);
  const ok = L >= wallMin;
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${pad(name, 22)} ${hex}  L=${L.toFixed(3)}`);
}

// 2. INK on PLASTER — WCAG AA normal text
const AA = 4.5;
const ratio = contrastRatio(tokens.INK, tokens.PLASTER);
const inkOk = ratio >= AA;
if (!inkOk) failures++;
console.log(`\nINK on PLASTER — WCAG AA contrast >= ${AA}:1`);
console.log(`  ${inkOk ? "PASS" : "FAIL"}  INK ${tokens.INK} on PLASTER ${tokens.PLASTER}  ratio=${ratio.toFixed(2)}:1`);

// ── Verdict ─────────────────────────────────────────────────────

if (failures > 0) {
  console.error(`\nCONTRAST PROBE FAILED: ${failures} assertion(s) below budget.`);
  process.exit(1);
}
console.log("\nContrast probe passed — canon within Wave-1 budgets.");
