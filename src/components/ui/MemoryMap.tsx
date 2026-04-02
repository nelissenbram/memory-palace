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

// Simplified continent polygons for canvas drawing (lng, lat pairs)
const CONTINENTS: { nameKey: string; polys: [number, number][][] }[] = [
  {
    nameKey: "northAmerica",
    polys: [[[-140,60],[-130,68],[-100,72],[-80,72],[-60,50],[-65,44],[-77,25],[-82,10],[-105,18],[-118,33],[-125,48],[-140,60]]]
  },
  {
    nameKey: "southAmerica",
    polys: [[[-82,10],[-77,8],[-60,5],[-35,-5],[-38,-22],[-52,-34],[-68,-55],[-75,-45],[-72,-18],[-80,0],[-82,10]]]
  },
  {
    nameKey: "europe",
    polys: [[[-10,36],[0,38],[5,44],[3,48],[-5,48],[-10,44],[-10,36]],[[3,48],[10,44],[15,38],[20,36],[28,36],[30,40],[28,45],[25,48],[20,55],[10,55],[5,60],[-5,58],[-5,48],[3,48]],[[10,55],[12,58],[18,60],[25,60],[32,62],[35,68],[30,72],[20,72],[10,70],[5,60],[10,55]]]
  },
  {
    nameKey: "africa",
    polys: [[[-18,15],[-15,28],[0,36],[10,37],[20,33],[33,30],[40,20],[42,12],[50,12],[50,2],[42,-5],[40,-15],[35,-25],[30,-34],[22,-35],[18,-30],[15,-25],[12,-18],[10,-2],[5,5],[0,6],[-8,5],[-18,15]]]
  },
  {
    nameKey: "asia",
    polys: [[[28,36],[35,32],[40,20],[42,12],[50,12],[55,15],[60,22],[68,24],[72,20],[78,8],[80,12],[88,22],[90,22],[98,16],[100,2],[105,0],[110,2],[115,5],[120,15],[122,18],[125,28],[128,35],[130,42],[132,35],[138,35],[140,40],[145,45],[150,60],[165,65],[170,68],[180,68],[180,72],[130,72],[115,68],[100,62],[80,55],[60,55],[50,52],[42,42],[35,40],[28,36]]]
  },
  {
    nameKey: "australia",
    polys: [[[115,-14],[120,-14],[130,-12],[138,-12],[145,-15],[150,-22],[153,-28],[150,-34],[145,-38],[138,-38],[132,-35],[128,-32],[122,-34],[115,-34],[114,-26],[113,-22],[115,-14]]]
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

export default function MemoryMap({ userMems, onClose, onNavigate }: MemoryMapProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("memoryMap");
  const { containerRef: focusTrapRef, handleKeyDown } = useFocusTrap(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPin, setHoveredPin] = useState<ClusteredPin | null>(null);
  const [selectedPin, setSelectedPin] = useState<ClusteredPin | null>(null);
  const [filterWing, setFilterWing] = useState<string | null>(null);
  const [mapSize, setMapSize] = useState({ w: 900, h: 500 });

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

  // Draw canvas map
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Ocean — antique parchment-style
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
    oceanGrad.addColorStop(0, "#3a4a5c");
    oceanGrad.addColorStop(0.5, "#2d3d4e");
    oceanGrad.addColorStop(1, "#243040");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let lng = -180; lng <= 180; lng += 30) {
      const x = (lng + 180) / 360 * w;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let lat = -90; lat <= 90; lat += 30) {
      const y = (90 - lat) / 180 * h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Equator + prime meridian
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    const eqY = (90 - 0) / 180 * h;
    ctx.beginPath(); ctx.moveTo(0, eqY); ctx.lineTo(w, eqY); ctx.stroke();
    const pmX = (0 + 180) / 360 * w;
    ctx.beginPath(); ctx.moveTo(pmX, 0); ctx.lineTo(pmX, h); ctx.stroke();

    // Continents
    for (const continent of CONTINENTS) {
      for (const poly of continent.polys) {
        ctx.beginPath();
        for (let i = 0; i < poly.length; i++) {
          const { x, y } = latLngToXY(poly[i][1], poly[i][0], w, h);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();

        // Parchment-style land
        const landGrad = ctx.createLinearGradient(0, 0, w, h);
        landGrad.addColorStop(0, "#c4b396");
        landGrad.addColorStop(0.5, "#b8a580");
        landGrad.addColorStop(1, "#a89670");
        ctx.fillStyle = landGrad;
        ctx.fill();

        ctx.strokeStyle = "rgba(139,115,85,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Parchment texture overlay
    ctx.fillStyle = "rgba(0,0,0,0.03)";
    for (let i = 0; i < 200; i++) {
      const px = Math.random() * w;
      const py = Math.random() * h;
      ctx.fillRect(px, py, 1, 1);
    }

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
    <div onClick={onClose} style={{
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
          <button onClick={onClose} style={{
            width: "2.25rem", height: "2.25rem", borderRadius: "1.125rem",
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
            style={{
              padding: "0.375rem 0.875rem", borderRadius: "0.5rem", border: `1px solid ${!filterWing ? T.color.walnut : T.color.cream}`,
              background: !filterWing ? `${T.color.walnut}15` : T.color.white,
              fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: !filterWing ? 600 : 400,
              color: !filterWing ? T.color.walnut : T.color.muted, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >{t("allWings")}</button>
          {WINGS.map(w => (
            <button key={w.id} onClick={() => setFilterWing(w.id)} style={{
              padding: "0.375rem 0.875rem", borderRadius: "0.5rem",
              border: `1px solid ${filterWing === w.id ? w.accent : T.color.cream}`,
              background: filterWing === w.id ? `${w.accent}15` : T.color.white,
              fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: filterWing === w.id ? 600 : 400,
              color: filterWing === w.id ? w.accent : T.color.muted, cursor: "pointer",
              whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.25rem",
            }}>
              <WingIcon wingId={w.id} size={13} color={filterWing === w.id ? w.accent : T.color.muted} /> {w.name}
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
              onClick={() => { onClose(); window.location.href = "/"; }}
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
        <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden", margin: "1rem", borderRadius: "0.75rem", border: `1px solid ${T.color.sandstone}40` }}>
          <canvas ref={canvasRef} width={mapSize.w} height={mapSize.h} style={{ width: "100%", height: "100%", display: "block" }} />

          {/* Pins — sizes stay in px since they are map overlay elements */}
          {clusters.map((pin, i) => {
            const pctX = pin.x / mapSize.w * 100;
            const pctY = pin.y / mapSize.h * 100;
            const isHovered = hoveredPin === pin;
            const count = pin.mems.length;
            const size = count > 1 ? 22 : 14;
            return (
              <div key={i}
                onMouseEnter={() => handlePinHover(pin)}
                onMouseLeave={() => handlePinHover(null)}
                onClick={() => setSelectedPin(selectedPin === pin ? null : pin)}
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
                <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", margin: 0 }}>
                  {t("noLocationsDesc")}
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
                  width: "1.75rem", height: "1.75rem", borderRadius: "0.875rem", border: `1px solid ${T.color.cream}`,
                  background: T.color.warmStone, color: T.color.muted, fontSize: "0.75rem",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>{"\u2715"}</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {selectedPin.mems.map((m, j) => {
                  const wing = WINGS.find(w => w.id === m.wingId);
                  return (
                    <button key={j}
                      onClick={() => { if (onNavigate) onNavigate(m.roomId); }}
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
                          {wing && <WingIcon wingId={wing.id} size={12} color={wing.accent} />} {wing?.name}
                          {m.mem.createdAt && <span style={{ color: T.color.muted }}> &middot; {new Date(m.mem.createdAt).toLocaleDateString()}</span>}
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
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: w.accent, border: "1px solid rgba(0,0,0,0.1)" }} />
              <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.walnut }}>{w.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
