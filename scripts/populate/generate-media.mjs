// Generates an avatar portrait + one image per photo-memory for every persona
// via Replicate (Flux Schnell). Caches to scripts/populate/media/<username>/,
// skips files that already exist, runs with bounded concurrency.
//
// Requires REPLICATE_API_TOKEN in .env.local (or the environment).
// Usage: node scripts/populate/generate-media.mjs [--limit N] [--concurrency C]
import fs from "fs";
import path from "path";
import { loadEnv, readPersonas, memKey, personaMediaDir, pool, sleep, MEDIA_DIR } from "./lib.mjs";

loadEnv();

const TOKEN = process.env.REPLICATE_API_TOKEN;
if (!TOKEN) {
  console.error("Missing REPLICATE_API_TOKEN in .env.local");
  process.exit(1);
}

const MODEL = "black-forest-labs/flux-schnell";
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const PERSONA_LIMIT = parseInt(getArg("--limit", "0"), 10); // 0 = all
const CONCURRENCY = parseInt(getArg("--concurrency", "6"), 10);

const SAFE_SUFFIX =
  ", natural lighting, high detail, photorealistic, tasteful, no text, no watermark, no words, no logos";

async function generateOne(prompt, aspect, outPath) {
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 2000) return "cached";
  const body = {
    input: {
      prompt: prompt + SAFE_SUFFIX,
      aspect_ratio: aspect,
      output_format: "jpg",
      num_outputs: 1,
      go_fast: true,
      disable_safety_checker: false,
    },
  };
  let lastErr;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const res = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify(body),
      });
      // Rate limited: honor Retry-After, back off with jitter, retry (not a hard failure).
      if (res.status === 429) {
        const ra = parseInt(res.headers.get("retry-after") || "0", 10);
        await sleep((ra > 0 ? ra * 1000 : 2500) + attempt * 1500 + Math.random() * 1200);
        continue;
      }
      const json = await res.json();
      if (!res.ok || json.status === "failed" || json.error) {
        throw new Error(`${res.status} ${json.detail || json.error || "prediction failed"}`);
      }
      let out = json.output;
      // poll if not finished (Prefer:wait usually returns finished)
      let guard = 0;
      while ((!out || json.status === "processing" || json.status === "starting") && guard < 60) {
        await sleep(1500);
        const p = await fetch(json.urls.get, { headers: { Authorization: `Bearer ${TOKEN}` } });
        const pj = await p.json();
        if (pj.status === "failed") throw new Error(pj.error || "failed");
        out = pj.output;
        if (pj.status === "succeeded") break;
        guard++;
      }
      const url = Array.isArray(out) ? out[0] : out;
      if (!url) throw new Error("no output url");
      const img = await fetch(url);
      const buf = Buffer.from(await img.arrayBuffer());
      if (buf.length < 2000) throw new Error("tiny image");
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buf);
      return "generated";
    } catch (e) {
      lastErr = e;
      await sleep(2000 * (attempt + 1));
    }
  }
  throw lastErr;
}

function buildJobs(personas) {
  const jobs = [];
  for (const p of personas) {
    const dir = personaMediaDir(p.username);
    jobs.push({ persona: p.username, kind: "avatar", prompt: p.avatarPrompt, aspect: "1:1", out: path.join(dir, "avatar.jpg") });
    (p.wings || []).forEach((w) => {
      (w.rooms || []).forEach((room, ri) => {
        (room.memories || []).forEach((m, mi) => {
          if (m.type === "photo" && m.imagePrompt) {
            jobs.push({
              persona: p.username,
              kind: "memory",
              prompt: m.imagePrompt,
              aspect: "4:3",
              out: path.join(dir, `${memKey(w.slug, ri, mi)}.jpg`),
            });
          }
        });
      });
    });
  }
  return jobs;
}

(async () => {
  let personas = readPersonas();
  if (PERSONA_LIMIT > 0) personas = personas.slice(0, PERSONA_LIMIT);
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  const jobs = buildJobs(personas);
  console.log(`Personas: ${personas.length} | image jobs: ${jobs.length} | concurrency: ${CONCURRENCY}`);
  let done = 0, cached = 0, failed = 0;
  const results = await pool(jobs, CONCURRENCY, async (job) => {
    const r = await generateOne(job.prompt, job.aspect, job.out).catch((e) => ({ error: e.message }));
    if (r === "cached") cached++;
    else if (r === "generated") done++;
    else failed++;
    if ((done + cached + failed) % 20 === 0) console.log(`  progress ${done + cached + failed}/${jobs.length} (gen ${done}, cached ${cached}, fail ${failed})`);
    return r;
  });
  const fails = results.map((r, i) => ({ r, job: jobs[i] })).filter((x) => x.r && x.r.error);
  console.log(`DONE. generated=${done} cached=${cached} failed=${failed}`);
  if (fails.length) {
    console.log("Failures:");
    fails.slice(0, 30).forEach((f) => console.log(`  ${f.job.persona} ${path.basename(f.job.out)}: ${f.r.error}`));
  }
})();
