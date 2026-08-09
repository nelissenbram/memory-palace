"use client";

import Link from "next/link";
import { T } from "@/lib/theme";

const C = T.color;
const F = T.font;

/**
 * Credits / third-party acknowledgements. Lists the CC-licensed 3D assets used
 * in the exterior palace scene. CC-BY requires visible attribution (author,
 * title, source, licence); CC0 assets are credited as a courtesy.
 */
type Asset = {
  title: string;
  author: string;
  source: string;
  licence: string;
  licenceUrl: string;
};

const CC_BY: Asset[] = [
  {
    title: "Corinthian Capital",
    author: "fts_ltx",
    source: "https://sketchfab.com/3d-models/remake-corinthian-capital-0529fdd8b0c149018c94de806d42eff8",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
  {
    title: "Stone urn",
    author: "kyantoran",
    source: "https://sketchfab.com/3d-models/stone-urn-6a7280ba64314a799701aa8d7c4a87ab",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
];

const CC0: Asset[] = [
  {
    title: "Clay Roof Tiles 02 (PBR texture)",
    author: "Poly Haven",
    source: "https://polyhaven.com/a/clay_roof_tiles_02",
    licence: "CC0",
    licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  {
    title: "Beige Wall 001 (PBR texture)",
    author: "Poly Haven",
    source: "https://polyhaven.com/a/beige_wall_001",
    licence: "CC0",
    licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
];

function AssetItem({ a }: { a: Asset }) {
  return (
    <li style={{ marginBottom: "1rem", lineHeight: 1.5 }}>
      <span style={{ fontWeight: 600 }}>{a.title}</span> by{" "}
      <a href={a.source} target="_blank" rel="noopener noreferrer" style={{ color: C.ember, textDecoration: "underline" }}>
        {a.author}
      </a>{" "}
      — licensed under{" "}
      <a href={a.licenceUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.ember, textDecoration: "underline" }}>
        {a.licence}
      </a>
      .
    </li>
  );
}

export default function CreditsPage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: C.cream,
        color: C.ink,
        fontFamily: F.body,
        padding: "max(2rem, env(safe-area-inset-top)) 1.25rem 3rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "42rem" }}>
        <Link href="/" style={{ color: C.ember, textDecoration: "none", fontSize: "0.95rem" }}>
          ← The Memory Palace
        </Link>
        <h1 style={{ fontFamily: F.display, fontSize: "2rem", margin: "1.5rem 0 0.5rem" }}>Credits</h1>
        <p style={{ opacity: 0.8, marginBottom: "2rem" }}>
          The 3D palace exterior uses a handful of openly-licensed assets. With gratitude to their creators:
        </p>

        <h2 style={{ fontFamily: F.display, fontSize: "1.15rem", margin: "0 0 0.75rem" }}>3D models (CC BY)</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem" }}>
          {CC_BY.map((a) => (
            <AssetItem key={a.title} a={a} />
          ))}
        </ul>

        <h2 style={{ fontFamily: F.display, fontSize: "1.15rem", margin: "0 0 0.75rem" }}>Textures (CC0)</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {CC0.map((a) => (
            <AssetItem key={a.title} a={a} />
          ))}
        </ul>
      </div>
    </main>
  );
}
