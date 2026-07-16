// Remove landingV2 keys that no longer render anywhere (payload hygiene).
import { readFileSync, writeFileSync } from "node:fs";
for (const l of ["en", "nl", "de", "es", "fr"]) {
  const p = "src/messages/" + l + ".json";
  const d = JSON.parse(readFileSync(p, "utf8"));
  const v2 = d.landingV2;
  delete v2.bands;
  delete v2.more;
  delete v2.proof;
  delete v2.phone;
  delete v2.pricing;
  delete v2.promise.founderTitle;
  delete v2.promise.founderBody;
  delete v2.why.link;
  writeFileSync(p, JSON.stringify(d, null, 2) + "\n");
  console.log(l + " pruned");
}
