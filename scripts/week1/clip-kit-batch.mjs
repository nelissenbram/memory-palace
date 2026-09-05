// Batch card kit for the 40-push wave: hook + USP-caption cards for 14 new clips.
// Same brand system (Fraunces italic + ink-pill). Output: socials-kit/clips/src/ as bat-<CODE>-hook/cap.png
import puppeteer from "puppeteer";
const SRC = "C:/Users/nelis/memory-palace/socials-kit/clips/src";
const CREAM = "#FCFAF5", INK = "#1B1613";
const HEAD = `<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;font-variation-settings:"opsz" 144;}</style>`;
const hook = (html, size = 80) => `<div style="width:1080px;height:1920px;background:${INK};display:flex;align-items:center;justify-content:center;"><div class="claim" style="font-size:${size}px;line-height:1.3;color:${CREAM};text-align:center;max-width:880px;">${html}</div></div>`;
const caption = (html, size = 60) => `<div style="width:1080px;height:1920px;position:relative;"><div style="position:absolute;left:80px;right:80px;bottom:330px;display:flex;justify-content:center;"><div class="claim" style="font-size:${size}px;line-height:1.32;color:${CREAM};text-align:center;background:rgba(24,19,15,.58);padding:20px 44px;border-radius:24px;text-shadow:0 3px 26px rgba(0,0,0,.65);">${html}</div></div></div>`;

// [code, hookText, capText]
const CLIPS = [
  ["GRAVE-04b", "What makes a photo<br>worth keeping?", "a name, a year, the&nbsp;story."],
  ["GRAVE-06a", "She owned 200 photos.<br>She could name every&nbsp;one.", "fewer photos. every one&nbsp;named."],
  ["NATIVE-01a", "Imagine walking to a memory<br>instead of scrolling for&nbsp;it.", "a place you walk, not a feed you&nbsp;scroll."],
  ["WONDER-01a", "What would 40 years of<br>photos look like as a&nbsp;house?", "a house you can walk&nbsp;through."],
  ["RESTORE-02a", "Five photos.<br>All almost&nbsp;gone.", "restored &mdash; then given a&nbsp;wall."],
  ["RESTORE-10a", "Someone kept this photo<br>for 60&nbsp;years.", "kept that carefully? give it a&nbsp;wall."],
  ["LEGACY-01a", "The one question you<br>never asked your&nbsp;mother.", "it asks. the answer hangs&nbsp;here."],
  ["LEGACY-03a", "It asks your parents the<br>questions you forget&nbsp;to.", "the interview, kept&nbsp;forever."],
  ["PARENT-01a", "I made a WhatsApp bot<br>for our family&nbsp;photos.", "text it in. it hangs&nbsp;forever."],
  ["PARENT-06a", "POV: it's 2044 and your kid<br>asks who they&nbsp;were.", "walk them to&nbsp;it."],
  ["LEGACY-06a", "A place your grandchildren<br>can actually&nbsp;visit.", "named, intact, theirs to&nbsp;visit."],
  ["GRAVE-10a", "Where does a memory<br>go to&nbsp;last?", "a wall. a frame. a&nbsp;name."],
  ["GRAVE-02a", "Find one photo from<br>last Tuesday.&nbsp;Go.", "or walk straight to&nbsp;it."],
  ["GRAVE-07a", "POV: you need that ONE&nbsp;photo.<br>Right&nbsp;now.", "one wall. there it&nbsp;is."],
  ["GRAVE-09a", "4,000 photos, 0&nbsp;stories.<br>That's a&nbsp;graveyard.", "subtraction is the&nbsp;feature."],
  ["NATIVE-02a", "A room for every<br>chapter of a&nbsp;life.", "walk from one to the&nbsp;next."],
  ["RESTORE-08a", "Could you name everyone<br>in this old&nbsp;photo?", "restore the face. keep the&nbsp;name."],
  ["LEGACY-05a", "Her voice,<br>in her own&nbsp;words.", "kept with the photo,&nbsp;forever."],
  ["PARENT-02a", "Tonight my mother hung a<br>photo in our&nbsp;house.", "added by&nbsp;Oma."],
  ["PARENT-03a", "Texted in<br>from three&nbsp;cities.", "hung in one place,&nbsp;forever."],
  ["LEGACY-07a", "Build it for the grandchildren<br>you haven't&nbsp;met.", "a place they can&nbsp;visit."],
  ["GRAVE-03a", "Keep three photos this&nbsp;week.<br>With the&nbsp;story.", "a smaller pile. a better&nbsp;place."],
  ["WONDER-02a", "What if a life had<br>a floor&nbsp;plan?", "a life you can&nbsp;tour."],
  ["NATIVE-05a", "Golden hour,<br>remembered.", "not a dream. a house of&nbsp;memories."],
  ["RESTORE-04a", "Bring<br>them&nbsp;back.", "restored, then given a&nbsp;wall."],
  ["PARENT-07a", "Their first&nbsp;word.<br>Kept.", "text it in. it hangs&nbsp;forever."],
];

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
async function still(name, body, transparent) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;${transparent ? "background:transparent;" : ""}">${body}</body></html>`, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: `${SRC}/${name}`, omitBackground: transparent, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.close();
}
for (const [code, h, c] of CLIPS) {
  await still(`bat-${code}-hook.png`, hook(h), false);
  await still(`bat-${code}-cap.png`, caption(c), true);
  console.log("cards:", code);
}
await browser.close();
