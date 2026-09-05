"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { TYPE_ICONS, TypeIcon } from "@/lib/constants/type-icons";
import type { Mem } from "@/lib/constants/defaults";
import Image from "next/image";
import { MediaThumb } from "./MediaThumb";
import { CalendarIcon, MapPinIcon, PeopleIcon, EyeIcon, DoorIcon, ShareIcon, RestoreIcon, TrashIcon } from "./MemoryDetail";

interface RoomMediaPlayerProps {
  memories: Mem[];
  initialIndex: number;
  onClose: () => void;
  onEdit: (mem: Mem) => void;
  onUpdate?: (memId: string, updates: Partial<Mem>) => void;
  /** where this memory lives in the palace — shown as "Wing › Room" provenance */
  storedIn?: (memId: string) => { wing: string; room: string; accent: string } | null;
  /** Quick-actions chip row (same actions as MemoryDetail's bar): tapping a
   *  chip hands the current memory + action id back to the parent, which opens
   *  MemoryDetail with that ActionCard pre-expanded (initialAction). */
  onQuickAction?: (mem: Mem, actionId: string) => void;
}

/* ─── Styles injected once ─── */
const PLAYER_STYLES = `
@keyframes rmpFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes rmpSlideUp { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }
@keyframes rmpFadeSwitch { 0% { opacity: 1; } 40% { opacity: 0; } 60% { opacity: 0; } 100% { opacity: 1; } }
.rmp-thumb::-webkit-scrollbar { height: 0.25rem; }
.rmp-thumb::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 0.125rem; }
.rmp-thumb::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 0.125rem; }
.rmp-nav-btn:hover { background: rgba(255,255,255,0.18) !important; }
.rmp-ctrl-btn:hover { background: rgba(255,255,255,0.18) !important; }
`;

