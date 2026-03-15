"use client";
import { T } from "@/lib/theme";
import { TRACKS } from "@/lib/constants/tracks";
import { GOAL_TRACK_PRIORITY } from "@/lib/constants/tracks";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useUserStore } from "@/lib/stores/userStore";

interface TracksPanelProps {
  onClose: () => void;
}

export default function TracksPanel({ onClose }: TracksPanelProps) {
  const { tracks, totalPoints, getLevel, getPointsToNextLevel, setSelectedTrackId } = useTrackStore();
  const { userGoal } = useUserStore();
  const level = getLevel();
  const { current, needed, progress } = getPointsToNextLevel();

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
      <div style={{
        position: "relative", zIndex: 1,
        width: "95%", maxWidth: 600, maxHeight: "85vh",
        background: T.color.linen, borderRadius: 20,
        boxShadow: "0 24px 80px rgba(44,44,42,.3)",
        border: `1px solid ${T.color.cream}`,
        display: "flex", flexDirection: "column",
        animation: "fadeUp .35s ease",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 24px 20px", borderBottom: `1px solid ${T.color.cream}`,
          background: `linear-gradient(180deg, ${T.color.warmStone} 0%, ${T.color.linen} 100%)`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{
                fontFamily: T.font.display, fontSize: 26, fontWeight: 500,
                color: T.color.charcoal, margin: 0,
              }}>Memory Building</h2>
              <p style={{
                fontFamily: T.font.body, fontSize: 13, color: T.color.muted, marginTop: 4,
              }}>
                Complete tracks to earn Memory Points and build your legacy.
              </p>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 16, border: `1px solid ${T.color.cream}`,
              background: T.color.white, cursor: "pointer", fontSize: 16, color: T.color.muted,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{"\u2715"}</button>
          </div>

          {/* Points & Level summary */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14, marginTop: 16,
            padding: "12px 16px", borderRadius: 12,
            background: `${T.color.white}cc`, border: `1px solid #C4A96222`,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 22,
              background: "linear-gradient(135deg,#C9A84C,#D4AF37)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 700, color: "#FFF", fontFamily: T.font.body,
              flexShrink: 0,
            }}>{level}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: T.font.display, fontSize: 18, fontWeight: 600, color: T.color.charcoal }}>
                  {totalPoints} Points
                </span>
                <span style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.muted }}>
                  Level {level}
                </span>
              </div>
              <div style={{
                width: "100%", height: 6, borderRadius: 3, marginTop: 6,
                background: `${T.color.sandstone}25`, overflow: "hidden",
              }}>
                <div style={{
                  width: `${progress * 100}%`, height: "100%", borderRadius: 3,
                  background: "linear-gradient(90deg,#C9A84C,#D4AF37)",
                  transition: "width .8s ease",
                }} />
              </div>
              <div style={{
                fontFamily: T.font.body, fontSize: 10, color: T.color.muted, marginTop: 3,
              }}>
                {current} / {needed} to Level {level + 1}
              </div>
            </div>
          </div>
        </div>

        {/* Track cards */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 20px 24px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
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
                  display: "flex", flexDirection: "column", gap: 10,
                  padding: "16px 18px", borderRadius: 14,
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
                    position: "absolute", top: 10, right: 12,
                    fontFamily: T.font.body, fontSize: 9, fontWeight: 600,
                    color: track.color, textTransform: "uppercase", letterSpacing: 1,
                    padding: "3px 8px", borderRadius: 6,
                    background: `${track.color}15`, border: `1px solid ${track.color}25`,
                  }}>Recommended</div>
                )}

                {/* Completed badge */}
                {isComplete && (
                  <div style={{
                    position: "absolute", top: 10, right: 12,
                    fontFamily: T.font.body, fontSize: 9, fontWeight: 600,
                    color: "#4A6741", textTransform: "uppercase", letterSpacing: 1,
                    padding: "3px 8px", borderRadius: 6,
                    background: "#4A674115", border: "1px solid #4A674125",
                  }}>Complete</div>
                )}

                {/* Top row: icon + name */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: `${track.color}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, flexShrink: 0,
                  }}>{track.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.font.display, fontSize: 17, fontWeight: 600,
                      color: T.color.charcoal,
                    }}>{track.name}</div>
                    <div style={{
                      fontFamily: T.font.body, fontSize: 12, color: T.color.muted,
                      lineHeight: 1.4,
                    }}>{track.description}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.muted }}>
                      {stepsCompleted} of {totalSteps} steps
                    </span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: 11, fontWeight: 600,
                      color: pct >= 100 ? "#4A6741" : track.color,
                    }}>{pct}%</span>
                  </div>
                  <div style={{
                    width: "100%", height: 6, borderRadius: 3,
                    background: `${T.color.sandstone}20`, overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${pct}%`, height: "100%", borderRadius: 3,
                      background: isComplete
                        ? "linear-gradient(90deg,#4A6741,#5A8751)"
                        : `linear-gradient(90deg,${track.color}cc,${track.color})`,
                      transition: "width .8s ease",
                    }} />
                  </div>
                </div>

                {/* Next step hint */}
                {nextStep && !isComplete && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 10px", borderRadius: 8,
                    background: `${track.color}08`,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: 3,
                      background: track.color, flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: T.font.body, fontSize: 11, color: T.color.walnut,
                    }}>
                      Next: {nextStep.title}
                    </span>
                    <span style={{
                      marginLeft: "auto", fontFamily: T.font.body, fontSize: 10,
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
