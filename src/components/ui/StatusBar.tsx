"use client";
import { T } from "@/lib/theme";

interface StatusBarProps {
  earned: number;
  total: number;
  percentage: number;
  onAchievements: () => void;
  onTracks: () => void;
  pointsElement: React.ReactNode;
}

export default function StatusBar({ earned, total, percentage, onAchievements, onTracks, pointsElement }: StatusBarProps) {
  return (
    <div style={{
      position: "absolute", bottom: 70, left: 28, zIndex: 35,
      display: "flex", alignItems: "center", gap: 0,
      height: 42, borderRadius: 21,
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
        title="Achievements"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 14px 0 12px", height: "100%",
          border: "none", background: "transparent", cursor: "pointer",
          transition: "background .15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${T.color.sandstone}18`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <span style={{ fontSize: 16 }}>{"\u{1F3C6}"}</span>
        <span style={{ fontFamily: T.font.body, fontSize: 11, fontWeight: 500, color: T.color.walnut }}>
          {earned}/{total}
        </span>
        <div style={{ width: 40, height: 6, borderRadius: 3, background: `${T.color.sandstone}33`, overflow: "hidden" }}>
          <div style={{ width: `${percentage}%`, height: "100%", borderRadius: 2, background: `linear-gradient(90deg,${T.color.goldLight},${T.color.gold})`, transition: "width .6s ease" }} />
        </div>
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: `${T.color.cream}` }} />

      {/* Tracks */}
      <button
        onClick={onTracks}
        title="Memory Building Tracks"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 14px", height: "100%",
          border: "none", background: "transparent", cursor: "pointer",
          transition: "background .15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${T.color.sandstone}18`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <span style={{ fontSize: 14 }}>{"\uD83D\uDCDC"}</span>
        <span style={{ fontFamily: T.font.body, fontSize: 11, fontWeight: 500, color: T.color.sage }}>Tracks</span>
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: `${T.color.cream}` }} />

      {/* Points */}
      <div style={{ padding: "0 12px 0 8px", height: "100%", display: "flex", alignItems: "center" }}>
        {pointsElement}
      </div>
    </div>
  );
}
