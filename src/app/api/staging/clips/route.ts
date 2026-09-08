import { createReadStream, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { NextResponse } from "next/server";
import type { ReadableOptions } from "node:stream";

/**
 * Dev-only backing route for /staging/clips.
 *
 * The finished clips live in socials-kit/clips-v2, which is gitignored and sits
 * outside public/, so the viewer cannot link them directly. With no query this
 * returns the manifest; with ?file= it streams one clip.
 *
 * Range requests are honoured because without them a <video> element cannot
 * seek: Chrome asks for bytes=0- and then refuses to scrub a response that came
 * back 200 instead of 206. These are 4-44 MB files people will want to scrub.
 */
export const dynamic = "force-dynamic";

const DIR = resolve(process.cwd(), "socials-kit/clips-v2");

function nodeToWeb(stream: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      stream.on("data", (c) => controller.enqueue(new Uint8Array(c as Buffer)));
      stream.on("end", () => controller.close());
      stream.on("error", (e) => controller.error(e));
    },
    cancel() { (stream as unknown as { destroy(): void }).destroy(); },
  });
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = new URL(req.url).searchParams.get("file");
  if (file) {
    if (!/^[A-Za-z0-9._-]+\.mp4$/.test(file)) return new NextResponse("Bad name", { status: 400 });
    const path = resolve(DIR, file);
    let size: number;
    try { size = statSync(path).size; } catch { return new NextResponse("Not found", { status: 404 }); }

    const range = req.headers.get("range");
    const opts: ReadableOptions & { start?: number; end?: number } = {};
    let status = 200;
    const headers: Record<string, string> = {
      "content-type": "video/mp4",
      "accept-ranges": "bytes",
      "cache-control": "no-store",
    };
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? Number(m[1]) : 0;
      const end = m && m[2] ? Number(m[2]) : size - 1;
      opts.start = start; opts.end = end;
      status = 206;
      headers["content-range"] = `bytes ${start}-${end}/${size}`;
      headers["content-length"] = String(end - start + 1);
    } else {
      headers["content-length"] = String(size);
    }
    return new NextResponse(nodeToWeb(createReadStream(path, opts)), { status, headers });
  }

  let files: string[] = [];
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith(".mp4")).sort();
  } catch {
    return NextResponse.json({ dir: DIR, clips: [], error: "clips dir not found" });
  }

  const clips = files.map((f) => {
    const st = statSync(resolve(DIR, f));
    // WONDER-04-zero-folders-9x16.mp4 -> code + slug
    const m = /^([A-Z]+-\d+[a-z]?)-(.+)-9x16\.mp4$/.exec(f);
    return {
      file: f,
      code: m ? m[1] : f.replace(/\.mp4$/, ""),
      family: m ? m[1].split("-")[0] : "",
      slug: m ? m[2].replace(/-/g, " ") : "",
      mb: +(st.size / 1048576).toFixed(1),
      built: st.mtime.toISOString(),
    };
  });
  // Sort by concept number, so 01a..10 reads in catalogue order rather than
  // the alphabetical order readdir returns.
  clips.sort((a, b) => {
    const n = (c: string) => Number((/\d+/.exec(c) || ["0"])[0]);
    return a.family.localeCompare(b.family) || n(a.code) - n(b.code);
  });

  return NextResponse.json({ dir: DIR, clips });
}
