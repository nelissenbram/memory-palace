"use client";
import { T } from "@/lib/theme";
import { WING_ROOMS } from "@/lib/constants/wings";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { ROOM_MEMS } from "@/lib/constants/defaults";

interface WingTooltipProps {
  wing: Wing;
}

export function WingTooltip({wing}: WingTooltipProps){
  const roomCount=(WING_ROOMS[wing.id]||[]).length;
  return(
    <div style={{position:"absolute",bottom:26,left:"50%",transform:"translateX(-50%)",background:`${T.color.white}ee`,backdropFilter:"blur(12px)",borderRadius:14,padding:"12px 22px",border:`1px solid ${T.color.cream}`,boxShadow:"0 4px 24px rgba(44,44,42,.08)",display:"flex",alignItems:"center",gap:12,animation:"fadeUp .2s ease",zIndex:20,pointerEvents:"none"}}>
      <span style={{fontSize:26}}>{wing.icon}</span>
      <div>
        <div style={{fontFamily:T.font.display,fontSize:18,fontWeight:500,color:T.color.charcoal}}>{wing.name} Wing</div>
        <div style={{fontFamily:T.font.body,fontSize:12,color:wing.accent}}>{roomCount} rooms inside</div>
      </div>
    </div>
  );
}

interface DoorTooltipProps {
  room: WingRoom;
  wingAccent?: string;
}

export function DoorTooltip({room,wingAccent}: DoorTooltipProps){
  const mc=(ROOM_MEMS[room.id]||[]).length;
  return(
    <div style={{position:"absolute",bottom:80,left:"50%",transform:"translateX(-50%)",background:`${T.color.white}ee`,backdropFilter:"blur(12px)",borderRadius:14,padding:"12px 22px",border:`1px solid ${T.color.cream}`,boxShadow:"0 4px 24px rgba(44,44,42,.08)",display:"flex",alignItems:"center",gap:12,animation:"fadeUp .2s ease",zIndex:20,pointerEvents:"none"}}>
      <span style={{fontSize:26}}>{room.icon}</span>
      <div>
        <div style={{fontFamily:T.font.display,fontSize:18,fontWeight:500,color:T.color.charcoal}}>{room.name}</div>
        <div style={{fontFamily:T.font.body,fontSize:12,color:wingAccent,display:"flex",gap:8}}>
          <span>{mc} {mc===1?"memory":"memories"}</span>
          {room.shared&&<span style={{color:"#4A6741"}}>Shared with {room.sharedWith.length}</span>}
        </div>
      </div>
    </div>
  );
}
