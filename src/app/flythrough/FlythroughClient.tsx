"use client";

import { useState, useRef, useCallback, useEffect, type CSSProperties } from "react";
import Toast, { type ToastData } from "@/components/ui/Toast";
import dynamic from "next/dynamic";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { WINGS, WING_ROOMS } from "@/lib/constants/wings";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation, useLocaleTranslation } from "@/lib/hooks/useTranslation";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { T } from "@/lib/theme";
// The wizard's REAL walkthrough caption system (overline/gold title/caption +
// prompt children) — reused verbatim so the viewer's captions read exactly like
// the real flow's.
import WalkCinematicCaption, { WalkCtaButton } from "@/components/ui/OnboardingWalkCaption";

// Lazy-load scene components to avoid SSR issues with Three.js
const ExteriorScene = dynamic(() => import("@/components/3d/ExteriorScene"), { ssr: false });
const EntranceHallScene = dynamic(() => import("@/components/3d/EntranceHallScene"), { ssr: false });
const CorridorScene = dynamic(() => import("@/components/3d/CorridorScene"), { ssr: false });
const InteriorScene = dynamic(() => import("@/components/3d/InteriorScene"), { ssr: false });
// The room's media manager (The Steward's Ledger) — mounted in the viewer so the
// owner can review the 3D room AND its media functionality in one login-free link.
const RoomStewardLedger = dynamic(() => import("@/components/ui/RoomStewardLedger"), { ssr: false });
// The REAL Library click-a-media flow (owner): clicking a media item opens
// RoomMediaPlayer — the true full-screen viewer with options captured below and
// built-in prev/next — and its Edit/chips step into MemoryDetail, exactly as in
// the Library menu.
const RoomMediaPlayerView = dynamic(() => import("@/components/ui/RoomMediaPlayer"), { ssr: false });
const MemoryDetail = dynamic(() => import("@/components/ui/MemoryDetail"), { ssr: false });
// The room's AV transport, standalone — the player must work OUTSIDE the media
// menu too (stand before the gramophone/screen and play).
const PlayerCard = dynamic(() => import("@/components/ui/RoomStewardLedger").then((m) => m.PlayerCard), { ssr: false });
// ── Onboarding preview (scene 4) — full walkthrough replay ──
// Login-free preview of the ENTIRE rebuilt onboarding (mirrors OnboardingWizard
// PHASE_ORDER: video_intro → lang_a11y → name → cinematic → hall blink-walk →
// corridor steps → room walk → upload → celebration → paywall → end card).
// Mounts the REAL OnboardingSceneHost / WalkCinematicCaption / ImportHub /
// OnboardingCelebration (all unchanged) with local demo state only; NEVER
// writes any onboarding/locale/a11y localStorage key. Lives behind the same
// prod-404 gate in flythrough/page.tsx (contract 4 — untouched).
const OnboardingSceneHost = dynamic(() => import("@/components/ui/OnboardingSceneHost"), { ssr: false });
const CinematicSkipChip = dynamic(() => import("@/components/ui/CinematicPromptOverlay").then((m) => m.CinematicSkipChip), { ssr: false });
const ImportHub = dynamic(() => import("@/components/ui/ImportHub"), { ssr: false });
const OnboardingCelebration = dynamic(() => import("@/components/ui/OnboardingCelebration"), { ssr: false });

// Sample memories for the room scene. A photo-RICH set (viewer-only) so the
// "Deepening Cabinet" display walls actually fill — the room auto-sizes to its
// tier from the wall-photo count and hangs a salon wall of paintings + one video.
const _DEMO_PHOTOS = ["/demo/graduation.jpg", "/demo/quiet-morning.jpg", "/demo/between-two-hands.jpg", "/demo/edge-of-water.jpg", "/demo/pexels-alexander-mass-748453803-28107011.jpg"];
const _dm = (i: number, extra: Partial<Mem>): Mem => ({
  id: `demo-${extra.type || "photo"}-${i}`, title: `Memory ${i + 1}`, hue: 24 + (i * 29) % 60, s: 42, l: 58,
  type: "photo", dataUrl: _DEMO_PHOTOS[i % _DEMO_PHOTOS.length], displayed: true,
  createdAt: `2026-${String(1 + (i % 9)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`, ...extra,
} as Mem);
const SAMPLE_MEMORIES: Mem[] = [
  // 14 wall photos (→ Hall tier — mid-size, so the max/min viewers visibly differ),
  // plus objects, documents, audio + one video so every station populates.
  ...Array.from({ length: 14 }, (_, i) => _dm(i, {})),
  ...Array.from({ length: 4 }, (_, i) => _dm(100 + i, { type: "photo", displayUnit: "vitrine", title: `Keepsake ${i + 1}` })),
  ...Array.from({ length: 3 }, (_, i) => _dm(200 + i, { type: "text", displayUnit: "bookshelf", title: `Letter ${i + 1}` })),
  _dm(300, { type: "audio", dataUrl: "/video/demo/song-of-summer.mp3", displayUnit: "vinyl", title: "Song of Summer" }),
  _dm(400, { type: "video", dataUrl: "/video/demo/piano-recital.mp4", displayUnit: "screen", title: "Piano Recital" }),
];

// ── Scalability review viewers (?scene=room&fill=max | min) ──
// MAX: the room grown to its top tier — ~100 wall paintings (packed to the
// texture budget, the rest reported as "…N more in the archive"), a fully-filled
// L-vitrine, several bookcase documents, and audio + video on the player medium.
const SAMPLE_MEMORIES_MAX: Mem[] = [
  ...Array.from({ length: 100 }, (_, i) => _dm(i, {})),
  ...Array.from({ length: 14 }, (_, i) => _dm(1000 + i, { type: "photo", displayUnit: "vitrine", title: `Keepsake ${i + 1}` })),
  ...Array.from({ length: 6 }, (_, i) => _dm(2000 + i, { type: "text", displayUnit: "bookshelf", title: `Letter ${i + 1}` })),
  _dm(3000, { type: "audio", dataUrl: "/video/demo/song-of-summer.mp3", displayUnit: "vinyl", title: "Song of Summer" }),
  _dm(4000, { type: "video", dataUrl: "/video/demo/piano-recital.mp4", displayUnit: "screen", title: "Piano Recital" }),
];
// MIN: the smallest tier — one painting on the wall, one photo in the vitrine.
const SAMPLE_MEMORIES_MIN: Mem[] = [
  _dm(0, {}),
  _dm(1, { type: "photo", displayUnit: "vitrine", title: "Keepsake" }),
];
function fillFromURL(): "max" | "min" | "default" {
  if (typeof window === "undefined") return "default";
  const q = new URLSearchParams(window.location.search).get("fill");
  return q === "max" ? "max" : q === "min" ? "min" : "default";
}

// ── ?name=Guillaume (dev-tool-only; the prod-404 gate in page.tsx covers it) ──
// Personalizes every name-bearing baked surface the viewer scenes expose —
// the exterior tympanum engraving and the room's mantel plaque ("{name}'s
// Beautiful Smile") — so a recording pass can be made for a specific owner.
// Hall and corridor have no name surfaces (the hall bust + plaque concept was
// removed under W3H, owner 2026-08-13). Also prefills the onboarding
// preview's name card (scene 4), which threads the same name to the host's
// demoUserName. 40-char cap mirrors the name card's maxLength.
function nameFromURL(): string {
  if (typeof window === "undefined") return "";
  return (new URLSearchParams(window.location.search).get("name") || "").trim().slice(0, 40);
}

// ── ?mantelDemo=1 (dev-tool-only, owner 2026-08-23 tour item 5) ──
// Recording-pass helper for the ONBOARDING preview (scene 4): hangs the demo
// hero photo in the mantel's walnut+bronze frame from the START of the room
// walk leg, so the tour footage shows a filled hero picture over the plaque
// instead of the empty upload placeholder. Uses the existing celebration
// payoff path (uploadedMemory → InteriorScene's in-place mantel swap) — no
// scene-code changes. Param absent ⇒ null ⇒ byte-identical empty-mantel
// onboarding (the real wizard never passes this).
function mantelDemoFromURL(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mantelDemo") === "1";
}
const MANTEL_DEMO_MEM: Mem = {
  id: "demo-mantel-hero", title: "A Beautiful Smile", hue: 40, s: 40, l: 60,
  type: "photo", dataUrl: "/demo/graduation.jpg", displayed: true, createdAt: "2026-08-23",
} as Mem;

// A second demo room so the Ledger's "From another room" flow can be reviewed.
const OTHER_ROOM_FEED = [{
  id: "ro2", name: "Sunday Lunches",
  mems: [
    _dm(9001, { title: "Nonna's table" }),
    _dm(9002, { title: "The garden in June" }),
    _dm(9003, { title: "Uncle's toast", type: "audio", dataUrl: "/video/demo/song-of-summer.mp3", displayUnit: "vinyl" }),
  ],
}];

// Demo photos for the entrance-hall door lunettes (viewer-only feel check —
// the real app hangs each wing's newest photo here).
const DEMO_LUNETTES: Record<string, Mem> = Object.fromEntries(
  ([
    ["roots", "/demo/graduation.jpg", "Graduation"],
    ["nest", "/demo/quiet-morning.jpg", "Quiet Morning"],
    ["craft", "/demo/between-two-hands.jpg", "Between Two Hands"],
    ["travel", "/demo/edge-of-water.jpg", "Edge of Water"],
    ["passions", "/demo/pexels-alexander-mass-748453803-28107011.jpg", "Golden Hour"],
  ] as [string, string, string][]).map(([wing, url, title]) => [wing, {
    id: `demo-${wing}`, title, hue: 40, s: 40, l: 60, type: "photo",
    dataUrl: url, displayed: true, createdAt: "2026-08-13",
  } satisfies Mem])
);

// ── ?heroUrl=&heroTitle=&heroYear= + ?cp1..cp4=url|title (dev-tool-only,
// owner 2026-08-26 clip round) ── Recording helpers so tour/clip footage can
// SHOW the exact memory a story beat mentions: heroUrl hangs that photo over
// the mantel (hero:true wins the W3 Mantelpiece slot; plaque reads
// heroTitle · heroYear) and cpN swaps the corridor salon paintings. Params
// absent ⇒ byte-identical defaults (the real app never passes these).
function heroFromURL(): Mem | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const url = q.get("heroUrl");
  if (!url) return null;
  const year = q.get("heroYear") || "2026";
  return {
    id: "demo-hero-override", title: q.get("heroTitle") || "A Memory", hue: 40, s: 40, l: 60,
    type: "photo", dataUrl: url, displayed: true, hero: true, createdAt: `${year}-06-01`,
  } as Mem;
}
function corridorPaintingsFromURL(): Record<string, { url?: string; title?: string; size?: string }> | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const out: Record<string, { url?: string; title?: string }> = {};
  let any = false;
  (["ro1", "ro2", "ro3", "ro4"] as const).forEach((ro, i) => {
    const v = q.get(`cp${i + 1}`);
    if (!v) return;
    const [url, title] = v.split("|");
    out[ro] = { url, title: title || undefined };
    any = true;
  });
  return any ? out : null;
}

