"use client";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import { TRACK_MAP } from "@/lib/constants/tracks";
import { useTrackStore } from "@/lib/stores/trackStore";
import TrackIcon from "./TrackIcons";

interface TrackDetailPanelProps {
  trackId: string;
  onClose: () => void;
  onNavigate?: (target: string) => void;
}

export default function TrackDetailPanel({ trackId, onClose, onNavigate }: TrackDetailPanelProps) {
  const { t } = useTranslation("trackDetail");
  const { t: tTrack } = useTranslation("tracksPanel");
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  // iPad portrait reports desktop on useIsMobile; treat it as compact for padding.
  const dense = isMobile || isCompact;
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const { getTrackProgress, setShowLegacyPanel } = useTrackStore();
  const track = TRACK_MAP[trackId];
  const progress = getTrackProgress(trackId);

  if (!track) return null;

  const pct = progress.percentage;
  const isComplete = !!progress.completedAt;

  const handleStepAction = (navigateTo?: string) => {
    if (!navigateTo) return;
    // Single source of truth: when the parent supplies onNavigate it already
    // routes every target (including "legacy") — let it own the branch. Only
    // when onNavigate is omitted (optional prop) do we fall back to opening the
    // legacy panel directly so that navigateTo="legacy" still works.
    if (onNavigate) {
      onClose();
      onNavigate(navigateTo);
      return;
    }
    if (navigateTo === "legacy") {
      onClose();
      setShowLegacyPanel(true);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 62,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(42,34,24,.45)", backdropFilter: "blur(0.375rem)",
      }} />

      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={tTrack(track.nameKey)} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} style={{
        position: "relative", zIndex: 1,
        width: "95%", maxWidth: "32.5rem", maxHeight: "85vh",
        background: T.color.linen, borderRadius: "1rem",
        boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token S2
        border: "0.0625rem solid #E3D6BC", // Atrium hairline
        display: "flex", flexDirection: "column",
        animation: "fadeUp .3s ease",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: dense ? "1rem 0.875rem 0.875rem" : "1.5rem 1.5rem 1.25rem",
          borderBottom: "0.0625rem solid #E3D6BC", // Atrium hairline
          background: `linear-gradient(180deg, ${track.color}08 0%, ${T.color.linen} 100%)`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: "3rem", height: "3rem", borderRadius: "0.85rem",
                background: `${track.color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5rem",
              }}><TrackIcon trackId={track.id} size="1.5rem" /></div>
              <div>
                <h2 style={{
                  fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600,
                  color: "#403B36", margin: 0, // Atrium ink
                }}>{tTrack(track.nameKey)}</h2>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", margin: 0, // Atrium meta/muted
                }}>{tTrack(track.descriptionKey)}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label={t("close")} style={{
              width: "2.75rem", height: "2.75rem", borderRadius: "1.375rem", border: "0.0625rem solid #E3D6BC", // Atrium hairline
              background: T.color.white, cursor: "pointer", fontSize: "1rem", color: "#716A5E",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              transition: "opacity .2s ease",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >{"\u2715"}</button>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
              <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" }}>
                {progress.stepsCompleted.length} {t("of")} {track.steps.length} {t("completed")}
              </span>
              <span style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                color: isComplete ? "#56683C" : track.color, // Atrium sage
              }}>{pct}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{
                width: "100%", height: "0.5rem", borderRadius: "0.25rem",
                background: "#EFE9DF", overflow: "hidden", // Atrium pre-mixed opaque (no alpha band)
              }}
            >
              <div style={{
                width: `${pct}%`, height: "100%", borderRadius: "0.25rem",
                background: isComplete
                  ? "#56683C" // Atrium sage
                  : `linear-gradient(90deg,${track.color}cc,${track.color})`,
                transition: "width .3s ease",
              }} />
            </div>
          </div>

          {isComplete && (
            <div style={{
              marginTop: "0.75rem", padding: "0.5rem 0.75rem", borderRadius: "0.75rem",
              background: "#EFF2E8", border: "0.0625rem solid #DFE3D2", // Atrium sage tray + border
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#56683C",
              textAlign: "center",
            }}>
              {t("trackCompleted", { points: String(track.completionBonus) })}
            </div>
          )}
        </div>

        {/* Steps list */}
        <div style={{
          flex: 1, overflowY: "auto", padding: dense ? "0.75rem 0.875rem 1.25rem" : "1rem 1.25rem 1.5rem",
          display: "flex", flexDirection: "column", gap: "0.125rem",
        }}>
          {track.steps.map((step, i) => {
            const isDone = progress.stepsCompleted.includes(step.id);
            const isNext = !isDone && !track.steps.slice(0, i).some((s) => !progress.stepsCompleted.includes(s.id));

            return (
              <div
                key={step.id}
                style={{
                  display: "flex", gap: "0.875rem", padding: "0.875rem 0.75rem",
                  borderRadius: "0.75rem",
                  background: isNext ? `${track.color}06` : "transparent",
                  border: isNext ? `0.0625rem solid ${track.color}18` : "0.0625rem solid transparent",
                  animation: `fadeUp .3s ease ${i * 0.04}s both`,
                }}
              >
                {/* Step indicator */}
                <div style={{
                  width: "1.75rem", height: "1.75rem", borderRadius: "0.875rem", flexShrink: 0,
                  border: isDone ? "none" : `0.125rem solid ${isNext ? track.color : "#E3D6BC"}`, // Atrium hairline ink
                  background: isDone ? track.color : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .3s ease",
                  marginTop: "0.0625rem",
                }}>
                  {isDone && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7L6 10L11 4" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {!isDone && (
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                      color: isNext ? track.color : "#716A5E",
                    }}>{i + 1}</span>
                  )}
                </div>

                {/* Step content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: isDone ? 500 : 600,
                    color: isDone ? "#716A5E" : "#403B36", // Atrium muted / ink
                    textDecoration: "none",
                  }}>{tTrack(step.titleKey)}</div>
                  <div style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
                    lineHeight: 1.4, marginTop: "0.125rem",
                  }}>{tTrack(step.descriptionKey)}</div>

                  {/* Hint for incomplete steps */}
                  {!isDone && (
                    <div style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E", // Atrium muted (walnut is non-text ink)
                      marginTop: "0.375rem", fontStyle: "italic", lineHeight: 1.4,
                    }}>{tTrack(step.hintKey)}</div>
                  )}

                  {/* CTA for next step */}
                  {isNext && step.navigateTo && (
                    <button
                      onClick={() => handleStepAction(step.navigateTo)}
                      style={{
                        marginTop: "0.5rem", padding: "0.375rem 0.875rem", borderRadius: "0.75rem",
                        border: "none", minHeight: "2.75rem",
                        background: `linear-gradient(135deg,${track.color}cc,${track.color})`,
                        color: "#FFF", fontFamily: T.font.body, fontSize: "0.8125rem",
                        fontWeight: 600, cursor: "pointer", transition: "transform .2s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-0.1875rem)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
                    >
                      {step.navigateTo === "legacy" ? t("openLegacy") :
                       step.navigateTo === "library-import" ? t("goToImportUpload") :
                       step.navigateTo === "library" ? t("goToLibrary") :
                       step.navigateTo === "upload" ? t("goToImportUpload") :
                       step.navigateTo === "entrance" ? t("goToEntrance") :
                       step.navigateTo === "room" ? t("goToRoom") :
                       step.navigateTo === "share" ? t("goToShare") :
                       step.navigateTo === "wings" ? t("exploreWings") :
                       step.navigateTo === "corridor" ? t("goToCorridor") :
                       step.navigateTo === "interview" ? t("startInterview") :
                       step.navigateTo === "keps" ? t("goToKep") :
                       step.navigateTo === "explore" ? t("goToExplore") :
                       step.navigateTo === "settings" ? t("goToSettings") :
                       t("continue")} {"\u2192"}
                    </button>
                  )}
                </div>

                {/* Points */}
                <div style={{
                  fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                  color: isDone ? "#9A4F2A" : "#716A5E", // Atrium terracotta glyph / muted (gold reserved for the palace)
                  flexShrink: 0, paddingTop: "0.125rem",
                }}>
                  {isDone ? `+${step.pointValue}` : `${step.pointValue} ${t("pts")}`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer with total points for this track */}
        <div style={{
          padding: "0.75rem 1.5rem", borderTop: "0.0625rem solid #E3D6BC", // Atrium hairline
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#ECE5DA", // Atrium pre-mixed opaque (warmStone over linen)
        }}>
          <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" }}>
            {t("trackPointsEarned")}
          </span>
          <span style={{ fontFamily: T.font.body, fontSize: "0.9375rem", fontWeight: 700, color: "#9A4F2A" }}>
            {progress.stepsCompleted.reduce((sum, stepId) => {
              const step = track.steps.find((s) => s.id === stepId);
              return sum + (step?.pointValue || 0);
            }, 0)}
            {isComplete ? ` + ${track.completionBonus} ${t("bonus")}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
