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
      bottom: 70,
      right: 28,
      zIndex: 35,
      width: 260,
      background: `${T.color.white}e6`,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderRadius: 16,
      border: `1px solid ${T.color.cream}`,
      boxShadow: "0 4px 20px rgba(44,44,42,.1)",
      padding: 16,
      animation: "fadeIn .5s ease 1.2s both",
      overflow: "hidden",
    }}>
      {/* Header: Level + Points */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 18,
          background: `linear-gradient(135deg, ${levelInfo.color}, ${levelInfo.color}cc)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: "#FFF",
          fontFamily: T.font.body,
          boxShadow: `0 2px 8px ${levelInfo.color}30`,
          flexShrink: 0,
        }}>
          {levelInfo.rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: T.font.display, fontSize: 15, fontWeight: 600,
            color: T.color.charcoal,
          }}>
            {levelInfo.title}
          </div>
          <div style={{
            fontFamily: T.font.body, fontSize: 11, color: T.color.muted,
          }}>
            {totalPoints} MP &middot; {completedTracks}/{totalTracks} tracks
          </div>
        </div>
      </div>

      {/* Level progress bar */}
      {progressInfo.nextLevel && (
        <div style={{ marginBottom: 12 }}>
          <div style={{
            width: "100%", height: 4, borderRadius: 2,
            background: `${T.color.sandstone}20`, overflow: "hidden",
          }}>
            <div style={{
              width: `${progressInfo.progress * 100}%`, height: "100%", borderRadius: 2,
              background: `linear-gradient(90deg, ${levelInfo.color}, ${progressInfo.nextLevel.color})`,
              transition: "width .8s ease",
            }} />
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", marginTop: 3,
          }}>
            <span style={{ fontFamily: T.font.body, fontSize: 9, color: T.color.muted }}>
              {levelInfo.title}
            </span>
            <span style={{ fontFamily: T.font.body, fontSize: 9, color: T.color.muted }}>
              {progressInfo.nextLevel.title}
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
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${recommended.color}22`,
            background: `${recommended.color}08`,
            cursor: "pointer",
            textAlign: "left",
            display: "flex", alignItems: "center", gap: 10,
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
            width: 28, height: 28, borderRadius: 8,
            background: `${recommended.color}15`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, flexShrink: 0,
          }}>
            {recommended.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.font.body, fontSize: 9, fontWeight: 600,
              color: recommended.color, textTransform: "uppercase", letterSpacing: 0.5,
              marginBottom: 1,
            }}>
              {t("continueJourney")}
            </div>
            <div style={{
              fontFamily: T.font.body, fontSize: 11, color: T.color.charcoal,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {t(nextStep.titleKey)}
            </div>
          </div>
          <span style={{
            fontFamily: T.font.body, fontSize: 14, color: T.color.muted,
            flexShrink: 0,
          }}>{"\u2192"}</span>
        </button>
      )}

      {/* All tracks completed */}
      {!nextStep && completedTracks === totalTracks && (
        <div style={{
          padding: "10px 12px", borderRadius: 10,
          background: `${levelInfo.color}08`, border: `1px solid ${levelInfo.color}15`,
          textAlign: "center",
        }}>
          <span style={{
            fontFamily: T.font.body, fontSize: 11, color: levelInfo.color, fontWeight: 500,
          }}>
            {t("allTracksCompleted")}
          </span>
        </div>
      )}
    </div>
  );
}
