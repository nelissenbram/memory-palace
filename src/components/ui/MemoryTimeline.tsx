"use client";
import { useMemo } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
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
  const { containerRef, handleKeyDown } = useFocusTrap(true);
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
        ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: isMobile ? "100%" : "min(26.25rem, 94vw)",
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
            padding: "1.5rem 1.5rem 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <h3
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "1.5rem",
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
                fontSize: "0.6875rem",
                color: T.color.muted,
                margin: "0.25rem 0 0",
              }}
            >
              {t("memoriesAcrossTime", { count: String(totalCount) })}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "1rem",
              border: `1px solid ${T.color.cream}`,
              background: T.color.warmStone,
              color: T.color.muted,
              fontSize: "0.875rem",
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
        <div style={{ padding: "0 1rem 2rem 1.75rem" }}>
          {groups.map((group, gi) => (
            <div key={group.label} style={{ position: "relative" }}>
              {/* Month/year header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  marginBottom: "0.75rem",
                  marginTop: gi > 0 ? "1.25rem" : 0,
                }}
              >
                {/* Timeline dot */}
                <div
                  style={{
                    width: "0.75rem",
                    height: "0.75rem",
                    borderRadius: "0.375rem",
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
                    fontSize: "1rem",
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
                    paddingLeft: "1.375rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  {/* Vertical line */}
                  <div
                    style={{
                      position: "absolute",
                      left: "0.3125rem",
                      top: ei === 0 ? "-0.75rem" : "-0.5rem",
                      bottom: ei === group.entries.length - 1 ? "50%" : "-0.5rem",
                      width: 2,
                      background: T.color.cream,
                      zIndex: 1,
                    }}
                  />
                  {/* Small dot */}
                  <div
                    style={{
                      position: "absolute",
                      left: "0.125rem",
                      top: "0.875rem",
                      width: "0.5rem",
                      height: "0.5rem",
                      borderRadius: "0.25rem",
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
                      gap: "0.625rem",
                      padding: "0.625rem 0.75rem",
                      borderRadius: "0.75rem",
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
                        width: "2.25rem",
                        height: "2.25rem",
                        borderRadius: "0.5rem",
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
                          style={{ width: "2.25rem", height: "2.25rem", objectFit: "cover", borderRadius: "0.5rem" }}
                        />
                      ) : (
                        <span style={{ fontSize: "0.875rem", opacity: 0.7 }}>{entry.roomIcon}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: T.font.body,
                          fontSize: "0.8125rem",
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
                          fontSize: "0.625rem",
                          color: T.color.muted,
                          marginTop: "0.0625rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
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
                        width: "0.25rem",
                        height: "1.5rem",
                        borderRadius: "0.125rem",
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
                    height: "1rem",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: "0.3125rem",
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
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem", opacity: 0.4 }}>{"\uD83D\uDCC5"}</div>
              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.875rem",
                  color: T.color.muted,
                }}
              >
                {t("noMemories")}
              </p>
              <p
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.75rem",
                  color: T.color.sandstone,
                  marginTop: "0.25rem",
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
