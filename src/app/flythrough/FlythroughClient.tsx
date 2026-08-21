"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Toast, { type ToastData } from "@/components/ui/Toast";
import dynamic from "next/dynamic";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";

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
// ── Onboarding preview (scene 4) — ONBOARDING_ELEVATION_PLAN §11 ──
// Login-free preview of the onboarding cinematic handoffs: exterior WP1-hold →
// prompt → 5-waypoint flyover + zoom → auto-enter entrance hall → look-around →
// end card. Mounts the REAL OnboardingSceneHost (unchanged) with local demo
// state only; NEVER writes any onboarding localStorage key. Lives behind the
// same prod-404 gate in flythrough/page.tsx (contract 4 — untouched).
const OnboardingSceneHost = dynamic(() => import("@/components/ui/OnboardingSceneHost"), { ssr: false });
const CinematicPromptOverlay = dynamic(() => import("@/components/ui/CinematicPromptOverlay"), { ssr: false });
const CinematicSkipChip = dynamic(() => import("@/components/ui/CinematicPromptOverlay").then((m) => m.CinematicSkipChip), { ssr: false });

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
  _dm(300, { type: "audio", dataUrl: "/demo/song-of-summer.mp3", displayUnit: "vinyl", title: "Song of Summer" }),
  _dm(400, { type: "video", dataUrl: "/demo/piano-recital.mp4", displayUnit: "screen", title: "Piano Recital" }),
];

