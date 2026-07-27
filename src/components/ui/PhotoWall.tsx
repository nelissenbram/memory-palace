"use client";

/**
 * PhotoWall — "Il Muro": the Library grid rebuilt as an edge-to-edge justified
 * wall of photographs. No card, no border, no shadow, no blur, no per-tile
 * text — the tile IS the memory. All labelling lives in thin sticky
 * gold-underlined month bands. Unconditionally visible on any full room.
 *
 * Phase 1 of docs/LIBRARY_REDESIGN_SPEC.json (Il Muro). Real aspect ratios +
 * row virtualisation are Phase 2; Phase 1 uses deterministic aspect fallbacks
 * (zero layout shift) and content-visibility:auto for cheap paint at scale.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { T } from "@/lib/theme";
import { MediaThumb } from "./MediaThumb";
import { packJustifiedRows, targetRowHeight, getAspect, type PackedRow } from "@/lib/library/justify";
import type { Mem } from "@/lib/constants/defaults";

const GAP = 3; // px seams

interface PhotoWallProps {
  mems: Mem[];
  isMobile: boolean;
  selectMode: boolean;
  selectedMemIds: Set<string>;
  onToggleSelect: (id: string) => void;
  /** open the viewer at this index within `mems` */
  onOpen: (index: number) => void;
  /** localized month label, e.g. "June 2020" */
  monthLabel: (d: Date) => string;
  undatedLabel: string;
  countLabel: (n: number) => string;
}

type Section = { key: string; label: string; items: (Mem & { ar: number; _i: number })[] };

export default function PhotoWall({ mems, isMobile, selectMode, selectedMemIds, onToggleSelect, onOpen, monthLabel, undatedLabel, countLabel }: PhotoWallProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // Group by month (newest first), preserving each memory's original index so
  // the viewer opens the right one.
  const sections = useMemo<Section[]>(() => {
    const byKey = new Map<string, Section>();
    mems.forEach((mem, _i) => {
      const raw = mem.createdAt || (mem as { date?: string }).date;
      const d = raw ? new Date(raw) : null;
      const valid = d && !Number.isNaN(d.getTime());
      const key = valid ? `${d!.getFullYear()}-${String(d!.getMonth() + 1).padStart(2, "0")}` : "undated";
      let sec = byKey.get(key);
      if (!sec) {
        sec = { key, label: valid ? monthLabel(d!) : undatedLabel, items: [] };
        byKey.set(key, sec);
      }
      sec.items.push({ ...(mem as Mem), ar: getAspect(mem.id, mem.type), _i });
    });
    // undated last, others newest→oldest by key
    return [...byKey.values()].sort((a, b) => {
      if (a.key === "undated") return 1;
      if (b.key === "undated") return -1;
      return b.key.localeCompare(a.key);
    });
  }, [mems, monthLabel, undatedLabel]);

  const rowH = targetRowHeight(width || 1);
  const packed = useMemo(
    () => sections.map((s) => ({ ...s, rows: packJustifiedRows(s.items, width, rowH, GAP) as PackedRow<Mem & { ar: number; _i: number }>[] })),
    [sections, width, rowH],
  );

  return (
    <div ref={containerRef} className="il-muro" style={{ width: "100%" }}>
      {packed.map((sec) => (
        <section key={sec.key} aria-label={sec.label}>
          {/* sticky gold-underlined band — carries all the stripped metadata */}
          <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "baseline", gap: "0.5rem", padding: "0.9rem 0 0.5rem", background: "linear-gradient(#FCFAF5 70%, rgba(252,250,245,0))" }}>
            <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: "1.0625rem", lineHeight: 1.15, color: "#403B36" }}>{sec.label}</span>
            <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", fontVariantNumeric: "tabular-nums" }}>{countLabel(sec.items.length)}</span>
            <span aria-hidden="true" style={{ flex: 1, height: "0.125rem", alignSelf: "center", background: "linear-gradient(90deg, #C99A2E, rgba(201,154,46,0.25) 45%, transparent)" }} />
          </div>
          {width > 0 && sec.rows.map((row, ri) => (
            <div key={ri} style={{ display: "flex", gap: `${GAP}px`, marginBottom: `${GAP}px`, contentVisibility: "auto", containIntrinsicSize: `${Math.round(row.height)}px` } as React.CSSProperties}>
              {row.tiles.map(({ item, w, h }) => {
                const selected = selectedMemIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    role="listitem"
                    aria-label={item.title}
                    onClick={() => (selectMode ? onToggleSelect(item.id) : onOpen(item._i))}
                    onContextMenu={(e) => { e.preventDefault(); onToggleSelect(item.id); }}
                    className="il-muro-tile"
                    style={{
                      position: "relative", flex: row.last ? "0 0 auto" : "1 1 auto",
                      width: `${w}px`, height: `${h}px`, minWidth: 0,
                      padding: 0, border: "none", borderRadius: 0, overflow: "hidden",
                      background: "#EAE3D4", cursor: "pointer",
                      boxShadow: selected ? "inset 0 0 0 0.1875rem #D4AF37" : "none",
                    }}
                  >
                    <span style={{ display: "block", width: "100%", height: "100%", opacity: selected ? 0.82 : 1, transition: "opacity 0.15s ease" }}>
                      <MediaThumb mem={item as Mem} size="100%" borderRadius="0" iconSize={h > 130 ? 22 : 16} />
                    </span>
                    {selected && (
                      <span aria-hidden="true" style={{ position: "absolute", top: "0.375rem", right: "0.375rem", width: "1.25rem", height: "1.25rem", borderRadius: "50%", background: "#D4AF37", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2E2A26" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </section>
      ))}
      <style>{`
        .il-muro-tile { transition: filter 0.15s ease; }
        @media (hover: hover) { .il-muro-tile:hover { filter: brightness(1.06); } }
        .il-muro-tile:focus-visible { outline: 0.1875rem solid #D4AF37; outline-offset: -0.1875rem; }
        @media (prefers-reduced-motion: reduce) { .il-muro-tile { transition: none; } }
      `}</style>
    </div>
  );
}
