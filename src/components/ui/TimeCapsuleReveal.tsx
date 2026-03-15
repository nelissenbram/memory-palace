"use client";
import { useState, useEffect, useMemo } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";

const LS_KEY = "mp_seen_reveals";

interface RevealedMem {
  mem: Mem;
  roomId: string;
  roomName: string;
  roomIcon: string;
  wingId: string;
}

/** Read the set of memory IDs the user has already acknowledged. */
function getSeenReveals(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

/** Persist an updated set of seen reveal IDs. */
function markSeen(ids: string[]) {
  const current = getSeenReveals();
  for (const id of ids) current.add(id);
  localStorage.setItem(LS_KEY, JSON.stringify([...current]));
}

/**
 * Scan all memories for time capsules whose revealDate <= today
 * that the user hasn't acknowledged yet.
 */
function getNewlyRevealed(
  allMems: Record<string, Mem[]>,
  getWings: () => { id: string; name: string }[],
  getWingRooms: (wingId: string) => { id: string; name: string; icon: string }[],
): RevealedMem[] {
  const todayStr = new Date().toISOString().split("T")[0];
  const seen = getSeenReveals();
  const results: RevealedMem[] = [];

  // Build roomId -> room info map
  const roomMap: Record<string, { roomName: string; roomIcon: string; wingId: string }> = {};
  for (const wing of getWings()) {
    for (const room of getWingRooms(wing.id)) {
      roomMap[room.id] = { roomName: room.name, roomIcon: room.icon, wingId: wing.id };
    }
  }

  for (const [roomId, mems] of Object.entries(allMems)) {
    for (const mem of mems) {
      if (!mem.revealDate) continue;
      // Capsule has opened (revealDate <= today) and user hasn't seen it yet
      if (mem.revealDate <= todayStr && !seen.has(mem.id)) {
        const info = roomMap[roomId] || { roomName: roomId, roomIcon: "", wingId: "" };
        results.push({
          mem,
          roomId,
          roomName: info.roomName,
          roomIcon: info.roomIcon,
          wingId: info.wingId,
        });
      }
    }
  }
  return results;
}

interface TimeCapsuleRevealProps {
  onNavigateToRoom: (wingId: string, roomId: string) => void;
}

export default function TimeCapsuleReveal({ onNavigateToRoom }: TimeCapsuleRevealProps) {
  const isMobile = useIsMobile();
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

  const revealed = useMemo(
    () => getNewlyRevealed(allMems, getWings, getWingRooms),
    [allMems, getWings, getWingRooms],
  );

  useEffect(() => {
    if (revealed.length > 0) {
      setDismissed(false);
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [revealed.length]);

  if (dismissed || revealed.length === 0) return null;

  const shown = revealed.slice(0, 3);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      markSeen(revealed.map((r) => r.mem.id));
      setDismissed(true);
    }, 300);
  };

  const handleView = (r: RevealedMem) => {
    // Mark this one as seen immediately
    markSeen([r.mem.id]);
    onNavigateToRoom(r.wingId, r.roomId);
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: isMobile ? 80 : 72,
        right: isMobile ? 12 : 24,
        zIndex: 40,
        width: isMobile ? "calc(100% - 24px)" : 340,
        background: `linear-gradient(135deg, ${T.color.linen}f5, ${T.color.warmStone}f5)`,
        backdropFilter: "blur(16px)",
        borderRadius: 16,
        border: "1px solid #7B68AE60",
        boxShadow:
          "0 8px 40px rgba(123,104,174,.18), 0 0 24px rgba(123,104,174,.10), inset 0 1px 0 rgba(255,255,255,.6)",
        padding: 0,
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition:
          "opacity .4s cubic-bezier(.23,1,.32,1), transform .4s cubic-bezier(.23,1,.32,1)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          height: 3,
          background: "linear-gradient(90deg, #9B7DD4, #C8A868, #9B7DD4)",
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
              color: "#6B4E9B",
              margin: 0,
              letterSpacing: ".3px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 22 }}>{"\u2728"}</span>
            Time Capsule{revealed.length > 1 ? "s" : ""} Opened!
          </h4>
          <p
            style={{
              fontFamily: T.font.body,
              fontSize: 11,
              color: T.color.muted,
              margin: "3px 0 0",
            }}
          >
            {revealed.length}{" "}
            {revealed.length === 1 ? "memory has" : "memories have"} been
            revealed
          </p>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            border: "1px solid #7B68AE40",
            background: "rgba(123,104,174,.08)",
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

      {/* Revealed memories list */}
      <div style={{ padding: "0 14px 14px" }}>
        {shown.map((r, i) => (
          <button
            key={r.mem.id}
            onClick={() => handleView(r)}
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
              (e.currentTarget as HTMLElement).style.background =
                "rgba(123,104,174,.06)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            {/* Memory color swatch */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `linear-gradient(135deg, hsl(${r.mem.hue},${r.mem.s}%,${r.mem.l}%), hsl(${r.mem.hue},${Math.max(0, r.mem.s - 10)}%,${Math.max(0, r.mem.l - 10)}%))`,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 2px 8px hsl(${r.mem.hue},${r.mem.s}%,${r.mem.l}%,0.3)`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {r.mem.dataUrl ? (
                <img
                  src={r.mem.dataUrl}
                  alt=""
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span style={{ fontSize: 18 }}>{"\uD83D\uDD13"}</span>
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
                {r.mem.title}
              </div>
              <div
                style={{
                  fontFamily: T.font.body,
                  fontSize: 11,
                  color: T.color.muted,
                  marginTop: 1,
                }}
              >
                {r.roomIcon} {r.roomName}
              </div>
            </div>

            {/* View button */}
            <div
              style={{
                background: "linear-gradient(135deg, #9B7DD4, #7B68AE)",
                color: "#FFF",
                fontFamily: T.font.body,
                fontSize: 11,
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: 8,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              View
            </div>
          </button>
        ))}
      </div>

      {/* Show more hint */}
      {revealed.length > 3 && (
        <div
          style={{
            padding: "0 18px 12px",
            fontFamily: T.font.body,
            fontSize: 10,
            color: "#9B7DD4",
            textAlign: "center",
          }}
        >
          +{revealed.length - 3} more{" "}
          {revealed.length - 3 === 1 ? "capsule" : "capsules"}
        </div>
      )}
    </div>
  );
}
