"use client";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";
import { createPostProcessing } from "@/lib/3d/postprocessing";
import { createInteriorEnvMap } from "@/lib/3d/environmentMaps";
import { createDustParticles } from "@/lib/3d/atmosphericEffects";
import { loadHDRI, HDRI_INTERIOR, loadMarbleTextures, loadDarkWoodTextures, loadPlasterWallTextures, loadHerringboneTextures, loadFloorTileTextures, loadFabricTextures, loadVelvetTextures, disposePBRSet, type PBRTextureSet } from "@/lib/3d/assetLoader";

// ═══ CORRIDOR — grand gallery hallway with ornate doors ═══
// ═══ CORRIDOR — luxurious wing-specific gallery ═══
export default function CorridorScene({wingId,rooms:roomsProp,onDoorHover,onDoorClick,hoveredDoor,wingData:wingDataProp,corridorPaintings,highlightDoor,styleEra="roman",onInlayClick}: {wingId: any,rooms?: WingRoom[],onDoorHover: any,onDoorClick: any,hoveredDoor: any,wingData?: Wing,corridorPaintings?: Record<string,{url?: string, title?: string}>,highlightDoor?: string|null,styleEra?: string,onInlayClick?: ()=>void}){
  const mountRef=useRef<HTMLDivElement|null>(null),frameRef=useRef<number|null>(null);
  const onDoorClickRef=useRef(onDoorClick);
  useEffect(()=>{onDoorClickRef.current=onDoorClick;},[onDoorClick]);
  const highlightDoorRef=useRef(highlightDoor);
  useEffect(()=>{highlightDoorRef.current=highlightDoor;},[highlightDoor]);
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

    // ── ENVIRONMENT MAP (IBL) — procedural immediate, real HDRI async ──
    const envMapProc=createInteriorEnvMap(ren,{warmth:0.7,brightness:0.45});
    scene.environment=envMapProc;
    scene.environmentIntensity=0.9;
    let envMapHDRI: THREE.Texture|null=null;
    loadHDRI(ren,HDRI_INTERIOR).then((hdr)=>{envMapHDRI=hdr;scene.environment=hdr;scene.environmentIntensity=0.9;}).catch(()=>{});

    // ── POST-PROCESSING (with SSAO) ──
    const composer=createPostProcessing(ren,scene,camera,"corridor");

    scene.add(new THREE.HemisphereLight("#FFF2E0","#C4B8A0",.55));
    const sun=new THREE.DirectionalLight("#FFE8C0",1.5);sun.position.set(8,16,-3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.near=0.5;sun.shadow.camera.far=60;sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;
    scene.add(sun);
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

    // ── REAL PBR TEXTURES (Poly Haven) ──
    const marbleTex=loadMarbleTextures([4,4]);
    const woodTex=loadDarkWoodTextures([3,4]);
    const wallStoneTex=loadPlasterWallTextures([3,3]);
    // Use herringbone for herringbone/parquet wings, floor tiles for others
    const floorTileTex=(C.floorPat==="herringbone"||C.floorPat==="dark_parquet")?loadHerringboneTextures([3,3]):loadFloorTileTextures([3,3]);
    const rugFabricTex=loadFabricTextures([2,2]);
    const velvetTex=loadVelvetTextures([2,2]);
    const allTexSets: PBRTextureSet[]=[marbleTex,woodTex,wallStoneTex,floorTileTex,rugFabricTex,velvetTex];

    const MS={
      wall:new THREE.MeshStandardMaterial({color:wing.wall,roughness:.85,normalMap:wallStoneTex.normalMap,normalScale:new THREE.Vector2(.3,.3),envMapIntensity:.5}),
      wallD:new THREE.MeshStandardMaterial({color:wing.floor,roughness:.8,normalMap:wallStoneTex.normalMap,normalScale:new THREE.Vector2(.2,.2)}),
      floor:new THREE.MeshStandardMaterial({color:wing.floor,roughness:.45,metalness:.1,map:floorTileTex.map,normalMap:floorTileTex.normalMap,normalScale:new THREE.Vector2(.5,.5),roughnessMap:floorTileTex.roughnessMap,aoMap:floorTileTex.aoMap,aoMapIntensity:.7,envMapIntensity:.6}),
      floorL:new THREE.MeshStandardMaterial({color:"#D0C0A0",roughness:.5,normalMap:floorTileTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      floorD:new THREE.MeshStandardMaterial({color:"#8A7858",roughness:.5,metalness:.08,normalMap:floorTileTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      ceil:new THREE.MeshStandardMaterial({color:"#F0EAE0",roughness:.92}),
      trim:new THREE.MeshStandardMaterial({color:"#D0C4B0",roughness:.5,metalness:.12,envMapIntensity:.6}),
      gold:new THREE.MeshPhysicalMaterial({color:"#C8A858",roughness:.18,metalness:.85,clearcoat:.3,clearcoatRoughness:.1,envMapIntensity:1.3}),
      wain:new THREE.MeshStandardMaterial({color:"#C8BCA8",roughness:.6,normalMap:wallStoneTex.normalMap,normalScale:new THREE.Vector2(.2,.2)}),
      wainP:new THREE.MeshStandardMaterial({color:"#BEB4A0",roughness:.65,normalMap:wallStoneTex.normalMap,normalScale:new THREE.Vector2(.15,.15)}),
      dkW:new THREE.MeshStandardMaterial({color:"#4A3828",roughness:.5,map:woodTex.map,normalMap:woodTex.normalMap,normalScale:new THREE.Vector2(.4,.4)}),
      door:new THREE.MeshStandardMaterial({color:"#5A3E28",roughness:.4,metalness:.06,map:woodTex.map,normalMap:woodTex.normalMap,normalScale:new THREE.Vector2(.5,.5),roughnessMap:woodTex.roughnessMap,aoMap:woodTex.aoMap,aoMapIntensity:.6}),
      doorD:new THREE.MeshStandardMaterial({color:"#3A2818",roughness:.45,map:woodTex.map,normalMap:woodTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      handle:new THREE.MeshPhysicalMaterial({color:"#C8A858",roughness:.15,metalness:.85,clearcoat:.4,clearcoatRoughness:.08,envMapIntensity:1.5}),
      bronze:new THREE.MeshPhysicalMaterial({color:"#8A7050",roughness:.25,metalness:.7,clearcoat:.2,clearcoatRoughness:.3,envMapIntensity:1.0}),
      marble:new THREE.MeshPhysicalMaterial({color:"#E8E2DA",roughness:.12,metalness:.06,map:marbleTex.map,normalMap:marbleTex.normalMap,normalScale:new THREE.Vector2(.4,.4),roughnessMap:marbleTex.roughnessMap,aoMap:marbleTex.aoMap,aoMapIntensity:.8,clearcoat:.3,clearcoatRoughness:.15,reflectivity:.6,envMapIntensity:.8}),
      shared:new THREE.MeshStandardMaterial({color:"#4A6741",roughness:.4,emissive:"#4A6741",emissiveIntensity:.3}),
      rug:new THREE.MeshStandardMaterial({color:C.rugC,roughness:.9,map:rugFabricTex.map,normalMap:rugFabricTex.normalMap,normalScale:new THREE.Vector2(.3,.3),roughnessMap:rugFabricTex.roughnessMap,aoMap:rugFabricTex.aoMap,aoMapIntensity:.5}),
      rugB:new THREE.MeshStandardMaterial({color:C.rugB,roughness:.8}),
      sconce:new THREE.MeshStandardMaterial({color:"#C8A858",roughness:.25,metalness:.55,envMapIntensity:.8}),
      glassG:new THREE.MeshStandardMaterial({color:"#FFF8E0",emissive:"#FFE8B0",emissiveIntensity:.6,transparent:true,opacity:.6}),
      curtain:new THREE.MeshPhysicalMaterial({color:C.accent,roughness:.92,side:THREE.DoubleSide,sheen:.3,sheenRoughness:.8,sheenColor:new THREE.Color(C.accent).offsetHSL(0,0,.2),map:velvetTex.map,normalMap:velvetTex.normalMap,normalScale:new THREE.Vector2(.25,.25)}),
      velvet:new THREE.MeshPhysicalMaterial({color:C.accent,roughness:.92,sheen:.4,sheenRoughness:.7,sheenColor:new THREE.Color(C.accent).offsetHSL(0,-.1,.15),map:velvetTex.map,normalMap:velvetTex.normalMap,normalScale:new THREE.Vector2(.3,.3),roughnessMap:velvetTex.roughnessMap}),
      statue:new THREE.MeshStandardMaterial({color:"#E0D8CC",roughness:.22,metalness:.08,envMapIntensity:.7}),
      fG:new THREE.MeshPhysicalMaterial({color:"#B89850",roughness:.2,metalness:.85,clearcoat:.3,clearcoatRoughness:.1,envMapIntensity:1.3}),
      windowFrame:new THREE.MeshStandardMaterial({color:"#D0C4B0",roughness:.4,metalness:.15,envMapIntensity:.6}),
      windowGlass:new THREE.MeshPhysicalMaterial({color:"#C8E0F0",transparent:true,opacity:.1,side:THREE.DoubleSide,transmission:.6,ior:1.5,roughness:.02,thickness:.3}),
      windowGlow:new THREE.MeshBasicMaterial({color:"#FFF8E0",transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),
      bench:new THREE.MeshStandardMaterial({color:"#6A5240",roughness:.6,metalness:.04,normalMap:woodTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      benchCushion:new THREE.MeshPhysicalMaterial({color:C.accent,roughness:.92,sheen:.3,sheenRoughness:.8,sheenColor:new THREE.Color(C.accent).offsetHSL(0,0,.15),map:velvetTex.map,normalMap:velvetTex.normalMap,normalScale:new THREE.Vector2(.2,.2)}),
      portalArch:new THREE.MeshPhysicalMaterial({color:"#D4AF37",roughness:.15,metalness:.9,emissive:"#D4AF37",emissiveIntensity:.2,clearcoat:.3,clearcoatRoughness:.1,envMapIntensity:1.5}),
      portalPillar:new THREE.MeshPhysicalMaterial({color:"#E8E0D4",roughness:.12,metalness:.04,clearcoat:.2,clearcoatRoughness:.2,envMapIntensity:.7}),
      portalKeystone:new THREE.MeshPhysicalMaterial({color:"#C8A858",roughness:.15,metalness:.85,emissive:"#C8A858",emissiveIntensity:.25,clearcoat:.3,clearcoatRoughness:.1,envMapIntensity:1.3}),
      portalGoldTrim:new THREE.MeshPhysicalMaterial({color:"#FFD700",roughness:.1,metalness:.95,emissive:"#FFD700",emissiveIntensity:.1,clearcoat:.4,clearcoatRoughness:.05,envMapIntensity:1.8}),
      frescoBase:new THREE.MeshStandardMaterial({color:wing.wall,roughness:.9}),
      terracotta:new THREE.MeshStandardMaterial({color:"#C4704A",roughness:.8,metalness:.02}),
      foliage:new THREE.MeshStandardMaterial({color:"#3A6828",roughness:.85}),
      foliageDark:new THREE.MeshStandardMaterial({color:"#2A5020",roughness:.85}),
      pedestal:new THREE.MeshStandardMaterial({color:"#D8D0C4",roughness:.3,metalness:.05,normalMap:marbleTex.normalMap,normalScale:new THREE.Vector2(.2,.2),envMapIntensity:.6}),
      floorGoldStrip:new THREE.MeshPhysicalMaterial({color:"#C8A858",roughness:.2,metalness:.8,clearcoat:.3,clearcoatRoughness:.1,envMapIntensity:1.2}),
      portalFog:new THREE.MeshBasicMaterial({color:"#FFF8E0",transparent:true,opacity:.08,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),
    };

    // ═══ TUSCAN LANDSCAPE CANVAS TEXTURE (shared by all windows) — photorealistic ═══
    const tuscanCanvas=document.createElement("canvas");tuscanCanvas.width=1024;tuscanCanvas.height=768;
    const tc=tuscanCanvas.getContext("2d")!;
    const TW=1024,TH=768;

    // ── Seeded pseudo-random for deterministic texture noise ──
    let _seed=42;const srand=()=>{_seed=(_seed*16807+0)%2147483647;return(_seed-1)/2147483646;};

    // ── Helper: soft ellipse blob (used for clouds, foliage, etc.) ──
    const softBlob=(x:number,y:number,rx:number,ry:number,color:string,alpha:number,rot=0)=>{
      tc.save();tc.globalAlpha=alpha;tc.translate(x,y);tc.rotate(rot);
      const g=tc.createRadialGradient(0,0,0,0,0,1);
      g.addColorStop(0,color);g.addColorStop(0.6,color);g.addColorStop(1,"rgba(0,0,0,0)");
      tc.fillStyle=g;tc.scale(rx,ry);tc.beginPath();tc.arc(0,0,1,0,Math.PI*2);tc.fill();
      tc.restore();tc.globalAlpha=1;
    };

    // ── Helper: lerp color components ──
    const lerpC=(a:number,b:number,t:number)=>Math.round(a+(b-a)*t);
    const rgbStr=(r:number,g:number,b:number)=>`rgb(${r},${g},${b})`;
    const rgbaStr=(r:number,g:number,b:number,a:number)=>`rgba(${r},${g},${b},${a})`;

    // ══════════════════════════════════════════════════════════════════
    // LAYER 0: SKY — multi-stop vertical gradient with warm golden hour tones
    // ══════════════════════════════════════════════════════════════════
    const skyGrad=tc.createLinearGradient(0,0,0,TH*0.52);
    skyGrad.addColorStop(0.00,"#1B4F8A");  // deep blue zenith
    skyGrad.addColorStop(0.10,"#2968A8");
    skyGrad.addColorStop(0.25,"#4A8BC8");
    skyGrad.addColorStop(0.40,"#7AAED4");
    skyGrad.addColorStop(0.55,"#AECADE");
    skyGrad.addColorStop(0.70,"#D4CCBC");
    skyGrad.addColorStop(0.82,"#E8C8A0");
    skyGrad.addColorStop(0.92,"#F0C888");
    skyGrad.addColorStop(1.00,"#F4D09A");
    tc.fillStyle=skyGrad;tc.fillRect(0,0,TW,TH*0.52);

    // ── Sky color noise/grain to prevent banding ──
    tc.globalAlpha=0.018;
    for(let i=0;i<4000;i++){
      const nx=srand()*TW,ny=srand()*TH*0.52;
      tc.fillStyle=srand()>0.5?"#FFFFFF":"#000000";
      tc.fillRect(nx,ny,2,2);
    }
    tc.globalAlpha=1;

    // ── Warm atmospheric glow near horizon (right side where sun is) ──
    const atmGlow=tc.createRadialGradient(780,TH*0.42,0,780,TH*0.42,500);
    atmGlow.addColorStop(0,"rgba(255,220,160,0.18)");
    atmGlow.addColorStop(0.3,"rgba(255,210,140,0.10)");
    atmGlow.addColorStop(0.6,"rgba(255,200,120,0.04)");
    atmGlow.addColorStop(1,"rgba(255,200,120,0)");
    tc.fillStyle=atmGlow;tc.fillRect(0,0,TW,TH*0.52);

    // ══════════════════════════════════════════════════════════════════
    // LAYER 1: SUN — multi-layered radial glow with corona and lens artifacts
    // ══════════════════════════════════════════════════════════════════
    const sunX=760,sunY=165;

    // Outermost warm atmospheric halo
    const sunHalo=tc.createRadialGradient(sunX,sunY,0,sunX,sunY,320);
    sunHalo.addColorStop(0,"rgba(255,240,200,0.25)");
    sunHalo.addColorStop(0.15,"rgba(255,230,170,0.15)");
    sunHalo.addColorStop(0.4,"rgba(255,220,150,0.06)");
    sunHalo.addColorStop(0.7,"rgba(255,210,130,0.02)");
    sunHalo.addColorStop(1,"rgba(255,200,120,0)");
    tc.fillStyle=sunHalo;tc.beginPath();tc.arc(sunX,sunY,320,0,Math.PI*2);tc.fill();

    // Secondary glow ring
    const sunG2=tc.createRadialGradient(sunX,sunY,0,sunX,sunY,180);
    sunG2.addColorStop(0,"rgba(255,255,240,0.95)");
    sunG2.addColorStop(0.04,"rgba(255,252,230,0.90)");
    sunG2.addColorStop(0.12,"rgba(255,240,180,0.65)");
    sunG2.addColorStop(0.3,"rgba(255,225,130,0.30)");
    sunG2.addColorStop(0.55,"rgba(255,215,120,0.10)");
    sunG2.addColorStop(0.8,"rgba(255,210,100,0.03)");
    sunG2.addColorStop(1,"rgba(255,200,80,0)");
    tc.fillStyle=sunG2;tc.beginPath();tc.arc(sunX,sunY,180,0,Math.PI*2);tc.fill();

    // Bright white core
    const sunCore=tc.createRadialGradient(sunX,sunY,0,sunX,sunY,22);
    sunCore.addColorStop(0,"rgba(255,255,252,1)");
    sunCore.addColorStop(0.5,"rgba(255,255,240,0.95)");
    sunCore.addColorStop(1,"rgba(255,245,200,0)");
    tc.fillStyle=sunCore;tc.beginPath();tc.arc(sunX,sunY,22,0,Math.PI*2);tc.fill();

    // Subtle lens flare streaks (horizontal light smear)
    tc.globalAlpha=0.06;
    const flareGrad=tc.createLinearGradient(sunX-400,sunY,sunX+400,sunY);
    flareGrad.addColorStop(0,"rgba(255,220,150,0)");
    flareGrad.addColorStop(0.3,"rgba(255,230,180,1)");
    flareGrad.addColorStop(0.5,"rgba(255,255,240,1)");
    flareGrad.addColorStop(0.7,"rgba(255,230,180,1)");
    flareGrad.addColorStop(1,"rgba(255,220,150,0)");
    tc.fillStyle=flareGrad;tc.fillRect(sunX-400,sunY-3,800,6);
    tc.globalAlpha=0.03;
    tc.fillRect(sunX-300,sunY-1,600,2);
    tc.globalAlpha=1;

    // Small lens flare circles (opposite side of sun from center)
    const flarePts=[[sunX-180,sunY+60,12],[sunX-280,sunY+90,8],[sunX-360,sunY+110,18],[sunX-420,sunY+130,6]];
    for(const [fx,fy,fr] of flarePts){
      tc.globalAlpha=0.035;
      const fg=tc.createRadialGradient(fx,fy,0,fx,fy,fr);
      fg.addColorStop(0,"rgba(255,240,200,0.6)");fg.addColorStop(0.5,"rgba(200,220,255,0.3)");fg.addColorStop(1,"rgba(200,220,255,0)");
      tc.fillStyle=fg;tc.beginPath();tc.arc(fx,fy,fr,0,Math.PI*2);tc.fill();
    }
    tc.globalAlpha=1;

    // ══════════════════════════════════════════════════════════════════
    // LAYER 2: CLOUDS — volumetric layered ellipses with warm/cool shading
    // ══════════════════════════════════════════════════════════════════
    const drawCloud=(cx:number,cy:number,scaleX:number,scaleY:number,puffs:number,brightness:number)=>{
      // Shadow pass first (offset below)
      for(let i=0;i<puffs;i++){
        const t=i/puffs;
        const ox=(t-0.5)*scaleX*2.2+Math.sin(i*2.1)*scaleX*0.25;
        const oy=Math.cos(i*1.7)*scaleY*0.4+scaleY*0.3;
        const rx=scaleX*(0.45+Math.sin(i*0.8+1)*0.35);
        const ry=scaleY*(0.35+Math.cos(i*1.2)*0.25);
        softBlob(cx+ox,cy+oy+4,rx,ry,"rgba(140,130,120,1)",0.04+srand()*0.02,i*0.08);
      }
      // Main body — bright lit top
      for(let i=0;i<puffs;i++){
        const t=i/puffs;
        const ox=(t-0.5)*scaleX*2.2+Math.sin(i*2.1)*scaleX*0.25;
        const oy=Math.cos(i*1.7)*scaleY*0.4;
        const rx=scaleX*(0.45+Math.sin(i*0.8+1)*0.35);
        const ry=scaleY*(0.35+Math.cos(i*1.2)*0.25);
        // Warm sunlit white at top
        const lum=lerpC(240,255,brightness);
        const warmR=lum,warmG=lerpC(lum-12,lum-4,brightness),warmB=lerpC(lum-20,lum-8,brightness);
        softBlob(cx+ox,cy+oy-2,rx*0.95,ry*0.8,rgbStr(warmR,warmG,warmB),0.12+brightness*0.08,i*0.08);
        // Brighter inner puff
        softBlob(cx+ox,cy+oy-4,rx*0.6,ry*0.5,rgbStr(Math.min(255,warmR+10),warmG,warmB),0.08+brightness*0.06,i*0.08);
      }
      // Highlight pass — thin bright tops
      for(let i=0;i<Math.floor(puffs*0.6);i++){
        const t=i/puffs;
        const ox=(t-0.5)*scaleX*2.2+Math.sin(i*2.1)*scaleX*0.25;
        const oy=Math.cos(i*1.7)*scaleY*0.4-scaleY*0.25;
        softBlob(cx+ox,cy+oy,scaleX*0.3,scaleY*0.15,"#FFFEF8",0.06+brightness*0.04,i*0.1);
      }
    };

    drawCloud(120,58,65,16,8,0.7);
    drawCloud(310,42,90,18,10,0.8);
    drawCloud(520,72,100,22,12,0.9);
    drawCloud(160,125,50,12,6,0.6);
    drawCloud(640,48,80,17,9,0.85);
    drawCloud(850,95,70,15,8,0.75);
    drawCloud(440,140,55,13,7,0.65);
    drawCloud(950,55,45,11,5,0.7);
    // Tiny wisps near sun
    drawCloud(700,130,30,7,4,0.95);
    drawCloud(820,145,25,6,3,0.9);

    // ══════════════════════════════════════════════════════════════════
    // LAYER 3: DISTANT MOUNTAINS — layered with aerial perspective (purple-blue haze)
    // ══════════════════════════════════════════════════════════════════
    const mtnY=TH*0.44;

    // Helper: draw mountain range with gradient fill and soft top edge
    const drawMtnRange=(baseY:number,amplitude:number,freqs:number[][],
      colorTop:string,colorBot:string,haze:number)=>{
      // Build path
      const pts:number[]=[];
      for(let x=0;x<=TW;x+=2){
        let y=baseY;
        for(const [freq,amp,phase] of freqs) y-=Math.sin(x*freq+phase)*amp;
        pts.push(y);
      }
      // Gradient fill
      const mg=tc.createLinearGradient(0,baseY-amplitude*1.5,0,baseY+60);
      mg.addColorStop(0,colorTop);mg.addColorStop(1,colorBot);
      tc.fillStyle=mg;
      tc.beginPath();tc.moveTo(0,baseY+60);
      for(let i=0;i<pts.length;i++) tc.lineTo(i*2,pts[i]);
      tc.lineTo(TW,baseY+60);tc.closePath();tc.fill();
      // Aerial perspective haze overlay
      if(haze>0){
        tc.fillStyle=rgbaStr(200,195,210,haze);
        tc.beginPath();tc.moveTo(0,baseY+60);
        for(let i=0;i<pts.length;i++) tc.lineTo(i*2,pts[i]);
        tc.lineTo(TW,baseY+60);tc.closePath();tc.fill();
      }
    };

    // Range 1 — most distant, very hazy pale purple
    drawMtnRange(mtnY,35,[[0.003,18,0],[0.007,14,1.2],[0.0015,10,0.5],[0.012,6,2.5]],
      "#8A8CA8","#A0A0BC",0.25);

    // Range 2 — mid-distance, blue-grey
    drawMtnRange(mtnY+12,45,[[0.004,22,0.8],[0.009,16,2],[0.002,12,0.3],[0.016,5,1.5]],
      "#6E7890","#8890A4",0.15);

    // Range 3 — closer, more saturated
    drawMtnRange(mtnY+28,38,[[0.005,20,1.5],[0.011,12,0.7],[0.003,14,2.8],[0.02,4,1]],
      "#586878","#748898",0.08);

    // Mountain snow caps on tallest peaks (range 2)
    tc.globalAlpha=0.12;
    for(let x=0;x<=TW;x+=2){
      const y=mtnY+12-22*Math.sin(x*0.004+0.8)-16*Math.sin(x*0.009+2)-12*Math.sin(x*0.002+0.3)-5*Math.sin(x*0.016+1.5);
      if(y<mtnY-15){
        tc.fillStyle="#E0E4EC";
        tc.fillRect(x,y,3,Math.min(4,(mtnY-15-y)*0.5));
      }
    }
    tc.globalAlpha=1;

    // ══════════════════════════════════════════════════════════════════
    // LAYER 4: ROLLING HILLS — multiple overlapping layers with gradient shading
    // ══════════════════════════════════════════════════════════════════
    const hillBase=TH*0.48;

    // Helper: draw a hill layer with sun-facing highlight and shadow
    const drawHillLayer=(baseY:number,freqs:number[][],
      lightColor:string,shadowColor:string,bottomY:number)=>{
      const pts:number[]=[];
      for(let x=0;x<=TW;x+=2){
        let y=baseY;
        for(const [freq,amp,phase] of freqs) y-=Math.sin(x*freq+phase)*amp;
        pts.push(y);
      }
      // Main fill with left-to-right gradient (sun is right)
      const hg=tc.createLinearGradient(0,0,TW,0);
      hg.addColorStop(0,shadowColor);
      hg.addColorStop(0.55,lightColor);
      hg.addColorStop(0.8,lightColor);
      hg.addColorStop(1,shadowColor);
      tc.fillStyle=hg;
      tc.beginPath();tc.moveTo(0,bottomY);
      for(let i=0;i<pts.length;i++) tc.lineTo(i*2,pts[i]);
      tc.lineTo(TW,bottomY);tc.closePath();tc.fill();

      // Slope-based shading — darker where slope faces away from sun (right)
      for(let i=1;i<pts.length-1;i++){
        const slope=(pts[i+1]-pts[i-1])/4; // positive = descending right
        if(slope<-1.2){ // left-facing slope (lit by sun from right)
          tc.fillStyle=rgbaStr(255,240,180,Math.min(0.08,Math.abs(slope)*0.02));
          tc.fillRect(i*2,pts[i],3,bottomY-pts[i]);
        }else if(slope>1.2){ // right-facing slope (shadow)
          tc.fillStyle=rgbaStr(30,40,20,Math.min(0.1,slope*0.025));
          tc.fillRect(i*2,pts[i],3,bottomY-pts[i]);
        }
      }
    };

    // Hill 1 — most distant, olive with aerial haze
    drawHillLayer(hillBase,[[0.004,22,0],[0.01,14,0.5],[0.002,10,1.8],[0.018,5,2.2]],
      "#7A8A5A","#627248",hillBase+90);
    // Haze overlay on distant hills
    tc.fillStyle="rgba(200,195,180,0.10)";
    tc.fillRect(0,hillBase-40,TW,130);

    // Hill 2 — mid green, richer
    drawHillLayer(hillBase+35,[[0.005,24,1],[0.012,14,2],[0.003,16,0.5],[0.022,4,3]],
      "#6A8040","#4E6830",hillBase+130);

    // Hill 3 — warmer green-gold
    drawHillLayer(hillBase+70,[[0.006,20,2.5],[0.014,12,1],[0.0035,14,3.2],[0.025,5,0.8]],
      "#8A9A4A","#6A7A38",hillBase+165);

    // Hill 4 — golden-green foreground hills
    const h4Grad=tc.createLinearGradient(0,hillBase+100,0,hillBase+200);
    h4Grad.addColorStop(0,"#9A9840");h4Grad.addColorStop(0.5,"#A8A048");h4Grad.addColorStop(1,"#B8A850");
    tc.fillStyle=h4Grad;
    tc.beginPath();tc.moveTo(0,hillBase+200);
    for(let x=0;x<=TW;x+=2){
      const y=hillBase+100-Math.sin(x*0.007+3.5)*18-Math.sin(x*0.016)*10-Math.cos(x*0.004+1)*12;
      tc.lineTo(x,y);
    }
    tc.lineTo(TW,hillBase+200);tc.closePath();tc.fill();

    // ── Texture detail on hills: grass/scrub dots ──
    for(let i=0;i<2500;i++){
      const gx=srand()*TW;
      const gy=hillBase-20+srand()*200;
      const distFactor=Math.max(0,1-(gy-hillBase)/180); // closer = bigger
      const sz=1+srand()*2*(1-distFactor*0.5);
      const greenVar=lerpC(50,100,srand());
      tc.globalAlpha=0.04+srand()*0.06;
      tc.fillStyle=rgbStr(lerpC(40,80,srand()),greenVar,lerpC(20,40,srand()));
      tc.fillRect(gx,gy,sz,sz);
    }
    tc.globalAlpha=1;

    // ══════════════════════════════════════════════════════════════════
    // LAYER 5: WINDING DIRT ROAD — perspective path from middle-ground to foreground
    // ══════════════════════════════════════════════════════════════════
    tc.save();
    // Road path: starts narrow in distance, widens toward viewer
    const roadPts=[
      {x:420,y:hillBase+50,w:4},{x:400,y:hillBase+80,w:6},{x:370,y:hillBase+110,w:9},
      {x:350,y:hillBase+140,w:12},{x:360,y:hillBase+170,w:16},{x:390,y:hillBase+200,w:22},
      {x:440,y:hillBase+230,w:28},{x:480,y:TH*0.88,w:34},{x:500,y:TH*0.94,w:42},{x:510,y:TH,w:50}
    ];
    // Draw road surface
    for(let seg=0;seg<roadPts.length-1;seg++){
      const a=roadPts[seg],b=roadPts[seg+1];
      const steps=20;
      for(let s=0;s<steps;s++){
        const t=s/steps;
        const cx3=a.x+(b.x-a.x)*t;
        const cy3=a.y+(b.y-a.y)*t;
        const w=a.w+(b.w-a.w)*t;
        // Dusty road color — warm ochre
        const dustVar=srand()*15;
        tc.fillStyle=rgbStr(180+dustVar|0,155+dustVar|0,115+dustVar*0.5|0);
        tc.globalAlpha=0.7+srand()*0.2;
        tc.fillRect(cx3-w/2,cy3,w,Math.max(2,(b.y-a.y)/steps+1));
      }
    }
    // Road edge shadows
    tc.globalAlpha=0.08;
    for(let seg=0;seg<roadPts.length-1;seg++){
      const a=roadPts[seg],b=roadPts[seg+1];
      for(let s=0;s<15;s++){
        const t=s/15;
        const cx3=a.x+(b.x-a.x)*t;
        const cy3=a.y+(b.y-a.y)*t;
        const w=a.w+(b.w-a.w)*t;
        tc.fillStyle="#3A3020";
        tc.fillRect(cx3-w/2-2,cy3,3,(b.y-a.y)/15+1);
        tc.fillRect(cx3+w/2-1,cy3,3,(b.y-a.y)/15+1);
      }
    }
    tc.globalAlpha=1;
    tc.restore();

    // ══════════════════════════════════════════════════════════════════
    // LAYER 6: STONE FARMHOUSE / VILLA in middle distance
    // ══════════════════════════════════════════════════════════════════
    const farmX=580,farmY=hillBase+55;

    // Main building body
    const stoneGrad=tc.createLinearGradient(farmX-20,farmY-28,farmX+22,farmY);
    stoneGrad.addColorStop(0,"#D4C4A8");stoneGrad.addColorStop(0.5,"#C8B898");stoneGrad.addColorStop(1,"#B0A080");
    tc.fillStyle=stoneGrad;tc.fillRect(farmX-20,farmY-28,40,28);

    // Sunlit wall highlight (right side)
    tc.fillStyle="rgba(255,235,190,0.15)";tc.fillRect(farmX+5,farmY-26,14,24);

    // Shadow on left wall
    tc.fillStyle="rgba(60,50,30,0.12)";tc.fillRect(farmX-18,farmY-26,12,24);

    // Terracotta roof
    const roofGrad=tc.createLinearGradient(farmX-22,farmY-38,farmX+24,farmY-28);
    roofGrad.addColorStop(0,"#A06040");roofGrad.addColorStop(0.5,"#C07050");roofGrad.addColorStop(1,"#905838");
    tc.fillStyle=roofGrad;
    tc.beginPath();tc.moveTo(farmX-25,farmY-28);tc.lineTo(farmX,farmY-42);tc.lineTo(farmX+25,farmY-28);tc.closePath();tc.fill();

    // Roof tile texture lines
    tc.strokeStyle="rgba(80,40,25,0.2)";tc.lineWidth=0.5;
    for(let rl=0;rl<4;rl++){
      const rly=farmY-28-(14*rl/4);
      const rxl=farmX-25+25*(rl/4);
      const rxr=farmX+25-25*(rl/4);
      tc.beginPath();tc.moveTo(rxl,rly);tc.lineTo(rxr,rly);tc.stroke();
    }

    // Windows (dark)
    tc.fillStyle="#3A3828";
    tc.fillRect(farmX-12,farmY-22,5,6);tc.fillRect(farmX+6,farmY-22,5,6);
    // Window reflections
    tc.fillStyle="rgba(200,220,255,0.15)";
    tc.fillRect(farmX-11,farmY-21,2,3);tc.fillRect(farmX+7,farmY-21,2,3);

    // Door
    tc.fillStyle="#5A4830";tc.fillRect(farmX-3,farmY-12,6,12);

    // Chimney
    tc.fillStyle="#B8A888";tc.fillRect(farmX+14,farmY-45,5,10);
    tc.fillStyle="#908070";tc.fillRect(farmX+13,farmY-47,7,3);

    // Small attached building (barn/annex)
    tc.fillStyle="#C0B090";tc.fillRect(farmX+22,farmY-18,22,18);
    tc.fillStyle="#985840";
    tc.beginPath();tc.moveTo(farmX+20,farmY-18);tc.lineTo(farmX+33,farmY-28);tc.lineTo(farmX+46,farmY-18);tc.closePath();tc.fill();

    // Building shadow on ground
    tc.fillStyle="rgba(40,50,25,0.12)";
    tc.beginPath();tc.moveTo(farmX-20,farmY);tc.lineTo(farmX-35,farmY+8);tc.lineTo(farmX+10,farmY+8);tc.lineTo(farmX+22,farmY);tc.closePath();tc.fill();

    // Second distant farmhouse
    const f2x=180,f2y=hillBase+30;
    tc.fillStyle="rgba(190,175,150,0.7)";tc.fillRect(f2x-8,f2y-12,16,12);
    tc.fillStyle="rgba(150,90,65,0.6)";
    tc.beginPath();tc.moveTo(f2x-10,f2y-12);tc.lineTo(f2x,f2y-18);tc.lineTo(f2x+10,f2y-12);tc.closePath();tc.fill();

    // ══════════════════════════════════════════════════════════════════
    // LAYER 7: CYPRESS TREES — detailed silhouettes with texture and highlights
    // ══════════════════════════════════════════════════════════════════
    const drawCypress=(cx2:number,baseY:number,h2:number,w2:number,detail:number)=>{
      // Shadow on ground
      tc.fillStyle="rgba(20,30,10,0.08)";
      tc.beginPath();tc.ellipse(cx2+h2*0.15,baseY+2,h2*0.3,3,0,0,Math.PI*2);tc.fill();

      // Trunk
      const trunkGrad=tc.createLinearGradient(cx2-2,baseY,cx2+2,baseY);
      trunkGrad.addColorStop(0,"#3A2A18");trunkGrad.addColorStop(0.5,"#5A4030");trunkGrad.addColorStop(1,"#2A1A10");
      tc.fillStyle=trunkGrad;
      tc.fillRect(cx2-1.5,baseY-h2*0.15,3,h2*0.18);

      // Main canopy — dark base
      tc.fillStyle="#10200A";
      tc.beginPath();tc.moveTo(cx2-w2*0.45,baseY-h2*0.10);
      tc.bezierCurveTo(cx2-w2*0.55,baseY-h2*0.4,cx2-w2*0.25,baseY-h2*0.8,cx2,baseY-h2);
      tc.bezierCurveTo(cx2+w2*0.25,baseY-h2*0.8,cx2+w2*0.55,baseY-h2*0.4,cx2+w2*0.45,baseY-h2*0.10);
      tc.closePath();tc.fill();

      // Foliage texture — clusters of tiny dark/light dots along the canopy
      if(detail>0){
        for(let j=0;j<detail*15;j++){
          const t2=srand();
          const py=baseY-h2*0.12-t2*(h2*0.85);
          const maxW2=w2*0.5*(1-Math.pow(t2-0.3,2)*1.5);
          const px=cx2+(srand()-0.5)*maxW2*1.6;
          const sz2=1+srand()*(2-t2);
          // Variation between dark interior and lighter outer foliage
          if(srand()>0.6){
            tc.fillStyle=rgbaStr(25+srand()*20|0,50+srand()*30|0,10+srand()*15|0,0.5+srand()*0.3);
          }else{
            tc.fillStyle=rgbaStr(8+srand()*10|0,20+srand()*15|0,5,0.4+srand()*0.3);
          }
          tc.fillRect(px,py,sz2,sz2);
        }
        // Sun-facing highlight (right edge)
        tc.globalAlpha=0.12;
        tc.fillStyle="#4A6A28";
        tc.beginPath();tc.moveTo(cx2+w2*0.15,baseY-h2*0.12);
        tc.bezierCurveTo(cx2+w2*0.2,baseY-h2*0.45,cx2+w2*0.1,baseY-h2*0.75,cx2+1,baseY-h2*0.95);
        tc.bezierCurveTo(cx2+w2*0.35,baseY-h2*0.6,cx2+w2*0.42,baseY-h2*0.3,cx2+w2*0.35,baseY-h2*0.12);
        tc.closePath();tc.fill();
        tc.globalAlpha=1;
      }
    };

    // Cypress placement — groups along hills at varying distances
    // Far distance (small, less detail)
    drawCypress(65,hillBase+5,38,7,0.4);drawCypress(82,hillBase+3,32,6,0.3);
    drawCypress(340,hillBase+8,36,6,0.4);drawCypress(355,hillBase+6,28,5,0.3);
    drawCypress(750,hillBase+10,40,7,0.4);drawCypress(770,hillBase+12,30,5,0.3);

    // Mid distance (medium detail)
    drawCypress(155,hillBase+30,52,9,0.7);drawCypress(175,hillBase+28,44,8,0.6);
    drawCypress(290,hillBase+42,56,10,0.7);drawCypress(310,hillBase+40,42,8,0.6);drawCypress(325,hillBase+44,35,7,0.5);
    drawCypress(480,hillBase+35,50,9,0.7);
    drawCypress(620,hillBase+48,54,10,0.7);drawCypress(642,hillBase+46,42,8,0.6);
    drawCypress(820,hillBase+38,48,9,0.7);drawCypress(842,hillBase+42,38,7,0.5);
    drawCypress(940,hillBase+55,44,8,0.6);

    // Near foreground (large, high detail)
    drawCypress(50,hillBase+95,72,13,1.0);
    drawCypress(960,hillBase+85,68,12,1.0);

    // ── Row of cypresses lining the road (classic Tuscan motif) ──
    drawCypress(430,hillBase+65,45,8,0.65);drawCypress(425,hillBase+80,50,9,0.7);
    drawCypress(415,hillBase+100,55,10,0.75);drawCypress(400,hillBase+120,58,10,0.8);

    // ══════════════════════════════════════════════════════════════════
    // LAYER 8: FOREGROUND WHEAT FIELDS — golden, detailed
    // ══════════════════════════════════════════════════════════════════
    const fgTop=TH*0.78;

    // Base wheat field with warm gradient
    const fgGrad=tc.createLinearGradient(0,fgTop-10,0,TH);
    fgGrad.addColorStop(0,"#C8A848");fgGrad.addColorStop(0.2,"#D4B050");
    fgGrad.addColorStop(0.5,"#C09838");fgGrad.addColorStop(0.8,"#A88030");
    fgGrad.addColorStop(1,"#907028");
    tc.fillStyle=fgGrad;
    tc.beginPath();tc.moveTo(0,fgTop);
    for(let x=0;x<=TW;x+=2){
      const y=fgTop-Math.sin(x*0.006)*10-Math.sin(x*0.018)*5-Math.cos(x*0.003)*4;
      tc.lineTo(x,y);
    }
    tc.lineTo(TW,TH);tc.lineTo(0,TH);tc.fill();

    // Sunlit highlight on wheat (right side where sun hits)
    const wheatSun=tc.createLinearGradient(TW*0.4,0,TW,0);
    wheatSun.addColorStop(0,"rgba(255,230,150,0)");
    wheatSun.addColorStop(0.5,"rgba(255,230,150,0.08)");
    wheatSun.addColorStop(1,"rgba(255,220,130,0.12)");
    tc.fillStyle=wheatSun;tc.fillRect(0,fgTop-10,TW,TH-fgTop+10);

    // Green field patches (vineyards/olive groves)
    const fieldPatches=[
      {x:120,y:fgTop+20,rx:100,ry:28,color:"rgba(86,118,48,0.30)"},
      {x:580,y:fgTop+15,rx:120,ry:25,color:"rgba(96,128,48,0.25)"},
      {x:880,y:fgTop+30,rx:90,ry:22,color:"rgba(76,108,42,0.28)"},
    ];
    for(const fp of fieldPatches){
      tc.fillStyle=fp.color;
      tc.beginPath();tc.ellipse(fp.x,fp.y,fp.rx,fp.ry,0.05,0,Math.PI*2);tc.fill();
      // Row texture within field
      tc.strokeStyle="rgba(50,80,30,0.08)";tc.lineWidth=1;
      for(let row=-fp.ry;row<fp.ry;row+=4){
        tc.beginPath();
        tc.moveTo(fp.x-fp.rx,fp.y+row);
        for(let sx=fp.x-fp.rx;sx<fp.x+fp.rx;sx+=8){
          tc.lineTo(sx,fp.y+row+Math.sin(sx*0.1)*1.5);
        }
        tc.stroke();
      }
    }

    // Plowed field lines
    tc.strokeStyle="rgba(140,110,50,0.08)";tc.lineWidth=1;
    for(let ly=fgTop+6;ly<TH;ly+=4){
      tc.beginPath();tc.moveTo(0,ly+Math.sin(ly*0.25)*2);
      for(let x=0;x<=TW;x+=12) tc.lineTo(x,ly+Math.sin((x+ly)*0.035)*2.5+Math.sin(x*0.08)*0.8);
      tc.stroke();
    }

    // Individual wheat stalks in near foreground
    for(let i=0;i<800;i++){
      const wx=srand()*TW;
      const wy=TH*0.88+srand()*(TH*0.12);
      const wh=6+srand()*14;
      const sway=Math.sin(wx*0.02+i*0.3)*3;
      const goldR=190+srand()*50|0;
      const goldG=150+srand()*40|0;
      const goldB=50+srand()*30|0;
      tc.strokeStyle=rgbaStr(goldR,goldG,goldB,0.15+srand()*0.15);
      tc.lineWidth=0.5+srand()*0.8;
      tc.beginPath();tc.moveTo(wx,wy);tc.quadraticCurveTo(wx+sway*0.5,wy-wh*0.6,wx+sway,wy-wh);tc.stroke();
      // Wheat head
      if(srand()>0.3){
        tc.fillStyle=rgbaStr(goldR+20|0,goldG+10|0,goldB,0.2+srand()*0.15);
        tc.beginPath();tc.ellipse(wx+sway,wy-wh-1.5,1.2+srand(),2.5+srand()*2,sway*0.05,0,Math.PI*2);tc.fill();
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // LAYER 9: VILLAGE CLUSTERS on distant hills
    // ══════════════════════════════════════════════════════════════════
    const drawVillage=(vx2:number,vy2:number,count:number,scale:number)=>{
      for(let i=0;i<count;i++){
        const bx=vx2+i*scale*4+(srand()-0.5)*scale*2;
        const by=vy2-(srand()*scale*3);
        const bw=scale*2+srand()*scale*2;
        const bh=scale*3+srand()*scale*3;
        // Building wall
        const warmth=srand();
        tc.fillStyle=rgbaStr(
          lerpC(180,210,warmth),lerpC(160,185,warmth),lerpC(130,155,warmth),0.55+srand()*0.2
        );
        tc.fillRect(bx,by-bh,bw,bh);
        // Roof
        tc.fillStyle=rgbaStr(lerpC(140,170,srand()),lerpC(70,95,srand()),lerpC(50,70,srand()),0.6);
        tc.beginPath();tc.moveTo(bx-1,by-bh);tc.lineTo(bx+bw/2,by-bh-scale*2);tc.lineTo(bx+bw+1,by-bh);tc.closePath();tc.fill();
      }
    };

    drawVillage(300,hillBase-2,5,2.2);
    drawVillage(680,hillBase+15,4,1.8);
    drawVillage(870,hillBase+25,3,1.5);

    // Church tower in main village
    tc.fillStyle="rgba(175,160,135,0.65)";tc.fillRect(312,hillBase-22,4,18);
    tc.fillStyle="rgba(140,85,60,0.5)";
    tc.beginPath();tc.moveTo(310,hillBase-22);tc.lineTo(314,hillBase-28);tc.lineTo(318,hillBase-22);tc.closePath();tc.fill();

    // ══════════════════════════════════════════════════════════════════
    // LAYER 10: SCATTERED TREES (non-cypress) — olive, oak clusters
    // ══════════════════════════════════════════════════════════════════
    const drawRoundTree=(tx:number,ty:number,r:number,darkness:number)=>{
      // Shadow
      tc.fillStyle=rgbaStr(20,30,10,0.06);
      tc.beginPath();tc.ellipse(tx+r*0.5,ty+2,r*1.2,r*0.3,0,0,Math.PI*2);tc.fill();
      // Canopy — dark base
      softBlob(tx,ty-r*0.5,r*1.1,r*0.9,rgbStr(30+darkness*20|0,55+darkness*15|0,18+darkness*8|0),0.6);
      // Lighter top (sunlit)
      softBlob(tx+r*0.15,ty-r*0.7,r*0.7,r*0.55,rgbStr(60+darkness*20|0,90+darkness*15|0,30+darkness*10|0),0.35);
      // Highlight
      softBlob(tx+r*0.25,ty-r*0.8,r*0.35,r*0.3,"#6A9A38",0.1);
    };

    drawRoundTree(520,hillBase+60,10,0.5);
    drawRoundTree(540,hillBase+58,8,0.6);
    drawRoundTree(700,hillBase+80,12,0.4);
    drawRoundTree(130,hillBase+70,9,0.5);
    drawRoundTree(850,hillBase+65,11,0.4);

    // ══════════════════════════════════════════════════════════════════
    // LAYER 11: ATMOSPHERIC EFFECTS — haze, golden light, vignette
    // ══════════════════════════════════════════════════════════════════

    // Warm golden overlay — entire scene
    tc.fillStyle="rgba(240,216,176,0.04)";tc.fillRect(0,0,TW,TH);

    // Aerial perspective haze near horizon — critical for realism
    const horizHaze=tc.createLinearGradient(0,TH*0.30,0,TH*0.55);
    horizHaze.addColorStop(0,"rgba(220,210,195,0)");
    horizHaze.addColorStop(0.3,"rgba(220,210,195,0.10)");
    horizHaze.addColorStop(0.5,"rgba(225,215,195,0.14)");
    horizHaze.addColorStop(0.7,"rgba(220,210,195,0.08)");
    horizHaze.addColorStop(1,"rgba(220,210,195,0)");
    tc.fillStyle=horizHaze;tc.fillRect(0,TH*0.30,TW,TH*0.25);

    // Golden hour light wash from sun direction
    const goldenWash=tc.createRadialGradient(sunX,sunY,100,sunX,sunY,700);
    goldenWash.addColorStop(0,"rgba(255,220,150,0.06)");
    goldenWash.addColorStop(0.4,"rgba(255,210,130,0.03)");
    goldenWash.addColorStop(1,"rgba(255,200,120,0)");
    tc.fillStyle=goldenWash;tc.fillRect(0,0,TW,TH);

    // Subtle warm vignette (darkened edges)
    const vignetteGrad=tc.createRadialGradient(TW*0.55,TH*0.4,TW*0.25,TW*0.5,TH*0.5,TW*0.75);
    vignetteGrad.addColorStop(0,"rgba(0,0,0,0)");
    vignetteGrad.addColorStop(0.7,"rgba(0,0,0,0)");
    vignetteGrad.addColorStop(1,"rgba(30,20,10,0.12)");
    tc.fillStyle=vignetteGrad;tc.fillRect(0,0,TW,TH);

    // Final noise/grain layer — prevents banding, adds photographic quality
    tc.globalAlpha=0.012;
    for(let i=0;i<6000;i++){
      const nx=srand()*TW,ny=srand()*TH;
      tc.fillStyle=srand()>0.5?"#FFFFFF":"#000000";
      tc.fillRect(nx,ny,1.5,1.5);
    }
    tc.globalAlpha=1;

    // Color temperature micro-variation (warm/cool patches)
    for(let i=0;i<15;i++){
      const px2=srand()*TW,py2=srand()*TH;
      const warm2=srand()>0.5;
      softBlob(px2,py2,80+srand()*120,60+srand()*80,
        warm2?"rgba(255,220,160,1)":"rgba(160,180,220,1)",0.008+srand()*0.008);
    }

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
      // Collect door zones for this wall side (used by wainscoting + panels)
      const doorZonesForSide: {center: number, halfW: number}[] = [];
      const occupiedZones: {center: number, halfW: number}[] = [];
      rooms.forEach((_room2: any, ri: number) => {
        const doorSide = ri % 2 === 0 ? -1 : 1;
        const doorZ = -cL/2 + 5.5 + ri * C.sp;
        // Door zone on its side
        if (doorSide === s) {
          doorZonesForSide.push({ center: doorZ, halfW: 1.3 });
          occupiedZones.push({ center: doorZ, halfW: 1.5 });
        }
        // Painting zone (between this door and the next, same side as door)
        if (doorSide === s && ri < rooms.length - 1) {
          occupiedZones.push({ center: doorZ + C.sp / 2, halfW: 1.4 });
        }
        // Window on the opposite side
        if (-doorSide === s) occupiedZones.push({ center: doorZ, halfW: 1.2 });
      });
      // Also add locked niche zones
      const MAX_ROOMS_PER_WING_TMP = 8;
      const inlayCountTmp = MAX_ROOMS_PER_WING_TMP - rooms.length;
      for (let ii = 0; ii < inlayCountTmp; ii++) {
        const inlaySide = (rooms.length + ii) % 2 === 0 ? -1 : 1;
        const inlayZ = -cL / 2 + 5.5 + (rooms.length + ii) * C.sp;
        if (inlayZ > cL / 2 - 3) break;
        if (inlaySide === s) doorZonesForSide.push({ center: inlayZ, halfW: 1.3 });
      }
      // Wainscoting — split into segments that skip door frames
      // Sort door zones by z
      const sortedDoorZones = [...doorZonesForSide].sort((a, b) => a.center - b.center);
      // Build wainscoting segments between door zones
      const wainStart = -cL/2 + 0.2;
      const wainEnd = cL/2 - 0.2;
      const wainSegments: {start: number, end: number}[] = [];
      let segStart = wainStart;
      for (const dz of sortedDoorZones) {
        const doorLeft = dz.center - dz.halfW;
        const doorRight = dz.center + dz.halfW;
        if (doorLeft > segStart + 0.2) {
          wainSegments.push({ start: segStart, end: doorLeft });
        }
        segStart = doorRight;
      }
      if (wainEnd > segStart + 0.2) {
        wainSegments.push({ start: segStart, end: wainEnd });
      }
      // Render each wainscoting segment
      for (const seg of wainSegments) {
        const segLen = seg.end - seg.start;
        const segCenter = (seg.start + seg.end) / 2;
        scene.add(mk(new THREE.BoxGeometry(.05,1.4,segLen),MS.wain,s*(cW/2-.025),.7,segCenter));
        scene.add(mk(new THREE.BoxGeometry(.06,.07,segLen),MS.gold,s*(cW/2-.03),1.43,segCenter));
        scene.add(mk(new THREE.BoxGeometry(.08,.18,segLen),MS.dkW,s*(cW/2-.04),.09,segCenter));
      }
      // Crown molding at ceiling (continuous, doesn't clip doors)
      scene.add(mk(new THREE.BoxGeometry(.10,.14,cL-.2),MS.gold,s*(cW/2-.05),cH-.07,0));
      scene.add(mk(new THREE.BoxGeometry(.06,.08,cL-.2),MS.trim,s*(cW/2-.03),cH-.18,0));
      // Wall panels between doors (skip zones occupied by doors/paintings)
      const pnl=Math.floor(cL/3);
      for(let p=0;p<pnl;p++){
        const pz = -cL/2 + 1.5 + p * 3;
        const blocked = occupiedZones.some(z => Math.abs(pz - z.center) < z.halfW);
        if (blocked) continue;
        scene.add(mk(new THREE.BoxGeometry(.01,.55,1.4),MS.wainP,s*(cW/2-.01),.7,pz));
        scene.add(mk(new THREE.BoxGeometry(.008,.8,1.2),MS.wainP,s*(cW/2-.008),2.8,pz));
        scene.add(mk(new THREE.BoxGeometry(.006,.02,1.25),MS.gold,s*(cW/2-.006),3.22,pz));
        scene.add(mk(new THREE.BoxGeometry(.006,.02,1.25),MS.gold,s*(cW/2-.006),2.38,pz));
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
      // ── Stone frame — rectangular bottom portion, flush with wall face ──
      // Left jamb
      scene.add(mk(new THREE.BoxGeometry(frameTh,rectH,frameTh),winFrameMat,outerX,winY-archR/2,wz-winW/2-frameTh/2));
      // Right jamb
      scene.add(mk(new THREE.BoxGeometry(frameTh,rectH,frameTh),winFrameMat,outerX,winY-archR/2,wz+winW/2+frameTh/2));
      // Bottom sill — pronounced, projecting inward
      scene.add(mk(new THREE.BoxGeometry(recessD+0.1,0.08,winW+frameTh*2+0.1),winFrameMat,midX,winY-rectH/2-0.04,wz));
      // Sill gold trim
      scene.add(mk(new THREE.BoxGeometry(recessD+0.12,0.025,winW+frameTh*2+0.12),MS.gold,midX,winY-rectH/2-0.005,wz));
      // ── Semicircular arch at top — box segments arranged in arc, flush with wall ──
      const archCenterY=winY+rectH/2; // y where arch springs from
      for(let ai=0;ai<=archSegsW;ai++){
        const ang=(ai/archSegsW)*Math.PI;
        const az=Math.cos(ang)*archR;
        const ay=Math.sin(ang)*archR;
        // Outer arch frame segments — flush with wall surface
        const seg=mk(new THREE.BoxGeometry(frameTh,frameTh,frameTh),winFrameMat,outerX,archCenterY+ay,wz+az);
        scene.add(seg);
      }
      // Keystone at top center of arch — slightly larger
      scene.add(mk(new THREE.BoxGeometry(frameTh+0.02,frameTh*1.5,frameTh+0.04),MS.gold,outerX,archCenterY+archR,wz));
      // ── Mullion cross — thin and elegant ──
      scene.add(mk(new THREE.BoxGeometry(0.03,0.025,winW-0.05),winFrameMat,outerX,winY-rectH*0.15,wz));
      scene.add(mk(new THREE.BoxGeometry(0.03,rectH-0.05,0.025),winFrameMat,outerX,winY-archR/2,wz));
      // ── Glass pane — positioned at the back of the recess (flush with outer wall) ──
      const glass=new THREE.Mesh(new THREE.PlaneGeometry(winW,rectH+archR*0.6),winGlassMat);
      glass.rotation.y=winSide*(-Math.PI/2);glass.position.set(outerX,winY,wz);scene.add(glass);
      // ── TUSCAN LANDSCAPE behind window — flush with outer wall ──
      const landscapeMat=new THREE.MeshBasicMaterial({map:tuscanTex.clone(),side:THREE.DoubleSide});
      const landscape=new THREE.Mesh(new THREE.PlaneGeometry(winW-0.04,rectH+archR*0.5),landscapeMat);
      landscape.rotation.y=winSide*(-Math.PI/2);landscape.position.set(outerX+(winSide*0.01),winY,wz);scene.add(landscape);
      // ── Curtains — thin planes hanging on each side, flush with wall ──
      for(const cSide of[-1,1]){
        const cZ=wz+cSide*(winW/2+0.18);
        const cX=outerX;
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
      rodMesh.rotation.x=Math.PI/2;rodMesh.position.set(outerX,winY+rectH/2+0.1,wz);scene.add(rodMesh);
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

    // ── CANDLE SCONCES — at z_i + sp*0.25 on both walls, skip near paintings/doors ──
    // Collect all painting z-positions per side for sconce overlap check (wider margin for new frames)
    const paintingZBySide: Record<number, number[]> = {[-1]: [], [1]: []};
    for(let i=0;i<rooms.length-1;i++){
      const doorSide=i%2===0?-1:1;
      paintingZBySide[doorSide].push(-cL/2+5.5+i*C.sp+C.sp/2);
    }
    for(let i=0;i<rooms.length;i++){
      const sz=-cL/2+5.5+i*C.sp+C.sp*0.25;
      if(sz>cL/2-3||sz<-cL/2+3)continue;
      for(const s of[-1,1]){
        // Skip if sconce would overlap with a painting on this wall
        const tooClose=paintingZBySide[s].some(pz=>Math.abs(sz-pz)<1.5);
        if(tooClose)continue;
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

    // ── RUNNER RUG (single layer to avoid z-fighting) ──
    scene.add(mk(new THREE.BoxGeometry(2,.012,cL-5),MS.rug,0,.006,0));

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

    // ── SCONCES between door zones — at z_i + sp*0.75, skip near paintings ──
    for(const s of[-1,1])for(let i=0;i<rooms.length;i++){
      const sz=-cL/2+5.5+i*C.sp+C.sp*0.75;if(sz>cL/2-2||sz<-cL/2+2)continue;
      const tooClose=paintingZBySide[s].some(pz=>Math.abs(sz-pz)<1.5);
      if(tooClose)continue;
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

    // ═══ INTERACTIVE PAINTING/MEDIA SLOTS — between doors on same wall ═══
    const paintingClickMeshes: {mesh: THREE.Mesh, slotKey: string}[] = [];
    for(let i=0;i<rooms.length-1;i++){
      const pz=-cL/2+5.5+i*C.sp+C.sp/2;
      if(pz>cL/2-3||pz<-cL/2+3)continue;
      const s=i%2===0?-1:1;
      const fx=s*(cW/2-.005);
      const slotKey=`corridor-${wingId}-painting-${i}`;
      const paintingData=corridorPaintings?.[slotKey];
      const fw=1.3,fh=1.0,frameW=0.07;
      // Gold frame — ornate border
      scene.add(mk(new THREE.BoxGeometry(.03,frameW,fw+frameW*2),MS.gold,fx,2.8+fh/2+frameW/2,pz)); // top
      scene.add(mk(new THREE.BoxGeometry(.03,frameW,fw+frameW*2),MS.gold,fx,2.8-fh/2-frameW/2,pz)); // bottom
      scene.add(mk(new THREE.BoxGeometry(.03,fh,frameW),MS.gold,fx,2.8,pz-fw/2-frameW/2)); // left
      scene.add(mk(new THREE.BoxGeometry(.03,fh,frameW),MS.gold,fx,2.8,pz+fw/2+frameW/2)); // right
      // Inner frame accent
      scene.add(mk(new THREE.BoxGeometry(.025,frameW*.4,fw+frameW),MS.trim,fx-(s*.002),2.8+fh/2+frameW*.15,pz));
      scene.add(mk(new THREE.BoxGeometry(.025,frameW*.4,fw+frameW),MS.trim,fx-(s*.002),2.8-fh/2-frameW*.15,pz));
      // Canvas / painting surface
      if(paintingData?.url){
        // If there's an actual image, load it as texture
        const loader=new THREE.TextureLoader();
        const pUrl=paintingData.url;
        loader.load(pUrl,(tex: THREE.Texture)=>{
          tex.colorSpace=THREE.SRGBColorSpace;
          const canvasMat=new THREE.MeshStandardMaterial({map:tex,roughness:.65});
          const canvasMesh=new THREE.Mesh(new THREE.PlaneGeometry(fw-.04,fh-.04),canvasMat);
          canvasMesh.rotation.y=s*(-Math.PI/2);
          canvasMesh.position.set(fx-(s*.008),2.8,pz);
          scene.add(canvasMesh);
        });
      }else{
        // Empty slot — subtle warm canvas placeholder inviting interaction
        const emptyMat=new THREE.MeshStandardMaterial({color:"#C8BCA0",roughness:.85,emissive:"#C8BCA0",emissiveIntensity:.03});
        const emptyCanvas=mk(new THREE.BoxGeometry(.008,fh-.06,fw-.06),emptyMat,fx-(s*.008),2.8,pz);
        scene.add(emptyCanvas);
        // Small "+" hint in center
        scene.add(mk(new THREE.BoxGeometry(.006,.2,.03),MS.trim,fx-(s*.01),2.8,pz));
        scene.add(mk(new THREE.BoxGeometry(.006,.03,.2),MS.trim,fx-(s*.01),2.8,pz));
      }
      // Small gold ornament at top center of frame
      scene.add(mk(new THREE.BoxGeometry(.035,.06,.15),MS.gold,fx-(s*.003),2.8+fh/2+frameW+.01,pz));
      // Invisible click target for painting interaction
      const paintClick=new THREE.Mesh(
        new THREE.BoxGeometry(.3,fh+frameW*2,fw+frameW*2),
        new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})
      );
      paintClick.position.set(fx,2.8,pz);
      paintClick.userData={isPaintingSlot:true,slotKey};
      scene.add(paintClick);
      paintingClickMeshes.push({mesh:paintClick,slotKey});
    }

    // (Plants at ends are included with the side tables above)

    // ══ DOORS ══
    const dMeshes: any[]=[];
    rooms.forEach((room: any,i: any)=>{
      const side=i%2===0?-1:1;
      const z=-cL/2+5.5+i*C.sp;
      const wx=side*(cW/2);
      const dW=1.7,dH=3.6;
      // Minimal door surround — thin trim only at top
      scene.add(mk(new THREE.BoxGeometry(.04,.12,dW+.2),MS.trim,wx-(side*.02),dH+.1,z));
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

    // ── LOCKED ROOM NICHES — sealed archway alcoves for locked room slots ──
    const MAX_ROOMS_PER_WING = 8;
    const inlayCount = MAX_ROOMS_PER_WING - rooms.length;
    const inlayClickMeshes: THREE.Mesh[] = [];
    if (inlayCount > 0) {
      const dW=1.7,dH=3.6; // match real door dimensions
      const nicheDepth=0.2; // recess depth
      const nicheMat=new THREE.MeshStandardMaterial({color:"#B8AE9C",roughness:.75,normalMap:wallStoneTex.normalMap,normalScale:new THREE.Vector2(.15,.15)});
      const nicheBackMat=new THREE.MeshStandardMaterial({color:"#A09888",roughness:.85});
      for (let ii = 0; ii < inlayCount; ii++) {
        const side = (rooms.length + ii) % 2 === 0 ? -1 : 1;
        const z = -cL / 2 + 5.5 + (rooms.length + ii) * C.sp;
        if (z > cL / 2 - 3) break;
        const wx = side * (cW / 2);
        const nicheX = wx - (side * nicheDepth / 2);
        // Recessed back wall of niche
        scene.add(mk(new THREE.BoxGeometry(nicheDepth, dH - 0.2, dW - 0.1), nicheBackMat, nicheX, (dH - 0.2) / 2, z));
        // Side walls of niche recess
        for (const zSide of [-1, 1]) {
          scene.add(mk(new THREE.BoxGeometry(nicheDepth, dH - 0.1, 0.06), nicheMat, nicheX, (dH - 0.1) / 2, z + zSide * (dW / 2)));
        }
        // Top of niche recess
        scene.add(mk(new THREE.BoxGeometry(nicheDepth, 0.06, dW), nicheMat, nicheX, dH - 0.05, z));
        // Arch outline at top — elegant sealed archway
        const archRadius = dW / 2 - 0.1;
        const archGeo = new THREE.TorusGeometry(archRadius, 0.04, 8, 14, Math.PI);
        const archMesh = new THREE.Mesh(archGeo, MS.trim);
        archMesh.position.set(wx - (side * 0.005), dH - 0.15, z);
        archMesh.rotation.y = side * (-Math.PI / 2);
        scene.add(archMesh);
        // Subtle arch fill — semicircular sealed panel
        const archFillGeo = new THREE.CircleGeometry(archRadius - 0.04, 16, 0, Math.PI);
        const archFillMat = new THREE.MeshStandardMaterial({ color: "#C4B8A4", roughness: 0.7, transparent: true, opacity: 0.6 });
        const archFill = new THREE.Mesh(archFillGeo, archFillMat);
        archFill.position.set(wx - (side * 0.008), dH - 0.15, z);
        archFill.rotation.y = side * (-Math.PI / 2);
        scene.add(archFill);
        // Vertical trim pilasters flanking the niche
        for (const zSide of [-1, 1]) {
          scene.add(mk(new THREE.BoxGeometry(0.06, dH, 0.1), MS.trim, wx - (side * 0.01), dH / 2, z + zSide * (dW / 2 + 0.05)));
        }
        // Lintel above niche
        scene.add(mk(new THREE.BoxGeometry(0.05, 0.1, dW + 0.3), MS.trim, wx - (side * 0.01), dH + 0.05, z));
        // Lock seal — small circular medallion
        const sealMat = styleEra === "renaissance" ? MS.gold : MS.handle;
        const seal = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), sealMat);
        seal.position.set(wx - (side * 0.012), dH * 0.4, z);
        seal.rotation.y = side * (-Math.PI / 2);
        scene.add(seal);
        // Small keyhole on seal
        const keyholeOuter = new THREE.Mesh(new THREE.CircleGeometry(0.04, 10), nicheBackMat);
        keyholeOuter.position.set(wx - (side * 0.015), dH * 0.4 + 0.015, z);
        keyholeOuter.rotation.y = side * (-Math.PI / 2);
        scene.add(keyholeOuter);
        scene.add(mk(new THREE.BoxGeometry(0.005, 0.06, 0.025), nicheBackMat, wx - (side * 0.015), dH * 0.4 - 0.035, z));
        // Click target (same size as real door for consistent UX)
        const inlClick = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, dH, dW),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
        );
        inlClick.position.set(wx, dH / 2, z);
        inlClick.userData = { isInlay: true };
        scene.add(inlClick);
        inlayClickMeshes.push(inlClick);
      }
    }

    // ── ERA-SPECIFIC CORRIDOR MODIFICATIONS ──
    if (styleEra === "renaissance") {
      // ── BARREL VAULT ──
      const vaultGeo = new THREE.CylinderGeometry(cW / 2, cW / 2, cL, 16, 1, true, 0, Math.PI);
      const vaultMat = new THREE.MeshStandardMaterial({
        color: "#F0EAE0", roughness: 0.8, side: THREE.BackSide,
      });
      const vault = new THREE.Mesh(vaultGeo, vaultMat);
      vault.rotation.z = Math.PI / 2;
      vault.rotation.x = Math.PI / 2;
      vault.position.set(0, cH, 0);
      scene.add(vault);

      // ── VAULT RIBS (transverse arched strips) ──
      const ribCount = 7;
      const ribSpacing = cL / (ribCount + 1);
      const ribMat = new THREE.MeshStandardMaterial({ color: "#B8AA90", roughness: 0.5, metalness: 0.15 });
      for (let ri = 1; ri <= ribCount; ri++) {
        const ribZ = -cL / 2 + ri * ribSpacing;
        const ribGeo = new THREE.TorusGeometry(cW / 2 - 0.02, 0.04, 6, 16, Math.PI);
        const rib = new THREE.Mesh(ribGeo, ribMat);
        rib.position.set(0, cH, ribZ);
        rib.rotation.y = Math.PI / 2;
        scene.add(rib);
        // Boss at crown of each rib
        scene.add(mk(new THREE.SphereGeometry(0.06, 8, 8), MS.gold, 0, cH + cW / 2 - 0.04, ribZ));
      }

      // ── FRESCOED LUNETTES above every door ──
      const lunetteColors = ["#2D4A7A", "#A0522D", "#6B7B4E", "#6B1A2A"];
      dMeshes.forEach((d, di) => {
        const lColor = lunetteColors[di % lunetteColors.length];
        const lMat = new THREE.MeshStandardMaterial({ color: lColor, roughness: 0.85 });
        // Semicircular panel
        const lunGeo = new THREE.CircleGeometry(0.7, 16, 0, Math.PI);
        const lun = new THREE.Mesh(lunGeo, lMat);
        lun.position.set(d.x - (d.side * 0.005), 3.8, d.z);
        lun.rotation.y = d.side * (-Math.PI / 2);
        scene.add(lun);
        // Pietra serena border frame
        const borderGeo = new THREE.TorusGeometry(0.7, 0.04, 6, 16, Math.PI);
        const border = new THREE.Mesh(borderGeo, MS.trim);
        border.position.set(d.x - (d.side * 0.003), 3.8, d.z);
        border.rotation.y = d.side * (-Math.PI / 2);
        scene.add(border);
      });

      // ── CANDELABRA WALL SCONCES ──
      const sconceLightCount = Math.min(8, Math.floor(cL / 3));
      const sconceSpacing = cL / (sconceLightCount + 1);
      const candleMat = new THREE.MeshStandardMaterial({ color: "#C8A858", roughness: 0.2, metalness: 0.8 });
      let rLightIdx = 0;
      for (let si = 1; si <= sconceLightCount; si++) {
        const sz = -cL / 2 + si * sconceSpacing;
        const sSide = si % 2 === 0 ? -1 : 1;
        const sx = sSide * (cW / 2 - 0.05);
        // Wall plate
        scene.add(mk(new THREE.BoxGeometry(0.04, 0.15, 0.1), candleMat, sx, 2.8, sz));
        // Main stem
        scene.add(mk(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), candleMat, sx - sSide * 0.12, 2.95, sz));
        // Three branches
        for (let br = -1; br <= 1; br++) {
          const bz = sz + br * 0.12;
          scene.add(mk(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 5), candleMat, sx - sSide * 0.18, 3.15, bz));
          // Candle cup
          scene.add(mk(new THREE.CylinderGeometry(0.025, 0.02, 0.04, 6), candleMat, sx - sSide * 0.18, 3.25, bz));
          // Candle stick
          scene.add(mk(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 5),
            new THREE.MeshStandardMaterial({ color: "#F5F0E0", roughness: 0.9 }),
            sx - sSide * 0.18, 3.32, bz));
        }
        // PointLight (limit to 8 total)
        if (rLightIdx < 8) {
          const sLight = new THREE.PointLight("#FFE0A0", 0.3, 4);
          sLight.position.set(sx - sSide * 0.18, 3.4, sz);
          scene.add(sLight);
          rLightIdx++;
        }
      }

      // ── INTERACTIVE PAINTING FRAMES between doors (renaissance era) ──
      const paintColors = ["#C8A040", "#A0522D", "#6B7B4E", "#8B6B4A", "#7A6840", "#A08060"];
      let paintIdx = 0;
      dMeshes.forEach((d, di) => {
        if (di < dMeshes.length - 1 && dMeshes[di + 1].side === d.side) {
          const pz = (d.z + dMeshes[di + 1].z) / 2;
          const pSide = d.side;
          const px = pSide * (cW / 2 - 0.02);
          const fw = 1.2, fh = 0.8, fb = 0.08;
          const rSlotKey = `corridor-${wingId}-ren-painting-${paintIdx}`;
          const rPaintData = corridorPaintings?.[rSlotKey];
          // Gold frame border (4 strips)
          scene.add(mk(new THREE.BoxGeometry(0.03, fb, fw + fb * 2), MS.gold, px, 2.2 + fh / 2 + fb / 2, pz)); // top
          scene.add(mk(new THREE.BoxGeometry(0.03, fb, fw + fb * 2), MS.gold, px, 2.2 - fh / 2 - fb / 2, pz)); // bottom
          scene.add(mk(new THREE.BoxGeometry(0.03, fh, fb), MS.gold, px, 2.2, pz - fw / 2 - fb / 2)); // left
          scene.add(mk(new THREE.BoxGeometry(0.03, fh, fb), MS.gold, px, 2.2, pz + fw / 2 + fb / 2)); // right
          // Canvas inset — use corridorPaintings if available
          if (rPaintData?.url) {
            const loader2 = new THREE.TextureLoader();
            loader2.load(rPaintData.url, (tex: THREE.Texture) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              const cMat2 = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 });
              const canvas2 = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), cMat2);
              canvas2.rotation.y = pSide * (-Math.PI / 2);
              canvas2.position.set(px + pSide * 0.01, 2.2, pz);
              scene.add(canvas2);
            });
          } else {
            const canvasMat = new THREE.MeshStandardMaterial({ color: paintColors[paintIdx % paintColors.length], roughness: 0.75 });
            scene.add(mk(new THREE.BoxGeometry(0.01, fh, fw), canvasMat, px + pSide * 0.01, 2.2, pz));
          }
          // Click target for painting interaction
          const rPaintClick = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, fh + fb * 2, fw + fb * 2),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
          );
          rPaintClick.position.set(px, 2.2, pz);
          rPaintClick.userData = { isPaintingSlot: true, slotKey: rSlotKey };
          scene.add(rPaintClick);
          paintingClickMeshes.push({ mesh: rPaintClick, slotKey: rSlotKey });
          paintIdx++;
        }
      });
      // Extra paintings on walls without adjacent same-side doors
      for (let ep = 0; ep < 3; ep++) {
        const epz = -cL / 2 + 3 + ep * (cL / 4);
        const epSide = ep % 2 === 0 ? 1 : -1;
        const epx = epSide * (cW / 2 - 0.02);
        const tooClose2 = dMeshes.some(d => Math.abs(d.z - epz) < 2 && d.side === epSide);
        if (!tooClose2) {
          const epSlotKey = `corridor-${wingId}-ren-extra-${ep}`;
          const epPaintData = corridorPaintings?.[epSlotKey];
          scene.add(mk(new THREE.BoxGeometry(0.03, 0.08, 1.36), MS.gold, epx, 2.64, epz));
          scene.add(mk(new THREE.BoxGeometry(0.03, 0.08, 1.36), MS.gold, epx, 1.76, epz));
          scene.add(mk(new THREE.BoxGeometry(0.03, 0.8, 0.08), MS.gold, epx, 2.2, epz - 0.68));
          scene.add(mk(new THREE.BoxGeometry(0.03, 0.8, 0.08), MS.gold, epx, 2.2, epz + 0.68));
          if (epPaintData?.url) {
            const loader3 = new THREE.TextureLoader();
            loader3.load(epPaintData.url, (tex: THREE.Texture) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              const eMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 });
              const eCanvas = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), eMat);
              eCanvas.rotation.y = epSide * (-Math.PI / 2);
              eCanvas.position.set(epx + epSide * 0.01, 2.2, epz);
              scene.add(eCanvas);
            });
          } else {
            const cMat = new THREE.MeshStandardMaterial({ color: paintColors[(paintIdx + ep) % paintColors.length], roughness: 0.75 });
            scene.add(mk(new THREE.BoxGeometry(0.01, 0.8, 1.2), cMat, epx + epSide * 0.01, 2.2, epz));
          }
          // Click target
          const epClick = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.96, 1.52),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
          );
          epClick.position.set(epx, 2.2, epz);
          epClick.userData = { isPaintingSlot: true, slotKey: epSlotKey };
          scene.add(epClick);
          paintingClickMeshes.push({ mesh: epClick, slotKey: epSlotKey });
        }
      }

      // ── DIAMOND FLOOR PATTERN (InstancedMesh) ──
      const tileSz = 0.6;
      const tileGeo = new THREE.PlaneGeometry(tileSz, tileSz);
      const tileDarkMat = new THREE.MeshStandardMaterial({ color: "#4A4A42", roughness: 0.5, metalness: 0.08 });
      const tileLightMat = new THREE.MeshStandardMaterial({ color: "#E8E0D4", roughness: 0.5, metalness: 0.05 });
      const tilesX = Math.ceil(cW / tileSz) + 2;
      const tilesZ = Math.ceil(cL / tileSz) + 2;
      const totalTiles = tilesX * tilesZ;
      const halfTiles = Math.ceil(totalTiles / 2);
      const darkInst = new THREE.InstancedMesh(tileGeo, tileDarkMat, halfTiles);
      const lightInst = new THREE.InstancedMesh(tileGeo, tileLightMat, halfTiles);
      const tMat4 = new THREE.Matrix4();
      const tQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 4));
      let dIdx = 0, lIdx = 0;
      for (let tx = 0; tx < tilesX; tx++) {
        for (let tz = 0; tz < tilesZ; tz++) {
          const fx = -cW / 2 + tx * tileSz;
          const fz = -cL / 2 + tz * tileSz;
          tMat4.compose(new THREE.Vector3(fx, 0.005, fz), tQuat, new THREE.Vector3(1, 1, 1));
          if ((tx + tz) % 2 === 0) { if (dIdx < halfTiles) darkInst.setMatrixAt(dIdx++, tMat4); }
          else { if (lIdx < halfTiles) lightInst.setMatrixAt(lIdx++, tMat4); }
        }
      }
      darkInst.count = dIdx; lightInst.count = lIdx;
      darkInst.instanceMatrix.needsUpdate = true;
      lightInst.instanceMatrix.needsUpdate = true;
      scene.add(darkInst); scene.add(lightInst);

      // ── PIETRA SERENA DOOR FRAMES (enhanced with pediment + keystone) ──
      const pietraMat = MS.trim;
      dMeshes.forEach(d => {
        // Vertical jambs
        scene.add(mk(new THREE.BoxGeometry(0.06, 3.8, 0.1), pietraMat, d.x - (d.side * 0.01), 1.9, d.z - 0.9));
        scene.add(mk(new THREE.BoxGeometry(0.06, 3.8, 0.1), pietraMat, d.x - (d.side * 0.01), 1.9, d.z + 0.9));
        // Lintel
        scene.add(mk(new THREE.BoxGeometry(0.06, 0.12, 2.0), pietraMat, d.x - (d.side * 0.01), 3.85, d.z));
        // Cornice pediment (triangular - two angled pieces)
        const pedH = 0.35, pedW = 1.0;
        for (let ps = -1; ps <= 1; ps += 2) {
          const pedGeo = new THREE.BoxGeometry(0.05, pedH, 0.08);
          const ped = new THREE.Mesh(pedGeo, pietraMat);
          ped.position.set(d.x - (d.side * 0.01), 4.05, d.z + ps * pedW / 2);
          // Angle each side of pediment
          ped.rotation.x = ps * 0.4;
          scene.add(ped);
        }
        // Keystone at top center
        scene.add(mk(new THREE.BoxGeometry(0.07, 0.18, 0.14), MS.gold, d.x - (d.side * 0.01), 4.18, d.z));
      });

      // ── BUST NICHES (3-4 between doors on alternating walls) ──
      const bustMat = new THREE.MeshStandardMaterial({ color: "#E0D8CC", roughness: 0.25, metalness: 0.06 });
      let bustCount = 0;
      dMeshes.forEach((d, di) => {
        if (di < dMeshes.length - 1 && bustCount < 4) {
          const nextD = dMeshes[di + 1];
          if (nextD.side !== d.side) {
            const nz = (d.z + nextD.z) / 2;
            const nSide = d.side;
            const nx = nSide * (cW / 2 - 0.01);
            // Niche cavity
            scene.add(mk(new THREE.BoxGeometry(0.25, 1.4, 0.7), MS.wallD, nx - nSide * 0.12, 1.5, nz));
            // Semicircular niche top (shell)
            const shellGeo = new THREE.CircleGeometry(0.35, 12, 0, Math.PI);
            const shell = new THREE.Mesh(shellGeo, MS.trim);
            shell.position.set(nx - nSide * 0.005, 2.2, nz);
            shell.rotation.y = nSide * (-Math.PI / 2);
            scene.add(shell);
            // Pietra serena frame around niche
            const nArchGeo = new THREE.TorusGeometry(0.35, 0.04, 6, 12, Math.PI);
            const nArch = new THREE.Mesh(nArchGeo, pietraMat);
            nArch.position.set(nx - nSide * 0.003, 2.2, nz);
            nArch.rotation.y = nSide * (-Math.PI / 2);
            scene.add(nArch);
            // Bust shape (head + neck + shoulders)
            scene.add(mk(new THREE.SphereGeometry(0.12, 8, 8), bustMat, nx - nSide * 0.13, 1.85, nz)); // head
            scene.add(mk(new THREE.CylinderGeometry(0.06, 0.08, 0.15, 6), bustMat, nx - nSide * 0.13, 1.68, nz)); // neck
            scene.add(mk(new THREE.CylinderGeometry(0.18, 0.2, 0.25, 8), bustMat, nx - nSide * 0.13, 1.48, nz)); // shoulders
            // Small pedestal
            scene.add(mk(new THREE.BoxGeometry(0.2, 0.4, 0.2), pietraMat, nx - nSide * 0.13, 1.15, nz));
            bustCount++;
          }
        }
      });

    } else {
      // ═══ ROMAN PERISTYLE CORRIDOR ═══

      // ── OPEN COLONNADE on side=1 wall ──
      const colSpacing = 2.5;
      const colCount = Math.floor(cL / colSpacing);
      const colR = 0.25;
      const colH = cH - 0.5;
      const colX = 1 * (cW / 2); // side=1 wall
      const capitalMat = new THREE.MeshStandardMaterial({ color: "#E0D8CC", roughness: 0.3, metalness: 0.05 });

      for (let ci = 0; ci <= colCount; ci++) {
        const cz = -cL / 2 + 0.5 + ci * colSpacing;
        // Column base
        scene.add(mk(new THREE.CylinderGeometry(colR + 0.08, colR + 0.1, 0.15, 12), MS.marble, colX, 0.075, cz));
        // Column shaft
        scene.add(mk(new THREE.CylinderGeometry(colR, colR, colH, 12), MS.marble, colX, colH / 2 + 0.15, cz));
        // Capital (wider top)
        scene.add(mk(new THREE.CylinderGeometry(colR + 0.12, colR, 0.2, 12), capitalMat, colX, colH + 0.15 + 0.1, cz));
        // Abacus block
        scene.add(mk(new THREE.BoxGeometry(0.6, 0.08, 0.6), capitalMat, colX, colH + 0.39, cz));
      }

      // Low railing between columns
      scene.add(mk(new THREE.BoxGeometry(0.12, 0.6, cL - 1), MS.marble, colX, 0.3, 0));
      // Railing cap
      scene.add(mk(new THREE.BoxGeometry(0.18, 0.06, cL - 0.8), capitalMat, colX, 0.63, 0));

      // Entablature beam above columns
      scene.add(mk(new THREE.BoxGeometry(0.3, 0.2, cL), capitalMat, colX, colH + 0.5, 0));
      // Frieze strip
      scene.add(mk(new THREE.BoxGeometry(0.25, 0.12, cL), MS.trim, colX + 0.02, colH + 0.36, 0));

      // ── VISIBLE GARDEN beyond colonnade ──
      const gardenMat = new THREE.MeshStandardMaterial({ color: "#4A7A38", roughness: 0.9 });
      const gardenGround = new THREE.Mesh(new THREE.PlaneGeometry(8, cL + 4), gardenMat);
      gardenGround.rotation.x = -Math.PI / 2;
      gardenGround.position.set(cW / 2 + 4, -0.02, 0);
      scene.add(gardenGround);

      // Garden path (stone strip)
      const pathMat = new THREE.MeshStandardMaterial({ color: "#C4B8A0", roughness: 0.7 });
      scene.add(mk(new THREE.PlaneGeometry(1.2, cL - 2), pathMat, cW / 2 + 3, 0.001, 0));
      // rotate path to lie flat
      const pathMesh = scene.children[scene.children.length - 1] as THREE.Mesh;
      pathMesh.rotation.x = -Math.PI / 2;

      // Topiary bushes (4-6)
      const topiaryMat = new THREE.MeshStandardMaterial({ color: "#2E6428", roughness: 0.85 });
      const topiaryTrunkMat = new THREE.MeshStandardMaterial({ color: "#6A5040", roughness: 0.7 });
      for (let ti = 0; ti < 5; ti++) {
        const tz = -cL / 2 + 4 + ti * (cL / 5);
        const tx = cW / 2 + (ti % 2 === 0 ? 2 : 5.5);
        // Trunk
        scene.add(mk(new THREE.CylinderGeometry(0.06, 0.08, 0.8, 6), topiaryTrunkMat, tx, 0.4, tz));
        // Foliage ball
        scene.add(mk(new THREE.SphereGeometry(0.5, 8, 8), topiaryMat, tx, 1.2, tz));
      }

      // Flowering hedgerows
      const hedgeMat = new THREE.MeshStandardMaterial({ color: "#3A6030", roughness: 0.9 });
      scene.add(mk(new THREE.BoxGeometry(0.6, 0.8, cL - 6), hedgeMat, cW / 2 + 1.2, 0.4, 0));
      scene.add(mk(new THREE.BoxGeometry(0.6, 0.8, cL - 6), hedgeMat, cW / 2 + 7, 0.4, 0));

      // Low stone garden wall at perimeter
      const gardenWallMat = new THREE.MeshStandardMaterial({ color: "#B8AE9C", roughness: 0.7 });
      scene.add(mk(new THREE.BoxGeometry(0.25, 1.0, cL + 2), gardenWallMat, cW / 2 + 8, 0.5, 0));
      // Wall cap
      scene.add(mk(new THREE.BoxGeometry(0.35, 0.08, cL + 2.5), capitalMat, cW / 2 + 8, 1.04, 0));

      // Terracotta planter pots (2)
      const tcMat = MS.terracotta;
      for (let pi = 0; pi < 2; pi++) {
        const pz = -cL / 4 + pi * (cL / 2);
        const px = cW / 2 + 4.5;
        scene.add(mk(new THREE.CylinderGeometry(0.35, 0.25, 0.5, 10), tcMat, px, 0.25, pz));
        // Rim
        scene.add(mk(new THREE.CylinderGeometry(0.38, 0.35, 0.06, 10), tcMat, px, 0.53, pz));
        // Foliage in pot
        scene.add(mk(new THREE.SphereGeometry(0.35, 8, 6), topiaryMat, px, 0.75, pz));
      }

      // ── AEDICULE NICHES on solid wall (side=-1) ──
      const nicheWall = -1;
      const nicheX = nicheWall * (cW / 2);
      let nicheCount = 0;
      const nicheMat = MS.wallD;
      const pilasterMat = MS.trim;
      dMeshes.forEach((d, di) => {
        if (di < dMeshes.length - 1 && nicheCount < 6) {
          const nextD = dMeshes[di + 1];
          // Only place niches on the solid wall between doors
          if (d.side === nicheWall && nextD.side === nicheWall) {
            const nz = (d.z + nextD.z) / 2;
            nicheCount++;
            // Recessed niche cavity
            scene.add(mk(new THREE.BoxGeometry(0.25, 1.4, 0.7), nicheMat, nicheX + 0.12, 1.5, nz));
            // Pilaster columns flanking
            scene.add(mk(new THREE.BoxGeometry(0.1, 1.8, 0.1), pilasterMat, nicheX + 0.05, 1.4, nz - 0.45));
            scene.add(mk(new THREE.BoxGeometry(0.1, 1.8, 0.1), pilasterMat, nicheX + 0.05, 1.4, nz + 0.45));
            // Triangular pediment (two angled pieces)
            for (let ps = -1; ps <= 1; ps += 2) {
              const pedGeo = new THREE.BoxGeometry(0.06, 0.3, 0.35);
              const ped = new THREE.Mesh(pedGeo, pilasterMat);
              ped.position.set(nicheX + 0.03, 2.5, nz + ps * 0.22);
              ped.rotation.x = ps * 0.35;
              scene.add(ped);
            }
            // Pediment cap
            scene.add(mk(new THREE.BoxGeometry(0.06, 0.06, 1.0), pilasterMat, nicheX + 0.03, 2.35, nz));
            // Shell/fan at niche top
            const shellGeo = new THREE.CircleGeometry(0.3, 10, 0, Math.PI);
            const shell = new THREE.Mesh(shellGeo, MS.gold);
            shell.position.set(nicheX + 0.01, 2.2, nz);
            shell.rotation.y = nicheWall * (-Math.PI / 2);
            scene.add(shell);
            // Bust/urn inside niche
            if (nicheCount % 2 === 0) {
              // Urn shape
              scene.add(mk(new THREE.CylinderGeometry(0.1, 0.15, 0.4, 8), MS.marble, nicheX + 0.14, 1.2, nz));
              scene.add(mk(new THREE.CylinderGeometry(0.14, 0.1, 0.08, 8), MS.marble, nicheX + 0.14, 1.44, nz));
              scene.add(mk(new THREE.SphereGeometry(0.06, 6, 6), MS.gold, nicheX + 0.14, 1.5, nz));
            } else {
              // Bust shape
              scene.add(mk(new THREE.SphereGeometry(0.1, 8, 8), MS.marble, nicheX + 0.14, 1.75, nz));
              scene.add(mk(new THREE.CylinderGeometry(0.05, 0.07, 0.12, 6), MS.marble, nicheX + 0.14, 1.6, nz));
              scene.add(mk(new THREE.CylinderGeometry(0.15, 0.17, 0.2, 8), MS.marble, nicheX + 0.14, 1.42, nz));
            }
            // Small pedestal
            scene.add(mk(new THREE.BoxGeometry(0.18, 0.5, 0.18), pilasterMat, nicheX + 0.14, 1.0, nz));
          }
        }
        // Also fill between doors on same wall if not already covered
        if (di < dMeshes.length - 1 && nicheCount < 6) {
          const nextD2 = dMeshes[di + 1];
          if (d.side !== nicheWall && nextD2.side !== nicheWall) {
            const nz2 = (d.z + nextD2.z) / 2;
            nicheCount++;
            scene.add(mk(new THREE.BoxGeometry(0.25, 1.4, 0.7), nicheMat, nicheX + 0.12, 1.5, nz2));
            scene.add(mk(new THREE.BoxGeometry(0.1, 1.8, 0.1), pilasterMat, nicheX + 0.05, 1.4, nz2 - 0.45));
            scene.add(mk(new THREE.BoxGeometry(0.1, 1.8, 0.1), pilasterMat, nicheX + 0.05, 1.4, nz2 + 0.45));
            const shellGeo2 = new THREE.CircleGeometry(0.3, 10, 0, Math.PI);
            const shell2 = new THREE.Mesh(shellGeo2, MS.gold);
            shell2.position.set(nicheX + 0.01, 2.2, nz2);
            shell2.rotation.y = nicheWall * (-Math.PI / 2);
            scene.add(shell2);
            scene.add(mk(new THREE.SphereGeometry(0.1, 8, 8), MS.marble, nicheX + 0.14, 1.75, nz2));
            scene.add(mk(new THREE.CylinderGeometry(0.05, 0.07, 0.12, 6), MS.marble, nicheX + 0.14, 1.6, nz2));
            scene.add(mk(new THREE.CylinderGeometry(0.15, 0.17, 0.2, 8), MS.marble, nicheX + 0.14, 1.42, nz2));
            scene.add(mk(new THREE.BoxGeometry(0.18, 0.5, 0.18), pilasterMat, nicheX + 0.14, 1.0, nz2));
          }
        }
      });

      // ── MOSAIC FLOOR RUNNER (central strip) ──
      const mosaicW = 1.5;
      const mTerracotta = new THREE.MeshStandardMaterial({ color: "#C4704A", roughness: 0.6 });
      const mCream = new THREE.MeshStandardMaterial({ color: "#F0E8D8", roughness: 0.55 });
      const mBlack = new THREE.MeshStandardMaterial({ color: "#2A2A28", roughness: 0.5 });
      // Border strips
      scene.add(mk(new THREE.BoxGeometry(0.08, 0.004, cL - 2), mBlack, -mosaicW / 2 - 0.04, 0.006, 0));
      scene.add(mk(new THREE.BoxGeometry(0.08, 0.004, cL - 2), mBlack, mosaicW / 2 + 0.04, 0.006, 0));
      // Diamond/chevron tiles (InstancedMesh)
      const mTileSz = 0.25;
      const mTilesZ = Math.ceil(cL / mTileSz);
      const mTilesX = Math.ceil(mosaicW / mTileSz);
      const mTotal = mTilesX * mTilesZ;
      const mGeo = new THREE.PlaneGeometry(mTileSz * 0.9, mTileSz * 0.9);
      const mMats = [mTerracotta, mCream, mBlack];
      const mInsts = mMats.map(m => new THREE.InstancedMesh(mGeo, m, Math.ceil(mTotal / 3) + 1));
      const mIdxs = [0, 0, 0];
      const mMat4 = new THREE.Matrix4();
      const mQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 4));
      for (let mx = 0; mx < mTilesX; mx++) {
        for (let mz = 0; mz < mTilesZ; mz++) {
          const fx = -mosaicW / 2 + mTileSz / 2 + mx * mTileSz;
          const fz = -cL / 2 + 1 + mz * mTileSz;
          const mci = (mx + mz) % 3;
          mMat4.compose(new THREE.Vector3(fx, 0.007, fz), mQuat, new THREE.Vector3(1, 1, 1));
          const maxPer = Math.ceil(mTotal / 3) + 1;
          if (mIdxs[mci] < maxPer) mInsts[mci].setMatrixAt(mIdxs[mci]++, mMat4);
        }
      }
      mInsts.forEach((inst, i) => { inst.count = mIdxs[i]; inst.instanceMatrix.needsUpdate = true; scene.add(inst); });

      // ── OIL LAMP BRACKETS on solid wall ──
      const lampBracketMat = MS.bronze;
      const lampCount = Math.min(10, Math.floor(cL / 3));
      const lampSpacing = cL / (lampCount + 1);
      let lampLightCount = 0;
      for (let li = 1; li <= lampCount; li++) {
        const lz = -cL / 2 + li * lampSpacing;
        const lx = nicheWall * (cW / 2 - 0.03);
        // Wall bracket arm
        scene.add(mk(new THREE.BoxGeometry(0.04, 0.04, 0.04), lampBracketMat, lx, 2.6, lz));
        scene.add(mk(new THREE.CylinderGeometry(0.02, 0.02, 0.25, 6), lampBracketMat, lx - nicheWall * 0.12, 2.55, lz));
        // Oil dish
        scene.add(mk(new THREE.CylinderGeometry(0.08, 0.06, 0.04, 8), lampBracketMat, lx - nicheWall * 0.2, 2.5, lz));
        // Flame glow
        scene.add(mk(new THREE.SphereGeometry(0.02, 5, 5),
          new THREE.MeshBasicMaterial({ color: "#FFE080" }),
          lx - nicheWall * 0.2, 2.56, lz));
        // PointLight (limit to 8)
        if (lampLightCount < 8) {
          const lLight = new THREE.PointLight("#FF9040", 0.4, 6);
          lLight.position.set(lx - nicheWall * 0.2, 2.6, lz);
          scene.add(lLight);
          lampLightCount++;
        }
      }

      // ── CEILING BEAMS (exposed timber) ──
      const beamMat = new THREE.MeshStandardMaterial({ color: "#4A3020", roughness: 0.7, metalness: 0.02 });
      const beamCount = 11;
      const beamSpacing = cL / (beamCount + 1);
      for (let bi = 1; bi <= beamCount; bi++) {
        const bz = -cL / 2 + bi * beamSpacing;
        scene.add(mk(new THREE.BoxGeometry(cW - 0.4, 0.2, 0.15), beamMat, 0, cH - 0.1, bz));
        // Decorative bracket at each wall junction
        for (let bs = -1; bs <= 1; bs += 2) {
          scene.add(mk(new THREE.BoxGeometry(0.08, 0.15, 0.15), beamMat, bs * (cW / 2 - 0.24), cH - 0.22, bz));
        }
      }
    }

    // ── WALKTHROUGH HIGHLIGHT — golden glow on target door ──
    const hlDoorLights: Map<string,THREE.PointLight>=new Map();
    dMeshes.forEach(d=>{
      const light=new THREE.PointLight("#D4AF37",0,10);light.position.set(d.x-(d.side*.5),2.5,d.z);scene.add(light);
      hlDoorLights.set(d.room.id,light);
    });
    const goldColor=new THREE.Color("#D4AF37");

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
    const keys: Record<string,boolean>={},drag={v:false},prev={x:0,y:0};let hovDoor: string|null=null;

    // ── DUST PARTICLES ──
    const dust=createDustParticles({count:130,bounds:{x:cW/2-.5,y:cH/2,z:cL/2},center:new THREE.Vector3(0,cH/2,-cL/2+cL/2),opacity:0.2,size:0.03});
    scene.add(dust.points);

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
      const hlTarget=highlightDoorRef.current;
      dMeshes.forEach(d=>{
        if(hlTarget===d.room.id){
          // Walkthrough golden glow — strong pulse
          const pulse=0.6+Math.sin(t*2.5)*.25;
          d.mat.emissive=goldColor.clone();
          d.mat.emissiveIntensity+=(pulse-d.mat.emissiveIntensity)*.12;
        }else{
          const isH=hovDoor===d.room.id;
          d.mat.emissive=isH?new THREE.Color(wing.accent):new THREE.Color(0);
          d.mat.emissiveIntensity=isH?.12+Math.sin(t*3)*.04:0;
        }
      });
      hlDoorLights.forEach((light,id)=>{
        if(hlTarget===id)light.intensity=3+Math.sin(t*2)*1.5;
        else light.intensity+=(0-light.intensity)*.05;
      });
      portalGlow.material.opacity=.06+Math.sin(t*2)*.04;portalLight.intensity=.9+Math.sin(t*1.5)*.2;
      // Portal sparkle animation
      const sp2=sparkG.attributes.position.array as Float32Array;
      for(let i=0;i<sparkN;i++){sp2[i*3+1]+=Math.sin(t*2+i*1.2)*.004;sp2[i*3]+=Math.cos(t*1.5+i)*.0015;}
      sparkG.attributes.position.needsUpdate=true;
      (sparkPoints.material as THREE.PointsMaterial).opacity=.35+Math.sin(t*3)*.2;
      const dp=rdG.attributes.position.array;for(let i=0;i<rdN;i++){dp[i*3+1]+=Math.sin(t*.2+i*.5)*.002;if(dp[i*3+1]>cH)dp[i*3+1]=.5;}rdG.attributes.position.needsUpdate=true;
      dust.update(t,dt);
      composer.render();
    };animate();
    const onDown=(e: MouseEvent)=>{drag.v=false;prev.x=e.clientX;prev.y=e.clientY;};
    const onMove=(e: MouseEvent)=>{const dx=e.clientX-prev.x,dy=e.clientY-prev.y;if(Math.abs(dx)>2||Math.abs(dy)>2)drag.v=true;
      if(e.buttons===1){lookT.yaw-=dx*.003;lookT.pitch=Math.max(-.4,Math.min(.4,lookT.pitch+dy*.003));prev.x=e.clientX;prev.y=e.clientY;}
      const rect=el.getBoundingClientRect();const rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1),camera);
      let found=null;let portalHov=false;
      dMeshes.forEach(d=>{const hits=rc.intersectObject(d.mesh);if(hits.length>0&&hits[0].distance<5)found=d.room.id;});
      const ph2=rc.intersectObject(portalHit);if(ph2.length>0&&ph2[0].distance<5)portalHov=true;
      let inlHov=false;
      inlayClickMeshes.forEach(im=>{const hits=rc.intersectObject(im);if(hits.length>0&&hits[0].distance<5)inlHov=true;});
      let paintHov=false;
      paintingClickMeshes.forEach(pm=>{const hits=rc.intersectObject(pm.mesh);if(hits.length>0&&hits[0].distance<5)paintHov=true;});
      hovDoor=found;el.style.cursor=(found||portalHov||inlHov||paintHov)?"pointer":"grab";onDoorHover(found||(portalHov?"__portal__":null));
      if((inlHov||paintHov)&&!found&&!portalHov)el.style.cursor="pointer";};
    const onCk=()=>{
      if(!drag.v&&hovDoor)onDoorClickRef.current(hovDoor);
      else if(!drag.v){
        const rect2=el.getBoundingClientRect();const rc2=new THREE.Raycaster();rc2.setFromCamera(new THREE.Vector2(((prev.x-rect2.left)/rect2.width)*2-1,-((prev.y-rect2.top)/rect2.height)*2+1),camera);
        const ph3=rc2.intersectObject(portalHit);if(ph3.length>0&&ph3[0].distance<5)onDoorClickRef.current("__portal__");
        let inlHit=false;inlayClickMeshes.forEach(im=>{const h=rc2.intersectObject(im);if(h.length>0&&h[0].distance<5)inlHit=true;});
        if(inlHit){onInlayClick?.();return;}
        // Check painting slot clicks
        paintingClickMeshes.forEach(pm=>{const h=rc2.intersectObject(pm.mesh);if(h.length>0&&h[0].distance<5){onInlayClick?.();}});
      }};

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
            if(found)onDoorClickRef.current(found);
            else{
              const ph=rc.intersectObject(portalHit);if(ph.length>0&&ph[0].distance<5)onDoorClickRef.current("__portal__");
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
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((m: any) => {
            if (m.map) m.map.dispose();
            if (m.normalMap) m.normalMap.dispose();
            if (m.roughnessMap) m.roughnessMap.dispose();
            if (m.emissiveMap) m.emissiveMap.dispose();
            m.dispose();
          });
        }
      });
      dust.dispose();
      allTexSets.forEach(disposePBRSet);
      envMapProc.dispose();
      if(envMapHDRI)envMapHDRI.dispose();
      composer.dispose();
      if(el.contains(ren.domElement))el.removeChild(ren.domElement);ren.dispose();};
  },[wingId]);
  return <div ref={mountRef} style={{width:"100%",height:"100%"}}/>;
}
