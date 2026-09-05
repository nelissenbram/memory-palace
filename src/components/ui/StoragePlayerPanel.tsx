"use client";
import { useState, useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useIsMobile, useIsSmall } from "@/lib/hooks/useIsMobile";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import type { Mem } from "@/lib/constants/defaults";
import Image from "next/image";
import { MediaThumb } from "./MediaThumb";

const TYPE_KEY_MAP: Record<string, string> = {
  video: "typeVideo",
  audio: "typeAudio",
  photo: "typePhoto",
  painting: "typePainting",
  document: "typeDocument",
  story: "typeStory",
};

/**
 * Dark-surface engraved illustration for the Storage empty state — mirrors the
 * light LibraryEmptyState EngravedScene (fine strokes + a single gilt spark),
 * but tuned for the warm-ink scrim: cream-tinted lines on transparent, so it
 * reads as a quiet engraving rather than a flat emoji.
 */
function EngravedCrate() {
  const LINE = "rgba(252,250,245,0.34)"; // cream at engraving weight
  const FILL = "rgba(252,250,245,0.05)";
  const GILT = "#D4AF37";
  return (
    <svg width="88" height="72" viewBox="0 0 88 72" fill="none" aria-hidden="true" style={{ display: "block" }}>
      {/* ground shadow rules */}
      <path d="M8 62h72M14 67h60" stroke={LINE} strokeWidth="0.75" opacity="0.6" />
      {/* open crate body */}
      <path d="M24 26l20-6 20 6v26l-20 6-20-6z" fill={FILL} stroke={LINE} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M24 26l20 6 20-6M44 32v32" stroke={LINE} strokeWidth="1.2" strokeLinejoin="round" />
      {/* crate slats */}
      <path d="M30 30v26M58 30v26" stroke={LINE} strokeWidth="0.9" opacity="0.7" />
      {/* lid ajar */}
      <path d="M20 20l24-8 24 8-8 4-16-5-16 5z" fill={FILL} stroke={LINE} strokeWidth="1.2" strokeLinejoin="round" />
      {/* gilt spark */}
      <path d="M68 12l1.4 3.6L73 17l-3.6 1.4L68 22l-1.4-3.6L63 17l3.6-1.4z" fill={GILT} opacity="0.9" />
    </svg>
  );
}

/**
 * Storage Room — a simple media player overlay for unallocated memories.
 * Shows all memories in the "at1" room (storage) as a scrollable list with inline playback.
 */