// A representative corridor for the viewer: rooms (→ doors + windows) + one
// hung photo per room (→ populated salon walls). Mirrors the real app shape.
const DEMO_CORRIDOR_ROOMS = [
  { id: "ro1", name: "Me, Over Time", icon: "🪞", shared: false, sharedWith: [], coverHue: 18 },
  { id: "ro2", name: "Sunday Lunches", icon: "🍝", shared: false, sharedWith: [], coverHue: 32 },
  { id: "ro3", name: "Dad's Garage", icon: "🛠", shared: false, sharedWith: [], coverHue: 42 },
  { id: "ro4", name: "School Days", icon: "🎒", shared: false, sharedWith: [], coverHue: 48 },
];
const DEMO_CORRIDOR_PAINTINGS: Record<string, { url?: string; title?: string; size?: string }> = {
  ro1: { url: "/demo/graduation.jpg", title: "Graduation" },
  ro2: { url: "/demo/quiet-morning.jpg", title: "Sunday Lunch" },
  ro3: { url: "/demo/between-two-hands.jpg", title: "The Garage" },
  ro4: { url: "/demo/edge-of-water.jpg", title: "School Days" },
};
// ?wing=roots|nest|craft|travel|passions (dev-tool, login-free /flythrough only,
// prod-404) — render OTHER wings' corridors so captured footage isn't always the
// Roots hall. Each wing has its own dimensions, accent, rug, terminus name +
// ornament (CorridorScene cfg). Uses that wing's own rooms -> correct doors.
function corridorWingFromURL(): { wingId: string; rooms: typeof DEMO_CORRIDOR_ROOMS } {
  const fallback = { wingId: "roots", rooms: DEMO_CORRIDOR_ROOMS };
  if (typeof window === "undefined") return fallback;
  const w = new URLSearchParams(window.location.search).get("wing");
  if (!w || !WINGS.some((x) => x.id === w)) return fallback;
  const rooms = (WING_ROOMS[w] || DEMO_CORRIDOR_ROOMS) as unknown as typeof DEMO_CORRIDOR_ROOMS;
  return { wingId: w, rooms };
}

// ═══ DEV TOOL — Cinematic flythrough recorder ═══
// Sequences through 4 palace scenes and records the canvas as .webm

interface SceneDef {
  name: string;
  duration: number; // ms
}

const SCENES: SceneDef[] = [
  { name: "Exterior", duration: 8000 },
  { name: "Entrance Hall", duration: 6000 },
  { name: "Corridor", duration: 5000 },
  { name: "Room", duration: 6000 },
  // Viewer-only review scene — NEVER part of the recording (see RECORD_SCENE_COUNT).
  { name: "Onboarding", duration: 0 },
];

// The cinematic recorder covers scenes 0–3 only (byte-identical to before the
// Onboarding scene was added); scene 4 is a review surface, not footage.
const RECORD_SCENE_COUNT = 4;

// Onboarding-preview phase machine — mirrors the wizard's CAPTURE-FIRST
// PHASE_ORDER (SUCCESS_PLAYBOOK wk 2) with viewer-local names: video
// (skippable intro) → card_lang (language + text size, demo-local) →
// card_name (name, demo-local) → capture (pick up to 3 photos, demo-local —
// BEFORE the walk) → loading (cream veil, fades on onReady) → hold (WP1
// approach) → paused (one-shot cinematic pause; prompt shown IN the caption,
// like the wizard) → flying (5-waypoint flyover) → hall (blink look-around) →
// corridor (steps 0-7, step-6 room prompt) → room (steps 0-9 — with captures
// the leg REVEALS the picked photos hanging and ends on Continue →
// celebration; with zero captures the old upload-painting ask remains) →
// upload (ImportHub fallback, demo-local, zero-capture path only) →
// celebration (confetti threshold + endowed-progress hooks strip) → paywall
// (view-only card) → done (end card). All state is local; zero localStorage
// writes.
type ObPhase =
  | "video" | "card_lang" | "card_name" | "capture"
  | "loading" | "hold" | "paused" | "flying"
  | "hall" | "corridor" | "room"
  | "upload" | "celebration" | "paywall" | "done";
type ObSceneName = "exterior" | "entrance" | "corridor" | "room";
type ObTextSize = "standard" | "comfortable" | "large";

// Login-free scene viewer: /flythrough?scene=hall opens straight into the
// entrance hall (analogous to the exterior review link) — also: exterior,
// corridor, room, or a numeric index.
const SCENE_ALIASES: Record<string, number> = { exterior: 0, hall: 1, entrance: 1, corridor: 2, room: 3, onboarding: 4 };
function initialSceneFromURL(): number {
  if (typeof window === "undefined") return 0;
  const q = new URLSearchParams(window.location.search).get("scene");
  if (!q) return 0;
  const alias = SCENE_ALIASES[q.toLowerCase()];
  if (alias !== undefined) return alias;
  const n = parseInt(q, 10);
  return Number.isFinite(n) && n >= 0 && n < SCENES.length ? n : 0;
}

const FADE_MS = 600;

