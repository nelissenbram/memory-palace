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

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { T } from "@/lib/theme";
import { MediaThumb } from "./MediaThumb";
import { packJustifiedRows, targetRowHeight, getAspect, setAspect, type PackedRow } from "@/lib/library/justify";
import type { Mem } from "@/lib/constants/defaults";

const GAP = 3; // px seams

/** Any browser-paintable image URL (data:image, http, blob, /api, /path). */
function paintable(u: string | null | undefined): string | null {
  if (!u) return null;
  if (u.startsWith("data:audio")) return null;
  if (u.startsWith("data:image") || u.startsWith("http") || u.startsWith("blob:") || u.startsWith("/")) return u;
  return null;
}
/** Ordered image-source candidates for a tile — thumbnail first (lighter),
 *  then the full/original. Restores images regardless of where they're stored. */
function tileSources(mem: Mem): string[] {
  const out: string[] = [];
  const t = paintable(mem.thumbnailUrl);
  const d = paintable(mem.dataUrl);
  if (t) out.push(t);
  if (d && d !== t) out.push(d);
  return out;
}

/** Chromeless tile media: real <img> with source fallback, else the MediaThumb
 *  type glyph (story/audio/document). On load it reports the real aspect ratio
 *  so the wall re-packs to organic widths. Zero card/shadow/gradient. */
function TileMedia({ mem, iconSize, onMeasured }: { mem: Mem; iconSize: number; onMeasured: (id: string, ar: number) => void }) {
  const sources = React.useMemo(() => tileSources(mem), [mem]);
  const [idx, setIdx] = useState(0);
  const src = sources[idx];
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={(e) => {
          const el = e.currentTarget;
          if (el.naturalWidth > 0 && el.naturalHeight > 0) onMeasured(mem.id, el.naturalWidth / el.naturalHeight);
        }}
        onError={() => setIdx((i) => i + 1)}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  return <MediaThumb mem={mem} size="100%" borderRadius="0" iconSize={iconSize} />;
}

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
  /** wing-accent provenance dot per memory — keeps "lives in a room" visible on the flat wall */
  tileAccent?: (memId: string) => string | null;
  /** grouping: chronological month bands (default) or the Rooms lens (same tiles, re-banded by room) */
  groupBy?: "month" | "room";
  /** room label for a memory, used by the Rooms lens */
  roomLabelOf?: (memId: string) => string;
  /** HTML5 drag of a tile into a sidebar room (desktop pointer only) */
  draggableTiles?: boolean;
  onTileDragStart?: (memId: string) => void;
  onTileDragEnd?: () => void;
}

type Section = { key: string; label: string; items: (Mem & { ar: number; _i: number })[] };

