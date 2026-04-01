"use client";
import { useState, useMemo, useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useRoomStore } from "@/lib/stores/roomStore";
import type { Wing } from "@/lib/constants/wings";

interface LibrarySidebarProps {
  wings: Wing[];
  selectedWing: string;
  onSelectWing: (wingId: string) => void;
  wingMemCount: (wingId: string) => number;
  onEnter3D: () => void;
  isMobile: boolean;
  onGoAtrium?: () => void;
}

const PROGRESS_BASELINE = 20;
const EASE_OUT_EXPO = "cubic-bezier(0.22, 1, 0.36, 1)";

export default function LibrarySidebar({
  wings,
  selectedWing,
  onSelectWing,
  wingMemCount,
  onEnter3D,
  isMobile,
  onGoAtrium,
}: LibrarySidebarProps) {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { getWingRooms } = useRoomStore();

  const [hoveredWing, setHoveredWing] = useState<string | null>(null);
  const [enterHovered, setEnterHovered] = useState(false);
  const [atriumHovered, setAtriumHovered] = useState(false);
  const [settingsHovered, setSettingsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const totalMemories = useMemo(
    () => wings.reduce((sum, w) => sum + wingMemCount(w.id), 0),
    [wings, wingMemCount],
  );

  const visibleWings = wings.filter((w) => w.id !== "attic");

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
                padding: "0.5rem 1rem",
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
              <span style={{ fontSize: "0.875rem", lineHeight: 1 }}>
                {w.icon}
              </span>
              {w.name}
            </button>
          );
        })}
      </nav>
    );
  }

  // ── DESKTOP: premium frosted-glass sidebar ──
  return (
    <nav
      className="lsb-desktop-nav"
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
            <button
              key={w.id}
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
                  ? `0.1875rem solid ${w.accent}`
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
                {w.icon}
              </div>

              {/* Name + subtitle + progress */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: T.font.display,
                    fontSize: "0.9375rem",
                    fontWeight: active ? 600 : 500,
                    color: active ? T.color.charcoal : T.color.walnut,
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.015em",
                    transition: `color 0.2s ${EASE_OUT_EXPO}`,
                  }}
                >
                  {w.name}
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
                      background: `linear-gradient(90deg, ${w.accent}55, ${w.accent}99)`,
                      borderRadius: "0.0625rem",
                      animation: mounted
                        ? `lsb-progress-fill 0.7s ${EASE_OUT_EXPO} ${index * 0.05 + 0.4}s both`
                        : "none",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>

              {/* Chevron — slides right on hover */}
              <span
                style={{
                  fontSize: "0.875rem",
                  color: active ? w.accent : T.color.muted,
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
          );
        })}
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

        {/* Settings link */}
        <a
          href="/settings"
          onMouseEnter={() => setSettingsHovered(true)}
          onMouseLeave={() => setSettingsHovered(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.5rem 0.625rem",
            borderRadius: "0.5rem",
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.muted,
            textDecoration: "none",
            transition: `all 0.25s ${EASE_OUT_EXPO}`,
            background: settingsHovered ? "rgba(255,255,255,0.45)" : "transparent",
            boxShadow: settingsHovered
              ? `0 0 0.5rem ${T.color.gold}15`
              : "none",
          }}
        >
          <div
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              background: settingsHovered ? `${T.color.muted}20` : `${T.color.muted}12`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "0.9375rem",
              lineHeight: 1,
              transition: `all 0.25s ${EASE_OUT_EXPO}`,
            }}
          >
            {"\u2699\uFE0F"}
          </div>
          {tc("settings")}
        </a>

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
              border: `0.0625rem solid ${atriumHovered ? T.color.sandstone : T.color.cream}`,
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
            {t("atrium") ?? "Atrium"}
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
            borderImage: enterHovered
              ? `linear-gradient(135deg, ${T.color.gold}88, ${T.color.goldLight}44, ${T.color.gold}88) 1`
              : "none",
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
          <span style={{ fontSize: "1rem", lineHeight: 1, filter: "brightness(1.1)" }}>
            {"\u{1F3DB}\uFE0F"}
          </span>
          {t("enterPalace")}
        </button>
      </div>
    </nav>
  );
}
