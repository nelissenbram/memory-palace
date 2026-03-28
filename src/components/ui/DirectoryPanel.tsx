"use client";
import { useState, useMemo } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useRoomStore } from "@/lib/stores/roomStore";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import { useMemoryStore } from "@/lib/stores/memoryStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import { useTranslation } from "@/lib/hooks/useTranslation";

const TYPE_ICONS: Record<string,string> = {
  photo:"\u{1F5BC}\uFE0F",video:"\u{1F3AC}",album:"\u{1F4D6}",orb:"\u{1F52E}","case":"\u{1F3FA}",voice:"\u{1F399}\uFE0F",document:"\u{1F4DC}",
};

interface DirectoryPanelProps {
  onClose: () => void;
}

export default function DirectoryPanel({onClose}: DirectoryPanelProps){
  const { t } = useTranslation("directoryPanel");
  const isMobile = useIsMobile();
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const [query,setQuery]=useState("");
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const { userMems, setSelMem } = useMemoryStore();
  const { enterWing, enterRoom, activeWing, activeRoomId } = usePalaceStore();
  const { getWingRooms, getWings } = useRoomStore();
  const WINGS = getWings();

  const q=query.toLowerCase();

  // Build full tree with search filtering
  const tree=useMemo(()=>{
    return WINGS.map(wing=>{
      const rooms=getWingRooms(wing.id).map(room=>{
        const mems: Mem[]=userMems[room.id]||ROOM_MEMS[room.id]||[];
        const filteredMems=q?mems.filter(m=>m.title.toLowerCase().includes(q)||(m.desc||"").toLowerCase().includes(q)):mems;
        return { ...room, mems, filteredMems, matchesSearch: !q || filteredMems.length>0 || room.name.toLowerCase().includes(q) };
      });
      const matchingRooms=q?rooms.filter(r=>r.matchesSearch):rooms;
      return { ...wing, rooms, matchingRooms, totalMems: rooms.reduce((n,r)=>n+r.mems.length,0) };
    });
  },[userMems,q,getWingRooms]);

  const toggle=(id: string)=>setExpanded(prev=>({...prev,[id]:!prev[id]}));

  const navigateToRoom=(wingId: string,roomId: string)=>{
    if(activeWing!==wingId){
      // Need to enter wing first, then room
      enterWing(wingId);
      setTimeout(()=>enterRoom(roomId),600);
    } else {
      enterRoom(roomId);
    }
    onClose();
  };

  const openMemory=(mem: Mem)=>{
    setSelMem(mem);
  };

  const totalMems=tree.reduce((n,w)=>n+w.totalMems,0);

  return(
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(42,34,24,.4)",backdropFilter:"blur(8px)",zIndex:55,animation:"fadeIn .2s ease"}}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e)=>{if(e.key==="Escape")onClose();handleKeyDown(e);}} onClick={e=>e.stopPropagation()} style={{position:"absolute",left:0,top:0,bottom:0,width:isMobile?"100%":"min(23.75rem, 92vw)",background:`${T.color.linen}f8`,backdropFilter:"blur(20px)",borderRight:isMobile?"none":`1px solid ${T.color.cream}`,padding:0,overflowY:"auto",animation:"slideInLeft .3s cubic-bezier(.23,1,.32,1)"}}>
        <style>{`@keyframes slideInLeft{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{padding:"1.5rem 1.5rem 0",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
          <div>
            <h3 style={{fontFamily:T.font.display,fontSize:"1.375rem",fontWeight:500,color:T.color.charcoal,margin:0}}>{t("title")}</h3>
            <p style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,margin:"0.25rem 0 0"}}>{t("summary", { wings: String(WINGS.length), memories: String(totalMems) })}</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{width:"2rem",height:"2rem",borderRadius:"1rem",border:`1px solid ${T.color.cream}`,background:T.color.warmStone,color:T.color.muted,fontSize:"0.875rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>&#x2715;</button>
        </div>

        {/* Search */}
        <div style={{padding:"0 1.5rem",marginBottom:"1rem"}}>
          <div style={{background:T.color.white,borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`,padding:"0.5rem 0.75rem",display:"flex",alignItems:"center",gap:"0.5rem"}}>
            <span style={{fontSize:"0.8125rem",opacity:.5}}>{"\uD83D\uDD0D"}</span>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t("searchPlaceholder")}
              style={{flex:1,border:"none",background:"transparent",fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.charcoal,outline:"none"}}/>
            {query&&<button onClick={()=>setQuery("")} aria-label="Clear search" style={{background:"none",border:"none",color:T.color.muted,fontSize:"0.75rem",cursor:"pointer"}}>&#x2715;</button>}
          </div>
        </div>

        {/* Tree */}
        <div style={{padding:"0 0.75rem 1.5rem"}}>
          {tree.map(wing=>{
            const wingExpanded=expanded[wing.id]??(!q);
            const rooms=q?wing.matchingRooms:wing.rooms;
            if(q&&rooms.length===0) return null;
            const isActive=activeWing===wing.id;

            return(
              <div key={wing.id} style={{marginBottom:"0.125rem"}}>
                {/* Wing row */}
                <button onClick={()=>toggle(wing.id)}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:"0.625rem",padding:"0.625rem 0.75rem",borderRadius:"0.625rem",border:"none",
                    background:isActive?`${wing.accent}10`:"transparent",cursor:"pointer",textAlign:"left",transition:"background .15s"}}>
                  <span style={{fontSize:"0.625rem",color:T.color.muted,transition:"transform .2s",transform:wingExpanded?"rotate(90deg)":"rotate(0)"}}>&#x25B6;</span>
                  <span style={{fontSize:"1.125rem"}}>{wing.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:T.font.display,fontSize:"0.875rem",fontWeight:500,color:isActive?wing.accent:T.color.charcoal}}>{wing.name}</div>
                    <div style={{fontFamily:T.font.body,fontSize:"0.625rem",color:T.color.muted}}>{t("wingSummary", { rooms: String(wing.rooms.length), memories: String(wing.totalMems) })}</div>
                  </div>
                </button>

                {/* Rooms */}
                {wingExpanded&&<div style={{paddingLeft:"1.125rem"}}>
                  {rooms.map(room=>{
                    const roomExpanded=expanded[room.id]??(!!q);
                    const mems=q?room.filteredMems:room.mems;
                    const isRoomActive=activeWing===wing.id&&activeRoomId===room.id;

                    return(
                      <div key={room.id} style={{marginBottom:"0.0625rem"}}>
                        {/* Room row */}
                        <div style={{display:"flex",alignItems:"center",gap:"0.125rem"}}>
                          <button onClick={()=>toggle(room.id)}
                            style={{flex:1,display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.4375rem 0.625rem",borderRadius:"0.5rem",border:"none",
                              background:isRoomActive?`${wing.accent}12`:"transparent",cursor:"pointer",textAlign:"left",transition:"background .15s"}}>
                            <span style={{fontSize:"0.5625rem",color:T.color.muted,transition:"transform .2s",transform:roomExpanded?"rotate(90deg)":"rotate(0)"}}>&#x25B6;</span>
                            <span style={{fontSize:"0.875rem"}}>{room.icon}</span>
                            <div style={{flex:1}}>
                              <div style={{fontFamily:T.font.body,fontSize:"0.75rem",fontWeight:isRoomActive?600:400,color:isRoomActive?wing.accent:T.color.charcoal}}>{room.name}</div>
                              <div style={{fontFamily:T.font.body,fontSize:"0.5625rem",color:T.color.muted}}>{t("roomMemories", { count: String(room.mems.length) })}{room.shared?` · ${t("shared")}`:""}</div>
                            </div>
                          </button>
                          <button onClick={()=>navigateToRoom(wing.id,room.id)} title={t("openIn3d")}
                            style={{width:"1.625rem",height:"1.625rem",borderRadius:"0.5rem",border:`1px solid ${T.color.cream}`,background:T.color.warmStone,
                              fontSize:"0.6875rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.color.muted,flexShrink:0}}>
                            {"\uD83C\uDFDB\uFE0F"}
                          </button>
                        </div>

                        {/* Memories */}
                        {roomExpanded&&mems.length>0&&<div style={{paddingLeft:"1.5rem",paddingBottom:"0.25rem"}}>
                          {mems.map(mem=>(
                            <button key={mem.id} onClick={()=>openMemory(mem)}
                              style={{width:"100%",display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.3125rem 0.625rem",borderRadius:"0.375rem",border:"none",
                                background:"transparent",cursor:"pointer",textAlign:"left",transition:"background .1s"}}
                              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${T.color.warmStone}`;}}
                              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="transparent";}}>
                              <div style={{width:"0.5rem",height:"0.5rem",borderRadius:"0.25rem",background:`hsl(${mem.hue},${mem.s}%,${mem.l}%)`,flexShrink:0}}/>
                              <div style={{flex:1,overflow:"hidden"}}>
                                <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.charcoal,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                                  {q?highlightMatch(mem.title,q):mem.title}
                                </div>
                              </div>
                              <span style={{fontSize:"0.625rem",opacity:.5}}>{TYPE_ICONS[mem.type]||""}</span>
                            </button>
                          ))}
                        </div>}
                        {roomExpanded&&mems.length===0&&!q&&<div style={{paddingLeft:"2.125rem",paddingBottom:"0.25rem"}}>
                          <span style={{fontFamily:T.font.body,fontSize:"0.625rem",color:T.color.muted,fontStyle:"italic"}}>{t("emptyRoom")}</span>
                        </div>}
                      </div>
                    );
                  })}
                </div>}
              </div>
            );
          })}
          {q&&tree.every(w=>w.matchingRooms.length===0)&&<div style={{textAlign:"center",padding:"2rem 0"}}>
            <div style={{fontSize:"1.5rem",marginBottom:"0.5rem",opacity:.4}}>{"\uD83D\uDD0D"}</div>
            <p style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.muted}}>{t("noMatching", { query })}</p>
          </div>}
        </div>
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string){
  const idx=text.toLowerCase().indexOf(query);
  if(idx===-1) return text;
  return <>{text.slice(0,idx)}<span style={{background:`${T.color.terracotta}25`,borderRadius:2,padding:"0 1px"}}>{text.slice(idx,idx+query.length)}</span>{text.slice(idx+query.length)}</>;
}
