import { readFileSync, writeFileSync } from "node:fs";
const map = {
  UploadsCard: ["uploadsName", "uploadsRole"],
  CloudImportCard: ["cloudName", "cloudRole"],
  ReceiveCard: ["receiveName", "receiveRole"],
  PalaceCard: ["palaceName", "palaceRole"],
  InterviewsCard: ["interviewName", "interviewRole"],
  MapCard: ["mapName", "mapRole"],
  TreeCard: ["treeName", "treeRole"],
  JourneysCard: ["journeyName", "journeyRole"],
  CapsuleCard: ["capsuleName", "capsuleRole"],
  CocreateCard: ["cocreateName", "cocreateRole"],
  SharingCard: ["sharingName", "sharingRole"],
  LegacyCard: ["legacyName", "legacyRole"],
};
for (const [file, [nameKey, roleKey]] of Object.entries(map)) {
  const p = `src/components/landing/usp/${file}.tsx`;
  let s = readFileSync(p, "utf8");
  const from = `name={m.${nameKey}}`;
  if (!s.includes(from)) { console.log(`!! ${file}: '${from}' not found`); continue; }
  if (s.includes(`role={m.${roleKey}}`)) { console.log(`= ${file}: already has role`); continue; }
  s = s.replace(from, `${from} role={m.${roleKey}}`);
  writeFileSync(p, s, "utf8");
  console.log(`+ ${file}: role added`);
}
