// Record GENUINE moving corridor footage (real 3D walk) dressed with persona
// paintings via cp params, from the onboarding walk. Headless + GPU (proven to
// render). Correct flow discovered 2026-08-31: lang Continue -> TYPE name Continue
// -> "I'll add photos later" -> "Begin the walk" -> record pooled canvas.
// Usage: dev server for THIS worktree on :3002, then node scripts/week1/record-corridor-dressed.mjs <persona>
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// Render target + output root come from scripts/marketing/kit.mjs.
// These used to be hardcoded to localhost:3000 and the JULY-OLD worktree at
// C:/Users/nelis/memory-palace/socials-kit, which is how the entire marketing
// asset library silently went stale. Override with MP_BASE / MP_KIT.
import { BASE as MP_BASE, KIT as MP_KIT, assertStagingServer } from "../marketing/kit.mjs";
await assertStagingServer();

const OUT = path.resolve("scripts/hero_rec2/corridors"); fs.mkdirSync(OUT, { recursive: true });
const persona = process.argv[2] || "giovanni-del-mare";
const manifest = JSON.parse(fs.readFileSync(`${MP_KIT}/clips/work/personas/manifest.json`, "utf8"));
const p = manifest.find((x) => x.username === persona);
const cp = p.corridor.map((c, i) => `cp${i + 1}=${encodeURIComponent(`${c.url}|${c.title}`)}`).join("&");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle","--use-angle=d3d11","--enable-gpu","--ignore-gpu-blocklist","--no-sandbox","--mute-audio","--window-size=1920,1080","--autoplay-policy=no-user-gesture-required","--disable-features=CalculateNativeWinOcclusion","--disable-backgrounding-occluded-windows","--disable-background-timer-throttling","--disable-renderer-backgrounding"] });
const page = await b.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
const cdp = await page.createCDPSession();
await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: OUT });
await page.setRequestInterception(true);
page.on("request", (r) => { if (r.url().includes("ballroom_1k.hdr")) { r.abort().catch(()=>{}); } else r.continue().catch(()=>{}); });
const text = () => page.evaluate(() => (document.body.innerText||"").replace(/\s+/g," "));
const clickText = (n) => page.evaluate((n)=>{const el=[...document.querySelectorAll("button,[role=button]")].find(e=>(e.innerText||"").toLowerCase().includes(n.toLowerCase())&&e.offsetParent!==null); if(el){el.click();return true} return false}, n);
const waitBeat = async (re, ms) => { const dl=Date.now()+ms; while(Date.now()<dl){ let t=""; try{t=await text()}catch{} if(re.test(t))return true; await sleep(300);} return false; };

await page.goto(`${MP_BASE}/flythrough?scene=onboarding&name=Guillaume&${cp}`, { waitUntil:"domcontentloaded", timeout:60000 });
await sleep(6000);
// 1) language step
await clickText("Continue"); await sleep(2000);
// 2) name step: type a name into the textbox, then Continue
await page.evaluate(() => { const i=document.querySelector('input[type="text"],input:not([type])'); if(i){ i.focus(); } });
await page.keyboard.type("Guillaume", { delay: 30 }).catch(()=>{});
await sleep(400);
await clickText("Continue"); await sleep(2000);
// 3) photo step: skip
await clickText("later"); await sleep(2500);
// 4) begin the walk
if(!(await waitBeat(/Begin the walk/i, 90000))){ console.log("NO WP1"); await b.close(); process.exit(2); }
await clickText("Begin the walk");
console.log("walk started; waiting for corridor...");
// 5) arm recorder when pooled canvas is live + corridor near; record the interior walk
await sleep(11000);
await page.evaluate(()=>{ const cs=[...document.querySelectorAll("canvas")].filter(c=>c.offsetParent!==null); const canvas=cs.sort((a,b)=>(b.width*b.height)-(a.width*a.height))[0]; const s=canvas.captureStream(30); const mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(m=>MediaRecorder.isTypeSupported(m)); const rec=new MediaRecorder(s,{mimeType:mime,videoBitsPerSecond:9000000}); const ch=[]; rec.ondataavailable=e=>{if(e.data.size)ch.push(e.data)}; rec.onstop=()=>{const bl=new Blob(ch,{type:"video/webm"});const a=document.createElement("a");a.href=URL.createObjectURL(bl);a.download="cor-live.webm";document.body.appendChild(a);a.click();a.remove()}; window.__rec=rec; rec.start(400); });
console.log("recording 20s...");
await sleep(20000);
await page.evaluate(()=>{try{window.__rec.stop()}catch{}});
const dl=Date.now()+25000; while(Date.now()<dl){ if(fs.existsSync(path.join(OUT,"cor-live.webm")))break; await sleep(500); }
const ok=fs.existsSync(path.join(OUT,"cor-live.webm"));
if(ok){ fs.renameSync(path.join(OUT,"cor-live.webm"), path.join(OUT,`cor-live-${persona}.webm`)); console.log("SAVED", `cor-live-${persona}.webm`, (fs.statSync(path.join(OUT,`cor-live-${persona}.webm`)).size/1e6).toFixed(1)+"MB"); }
else console.log("MISSING");
await b.close(); process.exit(ok?0:2);
