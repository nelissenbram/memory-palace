"use client";
import { useState, useMemo, useCallback, useEffect, useRef, type CSSProperties } from "react";
import { T } from "@/lib/theme";
import { useIsMobile, useIsCompact } from "@/lib/hooks/useIsMobile";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useThumbnailBackfill } from "@/lib/hooks/useThumbnailBackfill";
import { syncSettingsToServer } from "@/lib/stores/settingsSync";
import { getDemoMems, demosVisible, setDemosHidden } from "@/lib/constants/defaults";
import { isIOS } from "@/lib/native/platform";
import { confirmDialog } from "@/lib/ui/confirm";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { translateWingName, translateRoomName } from "@/lib/constants/wings";
import MemoryDetail from "@/components/ui/MemoryDetail";
import { MediaThumb } from "@/components/ui/MediaThumb";
import PhotoWall from "@/components/ui/PhotoWall";
import { computeWarmthLevel, getTimeOfDay, TIME_WASH } from "@/lib/warmth";
import { Overline } from "@/components/ui/AtriumRelay";
import RoomMediaPlayer from "@/components/ui/RoomMediaPlayer";
import UploadPanel from "@/components/ui/UploadPanel";
import ImportHub from "@/components/ui/ImportHub";
import type { QueuedFile } from "@/components/ui/ImportHub";
import NotificationBell from "@/components/ui/NotificationBell";
import Image from "next/image";
import { LibraryRoomCard, LibraryMemoryCard } from "@/components/ui/LibraryCards";
import LibrarySidebar from "@/components/ui/LibrarySidebar";
import { geocodeAutocomplete, type GeocodeSuggestion } from "@/lib/geocode";
import { LibrarySearch } from "@/components/ui/LibrarySearch";
import { LibraryStyles, LibraryHeader, LibraryEmptyState } from "@/components/ui/LibraryAnimations";
import TuscanStyles from "./TuscanStyles";
import TuscanCard from "./TuscanCard";
import WingManagerPanel from "@/components/ui/WingManagerPanel";
import RoomManagerPanel from "@/components/ui/RoomManagerPanel";
import { WingIcon, RoomIcon, GenericRoomIcon, resolveRoomIconId, AllMemoriesIcon } from "./WingRoomIcons";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useUIPanelStore } from "@/lib/stores/uiPanelStore";
import { TYPE_ICONS, TypeIcon } from "@/lib/constants/type-icons";
import { CREAM, HAIRLINE, TRAY, EMBER, SHADOW, TOP_HIGHLIGHT } from "@/lib/libraryTokens";
import { lazy, Suspense } from "react";
const PublishModal = lazy(() => import("@/components/social/PublishModal"));

interface CloudItem {
  id: string;
  name: string;
  thumbnailUrl?: string;
  provider: string;
  isFolder: boolean;
  path: string;
}