export default function PhotoWall({ mems, isMobile, selectMode, selectedMemIds, onToggleSelect, onOpen, monthLabel, undatedLabel, countLabel, tileAccent, groupBy = "month", roomLabelOf, draggableTiles, onTileDragStart, onTileDragEnd }: PhotoWallProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  // Measure synchronously before paint so tiles never sit behind a width==0
  // guard; then keep in sync via ResizeObserver.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) setWidth(el.offsetWidth || el.getBoundingClientRect().width || 0);
  }, []);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.offsetWidth ?? 0;
      setWidth((prev) => (w > 0 && Math.abs(prev - w) > 1 ? w : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Fallback so a lagging/failed measurement never yields a blank wall.
  const effWidth = width > 0 ? width : (typeof window !== "undefined" ? Math.min(window.innerWidth - (isMobile ? 0 : 260), 1200) : 800);

  // Real aspect ratios stream in as images decode; batch a single re-pack per
  // frame so the wall settles from deterministic bricks to organic widths
  // without layout thrash.
  const [arVersion, setArVersion] = useState(0);
  const pendingRepack = useRef(false);
  const onMeasured = React.useCallback((id: string, ar: number) => {
    const prev = getAspect(id);
    setAspect(id, ar);
    if (Math.abs(prev - ar) > 0.02 && !pendingRepack.current) {
      pendingRepack.current = true;
      requestAnimationFrame(() => { pendingRepack.current = false; setArVersion((v) => v + 1); });
    }
  }, []);

  // Group by month (newest first), preserving each memory's original index so
  // the viewer opens the right one.
  const sections = useMemo<Section[]>(() => {
    const byKey = new Map<string, Section>();
    const order: string[] = []; // preserve first-seen order for the room lens
    mems.forEach((mem, _i) => {
      let key: string, label: string;
      if (groupBy === "room") {
        label = roomLabelOf ? roomLabelOf(mem.id) : undatedLabel;
        key = label || "·";
      } else {
        const raw = mem.createdAt || (mem as { date?: string }).date;
        const d = raw ? new Date(raw) : null;
        const valid = d && !Number.isNaN(d.getTime());
        key = valid ? `${d!.getFullYear()}-${String(d!.getMonth() + 1).padStart(2, "0")}` : "undated";
        label = valid ? monthLabel(d!) : undatedLabel;
      }
      let sec = byKey.get(key);
      if (!sec) { sec = { key, label, items: [] }; byKey.set(key, sec); order.push(key); }
      sec.items.push({ ...(mem as Mem), ar: getAspect(mem.id, mem.type), _i });
    });
    if (groupBy === "room") {
      // rooms in first-appearance order (mems already sorted), undated last
      return order.map(k => byKey.get(k)!).sort((a, b) => (a.key === "·" ? 1 : b.key === "·" ? -1 : 0));
    }
    // month: undated last, others newest→oldest by key
    return [...byKey.values()].sort((a, b) => {
      if (a.key === "undated") return 1;
      if (b.key === "undated") return -1;
      return b.key.localeCompare(a.key);
    });
  }, [mems, monthLabel, undatedLabel, groupBy, roomLabelOf]);

  const rowH = targetRowHeight(effWidth);
  const packed = useMemo(
    // re-read getAspect at pack time so measured ratios (arVersion) take effect
    () => sections.map((s) => ({
      ...s,
      rows: packJustifiedRows(
        s.items.map((it) => ({ ...it, ar: getAspect(it.id, it.type) })),
        effWidth, rowH, GAP,
      ) as PackedRow<Mem & { ar: number; _i: number }>[],
    })),
    // arVersion intentionally in deps to re-pack when real ratios arrive
    [sections, effWidth, rowH, arVersion],
  );

  // Jump-to-date scrubber: refs to each section so a tick can scroll to it.
  const sectionEls = useRef<Map<string, HTMLElement>>(new Map());
  const [scrubHover, setScrubHover] = useState<string | null>(null);

  return (
    <div ref={containerRef} className="il-muro" style={{ position: "relative", width: "100%" }}>
      {/* right-edge jump-to-date rail (thumb-natural zone); hidden with <2 sections */}
      {packed.length > 1 && (
        <div className="il-muro-scrub" aria-hidden="true" style={{ position: "sticky", top: 0, float: "right", width: 0, height: 0, zIndex: 6 }}>
          <div style={{ position: "absolute", right: isMobile ? "-0.1rem" : "-1.5rem", top: "0.5rem", display: "flex", flexDirection: "column", gap: "0.2rem", alignItems: "flex-end" }}>
            {packed.map((sec) => (
              <button
                key={sec.key}
                type="button"
                onClick={() => sectionEls.current.get(sec.key)?.scrollIntoView({ block: "start", behavior: "smooth" })}
                onMouseEnter={() => setScrubHover(sec.key)}
                onMouseLeave={() => setScrubHover((h) => (h === sec.key ? null : h))}
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "flex-end", background: "none", border: "none", padding: "0.15rem 0.2rem", cursor: "pointer" }}
              >
                {scrubHover === sec.key && (
                  <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, color: "#403B36", background: "#FCFAF5", border: "0.0625rem solid #E3D6BC", borderRadius: "0.4rem", padding: "0.1rem 0.4rem", whiteSpace: "nowrap", boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.14)" }}>{sec.label}</span>
                )}
                <span style={{ width: scrubHover === sec.key ? "0.75rem" : "0.5rem", height: "0.1875rem", borderRadius: "1rem", background: scrubHover === sec.key ? "#C99A2E" : "rgba(154,79,42,0.35)", transition: "width 0.15s ease, background 0.15s ease" }} />
              </button>
            ))}
          </div>
        </div>
      )}
      {packed.map((sec) => (
        <section key={sec.key} aria-label={sec.label} ref={(el) => { if (el) sectionEls.current.set(sec.key, el); else sectionEls.current.delete(sec.key); }}>
          {/* sticky gold-underlined band — carries all the stripped metadata */}
          <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "baseline", gap: "0.5rem", padding: "0.9rem 0 0.5rem", background: "linear-gradient(#FCFAF5 70%, rgba(252,250,245,0))" }}>
            <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: "1.0625rem", lineHeight: 1.15, color: "#403B36" }}>{sec.label}</span>
            <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", fontVariantNumeric: "tabular-nums" }}>{countLabel(sec.items.length)}</span>
            <span aria-hidden="true" style={{ flex: 1, height: "0.125rem", alignSelf: "center", background: "linear-gradient(90deg, #C99A2E, rgba(201,154,46,0.25) 45%, transparent)" }} />
          </div>
          {sec.rows.map((row, ri) => (
            <div key={ri} style={{ display: "flex", gap: `${GAP}px`, marginBottom: `${GAP}px`, contentVisibility: "auto", containIntrinsicSize: `${Math.round(effWidth)}px ${Math.round(row.height)}px` } as React.CSSProperties}>
              {row.tiles.map(({ item, w, h }) => {
                const selected = selectedMemIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    role="listitem"
                    aria-label={item.title}
                    onClick={() => (selectMode ? onToggleSelect(item.id) : onOpen(item._i))}
                    onContextMenu={(e) => { e.preventDefault(); onToggleSelect(item.id); }}
                    draggable={!!draggableTiles && !selectMode}
                    onDragStart={draggableTiles && !selectMode ? (e) => {
                      e.dataTransfer.setData("application/x-mp-memory", item.id);
                      e.dataTransfer.setData("text/plain", item.id);
                      e.dataTransfer.effectAllowed = "move";
                      onTileDragStart?.(item.id);
                    } : undefined}
                    onDragEnd={draggableTiles ? () => onTileDragEnd?.() : undefined}
                    className="il-muro-tile"
                    style={{
                      position: "relative", flex: row.last ? "0 0 auto" : "1 1 auto",
                      width: `${w}px`, height: `${h}px`, minWidth: 0,
                      padding: 0, border: "none", borderRadius: 0, overflow: "hidden",
                      background: `linear-gradient(135deg, hsl(${item.hue ?? 32},${item.s ?? 30}%,${item.l ?? 78}%), hsl(${((item.hue ?? 32) + 20) % 360},${Math.max((item.s ?? 30) - 5, 15)}%,${Math.max((item.l ?? 78) - 10, 40)}%))`,
                      cursor: "pointer",
                      boxShadow: selected ? "inset 0 0 0 0.1875rem #D4AF37" : "none",
                    }}
                  >
                    <span style={{ display: "block", width: "100%", height: "100%", opacity: selected ? 0.82 : 1, transition: "opacity 0.15s ease" }}>
                      <TileMedia mem={item as Mem} iconSize={h > 130 ? 22 : 16} onMeasured={onMeasured} />
                    </span>
                    {!selected && tileAccent && tileAccent(item.id) ? (
                      <span aria-hidden="true" style={{ position: "absolute", left: "0.3rem", bottom: "0.3rem", width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: tileAccent(item.id) as string, boxShadow: "0 0 0 0.09375rem rgba(252,250,245,0.85)" }} />
                    ) : null}
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
