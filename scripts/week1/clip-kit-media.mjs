// Other-media batch (owner 2026-08-31, Aurelia): quote/comparison cards that FOLD
// IN the validated competitor strategies (MyHeritage LiveMemory photo-to-video,
// Remento voice/QR, restoration-reveal short-form) into our differentiators.
// Landing-canon (Fraunces + cream/ink/ember). Output: socials-kit/clips/work/media/.
import puppeteer from "puppeteer";
import fs from "fs";
const OUT = "C:/Users/nelis/memory-palace/socials-kit/clips/work/media";
fs.mkdirSync(OUT, { recursive: true });
const CREAM="#FBF7F0", INK="#241C15", SOFT="#6B5F52", EMBER="#B85C38", GOLD="#C9A44C", LINE="#E4D8C6";
const HEAD=`<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300&family=Marcellus&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box;}body{margin:0;}.fr{font-family:Fraunces,serif;}.it{font-style:italic;}.mc{font-family:Marcellus,serif;letter-spacing:.32em;text-transform:uppercase;}</style>`;
// 4:5 (1080x1350) card canvas
const card = (inner, bg=CREAM) => `<div style="width:1080px;height:1350px;background:${bg};position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 110px;">
  <div style="position:absolute;inset:40px;border:1px solid ${LINE};"></div>${inner}
  <div class="mc" style="position:absolute;bottom:70px;left:0;right:0;text-align:center;font-size:20px;color:${SOFT};">The Memory Palace &nbsp;·&nbsp; thememorypalace.ai</div>
</div>`;
const quote = (kicker, big, sub) => card(`
  <div class="mc" style="font-size:22px;color:${EMBER};margin-bottom:40px;">${kicker}</div>
  <div class="fr" style="font-size:78px;line-height:1.18;color:${INK};text-align:center;font-weight:300;">${big}</div>
  <div class="fr it" style="font-size:34px;line-height:1.4;color:${SOFT};text-align:center;margin-top:40px;max-width:820px;">${sub}</div>`);
// split "them vs us" comparison card
const compare = (leftK, leftT, rightK, rightT) => card(`
  <div style="display:flex;width:100%;align-items:stretch;">
    <div style="flex:1;padding:0 40px 0 0;text-align:right;">
      <div class="mc" style="font-size:19px;color:${SOFT};">${leftK}</div>
      <div class="fr" style="font-size:52px;line-height:1.25;color:${SOFT};margin-top:22px;font-weight:300;">${leftT}</div>
    </div>
    <div style="width:1px;background:${LINE};"></div>
    <div style="flex:1;padding:0 0 0 40px;text-align:left;">
      <div class="mc" style="font-size:19px;color:${EMBER};">${rightK}</div>
      <div class="fr" style="font-size:52px;line-height:1.25;color:${INK};margin-top:22px;font-weight:300;">${rightT}</div>
    </div>
  </div>`);

const CARDS = [
  // folds StoryWorth (book you shelve) vs our place you walk
  ["mf-compare-book-palace.png", compare("A memoir book","Mailed.<br>Shelved.<br>Read once.","A memory palace","Named.<br>Hung.<br>Walked &mdash; again.")],
  // folds the "photo-to-video / bring it to life" trend, disclosure-safe (Intel watch item)
  ["mf-quote-comes-alive.png", quote("Bring it to life","A photo doesn&rsquo;t come alive by&nbsp;moving.","It comes alive by being <b>named</b>, <b>hung</b>, and&nbsp;visited.")],
  // folds Remento voice/QR -> our AI-interview kept in the room
  ["mf-quote-their-words.png", quote("Their own words","The story, in the voice you&nbsp;remember.","Kept in the room &mdash; not folded into a&nbsp;drawer.")],
  // folds restoration-reveal trend + our bridge
  ["mf-quote-restore-wall.png", quote("Restore & hang","Restoring the photo was the easy&nbsp;part.","Then it got a wall &mdash; and a&nbsp;plaque.")],
  // core USP differentiator
  ["mf-quote-story-beside.png", quote("Every photo keeps its story","A photo without its story is just&nbsp;pixels.","Here, the story hangs right beside&nbsp;it.")],
];

const b = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
for (const [name, body] of CARDS) {
  const p = await b.newPage();
  await p.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
  await p.setContent(`<!doctype html><html><head>${HEAD}</head><body>${body}</body></html>`, { waitUntil: "networkidle0" });
  await p.evaluateHandle("document.fonts.ready");
  await new Promise((r)=>setTimeout(r,220));
  await p.screenshot({ path: `${OUT}/${name}`, clip: { x:0, y:0, width:1080, height:1350 } });
  await p.close();
  console.log("card:", name);
}
await b.close();