export default function RoomMediaPlayer({ memories, initialIndex, onClose, onEdit, onUpdate, storedIn, onQuickAction }: RoomMediaPlayerProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  // Chip labels reuse MemoryDetail's namespace so viewer chips and the
  // ActionCards they open always carry identical wording.
  const { t: tmd } = useTranslation("memoryDetail");

  const [index, setIndex] = useState(Math.max(0, Math.min(initialIndex, memories.length - 1)));
  const [autoPlay, setAutoPlay] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [infoPanelOpen, setInfoPanelOpen] = useState(true);

  const thumbStripRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; t: number; target: EventTarget | null } | null>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  /* Video playback state — the opening tap's gesture context is gone by the time
     this lazy component mounts, so muted autoplay is best-effort; when it's
     refused (or the file fails) we surface an overlay instead of a black frame. */
  const videoRef = useRef<HTMLVideoElement>(null);
  const [vidBlocked, setVidBlocked] = useState(false);
  const [vidError, setVidError] = useState(false);
  /* Owner bug "video is silent": muted autoplay used to WIN silently with no
     unmute affordance. Now the nudge tries UNMUTED first (the opening tap gives
     Chromium sticky activation, so sound usually just works); when the browser
     refuses, we fall back to muted and show a "Tap for sound" pill that unmutes
     inside the tap gesture. `soundIntentRef` carries the user's intent across
     prev/next remounts (never force-reset to muted once they chose sound);
     `expectedMutedRef` tells our own programmatic mute/unmute apart from the
     user toggling the native controls (volumechange fires for both). */
  const [vidMutedFallback, setVidMutedFallback] = useState(false);
  const soundIntentRef = useRef(true);
  const expectedMutedRef = useRef(true);

  const mem: Mem | undefined = memories[index];
  const total = memories.length;

  /* Track the current memory by id so a shrinking/reordered `memories` array
     (e.g. an inline edit dropping the mem out of the active filter) can't
     silently swap or crash the player. */
  const currentIdRef = useRef<string | null>(mem?.id ?? null);

  /* Adopt the id of whatever memory we intentionally navigated to. */
  useEffect(() => {
    const m = memories[index];
    if (m) currentIdRef.current = m.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  /* Reconcile index when the live `memories` array changes. */
  useEffect(() => {
    const id = currentIdRef.current;
    const found = id ? memories.findIndex(m => m.id === id) : -1;
    if (found >= 0) {
      if (found !== index) setIndex(found);
      return;
    }
    if (memories.length === 0) {
      onClose();
      return;
    }
    const clamped = Math.max(0, Math.min(index, memories.length - 1));
    currentIdRef.current = memories[clamped].id;
    if (clamped !== index) setIndex(clamped);
  }, [memories, index, onClose]);

  /* Pre-generate random bar heights to avoid hydration mismatch */
  const barHeights = useRef(Array.from({ length: 40 }, (_, i) => 1 + Math.sin(i * 0.5) * 2.5 + Math.random() * 1.5));

  /* ─── Navigation ─── */
  const goTo = useCallback((newIdx: number) => {
    if (newIdx < 0 || newIdx >= memories.length || newIdx === index) return;
    setTransitioning(true);
    setTimeout(() => {
      setIndex(newIdx);
      setZoom(1);
      setTransitioning(false);
    }, 150);
  }, [index, memories.length]);

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);

  /* ─── Keyboard ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle shortcuts while editing title/description
      if (editingTitle || editingDesc) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if ((e.key === "e" || e.key === "E" || e.key === "i" || e.key === "I") && mem) onEdit(mem);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goPrev, goNext, onEdit, mem, editingTitle, editingDesc]);

  /* ─── Auto-play slideshow ─── */
  useEffect(() => {
    if (autoPlay) {
      autoPlayRef.current = setInterval(() => {
        setIndex(prev => {
          const next = prev + 1;
          return next >= memories.length ? 0 : next;
        });
        setZoom(1);
      }, 5000);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [autoPlay, memories.length]);

  /* ─── Video autoplay nudge + blocked detection ─── */
  useEffect(() => {
    setVidBlocked(false); setVidError(false); setVidMutedFallback(false);
    // Each item's <video> remounts (key) with the muted attribute — realign the
    // "expected" mirror so the first volumechange isn't read as a user action.
    expectedMutedRef.current = true;
  }, [mem?.id]);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Give the muted autoPlay attribute a beat, then honour sound intent:
    // try UNMUTED first (the tap that opened/navigated grants activation on
    // Chromium); if the browser refuses, keep playing muted and surface the
    // "Tap for sound" pill; if even muted play fails, show tap-to-play.
    const id = setTimeout(() => {
      if (v.ended) return;
      if (soundIntentRef.current) {
        expectedMutedRef.current = false; v.muted = false;
        v.play().then(() => setVidMutedFallback(false)).catch(() => {
          expectedMutedRef.current = true; v.muted = true;
          v.play().then(() => setVidMutedFallback(true)).catch(() => setVidBlocked(true));
        });
      } else if (v.paused) {
        v.play().catch(() => setVidBlocked(true));
      }
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mem?.id]);
  const tapToPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    // In-gesture: try with sound first, fall back to muted (+ pill to unmute)
    expectedMutedRef.current = false; v.muted = false;
    v.play().then(() => { setVidBlocked(false); setVidMutedFallback(false); soundIntentRef.current = true; }).catch(() => {
      expectedMutedRef.current = true; v.muted = true;
      v.play().then(() => { setVidBlocked(false); setVidMutedFallback(true); }).catch(() => {});
    });
  }, []);
  /* "Tap for sound" pill — unmute inside the user gesture (always allowed). */
  const tapForSound = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    soundIntentRef.current = true;
    expectedMutedRef.current = false;
    v.muted = false;
    if (v.paused) v.play().catch(() => {});
    setVidMutedFallback(false);
  }, []);
  /* Native-controls mute/unmute → adopt as intent for prev/next; our own
     programmatic changes echo back matching expectedMutedRef and are ignored. */
  const onVolumeChange = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.muted === expectedMutedRef.current) return;
    expectedMutedRef.current = v.muted;
    soundIntentRef.current = !v.muted;
    setVidMutedFallback(false);
  }, []);

  /* ─── Scroll active thumb into view ─── */
  useEffect(() => {
    if (thumbStripRef.current) {
      const child = thumbStripRef.current.children[index] as HTMLElement | undefined;
      if (child) {
        child.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [index]);

  /* ─── Touch / swipe ─── */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now(), target: e.target };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;

    // Ignore touches that started on interactive/scrollable children
    // (media controls, buttons, inputs, the horizontally scrollable thumbnail strip)
    const startEl = start.target instanceof Element ? start.target : null;
    if (startEl?.closest("video, audio, button, input, textarea, a, .rmp-thumb")) return;

    // Ignore swipes while zoomed in — panning a zoomed photo isn't navigation
    if (zoom > 1) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const dt = Date.now() - start.t;

    // Only trigger if horizontal swipe > 50px, not too vertical, and fast enough
    if (Math.abs(dx) > 50 && Math.abs(dy) < Math.abs(dx) * 0.7 && dt < 500) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }, [goNext, goPrev, zoom]);

  /* ─── Zoom via scroll wheel ─── */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (mem?.type !== "photo" && mem?.type !== "painting") return;
    e.preventDefault();
    setZoom(prev => Math.max(0.5, Math.min(5, prev - e.deltaY * 0.002)));
  }, [mem?.type]);

  /* ─── Media type detection ─── */
  const getMediaType = (m: Mem): "photo" | "video" | "audio" | "text" => {
    const t = m.type.toLowerCase();
    if (t === "video" || m.videoBlob) return "video";
    // Legacy 'voice' memories carrying an audio dataUrl are real audio, not text
    if (t === "voice" && m.dataUrl?.startsWith("data:audio")) return "audio";
    if (t === "interview" || t === "voice") return "text";
    if (t === "audio" || m.voiceBlob) return "audio";
    if (t === "text" || t === "document" || t === "story" || m.documentBlob) return "text";
    return "photo";
  };

  const mediaType = mem ? getMediaType(mem) : "photo";

  /* ─── Render media content ─── */
  const renderMedia = () => {
    if (!mem) return null;

    switch (mediaType) {
      case "photo":
        return mem.dataUrl ? (
          <div
            style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", cursor: zoom > 1 ? "grab" : "zoom-in",
            }}
            onWheel={handleWheel}
            onClick={() => { if (zoom === 1) setZoom(2); else setZoom(1); }}
          >
            <img
              src={mem.dataUrl}
              alt={mem.title}
              decoding="async"
              style={{
                maxWidth: "100%", maxHeight: "100%",
                objectFit: "contain",
                transform: `scale(${zoom})`,
                transition: "transform 0.2s ease",
                borderRadius: "0.25rem",
              }}
              draggable={false}
            />
          </div>
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.4)", fontFamily: T.font.display, fontSize: "1.5rem",
          }}>
            <span style={{ marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}><TypeIcon type={mem.type} size={64} color="rgba(255,255,255,0.4)" /></span>
          </div>
        );

      case "video": {
        return (
          <div style={{
            width: "100%", height: "100%", position: "relative",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {mem.dataUrl ? (
              <>
              <video
                key={mem.id}
                ref={videoRef}
                controls
                autoPlay
                muted
                playsInline
                preload="auto"
                onPlaying={() => setVidBlocked(false)}
                onError={() => setVidError(true)}
                onVolumeChange={onVolumeChange}
                /* Owner R2 #6: plain dataUrl, NO ?stream=1 — same path as the Library/
                   Ledger players that work: /api/media 302-redirects to a presigned R2
                   URL (CDN + native Range). ?stream=1 proxied every byte through the
                   API route, which mobile <video> stalled on. A <video> draws to no
                   canvas, so the same-origin/tainting reason for stream=1 never
                   applied here. (Supabase-legacy files stream from the route either
                   way, with Range support.) */
                src={mem.dataUrl}
                style={{
                  maxWidth: "92%", maxHeight: "88%",
                  borderRadius: "0.5rem",
                  boxShadow: "0 0.5rem 2rem rgba(36,28,21,0.5)",
                }}
              />
              {/* Couldn't load — say so instead of a dead black frame */}
              {vidError && (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem",
                  background: "rgba(36,28,21,0.65)", borderRadius: "0.5rem",
                  color: "rgba(255,255,255,0.75)", fontFamily: T.font.body, fontSize: "0.9375rem",
                }}>
                  <TypeIcon type="video" size={40} color="rgba(255,255,255,0.45)" />
                  <span>{t("mediaPlayerVideoError") !== "mediaPlayerVideoError" ? t("mediaPlayerVideoError") : "This video couldn't be loaded"}</span>
                </div>
              )}
              {/* Playing muted (unmuted autoplay refused) — "Tap for sound" pill;
                  the unmute happens inside the tap gesture, so it always works. */}
              {vidMutedFallback && !vidBlocked && !vidError && (
                <button
                  onClick={tapForSound}
                  aria-label={t("mediaPlayerTapForSound") !== "mediaPlayerTapForSound" ? t("mediaPlayerTapForSound") : "Tap for sound"}
                  style={{
                    position: "absolute", top: "1rem", left: "50%", transform: "translateX(-50%)",
                    display: "inline-flex", alignItems: "center", gap: "0.5rem",
                    minHeight: "2.75rem", padding: "0.5rem 1.125rem",
                    borderRadius: "2rem",
                    background: T.color.terracotta, border: "none", cursor: "pointer",
                    color: "#fff", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                    letterSpacing: "0.02em",
                    boxShadow: "0 0.25rem 1rem rgba(36,28,21,0.45)",
                    zIndex: 5,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                  <span>{t("mediaPlayerTapForSound") !== "mediaPlayerTapForSound" ? t("mediaPlayerTapForSound") : "Tap for sound"}</span>
                </button>
              )}
              {/* Autoplay blocked — visible tap-to-play affordance (user gesture) */}
              {vidBlocked && !vidError && (
                <button
                  onClick={tapToPlay}
                  aria-label={t("mediaPlayerTapToPlay") !== "mediaPlayerTapToPlay" ? t("mediaPlayerTapToPlay") : "Tap to play"}
                  style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.625rem",
                    background: "rgba(36,28,21,0.35)", border: "none", cursor: "pointer",
                  }}
                >
                  <span style={{
                    width: "3.5rem", height: "3.5rem", borderRadius: "50%",
                    background: T.color.terracotta, color: "#fff", fontSize: "1.375rem",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 0.25rem 1rem rgba(36,28,21,0.45)",
                  }}>{"▶"}</span>
                  <span style={{ color: "rgba(255,255,255,0.9)", fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600 }}>
                    {t("mediaPlayerTapToPlay") !== "mediaPlayerTapToPlay" ? t("mediaPlayerTapToPlay") : "Tap to play"}
                  </span>
                </button>
              )}
              </>
            ) : mem.thumbnailUrl ? (
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                <img
                  src={mem.thumbnailUrl || mem.dataUrl!}
                  alt={mem.title}
                  decoding="async"
                  style={{ maxWidth: "92%", maxHeight: "88%", objectFit: "contain", borderRadius: "0.5rem", boxShadow: "0 0.5rem 2rem rgba(36,28,21,0.5)" }}
                  draggable={false}
                />
                <div style={{ position: "absolute", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", padding: "0.375rem 0.875rem", borderRadius: "1rem", background: "rgba(36,28,21,0.65)", color: "rgba(255,255,255,0.7)", fontFamily: T.font.body, fontSize: "0.75rem" }}>
                  {t("videoThumbnailOnly")}
                </div>
              </div>
            ) : (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem",
                color: "rgba(255,255,255,0.4)", fontFamily: T.font.body, fontSize: "1rem",
              }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}><TypeIcon type="video" size={64} color="rgba(255,255,255,0.4)" /></span>
                <span>{mem.title}</span>
              </div>
            )}
          </div>
        );
      }

      case "audio":
        return (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: "1.5rem",
          }}>
            {/* Audio visualization placeholder */}
            <div style={{
              width: "min(20rem, 80%)", height: "6rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.1875rem",
            }}>
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} style={{
                  width: "0.1875rem", borderRadius: "0.125rem",
                  height: `${barHeights.current[i]}rem`,
                  background: `linear-gradient(180deg, ${T.color.terracotta}, ${T.color.walnut})`,
                  opacity: 0.6,
                }} />
              ))}
            </div>
            <p style={{
              fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 600,
              color: "rgba(255,255,255,0.85)", margin: 0,
            }}>
              {mem.title}
            </p>
            {mem.dataUrl && (
              <audio
                key={mem.id}
                controls
                autoPlay
                preload="metadata"
                src={mem.dataUrl}
                style={{ width: "min(24rem, 85%)" }}
              />
            )}
          </div>
        );

      case "text": {
        // Never dump a raw dataUrl/URL (e.g. base64 PDF) as story text — offer
        // an open/download affordance for file-backed memories instead.
        const fallback = mem.dataUrl || "";
        const fallbackIsFileUrl = /^(data:|blob:|https?:\/\/|\/api)/i.test(fallback);
        return (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: isMobile ? "1rem" : "2rem",
          }}>
            <div style={{
              maxWidth: "40rem", width: "100%",
              maxHeight: "80%", overflow: "auto",
              background: "rgba(255,255,255,0.06)",
              border: "0.0625rem solid rgba(255,255,255,0.1)",
              borderRadius: "1rem",
              padding: isMobile ? "1.5rem" : "2.5rem",
              backdropFilter: "blur(1rem)",
            }}>
              {/* Interview badge */}
              {(mem.type === "interview" || mem.type === "voice") && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  marginBottom: "1rem", opacity: 0.6,
                }}>
                  <TypeIcon type="interview" size={18} color="rgba(255,255,255,0.7)" />
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                    color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}>
                    {t("mediaPlayerInterview")}
                  </span>
                </div>
              )}
              <h2 style={{
                fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 700,
                color: "rgba(255,255,255,0.92)", margin: "0 0 1.25rem",
                letterSpacing: "0.01em", lineHeight: 1.3,
              }}>
                {mem.title}
              </h2>
              {fallbackIsFileUrl ? (
                <>
                  {mem.desc && (
                    <p style={{
                      fontFamily: T.font.display, fontSize: "1.0625rem", lineHeight: 1.8,
                      color: "rgba(255,255,255,0.75)", margin: "0 0 1.25rem", whiteSpace: "pre-wrap",
                    }}>
                      {mem.desc}
                    </p>
                  )}
                  <a
                    href={mem.dataUrl!}
                    download={mem.title}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.625rem 1.25rem",
                      borderRadius: "0.5rem",
                      background: "rgba(184,92,56,0.25)",
                      border: "0.0625rem solid #B85C38",
                      color: "rgba(255,255,255,0.92)",
                      fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 600,
                      letterSpacing: "0.02em",
                      textDecoration: "none",
                      cursor: "pointer",
                      transition: "background 0.2s ease",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {t("mediaPlayerOpenDocument") !== "mediaPlayerOpenDocument" ? t("mediaPlayerOpenDocument") : "Open document"}
                  </a>
                </>
              ) : (
                <p style={{
                  fontFamily: T.font.display, fontSize: "1.0625rem", lineHeight: 1.8,
                  color: "rgba(255,255,255,0.75)", margin: 0, whiteSpace: "pre-wrap",
                }}>
                  {mem.desc || mem.dataUrl || t("mediaPlayerNoContent")}
                </p>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  /* ─── Nav button style ─── */
  const navBtnStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    top: "50%",
    [side]: isMobile ? "0.5rem" : "1.25rem",
    transform: "translateY(-50%)",
    width: isMobile ? "2.5rem" : "3rem",
    height: isMobile ? "2.5rem" : "3rem",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.1)",
    border: "0.0625rem solid rgba(255,255,255,0.15)",
    color: "rgba(255,255,255,0.8)",
    fontSize: "1.25rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(0.5rem)",
    WebkitBackdropFilter: "blur(0.5rem)",
    transition: "background 0.2s ease",
    zIndex: 10,
  });

  /* ─── Control button style ─── */
  const ctrlBtnStyle: React.CSSProperties = {
    width: "2.25rem", height: "2.25rem", borderRadius: "50%",
    background: "rgba(255,255,255,0.1)",
    border: "0.0625rem solid rgba(255,255,255,0.15)",
    color: "rgba(255,255,255,0.8)",
    fontSize: "0.875rem", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    backdropFilter: "blur(0.5rem)", WebkitBackdropFilter: "blur(0.5rem)",
    transition: "background 0.2s ease",
  };

  /* If the current memory vanished from the live array, render nothing for
     this frame — the reconciliation effect above re-points or closes. */
  if (!mem) return null;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(31,27,26,0.94)",
        display: "flex", flexDirection: "column",
        animation: "rmpFadeIn 0.2s ease both",
      }}
    >
      <style>{PLAYER_STYLES}</style>

      {/* ─── Top bar ─── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: `max(${isMobile ? "0.625rem" : "0.75rem"}, env(safe-area-inset-top, 0px))`,
        paddingBottom: isMobile ? "0.625rem" : "0.75rem",
        paddingLeft: `max(${isMobile ? "0.75rem" : "1.25rem"}, env(safe-area-inset-left, 0px))`,
        paddingRight: `max(${isMobile ? "0.75rem" : "1.25rem"}, env(safe-area-inset-right, 0px))`,
        flexShrink: 0, zIndex: 20,
      }}>
        {/* Counter */}
        <span style={{
          fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
          color: "rgba(255,255,255,0.6)", letterSpacing: "0.02em",
        }}>
          {t("mediaPlayerCounter", { current: String(index + 1), total: String(total) })}
        </span>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Auto-play toggle (only for photos) */}
          {mediaType === "photo" && (
            <button
              className="rmp-ctrl-btn"
              onClick={() => setAutoPlay(prev => !prev)}
              title={t("mediaPlayerAutoPlay")}
              style={{
                ...ctrlBtnStyle,
                background: autoPlay ? `${T.color.terracotta}40` : ctrlBtnStyle.background,
                border: autoPlay ? `0.0625rem solid ${T.color.terracotta}60` : ctrlBtnStyle.border,
              }}
              aria-label={t("mediaPlayerAutoPlay")}
            >
              {autoPlay ? "\u23F8" : "\u25B6"}
            </button>
          )}

          {/* Edit button — opens detail editor directly */}
          <button
            className="rmp-ctrl-btn"
            onClick={() => onEdit(mem)}
            title={t("mediaPlayerEdit")}
            style={{
              ...ctrlBtnStyle,
              display: "flex", alignItems: "center", gap: "0.375rem",
              padding: "0 0.75rem",
              width: "auto",
              minWidth: ctrlBtnStyle.width,
            }}
            aria-label={t("mediaPlayerEdit")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.03em" }}>
              {t("mediaPlayerEdit")}
            </span>
          </button>

          {/* Close */}
          <button
            className="rmp-ctrl-btn"
            onClick={onClose}
            style={ctrlBtnStyle}
            aria-label={tc("close")}
          >
            {"\u2715"}
          </button>
        </div>
      </div>

      {/* ─── Main media area ─── */}
      <div style={{
        flex: 1, position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: transitioning ? 0 : 1,
        transition: "opacity 0.15s ease",
      }}>
        {renderMedia()}

        {/* Left arrow */}
        {index > 0 && (
          <button
            className="rmp-nav-btn"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            style={navBtnStyle("left")}
            aria-label={t("mediaPlayerPrev")}
          >
            {"\u2039"}
          </button>
        )}

        {/* Right arrow */}
        {index < total - 1 && (
          <button
            className="rmp-nav-btn"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            style={navBtnStyle("right")}
            aria-label={t("mediaPlayerNext")}
          >
            {"\u203A"}
          </button>
        )}

        {/* overlay removed — title/desc moved below media area */}
      </div>

      {/* ─── Title + description bar (below media, no overlap) ─── */}
      {mem && (
        <div style={{
          flexShrink: 0,
          padding: isMobile ? "0.625rem 1rem 0.5rem" : "0.625rem 2rem 0.5rem",
          background: "rgba(36,28,21,0.72)",
          borderTop: "0.0625rem solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "flex-start", gap: isMobile ? "0.75rem" : "1.5rem",
        }}>
          {/* Left: title + description */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title — click to edit */}
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => {
                  setEditingTitle(false);
                  if (titleDraft.trim() && titleDraft !== mem.title) {
                    onUpdate?.(mem.id, { title: titleDraft.trim() });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") { e.stopPropagation(); setTitleDraft(mem.title); setEditingTitle(false); }
                }}
                style={{
                  fontFamily: T.font.display, fontSize: isMobile ? "1.125rem" : "1.375rem",
                  fontWeight: 700, color: "rgba(255,255,255,0.95)",
                  background: "rgba(255,255,255,0.08)",
                  border: `0.0625rem solid ${T.color.terracotta}80`,
                  borderRadius: "0.375rem",
                  padding: "0.25rem 0.5rem",
                  width: "100%",
                  outline: "none",
                  letterSpacing: "0.01em",
                }}
              />
            ) : (
              <h3
                onClick={() => { setTitleDraft(mem.title); setEditingTitle(true); }}
                style={{
                  fontFamily: T.font.display, fontSize: isMobile ? "1.125rem" : "1.375rem",
                  fontWeight: 700, color: "rgba(255,255,255,0.92)",
                  margin: 0, letterSpacing: "0.01em",
                  cursor: "text",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  lineHeight: 1.3,
                }}
              >
                {mem.title}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </h3>
            )}

            {/* Provenance — where this memory lives in the palace */}
            {(() => {
              const loc = storedIn?.(mem.id);
              if (!loc) return null;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", margin: "0.25rem 0 0" }}>
                  <span aria-hidden="true" style={{ width: "0.4375rem", height: "0.4375rem", borderRadius: "50%", background: loc.accent, boxShadow: "0 0 0 0.09375rem rgba(252,250,245,0.25)", flexShrink: 0 }} />
                  <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500, color: "rgba(255,255,255,0.55)", letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {loc.wing} {"›"} {loc.room}
                  </span>
                </div>
              );
            })()}

            {/* Description — click to edit */}
            {editingDesc ? (
              <textarea
                autoFocus
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={() => {
                  setEditingDesc(false);
                  if (descDraft !== (mem.desc || "")) {
                    onUpdate?.(mem.id, { desc: descDraft.trim() });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { e.stopPropagation(); setDescDraft(mem.desc || ""); setEditingDesc(false); }
                }}
                rows={3}
                style={{
                  fontFamily: T.font.display, fontSize: isMobile ? "0.9375rem" : "1rem",
                  color: "rgba(255,255,255,0.85)",
                  background: "rgba(255,255,255,0.08)",
                  border: `0.0625rem solid ${T.color.terracotta}80`,
                  borderRadius: "0.375rem",
                  padding: "0.375rem 0.5rem",
                  width: "100%", resize: "vertical",
                  outline: "none",
                  lineHeight: 1.6, marginTop: "0.25rem",
                }}
              />
            ) : (
              <p
                onClick={() => { setDescDraft(mem.desc || ""); setEditingDesc(true); }}
                style={{
                  fontFamily: T.font.display, fontSize: isMobile ? "0.9375rem" : "1rem",
                  color: "rgba(255,255,255,0.55)",
                  margin: "0.25rem 0 0",
                  lineHeight: 1.5, cursor: "text",
                  maxHeight: isMobile ? "2.75rem" : "3rem", overflow: "hidden",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                }}
              >
                {mem.desc || t("mediaPlayerAddDescription") || "Add a description\u2026"}
              </p>
            )}
          </div>

          {/* Right: date */}
          {mem.createdAt && (
            <span style={{
              fontFamily: T.font.body, fontSize: "0.75rem",
              color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap",
              marginTop: "0.25rem",
            }}>
              {new Date(mem.createdAt).toLocaleDateString(undefined, {
                year: "numeric", month: "short", day: "numeric",
              })}
            </span>
          )}
        </div>
      )}

      {/* ─── Quick-actions chip row (same actions as MemoryDetail's bar) ───
          Always inside the viewer's initial viewport (fixed flex column), so
          the actions are visible the moment a media item is opened; each chip
          deep-links into MemoryDetail with that ActionCard pre-opened. */}
      {onQuickAction && mem && (
        <div
          className="rmp-thumb"
          role="toolbar"
          aria-label={tmd("quickActions")}
          style={{
            flexShrink: 0,
            display: "flex", gap: "0.375rem",
            overflowX: "auto", overflowY: "hidden",
            padding: `0.5rem max(${isMobile ? "0.75rem" : "1.25rem"}, env(safe-area-inset-left, 0px)) 0.375rem`,
            background: "rgba(36,28,21,0.72)",
            borderTop: "0.0625rem solid rgba(255,255,255,0.06)",
          }}
        >
          {([
            { id: "date", label: tmd("dateLabel"), icon: (c: string) => <CalendarIcon color={c} /> },
            { id: "location", label: tmd("locationLabel"), icon: (c: string) => <MapPinIcon color={c} /> },
            { id: "people", label: tmd("tagPeople"), icon: (c: string) => <PeopleIcon color={c} /> },
            { id: "visibility", label: tmd("visibility"), icon: (c: string) => <EyeIcon color={c} /> },
            { id: "moveRoom", label: tmd("moveToRoom"), icon: (c: string) => <DoorIcon color={c} /> },
            { id: "share", label: tmd("shareBtn"), icon: (c: string) => <ShareIcon color={c} /> },
            ...(mem.type === "photo" && mem.dataUrl
              ? [{ id: "restore", label: tmd("restorePhotoTitle"), icon: (c: string) => <RestoreIcon color={c} /> }]
              : []),
            { id: "delete", label: tmd("deleteBtn"), icon: (c: string) => <TrashIcon color={c} /> },
          ] as { id: string; label: string; icon: (c: string) => React.ReactNode }[]).map((qa) => {
            const danger = qa.id === "delete";
            const glyph = danger ? "rgba(224,122,95,0.9)" : "rgba(255,255,255,0.75)";
            return (
              <button
                key={qa.id}
                type="button"
                onClick={() => onQuickAction(mem, qa.id)}
                style={{
                  flexShrink: 0,
                  display: "inline-flex", alignItems: "center", gap: "0.375rem",
                  minHeight: isMobile ? "2.75rem" : "2.25rem",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "2rem",
                  border: `0.0625rem solid ${danger ? "rgba(224,122,95,0.4)" : "rgba(255,255,255,0.15)"}`,
                  background: "rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                  color: danger ? "rgba(224,122,95,0.9)" : "rgba(255,255,255,0.85)",
                  whiteSpace: "nowrap",
                  transition: "background 0.2s ease",
                }}
              >
                {qa.icon(glyph)}
                <span>{qa.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Thumbnail strip ─── */}
      <div style={{
        flexShrink: 0,
        paddingTop: isMobile ? "0.5rem" : "0.625rem",
        paddingBottom: `max(${isMobile ? "0.625rem" : "0.75rem"}, env(safe-area-inset-bottom, 0px))`,
        paddingLeft: `max(${isMobile ? "0.5rem" : "1rem"}, env(safe-area-inset-left, 0px))`,
        paddingRight: `max(${isMobile ? "0.5rem" : "1rem"}, env(safe-area-inset-right, 0px))`,
        background: "rgba(36,28,21,0.6)",
        borderTop: "0.0625rem solid rgba(255,255,255,0.06)",
      }}>
        <div
          ref={thumbStripRef}
          className="rmp-thumb"
          style={{
            display: "flex", gap: "0.375rem",
            overflowX: "auto", overflowY: "hidden",
            scrollBehavior: "smooth",
            padding: "0.125rem 0",
          }}
        >
          {memories.map((m, i) => {
            const isActive = i === index;
            return (
              <button
                key={m.id}
                onClick={() => goTo(i)}
                title={m.title}
                style={{
                  flexShrink: 0,
                  width: isMobile ? "2.75rem" : "3.25rem",
                  height: isMobile ? "2.75rem" : "3.25rem",
                  borderRadius: "0.375rem",
                  border: isActive
                    ? `0.125rem solid ${T.color.terracotta}`
                    : "0.0625rem solid rgba(255,255,255,0.1)",
                  background: isActive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  overflow: "hidden",
                  position: "relative",
                  opacity: isActive ? 1 : 0.6,
                  transition: "all 0.2s ease",
                  padding: 0,
                }}
                aria-label={`${m.title} (${i + 1}/${total})`}
              >
                <MediaThumb mem={m} size="100%" borderRadius="0" iconSize={16} iconColor="rgba(255,255,255,0.5)" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
