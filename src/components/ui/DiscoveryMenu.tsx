"use client";
import { useEffect, useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useIsPortrait } from "@/lib/hooks/useIsPortrait";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { INK, MUTED, HAIRLINE, CREAM, EMBER, SHADOW, HOVER_SHADOW } from "@/lib/libraryTokens";

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
  const isPortrait = useIsPortrait();
  // Landscape phone (short + wide): go to 3 columns with tighter cards so the
  // grid doesn't stack into a tall list the height can't show.
  const landscapePhone = isMobile && !isPortrait;
  const gridCols = landscapePhone ? "1fr 1fr 1fr" : isMobile ? "1fr 1fr" : "1fr 1fr 1fr";
  const cardPadV = landscapePhone ? "0.75rem" : "1.125rem";
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
      background: "rgba(64,59,54,0.55)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      animation: "fadeIn .3s ease",
    }}>
      <style>{`@keyframes discoveryUp{from{opacity:0;transform:translateY(1.5rem)}to{opacity:1;transform:translateY(0)}}
        .mp-discovery-tile:focus-visible{outline:0.1875rem solid ${T.color.gold};outline-offset:0.1875rem}
        @media (prefers-reduced-motion: reduce){.mp-discovery-tile{transition:none!important}}`}</style>
      <div style={{
        background: CREAM,
        borderRadius: "1.5rem",
        padding: isMobile ? "2rem 1.25rem 1.5rem" : "2.5rem 2.5rem 2rem",
        maxWidth: isMobile ? "calc(100vw - 2rem)" : "32.5rem",
        width: "100%",
        maxHeight: "calc(100dvh - 3.75rem - env(safe-area-inset-bottom, 0px))",
        overflowY: "auto",
        boxShadow: "0 1.5rem 5rem rgba(64,59,54,.35)",
        animation: "discoveryUp .5s ease both",
        border: `0.0625rem solid ${HAIRLINE}`,
      }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2.25rem", marginBottom: "0.625rem" }}>{"\u2728"}</div>
          <h2 style={{
            fontFamily: T.font.display,
            fontSize: isMobile ? "1.5rem" : "1.75rem",
            fontWeight: 500,
            color: INK,
            marginBottom: "0.375rem",
          }}>
            {t("title")}
          </h2>
          <p style={{
            fontFamily: T.font.body,
            fontSize: "0.875rem",
            color: MUTED,
          }}>
            {t("subtitle")}
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: gridCols,
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}>
          {FEATURES.map((f) => (
            <button key={f.key} className="mp-discovery-tile" onClick={() => { actionMap[f.action](); props.onDismiss(); }} style={{
              padding: `${cardPadV} 0.75rem`,
              minHeight: "2.75rem",
              borderRadius: "1rem",
              border: `0.0625rem solid ${HAIRLINE}`,
              background: CREAM,
              cursor: "pointer",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              WebkitTapHighlightColor: "transparent",
              transition: "border-color .2s, box-shadow .2s, transform .2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = EMBER; e.currentTarget.style.boxShadow = SHADOW[1]; e.currentTarget.style.transform = "translateY(-0.1875rem)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = HAIRLINE; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
              onPointerDown={(e) => { e.currentTarget.style.borderColor = EMBER; e.currentTarget.style.boxShadow = HOVER_SHADOW; }}
              onPointerUp={(e) => { e.currentTarget.style.borderColor = HAIRLINE; e.currentTarget.style.boxShadow = "none"; }}
            >
              <span style={{ fontSize: "1.75rem" }}>{f.icon}</span>
              <span style={{
                fontFamily: T.font.display,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: INK,
                lineHeight: 1.2,
              }}>
                {t(f.key)}
              </span>
              <span style={{
                fontFamily: T.font.body,
                fontSize: "0.6875rem",
                color: MUTED,
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
          minHeight: "2.75rem",
          borderRadius: "0.75rem",
          border: `0.0625rem solid ${HAIRLINE}`,
          background: "transparent",
          fontFamily: T.font.body,
          fontSize: "0.875rem",
          fontWeight: 500,
          color: MUTED,
          cursor: "pointer",
          transition: "background .2s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${CREAM}50`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {t("exploreOnMyOwn")}
        </button>
      </div>
    </div>
  );
}
