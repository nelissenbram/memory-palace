"use client";

import { useState, useRef, useEffect, useCallback, type CSSProperties, type ReactNode } from "react";
import { T } from "@/lib/theme";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useIsCompact } from "@/lib/hooks/useIsMobile";
import { translateWingName, translateRoomName } from "@/lib/constants/wings";
import { WingIcon, RoomIcon } from "./WingRoomIcons";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WingItem {
  id: string;
  name: string;
  nameKey?: string;
  icon: string;
  accent: string;
}

interface SharedWingItem {
  shareId: string;
  wingId: string;
  ownerName: string;
  /** Real custom display name of the shared wing, when provided by the
   *  shares fetch layer. Optional and non-breaking. */
  name?: string;
}

interface RoomItem {
  id: string;
  name: string;
  nameKey?: string;
  icon: string;
}

export type PalacePending =
  | { kind: "palace" }
  | { kind: "entrance" }
  | { kind: "wing"; wingId: string }
  | { kind: "room"; wingId: string; roomId: string }
  | null;

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
  /** Controlled pending selection (lifted so ExteriorScene taps can set it). */
  pending?: PalacePending;
  onPendingChange?: (p: PalacePending) => void;
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
  onPublish?: () => void;
  onPasscode?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Canon tokens (mirror NavigationBar's surface + ink grammar)        */
/* ------------------------------------------------------------------ */

const CANON_EMBER = "#B85C38";      // interactive / active pill (mirrors NavigationBar)
const CANON_MUTED = "#716A5E";      // secondary chrome (labels, chevrons, non-wing pill borders)
const CANON_HAIRLINE = "#E3D6BC";   // borders
// Warm-ink shadow ladder (rgba(64,59,54,x)) — matches NavigationBar / AtriumRelay.
const CANON_SHADOW_1 = "0 0.125rem 0.5rem rgba(64,59,54,0.08)";
const CANON_SHADOW_2 = "0 0.25rem 1rem rgba(64,59,54,0.10)";

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

/** Palace / exterior icon — classical temple facade */
function PalaceIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={color}
      aria-hidden
    >
      <path d="M10 32 L50 12 L90 32 L88 40 L12 40 Z" />
      <rect x="18" y="40" width="8" height="32" />
      <rect x="32" y="40" width="8" height="32" />
      <rect x="46" y="40" width="8" height="32" />
      <rect x="60" y="40" width="8" height="32" />
      <ellipse cx="78" cy="56" rx="4" ry="14" opacity="0.7" />
      <rect x="10" y="72" width="80" height="4" />
      <rect x="6" y="78" width="88" height="4" />
      <rect x="2" y="84" width="96" height="4" />
    </svg>
  );
}

