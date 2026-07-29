"use client";

import React, { useEffect } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";

/* ═══ Action icon set ═══
 * Crafted 24×24 stroke glyphs (stroke=currentColor, 1.6 width) matching the
 * NavigationBar / PalaceSubNav / WingRoomIcons visual language. Kept local and
 * self-contained so the bottom bar renders deterministically across devices
 * instead of leaning on platform emoji fonts. Each icon inherits `color`
 * through `currentColor`, so it themes to MUTED / accent like the rest of the
 * nav chrome. "+" stays a plain glyph inside the accent medallion.
 */
export type ActionIconName =
  | "back" | "add" | "gallery" | "share" | "rooms" | "map" | "timeline"
  | "interviews" | "import" | "shareCard" | "invites" | "shared"
  | "manageShares" | "tracks" | "awards" | "gear" | "sparkle" | "more";

function ActionIcon({ name, size = 20, color = "currentColor" }: { name: ActionIconName; size?: number; color?: string }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth: 1.6, strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const, "aria-hidden": true,
    style: { display: "block" } as React.CSSProperties,
  };
  switch (name) {
    case "back":
      return (<svg {...p}><path d="M15 5l-7 7 7 7" /></svg>);
    case "add":
      return (<svg {...p}><path d="M12 5v14M5 12h14" /></svg>);
    case "gallery": // stacked images
      return (<svg {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="1.5" /><path d="M4 16l4.5-4 3 2.5L16 10l4 5" /><circle cx="9" cy="10" r="1.3" fill={color} stroke="none" /></svg>);
    case "share": // share nodes
      return (<svg {...p}><circle cx="6" cy="12" r="2.4" /><circle cx="17.5" cy="6" r="2.4" /><circle cx="17.5" cy="18" r="2.4" /><path d="M8.2 10.8l7.1-3.6M8.2 13.2l7.1 3.6" /></svg>);
    case "rooms": // house / doors
      return (<svg {...p}><path d="M4 10.5 L12 4 L20 10.5" /><path d="M5.5 10v9.5h13V10" /><rect x="10" y="13" width="4" height="6.5" rx="0.5" /></svg>);
    case "map": // globe with meridian
      return (<svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.4 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.4-3.5-8.5S9.6 5.9 12 3.5z" /></svg>);
    case "timeline": // calendar
      return (<svg {...p}><rect x="4" y="5.5" width="16" height="14" rx="1.6" /><path d="M4 9.5h16M8 3.5v3.5M16 3.5v3.5" /><path d="M8 13h2M13.5 13h2.5M8 16h4.5" /></svg>);
    case "interviews": // microphone
      return (<svg {...p}><rect x="9" y="3" width="6" height="10" rx="3" /><path d="M6 11a6 6 0 0 0 12 0" /><path d="M12 17v3.5M9 20.5h6" /></svg>);
    case "import": // package / box
      return (<svg {...p}><path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2z" /><path d="M4 7.2l8 4.2 8-4.2M12 11.4V21" /></svg>);
    case "shareCard": // export / send arrow
      return (<svg {...p}><path d="M12 15V4M8 7.5 12 3.5 16 7.5" /><path d="M5 13v5.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V13" /></svg>);
    case "invites": // envelope
      return (<svg {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="1.6" /><path d="M4 7l8 6 8-6" /></svg>);
    case "shared": // two people
      return (<svg {...p}><circle cx="8" cy="9" r="2.6" /><path d="M3.5 19c0-2.7 2-4.6 4.5-4.6S12.5 16.3 12.5 19" /><circle cx="16.5" cy="7.5" r="2.1" /><path d="M14 13.4c2.3-.7 6 .2 6 4.6" /></svg>);
    case "manageShares": // sliders
      return (<svg {...p}><path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h9M17 17h3" /><circle cx="15.5" cy="7" r="1.8" fill={color} stroke="none" /><circle cx="9.5" cy="12" r="1.8" fill={color} stroke="none" /><circle cx="14.5" cy="17" r="1.8" fill={color} stroke="none" /></svg>);
    case "tracks": // scroll
      return (<svg {...p}><path d="M6 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1h13" /><path d="M9 8h7M9 11.5h7M9 15h4" /></svg>);
    case "awards": // trophy
      return (<svg {...p}><path d="M8 4h8v4a4 4 0 0 1-8 0z" /><path d="M8 5H5v1.5A3 3 0 0 0 8 9.5M16 5h3v1.5A3 3 0 0 1 16 9.5" /><path d="M10.5 12.5h3l-.4 3.5h1.4v2.5H9.5V16h1.4z" /></svg>);
    case "gear": // settings cog
      return (<svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19" /></svg>);
    case "sparkle": // tour / guide
      return (<svg {...p}><path d="M12 3l1.6 4.3L18 9l-4.4 1.7L12 15l-1.6-4.3L6 9l4.4-1.7z" /><path d="M18.5 15l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" fill={color} stroke="none" /></svg>);
    case "more": // ellipsis
      return (<svg {...p}><circle cx="5.5" cy="12" r="1.5" fill={color} stroke="none" /><circle cx="12" cy="12" r="1.5" fill={color} stroke="none" /><circle cx="18.5" cy="12" r="1.5" fill={color} stroke="none" /></svg>);
    default:
      return null;
  }
}

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
  const primaryActions: { icon: ActionIconName; label: string; action: () => void; accent?: boolean; isBack?: boolean }[] = [];

  // Back button for non-exterior views
  if (view !== "exterior") {
    primaryActions.push({ icon: "back", label: tAction("back"), action: props.onBack, isBack: true });
  }

  if (view === "room" && activeRoomId && !showUpload && !showSharing && !selMem) {
    primaryActions.push({ icon: "add", label: tAction("add"), action: props.onUpload, accent: true });
    if (allRoomMems.length > 0) {
      primaryActions.push({ icon: "gallery", label: tAction("gallery"), action: props.onGallery });
    }
    primaryActions.push({ icon: "share", label: tAction("share"), action: props.onShare });
  } else if (view === "corridor" && activeWing) {
    primaryActions.push({ icon: "gallery", label: tAction("gallery"), action: props.onCorridorGallery, accent: true });
    primaryActions.push({ icon: "rooms", label: tAction("rooms"), action: props.onRoomManager });
    primaryActions.push({ icon: "map", label: tAction("map"), action: props.onMemoryMap });
  } else if (view === "entrance") {
    primaryActions.push({ icon: "timeline", label: tAction("timeline"), action: props.onTimeline, accent: true });
    primaryActions.push({ icon: "map", label: tAction("map"), action: props.onMemoryMap });
    primaryActions.push({ icon: "interviews", label: tAction("interviews"), action: props.onInterviews });
  } else if (view === "exterior") {
    primaryActions.push({ icon: "timeline", label: tAction("timeline"), action: props.onTimeline, accent: true });
    primaryActions.push({ icon: "map", label: tAction("map"), action: props.onMemoryMap });
    primaryActions.push({ icon: "interviews", label: tAction("interviews"), action: props.onInterviews });
  }

  // Progress is only surfaced in the (lazily rendered) More menu, so avoid the
  // call on every bottom-bar render — compute it only when the menu is open.
  const p = moreMenuOpen ? props.getProgress() : { earned: 0, total: 0, percentage: 0 };

  // Build grouped more-menu sections based on view
  type MoreItem = { icon: ActionIconName; label: string; action: () => void };
  type MoreSection = { title: string; items: MoreItem[] };

  const moreSections: MoreSection[] = [];

  // Content section
  const contentItems: MoreItem[] = [];
  if (view === "room") {
    contentItems.push({ icon: "import", label: tAction("import"), action: props.onMassImport });
  }
  if (view === "exterior" || view === "entrance") {
    contentItems.push({ icon: "import", label: tAction("import"), action: props.onMassImport });
  }
  if (view === "corridor" && activeWing) {
    contentItems.push({ icon: "interviews", label: tAction("interviews"), action: props.onInterviews });
  }
  if (contentItems.length > 0) moreSections.push({ title: tAction("moreContent"), items: contentItems });

  // Social section
  const socialItems: MoreItem[] = [];
  if (view === "room") {
    socialItems.push({ icon: "shareCard", label: tAction("shareCard"), action: props.onShare });
  }
  socialItems.push({ icon: "invites", label: tAction("invites"), action: props.onInvites });
  socialItems.push({ icon: "shared", label: tAction("shared"), action: props.onSharedWithMe });
  socialItems.push({ icon: "manageShares", label: tAction("manageShares"), action: props.onSharingSettings });
  moreSections.push({ title: tAction("moreSocial"), items: socialItems });

  // Explore section
  const exploreItems: MoreItem[] = [];
  if (view !== "exterior" && view !== "entrance") {
    exploreItems.push({ icon: "timeline", label: tAction("timeline"), action: props.onTimeline });
    exploreItems.push({ icon: "map", label: tAction("map"), action: props.onMemoryMap });
    exploreItems.push({ icon: "interviews", label: tAction("interviews"), action: props.onInterviews });
  }
  exploreItems.push({ icon: "tracks", label: tAction("tracks"), action: props.onTracks });
  exploreItems.push({ icon: "awards", label: tAction("awards", { earned: String(p.earned), total: String(p.total) }), action: props.onAchievements });
  moreSections.push({ title: tAction("moreExplore"), items: exploreItems });

  // Settings section
  const settingsItems: MoreItem[] = [];
  if (view === "corridor" || view === "room") {
    settingsItems.push({ icon: "rooms", label: tAction("manageRooms"), action: props.onRoomManager });
  }
  settingsItems.push({ icon: "gear", label: tAction("customizeWings"), action: props.onWingManager });
  settingsItems.push({ icon: "sparkle", label: tAction("tour"), action: () => { props.onCloseMore(); window.dispatchEvent(new Event("mp:open-palace-tutorial")); } });
  moreSections.push({ title: tAction("moreSettings"), items: settingsItems });

  return (
    <>
      {/* More menu overlay */}
      {moreMenuOpen && <div role="presentation" onClick={props.onCloseMore} style={{
        position: "absolute", inset: 0, zIndex: 48,
        background: "rgba(64,59,54,0.35)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      }}>
        <div role="dialog" aria-modal="true" data-mp-more-menu onClick={e => e.stopPropagation()} style={{
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
            @media (prefers-reduced-motion: reduce) {
              [data-mp-more-menu], [data-mp-more-menu] * {
                animation: none !important;
                transition: none !important;
              }
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
                    <span aria-hidden="true" style={{ display: "flex", color: T.color.walnut }}>
                      <ActionIcon name={item.icon} size={22} color={T.color.walnut} />
                    </span>
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
      <div data-mp-bottom-bar style={{
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
          @media (prefers-reduced-motion: reduce) {
            [data-mp-bottom-bar], [data-mp-bottom-bar] * {
              animation: none !important;
              transition: none !important;
            }
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
                color: T.color.white,
                boxShadow: `0 0.25rem 0.75rem ${accent}40`,
              }}><ActionIcon name={act.icon} size={act.icon === "add" ? 24 : 20} color={T.color.white} /></div>
            ) : act.isBack ? (
              <div style={{
                width: "2.75rem", height: "2.75rem", borderRadius: "1.375rem",
                background: `${T.color.warmStone}dd`,
                border: `1px solid ${T.color.cream}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: T.color.walnut,
              }}><ActionIcon name={act.icon} size={19} color={T.color.walnut} /></div>
            ) : (
              <span aria-hidden="true" style={{ display: "flex", color: T.color.muted }}>
                <ActionIcon name={act.icon} size={21} color={T.color.muted} />
              </span>
            )}
            <span style={{
              fontFamily: T.font.body,
              fontSize: "calc(0.6875rem * var(--a11y-scale, 1))",
              color: act.accent ? accent : act.isBack ? T.color.walnut : T.color.muted,
              fontWeight: act.accent ? 600 : act.isBack ? 500 : 500,
            }}>{act.label}</span>
          </button>
        ))}
        {/* More button */}
        <button onClick={props.onToggleMore} aria-label={tAction("more")} aria-expanded={moreMenuOpen} style={{
          flex: 0.7, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.125rem",
          padding: "0.5rem 0.25rem", border: "none", background: "transparent", cursor: "pointer",
          minHeight: "3rem", justifyContent: "center",
          transition: "transform .12s",
        }}
        onTouchStart={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.95)"; }}
        onTouchEnd={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
        >
          <span aria-hidden="true" style={{
            display: "flex",
            transform: moreMenuOpen ? "rotate(90deg)" : "none",
            transition: "transform .25s cubic-bezier(.22,1,.36,1)",
            color: moreMenuOpen ? accent : T.color.walnut,
          }}>
            {moreMenuOpen
              ? <ActionIcon name="add" size={21} color={accent} />
              : <ActionIcon name="more" size={21} color={T.color.walnut} />}
          </span>
          <span style={{
            fontFamily: T.font.body,
            fontSize: "calc(0.6875rem * var(--a11y-scale, 1))",
            color: moreMenuOpen ? accent : T.color.muted,
            fontWeight: moreMenuOpen ? 600 : 500,
          }}>{tAction("more")}</span>
        </button>
      </div>
    </>
  );
}
