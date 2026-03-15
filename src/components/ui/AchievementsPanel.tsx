"use client";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useAchievementStore, ACHIEVEMENTS, type Achievement } from "@/lib/stores/achievementStore";

const CATEGORIES = [
  { key: "memories" as const, label: "Memories", icon: "\u{1F31F}" },
  { key: "social" as const, label: "Social", icon: "\u{1F91D}" },
  { key: "explore" as const, label: "Explore", icon: "\u{1F9ED}" },
  { key: "create" as const, label: "Create", icon: "\u{1F3AC}" },
];

interface Props {
  onClose: () => void;
}

export default function AchievementsPanel({ onClose }: Props) {
  const isMobile = useIsMobile();
  const { earnedIds, earnedDates, getProgress } = useAchievementStore();
  const { earned, total, percentage } = getProgress();

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(44,44,42,.55)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn .3s ease",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? "100%" : "min(640px, 92vw)",
          maxHeight: isMobile ? "100%" : "88vh",
          height: isMobile ? "100%" : undefined,
          overflow: "auto",
          background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 100%)`,
          borderRadius: isMobile ? 0 : 20,
          border: isMobile ? "none" : `1px solid ${T.color.sandstone}44`,
          boxShadow: isMobile ? "none" : `0 24px 80px rgba(44,44,42,.35)`,
          padding: isMobile ? "20px 16px 16px" : "32px 28px 28px",
          animation: isMobile ? "fadeIn .2s ease" : "fadeUp .35s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `linear-gradient(135deg, #C9A84C, #A67C2E)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, boxShadow: "0 4px 16px rgba(169,124,46,.3)",
            }}>{"\u{1F3C6}"}</div>
            <div>
              <div style={{ fontFamily: T.font.display, fontSize: 24, fontWeight: 600, color: T.color.charcoal }}>
                Achievements
              </div>
              <div style={{ fontFamily: T.font.body, fontSize: 13, color: T.color.muted }}>
                {earned} of {total} unlocked
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 18, border: `1px solid ${T.color.cream}`,
              background: `${T.color.white}cc`, cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.color.muted, fontFamily: T.font.body,
            }}
          >{"\u2715"}</button>
        </div>

        {/* Progress bar */}
        <div style={{
          width: "100%", height: 8, borderRadius: 4,
          background: `${T.color.sandstone}33`, marginBottom: 28, overflow: "hidden",
        }}>
          <div style={{
            width: `${percentage}%`, height: "100%", borderRadius: 4,
            background: `linear-gradient(90deg, #C9A84C, #D4AF37)`,
            transition: "width .6s ease",
          }} />
        </div>

        {/* Category sections */}
        {CATEGORIES.map((cat) => {
          const items = ACHIEVEMENTS.filter((a) => a.category === cat.key);
          return (
            <div key={cat.key} style={{ marginBottom: 24 }}>
              <div style={{
                fontFamily: T.font.display, fontSize: 16, fontWeight: 600,
                color: T.color.walnut, marginBottom: 12,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span>{cat.icon}</span> {cat.label}
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 10,
              }}>
                {items.map((ach) => (
                  <AchievementCard
                    key={ach.id}
                    achievement={ach}
                    earned={earnedIds.includes(ach.id)}
                    earnedDate={earnedDates[ach.id]}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AchievementCard({ achievement, earned, earnedDate }: {
  achievement: Achievement; earned: boolean; earnedDate?: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px", borderRadius: 14,
      background: earned ? `${T.color.white}ee` : `${T.color.warmStone}88`,
      border: earned ? `1px solid #D4AF3744` : `1px solid ${T.color.cream}`,
      opacity: earned ? 1 : 0.6,
      transition: "all .2s ease",
      position: "relative", overflow: "hidden",
    }}>
      {/* Icon */}
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: earned
          ? `linear-gradient(135deg, #C9A84C22, #D4AF3722)`
          : `${T.color.sandstone}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, position: "relative",
      }}>
        {earned ? achievement.icon : "\u{1F512}"}
      </div>
      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: T.font.display, fontSize: 14, fontWeight: 600,
          color: earned ? T.color.charcoal : T.color.muted,
        }}>
          {achievement.title}
        </div>
        <div style={{
          fontFamily: T.font.body, fontSize: 11,
          color: earned ? T.color.walnut : T.color.muted,
          lineHeight: 1.4,
        }}>
          {earned ? achievement.desc : achievement.desc}
        </div>
        {earned && earnedDate && (
          <div style={{
            fontFamily: T.font.body, fontSize: 10, color: "#C9A84C",
            marginTop: 2,
          }}>
            Unlocked {earnedDate}
          </div>
        )}
      </div>
      {/* Earned shimmer */}
      {earned && (
        <div style={{
          position: "absolute", top: 0, right: 0,
          width: 0, height: 0,
          borderLeft: "20px solid transparent",
          borderTop: "20px solid #D4AF3733",
        }} />
      )}
    </div>
  );
}
