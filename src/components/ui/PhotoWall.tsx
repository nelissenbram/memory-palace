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
import { useTranslation } from "@/lib/hooks/useTranslation";
import { MediaThumb } from "./MediaThumb";
import { packJustifiedRows, targetRowHeight, getAspect, setAspect, type PackedRow } from "@/lib/library/justify";
import { CREAM, EMBER, INK, MUTED, HAIRLINE, GOLD, GOLD_SOFT, EMBER_GLYPH, SHADOW } from "@/lib/libraryTokens";
import type { Mem } from "@/lib/constants/defaults";

// Layout seam: 0.1875rem expressed in px for the pixel-space packer (16px root).
const SEAM_REM = 0.1875;
const GAP = SEAM_REM * 16; // = 3px seams

/** Any browser-paintable image URL (data:image, http, blob, /api, /path). */
function paintable(u: string | null | undefined): string | null {
  if (!u) return null;
  if (u.startsWith("data:audio")) return null;
  if (u.startsWith("data:image") || u.startsWith("http") || u.startsWith("blob:") || u.startsWith("/")) return u;
  return null;
}
/** Collapse the loose memory `type` to a broad accessible category so a screen
 *  reader can distinguish a photo from an audio/video/document/story memory
 *  without needing a translation key per exact type. */
function tileCategory(type: string | undefined): "image" | "video" | "audio" | "document" | "memory" {
  switch (type) {
    case "photo": case "painting": case "album": return "image";
    case "video": return "video";
    case "audio": case "voice": case "interview": return "audio";
    case "document": case "text": return "document";
    default: return "memory";
  }
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
function TileMedia({ mem, iconSize, iconColor, onMeasured }: { mem: Mem; iconSize: number; iconColor?: string; onMeasured: (id: string, type: Mem["type"], ar: number) => void }) {
  const sources = React.useMemo(() => tileSources(mem), [mem]);
  const [idx, setIdx] = useState(0);
  // Reset the fallback pointer when the source set changes (memory swapped in via
  // key reuse), otherwise a stale idx can point past the new sources array.
  useEffect(() => { setIdx(0); }, [sources]);
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
          if (el.naturalWidth > 0 && el.naturalHeight > 0) onMeasured(mem.id, mem.type, el.naturalWidth / el.naturalHeight);
        }}
        onError={() => setIdx((i) => i + 1)}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  return <MediaThumb mem={mem} size="100%" borderRadius="0" iconSize={iconSize} iconColor={iconColor} />;
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
  /** how the parent sorted `mems`; drives section ordering ("oldest") or disables
   *  month banding entirely ("alpha"/"type" render one unbanded section in the
   *  incoming order). Ignored by the Rooms lens. Default "newest". */
  sortMode?: "newest" | "oldest" | "alpha" | "type";
  /** room label for a memory, used by the Rooms lens */
  roomLabelOf?: (memId: string) => string;
  /** HTML5 drag of a tile into a sidebar room (desktop pointer only) */
  draggableTiles?: boolean;
  onTileDragStart?: (memId: string) => void;
  onTileDragEnd?: () => void;
  /** Touch path: long-press lifts the tile, a fixed ghost follows the finger;
   *  the parent renders a drop tray and hit-tests the end coordinates. */
  onTouchDragStart?: (memId: string) => void;
  onTouchDragMove?: (x: number, y: number) => void;
  onTouchDragEnd?: (x: number, y: number) => void;
}

type Section = { key: string; label: string; items: (Mem & { ar: number; _i: number })[]; band?: boolean };

