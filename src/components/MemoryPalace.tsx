"use client";
import { useEffect, useState, useCallback, useRef } from "react";
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
import TopBar from "@/components/ui/TopBar";
import { WingTooltip, DoorTooltip } from "@/components/ui/HoverTooltip";
import SearchBar from "@/components/ui/SearchBar";
import UploadPanel from "@/components/ui/UploadPanel";
import SharingPanel from "@/components/ui/SharingPanel";
import MemoryDetail from "@/components/ui/MemoryDetail";
import NavigationBar from "@/components/ui/NavigationBar";
import RoomManagerPanel from "@/components/ui/RoomManagerPanel";
import WingManagerPanel from "@/components/ui/WingManagerPanel";
import AchievementsPanel from "@/components/ui/AchievementsPanel";
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
import MemoryMap from "@/components/ui/MemoryMap";
import OnThisDay from "@/components/ui/OnThisDay";
import TimeCapsuleReveal from "@/components/ui/TimeCapsuleReveal";
import MemoryTimeline from "@/components/ui/MemoryTimeline";
import StatisticsPanel from "@/components/ui/StatisticsPanel";
import MassImportPanel from "@/components/ui/MassImportPanel";
import RoomGallery from "@/components/ui/RoomGallery";
import StoragePlayerPanel from "@/components/ui/StoragePlayerPanel";
import InviteNotificationsPanel from "@/components/ui/InviteNotificationsPanel";
import SharedWithMePanel from "@/components/ui/SharedWithMePanel";
import SharingSettingsPanel from "@/components/ui/SharingSettingsPanel";
import InterviewPanel from "@/components/ui/InterviewPanel";
import InterviewLibraryPanel from "@/components/ui/InterviewLibraryPanel";
import InterviewHistoryPanel from "@/components/ui/InterviewHistoryPanel";
import CorridorGalleryPanel, { loadCorridorPaintings, type CorridorPaintings } from "@/components/ui/CorridorGalleryPanel";
import TouchControlsOverlay from "@/components/ui/TouchControlsOverlay";
import MobileJoystick from "@/components/ui/MobileJoystick";
import ActionMenu from "@/components/ui/ActionMenu";
import type { ActionItem } from "@/components/ui/ActionMenu";
import StatusBar from "@/components/ui/StatusBar";
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
import BustBuilderPanel from "@/components/ui/BustBuilderPanel";
import LibraryView from "@/components/ui/LibraryView";
import HomeView from "@/components/ui/HomeView";
import UniversalActions from "@/components/ui/UniversalActions";
import { useActions } from "@/lib/hooks/useActions";
import { getWingsSharedWithMe, getSharedWingData, getSharedRoomMemories } from "@/lib/auth/sharing-actions";
import type { SharedWingDoor } from "@/components/3d/EntranceHallScene";

