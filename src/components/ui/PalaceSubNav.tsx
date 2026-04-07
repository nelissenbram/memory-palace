"use client";

import { useState, useRef, useEffect, useCallback, type CSSProperties, type ReactNode } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { WingIcon, RoomIcon } from "./WingRoomIcons";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WingItem {
  id: string;
  name: string;
  icon: string;
  accent: string;
}

interface SharedWingItem {
  shareId: string;
  wingId: string;
  ownerName: string;
}

interface RoomItem {
  id: string;
  name: string;
  icon: string;
}

export interface PalaceSubNavProps {
  view: "exterior" | "entrance" | "corridor" | "room";
  wingName?: string;
  wingAccent?: string;
  wingIcon?: string;
  roomName?: string;
  roomId?: string;
  roomIcon?: string;
  wings: WingItem[];
  wingRooms: Record<string, RoomItem[]>;
  sharedWings?: SharedWingItem[];
  hidden?: boolean;
  isMobile: boolean;
  // Navigation callbacks
  onExitToPalace: () => void;
  onEntranceHall: () => void;
  onSwitchWing: (wingId: string) => void;
  onNavigateRoom: (wingId: string, roomId: string) => void;
  onNavigateSharedWing?: (shareId: string, wingSlug: string) => void;
  // Action callbacks
  onUpload: () => void;
  onGallery: () => void;
  onWingManager: () => void;
  onRoomManager: () => void;
  onCorridorGallery: () => void;
  onMassImport: () => void;
  onShare: () => void;
  onSharingSettings: () => void;
  onBack: () => void;
}

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

/** Palace / exterior icon — classical temple facade */
function PalaceIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 5.5 L8 1.5 L13.5 5.5" />
      <line x1="2.5" y1="5.5" x2="13.5" y2="5.5" />
      <line x1="2" y1="13" x2="14" y2="13" />
      <line x1="2.5" y1="12" x2="13.5" y2="12" strokeWidth="1" />
      <line x1="3.5" y1="5.5" x2="3.5" y2="12" />
      <line x1="12.5" y1="5.5" x2="12.5" y2="12" />
      <line x1="6" y1="5.5" x2="6" y2="12" strokeWidth="1" />
      <line x1="10" y1="5.5" x2="10" y2="12" strokeWidth="1" />
    </svg>
  );
}

