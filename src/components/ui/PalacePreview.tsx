"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";

interface PalacePreviewProps {
  wings: { id: string; name: string; icon: string; accent: string; memoryCount: number }[];
  totalRooms: number;
  onEnterPalace: () => void;
  onSelectWing: (wingId: string) => void;
  isMobile: boolean;
  hour?: number;
}

/* ── time-of-day palette ────────────────────────────── */
function skyGradient(hour: number): string {
  if (hour >= 6 && hour < 12)
    return `linear-gradient(180deg, #E8C97A 0%, ${T.era.roman.primary} 60%, ${T.color.warmStone} 100%)`;
  if (hour >= 12 && hour < 18)
    return `linear-gradient(180deg, #F5DFA0 0%, ${T.era.roman.primary} 50%, ${T.color.warmStone} 100%)`;
  if (hour >= 18 && hour < 22)
    return `linear-gradient(180deg, #9B4D3A 0%, #C17F59 30%, ${T.era.roman.primary} 70%, ${T.color.warmStone} 100%)`;
  return `linear-gradient(180deg, #1E1E20 0%, #2C2C2A 40%, #3A362E 80%, ${T.color.walnut} 100%)`;
}

function windowGlow(hour: number): string {
  if (hour >= 22 || hour < 6) return "rgba(212,175,55,0.7)";
  if (hour >= 18) return "rgba(212,175,55,0.35)";
  return "rgba(212,175,55,0.12)";
}

function isNight(hour: number): boolean {
  return hour >= 22 || hour < 6;
}

/* ── particle positions (deterministic) ────────────── */
const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  left: `${8 + (i * 9.1) % 84}%`,
  bottom: `${10 + (i * 13.7) % 60}%`,
  size: 0.15 + (i % 4) * 0.08,
  delay: i * 0.7,
  duration: 4 + (i % 3) * 2,
}));

/* ── wing placement along the facade ───────────────── */
function wingPositions(count: number): { left: string; top: string }[] {
  if (count === 0) return [];
  const positions: { left: string; top: string }[] = [];
  const halfFacade = 40; // percent from center
  for (let i = 0; i < count; i++) {
    const ratio = count === 1 ? 0 : (i / (count - 1)) * 2 - 1; // -1..1
    const left = 50 + ratio * halfFacade;
    const top = 52 + Math.abs(ratio) * 8; // wings droop slightly outward
    positions.push({ left: `${left}%`, top: `${top}%` });
  }
  return positions;
}

