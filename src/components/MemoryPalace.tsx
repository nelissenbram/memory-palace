"use client";
import { useEffect } from "react";
import { T } from "@/lib/theme";
import { WING_ROOMS } from "@/lib/constants/wings";
import { useUserStore } from "@/lib/stores/userStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { useNavigation } from "@/lib/hooks/useNavigation";
import { useRoomMemories } from "@/lib/hooks/useRoomMemories";
import OnboardingWizard from "@/components/ui/OnboardingWizard";
import TopBar from "@/components/ui/TopBar";
import Minimap from "@/components/ui/Minimap";
import { WingTooltip, DoorTooltip } from "@/components/ui/HoverTooltip";
import UploadPanel from "@/components/ui/UploadPanel";
import SharingPanel from "@/components/ui/SharingPanel";
import MemoryDetail from "@/components/ui/MemoryDetail";
import ExteriorScene from "@/components/3d/ExteriorScene";
import InteriorScene from "@/components/3d/InteriorScene";
import CorridorScene from "@/components/3d/CorridorScene";

// ═══ MAIN — 3-level navigation: exterior → corridor → room ═══
export default function MemoryPalace(){
  // ── Stores ──
  const { profileLoading, onboarded, firstWing,
    loadProfile, finishOnboarding } = useUserStore();
  const { view, activeWing, activeRoomId, hovWing, hovDoor, opacity, portalAnim,
    setHovWing, setHovDoor, enterWing, enterRoom } = usePalaceStore();
  const { selMem, showUpload, showSharing,
    setSelMem, setShowUpload, setShowSharing } = useMemoryStore();

  // ── Hooks ──
  const { wingData, hovWingData, activeRoomData, crumbs, handleMemClick } = useNavigation();
  const { roomMems, roomMemsKey, handleAddMemory, handleDeleteMemory, currentSharing, updateSharing } = useRoomMemories();

  // Load profile on mount
  useEffect(()=>{ loadProfile(); },[loadProfile]);

  // Onboarding finish with wing entrance
  const handleFinishOnboarding=async()=>{
    await finishOnboarding();
    if(firstWing) setTimeout(()=>enterWing(firstWing),800);
  };

  // Show loading while checking profile
  if(profileLoading){
    return(<div style={{width:"100vw",height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:`linear-gradient(165deg,${T.color.linen} 0%,${T.color.warmStone} 50%,${T.color.sandstone} 100%)`,fontFamily:T.font.display}}>
      <div style={{fontSize:48,marginBottom:20}}>🏛️</div>
      <div style={{fontSize:28,fontWeight:300,color:T.color.charcoal}}>The Memory Palace</div>
      <div style={{fontSize:14,color:T.color.muted,marginTop:12,fontFamily:T.font.body}}>Loading your palace...</div>
    </div>);
  }

  if(!onboarded) return <OnboardingWizard onFinish={handleFinishOnboarding}/>;

  // Resolve hovered door room data for tooltip
  const hovDoorRoom=hovDoor&&activeWing?(WING_ROOMS[activeWing]||[]).find(r=>r.id===hovDoor)??null:null;

  return(
    <div style={{width:"100vw",height:"100vh",background:"#DDD5C8",position:"relative",overflow:"hidden"}}>
      <style>{`*{box-sizing:border-box;margin:0}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes portalFlash{0%{opacity:0}30%{opacity:1}70%{opacity:1}100%{opacity:0}}`}</style>
      <div style={{position:"absolute",inset:0,opacity,transition:"opacity 0.4s ease"}}>
        {view==="exterior"&&<ExteriorScene onRoomHover={setHovWing} onRoomClick={enterWing} hoveredRoom={hovWing}/>}
        {view==="corridor"&&activeWing&&<CorridorScene wingId={activeWing} onDoorHover={setHovDoor} onDoorClick={enterRoom} hoveredDoor={hovDoor}/>}
        {view==="room"&&activeWing&&activeRoomId&&<InteriorScene key={roomMemsKey} roomId={activeWing} memories={roomMems} onMemoryClick={handleMemClick}/>}
      </div>

      <TopBar crumbs={crumbs}/>

      {/* Portal transition overlay */}
      {portalAnim&&<div style={{position:"absolute",inset:0,zIndex:45,pointerEvents:"none",animation:"portalFlash .5s ease both",background:"radial-gradient(ellipse at center,rgba(200,168,104,.6) 0%,rgba(200,168,104,.15) 40%,transparent 70%)"}}/>}

      <Minimap/>

      {/* Hover tooltips */}
      {hovWingData&&view==="exterior"&&<WingTooltip wing={hovWingData}/>}
      {hovDoorRoom&&view==="corridor"&&<DoorTooltip room={hovDoorRoom} wingAccent={wingData?.accent}/>}

      {/* Bottom hints */}
      {view==="exterior"&&!hovWing&&<div style={{position:"absolute",bottom:22,left:"50%",transform:"translateX(-50%)",animation:"fadeIn .8s ease .8s both",fontFamily:T.font.body,fontSize:11,color:T.color.muted,background:`${T.color.white}cc`,backdropFilter:"blur(8px)",padding:"7px 18px",borderRadius:16,border:`1px solid ${T.color.cream}`}}>Drag to orbit · Scroll to zoom · Click a wing to enter</div>}
      {view==="corridor"&&<div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",fontFamily:T.font.body,fontSize:11,color:T.color.muted,background:`${T.color.white}cc`,backdropFilter:"blur(10px)",padding:"7px 18px",borderRadius:16,border:`1px solid ${T.color.cream}`,animation:"fadeIn .6s ease .3s both",display:"flex",gap:14}}><span>Arrow keys to walk</span><span style={{color:T.color.sandstone}}>|</span><span>Drag to look</span><span style={{color:T.color.sandstone}}>|</span><span>Click a door to enter room</span></div>}
      {view==="room"&&<div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",fontFamily:T.font.body,fontSize:11,color:T.color.muted,background:`${T.color.white}cc`,backdropFilter:"blur(10px)",padding:"7px 18px",borderRadius:16,border:`1px solid ${T.color.cream}`,animation:"fadeIn .6s ease .3s both",display:"flex",gap:14}}><span>Drag to look</span><span style={{color:T.color.sandstone}}>|</span><span>Arrow keys to walk</span><span style={{color:T.color.sandstone}}>|</span><span>Click memories</span></div>}

      {/* Room info badge + sharing toggle */}
      {view==="room"&&activeRoomData&&activeRoomId&&(()=>{const rs=currentSharing(activeRoomId);return <div style={{position:"absolute",top:62,left:22,animation:"fadeIn .5s ease .4s both",display:"flex",gap:8,alignItems:"center",zIndex:30}}>
        <div style={{background:`${T.color.white}ee`,backdropFilter:"blur(10px)",borderRadius:12,padding:"8px 14px",border:`1px solid ${T.color.cream}`,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>{activeRoomData.icon}</span>
          <div><div style={{fontFamily:T.font.display,fontSize:14,fontWeight:500,color:T.color.charcoal}}>{activeRoomData.name}</div>
          <div style={{fontFamily:T.font.body,fontSize:10,color:T.color.muted}}>{roomMems.length} memories</div></div>
        </div>
        <button onClick={()=>setShowSharing(true)} style={{background:rs.shared?"#4A674118":`${T.color.white}ee`,backdropFilter:"blur(10px)",borderRadius:12,padding:"8px 14px",border:rs.shared?"1px solid #4A674133":`1px solid ${T.color.cream}`,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
          {rs.shared?<><div style={{width:8,height:8,borderRadius:4,background:"#4A6741"}}/><span style={{fontFamily:T.font.body,fontSize:11,color:"#4A6741",fontWeight:500}}>Shared ({rs.sharedWith.length})</span></>
          :<span style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted}}>Share room</span>}
        </button>
      </div>;})()}

      {/* FAB: Add memory */}
      {view==="room"&&activeRoomId&&!showUpload&&!showSharing&&!selMem&&<button onClick={()=>setShowUpload(true)} style={{position:"absolute",bottom:70,right:28,width:56,height:56,borderRadius:28,border:"none",background:`linear-gradient(135deg,${wingData?.accent||T.color.terracotta},${T.color.walnut})`,color:"#FFF",fontSize:28,fontWeight:300,cursor:"pointer",boxShadow:`0 8px 32px ${T.color.walnut}40`,display:"flex",alignItems:"center",justifyContent:"center",zIndex:35,animation:"fadeIn .4s ease .5s both",transition:"transform .2s, box-shadow .2s"}}
        onMouseEnter={e=>{(e.target as HTMLElement).style.transform="scale(1.1)";(e.target as HTMLElement).style.boxShadow=`0 12px 40px ${T.color.walnut}60`;}}
        onMouseLeave={e=>{(e.target as HTMLElement).style.transform="none";(e.target as HTMLElement).style.boxShadow=`0 8px 32px ${T.color.walnut}40`;}}>+</button>}

      {/* Panels + overlays */}
      {showUpload&&activeRoomId&&<UploadPanel wing={wingData} room={activeRoomData} onClose={()=>setShowUpload(false)} onAdd={handleAddMemory}/>}
      {showSharing&&activeRoomId&&<SharingPanel wing={wingData} room={activeRoomData} sharing={currentSharing(activeRoomId)} onUpdate={(u: any)=>updateSharing(activeRoomId,u)} onClose={()=>setShowSharing(false)}/>}
      {selMem&&<MemoryDetail mem={selMem} room={activeRoomData} wing={wingData} onClose={()=>setSelMem(null)} onDelete={handleDeleteMemory}/>}
    </div>
  );
}
