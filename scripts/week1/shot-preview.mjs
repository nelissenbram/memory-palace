import puppeteer from "puppeteer";
const b = await puppeteer.launch({ headless: "new", args:["--no-sandbox","--allow-file-access-from-files"] });
const p = await b.newPage();
await p.setViewport({ width: 720, height: 1400, deviceScaleFactor: 1 });
await p.goto("file:///C:/Users/nelis/memory-palace/socials-kit/autonomy/runs/2026-08-29/_preview.html", { waitUntil:"networkidle0" });
await p.screenshot({ path: process.env.TEMP + "/report-preview.png", fullPage: true });
await b.close(); console.log("ok");
