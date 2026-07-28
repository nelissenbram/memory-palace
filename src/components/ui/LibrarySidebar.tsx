"use client";
import { useState, useMemo, useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useRoomStore } from "@/lib/stores/roomStore";
import type { Wing } from "@/lib/constants/wings";
import { translateWingName, translateRoomName } from "@/lib/constants/wings";
import TuscanCard from "./TuscanCard";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { WingIcon, RoomIcon } from "./WingRoomIcons";
import { isIOS } from "@/lib/native/platform";
import { CREAM, HAIRLINE, SHADOW, TOP_HIGHLIGHT, giltRule } from "@/lib/libraryTokens";

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
  onSelectRoom?: (roomId: string) => void;
  selectedRoom?: string | null;
  sharedWings?: { wingName: string; rooms: { id: string; name: string; icon: string }[] }[];
  /** Per-wing warmth (0 quiet / 1 ember / 2 candlelit) — the seals glow by recency. */
  wingWarmth?: Record<string, 0 | 1 | 2>;
  /** A memory tile is being dragged over the app: the active wing's rooms
   *  auto-collapse and each wing spring-opens its rooms on drag-hover so the
   *  memory can be dropped straight into the right room. */
  dragActive?: boolean;
  onDropMemory?: (roomId: string, memId: string) => void;
}

function readDragMemId(e: { dataTransfer: DataTransfer }): string {
  return e.dataTransfer.getData("application/x-mp-memory") || e.dataTransfer.getData("text/plain");
}

const PLAN_LIMIT = 500;

const PROGRESS_BASELINE = 20;
const EASE_OUT_EXPO = "cubic-bezier(0.22, 1, 0.36, 1)";

