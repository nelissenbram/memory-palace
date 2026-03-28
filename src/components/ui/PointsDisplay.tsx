"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useTrackStore } from "@/lib/stores/trackStore";

/** Small Memory Points + Level badge for the StatusBar area. Click to open tracks panel. */
export default function PointsDisplay({ onClick }: { onClick?: () => void }) {
  const { t } = useTranslation("pointsDisplay");
  const { totalPoints, getLevelInfo, getLevelProgressInfo, pointsHistory } = useTrackStore();
  const [expanded, setExpanded] = useState(false);
  const levelInfo = getLevelInfo();
  const progressInfo = getLevelProgressInfo();

  const handleClick = () => {
    if (onClick) { onClick(); return; }
    setExpanded(!expanded);
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Main badge */}
      <button
        onClick={handleClick}
        title={`${levelInfo.title} \u2014 ${totalPoints} ${t("title")}`}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          height: 32, borderRadius: 16, padding: "0 10px 0 6px",
          background: "transparent",
          border: "none",
          cursor: "pointer", transition: "background .15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${T.color.sandstone}18`; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        {/* Level emblem */}
        <div style={{
          width: 22, height: 22, borderRadius: 11,
          background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}dd)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, color: "#FFF",
          fontFamily: T.font.body,
          boxShadow: `0 1px 4px ${levelInfo.color}40`,
        }}>
          {levelInfo.rank}
        </div>
        {/* Points with MP suffix */}
        <span style={{ fontFamily: T.font.body, fontSize: 12, fontWeight: 600, color: T.color.walnut }}>
          {totalPoints} <span style={{ fontSize: 10, fontWeight: 500, color: T.color.goldLight }}>{t("mp")}</span>
        </span>
        {/* Mini progress bar */}
        <div style={{
          width: 32, height: 3, borderRadius: 2,
          background: `${T.color.sandstone}33`, overflow: "hidden",
        }}>
          <div style={{
            width: `${progressInfo.progress * 100}%`, height: "100%", borderRadius: 2,
            background: `linear-gradient(90deg, ${levelInfo.color}, ${levelInfo.color}cc)`,
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
            width: 280, background: `${T.color.linen}f8`, backdropFilter: "blur(16px)",
            borderRadius: 14, border: `1px solid ${T.color.cream}`,
            boxShadow: "0 8px 40px rgba(44,44,42,.18)", padding: 16,
            zIndex: 99, animation: "fadeUp .25s ease",
          }}>
            {/* Header with level title */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 20,
                background: `linear-gradient(135deg, ${levelInfo.color}22, ${levelInfo.color}11)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 14,
                  background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}dd)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "#FFF", fontFamily: T.font.body,
                  boxShadow: `0 2px 8px ${levelInfo.color}30`,
                }}>{levelInfo.rank}</div>
              </div>
              <div>
                <div style={{ fontFamily: T.font.display, fontSize: 17, fontWeight: 600, color: T.color.charcoal }}>
                  {levelInfo.title}
                </div>
                <div style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.muted }}>
                  {totalPoints} {t("title")}
                </div>
              </div>
            </div>

            {/* Progress to next level */}
            {progressInfo.nextLevel ? (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: T.font.body, fontSize: 10, color: T.color.muted }}>
                    {t("next", { level: progressInfo.nextLevel.title })}
                  </span>
                  <span style={{ fontFamily: T.font.body, fontSize: 10, color: T.color.walnut, fontWeight: 600 }}>
                    {progressInfo.pointsInLevel}/{progressInfo.pointsNeeded}
                  </span>
                </div>
                <div style={{
                  width: "100%", height: 6, borderRadius: 3,
                  background: `${T.color.sandstone}25`, overflow: "hidden",
                }}>
                  <div style={{
                    width: `${progressInfo.progress * 100}%`, height: "100%", borderRadius: 3,
                    background: `linear-gradient(90deg, ${levelInfo.color}, ${progressInfo.nextLevel.color})`,
                    transition: "width .6s ease",
                  }} />
                </div>
              </div>
            ) : (
              <div style={{
                marginBottom: 14, padding: "8px 12px", borderRadius: 8,
                background: `${levelInfo.color}10`, border: `1px solid ${levelInfo.color}20`,
              }}>
                <span style={{ fontFamily: T.font.body, fontSize: 11, color: levelInfo.color, fontWeight: 500 }}>
                  {t("highestTier")}
                </span>
              </div>
            )}

            {/* Recent points */}
            {pointsHistory.length > 0 && (
              <div>
                <div style={{
                  fontFamily: T.font.body, fontSize: 10, fontWeight: 600,
                  color: T.color.muted, textTransform: "uppercase", letterSpacing: 1,
                  marginBottom: 8,
                }}>{t("recent")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto" }}>
                  {pointsHistory.slice(0, 8).map((entry) => (
                    <div key={entry.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "4px 0",
                    }}>
                      <span style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.charcoal }}>
                        {entry.reason === "track_step" ? t("stepCompleted") :
                         entry.reason === "track_complete" ? t("trackCompleted") :
                         entry.reason === "daily_visit" ? t("dailyVisit") : t("achievement")}
                      </span>
                      <span style={{
                        fontFamily: T.font.body, fontSize: 11, fontWeight: 600,
                        color: T.color.goldLight,
                      }}>+{entry.points} {t("mp")}</span>
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
