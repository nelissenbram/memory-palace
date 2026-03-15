"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import type { SharingInfo } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { fetchRoomShares, shareRoomWithEmail, removeRoomShare, toggleRoomSharing } from "@/lib/auth/sharing-actions";
import { generateInviteLink } from "@/lib/sharing/generate-link";

interface Share {
  id: string;
  shared_with_email: string;
  permission: string;
  accepted: boolean;
  status?: string;
  email_sent?: boolean;
  invite_message?: string | null;
}

interface SharingPanelProps {
  wing: Wing | null | undefined;
  room: WingRoom | null | undefined;
  roomId: string;
  sharing: SharingInfo;
  onUpdate: (updates: Partial<SharingInfo>) => void;
  onClose: () => void;
}

export default function SharingPanel({wing,room,roomId,sharing,onUpdate,onClose}: SharingPanelProps){
  const isMobile = useIsMobile();
  const [email,setEmail]=useState("");
  const [personalMessage,setPersonalMessage]=useState("");
  const [permission,setPermission]=useState<"view"|"contribute">("view");
  const [copied,setCopied]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [success,setSuccess]=useState<string|null>(null);
  const [shares,setShares]=useState<Share[]>([]);
  const [sendingEmailFor,setSendingEmailFor]=useState<string|null>(null);
  const accent=wing?.accent||T.color.terracotta;

  // Load real shares from DB on mount
  useEffect(()=>{
    fetchRoomShares(roomId).then(result=>{
      if(result.shares) setShares(result.shares);
      if(result.isShared!==undefined){
        onUpdate({shared:result.isShared,sharedWith:result.shares?.map((s: Share)=>s.shared_with_email)||[]});
      }
    });
  },[roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendInviteEmail=async(shareId: string)=>{
    setSendingEmailFor(shareId);
    try{
      const res=await fetch("/api/email/send-invite",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({shareId}),
      });
      const data=await res.json();
      if(data.success){
        setShares(prev=>prev.map(s=>s.id===shareId?{...s,email_sent:true}:s));
        setSuccess("Invitation email sent!");
        setTimeout(()=>setSuccess(null),3000);
      }else{
        setError(data.error||"Failed to send email");
      }
    }catch{
      setError("Failed to send email");
    }
    setSendingEmailFor(null);
  };

  const addPerson=async()=>{
    if(!email.trim()||!email.includes("@"))return;
    setLoading(true);setError(null);setSuccess(null);
    const tempEmail=email.trim().toLowerCase();
    onUpdate({shared:true,sharedWith:[...sharing.sharedWith,tempEmail]});
    setEmail("");
    const msg=personalMessage.trim()||undefined;
    setPersonalMessage("");

    const result=await shareRoomWithEmail(roomId,tempEmail,permission,msg);
    setLoading(false);
    if(result.error){
      setError(result.error);
      onUpdate({sharedWith:sharing.sharedWith.filter(e=>e!==tempEmail)});
    }else if(result.share){
      setShares(prev=>[...prev,result.share]);
      setSuccess(`Invitation sent to ${tempEmail}!`);
      setTimeout(()=>setSuccess(null),4000);
      // Auto-send email
      sendInviteEmail(result.share.id);
    }
  };

  const removePerson=async(share: Share)=>{
    const prevShares=[...shares];
    const next=shares.filter(s=>s.id!==share.id);
    setShares(next);
    onUpdate({shared:next.length>0,sharedWith:next.map(s=>s.shared_with_email)});

    const result=await removeRoomShare(share.id);
    if(result.error){
      setShares(prevShares);
      onUpdate({shared:prevShares.length>0,sharedWith:prevShares.map(s=>s.shared_with_email)});
      setError(result.error);
    }
  };

  const handleToggle=async()=>{
    const newState=!sharing.shared;
    onUpdate({shared:newState,...(!newState?{sharedWith:[]}:{})});
    if(!newState) setShares([]);

    const result=await toggleRoomSharing(roomId,newState);
    if(result.error){
      onUpdate({shared:!newState});
      setError(result.error);
    }
  };

  const copyInviteLink=(shareId: string)=>{
    const url=generateInviteLink(shareId);
    navigator.clipboard.writeText(url).catch(()=>{});
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };

  const copyGenericLink=()=>{
    const url=`${window.location.origin}/palace?shared=${roomId}`;
    navigator.clipboard.writeText(url).catch(()=>{});
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };

  const statusColor=(share: Share)=>{
    const s=share.status||(!share.accepted?"pending":"accepted");
    if(s==="accepted") return T.color.sage;
    if(s==="declined") return "#C05050";
    return T.color.muted;
  };

  const statusLabel=(share: Share)=>{
    const s=share.status||(!share.accepted?"pending":"accepted");
    if(s==="accepted") return "Accepted";
    if(s==="declined") return "Declined";
    return "Pending";
  };

  return(
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(42,34,24,.4)",backdropFilter:"blur(8px)",zIndex:55,animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:0,bottom:0,width:isMobile?"100%":"min(400px, 92vw)",background:`${T.color.linen}f8`,backdropFilter:"blur(20px)",borderLeft:isMobile?"none":`1px solid ${T.color.cream}`,padding:isMobile?"20px 16px":"28px 24px",overflowY:"auto",animation:"slideInRight .3s cubic-bezier(.23,1,.32,1)"}}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            <h3 style={{fontFamily:T.font.display,fontSize:22,fontWeight:500,color:T.color.charcoal,margin:0}}>Share room</h3>
            <p style={{fontFamily:T.font.body,fontSize:12,color:accent,margin:"4px 0 0"}}>{room?.icon} {room?.name}</p>
          </div>
          <button onClick={onClose} style={{width:isMobile?40:32,height:isMobile?40:32,borderRadius:isMobile?20:16,border:`1px solid ${T.color.cream}`,background:T.color.warmStone,color:T.color.muted,fontSize:isMobile?16:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",minWidth:44,minHeight:44}}>&#x2715;</button>
        </div>

        {/* Success toast */}
        {success&&<div style={{padding:"10px 14px",background:`${T.color.sage}15`,border:`1px solid ${T.color.sage}30`,borderRadius:10,marginBottom:16,fontFamily:T.font.body,fontSize:12,color:T.color.sage,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{success}</span>
          <button onClick={()=>setSuccess(null)} style={{background:"none",border:"none",color:T.color.sage,cursor:"pointer",fontSize:14}}>&#x2715;</button>
        </div>}

        {/* Error */}
        {error&&<div style={{padding:"10px 14px",background:"#C0505010",border:"1px solid #C0505030",borderRadius:10,marginBottom:16,fontFamily:T.font.body,fontSize:12,color:"#C05050",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{error}</span>
          <button onClick={()=>setError(null)} style={{background:"none",border:"none",color:"#C05050",cursor:"pointer",fontSize:14}}>&#x2715;</button>
        </div>}

        {/* Toggle */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:T.color.warmStone,borderRadius:12,border:`1px solid ${T.color.cream}`,marginBottom:20}}>
          <div>
            <div style={{fontFamily:T.font.body,fontSize:13,fontWeight:500,color:T.color.charcoal}}>Room sharing</div>
            <div style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted}}>{sharing.shared?"People you invite can view this room":"Only you can see this room"}</div>
          </div>
          <button onClick={handleToggle} style={{width:44,height:24,borderRadius:12,border:"none",background:sharing.shared?"#4A6741":T.color.sandstone,cursor:"pointer",position:"relative",transition:"background .2s"}}>
            <div style={{width:18,height:18,borderRadius:9,background:"#FFF",position:"absolute",top:3,left:sharing.shared?23:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
          </button>
        </div>

        {/* Invite section */}
        {sharing.shared&&<>
          <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>Invite by email</label>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addPerson();}} placeholder="name@example.com" style={{flex:1,padding:isMobile?"12px 14px":"10px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:isMobile?16:13,color:T.color.charcoal,outline:"none"}}/>
            <button onClick={addPerson} disabled={loading} style={{padding:isMobile?"12px 20px":"10px 16px",borderRadius:10,border:"none",background:loading?T.color.sandstone:accent,color:"#FFF",fontFamily:T.font.body,fontSize:isMobile?14:12,fontWeight:600,cursor:loading?"default":"pointer",opacity:loading?.6:1,minHeight:44}}>
              {loading?"...":"Invite"}
            </button>
          </div>

          {/* Permission selector */}
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {(["view","contribute"] as const).map(p=>(
              <button key={p} onClick={()=>setPermission(p)} style={{
                flex:1,padding:isMobile?"12px 12px":"8px 12px",borderRadius:8,minHeight:44,
                border:`1px solid ${permission===p?accent+"40":T.color.cream}`,
                background:permission===p?`${accent}10`:T.color.white,
                cursor:"pointer",fontFamily:T.font.body,fontSize:isMobile?13:11,
                color:permission===p?accent:T.color.muted,fontWeight:permission===p?600:400,
              }}>
                {p==="view"?"Can view":"Can contribute"}
              </button>
            ))}
          </div>

          {/* Personal message */}
          <textarea
            value={personalMessage}
            onChange={e=>setPersonalMessage(e.target.value)}
            placeholder="Add a personal message (optional)"
            rows={2}
            style={{
              width:"100%",padding:"10px 14px",borderRadius:10,
              border:`1px solid ${T.color.cream}`,background:T.color.white,
              fontFamily:T.font.body,fontSize:12,color:T.color.charcoal,
              outline:"none",resize:"vertical",marginBottom:16,boxSizing:"border-box",
              lineHeight:1.5,
            }}
          />

          {/* Copy generic link */}
          <button onClick={copyGenericLink} style={{width:"100%",padding:"12px 16px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.warmStone,cursor:"pointer",display:"flex",alignItems:"center",gap:8,marginBottom:20,transition:"all .2s"}}>
            <span style={{fontSize:14}}>{copied?"&#x2705;":"&#x1F517;"}</span>
            <span style={{fontFamily:T.font.body,fontSize:12,color:copied?"#4A6741":T.color.walnut,fontWeight:500}}>{copied?"Link copied!":"Copy share link"}</span>
          </button>

          {/* People list */}
          {shares.length>0&&<>
            <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:10}}>Shared with ({shares.length})</label>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {shares.map(share=>(
                <div key={share.id} style={{padding:"12px 14px",background:T.color.warmStone,borderRadius:10,border:`1px solid ${T.color.cream}`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:28,height:28,borderRadius:14,background:`${accent}20`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.font.body,fontSize:11,fontWeight:600,color:accent}}>{share.shared_with_email.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{fontFamily:T.font.body,fontSize:12,color:T.color.charcoal}}>{share.shared_with_email}</div>
                        <div style={{fontFamily:T.font.body,fontSize:10,color:statusColor(share)}}>
                          {statusLabel(share)}
                          {" · Can "+share.permission}
                        </div>
                      </div>
                    </div>
                    <button onClick={()=>removePerson(share)} style={{width:24,height:24,borderRadius:12,border:`1px solid ${T.color.cream}`,background:"transparent",color:T.color.muted,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>&#x2715;</button>
                  </div>
                  {/* Action row */}
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <button onClick={()=>copyInviteLink(share.id)} style={{
                      flex:1,padding:"6px 10px",borderRadius:8,border:`1px solid ${T.color.cream}`,
                      background:T.color.white,cursor:"pointer",fontFamily:T.font.body,fontSize:10,
                      color:T.color.walnut,display:"flex",alignItems:"center",justifyContent:"center",gap:4,
                    }}>
                      &#x1F517; Copy invite link
                    </button>
                    {(!share.status||share.status==="pending")&&(
                      <button onClick={()=>sendInviteEmail(share.id)} disabled={sendingEmailFor===share.id} style={{
                        flex:1,padding:"6px 10px",borderRadius:8,border:`1px solid ${T.color.cream}`,
                        background:T.color.white,cursor:sendingEmailFor===share.id?"default":"pointer",
                        fontFamily:T.font.body,fontSize:10,color:T.color.walnut,
                        opacity:sendingEmailFor===share.id?.6:1,
                        display:"flex",alignItems:"center",justifyContent:"center",gap:4,
                      }}>
                        {sendingEmailFor===share.id?"Sending...":share.email_sent?"&#x1F504; Resend email":"&#x2709;&#xFE0F; Send email"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>}
        </>}

        {/* Privacy note */}
        <div style={{marginTop:24,padding:"12px 14px",background:`${T.color.warmStone}80`,borderRadius:10,border:`1px solid ${T.color.cream}`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <span style={{fontSize:12}}>&#x1F512;</span>
            <span style={{fontFamily:T.font.body,fontSize:11,fontWeight:600,color:T.color.charcoal}}>Privacy</span>
          </div>
          <p style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,lineHeight:1.6,margin:0}}>
            Your wing is always private. Only this specific room can be shared. Invited people see room contents but cannot access other wings or rooms.
          </p>
        </div>
      </div>
    </div>
  );
}