const WING_COLOR_SWATCHES = ["#C66B3D", "#D4AF37", "#4A6741", "#6B8EAD", "#A0527E", "#8B7355", "#C05050", "#2C2C2A"];

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
  onSelectRoom,
  selectedRoom,
  sharedWings,
  wingWarmth,
  dragActive,
  onDropMemory,
}: LibrarySidebarProps) {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { t: tWings } = useTranslation("wings");
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
  const [sharedExpanded, setSharedExpanded] = useState(false);
  const [dragWing, setDragWing] = useState<string | null>(null);
  const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);
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

  useEffect(() => {
    if (!dragActive) { setDragWing(null); setDragOverRoom(null); }
  }, [dragActive]);

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
      if (translateWingName(w, tWings).toLowerCase().includes(sq)) return true;
      // Also match room names within the wing
      return getWingRooms(w.id).some(r => r.name.toLowerCase().includes(sq) || translateRoomName(r, tWings).toLowerCase().includes(sq));
    });
  }, [wings, sidebarQuery, getWingRooms, tWings]);

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
    @keyframes lsb-seal-breath { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.08); } }
    @media (prefers-reduced-motion: no-preference) {
      .lsb-seal-breath { animation: lsb-seal-breath 4s ease-in-out infinite; }
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
          borderBottom: `0.0625rem solid ${HAIRLINE}`,
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
                color: active ? T.color.white : "#716A5E",
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
                  : "0 0.0625rem 0.25rem rgba(64,59,54,0.04)",
                transform: active ? "scale(1.05)" : "scale(1)",
                animation: mounted
                  ? `lsb-pill-enter 0.4s ${EASE_OUT_EXPO} ${i * 0.05}s both`
                  : "none",
              }}
            >
              <WingIcon wingId={w.id} size={18} color={active ? "#FFF" : w.accent} />
              {w.id === "attic" ? t("storageRoom") : translateWingName(w, tWings)}
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
      data-nudge="library_wing_sidebar"
      aria-label={t("sidebarNav")}
      className="lsb-desktop-nav"
      style={{
        width: "17rem",
        minWidth: "17rem",
        height: "100%",
        background: "linear-gradient(160deg, #FBF2EC 0%, #FCFAF5 78%)",
        borderRight: `0.0625rem solid ${HAIRLINE}`,
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        overflowY: "auto",
        flexShrink: 0,
        boxShadow: "0.25rem 0 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)",
      }}
    >
      <style>{keyframes}</style>

      {/* ── Header ── */}
      <div style={{ padding: "1.75rem 1.5rem 1rem" }}>
        <h1
          style={{
            fontFamily: T.font.display,
            fontSize: "1.375rem",
            fontWeight: 600,
            margin: 0,
            lineHeight: 1.15,
            color: "#403B36",
          }}
        >
          {t("sidebarTitle")}
        </h1>
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: "#716A5E",
            margin: "0.5rem 0 0",
            letterSpacing: "0.02em",
            fontWeight: 500,
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
              background: giltRule,
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
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={"#716A5E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "0.5rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.6 }}>
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
              fontFamily: T.font.body, fontSize: "0.75rem",
              color: "#403B36", outline: "none",
              boxSizing: "border-box" as const,
              transition: `border-color 0.2s ${EASE_OUT_EXPO}`,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = "#B85C38"; }}
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
                fontSize: "0.5625rem", color: "#716A5E", lineHeight: 1,
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
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9A4F2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M2 17L12 2l10 15" /><path d="M2 17h20" /><path d="M7 17v4" /><path d="M17 17v4" />
        </svg>
        <span style={{
          fontFamily: T.font.body,
          fontSize: "0.625rem",
          fontWeight: 700,
          color: "#9A4F2A",
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
              background: tooltipOpen ? `rgba(184,92,56,0.19)` : `${"#716A5E"}15`,
              border: `0.0625rem solid rgba(184,92,56,0.27)`,
              cursor: "pointer", padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: T.font.body, fontSize: "0.5625rem", fontWeight: 600,
              color: tooltipOpen ? "#B85C38" : "#716A5E",
              transition: `all 0.2s ${EASE_OUT_EXPO}`,
            }}
          >
            ?
          </button>
          {tooltipOpen && (
            <div style={{
              position: "absolute", left: "1.25rem", top: "-0.25rem", zIndex: 50,
              width: "12.5rem", padding: "0.625rem 0.75rem",
              background: "#403B36", color: T.color.linen,
              borderRadius: "0.5rem",
              fontFamily: T.font.body, fontSize: "0.75rem", lineHeight: 1.5,
              fontWeight: 500, letterSpacing: "0.01em",
              boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.25)",
              animation: `lsb-wing-enter 0.2s ${EASE_OUT_EXPO} both`,
            }}>
              {t("wingsTooltip")}
            </div>
          )}
        </div>
      </div>

      {/* Drop hint while a memory is being dragged */}
      {dragActive && (
        <div style={{
          margin: "0.25rem 1rem 0",
          padding: "0.375rem 0.625rem",
          borderRadius: "0.5rem",
          border: "0.0625rem dashed rgba(184,92,56,0.45)",
          background: "rgba(184,92,56,0.08)",
          fontFamily: T.font.body,
          fontSize: "0.6875rem",
          fontWeight: 600,
          color: "#9A4F2A",
          letterSpacing: "0.02em",
          animation: `lsb-wing-enter 0.2s ${EASE_OUT_EXPO} both`,
        }}>
          {t("dragDropHint")}
        </div>
      )}

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
          // During a drag the room lists auto-collapse; only the drag-hovered
          // wing spring-opens so the drop lands in the right room.
          const roomsOpen = dragActive ? dragWing === w.id : active;

          return (
            <div key={w.id}>
            {/* Relative wrapper so the color-dot button can overlay the row's
                right side as a SIBLING — a button nested inside the row button
                is invalid HTML (hydration hazard, invisible to AT). */}
            <div style={{ position: "relative" }}>
            <button
              onClick={() => onSelectWing(w.id)}
              onMouseEnter={() => setHoveredWing(w.id)}
              onMouseLeave={() => setHoveredWing(null)}
              onDragOver={dragActive ? (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragWing !== w.id) setDragWing(w.id);
              } : undefined}
              style={{
                outline: dragActive && dragWing === w.id ? "0.0625rem dashed rgba(184,92,56,0.55)" : "none",
                outlineOffset: "-0.0625rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                // Extra right padding reserves room for the overlaid color-dot
                // button (1.5rem hit box at right: 0.625rem) so text/badge/chevron
                // never underlap it.
                padding: "0.875rem 2.375rem 0.875rem 1rem",
                width: "100%",
                borderRadius: "0.75rem",
                background: active
                  ? CREAM
                  : hovered
                    ? "rgba(255,255,255,0.55)"
                    : "transparent",
                border: "none",
                borderLeft: active
                  ? `0.1875rem solid ${w.accent}`
                  : "0.1875rem solid transparent",
                cursor: "pointer",
                textAlign: "left",
                transition: `all 0.25s ${EASE_OUT_EXPO}`,
                boxShadow: active
                  ? `${SHADOW[1]}, ${TOP_HIGHLIGHT}`
                  : hovered
                    ? "0 0.0625rem 0.25rem rgba(64,59,54,0.03)"
                    : "none",
                transform: hovered && !active ? "translateY(-0.0625rem)" : "none",
                position: "relative",
                animation: mounted
                  ? `lsb-wing-enter 0.45s ${EASE_OUT_EXPO} ${index * 0.05 + 0.2}s both`
                  : "none",
              }}
            >
              {/* Engraved wing seal — warmth-lit medallion (r10): the palace
                  breathes gilt when a wing is candlelit, embers when warm,
                  quiet when untended. The one licensed gold in the nav. */}
              {(() => {
                const warm = wingWarmth?.[w.id] ?? 0;
                const warmGlow = warm === 2 ? "0 0 0.9rem rgba(212,175,55,0.34)" : warm === 1 ? "0 0 0.7rem rgba(184,92,56,0.28)" : "none";
                return (
                  <div
                    className={warm === 2 ? "lsb-seal-breath" : undefined}
                    style={{
                      width: "2.375rem",
                      height: "2.375rem",
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, ${w.accent}14, ${w.accent}22)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      lineHeight: 1,
                      transition: `all 0.3s ${EASE_OUT_EXPO}`,
                      boxShadow: `inset 0 0 0 0.0625rem #E3D6BC, inset 0 0.0625rem 0 rgba(255,255,255,0.5)${warmGlow !== "none" ? ", " + warmGlow : ""}`,
                    }}
                  >
                    <WingIcon wingId={w.id} size={20} color={w.accent} />
                  </div>
                );
              })()}

              {/* Name + subtitle + progress */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: T.font.display,
                    fontSize: active ? "1rem" : "0.9375rem",
                    fontWeight: active ? 700 : 500,
                    color: active ? "#403B36" : "#716A5E",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.015em",
                    transition: `all 0.2s ${EASE_OUT_EXPO}`,
                  }}
                >
                  {w.id === "attic" ? t("storageRoom") : translateWingName(w, tWings)}
                </span>
                <span
                  style={{
                    fontFamily: T.font.body,
                    fontSize: "0.75rem",
                    color: "#716A5E",
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
                      background: "#B85C38",
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
                    background: active ? `${w.accent}20` : `${"#716A5E"}15`,
                    color: active ? w.accent : "#716A5E",
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

              {/* Chevron — slides right on hover */}
              <span
                style={{
                  fontSize: "0.875rem",
                  color: active ? (wingColors[w.id] || w.accent) : "#716A5E",
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
            {/* P2 #4: Wing color dot \u2014 absolutely positioned SIBLING of the row
                button (visual dot 0.75rem inside a 1.5rem transparent hit box). */}
            <button
              onClick={e => { e.stopPropagation(); setColorPickerWing(colorPickerWing === w.id ? null : w.id); }}
              onMouseEnter={() => setHoveredWing(w.id)}
              onMouseLeave={() => setHoveredWing(null)}
              aria-label={t("customizeColor")}
              title={t("customizeColor")}
              style={{
                position: "absolute",
                right: "0.625rem",
                top: "50%",
                marginTop: "-0.75rem",
                width: "1.5rem", height: "1.5rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent", border: "none",
                cursor: "pointer", padding: 0, font: "inherit",
                // While dragging, let dragover events fall through to the row
                // button underneath so wing spring-open keeps working.
                pointerEvents: dragActive ? "none" : "auto",
              }}
            >
              <span
                style={{
                  width: "0.75rem", height: "0.75rem", borderRadius: "50%",
                  background: wingColors[w.id] || w.accent,
                  border: `0.0625rem solid rgba(64,59,54,0.15)`,
                  transition: `all 0.2s ${EASE_OUT_EXPO}`,
                  transform: (hovered || active) ? "scale(1.15)" : "scale(1)",
                  opacity: (hovered || active) ? 1 : 0.6,
                  display: "block",
                }}
              />
            </button>
            </div>
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
                      background: color, border: (wingColors[w.id] || w.accent) === color ? `0.125rem solid ${"#403B36"}` : `0.0625rem solid rgba(64,59,54,0.15)`,
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

            {/* ── Rooms sub-list for the active (or drag-hovered) wing ── */}
            {roomsOpen && roomCount > 0 && (
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
                  color: "#716A5E",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                }}>
                  {t("roomsInWing", { wing: w.id === "attic" ? t("storageRoom") : translateWingName(w, tWings) })}
                </div>
                {/* Room items */}
                {getWingRooms(w.id).map((room, ri) => {
                  const isRoomActive = selectedRoom === room.id;
                  const isDropTarget = dragActive && dragOverRoom === room.id;
                  return (
                  <div
                    key={room.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectRoom?.(room.id)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectRoom?.(room.id); } }}
                    onDragOver={dragActive ? e => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverRoom !== room.id) setDragOverRoom(room.id);
                    } : undefined}
                    onDragLeave={dragActive ? () => setDragOverRoom(r => (r === room.id ? null : r)) : undefined}
                    onDrop={dragActive ? e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const memId = readDragMemId(e);
                      setDragOverRoom(null);
                      setDragWing(null);
                      if (memId) onDropMemory?.(room.id, memId);
                    } : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      padding: "0.375rem 0.75rem 0.375rem 2.25rem",
                      borderRadius: "0.5rem",
                      cursor: "pointer",
                      transition: `all 0.2s ${EASE_OUT_EXPO}`,
                      background: isDropTarget ? "rgba(184,92,56,0.14)" : isRoomActive ? "rgba(255,255,255,0.7)" : "transparent",
                      borderLeft: isDropTarget ? "2px solid #B85C38" : isRoomActive ? `2px solid ${w.accent}` : "2px solid transparent",
                      animation: mounted ? `lsb-wing-enter 0.3s ${EASE_OUT_EXPO} ${ri * 0.04 + 0.1}s both` : "none",
                    }}
                    onMouseEnter={e => {
                      if (!isRoomActive) e.currentTarget.style.background = "rgba(255,255,255,0.5)";
                    }}
                    onMouseLeave={e => {
                      if (!isRoomActive && !isDropTarget) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <RoomIcon roomId={room.id} size={14} color={"#716A5E"} />
                    <span style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "#716A5E",
                      letterSpacing: "0.01em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      minWidth: 0,
                    }}>
                      {translateRoomName(room, tWings)}
                    </span>
                  </div>
                  );
                })}
              </>
            )}
            </div>
          );
        })}
      </div>

      {/* ── Shared with me ── */}
      {(sharedCount ?? 0) > 0 && (
        <div style={{ padding: "0.25rem 0.5rem 0" }}>
          <button
            onClick={() => setSharedExpanded(!sharedExpanded)}
            style={{
              width: "100%",
              padding: "0.5rem 1rem",
              borderRadius: "0.625rem",
              border: `0.0625rem solid ${sharedExpanded ? `rgba(184,92,56,0.27)` : `${T.color.cream}88`}`,
              background: sharedExpanded ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.35)",
              backdropFilter: "blur(0.5rem)",
              WebkitBackdropFilter: "blur(0.5rem)",
              cursor: "pointer",
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "#716A5E",
              letterSpacing: "0.02em",
              transition: `all 0.25s ${EASE_OUT_EXPO}`,
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            <span style={{ flex: 1, textAlign: "left" }}>{t("sharedWithMe")} ({sharedCount})</span>
            <span style={{ fontSize: "0.5rem", transform: sharedExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: `transform 0.2s ${EASE_OUT_EXPO}` }}>{"\u25BC"}</span>
          </button>
          {/* Expanded shared rooms */}
          {sharedExpanded && sharedWings && sharedWings.length > 0 && (
            <div style={{ padding: "0.25rem 0 0 0.5rem" }}>
              {sharedWings.map((sw) => (
                <div key={sw.wingName}>
                  <div style={{
                    padding: "0.25rem 0.75rem 0.125rem",
                    fontFamily: T.font.body,
                    fontSize: "0.5625rem",
                    fontWeight: 600,
                    color: "#716A5E",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase" as const,
                  }}>
                    {sw.wingName}
                  </div>
                  {sw.rooms.map((room) => (
                    <div
                      key={room.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSharedClick?.()}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSharedClick?.(); } }}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.5rem",
                        padding: "0.375rem 0.75rem 0.375rem 1.5rem",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        transition: `all 0.2s ${EASE_OUT_EXPO}`,
                        background: selectedRoom === room.id ? "rgba(255,255,255,0.7)" : "transparent",
                        borderLeft: selectedRoom === room.id ? "0.125rem solid #B85C38" : "0.125rem solid transparent",
                      }}
                      onMouseEnter={e => { if (selectedRoom !== room.id) e.currentTarget.style.background = "rgba(255,255,255,0.5)"; }}
                      onMouseLeave={e => { if (selectedRoom !== room.id) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: "0.8125rem", flexShrink: 0 }}>{room.icon || "\uD83D\uDCC1"}</span>
                      <span style={{
                        fontFamily: T.font.body,
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        color: "#716A5E",
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
                </div>
              ))}
            </div>
          )}
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
              border: `0.0625rem solid ${addWingHovered ? `rgba(184,92,56,0.4)` : `${T.color.cream}88`}`,
              background: addWingHovered
                ? "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.6))"
                : "rgba(255,255,255,0.35)",
              backdropFilter: "blur(0.5rem)",
              WebkitBackdropFilter: "blur(0.5rem)",
              cursor: "pointer",
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              fontWeight: 500,
              color: addWingHovered ? "#403B36" : "#716A5E",
              letterSpacing: "0.02em",
              transition: `all 0.25s ${EASE_OUT_EXPO}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.375rem",
              boxShadow: addWingHovered
                ? `0 0.125rem 0.5rem rgba(64,59,54,0.06), 0 0 0.5rem rgba(184,92,56,0.12)`
                : "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={addWingHovered ? "#9A4F2A" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transition: `stroke 0.25s ${EASE_OUT_EXPO}` }}><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
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
              border: `0.0625rem solid ${addRoomHovered ? `rgba(184,92,56,0.4)` : `${T.color.cream}88`}`,
              background: addRoomHovered
                ? "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.6))"
                : "rgba(255,255,255,0.35)",
              backdropFilter: "blur(0.5rem)",
              WebkitBackdropFilter: "blur(0.5rem)",
              cursor: "pointer",
              fontFamily: T.font.body,
              fontSize: "0.75rem",
              fontWeight: 500,
              color: addRoomHovered ? "#403B36" : "#716A5E",
              letterSpacing: "0.02em",
              transition: `all 0.25s ${EASE_OUT_EXPO}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.375rem",
              boxShadow: addRoomHovered
                ? `0 0.125rem 0.5rem rgba(64,59,54,0.06), 0 0 0.5rem rgba(184,92,56,0.12)`
                : "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={addRoomHovered ? "#9A4F2A" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transition: `stroke 0.25s ${EASE_OUT_EXPO}` }}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
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
            fontSize: "0.75rem",
            color: "#716A5E",
            letterSpacing: "0.01em",
          }}
        >
          {t("storageUsed", { count: String(totalMemories) })}
        </span>
        <span
          style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: "#716A5E",
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
        {/* iOS is free-tier only (Apple 3.1.1) — no upgrade steering, even to an
            internal page. Hidden on iOS; shown on web/Android. */}
        {!isIOS() && (
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
        )}
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
              background: `linear-gradient(90deg, transparent, rgba(184,92,56,0.4), transparent)`,
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
              color: "#403B36",
              border: `0.0625rem solid ${atriumHovered ? "#B85C38" : "#E3D6BC"}`,
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
                ? "0 0.125rem 0.5rem rgba(64,59,54,0.06)"
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
          data-nudge="nav_3d_btn"
          onClick={onEnter3D}
          onMouseEnter={() => setEnterHovered(true)}
          onMouseLeave={() => setEnterHovered(false)}
          style={{
            width: "100%",
            padding: "0.8125rem 1rem",
            borderRadius: "0.625rem",
            background: `linear-gradient(135deg, ${"#403B36"}, #3a3a38)`,
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
              ? `0 0.375rem 1.25rem rgba(64,59,54,0.22), 0 0 0.75rem ${T.color.gold}18`
              : "0 0.125rem 0.625rem rgba(64,59,54,0.12)",
            outline: enterHovered
              ? `0.0625rem solid rgba(184,92,56,0.27)`
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
