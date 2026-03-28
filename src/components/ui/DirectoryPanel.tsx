"use client";
import { useState, useMemo } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
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
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",left:0,top:0,bottom:0,width:isMobile?"100%":"min(380px, 92vw)",background:`${T.color.linen}f8`,backdropFilter:"blur(20px)",borderRight:isMobile?"none":`1px solid ${T.color.cream}`,padding:0,overflowY:"auto",animation:"slideInLeft .3s cubic-bezier(.23,1,.32,1)"}}>
        <style>{`@keyframes slideInLeft{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{padding:"24px 24px 0",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <h3 style={{fontFamily:T.font.display,fontSize:22,fontWeight:500,color:T.color.charcoal,margin:0}}>{t("title")}</h3>
            <p style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,margin:"4px 0 0"}}>{t("summary", { wings: String(WINGS.length), memories: String(totalMems) })}</p>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:16,border:`1px solid ${T.color.cream}`,background:T.color.warmStone,color:T.color.muted,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* Search */}
        <div style={{padding:"0 24px",marginBottom:16}}>
          <div style={{background:T.color.white,borderRadius:10,border:`1px solid ${T.color.cream}`,padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:13,opacity:.5}}>🔍</span>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t("searchPlaceholder")}
              style={{flex:1,border:"none",background:"transparent",fontFamily:T.font.body,fontSize:13,color:T.color.charcoal,outline:"none"}}/>
            {query&&<button onClick={()=>setQuery("")} style={{background:"none",border:"none",color:T.color.muted,fontSize:12,cursor:"pointer"}}>✕</button>}
          </div>
        </div>

        {/* Tree */}
        <div style={{padding:"0 12px 24px"}}>
          {tree.map(wing=>{
            const wingExpanded=expanded[wing.id]??(!q);
            const rooms=q?wing.matchingRooms:wing.rooms;
            if(q&&rooms.length===0) return null;
            const isActive=activeWing===wing.id;

            return(
              <div key={wing.id} style={{marginBottom:2}}>
                {/* Wing row */}
                <button onClick={()=>toggle(wing.id)}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"none",
                    background:isActive?`${wing.accent}10`:"transparent",cursor:"pointer",textAlign:"left",transition:"background .15s"}}>
                  <span style={{fontSize:10,color:T.color.muted,transition:"transform .2s",transform:wingExpanded?"rotate(90deg)":"rotate(0)"}}>▶</span>
                  <span style={{fontSize:18}}>{wing.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:T.font.display,fontSize:14,fontWeight:500,color:isActive?wing.accent:T.color.charcoal}}>{wing.name}</div>
                    <div style={{fontFamily:T.font.body,fontSize:10,color:T.color.muted}}>{t("wingSummary", { rooms: String(wing.rooms.length), memories: String(wing.totalMems) })}</div>
                  </div>
                </button>

                {/* Rooms */}
                {wingExpanded&&<div style={{paddingLeft:18}}>
                  {rooms.map(room=>{
                    const roomExpanded=expanded[room.id]??(!!q);
                    const mems=q?room.filteredMems:room.mems;
                    const isRoomActive=activeWing===wing.id&&activeRoomId===room.id;

                    return(
                      <div key={room.id} style={{marginBottom:1}}>
                        {/* Room row */}
                        <div style={{display:"flex",alignItems:"center",gap:2}}>
                          <button onClick={()=>toggle(room.id)}
                            style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,border:"none",
                              background:isRoomActive?`${wing.accent}12`:"transparent",cursor:"pointer",textAlign:"left",transition:"background .15s"}}>
                            <span style={{fontSize:9,color:T.color.muted,transition:"transform .2s",transform:roomExpanded?"rotate(90deg)":"rotate(0)"}}>▶</span>
                            <span style={{fontSize:14}}>{room.icon}</span>
                            <div style={{flex:1}}>
                              <div style={{fontFamily:T.font.body,fontSize:12,fontWeight:isRoomActive?600:400,color:isRoomActive?wing.accent:T.color.charcoal}}>{room.name}</div>
                              <div style={{fontFamily:T.font.body,fontSize:9,color:T.color.muted}}>{t("roomMemories", { count: String(room.mems.length) })}{room.shared?` · ${t("shared")}`:""}</div>
                            </div>
                          </button>
                          <button onClick={()=>navigateToRoom(wing.id,room.id)} title={t("openIn3d")}
                            style={{width:26,height:26,borderRadius:8,border:`1px solid ${T.color.cream}`,background:T.color.warmStone,
                              fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.color.muted,flexShrink:0}}>
                            🏛️
                          </button>
                        </div>

                        {/* Memories */}
                        {roomExpanded&&mems.length>0&&<div style={{paddingLeft:24,paddingBottom:4}}>
                          {mems.map(mem=>(
                            <button key={mem.id} onClick={()=>openMemory(mem)}
                              style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"5px 10px",borderRadius:6,border:"none",
                                background:"transparent",cursor:"pointer",textAlign:"left",transition:"background .1s"}}
                              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${T.color.warmStone}`;}}
                              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="transparent";}}>
                              <div style={{width:8,height:8,borderRadius:4,background:`hsl(${mem.hue},${mem.s}%,${mem.l}%)`,flexShrink:0}}/>
                              <div style={{flex:1,overflow:"hidden"}}>
                                <div style={{fontFamily:T.font.body,fontSize:11,color:T.color.charcoal,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                                  {q?highlightMatch(mem.title,q):mem.title}
                                </div>
                              </div>
                              <span style={{fontSize:10,opacity:.5}}>{TYPE_ICONS[mem.type]||""}</span>
                            </button>
                          ))}
                        </div>}
                        {roomExpanded&&mems.length===0&&!q&&<div style={{paddingLeft:34,paddingBottom:4}}>
                          <span style={{fontFamily:T.font.body,fontSize:10,color:T.color.muted,fontStyle:"italic"}}>{t("emptyRoom")}</span>
                        </div>}
                      </div>
                    );
                  })}
                </div>}
              </div>
            );
          })}
          {q&&tree.every(w=>w.matchingRooms.length===0)&&<div style={{textAlign:"center",padding:"32px 0"}}>
            <div style={{fontSize:24,marginBottom:8,opacity:.4}}>🔍</div>
            <p style={{fontFamily:T.font.body,fontSize:13,color:T.color.muted}}>{t("noMatching", { query })}</p>
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