export default function FlythroughClient() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [phase, setPhase] = useState<"idle" | "recording" | "done">("idle");
  // Start at 0 on BOTH server and first client render (lazy URL init here
  // caused a hydration mismatch that killed the whole page), then apply the
  // ?scene= deep link after mount; the scene itself only mounts client-side.
  const [currentScene, setCurrentScene] = useState(0);
  const [mounted, setMounted] = useState(false);
  // ── Room demo state (viewer-only): live memory list + fill preset + the Ledger ──
  const [demoFill, setDemoFill] = useState<"max" | "min" | "default">("default");
  // ?name= — owner name for the viewer scenes' baked surfaces (tympanum,
  // mantel plaque). Applied after mount like ?scene=/?fill= (hydration-safe).
  const [demoName, setDemoName] = useState("");
  const [demoMems, setDemoMems] = useState<Mem[]>(SAMPLE_MEMORIES);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  // the Library-style edit step behind the media viewer (Edit button / quick-action chips)
  const [detailMem, setDetailMem] = useState<{ mem: Mem; initialAction?: string } | null>(null);
  // standalone AV player (outside the media menu): open at a track index, or null
  const [playerTrack, setPlayerTrack] = useState<number | null>(null);
  const demoPlayables = demoMems.filter((m) => (m.type === "audio" || m.type === "video" || m.type === "voice" || m.type === "interview") && !!m.dataUrl);
  const applyFill = useCallback((f: "max" | "min" | "default") => {
    setDemoFill(f);
    setDemoMems(f === "max" ? SAMPLE_MEMORIES_MAX : f === "min" ? SAMPLE_MEMORIES_MIN : SAMPLE_MEMORIES);
  }, []);
  // ?cp1..4= — corridor salon-painting overrides (dev recording helper).
  const [corridorPaintings, setCorridorPaintings] = useState(DEMO_CORRIDOR_PAINTINGS);
  useEffect(() => {
    setCurrentScene(initialSceneFromURL());
    applyFill(fillFromURL());
    setDemoName(nameFromURL());
    // ?mantelDemo=1 — recording-pass mantel fill for the onboarding room leg
    // (hydration-safe, applied after mount like ?scene=/?fill=/?name=).
    setObMantelDemo(mantelDemoFromURL());
    // ?heroUrl= / ?cp1..4= — exact-media recording overrides (same pattern).
    const heroMem = heroFromURL();
    if (heroMem) setDemoMems((prev) => [heroMem, ...prev.map((m) => ({ ...m, hero: false } as Mem))]);
    const cpOverrides = corridorPaintingsFromURL();
    if (cpOverrides) setCorridorPaintings((prev) => ({ ...prev, ...cpOverrides }));
    setMounted(true);
  }, [applyFill]);
  const [progress, setProgress] = useState(0);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  // ── Scene viewer veil (assemble-before-reveal, owner 2026-08-23) ──
  // Scenes 0–3 mount the bare 3D scenes with no cover, so they used to
  // visibly assemble (GLBs/PBR sets/painting canvases popping in). A cream
  // veil now holds until the mounted scene's onReady — which every scene only
  // fires once fully assembled (per-scene reveal barrier, ≤8s cap) — with a
  // 10s viewer-side safety ceiling so a never-firing scene (WebGL init
  // failure) can't strand it. Scene 4 (onboarding preview) keeps the
  // OnboardingSceneHost's own ready-gated reveal instead.
  const [viewerSceneReady, setViewerSceneReady] = useState(false);
  // Ref mirror for the RECORDER's ready-gating (assemble-before-capture): the
  // sequencing callbacks below must read readiness outside the render cycle.
  const viewerSceneReadyRef = useRef(false);
  const handleViewerSceneReady = useCallback(() => {
    viewerSceneReadyRef.current = true;
    setViewerSceneReady(true);
  }, []);
  useEffect(() => { viewerSceneReadyRef.current = false; setViewerSceneReady(false); }, [currentScene]);
  useEffect(() => {
    if (currentScene >= RECORD_SCENE_COUNT || viewerSceneReady) return;
    const tmo = setTimeout(() => setViewerSceneReady(true), 10000);
    return () => clearTimeout(tmo);
  }, [currentScene, viewerSceneReady]);

  // ── Onboarding preview state (scene 4) — plan §11 obPhase machine ──
  const isMobile = useIsMobile();
  const [obReduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  // Demo-local locale (owner canon: the language card starts at ENGLISH, not
  // the browser locale) — declared above the translator so the locale-pinned
  // hook can consume it. Never persisted: tapping a chip swaps the resolved
  // messages, live re-rendering every downstream demo string (cards, captions,
  // buttons) in the chosen language from that moment on.
  const [obLocale, setObLocale] = useState<Locale>("en");
  // Guard against ImportHub's self-close after a successful import overwriting
  // the just-set celebration phase (mirrors the wizard's memoryUploadedRef).
  const obImportedRef = useRef(false);
  const { t: tOnb } = useLocaleTranslation("onboarding", obLocale);
  // "flythrough" is a NEW messages section (plan §12, i18n workstream). The
  // cast keeps this compiling before the section lands; the try/catch keeps it
  // WORKING before it lands (t() throws on a missing section) — either way the
  // plan's EN fallback renders. tr(key, fallback) guard pattern per R10.
  const { t: tFlyRaw } = useTranslation("flythrough" as unknown as Parameters<typeof useTranslation>[0]);
  // trOnb supports {var} interpolation like the wizard's tr(): a resolved key
  // interpolates via t(); a missing key interpolates the EN fallback by hand.
  const trOnb = useCallback((k: string, f: string, vars?: Record<string, string>) => {
    try {
      const v = (tOnb as unknown as (key: string, vars?: Record<string, string>) => string)(k, vars);
      if (v !== k) return v;
    } catch { /* fall through to the EN fallback */ }
    if (!vars) return f;
    return Object.entries(vars).reduce((s, [key, val]) => s.split(`{${key}}`).join(val), f);
  }, [tOnb]);
  const trFly = useCallback((k: string, f: string) => {
    try { const v = tFlyRaw(k); return v === k ? f : v; } catch { return f; }
  }, [tFlyRaw]);
  // Reduced motion mirrors the wizard's initial-phase pick: skip the 12.5s
  // autoplaying video straight to the first setup card.
  const [obPhase, setObPhase] = useState<ObPhase>(obReduceMotion ? "card_lang" : "video");
  const [obScene, setObScene] = useState<ObSceneName>("exterior");
  const [obResumed, setObResumed] = useState(false);
  const [obHallHint, setObHallHint] = useState(true);
  // ── Demo-local question-card state (never persisted anywhere; obLocale
  // lives above with the locale-pinned translator) ──
  const [obName, setObName] = useState("");
  const [obTextSize, setObTextSize] = useState<ObTextSize>("standard");
  // ── Walk-leg step state (mirrors the wizard's corridorStep/roomStep) ──
  const [obCorridorStep, setObCorridorStep] = useState(-1);
  const [obRoomStep, setObRoomStep] = useState(-1);
  const [obCorridorEnter, setObCorridorEnter] = useState(false);
  // Scene-ready per walk leg (mirrors the wizard's E2E slow-env fix): the
  // safety ceilings must not burn while a scene is still LOADING (headless/
  // slow devices: 60s+), or they fire mid-choreography. Set by the host's
  // onSceneReady — REAL first rendered frame of the named scene (or the
  // no-WebGL fallback), never its 4s reveal-timeout; the scene-name check
  // rejects a stray late signal from the previous scene during the 250ms
  // crossfade. Reset on every scene hop (and in resetOb for re-entry).
  const [obWalkReady, setObWalkReady] = useState(false);
  useEffect(() => { setObWalkReady(false); }, [obScene]);
  const handleObSceneReady = useCallback((readyScene: ObSceneName) => {
    setObWalkReady((prev) => prev || readyScene === obScene);
  }, [obScene]);
  // The demo first memory (upload phase) — local object, never persisted.
  const [obMem, setObMem] = useState<Mem | null>(null);
  // ── Capture-first demo state (wizard mirror): the photos picked on the
  // capture card, as local dataURL Mems — never persisted anywhere. ──
  const [obCaptured, setObCaptured] = useState<Mem[]>([]);
  const obCapturedRef = useRef<Mem[]>([]);
  useEffect(() => { obCapturedRef.current = obCaptured; }, [obCaptured]);
  // Frozen snapshot handed to the 3D host at walk start (wizard mirror): a
  // celebration-time "add one more" must not change the room's structural
  // fingerprint (full rebuild under the confetti).
  const obWalkMemsRef = useRef<Mem[]>([]);
  const obCaptureInputRef = useRef<HTMLInputElement | null>(null);
  const obCelebInputRef = useRef<HTMLInputElement | null>(null);
  const obReadCaptureFiles = useCallback(async (files: File[], limit: number) => {
    const picks = files.filter((f) => f.type.startsWith("image/")).slice(0, limit);
    for (const file of picks) {
      try {
        const dataUrl = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });
        if (!dataUrl) continue;
        setObCaptured((prev) => [...prev, {
          id: `ob-cap-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          title: file.name.replace(/\.[^.]+$/, "") || file.name,
          type: "photo", dataUrl, displayed: true,
          hue: 18, s: 50, l: 60, createdAt: new Date().toISOString(),
        } as Mem]);
      } catch { /* unreadable file — demo-local, skip quietly */ }
    }
  }, []);
  // ?mantelDemo=1 — tour-recording mantel fill (see mantelDemoFromURL above).
  const [obMantelDemo, setObMantelDemo] = useState(false);
  // Video intro outro beat (mirrors the wizard's beginOutro welcome fade).
  const [obVideoWelcome, setObVideoWelcome] = useState(false);
  const obOutroFiredRef = useRef(false);
  // Fresh key per (re)entry — the scene's one-shot cinematic refs restart cleanly.
  const [obKey, setObKey] = useState(0);
  // The exterior fires onCinematicPause exactly once — mirror with a ref so a
  // stray re-fire can never bounce a later phase back to "paused".
  const obPauseFiredRef = useRef(false);
  // Exterior arrival: 3s door beat before the hall cut (wizard contract).
  const obArrivalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetOb = useCallback(() => {
    setObPhase(obReduceMotion ? "card_lang" : "video");
    setObScene("exterior");
    setObResumed(false);
    setObHallHint(true);
    // ?name= prefills the preview's name card (still editable; empty without
    // the param — byte-identical to before).
    setObName(nameFromURL());
    setObLocale("en");
    obImportedRef.current = false;
    setObTextSize("standard");
    setObCorridorStep(-1);
    setObRoomStep(-1);
    setObCorridorEnter(false);
    // obScene may already be "exterior" (no dep change) — reset readiness explicitly.
    setObWalkReady(false);
    setObMem(null);
    setObCaptured([]);
    obWalkMemsRef.current = [];
    setObVideoWelcome(false);
    obOutroFiredRef.current = false;
    obPauseFiredRef.current = false;
    if (obArrivalRef.current) { clearTimeout(obArrivalRef.current); obArrivalRef.current = null; }
    setObKey((k) => k + 1);
  }, [obReduceMotion]);
  // Scene-pill switch (or the recorder's reset to scene 0) resets ALL ob-state.
  useEffect(() => { resetOb(); }, [currentScene, resetOb]);
  useEffect(() => () => { if (obArrivalRef.current) clearTimeout(obArrivalRef.current); }, []);
  // ── Demo-local text size ACTUALLY scales the demo typography, mirroring
  // AccessibilityProvider's mechanism (root font-size ×1 / ×1.125 / ×1.25 —
  // every rem-sized card/caption scales with it) from the moment a size chip
  // is tapped. Scene-4-only; the pre-demo root size is captured once and
  // restored on scene leave/unmount. Never persisted (no localStorage/DB). ──
  const obRootFontRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentScene !== 4) return;
    const root = document.documentElement;
    if (obRootFontRef.current === null) obRootFontRef.current = root.style.fontSize;
    const scale = obTextSize === "comfortable" ? 1.125 : obTextSize === "large" ? 1.25 : 1;
    root.style.fontSize = scale === 1 ? obRootFontRef.current : `${scale * 100}%`;
    return () => {
      root.style.fontSize = obRootFontRef.current ?? "";
      obRootFontRef.current = null;
    };
  }, [currentScene, obTextSize]);
  // Hall hint chip: dismiss after 5s or on first pointerdown — never other timers.
  useEffect(() => {
    if (obPhase !== "hall") return;
    const tmo = setTimeout(() => setObHallHint(false), 5000);
    const dismiss = () => setObHallHint(false);
    window.addEventListener("pointerdown", dismiss);
    return () => { clearTimeout(tmo); window.removeEventListener("pointerdown", dismiss); };
  }, [obPhase]);
  // ── Video intro: force-play (autoplay-block → graceful outro) + the wizard's
  // 12.5s auto-outro; the outro welcome holds 2.6s then advances to the cards.
  const obVideoRef = useRef<HTMLVideoElement>(null);
  const beginObOutro = useCallback(() => {
    if (obOutroFiredRef.current) return;
    obOutroFiredRef.current = true;
    const v = obVideoRef.current;
    if (v) { v.loop = true; v.play().catch(() => {}); }
    setObVideoWelcome(true);
  }, []);
  useEffect(() => {
    if (currentScene !== 4 || obPhase !== "video") return;
    obVideoRef.current?.play().catch(() => beginObOutro());
    const tmo = setTimeout(beginObOutro, 12500);
    return () => clearTimeout(tmo);
  }, [currentScene, obPhase, beginObOutro]);
  useEffect(() => {
    if (!obVideoWelcome) return;
    const tmo = setTimeout(() => setObPhase((p) => (p === "video" ? "card_lang" : p)), 2600);
    return () => clearTimeout(tmo);
  }, [obVideoWelcome]);
  // ── Wizard safety ceilings, mirrored — STRICTLY anti-stranding (stalled GL),
  // never pacing: each = full choreography + ~8s buffer. 8s WP1-prompt
  // fallback (surfaces the prompt only); 30s flyover ceiling → hall (flyover
  // 15s + zoom 3s + 3s door beat ≈ 21s natural); 28s hall ceiling → corridor
  // (look-around 7.7s + walk 12s ≈ 19.7s); 25s corridor ceiling → room,
  // DISARMED at step 6 (unbounded "Enter The Room" user-wait; steps 0-5 ≈
  // 16.5s mobile); 33s room ceiling → upload, DISARMED at step 9 (unbounded
  // painting-click user-wait; steps 0-8 ≈ 25s mobile).
  // ARMING (E2E slow-env fix, wizard mirror): each ceiling counts only once
  // the leg is LIVE — obWalkReady (real first frame via onSceneReady) or the
  // leg's first choreography step — never from phase entry, so scene-load
  // time can't eat the ceiling and truncate choreography. While not live, the
  // 90s outer bound below is the only timer. DISARM = HARD CANCEL: a dep flip
  // (step >= 6/9, phase leave, liveness change) runs the cleanup and clears
  // the pending timeout — a scheduled advance can never outlive its disarm.
  const obCorridorWaiting = obCorridorStep >= 6;
  const obRoomWaiting = obRoomStep >= 9;
  // Capture-first (wizard mirror): with captured photos the room leg resolves
  // straight to the celebration; zero captures fall back to the upload ask.
  const obAfterWalk: ObPhase = obCaptured.length > 0 ? "celebration" : "upload";
  const obLegLive =
    obWalkReady ||
    (obPhase === "corridor" && obCorridorStep >= 0) ||
    (obPhase === "room" && obRoomStep >= 0);
  useEffect(() => {
    if (currentScene !== 4) return;
    let tmo: ReturnType<typeof setTimeout> | null = null;
    if (obPhase === "hold") {
      // Prompt-surfacing fallback only (never advances a leg) — stays armed
      // from phase entry like the wizard's 8s cinematic-prompt fallback.
      tmo = setTimeout(() => { obPauseFiredRef.current = true; setObPhase("paused"); }, 8000);
    } else if (!obLegLive) {
      // Scene still loading — no leg ceiling; the outer bound covers stranding.
    } else if (obPhase === "flying") {
      tmo = setTimeout(() => { setObScene("entrance"); setObPhase("hall"); }, 30000);
    } else if (obPhase === "hall") {
      tmo = setTimeout(() => { setObScene("corridor"); setObPhase("corridor"); }, 28000);
    } else if (obPhase === "corridor" && !obCorridorWaiting) {
      tmo = setTimeout(() => { setObScene("room"); setObPhase("room"); }, 25000);
    } else if (obPhase === "room" && !obRoomWaiting) {
      tmo = setTimeout(() => setObPhase(obAfterWalk), 33000);
    }
    return () => { if (tmo) clearTimeout(tmo); };
  }, [currentScene, obPhase, obLegLive, obCorridorWaiting, obRoomWaiting, obAfterWalk]);
  // OUTER absolute bound (wizard mirror) — purely anti-infinite-loading: if a
  // leg's scene never goes live, advance 90s after phase entry ("flying" is
  // already post-resume; the paused prompt wait stays unbounded). Cancelled
  // the moment the leg goes live — never cuts real choreography, and never
  // overrides a step>=6/9 user-wait (steps firing imply live).
  useEffect(() => {
    if (currentScene !== 4 || obLegLive) return;
    let tmo: ReturnType<typeof setTimeout> | null = null;
    if (obPhase === "flying") {
      tmo = setTimeout(() => { setObScene("entrance"); setObPhase("hall"); }, 90000);
    } else if (obPhase === "hall") {
      tmo = setTimeout(() => { setObScene("corridor"); setObPhase("corridor"); }, 90000);
    } else if (obPhase === "corridor") {
      tmo = setTimeout(() => { setObScene("room"); setObPhase("room"); }, 90000);
    } else if (obPhase === "room") {
      tmo = setTimeout(() => setObPhase(obAfterWalk), 90000);
    }
    return () => { if (tmo) clearTimeout(tmo); };
  }, [currentScene, obPhase, obLegLive, obAfterWalk]);
  // "Enter The Room" fallback (wizard: corridor ro1-arrival may never fire):
  // the step-7 auto-walk covers ~4m at the 2.2m/s comfort cap (~2s) — 10s
  // ceiling (2s natural + 8s buffer) so it can never cut the walk itself.
  useEffect(() => {
    if (currentScene !== 4 || obPhase !== "corridor" || !obCorridorEnter) return;
    const tmo = setTimeout(() => { setObScene("room"); setObPhase("room"); }, 10000);
    return () => clearTimeout(tmo);
  }, [currentScene, obPhase, obCorridorEnter]);
  // Warm the 3D module cache while the owner types the demo name / picks
  // photos on the capture card (wizard §preload).
  useEffect(() => {
    if (currentScene !== 4 || (obPhase !== "card_name" && obPhase !== "capture")) return;
    import("@/lib/3d/scenePreloader")
      .then(({ preloadScene }) => { preloadScene("exterior"); preloadScene("entrance"); })
      .catch(() => {});
  }, [currentScene, obPhase]);
  // ── Per-leg skip (mirrors the wizard's skipWalkLeg: next leg, never the end) ──
  const obSkipLeg = useCallback(() => {
    if (obPhase === "video") { obOutroFiredRef.current = true; setObPhase("card_lang"); }
    else if (obPhase === "hold" || obPhase === "paused" || obPhase === "flying") {
      if (obArrivalRef.current) { clearTimeout(obArrivalRef.current); obArrivalRef.current = null; }
      setObScene("entrance"); setObPhase("hall");
    }
    else if (obPhase === "hall") { setObScene("corridor"); setObPhase("corridor"); }
    else if (obPhase === "corridor") { setObScene("room"); setObPhase("room"); }
    else if (obPhase === "room") setObPhase(obAfterWalk);
  }, [obPhase, obAfterWalk]);
  // Stable host callbacks: the host's ready-gate effect re-arms on onReady
  // identity change, so inline arrows here would reset its once-per-scene
  // guards every viewer render (step updates re-render constantly).
  const handleObHostReady = useCallback(() => {
    setObPhase((p) => (p === "loading" ? "hold" : p));
  }, []);
  // Trimmed real name for possessive titles + the plaque plumbing; captions
  // fall back to NEUTRAL forms when empty (never "Your first name's Palace" —
  // the "Your's" bug family). obDisplayName keeps the placeholder fallback for
  // the non-possessive paywall headline only.
  const obNameTrimmed = obName.trim();
  const obDisplayName = obNameTrimmed || trOnb("namePlaceholder", "Your first name");
  // ── Viewer-local canon tokens for the card/paywall chrome (visual mirror of
  // the wizard's warm-cream Library canon — its style consts are private) ──
  const OB_CREAM = "#FCFAF5", OB_INK = "#403B36", OB_MUTED = "#716A5E", OB_HAIRLINE = "#E3D6BC", OB_EMBER = "#B85C38";
  // Ember-glyph ink (= wizard EMBER_GLYPH / landing accentLight) — at-rest
  // overline/section-label accent on light surfaces; OB_EMBER stays interactive.
  const OB_EMBER_GLYPH = "#9A4F2A";
  const obCardPageStyle: CSSProperties = { position: "absolute", inset: 0, zIndex: 25, background: OB_CREAM, overflow: "hidden" };
  const obCardScrollerStyle: CSSProperties = {
    position: "relative", width: "100%", height: "100%",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
    overflowY: "auto",
    padding: "calc(3.5rem + env(safe-area-inset-top, 0px)) 0 calc(1.5rem + env(safe-area-inset-bottom, 0px))",
  };
  const obCardStyle: CSSProperties = {
    maxWidth: "30rem", width: "92%",
    padding: isMobile ? "2rem 1.25rem" : "2.5rem 2rem",
    background: OB_CREAM, borderRadius: "1rem",
    border: `0.0625rem solid ${OB_HAIRLINE}`,
    boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", margin: "auto",
  };
  const obCtaStyle: CSSProperties = {
    fontFamily: T.font.body, fontSize: "1rem", fontWeight: 600,
    padding: "0 1.25rem", borderRadius: "0.75rem", border: "none",
    background: T.land.ctaGrad, color: "#FFF", cursor: "pointer", minHeight: "3.25rem",
  };
  const obOverlineStyle: CSSProperties = {
    fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
    color: OB_EMBER_GLYPH, letterSpacing: "0.14em", textTransform: "uppercase",
  };
  const obH2Style: CSSProperties = {
    fontFamily: T.font.display, fontSize: isMobile ? "1.5rem" : "1.75rem",
    fontWeight: 600, color: OB_INK, lineHeight: 1.25, margin: 0,
  };
  const obSectionLabelStyle: CSSProperties = {
    fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
    color: OB_EMBER_GLYPH, textAlign: "left", margin: "0 0 0.5rem",
    textTransform: "uppercase", letterSpacing: "0.14em",
  };
  const obPromptTextStyle: CSSProperties = {
    fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.9375rem",
    color: "#D4CBC0", margin: 0, lineHeight: 1.5,
    textShadow: "0 0.125rem 0.75rem rgba(26,25,23,0.9), 0 0.0625rem 0.1875rem rgba(26,25,23,0.7)",
  };
  const obDemoNote = trFly("onbDemoNote", "Preview only — nothing is saved.");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      if (recorderRef.current && (recorderRef.current.state === "recording" || recorderRef.current.state === "paused")) {
        recorderRef.current.stop();
      }
    };
  }, []);

  // Recorder ready-wait: resolves once the mounted scene fired its assembled
  // reveal (onReady), or after capMs so a never-firing scene can't strand the
  // recording (mirrors the idle viewer veil's 10s safety ceiling).
  const waitForSceneReady = useCallback((capMs = 12000) => new Promise<void>((resolve) => {
    const t0 = Date.now();
    const tick = () => {
      if (viewerSceneReadyRef.current || Date.now() - t0 > capMs) { resolve(); return; }
      setTimeout(tick, 100);
    };
    tick();
  }), []);

  const advanceScene = useCallback((sceneIdx: number) => {
    // Recorder iterates 0–3 only — the Onboarding scene (4) is never recorded.
    if (sceneIdx >= RECORD_SCENE_COUNT) {
      // Done — stop recording
      if (recorderRef.current && (recorderRef.current.state === "recording" || recorderRef.current.state === "paused")) {
        recorderRef.current.stop();
      }
      return;
    }

    // Crossfade: fade out (DOM-only — the canvas capture is unaffected)
    setFadeOpacity(0);

    setTimeout(() => {
      // ── Assemble-before-capture (veil/reveal interplay, 2026-08-23) ──
      // The idle viewer's cream veil is DOM chrome and phase-gated to "idle",
      // so it never appears in the capture — but the canvas itself DOES show
      // the next scene assembling (GLB/texture pop-in) until its reveal
      // barrier fires onReady. PAUSE the recorder across the hop and RESUME
      // only once the scene reports assembled: the webm cuts from finished
      // scene to finished scene with zero assembly frames.
      try { if (recorderRef.current?.state === "recording") recorderRef.current.pause(); } catch { /* capture keeps rolling */ }
      viewerSceneReadyRef.current = false;
      setCurrentScene(sceneIdx);
      void waitForSceneReady().then(() => {
        // Fade in
        setTimeout(() => setFadeOpacity(1), 50);
        try { if (recorderRef.current?.state === "paused") recorderRef.current.resume(); } catch { /* already rolling */ }

        // Schedule next scene
        timerRef.current = setTimeout(() => {
          advanceScene(sceneIdx + 1);
        }, SCENES[sceneIdx].duration);
      });
    }, FADE_MS);
  }, [waitForSceneReady]);

  // Per-scene segment recording (2026-08-23): the pooled renderer re-acquires
  // the canvas on scene hops, which silently ENDS the captureStream track —
  // one MediaRecorder spanning all scenes only ever contained scene 0. Each
  // scene now records into its OWN stream/recorder; the four segment webms
  // download as palace-scene-<i>.webm and the driver concats them (ffmpeg).
  const recAbortRef = useRef(false);

  const recordSegment = useCallback((durationMs: number, mimeType: string): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
      if (!canvas) { resolve(null); return; }
      const stream = canvas.captureStream(60);
      const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        try { stream.getTracks().forEach((t) => t.stop()); } catch { /* already dead */ }
        resolve(chunks.length ? new Blob(chunks, { type: "video/webm" }) : null);
      };
      rec.start(500);
      recorderRef.current = rec;
      setTimeout(() => { try { if (rec.state !== "inactive") rec.stop(); } catch { resolve(null); } }, durationMs);
    });
  }, []);

  const startRecording = useCallback(async () => {
    const codecs = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mimeType = codecs.find((c) => MediaRecorder.isTypeSupported(c));
    if (!mimeType) {
      setToast({ message: "Your browser does not support WebM recording.", type: "error" });
      return;
    }
    recAbortRef.current = false;
    setProgress(0);
    setPhase("recording");
    startTimeRef.current = Date.now();
    const totalMs = SCENES.slice(0, RECORD_SCENE_COUNT).reduce((s, sc) => s + sc.duration, 0);
    let doneMs = 0;
    progressRef.current = setInterval(() => {
      setProgress(Math.min((doneMs + (Date.now() - startTimeRef.current)) / totalMs, 1));
    }, 100);

    const segments: Blob[] = [];
    for (let i = 0; i < RECORD_SCENE_COUNT; i++) {
      if (recAbortRef.current) break;
      setFadeOpacity(0);
      if (i !== 0 || currentScene !== 0) {
        await new Promise((r) => setTimeout(r, i === 0 ? 0 : FADE_MS));
        // Only reset the ready-flag when actually switching scenes — an
        // already-revealed scene 0 would otherwise wait out the 12s cap.
        viewerSceneReadyRef.current = false;
        setCurrentScene(i);
      }
      await new Promise((r) => setTimeout(r, 200));
      await waitForSceneReady();
      setFadeOpacity(1);
      if (recAbortRef.current) break;
      startTimeRef.current = Date.now();
      const blob = await recordSegment(SCENES[i].duration, mimeType);
      doneMs += SCENES[i].duration;
      if (blob) segments.push(blob);
    }

    segments.forEach((blob, i) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `palace-scene-${i}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });
    setPhase("done");
    if (progressRef.current) clearInterval(progressRef.current);
  }, [currentScene, recordSegment, waitForSceneReady]);

  const stopRecording = useCallback(() => {
    recAbortRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (recorderRef.current && (recorderRef.current.state === "recording" || recorderRef.current.state === "paused")) {
      recorderRef.current.stop();
    }
  }, []);

  // ── Render the active scene ──
  const renderScene = () => {
    const noop = () => {};

    switch (currentScene) {
      case 0:
        return (
          <ExteriorScene
            onRoomHover={noop}
            onRoomClick={noop}
            hoveredRoom={null}
            styleEra="roman"
            // ?name= — the tympanum engraving ("GUILLAUME" over the entrance);
            // empty ⇒ the scene's neutral localized fallback, as before.
            userNameOverride={demoName || undefined}
            onReady={handleViewerSceneReady}
          />
        );
      case 1:
        return (
          <EntranceHallScene
            onDoorClick={noop}
            styleEra="roman"
            lunettePhotos={DEMO_LUNETTES}
            onReady={handleViewerSceneReady}
            // Recorder/viewer look-parity (owner 2026-08-23): the async
            // ballroom-HDRI environment swap (desktop GPU tier only — the
            // potato tier never loads it, which is why the onboarding-preview
            // E2E refs render correctly) washes the golden hall to near-white
            // on the recording rig's GL path. Pin the warm procedural interior
            // env so idle viewing AND the cinematic recording passes show the
            // owner-approved warm hall. In-app mounts are untouched.
            envHDRI={false}
          />
        );
      case 2: {
        const cw = corridorWingFromURL();
        return (
          <CorridorScene
            wingId={cw.wingId}
            rooms={cw.rooms}
            corridorPaintings={corridorPaintings}
            onDoorHover={noop}
            onDoorClick={noop}
            hoveredDoor={null}
            styleEra="roman"
            onReady={handleViewerSceneReady}
            // Warm-grade parity with the app look — see the hall mount above.
            envHDRI={false}
          />
        );
      }
      case 3:
        return (
          <InteriorScene
            key={`room-${demoFill}`}
            roomId="roots"
            actualRoomId="ro1"
            memories={demoMems}
            onMemoryClick={(mem: Mem) => {
              if (!mem?.id) return;
              // standing before the gramophone/screen: clicking AV opens the PLAYER
              const isAV = (mem.type === "audio" || mem.type === "video" || mem.type === "voice" || mem.type === "interview") && !!mem.dataUrl;
              if (isAV) { const i = demoPlayables.findIndex((p) => p.id === mem.id); setPlayerTrack(i >= 0 ? i : 0); }
              else setLightboxId(mem.id);
            }}
            styleEra="roman"
            // ?name= — the mantel plaque ("{name}'s Beautiful Smile");
            // empty ⇒ the scene's neutral localized fallback, as before.
            userNameOverride={demoName || undefined}
            onReady={handleViewerSceneReady}
            // Warm-grade parity with the app look — the HDRI swap dropped the
            // bright warm salon into gloom here; see the hall mount above.
            envHDRI={false}
          />
        );
      case 4: {
        // Onboarding preview — the REAL onboarding scene host (unchanged
        // component) driven by the local obPhase machine. Camera choreography
        // is consumed via its existing contract, never edited (contract 3).
        // Video/cards phases mount no 3D (the wizard's cream cards carry those
        // beats). Item 6 (owner 2026-08-23): upload/celebration now SHARE the
        // walk epoch (same key, same demo set, onboardingMode stays true) so
        // the live walk-room scene never remounts/rebuilds — the uploaded
        // photo is injected in place into the mantel placeholder and the
        // confetti falls over a visible room (mirrors the wizard's mounts).
        // Only the paywall re-keys to a fresh plain room, like the wizard.
        if (obPhase === "video" || obPhase === "card_lang" || obPhase === "card_name" || obPhase === "capture") return null;
        const hostEpoch =
          obPhase === "paywall" || obPhase === "done" ? "paywall" : "walk";
        const walkMode = hostEpoch === "walk";
        return (
          <OnboardingSceneHost
            key={`ob-${obKey}-${hostEpoch}`}
            scene={obScene}
            onboardingMode={walkMode}
            isMobile={isMobile}
            wingId="roots"
            roomId="ro1"
            // Real demo name for the canvas-baked texts — the exterior tympanum
            // name and the room's mantel plaque ("{name}'s Beautiful Smile").
            // The viewer has no user store, so the name card's obName is
            // threaded through; empty ⇒ each scene's neutral fallback
            // (localized "Entrance Hall" / "A Beautiful Smile").
            demoUserName={obName.trim() || undefined}
            // Demo-local language for the same canvas-baked texts (tympanum
            // fallback, hall wing doors, corridor door plates, mantel plaque):
            // the scenes read the GLOBAL locale by default, which the viewer
            // never touches — obLocale pins them to the chosen language.
            localeOverride={obLocale}
            // Item 4 REVISED (owner 2026-08-23): NO audio in the room during
            // onboarding — the gramophone demo music must not auto-play. The
            // wiring stays dormant (InteriorScene autoplay is opt-in via
            // `onboardingAudioRef.current===true`); re-enable by restoring
            // demoAudio={obPhase !== "upload" && obPhase !== "celebration"}.
            demoAudio={false}
            // Capture-first (wizard mirror): photo #1 swaps into the mantel
            // from the START of the room leg; #2/#3 hang on the left wall via
            // uploadedMemories (frozen snapshot — see obWalkMemsRef).
            // ?mantelDemo=1 (recording passes only): the demo hero photo hangs
            // in the mantel frame from the START of the room leg via the same
            // in-place swap the celebration uses. Param absent + zero captures
            // ⇒ exactly the old expression (empty mantel until celebration).
            uploadedMemory={
              obScene === "room" && obWalkMemsRef.current[0] ? obWalkMemsRef.current[0]
              : obPhase === "celebration" ? obMem
              : obMantelDemo && obScene === "room" ? MANTEL_DEMO_MEM : null
            }
            uploadedMemories={obWalkMemsRef.current}
            onReady={handleObHostReady}
            onSceneReady={handleObSceneReady}
            onCinematicPause={() => {
              if (obPauseFiredRef.current) return;
              obPauseFiredRef.current = true;
              setObPhase((p) => (p === "loading" || p === "hold" ? "paused" : p));
            }}
            cinematicResumed={obResumed}
            corridorEnterClicked={obCorridorEnter}
            onCinematicStep={
              obPhase === "corridor" ? setObCorridorStep :
              obPhase === "room" ? setObRoomStep :
              undefined
            }
            onRoomClick={(id: string, arrived?: boolean) => {
              // Arrival contract: the cinematic zoom/autoWalk ends AT the door
              // and fires ("__entrance__", true) → 3s door beat (wizard) →
              // enter the hall. Plain (non-arrived) taps are ignored.
              if (id === "__entrance__" && arrived && (obPhase === "hold" || obPhase === "paused" || obPhase === "flying")) {
                if (obArrivalRef.current) clearTimeout(obArrivalRef.current);
                obArrivalRef.current = setTimeout(() => { setObScene("entrance"); setObPhase("hall"); }, 3000);
              }
            }}
            // The wizard's door contract, phase-gated: hall look-around ends
            // with onDoorClick("roots") → corridor; the corridor auto-walk
            // fires "ro1" on arrival → room; the room's empty painting fires
            // "__upload_painting__" (via the host's onMemoryClick wiring) →
            // upload. Any hall door advances the preview too.
            onDoorClick={(id: string) => {
              if (obPhase === "hall") { setObScene("corridor"); setObPhase("corridor"); }
              else if (obPhase === "corridor" && id === "ro1") { setObScene("room"); setObPhase("room"); }
              else if (obPhase === "room" && id === "__upload_painting__") setObPhase(obAfterWalk);
            }}
          />
        );
      }
      default:
        return null;
    }
  };

  const sceneName = SCENES[currentScene]?.name ?? "";
  const totalSec = SCENES.slice(0, RECORD_SCENE_COUNT).reduce((s, sc) => s + sc.duration, 0) / 1000;

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#111", position: "relative", overflow: "hidden" }}>
      {/* 3D scene — full viewport with crossfade */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: fadeOpacity,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
        }}
      >
        {mounted && renderScene()}
      </div>

      {/* Scene viewer veil — cream cover until the mounted scene's assembled
          reveal (onReady); idle viewing only, never over a recording pass */}
      {mounted && currentScene < RECORD_SCENE_COUNT && phase === "idle" && (
        <div
          aria-hidden={viewerSceneReady}
          style={{
            position: "absolute", inset: 0, zIndex: 40,
            background: "#FCFAF5",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: viewerSceneReady ? 0 : 1,
            transition: "opacity 400ms ease",
            pointerEvents: viewerSceneReady ? "none" : "auto",
          }}
        >
          <span style={{ fontFamily: T.font.display, fontStyle: "italic", fontSize: "1.0625rem", color: "#716A5E" }}>
            {trFly("viewerPreparing", "Preparing the palace…")}
          </span>
        </div>
      )}

      {/* Controls overlay — hidden on the Onboarding preview scene (it is
          never recorded, and its skip chip owns the top-right corner) */}
      {!(currentScene === 4 && phase === "idle") && (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "1rem",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          fontFamily: "system-ui, sans-serif",
          color: "#fff",
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", pointerEvents: "auto" }}>
          <span style={{ fontSize: "0.75rem", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Dev Tool
          </span>
          <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>
            Palace Flythrough Recorder
          </span>

          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            {phase === "idle" && (
              <button
                onClick={startRecording}
                style={{
                  padding: "0.4rem 1rem",
                  background: "#c0392b",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                Record ({totalSec}s)
              </button>
            )}
            {phase === "recording" && (
              <button
                onClick={stopRecording}
                style={{
                  padding: "0.4rem 1rem",
                  background: "#555",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Stop Early
              </button>
            )}
            {phase === "done" && (
              <button
                onClick={() => { setPhase("idle"); setCurrentScene(0); setProgress(0); }}
                style={{
                  padding: "0.4rem 1rem",
                  background: "#27ae60",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {phase === "recording" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                flex: 1,
                height: "4px",
                background: "rgba(255,255,255,0.15)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress * 100}%`,
                  height: "100%",
                  background: "#c0392b",
                  borderRadius: "2px",
                  transition: "width 0.1s linear",
                }}
              />
            </div>
            <span style={{ fontSize: "0.75rem", opacity: 0.7, minWidth: "6rem", textAlign: "right" }}>
              {sceneName} ({Math.round(progress * 100)}%)
            </span>
            {/* Recording indicator */}
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#c0392b",
                animation: "pulse 1s ease-in-out infinite",
              }}
            />
          </div>
        )}

        {phase === "done" && (
          <div style={{ fontSize: "0.85rem", color: "#27ae60" }}>
            Recording complete — video downloaded.
          </div>
        )}
      </div>
      )}

      {/* Scene indicators at bottom — clickable scene switcher while idle
          (the login-free viewer), read-only progress pills while recording */}
      {phase !== "done" && (
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            display: "flex",
            gap: "0.5rem",
            pointerEvents: phase === "idle" ? "auto" : "none",
          }}
        >
          {SCENES.map((s, i) => (
            <button
              key={s.name}
              onClick={() => { if (phase === "idle") setCurrentScene(i); }}
              disabled={phase !== "idle"}
              style={{
                padding: "0.25rem 0.75rem",
                borderRadius: "12px",
                border: "none",
                fontSize: "0.7rem",
                fontFamily: "system-ui, sans-serif",
                cursor: phase === "idle" ? "pointer" : "default",
                color: i === currentScene ? "#fff" : "rgba(255,255,255,0.4)",
                background: i === currentScene ? "rgba(192,57,43,0.8)" : "rgba(255,255,255,0.1)",
                transition: "all 0.3s ease",
              }}
            >
              {i === 4 ? trFly("onbPill", s.name) : s.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Room review extras: media-scale switcher + the Steward's Ledger ── */}
      {mounted && currentScene === 3 && phase === "idle" && (
        <div style={{ position: "absolute", right: "1rem", bottom: "3.5rem", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.35rem", background: "rgba(20,16,12,0.55)", borderRadius: "12px", padding: "0.25rem" }}>
            {(["min", "default", "max"] as const).map((f) => (
              <button key={f} onClick={() => applyFill(f)} style={{
                padding: "0.25rem 0.65rem", borderRadius: "9px", border: "none", cursor: "pointer",
                fontSize: "0.7rem", fontFamily: "system-ui, sans-serif", fontWeight: 600,
                color: demoFill === f ? "#241A12" : "rgba(255,255,255,0.75)",
                background: demoFill === f ? "#D4AF37" : "transparent",
              }}>{f === "min" ? "Min (2)" : f === "default" ? "Standard (23)" : "Max (122)"}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {demoPlayables.length > 0 && (
              <button onClick={() => setPlayerTrack((v) => (v === null ? 0 : null))} style={{
                padding: "0.55rem 1rem", borderRadius: "2rem", border: "0.0625rem solid #8B6B4A", cursor: "pointer",
                fontSize: "0.8125rem", fontFamily: "system-ui, sans-serif", fontWeight: 600,
                background: playerTrack !== null ? "#241A12" : "#FCFAF5", color: playerTrack !== null ? "#C9A87C" : "#403B36", boxShadow: "0 0.35rem 1rem rgba(20,16,12,0.35)",
              }}>♪ Player</button>
            )}
            <button onClick={() => setLedgerOpen(true)} style={{
              padding: "0.55rem 1rem", borderRadius: "2rem", border: "0.0625rem solid #E7D9C4", cursor: "pointer",
              fontSize: "0.8125rem", fontFamily: "system-ui, sans-serif", fontWeight: 600,
              background: "#FCFAF5", color: "#403B36", boxShadow: "0 0.35rem 1rem rgba(20,16,12,0.35)",
            }}>☰ Manage media</button>
          </div>
        </div>
      )}
      {/* Standalone AV player — outside the media menu (stand before the
          gramophone/screen, click it, and it plays right here). */}
      {mounted && currentScene === 3 && playerTrack !== null && demoPlayables.length > 0 && !ledgerOpen && (
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: "3.4rem", zIndex: 110, width: "min(92vw, 26rem)" }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setPlayerTrack(null)} aria-label="close player" style={{ position: "absolute", top: "0.4rem", right: "0.45rem", zIndex: 2, background: "none", border: "none", color: "#C9BFA8", cursor: "pointer", fontSize: "0.95rem" }}>✕</button>
            <PlayerCard tracks={demoPlayables} index={Math.min(playerTrack, demoPlayables.length - 1)} onIndex={setPlayerTrack} tr={(_k: string, f: string) => f} />
          </div>
        </div>
      )}
      {mounted && currentScene === 3 && ledgerOpen && (
        <RoomStewardLedger
          mems={demoMems}
          wing={null}
          room={{ id: "ro1", name: "Me, Over Time" } as never}
          onClose={() => setLedgerOpen(false)}
          onUpdate={(id, updates) => setDemoMems((ms) => ms.map((m) => (m.id === id ? { ...m, ...updates } as Mem : m)))}
          onDelete={(id) => setDemoMems((ms) => ms.filter((m) => m.id !== id))}
          onAdd={(mem) => setDemoMems((ms) => [...ms, mem])}
          onSelect={(mem) => { setLedgerOpen(false); setLightboxId(mem.id); }}
          canEdit
          otherRooms={OTHER_ROOM_FEED}
          addMemoryOverride={(_roomId, mem) => { setDemoMems((ms) => [...ms, mem]); return true; }}
        />
      )}
      {/* Full-screen media view — EXACTLY the Library flow: RoomMediaPlayer
          (full-bleed viewer, options below, own prev/next), Edit/chips →
          MemoryDetail, just like clicking a media item in the Library menu. */}
      {mounted && lightboxId && !detailMem && (() => {
        const idx = demoMems.findIndex((m) => m.id === lightboxId);
        if (idx < 0) return null;
        return (
          <RoomMediaPlayerView
            memories={demoMems}
            initialIndex={idx}
            onClose={() => setLightboxId(null)}
            onEdit={(mem: Mem) => { setLightboxId(null); setDetailMem({ mem }); }}
            onUpdate={(memId: string, updates: Partial<Mem>) => setDemoMems((ms) => ms.map((m) => (m.id === memId ? { ...m, ...updates } as Mem : m)))}
            storedIn={() => ({ wing: "Roots", room: "Me, Over Time", accent: "#B85C38" })}
            onQuickAction={(mem: Mem, actionId: string) => { setLightboxId(null); setDetailMem({ mem, initialAction: actionId }); }}
          />
        );
      })()}
      {mounted && detailMem && (
        <MemoryDetail
          key={detailMem.mem.id}
          mem={demoMems.find((m) => m.id === detailMem.mem.id) || detailMem.mem}
          room={{ id: "ro1", name: "Me, Over Time" } as never}
          wing={null as never}
          onClose={() => setDetailMem(null)}
          onDelete={(id: string) => { setDemoMems((ms) => ms.filter((m) => m.id !== id)); setDetailMem(null); }}
          onUpdate={(id: string, updates: Partial<Mem>) => setDemoMems((ms) => ms.map((m) => (m.id === id ? { ...m, ...updates } as Mem : m)))}
          initialAction={detailMem.initialAction}
        />
      )}

      {/* ── Onboarding preview chrome (scene 4) — FULL walkthrough replay ──
          Pure viewer UI mirroring the CAPTURE-FIRST OnboardingWizard flow with
          demo-local state: video intro → lang/a11y + name cards → capture card
          (3-photo picker) → cinematic captions + WP1 prompt → hall → corridor
          steps → room walk that REVEALS the picked photos (zero captures:
          ImportHub fallback ask) → celebration (endowed-progress hooks) →
          view-only paywall → end card. Reuses the wizard's REAL components
          (WalkCinematicCaption/WalkCtaButton, ImportHub,
          OnboardingCelebration). No onboarding/locale/a11y localStorage writes. */}
      {mounted && currentScene === 4 && phase === "idle" && (
        <>
          {/* Loading veil — cream, 400ms fade once the scene reports ready */}
          <div
            aria-hidden={obPhase !== "loading"}
            style={{
              position: "absolute", inset: 0, zIndex: 40,
              background: "#FCFAF5",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: obPhase === "loading" ? 1 : 0,
              transition: obReduceMotion ? "opacity 200ms linear" : "opacity 400ms ease",
              pointerEvents: obPhase === "loading" ? "auto" : "none",
            }}
          >
            <span style={{ fontFamily: T.font.display, fontStyle: "italic", fontSize: "1.0625rem", color: "#716A5E" }}>
              {trOnb("cinematicLoading", "Preparing your palace…")}
            </span>
          </div>

          {/* Badge chip — top-center: this is the onboarding PREVIEW, not the app */}
          <div
            style={{
              position: "absolute",
              top: "calc(1rem + env(safe-area-inset-top, 0px))",
              left: "50%", transform: "translateX(-50%)",
              zIndex: 31,
              display: "flex", alignItems: "center",
              minHeight: "1.75rem", padding: "0.375rem 0.875rem",
              background: "rgba(252,250,245,0.82)",
              backdropFilter: "blur(0.75rem)", WebkitBackdropFilter: "blur(0.75rem)",
              border: "0.0625rem solid #E3D6BC", borderRadius: "999rem",
              fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase", color: "#716A5E",
              whiteSpace: "nowrap", pointerEvents: "none",
            }}
          >
            {trFly("onbBadge", "Onboarding preview")}
          </div>

          {/* ── Video intro (wizard video_intro, demo-local): tagline beat,
              welcome outro, 12.5s auto-advance, skippable. ── */}
          {obPhase === "video" && (
            <div style={{ position: "absolute", inset: 0, zIndex: 20, background: "#1a1917", overflow: "hidden" }}>
              <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, #2A2622 0%, #1a1917 70%)" }} />
              <video
                ref={obVideoRef}
                autoPlay
                muted
                playsInline
                preload="metadata"
                poster="/video/hero-ob-poster.jpg"
                onEnded={beginObOutro}
                style={{
                  position: "absolute", inset: 0, width: "100%", height: "100%",
                  objectFit: "cover", objectPosition: isMobile ? "60% center" : "center center",
                  opacity: 0.65, filter: "saturate(0.7) brightness(1.1)",
                }}
              >
                <source src="/video/hero-ob.mp4" type="video/mp4" />
              </video>
              <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(26,25,23,0.15) 0%, rgba(26,25,23,0.3) 50%, rgba(26,25,23,0.7) 100%)", pointerEvents: "none" }} />
              {!obVideoWelcome && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", textAlign: "center", pointerEvents: "none", padding: "0 1.5rem" }}>
                  <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)" }}>
                    {trOnb("appName", "The Memory Palace")}
                  </div>
                  <div style={{ fontFamily: T.font.display, fontStyle: "italic", fontWeight: 500, fontSize: isMobile ? "1.1875rem" : "1.5rem", color: "rgba(255,255,255,0.92)", lineHeight: 1.35, maxWidth: "26rem", textShadow: "0 0.125rem 1rem rgba(26,25,23,0.5)" }}>
                    {trOnb("videoTagline", "A home for the moments that made you.")}
                  </div>
                </div>
              )}
              {obVideoWelcome && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", padding: "0 1.5rem", background: "radial-gradient(ellipse at center, rgba(26,25,23,0.35) 0%, rgba(26,25,23,0.72) 100%)", animation: "obv-fadeIn 1.1s ease both" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                    {/* Cream landing-hero voice (wizard mirror): Fraunces 500 flat cream, upright — no gold text anywhere */}
                    <div style={{ fontFamily: T.font.display, fontSize: isMobile ? "1.875rem" : "2.75rem", fontWeight: 500, color: "#FCFAF5", lineHeight: 1.2, letterSpacing: "0.01em", textShadow: "0 0.25rem 1.75rem rgba(26,25,23,0.55)" }}>
                      {trOnb("welcomeToPalace", "Welcome to your Memory Palace")}
                    </div>
                    <div style={{ fontFamily: T.font.body, fontSize: "0.9375rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.5, marginTop: "0.75rem", maxWidth: "24rem" }}>
                      {trOnb("welcomeSub", "Let's make it yours — it takes about two minutes.")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Setup cards (wizard lang_a11y + name) — demo-local stand-ins.
              The wizard's cards are inline JSX (not exported), and its real
              handlers persist (mp_locale / AccessibilityProvider / profile
              writes) — so the viewer re-renders the SAME layout with local
              state only and a "nothing is saved" note. ── */}
          {(obPhase === "card_lang" || obPhase === "card_name") && (
            <div style={obCardPageStyle}>
              <div style={obCardScrollerStyle}>
                <div style={obCardStyle}>
                  {obPhase === "card_lang" ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <span aria-hidden style={{ width: "2rem", height: "1px", background: `${OB_EMBER_GLYPH}40` }} />
                        <span style={obOverlineStyle}>{trOnb("appName", "The Memory Palace")}</span>
                        <span aria-hidden style={{ width: "2rem", height: "1px", background: `${OB_EMBER_GLYPH}40` }} />
                      </div>
                      <h2 style={obH2Style}>{trOnb("langA11yTitle", "Let's make this comfortable to read")}</h2>
                      {/* Language grid — selection is visual-only demo state */}
                      <div style={{ width: "100%" }}>
                        <h3 style={obSectionLabelStyle}>{trOnb("chooseLangSubtitle", "Choose your language and text size. You can change these anytime in settings.")}</h3>
                        <div role="radiogroup" aria-label={trOnb("chooseLangSubtitle", "Choose your language")} style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: "0.4375rem" }}>
                          {locales.map((loc) => {
                            const active = loc === obLocale;
                            return (
                              <button
                                key={loc}
                                role="radio"
                                aria-checked={active}
                                onClick={() => setObLocale(loc)}
                                style={{
                                  fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: active ? 700 : 500,
                                  padding: "0.6875rem 0.5rem", borderRadius: "0.5rem",
                                  border: `0.125rem solid ${active ? OB_EMBER : OB_HAIRLINE}`,
                                  background: active ? `${OB_EMBER}12` : "#FFF",
                                  color: active ? OB_EMBER : OB_INK,
                                  cursor: "pointer", minHeight: "2.75rem",
                                }}
                              >
                                {localeNames[loc]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div aria-hidden style={{ width: "100%", height: "1px", background: OB_HAIRLINE }} />
                      {/* Text size — visual-only demo state (real card writes AccessibilityProvider) */}
                      <div style={{ width: "100%" }}>
                        <h3 style={obSectionLabelStyle}>{trOnb("textSizeTitle", "Text Size")}</h3>
                        <div role="radiogroup" aria-label={trOnb("textSizeTitle", "Text Size")} style={{ display: "flex", gap: "0.375rem" }}>
                          {(["standard", "comfortable", "large"] as ObTextSize[]).map((size) => {
                            const active = size === obTextSize;
                            const label = trOnb(`textSize${size.charAt(0).toUpperCase() + size.slice(1)}`, size.charAt(0).toUpperCase() + size.slice(1));
                            const fz = size === "standard" ? "0.9375rem" : size === "comfortable" ? "1.0625rem" : "1.25rem";
                            return (
                              <button
                                key={size}
                                role="radio"
                                aria-checked={active}
                                onClick={() => setObTextSize(size)}
                                style={{
                                  flex: 1, minWidth: 0, fontFamily: T.font.body, fontSize: "0.75rem",
                                  fontWeight: active ? 700 : 500,
                                  padding: "0.5rem 0.25rem", borderRadius: "0.5rem",
                                  border: `0.125rem solid ${active ? OB_EMBER : OB_HAIRLINE}`,
                                  background: active ? `${OB_EMBER}12` : "#FFF",
                                  color: active ? OB_EMBER : OB_INK,
                                  cursor: "pointer", minHeight: "3.5rem",
                                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.125rem",
                                }}
                              >
                                <span style={{ fontSize: fz, fontFamily: T.font.display, fontWeight: 400, lineHeight: 1 }}>Aa</span>
                                <span style={{ maxWidth: "100%", overflowWrap: "anywhere", lineHeight: 1.15, textAlign: "center" }}>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <button onClick={() => setObPhase("card_name")} style={{ ...obCtaStyle, width: "100%" }}>
                        {trOnb("continueButton", "Continue")}
                      </button>
                      <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: OB_MUTED, margin: 0 }}>{obDemoNote}</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <span aria-hidden style={{ width: "2rem", height: "1px", background: `${OB_EMBER_GLYPH}40` }} />
                        <span style={obOverlineStyle}>{trOnb("appName", "The Memory Palace")}</span>
                        <span aria-hidden style={{ width: "2rem", height: "1px", background: `${OB_EMBER_GLYPH}40` }} />
                      </div>
                      <h2 style={obH2Style}>{trOnb("nameTitle", "Every palace bears a name")}</h2>
                      <p style={{ fontFamily: T.font.display, fontStyle: "italic", fontSize: "0.9375rem", color: OB_MUTED, maxWidth: "22rem", lineHeight: 1.6, margin: 0 }}>
                        {trOnb("nameAside", "Tell us yours, and we'll carve it above the door.")}
                      </p>
                      {/* Foundation plaque — live derived-title preview (wizard §6.5) */}
                      <div aria-hidden={obName.trim().length === 0} style={{ minHeight: "5.75rem", width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{
                          width: "100%", maxWidth: "20rem", padding: "0.75rem 1rem", borderRadius: "0.625rem",
                          border: `0.0625rem solid ${OB_HAIRLINE}`, background: "#FFFFFF99", textAlign: "center",
                          opacity: obName.trim() ? 1 : 0, transition: "opacity .3s ease",
                        }}>
                          <div style={{ fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: OB_EMBER, marginBottom: "0.375rem" }}>
                            {trOnb("namePlaqueOverline", "Founding deed")}
                          </div>
                          <div style={{ fontFamily: T.font.display, fontStyle: "italic", fontSize: "1.125rem", color: OB_INK, lineHeight: 1.3, overflowWrap: "anywhere" }}>
                            {trOnb("cinematicPalaceName", "{name}'s Palace", { name: obName.trim() })}
                          </div>
                        </div>
                      </div>
                      <input
                        value={obName}
                        onChange={(e) => setObName(e.target.value)}
                        placeholder={trOnb("namePlaceholder", "Your first name")}
                        aria-label={trOnb("namePlaceholder", "Your first name")}
                        maxLength={40}
                        onKeyDown={(e) => { if (e.key === "Enter" && obName.trim()) setObPhase("capture"); }}
                        style={{
                          fontFamily: T.font.display, fontSize: "max(1rem, 16px)", textAlign: "center",
                          padding: "0.875rem 1.5rem", border: `0.09375rem solid ${OB_HAIRLINE}`,
                          borderRadius: "0.625rem", background: "#FFF", color: OB_INK,
                          outline: "none", width: "100%", maxWidth: "20rem",
                        }}
                      />
                      <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
                        <button
                          onClick={() => setObPhase("card_lang")}
                          style={{
                            fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 500,
                            padding: "0 1.25rem", borderRadius: "0.75rem", minHeight: "3.25rem",
                            border: `0.0625rem solid ${OB_HAIRLINE}`, background: "#FFF", color: OB_MUTED, cursor: "pointer",
                          }}
                        >
                          {"←"} {trOnb("backButton", "Back")}
                        </button>
                        <button
                          onClick={() => { if (obName.trim()) setObPhase("capture"); }}
                          disabled={!obName.trim()}
                          style={{ ...obCtaStyle, flex: 1, opacity: obName.trim() ? 1 : 0.5, cursor: obName.trim() ? "pointer" : "not-allowed" }}
                        >
                          {trOnb("continueButton", "Continue")} {"→"}
                        </button>
                      </div>
                      <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: OB_MUTED, margin: 0 }}>{obDemoNote}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Capture card (wizard 'capture', SUCCESS_PLAYBOOK wk 2) —
              demo-local: 3 frame slots + hidden multi photo picker; photos
              stay local dataURLs, the walk then reveals them. "Later" keeps
              the zero-capture fallback path (upload ask after the walk). ── */}
          {obPhase === "capture" && (
            <div style={obCardPageStyle}>
              <div style={obCardScrollerStyle}>
                <div style={obCardStyle}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                      <span aria-hidden style={{ width: "2rem", height: "1px", background: `${OB_EMBER_GLYPH}40` }} />
                      <span style={obOverlineStyle}>{trOnb("appName", "The Memory Palace")}</span>
                      <span aria-hidden style={{ width: "2rem", height: "1px", background: `${OB_EMBER_GLYPH}40` }} />
                    </div>
                    <h2 style={obH2Style}>{trOnb("captureTitle", "Pick 3 photos to hang in your palace")}</h2>
                    <p style={{ fontFamily: T.font.display, fontStyle: "italic", fontSize: "0.9375rem", color: OB_MUTED, maxWidth: "22rem", lineHeight: 1.6, margin: 0 }}>
                      {trOnb("captureAside", "The three you'd save from a fire. We'll hang them on your walls — then we'll walk you to them.")}
                    </p>
                    <input
                      ref={obCaptureInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        e.target.value = "";
                        if (files.length) obReadCaptureFiles(files, Math.max(0, 3 - obCapturedRef.current.length));
                      }}
                    />
                    <div style={{ display: "flex", gap: "0.75rem", width: "100%", justifyContent: "center" }}>
                      {Array.from({ length: 3 }, (_, i) => {
                        const mem = obCaptured[i];
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => obCaptureInputRef.current?.click()}
                            aria-label={mem ? mem.title : trOnb("captureSlotEmpty", "Add a photo")}
                            style={{
                              flex: 1, maxWidth: "7.5rem", aspectRatio: "1 / 1",
                              borderRadius: "0.625rem", padding: 0, overflow: "hidden",
                              cursor: "pointer", position: "relative",
                              border: mem ? `0.125rem solid ${OB_EMBER}` : `0.125rem dashed ${OB_HAIRLINE}`,
                              background: mem ? "#FFF" : "#FFFFFF99",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            {mem ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={mem.dataUrl || ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            ) : (
                              <span aria-hidden style={{ fontFamily: T.font.display, fontSize: "1.75rem", color: OB_MUTED, lineHeight: 1 }}>+</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p aria-live="polite" style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: OB_MUTED, margin: "-0.75rem 0 0", lineHeight: 1.4 }}>
                      {trOnb("captureCount", "{count} of 3 chosen", { count: String(obCaptured.length) })}
                    </p>
                    <button
                      onClick={() => {
                        if (obCaptured.length > 0) {
                          obWalkMemsRef.current = obCapturedRef.current.slice(0, 3);
                          setObPhase("loading");
                        } else {
                          obCaptureInputRef.current?.click();
                        }
                      }}
                      style={{ ...obCtaStyle, width: "100%" }}
                    >
                      {obCaptured.length > 0
                        ? `${trOnb("captureCta", "Hang them in my palace")} →`
                        : trOnb("captureChoose", "Choose your photos")}
                    </button>
                    <button
                      // Wizard mirror: photos already picked still walk with
                      // you even on "later" (the memory exists — reveal it).
                      onClick={() => { obWalkMemsRef.current = obCapturedRef.current.slice(0, 3); setObPhase("loading"); }}
                      style={{
                        fontFamily: T.font.body, fontSize: "0.8125rem", color: OB_MUTED,
                        background: "none", border: "none", cursor: "pointer",
                        textDecoration: "underline", textUnderlineOffset: "0.1875rem",
                        minHeight: "2.75rem", padding: "0.5rem",
                      }}
                    >
                      {trOnb("captureLater", "I'll add photos later")}
                    </button>
                    <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: OB_MUTED, margin: 0 }}>{obDemoNote}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Cinematic captions (wizard 'cinematic' phase): the REAL
              WalkCinematicCaption, with the WP1 prompt rendered inline as
              children — exactly the wizard's layout. ── */}
          {(obPhase === "hold" || obPhase === "paused" || obPhase === "flying") && (
            <WalkCinematicCaption
              isMobile={isMobile}
              overline={trOnb("welcomeTitle", "Welcome to")}
              title={obNameTrimmed
                ? trOnb("cinematicPalaceName", "{name}'s Palace", { name: obNameTrimmed })
                : trOnb("cinematicPalaceNameNeutral", "Your Palace")}
              caption={trOnb("walkExterior", "This is your Memory Palace — a beautiful place to store everything you treasure.")}
            >
              {obPhase === "paused" && !obResumed && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <p style={obPromptTextStyle}>
                    {trOnb("cinematicPrompt", "Ready to visit your palace and fill it with your memories?")}
                  </p>
                  <WalkCtaButton
                    label={trOnb("cinematicYes", "Yes, let's go!")}
                    onClick={() => { setObResumed(true); setObPhase("flying"); }}
                  />
                </div>
              )}
            </WalkCinematicCaption>
          )}

          {/* ── Hall leg: the scene renders its own look-around overlay; SR-only
              caption mirrors the wizard's walk_entrance announcement. ── */}
          {obPhase === "hall" && (
            <div role="status" aria-live="polite" style={{ position: "absolute", width: "1px", height: "1px", margin: "-1px", padding: 0, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>
              {trOnb("walkEntrance", "Through the entrance, you'll find wings for each part of your life.")}
            </div>
          )}

          {/* ── Corridor leg: steps 0-7 with the step-6 "Me, Over Time" prompt ── */}
          {obPhase === "corridor" && obCorridorStep >= 0 && (
            <WalkCinematicCaption
              isMobile={isMobile}
              overline={trOnb("welcomeTitle", "Welcome to")}
              title={obNameTrimmed
                ? trOnb("cinematicPossessive", "{name}'s {thing}", { name: obNameTrimmed, thing: trOnb("corridorWingName", "Roots Wing") })
                : trOnb("corridorWingName", "Roots Wing")}
              caption={
                obCorridorStep >= 2
                  ? trOnb("corridorSubtitle", "Every Wing has Rooms — small spaces within a larger one, each for a chapter with memories of you.")
                  : trOnb("walkCorridor", "Each wing has rooms for your memories — photos, videos, stories.")
              }
            >
              {obCorridorStep >= 6 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                  <p style={obPromptTextStyle}>
                    {trOnb("corridorRoomPromptPrefix", "Your personal Room is")}{" "}
                    <span style={{ color: OB_EMBER, fontWeight: 600 }}>{trOnb("corridorRoomName", "Me, Over Time")}</span>
                  </p>
                  <WalkCtaButton
                    label={obCorridorEnter ? `${trOnb("corridorEnterRoom", "Enter The Room")}…` : trOnb("corridorEnterRoom", "Enter The Room")}
                    onClick={() => setObCorridorEnter(true)}
                    disabled={obCorridorEnter}
                  />
                </div>
              )}
            </WalkCinematicCaption>
          )}

          {/* ── Room leg: steps 0-9 → hang-the-first-memory prompt ── */}
          {obPhase === "room" && obRoomStep >= 0 && (
            <WalkCinematicCaption
              isMobile={isMobile}
              overline={trOnb("welcomeTitle", "Welcome to")}
              title={obNameTrimmed
                ? trOnb("cinematicPossessive", "{name}'s {thing}", { name: obNameTrimmed, thing: trOnb("roomTitle", "Me, Over Time Room") })
                : trOnb("roomTitle", "Me, Over Time Room")}
              caption={
                obRoomStep >= 4
                  ? (obCaptured.length > 0
                      ? trOnb("roomRevealSubtitle", "Your photos are already hanging — this room is yours now.")
                      : trOnb("roomSubtitle", "Every Room in your Palace holds your memories — pictures, videos, voice notes, written stories, and more."))
                  : (obCaptured.length > 0
                      ? trOnb("roomRevealWalk", "This is your first room. Look — the photos you chose made it here first.")
                      : trOnb("walkRoom", "This is your first room. Ready to place your first memory?"))
              }
            >
              {obRoomStep >= 9 && (
                obCaptured.length > 0 ? (
                  /* Capture-first finale (wizard mirror): the walk ends on the
                     picked photos — no upload ask. */
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                    <p style={obPromptTextStyle}>{trOnb("roomRevealPrompt", "That's yours now. It lives here — and at 3 memories, your room grows.")}</p>
                    <WalkCtaButton
                      label={trOnb("roomRevealCta", "Continue")}
                      onClick={() => setObPhase("celebration")}
                    />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                    <p style={obPromptTextStyle}>{trOnb("roomHangPrompt", "Let's hang your first memory on the wall.")}</p>
                    <span style={{
                      display: "inline-block", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                      padding: "0.5rem 1.5rem",
                      background: "rgba(255,255,255,0.08)", color: "rgba(250,250,247,0.65)",
                      border: "0.0625rem solid rgba(255,255,255,0.14)", borderRadius: "0.5rem",
                      whiteSpace: "nowrap", pointerEvents: "none",
                    }}>
                      {trOnb("roomClickPainting", "Click on the empty painting")}
                    </span>
                    <WalkCtaButton
                      label={trOnb("walkAddMemory", "Add a Memory")}
                      onClick={() => setObPhase("upload")}
                    />
                  </div>
                )
              )}
            </WalkCinematicCaption>
          )}

          {/* Skip chip — per-leg skip (wizard's skipWalkLeg), video → room legs */}
          {(["video", "hold", "paused", "flying", "hall", "corridor", "room"] as ObPhase[]).includes(obPhase) && (
            <CinematicSkipChip
              onSkip={obSkipLeg}
              label={obPhase === "video" ? trOnb("cinematicSkip", "Skip intro") : trOnb("walkSkip", "Skip tour")}
            />
          )}

          {/* ── Upload: the REAL ImportHub over the plain room, demo-local
              persistence (the wizard's addMemory store path needs auth — the
              viewer keeps the memory in local state instead). Close = skip
              to the paywall, exactly like the wizard's onClose. ── */}
          {obPhase === "upload" && (
            <ImportHub
              onClose={() => { if (!obImportedRef.current) setObPhase("paywall"); }}
              onImportFiles={async (files) => {
                if (files.length === 0) return;
                obImportedRef.current = true;
                const f = files[0];
                let dataUrl = f.previewUrl || f.url || "";
                if (f.file) {
                  try {
                    dataUrl = await new Promise<string>((res, rej) => {
                      const reader = new FileReader();
                      reader.onload = () => res(reader.result as string);
                      reader.onerror = rej;
                      reader.readAsDataURL(f.file!);
                    });
                  } catch { /* previewUrl fallback */ }
                }
                if (!dataUrl) return;
                const mem = {
                  id: `ob-demo-${Date.now()}`, title: f.name, type: "photo", dataUrl,
                  hue: 18, s: 50, l: 60, displayed: true, createdAt: new Date().toISOString(),
                } as Mem;
                setObMem(mem);
                // Seed the endowed-progress strip (zero-capture fallback path).
                setObCaptured((prev) => (prev.length ? prev : [mem]));
                setObPhase("celebration");
              }}
              onOpenCloudProvider={() => {}}
              initialRoomId="ro1"
              lockRoom
              titleOverride={trOnb("firstMemHubTitle", "Your first memory")}
              subtitleOverride={trOnb("firstMemHubSubtitle", "A photo of yourself, family, or a place you love. You can add everything else later.")}
            />
          )}

          {/* ── Celebration: the REAL ceremonial threshold (gold tick glyph
              only — text is canon INK) + confetti over the room scene showing
              the just-hung demo memory. ── */}
          {obPhase === "celebration" && (
            <OnboardingCelebration
              title={
                obCaptured.length >= 3 ? trOnb("celebrationTitle3", "Three hanging — your palace has begun.")
                : obCaptured.length === 2 ? trOnb("celebrationTitle2of3", "Two hanging. One hook still empty.")
                : obCaptured.length === 1 ? trOnb("celebrationTitle1of3", "One memory home. Two hooks still empty.")
                : trOnb("celebrationTitle2", "Congratulations!")
              }
              subtitle={
                obCaptured.length >= 3 ? trOnb("celebrationSubtitle3", "This is how a life gets kept — a few moments at a time. Keep the habit: one more today.")
                : obCaptured.length >= 1 ? trOnb("celebrationSubtitleHooks", "Palaces come alive at 3 — watch your room grow.")
                : trOnb("celebrationSubtitle2", "Now continue exploring your Memory Palace")
              }
              buttonLabel={trOnb("celebrationAtrium", "Select your plan")}
              onContinue={() => setObPhase("paywall")}
              hint={trOnb("celebrationHandoffHint", "Step inside — a short tour of your Atrium is waiting.")}
              extra={obCaptured.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", width: "100%" }}>
                  <input
                    ref={obCelebInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      e.target.value = "";
                      if (files.length) obReadCaptureFiles(files, 1);
                    }}
                  />
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                    {Array.from({ length: 3 }, (_, i) => {
                      const mem = obCaptured[i];
                      return mem ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={mem.dataUrl || ""} alt="" style={{
                          width: "3rem", height: "3rem", objectFit: "cover", display: "block",
                          borderRadius: "0.5rem", border: `0.125rem solid ${OB_EMBER}`,
                        }} />
                      ) : (
                        <div key={i} aria-hidden style={{
                          width: "3rem", height: "3rem", borderRadius: "0.5rem",
                          border: `0.125rem dashed ${OB_HAIRLINE}`, background: "#FFFFFF66",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: T.font.display, fontSize: "1.25rem", color: OB_MUTED,
                        }}>
                          +
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => obCelebInputRef.current?.click()}
                    style={{
                      fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                      padding: "0 1.25rem", minHeight: "2.75rem", borderRadius: "0.625rem",
                      border: `0.09375rem solid ${OB_EMBER}`, background: "#FFF",
                      color: OB_EMBER, cursor: "pointer",
                    }}
                  >
                    {trOnb("celebrationAddMore", "Add one more (30 sec)")}
                  </button>
                  <p style={{
                    fontFamily: T.font.body, fontStyle: "italic", fontSize: "0.8125rem",
                    color: OB_MUTED, lineHeight: 1.5, margin: 0, maxWidth: "22rem", textAlign: "center",
                  }}>
                    <span aria-hidden style={{ color: OB_EMBER, opacity: 0.8, marginRight: "0.375rem" }}>✦</span>
                    {trOnb("celebrationKepTip", "Next time, skip the app: connect Kep on WhatsApp in Settings and text your photos in — they hang themselves.")}
                  </p>
                </div>
              ) : null}
              transparent
            />
          )}

          {/* ── Paywall (VIEW-ONLY): visual mirror of the wizard's soft trial
              card — both buttons only end the preview, nothing purchases or
              navigates. ── */}
          {obPhase === "paywall" && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 40,
              background: "rgba(252,250,245,0.72)",
              backdropFilter: "blur(0.375rem)", WebkitBackdropFilter: "blur(0.375rem)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
              overflowY: "auto",
              padding: "calc(1.5rem + env(safe-area-inset-top, 0px)) 0 calc(3.5rem + env(safe-area-inset-bottom, 0px))",
            }}>
              <div style={{
                maxWidth: "28rem", width: "92%", margin: "auto",
                padding: isMobile ? "2rem 1.5rem" : "2.5rem 2.25rem",
                background: OB_CREAM, borderRadius: "1rem",
                border: `0.0625rem solid ${OB_HAIRLINE}`,
                boxShadow: "0 1rem 3rem rgba(64,59,54,0.18)",
              }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <span aria-hidden style={{ width: "2rem", height: "1px", background: `${OB_EMBER_GLYPH}40` }} />
                    <span style={obOverlineStyle}>{trOnb("appName", "The Memory Palace")}</span>
                    <span aria-hidden style={{ width: "2rem", height: "1px", background: `${OB_EMBER_GLYPH}40` }} />
                  </div>
                  <h2 style={{ ...obH2Style, fontSize: isMobile ? "1.375rem" : "1.625rem" }}>
                    {trOnb("paywallTitle", "You've built {name}'s Palace", { name: obDisplayName })}
                  </h2>
                  <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: OB_MUTED, maxWidth: "24rem", lineHeight: 1.6, margin: 0 }}>
                    {trOnb("paywallSubtitle", "Unlock 25 GB of storage and bring your whole life story together.")}
                  </p>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem", textAlign: "left" }}>
                    {[
                      trOnb("paywallFeat1", "25 GB for all your memories"),
                      trOnb("paywallFeat2", "Unlimited AI interviews"),
                      trOnb("paywallFeat3", "Collaborate with family & friends"),
                      trOnb("paywallFeat4", "Import from Google, Dropbox & more"),
                    ].map((feat) => (
                      <div key={feat} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        <span aria-hidden style={{ width: "1.25rem", height: "1.25rem", borderRadius: "50%", background: `${OB_EMBER}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg aria-hidden width="0.75rem" height="0.75rem" viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
                            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke={OB_EMBER_GLYPH} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: OB_INK, lineHeight: 1.4 }}>{feat}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setObPhase("done")} style={{ ...obCtaStyle, width: "100%" }}>
                    {trOnb("paywallTrialCta", "Start 14-day free trial")}
                  </button>
                  <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: OB_MUTED, lineHeight: 1.5, margin: "-0.5rem 0 0", maxWidth: "22rem" }}>
                    {trOnb("paywallAutoRenewWeb", "Auto-renewing subscription. Cancel anytime.")}
                  </p>
                  <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontStyle: "italic", color: OB_MUTED, margin: "-0.75rem 0 0" }}>
                    {trFly("onbPaywallNote", "Preview — buttons don't purchase or navigate.")}
                  </p>
                  <button
                    onClick={() => setObPhase("done")}
                    style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", color: OB_MUTED,
                      background: "none", border: "none", cursor: "pointer",
                      textDecoration: "underline", textUnderlineOffset: "0.1875rem",
                      minHeight: "2.75rem", padding: "0.5rem",
                    }}
                  >
                    {trOnb("paywallContinueFree", "Continue with Free plan")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hall hint chip — dismissible extra over the §10 in-scene overlay */}
          {obPhase === "hall" && obHallHint && (
            <div
              role="status"
              style={{
                position: "absolute",
                bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
                left: "50%", transform: "translateX(-50%)",
                zIndex: 31,
                width: "max-content", maxWidth: "min(92vw, 24rem)",
                padding: "0.625rem 1rem",
                background: "rgba(252,250,245,0.88)",
                backdropFilter: "blur(0.75rem)", WebkitBackdropFilter: "blur(0.75rem)",
                border: "0.0625rem solid #E3D6BC", borderRadius: "0.75rem",
                boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)",
                fontFamily: T.font.body, fontSize: "0.8125rem", color: "#403B36",
                textAlign: "center", lineHeight: 1.45,
                pointerEvents: "none",
                animation: obReduceMotion ? "obv-fadeIn 200ms linear both" : "obv-riseIn 300ms ease-out both",
              }}
            >
              {trFly("onbHallHint", "Look around — each door leads to a wing of your life.")}
            </div>
          )}

          {/* End card — Replay (EMBER pill) + Back-to-scenes (ghost hairline) */}
          {obPhase === "done" && (
            <div
              style={{
                position: "absolute", inset: 0, zIndex: 45,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "1.5rem", pointerEvents: "none",
              }}
            >
              <div
                style={{
                  pointerEvents: "auto",
                  width: "100%", maxWidth: "22rem",
                  background: "rgba(252,250,245,0.92)",
                  backdropFilter: "blur(0.75rem)", WebkitBackdropFilter: "blur(0.75rem)",
                  border: "0.0625rem solid #E3D6BC", borderRadius: "1rem",
                  boxShadow: "0 1rem 3rem rgba(64,59,54,0.18)",
                  padding: "1.75rem 2rem", textAlign: "center",
                  animation: obReduceMotion ? "obv-fadeIn 200ms linear both" : "obv-riseCard 300ms ease-out both",
                }}
              >
                <h2
                  style={{
                    fontFamily: T.font.display, fontWeight: 600,
                    fontSize: "1.375rem", lineHeight: 1.3,
                    color: "#403B36", margin: "0 0 1.25rem",
                  }}
                >
                  {trFly("onbDoneTitle", "That's the full onboarding flow.")}
                </h2>
                <button
                  type="button"
                  className="obv-cta"
                  onClick={resetOb}
                  style={{
                    width: "100%", minHeight: "2.75rem",
                    background: "#B85C38", color: "#FFFFFF",
                    border: "none", borderRadius: "2rem",
                    fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                    padding: "0.625rem 1.5rem", cursor: "pointer",
                  }}
                >
                  {trFly("onbReplay", "Replay")}
                </button>
                <button
                  type="button"
                  className="obv-cta"
                  onClick={() => { resetOb(); setCurrentScene(0); }}
                  style={{
                    width: "100%", minHeight: "2.75rem", marginTop: "0.625rem",
                    background: "transparent", color: "#716A5E",
                    border: "0.0625rem solid #E3D6BC", borderRadius: "2rem",
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                    padding: "0.625rem 1.5rem", cursor: "pointer",
                  }}
                >
                  {trFly("onbBack", "Back to scenes")}
                </button>
              </div>
            </div>
          )}

          {/* Viewer-chrome keyframes + focus rings (the skip chip's .cpo-chip
              rule lives in the card's <style>, which unmounts with the card —
              re-declared here so the chip keeps its EMBER ring standalone). */}
          <style>{`
            @keyframes obv-riseIn { from { opacity: 0; transform: translate(-50%, 0.5rem); } to { opacity: 1; transform: translate(-50%, 0); } }
            @keyframes obv-riseCard { from { opacity: 0; transform: translateY(0.5rem); } to { opacity: 1; transform: translateY(0); } }
            @keyframes obv-fadeIn { from { opacity: 0; } to { opacity: 1; } }
            .obv-cta:focus-visible, .cpo-chip:focus-visible { outline: 0.1875rem solid #B85C38; outline-offset: 0.1875rem; }
          `}</style>
        </>
      )}

      {/* Pulse animation for recording indicator */}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
