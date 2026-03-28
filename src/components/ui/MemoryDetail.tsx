"use client";
import { useState, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import ImageEditor from "@/components/ui/ImageEditor";
import ShareCard from "@/components/ui/ShareCard";

const DISPLAY_TYPES: [string, string, string][] = [
  ["photo","\u{1F5BC}\uFE0F","typeFrame"],["painting","\u{1F3A8}","typePainting"],["video","\u{1F3AC}","typeScreen"],["album","\u{1F4D6}","typeAlbum"],
  ["orb","\u{1F52E}","typeOrb"],["case","\u{1F3FA}","typeVitrine"],["audio","\u{1F3B5}","typeAudio"],["document","\u{1F4DC}","typeDocument"],
];

interface MemoryDetailProps {
  mem: Mem;
  room: WingRoom | null | undefined;
  wing: Wing | null | undefined;
  onClose: () => void;
  onDelete: (memId: string) => void;
  onUpdate: (memId: string, updates: Partial<Mem>) => void;
}

export default function MemoryDetail({mem,room,wing,onClose,onDelete,onUpdate}: MemoryDetailProps){
  const isMobile = useIsMobile();
  const { t, locale } = useTranslation("memoryDetail");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const [editing,setEditing]=useState(false);
  const [imageEditing,setImageEditing]=useState(false);
  const [sharing,setSharing]=useState(false);
  const [title,setTitle]=useState(mem.title);
  const [desc,setDesc]=useState(mem.desc||"");
  const [type,setType]=useState(mem.type);
  const [visibility,setVisibility]=useState<"private"|"shared"|"family"|"public">(mem.visibility||"private");
  const [historicalContext,setHistoricalContext]=useState(mem.historicalContext||"");
  const [contextLoading,setContextLoading]=useState(false);
  const [contextError,setContextError]=useState("");
  const [resProgress,setResProgress]=useState(mem.resolution?.progress??0);
  const accent=wing?.accent||T.color.terracotta;

  const fetchHistoricalContext=useCallback(async()=>{
    setContextLoading(true);
    setContextError("");
    try{
      const res=await fetch("/api/ai-context",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          title:mem.title,
          description:mem.desc,
          date:mem.createdAt,
          location:mem.locationName,
        }),
      });
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||t("failedToGenerateContext"));
      setHistoricalContext(data.context);
      onUpdate(mem.id,{historicalContext:data.context});
    }catch(err:any){
      setContextError(err.message||t("couldNotGenerateContext"));
    }finally{
      setContextLoading(false);
    }
  },[mem.id,mem.title,mem.desc,mem.createdAt,mem.locationName,onUpdate,t]);

  // Time Capsule logic
  const todayStr=new Date().toLocaleDateString('sv-SE');
  const isTimeCapsule=!!mem.revealDate;
  const isLocked=isTimeCapsule&&(mem.revealDate as string)>todayStr;
  const isRevealed=isTimeCapsule&&!isLocked;
  const daysUntilReveal=isLocked?Math.ceil((new Date(mem.revealDate!+"T00:00:00").getTime()-Date.now())/(1000*60*60*24)):0;

  const handleImageSave=(editedDataUrl: string)=>{
    onUpdate(mem.id,{dataUrl:editedDataUrl});
    setImageEditing(false);
  };

  const handleSave=()=>{
    const updates: Partial<Mem>={};
    if(title.trim()&&title!==mem.title) updates.title=title.trim();
    if(desc!==( mem.desc||"")) updates.desc=desc;
    if(type!==mem.type) updates.type=type;
    if(visibility!==(mem.visibility||"private")) updates.visibility=visibility;
    if(Object.keys(updates).length>0) onUpdate(mem.id,updates);
    setEditing(false);
  };

  const handleCancel=()=>{
    setTitle(mem.title);
    setDesc(mem.desc||"");
    setType(mem.type);
    setVisibility(mem.visibility||"private");
    setEditing(false);
  };

  return(
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(42,34,24,.5)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,animation:"fadeIn .2s ease"}}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("title")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={e=>e.stopPropagation()} style={{background:T.color.linen,borderRadius:isMobile?0:"1.25rem",border:isMobile?"none":`1px solid ${T.color.cream}`,boxShadow:isMobile?"none":"0 16px 70px rgba(44,44,42,.2)",maxWidth:isMobile?undefined:"30rem",width:isMobile?"100%":"90%",height:isMobile?"100%":undefined,overflow:isMobile?"auto":"hidden",animation:isMobile?"fadeIn .2s ease":"fadeUp .3s cubic-bezier(.23,1,.32,1)",display:isMobile?"flex":undefined,flexDirection:isMobile?"column":undefined}}>
        {/* Header gradient with image preview */}
        <div style={{height:"11.25rem",background:isLocked?`linear-gradient(145deg,hsl(${mem.hue},${Math.max(mem.s-20,10)}%,${Math.max(mem.l-25,20)}%),hsl(${mem.hue+18},${Math.max(mem.s-25,8)}%,${Math.max(mem.l-30,15)}%))`:mem.dataUrl?`url(${mem.dataUrl}) center/cover`:`linear-gradient(145deg,hsl(${mem.hue},${mem.s}%,${mem.l}%),hsl(${mem.hue+18},${mem.s-5}%,${mem.l-6}%))`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
          {isLocked&&<>
            <div style={{fontSize:"3.5rem",opacity:.6,zIndex:1}}>🔒</div>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at center,rgba(255,220,150,.08) 0%,transparent 70%)",animation:"capsuleShimmer 3s ease-in-out infinite"}}/>
            <style>{`@keyframes capsuleShimmer{0%,100%{opacity:.3}50%{opacity:.8}}`}</style>
          </>}
          {!isLocked&&!mem.dataUrl&&<span style={{fontSize:"3rem",opacity:.25}}>{"\u{1F5BC}\uFE0F"}</span>}
          <div style={{position:"absolute",inset:0,background:isLocked?"linear-gradient(180deg,transparent 20%,rgba(20,15,10,.8) 100%)":"linear-gradient(180deg,transparent 40%,rgba(42,34,24,.6) 100%)"}}/>
          <div style={{position:"absolute",bottom:"0.875rem",left:"1.125rem",right:"1.125rem"}}>
            {editing
              ?<input value={title} onChange={e=>setTitle(e.target.value)} autoFocus
                style={{fontFamily:T.font.display,fontSize:"1.375rem",color:"#FFF",background:"rgba(255,255,255,.15)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.3)",borderRadius:"0.5rem",padding:"0.375rem 0.75rem",width:"100%",outline:"none",boxSizing:"border-box"}}/>
              :<div style={{fontFamily:T.font.display,fontSize:"1.5rem",color:"rgba(255,255,255,.9)",textShadow:"0 2px 8px rgba(0,0,0,.3)"}}>{mem.title}</div>
            }
          </div>
          {isRevealed&&<div style={{position:"absolute",top:"0.75rem",right:"0.875rem",background:"linear-gradient(135deg,#C8A868,#A08050)",color:"#FFF",fontFamily:T.font.body,fontSize:"0.6875rem",fontWeight:600,padding:"0.25rem 0.625rem",borderRadius:"0.5rem",boxShadow:"0 2px 8px rgba(0,0,0,.2)"}}>{t("timeCapsuleOpened")}</div>}
        </div>

        <div style={{padding:"1.25rem 1.5rem 1.5rem"}}>
          {editing?<>
            {/* Description */}
            <label style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:"0.375rem"}}>{t("description")}</label>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder={t("descriptionPlaceholder")} rows={3}
              style={{width:"100%",padding:"0.625rem 0.875rem",borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.charcoal,outline:"none",boxSizing:"border-box",marginBottom:"1rem",resize:"none"}}/>
            {/* Display type */}
            <label style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:"0.5rem"}}>{t("displayAs")}</label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.375rem",marginBottom:"1.25rem"}}>
              {DISPLAY_TYPES.map(([val,icon,labelKey])=>(
                <button key={val} onClick={()=>setType(val)} style={{padding:"0.5rem 0.375rem",borderRadius:"0.5rem",border:type===val?`2px solid ${accent}`:`1px solid ${T.color.cream}`,background:type===val?`${accent}10`:T.color.white,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
                  <div style={{fontSize:"1rem"}}>{icon}</div>
                  <div style={{fontFamily:T.font.body,fontSize:"0.5625rem",color:type===val?accent:T.color.muted,fontWeight:type===val?600:400,marginTop:"0.0625rem"}}>{t(labelKey)}</div>
                </button>
              ))}
              {mem.dataUrl&&<button onClick={()=>setImageEditing(true)} style={{padding:"0.5rem 0.375rem",borderRadius:"0.5rem",border:`1px solid ${accent}60`,background:`${accent}08`,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
                <div style={{fontSize:"1rem"}}>{"\u{2728}"}</div>
                <div style={{fontFamily:T.font.body,fontSize:"0.5625rem",color:accent,fontWeight:600,marginTop:"0.0625rem"}}>{t("editImage")}</div>
              </button>}
            </div>
            {/* Visibility */}
            <label style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:"0.5rem"}}>{t("visibility")}</label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.375rem",marginBottom:"1.25rem"}}>
              {([["private","\u{1F512}",t("visPrivate")],["shared","\u{1F465}",t("visShared")],["family","\u{1F46A}",t("visFamily")],["public","\u{1F30D}",t("visPublic")]] as const).map(([val,icon,label])=>(
                <button key={val} onClick={()=>setVisibility(val)} style={{padding:"0.5rem 0.375rem",borderRadius:"0.5rem",border:visibility===val?`2px solid ${accent}`:`1px solid ${T.color.cream}`,background:visibility===val?`${accent}10`:T.color.white,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
                  <div style={{fontSize:"0.875rem"}}>{icon}</div>
                  <div style={{fontFamily:T.font.body,fontSize:"0.5625rem",color:visibility===val?accent:T.color.muted,fontWeight:visibility===val?600:400,marginTop:"0.0625rem"}}>{label}</div>
                </button>
              ))}
            </div>
            {/* Save / Cancel */}
            <div style={{display:"flex",gap:"0.625rem"}}>
              <button onClick={handleCancel} style={{flex:1,padding:"0.75rem",fontFamily:T.font.body,fontSize:"0.8125rem",background:"transparent",border:`1px solid ${T.color.cream}`,borderRadius:"0.625rem",cursor:"pointer",color:T.color.muted}}>{t("cancel")}</button>
              <button onClick={handleSave} disabled={!title.trim()} style={{flex:2,padding:"0.75rem",fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:600,background:title.trim()?accent:`${T.color.sandstone}40`,border:"none",borderRadius:"0.625rem",cursor:title.trim()?"pointer":"default",color:title.trim()?T.color.white:T.color.muted}}>{t("saveChanges")}</button>
            </div>
          </>:<>
            {/* View mode */}
            {isLocked&&<div style={{background:"linear-gradient(135deg,rgba(42,34,24,.06),rgba(200,168,104,.1))",border:`1px solid ${T.color.cream}`,borderRadius:"0.75rem",padding:"1rem",marginBottom:"1rem",textAlign:"center"}}>
              <div style={{fontSize:"1.75rem",marginBottom:"0.5rem"}}>🔒</div>
              <div style={{fontFamily:T.font.display,fontSize:"1.125rem",color:T.color.charcoal,marginBottom:"0.25rem"}}>
                {daysUntilReveal===1?t("opensTomorrow"):daysUntilReveal<=30?t("opensInDays", { count: String(daysUntilReveal) }):t("opensOn", { date: new Date(mem.revealDate!+"T00:00:00").toLocaleDateString(locale==="nl"?"nl-NL":"en-US",{month:"long",day:"numeric",year:"numeric"}) })}
              </div>
              <div style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.muted}}>{t("capsuleSealed")}</div>
              {mem.resolution&&<div style={{marginTop:"0.75rem",padding:"0.625rem 0.875rem",borderRadius:"0.625rem",background:"rgba(74,103,65,.08)",border:`1px solid ${T.color.sage}30`}}>
                <div style={{fontFamily:T.font.body,fontSize:"0.75rem",fontStyle:"italic",color:T.color.walnut,lineHeight:1.5}}>
                  {t("resolutionGoal", { date: new Date(mem.revealDate!+"T00:00:00").toLocaleDateString(locale==="nl"?"nl-NL":"en-US",{month:"long",day:"numeric",year:"numeric"}) })}
                </div>
              </div>}
            </div>}
            {!isLocked&&(mem.desc||desc)&&<p style={{fontFamily:T.font.body,fontSize:"0.875rem",color:T.color.walnut,lineHeight:1.7,marginBottom:"0.75rem"}}>{mem.desc}</p>}
            {/* Resolution progress section */}
            {!isLocked&&mem.resolution&&<div style={{marginBottom:"1rem",padding:"1rem",borderRadius:"0.75rem",border:`1px solid ${T.color.sage}30`,background:"linear-gradient(135deg,rgba(74,103,65,.06),rgba(74,103,65,.02))"}}>
              <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.sage,letterSpacing:".5px",textTransform:"uppercase",marginBottom:"0.625rem",fontWeight:600}}>{t("resolutionLabel")}</div>
              <div style={{fontFamily:T.font.body,fontSize:"0.875rem",color:T.color.charcoal,lineHeight:1.5,marginBottom:"0.75rem"}}>{mem.resolution.goal}</div>
              {mem.resolution.targetDate&&<div style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.muted,marginBottom:"0.75rem",display:"flex",alignItems:"center",gap:"0.375rem"}}>
                <span>{t("target")}</span>
                <span style={{fontWeight:600,color:T.color.walnut}}>{new Date(mem.resolution.targetDate+"T00:00:00").toLocaleDateString(locale==="nl"?"nl-NL":"en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                {(()=>{const d=Math.ceil((new Date(mem.resolution.targetDate!+"T00:00:00").getTime()-Date.now())/(1000*60*60*24));return d>0?<span style={{color:T.color.sage,fontStyle:"italic"}}>{t("daysLeft", { count: String(d) })}</span>:<span style={{color:T.color.error,fontStyle:"italic"}}>{t("pastDue")}</span>;})()}
              </div>}
              {typeof mem.resolution.progress==="number"&&<div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.375rem"}}>
                  <span style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.muted}}>{t("progress")}</span>
                  <span style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:600,color:resProgress>=100?T.color.success:T.color.sage}}>{resProgress}%</span>
                </div>
                <input type="range" min={0} max={100} value={resProgress} onChange={e=>setResProgress(Number(e.target.value))}
                  style={{width:"100%",accentColor:T.color.sage,marginBottom:"0.5rem"}}/>
                <div style={{width:"100%",height:"0.375rem",borderRadius:"0.1875rem",background:`${T.color.sandstone}25`,overflow:"hidden",marginBottom:"0.625rem"}}>
                  <div style={{width:`${resProgress}%`,height:"100%",borderRadius:"0.1875rem",background:resProgress>=100?`linear-gradient(90deg,${T.color.success},#5A8751)`:`linear-gradient(90deg,${T.color.sage}cc,${T.color.sage})`,transition:"width .3s ease"}}/>
                </div>
                {resProgress!==(mem.resolution.progress??0)&&<button onClick={()=>{
                  const updatedRes={...mem.resolution!,progress:resProgress};
                  onUpdate(mem.id,{resolution:updatedRes});
                }} style={{width:"100%",padding:"0.5rem 0.875rem",borderRadius:"0.5rem",border:"none",background:T.color.sage,color:"#FFF",fontFamily:T.font.body,fontSize:"0.75rem",fontWeight:600,cursor:"pointer",transition:"all .15s"}}>
                  {t("updateProgress")}
                </button>}
              </div>}
            </div>}
            <p style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.muted,marginBottom:"0.25rem",display:"flex",alignItems:"center",gap:"0.375rem"}}>
              <span>{DISPLAY_TYPES.find(d=>d[0]===mem.type)?.[1]}</span>
              <span style={{fontStyle:"italic"}}>{t("displayedAs", { type: t(DISPLAY_TYPES.find(d=>d[0]===mem.type)?.[2]||"typeFrame") })}</span>
            </p>
            <p style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.muted,fontStyle:"italic",marginBottom:"1rem"}}>
              {t("livesIn", { room: room?room.name:t("unknownRoom") })}
            </p>
            {/* Historical Context section */}
            {!isLocked&&<div style={{marginBottom:"1rem"}}>
              {historicalContext?<div style={{background:"linear-gradient(135deg,rgba(74,103,65,.06),rgba(193,127,89,.06))",border:`1px solid ${T.color.cream}`,borderRadius:"0.75rem",padding:"1rem"}}>
                <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",marginBottom:"0.5rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span>{t("historicalContext")}</span>
                  <button onClick={()=>{setHistoricalContext("");onUpdate(mem.id,{historicalContext:""});}} style={{background:"none",border:"none",cursor:"pointer",fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,padding:0,textDecoration:"underline"}}>{t("remove")}</button>
                </div>
                <p style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.walnut,lineHeight:1.7,margin:0,whiteSpace:"pre-wrap"}}>{historicalContext}</p>
              </div>
              :contextLoading?<div style={{background:`${T.color.cream}40`,border:`1px solid ${T.color.cream}`,borderRadius:"0.75rem",padding:"1rem",textAlign:"center"}}>
                <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.muted,display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem"}}>
                  <span style={{display:"inline-block",width:"0.875rem",height:"0.875rem",border:`2px solid ${T.color.sandstone}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                  {t("discoveringContext")}
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
              :contextError?<div role="alert" style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.error,marginBottom:"0.25rem"}}>{contextError}</div>
              :<button onClick={fetchHistoricalContext} style={{width:"100%",padding:"0.625rem 1rem",fontFamily:T.font.body,fontSize:"0.8125rem",background:"transparent",border:`1px dashed ${T.color.sandstone}`,borderRadius:"0.625rem",cursor:"pointer",color:T.color.walnut,display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",transition:"all .15s"}}>
                <span style={{fontSize:"1rem"}}>&#x1F30D;</span> {t("addHistoricalContext")}
              </button>}
            </div>}
            <div style={{display:"flex",gap:isMobile?"0.5rem":"0.625rem",flexWrap:isMobile?"wrap":"nowrap"}}>
              <button onClick={()=>{onDelete(mem.id);onClose();}} disabled={isLocked} style={{flex:1,padding:isMobile?"0.875rem":"0.75rem",fontFamily:T.font.body,fontSize:"0.8125rem",background:"transparent",border:`1px solid ${T.color.error}80`,borderRadius:"0.625rem",cursor:isLocked?"default":"pointer",color:isLocked?T.color.muted:T.color.error,opacity:isLocked?.5:1,minHeight:"2.75rem"}}>{t("deleteBtn")}</button>
              <button onClick={onClose} style={{flex:1,padding:isMobile?"0.875rem":"0.75rem",fontFamily:T.font.body,fontSize:"0.8125rem",background:"transparent",border:`1px solid ${T.color.cream}`,borderRadius:"0.625rem",cursor:"pointer",color:T.color.muted,minHeight:"2.75rem"}}>{t("closeBtn")}</button>
              <button onClick={()=>setSharing(true)} style={{flex:1,padding:isMobile?"0.875rem":"0.75rem",fontFamily:T.font.body,fontSize:"0.8125rem",background:"transparent",border:`1px solid ${T.color.cream}`,borderRadius:"0.625rem",cursor:"pointer",color:T.color.walnut,minHeight:"2.75rem"}}>{t("shareBtn")}</button>
              {isLocked
                ?<button disabled style={{flex:2,padding:"0.75rem",fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:600,background:`${T.color.sandstone}40`,border:"none",borderRadius:"0.625rem",cursor:"default",color:T.color.muted,minWidth:"2.75rem",minHeight:"2.75rem"}}>{t("sealed")} 🔒</button>
                :<button onClick={()=>setEditing(true)} style={{flex:2,padding:"0.75rem",fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:600,background:accent,border:"none",borderRadius:"0.625rem",cursor:"pointer",color:T.color.white,minWidth:"2.75rem",minHeight:"2.75rem"}}>{t("editMemory")}</button>
              }
            </div>
          </>}
        </div>
      </div>
      {imageEditing&&mem.dataUrl&&<ImageEditor dataUrl={mem.dataUrl} accent={accent} onSave={handleImageSave} onCancel={()=>setImageEditing(false)}/>}
      {sharing&&<ShareCard mem={mem} roomName={room?.name} roomIcon={room?.icon} wingName={wing?.name} wingIcon={wing?.icon} accent={accent} onClose={()=>setSharing(false)}/>}
    </div>
  );
}
