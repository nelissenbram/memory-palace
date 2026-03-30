"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import Image from "next/image";

// ═══ Per-type slot limits for 3D display ═══
const DISPLAY_LIMITS: Record<string, number> = {
  photo: 5, painting: 1, album: 3, video: 1, orb: 4, case: 3, audio: 1, document: 4,
};

const TYPE_ICONS: Record<string, string> = {
  photo: "\u{1F5BC}\uFE0F", painting: "\u{1F3A8}", video: "\u{1F3AC}", album: "\u{1F4D6}",
  orb: "\u{1F52E}", case: "\u{1F3FA}", audio: "\u{1F3B5}", document: "\u{1F4DC}",
};

interface Props {
  mems: Mem[];
  wing: Wing | null | undefined;
  room: WingRoom | null | undefined;
  onClose: () => void;
  onUpdate: (memId: string, updates: Partial<Mem>) => void;
  onSelect: (mem: Mem) => void;
}

type ViewMode = "grid" | "player";
type FilterType = string | null;

export default function RoomGallery({ mems, wing, room, onClose, onUpdate, onSelect }: Props) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("roomGallery");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const accent = wing?.accent || T.color.terracotta;
  const [mode, setMode] = useState<ViewMode>("grid");
  const [filter, setFilter] = useState<FilterType>(null);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showDisplayMgr, setShowDisplayMgr] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const slideTimer = useRef<NodeJS.Timeout | null>(null);

  // Filter memories
  const filtered = filter ? mems.filter((m) => m.type === filter) : mems;
  const typeGroups = groupByType(mems);
  const playerMem = filtered[playerIdx] || null;

  // Count displayed per type
  const displayedCounts: Record<string, number> = {};
  for (const m of mems) {
    if (m.displayed !== false) {
      displayedCounts[m.type] = (displayedCounts[m.type] || 0) + 1;
    }
  }

  // Slideshow auto-advance for photos
  useEffect(() => {
    if (mode === "player" && playing && playerMem && !isMedia(playerMem)) {
      slideTimer.current = setTimeout(() => {
        setPlayerIdx((i) => (i + 1) % filtered.length);
      }, 4000);
    }
    return () => { if (slideTimer.current) clearTimeout(slideTimer.current); };
  }, [mode, playing, playerIdx, playerMem, filtered.length]);

  const toggleDisplay = (mem: Mem) => {
    const currentlyDisplayed = mem.displayed !== false;
    const typeCount = displayedCounts[mem.type] || 0;
    const limit = DISPLAY_LIMITS[mem.type] || 4;

    if (currentlyDisplayed) {
      // Always allow hiding
      onUpdate(mem.id, { displayed: false });
    } else if (typeCount < limit) {
      onUpdate(mem.id, { displayed: true });
    }
    // else: at limit, can't display more
  };

  const openPlayer = (idx: number) => {
    setPlayerIdx(idx);
    setMode("player");
    setPlaying(false);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,15,10,.7)", backdropFilter: "blur(12px)",
      zIndex: 60, animation: "fadeIn .2s ease", display: "flex", alignItems: "stretch",
    }}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("gallery")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={(e) => e.stopPropagation()} style={{
        flex: 1, maxWidth: isMobile ? undefined : "57.5rem", margin: isMobile ? 0 : "auto",
        maxHeight: isMobile ? "100%" : "92vh",
        width: isMobile ? "100%" : undefined, height: isMobile ? "100%" : undefined,
        display: "flex", flexDirection: "column",
        background: `${T.color.linen}f8`, borderRadius: isMobile ? 0 : "1.25rem",
        border: isMobile ? "none" : `1px solid ${T.color.cream}`,
        boxShadow: isMobile ? "none" : "0 24px 80px rgba(20,15,10,.5)",
        animation: isMobile ? "fadeIn .2s ease" : "fadeUp .3s ease", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <span style={{ fontSize: "1.375rem" }}>{room?.icon}</span>
              <div>
                <h3 style={{ fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 600, color: T.color.charcoal, margin: 0 }}>{room?.name} {t("gallery")}</h3>
                <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, margin: "0.125rem 0 0" }}>
                  {mems.length} {t("memories")} {mems.filter((m) => m.displayed !== false).length < mems.length && `· ${mems.filter((m) => m.displayed !== false).length} ${t("displayedInRoom")}`}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.375rem", alignItems: "center" }}>
              {/* View mode toggle */}
              <div style={{ display: "flex", background: T.color.warmStone, borderRadius: "0.5rem", padding: "0.125rem" }}>
                <button onClick={() => setMode("grid")} style={{
                  padding: "0.375rem 0.75rem", borderRadius: "0.375rem", border: "none",
                  background: mode === "grid" ? T.color.white : "transparent",
                  fontFamily: T.font.body, fontSize: "0.6875rem", color: mode === "grid" ? T.color.charcoal : T.color.muted, cursor: "pointer",
                }}>{"\u25A6"} {t("grid")}</button>
                <button onClick={() => { setMode("player"); setPlayerIdx(0); }} style={{
                  padding: "0.375rem 0.75rem", borderRadius: "0.375rem", border: "none",
                  background: mode === "player" ? T.color.white : "transparent",
                  fontFamily: T.font.body, fontSize: "0.6875rem", color: mode === "player" ? T.color.charcoal : T.color.muted, cursor: "pointer",
                }}>{"\u25B6"} {t("player")}</button>
              </div>
              <button onClick={() => setShowDisplayMgr(!showDisplayMgr)} style={{
                padding: "0.375rem 0.75rem", borderRadius: "0.5rem", border: `1px solid ${showDisplayMgr ? accent + "60" : T.color.cream}`,
                background: showDisplayMgr ? accent + "10" : T.color.white,
                fontFamily: T.font.body, fontSize: "0.6875rem", color: showDisplayMgr ? accent : T.color.muted, cursor: "pointer",
              }}>{"\u{1F3DB}\uFE0F"} {t("display")}</button>
              <button onClick={onClose} style={{
                width: "2rem", height: "2rem", borderRadius: "1rem", border: `1px solid ${T.color.cream}`,
                background: T.color.warmStone, color: T.color.muted, fontSize: "0.875rem", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{"\u2715"}</button>
            </div>
          </div>

          {/* Type filter tabs */}
          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            <button onClick={() => setFilter(null)} style={{
              padding: "0.3125rem 0.75rem", borderRadius: "0.5rem", border: filter === null ? `1.5px solid ${accent}` : `1px solid ${T.color.cream}`,
              background: filter === null ? accent + "10" : T.color.white,
              fontFamily: T.font.body, fontSize: "0.6875rem", color: filter === null ? accent : T.color.muted, cursor: "pointer",
            }}>{t("all")} ({mems.length})</button>
            {Object.entries(typeGroups).map(([type, items]) => (
              <button key={type} onClick={() => setFilter(type)} style={{
                padding: "0.3125rem 0.625rem", borderRadius: "0.5rem", border: filter === type ? `1.5px solid ${accent}` : `1px solid ${T.color.cream}`,
                background: filter === type ? accent + "10" : T.color.white,
                fontFamily: T.font.body, fontSize: "0.6875rem", color: filter === type ? accent : T.color.muted, cursor: "pointer",
              }}>{TYPE_ICONS[type] || ""} {type} ({items.length})</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "0 1.5rem 1.25rem" }}>
          {/* ═══ DISPLAY MANAGER ═══ */}
          {showDisplayMgr && (
            <div style={{
              marginBottom: "1rem", padding: "1rem", borderRadius: "0.875rem",
              background: `${accent}06`, border: `1px solid ${accent}25`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
                <div>
                  <div style={{ fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600, color: T.color.charcoal }}>
                    {t("displaySettings")}
                  </div>
                  <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, margin: "0.25rem 0 0", lineHeight: 1.5 }}>
                    {t("displaySettingsDesc")}
                  </p>
                </div>
              </div>

              {/* Slot overview */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(10rem, 1fr))", gap: "0.5rem", marginBottom: "0.875rem" }}>
                {Object.entries(typeGroups).map(([type, items]) => {
                  const limit = DISPLAY_LIMITS[type] || 4;
                  const shown = items.filter((m) => m.displayed !== false).length;
                  const hidden = items.filter((m) => m.displayed === false).length;
                  return (
                    <div key={type} style={{ background: T.color.white, borderRadius: "0.625rem", padding: "0.625rem 0.75rem", border: `1px solid ${T.color.cream}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                        <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500, color: T.color.charcoal }}>
                          {TYPE_ICONS[type]} {type}
                        </span>
                        <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: shown >= limit ? accent : T.color.muted }}>
                          {shown}/{limit} {t("slots")}
                        </span>
                      </div>
                      <div style={{ height: "0.1875rem", borderRadius: "0.125rem", background: T.color.cream, marginBottom: "0.25rem" }}>
                        <div style={{ height: "100%", borderRadius: "0.125rem", background: accent, width: `${Math.min(100, (shown / limit) * 100)}%`, transition: "width .3s" }} />
                      </div>
                      {hidden > 0 && <div style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted }}>
                        {hidden} {t("storedNotDisplayed")}
                      </div>}
                    </div>
                  );
                })}
              </div>

              {/* Unallocated memories list */}
              {(() => {
                const unallocated = mems.filter((m) => m.displayed === false);
                if (unallocated.length === 0) return null;
                return (
                  <div>
                    <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.walnut, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: ".5px" }}>
                      {t("storedMemories")} ({unallocated.length}) — {t("clickToDisplay")}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: "12.5rem", overflowY: "auto" }}>
                      {unallocated.map((mem) => {
                        const typeCount = displayedCounts[mem.type] || 0;
                        const limit = DISPLAY_LIMITS[mem.type] || 4;
                        const canDisplay = typeCount < limit;
                        return (
                          <div key={mem.id} style={{
                            display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.625rem",
                            borderRadius: "0.625rem", background: T.color.white, border: `1px solid ${T.color.cream}`,
                          }}>
                            {/* Thumb */}
                            <div style={{
                              width: "2.25rem", height: "2.25rem", borderRadius: "0.375rem", flexShrink: 0, overflow: "hidden",
                              background: mem.dataUrl ? `url(${mem.dataUrl}) center/cover` : `hsl(${mem.hue},${mem.s}%,${mem.l}%)`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {!mem.dataUrl && <span style={{ fontSize: "0.875rem", opacity: 0.4 }}>{TYPE_ICONS[mem.type]}</span>}
                            </div>
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {mem.title}
                              </div>
                              <div style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted }}>
                                {TYPE_ICONS[mem.type]} {mem.type} — {canDisplay ? `${limit - typeCount} ${limit - typeCount > 1 ? t("slotsAvailable") : t("slotAvailable")}` : t("allSlotsFull")}
                              </div>
                            </div>
                            {/* Display button */}
                            <button onClick={() => toggleDisplay(mem)} disabled={!canDisplay}
                              style={{
                                padding: "0.375rem 0.75rem", borderRadius: "0.5rem", border: "none",
                                background: canDisplay ? accent : `${T.color.sandstone}30`,
                                color: canDisplay ? "#FFF" : T.color.muted,
                                fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 500, cursor: canDisplay ? "pointer" : "default",
                                whiteSpace: "nowrap",
                              }}>
                              {canDisplay ? t("displayBtn") : t("full")}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Currently displayed — allow removing */}
              {(() => {
                const displayed = mems.filter((m) => m.displayed !== false && mems.some((m2) => m2.displayed === false));
                if (displayed.length === 0) return null;
                return (
                  <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.walnut, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: ".5px" }}>
                      {t("currentlyDisplayed")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                      {displayed.map((mem) => (
                        <button key={mem.id} onClick={() => toggleDisplay(mem)}
                          style={{
                            display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.3125rem 0.625rem",
                            borderRadius: "0.5rem", border: `1px solid ${accent}30`, background: `${accent}08`,
                            fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.charcoal, cursor: "pointer",
                          }}>
                          {TYPE_ICONS[mem.type]} {mem.title.length > 20 ? mem.title.slice(0, 20) + "..." : mem.title}
                          <span style={{ color: T.color.muted, fontSize: "0.625rem" }}>{"\u2715"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══ GRID VIEW ═══ */}
          {mode === "grid" && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(8.75rem, 1fr))", gap: isMobile ? "0.5rem" : "0.625rem" }}>
              {filtered.map((mem, idx) => {
                const isDisplayed = mem.displayed !== false;
                const typeLimit = DISPLAY_LIMITS[mem.type] || 4;
                const typeDisplayed = displayedCounts[mem.type] || 0;
                const canDisplay = isDisplayed || typeDisplayed < typeLimit;

                return (
                  <div key={mem.id} style={{
                    borderRadius: "0.75rem", overflow: "hidden", border: `1px solid ${T.color.cream}`,
                    background: T.color.white, cursor: "pointer", position: "relative",
                    transition: "transform .15s, box-shadow .15s",
                  }}
                    onMouseEnter={(e) => { (e.currentTarget).style.transform = "translateY(-2px)"; (e.currentTarget).style.boxShadow = "0 8px 24px rgba(0,0,0,.1)"; }}
                    onMouseLeave={(e) => { (e.currentTarget).style.transform = "none"; (e.currentTarget).style.boxShadow = "none"; }}
                  >
                    {/* Thumbnail */}
                    <div onClick={() => openPlayer(idx)} style={{
                      height: "6.25rem", background: mem.dataUrl ? `url(${mem.dataUrl}) center/cover` : `linear-gradient(135deg, hsl(${mem.hue},${mem.s}%,${mem.l}%), hsl(${mem.hue + 20},${mem.s - 5}%,${mem.l - 8}%))`,
                      display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                    }}>
                      {!mem.dataUrl && <span style={{ fontSize: "1.75rem", opacity: 0.3 }}>{TYPE_ICONS[mem.type] || ""}</span>}
                      {isMedia(mem) && <div style={{
                        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(0,0,0,.2)",
                      }}>
                        <div style={{
                          width: "2.25rem", height: "2.25rem", borderRadius: "1.125rem", background: "rgba(255,255,255,.9)",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem",
                        }}>{"\u25B6"}</div>
                      </div>}
                    </div>

                    {/* Info */}
                    <div style={{ padding: "0.5rem 0.625rem" }}>
                      <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 500, color: T.color.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {mem.title}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
                        <span style={{ fontFamily: T.font.body, fontSize: "0.5625rem", color: T.color.muted }}>{TYPE_ICONS[mem.type]} {mem.type}</span>
                        {/* Display toggle */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleDisplay(mem); }}
                          title={isDisplayed ? t("removeFrom3d") : canDisplay ? t("showIn3d") : t("maxDisplayed", { count: String(typeLimit), type: mem.type })}
                          style={{
                            width: "1.375rem", height: "1.375rem", borderRadius: "0.375rem", border: "none",
                            background: isDisplayed ? accent + "20" : T.color.warmStone,
                            color: isDisplayed ? accent : canDisplay ? T.color.muted : T.color.cream,
                            fontSize: "0.625rem", cursor: canDisplay || isDisplayed ? "pointer" : "default",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >{isDisplayed ? "\u{1F3DB}" : "\u25CB"}</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "2.5rem", fontFamily: T.font.body, color: T.color.muted }}>
                  {t("noMemories")}{filter ? ` ${t("ofType")} "${filter}"` : ""}
                </div>
              )}
            </div>
          )}

          {/* ═══ PLAYER VIEW ═══ */}
          {mode === "player" && playerMem && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Main display */}
              <div style={{
                borderRadius: "1rem", overflow: "hidden", background: "#1A1510",
                position: "relative", minHeight: "18.75rem",
              }}>
                {playerMem.type === "video" || playerMem.videoBlob ? (
                  <video
                    ref={videoRef}
                    key={playerMem.id}
                    src={playerMem.dataUrl || ""}
                    controls
                    autoPlay={playing}
                    onEnded={() => {
                      if (playerIdx < filtered.length - 1) setPlayerIdx(playerIdx + 1);
                      else setPlaying(false);
                    }}
                    playsInline
                    style={{ width: "100%", maxHeight: "26.25rem", objectFit: "contain", display: "block" }}
                  />
                ) : playerMem.type === "audio" || playerMem.voiceBlob ? (
                  <div style={{ padding: "3.75rem 2.5rem", textAlign: "center" }}>
                    <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>{"\u{1F3B5}"}</div>
                    <div style={{ fontFamily: T.font.display, fontSize: "1.25rem", color: "#E8DCC8", marginBottom: "0.5rem" }}>{playerMem.title}</div>
                    {playerMem.desc && <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#A89878", maxWidth: "25rem", margin: "0 auto 1rem" }}>{playerMem.desc}</p>}
                    <audio
                      ref={audioRef}
                      key={playerMem.id}
                      src={playerMem.dataUrl || ""}
                      controls
                      autoPlay={playing}
                      onEnded={() => {
                        if (playerIdx < filtered.length - 1) setPlayerIdx(playerIdx + 1);
                        else setPlaying(false);
                      }}
                      style={{ width: "80%", maxWidth: "25rem" }}
                    />
                  </div>
                ) : playerMem.type === "document" ? (
                  <div style={{ padding: "3.75rem 2.5rem", textAlign: "center" }}>
                    <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>{"\u{1F4DC}"}</div>
                    <div style={{ fontFamily: T.font.display, fontSize: "1.25rem", color: "#E8DCC8", marginBottom: "0.5rem" }}>{playerMem.title}</div>
                    {playerMem.desc && <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#A89878", maxWidth: "31.25rem", margin: "0 auto", lineHeight: 1.7 }}>{playerMem.desc}</p>}
                    {playerMem.dataUrl && playerMem.dataUrl.startsWith("data:application/pdf") && (
                      <a href={playerMem.dataUrl} download={playerMem.title + ".pdf"}
                        style={{ display: "inline-block", marginTop: "1rem", padding: "0.625rem 1.25rem", borderRadius: "0.625rem", background: accent, color: "#FFF", fontFamily: T.font.body, fontSize: "0.8125rem", textDecoration: "none" }}>
                        {t("downloadPdf")}
                      </a>
                    )}
                  </div>
                ) : (
                  /* Photo / painting / album / orb / case — image display */
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "18.75rem", background: "#1A1510" }}>
                    {playerMem.dataUrl ? (
                      <div style={{ position: "relative", width: "100%", height: "26.25rem" }}>
                        <Image src={playerMem.dataUrl!} alt={playerMem.title}
                          fill sizes="(max-width: 768px) 100vw, 600px"
                          style={{ objectFit: "contain" }} />
                      </div>
                    ) : (
                      <div style={{
                        width: "100%", height: "18.75rem",
                        background: `linear-gradient(135deg, hsl(${playerMem.hue},${playerMem.s}%,${playerMem.l}%), hsl(${playerMem.hue + 25},${playerMem.s - 5}%,${playerMem.l - 10}%))`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{ fontSize: "3.75rem", opacity: 0.3 }}>{TYPE_ICONS[playerMem.type] || ""}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Player controls */}
              <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem",
                background: T.color.white, borderRadius: "0.875rem", border: `1px solid ${T.color.cream}`,
              }}>
                {/* Prev */}
                <button onClick={() => setPlayerIdx(Math.max(0, playerIdx - 1))} disabled={playerIdx === 0} aria-label={t("previous")}
                  style={{ width: "2.25rem", height: "2.25rem", borderRadius: "0.625rem", border: "none", background: playerIdx > 0 ? T.color.warmStone : "transparent", color: playerIdx > 0 ? T.color.charcoal : T.color.cream, fontSize: "1rem", cursor: playerIdx > 0 ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {"\u25C0"}
                </button>

                {/* Play/pause (for slideshow or auto-advance) */}
                <button onClick={() => setPlaying(!playing)} aria-label={playing ? t("pause") : t("play")}
                  style={{ width: "2.75rem", height: "2.75rem", borderRadius: "1.375rem", border: "none", background: `linear-gradient(135deg, ${accent}, ${T.color.walnut})`, color: "#FFF", fontSize: "1.125rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {playing ? "\u23F8" : "\u25B6"}
                </button>

                {/* Next */}
                <button onClick={() => setPlayerIdx(Math.min(filtered.length - 1, playerIdx + 1))} disabled={playerIdx >= filtered.length - 1} aria-label={t("next")}
                  style={{ width: "2.25rem", height: "2.25rem", borderRadius: "0.625rem", border: "none", background: playerIdx < filtered.length - 1 ? T.color.warmStone : "transparent", color: playerIdx < filtered.length - 1 ? T.color.charcoal : T.color.cream, fontSize: "1rem", cursor: playerIdx < filtered.length - 1 ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {"\u25B6"}
                </button>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, marginLeft: "0.5rem" }}>
                  <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: T.color.charcoal, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {playerMem.title}
                  </div>
                  <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted }}>
                    {playerIdx + 1} of {filtered.length} {filter ? `${filter}s` : t("memories")}
                    {playerMem.createdAt && ` · ${new Date(playerMem.createdAt).toLocaleDateString()}`}
                  </div>
                </div>

                {/* View detail */}
                <button onClick={() => onSelect(playerMem)}
                  style={{ padding: "0.5rem 0.875rem", borderRadius: "0.625rem", border: `1px solid ${T.color.cream}`, background: T.color.white, fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, cursor: "pointer" }}>
                  {t("details")}
                </button>
              </div>

              {/* Description */}
              {playerMem.desc && (
                <div style={{ padding: "0.75rem 1rem", background: T.color.warmStone, borderRadius: "0.75rem" }}>
                  <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.walnut, lineHeight: 1.6, margin: 0 }}>{playerMem.desc}</p>
                </div>
              )}

              {/* Playlist strip */}
              <div style={{ display: "flex", gap: "0.375rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
                {filtered.map((mem, idx) => (
                  <button key={mem.id} onClick={() => { setPlayerIdx(idx); setPlaying(false); }}
                    style={{
                      width: "3.5rem", height: "3.5rem", borderRadius: "0.5rem", flexShrink: 0, overflow: "hidden",
                      border: idx === playerIdx ? `2px solid ${accent}` : `1px solid ${T.color.cream}`,
                      background: mem.dataUrl ? `url(${mem.dataUrl}) center/cover` : `linear-gradient(135deg, hsl(${mem.hue},${mem.s}%,${mem.l}%), hsl(${mem.hue + 15},${mem.s}%,${mem.l - 5}%))`,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: idx === playerIdx ? 1 : 0.7, transition: "all .15s",
                    }}>
                    {!mem.dataUrl && <span style={{ fontSize: "1rem", opacity: 0.5 }}>{TYPE_ICONS[mem.type] || ""}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode === "player" && !playerMem && (
            <div style={{ textAlign: "center", padding: "3.75rem", fontFamily: T.font.body, color: T.color.muted }}>{t("noMemoriesToPlay")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ Helpers ═══

function isMedia(mem: Mem): boolean {
  return mem.type === "video" || mem.type === "audio" || !!mem.videoBlob || !!mem.voiceBlob;
}

function groupByType(mems: Mem[]): Record<string, Mem[]> {
  const groups: Record<string, Mem[]> = {};
  for (const m of mems) {
    (groups[m.type] ||= []).push(m);
  }
  return groups;
}
