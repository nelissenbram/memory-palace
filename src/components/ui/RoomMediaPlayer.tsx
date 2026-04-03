"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { TYPE_ICONS } from "@/lib/constants/type-icons";
import type { Mem } from "@/lib/constants/defaults";
import Image from "next/image";

interface RoomMediaPlayerProps {
  memories: Mem[];
  initialIndex: number;
  onClose: () => void;
  onEdit: (mem: Mem) => void;
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

export default function RoomMediaPlayer({ memories, initialIndex, onClose, onEdit }: RoomMediaPlayerProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");

  const [index, setIndex] = useState(Math.max(0, Math.min(initialIndex, memories.length - 1)));
  const [showInfo, setShowInfo] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [transitioning, setTransitioning] = useState(false);

  const thumbStripRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const mem = memories[index];
  const total = memories.length;

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
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "i" || e.key === "I") setShowInfo(prev => !prev);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goPrev, goNext]);

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
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, t: Date.now() };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.t;
    touchStartRef.current = null;

    // Only trigger if horizontal swipe > 50px, not too vertical, and fast enough
    if (Math.abs(dx) > 50 && Math.abs(dy) < Math.abs(dx) * 0.7 && dt < 500) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }, [goNext, goPrev]);

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
    if (t === "audio" || t === "voice" || m.voiceBlob) return "audio";
    if (t === "text" || t === "document" || t === "story" || m.documentBlob) return "text";
    return "photo";
  };

  const mediaType = getMediaType(mem);

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
            <span style={{ fontSize: "4rem", marginBottom: "1rem" }}>{TYPE_ICONS[mem.type] || "\u{1F5BC}\uFE0F"}</span>
          </div>
        );

      case "video":
        return (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {mem.dataUrl ? (
              <video
                key={mem.id}
                controls
                autoPlay
                style={{
                  maxWidth: "92%", maxHeight: "88%",
                  borderRadius: "0.5rem",
                  boxShadow: "0 0.5rem 2rem rgba(0,0,0,0.4)",
                }}
              >
                <source src={mem.dataUrl} />
              </video>
            ) : (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem",
                color: "rgba(255,255,255,0.4)", fontFamily: T.font.body, fontSize: "1rem",
              }}>
                <span style={{ fontSize: "4rem" }}>{TYPE_ICONS.video}</span>
                <span>{mem.title}</span>
              </div>
            )}
          </div>
        );

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
                style={{ width: "min(24rem, 85%)" }}
              >
                <source src={mem.dataUrl} />
              </audio>
            )}
          </div>
        );

      case "text":
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
              <h2 style={{
                fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 700,
                color: "rgba(255,255,255,0.92)", margin: "0 0 1.25rem",
                letterSpacing: "0.01em", lineHeight: 1.3,
              }}>
                {mem.title}
              </h2>
              <p style={{
                fontFamily: T.font.display, fontSize: "1.0625rem", lineHeight: 1.8,
                color: "rgba(255,255,255,0.75)", margin: 0, whiteSpace: "pre-wrap",
              }}>
                {mem.desc || mem.dataUrl || t("mediaPlayerNoContent")}
              </p>
            </div>
          </div>
        );

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

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.92)",
        display: "flex", flexDirection: "column",
        animation: "rmpFadeIn 0.2s ease both",
      }}
    >
      <style>{PLAYER_STYLES}</style>

      {/* ─── Top bar ─── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "0.625rem 0.75rem" : "0.75rem 1.25rem",
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

          {/* Info toggle */}
          <button
            className="rmp-ctrl-btn"
            onClick={() => setShowInfo(prev => !prev)}
            title={t("mediaPlayerInfo")}
            style={{
              ...ctrlBtnStyle,
              background: showInfo ? "rgba(255,255,255,0.18)" : ctrlBtnStyle.background,
            }}
            aria-label={t("mediaPlayerInfo")}
          >
            i
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

        {/* ─── Info overlay ─── */}
        {showInfo && mem && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              bottom: 0, left: 0, right: 0,
              background: "linear-gradient(transparent, rgba(0,0,0,0.85) 30%)",
              padding: isMobile ? "3rem 1rem 1rem" : "4rem 2rem 1.25rem",
              animation: "rmpSlideUp 0.25s ease both",
            }}
          >
            <div style={{ maxWidth: "40rem" }}>
              {/* Title */}
              <h3 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.125rem" : "1.375rem",
                fontWeight: 700, color: "rgba(255,255,255,0.92)",
                margin: "0 0 0.375rem", letterSpacing: "0.01em",
              }}>
                {mem.title}
              </h3>

              {/* Type badge + date row */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "0.25rem",
                  padding: "0.1875rem 0.5rem", borderRadius: "0.3125rem",
                  background: "rgba(255,255,255,0.1)", border: "0.0625rem solid rgba(255,255,255,0.15)",
                  fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                  color: "rgba(255,255,255,0.7)", textTransform: "uppercase" as const,
                  letterSpacing: "0.05em",
                }}>
                  <span>{TYPE_ICONS[mem.type] || "\u{1F4C4}"}</span>
                  {mem.type}
                </span>
                {mem.createdAt && (
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.5)",
                  }}>
                    {new Date(mem.createdAt).toLocaleDateString(undefined, {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </span>
                )}
                {mem.locationName && (
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.5)",
                    display: "flex", alignItems: "center", gap: "0.1875rem",
                  }}>
                    {"\u{1F4CD}"} {mem.locationName}
                  </span>
                )}
              </div>

              {/* Description */}
              {mem.desc && (
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", lineHeight: 1.6,
                  color: "rgba(255,255,255,0.6)", margin: "0 0 0.625rem",
                  maxHeight: "4.5rem", overflow: "hidden",
                }}>
                  {mem.desc}
                </p>
              )}

              {/* Edit button */}
              <button
                onClick={() => onEdit(mem)}
                style={{
                  padding: "0.375rem 0.875rem", borderRadius: "0.375rem",
                  background: `${T.color.terracotta}30`,
                  border: `0.0625rem solid ${T.color.terracotta}50`,
                  color: T.color.terracotta,
                  fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                  cursor: "pointer", letterSpacing: "0.02em",
                  transition: "background 0.2s ease",
                }}
              >
                {t("mediaPlayerEdit")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Thumbnail strip ─── */}
      <div style={{
        flexShrink: 0,
        padding: isMobile ? "0.5rem 0.5rem 0.625rem" : "0.625rem 1rem 0.75rem",
        background: "rgba(0,0,0,0.5)",
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
                {m.dataUrl && (getMediaType(m) === "photo" || getMediaType(m) === "video") ? (
                  <Image
                    src={m.dataUrl}
                    alt={m.title}
                    fill
                    unoptimized
                    style={{ objectFit: "cover" }}
                    sizes="3.25rem"
                  />
                ) : (
                  <span style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: "100%", height: "100%", fontSize: "1rem",
                  }}>
                    {TYPE_ICONS[m.type] || "\u{1F4C4}"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
