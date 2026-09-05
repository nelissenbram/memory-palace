// Ken-Burns segments from persona-palace stills. Crops dev chrome (top ~84px,
// keeps 9:16), 2x upscales against zoompan jitter, applies a slow push.
// Output: 1080x1920@30 h264 crf18 segments for the Clip Factory footage bank.
// Usage: node scripts/week1/persona-segs.mjs   (ffmpeg on PATH)
import { execFileSync } from "child_process";
import fs from "fs";

const STILLS = "C:/Users/nelis/memory-palace/socials-kit/clips/work/stills/personas";
const OUT = "C:/Users/nelis/memory-palace/socials-kit/clips/work/persona-segs";
fs.mkdirSync(OUT, { recursive: true });

const manifest = JSON.parse(
  fs.readFileSync("C:/Users/nelis/memory-palace/socials-kit/clips/work/personas/manifest.json", "utf8")
);

const DUR = 5; // seconds per segment
const FPS = 30;
const FRAMES = DUR * FPS;

// Crop the 1620x2880 still to remove top dev-chrome bar, then scale to a 9:16
// working canvas. We drop 84px top + 40px bottom, then letterbox-safe scale.
function build(name, kind) {
  const src = `${STILLS}/${name}.png`;
  if (!fs.existsSync(src)) { console.warn("missing:", name); return; }
  const out = `${OUT}/${name}-9x16.mp4`;
  // corridor: slow push-in toward the vanishing point (center).
  // hearth:   slow rise up the mantel (start low on the fire, settle on photo).
  const zStart = kind === "hearth" ? 1.12 : 1.0;
  const zEnd = kind === "hearth" ? 1.0 : 1.14;
  const yExpr = kind === "hearth"
    ? "(ih-ih/zoom)*(1-on/" + FRAMES + ")*0.6"   // drift downward-to-up feel
    : "(ih-ih/zoom)/2";
  const zoomExpr =
    `if(eq(on,0),${zStart},zoom+(${zEnd}-${zStart})/${FRAMES})`;
  const vf = [
    "crop=1620:2756:0:84",         // drop top chrome bar + a little bottom
    "scale=2160:3674:flags=lanczos", // 2x-ish upscale to kill zoompan jitter
    `zoompan=z='${zoomExpr}':x='(iw-iw/zoom)/2':y='${yExpr}':d=${FRAMES}:s=1080x1920:fps=${FPS}`,
    "format=yuv420p",
  ].join(",");
  console.log("building", name);
  execFileSync("ffmpeg", [
    "-y", "-loop", "1", "-i", src, "-t", String(DUR),
    "-vf", vf, "-r", String(FPS),
    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", out,
  ], { stdio: ["ignore", "ignore", "inherit"] });
}

const built = [];
for (const p of manifest) {
  build(`hearth-${p.username}`, "hearth");
  build(`cor-${p.username}`, "corridor");
  built.push({
    username: p.username,
    displayName: p.displayName,
    lifeStage: p.lifeStage,
    category: p.category,
    hero: { title: p.hero.title, seg: `hearth-${p.username}-9x16.mp4` },
    corridor: {
      titles: p.corridor.map((c) => c.title),
      seg: `cor-${p.username}-9x16.mp4`,
    },
  });
}

fs.writeFileSync(`${OUT}/FOOTAGE-MANIFEST.json`, JSON.stringify(built, null, 2));
console.log(`\ndone: ${fs.readdirSync(OUT).filter((f) => f.endsWith(".mp4")).length} segments in ${OUT}`);