// ── Scalability review viewers (?scene=room&fill=max | min) ──
// MAX: the room grown to its top tier — ~100 wall paintings (packed to the
// texture budget, the rest reported as "…N more in the archive"), a fully-filled
// L-vitrine, several bookcase documents, and audio + video on the player medium.
const SAMPLE_MEMORIES_MAX: Mem[] = [
  ...Array.from({ length: 100 }, (_, i) => _dm(i, {})),
  ...Array.from({ length: 14 }, (_, i) => _dm(1000 + i, { type: "photo", displayUnit: "vitrine", title: `Keepsake ${i + 1}` })),
  ...Array.from({ length: 6 }, (_, i) => _dm(2000 + i, { type: "text", displayUnit: "bookshelf", title: `Letter ${i + 1}` })),
  _dm(3000, { type: "audio", dataUrl: "/demo/song-of-summer.mp3", displayUnit: "vinyl", title: "Song of Summer" }),
  _dm(4000, { type: "video", dataUrl: "/demo/piano-recital.mp4", displayUnit: "screen", title: "Piano Recital" }),
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

// A second demo room so the Ledger's "From another room" flow can be reviewed.
const OTHER_ROOM_FEED = [{
  id: "ro2", name: "Sunday Lunches",
  mems: [
    _dm(9001, { title: "Nonna's table" }),
    _dm(9002, { title: "The garden in June" }),
    _dm(9003, { title: "Uncle's toast", type: "audio", dataUrl: "/demo/song-of-summer.mp3", displayUnit: "vinyl" }),
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

// Onboarding-preview phase machine (plan §11): loading (cream veil, fades on
// onReady) → hold (WP1 approach runs) → paused (scene fired its one-shot
// cinematic pause; prompt card shown) → flying (resumed; WP2–5 + zoom run
// untouched) → hall (look-around; hint chip 5s/pointerdown) → done (end card).
type ObPhase = "loading" | "hold" | "paused" | "flying" | "hall" | "done";

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
  useEffect(() => {
    setCurrentScene(initialSceneFromURL());
    applyFill(fillFromURL());
    setMounted(true);
  }, [applyFill]);
  const [progress, setProgress] = useState(0);
  const [fadeOpacity, setFadeOpacity] = useState(1);

  // ── Onboarding preview state (scene 4) — plan §11 obPhase machine ──
  const isMobile = useIsMobile();
  const [obReduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const { t: tOnb } = useTranslation("onboarding");
  // "flythrough" is a NEW messages section (plan §12, i18n workstream). The
  // cast keeps this compiling before the section lands; the try/catch keeps it
  // WORKING before it lands (t() throws on a missing section) — either way the
  // plan's EN fallback renders. tr(key, fallback) guard pattern per R10.
  const { t: tFlyRaw } = useTranslation("flythrough" as unknown as Parameters<typeof useTranslation>[0]);
  const trOnb = useCallback((k: string, f: string) => {
    try { const v = tOnb(k); return v === k ? f : v; } catch { return f; }
  }, [tOnb]);
  const trFly = useCallback((k: string, f: string) => {
    try { const v = tFlyRaw(k); return v === k ? f : v; } catch { return f; }
  }, [tFlyRaw]);
  const [obPhase, setObPhase] = useState<ObPhase>("loading");
  const [obScene, setObScene] = useState<"exterior" | "entrance">("exterior");
  const [obResumed, setObResumed] = useState(false);
  const [obHallHint, setObHallHint] = useState(true);
  // Fresh key per (re)entry — the scene's one-shot cinematic refs restart cleanly.
  const [obKey, setObKey] = useState(0);
  // The exterior fires onCinematicPause exactly once — mirror with a ref so a
  // stray re-fire can never bounce a later phase back to "paused".
  const obPauseFiredRef = useRef(false);
  const resetOb = useCallback(() => {
    setObPhase("loading");
    setObScene("exterior");
    setObResumed(false);
    setObHallHint(true);
    obPauseFiredRef.current = false;
    setObKey((k) => k + 1);
  }, []);
  // Scene-pill switch (or the recorder's reset to scene 0) resets ALL ob-state.
  useEffect(() => { resetOb(); }, [currentScene, resetOb]);
  // Hall hint chip: dismiss after 5s or on first pointerdown — never other timers.
  useEffect(() => {
    if (obPhase !== "hall") return;
    const tmo = setTimeout(() => setObHallHint(false), 5000);
    const dismiss = () => setObHallHint(false);
    window.addEventListener("pointerdown", dismiss);
    return () => { clearTimeout(tmo); window.removeEventListener("pointerdown", dismiss); };
  }, [obPhase]);
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
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
    };
  }, []);

  const advanceScene = useCallback((sceneIdx: number) => {
    // Recorder iterates 0–3 only — the Onboarding scene (4) is never recorded.
    if (sceneIdx >= RECORD_SCENE_COUNT) {
      // Done — stop recording
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
      return;
    }

    // Crossfade: fade out
    setFadeOpacity(0);

    setTimeout(() => {
      setCurrentScene(sceneIdx);
      // Fade in
      setTimeout(() => setFadeOpacity(1), 50);

      // Schedule next scene
      timerRef.current = setTimeout(() => {
        advanceScene(sceneIdx + 1);
      }, SCENES[sceneIdx].duration);
    }, FADE_MS);
  }, []);

  const startRecording = useCallback(async () => {
    // Reset state
    setCurrentScene(0);
    setFadeOpacity(1);
    setProgress(0);
    chunksRef.current = [];

    // Wait a tick for the first scene to mount
    await new Promise((r) => setTimeout(r, 200));

    // Find the Three.js canvas
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      setToast({ message: "No canvas found — wait for the 3D scene to load and try again.", type: "warning" });
      return;
    }

    // Check codec support and pick best available
    const codecs = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    const mimeType = codecs.find((c) => MediaRecorder.isTypeSupported(c));
    if (!mimeType) {
      setToast({ message: "Your browser does not support WebM recording.", type: "error" });
      return;
    }

    const stream = canvas.captureStream(60);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `palace-flythrough-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setPhase("done");
      if (progressRef.current) clearInterval(progressRef.current);
    };

    recorderRef.current = recorder;
    recorder.start(500); // collect data every 500ms
    setPhase("recording");
    startTimeRef.current = Date.now();

    // Progress ticker
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const totalMs = SCENES.slice(0, RECORD_SCENE_COUNT).reduce((s, sc) => s + sc.duration, 0) + RECORD_SCENE_COUNT * FADE_MS;
      setProgress(Math.min(elapsed / totalMs, 1));
    }, 100);

    // Start scene sequencing — first scene plays immediately
    timerRef.current = setTimeout(() => {
      advanceScene(1);
    }, SCENES[0].duration);
  }, [advanceScene]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (recorderRef.current && recorderRef.current.state === "recording") {
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
          />
        );
      case 1:
        return (
          <EntranceHallScene
            onDoorClick={noop}
            styleEra="roman"
            lunettePhotos={DEMO_LUNETTES}
          />
        );
      case 2:
        return (
          <CorridorScene
            wingId="roots"
            rooms={DEMO_CORRIDOR_ROOMS}
            corridorPaintings={DEMO_CORRIDOR_PAINTINGS}
            onDoorHover={noop}
            onDoorClick={noop}
            hoveredDoor={null}
            styleEra="roman"
          />
        );
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
          />
        );
      case 4:
        // Onboarding preview — the REAL onboarding scene host (unchanged
        // component) driven by the local obPhase machine. Camera choreography
        // is consumed via its existing contract, never edited (contract 3).
        return (
          <OnboardingSceneHost
            key={`ob-${obKey}`}
            scene={obScene}
            onboardingMode
            isMobile={isMobile}
            onReady={() => setObPhase((p) => (p === "loading" ? "hold" : p))}
            onCinematicPause={() => {
              if (obPauseFiredRef.current) return;
              obPauseFiredRef.current = true;
              setObPhase((p) => (p === "loading" || p === "hold" ? "paused" : p));
            }}
            cinematicResumed={obResumed}
            onRoomClick={(id: string, arrived?: boolean) => {
              // Arrival contract: the cinematic zoom/autoWalk ends AT the door
              // and fires ("__entrance__", true) → auto-enter the hall. Plain
              // (non-arrived) taps are ignored — no stranded camera.
              if (id === "__entrance__" && arrived) {
                setObScene("entrance");
                setObPhase("hall");
              }
            }}
            // Hall look-around hands off via onDoorClick("roots") (§10 —
            // untouched); any door click in the preview ends the tour too.
            // (No onOnboardingLookDone: the host only wires that prop to
            // InteriorScene, which this preview never mounts — it could
            // never fire here.)
            onDoorClick={() => setObPhase("done")}
          />
        );
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

      {/* ── Onboarding preview chrome (scene 4, plan §11) ──
          Pure viewer UI over the sealed cinematic: cream loading veil, badge,
          skip chip (hold→hall, obPhase-driven — never timers), WP1 prompt
          card, hall hint chip, end card. No onboarding localStorage writes. */}
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

          {/* Skip chip — visible across obPhase hold→hall (shared component) */}
          {(obPhase === "hold" || obPhase === "paused" || obPhase === "flying" || obPhase === "hall") && (
            <CinematicSkipChip onSkip={() => setObPhase("done")} label={trFly("onbSkip", "Skip")} />
          )}

          {/* WP1 pause-prompt card — viewer passes flythrough-section copy */}
          <CinematicPromptOverlay
            visible={obPhase === "paused"}
            isMobile={isMobile}
            onBegin={() => { setObResumed(true); setObPhase("flying"); }}
            onSkip={() => setObPhase("done")}
            title={trFly("onbPromptTitle", "Welcome to your palace")}
            body={trFly("onbPromptBody", "Every memory you keep will live inside these walls. Ready to take a look?")}
            ctaLabel={trFly("onbPromptCta", "Show me around")}
            skipLabel={trFly("onbSkip", "Skip")}
          />

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
                  {trFly("onbDoneTitle", "That's the welcome tour.")}
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
