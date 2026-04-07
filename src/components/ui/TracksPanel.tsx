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
import TrackIcon from "./TrackIcons";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";

interface TracksPanelProps {
  onClose: () => void;
}

export default function TracksPanel({ onClose }: TracksPanelProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("tracksPanel");
  const { t: tc } = useTranslation("common");
  const { t: tl } = useTranslation("levels");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const { tracks, totalPoints, getLevelInfo, getLevelProgressInfo, setSelectedTrackId } = useTrackStore();
  const { userGoal } = useUserStore();
  const { userMems } = useMemoryStore();
  const levelInfo = getLevelInfo();

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

  /* Shared style: forces any child to respect card boundary */
  const clampLine: React.CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
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
        boxShadow: "0 1.5rem 5rem rgba(44,44,42,.3)",
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
            <div style={{ flex: 1, minWidth: 0 }}>
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
            <button onClick={onClose} aria-label={tc("close")} style={{
              width: "2.75rem", height: "2.75rem", borderRadius: "1rem", border: `1px solid ${T.color.cream}`,
              background: T.color.white, cursor: "pointer", fontSize: "1rem", color: T.color.muted,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "opacity .15s", flexShrink: 0,
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >{"\u2715"}</button>
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
              fontSize: "1rem", fontWeight: 700, color: T.color.white, fontFamily: T.font.body,
              flexShrink: 0,
              boxShadow: `0 0.125rem 0.5rem ${levelInfo.color}30`,
            }}>{levelInfo.rank}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: T.color.charcoal }}>
                  {totalPoints} {t("mp")}
                </span>
                <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: levelInfo.color, fontWeight: 500 }}>
                  {tl(levelInfo.titleKey)}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={Math.round(progressInfo.progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{
                  width: "100%", height: "0.375rem", borderRadius: "0.1875rem", marginTop: "0.375rem",
                  background: `${T.color.sandstone}25`, overflow: "hidden",
                }}
              >
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
                  ? `${progressInfo.pointsInLevel} / ${progressInfo.pointsNeeded} ${t("to")} ${tl(progressInfo.nextLevel.titleKey)}`
                  : t("highestTier")}
              </div>
            </div>
          </div>
        </div>

        {/* Track cards — scrollable area */}
        <div style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          padding: isMobile ? "0.75rem" : "1rem 1.25rem 1.5rem",
        }}>
          {/* My Resolutions mini-section */}
          {resolutions.length > 0 && <div style={{
            padding: "1rem", borderRadius: "0.875rem",
            border: `1px solid ${T.color.sage}30`,
            background: "linear-gradient(135deg, rgba(74,103,65,.05), rgba(74,103,65,.02))",
            marginBottom: "0.75rem",
          }}>
            <div style={{
              fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
              color: T.color.sage, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem",
            }}>
              {t("myResolutions")}
            </div>
            {resolutions.map((m) => {
              const pct = m.resolution?.progress ?? 0;
              const hasTarget = !!m.resolution?.targetDate;
              const daysLeft = hasTarget ? Math.ceil((new Date(m.resolution!.targetDate! + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
              return (
                <div key={m.id} style={{
                  padding: "0.625rem 0.875rem", borderRadius: "0.625rem",
                  background: T.color.white, border: `1px solid ${T.color.cream}`,
                  marginBottom: "0.5rem",
                }}>
                  <div style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                    color: T.color.charcoal, marginBottom: "0.25rem",
                    ...clampLine,
                  }}>{m.resolution?.goal}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, ...clampLine, flex: 1, minWidth: 0 }}>{m.title}</span>
                    {hasTarget && daysLeft !== null && (
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600,
                        color: daysLeft > 0 ? T.color.sage : T.color.error,
                        flexShrink: 0,
                      }}>
                        {daysLeft > 0 ? t("daysLeft", { count: String(daysLeft) }) : t("pastDue")}
                      </span>
                    )}
                  </div>
                  {typeof m.resolution?.progress === "number" && <div>
                    <div
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      style={{
                        width: "100%", height: "0.3125rem", borderRadius: "0.1875rem",
                        background: `${T.color.sandstone}20`, overflow: "hidden",
                      }}
                    >
                      <div style={{
                        width: `${pct}%`, height: "100%", borderRadius: "0.1875rem",
                        background: pct >= 100
                          ? `linear-gradient(90deg,${T.color.success},${T.color.sage})`
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
          </div>}

          {/* Track cards */}
          {sortedTracks.map((track, i) => {
            const progress = tracks[track.id];
            const stepsCompleted = progress?.stepsCompleted.length || 0;
            const totalSteps = track.steps.length;
            const pct = progress?.percentage || 0;
            const isComplete = !!progress?.completedAt;
            const isRecommended = goalPriority[0] === track.id;
            const nextStep = track.steps.find((s) => !progress?.stepsCompleted.includes(s.id));

            return (
              <div
                key={track.id}
                role="button"
                tabIndex={0}
                onClick={() => handleTrackClick(track.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleTrackClick(track.id); } }}
                style={{
                  padding: isMobile ? "0.75rem" : "1rem 1.125rem",
                  borderRadius: "0.875rem",
                  border: isRecommended ? `2px solid ${track.color}44` : `1px solid ${T.color.cream}`,
                  background: isComplete ? `${track.color}08` : T.color.white,
                  cursor: "pointer", textAlign: "left",
                  transition: "all .2s",
                  marginBottom: "0.75rem",
                  /* KEY: contain prevents any child from overflowing */
                  contain: "inline-size",
                  overflow: "hidden",
                  animation: `fadeUp .4s ease ${i * 0.06}s both`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 4px 20px ${track.color}18`; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {/* Row 1: Icon + Name + Badge */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                }}>
                  <div style={{
                    width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem",
                    background: `${track.color}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}><TrackIcon trackId={track.id} size="1.25rem" /></div>

                  <div style={{
                    fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
                    color: T.color.charcoal,
                    flex: 1, minWidth: 0,
                    ...clampLine,
                  }}>{t(track.nameKey)}</div>

                  {/* Badge inline, not absolutely positioned */}
                  {isRecommended && !isComplete && (
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.5625rem", fontWeight: 600,
                      color: track.color, textTransform: "uppercase", letterSpacing: "0.0625rem",
                      padding: "0.1875rem 0.5rem", borderRadius: "0.375rem",
                      background: `${track.color}15`, border: `1px solid ${track.color}25`,
                      flexShrink: 0, whiteSpace: "nowrap",
                    }}>{t("recommended")}</span>
                  )}
                  {isComplete && (
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.5625rem", fontWeight: 600,
                      color: T.color.success, textTransform: "uppercase", letterSpacing: "0.0625rem",
                      padding: "0.1875rem 0.5rem", borderRadius: "0.375rem",
                      background: `${T.color.success}15`, border: `1px solid ${T.color.success}25`,
                      flexShrink: 0, whiteSpace: "nowrap",
                    }}>{t("complete")}</span>
                  )}
                </div>

                {/* Row 2: Description (max 2 lines) */}
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted,
                  lineHeight: 1.4, marginTop: "0.375rem",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                  wordBreak: "break-word",
                }}>{t(track.descriptionKey)}</div>

                {/* Row 3: Progress bar */}
                <div style={{ marginTop: "0.625rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted }}>
                      {stepsCompleted} {t("of")} {totalSteps} {t("steps")}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                      color: pct >= 100 ? T.color.success : track.color,
                    }}>{pct}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    style={{
                      height: "0.375rem", borderRadius: "0.1875rem",
                      background: `${T.color.sandstone}20`, overflow: "hidden",
                    }}
                  >
                    <div style={{
                      width: `${pct}%`, height: "100%", borderRadius: "0.1875rem",
                      background: isComplete
                        ? `linear-gradient(90deg,${T.color.success},${T.color.sage})`
                        : `linear-gradient(90deg,${track.color}cc,${track.color})`,
                      transition: "width .8s ease",
                    }} />
                  </div>
                </div>

                {/* Row 4: Next step hint */}
                {nextStep && !isComplete && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.375rem 0.625rem", borderRadius: "0.5rem",
                    background: `${track.color}08`,
                    marginTop: "0.5rem",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: "0.375rem", height: "0.375rem", borderRadius: "0.1875rem",
                      background: track.color, flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.walnut,
                      flex: 1, minWidth: 0,
                      ...clampLine,
                    }}>
                      {t("next")} {t(nextStep.titleKey)}
                    </span>
                    <span style={{
                      flexShrink: 0, fontFamily: T.font.body, fontSize: "0.625rem",
                      color: T.color.muted,
                    }}>{"\u2192"}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
