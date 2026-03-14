"use client";
import { T } from "@/lib/theme";
import { signOut } from "@/lib/auth/actions";
import { WINGS } from "@/lib/constants/wings";
import { useUserStore } from "@/lib/stores/userStore";
import { usePalaceStore } from "@/lib/stores/palaceStore";
import type { Crumb } from "@/lib/hooks/useNavigation";

interface TopBarProps {
  crumbs: Crumb[];
}

export default function TopBar({crumbs}: TopBarProps){
  const { userName } = useUserStore();
  const { activeWing, switchWing } = usePalaceStore();

  return(
    <div style={{position:"absolute",top:0,left:0,right:0,height:54,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 22px",zIndex:40,background:"linear-gradient(180deg,rgba(221,213,200,.92),rgba(221,213,200,0))"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:30,height:30,borderRadius:7,background:`linear-gradient(135deg,${T.color.warmStone},${T.color.sandstone})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,border:`1px solid ${T.color.sandstone}`}}>{"\u{1F3DB}\uFE0F"}</div>
          {userName&&<span style={{fontFamily:T.font.display,fontSize:13,fontStyle:"italic",color:T.color.walnut}}>{userName}&#39;s Palace</span>}
          {/* Breadcrumb trail */}
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            {crumbs.map((c,i)=><span key={i} style={{display:"flex",alignItems:"center",gap:4}}>
              {i>0&&<span style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted}}>/</span>}
              {c.action?<button onClick={c.action} style={{fontFamily:T.font.display,fontSize:i===0?15:13,fontWeight:500,color:i===crumbs.length-1?T.color.charcoal:T.color.muted,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",textDecorationColor:`${T.color.sandstone}88`,textUnderlineOffset:3,padding:0}}>{c.label}</button>
              :<span style={{fontFamily:T.font.display,fontSize:i===0?15:13,fontWeight:500,color:T.color.charcoal}}>{c.label}</span>}
            </span>)}
          </div>
        </div>
      </div>
      {/* Wing pills */}
      <div style={{display:"flex",gap:4}}>{WINGS.map(w=><button key={w.id} onClick={()=>switchWing(w.id)} style={{padding:"4px 10px",borderRadius:16,fontFamily:T.font.body,fontSize:11,fontWeight:activeWing===w.id?600:400,border:activeWing===w.id?`1.5px solid ${w.accent}`:`1px solid ${T.color.cream}`,background:activeWing===w.id?`${w.accent}15`:`${T.color.white}bb`,color:activeWing===w.id?w.accent:T.color.muted,cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>
        <span style={{fontSize:11}}>{w.icon}</span>{w.name}</button>)}
        <button onClick={()=>signOut()} style={{padding:"4px 10px",borderRadius:16,fontFamily:T.font.body,fontSize:11,fontWeight:400,border:`1px solid ${T.color.cream}`,background:`${T.color.white}bb`,color:T.color.muted,cursor:"pointer",marginLeft:4}}>Sign out</button>
      </div>
    </div>
  );
}
