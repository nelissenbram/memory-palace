"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Toast, { type ToastData } from "@/components/ui/Toast";
import dynamic from "next/dynamic";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";

// Lazy-load scene components to avoid SSR issues with Three.js
const ExteriorScene = dynamic(() => import("@/components/3d/ExteriorScene"), { ssr: false });
const EntranceHallScene = dynamic(() => import("@/components/3d/EntranceHallScene"), { ssr: false });
const CorridorScene = dynamic(() => import("@/components/3d/CorridorScene"), { ssr: false });
const InteriorScene = dynamic(() => import("@/components/3d/InteriorScene"), { ssr: false });

// Sample memories for the room scene — combine all family room defaults
const SAMPLE_MEMORIES: Mem[] = [
  ...(ROOM_MEMS["ro1"] || []),
].map(m => ({ ...m, displayed: true }));

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
];

const FADE_MS = 600;

export default function FlythroughPage() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [phase, setPhase] = useState<"idle" | "recording" | "done">("idle");
  const [currentScene, setCurrentScene] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeOpacity, setFadeOpacity] = useState(1);
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
    if (sceneIdx >= SCENES.length) {
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
      const totalMs = SCENES.reduce((s, sc) => s + sc.duration, 0) + SCENES.length * FADE_MS;
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
          />
        );
      case 2:
        return (
          <CorridorScene
            wingId="roots"
            onDoorHover={noop}
            onDoorClick={noop}
            hoveredDoor={null}
            styleEra="roman"
          />
        );
      case 3:
        return (
          <InteriorScene
            roomId="roots"
            actualRoomId="ro1"
            memories={SAMPLE_MEMORIES}
            onMemoryClick={noop}
            styleEra="roman"
          />
        );
      default:
        return null;
    }
  };

  const sceneName = SCENES[currentScene]?.name ?? "";
  const totalSec = SCENES.reduce((s, sc) => s + sc.duration, 0) / 1000;

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
        {renderScene()}
      </div>

      {/* Controls overlay */}
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

      {/* Scene indicators at bottom */}
      {phase === "recording" && (
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
            display: "flex",
            gap: "0.5rem",
            pointerEvents: "none",
          }}
        >
          {SCENES.map((s, i) => (
            <div
              key={s.name}
              style={{
                padding: "0.25rem 0.75rem",
                borderRadius: "12px",
                fontSize: "0.7rem",
                fontFamily: "system-ui, sans-serif",
                color: i === currentScene ? "#fff" : "rgba(255,255,255,0.4)",
                background: i === currentScene ? "rgba(192,57,43,0.8)" : "rgba(255,255,255,0.1)",
                transition: "all 0.3s ease",
              }}
            >
              {s.name}
            </div>
          ))}
        </div>
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
