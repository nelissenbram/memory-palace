"use client";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { useRoomStore } from "@/lib/stores/roomStore";
import { ROOM_MEMS } from "@/lib/constants/defaults";
import { WingIcon, RoomIcon } from "./WingRoomIcons";

interface WingTooltipProps {
  wing: Wing;
}

export function WingTooltip({wing}: WingTooltipProps){
  const isMobile = useIsMobile();
  const { t } = useTranslation("hoverTooltip");
  const { t: tWings } = useTranslation("wings");
  const { getWingRooms } = useRoomStore();
  const roomCount=getWingRooms(wing.id).length;
  // On mobile, position at bottom above potential bottom bar
  return(
    <div style={{position:"absolute",bottom:isMobile?"5rem":"1.625rem",left:"50%",transform:"translateX(-50%)",background:`${T.color.white}ee`,backdropFilter:"blur(12px)",borderRadius:"0.875rem",padding:"0.75rem 1.375rem",border:`1px solid ${T.color.cream}`,boxShadow:"0 4px 24px rgba(44,44,42,.08)",display:"flex",alignItems:"center",gap:"0.75rem",animation:"fadeUp .2s ease",zIndex:20,pointerEvents:"none",maxWidth:isMobile?"calc(100vw - 2rem)":undefined}}>
      <span style={{display:"inline-flex",flexShrink:0}}><WingIcon wingId={wing.id} size={28} color={wing.accent} /></span>
      <div>
        <div style={{fontFamily:T.font.display,fontSize:"1.125rem",fontWeight:500,color:T.color.charcoal}}>{t("wingLabel", { name: tWings(wing.nameKey) || wing.name })}</div>
        <div style={{fontFamily:T.font.body,fontSize:"0.75rem",color:wing.accent}}>{t("roomsInside", { count: String(roomCount) })}</div>
      </div>
    </div>
  );
}

interface DoorTooltipProps {
  room: WingRoom;
  wingAccent?: string;
  wingId?: string;
}

export function DoorTooltip({room,wingAccent,wingId}: DoorTooltipProps){
  const isMobile = useIsMobile();
  const { t } = useTranslation("hoverTooltip");
  const { t: tWings } = useTranslation("wings");
  const mc=(ROOM_MEMS[room.id]||[]).length;
  return(
    <div style={{position:"absolute",bottom:isMobile?"5rem":"5rem",left:"50%",transform:"translateX(-50%)",background:`${T.color.white}ee`,backdropFilter:"blur(12px)",borderRadius:"0.875rem",padding:"0.75rem 1.375rem",border:`1px solid ${T.color.cream}`,boxShadow:"0 4px 24px rgba(44,44,42,.08)",display:"flex",alignItems:"center",gap:"0.75rem",animation:"fadeUp .2s ease",zIndex:20,pointerEvents:"none",maxWidth:isMobile?"calc(100vw - 2rem)":undefined}}>
      <span style={{display:"inline-flex",flexShrink:0}}><RoomIcon roomId={room.id} wingId={wingId} size={28} color={wingAccent||T.color.terracotta} /></span>
      <div>
        <div style={{fontFamily:T.font.display,fontSize:"1.125rem",fontWeight:500,color:T.color.charcoal}}>{(room.nameKey && tWings(room.nameKey)) || room.name}</div>
        <div style={{fontFamily:T.font.body,fontSize:"0.75rem",color:wingAccent,display:"flex",gap:"0.5rem"}}>
          <span>{mc===1?t("memory", { count: String(mc) }):t("memories", { count: String(mc) })}</span>
          {room.shared&&<span style={{color:T.color.sage}}>{t("sharedWith", { count: String(room.sharedWith.length) })}</span>}
        </div>
      </div>
    </div>
  );
}
