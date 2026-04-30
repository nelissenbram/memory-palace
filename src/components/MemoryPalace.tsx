"use client";
import { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { T } from "@/lib/theme";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { syncSettingsFromServer } from "@/lib/stores/settingsSync";
import PalaceLoadingScreen from "@/components/ui/PalaceLoadingScreen";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useUserStore } from "@/lib/stores/userStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useAchievementStore } from "@/lib/stores/achievementStore";
import { requestAppRating } from "@/lib/native/rating";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useNavigation } from "@/lib/hooks/useNavigation";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useRoomMemories } from "@/lib/hooks/useRoomMemories";
const OnboardingWizard = lazy(() => import("@/components/ui/OnboardingWizard"));
const LandscapeNudge = lazy(() => import("@/components/ui/LandscapeNudge"));
// TopBar removed — replaced by PalaceSubNav
import { WingTooltip, DoorTooltip } from "@/components/ui/HoverTooltip";
// SearchBar removed — search is no longer shown in room view
const UploadPanel = lazy(() => import("@/components/ui/UploadPanel"));
const SharingPanel = lazy(() => import("@/components/ui/SharingPanel"));
const MemoryDetail = lazy(() => import("@/components/ui/MemoryDetail"));
import NavigationBar from "@/components/ui/NavigationBar";
import NotificationsPage from "@/components/ui/NotificationsPage";
import SettingsInline from "@/components/ui/SettingsInline";
const RoomManagerPanel = lazy(() => import("@/components/ui/RoomManagerPanel"));
const WingManagerPanel = lazy(() => import("@/components/ui/WingManagerPanel"));
const AchievementsPanel = lazy(() => import("@/components/ui/AchievementsPanel"));
import { AchievementIcon } from "@/components/ui/AtriumWidgets";
import TracksPanel from "@/components/ui/TracksPanel";
import TrackDetailPanel from "@/components/ui/TrackDetailPanel";
import LegacyPanel from "@/components/ui/LegacyPanel";
import PointsDisplay from "@/components/ui/PointsDisplay";
import FloatingPoints from "@/components/ui/FloatingPoints";
const ExteriorScene = lazy(() => import("@/components/3d/ExteriorScene"));
const EntranceHallScene = lazy(() => import("@/components/3d/EntranceHallScene"));
const InteriorScene = lazy(() => import("@/components/3d/InteriorScene"));
const CorridorScene = lazy(() => import("@/components/3d/CorridorScene"));
import { useDaylight } from "@/components/providers/DaylightProvider";
import ShareCard from "@/components/ui/ShareCard";
const MemoryMap = lazy(() => import("@/components/ui/MemoryMap"));
const FamilyTreePanel = lazy(() => import("@/app/(app)/family-tree/page"));
import OnThisDay from "@/components/ui/OnThisDay";
import TimeCapsuleReveal from "@/components/ui/TimeCapsuleReveal";
const MemoryTimeline = lazy(() => import("@/components/ui/MemoryTimeline"));
const StatisticsPanel = lazy(() => import("@/components/ui/StatisticsPanel"));
// MassImportPanel removed — all import flows now use ImportHub in Library mode
import RoomGallery from "@/components/ui/RoomGallery";
const RoomMediaPanel = lazy(() => import("@/components/ui/RoomMediaPanel"));
import StoragePlayerPanel from "@/components/ui/StoragePlayerPanel";
import InviteNotificationsPanel from "@/components/ui/InviteNotificationsPanel";
const SharedWithMePanel = lazy(() => import("@/components/ui/SharedWithMePanel"));
const SharingSettingsPanel = lazy(() => import("@/components/ui/SharingSettingsPanel"));
const InterviewPanel = lazy(() => import("@/components/ui/InterviewPanel"));
const InterviewLibraryPanel = lazy(() => import("@/components/ui/InterviewLibraryPanel"));
const InterviewHistoryPanel = lazy(() => import("@/components/ui/InterviewHistoryPanel"));
const CorridorGalleryPanel = lazy(() => import("@/components/ui/CorridorGalleryPanel"));
import { loadCorridorPaintings, type CorridorPaintings } from "@/components/ui/CorridorGalleryPanel";
import TouchControlsOverlay from "@/components/ui/TouchControlsOverlay";
import MobileJoystick from "@/components/ui/MobileJoystick";
// ActionMenu removed — replaced by PalaceSubNav
// StatusBar removed — no longer shown in Palace view
import { useInterviewStore } from "@/lib/stores/interviewStore";
import { ROOM_LAYOUTS } from "@/lib/3d/roomLayouts";
import { useTutorialStore } from "@/lib/stores/tutorialStore";
import TutorialOverlay from "@/components/ui/TutorialOverlay";
import FeatureSpotlight, { allSpotlightsSeen } from "@/components/ui/FeatureSpotlight";
const GettingStartedChecklist = lazy(() => import("@/components/ui/GettingStartedChecklist"));
import { setOnboardDate, markChecklistItem } from "@/components/ui/GettingStartedChecklist";
import ContextualTooltip from "@/components/ui/ContextualTooltip";
const FirstMemoryPrompt = lazy(() => import("@/components/ui/FirstMemoryPrompt"));
import CinematicWalkthrough from "@/components/ui/CinematicWalkthrough";
import DiscoveryMenu from "@/components/ui/DiscoveryMenu";
import { useWalkthroughStore } from "@/lib/stores/walkthroughStore";
import { useUIPanelStore } from "@/lib/stores/uiPanelStore";
import { useRoomMediaBarStore } from "@/lib/stores/roomMediaBarStore";
import { updateProfile } from "@/lib/auth/profile-actions";
const LibraryView = lazy(() => import("@/components/ui/LibraryView"));
const HomeView = lazy(() => import("@/components/ui/HomeView"));
import UniversalActions from "@/components/ui/UniversalActions";
import { useActions } from "@/lib/hooks/useActions";
import PalaceSubNav, { type PalacePending } from "@/components/ui/PalaceSubNav";
const PalaceExteriorTutorial = lazy(() => import("@/components/ui/PalaceExteriorTutorial"));
import { usePalaceTourStore } from "@/components/ui/PalaceExteriorTutorial";
const EntranceHallTutorial = lazy(() => import("@/components/ui/EntranceHallTutorial"));
import { useEntranceTourStore } from "@/components/ui/EntranceHallTutorial";
const CorridorTutorial = lazy(() => import("@/components/ui/CorridorTutorial"));
import { useCorridorTourStore } from "@/components/ui/CorridorTutorial";
const RoomTutorial = lazy(() => import("@/components/ui/RoomTutorial"));
import { useRoomTourStore } from "@/components/ui/RoomTutorial";
import NudgeProvider, { getNudgeHighlight } from "@/components/ui/NudgeTooltip";
import { RoomIcon } from "@/components/ui/WingRoomIcons";
import { useNudgeStore } from "@/lib/stores/nudgeStore";
import TuscanCard from "@/components/ui/TuscanCard";
import TuscanStyles from "@/components/ui/TuscanStyles";
import { getWingsSharedWithMe, getSharedWingData, getSharedRoomMemories } from "@/lib/auth/sharing-actions";
import type { SharedWingDoor } from "@/components/3d/EntranceHallScene";