export default function StoragePlayerPanel({ onClose }: { onClose: () => void }) {
  const { t, locale } = useTranslation("storagePlayer");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const isMobile = useIsMobile();
  const isSmall = useIsSmall();
  const { userMems, fetchRoomMemories } = useMemoryStore();
  const [mems, setMems] = useState<Mem[]>([]);
  const [activeMem, setActiveMem] = useState<Mem | null>(null);
  // Only autoplay media the user explicitly picks (and only when motion is allowed),
  // never the auto-seeded first item on mount.
  const [userPicked, setUserPicked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const shouldAutoPlay = userPicked && !prefersReducedMotion;

  useEffect(() => {
    fetchRoomMemories("at1");
  }, [fetchRoomMemories]);

  useEffect(() => {
    const stored = userMems["at1"] || [];
    setMems(stored);
    // Reconcile the active item against the fresh list: seed the first item when
    // nothing is active, and reset if the active memory was deleted upstream.
    setActiveMem((prev) => {
      if (!prev) return stored[0] || null;
      const stillExists = stored.some((m) => m.id === prev.id);
      return stillExists ? prev : (stored[0] || null);
    });
  }, [userMems]);

  const selectMem = (mem: Mem) => { setUserPicked(true); setActiveMem(mem); };

  const hasMedia = activeMem && (activeMem.type === "video" || activeMem.type === "audio" || activeMem.type === "photo" || activeMem.type === "painting");

  const localizeType = (type: string) => {
    const key = TYPE_KEY_MAP[type];
    return key ? t(key) : type;
  };

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} style={{
      position: "fixed", inset: 0, zIndex: 200, background: "rgba(46,42,38,0.94)", /* Atrium token: warm-ink scrim (#2E2A26 register) */
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* Header */}
      <div style={{
        width: "100%", maxWidth: "43.75rem", display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: isSmall ? "1rem 1rem 0.625rem" : "1.25rem 1.5rem 0.75rem",
        paddingTop: "max(1.25rem, env(safe-area-inset-top, 0px))",
        paddingLeft: `max(${isSmall ? "1rem" : "1.5rem"}, env(safe-area-inset-left, 0px))`,
        paddingRight: `max(${isSmall ? "1rem" : "1.5rem"}, env(safe-area-inset-right, 0px))`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <span style={{ fontSize: "1.375rem" }}>{"\u{1F4E6}"}</span>
          <span style={{ fontFamily: T.font.display, fontSize: isMobile ? "1.0625rem" : "1.1875rem", fontWeight: 600, lineHeight: 1.15, color: "#FCFAF5" }}>
            {t("title")}
          </span>
        </div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.08)", border: "0.0625rem solid rgba(255,255,255,0.12)",
          borderRadius: "0.75rem", padding: "0.375rem 1rem", color: "rgba(252,250,245,0.72)", cursor: "pointer",
          fontFamily: T.font.body, fontSize: "0.8125rem",
        }}>{t("close")}</button>
      </div>

      {/* Player area */}
      <div className="mp-scroll" style={{
        width: "100%", maxWidth: "43.75rem", flex: 1, overflow: "auto",
        padding: isSmall ? "0 1rem 1rem" : "0 1.5rem 1.5rem",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
        paddingLeft: `max(${isSmall ? "1rem" : "1.5rem"}, env(safe-area-inset-left, 0px))`,
        paddingRight: `max(${isSmall ? "1rem" : "1.5rem"}, env(safe-area-inset-right, 0px))`,
      }}>
        {mems.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            textAlign: "center", padding: "3.75rem 1.25rem", gap: "0.85rem",
          }}>
            <div style={{ marginBottom: "0.35rem" }}>
              <EngravedCrate />
            </div>
            <span style={{
              fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(252,250,245,0.55)",
            }}>
              {t("emptyOverline")}
            </span>
            <p style={{
              fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, lineHeight: 1.15,
              color: "#FCFAF5", margin: 0,
            }}>
              {t("empty")}
            </p>
            <p style={{
              fontFamily: T.font.body, fontSize: "0.9375rem", color: "rgba(252,250,245,0.72)",
              margin: 0, maxWidth: "24rem", lineHeight: 1.4,
            }}>
              {t("emptyDescription")}
            </p>
          </div>
        ) : (
          <>
            {/* Active media player */}
            {activeMem && (
              <div style={{
                background: "linear-gradient(165deg, #403B36 0%, #2E2A26 100%)", borderRadius: "1rem", overflow: "hidden", marginBottom: "1rem", boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", /* Atrium token: keystone surface, S2 */
              }}>
                {(activeMem.type === "video" || activeMem.videoBlob) && activeMem.dataUrl && (
                  <video ref={videoRef} src={activeMem.dataUrl} controls autoPlay={shouldAutoPlay} muted={shouldAutoPlay} playsInline preload="metadata"
                    style={{ width: "100%", maxHeight: "min(22.5rem, 55vh)", objectFit: "contain", display: "block" }} />
                )}
                {(activeMem.type === "audio" || activeMem.voiceBlob) && activeMem.dataUrl && (
                  <div style={{ padding: "1.875rem 1.25rem", textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>{"\u{1F3B5}"}</div>
                    <audio ref={audioRef} src={activeMem.dataUrl} controls autoPlay={shouldAutoPlay} preload="none" style={{ width: "100%", maxWidth: "25rem" }} />
                  </div>
                )}
                {(activeMem.type === "photo" || activeMem.type === "painting") && activeMem.dataUrl && (
                  <div style={{ position: "relative", width: "100%", height: "min(22.5rem, 55vh)" }}>
                    <Image src={activeMem.dataUrl!} alt={activeMem.title}
                      fill sizes="(max-width: 768px) 100vw, 500px"
                      style={{ objectFit: "contain" }} />
                  </div>
                )}
                {!hasMedia && (
                  <div style={{ padding: "1.875rem 1.25rem", textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>{activeMem.type === "document" ? "\u{1F4C4}" : "\u{1F4AD}"}</div>
                  </div>
                )}
                <div style={{ padding: "0.75rem 1rem" }}>
                  <div style={{ fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600, lineHeight: 1.15, color: "#FCFAF5" }}>
                    {activeMem.title}
                  </div>
                  {activeMem.desc && (
                    <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", lineHeight: 1.4, color: "rgba(252,250,245,0.72)", marginTop: "0.25rem" }}>
                      {activeMem.desc}
                    </p>
                  )}
                  <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "rgba(252,250,245,0.55)", marginTop: "0.375rem" }}>
                    {localizeType(activeMem.type)} {activeMem.createdAt ? `\u00B7 ${new Date(activeMem.createdAt).toLocaleDateString(locale)}` : ""}
                  </div>
                </div>
              </div>
            )}

            {/* Memory list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {mems.map((mem) => (
                <button key={mem.id} onClick={() => selectMem(mem)} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", minHeight: "2.75rem",
                  background: activeMem?.id === mem.id ? "rgba(184,92,56,0.16)" : "rgba(255,255,255,0.04)", /* Atrium token: ember active */
                  border: activeMem?.id === mem.id ? "0.0625rem solid rgba(184,92,56,0.45)" : "0.0625rem solid transparent",
                  borderRadius: "0.75rem", cursor: "pointer", textAlign: "left", width: "100%",
                }}>
                  <MediaThumb mem={mem} size={2.25} borderRadius="0.375rem" iconSize={16} iconColor="rgba(252,250,245,0.72)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.9375rem",
                      color: activeMem?.id === mem.id ? "#FCFAF5" : "rgba(252,250,245,0.72)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{mem.title}</div>
                    <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "rgba(252,250,245,0.55)" }}>
                      {localizeType(mem.type)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