export default function PalacePreview({
  wings,
  totalRooms,
  onEnterPalace,
  onSelectWing,
  isMobile,
  hour,
}: PalacePreviewProps) {
  const { t } = useTranslation("atrium");

  const currentHour = hour ?? new Date().getHours();
  const night = isNight(currentHour);
  const wGlow = windowGlow(currentHour);
  const sky = skyGradient(currentHour);

  /* parallax */
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouse = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isMobile) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = (e.clientX - rect.left) / rect.width - 0.5;
      const cy = (e.clientY - rect.top) / rect.height - 0.5;
      setOffset({ x: cx * 6, y: cy * 4 });
    },
    [isMobile],
  );

  const handleLeave = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  /* hover state for overlay */
  const [hovered, setHovered] = useState(false);
  const showOverlay = isMobile || hovered;

  /* tooltip */
  const [activeWing, setActiveWing] = useState<string | null>(null);

  const wPos = useMemo(() => wingPositions(wings.length), [wings.length]);

  return (
    <>
      <style>{`
        @keyframes ppFloat {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.55; }
          50%      { transform: translateY(-1.25rem) scale(1.15); opacity: 0.9; }
        }
        @keyframes ppWindowPulse {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        @keyframes ppFadeUp {
          from { opacity: 0; transform: translateY(0.75rem); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ppDotPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0.375rem currentColor; }
          50%      { transform: scale(1.35); box-shadow: 0 0 0.75rem currentColor; }
        }
        @keyframes ppShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      <div
        ref={containerRef}
        onMouseMove={handleMouse}
        onMouseLeave={() => { handleLeave(); setHovered(false); }}
        onMouseEnter={() => setHovered(true)}
        style={{
          position: "relative",
          width: "100%",
          minWidth: "17.5rem",
          aspectRatio: isMobile ? "16 / 9" : "2 / 1",
          borderRadius: "1rem",
          overflow: "hidden",
          background: sky,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={onEnterPalace}
        role="button"
        tabIndex={0}
        aria-label={t("enterPalace")}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEnterPalace(); }}
      >
        {/* ── parallax wrapper ─────────────────────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transition: "transform 0.3s ease-out",
            transform: `translate(${offset.x}px, ${offset.y}px)`,
          }}
        >
          {/* ── ground plane ───────────────────────── */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "30%",
              background: `linear-gradient(180deg, ${T.era.roman.primary}88 0%, ${T.color.sandstone} 100%)`,
            }}
          />

          {/* ── palace facade ──────────────────────── */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "18%",
              transform: "translateX(-50%)",
              width: isMobile ? "85%" : "72%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* pediment (triangle) */}
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: isMobile ? "4rem solid transparent" : "6rem solid transparent",
                borderRight: isMobile ? "4rem solid transparent" : "6rem solid transparent",
                borderBottom: `${isMobile ? "2.5rem" : "3.5rem"} solid ${T.era.roman.primary}`,
                filter: "drop-shadow(0 -0.25rem 0.5rem rgba(0,0,0,0.1))",
                position: "relative",
                zIndex: 2,
              }}
            />

            {/* main body */}
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                position: "relative",
              }}
            >
              {/* left wing */}
              <div
                style={{
                  flex: "1 1 0",
                  height: isMobile ? "3.5rem" : "5.5rem",
                  background: `linear-gradient(135deg, ${T.era.roman.accent} 0%, ${T.era.roman.primary} 100%)`,
                  borderRadius: "0.25rem 0 0 0",
                  position: "relative",
                  boxShadow: "inset 0 0.125rem 0.5rem rgba(255,255,255,0.08)",
                }}
              >
                {/* left wing windows */}
                {[0.25, 0.55, 0.8].map((pos, i) => (
                  <div
                    key={`lw-${i}`}
                    style={{
                      position: "absolute",
                      left: `${pos * 100}%`,
                      top: "25%",
                      width: isMobile ? "0.5rem" : "0.75rem",
                      height: isMobile ? "0.9rem" : "1.35rem",
                      background: wGlow,
                      borderRadius: "0.125rem 0.125rem 0 0",
                      animation: `ppWindowPulse ${3 + i * 0.8}s ease-in-out infinite`,
                      animationDelay: `${i * 0.4}s`,
                    }}
                  />
                ))}
              </div>

              {/* center block with columns */}
              <div
                style={{
                  width: isMobile ? "5rem" : "8rem",
                  height: isMobile ? "5rem" : "8rem",
                  background: `linear-gradient(180deg, ${T.era.roman.marble} 0%, ${T.era.roman.primary} 100%)`,
                  position: "relative",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: `0 -0.25rem 1rem rgba(0,0,0,0.12)`,
                }}
              >
                {/* columns */}
                {[-1, 1].map((side) => (
                  <div
                    key={`col-${side}`}
                    style={{
                      position: "absolute",
                      [side < 0 ? "left" : "right"]: isMobile ? "0.35rem" : "0.65rem",
                      bottom: 0,
                      width: isMobile ? "0.45rem" : "0.7rem",
                      height: isMobile ? "4rem" : "6.5rem",
                      background: `linear-gradient(90deg, ${T.era.roman.marble}CC 0%, ${T.color.warmStone} 50%, ${T.era.roman.marble}CC 100%)`,
                      borderRadius: "0.2rem",
                      zIndex: 3,
                    }}
                  >
                    {/* column cap */}
                    <div
                      style={{
                        position: "absolute",
                        top: "-0.3rem",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: isMobile ? "0.7rem" : "1.1rem",
                        height: isMobile ? "0.35rem" : "0.5rem",
                        background: T.era.roman.marble,
                        borderRadius: "0.15rem",
                      }}
                    />
                    {/* column base */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: isMobile ? "0.65rem" : "1rem",
                        height: isMobile ? "0.25rem" : "0.35rem",
                        background: T.era.roman.accent,
                        borderRadius: "0.1rem",
                      }}
                    />
                  </div>
                ))}

                {/* entrance door */}
                <div
                  style={{
                    width: isMobile ? "1.6rem" : "2.5rem",
                    height: isMobile ? "2.5rem" : "4rem",
                    background: `linear-gradient(180deg, ${T.color.walnut} 0%, ${T.color.charcoal} 100%)`,
                    borderRadius: `${isMobile ? "0.8rem" : "1.25rem"} ${isMobile ? "0.8rem" : "1.25rem"} 0 0`,
                    position: "relative",
                    zIndex: 2,
                    boxShadow: `inset 0 0 1rem ${wGlow}`,
                  }}
                >
                  {/* door glow */}
                  <div
                    style={{
                      position: "absolute",
                      inset: "15%",
                      background: `radial-gradient(ellipse at center, ${wGlow} 0%, transparent 70%)`,
                      animation: "ppWindowPulse 4s ease-in-out infinite",
                    }}
                  />
                </div>

                {/* center upper window */}
                <div
                  style={{
                    position: "absolute",
                    top: isMobile ? "0.5rem" : "0.75rem",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: isMobile ? "1rem" : "1.5rem",
                    height: isMobile ? "0.75rem" : "1.1rem",
                    borderRadius: `${isMobile ? "0.5rem" : "0.75rem"} ${isMobile ? "0.5rem" : "0.75rem"} 0 0`,
                    background: wGlow,
                    animation: "ppWindowPulse 5s ease-in-out infinite",
                    animationDelay: "1s",
                  }}
                />
              </div>

              {/* right wing */}
              <div
                style={{
                  flex: "1 1 0",
                  height: isMobile ? "3.5rem" : "5.5rem",
                  background: `linear-gradient(225deg, ${T.era.roman.accent} 0%, ${T.era.roman.primary} 100%)`,
                  borderRadius: "0 0.25rem 0 0",
                  position: "relative",
                  boxShadow: "inset 0 0.125rem 0.5rem rgba(255,255,255,0.08)",
                }}
              >
                {/* right wing windows */}
                {[0.2, 0.45, 0.75].map((pos, i) => (
                  <div
                    key={`rw-${i}`}
                    style={{
                      position: "absolute",
                      left: `${pos * 100}%`,
                      top: "25%",
                      width: isMobile ? "0.5rem" : "0.75rem",
                      height: isMobile ? "0.9rem" : "1.35rem",
                      background: wGlow,
                      borderRadius: "0.125rem 0.125rem 0 0",
                      animation: `ppWindowPulse ${3.2 + i * 0.6}s ease-in-out infinite`,
                      animationDelay: `${i * 0.5 + 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* foundation line */}
            <div
              style={{
                width: "104%",
                height: isMobile ? "0.35rem" : "0.5rem",
                background: T.era.roman.accent,
                borderRadius: "0.1rem",
              }}
            />
          </div>

          {/* ── floating particles ──────────────────── */}
          {PARTICLES.map((p, i) => (
            <div
              key={`p-${i}`}
              style={{
                position: "absolute",
                left: p.left,
                bottom: p.bottom,
                width: `${p.size}rem`,
                height: `${p.size}rem`,
                borderRadius: "50%",
                background: night
                  ? `radial-gradient(circle, ${T.color.gold} 30%, transparent 100%)`
                  : `radial-gradient(circle, ${T.color.goldLight}AA 30%, transparent 100%)`,
                animation: `ppFloat ${p.duration}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`,
                pointerEvents: "none",
              }}
            />
          ))}

          {/* ── wing indicator dots ─────────────────── */}
          {wings.map((wing, i) => {
            const pos = wPos[i];
            if (!pos) return null;
            return (
              <div
                key={wing.id}
                style={{
                  position: "absolute",
                  left: pos.left,
                  top: pos.top,
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                  /* Transparent hit area for WCAG 44px minimum touch target */
                  minWidth: "2.75rem",
                  minHeight: "2.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => { e.stopPropagation(); setActiveWing(wing.id); }}
                onMouseLeave={() => setActiveWing(null)}
                onClick={(e) => { e.stopPropagation(); onSelectWing(wing.id); }}
              >
                {/* dot */}
                <div
                  style={{
                    width: isMobile ? "0.65rem" : "0.85rem",
                    height: isMobile ? "0.65rem" : "0.85rem",
                    borderRadius: "50%",
                    background: wing.accent,
                    color: wing.accent,
                    animation: "ppDotPulse 2.5s ease-in-out infinite",
                    animationDelay: `${i * 0.4}s`,
                    cursor: "pointer",
                    border: `0.125rem solid ${T.color.white}88`,
                  }}
                />

                {/* tooltip */}
                {activeWing === wing.id && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 0.5rem)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: `${T.color.charcoal}E8`,
                      backdropFilter: "blur(0.5rem)",
                      WebkitBackdropFilter: "blur(0.5rem)",
                      color: T.color.linen,
                      padding: "0.35rem 0.65rem",
                      borderRadius: "0.4rem",
                      whiteSpace: "nowrap",
                      fontSize: "0.75rem",
                      fontFamily: T.font.body,
                      animation: "ppFadeUp 0.2s ease-out",
                      pointerEvents: "none",
                      zIndex: 20,
                      boxShadow: "0 0.25rem 0.75rem rgba(0,0,0,0.3)",
                    }}
                  >
                    <span style={{ marginRight: "0.35rem" }}>{wing.icon}</span>
                    <strong>{wing.name}</strong>
                    <span style={{ marginLeft: "0.35rem", opacity: 0.7 }}>
                      {wing.memoryCount} {t("memories")}
                    </span>
                    {/* caret */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-0.25rem",
                        left: "50%",
                        transform: "translateX(-50%) rotate(45deg)",
                        width: "0.5rem",
                        height: "0.5rem",
                        background: `${T.color.charcoal}E8`,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── "Enter Palace" frosted overlay ────────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: showOverlay
              ? `linear-gradient(180deg, transparent 20%, ${T.color.charcoal}b3 80%, ${T.color.charcoal}cc 100%)`
              : "transparent",
            transition: "background 0.4s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: isMobile ? "1rem" : "1.5rem",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              opacity: showOverlay ? 1 : 0,
              transform: showOverlay ? "translateY(0)" : "translateY(0.5rem)",
              transition: "opacity 0.35s ease, transform 0.35s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span
              style={{
                fontFamily: T.font.display,
                fontSize: isMobile ? "1.15rem" : "1.5rem",
                color: T.color.linen,
                letterSpacing: "0.04em",
                textShadow: "0 0.125rem 0.5rem rgba(0,0,0,0.5)",
                background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.linen}, ${T.color.gold})`,
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "ppShimmer 4s linear infinite",
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
              }}
            >
              {t("enterPalace")}
            </span>
            <span
              style={{
                fontFamily: T.font.body,
                fontSize: isMobile ? "0.7rem" : "0.8rem",
                color: `${T.color.cream}DD`,
                textShadow: "0 0.0625rem 0.25rem rgba(0,0,0,0.6)",
              }}
            >
              {totalRooms} {t("rooms")} &middot; {wings.length} {t("wings")}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
