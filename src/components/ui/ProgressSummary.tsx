"use client";
import { T } from "@/lib/theme";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { TRACKS } from "@/lib/constants/tracks";

/**
 * Progress summary card for the main palace view.
 * Shows: total points, level, tracks completed, and next suggested action.
 * Positioned in the bottom-right on desktop, hidden on mobile (info accessible via More menu).
 */
export default function ProgressSummary({ onOpenTracks }: { onOpenTracks: () => void }) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("tracksPanel");
  const { t: tl } = useTranslation("levels");
  const { totalPoints, tracks, getLevelInfo, getLevelProgressInfo, getRecommendedTrack, getNextStep } = useTrackStore();
  const { userGoal } = useUserStore();
  const levelInfo = getLevelInfo();
  const progressInfo = getLevelProgressInfo();

  // Count completed tracks
  const completedTracks = Object.values(tracks).filter((t) => t.completedAt).length;
  const totalTracks = TRACKS.length;

  // Get recommended next action
  const recommended = getRecommendedTrack(userGoal || "preserve");
  const nextStep = recommended ? getNextStep(recommended.id) : null;

  // Don't render on mobile (they have the bottom bar)
  if (isMobile) return null;

  // Don't render if no points yet (avoid showing empty state to brand-new users)
  if (totalPoints === 0 && completedTracks === 0) return null;

  return (
    <div style={{
      position: "absolute",
      bottom: "4.375rem",
      right: "1.75rem",
      zIndex: 35,
      width: "16.25rem",
      background: `${T.color.white}e6`,
      backdropFilter: "blur(0.75rem)",
      WebkitBackdropFilter: "blur(0.75rem)",
      borderRadius: "1rem",
      border: "0.0625rem solid #E3D6BC", // Atrium token: opaque hairline
      boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", // Atrium token: S2 warm ink + top highlight
      padding: "1rem",
      animation: "fadeIn .3s ease 1.2s both",
      overflow: "hidden",
    }}>
      {/* Header: Level + Points */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
        <div style={{
          width: "2.25rem", height: "2.25rem", borderRadius: "1.125rem",
          background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}cc)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.8125rem", fontWeight: 700, color: T.color.white,
          fontFamily: T.font.body,
          boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07)", // Atrium token: S1 warm ink
          flexShrink: 0,
        }}>
          {levelInfo.rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600,
            color: "#403B36", // Atrium token: ink
          }}>
            {tl(levelInfo.titleKey)}
          </div>
          <div style={{
            fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", // Atrium token: meta + muted
          }}>
            {t("pointsSummary", { totalPoints: String(totalPoints), completedTracks: String(completedTracks), totalTracks: String(totalTracks) })}
          </div>
        </div>
      </div>

      {/* Level progress bar */}
      {progressInfo.nextLevel && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progressInfo.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              width: "100%", height: "0.25rem", borderRadius: "0.125rem",
              background: "#E3D6BC", overflow: "hidden", // Atrium token: opaque hairline track (no alpha band)
            }}
          >
            <div style={{
              width: `${progressInfo.progress * 100}%`, height: "100%", borderRadius: "0.125rem",
              background: `linear-gradient(90deg, ${levelInfo.color}, ${progressInfo.nextLevel.color})`,
              transition: "width .3s ease", // Atrium motion budget
            }} />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: "0.1875rem",
          }}>
            <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: meta + muted */ }}>
              {tl(levelInfo.titleKey)}
            </span>
            <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" /* Atrium token: meta + muted */ }}>
              {tl(progressInfo.nextLevel.titleKey)}
            </span>
          </div>
        </div>
      )}

      {/* Next suggested action */}
      {nextStep && recommended && (
        <button
          onClick={onOpenTracks}
          style={{
            width: "100%",
            padding: "0.625rem 0.75rem",
            borderRadius: "0.75rem", // Atrium radius: small control
            border: `0.0625rem solid ${recommended.color}22`,
            background: `${recommended.color}08`,
            cursor: "pointer",
            textAlign: "left",
            display: "flex", alignItems: "center", gap: "0.625rem",
            transition: "all .2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = `${recommended.color}14`;
            (e.currentTarget as HTMLElement).style.borderColor = `${recommended.color}33`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = `${recommended.color}08`;
            (e.currentTarget as HTMLElement).style.borderColor = `${recommended.color}22`;
          }}
        >
          <div style={{
            width: "1.75rem", height: "1.75rem", borderRadius: "0.7rem", // Atrium radius: small control
            background: `${recommended.color}15`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.9375rem", flexShrink: 0,
          }}>
            {recommended.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, // Atrium token: overline
              color: recommended.color, textTransform: "uppercase", letterSpacing: "0.12em",
              marginBottom: "0.0625rem",
            }}>
              {t("continueJourney")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.8125rem", color: "#403B36", // Atrium token: meta + ink
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {t(nextStep.titleKey)}
            </div>
          </div>
          <span style={{
            fontFamily: T.font.body, fontSize: "0.9375rem", color: "#716A5E", // Atrium token: body + muted
            flexShrink: 0,
          }}>{"\u2192"}</span>
        </button>
      )}

      {/* All tracks completed */}
      {!nextStep && completedTracks === totalTracks && (
        <div style={{
          padding: "0.625rem 0.75rem", borderRadius: "0.75rem", // Atrium radius: small control
          background: `${levelInfo.color}08`, border: `0.0625rem solid ${levelInfo.color}15`,
          textAlign: "center",
        }}>
          <span style={{
            fontFamily: T.font.body, fontSize: "0.8125rem", color: levelInfo.color, fontWeight: 500, // Atrium token: meta
          }}>
            {t("allTracksCompleted")}
          </span>
        </div>
      )}
    </div>
  );
}
