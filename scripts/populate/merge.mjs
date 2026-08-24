// Merges the 6 enrichment-agent outputs into scripts/populate/personas.json.
// 5 agents returned via persisted tool-result files ([{type,text}] where text
// holds the JSON array, possibly wrapped in prose / ``` fences); the 6th wrote
// elder_personas.json directly. Extracts each array via balanced-bracket scan,
// concatenates, validates, writes personas.json.
import fs from "fs";
import path from "path";

const TR = "C:/Users/nelis/.claude/projects/C--Users-nelis/67b593f8-127f-49f9-90ae-700812a27515/tool-results";
const toolFiles = [
  "toolu_016neNaNMudkekxStg3Dt4VM.json", // A early-childhood
  "toolu_01FWdLER2QFtHxpNbg2kc1ie.json", // B teen
  "toolu_01ViWbH233j5QhFWqjwo3xyF.json", // C young-adult
  "toolu_01FSPeytiyepRcEYCqL8katx.json", // D thirties
  "toolu_015SkUZfX5kK64fkh5bzRjCF.json", // E mid-life
];
const elderFile = "C:/Users/nelis/memory-palace-staging/elder_personas.json";

// Extract the first balanced JSON array from a string (respects strings/escapes).
function extractArray(s) {
  const start = s.indexOf("[");
  if (start === -1) throw new Error("no [ found");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === "[") depth++;
      else if (c === "]") { depth--; if (depth === 0) return s.slice(start, i + 1); }
    }
  }
  throw new Error("unbalanced array");
}

function fromToolResult(file) {
  const raw = fs.readFileSync(path.join(TR, file), "utf8");
  const outer = JSON.parse(raw); // [{type:'text', text:'...'}]
  const text = Array.isArray(outer) ? outer.map((b) => b.text || "").join("\n") : String(outer);
  return JSON.parse(extractArray(text));
}

const buckets = [];
for (const f of toolFiles) {
  const arr = fromToolResult(f);
  console.log(`${f}: ${arr.length} personas`);
  buckets.push(arr);
}
const elder = JSON.parse(fs.readFileSync(elderFile, "utf8"));
console.log(`elder_personas.json: ${elder.length} personas`);
buckets.push(elder);

const all = buckets.flat();

// Validate
const valid = new Set(["roots", "nest", "craft", "travel", "passions", "attic"]);
const users = new Set(); const dups = [];
let wings = 0, rooms = 0, mems = 0, photos = 0; const badSlug = []; const badPersona = [];
for (const p of all) {
  if (!p.username || !p.displayName || !Array.isArray(p.wings)) badPersona.push(p.username || "??");
  if (users.has(p.username)) dups.push(p.username); users.add(p.username);
  for (const w of p.wings || []) {
    wings++; if (!valid.has(w.slug)) badSlug.push(`${p.username}:${w.slug}`);
    for (const r of w.rooms || []) {
      rooms++;
      for (const m of r.memories || []) { mems++; if (m.type === "photo" && m.imagePrompt) photos++; }
    }
  }
}
console.log(`\nTOTAL personas: ${all.length}`);
console.log(`wings: ${wings}  rooms: ${rooms}  memories: ${mems}  photo-images: ${photos}`);
console.log(`total image jobs (photos + ${all.length} avatars): ${photos + all.length}`);
console.log(`dup usernames: ${dups.length ? dups.join(", ") : "none"}`);
console.log(`bad slugs: ${badSlug.length ? badSlug.join(", ") : "none"}`);
console.log(`malformed personas: ${badPersona.length ? badPersona.join(", ") : "none"}`);

if (all.length !== 42) { console.error("EXPECTED 42 personas, got " + all.length); process.exit(1); }
if (dups.length || badSlug.length || badPersona.length) { console.error("VALIDATION FAILED"); process.exit(1); }

fs.writeFileSync(path.resolve("scripts/populate/personas.json"), JSON.stringify(all, null, 2));
console.log("\nWROTE scripts/populate/personas.json");
