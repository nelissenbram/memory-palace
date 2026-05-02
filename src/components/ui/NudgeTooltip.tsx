"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useNudgeStore, type NudgeId } from "@/lib/stores/nudgeStore";
import { useTranslation } from "@/lib/hooks/useTranslation";

type PageId = "atrium" | "library" | "palace";

// Bridge nudges target specific nav buttons
const BRIDGE_TARGET: Record<string, string> = {
  atrium_go_library: "nav_library_btn",
  library_go_palace: "nav_3d_btn",
  palace_room_upload: "atrium_tools_button",
};

// Overview nudges — centered floating cards with bullet lists
const OVERVIEW_NUDGES = new Set<string>(["atrium_overview", "library_overview"]);

// Palace walk intro — centered card with walk/skip options
const PALACE_WALK = "palace_walk_intro";

// Palace stage info cards — centered cards, gated on palace view
const PALACE_STAGE_VIEWS: Record<string, string> = {
  palace_entrance_info: "entrance",
  palace_corridor_info: "corridor",
};

// Palace door-click nudges — bottom-center prompt, gated on palace view
// These tell the user to click the highlighted door
const PALACE_CLICK_NUDGES: Record<string, string> = {
  palace_click_entrance: "exterior",
  palace_click_wing: "entrance",
  palace_click_room: "corridor",
};

// Palace room overview — centered card with bullet list, gated on room view
const PALACE_ROOM_OVERVIEW = "palace_room_overview";

// Palace room prompt — bottom-center hint about memory interaction, gated on room view
const PALACE_ROOM_PROMPT = new Set<string>(["palace_room_memory"]);

// Auto-walk: after dismissing a nudge, navigate to the next view
const AUTO_WALK_NEXT: Record<string, "entrance" | "corridor" | "room"> = {
  palace_click_entrance: "entrance",
  palace_click_wing: "corridor",
  palace_click_room: "room",
};

const NUDGE_CONFIG: Record<NudgeId, { messageKey: string; position: "top" | "bottom" | "left" | "right" }> = {
  atrium_nav_modes:       { messageKey: "navModes",            position: "bottom" },
  atrium_tools_button:    { messageKey: "toolsButton",         position: "bottom" },
  atrium_notifications:   { messageKey: "notifications",       position: "bottom" },
  atrium_help_button:     { messageKey: "helpButton",          position: "bottom" },
  atrium_user_settings:   { messageKey: "userSettings",        position: "bottom" },
  atrium_overview:        { messageKey: "atriumOverview",      position: "bottom" },
  atrium_go_library:      { messageKey: "goLibrary",           position: "bottom" },
  // Mobile nav bar buttons — tooltip appears above (top) since bar is at bottom
  atrium_mob_home:        { messageKey: "mobHome",             position: "top" },
  atrium_mob_library:     { messageKey: "mobLibrary",          position: "top" },
  atrium_mob_palace:      { messageKey: "mobPalace",           position: "top" },
  atrium_mob_notif:       { messageKey: "mobNotif",            position: "top" },
  atrium_mob_help:        { messageKey: "mobHelp",             position: "top" },
  atrium_mob_me:          { messageKey: "mobMe",               position: "top" },
  library_wing_sidebar:   { messageKey: "wingSidebar",         position: "top" },
  library_room_bar:       { messageKey: "libraryRoomBar",      position: "bottom" },
  library_search:         { messageKey: "librarySearch",       position: "bottom" },
  library_tools:          { messageKey: "libraryTools",        position: "bottom" },
  library_import:         { messageKey: "libraryImport",       position: "bottom" },
  library_overview:       { messageKey: "libraryOverview",     position: "bottom" },
  library_go_palace:      { messageKey: "goPalace",            position: "bottom" },
  palace_subnav:          { messageKey: "palaceSubnav",        position: "bottom" },
  palace_walk_intro:      { messageKey: "palaceWalk",          position: "bottom" },
  palace_click_entrance:  { messageKey: "clickEntrance",       position: "bottom" },
  palace_entrance_info:   { messageKey: "palaceEntrance",      position: "bottom" },
  palace_click_wing:      { messageKey: "clickWing",           position: "bottom" },
  palace_corridor_info:   { messageKey: "palaceCorridor",      position: "bottom" },
  palace_click_room:      { messageKey: "clickRoom",           position: "bottom" },
  palace_room_overview:   { messageKey: "palaceRoomOverview",  position: "bottom" },
  palace_room_info:       { messageKey: "palaceRoomInfo",      position: "bottom" },
  palace_room_layout:     { messageKey: "roomLayout",          position: "bottom" },
  palace_room_upload:     { messageKey: "roomUpload",          position: "bottom" },
  palace_room_memory:     { messageKey: "roomMemory",          position: "bottom" },
  palace_room_share:      { messageKey: "palaceRoomShare",     position: "bottom" },
};

