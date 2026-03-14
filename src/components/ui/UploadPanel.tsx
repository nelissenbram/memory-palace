"use client";
import { useState, useRef } from "react";
import { T } from "@/lib/theme";
import { UPLOAD_DEMOS } from "@/lib/constants/defaults";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";

interface UploadPanelProps {
  wing: Wing | null | undefined;
  room: WingRoom | null | undefined;
  onClose: () => void;
  onAdd: (mem: Mem) => void;
}

export default function UploadPanel({wing,room,onClose,onAdd}: UploadPanelProps){
  const [title,setTitle]=useState("");
  const [desc,setDesc]=useState("");
  const [displayType,setDisplayType]=useState("photo");
  const [dragOver,setDragOver]=useState(false);
  const [preview,setPreview]=useState<string|null>(null);
  const [fileName,setFileName]=useState("");
  const [imageUrl,setImageUrl]=useState("");
  const [isVideo,setIsVideo]=useState(false);
  const [uploadMethod,setUploadMethod]=useState("url");
  const fileRef=useRef<HTMLInputElement|null>(null);
  const accent=wing?.accent||T.color.terracotta;

  const processFile=(file: File)=>{
    setFileName(file.name);
    if(!title)setTitle(file.name.replace(/\.[^.]+$/,""));
    const isVid=file.type.startsWith("video/");
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
    if(!title)setTitle("Memory");
    const isVid=/\.(mp4|webm|mov|avi)/i.test(url);
    setIsVideo(isVid);
    if(isVid)setDisplayType("video");
  };
  const handleDrop=(e: React.DragEvent)=>{e.preventDefault();setDragOver(false);if(e.dataTransfer.files?.[0])processFile(e.dataTransfer.files[0]);};
  const submit=()=>{
    if(!title.trim())return;
    const hue=Math.floor(Math.random()*360);
    onAdd({id:Date.now().toString(),title:title.trim(),hue,s:45+Math.floor(Math.random()*15),l:55+Math.floor(Math.random()*15),type:displayType,desc,dataUrl:preview||null,videoBlob:isVideo});
    onClose();
  };

  const demos=UPLOAD_DEMOS;

  return(
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(42,34,24,.4)",backdropFilter:"blur(8px)",zIndex:55,animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{position:"absolute",right:0,top:0,bottom:0,width:380,background:`${T.color.linen}f8`,backdropFilter:"blur(20px)",borderLeft:`1px solid ${T.color.cream}`,padding:"28px 24px",overflowY:"auto",animation:"slideInRight .3s cubic-bezier(.23,1,.32,1)"}}>
        <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div>
            <h3 style={{fontFamily:T.font.display,fontSize:22,fontWeight:500,color:T.color.charcoal,margin:0}}>Add memory</h3>
            <p style={{fontFamily:T.font.body,fontSize:12,color:accent,margin:"4px 0 0"}}>{room?.icon} {room?.name}</p>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:16,border:`1px solid ${T.color.cream}`,background:T.color.warmStone,color:T.color.muted,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* Method tabs */}
        <div style={{display:"flex",gap:4,marginBottom:16,background:T.color.warmStone,borderRadius:10,padding:3}}>
          {[["url","Paste URL"],["file","Upload file"]].map(([val,label])=>(
            <button key={val} onClick={()=>setUploadMethod(val)} style={{flex:1,padding:"8px 12px",borderRadius:8,border:"none",background:uploadMethod===val?T.color.white:"transparent",color:uploadMethod===val?T.color.charcoal:T.color.muted,fontFamily:T.font.body,fontSize:12,fontWeight:uploadMethod===val?600:400,cursor:"pointer",transition:"all .2s"}}>{label}</button>
          ))}
        </div>

        {uploadMethod==="url"?<>
          {/* URL input */}
          <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>Image or video URL</label>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")loadUrl();}} placeholder="https://example.com/photo.jpg" style={{flex:1,padding:"10px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:13,color:T.color.charcoal,outline:"none",boxSizing:"border-box"}}/>
            <button onClick={loadUrl} style={{padding:"10px 14px",borderRadius:10,border:"none",background:accent,color:"#FFF",fontFamily:T.font.body,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>Load</button>
          </div>
          {/* Quick demo images */}
          <div style={{marginBottom:16}}>
            <label style={{fontFamily:T.font.body,fontSize:10,color:T.color.muted,display:"block",marginBottom:6}}>Or try a demo image:</label>
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
            <p style={{fontFamily:T.font.body,fontSize:13,color:T.color.muted,margin:0}}>Drop a file or click to browse</p>
            <p style={{fontFamily:T.font.body,fontSize:11,color:T.color.sandstone,margin:"4px 0 0"}}>Photos, videos, audio, documents</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0])processFile(e.target.files[0]);}}/>
          {fileName&&<p style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,marginBottom:8}}>File: {fileName}</p>}
        </>}

        {/* Preview */}
        {preview&&<div style={{borderRadius:12,overflow:"hidden",marginBottom:16,border:`1px solid ${T.color.cream}`}}>
          {isVideo?<video src={preview} style={{width:"100%",maxHeight:160,objectFit:"cover",display:"block"}} autoPlay muted loop playsInline/>
            :<img src={preview} style={{width:"100%",maxHeight:160,objectFit:"cover",display:"block"}} alt="" onError={e=>{(e.target as HTMLElement).style.display="none";}}/>}
        </div>}

        {/* Title */}
        <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>Title</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Name this memory..." style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:14,color:T.color.charcoal,outline:"none",boxSizing:"border-box",marginBottom:16}}/>
        {/* Description */}
        <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>Description (optional)</label>
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What makes this moment special..." rows={2} style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:13,color:T.color.charcoal,outline:"none",boxSizing:"border-box",marginBottom:16,resize:"none"}}/>
        {/* Display type */}
        <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:8}}>Display as</label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:24}}>
          {[["photo","\u{1F5BC}\uFE0F","Frame"],["video","\u{1F3AC}","Screen"],["album","\u{1F4D6}","Album"],["orb","\u{1F52E}","Orb"],["case","\u{1F3FA}","Vitrine"]].map(([val,icon,label])=>(
            <button key={val} onClick={()=>setDisplayType(val)} style={{padding:"10px 8px",borderRadius:10,border:displayType===val?`2px solid ${accent}`:`1px solid ${T.color.cream}`,background:displayType===val?`${accent}10`:T.color.white,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
              <div style={{fontSize:20}}>{icon}</div>
              <div style={{fontFamily:T.font.body,fontSize:10,color:displayType===val?accent:T.color.muted,fontWeight:displayType===val?600:400,marginTop:2}}>{label}</div>
            </button>
          ))}
        </div>
        {/* Submit */}
        <button onClick={submit} disabled={!title.trim()} style={{width:"100%",padding:14,borderRadius:12,border:"none",background:title.trim()?`linear-gradient(135deg,${accent},${T.color.walnut})`:`${T.color.sandstone}40`,color:title.trim()?"#FFF":T.color.muted,fontFamily:T.font.body,fontSize:14,fontWeight:600,cursor:title.trim()?"pointer":"default",transition:"all .2s"}}>
          Add to {room?.name||"room"} ✨
        </button>
      </div>
    </div>
  );
}
