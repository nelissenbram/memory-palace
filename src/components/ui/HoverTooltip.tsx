"use client";
import { T } from "@/lib/theme";
import { INK, HAIRLINE, SHADOW } from "@/lib/libraryTokens";
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
    <div className="mp-hover-tip-anim" style={{position:"absolute",bottom:isMobile?"5rem":"1.625rem",left:"50%",transform:"translateX(-50%)",background:"rgba(252,250,245,0.93)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:"0.875rem",padding:"0.75rem 1.375rem",border:`1px solid ${HAIRLINE}`,boxShadow:SHADOW[2],display:"flex",alignItems:"center",gap:"0.75rem",animation:"fadeUp .2s ease",zIndex:20,pointerEvents:"none",maxWidth:isMobile?"calc(100vw - 2rem)":undefined}}>
      <style>{`@media (prefers-reduced-motion: reduce) { .mp-hover-tip-anim { animation: none !important; } }`}</style>
      <span style={{display:"inline-flex",flexShrink:0}}><WingIcon wingId={wing.id} size={28} color={wing.accent} /></span>
      <div>
        <div style={{fontFamily:T.font.display,fontSize:"1.125rem",fontWeight:600,color:INK}}>{t("wingLabel", { name: tWings(wing.nameKey) || wing.name })}</div>
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
    <div className="mp-hover-tip-anim" style={{position:"absolute",bottom:isMobile?"5rem":"5rem",left:"50%",transform:"translateX(-50%)",background:"rgba(252,250,245,0.93)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:"0.875rem",padding:"0.75rem 1.375rem",border:`1px solid ${HAIRLINE}`,boxShadow:SHADOW[2],display:"flex",alignItems:"center",gap:"0.75rem",animation:"fadeUp .2s ease",zIndex:20,pointerEvents:"none",maxWidth:isMobile?"calc(100vw - 2rem)":undefined}}>
      <style>{`@media (prefers-reduced-motion: reduce) { .mp-hover-tip-anim { animation: none !important; } }`}</style>
      <span style={{display:"inline-flex",flexShrink:0}}><RoomIcon roomId={room.id} wingId={wingId} size={28} color={wingAccent||T.color.terracotta} /></span>
      <div>
        <div style={{fontFamily:T.font.display,fontSize:"1.125rem",fontWeight:600,color:INK}}>{(room.nameKey && tWings(room.nameKey)) || room.name}</div>
        <div style={{fontFamily:T.font.body,fontSize:"0.75rem",color:wingAccent,display:"flex",gap:"0.5rem"}}>
          <span>{mc===1?t("memory", { count: String(mc) }):t("memories", { count: String(mc) })}</span>
          {room.shared&&<span style={{color:T.color.sage}}>{t("sharedWith", { count: String(room.sharedWith.length) })}</span>}
        </div>
      </div>
    </div>
  );
}
