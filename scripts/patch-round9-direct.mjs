import { readFileSync, writeFileSync } from "node:fs";
for (const l of ["en", "nl", "de", "es", "fr"]) {
  const p = "src/messages/" + l + ".json";
  const j = JSON.parse(readFileSync(p, "utf8"));
  j.landingV2.hero.eyebrow = ""; // #1: erase "A 3D home for your memories, shared with friends & family"
  writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  console.log(l + " hero eyebrow cleared");
}
