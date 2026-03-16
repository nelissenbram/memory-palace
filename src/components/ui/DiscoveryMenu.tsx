"use client";
import { useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface DiscoveryMenuProps {
  onMassImport: () => void;
  onInterview: () => void;
  onTimeCapsule: () => void;
  onShare: () => void;
  onTracks: () => void;
  onCustomize: () => void;
  onDismiss: () => void;
}

const FEATURES = [
  { key: "massImport", descKey: "massImportDesc", icon: "\uD83D\uDCE6", action: "onMassImport" },
  { key: "lifeInterviews", descKey: "lifeInterviewsDesc", icon: "\uD83C\uDF99\uFE0F", action: "onInterview" },
  { key: "timeCapsules", descKey: "timeCapsuleDesc", icon: "\u23F3", action: "onTimeCapsule" },
  { key: "shareFamily", descKey: "shareFamilyDesc", icon: "\uD83E\uDD1D", action: "onShare" },
  { key: "tracksAchievements", descKey: "tracksAchievementsDesc", icon: "\uD83C\uDFC6", action: "onTracks" },
  { key: "customizeRooms", descKey: "customizeRoomsDesc", icon: "\uD83C\uDFA8", action: "onCustomize" },
] as const;

export default function DiscoveryMenu(props: DiscoveryMenuProps) {
  const isMobile = useIsMobile();
  const { t } = useTranslation("discovery");

  // Mark as shown
  useEffect(() => {
    try { localStorage.setItem("mp_discovery_menu_shown", "true"); } catch {}
  }, []);

  const actionMap: Record<string, () => void> = {
    onMassImport: props.onMassImport,
    onInterview: props.onInterview,
    onTimeCapsule: props.onTimeCapsule,
    onShare: props.onShare,
    onTracks: props.onTracks,
    onCustomize: props.onCustomize,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 92,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(42,34,24,0.55)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      animation: "fadeIn .3s ease",
    }}>
      <style>{`@keyframes discoveryUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{
        background: T.color.linen,
        borderRadius: 24,
        padding: isMobile ? "32px 20px 24px" : "40px 40px 32px",
        maxWidth: isMobile ? "calc(100vw - 32px)" : 520,
        width: "100%",
        maxHeight: "calc(100vh - 60px)",
        overflowY: "auto",
        boxShadow: "0 24px 80px rgba(44,44,42,.35)",
        animation: "discoveryUp .5s ease both",
        border: `1.5px solid ${T.color.cream}`,
      }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{"\u2728"}</div>
          <h2 style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? 24 : 28,
            fontWeight: 500,
            color: T.color.charcoal,
            marginBottom: 6,
          }}>
            {t("title")}
          </h2>
          <p style={{
            fontFamily: T.font.body,
            fontSize: 14,
            color: T.color.muted,
          }}>
            {t("subtitle")}
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
          gap: 12,
          marginBottom: 20,
        }}>
          {FEATURES.map((f) => (
            <button key={f.key} onClick={() => { actionMap[f.action](); props.onDismiss(); }} style={{
              padding: "18px 12px",
              borderRadius: 16,
              border: `1.5px solid ${T.color.cream}`,
              background: `${T.color.white}ee`,
              cursor: "pointer",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              transition: "border-color .2s, box-shadow .2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.color.sandstone; e.currentTarget.style.boxShadow = "0 4px 16px rgba(44,44,42,.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.color.cream; e.currentTarget.style.boxShadow = "none"; }}
            >
              <span style={{ fontSize: 28 }}>{f.icon}</span>
              <span style={{
                fontFamily: T.font.display,
                fontSize: 14,
                fontWeight: 600,
                color: T.color.charcoal,
                lineHeight: 1.2,
              }}>
                {t(f.key)}
              </span>
              <span style={{
                fontFamily: T.font.body,
                fontSize: 11,
                color: T.color.muted,
                lineHeight: 1.3,
              }}>
                {t(f.descKey)}
              </span>
            </button>
          ))}
        </div>

        <button onClick={props.onDismiss} style={{
          display: "block",
          width: "100%",
          padding: "12px",
          borderRadius: 12,
          border: `1.5px solid ${T.color.sandstone}`,
          background: "transparent",
          fontFamily: T.font.body,
          fontSize: 14,
          fontWeight: 500,
          color: T.color.walnut,
          cursor: "pointer",
          transition: "background .2s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${T.color.cream}50`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {t("exploreOnMyOwn")}
        </button>
      </div>
    </div>
  );
}
