"use client";
import { useState, useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import type { Mem } from "@/lib/constants/defaults";

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
    <div style={{
      position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,16,12,0.92)",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* Header */}
      <div style={{
        width: "100%", maxWidth: 700, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "20px 24px 12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>{"\u{1F4E6}"}</span>
          <span style={{ fontFamily: T.font.display, fontSize: 20, color: "#E8DCC8", letterSpacing: "0.03em" }}>
            {t("title")}
          </span>
        </div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8, padding: "6px 16px", color: "#C8B898", cursor: "pointer",
          fontFamily: T.font.body, fontSize: 13,
        }}>{t("close")}</button>
      </div>

      {/* Player area */}
      <div style={{
        width: "100%", maxWidth: 700, flex: 1, overflow: "auto", padding: "0 24px 24px",
      }}>
        {mems.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 20px", color: "#A89878",
            fontFamily: T.font.body, fontSize: 15,
          }}>
            <p style={{ fontSize: 40, marginBottom: 16 }}>{"\u{1F4E6}"}</p>
            <p>{t("empty")}</p>
            <p style={{ fontSize: 13, marginTop: 8, color: "#887858" }}>
              {t("emptyDescription")}
            </p>
          </div>
        ) : (
          <>
            {/* Active media player */}
            {activeMem && (
              <div style={{
                background: "#1A1510", borderRadius: 12, overflow: "hidden", marginBottom: 16,
              }}>
                {(activeMem.type === "video" || activeMem.videoBlob) && activeMem.dataUrl && (
                  <video ref={videoRef} src={activeMem.dataUrl} controls autoPlay playsInline
                    style={{ width: "100%", maxHeight: 360, objectFit: "contain", display: "block" }} />
                )}
                {(activeMem.type === "audio" || activeMem.voiceBlob) && activeMem.dataUrl && (
                  <div style={{ padding: "30px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>{"\u{1F3B5}"}</div>
                    <audio ref={audioRef} src={activeMem.dataUrl} controls autoPlay style={{ width: "100%", maxWidth: 400 }} />
                  </div>
                )}
                {(activeMem.type === "photo" || activeMem.type === "painting") && activeMem.dataUrl && (
                  <img src={activeMem.dataUrl} alt={activeMem.title}
                    style={{ width: "100%", maxHeight: 360, objectFit: "contain", display: "block" }} />
                )}
                {!hasMedia && (
                  <div style={{ padding: "30px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>{activeMem.type === "document" ? "\u{1F4C4}" : "\u{1F4AD}"}</div>
                  </div>
                )}
                <div style={{ padding: "12px 16px" }}>
                  <div style={{ fontFamily: T.font.display, fontSize: 16, color: "#E8DCC8" }}>
                    {activeMem.title}
                  </div>
                  {activeMem.desc && (
                    <p style={{ fontFamily: T.font.body, fontSize: 13, color: "#A89878", marginTop: 4 }}>
                      {activeMem.desc}
                    </p>
                  )}
                  <div style={{ fontFamily: T.font.body, fontSize: 11, color: "#887858", marginTop: 6 }}>
                    {localizeType(activeMem.type)} {activeMem.createdAt ? `\u00B7 ${new Date(activeMem.createdAt).toLocaleDateString(locale)}` : ""}
                  </div>
                </div>
              </div>
            )}

            {/* Memory list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {mems.map((mem) => (
                <button key={mem.id} onClick={() => setActiveMem(mem)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  background: activeMem?.id === mem.id ? "rgba(200,168,88,0.15)" : "rgba(255,255,255,0.04)",
                  border: activeMem?.id === mem.id ? "1px solid rgba(200,168,88,0.3)" : "1px solid transparent",
                  borderRadius: 8, cursor: "pointer", textAlign: "left", width: "100%",
                }}>
                  <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>
                    {mem.type === "video" ? "\u{1F3AC}" : mem.type === "audio" ? "\u{1F3B5}" : mem.type === "photo" ? "\u{1F5BC}\uFE0F" : mem.type === "document" ? "\u{1F4C4}" : "\u{1F4AD}"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.font.body, fontSize: 14,
                      color: activeMem?.id === mem.id ? "#E8DCC8" : "#C8B898",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{mem.title}</div>
                    <div style={{ fontFamily: T.font.body, fontSize: 11, color: "#887858" }}>
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