/** Returns the door ID that should be highlighted in the 3D scene for the current nudge */
export function getNudgeHighlight(activeNudge: NudgeId | null): { entrance?: string | null; wing?: string | null; room?: string | null } {
  if (!activeNudge) return {};
  if (activeNudge === "palace_click_entrance") return { entrance: "__entrance__" };
  if (activeNudge === "palace_click_wing") return { wing: "roots" };
  if (activeNudge === "palace_click_room") return { room: "ro1" };
  return {};
}

interface NudgeProviderProps {
  page: PageId;
  /** Current palace view — used to gate stage nudges */
  palaceView?: string;
  /** Navigate to entrance hall */
  onNavigateEntrance?: () => void;
  /** Navigate to first wing corridor */
  onNavigateCorridor?: () => void;
  /** Navigate to first room */
  onNavigateRoom?: () => void;
}

export default function NudgeProvider({ page, palaceView, onNavigateEntrance, onNavigateCorridor, onNavigateRoom }: NudgeProviderProps) {
  const activeNudge = useNudgeStore((s) => s.activeNudge);
  const dismiss = useNudgeStore((s) => s.dismiss);
  const skipAll = useNudgeStore((s) => s.skipAll);
  const initPage = useNudgeStore((s) => s.initPage);
  const resetCount = useNudgeStore((s) => s._resetCount);
  const isMobile = useIsMobile();
  const { t } = useTranslation("nudge");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [targetBox, setTargetBox] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const autoWalkingRef = useRef(false);
  const navEntranceRef = useRef(onNavigateEntrance);
  const navCorridorRef = useRef(onNavigateCorridor);
  const navRoomRef = useRef(onNavigateRoom);
  navEntranceRef.current = onNavigateEntrance;
  navCorridorRef.current = onNavigateCorridor;
  navRoomRef.current = onNavigateRoom;

  // Delay initPage slightly so the DOM (NavigationBar slide-in, lazy loads)
  // has time to mount and paint.  On the very first atrium visit (right
  // after onboarding) the NavigationBar animation takes ~550ms; use a
  // 600ms delay to ensure data-nudge targets are laid-out and measurable.
  // On subsequent mounts (page switches) use a shorter delay.
  useEffect(() => {
    const isFirstEver = useNudgeStore.getState().activePage === null;
    const delay = isFirstEver ? 600 : 150;
    const t = setTimeout(() => initPage(page, isMobile), delay);
    return () => clearTimeout(t);
  }, [page, initPage, isMobile, resetCount]);

  // Position tooltip on target element
  useEffect(() => {
    if (!activeNudge) {
      setVisible(false); setPos(null); setTargetBox(null);
      return;
    }

    // Centered cards — no target needed
    if (OVERVIEW_NUDGES.has(activeNudge) || activeNudge === PALACE_WALK) {
      setTargetBox(null); setPos({ top: 0, left: 0 }); setVisible(true);
      return;
    }

    // Palace stage info cards — gated on view
    if (activeNudge in PALACE_STAGE_VIEWS) {
      if (palaceView !== PALACE_STAGE_VIEWS[activeNudge]) { setVisible(false); return; }
      setTargetBox(null); setPos({ top: 0, left: 0 }); setVisible(true);
      return;
    }

    // Palace room overview card — gated on room view
    if (activeNudge === PALACE_ROOM_OVERVIEW) {
      if (palaceView !== "room") { setVisible(false); return; }
      setTargetBox(null); setPos({ top: 0, left: 0 }); setVisible(true);
      return;
    }

    // Palace door-click nudges — bottom-center prompt, gated on view
    if (activeNudge in PALACE_CLICK_NUDGES) {
      if (palaceView !== PALACE_CLICK_NUDGES[activeNudge]) { setVisible(false); return; }
      setTargetBox(null); setPos({ top: 0, left: 0 }); setVisible(true);
      return;
    }

    // Palace room prompts — bottom-center, gated on room view
    if (PALACE_ROOM_PROMPT.has(activeNudge)) {
      if (palaceView !== "room") { setVisible(false); return; }
      setTargetBox(null); setPos({ top: 0, left: 0 }); setVisible(true);
      return;
    }

    // Standard tooltip — find DOM target
    const config = NUDGE_CONFIG[activeNudge];
    if (!config) return;

    const targetSelector = BRIDGE_TARGET[activeNudge]
      ? `[data-nudge="${BRIDGE_TARGET[activeNudge]}"]`
      : `[data-nudge="${activeNudge}"]`;

    // Convert rem to px for calculations (1rem = root font size)
    const remToPx = (rem: number) => rem * parseFloat(getComputedStyle(document.documentElement).fontSize || "16");

    const findAndPosition = () => {
      // Pick the first visible match — multiple elements may share a data-nudge
      // (e.g. desktop sidebar + mobile top bar), only one is on-screen at a time.
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(targetSelector));
      const el = candidates.find((c) => {
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }) || candidates[0];
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
      if (rect.top > window.innerHeight - remToPx(3.125) || rect.bottom < 0) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }

      const tooltipW = remToPx(isMobile ? 16.25 : 17.5);
      const tooltipH = remToPx(6.25);
      const gap = remToPx(0.75);
      let top = 0, left = 0;

      // For tall elements (e.g. full-height sidebar), place tooltip inside near the top-right
      const isTall = rect.height > window.innerHeight * 0.6;
      if (isTall && (config.position === "top" || config.position === "bottom")) {
        top = Math.max(gap, rect.top) + gap;
        left = rect.right + gap;
        if (left + tooltipW > window.innerWidth - gap) {
          left = rect.right - tooltipW - gap;
        }
      } else {
        switch (config.position) {
          case "bottom": top = rect.bottom + gap; left = rect.left + rect.width / 2 - tooltipW / 2; break;
          case "top": top = rect.top - tooltipH - gap; left = rect.left + rect.width / 2 - tooltipW / 2; break;
          case "right": top = rect.top + rect.height / 2 - tooltipH / 2; left = rect.right + gap; break;
          case "left": top = rect.top + rect.height / 2 - tooltipH / 2; left = rect.left - tooltipW - gap; break;
        }
      }

      // Clamp within viewport with rem-based margin
      const m = remToPx(0.75);
      if (left < m) left = m;
      if (left + tooltipW > window.innerWidth - m) left = window.innerWidth - tooltipW - m;
      // Vertical clamping: try opposite side first, then hard-clamp to viewport
      if (top + tooltipH > window.innerHeight - m) {
        top = rect.top - tooltipH - gap;
      }
      if (top < m) {
        top = rect.bottom + gap;
      }
      // Final hard clamp — ensure card never leaves the viewport
      if (top + tooltipH > window.innerHeight - m) {
        top = window.innerHeight - tooltipH - m;
      }
      if (top < m) {
        top = m;
      }

      setTargetBox(rect);
      setPos({ top, left });
      setVisible(true);
      return true;
    };

    if (!findAndPosition()) {
      let attempts = 0;
      const retry = setInterval(() => {
        attempts++;
        if (findAndPosition()) clearInterval(retry);
        else if (attempts > 10) {
          clearInterval(retry);
          // Anchor not found — show card centered instead of dismissing
          setTargetBox(null);
          setPos({ top: 0, left: 0 });
          setVisible(true);
        }
      }, 250);
      return () => { clearInterval(retry); };
    }

    // Track scroll/resize so tooltip follows the target
    const onReposition = () => { findAndPosition(); };
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [activeNudge, palaceView, isMobile, dismiss]);

  // Lock scrolling when a targeted nudge (with highlight ring) is active
  useEffect(() => {
    if (!activeNudge || !targetBox) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    // Also lock inner scroll containers marked with data-nudge-scroll-lock
    const inner = document.querySelector<HTMLElement>("[data-nudge-scroll-lock]");
    const prevInner = inner?.style.overflow;
    if (inner) inner.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
      if (inner && prevInner !== undefined) inner.style.overflow = prevInner;
    };
  }, [activeNudge, targetBox]);

  const navigateNext = useCallback((nudgeId: string) => {
    if (!autoWalkingRef.current) return;
    const next = AUTO_WALK_NEXT[nudgeId];
    if (!next) return;
    setTimeout(() => {
      if (next === "entrance" && onNavigateEntrance) onNavigateEntrance();
      else if (next === "corridor" && onNavigateCorridor) onNavigateCorridor();
      else if (next === "room" && onNavigateRoom) onNavigateRoom();
    }, 250);
  }, [onNavigateEntrance, onNavigateCorridor, onNavigateRoom]);

  const handleDismiss = useCallback(() => {
    const currentNudge = activeNudge;
    setFading(true);
    setTimeout(() => {
      setFading(false); setVisible(false); setPos(null); setTargetBox(null);
      dismiss();
      if (currentNudge) navigateNext(currentNudge);
    }, 200);
  }, [dismiss, activeNudge, navigateNext]);

  const handleAutoWalk = useCallback(() => {
    autoWalkingRef.current = true;
    useNudgeStore.getState().setAutoWalking(true);
    handleDismiss();
  }, [handleDismiss]);

  // Auto-walk: scenes handle camera movement, but ALL pop-ups require user click to dismiss.
  // No auto-dismiss — users need time to read each tutorial card.
  const storeAutoWalking = useNudgeStore((s) => s.autoWalking);

  const handleManualWalk = useCallback(() => {
    autoWalkingRef.current = false;
    handleDismiss();
  }, [handleDismiss]);

  const handleSkip = useCallback(() => {
    autoWalkingRef.current = false;
    useNudgeStore.getState().setAutoWalking(false);
    setFading(true);
    setTimeout(() => { setFading(false); setVisible(false); setPos(null); setTargetBox(null); skipAll(); }, 200);
  }, [skipAll]);

  if (!activeNudge || !visible) return null;

  const isBridge = !!BRIDGE_TARGET[activeNudge];
  const ctaLabel = isBridge ? t("tryIt") : t("next");

  // ── Shared styles ──
  const cardBg = "rgba(42,34,24,0.94)";
  const cardBorder = "rgba(212,175,55,0.25)";
  const cardShadow = "0 1rem 3rem rgba(0,0,0,0.4)";
  const cardInAnim = "nudgeCardIn .3s ease both";
  const cardOutAnim = "nudgeCardOut .2s ease forwards";

  // ── Palace Walk Intro ──
  if (activeNudge === PALACE_WALK) {
    return (
      <>
        <style>{`
          @keyframes nudgeCardIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.95); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
          @keyframes nudgeCardOut { from { opacity:1; transform:translate(-50%,-50%) scale(1); } to { opacity:0; transform:translate(-50%,-50%) scale(0.95); } }
        `}</style>
        <div style={{ position:"fixed", inset:0, zIndex:57, background:"rgba(0,0,0,0.4)", pointerEvents:"auto" }} />
        <div style={{
          position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:59,
          width: isMobile ? "calc(100vw - 2rem)" : "22rem", maxWidth:"24rem",
          maxHeight: "calc(100dvh - 4rem)", overflowY: "auto",
          animation: fading ? cardOutAnim : cardInAnim,
        }}>
          <div style={{
            background:cardBg, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
            borderRadius:"1rem", padding:"1.25rem 1.25rem 1rem",
            border:`1px solid ${cardBorder}`, boxShadow:cardShadow,
            display:"flex", flexDirection:"column", gap:"0.75rem",
          }}>
            <div style={{ fontFamily:T.font.display, fontSize:"0.9375rem", fontWeight:600, color:T.color.goldLight, letterSpacing:"0.02em" }}>
              {t("palaceWalkTitle")}
            </div>
            <div style={{ fontFamily:T.font.body, fontSize:"0.8125rem", color:"rgba(250,250,247,0.88)", lineHeight:1.6 }}>
              {t("palaceWalkDesc")}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem", marginTop:"0.25rem" }}>
              <button onClick={(e) => { e.stopPropagation(); handleAutoWalk(); }} style={{
                fontFamily:T.font.body, fontSize:"0.8125rem", fontWeight:600, color:"#FFF",
                background:`linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                border:"none", borderRadius:"0.5rem", padding:"0.625rem 1rem",
                cursor:"pointer", transition:"all .2s", letterSpacing:"0.02em", textAlign:"center",
              }}>
                {t("palaceWalkAuto")}
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleManualWalk(); }} style={{
                fontFamily:T.font.body, fontSize:"0.75rem", fontWeight:500,
                color:T.color.goldLight, background:"none",
                border:`1px solid ${T.color.goldLight}30`, borderRadius:"0.5rem",
                padding:"0.5rem 1rem", cursor:"pointer", transition:"all .2s",
                letterSpacing:"0.02em", textAlign:"center",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${T.color.goldLight}10`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                {t("palaceWalkManual")}
              </button>
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleSkip(); }} style={{
              alignSelf:"center", fontFamily:T.font.body, fontSize:"0.625rem", fontWeight:400,
              color:"rgba(250,250,247,0.4)", background:"none", border:"none",
              cursor:"pointer", padding:"0.125rem 0.25rem", letterSpacing:"0.03em", marginTop:"0.125rem",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(250,250,247,0.65)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(250,250,247,0.4)"; }}
            >
              {t("skip")}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Palace Door-Click Prompts (bottom-center, semi-transparent, no blocking overlay) ──
  if (activeNudge in PALACE_CLICK_NUDGES) {
    const config = NUDGE_CONFIG[activeNudge];
    return (
      <>
        <style>{`
          @keyframes nudgePromptIn { from { opacity:0; transform:translate(-50%,0.5rem); } to { opacity:1; transform:translate(-50%,0); } }
          @keyframes nudgePromptOut { from { opacity:1; transform:translate(-50%,0); } to { opacity:0; transform:translate(-50%,0.5rem); } }
        `}</style>
        <div style={{
          position:"fixed", bottom: isMobile ? "calc(5rem + env(safe-area-inset-bottom, 0px))" : "6rem", left:"50%", transform:"translate(-50%,0)", zIndex:59,
          width: isMobile ? "calc(100vw - 2rem)" : "20rem", maxWidth:"22rem",
          animation: fading ? "nudgePromptOut .2s ease forwards" : "nudgePromptIn .3s ease both",
        }}>
          <div style={{
            background:cardBg, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
            borderRadius:"1rem", padding:"0.875rem 1rem",
            border:`1px solid ${cardBorder}`, boxShadow:"0 0.5rem 2rem rgba(0,0,0,0.3)",
            display:"flex", flexDirection:"column", gap:"0.5rem",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.625rem" }}>
              <div style={{
                width:"0.5rem", height:"0.5rem", borderRadius:"50%", flexShrink:0,
                background:"radial-gradient(circle, #FFE4A0 0%, #D4AF37 60%, transparent 100%)",
                boxShadow:"0 0 10px rgba(212,175,55,0.6)",
                animation:"nudgeDotPulse 1.5s ease-in-out infinite",
              }} />
              <span style={{ fontFamily:T.font.body, fontSize:"0.8125rem", color:"rgba(250,250,247,0.92)", lineHeight:1.5 }}>
                {t(config.messageKey)}
              </span>
            </div>
            {autoWalkingRef.current && (
              <div style={{ fontFamily:T.font.body, fontSize:"0.6875rem", color:"rgba(250,250,247,0.5)", fontStyle:"italic" }}>
                {t("autoWalkingHint")}
              </div>
            )}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:"0.5rem" }}>
              <button onClick={(e) => { e.stopPropagation(); handleSkip(); }} style={{
                fontFamily:T.font.body, fontSize:"0.625rem", fontWeight:400,
                color:"rgba(250,250,247,0.45)", background:"none", border:"none",
                cursor:"pointer", padding:"0.125rem 0.25rem", letterSpacing:"0.03em",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(250,250,247,0.7)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(250,250,247,0.45)"; }}
              >
                {t("skip")}
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes nudgeDotPulse { 0%,100% { box-shadow:0 0 6px rgba(212,175,55,0.4); } 50% { box-shadow:0 0 14px rgba(212,175,55,0.8); } }`}</style>
      </>
    );
  }

  // ── Palace Room Prompt (bottom-center, e.g. "click a memory") ──
  if (PALACE_ROOM_PROMPT.has(activeNudge)) {
    const config = NUDGE_CONFIG[activeNudge];
    return (
      <>
        <style>{`
          @keyframes nudgePromptIn { from { opacity:0; transform:translate(-50%,0.5rem); } to { opacity:1; transform:translate(-50%,0); } }
          @keyframes nudgePromptOut { from { opacity:1; transform:translate(-50%,0); } to { opacity:0; transform:translate(-50%,0.5rem); } }
        `}</style>
        <div style={{
          position:"fixed", bottom: isMobile ? "calc(5rem + env(safe-area-inset-bottom, 0px))" : "6rem", left:"50%", transform:"translate(-50%,0)", zIndex:59,
          width: isMobile ? "calc(100vw - 2rem)" : "20rem", maxWidth:"22rem",
          animation: fading ? "nudgePromptOut .2s ease forwards" : "nudgePromptIn .3s ease both",
        }}>
          <div style={{
            background:cardBg, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
            borderRadius:"1rem", padding:"0.875rem 1rem",
            border:`1px solid ${cardBorder}`, boxShadow:"0 0.5rem 2rem rgba(0,0,0,0.3)",
            display:"flex", flexDirection:"column", gap:"0.5rem",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.625rem" }}>
              <div style={{
                width:"0.5rem", height:"0.5rem", borderRadius:"50%", flexShrink:0,
                background:"radial-gradient(circle, #FFEEBB 0%, #FFD080 60%, transparent 100%)",
                boxShadow:"0 0 8px rgba(255,224,160,0.5)",
              }} />
              <span style={{ fontFamily:T.font.body, fontSize:"0.8125rem", color:"rgba(250,250,247,0.92)", lineHeight:1.5 }}>
                {t(config.messageKey)}
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <button onClick={(e) => { e.stopPropagation(); handleSkip(); }} style={{
                fontFamily:T.font.body, fontSize:"0.625rem", fontWeight:400,
                color:"rgba(250,250,247,0.45)", background:"none", border:"none",
                cursor:"pointer", padding:"0.125rem 0.25rem", letterSpacing:"0.03em",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(250,250,247,0.7)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(250,250,247,0.45)"; }}
              >
                {t("skip")}
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDismiss(); }} style={{
                fontFamily:T.font.body, fontSize:"0.6875rem", fontWeight:600, color:T.color.goldLight,
                background:"none", border:`1px solid ${T.color.goldLight}40`, borderRadius:"0.375rem",
                padding:"0.25rem 0.75rem", cursor:"pointer", transition:"all .2s", letterSpacing:"0.03em",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = `${T.color.goldLight}15`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
              >
                {ctaLabel}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Palace Stage Info Cards (Entrance & Corridor) ──
  if (activeNudge in PALACE_STAGE_VIEWS) {
    const config = NUDGE_CONFIG[activeNudge];
    const prefix = config.messageKey;
    const title = t(`${prefix}Title`);
    let items: { text: string }[] = [];
    try { items = JSON.parse(t(`${prefix}Items`)); } catch {}

    return (
      <>
        <style>{`
          @keyframes nudgeCardIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.95); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
          @keyframes nudgeCardOut { from { opacity:1; transform:translate(-50%,-50%) scale(1); } to { opacity:0; transform:translate(-50%,-50%) scale(0.95); } }
        `}</style>
        <div style={{ position:"fixed", inset:0, zIndex:57, background:"rgba(0,0,0,0.25)", pointerEvents:"auto" }} />
        <div style={{
          position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:59,
          width: isMobile ? "calc(100vw - 2rem)" : "22rem", maxWidth:"24rem",
          maxHeight: "calc(100dvh - 4rem)", overflowY: "auto",
          animation: fading ? cardOutAnim : cardInAnim,
        }}>
          <div style={{
            background:cardBg, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
            borderRadius:"1rem", padding:"1.25rem 1.25rem 1rem",
            border:`1px solid ${cardBorder}`, boxShadow:cardShadow,
            display:"flex", flexDirection:"column", gap:"0.75rem",
          }}>
            <div style={{ fontFamily:T.font.display, fontSize:"0.9375rem", fontWeight:600, color:T.color.goldLight, letterSpacing:"0.02em" }}>
              {title}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.4375rem" }}>
              {items.map((item, i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"0.625rem" }}>
                  <div style={{
                    width:"0.375rem", height:"0.375rem", borderRadius:"50%", flexShrink:0, marginTop:"0.4375rem",
                    background:`linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
                  }} />
                  <span style={{ fontFamily:T.font.body, fontSize:"0.8125rem", color:"rgba(250,250,247,0.88)", lineHeight:1.5 }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"0.125rem" }}>
              <button onClick={(e) => { e.stopPropagation(); handleSkip(); }} style={{
                fontFamily:T.font.body, fontSize:"0.625rem", fontWeight:400,
                color:"rgba(250,250,247,0.45)", background:"none", border:"none",
                cursor:"pointer", padding:"0.125rem 0.25rem", letterSpacing:"0.03em",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(250,250,247,0.7)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(250,250,247,0.45)"; }}
              >
                {t("skip")}
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDismiss(); }} style={{
                fontFamily:T.font.body, fontSize:"0.75rem", fontWeight:600, color:"#FFF",
                background:`linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                border:"none", borderRadius:"0.5rem", padding:"0.4375rem 1.125rem",
                cursor:"pointer", transition:"all .2s", letterSpacing:"0.02em",
              }}>
                {ctaLabel}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Palace Room Overview Card (centered, bullet list of all room features) ──
  if (activeNudge === PALACE_ROOM_OVERVIEW) {
    const prefix = NUDGE_CONFIG[activeNudge].messageKey;
    const title = t(`${prefix}Title`);
    let items: { text: string }[] = [];
    try { items = JSON.parse(t(`${prefix}Items`)); } catch {}
    const footer = t(`${prefix}Footer`);

    return (
      <>
        <style>{`
          @keyframes nudgeCardIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.95); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
          @keyframes nudgeCardOut { from { opacity:1; transform:translate(-50%,-50%) scale(1); } to { opacity:0; transform:translate(-50%,-50%) scale(0.95); } }
        `}</style>
        <div style={{ position:"fixed", inset:0, zIndex:57, background:"rgba(0,0,0,0.3)", pointerEvents:"auto" }} />
        <div style={{
          position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:59,
          width: isMobile ? "calc(100vw - 2rem)" : "22rem", maxWidth:"24rem",
          maxHeight: "calc(100dvh - 4rem)", overflowY: "auto",
          animation: fading ? cardOutAnim : cardInAnim,
        }}>
          <div style={{
            background:cardBg, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
            borderRadius:"1rem", padding:"1.25rem 1.25rem 1rem",
            border:`1px solid ${cardBorder}`, boxShadow:cardShadow,
            display:"flex", flexDirection:"column", gap:"0.75rem",
          }}>
            <div style={{ fontFamily:T.font.display, fontSize:"0.9375rem", fontWeight:600, color:T.color.goldLight, letterSpacing:"0.02em" }}>
              {title}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.4375rem" }}>
              {items.map((item, i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"0.625rem" }}>
                  <div style={{
                    width:"0.375rem", height:"0.375rem", borderRadius:"50%", flexShrink:0, marginTop:"0.4375rem",
                    background:`linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
                  }} />
                  <span style={{ fontFamily:T.font.body, fontSize:"0.8125rem", color:"rgba(250,250,247,0.88)", lineHeight:1.5 }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
            {footer && <div style={{ fontFamily:T.font.body, fontSize:"0.75rem", color:"rgba(250,250,247,0.5)", fontStyle:"italic", marginTop:"0.125rem" }}>{footer}</div>}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"0.125rem" }}>
              <button onClick={(e) => { e.stopPropagation(); handleSkip(); }} style={{
                fontFamily:T.font.body, fontSize:"0.625rem", fontWeight:400,
                color:"rgba(250,250,247,0.45)", background:"none", border:"none",
                cursor:"pointer", padding:"0.125rem 0.25rem", letterSpacing:"0.03em",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(250,250,247,0.7)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(250,250,247,0.45)"; }}
              >
                {t("skip")}
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDismiss(); }} style={{
                fontFamily:T.font.body, fontSize:"0.75rem", fontWeight:600, color:"#FFF",
                background:`linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                border:"none", borderRadius:"0.5rem", padding:"0.4375rem 1.125rem",
                cursor:"pointer", transition:"all .2s", letterSpacing:"0.02em",
              }}>
                {ctaLabel}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Overview Cards (Atrium & Library) ──
  if (OVERVIEW_NUDGES.has(activeNudge)) {
    const config = NUDGE_CONFIG[activeNudge];
    const prefix = config.messageKey;
    const title = t(`${prefix}Title`);
    const footer = t(`${prefix}Footer`);
    let items: { text: string }[] = [];
    try { items = JSON.parse(t(`${prefix}Items`)); } catch {}

    return (
      <>
        <style>{`
          @keyframes nudgeCardIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.95); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
          @keyframes nudgeCardOut { from { opacity:1; transform:translate(-50%,-50%) scale(1); } to { opacity:0; transform:translate(-50%,-50%) scale(0.95); } }
        `}</style>
        <div style={{ position:"fixed", inset:0, zIndex:57, background:"rgba(0,0,0,0.35)", pointerEvents:"auto" }} />
        <div style={{
          position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:59,
          width: isMobile ? "calc(100vw - 2rem)" : "22rem", maxWidth:"24rem",
          maxHeight: "calc(100dvh - 4rem)", overflowY: "auto",
          animation: fading ? cardOutAnim : cardInAnim,
        }}>
          <div style={{
            background:cardBg, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
            borderRadius:"1rem", padding:"1.25rem 1.25rem 1rem",
            border:`1px solid ${cardBorder}`, boxShadow:cardShadow,
            display:"flex", flexDirection:"column", gap:"0.75rem",
          }}>
            <div style={{ fontFamily:T.font.display, fontSize:"0.9375rem", fontWeight:600, color:T.color.goldLight, letterSpacing:"0.02em" }}>
              {title}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.4375rem" }}>
              {items.map((item, i) => (
                <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"0.625rem" }}>
                  <div style={{
                    width:"0.375rem", height:"0.375rem", borderRadius:"50%", flexShrink:0, marginTop:"0.4375rem",
                    background:`linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
                  }} />
                  <span style={{ fontFamily:T.font.body, fontSize:"0.8125rem", color:"rgba(250,250,247,0.88)", lineHeight:1.5 }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ fontFamily:T.font.body, fontSize:"0.75rem", color:"rgba(250,250,247,0.5)", fontStyle:"italic", marginTop:"0.125rem" }}>
              {footer}
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"0.125rem" }}>
              <button onClick={(e) => { e.stopPropagation(); handleSkip(); }} style={{
                fontFamily:T.font.body, fontSize:"0.75rem", fontWeight:500, color:"rgba(250,250,247,0.55)",
                background:"transparent", border:"none", padding:"0.4375rem 0.5rem",
                cursor:"pointer", transition:"all .2s", letterSpacing:"0.02em",
              }}>
                {t("skip")}
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDismiss(); }} style={{
                fontFamily:T.font.body, fontSize:"0.75rem", fontWeight:600, color:"#FFF",
                background:`linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
                border:"none", borderRadius:"0.5rem", padding:"0.4375rem 1.125rem",
                cursor:"pointer", transition:"all .2s", letterSpacing:"0.02em",
              }}>
                {t("gotIt")}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Standard tooltip (targeted) ──
  if (!pos) return null;
  const config = NUDGE_CONFIG[activeNudge];

  // If no target anchor was found, render centered fallback instead of positioned tooltip
  const isCenteredFallback = !targetBox;

  return (
    <>
      <style>{`
        @keyframes nudgeFadeIn { from { opacity:0; transform:translateY(0.375rem); } to { opacity:1; transform:translateY(0); } }
        @keyframes nudgeFadeOut { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(0.375rem); } }
        @keyframes nudgePulse { 0%,100% { box-shadow:0 0 0 0 rgba(212,175,55,0.4); } 50% { box-shadow:0 0 0 0.5rem rgba(212,175,55,0); } }
        @keyframes nudgeCenterIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.95); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
        @keyframes nudgeCenterOut { from { opacity:1; transform:translate(-50%,-50%) scale(1); } to { opacity:0; transform:translate(-50%,-50%) scale(0.95); } }
      `}</style>

      {/* Scrim overlay — full overlay for centered fallback, cutout for targeted */}
      {isCenteredFallback && (
        <div style={{ position:"fixed", inset:0, zIndex:57, background:"rgba(0,0,0,0.35)", pointerEvents:"auto" }} />
      )}

      {targetBox && (() => {
        const pad = 6;
        const t_ = targetBox.top - pad;
        const l_ = targetBox.left - pad;
        const w_ = targetBox.width + pad * 2;
        const h_ = targetBox.height + pad * 2;
        const r = 12;
        return (
          <>
            {/* Dark scrim with cutout around target */}
            <div style={{
              position:"fixed", inset:0, zIndex:57, pointerEvents:"auto",
            }}>
              <svg width="100%" height="100%" style={{ display:"block" }}>
                <defs>
                  <mask id="nudge-cutout">
                    <rect width="100%" height="100%" fill="white" />
                    <rect x={l_} y={t_} width={w_} height={h_} rx={r} fill="black" />
                  </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.45)" mask="url(#nudge-cutout)" />
              </svg>
            </div>
            {/* Pulsing border ring */}
            <div style={{
              position:"fixed", top:t_, left:l_, width:w_, height:h_,
              borderRadius:`${r}px`, border:`2px solid ${T.color.goldLight}70`,
              animation:"nudgePulse 2s ease-in-out infinite", pointerEvents:"none", zIndex:58,
            }} />
          </>
        );
      })()}

      <div ref={tooltipRef} role="tooltip" style={{
        position:"fixed",
        ...(isCenteredFallback
          ? { top:"50%", left:"50%", transform:"translate(-50%,-50%)" }
          : { top:pos.top, left:pos.left }
        ),
        zIndex:59,
        width: isMobile ? "16.25rem" : "17.5rem",
        animation: fading
          ? (isCenteredFallback ? "nudgeCenterOut .2s ease forwards" : "nudgeFadeOut .2s ease forwards")
          : (isCenteredFallback ? "nudgeCenterIn .3s ease both" : "nudgeFadeIn .3s ease both"),
      }}>
        <div style={{
          background:"rgba(42,34,24,0.92)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
          borderRadius:"0.875rem", padding:"0.875rem 1rem",
          border:"1px solid rgba(212,175,55,0.2)", boxShadow:"0 0.5rem 2rem rgba(0,0,0,0.3)",
          display:"flex", flexDirection:"column", gap:"0.5rem",
        }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:"0.625rem" }}>
            <div style={{
              width:"0.375rem", height:"0.375rem", borderRadius:"50%", flexShrink:0, marginTop:"0.4375rem",
              background:`linear-gradient(135deg, ${T.color.gold}, ${T.color.terracotta})`,
            }} />
            <span style={{ fontFamily:T.font.body, fontSize:"0.8125rem", color:"rgba(250,250,247,0.88)", lineHeight:1.5 }}>
              {t(config.messageKey)}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"0.125rem" }}>
            <button onClick={(e) => { e.stopPropagation(); handleSkip(); }} style={{
              fontFamily:T.font.body, fontSize:"0.75rem", fontWeight:500, color:"rgba(250,250,247,0.55)",
              background:"transparent", border:"none", padding:"0.4375rem 0.5rem",
              cursor:"pointer", transition:"all .2s", letterSpacing:"0.02em",
            }}>
              {t("skip")}
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDismiss(); }} style={{
              fontFamily:T.font.body, fontSize:"0.75rem", fontWeight:600, color:"#FFF",
              background:`linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`,
              border:"none", borderRadius:"0.5rem", padding:"0.4375rem 1.125rem",
              cursor:"pointer", transition:"all .2s", letterSpacing:"0.02em",
            }}>
              {ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
