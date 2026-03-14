"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import type { SharingInfo } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";

interface SharingPanelProps {
  wing: Wing | null | undefined;
  room: WingRoom | null | undefined;
  sharing: SharingInfo;
  onUpdate: (updates: Partial<SharingInfo>) => void;
  onClose: () => void;
}

export default function SharingPanel({wing,room,sharing,onUpdate,onClose}: SharingPanelProps){
  const [email,setEmail]=useState("");
  const [copied,setCopied]=useState(false);
  const accent=wing?.accent||T.color.terracotta;

  const addPerson=()=>{
    if(!email.trim()||!email.includes("@"))return;
    onUpdate({shared:true,sharedWith:[...sharing.sharedWith,email.trim()]});
    setEmail("");
  };
  const removePerson=(e2: string)=>{
    const next=sharing.sharedWith.filter(x=>x!==e2);
    onUpdate({shared:next.length>0,sharedWith:next});
  };
  const toggleSharing=()=>{
    if(sharing.shared)onUpdate({shared:false,sharedWith:[]});
    else onUpdate({shared:true});
  };
  const copyLink=()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);};

  return(
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(42,34,24,.4)",backdropFilter:"blur(8px)",zIndex:55,animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:0,bottom:0,width:360,background:`${T.color.linen}f8`,backdropFilter:"blur(20px)",borderLeft:`1px solid ${T.color.cream}`,padding:"28px 24px",overflowY:"auto",animation:"slideInRight .3s cubic-bezier(.23,1,.32,1)"}}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            <h3 style={{fontFamily:T.font.display,fontSize:22,fontWeight:500,color:T.color.charcoal,margin:0}}>Share room</h3>
            <p style={{fontFamily:T.font.body,fontSize:12,color:accent,margin:"4px 0 0"}}>{room?.icon} {room?.name}</p>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:16,border:`1px solid ${T.color.cream}`,background:T.color.warmStone,color:T.color.muted,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {/* Toggle */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:T.color.warmStone,borderRadius:12,border:`1px solid ${T.color.cream}`,marginBottom:20}}>
          <div>
            <div style={{fontFamily:T.font.body,fontSize:13,fontWeight:500,color:T.color.charcoal}}>Room sharing</div>
            <div style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted}}>{sharing.shared?"People you invite can view this room":"Only you can see this room"}</div>
          </div>
          <button onClick={toggleSharing} style={{width:44,height:24,borderRadius:12,border:"none",background:sharing.shared?"#4A6741":T.color.sandstone,cursor:"pointer",position:"relative",transition:"background .2s"}}>
            <div style={{width:18,height:18,borderRadius:9,background:"#FFF",position:"absolute",top:3,left:sharing.shared?23:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
          </button>
        </div>
        {/* Invite */}
        {sharing.shared&&<>
          <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>Invite by email</label>
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addPerson();}} placeholder="name@example.com" style={{flex:1,padding:"10px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:13,color:T.color.charcoal,outline:"none"}}/>
            <button onClick={addPerson} style={{padding:"10px 16px",borderRadius:10,border:"none",background:accent,color:"#FFF",fontFamily:T.font.body,fontSize:12,fontWeight:600,cursor:"pointer"}}>Invite</button>
          </div>
          {/* Share link */}
          <button onClick={copyLink} style={{width:"100%",padding:"12px 16px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.warmStone,cursor:"pointer",display:"flex",alignItems:"center",gap:8,marginBottom:20,transition:"all .2s"}}>
            <span style={{fontSize:14}}>{copied?"✅":"🔗"}</span>
            <span style={{fontFamily:T.font.body,fontSize:12,color:copied?"#4A6741":T.color.walnut,fontWeight:500}}>{copied?"Link copied!":"Copy share link"}</span>
          </button>
          {/* People list */}
          {sharing.sharedWith.length>0&&<>
            <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:10}}>Shared with ({sharing.sharedWith.length})</label>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {sharing.sharedWith.map((person,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:T.color.warmStone,borderRadius:10,border:`1px solid ${T.color.cream}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:28,height:28,borderRadius:14,background:`${accent}20`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.font.body,fontSize:11,fontWeight:600,color:accent}}>{person.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{fontFamily:T.font.body,fontSize:12,color:T.color.charcoal}}>{person}</div>
                      <div style={{fontFamily:T.font.body,fontSize:10,color:T.color.muted}}>Can view</div>
                    </div>
                  </div>
                  <button onClick={()=>removePerson(person)} style={{width:24,height:24,borderRadius:12,border:`1px solid ${T.color.cream}`,background:"transparent",color:T.color.muted,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                </div>
              ))}
            </div>
          </>}
        </>}
        {/* Privacy note */}
        <div style={{marginTop:24,padding:"12px 14px",background:`${T.color.warmStone}80`,borderRadius:10,border:`1px solid ${T.color.cream}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <span style={{fontSize:12}}>🔒</span>
            <span style={{fontFamily:T.font.body,fontSize:11,fontWeight:600,color:T.color.charcoal}}>Privacy</span>
          </div>
          <p style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,lineHeight:1.6,margin:0}}>
            Your wing is always private. Only this specific room can be shared. Invited people see room contents but cannot access other wings or rooms. EU-hosted, GDPR compliant.
          </p>
        </div>
      </div>
    </div>
  );
}
