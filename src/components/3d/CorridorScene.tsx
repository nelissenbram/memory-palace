"use client";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, SMAAEffect } from "postprocessing";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";

// ═══ CORRIDOR — grand gallery hallway with ornate doors ═══
// ═══ CORRIDOR — luxurious wing-specific gallery ═══
export default function CorridorScene({wingId,rooms:roomsProp,onDoorHover,onDoorClick,hoveredDoor,wingData:wingDataProp,corridorPaintings}: {wingId: any,rooms?: WingRoom[],onDoorHover: any,onDoorClick: any,hoveredDoor: any,wingData?: Wing,corridorPaintings?: Record<string,{url?: string, title?: string}>}){
  const mountRef=useRef<HTMLDivElement|null>(null),frameRef=useRef<number|null>(null);
  const wing=wingDataProp||DEFAULT_WINGS.find(w=>w.id===wingId)!;
  const rooms=roomsProp||[];
  const doorMeshes=useRef<any[]>([]);

  useEffect(()=>{
    const el=mountRef.current;if(!el)return;let w=el.clientWidth,h=el.clientHeight;
    const scene=new THREE.Scene();scene.background=new THREE.Color(wing.wall);
    // Add atmospheric fog for depth
    scene.fog=new THREE.FogExp2(wing.wall,.012);
    const camera=new THREE.PerspectiveCamera(55,w/h,0.1,80);
    const ren=new THREE.WebGLRenderer({antialias:false,powerPreference:"high-performance"});ren.setSize(w,h);ren.setPixelRatio(Math.min(window.devicePixelRatio,2));
    ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.8;
    ren.outputColorSpace=THREE.SRGBColorSpace;
    el.appendChild(ren.domElement);
    // ── POST-PROCESSING ──
    const composer=new EffectComposer(ren);
    composer.addPass(new RenderPass(scene,camera));
    composer.addPass(new EffectPass(camera,
      new BloomEffect({luminanceThreshold:0.35,luminanceSmoothing:0.4,intensity:1.2,mipmapBlur:true}),
      new VignetteEffect({darkness:0.5,offset:0.25}),
      new SMAAEffect()
    ));
    scene.add(new THREE.HemisphereLight("#FFF2E0","#C4B8A0",.55));
    const sun=new THREE.DirectionalLight("#FFE8C0",1.5);sun.position.set(8,16,-3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);
    const fill=new THREE.DirectionalLight("#FFD8A8",.35);fill.position.set(-6,10,4);scene.add(fill);

    // ── WING LAYOUTS: each wing is a different museum section ──
    // DRAMATICALLY HIGHER CEILINGS (+2m each)
    const cfg={
      family:{cW:9,cH:8,sp:8, rugC:"#7A2028",rugB:"#C8A040",accent:"#C17F59",
        floorPat:"herringbone",ceilStyle:"coffered",wallStyle:"warm_panels"},
      travel:{cW:7.5,cH:8.5,sp:7.5, rugC:"#1A2A48",rugB:"#B88828",accent:"#4A6741",
        floorPat:"marble_strip",ceilStyle:"vaulted_beams",wallStyle:"map_alcoves"},
      childhood:{cW:10,cH:7,sp:9, rugC:"#B0856A",rugB:"#E8C868",accent:"#B8926A",
        floorPat:"checkerboard",ceilStyle:"painted",wallStyle:"playful"},
      career:{cW:8,cH:9,sp:8, rugC:"#1A1A28",rugB:"#808080",accent:"#8B7355",
        floorPat:"dark_parquet",ceilStyle:"grid",wallStyle:"modern"},
      creativity:{cW:9.5,cH:7.8,sp:8.5, rugC:"#3A1848",rugB:"#D0A040",accent:"#9B6B8E",
        floorPat:"mosaic",ceilStyle:"exposed_beams",wallStyle:"gallery"},
    };
    const C=(cfg as any)[wingId]||cfg.family;
    const cW=C.cW,cH=C.cH,cL=rooms.length*C.sp+14;

    const MS={
      wall:new THREE.MeshStandardMaterial({color:wing.wall,roughness:.85}),
      wallD:new THREE.MeshStandardMaterial({color:wing.floor,roughness:.8}),
      floor:new THREE.MeshStandardMaterial({color:wing.floor,roughness:.45,metalness:.1}),
      floorL:new THREE.MeshStandardMaterial({color:"#D0C0A0",roughness:.5}),
      floorD:new THREE.MeshStandardMaterial({color:"#8A7858",roughness:.5,metalness:.08}),
      ceil:new THREE.MeshStandardMaterial({color:"#F0EAE0",roughness:.92}),
      trim:new THREE.MeshStandardMaterial({color:"#D0C4B0",roughness:.5,metalness:.12}),
      gold:new THREE.MeshStandardMaterial({color:"#C8A858",roughness:.25,metalness:.6}),
      wain:new THREE.MeshStandardMaterial({color:"#C8BCA8",roughness:.6}),
      wainP:new THREE.MeshStandardMaterial({color:"#BEB4A0",roughness:.65}),
      dkW:new THREE.MeshStandardMaterial({color:"#4A3828",roughness:.5}),
      door:new THREE.MeshStandardMaterial({color:"#5A3E28",roughness:.4,metalness:.06}),
      doorD:new THREE.MeshStandardMaterial({color:"#3A2818",roughness:.45}),
      handle:new THREE.MeshStandardMaterial({color:"#C8A858",roughness:.22,metalness:.65}),
      bronze:new THREE.MeshStandardMaterial({color:"#8A7050",roughness:.3,metalness:.5}),
      marble:new THREE.MeshStandardMaterial({color:"#E8E2DA",roughness:.2,metalness:.06}),
      shared:new THREE.MeshStandardMaterial({color:"#4A6741",roughness:.4,emissive:"#4A6741",emissiveIntensity:.3}),
      rug:new THREE.MeshStandardMaterial({color:C.rugC,roughness:.9}),
      rugB:new THREE.MeshStandardMaterial({color:C.rugB,roughness:.8}),
      sconce:new THREE.MeshStandardMaterial({color:"#C8A858",roughness:.25,metalness:.55}),
      glassG:new THREE.MeshStandardMaterial({color:"#FFF8E0",emissive:"#FFE8B0",emissiveIntensity:.6,transparent:true,opacity:.6}),
      curtain:new THREE.MeshStandardMaterial({color:C.accent,roughness:.92,side:THREE.DoubleSide}),
      velvet:new THREE.MeshStandardMaterial({color:C.accent,roughness:.92}),
      statue:new THREE.MeshStandardMaterial({color:"#E0D8CC",roughness:.22,metalness:.08}),
      fG:new THREE.MeshStandardMaterial({color:"#B89850",roughness:.25,metalness:.65}),
      windowFrame:new THREE.MeshStandardMaterial({color:"#D0C4B0",roughness:.4,metalness:.15}),
      windowGlass:new THREE.MeshBasicMaterial({color:"#C8E0F0",transparent:true,opacity:.08,side:THREE.DoubleSide}),
      windowGlow:new THREE.MeshBasicMaterial({color:"#FFF8E0",transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),
      bench:new THREE.MeshStandardMaterial({color:"#6A5240",roughness:.6,metalness:.04}),
      benchCushion:new THREE.MeshStandardMaterial({color:C.accent,roughness:.92}),
      portalArch:new THREE.MeshStandardMaterial({color:"#D4AF37",roughness:.2,metalness:.85,emissive:"#D4AF37",emissiveIntensity:.2}),
      portalPillar:new THREE.MeshStandardMaterial({color:"#E8E0D4",roughness:.15,metalness:.04}),
      portalKeystone:new THREE.MeshStandardMaterial({color:"#C8A858",roughness:.2,metalness:.7,emissive:"#C8A858",emissiveIntensity:.25}),
      portalGoldTrim:new THREE.MeshStandardMaterial({color:"#FFD700",roughness:.15,metalness:.9,emissive:"#FFD700",emissiveIntensity:.1}),
      frescoBase:new THREE.MeshStandardMaterial({color:wing.wall,roughness:.9}),
      terracotta:new THREE.MeshStandardMaterial({color:"#C4704A",roughness:.8,metalness:.02}),
      foliage:new THREE.MeshStandardMaterial({color:"#3A6828",roughness:.85}),
      foliageDark:new THREE.MeshStandardMaterial({color:"#2A5020",roughness:.85}),
      pedestal:new THREE.MeshStandardMaterial({color:"#D8D0C4",roughness:.3,metalness:.05}),
      floorGoldStrip:new THREE.MeshStandardMaterial({color:"#C8A858",roughness:.3,metalness:.5}),
      portalFog:new THREE.MeshBasicMaterial({color:"#FFF8E0",transparent:true,opacity:.08,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),
    };

    // ═══ TUSCAN LANDSCAPE CANVAS TEXTURE (shared by all windows) — photorealistic ═══
    const tuscanCanvas=document.createElement("canvas");tuscanCanvas.width=1024;tuscanCanvas.height=768;
    const tc=tuscanCanvas.getContext("2d")!;
    const TW=1024,TH=768;

    // ── SKY (upper 45%) ── deep cerulean → golden horizon
    const skyGrad=tc.createLinearGradient(0,0,0,TH*0.45);
    skyGrad.addColorStop(0,"#2A6AB5");skyGrad.addColorStop(0.3,"#5A9AD5");
    skyGrad.addColorStop(0.65,"#C8D8E8");skyGrad.addColorStop(1.0,"#F0D8A0");
    tc.fillStyle=skyGrad;tc.fillRect(0,0,TW,TH*0.45);

    // ── WARM GOLDEN SUN with multi-stop radial glow ──
    const sunX=750,sunY=180;
    const sunG=tc.createRadialGradient(sunX,sunY,0,sunX,sunY,160);
    sunG.addColorStop(0,"rgba(255,252,224,1.0)");
    sunG.addColorStop(0.06,"rgba(255,252,224,0.98)");
    sunG.addColorStop(0.25,"rgba(255,224,96,0.7)");
    sunG.addColorStop(0.5,"rgba(255,208,128,0.3)");
    sunG.addColorStop(0.75,"rgba(255,208,128,0.1)");
    sunG.addColorStop(1.0,"rgba(255,208,128,0.0)");
    tc.fillStyle=sunG;tc.beginPath();tc.arc(sunX,sunY,160,0,Math.PI*2);tc.fill();
    // Extra bright core
    const sunCore=tc.createRadialGradient(sunX,sunY,0,sunX,sunY,40);
    sunCore.addColorStop(0,"rgba(255,255,245,1.0)");sunCore.addColorStop(1,"rgba(255,240,180,0.0)");
    tc.fillStyle=sunCore;tc.beginPath();tc.arc(sunX,sunY,40,0,Math.PI*2);tc.fill();

    // ── CLOUDS — 7 clusters of overlapping semi-transparent ellipses ──
    const drawCloud=(cx:number,cy:number,scaleX:number,scaleY:number,count:number)=>{
      for(let i=0;i<count;i++){
        const ox=(i-count/2)*scaleX*0.35+Math.sin(i*1.7)*scaleX*0.15;
        const oy=Math.cos(i*2.3)*scaleY*0.3;
        const rx=scaleX*(0.6+Math.sin(i*0.9)*0.4);
        const ry=scaleY*(0.5+Math.cos(i*1.1)*0.3);
        tc.globalAlpha=0.15+Math.sin(i*1.3)*0.08;
        tc.fillStyle="#FFFFFF";
        tc.beginPath();tc.ellipse(cx+ox,cy+oy,rx,ry,i*0.12,0,Math.PI*2);tc.fill();
      }
    };
    drawCloud(140,70,80,16,4);drawCloud(320,50,100,14,4);
    drawCloud(500,90,110,18,4);drawCloud(180,130,70,12,3);
    drawCloud(620,60,90,15,4);drawCloud(830,110,75,13,3);
    drawCloud(420,155,65,11,3);
    tc.globalAlpha=1.0;

    // ── DISTANT MOUNTAINS — pale purple-blue undulating sine curves ──
    const mtnY=TH*0.45;
    // Farthest range — pale purple-blue
    tc.fillStyle="rgba(128,144,176,0.5)";
    tc.beginPath();tc.moveTo(0,mtnY);
    for(let x=0;x<=TW;x+=4){
      const y=mtnY-18-Math.sin(x*0.006)*22-Math.sin(x*0.014+1)*12-Math.sin(x*0.003)*8;
      tc.lineTo(x,y);
    }
    tc.lineTo(TW,mtnY+40);tc.lineTo(0,mtnY+40);tc.fill();
    // Closer range — blue-grey, taller peaks
    tc.fillStyle="rgba(112,128,144,0.6)";
    tc.beginPath();tc.moveTo(0,mtnY+10);
    for(let x=0;x<=TW;x+=4){
      const y=mtnY+10-14-Math.sin(x*0.008+2)*28-Math.sin(x*0.018)*14-Math.cos(x*0.005)*10;
      tc.lineTo(x,y);
    }
    tc.lineTo(TW,mtnY+50);tc.lineTo(0,mtnY+50);tc.fill();

    // ── ROLLING HILLS (middle ~30%) ──
    const hillBase=TH*0.48;
    // Layer 1 — distant olive green
    tc.fillStyle="#6A7A4A";
    tc.beginPath();tc.moveTo(0,hillBase);
    for(let x=0;x<=TW;x+=4){
      const y=hillBase-Math.sin(x*0.005)*20-Math.sin(x*0.012+0.5)*14-Math.cos(x*0.003)*8;
      tc.lineTo(x,y);
    }
    tc.lineTo(TW,hillBase+80);tc.lineTo(0,hillBase+80);tc.fill();
    // Layer 2 — richer green with height variation
    tc.fillStyle="#5A7038";
    tc.beginPath();tc.moveTo(0,hillBase+40);
    for(let x=0;x<=TW;x+=4){
      const y=hillBase+40-Math.sin(x*0.007+1)*22-Math.sin(x*0.015+2)*10-Math.cos(x*0.004)*12;
      tc.lineTo(x,y);
    }
    tc.lineTo(TW,hillBase+120);tc.lineTo(0,hillBase+120);tc.fill();
    // Layer 3 — warm green-gold transitioning to golden
    const hill3Grad=tc.createLinearGradient(0,0,TW,0);
    hill3Grad.addColorStop(0,"#8A9A58");hill3Grad.addColorStop(0.4,"#9AA058");
    hill3Grad.addColorStop(0.7,"#B8A048");hill3Grad.addColorStop(1,"#A89848");
    tc.fillStyle=hill3Grad;
    tc.beginPath();tc.moveTo(0,hillBase+80);
    for(let x=0;x<=TW;x+=4){
      const y=hillBase+80-Math.sin(x*0.006+3)*18-Math.sin(x*0.013)*12-Math.cos(x*0.009+1)*8;
      tc.lineTo(x,y);
    }
    tc.lineTo(TW,hillBase+160);tc.lineTo(0,hillBase+160);tc.fill();

    // ── CYPRESS TREES — dark narrow silhouettes scattered on hills ──
    const drawCypress=(cx2:number,baseY:number,h2:number,w2:number)=>{
      tc.fillStyle="#1A2A0A";
      // trunk
      tc.fillRect(cx2-1.5,baseY-h2*0.15,3,h2*0.15);
      // canopy — narrow pointed shape via quadratic curves for realism
      tc.beginPath();tc.moveTo(cx2-w2*0.5,baseY-h2*0.12);
      tc.quadraticCurveTo(cx2-w2*0.55,baseY-h2*0.55,cx2,baseY-h2);
      tc.quadraticCurveTo(cx2+w2*0.55,baseY-h2*0.55,cx2+w2*0.5,baseY-h2*0.12);
      tc.closePath();tc.fill();
      // Highlight edge for depth
      tc.fillStyle="rgba(40,60,20,0.5)";
      tc.beginPath();tc.moveTo(cx2+w2*0.1,baseY-h2*0.15);
      tc.quadraticCurveTo(cx2+w2*0.15,baseY-h2*0.5,cx2+1,baseY-h2*0.95);
      tc.quadraticCurveTo(cx2+w2*0.45,baseY-h2*0.5,cx2+w2*0.4,baseY-h2*0.15);
      tc.closePath();tc.fill();
    };
    // Scattered trees — some in pairs, some solo, varying sizes
    drawCypress(90,hillBase+12,55,10);drawCypress(112,hillBase+10,42,8);
    drawCypress(240,hillBase+30,60,11);drawCypress(265,hillBase+28,48,9);drawCypress(280,hillBase+32,38,7);
    drawCypress(410,hillBase+22,58,10);
    drawCypress(530,hillBase+45,52,9);drawCypress(555,hillBase+43,40,8);
    drawCypress(680,hillBase+18,62,11);drawCypress(705,hillBase+20,45,8);
    drawCypress(850,hillBase+35,50,9);drawCypress(920,hillBase+50,44,8);

    // ── FOREGROUND FIELDS (bottom ~15%) — golden wheat & green patches ──
    const fgTop=TH*0.82;
    // Warm golden wheat base
    const fgGrad=tc.createLinearGradient(0,fgTop,0,TH);
    fgGrad.addColorStop(0,"#C8A050");fgGrad.addColorStop(0.5,"#B89840");fgGrad.addColorStop(1,"#A08030");
    tc.fillStyle=fgGrad;
    tc.beginPath();tc.moveTo(0,fgTop);
    for(let x=0;x<=TW;x+=4){
      const y=fgTop-Math.sin(x*0.008)*8-Math.sin(x*0.02)*4;
      tc.lineTo(x,y);
    }
    tc.lineTo(TW,TH);tc.lineTo(0,TH);tc.fill();
    // Subtle stripe texture — plowed field lines
    tc.strokeStyle="rgba(160,120,50,0.15)";tc.lineWidth=1;
    for(let ly=fgTop+8;ly<TH;ly+=6){
      tc.beginPath();tc.moveTo(0,ly+Math.sin(ly*0.3)*2);
      for(let x=0;x<=TW;x+=20) tc.lineTo(x,ly+Math.sin((x+ly)*0.04)*3);
      tc.stroke();
    }
    // Darker green field patches for variety
    tc.fillStyle="rgba(106,138,58,0.35)";
    tc.beginPath();tc.ellipse(180,fgTop+30,90,25,-0.1,0,Math.PI*2);tc.fill();
    tc.beginPath();tc.ellipse(550,fgTop+20,110,22,0.05,0,Math.PI*2);tc.fill();
    tc.beginPath();tc.ellipse(880,fgTop+35,80,20,0.08,0,Math.PI*2);tc.fill();

    // ── TINY VILLAGE DOTS on distant hills — suggesting buildings ──
    tc.fillStyle="rgba(90,70,50,0.45)";
    const villages=[[320,hillBase-8],[325,hillBase-12],[330,hillBase-9],[640,hillBase+4],[644,hillBase],[648,hillBase+2],[880,hillBase+15],[884,hillBase+12]];
    for(const [vx,vy] of villages){tc.fillRect(vx,vy,3,3);}
    // Tiny church tower
    tc.fillRect(327,hillBase-17,2,6);tc.fillRect(645,hillBase-5,2,5);

    // ── ATMOSPHERIC HAZE — warm aerial perspective ──
    // Full scene warm overlay
    tc.fillStyle="rgba(240,224,192,0.08)";tc.fillRect(0,0,TW,TH);
    // Stronger near horizon for aerial perspective
    const horizHaze=tc.createLinearGradient(0,TH*0.3,0,TH*0.55);
    horizHaze.addColorStop(0,"rgba(240,216,176,0.0)");horizHaze.addColorStop(0.5,"rgba(240,216,176,0.12)");horizHaze.addColorStop(1,"rgba(240,216,176,0.0)");
    tc.fillStyle=horizHaze;tc.fillRect(0,TH*0.3,TW,TH*0.25);

    const tuscanTex=new THREE.CanvasTexture(tuscanCanvas);tuscanTex.colorSpace=THREE.SRGBColorSpace;

    // ── FLOOR (varies by wing) ──
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(cW,cL),MS.floor);fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;scene.add(fl);
    if(C.floorPat==="herringbone"){
      for(let fz=-cL/2+1;fz<cL/2;fz+=1.5)for(let fx=-cW/2+1;fx<cW/2;fx+=1.5)
        scene.add(mk(new THREE.BoxGeometry(.6,.003,.3),MS.floorL,fx+((Math.floor(fz)%2)?.4:0),.002,fz));
    }else if(C.floorPat==="marble_strip"){
      scene.add(mk(new THREE.BoxGeometry(cW-2,.004,cL-3),MS.floorL,0,.003,0));
      for(let s=-1;s<=1;s+=2)scene.add(mk(new THREE.BoxGeometry(.08,.005,cL-4),MS.gold,s*(cW/2-1.2),.004,0));
    }else if(C.floorPat==="checkerboard"){
      for(let fz=-cL/2+1;fz<cL/2;fz+=1.2)for(let fx=-cW/2+1;fx<cW/2;fx+=1.2)
        if((Math.floor(fx+50)+Math.floor(fz+50))%2===0)scene.add(mk(new THREE.BoxGeometry(1.1,.003,1.1),MS.floorL,fx,.002,fz));
    }else if(C.floorPat==="dark_parquet"){
      scene.add(mk(new THREE.BoxGeometry(cW-1,.004,cL-2),MS.floorD,0,.003,0));
      scene.add(mk(new THREE.BoxGeometry(cW-2,.005,cL-3),MS.floorL,0,.004,0));
    }else{
      for(let fz=-cL/2+1;fz<cL/2;fz+=2)for(let fx=-cW/2+1;fx<cW/2;fx+=2){
        const col=`hsl(${30+Math.random()*20},${25+Math.random()*15}%,${55+Math.random()*15}%)`;
        scene.add(mk(new THREE.BoxGeometry(.8,.003,.8),new THREE.MeshStandardMaterial({color:col,roughness:.6}),fx,.002,fz));}
    }

    // ═══ FLOOR GOLD TRIM STRIPS along both walls ═══
    for(let s of[-1,1]){
      scene.add(mk(new THREE.BoxGeometry(.06,.008,cL-.5),MS.floorGoldStrip,s*(cW/2-.15),.005,0));
      scene.add(mk(new THREE.BoxGeometry(.03,.008,cL-.5),MS.floorGoldStrip,s*(cW/2-.35),.005,0));
    }

    // ── CEILING (varies by wing) ──
    const ceil=new THREE.Mesh(new THREE.PlaneGeometry(cW,cL),MS.ceil);ceil.rotation.x=Math.PI/2;ceil.position.set(0,cH,0);scene.add(ceil);
    if(C.ceilStyle==="coffered"){
      for(let i=0;i<Math.floor(cL/3);i++){const bz=-cL/2+1.5+i*3;scene.add(mk(new THREE.BoxGeometry(cW-.5,.18,.14),MS.trim,0,cH-.09,bz));}
      for(let s=-1;s<=1;s+=2)scene.add(mk(new THREE.BoxGeometry(.14,.18,cL-.5),MS.trim,s*(cW/2-1.5),cH-.09,0));
      for(let i=0;i<Math.floor(cL/6);i++)for(let s=-1;s<=1;s+=2){const rz=-cL/2+3+i*6;
        const ros=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.02,10),MS.gold);ros.position.set(s*(cW/2-1.5),cH-.01,rz);scene.add(ros);}
    }else if(C.ceilStyle==="vaulted_beams"){
      for(let i=0;i<Math.floor(cL/3.5);i++){const bz=-cL/2+1.8+i*3.5;
        scene.add(mk(new THREE.BoxGeometry(cW-.3,.25,.2),MS.dkW,0,cH-.12,bz));scene.add(mk(new THREE.BoxGeometry(cW-.5,.04,.12),MS.gold,0,cH-.26,bz));}
    }else if(C.ceilStyle==="grid"){
      for(let i=0;i<Math.floor(cL/2.5);i++){const bz=-cL/2+1.2+i*2.5;scene.add(mk(new THREE.BoxGeometry(cW-.4,.08,.06),MS.trim,0,cH-.04,bz));}
      for(let s=-2;s<=2;s++)scene.add(mk(new THREE.BoxGeometry(.06,.08,cL-.4),MS.trim,s*(cW/5),cH-.04,0));
    }else if(C.ceilStyle==="exposed_beams"){
      for(let i=0;i<Math.floor(cL/4);i++){const bz=-cL/2+2+i*4;
        scene.add(mk(new THREE.BoxGeometry(cW-.2,.3,.22),MS.dkW,0,cH-.15,bz));
        for(let s=-1;s<=1;s+=2)scene.add(mk(new THREE.BoxGeometry(.08,.08,.6),MS.bronze,s*(cW/3),cH-.32,bz));}
    }else{
      for(let i=0;i<Math.floor(cL/4);i++){const bz=-cL/2+2+i*4;scene.add(mk(new THREE.BoxGeometry(cW-.3,.15,.12),MS.trim,0,cH-.08,bz));}
    }

    // ── WALLS + WAINSCOTING (varies by wing) ──
    for(let s of[-1,1]){const wm=new THREE.Mesh(new THREE.PlaneGeometry(cL,cH),MS.wall);wm.rotation.y=s*(-Math.PI/2);wm.position.set(s*(cW/2),cH/2,0);scene.add(wm);}
    scene.add(mk(new THREE.PlaneGeometry(cW,cH),MS.wall,0,cH/2,-cL/2));
    const wB=new THREE.Mesh(new THREE.PlaneGeometry(cW,cH),MS.wall);wB.rotation.y=Math.PI;wB.position.set(0,cH/2,cL/2);scene.add(wB);
    for(let s of[-1,1]){
      // Wainscoting
      scene.add(mk(new THREE.BoxGeometry(.05,1.4,cL-.4),MS.wain,s*(cW/2-.025),.7,0));
      scene.add(mk(new THREE.BoxGeometry(.06,.07,cL-.3),MS.gold,s*(cW/2-.03),1.43,0));
      scene.add(mk(new THREE.BoxGeometry(.08,.18,cL-.2),MS.dkW,s*(cW/2-.04),.09,0));
      // Crown molding at ceiling (more elaborate)
      scene.add(mk(new THREE.BoxGeometry(.10,.14,cL-.2),MS.gold,s*(cW/2-.05),cH-.07,0));
      scene.add(mk(new THREE.BoxGeometry(.06,.08,cL-.2),MS.trim,s*(cW/2-.03),cH-.18,0));
      // Wall panels between doors (more detailed)
      const pnl=Math.floor(cL/3);
      for(let p=0;p<pnl;p++){
        scene.add(mk(new THREE.BoxGeometry(.01,.55,1.4),MS.wainP,s*(cW/2-.01),.7,-cL/2+1.5+p*3));
        // Upper wall panel detail
        scene.add(mk(new THREE.BoxGeometry(.008,.8,1.2),MS.wainP,s*(cW/2-.008),2.8,-cL/2+1.5+p*3));
        // Gold accent on upper panel
        scene.add(mk(new THREE.BoxGeometry(.006,.02,1.25),MS.gold,s*(cW/2-.006),3.22,-cL/2+1.5+p*3));
        scene.add(mk(new THREE.BoxGeometry(.006,.02,1.25),MS.gold,s*(cW/2-.006),2.38,-cL/2+1.5+p*3));
      }
    }

    // ═══ TUSCAN LANDSCAPE WINDOWS — arched gallery windows recessed into walls ═══
    const winH=2.4,winW=1.2,winY=cH*0.58;
    const winGlassMat=new THREE.MeshBasicMaterial({color:"#B0D0F0",transparent:true,opacity:0.05,side:THREE.DoubleSide});
    const winFrameMat=new THREE.MeshStandardMaterial({color:"#D8CFC0",roughness:.3,metalness:.1});
    const recessD=0.3; // recess depth into wall
    const frameTh=0.12; // frame thickness
    const archR=winW/2; // semicircle radius = half window width
    const archSegsW=10; // segments for arch curve
    const rectH=winH-archR; // rectangular portion height (below the arch)
    rooms.forEach((_room: any,i: number)=>{
      const doorSide=i%2===0?-1:1;
      const winSide=-doorSide;
      const wz=-cL/2+5.5+i*C.sp;
      const wx=winSide*(cW/2);
      // Wall-relative positions: outer face of wall is at wx, interior is wx - winSide*recessD
      const outerX=wx;
      const innerX=wx-(winSide*recessD);
      const midX=wx-(winSide*recessD*0.5);
      // ── Recess/alcove — cut into the wall ──
      // Back wall of recess (dark)
      scene.add(mk(new THREE.BoxGeometry(recessD,rectH+archR*0.5,winW+0.02),MS.wallD,midX,winY-archR*0.25,wz));
      // Top of recess (ceiling of alcove)
      scene.add(mk(new THREE.BoxGeometry(recessD,0.05,winW+0.02),MS.wallD,midX,winY+rectH/2+archR-0.02,wz));
      // Side walls of recess
      for(const zSide of[-1,1]){
        scene.add(mk(new THREE.BoxGeometry(recessD,rectH+archR,0.05),MS.wallD,midX,winY+(archR-rectH)*0.25,wz+zSide*(winW/2+0.01)));
      }
      // ── Stone frame — rectangular bottom portion ──
      // Left jamb
      scene.add(mk(new THREE.BoxGeometry(frameTh,rectH,frameTh),winFrameMat,innerX,winY-archR/2,wz-winW/2-frameTh/2));
      // Right jamb
      scene.add(mk(new THREE.BoxGeometry(frameTh,rectH,frameTh),winFrameMat,innerX,winY-archR/2,wz+winW/2+frameTh/2));
      // Bottom sill — pronounced, projecting inward
      scene.add(mk(new THREE.BoxGeometry(recessD+0.1,0.08,winW+frameTh*2+0.1),winFrameMat,midX,winY-rectH/2-0.04,wz));
      // Sill gold trim
      scene.add(mk(new THREE.BoxGeometry(recessD+0.12,0.025,winW+frameTh*2+0.12),MS.gold,midX,winY-rectH/2-0.005,wz));
      // ── Semicircular arch at top — box segments arranged in arc ──
      const archCenterY=winY+rectH/2; // y where arch springs from
      for(let ai=0;ai<=archSegsW;ai++){
        const ang=(ai/archSegsW)*Math.PI;
        const az=Math.cos(ang)*archR;
        const ay=Math.sin(ang)*archR;
        // Outer arch frame segments
        const seg=mk(new THREE.BoxGeometry(frameTh,frameTh,frameTh),winFrameMat,innerX,archCenterY+ay,wz+az);
        scene.add(seg);
      }
      // Keystone at top center of arch — slightly larger
      scene.add(mk(new THREE.BoxGeometry(frameTh+0.02,frameTh*1.5,frameTh+0.04),MS.gold,innerX,archCenterY+archR,wz));
      // ── Mullion cross — thin and elegant ──
      scene.add(mk(new THREE.BoxGeometry(0.03,0.025,winW-0.05),winFrameMat,innerX,winY-rectH*0.15,wz));
      scene.add(mk(new THREE.BoxGeometry(0.03,rectH-0.05,0.025),winFrameMat,innerX,winY-archR/2,wz));
      // ── Glass pane — positioned at the back of the recess (flush with outer wall) ──
      const glass=new THREE.Mesh(new THREE.PlaneGeometry(winW,rectH+archR*0.6),winGlassMat);
      glass.rotation.y=winSide*(-Math.PI/2);glass.position.set(outerX,winY,wz);scene.add(glass);
      // ── TUSCAN LANDSCAPE behind window — flush with outer wall ──
      const landscapeMat=new THREE.MeshBasicMaterial({map:tuscanTex.clone(),side:THREE.DoubleSide});
      const landscape=new THREE.Mesh(new THREE.PlaneGeometry(winW-0.04,rectH+archR*0.5),landscapeMat);
      landscape.rotation.y=winSide*(-Math.PI/2);landscape.position.set(outerX+(winSide*0.01),winY,wz);scene.add(landscape);
      // ── Curtains — thin planes hanging on each side ──
      for(const cSide of[-1,1]){
        const cZ=wz+cSide*(winW/2+0.18);
        const cX=innerX;
        // Single thin curtain plane per side
        const curtainPlane=new THREE.Mesh(new THREE.PlaneGeometry(0.35,winH+0.3),MS.curtain);
        curtainPlane.rotation.y=winSide*(-Math.PI/2)+cSide*0.06;
        curtainPlane.position.set(cX,winY,cZ);
        scene.add(curtainPlane);
        // Gold tie-back
        scene.add(mk(new THREE.SphereGeometry(0.03,6,6),MS.gold,cX,winY-0.5,cZ));
      }
      // Curtain rod spanning the top
      const rodMesh=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,winW+0.7,6),MS.gold);
      rodMesh.rotation.x=Math.PI/2;rodMesh.position.set(innerX,winY+rectH/2+0.1,wz);scene.add(rodMesh);
      // ── Warm sunlight — PointLight only, no floating shaft planes ──
      const wLight=new THREE.PointLight("#FFF5E0",0.6,8);wLight.position.set(wx-(winSide*0.6),winY,wz);scene.add(wLight);
      const wLight2=new THREE.PointLight("#FFE8C0",0.25,5);wLight2.position.set(wx-(winSide*1.2),winY-0.5,wz);scene.add(wLight2);
    });

    // ═══ DECORATIONS — carefully laid out to avoid overlaps ═══
    // Layout plan per door zone i:
    //   Door at z_i on sideA, Window at z_i on sideB (opposite)
    //   Painting at z_i + sp/2 on sideA (between doors, same wall as doors)
    //   Bench at z_i + sp/2 on sideB (under window area, between windows)
    //   Sconces at z_i + sp*0.25 on both walls (between door/window and painting/bench)

    // ── BENCHES — on window side (sideB), between windows at z_i + sp/2 ──
    for(let i=0;i<rooms.length-1;i++){
      const doorSide=i%2===0?-1:1;
      const benchSide=-doorSide; // window/bench side
      const bz=-cL/2+5.5+i*C.sp+C.sp/2;
      if(bz>cL/2-4||bz<-cL/2+3)continue;
      const bx=benchSide*(cW/2-.6);
      // Bench legs
      for(const lz of[-.4,.4])for(const lx of[-.08,.08]){
        scene.add(mk(new THREE.BoxGeometry(.07,.38,.07),MS.bench,bx+lx,.19,bz+lz));
      }
      // Bench seat
      scene.add(mk(new THREE.BoxGeometry(.55,.05,1.05),MS.bench,bx,.40,bz));
      // Cushion
      scene.add(mk(new THREE.BoxGeometry(.48,.07,.92),MS.benchCushion,bx,.47,bz));
      // Armrests
      for(const lz of[-.48,.48]){
        scene.add(mk(new THREE.BoxGeometry(.06,.2,.06),MS.bench,bx,.5,bz+lz));
        scene.add(mk(new THREE.BoxGeometry(.12,.04,.08),MS.bench,bx,.62,bz+lz));
      }
    }

    // ── CANDLE SCONCES — at z_i + sp*0.25 on both walls, between door/window and painting/bench ──
    for(let i=0;i<rooms.length;i++){
      const sz=-cL/2+5.5+i*C.sp+C.sp*0.25;
      if(sz>cL/2-3||sz<-cL/2+3)continue;
      for(const s of[-1,1]){
        const sx=s*(cW/2-.03);
        scene.add(mk(new THREE.BoxGeometry(.04,.02,.12),MS.bronze,sx-(s*.06),2.6,sz));
        scene.add(mk(new THREE.CylinderGeometry(.025,.02,.1,6),MS.bronze,sx-(s*.12),2.65,sz));
        scene.add(mk(new THREE.CylinderGeometry(.012,.012,.08,5),new THREE.MeshStandardMaterial({color:"#F5F0E0",roughness:.8}),sx-(s*.12),2.74,sz));
        const fG2=new THREE.Mesh(new THREE.SphereGeometry(.018,4,4),new THREE.MeshBasicMaterial({color:"#FFE080",transparent:true,opacity:.7}));
        fG2.position.set(sx-(s*.12),2.8,sz);scene.add(fG2);
      }
    }

    // ── SIDE TABLES + POTTED PLANTS — corridor ends only, far from door zones ──
    for(const tz of[-cL/2+2.5,cL/2-3.5]){
      for(const ts of[-1,1]){
        const tx=ts*(cW/2-.7);
        // Side table
        for(const lz2 of[-.12,.12])for(const lx2 of[-.12,.12])
          scene.add(mk(new THREE.CylinderGeometry(.02,.02,.55,4),MS.dkW,tx+lx2,.275,tz+lz2));
        scene.add(mk(new THREE.CylinderGeometry(.22,.2,.04,8),MS.dkW,tx,.57,tz));
        scene.add(mk(new THREE.CylinderGeometry(.04,.06,.15,8),MS.marble,tx,.645,tz));
        scene.add(mk(new THREE.CylinderGeometry(.06,.04,.08,8),MS.marble,tx,.755,tz));
        for(let f=0;f<3;f++){
          const fa=(f/3)*Math.PI*2;
          scene.add(mk(new THREE.SphereGeometry(.02,4,4),new THREE.MeshStandardMaterial({color:C.accent,roughness:.8}),tx+Math.cos(fa)*.03,.82,tz+Math.sin(fa)*.03));
        }
      }
    }
    // Potted plants at corridor ends (offset from side tables)
    for(const pz of[-cL/2+1.5,cL/2-1.8]){
      for(const px2 of[-cW/2+.45,cW/2-.45]){
        scene.add(mk(new THREE.CylinderGeometry(.12,.10,.03,8),MS.terracotta,px2,.015,pz));
        scene.add(mk(new THREE.CylinderGeometry(.10,.14,.28,8),MS.terracotta,px2,.155,pz));
        scene.add(mk(new THREE.CylinderGeometry(.15,.15,.025,8),MS.terracotta,px2,.3,pz));
        scene.add(mk(new THREE.SphereGeometry(.14,7,7),MS.foliage,px2,.48,pz));
        scene.add(mk(new THREE.SphereGeometry(.1,6,6),MS.foliageDark,px2+.06,.55,pz+.05));
        scene.add(mk(new THREE.SphereGeometry(.1,6,6),MS.foliage,px2-.05,.56,pz-.04));
        scene.add(mk(new THREE.SphereGeometry(.08,5,5),MS.foliageDark,px2,.62,pz));
      }
    }

    // ── RUNNER RUG (layered, wing-colored) ──
    scene.add(mk(new THREE.BoxGeometry(2.4,.004,cL-5),MS.rugB,0,.003,0));
    scene.add(mk(new THREE.BoxGeometry(2,.007,cL-5.5),MS.rug,0,.006,0));
    scene.add(mk(new THREE.BoxGeometry(1.4,.009,cL-6),MS.rugB,0,.008,0));

    // ── CHANDELIERS ──
    const nCh=Math.max(2,Math.ceil(cL/14));
    for(let ci=0;ci<nCh;ci++){const cz=-cL/2+cL/(nCh+1)*(ci+1);
      scene.add(mk(new THREE.CylinderGeometry(.015,.015,.4,6),MS.bronze,0,cH-.2,cz));
      const tr=new THREE.Mesh(new THREE.TorusGeometry(.45,.035,8,20),MS.bronze);tr.position.set(0,cH-.45,cz);scene.add(tr);
      const tr2=new THREE.Mesh(new THREE.TorusGeometry(.28,.018,8,14),MS.gold);tr2.position.set(0,cH-.42,cz);scene.add(tr2);
      for(let b=0;b<6;b++){const ba=(b/6)*Math.PI*2;
        scene.add(mk(new THREE.CylinderGeometry(.01,.008,.06,4),MS.sconce,Math.cos(ba)*.42,cH-.42,cz+Math.sin(ba)*.42));
        const bl=new THREE.Mesh(new THREE.SphereGeometry(.028,5,5),MS.glassG);bl.position.set(Math.cos(ba)*.42,cH-.36,cz+Math.sin(ba)*.42);scene.add(bl);}
      scene.add(new THREE.PointLight("#FFE8C0",.7,9).translateY(cH-.5).translateZ(cz));
    }

    // ── SCONCES between door zones — at z_i + sp*0.75, different z from candles (sp*0.25) ──
    for(const s of[-1,1])for(let i=0;i<rooms.length;i++){
      const sz=-cL/2+5.5+i*C.sp+C.sp*0.75;if(sz>cL/2-2||sz<-cL/2+2)continue;
      scene.add(mk(new THREE.BoxGeometry(.06,.14,.06),MS.sconce,s*(cW/2-.03),3.5,sz));
      scene.add(mk(new THREE.CylinderGeometry(.04,.03,.06,6),MS.sconce,s*(cW/2-.06),3.62,sz));
      const bl=new THREE.Mesh(new THREE.SphereGeometry(.025,6,6),MS.glassG);bl.position.set(s*(cW/2-.06),3.72,sz);scene.add(bl);
      scene.add(new THREE.PointLight("#FFE0B0",.18,3.5).translateX(s*(cW/2-.15)).translateY(3.6).translateZ(sz));
    }

    // ── CENTRAL STATUE on marble pedestal ──
    const sZ=0,pH2=1.2;
    scene.add(mk(new THREE.BoxGeometry(1,.07,1),MS.marble,0,.035,sZ));
    scene.add(mk(new THREE.BoxGeometry(.75,pH2-.1,.75),MS.marble,0,pH2/2+.03,sZ));
    scene.add(mk(new THREE.BoxGeometry(.85,.07,.85),MS.gold,0,pH2+.01,sZ));
    if(wingId==="family"){scene.add(mk(new THREE.CylinderGeometry(.06,.1,.9,6),MS.bronze,0,pH2+.45,sZ));scene.add(mk(new THREE.SphereGeometry(.28,8,8),new THREE.MeshStandardMaterial({color:"#4A7838",roughness:.8}),0,pH2+1.1,sZ));for(let b=0;b<4;b++){const a=(b/4)*Math.PI*2;const br=mk(new THREE.CylinderGeometry(.015,.03,.35,4),MS.bronze,Math.cos(a)*.1,pH2+.8,sZ+Math.sin(a)*.1);br.rotation.z=Math.cos(a)*.4;br.rotation.x=Math.sin(a)*.4;scene.add(br);}}
    else if(wingId==="travel"){scene.add(mk(new THREE.SphereGeometry(.3,14,10),MS.statue,0,pH2+.5,sZ));const ring=new THREE.Mesh(new THREE.TorusGeometry(.35,.012,8,20),MS.gold);ring.position.set(0,pH2+.5,sZ);scene.add(ring);scene.add(mk(new THREE.CylinderGeometry(.01,.01,.7,4),MS.bronze,0,pH2+.5,sZ));}
    else if(wingId==="childhood"){scene.add(mk(new THREE.CylinderGeometry(.25,.3,.45,8),MS.statue,0,pH2+.22,sZ));scene.add(mk(new THREE.ConeGeometry(.3,.35,8),MS.velvet,0,pH2+.62,sZ));scene.add(mk(new THREE.SphereGeometry(.05,6,6),MS.gold,0,pH2+.84,sZ));}
    else if(wingId==="career"){scene.add(mk(new THREE.BoxGeometry(.14,1,.14),MS.statue,0,pH2+.5,sZ));scene.add(mk(new THREE.ConeGeometry(.1,.22,4),MS.gold,0,pH2+1.12,sZ));}
    else{scene.add(mk(new THREE.CylinderGeometry(.1,.15,.65,8),MS.statue,0,pH2+.33,sZ));scene.add(mk(new THREE.SphereGeometry(.14,8,8),MS.statue,0,pH2+.8,sZ));}
    const sL=new THREE.SpotLight("#FFF5E0",.7,5,Math.PI/6,.5,1);sL.position.set(0,cH-.1,sZ);sL.target.position.set(0,pH2,sZ);scene.add(sL);scene.add(sL.target);

    // ═══ PAINTINGS — on door side (sideA) at z_i + sp/2 (between doors) ═══
    const paintingPositions: {pz: number,doorIdx: number,side: number}[]=[];
    for(let i=0;i<rooms.length-1;i++){
      const pz=-cL/2+5.5+i*C.sp+C.sp/2;
      if(pz>cL/2-3||pz<-cL/2+3)continue;
      const doorSide=i%2===0?-1:1; // same side as this door
      paintingPositions.push({pz,doorIdx:i,side:doorSide});
    }
    const paintingMeshes: {mesh: THREE.Mesh,mat: THREE.MeshStandardMaterial,idx: number,side: number,doorIdx: number}[]=[];
    paintingPositions.forEach(({pz,doorIdx,side:s},idx)=>{
      const fx=s*(cW/2-.005);const pw=1.8,ph2b=1.3;
      const room=rooms[Math.min(doorIdx,rooms.length-1)];
      // Ornate frame — thicker gold
      scene.add(mk(new THREE.BoxGeometry(.05,ph2b+.22,.06),MS.fG,fx,2.8,pz-pw/2-.11));
      scene.add(mk(new THREE.BoxGeometry(.05,ph2b+.22,.06),MS.fG,fx,2.8,pz+pw/2+.11));
      scene.add(mk(new THREE.BoxGeometry(.05,.06,pw+.28),MS.fG,fx,2.8-ph2b/2-.11,pz));
      scene.add(mk(new THREE.BoxGeometry(.05,.06,pw+.28),MS.fG,fx,2.8+ph2b/2+.11,pz));
      // Inner frame border
      scene.add(mk(new THREE.BoxGeometry(.04,ph2b+.04,.02),MS.gold,fx-(s*.003),2.8,pz-pw/2-.02));
      scene.add(mk(new THREE.BoxGeometry(.04,ph2b+.04,.02),MS.gold,fx-(s*.003),2.8,pz+pw/2+.02));
      scene.add(mk(new THREE.BoxGeometry(.04,.02,pw+.08),MS.gold,fx-(s*.003),2.8-ph2b/2-.02,pz));
      scene.add(mk(new THREE.BoxGeometry(.04,.02,pw+.08),MS.gold,fx-(s*.003),2.8+ph2b/2+.02,pz));

      // Canvas painting — room preview card with icon and name (or override image)
      const overrideData=corridorPaintings&&room?corridorPaintings[room.id]:undefined;
      const cv=document.createElement("canvas");cv.width=480;cv.height=340;const cx=cv.getContext("2d")!;
      const hue=room?room.coverHue:((parseInt(wing.accent.slice(1),16)%360)+idx*50)%360;
      // Draw default content first (used as fallback and initial state)
      const drawDefault=()=>{
        const g=cx.createLinearGradient(0,0,480,340);
        g.addColorStop(0,`hsl(${hue},40%,35%)`);g.addColorStop(0.5,`hsl(${(hue+15)%360},35%,28%)`);g.addColorStop(1,`hsl(${(hue+30)%360},30%,22%)`);
        cx.fillStyle=g;cx.fillRect(0,0,480,340);
        for(let n=0;n<20;n++){cx.fillStyle=`rgba(255,255,255,${Math.random()*.03})`;cx.fillRect(Math.random()*480,Math.random()*340,Math.random()*60+20,Math.random()*5+1);}
        cx.strokeStyle=`hsla(${hue},30%,60%,0.4)`;cx.lineWidth=2;cx.strokeRect(15,15,450,310);
        if(room){
          cx.font="80px serif";cx.textAlign="center";cx.textBaseline="middle";
          cx.shadowColor="rgba(0,0,0,0.4)";cx.shadowBlur=12;cx.shadowOffsetY=4;
          cx.fillText(room.icon,240,140);cx.shadowColor="transparent";
          cx.fillStyle=`hsl(${hue},25%,85%)`;cx.font="bold 28px Georgia,serif";cx.fillText(room.name,240,240);
          cx.strokeStyle=`hsla(${hue},30%,65%,0.5)`;cx.lineWidth=1;cx.beginPath();cx.moveTo(140,205);cx.lineTo(340,205);cx.stroke();
          cx.fillStyle=`hsl(${hue},20%,70%)`;cx.font="italic 16px Georgia,serif";cx.fillText((wing.name||wingId),240,275);
        }else{
          cx.font="bold 32px Georgia,serif";cx.textAlign="center";cx.textBaseline="middle";
          cx.fillStyle=`hsl(${hue},30%,75%)`;cx.fillText("Gallery",240,170);
        }
      };
      drawDefault();
      const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
      const paintMat=new THREE.MeshStandardMaterial({map:tex,roughness:.75,emissive:"#000000",emissiveIntensity:0});
      // If there's an override URL, load the image and update the texture
      if(overrideData?.url){
        const img=new Image();img.crossOrigin="anonymous";
        img.onload=()=>{
          cx.clearRect(0,0,480,340);
          // Fill with dark bg first
          cx.fillStyle="#1a1a1a";cx.fillRect(0,0,480,340);
          // Draw image cover-fit
          const ar=img.width/img.height,tr=480/340;
          let sw=480,sh=340,sx=0,sy=0;
          if(ar>tr){sw=Math.round(340*ar);sx=Math.round((sw-480)/2);}
          else{sh=Math.round(480/ar);sy=Math.round((sh-340)/2);}
          cx.drawImage(img,-sx,-sy,sw,sh);
          // Subtle vignette overlay
          const vig=cx.createRadialGradient(240,170,80,240,170,280);
          vig.addColorStop(0,"rgba(0,0,0,0)");vig.addColorStop(1,"rgba(0,0,0,0.3)");
          cx.fillStyle=vig;cx.fillRect(0,0,480,340);
          // Title at bottom
          if(overrideData.title){
            cx.fillStyle="rgba(0,0,0,0.5)";cx.fillRect(0,280,480,60);
            cx.fillStyle="#F0EAE0";cx.font="bold 18px Georgia,serif";cx.textAlign="center";cx.textBaseline="middle";
            cx.fillText(overrideData.title,240,310);
          }
          tex.needsUpdate=true;
        };
        img.src=overrideData.url;
      }
      const pm=new THREE.Mesh(new THREE.PlaneGeometry(pw,ph2b),paintMat);
      pm.rotation.y=s*(-Math.PI/2);pm.position.set(fx-(s*.003),2.8,pz);
      pm.userData={isPainting:true,idx};
      scene.add(pm);
      paintingMeshes.push({mesh:pm,mat:paintMat,idx,side:s,doorIdx});
      // Painting spotlight — warmer, brighter
      const pSpot=new THREE.SpotLight("#FFF5E0",.6,5,Math.PI/7,.5,1);pSpot.position.set(fx-(s*.5),cH-.3,pz);pSpot.target.position.set(fx,2.8,pz);scene.add(pSpot);scene.add(pSpot.target);
    });

    // (Plants at ends are included with the side tables above)

    // ══ DOORS ══
    const dMeshes: any[]=[];
    rooms.forEach((room: any,i: any)=>{
      const side=i%2===0?-1:1;
      const z=-cL/2+5.5+i*C.sp;
      const wx=side*(cW/2);
      const dW=1.7,dH=3.6;
      // Frame
      scene.add(mk(new THREE.BoxGeometry(.05,dH+.3,.28),MS.trim,wx-(side*.025),dH/2+.15,z-dW/2-.14));
      scene.add(mk(new THREE.BoxGeometry(.05,dH+.3,.28),MS.trim,wx-(side*.025),dH/2+.15,z+dW/2+.14));
      scene.add(mk(new THREE.BoxGeometry(.05,.28,dW+.56),MS.trim,wx-(side*.025),dH+.44,z));
      // Gold capitals + keystone
      scene.add(mk(new THREE.BoxGeometry(.04,.08,.32),MS.gold,wx-(side*.02),dH+.05,z-dW/2-.14));
      scene.add(mk(new THREE.BoxGeometry(.04,.08,.32),MS.gold,wx-(side*.02),dH+.05,z+dW/2+.14));
      scene.add(mk(new THREE.BoxGeometry(.05,.16,.18),MS.gold,wx-(side*.02),dH+.62,z));
      // Recess
      scene.add(mk(new THREE.BoxGeometry(.03,dH-.1,dW+.1),MS.doorD,wx-(side*.015),(dH-.1)/2,z));
      // Door panel
      const doorMat=MS.door.clone();
      const doorMesh=mk(new THREE.BoxGeometry(.05,dH-.2,dW-.05),doorMat,wx-(side*.03),(dH-.2)/2,z);
      doorMesh.userData={roomId:room.id,wingId,idx:i};doorMesh.castShadow=true;scene.add(doorMesh);
      dMeshes.push({mesh:doorMesh,mat:doorMat,room,side,z,x:wx});
      // Panel insets
      for(let py=0;py<2;py++)for(let pz2=-1;pz2<=1;pz2+=2)
        scene.add(mk(new THREE.BoxGeometry(.004,.6,dW/2-.18),MS.gold,wx-(side*.05),.65+py*1.3,z+pz2*(dW/4)));
      // Handles
      for(let hz of[-.12,.12])scene.add(mk(new THREE.SphereGeometry(.03,6,6),MS.handle,wx-(side*.06),1.5,z+hz));
      // Warm glow
      scene.add(new THREE.PointLight(`hsl(${room.coverHue},35%,60%)`,.2,3.5).translateX(wx-(side*.4)).translateY(dH/2).translateZ(z));
      // Name plaque
      const plq=document.createElement("canvas");plq.width=280;plq.height=48;
      const pc=plq.getContext("2d")!;pc.fillStyle="#3E3020";pc.fillRect(0,0,280,48);pc.fillStyle="#C8A868";pc.fillRect(2,2,276,44);pc.fillStyle="#3E3020";pc.fillRect(5,5,270,38);
      pc.fillStyle="#F0EAE0";pc.font="bold 17px Georgia,serif";pc.textAlign="center";pc.textBaseline="middle";pc.fillText(room.name,140,24);
      const ptex=new THREE.CanvasTexture(plq);ptex.colorSpace=THREE.SRGBColorSpace;
      const plm=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.24),new THREE.MeshStandardMaterial({map:ptex,roughness:.4}));
      plm.rotation.y=side*(-Math.PI/2);plm.position.set(wx-(side*.005),dH+.8,z);scene.add(plm);
      if(room.shared){const badge=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.02,12),MS.shared);badge.rotation.z=side*Math.PI/2;badge.position.set(wx-(side*.005),dH+1.1,z+.5);scene.add(badge);}
    });
    doorMeshes.current=dMeshes;

    // ═══ DRAMATIC EXIT PORTAL — Grand Archway to Entrance Hall ═══
    const portalZ=cL/2-1.2;
    const pW=2.8,pH=cH-1;
    // Marble pillar columns — tall, reaching near ceiling
    for(let ps of[-1,1]){
      const px=ps*(pW/2+.2);
      // Column base — elaborate stepped
      scene.add(mk(new THREE.BoxGeometry(.55,.08,.55),MS.marble,px,.04,portalZ));
      scene.add(mk(new THREE.BoxGeometry(.48,.08,.48),MS.marble,px,.12,portalZ));
      scene.add(mk(new THREE.BoxGeometry(.42,.06,.42),MS.gold,px,.17,portalZ));
      // Column shaft — fluted look
      scene.add(mk(new THREE.CylinderGeometry(.14,.16,pH-.8,14),MS.portalPillar,px,pH/2+.1,portalZ));
      // Column capital — ornate
      scene.add(mk(new THREE.BoxGeometry(.44,.08,.44),MS.gold,px,pH-.12,portalZ));
      scene.add(mk(new THREE.CylinderGeometry(.2,.15,.12,14),MS.portalArch,px,pH-.02,portalZ));
      scene.add(mk(new THREE.BoxGeometry(.48,.06,.48),MS.portalArch,px,pH+.06,portalZ));
    }
    // Double arch — outer arch
    const archSegs=12;
    for(let ai=0;ai<=archSegs;ai++){
      const ang=(ai/archSegs)*Math.PI;
      const ax=Math.cos(ang)*(pW/2+.2);
      const ay=pH+Math.sin(ang)*.7;
      scene.add(mk(new THREE.BoxGeometry(.2,.2,.24),MS.portalArch,ax,ay,portalZ));
    }
    // Inner arch — gold trim
    for(let ai=0;ai<=archSegs;ai++){
      const ang=(ai/archSegs)*Math.PI;
      const ax=Math.cos(ang)*(pW/2);
      const ay=pH+Math.sin(ang)*.55;
      scene.add(mk(new THREE.BoxGeometry(.1,.1,.12),MS.portalGoldTrim,ax,ay,portalZ));
    }
    // Keystone at top — larger
    scene.add(mk(new THREE.BoxGeometry(.38,.3,.26),MS.portalKeystone,0,pH+.75,portalZ));
    // Decorative medallion on keystone
    const keystoneMedallion=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.02,10),MS.portalGoldTrim);
    keystoneMedallion.rotation.x=Math.PI/2;keystoneMedallion.position.set(0,pH+.75,portalZ-.14);scene.add(keystoneMedallion);
    // Decorative molding under arch
    scene.add(mk(new THREE.BoxGeometry(pW+1,.06,.2),MS.gold,0,pH+.02,portalZ));
    // Arch lintel
    scene.add(mk(new THREE.BoxGeometry(pW+1.2,.12,.22),MS.portalArch,0,pH+.14,portalZ));
    // Inner glow plane — brighter
    const portalGlow=new THREE.Mesh(new THREE.PlaneGeometry(pW-.2,pH-.4),new THREE.MeshBasicMaterial({color:"#FFF8E0",transparent:true,opacity:.08,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
    portalGlow.position.set(0,pH/2+.2,portalZ);scene.add(portalGlow);
    // ── WARM FOG/MIST at base of portal ──
    for(let fi=0;fi<5;fi++){
      const fogPlane=new THREE.Mesh(new THREE.PlaneGeometry(pW*.7+fi*.3,.4),MS.portalFog);
      fogPlane.position.set(0,.2+fi*.08,portalZ-.05-fi*.04);
      fogPlane.material=MS.portalFog.clone();
      (fogPlane.material as THREE.MeshBasicMaterial).opacity=.06-fi*.008;
      scene.add(fogPlane);
    }
    // Particle sparkles — MORE (48+)
    const sparkN=56,sparkG=new THREE.BufferGeometry(),sparkP=new Float32Array(sparkN*3);
    for(let i=0;i<sparkN;i++){
      const ang2=(i/sparkN)*Math.PI*2;
      const r=pW/2+.3+Math.random()*.4;
      sparkP[i*3]=Math.cos(ang2)*r;
      sparkP[i*3+1]=pH*.15+Math.abs(Math.sin(ang2))*(pH*.7)+Math.random()*pH*.2;
      sparkP[i*3+2]=portalZ+Math.random()*.2-.1;
    }
    sparkG.setAttribute("position",new THREE.BufferAttribute(sparkP,3));
    const sparkPoints=new THREE.Points(sparkG,new THREE.PointsMaterial({color:"#FFE8B0",size:.05,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false}));
    scene.add(sparkPoints);
    // Portal lights — stronger, multiple
    const portalLight=new THREE.PointLight("#FFE8C0",1.0,9);portalLight.position.set(0,pH/2+.5,portalZ);scene.add(portalLight);
    const portalLight2=new THREE.PointLight("#FFF5E0",.4,5);portalLight2.position.set(0,.5,portalZ);scene.add(portalLight2);
    const portalSpot=new THREE.SpotLight("#FFF5E0",.7,10,Math.PI/5,.4,1);portalSpot.position.set(0,cH-.2,portalZ-.8);portalSpot.target.position.set(0,pH/2,portalZ);scene.add(portalSpot);scene.add(portalSpot.target);
    // Invisible hitbox for click
    const portalHit=new THREE.Mesh(new THREE.BoxGeometry(pW,pH,.4),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    portalHit.position.set(0,pH/2,portalZ);scene.add(portalHit);
    // ── ENTRANCE HALL label — LARGER, GOLDEN ──
    const plC=document.createElement("canvas");plC.width=600;plC.height=80;const plx=plC.getContext("2d")!;
    // Gold gradient text background
    plx.fillStyle="rgba(0,0,0,0)";plx.fillRect(0,0,600,80);
    const textGrad=plx.createLinearGradient(0,0,600,0);
    textGrad.addColorStop(0,"#C8A040");textGrad.addColorStop(0.5,"#FFD860");textGrad.addColorStop(1,"#C8A040");
    plx.fillStyle=textGrad;plx.font="bold 36px Georgia,serif";plx.textAlign="center";plx.textBaseline="middle";
    plx.shadowColor="rgba(0,0,0,0.3)";plx.shadowBlur=8;plx.shadowOffsetY=2;
    plx.fillText("\u2190 ENTRANCE HALL",300,40);
    plx.shadowColor="transparent";
    // Decorative underline
    plx.strokeStyle="#D4AF37";plx.lineWidth=2;
    plx.beginPath();plx.moveTo(120,62);plx.lineTo(480,62);plx.stroke();
    const plT=new THREE.CanvasTexture(plC);plT.colorSpace=THREE.SRGBColorSpace;
    scene.add(mk(new THREE.PlaneGeometry(2.4,.36),new THREE.MeshBasicMaterial({map:plT,transparent:true}),0,pH+.95,portalZ));

    // ═══ WING NAME FRESCO — DRAMATIC, on far end wall (-cL/2) ═══
    const wingLabel=(wing.name||wingId).toUpperCase();
    const fC=document.createElement("canvas");fC.width=1200;fC.height=360;const fc=fC.getContext("2d")!;
    // Fresco background — aged plaster look
    const fGrad=fc.createLinearGradient(0,0,1200,360);
    fGrad.addColorStop(0,wing.wall);fGrad.addColorStop(.5,`${wing.wall}ee`);fGrad.addColorStop(1,wing.wall);
    fc.fillStyle=fGrad;fc.fillRect(0,0,1200,360);
    // Subtle aging/texture noise
    for(let n=0;n<80;n++){fc.fillStyle=`rgba(160,140,120,${Math.random()*.05})`;fc.fillRect(Math.random()*1200,Math.random()*360,Math.random()*100+30,Math.random()*10+2);}
    // ── Ornamental border frame ──
    fc.strokeStyle=C.accent;fc.lineWidth=4;fc.globalAlpha=.5;
    fc.strokeRect(30,25,1140,310);
    fc.strokeStyle=`${C.accent}88`;fc.lineWidth=2;
    fc.strokeRect(40,35,1120,290);
    // ── Ornamental corner swirls ──
    fc.globalAlpha=.4;fc.lineWidth=2;fc.strokeStyle=C.accent;
    const drawCornerSwirl=(ox: number,oy: number,sx: number,sy: number)=>{
      fc.beginPath();
      fc.moveTo(ox,oy);
      fc.quadraticCurveTo(ox+sx*30,oy,ox+sx*30,oy+sy*20);
      fc.stroke();
      fc.beginPath();
      fc.moveTo(ox+sx*5,oy+sy*5);
      fc.quadraticCurveTo(ox+sx*22,oy+sy*5,ox+sx*22,oy+sy*18);
      fc.stroke();
      fc.beginPath();fc.arc(ox+sx*25,oy+sy*12,6,0,Math.PI*2);fc.stroke();
      // Extra flourish
      fc.beginPath();
      fc.moveTo(ox+sx*8,oy);fc.quadraticCurveTo(ox+sx*40,oy+sy*3,ox+sx*40,oy+sy*28);
      fc.stroke();
    };
    drawCornerSwirl(50,40,1,1);drawCornerSwirl(1150,40,-1,1);
    drawCornerSwirl(50,320,1,-1);drawCornerSwirl(1150,320,-1,-1);
    // ── Decorative lines above and below text ──
    fc.globalAlpha=.45;fc.lineWidth=2.5;
    fc.beginPath();fc.moveTo(200,80);fc.lineTo(1000,80);fc.stroke();
    fc.beginPath();fc.moveTo(200,280);fc.lineTo(1000,280);fc.stroke();
    // Central decorative element on top line
    fc.beginPath();fc.arc(600,80,15,0,Math.PI*2);fc.stroke();
    fc.beginPath();fc.moveTo(580,80);fc.lineTo(590,70);fc.lineTo(600,80);fc.lineTo(610,70);fc.lineTo(620,80);fc.stroke();
    // Central decorative element on bottom line
    fc.beginPath();fc.arc(600,280,15,0,Math.PI*2);fc.stroke();
    fc.beginPath();fc.moveTo(580,280);fc.lineTo(590,290);fc.lineTo(600,280);fc.lineTo(610,290);fc.lineTo(620,280);fc.stroke();
    fc.globalAlpha=1;
    // Wing name — LARGE, BOLD
    fc.fillStyle=C.accent;fc.font="bold 110px Georgia,serif";fc.textAlign="center";fc.textBaseline="middle";
    fc.shadowColor="rgba(0,0,0,0.2)";fc.shadowBlur=12;fc.shadowOffsetY=4;
    fc.fillText(wingLabel,600,165);
    fc.shadowColor="transparent";
    // Subtitle
    fc.fillStyle=`${C.accent}88`;fc.font="italic 28px Georgia,serif";
    fc.fillText(wing.desc||"",600,235);
    const fTex=new THREE.CanvasTexture(fC);fTex.colorSpace=THREE.SRGBColorSpace;
    // Fresco plane — 80% of corridor width
    const frescoW=cW*.8,frescoH=frescoW*.3;
    const frescoMesh=new THREE.Mesh(new THREE.PlaneGeometry(frescoW,frescoH),new THREE.MeshStandardMaterial({map:fTex,roughness:.82,transparent:true}));
    frescoMesh.position.set(0,cH*.55,-cL/2+.01);scene.add(frescoMesh);
    // ── Gold frame around fresco ──
    const fFW=frescoW,fFH=frescoH,fFY=cH*.55,fFZ=-cL/2+.02;
    scene.add(mk(new THREE.BoxGeometry(.08,fFH+.16,.04),MS.gold,-fFW/2-.06,fFY,fFZ));
    scene.add(mk(new THREE.BoxGeometry(.08,fFH+.16,.04),MS.gold,fFW/2+.06,fFY,fFZ));
    scene.add(mk(new THREE.BoxGeometry(fFW+.24,.08,.04),MS.gold,0,fFY+fFH/2+.06,fFZ));
    scene.add(mk(new THREE.BoxGeometry(fFW+.24,.08,.04),MS.gold,0,fFY-fFH/2-.06,fFZ));
    // Corner rosettes on frame
    for(let cx2 of[-fFW/2-.06,fFW/2+.06])for(let cy of[fFY-fFH/2-.06,fFY+fFH/2+.06]){
      const ros=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.02,8),MS.gold);ros.rotation.x=Math.PI/2;ros.position.set(cx2,cy,fFZ+.02);scene.add(ros);
    }
    // Spotlight on fresco — stronger, more prominent
    const fSpot=new THREE.SpotLight("#FFF5E0",1.0,10,Math.PI/4,.5,1);fSpot.position.set(0,cH-.2,-cL/2+3);fSpot.target.position.set(0,cH*.55,-cL/2);scene.add(fSpot);scene.add(fSpot.target);
    // Secondary fill light
    const fFill=new THREE.PointLight("#FFE8C0",.4,6);fFill.position.set(0,cH*.55,-cL/2+1.5);scene.add(fFill);

    // Dust particles
    const rdN=90,rdG=new THREE.BufferGeometry(),rdP=new Float32Array(rdN*3);
    for(let i=0;i<rdN;i++){rdP[i*3]=(Math.random()-.5)*cW;rdP[i*3+1]=.5+Math.random()*cH;rdP[i*3+2]=(Math.random()-.5)*cL;}
    rdG.setAttribute("position",new THREE.BufferAttribute(rdP,3));
    scene.add(new THREE.Points(rdG,new THREE.PointsMaterial({color:"#FFF8E0",size:.035,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false})));

    // ── CAMERA + CONTROLS ──
    camera.position.set(0,1.7,cL/2-3);
    const lookA={yaw:0,pitch:0},lookT={yaw:0,pitch:0};
    const pos=camera.position.clone(),posT=pos.clone();
    const keys: Record<string,boolean>={},drag={v:false},prev={x:0,y:0};let hovDoor: string|null=null;let hovPainting: number|null=null;
    const clock=new THREE.Clock();
    const animate=()=>{
      frameRef.current=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),t=clock.getElapsedTime();
      lookA.yaw+=(lookT.yaw-lookA.yaw)*.08;lookA.pitch+=(lookT.pitch-lookA.pitch)*.08;
      const spd=3*dt,dir=new THREE.Vector3();
      if(keys.w||keys.arrowup)dir.z-=1;if(keys.s||keys.arrowdown)dir.z+=1;
      if(keys.a||keys.arrowleft)dir.x-=1;if(keys.d||keys.arrowright)dir.x+=1;
      if(dir.length()>0){dir.normalize().multiplyScalar(spd);dir.applyAxisAngle(new THREE.Vector3(0,1,0),-lookA.yaw);posT.add(dir);}
      posT.x=Math.max(-cW/2+1,Math.min(cW/2-1,posT.x));posT.z=Math.max(-cL/2+1.5,Math.min(cL/2-1.5,posT.z));
      pos.lerp(posT,.1);camera.position.copy(pos);
      const ld=new THREE.Vector3(Math.sin(lookA.yaw)*Math.cos(lookA.pitch),Math.sin(lookA.pitch),-Math.cos(lookA.yaw)*Math.cos(lookA.pitch));
      camera.lookAt(camera.position.clone().add(ld));
      dMeshes.forEach(d=>{const isH=hovDoor===d.room.id;d.mat.emissive=isH?new THREE.Color(wing.accent):new THREE.Color(0);d.mat.emissiveIntensity=isH?.12+Math.sin(t*3)*.04:0;});
      // Painting hover animation
      paintingMeshes.forEach(p=>{
        const isH=hovPainting===p.idx;
        p.mat.emissive=isH?new THREE.Color(wing.accent):new THREE.Color("#000000");
        p.mat.emissiveIntensity=isH?.1+Math.sin(t*4)*.04:0;
        const tgtScale=isH?1.06:1;
        p.mesh.scale.lerp(new THREE.Vector3(tgtScale,tgtScale,1),.1);
      });
      portalGlow.material.opacity=.06+Math.sin(t*2)*.04;portalLight.intensity=.9+Math.sin(t*1.5)*.2;
      // Portal sparkle animation
      const sp2=sparkG.attributes.position.array as Float32Array;
      for(let i=0;i<sparkN;i++){sp2[i*3+1]+=Math.sin(t*2+i*1.2)*.004;sp2[i*3]+=Math.cos(t*1.5+i)*.0015;}
      sparkG.attributes.position.needsUpdate=true;
      (sparkPoints.material as THREE.PointsMaterial).opacity=.35+Math.sin(t*3)*.2;
      const dp=rdG.attributes.position.array;for(let i=0;i<rdN;i++){dp[i*3+1]+=Math.sin(t*.2+i*.5)*.002;if(dp[i*3+1]>cH)dp[i*3+1]=.5;}rdG.attributes.position.needsUpdate=true;
      composer.render();
    };animate();
    const onDown=(e: MouseEvent)=>{drag.v=false;prev.x=e.clientX;prev.y=e.clientY;};
    const onMove=(e: MouseEvent)=>{const dx=e.clientX-prev.x,dy=e.clientY-prev.y;if(Math.abs(dx)>2||Math.abs(dy)>2)drag.v=true;
      if(e.buttons===1){lookT.yaw-=dx*.003;lookT.pitch=Math.max(-.4,Math.min(.4,lookT.pitch+dy*.003));prev.x=e.clientX;prev.y=e.clientY;}
      const rect=el.getBoundingClientRect();const rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1),camera);
      let found=null;let portalHov=false;let paintHov: number|null=null;
      dMeshes.forEach(d=>{const hits=rc.intersectObject(d.mesh);if(hits.length>0&&hits[0].distance<5)found=d.room.id;});
      const ph2=rc.intersectObject(portalHit);if(ph2.length>0&&ph2[0].distance<5)portalHov=true;
      paintingMeshes.forEach(p=>{const hits=rc.intersectObject(p.mesh);if(hits.length>0&&hits[0].distance<6)paintHov=p.idx;});
      hovPainting=paintHov;
      hovDoor=found;el.style.cursor=(found||portalHov||paintHov!==null)?"pointer":"grab";onDoorHover(found||(portalHov?"__portal__":null));};
    const onCk=()=>{
      if(!drag.v&&hovDoor)onDoorClick(hovDoor);
      else if(!drag.v&&hovPainting!==null){
        const pInfo=paintingMeshes.find(p=>p.idx===hovPainting);
        const nearestRoom=pInfo?rooms[Math.min(pInfo.doorIdx,rooms.length-1)]:null;
        if(nearestRoom)onDoorClick(nearestRoom.id);
      }
      else if(!drag.v){
        const rect2=el.getBoundingClientRect();const rc2=new THREE.Raycaster();rc2.setFromCamera(new THREE.Vector2(((prev.x-rect2.left)/rect2.width)*2-1,-((prev.y-rect2.top)/rect2.height)*2+1),camera);
        const ph3=rc2.intersectObject(portalHit);if(ph3.length>0&&ph3[0].distance<5)onDoorClick("__portal__");}};
    const onKD=(e: KeyboardEvent)=>{keys[e.key.toLowerCase()]=true;if(["arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase()))e.preventDefault();};
    const onKU=(e: KeyboardEvent)=>{keys[e.key.toLowerCase()]=false;};
    const onRs=()=>{w=el.clientWidth;h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();ren.setSize(w,h);composer.setSize(w,h);};
    el.addEventListener("mousedown",onDown);el.addEventListener("mousemove",onMove);el.addEventListener("click",onCk);
    window.addEventListener("keydown",onKD);window.addEventListener("keyup",onKU);window.addEventListener("resize",onRs);

    // ── TOUCH SUPPORT ──
    let touchTap=true,touchLookId: number|null=null,touchMoveId: number|null=null;
    const touchMoveDir={x:0,z:0};
    const onTS=(e: TouchEvent)=>{
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];const rect=el.getBoundingClientRect();
        const rx=(t.clientX-rect.left)/rect.width,ry=(t.clientY-rect.top)/rect.height;
        if(rx<.25&&ry>.75&&touchMoveId===null){
          touchMoveId=t.identifier;touchMoveDir.x=0;touchMoveDir.z=0;
          prev.x=t.clientX;prev.y=t.clientY;
        }else if(touchLookId===null){
          touchLookId=t.identifier;drag.v=false;prev.x=t.clientX;prev.y=t.clientY;touchTap=true;
        }
      }
    };
    const onTM=(e: TouchEvent)=>{
      e.preventDefault();
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];
        if(t.identifier===touchMoveId){
          const rect=el.getBoundingClientRect();
          const dx=t.clientX-prev.x,dy=t.clientY-prev.y;
          const maxR=rect.width*.12;
          const nx=Math.max(-1,Math.min(1,dx/maxR)),nz=Math.max(-1,Math.min(1,dy/maxR));
          touchMoveDir.x=nx;touchMoveDir.z=nz;
        }else if(t.identifier===touchLookId){
          const dx=t.clientX-prev.x,dy=t.clientY-prev.y;
          if(Math.abs(dx)>2||Math.abs(dy)>2){drag.v=true;touchTap=false;}
          lookT.yaw-=dx*.003;lookT.pitch=Math.max(-.4,Math.min(.4,lookT.pitch+dy*.003));
          prev.x=t.clientX;prev.y=t.clientY;
        }
      }
    };
    const onTE=(e: TouchEvent)=>{
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];
        if(t.identifier===touchMoveId){touchMoveId=null;touchMoveDir.x=0;touchMoveDir.z=0;}
        if(t.identifier===touchLookId){
          if(touchTap){
            const rect=el.getBoundingClientRect();const rc=new THREE.Raycaster();
            rc.setFromCamera(new THREE.Vector2(((t.clientX-rect.left)/rect.width)*2-1,-((t.clientY-rect.top)/rect.height)*2+1),camera);
            let found: string|null=null;
            dMeshes.forEach(d=>{const hits=rc.intersectObject(d.mesh);if(hits.length>0&&hits[0].distance<5)found=d.room.id;});
            if(found)onDoorClick(found);
            else{
              let paintTap: number|null=null;
              paintingMeshes.forEach(p=>{const hits=rc.intersectObject(p.mesh);if(hits.length>0&&hits[0].distance<6)paintTap=p.idx;});
              if(paintTap!==null){const pInfo2=paintingMeshes.find(p=>p.idx===paintTap);const nr=pInfo2?rooms[Math.min(pInfo2.doorIdx,rooms.length-1)]:null;if(nr)onDoorClick(nr.id);}
              else{const ph=rc.intersectObject(portalHit);if(ph.length>0&&ph[0].distance<5)onDoorClick("__portal__");}
            }
          }
          touchLookId=null;
        }
      }
    };
    const touchKeys=()=>{
      if(touchMoveId!==null){
        if(touchMoveDir.z<-.2)keys.w=true;else keys.w=false;
        if(touchMoveDir.z>.2)keys.s=true;else keys.s=false;
        if(touchMoveDir.x<-.2)keys.a=true;else keys.a=false;
        if(touchMoveDir.x>.2)keys.d=true;else keys.d=false;
      }
    };
    const touchTick=setInterval(touchKeys,16);

    el.addEventListener("touchstart",onTS,{passive:true});el.addEventListener("touchmove",onTM,{passive:false});el.addEventListener("touchend",onTE,{passive:true});

    return()=>{if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);el.removeEventListener("mousedown",onDown);el.removeEventListener("mousemove",onMove);el.removeEventListener("click",onCk);
      window.removeEventListener("keydown",onKD);window.removeEventListener("keyup",onKU);window.removeEventListener("resize",onRs);
      el.removeEventListener("touchstart",onTS);el.removeEventListener("touchmove",onTM);el.removeEventListener("touchend",onTE);
      clearInterval(touchTick);
      composer.dispose();
      if(el.contains(ren.domElement))el.removeChild(ren.domElement);ren.dispose();};
  },[wingId]);
  return <div ref={mountRef} style={{width:"100%",height:"100%"}}/>;
}
