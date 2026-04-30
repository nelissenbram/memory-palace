"use client";
import { useState, useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
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
 * Storage Room — a simple media player overlay for unallocated memories.
 * Shows all memories in the "at1" room (storage) as a scrollable list with inline playback.
 */
export default function StoragePlayerPanel({ onClose }: { onClose: () => void }) {
  const { t, locale } = useTranslation("storagePlayer");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const { userMems, fetchRoomMemories } = useMemoryStore();
  const [mems, setMems] = useState<Mem[]>([]);
  const [activeMem, setActiveMem] = useState<Mem | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchRoomMemories("at1");
  }, [fetchRoomMemories]);

  useEffect(() => {
    const stored = userMems["at1"] || [];
    setMems(stored);
    if (stored.length > 0 && !activeMem) setActiveMem(stored[0]);
  }, [userMems, activeMem]);

  const hasMedia = activeMem && (activeMem.type === "video" || activeMem.type === "audio" || activeMem.type === "photo" || activeMem.type === "painting");

  const localizeType = (type: string) => {
    const key = TYPE_KEY_MAP[type];
    return key ? t(key) : type;
  };

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} style={{
      position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,16,12,0.92)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* Header */}
      <div style={{
        width: "100%", maxWidth: "43.75rem", display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "1.25rem 1.5rem 0.75rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <span style={{ fontSize: "1.375rem" }}>{"\u{1F4E6}"}</span>
          <span style={{ fontFamily: T.font.display, fontSize: "1.25rem", color: "#E8DCC8", letterSpacing: "0.03em" }}>
            {t("title")}
          </span>
        </div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "0.5rem", padding: "0.375rem 1rem", color: "#C8B898", cursor: "pointer",
          fontFamily: T.font.body, fontSize: "0.8125rem",
        }}>{t("close")}</button>
      </div>

      {/* Player area */}
      <div style={{
        width: "100%", maxWidth: "43.75rem", flex: 1, overflow: "auto", padding: "0 1.5rem 1.5rem",
      }}>
        {mems.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "3.75rem 1.25rem", color: "#A89878",
            fontFamily: T.font.body, fontSize: "0.9375rem",
          }}>
            <p style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>{"\u{1F4E6}"}</p>
            <p>{t("empty")}</p>
            <p style={{ fontSize: "0.8125rem", marginTop: "0.5rem", color: "#887858" }}>
              {t("emptyDescription")}
            </p>
          </div>
        ) : (
          <>
            {/* Active media player */}
            {activeMem && (
              <div style={{
                background: "#1A1510", borderRadius: "0.75rem", overflow: "hidden", marginBottom: "1rem",
              }}>
                {(activeMem.type === "video" || activeMem.videoBlob) && activeMem.dataUrl && (
                  <video ref={videoRef} src={activeMem.dataUrl} controls autoPlay playsInline preload="metadata"
                    style={{ width: "100%", maxHeight: "22.5rem", objectFit: "contain", display: "block" }} />
                )}
                {(activeMem.type === "audio" || activeMem.voiceBlob) && activeMem.dataUrl && (
                  <div style={{ padding: "1.875rem 1.25rem", textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>{"\u{1F3B5}"}</div>
                    <audio ref={audioRef} src={activeMem.dataUrl} controls autoPlay preload="none" style={{ width: "100%", maxWidth: "25rem" }} />
                  </div>
                )}
                {(activeMem.type === "photo" || activeMem.type === "painting") && activeMem.dataUrl && (
                  <div style={{ position: "relative", width: "100%", height: "22.5rem" }}>
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
                  <div style={{ fontFamily: T.font.display, fontSize: "1rem", color: "#E8DCC8" }}>
                    {activeMem.title}
                  </div>
                  {activeMem.desc && (
                    <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#A89878", marginTop: "0.25rem" }}>
                      {activeMem.desc}
                    </p>
                  )}
                  <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "#887858", marginTop: "0.375rem" }}>
                    {localizeType(activeMem.type)} {activeMem.createdAt ? `\u00B7 ${new Date(activeMem.createdAt).toLocaleDateString(locale)}` : ""}
                  </div>
                </div>
              </div>
            )}

            {/* Memory list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {mems.map((mem) => (
                <button key={mem.id} onClick={() => setActiveMem(mem)} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", minHeight: "2.75rem",
                  background: activeMem?.id === mem.id ? "rgba(200,168,88,0.15)" : "rgba(255,255,255,0.04)",
                  border: activeMem?.id === mem.id ? "1px solid rgba(200,168,88,0.3)" : "1px solid transparent",
                  borderRadius: "0.5rem", cursor: "pointer", textAlign: "left", width: "100%",
                }}>
                  <MediaThumb mem={mem} size={2.25} borderRadius="0.375rem" iconSize={16} iconColor="#C8B898" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.875rem",
                      color: activeMem?.id === mem.id ? "#E8DCC8" : "#C8B898",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{mem.title}</div>
                    <div style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "#887858" }}>
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
