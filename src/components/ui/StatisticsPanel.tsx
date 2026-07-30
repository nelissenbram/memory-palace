"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile, useIsCompact, useIsTablet } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { localeDateCodes, type Locale } from "@/i18n/config";
import { Sheet } from "@/components/ui/Sheet";
import type { Mem } from "@/lib/constants/defaults";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { translateWingName } from "@/lib/constants/wings";
import { INK, MUTED, HAIRLINE, CREAM, EMBER, EMBER_GLYPH, SAGE } from "@/lib/libraryTokens";

/* ─── Time-of-day SVG icons (Tuscan style) ─── */
function TimeOfDayIcon({ tod, size = 24 }: { tod: string; size?: number }) {
  const gold = "#8A6410"; // Atrium token: browned gold glyph (true gold reserved for the palace itself)
  const terracotta = "#9A4F2A"; // Atrium token: terracotta glyph
  const sage = SAGE; // Atrium token: sage
  const p = { "aria-hidden": true as const, width: size, height: size, viewBox: "0 0 24 24", fill: "none" };
  switch (tod) {
    case "earlyBird": // sunrise with rays
      return (
        <svg {...p}>
          <path d="M4 17h16" stroke={gold} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M6 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={gold} strokeWidth="1.3" fill={`${gold}20`} />
          <line x1="12" y1="5" x2="12" y2="8" stroke={gold} strokeWidth="1" strokeLinecap="round" />
          <line x1="5.5" y1="9" x2="7.5" y2="10.5" stroke={gold} strokeWidth="0.8" strokeLinecap="round" />
          <line x1="18.5" y1="9" x2="16.5" y2="10.5" stroke={gold} strokeWidth="0.8" strokeLinecap="round" />
          <line x1="3" y1="6.5" x2="5" y2="7.5" stroke={gold} strokeWidth="0.6" strokeLinecap="round" />
          <line x1="21" y1="6.5" x2="19" y2="7.5" stroke={gold} strokeWidth="0.6" strokeLinecap="round" />
          <circle cx="12" cy="14" r="1" fill={gold} />
        </svg>
      );
    case "afternoon": // full sun with haze
      return (
        <svg {...p}>
          <circle cx="12" cy="10" r="4.5" stroke={gold} strokeWidth="1.3" fill={`${gold}25`} />
          <circle cx="12" cy="10" r="1.5" fill={gold} />
          <line x1="12" y1="2.5" x2="12" y2="4.5" stroke={gold} strokeWidth="1" strokeLinecap="round" />
          <line x1="12" y1="15.5" x2="12" y2="17.5" stroke={gold} strokeWidth="1" strokeLinecap="round" />
          <line x1="4.5" y1="10" x2="6.5" y2="10" stroke={gold} strokeWidth="1" strokeLinecap="round" />
          <line x1="17.5" y1="10" x2="19.5" y2="10" stroke={gold} strokeWidth="1" strokeLinecap="round" />
          <line x1="6.5" y1="4.5" x2="8" y2="6" stroke={gold} strokeWidth="0.8" strokeLinecap="round" />
          <line x1="16" y1="6" x2="17.5" y2="4.5" stroke={gold} strokeWidth="0.8" strokeLinecap="round" />
          <path d="M5 19.5c2-1.5 4.5-2 7-2s5 .5 7 2" stroke={sage} strokeWidth="0.7" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "evening": // sunset behind Tuscan hill
      return (
        <svg {...p}>
          <path d="M2 18c3-2 6-5 10-5s7 3 10 5" stroke={sage} strokeWidth="1" fill={`${sage}12`} />
          <path d="M8 18c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke={terracotta} strokeWidth="1.3" fill={`${terracotta}25`} />
          <line x1="12" y1="10" x2="12" y2="12" stroke={terracotta} strokeWidth="0.8" strokeLinecap="round" />
          <line x1="8.5" y1="11.5" x2="9.5" y2="12.5" stroke={terracotta} strokeWidth="0.7" strokeLinecap="round" />
          <line x1="15.5" y1="11.5" x2="14.5" y2="12.5" stroke={terracotta} strokeWidth="0.7" strokeLinecap="round" />
          <path d="M2 18h20" stroke={gold} strokeWidth="1.2" strokeLinecap="round" />
          <path d="M4 20h16" stroke={`${gold}60`} strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      );
    case "nightOwl": // crescent moon with stars
      return (
        <svg {...p}>
          <path d="M16 5c-4 0-7.5 3-7.5 7.5S12 20 16 20c-5.5 0-10-4-10-7.5S10.5 5 16 5z" stroke={gold} strokeWidth="1.2" fill={`${gold}18`} />
          <circle cx="16.5" cy="7" r="0.7" fill={gold} />
          <circle cx="19" cy="10" r="0.5" fill={gold} />
          <circle cx="17.5" cy="13" r="0.6" fill={gold} />
          <circle cx="14" cy="5.5" r="0.4" fill={`${gold}70`} />
          <circle cx="19.5" cy="14.5" r="0.4" fill={`${gold}60`} />
        </svg>
      );
    default:
      return null;
  }
}

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
  text: "#8B6B3D", // Atrium token: walnut data hue (distinct from body-ink so the segment reads as data, not a gap)
  photo: "#9A4F2A", // Atrium token: terracotta glyph
  video: SAGE, // Atrium token: sage
  audio: "#8A6410", // Atrium token: browned gold (true gold reserved for the palace itself)
  other: "#716A5E", // Atrium token: muted
};

