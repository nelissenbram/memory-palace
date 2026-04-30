"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
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
  onRootChange?: (personId: string) => void;
  isMobile: boolean;
  pan: { x: number; y: number };
  zoom: number;
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
}

const LINEAGE_COLORS = [
  "#A0B8D4",
  "#8BB89A",
  "#D4A0A0",
  "#C9B87B",
];

interface AncestorSlot {
  gen: number;
  index: number;
  person: FamilyTreePerson | null;
  colorIdx: number;
}

export default function FanChart({
  persons,
  relationships,
  rootPersonId,
  onSelectPerson,
  onRootChange,
  isMobile,
  pan,
  zoom,
  onPanChange,
  onZoomChange,
}: FanChartProps) {
  const { t } = useTranslation("familyTree");
  const [maxGen, setMaxGen] = useState(4);
  const containerDivRef = useRef<HTMLDivElement>(null);

  // Measure container to compute fill-height scale
  const [cSize, setCSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerDivRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      setCSize({ w: width, h: height });
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── Pan/zoom/pinch handlers ── */
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number; startPan: { x: number; y: number }; startCenter: { x: number; y: number } } | null>(null);

  const clampZoom = (z: number) => Math.max(0.3, Math.min(3, z));

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    onZoomChange(clampZoom(zoom * delta));
  }, [zoom, onZoomChange]);

  // Mouse/single-pointer drag for panning
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 || e.pointerType === "touch") return; // touch handled separately
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || e.pointerType === "touch") return;
    onPanChange({
      x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
    });
  }, [onPanChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    dragRef.current = null;
  }, []);

  // Touch: 1 finger = pan, 2 fingers = pinch zoom
  const touchDragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const dist = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Start pinch
      touchDragRef.current = null;
      const d = dist(e.touches[0], e.touches[1]);
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      pinchRef.current = { startDist: d, startZoom: zoom, startPan: { ...pan }, startCenter: { x: cx, y: cy } };
    } else if (e.touches.length === 1) {
      // Start single-finger drag
      pinchRef.current = null;
      touchDragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, panX: pan.x, panY: pan.y };
    }
  }, [zoom, pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const d = dist(e.touches[0], e.touches[1]);
      const scale = d / pinchRef.current.startDist;
      const newZoom = clampZoom(pinchRef.current.startZoom * scale);
      onZoomChange(newZoom);
      // Pan to keep center stable
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      onPanChange({
        x: pinchRef.current.startPan.x + (cx - pinchRef.current.startCenter.x),
        y: pinchRef.current.startPan.y + (cy - pinchRef.current.startCenter.y),
      });
    } else if (e.touches.length === 1 && touchDragRef.current && !pinchRef.current) {
      onPanChange({
        x: touchDragRef.current.panX + (e.touches[0].clientX - touchDragRef.current.startX),
        y: touchDragRef.current.panY + (e.touches[0].clientY - touchDragRef.current.startY),
      });
    }
  }, [onPanChange, onZoomChange]);

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null;
    touchDragRef.current = null;
  }, []);

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

  const slots = useMemo(() => {
    const result: AncestorSlot[] = [];
    interface QueueItem { personId: string | null; gen: number; index: number; colorIdx: number; }
    const queue: QueueItem[] = [{ personId: rootPersonId, gen: 0, index: 0, colorIdx: -1 }];

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (item.gen > maxGen) continue;

      const person = item.personId ? personMap.get(item.personId) ?? null : null;
      const colorIdx = item.gen === 0
        ? -1
        : item.gen === 1
          ? item.index * 2
          : Math.floor(item.index / Math.pow(2, item.gen - 2)) % 4;

      result.push({ gen: item.gen, index: item.index, person, colorIdx });

      if (item.gen < maxGen) {
        const parents = item.personId ? parentMap.get(item.personId) ?? [] : [];
        const sorted = [...parents].sort((a, b) => {
          const pa = personMap.get(a);
          const pb = personMap.get(b);
          if (pa?.gender === "male" && pb?.gender !== "male") return -1;
          if (pa?.gender !== "male" && pb?.gender === "male") return 1;
          return 0;
        });
        queue.push({ personId: sorted[0] ?? null, gen: item.gen + 1, index: item.index * 2, colorIdx });
        queue.push({ personId: sorted[1] ?? null, gen: item.gen + 1, index: item.index * 2 + 1, colorIdx });
      }
    }
    return result;
  }, [rootPersonId, parentMap, personMap, maxGen]);

  // SVG geometry
  const minR = isMobile ? 50 : 80;
  const bandW = isMobile ? 42 : 58;
  const gapAngle = 0.8;
  const outerRadius = minR + maxGen * bandW;
  const padding = 10;
  const rootR = minR * 0.55;

  const vbW = (outerRadius + padding) * 2;
  const vbH = outerRadius + padding + rootR + 5;
  const cx = vbW / 2;
  const cy = vbH - 5;

  // CSS scale: the SVG uses preserveAspectRatio="xMidYMax meet" which fits to
  // the smaller dimension (width on portrait). We apply an additional CSS scale
  // so the fan fills the container height. This keeps the SVG content un-clipped
  // (unlike "slice") — arcs extend naturally past the screen edges.
  const fillScale = useMemo(() => {
    if (cSize.w === 0 || cSize.h === 0) return 1;
    // With "meet", the SVG scales to fit the smaller dimension.
    const meetScale = Math.min(cSize.w / vbW, cSize.h / vbH);
    // We want it to fill the height instead.
    const fillH = cSize.h / vbH;
    // Additional CSS scale needed on top of the meet scale:
    return fillH / meetScale;
  }, [cSize, vbW, vbH]);

  useEffect(() => {
    onZoomChange(1);
    onPanChange({ x: 0, y: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxGen]);

  const sortedPersons = useMemo(() =>
    [...persons].sort((a, b) => {
      const nameA = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim().toLowerCase();
      const nameB = `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    }),
    [persons],
  );

  const rootPerson = personMap.get(rootPersonId);
  const year = (d: string | null) => {
    if (!d) return "";
    const m = d.match(/^(\d{4})/);
    if (m) return m[1];
  };

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

  function arcMidpoint(r: number, startAngle: number, endAngle: number): { x: number; y: number; angle: number } {
    const midAngle = (startAngle + endAngle) / 2;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(toRad(midAngle)),
      y: cy + r * Math.sin(toRad(midAngle)),
      angle: midAngle,
    };
  }

  const fanStart = 180;
  const fanEnd = 360;

  // Combined transform: fillScale fills height, then user zoom/pan on top
  const totalScale = fillScale * zoom;

  return (
    <div
      ref={containerDivRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "visible",
        touchAction: "none",
        cursor: dragRef.current ? "grabbing" : "grab",
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Generation control — compact on mobile */}
      {isMobile ? (
        <div style={{
          position: "absolute",
          top: "0.5rem",
          left: "0.5rem",
          right: "0.5rem",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: "0.375rem",
          background: `${T.color.linen}E0`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "0.75rem",
          border: `1px solid ${T.color.sandstone}40`,
          boxShadow: `0 0.125rem 0.5rem rgba(44,44,42,.08)`,
          padding: "0.5rem 0.625rem",
        }}>
          {/* Row 1: generation buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, marginRight: "auto" }}>
              {t("fanGenerations")}
            </span>
            {[4, 5, 6, 7].map((g) => (
              <button
                key={g}
                onClick={() => setMaxGen(g)}
                style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "0.375rem",
                  border: maxGen === g ? `2px solid ${T.color.terracotta}` : `1px solid ${T.color.sandstone}60`,
                  background: maxGen === g ? `${T.color.terracotta}18` : "transparent",
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: maxGen === g ? 700 : 400,
                  color: maxGen === g ? T.color.terracotta : T.color.charcoal,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {g}
              </button>
            ))}
          </div>
          {/* Row 2: focus person */}
          {onRootChange && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, flexShrink: 0 }}>
                {t("fanFocusPerson")}
              </span>
              <select
                value={rootPersonId}
                onChange={(e) => onRootChange(e.target.value)}
                style={{
                  flex: 1,
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.charcoal,
                  background: `${T.color.white}B0`,
                  border: `1px solid ${T.color.sandstone}60`,
                  borderRadius: "0.375rem",
                  padding: "0.3125rem 0.375rem",
                  cursor: "pointer",
                  outline: "none",
                  minWidth: 0,
                }}
              >
                {sortedPersons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.5rem 1rem",
          position: "absolute",
          top: "1rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          background: `${T.color.linen}E0`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
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
                width: "2.75rem",
                height: "2.75rem",
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
          {onRootChange && (
            <>
              <div style={{ width: 1, height: "1.5rem", background: `${T.color.sandstone}50` }} />
              <label style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, whiteSpace: "nowrap" }}>
                {t("fanFocusPerson")}
              </label>
              <select
                value={rootPersonId}
                onChange={(e) => onRootChange(e.target.value)}
                style={{
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  color: T.color.charcoal,
                  background: `${T.color.white}B0`,
                  border: `1px solid ${T.color.sandstone}60`,
                  borderRadius: "0.5rem",
                  padding: "0.375rem 0.5rem",
                  cursor: "pointer",
                  maxWidth: "12rem",
                  outline: "none",
                }}
              >
                {sortedPersons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—"}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}

      {/* Fan SVG — uses "meet" so nothing is clipped, CSS scale fills the height */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMax meet"
        style={{
          display: "block",
          overflow: "visible",
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${totalScale})`,
          transformOrigin: "center bottom",
        }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={rootR}
          fill={T.color.white}
          stroke={T.color.gold}
          strokeWidth={2.5}
          style={{ cursor: rootPerson ? "pointer" : "default" }}
          onClick={() => rootPerson && onSelectPerson(rootPerson)}
        />
        {rootPerson && (
          <>
            <text x={cx} y={cy - 8} textAnchor="middle" fontFamily={T.font.display}
              fontSize={isMobile ? 11 : 13} fontWeight={600} fill={T.color.charcoal}>
              {rootPerson.first_name}
            </text>
            {rootPerson.last_name && (
              <text x={cx} y={cy + 6} textAnchor="middle" fontFamily={T.font.display}
                fontSize={isMobile ? 9 : 11} fill={T.color.muted}>
                {rootPerson.last_name}
              </text>
            )}
            <text x={cx} y={cy + 18} textAnchor="middle" fontFamily={T.font.body}
              fontSize={9} fill={T.color.muted}>
              {year(rootPerson.birth_date)}{rootPerson.birth_date || rootPerson.death_date ? "\u2013" : ""}{year(rootPerson.death_date)}
            </text>
          </>
        )}

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
                {slot.person && (endAngle - startAngle) > 2 && (
                  <text
                    x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="central"
                    fontFamily={T.font.display}
                    fontSize={Math.max(7, Math.min(11, (endAngle - startAngle) * 0.6))}
                    fontWeight={500} fill={T.color.charcoal}
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
