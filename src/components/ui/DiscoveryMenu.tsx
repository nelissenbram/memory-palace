"use client";
import { useEffect, useRef, useCallback } from "react";
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
  const modalRef = useRef<HTMLDivElement>(null);

  // Mark as shown
  useEffect(() => {
    try { localStorage.setItem("mp_discovery_menu_shown", "true"); } catch {}
  }, []);

  // Auto-focus first button on mount
  useEffect(() => {
    if (modalRef.current) {
      const firstBtn = modalRef.current.querySelector<HTMLElement>("button");
      firstBtn?.focus();
    }
  }, []);

  // Focus trap + Escape handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      props.onDismiss();
      return;
    }
    if (e.key === "Tab" && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }, [props.onDismiss]);

  const actionMap: Record<string, () => void> = {
    onMassImport: props.onMassImport,
    onInterview: props.onInterview,
    onTimeCapsule: props.onTimeCapsule,
    onShare: props.onShare,
    onTracks: props.onTracks,
    onCustomize: props.onCustomize,
  };

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-label={t("menuAriaLabel")} onKeyDown={handleKeyDown}
      style={{
      position: "fixed", inset: 0, zIndex: 92,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(42,34,24,0.55)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      animation: "fadeIn .3s ease",
    }}>
      <style>{`@keyframes discoveryUp{from{opacity:0;transform:translateY(1.5rem)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{
        background: T.color.linen,
        borderRadius: "1.5rem",
        padding: isMobile ? "2rem 1.25rem 1.5rem" : "2.5rem 2.5rem 2rem",
        maxWidth: isMobile ? "calc(100vw - 2rem)" : "32.5rem",
        width: "100%",
        maxHeight: "calc(100vh - 3.75rem)",
        overflowY: "auto",
        boxShadow: "0 1.5rem 5rem rgba(44,44,42,.35)",
        animation: "discoveryUp .5s ease both",
        border: `0.09375rem solid ${T.color.cream}`,
      }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2.25rem", marginBottom: "0.625rem" }}>{"\u2728"}</div>
          <h2 style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? "1.5rem" : "1.75rem",
            fontWeight: 500,
            color: T.color.charcoal,
            marginBottom: "0.375rem",
          }}>
            {t("title")}
          </h2>
          <p style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: T.color.muted,
          }}>
            {t("subtitle")}
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}>
          {FEATURES.map((f) => (
            <button key={f.key} onClick={() => { actionMap[f.action](); props.onDismiss(); }} style={{
              padding: "1.125rem 0.75rem",
              borderRadius: "1rem",
              border: `0.09375rem solid ${T.color.cream}`,
              background: `${T.color.white}ee`,
              cursor: "pointer",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              transition: "border-color .2s, box-shadow .2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.color.sandstone; e.currentTarget.style.boxShadow = "0 0.25rem 1rem rgba(44,44,42,.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.color.cream; e.currentTarget.style.boxShadow = "none"; }}
            >
              <span style={{ fontSize: "1.75rem" }}>{f.icon}</span>
              <span style={{
                fontFamily: T.font.display,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: T.color.charcoal,
                lineHeight: 1.2,
              }}>
                {t(f.key)}
              </span>
              <span style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
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
          padding: "0.75rem",
          borderRadius: "0.75rem",
          border: `0.09375rem solid ${T.color.sandstone}`,
          background: "transparent",
          fontFamily: T.font.body,
          fontSize: "0.875rem",
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