// ═══ MAIN — 4-level navigation: exterior → entrance → corridor → room ═══
export default function MemoryPalace(){
  const isMobile = useIsMobile();
  const { t: tTrack } = useTranslation("tracksPanel");
  const { t: tAch } = useTranslation("achievementsPanel");
  const { t: tAction } = useTranslation("actionMenu");
  const { daylightEnabled, daylightMode, resolvedHour } = useDaylight();
  // Key fragment for scene remounting when daylight mode changes manually
  const dlKey = daylightEnabled ? `dl_${daylightMode}${daylightMode !== "auto" ? "_" + resolvedHour : ""}` : "dl_off";

  // ── Stores ──
  const { profileLoading, onboarded, firstWing, styleEra, bustTextureUrl, bustModelUrl, bustProportions, userName, bustName, bustGender, bustPedestals,
    loadProfile, finishOnboarding, setStyleEra } = useUserStore();
  const { navMode, view, activeWing, activeRoomId, hovWing, hovDoor, opacity, portalAnim, roomLayouts,
    setNavMode, setHovWing, setHovDoor, enterWing, enterEntrance, enterCorridor, enterRoom, setRoomLayout, exitToPalace, exitToCorridor, exitToEntrance } = usePalaceStore();
  const { selMem, showUpload, showSharing, showDirectory, searchQuery, filterType,
    setSelMem, setShowUpload, setShowSharing, setShowDirectory, setSearchQuery, setFilterType } = useMemoryStore();
  const { getWingRooms, customRooms } = useRoomStore();
  const { toast: achToast, showPanel: showAchievements, setShowPanel: setShowAchievements,
    checkAchievements, dismissToast: dismissAchToast, trackWingVisit, trackRoomVisit, getProgress,
    visitedWings } = useAchievementStore();
  const { showTracksPanel, selectedTrackId, showLegacyPanel,
    toast: trackToast, celebration: trackCelebration,
    setShowTracksPanel, setSelectedTrackId, setShowLegacyPanel,
    dismissToast: dismissTrackToast, dismissCelebration,
    loadProgress: loadTrackProgress, runProgressCheck, hasUsedMassImport, legacyReviewed } = useTrackStore();
  const {
    showMemoryMap, setShowMemoryMap,
    showTimeline, setShowTimeline,
    showMassImport, setShowMassImport,
    showGallery, setShowGallery,
    showBustBuilder, setShowBustBuilder,
    showInvites, setShowInvites,
    showSharedWithMe, setShowSharedWithMe,
    showSharingSettings, setShowSharingSettings,
    showCorridorGallery, setShowCorridorGallery,
    showEraPicker, setShowEraPicker,
    showUpgradePrompt, setShowUpgradePrompt,
    showRoomManager, setShowRoomManager,
    showRoomShare, setShowRoomShare,
    showStoragePlayer, setShowStoragePlayer,
    showWingManager, setShowWingManager,
    showStatistics, setShowStatistics,
  } = useUIPanelStore();
  const [bustBuilderIndex, setBustBuilderIndex] = useState(0);
  const [sharedWings, setSharedWings] = useState<SharedWingDoor[]>([]);
  const [sharedContext, setSharedContext] = useState<{
    shareId: string;
    wingSlug: string;
    ownerId: string;
    ownerName: string;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
  } | null>(null);
  const [sharedWingData, setSharedWingData] = useState<{ wing: any; rooms: any[] } | null>(null);
  const [corridorPaintings, setCorridorPaintings] = useState<CorridorPaintings>({});
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const { isActive: walkthroughActive, showDiscoveryMenu, setShowDiscoveryMenu } = useWalkthroughStore();
  const walkthroughStart = useWalkthroughStore((s) => s.start);
  const walkthroughCompleted = useWalkthroughStore((s) => s.completed);
  const walkthroughPhase = useWalkthroughStore((s) => s.phase);
  const walkthroughTargetWing = useWalkthroughStore((s) => s.targetWing);
  const walkthroughTargetRoom = useWalkthroughStore((s) => s.targetRoom);
  const [sceneLoading, setSceneLoading] = useState(true);
  const [searchBarVisible, setSearchBarVisible] = useState(true);
  const searchHideTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const { showLibrary: showInterviewLibrary, showHistory: showInterviewHistory, showInterview,
    setShowLibrary: setShowInterviewLibrary, setShowHistory: setShowInterviewHistory,
    setShowInterview: setShowInterviewPanel } = useInterviewStore();

  // ── Hint bars — show only on first 3 visits ──
  const [showHints, setShowHints] = useState(false);
  useEffect(() => {
    try {
      const count = parseInt(localStorage.getItem("mp_hint_visits") || "0", 10);
      if (count < 3) {
        setShowHints(true);
        localStorage.setItem("mp_hint_visits", String(count + 1));
      }
    } catch { /* ignore localStorage errors */ }
  }, []);

  // ── Tutorial ──
  const { active: tutorialActive, completed: tutorialCompleted, start: startTutorial } = useTutorialStore();

  // ── Hooks ──
  const { wingData, hovWingData, activeRoomData, crumbs, handleMemClick, allWings } = useNavigation();
  const { roomMems, allRoomMems, roomMemsKey, handleAddMemory, addMemoryToRoom, handleUpdateMemory, handleDeleteMemory, currentSharing, updateSharing } = useRoomMemories();

  // ── Universal Actions (available in all modes) ──
  const actionGroups = useActions({
    onTimeline: () => { setShowTools(false); setShowTimeline(true); },
    onMemoryMap: () => { setShowTools(false); setShowMemoryMap(true); },
    onInterviews: () => { setShowTools(false); setShowInterviewLibrary(true); },
    onMassImport: () => { setShowTools(false); setShowMassImport(true); },
    onTracks: () => { setShowTools(false); setShowTracksPanel(true); },
    onAchievements: () => { setShowTools(false); setShowAchievements(true); },
    onSharingSettings: () => { setShowTools(false); setShowSharingSettings(true); },
    onWingManager: () => { setShowTools(false); setShowWingManager(true); },
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
          ownerName: s.owner_name || "Someone",
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

  // ── Scene loading overlay — show on view transitions, fade out after scene builds ──
  useEffect(() => {
    setSceneLoading(true);
    const t = setTimeout(() => setSceneLoading(false), 1400);
    return () => clearTimeout(t);
  }, [view]);

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
      setSharedContext(null);
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

  // Auto-start tutorial on first entrance-hall visit — but NOT right after onboarding
  // (users who just onboarded go straight to their first room instead)
  useEffect(() => {
    if (view === "entrance" && !tutorialCompleted && !tutorialActive) {
      if (justOnboardedRef.current) {
        justOnboardedRef.current = false;
        return; // Skip — they're navigating to their first room
      }
      const t = setTimeout(startTutorial, 1200);
      return () => clearTimeout(t);
    }
  }, [view, tutorialCompleted, tutorialActive, startTutorial]);

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
    // Start cinematic walkthrough — user walks themselves, system narrates
    if(firstWing) {
      const rooms = getWingRooms(firstWing);
      const firstRoom = rooms[0];
      walkthroughStart(firstWing, firstRoom?.id || "");
      // View stays at "exterior" — user sees the palace from outside first
    }
    // Do NOT show feature spotlight immediately — defer to second visit
  };

  if(profileLoading){
    return(<div style={{width:"100vw",height:"100dvh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:`linear-gradient(165deg,${T.color.linen} 0%,${T.color.warmStone} 50%,${T.color.sandstone} 100%)`,fontFamily:T.font.display}}>
      <div style={{marginBottom:20}}><PalaceLogo variant="mark" color="dark" size="lg" /></div>
      <div style={{fontSize:isMobile?22:28,fontWeight:300,color:T.color.charcoal}}>The Memory Palace</div>
      <div style={{fontSize:14,color:T.color.muted,marginTop:12,fontFamily:T.font.body}}>Loading your palace...</div>
    </div>);
  }

  if(!onboarded) return <OnboardingWizard onFinish={handleFinishOnboarding}/>;

  const hovDoorRoom=hovDoor&&activeWing?getWingRooms(activeWing).find(r=>r.id===hovDoor)??null:null;

  // Close more menu when navigating
  const closeMore = () => setMoreMenuOpen(false);

  // ── Mobile bottom bar configuration ──
  const bottomBarHeight = isMobile ? 64 : 0;
  const safeBottom = isMobile ? bottomBarHeight + 8 : 70;

  /* ── Shared panel overlays — rendered in ALL modes (atrium, library, 3D) ── */
  const sharedPanelOverlays = (<>
    {showTimeline&&<MemoryTimeline onClose={()=>setShowTimeline(false)}/>}
    {showStatistics&&<StatisticsPanel onClose={()=>setShowStatistics(false)}/>}
    {showMemoryMap&&<MemoryMap userMems={userMems} onClose={()=>setShowMemoryMap(false)} onNavigate={(roomId)=>{setShowMemoryMap(false);const wingId=roomId.startsWith("fr")?"family":roomId.startsWith("tr")?"travel":roomId.startsWith("cr")?"childhood":roomId.startsWith("kr")?"career":roomId.startsWith("rr")?"creativity":"family";enterWing(wingId);setTimeout(()=>enterRoom(roomId),300);}}/>}
    {showMassImport&&<MassImportPanel onClose={()=>setShowMassImport(false)} initialWingId={activeWing} initialRoomId={activeRoomId}/>}
    {showAchievements&&<AchievementsPanel onClose={()=>setShowAchievements(false)}/>}
    {showTracksPanel&&!selectedTrackId&&<TracksPanel onClose={()=>setShowTracksPanel(false)}/>}
    {selectedTrackId&&<TrackDetailPanel trackId={selectedTrackId} onClose={()=>setSelectedTrackId(null)} onNavigate={(target)=>{setShowTracksPanel(false);setSelectedTrackId(null);}}/>}
    {showInterviewLibrary&&<InterviewLibraryPanel onClose={()=>setShowInterviewLibrary(false)} highlightWingId={activeWing}/>}
    {showInterviewHistory&&<InterviewHistoryPanel onClose={()=>setShowInterviewHistory(false)}/>}
    {showInterview&&<InterviewPanel onClose={()=>{setShowInterviewPanel(false);markChecklistItem("complete_interview");}} onCreateMemory={(mem, wingId)=>{
      const targetWing = wingId === "general" ? "family" : wingId;
      const prefix = {family:"fr",travel:"tr",childhood:"cr",career:"kr",creativity:"rr"}[targetWing]||"fr";
      const roomId = `${prefix}1`;
      addMemoryToRoom(roomId, mem);
    }}/>}
    {showLegacyPanel&&<LegacyPanel onClose={()=>setShowLegacyPanel(false)}/>}
  </>);

  // ── Home mode: render Home dashboard ──
  if (navMode === "atrium" && !walkthroughActive) {
    return (<>
      <NavigationBar currentMode="atrium" onModeChange={(mode) => setNavMode(mode as any)} isMobile={isMobile} userName={userName} onToolsClick={() => setShowTools(!showTools)} toolsOpen={showTools} />
      <UniversalActions groups={actionGroups} open={showTools} onClose={() => setShowTools(false)} isMobile={isMobile} />
      <HomeView />
      {sharedPanelOverlays}
    </>);
  }

  // ── Library mode: render Library view instead of 3D (skip during walkthrough) ──
  if (navMode === "library" && !walkthroughActive) {
    return (<>
      <NavigationBar currentMode="library" onModeChange={(mode) => setNavMode(mode as any)} isMobile={isMobile} userName={userName} onToolsClick={() => setShowTools(!showTools)} toolsOpen={showTools} />
      <UniversalActions groups={actionGroups} open={showTools} onClose={() => setShowTools(false)} isMobile={isMobile} />
      <LibraryView />
      {sharedPanelOverlays}
    </>);
  }

  return(
    <div style={{width:"100vw",height:"100dvh",background:T.color.sandstone,position:"relative",overflow:"hidden"}}>
      <style>{`*{box-sizing:border-box;margin:0}@keyframes sceneLoadFadeOut{0%{opacity:1}70%{opacity:1}100%{opacity:0}}@keyframes sceneLoadPulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
      <div role="application" aria-label="3D Memory Palace interactive scene" style={{position:"absolute",inset:0,opacity,transition:"opacity 0.4s ease"}}>
        {view==="exterior"&&<ExteriorScene key={dlKey} onRoomHover={setHovWing} onRoomClick={(wingId: string)=>{if(walkthroughActive&&wingId!=="__entrance__")return;if(wingId==="__entrance__"){enterEntrance();}else{enterCorridor(wingId);}}} hoveredRoom={hovWing} wings={allWings} highlightDoor={walkthroughActive&&walkthroughPhase===0?"__entrance__":null} styleEra={styleEra||"roman"}/>}
        {view==="entrance"&&<EntranceHallScene key={dlKey} onDoorClick={(wingId: string)=>{if(walkthroughActive&&walkthroughPhase<=2&&wingId!=="__exterior__"&&wingId!==walkthroughTargetWing)return;if(wingId==="__exterior__")exitToPalace();else if(wingId==="attic")setShowStoragePlayer(true);else if(wingId.startsWith("locked"))setShowUpgradePrompt(true);else if(wingId.startsWith("shared:")){const [,slug,shareId]=wingId.split(":");const shareInfo=sharedWings.find(sw=>sw.shareId===shareId);if(shareInfo){setSharedContext({shareId,wingSlug:slug,ownerId:shareInfo.ownerId||"",ownerName:shareInfo.ownerName||"Unknown",canAdd:shareInfo.canAdd??false,canEdit:shareInfo.canEdit??false,canDelete:shareInfo.canDelete??false});getSharedWingData(shareId).then(result=>{if(result.wing&&result.rooms){setSharedWingData(result);enterCorridor(wingId);}});}}else enterCorridor(wingId);}} wings={allWings} sharedWings={sharedWings} highlightDoor={walkthroughActive&&walkthroughPhase===2?walkthroughTargetWing:null} styleEra={styleEra||"roman"} onInlayClick={()=>setShowUpgradePrompt(true)} onBustClick={(idx: number)=>{setBustBuilderIndex(idx);setShowBustBuilder(true);}} bustPedestals={bustPedestals} bustTextureUrl={bustTextureUrl} bustModelUrl={bustModelUrl} bustProportions={bustProportions} bustName={bustName || userName || null} bustGender={bustGender || null}/>}
        {view==="corridor"&&activeWing&&activeWing.startsWith("shared:")&&sharedWingData?<CorridorScene key={dlKey+"|"+activeWing+"|"+JSON.stringify(sharedWingData.rooms.map((r: any)=>r.id+r.name+(r.icon||"")))+"|"+(sharedWingData.wing.accentColor||"#7AA0C8")+"|"+(styleEra||"roman")} wingId={activeWing} rooms={sharedWingData.rooms.map((r: any)=>({id:r.id,name:r.name,icon:r.icon||"\uD83D\uDCC1",shared:false,sharedWith:[],coverHue:30}))} onDoorHover={setHovDoor} onDoorClick={(roomId: string)=>{enterRoom(roomId);}} hoveredDoor={hovDoor} wingData={{id:sharedWingData.wing.slug,name:sharedWingData.wing.customName||sharedWingData.wing.slug,nameKey:sharedWingData.wing.slug,icon:"\uD83C\uDFDB\uFE0F",accent:sharedWingData.wing.accentColor||"#7AA0C8",wall:"#DDD4C6",floor:"#9E8264",desc:"Shared wing",descKey:"sharedWing",layout:"L-shaped gallery"}} corridorPaintings={{}} styleEra={styleEra||"roman"} onInlayClick={()=>setShowUpgradePrompt(true)} onPaintingClick={()=>setShowCorridorGallery(true)}/>:view==="corridor"&&activeWing&&wingData&&<CorridorScene key={dlKey+"|"+activeWing+"|"+JSON.stringify(getWingRooms(activeWing).map(r=>r.id+r.name+r.icon))+"|"+wingData.accent+"|"+JSON.stringify(corridorPaintings)+"|"+(styleEra||"roman")} wingId={activeWing} rooms={getWingRooms(activeWing)} onDoorHover={setHovDoor} onDoorClick={(roomId: string)=>{if(walkthroughActive&&walkthroughPhase===3&&roomId!==walkthroughTargetRoom)return;enterRoom(roomId);}} hoveredDoor={hovDoor} wingData={wingData} corridorPaintings={corridorPaintings} highlightDoor={walkthroughActive&&walkthroughPhase===3?walkthroughTargetRoom:null} styleEra={styleEra||"roman"} onInlayClick={()=>setShowUpgradePrompt(true)} onPaintingClick={()=>setShowCorridorGallery(true)}/>}
        {view==="room"&&activeWing&&activeRoomId&&<InteriorScene key={dlKey+"|"+roomMemsKey+"|"+(roomLayouts[activeRoomId]||"")+"|"+(styleEra||"roman")} roomId={activeWing} actualRoomId={activeRoomId} layoutOverride={roomLayouts[activeRoomId]} memories={roomMems} onMemoryClick={handleMemClick} wingData={wingData||undefined} styleEra={styleEra||"roman"}/>}
      </div>

      {/* Scene loading overlay — fades out after 3D canvas initializes */}
      {sceneLoading&&<div key={view} style={{position:"absolute",inset:0,zIndex:40,display:"flex",alignItems:"center",justifyContent:"center",background:T.color.warmStone,animation:"sceneLoadFadeOut 1.4s ease-in-out forwards",pointerEvents:"none"}}><span style={{fontFamily:T.font.display,fontSize:"1.3rem",color:T.color.walnut,letterSpacing:"0.04em",animation:"sceneLoadPulse 1.2s ease-in-out infinite"}}>Loading...</span></div>}

      {!walkthroughActive && <TopBar crumbs={crumbs} sharedWings={sharedWings} onNavigateSharedWing={(shareId, wingSlug) => {
        const shareInfo = sharedWings.find(sw => sw.shareId === shareId);
        if (shareInfo) {
          setSharedContext({ shareId, wingSlug, ownerId: shareInfo.ownerId, ownerName: shareInfo.ownerName, canAdd: (shareInfo as any).canAdd ?? false, canEdit: (shareInfo as any).canEdit ?? false, canDelete: (shareInfo as any).canDelete ?? false });
          getSharedWingData(shareId).then(result => { if (result.wing && result.rooms) { setSharedWingData(result); enterCorridor(`shared:${wingSlug}:${shareId}`); } });
        }
      }} onSharingSettings={() => setShowSharingSettings(true)} />}

      {/* NavigationBar — mode switcher (atrium / library / 3D) */}
      <NavigationBar
        currentMode="3d"
        onModeChange={(mode) => setNavMode(mode as any)}
        isMobile={isMobile}
        userName={userName}
        hidden={!!selMem || showUpload || showSharing || walkthroughActive}
        onToolsClick={() => setShowTools(!showTools)}
        toolsOpen={showTools}
      />
      <UniversalActions groups={actionGroups} open={showTools} onClose={() => setShowTools(false)} isMobile={isMobile} />

      {/* Portal transition overlay */}
      {portalAnim&&<div style={{position:"absolute",inset:0,zIndex:45,pointerEvents:"none",animation:"portalFlash .5s ease both",background:"radial-gradient(ellipse at center,rgba(200,168,104,.6) 0%,rgba(200,168,104,.15) 40%,transparent 70%)"}}/>}



      {/* Hover tooltips — desktop only */}
      {!isMobile && hovWingData&&view==="exterior"&&<WingTooltip wing={hovWingData}/>}
      {!isMobile && hovDoorRoom&&view==="corridor"&&<DoorTooltip room={hovDoorRoom} wingAccent={wingData?.accent}/>}

      {/* Bottom hints — hide on mobile (touch controls are self-explanatory), only show first 3 visits */}
      {showHints && !isMobile && !walkthroughActive && view==="exterior"&&!hovWing&&<div style={{position:"absolute",bottom:22,left:"50%",transform:"translateX(-50%)",animation:"fadeIn .8s ease .8s both",fontFamily:T.font.body,fontSize:13,color:T.color.muted,background:`${T.color.white}cc`,backdropFilter:"blur(8px)",padding:"7px 18px",borderRadius:16,border:`1px solid ${T.color.cream}`}}>Drag to orbit · Scroll to zoom · Click a wing to enter</div>}
      {showHints && !isMobile && !walkthroughActive && view==="entrance"&&<div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",fontFamily:T.font.body,fontSize:13,color:T.color.muted,background:`${T.color.white}cc`,backdropFilter:"blur(10px)",padding:"7px 18px",borderRadius:16,border:`1px solid ${T.color.cream}`,animation:"fadeIn .6s ease .3s both",display:"flex",gap:14}}><span>WASD / Arrow keys to walk</span><span style={{color:T.color.sandstone}}>|</span><span>Drag to look</span><span style={{color:T.color.sandstone}}>|</span><span>Click a door to enter a wing</span></div>}
      {showHints && !isMobile && !walkthroughActive && view==="corridor"&&<div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",fontFamily:T.font.body,fontSize:13,color:T.color.muted,background:`${T.color.white}cc`,backdropFilter:"blur(10px)",padding:"7px 18px",borderRadius:16,border:`1px solid ${T.color.cream}`,animation:"fadeIn .6s ease .3s both",display:"flex",gap:14}}><span>WASD / Arrow keys to walk</span><span style={{color:T.color.sandstone}}>|</span><span>Drag to look</span><span style={{color:T.color.sandstone}}>|</span><span>Click a door to enter room</span></div>}
      {showHints && !isMobile && !walkthroughActive && view==="room"&&<div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",fontFamily:T.font.body,fontSize:13,color:T.color.muted,background:`${T.color.white}cc`,backdropFilter:"blur(10px)",padding:"7px 18px",borderRadius:16,border:`1px solid ${T.color.cream}`,animation:"fadeIn .6s ease .3s both",display:"flex",gap:14}}><span>Drag to look</span><span style={{color:T.color.sandstone}}>|</span><span>WASD / Arrow keys to walk</span><span style={{color:T.color.sandstone}}>|</span><span>Click memories</span></div>}

      {/* Search bar + room info (room view) — search auto-hides after 3s */}
      {!walkthroughActive&&view==="room"&&activeRoomData&&activeRoomId&&<>
        <div onClick={revealSearchBar} onMouseMove={revealSearchBar} style={{
          opacity: searchBarVisible ? 1 : 0, transform: searchBarVisible ? "translateY(0)" : "translateY(-8px)",
          transition: "opacity .3s ease, transform .3s ease", pointerEvents: searchBarVisible ? "auto" : "none",
        }}>
          <SearchBar query={searchQuery} filterType={filterType} totalCount={allRoomMems.length} filteredCount={roomMems.length} accent={wingData?.accent} onQueryChange={(q)=>{setSearchQuery(q);revealSearchBar();}} onFilterChange={(f)=>{setFilterType(f);revealSearchBar();}}/>
        </div>
        {/* Tap zone to reveal search when hidden */}
        {!searchBarVisible && <div onClick={revealSearchBar} style={{position:"absolute",top:0,left:0,right:0,height:54,zIndex:29,cursor:"pointer"}} />}
        {!isMobile && (()=>{const rs=currentSharing(activeRoomId);return <div style={{position:"absolute",top:58,right:18,zIndex:30,animation:"fadeIn .5s ease .4s both",display:"flex",gap:6,alignItems:"center"}}>
          {/* Compact room info strip */}
          <div style={{background:`${T.color.white}e6`,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:16,padding:"6px 12px",border:`1px solid ${T.color.cream}`,display:"flex",alignItems:"center",gap:6,boxShadow:"0 2px 12px rgba(44,44,42,.06)"}}>
            <span style={{fontSize:14}}>{activeRoomData.icon}</span>
            <span style={{fontFamily:T.font.display,fontSize:13,fontWeight:500,color:T.color.charcoal}}>{activeRoomData.name}</span>
            <span style={{fontFamily:T.font.body,fontSize:10,color:T.color.muted}}>{allRoomMems.length}</span>
            <div style={{width:1,height:14,background:T.color.cream}} />
            <select value={roomLayouts[activeRoomId]||""} onChange={e=>setRoomLayout(activeRoomId,e.target.value)} style={{background:"transparent",border:"none",fontFamily:T.font.body,fontSize:11,color:T.color.walnut,cursor:"pointer",outline:"none",padding:"2px 0"}}>
              <option value="">{tAction("auto")}</option>
              {ROOM_LAYOUTS.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <div style={{width:1,height:14,background:T.color.cream}} />
            <button onClick={()=>setShowSharing(true)} style={{background:"transparent",border:"none",display:"flex",alignItems:"center",gap:4,cursor:"pointer",padding:"2px 4px"}}>
              {rs.shared?<><div style={{width:6,height:6,borderRadius:3,background:"#4A6741"}}/><span style={{fontFamily:T.font.body,fontSize:10,color:"#4A6741",fontWeight:500}}>{tAction("shareStatus")}</span></>
              :<span style={{fontFamily:T.font.body,fontSize:10,color:T.color.muted}}>{tAction("shareAction")}</span>}
            </button>
            <button onClick={()=>setShowRoomShare(true)} title={tAction("shareAsCard")} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,lineHeight:1,padding:"2px 2px",display:"flex",alignItems:"center"}}>
              {"\uD83D\uDCE4"}
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

      {/* ═══ DESKTOP ACTION MENU ═══ */}
      {!isMobile && !walkthroughActive && (()=>{
        if (view==="exterior"||view==="entrance") {
          return <ActionMenu
            accent={T.color.terracotta}
            primary={{ icon: "\uD83D\uDCC5", label: tAction("timeline"), action: ()=>setShowTimeline(true) }}
            secondary={[
              { icon: "\uD83C\uDF0D", label: tAction("memoryMap"), action: ()=>setShowMemoryMap(true), hidden: showMemoryMap },
              { icon: "\uD83C\uDF99\uFE0F", label: tAction("lifeInterviews"), action: ()=>setShowInterviewLibrary(true) },
              { icon: "\u{1F4E6}", label: tAction("massImport"), action: ()=>setShowMassImport(true) },
              { icon: "\u{1F91D}", label: tAction("manageShares"), action: ()=>setShowSharingSettings(true) },
              { icon: "\u2699\uFE0F", label: tAction("customizeWings"), action: ()=>setShowWingManager(true) },
            ]}
          />;
        }
        if (view==="corridor"&&activeWing) {
          return <ActionMenu
            accent={wingData?.accent||T.color.terracotta}
            primary={{ icon: "\u{1F5BC}\uFE0F", label: tAction("corridorGallery"), action: ()=>setShowCorridorGallery(true) }}
            secondary={[
              { icon: "\u{1F527}", label: tAction("manageRooms"), action: ()=>setShowRoomManager(true) },
              { icon: "\uD83C\uDF0D", label: tAction("memoryMap"), action: ()=>setShowMemoryMap(true), hidden: showMemoryMap },
              { icon: "\uD83C\uDF99\uFE0F", label: tAction("lifeInterviews"), action: ()=>setShowInterviewLibrary(true) },
            ]}
          />;
        }
        if (view==="room"&&activeRoomId&&!showUpload&&!showSharing&&!selMem) {
          return <ActionMenu
            accent={wingData?.accent||T.color.terracotta}
            primary={{ icon: "+", label: tAction("addMemory"), action: ()=>setShowUpload(true) }}
            secondary={[
              { icon: "\u{1F5BC}\uFE0F", label: tAction("gallery"), action: ()=>setShowGallery(true), hidden: allRoomMems.length===0 },
              { icon: "\u{1F91D}", label: tAction("shareRoom"), action: ()=>setShowSharing(true) },
              { icon: "\u{1F4E6}", label: tAction("massImport"), action: ()=>setShowMassImport(true) },
              { icon: "\u{1F399}\uFE0F", label: tAction("lifeInterviews"), action: ()=>setShowInterviewLibrary(true) },
            ]}
          />;
        }
        return null;
      })()}

      {/* Touch controls tutorial — mobile only, one-time */}
      {isMobile && <TouchControlsOverlay view={view} />}

      {/* Visible mobile joystick — room, corridor & entrance views */}
      {isMobile && (view === "room" || view === "corridor" || view === "entrance") && (
        <MobileJoystick
          visible={!selMem && !showUpload && !showSharing && !moreMenuOpen}
          onMove={() => {}}
        />
      )}

      {/* ═══ MOBILE BOTTOM ACTION BAR ═══ */}
      {isMobile && !walkthroughActive && <MobileBottomBar
        view={view}
        activeWing={activeWing}
        activeRoomId={activeRoomId}
        allRoomMems={allRoomMems}
        showUpload={showUpload}
        showSharing={showSharing}
        selMem={selMem}
        wingData={wingData}
        moreMenuOpen={moreMenuOpen}
        onToggleMore={() => setMoreMenuOpen(!moreMenuOpen)}
        onCloseMore={closeMore}
        onUpload={() => { closeMore(); setShowUpload(true); }}
        onAchievements={() => { closeMore(); setShowAchievements(true); }}
        onMassImport={() => { closeMore(); setShowMassImport(true); }}
        onTimeline={() => { closeMore(); setShowTimeline(true); }}
        onMemoryMap={() => { closeMore(); setShowMemoryMap(true); }}
        onWingManager={() => { closeMore(); setShowWingManager(true); }}
        onRoomManager={() => { closeMore(); setShowRoomManager(true); }}
        onGallery={() => { closeMore(); setShowGallery(true); }}
        onCorridorGallery={() => { closeMore(); setShowCorridorGallery(true); }}
        onShare={() => { closeMore(); setShowSharing(true); }}
        onTracks={() => { closeMore(); setShowTracksPanel(true); }}
        onInvites={() => { closeMore(); setShowInvites(true); }}
        onSharedWithMe={() => { closeMore(); setShowSharedWithMe(true); }}
        onSharingSettings={() => { closeMore(); setShowSharingSettings(true); }}
        onInterviews={() => { closeMore(); setShowInterviewLibrary(true); }}
        getProgress={getProgress}
        onBack={() => { closeMore(); view === "room" ? exitToCorridor() : view === "corridor" ? exitToEntrance() : exitToPalace(); }}
      />}

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
      {showTimeline&&<MemoryTimeline onClose={()=>setShowTimeline(false)}/>}
      {showStatistics&&<StatisticsPanel onClose={()=>setShowStatistics(false)}/>}
      {showMemoryMap&&<MemoryMap userMems={userMems} onClose={()=>setShowMemoryMap(false)} onNavigate={(roomId)=>{setShowMemoryMap(false);const wingId=roomId.startsWith("fr")?"family":roomId.startsWith("tr")?"travel":roomId.startsWith("cr")?"childhood":roomId.startsWith("kr")?"career":roomId.startsWith("rr")?"creativity":"family";enterWing(wingId);setTimeout(()=>enterRoom(roomId),300);}}/>}
      {showMassImport&&<MassImportPanel onClose={()=>setShowMassImport(false)} initialWingId={activeWing} initialRoomId={activeRoomId}/>}
      {showGallery&&activeRoomId&&<RoomGallery mems={allRoomMems} wing={wingData} room={activeRoomData} onClose={()=>setShowGallery(false)} onUpdate={handleUpdateMemory} onSelect={(mem)=>{setShowGallery(false);setSelMem(mem);}}/>}
      {showCorridorGallery&&activeWing&&wingData&&<CorridorGalleryPanel wing={wingData} rooms={getWingRooms(activeWing)} onClose={()=>setShowCorridorGallery(false)} onPaintingsChange={setCorridorPaintings} currentPaintings={corridorPaintings}/>}
      {showStoragePlayer&&<StoragePlayerPanel onClose={()=>setShowStoragePlayer(false)}/>}

      {/* Status bar — desktop only: achievements + tracks + points in one strip */}
      {!isMobile && !walkthroughActive && (()=>{const p=getProgress();return <StatusBar
        earned={p.earned} total={p.total} percentage={p.percentage}
        onAchievements={()=>setShowAchievements(true)}
        onTracks={()=>setShowTracksPanel(true)}
        pointsElement={<PointsDisplay onClick={()=>setShowTracksPanel(true)} />}
      />;})()}

      {/* Tutorial overlay */}
      <TutorialOverlay />

      {/* Feature spotlight — shown once after onboarding completes */}
      {showSpotlight && !tutorialActive && !walkthroughActive && <FeatureSpotlight
        onImport={() => { setShowSpotlight(false); setShowMassImport(true); }}
        onInterview={() => { setShowSpotlight(false); setShowInterviewLibrary(true); }}
        onTimeCapsule={() => { setShowSpotlight(false); /* Navigate to a room to create time capsule */ }}
        onShare={() => { setShowSpotlight(false); if (activeRoomId) setShowSharing(true); }}
      />}

      {/* Getting Started checklist — first 7 days, shown in all views */}
      {!tutorialActive && !showSpotlight && !walkthroughActive && !showUpload && !selMem && <GettingStartedChecklist
        onUpload={() => { if (activeRoomId) setShowUpload(true); else setShowMassImport(true); }}
        onInterview={() => setShowInterviewLibrary(true)}
        onCustomize={() => { if (activeWing) setShowRoomManager(true); else setShowWingManager(true); }}
        onShare={() => { if (activeRoomId) setShowSharing(true); }}
      />}

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
      {showEraPicker && <div style={{position:"absolute",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(44,44,42,.6)",backdropFilter:"blur(6px)"}}>
        <div style={{background:T.color.linen,borderRadius:20,padding:isMobile?"28px 20px":"36px 40px",maxWidth:480,width:"90%",textAlign:"center",boxShadow:"0 12px 48px rgba(0,0,0,.2)"}}>
          <h2 style={{fontFamily:T.font.display,fontSize:isMobile?22:26,fontWeight:400,color:T.color.charcoal,marginBottom:8}}>Choose Your Palace Style</h2>
          <p style={{fontFamily:T.font.body,fontSize:14,color:T.color.muted,marginBottom:20}}>Pick a historic era for your palace architecture.</p>
          <div style={{display:"flex",gap:12,marginBottom:20}}>
            {(["roman","renaissance"] as const).map(era=>(
              <button key={era} onClick={async()=>{setStyleEra(era);await updateProfile({styleEra:era});setShowEraPicker(false);}}
                style={{flex:1,padding:"16px 12px",borderRadius:14,border:`2px solid ${era==="roman"?T.era.roman.secondary:T.era.renaissance.accent}40`,
                  background:T.color.linen,cursor:"pointer",transition:"all .2s"}}>
                <div style={{fontFamily:T.font.display,fontSize:17,fontWeight:600,color:T.color.charcoal,marginBottom:4}}>
                  {era==="roman"?"Republican Rome":"Renaissance Florence"}
                </div>
                <div style={{fontFamily:T.font.body,fontSize:12,color:T.color.muted,lineHeight:1.4}}>
                  {era==="roman"?"Marble atriums, colonnaded gardens, mosaic floors":"Frescoed galleries, coffered ceilings, grand courtyards"}
                </div>
              </button>
            ))}
          </div>
          <button onClick={async()=>{setStyleEra("roman");await updateProfile({styleEra:"roman"});setShowEraPicker(false);}}
            style={{fontFamily:T.font.body,fontSize:13,color:T.color.muted,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
            Skip (default: Roman)
          </button>
        </div>
      </div>}

      {/* Upgrade prompt overlay — triggered by clicking locked inlays */}
      {showUpgradePrompt && <div style={{position:"absolute",inset:0,zIndex:95,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(44,44,42,.5)",backdropFilter:"blur(4px)"}}
        onClick={()=>setShowUpgradePrompt(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:T.color.linen,borderRadius:18,padding:"32px 36px",maxWidth:380,textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,.18)"}}>
          <div style={{fontSize:40,marginBottom:12}}>{"🔒"}</div>
          <h3 style={{fontFamily:T.font.display,fontSize:22,fontWeight:500,color:T.color.charcoal,marginBottom:8}}>{view==="entrance"?"Locked Wing":"Locked Room"}</h3>
          <p style={{fontFamily:T.font.body,fontSize:14,color:T.color.muted,lineHeight:1.5,marginBottom:20}}>{view==="entrance"?"Upgrade to unlock additional wings in your palace.":"Upgrade to unlock additional rooms in this wing."}</p>
          <button onClick={()=>setShowUpgradePrompt(false)}
            style={{fontFamily:T.font.body,fontSize:15,fontWeight:600,padding:"12px 32px",borderRadius:10,border:"none",
              background:`linear-gradient(135deg,${T.color.terracotta},${T.color.walnut})`,color:"#FFF",cursor:"pointer"}}>
            Got it
          </button>
        </div>
      </div>}

      {/* Bust builder panel */}
      {showBustBuilder && <BustBuilderPanel pedestalIndex={bustBuilderIndex} onClose={() => setShowBustBuilder(false)} />}

      {/* Achievement toast notification */}
      {achToast&&<div role="status" onClick={()=>{dismissAchToast();setShowAchievements(true);}} style={{position:"absolute",top:isMobile?"0.75rem":"4.125rem",right:isMobile?"0.75rem":"1.375rem",left:isMobile?"0.75rem":undefined,zIndex:90,cursor:"pointer",animation:"fadeUp .4s ease",background:`${T.color.white}f5`,backdropFilter:"blur(12px)",borderRadius:"1rem",padding:"0.875rem 1.125rem",border:"1.5px solid #D4AF3766",boxShadow:"0 8px 32px rgba(169,124,46,.25)",display:"flex",alignItems:"center",gap:"0.75rem",maxWidth:isMobile?undefined:"20rem"}}>
        <div style={{width:"2.75rem",height:"2.75rem",borderRadius:"0.75rem",background:"linear-gradient(135deg,#C9A84C22,#D4AF3722)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",flexShrink:0}}>{achToast.icon}</div>
        <div>
          <div style={{fontFamily:T.font.body,fontSize:"0.625rem",fontWeight:600,color:"#C9A84C",textTransform:"uppercase",letterSpacing:"0.0625rem",marginBottom:"0.125rem"}}>{tAch("achievementUnlocked")}</div>
          <div style={{fontFamily:T.font.display,fontSize:"0.9375rem",fontWeight:600,color:T.color.charcoal}}>{tAch(achToast.titleKey)}</div>
          <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,lineHeight:1.3}}>{tAch(achToast.descKey)}</div>
        </div>
      </div>}

      {showAchievements&&<AchievementsPanel onClose={()=>setShowAchievements(false)}/>}

      {/* Invite & shared panels */}
      {showInvites&&<InviteNotificationsPanel onClose={()=>setShowInvites(false)}/>}
      {showSharedWithMe&&<SharedWithMePanel onClose={()=>setShowSharedWithMe(false)}/>}
      {showSharingSettings&&<SharingSettingsPanel open={showSharingSettings} onClose={()=>setShowSharingSettings(false)}/>}

      {/* Interview panels */}
      {showInterviewLibrary&&<InterviewLibraryPanel onClose={()=>setShowInterviewLibrary(false)} highlightWingId={activeWing}/>}
      {showInterviewHistory&&<InterviewHistoryPanel onClose={()=>setShowInterviewHistory(false)}/>}
      {showInterview&&<InterviewPanel onClose={()=>{setShowInterviewPanel(false);markChecklistItem("complete_interview");}} onCreateMemory={(mem, wingId)=>{
        // Place interview memory in the first room of the relevant wing (or attic if general)
        const targetWing = wingId === "general" ? "family" : wingId;
        const prefix = {family:"fr",travel:"tr",childhood:"cr",career:"kr",creativity:"rr"}[targetWing]||"fr";
        const roomId = `${prefix}1`;
        addMemoryToRoom(roomId, mem);
      }}/>}

      {/* Track panels */}
      {showTracksPanel&&!selectedTrackId&&<TracksPanel onClose={()=>setShowTracksPanel(false)}/>}
      {selectedTrackId&&<TrackDetailPanel trackId={selectedTrackId} onClose={()=>setSelectedTrackId(null)} onNavigate={(target)=>{setShowTracksPanel(false);setSelectedTrackId(null);}}/>}
      {showLegacyPanel&&<LegacyPanel onClose={()=>setShowLegacyPanel(false)}/>}

      {/* Track step completion toast */}
      {trackToast&&<div role="status" onClick={()=>{dismissTrackToast();setShowTracksPanel(true);}} style={{position:"absolute",top:isMobile?60:66,left:isMobile?12:undefined,right:isMobile?12:22,zIndex:88,cursor:"pointer",animation:"fadeUp .4s ease",background:`${T.color.white}f5`,backdropFilter:"blur(12px)",borderRadius:16,padding:"12px 16px",border:`1.5px solid ${T.color.sage}44`,boxShadow:"0 8px 32px rgba(74,103,65,.2)",display:"flex",alignItems:"center",gap:12,maxWidth:isMobile?undefined:340}}>
        <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#4A674118,#4A674108)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{"\u2713"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:T.font.body,fontSize:10,fontWeight:600,color:T.color.sage,textTransform:"uppercase",letterSpacing:1,marginBottom:1}}>{tTrack("stepCompleted")}</div>
          <div style={{fontFamily:T.font.display,fontSize:14,fontWeight:600,color:T.color.charcoal}}>{tTrack(trackToast.stepTitleKey)}</div>
          <div style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted}}>{tTrack(trackToast.trackNameKey)}</div>
        </div>
        <div style={{fontFamily:T.font.body,fontSize:14,fontWeight:700,color:"#C9A84C"}}>+{trackToast.points} MP</div>
      </div>}

      {/* Track completion celebration */}
      {trackCelebration&&<div onClick={dismissCelebration} style={{position:"fixed",inset:0,zIndex:95,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(42,34,24,.5)",backdropFilter:"blur(4px)",animation:"fadeIn .3s ease",cursor:"pointer"}}>
        <div style={{background:T.color.linen,borderRadius:24,padding:"40px 48px",textAlign:"center",maxWidth:380,boxShadow:"0 24px 80px rgba(44,44,42,.35)",animation:"fadeUp .5s ease",border:`2px solid #C4A96244`}}>
          <div style={{fontSize:48,marginBottom:16}}>{"\u2728"}</div>
          <div style={{fontFamily:T.font.display,fontSize:28,fontWeight:600,color:T.color.charcoal,marginBottom:8}}>{tTrack("trackComplete")}</div>
          <div style={{fontFamily:T.font.display,fontSize:18,fontWeight:500,color:T.color.walnut,marginBottom:12,fontStyle:"italic"}}>{tTrack(trackCelebration.trackNameKey)}</div>
          <div style={{fontFamily:T.font.body,fontSize:14,color:T.color.muted,marginBottom:16}}>{tTrack("youEarnedBonus")}</div>
          <div style={{fontFamily:T.font.body,fontSize:32,fontWeight:700,color:"#C9A84C"}}>+{trackCelebration.bonus} MP</div>
          <div style={{fontFamily:T.font.body,fontSize:12,color:T.color.muted,marginTop:16}}>{tTrack("tapToContinue")}</div>
        </div>
      </div>}
    </div>
  );
}

/* ═══ Mobile Bottom Action Bar ═══ */
interface MobileBottomBarProps {
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

function MobileBottomBar(props: MobileBottomBarProps) {
  const { view, activeWing, activeRoomId, allRoomMems, showUpload, showSharing, selMem, wingData, moreMenuOpen } = props;
  const { t: tAction } = useTranslation("actionMenu");
  const accent = wingData?.accent || T.color.terracotta;

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
  if (contentItems.length > 0) moreSections.push({ title: tAction("moreContent") || "Content", items: contentItems });

  // Social section
  const socialItems: MoreItem[] = [];
  if (view === "room") {
    socialItems.push({ icon: "\u{1F4E4}", label: tAction("shareCard"), action: props.onShare });
  }
  socialItems.push({ icon: "\u{1F4EC}", label: tAction("invites"), action: props.onInvites });
  socialItems.push({ icon: "\u{1F91D}", label: tAction("shared"), action: props.onSharedWithMe });
  socialItems.push({ icon: "\u{1F6E0}\uFE0F", label: tAction("manageShares"), action: props.onSharingSettings });
  moreSections.push({ title: tAction("moreSocial") || "Social", items: socialItems });

  // Explore section
  const exploreItems: MoreItem[] = [];
  if (view !== "exterior" && view !== "entrance") {
    exploreItems.push({ icon: "\uD83D\uDCC5", label: tAction("timeline"), action: props.onTimeline });
    exploreItems.push({ icon: "\uD83C\uDF0D", label: tAction("map"), action: props.onMemoryMap });
    exploreItems.push({ icon: "\uD83C\uDF99\uFE0F", label: tAction("interviews"), action: props.onInterviews });
  }
  exploreItems.push({ icon: "\uD83D\uDCDC", label: tAction("tracks"), action: props.onTracks });
  exploreItems.push({ icon: "\u{1F3C6}", label: tAction("awards", { earned: String(p.earned), total: String(p.total) }), action: props.onAchievements });
  moreSections.push({ title: tAction("moreExplore") || "Explore", items: exploreItems });

  // Settings section
  const settingsItems: MoreItem[] = [];
  if (view === "corridor" || view === "room") {
    settingsItems.push({ icon: "\u{1F527}", label: tAction("manageRooms"), action: props.onRoomManager });
  }
  settingsItems.push({ icon: "\u2699\uFE0F", label: tAction("customizeWings"), action: props.onWingManager });
  settingsItems.push({ icon: "\u2728", label: tAction("tour"), action: () => { props.onCloseMore(); useTutorialStore.getState().start(); } });
  moreSections.push({ title: tAction("moreSettings") || "Settings", items: settingsItems });

  return (
    <>
      {/* More menu overlay */}
      {moreMenuOpen && <div onClick={props.onCloseMore} style={{
        position: "absolute", inset: 0, zIndex: 48,
        background: "rgba(42,34,24,.4)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      }}>
        <div onClick={e => e.stopPropagation()} style={{
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
                    <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{item.icon}</span>
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
                color: "#FFF", fontSize: act.icon === "+" ? "1.375rem" : "1.0625rem", fontWeight: 300,
                boxShadow: `0 0.25rem 0.75rem ${accent}40`,
              }}>{act.icon}</div>
            ) : act.isBack ? (
              <div style={{
                width: "2rem", height: "2rem", borderRadius: "1rem",
                background: `${T.color.warmStone}dd`,
                border: `1px solid ${T.color.cream}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.9375rem", color: T.color.walnut,
              }}>{act.icon}</div>
            ) : (
              <span style={{ fontSize: "1.1875rem", lineHeight: 1 }}>{act.icon}</span>
            )}
            <span style={{
              fontFamily: T.font.body, fontSize: "0.5625rem",
              color: act.accent ? accent : act.isBack ? T.color.walnut : T.color.muted,
              fontWeight: act.accent ? 600 : act.isBack ? 500 : 400,
            }}>{act.label}</span>
          </button>
        ))}
        {/* More button */}
        <button onClick={props.onToggleMore} aria-label="More" style={{
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
          }}>More</span>
        </button>
      </div>
    </>
  );
}
