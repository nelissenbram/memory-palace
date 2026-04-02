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

/* ─── helpers ────────────────────────────────────────────── */

const DAY_KEYS = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
];

const MONTH_KEYS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

const TYPE_COLORS: Record<string, string> = {
  text: T.color.walnut,
  photo: T.color.terracotta,
  video: T.color.sage,
  audio: T.color.gold,
  other: T.color.sandstone,
};

function countWords(mems: Mem[]): number {
  let total = 0;
  for (const m of mems) {
    if (m.desc) total += m.desc.split(/\s+/).filter(Boolean).length;
    if (m.title) total += m.title.split(/\s+/).filter(Boolean).length;
  }
  return total;
}

/* ─── types ──────────────────────────────────────────────── */

interface StatisticsPanelProps {
  onClose: () => void;
}

/* ─── component ──────────────────────────────────────────── */

export default function StatisticsPanel({ onClose }: StatisticsPanelProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("statistics");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const { userMems } = useMemoryStore();
  const { getWings, getWingRooms } = useRoomStore();

  /* ── aggregate all memories ── */
  const stats = useMemo(() => {
    const wings = getWings();

    // Build room-to-wing map
    const roomToWing: Record<string, { wingId: string; wingName: string }> = {};
    for (const wing of wings) {
      for (const room of getWingRooms(wing.id)) {
        roomToWing[room.id] = { wingId: wing.id, wingName: wing.name };
      }
    }

    // Merge default + user memories
    const merged: Record<string, Mem[]> = { ...ROOM_MEMS };
    for (const [k, v] of Object.entries(userMems)) {
      merged[k] = v;
    }

    // Flatten all memories
    const allMems: Mem[] = [];
    const roomsWithMems = new Set<string>();
    const wingsWithMems = new Set<string>();
    const wingMemCount: Record<string, number> = {};

    for (const [roomId, mems] of Object.entries(merged)) {
      if (!mems.length) continue;
      const info = roomToWing[roomId];
      roomsWithMems.add(roomId);
      if (info) {
        wingsWithMems.add(info.wingId);
        wingMemCount[info.wingId] = (wingMemCount[info.wingId] || 0) + mems.length;
      }
      allMems.push(...mems);
    }

    // Type breakdown
    const typeCounts: Record<string, number> = {};
    for (const m of allMems) {
      const bucket = ["text", "photo", "video", "audio"].includes(m.type) ? m.type : "other";
      typeCounts[bucket] = (typeCounts[bucket] || 0) + 1;
    }

    // Timeline: memories per month (last 12 months)
    const now = new Date();
    const monthBuckets: { key: string; label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthBuckets.push({ key, label: MONTH_KEYS[d.getMonth()], count: 0 });
    }
    for (const m of allMems) {
      if (!m.createdAt) continue;
      const d = new Date(m.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthBuckets.find((b) => b.key === key);
      if (bucket) bucket.count++;
    }
    const maxMonthCount = Math.max(1, ...monthBuckets.map((b) => b.count));

    // Wing distribution
    const wingDist = wings
      .map((w) => ({ id: w.id, name: w.name, accent: w.accent, count: wingMemCount[w.id] || 0 }))
      .filter((w) => w.count > 0)
      .sort((a, b) => b.count - a.count);
    const maxWingCount = Math.max(1, ...wingDist.map((w) => w.count));

    // Activity: streak & most productive day
    const activityDays = new Set<string>();
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const m of allMems) {
      if (!m.createdAt) continue;
      const d = new Date(m.createdAt);
      activityDays.add(d.toISOString().slice(0, 10));
      dayOfWeekCounts[d.getDay()]++;
    }
    const bestDayIdx = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));

    // Streak (consecutive days ending today or yesterday)
    let streak = 0;
    const sortedDays = Array.from(activityDays).sort().reverse();
    if (sortedDays.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let cursor = sortedDays[0] === today || sortedDays[0] === yesterday ? sortedDays[0] : null;
      if (cursor) {
        streak = 1;
        for (let i = 1; i < sortedDays.length; i++) {
          const prev = new Date(cursor!);
          prev.setDate(prev.getDate() - 1);
          const expected: string = prev.toISOString().slice(0, 10);
          if (sortedDays[i] === expected) {
            streak++;
            cursor = expected;
          } else break;
        }
      }
    }

    // Fun facts
    const withDates = allMems.filter((m) => m.createdAt).sort((a, b) =>
      new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
    );
    const earliest = withDates.length > 0 ? new Date(withDates[0].createdAt!) : null;
    const latest = withDates.length > 0 ? new Date(withDates[withDates.length - 1].createdAt!) : null;
    const totalWords = countWords(allMems);

    return {
      totalMems: allMems.length,
      totalWings: wingsWithMems.size,
      totalRooms: roomsWithMems.size,
      avgPerRoom: roomsWithMems.size > 0 ? (allMems.length / roomsWithMems.size).toFixed(1) : "0",
      typeCounts,
      monthBuckets,
      maxMonthCount,
      wingDist,
      maxWingCount,
      activeDays: activityDays.size,
      streak,
      bestDay: DAY_KEYS[bestDayIdx],
      totalWords,
      earliest,
      latest,
    };
  }, [userMems, getWings, getWingRooms]);

  /* ── donut chart segments ── */
  const donutSegments = useMemo(() => {
    const total = stats.totalMems || 1;
    const types = Object.entries(stats.typeCounts).sort((a, b) => b[1] - a[1]);
    const segments: { type: string; pct: number; color: string; offset: number }[] = [];
    let offset = 0;
    for (const [type, count] of types) {
      const pct = (count / total) * 100;
      segments.push({ type, pct, color: TYPE_COLORS[type] || T.color.sandstone, offset });
      offset += pct;
    }
    return segments;
  }, [stats.typeCounts, stats.totalMems]);

  /* ── shared styles ── */
  const cardStyle: React.CSSProperties = {
    background: "rgba(250,250,247,0.95)",
    backdropFilter: "blur(12px)",
    borderRadius: "0.75rem",
    border: `1px solid ${T.color.cream}`,
    padding: isMobile ? "1rem" : "1.25rem",
    marginBottom: "1rem",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: T.font.display,
    fontSize: "1.125rem",
    fontWeight: 600,
    color: T.color.charcoal,
    margin: "0 0 0.75rem",
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: T.font.body,
    fontSize: "0.8125rem",
    color: T.color.charcoal,
  };

  const mutedStyle: React.CSSProperties = {
    fontFamily: T.font.body,
    fontSize: "0.6875rem",
    color: T.color.muted,
  };

  const formatDate = (d: Date | null) =>
    d ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(42,34,24,.45)",
        backdropFilter: "blur(6px)",
        zIndex: 800,
        animation: "spFadeIn .25s ease",
        display: "flex",
        justifyContent: "center",
        alignItems: isMobile ? "flex-end" : "center",
      }}
    >
      <style>{`
        @keyframes spFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spSlideUp{from{opacity:0;transform:translateY(2rem)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: isMobile ? "100%" : "min(40rem, 92vw)",
          maxHeight: isMobile ? "92vh" : "88vh",
          background: T.color.linen,
          borderRadius: isMobile ? "1rem 1rem 0 0" : "1rem",
          boxShadow: "0 1.5rem 4rem rgba(42,34,24,.25)",
          overflowY: "auto",
          animation: "spSlideUp .3s cubic-bezier(.23,1,.32,1)",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: `${T.color.linen}f0`,
            backdropFilter: "blur(12px)",
            padding: "1.25rem 1.5rem 1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${T.color.cream}`,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: T.font.display,
                fontSize: "1.5rem",
                fontWeight: 500,
                color: T.color.charcoal,
                margin: 0,
              }}
            >
              {t("title")}
            </h2>
            <p style={{ ...mutedStyle, margin: "0.25rem 0 0" }}>
              {t("subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t("close")}
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
              flexShrink: 0,
            }}
          >
            {"\u2715"}
          </button>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: "1rem 1.5rem 2rem" }}>

          {/* 1. Overview bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            {[
              { label: t("totalMemories"), value: String(stats.totalMems) },
              { label: t("wingsUsed"), value: String(stats.totalWings) },
              { label: t("roomsWithMemories"), value: String(stats.totalRooms) },
              { label: t("avgPerRoom"), value: stats.avgPerRoom },
            ].map((item) => (
              <div key={item.label} style={cardStyle}>
                <div
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.75rem",
                    fontWeight: 600,
                    color: T.color.terracotta,
                    lineHeight: 1,
                  }}
                >
                  {item.value}
                </div>
                <div style={{ ...mutedStyle, marginTop: "0.25rem" }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* 2. Memory Type Breakdown — donut chart */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>{t("typeBreakdown")}</h3>
            <div
              style={{
                display: "flex",
                alignItems: isMobile ? "flex-start" : "center",
                gap: "1.5rem",
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              {/* Donut SVG */}
              <svg
                viewBox="0 0 36 36"
                style={{ width: "7rem", height: "7rem", flexShrink: 0, alignSelf: "center" }}
              >
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.type}
                    cx="18" cy="18" r="15.915"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="3.5"
                    strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                    strokeDashoffset={`${-seg.offset}`}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dasharray .4s ease" }}
                  />
                ))}
                {/* Center label */}
                <text
                  x="18" y="17.5"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: "6px",
                    fontWeight: 600,
                    fill: T.color.charcoal,
                  }}
                >
                  {stats.totalMems}
                </text>
                <text
                  x="18" y="21.5"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontFamily: "'Source Sans 3', system-ui, sans-serif",
                    fontSize: "2.5px",
                    fill: T.color.muted,
                  }}
                >
                  {t("total")}
                </text>
              </svg>

              {/* Legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {donutSegments.map((seg) => (
                  <div key={seg.type} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        width: "0.625rem",
                        height: "0.625rem",
                        borderRadius: "0.1875rem",
                        background: seg.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={bodyStyle}>
                      {t(`type_${seg.type}`)}
                    </span>
                    <span style={mutedStyle}>
                      {Math.round(seg.pct)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Timeline Chart — last 12 months */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>{t("timelineTitle")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {stats.monthBuckets.map((bucket) => (
                <div
                  key={bucket.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      ...mutedStyle,
                      width: "2rem",
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {t(`month_${bucket.label}`)}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "1.125rem",
                      background: T.color.cream,
                      borderRadius: "0.25rem",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(bucket.count / stats.maxMonthCount) * 100}%`,
                        background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.walnut})`,
                        borderRadius: "0.25rem",
                        transition: "width .4s ease",
                        minWidth: bucket.count > 0 ? "0.25rem" : 0,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      ...mutedStyle,
                      width: "1.5rem",
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {bucket.count || ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Wing Distribution */}
          {stats.wingDist.length > 0 && (
            <div style={cardStyle}>
              <h3 style={headingStyle}>{t("wingDistribution")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {stats.wingDist.map((wing) => (
                  <div key={wing.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.1875rem",
                      }}
                    >
                      <span style={bodyStyle}>{wing.name}</span>
                      <span style={mutedStyle}>
                        {wing.count} {t("memories")}
                      </span>
                    </div>
                    <div
                      style={{
                        height: "0.5rem",
                        background: T.color.cream,
                        borderRadius: "0.25rem",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${(wing.count / stats.maxWingCount) * 100}%`,
                          background: wing.accent,
                          borderRadius: "0.25rem",
                          transition: "width .4s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Memory Activity */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>{t("activityTitle")}</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "1rem",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    color: T.color.terracotta,
                    lineHeight: 1,
                  }}
                >
                  {stats.activeDays}
                </div>
                <div style={{ ...mutedStyle, marginTop: "0.1875rem" }}>
                  {t("activeDays")}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    color: T.color.sage,
                    lineHeight: 1,
                  }}
                >
                  {stats.streak}
                </div>
                <div style={{ ...mutedStyle, marginTop: "0.1875rem" }}>
                  {t("dayStreak")}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    color: T.color.walnut,
                    lineHeight: 1,
                  }}
                >
                  {t(`day_${stats.bestDay}`)}
                </div>
                <div style={{ ...mutedStyle, marginTop: "0.1875rem" }}>
                  {t("mostProductiveDay")}
                </div>
              </div>
            </div>
          </div>

          {/* 6. Fun Facts */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>{t("funFacts")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={bodyStyle}>{t("totalWordsWritten")}</span>
                <span
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: T.color.terracotta,
                  }}
                >
                  {stats.totalWords.toLocaleString()}
                </span>
              </div>
              <div
                style={{
                  height: "1px",
                  background: T.color.cream,
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={bodyStyle}>{t("earliestMemory")}</span>
                <span style={bodyStyle}>{formatDate(stats.earliest)}</span>
              </div>
              <div
                style={{
                  height: "1px",
                  background: T.color.cream,
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={bodyStyle}>{t("latestMemory")}</span>
                <span style={bodyStyle}>{formatDate(stats.latest)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
