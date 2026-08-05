"use client";
import { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { navigateInApp, isNative, isIOS } from "@/lib/native/platform";
import { IAP_ENABLED } from "@/lib/native/iap-flags";
import { createPortal } from "react-dom";
import { T } from "@/lib/theme";
import { SHADOW } from "@/lib/libraryTokens";
import PalaceLogo from "@/components/landing/PalaceLogo";
import { syncSettingsFromServer } from "@/lib/stores/settingsSync";
import PalaceLoadingScreen from "@/components/ui/PalaceLoadingScreen";
import { useIsMobile, useTouchControls } from "@/lib/hooks/useIsMobile";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useUserStore } from "@/lib/stores/userStore";
import { createClient } from "@/lib/supabase/client";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useAchievementStore } from "@/lib/stores/achievementStore";
import { requestAppRating } from "@/lib/native/rating";
import { useTrackStore } from "@/lib/stores/trackStore";
import { getKepSocialStats, type KepSocialStats } from "@/lib/social/stats-actions";
import { useNavigation } from "@/lib/hooks/useNavigation";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useRoomMemories } from "@/lib/hooks/useRoomMemories";
import type { Mem } from "@/lib/constants/defaults";
const OnboardingWizard = lazy(() => import("@/components/ui/OnboardingWizard"));
const LandscapeNudge = lazy(() => import("@/components/ui/LandscapeNudge"));
// TopBar removed — replaced by PalaceSubNav
import { WingTooltip, DoorTooltip } from "@/components/ui/HoverTooltip";
// SearchBar removed — search is no longer shown in room view
const UploadPanel = lazy(() => import("@/components/ui/UploadPanel"));
const SharingPanel = lazy(() => import("@/components/ui/SharingPanel"));
const MemoryDetail = lazy(() => import("@/components/ui/MemoryDetail"));
import NavigationBar from "@/components/ui/NavigationBar";
import StorageBanner from "@/components/ui/StorageBanner";
import NotificationsPage from "@/components/ui/NotificationsPage";
import SettingsInline from "@/components/ui/SettingsInline";
const RoomManagerPanel = lazy(() => import("@/components/ui/RoomManagerPanel"));
const WingManagerPanel = lazy(() => import("@/components/ui/WingManagerPanel"));
const AchievementsPanel = lazy(() => import("@/components/ui/AchievementsPanel"));
import { AchievementIcon } from "@/components/ui/AtriumWidgets";
import TracksPanel from "@/components/ui/TracksPanel";
import KepCapturePanel from "@/components/ui/KepCapturePanel";
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
const PublishModal = lazy(() => import("@/components/social/PublishModal"));
const PasscodeModal = lazy(() => import("@/components/social/PasscodeModal"));
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
import { isMobileGPU } from "@/lib/3d/mobilePerf";

// ── Delayed spinner fallback — avoids flash for fast lazy loads ──
function DelayedFallback() {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 300); return () => clearTimeout(t); }, []);
  if (!show) return null;
  return <div style={{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,background:"rgba(64,59,54,.5)",backdropFilter:"blur(0.25rem)"}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{width:"2.5rem",height:"2.5rem",border:"0.1875rem solid rgba(184,92,56,.3)",borderTopColor:"#B85C38",borderRadius:"50%",animation:"spin 0.8s linear infinite"}} /></div>;
}

