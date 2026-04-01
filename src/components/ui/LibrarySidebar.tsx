"use client";
import { useState, useMemo } from "react";
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
}

const PROGRESS_BASELINE = 20;

export default function LibrarySidebar({
  wings,
  selectedWing,
  onSelectWing,
  wingMemCount,
  onEnter3D,
  isMobile,
}: LibrarySidebarProps) {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { getWingRooms } = useRoomStore();

  const [hoveredWing, setHoveredWing] = useState<string | null>(null);
  const [enterHovered, setEnterHovered] = useState(false);
  const [settingsHovered, setSettingsHovered] = useState(false);

  const totalMemories = useMemo(
    () => wings.reduce((sum, w) => sum + wingMemCount(w.id), 0),
    [wings, wingMemCount],
  );

  const visibleWings = wings.filter((w) => w.id !== "attic");

  // ── MOBILE: horizontal scrollable strip ──
  if (isMobile) {
    return (
      <nav
        style={{
          width: "100%",
          height: "auto",
          background: "rgba(242,237,231,0.85)",
          backdropFilter: "blur(1.25rem)",
          WebkitBackdropFilter: "blur(1.25rem)",
          borderBottom: `0.0625rem solid ${T.color.cream}`,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          overflowX: "auto",
          overflowY: "hidden",
          flexShrink: 0,
          padding: "0.5rem 0.75rem",
          gap: "0.5rem",
          scrollBehavior: "smooth",
          msOverflowStyle: "none" as any,
          scrollbarWidth: "none" as any,
        }}
      >
        {/* Hide scrollbar via inline style hack — CSS module-free */}
        <style>{`
          nav::-webkit-scrollbar { display: none; }
        `}</style>
        {visibleWings.map((w) => {
          const active = w.id === selectedWing;
          return (
            <button
              key={w.id}
              onClick={() => onSelectWing(w.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.4375rem 0.875rem",
                borderRadius: "1.25rem",
                border: "none",
                background: active ? w.accent : "rgba(255,255,255,0.6)",
                color: active ? T.color.white : T.color.walnut,
                cursor: "pointer",
                fontFamily: T.font.display,
                fontSize: "0.8125rem",
                fontWeight: active ? 600 : 500,
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "all 0.2s ease",
                boxShadow: active
                  ? `0 0.125rem 0.5rem ${w.accent}33`
                  : "none",
              }}
            >
              <span style={{ fontSize: "0.9375rem", lineHeight: 1 }}>
                {w.icon}
              </span>
              {w.name}
            </button>
          );
        })}
      </nav>
    );
  }

  // ── DESKTOP: full sidebar ──
  return (
    <nav
      style={{
        width: "16.5rem",
        minWidth: "16.5rem",
        height: "100%",
        background: "rgba(242,237,231,0.85)",
        backdropFilter: "blur(1.25rem)",
        WebkitBackdropFilter: "blur(1.25rem)",
        borderRight: `0.0625rem solid ${T.color.cream}`,
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      {/* ── Header ── */}
      <div style={{ padding: "1.5rem 1.25rem 1rem" }}>
        <h1
          style={{
            fontFamily: T.font.display,
            fontSize: "1.5rem",
            fontWeight: 300,
            color: T.color.charcoal,
            margin: 0,
            letterSpacing: "0.08em",
            lineHeight: 1.2,
          }}
        >
          {t("sidebarTitle")}
        </h1>
        <p
          style={{
            fontFamily: T.font.body,
            fontSize: "0.75rem",
            color: T.color.muted,
            margin: "0.375rem 0 0",
            letterSpacing: "0.01em",
          }}
        >
          {t("sidebarSubtitle", {
            count: String(totalMemories),
            wings: String(visibleWings.length),
          })}
        </p>
        {/* Decorative gradient line */}
        <div
          style={{
            marginTop: "1rem",
            height: "0.0625rem",
            background: `linear-gradient(90deg, ${T.color.gold}, ${T.color.goldLight}66, transparent)`,
            borderRadius: "0.0625rem",
          }}
        />
      </div>

      {/* ── Wing list ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "0.25rem 0",
          flex: 1,
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
                  padding: "1rem 1.25rem",
                  width: "100%",
                  background: active
                    ? T.color.white
                    : hovered
                      ? "rgba(255,255,255,0.5)"
                      : "transparent",
                  border: "none",
                  borderLeft: active
                    ? `0.1875rem solid ${w.accent}`
                    : hovered
                      ? `0.1875rem solid ${w.accent}44`
                      : "0.1875rem solid transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  boxShadow: active
                    ? "0 0.0625rem 0.25rem rgba(44,44,42,0.04)"
                    : "none",
                  position: "relative",
                }}
              >
                {/* Icon circle */}
                <div
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "50%",
                    background: `${w.accent}1A`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "1.125rem",
                    lineHeight: 1,
                    transition: "background 0.2s ease",
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
                      letterSpacing: "0.01em",
                      transition: "color 0.2s ease",
                    }}
                  >
                    {w.name}
                  </span>
                  <span
                    style={{
                      fontFamily: T.font.body,
                      fontSize: "0.75rem",
                      color: T.color.muted,
                      display: "block",
                      marginTop: "0.125rem",
                    }}
                  >
                    {t("wingCount", {
                      rooms: String(roomCount),
                      memories: String(memCount),
                    })}
                  </span>
                  {/* Progress bar */}
                  <div
                    style={{
                      marginTop: "0.375rem",
                      height: "0.125rem",
                      width: "100%",
                      background: `${T.color.cream}`,
                      borderRadius: "0.0625rem",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${progressRatio * 100}%`,
                        background: `${w.accent}66`,
                        borderRadius: "0.0625rem",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>

                {/* Chevron */}
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: T.color.muted,
                    opacity: hovered || active ? 1 : 0,
                    transition: "opacity 0.2s ease",
                    flexShrink: 0,
                    fontFamily: T.font.body,
                  }}
                >
                  {"\u203A"}
                </span>
              </button>

              {/* Separator line between wings */}
              {index < visibleWings.length - 1 && (
                <div
                  style={{
                    height: "0.0625rem",
                    background: T.color.cream,
                    marginLeft: "1.25rem",
                    marginRight: "1.25rem",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom section ── */}
      <div
        style={{
          marginTop: "auto",
          padding: "0.75rem 1.25rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {/* Divider */}
        <div
          style={{
            height: "0.0625rem",
            background: `linear-gradient(90deg, transparent, ${T.color.cream}, transparent)`,
            marginBottom: "0.25rem",
          }}
        />

        {/* Settings link */}
        <a
          href="/settings"
          onMouseEnter={() => setSettingsHovered(true)}
          onMouseLeave={() => setSettingsHovered(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.625rem 0.5rem",
            borderRadius: "0.5rem",
            fontFamily: T.font.body,
            fontSize: "0.8125rem",
            color: T.color.muted,
            textDecoration: "none",
            transition: "all 0.2s ease",
            background: settingsHovered ? "rgba(255,255,255,0.4)" : "transparent",
          }}
        >
          <div
            style={{
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "50%",
              background: `${T.color.muted}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "1rem",
              lineHeight: 1,
            }}
          >
            {"\u2699\uFE0F"}
          </div>
          {tc("settings")}
        </a>

        {/* Enter 3D Palace button */}
        <button
          onClick={onEnter3D}
          onMouseEnter={() => setEnterHovered(true)}
          onMouseLeave={() => setEnterHovered(false)}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            borderRadius: "0.625rem",
            background: enterHovered
              ? `linear-gradient(135deg, ${T.color.charcoal}, #3a3a38)`
              : `linear-gradient(135deg, ${T.color.charcoal}, #353533)`,
            color: T.color.linen,
            border: "none",
            cursor: "pointer",
            fontFamily: T.font.display,
            fontSize: "0.875rem",
            fontWeight: 500,
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease",
            transform: enterHovered ? "scale(1.02)" : "scale(1)",
            boxShadow: enterHovered
              ? "0 0.25rem 1rem rgba(44,44,42,0.2)"
              : "0 0.125rem 0.5rem rgba(44,44,42,0.1)",
          }}
        >
          <span style={{ fontSize: "1rem", lineHeight: 1 }}>
            {"\u{1F3DB}\uFE0F"}
          </span>
          {t("enterPalace")}
        </button>
      </div>
    </nav>
  );
}
