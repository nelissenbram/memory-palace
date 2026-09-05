"use client";
import { useState, useEffect, useMemo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import Image from "next/image";

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

  // Atrium token: reduced-motion gate for entrance/hover transitions
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(3.75rem + env(safe-area-inset-bottom, 0px))",
        left: "1.5rem",
        zIndex: 40,
        width: "20rem",
        maxWidth: "calc(100vw - 3rem)",
        background: `linear-gradient(135deg, ${T.color.linen}f5, ${T.color.warmStone}f5)`,
        backdropFilter: "blur(16px)",
        borderRadius: "1rem", // Atrium token: card radius
        border: "0.0625rem solid rgba(212,175,55,0.5)", // Atrium token: this-day gold frame (keystone register)
        boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", // Atrium token: S2 warm ink + top highlight
        padding: 0,
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible || reduceMotion ? "translateY(0)" : "translateY(1.25rem)",
        transition: reduceMotion ? "none" : "opacity .3s ease, transform .3s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Golden top accent */}
      <div
        style={{
          height: "0.1875rem",
          background: "linear-gradient(90deg, #C99A2E, #D4AF37, #C99A2E)", // Atrium token: canonical gold, this-day frame
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: "1rem 1.125rem 0.625rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h4
            style={{
              fontFamily: T.font.display,
              fontSize: "1.1875rem", // Atrium token: titleM
              fontWeight: 600,
              color: "#403B36", // Atrium token: ink — titles are ink, gold stays on the frame
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            {t("title")}
          </h4>
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: "0.8125rem", // Atrium token: meta
              color: "#716A5E", // Atrium token: muted, full opacity
              margin: "0.1875rem 0 0",
            }}
          >
            {anniversaries.length === 1 ? t("memoryFromPast", { count: String(anniversaries.length) }) : t("memoriesFromPast", { count: String(anniversaries.length) })}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            width: "2.75rem",
            height: "2.75rem",
            minWidth: "2.75rem",
            minHeight: "2.75rem",
            borderRadius: "0.8125rem", // Atrium token: small-control radius
            border: "0.0625rem solid #E3D6BC", // Atrium token: opaque hairline
            background: "transparent",
            color: "#716A5E", // Atrium token: muted
            fontSize: "0.8125rem",
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
      <div style={{ padding: "0 0.875rem 0.875rem" }}>
        {shown.map((a, i) => (
          <button
            key={a.mem.id}
            onClick={() => handleClick(a)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.5rem",
              borderRadius: "0.75rem", // Atrium token: small-control radius
              border: "none",
              background: "transparent",
              cursor: "pointer",
              textAlign: "left",
              transition: reduceMotion ? "none" : "background .2s ease",
              borderTop: i > 0 ? "0.0625rem solid #E3D6BC" : "none", // Atrium token: opaque hairline (was cream-on-cream)
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(154,79,42,0.08)"; // Atrium token: terracotta wash — gold never carries hover state
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {/* Thumbnail circle */}
            <div
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "0.75rem", // Atrium token: small-control radius
                background: `linear-gradient(135deg, hsl(${a.mem.hue},${a.mem.s}%,${a.mem.l}%), hsl(${a.mem.hue},${Math.max(0, a.mem.s - 10)}%,${Math.max(0, a.mem.l - 10)}%))`,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", // Atrium token: S1 warm ink (was hue glow)
              }}
            >
              {a.mem.dataUrl ? (
                <Image
                  src={a.mem.dataUrl!}
                  alt=""
                  width={40} height={40}
                  style={{
                    borderRadius: "0.75rem",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span style={{ fontSize: "1rem", opacity: 0.8 }}>
                  {a.mem.type === "photo" ? "\uD83D\uDDBC\uFE0F" : a.mem.type === "video" ? "\uD83C\uDFAC" : "\uD83D\uDD2E"}
                </span>
              )}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem", // Atrium token: meta
                  fontWeight: 600,
                  color: "#403B36", // Atrium token: ink
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
                  fontSize: "0.8125rem", // Atrium token: meta
                  color: "#716A5E", // Atrium token: muted, full opacity
                  marginTop: "0.0625rem",
                }}
              >
                {a.roomName}
              </div>
            </div>

            {/* Years ago badge */}
            <div
              style={{
                background: "#9A4F2A", // Atrium token: terracotta — gold never carries generic badges
                color: "#FCFAF5", // Atrium token: cream
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "0.25rem 0.5rem",
                borderRadius: "2rem", // Atrium token: pill
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
            padding: "0 1.125rem 0.75rem",
            fontFamily: T.font.body,
            fontSize: "0.8125rem", // Atrium token: meta (no 10px voice in the ramp)
            color: "#716A5E", // Atrium token: muted — gold never carries generic text
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.25rem",
          }}
        >
          {anniversaries.length - 3 === 1 ? t("moreMemory", { count: String(anniversaries.length - 3) }) : t("moreMemories", { count: String(anniversaries.length - 3) })}
        </div>
      )}
    </div>
  );
}
