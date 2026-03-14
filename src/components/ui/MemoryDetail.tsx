"use client";
import { useState } from "react";
import { T } from "@/lib/theme";
import type { Mem } from "@/lib/constants/defaults";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import ImageEditor from "@/components/ui/ImageEditor";

const DISPLAY_TYPES: [string, string, string][] = [
  ["photo","\u{1F5BC}\uFE0F","Frame"],["video","\u{1F3AC}","Screen"],["album","\u{1F4D6}","Album"],
  ["orb","\u{1F52E}","Orb"],["case","\u{1F3FA}","Vitrine"],
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
  const [editing,setEditing]=useState(false);
  const [imageEditing,setImageEditing]=useState(false);
  const [title,setTitle]=useState(mem.title);
  const [desc,setDesc]=useState(mem.desc||"");
  const [type,setType]=useState(mem.type);
  const accent=wing?.accent||T.color.terracotta;

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
      <div onClick={e=>e.stopPropagation()} style={{background:T.color.linen,borderRadius:20,border:`1px solid ${T.color.cream}`,boxShadow:"0 16px 70px rgba(44,44,42,.2)",maxWidth:480,width:"90%",overflow:"hidden",animation:"fadeUp .3s cubic-bezier(.23,1,.32,1)"}}>
        {/* Header gradient with image preview */}
        <div style={{height:180,background:mem.dataUrl?`url(${mem.dataUrl}) center/cover`:`linear-gradient(145deg,hsl(${mem.hue},${mem.s}%,${mem.l}%),hsl(${mem.hue+18},${mem.s-5}%,${mem.l-6}%))`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          {!mem.dataUrl&&<span style={{fontSize:48,opacity:.25}}>{"\u{1F5BC}\uFE0F"}</span>}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg,transparent 40%,rgba(42,34,24,.6) 100%)"}}/>
          <div style={{position:"absolute",bottom:14,left:18,right:18}}>
            {editing
              ?<input value={title} onChange={e=>setTitle(e.target.value)} autoFocus
                style={{fontFamily:T.font.display,fontSize:22,color:"#FFF",background:"rgba(255,255,255,.15)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.3)",borderRadius:8,padding:"6px 12px",width:"100%",outline:"none",boxSizing:"border-box"}}/>
              :<div style={{fontFamily:T.font.display,fontSize:24,color:"rgba(255,255,255,.9)",textShadow:"0 2px 8px rgba(0,0,0,.3)"}}>{mem.title}</div>
            }
          </div>
        </div>

        <div style={{padding:"20px 24px 24px"}}>
          {editing?<>
            {/* Description */}
            <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:6}}>Description</label>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What makes this moment special..." rows={3}
              style={{width:"100%",padding:"10px 14px",borderRadius:10,border:`1px solid ${T.color.cream}`,background:T.color.white,fontFamily:T.font.body,fontSize:13,color:T.color.charcoal,outline:"none",boxSizing:"border-box",marginBottom:16,resize:"none"}}/>
            {/* Display type */}
            <label style={{fontFamily:T.font.body,fontSize:11,color:T.color.muted,letterSpacing:".5px",textTransform:"uppercase",display:"block",marginBottom:8}}>Display as</label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:20}}>
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
            {(mem.desc||desc)&&<p style={{fontFamily:T.font.body,fontSize:14,color:T.color.walnut,lineHeight:1.7,marginBottom:12}}>{mem.desc}</p>}
            <p style={{fontFamily:T.font.body,fontSize:13,color:T.color.muted,marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
              <span>{DISPLAY_TYPES.find(d=>d[0]===mem.type)?.[1]}</span>
              <span style={{fontStyle:"italic"}}>Displayed as {DISPLAY_TYPES.find(d=>d[0]===mem.type)?.[2]||mem.type}</span>
            </p>
            <p style={{fontFamily:T.font.body,fontSize:13,color:T.color.muted,fontStyle:"italic",marginBottom:20}}>
              This memory lives in: {room?room.name:"Unknown room"}
            </p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{onDelete(mem.id);onClose();}} style={{flex:1,padding:12,fontFamily:T.font.body,fontSize:13,background:"transparent",border:"1px solid #D0606080",borderRadius:10,cursor:"pointer",color:"#C05050"}}>Delete</button>
              <button onClick={onClose} style={{flex:1,padding:12,fontFamily:T.font.body,fontSize:13,background:"transparent",border:`1px solid ${T.color.cream}`,borderRadius:10,cursor:"pointer",color:T.color.muted}}>Close</button>
              <button onClick={()=>setEditing(true)} style={{flex:2,padding:12,fontFamily:T.font.body,fontSize:13,fontWeight:600,background:accent,border:"none",borderRadius:10,cursor:"pointer",color:T.color.white}}>Edit memory</button>
            </div>
          </>}
        </div>
      </div>
      {imageEditing&&mem.dataUrl&&<ImageEditor dataUrl={mem.dataUrl} accent={accent} onSave={handleImageSave} onCancel={()=>setImageEditing(false)}/>}
    </div>
  );
}
