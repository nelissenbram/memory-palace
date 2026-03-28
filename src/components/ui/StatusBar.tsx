"use client";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface StatusBarProps {
  earned: number;
  total: number;
  percentage: number;
  onAchievements: () => void;
  onTracks: () => void;
  pointsElement: React.ReactNode;
}

export default function StatusBar({ earned, total, percentage, onAchievements, onTracks, pointsElement }: StatusBarProps) {
  const { t } = useTranslation("statusBar");
  return (
    <div style={{
      position: "absolute", bottom: "4.375rem", left: "1.75rem", zIndex: 35,
      display: "flex", alignItems: "center", gap: 0,
      height: "2.625rem", borderRadius: "1.3125rem",
      background: `${T.color.white}e6`,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border: `1px solid ${T.color.cream}`,
      boxShadow: "0 4px 16px rgba(44,44,42,.08)",
      animation: "fadeIn .4s ease .8s both",
      overflow: "hidden",
    }}>
      {/* Achievements */}
      <button
        onClick={onAchievements}
        title={t("achievements")}
        aria-label={t("achievements")}
        style={{
          display: "flex", alignItems: "center", gap: "0.375rem",
          padding: "0 0.875rem 0 0.75rem", height: "100%",
          border: "none", background: "transparent", cursor: "pointer",
          transition: "background .15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${T.color.sandstone}18`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <span style={{ fontSize: "1rem" }}>{"\u{1F3C6}"}</span>
        <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 500, color: T.color.walnut }}>
          {earned}/{total}
        </span>
        <div role="progressbar" aria-valuenow={earned} aria-valuemin={0} aria-valuemax={total} aria-label={t("achievements")} style={{ width: "2.5rem", height: "0.375rem", borderRadius: "0.1875rem", background: `${T.color.sandstone}33`, overflow: "hidden" }}>
          <div style={{ width: `${percentage}%`, height: "100%", borderRadius: "0.125rem", background: `linear-gradient(90deg,${T.color.goldLight},${T.color.gold})`, transition: "width .6s ease" }} />
        </div>
      </button>

      {/* Divider */}
      <div aria-hidden="true" style={{ width: 1, height: "1.25rem", background: `${T.color.cream}` }} />

      {/* Tracks */}
      <button
        onClick={onTracks}
        title={t("memoryTracks")}
        aria-label={t("memoryTracks")}
        style={{
          display: "flex", alignItems: "center", gap: "0.375rem",
          padding: "0 0.875rem", height: "100%",
          border: "none", background: "transparent", cursor: "pointer",
          transition: "background .15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${T.color.sandstone}18`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <span style={{ fontSize: "0.875rem" }}>{"\uD83D\uDCDC"}</span>
        <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 500, color: T.color.sage }}>{t("tracks")}</span>
      </button>

      {/* Divider */}
      <div aria-hidden="true" style={{ width: 1, height: "1.25rem", background: `${T.color.cream}` }} />

      {/* Points */}
      <div style={{ padding: "0 0.75rem 0 0.5rem", height: "100%", display: "flex", alignItems: "center" }}>
        {pointsElement}
      </div>
    </div>
  );
}
