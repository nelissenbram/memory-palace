"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { localeDateCodes, type Locale } from "@/i18n/config";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { WINGS } from "@/lib/constants/wings";
import { getAllDemoMems } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { WingIcon } from "./WingRoomIcons";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { LAND_PATHS } from "./worldMapPaths";

/* ── Inline SVG icons ── */

function GlobeIcon({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function MapPinIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

function CameraIcon({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function MicIcon({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function PenIcon({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

interface MemoryMapProps {
  userMems: Record<string, Mem[]>;
  onClose: () => void;
  onNavigate?: (roomId: string) => void;
  onNavigateLibrary: () => void;
  /** Navigate to a specific memory in the Library */
  onNavigateToMemory?: (wingId: string, roomId: string, memoryId: string) => void;
}

/* ── Helpers ── */

function wingFromRoom(roomId: string): string {
  if (roomId.startsWith("ro")) return "roots";
  if (roomId.startsWith("ne")) return "nest";
  if (roomId.startsWith("cf")) return "craft";
  if (roomId.startsWith("tv")) return "travel";
  if (roomId.startsWith("pa")) return "passions";
  return "roots";
}

interface ClusteredPin {
  lat: number;
  lng: number;
  locationName: string;
  mems: { mem: Mem; roomId: string; wingId: string }[];
  accent: string;
}

/* ── Equirectangular projection ── */
const VB_W = 1000;
const VB_H = 500;

function geoToSvg(lng: number, lat: number): [number, number] {
  const x = (lng + 180) / 360 * VB_W;
  const y = (90 - lat) / 180 * VB_H;
  return [x, y];
}

/* ── Grid lines for the map ── */
function generateGridLines(): string[] {
  const lines: string[] = [];
  // Latitude lines every 30 degrees
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = geoToSvg(0, lat);
    lines.push(`M0,${y.toFixed(1)}L${VB_W},${y.toFixed(1)}`);
  }
  // Longitude lines every 30 degrees
  for (let lng = -150; lng <= 180; lng += 30) {
    const [x] = geoToSvg(lng, 0);
    lines.push(`M${x.toFixed(1)},0L${x.toFixed(1)},${VB_H}`);
  }
  return lines;
}

const GRID_LINES = generateGridLines();

/* ── SVG World Map sub-component ── */

interface SVGWorldMapProps {
  clusters: ClusteredPin[];
  selectedPin: ClusteredPin | null;
  setSelectedPin: (p: ClusteredPin | null) => void;
  hoveredPin: ClusteredPin | null;
  setHoveredPin: (p: ClusteredPin | null) => void;
  isMobile: boolean;
}

function SVGWorldMap({
  clusters,
  selectedPin,
  setSelectedPin,
  hoveredPin,
  setHoveredPin,
  isMobile,
}: SVGWorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: VB_W, h: VB_H });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, vbX: 0, vbY: 0 });
  const pinchStartDist = useRef(0);
  const pinchStartVB = useRef({ x: 0, y: 0, w: VB_W, h: VB_H });

  const MIN_ZOOM_W = 80;   // maximum zoom in
  const MAX_ZOOM_W = VB_W;  // maximum zoom out (full world)

  // Convert screen coords to SVG coords
  const screenToSvg = useCallback((clientX: number, clientY: number): [number, number] => {
    const el = containerRef.current;
    if (!el) return [0, 0];
    const rect = el.getBoundingClientRect();
    const sx = (clientX - rect.left) / rect.width;
    const sy = (clientY - rect.top) / rect.height;
    return [viewBox.x + sx * viewBox.w, viewBox.y + sy * viewBox.h];
  }, [viewBox]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const [svgX, svgY] = screenToSvg(e.clientX, e.clientY);
    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;

    setViewBox(vb => {
      let newW = Math.min(MAX_ZOOM_W, Math.max(MIN_ZOOM_W, vb.w * factor));
      let newH = newW * (VB_H / VB_W);
      // Zoom toward cursor
      const ratioX = (svgX - vb.x) / vb.w;
      const ratioY = (svgY - vb.y) / vb.h;
      let newX = svgX - ratioX * newW;
      let newY = svgY - ratioY * newH;
      // Clamp
      newX = Math.max(-100, Math.min(VB_W + 100 - newW, newX));
      newY = Math.max(-50, Math.min(VB_H + 50 - newH, newY));
      return { x: newX, y: newY, w: newW, h: newH };
    });
  }, [screenToSvg]);

  // Pan start
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch" && e.isPrimary === false) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, vbX: viewBox.x, vbY: viewBox.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [viewBox]);

  // Pan move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - panStart.current.x) / rect.width * viewBox.w;
    const dy = (e.clientY - panStart.current.y) / rect.height * viewBox.h;
    let newX = panStart.current.vbX - dx;
    let newY = panStart.current.vbY - dy;
    newX = Math.max(-100, Math.min(VB_W + 100 - viewBox.w, newX));
    newY = Math.max(-50, Math.min(VB_H + 50 - viewBox.h, newY));
    setViewBox(vb => ({ ...vb, x: newX, y: newY }));
  }, [isPanning, viewBox]);

  // Pan end
  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Pinch zoom (touch)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist.current = Math.sqrt(dx * dx + dy * dy);
      pinchStartVB.current = { ...viewBox };
    }
  }, [viewBox]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = pinchStartDist.current / dist;

      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const sx = (midX - rect.left) / rect.width;
      const sy = (midY - rect.top) / rect.height;

      const pvb = pinchStartVB.current;
      const svgMidX = pvb.x + sx * pvb.w;
      const svgMidY = pvb.y + sy * pvb.h;

      let newW = Math.min(MAX_ZOOM_W, Math.max(MIN_ZOOM_W, pvb.w * scale));
      let newH = newW * (VB_H / VB_W);
      let newX = svgMidX - sx * newW;
      let newY = svgMidY - sy * newH;
      newX = Math.max(-100, Math.min(VB_W + 100 - newW, newX));
      newY = Math.max(-50, Math.min(VB_H + 50 - newH, newY));
      setViewBox({ x: newX, y: newY, w: newW, h: newH });
    }
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setViewBox(vb => {
      const cx = vb.x + vb.w / 2;
      const cy = vb.y + vb.h / 2;
      const newW = Math.max(MIN_ZOOM_W, vb.w / 1.4);
      const newH = newW * (VB_H / VB_W);
      return {
        x: Math.max(-100, Math.min(VB_W + 100 - newW, cx - newW / 2)),
        y: Math.max(-50, Math.min(VB_H + 50 - newH, cy - newH / 2)),
        w: newW, h: newH,
      };
    });
  }, []);

  const zoomOut = useCallback(() => {
    setViewBox(vb => {
      const cx = vb.x + vb.w / 2;
      const cy = vb.y + vb.h / 2;
      const newW = Math.min(MAX_ZOOM_W, vb.w * 1.4);
      const newH = newW * (VB_H / VB_W);
      return {
        x: Math.max(-100, Math.min(VB_W + 100 - newW, cx - newW / 2)),
        y: Math.max(-50, Math.min(VB_H + 50 - newH, cy - newH / 2)),
        w: newW, h: newH,
      };
    });
  }, []);

  const resetView = useCallback(() => {
    setViewBox({ x: 0, y: 0, w: VB_W, h: VB_H });
  }, []);

  // Fit to pins
  useEffect(() => {
    if (clusters.length === 0) return;
    const coords = clusters.map(c => geoToSvg(c.lng, c.lat));
    const xs = coords.map(c => c[0]);
    const ys = coords.map(c => c[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    if (clusters.length === 1) {
      // Single pin - center on it with moderate zoom
      const w = 300;
      const h = w * (VB_H / VB_W);
      setViewBox({
        x: Math.max(-100, Math.min(VB_W + 100 - w, coords[0][0] - w / 2)),
        y: Math.max(-50, Math.min(VB_H + 50 - h, coords[0][1] - h / 2)),
        w, h,
      });
      return;
    }

    const padX = 80;
    const padY = 60;
    let w = maxX - minX + padX * 2;
    let h = maxY - minY + padY * 2;
    // Maintain aspect ratio
    const aspect = VB_W / VB_H;
    if (w / h > aspect) {
      h = w / aspect;
    } else {
      w = h * aspect;
    }
    // Clamp
    w = Math.min(MAX_ZOOM_W, Math.max(MIN_ZOOM_W, w));
    h = w * (VB_H / VB_W);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setViewBox({
      x: Math.max(-100, Math.min(VB_W + 100 - w, cx - w / 2)),
      y: Math.max(-50, Math.min(VB_H + 50 - h, cy - h / 2)),
      w, h,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters.length]);

  // Compute pin size relative to zoom
  const pinRadius = Math.max(3, Math.min(8, viewBox.w / 100));
  const pinStroke = Math.max(0.8, pinRadius / 3);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        cursor: isPanning ? "grabbing" : "grab",
        touchAction: "none",
        background: "#F5F0E4",
      }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <svg
        viewBox={`${viewBox.x.toFixed(2)} ${viewBox.y.toFixed(2)} ${viewBox.w.toFixed(2)} ${viewBox.h.toFixed(2)}`}
        style={{ width: "100%", height: "100%", display: "block" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Parchment/ocean background gradient */}
          <radialGradient id="oceanGrad" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#F7F2E8" />
            <stop offset="100%" stopColor="#EDE5D5" />
          </radialGradient>
          {/* Land fill gradient */}
          <linearGradient id="landGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8D9C0" />
            <stop offset="100%" stopColor="#D6C4A6" />
          </linearGradient>
          {/* Subtle land texture via filter */}
          <filter id="landTexture" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="42" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
            <feBlend mode="soft-light" in="SourceGraphic" in2="mono" result="textured" />
          </filter>
          {/* Pin shadow */}
          <filter id="pinShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0.8" stdDeviation="1.5" floodColor="#3C2814" floodOpacity="0.35" />
          </filter>
          {/* Pin glow for hover */}
          <filter id="pinGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#D4AF37" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Ocean / parchment background */}
        <rect x={-200} y={-100} width={VB_W + 400} height={VB_H + 200} fill="url(#oceanGrad)" />

        {/* Grid lines */}
        {GRID_LINES.map((d, i) => (
          <path key={`grid-${i}`} d={d} fill="none" stroke="#D4C5B2" strokeWidth="0.3" opacity="0.4" />
        ))}

        {/* Tropics and equator (special grid lines) */}
        {[0, 23.436, -23.436].map(lat => {
          const [, y] = geoToSvg(0, lat);
          return (
            <path
              key={`special-${lat}`}
              d={`M0,${y.toFixed(1)}L${VB_W},${y.toFixed(1)}`}
              fill="none"
              stroke={lat === 0 ? "#C4A882" : "#D4C5B2"}
              strokeWidth={lat === 0 ? "0.5" : "0.35"}
              strokeDasharray={lat === 0 ? "none" : "4,3"}
              opacity={lat === 0 ? 0.5 : 0.35}
            />
          );
        })}

        {/* Land masses from Natural Earth data */}
        <g filter="url(#landTexture)">
          {LAND_PATHS.map((d, i) => (
            <path
              key={`land-${i}`}
              d={d}
              fill="url(#landGrad)"
              stroke="#B8A68A"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* Memory pins */}
        {clusters.map((cluster, i) => {
          const [cx, cy] = geoToSvg(cluster.lng, cluster.lat);
          const isSelected = selectedPin === cluster;
          const isHovered = hoveredPin === cluster;
          const count = cluster.mems.length;
          const r = count > 1 ? pinRadius * 1.3 : pinRadius;

          return (
            <g
              key={`pin-${i}`}
              style={{ cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); setSelectedPin(isSelected ? null : cluster); }}
              onPointerEnter={() => setHoveredPin(cluster)}
              onPointerLeave={() => setHoveredPin(null)}
            >
              {/* Pulse animation ring */}
              <circle
                cx={cx}
                cy={cy}
                r={r * 2.5}
                fill="none"
                stroke={cluster.accent}
                strokeWidth={pinStroke * 0.5}
                opacity={0.3}
              >
                <animate attributeName="r" from={r * 1.5} to={r * 3} dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.4" to="0" dur="3s" repeatCount="indefinite" />
              </circle>

              {/* Pin outer ring (white border) */}
              <circle
                cx={cx}
                cy={cy}
                r={r + pinStroke}
                fill="white"
                filter={(isHovered || isSelected) ? "url(#pinGlow)" : "url(#pinShadow)"}
              />

              {/* Pin colored fill */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={cluster.accent}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={pinStroke}
              />

              {/* Count label for clusters */}
              {count > 1 && (
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={r * 0.9}
                  fontFamily={T.font.body}
                  fontWeight="700"
                  style={{ pointerEvents: "none" }}
                >
                  {count}
                </text>
              )}

              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r + pinStroke * 3}
                  fill="none"
                  stroke={cluster.accent}
                  strokeWidth={pinStroke * 0.8}
                  strokeDasharray={`${pinStroke * 2},${pinStroke}`}
                  opacity={0.7}
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`0 ${cx} ${cy}`}
                    to={`360 ${cx} ${cy}`}
                    dur="8s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredPin && !selectedPin && (() => {
        const el = containerRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const [svgX, svgY] = geoToSvg(hoveredPin.lng, hoveredPin.lat);
        const screenX = ((svgX - viewBox.x) / viewBox.w) * rect.width;
        const screenY = ((svgY - viewBox.y) / viewBox.h) * rect.height;
        return (
          <div style={{
            position: "absolute",
            left: screenX,
            top: screenY - 12,
            transform: "translate(-50%, -100%)",
            background: `${T.color.linen}f5`,
            backdropFilter: "blur(8px)",
            border: `1px solid ${T.color.cream}`,
            borderRadius: "0.5rem",
            padding: "0.375rem 0.625rem",
            boxShadow: "0 4px 16px rgba(60,40,20,0.2)",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}>
            <div style={{
              fontFamily: T.font.display,
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: T.color.charcoal,
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}>
              <MapPinIcon size={12} color={hoveredPin.accent} />
              {hoveredPin.locationName}
            </div>
            <div style={{
              fontFamily: T.font.body,
              fontSize: "0.625rem",
              color: T.color.muted,
            }}>
              {hoveredPin.mems.length} {hoveredPin.mems.length === 1 ? "memory" : "memories"}
            </div>
          </div>
        );
      })()}

      {/* Zoom controls */}
      <div style={{
        position: "absolute",
        right: isMobile ? "0.5rem" : "0.75rem",
        bottom: isMobile ? "0.5rem" : "0.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        zIndex: 5,
      }}>
        {[
          { label: "+", action: zoomIn },
          { label: "\u2013", action: zoomOut },
          { label: "\u25A3", action: resetView },
        ].map(({ label, action }) => (
          <button
            key={label}
            onClick={action}
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "0.375rem",
              border: `1px solid ${T.color.sandstone}`,
              background: `${T.color.linen}e8`,
              backdropFilter: "blur(6px)",
              color: T.color.walnut,
              fontSize: "1rem",
              fontFamily: T.font.body,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(60,40,20,0.12)",
              lineHeight: 1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Compass rose (top-right) */}
      <div style={{
        position: "absolute",
        right: isMobile ? "0.5rem" : "0.75rem",
        top: isMobile ? "0.5rem" : "0.75rem",
        width: "2.25rem",
        height: "2.25rem",
        zIndex: 5,
        opacity: 0.5,
      }}>
        <svg viewBox="0 0 40 40" width="100%" height="100%">
          <circle cx="20" cy="20" r="18" fill="none" stroke={T.color.sandstone} strokeWidth="0.8" />
          {/* N */}
          <path d="M20 3L22 10L20 8L18 10Z" fill={T.color.terracotta} />
          {/* S */}
          <path d="M20 37L22 30L20 32L18 30Z" fill={T.color.sandstone} />
          {/* E */}
          <path d="M37 20L30 18L32 20L30 22Z" fill={T.color.sandstone} />
          {/* W */}
          <path d="M3 20L10 18L8 20L10 22Z" fill={T.color.sandstone} />
          <text x="20" y="9" textAnchor="middle" fill={T.color.walnut} fontSize="4" fontFamily={T.font.body} fontWeight="700">N</text>
        </svg>
      </div>
    </div>
  );
}

/* ========================================================================
   COMPONENT
   ======================================================================== */
export default function MemoryMap({ userMems, onClose, onNavigate, onNavigateLibrary, onNavigateToMemory }: MemoryMapProps) {
  const isMobile = useIsMobile();
  const { t, locale } = useTranslation("memoryMap");
  const { t: tc } = useTranslation("common");
  const { t: tw } = useTranslation("wings");
  const { containerRef: focusTrapRef, handleKeyDown } = useFocusTrap(true);
  const [selectedPin, setSelectedPin] = useState<ClusteredPin | null>(null);
  const [hoveredPin, setHoveredPin] = useState<ClusteredPin | null>(null);
  const [filterWing, setFilterWing] = useState<string | null>(null);

  // Fetch memories for all rooms on mount
  const fetchRoomMemories = useMemoryStore((s) => s.fetchRoomMemories);
  const getWingRooms = useRoomStore((s) => s.getWingRooms);
  useEffect(() => {
    const allRoomIds = new Set<string>();
    for (const wing of WINGS) {
      for (const room of getWingRooms(wing.id)) {
        allRoomIds.add(room.id);
      }
    }
    for (const roomId of Object.keys(userMems)) {
      allRoomIds.add(roomId);
    }
    for (const roomId of allRoomIds) {
      fetchRoomMemories(roomId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Collect all memories with location data
  const allLocMems = useMemo(() => {
    const result: { mem: Mem; roomId: string; wingId: string }[] = [];
    const allSources = { ...getAllDemoMems(), ...userMems };
    for (const [roomId, mems] of Object.entries(allSources)) {
      for (const mem of mems) {
        if (mem.lat !== undefined && mem.lng !== undefined) {
          const wingId = wingFromRoom(roomId);
          if (!filterWing || filterWing === wingId) {
            result.push({ mem, roomId, wingId });
          }
        }
      }
    }
    return result;
  }, [userMems, filterWing]);

  // Cluster nearby memories (by location name or proximity)
  const clusters = useMemo(() => {
    const result: ClusteredPin[] = [];
    const CLUSTER_DIST_DEG = 2;

    for (const item of allLocMems) {
      let foundCluster = false;
      for (const c of result) {
        const dlat = c.lat - item.mem.lat!;
        const dlng = c.lng - item.mem.lng!;
        if (Math.sqrt(dlat * dlat + dlng * dlng) < CLUSTER_DIST_DEG) {
          c.mems.push(item);
          foundCluster = true;
          break;
        }
      }
      if (!foundCluster) {
        const wing = WINGS.find(w => w.id === item.wingId);
        result.push({
          lat: item.mem.lat!,
          lng: item.mem.lng!,
          locationName: item.mem.locationName || `${item.mem.lat!.toFixed(1)}, ${item.mem.lng!.toFixed(1)}`,
          mems: [item],
          accent: wing?.accent || T.color.terracotta,
        });
      }
    }
    return result;
  }, [allLocMems]);

  const uniqueLocations = useMemo(() =>
    new Set(allLocMems.map(m => m.mem.locationName || `${m.mem.lat},${m.mem.lng}`)).size,
    [allLocMems]
  );

  const handleSetSelectedPin = useCallback((p: ClusteredPin | null) => {
    setSelectedPin(p);
  }, []);

  const handleSetHoveredPin = useCallback((p: ClusteredPin | null) => {
    setHoveredPin(p);
  }, []);

  return (
    <div role="button" tabIndex={0} onClick={onClose} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); } }} style={{
      position: "absolute", inset: 0, zIndex: 60,
      background: "rgba(30,26,20,0.7)", backdropFilter: "blur(12px)",
      animation: "fadeIn .25s ease",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div ref={focusTrapRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={e => e.stopPropagation()} style={{
        width: isMobile ? "100%" : "min(68.75rem, 94vw)",
        height: isMobile ? "100%" : "min(43.75rem, 88vh)",
        background: `linear-gradient(145deg, ${T.color.linen}, ${T.color.warmStone})`,
        borderRadius: isMobile ? 0 : "1.25rem", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)",
        animation: "fadeUp .35s cubic-bezier(.23,1,.32,1)",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.125rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: `1px solid ${T.color.cream}`, flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontFamily: T.font.display, fontSize: "1.5rem", fontWeight: 500, color: T.color.charcoal, margin: 0 }}>
              <GlobeIcon size={22} color={T.color.charcoal} /> {t("title")}
            </h2>
            <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: "0.25rem 0 0" }}>
              {t("memoriesAcross", { memCount: String(allLocMems.length), locCount: String(uniqueLocations) })}
            </p>
          </div>
          <button onClick={onClose} aria-label={tc("close")} style={{
            width: "2.25rem", height: "2.25rem", minWidth: "2.75rem", minHeight: "2.75rem",
            borderRadius: "1.125rem",
            border: `1px solid ${T.color.cream}`, background: T.color.warmStone,
            color: T.color.muted, fontSize: "1rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{"\u2715"}</button>
        </div>

        {/* Wing filter tabs */}
        <div style={{
          padding: "0.625rem 1.5rem", display: "flex", gap: "0.375rem", flexShrink: 0,
          borderBottom: `1px solid ${T.color.cream}`, overflowX: "auto",
        }}>
          <button
            onClick={() => setFilterWing(null)}
            aria-pressed={!filterWing}
            style={{
              padding: "0.375rem 0.875rem", borderRadius: "0.5rem", border: `1px solid ${!filterWing ? T.color.walnut : T.color.cream}`,
              background: !filterWing ? `${T.color.walnut}15` : T.color.white,
              fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: !filterWing ? 600 : 400,
              color: !filterWing ? T.color.walnut : T.color.muted, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >{t("allWings")}</button>
          {WINGS.map(w => (
            <button key={w.id} onClick={() => setFilterWing(w.id)} aria-pressed={filterWing === w.id} style={{
              padding: "0.375rem 0.875rem", borderRadius: "0.5rem",
              border: `1px solid ${filterWing === w.id ? w.accent : T.color.cream}`,
              background: filterWing === w.id ? `${w.accent}15` : T.color.white,
              fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: filterWing === w.id ? 600 : 400,
              color: filterWing === w.id ? w.accent : T.color.muted, cursor: "pointer",
              whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.25rem",
            }}>
              <WingIcon wingId={w.id} size={13} color={filterWing === w.id ? w.accent : T.color.muted} /> {tw(w.nameKey) || w.name}
            </button>
          ))}
        </div>

        {/* Tutorial card */}
        {clusters.length === 0 && (
          <div style={{
            padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem",
            background: `${T.color.gold}08`, borderBottom: `1px solid ${T.color.cream}`,
          }}>
            <MapPinIcon size={18} color={T.color.walnut} />
            <p style={{
              fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut,
              margin: 0, lineHeight: 1.5, flex: 1,
            }}>
              {t("mapTutorial")}
            </p>
            <button
              onClick={() => { onClose(); onNavigateLibrary(); }}
              style={{
                fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                color: T.color.walnut, background: `${T.color.gold}20`,
                border: `1px solid ${T.color.gold}40`, borderRadius: "0.375rem",
                padding: "0.375rem 0.75rem", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {t("mapGoToLibrary")}
            </button>
          </div>
        )}

        {/* ══════════════════════ MAP AREA ══════════════════════ */}
        <div style={{
          flex: 1, position: "relative", overflow: "hidden",
          margin: isMobile ? "0.5rem" : "1rem",
          borderRadius: "0.75rem",
          border: `1px solid ${T.color.sandstone}40`,
        }}>
          <SVGWorldMap
            clusters={clusters}
            selectedPin={selectedPin}
            setSelectedPin={handleSetSelectedPin}
            hoveredPin={hoveredPin}
            setHoveredPin={handleSetHoveredPin}
            isMobile={isMobile}
          />

          {/* Empty state overlay */}
          {clusters.length === 0 && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", pointerEvents: "none",
              zIndex: 1000,
            }}>
              <div style={{
                background: "rgba(44,36,26,0.55)", backdropFilter: "blur(8px)",
                padding: "1.5rem 2.25rem", borderRadius: "1rem", textAlign: "center",
              }}>
                <div style={{ marginBottom: "0.5rem" }}><GlobeIcon size={36} color="rgba(255,255,255,0.7)" /></div>
                <p style={{ fontFamily: T.font.display, fontSize: "1.125rem", color: "#FFF", margin: "0 0 0.25rem" }}>{t("noLocations")}</p>
                <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", margin: "0 0 0.5rem" }}>
                  {t("noLocationsDesc")}
                </p>
                <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "rgba(255,255,255,0.45)", margin: 0, fontStyle: "italic" }}>
                  {t("noLocationsHint")}
                </p>
              </div>
            </div>
          )}

          {/* ── Selected pin detail panel ── */}
          {selectedPin && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: `${T.color.linen}f5`, backdropFilter: "blur(16px)",
              borderTop: `1px solid ${T.color.cream}`,
              boxShadow: "0 -8px 32px rgba(0,0,0,0.2)",
              animation: "fadeUp .25s ease",
              maxHeight: "45%", overflowY: "auto",
              padding: isMobile ? "0.875rem 1rem" : "1rem 1.5rem",
              zIndex: 1000,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <div>
                  <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: T.color.charcoal, margin: 0, display: "flex", alignItems: "center", gap: "0.375rem" }}>
                    <MapPinIcon size={18} color={T.color.terracotta} /> {selectedPin.locationName}
                  </h3>
                  <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: "0.125rem 0 0" }}>
                    {selectedPin.mems.length} {selectedPin.mems.length === 1 ? t("memory") : t("memories")}
                  </p>
                </div>
                <button onClick={() => setSelectedPin(null)} style={{
                  width: "1.75rem", height: "1.75rem", minWidth: "2.75rem", minHeight: "2.75rem",
                  borderRadius: "0.875rem", border: `1px solid ${T.color.cream}`,
                  background: T.color.warmStone, color: T.color.muted, fontSize: "0.75rem",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>{"\u2715"}</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {selectedPin.mems.map((m, j) => {
                  const wing = WINGS.find(w => w.id === m.wingId);
                  return (
                    <button key={j}
                      onClick={() => {
                        if (onNavigateToMemory) {
                          onNavigateToMemory(m.wingId, m.roomId, m.mem.id);
                        } else if (onNavigate) {
                          onNavigate(m.roomId);
                        }
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        padding: "0.625rem 0.875rem", borderRadius: "0.75rem",
                        border: `1px solid ${T.color.cream}`, background: `${T.color.white}dd`,
                        cursor: "pointer", textAlign: "left", width: "100%",
                        transition: "background .15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${selectedPin.accent}12`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${T.color.white}dd`; }}
                    >
                      {(m.mem.thumbnailUrl || m.mem.dataUrl) ? (
                        <div style={{
                          width: "3rem", height: "3rem", borderRadius: "0.5rem", overflow: "hidden", flexShrink: 0,
                          background: `${selectedPin.accent}20`, position: "relative",
                        }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={(m.mem.thumbnailUrl ?? m.mem.dataUrl) || ""} alt="" loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ) : (
                        <div style={{
                          width: "3rem", height: "3rem", borderRadius: "0.5rem", flexShrink: 0,
                          background: `linear-gradient(135deg, ${selectedPin.accent}30, ${selectedPin.accent}10)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "1.25rem",
                        }}>{m.mem.type === "photo" ? <CameraIcon size={20} color={selectedPin.accent} /> : m.mem.type === "voice" ? <MicIcon size={20} color={selectedPin.accent} /> : <PenIcon size={20} color={selectedPin.accent} />}</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 500, color: T.color.charcoal,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{m.mem.title}</div>
                        {m.mem.desc && (
                          <div style={{
                            fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "0.125rem",
                          }}>{m.mem.desc}</div>
                        )}
                        <div style={{
                          fontFamily: T.font.body, fontSize: "0.625rem", color: wing?.accent || T.color.muted,
                          marginTop: "0.1875rem", display: "flex", alignItems: "center", gap: "0.25rem",
                        }}>
                          {wing && <WingIcon wingId={wing.id} size={12} color={wing.accent} />} {wing ? (tw(wing.nameKey) || wing.name) : ""}
                          {m.mem.createdAt && <span style={{ color: T.color.muted }}> &middot; {new Date(m.mem.createdAt).toLocaleDateString(localeDateCodes[locale as Locale])}</span>}
                        </div>
                      </div>
                      <span style={{ color: T.color.muted, fontSize: "0.75rem", flexShrink: 0 }}>{"\u2192"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{
          padding: "0.625rem 1.5rem 1rem", display: "flex", gap: "1rem", flexShrink: 0,
          borderTop: `1px solid ${T.color.cream}`, alignItems: "center", flexWrap: "wrap",
        }}>
          <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted, textTransform: "uppercase", letterSpacing: ".5px" }}>{t("legend")}</span>
          {WINGS.map(w => (
            <div key={w.id} style={{ display: "flex", alignItems: "center", gap: "0.3125rem" }}>
              <div style={{ width: "0.625rem", height: "0.625rem", borderRadius: "50%", background: w.accent, border: "1px solid rgba(0,0,0,0.1)" }} />
              <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.walnut }}>{tw(w.nameKey) || w.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
