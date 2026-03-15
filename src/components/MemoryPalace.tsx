"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useUserStore } from "@/lib/stores/userStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useAchievementStore } from "@/lib/stores/achievementStore";
import { useTrackStore } from "@/lib/stores/trackStore";
import { useNavigation } from "@/lib/hooks/useNavigation";
import { useRoomMemories } from "@/lib/hooks/useRoomMemories";
import OnboardingWizard from "@/components/ui/OnboardingWizard";
import TopBar from "@/components/ui/TopBar";
import Minimap from "@/components/ui/Minimap";
import { WingTooltip, DoorTooltip } from "@/components/ui/HoverTooltip";
import SearchBar from "@/components/ui/SearchBar";
import UploadPanel from "@/components/ui/UploadPanel";
import SharingPanel from "@/components/ui/SharingPanel";
import MemoryDetail from "@/components/ui/MemoryDetail";
import DirectoryPanel from "@/components/ui/DirectoryPanel";
import RoomManagerPanel from "@/components/ui/RoomManagerPanel";
import WingManagerPanel from "@/components/ui/WingManagerPanel";
import AchievementsPanel from "@/components/ui/AchievementsPanel";
import TracksPanel from "@/components/ui/TracksPanel";
import TrackDetailPanel from "@/components/ui/TrackDetailPanel";
import LegacyPanel from "@/components/ui/LegacyPanel";
import PointsDisplay from "@/components/ui/PointsDisplay";
import ExteriorScene from "@/components/3d/ExteriorScene";
import EntranceHallScene from "@/components/3d/EntranceHallScene";
import InteriorScene from "@/components/3d/InteriorScene";
import CorridorScene from "@/components/3d/CorridorScene";
import ShareCard from "@/components/ui/ShareCard";
import MemoryMap from "@/components/ui/MemoryMap";
import OnThisDay from "@/components/ui/OnThisDay";
import MemoryTimeline from "@/components/ui/MemoryTimeline";
import MassImportPanel from "@/components/ui/MassImportPanel";
import RoomGallery from "@/components/ui/RoomGallery";
import InviteNotificationsPanel from "@/components/ui/InviteNotificationsPanel";
import SharedWithMePanel from "@/components/ui/SharedWithMePanel";
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
import TutorialOverlay, { TourButton } from "@/components/ui/TutorialOverlay";

