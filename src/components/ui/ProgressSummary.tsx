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
      border: `1px solid ${T.color.cream}`,
      boxShadow: "0 0.25rem 1.25rem rgba(44,44,42,.1)",
      padding: "1rem",
      animation: "fadeIn .5s ease 1.2s both",
      overflow: "hidden",
    }}>
      {/* Header: Level + Points */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
        <div style={{
          width: "2.25rem", height: "2.25rem", borderRadius: "1.125rem",
          background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}cc)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.875rem", fontWeight: 700, color: T.color.white,
          fontFamily: T.font.body,
          boxShadow: `0 0.125rem 0.5rem ${levelInfo.color}30`,
          flexShrink: 0,
        }}>
          {levelInfo.rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: T.font.display, fontSize: "0.9375rem", fontWeight: 600,
            color: T.color.charcoal,
          }}>
            {tl(levelInfo.titleKey)}
          </div>
          <div style={{
            fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted,
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
              background: `${T.color.sandstone}20`, overflow: "hidden",
            }}
          >
            <div style={{
              width: `${progressInfo.progress * 100}%`, height: "100%", borderRadius: "0.125rem",
              background: `linear-gradient(90deg, ${levelInfo.color}, ${progressInfo.nextLevel.color})`,
              transition: "width .8s ease",
            }} />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: "0.1875rem",
          }}>
            <span style={{ fontFamily: T.font.body, fontSize: "0.5625rem", color: T.color.muted }}>
              {tl(levelInfo.titleKey)}
            </span>
            <span style={{ fontFamily: T.font.body, fontSize: "0.5625rem", color: T.color.muted }}>
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
            borderRadius: "0.625rem",
            border: `1px solid ${recommended.color}22`,
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
            width: "1.75rem", height: "1.75rem", borderRadius: "0.5rem",
            background: `${recommended.color}15`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.875rem", flexShrink: 0,
          }}>
            {recommended.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.5625rem", fontWeight: 600,
              color: recommended.color, textTransform: "uppercase", letterSpacing: "0.03125rem",
              marginBottom: "0.0625rem",
            }}>
              {t("continueJourney")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.charcoal,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {t(nextStep.titleKey)}
            </div>
          </div>
          <span style={{
            fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted,
            flexShrink: 0,
          }}>{"\u2192"}</span>
        </button>
      )}

      {/* All tracks completed */}
      {!nextStep && completedTracks === totalTracks && (
        <div style={{
          padding: "0.625rem 0.75rem", borderRadius: "0.625rem",
          background: `${levelInfo.color}08`, border: `1px solid ${levelInfo.color}15`,
          textAlign: "center",
        }}>
          <span style={{
            fontFamily: T.font.body, fontSize: "0.6875rem", color: levelInfo.color, fontWeight: 500,
          }}>
            {t("allTracksCompleted")}
          </span>
        </div>
      )}
    </div>
  );
}
