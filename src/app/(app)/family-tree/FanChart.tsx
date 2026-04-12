"use client";

import { useState, useMemo } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type {
  FamilyTreePerson,
  FamilyTreeRelationship,
} from "@/lib/auth/family-tree-actions";

interface FanChartProps {
  persons: FamilyTreePerson[];
  relationships: FamilyTreeRelationship[];
  rootPersonId: string;
  onSelectPerson: (p: FamilyTreePerson) => void;
  isMobile: boolean;
  pan: { x: number; y: number };
  zoom: number;
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
}

/* ── Colors for 4 grandparent lineages ── */
const LINEAGE_COLORS = [
  "#A0B8D4", // paternal-father (blue)
  "#8BB89A", // paternal-mother (green)
  "#D4A0A0", // maternal-father (rose)
  "#C9B87B", // maternal-mother (gold)
];

interface AncestorSlot {
  gen: number; // 0 = root, 1 = parents, 2 = grandparents...
  index: number; // position within generation (0-based, left to right)
  person: FamilyTreePerson | null;
  colorIdx: number; // which lineage color
}

export default function FanChart({
  persons,
  relationships,
  rootPersonId,
  onSelectPerson,
  isMobile,
  pan,
  zoom,
  onPanChange,
  onZoomChange,
}: FanChartProps) {
  const { t } = useTranslation("familyTree");
  const [maxGen, setMaxGen] = useState(4);

  // Build parent lookup: child -> [parent1, parent2]
  const parentMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of relationships) {
      if (r.relationship_type === "parent") {
        const parents = map.get(r.related_person_id) ?? [];
        if (!parents.includes(r.person_id)) parents.push(r.person_id);
        map.set(r.related_person_id, parents);
      } else if (r.relationship_type === "child") {
        const parents = map.get(r.person_id) ?? [];
        if (!parents.includes(r.related_person_id)) parents.push(r.related_person_id);
        map.set(r.person_id, parents);
      }
    }
    return map;
  }, [relationships]);

  const personMap = useMemo(() => {
    const m = new Map<string, FamilyTreePerson>();
    for (const p of persons) m.set(p.id, p);
    return m;
  }, [persons]);

  // Build ancestor slots for fan chart
  const slots = useMemo(() => {
    const result: AncestorSlot[] = [];
    // BFS: gen 0 = root, gen 1 = parents, etc.
    // Each slot at gen g, index i has parents at gen g+1, indices 2i and 2i+1
    interface QueueItem { personId: string | null; gen: number; index: number; colorIdx: number; }
    const queue: QueueItem[] = [{ personId: rootPersonId, gen: 0, index: 0, colorIdx: -1 }];

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (item.gen > maxGen) continue;

      const person = item.personId ? personMap.get(item.personId) ?? null : null;
      const colorIdx = item.gen >= 2
        ? item.index % 4
        : item.gen === 1
          ? item.index * 2
          : -1;

      result.push({
        gen: item.gen,
        index: item.index,
        person,
        colorIdx: item.gen >= 1 ? (item.gen >= 2 ? colorIdx : item.index * 2) : -1,
      });

      if (item.gen < maxGen) {
        const parents = item.personId ? parentMap.get(item.personId) ?? [] : [];
        // Sort parents: father first (male), then mother
        const sorted = [...parents].sort((a, b) => {
          const pa = personMap.get(a);
          const pb = personMap.get(b);
          if (pa?.gender === "male" && pb?.gender !== "male") return -1;
          if (pa?.gender !== "male" && pb?.gender === "male") return 1;
          return 0;
        });
        const fatherId = sorted[0] ?? null;
        const motherId = sorted[1] ?? null;
        queue.push({ personId: fatherId, gen: item.gen + 1, index: item.index * 2, colorIdx: 0 });
        queue.push({ personId: motherId, gen: item.gen + 1, index: item.index * 2 + 1, colorIdx: 0 });
      }
    }
    return result;
  }, [rootPersonId, parentMap, personMap, maxGen]);

  // SVG dimensions
  const size = isMobile ? 360 : 600;
  const cx = size / 2;
  const cy = size * 0.92; // root at bottom-center
  const minR = isMobile ? 50 : 80; // inner radius
  const bandW = isMobile ? 42 : 58; // width of each generation band
  const gapAngle = 0.8; // degrees gap between segments

  const rootPerson = personMap.get(rootPersonId);
  const year = (d: string | null) => {
    if (!d) return "";
    try { return new Date(d).getFullYear().toString(); } catch { return ""; }
  };

  // Render arc segment for each ancestor
  function arcPath(innerR: number, outerR: number, startAngle: number, endAngle: number): string {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + innerR * Math.cos(toRad(startAngle));
    const y1 = cy + innerR * Math.sin(toRad(startAngle));
    const x2 = cx + outerR * Math.cos(toRad(startAngle));
    const y2 = cy + outerR * Math.sin(toRad(startAngle));
    const x3 = cx + outerR * Math.cos(toRad(endAngle));
    const y3 = cy + outerR * Math.sin(toRad(endAngle));
    const x4 = cx + innerR * Math.cos(toRad(endAngle));
    const y4 = cy + innerR * Math.sin(toRad(endAngle));
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${x1} ${y1}`,
      `L ${x2} ${y2}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x3} ${y3}`,
      `L ${x4} ${y4}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1} ${y1}`,
      "Z",
    ].join(" ");
  }

  // Text along arc midpoint
  function arcMidpoint(r: number, startAngle: number, endAngle: number): { x: number; y: number; angle: number } {
    const midAngle = (startAngle + endAngle) / 2;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(toRad(midAngle)),
      y: cy + r * Math.sin(toRad(midAngle)),
      angle: midAngle,
    };
  }

  // Fan spans from 180° (left) to 360° (right) — a semicircle above the root
  const fanStart = 180;
  const fanEnd = 360;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Generation control */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.5rem 1rem",
        position: "absolute",
        top: isMobile ? "0.5rem" : "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        background: `${T.color.linen}E0`,
        backdropFilter: "blur(12px)",
        borderRadius: "0.75rem",
        border: `1px solid ${T.color.sandstone}40`,
        boxShadow: `0 0.125rem 0.5rem rgba(44,44,42,.08)`,
      }}>
        <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted }}>
          {t("fanGenerations")}
        </span>
        {[4, 5, 6, 7].map((g) => (
          <button
            key={g}
            onClick={() => setMaxGen(g)}
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "0.5rem",
              border: maxGen === g ? `2px solid ${T.color.terracotta}` : `1px solid ${T.color.sandstone}60`,
              background: maxGen === g ? `${T.color.terracotta}18` : "transparent",
              fontFamily: T.font.body,
              fontSize: "0.875rem",
              fontWeight: maxGen === g ? 700 : 400,
              color: maxGen === g ? T.color.terracotta : T.color.charcoal,
              cursor: "pointer",
            }}
          >
            {g}
          </button>
        ))}
      </div>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        style={{
          maxWidth: `${size}px`,
          flex: 1,
          marginTop: isMobile ? "3rem" : "3.5rem",
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        {/* Root person circle at bottom-center */}
        <circle
          cx={cx}
          cy={cy}
          r={minR * 0.55}
          fill={T.color.white}
          stroke={T.color.gold}
          strokeWidth={2.5}
          style={{ cursor: rootPerson ? "pointer" : "default" }}
          onClick={() => rootPerson && onSelectPerson(rootPerson)}
        />
        {rootPerson && (
          <>
            <text
              x={cx}
              y={cy - 8}
              textAnchor="middle"
              fontFamily={T.font.display}
              fontSize={isMobile ? 11 : 13}
              fontWeight={600}
              fill={T.color.charcoal}
            >
              {rootPerson.first_name}
            </text>
            {rootPerson.last_name && (
              <text
                x={cx}
                y={cy + 6}
                textAnchor="middle"
                fontFamily={T.font.display}
                fontSize={isMobile ? 9 : 11}
                fill={T.color.muted}
              >
                {rootPerson.last_name}
              </text>
            )}
            <text
              x={cx}
              y={cy + 18}
              textAnchor="middle"
              fontFamily={T.font.body}
              fontSize={9}
              fill={T.color.muted}
            >
              {year(rootPerson.birth_date)}{rootPerson.birth_date || rootPerson.death_date ? "\u2013" : ""}{year(rootPerson.death_date)}
            </text>
          </>
        )}

        {/* Ancestor arcs (gen 1+) */}
        {slots
          .filter((s) => s.gen >= 1)
          .map((slot) => {
            const innerR = minR + (slot.gen - 1) * bandW;
            const outerR = innerR + bandW - 2;
            const slotsInGen = Math.pow(2, slot.gen);
            const totalAngle = fanEnd - fanStart;
            const segAngle = totalAngle / slotsInGen;
            const startAngle = fanStart + slot.index * segAngle + gapAngle / 2;
            const endAngle = fanStart + (slot.index + 1) * segAngle - gapAngle / 2;
            const midR = (innerR + outerR) / 2;
            const mid = arcMidpoint(midR, startAngle, endAngle);
            const color = slot.colorIdx >= 0 ? LINEAGE_COLORS[slot.colorIdx % 4] : T.color.sandstone;

            // Rotate text to be readable
            let textAngle = mid.angle + 90;
            if (textAngle > 90 && textAngle < 270) textAngle += 180;

            return (
              <g key={`fan-${slot.gen}-${slot.index}`}>
                <path
                  d={arcPath(innerR, outerR, startAngle, endAngle)}
                  fill={slot.person ? `${color}40` : `${T.color.sandstone}18`}
                  stroke={slot.person ? `${color}90` : `${T.color.sandstone}30`}
                  strokeWidth={1}
                  style={{ cursor: slot.person ? "pointer" : "default" }}
                  onClick={() => slot.person && onSelectPerson(slot.person)}
                />
                {slot.person && (endAngle - startAngle) > 5 && (
                  <text
                    x={mid.x}
                    y={mid.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily={T.font.display}
                    fontSize={Math.max(7, Math.min(11, (endAngle - startAngle) * 0.6))}
                    fontWeight={500}
                    fill={T.color.charcoal}
                    transform={`rotate(${textAngle}, ${mid.x}, ${mid.y})`}
                    style={{ pointerEvents: "none" }}
                  >
                    {slot.person.first_name}
                    {(endAngle - startAngle) > 15 && slot.person.birth_date
                      ? ` ${year(slot.person.birth_date)}`
                      : ""}
                  </text>
                )}
              </g>
            );
          })}
      </svg>
    </div>
  );
}