// ═══ MAIN — 4-level navigation: exterior → entrance → corridor → room ═══
export default function MemoryPalace(){
  const isMobile = useIsMobile();

  // ── Stores ──
  const { profileLoading, onboarded, firstWing,
    loadProfile, finishOnboarding } = useUserStore();
  const { view, activeWing, activeRoomId, hovWing, hovDoor, opacity, portalAnim, roomLayouts,
    setHovWing, setHovDoor, enterWing, enterEntrance, enterCorridor, enterRoom, setRoomLayout, exitToPalace, exitToCorridor, exitToEntrance } = usePalaceStore();
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
  const [showRoomManager, setShowRoomManager] = useState(false);
  const [showRoomShare, setShowRoomShare] = useState(false);
  const [showWingManager, setShowWingManager] = useState(false);
  const [showMemoryMap, setShowMemoryMap] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showMassImport, setShowMassImport] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [showSharedWithMe, setShowSharedWithMe] = useState(false);
  const [showCorridorGallery, setShowCorridorGallery] = useState(false);
  const [corridorPaintings, setCorridorPaintings] = useState<CorridorPaintings>({});
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [searchBarVisible, setSearchBarVisible] = useState(true);
  const searchHideTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const { showLibrary: showInterviewLibrary, showHistory: showInterviewHistory, showInterview,
    setShowLibrary: setShowInterviewLibrary, setShowHistory: setShowInterviewHistory,
    setShowInterview: setShowInterviewPanel } = useInterviewStore();

  // ── Tutorial ──
  const { active: tutorialActive, completed: tutorialCompleted, start: startTutorial } = useTutorialStore();

  // ── Hooks ──
  const { wingData, hovWingData, activeRoomData, crumbs, handleMemClick, allWings } = useNavigation();
  const { roomMems, allRoomMems, roomMemsKey, handleAddMemory, addMemoryToRoom, handleUpdateMemory, handleDeleteMemory, currentSharing, updateSharing } = useRoomMemories();

  // Load profile on mount
  useEffect(()=>{ loadProfile(); },[loadProfile]);

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

  // Auto-start tutorial on first entrance-hall visit (after onboarding, not completed before)
  useEffect(() => {
    if (view === "entrance" && !tutorialCompleted && !tutorialActive) {
      const t = setTimeout(startTutorial, 1200);
      return () => clearTimeout(t);
    }
  }, [view, tutorialCompleted, tutorialActive, startTutorial]);

  const handleFinishOnboarding=async()=>{
    await finishOnboarding();
    if(firstWing) setTimeout(()=>enterWing(firstWing),800);
  };

  if(profileLoading){
    return(<div style={{width:"100vw",height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:`linear-gradient(165deg,${T.color.linen} 0%,${T.color.warmStone} 50%,${T.color.sandstone} 100%)`,fontFamily:T.font.display}}>
      <div style={{fontSize:48,marginBottom:20}}>🏛️</div>
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

  return(
    <div style={{width:"100vw",height:"100vh",background:"#DDD5C8",position:"relative",overflow:"hidden"}}>
      <style>{`*{box-sizing:border-box;margin:0}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes portalFlash{0%{opacity:0}30%{opacity:1}70%{opacity:1}100%{opacity:0}}`}</style>
      {/* Version indicator — temporary, for debugging cache issues */}
      <div style={{position:"fixed",bottom:2,right:4,zIndex:9999,fontFamily:"monospace",fontSize:9,color:"rgba(0,0,0,0.2)",pointerEvents:"none"}}>v3</div>
      <div style={{position:"absolute",inset:0,opacity,transition:"opacity 0.4s ease"}}>
        {view==="exterior"&&<ExteriorScene onRoomHover={setHovWing} onRoomClick={(wingId: string)=>{if(wingId==="__entrance__"){enterEntrance();}else{enterCorridor(wingId);}}} hoveredRoom={hovWing} wings={allWings}/>}
        {view==="entrance"&&<EntranceHallScene onDoorClick={(wingId: string)=>{if(wingId==="__exterior__")exitToPalace();else enterCorridor(wingId);}} wings={allWings}/>}
        {view==="corridor"&&activeWing&&wingData&&<CorridorScene key={activeWing+"|"+JSON.stringify(getWingRooms(activeWing).map(r=>r.id+r.name+r.icon))+"|"+wingData.accent+"|"+JSON.stringify(corridorPaintings)} wingId={activeWing} rooms={getWingRooms(activeWing)} onDoorHover={setHovDoor} onDoorClick={enterRoom} hoveredDoor={hovDoor} wingData={wingData} corridorPaintings={corridorPaintings}/>}
        {view==="room"&&activeWing&&activeRoomId&&<InteriorScene key={roomMemsKey+"|"+(roomLayouts[activeRoomId]||"")} roomId={activeWing} actualRoomId={activeRoomId} layoutOverride={roomLayouts[activeRoomId]} memories={roomMems} onMemoryClick={handleMemClick} wingData={wingData||undefined}/>}
      </div>

      <TopBar crumbs={crumbs}/>

      {/* Portal transition overlay */}
      {portalAnim&&<div style={{position:"absolute",inset:0,zIndex:45,pointerEvents:"none",animation:"portalFlash .5s ease both",background:"radial-gradient(ellipse at center,rgba(200,168,104,.6) 0%,rgba(200,168,104,.15) 40%,transparent 70%)"}}/>}

      {!isMobile && <Minimap/>}

      {/* Hover tooltips — desktop only */}
      {!isMobile && hovWingData&&view==="exterior"&&<WingTooltip wing={hovWingData}/>}
      {!isMobile && hovDoorRoom&&view==="corridor"&&<DoorTooltip room={hovDoorRoom} wingAccent={wingData?.accent}/>}

      {/* Bottom hints — hide on mobile (touch controls are self-explanatory) */}
      {!isMobile && view==="exterior"&&!hovWing&&<div style={{position:"absolute",bottom:22,left:"50%",transform:"translateX(-50%)",animation:"fadeIn .8s ease .8s both",fontFamily:T.font.body,fontSize:11,color:T.color.muted,background:`${T.color.white}cc`,backdropFilter:"blur(8px)",padding:"7px 18px",borderRadius:16,border:`1px solid ${T.color.cream}`}}>Drag to orbit · Scroll to zoom · Click a wing to enter</div>}
      {!isMobile && view==="entrance"&&<div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",fontFamily:T.font.body,fontSize:11,color:T.color.muted,background:`${T.color.white}cc`,backdropFilter:"blur(10px)",padding:"7px 18px",borderRadius:16,border:`1px solid ${T.color.cream}`,animation:"fadeIn .6s ease .3s both",display:"flex",gap:14}}><span>WASD to walk</span><span style={{color:T.color.sandstone}}>|</span><span>Drag to look</span><span style={{color:T.color.sandstone}}>|</span><span>Click a door to enter a wing</span></div>}
      {!isMobile && view==="corridor"&&<div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",fontFamily:T.font.body,fontSize:11,color:T.color.muted,background:`${T.color.white}cc`,backdropFilter:"blur(10px)",padding:"7px 18px",borderRadius:16,border:`1px solid ${T.color.cream}`,animation:"fadeIn .6s ease .3s both",display:"flex",gap:14}}><span>Arrow keys to walk</span><span style={{color:T.color.sandstone}}>|</span><span>Drag to look</span><span style={{color:T.color.sandstone}}>|</span><span>Click a door to enter room</span></div>}
      {!isMobile && view==="room"&&<div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",fontFamily:T.font.body,fontSize:11,color:T.color.muted,background:`${T.color.white}cc`,backdropFilter:"blur(10px)",padding:"7px 18px",borderRadius:16,border:`1px solid ${T.color.cream}`,animation:"fadeIn .6s ease .3s both",display:"flex",gap:14}}><span>Drag to look</span><span style={{color:T.color.sandstone}}>|</span><span>Arrow keys to walk</span><span style={{color:T.color.sandstone}}>|</span><span>Click memories</span></div>}

      {/* Search bar + room info (room view) — search auto-hides after 3s */}
      {view==="room"&&activeRoomData&&activeRoomId&&<>
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
              <option value="">Auto</option>
              {ROOM_LAYOUTS.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <div style={{width:1,height:14,background:T.color.cream}} />
            <button onClick={()=>setShowSharing(true)} style={{background:"transparent",border:"none",display:"flex",alignItems:"center",gap:4,cursor:"pointer",padding:"2px 4px"}}>
              {rs.shared?<><div style={{width:6,height:6,borderRadius:3,background:"#4A6741"}}/><span style={{fontFamily:T.font.body,fontSize:10,color:"#4A6741",fontWeight:500}}>Shared</span></>
              :<span style={{fontFamily:T.font.body,fontSize:10,color:T.color.muted}}>Share</span>}
            </button>
            <button onClick={()=>setShowRoomShare(true)} title="Share as card" style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,lineHeight:1,padding:"2px 2px",display:"flex",alignItems:"center"}}>
              {"\uD83D\uDCE4"}
            </button>
          </div>
        </div>;})()}
      </>}

      {/* OnThisDay — floating card in exterior view */}
      {view==="exterior"&&<OnThisDay onNavigateToRoom={(wingId,roomId)=>{enterWing(wingId);setTimeout(()=>enterRoom(roomId),600);}}/>}

      {/* ═══ DESKTOP ACTION MENU ═══ */}
      {!isMobile && (()=>{
        if (view==="exterior"||view==="entrance") {
          return <ActionMenu
            accent={T.color.terracotta}
            primary={{ icon: "\u{1F3DB}\uFE0F", label: "Customize Wings", action: ()=>setShowWingManager(true) }}
            secondary={[
              { icon: "\uD83D\uDCC5", label: "Timeline", action: ()=>setShowTimeline(true), hidden: showTimeline },
              { icon: "\uD83C\uDF0D", label: "Memory Map", action: ()=>setShowMemoryMap(true), hidden: showMemoryMap },
              { icon: "\uD83C\uDF99\uFE0F", label: "Life Interviews", action: ()=>setShowInterviewLibrary(true) },
              { icon: "\u{1F4E6}", label: "Mass Import", action: ()=>setShowMassImport(true) },
            ]}
          />;
        }
        if (view==="corridor"&&activeWing) {
          return <ActionMenu
            accent={wingData?.accent||T.color.terracotta}
            primary={{ icon: "\u{1F6AA}", label: "Manage Rooms", action: ()=>setShowRoomManager(true) }}
            secondary={[
              { icon: "\u{1F5BC}\uFE0F", label: "Gallery", action: ()=>setShowCorridorGallery(true) },
              { icon: "\uD83C\uDF0D", label: "Memory Map", action: ()=>setShowMemoryMap(true), hidden: showMemoryMap },
              { icon: "\uD83C\uDF99\uFE0F", label: "Life Interviews", action: ()=>setShowInterviewLibrary(true) },
            ]}
          />;
        }
        if (view==="room"&&activeRoomId&&!showUpload&&!showSharing&&!selMem) {
          return <ActionMenu
            accent={wingData?.accent||T.color.terracotta}
            primary={{ icon: "+", label: "Add Memory", action: ()=>setShowUpload(true) }}
            secondary={[
              { icon: "\u{1F5BC}\uFE0F", label: "Gallery", action: ()=>setShowGallery(true), hidden: allRoomMems.length===0 },
              { icon: "\u{1F91D}", label: "Share Room", action: ()=>setShowSharing(true) },
              { icon: "\u{1F4E6}", label: "Mass Import", action: ()=>setShowMassImport(true) },
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

      {/* "Drag to look" hint — right side, mobile only, room, corridor & entrance views */}
      {isMobile && (view === "room" || view === "corridor" || view === "entrance") && !selMem && !showUpload && !showSharing && !moreMenuOpen && (
        <div style={{
          position: "absolute",
          bottom: 110,
          right: 16,
          zIndex: 47,
          pointerEvents: "none",
          animation: "fadeIn .8s ease 1.5s both",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: "rgba(42, 34, 24, 0.25)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            border: "1.5px solid rgba(212, 197, 178, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="rgba(250,250,247,0.5)" strokeWidth="1.5" fill="none" />
              <path d="M9 5L9 9L13 7.5" stroke="rgba(250,250,247,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{
            fontFamily: T.font.body,
            fontSize: 9,
            color: "rgba(250,250,247,0.6)",
            textShadow: "0 1px 4px rgba(0,0,0,0.3)",
            whiteSpace: "nowrap",
          }}>Drag to look</span>
        </div>
      )}

      {/* ═══ MOBILE BOTTOM ACTION BAR ═══ */}
      {isMobile && <MobileBottomBar
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
        onDirectory={() => { closeMore(); setShowDirectory(true); }}
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
        onInterviews={() => { closeMore(); setShowInterviewLibrary(true); }}
        getProgress={getProgress}
        onBack={() => { closeMore(); view === "room" ? exitToCorridor() : view === "corridor" ? exitToEntrance() : exitToPalace(); }}
      />}

      {/* Panels + overlays */}
      {showUpload&&activeRoomId&&<UploadPanel wing={wingData} room={activeRoomData} onClose={()=>setShowUpload(false)} onAdd={handleAddMemory} roomMemories={allRoomMems} onUpdateMemory={handleUpdateMemory}/>}
      {showSharing&&activeRoomId&&<SharingPanel wing={wingData} room={activeRoomData} roomId={activeRoomId} sharing={currentSharing(activeRoomId)} onUpdate={(u: any)=>updateSharing(activeRoomId,u)} onClose={()=>setShowSharing(false)}/>}
      {showDirectory&&<DirectoryPanel onClose={()=>setShowDirectory(false)}/>}
      {showRoomManager&&activeWing&&wingData&&<RoomManagerPanel wing={wingData} onClose={()=>setShowRoomManager(false)} onEnterRoom={enterRoom}/>}
      {showWingManager&&<WingManagerPanel onClose={()=>setShowWingManager(false)}/>}
      {selMem&&<MemoryDetail mem={selMem} room={activeRoomData} wing={wingData} onClose={()=>setSelMem(null)} onDelete={handleDeleteMemory} onUpdate={handleUpdateMemory}/>}
      {showRoomShare&&activeRoomData&&wingData&&<ShareCard roomName={activeRoomData.name} roomIcon={activeRoomData.icon} wingName={wingData.name} wingIcon={wingData.icon} memCount={allRoomMems.length} accent={wingData.accent} onClose={()=>setShowRoomShare(false)}/>}
      {showTimeline&&<MemoryTimeline onClose={()=>setShowTimeline(false)}/>}
      {showMemoryMap&&<MemoryMap userMems={userMems} onClose={()=>setShowMemoryMap(false)} onNavigate={(roomId)=>{setShowMemoryMap(false);}}/>}
      {showMassImport&&<MassImportPanel onClose={()=>setShowMassImport(false)} initialWingId={activeWing} initialRoomId={activeRoomId}/>}
      {showGallery&&activeRoomId&&<RoomGallery mems={allRoomMems} wing={wingData} room={activeRoomData} onClose={()=>setShowGallery(false)} onUpdate={handleUpdateMemory} onSelect={(mem)=>{setShowGallery(false);setSelMem(mem);}}/>}
      {showCorridorGallery&&activeWing&&wingData&&<CorridorGalleryPanel wing={wingData} rooms={getWingRooms(activeWing)} onClose={()=>setShowCorridorGallery(false)} onPaintingsChange={setCorridorPaintings} currentPaintings={corridorPaintings}/>}

      {/* Status bar — desktop only: achievements + tracks + points in one strip */}
      {!isMobile && (()=>{const p=getProgress();return <StatusBar
        earned={p.earned} total={p.total} percentage={p.percentage}
        onAchievements={()=>setShowAchievements(true)}
        onTracks={()=>setShowTracksPanel(true)}
        pointsElement={<PointsDisplay onClick={()=>setShowTracksPanel(true)} />}
      />;})()}

      {/* Tutorial overlay */}
      <TutorialOverlay />

      {/* "Take the Tour" button — desktop, entrance/exterior only */}
      {!isMobile && (view==="exterior"||view==="entrance") && !tutorialActive && <TourButton style={{position:"absolute",top:58,right:320,zIndex:35,animation:"fadeIn .4s ease 1.3s both"}} />}

      {/* Invites & Shared-with-me FABs — desktop only, exterior/corridor only */}
      {!isMobile && (view==="exterior"||view==="entrance"||view==="corridor") && <button onClick={()=>setShowInvites(true)} title="Pending Invitations" style={{position:"absolute",top:58,right:120,height:36,borderRadius:18,border:`1px solid ${T.color.cream}`,background:`${T.color.white}ee`,backdropFilter:"blur(10px)",padding:"0 14px 0 10px",display:"flex",alignItems:"center",gap:6,cursor:"pointer",zIndex:35,animation:"fadeIn .4s ease 1.1s both",transition:"transform .2s",boxShadow:"0 2px 10px rgba(44,44,42,.08)"}}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="scale(1.05)";}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="none";}}>
        <span style={{fontSize:14}}>{"\u{1F4EC}"}</span>
        <span style={{fontFamily:T.font.body,fontSize:11,fontWeight:500,color:T.color.walnut}}>Invites</span>
      </button>}

      {!isMobile && (view==="exterior"||view==="entrance"||view==="corridor") && <button onClick={()=>setShowSharedWithMe(true)} title="Shared with me" style={{position:"absolute",top:58,right:220,height:36,borderRadius:18,border:`1px solid ${T.color.cream}`,background:`${T.color.white}ee`,backdropFilter:"blur(10px)",padding:"0 14px 0 10px",display:"flex",alignItems:"center",gap:6,cursor:"pointer",zIndex:35,animation:"fadeIn .4s ease 1.2s both",transition:"transform .2s",boxShadow:"0 2px 10px rgba(44,44,42,.08)"}}
        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="scale(1.05)";}}
        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="none";}}>
        <span style={{fontSize:14}}>{"\u{1F91D}"}</span>
        <span style={{fontFamily:T.font.body,fontSize:11,fontWeight:500,color:T.color.walnut}}>Shared</span>
      </button>}

      {/* Achievement toast notification */}
      {achToast&&<div onClick={()=>{dismissAchToast();setShowAchievements(true);}} style={{position:"absolute",top:isMobile?12:66,right:isMobile?12:22,left:isMobile?12:undefined,zIndex:90,cursor:"pointer",animation:"fadeUp .4s ease",background:`${T.color.white}f5`,backdropFilter:"blur(12px)",borderRadius:16,padding:"14px 18px",border:"1.5px solid #D4AF3766",boxShadow:"0 8px 32px rgba(169,124,46,.25)",display:"flex",alignItems:"center",gap:12,maxWidth:isMobile?undefined:320}}>
        <div style={{width:44,height:44,borderRadius:12,background:"linear-gradient(135deg,#C9A84C22,#D4AF3722)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{achToast.icon}</div>
        <div>
          <div style={{fontFamily:T.font.body,fontSize:10,fontWeight:600,color:"#C9A84C",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Achievement unlocked!</div>
          <div style={{fontFamily:T.font.display,fontSize:15,fontWeight:600,color:T.color.charcoal}}>{achToast.title}</div>
          <div style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,lineHeight:1.3}}>{achToast.desc}</div>
        </div>
      </div>}

      {showAchievements&&<AchievementsPanel onClose={()=>setShowAchievements(false)}/>}

      {/* Invite & shared panels */}
      {showInvites&&<InviteNotificationsPanel onClose={()=>setShowInvites(false)}/>}
      {showSharedWithMe&&<SharedWithMePanel onClose={()=>setShowSharedWithMe(false)}/>}

      {/* Interview panels */}
      {showInterviewLibrary&&<InterviewLibraryPanel onClose={()=>setShowInterviewLibrary(false)} highlightWingId={activeWing}/>}
      {showInterviewHistory&&<InterviewHistoryPanel onClose={()=>setShowInterviewHistory(false)}/>}
      {showInterview&&<InterviewPanel onClose={()=>setShowInterviewPanel(false)} onCreateMemory={(mem, wingId)=>{
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
      {trackToast&&<div onClick={()=>{dismissTrackToast();setShowTracksPanel(true);}} style={{position:"absolute",top:isMobile?60:66,left:isMobile?12:undefined,right:isMobile?12:22,zIndex:88,cursor:"pointer",animation:"fadeUp .4s ease",background:`${T.color.white}f5`,backdropFilter:"blur(12px)",borderRadius:16,padding:"12px 16px",border:`1.5px solid ${T.color.sage}44`,boxShadow:"0 8px 32px rgba(74,103,65,.2)",display:"flex",alignItems:"center",gap:12,maxWidth:isMobile?undefined:340}}>
        <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#4A674118,#4A674108)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{"\u2713"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:T.font.body,fontSize:10,fontWeight:600,color:T.color.sage,textTransform:"uppercase",letterSpacing:1,marginBottom:1}}>Step completed!</div>
          <div style={{fontFamily:T.font.display,fontSize:14,fontWeight:600,color:T.color.charcoal}}>{trackToast.stepTitle}</div>
          <div style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted}}>{trackToast.trackName}</div>
        </div>
        <div style={{fontFamily:T.font.body,fontSize:14,fontWeight:700,color:"#C9A84C"}}>+{trackToast.points}</div>
      </div>}

      {/* Track completion celebration */}
      {trackCelebration&&<div onClick={dismissCelebration} style={{position:"fixed",inset:0,zIndex:95,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(42,34,24,.5)",backdropFilter:"blur(4px)",animation:"fadeIn .3s ease",cursor:"pointer"}}>
        <div style={{background:T.color.linen,borderRadius:24,padding:"40px 48px",textAlign:"center",maxWidth:380,boxShadow:"0 24px 80px rgba(44,44,42,.35)",animation:"fadeUp .5s ease",border:`2px solid #C4A96244`}}>
          <div style={{fontSize:48,marginBottom:16}}>{"\u2728"}</div>
          <div style={{fontFamily:T.font.display,fontSize:28,fontWeight:600,color:T.color.charcoal,marginBottom:8}}>Track Complete!</div>
          <div style={{fontFamily:T.font.display,fontSize:18,fontWeight:500,color:T.color.walnut,marginBottom:12,fontStyle:"italic"}}>{trackCelebration.trackName}</div>
          <div style={{fontFamily:T.font.body,fontSize:14,color:T.color.muted,marginBottom:16}}>You earned a bonus of</div>
          <div style={{fontFamily:T.font.body,fontSize:32,fontWeight:700,color:"#C9A84C"}}>+{trackCelebration.bonus} Points</div>
          <div style={{fontFamily:T.font.body,fontSize:12,color:T.color.muted,marginTop:16}}>Tap anywhere to continue</div>
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
  onDirectory: () => void;
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
  onInterviews: () => void;
  getProgress: () => { earned: number; total: number; percentage: number };
  onBack: () => void;
}

function MobileBottomBar(props: MobileBottomBarProps) {
  const { view, activeWing, activeRoomId, allRoomMems, showUpload, showSharing, selMem, wingData, moreMenuOpen } = props;
  const accent = wingData?.accent || T.color.terracotta;

  // Define primary actions based on view
  const primaryActions: { icon: string; label: string; action: () => void; accent?: boolean }[] = [];

  // Back button for non-exterior views
  if (view !== "exterior") {
    primaryActions.push({ icon: "\u2190", label: "Back", action: props.onBack });
  }

  if (view === "room" && activeRoomId && !showUpload && !showSharing && !selMem) {
    primaryActions.push({ icon: "+", label: "Add", action: props.onUpload, accent: true });
    if (allRoomMems.length > 0) {
      primaryActions.push({ icon: "\u{1F5BC}\uFE0F", label: "Gallery", action: props.onGallery });
    }
    primaryActions.push({ icon: "\u{1F91D}", label: "Share", action: props.onShare });
  } else if (view === "corridor" && activeWing) {
    primaryActions.push({ icon: "\u{1F6AA}", label: "Rooms", action: props.onRoomManager, accent: true });
    primaryActions.push({ icon: "\u{1F5BC}\uFE0F", label: "Gallery", action: props.onCorridorGallery });
    primaryActions.push({ icon: "\uD83C\uDF0D", label: "Map", action: props.onMemoryMap });
  } else if (view === "entrance") {
    primaryActions.push({ icon: "\u{1F3DB}\uFE0F", label: "Wings", action: props.onWingManager, accent: true });
    primaryActions.push({ icon: "\uD83D\uDCC5", label: "Timeline", action: props.onTimeline });
    primaryActions.push({ icon: "\uD83C\uDF0D", label: "Map", action: props.onMemoryMap });
  } else if (view === "exterior") {
    primaryActions.push({ icon: "\u{1F3DB}\uFE0F", label: "Wings", action: props.onWingManager, accent: true });
    primaryActions.push({ icon: "\uD83D\uDCC5", label: "Timeline", action: props.onTimeline });
    primaryActions.push({ icon: "\uD83C\uDF0D", label: "Map", action: props.onMemoryMap });
  }

  // Directory moved to "More" menu for cleaner bottom bar

  const p = props.getProgress();

  return (
    <>
      {/* More menu overlay */}
      {moreMenuOpen && <div onClick={props.onCloseMore} style={{
        position: "absolute", inset: 0, zIndex: 48, background: "rgba(42,34,24,.35)",
        backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          position: "absolute", bottom: 72, left: 12, right: 12,
          background: `${T.color.linen}f0`, backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: 16, border: `1px solid ${T.color.cream}`,
          boxShadow: "0 -8px 40px rgba(44,44,42,.18)", padding: 14,
          animation: "slideInUp .25s ease",
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
        }}>
          {[
            { icon: "\u{1F4C2}", label: "Directory", action: props.onDirectory },
            { icon: "\uD83C\uDF99\uFE0F", label: "Interviews", action: props.onInterviews },
            { icon: "\u{1F4E6}", label: "Import", action: props.onMassImport },
            { icon: "\u{1F3C6}", label: `Awards ${p.earned}/${p.total}`, action: props.onAchievements },
            { icon: "\uD83D\uDCDC", label: "Tracks", action: props.onTracks },
            { icon: "\u{1F4EC}", label: "Invites", action: props.onInvites },
            { icon: "\u{1F91D}", label: "Shared", action: props.onSharedWithMe },
            { icon: "\u2728", label: "Tour", action: () => { props.onCloseMore(); useTutorialStore.getState().start(); } },
            ...(view === "room" ? [
              { icon: "\u{1F4E4}", label: "Share Card", action: props.onShare },
            ] : []),
            ...(view === "exterior" ? [
              { icon: "\uD83D\uDCC5", label: "Timeline", action: props.onTimeline },
            ] : []),
          ].map((item, i) => (
            <button key={i} onClick={item.action} style={{
              padding: "16px 8px", borderRadius: 12, border: `1px solid ${T.color.cream}`,
              background: `${T.color.white}ee`, cursor: "pointer", textAlign: "center",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              minHeight: 64, justifyContent: "center",
            }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontFamily: T.font.body, fontSize: 11, color: T.color.walnut, fontWeight: 500 }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>}

      {/* Bottom bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 49,
        height: 64, paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: `${T.color.linen}f0`, backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: `1px solid ${T.color.cream}`,
        display: "flex", alignItems: "center", justifyContent: "space-around",
        padding: "0 8px",
        animation: "fadeIn .3s ease .3s both",
      }}>
        {primaryActions.slice(0, 3).map((act, i) => (
          <button key={i} onClick={act.action} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "8px 4px", border: "none", background: "transparent", cursor: "pointer",
            minHeight: 48, justifyContent: "center",
          }}>
            {act.accent ? (
              <div style={{
                width: 40, height: 40, borderRadius: 20,
                background: `linear-gradient(135deg, ${accent}, ${T.color.walnut})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#FFF", fontSize: act.icon === "+" ? 24 : 18, fontWeight: 300,
                boxShadow: `0 4px 12px ${accent}40`,
              }}>{act.icon}</div>
            ) : (
              <span style={{ fontSize: 20, lineHeight: 1 }}>{act.icon}</span>
            )}
            <span style={{
              fontFamily: T.font.body, fontSize: 10, color: act.accent ? accent : T.color.muted,
              fontWeight: act.accent ? 600 : 400,
            }}>{act.label}</span>
          </button>
        ))}
        {/* More button */}
        <button onClick={props.onToggleMore} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          padding: "8px 4px", border: "none", background: "transparent", cursor: "pointer",
          minHeight: 48, justifyContent: "center",
        }}>
          <span style={{ fontSize: 20, lineHeight: 1, transform: moreMenuOpen ? "rotate(45deg)" : "none", transition: "transform .2s" }}>
            {moreMenuOpen ? "+" : "\u22EF"}
          </span>
          <span style={{ fontFamily: T.font.body, fontSize: 10, color: T.color.muted }}>More</span>
        </button>
      </div>
    </>
  );
}
