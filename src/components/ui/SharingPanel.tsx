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
import { hapticLight } from "@/lib/native/haptics";
import QRShareModal from "@/components/social/QRShareModal";

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
  const [showQR,setShowQR]=useState(false);
  const accent=wing?.accent||"#B85C38"; // Atrium token: ember fallback

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
    hapticLight();
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
    hapticLight();
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };

  // A generic share target only works via the DB-backed public link (/public/{slug}).
  // The old /palace?shared= param is read nowhere, so it silently loses context.
  const genericShareUrl=publicShare?.is_active&&publicShare.slug
    ?`${typeof window!=="undefined"?window.location.origin:""}/public/${publicShare.slug}`
    :null;

  const copyGenericLink=()=>{
    if(!genericShareUrl){
      setError(t("enablePublicLinkFirst"));
      return;
    }
    navigator.clipboard.writeText(genericShareUrl).catch(()=>{});
    hapticLight();
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };

  const statusColor=(share: Share)=>{
    const s=share.status||(!share.accepted?"pending":"accepted");
    if(s==="accepted") return "#56683C";
    if(s==="declined") return T.color.error;
    return "#716A5E";
  };

  const statusLabel=(share: Share)=>{
    const s=share.status||(!share.accepted?"pending":"accepted");
    if(s==="accepted") return t("accepted");
    if(s==="declined") return t("declined");
    return t("pending");
  };

  return(
    <>
    <div onClick={onClose} className="sp-rm" style={{position:"fixed",inset:0,background:"rgba(42,34,24,.4)",backdropFilter:"blur(0.5rem)",zIndex:55,animation:"fadeIn .2s ease"}}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("shareRoom")} onKeyDown={(e)=>{if(e.key==="Escape")onClose();handleKeyDown(e);}} onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:0,bottom:0,width:isMobile?"100%":"min(25rem, 92vw)",background:`${T.color.linen}f8`,backdropFilter:"blur(1.25rem)",borderLeft:isMobile?"none":"0.0625rem solid #E3D6BC",padding:isMobile?"1.25rem 1rem":"1.75rem 1.5rem",paddingBottom:isMobile?"calc(1.25rem + env(safe-area-inset-bottom, 0px))":"1.75rem",overflowY:"auto",animation:"slideInRight .3s ease",boxShadow:"0 0.5rem 1.5rem rgba(64,59,54,0.14)"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
          <div>
            <h3 style={{fontFamily:T.font.display,fontSize:"1.375rem",fontWeight:600,lineHeight:1.15,color:"#403B36",margin:0}}>{t("shareRoom")}</h3>
            <p style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:accent,margin:"0.25rem 0 0"}}>{room?.icon} {room?.name}</p>
          </div>
          <button onClick={onClose} aria-label={tc("close")} style={{width:isMobile?"2.5rem":"2rem",height:isMobile?"2.5rem":"2rem",borderRadius:isMobile?"1.25rem":"1rem",border:"0.0625rem solid #E3D6BC",background:T.color.warmStone,color:"#716A5E",fontSize:isMobile?"1rem":"0.9375rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",minWidth:"2.75rem",minHeight:"2.75rem"}}>&#x2715;</button>
        </div>

        {/* Success toast */}
        {success&&<div role="status" style={{padding:"0.625rem 0.875rem",background:"#EFF2E8",border:"0.0625rem solid #DFE3D2",borderRadius:"0.75rem",marginBottom:"1rem",fontFamily:T.font.body,fontSize:"0.8125rem",color:"#56683C",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{success}</span>
          <button onClick={()=>setSuccess(null)} aria-label={tc("close")} style={{background:"none",border:"none",color:"#56683C",cursor:"pointer",fontSize:"0.8125rem"}}>&#x2715;</button>
        </div>}

        {/* Error */}
        {error&&<div role="alert" style={{padding:"0.625rem 0.875rem",background:`${T.color.error}10`,border:`0.0625rem solid ${T.color.error}30`,borderRadius:"0.75rem",marginBottom:"1rem",fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.error,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{error}</span>
          <button onClick={()=>setError(null)} aria-label={tc("close")} style={{background:"none",border:"none",color:T.color.error,cursor:"pointer",fontSize:"0.8125rem"}}>&#x2715;</button>
        </div>}

        {/* Toggle */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.875rem 1rem",background:T.color.warmStone,borderRadius:"1rem",border:"0.0625rem solid #E3D6BC",marginBottom:"1.25rem"}}>
          <div>
            <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:500,color:"#403B36"}}>{t("roomSharing")}</div>
            <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:"#716A5E"}}>{sharing.shared?t("peopleCanView"):t("onlyYouCanSee")}</div>
          </div>
          <button onClick={handleToggle} role="switch" aria-checked={sharing.shared} aria-label={t("roomSharing")} style={{width:"2.75rem",height:"1.5rem",borderRadius:"0.75rem",border:"none",background:sharing.shared?"#B85C38":T.color.sandstone,cursor:"pointer",position:"relative",transition:"background .2s"}}>
            <div style={{width:"1.125rem",height:"1.125rem",borderRadius:"0.5625rem",background:T.color.white,position:"absolute",top:"0.1875rem",left:"0.1875rem",transform:sharing.shared?"translateX(1.25rem)":"translateX(0)",transition:"transform .2s ease",boxShadow:"0 0.0625rem 0.1875rem rgba(64,59,54,0.2)"}}/>
          </button>
        </div>

        {/* Public link section */}
        <div style={{padding:"0.875rem 1rem",background:T.color.warmStone,borderRadius:"1rem",border:"0.0625rem solid #E3D6BC",marginBottom:"1.25rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:publicShare?.is_active?"0.75rem":"0"}}>
            <div>
              <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:500,color:"#403B36"}}>{t("publicLink")}</div>
              <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:"#716A5E"}}>{publicShare?.is_active?t("anyoneCanView"):t("noAccountRequired")}</div>
            </div>
            <button onClick={handleTogglePublicShare} disabled={publicLoading} role="switch" aria-checked={!!publicShare?.is_active} aria-label={t("publicLink")} style={{width:"2.75rem",height:"1.5rem",borderRadius:"0.75rem",border:"none",background:publicShare?.is_active?"#B85C38":T.color.sandstone,cursor:publicLoading?"default":"pointer",position:"relative",transition:"background .2s",opacity:publicLoading?.6:1}}>
              <div style={{width:"1.125rem",height:"1.125rem",borderRadius:"0.5625rem",background:T.color.white,position:"absolute",top:"0.1875rem",left:"0.1875rem",transform:publicShare?.is_active?"translateX(1.25rem)":"translateX(0)",transition:"transform .2s ease",boxShadow:"0 0.0625rem 0.1875rem rgba(64,59,54,0.2)"}}/>
            </button>
          </div>
          {publicShare?.is_active&&(
            <div style={{display:"flex",gap:"0.5rem"}}>
              <div style={{flex:1,padding:"0.5rem 0.75rem",borderRadius:"0.75rem",background:T.color.white,border:"0.0625rem solid #E3D6BC",fontFamily:T.font.body,fontSize:"0.6875rem",color:"#716A5E",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:"1.25rem"}}>
                {typeof window!=="undefined"?`${window.location.origin}/public/${publicShare.slug}`:`/public/${publicShare.slug}`}
              </div>
              <button onClick={copyPublicLink} style={{padding:"0.5rem 0.875rem",borderRadius:"0.75rem",border:"none",background:publicCopied?"#EFF2E8":accent,color:publicCopied?"#56683C":T.color.white,fontFamily:T.font.body,fontSize:"0.6875rem",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",transition:"all .2s ease"}}>
                {publicCopied?`\u2713 ${t("copied")}`:t("copy")}
              </button>
            </div>
          )}
        </div>

        {/* Invite section */}
        {sharing.shared&&<>
          <label htmlFor="sharing-email-input" style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:"#716A5E",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",display:"block",marginBottom:"0.375rem"}}>{t("inviteByEmail")}</label>
          <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.625rem"}}>
            <input id="sharing-email-input" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addPerson();}} placeholder={t("emailPlaceholder")} style={{flex:1,padding:isMobile?"0.75rem 0.875rem":"0.625rem 0.875rem",borderRadius:"0.75rem",border:"0.0625rem solid #E3D6BC",background:T.color.white,fontFamily:T.font.body,fontSize:isMobile?"1rem":"0.8125rem",color:"#403B36",outline:"none"}}/>
            <button onClick={addPerson} disabled={loading} style={{padding:isMobile?"0.75rem 1.25rem":"0.625rem 1rem",borderRadius:"0.75rem",border:"none",background:loading?T.color.sandstone:accent,color:T.color.white,fontFamily:T.font.body,fontSize:isMobile?"0.9375rem":"0.8125rem",fontWeight:600,cursor:loading?"default":"pointer",opacity:loading?.6:1,minHeight:"2.75rem"}}>
              {loading?"...":t("invite")}
            </button>
          </div>

          {/* Permission selector */}
          <div style={{display:"flex",gap:"0.375rem",marginBottom:"0.625rem"}}>
            {(["view","contribute"] as const).map(p=>(
              <button key={p} aria-pressed={permission===p} onClick={()=>setPermission(p)} style={{
                flex:1,padding:isMobile?"0.75rem":"0.5rem 0.75rem",borderRadius:"0.75rem",minHeight:"2.75rem",
                border:`0.0625rem solid ${permission===p?accent+"40":"#E3D6BC"}`,
                background:permission===p?`${accent}10`:T.color.white,
                cursor:"pointer",fontFamily:T.font.body,fontSize:isMobile?"0.8125rem":"0.6875rem",
                color:permission===p?accent:"#716A5E",fontWeight:permission===p?600:500,
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
              width:"100%",padding:"0.625rem 0.875rem",borderRadius:"0.75rem",
              border:"0.0625rem solid #E3D6BC",background:T.color.white,
              fontFamily:T.font.body,fontSize:"0.8125rem",color:"#403B36",
              outline:"none",resize:"vertical",marginBottom:"1rem",boxSizing:"border-box",
              lineHeight:1.5,
            }}
          />

          {/* Copy generic link + QR */}
          <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.25rem"}}>
            <button onClick={copyGenericLink} style={{flex:1,padding:"0.75rem 1rem",borderRadius:"0.75rem",border:"0.0625rem solid #E3D6BC",background:T.color.warmStone,cursor:"pointer",display:"flex",alignItems:"center",gap:"0.5rem",transition:"all .2s"}}>
              <span style={{fontSize:"0.9375rem"}}>{copied?"&#x2705;":"&#x1F517;"}</span>
              <span style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:copied?"#56683C":"#716A5E",fontWeight:500}}>{copied?t("linkCopied"):t("copyShareLink")}</span>
            </button>
            <button onClick={()=>{if(genericShareUrl){setShowQR(true);}else{setError(t("enablePublicLinkFirst"));}}} disabled={!genericShareUrl} aria-label={t("shareViaQR")} style={{padding:"0.75rem 1rem",borderRadius:"0.75rem",border:"0.0625rem solid #E3D6BC",background:T.color.warmStone,cursor:genericShareUrl?"pointer":"not-allowed",opacity:genericShareUrl?1:.5,display:"flex",alignItems:"center",gap:"0.375rem",transition:"all .2s",whiteSpace:"nowrap",minHeight:"2.75rem"}}>
              <span style={{fontSize:"0.9375rem"}}>{"\u{1F4F1}"}</span>
              <span style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:"#716A5E",fontWeight:500}}>{t("qrLabel")}</span>
            </button>
          </div>

          {/* People list */}
          {shares.length>0&&<>
            <label style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:"#716A5E",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",display:"block",marginBottom:"0.625rem"}}>{t("sharedWith", { count: String(shares.length) })}</label>
            <div style={{display:"flex",flexDirection:"column",gap:"0.375rem"}}>
              {shares.map(share=>(
                <div key={share.id} style={{padding:"0.75rem 0.875rem",background:T.color.warmStone,borderRadius:"1rem",border:"0.0625rem solid #E3D6BC"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.625rem"}}>
                      <div style={{width:"1.75rem",height:"1.75rem",borderRadius:"0.875rem",background:`${accent}20`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.font.body,fontSize:"0.6875rem",fontWeight:600,color:accent}}>{share.shared_with_email.charAt(0).toUpperCase()}</div>
                      <div>
                        <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:"#403B36"}}>{share.shared_with_email}</div>
                        <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:statusColor(share)}}>
                          {statusLabel(share)}
                          {" · "+t("canPermission", { permission: share.permission })}
                        </div>
                      </div>
                    </div>
                    <button onClick={()=>removePerson(share)} aria-label={tc("remove") + " " + share.shared_with_email} style={{width:"1.5rem",height:"1.5rem",borderRadius:"0.75rem",border:"0.0625rem solid #E3D6BC",background:"transparent",color:"#716A5E",fontSize:"0.6875rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",minWidth:"2.75rem",minHeight:"2.75rem"}}>&#x2715;</button>
                  </div>
                  {/* Action row */}
                  <div style={{display:"flex",gap:"0.375rem",marginTop:"0.5rem"}}>
                    <button onClick={()=>copyInviteLink(share.id)} style={{
                      flex:1,padding:"0.375rem 0.625rem",borderRadius:"0.75rem",border:"0.0625rem solid #E3D6BC",
                      background:T.color.white,cursor:"pointer",fontFamily:T.font.body,fontSize:"0.6875rem",
                      color:"#716A5E",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.25rem",
                      minHeight:"2.75rem",
                    }}>
                      &#x1F517; {t("copyInviteLink")}
                    </button>
                    {(!share.status||share.status==="pending")&&(
                      <button onClick={()=>sendInviteEmail(share.id)} disabled={sendingEmailFor===share.id} style={{
                        flex:1,padding:"0.375rem 0.625rem",borderRadius:"0.75rem",border:"0.0625rem solid #E3D6BC",
                        background:T.color.white,cursor:sendingEmailFor===share.id?"default":"pointer",
                        fontFamily:T.font.body,fontSize:"0.6875rem",color:"#716A5E",
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
        <div style={{marginTop:"1.5rem",borderRadius:"1rem",border:"0.0625rem solid #E3D6BC",overflow:"hidden"}}>
          <button aria-expanded={privacyOpen} aria-controls="sharing-privacy-panel" onClick={()=>setPrivacyOpen(!privacyOpen)} style={{width:"100%",padding:"0.875rem 1rem",background:"#F0ECE2",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
              <span style={{fontSize:"0.8125rem"}}>{"\u{1F512}"}</span>
              <span style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:600,color:"#403B36"}}>{t("privacyPermissions")}</span>
            </div>
            <span style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:"#716A5E",transform:privacyOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s",display:"inline-block"}}>{"\u25BE"}</span>
          </button>
          {privacyOpen&&<div id="sharing-privacy-panel" style={{padding:"1rem",background:T.color.white}}>
            {/* Download permission toggle */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
              <div>
                <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:500,color:"#403B36"}}>{t("allowDownload")}</div>
                <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:"#716A5E"}}>{t("allowDownloadDesc")}</div>
              </div>
              <button onClick={async()=>{
                if(shares.length===0){setError(t("noCollaboratorsForDownload"));return;}
                const next=!allowDownload;
                setAllowDownload(next);setError(null);
                // Update all shares for this room
                const results=await Promise.all(shares.map(share=>updateShareDownloadPermission(share.id,next)));
                if(results.some(r=>r&&"error"in r&&r.error)){
                  setAllowDownload(!next);
                  setError(t("downloadPermissionFailed"));
                }
              }} role="switch" aria-checked={allowDownload} aria-label={t("allowDownload")} style={{width:"2.75rem",height:"1.5rem",borderRadius:"0.75rem",border:"none",background:allowDownload?"#B85C38":T.color.sandstone,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
                <div style={{width:"1.125rem",height:"1.125rem",borderRadius:"0.5625rem",background:T.color.white,position:"absolute",top:"0.1875rem",left:allowDownload?"1.4375rem":"0.1875rem",transition:"left .2s",boxShadow:"0 0.0625rem 0.1875rem rgba(64,59,54,0.2)"}}/>
              </button>
            </div>

            {/* Show in public palace toggle */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
              <div>
                <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:500,color:"#403B36"}}>{t("showPublicView")}</div>
                <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:"#716A5E"}}>{t("showPublicViewDesc")}</div>
              </div>
              <button onClick={async()=>{
                const next=!showPublicPalace;
                setShowPublicPalace(next);setError(null);
                const result=await updateRoomPublicVisibility(roomId,next);
                if(result&&"error"in result&&result.error){
                  setShowPublicPalace(!next);
                  setError(result.error);
                }
              }} role="switch" aria-checked={showPublicPalace} aria-label={t("showPublicView")} style={{width:"2.75rem",height:"1.5rem",borderRadius:"0.75rem",border:"none",background:showPublicPalace?"#B85C38":T.color.sandstone,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
                <div style={{width:"1.125rem",height:"1.125rem",borderRadius:"0.5625rem",background:T.color.white,position:"absolute",top:"0.1875rem",left:showPublicPalace?"1.4375rem":"0.1875rem",transition:"left .2s",boxShadow:"0 0.0625rem 0.1875rem rgba(64,59,54,0.2)"}}/>
              </button>
            </div>

            {/* Per-collaborator permission editing */}
            {shares.length>0&&<>
              <div style={{borderTop:"0.0625rem solid #E3D6BC",paddingTop:"0.875rem",marginTop:"0.25rem"}}>
                <label style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:"#716A5E",fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",display:"block",marginBottom:"0.625rem"}}>{t("perCollaborator")}</label>
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                  {shares.map(share=>(
                    <div key={share.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.625rem 0.75rem",background:T.color.linen,borderRadius:"0.75rem",border:"0.0625rem solid #E3D6BC"}}>
                      <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:"#403B36",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"50%"}}>{share.shared_with_email}</div>
                      {editingPermFor===share.id?(
                        <div style={{display:"flex",gap:"0.25rem"}}>
                          {(["view","contribute","admin"] as const).map(p=>(
                            <button key={p} onClick={async()=>{
                              const prevPerm=share.permission;
                              setShares(prev=>prev.map(s=>s.id===share.id?{...s,permission:p}:s));
                              setEditingPermFor(null);setError(null);
                              const result=await updateSharePermission(share.id,p);
                              if(result&&"error"in result&&result.error){
                                setShares(prev=>prev.map(s=>s.id===share.id?{...s,permission:prevPerm}:s));
                                setError(result.error);
                              }
                            }} style={{
                              padding:"0.25rem 0.625rem",borderRadius:"0.75rem",
                              border:`0.0625rem solid ${share.permission===p?accent+"40":"#E3D6BC"}`,
                              background:share.permission===p?`${accent}10`:T.color.white,
                              cursor:"pointer",fontFamily:T.font.body,fontSize:"0.6875rem",
                              color:share.permission===p?accent:"#716A5E",
                              fontWeight:share.permission===p?600:500,
                            }}>
                              {p==="view"?t("permView"):p==="contribute"?t("permContribute"):t("permAdmin")}
                            </button>
                          ))}
                        </div>
                      ):(
                        <button onClick={()=>setEditingPermFor(share.id)} style={{
                          padding:"0.25rem 0.75rem",borderRadius:"0.75rem",
                          border:"0.0625rem solid #E3D6BC",
                          background:T.color.white,
                          cursor:"pointer",fontFamily:T.font.body,fontSize:"0.6875rem",
                          color:"#716A5E",fontWeight:500,
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
            <p style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:"#716A5E",lineHeight:1.6,margin:"0.875rem 0 0"}}>
              {t("privacyInfo")}
            </p>
          </div>}
        </div>
      </div>
    </div>

    {/* Atrium tokens: reduced-motion gate + gold focus ring */}
    <style>{`
      @media (prefers-reduced-motion: reduce) {
        .sp-rm, .sp-rm * { animation: none !important; transition: none !important; }
      }
      .sp-rm button:focus-visible, .sp-rm input:focus-visible, .sp-rm textarea:focus-visible {
        outline: 0.1875rem solid #D4AF37 !important;
        outline-offset: 0.1875rem;
      }
    `}</style>

    {showQR && genericShareUrl && (
      <QRShareModal
        url={genericShareUrl}
        title={room?.name || "Memory Palace"}
        onClose={() => setShowQR(false)}
      />
    )}
    </>
  );
}
