"use client";
import { T } from "@/lib/theme";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";

interface MemoryDetailProps {
  mem: Mem;
  room: WingRoom | null | undefined;
  wing: Wing | null | undefined;
  onClose: () => void;
  onDelete: (memId: string) => void;
}

export default function MemoryDetail({mem,room,wing,onClose,onDelete}: MemoryDetailProps){
  return(
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(42,34,24,.5)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.color.linen,borderRadius:20,border:`1px solid ${T.color.cream}`,boxShadow:"0 16px 70px rgba(44,44,42,.2)",maxWidth:480,width:"90%",overflow:"hidden",animation:"fadeUp .3s cubic-bezier(.23,1,.32,1)"}}>
        <div style={{height:180,background:`linear-gradient(145deg,hsl(${mem.hue},${mem.s}%,${mem.l}%),hsl(${mem.hue+18},${mem.s-5}%,${mem.l-6}%))`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          <span style={{fontSize:48,opacity:.25}}>{"\u{1F5BC}\uFE0F"}</span>
          <div style={{position:"absolute",bottom:14,left:18}}>
            <div style={{fontFamily:T.font.display,fontSize:24,color:"rgba(255,255,255,.9)",textShadow:"0 2px 8px rgba(0,0,0,.3)"}}>{mem.title}</div>
          </div>
        </div>
        <div style={{padding:"20px 24px 24px"}}>
          <p style={{fontFamily:T.font.body,fontSize:14,color:T.color.walnut,lineHeight:1.7,fontStyle:"italic",marginBottom:20}}>
            This memory lives in: {room?room.name:"Unknown room"}
          </p>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{onDelete(mem.id);onClose();}} style={{flex:1,padding:12,fontFamily:T.font.body,fontSize:13,background:"transparent",border:"1px solid #D0606080",borderRadius:10,cursor:"pointer",color:"#C05050"}}>Delete</button>
            <button onClick={onClose} style={{flex:1,padding:12,fontFamily:T.font.body,fontSize:13,background:"transparent",border:`1px solid ${T.color.cream}`,borderRadius:10,cursor:"pointer",color:T.color.muted}}>Close</button>
            <button style={{flex:2,padding:12,fontFamily:T.font.body,fontSize:13,fontWeight:600,background:wing?.accent||T.color.terracotta,border:"none",borderRadius:10,cursor:"pointer",color:T.color.white}}>Edit memory</button>
          </div>
        </div>
      </div>
    </div>
  );
}
