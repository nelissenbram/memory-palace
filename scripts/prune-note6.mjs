import { readFileSync, writeFileSync } from "node:fs";
for (const l of ["en", "nl", "de", "es", "fr"]) {
  const p = "src/messages/" + l + ".json";
  const d = JSON.parse(readFileSync(p, "utf8"));
  // n6 was the explore-palaces screenshot note; that shot is dropped.
  if (d.landingV2.notes) delete d.landingV2.notes.n6;
  writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
  console.log(l + " note n6 removed");
}
