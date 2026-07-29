"use client";
import { useMemo } from "react";
import { T } from "@/lib/theme";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { TRACKS } from "@/lib/constants/tracks";
import { GOAL_TRACK_PRIORITY } from "@/lib/constants/tracks";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import TrackIcon from "./TrackIcons";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";

interface TracksPanelProps {
  onClose: () => void;
}

export default function TracksPanel({ onClose }: TracksPanelProps) {
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  // iPad portrait (768–1024) reports desktop on useIsMobile; treat it as compact for padding.
  const dense = isMobile || isCompact;
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
    // Normalize missing (-1) to the end so unlisted tracks fall last deterministically.
    const rawA = goalPriority.indexOf(a.id);
    const rawB = goalPriority.indexOf(b.id);
    const aIdx = rawA === -1 ? Number.MAX_SAFE_INTEGER : rawA;
    const bIdx = rawB === -1 ? Number.MAX_SAFE_INTEGER : rawB;
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
    <div className="tracksPanelRoot" style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Atrium token: gold focus ring + reduced-motion gate */}
      <style>{`
        .tracksPanelRoot :is(button,[role="button"]):focus-visible { outline: 0.1875rem solid #D4AF37; outline-offset: 0.1875rem; }
        @media (prefers-reduced-motion: reduce) {
          .tracksPanelRoot, .tracksPanelRoot * { animation: none !important; transition: none !important; }
        }
      `}</style>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(42,34,24,.45)", backdropFilter: "blur(0.375rem)",
      }} />

      {/* Panel */}
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} style={{
        position: "relative", zIndex: 1,
        width: "95%", maxWidth: "37.5rem", maxHeight: "85vh",
        background: T.color.linen, borderRadius: "1rem",
        boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token S2
        border: "0.0625rem solid #E3D6BC", // Atrium hairline
        display: "flex", flexDirection: "column",
        animation: "fadeUp .3s ease",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: dense ? "1rem 0.875rem 0.875rem" : "1.5rem 1.5rem 1.25rem", borderBottom: "0.0625rem solid #E3D6BC", // Atrium hairline
          background: `linear-gradient(180deg, ${T.color.warmStone} 0%, ${T.color.linen} 100%)`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, // Atrium titleL
                color: "#403B36", margin: 0, // Atrium ink
              }}>{t("title")}</h2>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", marginTop: "0.25rem",
              }}>
                {t("description")}
              </p>
            </div>
            <button onClick={onClose} aria-label={tc("close")} style={{
              width: "2.75rem", height: "2.75rem", borderRadius: "0.85rem", border: "0.0625rem solid #E3D6BC", // Atrium hairline
              background: T.color.white, cursor: "pointer", fontSize: "0.9375rem", color: "#716A5E",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "opacity .2s ease", flexShrink: 0,
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >{"\u2715"}</button>
          </div>

          {/* Points & Level summary */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.875rem", marginTop: "1rem",
            padding: "0.75rem 1rem", borderRadius: "0.75rem",
            background: T.color.white, border: "0.0625rem solid #E3D6BC", // Atrium hairline
          }}>
            <div style={{
              width: "2.75rem", height: "2.75rem", borderRadius: "1.375rem",
              background: levelInfo.color,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.9375rem", fontWeight: 700, color: T.color.white, fontFamily: T.font.body,
              flexShrink: 0,
              boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", // Atrium token S1
            }}>{levelInfo.rank}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: T.font.display, fontSize: "1.1875rem", fontWeight: 600, color: "#403B36" }}>
                  {totalPoints} {t("mp")}
                </span>
                <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: levelInfo.color, fontWeight: 600 }}>
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
                    : levelInfo.color,
                  transition: "width .3s ease",
                }} />
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", marginTop: "0.1875rem", // Atrium meta
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
          padding: dense ? "0.75rem" : "1rem 1.25rem 1.5rem",
        }}>
          {/* My Resolutions mini-section */}
          {resolutions.length > 0 && <div style={{
            padding: "1rem", borderRadius: "1rem",
            border: "0.0625rem solid #DFE3D2", // Atrium sage border
            background: "#EFF2E8", // Atrium sage tray
            boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", // Atrium token S1
            marginBottom: "0.75rem",
          }}>
            <div style={{
              fontFamily: T.font.display, fontSize: "1.0625rem", fontWeight: 600,
              color: "#56683C", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", // Atrium sage
            }}>
              {t("myResolutions")}
            </div>
            {resolutions.map((m) => {
              const pct = m.resolution?.progress ?? 0;
              const hasTarget = !!m.resolution?.targetDate;
              // Floor both to local midnight so daysLeft===0 means "due today" (not past due).
              const todayMidnight = new Date();
              todayMidnight.setHours(0, 0, 0, 0);
              const daysLeft = hasTarget ? Math.round((new Date(m.resolution!.targetDate! + "T00:00:00").getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)) : null;
              return (
                <div key={m.id} style={{
                  padding: "0.625rem 0.875rem", borderRadius: "0.7rem",
                  background: T.color.white, border: "0.0625rem solid #E3D6BC", // Atrium hairline
                  marginBottom: "0.5rem",
                }}>
                  <div style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                    color: "#403B36", marginBottom: "0.25rem", // Atrium ink
                    ...clampLine,
                  }}>{m.resolution?.goal}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", ...clampLine, flex: 1, minWidth: 0 }}>{m.title}</span>
                    {hasTarget && daysLeft !== null && (
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                        color: daysLeft >= 0 ? "#56683C" : T.color.error, // Atrium sage
                        flexShrink: 0,
                      }}>
                        {daysLeft > 0 ? t("daysLeft", { count: String(daysLeft) }) : daysLeft === 0 ? t("dueToday") : t("pastDue")}
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
                          ? "linear-gradient(90deg,#56683C,#7A8C64)" // Atrium sage
                          : "#56683C",
                        transition: "width .3s ease",
                      }} />
                    </div>
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
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
            const pct = Math.min(100, totalSteps > 0 ? Math.round((stepsCompleted / totalSteps) * 100) : 0);
            const isComplete = pct >= 100;
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
                  padding: dense ? "0.75rem" : "1rem 1.125rem",
                  borderRadius: "1rem",
                  border: isRecommended ? `0.125rem solid ${track.color}44` : "0.0625rem solid #E3D6BC", // Atrium hairline
                  background: isComplete ? `${track.color}08` : T.color.white,
                  boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", // Atrium token S1
                  cursor: "pointer", textAlign: "left",
                  transition: "all .2s ease",
                  marginBottom: "0.75rem",
                  /* KEY: contain prevents any child from overflowing */
                  contain: "inline-size",
                  overflow: "hidden",
                  animation: `fadeUp .3s ease ${i * 0.06}s both`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-0.1875rem)"; e.currentTarget.style.boxShadow = "0 0.5rem 1.5rem rgba(64,59,54,0.14)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 0.25rem 1rem rgba(64,59,54,0.07)"; }}
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
                    color: "#403B36", // Atrium ink
                    flex: 1, minWidth: 0,
                    ...clampLine,
                  }}>{t(track.nameKey)}</div>

                  {/* Badge inline, not absolutely positioned */}
                  {isRecommended && !isComplete && (
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
                      color: track.color, textTransform: "uppercase", letterSpacing: "0.12em", // Atrium overline voice
                      padding: "0.1875rem 0.5rem", borderRadius: "2rem",
                      background: `${track.color}15`, border: `0.0625rem solid ${track.color}25`,
                      flexShrink: 0, whiteSpace: "nowrap",
                    }}>{t("recommended")}</span>
                  )}
                  {isComplete && (
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700,
                      color: "#56683C", textTransform: "uppercase", letterSpacing: "0.12em", // Atrium overline voice, sage
                      padding: "0.1875rem 0.5rem", borderRadius: "2rem",
                      background: "rgba(86,104,60,0.16)", border: "0.0625rem solid #DFE3D2",
                      flexShrink: 0, whiteSpace: "nowrap",
                    }}>{t("complete")}</span>
                  )}
                </div>

                {/* Row 2: Description (max 2 lines) */}
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", // Atrium meta
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
                    <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" }}>
                      {stepsCompleted} {t("of")} {totalSteps} {t("steps")}
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                      color: pct >= 100 ? "#56683C" : track.color, // Atrium sage
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
                        ? "linear-gradient(90deg,#56683C,#7A8C64)" // Atrium sage
                        : track.color,
                      transition: "width .3s ease",
                    }} />
                  </div>
                </div>

                {/* Row 4: Next step hint */}
                {nextStep && !isComplete && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.375rem 0.625rem", borderRadius: "0.7rem",
                    background: `${track.color}08`,
                    marginTop: "0.5rem",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: "0.375rem", height: "0.375rem", borderRadius: "0.1875rem",
                      background: track.color, flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", // Atrium muted
                      flex: 1, minWidth: 0,
                      ...clampLine,
                    }}>
                      {t("next")} {t(nextStep.titleKey)}
                    </span>
                    <span style={{
                      flexShrink: 0, fontFamily: T.font.body, fontSize: "0.8125rem",
                      color: "#716A5E",
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
