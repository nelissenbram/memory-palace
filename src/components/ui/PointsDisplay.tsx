"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useTrackStore } from "@/lib/stores/trackStore";

/** Small Memory Points + Level badge for the StatusBar area. Click to open tracks panel. */
export default function PointsDisplay({ onClick }: { onClick?: () => void }) {
  const { t } = useTranslation("pointsDisplay");
  const { t: tl } = useTranslation("levels");
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
        title={`${tl(levelInfo.titleKey)} \u2014 ${totalPoints} ${t("title")}`}
        aria-label={`${tl(levelInfo.titleKey)} \u2014 ${totalPoints} ${t("title")}`}
        style={{
          display: "flex", alignItems: "center", gap: "0.375rem",
          height: "2rem", borderRadius: "1rem", padding: "0 0.625rem 0 0.375rem",
          background: "transparent",
          border: "none",
          cursor: "pointer", transition: "background .15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${T.color.sandstone}18`; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        {/* Level emblem */}
        <div style={{
          width: "1.375rem", height: "1.375rem", borderRadius: "0.6875rem",
          background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}dd)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.625rem", fontWeight: 700, color: "#FFF",
          fontFamily: T.font.body,
          boxShadow: `0 1px 4px ${levelInfo.color}40`,
        }}>
          {levelInfo.rank}
        </div>
        {/* Points with MP suffix */}
        <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, color: T.color.walnut }}>
          {totalPoints} <span style={{ fontSize: "0.625rem", fontWeight: 500, color: T.color.goldLight }}>{t("mp")}</span>
        </span>
        {/* Mini progress bar */}
        <div style={{
          width: "2rem", height: "0.1875rem", borderRadius: "0.125rem",
          background: `${T.color.sandstone}33`, overflow: "hidden",
        }}>
          <div style={{
            width: `${progressInfo.progress * 100}%`, height: "100%", borderRadius: "0.125rem",
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
            position: "absolute", top: "100%", right: 0, marginTop: "0.5rem",
            width: "17.5rem", background: `${T.color.linen}f8`, backdropFilter: "blur(16px)",
            borderRadius: "0.875rem", border: `1px solid ${T.color.cream}`,
            boxShadow: "0 8px 40px rgba(44,44,42,.18)", padding: "1rem",
            zIndex: 99, animation: "fadeUp .25s ease",
          }}>
            {/* Header with level title */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.875rem" }}>
              <div style={{
                width: "2.5rem", height: "2.5rem", borderRadius: "1.25rem",
                background: `linear-gradient(135deg, ${levelInfo.color}22, ${levelInfo.color}11)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  width: "1.75rem", height: "1.75rem", borderRadius: "0.875rem",
                  background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}dd)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 700, color: "#FFF", fontFamily: T.font.body,
                  boxShadow: `0 2px 8px ${levelInfo.color}30`,
                }}>{levelInfo.rank}</div>
              </div>
              <div>
                <div style={{ fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600, color: T.color.charcoal }}>
                  {tl(levelInfo.titleKey)}
                </div>
                <div style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>
                  {totalPoints} {t("title")}
                </div>
              </div>
            </div>

            {/* Progress to next level */}
            {progressInfo.nextLevel ? (
              <div style={{ marginBottom: "0.875rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted }}>
                    {t("next", { level: tl(progressInfo.nextLevel.titleKey) })}
                  </span>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.walnut, fontWeight: 600 }}>
                    {progressInfo.pointsInLevel}/{progressInfo.pointsNeeded}
                  </span>
                </div>
                <div style={{
                  width: "100%", height: "0.375rem", borderRadius: "0.1875rem",
                  background: `${T.color.sandstone}25`, overflow: "hidden",
                }}>
                  <div style={{
                    width: `${progressInfo.progress * 100}%`, height: "100%", borderRadius: "0.1875rem",
                    background: `linear-gradient(90deg, ${levelInfo.color}, ${progressInfo.nextLevel.color})`,
                    transition: "width .6s ease",
                  }} />
                </div>
              </div>
            ) : (
              <div style={{
                marginBottom: "0.875rem", padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
                background: `${levelInfo.color}10`, border: `1px solid ${levelInfo.color}20`,
              }}>
                <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: levelInfo.color, fontWeight: 500 }}>
                  {t("highestTier")}
                </span>
              </div>
            )}

            {/* Recent points */}
            {pointsHistory.length > 0 && (
              <div>
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600,
                  color: T.color.muted, textTransform: "uppercase", letterSpacing: "0.0625rem",
                  marginBottom: "0.5rem",
                }}>{t("recent")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", maxHeight: "9.375rem", overflowY: "auto" }}>
                  {pointsHistory.slice(0, 8).map((entry) => (
                    <div key={entry.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "0.25rem 0",
                    }}>
                      <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.charcoal }}>
                        {entry.reason === "track_step" ? t("stepCompleted") :
                         entry.reason === "track_complete" ? t("trackCompleted") :
                         entry.reason === "daily_visit" ? t("dailyVisit") : t("achievement")}
                      </span>
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
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
