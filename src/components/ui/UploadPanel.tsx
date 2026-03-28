"use client";
import { useState, useRef, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useOnlineStatus } from "@/lib/hooks/useOfflineSync";
import { UPLOAD_DEMOS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";

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
      pos=>{setLat(pos.coords.latitude);setLng(pos.coords.longitude);setGeoLoading(false);if(!locationName)setLocationName("Current location");},
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
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:0,bottom:0,width:isMobile?"100%":"min(380px, 92vw)",background:`${T.color.linen}f8`,backdropFilter:"blur(20px)",borderLeft:isMobile?"none":`1px solid ${T.color.cream}`,padding:isMobile?"20px 16px":"28px 24px",overflowY:"auto",animation:"slideInRight .3s cubic-bezier(.23,1,.32,1)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            <h3 style={{fontFamily:T.font.display,fontSize:22,fontWeight:500,color:T.color.charcoal,margin:0}}>{t("addMemory")}</h3>
            <p style={{fontFamily:T.font.body,fontSize:12,color:accent,margin:"4px 0 0"}}>{room?.icon} {room?.name}</p>
          </div>
          <button onClick={onClose} style={{width:isMobile?40:32,height:isMobile?40:32,borderRadius:isMobile?20:16,border:`1px solid ${T.color.cream}`,background:T.color.warmStone,color:T.color.muted,fontSize:isMobile?16:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",minWidth:44,minHeight:44}}>✕</button>
        </div>

        {/* Method tabs */}
        <div style={{display:"flex",gap:4,marginBottom:16,background:T.color.warmStone,borderRadius:10,padding:3}}>
          {[["url",t("pasteUrl")],["file",t("uploadFile")],...(roomMemories.length>0?[["room",t("fromRoom")]]:[] as string[][])].map(([val,label])=>(
            <button key={val} onClick={()=>setUploadMethod(val)} style={{flex:1,padding:isMobile?"12px 12px":"8px 12px",borderRadius:8,border:"none",background:uploadMethod===val?T.color.white:"transparent",color:uploadMethod===val?T.color.charcoal:T.color.muted,fontFamily:T.font.body,fontSize:isMobile?14:12,fontWeight:uploadMethod===val?600:400,cursor:"pointer",transition:"all .2s"}}>{label}</button>
          ))}
        </div>

        {uploadMethod==="url"?<>
          {/* URL input */}
          <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>{t("imageOrVideoUrl")}</label>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")loadUrl();}} placeholder={t("urlPlaceholder")} style={{flex:1,padding:"10px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:13,color:T.color.charcoal,outline:"none",boxSizing:"border-box"}}/>
            <button onClick={loadUrl} style={{padding:"10px 14px",borderRadius:10,border:"none",background:accent,color:"#FFF",fontFamily:T.font.body,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{t("load")}</button>
          </div>
          {/* Quick demo images */}
          <div style={{marginBottom:16}}>
            <label style={{fontFamily:T.font.body,fontSize:10,color:T.color.muted,display:"block",marginBottom:6}}>{t("tryDemoImage")}</label>
            <div style={{display:"flex",gap:6}}>
              {demos.map((d,i)=>(
                <button key={i} onClick={()=>{setImageUrl(d.url);setPreview(d.url);if(!title)setTitle(d.title);}} style={{flex:1,padding:"6px 8px",borderRadius:8,border:`1px solid ${T.color.cream}`,background:T.color.warmStone,fontFamily:T.font.body,fontSize:10,color:T.color.walnut,cursor:"pointer"}}>{d.title}</button>
              ))}
            </div>
          </div>
        </>:<>
          {/* File drop zone */}
          <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
            onClick={()=>fileRef.current?.click()}
            style={{border:`2px dashed ${dragOver?accent:T.color.sandstone}`,borderRadius:16,padding:32,textAlign:"center",cursor:"pointer",background:dragOver?`${accent}08`:T.color.warmStone,marginBottom:16,transition:"all .2s"}}>
            <div style={{fontSize:32,marginBottom:8}}>{dragOver?"✨":"📸"}</div>
            <p style={{fontFamily:T.font.body,fontSize:13,color:T.color.muted,margin:0}}>{t("dropOrBrowse")}</p>
            <p style={{fontFamily:T.font.body,fontSize:11,color:T.color.sandstone,margin:"4px 0 0"}}>{t("fileTypes")}</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])processFile(e.target.files[0]);}}/>
          {fileName&&<p style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,marginBottom:8}}>File: {fileName}</p>}
          {fileSizeError&&<p style={{fontFamily:T.font.body,fontSize:12,color:T.color.error,background:`${T.color.error}10`,padding:"10px 14px",borderRadius:10,marginBottom:12,lineHeight:1.5}}>{fileSizeError}</p>}
        </>}

        {/* Room memory picker */}
        {uploadMethod==="room"&&<>
          <p style={{fontFamily:T.font.body,fontSize:12,color:T.color.muted,marginBottom:12}}>
            {t("chooseMemory", { type: displayType })}
          </p>
          <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16,maxHeight:240,overflowY:"auto"}}>
            {roomMemories.map(m=>{
              const typeIcons: Record<string,string>={"photo":"\u{1F5BC}\uFE0F","painting":"\u{1F3A8}","video":"\u{1F3AC}","album":"\u{1F4D6}","orb":"\u{1F52E}","case":"\u{1F3FA}","audio":"\u{1F3B5}","document":"\u{1F4DC}","voice":"\u{1F399}\uFE0F"};
              return(
                <button key={m.id} onClick={()=>{
                  if(onUpdateMemory){
                    onUpdateMemory(m.id,{type:displayType,displayed:true});
                    onClose();
                  }
                }} style={{
                  display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,
                  border:`1px solid ${T.color.cream}`,background:T.color.white,cursor:"pointer",
                  textAlign:"left",transition:"all .15s",
                }} onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=accent;(e.currentTarget as HTMLElement).style.background=`${accent}08`;}}
                   onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=T.color.cream;(e.currentTarget as HTMLElement).style.background=T.color.white;}}>
                  {m.dataUrl?
                    <div style={{width:44,height:44,borderRadius:8,overflow:"hidden",flexShrink:0,border:`1px solid ${T.color.cream}`}}>
                      <img src={m.dataUrl} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
                    </div>
                  :
                    <div style={{width:44,height:44,borderRadius:8,background:`hsl(${m.hue},${m.s}%,${m.l}%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                      {typeIcons[m.type]||"\u{2728}"}
                    </div>
                  }
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:T.font.body,fontSize:13,fontWeight:600,color:T.color.charcoal,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.title}</div>
                    <div style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted}}>
                      {t("currentlyWillDisplay", { current: m.type, target: displayType })}
                    </div>
                  </div>
                  <div style={{fontFamily:T.font.body,fontSize:11,color:accent,fontWeight:600,flexShrink:0}}>{t("assign")}</div>
                </button>
              );
            })}
            {roomMemories.length===0&&<p style={{fontFamily:T.font.body,fontSize:13,color:T.color.muted,textAlign:"center",padding:20}}>{t("noMemoriesInRoom")}</p>}
          </div>

          {/* Display type selector for room picker */}
          <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:8}}>{t("displayAs")}</label>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
            {[["photo","\u{1F5BC}\uFE0F","Frame"],["painting","\u{1F3A8}","Painting"],["video","\u{1F3AC}","Screen"],["album","\u{1F4D6}","Album"],["orb","\u{1F52E}","Orb"],["case","\u{1F3FA}","Vitrine"],["audio","\u{1F3B5}","Audio"],["document","\u{1F4DC}","Document"]].map(([val,icon,label])=>(
              <button key={val} onClick={()=>setDisplayType(val)} style={{padding:"10px 8px",borderRadius:10,border:displayType===val?`2px solid ${accent}`:`1px solid ${T.color.cream}`,background:displayType===val?`${accent}10`:T.color.white,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
                <div style={{fontSize:20}}>{icon}</div>
                <div style={{fontFamily:T.font.body,fontSize:10,color:displayType===val?accent:T.color.muted,fontWeight:displayType===val?600:400,marginTop:2}}>{label}</div>
              </button>
            ))}
          </div>
        </>}

        {/* Preview */}
        {preview&&<div style={{borderRadius:12,overflow:"hidden",marginBottom:16,border:`1px solid ${T.color.cream}`}}>
          {isVideo?<video src={preview} style={{width:"100%",maxHeight:160,objectFit:"cover",display:"block"}} autoPlay muted loop playsInline/>
            :<img src={preview} style={{width:"100%",maxHeight:160,objectFit:"cover",display:"block"}} alt="" onError={e=>{(e.target as HTMLElement).style.display="none";}}/>}
        </div>}

        {/* Title */}
        <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>Title</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder={t("nameMemory")} style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:14,color:T.color.charcoal,outline:"none",boxSizing:"border-box",marginBottom:16}}/>
        {/* Description */}
        <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>{t("descriptionOptional")}</label>
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder={t("descriptionPlaceholder")} rows={2} style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:13,color:T.color.charcoal,outline:"none",boxSizing:"border-box",marginBottom:16,resize:"none"}}/>
        {/* Display type */}
        <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:8}}>{t("displayAs")}</label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:24}}>
          {[["photo","\u{1F5BC}\uFE0F","Frame"],["painting","\u{1F3A8}","Painting"],["video","\u{1F3AC}","Screen"],["album","\u{1F4D6}","Album"],["orb","\u{1F52E}","Orb"],["case","\u{1F3FA}","Vitrine"],["audio","\u{1F3B5}","Audio"],["document","\u{1F4DC}","Document"]].map(([val,icon,label])=>(
            <button key={val} onClick={()=>setDisplayType(val)} style={{padding:"10px 8px",borderRadius:10,border:displayType===val?`2px solid ${accent}`:`1px solid ${T.color.cream}`,background:displayType===val?`${accent}10`:T.color.white,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
              <div style={{fontSize:20}}>{icon}</div>
              <div style={{fontFamily:T.font.body,fontSize:10,color:displayType===val?accent:T.color.muted,fontWeight:displayType===val?600:400,marginTop:2}}>{label}</div>
            </button>
          ))}
        </div>
        {/* Location */}
        <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>{t("locationOptional")}</label>
        <div style={{display:"flex",gap:6,marginBottom:6}}>
          <input value={locationName} onChange={e=>setLocationName(e.target.value)} placeholder={t("locationPlaceholder")} style={{flex:1,padding:"10px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:13,color:T.color.charcoal,outline:"none",boxSizing:"border-box"}}/>
          <button onClick={useCurrentLocation} disabled={geoLoading} style={{padding:"10px 12px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.warmStone,fontFamily:T.font.body,fontSize:11,color:T.color.walnut,cursor:geoLoading?"wait":"pointer",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
            {geoLoading?<span style={{display:"inline-block",width:12,height:12,border:"2px solid transparent",borderTopColor:T.color.walnut,borderRadius:"50%",animation:"spin .6s linear infinite"}}/>:"\uD83D\uDCCD"} {t("gps")}
          </button>
        </div>
        {lat!==null&&lng!==null&&<p style={{fontFamily:T.font.body,fontSize:10,color:T.color.muted,margin:"0 0 12px",paddingLeft:2}}>{t("coordinates", { lat: lat.toFixed(4), lng: lng.toFixed(4) })}</p>}
        {(lat===null||lng===null)&&<div style={{height:12,marginBottom:4}}/>}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        {/* Time Capsule */}
        <div style={{marginBottom:20,padding:16,borderRadius:12,border:`1px solid ${timeCapsule?`${accent}60`:T.color.cream}`,background:timeCapsule?`${accent}08`:T.color.warmStone,transition:"all .2s"}}>
          <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:timeCapsule?14:0}}>
            <div onClick={()=>setTimeCapsule(!timeCapsule)} style={{width:38,height:22,borderRadius:11,background:timeCapsule?accent:`${T.color.sandstone}80`,position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
              <div style={{width:16,height:16,borderRadius:8,background:"#FFF",position:"absolute",top:3,left:timeCapsule?19:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
            </div>
            <div>
              <div style={{fontFamily:T.font.body,fontSize:13,fontWeight:600,color:T.color.charcoal}}>{t("timeCapsule")}</div>
              <div style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted}}>{t("lockUntilFuture")}</div>
            </div>
          </label>
          {timeCapsule&&<div>
            <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>{t("revealDate")}</label>
            <input type="date" value={revealDate} min={todayStr} onChange={e=>setRevealDate(e.target.value)}
              style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:13,color:T.color.charcoal,outline:"none",boxSizing:"border-box"}}/>
            {revealDate&&revealDate<=todayStr&&<p style={{fontFamily:T.font.body,fontSize:11,color:T.color.error,margin:"6px 0 0"}}>{t("revealDateFuture")}</p>}
            {/* Resolution toggle */}
            <div style={{marginTop:16}}>
              <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:isResolution?14:0}}>
                <div onClick={()=>setIsResolution(!isResolution)} style={{width:38,height:22,borderRadius:11,background:isResolution?T.color.sage:`${T.color.sandstone}80`,position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
                  <div style={{width:16,height:16,borderRadius:8,background:"#FFF",position:"absolute",top:3,left:isResolution?19:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                </div>
                <div>
                  <div style={{fontFamily:T.font.body,fontSize:12,fontWeight:600,color:T.color.charcoal}}>{t("resolution")}</div>
                  <div style={{fontFamily:T.font.body,fontSize:10,color:T.color.muted}}>{t("trackGoal")}</div>
                </div>
              </label>
              {isResolution&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>{t("goalDescription")}</label>
                  <input value={goalDesc} onChange={e=>setGoalDesc(e.target.value)} placeholder={t("goalPlaceholder")}
                    style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:13,color:T.color.charcoal,outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div>
                  <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>{t("targetDate")}</label>
                  <input type="date" value={targetDate} min={todayStr} onChange={e=>setTargetDate(e.target.value)}
                    style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:13,color:T.color.charcoal,outline:"none",boxSizing:"border-box"}}/>
                </div>
                <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                  <div onClick={()=>setTrackProgress(!trackProgress)} style={{width:34,height:20,borderRadius:10,background:trackProgress?T.color.sage:`${T.color.sandstone}80`,position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
                    <div style={{width:14,height:14,borderRadius:7,background:"#FFF",position:"absolute",top:3,left:trackProgress?17:3,transition:"left .2s",boxShadow:"0 1px 2px rgba(0,0,0,.2)"}}/>
                  </div>
                  <span style={{fontFamily:T.font.body,fontSize:12,color:T.color.charcoal}}>{t("trackProgress")}</span>
                </label>
                <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                  <div onClick={()=>setReminders(!reminders)} style={{width:34,height:20,borderRadius:10,background:reminders?T.color.sage:`${T.color.sandstone}80`,position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
                    <div style={{width:14,height:14,borderRadius:7,background:"#FFF",position:"absolute",top:3,left:reminders?17:3,transition:"left .2s",boxShadow:"0 1px 2px rgba(0,0,0,.2)"}}/>
                  </div>
                  <span style={{fontFamily:T.font.body,fontSize:12,color:T.color.charcoal}}>{t("getReminders")}</span>
                </label>
              </div>}
            </div>
          </div>}
        </div>
        {/* Historical Context suggestion */}
        {title.trim()&&!timeCapsule&&<div style={{marginBottom:20}}>
          {contextOffer&&contextPreview?<div style={{padding:14,borderRadius:12,border:`1px solid ${T.color.cream}`,background:"linear-gradient(135deg,rgba(74,103,65,.06),rgba(193,127,89,.06))"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase"}}>{t("historicalContext")}</span>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{setContextAccepted(true);}} style={{fontFamily:T.font.body,fontSize:11,fontWeight:600,color:contextAccepted?T.color.sage:accent,background:"none",border:"none",cursor:"pointer",padding:0}}>{contextAccepted?t("added"):t("accept")}</button>
                <button onClick={()=>{setContextOffer(false);setContextPreview("");setContextAccepted(false);}} style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,background:"none",border:"none",cursor:"pointer",padding:0}}>{t("dismiss")}</button>
              </div>
            </div>
            <p style={{fontFamily:T.font.body,fontSize:12,color:T.color.walnut,lineHeight:1.6,margin:0,maxHeight:120,overflowY:"auto",whiteSpace:"pre-wrap"}}>{contextPreview}</p>
          </div>
          :contextLoading?<div style={{padding:12,borderRadius:10,border:`1px solid ${T.color.cream}`,background:`${T.color.cream}40`,textAlign:"center"}}>
            <span style={{fontFamily:T.font.body,fontSize:12,color:T.color.muted,display:"inline-flex",alignItems:"center",gap:6}}>
              <span style={{display:"inline-block",width:12,height:12,border:`2px solid ${T.color.sandstone}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
              {t("generatingContext")}
            </span>
          </div>
          :<button onClick={fetchContext} style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px dashed ${T.color.sandstone}`,background:"transparent",fontFamily:T.font.body,fontSize:12,color:T.color.walnut,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <span>&#x1F30D;</span> {t("addHistoricalContext")}
          </button>}
        </div>}
        {/* Saved offline indicator */}
        {savedOffline&&<div style={{padding:"12px 16px",borderRadius:12,background:`${T.color.success}18`,border:`1px solid ${T.color.success}40`,marginBottom:12,textAlign:"center"}}>
          <span style={{fontFamily:T.font.body,fontSize:13,fontWeight:600,color:T.color.success}}>{t("savedOffline")}</span>
        </div>}
        {/* Submit */}
        <button onClick={submit} disabled={!title.trim()||!capsuleValid||savedOffline} style={{width:"100%",padding:isMobile?16:14,borderRadius:12,border:"none",background:title.trim()&&capsuleValid&&!savedOffline?`linear-gradient(135deg,${accent},${T.color.walnut})`:`${T.color.sandstone}40`,color:title.trim()&&capsuleValid&&!savedOffline?"#FFF":T.color.muted,fontFamily:T.font.body,fontSize:isMobile?16:14,fontWeight:600,cursor:title.trim()&&capsuleValid&&!savedOffline?"pointer":"default",transition:"all .2s",minHeight:48}}>
          {savedOffline?"Saved!":timeCapsule&&revealDate?t("sealCapsule", { date: new Date(revealDate+"T00:00:00").toLocaleDateString(locale==="nl"?"nl-NL":"en-US",{month:"short",day:"numeric",year:"numeric"}) }):t("addToRoom", { room: room?.name||"room" })} {savedOffline?"":timeCapsule?"🔒":"✨"}
        </button>
      </div>
    </div>
  );
}
