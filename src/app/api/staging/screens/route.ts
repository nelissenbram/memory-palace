import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { NextResponse } from "next/server";

/**
 * Dev-only backing route for /staging/screens.
 *
 * The app-screen library lives in socials-kit/screens, OUTSIDE public/, so the
 * viewer cannot link the PNGs directly. This serves them (?file=id.png) and,
 * with no query, returns a manifest.
 *
 * The manifest carries an md5 per file because the library silently grew
 * duplicates: build-screen-library's escape ladder did not know the onboarding
 * modal's "I'll add photos later" button, so several routes were photographed
 * with that modal still covering them and came out byte-identical. Nothing in
 * the pipeline noticed — the files existed, had plausible names and fresh
 * timestamps. Hashing is the cheap check that would have caught it.
 */
export const dynamic = "force-dynamic";

const DIR = resolve(process.cwd(), "socials-kit/screens");

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = new URL(req.url).searchParams.get("file");
  if (file) {
    // Basename only — never let a query param walk out of the directory.
    if (!/^[a-z0-9-]+\.png$/i.test(file)) {
      return new NextResponse("Bad name", { status: 400 });
    }
    try {
      return new NextResponse(new Uint8Array(readFileSync(resolve(DIR, file))), {
        headers: { "content-type": "image/png", "cache-control": "no-store" },
      });
    } catch {
      return new NextResponse("Not found", { status: 404 });
    }
  }

  let tags: Record<string, string[]> = {};
  try {
    const man = JSON.parse(readFileSync(resolve(DIR, "screens.json"), "utf8"));
    tags = Object.fromEntries(man.map((m: { id: string; usp: string[] }) => [m.id, m.usp]));
  } catch { /* manifest is optional — the directory is the source of truth */ }

  let files: string[] = [];
  try {
    files = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".png")).sort();
  } catch {
    return NextResponse.json({ dir: DIR, screens: [], error: "screens dir not found" });
  }

  const screens = files.map((f) => {
    const buf = readFileSync(resolve(DIR, f));
    return {
      id: f.replace(/\.png$/i, ""),
      file: f,
      md5: createHash("md5").update(buf).digest("hex"),
      bytes: buf.length,
      captured: statSync(resolve(DIR, f)).mtime.toISOString(),
      usp: tags[f.replace(/\.png$/i, "")] || [],
    };
  });

  // Group by hash so the viewer can call out "same picture, two names".
  const byHash = new Map<string, string[]>();
  for (const s of screens) byHash.set(s.md5, [...(byHash.get(s.md5) || []), s.id]);

  return NextResponse.json({
    dir: DIR,
    screens: screens.map((s) => ({
      ...s,
      dupeWith: (byHash.get(s.md5) || []).filter((id) => id !== s.id),
    })),
  });
}
