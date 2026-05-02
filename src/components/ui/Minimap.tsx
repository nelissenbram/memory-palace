"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useTranslation } from "@/lib/hooks/useTranslation";

export default function Minimap(){
  const { t } = useTranslation("minimap");
  const isMobile = useIsMobile();
  const { view, activeWing, activeRoomId, exitToPalace, enterRoom, switchWing } = usePalaceStore();
  const { getWingRooms, getWings } = useRoomStore();
  const WINGS = getWings();
  const [collapsed, setCollapsed] = useState(false);

  if(view==="exterior") return null;
  if(isMobile) return null; // Hidden on mobile — navigation via bottom bar + menu

  return(
    <nav aria-label={t("palaceMap")} style={{position:"absolute",top:view==="room"?"6.875rem":"3.875rem",right:"1.125rem",zIndex:25,animation:"fadeIn .5s ease .4s both",maxWidth:"min(220px, 40vw)"}}>
      <div style={{background:`${T.color.white}ee`,backdropFilter:"blur(12px)",borderRadius:"0.875rem",border:`1px solid ${T.color.cream}`,padding:collapsed?"0.5rem":"0.75rem",boxShadow:"0 4px 20px rgba(44,44,42,.08)"}}>
        <button aria-expanded={!collapsed} aria-label={t("palaceMap")} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:collapsed?0:"0.5rem",cursor:"pointer",width:"100%",background:"none",border:"none",padding:0}} onClick={()=>setCollapsed(c=>!c)}>
          <span style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,textTransform:"uppercase",letterSpacing:"0.0625rem"}}>{collapsed?<span aria-hidden="true">{"\uD83D\uDDFA\uFE0F"}</span>:t("palaceMap")}</span>
          <span aria-hidden="true" style={{fontSize:"0.6875rem",color:T.color.muted}}>{collapsed?"\u25BC":"\u25B2"}</span>
        </button>
        {!collapsed&&<div style={{display:"flex",flexDirection:"column",gap:"0.1875rem"}}>
          <button onClick={exitToPalace} aria-label={t("palaceOverview")} style={{display:"flex",alignItems:"center",gap:"0.375rem",padding:"0.25rem 0.5rem",borderRadius:"0.5rem",border:"none",background:view==="exterior"?`${T.color.sandstone}30`:"transparent",cursor:"pointer",fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,textAlign:"left"}}>
            <div style={{width:"0.375rem",height:"0.375rem",borderRadius:"0.1875rem",background:T.color.sandstone,opacity:view==="exterior"?1:.3}}/>{t("palaceOverview")}
          </button>
          {WINGS.map(w=>{
            const isActive=activeWing===w.id;const wRooms=getWingRooms(w.id);
            return <div key={w.id}>
              <button onClick={()=>switchWing(w.id)} aria-label={w.name}
                style={{display:"flex",alignItems:"center",gap:"0.375rem",padding:"0.25rem 0.5rem",borderRadius:"0.5rem",border:"none",background:isActive&&view==="corridor"?`${w.accent}18`:"transparent",cursor:"pointer",fontFamily:T.font.body,fontSize:"0.6875rem",color:isActive?w.accent:T.color.muted,fontWeight:isActive?600:500,textAlign:"left",width:"100%"}}>
                <div style={{width:"0.375rem",height:"0.375rem",borderRadius:"0.1875rem",background:w.accent,opacity:isActive?1:.25}}/>{w.icon} {w.name}
                <span style={{marginLeft:"auto",fontSize:"0.6875rem",opacity:.5}}>{wRooms.length}</span>
              </button>
              {isActive&&wRooms.map((r: any)=>{
                const isRoomActive=activeRoomId===r.id;
                return <button key={r.id} onClick={()=>{if(!isRoomActive)enterRoom(r.id);}} aria-label={r.name}
                  style={{display:"flex",alignItems:"center",gap:"0.3125rem",padding:"0.1875rem 0.5rem 0.1875rem 1.375rem",borderRadius:"0.375rem",border:"none",background:isRoomActive?`${w.accent}12`:"transparent",cursor:"pointer",fontFamily:T.font.body,fontSize:"0.6875rem",color:isRoomActive?w.accent:`${T.color.muted}bb`,fontWeight:isRoomActive?500:500,textAlign:"left",width:"100%"}}>
                  <div style={{width:"0.375rem",height:"0.375rem",borderRadius:"0.1875rem",background:isRoomActive?w.accent:T.color.sandstone,opacity:isRoomActive?1:.3}}/>{r.icon} {r.name}
                  {r.shared&&<div style={{width:"0.3125rem",height:"0.3125rem",borderRadius:"0.1875rem",background:"#4A6741",marginLeft:"auto"}}/>}
                </button>;
              })}
            </div>;
          })}
        </div>}
      </div>
    </nav>
  );
}
