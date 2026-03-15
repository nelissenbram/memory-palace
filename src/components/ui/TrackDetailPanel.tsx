"use client";
import { T } from "@/lib/theme";
import { TRACK_MAP } from "@/lib/constants/tracks";
import { useTrackStore } from "@/lib/stores/trackStore";

interface TrackDetailPanelProps {
  trackId: string;
  onClose: () => void;
  onNavigate?: (target: string) => void;
}

export default function TrackDetailPanel({ trackId, onClose, onNavigate }: TrackDetailPanelProps) {
  const { getTrackProgress, setShowLegacyPanel } = useTrackStore();
  const track = TRACK_MAP[trackId];
  const progress = getTrackProgress(trackId);

  if (!track) return null;

  const pct = progress.percentage;
  const isComplete = !!progress.completedAt;

  const handleStepAction = (navigateTo?: string) => {
    if (navigateTo === "legacy") {
      onClose();
      setShowLegacyPanel(true);
      return;
    }
    if (onNavigate && navigateTo) {
      onClose();
      onNavigate(navigateTo);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 62,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(42,34,24,.45)", backdropFilter: "blur(6px)",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        width: "95%", maxWidth: 520, maxHeight: "85vh",
        background: T.color.linen, borderRadius: 20,
        boxShadow: "0 24px 80px rgba(44,44,42,.3)",
        border: `1px solid ${T.color.cream}`,
        display: "flex", flexDirection: "column",
        animation: "fadeUp .35s ease",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 24px 20px",
          borderBottom: `1px solid ${T.color.cream}`,
          background: `linear-gradient(180deg, ${track.color}08 0%, ${T.color.linen} 100%)`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: `${track.color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
              }}>{track.icon}</div>
              <div>
                <h2 style={{
                  fontFamily: T.font.display, fontSize: 22, fontWeight: 600,
                  color: T.color.charcoal, margin: 0,
                }}>{track.name}</h2>
                <p style={{
                  fontFamily: T.font.body, fontSize: 12, color: T.color.muted, margin: 0,
                }}>{track.description}</p>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 16, border: `1px solid ${T.color.cream}`,
              background: T.color.white, cursor: "pointer", fontSize: 16, color: T.color.muted,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>{"\u2715"}</button>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.muted }}>
                {progress.stepsCompleted.length} of {track.steps.length} completed
              </span>
              <span style={{
                fontFamily: T.font.body, fontSize: 12, fontWeight: 600,
                color: isComplete ? "#4A6741" : track.color,
              }}>{pct}%</span>
            </div>
            <div style={{
              width: "100%", height: 8, borderRadius: 4,
              background: `${T.color.sandstone}20`, overflow: "hidden",
            }}>
              <div style={{
                width: `${pct}%`, height: "100%", borderRadius: 4,
                background: isComplete
                  ? "linear-gradient(90deg,#4A6741,#5A8751)"
                  : `linear-gradient(90deg,${track.color}cc,${track.color})`,
                transition: "width .8s ease",
              }} />
            </div>
          </div>

          {isComplete && (
            <div style={{
              marginTop: 12, padding: "8px 12px", borderRadius: 8,
              background: "#4A674110", border: "1px solid #4A674120",
              fontFamily: T.font.body, fontSize: 12, color: "#4A6741",
              textAlign: "center",
            }}>
              Track completed! You earned a {track.completionBonus}-point bonus.
            </div>
          )}
        </div>

        {/* Steps list */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 20px 24px",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          {track.steps.map((step, i) => {
            const isDone = progress.stepsCompleted.includes(step.id);
            const isNext = !isDone && !track.steps.slice(0, i).some((s) => !progress.stepsCompleted.includes(s.id));

            return (
              <div
                key={step.id}
                style={{
                  display: "flex", gap: 14, padding: "14px 12px",
                  borderRadius: 12,
                  background: isNext ? `${track.color}06` : "transparent",
                  border: isNext ? `1px solid ${track.color}18` : "1px solid transparent",
                  animation: `fadeUp .3s ease ${i * 0.04}s both`,
                }}
              >
                {/* Step indicator */}
                <div style={{
                  width: 28, height: 28, borderRadius: 14, flexShrink: 0,
                  border: isDone ? "none" : `2px solid ${isNext ? track.color : T.color.sandstone}`,
                  background: isDone ? track.color : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .3s ease",
                  marginTop: 1,
                }}>
                  {isDone && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7L6 10L11 4" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {!isDone && (
                    <span style={{
                      fontFamily: T.font.body, fontSize: 10, fontWeight: 600,
                      color: isNext ? track.color : T.color.muted,
                    }}>{i + 1}</span>
                  )}
                </div>

                {/* Step content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: T.font.display, fontSize: 15, fontWeight: isDone ? 500 : 600,
                    color: isDone ? T.color.muted : T.color.charcoal,
                    textDecoration: isDone ? "none" : "none",
                  }}>{step.title}</div>
                  <div style={{
                    fontFamily: T.font.body, fontSize: 12, color: T.color.muted,
                    lineHeight: 1.5, marginTop: 2,
                  }}>{step.description}</div>

                  {/* Hint for incomplete steps */}
                  {!isDone && (
                    <div style={{
                      fontFamily: T.font.body, fontSize: 11, color: T.color.walnut,
                      marginTop: 6, fontStyle: "italic", lineHeight: 1.4,
                    }}>{step.hint}</div>
                  )}

                  {/* CTA for next step */}
                  {isNext && step.navigateTo && (
                    <button
                      onClick={() => handleStepAction(step.navigateTo)}
                      style={{
                        marginTop: 8, padding: "6px 14px", borderRadius: 8,
                        border: "none",
                        background: `linear-gradient(135deg,${track.color}cc,${track.color})`,
                        color: "#FFF", fontFamily: T.font.body, fontSize: 12,
                        fontWeight: 600, cursor: "pointer", transition: "transform .2s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
                    >
                      {step.navigateTo === "legacy" ? "Open Legacy Settings" :
                       step.navigateTo === "upload" ? "Go to Upload" :
                       step.navigateTo === "room" ? "Go to Room" :
                       step.navigateTo === "share" ? "Go to Share" :
                       step.navigateTo === "wings" ? "Explore Wings" :
                       step.navigateTo === "corridor" ? "Go to Corridor" :
                       "Continue"} {"\u2192"}
                    </button>
                  )}
                </div>

                {/* Points */}
                <div style={{
                  fontFamily: T.font.body, fontSize: 11, fontWeight: 600,
                  color: isDone ? "#C9A84C" : `${T.color.sandstone}80`,
                  flexShrink: 0, paddingTop: 2,
                }}>
                  {isDone ? `+${step.pointValue}` : `${step.pointValue} pts`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with total points for this track */}
        <div style={{
          padding: "12px 24px", borderTop: `1px solid ${T.color.cream}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: `${T.color.warmStone}80`,
        }}>
          <span style={{ fontFamily: T.font.body, fontSize: 12, color: T.color.muted }}>
            Track points earned
          </span>
          <span style={{ fontFamily: T.font.body, fontSize: 14, fontWeight: 700, color: "#C9A84C" }}>
            {progress.stepsCompleted.reduce((sum, stepId) => {
              const step = track.steps.find((s) => s.id === stepId);
              return sum + (step?.pointValue || 0);
            }, 0)}
            {isComplete ? ` + ${track.completionBonus} bonus` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
