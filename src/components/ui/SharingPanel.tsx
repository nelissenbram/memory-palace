"use client";
import { useState, useEffect } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { SharingInfo } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { fetchRoomShares, shareRoomWithEmail, removeRoomShare, toggleRoomSharing } from "@/lib/auth/sharing-actions";
import { fetchPublicShare, togglePublicShare } from "@/lib/auth/public-share-actions";
import { updateShareDownloadPermission, updateRoomPublicVisibility, updateSharePermission } from "@/lib/auth/family-actions";
import { generateInviteLink } from "@/lib/sharing/generate-link";

interface Share {
  id: string;
  shared_with_email: string;
  permission: string;
  accepted: boolean;
  status?: string;
  email_sent?: boolean;
  invite_message?: string | null;
  allow_download?: boolean;
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
  const { t } = useTranslation("sharingPanel");
  const { t: tc } = useTranslation("common");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const [email,setEmail]=useState("");
  const [personalMessage,setPersonalMessage]=useState("");
  const [permission,setPermission]=useState<"view"|"contribute">("view");
  const [copied,setCopied]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [success,setSuccess]=useState<string|null>(null);
  const [shares,setShares]=useState<Share[]>([]);
  const [sendingEmailFor,setSendingEmailFor]=useState<string|null>(null);
  const [publicShare,setPublicShare]=useState<{id:string;slug:string;is_active:boolean;created_at?:string}|null>(null);
  const [publicLoading,setPublicLoading]=useState(false);
  const [publicCopied,setPublicCopied]=useState(false);
  const [privacyOpen,setPrivacyOpen]=useState(false);
  const [allowDownload,setAllowDownload]=useState(true);
  const [showPublicPalace,setShowPublicPalace]=useState(false);
  const [editingPermFor,setEditingPermFor]=useState<string|null>(null);
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

  // Load public share status on mount
  useEffect(()=>{
    fetchPublicShare(roomId).then(result=>{
      if(result.publicShare) setPublicShare(result.publicShare);
    });
  },[roomId]);

  const handleTogglePublicShare=async()=>{
    setPublicLoading(true);setError(null);
    const result=await togglePublicShare(roomId);
    setPublicLoading(false);
    if(result.error){
      setError(result.error);
    }else if(result.publicShare){
      setPublicShare(result.publicShare);
      if(result.publicShare.is_active){
        setSuccess(t("publicLinkCreated"));
        setTimeout(()=>setSuccess(null),3000);
      }
    }
  };

