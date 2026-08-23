// Headless E2E walk of /flythrough?scene=onboarding — logs phase transitions,
// clicks through decision points, screenshots each beat. Verification-only.
import puppeteer from "puppeteer";
import fs from "fs";

const OUT = "scripts/ob_e2e_out";
fs.mkdirSync(OUT, { recursive: true });
const log = (m) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);
const t0 = Date.now();

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--mute-audio", "--use-gl=angle", "--use-angle=swiftshader", "--window-size=1280,800", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("console", (msg) => { const t = msg.text(); if (/error|Error|warn.*onb|watchdog/i.test(t) && !/Download the React DevTools|Texture marked/.test(t)) console.log("  [console]", t.slice(0, 160)); });
page.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 200)));

await page.goto("http://localhost:3000/flythrough?scene=onboarding", { waitUntil: "domcontentloaded", timeout: 60000 });
log("page loaded");

const text = () => page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "));
const clickByText = async (needle) => {
  try {
  return await page.evaluate((n) => {
    const els = [...document.querySelectorAll("button, [role=button]")];
    const el = els.find((e) => (e.innerText || "").toLowerCase().includes(n.toLowerCase()) && e.offsetParent !== null);
    if (el) { el.click(); return true; }
    return false;
  }, needle);
  } catch { return false; }
};
let lastSig = "", shots = 0;
const snap = async (tag) => { shots++; await page.screenshot({ path: `${OUT}/${String(shots).padStart(2, "0")}_${tag}.png` }).catch(() => {}); };

const seen = new Set();
const deadline = Date.now() + 8 * 60 * 1000;
let done = false;
while (Date.now() < deadline && !done) {
  let t;
  try { t = await text(); } catch (e) { log("transient eval error: " + String(e).slice(0, 80)); await new Promise((r) => setTimeout(r, 2500)); continue; }
  const sig = t.slice(0, 300);
  if (sig !== lastSig) { lastSig = sig; log("TEXT: " + t.slice(0, 220)); }

  const mark = async (key, tag) => { if (!seen.has(key)) { seen.add(key); log(`>>> BEAT: ${tag}`); await snap(tag); return true; } return false; };

  if (/Skip intro/i.test(t)) { await mark("video", "video_intro"); }
  else if (/language|taal|English/i.test(t) && /text size|tekstgrootte|Standard/i.test(t)) {
    await mark("lang", "card_lang");
    // verify EN preselected then click Nederlands to test live-switch, then back to English, continue
    if (!seen.has("langswitch")) {
      seen.add("langswitch");
      await clickByText("Nederlands"); await new Promise((r) => setTimeout(r, 1200));
      const nl = await text(); log("after NL click: " + nl.slice(0, 140));
      await snap("card_lang_nl");
      await clickByText("English"); await new Promise((r) => setTimeout(r, 800));
    }
    if (await clickByText("Continue") || await clickByText("Doorgaan") || await clickByText("Next")) log("clicked continue on lang card");
  }
  else if (/name|naam/i.test(t) && (/palace/i.test(t)) && !seen.has("cinematic") && seen.has("lang")) {
    await mark("name", "card_name");
    await page.evaluate(() => { const i = document.querySelector("input"); if (i) { i.focus(); } });
    await page.keyboard.type("Bram", { delay: 30 });
    await new Promise((r) => setTimeout(r, 400));
    if (await clickByText("Continue") || await clickByText("Doorgaan")) log("clicked continue on name card");
  }
  else if (/Begin the walk|Begin de wandeling|Shall we walk/i.test(t)) { await mark("cineprompt", "exterior_prompt"); await new Promise((r) => setTimeout(r, 800)); if (await clickByText("Begin the walk") || await clickByText("Begin")) log("clicked Begin the walk"); }
  else if (/Enter The Room|Ga de kamer/i.test(t)) { await mark("corridor6", "corridor_prompt"); await new Promise((r) => setTimeout(r, 500)); await clickByText("Enter The Room"); log("clicked Enter The Room"); }
  else if (/Click on the empty painting|Add a Memory/i.test(t) && !seen.has("room9")) {
    await mark("room9", "room_hang_prompt");
    await new Promise((r) => setTimeout(r, 500));
    if (await clickByText("Add a Memory")) log("clicked Add a Memory");
  }
  else if (/Drop phot|Drop your phot/i.test(t) && !seen.has("upload")) {
    await mark("upload", "importhub");
    await new Promise((r) => setTimeout(r, 800));
    const fi = await page.$("input[type=file]");
    if (fi) { await fi.uploadFile("public/video/hero-ob-poster.jpg"); log("uploaded test photo"); await new Promise((r) => setTimeout(r, 2500)); await snap("importhub_file");
      if (await clickByText("Import") || await clickByText("Add") || await clickByText("Save") || await clickByText("Continue")) log("clicked import confirm");
    } else { if (await clickByText("Continue without") || await clickByText("without a photo")) log("no file input — clicked skip"); }
  }
  else if (/Unlock 25 GB|Start.*trial|Free plan|Keeper/i.test(t) && !seen.has("paywall")) { await mark("paywall", "paywall"); await new Promise((r) => setTimeout(r, 800)); if (await clickByText("Free plan") || await clickByText("Continue with Free") || await clickByText("Free")) log("clicked paywall free"); }
  else if (/Replay|Opnieuw/i.test(t) && seen.has("paywall")) { await mark("end", "end_card"); done = true; }
  else if (/Congratulations|Gefeliciteerd|palace is ready|Well done/i.test(t)) { await mark("celebration", "celebration"); await new Promise((r) => setTimeout(r, 1500)); await snap("celebration_confetti"); if (await clickByText("Select your plan") || await clickByText("Enter your Palace") || await clickByText("Continue")) log("clicked celebration CTA"); }
  else if (/trial|Free plan|Keeper|per month|plan/i.test(t) && seen.has("celebration")) { await mark("paywall", "paywall"); if (await clickByText("Free") || await clickByText("Continue")) log("clicked paywall continue"); }
  else if (/Replay|Opnieuw/i.test(t) && seen.has("celebration")) { await mark("end", "end_card"); done = true; }

  // beats without buttons: exterior flyover / hall / corridor walk / room walk — detect via captions
  if (/This is your Memory Palace/i.test(t)) await mark("capExt", "cap_exterior");
  if (/Through the entrance/i.test(t)) await mark("capHall", "cap_hall");
  if (/Roots Wing|Every Wing has Rooms/i.test(t)) await mark("capCorr", "cap_corridor");
  if (/Me, Over Time/i.test(t) && !seen.has("capRoomTitle")) await mark("capRoomTitle", "cap_room_title");

  await new Promise((r) => setTimeout(r, 1500));
}
log(`RUN ${done ? "COMPLETE" : "TIMED OUT"} — beats seen: ${[...seen].join(", ")}`);
await snap("final");
await browser.close();
process.exit(done ? 0 : 2);
