"use client";

import { useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useTutorialStore } from "@/lib/stores/tutorialStore";

/* ═══ Mobile Bottom Action Bar ═══ */
export interface MobileBottomBarProps {
  view: string;
  activeWing: string | null;
  activeRoomId: string | null;
  allRoomMems: any[];
  showUpload: boolean;
  showSharing: boolean;
  selMem: any;
  wingData: any;
  moreMenuOpen: boolean;
  onToggleMore: () => void;
  onCloseMore: () => void;
  onUpload: () => void;
  onAchievements: () => void;
  onMassImport: () => void;
  onTimeline: () => void;
  onMemoryMap: () => void;
  onWingManager: () => void;
  onRoomManager: () => void;
  onGallery: () => void;
  onCorridorGallery: () => void;
  onShare: () => void;
  onTracks: () => void;
  onInvites: () => void;
  onSharedWithMe: () => void;
  onSharingSettings: () => void;
  onInterviews: () => void;
  getProgress: () => { earned: number; total: number; percentage: number };
  onBack: () => void;
}

export default function MobileBottomBar(props: MobileBottomBarProps) {
  const { view, activeWing, activeRoomId, allRoomMems, showUpload, showSharing, selMem, wingData, moreMenuOpen } = props;
  const { t: tAction } = useTranslation("actionMenu");
  const accent = wingData?.accent || T.color.terracotta;

  // Close more menu on Escape
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") props.onCloseMore(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [moreMenuOpen, props.onCloseMore]);

  // Define primary actions based on view (max 3 + more = 4 visible)
  const primaryActions: { icon: string; label: string; action: () => void; accent?: boolean; isBack?: boolean }[] = [];

  // Back button for non-exterior views
  if (view !== "exterior") {
    primaryActions.push({ icon: "\u2190", label: tAction("back"), action: props.onBack, isBack: true });
  }

  if (view === "room" && activeRoomId && !showUpload && !showSharing && !selMem) {
    primaryActions.push({ icon: "+", label: tAction("add"), action: props.onUpload, accent: true });
    if (allRoomMems.length > 0) {
      primaryActions.push({ icon: "\u{1F5BC}\uFE0F", label: tAction("gallery"), action: props.onGallery });
    }
    primaryActions.push({ icon: "\u{1F91D}", label: tAction("share"), action: props.onShare });
  } else if (view === "corridor" && activeWing) {
    primaryActions.push({ icon: "\u{1F5BC}\uFE0F", label: tAction("gallery"), action: props.onCorridorGallery, accent: true });
    primaryActions.push({ icon: "\u{1F527}", label: tAction("rooms"), action: props.onRoomManager });
    primaryActions.push({ icon: "\uD83C\uDF0D", label: tAction("map"), action: props.onMemoryMap });
  } else if (view === "entrance") {
    primaryActions.push({ icon: "\uD83D\uDCC5", label: tAction("timeline"), action: props.onTimeline, accent: true });
    primaryActions.push({ icon: "\uD83C\uDF0D", label: tAction("map"), action: props.onMemoryMap });
    primaryActions.push({ icon: "\uD83C\uDF99\uFE0F", label: tAction("interviews"), action: props.onInterviews });
  } else if (view === "exterior") {
    primaryActions.push({ icon: "\uD83D\uDCC5", label: tAction("timeline"), action: props.onTimeline, accent: true });
    primaryActions.push({ icon: "\uD83C\uDF0D", label: tAction("map"), action: props.onMemoryMap });
    primaryActions.push({ icon: "\uD83C\uDF99\uFE0F", label: tAction("interviews"), action: props.onInterviews });
  }

  const p = props.getProgress();

  // Build grouped more-menu sections based on view
  type MoreItem = { icon: string; label: string; action: () => void };
  type MoreSection = { title: string; items: MoreItem[] };

  const moreSections: MoreSection[] = [];

  // Content section
  const contentItems: MoreItem[] = [];
  if (view === "room") {
    contentItems.push({ icon: "\u{1F4E6}", label: tAction("import"), action: props.onMassImport });
  }
  if (view === "exterior" || view === "entrance") {
    contentItems.push({ icon: "\u{1F4E6}", label: tAction("import"), action: props.onMassImport });
  }
  if (view === "corridor" && activeWing) {
    contentItems.push({ icon: "\uD83C\uDF99\uFE0F", label: tAction("interviews"), action: props.onInterviews });
  }
  if (contentItems.length > 0) moreSections.push({ title: tAction("moreContent"), items: contentItems });

  // Social section
  const socialItems: MoreItem[] = [];
  if (view === "room") {
    socialItems.push({ icon: "\u{1F4E4}", label: tAction("shareCard"), action: props.onShare });
  }
  socialItems.push({ icon: "\u{1F4EC}", label: tAction("invites"), action: props.onInvites });
  socialItems.push({ icon: "\u{1F91D}", label: tAction("shared"), action: props.onSharedWithMe });
  socialItems.push({ icon: "\u{1F6E0}\uFE0F", label: tAction("manageShares"), action: props.onSharingSettings });
  moreSections.push({ title: tAction("moreSocial"), items: socialItems });

  // Explore section
  const exploreItems: MoreItem[] = [];
  if (view !== "exterior" && view !== "entrance") {
    exploreItems.push({ icon: "\uD83D\uDCC5", label: tAction("timeline"), action: props.onTimeline });
    exploreItems.push({ icon: "\uD83C\uDF0D", label: tAction("map"), action: props.onMemoryMap });
    exploreItems.push({ icon: "\uD83C\uDF99\uFE0F", label: tAction("interviews"), action: props.onInterviews });
  }
  exploreItems.push({ icon: "\uD83D\uDCDC", label: tAction("tracks"), action: props.onTracks });
  exploreItems.push({ icon: "\u{1F3C6}", label: tAction("awards", { earned: String(p.earned), total: String(p.total) }), action: props.onAchievements });
  moreSections.push({ title: tAction("moreExplore"), items: exploreItems });

  // Settings section
  const settingsItems: MoreItem[] = [];
  if (view === "corridor" || view === "room") {
    settingsItems.push({ icon: "\u{1F527}", label: tAction("manageRooms"), action: props.onRoomManager });
  }
  settingsItems.push({ icon: "\u2699\uFE0F", label: tAction("customizeWings"), action: props.onWingManager });
  settingsItems.push({ icon: "\u2728", label: tAction("tour"), action: () => { props.onCloseMore(); useTutorialStore.getState().start(); } });
  moreSections.push({ title: tAction("moreSettings"), items: settingsItems });

  return (
    <>
      {/* More menu overlay */}
      {moreMenuOpen && <div role="presentation" onClick={props.onCloseMore} style={{
        position: "absolute", inset: 0, zIndex: 48,
        background: "rgba(42,34,24,.4)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      }}>
        <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{
          position: "absolute", bottom: "4.5rem", left: "0.75rem", right: "0.75rem",
          maxHeight: "70vh", overflowY: "auto",
          background: `${T.color.linen}e8`,
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderRadius: "1rem",
          border: `1px solid ${T.color.cream}`,
          boxShadow: `0 -0.5rem 2.5rem rgba(44,44,42,.2), inset 0 1px 0 rgba(255,255,255,.5)`,
          padding: "0.75rem",
          animation: "mobileMoreSlideUp .3s cubic-bezier(.22,1,.36,1)",
        }}>
          <style>{`
            @keyframes mobileMoreSlideUp {
              from { opacity: 0; transform: translateY(1.5rem); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          {moreSections.map((section, si) => (
            <div key={si} style={{ marginBottom: si < moreSections.length - 1 ? "0.625rem" : 0 }}>
              <div style={{
                fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 700,
                color: T.color.muted, textTransform: "uppercase", letterSpacing: "0.06rem",
                padding: "0.25rem 0.375rem 0.375rem",
              }}>{section.title}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                {section.items.map((item, ii) => (
                  <button key={ii} onClick={item.action} aria-label={item.label} style={{
                    padding: "0.75rem 0.375rem", borderRadius: "0.75rem",
                    border: `1px solid ${T.color.cream}`,
                    background: `${T.color.white}cc`,
                    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                    cursor: "pointer", textAlign: "center",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem",
                    minHeight: "3.5rem", justifyContent: "center",
                    transition: "transform .12s, background .15s",
                  }}
                  onTouchStart={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
                  onTouchEnd={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                  >
                    <span aria-hidden="true" style={{ fontSize: "1.25rem", lineHeight: 1 }}>{item.icon}</span>
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.6875rem",
                      color: T.color.walnut, fontWeight: 500, lineHeight: 1.2,
                    }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>}

      {/* Bottom bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 49,
        minHeight: "3.75rem", paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: `${T.color.linen}f4`,
        backdropFilter: "blur(24px) saturate(1.2)",
        WebkitBackdropFilter: "blur(24px) saturate(1.2)",
        borderTop: `1px solid ${T.color.cream}`,
        boxShadow: `0 -1px 0.5rem rgba(44,44,42,.06), inset 0 1px 0 rgba(255,255,255,.35)`,
        display: "flex", alignItems: "center", justifyContent: "space-around",
        padding: "0 0.375rem",
        animation: "mobileBarSlideUp .4s cubic-bezier(.22,1,.36,1) .15s both",
      }}>
        <style>{`
          @keyframes mobileBarSlideUp {
            from { opacity: 0; transform: translateY(100%); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        {primaryActions.slice(0, 3).map((act, i) => (
          <button key={i} onClick={act.action} aria-label={act.label} style={{
            flex: act.isBack ? 0.7 : 1,
            display: "flex", flexDirection: "column", alignItems: "center", gap: "0.125rem",
            padding: "0.5rem 0.25rem", border: "none", background: "transparent", cursor: "pointer",
            minHeight: "3rem", justifyContent: "center",
            transition: "transform .12s",
          }}
          onTouchStart={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
          onTouchEnd={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          >
            {act.accent ? (
              <div style={{
                width: "2.375rem", height: "2.375rem", borderRadius: "1.1875rem",
                background: `linear-gradient(135deg, ${accent}, ${T.color.walnut})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: T.color.white, fontSize: act.icon === "+" ? "1.375rem" : "1.0625rem", fontWeight: 300,
                boxShadow: `0 0.25rem 0.75rem ${accent}40`,
              }}>{act.icon}</div>
            ) : act.isBack ? (
              <div style={{
                width: "2.75rem", height: "2.75rem", borderRadius: "1.375rem",
                background: `${T.color.warmStone}dd`,
                border: `1px solid ${T.color.cream}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.9375rem", color: T.color.walnut,
              }}>{act.icon}</div>
            ) : (
              <span aria-hidden="true" style={{ fontSize: "1.1875rem", lineHeight: 1 }}>{act.icon}</span>
            )}
            <span style={{
              fontFamily: T.font.body, fontSize: "0.5625rem",
              color: act.accent ? accent : act.isBack ? T.color.walnut : T.color.muted,
              fontWeight: act.accent ? 600 : act.isBack ? 500 : 400,
            }}>{act.label}</span>
          </button>
        ))}
        {/* More button */}
        <button onClick={props.onToggleMore} aria-label={tAction("more")} style={{
          flex: 0.7, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.125rem",
          padding: "0.5rem 0.25rem", border: "none", background: "transparent", cursor: "pointer",
          minHeight: "3rem", justifyContent: "center",
          transition: "transform .12s",
        }}
        onTouchStart={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
        onTouchEnd={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
        >
          <span style={{
            fontSize: "1.1875rem", lineHeight: 1,
            transform: moreMenuOpen ? "rotate(45deg)" : "none",
            transition: "transform .25s cubic-bezier(.22,1,.36,1)",
            color: moreMenuOpen ? accent : T.color.walnut,
          }}>
            {moreMenuOpen ? "+" : "\u22EF"}
          </span>
          <span style={{
            fontFamily: T.font.body, fontSize: "0.5625rem",
            color: moreMenuOpen ? accent : T.color.muted,
            fontWeight: moreMenuOpen ? 600 : 400,
          }}>{tAction("more")}</span>
        </button>
      </div>
    </>
  );
}
