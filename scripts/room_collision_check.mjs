// Headless maths verification of the room T-footprint walker clamp
// (owner bug: enter the room, step LEFT/RIGHT at the door → walk through the
// stem side wall and escape). Imports the REAL clamp (roomCollision.ts, via
// Node type-stripping) + the REAL layouts and drives a simulated walker.
//   node scripts/room_collision_check.mjs
import { stemForRoom, clampToFootprint, WALL_MARGIN, FRONT_MARGIN } from "../src/lib/3d/roomCollision.ts";
import { layoutForRoom } from "../src/lib/3d/roomLayouts.ts";

let failures = 0;
const EPS = 1e-9;
function assert(cond, msg) {
  if (!cond) { failures++; console.error("  FAIL:", msg); }
}

// Is (x,z) inside the T footprint (wall planes, no margin)?
function insideFootprint(x, z, rW, rL, stemHalfW, widenZ) {
  if (Math.abs(x) > rW / 2 + EPS) return false;
  if (z < -rL / 2 - EPS || z > rL / 2 + EPS) return false;
  if (z > widenZ + EPS && Math.abs(x) > stemHalfW + EPS) return false; // cut-away notch beside the stem
  return true;
}

// Walker sim: intended velocity applied in 0.1 m steps, clamp after each step
// (exactly the InteriorScene integrator order: move → clampToFootprint).
function walk(start, dir, steps, f) {
  const p = { x: start.x, z: start.z };
  const len = Math.hypot(dir.x, dir.z);
  for (let i = 0; i < steps; i++) {
    const prev = { x: p.x, z: p.z };
    p.x += (dir.x / len) * 0.1;
    p.z += (dir.z / len) * 0.1;
    clampToFootprint(p, f);
    assert(insideFootprint(p.x, p.z, f.rW, f.rL, f.stemHalfW, f.widenZ),
      `escaped footprint at (${p.x.toFixed(2)}, ${p.z.toFixed(2)}) dir=(${dir.x},${dir.z})`);
    // continuity: the clamp must never teleport (≤ step + resolved penetration)
    assert(Math.hypot(p.x - prev.x, p.z - prev.z) < 0.5,
      `clamp teleported ${Math.hypot(p.x - prev.x, p.z - prev.z).toFixed(2)} m in one step`);
    if (failures) return p;
  }
  return p;
}

// The 5 base styles × the 4 media tiers (counts straddle the 6/16/32 thresholds).
const ROOM_IDS = ["den-0", "study-1", "parlour-x", "salon-y", "nook-z", "abcdef"];
const COUNTS = [0, 10, 20, 40];
let cases = 0;

for (const id of ROOM_IDS) {
  for (const count of COUNTS) {
    const layout = layoutForRoom(id, count);
    const { rW, rL } = layout;
    const { stemHalfW, stemLen, widenZ } = stemForRoom(rW, rL);
    const f = { rW, rL, tShape: true, stemHalfW, widenZ };
    cases++;

    // Door-edge coordinates: just inside the door, at the deepest allowed z.
    const doorZ = rL / 2 - FRONT_MARGIN;
    assert(doorZ > widenZ, `door z ${doorZ} should sit inside the stem (widenZ=${widenZ})`);

    // 1) The reported bug: at the door, go straight LEFT / RIGHT.
    for (const sx of [-1, 1]) {
      const end = walk({ x: 0, z: doorZ }, { x: sx, z: 0 }, 120, f);
      assert(Math.abs(end.x) <= stemHalfW - WALL_MARGIN + EPS,
        `lateral walk at door ended at |x|=${Math.abs(end.x).toFixed(2)} > stem wall ${stemHalfW - WALL_MARGIN}`);
      // Prove the OLD rectangle-only clamp escaped here (documents the root cause).
      const oldX = Math.max(-rW / 2 + 1, Math.min(rW / 2 - 1, sx * 12));
      assert(!insideFootprint(oldX, doorZ, rW, rL, stemHalfW, widenZ),
        `expected the legacy clamp to escape (rW=${rW}, stemHalfW=${stemHalfW}) — bug not reproducible?`);
    }

    // 2) Diagonals at the door (left+forward, right+back, etc.).
    for (const dir of [{ x: -1, z: 0.5 }, { x: 1, z: 0.5 }, { x: -1, z: -0.5 }, { x: 1, z: -0.5 }, { x: -0.3, z: -1 }, { x: 0.3, z: -1 }])
      walk({ x: 0, z: doorZ }, dir, 200, f);

    // 3) Hall side: stand beside the stem, push forward — the shoulder wall stops you.
    for (const sx of [-1, 1]) {
      const hx = sx * (stemHalfW + (rW / 2 - stemHalfW) / 2);
      const end = walk({ x: hx, z: widenZ - 3 }, { x: 0, z: 1 }, 80, f);
      assert(end.z <= widenZ - WALL_MARGIN + EPS,
        `shoulder wall breached: z=${end.z.toFixed(2)} > ${widenZ - WALL_MARGIN}`);
      assert(Math.abs(end.x - hx) < EPS, `shoulder stop moved x sideways (${hx} → ${end.x})`);
    }

    // 4) Spawn point (stem mouth, InteriorScene camZ formula) starts inside + unclamped.
    const spawn = { x: 0, z: Math.max(-rL / 2 + 4, rL / 2 - stemLen - 0.6) };
    const before = { ...spawn };
    clampToFootprint(spawn, f);
    assert(spawn.x === before.x && spawn.z === before.z, `spawn point got clamped (${before.z} → ${spawn.z})`);

    // 5) Legacy (flag-off) footprint: tShape=false must behave as the old rectangle.
    const rect = clampToFootprint({ x: 999, z: 999 }, { ...f, tShape: false });
    assert(rect.x === rW / 2 - WALL_MARGIN && rect.z === rL / 2 - FRONT_MARGIN, "legacy rectangle clamp changed");
  }
}

if (failures) {
  console.error(`\n${failures} assertion(s) FAILED across ${cases} room cases`);
  process.exit(1);
}
console.log(`OK — ${cases} room cases (5 styles × 4 tiers + hash ids): lateral/diagonal walks at the door stay inside the T footprint; shoulder walls hold; spawn + legacy clamp unchanged.`);
