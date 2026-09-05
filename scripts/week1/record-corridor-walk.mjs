// Record the dev-only scripted corridor WALK (?walk=1|left|right) dressed with a
// persona's cp paintings. Reliable: no onboarding nav, headless renders fine.
// Usage: dev server :3000, then node scripts/week1/record-corridor-walk.mjs <persona> [dir]
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
const OUT = path.resolve("scripts/hero_rec2/corridors"); fs.mkdirSync(OUT, { recursive: true });
const persona = process.argv[2] || "giovanni-del-mare";
const dir = process.argv[3] || "1";
const wing = process.argv[4] || "roots";
const manifest = JSON.parse(fs.readFileSync("C:/Users/nelis/memory-palace/socials-kit/clips/work/personas/manifest.json", "utf8"));
const p = manifest.find((x) => x.username === persona);
const cp = p.corridor.map((c, i) => `cp${i + 1}=${encodeURIComponent(`${c.url}|${c.title}`)}`).join("&");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle","--use-angle=d3d11","--enable-gpu","--ignore-gpu-blocklist","--no-sandbox","--mute-audio","--window-size=1200,2000","--disable-features=CalculateNativeWinOcclusion","--disable-backgrounding-occluded-windows","--disable-background-timer-throttling","--disable-renderer-backgrounding"] });
const page = await b.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
const cdp = await page.createCDPSession();
await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: OUT });
await page.setRequestInterception(true);
page.on("request", (r) => { if (r.url().includes("ballroom_1k.hdr")) { r.abort().catch(()=>{}); } else r.continue().catch(()=>{}); });
await page.goto(`http://localhost:3000/flythrough?scene=corridor&walk=${dir}&wing=${wing}&${cp}`, { waitUntil:"networkidle2", timeout:60000 });
// wait out the assemble-before-reveal veil
await sleep(13000);
// reset the walk so it starts on-camera, then record one full walk (13s)
await page.evaluate(()=>{ window.__walkReset = true; const cs=[...document.querySelectorAll("canvas")].filter(c=>c.offsetParent!==null); const canvas=cs.sort((a,b)=>(b.width*b.height)-(a.width*a.height))[0]; const s=canvas.captureStream(30); const mime=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(m=>MediaRecorder.isTypeSupported(m)); const rec=new MediaRecorder(s,{mimeType:mime,videoBitsPerSecond:9000000}); const ch=[]; rec.ondataavailable=e=>{if(e.data.size)ch.push(e.data)}; rec.onstop=()=>{const bl=new Blob(ch,{type:"video/webm"});const a=document.createElement("a");a.href=URL.createObjectURL(bl);a.download="cor-walk.webm";document.body.appendChild(a);a.click();a.remove()}; window.__rec=rec; rec.start(400); });
console.log("recording walk 13.5s...");
await sleep(13500);
await page.evaluate(()=>{try{window.__rec.stop()}catch{}});
const dl=Date.now()+25000; while(Date.now()<dl){ if(fs.existsSync(path.join(OUT,"cor-walk.webm")))break; await sleep(500); }
const ok=fs.existsSync(path.join(OUT,"cor-walk.webm"));
if(ok){ const nm=`cor-walk-${wing}-${persona}-${dir}.webm`; fs.renameSync(path.join(OUT,"cor-walk.webm"), path.join(OUT,nm)); console.log("SAVED", nm, (fs.statSync(path.join(OUT,nm)).size/1e6).toFixed(1)+"MB"); }
else console.log("MISSING");
await b.close(); process.exit(ok?0:2);
