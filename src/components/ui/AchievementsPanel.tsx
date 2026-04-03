"use client";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useAchievementStore, ACHIEVEMENTS, type Achievement } from "@/lib/stores/achievementStore";
import { AchievementIcon } from "./AtriumWidgets";

/** Roman laurel wreath trophy icon for the panel header */
function TrophyIcon({ size = 28 }: { size?: number }) {
  const gold = T.color.gold;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cup body */}
      <path d="M8 5h12v8c0 3.5-2.5 6-6 6s-6-2.5-6-6V5z" stroke={gold} strokeWidth="1.5" fill={`${gold}20`} />
      {/* Left handle */}
      <path d="M8 7c-2 0-4 1-4 4s2 4 4 4" stroke={gold} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      {/* Right handle */}
      <path d="M20 7c2 0 4 1 4 4s-2 4-4 4" stroke={gold} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      {/* Stem */}
      <line x1="14" y1="19" x2="14" y2="22" stroke={gold} strokeWidth="1.3" />
      {/* Base */}
      <path d="M10 22h8" stroke={gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 24h10" stroke={gold} strokeWidth="1.3" strokeLinecap="round" />
      {/* Star accent */}
      <path d="M14 9l1 2.5 2.5.2-2 1.7.6 2.4L14 14.5l-2.1 1.3.6-2.4-2-1.7 2.5-.2L14 9z" fill={gold} stroke="none" opacity="0.6" />
    </svg>
  );
}

/** Roman padlock icon for locked achievements */
function LockedBadgeIcon({ size = 20 }: { size?: number }) {
  const grey = T.color.muted;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="9" width="12" height="8" rx="1.5" stroke={grey} strokeWidth="1.3" fill={`${grey}15`} />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke={grey} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <circle cx="10" cy="13" r="1.2" fill={grey} stroke="none" />
      <rect x="9.4" y="13" width="1.2" height="2" rx="0.3" fill={grey} stroke="none" />
    </svg>
  );
}

const CATEGORIES = [
  { key: "memories" as const, labelKey: "catMemories", iconId: "first_memory" },
  { key: "social" as const, labelKey: "catSocial", iconId: "generous_host" },
  { key: "explore" as const, labelKey: "catExplore", iconId: "explorer" },
  { key: "create" as const, labelKey: "catCreate", iconId: "filmmaker" },
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
          width: isMobile ? "100%" : "min(40rem, 92vw)",
          maxHeight: isMobile ? "100%" : "88vh",
          height: isMobile ? "100%" : undefined,
          overflow: "auto",
          background: `linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 100%)`,
          borderRadius: isMobile ? 0 : "1.25rem",
          border: isMobile ? "none" : `1px solid ${T.color.sandstone}44`,
          boxShadow: isMobile ? "none" : `0 1.5rem 5rem rgba(44,44,42,.35)`,
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
              boxShadow: "0 0.25rem 1rem rgba(169,124,46,.3)",
            }}><TrophyIcon size={28} /></div>

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
            aria-label={t("close")}
            style={{
              width: "2.25rem", height: "2.25rem", borderRadius: "1.125rem", border: `1px solid ${T.color.cream}`,
              background: `${T.color.white}cc`, cursor: "pointer", fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.color.muted, fontFamily: T.font.body,
              transition: "opacity .15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.7"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >{"\u2715"}</button>
        </div>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("unlocked", { earned: String(earned), total: String(total) })}
          style={{
            width: "100%", height: "0.5rem", borderRadius: "0.25rem",
            background: `${T.color.sandstone}33`, marginBottom: "1.75rem", overflow: "hidden",
          }}
        >
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
                <AchievementIcon id={cat.iconId} size={18} /> {t(cat.labelKey)}
              </div>
              <div role="list" style={{
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
    <div
      role="listitem"
      aria-label={earned ? t(achievement.titleKey) : t("lockedAchievement", { name: t(achievement.titleKey) })}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "0.75rem",
        padding: "0.75rem 0.875rem",
        borderRadius: "0.875rem",
        background: earned ? `${T.color.white}ee` : `${T.color.warmStone}88`,
        border: earned ? `1px solid ${T.color.gold}44` : `1px solid ${T.color.cream}`,
        opacity: earned ? 1 : 0.6,
        transition: "all .2s ease",
        position: "relative",
        overflow: "hidden",
        minHeight: "3.5rem",
      }}
    >
      {/* Icon — fixed size, vertically centered */}
      <div style={{
        width: "2.625rem",
        height: "2.625rem",
        borderRadius: "0.75rem",
        flexShrink: 0,
        alignSelf: "center",
        background: earned
          ? `linear-gradient(135deg, ${T.color.goldLight}22, ${T.color.gold}22)`
          : `${T.color.sandstone}22`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {earned ? <AchievementIcon id={achievement.icon} size={22} /> : <LockedBadgeIcon size={22} />}
      </div>
      {/* Text — vertically centered block */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "0.0625rem",
      }}>
        <div style={{
          fontFamily: T.font.display,
          fontSize: "0.875rem",
          fontWeight: 600,
          color: earned ? T.color.charcoal : T.color.muted,
          lineHeight: 1.3,
        }}>
          {t(achievement.titleKey)}
        </div>
        <div style={{
          fontFamily: T.font.body,
          fontSize: "0.6875rem",
          color: earned ? T.color.walnut : T.color.muted,
          lineHeight: 1.4,
        }}>
          {t(achievement.descKey)}
        </div>
        {earned && earnedDate && (
          <div style={{
            fontFamily: T.font.body,
            fontSize: "0.625rem",
            color: T.color.goldLight,
            marginTop: "0.125rem",
            lineHeight: 1.3,
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