/** Temple icon for Entrance Hall — same brand icon */
function TempleIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={color}
      aria-hidden
    >
      <path d="M10 32 L50 12 L90 32 L88 40 L12 40 Z" />
      <rect x="18" y="40" width="8" height="32" />
      <rect x="32" y="40" width="8" height="32" />
      <rect x="46" y="40" width="8" height="32" />
      <rect x="60" y="40" width="8" height="32" />
      <ellipse cx="78" cy="56" rx="4" ry="14" opacity="0.7" />
      <rect x="10" y="72" width="80" height="4" />
      <rect x="6" y="78" width="88" height="4" />
      <rect x="2" y="84" width="96" height="4" />
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
  const { t: tWings } = useTranslation("wings");
  // The desktop breadcrumb is a single non-wrapping line: Palace › Entrance ›
  // all wing pills (icon + label) › Room + Publish/Passcode. On an iPad in
  // portrait (768–1024px) that row overflows. The mobile compact bar truncates
  // and expands on demand, so route iPad portrait to it.
  const isCompactViewport = useIsCompact();
  const useMobileLayout = isMobile || isCompactViewport;
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

  // Flat linen glass + warm-ink grammar (mirrors NavigationBar). Gold is reserved
  // for ceremonial palace surfaces only, so ordinary sub-nav chrome uses hairline.
  const barBackground = `${T.color.linen}f2`;
  const barBorder = `0.0625rem solid ${CANON_HAIRLINE}`;
  const barShadow = CANON_SHADOW_1;
  const compact = isMobile;

  /* ---------------------------------------------------------------- */
  /*  Breadcrumb pill styles                                           */
  /* ---------------------------------------------------------------- */

  function pillStyle(active: boolean, accent?: string): CSSProperties {
    // Wing pills pass their wing accent; generic pills (Palace / Entrance) fall
    // back to EMBER for the active state (mirroring NavigationBar) — never gold.
    const c = accent || CANON_EMBER;
    return {
      display: "flex",
      alignItems: "center",
      gap: compact ? "0.1875rem" : "0.375rem",
      // Desktop sizes match NavigationBar's pill proportions (it lives right
      // above this capsule) — serif + accent tint keep the Tuscan identity.
      padding: compact ? "0.375rem 0.5rem" : "0.4375rem 0.875rem",
      minHeight: compact ? "2.75rem" : undefined,
      borderRadius: compact ? "0.5rem" : "0.625rem",
      WebkitAppearance: "none" as const,
      // Inactive pills use the neutral hairline; only the active/current pill
      // takes the accent (ember or wing tint).
      border: active ? `0.09375rem solid ${c}` : `0.0625rem solid ${CANON_HAIRLINE}`,
      background: active ? `${c}18` : `${T.color.cream}80`,
      cursor: active ? "default" : "pointer",
      fontFamily: T.font.display,
      fontSize: compact ? "0.75rem" : "0.9375rem",
      fontWeight: active ? 700 : 500,
      color: active ? c : CANON_MUTED,
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
          color: CANON_MUTED,
          fontSize: compact ? "0.75rem" : "1rem",
          fontWeight: 500,
          margin: compact ? "0 0.125rem" : "0 0.375rem",
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
        <PalaceIcon size={compact ? 14 : 16} color={isActive ? CANON_EMBER : CANON_MUTED} />
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
        <TempleIcon size={compact ? 14 : 16} color={isActive ? CANON_EMBER : CANON_MUTED} />
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
    const displayName = translateWingName(currentWing, tWings);

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
            <WingIcon wingId={currentWing.id} size={compact ? 14 : 16} color={isActive ? accent : CANON_MUTED} />
          </span>
          {!compact && (
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", maxWidth: "calc(10rem * var(--a11y-scale, 1))" }}>
              {displayName}
            </span>
          )}
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
                flexShrink: 0,
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
          background: `${T.color.linen}f8`,
          backdropFilter: "blur(0.75rem)",
          WebkitBackdropFilter: "blur(0.75rem)",
          borderRadius: "0.625rem",
          border: `0.0625rem solid ${CANON_HAIRLINE}`,
          padding: "0.25rem",
          minWidth: "10rem",
          maxWidth: "calc(16rem * var(--a11y-scale, 1))",
          boxShadow: CANON_SHADOW_2,
          zIndex: 50,
          animation: "subnavDropdownIn 0.15s ease",
        }}
      >
        <div style={{
          padding: "0.3125rem 0.625rem 0.25rem",
          fontFamily: T.font.display,
          fontSize: "0.6875rem",
          fontWeight: 600,
          color: CANON_MUTED,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          borderBottom: `0.0625rem solid ${CANON_HAIRLINE}`,
          marginBottom: "0.125rem",
        }}>
          {t("subnavWingSwitcher")}
        </div>

        {wings.map((w) => {
          const isCurrentWing = w.name === wingName;
          const displayName = translateWingName(w, tWings);
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
                minHeight: "2.75rem",
                border: "none",
                background: isCurrentWing ? `${w.accent}12` : "transparent",
                borderRadius: "0.375rem",
                fontFamily: T.font.body,
                fontSize: "0.8125rem",
                fontWeight: isCurrentWing ? 600 : 500,
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
          flexWrap: "nowrap",
          // Part of the shrink chain — wing labels ellipsize before anything
          // can push the Passcode/Publish actions out of the capsule.
          minWidth: 0,
        }}
      >
        {/* Vertical separator */}
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: "0.0625rem",
            height: compact ? "1rem" : "1.25rem",
            background: CANON_HAIRLINE,
            margin: compact ? "0 0.125rem" : "0 0.375rem",
            flexShrink: 0,
          }}
        />

        {wings.map((w) => {
          const displayName = translateWingName(w, tWings);
          const rooms = wingRooms[w.id] || [];
          const isOpen = quickNavOpenWing === w.id;
          const isActiveWing = currentWing?.id === w.id && (view === "corridor" || view === "room");

          return (
            <div
              key={w.id}
              ref={(el) => { quickNavRefs.current[w.id] = el; }}
              style={{ position: "relative", display: "flex", minWidth: 0, flexShrink: 1 }}
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
                  border: `0.0625rem solid ${isActiveWing ? w.accent : `${w.accent}55`}`,
                  fontWeight: isActiveWing ? 700 : 500,
                  background: isActiveWing ? `${w.accent}18` : `${T.color.cream}80`,
                  fontSize: compact ? "0.6875rem" : "0.875rem",
                  padding: compact ? "0.375rem 0.375rem" : "0.375rem 0.75rem",
                  minHeight: compact ? "2.75rem" : undefined,
                  // Wing pills are the designated shrink victims (higher
                  // flex-shrink than the room pill): label ellipsizes, icon +
                  // chevron stay. Same look while everything fits.
                  minWidth: 0,
                  flexShrink: 3,
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
                {!compact && (
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", maxWidth: "calc(9rem * var(--a11y-scale, 1))" }}>
                    {displayName}
                  </span>
                )}
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
                      flexShrink: 0,
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
                    background: `${T.color.linen}f8`,
                    backdropFilter: "blur(0.75rem)",
                    WebkitBackdropFilter: "blur(0.75rem)",
                    borderRadius: "0.625rem",
                    border: `0.0625rem solid ${w.accent}33`,
                    padding: "0.25rem",
                    minWidth: "9rem",
                    maxWidth: "min(15rem, calc(100vw - 1rem))",
                    boxShadow: CANON_SHADOW_2,
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
                      borderBottom: `0.0625rem solid ${T.color.cream}`,
                      marginBottom: "0.125rem",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${w.accent}12`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }} aria-hidden>
                      <WingIcon wingId={w.id} size={14} color={w.accent} />
                    </span>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</span>
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
                        minHeight: "2.75rem",
                        border: "none",
                        background: "transparent",
                        borderRadius: "0.375rem",
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        fontWeight: 500,
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
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{translateRoomName(r, tWings)}</span>
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
    // Resolve the room's nameKey from wingRooms (keyed by roomId) so the
    // breadcrumb runs through translateRoomName like the dropdown entries do,
    // instead of rendering the raw English `roomName` prop.
    const roomItem = roomId
      ? Object.values(wingRooms).flat().find((r) => r.id === roomId)
      : undefined;
    const displayRoomName = roomItem
      ? translateRoomName(roomItem, tWings)
      : roomName;
    return (
      <span
        aria-current="location"
        style={{
          ...pillStyle(true, accent),
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: compact ? "calc(8rem * var(--a11y-scale, 1))" : "calc(12rem * var(--a11y-scale, 1))",
          // May shrink under pressure (after the wing pills, which carry a
          // higher flex-shrink) but never below icon + a few characters.
          flexShrink: 1,
          minWidth: "3.5rem",
        }}
      >
        {roomId && (
          <span style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }} aria-hidden>
            <RoomIcon roomId={roomId} size={compact ? 14 : 16} color={accent} />
          </span>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{displayRoomName}</span>
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
    @media (prefers-reduced-motion: reduce) {
      [data-palace-subnav], [data-palace-subnav] * {
        animation: none !important;
        transition: none !important;
      }
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
        <span key="quicknav" style={{ display: "inline-flex", minWidth: 0 }}>
          {renderQuickNavWings()}
        </span>
      );
    }

    // Level 4: Current room indicator (shown when in room view)
    if (view === "room" && roomName) {
      crumbs.push(<span key="sep-room">{renderChevron()}</span>);
      crumbs.push(<span key="room" style={{ display: "inline-flex", minWidth: 0 }}>{renderRoomPill()}</span>);
    }

    return crumbs;
  }

  /* ---------------------------------------------------------------- */
  /*  Mobile layout  (also iPad portrait via useMobileLayout)          */
  /* ---------------------------------------------------------------- */

  if (useMobileLayout) {
    return (
      <MobileCompactNav
        view={view}
        wingName={wingName}
        wingAccent={wingAccent}
        roomId={roomId}
        wings={wings}
        wingRooms={wingRooms}
        onExitToPalace={onExitToPalace}
        onEntranceHall={onEntranceHall}
        onSwitchWing={onSwitchWing}
        onNavigateRoom={onNavigateRoom}
        barBackground={barBackground}
        barBorder={barBorder}
        barShadow={barShadow}
        controlledPending={props.pending}
        onPendingChange={props.onPendingChange}
        onPublish={props.onPublish}
        onPasscode={props.onPasscode}
      />
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
      data-palace-subnav
      style={{
        // Floating centered capsule — same visual language as NavigationBar
        // (linen glass, heavy blur, 2.25rem radius) so it reads as its
        // extension rather than a separate full-width band.
        position: "absolute",
        top: "4.75rem",
        left: "50%",
        transform: "translateX(-50%)",
        // Never wider than the viewport minus margins AND any notch safe-area
        // (iPad landscape) — the shrink chain below keeps content inside this.
        maxWidth: "calc(100vw - 2rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px))",
        height: "3.25rem",
        zIndex: 42,
        overflow: "visible",
        background: `${T.color.linen}C7`,
        backdropFilter: "blur(1.5rem) saturate(180%)",
        WebkitBackdropFilter: "blur(1.5rem) saturate(180%)",
        border: "0.0625rem solid rgba(238,234,227,0.5)",
        borderRadius: "2.25rem",
        boxShadow: "0 0.25rem 1.5rem rgba(64,59,54,0.07), 0 0.0625rem 0.125rem rgba(64,59,54,0.03)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.25s ease, opacity 0.25s ease",
      }}
    >
      <style>{dropdownKeyframes}</style>

      {/* Capsule content — single centered group, single line, never wraps */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          padding: "0 0.625rem",
          flexWrap: "nowrap",
          whiteSpace: "nowrap",
          minWidth: 0,
          // Overflow hardening: cap at the capsule width so the shrink chain
          // (quicknav wings > room pill) ellipsizes instead of spilling out.
          // No overflow:hidden here — the wing/room dropdowns must escape.
          maxWidth: "100%",
        }}
      >
        {renderBreadcrumbs()}

        {/* Publish + Passcode buttons — shown in corridor/room view */}
        {(props.onPublish || props.onPasscode) && (view === "corridor" || view === "room") && (
          <>
            {/* Vertical divider — same idiom as NavigationBar; keeps the whole
                capsule one centered group instead of pushing actions to the edge */}
            <span
              aria-hidden
              style={{
                width: "0.0625rem",
                height: "1.25rem",
                background: `linear-gradient(180deg, transparent, ${T.color.sandstone}, transparent)`,
                margin: "0 0.5rem",
                flexShrink: 0,
              }}
            />
            {props.onPasscode && (
              <button
                onClick={props.onPasscode}
                title={t("passcodeAction")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3125rem",
                  padding: "0.375rem 0.75rem",
                  borderRadius: "0.625rem",
                  border: `0.0625rem solid ${T.color.walnut}40`,
                  background: `${T.color.walnut}08`,
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: T.color.walnut,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                  marginRight: "0.375rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${T.color.walnut}15`;
                  e.currentTarget.style.borderColor = `${T.color.walnut}70`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${T.color.walnut}08`;
                  e.currentTarget.style.borderColor = `${T.color.walnut}40`;
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {t("passcodeAction")}
              </button>
            )}
            {props.onPublish && (
              <button
                onClick={props.onPublish}
                title={t("publishAction")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3125rem",
                  padding: "0.375rem 0.75rem",
                  borderRadius: "0.625rem",
                  border: `0.0625rem solid ${T.color.gold}55`,
                  background: `${T.color.gold}10`,
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: T.color.goldDark,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${T.color.gold}25`;
                  e.currentTarget.style.borderColor = T.color.gold;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${T.color.gold}10`;
                  e.currentTarget.style.borderColor = `${T.color.gold}55`;
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                {t("publishAction")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Mobile: single compact bar + expandable picker (pre-select → Enter) */
/* ================================================================== */

interface MobileCompactNavProps {
  view: "exterior" | "entrance" | "corridor" | "room";
  wingName?: string;
  wingAccent?: string;
  roomId?: string;
  wings: WingItem[];
  wingRooms: Record<string, RoomItem[]>;
  onExitToPalace: () => void;
  onEntranceHall: () => void;
  onSwitchWing: (wingId: string) => void;
  onNavigateRoom: (wingId: string, roomId: string) => void;
  barBackground: string;
  barBorder: string;
  barShadow: string;
  controlledPending?: PalacePending;
  onPendingChange?: (p: PalacePending) => void;
  onPublish?: () => void;
  onPasscode?: () => void;
}

type Pending = PalacePending;

function MobileCompactNav(props: MobileCompactNavProps) {
  const { view, wingName, wingAccent, roomId, wings, wingRooms,
    onExitToPalace, onEntranceHall, onSwitchWing, onNavigateRoom,
    barBackground, barBorder, barShadow, onPublish, onPasscode } = props;
  const { t } = useTranslation("palace");
  const { t: tWings } = useTranslation("wings");

  const currentWing = wings.find((w) => w.name === wingName) || null;
  const currentWingId = currentWing?.id;

  // Pending selection (pre-select → Enter commit). Controlled from outside
  // when ExteriorScene taps set it — identical contract to the old 3-bar nav.
  const [internalPending, setInternalPending] = useState<Pending>(null);
  const pending = props.controlledPending !== undefined ? props.controlledPending : internalPending;
  const setPending = (p: Pending) => {
    if (props.onPendingChange) props.onPendingChange(p);
    if (props.controlledPending === undefined) setInternalPending(p);
  };

  // Single collapsed bar ↔ expanded picker panel
  const [expanded, setExpanded] = useState(false);

  // The wing whose rooms are listed in the picker: pending > current > first
  const focusWingId =
    pending?.kind === "wing" ? pending.wingId
    : pending?.kind === "room" ? pending.wingId
    : currentWingId || wings[0]?.id || null;
  const focusWing = wings.find((w) => w.id === focusWingId) || null;
  const focusRooms = focusWingId ? (wingRooms[focusWingId] || []) : [];
  const accent = focusWing?.accent || wingAccent || CANON_EMBER;

  // Clear stale pending when the view actually reaches that location
  useEffect(() => {
    if (!pending) return;
    if (pending.kind === "palace" && view === "exterior") setPending(null);
    else if (pending.kind === "entrance" && view === "entrance") setPending(null);
    else if (pending.kind === "wing" && view === "corridor" && currentWingId === pending.wingId) setPending(null);
    else if (pending.kind === "room" && view === "room" && roomId === pending.roomId) setPending(null);
  }, [view, roomId, currentWingId, pending]);

  // Collapse the picker whenever navigation lands somewhere new
  useEffect(() => { setExpanded(false); }, [view, roomId]);

  // Escape closes the picker
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const isCurrent = (p: Pending): boolean => {
    if (!p) return false;
    if (p.kind === "palace") return view === "exterior";
    if (p.kind === "entrance") return view === "entrance";
    if (p.kind === "wing") return (view === "corridor" || view === "room") && currentWingId === p.wingId && !roomId;
    if (p.kind === "room") return view === "room" && roomId === p.roomId;
    return false;
  };

  const commitEnter = () => {
    if (!pending) return;
    if (pending.kind === "palace") onExitToPalace();
    else if (pending.kind === "entrance") onEntranceHall();
    else if (pending.kind === "wing") onSwitchWing(pending.wingId);
    else if (pending.kind === "room") onNavigateRoom(pending.wingId, pending.roomId);
    setExpanded(false);
  };

  /* ---- canon styles (mirror NavigationBar mobile grammar) ---------- */

  const safeL = "env(safe-area-inset-left, 0px)";
  const safeR = "env(safe-area-inset-right, 0px)";
  const safeT = "env(safe-area-inset-top, 0px)";
  const BAR_H = "2.75rem";

  // Picker pills: linen glass, hairline border, muted inactive /
  // ember-or-wing-accent active, 0.5rem radii, 2.75rem touch targets.
  const pillBase: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.375rem 0.625rem",
    minHeight: "2.75rem",
    borderRadius: "0.5rem",
    fontSize: "0.75rem",
    fontFamily: T.font.body,
    fontWeight: 500,
    whiteSpace: "nowrap",
    cursor: "pointer",
    border: `0.0625rem solid ${CANON_HAIRLINE}`,
    background: `${T.color.cream}80`,
    color: CANON_MUTED,
    flexShrink: 0,
    maxWidth: "100%",
    transition: "all 0.18s ease",
    WebkitTapHighlightColor: "transparent",
    WebkitAppearance: "none" as const,
  };
  const currentPill = (col: string): CSSProperties => ({
    ...pillBase,
    border: `0.09375rem solid ${col}`,
    background: `${col}18`,
    color: col,
    fontWeight: 700,
    boxShadow: `0 0.125rem 0.5rem ${col}33`,
  });
  const pendingPill = (col: string): CSSProperties => ({
    ...pillBase,
    border: `0.09375rem dashed ${col}`,
    background: `${col}14`,
    color: col,
    fontWeight: 700,
    animation: "mpPendingPulse 1.6s ease-in-out infinite",
  });
  const pillFor = (p: Pending, col: string) => {
    if (isCurrent(p)) return currentPill(col);
    if (pending && JSON.stringify(pending) === JSON.stringify(p)) return pendingPill(col);
    return pillBase;
  };

  const sectionLabel: CSSProperties = {
    fontSize: "0.6875rem",
    fontFamily: T.font.body,
    fontWeight: 700,
    color: CANON_MUTED,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    padding: "0.5rem 0.125rem 0.375rem",
  };
  const pillRow: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.375rem",
    minWidth: 0,
  };

  // Collapsed-bar breadcrumb text (0.6875rem uppercase, muted → accent)
  const crumbText = (active: boolean, col: string = CANON_EMBER): CSSProperties => ({
    fontSize: "0.6875rem",
    fontFamily: T.font.body,
    fontWeight: active ? 700 : 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: active ? col : CANON_MUTED,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
    flexShrink: 1,
    lineHeight: 1.2,
  });
  const renderSep = () => (
    <span aria-hidden style={{ color: CANON_MUTED, opacity: 0.55, fontSize: "0.75rem", lineHeight: 1, flexShrink: 0 }}>
      ›
    </span>
  );

  const currentRoomItem = roomId
    ? Object.values(wingRooms).flat().find((r) => r.id === roomId)
    : undefined;
  const currentRoomLabel = currentRoomItem ? translateRoomName(currentRoomItem, tWings) : null;
  const currentWingLabel = currentWing ? translateWingName(currentWing, tWings) : null;

  return (<>
    <style>{`
      @keyframes mpPendingPulse {
        0%,100% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
        50%     { box-shadow: 0 0 0 0.25rem currentColor; opacity: 0.85; }
      }
      @keyframes mpPanelIn {
        from { opacity: 0; transform: translateY(-0.375rem); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        [data-mp-palace-bars], [data-mp-palace-bars] *,
        [data-mp-palace-panel], [data-mp-palace-panel] *,
        [data-mp-palace-enter], [data-mp-palace-enter] * {
          animation: none !important;
          transition: none !important;
        }
      }
    `}</style>

    {/* Collapsed bar: single 2.75rem strip — breadcrumb toggle + Enter chip.
        Fixed to its own strip only, so 3D drag outside it is never blocked. */}
    <div
      role="navigation"
      aria-label={t("subnavBreadcrumb")}
      data-nudge="palace_subnav"
      data-mp-palace-bars="1"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: expanded ? 46 : 42,
        paddingTop: safeT,
        paddingLeft: safeL,
        paddingRight: safeR,
        background: `${T.color.linen}E0`,
        backdropFilter: "blur(0.75rem)",
        WebkitBackdropFilter: "blur(0.75rem)",
        borderBottom: barBorder,
        boxShadow: barShadow,
        display: "flex",
        alignItems: "stretch",
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-haspopup="true"
        aria-label={t("subnavBreadcrumb")}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: BAR_H,
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          padding: "0 0.75rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left" as const,
          WebkitTapHighlightColor: "transparent",
          WebkitAppearance: "none" as const,
        }}
      >
        <span style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }} aria-hidden>
          <PalaceIcon size={14} color={view === "exterior" ? CANON_EMBER : CANON_MUTED} />
        </span>
        <span style={{ ...crumbText(view === "exterior"), flexShrink: 2 }}>{t("palaceLabel")}</span>

        {view === "entrance" && (<>
          {renderSep()}
          <span style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }} aria-hidden>
            <TempleIcon size={14} color={CANON_EMBER} />
          </span>
          <span style={crumbText(true)}>{t("entranceHallLabel")}</span>
        </>)}

        {(view === "corridor" || view === "room") && currentWing && (<>
          {renderSep()}
          <span style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }} aria-hidden>
            <WingIcon wingId={currentWing.id} size={14} color={view === "corridor" ? currentWing.accent : CANON_MUTED} />
          </span>
          <span style={{ ...crumbText(view === "corridor", currentWing.accent), maxWidth: "calc(8rem * var(--a11y-scale, 1))" }}>
            {currentWingLabel}
          </span>
        </>)}

        {view === "room" && currentRoomLabel && (<>
          {renderSep()}
          {roomId && (
            <span style={{ display: "inline-flex", lineHeight: 1, flexShrink: 0 }} aria-hidden>
              <RoomIcon roomId={roomId} size={14} color={currentWing?.accent || CANON_EMBER} />
            </span>
          )}
          <span style={{ ...crumbText(true, currentWing?.accent || CANON_EMBER), maxWidth: "calc(8rem * var(--a11y-scale, 1))" }}>
            {currentRoomLabel}
          </span>
        </>)}

        {/* expand/collapse chevron — pinned right */}
        <svg
          width={10} height={10} viewBox="0 0 8 8" fill="none"
          stroke={CANON_MUTED} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
          aria-hidden
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            opacity: 0.7,
            transition: "transform 0.15s ease",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path d="M2 3l2 2 2-2" />
        </svg>
      </button>

      {/* Enter chip — visible whenever a pending selection awaits commit
          (incl. selections set from 3D taps), so the commit affordance
          survives the collapse of the old full-height portico button. */}
      {pending && (
        <button
          onClick={commitEnter}
          data-mp-palace-enter="1"
          aria-label={t("enterAction")}
          style={{
            alignSelf: "center",
            minHeight: "2.75rem",
            margin: "0 0.5rem 0 0.25rem",
            padding: "0 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: CANON_EMBER,
            color: T.color.cream,
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: CANON_SHADOW_1,
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            transition: "all 0.2s ease",
            WebkitTapHighlightColor: "transparent",
            WebkitAppearance: "none" as const,
          }}
        >
          {t("enterAction")}
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      )}
    </div>

    {/* Expanded picker: scrim + scrollable linen-glass panel */}
    {expanded && (<>
      <div
        onClick={() => setExpanded(false)}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 44,
          background: "rgba(64,59,54,0.18)",
        }}
      />
      <div
        role="navigation"
        aria-label={t("subnavQuickNav")}
        data-mp-palace-panel="1"
        className="hide-scrollbar"
        style={{
          position: "fixed",
          top: `calc(${safeT} + ${BAR_H})`,
          left: 0,
          right: 0,
          zIndex: 45,
          maxHeight: "min(40vh, 20rem)",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch" as const,
          background: barBackground,
          backdropFilter: "blur(0.75rem)",
          WebkitBackdropFilter: "blur(0.75rem)",
          borderBottom: barBorder,
          boxShadow: CANON_SHADOW_2,
          padding: `0.25rem calc(0.75rem + ${safeR}) 0.75rem calc(0.75rem + ${safeL})`,
          animation: "mpPanelIn 0.18s ease",
        }}
      >
        {/* Palace level */}
        <div style={sectionLabel}>{t("subnavPalace")}</div>
        <div style={pillRow}>
          <button
            onClick={() => setPending({ kind: "palace" })}
            style={pillFor({ kind: "palace" }, CANON_EMBER)}
            aria-current={view === "exterior" ? "location" : undefined}
          >
            <PalaceIcon size={13} color={view === "exterior" || pending?.kind === "palace" ? CANON_EMBER : CANON_MUTED} />
            <span>{t("palaceLabel")}</span>
          </button>
          <button
            onClick={() => setPending({ kind: "entrance" })}
            style={pillFor({ kind: "entrance" }, CANON_EMBER)}
            aria-current={view === "entrance" ? "location" : undefined}
          >
            <TempleIcon size={13} color={view === "entrance" || pending?.kind === "entrance" ? CANON_EMBER : CANON_MUTED} />
            <span>{t("entranceHallLabel")}</span>
          </button>
        </div>

        {/* Wings */}
        <div style={sectionLabel}>{t("ariaWings")}</div>
        <div style={pillRow} role="group" aria-label={t("ariaWings")}>
          {wings.map((w) => {
            const isCurr = (view === "corridor" || view === "room") && currentWingId === w.id;
            const isPend = pending?.kind === "wing" && pending.wingId === w.id;
            return (
              <button
                key={w.id}
                onClick={() => setPending({ kind: "wing", wingId: w.id })}
                style={isCurr ? currentPill(w.accent) : isPend ? pendingPill(w.accent) : pillBase}
                aria-current={isCurr ? "location" : undefined}
              >
                <WingIcon wingId={w.id} size={12} color={isCurr || isPend ? w.accent : CANON_MUTED} />
                <span style={{ maxWidth: "calc(9rem * var(--a11y-scale, 1))", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {translateWingName(w, tWings)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Rooms of the focused wing */}
        <div style={sectionLabel}>
          {focusWing ? `${t("subnavRoomsIn")} — ${translateWingName(focusWing, tWings)}` : t("ariaRooms")}
        </div>
        <div style={pillRow} role="group" aria-label={t("ariaRooms")}>
          {focusRooms.length === 0 && (
            <span style={{ fontSize: "0.75rem", fontFamily: T.font.body, color: CANON_MUTED, fontStyle: "italic", padding: "0.25rem 0.125rem" }}>
              {t("selectAWing")}
            </span>
          )}
          {focusWingId && focusRooms.map((r) => {
            const isCurr = view === "room" && currentWingId === focusWingId && roomId === r.id;
            const isPend = pending?.kind === "room" && pending.roomId === r.id;
            return (
              <button
                // key includes focus wing so pills remount (and fade in) on wing switch
                key={`${focusWingId}-${r.id}`}
                className="mp-fade-in"
                onClick={() => setPending({ kind: "room", wingId: focusWingId, roomId: r.id })}
                style={isCurr ? currentPill(accent) : isPend ? pendingPill(accent) : pillBase}
                aria-current={isCurr ? "location" : undefined}
              >
                <RoomIcon roomId={r.id} size={12} color={isCurr || isPend ? accent : CANON_MUTED} />
                <span style={{ maxWidth: "calc(9rem * var(--a11y-scale, 1))", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {translateRoomName(r, tWings)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer: full-width Enter — commits the pending selection */}
        <button
          onClick={commitEnter}
          disabled={!pending}
          data-mp-palace-enter="1"
          aria-label={t("enterAction")}
          style={{
            width: "100%",
            minHeight: "2.75rem",
            marginTop: "0.625rem",
            borderRadius: "0.5rem",
            border: pending ? "none" : `0.0625rem solid ${CANON_HAIRLINE}`,
            background: pending ? CANON_EMBER : `${T.color.cream}80`,
            color: pending ? T.color.cream : `${CANON_MUTED}99`,
            fontFamily: T.font.body,
            fontSize: "0.6875rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: pending ? "pointer" : "not-allowed",
            boxShadow: pending ? `0 0.25rem 1rem ${CANON_EMBER}44` : "none",
            transition: "all 0.2s ease",
            WebkitTapHighlightColor: "transparent",
            WebkitAppearance: "none" as const,
          }}
        >
          {t("enterAction")}
        </button>
      </div>
    </>)}

    {/* Passcode + Publish buttons — mobile corridor/room only */}
    {onPasscode && (view === "corridor" || view === "room") && (
      <button
        onClick={onPasscode}
        aria-label={t("passcodeAction")}
        style={{
          position: "fixed",
          top: `calc(${safeT} + ${BAR_H} + 0.5rem)`,
          right: `calc(${safeR} + ${onPublish ? "4.25rem" : "0.75rem"})`,
          zIndex: 43,
          width: "2.75rem",
          height: "2.75rem",
          borderRadius: "50%",
          border: `0.0625rem solid ${T.color.walnut}40`,
          background: `${T.color.linen}ee`,
          backdropFilter: "blur(0.5rem)",
          WebkitBackdropFilter: "blur(0.5rem)",
          color: T.color.walnut,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0.125rem 0.5rem rgba(64,59,54,0.10)",
          transition: "all 0.15s ease",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </button>
    )}
    {onPublish && (view === "corridor" || view === "room") && (
      <button
        onClick={onPublish}
        aria-label={t("publishAction")}
        style={{
          position: "fixed",
          top: `calc(${safeT} + ${BAR_H} + 0.5rem)`,
          right: `calc(${safeR} + 0.75rem)`,
          zIndex: 43,
          width: "2.75rem",
          height: "2.75rem",
          borderRadius: "50%",
          border: `0.0625rem solid ${T.color.gold}55`,
          background: `${T.color.linen}ee`,
          backdropFilter: "blur(0.5rem)",
          WebkitBackdropFilter: "blur(0.5rem)",
          color: T.color.goldDark,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0.125rem 0.5rem rgba(64,59,54,0.10)",
          transition: "all 0.15s ease",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </button>
    )}

    {/* Spacer — total collapsed chrome height (single bar + safe-area) if any
        caller needs it; MemoryPalace's main tree is absolute-positioned. */}
    <div aria-hidden style={{ height: `calc(${safeT} + ${BAR_H})`, pointerEvents: "none", visibility: "hidden" }} />
  </>);
}
