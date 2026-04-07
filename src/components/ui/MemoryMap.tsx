"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { WINGS } from "@/lib/constants/wings";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import Image from "next/image";
import { WingIcon } from "./WingRoomIcons";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useRoomStore } from "@/lib/stores/roomStore";

/* ── Inline SVG icons to replace emoji ── */

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

function latLngToXY(lat: number, lng: number, width: number, height: number) {
  const x = (lng + 180) / 360 * width;
  const y = (90 - lat) / 180 * height;
  return { x, y };
}

// Wing ID from room ID prefix
function wingFromRoom(roomId: string): string {
  if (roomId.startsWith("fr")) return "family";
  if (roomId.startsWith("tr")) return "travel";
  if (roomId.startsWith("cr")) return "childhood";
  if (roomId.startsWith("kr")) return "career";
  if (roomId.startsWith("rr")) return "creativity";
  return "family";
}

// Detailed continent polygons for canvas drawing (lng, lat pairs)
const CONTINENTS: { nameKey: string; polys: [number, number][][] }[] = [
  {
    nameKey: "northAmerica",
    polys: [[
      [-168,72],[-162,70],[-155,71],[-140,70],[-138,62],[-135,60],[-132,56],[-125,50],[-124,46],[-124,42],[-120,36],[-117,33],[-112,30],[-108,28],[-105,22],[-98,19],[-96,16],[-92,15],[-88,16],[-84,10],[-82,9],[-80,8],
      [-78,18],[-76,20],[-80,25],[-81,29],[-82,30],[-84,30],[-85,35],[-90,30],[-94,30],[-97,28],[-97,33],[-95,37],[-90,38],[-88,42],[-84,42],[-82,44],[-76,44],[-72,41],[-70,42],[-67,44],[-66,48],[-60,47],[-55,50],[-58,52],
      [-62,54],[-58,56],[-55,52],[-52,47],[-48,50],[-55,55],[-58,58],[-62,60],[-68,62],[-72,64],[-78,68],[-85,70],[-92,72],[-100,74],[-110,74],[-120,72],[-130,72],[-140,72],[-150,72],[-160,72],[-168,72]
    ]]
  },
  {
    nameKey: "southAmerica",
    polys: [[
      [-82,9],[-80,8],[-77,8],[-74,11],[-72,12],[-68,12],[-63,10],[-60,8],[-55,6],[-52,4],[-50,2],[-50,0],[-48,-2],[-44,-3],[-42,-3],[-40,-5],[-38,-8],[-36,-10],[-35,-12],[-38,-16],[-40,-18],[-42,-20],[-44,-22],[-46,-24],[-48,-26],[-48,-28],[-50,-30],[-52,-33],[-54,-34],[-56,-36],[-58,-38],[-62,-39],[-65,-42],[-66,-44],[-68,-46],[-70,-48],[-72,-50],[-74,-52],[-72,-54],[-68,-55],[-66,-54],
      [-72,-48],[-74,-42],[-72,-38],[-70,-36],[-72,-32],[-72,-28],[-70,-24],[-70,-18],[-75,-14],[-76,-10],[-78,-5],[-80,0],[-80,2],[-78,4],[-76,6],[-80,8],[-82,9]
    ]]
  },
  {
    nameKey: "europe",
    polys: [
      // Iberian Peninsula
      [[-10,36],[-8,37],[-6,37],[-2,36],[0,38],[2,40],[3,42],[0,43],[-2,44],[-4,43],[-8,44],[-9,42],[-10,40],[-10,36]],
      // Western + Central Europe
      [[0,43],[2,44],[3,48],[2,50],[-1,50],[-5,48],[-5,52],[-3,54],[-2,56],[0,58],[2,56],[4,52],[5,50],[7,48],[8,46],[10,44],[12,42],[14,42],[16,40],[18,40],[20,38],[22,38],[24,36],[26,36],[28,38],[30,40],[28,42],[26,44],[24,46],[22,48],[20,50],[18,52],[16,54],[14,55],[12,56],[10,58],[8,58],[6,58],[5,60],[4,62],[6,62],[8,60],[10,56],[14,55],[18,56],[20,58],[22,58],[24,60],[26,62],[28,64],[30,66],[32,68],[30,70],[28,72],[22,72],[18,70],[14,68],[10,66],[5,62],[0,60],[-2,58],[-5,58],[-5,52],[-3,50],[0,50],[2,50],[3,48],[0,43]]
    ]
  },
  {
    nameKey: "africa",
    polys: [
      // Mainland Africa (with Mediterranean coast gap between Europe)
      [[-18,15],[-16,18],[-17,22],[-16,26],[-14,28],[-10,32],[-6,34],[-2,36],[0,36],[4,36],[8,38],[10,37],[12,36],[14,34],[16,32],[20,33],[24,32],[28,32],[30,30],[32,30],[34,28],[36,24],[38,20],[40,16],[42,12],[44,10],[46,8],[48,6],[50,4],[50,0],[48,-2],[44,-4],[42,-8],[40,-12],[38,-16],[36,-20],[34,-24],[32,-28],[30,-32],[28,-34],[26,-34],[24,-33],[22,-34],[20,-34],[18,-30],[16,-26],[14,-22],[12,-18],[10,-8],[8,-2],[6,2],[4,5],[2,6],[0,6],[-4,5],[-8,5],[-10,6],[-14,10],[-16,12],[-18,15]]
    ]
  },
  {
    nameKey: "asia",
    polys: [
      // Main Asian landmass
      [[28,38],[30,40],[32,42],[34,42],[36,40],[38,38],[40,36],[42,34],[44,32],[48,30],[50,28],[52,26],[54,24],[56,22],[58,22],[60,24],[62,26],[64,26],[66,26],[68,24],[70,22],[72,20],[74,16],[76,12],[78,8],[80,8],[80,12],[82,14],[84,18],[86,20],[88,22],[90,22],[92,22],[94,20],[96,18],[98,16],[100,14],[102,8],[104,2],[105,0],[106,2],[108,4],[110,4],
      [110,8],[112,10],[116,16],[118,18],[120,20],[122,22],[124,26],[126,30],[128,34],[130,38],[132,40],[130,44],[132,46],[136,42],[138,36],[140,36],[142,40],[144,44],[148,50],[150,54],[155,58],[160,62],[165,66],[170,68],[175,68],[180,68],
      [180,72],[170,72],[160,72],[150,70],[140,68],[130,72],[120,72],[110,70],[100,66],[90,62],[80,58],[70,56],[62,56],[56,54],[50,52],[44,44],[40,42],[36,40],[32,40],[28,38]]
    ]
  },
  {
    nameKey: "australia",
    polys: [[
      [114,-22],[114,-26],[115,-30],[116,-34],[118,-35],[120,-35],[122,-34],[126,-32],[128,-32],[130,-32],[132,-34],[134,-36],[136,-38],[138,-38],[140,-38],[142,-36],[144,-38],[146,-40],[148,-38],[150,-36],[152,-32],[153,-28],[152,-24],[150,-22],[148,-20],[146,-18],[144,-16],[142,-14],[140,-12],[138,-12],[136,-14],[134,-12],[132,-12],[130,-12],[128,-14],[126,-14],[124,-16],[120,-14],[118,-16],[116,-18],[114,-22]
    ]]
  },
];

