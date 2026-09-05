// Splice LandingV2Client.tsx: replace the legacy vignette consts + USP_GROUPS
// block with the 13 brand-army card components. Anchored on exact line matches.
import { readFileSync, writeFileSync } from "node:fs";

const file = "src/app/LandingV2Client.tsx";
const src = readFileSync(file, "utf8");
const lines = src.split("\n");

const start = lines.findIndex((l) => l.trimEnd() === "  const whatsappVignette = (");
const end = lines.findIndex((l) => l.startsWith("  const USP_FLAT = USP_GROUPS.flatMap"));
if (start === -1 || end === -1 || end <= start) {
  console.error("anchors not found", { start, end });
  process.exit(1);
}

const replacement = `  const MOCK = v2.mock as Record<string, string>;
  const USP_GROUPS: Array<{ label: string; items: Array<{ t: string; b: string; media: React.ReactNode }> }> = [
    {
      label: v2.usps.groupCapture,
      items: [
        { t: v2.usps.u1t, b: v2.usps.u1b, media: <KepCard m={MOCK} aiLabel={v2.mock.ai} /> },
        { t: v2.usps.u2t, b: v2.usps.u2b, media: <UploadsCard m={MOCK} /> },
        { t: v2.usps.u3t, b: v2.usps.u3b, media: <CloudImportCard m={MOCK} aiLabel={v2.mock.ai} /> },
        { t: v2.usps.u4t, b: v2.usps.u4b, media: <ReceiveCard m={MOCK} /> },
      ],
    },
    {
      label: v2.usps.groupEnrich,
      items: [
        { t: v2.usps.u5t, b: v2.usps.u5b, media: <PalaceCard m={MOCK} /> },
        { t: v2.usps.u6t, b: v2.usps.u6b, media: <InterviewsCard m={MOCK} aiLabel={v2.mock.ai} /> },
        { t: v2.usps.u7t, b: v2.usps.u7b, media: <MapCard m={MOCK} /> },
        { t: v2.usps.u8t, b: v2.usps.u8b, media: <TreeCard m={MOCK} /> },
        { t: v2.usps.u9t, b: v2.usps.u9b, media: <JourneysCard m={MOCK} /> },
      ],
    },
    {
      label: v2.usps.groupShare,
      items: [
        { t: v2.usps.u10t, b: v2.usps.u10b, media: <CapsuleCard m={MOCK} /> },
        { t: v2.usps.u11t, b: v2.usps.u11b, media: <CocreateCard m={MOCK} /> },
        { t: v2.usps.u12t, b: v2.usps.u12b, media: <SharingCard m={MOCK} /> },
        { t: v2.usps.u13t, b: v2.usps.u13b, media: <LegacyCard m={MOCK} /> },
      ],
    },
  ];
`;

lines.splice(start, end - start, replacement);
let out = lines.join("\n");

// Add the card imports after the PalaceLogo import.
out = out.replace(
  'import PalaceLogo from "@/components/landing/PalaceLogo";',
  `import PalaceLogo from "@/components/landing/PalaceLogo";
import KepCard from "@/components/landing/usp/KepCard";
import UploadsCard from "@/components/landing/usp/UploadsCard";
import CloudImportCard from "@/components/landing/usp/CloudImportCard";
import ReceiveCard from "@/components/landing/usp/ReceiveCard";
import PalaceCard from "@/components/landing/usp/PalaceCard";
import InterviewsCard from "@/components/landing/usp/InterviewsCard";
import MapCard from "@/components/landing/usp/MapCard";
import TreeCard from "@/components/landing/usp/TreeCard";
import JourneysCard from "@/components/landing/usp/JourneysCard";
import CapsuleCard from "@/components/landing/usp/CapsuleCard";
import CocreateCard from "@/components/landing/usp/CocreateCard";
import SharingCard from "@/components/landing/usp/SharingCard";
import LegacyCard from "@/components/landing/usp/LegacyCard";`
);

writeFileSync(file, out, "utf8");
console.log("wired: replaced lines", start, "to", end, "and added 13 imports");
