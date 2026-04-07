"use client";
import { useState, useMemo, useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useRoomStore } from "@/lib/stores/roomStore";
import type { Wing } from "@/lib/constants/wings";
import TuscanCard from "./TuscanCard";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { WingIcon, RoomIcon } from "./WingRoomIcons";

interface LibrarySidebarProps {
  wings: Wing[];
  selectedWing: string;
  onSelectWing: (wingId: string) => void;
  wingMemCount: (wingId: string) => number;
  onEnter3D: () => void;
  isMobile: boolean;
  onGoAtrium?: () => void;
  onAddWing?: () => void;
  onAddRoom?: () => void;
  selectedWingName?: string;
  selectedRoomName?: string;
  sharedCount?: number;
  onSharedClick?: () => void;
}

const PLAN_LIMIT = 500;

const PROGRESS_BASELINE = 20;
const EASE_OUT_EXPO = "cubic-bezier(0.22, 1, 0.36, 1)";

const WING_COLOR_SWATCHES = ["#C17F59", "#D4AF37", "#4A6741", "#6B8EAD", "#A0527E", "#8B7355", "#C05050", "#2C2C2A"];

export default function LibrarySidebar({
  wings,
  selectedWing,
  onSelectWing,
  wingMemCount,
  onEnter3D,
  isMobile,
  onGoAtrium,
  onAddWing,
  onAddRoom,
  selectedWingName,
  selectedRoomName,
  sharedCount,
  onSharedClick,
}: LibrarySidebarProps) {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { getWingRooms } = useRoomStore();

  const [hoveredWing, setHoveredWing] = useState<string | null>(null);
  const [enterHovered, setEnterHovered] = useState(false);
  const [atriumHovered, setAtriumHovered] = useState(false);
  const [addWingHovered, setAddWingHovered] = useState(false);
  const [addRoomHovered, setAddRoomHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [colorPickerWing, setColorPickerWing] = useState<string | null>(null);
  const [wingColors, setWingColors] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("mp_wing_colors") || "{}"); } catch { return {}; }
    }
    return {};
  });

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const totalMemories = useMemo(
    () => wings.reduce((sum, w) => sum + wingMemCount(w.id), 0),
    [wings, wingMemCount],
  );

  // Show all wings, but keep attic at the bottom; filter by sidebar search
  const visibleWings = useMemo(() => {
    const regular = wings.filter((w) => w.id !== "attic");
    const attic = wings.filter((w) => w.id === "attic");
    const all = [...regular, ...attic];
    if (!sidebarQuery) return all;
    const sq = sidebarQuery.toLowerCase();
    return all.filter(w => {
      if (w.name.toLowerCase().includes(sq)) return true;
      // Also match room names within the wing
      return getWingRooms(w.id).some(r => r.name.toLowerCase().includes(sq));
    });
  }, [wings, sidebarQuery, getWingRooms]);

  const totalRooms = useMemo(
    () => wings.reduce((sum, w) => sum + getWingRooms(w.id).length, 0),
    [wings, getWingRooms],
  );

  // ── Shared keyframe styles ──
  const keyframes = `
    @keyframes lsb-shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes lsb-divider-reveal {
      0% { width: 0%; opacity: 0; }
      100% { width: 100%; opacity: 1; }
    }
    @keyframes lsb-wing-enter {
      0% { opacity: 0; transform: translateX(-0.75rem); }
      100% { opacity: 1; transform: translateX(0); }
    }
    @keyframes lsb-pill-enter {
      0% { opacity: 0; transform: translateX(1rem) scale(0.92); }
      100% { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes lsb-progress-fill {
      0% { width: 0%; }
    }
    @keyframes lsb-glow-pulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }
    .lsb-mobile-strip::-webkit-scrollbar { display: none; }
    .lsb-desktop-nav::-webkit-scrollbar { width: 0.25rem; }
    .lsb-desktop-nav::-webkit-scrollbar-track { background: transparent; }
    .lsb-desktop-nav::-webkit-scrollbar-thumb {
      background: ${T.color.sandstone}44;
      border-radius: 0.125rem;
    }
    .lsb-desktop-nav::-webkit-scrollbar-thumb:hover {
      background: ${T.color.sandstone}88;
    }
  `;

  // ── MOBILE: horizontal scrollable pill strip ──
  if (isMobile) {
    return (
      <nav
        aria-label={t("sidebarNav")}
        className="lsb-mobile-strip"
        style={{
          width: "100%",
          height: "auto",
          background: "rgba(242,237,231,0.72)",
          backdropFilter: "blur(1.5rem)",
          WebkitBackdropFilter: "blur(1.5rem)",
          borderBottom: `0.0625rem solid ${T.color.cream}`,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          overflowX: "auto",
          overflowY: "hidden",
          flexShrink: 0,
          padding: "0.625rem 0.875rem",
          gap: "0.5rem",
          scrollBehavior: "smooth",
          msOverflowStyle: "none" as never,
          scrollbarWidth: "none" as never,
          maskImage: "linear-gradient(to right, transparent 0, black 0.75rem, black calc(100% - 0.75rem), transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0, black 0.75rem, black calc(100% - 0.75rem), transparent 100%)",
        }}
      >
        <style>{keyframes}</style>
        {visibleWings.map((w, i) => {
          const active = w.id === selectedWing;
          return (
            <button
              key={w.id}
              onClick={() => onSelectWing(w.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.75rem 1rem",
                minHeight: "2.75rem",
                borderRadius: "1.5rem",
                border: active
                  ? `0.0625rem solid ${w.accent}44`
                  : "0.0625rem solid rgba(255,255,255,0.4)",
                background: active
                  ? `linear-gradient(135deg, ${w.accent}, ${w.accent}DD)`
                  : "rgba(255,255,255,0.55)",
                backdropFilter: active ? "none" : "blur(0.5rem)",
                WebkitBackdropFilter: active ? "none" : "blur(0.5rem)",
                color: active ? T.color.white : T.color.walnut,
                cursor: "pointer",
                fontFamily: T.font.display,
                fontSize: "0.8125rem",
                fontWeight: active ? 600 : 500,
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: `all 0.3s ${EASE_OUT_EXPO}`,
                boxShadow: active
                  ? `0 0.25rem 0.75rem ${w.accent}40, inset 0 0.0625rem 0 rgba(255,255,255,0.15)`
                  : "0 0.0625rem 0.25rem rgba(44,44,42,0.04)",
                transform: active ? "scale(1.05)" : "scale(1)",
                animation: mounted
                  ? `lsb-pill-enter 0.4s ${EASE_OUT_EXPO} ${i * 0.05}s both`
                  : "none",
              }}
            >
              <WingIcon wingId={w.id} size={18} color={active ? "#FFF" : w.accent} />
              {w.id === "attic" ? t("storageRoom") : w.name}
              {/* Room count badge (P1 #13) */}
              {getWingRooms(w.id).length > 0 && (
                <span style={{
                  minWidth: "1.125rem", height: "1.125rem", borderRadius: "0.5625rem",
                  background: active ? "rgba(255,255,255,0.25)" : `${w.accent}18`,
                  color: active ? T.color.white : w.accent,
                  fontFamily: T.font.body, fontSize: "0.5625rem", fontWeight: 700,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  padding: "0 0.1875rem",
                }}>
                  {getWingRooms(w.id).length}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    );
  }

  // ── DESKTOP: premium frosted-glass sidebar ──
  return (
    <nav
      aria-label={t("sidebarNav")}
      className="lsb-desktop-nav"
      data-nudge="library_wing_sidebar"
      style={{
        width: "17rem",
        minWidth: "17rem",
        height: "100%",
        background:
          "linear-gradient(180deg, rgba(250,250,247,0.88) 0%, rgba(242,237,231,0.92) 40%, rgba(238,234,227,0.90) 100%)",
        backdropFilter: "blur(1.5rem)",
        WebkitBackdropFilter: "blur(1.5rem)",
        borderRight: `0.0625rem solid rgba(238,234,227,0.7)`,
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        overflowY: "auto",
        flexShrink: 0,
        boxShadow: "0.25rem 0 2rem rgba(44,44,42,0.04)",
      }}
    >
      <style>{keyframes}</style>

      {/* ── Header ── */}
      <div style={{ padding: "1.75rem 1.5rem 1rem" }}>
        <h1
          style={{
            fontFamily: T.font.display,
            fontSize: "2rem",
            fontWeight: 300,
            margin: 0,
            letterSpacing: "0.08em",
            lineHeight: 1.1,
            background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight}, ${T.color.gold})`,
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "lsb-shimmer 4s linear infinite",
          }}
        >
          {t("sidebarTitle")}
        </h1>
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: T.color.muted,
            margin: "0.5rem 0 0",
            letterSpacing: "0.02em",
            fontWeight: 400,
          }}
        >
          {t("sidebarSubtitle", {
            count: String(totalMemories),
            wings: String(visibleWings.length),
          })}
        </p>

        {/* Golden divider — animated reveal */}
        <div
          style={{
            marginTop: "1.125rem",
            height: "0.0625rem",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight}88, transparent)`,
              borderRadius: "0.0625rem",
              animation: mounted
                ? `lsb-divider-reveal 0.8s ${EASE_OUT_EXPO} 0.15s both`
                : "none",
            }}
          />
        </div>
      </div>

      {/* P2 #11: Sidebar search */}
      <div style={{ padding: "0 1rem 0.375rem" }}>
        <div style={{ position: "relative" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "0.5rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.6 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={sidebarQuery}
            onChange={e => setSidebarQuery(e.target.value)}
            placeholder={t("sidebarSearchPlaceholder")}
            aria-label={t("sidebarSearchPlaceholder")}
            style={{
              width: "100%", padding: "0.375rem 0.5rem 0.375rem 1.75rem",
              borderRadius: "0.5rem",
              border: `0.0625rem solid ${T.color.cream}`,
              background: "rgba(255,255,255,0.5)",
              fontFamily: T.font.body, fontSize: "0.6875rem",
              color: T.color.charcoal, outline: "none",
              boxSizing: "border-box" as const,
              transition: `border-color 0.2s ${EASE_OUT_EXPO}`,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = T.color.gold; }}
            onBlur={e => { e.currentTarget.style.borderColor = T.color.cream; }}
          />
          {sidebarQuery && (
            <button
              onClick={() => setSidebarQuery("")}
              aria-label={tc("clearSearch")}
              style={{
                position: "absolute", right: "0.375rem", top: "50%", transform: "translateY(-50%)",
                width: "1rem", height: "1rem", borderRadius: "50%",
                background: T.color.cream, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.5625rem", color: T.color.walnut, lineHeight: 1,
              }}
            >
              {"\u00D7"}
            </button>
          )}
        </div>
      </div>

      {/* ── Wings section label ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.375rem",
        padding: "0.5rem 1rem 0.125rem",
      }}>
        {/* Wing icon */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8, flexShrink: 0 }}>
          <path d="M2 17L12 2l10 15" /><path d="M2 17h20" /><path d="M7 17v4" /><path d="M17 17v4" />
        </svg>
        <span style={{
          fontFamily: T.font.body,
          fontSize: "0.625rem",
          fontWeight: 700,
          color: T.color.gold,
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
        }}>
          {t("wingsLabel")}
        </span>
        {/* Info tooltip (?) */}
        <div style={{ position: "relative", display: "inline-flex" }}>
          <button
            onClick={() => setTooltipOpen(!tooltipOpen)}
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
            aria-label={t("wingsTooltip")}
            style={{
              width: "0.875rem", height: "0.875rem", borderRadius: "50%",
              background: tooltipOpen ? `${T.color.gold}30` : `${T.color.muted}15`,
              border: `0.0625rem solid ${tooltipOpen ? T.color.gold : T.color.muted}44`,
              cursor: "pointer", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: T.font.body, fontSize: "0.5625rem", fontWeight: 600,
              color: tooltipOpen ? T.color.gold : T.color.muted,
              transition: `all 0.2s ${EASE_OUT_EXPO}`,
            }}
          >
            ?
          </button>
          {tooltipOpen && (
            <div style={{
              position: "absolute", left: "1.25rem", top: "-0.25rem", zIndex: 50,
              width: "12.5rem", padding: "0.625rem 0.75rem",
              background: T.color.charcoal, color: T.color.linen,
              borderRadius: "0.5rem",
              fontFamily: T.font.body, fontSize: "0.6875rem", lineHeight: 1.5,
              fontWeight: 400, letterSpacing: "0.01em",
              boxShadow: "0 0.25rem 1rem rgba(44,44,42,0.25)",
              animation: `lsb-wing-enter 0.2s ${EASE_OUT_EXPO} both`,
            }}>
              {t("wingsTooltip")}
            </div>
          )}
        </div>
      </div>

      {/* ── Wing list ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "0.375rem 0.5rem",
          flex: 1,
          gap: "0.125rem",
        }}
      >
        {visibleWings.map((w, index) => {
          const active = w.id === selectedWing;
          const hovered = hoveredWing === w.id;
          const roomCount = getWingRooms(w.id).length;
          const memCount = wingMemCount(w.id);
          const progressRatio = Math.min(memCount / PROGRESS_BASELINE, 1);

          return (
            <div key={w.id}>
            <button
              onClick={() => onSelectWing(w.id)}
              onMouseEnter={() => setHoveredWing(w.id)}
              onMouseLeave={() => setHoveredWing(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.875rem 1rem",
                width: "100%",
                borderRadius: "0.75rem",
                background: active
                  ? T.color.white
                  : hovered
                    ? "rgba(255,255,255,0.55)"
                    : "transparent",
                border: "none",
                borderLeft: active
                  ? `0.1875rem solid ${T.color.gold}`
                  : "0.1875rem solid transparent",
                cursor: "pointer",
                textAlign: "left",
                transition: `all 0.25s ${EASE_OUT_EXPO}`,
                boxShadow: active
                  ? `0 0.125rem 0.5rem rgba(44,44,42,0.06), inset 0 0 0 0.0625rem rgba(255,255,255,0.8)`
                  : hovered
                    ? "0 0.0625rem 0.25rem rgba(44,44,42,0.03)"
                    : "none",
                transform: hovered && !active ? "translateY(-0.0625rem)" : "none",
                position: "relative",
                animation: mounted
                  ? `lsb-wing-enter 0.45s ${EASE_OUT_EXPO} ${index * 0.05 + 0.2}s both`
                  : "none",
              }}
            >
              {/* Icon circle with accent glow */}
              <div
                style={{
                  width: "2.375rem",
                  height: "2.375rem",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${w.accent}18, ${w.accent}28)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "1.125rem",
                  lineHeight: 1,
                  transition: `all 0.3s ${EASE_OUT_EXPO}`,
                  boxShadow:
                    active || hovered
                      ? `0 0 0.75rem ${w.accent}22`
                      : "none",
                }}
              >
                <WingIcon wingId={w.id} size={20} color={w.accent} />
              </div>

              {/* Name + subtitle + progress */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: T.font.display,
                    fontSize: active ? "1rem" : "0.9375rem",
                    fontWeight: active ? 700 : 500,
                    color: active ? T.color.charcoal : T.color.walnut,
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.015em",
                    transition: `all 0.2s ${EASE_OUT_EXPO}`,
                  }}
                >
                  {w.id === "attic" ? t("storageRoom") : w.name}
                </span>
                <span
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.6875rem",
                    color: T.color.muted,
                    display: "block",
                    marginTop: "0.1875rem",
                    letterSpacing: "0.01em",
                  }}
                >
                  {t("wingCount", {
                    rooms: String(roomCount),
                    memories: String(memCount),
                  })}
                </span>

                {/* Progress bar — animated from 0 */}
                <div
                  style={{
                    marginTop: "0.375rem",
                    height: "0.125rem",
                    width: "100%",
                    background: T.color.cream,
                    borderRadius: "0.0625rem",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progressRatio * 100}%`,
                      background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight})`,
                      borderRadius: "0.0625rem",
                      animation: mounted
                        ? `lsb-progress-fill 0.7s ${EASE_OUT_EXPO} ${index * 0.05 + 0.4}s both`
                        : "none",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>

              {/* Room count badge (P1 #13) */}
              {roomCount > 0 && (
                <span
                  style={{
                    minWidth: "1.375rem",
                    height: "1.375rem",
                    borderRadius: "0.6875rem",
                    background: active ? `${w.accent}20` : `${T.color.muted}15`,
                    color: active ? w.accent : T.color.muted,
                    fontFamily: T.font.body,
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 0.25rem",
                    flexShrink: 0,
                    transition: `all 0.25s ${EASE_OUT_EXPO}`,
                  }}
                >
                  {roomCount}
                </span>
              )}

              {/* P2 #4: Wing color dot */}
              <button
                onClick={e => { e.stopPropagation(); setColorPickerWing(colorPickerWing === w.id ? null : w.id); }}
                aria-label={t("customizeColor")}
                style={{
                  width: "0.75rem", height: "0.75rem", borderRadius: "50%",
                  background: wingColors[w.id] || w.accent,
                  border: `0.0625rem solid rgba(44,44,42,0.15)`,
                  cursor: "pointer", flexShrink: 0,
                  transition: `all 0.2s ${EASE_OUT_EXPO}`,
                  transform: (hovered || active) ? "scale(1.15)" : "scale(1)",
                  opacity: (hovered || active) ? 1 : 0.6,
                  padding: 0, font: "inherit",
                }}
                title={t("customizeColor")}
              />

              {/* Chevron — slides right on hover */}
              <span
                style={{
                  fontSize: "0.875rem",
                  color: active ? (wingColors[w.id] || w.accent) : T.color.muted,
                  opacity: hovered || active ? 1 : 0,
                  transform: hovered ? "translateX(0.125rem)" : "translateX(0)",
                  transition: `all 0.25s ${EASE_OUT_EXPO}`,
                  flexShrink: 0,
                  fontFamily: T.font.body,
                  fontWeight: 300,
                }}
              >
                {"\u203A"}
              </span>
            </button>
            {/* P2 #4: Color swatches row */}
            {colorPickerWing === w.id && (
              <div style={{
                display: "flex", gap: "0.25rem", padding: "0.25rem 1rem 0.375rem 3.5rem",
                animation: mounted ? `lsb-wing-enter 0.2s ${EASE_OUT_EXPO} both` : "none",
              }}>
                {WING_COLOR_SWATCHES.map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      const next = { ...wingColors, [w.id]: color };
                      setWingColors(next);
                      if (typeof window !== "undefined") localStorage.setItem("mp_wing_colors", JSON.stringify(next));
                      setColorPickerWing(null);
                    }}
                    style={{
                      width: "1.125rem", height: "1.125rem", borderRadius: "50%",
                      background: color, border: (wingColors[w.id] || w.accent) === color ? `0.125rem solid ${T.color.charcoal}` : `0.0625rem solid rgba(44,44,42,0.15)`,
                      cursor: "pointer", padding: 0, flexShrink: 0,
                      transition: `transform 0.15s ${EASE_OUT_EXPO}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                    aria-label={t("colorSwatch")}
                  />
                ))}
              </div>
            )}

            {/* ── Rooms sub-list for active wing ── */}
            {active && roomCount > 0 && (
              <>
                {/* Divider between wing and rooms */}
                <div style={{
                  height: "0.0625rem", margin: "0.25rem 1rem 0.25rem 2.25rem",
                  background: `linear-gradient(90deg, ${w.accent}33, ${T.color.cream}22, transparent)`,
                }} />
                {/* "Rooms in {wingName}" label */}
                <div style={{
                  padding: "0.25rem 1rem 0.125rem 2.25rem",
                  fontFamily: T.font.body,
                  fontSize: "0.5625rem",
                  fontWeight: 600,
                  color: T.color.muted,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                }}>
                  {t("roomsInWing", { wing: w.id === "attic" ? t("storageRoom") : w.name })}
                </div>
                {/* Room items */}
                {getWingRooms(w.id).map((room, ri) => (
                  <div
                    key={room.id}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.375rem 0.75rem 0.375rem 2.25rem",
                      borderRadius: "0.5rem",
                      cursor: "pointer",
                      transition: `all 0.2s ${EASE_OUT_EXPO}`,
                      background: "transparent",
                      animation: mounted ? `lsb-wing-enter 0.3s ${EASE_OUT_EXPO} ${ri * 0.04 + 0.1}s both` : "none",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.5)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <RoomIcon roomId={room.id} size={14} color={T.color.muted} />
                    <span style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      fontWeight: 400,
                      color: T.color.walnut,
                      letterSpacing: "0.01em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      minWidth: 0,
                    }}>
                      {room.name}
                    </span>
                  </div>
                ))}
              </>
            )}
            </div>
          );
        })}
      </div>

      {/* ── Shared with me ── */}
      {onSharedClick && (sharedCount ?? 0) > 0 && (
        <div style={{ padding: "0.25rem 0.5rem 0" }}>
          <button
            onClick={onSharedClick}
            style={{
              width: "100%",
              padding: "0.5rem 1rem",
              borderRadius: "0.625rem",
              border: `0.0625rem solid ${T.color.cream}88`,
              background: "rgba(255,255,255,0.35)",
              backdropFilter: "blur(0.5rem)",
              WebkitBackdropFilter: "blur(0.5rem)",
              cursor: "pointer",
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              fontWeight: 500,
              color: T.color.muted,
              letterSpacing: "0.02em",
              transition: `all 0.25s ${EASE_OUT_EXPO}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.375rem",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            {t("sharedWithMe")} ({sharedCount})
          </button>
        </div>
      )}

      {/* ── Add Wing button ── */}
      {onAddWing && (
        <div style={{ padding: "0.25rem 0.5rem 0" }}>
          <button
            onClick={onAddWing}
            onMouseEnter={() => setAddWingHovered(true)}
            onMouseLeave={() => setAddWingHovered(false)}
            style={{
              width: "100%",
              padding: "0.5rem 1rem",
              borderRadius: "0.625rem",
              border: `0.0625rem solid ${addWingHovered ? `${T.color.gold}66` : `${T.color.cream}88`}`,
              background: addWingHovered
                ? "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.6))"
                : "rgba(255,255,255,0.35)",
              backdropFilter: "blur(0.5rem)",
              WebkitBackdropFilter: "blur(0.5rem)",
              cursor: "pointer",
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              fontWeight: 500,
              color: addWingHovered ? T.color.charcoal : T.color.muted,
              letterSpacing: "0.02em",
              transition: `all 0.25s ${EASE_OUT_EXPO}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.375rem",
              boxShadow: addWingHovered
                ? `0 0.125rem 0.5rem rgba(44,44,42,0.06), 0 0 0.5rem ${T.color.gold}15`
                : "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={addWingHovered ? T.color.gold : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transition: `stroke 0.25s ${EASE_OUT_EXPO}` }}><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
            {t("addWingLabel")}
          </button>
        </div>
      )}

      {/* ── Add Room button ── */}
      {onAddRoom && selectedWing && (
        <div style={{ padding: "0.25rem 0.5rem 0" }}>
          <button
            onClick={onAddRoom}
            onMouseEnter={() => setAddRoomHovered(true)}
            onMouseLeave={() => setAddRoomHovered(false)}
            style={{
              width: "100%",
              padding: "0.5rem 1rem",
              borderRadius: "0.625rem",
              border: `0.0625rem solid ${addRoomHovered ? `${T.color.gold}66` : `${T.color.cream}88`}`,
              background: addRoomHovered
                ? "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.6))"
                : "rgba(255,255,255,0.35)",
              backdropFilter: "blur(0.5rem)",
              WebkitBackdropFilter: "blur(0.5rem)",
              cursor: "pointer",
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              fontWeight: 500,
              color: addRoomHovered ? T.color.charcoal : T.color.muted,
              letterSpacing: "0.02em",
              transition: `all 0.25s ${EASE_OUT_EXPO}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.375rem",
              boxShadow: addRoomHovered
                ? `0 0.125rem 0.5rem rgba(44,44,42,0.06), 0 0 0.5rem ${T.color.gold}15`
                : "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={addRoomHovered ? T.color.gold : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transition: `stroke 0.25s ${EASE_OUT_EXPO}` }}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            {t("addRoomLabel")}
          </button>
        </div>
      )}

      {/* ── Storage stats ── */}
      <div
        style={{
          padding: "0.625rem 1rem 0",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            color: T.color.muted,
            letterSpacing: "0.01em",
          }}
        >
          {t("storageUsed", { count: String(totalMemories) })}
        </span>
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            color: T.color.muted,
            letterSpacing: "0.01em",
          }}
        >
          {t("wingsRooms", {
            wings: String(visibleWings.length),
            rooms: String(totalRooms),
          })}
        </span>
        {/* Progress bar */}
        <div
          style={{
            height: "0.1875rem",
            width: "100%",
            background: T.color.cream,
            borderRadius: "0.125rem",
            overflow: "hidden",
            marginTop: "0.125rem",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min((totalMemories / PLAN_LIMIT) * 100, 100)}%`,
              background: `linear-gradient(90deg, ${T.color.terracotta}, ${T.color.terracotta}CC)`,
              borderRadius: "0.125rem",
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <a
          href="/settings/subscription"
          style={{
            fontFamily: T.font.body,
            fontSize: "0.625rem",
            color: T.color.terracotta,
            textDecoration: "none",
            letterSpacing: "0.02em",
            opacity: 0.85,
            transition: `opacity 0.2s ${EASE_OUT_EXPO}`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.85"; }}
        >
          {t("upgradeStorage")}
        </a>
      </div>

      {/* ── Bottom section ── */}
      <div
        style={{
          marginTop: "auto",
          padding: "0.75rem 1rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {/* Golden gradient divider */}
        <div
          style={{
            height: "0.0625rem",
            overflow: "hidden",
            marginBottom: "0.25rem",
          }}
        >
          <div
            style={{
              height: "100%",
              background: `linear-gradient(90deg, transparent, ${T.color.gold}66, transparent)`,
              borderRadius: "0.0625rem",
              animation: mounted
                ? `lsb-divider-reveal 0.8s ${EASE_OUT_EXPO} 0.6s both`
                : "none",
            }}
          />
        </div>

        {/* Atrium button */}
        {onGoAtrium && (
          <button
            onClick={onGoAtrium}
            onMouseEnter={() => setAtriumHovered(true)}
            onMouseLeave={() => setAtriumHovered(false)}
            style={{
              width: "100%",
              padding: "0.6875rem 1rem",
              borderRadius: "0.625rem",
              background: atriumHovered
                ? "rgba(255,255,255,0.85)"
                : "rgba(255,255,255,0.65)",
              color: T.color.charcoal,
              border: `0.0625rem solid ${atriumHovered ? T.color.gold : T.color.cream}`,
              cursor: "pointer",
              fontFamily: T.font.display,
              fontSize: "0.875rem",
              fontWeight: 500,
              letterSpacing: "0.03em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: `all 0.25s ${EASE_OUT_EXPO}`,
              transform: atriumHovered ? "scale(1.01)" : "scale(1)",
              boxShadow: atriumHovered
                ? "0 0.125rem 0.5rem rgba(44,44,42,0.06)"
                : "none",
            }}
          >
            <span style={{ fontSize: "0.9375rem", lineHeight: 1 }}>
              {"\u{1F3DB}\uFE0F"}
            </span>
            {t("atrium")}
          </button>
        )}

        {/* Enter Palace button — charcoal gradient with golden shimmer border */}
        <button
          onClick={onEnter3D}
          onMouseEnter={() => setEnterHovered(true)}
          onMouseLeave={() => setEnterHovered(false)}
          style={{
            width: "100%",
            padding: "0.8125rem 1rem",
            borderRadius: "0.625rem",
            background: `linear-gradient(135deg, ${T.color.charcoal}, #3a3a38)`,
            color: T.color.linen,
            border: "0.0625rem solid transparent",
            borderImage: `linear-gradient(135deg, ${T.color.gold}88, ${T.color.goldLight}44, ${T.color.gold}88) 1`,
            cursor: "pointer",
            fontFamily: T.font.display,
            fontSize: "0.9375rem",
            fontWeight: 500,
            letterSpacing: "0.05em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: `all 0.3s ${EASE_OUT_EXPO}`,
            transform: enterHovered ? "scale(1.02)" : "scale(1)",
            boxShadow: enterHovered
              ? `0 0.375rem 1.25rem rgba(44,44,42,0.22), 0 0 0.75rem ${T.color.gold}18`
              : "0 0.125rem 0.625rem rgba(44,44,42,0.12)",
            outline: enterHovered
              ? `0.0625rem solid ${T.color.gold}44`
              : "none",
            outlineOffset: "0.0625rem",
          }}
        >
          <PalaceLogo variant="mark" color="light" size="sm" style={{ width: "1rem", height: "1rem" }} />
          {selectedRoomName
            ? t("enter3DRoom", { room: selectedRoomName })
            : selectedWingName && selectedWing !== wings[0]?.id
              ? t("enter3DWing", { wing: selectedWingName })
              : t("enterPalace")}
        </button>
      </div>
    </nav>
  );
}