// Additional geographic features for realism
const GEO_FEATURES: { nameKey: string; polys: [number, number][][] }[] = [
  // British Isles — Great Britain
  {
    nameKey: "britishIsles",
    polys: [
      [[-6,50],[-5,51],[-4,52],[-3,53],[-3,54],[-4,55],[-5,56],[-5,57],[-4,58],[-3,58],[-2,57],[-1,56],[0,54],[1,53],[1,52],[0,51],[-1,50],[-3,50],[-6,50]],
      // Ireland
      [[-10,52],[-10,53],[-9,54],[-8,55],[-7,55],[-6,54],[-6,53],[-7,52],[-8,51],[-10,52]],
    ]
  },
  // Japan
  {
    nameKey: "japan",
    polys: [
      [[130,31],[131,33],[132,34],[134,34],[136,36],[138,38],[140,40],[142,42],[142,44],[144,44],[145,44],[144,42],[142,40],[140,38],[138,36],[136,34],[134,33],[132,32],[130,31]],
    ]
  },
  // Indonesia (major islands)
  {
    nameKey: "indonesia",
    polys: [
      // Sumatra
      [[96,-6],[98,-4],[100,-2],[102,0],[104,2],[106,2],[106,0],[106,-2],[108,-6],[106,-6],[104,-6],[102,-6],[100,-6],[98,-6],[96,-6]],
      // Borneo
      [[108,2],[110,4],[112,4],[114,4],[116,4],[118,2],[118,0],[116,-2],[114,-4],[112,-4],[110,-2],[108,0],[108,2]],
      // Sulawesi
      [[120,-2],[121,0],[122,1],[124,0],[122,-2],[122,-4],[120,-4],[120,-2]],
      // Papua / New Guinea
      [[132,-4],[134,-4],[136,-4],[138,-4],[140,-4],[142,-4],[144,-6],[146,-6],[148,-6],[150,-6],[150,-8],[148,-8],[146,-8],[144,-8],[142,-8],[140,-6],[138,-6],[136,-6],[134,-6],[132,-4]],
    ]
  },
  // Sri Lanka
  {
    nameKey: "sriLanka",
    polys: [
      [[80,7],[81,8],[82,8],[82,7],[81,6],[80,6],[80,7]],
    ]
  },
  // Madagascar
  {
    nameKey: "madagascar",
    polys: [
      [[44,-12],[46,-14],[48,-16],[50,-18],[50,-22],[48,-24],[46,-26],[44,-26],[44,-22],[44,-18],[44,-14],[44,-12]],
    ]
  },
  // New Zealand
  {
    nameKey: "newZealand",
    polys: [
      // North Island
      [[174,-36],[176,-38],[178,-40],[176,-42],[174,-42],[172,-40],[174,-38],[174,-36]],
      // South Island
      [[168,-44],[170,-44],[172,-44],[174,-44],[172,-46],[170,-46],[168,-46],[168,-44]],
    ]
  },
  // Greenland
  {
    nameKey: "greenland",
    polys: [
      [[-55,60],[-50,62],[-45,64],[-42,66],[-38,68],[-32,70],[-28,72],[-22,74],[-18,76],[-20,78],[-24,80],[-30,82],[-38,84],[-44,82],[-50,80],[-54,78],[-56,74],[-58,70],[-56,66],[-55,60]],
    ]
  },
];

