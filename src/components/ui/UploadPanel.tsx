"use client";
import { useState, useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { useOnlineStatus } from "@/lib/hooks/useOfflineSync";
import { UPLOAD_DEMOS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import Image from "next/image";

interface UploadPanelProps {
  wing: Wing | null | undefined;
  room: WingRoom | null | undefined;
  onClose: () => void;
  onAdd: (mem: Mem) => void;
  roomMemories?: Mem[];
  onUpdateMemory?: (memId: string, updates: Partial<Mem>) => void;
  suggestedType?: string;
}

export default function UploadPanel({wing,room,onClose,onAdd,roomMemories=[],onUpdateMemory,suggestedType}: UploadPanelProps){
  const isMobile = useIsMobile();
  const { t, locale } = useTranslation("uploadPanel");
  const { t: tc } = useTranslation("common");
  const { containerRef, handleKeyDown } = useFocusTrap(true);
  const isOnline = useOnlineStatus();
  const [savedOffline,setSavedOffline]=useState(false);
  const [title,setTitle]=useState("");
  const [desc,setDesc]=useState("");
  const [displayType,setDisplayType]=useState(suggestedType||"photo");
  const [dragOver,setDragOver]=useState(false);
  const [preview,setPreview]=useState<string|null>(null);
  const [fileName,setFileName]=useState("");
  const [imageUrl,setImageUrl]=useState("");
  const [isVideo,setIsVideo]=useState(false);
  const [uploadMethod,setUploadMethod]=useState("url");
  const [timeCapsule,setTimeCapsule]=useState(false);
  const [revealDate,setRevealDate]=useState("");
  const [locationName,setLocationName]=useState("");
  const [lat,setLat]=useState<number|null>(null);
  const [lng,setLng]=useState<number|null>(null);
  const [geoLoading,setGeoLoading]=useState(false);
  const [isResolution,setIsResolution]=useState(false);
  const [goalDesc,setGoalDesc]=useState("");
  const [targetDate,setTargetDate]=useState("");
  const [trackProgress,setTrackProgress]=useState(false);
  const [reminders,setReminders]=useState(false);
  const [contextOffer,setContextOffer]=useState(false);
  const [contextLoading,setContextLoading]=useState(false);
  const [contextPreview,setContextPreview]=useState("");
  const [contextAccepted,setContextAccepted]=useState(false);
  const [fileSizeError,setFileSizeError]=useState<string|null>(null);
  const fileRef=useRef<HTMLInputElement|null>(null);
  const accent=wing?.accent||T.color.terracotta;

  const MAX_IMAGE_SIZE=50*1024*1024; // 50 MB
  const MAX_VIDEO_SIZE=100*1024*1024; // 100 MB

  const fetchContext=useCallback(async()=>{
    setContextLoading(true);
    try{
      const res=await fetch("/api/ai-context",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({title:title.trim(),description:desc,date:new Date().toISOString(),location:locationName}),
      });
      const data=await res.json();
      if(res.ok&&data.context){setContextPreview(data.context);setContextOffer(true);}
    }catch{}finally{setContextLoading(false);}
  },[title,desc,locationName]);

  const processFile=(file: File)=>{
    setFileSizeError(null);
    const isVid=file.type.startsWith("video/");
    const maxSize=isVid?MAX_VIDEO_SIZE:MAX_IMAGE_SIZE;
    const maxLabel=isVid?"100 MB":"50 MB";
    if(file.size>maxSize){
      const sizeMB=(file.size/(1024*1024)).toFixed(1);
      setFileSizeError(t("fileTooLarge", { size: sizeMB, type: isVid?t("videos"):t("images"), max: maxLabel }));
      return;
    }
    setFileName(file.name);
    if(!title)setTitle(file.name.replace(/\.[^.]+$/,""));
    setIsVideo(isVid);
    setDisplayType(isVid?"video":"photo");
    const r=new FileReader();
    r.onload=e=>{setPreview(e.target?.result as string);};
    r.readAsDataURL(file);
  };
  const loadUrl=()=>{
    if(!imageUrl.trim())return;
    const url=imageUrl.trim();
    setPreview(url);
    if(!title)setTitle(t("memory"));
    const isVid=/\.(mp4|webm|mov|avi)/i.test(url);
    setIsVideo(isVid);
    if(isVid)setDisplayType("video");
  };
  const handleDrop=(e: React.DragEvent)=>{e.preventDefault();setDragOver(false);if(e.dataTransfer.files?.[0])processFile(e.dataTransfer.files[0]);};
  const useCurrentLocation=()=>{
    if(!navigator.geolocation){return;}
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos=>{setLat(pos.coords.latitude);setLng(pos.coords.longitude);setGeoLoading(false);if(!locationName)setLocationName(t("currentLocation"));},
      ()=>{setGeoLoading(false);},
      {enableHighAccuracy:true,timeout:10000}
    );
  };
  const todayStr=new Date().toISOString().split("T")[0];
  const capsuleValid=!timeCapsule||( revealDate&&revealDate>todayStr);
  const submit=()=>{
    if(!title.trim()||!capsuleValid)return;
    const hue=Math.floor(Math.random()*360);
    const mem: Mem={id:Date.now().toString(),title:title.trim(),hue,s:45+Math.floor(Math.random()*15),l:55+Math.floor(Math.random()*15),type:displayType,desc,dataUrl:preview||null,videoBlob:isVideo,createdAt:new Date().toISOString()};
    if(timeCapsule&&revealDate) mem.revealDate=revealDate;
    if(timeCapsule&&isResolution&&goalDesc.trim()){
      mem.resolution={goal:goalDesc.trim(),progress:trackProgress?0:undefined,reminders};
      if(targetDate) mem.resolution.targetDate=targetDate;
    }
    if(lat!==null&&lng!==null){mem.lat=lat;mem.lng=lng;}
    if(locationName.trim()) mem.locationName=locationName.trim();
    if(contextAccepted&&contextPreview) mem.historicalContext=contextPreview;
    onAdd(mem);
    if (!isOnline) {
      setSavedOffline(true);
      setTimeout(() => onClose(), 1500);
      return;
    }
    onClose();
  };

  const demos=UPLOAD_DEMOS;

  return(
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(42,34,24,.4)",backdropFilter:"blur(8px)",zIndex:55,animation:"fadeIn .2s ease"}}>
      <div ref={containerRef} role="dialog" aria-modal="true" aria-label={t("addMemory")} onKeyDown={(e) => { if (e.key === "Escape") onClose(); handleKeyDown(e); }} onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:0,bottom:0,width:isMobile?"100%":"min(380px, 92vw)",background:`${T.color.linen}f8`,backdropFilter:"blur(20px)",borderLeft:isMobile?"none":`1px solid ${T.color.cream}`,padding:isMobile?"1.25rem 1rem":"1.75rem 1.5rem",overflowY:"auto",animation:"slideInRight .3s cubic-bezier(.23,1,.32,1)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
          <div>
            <h3 style={{fontFamily:T.font.display,fontSize:"1.375rem",fontWeight:500,color:T.color.charcoal,margin:0}}>{t("addMemory")}</h3>
            <p style={{fontFamily:T.font.body,fontSize:"0.75rem",color:accent,margin:"0.25rem 0 0"}}>{room?.icon} {room?.name}</p>
          </div>
          <button onClick={onClose} aria-label={tc("close")} style={{width:isMobile?"2.5rem":"2rem",height:isMobile?"2.5rem":"2rem",borderRadius:isMobile?"1.25rem":"1rem",border:`1px solid ${T.color.cream}`,background:T.color.warmStone,color:T.color.muted,fontSize:isMobile?"1rem":"0.875rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",minWidth:"2.75rem",minHeight:"2.75rem"}}>✕</button>
        </div>

        {/* Method tabs */}
        <div style={{display:"flex",gap:"0.25rem",marginBottom:"1rem",background:T.color.warmStone,borderRadius:"0.625rem",padding:"0.1875rem"}}>
          {[["url",t("pasteUrl")],["file",t("uploadFile")],...(roomMemories.length>0?[["room",t("fromRoom")]]:[] as string[][])].map(([val,label])=>(
            <button key={val} onClick={()=>setUploadMethod(val)} role="tab" aria-selected={uploadMethod===val} style={{flex:1,padding:isMobile?"0.75rem 0.75rem":"0.5rem 0.75rem",borderRadius:"0.5rem",border:"none",background:uploadMethod===val?T.color.white:"transparent",color:uploadMethod===val?T.color.charcoal:T.color.muted,fontFamily:T.font.body,fontSize:isMobile?"0.875rem":"0.75rem",fontWeight:uploadMethod===val?600:400,cursor:"pointer",transition:"all .2s"}}>{label}</button>
          ))}
        </div>

        {uploadMethod==="url"?<>
          {/* URL input */}
          <label htmlFor="upload-url" style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:"0.375rem"}}>{t("imageOrVideoUrl")}</label>
          <div style={{display:"flex",gap:"0.375rem",marginBottom:"0.75rem"}}>
            <input id="upload-url" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")loadUrl();}} placeholder={t("urlPlaceholder")} style={{flex:1,padding:"0.625rem 0.875rem",borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.charcoal,outline:"none",boxSizing:"border-box"}}/>
            <button onClick={loadUrl} style={{padding:"0.625rem 0.875rem",borderRadius:"0.625rem",border:"none",background:accent,color:"#FFF",fontFamily:T.font.body,fontSize:"0.75rem",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{t("load")}</button>
          </div>
          {/* Quick demo images */}
          <div style={{marginBottom:"1rem"}}>
            <label style={{fontFamily:T.font.body,fontSize:"0.625rem",color:T.color.muted,display:"block",marginBottom:"0.375rem"}}>{t("tryDemoImage")}</label>
            <div style={{display:"flex",gap:"0.375rem"}}>
              {demos.map((d,i)=>(
                <button key={i} onClick={()=>{setImageUrl(d.url);setPreview(d.url);if(!title)setTitle(d.title);}} style={{flex:1,padding:"0.375rem 0.5rem",borderRadius:"0.5rem",border:`1px solid ${T.color.cream}`,background:T.color.warmStone,fontFamily:T.font.body,fontSize:"0.625rem",color:T.color.walnut,cursor:"pointer"}}>{d.title}</button>
              ))}
            </div>
          </div>
        </>:<>
          {/* File drop zone */}
          <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
            onClick={()=>fileRef.current?.click()}
            style={{border:`2px dashed ${dragOver?accent:T.color.sandstone}`,borderRadius:"1rem",padding:"2rem",textAlign:"center",cursor:"pointer",background:dragOver?`${accent}08`:T.color.warmStone,marginBottom:"1rem",transition:"all .2s"}}>
            <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>{dragOver?"✨":"📸"}</div>
            <p style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.muted,margin:0}}>{t("dropOrBrowse")}</p>
            <p style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.sandstone,margin:"0.25rem 0 0"}}>{t("fileTypes")}</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])processFile(e.target.files[0]);}}/>
          {fileName&&<p style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,marginBottom:"0.5rem"}}>{t("fileLabel", { name: fileName })}</p>}
          {fileSizeError&&<p role="alert" style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.error,background:`${T.color.error}10`,padding:"0.625rem 0.875rem",borderRadius:"0.625rem",marginBottom:"0.75rem",lineHeight:1.5}}>{fileSizeError}</p>}
        </>}

        {/* Room memory picker */}
        {uploadMethod==="room"&&<>
          <p style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.muted,marginBottom:"0.75rem"}}>
            {t("chooseMemory", { type: displayType })}
          </p>
          <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",marginBottom:"1rem",maxHeight:"15rem",overflowY:"auto"}}>
            {roomMemories.map(m=>{
              const typeIcons: Record<string,string>={"photo":"\u{1F5BC}\uFE0F","painting":"\u{1F3A8}","video":"\u{1F3AC}","album":"\u{1F4D6}","orb":"\u{1F52E}","case":"\u{1F3FA}","audio":"\u{1F3B5}","document":"\u{1F4DC}","voice":"\u{1F399}\uFE0F"};
              return(
                <button key={m.id} onClick={()=>{
                  if(onUpdateMemory){
                    onUpdateMemory(m.id,{type:displayType,displayed:true});
                    onClose();
                  }
                }} style={{
                  display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.75rem 0.875rem",borderRadius:"0.75rem",
                  border:`1px solid ${T.color.cream}`,background:T.color.white,cursor:"pointer",
                  textAlign:"left",transition:"all .15s",
                }} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=accent;(e.currentTarget as HTMLElement).style.background=`${accent}08`;}}
                   onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=T.color.cream;(e.currentTarget as HTMLElement).style.background=T.color.white;}}>
                  {m.dataUrl?
                    <div style={{width:"2.75rem",height:"2.75rem",borderRadius:"0.5rem",overflow:"hidden",flexShrink:0,border:`1px solid ${T.color.cream}`,position:"relative"}}>
                      <Image src={m.dataUrl!} fill sizes="44px" style={{objectFit:"cover"}} alt=""/>
                    </div>
                  :
                    <div style={{width:"2.75rem",height:"2.75rem",borderRadius:"0.5rem",background:`hsl(${m.hue},${m.s}%,${m.l}%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.125rem",flexShrink:0}}>
                      {typeIcons[m.type]||"\u{2728}"}
                    </div>
                  }
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:600,color:T.color.charcoal,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.title}</div>
                    <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted}}>
                      {t("currentlyWillDisplay", { current: m.type, target: displayType })}
                    </div>
                  </div>
                  <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:accent,fontWeight:600,flexShrink:0}}>{t("assign")}</div>
                </button>
              );
            })}
            {roomMemories.length===0&&<p style={{fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.muted,textAlign:"center",padding:"1.25rem"}}>{t("noMemoriesInRoom")}</p>}
          </div>

          {/* Display type selector for room picker */}
          <label style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:"0.5rem"}}>{t("displayAs")}</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.5rem",marginBottom:"1rem"}}>
            {[["photo","\u{1F5BC}\uFE0F","typeFrame"],["painting","\u{1F3A8}","typePainting"],["video","\u{1F3AC}","typeScreen"],["album","\u{1F4D6}","typeAlbum"],["orb","\u{1F52E}","typeOrb"],["case","\u{1F3FA}","typeVitrine"],["audio","\u{1F3B5}","typeAudio"],["document","\u{1F4DC}","typeDocument"]].map(([val,icon,labelKey])=>(
              <button key={val} onClick={()=>setDisplayType(val)} style={{padding:"0.625rem 0.5rem",borderRadius:"0.625rem",border:displayType===val?`2px solid ${accent}`:`1px solid ${T.color.cream}`,background:displayType===val?`${accent}10`:T.color.white,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
                <div style={{fontSize:"1.25rem"}}>{icon}</div>
                <div style={{fontFamily:T.font.body,fontSize:"0.625rem",color:displayType===val?accent:T.color.muted,fontWeight:displayType===val?600:400,marginTop:"0.125rem"}}>{t(labelKey)}</div>
              </button>
            ))}
          </div>
        </>}

        {/* Preview */}
        {preview&&<div style={{borderRadius:"0.75rem",overflow:"hidden",marginBottom:"1rem",border:`1px solid ${T.color.cream}`}}>
          {isVideo?<video src={preview} style={{width:"100%",maxHeight:"10rem",objectFit:"cover",display:"block"}} autoPlay muted loop playsInline/>
            :<img src={preview} style={{width:"100%",maxHeight:"10rem",objectFit:"cover",display:"block"}} alt="" onError={e=>{(e.target as HTMLElement).style.display="none";}}/>}
        </div>}

        {/* Title */}
        <label htmlFor="upload-title" style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:"0.375rem"}}>{t("titleLabel")}</label>
        <input id="upload-title" value={title} onChange={e=>setTitle(e.target.value)} placeholder={t("nameMemory")} style={{width:"100%",padding:"0.75rem 0.875rem",borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:"0.875rem",color:T.color.charcoal,outline:"none",boxSizing:"border-box",marginBottom:"1rem"}}/>
        {/* Description */}
        <label htmlFor="upload-description" style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:"0.375rem"}}>{t("descriptionOptional")}</label>
        <textarea id="upload-description" value={desc} onChange={e=>setDesc(e.target.value)} placeholder={t("descriptionPlaceholder")} rows={2} style={{width:"100%",padding:"0.75rem 0.875rem",borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.charcoal,outline:"none",boxSizing:"border-box",marginBottom:"1rem",resize:"none"}}/>
        {/* Display type */}
        <label style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:"0.5rem"}}>{t("displayAs")}</label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.5rem",marginBottom:"1.5rem"}}>
          {[["photo","\u{1F5BC}\uFE0F","typeFrame"],["painting","\u{1F3A8}","typePainting"],["video","\u{1F3AC}","typeScreen"],["album","\u{1F4D6}","typeAlbum"],["orb","\u{1F52E}","typeOrb"],["case","\u{1F3FA}","typeVitrine"],["audio","\u{1F3B5}","typeAudio"],["document","\u{1F4DC}","typeDocument"]].map(([val,icon,labelKey])=>(
            <button key={val} onClick={()=>setDisplayType(val)} style={{padding:"0.625rem 0.5rem",borderRadius:"0.625rem",border:displayType===val?`2px solid ${accent}`:`1px solid ${T.color.cream}`,background:displayType===val?`${accent}10`:T.color.white,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
              <div style={{fontSize:"1.25rem"}}>{icon}</div>
              <div style={{fontFamily:T.font.body,fontSize:"0.625rem",color:displayType===val?accent:T.color.muted,fontWeight:displayType===val?600:400,marginTop:"0.125rem"}}>{t(labelKey)}</div>
            </button>
          ))}
        </div>
        {/* Location */}
        <label style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:"0.375rem"}}>{t("locationOptional")}</label>
        <div style={{display:"flex",gap:"0.375rem",marginBottom:"0.375rem"}}>
          <input value={locationName} onChange={e=>setLocationName(e.target.value)} placeholder={t("locationPlaceholder")} style={{flex:1,padding:"0.625rem 0.875rem",borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.charcoal,outline:"none",boxSizing:"border-box"}}/>
          <button onClick={useCurrentLocation} disabled={geoLoading} style={{padding:"0.625rem 0.75rem",borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`,background:T.color.warmStone,fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.walnut,cursor:geoLoading?"wait":"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:"0.25rem"}}>
            {geoLoading?<span style={{display:"inline-block",width:"0.75rem",height:"0.75rem",border:"2px solid transparent",borderTopColor:T.color.walnut,borderRadius:"50%",animation:"spin .6s linear infinite"}}/>:"\uD83D\uDCCD"} {t("gps")}
          </button>
        </div>
        {lat!==null&&lng!==null&&<p style={{fontFamily:T.font.body,fontSize:"0.625rem",color:T.color.muted,margin:"0 0 0.75rem",paddingLeft:"0.125rem"}}>{t("coordinates", { lat: lat.toFixed(4), lng: lng.toFixed(4) })}</p>}
        {(lat===null||lng===null)&&<div style={{height:"0.75rem",marginBottom:"0.25rem"}}/>}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        {/* Time Capsule */}
        <div style={{marginBottom:"1.25rem",padding:"1rem",borderRadius:"0.75rem",border:`1px solid ${timeCapsule?`${accent}60`:T.color.cream}`,background:timeCapsule?`${accent}08`:T.color.warmStone,transition:"all .2s"}}>
          <label style={{display:"flex",alignItems:"center",gap:"0.625rem",cursor:"pointer",marginBottom:timeCapsule?"0.875rem":0}}>
            <div onClick={()=>setTimeCapsule(!timeCapsule)} style={{width:"2.375rem",height:"1.375rem",borderRadius:"0.6875rem",background:timeCapsule?accent:`${T.color.sandstone}80`,position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
              <div style={{width:"1rem",height:"1rem",borderRadius:"0.5rem",background:"#FFF",position:"absolute",top:"0.1875rem",left:timeCapsule?"1.1875rem":"0.1875rem",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
            </div>
            <div>
              <div style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:600,color:T.color.charcoal}}>{t("timeCapsule")}</div>
              <div style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted}}>{t("lockUntilFuture")}</div>
            </div>
          </label>
          {timeCapsule&&<div>
            <label style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:"0.375rem"}}>{t("revealDate")}</label>
            <input type="date" value={revealDate} min={todayStr} onChange={e=>setRevealDate(e.target.value)}
              style={{width:"100%",padding:"0.625rem 0.875rem",borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.charcoal,outline:"none",boxSizing:"border-box"}}/>
            {revealDate&&revealDate<=todayStr&&<p style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.error,margin:"0.375rem 0 0"}}>{t("revealDateFuture")}</p>}
            {/* Resolution toggle */}
            <div style={{marginTop:"1rem"}}>
              <label style={{display:"flex",alignItems:"center",gap:"0.625rem",cursor:"pointer",marginBottom:isResolution?"0.875rem":0}}>
                <div onClick={()=>setIsResolution(!isResolution)} style={{width:"2.375rem",height:"1.375rem",borderRadius:"0.6875rem",background:isResolution?T.color.sage:`${T.color.sandstone}80`,position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
                  <div style={{width:"1rem",height:"1rem",borderRadius:"0.5rem",background:"#FFF",position:"absolute",top:"0.1875rem",left:isResolution?"1.1875rem":"0.1875rem",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                </div>
                <div>
                  <div style={{fontFamily:T.font.body,fontSize:"0.75rem",fontWeight:600,color:T.color.charcoal}}>{t("resolution")}</div>
                  <div style={{fontFamily:T.font.body,fontSize:"0.625rem",color:T.color.muted}}>{t("trackGoal")}</div>
                </div>
              </label>
              {isResolution&&<div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
                <div>
                  <label style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:"0.375rem"}}>{t("goalDescription")}</label>
                  <input value={goalDesc} onChange={e=>setGoalDesc(e.target.value)} placeholder={t("goalPlaceholder")}
                    style={{width:"100%",padding:"0.625rem 0.875rem",borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.charcoal,outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <label style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:"0.375rem"}}>{t("targetDate")}</label>
                  <input type="date" value={targetDate} min={todayStr} onChange={e=>setTargetDate(e.target.value)}
                    style={{width:"100%",padding:"0.625rem 0.875rem",borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:"0.8125rem",color:T.color.charcoal,outline:"none",boxSizing:"border-box"}}/>
                </div>
                <label style={{display:"flex",alignItems:"center",gap:"0.625rem",cursor:"pointer"}}>
                  <div onClick={()=>setTrackProgress(!trackProgress)} style={{width:"2.125rem",height:"1.25rem",borderRadius:"0.625rem",background:trackProgress?T.color.sage:`${T.color.sandstone}80`,position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
                    <div style={{width:"0.875rem",height:"0.875rem",borderRadius:"0.4375rem",background:"#FFF",position:"absolute",top:"0.1875rem",left:trackProgress?"1.0625rem":"0.1875rem",transition:"left .2s",boxShadow:"0 1px 2px rgba(0,0,0,.2)"}}/>
                  </div>
                  <span style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.charcoal}}>{t("trackProgress")}</span>
                </label>
                <label style={{display:"flex",alignItems:"center",gap:"0.625rem",cursor:"pointer"}}>
                  <div onClick={()=>setReminders(!reminders)} style={{width:"2.125rem",height:"1.25rem",borderRadius:"0.625rem",background:reminders?T.color.sage:`${T.color.sandstone}80`,position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
                    <div style={{width:"0.875rem",height:"0.875rem",borderRadius:"0.4375rem",background:"#FFF",position:"absolute",top:"0.1875rem",left:reminders?"1.0625rem":"0.1875rem",transition:"left .2s",boxShadow:"0 1px 2px rgba(0,0,0,.2)"}}/>
                  </div>
                  <span style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.charcoal}}>{t("getReminders")}</span>
                </label>
              </div>}
            </div>
          </div>}
        </div>
        {/* Historical Context suggestion */}
        {title.trim()&&!timeCapsule&&<div style={{marginBottom:"1.25rem"}}>
          {contextOffer&&contextPreview?<div style={{padding:"0.875rem",borderRadius:"0.75rem",border:`1px solid ${T.color.cream}`,background:"linear-gradient(135deg,rgba(74,103,65,.06),rgba(193,127,89,.06))"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.5rem"}}>
              <span style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase"}}>{t("historicalContext")}</span>
              <div style={{display:"flex",gap:"0.375rem"}}>
                <button onClick={()=>{setContextAccepted(true);}} style={{fontFamily:T.font.body,fontSize:"0.6875rem",fontWeight:600,color:contextAccepted?T.color.sage:accent,background:"none",border:"none",cursor:"pointer",padding:0}}>{contextAccepted?t("added"):t("accept")}</button>
                <button onClick={()=>{setContextOffer(false);setContextPreview("");setContextAccepted(false);}} style={{fontFamily:T.font.body,fontSize:"0.6875rem",color:T.color.muted,background:"none",border:"none",cursor:"pointer",padding:0}}>{t("dismiss")}</button>
              </div>
            </div>
            <p style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.walnut,lineHeight:1.6,margin:0,maxHeight:"7.5rem",overflowY:"auto",whiteSpace:"pre-wrap"}}>{contextPreview}</p>
          </div>
          :contextLoading?<div style={{padding:"0.75rem",borderRadius:"0.625rem",border:`1px solid ${T.color.cream}`,background:`${T.color.cream}40`,textAlign:"center"}}>
            <span style={{fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.muted,display:"inline-flex",alignItems:"center",gap:"0.375rem"}}>
              <span style={{display:"inline-block",width:"0.75rem",height:"0.75rem",border:`2px solid ${T.color.sandstone}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
              {t("generatingContext")}
            </span>
          </div>
          :<button onClick={fetchContext} style={{width:"100%",padding:"0.625rem 0.875rem",borderRadius:"0.625rem",border:`1px dashed ${T.color.sandstone}`,background:"transparent",fontFamily:T.font.body,fontSize:"0.75rem",color:T.color.walnut,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.375rem"}}>
            <span>&#x1F30D;</span> {t("addHistoricalContext")}
          </button>}
        </div>}
        {/* Saved offline indicator */}
        {savedOffline&&<div style={{padding:"0.75rem 1rem",borderRadius:"0.75rem",background:`${T.color.success}18`,border:`1px solid ${T.color.success}40`,marginBottom:"0.75rem",textAlign:"center"}}>
          <span style={{fontFamily:T.font.body,fontSize:"0.8125rem",fontWeight:600,color:T.color.success}}>{t("savedOffline")}</span>
        </div>}
        {/* Submit */}
        <button onClick={submit} disabled={!title.trim()||!capsuleValid||savedOffline} style={{width:"100%",padding:isMobile?"1rem":"0.875rem",borderRadius:"0.75rem",border:"none",background:title.trim()&&capsuleValid&&!savedOffline?`linear-gradient(135deg,${accent},${T.color.walnut})`:`${T.color.sandstone}40`,color:title.trim()&&capsuleValid&&!savedOffline?"#FFF":T.color.muted,fontFamily:T.font.body,fontSize:isMobile?"1rem":"0.875rem",fontWeight:600,cursor:title.trim()&&capsuleValid&&!savedOffline?"pointer":"default",transition:"all .2s",minHeight:"3rem"}}>
          {savedOffline?t("saved"):timeCapsule&&revealDate?t("sealCapsule", { date: new Date(revealDate+"T00:00:00").toLocaleDateString(locale==="nl"?"nl-NL":"en-US",{month:"short",day:"numeric",year:"numeric"}) }):t("addToRoom", { room: room?.name||"room" })} {savedOffline?"":timeCapsule?"🔒":"✨"}
        </button>
      </div>
    </div>
  );
}
