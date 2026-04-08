"use client";
import { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { T } from "@/lib/theme";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useUserStore } from "@/lib/stores/userStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useAchievementStore } from "@/lib/stores/achievementStore";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useNavigation } from "@/lib/hooks/useNavigation";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useRoomMemories } from "@/lib/hooks/useRoomMemories";
import OnboardingWizard from "@/components/ui/OnboardingWizard";
import LandscapeNudge from "@/components/ui/LandscapeNudge";
// TopBar removed — replaced by PalaceSubNav
import { WingTooltip, DoorTooltip } from "@/components/ui/HoverTooltip";
import SearchBar from "@/components/ui/SearchBar";
import UploadPanel from "@/components/ui/UploadPanel";
import SharingPanel from "@/components/ui/SharingPanel";
import MemoryDetail from "@/components/ui/MemoryDetail";
import NavigationBar from "@/components/ui/NavigationBar";
import NotificationsPage from "@/components/ui/NotificationsPage";
import SettingsInline from "@/components/ui/SettingsInline";
import RoomManagerPanel from "@/components/ui/RoomManagerPanel";
import WingManagerPanel from "@/components/ui/WingManagerPanel";
import AchievementsPanel from "@/components/ui/AchievementsPanel";
import { AchievementIcon } from "@/components/ui/AtriumWidgets";
import TracksPanel from "@/components/ui/TracksPanel";
import TrackDetailPanel from "@/components/ui/TrackDetailPanel";
import LegacyPanel from "@/components/ui/LegacyPanel";
import PointsDisplay from "@/components/ui/PointsDisplay";
import FloatingPoints from "@/components/ui/FloatingPoints";
import ExteriorScene from "@/components/3d/ExteriorScene";
import EntranceHallScene from "@/components/3d/EntranceHallScene";
import InteriorScene from "@/components/3d/InteriorScene";
import CorridorScene from "@/components/3d/CorridorScene";
import { useDaylight } from "@/components/providers/DaylightProvider";
import ShareCard from "@/components/ui/ShareCard";
const MemoryMap = lazy(() => import("@/components/ui/MemoryMap"));
import OnThisDay from "@/components/ui/OnThisDay";
import TimeCapsuleReveal from "@/components/ui/TimeCapsuleReveal";
const MemoryTimeline = lazy(() => import("@/components/ui/MemoryTimeline"));
const StatisticsPanel = lazy(() => import("@/components/ui/StatisticsPanel"));
const MassImportPanel = lazy(() => import("@/components/ui/MassImportPanel"));
import RoomGallery from "@/components/ui/RoomGallery";
import StoragePlayerPanel from "@/components/ui/StoragePlayerPanel";
import InviteNotificationsPanel from "@/components/ui/InviteNotificationsPanel";
import SharedWithMePanel from "@/components/ui/SharedWithMePanel";
import SharingSettingsPanel from "@/components/ui/SharingSettingsPanel";
const InterviewPanel = lazy(() => import("@/components/ui/InterviewPanel"));
import InterviewLibraryPanel from "@/components/ui/InterviewLibraryPanel";
import InterviewHistoryPanel from "@/components/ui/InterviewHistoryPanel";
import CorridorGalleryPanel, { loadCorridorPaintings, type CorridorPaintings } from "@/components/ui/CorridorGalleryPanel";
import TouchControlsOverlay from "@/components/ui/TouchControlsOverlay";
import MobileJoystick from "@/components/ui/MobileJoystick";
// ActionMenu removed — replaced by PalaceSubNav
// StatusBar removed — no longer shown in Palace view
import { useInterviewStore } from "@/lib/stores/interviewStore";
import { ROOM_LAYOUTS } from "@/lib/3d/roomLayouts";
import { useTutorialStore } from "@/lib/stores/tutorialStore";
import TutorialOverlay from "@/components/ui/TutorialOverlay";
import FeatureSpotlight, { allSpotlightsSeen } from "@/components/ui/FeatureSpotlight";
import GettingStartedChecklist, { setOnboardDate, markChecklistItem } from "@/components/ui/GettingStartedChecklist";
import ContextualTooltip from "@/components/ui/ContextualTooltip";
import FirstMemoryPrompt from "@/components/ui/FirstMemoryPrompt";
import CinematicWalkthrough from "@/components/ui/CinematicWalkthrough";
import DiscoveryMenu from "@/components/ui/DiscoveryMenu";
import { useWalkthroughStore } from "@/lib/stores/walkthroughStore";
import { useUIPanelStore } from "@/lib/stores/uiPanelStore";
import { updateProfile } from "@/lib/auth/profile-actions";
const LibraryView = lazy(() => import("@/components/ui/LibraryView"));
const HomeView = lazy(() => import("@/components/ui/HomeView"));
import UniversalActions from "@/components/ui/UniversalActions";
import { useActions } from "@/lib/hooks/useActions";
import PalaceSubNav from "@/components/ui/PalaceSubNav";
import NudgeProvider, { getNudgeHighlight } from "@/components/ui/NudgeTooltip";
import { RoomIcon } from "@/components/ui/WingRoomIcons";
import { useNudgeStore } from "@/lib/stores/nudgeStore";
import TuscanCard from "@/components/ui/TuscanCard";
import TuscanStyles from "@/components/ui/TuscanStyles";
import { getWingsSharedWithMe, getSharedWingData, getSharedRoomMemories } from "@/lib/auth/sharing-actions";
import type { SharedWingDoor } from "@/components/3d/EntranceHallScene";