// ── Delayed spinner fallback — avoids flash for fast lazy loads ──
function DelayedFallback() {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 300); return () => clearTimeout(t); }, []);
  if (!show) return null;
  return <div style={{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,background:"rgba(0,0,0,.3)",backdropFilter:"blur(0.25rem)"}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{width:"2.5rem",height:"2.5rem",border:"0.1875rem solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} /></div>;
}

// ═══ MAIN — 4-level navigation: exterior → entrance → corridor → room ═══
export default function MemoryPalace(){
  const isMobile = useIsMobile();
  const { t: tTrack } = useTranslation("tracksPanel");
  const { t: tAch } = useTranslation("achievementsPanel");
  const { t: tAction } = useTranslation("actionMenu");
  const { t: tPalace } = useTranslation("palace");
  const { t: tRoom } = useTranslation("roomMedia");
  const { t: tWings } = useTranslation("wings");
  const { t: tLayout } = useTranslation("roomLayouts");
  const { daylightEnabled, daylightMode, resolvedHour } = useDaylight();
  // Key fragment for scene remounting when daylight mode changes manually
  // Only remount scene when daylight is toggled on/off or mode changes — NOT on slider changes.
  // The 3D scene reads resolvedHour via the global setDaylightHour() helper (no remount needed).
  const dlKey = daylightEnabled ? `dl_${daylightMode}` : "dl_off";

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

  const showFamilyTree = useUIPanelStore((s) => s.showFamilyTree);
  const setShowFamilyTree = useUIPanelStore((s) => s.setShowFamilyTree);
  const showMemoryMap = useUIPanelStore((s) => s.showMemoryMap);
  const setShowMemoryMap = useUIPanelStore((s) => s.setShowMemoryMap);
  const showTimeline = useUIPanelStore((s) => s.showTimeline);
  const setShowTimeline = useUIPanelStore((s) => s.setShowTimeline);
  const showImportHub = useUIPanelStore((s) => s.showImportHub);
  const setShowImportHub = useUIPanelStore((s) => s.setShowImportHub);
  const showGallery = useUIPanelStore((s) => s.showGallery);
  const setShowGallery = useUIPanelStore((s) => s.setShowGallery);
  const galleryInitialMemId = useUIPanelStore((s) => s.galleryInitialMemId);
  const galleryInitialTab = useUIPanelStore((s) => s.galleryInitialTab);
  const galleryAutoAssignUnit = useUIPanelStore((s) => s.galleryAutoAssignUnit);
  const setGalleryAutoAssignUnit = useUIPanelStore((s) => s.setGalleryAutoAssignUnit);
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
  const sceneLoadFromLibraryRef = useRef(false); // true when loading overlay is for Library→3D transition
  const sceneReadyRef = useRef(false); // tracks if ExteriorScene.onReady() already fired
  // searchBarVisible / searchHideTimer removed (SearchBar deleted from room view)
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
  const { roomMems, allRoomMems, handleAddMemory, addMemoryToRoom, handleUpdateMemory, handleDeleteMemory, currentSharing, updateSharing } = useRoomMemories();
  // Top media bar open state (drives InteriorScene video/audio bar)
  const roomMediaBarOpen = useRoomMediaBarStore(s => s.open);
  const setRoomMediaBarOpen = useRoomMediaBarStore(s => s.setOpen);

  // Build wingRooms map for PalaceSubNav room dropdowns
  const wingRoomsMap = useMemo(() => {
    const map: Record<string, { id: string; name: string; nameKey?: string; icon: string }[]> = {};
    for (const w of allWings) {
      map[w.id] = getWingRooms(w.id).map(r => ({ id: r.id, name: r.name, nameKey: r.nameKey, icon: r.icon }));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWings, customRooms]);

  // ── Universal Actions (available in all modes) ──
  const actionGroups = useActions({
    onAddMemory: () => { setShowTools(false); setShowUpload(true); },
    onUploadPhotos: () => { setShowTools(false); setShowImportHub(true); setNavMode("library"); },
    onRecordInterview: () => { setShowTools(false); setShowInterviewLibrary(true); },
    onWriteStory: () => { setShowTools(false); setShowUpload(true); },
    onMemoryMap: () => { setShowTools(false); setShowMemoryMap(true); },
    onTimeline: () => { setShowTools(false); setShowTimeline(true); },
    onStatistics: () => { setShowTools(false); setShowStatistics(true); },
    onFamilyTree: () => { setShowTools(false); setShowFamilyTree(true); },
    onShareRoom: () => { setShowTools(false); setShowSharing(true); },
    onInvites: () => { setShowTools(false); setShowInvites(true); },
    onSharedWithMe: () => { setShowTools(false); setShowSharedWithMe(true); },
  });

  // Load profile on mount + heartbeat for legacy inactivity detection
  // Also preload shared 3D assets (PBR textures) so first scene loads faster
  useEffect(()=>{
    loadProfile();
    // Preload shared 3D assets during idle time (desktop only; mobile defers)
    import("@/lib/3d/scenePreloader").then(m => m.preloadSharedAssets()).catch(() => {});
    // Update last_seen_at once per session (throttled via sessionStorage)
    if (!sessionStorage.getItem("mp_heartbeat")) {
      sessionStorage.setItem("mp_heartbeat", "1");
      import("@/lib/auth/heartbeat-action").then(m => m.updateLastSeen()).catch(() => {});
    }
    // Kep deep-link: navigate to wing+room after creation
    try {
      const raw = sessionStorage.getItem("kep_navigate");
      if (raw) {
        sessionStorage.removeItem("kep_navigate");
        const { wingId, roomId } = JSON.parse(raw);
        if (wingId) {
          enterCorridor(wingId);
          if (roomId) setTimeout(() => enterRoom(roomId), 600);
        }
      }
    } catch { /* ignore */ }
  },[loadProfile, enterCorridor, enterRoom]);

  // Safety timeout: force profileLoading off after 3s to prevent infinite loading
  useEffect(() => {
    if (!profileLoading) return;
    const t = setTimeout(() => useUserStore.setState({ profileLoading: false }), 3000);
    return () => clearTimeout(t);
  }, [profileLoading]);

  // Sync localStorage settings from server (cross-device consistency)
  // Then bulk-fetch all memories so stats/map/timeline are consistent across devices
  useEffect(() => {
    syncSettingsFromServer().then(() => {
      useMemoryStore.getState().fetchAllRoomMemories();
    });
  }, []);

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

  // ── Scene loading overlay — shown on the VERY FIRST Palace visit AND
  // when navigating from Library into a 3D corridor/room scene (where
  // lazy-loaded CorridorScene / InteriorScene need time to mount). ──
  const firstPalaceVisitRef = useRef(true);
  const prevNavModeForLoadingRef = useRef(navMode);
  useEffect(() => {
    const cameFromLibrary = prevNavModeForLoadingRef.current === "library" && navMode === "3d";
    prevNavModeForLoadingRef.current = navMode;

    // Library → 3D corridor/room: show loading while scene JS loads & mounts.
    // Checked first because enterCorridor/enterRoom use fade() which delays
    // the view change by 500ms — so view may still be "exterior" and would
    // otherwise fall into the first-palace-visit branch below.
    if (cameFromLibrary) {
      firstPalaceVisitRef.current = false; // skip the first-visit splash later
      sceneLoadFromLibraryRef.current = true;
      setSceneLoading(true);
      // Use a non-cleanup timeout so it survives the view change that
      // fires 500ms later (palaceStore fade). The ref guard in the
      // fallthrough prevents premature clearing.
      setTimeout(() => { sceneLoadFromLibraryRef.current = false; setSceneLoading(false); }, 1800);
      return;
    }

    // Show splash only first time entering exterior, and only if the warm
    // ExteriorScene hasn't already signalled ready (onReady fires on first
    // rendered frame, which usually happens well before the user taps Palace).
    if (view === "exterior" && firstPalaceVisitRef.current) {
      firstPalaceVisitRef.current = false;
      if (sceneReadyRef.current) {
        // Scene already warm — skip the loading overlay entirely.
        setSceneLoading(false);
        return;
      }
      setSceneLoading(true);
      // onReady from ExteriorScene will hide it precisely; 2.5s safety.
      const t = setTimeout(() => setSceneLoading(false), 2500);
      return () => clearTimeout(t);
    }

    // Any other view transition: no splash — but don't interrupt an active
    // Library→3D loading overlay (view changes mid-transition due to fade).
    if (!sceneLoadFromLibraryRef.current) {
      setSceneLoading(false);
    }
  }, [view, navMode]);

  // ── Scene preloading — when a scene is active, preload the NEXT scene's
  //    JS module so React.lazy() resolves instantly on transition. ──
  useEffect(() => {
    if (navMode !== "3d") return;
    const sceneId = view === "exterior" ? "exterior" : view === "entrance" ? "entrance" : view === "corridor" ? "corridor" : view === "room" ? "room" : null;
    if (sceneId) {
      import("@/lib/3d/scenePreloader").then(({ preloadNextScene }) => preloadNextScene(sceneId));
    }
  }, [view, navMode]);

  // ── Persistent Palace portal host — keeps ExteriorScene mounted across
  //    navMode switches. Eagerly mounted on app load so the scene is warm by
  //    the time the user taps Palace. Uses visibility (not display) to avoid
  //    layout thrash and blank-frame flashes. ──
  const [palaceHost, setPalaceHost] = useState<HTMLDivElement | null>(null);
  const [palacePending, setPalacePending] = useState<PalacePending>(null);
  const palaceTourOpen = usePalaceTourStore((s) => s.open);
  const setPalaceTourOpen = usePalaceTourStore((s) => s.setOpen);
  const entranceTourOpen = useEntranceTourStore((s) => s.open);
  const setEntranceTourOpen = useEntranceTourStore((s) => s.setOpen);
  const corridorTourOpen = useCorridorTourStore((s) => s.open);
  const setCorridorTourOpen = useCorridorTourStore((s) => s.setOpen);
  const roomTourOpen = useRoomTourStore((s) => s.open);
  const setRoomTourOpen = useRoomTourStore((s) => s.setOpen);
  // Consolidate tour flag reads into a single localStorage pass at mount
  const tourFlags = useRef<Record<string, boolean>>({});
  useEffect(() => {
    try {
      for (const key of ["mp_corridor_tour_seen_v1", "mp_entrance_tour_seen_v1", "mp_palace_tour_seen_v1", "mp_room_tour_seen_v1"]) {
        tourFlags.current[key] = !!window.localStorage.getItem(key);
      }
    } catch {}
  }, []);

  // Auto-open room tutorial on first room visit
  useEffect(() => {
    if (view !== "room") return;
    try {
      const key = "mp_room_tour_seen_v1";
      if (typeof window !== "undefined" && !tourFlags.current[key]) {
        setTimeout(() => setRoomTourOpen(true), 800);
        window.localStorage.setItem(key, "1");
        tourFlags.current[key] = true;
      }
    } catch {}
  }, [view, setRoomTourOpen]);

  useEffect(() => {
    if (navMode !== "3d" || view !== "corridor") return;
    try {
      if (!tourFlags.current["mp_corridor_tour_seen_v1"]) {
        setCorridorTourOpen(true);
        window.localStorage.setItem("mp_corridor_tour_seen_v1", "1");
        tourFlags.current["mp_corridor_tour_seen_v1"] = true;
      }
    } catch {}
  }, [navMode, view, setCorridorTourOpen]);

  useEffect(() => {
    const h = () => setEntranceTourOpen(true);
    window.addEventListener("mp:open-entrance-tutorial", h);
    return () => window.removeEventListener("mp:open-entrance-tutorial", h);
  }, [setEntranceTourOpen]);

  useEffect(() => {
    if (navMode !== "3d" || view !== "entrance") return;
    try {
      if (!tourFlags.current["mp_entrance_tour_seen_v1"]) {
        setEntranceTourOpen(true);
        window.localStorage.setItem("mp_entrance_tour_seen_v1", "1");
        tourFlags.current["mp_entrance_tour_seen_v1"] = true;
      }
    } catch {}
  }, [navMode, view, setEntranceTourOpen]);

  // Listen for help-button-triggered palace tour open
  useEffect(() => {
    const h = () => {
      if (view === "room") setRoomTourOpen(true);
      else if (view === "entrance") setEntranceTourOpen(true);
      else if (view === "corridor") setCorridorTourOpen(true);
      else setPalaceTourOpen(true);
    };
    window.addEventListener("mp:open-palace-tutorial", h);
    return () => window.removeEventListener("mp:open-palace-tutorial", h);
  }, [setPalaceTourOpen, setEntranceTourOpen, setCorridorTourOpen, setRoomTourOpen, view]);

  // Auto-open the tour on first visit to the palace exterior
  useEffect(() => {
    if (navMode !== "3d" || view !== "exterior") return;
    try {
      if (!tourFlags.current["mp_palace_tour_seen_v1"]) {
        setPalaceTourOpen(true);
        window.localStorage.setItem("mp_palace_tour_seen_v1", "1");
        tourFlags.current["mp_palace_tour_seen_v1"] = true;
      }
    } catch {}
  }, [navMode, view, setPalaceTourOpen]);
  const hasVisitedPalace = true; // eager mount — scene warms in background
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.createElement("div");
    el.setAttribute("data-palace-persistent", "");
    // z-index:5 sits above the MemoryPalace main return wrapper (auto) so the
    // canvas paints over the sandstone bg, but below PalaceSubNav (42) and
    // NavigationBar (50). Starts hidden + paused so atrium/library are visible.
    el.style.cssText = "position:fixed;inset:0;z-index:5;visibility:hidden;pointer-events:none;";
    el.dataset.paused = "1";
    document.body.appendChild(el);
    setPalaceHost(el);
    return () => { try { document.body.removeChild(el); } catch {} };
  }, []);
  // Synchronous toggle before paint — avoids blank-frame on Palace entry.
  useLayoutEffect(() => {
    if (!palaceHost) return;
    const show = navMode === "3d" && view === "exterior" && !showNotificationsPage && !showSettings;
    palaceHost.style.visibility = show ? "visible" : "hidden";
    palaceHost.style.pointerEvents = show ? "auto" : "none";
    palaceHost.dataset.paused = show ? "0" : "1";
  }, [palaceHost, navMode, view, showNotificationsPage, showSettings]);

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

  // ── In-app rating prompt (after 3rd achievement or 25th memory) ──
  const earnedAchCount = useAchievementStore((s) => s.earnedIds.length);
  useEffect(() => {
    if (achToast && earnedAchCount >= 3) {
      requestAppRating();
    }
  }, [achToast, earnedAchCount]);

  // ── URL ↔ navMode mapping ──
  const modeToPath = (mode: string, settings?: boolean) => {
    if (settings) return "/me";
    return mode === "3d" ? "/palace" : mode === "library" ? "/library" : "/atrium";
  };
  const pathToMode = (p: string): "atrium" | "library" | "3d" | null => {
    if (p === "/atrium" || p === "/me") return "atrium";
    if (p === "/library") return "library";
    if (p === "/palace") return "3d";
    return null;
  };

  // ── Browser back button: push mode changes to history ──
  const prevNavModeRef = useRef(navMode);
  const prevShowSettingsRef = useRef(showSettings);
  useEffect(() => {
    if (navMode !== prevNavModeRef.current || showSettings !== prevShowSettingsRef.current) {
      window.history.pushState({ navMode, showSettings }, "", modeToPath(navMode, showSettings));
      prevNavModeRef.current = navMode;
      prevShowSettingsRef.current = showSettings;
    }
  }, [navMode, showSettings]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const mode = e.state?.navMode || pathToMode(window.location.pathname);
      if (mode && (mode === "atrium" || mode === "library" || mode === "3d")) {
        setNavMode(mode);
        prevNavModeRef.current = mode;
      }
      const settings = e.state?.showSettings || window.location.pathname === "/me";
      setShowSettings(!!settings);
      prevShowSettingsRef.current = !!settings;
    };
    // Detect initial state from URL path
    const initialPath = window.location.pathname;
    const isMe = initialPath === "/me";
    const initialMode = pathToMode(initialPath);
    if (initialMode && initialMode !== navMode) {
      setNavMode(initialMode);
      prevNavModeRef.current = initialMode;
    }
    if (isMe) {
      setShowSettings(true);
      prevShowSettingsRef.current = true;
    }
    // Seed current state so first Back works
    window.history.replaceState({ navMode: initialMode || navMode, showSettings: isMe }, "", modeToPath(initialMode || navMode, isMe));
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
    import("@/lib/native/haptics").then(({ hapticSuccess }) => hapticSuccess()).catch(() => {});
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

  // SearchBar auto-hide logic removed (SearchBar deleted from room view)

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

  const handleFinishOnboarding=async(memoryUploaded?: boolean)=>{
    await finishOnboarding();
    setOnboardDate();
    justOnboardedRef.current = true;
    // Mark checklist item if user uploaded during onboarding
    if (memoryUploaded) markChecklistItem("upload_first_memory");
    // Land on Atrium — auto-trigger the nudge tutorial after a short delay
    setNavMode("atrium");
    setTimeout(() => {
      useNudgeStore.getState().initPage("atrium", isMobile);
    }, 800);
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
        <Suspense fallback={null}><ExteriorScene
          key={dlKey}
          onReady={() => { sceneReadyRef.current = true; setSceneLoading(false); }}
          onRoomHover={setHovWing}
          onRoomClick={(wingId: string) => {
            if (walkthroughActive && wingId !== "__entrance__") return;
            // Mobile: tap selects (pre-enter); Enter button in PalaceSubNav commits.
            if (isMobile) {
              if (wingId === "__entrance__") setPalacePending({ kind: "entrance" });
              else setPalacePending({ kind: "wing", wingId });
              return;
            }
            if (wingId === "__entrance__") { if (nudgeHL.entrance) nudgeDismiss(); enterEntrance(); }
            else { enterCorridor(wingId); }
          }}
          hoveredRoom={hovWing}
          wings={allWings}
          highlightDoor={(walkthroughActive && walkthroughPhase === 0 ? "__entrance__" : null) || nudgeHL.entrance || null}
          styleEra={styleEra || "roman"}
          autoWalkTo={autoWalking && nudgeHL.entrance ? nudgeHL.entrance : undefined}
        /></Suspense>,
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
    return <PalaceLoadingScreen />;
  }

  if(!onboarded) return <OnboardingWizard onFinish={handleFinishOnboarding}/>;

  const hovDoorRoom=hovDoor&&activeWing?getWingRooms(activeWing).find(r=>r.id===hovDoor)??null:null;

  // ── Mobile bottom bar configuration ──
  const bottomBarHeight = isMobile ? 64 : 0;
  const safeBottom = isMobile ? bottomBarHeight + 8 : 70;

  /* ── Lazy-load spinner fallback (300ms delay to avoid flash) ── */
  const lazyFallback = <DelayedFallback />;

  /* ── Shared panel overlays — rendered in ALL modes (atrium, library, 3D) ── */
  const sharedPanelOverlays = (<>
    {showTimeline&&<Suspense fallback={lazyFallback}><MemoryTimeline onClose={()=>setShowTimeline(false)} onNavigateLibrary={()=>{setShowTimeline(false);setNavMode("library");}}/></Suspense>}
    {showStatistics&&<Suspense fallback={lazyFallback}><StatisticsPanel onClose={()=>setShowStatistics(false)}/></Suspense>}
    {showMemoryMap&&<Suspense fallback={lazyFallback}><MemoryMap userMems={userMems} onClose={()=>setShowMemoryMap(false)} onNavigateLibrary={()=>{setShowMemoryMap(false);setNavMode("library");}} onNavigateToMemory={(wingId,roomId,memoryId)=>{setShowMemoryMap(false);setLibraryTarget({wingId,roomId,memoryId});setNavMode("library");}} onNavigate={(roomId)=>{setShowMemoryMap(false);const wingId=roomId.startsWith("ro")?"roots":roomId.startsWith("tv")?"travel":roomId.startsWith("ne")?"nest":roomId.startsWith("cf")?"craft":roomId.startsWith("pa")?"passions":"roots";setLibraryTarget({wingId,roomId});setNavMode("library");}}/></Suspense>}
    {showFamilyTree&&<Suspense fallback={lazyFallback}><FamilyTreePanel onClose={()=>setShowFamilyTree(false)}/></Suspense>}
    {/* Import hub is now rendered in LibraryView — triggered via uiPanelStore.showImportHub */}
    {showAchievements&&<AchievementsPanel onClose={()=>setShowAchievements(false)} highlightId={achHighlightId}/>}
    {showTracksPanel&&!selectedTrackId&&<TracksPanel onClose={()=>setShowTracksPanel(false)}/>}
    {selectedTrackId&&<TrackDetailPanel trackId={selectedTrackId} onClose={()=>setSelectedTrackId(null)} onNavigate={(target)=>{setShowTracksPanel(false);setSelectedTrackId(null);switch(target){case "library-import":setNavMode("library");setShowImportHub(true);break;case "library":setNavMode("library");break;case "upload":setNavMode("library");setShowImportHub(true);break;case "room":{const wing=activeWing||"roots";const prefix:{[k:string]:string}={roots:"ro",nest:"ne",craft:"cf",travel:"tv",passions:"pa"};setNavMode("3d");enterCorridor(wing);setTimeout(()=>enterRoom(activeRoomId||`${prefix[wing]||"ro"}1`),600);break;}case "corridor":{const wing=activeWing||"roots";setNavMode("3d");setTimeout(()=>enterCorridor(wing),600);break;}case "share":{if(activeRoomId){setShowSharing(true);}else{const wing=activeWing||"roots";const prefix:{[k:string]:string}={roots:"ro",nest:"ne",craft:"cf",travel:"tv",passions:"pa"};const roomId=`${prefix[wing]||"ro"}1`;setNavMode("3d");enterCorridor(wing);setTimeout(()=>{enterRoom(roomId);setTimeout(()=>setShowSharing(true),600);},600);}break;}case "wings":{setNavMode("3d");const wing=activeWing||"roots";setTimeout(()=>enterWing(wing),600);break;}case "entrance":setNavMode("3d");setTimeout(()=>enterEntrance(),300);break;case "interview":setShowInterviewPanel(true);break;case "legacy":setShowLegacyPanel(true);break;default:break;}}}/>}
    {showInterviewLibrary&&<InterviewLibraryPanel onClose={()=>setShowInterviewLibrary(false)} highlightWingId={activeWing}/>}
    {showInterviewHistory&&<InterviewHistoryPanel onClose={()=>setShowInterviewHistory(false)}/>}
    {showInterview&&<Suspense fallback={lazyFallback}><InterviewPanel onClose={()=>{setShowInterviewPanel(false);markChecklistItem("complete_interview");}} onCreateMemory={(mem, wingId)=>{
      const targetWing = wingId === "general" ? "roots" : wingId;
      const prefix = {roots:"ro",nest:"ne",craft:"cf",travel:"tv",passions:"pa"}[targetWing]||"ro";
      const roomId = `${prefix}1`;
      addMemoryToRoom(roomId, mem);
    }}/></Suspense>}
    {showLegacyPanel&&<LegacyPanel onClose={()=>setShowLegacyPanel(false)}/>}
    {showSharedWithMe&&<SharedWithMePanel onClose={()=>setShowSharedWithMe(false)} onNavigateToRoom={(roomId)=>{setShowSharedWithMe(false);const wingId=roomId.startsWith("ro")?"roots":roomId.startsWith("tv")?"travel":roomId.startsWith("ne")?"nest":roomId.startsWith("cf")?"craft":roomId.startsWith("pa")?"passions":"roots";setNavMode("3d");enterCorridor(wingId);setTimeout(()=>enterRoom(roomId),600);}}/>}
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
        {view==="entrance"&&<Suspense fallback={null}><EntranceHallScene key={dlKey} onDoorClick={(wingId: string)=>{if(walkthroughActive&&walkthroughPhase<=2&&wingId!=="__exterior__"&&wingId!==walkthroughTargetWing)return;if(wingId==="__exterior__")exitToPalace();else if(wingId==="attic")setShowStoragePlayer(true);else if(wingId.startsWith("locked"))setShowUpgradePrompt(true);else if(wingId.startsWith("shared:")){const [,slug,shareId]=wingId.split(":");const shareInfo=sharedWings.find(sw=>sw.shareId===shareId);if(shareInfo){getSharedWingData(shareId).then(result=>{if(result.wing&&result.rooms){setSharedWingData(result);enterCorridor(wingId);}});}}else{if(nudgeHL.wing)nudgeDismiss();enterCorridor(wingId);}}} wings={allWings} sharedWings={sharedWings} highlightDoor={(walkthroughActive&&walkthroughPhase===2?walkthroughTargetWing:null)||nudgeHL.wing||null} styleEra={styleEra||"roman"} onInlayClick={()=>setShowUpgradePrompt(true)} onBustClick={() => { /* bust builder hidden */ }} bustPedestals={bustPedestals} bustTextureUrl={bustTextureUrl} bustModelUrl={bustModelUrl} bustProportions={bustProportions} bustName={bustName || userName || null} bustGender={bustGender || null} autoWalkTo={autoWalking && nudgeHL.wing ? nudgeHL.wing : undefined}/></Suspense>}
        {view==="corridor"&&activeWing&&activeWing.startsWith("shared:")&&sharedWingData?<Suspense fallback={null}><CorridorScene key={dlKey+"|"+activeWing+"|"+JSON.stringify(sharedWingData.rooms.map((r: any)=>r.id+r.name+(r.icon||"")))+"|"+(sharedWingData.wing.accentColor||"#7AA0C8")+"|"+(styleEra||"roman")} wingId={activeWing} rooms={sharedWingData.rooms.map((r: any)=>({id:r.id,name:r.name,icon:r.icon||"\uD83D\uDCC1",shared:false,sharedWith:[],coverHue:30}))} onDoorHover={setHovDoor} onDoorClick={(roomId: string)=>{enterRoom(roomId);}} hoveredDoor={hovDoor} wingData={{id:sharedWingData.wing.slug,name:sharedWingData.wing.customName||sharedWingData.wing.slug,nameKey:sharedWingData.wing.slug,icon:"\uD83C\uDFDB\uFE0F",accent:sharedWingData.wing.accentColor||"#7AA0C8",wall:"#DDD4C6",floor:"#9E8264",desc:"Shared wing",descKey:"sharedWing",layout:"L-shaped gallery"}} corridorPaintings={{}} styleEra={styleEra||"roman"} onInlayClick={()=>setShowUpgradePrompt(true)} onPaintingClick={()=>setShowCorridorGallery(true)}/></Suspense>:view==="corridor"&&activeWing&&wingData&&<Suspense fallback={null}><CorridorScene key={dlKey+"|"+activeWing+"|"+JSON.stringify(getWingRooms(activeWing).map(r=>r.id+r.name+r.icon))+"|"+wingData.accent+"|"+JSON.stringify(corridorPaintings)+"|"+(styleEra||"roman")} wingId={activeWing} rooms={getWingRooms(activeWing)} onDoorHover={setHovDoor} onDoorClick={(roomId: string)=>{if(walkthroughActive&&walkthroughPhase===3&&roomId!==walkthroughTargetRoom)return;if(nudgeHL.room)nudgeDismiss();enterRoom(roomId);}} hoveredDoor={hovDoor} wingData={wingData} corridorPaintings={corridorPaintings} highlightDoor={(walkthroughActive&&walkthroughPhase===3?walkthroughTargetRoom:null)||nudgeHL.room||null} styleEra={styleEra||"roman"} onInlayClick={()=>setShowUpgradePrompt(true)} onPaintingClick={()=>setShowCorridorGallery(true)} autoWalkTo={autoWalking && nudgeHL.room ? nudgeHL.room : undefined}/></Suspense>}
        {view==="room"&&activeWing&&activeRoomId&&<Suspense fallback={null}><InteriorScene key={dlKey+"|"+activeWing+"|"+activeRoomId+"|"+(roomLayouts[activeRoomId]||"")+"|"+(styleEra||"roman")} roomId={activeWing} actualRoomId={activeRoomId} layoutOverride={roomLayouts[activeRoomId]} memories={roomMems} onMemoryClick={handleMemClick} onMemoryUpdate={handleUpdateMemory} wingData={wingData||undefined} styleEra={styleEra||"roman"}/></Suspense>}
      </div>

      {view==="exterior"&&<LandscapeNudge />}
      {view==="exterior"&&<PalaceExteriorTutorial open={palaceTourOpen} onClose={()=>setPalaceTourOpen(false)} />}
      {view==="entrance"&&<EntranceHallTutorial open={entranceTourOpen} onClose={()=>setEntranceTourOpen(false)} />}
      {view==="corridor"&&<CorridorTutorial open={corridorTourOpen} onClose={()=>setCorridorTourOpen(false)} />}
      {view==="room"&&<RoomTutorial open={roomTourOpen} onClose={()=>setRoomTourOpen(false)} />}

      {/* Scene loading overlay — fades out after 3D canvas initializes */}
      {sceneLoading&&<PalaceLoadingScreen overlay fadeDelay={sceneLoadFromLibraryRef.current ? 1 : 0} />}

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
        wingName={wingData?.nameKey ? (tWings(wingData.nameKey) || wingData.name) : wingData?.name}
        wingAccent={wingData?.accent}
        wingIcon={wingData?.icon}
        roomName={activeRoomData?.nameKey ? (tWings(activeRoomData.nameKey) || activeRoomData.name) : activeRoomData?.name}
        roomId={activeRoomId || undefined}
        roomIcon={activeRoomData?.icon}
        wings={allWings}
        wingRooms={wingRoomsMap}
        sharedWings={sharedWings}
        hidden={!!selMem || showUpload || showSharing || walkthroughActive}
        isMobile={isMobile}
        pending={palacePending}
        onPendingChange={setPalacePending}
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
        onMassImport={() => { setShowImportHub(true); setNavMode("library"); }}
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

      {/* Room info strip removed — room name shown in PalaceSubNav breadcrumbs, layout/sharing accessible via tools */}

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
          visible={roomTourOpen || (!selMem && !showUpload && !showSharing && !moreMenuOpen)}
          onMove={() => {}}
        />
      )}

      {/* MobileBottomBar removed — replaced by PalaceSubNav */}

      {/* Panels + overlays */}
      {showUpload&&activeRoomId&&<UploadPanel wing={wingData} room={activeRoomData} onClose={()=>setShowUpload(false)} onAdd={(mem: any)=>{
        const wasFirst = Object.values(userMems).every(a => a.length === 0) && allRoomMems.length === 0;
        handleAddMemory(mem);
        markChecklistItem("upload_memory");
        // Rating prompt after 25th memory
        const totalMems = Object.values(userMems).reduce((n, a) => n + a.length, 0) + allRoomMems.length + 1;
        if (totalMems >= 25) requestAppRating();
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
      {showRoomShare&&activeRoomData&&wingData&&<ShareCard roomName={activeRoomData.name} roomIcon={activeRoomData.icon} wingName={wingData.nameKey ? (tWings(wingData.nameKey) || wingData.name) : wingData.name} wingIcon={wingData.icon} memCount={allRoomMems.length} accent={wingData.accent} onClose={()=>setShowRoomShare(false)}/>}
      {showTimeline&&<Suspense fallback={lazyFallback}><MemoryTimeline onClose={()=>setShowTimeline(false)} onNavigateLibrary={()=>{setShowTimeline(false);setNavMode("library");}}/></Suspense>}
      {showStatistics&&<Suspense fallback={lazyFallback}><StatisticsPanel onClose={()=>setShowStatistics(false)}/></Suspense>}
      {showMemoryMap&&<Suspense fallback={lazyFallback}><MemoryMap userMems={userMems} onClose={()=>setShowMemoryMap(false)} onNavigateLibrary={()=>{setShowMemoryMap(false);setNavMode("library");}} onNavigateToMemory={(wingId,roomId,memoryId)=>{setShowMemoryMap(false);setLibraryTarget({wingId,roomId,memoryId});setNavMode("library");}} onNavigate={(roomId)=>{setShowMemoryMap(false);const wingId=roomId.startsWith("ro")?"roots":roomId.startsWith("tv")?"travel":roomId.startsWith("ne")?"nest":roomId.startsWith("cf")?"craft":roomId.startsWith("pa")?"passions":"roots";setLibraryTarget({wingId,roomId});setNavMode("library");}}/></Suspense>}
      {showFamilyTree&&<Suspense fallback={lazyFallback}><FamilyTreePanel onClose={()=>setShowFamilyTree(false)}/></Suspense>}
      {/* Import hub is now rendered in LibraryView — triggered via uiPanelStore.showImportHub */}
      {showGallery&&activeRoomId&&<RoomMediaPanel mems={allRoomMems} wing={wingData} room={activeRoomData} onClose={()=>{setShowGallery(false);setGalleryAutoAssignUnit(null);}} onUpdate={handleUpdateMemory} onDelete={handleDeleteMemory} onAdd={(mem)=>{handleAddMemory(mem);if(galleryAutoAssignUnit){setTimeout(()=>{handleUpdateMemory(mem.id,{displayed:true,displayUnit:galleryAutoAssignUnit});setGalleryAutoAssignUnit(null);},100);}}} onSelect={(mem)=>{setShowGallery(false);setSelMem(mem);}} initialMemId={galleryInitialMemId} initialTab={galleryInitialTab} roomLayout={roomLayouts[activeRoomId]||""} onRoomLayoutChange={(id)=>setRoomLayout(activeRoomId,id)}/>}
      {/* ─── AV remote pill — opens media playback bar ─── */}
      {view==="room"&&wingData&&!showGallery&&roomMediaBarOpen===null&&(()=>{
        const hasVideo=allRoomMems.some((m:any)=>m.type==="video");
        const hasAudio=allRoomMems.some((m:any)=>m.type==="audio"||m.type==="voice"||m.type==="interview");
        if(!hasVideo&&!hasAudio) return null;
        return(
          <button
            data-mp-room-av-toggle="1"
            onClick={()=>setRoomMediaBarOpen(hasVideo?"video":"audio")}
            aria-label={tPalace("ariaAvControls")}
            style={{
              position:"fixed",
              right:`calc(1rem + env(safe-area-inset-right, 0px))`,
              bottom:`calc(9.75rem + env(safe-area-inset-bottom, 0px))`,
              height:"2.75rem",
              minWidth:"2.75rem",
              padding:"0 0.875rem",
              borderRadius:"1.375rem",
              background:`${T.color.linen}E0`,
              backdropFilter:"blur(1.5rem) saturate(180%)",
              WebkitBackdropFilter:"blur(1.5rem) saturate(180%)",
              border:"0.0625rem solid rgba(238,234,227,0.6)",
              color:T.color.charcoal,
              cursor:"pointer",
              zIndex:46,
              display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"0.375rem",
              boxShadow:"0 0.125rem 0.5rem rgba(44,44,42,0.08)",
              transition:"transform 0.2s cubic-bezier(0.22,1,0.36,1)",
              fontFamily:T.font.body,fontSize:"0.75rem",fontWeight:500,
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.03)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.color.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
        );
      })()}
      {/* ─── Media pill — opens RoomMediaPanel ─── */}
      {view==="room"&&wingData&&!showGallery&&(
        <button
          data-mp-room-media="1"
          onClick={()=>setShowGallery(true)}
          aria-label={tRoom("ariaOpenRoomMedia")}
          style={{
            position:"fixed",
            right:`calc(1rem + env(safe-area-inset-right, 0px))`,
            bottom:roomMediaBarOpen?`calc(10rem + env(safe-area-inset-bottom, 0px))`:`calc(6.5rem + env(safe-area-inset-bottom, 0px))`,
            height:"2.5rem",
            padding:"0 0.875rem",
            borderRadius:"1.25rem",
            background:`${T.color.linen}E0`,
            backdropFilter:"blur(1.5rem) saturate(180%)",
            WebkitBackdropFilter:"blur(1.5rem) saturate(180%)",
            border:"0.0625rem solid rgba(238,234,227,0.6)",
            color:T.color.charcoal,
            cursor:"pointer",
            zIndex:52,
            display:"inline-flex",alignItems:"center",gap:"0.375rem",
            boxShadow:"0 0.125rem 0.5rem rgba(44,44,42,0.08)",
            transition:"transform 0.2s cubic-bezier(0.22,1,0.36,1)",
            fontFamily:T.font.body,fontSize:"0.75rem",fontWeight:500,
          }}
          onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.03)";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill={wingData?.accent||T.color.gold} stroke="none">
            <rect x="1" y="1" width="8" height="8" rx="1.5"/>
            <rect x="11" y="1" width="8" height="8" rx="1.5"/>
            <rect x="1" y="11" width="8" height="8" rx="1.5"/>
            <rect x="11" y="11" width="8" height="8" rx="1.5"/>
          </svg>
          {tRoom("media")}
        </button>
      )}
      {showCorridorGallery&&activeWing&&wingData&&<CorridorGalleryPanel wing={wingData} rooms={getWingRooms(activeWing)} onClose={()=>setShowCorridorGallery(false)} onPaintingsChange={setCorridorPaintings} currentPaintings={corridorPaintings}/>}
      {view==="corridor"&&wingData&&!showCorridorGallery&&(
        <button
          data-mp-corridor-media="1"
          onClick={()=>setShowCorridorGallery(true)}
          aria-label={tPalace("ariaEditCorridorPaintings")}
          title={tPalace("ariaEditCorridorPaintings")}
          style={{
            position:"fixed",
            right:`calc(1rem + env(safe-area-inset-right, 0px))`,
            bottom:`calc(6.5rem + env(safe-area-inset-bottom, 0px))`,
            height:"2.5rem",
            padding:"0 0.875rem",
            borderRadius:"1.25rem",
            background:`${T.color.linen}E0`,
            backdropFilter:"blur(1.5rem) saturate(180%)",
            WebkitBackdropFilter:"blur(1.5rem) saturate(180%)",
            border:"0.0625rem solid rgba(238,234,227,0.6)",
            color:T.color.charcoal,
            cursor:"pointer",
            zIndex:46,
            display:"inline-flex",alignItems:"center",gap:"0.375rem",
            boxShadow:"0 0.125rem 0.5rem rgba(44,44,42,0.08)",
            transition:"transform 0.2s cubic-bezier(0.22,1,0.36,1)",
            fontFamily:T.font.body,fontSize:"0.75rem",fontWeight:500,
          }}
          onMouseEnter={(e)=>{(e.currentTarget as HTMLButtonElement).style.transform="scale(1.03)";}}
          onMouseLeave={(e)=>{(e.currentTarget as HTMLButtonElement).style.transform="scale(1)";}}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill={T.color.gold} stroke="none">
            <rect x="1" y="1" width="8" height="8" rx="1.5"/>
            <rect x="11" y="1" width="8" height="8" rx="1.5"/>
            <rect x="1" y="11" width="8" height="8" rx="1.5"/>
            <rect x="11" y="11" width="8" height="8" rx="1.5"/>
          </svg>
          {tRoom("media")}
        </button>
      )}
      {showStoragePlayer&&<StoragePlayerPanel onClose={()=>setShowStoragePlayer(false)}/>}


      {/* Old tutorial overlay — disabled, replaced by NudgeTooltip system */}
      {/* <TutorialOverlay /> */}

      {/* Feature spotlight — shown once after onboarding completes */}
      {showSpotlight && !tutorialActive && !walkthroughActive && <FeatureSpotlight
        onImport={() => { setShowSpotlight(false); setShowImportHub(true); setNavMode("library"); }}
        onInterview={() => { setShowSpotlight(false); setShowInterviewLibrary(true); }}
        onTimeCapsule={() => { setShowSpotlight(false); /* Navigate to a room to create time capsule */ }}
        onShare={() => { setShowSpotlight(false); if (activeRoomId) setShowSharing(true); }}
      />}

      {/* Getting Started checklist — disabled, replaced by NudgeTooltip system */}
      {/* <GettingStartedChecklist ... /> */}

      {/* First memory prompt — disabled, onboarding + nudge system handles guidance */}
      {/* {view==="room"&&activeRoomId&&allRoomMems.length===0&&!showUpload&&!selMem&&!showSharing&&!tutorialActive&&
        <FirstMemoryPrompt wing={wingData} room={activeRoomData} onUpload={()=>setShowUpload(true)} />} */}

      {/* Contextual tooltips — shown once per context */}
      <ContextualTooltip tooltipId="corridor_click_door" show={view==="corridor"&&!tutorialActive&&!showSpotlight&&!walkthroughActive} />
      <ContextualTooltip tooltipId="room_click_furniture" show={view==="room"&&!tutorialActive&&!showSpotlight&&!walkthroughActive&&roomMems.length>0} />
      {/* room_empty_upload tooltip removed — replaced by FirstMemoryPrompt */}

      {/* Cinematic walkthrough overlay — narration + directional indicator */}
      {walkthroughActive && <CinematicWalkthrough />}

      {/* Discovery menu — shown after first memory upload */}
      {showDiscoveryMenu && <DiscoveryMenu
        onMassImport={() => { setShowImportHub(true); setNavMode("library"); }}
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
            <div style={{fontSize:"2.5rem",marginBottom:"0.75rem"}}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" stroke={T.color.terracotta} strokeWidth="1.5"/><path d="M7 11V7a5 5 0 1 1 10 0v4" stroke={T.color.terracotta} strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1.5" fill={T.color.terracotta}/></svg></div>
            <h3 style={{fontFamily:T.font.display,fontSize:"1.375rem",fontWeight:500,color:T.color.charcoal,marginBottom:"0.5rem"}}>{view==="entrance"?tPalace("lockedWing"):tPalace("lockedRoom")}</h3>
            <p style={{fontFamily:T.font.body,fontSize:"0.875rem",color:T.color.muted,lineHeight:1.5,marginBottom:"1.25rem"}}>{view==="entrance"?tPalace("upgradeWing"):tPalace("upgradeRoom")}</p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
              <button onClick={()=>{setShowUpgradePrompt(false);window.open("/pricing","_blank");}}
                style={{fontFamily:T.font.body,fontSize:"0.9375rem",fontWeight:600,padding:"0.75rem 2rem",borderRadius:"0.625rem",border:"none",
                  background:`linear-gradient(135deg,${T.color.terracotta},${T.color.walnut})`,color:"#FFF",cursor:"pointer",width:"100%"}}>
                {tPalace("viewPlans")}
              </button>
              <button onClick={()=>setShowUpgradePrompt(false)}
                style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:400,padding:"0.5rem",border:"none",
                  background:"none",color:T.color.muted,cursor:"pointer"}}>
                {tPalace("gotIt")}
              </button>
            </div>
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
      {showSharedWithMe&&<SharedWithMePanel onClose={()=>setShowSharedWithMe(false)} onNavigateToRoom={(roomId)=>{setShowSharedWithMe(false);const wingId=roomId.startsWith("ro")?"roots":roomId.startsWith("tv")?"travel":roomId.startsWith("ne")?"nest":roomId.startsWith("cf")?"craft":roomId.startsWith("pa")?"passions":"roots";setNavMode("3d");enterCorridor(wingId);setTimeout(()=>enterRoom(roomId),600);}}/>}
      {showSharingSettings&&<SharingSettingsPanel open={showSharingSettings} onClose={()=>setShowSharingSettings(false)}/>}

      {/* Interview panels */}
      {showInterviewLibrary&&<InterviewLibraryPanel onClose={()=>setShowInterviewLibrary(false)} highlightWingId={activeWing}/>}
      {showInterviewHistory&&<InterviewHistoryPanel onClose={()=>setShowInterviewHistory(false)}/>}
      {showInterview&&<Suspense fallback={lazyFallback}><InterviewPanel onClose={()=>{setShowInterviewPanel(false);markChecklistItem("complete_interview");}} onCreateMemory={(mem, wingId)=>{
        // Place interview memory in the first room of the relevant wing (or attic if general)
        const targetWing = wingId === "general" ? "roots" : wingId;
        const prefix = {roots:"ro",nest:"ne",craft:"cf",travel:"tv",passions:"pa"}[targetWing]||"ro";
        const roomId = `${prefix}1`;
        addMemoryToRoom(roomId, mem);
      }}/></Suspense>}

      {/* Track panels */}
      {showTracksPanel&&!selectedTrackId&&<TracksPanel onClose={()=>setShowTracksPanel(false)}/>}
      {selectedTrackId&&<TrackDetailPanel trackId={selectedTrackId} onClose={()=>setSelectedTrackId(null)} onNavigate={(target)=>{setShowTracksPanel(false);setSelectedTrackId(null);switch(target){case "library-import":setNavMode("library");setShowImportHub(true);break;case "library":setNavMode("library");break;case "upload":setNavMode("library");setShowImportHub(true);break;case "room":{const wing=activeWing||"roots";const prefix:{[k:string]:string}={roots:"ro",nest:"ne",craft:"cf",travel:"tv",passions:"pa"};setNavMode("3d");enterCorridor(wing);setTimeout(()=>enterRoom(activeRoomId||`${prefix[wing]||"ro"}1`),600);break;}case "corridor":{const wing=activeWing||"roots";setNavMode("3d");setTimeout(()=>enterCorridor(wing),600);break;}case "share":{if(activeRoomId){setShowSharing(true);}else{const wing=activeWing||"roots";const prefix:{[k:string]:string}={roots:"ro",nest:"ne",craft:"cf",travel:"tv",passions:"pa"};const roomId=`${prefix[wing]||"ro"}1`;setNavMode("3d");enterCorridor(wing);setTimeout(()=>{enterRoom(roomId);setTimeout(()=>setShowSharing(true),600);},600);}break;}case "wings":{setNavMode("3d");const wing=activeWing||"roots";setTimeout(()=>enterWing(wing),600);break;}case "entrance":setNavMode("3d");setTimeout(()=>enterEntrance(),300);break;case "interview":setShowInterviewPanel(true);break;case "legacy":setShowLegacyPanel(true);break;default:break;}}}/>}
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
          const firstWingId = allWings[0]?.id || "roots";
          enterCorridor(firstWingId);
        }}
        onNavigateRoom={() => {
          const firstWingId = allWings[0]?.id || "roots";
          const firstRoom = getWingRooms(firstWingId)[0];
          if (firstRoom) enterRoom(firstRoom.id);
        }}
      />
    </div>
  );
}