// ═══ MAIN — 4-level navigation: exterior → entrance → corridor → room ═══
export default function MemoryPalace(){
  const isMobile = useIsMobile();
  // Input modality (joystick + touch tutorials) — deliberately NOT viewport-based:
  // a WKWebView viewport misreport or an iPad's 768px+ width must never leave a
  // touch user with keyboard instructions and no joystick.
  const touchControls = useTouchControls();
  const { t: tTrack } = useTranslation("tracksPanel");
  const { t: tAch } = useTranslation("achievementsPanel");
  const { t: tAction } = useTranslation("actionMenu");
  const { t: tPalace } = useTranslation("palace");
  const { t: tRoom } = useTranslation("roomMedia");
  const { t: tWings } = useTranslation("wings");
  const { t: tLayout } = useTranslation("roomLayouts");
  const { daylightEnabled, daylightMode, resolvedHour } = useDaylight();
  // Reduced-motion gate — drops the portal flash + toast/celebration entrance
  // animations for users who ask the OS to minimise motion.
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
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
  const storageMb = useUserStore((s) => s.storageMb);
  const storageLimitMb = useUserStore((s) => s.storageLimitMb);

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
  const enterEntrance = usePalaceStore((s) => s.enterEntrance);
  const enterCorridor = usePalaceStore((s) => s.enterCorridor);
  const enterRoom = usePalaceStore((s) => s.enterRoom);
  const enterWingRoom = usePalaceStore((s) => s.enterWingRoom);
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
  const showKepCapture = useUIPanelStore((s) => s.showKepCapture);
  const setShowKepCapture = useUIPanelStore((s) => s.setShowKepCapture);
  const showEraPicker = useUIPanelStore((s) => s.showEraPicker);
  const setShowEraPicker = useUIPanelStore((s) => s.setShowEraPicker);
  const showUpgradePrompt = useUIPanelStore((s) => s.showUpgradePrompt);
  const setShowUpgradePrompt = useUIPanelStore((s) => s.setShowUpgradePrompt);
  // Focus traps for the inline dialogs rendered further down (era picker,
  // storage-full upgrade prompt, track-completion celebration). Each moves
  // focus into the dialog on open, cycles Tab within it, and restores focus
  // on close so keyboard/SR users can operate and Escape out of them.
  const eraPickerTrap = useFocusTrap(showEraPicker);
  const upgradePromptTrap = useFocusTrap(showUpgradePrompt);
  const celebrationTrap = useFocusTrap(!!trackCelebration);
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
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [sharedWings, setSharedWings] = useState<SharedWingDoor[]>([]);
  // sharedContext removed — was never read
  const [sharedWingData, setSharedWingData] = useState<{ wing: any; rooms: any[]; permission?: string; canAdd?: boolean; canEdit?: boolean; canDelete?: boolean } | null>(null);
  // Owner's memories for a room inside a shared wing. When set (shared context),
  // these OVERRIDE the viewer's own roomMems so a visitor sees the owner's
  // memories — not their own (or demo/empty). Keyed to activeRoomId below.
  const [sharedRoomMems, setSharedRoomMems] = useState<Mem[] | null>(null);
  const [corridorPaintings, setCorridorPaintings] = useState<CorridorPaintings>({});
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showNotificationsPage, setShowNotificationsPage] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("notifications") === "1";
    }
    return false;
  });
  // Listen for bell dropdown "See all activity" event
  useEffect(() => {
    const handler = () => { setShowNotificationsPage(true); setShowSettings(false); };
    window.addEventListener("mp:open-notifications-page", handler);
    return () => window.removeEventListener("mp:open-notifications-page", handler);
  }, []);
  // React to ?notifications=1 on EVERY URL change, not just first mount — the
  // useState initializer above only runs once, so a router.push to
  // /atrium?notifications=1 while this component was already mounted (e.g.
  // client-nav within /atrium|/palace) was silently ignored. useSearchParams
  // re-renders on client navigations, so this effect catches them all.
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams?.get("notifications") === "1") {
      setShowNotificationsPage(true);
      setShowSettings(false);
      // Strip the param (preserving history state) so back/refresh doesn't retrigger.
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }, [searchParams]);
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
  // ── Readiness-driven overlay dismissal (interior scenes fire onReady after
  //    their first rendered frame; the fixed timers below remain as fallbacks) ──
  const [sceneReadyFade, setSceneReadyFade] = useState(false); // true → overlay fade-out restarts with zero delay
  const sceneLoadingRef = useRef(true); // sync mirror of sceneLoading for onReady callbacks
  const sceneLoadStartRef = useRef(0); // performance.now() when the current overlay appeared
  const sceneReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // The interactive tour is driven by the NudgeTooltip system via the
  // `mp:open-palace-tutorial` event; only the shared `active` flag is still read
  // here to suppress spotlights/contextual tooltips while a tour is running.
  const tutorialActive = useTutorialStore((s) => s.active);

  // ── Hooks ──
  const { wingData, hovWingData, activeRoomData, crumbs, handleMemClick, allWings } = useNavigation();
  const { roomMems, allRoomMems, handleAddMemory, addMemoryToRoom, handleUpdateMemory, handleDeleteMemory, currentSharing, updateSharing } = useRoomMemories();
  // Top media bar open state (drives InteriorScene video/audio bar)
  const roomMediaBarOpen = useRoomMediaBarStore(s => s.open);
  const setRoomMediaBarOpen = useRoomMediaBarStore(s => s.setOpen);

  // ── Shared-wing room memories ──
  // When a visitor enters a room inside a shared family wing, useRoomMemories
  // (bound to activeRoomId) resolves the CURRENT viewer's own memoryStore, so
  // without this the visitor would see their own memories / demo / empty. Here
  // we fetch the OWNER's memories via getSharedRoomMemories and override.
  const isSharedWing = !!activeWing && activeWing.startsWith("shared:");
  const sharedShareId = isSharedWing ? (activeWing!.split(":")[2] || "") : "";
  // Read-only shares must not allow add/update/delete (canEdit gates writes).
  const sharedCanEdit = isSharedWing ? !!sharedWingData?.canEdit : true;
  useEffect(() => {
    if (!isSharedWing || view !== "room" || !activeRoomId || !sharedShareId) {
      setSharedRoomMems(null);
      return;
    }
    let cancelled = false;
    setSharedRoomMems([]); // clear stale owner mems while the new room loads
    getSharedRoomMemories(activeRoomId, "wing", sharedShareId)
      .then((res) => {
        const memories = (res as { memories?: any[] })?.memories;
        if (cancelled || !memories) return;
        const mapped: Mem[] = memories.map((m: any) => ({
          id: m.id, title: m.title, hue: m.hue, s: m.saturation, l: m.lightness,
          type: m.type, desc: m.description || "", dataUrl: m.file_url || null,
          thumbnailUrl: m.thumbnail_url || null,
          ...(m.location_name ? { locationName: m.location_name } : {}),
          ...(m.lat != null ? { lat: m.lat } : {}),
          ...(m.lng != null ? { lng: m.lng } : {}),
          ...(m.created_at ? { createdAt: m.created_at } : {}),
          ...(m.displayed != null ? { displayed: m.displayed } : {}),
          ...(m.display_unit ? { displayUnit: m.display_unit } : {}),
        }));
        setSharedRoomMems(mapped);
      })
      .catch(() => { if (!cancelled) setSharedRoomMems([]); });
    return () => { cancelled = true; };
  }, [isSharedWing, view, activeRoomId, sharedShareId]);
  // Effective memories fed to InteriorScene: owner's mems in a shared wing,
  // otherwise the viewer's own roomMems.
  const effectiveRoomMems = isSharedWing && sharedRoomMems !== null ? sharedRoomMems : roomMems;
  // In a read-only shared room, swallow InteriorScene memory edits.
  const effectiveUpdateMemory = isSharedWing && !sharedCanEdit
    ? (() => {})
    : handleUpdateMemory;

  // Build wingRooms map for PalaceSubNav room dropdowns
  const wingRoomsMap = useMemo(() => {
    const map: Record<string, { id: string; name: string; nameKey?: string; icon: string }[]> = {};
    for (const w of allWings) {
      map[w.id] = getWingRooms(w.id).map(r => ({ id: r.id, name: r.name, nameKey: r.nameKey, icon: r.icon }));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWings, customRooms]);

  // Resolve the wing that actually owns a room. Checks the real room store
  // (default + custom rooms) first so custom rooms route to their true wing,
  // and only falls back to the id-prefix table for legacy/default room ids —
  // instead of silently defaulting every unknown room to "roots".
  const wingForRoom = useCallback((roomId: string): string => {
    for (const w of allWings) {
      if (getWingRooms(w.id).some(r => r.id === roomId)) return w.id;
    }
    const prefix = roomId.slice(0, 2);
    const byPrefix: Record<string, string> = { ro: "roots", tv: "travel", ne: "nest", cf: "craft", pa: "passions" };
    return byPrefix[prefix] || "roots";
  }, [allWings, getWingRooms]);

  // ── Universal Actions (available in all modes) ──
  // Upload/Share panels only mount over a live 3D room (they need activeRoomId).
  // From Atrium/Library or 3D exterior/entrance there is no active room, so we
  // must enter a default room FIRST before opening the panel — otherwise the
  // action is a silent no-op (and, in 3D, soft-locks the UI by hiding the nav).
  // Mirrors the TrackDetailPanel 'upload'/'share' cases.
  const ROOM_PREFIX: Record<string, string> = { roots: "ro", nest: "ne", craft: "cf", travel: "tv", passions: "pa" };
  const openInRoom = useCallback((open: () => void) => {
    if (activeRoomId && navMode === "3d") { open(); return; }
    const wing = activeWing || "roots";
    const roomId = activeRoomId || `${ROOM_PREFIX[wing] || "ro"}1`;
    setNavMode("3d");
    enterWingRoom(wing, roomId);
    setTimeout(open, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoomId, activeWing, navMode, setNavMode, enterWingRoom]);
  const actionGroups = useActions({
    onAddMemory: () => { setShowTools(false); openInRoom(() => setShowUpload(true)); },
    onUploadPhotos: () => { setShowTools(false); setShowImportHub(true); setNavMode("library"); },
    onRecordInterview: () => { setShowTools(false); setShowInterviewLibrary(true); },
    onWriteStory: () => { setShowTools(false); openInRoom(() => setShowUpload(true)); },
    onMemoryMap: () => { setShowTools(false); setShowMemoryMap(true); },
    onTimeline: () => { setShowTools(false); setShowTimeline(true); },
    onStatistics: () => { setShowTools(false); setShowStatistics(true); },
    onFamilyTree: () => { setShowTools(false); setShowFamilyTree(true); },
    onShareRoom: () => { setShowTools(false); openInRoom(() => setShowSharing(true)); },
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
          // Deep link: one atomic fade straight into the room (no throwaway corridor mount)
          if (roomId) enterWingRoom(wingId, roomId);
          else enterCorridor(wingId);
        }
      }
    } catch { /* ignore */ }
  },[loadProfile, enterCorridor, enterWingRoom]);

  // Re-read auth the instant the browser client picks up freshly-set cookies
  // (e.g. right after OAuth sign-in). Closes any first-mount cookie-commit race
  // independent of the service worker, so the landing self-heals without a reload.
  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        loadProfile();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Safety timeout: force profileLoading off after 3s to prevent infinite loading
  useEffect(() => {
    if (!profileLoading) return;
    const t = setTimeout(() => useUserStore.setState({ profileLoading: false }), 3000);
    return () => clearTimeout(t);
  }, [profileLoading]);

  // Sync localStorage settings from server (cross-device consistency)
  // Then bulk-fetch all memories so stats/map/timeline are consistent across devices.
  // Defer the (potentially large) bulk fetch behind requestIdleCallback so it runs
  // after the atrium paints rather than competing with first render / first interaction.
  useEffect(() => {
    let cancelled = false;
    const runBulkFetch = () => {
      if (cancelled) return;
      useMemoryStore.getState().fetchAllRoomMemories();
    };
    const schedule = () => {
      if (cancelled) return;
      const ric = (globalThis as typeof globalThis & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      }).requestIdleCallback;
      if (typeof ric === "function") {
        ric(runBulkFetch, { timeout: 2000 });
      } else {
        setTimeout(runBulkFetch, 0);
      }
    };
    syncSettingsFromServer().then(schedule);
    return () => {
      cancelled = true;
    };
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

  // ── Scene loading overlay — shown on the VERY FIRST Palace visit,
  // when navigating from Library into a 3D corridor/room scene, AND
  // when transitioning between different rooms/wings within the palace
  // (where lazy-loaded CorridorScene / InteriorScene need time to mount). ──
  const firstPalaceVisitRef = useRef(true);
  const prevNavModeForLoadingRef = useRef(navMode);
  const prevViewForLoadingRef = useRef(view);
  // Show/hide the loading overlay, keeping the sync ref mirror + fade
  // bookkeeping consistent (start time, accelerated-fade reset, ready timers).
  const showSceneOverlay = useCallback(() => {
    if (sceneReadyTimerRef.current) { clearTimeout(sceneReadyTimerRef.current); sceneReadyTimerRef.current = null; }
    sceneLoadingRef.current = true;
    sceneLoadStartRef.current = performance.now();
    setSceneReadyFade(false);
    setSceneLoading(true);
  }, []);
  const hideSceneOverlay = useCallback(() => {
    sceneLoadingRef.current = false;
    setSceneLoading(false);
    setSceneReadyFade(false);
  }, []);
  // Fired by EntranceHall/Corridor/Interior scenes after their FIRST rendered
  // frame (and synthetically for the warm ExteriorScene, which only fires
  // onReady once per app session). Dismisses the loading overlay via its
  // normal CSS fade-out — never a hard cut: the overlay animation is restarted
  // with zero delay (0.4s opaque hold + 0.4s fade), which also guarantees the
  // ~300ms minimum overlay visibility for very fast mounts. The fixed timers
  // in the effect below remain as safety fallbacks if a scene never fires.
  const handleSceneReady = useCallback(() => {
    if (!sceneLoadingRef.current) return; // no loading overlay showing
    if (sceneReadyTimerRef.current) clearTimeout(sceneReadyTimerRef.current);
    const fadeDelayMs = sceneLoadFromLibraryRef.current ? 1200 : 800;
    const elapsed = performance.now() - sceneLoadStartRef.current;
    const clear = () => { sceneLoadFromLibraryRef.current = false; sceneLoadingRef.current = false; setSceneLoading(false); setSceneReadyFade(false); };
    if (elapsed < fadeDelayMs + 350) {
      // Overlay still fully opaque — restart its fade-out with zero delay.
      setSceneReadyFade(true);
      sceneReadyTimerRef.current = setTimeout(clear, 850); // unmount just after the 0.8s fade completes
    } else {
      // Natural fade already underway — let it finish, then unmount.
      sceneReadyTimerRef.current = setTimeout(clear, Math.max(50, fadeDelayMs + 850 - elapsed));
    }
  }, []);
  useEffect(() => () => { if (sceneReadyTimerRef.current) clearTimeout(sceneReadyTimerRef.current); }, []);
  useEffect(() => {
    const cameFromLibrary = prevNavModeForLoadingRef.current === "library" && navMode === "3d";
    const prevView = prevViewForLoadingRef.current;
    prevNavModeForLoadingRef.current = navMode;
    prevViewForLoadingRef.current = view;

    // Library → 3D corridor/room: show loading while scene JS loads & mounts.
    // Checked first because enterCorridor/enterRoom use fade() which applies
    // the view change a couple of frames later (double rAF) — so view may
    // still be "exterior" and would otherwise fall into the first-palace-visit
    // branch below.
    if (cameFromLibrary) {
      firstPalaceVisitRef.current = false; // skip the first-visit splash later
      sceneLoadFromLibraryRef.current = true;
      showSceneOverlay();
      // Use a non-cleanup timeout so it survives the view change that follows
      // right after (palaceStore fade). The ref guard in the fallthrough
      // prevents premature clearing. Fallback only — the mounted scene's
      // onReady dismisses the overlay earlier via handleSceneReady.
      setTimeout(() => { sceneLoadFromLibraryRef.current = false; hideSceneOverlay(); }, 1800);
      return;
    }

    // Show splash only first time entering exterior, and only if the warm
    // ExteriorScene hasn't already signalled ready (onReady fires on first
    // rendered frame, which usually happens well before the user taps Palace).
    if (view === "exterior" && firstPalaceVisitRef.current) {
      firstPalaceVisitRef.current = false;
      if (sceneReadyRef.current) {
        // Scene already warm — skip the loading overlay entirely.
        hideSceneOverlay();
        return;
      }
      showSceneOverlay();
      // onReady from ExteriorScene will hide it precisely; 2.5s safety.
      const t = setTimeout(hideSceneOverlay, 2500);
      return () => clearTimeout(t);
    }

    // Intra-palace view transitions (e.g. corridor→room, room→corridor,
    // entrance→corridor, exterior→entrance): show a brief loading overlay
    // while the lazy-loaded scene JS chunk loads and the 3D scene mounts.
    // Only trigger when the view actually changed AND we're in 3D mode.
    if (navMode === "3d" && prevView !== view && !sceneLoadFromLibraryRef.current) {
      const needsLoading =
        (prevView === "corridor" && view === "room") ||
        (prevView === "room" && view === "corridor") ||
        (prevView === "entrance" && view === "corridor") ||
        (prevView === "corridor" && view === "entrance") ||
        (prevView === "exterior" && view === "entrance") ||
        (prevView === "entrance" && view === "exterior") ||
        (prevView === "exterior" && view === "corridor") ||
        (prevView === "room" && view === "entrance");
      if (needsLoading) {
        showSceneOverlay();
        // The warm persistent ExteriorScene never re-fires onReady — when
        // returning to it, signal readiness ourselves once the overlay painted.
        const rt = (view === "exterior" && sceneReadyRef.current)
          ? setTimeout(handleSceneReady, 50)
          : null;
        // Safety fallback only — the mounted scene's onReady dismisses earlier.
        const t = setTimeout(hideSceneOverlay, 2000);
        return () => { if (rt) clearTimeout(rt); clearTimeout(t); };
      }
    }

    // Any other view transition: no splash — but don't interrupt an active
    // Library→3D loading overlay (view changes mid-transition due to fade).
    if (!sceneLoadFromLibraryRef.current) {
      hideSceneOverlay();
    }
  }, [view, navMode, showSceneOverlay, hideSceneOverlay, handleSceneReady]);

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
  // Track which tour auto-opens have already fired this session
  const tourFired = useRef<Record<string, boolean>>({});

  // Auto-open room tutorial on first room visit
  useEffect(() => {
    if (view !== "room") {
      // Left the room view: reset the store so a tour that auto-opened on a
      // now-stale view (e.g. the 800ms delay fired after the user backed out)
      // cannot leak into the next room visit.
      setRoomTourOpen(false);
      return;
    }
    const key = "mp_room_tour_seen_v1";
    if (tourFired.current[key]) return;
    try {
      if (typeof window !== "undefined" && !window.localStorage.getItem(key)) {
        tourFired.current[key] = true;
        window.localStorage.setItem(key, "1");
        // Store the timeout id + clear it on teardown so leaving the view
        // mid-delay cannot flip the store open on a view that no longer renders.
        const id = setTimeout(() => setRoomTourOpen(true), 800);
        return () => clearTimeout(id);
      } else {
        tourFired.current[key] = true;
      }
    } catch {}
  }, [view, setRoomTourOpen]);

  useEffect(() => {
    if (navMode !== "3d" || view !== "corridor") {
      setCorridorTourOpen(false);
      return;
    }
    const key = "mp_corridor_tour_seen_v1";
    if (tourFired.current[key]) return;
    try {
      if (!window.localStorage.getItem(key)) {
        tourFired.current[key] = true;
        window.localStorage.setItem(key, "1");
        // No delay here, but a stored id keeps the pattern uniform and lets the
        // cleanup cancel a pending open if the view tears down first.
        const id = setTimeout(() => setCorridorTourOpen(true), 0);
        return () => clearTimeout(id);
      } else {
        tourFired.current[key] = true;
      }
    } catch {}
  }, [navMode, view, setCorridorTourOpen]);

  useEffect(() => {
    const h = () => setEntranceTourOpen(true);
    window.addEventListener("mp:open-entrance-tutorial", h);
    return () => window.removeEventListener("mp:open-entrance-tutorial", h);
  }, [setEntranceTourOpen]);

  useEffect(() => {
    if (navMode !== "3d" || view !== "entrance") {
      setEntranceTourOpen(false);
      return;
    }
    const key = "mp_entrance_tour_seen_v1";
    if (tourFired.current[key]) return;
    try {
      if (typeof window !== "undefined" && !window.localStorage.getItem(key)) {
        tourFired.current[key] = true;
        window.localStorage.setItem(key, "1");
        const id = setTimeout(() => setEntranceTourOpen(true), 800);
        return () => clearTimeout(id);
      } else {
        tourFired.current[key] = true;
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
    if (navMode !== "3d" || view !== "exterior") {
      setPalaceTourOpen(false);
      return;
    }
    const key = "mp_palace_tour_seen_v1";
    if (tourFired.current[key]) return;
    try {
      if (typeof window !== "undefined" && !window.localStorage.getItem(key)) {
        tourFired.current[key] = true;
        window.localStorage.setItem(key, "1");
        const id = setTimeout(() => setPalaceTourOpen(true), 800);
        return () => clearTimeout(id);
      } else {
        tourFired.current[key] = true;
      }
    } catch {}
  }, [navMode, view, setPalaceTourOpen]);
  // Lazy 3D warm-up: the WebGL context + ExteriorScene graph (+ its HDRI/PBR
  // downloads) must NOT build during the first atrium/library paint. Build it
  // the moment the user enters 3D — sessions that never open the palace pay
  // zero 3D cost. Once warmed it stays mounted for smooth palace↔atrium hops.
  const [hasVisitedPalace, setHasVisitedPalace] = useState(false);
  useEffect(() => {
    if (navMode === "3d") setHasVisitedPalace(true);
  }, [navMode]);
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

  // ── Persistent Entrance Hall (desktop only) ──
  // The hall is the most-traversed hub; on capable GPUs we keep it mounted-but-
  // paused in its own body-level portal (mirror of the persistent ExteriorScene)
  // so entrance↔corridor/room/exterior transitions never rebuild its scene graph.
  // Mobile/native GPUs keep the mount/unmount lifecycle (a 2nd persistent WebGL
  // context risks the past iPad WKWebView memory ceiling).
  const [persistHall, setPersistHall] = useState(false);
  useEffect(() => {
    // Kill-switch: `localStorage.mp_no_hall_persist = "1"` + reload reverts to the
    // proven mount/unmount hall path without a redeploy, if the persistent hall
    // ever misbehaves on a given desktop.
    let disabled = false;
    try { disabled = localStorage.getItem("mp_no_hall_persist") === "1"; } catch {}
    setPersistHall(!isMobileGPU() && !disabled);
  }, []);
  const [hallHost, setHallHost] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (typeof document === "undefined" || !persistHall) return;
    const el = document.createElement("div");
    el.setAttribute("data-hall-persistent", "");
    el.style.cssText = "position:fixed;inset:0;z-index:5;visibility:hidden;pointer-events:none;";
    el.dataset.paused = "1";
    document.body.appendChild(el);
    setHallHost(el);
    return () => { try { document.body.removeChild(el); } catch {} };
  }, [persistHall]);
  useLayoutEffect(() => {
    if (!hallHost) return;
    const show = navMode === "3d" && view === "entrance" && !showNotificationsPage && !showSettings;
    hallHost.style.visibility = show ? "visible" : "hidden";
    hallHost.style.pointerEvents = show ? "auto" : "none";
    hallHost.dataset.paused = show ? "0" : "1";
  }, [hallHost, navMode, view, showNotificationsPage, showSettings]);

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

  // ── Kep/Social stats (shared by achievements + tracks) ──
  const [kepSocialStats, setKepSocialStats] = useState<KepSocialStats | null>(null);
  useEffect(() => { getKepSocialStats().then(setKepSocialStats).catch(() => {}); }, []);

  // ── Achievement tracking ──
  const userMems = useMemoryStore((s) => s.userMems);
  const roomSharingData = useMemoryStore((s) => s.roomSharing);
  const achCheckRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      checkAchievements(
        userMems, customRooms, roomLayouts, roomSharingData,
        kepSocialStats ? { captures: kepSocialStats.kepCaptureCount, audioCaptures: kepSocialStats.kepAudioCaptures } : undefined,
        kepSocialStats ? { published: kepSocialStats.hasPublishedPalace, followers: kepSocialStats.followerCount, following: kepSocialStats.followingCount, comments: kepSocialStats.commentsLeft, visits: kepSocialStats.palacesVisited } : undefined,
      );
    }, 300);
    return () => clearTimeout(t);
  }, [userMems, customRooms, roomLayouts, roomSharingData, kepSocialStats, checkAchievements]);

  // ── In-app rating prompt (after 3rd achievement or 25th memory) ──
  const earnedAchCount = useAchievementStore((s) => s.earnedIds.length);
  useEffect(() => {
    if (achToast && earnedAchCount >= 3) {
      requestAppRating();
    }
  }, [achToast, earnedAchCount]);

  // ── URL ↔ navMode mapping ──
  // /me is now its own Next.js route (the identity page), no longer an in-SPA
  // overlay — modeToPath never maps to it and pathToMode never claims it.
  const modeToPath = (mode: string, _settings?: boolean) => {
    return mode === "3d" ? "/palace" : mode === "library" ? "/library" : "/atrium";
  };
  const pathToMode = (p: string): "atrium" | "library" | "3d" | null => {
    if (p === "/atrium") return "atrium";
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
      const settings = !!e.state?.showSettings;
      setShowSettings(settings);
      prevShowSettingsRef.current = settings;
    };
    // Detect initial state from URL path
    const initialPath = window.location.pathname;
    const initialMode = pathToMode(initialPath);
    if (initialMode && initialMode !== navMode) {
      setNavMode(initialMode);
      prevNavModeRef.current = initialMode;
    }
    // Seed current state so first Back works
    window.history.replaceState({ navMode: initialMode || navMode, showSettings: false }, "", modeToPath(initialMode || navMode));
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
    // ?notifications=1 is handled by the searchParams effect above (which also
    // catches client navigations while this component is already mounted).
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
    const ks = kepSocialStats;
    const t = setTimeout(() => {
      runProgressCheck({
        userMems, customRooms, roomLayouts, roomSharing: roomSharingData,
        visitedWings, customWings,
        legacyContactCount: 0, // updated after server fetch
        legacyWingAccessConfigured: false,
        legacyReviewed,
        hasUsedMassImport,
        kepCaptureCount: ks?.kepCaptureCount ?? 0,
        kepAudioCaptures: ks?.kepAudioCaptures ?? 0,
        kepHasSetRoom: ks?.kepHasSetRoom ?? false,
        hasPublishedPalace: ks?.hasPublishedPalace ?? false,
        followingCount: ks?.followingCount ?? 0,
        followerCount: ks?.followerCount ?? 0,
        commentsLeft: ks?.commentsLeft ?? 0,
        palacesVisited: ks?.palacesVisited ?? 0,
      });
    }, 500);
    return () => clearTimeout(t);
  }, [userMems, customRooms, roomLayouts, roomSharingData, visitedWings, customWings, legacyReviewed, hasUsedMassImport, kepSocialStats, runProgressCheck]);

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

  // The celebration dialog has no focusable children, so useFocusTrap can't
  // land focus on it. Focus the dialog node itself so its Escape handler works
  // and SR focus moves into the announcement.
  useEffect(() => {
    if (!trackCelebration) return;
    const id = requestAnimationFrame(() => { celebrationTrap.containerRef.current?.focus(); });
    return () => cancelAnimationFrame(id);
  }, [trackCelebration, celebrationTrap.containerRef]);

  // SearchBar auto-hide logic removed (SearchBar deleted from room view)

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

  // STAGING-ONLY: treat every login as a first-time login so onboarding can be
  // reviewed on preview builds. HARD-GATED to non-production hosts — the real
  // domain (thememorypalace.ai / www) is NEVER forced. Escape hatch: append
  // ?onboarding=off to browse the rest of staging without the wizard.
  const [forceOnboarding, setForceOnboarding] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = window.location.hostname;
    if (h === "thememorypalace.ai" || h === "www.thememorypalace.ai") return; // production: never force
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("onboarding") === "off") sessionStorage.setItem("mp_stg_onb_off", "1");
      if (params.get("onboarding") === "on") sessionStorage.removeItem("mp_stg_onb_off");
      if (sessionStorage.getItem("mp_stg_onb_off") === "1") return;
    } catch { /* ignore */ }
    setForceOnboarding(true);
  }, []);

  const handleFinishOnboarding=async(memoryUploaded?: boolean)=>{
    // Atomic: if the DB write fails, finishOnboarding throws — keep the wizard
    // mounted so the write retries rather than navigating away with a half-
    // persisted state (which would re-onboard on the next fresh device).
    try {
      await finishOnboarding();
    } catch {
      try { window.dispatchEvent(new CustomEvent("mp:toast", { detail: { message: tPalace("onboardingFinishError"), type: "error" } })); } catch {}
      return;
    }
    setOnboardDate();
    justOnboardedRef.current = true;
    // Mark checklist item if user uploaded during onboarding
    if (memoryUploaded) markChecklistItem("upload_first_memory");
    // Land on Atrium first, then reset nudges after a tick so NudgeProvider
    // is mounted in the atrium view before we trigger the tutorial.
    setNavMode("atrium");
    // Reset nudge state for fresh tutorial after the atrium has mounted
    setTimeout(() => {
      useNudgeStore.getState().reset();
      // Force-trigger the tutorial after reset settles
      setTimeout(() => {
        const mobile = typeof window !== "undefined" && window.innerWidth < 768;
        useNudgeStore.getState().initPage("atrium", mobile);
      }, 200);
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
    // No onSettings override → the Me tab routes to /me (the identity landing)
    // from every mode. Previously it opened the old SettingsInline overlay,
    // which is why Me from atrium/library "landed on the old page" while Me
    // from Explore (no override) correctly went to /me.
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
          onReady={() => { sceneReadyRef.current = true; hideSceneOverlay(); }}
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

  // ── Entrance Hall node — mounted persistently (desktop) or inline (mobile) ──
  const hallSceneNode = (
    <Suspense fallback={null}><EntranceHallScene key={dlKey} onReady={handleSceneReady} onDoorClick={(wingId: string)=>{if(walkthroughActive&&walkthroughPhase<=2&&wingId!=="__exterior__"&&wingId!==walkthroughTargetWing)return;if(wingId==="__exterior__")exitToPalace();else if(wingId==="attic")setShowStoragePlayer(true);else if(wingId.startsWith("locked"))setShowUpgradePrompt(true);else if(wingId.startsWith("shared:")){const [,slug,shareId]=wingId.split(":");const shareInfo=sharedWings.find(sw=>sw.shareId===shareId);if(shareInfo){getSharedWingData(shareId).then(result=>{if(result.wing&&result.rooms){setSharedWingData(result);enterCorridor(wingId);}});}}else{if(nudgeHL.wing)nudgeDismiss();enterCorridor(wingId);}}} wings={allWings} sharedWings={sharedWings} highlightDoor={(walkthroughActive&&walkthroughPhase===2?walkthroughTargetWing:null)||nudgeHL.wing||null} styleEra={styleEra||"roman"} onInlayClick={()=>setShowUpgradePrompt(true)} onBustClick={() => { /* bust builder hidden */ }} bustPedestals={bustPedestals} bustTextureUrl={bustTextureUrl} bustModelUrl={bustModelUrl} bustProportions={bustProportions} bustName={bustName || userName || null} bustGender={bustGender || null} autoWalkTo={autoWalking && nudgeHL.wing ? nudgeHL.wing : undefined}/></Suspense>
  );
  // Desktop: keep it alive in its own portal; mobile falls back to inline mount.
  const warmHallScene = (persistHall && hallHost)
    ? createPortal(hallSceneNode, hallHost)
    : null;

  if (showSettings && !walkthroughActive) {
    return (<>
      {warmPalaceScene}
      {warmHallScene}
      <NavigationBar currentMode={navMode} {...earlyNavBarProps} activeTab="me" />
      <SettingsInline />
    </>);
  }

  if (showNotificationsPage && !walkthroughActive) {
    return (<>
      {warmPalaceScene}
      {warmHallScene}
      <NavigationBar currentMode={navMode} {...earlyNavBarProps} activeTab="notifications" />
      <NotificationsPage />
    </>);
  }

  // Tri-state gate: while the onboarded state is UNKNOWN (null) or still
  // loading, show the loading screen — NEVER the wizard. The wizard renders
  // only on a definitive first-login (onboarded === false), so a returning
  // account on a slow/failed/fresh-device fetch can never be re-onboarded.
  if(profileLoading || onboarded === null){
    return <PalaceLoadingScreen />;
  }

  // Production trigger: onboarded === false only. On staging, forceOnboarding
  // re-shows the wizard every load (until finished this session) for review.
  if(onboarded === false || (forceOnboarding && !justOnboardedRef.current)) return <OnboardingWizard onFinish={handleFinishOnboarding}/>;

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
    {showMemoryMap&&<Suspense fallback={lazyFallback}><MemoryMap userMems={userMems} onClose={()=>setShowMemoryMap(false)} onNavigateLibrary={()=>{setShowMemoryMap(false);setNavMode("library");}} onNavigateToMemory={(wingId,roomId,memoryId)=>{setShowMemoryMap(false);setLibraryTarget({wingId,roomId,memoryId});setNavMode("library");}} onNavigate={(roomId)=>{setShowMemoryMap(false);const wingId=wingForRoom(roomId);setLibraryTarget({wingId,roomId});setNavMode("library");}}/></Suspense>}
    {showFamilyTree&&<Suspense fallback={lazyFallback}><FamilyTreePanel onClose={()=>setShowFamilyTree(false)}/></Suspense>}
    {/* Import hub is now rendered in LibraryView — triggered via uiPanelStore.showImportHub */}
    {showAchievements&&<Suspense fallback={lazyFallback}><AchievementsPanel onClose={()=>setShowAchievements(false)} highlightId={achHighlightId}/></Suspense>}
    {showTracksPanel&&!selectedTrackId&&<TracksPanel onClose={()=>setShowTracksPanel(false)}/>}
    {selectedTrackId&&<TrackDetailPanel trackId={selectedTrackId} onClose={()=>setSelectedTrackId(null)} onNavigate={(target)=>{setShowTracksPanel(false);setSelectedTrackId(null);switch(target){case "library-import":setNavMode("library");setShowImportHub(true);break;case "library":setNavMode("library");break;case "upload":setNavMode("library");setShowImportHub(true);break;case "room":{const wing=activeWing||"roots";const prefix:{[k:string]:string}={roots:"ro",nest:"ne",craft:"cf",travel:"tv",passions:"pa"};setNavMode("3d");enterWingRoom(wing,activeRoomId||`${prefix[wing]||"ro"}1`);break;}case "corridor":{const wing=activeWing||"roots";setNavMode("3d");setTimeout(()=>enterCorridor(wing),600);break;}case "share":{if(activeRoomId){setShowSharing(true);}else{const wing=activeWing||"roots";const prefix:{[k:string]:string}={roots:"ro",nest:"ne",craft:"cf",travel:"tv",passions:"pa"};const roomId=`${prefix[wing]||"ro"}1`;setNavMode("3d");enterWingRoom(wing,roomId);setTimeout(()=>setShowSharing(true),600);}break;}case "wings":{setNavMode("3d");const wing=activeWing||"roots";setTimeout(()=>enterCorridor(wing),600);break;}case "entrance":setNavMode("3d");setTimeout(()=>enterEntrance(),300);break;case "interview":setShowInterviewPanel(true);break;case "legacy":setShowLegacyPanel(true);break;case "keps":setShowKepCapture(true);break;case "explore":window.location.href="/explore";break;case "settings":window.location.href="/settings";break;default:break;}}}/>}
    {showKepCapture&&<KepCapturePanel onClose={()=>setShowKepCapture(false)}/>}
    {showInterviewLibrary&&<InterviewLibraryPanel onClose={()=>setShowInterviewLibrary(false)} highlightWingId={activeWing}/>}
    {showInterviewHistory&&<InterviewHistoryPanel onClose={()=>setShowInterviewHistory(false)}/>}
    {showInterview&&<Suspense fallback={lazyFallback}><InterviewPanel onClose={()=>{setShowInterviewPanel(false);markChecklistItem("complete_interview");}} onCreateMemory={(mem, wingId)=>{
      const targetWing = wingId === "general" ? "roots" : wingId;
      const prefix = {roots:"ro",nest:"ne",craft:"cf",travel:"tv",passions:"pa"}[targetWing]||"ro";
      const roomId = `${prefix}1`;
      addMemoryToRoom(roomId, mem);
    }}/></Suspense>}
    {showLegacyPanel&&<LegacyPanel onClose={()=>setShowLegacyPanel(false)}/>}
    {showSharedWithMe&&<SharedWithMePanel onClose={()=>setShowSharedWithMe(false)} onNavigateToRoom={(roomId,wingId)=>{setShowSharedWithMe(false);const resolvedWing=wingId||wingForRoom(roomId);setNavMode("3d");enterWingRoom(resolvedWing,roomId);}}/>}
  </>);

  // ── Helper: shared NavigationBar props ──
  const navBarProps = {
    isMobile,
    userName,
    onToolsClick: () => setShowTools(!showTools),
    toolsOpen: showTools,
    onNotifications: () => { setShowNotificationsPage(true); setShowSettings(false); },
    // No onSettings override → Me routes to /me from every mode (see earlyNavBarProps).
    onModeChange: (mode: string) => {
      setShowNotificationsPage(false); setShowSettings(false);
      setNavMode(mode as any);
    },
  };

  // ── Home mode: render Home dashboard ──
  if (navMode === "atrium" && !walkthroughActive) {
    return (<>
      {warmPalaceScene}
      {warmHallScene}
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
      {warmHallScene}
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
        {warmHallScene}
        {!persistHall && view==="entrance" && hallSceneNode}
        {view==="corridor"&&activeWing&&activeWing.startsWith("shared:")&&sharedWingData?<Suspense fallback={null}><CorridorScene key={dlKey+"|"+activeWing+"|"+JSON.stringify(sharedWingData.rooms.map((r: any)=>r.id+r.name+(r.icon||"")))+"|"+(sharedWingData.wing.accentColor||"#7AA0C8")+"|"+(styleEra||"roman")} wingId={activeWing} onReady={handleSceneReady} rooms={sharedWingData.rooms.map((r: any)=>({id:r.id,name:r.name,icon:r.icon||"\uD83D\uDCC1",shared:false,sharedWith:[],coverHue:30}))} onDoorHover={setHovDoor} onDoorClick={(roomId: string)=>{enterRoom(roomId);}} hoveredDoor={hovDoor} wingData={{id:sharedWingData.wing.slug,name:sharedWingData.wing.customName||sharedWingData.wing.slug,nameKey:sharedWingData.wing.slug,icon:"\uD83C\uDFDB\uFE0F",accent:sharedWingData.wing.accentColor||"#7AA0C8",wall:"#DDD4C6",floor:"#9E8264",desc:"Shared wing",descKey:"sharedWing",layout:"L-shaped gallery"}} corridorPaintings={{}} styleEra={styleEra||"roman"} onInlayClick={()=>setShowRoomManager(true)} onPaintingClick={()=>setShowCorridorGallery(true)}/></Suspense>:view==="corridor"&&activeWing&&wingData&&<Suspense fallback={null}><CorridorScene key={dlKey+"|"+activeWing+"|"+JSON.stringify(getWingRooms(activeWing).map(r=>r.id+r.name+r.icon))+"|"+wingData.accent+"|"+(styleEra||"roman")} wingId={activeWing} onReady={handleSceneReady} rooms={getWingRooms(activeWing)} onDoorHover={setHovDoor} onDoorClick={(roomId: string)=>{if(walkthroughActive&&walkthroughPhase===3&&roomId!==walkthroughTargetRoom)return;if(nudgeHL.room)nudgeDismiss();enterRoom(roomId);}} hoveredDoor={hovDoor} wingData={wingData} corridorPaintings={corridorPaintings} highlightDoor={(walkthroughActive&&walkthroughPhase===3?walkthroughTargetRoom:null)||nudgeHL.room||null} styleEra={styleEra||"roman"} onInlayClick={()=>setShowRoomManager(true)} onPaintingClick={()=>setShowCorridorGallery(true)} autoWalkTo={autoWalking && nudgeHL.room ? nudgeHL.room : undefined}/></Suspense>}
        {view==="room"&&activeWing&&activeRoomId&&<Suspense fallback={null}><InteriorScene key={dlKey+"|"+activeWing+"|"+activeRoomId+"|"+(roomLayouts[activeRoomId]||"")+"|"+(styleEra||"roman")} roomId={activeWing} actualRoomId={activeRoomId} onReady={handleSceneReady} layoutOverride={roomLayouts[activeRoomId]} memories={effectiveRoomMems} onMemoryClick={handleMemClick} onMemoryUpdate={effectiveUpdateMemory} wingData={wingData||undefined} styleEra={styleEra||"roman"}/></Suspense>}
      </div>

      {view==="exterior"&&<LandscapeNudge />}
      {view==="exterior"&&<PalaceExteriorTutorial open={palaceTourOpen} onClose={()=>setPalaceTourOpen(false)} />}
      {view==="entrance"&&<EntranceHallTutorial open={entranceTourOpen} onClose={()=>setEntranceTourOpen(false)} />}
      {view==="corridor"&&<CorridorTutorial open={corridorTourOpen} onClose={()=>setCorridorTourOpen(false)} />}
      {view==="room"&&<RoomTutorial open={roomTourOpen} onClose={()=>setRoomTourOpen(false)} />}

      {/* Scene loading overlay — fades out when the mounted scene fires onReady
          (sceneReadyFade restarts the fade with zero delay); the fixed fadeDelay
          values are the fallback pacing when no readiness signal arrives */}
      {(sceneLoading||portalAnim)&&<PalaceLoadingScreen overlay fadeDelay={sceneLoading ? (sceneReadyFade ? 0 : (sceneLoadFromLibraryRef.current ? 1.2 : 0.8)) : 0.2} />}

      {/* TopBar hidden — replaced by PalaceSubNav */}

      {/* Storage warning banner */}
      {storageLimitMb > 0 && (storageMb / storageLimitMb) >= 0.5 && !selMem && !showUpload && !walkthroughActive && (
        <div style={{ position: "absolute", bottom: isMobile ? "5.5rem" : "5rem", left: "1rem", right: "1rem", zIndex: 90, maxWidth: "28rem", margin: "0 auto" }}>
          <StorageBanner storageMb={storageMb} limitMb={storageLimitMb} onUpgrade={() => navigateInApp("/pricing")} />
        </div>
      )}

      {/* NavigationBar — mode switcher (atrium / library / 3D) */}
      <NavigationBar
        key={"nav-3d-"+orientKey}
        currentMode="3d"
        {...navBarProps}
        hidden={!!selMem || (showUpload && !!activeRoomId) || (showSharing && !!activeRoomId) || walkthroughActive}
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
        hidden={!!selMem || (showUpload && !!activeRoomId) || (showSharing && !!activeRoomId) || walkthroughActive}
        isMobile={isMobile}
        pending={palacePending}
        onPendingChange={setPalacePending}
        onExitToPalace={exitToPalace}
        onEntranceHall={enterEntrance}
        onSwitchWing={(wingId) => { switchWing(wingId); }}
        onNavigateRoom={(wingId, roomId) => { enterCorridor(wingId); setTimeout(() => enterRoom(roomId), 300); }}
        onNavigateSharedWing={(shareId, wingSlug) => {
          getSharedWingData(shareId).then(result => { if (result.wing && result.rooms) { setSharedWingData(result); setSharedRoomMems(null); enterCorridor(`shared:${wingSlug}:${shareId}`); } });
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
        onPublish={() => setShowPublishModal(true)}
        onPasscode={() => setShowPasscodeModal(true)}
      />

      {/* Portal transition overlay */}
      {portalAnim&&!reduceMotion&&<div style={{position:"absolute",inset:0,zIndex:45,pointerEvents:"none",animation:"portalFlash .5s ease both",background:"radial-gradient(ellipse at center,rgba(212,175,55,.55) 0%,rgba(212,175,55,.14) 40%,transparent 70%)"}}/>}



      {/* Hover tooltips — desktop only */}
      {!isMobile && hovWingData&&view==="exterior"&&<WingTooltip wing={hovWingData}/>}
      {!isMobile && hovDoorRoom&&view==="corridor"&&<DoorTooltip room={hovDoorRoom} wingAccent={wingData?.accent} wingId={wingData?.id}/>}

      {/* Bottom hints removed — replaced by PalaceSubNav */}

      {/* Room info strip removed — room name shown in PalaceSubNav breadcrumbs, layout/sharing accessible via tools */}

      {/* OnThisDay — floating card in exterior view */}
      {!walkthroughActive&&view==="exterior"&&<OnThisDay onNavigateToRoom={(wingId,roomId)=>{enterWingRoom(wingId,roomId);}}/>}

      {/* Time Capsule Reveal — floating card when capsules have newly opened */}
      {!walkthroughActive&&(view==="exterior"||view==="entrance")&&<TimeCapsuleReveal onNavigateToRoom={(wingId,roomId)=>{enterWingRoom(wingId,roomId);}}/>}

      {/* Floating points animation — always present */}
      <FloatingPoints />

      {/* Desktop ActionMenu removed — replaced by PalaceSubNav */}

      {/* Touch controls tutorial — touch devices only, one-time */}
      {touchControls && <TouchControlsOverlay view={view} />}

      {/* Visible mobile joystick — room, corridor & entrance views */}
      {touchControls && (view === "room" || view === "corridor" || view === "entrance") && (
        <MobileJoystick
          visible={(roomTourOpen || entranceTourOpen || corridorTourOpen || !selMem) && !showUpload && !showSharing && !showSharingSettings && !showPublishModal && !showPasscodeModal && !showDiscoveryMenu}
          onMove={() => {}}
        />
      )}

      {/* MobileBottomBar removed — replaced by PalaceSubNav */}

      {/* Panels + overlays */}
      {showPublishModal && <Suspense fallback={lazyFallback}><PublishModal onClose={() => setShowPublishModal(false)} /></Suspense>}
      {showPasscodeModal && <Suspense fallback={lazyFallback}><PasscodeModal wings={allWings.map(w => ({ id: w.id, name: w.nameKey ? (tWings(w.nameKey) || w.name) : w.name }))} currentWingId={wingData?.id} currentRoomId={view === "room" ? activeRoomId ?? undefined : undefined} currentRoomName={view === "room" && activeRoomData ? (activeRoomData.nameKey ? (tWings(activeRoomData.nameKey) || activeRoomData.name) : activeRoomData.name) : undefined} onClose={() => setShowPasscodeModal(false)} /></Suspense>}
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
      {showMemoryMap&&<Suspense fallback={lazyFallback}><MemoryMap userMems={userMems} onClose={()=>setShowMemoryMap(false)} onNavigateLibrary={()=>{setShowMemoryMap(false);setNavMode("library");}} onNavigateToMemory={(wingId,roomId,memoryId)=>{setShowMemoryMap(false);setLibraryTarget({wingId,roomId,memoryId});setNavMode("library");}} onNavigate={(roomId)=>{setShowMemoryMap(false);const wingId=wingForRoom(roomId);setLibraryTarget({wingId,roomId});setNavMode("library");}}/></Suspense>}
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
              border:"0.0625rem solid rgba(227,214,188,0.6)",
              color:T.color.ink,
              cursor:"pointer",
              zIndex:46,
              display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"0.375rem",
              boxShadow:"0 0.125rem 0.5rem rgba(64,59,54,0.08)",
              transition:"transform 0.2s cubic-bezier(0.22,1,0.36,1)",
              fontFamily:T.font.body,fontSize:"0.75rem",fontWeight:500,
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.03)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";}}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={wingData?.accent||T.color.ember} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            border:"0.0625rem solid rgba(227,214,188,0.6)",
            color:T.color.ink,
            cursor:"pointer",
            zIndex:52,
            display:"inline-flex",alignItems:"center",gap:"0.375rem",
            boxShadow:"0 0.125rem 0.5rem rgba(64,59,54,0.08)",
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
            border:"0.0625rem solid rgba(227,214,188,0.6)",
            color:T.color.ink,
            cursor:"pointer",
            zIndex:46,
            display:"inline-flex",alignItems:"center",gap:"0.375rem",
            boxShadow:"0 0.125rem 0.5rem rgba(64,59,54,0.08)",
            transition:"transform 0.2s cubic-bezier(0.22,1,0.36,1)",
            fontFamily:T.font.body,fontSize:"0.75rem",fontWeight:500,
          }}
          onMouseEnter={(e)=>{(e.currentTarget as HTMLButtonElement).style.transform="scale(1.03)";}}
          onMouseLeave={(e)=>{(e.currentTarget as HTMLButtonElement).style.transform="scale(1)";}}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill={wingData?.accent||T.color.ember} stroke="none">
            <rect x="1" y="1" width="8" height="8" rx="1.5"/>
            <rect x="11" y="1" width="8" height="8" rx="1.5"/>
            <rect x="1" y="11" width="8" height="8" rx="1.5"/>
            <rect x="11" y="11" width="8" height="8" rx="1.5"/>
          </svg>
          {tRoom("media")}
        </button>
      )}
      {showStoragePlayer&&<StoragePlayerPanel onClose={()=>setShowStoragePlayer(false)}/>}


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
        onTimeCapsule={() => {
          try { localStorage.setItem("mp_upload_time_capsule", "true"); } catch {}
          if (activeRoomId) setShowUpload(true);
          else { setShowImportHub(true); setNavMode("library"); }
        }}
        onShare={() => { if (activeRoomId) setShowSharing(true); else { setShowImportHub(true); setNavMode("library"); } }}
        onTracks={() => setShowTracksPanel(true)}
        onCustomize={() => { if (activeWing) setShowRoomManager(true); else setShowWingManager(true); }}
        onDismiss={() => setShowDiscoveryMenu(false)}
      />}

      {/* Era picker modal — for existing users who haven't chosen a style */}
      {showEraPicker && <div style={{position:"absolute",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(64,59,54,.6)",backdropFilter:"blur(0.375rem)"}} onClick={()=>setShowEraPicker(false)}>
        <div ref={eraPickerTrap.containerRef} role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={e=>{eraPickerTrap.handleKeyDown(e);if(e.key==="Escape")setShowEraPicker(false);}} onClick={e=>e.stopPropagation()} style={{background:T.color.linen,borderRadius:"1.25rem",padding:isMobile?"1.75rem 1.25rem":"2.25rem 2.5rem",maxWidth:"30rem",width:"90%",textAlign:"center",boxShadow:SHADOW[2]}}>
          <h2 style={{fontFamily:T.font.display,fontSize:isMobile?"1.375rem":"1.625rem",fontWeight:500,color:T.color.ink,marginBottom:"0.5rem"}}>{tPalace("eraPickerTitle")}</h2>
          <p style={{fontFamily:T.font.body,fontSize:"0.875rem",color:T.color.muted,marginBottom:"1.25rem"}}>{tPalace("eraPickerSubtitle")}</p>
          <div role="radiogroup" aria-label={tPalace("eraPickerTitle")} style={{display:"flex",gap:"0.75rem",marginBottom:"1.25rem"}}>
            {(["roman","renaissance"] as const).map(era=>(
              <button key={era} role="radio" aria-checked={styleEra===era} className="era-btn" onClick={async()=>{setStyleEra(era);await updateProfile({styleEra:era});setShowEraPicker(false);}}
                style={{flex:1,padding:"1rem 0.75rem",borderRadius:"0.875rem",border:`0.125rem solid ${era==="roman"?T.era.roman.secondary:T.era.renaissance.accent}40`,
                  background:T.color.linen,cursor:"pointer",transition:"all .2s"}}>
                <div style={{fontFamily:T.font.display,fontSize:"1.0625rem",fontWeight:600,color:T.color.ink,marginBottom:"0.25rem"}}>
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

      {/* Storage full prompt overlay — triggered when storage quota is exceeded */}
      {showUpgradePrompt && <div style={{position:"absolute",inset:0,zIndex:95,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(64,59,54,.55)",backdropFilter:"blur(0.25rem)"}}
        onClick={()=>setShowUpgradePrompt(false)}>
        <TuscanCard variant="elevated" padding="2rem 2.25rem" style={{maxWidth:"23.75rem",textAlign:"center",borderRadius:"1.125rem"}} animate>
          <div ref={upgradePromptTrap.containerRef} role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={e=>{upgradePromptTrap.handleKeyDown(e);if(e.key==="Escape")setShowUpgradePrompt(false);}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"2.5rem",marginBottom:"0.75rem"}}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" stroke={T.color.ember} strokeWidth="1.5"/><path d="M7 11V7a5 5 0 1 1 10 0v4" stroke={T.color.ember} strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1.5" fill={T.color.ember}/></svg></div>
            <h3 style={{fontFamily:T.font.display,fontSize:"1.375rem",fontWeight:500,color:T.color.ink,marginBottom:"0.5rem"}}>{tPalace("storageFull")}</h3>
            <p style={{fontFamily:T.font.body,fontSize:"0.875rem",color:T.color.muted,lineHeight:1.5,marginBottom:"1.25rem"}}>{(isNative() && !(isIOS() && IAP_ENABLED)) ? tPalace("storageFullDescNative") : tPalace("storageFullDesc")}</p>
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
              {/* Web always shows the upgrade CTA. iOS shows it only when IAP is
                  live (IAP_ENABLED), leading to the IAP paywall at /pricing.
                  Android has no IAP, so it stays hidden there. */}
              {(!isNative() || (isIOS() && IAP_ENABLED)) && <button onClick={()=>{setShowUpgradePrompt(false);navigateInApp("/pricing");}}
                style={{fontFamily:T.font.body,fontSize:"0.9375rem",fontWeight:600,padding:"0.75rem 2rem",borderRadius:"0.625rem",border:"none",
                  background:`linear-gradient(135deg,${T.color.ember},${T.color.rustDeep})`,color:T.color.cream,cursor:"pointer",width:"100%"}}>
                {tPalace("viewPlans")}
              </button>}
              <button onClick={()=>setShowUpgradePrompt(false)}
                style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:500,padding:"0.5rem",border:"none",
                  background:"none",color:T.color.muted,cursor:"pointer"}}>
                {tPalace("gotIt")}
              </button>
            </div>
          </div>
        </TuscanCard>
      </div>}



      {/* Achievement toast notification */}
      {achToast&&<div role="status" onClick={()=>{dismissAchToast();openAchWithHighlight(achToast.id);}} style={{position:"absolute",top:isMobile?"3.5rem":"4.125rem",right:isMobile?"max(0.75rem, env(safe-area-inset-right, 0.75rem))":"1.375rem",left:isMobile?"max(0.75rem, env(safe-area-inset-left, 0.75rem))":undefined,zIndex:90,cursor:"pointer",animation:reduceMotion?undefined:"fadeUp .4s ease",background:`${T.color.white}f5`,backdropFilter:"blur(0.75rem)",borderRadius:"1rem",padding:"0.875rem 1.125rem",border:`0.09375rem solid ${T.color.gold}66`,boxShadow:SHADOW[2],display:"flex",alignItems:"center",gap:"0.75rem",maxWidth:isMobile?undefined:"20rem"}}>
        <div style={{width:"2.75rem",height:"2.75rem",borderRadius:"0.75rem",background:`linear-gradient(135deg,${T.color.goldLight}22,${T.color.gold}22)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><AchievementIcon id={achToast.icon} size={24} /></div>
        <div>
          <div style={{fontFamily:T.font.body,fontSize:"0.625rem",fontWeight:600,color:T.color.goldLight,textTransform:"uppercase",letterSpacing:"0.0625rem",marginBottom:"0.125rem"}}>{tAch("achievementUnlocked")}</div>
          <div style={{fontFamily:T.font.display,fontSize:"0.9375rem",fontWeight:600,color:T.color.ink}}>{tAch(achToast.titleKey)}</div>
          <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,lineHeight:1.3}}>{tAch(achToast.descKey)}</div>
        </div>
      </div>}

      {showAchievements&&<Suspense fallback={lazyFallback}><AchievementsPanel onClose={()=>setShowAchievements(false)} highlightId={achHighlightId}/></Suspense>}

      {/* Invite & shared panels */}
      {showInvites&&<InviteNotificationsPanel onClose={()=>setShowInvites(false)}/>}
      {showSharedWithMe&&<SharedWithMePanel onClose={()=>setShowSharedWithMe(false)} onNavigateToRoom={(roomId,wingId)=>{setShowSharedWithMe(false);const resolvedWing=wingId||wingForRoom(roomId);setNavMode("3d");enterWingRoom(resolvedWing,roomId);}}/>}
      {showSharingSettings&&<SharingSettingsPanel open={showSharingSettings} onClose={()=>setShowSharingSettings(false)}/>}

      {/* Interview panels */}
      {showKepCapture&&<KepCapturePanel onClose={()=>setShowKepCapture(false)}/>}
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
      {selectedTrackId&&<TrackDetailPanel trackId={selectedTrackId} onClose={()=>setSelectedTrackId(null)} onNavigate={(target)=>{setShowTracksPanel(false);setSelectedTrackId(null);switch(target){case "library-import":setNavMode("library");setShowImportHub(true);break;case "library":setNavMode("library");break;case "upload":setNavMode("library");setShowImportHub(true);break;case "room":{const wing=activeWing||"roots";const prefix:{[k:string]:string}={roots:"ro",nest:"ne",craft:"cf",travel:"tv",passions:"pa"};setNavMode("3d");enterWingRoom(wing,activeRoomId||`${prefix[wing]||"ro"}1`);break;}case "corridor":{const wing=activeWing||"roots";setNavMode("3d");setTimeout(()=>enterCorridor(wing),600);break;}case "share":{if(activeRoomId){setShowSharing(true);}else{const wing=activeWing||"roots";const prefix:{[k:string]:string}={roots:"ro",nest:"ne",craft:"cf",travel:"tv",passions:"pa"};const roomId=`${prefix[wing]||"ro"}1`;setNavMode("3d");enterWingRoom(wing,roomId);setTimeout(()=>setShowSharing(true),600);}break;}case "wings":{setNavMode("3d");const wing=activeWing||"roots";setTimeout(()=>enterCorridor(wing),600);break;}case "entrance":setNavMode("3d");setTimeout(()=>enterEntrance(),300);break;case "interview":setShowInterviewPanel(true);break;case "legacy":setShowLegacyPanel(true);break;case "keps":setShowKepCapture(true);break;case "explore":window.location.href="/explore";break;case "settings":window.location.href="/settings";break;default:break;}}}/>}
      {showLegacyPanel&&<LegacyPanel onClose={()=>setShowLegacyPanel(false)}/>}

      {/* Track step completion toast */}
      {trackToast&&<div role="status" onClick={()=>{dismissTrackToast();setShowTracksPanel(true);}} style={{position:"absolute",top:isMobile?"6.25rem":"4.125rem",left:isMobile?"max(0.75rem, env(safe-area-inset-left, 0.75rem))":undefined,right:isMobile?"max(0.75rem, env(safe-area-inset-right, 0.75rem))":"1.375rem",zIndex:88,cursor:"pointer",animation:reduceMotion?undefined:"fadeUp .4s ease",background:`${T.color.white}f5`,backdropFilter:"blur(0.75rem)",borderRadius:"1rem",padding:"0.75rem 1rem",border:`0.09375rem solid ${T.color.sage}44`,boxShadow:SHADOW[2],display:"flex",alignItems:"center",gap:"0.75rem",maxWidth:isMobile?undefined:"21.25rem"}}>
        <div style={{width:"2.5rem",height:"2.5rem",borderRadius:"0.625rem",background:`linear-gradient(135deg,${T.color.sage}18,${T.color.sage}08)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.25rem",flexShrink:0}}>{"\u2713"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:T.font.body,fontSize:"0.625rem",fontWeight:600,color:T.color.sage,textTransform:"uppercase",letterSpacing:"0.0625rem",marginBottom:"0.0625rem"}}>{tTrack("stepCompleted")}</div>
          <div style={{fontFamily:T.font.display,fontSize:"0.875rem",fontWeight:600,color:T.color.ink}}>{tTrack(trackToast.stepTitleKey)}</div>
          <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted}}>{tTrack(trackToast.trackNameKey)}</div>
        </div>
        <div style={{fontFamily:T.font.body,fontSize:"0.875rem",fontWeight:700,color:T.color.goldLight}}>+{trackToast.points} MP</div>
      </div>}

      {/* Track completion celebration */}
      {trackCelebration&&<div onClick={dismissCelebration} style={{position:"fixed",inset:0,zIndex:95,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(64,59,54,.55)",backdropFilter:"blur(0.25rem)",animation:reduceMotion?undefined:"fadeIn .3s ease",cursor:"pointer"}}>
        <div ref={celebrationTrap.containerRef} role="dialog" aria-modal="true" tabIndex={-1} onKeyDown={e=>{celebrationTrap.handleKeyDown(e);if(e.key==="Escape")dismissCelebration();}} style={{background:T.color.linen,borderRadius:"1.5rem",padding:"2.5rem 3rem",textAlign:"center",maxWidth:"23.75rem",boxShadow:SHADOW[2],animation:reduceMotion?undefined:"fadeUp .5s ease",border:`0.125rem solid ${T.color.gold}44`}}>
          <div style={{fontSize:"3rem",marginBottom:"1rem"}}>{"\u2728"}</div>
          <div style={{fontFamily:T.font.display,fontSize:"1.75rem",fontWeight:600,color:T.color.ink,marginBottom:"0.5rem"}}>{tTrack("trackComplete")}</div>
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


