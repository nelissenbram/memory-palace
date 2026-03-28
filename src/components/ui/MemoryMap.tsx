"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { WINGS } from "@/lib/constants/wings";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";

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
const CONTINENTS: { name: string; polys: [number, number][][] }[] = [
  {
    name: "North America",
    polys: [[[-140,60],[-130,68],[-100,72],[-80,72],[-60,50],[-65,44],[-77,25],[-82,10],[-105,18],[-118,33],[-125,48],[-140,60]]]
  },
  {
    name: "South America",
    polys: [[[-82,10],[-77,8],[-60,5],[-35,-5],[-38,-22],[-52,-34],[-68,-55],[-75,-45],[-72,-18],[-80,0],[-82,10]]]
  },
  {
    name: "Europe",
    polys: [[[-10,36],[0,38],[5,44],[3,48],[-5,48],[-10,44],[-10,36]],[[3,48],[10,44],[15,38],[20,36],[28,36],[30,40],[28,45],[25,48],[20,55],[10,55],[5,60],[-5,58],[-5,48],[3,48]],[[10,55],[12,58],[18,60],[25,60],[32,62],[35,68],[30,72],[20,72],[10,70],[5,60],[10,55]]]
  },
  {
    name: "Africa",
    polys: [[[-18,15],[-15,28],[0,36],[10,37],[20,33],[33,30],[40,20],[42,12],[50,12],[50,2],[42,-5],[40,-15],[35,-25],[30,-34],[22,-35],[18,-30],[15,-25],[12,-18],[10,-2],[5,5],[0,6],[-8,5],[-18,15]]]
  },
  {
    name: "Asia",
    polys: [[[28,36],[35,32],[40,20],[42,12],[50,12],[55,15],[60,22],[68,24],[72,20],[78,8],[80,12],[88,22],[90,22],[98,16],[100,2],[105,0],[110,2],[115,5],[120,15],[122,18],[125,28],[128,35],[130,42],[132,35],[138,35],[140,40],[145,45],[150,60],[165,65],[170,68],[180,68],[180,72],[130,72],[115,68],[100,62],[80,55],[60,55],[50,52],[42,42],[35,40],[28,36]]]
  },
  {
    name: "Australia",
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
      <div onClick={e => e.stopPropagation()} style={{
        width: isMobile ? "100%" : "min(1100px, 94vw)",
        height: isMobile ? "100%" : "min(700px, 88vh)",
        background: `linear-gradient(145deg, ${T.color.linen}, ${T.color.warmStone})`,
        borderRadius: isMobile ? 0 : 20, overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)",
        animation: "fadeUp .35s cubic-bezier(.23,1,.32,1)",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: `1px solid ${T.color.cream}`, flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontFamily: T.font.display, fontSize: 24, fontWeight: 500, color: T.color.charcoal, margin: 0 }}>
              {"\uD83C\uDF0D"} {t("title")}
            </h2>
            <p style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.muted, margin: "4px 0 0" }}>
              {t("memoriesAcross", { memCount: String(allLocMems.length), locCount: String(uniqueLocations) })}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: 18,
            border: `1px solid ${T.color.cream}`, background: T.color.warmStone,
            color: T.color.muted, fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{"\u2715"}</button>
        </div>

        {/* Wing filter tabs */}
        <div style={{
          padding: "10px 24px", display: "flex", gap: 6, flexShrink: 0,
          borderBottom: `1px solid ${T.color.cream}`, overflowX: "auto",
        }}>
          <button
            onClick={() => setFilterWing(null)}
            style={{
              padding: "6px 14px", borderRadius: 8, border: `1px solid ${!filterWing ? T.color.walnut : T.color.cream}`,
              background: !filterWing ? `${T.color.walnut}15` : T.color.white,
              fontFamily: T.font.body, fontSize: 11, fontWeight: !filterWing ? 600 : 400,
              color: !filterWing ? T.color.walnut : T.color.muted, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >{t("allWings")}</button>
          {WINGS.map(w => (
            <button key={w.id} onClick={() => setFilterWing(w.id)} style={{
              padding: "6px 14px", borderRadius: 8,
              border: `1px solid ${filterWing === w.id ? w.accent : T.color.cream}`,
              background: filterWing === w.id ? `${w.accent}15` : T.color.white,
              fontFamily: T.font.body, fontSize: 11, fontWeight: filterWing === w.id ? 600 : 400,
              color: filterWing === w.id ? w.accent : T.color.muted, cursor: "pointer",
              whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ fontSize: 13 }}>{w.icon}</span> {w.name}
            </button>
          ))}
        </div>

        {/* Map area */}
        <div ref={containerRef} style={{ flex: 1, position: "relative", overflow: "hidden", margin: 16, borderRadius: 12, border: `1px solid ${T.color.sandstone}40` }}>
          <canvas ref={canvasRef} width={mapSize.w} height={mapSize.h} style={{ width: "100%", height: "100%", display: "block" }} />

          {/* Pins */}
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
                    fontFamily: T.font.body, fontSize: 9, fontWeight: 700,
                    color: "#FFF", lineHeight: 1,
                  }}>{count}</span>
                )}

                {/* Tooltip on hover */}
                {isHovered && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
                    transform: "translateX(-50%)", whiteSpace: "nowrap",
                    background: `${T.color.charcoal}f0`, backdropFilter: "blur(8px)",
                    color: "#FFF", padding: "8px 14px", borderRadius: 10,
                    fontFamily: T.font.body, fontSize: 11, lineHeight: 1.5,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    pointerEvents: "none",
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{"\uD83D\uDCCD"} {pin.locationName}</div>
                    {pin.mems.slice(0, 4).map((m, j) => (
                      <div key={j} style={{ color: "rgba(255,255,255,0.75)", fontSize: 10 }}>
                        {m.mem.title}
                      </div>
                    ))}
                    {pin.mems.length > 4 && (
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>{t("more", { count: String(pin.mems.length - 4) })}</div>
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
                padding: "24px 36px", borderRadius: 16, textAlign: "center",
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{"\uD83C\uDF10"}</div>
                <p style={{ fontFamily: T.font.display, fontSize: 18, color: "#FFF", margin: "0 0 4px" }}>{t("noLocations")}</p>
                <p style={{ fontFamily: T.font.body, fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>
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
              padding: isMobile ? "14px 16px" : "16px 24px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontFamily: T.font.display, fontSize: 18, fontWeight: 600, color: T.color.charcoal, margin: 0 }}>
                    {"\uD83D\uDCCD"} {selectedPin.locationName}
                  </h3>
                  <p style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.muted, margin: "2px 0 0" }}>
                    {selectedPin.mems.length} {selectedPin.mems.length === 1 ? t("memory") : t("memories")}
                  </p>
                </div>
                <button onClick={() => setSelectedPin(null)} style={{
                  width: 28, height: 28, borderRadius: 14, border: `1px solid ${T.color.cream}`,
                  background: T.color.warmStone, color: T.color.muted, fontSize: 12,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>{"\u2715"}</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedPin.mems.map((m, j) => {
                  const wing = WINGS.find(w => w.id === m.wingId);
                  return (
                    <button key={j}
                      onClick={() => { if (onNavigate) onNavigate(m.roomId); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 14px", borderRadius: 12,
                        border: `1px solid ${T.color.cream}`, background: `${T.color.white}dd`,
                        cursor: "pointer", textAlign: "left", width: "100%",
                        transition: "background .15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${selectedPin.accent}12`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = `${T.color.white}dd`; }}
                    >
                      {m.mem.dataUrl ? (
                        <div style={{
                          width: 48, height: 48, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                          background: `${selectedPin.accent}20`,
                        }}>
                          <img src={m.mem.dataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ) : (
                        <div style={{
                          width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                          background: `linear-gradient(135deg, ${selectedPin.accent}30, ${selectedPin.accent}10)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 20,
                        }}>{m.mem.type === "photo" ? "\uD83D\uDCF7" : m.mem.type === "voice" ? "\uD83C\uDF99\uFE0F" : "\uD83D\uDCDD"}</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: T.font.display, fontSize: 14, fontWeight: 500, color: T.color.charcoal,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{m.mem.title}</div>
                        {m.mem.desc && (
                          <div style={{
                            fontFamily: T.font.body, fontSize: 12, color: T.color.muted,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2,
                          }}>{m.mem.desc}</div>
                        )}
                        <div style={{
                          fontFamily: T.font.body, fontSize: 10, color: wing?.accent || T.color.muted,
                          marginTop: 3, display: "flex", alignItems: "center", gap: 4,
                        }}>
                          <span>{wing?.icon}</span> {wing?.name}
                          {m.mem.createdAt && <span style={{ color: T.color.muted }}> &middot; {new Date(m.mem.createdAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <span style={{ color: T.color.muted, fontSize: 12, flexShrink: 0 }}>{"\u2192"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{
          padding: "10px 24px 16px", display: "flex", gap: 16, flexShrink: 0,
          borderTop: `1px solid ${T.color.cream}`, alignItems: "center", flexWrap: "wrap",
        }}>
          <span style={{ fontFamily: T.font.body, fontSize: 10, color: T.color.muted, textTransform: "uppercase", letterSpacing: ".5px" }}>{t("legend")}</span>
          {WINGS.map(w => (
            <div key={w.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: w.accent, border: "1px solid rgba(0,0,0,0.1)" }} />
              <span style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.walnut }}>{w.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