/** Roman temple / gate icon for Entrance Hall */
function TempleIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* pediment */}
      <path d="M3 6L8 2l5 4" />
      {/* architrave */}
      <line x1="3" y1="6" x2="13" y2="6" />
      {/* columns */}
      <line x1="4.5" y1="6" x2="4.5" y2="12" />
      <line x1="8" y1="6" x2="8" y2="12" />
      <line x1="11.5" y1="6" x2="11.5" y2="12" />
      {/* base */}
      <line x1="2.5" y1="12" x2="13.5" y2="12" />
      {/* steps */}
      <line x1="3" y1="13.5" x2="13" y2="13.5" strokeWidth={1} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PalaceSubNav(props: PalaceSubNavProps) {
  const {
    view, wingName, wingAccent, roomName, roomId,
    wings, wingRooms, hidden, isMobile,
    onExitToPalace, onEntranceHall, onSwitchWing, onNavigateRoom,
  } = props;

  const { t } = useTranslation("palace");
  const [showWingPicker, setShowWingPicker] = useState(false);
  const [quickNavOpenWing, setQuickNavOpenWing] = useState<string | null>(null);
  const wingPickerRef = useRef<HTMLDivElement>(null);
  const quickNavRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Find current wing object
  const currentWing = wings.find((w) => w.name === wingName);

  // Close wing picker on outside click
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (wingPickerRef.current && !wingPickerRef.current.contains(e.target as Node)) {
      setShowWingPicker(false);
    }
    // Close quick nav room dropdown on outside click
    if (quickNavOpenWing) {
      const ref = quickNavRefs.current[quickNavOpenWing];
      if (ref && !ref.contains(e.target as Node)) {
        setQuickNavOpenWing(null);
      }
    }
  }, [quickNavOpenWing]);

  useEffect(() => {
    if (showWingPicker || quickNavOpenWing) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showWingPicker, quickNavOpenWing, handleClickOutside]);

  // Close wing picker and quick nav on view change
  useEffect(() => {
    setShowWingPicker(false);
    setQuickNavOpenWing(null);
  }, [view]);

  if (hidden) return null;

  /* ---------------------------------------------------------------- */
  /*  Shared styles                                                    */
  /* ---------------------------------------------------------------- */

  const barBackground = `linear-gradient(135deg, ${T.color.warmStone}ee, ${T.color.sandstone}dd)`;
  const barBorder = `1px solid ${T.color.gold}33`;
  const barShadow = "0 0.125rem 0.5rem rgba(44,44,42,0.08)";
  const compact = isMobile;

  /* ---------------------------------------------------------------- */
  /*  Breadcrumb pill styles                                           */
  /* ---------------------------------------------------------------- */

  function pillStyle(active: boolean, accent?: string): CSSProperties {
    const c = accent || T.color.gold;
    return {
      display: "flex",
      alignItems: "center",
      gap: compact ? "0.1875rem" : "0.375rem",
      padding: compact ? "0.375rem 0.5rem" : "0.3125rem 0.75rem",
      minHeight: compact ? "2.75rem" : undefined,
      borderRadius: "1.25rem",
      border: active ? `1.5px solid ${c}` : `1px solid ${c}44`,
      background: active ? `${c}18` : `${T.color.cream}80`,
      cursor: active ? "default" : "pointer",
      fontFamily: T.font.display,
      fontSize: compact ? "0.75rem" : "0.8125rem",
      fontWeight: active ? 700 : 500,
      color: active ? c : T.color.walnut,
      whiteSpace: "nowrap" as const,
      transition: "all 0.2s ease",
      flexShrink: 0,
      lineHeight: 1.2,
      boxShadow: active ? `0 0 0.5rem ${c}22` : "none",
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Chevron separator                                                */
  /* ---------------------------------------------------------------- */

  function renderChevron() {
    return (
      <span
        aria-hidden
        style={{
          color: T.color.gold,
          fontSize: compact ? "0.75rem" : "0.875rem",
          fontWeight: 400,
          margin: compact ? "0 0.125rem" : "0 0.25rem",
          flexShrink: 0,
          opacity: 0.6,
          lineHeight: 1,
        }}
      >
        ›
      </span>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Palace (exterior) breadcrumb pill                                */
  /* ---------------------------------------------------------------- */

  function renderPalacePill() {
    const isActive = view === "exterior";
    return (
      <button
        onClick={isActive ? undefined : onExitToPalace}
        title={t("subnavPalace")}
        aria-label={t("subnavPalace")}
        aria-current={isActive ? "location" : undefined}
        style={pillStyle(isActive)}
      >
        <PalaceIcon size={compact ? 14 : 16} color={isActive ? T.color.gold : T.color.walnut} />
        {!compact && <span>{t("subnavPalace")}</span>}
      </button>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Entrance Hall breadcrumb pill                                    */
  /* ---------------------------------------------------------------- */

  function renderEntranceHallPill() {
    const isActive = view === "entrance";
    return (
      <button
        onClick={isActive ? undefined : onEntranceHall}
        title={t("entranceHallLabel")}
        aria-label={t("entranceHallLabel")}
        aria-current={isActive ? "location" : undefined}
        style={pillStyle(isActive)}
      >
        <TempleIcon size={compact ? 14 : 16} color={isActive ? T.color.gold : T.color.walnut} />
        {!compact && <span>{t("entranceHallLabel")}</span>}
      </button>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Wing breadcrumb pill (with dropdown for switching wings)          */
  /* ---------------------------------------------------------------- */

  function renderWingPill() {
    if (!currentWing) return null;
    const isActive = view === "corridor";
    const accent = currentWing.accent;
    const displayName = currentWing.id === "attic" ? t("storageRoom") : currentWing.name;

    return (
      <div
        ref={wingPickerRef}
        style={{ position: "relative", flexShrink: 0 }}
      >
        <button
          onClick={() => {
            if (view === "room") {
              // Navigate back to corridor
              onSwitchWing(currentWing.id);
            } else {
              // Toggle wing picker dropdown
              setShowWingPicker((v) => !v);
            }
          }}
          title={displayName}
          aria-label={displayName}
          aria-current={isActive ? "location" : undefined}
          aria-haspopup={isActive ? "true" : undefined}
          aria-expanded={showWingPicker || undefined}
          style={{
            ...pillStyle(isActive, accent),
            cursor: "pointer",
          }}
        >
          <span style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }} aria-hidden>
            <WingIcon wingId={currentWing.id} size={compact ? 14 : 16} color={isActive ? accent : T.color.walnut} />
          </span>
          {!compact && <span>{displayName}</span>}
          {/* Down chevron to indicate wing switcher */}
          {isActive && (
            <svg
              width={8} height={8} viewBox="0 0 8 8" fill="none"
              stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
              aria-hidden
              style={{
                opacity: 0.5,
                transition: "transform 0.15s ease",
                transform: showWingPicker ? "rotate(180deg)" : "rotate(0deg)",
                marginLeft: compact ? "0" : "0.0625rem",
              }}
            >
              <path d="M2 3l2 2 2-2" />
            </svg>
          )}
        </button>

        {/* Wing picker dropdown */}
        {showWingPicker && renderWingPickerDropdown()}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Wing picker dropdown (all wings with their rooms)                */
  /* ---------------------------------------------------------------- */

  function renderWingPickerDropdown() {
    return (
      <div
        role="menu"
        aria-label={t("subnavWingSwitcher")}
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: "0.375rem",
          background: `${T.color.white}f5`,
          backdropFilter: "blur(0.75rem)",
          WebkitBackdropFilter: "blur(0.75rem)",
          borderRadius: "0.625rem",
          border: `1px solid ${T.color.gold}33`,
          padding: "0.25rem",
          minWidth: "10rem",
          maxWidth: "16rem",
          boxShadow: `0 0.25rem 1rem rgba(0,0,0,0.10), 0 0 0 1px ${T.color.gold}11`,
          zIndex: 50,
          animation: "subnavDropdownIn 0.15s ease",
        }}
      >
        <div style={{
          padding: "0.3125rem 0.625rem 0.25rem",
          fontFamily: T.font.display,
          fontSize: "0.6875rem",
          fontWeight: 600,
          color: T.color.gold,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          borderBottom: `1px solid ${T.color.cream}`,
          marginBottom: "0.125rem",
        }}>
          {t("subnavWingSwitcher")}
        </div>

        {wings.map((w) => {
          const isCurrentWing = w.name === wingName;
          const displayName = w.id === "attic" ? t("storageRoom") : w.name;
          return (
            <button
              key={w.id}
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                onSwitchWing(w.id);
                setShowWingPicker(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4375rem",
                width: "100%",
                padding: "0.375rem 0.625rem",
                border: "none",
                background: isCurrentWing ? `${w.accent}12` : "transparent",
                borderRadius: "0.375rem",
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: isCurrentWing ? 600 : 400,
                color: isCurrentWing ? w.accent : T.color.charcoal,
                cursor: "pointer",
                transition: "background 0.15s ease",
                textAlign: "left" as const,
                whiteSpace: "nowrap" as const,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${w.accent}12`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = isCurrentWing ? `${w.accent}12` : "transparent"; }}
            >
              <span style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }} aria-hidden>
                <WingIcon wingId={w.id} size={16} color={w.accent} />
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</span>
            </button>
          );
        })}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Quick-nav wing pills (shown in exterior view)                    */
  /* ---------------------------------------------------------------- */

  function renderQuickNavWings() {
    if (wings.length === 0) return null;

    return (
      <div
        role="navigation"
        aria-label={t("subnavQuickNav")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? "0.25rem" : "0.375rem",
          flexWrap: "wrap",
        }}
      >
        {/* Vertical separator */}
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: "1px",
            height: compact ? "1rem" : "1.25rem",
            background: `${T.color.gold}44`,
            margin: compact ? "0 0.125rem" : "0 0.375rem",
            flexShrink: 0,
          }}
        />

        {wings.map((w) => {
          const displayName = w.id === "attic" ? t("storageRoom") : w.name;
          const rooms = wingRooms[w.id] || [];
          const isOpen = quickNavOpenWing === w.id;
          const isActiveWing = currentWing?.id === w.id && (view === "corridor" || view === "room");

          return (
            <div
              key={w.id}
              ref={(el) => { quickNavRefs.current[w.id] = el; }}
              style={{ position: "relative", flexShrink: 0 }}
            >
              <button
                onClick={() => {
                  if (rooms.length > 0) {
                    setQuickNavOpenWing(isOpen ? null : w.id);
                  } else {
                    onSwitchWing(w.id);
                  }
                }}
                title={displayName}
                aria-label={displayName}
                aria-current={isActiveWing ? "location" : undefined}
                aria-haspopup={rooms.length > 0 ? "true" : undefined}
                aria-expanded={isOpen || undefined}
                style={{
                  ...pillStyle(isActiveWing, w.accent),
                  cursor: "pointer",
                  border: `1px solid ${isActiveWing ? w.accent : `${w.accent}55`}`,
                  fontWeight: isActiveWing ? 700 : 500,
                  background: isActiveWing ? `${w.accent}18` : `${T.color.cream}80`,
                  fontSize: compact ? "0.6875rem" : "0.75rem",
                  padding: compact ? "0.375rem 0.375rem" : "0.25rem 0.5rem",
                  minHeight: compact ? "2.75rem" : undefined,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${w.accent}20`;
                  e.currentTarget.style.borderColor = `${w.accent}88`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${T.color.cream}80`;
                  e.currentTarget.style.borderColor = `${w.accent}55`;
                }}
              >
                <span style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }} aria-hidden>
                  <WingIcon wingId={w.id} size={compact ? 12 : 14} color={w.accent} />
                </span>
                {!compact && <span>{displayName}</span>}
                {rooms.length > 0 && (
                  <svg
                    width={7} height={7} viewBox="0 0 8 8" fill="none"
                    stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden
                    style={{
                      opacity: 0.45,
                      transition: "transform 0.15s ease",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      marginLeft: compact ? "0" : "0.0625rem",
                    }}
                  >
                    <path d="M2 3l2 2 2-2" />
                  </svg>
                )}
              </button>

              {/* Room dropdown for this wing */}
              {isOpen && rooms.length > 0 && (
                <div
                  role="menu"
                  aria-label={`${t("subnavRoomsIn")} — ${displayName}`}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(max(-50%, calc(-100% + 1rem)))",
                    marginTop: "0.375rem",
                    background: `${T.color.white}f5`,
                    backdropFilter: "blur(0.75rem)",
                    WebkitBackdropFilter: "blur(0.75rem)",
                    borderRadius: "0.625rem",
                    border: `1px solid ${w.accent}33`,
                    padding: "0.25rem",
                    minWidth: "9rem",
                    maxWidth: "min(15rem, calc(100vw - 1rem))",
                    boxShadow: `0 0.25rem 1rem rgba(0,0,0,0.10), 0 0 0 1px ${w.accent}11`,
                    zIndex: 50,
                    animation: "subnavDropdownIn 0.15s ease",
                  }}
                >
                  {/* Wing corridor link at top */}
                  <button
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSwitchWing(w.id);
                      setQuickNavOpenWing(null);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4375rem",
                      width: "100%",
                      padding: "0.375rem 0.625rem",
                      border: "none",
                      background: "transparent",
                      borderRadius: "0.375rem",
                      fontFamily: T.font.display,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: w.accent,
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                      textAlign: "left" as const,
                      whiteSpace: "nowrap" as const,
                      borderBottom: `1px solid ${T.color.cream}`,
                      marginBottom: "0.125rem",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${w.accent}12`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }} aria-hidden>
                      <WingIcon wingId={w.id} size={14} color={w.accent} />
                    </span>
                    <span>{displayName}</span>
                  </button>

                  {/* Individual rooms */}
                  {rooms.map((r) => (
                    <button
                      key={r.id}
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateRoom(w.id, r.id);
                        setQuickNavOpenWing(null);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4375rem",
                        width: "100%",
                        padding: "0.3125rem 0.625rem 0.3125rem 1rem",
                        border: "none",
                        background: "transparent",
                        borderRadius: "0.375rem",
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        fontWeight: 400,
                        color: T.color.charcoal,
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                        textAlign: "left" as const,
                        whiteSpace: "nowrap" as const,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = `${w.accent}12`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }} aria-hidden>
                        <RoomIcon roomId={r.id} size={14} color={w.accent} />
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Room breadcrumb pill                                             */
  /* ---------------------------------------------------------------- */

  function renderRoomPill() {
    if (!roomName || view !== "room") return null;
    const accent = wingAccent || T.color.walnut;
    return (
      <span
        aria-current="location"
        style={{
          ...pillStyle(true, accent),
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: compact ? "8rem" : "12rem",
        }}
      >
        {roomId && (
          <span style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }} aria-hidden>
            <RoomIcon roomId={roomId} size={compact ? 14 : 16} color={accent} />
          </span>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{roomName}</span>
      </span>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Dropdown animation keyframes (injected once)                     */
  /* ---------------------------------------------------------------- */

  const dropdownKeyframes = `
    @keyframes subnavDropdownIn {
      from { opacity: 0; transform: translateX(-50%) translateY(-0.25rem); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;

  /* ---------------------------------------------------------------- */
  /*  Breadcrumb trail                                                 */
  /* ---------------------------------------------------------------- */

  function renderBreadcrumbs() {
    const crumbs: ReactNode[] = [];

    // Level 1: Palace (always shown)
    crumbs.push(<span key="palace">{renderPalacePill()}</span>);

    // Level 2: Entrance Hall (always shown — clickable to go to entrance)
    crumbs.push(<span key="sep-entrance">{renderChevron()}</span>);
    crumbs.push(<span key="entrance">{renderEntranceHallPill()}</span>);

    // Level 3: Wing pills (always shown — quick-nav to any wing/room)
    if (wings.length > 0) {
      crumbs.push(<span key="sep-quicknav">{renderChevron()}</span>);
      crumbs.push(
        <span key="quicknav" style={{ display: "inline-flex" }}>
          {renderQuickNavWings()}
        </span>
      );
    }

    // Level 4: Current room indicator (shown when in room view)
    if (view === "room" && roomName) {
      crumbs.push(<span key="sep-room">{renderChevron()}</span>);
      crumbs.push(<span key="room">{renderRoomPill()}</span>);
    }

    return crumbs;
  }

  /* ---------------------------------------------------------------- */
  /*  Mobile layout                                                    */
  /* ---------------------------------------------------------------- */

  if (isMobile) {
    return (
      <div
        role="navigation"
        aria-label={t("subnavBreadcrumb")}
        className="hide-scrollbar"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: "env(safe-area-inset-top, 0px)",
          height: "3rem",
          zIndex: 42,
          overflow: "visible",
          background: barBackground,
          backdropFilter: "blur(0.75rem)",
          WebkitBackdropFilter: "blur(0.75rem)",
          borderBottom: barBorder,
          boxShadow: barShadow,
          display: "flex",
          alignItems: "center",
          padding: "0 0.5rem",
          gap: "0.125rem",
          overflowX: "auto",
          transition: "transform 0.25s ease, opacity 0.25s ease",
        }}
      >
        <style>{dropdownKeyframes}</style>
        {renderBreadcrumbs()}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Desktop layout                                                   */
  /* ---------------------------------------------------------------- */

  return (
    <div
      role="navigation"
      aria-label={t("subnavBreadcrumb")}
      data-nudge="palace_subnav"
      style={{
        position: "absolute",
        top: "4.25rem",
        left: 0,
        right: 0,
        height: "3.5rem",
        zIndex: 42,
        overflow: "visible",
        background: barBackground,
        backdropFilter: "blur(0.75rem)",
        WebkitBackdropFilter: "blur(0.75rem)",
        borderBottom: barBorder,
        boxShadow: barShadow,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.25s ease, opacity 0.25s ease",
      }}
    >
      <style>{dropdownKeyframes}</style>

      {/* Centered content with max-width */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.125rem",
          width: "100%",
          maxWidth: "72rem",
          padding: "0 1.25rem",
          justifyContent: "center",
        }}
      >
        {renderBreadcrumbs()}
      </div>
    </div>
  );
}