  const copyPublicLink=()=>{
    if(!publicShare?.slug) return;
    const url=`${window.location.origin}/public/${publicShare.slug}`;
    navigator.clipboard.writeText(url).catch(()=>{});
    setPublicCopied(true);
    setTimeout(()=>setPublicCopied(false),2000);
  };

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
        setSuccess(t("emailSent"));
        setTimeout(()=>setSuccess(null),3000);
      }else{
        setError(data.error||t("emailFailed"));
      }
    }catch{
      setError(t("emailFailed"));
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
      setSuccess(t("invitationSent", { email: tempEmail }));
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
    if(s==="declined") return T.color.error;
    return T.color.muted;
  };

  const statusLabel=(share: Share)=>{
    const s=share.status||(!share.accepted?"pending":"accepted");
    if(s==="accepted") return t("accepted");
    if(s==="declined") return t("declined");
    return t("pending");
  };

  return(
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(42,34,24,.4)",backdropFilter:"blur(0.5rem)",zIndex:55,animation:"fadeIn .2s ease"}}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("shareRoom")} onKeyDown={(e)=>{if(e.key==="Escape")onClose();handleKeyDown(e);}} onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:0,bottom:0,width:isMobile?"100%":"min(25rem, 92vw)",background:`${T.color.linen}f8`,backdropFilter:"blur(1.25rem)",borderLeft:isMobile?"none":`1px solid ${T.color.cream}`,padding:isMobile?"1.25rem 1rem":"1.75rem 1.5rem",overflowY:"auto",animation:"slideInRight .3s cubic-bezier(.23,1,.32,1)"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
          <div>
            <h3 style={{fontFamily:T.font.display,fontSize:"1.375rem",fontWeight:500,color:T.color.charcoal,margin:0}}>{t("shareRoom")}</h3>
            <p style={{fontFamily:T.font.body,fontSize:"0.75rem",color:accent,margin:"0.25rem 0 0"}}>{room?.icon} {room?.name}</p>
          </div>
          <button onClick={onClose} aria-label={tc("close")} style={{width:isMobile?"2.5rem":"2rem",height:isMobile?"2.5rem":"2rem",borderRadius:isMobile?"1.25rem":"1rem",border:`1px solid ${T.color.cream}`,background:T.color.warmStone,color:T.color.muted,fontSize:isMobile?"1rem":"0.875rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",minWidth:"2.75rem",minHeight:"2.75rem"}}>&#x2715;</button>
        </div>

        {/* Success toast */}
        {success&&<div role="status" style={{padding:"0.625rem 0.875rem",background:`${T.color.sage}15`,border:`1px solid ${T.color.sage}30`,borderRadius:"0.625rem",marginBottom:"1rem",fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.sage,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{success}</span>
          <button onClick={()=>setSuccess(null)} aria-label={tc("close")} style={{background:"none",border:"none",color:T.color.sage,cursor:"pointer",fontSize:"0.875rem"}}>&#x2715;</button>
        </div>}

        {/* Error */}
        {error&&<div role="alert" style={{padding:"0.625rem 0.875rem",background:`${T.color.error}10`,border:`1px solid ${T.color.error}30`,borderRadius:"0.625rem",marginBottom:"1rem",fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.error,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{error}</span>
          <button onClick={()=>setError(null)} aria-label={tc("close")} style={{background:"none",border:"none",color:T.color.error,cursor:"pointer",fontSize:"0.875rem"}}>&#x2715;</button>
        </div>}

        {/* Toggle */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.875rem 1rem",background:T.color.warmStone,borderRadius:"0.75rem",border:`1px solid ${T.color.cream}`,marginBottom:"1.25rem"}}>
          <div>
            <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:500,color:T.color.charcoal}}>{t("roomSharing")}</div>
            <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted}}>{sharing.shared?t("peopleCanView"):t("onlyYouCanSee")}</div>
          </div>
          <button onClick={handleToggle} role="switch" aria-checked={sharing.shared} aria-label={t("roomSharing")} style={{width:"2.75rem",height:"1.5rem",borderRadius:"0.75rem",border:"none",background:sharing.shared?T.color.terracotta:T.color.sandstone,cursor:"pointer",position:"relative",transition:"background .2s"}}>
            <div style={{width:"1.125rem",height:"1.125rem",borderRadius:"0.5625rem",background:T.color.white,position:"absolute",top:"0.1875rem",left:sharing.shared?"1.4375rem":"0.1875rem",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
          </button>
        </div>

        {/* Public link section */}
        <div style={{padding:"0.875rem 1rem",background:T.color.warmStone,borderRadius:"0.75rem",border:`1px solid ${T.color.cream}`,marginBottom:"1.25rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:publicShare?.is_active?"0.75rem":"0"}}>
            <div>
              <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:500,color:T.color.charcoal}}>{t("publicLink")}</div>
              <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted}}>{publicShare?.is_active?t("anyoneCanView"):t("noAccountRequired")}</div>
            </div>
            <button onClick={handleTogglePublicShare} disabled={publicLoading} role="switch" aria-checked={!!publicShare?.is_active} aria-label={t("publicLink")} style={{width:"2.75rem",height:"1.5rem",borderRadius:"0.75rem",border:"none",background:publicShare?.is_active?T.color.terracotta:T.color.sandstone,cursor:publicLoading?"default":"pointer",position:"relative",transition:"background .2s",opacity:publicLoading?.6:1}}>
              <div style={{width:"1.125rem",height:"1.125rem",borderRadius:"0.5625rem",background:T.color.white,position:"absolute",top:"0.1875rem",left:publicShare?.is_active?"1.4375rem":"0.1875rem",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
            </button>
          </div>
          {publicShare?.is_active&&(
            <div style={{display:"flex",gap:"0.5rem"}}>
              <div style={{flex:1,padding:"0.5rem 0.75rem",borderRadius:"0.5rem",background:T.color.white,border:`1px solid ${T.color.cream}`,fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:"1.25rem"}}>
                {typeof window!=="undefined"?`${window.location.origin}/public/${publicShare.slug}`:`/public/${publicShare.slug}`}
              </div>
              <button onClick={copyPublicLink} style={{padding:"0.5rem 0.875rem",borderRadius:"0.5rem",border:"none",background:publicCopied?`${T.color.sage}15`:accent,color:publicCopied?T.color.sage:T.color.white,fontFamily:T.font.body,fontSize:"0.6875rem",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s"}}>
                {publicCopied?`\u2713 ${t("copied")}`:t("copy")}
              </button>
            </div>
          )}
        </div>

        {/* Invite section */}
        {sharing.shared&&<>
          <label htmlFor="sharing-email-input" style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:"0.03125rem",textTransform:"uppercase",display:"block",marginBottom:"0.375rem"}}>{t("inviteByEmail")}</label>
          <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.625rem"}}>
            <input id="sharing-email-input" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addPerson();}} placeholder={t("emailPlaceholder")} style={{flex:1,padding:isMobile?"0.75rem 0.875rem":"0.625rem 0.875rem",borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:isMobile?"1rem":"0.8125rem",color:T.color.charcoal,outline:"none"}}/>
            <button onClick={addPerson} disabled={loading} style={{padding:isMobile?"0.75rem 1.25rem":"0.625rem 1rem",borderRadius:"0.625rem",border:"none",background:loading?T.color.sandstone:accent,color:T.color.white,fontFamily:T.font.body,fontSize:isMobile?"0.875rem":"0.75rem",fontWeight:600,cursor:loading?"default":"pointer",opacity:loading?.6:1,minHeight:"2.75rem"}}>
              {loading?"...":t("invite")}
            </button>
          </div>

          {/* Permission selector */}
          <div style={{display:"flex",gap:"0.375rem",marginBottom:"0.625rem"}}>
            {(["view","contribute"] as const).map(p=>(
              <button key={p} aria-pressed={permission===p} onClick={()=>setPermission(p)} style={{
                flex:1,padding:isMobile?"0.75rem":"0.5rem 0.75rem",borderRadius:"0.5rem",minHeight:"2.75rem",
                border:`1px solid ${permission===p?accent+"40":T.color.cream}`,
                background:permission===p?`${accent}10`:T.color.white,
                cursor:"pointer",fontFamily:T.font.body,fontSize:isMobile?"0.8125rem":"0.6875rem",
                color:permission===p?accent:T.color.muted,fontWeight:permission===p?600:400,
              }}>
                {p==="view"?t("canView"):t("canContribute")}
              </button>
            ))}
          </div>

          {/* Personal message */}
          <textarea
            value={personalMessage}
            onChange={e=>setPersonalMessage(e.target.value)}
            placeholder={t("personalMessage")}
            aria-label={t("personalMessage")}
            rows={2}
            style={{
              width:"100%",padding:"0.625rem 0.875rem",borderRadius:"0.625rem",
              border:`1px solid ${T.color.cream}`,background:T.color.white,
              fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.charcoal,
              outline:"none",resize:"vertical",marginBottom:"1rem",boxSizing:"border-box",
              lineHeight:1.5,
            }}
          />

          {/* Copy generic link */}
          <button onClick={copyGenericLink} style={{width:"100%",padding:"0.75rem 1rem",borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`,background:T.color.warmStone,cursor:"pointer",display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"1.25rem",transition:"all .2s"}}>
            <span style={{fontSize:"0.875rem"}}>{copied?"&#x2705;":"&#x1F517;"}</span>
            <span style={{fontFamily:T.font.body,fontSize:"0.75rem",color:copied?T.color.success:T.color.walnut,fontWeight:500}}>{copied?t("linkCopied"):t("copyShareLink")}</span>
          </button>

          {/* People list */}
          {shares.length>0&&<>
            <label style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:"0.03125rem",textTransform:"uppercase",display:"block",marginBottom:"0.625rem"}}>{t("sharedWith", { count: String(shares.length) })}</label>
            <div style={{display:"flex",flexDirection:"column",gap:"0.375rem"}}>
              {shares.map(share=>(
                <div key={share.id} style={{padding:"0.75rem 0.875rem",background:T.color.warmStone,borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.625rem"}}>
                      <div style={{width:"1.75rem",height:"1.75rem",borderRadius:"0.875rem",background:`${accent}20`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.font.body,fontSize:"0.6875rem",fontWeight:600,color:accent}}>{share.shared_with_email.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.charcoal}}>{share.shared_with_email}</div>
                        <div style={{fontFamily:T.font.body,fontSize:"0.625rem",color:statusColor(share)}}>
                          {statusLabel(share)}
                          {" · "+t("canPermission", { permission: share.permission })}
                        </div>
                      </div>
                    </div>
                    <button onClick={()=>removePerson(share)} aria-label={tc("remove") + " " + share.shared_with_email} style={{width:"1.5rem",height:"1.5rem",borderRadius:"0.75rem",border:`1px solid ${T.color.cream}`,background:"transparent",color:T.color.muted,fontSize:"0.6875rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",minWidth:"2.75rem",minHeight:"2.75rem"}}>&#x2715;</button>
                  </div>
                  {/* Action row */}
                  <div style={{display:"flex",gap:"0.375rem",marginTop:"0.5rem"}}>
                    <button onClick={()=>copyInviteLink(share.id)} style={{
                      flex:1,padding:"0.375rem 0.625rem",borderRadius:"0.5rem",border:`1px solid ${T.color.cream}`,
                      background:T.color.white,cursor:"pointer",fontFamily:T.font.body,fontSize:"0.625rem",
                      color:T.color.walnut,display:"flex",alignItems:"center",justifyContent:"center",gap:"0.25rem",
                      minHeight:"2.75rem",
                    }}>
                      &#x1F517; {t("copyInviteLink")}
                    </button>
                    {(!share.status||share.status==="pending")&&(
                      <button onClick={()=>sendInviteEmail(share.id)} disabled={sendingEmailFor===share.id} style={{
                        flex:1,padding:"0.375rem 0.625rem",borderRadius:"0.5rem",border:`1px solid ${T.color.cream}`,
                        background:T.color.white,cursor:sendingEmailFor===share.id?"default":"pointer",
                        fontFamily:T.font.body,fontSize:"0.625rem",color:T.color.walnut,
                        opacity:sendingEmailFor===share.id?.6:1,
                        display:"flex",alignItems:"center",justifyContent:"center",gap:"0.25rem",
                        minHeight:"2.75rem",
                      }}>
                        {sendingEmailFor===share.id?t("sending"):share.email_sent?`&#x1F504; ${t("resendEmail")}`:`&#x2709;&#xFE0F; ${t("sendEmail")}`}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>}
        </>}

        {/* Privacy & Permissions */}
        <div style={{marginTop:"1.5rem",borderRadius:"0.75rem",border:`1px solid ${T.color.cream}`,overflow:"hidden"}}>
          <button aria-expanded={privacyOpen} aria-controls="sharing-privacy-panel" onClick={()=>setPrivacyOpen(!privacyOpen)} style={{width:"100%",padding:"0.875rem 1rem",background:`${T.color.warmStone}80`,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
              <span style={{fontSize:"0.75rem"}}>{"\u{1F512}"}</span>
              <span style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:600,color:T.color.charcoal}}>{t("privacyPermissions")}</span>
            </div>
            <span style={{fontFamily:T.font.body,fontSize:"0.875rem",color:T.color.muted,transform:privacyOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s",display:"inline-block"}}>{"\u25BE"}</span>
          </button>
          {privacyOpen&&<div id="sharing-privacy-panel" style={{padding:"1rem",background:T.color.white}}>
            {/* Download permission toggle */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
              <div>
                <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:500,color:T.color.charcoal}}>{t("allowDownload")}</div>
                <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted}}>{t("allowDownloadDesc")}</div>
              </div>
              <button onClick={async()=>{
                const next=!allowDownload;
                setAllowDownload(next);
                // Update all shares for this room
                for(const share of shares){
                  await updateShareDownloadPermission(share.id,next);
                }
              }} role="switch" aria-checked={allowDownload} aria-label={t("allowDownload")} style={{width:"2.75rem",height:"1.5rem",borderRadius:"0.75rem",border:"none",background:allowDownload?T.color.terracotta:T.color.sandstone,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
                <div style={{width:"1.125rem",height:"1.125rem",borderRadius:"0.5625rem",background:T.color.white,position:"absolute",top:"0.1875rem",left:allowDownload?"1.4375rem":"0.1875rem",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              </button>
            </div>

            {/* Show in public palace toggle */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
              <div>
                <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:500,color:T.color.charcoal}}>{t("showPublicView")}</div>
                <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted}}>{t("showPublicViewDesc")}</div>
              </div>
              <button onClick={async()=>{
                const next=!showPublicPalace;
                setShowPublicPalace(next);
                await updateRoomPublicVisibility(roomId,next);
              }} role="switch" aria-checked={showPublicPalace} aria-label={t("showPublicView")} style={{width:"2.75rem",height:"1.5rem",borderRadius:"0.75rem",border:"none",background:showPublicPalace?T.color.terracotta:T.color.sandstone,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
                <div style={{width:"1.125rem",height:"1.125rem",borderRadius:"0.5625rem",background:T.color.white,position:"absolute",top:"0.1875rem",left:showPublicPalace?"1.4375rem":"0.1875rem",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
              </button>
            </div>

            {/* Per-collaborator permission editing */}
            {shares.length>0&&<>
              <div style={{borderTop:`1px solid ${T.color.cream}`,paddingTop:"0.875rem",marginTop:"0.25rem"}}>
                <label style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:"0.03125rem",textTransform:"uppercase",display:"block",marginBottom:"0.625rem"}}>{t("perCollaborator")}</label>
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                  {shares.map(share=>(
                    <div key={share.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.625rem 0.75rem",background:T.color.linen,borderRadius:"0.5rem",border:`1px solid ${T.color.cream}`}}>
                      <div style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.charcoal,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"50%"}}>{share.shared_with_email}</div>
                      {editingPermFor===share.id?(
                        <div style={{display:"flex",gap:"0.25rem"}}>
                          {(["view","contribute","admin"] as const).map(p=>(
                            <button key={p} onClick={async()=>{
                              setShares(prev=>prev.map(s=>s.id===share.id?{...s,permission:p}:s));
                              setEditingPermFor(null);
                              await updateSharePermission(share.id,p);
                            }} style={{
                              padding:"0.25rem 0.625rem",borderRadius:"0.375rem",
                              border:`1px solid ${share.permission===p?accent+"40":T.color.cream}`,
                              background:share.permission===p?`${accent}10`:T.color.white,
                              cursor:"pointer",fontFamily:T.font.body,fontSize:"0.625rem",
                              color:share.permission===p?accent:T.color.muted,
                              fontWeight:share.permission===p?600:400,
                            }}>
                              {p==="view"?t("permView"):p==="contribute"?t("permContribute"):t("permAdmin")}
                            </button>
                          ))}
                        </div>
                      ):(
                        <button onClick={()=>setEditingPermFor(share.id)} style={{
                          padding:"0.25rem 0.75rem",borderRadius:"0.375rem",
                          border:`1px solid ${T.color.cream}`,
                          background:T.color.white,
                          cursor:"pointer",fontFamily:T.font.body,fontSize:"0.6875rem",
                          color:T.color.walnut,fontWeight:500,
                        }}>
                          {t("canPermission", { permission: share.permission })} {"\u270E"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>}

            {/* Privacy info */}
            <p style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,lineHeight:1.6,margin:"0.875rem 0 0"}}>
              {t("privacyInfo")}
            </p>
          </div>}
        </div>
      </div>
    </div>
  );
}