// ═══ MAIN — 4-level navigation: exterior → entrance → corridor → room ═══
export default function MemoryPalace(){
  const isMobile = useIsMobile();
  const { t: tTrack } = useTranslation("tracksPanel");
  const { t: tAch } = useTranslation("achievementsPanel");
  const { t: tAction } = useTranslation("actionMenu");
  const { t: tPalace } = useTranslation("palace");
  const { daylightEnabled, daylightMode, resolvedHour } = useDaylight();
  // Key fragment for scene remounting when daylight mode changes manually
  const dlKey = daylightEnabled ? `dl_${daylightMode}${daylightMode !== "auto" ? "_" + resolvedHour : ""}` : "dl_off";

  // ── Stores (individual selectors to avoid unnecessary re-renders) ──
  const profileLoading = useUserStore((s) => s.profileLoading);
  const onboarded = useUserStore((s) => s.onboarded);
  const firstWing = useUserStore((s) => s.firstWing);
  const styleEra = useUserStore((s) => s.styleEra);
  const bustTextureUrl = useUserStore((s) => s.bustTextureUrl);
  const bustModelUrl = useUserStore((s) => s.bustModelUrl);
  const bustProportions = useUserStore((s) => s.bustProportions);
  const userName = useUserStore((s) => s.userName);
  const bustName = useUserStore((s) => s.bustName);
  const bustGender = useUserStore((s) => s.bustGender);
  const bustPedestals = useUserStore((s) => s.bustPedestals);
  const loadProfile = useUserStore((s) => s.loadProfile);
  const finishOnboarding = useUserStore((s) => s.finishOnboarding);
  const setStyleEra = useUserStore((s) => s.setStyleEra);

  const navMode = usePalaceStore((s) => s.navMode);
  const view = usePalaceStore((s) => s.view);
  const activeWing = usePalaceStore((s) => s.activeWing);
  const activeRoomId = usePalaceStore((s) => s.activeRoomId);
  const hovWing = usePalaceStore((s) => s.hovWing);
  const hovDoor = usePalaceStore((s) => s.hovDoor);
  const opacity = usePalaceStore((s) => s.opacity);
  const portalAnim = usePalaceStore((s) => s.portalAnim);
  const roomLayouts = usePalaceStore((s) => s.roomLayouts);
  const setNavMode = usePalaceStore((s) => s.setNavMode);
  const setHovWing = usePalaceStore((s) => s.setHovWing);
  const setHovDoor = usePalaceStore((s) => s.setHovDoor);
  const enterWing = usePalaceStore((s) => s.enterWing);
  const enterEntrance = usePalaceStore((s) => s.enterEntrance);
  const enterCorridor = usePalaceStore((s) => s.enterCorridor);
  const enterRoom = usePalaceStore((s) => s.enterRoom);
  const setRoomLayout = usePalaceStore((s) => s.setRoomLayout);
  const exitToPalace = usePalaceStore((s) => s.exitToPalace);
  const exitToCorridor = usePalaceStore((s) => s.exitToCorridor);
  const exitToEntrance = usePalaceStore((s) => s.exitToEntrance);
  const switchWing = usePalaceStore((s) => s.switchWing);
  const setLibraryTarget = usePalaceStore((s) => s.setLibraryTarget);

  const selMem = useMemoryStore((s) => s.selMem);
  const showUpload = useMemoryStore((s) => s.showUpload);
  const showSharing = useMemoryStore((s) => s.showSharing);
  const showDirectory = useMemoryStore((s) => s.showDirectory);
  const searchQuery = useMemoryStore((s) => s.searchQuery);
  const filterType = useMemoryStore((s) => s.filterType);
  const setSelMem = useMemoryStore((s) => s.setSelMem);
  const setShowUpload = useMemoryStore((s) => s.setShowUpload);
  const setShowSharing = useMemoryStore((s) => s.setShowSharing);
  const setShowDirectory = useMemoryStore((s) => s.setShowDirectory);
  const setSearchQuery = useMemoryStore((s) => s.setSearchQuery);
  const setFilterType = useMemoryStore((s) => s.setFilterType);

  const getWingRooms = useRoomStore((s) => s.getWingRooms);
  const customRooms = useRoomStore((s) => s.customRooms);

  const nudgeActiveNudge = useNudgeStore((s) => s.activeNudge);
  const nudgeDismiss = useNudgeStore((s) => s.dismiss);
  const nudgeHL = getNudgeHighlight(nudgeActiveNudge);
  const autoWalking = useNudgeStore((s) => s.autoWalking);

  const achToast = useAchievementStore((s) => s.toast);
  const showAchievements = useAchievementStore((s) => s.showPanel);
  const setShowAchievements = useAchievementStore((s) => s.setShowPanel);
  const achHighlightId = useAchievementStore((s) => s.highlightId);
  const openAchWithHighlight = useAchievementStore((s) => s.openWithHighlight);
  const checkAchievements = useAchievementStore((s) => s.checkAchievements);
  const dismissAchToast = useAchievementStore((s) => s.dismissToast);
  const trackWingVisit = useAchievementStore((s) => s.trackWingVisit);
  const trackRoomVisit = useAchievementStore((s) => s.trackRoomVisit);
  const getProgress = useAchievementStore((s) => s.getProgress);
  const visitedWings = useAchievementStore((s) => s.visitedWings);

  const showTracksPanel = useTrackStore((s) => s.showTracksPanel);
  const selectedTrackId = useTrackStore((s) => s.selectedTrackId);
  const showLegacyPanel = useTrackStore((s) => s.showLegacyPanel);
  const trackToast = useTrackStore((s) => s.toast);
  const trackCelebration = useTrackStore((s) => s.celebration);
  const setShowTracksPanel = useTrackStore((s) => s.setShowTracksPanel);
  const setSelectedTrackId = useTrackStore((s) => s.setSelectedTrackId);
  const setShowLegacyPanel = useTrackStore((s) => s.setShowLegacyPanel);
  const dismissTrackToast = useTrackStore((s) => s.dismissToast);
  const dismissCelebration = useTrackStore((s) => s.dismissCelebration);
  const loadTrackProgress = useTrackStore((s) => s.loadProgress);
  const runProgressCheck = useTrackStore((s) => s.runProgressCheck);
  const hasUsedMassImport = useTrackStore((s) => s.hasUsedMassImport);
  const legacyReviewed = useTrackStore((s) => s.legacyReviewed);

  const showMemoryMap = useUIPanelStore((s) => s.showMemoryMap);
  const setShowMemoryMap = useUIPanelStore((s) => s.setShowMemoryMap);
  const showTimeline = useUIPanelStore((s) => s.showTimeline);
  const setShowTimeline = useUIPanelStore((s) => s.setShowTimeline);
  const showMassImport = useUIPanelStore((s) => s.showMassImport);
  const setShowMassImport = useUIPanelStore((s) => s.setShowMassImport);
  const showGallery = useUIPanelStore((s) => s.showGallery);
  const setShowGallery = useUIPanelStore((s) => s.setShowGallery);
  const showInvites = useUIPanelStore((s) => s.showInvites);
  const setShowInvites = useUIPanelStore((s) => s.setShowInvites);
  const showSharedWithMe = useUIPanelStore((s) => s.showSharedWithMe);
  const setShowSharedWithMe = useUIPanelStore((s) => s.setShowSharedWithMe);
  const showSharingSettings = useUIPanelStore((s) => s.showSharingSettings);
  const setShowSharingSettings = useUIPanelStore((s) => s.setShowSharingSettings);
  const showCorridorGallery = useUIPanelStore((s) => s.showCorridorGallery);
  const setShowCorridorGallery = useUIPanelStore((s) => s.setShowCorridorGallery);
  const showEraPicker = useUIPanelStore((s) => s.showEraPicker);
  const setShowEraPicker = useUIPanelStore((s) => s.setShowEraPicker);
  const showUpgradePrompt = useUIPanelStore((s) => s.showUpgradePrompt);
  const setShowUpgradePrompt = useUIPanelStore((s) => s.setShowUpgradePrompt);
  const showRoomManager = useUIPanelStore((s) => s.showRoomManager);
  const setShowRoomManager = useUIPanelStore((s) => s.setShowRoomManager);
  const showRoomShare = useUIPanelStore((s) => s.showRoomShare);
  const setShowRoomShare = useUIPanelStore((s) => s.setShowRoomShare);
  const showStoragePlayer = useUIPanelStore((s) => s.showStoragePlayer);
  const setShowStoragePlayer = useUIPanelStore((s) => s.setShowStoragePlayer);
  const showWingManager = useUIPanelStore((s) => s.showWingManager);
  const setShowWingManager = useUIPanelStore((s) => s.setShowWingManager);
  const showStatistics = useUIPanelStore((s) => s.showStatistics);
  const setShowStatistics = useUIPanelStore((s) => s.setShowStatistics);
  const [sharedWings, setSharedWings] = useState<SharedWingDoor[]>([]);
  // sharedContext removed — was never read
  const [sharedWingData, setSharedWingData] = useState<{ wing: any; rooms: any[] } | null>(null);
  const [corridorPaintings, setCorridorPaintings] = useState<CorridorPaintings>({});
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showNotificationsPage, setShowNotificationsPage] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("notifications") === "1";
    }
    return false;
  });
  const [showSettings, setShowSettings] = useState(false);
  const walkthroughActive = useWalkthroughStore((s) => s.isActive);
  const showDiscoveryMenu = useWalkthroughStore((s) => s.showDiscoveryMenu);
  const setShowDiscoveryMenu = useWalkthroughStore((s) => s.setShowDiscoveryMenu);
  const walkthroughStart = useWalkthroughStore((s) => s.start);
  const walkthroughCompleted = useWalkthroughStore((s) => s.completed);
  const walkthroughPhase = useWalkthroughStore((s) => s.phase);
  const walkthroughTargetWing = useWalkthroughStore((s) => s.targetWing);
  const walkthroughTargetRoom = useWalkthroughStore((s) => s.targetRoom);
  const [sceneLoading, setSceneLoading] = useState(true);
  const [searchBarVisible, setSearchBarVisible] = useState(true);
  const searchHideTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const showInterviewLibrary = useInterviewStore((s) => s.showLibrary);
  const showInterviewHistory = useInterviewStore((s) => s.showHistory);
  const showInterview = useInterviewStore((s) => s.showInterview);
  const setShowInterviewLibrary = useInterviewStore((s) => s.setShowLibrary);
  const setShowInterviewHistory = useInterviewStore((s) => s.setShowHistory);
  const setShowInterviewPanel = useInterviewStore((s) => s.setShowInterview);

  // ── Hint bars — show only on first 3 visits ──
  // showHints removed — bottom hints replaced by PalaceSubNav

  // ── Tutorial ──
  const tutorialActive = useTutorialStore((s) => s.active);
  const tutorialCompleted = useTutorialStore((s) => s.completed);
  const startTutorial = useTutorialStore((s) => s.start);

  // ── Hooks ──
  const { wingData, hovWingData, activeRoomData, crumbs, handleMemClick, allWings } = useNavigation();
  const { roomMems, allRoomMems, roomMemsKey, handleAddMemory, addMemoryToRoom, handleUpdateMemory, handleDeleteMemory, currentSharing, updateSharing } = useRoomMemories();

  // Build wingRooms map for PalaceSubNav room dropdowns
  const wingRoomsMap = useMemo(() => {
    const map: Record<string, { id: string; name: string; icon: string }[]> = {};
    for (const w of allWings) {
      map[w.id] = getWingRooms(w.id).map(r => ({ id: r.id, name: r.name, icon: r.icon }));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWings, customRooms]);

  // ── Universal Actions (available in all modes) ──
  const actionGroups = useActions({
    onAddMemory: () => { setShowTools(false); setShowUpload(true); },
    onUploadPhotos: () => { setShowTools(false); setShowMassImport(true); },
    onRecordInterview: () => { setShowTools(false); setShowInterviewLibrary(true); },
    onWriteStory: () => { setShowTools(false); setShowUpload(true); },
    onMemoryMap: () => { setShowTools(false); setShowMemoryMap(true); },
    onTimeline: () => { setShowTools(false); setShowTimeline(true); },
    onStatistics: () => { setShowTools(false); setShowStatistics(true); },
    onFamilyTree: () => { setShowTools(false); /* Family tree panel — future feature */ },
    onShareRoom: () => { setShowTools(false); setShowSharing(true); },
    onInvites: () => { setShowTools(false); setShowInvites(true); },
    onSharedWithMe: () => { setShowTools(false); setShowSharedWithMe(true); },
  });

  // Load profile on mount + heartbeat for legacy inactivity detection
  useEffect(()=>{
    loadProfile();
    // Update last_seen_at once per session (throttled via sessionStorage)
    if (!sessionStorage.getItem("mp_heartbeat")) {
      sessionStorage.setItem("mp_heartbeat", "1");
      import("@/lib/auth/heartbeat-action").then(m => m.updateLastSeen()).catch(() => {});
    }
  },[loadProfile]);

  // Fetch shared wings from family members
  useEffect(() => {
    getWingsSharedWithMe().then(({ shares }) => {
      if (shares && shares.length > 0) {
        setSharedWings(shares.slice(0, 2).map((s: { id: string; wing_id: string; owner_id: string; owner_name?: string; permission: string; can_add?: boolean; can_edit?: boolean; can_delete?: boolean }) => ({
          shareId: s.id,
          wingId: s.wing_id,
          ownerName: s.owner_name || tPalace("unknownOwner"),
          ownerId: s.owner_id,
          permission: s.permission,
          canAdd: s.can_add ?? false,
          canEdit: s.can_edit ?? false,
          canDelete: s.can_delete ?? false,
        })));
      }
    }).catch(() => {/* ignore — shared wings are optional */});
  }, []);

  // Show era picker for existing users who haven't chosen a style
  useEffect(() => {
    if (onboarded && !styleEra && !profileLoading) setShowEraPicker(true);
  }, [onboarded, styleEra, profileLoading]);

  // ── Scene loading overlay — only on the VERY FIRST Palace visit. After
  // that, the persistent warm ExteriorScene portal is already rendered and
  // switching back from Atrium/Library is instantaneous — no splash at all. ──
  const firstPalaceVisitRef = useRef(true);
  useEffect(() => {
    // Show splash only first time entering exterior, and only briefly
    if (view === "exterior" && firstPalaceVisitRef.current) {
      firstPalaceVisitRef.current = false;
      setSceneLoading(true);
      // onReady from ExteriorScene will hide it precisely; 2.5s safety.
      const t = setTimeout(() => setSceneLoading(false), 2500);
      return () => clearTimeout(t);
    }
    // Any other view transition: no splash.
    setSceneLoading(false);
  }, [view, navMode]);

  // ── Persistent Palace portal host — keeps ExteriorScene mounted across
  //    navMode switches so re-entering 3D is instant (no WebGL re-init). ──
  const [palaceHost, setPalaceHost] = useState<HTMLDivElement | null>(null);
  const [hasVisitedPalace, setHasVisitedPalace] = useState(false);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.createElement("div");
    el.setAttribute("data-palace-persistent", "");
    el.style.cssText = "position:fixed;inset:0;z-index:0;display:none;";
    document.body.appendChild(el);
    setPalaceHost(el);
    return () => { try { document.body.removeChild(el); } catch {} };
  }, []);
  useEffect(() => {
    if (navMode === "3d") setHasVisitedPalace(true);
  }, [navMode]);
  useEffect(() => {
    if (!palaceHost) return;
    const show = navMode === "3d" && view === "exterior";
    palaceHost.style.display = show ? "block" : "none";
  }, [palaceHost, navMode, view]);

  // ── Orientation key — bump on rotate to force NavigationBar remount ──
  const [orientKey, setOrientKey] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setOrientKey((k) => k + 1);
    window.addEventListener("orientationchange", bump);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", bump);
    return () => {
      window.removeEventListener("orientationchange", bump);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", bump);
    };
  }, []);

  // ── Force a hard reflow on orientation changes ──
  // Several mobile browsers (Safari, Edge on Android) leave position:fixed
  // elements stuck at the pre-rotation viewport until something forces a
  // recompute. We toggle the document root's overflow + dispatch a synthetic
  // resize after each orientationchange / visualViewport.resize to snap the
  // top bar, mobile nav and 3D canvas back into the new viewport.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reflow = () => {
      const html = document.documentElement;
      const body = document.body;
      const h = window.innerHeight;
      const w = window.innerWidth;
      // Pin html+body to an explicit pixel height so fixed-positioned bars
      // (top nav, bottom nav) recompute against the new viewport. Some mobile
      // browsers otherwise hold onto pre-rotation layout until a real event.
      html.style.height = `${h}px`;
      body.style.height = `${h}px`;
      html.style.width = `${w}px`;
      body.style.width = `${w}px`;
      // force synchronous layout
      void html.offsetHeight;
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event("resize"));
      // release back to dynamic values a beat later
      setTimeout(() => {
        html.style.height = "";
        body.style.height = "";
        html.style.width = "";
        body.style.width = "";
        window.dispatchEvent(new Event("resize"));
      }, 320);
    };
    const onChange = () => {
      reflow();
      setTimeout(reflow, 80);
      setTimeout(reflow, 280);
      setTimeout(reflow, 600);
    };
    window.addEventListener("orientationchange", onChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onChange);
    }
    return () => {
      window.removeEventListener("orientationchange", onChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", onChange);
      }
    };
  }, []);

  // ── Achievement tracking ──
  const userMems = useMemoryStore((s) => s.userMems);
  const roomSharingData = useMemoryStore((s) => s.roomSharing);
  const achCheckRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      checkAchievements(userMems, customRooms, roomLayouts, roomSharingData);
    }, 300);
    return () => clearTimeout(t);
  }, [userMems, customRooms, roomLayouts, roomSharingData, checkAchievements]);

  // ── Browser back button: push mode changes to history ──
  const prevNavModeRef = useRef(navMode);
  useEffect(() => {
    if (navMode !== prevNavModeRef.current) {
      window.history.pushState({ navMode }, "", window.location.pathname);
      prevNavModeRef.current = navMode;
    }
  }, [navMode]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const mode = e.state?.navMode;
      if (mode && (mode === "atrium" || mode === "library" || mode === "3d")) {
        setNavMode(mode);
        prevNavModeRef.current = mode;
      }
    };
    // Seed current state so first Back works
    window.history.replaceState({ navMode }, "", window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle ?help=1 query param (from Settings "Help & Tutorial" link) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("help") === "1") {
      window.history.replaceState({}, "", window.location.pathname);
      useNudgeStore.getState().reset();
      const page = navMode === "3d" ? "palace" : navMode;
      setTimeout(() => useNudgeStore.getState().initPage(page as "atrium" | "library" | "palace"), 300);
    }
    // Handle ?mode= param (from Settings NavigationBar)
    const modeParam = params.get("mode");
    if (modeParam && (modeParam === "atrium" || modeParam === "library" || modeParam === "3d")) {
      window.history.replaceState({}, "", window.location.pathname);
      setNavMode(modeParam);
    }
    // Clean up ?notifications=1 param (read synchronously in useState initializer)
    if (params.get("notifications") === "1") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeWing) trackWingVisit(activeWing);
  }, [activeWing, trackWingVisit]);

  // Load corridor paintings when wing changes
  useEffect(() => {
    if (activeWing) setCorridorPaintings(loadCorridorPaintings(activeWing));
    else setCorridorPaintings({});
  }, [activeWing]);

  // Clear shared context when leaving shared wing (navigating back to entrance/exterior)
  useEffect(() => {
    if (view === "entrance" || view === "exterior") {
      setSharedWingData(null);
    }
  }, [view]);

  useEffect(() => {
    if (activeRoomId) trackRoomVisit(activeRoomId);
  }, [activeRoomId, trackRoomVisit]);

  useEffect(() => {
    if (!achToast) return;
    const t = setTimeout(dismissAchToast, 4000);
    return () => clearTimeout(t);
  }, [achToast, dismissAchToast]);

  // ── Track progress loading & checking ──
  const customWings = useRoomStore((s) => s.customWings);

  useEffect(() => { loadTrackProgress(); }, [loadTrackProgress]);

  useEffect(() => {
    const t = setTimeout(() => {
      runProgressCheck({
        userMems, customRooms, roomLayouts, roomSharing: roomSharingData,
        visitedWings, customWings,
        legacyContactCount: 0, // updated after server fetch
        legacyWingAccessConfigured: false,
        legacyReviewed,
        hasUsedMassImport,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [userMems, customRooms, roomLayouts, roomSharingData, visitedWings, customWings, legacyReviewed, hasUsedMassImport, runProgressCheck]);

  useEffect(() => {
    if (!trackToast) return;
    const t = setTimeout(dismissTrackToast, 4500);
    return () => clearTimeout(t);
  }, [trackToast, dismissTrackToast]);

  useEffect(() => {
    if (!trackCelebration) return;
    const t = setTimeout(dismissCelebration, 6000);
    return () => clearTimeout(t);
  }, [trackCelebration, dismissCelebration]);

  // Auto-hide search bar in room view after 3s of inactivity
  useEffect(() => {
    if (view !== "room") { setSearchBarVisible(true); return; }
    setSearchBarVisible(true);
    if (searchHideTimer.current) clearTimeout(searchHideTimer.current);
    searchHideTimer.current = setTimeout(() => setSearchBarVisible(false), 3000);
    return () => { if (searchHideTimer.current) clearTimeout(searchHideTimer.current); };
  }, [view, searchQuery, filterType]);

  const revealSearchBar = useCallback(() => {
    setSearchBarVisible(true);
    if (searchHideTimer.current) clearTimeout(searchHideTimer.current);
    searchHideTimer.current = setTimeout(() => setSearchBarVisible(false), 3000);
  }, []);

  // Old tutorial auto-start — disabled, replaced by NudgeTooltip system
  // useEffect(() => { ... }, [view, tutorialCompleted, tutorialActive, startTutorial]);

  // Show feature spotlight for returning users who haven't seen all cards yet
  // Deferred: only show on 2nd+ visit (not during the first session after onboarding)
  useEffect(() => {
    if (onboarded && !showSpotlight && !tutorialActive && !allSpotlightsSeen()) {
      // Check if user has visited before (hint_visits > 0 means they've been here before)
      try {
        const visits = parseInt(localStorage.getItem("mp_hint_visits") || "0", 10);
        if (visits <= 1) return; // First visit — don't show spotlight yet
      } catch {}
      if (view === "exterior" || view === "entrance") {
        const t = setTimeout(() => setShowSpotlight(true), 3000);
        return () => clearTimeout(t);
      }
    }
  }, [onboarded, view, tutorialActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track that we just finished onboarding — suppress tutorial auto-start
  const justOnboardedRef = useRef(false);

  const handleFinishOnboarding=async()=>{
    await finishOnboarding();
    setOnboardDate();
    justOnboardedRef.current = true;
    // Land on Atrium — nudge system guides user through Atrium → Library → Palace
    setNavMode("atrium");
  };

  // ── Early returns for Settings / Notifications (before profileLoading gate
  //    so users never see the loading splash when switching tabs) ──
  const earlyNavBarProps = {
    isMobile,
    userName,
    onToolsClick: () => setShowTools(!showTools),
    toolsOpen: showTools,
    onNotifications: () => { setShowNotificationsPage(true); setShowSettings(false); },
    onSettings: () => { setShowSettings(true); setShowNotificationsPage(false); },
    onModeChange: (mode: string) => {
      setShowNotificationsPage(false); setShowSettings(false);
      setNavMode(mode as any);
    },
  };

  // ── Warm, persistent ExteriorScene via body-level portal (keeps scene alive). ──
  const warmPalaceScene = (palaceHost && hasVisitedPalace)
    ? createPortal(
        <ExteriorScene
          key={dlKey}
          onReady={() => setSceneLoading(false)}
          onRoomHover={setHovWing}
          onRoomClick={(wingId: string) => {
            if (walkthroughActive && wingId !== "__entrance__") return;
            if (wingId === "__entrance__") { if (nudgeHL.entrance) nudgeDismiss(); enterEntrance(); }
            else { enterCorridor(wingId); }
          }}
          hoveredRoom={hovWing}
          wings={allWings}
          highlightDoor={(walkthroughActive && walkthroughPhase === 0 ? "__entrance__" : null) || nudgeHL.entrance || null}
          styleEra={styleEra || "roman"}
          autoWalkTo={autoWalking && nudgeHL.entrance ? nudgeHL.entrance : undefined}
        />,
        palaceHost
      )
    : null;

  if (showSettings && !walkthroughActive) {
    return (<>
      {warmPalaceScene}
      <NavigationBar currentMode={navMode} {...earlyNavBarProps} activeTab="me" />
      <SettingsInline />
    </>);
  }

  if (showNotificationsPage && !walkthroughActive) {
    return (<>
      {warmPalaceScene}
      <NavigationBar currentMode={navMode} {...earlyNavBarProps} activeTab="notifications" />
      <NotificationsPage />
    </>);
  }

  if(profileLoading){
    return(<div style={{width:"100vw",height:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:`linear-gradient(165deg,${T.color.linen} 0%,${T.color.warmStone} 50%,${T.color.sandstone} 100%)`,fontFamily:T.font.display}}>
      <div style={{marginBottom:"1.25rem"}}><PalaceLogo variant="mark" color="dark" size="lg" /></div>
      <div style={{fontSize:isMobile?"1.375rem":"1.75rem",fontWeight:300,color:T.color.charcoal}}>{tPalace("appTitle")}</div>
      <div style={{fontSize:"0.875rem",color:T.color.muted,marginTop:"0.75rem",fontFamily:T.font.body}}>{tPalace("loadingPalace")}</div>
    </div>);
  }

  if(!onboarded) return <OnboardingWizard onFinish={handleFinishOnboarding}/>;

  const hovDoorRoom=hovDoor&&activeWing?getWingRooms(activeWing).find(r=>r.id===hovDoor)??null:null;

  // ── Mobile bottom bar configuration ──
  const bottomBarHeight = isMobile ? 64 : 0;
  const safeBottom = isMobile ? bottomBarHeight + 8 : 70;

  /* ── Lazy-load spinner fallback ── */
  const lazyFallback = <div style={{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,background:"rgba(0,0,0,.3)",backdropFilter:"blur(0.25rem)"}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{width:"2.5rem",height:"2.5rem",border:"0.1875rem solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} /></div>;

  /* ── Shared panel overlays — rendered in ALL modes (atrium, library, 3D) ── */
  const sharedPanelOverlays = (<>
    {showTimeline&&<Suspense fallback={lazyFallback}><MemoryTimeline onClose={()=>setShowTimeline(false)} onNavigateLibrary={()=>{setShowTimeline(false);setNavMode("library");}}/></Suspense>}
    {showStatistics&&<Suspense fallback={lazyFallback}><StatisticsPanel onClose={()=>setShowStatistics(false)}/></Suspense>}
    {showMemoryMap&&<Suspense fallback={lazyFallback}><MemoryMap userMems={userMems} onClose={()=>setShowMemoryMap(false)} onNavigateLibrary={()=>{setShowMemoryMap(false);setNavMode("library");}} onNavigateToMemory={(wingId,roomId,memoryId)=>{setShowMemoryMap(false);setLibraryTarget({wingId,roomId,memoryId});setNavMode("library");}} onNavigate={(roomId)=>{setShowMemoryMap(false);const wingId=roomId.startsWith("fr")?"family":roomId.startsWith("tr")?"travel":roomId.startsWith("cr")?"childhood":roomId.startsWith("kr")?"career":roomId.startsWith("rr")?"creativity":"family";setLibraryTarget({wingId,roomId});setNavMode("library");}}/></Suspense>}
    {showMassImport&&<Suspense fallback={lazyFallback}><MassImportPanel onClose={()=>setShowMassImport(false)} initialWingId={activeWing} initialRoomId={activeRoomId}/></Suspense>}
    {showAchievements&&<AchievementsPanel onClose={()=>setShowAchievements(false)} highlightId={achHighlightId}/>}
    {showTracksPanel&&!selectedTrackId&&<TracksPanel onClose={()=>setShowTracksPanel(false)}/>}
    {selectedTrackId&&<TrackDetailPanel trackId={selectedTrackId} onClose={()=>setSelectedTrackId(null)} onNavigate={(target)=>{setShowTracksPanel(false);setSelectedTrackId(null);switch(target){case "library-import":setNavMode("library");setShowMassImport(true);break;case "library":setNavMode("library");break;case "upload":setNavMode("library");setShowMassImport(true);break;case "room":{const wing=activeWing||"family";const prefix:{[k:string]:string}={family:"fr",travel:"tr",childhood:"cr",career:"kr",creativity:"rr"};setNavMode("3d");enterCorridor(wing);setTimeout(()=>enterRoom(activeRoomId||`${prefix[wing]||"fr"}1`),600);break;}case "corridor":{const wing=activeWing||"family";setNavMode("3d");setTimeout(()=>enterCorridor(wing),600);break;}case "share":{if(activeRoomId){setShowSharing(true);}else{const wing=activeWing||"family";const prefix:{[k:string]:string}={family:"fr",travel:"tr",childhood:"cr",career:"kr",creativity:"rr"};const roomId=`${prefix[wing]||"fr"}1`;setNavMode("3d");enterCorridor(wing);setTimeout(()=>{enterRoom(roomId);setTimeout(()=>setShowSharing(true),600);},600);}break;}case "wings":{setNavMode("3d");const wing=activeWing||"family";setTimeout(()=>enterWing(wing),600);break;}case "entrance":setNavMode("3d");setTimeout(()=>enterEntrance(),300);break;case "interview":setShowInterviewPanel(true);break;case "legacy":setShowLegacyPanel(true);break;default:break;}}}/>}
    {showInterviewLibrary&&<InterviewLibraryPanel onClose={()=>setShowInterviewLibrary(false)} highlightWingId={activeWing}/>}
    {showInterviewHistory&&<InterviewHistoryPanel onClose={()=>setShowInterviewHistory(false)}/>}
    {showInterview&&<Suspense fallback={lazyFallback}><InterviewPanel onClose={()=>{setShowInterviewPanel(false);markChecklistItem("complete_interview");}} onCreateMemory={(mem, wingId)=>{
      const targetWing = wingId === "general" ? "family" : wingId;
      const prefix = {family:"fr",travel:"tr",childhood:"cr",career:"kr",creativity:"rr"}[targetWing]||"fr";
      const roomId = `${prefix}1`;
      addMemoryToRoom(roomId, mem);
    }}/></Suspense>}
    {showLegacyPanel&&<LegacyPanel onClose={()=>setShowLegacyPanel(false)}/>}
    {showSharedWithMe&&<SharedWithMePanel onClose={()=>setShowSharedWithMe(false)} onNavigateToRoom={(roomId)=>{setShowSharedWithMe(false);const wingId=roomId.startsWith("fr")?"family":roomId.startsWith("tr")?"travel":roomId.startsWith("cr")?"childhood":roomId.startsWith("kr")?"career":roomId.startsWith("rr")?"creativity":"family";setNavMode("3d");enterCorridor(wingId);setTimeout(()=>enterRoom(roomId),600);}}/>}
  </>);

  // ── Helper: shared NavigationBar props ──
  const navBarProps = {
    isMobile,
    userName,
    onToolsClick: () => setShowTools(!showTools),
    toolsOpen: showTools,
    onNotifications: () => { setShowNotificationsPage(true); setShowSettings(false); },
    onSettings: () => { setShowSettings(true); setShowNotificationsPage(false); },
    onModeChange: (mode: string) => {
      setShowNotificationsPage(false); setShowSettings(false);
      setNavMode(mode as any);
    },
  };

  // ── Home mode: render Home dashboard ──
  if (navMode === "atrium" && !walkthroughActive) {
    return (<>
      {warmPalaceScene}
      <NavigationBar key={"nav-atrium-"+orientKey} currentMode="atrium" {...navBarProps} />
      <UniversalActions groups={actionGroups} open={showTools} onClose={() => setShowTools(false)} isMobile={isMobile} />
      <Suspense fallback={lazyFallback}><HomeView /></Suspense>
      <NudgeProvider page="atrium" />
      {sharedPanelOverlays}
    </>);
  }

  // ── Library mode: render Library view instead of 3D (skip during walkthrough) ──
  if (navMode === "library" && !walkthroughActive) {
    return (<>
      {warmPalaceScene}
      <NavigationBar key={"nav-library-"+orientKey} currentMode="library" {...navBarProps} />
      <UniversalActions groups={actionGroups} open={showTools} onClose={() => setShowTools(false)} isMobile={isMobile} />
      <Suspense fallback={lazyFallback}><LibraryView /></Suspense>
      <NudgeProvider page="library" />
      {sharedPanelOverlays}
    </>);
  }

  return(
    <div style={{width:"100vw",height:"100dvh",background:T.color.sandstone,position:"relative",overflow:"hidden"}}>
      <TuscanStyles />
      <style>{`*{box-sizing:border-box;margin:0}@keyframes sceneLoadFadeOut{0%{opacity:1}50%{opacity:1}100%{opacity:0}}@keyframes sceneLoadPulse{0%,100%{opacity:.5}50%{opacity:1}}@keyframes fadeIn{from{opacity:0;transform:translateY(0.75rem)}to{opacity:1;transform:translateY(0)}}@keyframes fadeUp{from{opacity:0;transform:translateY(0.5rem)}to{opacity:1;transform:translateY(0)}}@keyframes portalFlash{0%{opacity:0}30%{opacity:1}100%{opacity:0}}.era-btn:focus-visible{outline:0.125rem solid ${T.color.gold};outline-offset:0.125rem}.era-btn{transition:all .2s ease;}.era-btn:hover{background:${T.color.warmStone} !important;border-color:${T.color.gold} !important;transform:translateY(-0.0625rem)}.layout-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238B7355'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 0.25rem center;padding-right:1rem !important}.layout-select:focus-visible{outline:0.125rem solid ${T.color.gold};outline-offset:0.0625rem;border-color:${T.color.gold} !important}`}</style>
      <div role="application" aria-label={tPalace("sceneAriaLabel")} className="no-overscroll" style={{position:"absolute",inset:0,opacity,transition:"opacity 0.4s ease",touchAction:"none"}}>
        {/* ExteriorScene mounted persistently via body-level portal (see warmPalaceScene) */}
        {warmPalaceScene}
        {view==="entrance"&&<EntranceHallScene key={dlKey} onDoorClick={(wingId: string)=>{if(walkthroughActive&&walkthroughPhase<=2&&wingId!=="__exterior__"&&wingId!==walkthroughTargetWing)return;if(wingId==="__exterior__")exitToPalace();else if(wingId==="attic")setShowStoragePlayer(true);else if(wingId.startsWith("locked"))setShowUpgradePrompt(true);else if(wingId.startsWith("shared:")){const [,slug,shareId]=wingId.split(":");const shareInfo=sharedWings.find(sw=>sw.shareId===shareId);if(shareInfo){getSharedWingData(shareId).then(result=>{if(result.wing&&result.rooms){setSharedWingData(result);enterCorridor(wingId);}});}}else{if(nudgeHL.wing)nudgeDismiss();enterCorridor(wingId);}}} wings={allWings} sharedWings={sharedWings} highlightDoor={(walkthroughActive&&walkthroughPhase===2?walkthroughTargetWing:null)||nudgeHL.wing||null} styleEra={styleEra||"roman"} onInlayClick={()=>setShowUpgradePrompt(true)} onBustClick={() => { /* bust builder hidden */ }} bustPedestals={bustPedestals} bustTextureUrl={bustTextureUrl} bustModelUrl={bustModelUrl} bustProportions={bustProportions} bustName={bustName || userName || null} bustGender={bustGender || null} autoWalkTo={autoWalking && nudgeHL.wing ? nudgeHL.wing : undefined}/>}
        {view==="corridor"&&activeWing&&activeWing.startsWith("shared:")&&sharedWingData?<CorridorScene key={dlKey+"|"+activeWing+"|"+JSON.stringify(sharedWingData.rooms.map((r: any)=>r.id+r.name+(r.icon||"")))+"|"+(sharedWingData.wing.accentColor||"#7AA0C8")+"|"+(styleEra||"roman")} wingId={activeWing} rooms={sharedWingData.rooms.map((r: any)=>({id:r.id,name:r.name,icon:r.icon||"\uD83D\uDCC1",shared:false,sharedWith:[],coverHue:30}))} onDoorHover={setHovDoor} onDoorClick={(roomId: string)=>{enterRoom(roomId);}} hoveredDoor={hovDoor} wingData={{id:sharedWingData.wing.slug,name:sharedWingData.wing.customName||sharedWingData.wing.slug,nameKey:sharedWingData.wing.slug,icon:"\uD83C\uDFDB\uFE0F",accent:sharedWingData.wing.accentColor||"#7AA0C8",wall:"#DDD4C6",floor:"#9E8264",desc:"Shared wing",descKey:"sharedWing",layout:"L-shaped gallery"}} corridorPaintings={{}} styleEra={styleEra||"roman"} onInlayClick={()=>setShowUpgradePrompt(true)} onPaintingClick={()=>setShowCorridorGallery(true)}/>:view==="corridor"&&activeWing&&wingData&&<CorridorScene key={dlKey+"|"+activeWing+"|"+JSON.stringify(getWingRooms(activeWing).map(r=>r.id+r.name+r.icon))+"|"+wingData.accent+"|"+JSON.stringify(corridorPaintings)+"|"+(styleEra||"roman")} wingId={activeWing} rooms={getWingRooms(activeWing)} onDoorHover={setHovDoor} onDoorClick={(roomId: string)=>{if(walkthroughActive&&walkthroughPhase===3&&roomId!==walkthroughTargetRoom)return;if(nudgeHL.room)nudgeDismiss();enterRoom(roomId);}} hoveredDoor={hovDoor} wingData={wingData} corridorPaintings={corridorPaintings} highlightDoor={(walkthroughActive&&walkthroughPhase===3?walkthroughTargetRoom:null)||nudgeHL.room||null} styleEra={styleEra||"roman"} onInlayClick={()=>setShowUpgradePrompt(true)} onPaintingClick={()=>setShowCorridorGallery(true)} autoWalkTo={autoWalking && nudgeHL.room ? nudgeHL.room : undefined}/>}
        {view==="room"&&activeWing&&activeRoomId&&<InteriorScene key={dlKey+"|"+roomMemsKey+"|"+(roomLayouts[activeRoomId]||"")+"|"+(styleEra||"roman")} roomId={activeWing} actualRoomId={activeRoomId} layoutOverride={roomLayouts[activeRoomId]} memories={roomMems} onMemoryClick={handleMemClick} wingData={wingData||undefined} styleEra={styleEra||"roman"}/>}
      </div>

      {view==="exterior"&&<LandscapeNudge />}

      {/* Scene loading overlay — fades out after 3D canvas initializes */}
      {sceneLoading&&<div key={view+"|"+navMode} style={{position:"absolute",inset:0,zIndex:40,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"1rem",background:`linear-gradient(165deg, ${T.color.linen} 0%, ${T.color.warmStone} 55%, ${T.color.sandstone} 100%)`,animation:"sceneLoadFadeOut 0.8s ease-in-out forwards",pointerEvents:"none"}}><div style={{animation:"sceneLoadPulse 1.4s ease-in-out infinite"}}><PalaceLogo variant="mark" color="dark" size="lg" /></div><span style={{fontFamily:T.font.display,fontSize:"1.15rem",color:T.color.walnut,letterSpacing:"0.04em",animation:"sceneLoadPulse 1.4s ease-in-out infinite"}}>{tPalace("sceneLoading")}</span></div>}

      {/* TopBar hidden — replaced by PalaceSubNav */}

      {/* NavigationBar — mode switcher (atrium / library / 3D) */}
      <NavigationBar
        key={"nav-3d-"+orientKey}
        currentMode="3d"
        {...navBarProps}
        hidden={!!selMem || showUpload || showSharing || walkthroughActive}
      />
      <UniversalActions groups={actionGroups} open={showTools} onClose={() => setShowTools(false)} isMobile={isMobile} />
      <PalaceSubNav
        view={view as "exterior" | "entrance" | "corridor" | "room"}
        wingName={wingData?.name}
        wingAccent={wingData?.accent}
        wingIcon={wingData?.icon}
        roomName={activeRoomData?.name}
        roomId={activeRoomId || undefined}
        roomIcon={activeRoomData?.icon}
        wings={allWings}
        wingRooms={wingRoomsMap}
        sharedWings={sharedWings}
        hidden={!!selMem || showUpload || showSharing || walkthroughActive}
        isMobile={isMobile}
        onExitToPalace={exitToPalace}
        onEntranceHall={enterEntrance}
        onSwitchWing={(wingId) => { switchWing(wingId); }}
        onNavigateRoom={(wingId, roomId) => { enterCorridor(wingId); setTimeout(() => enterRoom(roomId), 300); }}
        onNavigateSharedWing={(shareId, wingSlug) => {
          getSharedWingData(shareId).then(result => { if (result.wing && result.rooms) { setSharedWingData(result); enterCorridor(`shared:${wingSlug}:${shareId}`); } });
        }}
        onUpload={() => setShowUpload(true)}
        onGallery={() => setShowGallery(true)}
        onWingManager={() => setShowWingManager(true)}
        onRoomManager={() => setShowRoomManager(true)}
        onCorridorGallery={() => setShowCorridorGallery(true)}
        onMassImport={() => setShowMassImport(true)}
        onShare={() => setShowSharing(true)}
        onSharingSettings={() => setShowSharingSettings(true)}
        onBack={() => { view === "room" ? exitToCorridor() : view === "corridor" ? exitToEntrance() : exitToPalace(); }}
      />

      {/* Portal transition overlay */}
      {portalAnim&&<div style={{position:"absolute",inset:0,zIndex:45,pointerEvents:"none",animation:"portalFlash .5s ease both",background:"radial-gradient(ellipse at center,rgba(200,168,104,.6) 0%,rgba(200,168,104,.15) 40%,transparent 70%)"}}/>}



      {/* Hover tooltips — desktop only */}
      {!isMobile && hovWingData&&view==="exterior"&&<WingTooltip wing={hovWingData}/>}
      {!isMobile && hovDoorRoom&&view==="corridor"&&<DoorTooltip room={hovDoorRoom} wingAccent={wingData?.accent} wingId={wingData?.id}/>}

      {/* Bottom hints removed — replaced by PalaceSubNav */}

      {/* Search bar + room info (room view) — search auto-hides after 3s */}
      {!walkthroughActive&&view==="room"&&activeRoomData&&activeRoomId&&<>
        <div onClick={revealSearchBar} onMouseMove={revealSearchBar} style={{
          opacity: searchBarVisible ? 1 : 0, transform: searchBarVisible ? "translateY(0)" : "translateY(-0.5rem)",
          transition: "opacity .3s ease, transform .3s ease", pointerEvents: searchBarVisible ? "auto" : "none",
        }}>
          <SearchBar query={searchQuery} filterType={filterType} totalCount={allRoomMems.length} filteredCount={roomMems.length} accent={wingData?.accent} onQueryChange={(q)=>{setSearchQuery(q);revealSearchBar();}} onFilterChange={(f)=>{setFilterType(f);revealSearchBar();}}/>
        </div>
        {/* Tap zone to reveal search when hidden */}
        {!searchBarVisible && <div onClick={revealSearchBar} style={{position:"absolute",top:0,left:0,right:0,height:"3.375rem",zIndex:29,cursor:"pointer"}} />}
        {!isMobile && (()=>{const rs=currentSharing(activeRoomId);return <div style={{position:"absolute",top:"8.25rem",right:"1.125rem",zIndex:30,animation:"fadeIn .5s ease .4s both",display:"flex",gap:"0.375rem",alignItems:"center"}}>
          {/* Compact room info strip */}
          <div data-nudge="palace_room_info" style={{background:`${T.color.white}e6`,backdropFilter:"blur(0.75rem)",WebkitBackdropFilter:"blur(0.75rem)",borderRadius:"1rem",padding:"0.375rem 0.75rem",border:`1px solid ${T.color.cream}`,display:"flex",alignItems:"center",gap:"0.375rem",boxShadow:"0 0.125rem 0.75rem rgba(44,44,42,.06)"}}>
            <span style={{display:"inline-flex",lineHeight:1}}><RoomIcon roomId={activeRoomId} wingId={activeWing||undefined} size={16} color={wingData?.accent||T.color.terracotta} /></span>
            <span style={{fontFamily:T.font.display,fontSize:"0.8125rem",fontWeight:500,color:T.color.charcoal}}>{activeRoomData.name}</span>
            <span style={{fontFamily:T.font.body,fontSize:"0.625rem",color:T.color.muted}}>{allRoomMems.length}</span>
            <div style={{width:"0.0625rem",height:"0.875rem",background:T.color.cream}} />
            <select className="layout-select" data-nudge="palace_room_layout" value={roomLayouts[activeRoomId]||""} onChange={e=>setRoomLayout(activeRoomId,e.target.value)} style={{background:`${T.color.warmStone}66`,border:`1px solid ${T.color.cream}`,borderRadius:"0.375rem",fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.walnut,cursor:"pointer",outline:"none",padding:"0.25rem 1rem 0.25rem 0.375rem"}}>
              <option value="">{tAction("auto")}</option>
              {ROOM_LAYOUTS.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <div style={{width:"0.0625rem",height:"0.875rem",background:T.color.cream}} />
            <button data-nudge="palace_room_share" onClick={()=>setShowSharing(true)} style={{background:"transparent",border:"none",display:"flex",alignItems:"center",gap:"0.25rem",cursor:"pointer",padding:"0.375rem 0.5rem",borderRadius:"0.375rem",transition:"background .15s"}} onMouseEnter={e=>{e.currentTarget.style.background=`${T.color.warmStone}88`;}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
              {rs.shared?<><div style={{width:"0.375rem",height:"0.375rem",borderRadius:"0.1875rem",background:T.color.sage}}/><span style={{fontFamily:T.font.body,fontSize:"0.625rem",color:T.color.sage,fontWeight:500}}>{tAction("shareStatus")}</span></>
              :<span style={{fontFamily:T.font.body,fontSize:"0.625rem",color:T.color.muted}}>{tAction("shareAction")}</span>}
            </button>
            <button onClick={()=>setShowRoomShare(true)} title={tAction("shareAsCard")} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:"0.875rem",lineHeight:1,padding:"0.375rem 0.5rem",display:"flex",alignItems:"center",borderRadius:"0.375rem",transition:"background .15s"}} onMouseEnter={e=>{e.currentTarget.style.background=`${T.color.warmStone}88`;}} onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>
          </div>
        </div>;})()}
      </>}

      {/* OnThisDay — floating card in exterior view */}
      {!walkthroughActive&&view==="exterior"&&<OnThisDay onNavigateToRoom={(wingId,roomId)=>{enterWing(wingId);setTimeout(()=>enterRoom(roomId),600);}}/>}

      {/* Time Capsule Reveal — floating card when capsules have newly opened */}
      {!walkthroughActive&&(view==="exterior"||view==="entrance")&&<TimeCapsuleReveal onNavigateToRoom={(wingId,roomId)=>{enterWing(wingId);setTimeout(()=>enterRoom(roomId),600);}}/>}

      {/* Floating points animation — always present */}
      <FloatingPoints />

      {/* Desktop ActionMenu removed — replaced by PalaceSubNav */}

      {/* Touch controls tutorial — mobile only, one-time */}
      {isMobile && <TouchControlsOverlay view={view} />}

      {/* Visible mobile joystick — room, corridor & entrance views */}
      {isMobile && (view === "room" || view === "corridor" || view === "entrance") && (
        <MobileJoystick
          visible={!selMem && !showUpload && !showSharing && !moreMenuOpen}
          onMove={() => {}}
        />
      )}

      {/* MobileBottomBar removed — replaced by PalaceSubNav */}

      {/* Panels + overlays */}
      {showUpload&&activeRoomId&&<UploadPanel wing={wingData} room={activeRoomData} onClose={()=>setShowUpload(false)} onAdd={(mem: any)=>{
        const wasFirst = Object.values(userMems).every(a => a.length === 0) && allRoomMems.length === 0;
        handleAddMemory(mem);
        markChecklistItem("upload_memory");
        if (wasFirst && !walkthroughCompleted) {
          // Don't show if already shown
          try { if (localStorage.getItem("mp_discovery_menu_shown") === "true") return; } catch {}
          setTimeout(() => setShowDiscoveryMenu(true), 1500);
        }
      }} roomMemories={allRoomMems} onUpdateMemory={handleUpdateMemory}/>}
      {showSharing&&activeRoomId&&<SharingPanel wing={wingData} room={activeRoomData} roomId={activeRoomId} sharing={currentSharing(activeRoomId)} onUpdate={(u: any)=>{updateSharing(activeRoomId,u);markChecklistItem("share_room");}} onClose={()=>setShowSharing(false)}/>}
      {showRoomManager&&activeWing&&wingData&&<RoomManagerPanel wing={wingData} onClose={()=>{setShowRoomManager(false);markChecklistItem("customize_room");}} onEnterRoom={enterRoom}/>}
      {showWingManager&&<WingManagerPanel onClose={()=>setShowWingManager(false)}/>}
      {selMem&&<MemoryDetail mem={selMem} room={activeRoomData} wing={wingData} onClose={()=>setSelMem(null)} onDelete={handleDeleteMemory} onUpdate={handleUpdateMemory}/>}
      {showRoomShare&&activeRoomData&&wingData&&<ShareCard roomName={activeRoomData.name} roomIcon={activeRoomData.icon} wingName={wingData.name} wingIcon={wingData.icon} memCount={allRoomMems.length} accent={wingData.accent} onClose={()=>setShowRoomShare(false)}/>}
      {showTimeline&&<Suspense fallback={lazyFallback}><MemoryTimeline onClose={()=>setShowTimeline(false)} onNavigateLibrary={()=>{setShowTimeline(false);setNavMode("library");}}/></Suspense>}
      {showStatistics&&<Suspense fallback={lazyFallback}><StatisticsPanel onClose={()=>setShowStatistics(false)}/></Suspense>}
      {showMemoryMap&&<Suspense fallback={lazyFallback}><MemoryMap userMems={userMems} onClose={()=>setShowMemoryMap(false)} onNavigateLibrary={()=>{setShowMemoryMap(false);setNavMode("library");}} onNavigateToMemory={(wingId,roomId,memoryId)=>{setShowMemoryMap(false);setLibraryTarget({wingId,roomId,memoryId});setNavMode("library");}} onNavigate={(roomId)=>{setShowMemoryMap(false);const wingId=roomId.startsWith("fr")?"family":roomId.startsWith("tr")?"travel":roomId.startsWith("cr")?"childhood":roomId.startsWith("kr")?"career":roomId.startsWith("rr")?"creativity":"family";setLibraryTarget({wingId,roomId});setNavMode("library");}}/></Suspense>}
      {showMassImport&&<Suspense fallback={lazyFallback}><MassImportPanel onClose={()=>setShowMassImport(false)} initialWingId={activeWing} initialRoomId={activeRoomId}/></Suspense>}
      {showGallery&&activeRoomId&&<RoomGallery mems={allRoomMems} wing={wingData} room={activeRoomData} onClose={()=>setShowGallery(false)} onUpdate={handleUpdateMemory} onSelect={(mem)=>{setShowGallery(false);setSelMem(mem);}}/>}
      {showCorridorGallery&&activeWing&&wingData&&<CorridorGalleryPanel wing={wingData} rooms={getWingRooms(activeWing)} onClose={()=>setShowCorridorGallery(false)} onPaintingsChange={setCorridorPaintings} currentPaintings={corridorPaintings}/>}
      {showStoragePlayer&&<StoragePlayerPanel onClose={()=>setShowStoragePlayer(false)}/>}


      {/* Old tutorial overlay — disabled, replaced by NudgeTooltip system */}
      {/* <TutorialOverlay /> */}

      {/* Feature spotlight — shown once after onboarding completes */}
      {showSpotlight && !tutorialActive && !walkthroughActive && <FeatureSpotlight
        onImport={() => { setShowSpotlight(false); setShowMassImport(true); }}
        onInterview={() => { setShowSpotlight(false); setShowInterviewLibrary(true); }}
        onTimeCapsule={() => { setShowSpotlight(false); /* Navigate to a room to create time capsule */ }}
        onShare={() => { setShowSpotlight(false); if (activeRoomId) setShowSharing(true); }}
      />}

      {/* Getting Started checklist — disabled, replaced by NudgeTooltip system */}
      {/* <GettingStartedChecklist ... /> */}

      {/* First memory prompt — shown in empty rooms when upload panel is closed */}
      {view==="room"&&activeRoomId&&allRoomMems.length===0&&!showUpload&&!selMem&&!showSharing&&!tutorialActive&&
        <FirstMemoryPrompt wing={wingData} room={activeRoomData} onUpload={()=>setShowUpload(true)} />}

      {/* Contextual tooltips — shown once per context */}
      <ContextualTooltip tooltipId="corridor_click_door" show={view==="corridor"&&!tutorialActive&&!showSpotlight&&!walkthroughActive} />
      <ContextualTooltip tooltipId="room_click_furniture" show={view==="room"&&!tutorialActive&&!showSpotlight&&!walkthroughActive&&roomMems.length>0} />
      {/* room_empty_upload tooltip removed — replaced by FirstMemoryPrompt */}

      {/* Cinematic walkthrough overlay — narration + directional indicator */}
      {walkthroughActive && <CinematicWalkthrough />}

      {/* Discovery menu — shown after first memory upload */}
      {showDiscoveryMenu && <DiscoveryMenu
        onMassImport={() => setShowMassImport(true)}
        onInterview={() => setShowInterviewLibrary(true)}
        onTimeCapsule={() => {/* navigate to room for time capsule */}}
        onShare={() => { if (activeRoomId) setShowSharing(true); }}
        onTracks={() => setShowTracksPanel(true)}
        onCustomize={() => { if (activeWing) setShowRoomManager(true); else setShowWingManager(true); }}
        onDismiss={() => setShowDiscoveryMenu(false)}
      />}

      {/* Era picker modal — for existing users who haven't chosen a style */}
      {showEraPicker && <div aria-hidden="true" style={{position:"absolute",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(44,44,42,.6)",backdropFilter:"blur(0.375rem)"}} onClick={()=>setShowEraPicker(false)}>
        <div role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={e=>{if(e.key==="Escape")setShowEraPicker(false);}} onClick={e=>e.stopPropagation()} style={{background:T.color.linen,borderRadius:"1.25rem",padding:isMobile?"1.75rem 1.25rem":"2.25rem 2.5rem",maxWidth:"30rem",width:"90%",textAlign:"center",boxShadow:"0 0.75rem 3rem rgba(0,0,0,.2)"}}>
          <h2 style={{fontFamily:T.font.display,fontSize:isMobile?"1.375rem":"1.625rem",fontWeight:400,color:T.color.charcoal,marginBottom:"0.5rem"}}>{tPalace("eraPickerTitle")}</h2>
          <p style={{fontFamily:T.font.body,fontSize:"0.875rem",color:T.color.muted,marginBottom:"1.25rem"}}>{tPalace("eraPickerSubtitle")}</p>
          <div style={{display:"flex",gap:"0.75rem",marginBottom:"1.25rem"}}>
            {(["roman","renaissance"] as const).map(era=>(
              <button key={era} className="era-btn" onClick={async()=>{setStyleEra(era);await updateProfile({styleEra:era});setShowEraPicker(false);}}
                style={{flex:1,padding:"1rem 0.75rem",borderRadius:"0.875rem",border:`2px solid ${era==="roman"?T.era.roman.secondary:T.era.renaissance.accent}40`,
                  background:T.color.linen,cursor:"pointer",transition:"all .2s"}}>
                <div style={{fontFamily:T.font.display,fontSize:"1.0625rem",fontWeight:600,color:T.color.charcoal,marginBottom:"0.25rem"}}>
                  {era==="roman"?tPalace("eraRoman"):tPalace("eraRenaissance")}
                </div>
                <div style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.muted,lineHeight:1.4}}>
                  {era==="roman"?tPalace("eraRomanDesc"):tPalace("eraRenaissanceDesc")}
                </div>
              </button>
            ))}
          </div>
          <button onClick={async()=>{setStyleEra("roman");await updateProfile({styleEra:"roman"});setShowEraPicker(false);}}
            style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.muted,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
            {tPalace("eraSkip")}
          </button>
        </div>
      </div>}

      {/* Upgrade prompt overlay — triggered by clicking locked inlays */}
      {showUpgradePrompt && <div aria-hidden="true" style={{position:"absolute",inset:0,zIndex:95,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(44,44,42,.5)",backdropFilter:"blur(0.25rem)"}}
        onClick={()=>setShowUpgradePrompt(false)}>
        <TuscanCard variant="elevated" padding="2rem 2.25rem" style={{maxWidth:"23.75rem",textAlign:"center",borderRadius:"1.125rem"}} animate>
          <div role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={e=>{if(e.key==="Escape")setShowUpgradePrompt(false);}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"2.5rem",marginBottom:"0.75rem"}}>{"🔒"}</div>
            <h3 style={{fontFamily:T.font.display,fontSize:"1.375rem",fontWeight:500,color:T.color.charcoal,marginBottom:"0.5rem"}}>{view==="entrance"?tPalace("lockedWing"):tPalace("lockedRoom")}</h3>
            <p style={{fontFamily:T.font.body,fontSize:"0.875rem",color:T.color.muted,lineHeight:1.5,marginBottom:"1.25rem"}}>{view==="entrance"?tPalace("upgradeWing"):tPalace("upgradeRoom")}</p>
            <button onClick={()=>setShowUpgradePrompt(false)}
              style={{fontFamily:T.font.body,fontSize:"0.9375rem",fontWeight:600,padding:"0.75rem 2rem",borderRadius:"0.625rem",border:"none",
                background:`linear-gradient(135deg,${T.color.terracotta},${T.color.walnut})`,color:"#FFF",cursor:"pointer"}}>
              {tPalace("gotIt")}
            </button>
          </div>
        </TuscanCard>
      </div>}



      {/* Achievement toast notification */}
      {achToast&&<div role="status" onClick={()=>{dismissAchToast();openAchWithHighlight(achToast.id);}} style={{position:"absolute",top:isMobile?"3.5rem":"4.125rem",right:isMobile?"max(0.75rem, env(safe-area-inset-right, 0.75rem))":"1.375rem",left:isMobile?"max(0.75rem, env(safe-area-inset-left, 0.75rem))":undefined,zIndex:90,cursor:"pointer",animation:"fadeUp .4s ease",background:`${T.color.white}f5`,backdropFilter:"blur(0.75rem)",borderRadius:"1rem",padding:"0.875rem 1.125rem",border:`1.5px solid ${T.color.gold}66`,boxShadow:"0 0.5rem 2rem rgba(169,124,46,.25)",display:"flex",alignItems:"center",gap:"0.75rem",maxWidth:isMobile?undefined:"20rem"}}>
        <div style={{width:"2.75rem",height:"2.75rem",borderRadius:"0.75rem",background:`linear-gradient(135deg,${T.color.goldLight}22,${T.color.gold}22)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><AchievementIcon id={achToast.icon} size={24} /></div>
        <div>
          <div style={{fontFamily:T.font.body,fontSize:"0.625rem",fontWeight:600,color:T.color.goldLight,textTransform:"uppercase",letterSpacing:"0.0625rem",marginBottom:"0.125rem"}}>{tAch("achievementUnlocked")}</div>
          <div style={{fontFamily:T.font.display,fontSize:"0.9375rem",fontWeight:600,color:T.color.charcoal}}>{tAch(achToast.titleKey)}</div>
          <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,lineHeight:1.3}}>{tAch(achToast.descKey)}</div>
        </div>
      </div>}

      {showAchievements&&<AchievementsPanel onClose={()=>setShowAchievements(false)} highlightId={achHighlightId}/>}

      {/* Invite & shared panels */}
      {showInvites&&<InviteNotificationsPanel onClose={()=>setShowInvites(false)}/>}
      {showSharedWithMe&&<SharedWithMePanel onClose={()=>setShowSharedWithMe(false)} onNavigateToRoom={(roomId)=>{setShowSharedWithMe(false);const wingId=roomId.startsWith("fr")?"family":roomId.startsWith("tr")?"travel":roomId.startsWith("cr")?"childhood":roomId.startsWith("kr")?"career":roomId.startsWith("rr")?"creativity":"family";setNavMode("3d");enterCorridor(wingId);setTimeout(()=>enterRoom(roomId),600);}}/>}
      {showSharingSettings&&<SharingSettingsPanel open={showSharingSettings} onClose={()=>setShowSharingSettings(false)}/>}

      {/* Interview panels */}
      {showInterviewLibrary&&<InterviewLibraryPanel onClose={()=>setShowInterviewLibrary(false)} highlightWingId={activeWing}/>}
      {showInterviewHistory&&<InterviewHistoryPanel onClose={()=>setShowInterviewHistory(false)}/>}
      {showInterview&&<Suspense fallback={lazyFallback}><InterviewPanel onClose={()=>{setShowInterviewPanel(false);markChecklistItem("complete_interview");}} onCreateMemory={(mem, wingId)=>{
        // Place interview memory in the first room of the relevant wing (or attic if general)
        const targetWing = wingId === "general" ? "family" : wingId;
        const prefix = {family:"fr",travel:"tr",childhood:"cr",career:"kr",creativity:"rr"}[targetWing]||"fr";
        const roomId = `${prefix}1`;
        addMemoryToRoom(roomId, mem);
      }}/></Suspense>}

      {/* Track panels */}
      {showTracksPanel&&!selectedTrackId&&<TracksPanel onClose={()=>setShowTracksPanel(false)}/>}
      {selectedTrackId&&<TrackDetailPanel trackId={selectedTrackId} onClose={()=>setSelectedTrackId(null)} onNavigate={(target)=>{setShowTracksPanel(false);setSelectedTrackId(null);switch(target){case "library-import":setNavMode("library");setShowMassImport(true);break;case "library":setNavMode("library");break;case "upload":setNavMode("library");setShowMassImport(true);break;case "room":{const wing=activeWing||"family";const prefix:{[k:string]:string}={family:"fr",travel:"tr",childhood:"cr",career:"kr",creativity:"rr"};setNavMode("3d");enterCorridor(wing);setTimeout(()=>enterRoom(activeRoomId||`${prefix[wing]||"fr"}1`),600);break;}case "corridor":{const wing=activeWing||"family";setNavMode("3d");setTimeout(()=>enterCorridor(wing),600);break;}case "share":{if(activeRoomId){setShowSharing(true);}else{const wing=activeWing||"family";const prefix:{[k:string]:string}={family:"fr",travel:"tr",childhood:"cr",career:"kr",creativity:"rr"};const roomId=`${prefix[wing]||"fr"}1`;setNavMode("3d");enterCorridor(wing);setTimeout(()=>{enterRoom(roomId);setTimeout(()=>setShowSharing(true),600);},600);}break;}case "wings":{setNavMode("3d");const wing=activeWing||"family";setTimeout(()=>enterWing(wing),600);break;}case "entrance":setNavMode("3d");setTimeout(()=>enterEntrance(),300);break;case "interview":setShowInterviewPanel(true);break;case "legacy":setShowLegacyPanel(true);break;default:break;}}}/>}
      {showLegacyPanel&&<LegacyPanel onClose={()=>setShowLegacyPanel(false)}/>}

      {/* Track step completion toast */}
      {trackToast&&<div role="status" onClick={()=>{dismissTrackToast();setShowTracksPanel(true);}} style={{position:"absolute",top:isMobile?"6.25rem":"4.125rem",left:isMobile?"max(0.75rem, env(safe-area-inset-left, 0.75rem))":undefined,right:isMobile?"max(0.75rem, env(safe-area-inset-right, 0.75rem))":"1.375rem",zIndex:88,cursor:"pointer",animation:"fadeUp .4s ease",background:`${T.color.white}f5`,backdropFilter:"blur(0.75rem)",borderRadius:"1rem",padding:"0.75rem 1rem",border:`1.5px solid ${T.color.sage}44`,boxShadow:"0 0.5rem 2rem rgba(74,103,65,.2)",display:"flex",alignItems:"center",gap:"0.75rem",maxWidth:isMobile?undefined:"21.25rem"}}>
        <div style={{width:"2.5rem",height:"2.5rem",borderRadius:"0.625rem",background:`linear-gradient(135deg,${T.color.sage}18,${T.color.sage}08)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.25rem",flexShrink:0}}>{"\u2713"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:T.font.body,fontSize:"0.625rem",fontWeight:600,color:T.color.sage,textTransform:"uppercase",letterSpacing:"0.0625rem",marginBottom:"0.0625rem"}}>{tTrack("stepCompleted")}</div>
          <div style={{fontFamily:T.font.display,fontSize:"0.875rem",fontWeight:600,color:T.color.charcoal}}>{tTrack(trackToast.stepTitleKey)}</div>
          <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted}}>{tTrack(trackToast.trackNameKey)}</div>
        </div>
        <div style={{fontFamily:T.font.body,fontSize:"0.875rem",fontWeight:700,color:T.color.goldLight}}>+{trackToast.points} MP</div>
      </div>}

      {/* Track completion celebration */}
      {trackCelebration&&<div onClick={dismissCelebration} onKeyDown={e=>{if(e.key==="Escape")dismissCelebration();}} style={{position:"fixed",inset:0,zIndex:95,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(42,34,24,.5)",backdropFilter:"blur(0.25rem)",animation:"fadeIn .3s ease",cursor:"pointer"}}>
        <div role="dialog" aria-modal="true" tabIndex={-1} style={{background:T.color.linen,borderRadius:"1.5rem",padding:"2.5rem 3rem",textAlign:"center",maxWidth:"23.75rem",boxShadow:"0 1.5rem 5rem rgba(44,44,42,.35)",animation:"fadeUp .5s ease",border:`2px solid ${T.color.gold}44`}}>
          <div style={{fontSize:"3rem",marginBottom:"1rem"}}>{"\u2728"}</div>
          <div style={{fontFamily:T.font.display,fontSize:"1.75rem",fontWeight:600,color:T.color.charcoal,marginBottom:"0.5rem"}}>{tTrack("trackComplete")}</div>
          <div style={{fontFamily:T.font.display,fontSize:"1.125rem",fontWeight:500,color:T.color.walnut,marginBottom:"0.75rem",fontStyle:"italic"}}>{tTrack(trackCelebration.trackNameKey)}</div>
          <div style={{fontFamily:T.font.body,fontSize:"0.875rem",color:T.color.muted,marginBottom:"1rem"}}>{tTrack("youEarnedBonus")}</div>
          <div style={{fontFamily:T.font.body,fontSize:"2rem",fontWeight:700,color:T.color.goldLight}}>+{trackCelebration.bonus} MP</div>
          <div style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.muted,marginTop:"1rem"}}>{tTrack("tapToContinue")}</div>
        </div>
      </div>}

      <NudgeProvider
        page="palace"
        palaceView={view}
        onNavigateEntrance={() => { enterEntrance(); }}
        onNavigateCorridor={() => {
          const firstWingId = allWings[0]?.id || "family";
          enterCorridor(firstWingId);
        }}
        onNavigateRoom={() => {
          const firstWingId = allWings[0]?.id || "family";
          const firstRoom = getWingRooms(firstWingId)[0];
          if (firstRoom) enterRoom(firstRoom.id);
        }}
      />
    </div>
  );
}