interface ClusteredPin {
  x: number;
  y: number;
  lat: number;
  lng: number;
  locationName: string;
  mems: { mem: Mem; roomId: string; wingId: string }[];
  accent: string;
}

export default function MemoryMap({ userMems, onClose, onNavigate, onNavigateLibrary, onNavigateToMemory }: MemoryMapProps) {
  const isMobile = useIsMobile();
  const { t, locale } = useTranslation("memoryMap");
  const { t: tc } = useTranslation("common");
  const { t: tw } = useTranslation("wings");
  const { containerRef: focusTrapRef, handleKeyDown } = useFocusTrap(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPin, setHoveredPin] = useState<ClusteredPin | null>(null);
  const [selectedPin, setSelectedPin] = useState<ClusteredPin | null>(null);
  const [filterWing, setFilterWing] = useState<string | null>(null);
  const [mapSize, setMapSize] = useState({ w: 900, h: 500 });

  // Fetch memories for all rooms on mount so the map shows all pins
  const fetchRoomMemories = useMemoryStore((s) => s.fetchRoomMemories);
  const getWingRooms = useRoomStore((s) => s.getWingRooms);
  useEffect(() => {
    const allRoomIds = new Set<string>();
    for (const wing of WINGS) {
      for (const room of getWingRooms(wing.id)) {
        allRoomIds.add(room.id);
      }
    }
    // Also include rooms already in userMems (e.g. custom rooms)
    for (const roomId of Object.keys(userMems)) {
      allRoomIds.add(roomId);
    }
    for (const roomId of allRoomIds) {
      fetchRoomMemories(roomId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Collect all memories with location data
  const allLocMems: { mem: Mem; roomId: string; wingId: string }[] = [];
  const allSources = { ...ROOM_MEMS, ...userMems };
  for (const [roomId, mems] of Object.entries(allSources)) {
    for (const mem of mems) {
      if (mem.lat !== undefined && mem.lng !== undefined) {
        const wingId = wingFromRoom(roomId);
        if (!filterWing || filterWing === wingId) {
          allLocMems.push({ mem, roomId, wingId });
        }
      }
    }
  }

  // Cluster nearby pins
  const clusters: ClusteredPin[] = [];
  const CLUSTER_DIST = 25; // pixels
  for (const item of allLocMems) {
    const { x, y } = latLngToXY(item.mem.lat!, item.mem.lng!, mapSize.w, mapSize.h);
    let foundCluster = false;
    for (const c of clusters) {
      const dx = c.x - x, dy = c.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < CLUSTER_DIST) {
        c.mems.push(item);
        foundCluster = true;
        break;
      }
    }
    if (!foundCluster) {
      const wing = WINGS.find(w => w.id === item.wingId);
      clusters.push({
        x, y,
        lat: item.mem.lat!,
        lng: item.mem.lng!,
        locationName: item.mem.locationName || `${item.mem.lat!.toFixed(1)}, ${item.mem.lng!.toFixed(1)}`,
        mems: [item],
        accent: wing?.accent || T.color.terracotta,
      });
    }
  }

  const uniqueLocations = new Set(allLocMems.map(m => m.mem.locationName || `${m.mem.lat},${m.mem.lng}`)).size;

  // Always show full world view — no zoom transform
  const viewportTransform = undefined;

  // Draw canvas map
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Ocean — muted blue-grey
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
    oceanGrad.addColorStop(0, "#CFDDEA");
    oceanGrad.addColorStop(0.3, "#C5D3DC");
    oceanGrad.addColorStop(0.7, "#BAC9D5");
    oceanGrad.addColorStop(1, "#B0BFCC");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid lines (latitude / longitude)
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.lineWidth = 0.5;
    for (let lng = -180; lng <= 180; lng += 30) {
      const x = (lng + 180) / 360 * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let lat = -90; lat <= 90; lat += 30) {
      const y = (90 - lat) / 180 * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Equator + prime meridian — slightly more visible
    ctx.strokeStyle = "rgba(0,0,0,0.07)";
    ctx.lineWidth = 0.75;
    const eqY = (90 - 0) / 180 * h;
    ctx.beginPath(); ctx.moveTo(0, eqY); ctx.lineTo(w, eqY); ctx.stroke();
    const pmX = (0 + 180) / 360 * w;
    ctx.beginPath(); ctx.moveTo(pmX, 0); ctx.lineTo(pmX, h); ctx.stroke();

    // Helper: draw a landmass polygon with shadow, fill, and border stroke
    const drawLand = (poly: [number, number][]) => {
      // Build path
      ctx.beginPath();
      for (let i = 0; i < poly.length; i++) {
        const { x, y } = latLngToXY(poly[i][1], poly[i][0], w, h);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Drop shadow
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.12)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Warm sand/cream fill
      const landGrad = ctx.createLinearGradient(0, 0, w, h);
      landGrad.addColorStop(0, "#EDE5D8");
      landGrad.addColorStop(0.4, "#E8DFD0");
      landGrad.addColorStop(1, "#DDD4C4");
      ctx.fillStyle = landGrad;
      ctx.fill();
      ctx.restore();

      // Thin border stroke — country-border style
      ctx.strokeStyle = "rgba(139,115,85,0.35)";
      ctx.lineWidth = 0.75;
      ctx.stroke();
    };

    // Draw continents
    for (const continent of CONTINENTS) {
      for (const poly of continent.polys) {
        drawLand(poly);
      }
    }

    // Draw additional geographic features (islands, etc.)
    for (const feature of GEO_FEATURES) {
      for (const poly of feature.polys) {
        drawLand(poly);
      }
    }

    // Antique parchment texture overlay — subtle noise
    ctx.fillStyle = "rgba(0,0,0,0.015)";
    for (let i = 0; i < 300; i++) {
      const px = Math.random() * w;
      const py = Math.random() * h;
      ctx.fillRect(px, py, 1, 1);
    }
    // Warm vignette at edges for antique feel
    const vigGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    vigGrad.addColorStop(0, "rgba(0,0,0,0)");
    vigGrad.addColorStop(1, "rgba(0,0,0,0.06)");
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

  }, [mapSize.w, mapSize.h]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        const h = Math.floor(e.contentRect.height);
        if (w > 0 && h > 0) setMapSize({ w, h });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => { drawMap(); }, [drawMap]);

  const handlePinHover = (pin: ClusteredPin | null) => setHoveredPin(pin);

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

        {/* Map area */}
        <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: isMobile ? "auto" : "hidden", margin: isMobile ? "0.5rem" : "1rem", borderRadius: "0.75rem", border: `1px solid ${T.color.sandstone}40`, WebkitOverflowScrolling: "touch" }}>
          <div style={{ width: isMobile ? "180%" : "100%", height: "100%", minHeight: isMobile ? "50vh" : undefined, position: "relative", transform: viewportTransform, transformOrigin: "0 0", transition: "transform .5s ease" }}>
          <canvas ref={canvasRef} width={mapSize.w} height={mapSize.h} style={{ width: "100%", height: "100%", display: "block" }} />

          {/* Pins — sizes stay in px since they are map overlay elements */}
          {clusters.map((pin, i) => {
            const pctX = pin.x / mapSize.w * 100;
            const pctY = pin.y / mapSize.h * 100;
            const isHovered = hoveredPin === pin;
            const count = pin.mems.length;
            const size = count > 1 ? "1.375rem" : "0.875rem";
            return (
              <div key={i}
                role="button"
                tabIndex={0}
                aria-label={`${pin.locationName} — ${pin.mems.length} ${pin.mems.length === 1 ? t("memory") : t("memories")}`}
                onMouseEnter={() => handlePinHover(pin)}
                onMouseLeave={() => handlePinHover(null)}
                onClick={() => setSelectedPin(selectedPin === pin ? null : pin)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedPin(selectedPin === pin ? null : pin); } }}
                style={{
                  position: "absolute",
                  left: `${pctX}%`, top: `${pctY}%`,
                  transform: `translate(-50%,-50%) scale(${isHovered ? 1.4 : 1})`,
                  width: size, height: size, borderRadius: "50%",
                  background: pin.accent,
                  border: "2px solid rgba(255,255,255,0.8)",
                  boxShadow: isHovered
                    ? `0 0 20px ${pin.accent}80, 0 4px 12px rgba(0,0,0,0.3)`
                    : `0 2px 8px rgba(0,0,0,0.3)`,
                  cursor: "pointer",
                  transition: "transform .2s, box-shadow .2s",
                  zIndex: isHovered ? 10 : 5,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                {count > 1 && (
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.5625rem", fontWeight: 700,
                    color: "#FFF", lineHeight: 1,
                  }}>{count}</span>
                )}

                {/* Tooltip on hover */}
                {isHovered && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 0.5rem)", left: "50%",
                    transform: "translateX(-50%)", whiteSpace: "nowrap",
                    background: `${T.color.charcoal}f0`, backdropFilter: "blur(8px)",
                    color: "#FFF", padding: "0.5rem 0.875rem", borderRadius: "0.625rem",
                    fontFamily: T.font.body, fontSize: "0.6875rem", lineHeight: 1.5,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    pointerEvents: "none",
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: "0.125rem", display: "flex", alignItems: "center", gap: "0.25rem" }}><MapPinIcon size={14} color="#FFF" /> {pin.locationName}</div>
                    {pin.mems.slice(0, 4).map((m, j) => (
                      <div key={j} style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.625rem" }}>
                        {m.mem.title}
                      </div>
                    ))}
                    {pin.mems.length > 4 && (
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.625rem" }}>{t("more", { count: String(pin.mems.length - 4) })}</div>
                    )}
                    <div style={{
                      position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)",
                      width: 0, height: 0,
                      borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
                      borderTop: `5px solid ${T.color.charcoal}f0`,
                    }} />
                  </div>
                )}
              </div>
            );
          })}
          </div>{/* end viewport transform wrapper */}

          {/* Empty state */}
          {clusters.length === 0 && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)",
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

          {/* Selected pin detail panel */}
          {selectedPin && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: `${T.color.linen}f5`, backdropFilter: "blur(16px)",
              borderTop: `1px solid ${T.color.cream}`,
              boxShadow: "0 -8px 32px rgba(0,0,0,0.2)",
              animation: "fadeUp .25s ease",
              maxHeight: "45%", overflowY: "auto",
              padding: isMobile ? "0.875rem 1rem" : "1rem 1.5rem",
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
                      {m.mem.dataUrl ? (
                        <div style={{
                          width: "3rem", height: "3rem", borderRadius: "0.5rem", overflow: "hidden", flexShrink: 0,
                          background: `${selectedPin.accent}20`, position: "relative",
                        }}>
                          <Image src={m.mem.dataUrl} alt="" fill sizes="48px" style={{ objectFit: "cover" }} />
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
                          {m.mem.createdAt && <span style={{ color: T.color.muted }}> &middot; {new Date(m.mem.createdAt).toLocaleDateString(locale === "nl" ? "nl-NL" : "en-US")}</span>}
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