function PhotoWall({ mems, isMobile, selectMode, selectedMemIds, onToggleSelect, onOpen, monthLabel, undatedLabel, countLabel, tileAccent, groupBy = "month", sortMode = "newest", roomLabelOf, draggableTiles, onTileDragStart, onTileDragEnd, onTouchDragStart, onTouchDragMove, onTouchDragEnd }: PhotoWallProps) {
  const { t } = useTranslation("library");
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
  const onMeasured = React.useCallback((id: string, type: Mem["type"], ar: number) => {
    // compare against the same typed fallback the wall actually packed with,
    // otherwise square photos never repack and correct-AR photos repack for nothing
    const prev = getAspect(id, type);
    setAspect(id, ar);
    if (Math.abs(prev - ar) > 0.02 && !pendingRepack.current) {
      pendingRepack.current = true;
      requestAnimationFrame(() => { pendingRepack.current = false; setArVersion((v) => v + 1); });
    }
  }, []);

  // Group by month (newest first), preserving each memory's original index so
  // the viewer opens the right one.
  const sections = useMemo<Section[]>(() => {
    // alpha/type sorts have no chronology — one unbanded section in the
    // parent's already-sorted order (Rooms lens keeps its own banding).
    if (groupBy !== "room" && (sortMode === "alpha" || sortMode === "type")) {
      return [{
        key: "all",
        label: "",
        band: false,
        items: mems.map((mem, _i) => ({ ...(mem as Mem), ar: getAspect(mem.id, mem.type), _i })),
      }];
    }
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
      // rooms in first-appearance order (mems already sorted), undated last.
      // The undated bucket's key is the undatedLabel (see room-lens key above),
      // so detect it by label to actually push it to the end.
      const isUndated = (k: string) => k === undatedLabel || k === "·";
      return order.map(k => byKey.get(k)!).sort((a, b) => (isUndated(a.key) ? 1 : isUndated(b.key) ? -1 : 0));
    }
    // month: undated last, others by key — newest→oldest by default, ascending for "oldest"
    return [...byKey.values()].sort((a, b) => {
      if (a.key === "undated") return 1;
      if (b.key === "undated") return -1;
      return sortMode === "oldest" ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key);
    });
  }, [mems, monthLabel, undatedLabel, groupBy, sortMode, roomLabelOf]);

  const rowH = targetRowHeight(effWidth);
  // Tap-target floor on coarse-pointer/mobile: never pack a tile shorter than
  // 2.75rem (44px @16px root) so every tile stays a usable touch target.
  const minRowH = isMobile ? 2.75 * 16 : 0;
  const packed = useMemo(
    // re-read getAspect at pack time so measured ratios (arVersion) take effect
    () => sections.map((s) => ({
      ...s,
      rows: packJustifiedRows(
        s.items.map((it) => ({ ...it, ar: getAspect(it.id, it.type) })),
        effWidth, rowH, GAP, minRowH,
      ) as PackedRow<Mem & { ar: number; _i: number }>[],
    })),
    // arVersion intentionally in deps to re-pack when real ratios arrive
    [sections, effWidth, rowH, minRowH, arVersion],
  );

  // Jump-to-date scrubber: refs to each section so a tick can scroll to it.
  const sectionEls = useRef<Map<string, HTMLElement>>(new Map());
  const [scrubHover, setScrubHover] = useState<string | null>(null);

  // Rail ticks — one per section, but condensed to YEAR ticks when a multi-year
  // library would overflow the viewport (>24 sections). `target` is the section
  // key the tick scrolls to (the year's first section when condensed).
  const ticks = useMemo(() => {
    const base = sections.map((s) => ({ key: s.key, label: s.label, target: s.key }));
    if (groupBy === "room" || base.length <= 24) return base;
    const out: typeof base = [];
    const seen = new Set<string>();
    for (const s of sections) {
      const year = s.key === "undated" ? "undated" : s.key.slice(0, 4);
      if (!seen.has(year)) { seen.add(year); out.push({ key: year, label: s.key === "undated" ? s.label : year, target: s.key }); }
    }
    return out;
  }, [sections, groupBy]);
  const showRail = ticks.length > 1;

  // Touch-friendly scrubbing: pointer-drag along the rail maps Y → nearest tick,
  // shows its label bubble, and scrolls there on release. Plain click still works.
  const railColRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef<{ ticks: { key: string; target: string; y: number }[]; active: boolean }>({ ticks: [], active: false });
  const scrubClearT = useRef<number | null>(null);
  useEffect(() => () => { if (scrubClearT.current !== null) window.clearTimeout(scrubClearT.current); }, []);
  const nearestTick = (clientY: number) => {
    let best: { key: string; target: string; y: number } | null = null;
    for (const t of dragState.current.ticks) {
      if (!best || Math.abs(t.y - clientY) < Math.abs(best.y - clientY)) best = t;
    }
    return best;
  };
  // Honour prefers-reduced-motion for JS-driven jump scrolls (CSS scroll-behavior
  // can't override scrollIntoView), mirroring the tile-transition guard below.
  const scrollBehavior = (): ScrollBehavior =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  const onRailPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = railColRef.current;
    if (!el) return;
    dragState.current.ticks = Array.from(el.querySelectorAll<HTMLElement>("[data-tick-key]")).map((n) => {
      const r = n.getBoundingClientRect();
      return { key: n.dataset.tickKey || "", target: n.dataset.tickTarget || "", y: r.top + r.height / 2 };
    });
    dragState.current.active = true;
    try { el.setPointerCapture(e.pointerId); } catch { /* older browsers */ }
    if (scrubClearT.current !== null) window.clearTimeout(scrubClearT.current);
    const t = nearestTick(e.clientY);
    if (t) setScrubHover(t.key);
  };
  const onRailPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    const t = nearestTick(e.clientY);
    if (t) setScrubHover(t.key);
  };
  const onRailPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    const t = nearestTick(e.clientY);
    if (t) sectionEls.current.get(t.target)?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
    scrubClearT.current = window.setTimeout(() => setScrubHover(null), 600);
  };
  const onRailPointerCancel = () => {
    if (!dragState.current.active) return;
    dragState.current.active = false;
    scrubClearT.current = window.setTimeout(() => setScrubHover(null), 300);
  };

  // ── Mobile long-press drag: ~450ms hold lifts the tile (cancelled by >8px
  //    movement or a browser scroll takeover / pointercancel before the
  //    threshold), then a fixed-position ghost clone follows the finger and
  //    move/end coordinates stream to the parent for drop-tray hit-testing.
  //    Page scroll is suppressed only WHILE a drag is active (a second finger
  //    may still scroll inside the parent's [data-drop-tray]). ──
  const touchDrag = useRef<{
    id: string; startX: number; startY: number;
    timer: ReturnType<typeof setTimeout> | null;
    active: boolean; clone: HTMLDivElement | null;
    ox: number; oy: number; scale: boolean;
  } | null>(null);
  const blockScrollRef = useRef<((ev: TouchEvent) => void) | null>(null);
  // A completed long-press drag must not double as a tap (click fires after pointerup)
  const suppressClickRef = useRef(false);
  const [touchDraggingId, setTouchDraggingId] = useState<string | null>(null);
  const clearTouchDrag = React.useCallback(() => {
    const st = touchDrag.current;
    if (st?.timer) clearTimeout(st.timer);
    if (st?.clone) st.clone.remove();
    if (blockScrollRef.current) { window.removeEventListener("touchmove", blockScrollRef.current); blockScrollRef.current = null; }
    touchDrag.current = null;
    setTouchDraggingId(null);
  }, []);
  useEffect(() => () => clearTouchDrag(), [clearTouchDrag]);

  return (
    <div ref={containerRef} className="il-muro" style={{ position: "relative", width: "100%", paddingRight: isMobile && showRail ? "0.9rem" : undefined }}>
      {/* right-edge jump-to-date rail (thumb-natural zone); hidden with <2 ticks.
          On mobile it lives in the reserved right gutter so it never overlays tiles.
          Exposed as a real navigation landmark so keyboard/AT users can jump too. */}
      {showRail && (
        <div className="il-muro-scrub" role="navigation" aria-label={t("jumpToDate")} style={{ position: "sticky", top: 0, float: "right", width: 0, height: 0, zIndex: 6 }}>
          <div
            ref={railColRef}
            onPointerDown={onRailPointerDown}
            onPointerMove={onRailPointerMove}
            onPointerUp={onRailPointerUp}
            onPointerCancel={onRailPointerCancel}
            style={{ position: "absolute", right: isMobile ? "-0.85rem" : "-1.5rem", top: "0.5rem", display: "flex", flexDirection: "column", gap: "0.2rem", alignItems: "flex-end", maxHeight: "80vh", overflowY: "hidden", touchAction: "none" }}
          >
            {ticks.map((tick) => (
              <button
                key={tick.key}
                type="button"
                data-tick-key={tick.key}
                data-tick-target={tick.target}
                aria-label={t("jumpTo", { label: tick.label })}
                onClick={() => sectionEls.current.get(tick.target)?.scrollIntoView({ block: "start", behavior: scrollBehavior() })}
                onFocus={() => setScrubHover(tick.key)}
                onBlur={() => { if (!dragState.current.active) setScrubHover((h) => (h === tick.key ? null : h)); }}
                onMouseEnter={() => setScrubHover(tick.key)}
                onMouseLeave={() => { if (!dragState.current.active) setScrubHover((h) => (h === tick.key ? null : h)); }}
                // On coarse/mobile pointers the invisible hit box is expanded to a
                // real touch target (minHeight + generous vertical padding) while the
                // dot glyph stays visually small and centered.
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "flex-end", background: "none", border: "none", padding: isMobile ? "0.6rem 0.4rem 0.6rem 0.9rem" : "0.15rem 0.2rem", minHeight: isMobile ? "2.75rem" : undefined, minWidth: isMobile ? "2.75rem" : undefined, cursor: "pointer" }}
              >
                {scrubHover === tick.key && (
                  <span aria-hidden="true" style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, color: INK, background: CREAM, border: `0.0625rem solid ${HAIRLINE}`, borderRadius: "0.4rem", padding: "0.1rem 0.4rem", whiteSpace: "nowrap", boxShadow: SHADOW[2] }}>{tick.label}</span>
                )}
                <span aria-hidden="true" style={{ width: scrubHover === tick.key ? "0.75rem" : "0.5rem", height: "0.1875rem", borderRadius: "1rem", background: scrubHover === tick.key ? EMBER : `${EMBER_GLYPH}59`, transition: "width 0.15s ease, background 0.15s ease" }} />
              </button>
            ))}
          </div>
        </div>
      )}
      {packed.map((sec) => (
        <section key={sec.key} aria-label={sec.label} ref={(el) => { if (el) sectionEls.current.set(sec.key, el); else sectionEls.current.delete(sec.key); }}>
          {/* sticky gold-underlined band — carries all the stripped metadata
              (skipped for the single unbanded alpha/type section) */}
          {sec.band !== false && (
            <div style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "baseline", gap: "0.5rem", padding: "0.9rem 0 0.5rem", background: `linear-gradient(${CREAM} 70%, rgba(252,250,245,0))` }}>
              <span style={{ fontFamily: T.font.display, fontWeight: 600, fontSize: "1.0625rem", lineHeight: 1.15, color: INK }}>{sec.label}</span>
              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: MUTED, fontVariantNumeric: "tabular-nums" }}>{countLabel(sec.items.length)}</span>
              <span aria-hidden="true" style={{ flex: 1, height: "0.125rem", alignSelf: "center", background: `linear-gradient(90deg, ${GOLD_SOFT}, rgba(201,154,46,0.25) 45%, transparent)` }} />
            </div>
          )}
          {sec.rows.map((row, ri) => (
            <div key={ri} role="list" style={{ display: "flex", gap: `${SEAM_REM}rem`, marginBottom: `${SEAM_REM}rem`, contentVisibility: "auto", containIntrinsicSize: `${Math.round(effWidth)}px ${Math.round(row.height)}px` } as React.CSSProperties}>
              {row.tiles.map(({ item, w, h }) => {
                const selected = selectedMemIds.has(item.id);
                // Announce the broad media category so audio/video/document memories
                // are distinguishable non-visually; append the selected state in
                // selectMode so screen readers hear it too.
                const typeName = t(`tileType_${tileCategory(item.type)}`);
                const baseName = item.title ? `${item.title} — ${typeName}` : typeName;
                const ariaName = selectMode && selected ? `${baseName} · ${t("tileSelected")}` : baseName;
                // When tiles are draggable (desktop pointer), the move affordance is
                // otherwise invisible to keyboard/AT users. Announce it as a
                // roledescription so a screen reader hears that the tile is movable
                // and that select mode carries the pointer-free move path.
                const movable = !!draggableTiles && !selectMode;
                // Touch move path (long-press): enabled by the parent's callback,
                // gated per-event on pointerType === "touch" below.
                const touchMovable = !!onTouchDragStart && !selectMode;
                return (
                  <button
                    key={item.id}
                    role="listitem"
                    aria-label={ariaName}
                    aria-roledescription={movable ? t("tileMovable") : undefined}
                    aria-pressed={selectMode ? selected : undefined}
                    onClick={() => {
                      if (suppressClickRef.current) { suppressClickRef.current = false; return; }
                      if (selectMode) onToggleSelect(item.id); else onOpen(item._i);
                    }}
                    onContextMenu={selectMode
                      ? (e) => { e.preventDefault(); onToggleSelect(item.id); }
                      : touchMovable
                        ? (e) => { if (touchDrag.current) e.preventDefault(); }
                        : undefined}
                    onPointerDown={touchMovable ? (e) => {
                      if (e.pointerType !== "touch") return;
                      const el = e.currentTarget;
                      const pointerId = e.pointerId;
                      const rect = el.getBoundingClientRect();
                      clearTouchDrag();
                      const st = {
                        id: item.id, startX: e.clientX, startY: e.clientY,
                        timer: null as ReturnType<typeof setTimeout> | null,
                        active: false, clone: null as HTMLDivElement | null,
                        ox: e.clientX - rect.left, oy: e.clientY - rect.top,
                        scale: true,
                      };
                      st.timer = setTimeout(() => {
                        st.timer = null;
                        st.active = true;
                        // reduced motion: no scale lift, drag stays functional
                        st.scale = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                        const block = (ev: TouchEvent) => {
                          const tgt = ev.target as HTMLElement | null;
                          if (tgt?.closest?.("[data-drop-tray]")) return; // tray stays scrollable
                          ev.preventDefault();
                        };
                        blockScrollRef.current = block;
                        window.addEventListener("touchmove", block, { passive: false });
                        const clone = document.createElement("div");
                        clone.style.cssText = `position:fixed;left:0;top:0;width:${rect.width}px;height:${rect.height}px;z-index:10060;pointer-events:none;opacity:0.85;overflow:hidden;box-shadow:0 0.75rem 2rem rgba(36,28,21,0.35);`;
                        const ghost = el.cloneNode(true) as HTMLElement;
                        ghost.style.width = "100%"; ghost.style.height = "100%";
                        clone.appendChild(ghost);
                        clone.style.transform = `translate(${st.startX - st.ox}px, ${st.startY - st.oy}px)${st.scale ? " scale(1.05)" : ""}`;
                        document.body.appendChild(clone);
                        st.clone = clone;
                        try { el.setPointerCapture(pointerId); } catch { /* older browsers */ }
                        setTouchDraggingId(item.id);
                        onTouchDragStart?.(item.id);
                      }, 450);
                      touchDrag.current = st;
                    } : undefined}
                    onPointerMove={touchMovable ? (e) => {
                      const st = touchDrag.current;
                      if (!st || st.id !== item.id) return;
                      if (!st.active) {
                        // >8px before the threshold = a scroll/pan, not a lift
                        if (Math.hypot(e.clientX - st.startX, e.clientY - st.startY) > 8) clearTouchDrag();
                        return;
                      }
                      if (st.clone) st.clone.style.transform = `translate(${e.clientX - st.ox}px, ${e.clientY - st.oy}px)${st.scale ? " scale(1.05)" : ""}`;
                      onTouchDragMove?.(e.clientX, e.clientY);
                    } : undefined}
                    onPointerUp={touchMovable ? (e) => {
                      const st = touchDrag.current;
                      if (!st || st.id !== item.id) return;
                      const wasActive = st.active;
                      const x = e.clientX, y = e.clientY;
                      clearTouchDrag();
                      if (wasActive) {
                        suppressClickRef.current = true;
                        // safety: if no click follows this pointerup, don't swallow the NEXT tap
                        window.setTimeout(() => { suppressClickRef.current = false; }, 350);
                        onTouchDragEnd?.(x, y);
                      }
                    } : undefined}
                    onPointerCancel={touchMovable ? () => {
                      const st = touchDrag.current;
                      const wasActive = !!st?.active;
                      clearTouchDrag();
                      // off-screen coords: the parent's hit-test misses and just clears state
                      if (wasActive) onTouchDragEnd?.(-9999, -9999);
                    } : undefined}
                    draggable={movable}
                    onDragStart={movable ? (e) => {
                      e.dataTransfer.setData("application/x-mp-memory", item.id);
                      e.dataTransfer.setData("text/plain", item.id);
                      e.dataTransfer.effectAllowed = "move";
                      onTileDragStart?.(item.id);
                    } : undefined}
                    onDragEnd={movable ? () => onTileDragEnd?.() : undefined}
                    className="il-muro-tile"
                    style={{
                      position: "relative", flex: row.last ? "0 0 auto" : "1 1 auto",
                      width: `${w}px`, height: `${h}px`,
                      // touch-target floor on mobile: tall/narrow tiles never render below 2.75rem
                      minWidth: isMobile ? "2.75rem" : 0,
                      minHeight: isMobile ? "2.75rem" : undefined,
                      padding: 0, border: "none", borderRadius: 0, overflow: "hidden",
                      background: `linear-gradient(135deg, hsl(${item.hue ?? 32},${item.s ?? 30}%,${item.l ?? 78}%), hsl(${((item.hue ?? 32) + 20) % 360},${Math.max((item.s ?? 30) - 5, 15)}%,${Math.max((item.l ?? 78) - 10, 40)}%))`,
                      cursor: "pointer",
                      boxShadow: selected ? `inset 0 0 0 0.1875rem ${EMBER}` : "none",
                      // dim the source tile while its ghost rides the finger
                      opacity: touchDraggingId === item.id ? 0.4 : 1,
                      // long-press must lift, not select text / show the iOS callout
                      WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none",
                    }}
                  >
                    <span style={{ display: "block", width: "100%", height: "100%", opacity: selected ? 0.82 : 1, transition: "opacity 0.15s ease" }}>
                      <TileMedia mem={item as Mem} iconSize={h > 130 ? 22 : 16} iconColor={EMBER_GLYPH} onMeasured={onMeasured} />
                    </span>
                    {/* bottom title scrim — hover/focus reveal on hover-capable
                        devices, always-on (slightly dimmer) on touch; never
                        covers more than the bottom band of the tile */}
                    {item.title ? (
                      <span aria-hidden="true" className="il-muro-title" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "1.1rem 0.375rem 0.2rem", background: "linear-gradient(180deg, transparent, rgba(36,28,21,0.72))", pointerEvents: "none" }}>
                        <span style={{ display: "block", fontFamily: T.font.display, fontSize: h > 130 ? "0.8125rem" : "0.6875rem", fontWeight: 600, lineHeight: 1.25, color: CREAM, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
                      </span>
                    ) : null}
                    {!selected && tileAccent && tileAccent(item.id) ? (
                      <span aria-hidden="true" style={{ position: "absolute", left: "0.3rem", bottom: "0.3rem", width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: tileAccent(item.id) as string, boxShadow: "0 0 0 0.09375rem rgba(252,250,245,0.85)" }} />
                    ) : null}
                    {selected && (() => {
                      // Scale the badge from the packed tile height so the mark keeps
                      // consistent visual weight across small and large tiles.
                      const badge = Math.max(1, Math.min(1.5, h / 90));
                      const inset = badge * 0.3;
                      return (
                        <span aria-hidden="true" style={{ position: "absolute", top: `${inset}rem`, right: `${inset}rem`, width: `${badge}rem`, height: `${badge}rem`, borderRadius: "50%", background: EMBER, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width={Math.round(badge * 14)} height={Math.round(badge * 14)} viewBox="0 0 24 24" fill="none" stroke={CREAM} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </span>
                      );
                    })()}
                  </button>
                );
              })}
            </div>
          ))}
        </section>
      ))}
      <style>{`
        .il-muro-tile { transition: filter 0.15s ease; }
        /* title scrim: touch (hover:none) default = always visible, compact & dimmer */
        .il-muro-title { opacity: 0.8; transition: opacity 0.15s ease; }
        @media (hover: hover) {
          .il-muro-title { opacity: 0; }
          .il-muro-tile:hover .il-muro-title, .il-muro-tile:focus-visible .il-muro-title { opacity: 1; }
        }
        @media (hover: hover) { .il-muro-tile:hover { filter: brightness(1.06); } }
        .il-muro-tile:focus-visible {
          outline: 0.1875rem solid ${GOLD};
          outline-offset: -0.1875rem;
          /* second inset contrast ring so the gold focus reads on light AND dark tiles */
          box-shadow: inset 0 0 0 0.0625rem rgba(64,59,54,0.55);
        }
        @media (prefers-reduced-motion: reduce) { .il-muro-tile { transition: none; } .il-muro-title { transition: none; } }
      `}</style>
    </div>
  );
}

// Memoised so the parent's useCallback-stabilised props skip re-renders of the
// (potentially thousand-tile) wall.
export default React.memo(PhotoWall);
