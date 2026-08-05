/**
 * WS10-1/2/4, WS9-6 — the ONE ambient audio singleton (owner decision 5:
 * audio defaults ON, music 0.3 / footsteps 0.15). Every scene and visitor
 * loader mounts the same instance: music starts on first entry and never
 * stops across scene transitions. Autoplay denial is handled by arming a
 * one-time gesture listener — the first tap/keypress starts the score.
 *
 * Footsteps are procedural marble taps (WebAudio noise burst through a
 * bandpass) — no asset to load, no 404 to die, behind the existing
 * footstepSounds preference.
 */

const MUSIC_URL = "/audio/ambient.mp3";
const MUSIC_VOL = 0.3;
const FOOT_VOL = 0.15;
const KEY_MUSIC = "mp_ambient_on";
const KEY_FOOT = "mp_footsteps_on";

let musicEl: HTMLAudioElement | null = null;
let gestureArmed = false;

function pref(key: string): boolean {
  try {
    return window.localStorage.getItem(key) !== "0";
  } catch {
    return true;
  }
}

function setPref(key: string, on: boolean) {
  try {
    window.localStorage.setItem(key, on ? "1" : "0");
  } catch {
    // private mode — session-only preference
  }
}

export function ambientEnabled(): boolean {
  return typeof window !== "undefined" && pref(KEY_MUSIC);
}

export function footstepsEnabled(): boolean {
  return typeof window !== "undefined" && pref(KEY_FOOT);
}

export function setAmbientEnabled(on: boolean): void {
  setPref(KEY_MUSIC, on);
  if (on) tryPlay();
  else musicEl?.pause();
}

export function setFootstepsEnabled(on: boolean): void {
  setPref(KEY_FOOT, on);
}

function tryPlay() {
  if (!musicEl || !ambientEnabled()) return;
  musicEl.play().catch(() => {
    if (gestureArmed) return;
    gestureArmed = true;
    const resume = () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      gestureArmed = false;
      if (ambientEnabled()) musicEl?.play().catch(() => {});
    };
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
  });
}

/**
 * Mount the shared score. Call from every scene/loader mount — idempotent,
 * and deliberately NOT stopped on unmount so the music carries across scene
 * transitions ("plays from first entry and never stops").
 */
export function mountAmbientMusic(): void {
  if (typeof window === "undefined") return;
  if (!musicEl) {
    musicEl = new Audio(MUSIC_URL);
    musicEl.loop = true;
    musicEl.volume = MUSIC_VOL;
    musicEl.preload = "auto";
  }
  tryPlay();
}

let ac: AudioContext | null = null;
let lastStep = 0;

/** One procedural marble footstep, cadence-capped. Call from walk integrators while moving. */
export function playFootstep(): void {
  if (typeof window === "undefined" || !footstepsEnabled()) return;
  const now = performance.now();
  if (now - lastStep < 340) return;
  lastStep = now;
  try {
    type AC = typeof AudioContext;
    const Ctor: AC | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
    if (!Ctor) return;
    ac = ac || new Ctor();
    if (ac.state === "suspended") ac.resume().catch(() => {});
    const t = ac.currentTime;
    const dur = 0.09;
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.9 + Math.random() * 0.25;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1400 + Math.random() * 500;
    bp.Q.value = 1.2;
    const g = ac.createGain();
    g.gain.setValueAtTime(FOOT_VOL, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(ac.destination);
    src.start(t);
  } catch {
    // WebAudio unavailable — footsteps silently absent
  }
}