function countWords(mems: Mem[]): number {
  let total = 0;
  for (const m of mems) {
    if (m.desc) total += m.desc.split(/\s+/).filter(Boolean).length;
    if (m.title) total += m.title.split(/\s+/).filter(Boolean).length;
  }
  return total;
}

/* ─── reduced-motion guard ───────────────────────────────────
 *  Local, self-contained hook so entrance/layout animations are
 *  suppressed in JS too — not only via the injected @media block.
 *  (No shared usePrefersReducedMotion() hook exists yet, and this
 *  panel is the only file in scope.) ── */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    // addEventListener is the modern API; guard for older Safari.
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, []);
  return reduced;
}

/* ─── animated counter ───────────────────────────────────── */

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const diff = value - start;
    if (diff === 0) return;
    // Atrium motion budget: respect prefers-reduced-motion — jump straight to the value.
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ref.current = value;
      setDisplay(value);
      return;
    }
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
  const isCompact = useIsCompact();
  const isTablet = useIsTablet();
  const reduceMotion = usePrefersReducedMotion();
  const { t, locale } = useTranslation("statistics");
  const { t: tWings } = useTranslation("wings");
  const { userMems } = useMemoryStore();
  const { getWings, getWingRooms } = useRoomStore();
  // Subscribe to the underlying wing/room config slices (not just the stable
  // getter method refs) so the stats useMemo re-runs when a wing or room is
  // renamed/customized/added — otherwise the memo goes stale on customization.
  const customWings = useRoomStore((s) => s.customWings);
  const extraWings = useRoomStore((s) => s.extraWings);
  const customRooms = useRoomStore((s) => s.customRooms);
  const [showDigest, setShowDigest] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const digestBackRef = useRef<HTMLButtonElement>(null);

  /* ── aggregate all memories ── */
  const stats = useMemo(() => {
    const wings = getWings();

    // Build room-to-wing map
    const roomToWing: Record<string, { wingId: string; wingName: string }> = {};
    for (const wing of wings) {
      for (const room of getWingRooms(wing.id)) {
        roomToWing[room.id] = { wingId: wing.id, wingName: translateWingName(wing, tWings) };
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
      .map((w) => ({ id: w.id, name: w.name, nameKey: w.nameKey, accent: w.accent, count: wingMemCount[w.id] || 0 }))
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

    // How many memories carry a real timestamp. Memories can exist with no
    // createdAt (offline IndexedDB cache drops it; legacy rows have null
    // created_at). Without this guard, all-zero hourCounts would fabricate a
    // "night owl / peak at 0:00" insight over an empty timeline.
    const datedCount = allMems.filter((m) => m.createdAt).length;

    // Time of day analysis — only meaningful when at least one memory is dated.
    const hourCounts = new Array(24).fill(0);
    for (const m of allMems) {
      if (!m.createdAt) continue;
      hourCounts[new Date(m.createdAt).getHours()]++;
    }
    const peakHour = datedCount > 0 ? hourCounts.indexOf(Math.max(...hourCounts)) : -1;
    const timeOfDay: string | null = datedCount === 0
      ? null
      : peakHour < 6 ? "nightOwl" : peakHour < 12 ? "earlyBird" : peakHour < 18 ? "afternoon" : "evening";

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
      datedCount,
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
  }, [userMems, getWings, getWingRooms, tWings, customWings, extraWings, customRooms]);

  /* ── donut chart segments ── */
  const donutSegments = useMemo(() => {
    const total = stats.totalMems || 1;
    const types = Object.entries(stats.typeCounts).sort((a, b) => b[1] - a[1]);
    const segments: { type: string; pct: number; color: string; offset: number }[] = [];
    let offset = 0;
    for (const [type, count] of types) {
      const pct = (count / total) * 100;
      segments.push({ type, pct, color: TYPE_COLORS[type] || "#716A5E" /* Atrium token: muted (sandstone retired) */, offset });
      offset += pct;
    }
    return segments;
  }, [stats.typeCounts, stats.totalMems]);

  /* ── text summary of the donut for screen readers ── */
  const donutSummary = donutSegments
    .map((seg) => `${t(`type_${seg.type}`)} ${Math.round(seg.pct)}%`)
    .join(", ");

  /* ── short weekday labels via Intl (locale-correct, replaces fragile .slice(0,2)) ── */
  const dayShort = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(localeDateCodes[locale as Locale], { weekday: "short" });
    // 2023-01-01 is a Sunday → indices 0..6 map to Sun..Sat, matching DAY_KEYS.
    return DAY_KEYS.map((_, i) => fmt.format(new Date(Date.UTC(2023, 0, 1 + i))));
  }, [locale]);

  /* ── move focus into the digest overlay when it opens, so keyboard/SR users
   *    don't stay trapped behind it in the underlying stats dialog. ── */
  useEffect(() => {
    if (showDigest) digestBackRef.current?.focus();
  }, [showDigest]);

  /* ── shared styles ── */
  const cardStyle: React.CSSProperties = {
    background: CREAM, // Atrium token: cream, opaque
    borderRadius: "1rem", // Atrium token: card radius
    border: `0.0625rem solid ${HAIRLINE}`, // Atrium token: hairline
    boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", // Atrium token: S1 + top highlight
    padding: isTablet ? "1.5rem" : isMobile ? "1rem" : "1.25rem",
    marginBottom: "1rem",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: T.font.display,
    fontSize: "1.0625rem", // Atrium token: titleS
    fontWeight: 600,
    color: INK, // Atrium token: ink
    lineHeight: 1.15, // Atrium token: display line-height
    margin: "0 0 0.75rem",
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: T.font.body,
    fontSize: "0.8125rem",
    color: INK /* Atrium token: ink */,
  };

  const mutedStyle: React.CSSProperties = {
    fontFamily: T.font.body,
    fontSize: "0.6875rem",
    color: MUTED /* Atrium token: muted, full opacity */,
  };

  const formatDate = (d: Date | null) =>
    d ? d.toLocaleDateString(localeDateCodes[locale as Locale], { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <Sheet
      open
      onClose={onClose}
      side="right"
      maxWidth="40rem"
      background={CREAM /* Atrium token: cream shell (canon bg); linen reserved for recessed trays/tracks */}
      title={
        <div className="sp-stats-root">
          <h2
            style={{
              fontFamily: T.font.display,
              fontSize: "1.375rem",
              fontWeight: 600,
              color: "#403B36" /* Atrium token: ink */,
              margin: 0,
            }}
          >
            {t("title")}
          </h2>
          <p style={{ ...mutedStyle, margin: "0.25rem 0 0" }}>
            {t("subtitle")}
          </p>
        </div>
      }
    >
      <div
        className="sp-stats-root"
        style={{ display: "flex", flexDirection: "column", flex: 1 }}
      >
        <style>{`
          @keyframes spFadeIn{from{opacity:0}to{opacity:1}}
          @keyframes spSlideUp{from{opacity:0;transform:translateY(2rem)}to{opacity:1;transform:translateY(0)}}
          .sp-stats-root button:focus-visible{outline:0.1875rem solid #D4AF37;outline-offset:0.1875rem}
          @media (prefers-reduced-motion: reduce){.sp-stats-root,.sp-stats-root *{animation:none!important;transition:none!important}}
        `}</style>

        {/* ── Weekly Digest Overlay ── */}
        {showDigest && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("weeklyDigestTitle")}
            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setShowDigest(false); } }}
            style={{
              position: "fixed", inset: 0, zIndex: 1010, // above the shared Sheet scrim (z-index 1000)
              background: CREAM, overflowY: "auto",
              animation: reduceMotion ? "none" : "spSlideUp .3s ease",
            }}
          >
            <div style={{
              position: "sticky", top: 0, zIndex: 2,
              background: `${CREAM}f0`, backdropFilter: "blur(12px)", // Atrium token: cream shell glass
              padding: `max(1rem, env(safe-area-inset-top, 1rem)) 1.5rem 1rem`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              borderBottom: "0.0625rem solid #E3D6BC", // Atrium token: hairline
            }}>
              <button
                ref={digestBackRef}
                onClick={() => setShowDigest(false)}
                style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: EMBER_GLYPH /* Atrium token: terracotta glyph */,
                  background: "none", border: "none", cursor: "pointer",
                  minHeight: "2.75rem", padding: "0.5rem 0.25rem",
                  display: "flex", alignItems: "center", gap: "0.25rem",
                }}
              >{"\u2190"} {t("back")}</button>
              <h3 style={{ fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */, margin: 0 }}>
                {t("weeklyDigestTitle")}
              </h3>
              <div style={{ width: "3rem" }} />
            </div>
            <div style={{ padding: "1.25rem 1.5rem 2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Greeting */}
              <div style={{ textAlign: "center", padding: "1rem 0 0.5rem" }}>
                <div style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */ }}>
                  {t("digestGreeting")}
                </div>
                <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted, full opacity */, margin: "0.5rem 0 0" }}>
                  {t("digestIntro")}
                </p>
              </div>

              {/* This week's numbers */}
              <div style={{
                ...cardStyle,
                background: "linear-gradient(160deg, #FBF2EC 0%, #FCFAF5 78%)" /* Atrium token: terracotta tile wash, opaque */,
                border: "0.0625rem solid #E7D9C4", // Atrium token: terracotta zone border
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", textAlign: "center" }}>
                  <div>
                    <div style={{ fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 600, color: "#9A4F2A" /* Atrium token: terracotta glyph */ }}>{stats.thisMonthCount}</div>
                    <div style={mutedStyle}>{t("digestMemsThisMonth")}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 600, color: SAGE /* Atrium token: sage */ }}>{stats.streak}</div>
                    <div style={mutedStyle}>{t("dayStreak")}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink (walnut retired) */ }}>{stats.totalRooms}</div>
                    <div style={mutedStyle}>{t("roomsWithMemories")}</div>
                  </div>
                </div>
              </div>

              {/* Personality insight — only with real timestamps */}
              {stats.datedCount > 0 && stats.timeOfDay && (
              <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{
                  width: "3rem", height: "3rem", borderRadius: "0.75rem", flexShrink: 0,
                  background: "rgba(169,116,27,0.14)", display: "flex", alignItems: "center", justifyContent: "center", // Atrium token: gold-zone medallion
                }}>
                  <TimeOfDayIcon tod={stats.timeOfDay} size={28} />
                </div>
                <div>
                  <div style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */ }}>
                    {t(`time_${stats.timeOfDay}`)}
                  </div>
                  <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted, full opacity */, marginTop: "0.125rem" }}>
                    {t("digestPeakDesc", { hour: String(stats.peakHour) })}
                  </div>
                </div>
              </div>
              )}

              {/* Wing leaderboard */}
              {stats.wingDist.length > 0 && (
                <div style={cardStyle}>
                  <h4 style={{ fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */, margin: "0 0 0.625rem" }}>
                    {t("digestWingLeader")}
                  </h4>
                  {stats.wingDist.slice(0, 3).map((wing, i) => (
                    <div key={wing.id} style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.375rem" }}>
                      <span style={{ fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600, color: wing.accent, width: "1.5rem" }}>
                        {i === 0 ? "\uD83E\uDD47" : i === 1 ? "\uD83E\uDD48" : "\uD83E\uDD49"}
                      </span>
                      <span style={bodyStyle}>{translateWingName(wing, tWings)}</span>
                      <span style={{ ...mutedStyle, marginLeft: "auto" }}>{wing.count} {t("memories")}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Words milestone */}
              {stats.totalWords > 0 && (
                <div style={{
                  ...cardStyle, textAlign: "center",
                  background: "linear-gradient(160deg, #F2EDE4 0%, #FCFAF5 78%)", // Atrium token: linen tile wash, opaque
                }}>
                  <div style={{ fontFamily: T.font.display, fontSize: "1.75rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink (walnut retired) */ }}>
                    {stats.totalWords.toLocaleString()}
                  </div>
                  <div style={mutedStyle}>{t("digestWordsWritten")}</div>
                  <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted, full opacity */, marginTop: "0.375rem" }}>
                    {stats.totalWords > 5000 ? t("digestWordsNovel") : stats.totalWords > 1000 ? t("digestWordsEssay") : t("digestWordsGrowing")}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Content ── */}
        {stats.totalMems === 0 ? (
          /* ── Empty state — a zero-memory user sees an invitation, not fabricated
             "night owl / peak at 0:00" insights over hollow charts. ── */
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "3rem 1.5rem",
            gap: "0.75rem",
          }}>
            <div style={{
              fontFamily: T.font.display,
              fontSize: "1.375rem",
              fontWeight: 600,
              color: INK,
              lineHeight: 1.2,
            }}>
              {t("emptyTitle")}
            </div>
            <p style={{
              fontFamily: T.font.body,
              fontSize: "0.9375rem",
              color: MUTED,
              margin: 0,
              maxWidth: "22rem",
            }}>
              {t("noData")}
            </p>
          </div>
        ) : (
        <div style={{ padding: "1rem 1.5rem 2rem" }}>

          {/* 1. Overview bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : isCompact ? "1fr 1fr" : "1fr 1fr 1fr 1fr",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            {[
              { key: "total", label: t("totalMemories"), value: stats.totalMems, color: "#9A4F2A" /* Atrium token: terracotta glyph */ },
              { key: "wings", label: t("wingsUsed"), value: stats.totalWings, color: SAGE /* Atrium token: sage */ },
              { key: "rooms", label: t("roomsWithMemories"), value: stats.totalRooms, color: "#403B36" /* Atrium token: ink (walnut retired) */ },
              { key: "avg", label: t("avgPerRoom"), value: parseFloat(stats.avgPerRoom), color: "#8A6410" /* Atrium token: browned gold (true gold reserved for the palace) */ },
            ].map((item) => (
              <div
                key={item.key}
                onMouseEnter={() => setHoveredCard(item.key)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  ...cardStyle,
                  transform: hoveredCard === item.key ? "translateY(-0.1875rem)" : "none",
                  boxShadow: hoveredCard === item.key ? "0 0.5rem 1.5rem rgba(64,59,54,0.14)" : "0 0.25rem 1rem rgba(64,59,54,0.07)", // Atrium token: S1 → S2 on hover
                  borderColor: "#E3D6BC", // Atrium token: hairline
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
                role="img"
                aria-label={`${t("typeBreakdown")}: ${donutSummary}`}
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
                    style={{ transition: "stroke-dasharray .3s ease" }}
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
                    fill: "#403B36" /* Atrium token: ink */,
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
                    fill: "#716A5E" /* Atrium token: muted, full opacity */,
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

          {/* 3. Your Memory Personality — hero card (only with real timestamps;
               a fabricated "night owl / peak 0:00" insight is worse than none) */}
          {stats.datedCount > 0 && stats.timeOfDay && (
          <div style={{
            ...cardStyle,
            background: "linear-gradient(160deg, #FBF2EC 0%, #FCFAF5 78%)" /* Atrium token: terracotta tile wash, opaque */,
            border: "0.0625rem solid #E7D9C4", // Atrium token: terracotta zone border
            textAlign: "center", padding: isMobile ? "1.25rem 1rem" : "1.5rem",
          }}>
            <div style={{ marginBottom: "0.5rem", display: "flex", justifyContent: "center" }}>
              <TimeOfDayIcon tod={stats.timeOfDay} size={48} />
            </div>
            <div style={{ fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink */ }}>
              {t(`time_${stats.timeOfDay}`)}
            </div>
            <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: muted, full opacity */, marginTop: "0.25rem" }}>
              {t("peakCreativityDesc", { hour: String(stats.peakHour) })}
            </div>
            {/* Quick stats row */}
            <div style={{
              display: "flex", justifyContent: "center", gap: isMobile ? "1.25rem" : "2rem",
              marginTop: "1rem", paddingTop: "0.75rem", borderTop: "0.0625rem solid #E3D6BC", // Atrium token: hairline
            }}>
              {stats.thisMonthCount > 0 && (
                <div>
                  <div style={{ fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, color: "#9A4F2A" /* Atrium token: terracotta glyph */, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}>
                    <AnimatedNumber value={stats.thisMonthCount} />
                    {stats.growthPct !== 0 && (
                      <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: stats.growthPct > 0 ? SAGE /* Atrium token: sage */ : "#9A4F2A" /* Atrium token: terracotta glyph */ }}>
                        {stats.growthPct > 0 ? "\u2191" : "\u2193"}{Math.abs(stats.growthPct)}%
                      </span>
                    )}
                  </div>
                  <div style={mutedStyle}>{t("thisMonth")}</div>
                </div>
              )}
              <div>
                <div style={{ fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, color: SAGE /* Atrium token: sage */ }}>
                  <AnimatedNumber value={stats.streak} />
                </div>
                <div style={mutedStyle}>{t("dayStreak")}</div>
              </div>
              <div>
                <div style={{ fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink (walnut retired) */ }}>
                  <AnimatedNumber value={stats.activeDays} />
                </div>
                <div style={mutedStyle}>{t("activeDays")}</div>
              </div>
            </div>
          </div>
          )}

          {/* 4. Day-of-Week Heatmap */}
          <div style={cardStyle}>
            <h3 style={headingStyle}>{t("weekdayPattern")}</h3>
            <div style={{ display: "flex", gap: "0.25rem", justifyContent: "space-between" }}>
              {stats.dayOfWeekCounts.map((count, i) => {
                const intensity = stats.maxDowCount > 0 ? count / stats.maxDowCount : 0;
                const isBest = i === (stats.bestDay ? DAY_KEYS.indexOf(stats.bestDay) : -1);
                return (
                  <div
                    key={i}
                    role="img"
                    aria-label={`${t(`day_${DAY_KEYS[i]}`)}: ${count} ${t("memories")}`}
                    style={{ flex: 1, textAlign: "center" }}
                  >
                    <div aria-hidden style={{
                      height: "3rem", borderRadius: "0.375rem", marginBottom: "0.375rem",
                      background: intensity > 0
                        ? `rgba(154,79,42,${0.12 + intensity * 0.55})` // Atrium token: terracotta glyph #9A4F2A
                        : "#F2EDE4", // Atrium token: linen, opaque (no alpha cream)
                      border: isBest ? "0.125rem solid #9A4F2A" : "0.125rem solid transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background .3s ease",
                    }}>
                      {count > 0 && (
                        <span style={{ fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 600, color: intensity > 0.5 ? T.color.white : "#403B36" /* Atrium token: ink */ }}>
                          {count}
                        </span>
                      )}
                    </div>
                    <span aria-hidden style={{ ...mutedStyle, fontSize: "0.6875rem", fontWeight: isBest ? 700 : 500, color: isBest ? "#9A4F2A" /* Atrium token: terracotta glyph */ : "#716A5E" /* Atrium token: muted, full opacity */ }}>
                      {dayShort[i]}
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

          {/* 5. Monthly Activity — only months with data (and only with real
               timestamps; without dated memories the buckets are all-zero) */}
          {stats.monthBuckets.length > 0 && stats.datedCount > 0 && (
          <div style={cardStyle}>
            <h3 style={headingStyle}>{t("timelineTitle")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {stats.monthBuckets.map((bucket, idx) => (
                <div
                  key={bucket.key}
                  role="img"
                  aria-label={`${t(`month_${bucket.label}`)} ${bucket.year}: ${bucket.count} ${t("memories")}`}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    animation: reduceMotion ? "none" : `spSlideUp .3s ease ${idx * 0.03}s both`,
                  }}
                >
                  <span aria-hidden style={{ ...mutedStyle, width: "3.75rem", textAlign: "right", flexShrink: 0 }}>
                    {t(`month_${bucket.label}`)} {bucket.year}
                  </span>
                  <div aria-hidden style={{ flex: 1, height: "1.125rem", background: "#F2EDE4" /* Atrium token: linen track */, borderRadius: "0.25rem", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(bucket.count / stats.maxMonthCount) * 100}%`,
                      background: "linear-gradient(90deg, #9A4F2A, #C06A44)", // Atrium token: passive data bar — terracotta glyph → lighter terracotta (EMBER reserved for interactive)
                      borderRadius: "0.25rem",
                      transition: "width .3s ease",
                      minWidth: bucket.count > 0 ? "0.25rem" : 0,
                    }} />
                  </div>
                  <span aria-hidden style={{
                    ...mutedStyle, width: "1.5rem", textAlign: "right", flexShrink: 0,
                    fontWeight: bucket.count > 0 ? 600 : 500,
                    color: bucket.count > 0 ? "#403B36" /* Atrium token: ink */ : "#716A5E" /* Atrium token: muted, full opacity */,
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
                      <span style={bodyStyle}>{translateWingName(wing, tWings)}</span>
                      <span style={mutedStyle}>{wing.count} {t("memories")}</span>
                    </div>
                    <div style={{ height: "0.5rem", background: "#F2EDE4" /* Atrium token: linen track */, borderRadius: "0.25rem", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${(wing.count / stats.maxWingCount) * 100}%`,
                        background: wing.accent, borderRadius: "0.25rem", transition: "width .3s ease",
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
                padding: "0.75rem", borderRadius: "0.75rem", // Atrium token: small-control radius
                background: "#F2EDE4", textAlign: "center", // Atrium token: linen tray, opaque
              }}>
                <div style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, color: "#403B36" /* Atrium token: ink (walnut retired) */ }}>
                  <AnimatedNumber value={stats.totalWords} duration={1200} />
                </div>
                <div style={mutedStyle}>{t("totalWordsWritten")}</div>
              </div>
              <div style={{
                padding: "0.75rem", borderRadius: "0.75rem", // Atrium token: small-control radius
                background: "#F6EBE3", textAlign: "center", // Atrium token: terracotta tray, opaque
              }}>
                <div style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, color: "#9A4F2A" /* Atrium token: terracotta glyph */ }}>
                  {stats.avgWords}
                </div>
                <div style={mutedStyle}>{t("avgWordsPerMemory")}</div>
              </div>
              <div style={{
                padding: "0.75rem", borderRadius: "0.75rem", // Atrium token: small-control radius
                background: "#EFF2E8", textAlign: "center", // Atrium token: sage tray, opaque
              }}>
                <div style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, color: SAGE /* Atrium token: sage */ }}>
                  {stats.descPct}%
                </div>
                <div style={mutedStyle}>{t("storiesWritten")}</div>
              </div>
              {stats.uniqueLocations > 0 && (
                <div style={{
                  padding: "0.75rem", borderRadius: "0.75rem", // Atrium token: small-control radius
                  background: "#FAF3E0", textAlign: "center", // Atrium token: gold tray, opaque
                }}>
                  <div style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, color: "#8A6410" /* Atrium token: browned gold (true gold reserved for the palace) */ }}>
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
              background: "linear-gradient(160deg, #F2F5EA 0%, #FCFAF5 78%)", // Atrium token: sage tile wash, opaque
              display: "flex", flexDirection: "column", gap: "0.75rem",
            }}>
              <h3 style={headingStyle}>{t("journeyTitle")}</h3>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ ...mutedStyle, marginBottom: "0.125rem" }}>{t("earliestMemory")}</div>
                  <div style={bodyStyle}>{formatDate(stats.earliest)}</div>
                </div>
                <div style={{
                  flex: 1, margin: "0 0.75rem", height: "0.125rem",
                  background: "linear-gradient(90deg, #56683C, #9A4F2A)", // Atrium token: sage → terracotta glyph
                  borderRadius: "0.0625rem",
                }} />
                <div style={{ textAlign: "right" }}>
                  <div style={{ ...mutedStyle, marginBottom: "0.125rem" }}>{t("latestMemory")}</div>
                  <div style={bodyStyle}>{formatDate(stats.latest)}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem" }}>
                {stats.ageInDays > 0 && (
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600, color: SAGE /* Atrium token: sage */ }}>
                      <AnimatedNumber value={stats.ageInDays} />
                    </span>
                    <div style={mutedStyle}>{t("daysSpanned")}</div>
                  </div>
                )}
                {stats.longestGapDays > 1 && (
                  <div style={{ textAlign: "center" }}>
                    <span style={{ fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600, color: "#716A5E" /* Atrium token: muted, full opacity */ }}>
                      {stats.longestGapDays}
                    </span>
                    <div style={mutedStyle}>{t("longestGap")}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 9. Weekly Digest */}
          <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
            <button
              onClick={() => setShowDigest(true)}
              style={{
                fontFamily: T.font.body,
                fontSize: "0.9375rem", // Atrium token: body (no 0.875rem)
                fontWeight: 600,
                color: EMBER /* Atrium token: EMBER — interactive CTA signal */,
                background: "#F6EBE3", // Atrium token: terracotta tray, opaque
                border: `0.0625rem solid ${EMBER}`, // Atrium token: EMBER interactive edge
                borderRadius: "0.75rem", // Atrium token: small-control radius
                minHeight: "2.75rem",
                padding: "0.625rem 1.25rem",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#F0E0D3"; }} /* Atrium token: terracotta tray, one step deeper */
              onMouseLeave={(e) => { e.currentTarget.style.background = "#F6EBE3"; }}
            >
              {t("weeklyDigestRead")}
            </button>
          </div>
        </div>
        )}
      </div>
    </Sheet>
  );
}
