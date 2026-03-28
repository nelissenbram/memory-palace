"use client";
import { useMemo } from "react";
import { T } from "@/lib/theme";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { TRACKS } from "@/lib/constants/tracks";
import { GOAL_TRACK_PRIORITY } from "@/lib/constants/tracks";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";

interface TracksPanelProps {
  onClose: () => void;
}

export default function TracksPanel({ onClose }: TracksPanelProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("tracksPanel");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const { tracks, totalPoints, getLevelInfo, getLevelProgressInfo, setSelectedTrackId } = useTrackStore();
  const { userGoal } = useUserStore();
  const { userMems } = useMemoryStore();
  const levelInfo = getLevelInfo();

  // Collect all resolutions from all rooms
  const resolutions = useMemo(() => {
    const allMems: Record<string, Mem[]> = { ...ROOM_MEMS };
    for (const [k, v] of Object.entries(userMems)) { allMems[k] = v; }
    const results: Mem[] = [];
    for (const mems of Object.values(allMems)) {
      for (const m of mems) {
        if (m.resolution) results.push(m);
      }
    }
    return results;
  }, [userMems]);
  const progressInfo = getLevelProgressInfo();

  const goalPriority = GOAL_TRACK_PRIORITY[userGoal] || GOAL_TRACK_PRIORITY["preserve"];
  const sortedTracks = [...TRACKS].sort((a, b) => {
    const aIdx = goalPriority.indexOf(a.id);
    const bIdx = goalPriority.indexOf(b.id);
    return aIdx - bIdx;
  });

  const handleTrackClick = (trackId: string) => {
    setSelectedTrackId(trackId);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(42,34,24,.45)", backdropFilter: "blur(6px)",
      }} />

      {/* Panel */}
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} style={{
        position: "relative", zIndex: 1,
        width: "95%", maxWidth: "37.5rem", maxHeight: "85vh",
        background: T.color.linen, borderRadius: "1.25rem",
        boxShadow: "0 24px 80px rgba(44,44,42,.3)",
        border: `1px solid ${T.color.cream}`,
        display: "flex", flexDirection: "column",
        animation: "fadeUp .35s ease",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? "1rem 0.875rem 0.875rem" : "1.5rem 1.5rem 1.25rem", borderBottom: `1px solid ${T.color.cream}`,
          background: `linear-gradient(180deg, ${T.color.warmStone} 0%, ${T.color.linen} 100%)`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{
                fontFamily: T.font.display, fontSize: isMobile ? "1.375rem" : "1.625rem", fontWeight: 500,
                color: T.color.charcoal, margin: 0,
              }}>{t("title")}</h2>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginTop: "0.25rem",
              }}>
                {t("description")}
              </p>
            </div>
            <button onClick={onClose} style={{
              width: "2rem", height: "2rem", minWidth: "2.75rem", minHeight: "2.75rem", borderRadius: "1rem", border: `1px solid ${T.color.cream}`,
              background: T.color.white, cursor: "pointer", fontSize: "1rem", color: T.color.muted,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{"\u2715"}</button>
          </div>

          {/* Points & Level summary */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.875rem", marginTop: "1rem",
            padding: "0.75rem 1rem", borderRadius: "0.75rem",
            background: `${T.color.white}cc`, border: `1px solid ${levelInfo.color}22`,
          }}>
            <div style={{
              width: "2.75rem", height: "2.75rem", borderRadius: "1.375rem",
              background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}cc)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", fontWeight: 700, color: "#FFF", fontFamily: T.font.body,
              flexShrink: 0,
              boxShadow: `0 2px 8px ${levelInfo.color}30`,
            }}>{levelInfo.rank}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: T.color.charcoal }}>
                  {totalPoints} {t("mp")}
                </span>
                <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: levelInfo.color, fontWeight: 500 }}>
                  {levelInfo.title}
                </span>
              </div>
              <div style={{
                width: "100%", height: "0.375rem", borderRadius: "0.1875rem", marginTop: "0.375rem",
                background: `${T.color.sandstone}25`, overflow: "hidden",
              }}>
                <div style={{
                  width: `${progressInfo.progress * 100}%`, height: "100%", borderRadius: "0.1875rem",
                  background: progressInfo.nextLevel
                    ? `linear-gradient(90deg, ${levelInfo.color}, ${progressInfo.nextLevel.color})`
                    : `linear-gradient(90deg, ${levelInfo.color}, ${levelInfo.color}cc)`,
                  transition: "width .8s ease",
                }} />
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted, marginTop: "0.1875rem",
              }}>
                {progressInfo.nextLevel
                  ? `${progressInfo.pointsInLevel} / ${progressInfo.pointsNeeded} ${t("to")} ${progressInfo.nextLevel.title}`
                  : t("highestTier")}
              </div>
            </div>
          </div>
        </div>

        {/* Track cards */}
        <div style={{
          flex: 1, overflowY: "auto", padding: isMobile ? "0.75rem 0.75rem 1.25rem" : "1rem 1.25rem 1.5rem",
          display: "flex", flexDirection: "column", gap: "0.75rem",
        }}>
          {/* My Resolutions mini-section */}
          {resolutions.length > 0 && <div style={{
            padding: "1rem", borderRadius: "0.875rem",
            border: `1px solid ${T.color.sage}30`,
            background: "linear-gradient(135deg, rgba(74,103,65,.05), rgba(74,103,65,.02))",
            marginBottom: "0.25rem",
          }}>
            <div style={{
              fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
              color: T.color.sage, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem",
            }}>
              {t("myResolutions")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {resolutions.map((m) => {
                const pct = m.resolution?.progress ?? 0;
                const hasTarget = !!m.resolution?.targetDate;
                const daysLeft = hasTarget ? Math.ceil((new Date(m.resolution!.targetDate! + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                return (
                  <div key={m.id} style={{
                    padding: "0.625rem 0.875rem", borderRadius: "0.625rem",
                    background: T.color.white, border: `1px solid ${T.color.cream}`,
                  }}>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                      color: T.color.charcoal, marginBottom: "0.25rem",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{m.resolution?.goal}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                      <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted }}>{m.title}</span>
                      {hasTarget && daysLeft !== null && (
                        <span style={{
                          fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600,
                          color: daysLeft > 0 ? T.color.sage : T.color.error,
                          marginLeft: "auto",
                        }}>
                          {daysLeft > 0 ? t("daysLeft", { count: String(daysLeft) }) : t("pastDue")}
                        </span>
                      )}
                    </div>
                    {typeof m.resolution?.progress === "number" && <div>
                      <div style={{
                        width: "100%", height: "0.3125rem", borderRadius: "0.1875rem",
                        background: `${T.color.sandstone}20`, overflow: "hidden",
                      }}>
                        <div style={{
                          width: `${pct}%`, height: "100%", borderRadius: "0.1875rem",
                          background: pct >= 100
                            ? `linear-gradient(90deg,${T.color.success},#5A8751)`
                            : `linear-gradient(90deg,${T.color.sage}cc,${T.color.sage})`,
                          transition: "width .8s ease",
                        }} />
                      </div>
                      <div style={{
                        fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted,
                        marginTop: "0.1875rem", textAlign: "right",
                      }}>{pct}%</div>
                    </div>}
                  </div>
                );
              })}
            </div>
          </div>}
          {sortedTracks.map((track, i) => {
            const progress = tracks[track.id];
            const stepsCompleted = progress?.stepsCompleted.length || 0;
            const totalSteps = track.steps.length;
            const pct = progress?.percentage || 0;
            const isComplete = !!progress?.completedAt;
            const isRecommended = goalPriority[0] === track.id;
            const nextStep = track.steps.find((s) => !progress?.stepsCompleted.includes(s.id));

            return (
              <button
                key={track.id}
                onClick={() => handleTrackClick(track.id)}
                style={{
                  display: "flex", flexDirection: "column", gap: "0.625rem",
                  padding: isMobile ? "0.75rem 0.75rem" : "1rem 1.125rem", borderRadius: "0.875rem",
                  border: isRecommended ? `2px solid ${track.color}44` : `1px solid ${T.color.cream}`,
                  background: isComplete ? `${track.color}08` : T.color.white,
                  cursor: "pointer", textAlign: "left", transition: "all .2s",
                  position: "relative", overflow: "hidden",
                  animation: `fadeUp .4s ease ${i * 0.06}s both`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 4px 20px ${track.color}18`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {/* Recommended badge */}
                {isRecommended && !isComplete && (
                  <div style={{
                    position: "absolute", top: "0.625rem", right: "0.75rem",
                    fontFamily: T.font.body, fontSize: "0.5625rem", fontWeight: 600,
                    color: track.color, textTransform: "uppercase", letterSpacing: "0.0625rem",
                    padding: "0.1875rem 0.5rem", borderRadius: "0.375rem",
                    background: `${track.color}15`, border: `1px solid ${track.color}25`,
                  }}>{t("recommended")}</div>
                )}

                {/* Completed badge */}
                {isComplete && (
                  <div style={{
                    position: "absolute", top: "0.625rem", right: "0.75rem",
                    fontFamily: T.font.body, fontSize: "0.5625rem", fontWeight: 600,
                    color: T.color.success, textTransform: "uppercase", letterSpacing: "0.0625rem",
                    padding: "0.1875rem 0.5rem", borderRadius: "0.375rem",
                    background: `${T.color.success}15`, border: `1px solid ${T.color.success}25`,
                  }}>{t("complete")}</div>
                )}

                {/* Top row: icon + name */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem",
                    background: `${track.color}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.25rem", flexShrink: 0,
                  }}>{track.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
                      color: T.color.charcoal,
                    }}>{t(track.nameKey)}</div>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
                      lineHeight: 1.4,
                    }}>{t(track.descriptionKey)}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted }}>
                      {stepsCompleted} {t("of")} {totalSteps} {t("steps")}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                      color: pct >= 100 ? T.color.success : track.color,
                    }}>{pct}%</span>
                  </div>
                  <div style={{
                    width: "100%", height: "0.375rem", borderRadius: "0.1875rem",
                    background: `${T.color.sandstone}20`, overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${pct}%`, height: "100%", borderRadius: "0.1875rem",
                      background: isComplete
                        ? `linear-gradient(90deg,${T.color.success},#5A8751)`
                        : `linear-gradient(90deg,${track.color}cc,${track.color})`,
                      transition: "width .8s ease",
                    }} />
                  </div>
                </div>

                {/* Next step hint */}
                {nextStep && !isComplete && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.375rem 0.625rem", borderRadius: "0.5rem",
                    background: `${track.color}08`,
                  }}>
                    <div style={{
                      width: "0.375rem", height: "0.375rem", borderRadius: "0.1875rem",
                      background: track.color, flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.walnut,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                    }}>
                      {t("next")} {t(nextStep.titleKey)}
                    </span>
                    <span style={{
                      marginLeft: "auto", fontFamily: T.font.body, fontSize: "0.625rem",
                      color: T.color.muted,
                    }}>{"\u2192"}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
