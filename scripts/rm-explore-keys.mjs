import { readFileSync, writeFileSync } from "node:fs";
for (const l of ["en", "nl", "de", "es", "fr"]) {
  const p = "src/messages/" + l + ".json";
  const d = JSON.parse(readFileSync(p, "utf8"));
  delete d.landingV2.showcase.exploreCta;
  delete d.landingV2.showcase.noAccount;
  writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
  console.log(l + " cleaned");
}
