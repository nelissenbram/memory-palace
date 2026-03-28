"use client";
import { useMemo } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";

const MONTH_KEYS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

interface TimelineEntry {
  mem: Mem;
  roomId: string;
  roomName: string;
  roomIcon: string;
  wingId: string;
  wingAccent: string;
  date: Date;
}

interface MonthGroup {
  year: number;
  month: number;
  label: string;
  entries: TimelineEntry[];
}

interface MemoryTimelineProps {
  onClose: () => void;
}

export default function MemoryTimeline({ onClose }: MemoryTimelineProps) {
  const isMobile = useIsMobile();
  const { t, locale } = useTranslation("memoryTimeline");
  const { userMems, setSelMem } = useMemoryStore();
  const { getWings, getWingRooms } = useRoomStore();

  const groups = useMemo(() => {
    const wings = getWings();
    // Build maps
    const roomToWing: Record<string, { wingId: string; wingAccent: string; roomName: string; roomIcon: string }> = {};
    for (const wing of wings) {
      for (const room of getWingRooms(wing.id)) {
        roomToWing[room.id] = {
          wingId: wing.id,
          wingAccent: wing.accent,
          roomName: room.name,
          roomIcon: room.icon,
        };
      }
    }

    // Collect all memories with dates
    const merged: Record<string, Mem[]> = { ...ROOM_MEMS };
    for (const [k, v] of Object.entries(userMems)) {
      merged[k] = v;
    }

    const entries: TimelineEntry[] = [];
    for (const [roomId, mems] of Object.entries(merged)) {
      const info = roomToWing[roomId];
      if (!info) continue;
      for (const mem of mems) {
        if (!mem.createdAt) continue;
        entries.push({
          mem,
          roomId,
          roomName: info.roomName,
          roomIcon: info.roomIcon,
          wingId: info.wingId,
          wingAccent: info.wingAccent,
          date: new Date(mem.createdAt),
        });
      }
    }

    // Sort newest first
    entries.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Group by month/year
    const grouped: MonthGroup[] = [];
    let current: MonthGroup | null = null;
    for (const entry of entries) {
      const y = entry.date.getFullYear();
      const m = entry.date.getMonth();
      if (!current || current.year !== y || current.month !== m) {
        current = { year: y, month: m, label: `${MONTH_KEYS[m]}|${y}`, entries: [] };
        grouped.push(current);
      }
      current.entries.push(entry);
    }
    return grouped;
  }, [userMems, getWings, getWingRooms]);

  const totalCount = groups.reduce((n, g) => n + g.entries.length, 0);

  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(42,34,24,.4)",
        backdropFilter: "blur(8px)",
        zIndex: 55,
        animation: "fadeIn .2s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: isMobile ? "100%" : "min(420px, 94vw)",
          background: `${T.color.linen}f8`,
          backdropFilter: "blur(20px)",
          borderRight: `1px solid ${T.color.cream}`,
          padding: 0,
          overflowY: "auto",
          animation: "slideInLeft .3s cubic-bezier(.23,1,.32,1)",
        }}
      >
        <style>{`@keyframes slideInLeft{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* Header */}
        <div
          style={{
            padding: "24px 24px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: 24,
                fontWeight: 500,
                color: T.color.charcoal,
                margin: 0,
              }}
            >
              {t("title")}
            </h3>
            <p
              style={{
                fontFamily: T.font.body,
                fontSize: 11,
                color: T.color.muted,
                margin: "4px 0 0",
              }}
            >
              {t("memoriesAcrossTime", { count: String(totalCount) })}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              border: `1px solid ${T.color.cream}`,
              background: T.color.warmStone,
              color: T.color.muted,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {"\u2715"}
          </button>
        </div>

        {/* Timeline */}
        <div style={{ padding: "0 16px 32px 28px" }}>
          {groups.map((group, gi) => (
            <div key={group.label} style={{ position: "relative" }}>
              {/* Month/year header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                  marginTop: gi > 0 ? 20 : 0,
                }}
              >
                {/* Timeline dot */}
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    background: T.color.walnut,
                    border: `2px solid ${T.color.warmStone}`,
                    flexShrink: 0,
                    position: "relative",
                    zIndex: 2,
                  }}
                />
                <h4
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 16,
                    fontWeight: 600,
                    color: T.color.walnut,
                    margin: 0,
                  }}
                >
                  {t(group.label.split("|")[0])} {group.label.split("|")[1]}
                </h4>
              </div>

              {/* Entries */}
              {group.entries.map((entry, ei) => (
                <div
                  key={entry.mem.id}
                  style={{
                    position: "relative",
                    paddingLeft: 22,
                    marginBottom: 8,
                  }}
                >
                  {/* Vertical line */}
                  <div
                    style={{
                      position: "absolute",
                      left: 5,
                      top: ei === 0 ? -12 : -8,
                      bottom: ei === group.entries.length - 1 ? "50%" : -8,
                      width: 2,
                      background: T.color.cream,
                      zIndex: 1,
                    }}
                  />
                  {/* Small dot */}
                  <div
                    style={{
                      position: "absolute",
                      left: 2,
                      top: 14,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: entry.wingAccent,
                      zIndex: 2,
                    }}
                  />

                  {/* Card */}
                  <button
                    onClick={() => setSelMem(entry.mem)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: `1px solid ${T.color.cream}`,
                      background: T.color.white,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all .15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = `${entry.wingAccent}08`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${entry.wingAccent}40`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = T.color.white;
                      (e.currentTarget as HTMLElement).style.borderColor = T.color.cream;
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: `linear-gradient(135deg, hsl(${entry.mem.hue},${entry.mem.s}%,${entry.mem.l}%), hsl(${entry.mem.hue},${Math.max(0, entry.mem.s - 10)}%,${Math.max(0, entry.mem.l - 10)}%))`,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}
                    >
                      {entry.mem.dataUrl ? (
                        <img
                          src={entry.mem.dataUrl}
                          alt=""
                          style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 8 }}
                        />
                      ) : (
                        <span style={{ fontSize: 14, opacity: 0.7 }}>{entry.roomIcon}</span>
                      )}
                    </div>

                    {/* Info */}
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
                        {entry.mem.title}
                      </div>
                      <div
                        style={{
                          fontFamily: T.font.body,
                          fontSize: 10,
                          color: T.color.muted,
                          marginTop: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span>{entry.roomIcon}</span>
                        <span>{entry.roomName}</span>
                        <span style={{ color: T.color.sandstone }}>{"  \u00B7  "}</span>
                        <span>
                          {entry.date.toLocaleDateString(locale === "nl" ? "nl-NL" : "en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Wing accent indicator */}
                    <div
                      style={{
                        width: 4,
                        height: 24,
                        borderRadius: 2,
                        background: entry.wingAccent,
                        opacity: 0.5,
                        flexShrink: 0,
                      }}
                    />
                  </button>
                </div>
              ))}

              {/* Connecting line to next group */}
              {gi < groups.length - 1 && (
                <div
                  style={{
                    position: "relative",
                    height: 16,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 5,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: T.color.cream,
                      zIndex: 1,
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          {groups.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>{"\uD83D\uDCC5"}</div>
              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: 14,
                  color: T.color.muted,
                }}
              >
                {t("noMemories")}
              </p>
              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: 12,
                  color: T.color.sandstone,
                  marginTop: 4,
                }}
              >
                {t("noMemoriesDesc")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
