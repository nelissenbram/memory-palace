"use client";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useThumbnailBackfill } from "@/lib/hooks/useThumbnailBackfill";
import { getDemoMems, demosVisible, setDemosHidden } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import MemoryDetail from "@/components/ui/MemoryDetail";
import RoomMediaPlayer from "@/components/ui/RoomMediaPlayer";
import UploadPanel from "@/components/ui/UploadPanel";
import ImportHub from "@/components/ui/ImportHub";
import type { QueuedFile } from "@/components/ui/ImportHub";
import NotificationBell from "@/components/ui/NotificationBell";
import Image from "next/image";
import { LibraryRoomCard, LibraryMemoryCard } from "@/components/ui/LibraryCards";
import LibrarySidebar from "@/components/ui/LibrarySidebar";
import { geocodeLocationName } from "@/lib/geocode";
import { LibrarySearch } from "@/components/ui/LibrarySearch";
import { LibraryStyles, LibraryHeader, LibraryEmptyState } from "@/components/ui/LibraryAnimations";
import TuscanStyles from "./TuscanStyles";
import TuscanCard from "./TuscanCard";
import WingManagerPanel from "@/components/ui/WingManagerPanel";
import RoomManagerPanel from "@/components/ui/RoomManagerPanel";
import { WingIcon, RoomIcon } from "./WingRoomIcons";
import { useUIPanelStore } from "@/lib/stores/uiPanelStore";
import { TYPE_ICONS, TypeIcon } from "@/lib/constants/type-icons";

interface CloudItem {
  id: string;
  name: string;
  thumbnailUrl?: string;
  provider: string;
  isFolder: boolean;
  path: string;
}

