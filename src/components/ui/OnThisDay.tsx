"use client";
import { useState, useEffect, useMemo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";

interface AnniversaryMem {
  mem: Mem;
  yearsAgo: number;
  roomId: string;
  roomName: string;
  wingId: string;
}

function getAnniversaryMemories(
  allMems: Record<string, Mem[]>,
  getWings: () => { id: string; name: string }[],
  getWingRooms: (wingId: string) => { id: string; name: string }[]
): AnniversaryMem[] {
  const today = new Date();
  const month = today.getMonth();
  const day = today.getDate();
  const results: AnniversaryMem[] = [];

  // Build roomId -> { roomName, wingId } map
  const roomMap: Record<string, { roomName: string; wingId: string }> = {};
  for (const wing of getWings()) {
    for (const room of getWingRooms(wing.id)) {
      roomMap[room.id] = { roomName: room.name, wingId: wing.id };
    }
  }

  for (const [roomId, mems] of Object.entries(allMems)) {
    for (const mem of mems) {
      if (!mem.createdAt) continue;
      const created = new Date(mem.createdAt);
      if (
        created.getMonth() === month &&
        created.getDate() === day &&
        created.getFullYear() < today.getFullYear()
      ) {
        const info = roomMap[roomId] || { roomName: roomId, wingId: "" };
        results.push({
          mem,
          yearsAgo: today.getFullYear() - created.getFullYear(),
          roomId,
          roomName: info.roomName,
          wingId: info.wingId,
        });
      }
    }
  }
  return results.sort((a, b) => b.yearsAgo - a.yearsAgo);
}

function getDismissKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `mp_otd_dismissed_${yyyy}-${mm}-${dd}`;
}

interface OnThisDayProps {
  onNavigateToRoom: (wingId: string, roomId: string) => void;
}

export default function OnThisDay({ onNavigateToRoom }: OnThisDayProps) {
  const { t } = useTranslation("onThisDay");
  const { userMems } = useMemoryStore();
  const { getWings, getWingRooms } = useRoomStore();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [visible, setVisible] = useState(false);

  // Merge userMems with ROOM_MEMS defaults
  const allMems = useMemo(() => {
    const merged: Record<string, Mem[]> = { ...ROOM_MEMS };
    for (const [k, v] of Object.entries(userMems)) {
      merged[k] = v;
    }
    return merged;
  }, [userMems]);

  const anniversaries = useMemo(
    () => getAnniversaryMemories(allMems, getWings, getWingRooms),
    [allMems, getWings, getWingRooms]
  );

  useEffect(() => {
    const key = getDismissKey();
    const wasDismissed = localStorage.getItem(key) === "1";
    setDismissed(wasDismissed);
    if (!wasDismissed && anniversaries.length > 0) {
      // Slight delay for entrance animation
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, [anniversaries.length]);

  if (dismissed || anniversaries.length === 0) return null;

  const shown = anniversaries.slice(0, 3);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      localStorage.setItem(getDismissKey(), "1");
      setDismissed(true);
    }, 300);
  };

  const handleClick = (a: AnniversaryMem) => {
    onNavigateToRoom(a.wingId, a.roomId);
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 72,
        left: 24,
        zIndex: 40,
        width: 320,
        maxWidth: "calc(100vw - 48px)",
        background: `linear-gradient(135deg, ${T.color.linen}f5, ${T.color.warmStone}f5)`,
        backdropFilter: "blur(16px)",
        borderRadius: 16,
        border: "1px solid #D4A84480",
        boxShadow: "0 8px 40px rgba(180,140,60,.18), 0 0 24px rgba(212,168,68,.10), inset 0 1px 0 rgba(255,255,255,.6)",
        padding: 0,
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity .4s cubic-bezier(.23,1,.32,1), transform .4s cubic-bezier(.23,1,.32,1)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Golden top accent */}
      <div
        style={{
          height: 3,
          background: "linear-gradient(90deg, #C8A868, #E8C888, #C8A868)",
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: "16px 18px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h4
            style={{
              fontFamily: T.font.display,
              fontSize: 20,
              fontWeight: 500,
              color: T.color.goldDark,
              margin: 0,
              letterSpacing: ".3px",
            }}
          >
            {t("title")}
          </h4>
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: 11,
              color: T.color.muted,
              margin: "3px 0 0",
            }}
          >
            {anniversaries.length === 1 ? t("memoryFromPast", { count: String(anniversaries.length) }) : t("memoriesFromPast", { count: String(anniversaries.length) })}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            width: 26,
            height: 26,
            minWidth: 44,
            minHeight: 44,
            borderRadius: 13,
            border: "1px solid #D4A84440",
            background: "rgba(212,168,68,.08)",
            color: T.color.muted,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {"\u2715"}
        </button>
      </div>

      {/* Memory list */}
      <div style={{ padding: "0 14px 14px" }}>
        {shown.map((a, i) => (
          <button
            key={a.mem.id}
            onClick={() => handleClick(a)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 8px",
              borderRadius: 10,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              textAlign: "left",
              transition: "background .15s",
              borderTop: i > 0 ? `1px solid ${T.color.cream}` : "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(212,168,68,.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {/* Thumbnail circle */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `linear-gradient(135deg, hsl(${a.mem.hue},${a.mem.s}%,${a.mem.l}%), hsl(${a.mem.hue},${Math.max(0, a.mem.s - 10)}%,${Math.max(0, a.mem.l - 10)}%))`,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 2px 8px hsl(${a.mem.hue},${a.mem.s}%,${a.mem.l}%,0.3)`,
              }}
            >
              {a.mem.dataUrl ? (
                <img
                  src={a.mem.dataUrl}
                  alt=""
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span style={{ fontSize: 16, opacity: 0.8 }}>
                  {a.mem.type === "photo" ? "\uD83D\uDDBC\uFE0F" : a.mem.type === "video" ? "\uD83C\uDFAC" : "\uD83D\uDD2E"}
                </span>
              )}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.color.charcoal,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {a.mem.title}
              </div>
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: 11,
                  color: T.color.muted,
                  marginTop: 1,
                }}
              >
                {a.roomName}
              </div>
            </div>

            {/* Years ago badge */}
            <div
              style={{
                background: "linear-gradient(135deg, #D4A844, #C8A868)",
                color: "#FFF",
                fontFamily: T.font.body,
                fontSize: 10,
                fontWeight: 700,
                padding: "4px 8px",
                borderRadius: 8,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {a.yearsAgo === 1 ? t("yrAgo", { count: String(a.yearsAgo) }) : t("yrsAgo", { count: String(a.yearsAgo) })}
            </div>
          </button>
        ))}
      </div>

      {/* Show more hint if more than 3 */}
      {anniversaries.length > 3 && (
        <div
          style={{
            padding: "0 18px 12px",
            fontFamily: T.font.body,
            fontSize: 10,
            color: "#C8A868",
            textAlign: "center",
          }}
        >
          {anniversaries.length - 3 === 1 ? t("moreMemory", { count: String(anniversaries.length - 3) }) : t("moreMemories", { count: String(anniversaries.length - 3) })}
        </div>
      )}
    </div>
  );
}
