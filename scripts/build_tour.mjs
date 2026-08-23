// Chains the 7 graded segments (approach opener, hall named-wings, corridor
// walk+painting, corridor door, room screen/leftwall/mantel) with xfade
// crossfades — 0.5s at the two key joins (hall->corridor, corridor->room),
// short elsewhere — into the final tour.
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
const DIR = path.resolve("scripts/hero_rec2/seg2");
const dur = (f) => parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${f}"`).toString().trim());
const segs = ["s0", "s1", "s2", "s3", "s4", "s5", "s6"].map((s) => path.join(DIR, `${s}.mp4`));
// joins: approach->hall, hall->corridor(KEY), walk->door, door->room(KEY), screen->left, left->mantel
const xf = [0.3, 0.5, 0.2, 0.5, 0.2, 0.2];
let cur = segs[0];
let curDur = dur(cur);
for (let i = 1; i < segs.length; i++) {
  const d = xf[i - 1];
  const off = (curDur - d).toFixed(3);
  const out = path.join(DIR, `chain_${i}.mp4`);
  execSync(`ffmpeg -y -v error -i "${cur}" -i "${segs[i]}" -filter_complex "[0:v][1:v]xfade=transition=fade:duration=${d}:offset=${off}" -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -r 30 -an "${out}"`, { stdio: "inherit" });
  cur = out;
  curDur = dur(cur);
  console.log(`join ${i}: xfade ${d}s @ ${off}s -> ${curDur.toFixed(2)}s`);
}
const final = path.resolve("public/video/walkthrough-tour.mp4");
execSync(`ffmpeg -y -v error -i "${cur}" -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p -r 30 -an -movflags +faststart "${final}"`, { stdio: "inherit" });
console.log(`FINAL: walkthrough-tour.mp4  ${dur(final).toFixed(2)}s  ${(fs.statSync(final).size / 1e6).toFixed(1)}MB`);
