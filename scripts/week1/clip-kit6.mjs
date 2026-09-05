// Clip-kit round 6 — AI-interview USP beat (owner 2026-08-26): phone frame
// with the landing interview shot (shot-5) + gold margin note, as a static
// PNG for the LEGACY-02 "ask them" beat.
import puppeteer from "puppeteer";
import sharp from "sharp";
import fs from "fs";

const SRC = "C:/Users/nelis/memory-palace/socials-kit/clips/src";
const SHOTS_DIR = "C:/Users/nelis/memory-palace-staging/public/landing/shots";
const CREAM = "#FCFAF5", INK = "#1B1613", GOLD = "#D4AF37";
const HEAD = `
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300;1,9..144,400&family=Marcellus&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box;}
.claim{font-family:Fraunces,serif;font-style:italic;font-weight:300;font-variation-settings:"opsz" 144;}
</style>`;

const SCREEN_W = 640, SCREEN_H = Math.round((640 * 1446) / 820);
const buf = await sharp(`${SHOTS_DIR}/shot-5.webp`).resize(SCREEN_W, SCREEN_H).jpeg({ quality: 88 }).toBuffer();
const SLIDE = `data:image/jpeg;base64,${buf.toString("base64")}`;

const body = `
  <div style="width:1080px;height:1920px;background:${INK};position:relative;">
    <div style="position:absolute;left:50%;top:220px;transform:translateX(-50%);width:${SCREEN_W + 40}px;height:${SCREEN_H + 40}px;background:#0d0b09;border-radius:70px;box-shadow:0 40px 120px rgba(0,0,0,.6),inset 0 0 0 3px rgba(252,250,245,.14);">
      <div style="position:absolute;left:20px;top:20px;width:${SCREEN_W}px;height:${SCREEN_H}px;border-radius:52px;overflow:hidden;">
        <img src="${SLIDE}" style="width:${SCREEN_W}px;height:${SCREEN_H}px;display:block;">
      </div>
      <div style="position:absolute;left:50%;top:34px;transform:translateX(-50%);width:170px;height:32px;border-radius:16px;background:#0d0b09;"></div>
    </div>
    <div style="position:absolute;top:110px;left:105px;z-index:5;display:inline-flex;flex-direction:column;align-items:flex-start;gap:2px;transform:rotate(-4deg);">
      <span class="claim" style="font-weight:500;font-size:52px;line-height:1.12;color:${GOLD};white-space:nowrap;text-shadow:0 2px 14px rgba(0,0,0,.55);">it asks them for you</span>
      <svg width="72" height="56" viewBox="0 0 34 26" style="margin-left:44px;">
        <path d="M4 2 C 10 16, 20 20, 29 22 M23 20 l7 2 -4 -6" fill="none" stroke="${GOLD}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
      </svg>
    </div>
    <div class="claim" style="position:absolute;left:80px;right:80px;top:${220 + SCREEN_H + 40 + 70}px;font-size:56px;line-height:1.3;color:${CREAM};text-align:center;">guided interviews, in their own&nbsp;voice.</div>
  </div>`;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><head>${HEAD}</head><body style="margin:0;">${body}</body></html>`, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: `${SRC}/l2-interview.png`, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
await browser.close();
console.log("wrote l2-interview.png");
