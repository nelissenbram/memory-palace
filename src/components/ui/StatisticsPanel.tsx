"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
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

/* ─── animated counter ───────────────────────────────────── */

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) { raf = requestAnimationFrame(tick); }
      else { ref.current = value; }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{display.toLocaleString()}</>;
}

/* ─── types ──────────────────────────────────────────────── */

interface StatisticsPanelProps {
  onClose: () => void;
}

/* ─── component ──────────────────────────────────────────── */

export default function StatisticsPanel({ onClose }: StatisticsPanelProps) {
  const isMobile = useIsMobile();
  const { t, locale } = useTranslation("statistics");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const { userMems } = useMemoryStore();
  const { getWings, getWingRooms } = useRoomStore();
  const [showToast, setShowToast] = useState(false);
  const [digestLoading] = useState(false);
  const [showDigest, setShowDigest] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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

    // Use only real user memories (no placeholder/example data)
    // Flatten all memories
    const allMems: Mem[] = [];
    const roomsWithMems = new Set<string>();
    const wingsWithMems = new Set<string>();
    const wingMemCount: Record<string, number> = {};

    for (const [roomId, mems] of Object.entries(userMems)) {
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

    // Timeline: memories per month (last 12 months), trimmed to first activity
    const now = new Date();
    const monthBucketsRaw: { key: string; label: string; year: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const year = `'${String(d.getFullYear()).slice(2)}`;
      monthBucketsRaw.push({ key, label: MONTH_KEYS[d.getMonth()], year, count: 0 });
    }
    for (const m of allMems) {
      if (!m.createdAt) continue;
      const d = new Date(m.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthBucketsRaw.find((b) => b.key === key);
      if (bucket) bucket.count++;
    }
    // Trim leading empty months — only show from first month with activity
    const firstActive = monthBucketsRaw.findIndex((b) => b.count > 0);
    const monthBuckets = firstActive >= 0 ? monthBucketsRaw.slice(firstActive) : monthBucketsRaw.slice(-1);
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
    const maxDayCount = Math.max(...dayOfWeekCounts);
    const bestDayIdx = maxDayCount > 0 ? dayOfWeekCounts.indexOf(maxDayCount) : -1;

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

    // Time of day analysis
    const hourCounts = new Array(24).fill(0);
    for (const m of allMems) {
      if (!m.createdAt) continue;
      hourCounts[new Date(m.createdAt).getHours()]++;
    }
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const timeOfDay = peakHour < 6 ? "nightOwl" : peakHour < 12 ? "earlyBird" : peakHour < 18 ? "afternoon" : "evening";

    // Location coverage
    const locatedMems = allMems.filter((m) => m.lat !== undefined && m.lng !== undefined);
    const uniqueLocations = new Set(locatedMems.map((m) => `${m.lat?.toFixed(1)},${m.lng?.toFixed(1)}`)).size;

    // Growth: this month vs last month
    const thisMonth = new Date().toISOString().slice(0, 7);
    const lastMonthDate = new Date(); lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);
    let thisMonthCount = 0, lastMonthCount = 0;
    for (const m of allMems) {
      if (!m.createdAt) continue;
      const key = m.createdAt.slice(0, 7);
      if (key === thisMonth) thisMonthCount++;
      else if (key === lastMonth) lastMonthCount++;
    }
    const growthPct = lastMonthCount > 0 ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100) : thisMonthCount > 0 ? 100 : 0;

    // Memories with descriptions
    const withDesc = allMems.filter((m) => m.desc && m.desc.trim().length > 20).length;
    const descPct = allMems.length > 0 ? Math.round((withDesc / allMems.length) * 100) : 0;

    // Day-of-week heatmap data
    const maxDowCount = Math.max(1, ...dayOfWeekCounts);

    // Average words per memory
    const avgWords = allMems.length > 0 ? Math.round(totalWords / allMems.length) : 0;

    // Memory age span
    const ageInDays = earliest && latest
      ? Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Longest gap between memories
    let longestGapDays = 0;
    if (withDates.length > 1) {
      for (let i = 1; i < withDates.length; i++) {
        const gap = Math.ceil(
          (new Date(withDates[i].createdAt!).getTime() - new Date(withDates[i - 1].createdAt!).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (gap > longestGapDays) longestGapDays = gap;
      }
    }

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
      bestDay: bestDayIdx >= 0 ? DAY_KEYS[bestDayIdx] : null,
      totalWords,
      earliest,
      latest,
      timeOfDay,
      peakHour,
      uniqueLocations,
      locatedMems: locatedMems.length,
      thisMonthCount,
      growthPct,
      descPct,
      dayOfWeekCounts,
      maxDowCount,
      avgWords,
      ageInDays,
      longestGapDays,
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
    d ? d.toLocaleDateString(locale === "nl" ? "nl-NL" : "en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

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
        {/* ── Weekly Digest Overlay ── */}
        {showDigest && (
          <div
            onKeyDown={(e) => { if (e.key === "Escape") setShowDigest(false); }}
            style={{
              position: "fixed", inset: 0, zIndex: 810,
              background: T.color.linen, overflowY: "auto",
              animation: "spSlideUp .3s ease",
            }}
          >
            <div style={{
              position: "sticky", top: 0, zIndex: 2,
              background: `${T.color.linen}f0`, backdropFilter: "blur(12px)",
              padding: `max(1rem, env(safe-area-inset-top, 1rem)) 1.5rem 1rem`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              borderBottom: `1px solid ${T.color.cream}`,
            }}>
              <button
                onClick={() => setShowDigest(false)}
                style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.terracotta,
                  background: "none", border: "none", cursor: "pointer", padding: "0.5rem 0",
                  display: "flex", alignItems: "center", gap: "0.25rem",
                }}
              >{"\u2190"} {t("back")}</button>
              <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 500, color: T.color.charcoal, margin: 0 }}>
                {t("weeklyDigestTitle")}
              </h3>
              <div style={{ width: "3rem" }} />
            </div>
            <div style={{ padding: "1.25rem 1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Greeting */}
              <div style={{ textAlign: "center", padding: "1rem 0 0.5rem" }}>
                <div style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 500, color: T.color.charcoal }}>
                  {t("digestGreeting")}
                </div>
                <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, margin: "0.5rem 0 0" }}>
                  {t("digestIntro")}
                </p>
              </div>

              {/* This week's numbers */}
              <div style={{
                ...cardStyle,
                background: `linear-gradient(135deg, ${T.color.terracotta}08, ${T.color.gold}08)`,
                border: `1px solid ${T.color.terracotta}20`,
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", textAlign: "center" }}>
                  <div>
                    <div style={{ fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 600, color: T.color.terracotta }}>{stats.thisMonthCount}</div>
                    <div style={mutedStyle}>{t("digestMemsThisMonth")}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 600, color: T.color.sage }}>{stats.streak}</div>
                    <div style={mutedStyle}>{t("dayStreak")}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 600, color: T.color.walnut }}>{stats.totalRooms}</div>
                    <div style={mutedStyle}>{t("roomsWithMemories")}</div>
                  </div>
                </div>
              </div>

              {/* Personality insight */}
              <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{
                  width: "3rem", height: "3rem", borderRadius: "0.75rem", flexShrink: 0,
                  background: `${T.color.gold}15`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.5rem",
                }}>
                  {stats.timeOfDay === "earlyBird" ? "\u2600\uFE0F" : stats.timeOfDay === "nightOwl" ? "\uD83C\uDF19" : stats.timeOfDay === "afternoon" ? "\u26C5" : "\uD83C\uDF05"}
                </div>
                <div>
                  <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: T.color.charcoal }}>
                    {t(`time_${stats.timeOfDay}`)}
                  </div>
                  <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, marginTop: "0.125rem" }}>
                    {t("digestPeakDesc", { hour: String(stats.peakHour) })}
                  </div>
                </div>
              </div>

              {/* Wing leaderboard */}
              {stats.wingDist.length > 0 && (
                <div style={cardStyle}>
                  <h4 style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: T.color.charcoal, margin: "0 0 0.625rem" }}>
                    {t("digestWingLeader")}
                  </h4>
                  {stats.wingDist.slice(0, 3).map((wing, i) => (
                    <div key={wing.id} style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem" }}>
                      <span style={{ fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600, color: wing.accent, width: "1.5rem" }}>
                        {i === 0 ? "\uD83E\uDD47" : i === 1 ? "\uD83E\uDD48" : "\uD83E\uDD49"}
                      </span>
                      <span style={bodyStyle}>{wing.name}</span>
                      <span style={{ ...mutedStyle, marginLeft: "auto" }}>{wing.count} {t("memories")}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Words milestone */}
              {stats.totalWords > 0 && (
                <div style={{
                  ...cardStyle, textAlign: "center",
                  background: `linear-gradient(135deg, ${T.color.walnut}08, ${T.color.cream})`,
                }}>
                  <div style={{ fontFamily: T.font.display, fontSize: "2rem", fontWeight: 600, color: T.color.walnut }}>
                    {stats.totalWords.toLocaleString()}
                  </div>
                  <div style={mutedStyle}>{t("digestWordsWritten")}</div>
                  <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, marginTop: "0.375rem" }}>
                    {stats.totalWords > 5000 ? t("digestWordsNovel") : stats.totalWords > 1000 ? t("digestWordsEssay") : t("digestWordsGrowing")}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Toast ── */}
        {showToast && (
          <div style={{
            position: "absolute",
            top: "0.75rem",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            background: T.color.sage,
            color: T.color.white,
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            fontWeight: 600,
            padding: "0.5rem 1.25rem",
            borderRadius: "0.5rem",
            boxShadow: "0 0.5rem 1.5rem rgba(0,0,0,0.2)",
            animation: "spSlideUp .3s ease",
          }}>
            {t("weeklyDigestSent")}
          </div>
        )}

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
              { key: "total", label: t("totalMemories"), value: stats.totalMems, color: T.color.terracotta },
              { key: "wings", label: t("wingsUsed"), value: stats.totalWings, color: T.color.sage },
              { key: "rooms", label: t("roomsWithMemories"), value: stats.totalRooms, color: T.color.walnut },
              { key: "avg", label: t("avgPerRoom"), value: parseFloat(stats.avgPerRoom), color: T.color.gold },
            ].map((item) => (
              <div
                key={item.key}
                onMouseEnter={() => setHoveredCard(item.key)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  ...cardStyle,
                  transform: hoveredCard === item.key ? "translateY(-2px)" : "none",
                  boxShadow: hoveredCard === item.key ? `0 0.5rem 1.5rem ${item.color}15` : "none",
                  borderColor: hoveredCard === item.key ? `${item.color}40` : T.color.cream,
                  transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease",
                  cursor: "default",
                }}
              >
                <div
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "1.75rem",
                    fontWeight: 600,
                    color: item.color,
                    lineHeight: 1,
                  }}
                >
                  {item.key === "avg" ? stats.avgPerRoom : <AnimatedNumber value={item.value} />}
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
                    fontFamily: T.font.display,
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
                    fontFamily: T.font.body,
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

          {/* 3. Your Memory Personality — hero card */}
          <div style={{
            ...cardStyle,
            background: `linear-gradient(135deg, ${T.color.terracotta}08, ${T.color.gold}08)`,
            border: `1px solid ${T.color.terracotta}20`,
            textAlign: "center", padding: isMobile ? "1.25rem 1rem" : "1.5rem",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
              {stats.timeOfDay === "earlyBird" ? "\u2600\uFE0F" : stats.timeOfDay === "nightOwl" ? "\uD83C\uDF19" : stats.timeOfDay === "afternoon" ? "\u26C5" : "\uD83C\uDF05"}
            </div>
            <div style={{ fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 600, color: T.color.charcoal }}>
              {t(`time_${stats.timeOfDay}`)}
            </div>
            <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, marginTop: "0.25rem" }}>
              {t("peakCreativityDesc", { hour: String(stats.peakHour) })}
            </div>
            {/* Quick stats row */}
            <div style={{
              display: "flex", justifyContent: "center", gap: isMobile ? "1.25rem" : "2rem",
              marginTop: "1rem", paddingTop: "0.75rem", borderTop: `1px solid ${T.color.cream}`,
            }}>
              {stats.thisMonthCount > 0 && (
                <div>
                  <div style={{ fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 600, color: T.color.terracotta, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
                    <AnimatedNumber value={stats.thisMonthCount} />
                    {stats.growthPct !== 0 && (
                      <span style={{ fontSize: "0.625rem", fontWeight: 600, color: stats.growthPct > 0 ? T.color.sage : T.color.terracotta }}>
                        {stats.growthPct > 0 ? "\u2191" : "\u2193"}{Math.abs(stats.growthPct)}%
                      </span>
                    )}
                  </div>
                  <div style={mutedStyle}>{t("thisMonth")}</div>
                </div>
              )}
              <div>
                <div style={{ fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 600, color: T.color.sage }}>
                  <AnimatedNumber value={stats.streak} />
                </div>
                <div style={mutedStyle}>{t("dayStreak")}</div>
              </div>
              <div>
                <div style={{ fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 600, color: T.color.walnut }}>
                  <AnimatedNumber value={stats.activeDays} />
                </div>
                <div style={mutedStyle}>{t("activeDays")}</div>
              </div>
            </div>
          </div>

          {/* 4. Day-of-Week Heatmap */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>{t("weekdayPattern")}</h3>
            <div style={{ display: "flex", gap: "0.25rem", justifyContent: "space-between" }}>
              {stats.dayOfWeekCounts.map((count, i) => {
                const intensity = stats.maxDowCount > 0 ? count / stats.maxDowCount : 0;
                const isBest = i === (stats.bestDay ? DAY_KEYS.indexOf(stats.bestDay) : -1);
                return (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{
                      height: "3rem", borderRadius: "0.375rem", marginBottom: "0.375rem",
                      background: intensity > 0
                        ? `rgba(193,127,89,${0.12 + intensity * 0.55})`
                        : `${T.color.cream}80`,
                      border: isBest ? `2px solid ${T.color.terracotta}` : "2px solid transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background .4s ease",
                    }}>
                      {count > 0 && (
                        <span style={{ fontFamily: T.font.display, fontSize: "0.75rem", fontWeight: 600, color: intensity > 0.5 ? T.color.white : T.color.charcoal }}>
                          {count}
                        </span>
                      )}
                    </div>
                    <span style={{ ...mutedStyle, fontSize: "0.5625rem", fontWeight: isBest ? 700 : 400, color: isBest ? T.color.terracotta : T.color.muted }}>
                      {t(`day_${DAY_KEYS[i]}`).slice(0, 2)}
                    </span>
                  </div>
                );
              })}
            </div>
            {stats.bestDay && (
              <div style={{ ...mutedStyle, marginTop: "0.5rem", textAlign: "center" }}>
                {t("bestDayInsight", { day: t(`day_${stats.bestDay}`) })}
              </div>
            )}
          </div>

          {/* 5. Monthly Activity — only months with data */}
          {stats.monthBuckets.length > 0 && stats.totalMems > 0 && (
          <div style={cardStyle}>
            <h3 style={headingStyle}>{t("timelineTitle")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {stats.monthBuckets.map((bucket, idx) => (
                <div
                  key={bucket.key}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    animation: `spSlideUp .3s ease ${idx * 0.03}s both`,
                  }}
                >
                  <span style={{ ...mutedStyle, width: "3.75rem", textAlign: "right", flexShrink: 0 }}>
                    {t(`month_${bucket.label}`)} {bucket.year}
                  </span>
                  <div style={{ flex: 1, height: "1.125rem", background: T.color.cream, borderRadius: "0.25rem", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(bucket.count / stats.maxMonthCount) * 100}%`,
                      background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.walnut})`,
                      borderRadius: "0.25rem",
                      transition: "width .6s cubic-bezier(.23,1,.32,1)",
                      minWidth: bucket.count > 0 ? "0.25rem" : 0,
                    }} />
                  </div>
                  <span style={{
                    ...mutedStyle, width: "1.5rem", textAlign: "right", flexShrink: 0,
                    fontWeight: bucket.count > 0 ? 600 : 400,
                    color: bucket.count > 0 ? T.color.charcoal : T.color.muted,
                  }}>
                    {bucket.count || ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* 6. Wing Distribution */}
          {stats.wingDist.length > 0 && (
            <div style={cardStyle}>
              <h3 style={headingStyle}>{t("wingDistribution")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {stats.wingDist.map((wing) => (
                  <div key={wing.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.1875rem" }}>
                      <span style={bodyStyle}>{wing.name}</span>
                      <span style={mutedStyle}>{wing.count} {t("memories")}</span>
                    </div>
                    <div style={{ height: "0.5rem", background: T.color.cream, borderRadius: "0.25rem", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${(wing.count / stats.maxWingCount) * 100}%`,
                        background: wing.accent, borderRadius: "0.25rem", transition: "width .4s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Writing & Storytelling */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>{t("writingTitle")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={{
                padding: "0.75rem", borderRadius: "0.5rem",
                background: `${T.color.walnut}08`, textAlign: "center",
              }}>
                <div style={{ fontFamily: T.font.display, fontSize: "1.5rem", fontWeight: 600, color: T.color.walnut }}>
                  <AnimatedNumber value={stats.totalWords} duration={1200} />
                </div>
                <div style={mutedStyle}>{t("totalWordsWritten")}</div>
              </div>
              <div style={{
                padding: "0.75rem", borderRadius: "0.5rem",
                background: `${T.color.terracotta}08`, textAlign: "center",
              }}>
                <div style={{ fontFamily: T.font.display, fontSize: "1.5rem", fontWeight: 600, color: T.color.terracotta }}>
                  {stats.avgWords}
                </div>
                <div style={mutedStyle}>{t("avgWordsPerMemory")}</div>
              </div>
              <div style={{
                padding: "0.75rem", borderRadius: "0.5rem",
                background: `${T.color.sage}08`, textAlign: "center",
              }}>
                <div style={{ fontFamily: T.font.display, fontSize: "1.5rem", fontWeight: 600, color: T.color.sage }}>
                  {stats.descPct}%
                </div>
                <div style={mutedStyle}>{t("storiesWritten")}</div>
              </div>
              {stats.uniqueLocations > 0 && (
                <div style={{
                  padding: "0.75rem", borderRadius: "0.5rem",
                  background: `${T.color.gold}08`, textAlign: "center",
                }}>
                  <div style={{ fontFamily: T.font.display, fontSize: "1.5rem", fontWeight: 600, color: T.color.gold }}>
                    <AnimatedNumber value={stats.uniqueLocations} />
                  </div>
                  <div style={mutedStyle}>{t("placesOnMap")}</div>
                </div>
              )}
            </div>
          </div>

          {/* 8. Memory Journey — timeline span */}
          {stats.earliest && (
            <div style={{
              ...cardStyle,
              background: `linear-gradient(135deg, ${T.color.sage}06, ${T.color.cream})`,
              display: "flex", flexDirection: "column", gap: "0.75rem",
            }}>
              <h3 style={headingStyle}>{t("journeyTitle")}</h3>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ ...mutedStyle, marginBottom: "0.125rem" }}>{t("earliestMemory")}</div>
                  <div style={bodyStyle}>{formatDate(stats.earliest)}</div>
                </div>
                <div style={{
                  flex: 1, margin: "0 0.75rem", height: "2px",
                  background: `linear-gradient(90deg, ${T.color.sage}, ${T.color.terracotta})`,
                  borderRadius: "1px",
                }} />
                <div style={{ textAlign: "right" }}>
                  <div style={{ ...mutedStyle, marginBottom: "0.125rem" }}>{t("latestMemory")}</div>
                  <div style={bodyStyle}>{formatDate(stats.latest)}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem" }}>
                {stats.ageInDays > 0 && (
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: T.color.sage }}>
                      <AnimatedNumber value={stats.ageInDays} />
                    </span>
                    <div style={mutedStyle}>{t("daysSpanned")}</div>
                  </div>
                )}
                {stats.longestGapDays > 1 && (
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: T.color.muted }}>
                      {stats.longestGapDays}
                    </span>
                    <div style={mutedStyle}>{t("longestGap")}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. Weekly Digest */}
          <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
            <button
              onClick={() => setShowDigest(true)}
              disabled={digestLoading}
              style={{
                fontFamily: T.font.body,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: digestLoading ? T.color.muted : T.color.terracotta,
                background: `${T.color.terracotta}10`,
                border: `1px solid ${T.color.terracotta}30`,
                borderRadius: "0.5rem",
                padding: "0.625rem 1.25rem",
                cursor: digestLoading ? "default" : "pointer",
                transition: "background 0.2s ease",
                opacity: digestLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { if (!digestLoading) e.currentTarget.style.background = `${T.color.terracotta}20`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = `${T.color.terracotta}10`; }}
            >
              {t("weeklyDigestRead")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
