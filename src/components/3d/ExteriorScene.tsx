"use client";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";
import { useUserStore } from "@/lib/stores/userStore";
import { createPostProcessing } from "@/lib/3d/postprocessing";
import { createExteriorEnvMap } from "@/lib/3d/environmentMaps";
import { getLightingPreset } from "@/lib/3d/daylightCycle";
import { loadHDRI, HDRI_EXTERIOR, HDRI_TUSCAN_LANDSCAPE, loadPlasterWallTextures, loadWornPlasterTextures, loadClayPlasterTextures, loadTerracottaTileTextures, loadDarkWoodTextures, loadGrassTextures, loadGroundTextures, loadCropTextures, loadWhiteGravelTextures, loadGravelRoadTextures, loadDisplacementMap, disposePBRSet, isCachedTexture, type PBRTextureSet } from "@/lib/3d/assetLoader";
import { createGrassSystem, createWheatField } from "@/lib/3d/grassShader";
import { createTuscanTerrain, getHeightAt } from "@/lib/3d/tuscanTerrain";
import { useTranslation } from "@/lib/hooks/useTranslation";

// ── Wing SVG icon strings for hover labels (matches WingRoomIcons.tsx) ──
const WING_SVG_STRINGS: Record<string,string> = {
  family: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,14 12,4 21,14"/><line x1="6" y1="14" x2="6" y2="20"/><line x1="18" y1="14" x2="18" y2="20"/><line x1="3" y1="20" x2="21" y2="20"/><path d="M10,20 L10,16 Q12,13 14,16 L14,20"/></svg>`,
  travel: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polygon points="12,3 13,10 12,11 11,10" fill="currentColor" fill-opacity="0.15" stroke="currentColor"/><polygon points="12,21 11,14 12,13 13,14" fill="currentColor" fill-opacity="0.08" stroke="currentColor"/><polygon points="3,12 10,11 11,12 10,13" fill="currentColor" fill-opacity="0.08" stroke="currentColor"/><polygon points="21,12 14,13 13,12 14,11" fill="currentColor" fill-opacity="0.08" stroke="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor" fill-opacity="0.3"/></svg>`,
  childhood: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="7"/><path d="M7,9 Q7,7 12,7 Q17,7 17,9 L12,20 Z" fill="currentColor" fill-opacity="0.06"/><ellipse cx="12" cy="10" rx="5" ry="1.5"/><circle cx="12" cy="20" r="0.6" fill="currentColor" fill-opacity="0.25"/></svg>`,
  career: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10,20 Q4,16 4,10 Q4,6 8,4" fill="none"/><path d="M6,14 Q8,13 8,11"/><path d="M5,11 Q7,10.5 7.5,8.5"/><path d="M5.5,8 Q7.5,7.5 8,5.5"/><path d="M14,20 Q20,16 20,10 Q20,6 16,4" fill="none"/><path d="M18,14 Q16,13 16,11"/><path d="M19,11 Q17,10.5 16.5,8.5"/><path d="M18.5,8 Q16.5,7.5 16,5.5"/><path d="M10,20 L12,21 L14,20"/></svg>`,
  creativity: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8,20 L8,18 Q8,16 10,15 L14,15 Q16,16 16,18 L16,20"/><line x1="7" y1="20" x2="17" y2="20"/><path d="M8,18 Q5,14 6,8 Q6.5,5 9,4" fill="none"/><path d="M16,18 Q19,14 18,8 Q17.5,5 15,4" fill="none"/><line x1="7" y1="7" x2="17" y2="7"/><line x1="10" y1="7" x2="10" y2="15"/><line x1="12" y1="7" x2="12" y2="15"/><line x1="14" y1="7" x2="14" y2="15"/></svg>`,
  attic: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="3" ry="1"/><path d="M9,5 Q9,8 8,9" fill="none"/><path d="M15,5 Q15,8 16,9" fill="none"/><path d="M8,9 Q5,12 6,16 Q7,20 12,21 Q17,20 18,16 Q19,12 16,9" fill="currentColor" fill-opacity="0.05"/><path d="M8,9 Q4,10 5.5,14" fill="none"/><path d="M16,9 Q20,10 18.5,14" fill="none"/></svg>`,
};

// ═══ EXTERIOR — Fantasy Castle ═══
export default function ExteriorScene({onRoomHover,onRoomClick,hoveredRoom,wings:wingsProp,highlightDoor,styleEra="roman",autoWalkTo,onReady}: {onRoomHover: any,onRoomClick: any,hoveredRoom: any,wings?: Wing[],highlightDoor?: string|null,styleEra?: string,autoWalkTo?: string|null,onReady?: () => void}){
  const WINGS = wingsProp || DEFAULT_WINGS;
  const ownerName = useUserStore((s) => s.userName);
  const { t } = useTranslation("exterior3d");
  const entranceHallLabel = t("entranceHall");
  const entranceHallLabelRef = useRef(entranceHallLabel);
  entranceHallLabelRef.current = entranceHallLabel;
  const mountRef=useRef<HTMLDivElement|null>(null),frameRef=useRef<number|null>(null);
  // Camera starts facing entrance (-Z side), low angle showing palace prominently
  // phi=0.38 ≈ 68° from zenith = low ground-level view, camD=115 for wider framing (more of palace visible at start)
  const camO=useRef({theta:Math.PI*1.5,phi:Math.PI*.38}),camOT=useRef({theta:Math.PI*1.5,phi:Math.PI*.38}),camD=useRef(115);
  const drag=useRef(false),prev=useRef({x:0,y:0}),mse=useRef(new THREE.Vector2()),ray=useRef(new THREE.Raycaster());
  const hoveredRoomRef=useRef(hoveredRoom);
  const onRoomClickRef=useRef(onRoomClick);
  const highlightDoorRef=useRef(highlightDoor);
  const autoWalkToRef=useRef(autoWalkTo);

  // Keep refs in sync so event listeners always read the latest value
  useEffect(()=>{hoveredRoomRef.current=hoveredRoom;},[hoveredRoom]);
  useEffect(()=>{onRoomClickRef.current=onRoomClick;},[onRoomClick]);
  useEffect(()=>{highlightDoorRef.current=highlightDoor;},[highlightDoor]);
  useEffect(()=>{autoWalkToRef.current=autoWalkTo;},[autoWalkTo]);

  useEffect(()=>{
    const el=mountRef.current;if(!el)return;let w=el.clientWidth,h=el.clientHeight;
    const dlPreset=getLightingPreset();
    const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(dlPreset.fogColor,.0018*dlPreset.fogDensity);
    // ── PHOTOREALISTIC TUSCAN GOLDEN HOUR SKY ──
    const skyGeo=new THREE.SphereGeometry(500,64,40);
    const skyC=document.createElement("canvas");skyC.width=2048;skyC.height=1024;
    const skx=skyC.getContext("2d")!;
    skx.scale(0.5,0.5); // draw at half resolution — all coordinates stay as original 4096x2048 space
    // Base gradient — warm Tuscan golden hour with subtle atmospheric scattering
    const skyG=skx.createLinearGradient(0,0,0,2048);
    skyG.addColorStop(0,"#0D1B38");skyG.addColorStop(.04,"#152848");skyG.addColorStop(.1,"#1E3A60");
    skyG.addColorStop(.18,"#2A5078");skyG.addColorStop(.26,"#3A6890");skyG.addColorStop(.34,"#5590B0");
    skyG.addColorStop(.42,"#88A8B8");skyG.addColorStop(.5,"#A8BCC0");skyG.addColorStop(.56,"#C0C8B8");
    skyG.addColorStop(.62,"#D8D0B8");skyG.addColorStop(.68,"#E4D0A8");skyG.addColorStop(.74,"#ECCA98");
    skyG.addColorStop(.8,"#F0C898");skyG.addColorStop(.86,"#ECA870");skyG.addColorStop(.91,"#E09058");
    skyG.addColorStop(.95,"#D07840");skyG.addColorStop(.98,"#C06830");skyG.addColorStop(1,"#A05828");
    skx.fillStyle=skyG;skx.fillRect(0,0,4096,2048);
    // Atmospheric haze band at horizon — warm golden shimmer
    const hazeG=skx.createLinearGradient(0,1400,0,2048);
    hazeG.addColorStop(0,"rgba(240,220,180,0)");hazeG.addColorStop(.3,"rgba(240,210,170,0.08)");
    hazeG.addColorStop(.6,"rgba(235,200,155,0.15)");hazeG.addColorStop(1,"rgba(220,185,140,0.2)");
    skx.fillStyle=hazeG;skx.fillRect(0,1400,4096,648);
    // High cirrus clouds — delicate wispy streaks
    for(let layer=0;layer<6;layer++){
      const yBase=80+layer*65,alpha=.025+layer*.01;
      for(let ci=0;ci<40;ci++){
        const cx2=Math.random()*4096,cy=yBase+Math.random()*50;
        const cw=80+Math.random()*200,ch2=2+Math.random()*5;
        skx.fillStyle=`rgba(255,${250-layer*8},${238-layer*12},${alpha+Math.random()*.02})`;
        skx.beginPath();skx.ellipse(cx2,cy,cw,ch2,Math.random()*.2-.1,0,Math.PI*2);skx.fill();
        // Sub-wisps for texture
        for(let sw=0;sw<3;sw++){
          skx.fillStyle=`rgba(255,${248-layer*8},${235-layer*10},${alpha*.4})`;
          skx.beginPath();skx.ellipse(cx2+Math.random()*cw-cw/2,cy+Math.random()*8-4,cw*.4,ch2*.6,Math.random()*.15,0,Math.PI*2);skx.fill();
        }
      }
    }
    // Mid-level cumulus clouds — softer, more voluminous
    for(let ci=0;ci<18;ci++){
      const cx2=Math.random()*4096,cy=400+Math.random()*250;
      const baseW=100+Math.random()*160;
      // Build cloud from overlapping ovals
      for(let p=0;p<8;p++){
        const pw=baseW*(0.4+Math.random()*.6),ph=(8+Math.random()*12)*(1-p*.05);
        skx.fillStyle=`rgba(255,${250-p*2},${240-p*4},${.03+Math.random()*.015})`;
        skx.beginPath();skx.ellipse(cx2+Math.random()*baseW*.6-baseW*.3,cy+Math.random()*15-7,pw,ph,Math.random()*.1,0,Math.PI*2);skx.fill();
      }
    }
    // Low horizon clouds — backlit golden edges
    for(let ci=0;ci<25;ci++){
      const cx2=Math.random()*4096,cy=1500+Math.random()*200;
      const cw=60+Math.random()*180;
      // Dark underside
      skx.fillStyle=`rgba(180,140,100,${.04+Math.random()*.03})`;
      skx.beginPath();skx.ellipse(cx2,cy+5,cw,6+Math.random()*8,0,0,Math.PI*2);skx.fill();
      // Golden top edge (backlit)
      skx.fillStyle=`rgba(255,220,160,${.06+Math.random()*.04})`;
      skx.beginPath();skx.ellipse(cx2,cy-3,cw*.9,3+Math.random()*4,0,0,Math.PI*2);skx.fill();
    }
    // Sun with realistic glow layers and atmospheric diffusion
    const sunX=2800,sunY=1560;
    // Outer atmospheric glow
    for(let r=0;r<8;r++){
      const rad=60+r*80,a=.08-.008*r;
      const sg=skx.createRadialGradient(sunX,sunY,0,sunX,sunY,rad);
      sg.addColorStop(0,`rgba(255,250,230,${a})`);sg.addColorStop(.3,`rgba(255,235,190,${a*.7})`);
      sg.addColorStop(.7,`rgba(255,210,150,${a*.3})`);sg.addColorStop(1,"rgba(255,190,120,0)");
      skx.fillStyle=sg;skx.fillRect(0,0,4096,2048);
    }
    // Sun core — hot white center
    const sunCore=skx.createRadialGradient(sunX,sunY,0,sunX,sunY,35);
    sunCore.addColorStop(0,"rgba(255,255,248,0.9)");sunCore.addColorStop(.4,"rgba(255,248,220,0.6)");
    sunCore.addColorStop(1,"rgba(255,230,180,0)");
    skx.fillStyle=sunCore;skx.fillRect(sunX-60,sunY-60,120,120);
    // God rays — longer, more varied, softer
    for(let gr=0;gr<14;gr++){
      const angle=-Math.PI*.7+gr*.11+Math.random()*.04;const len=300+Math.random()*300;
      skx.strokeStyle=`rgba(255,235,190,${.01+Math.random()*.015})`;
      skx.lineWidth=10+Math.random()*20;skx.beginPath();
      skx.moveTo(sunX,sunY);skx.lineTo(sunX+Math.cos(angle)*len,sunY+Math.sin(angle)*len);skx.stroke();
    }
    // Stars in deep sky
    for(let si=0;si<120;si++){
      const sy=Math.random()*500;
      skx.fillStyle=`rgba(255,255,245,${.02+Math.random()*.04*(1-sy/500)})`;
      skx.beginPath();skx.arc(Math.random()*4096,sy,Math.random()*1.2,.0,Math.PI*2);skx.fill();
    }
    const skyTex=new THREE.CanvasTexture(skyC);skyTex.colorSpace=THREE.SRGBColorSpace;
    // Release canvas memory after texture upload
    skyC.width=0;skyC.height=0;
    // Procedural sky sphere used as fallback only — hidden when HDRI background loads
    const skySphere=new THREE.Mesh(skyGeo,new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide}));
    scene.add(skySphere);

    const camera=new THREE.PerspectiveCamera(32,w/h,0.1,600);
    const ren=new THREE.WebGLRenderer({antialias:false,powerPreference:"high-performance"});ren.setSize(w,h);ren.setPixelRatio(Math.min(window.devicePixelRatio,2));
    ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=2.4*dlPreset.exposure;
    ren.outputColorSpace=THREE.SRGBColorSpace;
    el.appendChild(ren.domElement);

    // Cache root font size for rem calculations in render loop (avoid per-frame getComputedStyle)
    let cachedRem=parseFloat(getComputedStyle(document.documentElement).fontSize);

    // ── ENVIRONMENT MAP (IBL) — procedural immediate, real HDRI async ──
    const envMapProc=createExteriorEnvMap(ren,{sunIntensity:0.9*dlPreset.sunIntensity,skyBrightness:0.7*dlPreset.envBrightness/0.45});
    scene.environment=envMapProc;
    scene.environmentIntensity=0.6;
    let envMapHDRI: THREE.Texture|null=null;
    loadHDRI(ren,HDRI_EXTERIOR).then((hdr)=>{envMapHDRI=hdr;scene.environment=hdr;scene.environmentIntensity=0.7;}).catch(()=>{});
    // Load Rolling Hills HDRI as background panorama — warm sunrise over dry grassy hilltops (Tuscan feel)
    loadHDRI(ren,HDRI_TUSCAN_LANDSCAPE).then((hdr)=>{scene.background=hdr;scene.backgroundIntensity=0.4;scene.backgroundBlurriness=0.03;skySphere.visible=false;}).catch(()=>{});

    // ── POST-PROCESSING ──
    // On mobile, drop SSAO + DOF: they require an extra NormalPass + DOF passes
    // and roughly double first-frame compile time + per-frame cost. The visual
    // hit is minimal at small viewport sizes.
    const _ppMobile = window.innerWidth < 768 || window.innerHeight < 500;
    const composer=createPostProcessing(ren,scene,camera,"exterior", _ppMobile ? { ssao: false, dof: false } : undefined);

    // ── REAL PBR TEXTURES ──
    const stoneTex=loadPlasterWallTextures([4,4]);
    const wornPlasterTex=loadWornPlasterTextures([3,3]);
    const clayPlasterTex=loadClayPlasterTextures([2,2]);
    const paintedPlasterTex=loadPlasterWallTextures([2,2]);
    const roofTileTex=loadTerracottaTileTextures([3,3]);
    const woodDoorTex=loadDarkWoodTextures([2,3]);
    const grassTex=loadGrassTextures([12,12]);
    const groundTex=loadGroundTextures([8,8]);
    const cropTex=loadCropTextures([6,6]);
    const whiteGravelTex=loadWhiteGravelTextures([4,4]);
    const roadTex=loadGravelRoadTextures([3,3]);
    const allTexSets: PBRTextureSet[]=[stoneTex,wornPlasterTex,clayPlasterTex,paintedPlasterTex,roofTileTex,woodDoorTex,grassTex,groundTex,cropTex,whiteGravelTex,roadTex];

    // Hover label overlay
    const hovLabel=document.createElement("div");
    hovLabel.style.cssText="position:absolute;display:none;pointer-events:none;z-index:10;transform:translate(-50%,-100%);font-family:'Cormorant Garamond',serif;font-size:1.375rem;font-weight:600;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.6),0 0 30px rgba(42,34,24,.5);padding:0.5rem 1.25rem;background:rgba(42,34,24,0.85);border-radius:0.75rem;backdrop-filter:blur(6px);white-space:nowrap;border:1px solid rgba(255,255,255,.2);";
    el.appendChild(hovLabel);

    // Dramatic golden-hour lighting
    scene.add(new THREE.HemisphereLight(dlPreset.ambientColor,"#8A7858",0.6*dlPreset.ambientIntensity/0.5));
    const sun=new THREE.DirectionalLight(dlPreset.sunColor,3.2*dlPreset.sunIntensity);sun.position.set(dlPreset.sunPosition[0],dlPreset.sunPosition[1],dlPreset.sunPosition[2]);sun.castShadow=true;
    const shadowRes=window.innerWidth>=768?2048:1024;sun.shadow.mapSize.set(shadowRes,shadowRes);sun.shadow.camera.near=1;sun.shadow.camera.far=200;
    sun.shadow.camera.left=-80;sun.shadow.camera.right=80;sun.shadow.camera.top=80;sun.shadow.camera.bottom=-80;sun.shadow.bias=-0.0003;scene.add(sun);
    const fill=new THREE.DirectionalLight(dlPreset.fillColor,0.4*dlPreset.fillIntensity/0.35);fill.position.set(-25,20,-15);scene.add(fill);
    const rim=new THREE.DirectionalLight(dlPreset.sunColor,0.8*dlPreset.sunIntensity);rim.position.set(-15,30,30);scene.add(rim);
    // Warm uplight for drama
    const uplight=new THREE.PointLight(dlPreset.fillColor,.4*dlPreset.fillIntensity/0.35,80);uplight.position.set(0,2,0);scene.add(uplight);
    const porticoWarm=new THREE.SpotLight("#FFE0A0",0.3,60,Math.PI*0.3);porticoWarm.position.set(0,2,-20);porticoWarm.target.position.set(0,5,0);scene.add(porticoWarm);scene.add(porticoWarm.target);

    const M={
      // ── WALLS — warm golden Tuscan ochre stucco with subtle plaster normalMap
      stone:new THREE.MeshStandardMaterial({color:"#FFDD78",roughness:.72,metalness:0,envMapIntensity:.65,map:paintedPlasterTex.map,normalMap:clayPlasterTex.normalMap,normalScale:new THREE.Vector2(.9,.9),roughnessMap:clayPlasterTex.roughnessMap}),
      stoneL:new THREE.MeshStandardMaterial({color:"#FFE898",roughness:.65,metalness:0,envMapIntensity:.65,map:paintedPlasterTex.map,normalMap:clayPlasterTex.normalMap,normalScale:new THREE.Vector2(.8,.8),roughnessMap:clayPlasterTex.roughnessMap}),
      stoneW:new THREE.MeshStandardMaterial({color:"#FFD468",roughness:.70,metalness:0,envMapIntensity:.65,map:paintedPlasterTex.map,normalMap:clayPlasterTex.normalMap,normalScale:new THREE.Vector2(.95,.95),roughnessMap:clayPlasterTex.roughnessMap}),
      stoneD:new THREE.MeshStandardMaterial({color:"#FFCC58",roughness:.75,metalness:0,envMapIntensity:.6,map:paintedPlasterTex.map,normalMap:clayPlasterTex.normalMap,normalScale:new THREE.Vector2(.95,.95),roughnessMap:clayPlasterTex.roughnessMap}),
      stoneDk:new THREE.MeshStandardMaterial({color:"#D8B050",roughness:.82,metalness:0,map:paintedPlasterTex.map,normalMap:clayPlasterTex.normalMap,normalScale:new THREE.Vector2(1,1),roughnessMap:clayPlasterTex.roughnessMap}),
      // ── TRIM — pietra serena (cool blue-grey sandstone) & aged gold
      trim:new THREE.MeshStandardMaterial({color:"#EDE4D4",roughness:.60,metalness:0,envMapIntensity:.6,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.15,.15)}),
      gold:new THREE.MeshPhysicalMaterial({color:"#B8973A",roughness:.35,metalness:.92,emissive:"#3D3010",emissiveIntensity:.08,clearcoat:.15,clearcoatRoughness:.4,envMapIntensity:1.0}),
      goldBright:new THREE.MeshPhysicalMaterial({color:"#CFB53B",roughness:.18,metalness:.95,emissive:"#4A3A10",emissiveIntensity:.12,clearcoat:.35,clearcoatRoughness:.08,envMapIntensity:1.5}),
      bronze:new THREE.MeshPhysicalMaterial({color:"#6B5238",roughness:.3,metalness:.82,emissive:"#2A1E10",emissiveIntensity:.06,clearcoat:.2,clearcoatRoughness:.3,envMapIntensity:1.0}),
      copper:new THREE.MeshPhysicalMaterial({color:"#5A9A80",roughness:.55,metalness:.30,emissive:"#1A3028",emissiveIntensity:.05,clearcoat:0,envMapIntensity:.7}),
      // ── ROOFS — aged terracotta coppo tiles with PBR textures (muted brown)
      roof:new THREE.MeshStandardMaterial({color:"#A87860",roughness:.82,metalness:0,map:roofTileTex.map,normalMap:roofTileTex.normalMap,normalScale:new THREE.Vector2(.5,.5),roughnessMap:roofTileTex.roughnessMap,aoMap:roofTileTex.aoMap,aoMapIntensity:.4,envMapIntensity:.3}),
      roofD:new THREE.MeshStandardMaterial({color:"#7A6458",roughness:.88,metalness:0,map:roofTileTex.map,normalMap:roofTileTex.normalMap,normalScale:new THREE.Vector2(.4,.4),roughnessMap:roofTileTex.roughnessMap,envMapIntensity:.2}),
      roofSlate:new THREE.MeshStandardMaterial({color:"#6B7D6E",roughness:.45,metalness:.25,envMapIntensity:.5}),
      tile:new THREE.MeshStandardMaterial({color:"#B07858",roughness:.78,metalness:0,map:roofTileTex.map,normalMap:roofTileTex.normalMap,normalScale:new THREE.Vector2(.6,.6),roughnessMap:roofTileTex.roughnessMap,aoMap:roofTileTex.aoMap,aoMapIntensity:.3}),
      // ── COLUMNS — warm cream travertine (lower roughness = polished)
      col:new THREE.MeshStandardMaterial({color:"#E8DCC0",roughness:.48,metalness:0,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.15,.15),envMapIntensity:.8}),
      marble:new THREE.MeshStandardMaterial({color:"#E0D8C8",roughness:.52,metalness:0,envMapIntensity:.25}),
      marbleVein:new THREE.MeshStandardMaterial({color:"#D8D0C0",roughness:.58,metalness:0,envMapIntensity:.25}),
      // ── WINDOWS — old glass with warm interior glow (IOR 1.52 = soda-lime glass)
      win:new THREE.MeshPhysicalMaterial({color:"#FFF8E7",emissive:"#FFAA44",emissiveIntensity:.25,roughness:.08,transparent:true,opacity:.7,transmission:.6,ior:1.52}),
      winBlue:new THREE.MeshPhysicalMaterial({color:"#D8E8F0",emissive:"#88AACC",emissiveIntensity:.12,roughness:.1,transparent:true,opacity:.65,transmission:.5,ior:1.52}),
      // ── WOODWORK — aged walnut/chestnut with grain textures
      door:new THREE.MeshStandardMaterial({color:"#5C3A1E",roughness:.65,metalness:0,map:woodDoorTex.map,normalMap:woodDoorTex.normalMap,normalScale:new THREE.Vector2(.4,.4),roughnessMap:woodDoorTex.roughnessMap,aoMap:woodDoorTex.aoMap,aoMapIntensity:.5}),
      doorRich:new THREE.MeshStandardMaterial({color:"#6B4226",roughness:.6,metalness:0,map:woodDoorTex.map,normalMap:woodDoorTex.normalMap,normalScale:new THREE.Vector2(.3,.3),roughnessMap:woodDoorTex.roughnessMap,aoMap:woodDoorTex.aoMap,aoMapIntensity:.4}),
      // Nature — muted sage and earth tones
      grass:new THREE.MeshStandardMaterial({color:"#6A7E4A",roughness:.86}),
      grassL:new THREE.MeshStandardMaterial({color:"#7A8C58",roughness:.88}),
      grassD:new THREE.MeshStandardMaterial({color:"#5A7040",roughness:.85}),
      grassRich:new THREE.MeshStandardMaterial({color:"#5A6E3A",roughness:.86}),
      water:new THREE.MeshStandardMaterial({color:"#5A7A80",roughness:.7,metalness:0,transparent:true,opacity:.4,envMapIntensity:.1}),
      waterDeep:new THREE.MeshStandardMaterial({color:"#4A6068",roughness:.8,metalness:0,transparent:true,opacity:.5,envMapIntensity:.1}),
      path:new THREE.MeshStandardMaterial({color:"#D8C8A8",roughness:.82,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      pathD:new THREE.MeshStandardMaterial({color:"#C0B090",roughness:.78,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.2,.2)}),
      hedge:new THREE.MeshStandardMaterial({color:"#2E4A22",roughness:.88}),
      hedgeL:new THREE.MeshStandardMaterial({color:"#3A5A2C",roughness:.86}),
      flower:new THREE.MeshStandardMaterial({color:"#B8788A",roughness:.82}),
      flowerY:new THREE.MeshStandardMaterial({color:"#C8A848",roughness:.82}),
      flowerW:new THREE.MeshStandardMaterial({color:"#E8DDD0",roughness:.82}),
      flowerLav:new THREE.MeshStandardMaterial({color:"#8A7098",roughness:.82}),
      bark:new THREE.MeshStandardMaterial({color:"#6A5438",roughness:.7,normalMap:woodDoorTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      barkD:new THREE.MeshStandardMaterial({color:"#5A4428",roughness:.72,normalMap:woodDoorTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      ivy:new THREE.MeshStandardMaterial({color:"#3A6030",roughness:.8}),
    };

    // Helper to build a tower with conical roof
    const buildTower=(parent: THREE.Group|THREE.Object3D,x: number,z: number,radius: number,height: number,roofH: number,mat: THREE.Material,roofMat: THREE.Material)=>{
      // Tower body (cylinder)
      const body=mk(new THREE.CylinderGeometry(radius,radius+.2,height,16),mat,x,height/2+2.3,z);body.castShadow=true;parent.add(body);
      // Stone band at base
      parent.add(mk(new THREE.CylinderGeometry(radius+.3,radius+.4,.6,16),M.stoneD,x,2.6,z));
      // Stone band at top
      parent.add(mk(new THREE.CylinderGeometry(radius+.25,radius+.15,.4,16),M.trim,x,height+2.1,z));
      // Battlement ring
      parent.add(mk(new THREE.CylinderGeometry(radius+.35,radius+.35,.3,16),M.stoneD,x,height+2.4,z));
      // Crenellations
      for(let ci=0;ci<8;ci++){
        const ca=(ci/8)*Math.PI*2;
        parent.add(mk(new THREE.BoxGeometry(.4,.6,.3),M.stoneD,x+Math.cos(ca)*(radius+.2),height+2.8,z+Math.sin(ca)*(radius+.2)));
      }
      // Conical roof
      const cone=mk(new THREE.ConeGeometry(radius+.6,roofH,16),roofMat,x,height+2.4+roofH/2,z);cone.castShadow=true;parent.add(cone);
      // Roof finial
      parent.add(mk(new THREE.SphereGeometry(.2,8,8),M.goldBright,x,height+2.4+roofH+.15,z));
      parent.add(mk(new THREE.CylinderGeometry(.05,.05,.6,6),M.gold,x,height+2.4+roofH+.5,z));
      // Small flag
      parent.add(mk(new THREE.PlaneGeometry(.6,.35),M.tile,x+.3,height+2.4+roofH+.8,z));
      // Windows (Gothic arched — approximated)
      for(let wi=0;wi<4;wi++){
        const wa=(wi/4)*Math.PI*2;const wr=radius+.05;
        const wm=mk(new THREE.BoxGeometry(.05,1.4,.6),M.win,x+Math.cos(wa)*wr,height*.55+2.3,z+Math.sin(wa)*wr);
        wm.rotation.y=wa;parent.add(wm);
        // Window frame / pointed arch
        const wf=mk(new THREE.BoxGeometry(.08,1.6,.7),M.trim,x+Math.cos(wa)*(wr+.02),height*.55+2.3,z+Math.sin(wa)*(wr+.02));
        wf.rotation.y=wa;parent.add(wf);
        // Arch point above window
        const ap=mk(new THREE.ConeGeometry(.35,.5,3),M.trim,x+Math.cos(wa)*(wr+.02),height*.55+3.2,z+Math.sin(wa)*(wr+.02));
        ap.rotation.y=wa;ap.rotation.x=Math.PI;parent.add(ap);
      }
      return body;
    };

    // Helper: Gothic arched window on a flat wall
    const gothicWindow=(parent: THREE.Group|THREE.Object3D,x: number,y: number,z: number,rotY: number,scale: number)=>{
      const wg=new THREE.Group();
      wg.add(mk(new THREE.BoxGeometry(.08,1.8*scale,.7*scale),M.win,0,0,0));
      wg.add(mk(new THREE.BoxGeometry(.1,2*scale,.8*scale),M.trim,0,0,-.01));
      wg.add(mk(new THREE.ConeGeometry(.42*scale,.55*scale,3),M.trim,0,1.1*scale,-.01));
      wg.add(mk(new THREE.ConeGeometry(.38*scale,.5*scale,3),M.win,0,1.1*scale,0));
      // Mullion cross
      wg.add(mk(new THREE.BoxGeometry(.1,.04*scale,.5*scale),M.stoneD,0,.1*scale,.01));
      wg.add(mk(new THREE.BoxGeometry(.1,1.4*scale,.04),M.stoneD,0,0,.01));
      wg.position.set(x,y,z);wg.rotation.y=rotY;
      parent.add(wg);
    };

    // ── TERRAIN — Continuous rolling Tuscan hills (single displaced mesh) ──
    const HILL_Y = 8; // Palace hill elevation
    const terrain = createTuscanTerrain(scene, {
      cropMap: cropTex.map, cropNormal: cropTex.normalMap, cropRoughness: cropTex.roughnessMap,
    });
    // Cobblestone courtyard — completely matte to avoid specular glare
    const courtyardMat = new THREE.MeshStandardMaterial({ color: "#C8B898", roughness: 0.92, metalness: 0, map: groundTex.map, normalMap: groundTex.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: groundTex.roughnessMap });
    const cyGeo = new THREE.CircleGeometry(39, 64);
    cyGeo.rotateX(-Math.PI / 2);
    const cyMesh = new THREE.Mesh(cyGeo, courtyardMat);
    cyMesh.position.y = HILL_Y + 0.35;
    cyMesh.receiveShadow = true;
    scene.add(cyMesh);
    // Decorative courtyard rings — cobblestone pattern
    scene.add(mk(new THREE.TorusGeometry(28,.12,8,48),M.stoneD,0,HILL_Y+.42,0));
    scene.add(mk(new THREE.TorusGeometry(20,.08,4,48),M.stoneD,0,HILL_Y+.38,0));
    scene.add(mk(new THREE.TorusGeometry(14,.06,4,36),M.stoneD,0,HILL_Y+.38,0));
    // Compass rose / medallion at courtyard centre
    const medallion = new THREE.Mesh(new THREE.CircleGeometry(2,16),M.goldBright);
    medallion.rotation.x = -Math.PI/2;
    medallion.position.set(0,HILL_Y+0.4,0);
    scene.add(medallion);

    const palace=new THREE.Group(),clickTargets: THREE.Mesh[]=[];
    palace.position.y=HILL_Y+0.3; // Elevate palace slightly above terrain to prevent clipping
    // Track each section group for split/lift animation: {group, id, targetY, currentY, meshes}
    const sectionGroups: {group:THREE.Group,id:string,targetY:number,currentY:number,meshes:THREE.Mesh[],accent:string}[]=[];

    const isRenaissance = styleEra === "renaissance";

    // Shared variables for entrance click target (assigned inside era branch)
    let centralGroup: THREE.Group;
    let centralBodyMeshes: THREE.Mesh[];
    let entranceCoreMeshes: THREE.Mesh[];
    let entrClickRadius = 10, entrClickHeight = 20;

    // Collect standalone materials/geometries for explicit cleanup
    const extraDisposables: THREE.Material[] = [];
    const extraGeoDisposables: THREE.BufferGeometry[] = [];

    // ═══ RENAISSANCE PALAZZO — alternative to castle when era is "renaissance" ═══
    if (isRenaissance) {
      centralGroup = new THREE.Group();
      centralBodyMeshes = [];
      // Rusticated 3-story palazzo
      const pzW = 28, pzD = 18, pzH = 14;
      // Base plinth
      centralGroup.add(mk(new THREE.BoxGeometry(pzW + 4, 1.2, pzD + 4), M.stoneD, 0, 0.6, 0));

      // Main building body
      centralGroup.add(mk(new THREE.BoxGeometry(pzW, pzH, pzD), M.stone, 0, pzH / 2 + 1.2, 0));

      // Rustication grooves (horizontal lines on facade)
      for (let gy = 0; gy < 6; gy++) {
        const by = 2.5 + gy * 2;
        centralGroup.add(mk(new THREE.BoxGeometry(pzW + 0.3, 0.08, pzD + 0.3), M.stoneD, 0, by, 0));
      }

      // Heavy cornice at top
      centralGroup.add(mk(new THREE.BoxGeometry(pzW + 2, 0.6, pzD + 2), M.trim, 0, pzH + 1.4, 0));
      centralGroup.add(mk(new THREE.BoxGeometry(pzW + 2.5, 0.25, pzD + 2.5), M.gold, 0, pzH + 1.8, 0));
      // Cornice brackets
      for (let bi = 0; bi < 20; bi++) {
        const bx = -pzW / 2 + 1.5 + bi * (pzW - 3) / 19;
        centralGroup.add(mk(new THREE.BoxGeometry(0.3, 0.5, 0.4), M.trim, bx, pzH + 1.0, -(pzD / 2 + 0.01)));
        centralGroup.add(mk(new THREE.BoxGeometry(0.3, 0.5, 0.4), M.trim, bx, pzH + 1.0, (pzD / 2 + 0.01)));
      }

      // Ground-floor loggia — open arcade with round arches (front)
      const archCount = 7;
      for (let ai = 0; ai < archCount; ai++) {
        const ax = -pzW / 2 + 2.5 + ai * (pzW - 5) / (archCount - 1);
        // Columns
        centralGroup.add(mk(new THREE.CylinderGeometry(0.35, 0.4, 4.5, 10), M.col, ax, 3.45, -(pzD / 2 - 0.1)));
        centralGroup.add(mk(new THREE.BoxGeometry(0.9, 0.2, 0.9), M.trim, ax, 5.8, -(pzD / 2 - 0.1)));
        // Round arch between columns
        if (ai < archCount - 1) {
          const archMid = ax + (pzW - 5) / (archCount - 1) / 2;
          const archGeo = new THREE.TorusGeometry(1.2, 0.12, 8, 12, Math.PI);
          const archMesh = new THREE.Mesh(archGeo, M.trim);
          archMesh.position.set(archMid, 5.6, -(pzD / 2 - 0.05));
          centralGroup.add(archMesh);
        }
      }

      // Windows — grid pattern on floors 2-3 with pietra serena surrounds
      for (let floor = 0; floor < 2; floor++) {
        const wy = 7 + floor * 3.5;
        for (let wi = 0; wi < 8; wi++) {
          const wx = -pzW / 2 + 2 + wi * (pzW - 4) / 7;
          // Window — 4 panes separated by dark frame bars (visible cross pattern)
          { const wGap = 0.12, pW = (1.4 - wGap) / 2, pH = (2 - wGap) / 2, wz0 = -(pzD / 2 + 0.05);
            // 4 glass panes
            centralGroup.add(mk(new THREE.BoxGeometry(pW, pH, 0.12), M.win, wx - pW / 2 - wGap / 2, wy + pH / 2 + wGap / 2, wz0));
            centralGroup.add(mk(new THREE.BoxGeometry(pW, pH, 0.12), M.win, wx + pW / 2 + wGap / 2, wy + pH / 2 + wGap / 2, wz0));
            centralGroup.add(mk(new THREE.BoxGeometry(pW, pH, 0.12), M.win, wx - pW / 2 - wGap / 2, wy - pH / 2 - wGap / 2, wz0));
            centralGroup.add(mk(new THREE.BoxGeometry(pW, pH, 0.12), M.win, wx + pW / 2 + wGap / 2, wy - pH / 2 - wGap / 2, wz0));
            // Dark frame cross (behind = dark void)
            centralGroup.add(mk(new THREE.BoxGeometry(0.12, 2.1, 0.20), M.stoneDk, wx, wy, wz0 + 0.02));
            centralGroup.add(mk(new THREE.BoxGeometry(1.5, 0.12, 0.20), M.stoneDk, wx, wy, wz0 + 0.02));
          }
          // Window surround (pietra serena)
          centralGroup.add(mk(new THREE.BoxGeometry(1.8, 0.15, 0.2), M.trim, wx, wy + 1.1, -(pzD / 2 + 0.02)));
          centralGroup.add(mk(new THREE.BoxGeometry(1.8, 0.15, 0.2), M.trim, wx, wy - 1.1, -(pzD / 2 + 0.02)));
          // Back windows — same 4-pane pattern
          { const wGap = 0.12, pW = (1.4 - wGap) / 2, pH = (2 - wGap) / 2, wz0 = (pzD / 2 + 0.05);
            centralGroup.add(mk(new THREE.BoxGeometry(pW, pH, 0.12), M.win, wx - pW / 2 - wGap / 2, wy + pH / 2 + wGap / 2, wz0));
            centralGroup.add(mk(new THREE.BoxGeometry(pW, pH, 0.12), M.win, wx + pW / 2 + wGap / 2, wy + pH / 2 + wGap / 2, wz0));
            centralGroup.add(mk(new THREE.BoxGeometry(pW, pH, 0.12), M.win, wx - pW / 2 - wGap / 2, wy - pH / 2 - wGap / 2, wz0));
            centralGroup.add(mk(new THREE.BoxGeometry(pW, pH, 0.12), M.win, wx + pW / 2 + wGap / 2, wy - pH / 2 - wGap / 2, wz0));
            centralGroup.add(mk(new THREE.BoxGeometry(0.12, 2.1, 0.20), M.stoneDk, wx, wy, wz0 - 0.02));
            centralGroup.add(mk(new THREE.BoxGeometry(1.5, 0.12, 0.20), M.stoneDk, wx, wy, wz0 - 0.02));
          }
          // Side windows
          if (wi < 4) {
            for (const sx of [-(pzW / 2 + 0.05), (pzW / 2 + 0.05)]) {
              const dir = sx > 0 ? 1 : -1;
              const wGap = 0.12, pW = (1.4 - wGap) / 2, pH = (2 - wGap) / 2, sz = -pzD / 2 + 2 + wi * 4;
              centralGroup.add(mk(new THREE.BoxGeometry(0.12, pH, pW), M.win, sx, wy + pH / 2 + wGap / 2, sz - pW / 2 - wGap / 2));
              centralGroup.add(mk(new THREE.BoxGeometry(0.12, pH, pW), M.win, sx, wy + pH / 2 + wGap / 2, sz + pW / 2 + wGap / 2));
              centralGroup.add(mk(new THREE.BoxGeometry(0.12, pH, pW), M.win, sx, wy - pH / 2 - wGap / 2, sz - pW / 2 - wGap / 2));
              centralGroup.add(mk(new THREE.BoxGeometry(0.12, pH, pW), M.win, sx, wy - pH / 2 - wGap / 2, sz + pW / 2 + wGap / 2));
              centralGroup.add(mk(new THREE.BoxGeometry(0.20, 2.1, 0.12), M.stoneDk, sx + dir * 0.02, wy, sz));
              centralGroup.add(mk(new THREE.BoxGeometry(0.20, 0.12, 1.5), M.stoneDk, sx + dir * 0.02, wy, sz));
            }
          }
        }
      }

      // Grand entrance — arched double doors
      centralGroup.add(mk(new THREE.BoxGeometry(4.5, 6, 0.3), M.doorRich, 0, 4.2, -(pzD / 2 + 0.1)));
      centralGroup.add(mk(new THREE.BoxGeometry(5, 6.5, 0.15), M.trim, 0, 4.5, -(pzD / 2 + 0.02)));
      // Semicircular arch above door
      const entranceArch = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.15, 8, 16, Math.PI), M.trim);
      entranceArch.position.set(0, 7.2, -(pzD / 2 + 0.02));
      centralGroup.add(entranceArch);
      // Coat of arms above entrance
      centralGroup.add(mk(new THREE.CircleGeometry(1, 24), M.goldBright, 0, 9.5, -(pzD / 2 + 0.08)));
      centralGroup.add(mk(new THREE.TorusGeometry(1, 0.08, 8, 24), M.gold, 0, 9.5, -(pzD / 2 + 0.06)));

      // Low-pitched roof (barely visible)
      centralGroup.add(mk(new THREE.BoxGeometry(pzW + 1, 0.3, pzD + 1), M.roofSlate, 0, pzH + 2.1, 0));

      // ── BRUNELLESCHI-STYLE DOME ──
      const domeBaseY = pzH + 2.1;
      // Octagonal drum
      const bDrumR = 5, bDrumH = 4;
      centralGroup.add(mk(new THREE.CylinderGeometry(bDrumR, bDrumR, bDrumH, 8), M.stoneD, 0, domeBaseY + bDrumH / 2, 0));
      // Drum cornice
      centralGroup.add(mk(new THREE.CylinderGeometry(bDrumR + 0.3, bDrumR + 0.3, 0.25, 8), M.trim, 0, domeBaseY + bDrumH + 0.12, 0));
      // Drum windows (8 round openings)
      for (let dw = 0; dw < 8; dw++) {
        const da = (dw / 8) * Math.PI * 2;
        centralGroup.add(mk(new THREE.CylinderGeometry(0.6, 0.6, 0.15, 12), M.win,
          Math.cos(da) * (bDrumR + 0.05), domeBaseY + bDrumH * 0.55, Math.sin(da) * (bDrumR + 0.05)));
      }
      // Ribbed dome (terracotta tile cap)
      const bDomeR = 6;
      const bDome = new THREE.Mesh(
        new THREE.SphereGeometry(bDomeR, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.45),
        M.tile
      );
      bDome.position.set(0, domeBaseY + bDrumH + 0.2, 0);
      bDome.castShadow = true;
      centralGroup.add(bDome);
      // 8 structural ribs along octagonal edges
      for (let ri = 0; ri < 8; ri++) {
        const ra = (ri / 8) * Math.PI * 2;
        for (let rj = 0; rj < 10; rj++) {
          const phi = (rj / 22) * Math.PI;
          const rx = Math.cos(ra) * (bDomeR + 0.08) * Math.sin(phi);
          const ry = bDomeR * Math.cos(phi);
          const rz = Math.sin(ra) * (bDomeR + 0.08) * Math.sin(phi);
          centralGroup.add(mk(new THREE.BoxGeometry(0.15, 0.15, 0.15), M.trim,
            rx, domeBaseY + bDrumH + 0.2 + ry, rz));
        }
      }
      // Lantern
      const lanternBaseY = domeBaseY + bDrumH + 0.2 + bDomeR * Math.cos(Math.PI * 0.45 * 0.5);
      // Lantern drum
      centralGroup.add(mk(new THREE.CylinderGeometry(1.2, 1.4, 2.2, 8), M.stoneL, 0, domeBaseY + bDrumH + bDomeR * 0.9, 0));
      // Lantern windows
      for (let lw = 0; lw < 8; lw++) {
        const la = (lw / 8) * Math.PI * 2;
        centralGroup.add(mk(new THREE.BoxGeometry(0.05, 0.9, 0.35), M.win,
          Math.cos(la) * 1.25, domeBaseY + bDrumH + bDomeR * 0.9, Math.sin(la) * 1.25));
      }
      // Lantern cone roof
      centralGroup.add(mk(new THREE.ConeGeometry(1.0, 2.0, 8), M.roofSlate, 0, domeBaseY + bDrumH + bDomeR * 0.9 + 2.2, 0));
      // Gold ball finial
      centralGroup.add(mk(new THREE.SphereGeometry(0.35, 8, 8), M.goldBright, 0, domeBaseY + bDrumH + bDomeR * 0.9 + 3.5, 0));
      // Cross atop
      centralGroup.add(mk(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), M.goldBright, 0, domeBaseY + bDrumH + bDomeR * 0.9 + 4.1, 0));
      centralGroup.add(mk(new THREE.BoxGeometry(0.5, 0.06, 0.06), M.goldBright, 0, domeBaseY + bDrumH + bDomeR * 0.9 + 4.3, 0));

      centralGroup.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material && !(child.material as any).transparent) centralBodyMeshes.push(child);
      });
      entranceCoreMeshes = [...centralBodyMeshes]; // Renaissance: same as full set
      palace.add(centralGroup);
      entrClickRadius = 14; entrClickHeight = 16;

      // ═══ 5 RENAISSANCE WINGS — connected galleries ═══
      const wingDefs = [{ room: WINGS[0], length: 24 }, { room: WINGS[1], length: 22 }, { room: WINGS[2], length: 20 }, { room: WINGS[3], length: 21 }, { room: WINGS[4], length: 23 }];
      wingDefs.forEach((def, i) => {
        const angle = (i / 5) * Math.PI * 2;
        const wg = new THREE.Group();
        const wW = 5.5, wH = 10, wL = def.length;
        const wingMeshes: THREE.Mesh[] = [];
        function addM(m: any) { wg.add(m); if (m.material && !m.material.transparent) wingMeshes.push(m); return m; }

        // Stone foundation plinth — visible base that grounds the wing
        addM(mk(new THREE.BoxGeometry(wW + 1.5, 1.5, wL + 1), M.stoneD, 0, 0.55, -(pzD / 2 + wL / 2)));
        addM(mk(new THREE.BoxGeometry(wW + 1.8, 0.3, wL + 1.3), M.stoneDk, 0, -0.15, -(pzD / 2 + wL / 2)));
        // Gallery body
        addM(mk(new THREE.BoxGeometry(wW, wH, wL), M.stoneL, 0, wH / 2 + 1.2, -(pzD / 2 + wL / 2)));
        // Rustication
        for (let gy = 0; gy < 4; gy++) {
          addM(mk(new THREE.BoxGeometry(wW + 0.2, 0.06, wL + 0.2), M.stoneD, 0, 2.5 + gy * 2.5, -(pzD / 2 + wL / 2)));
        }
        // Arched windows along gallery
        const nWins = Math.floor(wL / 3);
        for (let wi = 0; wi < nWins; wi++) {
          const wz = -(pzD / 2 + 2 + wi * 3);
          for (let s = -1; s <= 1; s += 2) {
            const wx = s * (wW / 2 + 0.05);
            // Window — 4 panes with dark frame cross
            { const wy2 = wH * 0.5 + 1.2, wGap = 0.12, pZ = (1.2 - wGap) / 2, pH2 = (2.2 - wGap) / 2;
              addM(mk(new THREE.BoxGeometry(0.12, pH2, pZ), M.win, wx, wy2 + pH2 / 2 + wGap / 2, wz - pZ / 2 - wGap / 2));
              addM(mk(new THREE.BoxGeometry(0.12, pH2, pZ), M.win, wx, wy2 + pH2 / 2 + wGap / 2, wz + pZ / 2 + wGap / 2));
              addM(mk(new THREE.BoxGeometry(0.12, pH2, pZ), M.win, wx, wy2 - pH2 / 2 - wGap / 2, wz - pZ / 2 - wGap / 2));
              addM(mk(new THREE.BoxGeometry(0.12, pH2, pZ), M.win, wx, wy2 - pH2 / 2 - wGap / 2, wz + pZ / 2 + wGap / 2));
              // Dark frame cross (behind glass = visible through gap)
              const dir2 = s > 0 ? 1 : -1;
              addM(mk(new THREE.BoxGeometry(0.20, 2.3, 0.12), M.stoneDk, wx - dir2 * 0.02, wy2, wz));
              addM(mk(new THREE.BoxGeometry(0.20, 0.12, 1.3), M.stoneDk, wx - dir2 * 0.02, wy2, wz));
            }
            // Arch above window
            const archGeo = new THREE.TorusGeometry(0.6, 0.06, 6, 10, Math.PI);
            const arch = new THREE.Mesh(archGeo, M.trim);
            arch.position.set(wx, wH * 0.5 + 2.4, wz);
            arch.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
            addM(arch);
          }
        }
        // Cornice
        addM(mk(new THREE.BoxGeometry(wW + 1, 0.35, wL + 0.5), M.trim, 0, wH + 1.35, -(pzD / 2 + wL / 2)));
        // Low roof
        addM(mk(new THREE.BoxGeometry(wW + 0.5, 0.25, wL + 0.3), M.roofSlate, 0, wH + 1.8, -(pzD / 2 + wL / 2)));

        // End pavilion with foundation
        const eW = wW + 3, eD = 6, eH = wH + 2;
        const eZ = -(pzD / 2 + wL + eD / 2);
        addM(mk(new THREE.BoxGeometry(eW + 1.5, 1.5, eD + 1), M.stoneD, 0, 0.55, eZ));
        addM(mk(new THREE.BoxGeometry(eW, eH, eD), M.stone, 0, eH / 2 + 1.2, eZ));
        addM(mk(new THREE.BoxGeometry(eW + 1, 0.4, eD + 1), M.trim, 0, eH + 1.4, eZ));
        // End pavilion windows
        for (let wi = 0; wi < 3; wi++) {
          addM(mk(new THREE.BoxGeometry(1.4, 2, 0.15), M.win, -eW / 2 + 2 + wi * (eW - 4) / 2, eH * 0.5, eZ - eD / 2 - 0.05));
        }
        // End pavilion entrance
        addM(mk(new THREE.BoxGeometry(3, 5, 0.25), M.doorRich, 0, 3.7, eZ - eD / 2 - 0.08));

        wg.rotation.y = angle;
        const att = pzD / 2 + 6;
        wg.position.set(Math.sin(angle) * att, 0, Math.cos(angle) * att);
        palace.add(wg);
        sectionGroups.push({ group: wg, id: def.room.id, targetY: 0, currentY: 0, meshes: wingMeshes, accent: def.room.accent });

        const tLen = pzD / 2 + wL + eD;
        const ct = new THREE.Mesh(new THREE.BoxGeometry(eW + 4, eH + 6, tLen + 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
        ct.position.set(0, eH / 2 + 2, -(tLen + 2) / 2);
        ct.userData = { roomId: def.room.id, wingMeshes, accent: def.room.accent };
        wg.add(ct);
        clickTargets.push(ct);
      });

      // Distance: Arno river
      const arnoGeo = new THREE.PlaneGeometry(200, 15);
      const arnoMat = new THREE.MeshPhysicalMaterial({ color: "#5A8A7A", roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.6, envMapIntensity: 1.0 });
      const arno = new THREE.Mesh(arnoGeo, arnoMat);
      arno.rotation.x = -Math.PI / 2;
      arno.position.set(0, getHeightAt(0,-85)+0.1, -85);
      scene.add(arno);

      // Distant dome silhouette (Duomo-like)
      const distDome = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), M.copper);
      distDome.position.set(-60, 6, -120);
      scene.add(distDome);
      const distDrum = mk(new THREE.CylinderGeometry(7, 7.5, 5, 8), M.stoneD, -60, 3, -120);
      scene.add(distDrum);

    } else {
    // ═══ ROMAN VILLA — authentic Roman compound ═══
    centralGroup = new THREE.Group();
    centralBodyMeshes = [];

    const vW = 20, vD = 18, vH = 7;
    const ochreWall = M.stone; // reuse identical material from M dictionary
    const gardenGreen = new THREE.MeshStandardMaterial({ color: "#4A7A3A", roughness: 0.9 });
    const waterMat = new THREE.MeshStandardMaterial({ color: "#4A7A7A", roughness: 0.7, metalness: 0, transparent: true, opacity: 0.45, envMapIntensity: 0.1 });
    extraDisposables.push(gardenGreen, waterMat);

    // ── Helper: arched window assembly with shutters & deep reveal ──
    const mullionMat = new THREE.MeshStandardMaterial({ color: "#1A1A1A", roughness: 0.9, metalness: 0 });
    const shutterMat = new THREE.MeshStandardMaterial({ color: "#6B7A5A", roughness: 0.75, metalness: 0, map: woodDoorTex.map, normalMap: woodDoorTex.normalMap, normalScale: new THREE.Vector2(0.3, 0.3) });
    extraDisposables.push(mullionMat, shutterMat);
    const addArchedWindow = (parent: THREE.Group | THREE.Object3D, x: number, y: number, z: number, width: number, height: number, facingSide: "x" | "z", mat: THREE.Material) => {
      const archR = width / 2;
      const rectH = height - archR;
      const revealD = 0.25; // deep window reveal
      if (facingSide === "z") {
        const dir = x > 0 ? 1 : -1;
        // Deep reveal recess (dark void behind the glass)
        parent.add(mk(new THREE.BoxGeometry(revealD, rectH + archR * 0.6, width + 0.04), M.stoneDk, x - dir * revealD * 0.4, y + archR * 0.15, z));
        // Glass set back into the reveal
        parent.add(mk(new THREE.BoxGeometry(0.08, rectH, width), M.win, x - dir * revealD * 0.3, y, z));
        // Semicircular arch top
        const archGeo = new THREE.TorusGeometry(archR, 0.07, 8, 16, Math.PI);
        const arch = new THREE.Mesh(archGeo, M.trim);
        arch.position.set(x, y + rectH / 2, z);
        arch.rotation.y = dir === 1 ? -Math.PI / 2 : Math.PI / 2;
        parent.add(arch);
        // Arch glass fill
        const archFillGeo = new THREE.CylinderGeometry(archR - 0.02, archR - 0.02, 0.08, 12, 1, false, 0, Math.PI);
        const archFill = new THREE.Mesh(archFillGeo, M.win);
        archFill.position.set(x - dir * revealD * 0.3, y + rectH / 2, z);
        archFill.rotation.x = Math.PI / 2;
        archFill.rotation.y = dir === 1 ? -Math.PI / 2 : Math.PI / 2;
        parent.add(archFill);
        // Stone surround frame — thicker for more presence
        parent.add(mk(new THREE.BoxGeometry(0.1, rectH + 0.12, width + 0.2), mat, x + dir * 0.02, y, z));
        // Vertical mullion — black, narrow
        parent.add(mk(new THREE.BoxGeometry(0.10, rectH * 0.9, 0.05), mullionMat, x + dir * 0.08, y, z));
        // Horizontal transom
        parent.add(mk(new THREE.BoxGeometry(0.10, 0.05, width * 0.85), mullionMat, x + dir * 0.08, y, z));
        // Keystone — larger, trapezoidal feel
        parent.add(mk(new THREE.BoxGeometry(0.25, 0.2, 0.18), M.trim, x, y + rectH / 2 + archR - 0.05, z));
        // Impost blocks at arch spring points
        parent.add(mk(new THREE.BoxGeometry(0.18, 0.12, 0.12), M.trim, x, y + rectH / 2 - 0.06, z + archR));
        parent.add(mk(new THREE.BoxGeometry(0.18, 0.12, 0.12), M.trim, x, y + rectH / 2 - 0.06, z - archR));
        // Sill ledge — wider and thicker
        parent.add(mk(new THREE.BoxGeometry(0.25, 0.1, width + 0.4), M.trim, x + dir * 0.05, y - rectH / 2 - 0.05, z));
        // Corbels under sill
        parent.add(mk(new THREE.BoxGeometry(0.1, 0.14, 0.1), M.stoneD, x, y - rectH / 2 - 0.17, z + width * 0.3));
        parent.add(mk(new THREE.BoxGeometry(0.1, 0.14, 0.1), M.stoneD, x, y - rectH / 2 - 0.17, z - width * 0.3));
        // Wooden shutters — angled open, one on each side
        const shutterH = rectH * 0.92, shutterW = width * 0.48;
        const sh1 = mk(new THREE.BoxGeometry(0.06, shutterH, shutterW), shutterMat, x + dir * 0.06, y, z + (width / 2 + shutterW * 0.35));
        sh1.rotation.y = dir * 0.35;
        parent.add(sh1);
        const sh2 = mk(new THREE.BoxGeometry(0.06, shutterH, shutterW), shutterMat, x + dir * 0.06, y, z - (width / 2 + shutterW * 0.35));
        sh2.rotation.y = -dir * 0.35;
        parent.add(sh2);
      } else {
        // Window faces along X axis (on Z-facing wall)
        const dir = z > 0 ? 1 : -1;
        // Deep reveal recess
        parent.add(mk(new THREE.BoxGeometry(width + 0.04, rectH + archR * 0.6, revealD), M.stoneDk, x, y + archR * 0.15, z - dir * revealD * 0.4));
        // Glass set back into the reveal
        parent.add(mk(new THREE.BoxGeometry(width, rectH, 0.08), M.win, x, y, z - dir * revealD * 0.3));
        // Semicircular arch top
        const archGeo = new THREE.TorusGeometry(archR, 0.07, 8, 16, Math.PI);
        const arch = new THREE.Mesh(archGeo, M.trim);
        arch.position.set(x, y + rectH / 2, z);
        parent.add(arch);
        // Arch glass fill
        const archFillGeo = new THREE.CylinderGeometry(archR - 0.02, archR - 0.02, 0.08, 12, 1, false, 0, Math.PI);
        const archFill = new THREE.Mesh(archFillGeo, M.win);
        archFill.position.set(x, y + rectH / 2, z - dir * revealD * 0.3);
        archFill.rotation.x = Math.PI / 2;
        parent.add(archFill);
        // Stone surround frame — thicker
        parent.add(mk(new THREE.BoxGeometry(width + 0.2, rectH + 0.12, 0.1), mat, x, y, z + dir * 0.02));
        // Vertical mullion — black, narrow
        parent.add(mk(new THREE.BoxGeometry(0.05, rectH * 0.9, 0.10), mullionMat, x, y, z + dir * 0.08));
        // Horizontal transom
        parent.add(mk(new THREE.BoxGeometry(width * 0.85, 0.05, 0.10), mullionMat, x, y, z + dir * 0.08));
        // Keystone
        parent.add(mk(new THREE.BoxGeometry(0.18, 0.2, 0.25), M.trim, x, y + rectH / 2 + archR - 0.05, z));
        // Impost blocks
        parent.add(mk(new THREE.BoxGeometry(0.12, 0.12, 0.18), M.trim, x + archR, y + rectH / 2 - 0.06, z));
        parent.add(mk(new THREE.BoxGeometry(0.12, 0.12, 0.18), M.trim, x - archR, y + rectH / 2 - 0.06, z));
        // Sill ledge — wider and thicker
        parent.add(mk(new THREE.BoxGeometry(width + 0.4, 0.1, 0.25), M.trim, x, y - rectH / 2 - 0.05, z + dir * 0.05));
        // Corbels under sill
        parent.add(mk(new THREE.BoxGeometry(0.1, 0.14, 0.1), M.stoneD, x + width * 0.3, y - rectH / 2 - 0.17, z));
        parent.add(mk(new THREE.BoxGeometry(0.1, 0.14, 0.1), M.stoneD, x - width * 0.3, y - rectH / 2 - 0.17, z));
        // Wooden shutters — angled open
        const shutterH = rectH * 0.92, shutterW = width * 0.48;
        const sh1 = mk(new THREE.BoxGeometry(shutterW, shutterH, 0.06), shutterMat, x + (width / 2 + shutterW * 0.35), y, z + dir * 0.06);
        sh1.rotation.y = dir * 0.35;
        parent.add(sh1);
        const sh2 = mk(new THREE.BoxGeometry(shutterW, shutterH, 0.06), shutterMat, x - (width / 2 + shutterW * 0.35), y, z + dir * 0.06);
        sh2.rotation.y = -dir * 0.35;
        parent.add(sh2);
      }
    };

    // ══════════════════════════════════════════
    // CENTRAL DOMUS — single story + raised atrium
    // ══════════════════════════════════════════

    // Stepped plinth base
    centralGroup.add(mk(new THREE.BoxGeometry(vW + 6, 0.8, vD + 6), M.stoneD, 0, 0.4, 0));
    centralGroup.add(mk(new THREE.BoxGeometry(vW + 3, 0.5, vD + 3), M.stone, 0, 1.05, 0));

    // Main rectangular body — warm golden ochre
    centralGroup.add(mk(new THREE.BoxGeometry(vW, vH, vD), ochreWall, 0, vH / 2 + 1.3, 0));

    // Horizontal trim bands
    centralGroup.add(mk(new THREE.BoxGeometry(vW + 0.3, 0.15, vD + 0.3), M.trim, 0, vH + 1.3, 0));
    centralGroup.add(mk(new THREE.BoxGeometry(vW + 0.3, 0.15, vD + 0.3), M.trim, 0, 1.3 + vH * 0.5, 0));

    // Arched windows on central domus walls (front and back)
    const waterStainMat = new THREE.MeshStandardMaterial({ color: "#8A7860", roughness: 0.95, transparent: true, opacity: 0.15 });
    for (let wi = 0; wi < 3; wi++) {
      const wx = -6 + wi * 6;
      // Front face (-Z), skip center (entrance)
      if (Math.abs(wx) > 2) {
        addArchedWindow(centralGroup, wx, vH * 0.5 + 1.3, -(vD / 2 + 0.05), 1.4, 2.2, "x", M.trim);
        // Water staining streak below front window
        centralGroup.add(mk(new THREE.BoxGeometry(0.6, 1.0, 0.02), waterStainMat, wx, vH * 0.5 + 1.3 - 1.5, -(vD / 2 + 0.06)));
      }
      // Back face (+Z)
      addArchedWindow(centralGroup, wx, vH * 0.5 + 1.3, (vD / 2 + 0.05), 1.4, 2.2, "x", M.trim);
      // Water staining streak below back window
      centralGroup.add(mk(new THREE.BoxGeometry(0.6, 1.0, 0.02), waterStainMat, wx, vH * 0.5 + 1.3 - 1.5, (vD / 2 + 0.06)));
    }
    // Side arched windows
    for (let wi = 0; wi < 3; wi++) {
      const wz = -5 + wi * 5;
      addArchedWindow(centralGroup, -(vW / 2 + 0.05), vH * 0.5 + 1.3, wz, 1.2, 2.0, "z", M.trim);
      addArchedWindow(centralGroup, (vW / 2 + 0.05), vH * 0.5 + 1.3, wz, 1.2, 2.0, "z", M.trim);
    }

    // Decorative wall panels flanking entrance (front face)
    centralGroup.add(mk(new THREE.BoxGeometry(4, 3, 0.08), M.stoneL, -6, vH * 0.5 + 1.3, -(vD / 2 + 0.02)));
    centralGroup.add(mk(new THREE.BoxGeometry(4, 3, 0.08), M.stoneL,  6, vH * 0.5 + 1.3, -(vD / 2 + 0.02)));

    // (drainpipes removed — too visible/distracting)

    // Shadow line just below main cornice
    centralGroup.add(mk(new THREE.BoxGeometry(vW + 0.5, 0.06, vD + 0.5), new THREE.MeshStandardMaterial({ color: "#6A5E50", roughness: 0.95 }), 0, vH + 1.2, 0));

    // Ivy/vine patches on back wall (+Z face)
    centralGroup.add(mk(new THREE.BoxGeometry(1.5, 2, 0.05), M.ivy, -7,   vH * 0.5 + 1.3 - 0.5, (vD / 2 + 0.03)));
    centralGroup.add(mk(new THREE.BoxGeometry(1.5, 2, 0.05), M.ivy, -5.2, vH * 0.5 + 1.3 + 0.8, (vD / 2 + 0.03)));
    centralGroup.add(mk(new THREE.BoxGeometry(1.5, 2, 0.05), M.ivy,  7.5, vH * 0.5 + 1.3 - 0.3, (vD / 2 + 0.03)));
    centralGroup.add(mk(new THREE.BoxGeometry(1.5, 2, 0.05), M.ivy,  5.8, vH * 0.5 + 1.3 + 1.0, (vD / 2 + 0.03)));

    // ── ENTRANCE VESTIBULUM (Front — 6 Corinthian columns) ──
    const vestZ = -(vD / 2 + 3);
    // Portico platform
    centralGroup.add(mk(new THREE.BoxGeometry(12, 0.4, 7), M.marble, 0, 1.12, vestZ));

    // 6 Corinthian columns
    // Fluting material — subtle dark lines for column grooves
    const fluteMat = new THREE.MeshStandardMaterial({ color: "#C8C0A8", roughness: 0.7, metalness: 0 });
    extraDisposables.push(fluteMat);
    const centralFluteGeo = new THREE.BoxGeometry(0.02, 5.2, 0.06);
    extraGeoDisposables.push(centralFluteGeo);
    for (let ci = 0; ci < 6; ci++) {
      const cx = -5 + ci * 2;
      // Column shaft — thicker radius 0.55
      centralGroup.add(mk(new THREE.CylinderGeometry(0.55, 0.55, 5.5, 16), M.col, cx, 4.3, vestZ));
      // Column fluting — 8 thin dark vertical stripes around circumference
      for (let fl = 0; fl < 8; fl++) {
        const fa = (fl / 8) * Math.PI * 2;
        const stripe = mk(centralFluteGeo, fluteMat,
          cx + Math.cos(fa) * 0.56, 4.3, vestZ + Math.sin(fa) * 0.56);
        stripe.rotation.y = fa;
        centralGroup.add(stripe);
      }
      // Echinus — small cylinder below capital for abacus/echinus effect
      centralGroup.add(mk(new THREE.CylinderGeometry(0.6, 0.55, 0.15, 16), M.trim, cx, 6.775, vestZ));
      // Flared capital — wider box + transitional cylinder
      centralGroup.add(mk(new THREE.BoxGeometry(1.4, 0.3, 1.4), M.trim, cx, 7.15, vestZ));
      centralGroup.add(mk(new THREE.CylinderGeometry(0.7, 0.6, 0.3, 16), M.trim, cx, 6.95, vestZ));
      // Attic base
      centralGroup.add(mk(new THREE.CylinderGeometry(0.6, 0.65, 0.2, 16), M.stoneD, cx, 1.4, vestZ));
      centralGroup.add(mk(new THREE.BoxGeometry(0.9, 0.12, 0.9), M.stoneD, cx, 1.24, vestZ));
    }

    // Dentil molding under entablature — evenly spaced small boxes
    for (let di = 0; di <= 22; di++) {
      const dx = -5.5 + di * 0.5;
      centralGroup.add(mk(new THREE.BoxGeometry(0.15, 0.12, 0.15), M.trim, dx, 7.35, vestZ));
    }

    // Frieze band between entablature and pediment
    centralGroup.add(mk(new THREE.BoxGeometry(12, 0.4, 2.1), M.stoneL, 0, 7.8, vestZ));

    // Marble entablature beam
    centralGroup.add(mk(new THREE.BoxGeometry(12, 0.5, 2), M.marble, 0, 7.55, vestZ));

    // TRIGLYPHS — 6 grooved vertical panels across the frieze area
    for (let ti = 0; ti < 6; ti++) {
      const tx = -5 + ti * 2;
      centralGroup.add(mk(new THREE.BoxGeometry(0.4, 0.5, 0.15), M.trim, tx, 7.6, vestZ - 1.05));
    }

    // Classical triangular pediment — spans full entablature (12 units wide)
    const pedBaseY = 7.9, pedHalfSpan = 6.2, pedAngle = Math.atan2(1.1, pedHalfSpan);
    const pedSlab = Math.sqrt(pedHalfSpan * pedHalfSpan + 1.1 * 1.1) + 0.3; // slab length
    const pedApexY = pedBaseY + 1.1;
    const pedLeft = mk(new THREE.BoxGeometry(pedSlab, 0.28, 2.2), M.marbleVein, -pedHalfSpan / 2, pedBaseY + 0.55, vestZ);
    pedLeft.rotation.z = pedAngle;
    centralGroup.add(pedLeft);
    const pedRight = mk(new THREE.BoxGeometry(pedSlab, 0.28, 2.2), M.marbleVein, pedHalfSpan / 2, pedBaseY + 0.55, vestZ);
    pedRight.rotation.z = -pedAngle;
    centralGroup.add(pedRight);
    // Pediment base beam
    centralGroup.add(mk(new THREE.BoxGeometry(pedHalfSpan * 2 + 1, 0.2, 2.2), M.trim, 0, pedBaseY, vestZ));

    // CORONA / GEISON — projecting cornice shelf
    centralGroup.add(mk(new THREE.BoxGeometry(pedHalfSpan * 2 + 1.2, 0.15, 2.5), M.marble, 0, pedBaseY - 0.15, vestZ));

    // RAKING CORNICE MOLDING — gilded strips along pediment slopes
    const rakLeft = mk(new THREE.BoxGeometry(pedSlab, 0.10, 0.15), M.gold, -pedHalfSpan / 2, pedBaseY + 0.55 + 0.18, vestZ);
    rakLeft.rotation.z = pedAngle;
    centralGroup.add(rakLeft);
    const rakRight = mk(new THREE.BoxGeometry(pedSlab, 0.10, 0.15), M.gold, pedHalfSpan / 2, pedBaseY + 0.55 + 0.18, vestZ);
    rakRight.rotation.z = -pedAngle;
    centralGroup.add(rakRight);

    // Acroterion finials at pediment corners (palmette cones) — with marble bases
    // Center acroterion: base + taller cone
    centralGroup.add(mk(new THREE.BoxGeometry(0.5, 0.3, 0.5), M.marble, 0, pedApexY + 0.3, vestZ));
    centralGroup.add(mk(new THREE.ConeGeometry(0.35, 1.5, 8), M.bronze, 0, pedApexY + 0.85, vestZ));
    // Left corner acroterion: base + cone
    centralGroup.add(mk(new THREE.BoxGeometry(0.4, 0.2, 0.4), M.marble, -pedHalfSpan, pedBaseY, vestZ));
    centralGroup.add(mk(new THREE.ConeGeometry(0.25, 0.8, 8), M.bronze, -pedHalfSpan, pedBaseY + 0.5, vestZ));
    // Right corner acroterion: base + cone
    centralGroup.add(mk(new THREE.BoxGeometry(0.4, 0.2, 0.4), M.marble, pedHalfSpan, pedBaseY, vestZ));
    centralGroup.add(mk(new THREE.ConeGeometry(0.25, 0.8, 8), M.bronze, pedHalfSpan, pedBaseY + 0.5, vestZ));

    // ── Solid triangular tympanum (filled pediment face) with owner's name ──
    {
      // Triangular fill — matches pediment slope exactly
      const tymShape = new THREE.Shape();
      tymShape.moveTo(-pedHalfSpan, 0);
      tymShape.lineTo(pedHalfSpan, 0);
      tymShape.lineTo(0, 1.1);
      tymShape.closePath();
      const tymGeo = new THREE.ShapeGeometry(tymShape);
      const tymMat = new THREE.MeshStandardMaterial({
        color: "#D8B458", roughness: 0.75, metalness: 0,
        side: THREE.DoubleSide, normalMap: clayPlasterTex.normalMap, normalScale: new THREE.Vector2(.6, .6),
      });
      const tymMesh = new THREE.Mesh(tymGeo, tymMat);
      tymMesh.position.set(0, pedBaseY + 0.05, vestZ - 1.11);
      tymMesh.rotation.y = Math.PI; // face outward (-Z, toward entrance)
      centralGroup.add(tymMesh);

      // SCULPTURAL RELIEF — laurel wreath frame in bronze
      const wreathGeo = new THREE.TorusGeometry(1.2, 0.08, 8, 24);
      const wreathMesh = new THREE.Mesh(wreathGeo, M.bronze);
      wreathMesh.position.set(0, 8.65, vestZ - 1.12);
      centralGroup.add(wreathMesh);
      // Ribbon tails at bottom of wreath — two angled crossing strips
      const ribbonL = mk(new THREE.BoxGeometry(0.8, 0.06, 0.15), M.bronze, -0.3, 7.5, vestZ - 1.12);
      ribbonL.rotation.z = 0.35;
      centralGroup.add(ribbonL);
      const ribbonR = mk(new THREE.BoxGeometry(0.8, 0.06, 0.15), M.bronze, 0.3, 7.5, vestZ - 1.12);
      ribbonR.rotation.z = -0.35;
      centralGroup.add(ribbonR);

    }

    // Grand double doors
    centralGroup.add(mk(new THREE.BoxGeometry(4.5, 5.5, 0.25), M.doorRich, 0, 4.3, -(vD / 2 + 0.1)));
    centralGroup.add(mk(new THREE.BoxGeometry(5, 6, 0.12), M.trim, 0, 4.5, -(vD / 2 + 0.02)));
    // Door divider
    centralGroup.add(mk(new THREE.BoxGeometry(0.08, 5.5, 0.12), M.gold, 0, 4.3, -(vD / 2 + 0.2)));
    // Bronze ring handles (TorusGeometry)
    for (let dp = -1; dp <= 1; dp += 2) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 16), M.bronze);
      ring.position.set(dp * 0.7, 4.3, -(vD / 2 + 0.25));
      centralGroup.add(ring);
    }
    // Door panels — two recessed rectangular panels per door leaf (left and right)
    for (let dp = -1; dp <= 1; dp += 2) {
      centralGroup.add(mk(new THREE.BoxGeometry(1.8, 2, 0.03), M.door, dp * 1.05, 3.0, -(vD / 2 + 0.12)));
      centralGroup.add(mk(new THREE.BoxGeometry(1.8, 2, 0.03), M.door, dp * 1.05, 5.5, -(vD / 2 + 0.12)));
    }
    // Decorative studs/nails — 2 columns of 4 bronze studs on each door leaf
    for (let dp = -1; dp <= 1; dp += 2) {
      for (let col = 0; col < 2; col++) {
        for (let row = 0; row < 4; row++) {
          const sx = dp * (0.55 + col * 0.7);
          const sy = 2.5 + row * 1.1;
          const stud = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), M.bronze);
          stud.position.set(sx, sy, -(vD / 2 + 0.24));
          centralGroup.add(stud);
        }
      }
    }
    // Semicircular transom window above grand entrance
    const transomGeo = new THREE.CylinderGeometry(2.0, 2.0, 0.08, 16, 1, false, 0, Math.PI);
    const transomMesh = new THREE.Mesh(transomGeo, M.win);
    transomMesh.position.set(0, 7.2, -(vD / 2 + 0.1));
    transomMesh.rotation.z = Math.PI / 2; // orient flat semicircle facing -Z
    centralGroup.add(transomMesh);
    // Pilasters flanking the grand entrance
    centralGroup.add(mk(new THREE.BoxGeometry(0.3, 5.5, 0.15), M.trim, -2.8, 4.3, -(vD / 2 + 0.18)));
    centralGroup.add(mk(new THREE.BoxGeometry(0.3, 5.5, 0.15), M.trim,  2.8, 4.3, -(vD / 2 + 0.18)));
    // Pilaster capitals
    centralGroup.add(mk(new THREE.BoxGeometry(0.4, 0.2, 0.2), M.trim, -2.8, 7.25, -(vD / 2 + 0.18)));
    centralGroup.add(mk(new THREE.BoxGeometry(0.4, 0.2, 0.2), M.trim,  2.8, 7.25, -(vD / 2 + 0.18)));
    // Threshold / entrance step
    centralGroup.add(mk(new THREE.BoxGeometry(5.5, 0.2, 1.5), M.marble, 0, 1.2, -(vD / 2 + 0.8)));

    // ── WALL SCONCES — central domus front face (-Z) ──
    for (const [x, y] of [[-8, vH * 0.4 + 1.3], [-3, vH * 0.4 + 1.3], [3, vH * 0.4 + 1.3], [8, vH * 0.4 + 1.3]] as [number, number][]) {
      // Sconce bracket
      centralGroup.add(mk(new THREE.BoxGeometry(0.15, 0.08, 0.4), M.bronze, x, y, -(vD / 2 + 0.15)));
      // Warm glow (small point light)
      const sconce = new THREE.PointLight("#FFD080", 0.08, 6);
      sconce.position.set(x, y + 0.4, -(vD / 2 + 0.4));
      centralGroup.add(sconce);
    }

    // ── HANGING LANTERNS — vestibulum portico ceiling ──
    for (const lx of [-3, 3]) {
      // Lantern body
      centralGroup.add(mk(new THREE.BoxGeometry(0.3, 0.4, 0.3), M.bronze, lx, 6.5, vestZ));
      // Glass panels (four faces)
      centralGroup.add(mk(new THREE.BoxGeometry(0.25, 0.3, 0.01), M.win, lx, 6.5, vestZ + 0.15));
      centralGroup.add(mk(new THREE.BoxGeometry(0.25, 0.3, 0.01), M.win, lx, 6.5, vestZ - 0.15));
      centralGroup.add(mk(new THREE.BoxGeometry(0.01, 0.3, 0.25), M.win, lx + 0.15, 6.5, vestZ));
      centralGroup.add(mk(new THREE.BoxGeometry(0.01, 0.3, 0.25), M.win, lx - 0.15, 6.5, vestZ));
      // Warm lantern light
      const lantern = new THREE.PointLight("#FFE0A0", 0.12, 8);
      lantern.position.set(lx, 6.5, vestZ);
      centralGroup.add(lantern);
    }

    // ── GROUND-LEVEL UPLIGHTS — outermost vestibulum column bases ──
    for (const ux of [-5, 5]) {
      const uplight = new THREE.PointLight("#FFE8C0", 0.06, 5);
      uplight.position.set(ux, 1.5, vestZ);
      centralGroup.add(uplight);
    }

    // ── OPEN ATRIUM (Center) — impluvium ──
    // Impluvium: sunken marble pool, recessed 0.4
    // Outer rim
    centralGroup.add(mk(new THREE.BoxGeometry(7.5, 0.5, 6), M.marble, 0, 1.55, 0));
    // Inner void (darker to show depth)
    centralGroup.add(mk(new THREE.BoxGeometry(6.5, 0.4, 5), M.stoneD, 0, 1.35, 0));
    // Marble sides (inner walls of pool)
    centralGroup.add(mk(new THREE.BoxGeometry(6.5, 0.3, 0.15), M.marbleVein, 0, 1.25, 2.5));
    centralGroup.add(mk(new THREE.BoxGeometry(6.5, 0.3, 0.15), M.marbleVein, 0, 1.25, -2.5));
    centralGroup.add(mk(new THREE.BoxGeometry(0.15, 0.3, 5), M.marbleVein, 3.25, 1.25, 0));
    centralGroup.add(mk(new THREE.BoxGeometry(0.15, 0.3, 5), M.marbleVein, -3.25, 1.25, 0));
    // Water surface
    centralGroup.add(new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.06, 4.8), waterMat).translateY(1.2));
    // Stacked marble rim
    centralGroup.add(mk(new THREE.BoxGeometry(8, 0.12, 6.5), M.marble, 0, 1.86, 0));

    // ── MOSAIC FLOOR BORDER — gold ring around impluvium ──
    const mosaicRing = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.08, 4, 32), M.goldBright);
    mosaicRing.rotation.x = -Math.PI / 2;
    mosaicRing.position.set(0, 1.38, 0);
    centralGroup.add(mosaicRing);

    // ── DECORATIVE FLOOR TILES — 4 corner panels ──
    centralGroup.add(mk(new THREE.BoxGeometry(2, 0.02, 2), M.pathD, -4.5, 1.38, -3.5));
    centralGroup.add(mk(new THREE.BoxGeometry(2, 0.02, 2), M.pathD,  4.5, 1.38, -3.5));
    centralGroup.add(mk(new THREE.BoxGeometry(2, 0.02, 2), M.pathD, -4.5, 1.38,  3.5));
    centralGroup.add(mk(new THREE.BoxGeometry(2, 0.02, 2), M.pathD,  4.5, 1.38,  3.5));

    // ── LION HEAD SPOUTS — 4 decorative heads at impluvium rim midpoints ──
    const spoutPositions: [number, number, number, number][] = [
      [ 3.25, 0, 0,  Math.PI / 2],   // +X side
      [-3.25, 0, 0, -Math.PI / 2],   // -X side
      [0,  0,  2.5, 0],              // +Z side
      [0,  0, -2.5, Math.PI],        // -Z side
    ];
    spoutPositions.forEach(([sx, , sz, ry]) => {
      // Lion head sphere
      centralGroup.add(mk(new THREE.SphereGeometry(0.15, 8, 8), M.bronze, sx, 1.9, sz));
      // Water spout cylinder angled downward from the head
      const spoutMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), M.bronze);
      spoutMesh.rotation.y = ry;
      spoutMesh.rotation.z = Math.PI / 4; // angle downward
      spoutMesh.position.set(sx, 1.9, sz);
      centralGroup.add(spoutMesh);
    });

    // 4 columns at impluvium corners — with echinus necking between shaft and capital
    const impCorners = [[-3.25, -2.5], [-3.25, 2.5], [3.25, -2.5], [3.25, 2.5]];
    impCorners.forEach(([ix, iz]) => {
      centralGroup.add(mk(new THREE.CylinderGeometry(0.35, 0.35, 5, 16), M.col, ix, 4.3, iz));
      // Echinus (necking between shaft top and capital abacus)
      centralGroup.add(mk(new THREE.CylinderGeometry(0.45, 0.35, 0.15, 16), M.trim, ix, 6.825, iz));
      centralGroup.add(mk(new THREE.BoxGeometry(1.0, 0.2, 1.0), M.trim, ix, 6.9, iz));
    });

    // ── FOUNTAIN — jet + basin + top sphere ──
    // Lower basin below main jet
    centralGroup.add(mk(new THREE.CylinderGeometry(0.2, 0.25, 0.15, 8), M.marbleVein, 0, 1.9, 0));
    // Main jet
    centralGroup.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8), M.marble, 0, 2.3, 0));
    // Primary sphere
    centralGroup.add(mk(new THREE.SphereGeometry(0.12, 8, 8), M.marble, 0, 3.1, 0));
    // Second sphere on top for added elegance
    centralGroup.add(mk(new THREE.SphereGeometry(0.08, 8, 8), M.marble, 0, 3.25, 0));

    // Snapshot core building meshes BEFORE peristyle/garden/wings are added
    // This is used for hover glow so only the core domus lights up, not the entire compound
    entranceCoreMeshes = [];
    centralGroup.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.material && !(child.material as any).transparent) entranceCoreMeshes.push(child);
    });

    // ── PERISTYLE GARDEN (Behind atrium) ──
    const periZ = vD / 2 - 4;
    const periW = 14, periD = 10;

    // Green garden ground plane
    centralGroup.add(new THREE.Mesh(new THREE.BoxGeometry(periW - 4, 0.08, periD - 4), gardenGreen).translateX(0).translateY(1.35).translateZ(periZ));

    // 16 columns forming colonnaded walkway
    const periCols: [number, number][] = [];
    // Long sides (6 columns each)
    for (let ci = 0; ci < 6; ci++) {
      const cx = -periW / 2 + 1 + ci * (periW - 2) / 5;
      periCols.push([cx, periZ - periD / 2]);
      periCols.push([cx, periZ + periD / 2]);
    }
    // Short sides (2 columns each, excluding corners)
    for (let ci = 1; ci < 3; ci++) {
      const cz = periZ - periD / 2 + ci * (periD / 3);
      periCols.push([-periW / 2, cz]);
      periCols.push([periW / 2, cz]);
    }
    periCols.forEach(([px, pz]) => {
      centralGroup.add(mk(new THREE.CylinderGeometry(0.3, 0.3, 4.5, 12), M.col, px, 4.05, pz));
      centralGroup.add(mk(new THREE.BoxGeometry(0.8, 0.15, 0.8), M.trim, px, 6.4, pz));
    });

    // Covered portico roof slabs around the peristyle
    centralGroup.add(mk(new THREE.BoxGeometry(periW + 2, 0.2, 2.5), M.stoneL, 0, 6.6, periZ - periD / 2));
    centralGroup.add(mk(new THREE.BoxGeometry(periW + 2, 0.2, 2.5), M.stoneL, 0, 6.6, periZ + periD / 2));
    centralGroup.add(mk(new THREE.BoxGeometry(2.5, 0.2, periD + 2), M.stoneL, -periW / 2, 6.6, periZ));
    centralGroup.add(mk(new THREE.BoxGeometry(2.5, 0.2, periD + 2), M.stoneL, periW / 2, 6.6, periZ));

    // Central euripus — narrow marble-rimmed water channel
    centralGroup.add(mk(new THREE.BoxGeometry(8, 0.08, 1.5), M.marble, 0, 1.38, periZ));
    centralGroup.add(new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.04, 1.2), waterMat).translateX(0).translateY(1.35).translateZ(periZ));

    // Flower beds along garden edges, flanking the euripus
    centralGroup.add(new THREE.Mesh(new THREE.BoxGeometry(periW - 6, 0.15, 0.8), gardenGreen).translateX(0).translateY(1.42).translateZ(periZ - 2.5));
    centralGroup.add(new THREE.Mesh(new THREE.BoxGeometry(periW - 6, 0.15, 0.8), gardenGreen).translateX(0).translateY(1.42).translateZ(periZ + 2.5));

    // Topiary bushes — alternating sphere and cone for visual variety
    const topiaryPos = [[-3, periZ - 1.5], [-3, periZ + 1.5], [3, periZ - 1.5], [3, periZ + 1.5]];
    topiaryPos.forEach(([tx, tz], idx) => {
      centralGroup.add(mk(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), M.stoneD, tx, 2.0, tz));
      if (idx % 2 === 0) {
        // Sphere topiary
        centralGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), gardenGreen).translateX(tx).translateY(3.0).translateZ(tz));
      } else {
        // Cone topiary
        centralGroup.add(mk(new THREE.ConeGeometry(0.4, 1.2, 8), gardenGreen, tx, 3.2, tz));
      }
    });

    // Stepping stones across the garden — 6 flat discs in a path
    for (let si = 0; si < 6; si++) {
      const sx = -3.0 + si * 1.2;
      centralGroup.add(mk(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 8), M.pathD, sx, 1.395, periZ));
    }

    // Climbing roses on every 3rd peristyle column
    periCols.forEach(([px, pz], idx) => {
      if (idx % 3 !== 0) return;
      // 3 flower dots at staggered heights
      for (let fi = 0; fi < 3; fi++) {
        const fy = 2.2 + fi * 0.9;
        const fOff = fi % 2 === 0 ? 0.28 : 0.35;
        centralGroup.add(mk(new THREE.SphereGeometry(0.06, 4, 4), M.flower, px + fOff, fy, pz + (fi % 2 === 0 ? 0.1 : -0.1)));
      }
    });

    // Low hedgerows
    centralGroup.add(new THREE.Mesh(new THREE.BoxGeometry(periW - 4, 0.5, 0.3), gardenGreen).translateY(1.6).translateZ(periZ - periD / 2 + 1.5));
    centralGroup.add(new THREE.Mesh(new THREE.BoxGeometry(periW - 4, 0.5, 0.3), gardenGreen).translateY(1.6).translateZ(periZ + periD / 2 - 1.5));

    // Marble bench
    centralGroup.add(mk(new THREE.BoxGeometry(3, 0.15, 1), M.marble, 4, 1.8, periZ));
    centralGroup.add(mk(new THREE.BoxGeometry(0.3, 0.5, 1), M.marble, 2.6, 1.6, periZ));
    centralGroup.add(mk(new THREE.BoxGeometry(0.3, 0.5, 1), M.marble, 5.4, 1.6, periZ));

    // 2 statues on pedestals — taller figures with draped cloth detail
    for (let si = -1; si <= 1; si += 2) {
      const sx = si * 5;
      // Pedestal with base moulding
      centralGroup.add(mk(new THREE.BoxGeometry(1.2, 0.2, 1.2), M.marble, sx, 1.4, periZ));
      centralGroup.add(mk(new THREE.BoxGeometry(1, 1.2, 1), M.marbleVein, sx, 2.1, periZ));
      centralGroup.add(mk(new THREE.BoxGeometry(1.1, 0.15, 1.1), M.marble, sx, 2.78, periZ));
      // Figure: taller torso
      centralGroup.add(mk(new THREE.BoxGeometry(0.6, 1.6, 0.35), M.marble, sx, 3.7, periZ));
      // Draped cloth over one shoulder
      const drape = mk(new THREE.BoxGeometry(0.5, 0.8, 0.2), M.marbleVein, sx - 0.2, 3.9, periZ - 0.1);
      drape.rotation.z = 0.18;
      centralGroup.add(drape);
      // Shoulders
      centralGroup.add(mk(new THREE.BoxGeometry(0.9, 0.3, 0.35), M.marble, sx, 4.55, periZ));
      // Head
      centralGroup.add(mk(new THREE.SphereGeometry(0.22, 8, 8), M.marble, sx, 4.95, periZ));
      // Arms (cylinders angled slightly outward)
      for (const arm of [-1, 1]) {
        const a = mk(new THREE.CylinderGeometry(0.08, 0.07, 1.0, 6), M.marbleVein, sx + arm * 0.55, 3.9, periZ);
        a.rotation.z = arm * 0.15;
        centralGroup.add(a);
      }
    }

    // Terracotta planter pots
    const potPos = [[-5, periZ - 3], [5, periZ - 3], [-5, periZ + 3], [5, periZ + 3]];
    potPos.forEach(([px, pz]) => {
      centralGroup.add(mk(new THREE.CylinderGeometry(0.5, 0.35, 0.8, 12), M.tile, px, 1.7, pz));
      centralGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), gardenGreen).translateX(px).translateY(2.4).translateZ(pz));
    });

    // ── ROOM WINGS (arranged around peristyle) ──
    // Left wing — wall body
    centralGroup.add(mk(new THREE.BoxGeometry(5, 5, 4), ochreWall, -(vW / 2 - 2.5), 3.8, periZ - 2));
    // Left wing — doorway opening (rich door panel + arch)
    centralGroup.add(mk(new THREE.BoxGeometry(1.8, 3.2, 0.08), M.doorRich, -(vW / 2 - 2.5), 3.3, periZ - 4.01));
    const leftArch = mk(new THREE.TorusGeometry(0.9, 0.06, 8, 10, Math.PI), M.trim, -(vW / 2 - 2.5), 5.0, periZ - 4.01);
    leftArch.rotation.z = Math.PI;
    centralGroup.add(leftArch);
    // Left wing — window shutters (partially open)
    const lwShutterL = mk(new THREE.BoxGeometry(0.5, 3, 0.06), M.door, -(vW / 2 - 2.5) - 1.3, 3.3, periZ - 4.01);
    lwShutterL.rotation.y = 0.2;
    centralGroup.add(lwShutterL);
    const lwShutterR = mk(new THREE.BoxGeometry(0.5, 3, 0.06), M.door, -(vW / 2 - 2.5) + 1.3, 3.3, periZ - 4.01);
    lwShutterR.rotation.y = -0.2;
    centralGroup.add(lwShutterR);
    // Left wing — flanking decorative columns with capitals
    centralGroup.add(mk(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), M.col, -(vW / 2 - 2.5) - 1.1, 2.8, periZ - 4.05));
    centralGroup.add(mk(new THREE.BoxGeometry(0.3, 0.08, 0.3), M.trim, -(vW / 2 - 2.5) - 1.1, 4.34, periZ - 4.05));
    centralGroup.add(mk(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), M.col, -(vW / 2 - 2.5) + 1.1, 2.8, periZ - 4.05));
    centralGroup.add(mk(new THREE.BoxGeometry(0.3, 0.08, 0.3), M.trim, -(vW / 2 - 2.5) + 1.1, 4.34, periZ - 4.05));
    // Left wing — terracotta tile porch overhang
    centralGroup.add(mk(new THREE.BoxGeometry(3, 0.12, 1.5), M.tile, -(vW / 2 - 2.5), 5.5, periZ - 4.76));
    // Right wing — wall body
    centralGroup.add(mk(new THREE.BoxGeometry(5, 5, 4), ochreWall, (vW / 2 - 2.5), 3.8, periZ - 2));
    // Right wing — doorway opening (rich door panel + arch)
    centralGroup.add(mk(new THREE.BoxGeometry(1.8, 3.2, 0.08), M.doorRich, (vW / 2 - 2.5), 3.3, periZ - 4.01));
    const rightArch = mk(new THREE.TorusGeometry(0.9, 0.06, 8, 10, Math.PI), M.trim, (vW / 2 - 2.5), 5.0, periZ - 4.01);
    rightArch.rotation.z = Math.PI;
    centralGroup.add(rightArch);
    // Right wing — window shutters (partially open)
    const rwShutterL = mk(new THREE.BoxGeometry(0.5, 3, 0.06), M.door, (vW / 2 - 2.5) - 1.3, 3.3, periZ - 4.01);
    rwShutterL.rotation.y = 0.2;
    centralGroup.add(rwShutterL);
    const rwShutterR = mk(new THREE.BoxGeometry(0.5, 3, 0.06), M.door, (vW / 2 - 2.5) + 1.3, 3.3, periZ - 4.01);
    rwShutterR.rotation.y = -0.2;
    centralGroup.add(rwShutterR);
    // Right wing — flanking decorative columns with capitals
    centralGroup.add(mk(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), M.col, (vW / 2 - 2.5) - 1.1, 2.8, periZ - 4.05));
    centralGroup.add(mk(new THREE.BoxGeometry(0.3, 0.08, 0.3), M.trim, (vW / 2 - 2.5) - 1.1, 4.34, periZ - 4.05));
    centralGroup.add(mk(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), M.col, (vW / 2 - 2.5) + 1.1, 2.8, periZ - 4.05));
    centralGroup.add(mk(new THREE.BoxGeometry(0.3, 0.08, 0.3), M.trim, (vW / 2 - 2.5) + 1.1, 4.34, periZ - 4.05));
    // Right wing — terracotta tile porch overhang
    centralGroup.add(mk(new THREE.BoxGeometry(3, 0.12, 1.5), M.tile, (vW / 2 - 2.5), 5.5, periZ - 4.76));
    // Back wing (tablinium) — wider & more prominent (width 8→10)
    centralGroup.add(mk(new THREE.BoxGeometry(10, 5, 4), ochreWall, 0, 3.8, periZ + periD / 2 + 2));
    // Tablinium — doorway opening (rich door panel + arch)
    centralGroup.add(mk(new THREE.BoxGeometry(1.8, 3.2, 0.08), M.doorRich, 0, 3.3, periZ + periD / 2 + 0.01));
    const tabArch = mk(new THREE.TorusGeometry(0.9, 0.06, 8, 10, Math.PI), M.trim, 0, 5.0, periZ + periD / 2 + 0.01);
    tabArch.rotation.z = Math.PI;
    centralGroup.add(tabArch);
    // Tablinium — flanking decorative columns with capitals
    centralGroup.add(mk(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), M.col, -1.1, 2.8, periZ + periD / 2 - 0.05));
    centralGroup.add(mk(new THREE.BoxGeometry(0.3, 0.08, 0.3), M.trim, -1.1, 4.34, periZ + periD / 2 - 0.05));
    centralGroup.add(mk(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), M.col, 1.1, 2.8, periZ + periD / 2 - 0.05));
    centralGroup.add(mk(new THREE.BoxGeometry(0.3, 0.08, 0.3), M.trim, 1.1, 4.34, periZ + periD / 2 - 0.05));
    // Tablinium — terracotta tile porch overhang
    centralGroup.add(mk(new THREE.BoxGeometry(4, 0.12, 1.5), M.tile, 0, 5.5, periZ + periD / 2 - 0.76));
    // Tablinium — pediment detail (two angled slabs forming gable above porch)
    const tabPedL = mk(new THREE.BoxGeometry(2.6, 0.18, 0.8), M.stoneL, -0.9, 6.1, periZ + periD / 2 - 0.76);
    tabPedL.rotation.z = 0.18;
    centralGroup.add(tabPedL);
    const tabPedR = mk(new THREE.BoxGeometry(2.6, 0.18, 0.8), M.stoneL, 0.9, 6.1, periZ + periD / 2 - 0.76);
    tabPedR.rotation.z = -0.18;
    centralGroup.add(tabPedR);
    // Tablinium — panel outlines on walls (adjusted for wider width)
    for (let pi = -1; pi <= 1; pi += 2) {
      centralGroup.add(mk(new THREE.BoxGeometry(0.08, 3, 3.5), M.trim, pi * 4.5, 3.8, periZ + periD / 2 + 2));
    }

    // ── TERRACOTTA TILE ROOFING — HIPPED ROOF ──
    const cRoofOverhang = 1.0;
    const cRoofAngle = 0.2; // ~11.5 degrees
    const cSlabW = (vW + cRoofOverhang * 2) / 2 + 0.3;
    const cSlabL = vD + cRoofOverhang * 2;
    const cRidgeY = vH + 1.55 + Math.sin(cRoofAngle) * cSlabW;
    // Left slope
    const cRoofLeft = mk(new THREE.BoxGeometry(cSlabW, 0.22, cSlabL), M.tile, -(cSlabW / 2 - 0.15), vH + 1.55, 0);
    cRoofLeft.rotation.z = cRoofAngle;
    centralGroup.add(cRoofLeft);
    // Right slope
    const cRoofRight = mk(new THREE.BoxGeometry(cSlabW, 0.22, cSlabL), M.tile, (cSlabW / 2 - 0.15), vH + 1.55, 0);
    cRoofRight.rotation.z = -cRoofAngle;
    centralGroup.add(cRoofRight);
    // Ridge cap tiles along the main ridge (half-cylinder, open downward)
    { const rcm = mk(new THREE.CylinderGeometry(0.15, 0.15, vD + 1, 6, 1, false, 0, Math.PI), M.tile, 0, cRidgeY + 0.08, 0); rcm.rotation.x = -Math.PI / 2; centralGroup.add(rcm); }
    // Ridge beam under cap
    centralGroup.add(mk(new THREE.BoxGeometry(0.35, 0.28, vD + 1.2), M.tile, 0, cRidgeY - 0.05, 0));
    // Hip ridges — diagonal caps from ridge ends down to front/back eave corners
    for (let s = -1; s <= 1; s += 2) {
      const hipFront = mk(new THREE.BoxGeometry(0.2, 0.15, cSlabW * 1.35), M.tile, s * cSlabW * 0.48, cRidgeY - 0.12, -(cSlabL / 2 - cSlabW * 0.35));
      hipFront.rotation.y = s * -0.78;
      hipFront.rotation.x = -cRoofAngle * 0.6;
      centralGroup.add(hipFront);
      const hipBack = mk(new THREE.BoxGeometry(0.2, 0.15, cSlabW * 1.35), M.tile, s * cSlabW * 0.48, cRidgeY - 0.12, (cSlabL / 2 - cSlabW * 0.35));
      hipBack.rotation.y = s * 0.78;
      hipBack.rotation.x = cRoofAngle * 0.6;
      centralGroup.add(hipBack);
    }
    // Tegulae ridges on slopes
    for (let ti = 0; ti < 5; ti++) {
      const tx = -vW / 2 + 2 + ti * (vW - 4) / 4;
      const teg = mk(new THREE.CylinderGeometry(0.12, 0.12, vD + 1.5, 6, 1, false, 0, Math.PI), M.tile, tx, vH + 1.75, 0);
      teg.rotation.x = -Math.PI / 2;
      centralGroup.add(teg);
    }

    // ── ANTEFIXAE — terracotta discs along front (-Z) eave of central domus ──
    for (let i = 0; i < 10; i++) {
      const ax = -vW / 2 + 1 + i * (vW / 9);
      const disc = mk(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 8), M.tile, ax, vH + 1.45, -(vD / 2 + 0.8));
      centralGroup.add(disc);
      const palmette = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), M.tile);
      palmette.scale.set(1.5, 0.3, 1);
      palmette.position.set(ax, vH + 1.52, -(vD / 2 + 0.8));
      centralGroup.add(palmette);
    }

    // ── DECORATIVE TERRACOTTA MEDALLION on central domus back wall ──
    centralGroup.add(mk(new THREE.CircleGeometry(1.5, 16), M.tile, 0, vH * 0.65 + 1.3, vD / 2 + 0.06));
    centralGroup.add(mk(new THREE.TorusGeometry(1.5, 0.06, 8, 16), M.stoneD, 0, vH * 0.65 + 1.3, vD / 2 + 0.06));

    // ── AMPHORAE flanking the vestibulum entrance ──
    for (let ap = -1; ap <= 1; ap += 2) {
      const apX = ap * 3.5;
      const apZ = vestZ + 1;
      // Body
      centralGroup.add(mk(new THREE.CylinderGeometry(0.25, 0.35, 1.2, 8), M.tile, apX, 1.9, apZ));
      // Neck
      centralGroup.add(mk(new THREE.CylinderGeometry(0.12, 0.25, 0.3, 8), M.tile, apX, 2.65, apZ));
      // Handles (two small tori per amphora)
      for (let h = -1; h <= 1; h += 2) {
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 8), M.tile);
        handle.position.set(apX + h * 0.28, 2.1, apZ);
        handle.rotation.y = Math.PI / 2;
        centralGroup.add(handle);
      }
    }

    // ── ROOF RIDGE FINIALS at ends of central domus roof ──
    centralGroup.add(mk(new THREE.SphereGeometry(0.2, 8, 8), M.bronze, -(vW / 2 + 0.5), vH + 1.85, 0));
    centralGroup.add(mk(new THREE.SphereGeometry(0.2, 8, 8), M.bronze,  (vW / 2 + 0.5), vH + 1.85, 0));

    // ── PANTHEON-STYLE DOME (critical for transition coherence) ──
    const rDomeR = 8;
    // Drum base (slightly wider, 3.5m tall)
    const rDrumR = 8.5, rDrumH = 3.5;
    const drumBaseY = vH + 1.8;
    centralGroup.add(mk(new THREE.CylinderGeometry(rDrumR, rDrumR + 0.3, rDrumH, 32), ochreWall, 0, drumBaseY + rDrumH / 2, 0));
    // Drum base cornice — wider band at bottom of drum
    centralGroup.add(mk(new THREE.CylinderGeometry(rDrumR + 0.4, rDrumR + 0.6, 0.2, 32), M.trim, 0, drumBaseY + 0.1, 0));
    // Drum top cornice
    centralGroup.add(mk(new THREE.CylinderGeometry(rDrumR + 0.5, rDrumR + 0.3, 0.25, 32), M.trim, 0, drumBaseY + rDrumH + 0.12, 0));
    // Pilasters around drum exterior — 12 shallow rectangular pilasters
    for (let p = 0; p < 12; p++) {
      const pa = (p / 12) * Math.PI * 2;
      const pilaster = mk(new THREE.BoxGeometry(0.4, rDrumH, 0.15), M.stoneL,
        Math.cos(pa) * (rDrumR + 0.08), drumBaseY + rDrumH / 2, Math.sin(pa) * (rDrumR + 0.08));
      pilaster.rotation.y = pa;
      centralGroup.add(pilaster);
    }
    // Drum windows — taller for elegant proportions (0.7×1.6)
    for (let dw = 0; dw < 12; dw++) {
      const da = (dw / 12) * Math.PI * 2;
      centralGroup.add(mk(new THREE.BoxGeometry(0.7, 1.6, 0.12), M.win,
        Math.cos(da) * (rDrumR + 0.05), drumBaseY + rDrumH * 0.6, Math.sin(da) * (rDrumR + 0.05)));
    }
    // Hemispherical dome — verdigris copper with patina texture
    const domeMat = new THREE.MeshStandardMaterial({
      color: '#6B9A85', roughness: 0.65, metalness: 0.35,
      normalMap: clayPlasterTex.normalMap, normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: clayPlasterTex.roughnessMap,
      envMapIntensity: 0.7,
    });
    extraDisposables.push(domeMat);
    const rDome = new THREE.Mesh(
      new THREE.SphereGeometry(rDomeR, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5),
      domeMat
    );
    rDome.position.set(0, drumBaseY + rDrumH + 0.2, 0);
    rDome.castShadow = true;
    centralGroup.add(rDome);
    // Dome exterior ribs — 8 radial coffers running from drum top toward oculus
    const domeOriginY = drumBaseY + rDrumH + 0.2;
    for (let r = 0; r < 8; r++) {
      const ra = (r / 8) * Math.PI * 2;
      for (let seg = 0; seg < 5; seg++) {
        const phi = (seg / 5) * (Math.PI * 0.45); // equator toward apex
        const ribR = rDomeR * Math.cos(phi) * 0.95;
        const ribY = rDomeR * Math.sin(phi);
        const rib = mk(new THREE.BoxGeometry(0.18, 0.12, 0.5), M.stoneD,
          Math.cos(ra) * ribR, domeOriginY + ribY, Math.sin(ra) * ribR);
        rib.rotation.y = ra;
        rib.rotation.z = -phi;
        centralGroup.add(rib);
      }
    }
    // Oculus opening (dark circle at apex)
    centralGroup.add(mk(new THREE.CylinderGeometry(1.5, 1.5, 0.15, 24), M.stoneD, 0, drumBaseY + rDrumH + rDomeR + 0.1, 0));
    // Oculus rim — thicker tube for bold gold band
    centralGroup.add(mk(new THREE.TorusGeometry(1.5, 0.18, 8, 24), M.gold, 0, drumBaseY + rDrumH + rDomeR + 0.2, 0));
    // Lantern above oculus — cylinder with 6 tiny windows, cone roof, gold finial
    const lanternY = drumBaseY + rDrumH + rDomeR + 0.35;
    centralGroup.add(mk(new THREE.CylinderGeometry(0.8, 0.8, 1.5, 16), M.stoneL, 0, lanternY + 0.75, 0));
    for (let lw = 0; lw < 6; lw++) {
      const lwa = (lw / 6) * Math.PI * 2;
      centralGroup.add(mk(new THREE.BoxGeometry(0.25, 0.55, 0.1), M.win,
        Math.cos(lwa) * 0.82, lanternY + 0.75, Math.sin(lwa) * 0.82));
    }
    centralGroup.add(mk(new THREE.ConeGeometry(0.6, 1.0, 16), M.trim, 0, lanternY + 1.5 + 0.5, 0));
    centralGroup.add(mk(new THREE.SphereGeometry(0.18, 12, 8), M.goldBright, 0, lanternY + 2.05, 0));

    // ── DISTANT ROMAN ELEMENTS ──
    // (Aqueduct moved to landscape section where atmosColor is available)

    // Via Appia: straight stone road
    const viaAppia = new THREE.Mesh(new THREE.PlaneGeometry(6, 200), M.path);
    viaAppia.rotation.x = -Math.PI / 2;
    viaAppia.position.set(50, 0.15, -60);
    viaAppia.rotation.z = 0.3;
    scene.add(viaAppia);

    // Distant temple silhouette on hillside
    const templeZ = -130, templeX = 60;
    scene.add(mk(new THREE.BoxGeometry(10, 1, 8), M.stoneD, templeX, 4, templeZ));
    scene.add(mk(new THREE.BoxGeometry(8, 6, 6), M.stoneL, templeX, 7.5, templeZ));
    // Temple columns (front)
    for (let tc = 0; tc < 4; tc++) {
      scene.add(mk(new THREE.CylinderGeometry(0.3, 0.3, 5, 8), M.col, templeX - 3 + tc * 2, 7, templeZ - 3.2));
    }
    // Temple pediment
    const tPedL = mk(new THREE.BoxGeometry(5.5, 0.25, 7), M.stoneL, templeX - 2, 11.2, templeZ);
    tPedL.rotation.z = 0.15;
    scene.add(tPedL);
    const tPedR = mk(new THREE.BoxGeometry(5.5, 0.25, 7), M.stoneL, templeX + 2, 11.2, templeZ);
    tPedR.rotation.z = -0.15;
    scene.add(tPedR);

    // Collect central meshes for hover/glow
    centralGroup.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.material && !(child.material as any).transparent) centralBodyMeshes.push(child);
    });
    palace.add(centralGroup);
    entrClickRadius = 12; entrClickHeight = vH + rDrumH + rDomeR + 4;

    // ══════════════════════════════════════════
    // 5 ROMAN VILLA WINGS — colonnaded galleries with arched arcades & tower pavilions
    // ══════════════════════════════════════════
    const wingDefs = [{ room: WINGS[0], length: 22 }, { room: WINGS[1], length: 20 }, { room: WINGS[2], length: 18 }, { room: WINGS[3], length: 19 }, { room: WINGS[4], length: 21 }];
    const wingFluteGeo = new THREE.BoxGeometry(0.015, (5 - 0.5) * 0.9, 0.04); // colH = wH - 0.5, shared across all wing columns
    extraGeoDisposables.push(wingFluteGeo);
    wingDefs.forEach((def, i) => {
      const angle = (i / 5) * Math.PI * 2;
      const wg = new THREE.Group();
      const wW = 7, wH = 5, wL = def.length;
      const wingMeshes: THREE.Mesh[] = [];
      function addM(m: any) { wg.add(m); if (m.material && !m.material.transparent) wingMeshes.push(m); return m; }

      // Stone foundation — extends down to ground to prevent floating appearance
      addM(mk(new THREE.BoxGeometry(wW + 2, 1.8, wL + 1.5), M.stoneD, 0, 0.3, -(vD / 2 + wL / 2)));
      addM(mk(new THREE.BoxGeometry(wW + 2.3, 0.3, wL + 1.8), M.stoneDk, 0, -0.55, -(vD / 2 + wL / 2)));
      // Gallery body — warm golden ochre walls
      addM(mk(new THREE.BoxGeometry(wW, wH, wL), ochreWall, 0, wH / 2 + 1.3, -(vD / 2 + wL / 2)));
      // Plinth
      addM(mk(new THREE.BoxGeometry(wW + 1.5, 0.6, wL + 1), M.stoneD, 0, 1.0, -(vD / 2 + wL / 2)));
      // Plinth molding — extra trim band at the base
      addM(mk(new THREE.BoxGeometry(wW + 0.8, 0.12, wL + 0.5), M.trim, 0, 1.5, -(vD / 2 + wL / 2)));
      // String course — horizontal trim band at mid-height
      addM(mk(new THREE.BoxGeometry(wW + 0.2, 0.1, wL + 0.2), M.trim, 0, wH * 0.5 + 1.3, -(vD / 2 + wL / 2)));
      // Trim band at top
      addM(mk(new THREE.BoxGeometry(wW + 0.3, 0.2, wL + 0.3), M.trim, 0, wH + 1.4, -(vD / 2 + wL / 2)));
      // Gutter / cornice shadow line under the roof
      addM(mk(new THREE.BoxGeometry(wW + 1.0, 0.08, wL + 0.6), M.stoneD, 0, wH + 1.55, -(vD / 2 + wL / 2)));
      // Quoin stones — vertical trim strips at all 4 corners of the gallery body
      for (const qx of [-wW / 2, wW / 2]) {
        for (const qz of [-(vD / 2 + 0.125), -(vD / 2 + wL - 0.125)]) {
          addM(mk(new THREE.BoxGeometry(0.25, wH, 0.25), M.trim, qx, wH / 2 + 1.3, qz));
        }
      }

      // ── HIPPED TERRACOTTA ROOF (four-sided hip roof) ──
      const roofOverhang = 1.2;
      const roofAngle = 0.26; // ~15 degrees
      const roofSlabW = (wW + roofOverhang * 2) / 2 + 0.3;
      const roofSlabL = wL + roofOverhang * 2;
      const wRidgeY = wH + 2.0 + Math.sin(roofAngle) * roofSlabW;
      const wRidgeCenterZ = -(vD / 2 + wL / 2);
      // Left slope
      const roofLeft = mk(new THREE.BoxGeometry(roofSlabW, 0.18, roofSlabL), M.tile, -(roofSlabW / 2 - 0.15), wH + 1.8, wRidgeCenterZ);
      roofLeft.rotation.z = roofAngle;
      addM(roofLeft);
      // Right slope
      const roofRight = mk(new THREE.BoxGeometry(roofSlabW, 0.18, roofSlabL), M.tile, (roofSlabW / 2 - 0.15), wH + 1.8, wRidgeCenterZ);
      roofRight.rotation.z = -roofAngle;
      addM(roofRight);
      // Front hip slope (triangular end piece — approximated as tapered box)
      const hipEndL = roofSlabW * 2 - 0.2;
      const roofFront = mk(new THREE.BoxGeometry(hipEndL, 0.18, roofSlabW * 1.05), M.tile, 0, wH + 1.8, wRidgeCenterZ + roofSlabL / 2 - roofSlabW * 0.4);
      roofFront.rotation.x = -roofAngle;
      addM(roofFront);
      // Back hip slope
      const roofBack = mk(new THREE.BoxGeometry(hipEndL, 0.18, roofSlabW * 1.05), M.tile, 0, wH + 1.8, wRidgeCenterZ - roofSlabL / 2 + roofSlabW * 0.4);
      roofBack.rotation.x = roofAngle;
      addM(roofBack);
      // Ridge beam along the top
      addM(mk(new THREE.BoxGeometry(0.3, 0.25, roofSlabL - roofSlabW * 1.6), M.tile, 0, wRidgeY - 0.05, wRidgeCenterZ));
      // Ridge cap tiles (half-cylinder) along the main ridge
      { const wrc = mk(new THREE.CylinderGeometry(0.15, 0.15, roofSlabL - roofSlabW * 1.6, 6, 1, false, 0, Math.PI), M.tile, 0, wRidgeY + 0.1, wRidgeCenterZ); wrc.rotation.x = -Math.PI / 2; addM(wrc); }
      // Fascia boards under eave overhangs (long sides)
      addM(mk(new THREE.BoxGeometry(roofSlabW * 2 + 0.1, 0.1, 0.15), M.door, 0, wH + 1.55, wRidgeCenterZ - roofSlabL / 2));
      addM(mk(new THREE.BoxGeometry(roofSlabW * 2 + 0.1, 0.1, 0.15), M.door, 0, wH + 1.55, wRidgeCenterZ + roofSlabL / 2));
      // Fascia boards on short (hip) ends
      addM(mk(new THREE.BoxGeometry(0.15, 0.1, roofSlabL + 0.1), M.door, -(roofSlabW - 0.1), wH + 1.55, wRidgeCenterZ));
      addM(mk(new THREE.BoxGeometry(0.15, 0.1, roofSlabL + 0.1), M.door, (roofSlabW - 0.1), wH + 1.55, wRidgeCenterZ));
      // ── ARCHED COLONNADED PORTICO (columns with arches between them) ──
      const nCols = 6;
      // Continuous entablature above colonnade — one per side
      for (let s = -1; s <= 1; s += 2) {
        const cx = s * (wW / 2 + 1.2);
        wg.add(mk(new THREE.BoxGeometry(0.3, 0.2, wL - 2), M.trim, cx, wH + 1.1, -(vD / 2 + 2 + (wL - 4) / 2)));
      }
      for (let ci = 0; ci < nCols; ci++) {
        const cz = -(vD / 2 + 2 + ci * (wL - 4) / (nCols - 1));
        for (let s = -1; s <= 1; s += 2) {
          const cx = s * (wW / 2 + 1.2);
          // Main shaft — thicker radius 0.3/0.35
          const colH = wH - 0.5;
          wg.add(mk(new THREE.CylinderGeometry(0.3, 0.35, colH, 12), M.col, cx, colH / 2 + 1.3, cz));
          // Entasis bulge at 1/3 height
          wg.add(mk(new THREE.CylinderGeometry(0.33, 0.28, colH * 0.3, 12), M.col, cx, colH * 0.33 + 1.3, cz));
          // Column fluting — 6 thin dark vertical stripes (shared geometry)
          for (let fl = 0; fl < 6; fl++) {
            const fa = (fl / 6) * Math.PI * 2;
            const stripe = mk(wingFluteGeo, fluteMat,
              cx + Math.cos(fa) * 0.36, colH / 2 + 1.3, cz + Math.sin(fa) * 0.36);
            stripe.rotation.y = fa;
            wg.add(stripe);
          }
          // Capital
          wg.add(mk(new THREE.BoxGeometry(0.7, 0.15, 0.7), M.trim, cx, wH + 0.95, cz));
          // Impost block at spring line of arch
          wg.add(mk(new THREE.BoxGeometry(0.5, 0.12, 0.3), M.trim, cx, wH + 0.85, cz));
          // Column base — wider and lower than old attic base
          wg.add(mk(new THREE.CylinderGeometry(0.4, 0.42, 0.12, 12), M.stoneD, cx, 1.22, cz));

          // Arched opening between this column and the next
          if (ci < nCols - 1) {
            const nextCz = -(vD / 2 + 2 + (ci + 1) * (wL - 4) / (nCols - 1));
            const archCenterZ = (cz + nextCz) / 2;
            const archSpan = Math.abs(nextCz - cz) / 2;
            const archGeo = new THREE.TorusGeometry(archSpan * 0.8, 0.08, 8, 12, Math.PI);
            const archMesh = new THREE.Mesh(archGeo, M.trim);
            archMesh.position.set(cx, wH + 0.85, archCenterZ);
            archMesh.rotation.x = Math.PI / 2;
            archMesh.rotation.z = s > 0 ? Math.PI / 2 : -Math.PI / 2;
            wg.add(archMesh);
            // Keystone at apex of each arch
            wg.add(mk(new THREE.BoxGeometry(0.15, 0.2, 0.15), M.trim, cx, wH + 0.85 + archSpan * 0.8, archCenterZ));
          }
        }
      }

      // ── ARCHED WINDOWS along gallery walls ──
      const nWins = Math.floor(wL / 4);
      for (let wi = 0; wi < nWins; wi++) {
        const wz = -(vD / 2 + 3 + wi * 4);
        for (let s = -1; s <= 1; s += 2) {
          addArchedWindow(wg, s * (wW / 2 + 0.05), wH * 0.55 + 1.3, wz, 1.0, 2.0, "z", M.trim);
        }
      }

      // ══ TOWER PAVILION at wing end (2-story square tower) ══
      const eW = 6.5, eD = 6.5, eH = 9;
      const eZ = -(vD / 2 + wL + eD / 2);
      // Tower stone foundation/plinth
      addM(mk(new THREE.BoxGeometry(eW + 2, 1.8, eD + 1.5), M.stoneD, 0, 0.3, eZ));
      addM(mk(new THREE.BoxGeometry(eW + 1.5, 0.5, eD + 1), M.stoneD, 0, 1.0, eZ));
      // Tower body — warm ochre walls
      addM(mk(new THREE.BoxGeometry(eW, eH, eD), ochreWall, 0, eH / 2 + 1.3, eZ));
      // Stone quoin details at corners (vertical trim strips)
      for (let qx = -1; qx <= 1; qx += 2) {
        for (let qz = -1; qz <= 1; qz += 2) {
          addM(mk(new THREE.BoxGeometry(0.3, eH, 0.3), M.trim, qx * (eW / 2 - 0.1), eH / 2 + 1.3, eZ + qz * (eD / 2 - 0.1)));
        }
      }
      // Tower cornice
      addM(mk(new THREE.BoxGeometry(eW + 0.6, 0.25, eD + 0.6), M.trim, 0, eH + 1.4, eZ));
      // Mid-story string course
      addM(mk(new THREE.BoxGeometry(eW + 0.3, 0.12, eD + 0.3), M.trim, 0, eH / 2 + 1.3, eZ));

      // ── RUSTICATED BASE — horizontal groove bands on lower third ──
      for (const ry of [2.5, 3.5, 4.5]) {
        addM(mk(new THREE.BoxGeometry(eW + 0.15, 0.06, eD + 0.15), M.stoneD, 0, ry, eZ));
      }

      // Two rows of arched windows (one per story) on front face
      for (let floor = 0; floor < 2; floor++) {
        const floorY = 3.8 + floor * (eH / 2 - 0.5);
        for (let twi = 0; twi < 3; twi++) {
          const twx = -eW / 2 + 2 + twi * (eW - 4) / 2;
          addArchedWindow(wg, twx, floorY, eZ - eD / 2 - 0.05, 1.2, 2.2, "x", M.trim);
          // ── WINDOW SURROUNDS — pediment hood above upper-floor windows only ──
          if (floor === 1) {
            const hoodY = floorY + 1.4;
            const hoodZ = eZ - eD / 2 - 0.08;
            const hoodW = 1.2 + 0.4; // window width + margin
            // Left slab angled upward to centre
            const hoodL = new THREE.Mesh(new THREE.BoxGeometry(hoodW / 2, 0.08, 0.22), M.trim);
            hoodL.position.set(twx - hoodW / 4, hoodY, hoodZ);
            hoodL.rotation.z = Math.PI / 8;
            wg.add(hoodL);
            // Right slab mirrored
            const hoodR = new THREE.Mesh(new THREE.BoxGeometry(hoodW / 2, 0.08, 0.22), M.trim);
            hoodR.position.set(twx + hoodW / 4, hoodY, hoodZ);
            hoodR.rotation.z = -Math.PI / 8;
            wg.add(hoodR);
          }
        }
        // Side windows (one per side per floor)
        addArchedWindow(wg, -(eW / 2 + 0.05), floorY, eZ, 1.0, 2.0, "z", M.trim);
        addArchedWindow(wg, (eW / 2 + 0.05), floorY, eZ, 1.0, 2.0, "z", M.trim);
      }

      // ── BALUSTRADE at mid-story string course — front face ──
      {
        const balY = eH / 2 + 1.3;
        const balZ = eZ - eD / 2 - 0.05;
        const postCount = 6;
        const postSpanW = eW - 1;
        // Top and bottom rails
        addM(mk(new THREE.BoxGeometry(postSpanW, 0.04, 0.08), M.trim, 0, balY + 0.28, balZ));
        addM(mk(new THREE.BoxGeometry(postSpanW, 0.04, 0.08), M.trim, 0, balY - 0.22, balZ));
        // Vertical balusters
        for (let bi = 0; bi < postCount; bi++) {
          const bx = -postSpanW / 2 + (bi / (postCount - 1)) * postSpanW;
          wg.add(mk(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), M.trim, bx, balY + 0.03, balZ));
        }
      }

      // ── DECORATIVE MEDALLION (clock face) between floors, front face ──
      addM(mk(new THREE.CircleGeometry(0.8, 16), M.goldBright, 0, eH * 0.5 + 1.3, eZ - eD / 2 - 0.06));

      // Tower entrance door
      addM(mk(new THREE.BoxGeometry(2.8, 4.5, 0.2), M.doorRich, 0, 3.7, eZ - eD / 2 - 0.08));
      addM(mk(new THREE.BoxGeometry(3.2, 5, 0.1), M.trim, 0, 3.9, eZ - eD / 2 - 0.04));
      // Tower door divider
      addM(mk(new THREE.BoxGeometry(0.07, 4.5, 0.1), M.gold, 0, 3.7, eZ - eD / 2 - 0.19));
      // Tower door panels — two recessed panels per leaf
      for (let tdp = -1; tdp <= 1; tdp += 2) {
        addM(mk(new THREE.BoxGeometry(1.1, 1.5, 0.03), M.door, tdp * 0.65, 2.7, eZ - eD / 2 - 0.1));
        addM(mk(new THREE.BoxGeometry(1.1, 1.5, 0.03), M.door, tdp * 0.65, 4.6, eZ - eD / 2 - 0.1));
      }
      // Tower door fanlight / semicircular transom
      {
        const tTransomGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.07, 14, 1, false, 0, Math.PI);
        const tTransomMesh = new THREE.Mesh(tTransomGeo, M.win);
        tTransomMesh.position.set(0, 6.15, eZ - eD / 2 - 0.08);
        tTransomMesh.rotation.z = Math.PI / 2;
        wg.add(tTransomMesh);
      }
      // Tower door threshold step
      addM(mk(new THREE.BoxGeometry(3.6, 0.18, 1.2), M.marble, 0, 1.1, eZ - eD / 2 - 0.7));

      // Portico columns at tower front (4 columns with arches)
      for (let ei = 0; ei < 4; ei++) {
        const ex = -eW / 2 + 1.5 + ei * (eW - 3) / 3;
        wg.add(mk(new THREE.CylinderGeometry(0.25, 0.3, eH * 0.5, 12), M.col, ex, eH * 0.25 + 1.3, eZ - eD / 2 - 0.5));
        wg.add(mk(new THREE.BoxGeometry(0.7, 0.15, 0.7), M.trim, ex, eH * 0.5 + 0.95, eZ - eD / 2 - 0.5));
        // Arches between tower portico columns — increased tube radius for prominence
        if (ei < 3) {
          const nextEx = -eW / 2 + 1.5 + (ei + 1) * (eW - 3) / 3;
          const archMidX = (ex + nextEx) / 2;
          const archSpan = Math.abs(nextEx - ex) / 2;
          const tArchGeo = new THREE.TorusGeometry(archSpan * 0.8, 0.1, 8, 10, Math.PI);
          const tArch = new THREE.Mesh(tArchGeo, M.trim);
          tArch.position.set(archMidX, eH * 0.5 + 0.85, eZ - eD / 2 - 0.5);
          wg.add(tArch);
        }
      }

      // ── CORNER URNS on tower cornice ──
      for (const ux of [-eW / 2 + 0.3, eW / 2 - 0.3]) {
        for (const uz of [eZ - eD / 2 + 0.3, eZ + eD / 2 - 0.3]) {
          // Urn body
          addM(mk(new THREE.CylinderGeometry(0.2, 0.15, 0.5, 8), M.stoneD, ux, eH + 1.7, uz));
          // Urn top sphere
          addM(mk(new THREE.SphereGeometry(0.15, 8, 8), M.stoneD, ux, eH + 1.7 + 0.4, uz));
        }
      }

      // ── HIPPED ROOF on tower — 4 angled terracotta slabs, ridge cap, eaves, brackets ──
      const tRoofBase = eH + 1.4;   // top of cornice
      const tRoofPeak = tRoofBase + 2.6; // ridge height above cornice

      // Front slope (toward viewer, -Z face)
      {
        const s = new THREE.Mesh(new THREE.BoxGeometry(eW + 1.5, 0.18, eD / 2 + 0.8), M.tile);
        s.position.set(0, tRoofBase + 1.1, eZ - (eD / 4 + 0.2));
        s.rotation.x = -0.3;
        s.castShadow = true;
        wg.add(s); addM(s);
      }
      // Back slope (+Z face)
      {
        const s = new THREE.Mesh(new THREE.BoxGeometry(eW + 1.5, 0.18, eD / 2 + 0.8), M.tile);
        s.position.set(0, tRoofBase + 1.1, eZ + (eD / 4 + 0.2));
        s.rotation.x = 0.3;
        s.castShadow = true;
        wg.add(s); addM(s);
      }
      // Left slope (-X face)
      {
        const s = new THREE.Mesh(new THREE.BoxGeometry(eW / 2 + 0.8, 0.18, eD + 1.5), M.tile);
        s.position.set(-(eW / 4 + 0.2), tRoofBase + 1.1, eZ);
        s.rotation.z = 0.3;
        s.castShadow = true;
        wg.add(s); addM(s);
      }
      // Right slope (+X face)
      {
        const s = new THREE.Mesh(new THREE.BoxGeometry(eW / 2 + 0.8, 0.18, eD + 1.5), M.tile);
        s.position.set(eW / 4 + 0.2, tRoofBase + 1.1, eZ);
        s.rotation.z = -0.3;
        s.castShadow = true;
        wg.add(s); addM(s);
      }

      // Flat ridge cap along the top
      addM(mk(new THREE.BoxGeometry(eW * 0.3, 0.12, 0.12), M.tile, 0, tRoofPeak, eZ));

      // Eave overhang strips — wooden fascia along all 4 eave edges
      addM(mk(new THREE.BoxGeometry(eW + 1.6, 0.12, 0.12), M.door, 0, tRoofBase + 0.06, eZ - (eD / 2 + 0.75))); // front eave
      addM(mk(new THREE.BoxGeometry(eW + 1.6, 0.12, 0.12), M.door, 0, tRoofBase + 0.06, eZ + (eD / 2 + 0.75))); // back eave
      addM(mk(new THREE.BoxGeometry(0.12, 0.12, eD + 1.6), M.door, -(eW / 2 + 0.75), tRoofBase + 0.06, eZ));    // left eave
      addM(mk(new THREE.BoxGeometry(0.12, 0.12, eD + 1.6), M.door, eW / 2 + 0.75, tRoofBase + 0.06, eZ));       // right eave

      // Terracotta ridge tile — half-cylinder profile along centre ridge
      {
        const rg = new THREE.CylinderGeometry(0.1, 0.1, eW * 0.5, 6, 1, false, 0, Math.PI);
        const rm = new THREE.Mesh(rg, M.tile);
        rm.position.set(0, tRoofPeak, eZ);
        rm.rotation.x = -Math.PI / 2;
        wg.add(rm); addM(rm);
      }

      // Eave brackets — small wooden corbels under front/back eaves, 6 per side
      for (let bi = 0; bi < 6; bi++) {
        const bx = -eW / 2 + 0.8 + bi * (eW - 1.6) / 5;
        addM(mk(new THREE.BoxGeometry(0.12, 0.15, 0.08), M.door, bx, tRoofBase + 0.06, eZ - (eD / 2 + 0.71)));
        addM(mk(new THREE.BoxGeometry(0.12, 0.15, 0.08), M.door, bx, tRoofBase + 0.06, eZ + (eD / 2 + 0.71)));
      }
      // Eave brackets — left/right eaves, 6 per side
      for (let bi = 0; bi < 6; bi++) {
        const bz = eZ - eD / 2 + 0.5 + bi * (eD - 1.0) / 5;
        addM(mk(new THREE.BoxGeometry(0.08, 0.15, 0.12), M.door, -(eW / 2 + 0.71), tRoofBase + 0.06, bz));
        addM(mk(new THREE.BoxGeometry(0.08, 0.15, 0.12), M.door, eW / 2 + 0.71, tRoofBase + 0.06, bz));
      }

      // Ridge finial — bronze sphere repositioned to new peak
      addM(mk(new THREE.SphereGeometry(0.2, 8, 8), M.bronze, 0, tRoofPeak + 0.25, eZ));

      wg.rotation.y = angle + Math.PI;
      const att = 2;
      wg.position.set(Math.sin(angle) * att, 0, Math.cos(angle) * att);
      palace.add(wg);
      sectionGroups.push({ group: wg, id: def.room.id, targetY: 0, currentY: 0, meshes: wingMeshes, accent: def.room.accent });

      const tLen = vD / 2 + wL + eD;
      const ct = new THREE.Mesh(new THREE.BoxGeometry(eW + 4, eH + 6, tLen + 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      ct.position.set(0, eH / 2 + 2, -(tLen + 2) / 2);
      ct.userData = { roomId: def.room.id, wingMeshes, accent: def.room.accent };
      wg.add(ct);
      clickTargets.push(ct);
    });
    } // end else (Roman castle)

    // ══════════════════════════════════════════
    // COURTYARD GARDENS — grand formal parterre (elevated to hilltop)
    // ══════════════════════════════════════════
    const courtyardGroup = new THREE.Group();
    courtyardGroup.position.y = HILL_Y + 0.3;
    scene.add(courtyardGroup);
    // Helper to add to courtyard instead of scene for garden elements
    const cAdd = (m: THREE.Object3D) => { courtyardGroup.add(m); return m; };
    // Helper: check if a world (x,z) position overlaps with any wing zone
    // Wings radiate from center — each occupies a corridor of width ~8 from r=8 to r=40
    const wingAngles: number[] = [];
    const nWings = WINGS.length;
    for (let i = 0; i < nWings; i++) {
      const a = isRenaissance ? (i / nWings) * Math.PI * 2 : (i / nWings) * Math.PI * 2 + Math.PI;
      wingAngles.push(a);
    }
    // Check if ANY part of a bounding box overlaps a wing corridor
    // padding = extra margin around the element (half-width of the object)
    const isInWingZone = (x: number, z: number, padding: number = 5): boolean => {
      // Check center + 4 corners offset by padding
      const testPoints = [
        [x, z], [x - padding, z - padding], [x + padding, z - padding],
        [x - padding, z + padding], [x + padding, z + padding],
        [x - padding, z], [x + padding, z], [x, z - padding], [x, z + padding],
      ];
      for (const [tx, tz] of testPoints) {
        const r = Math.sqrt(tx * tx + tz * tz);
        if (r < 6 || r > 55) continue;
        const ptAngle = Math.atan2(tx, tz);
        for (const wa of wingAngles) {
          let diff = ptAngle - wa;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          if (Math.abs(diff) < 0.52) return true; // ~30° half-width — generous corridor
        }
      }
      return false;
    };

    // Grand tiered fountain — find a safe position between wings
    let fX=0,fZ=-28;
    for (const [cx,cz] of [[0,-28],[18,-18],[-18,-18],[0,20],[20,15],[-20,15]]) {
      if (!isInWingZone(cx, cz, 7)) { fX = cx; fZ = cz; break; }
    }
    const fountainSafe = !isInWingZone(fX, fZ, 7);
    let fW1: THREE.Mesh | null = null, fW2: THREE.Mesh | null = null, fW3: THREE.Mesh | null = null;
    let pool: THREE.Mesh | null = null;
    if (fountainSafe) {
    // ── BASE STEPS — 3 concentric circular steps around the bottom basin ──
    cAdd(mk(new THREE.CylinderGeometry(6.5,6.5,.15,32),M.stoneD,fX,.08,fZ));
    cAdd(mk(new THREE.CylinderGeometry(6.0,6.0,.15,32),M.stoneD,fX,.23,fZ));
    cAdd(mk(new THREE.CylinderGeometry(5.5,5.5,.15,32),M.stoneD,fX,.38,fZ));

    // Bottom basin
    cAdd(mk(new THREE.CylinderGeometry(5,5.5,1,32),M.marble,fX,.5,fZ));
    cAdd(mk(new THREE.CylinderGeometry(4.5,4.5,.15,32),M.marbleVein,fX,1.05,fZ));
    fW1=new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.2,.08,32),M.water);fW1.position.set(fX,1.1,fZ);cAdd(fW1);
    // Scalloped edge — 12 bumps around bottom basin rim
    for(let si=0;si<12;si++){
      const sa=si*(Math.PI*2/12);
      cAdd(mk(new THREE.SphereGeometry(.3,6,4),M.marbleVein,fX+Math.cos(sa)*4.5,1.1,fZ+Math.sin(sa)*4.5));
    }

    // Middle tier pedestal
    cAdd(mk(new THREE.CylinderGeometry(1,1.4,2.5,12),M.marble,fX,2.4,fZ));
    // Carved panels on the 4 faces of the middle pedestal
    for(let pi=0;pi<4;pi++){
      const pa=pi*(Math.PI/2);
      const pm=mk(new THREE.BoxGeometry(.6,.8,.02),M.marbleVein,fX+Math.cos(pa)*1.01,2.35,fZ+Math.sin(pa)*1.01);
      pm.rotation.y=pa;cAdd(pm);
    }
    // Dolphin / putti figures — 4 decorative figures around middle pedestal
    for(let di=0;di<4;di++){
      const da=di*(Math.PI/2);
      const dr=1.6;
      cAdd(mk(new THREE.SphereGeometry(.25,6,6),M.bronze,fX+Math.cos(da)*dr,1.5,fZ+Math.sin(da)*dr));
      const tail=mk(new THREE.CylinderGeometry(.08,.05,.5,6),M.bronze,fX+Math.cos(da)*dr,1.85,fZ+Math.sin(da)*dr);
      tail.rotation.z=Math.cos(da)*0.4;tail.rotation.x=Math.sin(da)*0.4;cAdd(tail);
    }
    cAdd(mk(new THREE.CylinderGeometry(2.5,2.5,.15,20),M.marbleVein,fX,3.7,fZ));
    fW2=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,.06,20),M.water);fW2.position.set(fX,3.75,fZ);cAdd(fW2);
    // Scalloped edge — 12 bumps around middle basin rim
    for(let si=0;si<12;si++){
      const sa=si*(Math.PI*2/12);
      cAdd(mk(new THREE.SphereGeometry(.3,6,4),M.marbleVein,fX+Math.cos(sa)*2.5,3.78,fZ+Math.sin(sa)*2.5));
    }

    // Top tier
    cAdd(mk(new THREE.CylinderGeometry(.5,.7,1.8,8),M.marble,fX,4.6,fZ));
    cAdd(mk(new THREE.CylinderGeometry(1.2,1.2,.12,12),M.marbleVein,fX,5.6,fZ));
    fW3=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.06,12),M.water);fW3.position.set(fX,5.63,fZ);cAdd(fW3);
    // Scalloped edge — 12 bumps around top basin rim
    for(let si=0;si<12;si++){
      const sa=si*(Math.PI*2/12);
      cAdd(mk(new THREE.SphereGeometry(.3,6,4),M.marbleVein,fX+Math.cos(sa)*1.2,5.68,fZ+Math.sin(sa)*1.2));
    }

    // Finial stem + sphere (bronze for authentic Roman look)
    cAdd(mk(new THREE.CylinderGeometry(.2,.3,.8,8),M.bronze,fX,6.1,fZ));
    cAdd(mk(new THREE.SphereGeometry(.3,8,8),M.bronze,fX,6.7,fZ));
    // Acorn finial cone on top of sphere
    cAdd(mk(new THREE.ConeGeometry(.12,.25,8),M.bronze,fX,7.05,fZ));
    // Water jet — thin vertical cylinder simulating upward spray
    cAdd(mk(new THREE.CylinderGeometry(.02,.02,1.5,6),M.water,fX,7.45,fZ));
    }

    // ── COURTYARD OLIVE TREES — gnarled, silver-green Mediterranean olives ──
    const oliveCourtPositions = [[-18, -15], [18, -15], [-18, 15], [18, 15], [-25, 0], [25, 0]];
    oliveCourtPositions.filter(([ox, oz]) => !isInWingZone(ox, oz, 4)).forEach(([ox, oz]) => {
      // Gnarled trunk — thicker, with visible twist
      const trunk = mk(new THREE.CylinderGeometry(0.2, 0.35, 3, 8), M.bark, ox, 1.5, oz);
      trunk.rotation.z = Math.sin(ox * 0.5) * 0.08; // slight lean
      cAdd(trunk);
      // Secondary trunk branch
      const branch = mk(new THREE.CylinderGeometry(0.06, 0.15, 2, 6), M.bark, ox + 0.4, 2.8, oz + 0.2);
      branch.rotation.z = 0.3;
      cAdd(branch);
      // Wide spreading canopy — flattened, silver-green
      const canopy1 = mk(new THREE.SphereGeometry(2.5, 10, 8), new THREE.MeshStandardMaterial({ color: "#7A8A5A", roughness: 0.85 }), ox, 4.0, oz);
      canopy1.scale.set(1.2, 0.35, 1.1);
      canopy1.castShadow = true;
      cAdd(canopy1);
      // Secondary canopy lobe
      const canopy2 = mk(new THREE.SphereGeometry(1.8, 8, 6), new THREE.MeshStandardMaterial({ color: "#8A9A68", roughness: 0.82 }), ox + 1.2, 3.8, oz - 0.5);
      canopy2.scale.set(1, 0.3, 0.9);
      cAdd(canopy2);
      // Dappled shadow disc on ground
      const shadow = mk(new THREE.CircleGeometry(2.5, 12), new THREE.MeshStandardMaterial({ color: "#2A3A1A", roughness: 1, transparent: true, opacity: 0.12 }), ox, 0.06, oz);
      shadow.rotation.x = -Math.PI / 2;
      cAdd(shadow);
    });

    // Symmetrical parterre gardens with flower beds
    const parterreData=[[-16,-25],[16,-25],[-16,-45],[16,-45],[-24,-35],[24,-35]];
    const hedgeDark=new THREE.MeshStandardMaterial({color:"#2E4A22",roughness:.88});
    const hedgeMid=new THREE.MeshStandardMaterial({color:"#3A5A2A",roughness:.85});
    const gravelWarm=new THREE.MeshStandardMaterial({color:"#C8B898",roughness:.92});
    const lavenderMat=new THREE.MeshStandardMaterial({color:"#7A6898",roughness:.82});
    const rosedustMat=new THREE.MeshStandardMaterial({color:"#B88A7A",roughness:.8});
    const ivoryFlower=new THREE.MeshStandardMaterial({color:"#E8E0D0",roughness:.78});
    parterreData.filter(([hx,hz])=>!isInWingZone(hx,hz,5)).forEach(([hx,hz])=>{
      // Raised bed base
      cAdd(mk(new THREE.BoxGeometry(7,.7,5),hedgeDark,hx,.35,hz));
      cAdd(mk(new THREE.BoxGeometry(6.6,.1,4.6),hedgeMid,hx,.72,hz));
      cAdd(mk(new THREE.BoxGeometry(5.8,.04,3.8),gravelWarm,hx,.76,hz));
      // Rounded hedge borders with height variation (multiple boxes for organic profile)
      for(let si=0;si<6;si++){
        const sx=hx-2.5+si*1;
        const hVar=.3+Math.sin(si*1.2)*.08; // subtle height variation
        cAdd(mk(new THREE.BoxGeometry(1.1,hVar,.3),hedgeMid,sx,.72+hVar/2,hz-1.8));
        cAdd(mk(new THREE.BoxGeometry(1.1,hVar,.3),hedgeMid,sx,.72+hVar/2,hz+1.8));
        // Rounded top caps
        const cap=mk(new THREE.SphereGeometry(.2,6,4),hedgeDark,sx,.72+hVar,hz-1.8);
        cap.scale.set(2.5,.4,1);cAdd(cap);
        const cap2=mk(new THREE.SphereGeometry(.2,6,4),hedgeDark,sx,.72+hVar,hz+1.8);
        cap2.scale.set(2.5,.4,1);cAdd(cap2);
      }
      // Cross hedges
      for(let si=0;si<4;si++){
        const sz=hz-1.2+si*.8;
        const hVar=.3+Math.sin(si*1.5)*.06;
        cAdd(mk(new THREE.BoxGeometry(.3,hVar,1),hedgeMid,hx,.72+hVar/2,sz));
      }
      const plantMats=[lavenderMat,rosedustMat,ivoryFlower,lavenderMat];
      for(let ci=0;ci<4;ci++){
        const cx=hx+(ci<2?-1.8:1.8),cz=hz+(ci%2===0?-1.2:1.2);
        const shrub=mk(new THREE.SphereGeometry(.35,6,5),plantMats[ci],cx,.85,cz);
        shrub.scale.set(1.2,.45,1.2);cAdd(shrub);
      }
    });

    // Small reflecting basin around fountain base
    if (fountainSafe) {
    cAdd(mk(new THREE.BoxGeometry(8,.15,8),M.stoneD,fX,.08,fZ));
    pool=new THREE.Mesh(new THREE.BoxGeometry(7,.06,7),M.waterDeep);pool.position.set(fX,.18,fZ);cAdd(pool);
    }

    // Simple potted plants — rustic terracotta pots with low greenery
    const potPositions2=[[-10,-35],[10,-35],[-10,-45],[10,-45]];
    potPositions2.filter(([tx,tz]: any)=>!isInWingZone(tx,tz,2)).forEach(([tx,tz]: any)=>{
      cAdd(mk(new THREE.CylinderGeometry(.4,.3,.6,8),M.tile,tx,.3,tz));
      const bush=mk(new THREE.SphereGeometry(.5,7,6),hedgeDark,tx,.8,tz);
      bush.scale.set(1,.6,1);cAdd(bush);
    });

    // A few simple terracotta pots near paths
    for(const[ux,uz]of[[-8,-35],[8,-35]].filter(([x,z])=>!isInWingZone(x,z,2))){
      cAdd(mk(new THREE.CylinderGeometry(.2,.28,.5,8),M.tile,ux,.25,uz));
      cAdd(mk(new THREE.SphereGeometry(.18,6,5),hedgeDark,ux,.55,uz));
    }

    // Stone benches
    for(const[bx,bz]of[[-13,-35],[13,-35]].filter(([x,z])=>!isInWingZone(x,z,3))){
      cAdd(mk(new THREE.BoxGeometry(2.5,.06,1),M.marble,bx,.54,bz));
      cAdd(mk(new THREE.BoxGeometry(2.5,.35,.7),M.marbleVein,bx,.18+.17,bz));
      for(const s of[-.9,.9])cAdd(mk(new THREE.BoxGeometry(.4,.35,.7),M.stoneD,bx+s,.18+.17,bz));
    }

    // Main gravel path — wide avenue from entrance gate south to hilltop edge (skip wing zones)
    for(let pi=0;pi<18;pi++){
      const pz=-14-pi*1.6;
      if(!isInWingZone(0,pz,4))cAdd(mk(new THREE.BoxGeometry(5.5,.05,2.2),M.pathD,0,.04,pz));
    }
    // Radiating side paths (skip wing zones)
    for(let ri=0;ri<6;ri++){
      const pa=(ri/6)*Math.PI*2;if(Math.abs(Math.sin(pa))<.3&&Math.cos(pa)<0)continue;
      for(let s=0;s<6;s++){
        const pd=22+s*3;
        const px=Math.cos(pa)*pd,pz=Math.sin(pa)*pd;
        if(!isInWingZone(px,pz,2))cAdd(mk(new THREE.BoxGeometry(2.2,.04,1.2),M.pathD,px,.03,pz));
      }
    }

    // ── GARDEN GROUNDS — gravel apron & herb beds near palace ──
    // No courtyard disc — terrain itself serves as the ground
    const herbGreen=new THREE.MeshStandardMaterial({color:"#5A6A3A",roughness:.88});
    const herbSilver=new THREE.MeshStandardMaterial({color:"#8A9878",roughness:.85});
    for(const[hx,hz]of[[20,12],[-20,12],[20,-12],[-20,-12]].filter(([x,z])=>!isInWingZone(x,z,4))){
      cAdd(mk(new THREE.BoxGeometry(4,.2,2),M.stoneD,hx,.1,hz));
      cAdd(mk(new THREE.BoxGeometry(3.6,.15,1.6),herbGreen,hx,.2,hz));
      for(let hi=0;hi<3;hi++){
        const hm=mk(new THREE.SphereGeometry(.25,6,5),(hi%2===0?herbGreen:herbSilver),hx-1.2+hi*1.2,.35,hz);
        hm.scale.set(1,.4,1);cAdd(hm);
      }
    }
    // Aged stone path segments radiating from courtyard (skip wing zones)
    for(let r=0;r<6;r++){
      const pa=(r/6)*Math.PI*2;
      for(let s=0;s<8;s++){
        const pd=42+s*3;
        const px=Math.cos(pa)*pd,pz=Math.sin(pa)*pd;
        if(isInWingZone(px,pz,2))continue;
        cAdd(mk(new THREE.BoxGeometry(2.2,.04,1.2),M.pathD,px,.03,pz));
      }
    }

    // ══════════════════════════════════════════
    // ══════════════════════════════════════════════════════════
    // PHOTOREALISTIC TUSCAN LANDSCAPE — summery Val d'Orcia
    // ══════════════════════════════════════════════════════════

    // Helper: atmospheric color — objects fade to warm golden haze with distance
    const atmosColor=(baseColor: string,dist: number)=>{
      const c=new THREE.Color(baseColor);const haze=new THREE.Color("#DDD0A0");
      const f=Math.min(1,Math.max(0,(dist-60)/400));
      c.lerp(haze,f*.6);return c;
    };

    // (terrain already created above via createTuscanTerrain)

    // ── INSTANCED GRASS — dense wind-animated shader grass on the hilltop ──
    const grassSystem = createGrassSystem(scene, {
      count: 15000,
      radius: 90,
      innerRadius: 38,
      bladeHeight: 1.4,
      baseColor: "#4A5020",
      tipColor1: "#B8A860",
      tipColor2: "#8A8038",
      yOffset: HILL_Y,
    });

    // ── PALACE CYPRESS RING — LatheGeometry with vertex noise for natural columnar shape ──
    const buildCypress=(px: number,pz: number,h: number,baseY: number)=>{
      // Trunk
      scene.add(mk(new THREE.CylinderGeometry(.04,.14,h*.3,5),M.barkD,px,baseY+h*.15,pz));
      scene.add(mk(new THREE.CylinderGeometry(.12,.18,.25,5),M.barkD,px,baseY+.12,pz));
      // Foliage — LatheGeometry with noisy columnar profile
      const foliageH=h*.82;
      const maxR=0.5;
      const segs=18,radSegs=8;
      const seed=px*137.5+pz*281.3;
      const profile: THREE.Vector2[]=[];
      for(let i=0;i<=segs;i++){
        const t=i/segs;
        let r: number;
        if(t<0.05){r=maxR*.35*(t/.05);}
        else if(t<0.2){r=maxR*(.35+.65*((t-.05)/.15));}
        else if(t<0.9){const tp=(t-.2)/.7;r=maxR*(1-.4*tp);}
        else{const tp=(t-.9)/.1;r=maxR*.6*(1-tp);}
        // Profile noise for bumpy silhouette
        const n=Math.sin(seed+t*47.3)*Math.cos(seed*.7+t*31.1);
        r*=1+n*.12;
        profile.push(new THREE.Vector2(Math.max(r,.02),t*foliageH));
      }
      const cypGeo=new THREE.LatheGeometry(profile,radSegs);
      // Per-vertex radial noise for organic bumps
      const pos=cypGeo.attributes.position;
      for(let v=0;v<pos.count;v++){
        const vx=pos.getX(v),vy=pos.getY(v),vz=pos.getZ(v);
        const dist=Math.sqrt(vx*vx+vz*vz);
        if(dist<.01)continue;
        const angle=Math.atan2(vz,vx);
        const ht=vy/foliageH;
        const n1=Math.sin(angle*5+seed)*Math.cos(ht*19+seed*.3)*.07;
        const n2=Math.sin(angle*11+seed*2.1)*Math.sin(ht*37+seed*.7)*.03;
        const n3=Math.cos(angle*17+seed*3.3)*Math.sin(ht*53+seed*1.1)*.02;
        const radN=1+n1+n2+n3;
        pos.setX(v,vx/dist*dist*radN);
        pos.setZ(v,vz/dist*dist*radN);
        pos.setY(v,vy+Math.sin(angle*7+ht*23+seed)*.02*foliageH);
      }
      cypGeo.computeVertexNormals();
      const hue=126+Math.sin(seed)*14;
      const sat=38+Math.abs(Math.cos(seed*.5))*10;
      const lt=9+Math.abs(Math.sin(seed*.3))*4;
      const foliageMat=new THREE.MeshStandardMaterial({
        color:new THREE.Color(`hsl(${hue},${sat}%,${lt}%)`),roughness:.92,flatShading:true,
      });
      const lean=(Math.sin(seed*1.7)-.5)*.03;
      const mesh=new THREE.Mesh(cypGeo,foliageMat);
      mesh.position.set(px+lean,baseY+h*.18,pz);
      mesh.rotation.y=seed;
      mesh.castShadow=true;
      scene.add(mesh);
    };
    for(let ci=0;ci<18;ci++){
      const ca=(ci/18)*Math.PI*2+Math.random()*.15;
      const cr=38+Math.random()*12;
      const ccx=Math.cos(ca)*cr,ccz=Math.sin(ca)*cr;
      if(isInWingZone(ccx,ccz,3))continue; // don't plant trees where wings are
      const cch=9+Math.random()*3;
      buildCypress(ccx,ccz,cch,getHeightAt(ccx,ccz));
    }

    // ── NEAR-PALACE VINEYARD — organized rows on south-east slope ──
    const vineRowMat=new THREE.MeshStandardMaterial({color:"#3A5828",roughness:.84});
    for(let row=0;row<14;row++){
      const vx=35+row*2.2;const vz=35+Math.sin(row*.3)*3;
      const vBaseY=getHeightAt(vx,vz);
      const vr=mk(new THREE.BoxGeometry(.35,.6,16),vineRowMat,vx,vBaseY+.3,vz);
      vr.rotation.y=.15;scene.add(vr);
    }

    // ── COURTYARD BOXWOOD HEDGES ──
    const boxwoodMat=new THREE.MeshStandardMaterial({color:"#2A4A1E",roughness:.88});
    for(let hi=0;hi<24;hi++){
      const ha=(hi/24)*Math.PI*2;
      const hx2=Math.cos(ha)*34,hz2=Math.sin(ha)*34;
      if(isInWingZone(hx2,hz2,3))continue;
      const hedge2=mk(new THREE.BoxGeometry(3,.8,.6),boxwoodMat,hx2,.4,hz2);
      hedge2.rotation.y=ha+Math.PI/2;courtyardGroup.add(hedge2);
    }

    // ── LOW DRY STONE WALL around courtyard edge (rustic, not fancy) ──
    const dryWallMat=new THREE.MeshStandardMaterial({color:"#A09078",roughness:.92,metalness:0,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.4,.4)});
    for(let wi=0;wi<20;wi++){
      const wa=(wi/20)*Math.PI*2;
      const wx=Math.cos(wa)*42,wz=Math.sin(wa)*42;
      if(isInWingZone(wx,wz,3))continue;
      const seg=mk(new THREE.BoxGeometry(4,.45,.35),dryWallMat,wx,.22,wz);
      seg.rotation.y=wa+Math.PI/2;cAdd(seg);
    }

    // ── PATCHWORK FIELDS: Tuscan summer — golden wheat blankets the landscape ──
    const cropDispMap=loadDisplacementMap("/textures/pbr/crop/crop_disp_1k.jpg",[4,4]);
    // Sunny crop yellow palette — warm golden tints dominate
    const wheatTints=["#D8B848","#C8A848","#E0C060","#B8A040","#C8B050","#E4C868","#D0B048","#CCB258","#D4B450","#C0A048","#DAC058","#C4A838","#E2C468","#D6B850","#CCAA48"];
    const greenTints=["#8A9848","#7A8840","#909850"];
    const earthTints=["#B0A070","#A09060","#B8A878"];
    // VERY dense field coverage — 500 patches for a sea of golden wheat
    for(let fi=0;fi<500;fi++){
      const angle=Math.random()*Math.PI*2;
      const dist=65+Math.random()*480;
      const fx=Math.cos(angle)*dist,fz=Math.sin(angle)*dist-40;
      if(Math.sqrt(fx*fx+(fz+40)*(fz+40))<62)continue;
      const fw=18+Math.random()*55,fl=12+Math.random()*40;
      const d=Math.sqrt(fx*fx+fz*fz);
      // 90% golden wheat, 6% green crop, 4% plowed earth
      const fieldType=Math.random();
      let fieldMat: THREE.MeshStandardMaterial;
      if(fieldType<0.90){
        const tint=atmosColor(wheatTints[fi%wheatTints.length],d);
        fieldMat=new THREE.MeshStandardMaterial({
          map:cropTex.map,normalMap:cropTex.normalMap,normalScale:new THREE.Vector2(.6,.6),
          roughnessMap:cropTex.roughnessMap,aoMap:cropTex.aoMap,aoMapIntensity:.3,
          displacementMap:cropDispMap,displacementScale:0.8,
          color:tint,roughness:.92,envMapIntensity:.1,
        });
      }else if(fieldType<0.96){
        const tint=atmosColor(greenTints[fi%greenTints.length],d);
        fieldMat=new THREE.MeshStandardMaterial({
          map:grassTex.map,normalMap:grassTex.normalMap,normalScale:new THREE.Vector2(.5,.5),
          roughnessMap:grassTex.roughnessMap,
          color:tint,roughness:.90,envMapIntensity:.1,
        });
      }else{
        const tint=atmosColor(earthTints[fi%earthTints.length],d);
        fieldMat=new THREE.MeshStandardMaterial({
          map:groundTex.map,normalMap:groundTex.normalMap,normalScale:new THREE.Vector2(.4,.4),
          roughnessMap:groundTex.roughnessMap,
          color:tint,roughness:.94,envMapIntensity:.08,
        });
      }
      const fieldGeo=new THREE.PlaneGeometry(fw,fl,16,16);
      const fm=new THREE.Mesh(fieldGeo,fieldMat);
      fm.rotation.x=-Math.PI/2;fm.position.set(fx,getHeightAt(fx,fz)+.2,fz);fm.rotation.z=Math.random()*.5-.25;
      fm.receiveShadow=true;scene.add(fm);
    }

    // ── VINEYARDS: organized rows on gentle slopes ──
    const vineM=[new THREE.MeshStandardMaterial({color:"#3A5828",roughness:.85}),new THREE.MeshStandardMaterial({color:"#4A6830",roughness:.82})];
    for(let vi=0;vi<14;vi++){
      const vAngle=Math.random()*Math.PI*2;
      const vDist=90+vi*28+Math.random()*25;
      const vx=Math.cos(vAngle)*vDist,vz=Math.sin(vAngle)*vDist-40;
      if(Math.sqrt(vx*vx+(vz+40)*(vz+40))<85)continue;
      const vRot=vAngle+Math.PI/2+Math.random()*.2-.1;
      const nRows=12+Math.floor(Math.random()*15);
      for(let row=0;row<nRows;row++){
        const rx=vx+Math.cos(vRot)*row*1.8,rz=vz+Math.sin(vRot)*row*1.8;
        const rowLen=14+Math.random()*10;
        const vCol=atmosColor(vineM[row%2].color.getStyle(),Math.sqrt(rx*rx+rz*rz));
        const rm=mk(new THREE.BoxGeometry(.35,.7,rowLen),new THREE.MeshStandardMaterial({color:vCol,roughness:.84}),rx,getHeightAt(rx,rz)+.35,rz);
        rm.rotation.y=vRot;scene.add(rm);
      }
    }

    // ── CYPRESS TREES: dense Tuscan signature ──
    const cypressPositions: number[][]=[];
    // Along winding road — dense avenue
    for(let ri=0;ri<50;ri++){
      const rz=-45-ri*7;const rx=Math.sin(ri*.22)*28;
      if(Math.random()>.3)cypressPositions.push([rx-4.5+Math.random()*1.5,rz+Math.random()*2]);
      if(Math.random()>.3)cypressPositions.push([rx+4.5+Math.random()*1.5,rz+Math.random()*2]);
    }
    // Hilltop clusters
    for(let ci=0;ci<35;ci++){
      const angle=Math.random()*Math.PI*2,dist=55+Math.random()*280;
      cypressPositions.push([Math.cos(angle)*dist,Math.sin(angle)*dist-50]);
    }
    // Iconic ridge lines of 4-8 trees
    for(let g=0;g<12;g++){
      const gx=-250+Math.random()*500,gz=-60-Math.random()*320;
      const gCount=4+Math.floor(Math.random()*5);
      const gAngle=Math.random()*Math.PI;
      for(let t=0;t<gCount;t++){
        cypressPositions.push([gx+Math.cos(gAngle)*t*4+Math.random()*1.5,gz+Math.sin(gAngle)*t*4+Math.random()*1.5]);
      }
    }
    // Farmhouse accompaniment
    for(let f=0;f<20;f++){
      const angle=Math.random()*Math.PI*2,dist=100+Math.random()*250;
      for(let t=0;t<2+Math.floor(Math.random()*3);t++){
        cypressPositions.push([Math.cos(angle)*dist+Math.random()*6-3,Math.sin(angle)*dist-50+Math.random()*6-3]);
      }
    }
    cypressPositions.forEach(([cx2,cz])=>{
      if(Math.sqrt(cx2*cx2+cz*cz)<50)return;
      const d=Math.sqrt(cx2*cx2+cz*cz);
      const ch=5+Math.random()*6;
      const cyBaseY=getHeightAt(cx2,cz);
      // Near cypresses get full layered detail; far ones get simpler geometry
      if(d<180){
        buildCypress(cx2,cz,ch,cyBaseY);
      }else{
        const cCol=atmosColor(`hsl(${126+Math.random()*12},${32+Math.random()*10}%,${10+Math.random()*5}%)`,d);
        scene.add(mk(new THREE.CylinderGeometry(.06,.12,ch*.2,5),M.barkD,cx2,cyBaseY+ch*.1,cz));
        // Columnar silhouette — tapered cylinder (narrow, not cone-shaped)
        const mat=new THREE.MeshStandardMaterial({color:cCol,roughness:.9});
        const col=new THREE.Mesh(new THREE.CylinderGeometry(.12,.3,ch*.8,6),mat);
        col.position.set(cx2,cyBaseY+ch*.5,cz);col.castShadow=d<250;scene.add(col);
      }
    });

    // ── OLIVE GROVES: silver-green, gnarled ──
    for(let oi=0;oi<40;oi++){
      const angle=Math.random()*Math.PI*2,dist=38+Math.random()*120;
      const ox=Math.cos(angle)*dist,oz=Math.sin(angle)*dist-20;
      if(Math.sqrt(ox*ox+oz*oz)<48)continue;
      const d=Math.sqrt(ox*ox+oz*oz);
      const oCol=atmosColor(`hsl(${102+Math.random()*18},${22+Math.random()*18}%,${36+Math.random()*12}%)`,d);
      const olBaseY=getHeightAt(ox,oz);
      scene.add(mk(new THREE.CylinderGeometry(.12,.2,2,5),M.bark,ox,olBaseY+1,oz));
      const cn=new THREE.Mesh(new THREE.SphereGeometry(1.8+Math.random()*.8,8,7),new THREE.MeshStandardMaterial({color:oCol,roughness:.84}));
      cn.position.set(ox,olBaseY+2.8+Math.random()*.3,oz);cn.scale.set(1,.4,1);cn.castShadow=d<120;scene.add(cn);
    }

    // ── STONE PINES (umbrella pines) ──
    for(let pi=0;pi<18;pi++){
      const angle=Math.random()*Math.PI*2,dist=70+Math.random()*200;
      const px=Math.cos(angle)*dist,pz=Math.sin(angle)*dist-50;
      if(Math.sqrt(px*px+(pz+50)*(pz+50))<55)continue;
      const d=Math.sqrt(px*px+pz*pz);
      const ph=5+Math.random()*4;
      const pCol=atmosColor("#3A6830",d);
      const pnBaseY=getHeightAt(px,pz);
      scene.add(mk(new THREE.CylinderGeometry(.18,.28,ph,6),M.bark,px,pnBaseY+ph/2,pz));
      const canopy=new THREE.Mesh(new THREE.SphereGeometry(2.5+Math.random()*1.2,10,8),new THREE.MeshStandardMaterial({color:pCol,roughness:.82}));
      canopy.position.set(px,pnBaseY+ph+.8,pz);canopy.scale.set(1,.28,1);canopy.castShadow=d<130;scene.add(canopy);
    }

    // ── FARMHOUSES & VILLAS: warm stone, terracotta roofs, shutters ──
    const farmPositions=[[-110,-140],[135,-120],[-55,-200],[95,-230],[-170,-110],[190,-160],[-35,-270],[65,-290],
      [-150,-195],[165,-215],[-85,-280],[105,-165],[-195,-140],[225,-110],[-125,-250],[155,-275],
      [-40,-150],[130,-190],[-90,-110],[180,-250],[-210,-200],[250,-180],[-160,-300],[200,-310]];
    farmPositions.forEach(([fx,fz])=>{
      const d=Math.sqrt(fx*fx+fz*fz);
      const fh=2+Math.random()*2.5;const fw=3.5+Math.random()*3;const fd=fw*.65+Math.random();
      const wallCol=atmosColor(`hsl(${28+Math.random()*10},${18+Math.random()*12}%,${78+Math.random()*10}%)`,d);
      const farmBaseY=getHeightAt(fx,fz);
      // Main building
      scene.add(mk(new THREE.BoxGeometry(fw,fh,fd),new THREE.MeshStandardMaterial({color:wallCol,roughness:.78}),fx,farmBaseY+fh/2+.3,fz));
      // Terracotta roof — slight overhang
      const roofCol=atmosColor("#9B7868",d);
      const rf=mk(new THREE.BoxGeometry(fw+.8,.25,fd+.6),new THREE.MeshStandardMaterial({color:roofCol,roughness:.6}),fx,farmBaseY+fh+.5,fz);
      rf.rotation.z=.08+Math.random()*.06;scene.add(rf);
      // Chimney
      if(Math.random()>.4){
        scene.add(mk(new THREE.BoxGeometry(.4,1.2,.4),new THREE.MeshStandardMaterial({color:wallCol,roughness:.75}),fx+fw*.3,farmBaseY+fh+1,fz));
      }
      // Shutters (tiny boxes on walls)
      const shutterCol=atmosColor(`hsl(${140+Math.random()*40},${25+Math.random()*15}%,${30+Math.random()*15}%)`,d);
      for(let wi=0;wi<2;wi++){
        scene.add(mk(new THREE.BoxGeometry(fw*.15,.25,.03),new THREE.MeshStandardMaterial({color:shutterCol,roughness:.7}),fx-fw*.25+wi*fw*.5,farmBaseY+fh*.6,fz+fd/2+.02));
      }
      // Extension wing on larger farms
      if(Math.random()>.55){
        const eh=fh*.7,ew=fw*.6;
        scene.add(mk(new THREE.BoxGeometry(ew,eh,fd*.8),new THREE.MeshStandardMaterial({color:wallCol,roughness:.78}),fx+fw*.5+ew*.4,farmBaseY+eh/2+.3,fz));
        scene.add(mk(new THREE.BoxGeometry(ew+.5,.2,fd*.8+.4),new THREE.MeshStandardMaterial({color:roofCol,roughness:.6}),fx+fw*.5+ew*.4,farmBaseY+eh+.5,fz));
      }
      // Warm window glow
      if(d<250){
        const wl=new THREE.PointLight("#FFE0A0",.15,8);wl.position.set(fx,farmBaseY+fh*.6,fz+fd/2+1);scene.add(wl);
      }
    });

    // ── STRADE BIANCHE — authentic Tuscan white gravel roads with PBR textures ──

    // Helper: create a strada bianca segment with proper PBR white gravel + wheel ruts
    const mkStrada=(x: number,z: number,w: number,len: number,rotY: number,yPos?: number)=>{
      const d=Math.sqrt(x*x+z*z);
      const col=atmosColor("#F0E4D0",d); // lighter warm white
      const geo=new THREE.PlaneGeometry(w,len,8,8);
      const mat=new THREE.MeshStandardMaterial({
        map:whiteGravelTex.map,normalMap:whiteGravelTex.normalMap,normalScale:new THREE.Vector2(.8,.8),
        roughnessMap:whiteGravelTex.roughnessMap,aoMap:whiteGravelTex.aoMap,aoMapIntensity:.35,
        color:col,roughness:.94,envMapIntensity:.12,
      });
      const y=yPos!==undefined?yPos:getHeightAt(x,z)+.18;
      const m=new THREE.Mesh(geo,mat);
      m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.rotation.z=rotY;
      m.receiveShadow=true;scene.add(m);
      // Dusty shoulder — wider, softer
      const dustGeo=new THREE.PlaneGeometry(w+2.5,len+1);
      const dustMat=new THREE.MeshStandardMaterial({
        color:atmosColor("#E8DCC4",d),roughness:.96,transparent:true,opacity:.3,
      });
      const dust=new THREE.Mesh(dustGeo,dustMat);
      dust.rotation.x=-Math.PI/2;dust.position.set(x,y-.04,z);dust.rotation.z=rotY;
      scene.add(dust);
      // Wheel ruts — two subtle darker tracks
      for(const offset of[-w*.28,w*.28]){
        const rutGeo=new THREE.PlaneGeometry(w*.12,len-.5);
        const rutMat=new THREE.MeshStandardMaterial({
          color:atmosColor("#C8B8A0",d),roughness:.96,transparent:true,opacity:.22,
        });
        const rut=new THREE.Mesh(rutGeo,rutMat);
        rut.rotation.x=-Math.PI/2;
        rut.position.set(x+Math.cos(rotY)*offset,y+.01,z-Math.sin(rotY)*offset);
        rut.rotation.z=rotY;
        scene.add(rut);
      }
    };

    // ROAD TO PALACE — strada bianca leading EXACTLY to temple entrance
    // Entrance vestibulum faces -Z at world coords (0, HILL_Y, vestZ≈-12)
    // Road descends from hilltop courtyard edge down to flat ground, then continues south
    // Courtyard path connects entrance to road at z≈-40
    // Hill slope section (on the hill surface, angled slightly)
    for(let ri=0;ri<12;ri++){
      const rz=-40-ri*3.5;
      const hillProgress=ri/12; // 0 at top, 1 at bottom
      const ry=HILL_Y*(1-hillProgress)-.5; // descends from hilltop to ground
      mkStrada(0,rz,4.2,4.5,0,ry);
    }
    // Ground-level section continuing south in a gentle curve
    for(let ri=0;ri<20;ri++){
      const rz=-82-ri*3.5;
      const rx=Math.sin(ri*.12)*6;
      mkStrada(rx,rz,4,4.5,Math.sin(ri*.12)*.12*.12,getHeightAt(rx,rz)+.18);
    }

    // Main strada bianca — winding south through wheat fields
    for(let ri=0;ri<75;ri++){
      const rz=-110-ri*6;const rx=Math.sin(ri*.18)*35+Math.cos(ri*.07)*15;
      mkStrada(rx,rz,3.5,7,Math.atan2(Math.cos(ri*.18)*.18*35,1)*.1);
    }
    // East branch strada
    for(let ri=0;ri<45;ri++){
      const baseAngle=Math.PI*0.3;
      const rDist=70+ri*7;
      const rx2=Math.cos(baseAngle)*rDist+Math.sin(ri*.15)*18;
      const rz2=-Math.sin(baseAngle)*rDist+Math.cos(ri*.12)*8-55;
      mkStrada(rx2,rz2,3.0,7.5,baseAngle*.3);
    }
    // West branch strada
    for(let ri=0;ri<40;ri++){
      const baseAngle=-Math.PI*0.35;
      const rDist=75+ri*7;
      const rx3=Math.cos(baseAngle)*rDist+Math.sin(ri*.12)*15;
      const rz3=-65-ri*6;
      mkStrada(rx3,rz3,2.8,7,0);
    }

    // ── ROMAN AQUEDUCT — Pont du Gard-style two-tier structure ──
    if(!isRenaissance){
    const aqZ=220; // behind palace, far in background
    const aqSpans=12;
    const aqSpacing=10;
    const aqPierW=2.2;
    const aqStartX=-65;
    const aqLowerH=10;
    const aqArchR=(aqSpacing-aqPierW)/2;
    for(let aq=0;aq<=aqSpans;aq++){
      const aqX=aqStartX+aq*aqSpacing;
      const d=Math.sqrt(aqX*aqX+aqZ*aqZ);
      const col=atmosColor("#D0C4B0",d);
      const pierMat=new THREE.MeshStandardMaterial({color:col,roughness:.82,envMapIntensity:.2});
      scene.add(mk(new THREE.BoxGeometry(aqPierW+.4,aqLowerH,2.8),pierMat,aqX,aqLowerH/2,aqZ));
      scene.add(mk(new THREE.BoxGeometry(aqPierW+.8,.4,3.2),new THREE.MeshStandardMaterial({color:atmosColor("#C8BAA4",d),roughness:.78}),aqX,aqLowerH+.2,aqZ));
      if(aq<aqSpans){
        const archCx=aqX+aqSpacing/2;
        const nVouss=16;
        for(let v=0;v<=nVouss;v++){
          const a=Math.PI*(v/nVouss);
          const ax=archCx+Math.cos(a)*aqArchR;
          const ay=aqLowerH+.4+Math.sin(a)*aqArchR;
          const block=mk(new THREE.BoxGeometry(.7,.5,2.6),new THREE.MeshStandardMaterial({color:atmosColor(v%2===0?"#C8BAA8":"#D0C4B0",d),roughness:.8}),ax,ay,aqZ);
          block.rotation.z=a-Math.PI/2;
          scene.add(block);
        }
        scene.add(mk(new THREE.BoxGeometry(aqSpacing-aqPierW-.4,aqArchR*.35,2.4),new THREE.MeshStandardMaterial({color:atmosColor("#C4B8A4",d),roughness:.84}),archCx,aqLowerH+aqArchR+.6,aqZ));
      }
    }
    const tierCorniceY=aqLowerH+aqArchR+1.2;
    scene.add(mk(new THREE.BoxGeometry(aqSpans*aqSpacing+aqPierW+2,.5,3.4),new THREE.MeshStandardMaterial({color:atmosColor("#C8BAA8",Math.abs(aqZ)),roughness:.78}),aqStartX+aqSpans*aqSpacing/2,tierCorniceY,aqZ));
    const aqUpperH=5;
    const aqUpperSpans=aqSpans*2;
    const aqUpperSpacing=aqSpacing/2;
    const aqUpperPierW=1.2;
    const aqUpperArchR=(aqUpperSpacing-aqUpperPierW)/2;
    for(let aq=0;aq<=aqUpperSpans;aq++){
      const aqX=aqStartX+aq*aqUpperSpacing;
      const d=Math.sqrt(aqX*aqX+aqZ*aqZ);
      const col=atmosColor("#D4C8B4",d);
      const pierMat=new THREE.MeshStandardMaterial({color:col,roughness:.82,envMapIntensity:.15});
      scene.add(mk(new THREE.BoxGeometry(aqUpperPierW,aqUpperH,2.2),pierMat,aqX,tierCorniceY+.25+aqUpperH/2,aqZ));
      if(aq<aqUpperSpans){
        const archCx=aqX+aqUpperSpacing/2;
        const nV=10;
        for(let v=0;v<=nV;v++){
          const a=Math.PI*(v/nV);
          const ax=archCx+Math.cos(a)*aqUpperArchR;
          const ay=tierCorniceY+.25+aqUpperH+Math.sin(a)*aqUpperArchR;
          const block=mk(new THREE.BoxGeometry(.4,.35,2.0),new THREE.MeshStandardMaterial({color:atmosColor(v%2===0?"#C8BAA8":"#D0C4B0",d),roughness:.82}),ax,ay,aqZ);
          block.rotation.z=a-Math.PI/2;
          scene.add(block);
        }
      }
    }
    const aqTopY=tierCorniceY+.25+aqUpperH+aqUpperArchR+.8;
    scene.add(mk(new THREE.BoxGeometry(aqSpans*aqSpacing+aqPierW+2,.4,3.0),new THREE.MeshStandardMaterial({color:atmosColor("#C8BAA8",Math.abs(aqZ)),roughness:.78}),aqStartX+aqSpans*aqSpacing/2,aqTopY,aqZ));
    scene.add(mk(new THREE.BoxGeometry(aqSpans*aqSpacing+aqPierW,.15,1.2),new THREE.MeshStandardMaterial({color:atmosColor("#B0A898",Math.abs(aqZ)),roughness:.75}),aqStartX+aqSpans*aqSpacing/2,aqTopY+.28,aqZ));
    for(const s of[-1,1]){
      scene.add(mk(new THREE.BoxGeometry(aqSpans*aqSpacing+aqPierW,.5,.15),new THREE.MeshStandardMaterial({color:atmosColor("#C4B8A8",Math.abs(aqZ)),roughness:.8}),aqStartX+aqSpans*aqSpacing/2,aqTopY+.5,aqZ+s*.65));
    }
    // Rocky hills on each end — aqueduct emerges from natural terrain
    const aqEndLeft=aqStartX;
    const aqEndRight=aqStartX+aqSpans*aqSpacing;
    const hillPeakY=aqTopY+3; // hills slightly above aqueduct top

    // Build a natural hill from multiple overlapping mounds + vegetation
    const buildNaturalHill=(baseCx: number,baseCz: number,spread: number,peakY: number,seed: number)=>{
      // Multiple overlapping mounds at random offsets for organic hillside
      const mounds: {mx:number,mz:number,rx:number,rz:number,h:number}[] = [];
      const nMounds = 5 + Math.floor(seed % 3);
      for (let mi = 0; mi < nMounds; mi++) {
        const angle = (mi / nMounds) * Math.PI * 2 + Math.sin(seed + mi) * .8;
        const dist = mi === 0 ? 0 : spread * (.15 + Math.random() * .35);
        const mx = baseCx + Math.cos(angle) * dist;
        const mz = baseCz + Math.sin(angle) * dist;
        const rx = spread * (.4 + Math.random() * .3) * (mi === 0 ? 1.2 : .7 + Math.random() * .4);
        const rz = rx * (.6 + Math.random() * .5);
        const h = mi === 0 ? peakY : peakY * (.4 + Math.random() * .45);
        mounds.push({ mx, mz, rx, rz, h });

        // Create mound mesh
        const mGeo = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        const mPos = mGeo.attributes.position;
        const mColors = new Float32Array(mPos.count * 3);
        for (let i = 0; i < mPos.count; i++) {
          let px2 = mPos.getX(i), py = mPos.getY(i), pz2 = mPos.getZ(i);
          px2 *= rx; pz2 *= rz; py *= h;
          // Terrain-like displacement
          const n1 = Math.sin(px2 * .12 + seed + mi) * Math.cos(pz2 * .15 + seed * .7) * 2;
          const n2 = Math.sin(px2 * .35 + seed * 1.3 + mi * 2) * Math.cos(pz2 * .3 + seed * 2.1) * 1;
          const hf = py / h;
          py += (n1 + n2) * hf;
          mPos.setXYZ(i, px2, py, pz2);
          // Vertex colors — Tuscan green hillside
          const greenVar = Math.sin(px2 * .2 + pz2 * .3 + seed + mi) * .08;
          const dryPatch = Math.sin(px2 * .6 + pz2 * .4 + seed * 3) * .5 + .5; // 0-1
          if (hf > .7 && dryPatch > .6) {
            // Rocky stone patches near summit
            mColors[i * 3] = .55 + Math.random() * .06;
            mColors[i * 3 + 1] = .48 + Math.random() * .05;
            mColors[i * 3 + 2] = .35 + Math.random() * .04;
          } else {
            // Tuscan brown/golden — dry grass, olive, wheat tones
            mColors[i * 3] = .52 + greenVar + dryPatch * .1 + Math.random() * .04;
            mColors[i * 3 + 1] = .44 + greenVar + hf * .04 + Math.random() * .04;
            mColors[i * 3 + 2] = .25 + Math.random() * .04;
          }
        }
        mGeo.setAttribute("color", new THREE.BufferAttribute(mColors, 3));
        mGeo.computeVertexNormals();
        const mMesh = new THREE.Mesh(mGeo, new THREE.MeshStandardMaterial({
          vertexColors: true, roughness: .92, metalness: 0, flatShading: true, envMap: null, envMapIntensity: 0
        }));
        mMesh.position.set(mx, 0, mz);
        mMesh.rotation.y = Math.random() * .5; // slight rotation for variety
        mMesh.receiveShadow = true;
        scene.add(mMesh);
      }

      // Height at world pos — max of all mound surfaces
      const hillSurfaceY = (wx: number, wz: number) => {
        let maxH = 0;
        for (const m of mounds) {
          const dx = (wx - m.mx) / m.rx;
          const dz = (wz - m.mz) / m.rz;
          const d2 = dx * dx + dz * dz;
          if (d2 >= 1) continue;
          const h2 = m.h * Math.sqrt(1 - d2);
          const n1 = Math.sin(wx * .12 + seed) * Math.cos(wz * .15 + seed * .7) * 2;
          const hf = h2 / m.h;
          const total = h2 + n1 * hf;
          if (total > maxH) maxH = total;
        }
        return maxH;
      };

      // Rocky outcrops at summit
      for (let ri = 0; ri < 6; ri++) {
        const ra = (ri / 6) * Math.PI * 2 + seed * .3;
        const rd = spread * (.05 + Math.random() * .15);
        const rx2 = baseCx + Math.cos(ra) * rd;
        const rz2 = baseCz + Math.sin(ra) * rd;
        const ry2 = hillSurfaceY(rx2, rz2) + .5;
        const rockGeo = new THREE.DodecahedronGeometry(.8 + Math.random() * 1.5, 0);
        const rPos2 = rockGeo.attributes.position;
        for (let vi = 0; vi < rPos2.count; vi++) {
          rPos2.setXYZ(vi,
            rPos2.getX(vi) * (.6 + Math.random() * .6),
            rPos2.getY(vi) * (.4 + Math.random() * .5),
            rPos2.getZ(vi) * (.6 + Math.random() * .6)
          );
        }
        rockGeo.computeVertexNormals();
        const rock = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({
          color: atmosColor(["#8A8470", "#9A9080", "#7A7868"][ri % 3], Math.sqrt(rx2 * rx2 + rz2 * rz2)),
          roughness: .95, flatShading: true
        }));
        rock.position.set(rx2, ry2, rz2);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        scene.add(rock);
      }

      // Cypress trees on hillside
      for (let ti = 0; ti < 14; ti++) {
        const ta = Math.PI * 2 * (ti / 14) + seed * .11 + Math.sin(seed + ti) * .4;
        const td = spread * (.1 + Math.random() * .55);
        const tx = baseCx + Math.cos(ta) * td;
        const tz = baseCz + Math.sin(ta) * td;
        const ty = hillSurfaceY(tx, tz);
        if (ty < 1.5) continue;
        buildCypress(tx, tz, 5 + Math.random() * 7, ty);
      }

      // Dense macchia bushes — olive/brown Mediterranean tones
      const bushColors = ["#5A5A30", "#4A4A28", "#585838", "#504828", "#5A5030"];
      for (let bi = 0; bi < 30; bi++) {
        const ba = Math.random() * Math.PI * 2;
        const bd = spread * (.05 + Math.random() * .6);
        const bx = baseCx + Math.cos(ba) * bd;
        const bz = baseCz + Math.sin(ba) * bd;
        const by = hillSurfaceY(bx, bz);
        if (by < .8) continue;
        const bCol = atmosColor(bushColors[bi % bushColors.length], Math.sqrt(bx * bx + bz * bz));
        const bush = mk(new THREE.DodecahedronGeometry(.4 + Math.random() * .7, 1),
          new THREE.MeshStandardMaterial({ color: bCol, roughness: .92, flatShading: true }),
          bx, by + .2, bz);
        bush.scale.set(1 + Math.random() * .5, .3 + Math.random() * .4, 1 + Math.random() * .4);
        scene.add(bush);
      }

      // Dry grass tufts at lower slopes
      const grassCol = atmosColor("#8A7A48", Math.sqrt(baseCx * baseCx + baseCz * baseCz));
      const grassMat = new THREE.MeshStandardMaterial({ color: grassCol, roughness: .95 });
      for (let gi = 0; gi < 20; gi++) {
        const ga = Math.random() * Math.PI * 2;
        const gd = spread * (.3 + Math.random() * .45);
        const gx = baseCx + Math.cos(ga) * gd;
        const gz = baseCz + Math.sin(ga) * gd;
        const gy = hillSurfaceY(gx, gz);
        if (gy < .3) continue;
        const tuft = mk(new THREE.ConeGeometry(.25 + Math.random() * .3, .4 + Math.random() * .3, 5), grassMat, gx, gy + .1, gz);
        tuft.scale.set(1.5, .7, 1.5); scene.add(tuft);
      }
    };

    // Left hill — centered on aqueduct left end so it connects
    buildNaturalHill(aqEndLeft - 10, aqZ, 45, hillPeakY, 42.7);
    // Right hill — centered on aqueduct right end
    buildNaturalHill(aqEndRight + 12, aqZ, 50, hillPeakY + 2, 91.3);
    }

    // ── STONE BRIDGE over winding stream ──
    const bridgeZ=-85;
    const bridgeBaseY=getHeightAt(18,bridgeZ);
    scene.add(mk(new THREE.BoxGeometry(7,.35,3.5),M.stoneD,18,bridgeBaseY+.75,bridgeZ));
    // Arch support
    scene.add(mk(new THREE.CylinderGeometry(.4,.5,1,8),M.stoneD,15,bridgeBaseY+.5,bridgeZ));
    scene.add(mk(new THREE.CylinderGeometry(.4,.5,1,8),M.stoneD,21,bridgeBaseY+.5,bridgeZ));
    // Bridge walls
    scene.add(mk(new THREE.BoxGeometry(.3,.5,3.5),M.stoneD,14.5,bridgeBaseY+1.2,bridgeZ));
    scene.add(mk(new THREE.BoxGeometry(.3,.5,3.5),M.stoneD,21.5,bridgeBaseY+1.2,bridgeZ));
    // Winding stream — longer, more natural
    for(let si=0;si<30;si++){
      const sx=8+si*2.5+Math.sin(si*.3)*4;const sz=bridgeZ+Math.sin(si*.35)*6-si*.5;
      const sw=new THREE.Mesh(new THREE.BoxGeometry(2.5+Math.random()*.5,.04,2.2),M.water);
      sw.position.set(sx,getHeightAt(sx,sz)+.12,sz);sw.rotation.y=Math.atan2(Math.cos(si*.35)*6*.35,2.5)+Math.random()*.2;
      scene.add(sw);
    }

    // ── MEDIEVAL HILLTOP VILLAGES removed — Rolling Hills HDRI provides distant scenery ──

    // ── SUNFLOWER/WHEAT FIELDS: dense textured golden patches ──
    const sunflowerTones=["#D8B848","#C8A840","#E4C050","#B89838","#D0B048","#DCC058","#C4A040","#E0C460"];
    for(let sf=0;sf<25;sf++){
      const angle=Math.random()*Math.PI*2,dist=100+Math.random()*180;
      const sx=Math.cos(angle)*dist,sz=Math.sin(angle)*dist-30;
      if(Math.sqrt(sx*sx+(sz+30)*(sz+30))<80)continue;
      const d=Math.sqrt(sx*sx+sz*sz);
      const sfCol=atmosColor(sunflowerTones[sf%sunflowerTones.length],d);
      const sfGeo=new THREE.PlaneGeometry(22+Math.random()*18,16+Math.random()*12,12,12);
      const sfm=new THREE.Mesh(sfGeo,new THREE.MeshStandardMaterial({
        map:cropTex.map,normalMap:cropTex.normalMap,normalScale:new THREE.Vector2(.5,.5),
        roughnessMap:cropTex.roughnessMap,
        displacementMap:cropDispMap,displacementScale:0.5,
        color:sfCol,roughness:.92,envMapIntensity:.1,
      }));
      sfm.rotation.x=-Math.PI/2;sfm.position.set(sx,getHeightAt(sx,sz)+.25,sz);sfm.rotation.z=Math.random()*.4;
      sfm.receiveShadow=true;scene.add(sfm);
    }

    // ── 3D WHEAT/GRAIN FIELDS: dense instanced stalks — Tuscan golden harvest ──
    const wheatFields: ReturnType<typeof createWheatField>[] = [];
    // Dense wheat fields blanketing the landscape — Tuscan summer harvest
    const wheatPositions = [
      // Near fields — dense coverage around palace
      [-70, -90, 40, 30], [80, -100, 35, 25], [-50, -140, 45, 35],
      [100, -80, 30, 22], [-110, -120, 40, 30], [60, -160, 35, 28],
      [-30, -110, 35, 25], [130, -130, 30, 22],
      [50, -75, 32, 24], [-85, -85, 38, 28], [110, -110, 34, 26],
      [-40, -70, 30, 22], [75, -130, 36, 28],
      // Mid-distance fields — blanket coverage
      [-90, -200, 50, 35], [110, -190, 45, 30], [-140, -170, 45, 35],
      [70, -240, 40, 30], [-60, -260, 50, 35], [150, -210, 40, 28],
      [-170, -140, 40, 30], [40, -180, 35, 25],
      [-30, -220, 42, 32], [120, -240, 38, 28], [-100, -260, 48, 35],
      [80, -200, 40, 30], [-150, -220, 44, 32], [160, -170, 36, 26],
      // Far fields
      [-120, -300, 55, 40], [130, -280, 50, 35], [-50, -320, 45, 35],
      [90, -340, 40, 30], [-180, -250, 45, 32],
      [-200, -300, 50, 38], [170, -310, 45, 32], [-80, -360, 48, 35],
      [50, -380, 42, 30], [-160, -340, 50, 38],
    ];
    // Add many procedurally generated fields across wider area
    for(let extra=0;extra<35;extra++){
      const angle=Math.random()*Math.PI*2;
      const dist=120+Math.random()*250;
      const wx2=Math.cos(angle)*dist;
      const wz2=Math.sin(angle)*dist-60;
      if(Math.sqrt(wx2*wx2+(wz2+60)*(wz2+60))<90)continue;
      wheatPositions.push([wx2,wz2,30+Math.random()*25,20+Math.random()*18]);
    }
    wheatPositions.forEach(([wx, wz, ww, wd], i) => {
      const isFar = i >= 16;
      wheatFields.push(createWheatField(scene, {
        count: isFar ? 600 : (1500 + Math.floor(Math.random() * 1000)),
        centerX: wx, centerZ: wz, width: ww, depth: wd,
        stalkHeight: 1.4 + Math.random() * 0.9,
        color: `hsl(${42 + Math.random() * 15}, ${45 + Math.random() * 20}%, ${58 + Math.random() * 14}%)`,
        headColor: `hsl(${40 + Math.random() * 12}, ${50 + Math.random() * 20}%, ${64 + Math.random() * 12}%)`,
        getHeightAt,
      }));
    });

    // ── STONE WALLS: dry stone walls between fields ──
    for(let sw=0;sw<20;sw++){
      const angle=Math.random()*Math.PI*2,dist=60+Math.random()*200;
      const wx=Math.cos(angle)*dist,wz=Math.sin(angle)*dist-40;
      if(Math.sqrt(wx*wx+(wz+40)*(wz+40))<70)continue;
      const wLen=8+Math.random()*20,wAng=Math.random()*Math.PI;
      const d=Math.sqrt(wx*wx+wz*wz);
      const wCol=atmosColor("#B0A888",d);
      const wall=mk(new THREE.BoxGeometry(wLen,.5,.3),new THREE.MeshStandardMaterial({color:wCol,roughness:.9}),wx,getHeightAt(wx,wz)+.3,wz);
      wall.rotation.y=wAng;scene.add(wall);
    }

    // ── DISTANT MOUNTAIN RANGE removed — Rolling Hills HDRI provides realistic horizon ──

    // ══════════════════════════════════════════
    // ATMOSPHERIC EFFECTS
    // ══════════════════════════════════════════

    // Golden dust motes / pollen
    const dustN=200,dG=new THREE.BufferGeometry(),dP=new Float32Array(dustN*3);
    for(let i=0;i<dustN;i++){dP[i*3]=(Math.random()-.5)*120;dP[i*3+1]=2+Math.random()*25;dP[i*3+2]=(Math.random()-.5)*120;}
    dG.setAttribute("position",new THREE.BufferAttribute(dP,3));
    scene.add(new THREE.Points(dG,new THREE.PointsMaterial({color:"#FFF0C0",size:.12,transparent:true,opacity:.18,blending:THREE.AdditiveBlending,depthWrite:false})));

    // Floating memory orbs (magical bubbles referencing the concept art)
    const orbN=35,orbG=new THREE.BufferGeometry(),orbP=new Float32Array(orbN*3);
    for(let i=0;i<orbN;i++){
      const angle=Math.random()*Math.PI*2,dist=25+Math.random()*50;
      orbP[i*3]=Math.cos(angle)*dist;orbP[i*3+1]=10+Math.random()*30;orbP[i*3+2]=Math.sin(angle)*dist;
    }
    orbG.setAttribute("position",new THREE.BufferAttribute(orbP,3));
    scene.add(new THREE.Points(orbG,new THREE.PointsMaterial({color:"#FFE8C0",size:.6,transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false})));

    // Valley mist — warm golden haze in low-lying terrain areas
    const mistN=60;
    const mistMeshes: THREE.Mesh[]=[];
    for(let i=0;i<mistN;i++){
      const mx=(Math.random()-.5)*300,mz=(Math.random()-.5)*300-30;
      const mh=getHeightAt(mx,mz);
      // Only place mist in valleys (low terrain)
      if(mh>3)continue;
      const mm=new THREE.Mesh(new THREE.PlaneGeometry(18+Math.random()*18,3+Math.random()*2),
        new THREE.MeshBasicMaterial({color:"#E8DCC0",transparent:true,opacity:.05+Math.random()*.03,depthWrite:false,side:THREE.DoubleSide}));
      mm.position.set(mx,mh+.5+Math.random(),mz);mm.rotation.x=-Math.PI/2;mm.rotation.z=Math.random()*Math.PI;
      scene.add(mm);mistMeshes.push(mm);
    }

    // Birds in distance (V-formation dots)
    const birdN=12,birdG=new THREE.BufferGeometry(),birdP=new Float32Array(birdN*3);
    for(let i=0;i<birdN;i++){
      const bx=-40+i*4+Math.random()*2;const by=35+Math.abs(i-6)*.8+Math.random();const bz=-80-Math.random()*20;
      birdP[i*3]=bx;birdP[i*3+1]=by;birdP[i*3+2]=bz;
    }
    birdG.setAttribute("position",new THREE.BufferAttribute(birdP,3));
    scene.add(new THREE.Points(birdG,new THREE.PointsMaterial({color:"#2A2018",size:.15,transparent:true,opacity:.3})));

    // ── ENTRANCE HALL click target ──
    const entranceId="__entrance__";
    // Use entranceCoreMeshes (snapshotted before peristyle/garden/wings) so only core domus glows on hover
    const centralMeshes=entranceCoreMeshes;
    sectionGroups.push({group:centralGroup,id:entranceId,targetY:0,currentY:0,meshes:centralMeshes,accent:"#E0C060"});
    // Entrance click target
    const ect=new THREE.Mesh(new THREE.CylinderGeometry(entrClickRadius,entrClickRadius,entrClickHeight,8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    ect.position.set(0,HILL_Y+entrClickHeight/2+2,0);ect.userData={roomId:entranceId,wingMeshes:centralMeshes,accent:"#E0C060"};
    scene.add(ect);clickTargets.push(ect);

    // ── HOVER POINT LIGHTS (one per wing + entrance) ──
    const hoverLights: {light:THREE.PointLight,targetIntensity:number,wingId:string}[]=[];
    clickTargets.forEach((ct: any)=>{
      const pos=new THREE.Vector3();ct.getWorldPosition(pos);
      const hl=new THREE.PointLight(ct.userData.accent,0,45);
      hl.position.set(pos.x,12,pos.z);
      scene.add(hl);
      hoverLights.push({light:hl,targetIntensity:0,wingId:ct.userData.roomId});
    });

    // ── PER-WING WINDOW MATERIALS ──
    // Clone window materials for each wing so hover glow is independent
    const wingWindowMats: Map<string,{mesh:THREE.Mesh,cloned:THREE.MeshStandardMaterial,baseIntensity:number}[]>=new Map();
    clickTargets.forEach((ct: any)=>{
      const entries: {mesh:THREE.Mesh,cloned:THREE.MeshStandardMaterial,baseIntensity:number}[]=[];
      ct.userData.wingMeshes.forEach((wm: THREE.Mesh)=>{
        const mat=wm.material as THREE.MeshStandardMaterial;
        if(mat===M.win||mat===M.winBlue){
          const cl=mat.clone();wm.material=cl;
          entries.push({mesh:wm,cloned:cl,baseIntensity:cl.emissiveIntensity});
        }
      });
      wingWindowMats.set(ct.userData.roomId,entries);
    });
    // For the entrance, also clone window materials on central meshes
    const centralWinEntries: {mesh:THREE.Mesh,cloned:THREE.MeshStandardMaterial,baseIntensity:number}[]=[];
    centralMeshes.forEach((wm: THREE.Mesh)=>{
      const mat=wm.material as THREE.MeshStandardMaterial;
      if(mat===M.win||mat===M.winBlue){
        const cl=mat.clone();wm.material=cl;
        centralWinEntries.push({mesh:wm,cloned:cl,baseIntensity:cl.emissiveIntensity});
      }
    });
    wingWindowMats.set(entranceId,centralWinEntries);

    // ── CLONE ALL BODY MATERIALS per section so emissive glow is fully isolated ──
    // Without this, shared materials like ochreWall cause glow to bleed across all buildings
    sectionGroups.forEach(sg=>{
      sg.meshes.forEach((wm: any)=>{
        if(!wm.material||wm.material.transparent)return;
        const mat=wm.material as THREE.MeshStandardMaterial;
        if(!mat.emissive)return;
        // Skip already-cloned window materials
        if(mat===M.win||mat===M.winBlue)return;
        wm.material=mat.clone();
      });
    });

    scene.add(palace);
    scene.add(new THREE.PointLight("#FFD080",0.15,15).translateX(-5).translateY(HILL_Y+5).translateZ(0));
    scene.add(new THREE.PointLight("#FFD080",0.15,15).translateX(5).translateY(HILL_Y+5).translateZ(0));

    // ── WALKTHROUGH HIGHLIGHT — golden glow on target wing/entrance meshes ──
    const hlLights: Map<string,THREE.PointLight>=new Map();
    clickTargets.forEach((ct: any)=>{
      const pos=new THREE.Vector3();ct.getWorldPosition(pos);
      const light=new THREE.PointLight("#D4AF37",0,50);light.position.set(pos.x,12,pos.z);scene.add(light);
      hlLights.set(ct.userData.roomId,light);
    });

    let prevHovered: string|null=null;
    const clock=new THREE.Clock();
    const goldColor=new THREE.Color("#D4AF37");
    // Pre-allocated objects reused every frame to avoid GC pressure
    const _hoverOrange=new THREE.Color("#D4802A");
    const _blackColor=new THREE.Color(0,0,0);
    const _warmGlow=new THREE.Color("#FFE8B0");
    const _windowBaseColor=new THREE.Color("#FFF0C0");
    const _tmpColor=new THREE.Color();
    const _tmpVec3=new THREE.Vector3();
    const _projVec3=new THREE.Vector3();
    const _accentColor=new THREE.Color();
    // Cache for per-wing window mesh Sets (avoids new Set() per frame)
    const _wingWindowSetCache=new Map<string,Set<any>>();
    const _sectionGroupMap=new Map<string,any>();
    sectionGroups.forEach((sg: any)=>_sectionGroupMap.set(sg.id,sg));
    const _isMobile=window.innerWidth<768||window.innerHeight<500;
    let _frameCount=0;
    let _lastHovId:string|null=null;
    const animate=()=>{
      frameRef.current=requestAnimationFrame(animate);const t=clock.getElapsedTime();_frameCount++;

      // Walkthrough highlight — pulse golden emissive on target meshes
      const hlTarget=highlightDoorRef.current;
      if(hlTarget){
        clickTargets.forEach((ct: any)=>{
          const active=hlTarget===ct.userData.roomId;
          if(active){
            const pulse=0.15+Math.sin(t*2.5)*.1;
            ct.userData.wingMeshes.forEach((wm: any)=>{
              if(wm.material.emissive){wm.material.emissive.lerp(goldColor,.15);wm.material.emissiveIntensity+=(pulse-wm.material.emissiveIntensity)*.1;}
            });
            const hl=hlLights.get(ct.userData.roomId);
            if(hl)hl.intensity=3+Math.sin(t*2)*1.5;
          }
        });
      }
      // Auto-walk: zoom toward entrance (fast exponential approach)
      if(autoWalkToRef.current==="__entrance__"){
        camOT.current.theta=Math.PI*1.5;
        camOT.current.phi=Math.PI*0.22;
        camD.current+=(35-camD.current)*0.04;
        if(Math.abs(camD.current-35)<2){
          autoWalkToRef.current=null;
          onRoomClickRef.current("__entrance__");
        }
      }
      const camLerp=autoWalkToRef.current?0.02:0.04;
      camO.current.theta+=(camOT.current.theta-camO.current.theta)*camLerp;
      camO.current.phi+=(camOT.current.phi-camO.current.phi)*camLerp;
      const r=camD.current;
      camera.position.set(r*Math.sin(camO.current.phi)*Math.cos(camO.current.theta),r*Math.cos(camO.current.phi)+5,r*Math.sin(camO.current.phi)*Math.sin(camO.current.theta));
      camera.lookAt(0,HILL_Y+8,0);

      // Subtle water opacity animation
      if (pool) (pool.material as THREE.MeshStandardMaterial).opacity=.5+Math.sin(t*.8)*.03;
      if (fW1) (fW1.material as THREE.MeshStandardMaterial).opacity=.4+Math.sin(t*.9)*.03;
      if (fW2) (fW2.material as THREE.MeshStandardMaterial).opacity=.4+Math.sin(t*1.0)*.03;
      if (fW3) (fW3.material as THREE.MeshStandardMaterial).opacity=.4+Math.sin(t*1.1)*.02;

      // ── HOVER GLOW — handled entirely in the per-wing block below ──
      // (removed shared-material sectionGroups loop that caused bleed across sections)

      // ── HOVER LABEL — project hovered section's world position to screen ──
      if(hovLabel&&camera){
        const hovId=hoveredRoomRef.current;
        if(hovId){
          const sg=_sectionGroupMap.get(hovId);
          if(sg){
            sg.group.getWorldPosition(_tmpVec3);
            _tmpVec3.y+=sg.id==="__entrance__"?25:18;
            _projVec3.copy(_tmpVec3).project(camera);
            const sx=(_projVec3.x*.5+.5)*w;
            const sy=(-(_projVec3.y)*.5+.5)*h;
            hovLabel.style.display="flex";
            hovLabel.style.alignItems="center";
            hovLabel.style.gap="0.375rem";
            hovLabel.style.left=sx+"px";
            // Clamp top so label stays below PalaceSubNav (NavBar 4.25rem + SubNav 3.5rem + 0.25rem margin = 8rem)
            const minTop=cachedRem*8;
            const clamped=sy<minTop;
            hovLabel.style.top=Math.max(sy,minTop)+"px";
            // When clamped, flip label to render downward so it doesn't hide behind the nav
            hovLabel.style.transform=clamped?"translate(-50%, 0)":"translate(-50%, -100%)";
            // Find wing name — use SVG icon from WingRoomIcons (skip if unchanged)
            if(hovId!==_lastHovId){
              _lastHovId=hovId;
              const wingDef=WINGS.find((wi: any)=>wi.id===hovId);
              if(wingDef){
                const svgStr=WING_SVG_STRINGS[wingDef.id]||"";
                hovLabel.innerHTML=svgStr+`<span>${wingDef.name}</span>`;
              }else if(hovId==="__entrance__"){
                hovLabel.innerHTML=entranceHallLabelRef.current;
              }else{
                hovLabel.innerHTML="";
              }
            }
          }
        }else{
          hovLabel.style.display="none";
          _lastHovId=null;
        }
      }

      // Wing & entrance hover glow — emissive body + accent point light + window brightening
      // Materials are cloned per section, so emissive changes are fully isolated
      const _hovRoom=hoveredRoomRef.current;
      clickTargets.forEach((ct: any)=>{
        const isHov=_hovRoom===ct.userData.roomId;
        const isWtHl=hlTarget===ct.userData.roomId;
        _accentColor.set(ct.userData.accent);
        const winSet=wingWindowMats.get(ct.userData.roomId);
        let winMeshSet=_wingWindowSetCache.get(ct.userData.roomId);
        if(!winMeshSet){winMeshSet=new Set(winSet?.map(e=>e.mesh));_wingWindowSetCache.set(ct.userData.roomId,winMeshSet);}
        ct.userData.wingMeshes.forEach((wm: any)=>{
          if(winMeshSet?.has(wm))return;// handled separately below
          if(!wm.material||!wm.material.emissive)return;
          if(isWtHl){
            wm.material.emissive.lerp(goldColor,.12);
            wm.material.emissiveIntensity+=(0.35+Math.sin(t*2.5)*.15-wm.material.emissiveIntensity)*.1;
          }else if(isHov){
            wm.material.emissive.lerp(_hoverOrange,.18);
            wm.material.emissiveIntensity+=(0.45-wm.material.emissiveIntensity)*.1;
          }else{
            wm.material.emissive.lerp(_blackColor,.1);
            wm.material.emissiveIntensity+=(0-wm.material.emissiveIntensity)*.06;
          }
        });
        // Window glow — cloned materials, independent per wing
        if(winSet){
          winSet.forEach(({cloned,baseIntensity})=>{
            const targetI=isHov?baseIntensity+0.85:baseIntensity;
            cloned.emissiveIntensity+=(targetI-cloned.emissiveIntensity)*.08;
            if(isHov){
              cloned.emissive.lerp(_warmGlow,.12);
              cloned.opacity+=(0.88-cloned.opacity)*.08;
            }else{
              cloned.emissive.lerp(_windowBaseColor,.04);
              cloned.opacity+=(0.6-cloned.opacity)*.06;
            }
          });
        }
      });

      // Animate hover point lights (smooth fade in/out)
      hoverLights.forEach(hl=>{
        const target=hoveredRoomRef.current===hl.wingId?1.8:0;
        hl.light.intensity+=(target-hl.light.intensity)*.06;
        // Subtle pulse when active
        if(hoveredRoomRef.current===hl.wingId){
          hl.light.intensity+=Math.sin(t*2.5)*.15;
        }
      });

      // Animate particles — throttle to every 2nd frame on mobile for performance
      const _doParticles=!_isMobile||(_frameCount&1)===0;
      if(_doParticles){
        // Animate dust motes
        const dp=dG.attributes.position.array;
        for(let i=0;i<dustN;i++){dp[i*3]+=Math.sin(t*.08+i*.3)*.012;dp[i*3+1]+=Math.sin(t*.12+i*.5)*.006;if(dp[i*3+1]>27)dp[i*3+1]=2;}
        dG.attributes.position.needsUpdate=true;

        // Animate floating orbs (gentle rise and drift)
        const op=orbG.attributes.position.array;
        for(let i=0;i<orbN;i++){
          op[i*3]+=Math.sin(t*.05+i*1.7)*.015;
          op[i*3+1]+=Math.sin(t*.08+i*2.3)*.008;
          op[i*3+2]+=Math.cos(t*.06+i*1.1)*.012;
        }
        orbG.attributes.position.needsUpdate=true;

        // Animate mist drift
        mistMeshes.forEach((mm,i)=>{
          mm.position.x+=Math.sin(t*.02+i)*.01;
          (mm.material as THREE.MeshBasicMaterial).opacity=.03+Math.sin(t*.1+i*2)*.015;
        });

        // Animate birds
        const bp=birdG.attributes.position.array;
        for(let i=0;i<birdN;i++){bp[i*3]+=.02;bp[i*3+1]+=Math.sin(t*3+i)*.01;if(bp[i*3]>60)bp[i*3]=-60;}
        birdG.attributes.position.needsUpdate=true;
      }

      // Update grass and wheat wind animation
      grassSystem.update();
      wheatFields.forEach(wf => wf.update());

      // Skip GPU render when host is paused (data-paused="1" on portal host).
      // Saves CPU/GPU while user is in Atrium/Library, but still renders ONE
      // warm-up frame on mount so the scene is ready to show on first unhide.
      const hostEl = el.parentElement;
      if (_firstFrameDone && hostEl && hostEl.dataset && hostEl.dataset.paused === "1") return;
      composer.render();
      if (!_firstFrameDone) { _firstFrameDone = true; try { onReady?.(); } catch {} console.log("[palace] first frame at", Math.round(performance.now() - _mountStart), "ms"); }
    };
    let _firstFrameDone = false;
    const _mountStart = performance.now();
    console.log("[palace] ExteriorScene mount start");
    animate();

    const onDown=(e: MouseEvent)=>{drag.current=false;prev.current={x:e.clientX,y:e.clientY};};
    const onMove=(e: MouseEvent)=>{const dx=e.clientX-prev.current.x,dy=e.clientY-prev.current.y;if(Math.abs(dx)>3||Math.abs(dy)>3)drag.current=true;
      if(e.buttons===1){camOT.current.theta-=dx*.004;camOT.current.phi=Math.max(.08,Math.min(Math.PI*.44,camOT.current.phi+dy*.004));prev.current={x:e.clientX,y:e.clientY};}
      const rect=el.getBoundingClientRect();mse.current.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
      ray.current.setFromCamera(mse.current,camera);const hits=ray.current.intersectObjects(clickTargets);onRoomHover(hits.length>0?hits[0].object.userData.roomId:null);};
    const onCk=(e: MouseEvent)=>{if(drag.current)return;const rect=el.getBoundingClientRect();mse.current.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
      ray.current.setFromCamera(mse.current,camera);const hits=ray.current.intersectObjects(clickTargets);if(hits.length>0)onRoomClickRef.current(hits[0].object.userData.roomId);};
    const onWh=(e: WheelEvent)=>{camD.current=Math.max(40,Math.min(180,camD.current+e.deltaY*.05));};
    const onRs=()=>{w=el.clientWidth;h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();ren.setSize(w,h);composer.setSize(w,h);cachedRem=parseFloat(getComputedStyle(document.documentElement).fontSize);};
    el.addEventListener("mousedown",onDown);el.addEventListener("mousemove",onMove);el.addEventListener("click",onCk);el.addEventListener("wheel",onWh,{passive:true});window.addEventListener("resize",onRs);const refitFraming=()=>{const aspect=el.clientWidth/Math.max(1,el.clientHeight);camD.current=aspect<1?115:140;};const onOrient=()=>{onRs();refitFraming();setTimeout(()=>{onRs();refitFraming();},80);setTimeout(()=>{onRs();refitFraming();},300);};window.addEventListener("orientationchange",onOrient);

    // ── TOUCH SUPPORT ──
    let touchStartDist=0,touchStartCamD=camD.current,touchTap=true;
    const onTS=(e: TouchEvent)=>{
      if(e.touches.length===1){const t=e.touches[0];drag.current=false;prev.current={x:t.clientX,y:t.clientY};touchTap=true;}
      if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;touchStartDist=Math.hypot(dx,dy);touchStartCamD=camD.current;touchTap=false;}
    };
    const onTM=(e: TouchEvent)=>{
      e.preventDefault();
      if(e.touches.length===1){const t=e.touches[0];const dx=t.clientX-prev.current.x,dy=t.clientY-prev.current.y;
        if(Math.abs(dx)>10||Math.abs(dy)>10){drag.current=true;touchTap=false;}
        camOT.current.theta-=dx*.004;camOT.current.phi=Math.max(.08,Math.min(Math.PI*.44,camOT.current.phi+dy*.004));prev.current={x:t.clientX,y:t.clientY};
      }
      if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
        const dist=Math.hypot(dx,dy);if(touchStartDist>0){camD.current=Math.max(40,Math.min(180,touchStartCamD*(touchStartDist/dist)));}
      }
    };
    // Single-tap model: tap shows glow + calls onRoomClick (parent decides
    // whether to navigate or only set a pending selection on mobile).
    const onTE=(e: TouchEvent)=>{
      if(touchTap&&e.changedTouches.length===1){const tc=e.changedTouches[0];const rect=el.getBoundingClientRect();
        mse.current.set(((tc.clientX-rect.left)/rect.width)*2-1,-((tc.clientY-rect.top)/rect.height)*2+1);
        ray.current.setFromCamera(mse.current,camera);const hits=ray.current.intersectObjects(clickTargets);
        if(hits.length>0){
          const hitId=hits[0].object.userData.roomId;
          onRoomHover(hitId);
          onRoomClickRef.current(hitId);
        }else{
          onRoomHover(null);
        }
      }
    };
    el.addEventListener("touchstart",onTS,{passive:true});el.addEventListener("touchmove",onTM,{passive:false});el.addEventListener("touchend",onTE,{passive:true});

    return()=>{if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);el.removeEventListener("mousedown",onDown);el.removeEventListener("mousemove",onMove);el.removeEventListener("click",onCk);el.removeEventListener("wheel",onWh);window.removeEventListener("resize",onRs);window.removeEventListener("orientationchange",onOrient);
      el.removeEventListener("touchstart",onTS);el.removeEventListener("touchmove",onTM);el.removeEventListener("touchend",onTE);
      if(el.contains(hovLabel))el.removeChild(hovLabel);
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((m: any) => {
            if (m.map && !isCachedTexture(m.map)) m.map.dispose();
            if (m.normalMap && !isCachedTexture(m.normalMap)) m.normalMap.dispose();
            if (m.roughnessMap && !isCachedTexture(m.roughnessMap)) m.roughnessMap.dispose();
            if (m.emissiveMap && !isCachedTexture(m.emissiveMap)) m.emissiveMap.dispose();
            m.dispose();
          });
        }
      });
      allTexSets.forEach(disposePBRSet);
      extraDisposables.forEach(m => m.dispose());
      extraGeoDisposables.forEach(g => g.dispose());
      grassSystem.dispose();
      wheatFields.forEach(wf => wf.dispose());
      cropDispMap.dispose();
      envMapProc.dispose();
      composer.dispose();
      try{ren.forceContextLoss();}catch{}
      if(el.contains(ren.domElement))el.removeChild(ren.domElement);ren.dispose();};
  },[]);
  return <div ref={mountRef} role="application" aria-label={t("sceneLabel")} style={{width:"100%",height:"100%",cursor:hoveredRoom?"pointer":"grab"}}/>;
}
