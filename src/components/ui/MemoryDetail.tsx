"use client";
import { useState, useCallback } from "react";
import { T } from "@/lib/theme";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import ImageEditor from "@/components/ui/ImageEditor";
import ShareCard from "@/components/ui/ShareCard";

const DISPLAY_TYPES: [string, string, string][] = [
  ["photo","\u{1F5BC}\uFE0F","Frame"],["painting","\u{1F3A8}","Painting"],["video","\u{1F3AC}","Screen"],["album","\u{1F4D6}","Album"],
  ["orb","\u{1F52E}","Orb"],["case","\u{1F3FA}","Vitrine"],["audio","\u{1F3B5}","Audio"],["document","\u{1F4DC}","Document"],
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
  const [editing,setEditing]=useState(false);
  const [imageEditing,setImageEditing]=useState(false);
  const [sharing,setSharing]=useState(false);
  const [title,setTitle]=useState(mem.title);
  const [desc,setDesc]=useState(mem.desc||"");
  const [type,setType]=useState(mem.type);
  const [historicalContext,setHistoricalContext]=useState(mem.historicalContext||"");
  const [contextLoading,setContextLoading]=useState(false);
  const [contextError,setContextError]=useState("");
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
      if(!res.ok) throw new Error(data.error||"Failed to generate context");
      setHistoricalContext(data.context);
      onUpdate(mem.id,{historicalContext:data.context});
    }catch(err:any){
      setContextError(err.message||"Could not generate historical context");
    }finally{
      setContextLoading(false);
    }
  },[mem.id,mem.title,mem.desc,mem.createdAt,mem.locationName,onUpdate]);

  // Time Capsule logic
  const todayStr=new Date().toISOString().split("T")[0];
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
    if(Object.keys(updates).length>0) onUpdate(mem.id,updates);
    setEditing(false);
  };

  const handleCancel=()=>{
    setTitle(mem.title);
    setDesc(mem.desc||"");
    setType(mem.type);
    setEditing(false);
  };

  return(
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(42,34,24,.5)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,animation:"fadeIn .2s ease"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.color.linen,borderRadius:isMobile?0:20,border:isMobile?"none":`1px solid ${T.color.cream}`,boxShadow:isMobile?"none":"0 16px 70px rgba(44,44,42,.2)",maxWidth:isMobile?undefined:480,width:isMobile?"100%":"90%",height:isMobile?"100%":undefined,overflow:isMobile?"auto":"hidden",animation:isMobile?"fadeIn .2s ease":"fadeUp .3s cubic-bezier(.23,1,.32,1)",display:isMobile?"flex":undefined,flexDirection:isMobile?"column":undefined}}>
        {/* Header gradient with image preview */}
        <div style={{height:180,background:isLocked?`linear-gradient(145deg,hsl(${mem.hue},${Math.max(mem.s-20,10)}%,${Math.max(mem.l-25,20)}%),hsl(${mem.hue+18},${Math.max(mem.s-25,8)}%,${Math.max(mem.l-30,15)}%))`:mem.dataUrl?`url(${mem.dataUrl}) center/cover`:`linear-gradient(145deg,hsl(${mem.hue},${mem.s}%,${mem.l}%),hsl(${mem.hue+18},${mem.s-5}%,${mem.l-6}%))`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
          {isLocked&&<>
            <div style={{fontSize:56,opacity:.6,zIndex:1}}>🔒</div>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at center,rgba(255,220,150,.08) 0%,transparent 70%)",animation:"capsuleShimmer 3s ease-in-out infinite"}}/>
            <style>{`@keyframes capsuleShimmer{0%,100%{opacity:.3}50%{opacity:.8}}`}</style>
          </>}
          {!isLocked&&!mem.dataUrl&&<span style={{fontSize:48,opacity:.25}}>{"\u{1F5BC}\uFE0F"}</span>}
          <div style={{position:"absolute",inset:0,background:isLocked?"linear-gradient(180deg,transparent 20%,rgba(20,15,10,.8) 100%)":"linear-gradient(180deg,transparent 40%,rgba(42,34,24,.6) 100%)"}}/>
          <div style={{position:"absolute",bottom:14,left:18,right:18}}>
            {editing
              ?<input value={title} onChange={e=>setTitle(e.target.value)} autoFocus
                style={{fontFamily:T.font.display,fontSize:22,color:"#FFF",background:"rgba(255,255,255,.15)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.3)",borderRadius:8,padding:"6px 12px",width:"100%",outline:"none",boxSizing:"border-box"}}/>
              :<div style={{fontFamily:T.font.display,fontSize:24,color:"rgba(255,255,255,.9)",textShadow:"0 2px 8px rgba(0,0,0,.3)"}}>{mem.title}</div>
            }
          </div>
          {isRevealed&&<div style={{position:"absolute",top:12,right:14,background:"linear-gradient(135deg,#C8A868,#A08050)",color:"#FFF",fontFamily:T.font.body,fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:8,boxShadow:"0 2px 8px rgba(0,0,0,.2)"}}>Time Capsule opened!</div>}
        </div>

        <div style={{padding:"20px 24px 24px"}}>
          {editing?<>
            {/* Description */}
            <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>Description</label>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What makes this moment special..." rows={3}
              style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:13,color:T.color.charcoal,outline:"none",boxSizing:"border-box",marginBottom:16,resize:"none"}}/>
            {/* Display type */}
            <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:8}}>Display as</label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:20}}>
              {DISPLAY_TYPES.map(([val,icon,label])=>(
                <button key={val} onClick={()=>setType(val)} style={{padding:"8px 6px",borderRadius:8,border:type===val?`2px solid ${accent}`:`1px solid ${T.color.cream}`,background:type===val?`${accent}10`:T.color.white,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
                  <div style={{fontSize:16}}>{icon}</div>
                  <div style={{fontFamily:T.font.body,fontSize:9,color:type===val?accent:T.color.muted,fontWeight:type===val?600:400,marginTop:1}}>{label}</div>
                </button>
              ))}
              {mem.dataUrl&&<button onClick={()=>setImageEditing(true)} style={{padding:"8px 6px",borderRadius:8,border:`1px solid ${accent}60`,background:`${accent}08`,cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
                <div style={{fontSize:16}}>{"\u{2728}"}</div>
                <div style={{fontFamily:T.font.body,fontSize:9,color:accent,fontWeight:600,marginTop:1}}>Edit Image</div>
              </button>}
            </div>
            {/* Save / Cancel */}
            <div style={{display:"flex",gap:10}}>
              <button onClick={handleCancel} style={{flex:1,padding:12,fontFamily:T.font.body,fontSize:13,background:"transparent",border:`1px solid ${T.color.cream}`,borderRadius:10,cursor:"pointer",color:T.color.muted}}>Cancel</button>
              <button onClick={handleSave} disabled={!title.trim()} style={{flex:2,padding:12,fontFamily:T.font.body,fontSize:13,fontWeight:600,background:title.trim()?accent:`${T.color.sandstone}40`,border:"none",borderRadius:10,cursor:title.trim()?"pointer":"default",color:title.trim()?T.color.white:T.color.muted}}>Save changes</button>
            </div>
          </>:<>
            {/* View mode */}
            {isLocked&&<div style={{background:"linear-gradient(135deg,rgba(42,34,24,.06),rgba(200,168,104,.1))",border:`1px solid ${T.color.cream}`,borderRadius:12,padding:16,marginBottom:16,textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>🔒</div>
              <div style={{fontFamily:T.font.display,fontSize:18,color:T.color.charcoal,marginBottom:4}}>
                {daysUntilReveal===1?"Opens tomorrow":daysUntilReveal<=30?`Opens in ${daysUntilReveal} days`:`Opens on ${new Date(mem.revealDate!+"T00:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}`}
              </div>
              <div style={{fontFamily:T.font.body,fontSize:12,color:T.color.muted}}>This time capsule is sealed</div>
            </div>}
            {!isLocked&&(mem.desc||desc)&&<p style={{fontFamily:T.font.body,fontSize:14,color:T.color.walnut,lineHeight:1.7,marginBottom:12}}>{mem.desc}</p>}
            <p style={{fontFamily:T.font.body,fontSize:13,color:T.color.muted,marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
              <span>{DISPLAY_TYPES.find(d=>d[0]===mem.type)?.[1]}</span>
              <span style={{fontStyle:"italic"}}>Displayed as {DISPLAY_TYPES.find(d=>d[0]===mem.type)?.[2]||mem.type}</span>
            </p>
            <p style={{fontFamily:T.font.body,fontSize:13,color:T.color.muted,fontStyle:"italic",marginBottom:16}}>
              This memory lives in: {room?room.name:"Unknown room"}
            </p>
            {/* Historical Context section */}
            {!isLocked&&<div style={{marginBottom:16}}>
              {historicalContext?<div style={{background:"linear-gradient(135deg,rgba(74,103,65,.06),rgba(193,127,89,.06))",border:`1px solid ${T.color.cream}`,borderRadius:12,padding:16}}>
                <div style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span>Historical Context</span>
                  <button onClick={()=>{setHistoricalContext("");onUpdate(mem.id,{historicalContext:""});}} style={{background:"none",border:"none",cursor:"pointer",fontFamily:T.font.body,fontSize:11,color:T.color.muted,padding:0,textDecoration:"underline"}}>Remove</button>
                </div>
                <p style={{fontFamily:T.font.body,fontSize:13,color:T.color.walnut,lineHeight:1.7,margin:0,whiteSpace:"pre-wrap"}}>{historicalContext}</p>
              </div>
              :contextLoading?<div style={{background:`${T.color.cream}40`,border:`1px solid ${T.color.cream}`,borderRadius:12,padding:16,textAlign:"center"}}>
                <div style={{fontFamily:T.font.body,fontSize:13,color:T.color.muted,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  <span style={{display:"inline-block",width:14,height:14,border:`2px solid ${T.color.sandstone}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                  Discovering what the world was like...
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
              :contextError?<div style={{fontFamily:T.font.body,fontSize:12,color:"#C05050",marginBottom:4}}>{contextError}</div>
              :<button onClick={fetchHistoricalContext} style={{width:"100%",padding:"10px 16px",fontFamily:T.font.body,fontSize:13,background:"transparent",border:`1px dashed ${T.color.sandstone}`,borderRadius:10,cursor:"pointer",color:T.color.walnut,display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .15s"}}>
                <span style={{fontSize:16}}>&#x1F30D;</span> Add Historical Context
              </button>}
            </div>}
            <div style={{display:"flex",gap:isMobile?8:10,flexWrap:isMobile?"wrap":"nowrap"}}>
              <button onClick={()=>{onDelete(mem.id);onClose();}} style={{flex:1,padding:isMobile?14:12,fontFamily:T.font.body,fontSize:13,background:"transparent",border:"1px solid #D0606080",borderRadius:10,cursor:"pointer",color:"#C05050",minHeight:44}}>Delete</button>
              <button onClick={onClose} style={{flex:1,padding:isMobile?14:12,fontFamily:T.font.body,fontSize:13,background:"transparent",border:`1px solid ${T.color.cream}`,borderRadius:10,cursor:"pointer",color:T.color.muted,minHeight:44}}>Close</button>
              <button onClick={()=>setSharing(true)} style={{flex:1,padding:isMobile?14:12,fontFamily:T.font.body,fontSize:13,background:"transparent",border:`1px solid ${T.color.cream}`,borderRadius:10,cursor:"pointer",color:T.color.walnut,minHeight:44}}>Share</button>
              {isLocked
                ?<button disabled style={{flex:2,padding:12,fontFamily:T.font.body,fontSize:13,fontWeight:600,background:`${T.color.sandstone}40`,border:"none",borderRadius:10,cursor:"default",color:T.color.muted}}>Sealed 🔒</button>
                :<button onClick={()=>setEditing(true)} style={{flex:2,padding:12,fontFamily:T.font.body,fontSize:13,fontWeight:600,background:accent,border:"none",borderRadius:10,cursor:"pointer",color:T.color.white}}>Edit memory</button>
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
