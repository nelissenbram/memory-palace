"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import { useTrackStore } from "@/lib/stores/trackStore";

/** Small Memory Points + Level badge for the TopBar / FAB area */
export default function PointsDisplay({ onClick }: { onClick?: () => void }) {
  const { totalPoints, getLevel, getPointsToNextLevel, pointsHistory } = useTrackStore();
  const [expanded, setExpanded] = useState(false);
  const level = getLevel();
  const { current, needed, progress } = getPointsToNextLevel();

  const handleClick = () => {
    if (onClick) { onClick(); return; }
    setExpanded(!expanded);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Main badge */}
      <button
        onClick={handleClick}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          height: 32, borderRadius: 16, padding: "0 8px 0 6px",
          background: "transparent",
          border: "none",
          cursor: "pointer", transition: "background .15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${T.color.sandstone}18`; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        {/* Level badge */}
        <div style={{
          width: 22, height: 22, borderRadius: 11,
          background: "linear-gradient(135deg,#C9A84C,#D4AF37)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, color: "#FFF",
          fontFamily: T.font.body,
        }}>
          {level}
        </div>
        {/* Points */}
        <span style={{ fontFamily: T.font.body, fontSize: 12, fontWeight: 600, color: T.color.walnut }}>
          {totalPoints}
        </span>
        {/* Mini progress bar */}
        <div style={{
          width: 32, height: 3, borderRadius: 2,
          background: `${T.color.sandstone}33`, overflow: "hidden",
        }}>
          <div style={{
            width: `${progress * 100}%`, height: "100%", borderRadius: 2,
            background: "linear-gradient(90deg,#C9A84C,#D4AF37)",
            transition: "width .6s ease",
          }} />
        </div>
      </button>

      {/* Expanded dropdown */}
      {expanded && (
        <>
          <div onClick={() => setExpanded(false)} style={{ position: "fixed", inset: 0, zIndex: 98 }} />
          <div style={{
            position: "absolute", top: "100%", right: 0, marginTop: 8,
            width: 260, background: `${T.color.linen}f8`, backdropFilter: "blur(16px)",
            borderRadius: 14, border: `1px solid ${T.color.cream}`,
            boxShadow: "0 8px 40px rgba(44,44,42,.18)", padding: 16,
            zIndex: 99, animation: "fadeUp .25s ease",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 18,
                background: "linear-gradient(135deg,#C9A84C22,#D4AF3722)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 12,
                  background: "linear-gradient(135deg,#C9A84C,#D4AF37)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#FFF", fontFamily: T.font.body,
                }}>{level}</div>
              </div>
              <div>
                <div style={{ fontFamily: T.font.display, fontSize: 16, fontWeight: 600, color: T.color.charcoal }}>
                  Level {level}
                </div>
                <div style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.muted }}>
                  {totalPoints} Memory Points
                </div>
              </div>
            </div>

            {/* Progress to next level */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontFamily: T.font.body, fontSize: 10, color: T.color.muted }}>
                  Next level
                </span>
                <span style={{ fontFamily: T.font.body, fontSize: 10, color: T.color.walnut, fontWeight: 600 }}>
                  {current}/{needed}
                </span>
              </div>
              <div style={{
                width: "100%", height: 6, borderRadius: 3,
                background: `${T.color.sandstone}25`, overflow: "hidden",
              }}>
                <div style={{
                  width: `${progress * 100}%`, height: "100%", borderRadius: 3,
                  background: "linear-gradient(90deg,#C9A84C,#D4AF37)",
                  transition: "width .6s ease",
                }} />
              </div>
            </div>

            {/* Recent points */}
            {pointsHistory.length > 0 && (
              <div>
                <div style={{
                  fontFamily: T.font.body, fontSize: 10, fontWeight: 600,
                  color: T.color.muted, textTransform: "uppercase", letterSpacing: 1,
                  marginBottom: 8,
                }}>Recent</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto" }}>
                  {pointsHistory.slice(0, 8).map((entry) => (
                    <div key={entry.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "4px 0",
                    }}>
                      <span style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.charcoal }}>
                        {entry.reason === "track_step" ? "Step completed" :
                         entry.reason === "track_complete" ? "Track completed!" :
                         entry.reason === "daily_visit" ? "Daily visit" : "Achievement"}
                      </span>
                      <span style={{
                        fontFamily: T.font.body, fontSize: 11, fontWeight: 600,
                        color: "#C9A84C",
                      }}>+{entry.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
