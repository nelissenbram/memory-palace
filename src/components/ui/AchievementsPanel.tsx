"use client";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useAchievementStore, ACHIEVEMENTS, type Achievement } from "@/lib/stores/achievementStore";

const CATEGORIES = [
  { key: "memories" as const, labelKey: "catMemories", icon: "\u{1F31F}" },
  { key: "social" as const, labelKey: "catSocial", icon: "\u{1F91D}" },
  { key: "explore" as const, labelKey: "catExplore", icon: "\u{1F9ED}" },
  { key: "create" as const, labelKey: "catCreate", icon: "\u{1F3AC}" },
];

interface Props {
  onClose: () => void;
}

export default function AchievementsPanel({ onClose }: Props) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("achievementsPanel");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
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
        ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? "100%" : "min(640px, 92vw)",
          maxHeight: isMobile ? "100%" : "88vh",
          height: isMobile ? "100%" : undefined,
          overflow: "auto",
          background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 100%)`,
          borderRadius: isMobile ? 0 : "1.25rem",
          border: isMobile ? "none" : `1px solid ${T.color.sandstone}44`,
          boxShadow: isMobile ? "none" : `0 24px 80px rgba(44,44,42,.35)`,
          padding: isMobile ? "1.25rem 1rem 1rem" : "2rem 1.75rem 1.75rem",
          animation: isMobile ? "fadeIn .2s ease" : "fadeUp .35s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "3rem", height: "3rem", borderRadius: "0.875rem",
              background: `linear-gradient(135deg, ${T.color.goldLight}, ${T.color.goldDark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.5rem", boxShadow: "0 4px 16px rgba(169,124,46,.3)",
            }}>{"\u{1F3C6}"}</div>
            <div>
              <div style={{ fontFamily: T.font.display, fontSize: "1.5rem", fontWeight: 600, color: T.color.charcoal }}>
                {t("title")}
              </div>
              <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted }}>
                {t("unlocked", { earned: String(earned), total: String(total) })}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "2.25rem", height: "2.25rem", borderRadius: "1.125rem", border: `1px solid ${T.color.cream}`,
              background: `${T.color.white}cc`, cursor: "pointer", fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.color.muted, fontFamily: T.font.body,
            }}
          >{"\u2715"}</button>
        </div>

        {/* Progress bar */}
        <div style={{
          width: "100%", height: "0.5rem", borderRadius: "0.25rem",
          background: `${T.color.sandstone}33`, marginBottom: "1.75rem", overflow: "hidden",
        }}>
          <div style={{
            width: `${percentage}%`, height: "100%", borderRadius: "0.25rem",
            background: `linear-gradient(90deg, ${T.color.goldLight}, ${T.color.gold})`,
            transition: "width .6s ease",
          }} />
        </div>

        {/* Category sections */}
        {CATEGORIES.map((cat) => {
          const items = ACHIEVEMENTS.filter((a) => a.category === cat.key);
          return (
            <div key={cat.key} style={{ marginBottom: "1.5rem" }}>
              <div style={{
                fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
                color: T.color.walnut, marginBottom: "0.75rem",
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}>
                <span>{cat.icon}</span> {t(cat.labelKey)}
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "0.625rem",
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
  const { t } = useTranslation("achievementsPanel");
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      padding: "0.75rem 0.875rem", borderRadius: "0.875rem",
      background: earned ? `${T.color.white}ee` : `${T.color.warmStone}88`,
      border: earned ? `1px solid ${T.color.gold}44` : `1px solid ${T.color.cream}`,
      opacity: earned ? 1 : 0.6,
      transition: "all .2s ease",
      position: "relative", overflow: "hidden",
    }}>
      {/* Icon */}
      <div style={{
        width: "2.625rem", height: "2.625rem", borderRadius: "0.75rem", flexShrink: 0,
        background: earned
          ? `linear-gradient(135deg, ${T.color.goldLight}22, ${T.color.gold}22)`
          : `${T.color.sandstone}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.375rem", position: "relative",
      }}>
        {earned ? achievement.icon : "\u{1F512}"}
      </div>
      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600,
          color: earned ? T.color.charcoal : T.color.muted,
        }}>
          {t(achievement.titleKey)}
        </div>
        <div style={{
          fontFamily: T.font.body, fontSize: "0.6875rem",
          color: earned ? T.color.walnut : T.color.muted,
          lineHeight: 1.4,
        }}>
          {t(achievement.descKey)}
        </div>
        {earned && earnedDate && (
          <div style={{
            fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.goldLight,
            marginTop: "0.125rem",
          }}>
            {t("unlockedDate", { date: earnedDate || "" })}
          </div>
        )}
      </div>
      {/* Earned shimmer */}
      {earned && (
        <div style={{
          position: "absolute", top: 0, right: 0,
          width: 0, height: 0,
          borderLeft: "20px solid transparent",
          borderTop: `20px solid ${T.color.gold}33`,
        }} />
      )}
    </div>
  );
}
