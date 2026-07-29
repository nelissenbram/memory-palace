"use client";
import { useEffect, useRef, useState, useCallback, useId } from "react";
import { T } from "@/lib/theme";
import { useIsMobile, useIsCompact, useTouchControls } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";

/** True when the OS/browser requests reduced motion — read once at call time. */
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useAchievementStore, ACHIEVEMENTS, type Achievement } from "@/lib/stores/achievementStore";
import { AchievementIcon } from "./AtriumWidgets";
import { shareAchievement } from "@/lib/native/share";

/** Roman laurel wreath trophy icon for the panel header */
function TrophyIcon({ size = 28 }: { size?: number }) {
  const gold = "#8A6410"; // Atrium token: browned gold-lane glyph (true gilt reserved for the palace itself)
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
  const grey = "#716A5E"; // Atrium token: muted ink, full opacity
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="9" width="12" height="8" rx="1.5" stroke={grey} strokeWidth="1.3" fill={`${grey}15`} />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" stroke={grey} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <circle cx="10" cy="13" r="1.2" fill={grey} stroke="none" />
      <rect x="9.4" y="13" width="1.2" height="2" rx="0.3" fill={grey} stroke="none" />
    </svg>
  );
}

/** Share (arrow-up-from-box) icon */
function ShareIcon({ size = 16, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1.5v8" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5 4.5L8 1.5l3 3" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 8.5v5a1 1 0 001 1h8a1 1 0 001-1v-5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
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
  highlightId?: string | null;
}

export default function AchievementsPanel({ onClose, highlightId }: Props) {
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  const isTouch = useTouchControls();
  const { t, locale } = useTranslation("achievementsPanel");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const { earnedIds, earnedDates, getProgress } = useAchievementStore();
  const { earned, total, percentage } = getProgress();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = prefersReducedMotion();
  const headingBaseId = useId();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(64,59,54,0.55)", backdropFilter: "blur(12px)", // Atrium token: warm ink scrim
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: reduceMotion ? undefined : "fadeIn .3s ease",
      }}
      onClick={onClose}
    >
      <div
        className="mp-scroll"
        ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? "100%" : "min(40rem, 92vw)",
          maxHeight: isMobile ? "100%" : "88vh",
          height: isMobile ? "100%" : undefined,
          overflow: "auto",
          background: "linear-gradient(160deg, #F2EDE4 0%, #FCFAF5 78%)", // Atrium: linen → canon CREAM, matches StatisticsPanel
          borderRadius: isMobile ? 0 : "1rem",
          border: isMobile ? "none" : "0.0625rem solid #E3D6BC", // Atrium token: opaque hairline
          boxShadow: isMobile ? "none" : "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token: S2
          padding: isMobile ? "1.25rem 1rem 1rem" : isCompact ? "2.25rem 2rem 2rem" : "2rem 1.75rem 1.75rem",
          paddingTop: isMobile ? "max(1.25rem, env(safe-area-inset-top, 0px))" : undefined,
          paddingBottom: isMobile ? "max(1rem, env(safe-area-inset-bottom, 0px))" : undefined,
          paddingLeft: isMobile ? "max(1rem, env(safe-area-inset-left, 0px))" : undefined,
          paddingRight: isMobile ? "max(1rem, env(safe-area-inset-right, 0px))" : undefined,
          animation: reduceMotion ? undefined : isMobile ? "fadeIn .2s ease" : "fadeUp .3s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "3rem", height: "3rem", borderRadius: "0.85rem",
              background: "rgba(169,116,27,0.18)", // Atrium: gold-lane medallion tint, header focal (stronger than the 0.14 card wells)
              border: "0.0625rem solid #E9DCBE", // Atrium token: gold-lane hairline ring — sets the header apart from the flat card wells
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.10)", // Atrium: S1 lifted for clear focal hierarchy
            }}><TrophyIcon size={28} /></div>

            <div>
              <div style={{ fontFamily: T.font.display, fontSize: "1.375rem", fontWeight: 600, color: "#403B36", lineHeight: 1.15 }}>
                {t("title")}
              </div>
              <div style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E" }}>
                {t("unlocked", { earned: String(earned), total: String(total) })}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t("close")}
            style={{
              width: isTouch ? "2.75rem" : "2.25rem", height: isTouch ? "2.75rem" : "2.25rem", borderRadius: "1.5rem", border: "0.0625rem solid #E3D6BC", // Atrium token: opaque hairline
              background: `${T.color.white}cc`, cursor: "pointer", fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#716A5E", fontFamily: T.font.body,
              transition: "opacity 0.2s ease",
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
            background: "#E3D6BC", marginBottom: "1.75rem", overflow: "hidden", // Atrium token: opaque hairline band, no alpha track
          }}
        >
          <div style={{
            width: "100%", height: "100%", borderRadius: "0.25rem",
            background: "linear-gradient(90deg, #A9741B, #8A6410)", // Atrium: browned gold-lane, true gilt reserved
            transform: `scaleX(${percentage / 100})`,
            transformOrigin: "left center",
            transition: "transform 0.3s ease",
          }} />
        </div>

        {/* Category sections */}
        {CATEGORIES.map((cat) => {
          const items = ACHIEVEMENTS.filter((a) => a.category === cat.key);
          const headingId = `${headingBaseId}-${cat.key}`;
          return (
            <div key={cat.key} style={{ marginBottom: "1.5rem" }}>
              <div
                id={headingId}
                role="heading"
                aria-level={2}
                style={{
                  fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, // Atrium: one small-caps overline voice
                  letterSpacing: "0.12em", textTransform: "uppercase",
                  color: "#8A6410", marginBottom: "0.75rem",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                }}
              >
                <AchievementIcon id={cat.iconId} size={18} /> {t(cat.labelKey)}
              </div>
              <div role="list" aria-labelledby={headingId} style={{
                display: "grid", gridTemplateColumns: (isMobile || isCompact) ? "1fr" : "repeat(auto-fill, minmax(16.25rem, 1fr))",
                gap: "0.625rem",
              }}>
                {items.map((ach) => (
                  <AchievementCard
                    key={ach.id}
                    achievement={ach}
                    earned={earnedIds.includes(ach.id)}
                    earnedDate={earnedDates[ach.id]}
                    highlighted={ach.id === highlightId}
                    onShareToast={showToast}
                    locale={locale}
                    isTouch={isTouch}
                    reduceMotion={reduceMotion}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Toast — role=status/aria-live so screen readers announce clipboard/share feedback */}
        <div role="status" aria-live="polite" style={{ position: "fixed", left: 0, top: 0, width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          {toast || ""}
        </div>
        {toast && (
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              bottom: "max(2rem, env(safe-area-inset-bottom, 0px))", // clear the home indicator in landscape
              left: "50%", transform: "translateX(-50%)",
              padding: "0.625rem 1.25rem", borderRadius: "0.75rem",
              background: "#403B36", color: T.color.white, // Atrium token: ink
              fontFamily: T.font.body, fontSize: "0.8125rem",
              boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.14)", // Atrium token: S2
              zIndex: 110, animation: reduceMotion ? undefined : "fadeIn .2s ease",
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

function AchievementCard({ achievement, earned, earnedDate, highlighted, onShareToast, locale, isTouch, reduceMotion }: {
  achievement: Achievement; earned: boolean; earnedDate?: string; highlighted?: boolean;
  onShareToast: (msg: string) => void;
  locale: string; isTouch: boolean; reduceMotion: boolean;
}) {
  const { t } = useTranslation("achievementsPanel");
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = useCallback(async () => {
    const name = t(achievement.titleKey);
    const text = t("shareText", { name });
    // Detect whether a system share sheet (native Capacitor or Web Share) is
    // available. When it is, shareAchievement() presents the sheet and the
    // clipboard path is only reached if the sheet itself fails — so we never
    // claim "copied" while a sheet was shown (avoids the user-cancel misfire).
    // When no sheet exists, clipboard is the guaranteed path and its toast is
    // the only feedback the user gets.
    const hasNativeShare = (await import("@capacitor/core")).Capacitor.isNativePlatform();
    const hasWebShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
    const clipboardIsOnlyPath = !hasNativeShare && !hasWebShare;
    const ok = await shareAchievement(name, text);
    if (!ok) {
      onShareToast(t("shareFailed"));
    } else if (clipboardIsOnlyPath) {
      onShareToast(t("copiedToClipboard"));
    }
  }, [achievement.titleKey, onShareToast, t]);

  // Localized unlocked-date label (guards invalid ISO strings).
  const formattedDate = (() => {
    if (!earnedDate) return "";
    const d = new Date(earnedDate);
    if (isNaN(d.getTime())) return earnedDate;
    try {
      return d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return earnedDate;
    }
  })();

  useEffect(() => {
    if (highlighted && cardRef.current) {
      const el = cardRef.current;
      const scroll = () => el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      // Defer so lazy content/layout is settled before scrolling.
      const raf = requestAnimationFrame(scroll);
      return () => cancelAnimationFrame(raf);
    }
  }, [highlighted, reduceMotion]);

  return (
    <div
      ref={cardRef}
      role="listitem"
      aria-label={earned ? t(achievement.titleKey) : t("lockedAchievement", { name: t(achievement.titleKey) })}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "0.75rem",
        padding: "0.75rem 0.875rem",
        borderRadius: "1rem",
        background: highlighted ? `${T.color.gold}18` : earned ? T.color.white : "#ECE5D8", // Atrium: pre-mixed opaque surfaces
        border: highlighted ? "0.125rem solid #D4AF37" : earned ? "0.0625rem solid #E9DCBE" : "0.0625rem solid #E3D6BC", // gold = highlight frame only
        opacity: 1, // Atrium: no colour+opacity double-dimming; muted ink carries the locked state
        transition: reduceMotion ? undefined : "all .2s ease",
        position: "relative",
        overflow: "hidden",
        minHeight: "3.5rem",
        boxShadow: highlighted ? `0 0 1rem ${T.color.gold}33` : undefined,
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
          ? "rgba(169,116,27,0.14)" // Atrium token: gold-lane medallion tint
          : "#EBE3D4", // Atrium: pre-mixed opaque locked well (T.color.lineFaint), no alpha
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
          fontSize: "0.9375rem",
          fontWeight: 600,
          color: earned ? "#403B36" : "#716A5E", // Atrium tokens: ink / muted
          lineHeight: 1.15,
        }}>
          {t(achievement.titleKey)}
        </div>
        <div style={{
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          color: "#716A5E", // Atrium token: muted, full opacity
          lineHeight: 1.4,
        }}>
          {t(achievement.descKey)}
        </div>
        {earned && earnedDate && (
          <div style={{
            fontFamily: T.font.body,
            fontSize: "0.6875rem", // quiet metadata — smaller than the description
            fontWeight: 600,
            letterSpacing: "0.02em",
            color: "#8A6410", // Atrium token: gold-lane datum
            marginTop: "0.1875rem",
            lineHeight: 1.3,
          }}>
            {t("unlockedDate", { date: formattedDate })}
          </div>
        )}
      </div>
      {/* Share button — earned only */}
      {earned && (
        <button
          onClick={handleShare}
          aria-label={t("shareButton")}
          title={t("shareButton")}
          style={{
            // >=2.75rem hit area (touch floor); the visual chip stays 1.75rem via inner box.
            width: "2.75rem", height: "2.75rem",
            border: "none", background: "transparent", padding: 0,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, margin: "-0.5rem -0.25rem -0.5rem 0",
            transition: reduceMotion ? undefined : "opacity 0.2s ease",
          }}
        >
          <span style={{
            width: isTouch ? "2.375rem" : "1.75rem", height: isTouch ? "2.375rem" : "1.75rem", borderRadius: "0.7rem",
            border: "0.0625rem solid #E9DCBE", // Atrium token: gold-lane border
            background: "rgba(169,116,27,0.10)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: reduceMotion ? undefined : "background 0.2s ease",
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(169,116,27,0.18)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(169,116,27,0.10)"; }}
          >
            <ShareIcon size={isTouch ? 16 : 14} color="#8A6410" />
          </span>
        </button>
      )}
      {/* Earned shimmer */}
      {earned && (
        <div style={{
          position: "absolute", top: 0, right: 0,
          width: 0, height: 0,
          borderLeft: "1.25rem solid transparent",
          borderTop: "1.25rem solid rgba(169,116,27,0.25)", // Atrium: browned gold-lane, true gilt reserved
        }} />
      )}
    </div>
  );
}