const ChainLinkIcon = ({ size = "2.5rem", opacity = 0.5 }: { size?: string; opacity?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const FolderIcon = () => (
  <svg width="2.5rem" height="2.5rem" viewBox="0 0 24 24" fill={T.color.sandstone} stroke={T.color.walnut} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
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

  const providerConfig: Record<string, { browseUrl: string; connectUrl: string }> = {
    googlePhotos: { browseUrl: "/api/integrations/google/photos", connectUrl: "/api/integrations/google/connect" },
    dropbox: { browseUrl: "/api/integrations/dropbox/browse", connectUrl: "/api/integrations/dropbox/connect" },
    onedrive: { browseUrl: "/api/integrations/onedrive/browse", connectUrl: "/api/integrations/onedrive/connect" },
    applePhotos: { browseUrl: "", connectUrl: "/settings/connections" },
  };

  const config = providerConfig[provider] || { browseUrl: "", connectUrl: "" };
  const providerLabel = t(provider as "googlePhotos" | "dropbox" | "onedrive" | "applePhotos");

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
        background: "rgba(44,44,42,.35)",
        backdropFilter: "blur(0.75rem)",
        WebkitBackdropFilter: "blur(0.75rem)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "libFadeIn 0.2s ease both",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "rgba(255,255,255,.96)",
          backdropFilter: "blur(1.5rem) saturate(1.4)",
          WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
          borderRadius: "1.25rem",
          boxShadow: "0 1.5rem 3rem rgba(44,44,42,.18), 0 0.5rem 1.25rem rgba(44,44,42,.08), inset 0 0.0625rem 0 rgba(255,255,255,.7)",
          border: `0.0625rem solid ${T.color.cream}`,
          width: "min(36rem, 92vw)",
          maxHeight: "min(36rem, 85vh)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `0.0625rem solid ${T.color.cream}`, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: T.color.charcoal, margin: 0 }}>
                {t("cloudBrowseTitle", { provider: providerLabel })}
              </h3>
              <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: "0.25rem 0 0" }}>
                {status === "connected" ? t("cloudBrowseConnected", { count: String(items.length) }) : t("cloudBrowseLoading")}
              </p>
            </div>
            <button onClick={onClose} aria-label={tc("close")} style={{ width: "2rem", height: "2rem", borderRadius: "1rem", border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone, color: T.color.muted, fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
          </div>

          {/* Breadcrumb navigation */}
          {status === "connected" && (
            <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.625rem", flexWrap: "wrap" }}>
              <button
                onClick={() => navigateToFolder("")}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "0.125rem 0.25rem",
                  fontFamily: T.font.body, fontSize: "0.75rem", color: currentPath ? T.color.terracotta : T.color.charcoal,
                  fontWeight: currentPath ? 400 : 600, textDecoration: currentPath ? "underline" : "none",
                }}
              >
                {t("cloudBreadcrumbRoot")}
              </button>
              {breadcrumbSegments.map((seg, i) => {
                const segPath = breadcrumbSegments.slice(0, i + 1).join("/");
                const isLast = i === breadcrumbSegments.length - 1;
                return (
                  <span key={segPath} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>/</span>
                    <button
                      onClick={() => !isLast && navigateToFolder(segPath)}
                      style={{
                        background: "none", border: "none", cursor: isLast ? "default" : "pointer",
                        padding: "0.125rem 0.25rem",
                        fontFamily: T.font.body, fontSize: "0.75rem",
                        color: isLast ? T.color.charcoal : T.color.terracotta,
                        fontWeight: isLast ? 600 : 400,
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
                  color: T.color.walnut,
                }}
              >
                {allSelectableSelected ? t("cloudDeselectAll") : t("cloudSelectAll")}
              </button>
              {selected.size > 0 && (
                <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted }}>
                  {t("cloudItemsSelected", { count: String(selected.size) })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "1.25rem 1.5rem" }}>
          {status === "loading" && (
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <div style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>{t("cloudBrowseLoading")}</div>
            </div>
          )}

          {status === "not_connected" && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "center" }}>
                <ChainLinkIcon />
              </div>
              <h4 style={{ fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600, color: T.color.charcoal, margin: "0 0 0.5rem" }}>
                {t("cloudNotConnected", { provider: providerLabel })}
              </h4>
              <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted, marginBottom: "1.25rem", lineHeight: 1.5 }}>
                {t("cloudConnectExplain", { provider: providerLabel })}
              </p>
              <button
                onClick={() => { window.location.href = config.connectUrl; }}
                style={{
                  padding: "0.625rem 1.5rem", borderRadius: "0.625rem",
                  background: T.color.charcoal, color: T.color.linen,
                  border: "none", cursor: "pointer",
                  fontFamily: T.font.body, fontSize: "0.875rem", fontWeight: 600,
                  letterSpacing: "0.03em",
                }}
              >
                {t("cloudConnectBtn", { provider: providerLabel })}
              </button>
              <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, marginTop: "0.75rem" }}>
                {t("cloudConnectHint")}
              </p>
            </div>
          )}

          {status === "error" && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>{t("cloudBrowseError")}</p>
            </div>
          )}

          {status === "connected" && items.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>{t("cloudBrowseEmpty")}</p>
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
                        fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.walnut,
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
                      <img src={item.thumbnailUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <svg width="2rem" height="2rem" viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth="1.5" style={{ opacity: 0.3 }}>
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
        <div style={{ padding: "0.75rem 1.5rem", borderTop: `0.0625rem solid ${T.color.cream}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted }}>
            {selected.size > 0 ? t("cloudSelected", { count: String(selected.size) }) : ""}
          </span>
          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button onClick={onClose}
              style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "rgba(44,44,42,.06)", border: "none", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: T.color.walnut }}>{tc("cancel")}</button>
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

export default function LibraryView() {
  const isMobile = useIsMobile();
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { getWings, getWingRooms } = useRoomStore();
  const { userMems, fetchRoomMemories } = useMemoryStore();
  const { setNavMode, enterCorridor, enterRoom, activeWing: storeActiveWing } = usePalaceStore();

  const { addMemory, updateMemory, deleteMemory, moveMemory } = useMemoryStore();

  const wings = getWings();
  const [selectedWing, setSelectedWing] = useState<string>(wings[0]?.id || "family");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [detailMem, setDetailMem] = useState<{ mem: Mem; wingId: string; roomId: string } | null>(null);
  const [showUploadFor, setShowUploadFor] = useState<{ wingId: string; roomId: string } | null>(null);
  const [movingMem, setMovingMem] = useState<{ mem: Mem; fromRoom: string } | null>(null);
  const [bulkMoving, setBulkMoving] = useState(false);
  const [expandedMoveWing, setExpandedMoveWing] = useState<string | null>(null);
  const [movedToast, setMovedToast] = useState(false);
  const [showWingManager, setShowWingManager] = useState(false);
  const [showRoomManager, setShowRoomManager] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "timeline">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("libraryViewMode") as "grid" | "list" | "timeline") || "grid";
    }
    return "grid";
  });
  const [cloudBrowserProvider, setCloudBrowserProvider] = useState<string | null>(null);
  const [showImportHub, setShowImportHub] = useState(false);
  const [showDemos, setShowDemos] = useState(() => demosVisible());
  const [activeToolPanel, setActiveToolPanel] = useState<"writeStory" | "aiLabel" | "addLocation" | null>(null);
  const [toolbarHint, setToolbarHint] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [aiLabelProcessing, setAiLabelProcessing] = useState(false);
  const [aiLabelSelected, setAiLabelSelected] = useState<Set<string>>(new Set());
  const [aiLabelProgress, setAiLabelProgress] = useState<{ current: number; total: number } | null>(null);
  const [aiLabelResults, setAiLabelResults] = useState<Record<string, { description: string; labels: string[]; saved?: boolean }>>({});
  const [aiLabelEditing, setAiLabelEditing] = useState<string | null>(null);
  const [aiLabelEditText, setAiLabelEditText] = useState("");
  const [aiLabelError, setAiLabelError] = useState<string | null>(null);
  const [aiLabelDone, setAiLabelDone] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationLat, setLocationLat] = useState("");
  const [locationLng, setLocationLng] = useState("");
  const [showAiSortBanner, setShowAiSortBanner] = useState(false);
  const [showManualSortBanner, setShowManualSortBanner] = useState(false);
  const [visibleMemCount, setVisibleMemCount] = useState(50);
  const [sortMode, setSortMode] = useState<"newest" | "oldest" | "alpha" | "type">("newest");
  const [selectedMemIds, setSelectedMemIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [lightboxMem, setLightboxMem] = useState<Mem | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [batchTagInput, setBatchTagInput] = useState("");
  const [showBatchTag, setShowBatchTag] = useState(false);
  const [detailPanelMem, setDetailPanelMem] = useState<{ mem: Mem; wingId: string; roomId: string } | null>(null);
  const [mediaPlayerIndex, setMediaPlayerIndex] = useState<number | null>(null);
  const [roomLoading, setRoomLoading] = useState(false);
  const [spotlightTarget, setSpotlightTarget] = useState<string | null>(null);
  const spotlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Brief loading state when entering a room to avoid skeleton+empty flash
  useEffect(() => {
    if (selectedRoom) {
      setRoomLoading(true);
      const timer = setTimeout(() => setRoomLoading(false), 300);
      return () => clearTimeout(timer);
    }
    setRoomLoading(false);
  }, [selectedRoom]);

  // Persist viewMode to localStorage (P1 #11)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("libraryViewMode", viewMode);
    }
  }, [viewMode]);

  // Read spotlight flag from Atrium CTA navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = localStorage.getItem("mp_spotlight_target");
    if (target) {
      localStorage.removeItem("mp_spotlight_target");
      // Map Atrium spotlight IDs to toolbar button keys
      const spotlightMap: Record<string, string> = {
        "ai-enhance": "aiLabel",
        "write-stories": "writeStory",
        "organize": "addLocation",
        "import-upload": "importUpload",
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

  const handleCloudProvider = useCallback((provider: string) => {
    setShowImportHub(false);
    setCloudBrowserProvider(provider);
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
    // Prefer explicit room from ImportHub selector; fall back to current selection
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
      });
    }
  }, [selectedRoom, selectedWing, wings, getWingRooms, fetchRoomMemories, addMemory, readFileWithTimeout]);

  const wingRooms = useMemo(() => {
    if (selectedWing === "__all__") {
      return wings.flatMap(w => getWingRooms(w.id));
    }
    return getWingRooms(selectedWing);
  }, [selectedWing, wings, getWingRooms]);
  // Fetch memories for all rooms of selected wing on mount/change
  const wingRoomIds = wingRooms.map(r => r.id).join(",");
  useEffect(() => {
    for (const id of wingRoomIds.split(",")) {
      if (id) fetchRoomMemories(id);
    }
  }, [wingRoomIds, fetchRoomMemories]);

  // Prefetch all wings on mount for cross-wing search
  useEffect(() => {
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        fetchRoomMemories(r.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get memories for a room
  const getMemsForRoom = useCallback((roomId: string): Mem[] => {
    return userMems[roomId] || getDemoMems(roomId);
  }, [userMems]);

  // All memories across selected wing
  const allWingMems = useMemo(() => {
    return wingRooms.flatMap(r => getMemsForRoom(r.id));
  }, [wingRooms, getMemsForRoom]);

  // Filtered memories
  const q = query.toLowerCase();
  const filteredRoomMems = useMemo(() => {
    if (!selectedRoom) return [];
    let mems = getMemsForRoom(selectedRoom);
    if (q) mems = mems.filter(m =>
      m.title.toLowerCase().includes(q)
      || (m.desc || "").toLowerCase().includes(q)
      || (m.locationName || "").toLowerCase().includes(q)
      || (m.historicalContext || "").toLowerCase().includes(q)
      || m.type.toLowerCase().includes(q)
    );
    if (filterType) mems = mems.filter(m => normalizeDisplayType(m.type) === filterType);
    // Sort (P1 #7)
    mems = [...mems].sort((a, b) => {
      switch (sortMode) {
        case "newest": return (b.createdAt || "").localeCompare(a.createdAt || "");
        case "oldest": return (a.createdAt || "").localeCompare(b.createdAt || "");
        case "alpha": return a.title.localeCompare(b.title);
        case "type": return a.type.localeCompare(b.type);
        default: return 0;
      }
    });
    return mems;
  }, [selectedRoom, getMemsForRoom, q, filterType, sortMode]);

  // Backfill missing video thumbnails for the selected room (background, throttled)
  useThumbnailBackfill(selectedRoom, filteredRoomMems);

  // Cross-wing search results
  const crossWingResults = useMemo(() => {
    if (!q || selectedRoom) return null;
    const results: { wing: Wing; room: WingRoom; mem: Mem }[] = [];
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        const mems = getMemsForRoom(r.id);
        for (const m of mems) {
          if (
            m.title.toLowerCase().includes(q)
            || (m.desc || "").toLowerCase().includes(q)
            || (m.locationName || "").toLowerCase().includes(q)
            || (m.historicalContext || "").toLowerCase().includes(q)
            || m.type.toLowerCase().includes(q)
          ) {
            results.push({ wing: w, room: r, mem: m });
          }
        }
      }
    }
    return results.length > 0 ? results : null;
  }, [q, selectedRoom, wings, getWingRooms, getMemsForRoom]);

  // Get unique types in room for filter chips + counts
  // Normalize display types for consistent categorization
  const normalizeDisplayType = (type: string) => {
    if (type === "painting") return "photo";
    if (type === "voice") return "interview";
    return type;
  };

  const roomTypes = useMemo(() => {
    if (!selectedRoom) return [];
    const mems = getMemsForRoom(selectedRoom);
    return [...new Set(mems.map(m => normalizeDisplayType(m.type)))];
  }, [selectedRoom, getMemsForRoom]);

  const roomTypeCounts = useMemo(() => {
    if (!selectedRoom) return {};
    const mems = getMemsForRoom(selectedRoom);
    const counts: Record<string, number> = {};
    for (const m of mems) {
      const type = normalizeDisplayType(m.type);
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }, [selectedRoom, getMemsForRoom]);

  // Result count for search badge
  const searchResultCount = useMemo(() => {
    if (!query) return undefined;
    if (selectedRoom) return filteredRoomMems.length;
    if (crossWingResults) return crossWingResults.length;
    return 0;
  }, [query, selectedRoom, filteredRoomMems, crossWingResults]);

  // Wing memory count
  const wingMemCount = useCallback((wingId: string) => {
    return getWingRooms(wingId).reduce((sum, r) => sum + (getMemsForRoom(r.id)).length, 0);
  }, [getWingRooms, getMemsForRoom]);

  const currentWing = wings.find(w => w.id === selectedWing) || wings[0];

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

  const { setShowSharedWithMe } = useUIPanelStore();

  const sharedCount = useMemo(() => {
    let count = 0;
    for (const w of wings) {
      for (const r of getWingRooms(w.id)) {
        if (r.shared) count++;
      }
    }
    return count;
  }, [wings, getWingRooms]);

  const handleBackToRooms = useCallback(() => {
    setSelectedRoom(null);
    setQuery("");
    setFilterType(null);
    setVisibleMemCount(50);
  }, []);

  // Keyboard: Escape to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showImportHub) setShowImportHub(false);
        else if (mediaPlayerIndex !== null) setMediaPlayerIndex(null);
        else if (lightboxMem) setLightboxMem(null);
        else if (detailPanelMem) setDetailPanelMem(null);
        else if (movingMem) setMovingMem(null);
        else if (detailMem) setDetailMem(null);
        else if (showUploadFor) setShowUploadFor(null);
        else if (selectedRoom) handleBackToRooms();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showImportHub, mediaPlayerIndex, lightboxMem, detailPanelMem, movingMem, detailMem, showUploadFor, selectedRoom, handleBackToRooms]);

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
    setMovedToast(true);
    setTimeout(() => setMovedToast(false), 2200);
  }, [movingMem, moveMemory]);

  const handleBulkMoveToRoom = useCallback((targetRoomId: string) => {
    if (!selectedRoom || selectedMemIds.size === 0) return;
    for (const memId of selectedMemIds) {
      moveMemory(selectedRoom, targetRoomId, memId);
    }
    setSelectedMemIds(new Set());
    setBulkMoving(false);
    setExpandedMoveWing(null);
    setSelectMode(false);
    setMovedToast(true);
    setTimeout(() => setMovedToast(false), 2200);
  }, [selectedRoom, selectedMemIds, moveMemory]);

  const handleEnter3D = () => {
    setNavMode("3d");
    if (selectedRoom) {
      enterCorridor(selectedWing);
      setTimeout(() => enterRoom(selectedRoom), 600);
    } else {
      enterCorridor(selectedWing);
    }
  };

  return (
    <div style={{
      width: "100vw", height: "100dvh", display: "flex", flexDirection: isMobile ? "column" : "row",
      background: `linear-gradient(175deg, ${T.color.linen} 0%, ${T.color.warmStone} 55%, ${T.color.cream} 100%)`, fontFamily: T.font.body, overflow: "hidden",
    }}>
      <LibraryStyles />
      <TuscanStyles />
      {/* Spotlight pulse animation */}
      <style>{`@keyframes spotlightPulse{0%,100%{box-shadow:0 0 0 0.1875rem rgba(193,127,89,0.25),0 0.25rem 1rem rgba(193,127,89,0.2)}50%{box-shadow:0 0 0 0.375rem rgba(193,127,89,0.35),0 0.25rem 1rem rgba(193,127,89,0.3)}}`}</style>

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
                onSelectWing={(wingId: string) => { setSelectedWing(wingId); setSelectedRoom(null); setQuery(""); setFilterType(null); setMobileSidebarOpen(false); }}
                wingMemCount={wingMemCount}
                onEnter3D={handleEnter3D}
                isMobile={isMobile}
                onAddWing={() => setShowWingManager(true)}
                onAddRoom={() => setShowRoomManager(true)}
                selectedWingName={currentWing.id === "attic" ? t("storageRoom") : currentWing.name}
                selectedRoomName={selectedRoom ? (wingRooms.find(r => r.id === selectedRoom)?.name || undefined) : undefined}
                sharedCount={sharedCount}
                onSharedClick={() => setShowSharedWithMe(true)}
              />
            </div>
          </div>
        )
      ) : (
        <LibrarySidebar
          wings={wings}
          selectedWing={selectedWing}
          onSelectWing={(wingId: string) => { setSelectedWing(wingId); setSelectedRoom(null); setQuery(""); setFilterType(null); }}
          wingMemCount={wingMemCount}
          onEnter3D={handleEnter3D}
          isMobile={isMobile}
          onAddWing={() => setShowWingManager(true)}
          onAddRoom={() => setShowRoomManager(true)}
          selectedWingName={currentWing.id === "attic" ? t("storageRoom") : currentWing.name}
          selectedRoomName={selectedRoom ? (wingRooms.find(r => r.id === selectedRoom)?.name || undefined) : undefined}
          sharedCount={sharedCount}
          onSharedClick={() => setShowSharedWithMe(true)}
        />
      )}

      {/* ═══ MAIN CONTENT ═══ */}
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
              backdropFilter: "blur(0.75rem)",
              WebkitBackdropFilter: "blur(0.75rem)",
              flexShrink: 0,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              borderBottom: `0.0625rem solid ${T.color.cream}88`,
            }}>
              {/* "W" section label */}
              <span style={{
                fontFamily: T.font.display, fontSize: "0.6875rem", fontWeight: 700,
                color: T.color.gold, letterSpacing: "0.04em",
                flexShrink: 0, padding: "0 0.125rem",
                opacity: 0.7,
              }}>W</span>
              {/* "All" pill for wings */}
              {(() => {
                const isAllActive = selectedWing === "__all__";
                return (
                  <button
                    onClick={() => { setSelectedWing("__all__"); setSelectedRoom(null); setQuery(""); setFilterType(null); }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.25rem",
                      padding: "0.375rem 0.75rem",
                      borderRadius: "1rem",
                      border: isAllActive ? `0.125rem solid ${T.color.gold}` : `0.0625rem solid ${T.color.cream}`,
                      background: isAllActive ? `${T.color.gold}12` : T.color.white,
                      cursor: "pointer", flexShrink: 0,
                      minHeight: "2.125rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem",
                      fontWeight: isAllActive ? 700 : 500,
                      color: isAllActive ? T.color.gold : T.color.charcoal,
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
                    onClick={() => { setSelectedWing(w.id); setSelectedRoom(null); setQuery(""); setFilterType(null); }}
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
                    <WingIcon wingId={w.id} size={14} color={isActive ? w.accent : T.color.muted} />
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: isActive ? 700 : 500,
                      color: isActive ? w.accent : T.color.charcoal,
                      whiteSpace: "nowrap",
                    }}>
                      {w.id === "attic" ? t("storageRoom") : w.name}
                    </span>
                  </button>
                );
              })}
              {/* Add wing pill */}
              <button
                onClick={() => setShowWingManager(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.25rem",
                  padding: "0.375rem 0.625rem",
                  borderRadius: "1rem",
                  border: `0.0625rem dashed ${T.color.muted}55`,
                  background: "transparent",
                  cursor: "pointer", flexShrink: 0,
                  minHeight: "2.125rem",
                }}
                aria-label={t("addWingLabel")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
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
            }}>
              {/* "R" section label */}
              <span style={{
                fontFamily: T.font.display, fontSize: "0.6875rem", fontWeight: 700,
                color: currentWing.accent, letterSpacing: "0.04em",
                flexShrink: 0, padding: "0 0.125rem",
                opacity: 0.55,
              }}>R</span>
              {/* "All" pill — shows all rooms in wing */}
              <button
                onClick={() => { setSelectedRoom(null); setQuery(""); setFilterType(null); }}
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
                  color: !selectedRoom ? currentWing.accent : T.color.charcoal,
                }}>
                  {t("allRooms")}
                </span>
              </button>
              {wingRooms.map((room) => {
                const isActive = room.id === selectedRoom;
                return (
                  <button
                    key={room.id}
                    onClick={() => { setSelectedRoom(room.id); setQuery(""); setFilterType(null); }}
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
                    <RoomIcon roomId={room.id} size={14} color={isActive ? currentWing.accent : T.color.muted} />
                    <span style={{
                      fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: isActive ? 700 : 500,
                      color: isActive ? currentWing.accent : T.color.charcoal,
                      whiteSpace: "nowrap",
                    }}>
                      {room.name}
                    </span>
                  </button>
                );
              })}
              {/* Add room pill */}
              <button
                onClick={() => setShowRoomManager(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.25rem",
                  padding: "0.375rem 0.625rem",
                  borderRadius: "1rem",
                  border: `0.0625rem dashed ${T.color.muted}55`,
                  background: "transparent",
                  cursor: "pointer", flexShrink: 0,
                  minHeight: "2.125rem",
                }}
                aria-label={t("addRoomLabel")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.color.muted} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </button>
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
              {/* Sort settings button */}
              <button
                onClick={() => setMobileSortOpen(prev => !prev)}
                aria-label={t("sortLabel")}
                style={{
                  width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem",
                  border: `0.0625rem solid ${mobileSortOpen ? currentWing.accent : T.color.cream}`,
                  background: mobileSortOpen ? `${currentWing.accent}10` : T.color.white,
                  cursor: "pointer", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={mobileSortOpen ? currentWing.accent : T.color.walnut} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M6 12h12M9 18h6" />
                </svg>
              </button>
              {/* Sort popup */}
              {mobileSortOpen && (
                <div style={{
                  position: "absolute", top: "100%", right: "0.75rem", zIndex: 20,
                  background: T.color.white, borderRadius: "0.75rem",
                  border: `0.0625rem solid ${T.color.cream}`,
                  boxShadow: "0 0.5rem 1.5rem rgba(44,44,42,0.12)",
                  padding: "0.375rem", minWidth: "10rem",
                  animation: "libFadeIn 0.15s ease both",
                }}>
                  {(["newest", "oldest", "alpha", "type"] as const).map((mode) => (
                    <button
                      key={mode}
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
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sortMode === mode ? currentWing.accent : T.color.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {mode === "newest" && <><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></>}
                        {mode === "oldest" && <><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>}
                        {mode === "alpha" && <><path d="M3 6h7M3 12h5M3 18h3" /><path d="M17 3l4 4-4 4" /><path d="M21 7H14" /></>}
                        {mode === "type" && <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>}
                      </svg>
                      <span style={{
                        fontFamily: T.font.body, fontSize: "0.8125rem",
                        fontWeight: sortMode === mode ? 600 : 400,
                        color: sortMode === mode ? currentWing.accent : T.color.charcoal,
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
          <div style={{ display: "flex", alignItems: "stretch", flexShrink: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <LibraryHeader
                wingIcon={currentWing.icon}
                wingId={currentWing.id}
                wingName={currentWing.name}
                wingDesc={currentWing.desc}
                roomName={selectedRoom ? (wingRooms.find(r => r.id === selectedRoom)?.name || undefined) : undefined}
                accent={currentWing.accent}
                onBack={selectedRoom ? handleBackToRooms : undefined}
                onAdd={selectedRoom ? () => setShowUploadFor({ wingId: selectedWing, roomId: selectedRoom }) : undefined}
                isMobile={isMobile}
              />
            </div>
            <div data-nudge="library_search" style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "1rem 1.5rem 1rem 0",
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(0.75rem)",
              WebkitBackdropFilter: "blur(0.75rem)",
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

        {/* Room tools toolbar — always visible */}
        <div data-nudge="library_tools" style={{ display: "flex", gap: isMobile ? "0.25rem" : "0.5rem", padding: isMobile ? "0.25rem 0.5rem 0.5rem" : "0.25rem 2.5rem 0.75rem", flexWrap: "nowrap", alignItems: "center", overflowX: isMobile ? "auto" : undefined }}>
          {([
            { key: "writeStory" as const, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
            { key: "aiLabel" as const, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.09 6.26L20 10l-4.91 3.74L17.18 20 12 16.27 6.82 20l2.09-6.26L4 10l5.91-1.74z"/></svg> },
            { key: "addLocation" as const, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> },
          ]).map(btn => {
            const isSpotlit = spotlightTarget === btn.key;
            return (
            <button key={btn.key} data-spotlight-id={btn.key} onClick={() => {
                if (isSpotlit) setSpotlightTarget(null);
                if (selectedRoom) {
                  setActiveToolPanel(btn.key);
                } else {
                  setToolbarHint(true);
                  setTimeout(() => setToolbarHint(false), 2500);
                }
              }}
              style={{
                display: "flex", alignItems: "center", gap: isMobile ? "0.25rem" : "0.5rem",
                padding: isMobile ? "0.375rem 0.625rem" : "0.5rem 1rem", borderRadius: "1.5rem",
                border: `0.0625rem solid ${isSpotlit ? T.color.terracotta : selectedRoom ? T.color.cream : "rgba(44,44,42,.1)"}`,
                background: isSpotlit ? "rgba(193,127,89,0.12)" : selectedRoom ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0.4)",
                backdropFilter: "blur(0.5rem)",
                color: isSpotlit ? T.color.terracotta : selectedRoom ? T.color.walnut : T.color.muted,
                cursor: selectedRoom || isSpotlit ? "pointer" : "default",
                fontFamily: T.font.body, fontSize: isMobile ? "0.6875rem" : "0.8125rem", fontWeight: 600,
                letterSpacing: "0.02em", whiteSpace: "nowrap", flexShrink: 0,
                opacity: isSpotlit ? 1 : selectedRoom ? 1 : 0.55,
                transition: "all 0.2s ease",
                boxShadow: isSpotlit
                  ? `0 0 0 0.1875rem ${T.color.terracotta}44, 0 0.25rem 1rem rgba(193,127,89,0.2)`
                  : selectedRoom ? "0 0.0625rem 0.25rem rgba(44,44,42,0.06)" : "none",
                position: "relative",
                zIndex: isSpotlit ? 10 : undefined,
                animation: isSpotlit ? "spotlightPulse 1.5s ease-in-out infinite" : undefined,
              }}>
              {btn.icon}
              {t(btn.key)}
            </button>
            );
          })}
          {toolbarHint && !selectedRoom && !spotlightTarget && (
            <span style={{
              fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.terracotta,
              fontWeight: 500, animation: "libFadeIn 0.2s ease both",
            }}>
              {t("selectRoomFirst")}
            </span>
          )}
          {spotlightTarget && (
            <span
              onClick={() => setSpotlightTarget(null)}
              style={{
                fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.terracotta,
                fontWeight: 600, cursor: "pointer",
                animation: "libFadeIn 0.3s ease both",
                display: "flex", alignItems: "center", gap: "0.375rem",
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              {t("spotlightHint")}
            </span>
          )}
        </div>

        {/* Content area */}
        <div data-nudge-scroll-lock style={{
          flex: 1, overflow: "auto",
          padding: isMobile ? "1.25rem 1rem" : "2rem 2.5rem",
          paddingBottom: isMobile ? "calc(4.5rem + env(safe-area-inset-bottom, 0px))" : "2rem",
          animation: "libFadeIn 0.35s ease both",
        }}>

          {/* ═══ CLEAR EXAMPLE MEDIA BANNER ═══ */}
          {showDemos && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: "0.75rem", marginBottom: "1.25rem",
              padding: isMobile ? "0.75rem 1rem" : "0.75rem 1.25rem",
              borderRadius: "0.75rem",
              background: `linear-gradient(135deg, ${T.color.terracotta}0C, ${T.color.gold}08)`,
              border: `0.0625rem solid ${T.color.terracotta}25`,
              animation: "libFadeIn 0.35s ease both",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: T.color.charcoal }}>
                  {t("demoBannerTitle")}
                </span>
                <span style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, marginLeft: "0.5rem" }}>
                  {t("demoBannerDesc")}
                </span>
              </div>
              <button
                onClick={() => { setDemosHidden(true); setShowDemos(false); }}
                style={{
                  flexShrink: 0,
                  padding: "0.375rem 0.875rem", borderRadius: "0.5rem",
                  border: `0.0625rem solid ${T.color.terracotta}40`,
                  background: `${T.color.terracotta}10`, color: T.color.terracotta,
                  fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 600,
                  cursor: "pointer", transition: "all 0.2s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${T.color.terracotta}20`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${T.color.terracotta}10`; }}
              >
                {t("demoBannerClear")}
              </button>
            </div>
          )}

          {/* ═══ ACTION BAR: Import + Select + View toggle ═══ */}
          <div data-nudge="library_import" style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: "0.5rem", marginBottom: "0.75rem",
            animation: "libFadeIn 0.35s ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {/* Import button */}
              <button
                data-spotlight-id="importUpload"
                onClick={() => { setShowImportHub(true); if (spotlightTarget === "importUpload") setSpotlightTarget(null); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.375rem",
                  padding: "0.375rem 0.875rem",
                  borderRadius: "0.5rem",
                  background: spotlightTarget === "importUpload"
                    ? `linear-gradient(135deg, ${T.color.terracotta}, ${T.color.walnut})`
                    : `linear-gradient(135deg, ${T.color.gold}, ${T.color.goldDark})`,
                  border: spotlightTarget === "importUpload" ? `0.125rem solid ${T.color.terracotta}` : "none",
                  cursor: "pointer",
                  fontFamily: T.font.body, fontSize: "0.75rem",
                  fontWeight: 600, color: T.color.white,
                  letterSpacing: "0.02em",
                  transition: "all 0.2s ease",
                  boxShadow: spotlightTarget === "importUpload"
                    ? `0 0 0 0.1875rem ${T.color.terracotta}44`
                    : "0 0.0625rem 0.25rem rgba(212,175,55,0.2)",
                  animation: spotlightTarget === "importUpload" ? "spotlightPulse 1.5s ease-in-out infinite" : undefined,
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3v10M6 9l4 4 4-4" />
                  <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" />
                </svg>
                {t("importButton")}
              </button>

              {/* Select mode toggle — only when room has memories */}
              {selectedRoom && filteredRoomMems.length > 0 && (
                <button
                  onClick={() => { setSelectMode(prev => !prev); setSelectedMemIds(new Set()); }}
                  style={{
                    padding: "0.375rem 0.75rem", borderRadius: "0.5rem",
                    border: `0.0625rem solid ${selectMode ? currentWing.accent : T.color.cream}`,
                    background: selectMode ? `${currentWing.accent}12` : T.color.white,
                    fontFamily: T.font.body, fontSize: "0.75rem", fontWeight: 500,
                    color: selectMode ? currentWing.accent : T.color.walnut,
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
                <button onClick={() => setViewMode("grid")} aria-label={t("gridView")} style={{ padding: "0.375rem", borderRadius: "0.375rem", border: "none", background: viewMode === "grid" ? T.color.white : "transparent", boxShadow: viewMode === "grid" ? "0 0.0625rem 0.25rem rgba(44,44,42,0.08)" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === "grid" ? T.color.charcoal : T.color.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                </button>
                <button onClick={() => setViewMode("list")} aria-label={t("listView")} style={{ padding: "0.375rem", borderRadius: "0.375rem", border: "none", background: viewMode === "list" ? T.color.white : "transparent", boxShadow: viewMode === "list" ? "0 0.0625rem 0.25rem rgba(44,44,42,0.08)" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === "list" ? T.color.charcoal : T.color.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <button onClick={() => setViewMode("timeline")} aria-label={t("timelineView")} style={{ padding: "0.375rem", borderRadius: "0.375rem", border: "none", background: viewMode === "timeline" ? T.color.white : "transparent", boxShadow: viewMode === "timeline" ? "0 0.0625rem 0.25rem rgba(44,44,42,0.08)" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={viewMode === "timeline" ? T.color.charcoal : T.color.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><circle cx="12" cy="6" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="18" r="2"/></svg>
                </button>
              </div>
            )}
          </div>

          {/* Cross-wing search results */}
          {crossWingResults && (
            <div style={{ animation: "libSlideUp 0.35s ease both" }}>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
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
                    animation: `libCardEnter 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${0.05 + i * 0.035}s both`,
                  }}>
                    <LibraryMemoryCard
                      mem={mem}
                      subtitle={`${wing.icon} ${wing.name} / ${room.icon} ${room.name}`}
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

          {/* Empty state for cross-wing search with no results (P1 #2) */}
          {q && !selectedRoom && !crossWingResults && (
            <LibraryEmptyState
              type="search"
              accent={currentWing.accent}
              query={query || undefined}
            />
          )}

          {/* AI SMART SORT BAR - Attic wing only */}
          {!selectedRoom && !crossWingResults && selectedWing === "attic" && allWingMems.length > 0 && (
            <div style={{
              marginBottom: "1.5rem",
              padding: isMobile ? "1rem" : "1.125rem 1.5rem",
              background: "linear-gradient(135deg, rgba(193,127,89,0.08) 0%, rgba(212,175,55,0.06) 100%)",
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
                    color: T.color.charcoal, letterSpacing: "0.02em",
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
                  fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.muted,
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
                    boxShadow: "0 0.125rem 0.5rem rgba(193,127,89,0.25)",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-0.0625rem)";
                    e.currentTarget.style.boxShadow = "0 0.25rem 0.75rem rgba(193,127,89,0.35)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 0.125rem 0.5rem rgba(193,127,89,0.25)";
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
                    fontWeight: 500, color: T.color.walnut, whiteSpace: "nowrap",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = T.color.white;
                    e.currentTarget.style.borderColor = `${T.color.walnut}33`;
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
          {(showAiSortBanner || showManualSortBanner) && !selectedRoom && !crossWingResults && selectedWing === "attic" && (
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
                  color: T.color.walnut, margin: "0 0 0.25rem 0",
                }}>
                  {t("comingSoon")}
                </p>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.8125rem",
                  color: T.color.walnut, margin: 0, lineHeight: 1.5, opacity: 0.8,
                }}>
                  {showAiSortBanner ? t("aiSortComingSoon") : t("manualSortComingSoon")}
                </p>
              </div>
              <button
                onClick={() => { setShowAiSortBanner(false); setShowManualSortBanner(false); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "0.875rem", color: T.color.walnut, padding: "0.125rem 0.25rem",
                  lineHeight: 1, borderRadius: "0.25rem", opacity: 0.6, flexShrink: 0,
                }}
              >
                {"\u2715"}
              </button>
            </div>
          )}

          {/* Room list (when no room selected and no cross-wing search and no empty search) */}
          {!selectedRoom && !crossWingResults && !q && (
            <div style={{ animation: "libFadeIn 0.35s ease both" }}>
              {/* Wing welcome message */}
              <p style={{
                fontFamily: T.font.body, fontSize: "0.875rem",
                color: T.color.muted, margin: "0 0 1.25rem",
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
                    fontWeight: 700, color: T.color.muted,
                    margin: 0, letterSpacing: "0.1em", textTransform: "uppercase",
                  }}>
                    {t("roomsIn")}
                  </h3>
                  <span style={{
                    fontFamily: T.font.display, fontSize: "1.125rem",
                    fontWeight: 600, color: T.color.charcoal,
                    letterSpacing: "0.03em",
                  }}>
                    {selectedWing === "__all__" ? t("allRooms") : currentWing.id === "attic" ? t("storageRoom") : currentWing.name}
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
                        animation: `libCardEnter 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${0.1 + i * 0.06}s both`,
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
                        borderRadius: "0.75rem",
                        border: `0.125rem dashed ${T.color.cream}`,
                        background: "rgba(255,255,255,0.35)",
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
                        e.currentTarget.style.borderColor = currentWing.accent;
                        e.currentTarget.style.background = "rgba(255,255,255,0.6)";
                        e.currentTarget.style.transform = "translateY(-0.125rem)";
                        e.currentTarget.style.boxShadow = "0 0.25rem 1rem rgba(44,44,42,0.06)";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = T.color.cream;
                        e.currentTarget.style.background = "rgba(255,255,255,0.35)";
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <span style={{
                        fontSize: "1.5rem",
                        lineHeight: 1,
                        color: T.color.muted,
                        fontWeight: 300,
                      }}>
                        +
                      </span>
                      <span style={{
                        fontFamily: T.font.body,
                        fontSize: "0.8125rem",
                        fontWeight: 500,
                        color: T.color.muted,
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
          {selectedRoom && !crossWingResults && (
            <div style={{ animation: "libSlideRight 0.35s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
              {/* Bulk actions bar — only visible in select mode */}
              {selectMode && (
              <div style={{ display: "flex", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  {/* Bulk actions (P1 #6) */}
                  {selectMode && (
                    <>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={filteredRoomMems.length > 0 && selectedMemIds.size === filteredRoomMems.length}
                          onChange={() => {
                            if (selectedMemIds.size === filteredRoomMems.length) {
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
                            onClick={() => {
                              const count = selectedMemIds.size;
                              if (!window.confirm(t("bulkDeleteConfirm", { count: String(count) }))) return;
                              for (const memId of selectedMemIds) {
                                deleteMemory(selectedRoom!, memId);
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
                              fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.charcoal,
                              outline: "none", width: "10rem",
                            }}
                            onKeyDown={e => {
                              if (e.key === "Enter" && batchTagInput.trim()) {
                                for (const memId of selectedMemIds) {
                                  const mem = filteredRoomMems.find(m => m.id === memId);
                                  if (mem && selectedRoom) {
                                    const existing = mem.desc || "";
                                    const tagText = `#${batchTagInput.trim()}`;
                                    if (!existing.includes(tagText)) {
                                      updateMemory(selectedRoom, memId, { desc: existing ? `${existing} ${tagText}` : tagText });
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
                                    if (!existing.includes(tagText)) {
                                      updateMemory(selectedRoom, memId, { desc: existing ? `${existing} ${tagText}` : tagText });
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
                              color: batchTagInput.trim() ? T.color.white : T.color.muted,
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
              {/* P2 #5: Memory statistics per room */}
              {filteredRoomMems.length > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  marginBottom: "0.75rem", flexWrap: "wrap",
                  padding: "0.375rem 0.75rem",
                  background: "rgba(255,255,255,0.55)",
                  borderRadius: "0.5rem",
                  border: `0.0625rem solid ${T.color.cream}`,
                  animation: "libFadeIn 0.3s ease both",
                }}>
                  <span style={{
                    fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600,
                    color: T.color.charcoal, letterSpacing: "0.02em",
                  }}>
                    {t("roomStatsTotal", { count: String(filteredRoomMems.length) })}
                  </span>
                  <span style={{ width: "0.0625rem", height: "0.75rem", background: T.color.cream }} />
                  {Object.entries(roomTypeCounts).map(([type, count]) => (
                    <span key={type} style={{
                      display: "inline-flex", alignItems: "center", gap: "0.1875rem",
                      fontFamily: T.font.body, fontSize: "0.625rem", color: T.color.muted,
                    }}>
                      <TypeIcon type={type} size={11} color={T.color.muted} />
                      {count}
                    </span>
                  ))}
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
                      animation: `libFadeIn 0.3s ease ${i * 0.05}s both`,
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
                viewMode === "grid" ? (
                  <div role="list" style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "1.25rem",
                }}>
                  {filteredRoomMems.slice(0, visibleMemCount).map((mem, i) => (
                    <div key={mem.id} role="listitem" style={{
                      animation: `libCardEnter 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${0.03 + i * 0.03}s both`,
                      position: "relative",
                    }}>
                      {/* Select checkbox overlay (P1 #6) */}
                      {selectMode && (
                        <div
                          onClick={(e) => { e.stopPropagation(); setSelectedMemIds(prev => { const next = new Set(prev); if (next.has(mem.id)) next.delete(mem.id); else next.add(mem.id); return next; }); }}
                          style={{
                            position: "absolute", top: "0.5rem", left: "0.5rem", zIndex: 10,
                            width: "1.5rem", height: "1.5rem", borderRadius: "0.375rem",
                            background: selectedMemIds.has(mem.id) ? currentWing.accent : "rgba(255,255,255,0.85)",
                            border: `0.0625rem solid ${selectedMemIds.has(mem.id) ? currentWing.accent : T.color.sandstone}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", transition: "all 0.15s ease",
                          }}
                        >
                          {selectedMemIds.has(mem.id) && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </div>
                      )}
                      <LibraryMemoryCard
                        mem={mem}
                        accent={currentWing.accent}
                        searchQuery={query || undefined}
                        animationIndex={i}
                        onClick={() => {
                          if (selectMode) {
                            setSelectedMemIds(prev => { const next = new Set(prev); if (next.has(mem.id)) next.delete(mem.id); else next.add(mem.id); return next; });
                          } else {
                            setMediaPlayerIndex(i);
                          }
                        }}
                        onMove={(m) => setMovingMem({ mem: m, fromRoom: selectedRoom! })}
                      />
                    </div>
                  ))}
                </div>
                ) : viewMode === "list" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }} role="list">
                  {filteredRoomMems.slice(0, visibleMemCount).map((mem, i) => (
                    <button
                      key={mem.id}
                      role="listitem"
                      onClick={() => {
                        if (selectMode) {
                          setSelectedMemIds(prev => { const next = new Set(prev); if (next.has(mem.id)) next.delete(mem.id); else next.add(mem.id); return next; });
                        } else {
                          setMediaPlayerIndex(i);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.625rem 0.875rem",
                        borderRadius: "0.625rem",
                        border: `0.0625rem solid ${selectedMemIds.has(mem.id) ? currentWing.accent : T.color.cream}`,
                        background: selectedMemIds.has(mem.id) ? `${currentWing.accent}08` : "rgba(255,255,255,0.75)",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: T.font.body,
                        transition: "all 0.2s ease",
                        animation: `libCardEnter 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${0.03 + i * 0.03}s both`,
                      }}
                    >
                      {selectMode && (
                        <div style={{
                          width: "1.25rem", height: "1.25rem", borderRadius: "0.25rem", flexShrink: 0,
                          background: selectedMemIds.has(mem.id) ? currentWing.accent : T.color.white,
                          border: `0.0625rem solid ${selectedMemIds.has(mem.id) ? currentWing.accent : T.color.sandstone}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {selectedMemIds.has(mem.id) && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </div>
                      )}
                      {mem.dataUrl && (
                        <Image
                          src={mem.dataUrl}
                          alt=""
                          width={40}
                          height={40}
                          unoptimized
                          style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.375rem", objectFit: "cover", flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{
                          display: "block",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: T.color.charcoal,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {mem.title}
                        </span>
                        {mem.type && (
                          <span style={{ fontSize: "0.6875rem", color: T.color.muted }}>
                            {mem.type}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                ) : viewMode === "timeline" ? (
                /* P2 #3: Timeline view */
                <div style={{ position: "relative", paddingLeft: "2rem" }}>
                  {/* Vertical line */}
                  <div style={{
                    position: "absolute", left: "0.5rem", top: 0, bottom: 0,
                    width: "0.125rem", background: `linear-gradient(to bottom, ${currentWing.accent}44, ${T.color.cream})`,
                  }} />
                  {(() => {
                    const sorted = [...filteredRoomMems.slice(0, visibleMemCount)].sort((a, b) =>
                      (b.createdAt || "").localeCompare(a.createdAt || ""));
                    let lastDate = "";
                    return sorted.map((mem, i) => {
                      const dateStr = mem.createdAt
                        ? new Date(mem.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                        : "";
                      const showDate = dateStr !== lastDate;
                      if (showDate) lastDate = dateStr;
                      return (
                        <div key={mem.id} style={{ marginBottom: "0.75rem", animation: `libCardEnter 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${0.03 + i * 0.03}s both` }}>
                          {showDate && dateStr && (
                            <div style={{
                              display: "flex", alignItems: "center", gap: "0.5rem",
                              marginBottom: "0.375rem", marginLeft: "-1.75rem",
                            }}>
                              <div style={{
                                width: "0.5rem", height: "0.5rem", borderRadius: "50%",
                                background: currentWing.accent, flexShrink: 0,
                                boxShadow: `0 0 0 0.125rem ${T.color.white}, 0 0 0 0.1875rem ${currentWing.accent}44`,
                              }} />
                              <span style={{
                                fontFamily: T.font.display, fontSize: "0.8125rem",
                                fontWeight: 600, color: T.color.charcoal,
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
                                setMediaPlayerIndex(i);
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
                            {mem.dataUrl && (
                              <Image src={mem.dataUrl} alt="" width={36} height={36} unoptimized style={{ width: "2.25rem", height: "2.25rem", borderRadius: "0.375rem", objectFit: "cover", flexShrink: 0 }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: T.color.charcoal, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {mem.title}
                              </span>
                              {mem.desc && (
                                <span style={{ display: "block", fontSize: "0.625rem", color: T.color.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {mem.desc.slice(0, 80)}
                                </span>
                              )}
                            </div>
                            {mem.createdAt && (
                              <span style={{ fontSize: "0.625rem", color: T.color.muted, flexShrink: 0, whiteSpace: "nowrap" }}>
                                {new Date(mem.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
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
                  type={(!!q || !!filterType) ? "search" : "room"}
                  accent={currentWing.accent}
                  onAdd={() => setShowImportHub(true)}
                  query={query || undefined}
                />
              ) : null}

              {/* Load more pagination */}
              {filteredRoomMems.length > visibleMemCount && (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: "0.5rem", marginTop: "1.5rem",
                  animation: "libFadeIn 0.3s ease both",
                }}>
                  <p style={{
                    fontFamily: T.font.body, fontSize: "0.75rem",
                    color: T.color.muted, margin: 0,
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
                      color: T.color.walnut, letterSpacing: "0.02em",
                      transition: "all 0.25s ease",
                      boxShadow: "0 0.0625rem 0.25rem rgba(44,44,42,0.06)",
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
          background: T.color.white,
          boxShadow: "-0.5rem 0 2rem rgba(44,44,42,0.15)",
          display: "flex", flexDirection: "column",
          animation: "libSlideLeft 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
          overflow: "hidden",
        }}>
          <style>{`@keyframes libSlideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
          {/* Header */}
          <div style={{
            padding: "1rem 1.25rem", borderBottom: `0.0625rem solid ${T.color.cream}`,
            display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
          }}>
            <h3 style={{ fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600, color: T.color.charcoal, margin: 0 }}>
              {t("detailPanelTitle")}
            </h3>
            <button
              onClick={() => setDetailPanelMem(null)}
              aria-label={tc("close")}
              style={{
                width: "2rem", height: "2rem", borderRadius: "50%",
                border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone,
                color: T.color.muted, fontSize: "0.875rem", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {"\u2715"}
            </button>
          </div>
          {/* Content */}
          <div style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
            {/* Photo */}
            {detailPanelMem.mem.dataUrl && (
              <div style={{
                borderRadius: "0.75rem", overflow: "hidden", marginBottom: "1rem",
                background: T.color.cream, aspectRatio: "16 / 10",
                position: "relative",
              }}>
                <Image
                  src={detailPanelMem.mem.dataUrl}
                  alt={detailPanelMem.mem.title}
                  fill
                  unoptimized
                  style={{ objectFit: "cover" }}
                />
              </div>
            )}
            {/* Title */}
            <h4 style={{
              fontFamily: T.font.display, fontSize: "1.25rem", fontWeight: 700,
              color: T.color.charcoal, margin: "0 0 0.75rem",
              lineHeight: 1.3, letterSpacing: "0.01em",
            }}>
              {detailPanelMem.mem.title}
            </h4>
            {/* Metadata */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1rem" }}>
              {/* Type */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em", width: "4.5rem", flexShrink: 0 }}>
                  {t("detailPanelType")}
                </span>
                <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <TypeIcon type={detailPanelMem.mem.type} size={14} color={T.color.charcoal} />
                  {detailPanelMem.mem.type}
                </span>
              </div>
              {/* Date */}
              {detailPanelMem.mem.createdAt && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em", width: "4.5rem", flexShrink: 0 }}>
                    {t("detailPanelDate")}
                  </span>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", color: T.color.charcoal }}>
                    {new Date(detailPanelMem.mem.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              {/* Location */}
              {detailPanelMem.mem.locationName && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                  <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em", width: "4.5rem", flexShrink: 0, paddingTop: "0.125rem" }}>
                    {t("detailPanelLocation")}
                  </span>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.25rem" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.color.walnut} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "0.0625rem" }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    <div>
                      <span style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: T.color.charcoal }}>
                        {detailPanelMem.mem.locationName}
                      </span>
                      {typeof detailPanelMem.mem.lat === "number" && typeof detailPanelMem.mem.lng === "number" && (
                        <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, display: "block", marginTop: "0.0625rem" }}>
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
                <span style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, color: T.color.muted, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: "0.375rem" }}>
                  {t("detailPanelDescription")}
                </span>
                <p style={{
                  fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.charcoal,
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
                background: "rgba(44,44,42,.06)", border: "none", cursor: "pointer",
                fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
                color: T.color.walnut,
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
      {mediaPlayerIndex !== null && selectedRoom && (
        <RoomMediaPlayer
          memories={filteredRoomMems}
          initialIndex={mediaPlayerIndex}
          onClose={() => setMediaPlayerIndex(null)}
          onEdit={(mem) => {
            setMediaPlayerIndex(null);
            setDetailMem({ mem, wingId: selectedWing, roomId: selectedRoom });
          }}
        />
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

      {/* Wing manager overlay */}
      {showWingManager && (
        <WingManagerPanel onClose={() => setShowWingManager(false)} />
      )}

      {/* Room manager overlay */}
      {showRoomManager && currentWing && (
        <RoomManagerPanel
          wing={currentWing}
          onClose={() => setShowRoomManager(false)}
          onEnterRoom={(roomId: string) => {
            setShowRoomManager(false);
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

      {/* ═══ CLOUD BROWSER MODAL ═══ */}
      {cloudBrowserProvider && (
        <CloudBrowser
          provider={cloudBrowserProvider}
          onClose={() => setCloudBrowserProvider(null)}
          onImport={async (items) => {
            if (selectedRoom && items.length > 0) {
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
                  body = { filePaths: items.map((i) => i.path || i.id), roomId: selectedRoom };
                } else if (provider === "googlePhotos") {
                  body = { photoIds: items.map((i) => i.id), roomId: selectedRoom };
                } else if (provider === "onedrive") {
                  body = { itemIds: items.map((i) => i.id), roomId: selectedRoom };
                } else {
                  body = { fileIds: items.map((i) => i.id), roomId: selectedRoom };
                }
                try {
                  const res = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  });
                  if (res.ok) {
                    await fetchRoomMemories(selectedRoom);
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

      {/* ═══ IMAGE LIGHTBOX (P1 #12) ═══ */}
      {lightboxMem && lightboxMem.dataUrl && (
        <div
          onClick={() => setLightboxMem(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(44,44,42,.75)",
            backdropFilter: "blur(1rem)",
            WebkitBackdropFilter: "blur(1rem)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: "1rem",
            animation: "libFadeIn 0.2s ease both",
            cursor: "pointer",
          }}
        >
          <img
            src={lightboxMem.dataUrl}
            alt={lightboxMem.title}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: "90vw", maxHeight: "80vh", borderRadius: "0.75rem",
              objectFit: "contain",
              boxShadow: "0 1.5rem 3rem rgba(0,0,0,0.3)",
              cursor: "default",
              animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          />
          <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <p style={{
              fontFamily: T.font.display, fontSize: "1rem", fontWeight: 600,
              color: T.color.white, margin: 0, textShadow: "0 0.0625rem 0.25rem rgba(0,0,0,0.3)",
            }}>
              {lightboxMem.title}
            </p>
            <button
              onClick={() => { if (selectedRoom) { setDetailMem({ mem: lightboxMem, wingId: selectedWing, roomId: selectedRoom }); } setLightboxMem(null); }}
              style={{
                padding: "0.375rem 0.75rem", borderRadius: "0.5rem",
                background: "rgba(255,255,255,0.2)", border: "0.0625rem solid rgba(255,255,255,0.3)",
                color: T.color.white, fontFamily: T.font.body, fontSize: "0.75rem",
                fontWeight: 500, cursor: "pointer", backdropFilter: "blur(0.5rem)",
              }}
            >
              {t("viewDetails")}
            </button>
          </div>
          <button
            onClick={() => setLightboxMem(null)}
            style={{
              position: "absolute", top: "1.5rem", right: "1.5rem",
              width: "2.5rem", height: "2.5rem", borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", border: "0.0625rem solid rgba(255,255,255,0.25)",
              color: T.color.white, fontSize: "1.125rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(0.5rem)", WebkitBackdropFilter: "blur(0.5rem)",
            }}
            aria-label={tc("close")}
          >
            {"\u2715"}
          </button>
        </div>
      )}

      {/* ═══ WRITE STORY PANEL ═══ */}
      {activeToolPanel === "writeStory" && selectedRoom && (
        <div
          onClick={() => { setActiveToolPanel(null); setStoryText(""); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(44,44,42,.35)",
            backdropFilter: "blur(0.75rem)",
            WebkitBackdropFilter: "blur(0.75rem)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "libFadeIn 0.2s ease both",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,.96)",
              backdropFilter: "blur(1.5rem) saturate(1.4)",
              WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
              borderRadius: "1.25rem",
              boxShadow: "0 1.5rem 3rem rgba(44,44,42,.18), 0 0.5rem 1.25rem rgba(44,44,42,.08), inset 0 0.0625rem 0 rgba(255,255,255,.7)",
              border: `0.0625rem solid ${T.color.cream}`,
              width: "min(32rem, 90vw)",
              maxHeight: "min(36rem, 85vh)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `0.0625rem solid ${T.color.cream}`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: T.color.charcoal, margin: 0 }}>
                  {t("writeStoryTitle", { room: wingRooms.find(r => r.id === selectedRoom)?.name || "" })}
                </h3>
                <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: "0.25rem 0 0" }}>{t("writeStoryDesc")}</p>
              </div>
              <button onClick={() => { setActiveToolPanel(null); setStoryText(""); }} aria-label={tc("close")} style={{ width: "2rem", height: "2rem", borderRadius: "1rem", border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone, color: T.color.muted, fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
            </div>
            <div style={{ flex: 1, padding: "1rem 1.5rem", overflow: "auto" }}>
              <textarea
                value={storyText}
                onChange={e => setStoryText(e.target.value)}
                placeholder={t("writeStoryPlaceholder")}
                autoFocus
                style={{
                  width: "100%", minHeight: "12rem", padding: "0.875rem",
                  borderRadius: "0.75rem", border: `0.0625rem solid ${T.color.cream}`,
                  background: T.color.warmStone, fontFamily: T.font.body,
                  fontSize: "0.875rem", color: T.color.charcoal, outline: "none",
                  resize: "vertical", lineHeight: 1.6,
                }}
              />
            </div>
            <div style={{ padding: "0.75rem 1.5rem", borderTop: `0.0625rem solid ${T.color.cream}`, display: "flex", justifyContent: "flex-end", gap: "0.625rem", flexShrink: 0 }}>
              <button onClick={() => { setActiveToolPanel(null); setStoryText(""); }}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "rgba(44,44,42,.06)", border: "none", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: T.color.walnut }}>{tc("cancel")}</button>
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
                  color: storyText.trim() ? "#FFF" : T.color.muted,
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
          setAiLabelProcessing(true); setAiLabelError(null); setAiLabelDone(false); setAiLabelResults({});
          let failCount = 0;
          for (let i = 0; i < selectedPhotos.length; i++) {
            const mem = selectedPhotos[i];
            setAiLabelProgress({ current: i + 1, total: selectedPhotos.length });
            try {
              const res = await fetch("/api/ai-label", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: mem.dataUrl, memoryTitle: mem.title }) });
              if (!res.ok) { if (res.status === 403) { setAiLabelError(t("aiLabelConsentRequired")); setAiLabelProcessing(false); setAiLabelProgress(null); return; } failCount++; continue; }
              const data = await res.json();
              setAiLabelResults(prev => ({ ...prev, [mem.id]: { description: data.description, labels: data.labels } }));
            } catch { failCount++; }
          }
          setAiLabelProcessing(false); setAiLabelProgress(null); setAiLabelDone(true);
          if (failCount > 0) setAiLabelError(t("aiLabelFailed", { count: String(failCount) }));
        };
        const handleSaveResult = (memId: string, description: string, labels: string[]) => {
          const tagSuffix = labels.length > 0 ? ` [${labels.join(", ")}]` : "";
          updateMemory(selectedRoom!, memId, { desc: description + tagSuffix });
          setAiLabelResults(prev => ({ ...prev, [memId]: { ...prev[memId], saved: true } }));
        };
        const handleClosePanel = () => { setActiveToolPanel(null); setAiLabelProcessing(false); setAiLabelSelected(new Set()); setAiLabelResults({}); setAiLabelProgress(null); setAiLabelError(null); setAiLabelDone(false); setAiLabelEditing(null); };
        return (
        <div role="button" tabIndex={0} onClick={handleClosePanel} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClosePanel(); } }} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(44,44,42,.35)", backdropFilter: "blur(0.75rem)", WebkitBackdropFilter: "blur(0.75rem)", display: "flex", alignItems: "center", justifyContent: "center", animation: "libFadeIn 0.2s ease both" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "rgba(255,255,255,.96)", backdropFilter: "blur(1.5rem) saturate(1.4)", WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)", borderRadius: "1.25rem", boxShadow: "0 1.5rem 3rem rgba(44,44,42,.18), 0 0.5rem 1.25rem rgba(44,44,42,.08), inset 0 0.0625rem 0 rgba(255,255,255,.7)", border: `0.0625rem solid ${T.color.cream}`, width: "min(32rem, 92vw)", maxHeight: "min(40rem, 88vh)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
            <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `0.0625rem solid ${T.color.cream}`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: T.color.charcoal, margin: 0 }}>{t("aiLabelTitle")}</h3>
                <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: "0.25rem 0 0" }}>{t("aiLabelDesc", { count: String(photoMems.length) })}</p>
              </div>
              <button onClick={handleClosePanel} aria-label={tc("close")} style={{ width: "2rem", height: "2rem", borderRadius: "1rem", border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone, color: T.color.muted, fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
            </div>
            <div style={{ flex: 1, padding: "1.25rem 1.5rem", overflow: "auto" }}>
              {photoMems.length === 0 ? (
                <div style={{ padding: "2rem 1rem", textAlign: "center" }}><p style={{ fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.muted }}>{t("aiLabelNoPhotos")}</p></div>
              ) : (<>
                {!aiLabelDone && !aiLabelProcessing && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", gap: "0.75rem", fontFamily: T.font.body, fontSize: "0.75rem" }}>
                      <span style={{ color: T.color.walnut }}>{t("aiLabelNeedsLabeling", { count: String(unlabeledPhotos.length) })}</span>
                      {labeledPhotos.length > 0 && <span style={{ color: T.color.muted }}>{t("aiLabelAlreadyLabeled", { count: String(labeledPhotos.length) })}</span>}
                    </div>
                    <button onClick={() => { if (aiLabelSelected.size === photoMems.length) { setAiLabelSelected(new Set()); } else { setAiLabelSelected(new Set(photoMems.map(m => m.id))); } }} style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.walnut, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                      {aiLabelSelected.size === photoMems.length ? t("aiLabelDeselectAll") : t("aiLabelSelectAll")}
                    </button>
                  </div>
                )}
                {aiLabelProcessing && aiLabelProgress && (
                  <div style={{ marginBottom: "1rem" }}>
                    <p style={{ fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, color: T.color.walnut, marginBottom: "0.375rem" }}>{t("aiLabelProgress", { current: String(aiLabelProgress.current), total: String(aiLabelProgress.total) })}</p>
                    <div style={{ height: "0.25rem", borderRadius: "0.125rem", background: T.color.cream, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: "0.125rem", background: T.color.sandstone, transition: "width 0.3s ease", width: `${(aiLabelProgress.current / aiLabelProgress.total) * 100}%` }} />
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
                          style={{ position: "relative", borderRadius: "0.5rem", overflow: "hidden", aspectRatio: "1", cursor: aiLabelProcessing ? "default" : "pointer", outline: isSelected ? `0.125rem solid ${T.color.sandstone}` : "0.125rem solid transparent", outlineOffset: "-0.125rem", opacity: aiLabelProcessing && !isSelected ? 0.4 : 1, transition: "outline 0.15s ease, opacity 0.15s ease" }}>
                          <Image src={m.dataUrl || ""} alt={m.title} fill unoptimized style={{ objectFit: "cover" }} />
                          <div style={{ position: "absolute", top: "0.25rem", left: "0.25rem", width: "1.125rem", height: "1.125rem", borderRadius: "0.25rem", background: isSelected ? T.color.sandstone : "rgba(255,255,255,.7)", border: isSelected ? "none" : `0.0625rem solid ${T.color.muted}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6875rem", color: "#FFF", fontWeight: 700 }}>{isSelected && "\u2713"}</div>
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
                            <p style={{ fontFamily: T.font.display, fontSize: "0.8125rem", fontWeight: 600, color: T.color.charcoal, margin: "0 0 0.25rem 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mem.title}</p>
                            {isEditing ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                                <textarea value={aiLabelEditText} onChange={e => setAiLabelEditText(e.target.value)} style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, border: `0.0625rem solid ${T.color.cream}`, borderRadius: "0.375rem", padding: "0.375rem 0.5rem", resize: "vertical", minHeight: "2.5rem", background: "#FFF", outline: "none", lineHeight: 1.4, width: "100%" }} />
                                <div style={{ display: "flex", gap: "0.375rem" }}>
                                  <button onClick={() => { setAiLabelResults(prev => ({ ...prev, [memId]: { ...prev[memId], description: aiLabelEditText } })); setAiLabelEditing(null); }} style={{ fontFamily: T.font.body, fontSize: "0.6875rem", fontWeight: 600, padding: "0.25rem 0.625rem", borderRadius: "0.25rem", background: T.color.sandstone, color: "#FFF", border: "none", cursor: "pointer" }}>{t("aiLabelSave")}</button>
                                  <button onClick={() => setAiLabelEditing(null)} style={{ fontFamily: T.font.body, fontSize: "0.6875rem", padding: "0.25rem 0.625rem", borderRadius: "0.25rem", background: "rgba(44,44,42,.06)", color: T.color.walnut, border: "none", cursor: "pointer" }}>{tc("cancel")}</button>
                                </div>
                              </div>
                            ) : (<>
                              <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.walnut, margin: "0 0 0.25rem 0", lineHeight: 1.4 }}>{result.description}</p>
                              {result.labels.length > 0 && (<div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "0.375rem" }}>{result.labels.map((label, i) => (<span key={i} style={{ fontFamily: T.font.body, fontSize: "0.625rem", padding: "0.0625rem 0.375rem", borderRadius: "0.25rem", background: `${T.color.sandstone}20`, color: T.color.walnut }}>{label}</span>))}</div>)}
                              <div style={{ display: "flex", gap: "0.375rem" }}>
                                <button onClick={() => { setAiLabelEditing(memId); setAiLabelEditText(result.description); }} style={{ fontFamily: T.font.body, fontSize: "0.625rem", padding: "0.125rem 0.375rem", borderRadius: "0.25rem", background: "none", color: T.color.muted, border: `0.0625rem solid ${T.color.cream}`, cursor: "pointer" }}>{t("aiLabelEditDesc")}</button>
                                {!result.saved && (<button onClick={() => handleSaveResult(memId, result.description, result.labels)} style={{ fontFamily: T.font.body, fontSize: "0.625rem", fontWeight: 600, padding: "0.125rem 0.5rem", borderRadius: "0.25rem", background: T.color.sandstone, color: "#FFF", border: "none", cursor: "pointer" }}>{t("aiLabelSave")}</button>)}
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
            <div style={{ padding: "0.75rem 1.5rem", borderTop: `0.0625rem solid ${T.color.cream}`, display: "flex", justifyContent: "flex-end", gap: "0.625rem", flexShrink: 0 }}>
              <button onClick={handleClosePanel} style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "rgba(44,44,42,.06)", border: "none", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: T.color.walnut }}>{tc("cancel")}</button>
              {!aiLabelDone ? (
                <button disabled={aiLabelProcessing || aiLabelSelected.size === 0 || photoMems.length === 0} onClick={handleStartLabeling} style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", background: (aiLabelProcessing || aiLabelSelected.size === 0) ? `${T.color.sandstone}40` : T.color.sandstone, color: (aiLabelProcessing || aiLabelSelected.size === 0) ? T.color.muted : "#FFF", border: "none", cursor: (aiLabelProcessing || aiLabelSelected.size === 0) ? "default" : "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, opacity: (aiLabelProcessing || aiLabelSelected.size === 0) ? 0.6 : 1, transition: "background 0.15s ease, opacity 0.15s ease" }}>{aiLabelProcessing ? t("aiLabelProcessing") : t("aiLabelStart")}</button>
              ) : (
                <button onClick={() => { Object.entries(aiLabelResults).forEach(([memId, result]) => { if (!result.saved) handleSaveResult(memId, result.description, result.labels); }); }} disabled={Object.values(aiLabelResults).every(r => r.saved)} style={{ padding: "0.5rem 1.25rem", borderRadius: "0.5rem", background: Object.values(aiLabelResults).every(r => r.saved) ? `${T.color.sandstone}40` : T.color.sandstone, color: Object.values(aiLabelResults).every(r => r.saved) ? T.color.muted : "#FFF", border: "none", cursor: Object.values(aiLabelResults).every(r => r.saved) ? "default" : "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600, opacity: Object.values(aiLabelResults).every(r => r.saved) ? 0.6 : 1 }}>{Object.values(aiLabelResults).every(r => r.saved) ? t("aiLabelSaved") : t("aiLabelSave")}</button>
              )}
            </div>
          </div>
        </div>);
      })()}

      {/* ═══ ADD LOCATION PANEL ═══ */}
      {activeToolPanel === "addLocation" && selectedRoom && (
        <div
          onClick={() => { setActiveToolPanel(null); setLocationName(""); setLocationLat(""); setLocationLng(""); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(44,44,42,.35)",
            backdropFilter: "blur(0.75rem)",
            WebkitBackdropFilter: "blur(0.75rem)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "libFadeIn 0.2s ease both",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,.96)",
              backdropFilter: "blur(1.5rem) saturate(1.4)",
              WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
              borderRadius: "1.25rem",
              boxShadow: "0 1.5rem 3rem rgba(44,44,42,.18), 0 0.5rem 1.25rem rgba(44,44,42,.08), inset 0 0.0625rem 0 rgba(255,255,255,.7)",
              border: `0.0625rem solid ${T.color.cream}`,
              width: "min(26rem, 90vw)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            <div style={{ padding: "1.25rem 1.5rem 1rem", borderBottom: `0.0625rem solid ${T.color.cream}`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: T.font.display, fontSize: "1.125rem", fontWeight: 600, color: T.color.charcoal, margin: 0 }}>{t("addLocationTitle")}</h3>
                <p style={{ fontFamily: T.font.body, fontSize: "0.75rem", color: T.color.muted, margin: "0.25rem 0 0" }}>{t("addLocationDesc")}</p>
              </div>
              <button onClick={() => { setActiveToolPanel(null); setLocationName(""); setLocationLat(""); setLocationLng(""); }} aria-label={tc("close")} style={{ width: "2rem", height: "2rem", borderRadius: "1rem", border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone, color: T.color.muted, fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
            </div>
            <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div>
                <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>{t("locationNameLabel")}</label>
                <input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder={t("locationNamePlaceholder")} autoFocus
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.625rem", border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone, fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.charcoal, outline: "none" }} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>{t("latLabel")}</label>
                  <input value={locationLat} onChange={e => setLocationLat(e.target.value)} placeholder="52.3676"
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.625rem", border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone, fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.charcoal, outline: "none" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.25rem" }}>{t("lngLabel")}</label>
                  <input value={locationLng} onChange={e => setLocationLng(e.target.value)} placeholder="4.9041"
                    style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "0.625rem", border: `0.0625rem solid ${T.color.cream}`, background: T.color.warmStone, fontFamily: T.font.body, fontSize: "0.875rem", color: T.color.charcoal, outline: "none" }} />
                </div>
              </div>
              <p style={{ fontFamily: T.font.body, fontSize: "0.6875rem", color: T.color.muted, margin: 0, lineHeight: 1.4 }}>{t("locationOptionalHint")}</p>
            </div>
            <div style={{ padding: "0.75rem 1.5rem", borderTop: `0.0625rem solid ${T.color.cream}`, display: "flex", justifyContent: "flex-end", gap: "0.625rem", flexShrink: 0 }}>
              <button onClick={() => { setActiveToolPanel(null); setLocationName(""); setLocationLat(""); setLocationLng(""); }}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", background: "rgba(44,44,42,.06)", border: "none", cursor: "pointer", fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500, color: T.color.walnut }}>{tc("cancel")}</button>
              <button
                onClick={async () => {
                  if (locationName.trim() && selectedRoom) {
                    const locName = locationName.trim();
                    let lat = locationLat ? parseFloat(locationLat) : undefined;
                    let lng = locationLng ? parseFloat(locationLng) : undefined;
                    // Geocode if no lat/lng provided
                    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
                      const coords = await geocodeLocationName(locName);
                      if (coords) { lat = coords.lat; lng = coords.lng; }
                    }
                    // Save to localStorage for room-level persistence
                    const locations = JSON.parse(localStorage.getItem("mp_room_locations") || "{}");
                    locations[selectedRoom] = { name: locName, lat: lat ?? null, lng: lng ?? null };
                    localStorage.setItem("mp_room_locations", JSON.stringify(locations));
                    // Update all memories in this room with location data
                    const roomMems = getMemsForRoom(selectedRoom);
                    for (const m of roomMems) {
                      updateMemory(selectedRoom, m.id, {
                        locationName: locName,
                        ...(lat !== undefined && !isNaN(lat) ? { lat } : {}),
                        ...(lng !== undefined && !isNaN(lng) ? { lng } : {}),
                      });
                    }
                    setLocationName("");
                    setLocationLat("");
                    setLocationLng("");
                    setActiveToolPanel(null);
                  }
                }}
                disabled={!locationName.trim()}
                style={{
                  padding: "0.5rem 1.25rem", borderRadius: "0.5rem",
                  background: locationName.trim() ? currentWing.accent : `${T.color.sandstone}40`,
                  color: locationName.trim() ? "#FFF" : T.color.muted,
                  border: "none", cursor: locationName.trim() ? "pointer" : "default",
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 600,
                }}>{t("saveLocation")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MOVE TO ROOM MODAL ═══ */}
      {movingMem && (
        <div
          onClick={() => { setMovingMem(null); setExpandedMoveWing(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(44,44,42,.35)",
            backdropFilter: "blur(0.75rem)",
            WebkitBackdropFilter: "blur(0.75rem)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "libFadeIn 0.2s ease both",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,.96)",
              backdropFilter: "blur(1.5rem) saturate(1.4)",
              WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
              borderRadius: "1.25rem",
              boxShadow: "0 1.5rem 3rem rgba(44,44,42,.18), 0 0.5rem 1.25rem rgba(44,44,42,.08), inset 0 0.0625rem 0 rgba(255,255,255,.7)",
              border: `0.0625rem solid ${T.color.cream}`,
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
              borderBottom: `0.0625rem solid ${T.color.cream}`,
              flexShrink: 0,
            }}>
              <h3 style={{
                fontFamily: T.font.display, fontSize: "1.125rem",
                fontWeight: 600, color: T.color.charcoal,
                margin: 0, letterSpacing: "0.01em",
              }}>
                {t("moveTo")}
              </h3>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.75rem",
                color: T.color.muted, margin: "0.25rem 0 0",
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
                        color: T.color.charcoal,
                        letterSpacing: "0.01em",
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "rgba(44,44,42,.03)"; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = isExpanded ? `${wing.accent}0A` : "transparent"; }}
                    >
                      <WingIcon wingId={wing.id} size={18} color={wing.accent} />
                      <span style={{ flex: 1, textAlign: "left" }}>{wing.name}</span>
                      <span style={{
                        fontSize: "0.6875rem", color: T.color.muted,
                        fontWeight: 400,
                      }}>
                        {wRooms.length}
                      </span>
                      <svg
                        width="12" height="12" viewBox="0 0 12 12"
                        fill="none" stroke={T.color.muted} strokeWidth="1.5" strokeLinecap="round"
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
                            fontWeight: 400,
                            color: isCurrent ? T.color.muted : T.color.walnut,
                            letterSpacing: "0.01em",
                            opacity: isCurrent ? 0.6 : 1,
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = `${wing.accent}12`; }}
                          onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = isCurrent ? `${wing.accent}08` : "transparent"; }}
                        >
                          <RoomIcon roomId={room.id} size={15} color={wing.accent} />
                          <span style={{ flex: 1, textAlign: "left" }}>{room.name}</span>
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
              borderTop: `0.0625rem solid ${T.color.cream}`,
              display: "flex", justifyContent: "flex-end",
              flexShrink: 0,
            }}>
              <button
                onClick={() => { setMovingMem(null); setExpandedMoveWing(null); }}
                style={{
                  padding: "0.4375rem 1rem",
                  borderRadius: "0.5rem",
                  background: "rgba(44,44,42,.06)",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: T.font.body,
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: T.color.walnut,
                  letterSpacing: "0.01em",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(44,44,42,.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(44,44,42,.06)"}
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
            background: "rgba(44,44,42,.35)",
            backdropFilter: "blur(0.75rem)",
            WebkitBackdropFilter: "blur(0.75rem)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "libFadeIn 0.2s ease both",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "rgba(255,255,255,.96)",
              backdropFilter: "blur(1.5rem) saturate(1.4)",
              WebkitBackdropFilter: "blur(1.5rem) saturate(1.4)",
              borderRadius: "1.25rem",
              boxShadow: "0 1.5rem 3rem rgba(44,44,42,.18), 0 0.5rem 1.25rem rgba(44,44,42,.08), inset 0 0.0625rem 0 rgba(255,255,255,.7)",
              border: `0.0625rem solid ${T.color.cream}`,
              width: "min(26rem, 90vw)",
              maxHeight: "min(32rem, 80vh)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
            }}
          >
            <div style={{
              padding: "1.25rem 1.5rem 1rem",
              borderBottom: `0.0625rem solid ${T.color.cream}`,
              flexShrink: 0,
            }}>
              <h3 style={{
                fontFamily: T.font.display, fontSize: "1.125rem",
                fontWeight: 600, color: T.color.charcoal,
                margin: 0, letterSpacing: "0.01em",
              }}>
                {t("moveSelected")}
              </h3>
              <p style={{
                fontFamily: T.font.body, fontSize: "0.75rem",
                color: T.color.muted, margin: "0.25rem 0 0",
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
                        color: T.color.charcoal, letterSpacing: "0.01em",
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "rgba(44,44,42,.03)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isExpanded ? `${wing.accent}0A` : "transparent"; }}
                    >
                      <WingIcon wingId={wing.id} size={18} color={wing.accent} />
                      <span style={{ flex: 1, textAlign: "left" }}>{wing.name}</span>
                      <span style={{ fontSize: "0.6875rem", color: T.color.muted, fontWeight: 400 }}>{wRooms.length}</span>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={T.color.muted} strokeWidth="1.5" strokeLinecap="round"
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
                            fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 400,
                            color: isCurrent ? T.color.muted : T.color.walnut,
                            letterSpacing: "0.01em", opacity: isCurrent ? 0.6 : 1,
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = `${wing.accent}12`; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? `${wing.accent}08` : "transparent"; }}
                        >
                          <RoomIcon roomId={room.id} size={15} color={wing.accent} />
                          <span style={{ flex: 1, textAlign: "left" }}>{room.name}</span>
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
              borderTop: `0.0625rem solid ${T.color.cream}`,
              display: "flex", justifyContent: "flex-end", flexShrink: 0,
            }}>
              <button
                onClick={() => { setBulkMoving(false); setExpandedMoveWing(null); }}
                style={{
                  padding: "0.4375rem 1rem", borderRadius: "0.5rem",
                  background: "rgba(44,44,42,.06)", border: "none", cursor: "pointer",
                  fontFamily: T.font.body, fontSize: "0.8125rem", fontWeight: 500,
                  color: T.color.walnut, letterSpacing: "0.01em", transition: "background 0.15s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(44,44,42,.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(44,44,42,.06)"}
              >
                {tc("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MOVED TOAST ═══ */}
      {movedToast && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          background: "rgba(44,44,42,.88)",
          backdropFilter: "blur(0.75rem)",
          WebkitBackdropFilter: "blur(0.75rem)",
          color: T.color.linen,
          padding: "0.625rem 1.25rem",
          borderRadius: "0.75rem",
          fontFamily: T.font.body,
          fontSize: "0.8125rem",
          fontWeight: 500,
          letterSpacing: "0.02em",
          boxShadow: "0 0.5rem 1.5rem rgba(44,44,42,.2)",
          animation: "libSlideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
        }}>
          {t("moved")}
        </div>
      )}
    </div>
  );
}