const ChainLinkIcon = ({ size = "2.5rem", opacity = 0.5 }: { size?: string; opacity?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={"#716A5E"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const FolderIcon = () => (
  <svg width="2.5rem" height="2.5rem" viewBox="0 0 24 24" fill={T.color.sandstone} stroke={"#716A5E"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

function CloudBrowser({ provider, onClose, onImport, isMobile, t, tc }: {
  provider: string;
  onClose: () => void;
  onImport: (items: CloudItem[]) => void;
  isMobile: boolean;
  t: (key: string, params?: Record<string, string>) => string;
  tc: (key: string) => string;
}) {
  const [status, setStatus] = useState<"loading" | "connected" | "not_connected" | "error">("loading");
  const [items, setItems] = useState<CloudItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentPath, setCurrentPath] = useState<string>("");

  const providerConfig: Record<string, { browseUrl: string; connectUrl: string; labelKey: string }> = {
    google_photos: { browseUrl: "/api/integrations/google/photos", connectUrl: "/api/integrations/google/connect", labelKey: "googlePhotos" },
    dropbox: { browseUrl: "/api/integrations/dropbox/browse", connectUrl: "/api/integrations/dropbox/connect", labelKey: "dropbox" },
    onedrive: { browseUrl: "/api/integrations/onedrive/browse", connectUrl: "/api/integrations/onedrive/connect", labelKey: "onedrive" },
  };

  const config = providerConfig[provider] || { browseUrl: "", connectUrl: "", labelKey: provider };
  const providerLabel = t(config.labelKey);

  const fetchItems = useCallback(async (path: string) => {
    if (!config.browseUrl) {
      setStatus("not_connected");
      return;
    }
    setStatus("loading");
    try {
      const url = path ? `${config.browseUrl}?path=${encodeURIComponent(path)}` : config.browseUrl;
      const res = await fetch(url);
      if (res.status === 401 || res.status === 403) {
        setStatus("not_connected");
        return;
      }
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error(`[CloudBrowser] ${provider} browse failed (${res.status}):`, errBody);
        setStatus("error");
        return;
      }
      const data = await res.json();
      const cloudItems: CloudItem[] = (data.items || data.photos || data.files || []).map((item: Record<string, string | boolean | undefined>, i: number) => ({
        id: (item.id as string) || `${provider}-${i}`,
        name: (item.name as string) || (item.filename as string) || (item.title as string) || `${providerLabel} ${i + 1}`,
        thumbnailUrl: (item.thumbnailUrl as string) || (item.baseUrl as string) || (item.thumbnail as string) || "",
        provider,
        isFolder: item.isFolder === true || item.type === "folder" || item.mimeType === "application/vnd.google-apps.folder",
        path: (item.path as string) || (item.id as string) || "",
      }));
      setItems(cloudItems);
      setStatus("connected");
    } catch {
      setStatus("not_connected");
    }
  }, [config.browseUrl, provider, providerLabel]);

  useEffect(() => {
    let cancelled = false;
    fetchItems(currentPath).then(() => {
      if (cancelled) return;
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, currentPath]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectableItems = items.filter(i => !i.isFolder);
  const allSelectableSelected = selectableItems.length > 0 && selectableItems.every(i => selected.has(i.id));

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableItems.map(i => i.id)));
    }
  };

  const navigateToFolder = (folderPath: string) => {
    setSelected(new Set());
    setCurrentPath(folderPath);
  };

  const breadcrumbSegments = currentPath ? currentPath.split("/").filter(Boolean) : [];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(64,59,54,.35)",
        backdropFilter: "blur(0.75rem)",
        WebkitBackdropFilter: "blur(0.75rem)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "libFadeIn 0.2s ease both",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: CREAM,
          borderRadius: "1.25rem",
          boxShadow: "0 1.5rem 3rem rgba(64,59,54,0.18), inset 0 0.0625rem 0 rgba(255,255,255,0.5)",
          border: `0.0625rem solid ${HAIRLINE}`,
          width: "min(36rem, 92vw)",
          maxHeight: "min(36rem, 85vh)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `0.0625rem solid ${HAIRLINE}`, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: "#403B36", margin: 0 }}>
                {t("cloudBrowseTitle", { provider: providerLabel })}
              </h3>
              <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "#716A5E", margin: "0.25rem 0 0" }}>
                {status === "connected" ? t("cloudBrowseConnected", { count: String(items.length) }) : t("cloudBrowseLoading")}
              </p>
            </div>
            <button onClick={onClose} aria-label={tc("close")} style={{ width: "2rem", height: "2rem", borderRadius: "1rem", border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone, color: "#716A5E", fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
          </div>

          {/* Breadcrumb navigation */}
          {status === "connected" && (
            <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.625rem", flexWrap: "wrap" }}>
              <button
                onClick={() => navigateToFolder("")}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "0.125rem 0.25rem",
                  fontFamily: T.font.body, fontSize: "0.75rem", color: currentPath ? T.color.terracotta : "#403B36",
                  fontWeight: currentPath ? 500 : 600, textDecoration: currentPath ? "underline" : "none",
                }}
              >
                {t("cloudBreadcrumbRoot")}
              </button>
              {breadcrumbSegments.map((seg, i) => {
                const segPath = breadcrumbSegments.slice(0, i + 1).join("/");
                const isLast = i === breadcrumbSegments.length - 1;
                return (
                  <span key={segPath} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "#716A5E" }}>/</span>
                    <button
                      onClick={() => !isLast && navigateToFolder(segPath)}
                      style={{
                        background: "none", border: "none", cursor: isLast ? "default" : "pointer",
                        padding: "0.125rem 0.25rem",
                        fontFamily: T.font.body, fontSize: "0.75rem",
                        color: isLast ? "#403B36" : T.color.terracotta,
                        fontWeight: isLast ? 600 : 500,
                        textDecoration: isLast ? "none" : "underline",
                      }}
                    >
                      {seg}
                    </button>
                  </span>
                );
              })}
            </nav>
          )}

          {/* Select all / deselect all bar */}
          {status === "connected" && selectableItems.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
              <button
                onClick={toggleSelectAll}
                style={{
                  background: "none", border: `0.0625rem solid ${T.color.cream}`, borderRadius: "0.375rem",
                  padding: "0.25rem 0.625rem", cursor: "pointer",
                  fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 500,
                  color: "#716A5E",
                }}
              >
                {allSelectableSelected ? t("cloudDeselectAll") : t("cloudSelectAll")}
              </button>
              {selected.size > 0 && (
                <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E" }}>
                  {t("cloudItemsSelected", { count: String(selected.size) })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "1.25rem 1.5rem", contain: "layout" }}>
          {status === "loading" && (
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <div style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: "#716A5E" }}>{t("cloudBrowseLoading")}</div>
            </div>
          )}

          {status === "not_connected" && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
                <ChainLinkIcon />
              </div>
              <h4 style={{ fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600, color: "#403B36", margin: "0 0 0.5rem" }}>
                {t("cloudNotConnected", { provider: providerLabel })}
              </h4>
              <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", marginBottom: "1.25rem", lineHeight: 1.5 }}>
                {t("cloudConnectExplain", { provider: providerLabel })}
              </p>
              <button
                onClick={() => { window.location.href = config.connectUrl; }}
                style={{
                  padding: "0.625rem 1.5rem", borderRadius: "0.625rem",
                  background: "#403B36", color: T.color.linen,
                  border: "none", cursor: "pointer",
                  fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                  letterSpacing: "0.03em",
                }}
              >
                {t("cloudConnectBtn", { provider: providerLabel })}
              </button>
              <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E", marginTop: "0.75rem" }}>
                {t("cloudConnectHint")}
              </p>
            </div>
          )}

          {status === "error" && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: "#716A5E" }}>{t("cloudBrowseError")}</p>
            </div>
          )}

          {status === "connected" && items.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: "#716A5E" }}>{t("cloudBrowseEmpty")}</p>
            </div>
          )}

          {status === "connected" && items.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(4, 1fr)", gap: "0.75rem" }}>
              {items.map(item => {
                if (item.isFolder) {
                  return (
                    <button key={item.id} onClick={() => navigateToFolder(item.path)}
                      style={{
                        position: "relative", borderRadius: "0.625rem", overflow: "hidden",
                        border: `0.0625rem solid ${T.color.cream}`,
                        background: T.color.linen, cursor: "pointer", aspectRatio: "1",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        gap: "0.375rem", transition: "all .15s", padding: 0,
                      }}>
                      <FolderIcon />
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.625rem", color: "#716A5E",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        display: "block", maxWidth: "90%", padding: "0 0.25rem",
                      }}>{item.name}</span>
                    </button>
                  );
                }

                const isSelected = selected.has(item.id);
                return (
                  <button key={item.id} onClick={() => toggleSelect(item.id)}
                    style={{
                      position: "relative", borderRadius: "0.625rem", overflow: "hidden",
                      border: isSelected ? `0.125rem solid ${T.color.terracotta}` : `0.0625rem solid ${T.color.cream}`,
                      background: T.color.warmStone, cursor: "pointer", aspectRatio: "1",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      transition: "all .15s", padding: 0,
                    }}>
                    {item.thumbnailUrl ? (
                      <img src={item.thumbnailUrl} alt={item.name} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <svg width="2rem" height="2rem" viewBox="0 0 24 24" fill="none" stroke={"#716A5E"} strokeWidth="1.5" style={{ opacity: 0.3 }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                    )}
                    {isSelected && (
                      <div style={{
                        position: "absolute", top: "0.375rem", right: "0.375rem",
                        width: "1.375rem", height: "1.375rem", borderRadius: "50%",
                        background: T.color.terracotta, color: "#FFF",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 0.125rem 0.25rem rgba(0,0,0,.2)",
                      }}>
                        <svg width="0.75rem" height="0.75rem" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.45)", padding: "0.25rem 0.375rem" }}>
                      <span style={{ fontFamily: T.font.body, fontSize: "0.5625rem", color: "#FFF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{item.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0.75rem 1.5rem", borderTop: `0.0625rem solid ${HAIRLINE}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "#716A5E" }}>
            {selected.size > 0 ? t("cloudSelected", { count: String(selected.size) }) : ""}
          </span>
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button onClick={onClose}
              style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "rgba(64,59,54,.06)", border: "none", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: "#716A5E" }}>{tc("cancel")}</button>
            {selected.size > 0 && (
              <button
                onClick={() => onImport(items.filter(i => selected.has(i.id)))}
                style={{
                  padding: "0.5rem 1.25rem", borderRadius: "0.5rem",
                  background: T.color.terracotta, color: "#FFF",
                  border: "none", cursor: "pointer",
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                }}>
                {t("cloudImportSelected", { count: String(selected.size) })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Normalize display types for consistent categorization (module scope: it's
// used inside memo factories that run before the component body finishes).
const normalizeDisplayType = (type: string) => {
  if (type === "painting") return "photo";
  if (type === "voice") return "interview";
  return type;
};

// A memory's date, wherever it lives — every date path must use the same fallback.
const memDate = (m: Mem) => m.createdAt || (m as { date?: string }).date || "";

// Room glyph, resolver-first: `room.icon` holds an EMOJI for default rooms (the
// ROOM_ICON_MAP is keyed by room ids), so every room glyph goes through
// resolveRoomIconId(id, icon) → crafted RoomIcon, else the generic door-frame.
// No emoji fallback anywhere.
const RoomGlyph = ({ room, wingId, size, color }: { room: { id: string; icon?: string }; wingId?: string; size: number; color: string }) => {
  const iconId = resolveRoomIconId(room.id, room.icon);
  return iconId
    ? <RoomIcon roomId={iconId} wingId={wingId} size={size} color={color} />
    : <GenericRoomIcon size={size} color={color} />;
};

// Touch drag & drop: resolve the drop-tray chip (or a descendant) under a
// viewport point. Negative coords (cancelled drags) always miss.
const dropRoomIdAt = (x: number, y: number): string | null => {
  if (x < 0 || y < 0 || typeof document === "undefined") return null;
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const chip = el?.closest?.("[data-drop-room-id]") as HTMLElement | null;
  return chip?.dataset.dropRoomId || null;
};

/**
 * Explicit wing → room destination chooser. Born as the Time-Capsule picker
 * ("it opened a random photo" — no more fullest-room auto-entry); now reusable
 * for any room-scoped tool. `title`/`hint` default to the capsule texts so the
 * Time-Capsule call site is unchanged.
 */
function RoomPicker({ wings, getWingRooms, onClose, onPick, t, tc, tWings, title, hint }: {
  wings: Wing[];
  getWingRooms: (wingId: string) => WingRoom[];
  onClose: () => void;
  onPick: (wingId: string, roomId: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
  tc: (key: string) => string;
  tWings: (key: string) => string;
  title?: string;
  hint?: string;
}) {
  const [wingId, setWingId] = useState<string | null>(null);
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const heading = title ?? t("capsulePickTitle");
  const hintText = hint ?? t("capsulePickHint");
  const wing = wingId ? wings.find(w => w.id === wingId) || null : null;
  const rooms = wing ? getWingRooms(wing.id) : [];
  const rowStyle: CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.625rem", width: "100%",
    minHeight: "2.75rem", padding: "0.5rem 0.75rem", borderRadius: "0.75rem",
    border: `0.0625rem solid ${HAIRLINE}`, background: "#FCFAF5", cursor: "pointer",
    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#403B36",
    textAlign: "left" as const, transition: "all .15s",
  };
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(64,59,54,.35)", backdropFilter: "blur(0.75rem)", WebkitBackdropFilter: "blur(0.75rem)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "libFadeIn 0.2s ease both",
    }}>
      <div
        ref={containerRef}
        role="dialog" aria-modal="true" aria-label={heading}
        onClick={e => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } handleKeyDown(e); }}
        style={{
          background: CREAM, borderRadius: "1.25rem",
          border: `0.0625rem solid ${HAIRLINE}`,
          boxShadow: "0 1.5rem 3rem rgba(64,59,54,0.18), inset 0 0.0625rem 0 rgba(255,255,255,0.5)",
          width: "min(26rem, 92vw)", maxHeight: "min(30rem, 85vh)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `0.0625rem solid ${HAIRLINE}`, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
            <div>
              <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: "#403B36", margin: 0 }}>
                {heading}
              </h3>
              <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "#716A5E", margin: "0.25rem 0 0", lineHeight: 1.45 }}>
                {hintText}
              </p>
            </div>
            <button onClick={onClose} aria-label={tc("close")} style={{ minWidth: "2.75rem", minHeight: "2.75rem", borderRadius: "1.375rem", border: `0.0625rem solid ${HAIRLINE}`, background: T.color.warmStone, color: "#716A5E", fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{"✕"}</button>
          </div>
        </div>

        {/* Two-level pick: wings → rooms of the chosen wing */}
        <div style={{ flex: 1, overflow: "auto", padding: "1rem 1.5rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {!wing ? (
            wings.map(w => (
              <button key={w.id} type="button" onClick={() => setWingId(w.id)} style={rowStyle}>
                <WingIcon wingId={w.id} size={18} color={w.accent} />
                <span style={{ flex: 1 }}>{translateWingName(w, tWings)}</span>
                <span aria-hidden="true" style={{ color: "#716A5E", fontSize: "0.75rem" }}>{"›"}</span>
              </button>
            ))
          ) : (
            <>
              <button type="button" onClick={() => setWingId(null)} style={{ ...rowStyle, border: "none", background: "transparent", color: "#716A5E", fontWeight: 500, minHeight: "2.75rem" }}>
                <span aria-hidden="true" style={{ fontSize: "0.75rem" }}>{"‹"}</span>
                {tc("back") !== "back" ? tc("back") : translateWingName(wing, tWings)}
              </button>
              {rooms.map(r => (
                <button key={r.id} type="button" onClick={() => onPick(wing.id, r.id)} style={rowStyle}>
                  <RoomGlyph room={r} wingId={wing.id} size={18} color={wing.accent} />
                  <span style={{ flex: 1 }}>{translateRoomName(r, tWings)}</span>
                  <span aria-hidden="true" style={{ color: "#716A5E", fontSize: "0.75rem" }}>{"›"}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Playful hand-drawn gold arrow that floats above (or, near the top edge,
 * below) the spotlighted action button and bounces toward it — guiding the
 * click-through from an Atrium card. Purely decorative (aria-hidden); the
 * spotlight pulse + hint remain the accessible affordance. Lifetime is tied
 * to spotlightTarget, so it vanishes exactly when the spotlight clears.
 */
function SpotlightArrow({ targetKey }: { targetKey: string }) {
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);
  useEffect(() => {
    // 3.5rem × 4.25rem doodle, px-measured against the button's viewport rect
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const ARROW_W = 3.5 * rem, ARROW_H = 4.25 * rem, GAP = 0.5 * rem;
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(`[data-spotlight-id="${targetKey}"]`);
      const r = el?.getBoundingClientRect();
      if (!r || (r.width === 0 && r.height === 0)) { setPos(null); return; }
      const below = r.top < ARROW_H + GAP + rem; // button near top edge → arrow underneath, pointing up
      setPos({
        left: r.left + r.width / 2 - ARROW_W / 2,
        top: below ? r.bottom + GAP : r.top - ARROW_H - GAP,
        below,
      });
    };
    const schedule = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; measure(); }); };
    measure();
    const settle = setTimeout(measure, 350); // pill rows may still be settling
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      clearTimeout(settle);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [targetKey]);
  if (!pos) return null;
  return (
    <div
      aria-hidden="true"
      data-spotlight-arrow=""
      style={{
        position: "fixed", left: pos.left, top: pos.top,
        width: "3.5rem", height: "4.25rem",
        zIndex: 10050, pointerEvents: "none",
        // Flip for the "below the button" case: the doodle points up and the
        // child bounce (translateY 0→0.4rem) visually moves TOWARD the button.
        transform: pos.below ? "scaleY(-1)" : undefined,
      }}
    >
      <style>{`
        @keyframes mpArrowBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(0.4rem); } }
        @media (prefers-reduced-motion: reduce) { [data-spotlight-arrow] svg { animation: none !important; } }
      `}</style>
      <svg
        viewBox="0 0 56 68" width="100%" height="100%" fill="none"
        style={{ display: "block", overflow: "visible", animation: "mpArrowBounce 1.6s ease-in-out infinite" }}
      >
        {/* darker-gold outline shadow, nudged for a loose hand-drawn depth */}
        <g stroke="#8A6410" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" transform="translate(1.5 1.75)">
          <path d="M12 6 C 30 1, 45 13, 40 30 C 37 41, 31 48, 28 56" />
          <path d="M19 48 C 22 52, 25 55, 28 58" />
          <path d="M39 46 C 35 50, 31 54, 28 58" />
        </g>
        {/* wobbly gold stroke + loose arrowhead */}
        <g stroke="#D4AF37" strokeWidth="4.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6 C 30 1, 45 13, 40 30 C 37 41, 31 48, 28 56" />
          <path d="M19 48 C 22 52, 25 55, 28 58" />
          <path d="M39 46 C 35 50, 31 54, 28 58" />
        </g>
      </svg>
    </div>
  );
}

export default function LibraryView() {
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  const { t, locale } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { t: tWings } = useTranslation("wings");
  const { getWings, getWingRooms: getWingRoomsStore } = useRoomStore();
  const customWings = useRoomStore(s => s.customWings);
  const extraWings = useRoomStore(s => s.extraWings);
  const customRooms = useRoomStore(s => s.customRooms);
  const { userMems, fetchRoomMemories, fetchAllRoomMemories } = useMemoryStore();
  const { setNavMode, enterCorridor, enterWingRoom, enterEntrance, activeWing: storeActiveWing } = usePalaceStore();

  const { addMemory, updateMemory, deleteMemory, moveMemory } = useMemoryStore();

  // Stable identities: the store getters build fresh arrays/objects per call,
  // which used to invalidate every palace-wide memo (and re-pack the whole
  // wall) on ANY render. Key them on the underlying store state instead.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const wings = useMemo(() => getWings(), [getWings, customWings, extraWings]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getWingRooms = useCallback((wingId: string) => getWingRoomsStore(wingId), [getWingRoomsStore, customRooms]);
  const [selectedWing, setSelectedWing] = useState<string>("__all__");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [facet, setFacet] = useState<null | "place" | "described" | "onthisday">(null);
  const [detailMem, setDetailMem] = useState<{ mem: Mem; wingId: string; roomId: string; initialAction?: string } | null>(null);
  const [showUploadFor, setShowUploadFor] = useState<{ wingId: string; roomId: string } | null>(null);
  const [movingMem, setMovingMem] = useState<{ mem: Mem; fromRoom: string } | null>(null);
  const [bulkMoving, setBulkMoving] = useState(false);
  const [expandedMoveWing, setExpandedMoveWing] = useState<string | null>(null);
  const [movedToast, setMovedToast] = useState(false);
  const movedToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMovedToast = useCallback(() => {
    setMovedToast(true);
    if (movedToastTimerRef.current) clearTimeout(movedToastTimerRef.current);
    movedToastTimerRef.current = setTimeout(() => setMovedToast(false), 2200);
  }, []);
  useEffect(() => () => { if (movedToastTimerRef.current) clearTimeout(movedToastTimerRef.current); }, []);
  const [showWingManager, setShowWingManager] = useState(false);
  const [showRoomManager, setShowRoomManager] = useState(false);
  // Time Capsule wing→room chooser (explicit destination pick, no auto-room)
  const [capsulePickerOpen, setCapsulePickerOpen] = useState(false);
  // Room chooser for the room-scoped tool pills (Write Story / AI Label /
  // Add Location) pressed with no room open — replaces fullest-room auto-entry
  const [toolRoomPicker, setToolRoomPicker] = useState<"writeStory" | "aiLabel" | "addLocation" | null>(null);
  // List view is retired (redundant beside wall + timeline) — validate the
  // persisted value so a stale 'list' can never strand the user viewless.
  const [viewMode, setViewMode] = useState<"grid" | "timeline">(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("libraryViewMode") === "timeline" ? "timeline" : "grid";
    }
    return "grid";
  });
  const [cloudBrowserProvider, setCloudBrowserProvider] = useState<string | null>(null);
  // Destination room for a cloud import — set from ImportHub's Destination
  // selector so the choice is honored even when no room is open.
  const [cloudImportRoom, setCloudImportRoom] = useState<string | null>(null);
  const [pickerStatus, setPickerStatus] = useState<"idle" | "opening" | "waiting" | "importing" | "done" | "error">("idle");
  const [pickerError, setPickerError] = useState<string>("");
  const [pickerUri, setPickerUri] = useState<string>("");
  const [pickerImportCount, setPickerImportCount] = useState(0);
  const pickerPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showImportHub, setShowImportHub] = useState(false);
  const [showDemos, setShowDemos] = useState(() => demosVisible());
  const [activeToolPanel, setActiveToolPanel] = useState<"writeStory" | "aiLabel" | "addLocation" | null>(null);
  const [libTimeOfDay, setLibTimeOfDay] = useState(() => getTimeOfDay());
  const [wallGroupBy, setWallGroupBy] = useState<"month" | "room">("month");
  const [filterYear, setFilterYear] = useState<string>("");
  useEffect(() => { const id = setInterval(() => setLibTimeOfDay(getTimeOfDay()), 10 * 60 * 1000); return () => clearInterval(id); }, []);
  const [storyText, setStoryText] = useState("");
  const [aiLabelProcessing, setAiLabelProcessing] = useState(false);
  // Monotonic run id: any close/cancel bumps it, orphaning in-flight label loops
  const aiLabelRunRef = useRef(0);
  const [aiLabelSelected, setAiLabelSelected] = useState<Set<string>>(new Set());
  const [aiLabelProgress, setAiLabelProgress] = useState<{ current: number; total: number } | null>(null);
  const [aiLabelResults, setAiLabelResults] = useState<Record<string, { description: string; labels: string[]; saved?: boolean }>>({});
  const [aiLabelEditing, setAiLabelEditing] = useState<string | null>(null);
  const [aiLabelEditText, setAiLabelEditText] = useState("");
  const [aiLabelError, setAiLabelError] = useState<string | null>(null);
  const [aiLabelDone, setAiLabelDone] = useState(false);
  // Add-Location panel: autocomplete-only combobox (the user MUST pick a
  // geocoded suggestion) + per-memory selection within the open room.
  const [locQuery, setLocQuery] = useState("");
  const [locSuggestions, setLocSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [locPicked, setLocPicked] = useState<GeocodeSuggestion | null>(null);
  const [locActiveIdx, setLocActiveIdx] = useState(-1);
  // Ids the user UNticked; selection = room memories minus this set, so
  // memories that finish fetching after the panel opens arrive pre-selected.
  const [locDeselected, setLocDeselected] = useState<Set<string>>(new Set());
  const [showAiSortBanner, setShowAiSortBanner] = useState(false);
  const [showManualSortBanner, setShowManualSortBanner] = useState(false);
  // Hide not-yet-shipped "coming soon" features on iOS (Apple Guideline 2.3.1).
  // Set post-mount to avoid an SSR/client hydration mismatch.
  const [hideComingSoon, setHideComingSoon] = useState(false);
  useEffect(() => { setHideComingSoon(isIOS()); }, []);
  const [visibleMemCount, setVisibleMemCount] = useState(50);
  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "alpha" | "type">(() => {
    if (typeof window !== "undefined") { const v = localStorage.getItem("librarySortMode"); if (v === "newest" || v === "oldest" || v === "alpha" || v === "type") return v; }
    return "newest";
  });
  const [selectedMemIds, setSelectedMemIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [draggingMemId, setDraggingMemId] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [batchTagInput, setBatchTagInput] = useState("");
  const [showBatchTag, setShowBatchTag] = useState(false);
  const [detailPanelMem, setDetailPanelMem] = useState<{ mem: Mem; wingId: string; roomId: string } | null>(null);
  const [mediaPlayerIndex, setMediaPlayerIndex] = useState<number | null>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [spotlightTarget, setSpotlightTarget] = useState<string | null>(null);
  const spotlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // "Pick a photo to restore" hint, shown when the Atrium restore tile navigates here.
  const [restoreHint, setRestoreHint] = useState(false);

  // Deep-link from MemoryMap (or other sources) → navigate to wing/room/memory
  const libraryTarget = usePalaceStore((s) => s.libraryTarget);
  const setLibraryTarget = usePalaceStore((s) => s.setLibraryTarget);
  useEffect(() => {
    if (!libraryTarget) return;
    const { wingId, roomId, memoryId } = libraryTarget;
    setLibraryTarget(null); // consume once
    setSelectedWing(wingId);
    setSelectedRoom(roomId);
    if (memoryId) {
      // Open memory detail after a brief delay to let the room load
      fetchRoomMemories(roomId).then(() => {
        const mems = useMemoryStore.getState().userMems[roomId] || [];
        const mem = mems.find((m: Mem) => m.id === memoryId);
        if (mem) setDetailMem({ mem, wingId, roomId });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryTarget]);

  // Loading state when entering a room: 300ms skeleton floor, but hold while
  // the room's memories are still in flight (cap 1.5s) so a slow fetch never
  // flashes the false "this room is empty" state.
  const roomFetched = !selectedRoom || userMems[selectedRoom] !== undefined;
  useEffect(() => {
    if (!selectedRoom) { setRoomLoading(false); return; }
    setRoomLoading(true);
    const timer = setTimeout(() => setRoomLoading(false), roomFetched ? 300 : 1500);
    return () => clearTimeout(timer);
  }, [selectedRoom, roomFetched]);

  // Persist viewMode to localStorage (P1 #11)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("libraryViewMode", viewMode);
    }
  }, [viewMode]);
  useEffect(() => { try { localStorage.setItem("librarySortMode", sortMode); } catch { /* full */ } }, [sortMode]);

  // Read spotlight flag from Atrium CTA navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = localStorage.getItem("mp_spotlight_target");
    if (target) {
      localStorage.removeItem("mp_spotlight_target");
      // Map Atrium spotlight IDs to toolbar button keys
      const spotlightMap: Record<string, string> = {
        "ai-enhance": "restorePhoto",
        "write-stories": "writeStory",
        "organize": "addLocation",
        "import-upload": "importUpload",
        "import-cloud": "importUpload",
        "time-capsule": "timeCapsule",
      };
      const mapped = spotlightMap[target] || target;
      // Small delay to let the Library UI render first
      const timer = setTimeout(() => setSpotlightTarget(mapped), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-dismiss spotlight after 5 seconds
  useEffect(() => {
    if (!spotlightTarget) return;
    spotlightTimeoutRef.current = setTimeout(() => setSpotlightTarget(null), 5000);
    return () => {
      if (spotlightTimeoutRef.current) clearTimeout(spotlightTimeoutRef.current);
    };
  }, [spotlightTarget]);

  const handleAiSort = useCallback(() => {
    setShowAiSortBanner(true);
    setShowManualSortBanner(false);
  }, []);

  const handleCloudProvider = useCallback(async (provider: string, targetRoomId?: string | null) => {
    setShowImportHub(false);
    // ImportHub's Destination selector wins; fall back to the open room.
    const importRoom = targetRoomId || selectedRoom;
    setCloudImportRoom(importRoom);

    // Google Photos uses the Picker API (popup/tab flow) instead of CloudBrowser
    if (provider === "google_photos") {
      // Refuse BEFORE sending the user through the external picker — the
      // "no room" error used to surface only after they finished picking.
      if (!importRoom) {
        setPickerError(t("googlePhotosPickerNoRoom"));
        setPickerStatus("error");
        return;
      }
      setPickerStatus("opening");
      setPickerError("");
      try {
        // 1. Create picker session
        const sessionRes = await fetch("/api/integrations/google/picker/session", { method: "POST" });
        if (!sessionRes.ok) {
          const err = await sessionRes.json().catch(() => ({ error: t("gpConnectionFailed") }));
          if (sessionRes.status === 404) {
            window.location.href = "/api/integrations/google/connect";
            return;
          }
          setPickerError(err.error || t("gpOpenFailed"));
          setPickerStatus("error");
          return;
        }
        const { sessionId, pickerUri: uri } = await sessionRes.json();

        // Save session to localStorage so we can resume if page reloads
        localStorage.setItem("gphoto_picker_session", JSON.stringify({
          sessionId, roomId: importRoom, ts: Date.now(),
        }));

        // 2. Show picker link in overlay — user opens it themselves
        setPickerUri(uri);
        setPickerStatus("waiting");

        // 3. Start polling
        startPickerPolling(sessionId, importRoom);
      } catch (err) {
        setPickerError(err instanceof Error ? err.message : t("gpUnknownError"));
        setPickerStatus("error");
      }
      return;
    }

    setCloudBrowserProvider(provider);
  }, [selectedRoom, fetchRoomMemories, t]);

  // Picker polling logic — extracted so it can be called on mount (resume) and on click
  const startPickerPolling = useCallback((sessionId: string, roomId: string | null) => {
    if (pickerPollRef.current) clearInterval(pickerPollRef.current);
    const maxPollTime = Date.now() + 10 * 60 * 1000;
    pickerPollRef.current = setInterval(async () => {
      if (Date.now() > maxPollTime) {
        clearInterval(pickerPollRef.current!);
        pickerPollRef.current = null;
        localStorage.removeItem("gphoto_picker_session");
        setPickerStatus("idle");
        return;
      }
      // Poll — swallow transient network errors so polling continues
      let pollData: { mediaItemsSet?: boolean };
      try {
        const pollRes = await fetch(`/api/integrations/google/picker/poll?sessionId=${sessionId}`);
        if (!pollRes.ok) return;
        pollData = await pollRes.json();
      } catch {
        return; // Transient poll error — retry next interval
      }
      if (!pollData.mediaItemsSet) return;

      // User finished selecting — stop polling and import
      clearInterval(pickerPollRef.current!);
      pickerPollRef.current = null;
      localStorage.removeItem("gphoto_picker_session");
      setPickerStatus("importing");

      try {
        const itemsRes = await fetch(`/api/integrations/google/picker/items?sessionId=${sessionId}`);
        if (!itemsRes.ok) {
          const errBody = await itemsRes.json().catch(() => ({ error: `HTTP ${itemsRes.status}` }));
          setPickerError(errBody.error || `Failed (${itemsRes.status})`);
          setPickerStatus("error");
          return;
        }
        const { items } = await itemsRes.json();
        if (!items || items.length === 0) {
          setPickerStatus("idle");
          return;
        }

        const targetRoom = roomId;
        if (!targetRoom) {
          setPickerError(t("googlePhotosPickerNoRoom"));
          setPickerStatus("error");
          return;
        }
        const importRes = await fetch("/api/integrations/google/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaItems: items, roomId: targetRoom }),
        });
        const importData = await importRes.json().catch(() => null);
        if (!importRes.ok) {
          setPickerError(importData?.error || t("gpImportFailed"));
          setPickerStatus("error");
          return;
        }
        const succeeded = importData?.summary?.succeeded ?? items.length;
        const failedResults = (importData?.results || []).filter((r: { success: boolean }) => !r.success);
        if (succeeded === 0 && failedResults.length > 0) {
          setPickerError(failedResults.map((r: { error?: string }) => r.error).join(", "));
          setPickerStatus("error");
          return;
        }
        await fetchRoomMemories(targetRoom);
        setPickerImportCount(succeeded);
        setPickerStatus("done");
      } catch (err) {
        console.error("[Google Picker] Import/refresh error:", err);
        setPickerError(err instanceof Error ? err.message : t("gpImportFailed"));
        setPickerStatus("error");
      }
    }, 3000);
  }, [t, fetchRoomMemories]);

  // On mount: resume polling if there's a pending picker session (user navigated away and back)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("gphoto_picker_session");
      if (!saved) return;
      const { sessionId, roomId, ts } = JSON.parse(saved);
      // Only resume if session is fresh AND has a target room — a roomless
      // session can only end in the "no room" error after picking.
      if (Date.now() - ts > 10 * 60 * 1000 || !roomId) {
        localStorage.removeItem("gphoto_picker_session");
        return;
      }
      setPickerStatus("waiting");
      startPickerPolling(sessionId, roomId);
    } catch {
      localStorage.removeItem("gphoto_picker_session");
    }
  }, [startPickerPolling]);

  // Cleanup picker polling on unmount
  useEffect(() => {
    return () => {
      if (pickerPollRef.current) clearInterval(pickerPollRef.current);
    };
  }, []);

  // Helper: read file as data URL with timeout (prevents Samsung browser hangs)
  const readFileWithTimeout = useCallback((file: File, timeoutMs: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const timer = setTimeout(() => {
        reader.abort();
        reject(new Error("FileReader timeout"));
      }, timeoutMs);
      reader.onload = () => { clearTimeout(timer); resolve(reader.result as string); };
      reader.onerror = () => { clearTimeout(timer); reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleImportFiles = useCallback(async (files: QueuedFile[], explicitRoomId?: string) => {
    // Prefer explicit room from import selector; fall back to current selection
    let targetRoom = explicitRoomId || selectedRoom;
    if (!targetRoom) {
      const rooms = selectedWing === "__all__" ? wings.flatMap(w => getWingRooms(w.id)) : getWingRooms(selectedWing);
      if (rooms.length > 0) {
        targetRoom = rooms[0].id;
      } else {
        return;
      }
    }
    if (targetRoom !== selectedRoom) {
      // Align the wing scope with the room's real wing (roomWingMap isn't
      // declared yet at this point in the component, so resolve inline).
      const targetWing = wings.find(w => getWingRooms(w.id).some(r => r.id === targetRoom))?.id;
      if (targetWing && targetWing !== selectedWing) setSelectedWing(targetWing);
      setSelectedRoom(targetRoom);
      await fetchRoomMemories(targetRoom);
    }
    for (const item of files) {
      const isVideo = item.type.startsWith("video/") || /\.(mp4|mov|webm|3gp)$/i.test(item.name);
      const isAudio = item.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg)$/i.test(item.name);
      const isImage = !isVideo && !isAudio;
      let dataUrl = item.url || "";

      let directFilePath: string | null = null;
      let directStorageBackend: string | null = null;
      let directEventDate: string | null = null;
      if (item.file) {
        try {
          if ((isVideo || isAudio) && item.file.size > 0) {
            // Upload video/audio directly via FormData — base64 is too large for mobile
            const formData = new FormData();
            formData.append("file", item.file, item.name);
            formData.append("bucket", "memories");
            const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              dataUrl = uploadData.url;
              directFilePath = uploadData.path;
              directStorageBackend = uploadData.storageBackend;
              directEventDate = uploadData.eventDate || null;
            } else {
              // Fallback: read as data URL (works on desktop, may fail on mobile for large files)
              dataUrl = await readFileWithTimeout(item.file, 15000);
            }
          } else if (isImage && item.file.size > 2 * 1024 * 1024) {
            // Compress large images via canvas to max 1600px, quality 0.82
            try {
              dataUrl = await new Promise<string>((resolve, reject) => {
                const img = new window.Image();
                const blobUrl = URL.createObjectURL(item.file!);
                img.onload = () => {
                  try {
                    const maxDim = 1600;
                    let w = img.naturalWidth, h = img.naturalHeight;
                    if (w > maxDim || h > maxDim) {
                      const ratio = Math.min(maxDim / w, maxDim / h);
                      w = Math.round(w * ratio);
                      h = Math.round(h * ratio);
                    }
                    const canvas = document.createElement("canvas");
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) { reject(new Error("no canvas")); return; }
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL("image/jpeg", 0.82));
                  } finally {
                    URL.revokeObjectURL(blobUrl);
                  }
                };
                img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error("img load")); };
                img.src = blobUrl;
              });
            } catch {
              // Canvas failed (e.g. HEIC) — read as-is with timeout
              dataUrl = await readFileWithTimeout(item.file, 15000);
            }
          } else {
            // Small images: read as data URL with timeout
            dataUrl = await readFileWithTimeout(item.file, 15000);
          }
        } catch {
          // Last resort: try direct upload via FormData
          if (item.file) {
            try {
              const formData = new FormData();
              formData.append("file", item.file, item.name);
              formData.append("bucket", "memories");
              const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
              if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                dataUrl = uploadData.url;
                directFilePath = uploadData.path;
                directStorageBackend = uploadData.storageBackend;
                directEventDate = uploadData.eventDate || null;
              }
            } catch { /* give up */ }
          }
        }
      } else if (item.previewUrl) {
        dataUrl = item.previewUrl;
      }
      await addMemory(targetRoom, {
        id: `import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title: item.name,
        hue: Math.floor(Math.random() * 360), s: 50, l: 70,
        type: isVideo ? "video" : isAudio ? "audio" : "photo",
        dataUrl,
        desc: "",
        createdAt: new Date().toISOString(),
        ...(directFilePath ? { _filePath: directFilePath, _storageBackend: directStorageBackend } : {}),
        ...(directEventDate ? { _eventDate: directEventDate } : {}),
      });
    }
  }, [selectedRoom, selectedWing, wings, getWingRooms, fetchRoomMemories, addMemory, readFileWithTimeout]);

  const wingRooms = useMemo(() => {
    if (selectedWing === "__all__") {
      return wings.flatMap(w => getWingRooms(w.id));
    }
    return getWingRooms(selectedWing);
  }, [selectedWing, wings, getWingRooms]);
  // Fetch memories for all rooms of the selected wing on wing CHANGE — the
  // mount is covered by the single fetchAllRoomMemories sweep below.
  const wingRoomIds = wingRooms.map(r => r.id).join(",");
  const didMountSweep = useRef(false);
  useEffect(() => {
    if (!didMountSweep.current) { didMountSweep.current = true; return; }
    for (const id of wingRoomIds.split(",")) {
      if (id) fetchRoomMemories(id);
    }
  }, [wingRoomIds, fetchRoomMemories]);

  // One request for the whole palace on mount (was 2 requests PER ROOM:
  // the wing sweep + a per-room prefetch loop).
  useEffect(() => {
    fetchAllRoomMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get memories for a room. Demo visibility flows through React state so
  // "Clear examples" takes effect immediately (not on the next remount).
  const getMemsForRoom = useCallback((roomId: string): Mem[] => {
    return userMems[roomId] || (showDemos ? getDemoMems(roomId) : []);
  }, [userMems, showDemos]);

  // All memories across selected wing
  const allWingMems = useMemo(() => {
    return wingRooms.flatMap(r => getMemsForRoom(r.id));
  }, [wingRooms, getMemsForRoom]);

  // Every memory across the whole palace + a memId -> {roomId, wingId} index.
  // Powers the unified "Il Muro" wall (default entry) and scope-agnostic reliving.
  const libAllMems = useMemo(() => {
    const out: Mem[] = [];
    for (const w of wings) for (const r of getWingRooms(w.id)) out.push(...getMemsForRoom(r.id));
    return out;
  }, [wings, getWingRooms, getMemsForRoom]);
  const libYears = useMemo(() => {
    const ys = new Set<string>();
    for (const m of libAllMems) { const r = m.createdAt || (m as { date?: string }).date; if (r) { const y = new Date(r).getFullYear(); if (!Number.isNaN(y)) ys.add(String(y)); } }
    return [...ys].sort((a, b) => b.localeCompare(a));
  }, [libAllMems]);
  const memRoomMap = useMemo(() => {
    const m = new Map<string, { roomId: string; wingId: string }>();
    for (const w of wings) for (const r of getWingRooms(w.id)) for (const mem of getMemsForRoom(r.id)) m.set(mem.id, { roomId: r.id, wingId: w.id });
    return m;
  }, [wings, getWingRooms, getMemsForRoom]);

  // Filtered memories
  const q = query.toLowerCase();

  // ONE shared search predicate + ONE shared narrowing predicate, so the room
  // wall, the All-Memories wall and the cross-wing results always agree on
  // what matches (and every count shows the same number).
  const matchesQuery = useCallback((m: Mem) => (
    m.title.toLowerCase().includes(q)
    || (m.desc || "").toLowerCase().includes(q)
    || (m.locationName || "").toLowerCase().includes(q)
    || (m.historicalContext || "").toLowerCase().includes(q)
    || m.type.toLowerCase().includes(q)
  ), [q]);
  const matchesFilters = useCallback((m: Mem) => {
    if (filterType && normalizeDisplayType(m.type) !== filterType) return false;
    if (facet === "place" && !m.locationName) return false;
    if (facet === "described" && !((m.desc || "").trim() || m.historicalContext)) return false;
    if (facet === "onthisday") {
      // month+day match in a PAST year — today's uploads are not anniversaries
      const raw = memDate(m);
      if (!raw) return false;
      const d = new Date(raw), now = new Date();
      if (Number.isNaN(d.getTime()) || d.getMonth() !== now.getMonth() || d.getDate() !== now.getDate() || d.getFullYear() === now.getFullYear()) return false;
    }
    if (filterYear) {
      const raw = memDate(m);
      if (!raw || String(new Date(raw).getFullYear()) !== filterYear) return false;
    }
    return true;
  }, [filterType, facet, filterYear]);

  const filteredRoomMems = useMemo(() => {
    // Base scope: a selected room, else the whole library on "__all__", else
    // empty (a specific wing with no room falls through to the room overview).
    let mems: Mem[];
    if (selectedRoom) mems = getMemsForRoom(selectedRoom);
    else if (selectedWing === "__all__") mems = libAllMems;
    else mems = allWingMems; // a wing shows a wall of ALL its media
    if (q) mems = mems.filter(matchesQuery);
    mems = mems.filter(matchesFilters);
    // Sort (P1 #7)
    mems = [...mems].sort((a, b) => {
      switch (sortMode) {
        case "newest": return memDate(b).localeCompare(memDate(a));
        case "oldest": return memDate(a).localeCompare(memDate(b));
        case "alpha": return a.title.localeCompare(b.title) || memDate(b).localeCompare(memDate(a));
        case "type": return normalizeDisplayType(a.type).localeCompare(normalizeDisplayType(b.type)) || memDate(b).localeCompare(memDate(a));
        default: return 0;
      }
    });
    return mems;
  }, [selectedRoom, selectedWing, libAllMems, allWingMems, getMemsForRoom, q, matchesQuery, matchesFilters, sortMode]);

  // Backfill missing video thumbnails for the selected room (background, throttled)
  const backfillRoomOf = useCallback((id: string) => memRoomMap.get(id)?.roomId || null, [memRoomMap]);
  useThumbnailBackfill(selectedRoom, filteredRoomMems, backfillRoomOf);

  // Cross-wing search results
  const crossWingResults = useMemo(() => {
    if (!q || selectedRoom || selectedWing === "__all__") return null;
    const results: { wing: Wing; room: WingRoom; mem: Mem }[] = [];
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        const mems = getMemsForRoom(r.id);
        for (const m of mems) {
          // Same predicates as the wall — active type/facet/year filters compound
          if (matchesQuery(m) && matchesFilters(m)) {
            results.push({ wing: w, room: r, mem: m });
          }
        }
      }
    }
    return results.length > 0 ? results : null;
  }, [q, selectedRoom, selectedWing, wings, getWingRooms, getMemsForRoom, matchesQuery, matchesFilters]);

  // ── Warmth per wing (ports src/lib/warmth.ts): the sidebar seals glow by
  //    recency — quiet / ember / candlelit — like the Atrium board. ──
  const wingWarmth = useMemo(() => {
    const out: Record<string, 0 | 1 | 2> = {};
    for (const w of wings) {
      const dates: string[] = [];
      for (const r of getWingRooms(w.id)) {
        for (const m of getMemsForRoom(r.id)) {
          const d = m.createdAt || (m as { date?: string }).date;
          if (d) dates.push(d);
        }
      }
      out[w.id] = computeWarmthLevel(dates);
    }
    return out;
  }, [wings, getWingRooms, getMemsForRoom]);

  // ── "On This Day": memories whose month+day match today (year differs). A
  //    gilt resurfacing strip — the Library's emotional pull to come back. ──
  const onThisDayMems = useMemo(() => {
    const now = new Date();
    const mo = now.getMonth(), da = now.getDate(), yr = now.getFullYear();
    const out: { mem: Mem; wing: Wing; room: WingRoom; yearsAgo: number }[] = [];
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        // Demo/sample memories must never masquerade as personal anniversaries
        const mems = userMems[r.id];
        if (!mems) continue;
        for (const m of mems) {
          const raw = m.createdAt || (m as { date?: string }).date;
          if (!raw) continue;
          const d = new Date(raw);
          if (Number.isNaN(d.getTime())) continue;
          if (d.getMonth() === mo && d.getDate() === da && d.getFullYear() !== yr) {
            out.push({ mem: m, wing: w, room: r, yearsAgo: yr - d.getFullYear() });
          }
        }
      }
    }
    return out.sort((a, b) => a.yearsAgo - b.yearsAgo).slice(0, 8);
  }, [wings, getWingRooms, userMems]);

  // Get unique types in room for filter chips + counts
  const roomTypes = useMemo(() => {
    if (!selectedRoom) return [];
    const mems = getMemsForRoom(selectedRoom);
    return [...new Set(mems.map(m => normalizeDisplayType(m.type)))];
  }, [selectedRoom, getMemsForRoom]);

  // Result count for search badge
  const searchResultCount = useMemo(() => {
    if (!query) return undefined;
    // Room scope and the default All-Memories wall both render
    // filteredRoomMems — count what's actually on screen.
    if (selectedRoom || selectedWing === "__all__") return filteredRoomMems.length;
    if (crossWingResults) return crossWingResults.length;
    return 0;
  }, [query, selectedRoom, selectedWing, filteredRoomMems, crossWingResults]);

  // Wing memory count
  const wingMemCount = useCallback((wingId: string) => {
    return getWingRooms(wingId).reduce((sum, r) => sum + (getMemsForRoom(r.id)).length, 0);
  }, [getWingRooms, getMemsForRoom]);

  const currentWing = wings.find(w => w.id === selectedWing) || wings[0];

  // Header accent — wing identity colour ("all" scope uses the ember glyph).
  const headerAccent = selectedWing === "__all__" ? "#9A4F2A" : currentWing.accent;

  // Map room IDs to their parent wing ID (needed when selectedWing === "__all__")
  const roomWingMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        map[r.id] = w.id;
      }
    }
    return map;
  }, [wings, getWingRooms]);

  // Changing scope exits select mode — a stale selection otherwise hijacks
  // wall clicks and points bulk actions at the wrong (or no) room.
  useEffect(() => {
    setSelectMode(false);
    setSelectedMemIds(new Set());
    setShowBatchTag(false);
  }, [selectedRoom, selectedWing]);

  // Prune the selection when filters narrow the view — bulk actions must
  // never act on memories the user can no longer see.
  useEffect(() => {
    setSelectedMemIds(prev => {
      if (prev.size === 0) return prev;
      const visible = new Set(filteredRoomMems.map(m => m.id));
      const next = new Set([...prev].filter(id => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredRoomMems]);

  // The wall is the only view outside a room — a persisted timeline choice
  // must never strand the default All-Memories scope where the toggle is hidden.
  const effectiveView = selectedRoom ? viewMode : "grid";

  // Stable PhotoWall props: PhotoWall is React.memo'd, so inline lambdas
  // would defeat it and re-pack the wall on every unrelated render.
  const tileAccentOf = useCallback((id: string) => { const wid = memRoomMap.get(id)?.wingId; return wid ? (wings.find(w => w.id === wid)?.accent || null) : null; }, [memRoomMap, wings]);
  const roomLabelOf = useCallback((id: string) => { const rid = memRoomMap.get(id)?.roomId; if (!rid) return t("undated") !== "undated" ? t("undated") : "Undated"; const wid = memRoomMap.get(id)?.wingId; const r = wid ? getWingRooms(wid).find(rr => rr.id === rid) : null; return r ? translateRoomName(r, tWings) : rid; }, [memRoomMap, getWingRooms, t, tWings]);
  const toggleSelectMem = useCallback((id: string) => setSelectedMemIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }), []);
  const openMediaAt = useCallback((i: number) => setMediaPlayerIndex(i), []);
  // Dates follow the app locale (mp_locale), not the browser locale
  const monthLabelOf = useCallback((d: Date) => d.toLocaleDateString(locale, { month: "long", year: "numeric" }), [locale]);
  const countLabelOf = useCallback((n: number) => t(n === 1 ? "memoryCountOne" : "memoryCount", { count: `${n}` }), [t]);
  const handleTileDragEnd = useCallback(() => setDraggingMemId(null), []);

  // "Stored in" provenance for the fullscreen viewer: Wing › Room + accent
  const storedInOf = useCallback((memId: string) => {
    const loc = memRoomMap.get(memId);
    if (!loc) return null;
    const w = wings.find(x => x.id === loc.wingId);
    const r = w ? getWingRooms(w.id).find(rr => rr.id === loc.roomId) : null;
    if (!w || !r) return null;
    return {
      wing: w.id === "attic" ? t("storageRoom") : translateWingName(w, tWings),
      room: translateRoomName(r, tWings),
      accent: w.accent,
    };
  }, [memRoomMap, wings, getWingRooms, t, tWings]);

  // The fullest room — target when a room-scoped tool is invoked from the
  // unified All-Memories wall (tool panels need a room to work in).
  const pickFullestRoom = useCallback((): string | null => {
    let best: string | null = null, bestCount = -1;
    for (const w of wings) for (const r of getWingRooms(w.id)) {
      const c = getMemsForRoom(r.id).length;
      if (c > bestCount) { bestCount = c; best = r.id; }
    }
    return best;
  }, [wings, getWingRooms, getMemsForRoom]);

  // Room-scoped spotlight targets (AI label / write story / location):
  // auto-enter the fullest room so the Atrium CTA lands on a live control.
  useEffect(() => {
    if (!spotlightTarget || selectedRoom) return;
    if (spotlightTarget === "aiLabel" || spotlightTarget === "writeStory" || spotlightTarget === "addLocation" || spotlightTarget === "restorePhoto") {
      const best = pickFullestRoom();
      if (best) {
        if (roomWingMap[best]) setSelectedWing(roomWingMap[best]);
        setSelectedRoom(best);
      }
    }
  }, [spotlightTarget, selectedRoom, pickFullestRoom, roomWingMap]);

  // Restore-photo spotlight has no toolbar pill — surface a "pick a photo" hint instead.
  useEffect(() => {
    if (spotlightTarget !== "restorePhoto") return;
    setRestoreHint(true);
    const timer = setTimeout(() => setRestoreHint(false), 6000);
    return () => clearTimeout(timer);
  }, [spotlightTarget]);

  const { setShowSharedWithMe } = useUIPanelStore();
  const globalShowImportHub = useUIPanelStore((s) => s.showImportHub);
  const setGlobalShowImportHub = useUIPanelStore((s) => s.setShowImportHub);

  // Open ImportHub when triggered from another view (e.g. 3D palette)
  useEffect(() => {
    if (globalShowImportHub) {
      setShowImportHub(true);
      setGlobalShowImportHub(false);
    }
  }, [globalShowImportHub, setGlobalShowImportHub]);

  const sharedCount = useMemo(() => {
    let count = 0;
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        if (r.shared) count++;
      }
    }
    return count;
  }, [wings, getWingRooms]);

  const sharedWingsData = useMemo(() => {
    const result: { wingName: string; rooms: { id: string; name: string; icon: string }[] }[] = [];
    for (const w of wings) {
      const sharedRooms = getWingRooms(w.id).filter(r => r.shared);
      if (sharedRooms.length > 0) {
        result.push({
          wingName: translateWingName(w, tWings),
          rooms: sharedRooms.map(r => ({ id: r.id, name: translateRoomName(r, tWings), icon: r.icon })),
        });
      }
    }
    return result;
  }, [wings, getWingRooms, tWings]);

  // One shared close for the tool panels (Escape, ✕, scope change). Bumping
  // the run id orphans any in-flight AI-label loop so a closed panel can
  // never keep spending API calls or resurrect stale "Done!" state.
  const closeToolPanel = useCallback(() => {
    aiLabelRunRef.current++;
    setActiveToolPanel(null);
    setAiLabelProcessing(false);
    setAiLabelSelected(new Set());
    setAiLabelResults({});
    setAiLabelProgress(null);
    setAiLabelError(null);
    setAiLabelDone(false);
    setAiLabelEditing(null);
    // Add-Location state resets with the panel (any close path)
    setLocQuery("");
    setLocSuggestions([]);
    setLocPicked(null);
    setLocActiveIdx(-1);
    setLocDeselected(new Set());
  }, []);

  // Add-Location autocomplete: debounce ~350ms against the geocode proxy. A
  // picked suggestion whose label still matches the input needs no re-query.
  useEffect(() => {
    if (activeToolPanel !== "addLocation") return;
    const q = locQuery.trim();
    if (q.length < 2 || (locPicked && q === locPicked.label)) {
      setLocSuggestions([]);
      setLocActiveIdx(-1);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const results = await geocodeAutocomplete(q);
      if (!cancelled) {
        setLocSuggestions(results.slice(0, 5));
        setLocActiveIdx(-1);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [locQuery, locPicked, activeToolPanel]);

  const handleBackToRooms = useCallback(() => {
    setSelectedRoom(null);
    setQuery("");
    setFilterType(null);
    setVisibleMemCount(50);
    closeToolPanel();
  }, [closeToolPanel]);

  // Keyboard: Escape closes the topmost surface first
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Text fields cancel their own edit on Escape — never hijack it
      const el = e.target as HTMLElement | null;
      if (el && (el.closest?.("input, textarea, select") || el.isContentEditable)) return;
      if (toolRoomPicker) setToolRoomPicker(null);
      else if (capsulePickerOpen) setCapsulePickerOpen(false);
      else if (showImportHub) setShowImportHub(false);
      else if (cloudBrowserProvider) setCloudBrowserProvider(null);
      else if (pickerStatus !== "idle") { setPickerStatus("idle"); if (pickerPollRef.current) { clearInterval(pickerPollRef.current); pickerPollRef.current = null; } }
      else if (showPublishModal) setShowPublishModal(false);
      else if (activeToolPanel) closeToolPanel();
      else if (bulkMoving) { setBulkMoving(false); setExpandedMoveWing(null); }
      else if (mediaPlayerIndex !== null) setMediaPlayerIndex(null);
      else if (detailPanelMem) setDetailPanelMem(null);
      else if (movingMem) setMovingMem(null);
      else if (detailMem) setDetailMem(null);
      else if (showUploadFor) setShowUploadFor(null);
      else if (mobileSortOpen) setMobileSortOpen(false);
      else if (selectMode) { setSelectMode(false); setSelectedMemIds(new Set()); setShowBatchTag(false); }
      else if (selectedRoom) handleBackToRooms();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toolRoomPicker, capsulePickerOpen, showImportHub, cloudBrowserProvider, pickerStatus, showPublishModal, activeToolPanel, closeToolPanel, bulkMoving, mediaPlayerIndex, detailPanelMem, movingMem, detailMem, showUploadFor, mobileSortOpen, selectMode, selectedRoom, handleBackToRooms]);

  const handleAddMemory = useCallback((mem: Mem) => {
    if (showUploadFor) {
      addMemory(showUploadFor.roomId, mem);
    }
  }, [showUploadFor, addMemory]);

  const handleUpdateMemory = useCallback((memId: string, updates: Partial<Mem>) => {
    if (detailMem) {
      updateMemory(detailMem.roomId, memId, updates);
    }
  }, [detailMem, updateMemory]);

  const handleDeleteMemory = useCallback((memId: string) => {
    if (detailMem) {
      deleteMemory(detailMem.roomId, memId);
      setDetailMem(null);
    }
  }, [detailMem, deleteMemory]);

  const handleMoveToRoom = useCallback((targetRoomId: string) => {
    if (!movingMem) return;
    moveMemory(movingMem.fromRoom, targetRoomId, movingMem.mem.id);
    setMovingMem(null);
    setExpandedMoveWing(null);
    showMovedToast();
  }, [movingMem, moveMemory]);

  // Drag & drop: tile → sidebar room. Source room comes from memRoomMap so it
  // works from the unified wall, a wing wall or a room wall alike.
  const handleTileDragStart = useCallback((memId: string) => {
    setDraggingMemId(memId);
    setSidebarCollapsed(false);
  }, []);

  const handleDropMemory = useCallback((roomId: string, memId: string) => {
    setDraggingMemId(null);
    const from = memRoomMap.get(memId)?.roomId;
    if (!from || from === roomId) return;
    moveMemory(from, roomId, memId);
    showMovedToast();
  }, [memRoomMap, moveMemory]);

  // ── Touch drag & drop: PhotoWall long-press lifts a tile and streams
  //    coordinates here; a fixed bottom DROP TRAY of room chips renders for
  //    the duration, hit-tested via elementFromPoint (rAF-throttled on move).
  const [touchDragMemId, setTouchDragMemId] = useState<string | null>(null);
  const [touchHoverRoomId, setTouchHoverRoomId] = useState<string | null>(null);
  const [dragHintVisible, setDragHintVisible] = useState(false);
  const dragHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (dragHintTimerRef.current) clearTimeout(dragHintTimerRef.current); }, []);
  const touchHitRafRef = useRef(0);
  useEffect(() => () => { if (touchHitRafRef.current) cancelAnimationFrame(touchHitRafRef.current); }, []);

  // Edge-auto-scroll for the drop tray: during a one-finger drag the user has
  // no finger free to scroll the tray, so holding the finger near the tray's
  // top/bottom edge scrolls it via a rAF loop (move events stop when the
  // finger holds still, so the loop must self-sustain while in the zone).
  const trayScrollRef = useRef<HTMLDivElement | null>(null);
  const edgeScrollRafRef = useRef(0);
  const lastTouchPosRef = useRef({ x: -1, y: -1 });
  const stopEdgeScroll = useCallback(() => {
    if (edgeScrollRafRef.current) { cancelAnimationFrame(edgeScrollRafRef.current); edgeScrollRafRef.current = 0; }
  }, []);
  useEffect(() => stopEdgeScroll, [stopEdgeScroll]);
  const edgeScrollTick = useCallback(function tick() {
    edgeScrollRafRef.current = 0;
    const tray = trayScrollRef.current;
    const { x, y } = lastTouchPosRef.current;
    if (!tray || y < 0) return;
    const rect = tray.getBoundingClientRect();
    const EDGE = 40; // px activation zone at each edge
    let dy = 0;
    if (y > rect.top - 12 && y < rect.top + EDGE) dy = -7;
    else if (y > rect.bottom - EDGE && y < rect.bottom + 12) dy = 7;
    if (dy !== 0) {
      const before = tray.scrollTop;
      tray.scrollTop = before + dy;
      // Content moved under the stationary finger — refresh the chip highlight
      if (tray.scrollTop !== before) setTouchHoverRoomId(dropRoomIdAt(x, y));
      edgeScrollRafRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const handleTouchDragStart = useCallback((memId: string) => {
    setTouchDragMemId(memId);
    // First long-press of the session: transient "drop it on a room" hint
    try {
      if (!sessionStorage.getItem("mp_drag_hint_shown")) {
        sessionStorage.setItem("mp_drag_hint_shown", "1");
        setDragHintVisible(true);
        if (dragHintTimerRef.current) clearTimeout(dragHintTimerRef.current);
        dragHintTimerRef.current = setTimeout(() => setDragHintVisible(false), 3200);
      }
    } catch { /* private mode */ }
  }, []);

  const handleTouchDragMove = useCallback((x: number, y: number) => {
    lastTouchPosRef.current = { x, y };
    // Kick the edge-scroll loop if the finger is in a tray edge zone
    if (!edgeScrollRafRef.current) edgeScrollRafRef.current = requestAnimationFrame(edgeScrollTick);
    if (touchHitRafRef.current) return; // rAF-throttled chip highlight
    touchHitRafRef.current = requestAnimationFrame(() => {
      touchHitRafRef.current = 0;
      setTouchHoverRoomId(dropRoomIdAt(x, y));
    });
  }, [edgeScrollTick]);

  const handleTouchDragEnd = useCallback((x: number, y: number) => {
    if (touchHitRafRef.current) { cancelAnimationFrame(touchHitRafRef.current); touchHitRafRef.current = 0; }
    stopEdgeScroll();
    lastTouchPosRef.current = { x: -1, y: -1 };
    const roomId = dropRoomIdAt(x, y);
    if (roomId && touchDragMemId) handleDropMemory(roomId, touchDragMemId);
    // ALWAYS clear drag state, hit or miss or cancel
    setTouchDragMemId(null);
    setTouchHoverRoomId(null);
  }, [touchDragMemId, handleDropMemory, stopEdgeScroll]);

  const handleBulkMoveToRoom = useCallback((targetRoomId: string) => {
    if (selectedMemIds.size === 0) return;
    for (const memId of selectedMemIds) {
      // Resolve each memory's real room — works from the unified wall too
      const from = memRoomMap.get(memId)?.roomId || selectedRoom;
      if (from && from !== targetRoomId) moveMemory(from, targetRoomId, memId);
    }
    setSelectedMemIds(new Set());
    setBulkMoving(false);
    setExpandedMoveWing(null);
    setSelectMode(false);
    showMovedToast();
  }, [selectedRoom, selectedMemIds, moveMemory, memRoomMap]);

  const handleEnter3D = () => {
    setNavMode("3d");
    if (selectedRoom) {
      // Deep link: one atomic fade straight into the room (no throwaway corridor
      // mount). Resolve the room's REAL wing — selectedWing can be '__all__'
      // (unified wall) or stale relative to the room.
      const wingId = roomWingMap[selectedRoom] || (selectedWing !== "__all__" ? selectedWing : null);
      if (wingId) { enterWingRoom(wingId, selectedRoom); return; }
      enterEntrance();
    } else if (selectedWing !== "__all__") {
      enterCorridor(selectedWing);
    } else {
      // All Memories: no wing scope — enter the palace at the entrance hall
      // instead of mounting a corridor for the bogus wing id '__all__'.
      enterEntrance();
    }
  };

  return (
    <div style={{
      width: "100vw", height: "100dvh", display: "flex", flexDirection: isMobile ? "column" : "row",
      paddingTop: (isMobile || isCompact) ? "env(safe-area-inset-top, 0px)" : "4.5rem",
      // Atrium canvas: warm cream + the same time-of-day wash the home board
      // breathes with (layered background so it always sits behind content).
      background: `${TIME_WASH[libTimeOfDay]}, #FCFAF5`,
      fontFamily: T.font.body, overflow: "hidden", position: "relative",
    }}>
      <LibraryStyles />
      <TuscanStyles />
      {/* Spotlight pulse animation */}
      <style>{`@keyframes spotlightPulse{0%,100%{box-shadow:0 0 0 0.1875rem rgba(198,107,61,0.25),0 0.25rem 1rem rgba(198,107,61,0.2)}50%{box-shadow:0 0 0 0.375rem rgba(198,107,61,0.35),0 0.25rem 1rem rgba(198,107,61,0.3)}}`}</style>

      {/* ═══ WING SIDEBAR ═══ */}
      {/* Mobile: hamburger in the merged header bar below */}
      {isMobile ? (
        mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 45,
              background: "rgba(42,34,24,.4)",
              backdropFilter: "blur(0.25rem)",
              animation: "fadeIn .2s ease",
            }}
          >
            <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "min(18rem, 85vw)" }}>
              <LibrarySidebar
                wings={wings}
                selectedWing={selectedWing}
                onSelectWing={(wingId: string) => { if (selectedWing === wingId) { setSelectedWing("__all__"); } else { setSelectedWing(wingId); } setSelectedRoom(null); setMobileSidebarOpen(false); }}
                onSelectRoom={(roomId: string) => { const next = selectedRoom === roomId ? null : roomId; if (next && roomWingMap[next]) setSelectedWing(roomWingMap[next]); setSelectedRoom(next); setMobileSidebarOpen(false); }}
                selectedRoom={selectedRoom}
                wingWarmth={wingWarmth}
                wingMemCount={wingMemCount}
                onEnter3D={handleEnter3D}
                isMobile={isMobile}
                onAddWing={() => setShowWingManager(true)}
                onAddRoom={selectedWing === "__all__" ? undefined : () => setShowRoomManager(true)}
                selectedWingName={selectedWing === "__all__" ? undefined : currentWing.id === "attic" ? t("storageRoom") : translateWingName(currentWing, tWings)}
                selectedRoomName={selectedRoom ? ((() => { const r = wingRooms.find(r => r.id === selectedRoom); return r ? translateRoomName(r, tWings) : undefined; })()) : undefined}
                sharedCount={sharedCount}
                onSharedClick={() => setShowSharedWithMe(true)}
                sharedWings={sharedWingsData}
              />
            </div>
          </div>
        )
      ) : sidebarCollapsed ? (
        <button type="button" onClick={() => setSidebarCollapsed(false)} aria-label={t("expandSidebar") !== "expandSidebar" ? t("expandSidebar") : "Show wings"} title={t("expandSidebar") !== "expandSidebar" ? t("expandSidebar") : "Show wings"} style={{ flexShrink: 0, width: "2.25rem", alignSelf: "stretch", background: "transparent", border: "none", borderRight: "0.0625rem solid #E3D6BC", cursor: "pointer", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "1.5rem", color: "#716A5E" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      ) : (
        <div style={{ position: "relative", flexShrink: 0, display: "flex" }}>
        <LibrarySidebar
          wings={wings}
          selectedWing={selectedWing}
          onSelectWing={(wingId: string) => { if (selectedWing === wingId) { setSelectedWing("__all__"); } else { setSelectedWing(wingId); } setSelectedRoom(null); }}
          onSelectRoom={(roomId: string) => { const next = selectedRoom === roomId ? null : roomId; if (next && roomWingMap[next]) setSelectedWing(roomWingMap[next]); setSelectedRoom(next); }}
          selectedRoom={selectedRoom}
          wingWarmth={wingWarmth}
          wingMemCount={wingMemCount}
          onEnter3D={handleEnter3D}
          isMobile={isMobile}
          onAddWing={() => setShowWingManager(true)}
          onAddRoom={selectedWing === "__all__" ? undefined : () => setShowRoomManager(true)}
          selectedWingName={selectedWing === "__all__" ? undefined : currentWing.id === "attic" ? t("storageRoom") : translateWingName(currentWing, tWings)}
          selectedRoomName={selectedRoom ? ((() => { const r = wingRooms.find(r => r.id === selectedRoom); return r ? translateRoomName(r, tWings) : undefined; })()) : undefined}
          sharedCount={sharedCount}
          onSharedClick={() => setShowSharedWithMe(true)}
          sharedWings={sharedWingsData}
          dragActive={!!draggingMemId}
          onDropMemory={handleDropMemory}
        />
        <button type="button" onClick={() => setSidebarCollapsed(true)} aria-label={t("collapseSidebar") !== "collapseSidebar" ? t("collapseSidebar") : "Hide wings"} title={t("collapseSidebar") !== "collapseSidebar" ? t("collapseSidebar") : "Hide wings"} style={{ position: "absolute", top: "1.25rem", right: "-0.75rem", zIndex: 6, width: "1.5rem", height: "1.5rem", borderRadius: "50%", background: "#FCFAF5", border: "0.0625rem solid #E3D6BC", boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.14)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#716A5E" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        </div>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      {/* (no data-nudge here — anchoring the tutorial to the whole <main>
          highlighted the entire screen; the room bar carries its own anchor) */}
      <main style={{
        flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden", minWidth: 0,
        animation: "libFadeIn 0.4s ease both",
      }}>
        {/* Header bar */}
        {isMobile ? (
          /* ── Mobile: Wings bar → Rooms bar → Search + Sort ── */
          <>
            <style>{`.lib-mob-scroll::-webkit-scrollbar{display:none}`}</style>

            {/* ── Wings horizontal bar ── */}
            <div className="lib-mob-scroll" data-nudge="library_wing_sidebar" style={{
              display: "flex", alignItems: "center", gap: "0.375rem",
              padding: "0.375rem 0.75rem",
              overflowX: "auto", overflowY: "hidden",
              WebkitOverflowScrolling: "touch",
              whiteSpace: "nowrap",
              background: `linear-gradient(180deg, ${T.color.sandstone}18 0%, ${T.color.cream}22 100%)`,
              flexShrink: 0,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              borderBottom: `0.0625rem solid #E3D6BC`,
              // Edge-fade hint: content scrolls off horizontally (compact/mobile)
              maskImage: "linear-gradient(to right, transparent 0, #000 1.25rem, #000 calc(100% - 1.25rem), transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0, #000 1.25rem, #000 calc(100% - 1.25rem), transparent 100%)",
            }}>
              {/* "All" pill for wings */}
              {(() => {
                const isAllActive = selectedWing === "__all__";
                return (
                  <button
                    onClick={() => { setSelectedWing("__all__"); setSelectedRoom(null); }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.25rem",
                      padding: "0.375rem 0.75rem",
                      borderRadius: "1rem",
                      border: isAllActive ? `0.125rem solid ${EMBER}` : `0.0625rem solid ${T.color.cream}`,
                      background: isAllActive ? "rgba(184,92,56,0.12)" : T.color.white,
                      cursor: "pointer", flexShrink: 0,
                      minHeight: "2.125rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem",
                      fontWeight: isAllActive ? 700 : 500,
                      color: "#403B36",
                    }}>
                      {t("allRooms")}
                    </span>
                  </button>
                );
              })()}
              {wings.map((w) => {
                const isActive = w.id === selectedWing;
                return (
                  <button
                    key={w.id}
                    onClick={() => { if (selectedWing === w.id) { setSelectedWing("__all__"); setSelectedRoom(null); } else { setSelectedWing(w.id); setSelectedRoom(null); } }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.25rem",
                      padding: "0.375rem 0.75rem",
                      borderRadius: "1rem",
                      border: isActive ? `0.125rem solid ${w.accent}` : `0.0625rem solid ${T.color.cream}`,
                      background: isActive ? `${w.accent}12` : T.color.white,
                      cursor: "pointer", flexShrink: 0,
                      minHeight: "2.125rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <WingIcon wingId={w.id} size={14} color={isActive ? w.accent : "#716A5E"} />
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: isActive ? 700 : 500,
                      color: isActive ? w.accent : "#403B36",
                      whiteSpace: "nowrap",
                    }}>
                      {w.id === "attic" ? t("storageRoom") : translateWingName(w, tWings)}
                    </span>
                  </button>
                );
              })}
              {/* Shared with me pill */}
              {(sharedCount ?? 0) > 0 && (
                <button
                  onClick={() => setShowSharedWithMe(true)}
                  aria-label={`${t("sharedWithMe")} (${sharedCount})`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.25rem",
                    padding: "0.375rem 0.75rem",
                    borderRadius: "1rem",
                    border: `0.0625rem solid ${T.color.sage}55`,
                    background: `${T.color.sage}10`,
                    cursor: "pointer", flexShrink: 0,
                    minHeight: "2.125rem",
                    transition: "all 0.2s ease",
                  }}
                >
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.color.sage} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                  </svg>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                    color: T.color.sage, whiteSpace: "nowrap",
                  }}>
                    {sharedCount}
                  </span>
                </button>
              )}
              {/* Add wing pill */}
              <button
                onClick={() => setShowWingManager(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.25rem",
                  padding: "0.375rem 0.625rem",
                  borderRadius: "1rem",
                  border: `0.0625rem dashed ${"#716A5E"}55`,
                  background: "transparent",
                  cursor: "pointer", flexShrink: 0,
                  minHeight: "2.125rem",
                }}
                aria-label={t("addWingLabel")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={"#716A5E"} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
            </div>

            {/* ── Rooms horizontal bar ── */}
            <div data-nudge="library_room_bar" className="lib-mob-scroll" style={{
              display: "flex", alignItems: "center", gap: "0.375rem",
              padding: "0.375rem 0.75rem",
              overflowX: "auto", overflowY: "hidden",
              WebkitOverflowScrolling: "touch",
              whiteSpace: "nowrap",
              background: `linear-gradient(180deg, ${T.color.warmStone}18 0%, ${T.color.cream}15 100%)`,
              flexShrink: 0,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              borderBottom: `0.0625rem solid ${T.color.cream}66`,
              // Edge-fade hint: content scrolls off horizontally (compact/mobile)
              maskImage: "linear-gradient(to right, transparent 0, #000 1.25rem, #000 calc(100% - 1.25rem), transparent 100%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 0, #000 1.25rem, #000 calc(100% - 1.25rem), transparent 100%)",
            }}>
              {/* "All" pill — shows all rooms in wing */}
              <button
                onClick={() => { setSelectedRoom(null); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.25rem",
                  padding: "0.375rem 0.75rem",
                  borderRadius: "1rem",
                  border: !selectedRoom ? `0.125rem solid ${currentWing.accent}` : `0.0625rem solid ${T.color.cream}`,
                  background: !selectedRoom ? `${currentWing.accent}12` : T.color.white,
                  cursor: "pointer", flexShrink: 0,
                  minHeight: "2.125rem",
                  transition: "all 0.2s ease",
                }}
              >
                <span style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: !selectedRoom ? 700 : 500,
                  color: !selectedRoom ? currentWing.accent : "#403B36",
                }}>
                  {t("allRooms")}
                </span>
              </button>
              {wingRooms.map((room) => {
                const isActive = room.id === selectedRoom;
                return (
                  <button
                    key={room.id}
                    onClick={() => { const next = selectedRoom === room.id ? null : room.id; if (next && roomWingMap[next]) setSelectedWing(roomWingMap[next]); setSelectedRoom(next); }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.25rem",
                      padding: "0.375rem 0.75rem",
                      borderRadius: "1rem",
                      border: isActive ? `0.125rem solid ${currentWing.accent}` : `0.0625rem solid ${T.color.cream}`,
                      background: isActive ? `${currentWing.accent}12` : T.color.white,
                      cursor: "pointer", flexShrink: 0,
                      minHeight: "2.125rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <RoomGlyph room={room} size={14} color={isActive ? currentWing.accent : "#716A5E"} />
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: isActive ? 700 : 500,
                      color: isActive ? currentWing.accent : "#403B36",
                      whiteSpace: "nowrap",
                    }}>
                      {translateRoomName(room, tWings)}
                    </span>
                  </button>
                );
              })}
              {/* Add room pill — hidden on the All scope: a room needs a real
                  wing to be created in, not a silent wings[0] fallback */}
              {selectedWing !== "__all__" && (
              <button
                onClick={() => setShowRoomManager(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.25rem",
                  padding: "0.375rem 0.625rem",
                  borderRadius: "1rem",
                  border: `0.0625rem dashed ${"#716A5E"}55`,
                  background: "transparent",
                  cursor: "pointer", flexShrink: 0,
                  minHeight: "2.125rem",
                }}
                aria-label={t("addRoomLabel")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={"#716A5E"} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
              )}
            </div>

            {/* ── Search bar + sort toggle ── */}
            <div data-nudge="library_search" style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.5rem 0.75rem",
              background: `${T.color.linen}E0`,
              flexShrink: 0,
              position: "relative",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <LibrarySearch
                  query={query}
                  onQueryChange={setQuery}
                  accent={currentWing.accent}
                  resultCount={searchResultCount}
                  isMobile={isMobile}
                />
              </div>
              {/* Enter Palace button */}
              <button
                onClick={handleEnter3D}
                aria-label={t("enterPalace")}
                style={{
                  width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem",
                  border: `0.0625rem solid ${currentWing.accent}44`,
                  background: `${currentWing.accent}08`,
                  cursor: "pointer", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={currentWing.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </button>
              {/* Sort settings button */}
              <button
                onClick={() => setMobileSortOpen(prev => !prev)}
                aria-label={t("sortLabel")}
                aria-haspopup="menu"
                aria-expanded={mobileSortOpen}
                style={{
                  width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem",
                  border: `0.0625rem solid ${mobileSortOpen ? currentWing.accent : T.color.cream}`,
                  background: mobileSortOpen ? `${currentWing.accent}10` : T.color.white,
                  cursor: "pointer", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={mobileSortOpen ? currentWing.accent : "#716A5E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M6 12h12M9 18h6" />
                </svg>
              </button>
              {/* Sort popup — transparent backdrop dismisses on outside tap */}
              {mobileSortOpen && (
                <div onClick={() => setMobileSortOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 19, background: "transparent" }} />
              )}
              {mobileSortOpen && (
                <div role="menu" style={{
                  position: "absolute", top: "100%", right: "0.75rem", zIndex: 20,
                  background: T.color.white, borderRadius: "0.75rem",
                  border: `0.0625rem solid ${T.color.cream}`,
                  boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,0.12)",
                  padding: "0.375rem", minWidth: "10rem",
                  animation: "libFadeIn 0.15s ease both",
                }}>
                  {(["newest", "oldest", "alpha", "type"] as const).map((mode) => (
                    <button
                      key={mode}
                      role="menuitemradio"
                      aria-checked={sortMode === mode}
                      onClick={() => { setSortMode(mode); setMobileSortOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.5rem",
                        width: "100%", padding: "0.5rem 0.75rem",
                        borderRadius: "0.5rem", border: "none",
                        background: sortMode === mode ? `${currentWing.accent}10` : "transparent",
                        cursor: "pointer", textAlign: "left",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sortMode === mode ? currentWing.accent : "#716A5E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {mode === "newest" && <><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></>}
                        {mode === "oldest" && <><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>}
                        {mode === "alpha" && <><path d="M3 6h7M3 12h5M3 18h3" /><path d="M17 3l4 4-4 4" /><path d="M21 7H14" /></>}
                        {mode === "type" && <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>}
                      </svg>
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.8125rem",
                        fontWeight: sortMode === mode ? 600 : 500,
                        color: sortMode === mode ? currentWing.accent : "#403B36",
                      }}>
                        {t(`sort${mode.charAt(0).toUpperCase() + mode.slice(1)}` as "sortNewest")}
                      </span>
                      {sortMode === mode && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={currentWing.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── Desktop: original layout ── */
          <div style={{
            display: "flex", alignItems: "stretch", flexShrink: 0,
            background: `linear-gradient(160deg, ${headerAccent}0C 0%, ${CREAM} 78%)`,
            boxShadow: TOP_HIGHLIGHT,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <LibraryHeader
                // "__all__" is not a wing: skip the wings[0] fallback icon and show
                // the dedicated All-Memories mark. LibraryHeaderProps types wingIcon
                // as string but renders it as a node (`wingId ? <WingIcon/> : wingIcon`),
                // so the element is slotted via a cast without touching LibraryAnimations.
                // Real wings pass a WingIcon element too (never the emoji stored in
                // currentWing.icon) so no path can ever paint the raw emoji.
                wingIcon={selectedWing === "__all__"
                  ? ((<AllMemoriesIcon size={24} color={headerAccent} />) as unknown as string)
                  : ((<WingIcon wingId={currentWing.id} size={24} color={headerAccent} />) as unknown as string)}
                wingId={selectedWing === "__all__" ? undefined : currentWing.id}
                wingName={selectedWing === "__all__" ? (t("allMemories") !== "allMemories" ? t("allMemories") : "All Memories") : translateWingName(currentWing, tWings)}
                wingDesc={selectedWing === "__all__" ? (t("allMemoriesDesc") !== "allMemoriesDesc" ? t("allMemoriesDesc") : "Your whole life, newest first") : (currentWing.descKey ? tWings(currentWing.descKey) : currentWing.desc)}
                roomName={selectedRoom ? ((() => { const r = wingRooms.find(r => r.id === selectedRoom); return r ? translateRoomName(r, tWings) : undefined; })()) : undefined}
                accent={headerAccent}
                onBack={selectedRoom ? () => setSelectedRoom(null) : (selectedWing !== "__all__" ? () => setSelectedWing("__all__") : undefined)}
                onAdd={selectedRoom ? () => setShowUploadFor({ wingId: selectedWing, roomId: selectedRoom }) : undefined}
                count={filteredRoomMems.length}
                isMobile={isMobile}
              />
            </div>
            <div data-nudge="library_search" style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "1rem 1.5rem 1rem 0",
              background: "transparent",
            }}>
              <LibrarySearch
                query={query}
                onQueryChange={setQuery}
                accent={currentWing.accent}
                resultCount={searchResultCount}
                isMobile={isMobile}
              />
            </div>
          </div>
        )}

        {/* ── CONTROL BAND — small mono-colour FILTER pills (left) + distinct
            ACTION pills (right, terracotta) + the ink+gold Import keystone. ── */}
        {(() => {
          const base = selectedRoom ? getMemsForRoom(selectedRoom) : (selectedWing === "__all__" ? libAllMems : allWingMems);
          const now = new Date(), mo = now.getMonth(), da = now.getDate(), yr = now.getFullYear();
          // Anniversaries only: month+day match in a PAST year (same semantics
          // as the gilt strip and the facet predicate).
          const isOtd = (m: Mem) => { const r = memDate(m); if (!r) return false; const d = new Date(r); return !Number.isNaN(d.getTime()) && d.getMonth() === mo && d.getDate() === da && d.getFullYear() !== yr; };
          const defs: { key: "place" | "described" | "onthisday"; label: string; count: number; icon: React.ReactNode }[] = [
            { key: "place", label: t("facetPlace") !== "facetPlace" ? t("facetPlace") : "Has place", count: base.filter(m => !!m.locationName).length, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> },
            { key: "described", label: t("facetDescribed") !== "facetDescribed" ? t("facetDescribed") : "Described", count: base.filter(m => !!(m.desc || "").trim() || !!m.historicalContext).length, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg> },
            { key: "onthisday", label: t("onThisDay") !== "onThisDay" ? t("onThisDay") : "On this day", count: base.filter(isOtd).length, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.2 5.6L20 9.3l-4.4 3.7L17 19l-5-3.2L7 19l1.4-6L4 9.3l5.8-.7z"/></svg> },
          ];
          const anyActive = !!facet || !!filterType || !!q || !!filterYear;
          const roomTools = ([{ key: "writeStory" as const, label: t("writeStory") }, { key: "aiLabel" as const, label: t("aiLabel") }, { key: "addLocation" as const, label: t("addLocation") }]);
          const bandRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "nowrap", overflowX: "auto", scrollbarWidth: "none", maskImage: "linear-gradient(to right, transparent 0, #000 0.75rem, #000 calc(100% - 0.75rem), transparent 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0, #000 0.75rem, #000 calc(100% - 0.75rem), transparent 100%)" };
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", padding: isMobile ? "0 0.5rem 0.5rem" : isCompact ? "0 1.25rem 0.5rem" : "0 2.5rem 0.55rem" }}>
            {/* ── Row 1: filters + view controls ── */}
            <div style={bandRowStyle}>
              {/* FILTERS — one colour, small */}
              {defs.map(d => {
                const active = facet === d.key;
                const disabled = d.count === 0 && !active;
                return (
                  <button key={d.key} type="button" disabled={disabled} onClick={() => setFacet(active ? null : d.key)} className="lib-pill" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.3rem", minHeight: "1.9rem", padding: "0 0.6rem", borderRadius: "2rem", cursor: disabled ? "default" : "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? "none" : "auto", background: active ? "#B85C38" : "transparent", color: active ? "#FCFAF5" : "#403B36", border: `0.0625rem solid ${active ? "#B85C38" : "#E3D6BC"}` }}>
                    <span style={{ display: "inline-flex", opacity: 0.85 }}>{d.icon}</span>
                    {d.label}
                    <span style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.625rem", fontWeight: 700, opacity: 0.65 }}>{d.count}</span>
                  </button>
                );
              })}
              {anyActive && (
                <button type="button" onClick={() => { setFacet(null); setFilterType(null); setQuery(""); setFilterYear(""); }} className="lib-pill" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", minHeight: "1.9rem", padding: "0 0.5rem", borderRadius: "2rem", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, background: "transparent", color: "#716A5E", border: "0.0625rem solid #E3D6BC" }}>✕</button>
              )}

              <span style={{ flex: 1, minWidth: "0.75rem" }} />

              {/* Type filter — the state always existed; now it has a control */}
              {(() => {
                const typesInScope = [...new Set(base.map(m => normalizeDisplayType(m.type)))].sort();
                if (typesInScope.length < 2 && !filterType) return null;
                const typeLabel = (ty: string) => {
                  const k = `type${ty.charAt(0).toUpperCase() + ty.slice(1)}`;
                  const v = t(k as "sortNewest");
                  return v !== k ? v : ty;
                };
                return (
                  <select value={filterType || ""} onChange={e => setFilterType(e.target.value || null)} aria-label={t("filterAllTypes") !== "filterAllTypes" ? t("filterAllTypes") : "All types"} className="lib-pill" style={{ flexShrink: 0, minHeight: "1.9rem", padding: "0 0.6rem", borderRadius: "2rem", border: `0.0625rem solid ${filterType ? "#B85C38" : "#E3D6BC"}`, background: filterType ? "#B85C38" : "#FCFAF5", color: filterType ? "#FCFAF5" : "#403B36", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, WebkitAppearance: "none", MozAppearance: "none", appearance: "none" }}>
                    <option value="">{t("filterAllTypes") !== "filterAllTypes" ? t("filterAllTypes") : "All types"}</option>
                    {typesInScope.map(ty => <option key={ty} value={ty}>{typeLabel(ty)}</option>)}
                  </select>
                );
              })()}

              {/* Sort — desktop control for the state the mobile popup drives */}
              {!isMobile && (
                <select value={sortMode} onChange={e => setSortMode(e.target.value as typeof sortMode)} aria-label={t("sortLabel")} className="lib-pill" style={{ flexShrink: 0, minHeight: "1.9rem", padding: "0 0.6rem", borderRadius: "2rem", border: `0.0625rem solid ${sortMode !== "newest" ? "#B85C38" : "#E3D6BC"}`, background: sortMode !== "newest" ? "#B85C38" : "#FCFAF5", color: sortMode !== "newest" ? "#FCFAF5" : "#403B36", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, WebkitAppearance: "none", MozAppearance: "none", appearance: "none" }}>
                  {(["newest", "oldest", "alpha", "type"] as const).map(m => (
                    <option key={m} value={m}>{t(`sort${m.charAt(0).toUpperCase() + m.slice(1)}` as "sortNewest")}</option>
                  ))}
                </select>
              )}

              {libYears.length > 1 && (
                <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="lib-pill" style={{ flexShrink: 0, minHeight: "1.9rem", padding: "0 0.6rem", borderRadius: "2rem", border: `0.0625rem solid ${filterYear ? "#B85C38" : "#E3D6BC"}`, background: filterYear ? "#B85C38" : "#FCFAF5", color: filterYear ? "#FCFAF5" : "#403B36", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, WebkitAppearance: "none", MozAppearance: "none", appearance: "none" }}>
                  <option value="">{t("allYears") !== "allYears" ? t("allYears") : "All years"}</option>
                  {libYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}

              {/* Rooms lens */}
              <div style={{ flexShrink: 0, display: "inline-flex", borderRadius: "2rem", border: "0.0625rem solid #E3D6BC", overflow: "hidden", background: "#FCFAF5" }}>
                {([{ k: "month" as const, label: t("byMonth") !== "byMonth" ? t("byMonth") : "Month" }, { k: "room" as const, label: t("byRoom") !== "byRoom" ? t("byRoom") : "Rooms" }]).map(o => {
                  const on = wallGroupBy === o.k;
                  return <button key={o.k} type="button" onClick={() => setWallGroupBy(o.k)} className="lib-pill" style={{ minHeight: "1.9rem", padding: "0 0.7rem", border: "none", background: on ? EMBER : "transparent", color: on ? "#FCFAF5" : "#716A5E", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600 }}>{o.label}</button>;
                })}
              </div>

            </div>

            {/* ── Row 2: ACTION pills — terracotta register ── */}
            <div data-nudge="library_tools" style={bandRowStyle}>
              {showDemos && (
                <button type="button" onClick={() => { setDemosHidden(true); setShowDemos(false); syncSettingsToServer(); }} className="lib-pill" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.35rem", minHeight: "1.9rem", padding: "0 0.7rem", borderRadius: "2rem", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, background: "rgba(154,79,42,0.07)", color: "#9A4F2A", border: "0.0625rem solid rgba(154,79,42,0.25)" }}>{t("demoBannerClear")}</button>
              )}
              {/* Import/Upload keystone — FIRST action in the pill row: getting
                  memories in is the primary act, everything else follows */}
              <button type="button" data-spotlight-id="importUpload" data-nudge="library_import" onClick={() => { setShowImportHub(true); if (spotlightTarget === "importUpload") setSpotlightTarget(null); }} className="lib-pill" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.4rem", minHeight: "1.9rem", padding: "0 0.85rem", borderRadius: "2rem", background: "linear-gradient(165deg, #403B36 0%, #2E2A26 100%)", border: "0.0625rem solid rgba(212,175,55,0.55)", color: "#FCFAF5", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.14)", animation: spotlightTarget === "importUpload" ? "spotlightPulse 1.2s ease-in-out infinite" : undefined }}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="#E8C255" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 9l4 4 4-4"/><path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2"/></svg>
                {t("importButton")}
              </button>
              {/* Mobile add-memory pill — the UploadPanel opener otherwise
                  lives only in the desktop header */}
              {isMobile && selectedRoom && (
                <button type="button" onClick={() => setShowUploadFor({ wingId: selectedWing, roomId: selectedRoom })} className="lib-pill" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.3rem", minHeight: "1.9rem", padding: "0 0.7rem", borderRadius: "2rem", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, background: EMBER, color: "#FCFAF5", border: `0.0625rem solid ${EMBER}` }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  {t("addMemory")}
                </button>
              )}
              {/* Tool pills are always visible — pressed with no room open they
                  ask WHICH room via the RoomPicker (the panels are room-scoped;
                  no more silent fullest-room auto-entry) */}
              {roomTools.map(a => (
                <button key={a.key} type="button" data-spotlight-id={a.key} onClick={() => {
                  if (!selectedRoom) {
                    setToolRoomPicker(a.key);
                  } else {
                    setActiveToolPanel(a.key);
                  }
                  if (spotlightTarget === a.key) setSpotlightTarget(null);
                }} className="lib-pill" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.35rem", minHeight: "1.9rem", padding: "0 0.7rem", borderRadius: "2rem", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, background: "rgba(154,79,42,0.07)", color: "#9A4F2A", border: "0.0625rem solid rgba(154,79,42,0.25)", animation: spotlightTarget === a.key ? "spotlightPulse 1.2s ease-in-out infinite" : undefined }}>{a.label}</button>
              ))}
              {/* Time Capsule — explicit wing→room chooser, then the same
                  UploadPanel flow with the sealed-memory preset flag;
                  Atrium spotlight target */}
              <button type="button" data-spotlight-id="timeCapsule" title={t("actionTimeCapsuleHint")} aria-label={`${t("actionTimeCapsule")} — ${t("actionTimeCapsuleHint")}`} onClick={() => {
                setCapsulePickerOpen(true);
                if (spotlightTarget === "timeCapsule") setSpotlightTarget(null);
              }} className="lib-pill" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.35rem", minHeight: isMobile ? "2.75rem" : "1.9rem", padding: "0 0.7rem", borderRadius: "2rem", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, background: "rgba(154,79,42,0.07)", color: "#9A4F2A", border: "0.0625rem solid rgba(154,79,42,0.25)", animation: spotlightTarget === "timeCapsule" ? "spotlightPulse 1.2s ease-in-out infinite" : undefined }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12M6 21h12" /><path d="M8 3v3c0 2.5 4 3.5 4 6s-4 3.5-4 6v3" /><path d="M16 3v3c0 2.5-4 3.5-4 6s4 3.5 4 6v3" /></svg>
                {t("actionTimeCapsule")}
              </button>
              <button type="button" onClick={() => setShowPublishModal(true)} className="lib-pill" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "0.35rem", minHeight: "1.9rem", padding: "0 0.7rem", borderRadius: "2rem", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600, background: "rgba(154,79,42,0.07)", color: "#9A4F2A", border: "0.0625rem solid rgba(154,79,42,0.25)" }}>{t("publish")}</button>
            </div>
            </div>
          );
        })()}

        {/* ── ON THIS DAY — gilt resurfacing strip (renders nothing when empty,
            never scolding); the Library's pull to return ── */}
        {onThisDayMems.length > 0 && (
          <div style={{ padding: isMobile ? "0 0.5rem 0.75rem" : isCompact ? "0 1.25rem 0.75rem" : "0 2.5rem 0.75rem" }}>
            <div className="lib-otd" style={{ border: "0.0625rem solid #D4AF37", background: "linear-gradient(160deg, #FCF6E5 0%, #FCFAF5 78%)", borderRadius: "1rem", boxShadow: "0 0.25rem 1rem rgba(64,59,54,0.07), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", padding: "0.75rem 1rem" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", marginBottom: "0.6rem" }}>
                <Overline color="#8A6410">{t("onThisDay", {}) !== "onThisDay" ? t("onThisDay", {}) : "On this day"}</Overline>
                <span aria-hidden="true" style={{ flex: 1, height: "0.0625rem", background: "linear-gradient(90deg, rgba(212,175,55,0.5), transparent)" }} />
              </div>
              <div style={{ display: "flex", gap: "0.7rem", overflowX: "auto", paddingBottom: "0.15rem", scrollbarWidth: "none", maskImage: "linear-gradient(to right, transparent 0, #000 0.5rem, #000 calc(100% - 0.5rem), transparent 100%)", WebkitMaskImage: "linear-gradient(to right, transparent 0, #000 0.5rem, #000 calc(100% - 0.5rem), transparent 100%)" }}>
                {onThisDayMems.map(({ mem, wing, room, yearsAgo }, i) => (
                  <button key={mem.id + "_" + i} type="button" onClick={() => setDetailPanelMem({ mem, wingId: wing.id, roomId: room.id })} title={mem.title} style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", width: "3.25rem", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                    <span style={{ width: "3rem", height: "3rem", borderRadius: "0.6rem", overflow: "hidden", border: "0.125rem solid #D4AF37", boxShadow: "inset 0 0 0 0.0625rem #FCFAF5", flexShrink: 0 }}>
                      <MediaThumb mem={mem} size="3rem" borderRadius="0.5rem" iconSize={16} />
                    </span>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600, color: "#8A6410", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{yearsAgo}{t("yearsAgoShort", {}) !== "yearsAgoShort" ? t("yearsAgoShort", {}) : "y"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Room tools toolbar — always visible */}
        {/* Content area */}
        <div data-nudge-scroll-lock style={{
          flex: 1, overflow: "auto",
          padding: isMobile ? "0.5rem 1rem" : "0.75rem 2.5rem",
          paddingBottom: isMobile ? "calc(4.5rem + env(safe-area-inset-bottom, 0px))" : "2rem",
          animation: "libFadeIn 0.35s ease both",
        }}>

          {/* example-media clear is now an action pill in the control band */}

          {/* ═══ ACTION BAR: Select + View toggle (Import lives in the control band) ═══ */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: "0.5rem", marginBottom: "0.75rem",
            animation: "libFadeIn 0.35s ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {/* Select mode toggle — only when room has memories */}
              {selectedRoom && filteredRoomMems.length > 0 && (
                <button
                  onClick={() => { setSelectMode(prev => !prev); setSelectedMemIds(new Set()); }}
                  style={{
                    padding: "0.375rem 0.75rem", borderRadius: "0.5rem",
                    border: `0.0625rem solid ${selectMode ? EMBER : T.color.cream}`,
                    background: selectMode ? "rgba(184,92,56,0.12)" : T.color.white,
                    fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                    color: selectMode ? EMBER : "#716A5E",
                    cursor: "pointer", flexShrink: 0,
                  }}
                >
                  {selectMode ? tc("done") : tc("select")}
                </button>
              )}
            </div>

            {/* View mode toggle — only when room selected */}
            {selectedRoom && (
              <div style={{
                display: "flex", gap: "0.125rem",
                background: "rgba(255,255,255,0.6)",
                borderRadius: "0.5rem",
                padding: "0.1875rem",
                border: `0.0625rem solid ${T.color.cream}`,
                flexShrink: 0,
              }}>
                <button onClick={() => setViewMode("grid")} aria-label={t("gridView")} style={{ padding: "0.375rem", borderRadius: "0.375rem", border: "none", background: viewMode === "grid" ? T.color.white : "transparent", boxShadow: viewMode === "grid" ? "0 0.0625rem 0.25rem rgba(64,59,54,0.08)" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === "grid" ? "#403B36" : "#716A5E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                </button>
                <button onClick={() => setViewMode("timeline")} aria-label={t("timelineView")} style={{ padding: "0.375rem", borderRadius: "0.375rem", border: "none", background: viewMode === "timeline" ? T.color.white : "transparent", boxShadow: viewMode === "timeline" ? "0 0.0625rem 0.25rem rgba(64,59,54,0.08)" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === "timeline" ? "#403B36" : "#716A5E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>
                </button>
              </div>
            )}
          </div>

          {/* Cross-wing search results */}
          {crossWingResults && (
            <div style={{ animation: "libSlideUp 0.35s ease both" }}>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
                marginBottom: "1.25rem", letterSpacing: "0.02em",
              }}>
                {t("searchResults", { count: String(crossWingResults.length), query })}
              </p>
              <div role="list" style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "1.25rem",
              }}>
                {crossWingResults.slice(0, 50).map(({ wing, room, mem }, i) => (
                  <div key={mem.id} role="listitem" style={{
                    animation: `libCardEnter 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${Math.min(0.05 + i * 0.035, 0.25)}s both`,
                  }}>
                    <LibraryMemoryCard
                      mem={mem}
                      subtitle={`${translateWingName(wing, tWings)} / ${translateRoomName(room, tWings)}`}
                      accent={wing.accent}
                      searchQuery={query || undefined}
                      animationIndex={i}
                      onClick={() => setDetailPanelMem({ mem, wingId: wing.id, roomId: room.id })}
                      onMove={(m) => setMovingMem({ mem: m, fromRoom: room.id })}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* (empty-search state removed here — the wall's own empty state below
              handles no-results for every scope; this one double-rendered) */}

          {/* AI SMART SORT BAR - Attic wing only (hidden on iOS until shipped) */}
          {!hideComingSoon && !selectedRoom && !crossWingResults && selectedWing === "attic" && allWingMems.length > 0 && (
            <div style={{
              marginBottom: "1.5rem",
              padding: isMobile ? "1rem" : "1.125rem 1.5rem",
              background: "linear-gradient(135deg, rgba(198,107,61,0.08) 0%, rgba(212,175,55,0.06) 100%)",
              borderRadius: "0.75rem",
              border: `0.0625rem solid ${T.color.terracotta}22`,
              display: "flex", flexDirection: isMobile ? "column" : "row",
              alignItems: isMobile ? "stretch" : "center",
              gap: isMobile ? "0.75rem" : "1.25rem",
              animation: "libFadeIn 0.4s ease both",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "1rem", fontWeight: 700,
                    color: "#403B36", letterSpacing: "0.02em",
                  }}>
                    {t("aiSortTitle")}
                  </span>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                    color: T.color.terracotta, background: `${T.color.terracotta}15`,
                    padding: "0.125rem 0.5rem", borderRadius: "1rem",
                    letterSpacing: "0.03em",
                  }}>
                    {t("unsortedCount", { count: String(allWingMems.length) })}
                  </span>
                </div>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E",
                  margin: 0, lineHeight: 1.45,
                }}>
                  {t("aiSortDesc")}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.625rem", flexShrink: 0, alignItems: "center" }}>
                <button
                  onClick={handleAiSort}
                  style={{
                    padding: "0.5rem 1.25rem", borderRadius: "0.625rem",
                    background: `linear-gradient(135deg, ${T.color.terracotta}, #D4925F)`,
                    color: T.color.white, border: "none", cursor: "pointer",
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                    letterSpacing: "0.03em", whiteSpace: "nowrap",
                    boxShadow: "0 0.125rem 0.5rem rgba(198,107,61,0.25)",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-0.0625rem)";
                    e.currentTarget.style.boxShadow = "0 0.25rem 0.75rem rgba(198,107,61,0.35)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 0.125rem 0.5rem rgba(198,107,61,0.25)";
                  }}
                >
                  {t("aiSortButton")}
                </button>
                <button
                  onClick={() => { setShowManualSortBanner(true); setShowAiSortBanner(false); }}
                  style={{
                    padding: "0.5rem 1rem", borderRadius: "0.625rem",
                    background: "rgba(255,255,255,0.7)",
                    border: `0.0625rem solid ${T.color.cream}`,
                    cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem",
                    fontWeight: 500, color: "#716A5E", whiteSpace: "nowrap",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = T.color.white;
                    e.currentTarget.style.borderColor = `${"#716A5E"}33`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.7)";
                    e.currentTarget.style.borderColor = T.color.cream;
                  }}
                >
                  {t("aiSortManual")}
                </button>
              </div>
            </div>
          )}


          {/* Coming soon banners for AI Sort / Manual Sort */}
          {!hideComingSoon && (showAiSortBanner || showManualSortBanner) && !selectedRoom && !crossWingResults && selectedWing === "attic" && (
            <div style={{
              marginBottom: "1.25rem",
              padding: "1rem 1.25rem",
              background: T.color.linen,
              borderRadius: "0.75rem",
              border: `0.0625rem solid ${T.color.cream}`,
              display: "flex", alignItems: "flex-start", gap: "0.75rem",
              animation: "libFadeIn 0.3s ease both",
            }}>
              <span style={{ fontSize: "1.125rem", lineHeight: 1, flexShrink: 0, marginTop: "0.125rem" }}>{"\u2728"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: T.font.display, fontSize: "0.875rem", fontWeight: 600,
                  color: "#716A5E", margin: "0 0 0.25rem 0",
                }}>
                  {t("comingSoon")}
                </p>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem",
                  color: "#716A5E", margin: 0, lineHeight: 1.5, opacity: 0.8,
                }}>
                  {showAiSortBanner ? t("aiSortComingSoon") : t("manualSortComingSoon")}
                </p>
              </div>
              <button
                onClick={() => { setShowAiSortBanner(false); setShowManualSortBanner(false); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "0.875rem", color: "#716A5E", padding: "0.125rem 0.25rem",
                  lineHeight: 1, borderRadius: "0.25rem", opacity: 0.6, flexShrink: 0,
                }}
              >
                {"\u2715"}
              </button>
            </div>
          )}

          {/* Room list (when no room selected and no cross-wing search and no empty search) */}
          {false && !selectedRoom && !crossWingResults && !q && selectedWing !== "__all__" && (
            <div style={{ animation: "libFadeIn 0.35s ease both" }}>
              {/* Wing welcome message */}
              <p style={{
                fontFamily: T.font.body, fontSize: "0.875rem",
                color: "#716A5E", margin: "0 0 1.25rem",
                lineHeight: 1.6, letterSpacing: "0.01em",
                animation: "libFadeIn 0.4s ease 0.1s both",
              }}>
                {wingRooms.length > 0
                  ? t("wingWelcome", { count: String(wingRooms.length) })
                  : t("wingWelcomeNoRooms")
                }
              </p>

              {/* Section header with decorative accent */}
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{
                  display: "flex", alignItems: "baseline", gap: "0.625rem",
                  marginBottom: "0.5rem",
                }}>
                  <h3 style={{
                    fontFamily: T.font.body, fontSize: "0.6875rem",
                    fontWeight: 700, color: "#716A5E",
                    margin: 0, letterSpacing: "0.1em", textTransform: "uppercase",
                  }}>
                    {t("roomsIn")}
                  </h3>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "1.125rem",
                    fontWeight: 600, color: "#403B36",
                    letterSpacing: "0.03em",
                  }}>
                    {selectedWing === "__all__" ? t("allRooms") : currentWing.id === "attic" ? t("storageRoom") : translateWingName(currentWing, tWings)}
                  </span>
                </div>
                <div style={{
                  height: "0.0625rem", maxWidth: "10rem",
                  background: `linear-gradient(90deg, ${selectedWing === "__all__" ? T.color.gold : currentWing.accent}55, ${T.color.cream}33, transparent)`,
                  animation: "libFadeIn 0.6s ease 0.2s both",
                }} />
              </div>

              {wingRooms.length > 0 ? (
                <div role="list" style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(17rem, 1fr))",
                  gap: "1.25rem",
                }}>
                  {wingRooms.map((room, i) => {
                    const mems = getMemsForRoom(room.id);
                    const thumbMem = mems.find(m => m.dataUrl && m.type === "photo") || mems.find(m => m.dataUrl);
                    return (
                      <div key={room.id} style={{
                        animation: `libCardEnter 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${Math.min(0.1 + i * 0.06, 0.25)}s both`,
                      }}>
                        <LibraryRoomCard
                          room={room}
                          memCount={mems.length}
                          thumbUrl={thumbMem?.dataUrl || null}
                          accent={(selectedWing === "__all__" ? wings.find(w => w.id === roomWingMap[room.id])?.accent : currentWing.accent) || currentWing.accent}
                          onClick={() => {
                            if (selectedWing === "__all__") setSelectedWing(roomWingMap[room.id] || selectedWing);
                            setSelectedRoom(room.id);
                            fetchRoomMemories(room.id);
                            setVisibleMemCount(50);
                          }}
                          onAdd={() => {
                            const wId = roomWingMap[room.id] || selectedWing;
                            if (selectedWing === "__all__") setSelectedWing(wId);
                            setSelectedRoom(room.id);
                            fetchRoomMemories(room.id);
                            setShowImportHub(true);
                          }}
                        />
                      </div>
                    );
                  })}

                  {/* + Add Room card */}
                  <div
                    style={{
                      animation: `libCardEnter 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${0.1 + wingRooms.length * 0.06}s both`,
                    }}
                  >
                    <button
                      onClick={() => setShowRoomManager(true)}
                      style={{
                        width: "100%",
                        minHeight: "10rem",
                        borderRadius: "1rem",
                        border: `0.0625rem dashed ${HAIRLINE}`,
                        background: "transparent",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        transition: "all 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                        padding: "1.5rem",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = EMBER;
                        e.currentTarget.style.background = CREAM;
                        e.currentTarget.style.transform = "translateY(-0.125rem)";
                        e.currentTarget.style.boxShadow = SHADOW[1];
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = HAIRLINE;
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <span style={{
                        fontSize: "1.5rem",
                        lineHeight: 1,
                        color: "#716A5E",
                        fontWeight: 300,
                      }}>
                        +
                      </span>
                      <span style={{
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        color: "#716A5E",
                        letterSpacing: "0.02em",
                      }}>
                        {t("addRoomLabel")}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <LibraryEmptyState
                  type="wing"
                  accent={currentWing.accent}
                  onAdd={() => setShowRoomManager(true)}
                />
              )}
            </div>
          )}

          {/* Memory grid (when room selected) */}
          {!crossWingResults && (
            <div style={{ animation: "libSlideRight 0.35s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              {/* Bulk actions bar — only visible in select mode */}
              {selectMode && (
              <div style={{
                display: "flex", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem",
                background: TRAY,
                borderRadius: "1.25rem",
                borderLeft: `0.1875rem solid ${EMBER}`,
                boxShadow: "inset 0 0.0625rem 0.1875rem rgba(64,59,54,0.06)",
                padding: "0.5rem 0.75rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  {/* Bulk actions (P1 #6) */}
                  {selectMode && (
                    <>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: T.font.body, fontSize: "0.75rem", color: "#716A5E", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={filteredRoomMems.length > 0 && filteredRoomMems.every(m => selectedMemIds.has(m.id))}
                          onChange={() => {
                            // Membership, not size-equality — the set may hold
                            // ids that are no longer in the filtered view
                            if (filteredRoomMems.every(m => selectedMemIds.has(m.id))) {
                              setSelectedMemIds(new Set());
                            } else {
                              setSelectedMemIds(new Set(filteredRoomMems.map(m => m.id)));
                            }
                          }}
                          style={{ accentColor: currentWing.accent }}
                        />
                        {t("selectAll")}
                      </label>
                      {selectedMemIds.size > 0 && (
                        <>
                          <button
                            onClick={async () => {
                              const count = selectedMemIds.size;
                              if (!(await confirmDialog({ message: t("bulkDeleteConfirm", { count: String(count) }), destructive: true }))) return;
                              for (const memId of selectedMemIds) {
                                const rid = memRoomMap.get(memId)?.roomId || selectedRoom;
                                if (rid) deleteMemory(rid, memId);
                              }
                              setSelectedMemIds(new Set());
                              setSelectMode(false);
                            }}
                            style={{
                              padding: "0.375rem 0.75rem", borderRadius: "0.5rem",
                              border: `0.0625rem solid ${T.color.error}44`,
                              background: `${T.color.error}10`, color: T.color.error,
                              fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {t("bulkDelete", { count: String(selectedMemIds.size) })}
                          </button>
                          {/* P2 #2: Batch tag editing */}
                          <button
                            onClick={() => setShowBatchTag(prev => !prev)}
                            style={{
                              padding: "0.375rem 0.75rem", borderRadius: "0.5rem",
                              border: `0.0625rem solid ${currentWing.accent}44`,
                              background: showBatchTag ? `${currentWing.accent}15` : `${currentWing.accent}08`,
                              color: currentWing.accent,
                              fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {t("tagSelected")}
                          </button>
                          {/* Bulk move to room */}
                          <button
                            onClick={() => { setBulkMoving(true); setExpandedMoveWing(null); }}
                            style={{
                              padding: "0.375rem 0.75rem", borderRadius: "0.5rem",
                              border: `0.0625rem solid ${currentWing.accent}44`,
                              background: `${currentWing.accent}08`,
                              color: currentWing.accent,
                              fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {t("moveSelected")}
                          </button>
                        </>
                      )}
                      {/* P2 #2: Batch tag input */}
                      {showBatchTag && selectedMemIds.size > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <input
                            type="text"
                            value={batchTagInput}
                            onChange={e => setBatchTagInput(e.target.value)}
                            placeholder={t("tagInputPlaceholder")}
                            style={{
                              padding: "0.375rem 0.625rem", borderRadius: "0.5rem",
                              border: `0.0625rem solid ${T.color.cream}`, background: T.color.white,
                              fontFamily: T.font.body, fontSize: "0.75rem", color: "#403B36",
                              outline: "none", width: "10rem",
                            }}
                            onKeyDown={e => {
                              if (e.key === "Enter" && batchTagInput.trim()) {
                                for (const memId of selectedMemIds) {
                                  const mem = filteredRoomMems.find(m => m.id === memId);
                                  if (mem && selectedRoom) {
                                    const existing = mem.desc || "";
                                    const tagText = `#${batchTagInput.trim()}`;
                                    const tagRid = memRoomMap.get(memId)?.roomId || selectedRoom;
                                    if (tagRid && !existing.includes(tagText)) {
                                      updateMemory(tagRid, memId, { desc: existing ? `${existing} ${tagText}` : tagText });
                                    }
                                  }
                                }
                                setBatchTagInput("");
                                setShowBatchTag(false);
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (batchTagInput.trim()) {
                                for (const memId of selectedMemIds) {
                                  const mem = filteredRoomMems.find(m => m.id === memId);
                                  if (mem && selectedRoom) {
                                    const existing = mem.desc || "";
                                    const tagText = `#${batchTagInput.trim()}`;
                                    const tagRid = memRoomMap.get(memId)?.roomId || selectedRoom;
                                    if (tagRid && !existing.includes(tagText)) {
                                      updateMemory(tagRid, memId, { desc: existing ? `${existing} ${tagText}` : tagText });
                                    }
                                  }
                                }
                                setBatchTagInput("");
                                setShowBatchTag(false);
                              }
                            }}
                            disabled={!batchTagInput.trim()}
                            style={{
                              padding: "0.375rem 0.625rem", borderRadius: "0.5rem",
                              background: batchTagInput.trim() ? currentWing.accent : `${T.color.sandstone}40`,
                              color: batchTagInput.trim() ? T.color.white : "#716A5E",
                              border: "none", cursor: batchTagInput.trim() ? "pointer" : "default",
                              fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                            }}
                          >
                            {t("applyTag")}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              )}
              {/* Loading skeleton (P1 #10) — only show during brief loading */}
              {roomLoading && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(15rem, 1fr))",
                  gap: "1.25rem",
                }}>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{
                      borderRadius: "1rem",
                      background: "rgba(255,255,255,0.5)",
                      overflow: "hidden",
                      animation: `libFadeIn 0.3s ease ${Math.min(i * 0.05, 0.25)}s both`,
                    }}>
                      <div style={{
                        aspectRatio: "3 / 2",
                        background: `linear-gradient(90deg, ${T.color.cream} 25%, ${T.color.warmStone} 50%, ${T.color.cream} 75%)`,
                        backgroundSize: "200% 100%",
                        animation: "libShimmer 1.5s ease-in-out infinite",
                      }} />
                      <div style={{ padding: "0.75rem" }}>
                        <div style={{
                          height: "0.875rem", width: "70%", borderRadius: "0.25rem",
                          background: `linear-gradient(90deg, ${T.color.cream} 25%, ${T.color.warmStone} 50%, ${T.color.cream} 75%)`,
                          backgroundSize: "200% 100%",
                          animation: "libShimmer 1.5s ease-in-out infinite",
                          marginBottom: "0.5rem",
                        }} />
                        <div style={{
                          height: "0.625rem", width: "45%", borderRadius: "0.25rem",
                          background: `linear-gradient(90deg, ${T.color.cream} 25%, ${T.color.warmStone} 50%, ${T.color.cream} 75%)`,
                          backgroundSize: "200% 100%",
                          animation: "libShimmer 1.5s ease-in-out infinite",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!roomLoading && filteredRoomMems.length > 0 ? (
                effectiveView === "grid" ? (
                  <PhotoWall
                    mems={filteredRoomMems}
                    isMobile={isMobile}
                    tileAccent={tileAccentOf}
                    groupBy={wallGroupBy}
                    sortMode={sortMode}
                    roomLabelOf={roomLabelOf}
                    selectMode={selectMode}
                    selectedMemIds={selectedMemIds}
                    onToggleSelect={toggleSelectMem}
                    onOpen={openMediaAt}
                    monthLabel={monthLabelOf}
                    undatedLabel={t("undated") !== "undated" ? t("undated") : "Undated"}
                    countLabel={countLabelOf}
                    draggableTiles={!isMobile}
                    onTileDragStart={handleTileDragStart}
                    onTileDragEnd={handleTileDragEnd}
                    onTouchDragStart={handleTouchDragStart}
                    onTouchDragMove={handleTouchDragMove}
                    onTouchDragEnd={handleTouchDragEnd}
                  />
                ) : effectiveView === "timeline" ? (
                /* P2 #3: Timeline view */
                <div style={{ position: "relative", paddingLeft: "2rem" }}>
                  {/* Vertical line */}
                  <div style={{
                    position: "absolute", left: "0.5rem", top: 0, bottom: 0,
                    width: "0.125rem", background: `linear-gradient(to bottom, ${currentWing.accent}59, #E3D6BC)`,
                  }} />
                  {(() => {
                    // Timeline is chronological by nature: honor newest/oldest,
                    // and sort the FULL array BEFORE paginating so "Load more"
                    // extends the ordering instead of interleaving into it.
                    const dir = sortMode === "oldest" ? 1 : -1;
                    const sorted = [...filteredRoomMems]
                      .sort((a, b) => dir * memDate(a).localeCompare(memDate(b)))
                      .slice(0, visibleMemCount);
                    let lastDate = "";
                    return sorted.map((mem, i) => {
                      const rawDate = memDate(mem);
                      const dateStr = rawDate
                        ? new Date(rawDate).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })
                        : "";
                      const showDate = dateStr !== lastDate;
                      if (showDate) lastDate = dateStr;
                      return (
                        <div key={mem.id} style={{ marginBottom: "0.75rem", animation: `libCardEnter 0.35s ease ${Math.min(0.03 + i * 0.03, 0.25)}s both` }}>
                          {showDate && dateStr && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: "0.5rem",
                              marginBottom: "0.375rem", marginLeft: "-1.75rem",
                            }}>
                              {/* gilt day-node: each date reads as a small
                                  palace frame (licensed gold), tying the
                                  timeline to the on-this-day vocabulary */}
                              <div style={{
                                width: "0.5rem", height: "0.5rem", borderRadius: "50%",
                                background: currentWing.accent, flexShrink: 0,
                                boxShadow: `0 0 0 0.125rem #FCFAF5, 0 0 0 0.1875rem #D4AF37`,
                              }} />
                              <span style={{
                                fontFamily: T.font.display, fontSize: "0.8125rem",
                                fontWeight: 600, color: "#403B36",
                                letterSpacing: "0.02em",
                              }}>
                                {dateStr}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => {
                              if (selectMode) {
                                setSelectedMemIds(prev => { const next = new Set(prev); if (next.has(mem.id)) next.delete(mem.id); else next.add(mem.id); return next; });
                              } else {
                                // Open by identity: the player receives the
                                // un-resorted filteredRoomMems, so a positional
                                // index from this locally-sorted list is wrong.
                                setMediaPlayerIndex(filteredRoomMems.findIndex(m => m.id === mem.id));
                              }
                            }}
                            style={{
                              display: "flex", alignItems: "center", gap: "0.75rem",
                              padding: "0.5rem 0.75rem", borderRadius: "0.625rem",
                              border: `0.0625rem solid ${selectedMemIds.has(mem.id) ? currentWing.accent : T.color.cream}`,
                              background: selectedMemIds.has(mem.id) ? `${currentWing.accent}08` : "rgba(255,255,255,0.75)",
                              cursor: "pointer", textAlign: "left" as const,
                              fontFamily: T.font.body, transition: "all 0.2s ease",
                              width: "100%",
                            }}
                          >
                            <span style={{ display: "inline-flex", alignItems: "center", lineHeight: 1, flexShrink: 0 }}>
                              <TypeIcon type={mem.type} size={16} color={currentWing.accent} />
                            </span>
                            {/* Type-aware thumb: video/audio use thumbnailUrl,
                                never their raw dataUrl as an <img> */}
                            <MediaThumb mem={mem} size="2.25rem" iconSize={14} />

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#403B36", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {mem.title}
                              </span>
                              {mem.desc && (
                                <span style={{ display: "block", fontSize: "0.625rem", color: "#716A5E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {mem.desc.slice(0, 80)}
                                </span>
                              )}
                            </div>
                            {mem.createdAt && (
                              <span style={{ fontSize: "0.625rem", color: "#716A5E", flexShrink: 0, whiteSpace: "nowrap" }}>
                                {new Date(mem.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
                ) : null
              ) : !roomLoading ? (
                <LibraryEmptyState
                  type={(!!q || !!filterType || !!facet || !!filterYear) ? "search" : "room"}
                  accent={currentWing.accent}
                  onAdd={() => setShowImportHub(true)}
                  query={query || undefined}
                />
              ) : null}

              {/* Load more pagination — timeline only; the grid wall
                  renders every row (content-visibility keeps it cheap) */}
              {effectiveView !== "grid" && filteredRoomMems.length > visibleMemCount && (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "0.5rem", marginTop: "1.5rem",
                  animation: "libFadeIn 0.3s ease both",
                }}>
                  <p style={{
                    fontFamily: T.font.body, fontSize: "0.75rem",
                    color: "#716A5E", margin: 0,
                  }}>
                    {t("showingCount", { shown: String(Math.min(visibleMemCount, filteredRoomMems.length)), total: String(filteredRoomMems.length) })}
                  </p>
                  <button
                    onClick={() => setVisibleMemCount(prev => prev + 50)}
                    style={{
                      padding: "0.5rem 1.5rem", borderRadius: "0.625rem",
                      background: "rgba(255,255,255,0.8)",
                      border: `0.0625rem solid ${T.color.cream}`,
                      cursor: "pointer", fontFamily: T.font.body,
                      fontSize: "0.8125rem", fontWeight: 600,
                      color: "#716A5E", letterSpacing: "0.02em",
                      transition: "all 0.25s ease",
                      boxShadow: "0 0.0625rem 0.25rem rgba(64,59,54,0.06)",
                    }}
                  >
                    {t("loadMore")}
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      {/* ═══ P2 #1: Slide-in Detail Panel ═══ */}
      {detailPanelMem && (
        <>
        {/* Backdrop overlay */}
        <div
          onClick={() => setDetailPanelMem(null)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.3)",
            zIndex: 9997,
            animation: "libFadeIn 0.2s ease both",
          }}
        />
        <div style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: isMobile ? "100vw" : "min(26rem, 40vw)",
          zIndex: 9998,
          background: CREAM,
          borderLeft: `0.0625rem solid ${HAIRLINE}`,
          boxShadow: "-0.5rem 0 2rem rgba(64,59,54,0.15)",
          display: "flex", flexDirection: "column",
          animation: "libSlideLeft 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
          overflow: "hidden",
        }}>
          <style>{`@keyframes libSlideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
          {/* Header */}
          <div style={{
            padding: "1rem 1.25rem", borderBottom: `0.0625rem solid ${HAIRLINE}`,
            display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
          }}>
            <h3 style={{ fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600, color: "#403B36", margin: 0 }}>
              {t("detailPanelTitle")}
            </h3>
            <button
              onClick={() => setDetailPanelMem(null)}
              aria-label={tc("close")}
              style={{
                width: "2rem", height: "2rem", borderRadius: "50%",
                border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone,
                color: "#716A5E", fontSize: "0.875rem", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {"\u2715"}
            </button>
          </div>
          {/* Content */}
          <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
            {/* Media preview — type-aware: photos show the image, video/audio
                show their thumbnail or the type glyph (never raw dataUrl) */}
            {(detailPanelMem.mem.dataUrl || detailPanelMem.mem.thumbnailUrl) && (
              <div style={{
                borderRadius: "0.75rem", overflow: "hidden", marginBottom: "1rem",
                background: T.color.cream, aspectRatio: "16 / 10",
                position: "relative",
              }}>
                {["photo", "painting", "album"].includes(detailPanelMem.mem.type) && detailPanelMem.mem.dataUrl ? (
                  <Image
                    src={detailPanelMem.mem.dataUrl}
                    alt={detailPanelMem.mem.title}
                    fill
                    unoptimized
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <MediaThumb mem={detailPanelMem.mem} size="100%" borderRadius="0" iconSize={28} />
                )}
              </div>
            )}
            {/* Title */}
            <h4 style={{
              fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 700,
              color: "#403B36", margin: "0 0 0.75rem",
              lineHeight: 1.3, letterSpacing: "0.01em",
            }}>
              {detailPanelMem.mem.title}
            </h4>
            {/* Metadata */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1rem" }}>
              {/* Type */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: "#716A5E", textTransform: "uppercase" as const, letterSpacing: "0.05em", width: "4.5rem", flexShrink: 0 }}>
                  {t("detailPanelType")}
                </span>
                <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#403B36", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <TypeIcon type={detailPanelMem.mem.type} size={14} color={"#403B36"} />
                  {detailPanelMem.mem.type}
                </span>
              </div>
              {/* Date */}
              {detailPanelMem.mem.createdAt && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: "#716A5E", textTransform: "uppercase" as const, letterSpacing: "0.05em", width: "4.5rem", flexShrink: 0 }}>
                    {t("detailPanelDate")}
                  </span>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#403B36" }}>
                    {new Date(detailPanelMem.mem.createdAt).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              {/* Location */}
              {detailPanelMem.mem.locationName && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: "#716A5E", textTransform: "uppercase" as const, letterSpacing: "0.05em", width: "4.5rem", flexShrink: 0, paddingTop: "0.125rem" }}>
                    {t("detailPanelLocation")}
                  </span>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.25rem" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={"#716A5E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "0.0625rem" }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <div>
                      <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#403B36" }}>
                        {detailPanelMem.mem.locationName}
                      </span>
                      {typeof detailPanelMem.mem.lat === "number" && typeof detailPanelMem.mem.lng === "number" && (
                        <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E", display: "block", marginTop: "0.0625rem" }}>
                          {detailPanelMem.mem.lat.toFixed(4)}, {detailPanelMem.mem.lng.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Description */}
            {detailPanelMem.mem.desc && (
              <div style={{ marginBottom: "1rem" }}>
                <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: "#716A5E", textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: "0.375rem" }}>
                  {t("detailPanelDescription")}
                </span>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.875rem", color: "#403B36",
                  margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap",
                }}>
                  {detailPanelMem.mem.desc}
                </p>
              </div>
            )}
          </div>
          {/* Footer actions */}
          <div style={{
            padding: "0.75rem 1.25rem", borderTop: `0.0625rem solid ${T.color.cream}`,
            display: "flex", gap: "0.625rem", flexShrink: 0,
          }}>
            <button
              onClick={() => {
                setDetailMem(detailPanelMem);
                setDetailPanelMem(null);
              }}
              style={{
                flex: 1, padding: "0.5rem 1rem", borderRadius: "0.5rem",
                background: currentWing.accent, color: T.color.white,
                border: "none", cursor: "pointer",
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
              }}
            >
              {t("viewDetails")}
            </button>
            <button
              onClick={() => setDetailPanelMem(null)}
              style={{
                padding: "0.5rem 1rem", borderRadius: "0.5rem",
                background: "rgba(64,59,54,.06)", border: "none", cursor: "pointer",
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
                color: "#716A5E",
              }}
            >
              {tc("close")}
            </button>
          </div>
        </div>
        </>
      )}

      {/* ═══ OVERLAY PANELS ═══ */}

      {/* Room media player */}
      {mediaPlayerIndex !== null && (
        <RoomMediaPlayer
          memories={filteredRoomMems}
          initialIndex={mediaPlayerIndex}
          onClose={() => setMediaPlayerIndex(null)}
          onEdit={(mem) => {
            setMediaPlayerIndex(null);
            const loc = memRoomMap.get(mem.id);
            setDetailMem({ mem, wingId: loc?.wingId || selectedWing, roomId: loc?.roomId || selectedRoom || "" });
          }}
          onUpdate={(memId, updates) => { const rid = memRoomMap.get(memId)?.roomId || selectedRoom; if (rid) updateMemory(rid, memId, updates); }}
          storedIn={storedInOf}
          onQuickAction={(mem, actionId) => {
            // Viewer chip → MemoryDetail with that ActionCard pre-opened
            setMediaPlayerIndex(null);
            const loc = memRoomMap.get(mem.id);
            setDetailMem({ mem, wingId: loc?.wingId || selectedWing, roomId: loc?.roomId || selectedRoom || "", initialAction: actionId });
          }}
        />
      )}

      {/* Restore-photo spotlight hint (from Atrium restore tile) */}
      {restoreHint && !detailMem && (
        <div
          role="status"
          onClick={() => setRestoreHint(false)}
          style={{
            position: "fixed", left: "50%", transform: "translateX(-50%)",
            bottom: `max(1.25rem, ${T.safe.bottom})`, zIndex: 60, cursor: "pointer",
            maxWidth: "min(28rem, calc(100vw - 2rem))",
            background: T.color.inkDeep, color: T.color.cream,
            fontFamily: T.font.body, fontSize: T.fontSize.base, lineHeight: 1.4,
            padding: "0.75rem 1.125rem", borderRadius: T.radius.pill,
            boxShadow: T.shadow[2], display: "flex", alignItems: "center", gap: "0.5rem",
            animation: "libRestoreHintIn 0.28s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={T.color.gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M3 10a7 7 0 1 1 2 5" /><polyline points="3 11 3 15 7 15" />
          </svg>
          <span>{t("restoreHint")}</span>
          <style>{`
            @keyframes libRestoreHintIn { from { opacity: 0; transform: translateX(-50%) translateY(0.5rem); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
            @media (prefers-reduced-motion: reduce) { [role="status"] { animation: none !important; } }
          `}</style>
        </div>
      )}

      {/* Memory detail overlay */}
      {detailMem && (
        <MemoryDetail
          mem={detailMem.mem}
          room={getWingRooms(detailMem.wingId).find(r => r.id === detailMem.roomId) || null}
          wing={wings.find(w => w.id === detailMem.wingId) || null}
          onClose={() => setDetailMem(null)}
          onDelete={handleDeleteMemory}
          onUpdate={handleUpdateMemory}
          initialAction={detailMem.initialAction}
        />
      )}

      {/* Upload panel overlay */}
      {showUploadFor && (
        <UploadPanel
          wing={wings.find(w => w.id === showUploadFor.wingId) || null}
          room={getWingRooms(showUploadFor.wingId).find(r => r.id === showUploadFor.roomId) || null}
          onClose={() => setShowUploadFor(null)}
          onAdd={handleAddMemory}
          roomMemories={getMemsForRoom(showUploadFor.roomId)}
          onUpdateMemory={(memId: string, updates: Partial<Mem>) => updateMemory(showUploadFor.roomId, memId, updates)}
        />
      )}

      {/* Time Capsule destination chooser (wing → room, then UploadPanel) */}
      {capsulePickerOpen && (
        <RoomPicker
          wings={wings}
          getWingRooms={getWingRooms}
          t={t}
          tc={tc}
          tWings={tWings}
          onClose={() => setCapsulePickerOpen(false)}
          onPick={(wingId, roomId) => {
            setCapsulePickerOpen(false);
            try { localStorage.setItem("mp_upload_time_capsule", "true"); } catch { /* full */ }
            setSelectedWing(wingId);
            setSelectedRoom(roomId);
            fetchRoomMemories(roomId);
            setShowUploadFor({ wingId, roomId });
          }}
        />
      )}

      {/* Room chooser for a room-scoped tool pill pressed with no room open:
          pick a room, enter it, then the tool panel opens there */}
      {toolRoomPicker && (
        <RoomPicker
          wings={wings}
          getWingRooms={getWingRooms}
          t={t}
          tc={tc}
          tWings={tWings}
          title={t("roomPickTitle")}
          hint={t("roomPickHint")}
          onClose={() => setToolRoomPicker(null)}
          onPick={(wingId, roomId) => {
            const tool = toolRoomPicker;
            setToolRoomPicker(null);
            setSelectedWing(wingId);
            setSelectedRoom(roomId);
            fetchRoomMemories(roomId);
            if (tool) setActiveToolPanel(tool);
          }}
        />
      )}

      {/* Playful gold arrow pointing at the spotlighted action (Atrium CTA) */}
      {spotlightTarget && <SpotlightArrow targetKey={spotlightTarget} />}

      {/* Wing manager overlay */}
      {showWingManager && (
        <WingManagerPanel onClose={() => setShowWingManager(false)} />
      )}

      {/* Room manager overlay */}
      {showRoomManager && currentWing && (
        <RoomManagerPanel
          wing={currentWing}
          wings={wings}
          onClose={() => setShowRoomManager(false)}
          onEnterRoom={(roomId: string) => {
            setShowRoomManager(false);
            if (roomWingMap[roomId]) setSelectedWing(roomWingMap[roomId]);
            setSelectedRoom(roomId);
            fetchRoomMemories(roomId);
          }}
        />
      )}

      {/* ═══ IMPORT HUB MODAL ═══ */}
      {showImportHub && (
        <ImportHub
          onClose={() => setShowImportHub(false)}
          initialRoomId={selectedRoom}
          onImportFiles={handleImportFiles}
          onOpenCloudProvider={handleCloudProvider}
        />
      )}

      {/* ═══ GOOGLE PHOTOS PICKER OVERLAY ═══ */}
      {pickerStatus !== "idle" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(64,59,54,.35)", backdropFilter: "blur(0.75rem)", WebkitBackdropFilter: "blur(0.75rem)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: CREAM, borderRadius: "1.25rem",
            boxShadow: "0 1.5rem 3rem rgba(64,59,54,0.18), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", border: `0.0625rem solid ${HAIRLINE}`,
            padding: "2rem 2.5rem", textAlign: "center", maxWidth: "24rem", width: "min(24rem, 88vw)",
          }}>
            {pickerStatus === "opening" && (
              <>
                <div style={{ marginBottom: "0.75rem" }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="10" width="40" height="28" rx="4" stroke={T.color.terracotta} strokeWidth="2.5" fill="none"/>
                    <circle cx="24" cy="24" r="8" stroke={T.color.terracotta} strokeWidth="2.5" fill="none"/>
                    <circle cx="24" cy="24" r="3.5" fill={T.color.terracotta} opacity="0.3"/>
                    <rect x="16" y="6" width="16" height="6" rx="2" stroke={T.color.terracotta} strokeWidth="2" fill="none"/>
                    <circle cx="36" cy="16" r="2" fill={T.color.terracotta} opacity="0.5"/>
                    <style>{`@keyframes gpPulse{0%,100%{opacity:.3}50%{opacity:.7}} [data-gp-pulse]{animation:gpPulse 2s ease-in-out infinite}`}</style>
                    <circle cx="24" cy="24" r="3.5" fill={T.color.terracotta} data-gp-pulse=""/>
                  </svg>
                </div>
                <p style={{ fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600, color: "#403B36", margin: 0 }}>
                  {t("googlePhotosPickerOpening")}
                </p>
              </>
            )}
            {pickerStatus === "waiting" && (
              <>
                <div style={{ marginBottom: "0.75rem" }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="10" width="40" height="28" rx="4" stroke={T.color.terracotta} strokeWidth="2.5" fill="none"/>
                    <circle cx="24" cy="24" r="8" stroke={T.color.terracotta} strokeWidth="2.5" fill="none"/>
                    <circle cx="24" cy="24" r="3.5" fill={T.color.terracotta} opacity="0.4"/>
                    <rect x="16" y="6" width="16" height="6" rx="2" stroke={T.color.terracotta} strokeWidth="2" fill="none"/>
                    <circle cx="36" cy="16" r="2" fill={T.color.terracotta} opacity="0.5"/>
                  </svg>
                </div>
                <p style={{ fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600, color: "#403B36", margin: "0 0 0.75rem" }}>
                  Google Photos
                </p>
                <a
                  href={pickerUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block", padding: "0.625rem 1.5rem", borderRadius: "0.5rem",
                    background: T.color.terracotta, color: T.color.white,
                    fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                    textDecoration: "none", marginBottom: "1rem",
                  }}
                >
                  {t("googlePhotosPickerOpenBtn")}
                </a>
                <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: "#716A5E", margin: 0 }}>
                  {t("googlePhotosPickerWaiting")}
                </p>
                <button
                  onClick={() => { setPickerStatus("idle"); localStorage.removeItem("gphoto_picker_session"); if (pickerPollRef.current) { clearInterval(pickerPollRef.current); pickerPollRef.current = null; } }}
                  style={{
                    marginTop: "1rem", padding: "0.375rem 1rem", borderRadius: "0.375rem",
                    background: "transparent", border: `0.0625rem solid ${T.color.cream}`,
                    cursor: "pointer", fontFamily: T.font.body, fontSize: "0.75rem", color: "#716A5E",
                  }}
                >
                  {tc("cancel")}
                </button>
              </>
            )}
            {pickerStatus === "importing" && (
              <>
                <div style={{ marginBottom: "0.75rem" }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <style>{`@keyframes gpSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                    <circle cx="24" cy="24" r="18" stroke={T.color.cream} strokeWidth="3" fill="none"/>
                    <path d="M24 6a18 18 0 0 1 18 18" stroke={T.color.terracotta} strokeWidth="3" strokeLinecap="round" fill="none" style={{ transformOrigin: "center", animation: "gpSpin 1s linear infinite" }}/>
                    <path d="M18 20l-2 8h4l-2 8 10-12h-6l4-8h-8z" fill={T.color.terracotta} opacity="0.6"/>
                  </svg>
                </div>
                <p style={{ fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600, color: "#403B36", margin: 0 }}>
                  {t("googlePhotosPickerImporting")}
                </p>
              </>
            )}
            {pickerStatus === "done" && (
              <>
                <div style={{ marginBottom: "0.75rem" }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="20" fill={T.color.terracotta} opacity="0.1"/>
                    <circle cx="24" cy="24" r="18" stroke={T.color.terracotta} strokeWidth="2.5" fill="none"/>
                    <path d="M15 24l6 6 12-12" stroke={T.color.terracotta} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
                <p style={{ fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600, color: "#403B36", margin: "0 0 0.5rem" }}>
                  {t("googlePhotosPickerDone", { count: String(pickerImportCount) })}
                </p>
                <button
                  onClick={() => setPickerStatus("idle")}
                  style={{
                    marginTop: "0.5rem", padding: "0.5rem 1.5rem", borderRadius: "0.5rem",
                    background: T.color.terracotta, color: T.color.white,
                    border: "none", cursor: "pointer",
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                  }}
                >
                  {tc("close")}
                </button>
              </>
            )}
            {pickerStatus === "error" && (
              <>
                <div style={{ marginBottom: "0.75rem" }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 6L44 40H4L24 6z" stroke={T.color.terracotta} strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
                    <path d="M24 6L44 40H4L24 6z" fill={T.color.terracotta} opacity="0.08"/>
                    <line x1="24" y1="18" x2="24" y2="30" stroke={T.color.terracotta} strokeWidth="3" strokeLinecap="round"/>
                    <circle cx="24" cy="35" r="1.75" fill={T.color.terracotta}/>
                  </svg>
                </div>
                <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.terracotta, margin: "0 0 1rem" }}>
                  {pickerError}
                </p>
                <button
                  onClick={() => setPickerStatus("idle")}
                  style={{
                    padding: "0.5rem 1.5rem", borderRadius: "0.5rem",
                    background: T.color.terracotta, color: T.color.white,
                    border: "none", cursor: "pointer",
                    fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                  }}
                >
                  {tc("close")}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ CLOUD BROWSER MODAL ═══ */}
      {cloudBrowserProvider && (
        <CloudBrowser
          provider={cloudBrowserProvider}
          onClose={() => setCloudBrowserProvider(null)}
          onImport={async (items) => {
            const importRoom = cloudImportRoom || selectedRoom;
            if (items.length > 0 && !importRoom) {
              // No target room: keep the modal — and the user's selection —
              // alive instead of silently discarding.
              await confirmDialog({ message: t("selectRoomFirst") });
              return;
            }
            if (importRoom && items.length > 0) {
              const provider = items[0].provider;
              const endpointMap: Record<string, string> = {
                dropbox: "/api/integrations/dropbox/import",
                googlePhotos: "/api/integrations/google/import",
                onedrive: "/api/integrations/onedrive/import",
                box: "/api/integrations/box/import",
              };
              const endpoint = endpointMap[provider];
              if (endpoint) {
                let body: Record<string, unknown>;
                if (provider === "dropbox") {
                  body = { filePaths: items.map((i) => i.path || i.id), roomId: importRoom };
                } else if (provider === "googlePhotos") {
                  body = { photoIds: items.map((i) => i.id), roomId: importRoom };
                } else if (provider === "onedrive") {
                  body = { itemIds: items.map((i) => i.id), roomId: importRoom };
                } else {
                  body = { fileIds: items.map((i) => i.id), roomId: importRoom };
                }
                try {
                  const res = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  });
                  if (res.ok) {
                    await fetchRoomMemories(importRoom);
                  }
                } catch { /* ignore */ }
              }
            }
            setCloudBrowserProvider(null);
          }}
          isMobile={isMobile}
          t={t}
          tc={tc}
        />
      )}

      {/* ═══ WRITE STORY PANEL ═══ */}
      {activeToolPanel === "writeStory" && selectedRoom && (
        <div
          onClick={() => { setActiveToolPanel(null); setStoryText(""); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(64,59,54,.35)",
            backdropFilter: "blur(0.75rem)",
            WebkitBackdropFilter: "blur(0.75rem)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "libFadeIn 0.2s ease both",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: CREAM,
              borderRadius: "1.25rem",
              boxShadow: "0 1.5rem 3rem rgba(64,59,54,0.18), inset 0 0.0625rem 0 rgba(255,255,255,0.5)",
              border: `0.0625rem solid ${HAIRLINE}`,
              width: "min(32rem, 90vw)",
              maxHeight: "min(36rem, 85vh)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `0.0625rem solid ${HAIRLINE}`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: "#403B36", margin: 0 }}>
                  {t("writeStoryTitle", { room: (() => { const r = wingRooms.find(r => r.id === selectedRoom); return r ? translateRoomName(r, tWings) : ""; })() })}
                </h3>
                <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "#716A5E", margin: "0.25rem 0 0" }}>{t("writeStoryDesc")}</p>
              </div>
              <button onClick={() => { setActiveToolPanel(null); setStoryText(""); }} aria-label={tc("close")} style={{ width: "2rem", height: "2rem", borderRadius: "1rem", border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone, color: "#716A5E", fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
            </div>
            <div style={{ flex: 1, padding: "1rem 1.5rem", overflow: "auto" }}>
              <textarea
                value={storyText}
                onChange={e => setStoryText(e.target.value)}
                placeholder={t("writeStoryPlaceholder")}
                autoFocus
                style={{
                  width: "100%", minHeight: "12rem", padding: "0.875rem",
                  borderRadius: "0.75rem", border: `0.0625rem solid ${HAIRLINE}`,
                  background: T.color.warmStone, fontFamily: T.font.body,
                  fontSize: "0.875rem", color: "#403B36", outline: "none",
                  resize: "vertical", lineHeight: 1.6,
                }}
              />
            </div>
            <div style={{ padding: "0.75rem 1.5rem", borderTop: `0.0625rem solid ${HAIRLINE}`, display: "flex", justifyContent: "flex-end", gap: "0.625rem", flexShrink: 0 }}>
              <button onClick={() => { setActiveToolPanel(null); setStoryText(""); }}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "rgba(64,59,54,.06)", border: "none", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: "#716A5E" }}>{tc("cancel")}</button>
              <button
                onClick={() => {
                  if (storyText.trim() && selectedRoom) {
                    addMemory(selectedRoom, {
                      id: `story-${Date.now()}`,
                      title: t("storyMemoryTitle"),
                      hue: Math.floor(Math.random() * 360), s: 50, l: 70,
                      type: "text",
                      desc: storyText.trim(),
                      createdAt: new Date().toISOString(),
                    });
                    setStoryText("");
                    setActiveToolPanel(null);
                  }
                }}
                disabled={!storyText.trim()}
                style={{
                  padding: "0.5rem 1.25rem", borderRadius: "0.5rem",
                  background: storyText.trim() ? currentWing.accent : `${T.color.sandstone}40`,
                  color: storyText.trim() ? "#FFF" : "#716A5E",
                  border: "none", cursor: storyText.trim() ? "pointer" : "default",
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                }}>{tc("save")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AI LABEL PANEL ═══ */}
      {activeToolPanel === "aiLabel" && selectedRoom && (() => {
        const photoMems = filteredRoomMems.filter(m => m.type === "photo" && m.dataUrl);
        const unlabeledPhotos = photoMems.filter(m => !m.desc);
        const labeledPhotos = photoMems.filter(m => !!m.desc);
        const handleStartLabeling = async () => {
          const selectedPhotos = photoMems.filter(m => aiLabelSelected.has(m.id));
          if (selectedPhotos.length === 0) { setAiLabelError(t("aiLabelNoSelection")); return; }
          // Run-id guard: closing the panel bumps the ref, and this loop stops
          // spending paid API calls and never writes state from a dead run.
          const run = ++aiLabelRunRef.current;
          setAiLabelProcessing(true); setAiLabelError(null); setAiLabelDone(false); setAiLabelResults({});
          let failCount = 0, successCount = 0;
          for (let i = 0; i < selectedPhotos.length; i++) {
            if (run !== aiLabelRunRef.current) return;
            const mem = selectedPhotos[i];
            setAiLabelProgress({ current: i + 1, total: selectedPhotos.length });
            try {
              const res = await fetch("/api/ai-label", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: mem.dataUrl, memoryTitle: mem.title }) });
              if (run !== aiLabelRunRef.current) return;
              if (!res.ok) {
                if (res.status === 403) { setAiLabelError(t("aiLabelConsentRequired")); setAiLabelProcessing(false); setAiLabelProgress(null); return; }
                // These statuses will fail every remaining call too — stop the loop
                if (res.status === 401 || res.status === 429 || res.status === 503) { failCount += selectedPhotos.length - i; break; }
                failCount++; continue;
              }
              const data = await res.json();
              if (run !== aiLabelRunRef.current) return;
              successCount++;
              setAiLabelResults(prev => ({ ...prev, [mem.id]: { description: data.description, labels: data.labels } }));
            } catch { failCount++; }
          }
          if (run !== aiLabelRunRef.current) return;
          setAiLabelProcessing(false); setAiLabelProgress(null);
          // Total failure keeps the selection grid visible for retry — no green "Done!"
          setAiLabelDone(successCount > 0);
          if (failCount > 0) setAiLabelError(t("aiLabelFailed", { count: String(failCount) }));
        };
        const handleSaveResult = async (memId: string, description: string, labels: string[]) => {
          const tagSuffix = labels.length > 0 ? ` [${labels.join(", ")}]` : "";
          const rid = memRoomMap.get(memId)?.roomId || selectedRoom;
          if (!rid) return;
          // Only show the checkmark once the server actually persisted it
          // (LEG-003: AI labels merged into desc → mark provenance)
          const ok = await updateMemory(rid, memId, { desc: description + tagSuffix, source: "ai" });
          if (!ok) { setAiLabelError(t("aiLabelFailed", { count: "1" })); return; }
          setAiLabelResults(prev => ({ ...prev, [memId]: { ...prev[memId], saved: true } }));
        };
        const handleClosePanel = closeToolPanel;
        return (
        <div role="button" tabIndex={0} onClick={handleClosePanel} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClosePanel(); } }} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(64,59,54,.35)", backdropFilter: "blur(0.75rem)", WebkitBackdropFilter: "blur(0.75rem)", display: "flex", alignItems: "center", justifyContent: "center", animation: "libFadeIn 0.2s ease both" }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", background: CREAM, borderRadius: "1.25rem", boxShadow: "0 1.5rem 3rem rgba(64,59,54,0.18), inset 0 0.0625rem 0 rgba(255,255,255,0.5)", border: `0.0625rem solid ${HAIRLINE}`, width: "min(32rem, 92vw)", maxHeight: "min(40rem, 88vh)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
            {/* Gilt left rule — the one licensed gold in the Library's modals */}
            <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "0.25rem", background: "linear-gradient(180deg, #D4AF37, #B85C38)" }} />
            <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `0.0625rem solid ${HAIRLINE}`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: "#403B36", margin: 0 }}>{t("aiLabelTitle")}</h3>
                <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "#716A5E", margin: "0.25rem 0 0" }}>{t("aiLabelDesc", { count: String(photoMems.length) })}</p>
              </div>
              <button onClick={handleClosePanel} aria-label={tc("close")} style={{ width: "2rem", height: "2rem", borderRadius: "1rem", border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone, color: "#716A5E", fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
            </div>
            <div style={{ flex: 1, padding: "1.25rem 1.5rem", overflow: "auto" }}>
              {photoMems.length === 0 ? (
                <div style={{ padding: "2rem 1rem", textAlign: "center" }}><p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: "#716A5E" }}>{t("aiLabelNoPhotos")}</p></div>
              ) : (<>
                {!aiLabelDone && !aiLabelProcessing && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", gap: "0.75rem", fontFamily: T.font.body, fontSize: "0.75rem" }}>
                      <span style={{ color: "#716A5E" }}>{t("aiLabelNeedsLabeling", { count: String(unlabeledPhotos.length) })}</span>
                      {labeledPhotos.length > 0 && <span style={{ color: "#716A5E" }}>{t("aiLabelAlreadyLabeled", { count: String(labeledPhotos.length) })}</span>}
                    </div>
                    <button onClick={() => { if (aiLabelSelected.size === photoMems.length) { setAiLabelSelected(new Set()); } else { setAiLabelSelected(new Set(photoMems.map(m => m.id))); } }} style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                      {aiLabelSelected.size === photoMems.length ? t("aiLabelDeselectAll") : t("aiLabelSelectAll")}
                    </button>
                  </div>
                )}
                {aiLabelProcessing && aiLabelProgress && (
                  <div style={{ marginBottom: "1rem" }}>
                    <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#716A5E", marginBottom: "0.375rem" }}>{t("aiLabelProgress", { current: String(aiLabelProgress.current), total: String(aiLabelProgress.total) })}</p>
                    <div style={{ height: "0.25rem", borderRadius: "0.125rem", background: T.color.cream, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: "0.125rem", background: EMBER, transition: "width 0.3s ease", width: `${(aiLabelProgress.current / aiLabelProgress.total) * 100}%` }} />
                    </div>
                  </div>
                )}
                {aiLabelDone && (
                  <div style={{ marginBottom: "1rem", padding: "0.625rem 0.875rem", background: "rgba(76,175,80,.08)", borderRadius: "0.5rem", border: "0.0625rem solid rgba(76,175,80,.2)" }}>
                    <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: "#2e7d32", margin: 0 }}>{t("aiLabelDone", { count: String(Object.keys(aiLabelResults).length) })}</p>
                  </div>
                )}
                {aiLabelError && (
                  <div style={{ marginBottom: "0.75rem", padding: "0.5rem 0.875rem", background: "rgba(211,47,47,.08)", borderRadius: "0.5rem", border: "0.0625rem solid rgba(211,47,47,.2)" }}>
                    <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "#c62828", margin: 0 }}>{aiLabelError}</p>
                  </div>
                )}
                {!aiLabelDone && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(4.5rem, 1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    {photoMems.map(m => {
                      const isSelected = aiLabelSelected.has(m.id);
                      const hasDesc = !!m.desc;
                      return (
                        <div key={m.id} role="button" tabIndex={aiLabelProcessing ? -1 : 0} onClick={() => { if (aiLabelProcessing) return; setAiLabelSelected(prev => { const next = new Set(prev); if (next.has(m.id)) next.delete(m.id); else next.add(m.id); return next; }); }}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (aiLabelProcessing) return; setAiLabelSelected(prev => { const next = new Set(prev); if (next.has(m.id)) next.delete(m.id); else next.add(m.id); return next; }); } }}
                          aria-label={m.title}
                          aria-pressed={isSelected}
                          style={{ position: "relative", borderRadius: "0.5rem", overflow: "hidden", aspectRatio: "1", cursor: aiLabelProcessing ? "default" : "pointer", outline: isSelected ? `0.125rem solid ${EMBER}` : "0.125rem solid transparent", outlineOffset: "-0.125rem", opacity: aiLabelProcessing && !isSelected ? 0.4 : 1, transition: "outline 0.15s ease, opacity 0.15s ease" }}>
                          <Image src={m.dataUrl || ""} alt={m.title} fill unoptimized style={{ objectFit: "cover" }} />
                          <div style={{ position: "absolute", top: "0.25rem", left: "0.25rem", width: "1.125rem", height: "1.125rem", borderRadius: "0.25rem", background: isSelected ? EMBER : "rgba(255,255,255,.7)", border: isSelected ? "none" : `0.0625rem solid ${"#716A5E"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6875rem", color: "#FFF", fontWeight: 700 }}>{isSelected && "\u2713"}</div>
                          {hasDesc && (<div style={{ position: "absolute", top: "0.25rem", right: "0.25rem", width: "1rem", height: "1rem", borderRadius: "50%", background: "rgba(76,175,80,.85)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5625rem", color: "#FFF" }}>{"\u2713"}</div>)}
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,.5)", padding: "0.125rem 0.25rem", fontSize: "0.5rem", color: "#FFF", fontFamily: T.font.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {Object.keys(aiLabelResults).length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                    {Object.entries(aiLabelResults).map(([memId, result]) => {
                      const mem = photoMems.find(m => m.id === memId);
                      if (!mem) return null;
                      const isEditing = aiLabelEditing === memId;
                      return (
                        <div key={memId} style={{ display: "flex", gap: "0.75rem", padding: "0.75rem", background: result.saved ? "rgba(76,175,80,.04)" : T.color.linen, borderRadius: "0.625rem", border: `0.0625rem solid ${result.saved ? "rgba(76,175,80,.2)" : T.color.cream}` }}>
                          <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "0.375rem", overflow: "hidden", flexShrink: 0, position: "relative" }}><Image src={mem.dataUrl || ""} alt={mem.title} fill unoptimized style={{ objectFit: "cover" }} /></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 600, color: "#403B36", margin: "0 0 0.25rem 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mem.title}</p>
                            {isEditing ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                                <textarea value={aiLabelEditText} onChange={e => setAiLabelEditText(e.target.value)} style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "#716A5E", border: `0.0625rem solid ${T.color.cream}`, borderRadius: "0.375rem", padding: "0.375rem 0.5rem", resize: "vertical", minHeight: "2.5rem", background: "#FFF", outline: "none", lineHeight: 1.4, width: "100%" }} />
                                <div style={{ display: "flex", gap: "0.375rem" }}>
                                  <button onClick={() => { setAiLabelResults(prev => ({ ...prev, [memId]: { ...prev[memId], description: aiLabelEditText } })); setAiLabelEditing(null); }} style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, padding: "0.25rem 0.625rem", borderRadius: "0.25rem", background: EMBER, color: "#FCFAF5", border: "none", cursor: "pointer" }}>{t("aiLabelSave")}</button>
                                  <button onClick={() => setAiLabelEditing(null)} style={{ fontFamily: T.font.body, fontSize: "0.6875rem", padding: "0.25rem 0.625rem", borderRadius: "0.25rem", background: "rgba(64,59,54,.06)", color: "#716A5E", border: "none", cursor: "pointer" }}>{tc("cancel")}</button>
                                </div>
                              </div>
                            ) : (<>
                              <p style={{ fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.75rem", color: "#716A5E", margin: "0 0 0.25rem 0", lineHeight: 1.4 }}>{result.description}</p>
                              {result.labels.length > 0 && (<div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "0.375rem" }}>{result.labels.map((label, i) => (<span key={i} style={{ fontFamily: T.font.body, fontSize: "0.625rem", padding: "0.0625rem 0.375rem", borderRadius: "0.25rem", background: `${T.color.sandstone}20`, color: "#716A5E" }}>{label}</span>))}</div>)}
                              <div style={{ display: "flex", gap: "0.375rem" }}>
                                <button onClick={() => { setAiLabelEditing(memId); setAiLabelEditText(result.description); }} style={{ fontFamily: T.font.body, fontSize: "0.625rem", padding: "0.125rem 0.375rem", borderRadius: "0.25rem", background: "none", color: "#716A5E", border: `0.0625rem solid ${T.color.cream}`, cursor: "pointer" }}>{t("aiLabelEditDesc")}</button>
                                {!result.saved && (<button onClick={() => handleSaveResult(memId, result.description, result.labels)} style={{ fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600, padding: "0.125rem 0.5rem", borderRadius: "0.25rem", background: EMBER, color: "#FCFAF5", border: "none", cursor: "pointer" }}>{t("aiLabelSave")}</button>)}
                                {result.saved && (<span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: "#2e7d32", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.125rem" }}>{"\u2713"} {t("aiLabelSaved")}</span>)}
                              </div>
                            </>)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>)}
            </div>
            <div style={{ padding: "0.75rem 1.5rem", borderTop: `0.0625rem solid ${HAIRLINE}`, display: "flex", justifyContent: "flex-end", gap: "0.625rem", flexShrink: 0 }}>
              <button onClick={handleClosePanel} style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "rgba(64,59,54,.06)", border: "none", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: "#716A5E" }}>{tc("cancel")}</button>
              {!aiLabelDone ? (
                <button disabled={aiLabelProcessing || aiLabelSelected.size === 0 || photoMems.length === 0} onClick={handleStartLabeling} style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", background: (aiLabelProcessing || aiLabelSelected.size === 0) ? "rgba(184,92,56,0.35)" : EMBER, color: (aiLabelProcessing || aiLabelSelected.size === 0) ? "#716A5E" : "#FCFAF5", border: "none", cursor: (aiLabelProcessing || aiLabelSelected.size === 0) ? "default" : "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, opacity: (aiLabelProcessing || aiLabelSelected.size === 0) ? 0.6 : 1, transition: "background 0.15s ease, opacity 0.15s ease" }}>{aiLabelProcessing ? t("aiLabelProcessing") : t("aiLabelStart")}</button>
              ) : (
                <button onClick={() => { Object.entries(aiLabelResults).forEach(([memId, result]) => { if (!result.saved) handleSaveResult(memId, result.description, result.labels); }); }} disabled={Object.values(aiLabelResults).every(r => r.saved)} style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", background: Object.values(aiLabelResults).every(r => r.saved) ? "rgba(184,92,56,0.35)" : EMBER, color: Object.values(aiLabelResults).every(r => r.saved) ? "#716A5E" : "#FCFAF5", border: "none", cursor: Object.values(aiLabelResults).every(r => r.saved) ? "default" : "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, opacity: Object.values(aiLabelResults).every(r => r.saved) ? 0.6 : 1 }}>{Object.values(aiLabelResults).every(r => r.saved) ? t("aiLabelSaved") : t("aiLabelSave")}</button>
              )}
            </div>
          </div>
        </div>);
      })()}

      {/* ═══ ADD LOCATION PANEL ═══ */}
      {activeToolPanel === "addLocation" && selectedRoom && (() => {
        const roomLocMems = getMemsForRoom(selectedRoom);
        const locSelectedCount = roomLocMems.reduce((n, m) => n + (locDeselected.has(m.id) ? 0 : 1), 0);
        const toggleLocMem = (id: string) => setLocDeselected(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id); else next.add(id);
          return next;
        });
        const pickSuggestion = (s: GeocodeSuggestion) => {
          setLocPicked(s);
          setLocQuery(s.label);
          setLocSuggestions([]);
          setLocActiveIdx(-1);
        };
        const canSaveLoc = !!locPicked && locSelectedCount > 0;
        const handleSaveLoc = () => {
          if (!locPicked || locSelectedCount === 0) return;
          const ids = roomLocMems.filter(m => !locDeselected.has(m.id)).map(m => m.id);
          // Room-level persistence only when the place applies to the WHOLE room
          if (locDeselected.size === 0) {
            try {
              const locations = JSON.parse(localStorage.getItem("mp_room_locations") || "{}");
              locations[selectedRoom] = { name: locPicked.label, lat: locPicked.lat, lng: locPicked.lng };
              localStorage.setItem("mp_room_locations", JSON.stringify(locations));
            } catch { /* full */ }
          }
          // Same save path as before, but ONLY for the selected memory ids
          for (const id of ids) {
            updateMemory(selectedRoom, id, { locationName: locPicked.label, lat: locPicked.lat, lng: locPicked.lng });
          }
          closeToolPanel();
        };
        return (
        <div
          onClick={closeToolPanel}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(64,59,54,.35)",
            backdropFilter: "blur(0.75rem)",
            WebkitBackdropFilter: "blur(0.75rem)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "libFadeIn 0.2s ease both",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: CREAM,
              borderRadius: "1.25rem",
              boxShadow: "0 1.5rem 3rem rgba(64,59,54,0.18), inset 0 0.0625rem 0 rgba(255,255,255,0.5)",
              border: `0.0625rem solid ${HAIRLINE}`,
              width: "min(28rem, 92vw)",
              maxHeight: "min(38rem, 88vh)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `0.0625rem solid ${HAIRLINE}`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: "#403B36", margin: 0 }}>{t("addLocationTitle")}</h3>
                <p style={{ fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.75rem", color: "#716A5E", margin: "0.25rem 0 0" }}>{t("addLocationDesc")}</p>
              </div>
              <button onClick={closeToolPanel} aria-label={tc("close")} style={{ minWidth: "2.75rem", minHeight: "2.75rem", borderRadius: "1.375rem", border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone, color: "#716A5E", fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{"\u2715"}</button>
            </div>
            <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem", overflow: "auto" }}>
              {/* (a) Selection clarity: which memories the place applies to \u2014
                  all pre-selected, tap to toggle, live count below */}
              {roomLocMems.length > 0 && (
                <div>
                  <div role="group" aria-label={t("appliesToCount", { count: String(locSelectedCount) })} style={{ display: "flex", gap: "0.4rem", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", paddingBottom: "0.2rem" }}>
                    {roomLocMems.map(m => {
                      const sel = !locDeselected.has(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          role="checkbox"
                          aria-checked={sel}
                          aria-label={m.title}
                          onClick={() => toggleLocMem(m.id)}
                          style={{ position: "relative", flexShrink: 0, width: "2.75rem", height: "2.75rem", minWidth: "2.75rem", minHeight: "2.75rem", padding: 0, border: "none", borderRadius: "0.5rem", overflow: "hidden", cursor: "pointer", background: T.color.warmStone, outline: sel ? `0.125rem solid ${EMBER}` : `0.0625rem solid ${HAIRLINE}`, outlineOffset: "-0.125rem", opacity: sel ? 1 : 0.45, transition: "opacity 0.15s ease" }}
                        >
                          <MediaThumb mem={m} size="2.75rem" borderRadius="0" iconSize={14} />
                          <span aria-hidden="true" style={{ position: "absolute", top: "0.15rem", left: "0.15rem", width: "0.9375rem", height: "0.9375rem", borderRadius: "0.25rem", background: sel ? EMBER : "rgba(255,255,255,0.85)", border: sel ? "none" : "0.0625rem solid #716A5E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.5625rem", fontWeight: 700, color: "#FFF" }}>{sel ? "\u2713" : ""}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p aria-live="polite" style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "#716A5E", margin: "0.375rem 0 0" }}>
                    {t("appliesToCount", { count: String(locSelectedCount) })}
                  </p>
                </div>
              )}
              {/* (b) Forced geocode: autocomplete-only combobox \u2014 the user MUST
                  pick a suggestion; typing alone keeps Save disabled */}
              <div>
                <label htmlFor="lib-loc-search" style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: "#716A5E", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>{t("locationNameLabel")}</label>
                <input
                  id="lib-loc-search"
                  role="combobox"
                  aria-expanded={locSuggestions.length > 0}
                  aria-controls="lib-loc-listbox"
                  aria-autocomplete="list"
                  aria-activedescendant={locActiveIdx >= 0 ? `lib-loc-opt-${locActiveIdx}` : undefined}
                  value={locQuery}
                  onChange={e => { setLocQuery(e.target.value); setLocPicked(null); }}
                  onKeyDown={e => {
                    if (e.key === "ArrowDown" && locSuggestions.length > 0) {
                      e.preventDefault();
                      setLocActiveIdx(i => (i + 1) % locSuggestions.length);
                    } else if (e.key === "ArrowUp" && locSuggestions.length > 0) {
                      e.preventDefault();
                      setLocActiveIdx(i => (i <= 0 ? locSuggestions.length - 1 : i - 1));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      const s = locActiveIdx >= 0 ? locSuggestions[locActiveIdx] : locSuggestions[0];
                      if (s) pickSuggestion(s);
                    } else if (e.key === "Escape" && locSuggestions.length > 0) {
                      e.stopPropagation();
                      setLocSuggestions([]);
                      setLocActiveIdx(-1);
                    }
                  }}
                  placeholder={t("locationSearchPlaceholder")}
                  autoFocus
                  autoComplete="off"
                  style={{ width: "100%", minHeight: "2.75rem", padding: "0.625rem 0.875rem", borderRadius: "0.625rem", border: `0.0625rem solid ${locPicked ? EMBER : HAIRLINE}`, background: T.color.warmStone, fontFamily: T.font.body, fontSize: "1rem", color: "#403B36", outline: "none" }}
                />
                {locSuggestions.length > 0 && (
                  <ul id="lib-loc-listbox" role="listbox" aria-label={t("locationNameLabel")} style={{ listStyle: "none", margin: "0.25rem 0 0", padding: "0.25rem", background: "#FFF", border: `0.0625rem solid ${HAIRLINE}`, borderRadius: "0.625rem", boxShadow: SHADOW[1], maxHeight: "13rem", overflowY: "auto" }}>
                    {locSuggestions.map((s, i) => (
                      <li key={`${s.lat},${s.lng},${i}`} id={`lib-loc-opt-${i}`} role="option" aria-selected={i === locActiveIdx} style={{ margin: 0, padding: 0 }}>
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => pickSuggestion(s)}
                          onMouseEnter={() => setLocActiveIdx(i)}
                          style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", minHeight: "2.75rem", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "none", background: i === locActiveIdx ? "rgba(184,92,56,0.10)" : "transparent", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.875rem", color: "#403B36", textAlign: "left" }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9A4F2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {locPicked ? (
                  <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "#2e7d32", margin: "0.375rem 0 0", lineHeight: 1.4 }}>
                    {"\u2713"} {locPicked.label} {"\u00b7"} {locPicked.lat.toFixed(4)}, {locPicked.lng.toFixed(4)}
                  </p>
                ) : locQuery.trim().length > 0 ? (
                  <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: "#9A4F2A", margin: "0.375rem 0 0", lineHeight: 1.4 }}>
                    {t("locationMustPick")}
                  </p>
                ) : null}
              </div>
            </div>
            <div style={{ padding: "0.75rem 1.5rem", borderTop: `0.0625rem solid ${HAIRLINE}`, display: "flex", justifyContent: "flex-end", gap: "0.625rem", flexShrink: 0 }}>
              <button onClick={closeToolPanel}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "rgba(64,59,54,.06)", border: "none", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: "#716A5E" }}>{tc("cancel")}</button>
              <button
                onClick={handleSaveLoc}
                disabled={!canSaveLoc}
                style={{
                  padding: "0.5rem 1.25rem", borderRadius: "0.5rem",
                  background: canSaveLoc ? currentWing.accent : `${T.color.sandstone}40`,
                  color: canSaveLoc ? "#FFF" : "#716A5E",
                  border: "none", cursor: canSaveLoc ? "pointer" : "default",
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                }}>{t("saveLocation")}</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ═══ MOVE TO ROOM MODAL ═══ */}
      {movingMem && (
        <div
          onClick={() => { setMovingMem(null); setExpandedMoveWing(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(64,59,54,.35)",
            backdropFilter: "blur(0.75rem)",
            WebkitBackdropFilter: "blur(0.75rem)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "libFadeIn 0.2s ease both",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: CREAM,
              borderRadius: "1.25rem",
              boxShadow: "0 1.5rem 3rem rgba(64,59,54,0.18), inset 0 0.0625rem 0 rgba(255,255,255,0.5)",
              border: `0.0625rem solid ${HAIRLINE}`,
              width: "min(26rem, 90vw)",
              maxHeight: "min(32rem, 80vh)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "1.25rem 1.5rem 1rem",
              borderBottom: `0.0625rem solid ${HAIRLINE}`,
              flexShrink: 0,
            }}>
              <h3 style={{
                fontFamily: T.font.display, fontSize: "1.125rem",
                fontWeight: 600, color: "#403B36",
                margin: 0, letterSpacing: "0.01em",
              }}>
                {t("moveTo")}
              </h3>
              <p style={{
                fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.75rem",
                color: "#716A5E", margin: "0.25rem 0 0",
                letterSpacing: "0.02em",
              }}>
                {t("selectRoom")} — <strong>{movingMem.mem.title}</strong>
              </p>
            </div>

            {/* Wing/Room list */}
            <div style={{
              flex: 1, overflow: "auto",
              padding: "0.75rem 0",
            }}>
              {wings.map(wing => {
                const wRooms = getWingRooms(wing.id);
                const isExpanded = expandedMoveWing === wing.id;
                return (
                  <div key={wing.id}>
                    {/* Wing row */}
                    <button
                      onClick={() => setExpandedMoveWing(isExpanded ? null : wing.id)}
                      style={{
                        width: "100%",
                        padding: "0.625rem 1.5rem",
                        background: isExpanded ? `${wing.accent}0A` : "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        fontFamily: T.font.body,
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "#403B36",
                        letterSpacing: "0.01em",
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "rgba(64,59,54,.03)"; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = isExpanded ? `${wing.accent}0A` : "transparent"; }}
                    >
                      <WingIcon wingId={wing.id} size={18} color={wing.accent} />
                      <span style={{ flex: 1, textAlign: "left" }}>{translateWingName(wing, tWings)}</span>
                      <span style={{
                        fontSize: "0.6875rem", color: "#716A5E",
                        fontWeight: 500,
                      }}>
                        {wRooms.length}
                      </span>
                      <svg
                        width="12" height="12" viewBox="0 0 12 12"
                        fill="none" stroke={"#716A5E"} strokeWidth="1.5" strokeLinecap="round"
                        style={{
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                          flexShrink: 0,
                        }}
                      >
                        <path d="M4 2l4 4-4 4" />
                      </svg>
                    </button>

                    {/* Rooms (expanded) */}
                    {isExpanded && wRooms.map(room => {
                      const isCurrent = room.id === movingMem.fromRoom;
                      return (
                        <button
                          key={room.id}
                          onClick={() => { if (!isCurrent) handleMoveToRoom(room.id); }}
                          disabled={isCurrent}
                          style={{
                            width: "100%",
                            padding: "0.5rem 1.5rem 0.5rem 3.25rem",
                            background: isCurrent ? `${wing.accent}08` : "transparent",
                            border: "none",
                            cursor: isCurrent ? "default" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontFamily: T.font.body,
                            fontSize: "0.8125rem",
                            fontWeight: 500,
                            color: isCurrent ? "#716A5E" : "#716A5E",
                            letterSpacing: "0.01em",
                            opacity: isCurrent ? 0.6 : 1,
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = `${wing.accent}12`; }}
                          onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = isCurrent ? `${wing.accent}08` : "transparent"; }}
                        >
                          <RoomGlyph room={room} size={15} color={wing.accent} />
                          <span style={{ flex: 1, textAlign: "left" }}>{translateRoomName(room, tWings)}</span>
                          {isCurrent && (
                            <span style={{
                              fontSize: "0.625rem",
                              fontWeight: 500,
                              color: wing.accent,
                              letterSpacing: "0.04em",
                              textTransform: "uppercase" as const,
                            }}>
                              {t("currentRoom")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer / Cancel */}
            <div style={{
              padding: "0.75rem 1.5rem",
              borderTop: `0.0625rem solid ${HAIRLINE}`,
              display: "flex", justifyContent: "flex-end",
              flexShrink: 0,
            }}>
              <button
                onClick={() => { setMovingMem(null); setExpandedMoveWing(null); }}
                style={{
                  padding: "0.4375rem 1rem",
                  borderRadius: "0.5rem",
                  background: "rgba(64,59,54,.06)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "#716A5E",
                  letterSpacing: "0.01em",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(64,59,54,.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(64,59,54,.06)"}
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BULK MOVE MODAL ═══ */}
      {bulkMoving && selectedRoom && selectedMemIds.size > 0 && (
        <div
          onClick={() => { setBulkMoving(false); setExpandedMoveWing(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(64,59,54,.35)",
            backdropFilter: "blur(0.75rem)",
            WebkitBackdropFilter: "blur(0.75rem)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "libFadeIn 0.2s ease both",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: CREAM,
              borderRadius: "1.25rem",
              boxShadow: "0 1.5rem 3rem rgba(64,59,54,0.18), inset 0 0.0625rem 0 rgba(255,255,255,0.5)",
              border: `0.0625rem solid ${HAIRLINE}`,
              width: "min(26rem, 90vw)",
              maxHeight: "min(32rem, 80vh)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            <div style={{
              padding: "1.25rem 1.5rem 1rem",
              borderBottom: `0.0625rem solid ${HAIRLINE}`,
              flexShrink: 0,
            }}>
              <h3 style={{
                fontFamily: T.font.display, fontSize: "1.125rem",
                fontWeight: 600, color: "#403B36",
                margin: 0, letterSpacing: "0.01em",
              }}>
                {t("moveSelected")}
              </h3>
              <p style={{
                fontFamily: T.font.body, fontSize: isMobile ? "0.8125rem" : "0.75rem",
                color: "#716A5E", margin: "0.25rem 0 0",
                letterSpacing: "0.02em",
              }}>
                {t("bulkMoveDesc", { count: String(selectedMemIds.size) })}
              </p>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "0.75rem 0" }}>
              {wings.map(wing => {
                const wRooms = getWingRooms(wing.id);
                const isExpanded = expandedMoveWing === wing.id;
                return (
                  <div key={wing.id}>
                    <button
                      onClick={() => setExpandedMoveWing(isExpanded ? null : wing.id)}
                      style={{
                        width: "100%", padding: "0.625rem 1.5rem",
                        background: isExpanded ? `${wing.accent}0A` : "transparent",
                        border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: "0.625rem",
                        fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                        color: "#403B36", letterSpacing: "0.01em",
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "rgba(64,59,54,.03)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isExpanded ? `${wing.accent}0A` : "transparent"; }}
                    >
                      <WingIcon wingId={wing.id} size={18} color={wing.accent} />
                      <span style={{ flex: 1, textAlign: "left" }}>{translateWingName(wing, tWings)}</span>
                      <span style={{ fontSize: "0.6875rem", color: "#716A5E", fontWeight: 500 }}>{wRooms.length}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={"#716A5E"} strokeWidth="1.5" strokeLinecap="round"
                        style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}
                      ><path d="M4 2l4 4-4 4" /></svg>
                    </button>
                    {isExpanded && wRooms.map(room => {
                      const isCurrent = room.id === selectedRoom;
                      return (
                        <button
                          key={room.id}
                          onClick={() => { if (!isCurrent) handleBulkMoveToRoom(room.id); }}
                          disabled={isCurrent}
                          style={{
                            width: "100%", padding: "0.5rem 1.5rem 0.5rem 3.25rem",
                            background: isCurrent ? `${wing.accent}08` : "transparent",
                            border: "none", cursor: isCurrent ? "default" : "pointer",
                            display: "flex", alignItems: "center", gap: "0.5rem",
                            fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
                            color: isCurrent ? "#716A5E" : "#716A5E",
                            letterSpacing: "0.01em", opacity: isCurrent ? 0.6 : 1,
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = `${wing.accent}12`; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? `${wing.accent}08` : "transparent"; }}
                        >
                          <RoomGlyph room={room} size={15} color={wing.accent} />
                          <span style={{ flex: 1, textAlign: "left" }}>{translateRoomName(room, tWings)}</span>
                          {isCurrent && (
                            <span style={{
                              fontSize: "0.625rem", fontWeight: 500, color: wing.accent,
                              letterSpacing: "0.04em", textTransform: "uppercase" as const,
                            }}>{t("currentRoom")}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div style={{
              padding: "0.75rem 1.5rem",
              borderTop: `0.0625rem solid ${HAIRLINE}`,
              display: "flex", justifyContent: "flex-end", flexShrink: 0,
            }}>
              <button
                onClick={() => { setBulkMoving(false); setExpandedMoveWing(null); }}
                style={{
                  padding: "0.4375rem 1rem", borderRadius: "0.5rem",
                  background: "rgba(64,59,54,.06)", border: "none", cursor: "pointer",
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
                  color: "#716A5E", letterSpacing: "0.01em", transition: "background 0.15s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(64,59,54,.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(64,59,54,.06)"}
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MOVED TOAST ═══ */}
      {/* Publish modal */}
      {showPublishModal && (
        <Suspense fallback={null}>
          <PublishModal
            onClose={() => setShowPublishModal(false)}
          />
        </Suspense>
      )}

      {/* ═══ TOUCH DRAG: DROP TRAY ═══ */}
      {/* Fixed bottom tray during a long-press tile drag — room chips grouped
          per wing; the chip under the finger highlights (rAF hit-test); drop
          resolves via elementFromPoint against data-drop-room-id. */}
      {touchDragMemId && (
        <div data-drop-tray="" style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 10050,
          background: CREAM,
          borderTop: `0.0625rem solid ${HAIRLINE}`,
          boxShadow: "0 -0.5rem 2rem rgba(64,59,54,0.18)",
          padding: "0.6rem 0.75rem calc(0.6rem + env(safe-area-inset-bottom, 0px))",
        }}>
          <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#716A5E", margin: "0 0 0.4rem" }}>
            {t("dropTrayTitle")}
          </p>
          {/* Vertically scrollable wrap-grid: every wing is a row whose chips
              WRAP, so (nearly) all rooms are visible at once — the old single
              horizontal rail hid everything past ~3 chips with no way to
              scroll one-fingered. Overflow scrolls via the edge-auto-scroll
              loop (finger near the tray's top/bottom edge). */}
          <div
            ref={trayScrollRef}
            style={{
              maxHeight: "min(38dvh, 19rem)",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              display: "flex", flexDirection: "column", gap: "0.55rem",
              paddingBottom: "0.15rem",
            }}
          >
            {wings.map(w => {
              const wRooms = getWingRooms(w.id);
              if (wRooms.length === 0) return null;
              return (
                <div key={w.id}>
                  {/* wing overline */}
                  <span style={{ display: "block", fontFamily: T.font.body, fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: w.accent, marginBottom: "0.25rem" }}>
                    {w.id === "attic" ? t("storageRoom") : translateWingName(w, tWings)}
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {wRooms.map(r => {
                      const hover = touchHoverRoomId === r.id;
                      return (
                        <div
                          key={r.id}
                          data-drop-room-id={r.id}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "0.35rem",
                            minHeight: "2.75rem", padding: "0 0.625rem", borderRadius: "0.75rem",
                            border: `0.0625rem solid ${hover ? w.accent : HAIRLINE}`,
                            background: hover ? `${w.accent}22` : "#FFF",
                            boxShadow: hover ? `0 0 0 0.125rem ${w.accent}55` : "none",
                            fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                            color: "#403B36", whiteSpace: "nowrap",
                          }}
                        >
                          <RoomGlyph room={r} wingId={w.id} size={16} color={w.accent} />
                          {translateRoomName(r, tWings)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ TOUCH DRAG: FIRST-USE HINT (once per session) ═══ */}
      {dragHintVisible && (
        <div role="status" style={{
          position: "fixed", left: "50%", transform: "translateX(-50%)",
          bottom: "calc(6.75rem + env(safe-area-inset-bottom, 0px))", zIndex: 10058,
          background: "rgba(64,59,54,.9)", color: "#FCFAF5",
          fontFamily: T.font.body, fontSize: "0.8125rem", lineHeight: 1.4,
          padding: "0.5rem 1rem", borderRadius: "2rem",
          boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,.25)",
          maxWidth: "min(20rem, calc(100vw - 2rem))", textAlign: "center",
          pointerEvents: "none",
        }}>
          {t("dragHintMobile")}
        </div>
      )}

      {movedToast && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          background: "rgba(64,59,54,.88)",
          backdropFilter: "blur(0.75rem)",
          WebkitBackdropFilter: "blur(0.75rem)",
          color: T.color.linen,
          padding: "0.625rem 1.25rem",
          borderRadius: "0.75rem",
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          fontWeight: 500,
          letterSpacing: "0.02em",
          boxShadow: "0 0.5rem 1.5rem rgba(64,59,54,.2)",
          animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}>
          {t("moved")}
        </div>
      )}
    </div>
  );
}
