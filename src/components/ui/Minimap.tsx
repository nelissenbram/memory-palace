"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useRoomStore } from "@/lib/stores/roomStore";

export default function Minimap(){
  const isMobile = useIsMobile();
  const { view, activeWing, activeRoomId, exitToPalace, enterRoom, switchWing } = usePalaceStore();
  const { getWingRooms, getWings } = useRoomStore();
  const WINGS = getWings();
  const [collapsed, setCollapsed] = useState(false);

  if(view==="exterior") return null;
  if(isMobile) return null; // Hidden on mobile — navigation via bottom bar + menu

  return(
    <div style={{position:"absolute",top:view==="room"?110:62,right:18,zIndex:25,animation:"fadeIn .5s ease .4s both",maxWidth:"min(220px, 40vw)"}}>
      <div style={{background:`${T.color.white}ee`,backdropFilter:"blur(12px)",borderRadius:14,border:`1px solid ${T.color.cream}`,padding:collapsed?8:12,boxShadow:"0 4px 20px rgba(44,44,42,.08)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:collapsed?0:8,cursor:"pointer"}} onClick={()=>setCollapsed(c=>!c)}>
          <div style={{fontFamily:T.font.body,fontSize:9,color:T.color.muted,textTransform:"uppercase",letterSpacing:"1px"}}>{collapsed?"\uD83D\uDDFA\uFE0F":"Palace map"}</div>
          <span style={{fontSize:9,color:T.color.muted}}>{collapsed?"\u25BC":"\u25B2"}</span>
        </div>
        {!collapsed&&<div style={{display:"flex",flexDirection:"column",gap:3}}>
          <button onClick={exitToPalace} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:8,border:"none",background:view==="exterior"?`${T.color.sandstone}30`:"transparent",cursor:"pointer",fontFamily:T.font.body,fontSize:10,color:T.color.muted,textAlign:"left"}}>
            <div style={{width:6,height:6,borderRadius:3,background:T.color.sandstone,opacity:view==="exterior"?1:.3}}/>Palace overview
          </button>
          {WINGS.map(w=>{
            const isActive=activeWing===w.id;const wRooms=getWingRooms(w.id);
            return <div key={w.id}>
              <button onClick={()=>switchWing(w.id)}
                style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:8,border:"none",background:isActive&&view==="corridor"?`${w.accent}18`:"transparent",cursor:"pointer",fontFamily:T.font.body,fontSize:10,color:isActive?w.accent:T.color.muted,fontWeight:isActive?600:400,textAlign:"left",width:"100%"}}>
                <div style={{width:6,height:6,borderRadius:3,background:w.accent,opacity:isActive?1:.25}}/>{w.icon} {w.name}
                <span style={{marginLeft:"auto",fontSize:9,opacity:.5}}>{wRooms.length}</span>
              </button>
              {isActive&&wRooms.map((r: any)=>{
                const isRoomActive=activeRoomId===r.id;
                return <button key={r.id} onClick={()=>{if(!isRoomActive)enterRoom(r.id);}}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"3px 8px 3px 22px",borderRadius:6,border:"none",background:isRoomActive?`${w.accent}12`:"transparent",cursor:"pointer",fontFamily:T.font.body,fontSize:9,color:isRoomActive?w.accent:`${T.color.muted}bb`,fontWeight:isRoomActive?500:400,textAlign:"left",width:"100%"}}>
                  <div style={{width:4,height:4,borderRadius:2,background:isRoomActive?w.accent:T.color.sandstone,opacity:isRoomActive?1:.3}}/>{r.icon} {r.name}
                  {r.shared&&<div style={{width:5,height:5,borderRadius:3,background:"#4A6741",marginLeft:"auto"}}/>}
                </button>;
              })}
            </div>;
          })}
        </div>}
      </div>
    </div>
  );
}
