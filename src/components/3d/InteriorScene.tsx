"use client";
import { useRef, useEffect, useMemo, useState, memo } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing } from "@/lib/constants/wings";
import { paintTex } from "@/lib/3d/textureHelpers";
import { mk } from "@/lib/3d/meshHelpers";
import { layoutForRoom } from "@/lib/3d/roomLayouts";
import { createPostProcessing } from "@/lib/3d/postprocessing";
import { createInteriorEnvMap } from "@/lib/3d/environmentMaps";
import { getLightingPreset } from "@/lib/3d/daylightCycle";
import { createDustParticles } from "@/lib/3d/atmosphericEffects";
import { loadHDRI, loadHDRIProgressive, HDRI_INTERIOR, loadMarbleTextures, loadPlasterWallTextures, loadHerringboneTextures, loadFabricTextures, loadVelvetTextures, disposePBRSet, isCachedTexture, buildCachedTextureSet, type PBRTextureSet } from "@/lib/3d/assetLoader";
import { getQuality, mkPhys, isMobileGPU } from "@/lib/3d/mobilePerf";
import { borrowRenderer, returnRenderer } from "@/lib/3d/rendererPool";
import { optimizeMaterials } from "@/lib/3d/geometryOptimizer";
import { useRoomStore } from "@/lib/stores/roomStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useRoomMediaBarStore } from "@/lib/stores/roomMediaBarStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { T } from "@/lib/theme";
import { hapticMedium } from "@/lib/native/haptics";

// ═══ ROOM INTERIOR — cosy personal den with media stations ═══
// Every room has ALL memory furniture: bookshelf, low table, desk, painting
// wall, screen, vinyl player, vitrine, orbs. Layout varies size & décor.
function InteriorScene({roomId,actualRoomId,layoutOverride,memories,onMemoryClick,onMemoryUpdate,wingData:wingDataProp,styleEra="roman",onboardingMode,onOnboardingLookDone,onCinematicStep,isMobile:isMobileProp,initialCameraZ}: {roomId: any,actualRoomId?: string,layoutOverride?: string,memories: any,onMemoryClick: any,onMemoryUpdate?: (id: string, updates: any)=>void,wingData?: Wing,styleEra?: string,onboardingMode?: boolean,onOnboardingLookDone?: ()=>void,onCinematicStep?: (step: number)=>void,isMobile?: boolean,initialCameraZ?: number}){
  const { t } = useTranslation("interior3d");
  const { getWingRooms } = useRoomStore();
  const userName = useUserStore((s) => s.userName);
  const roomMediaBarOpen = useRoomMediaBarStore(s => s.open);
  const setRoomMediaBarOpen = useRoomMediaBarStore(s => s.setOpen);
  const currentRoomName = getWingRooms(roomId).find(r => r.id === (actualRoomId || roomId))?.name || "";
  const mountRef=useRef<HTMLDivElement|null>(null),frameRef=useRef<number|null>(null);
  const camDebugRef = useRef<HTMLPreElement | null>(null);
  const camDebug = false; // set true to show camera debug overlay
  const lookA=useRef({yaw:0,pitch:0}),lookT=useRef({yaw:0,pitch:0});
  const pos=useRef(new THREE.Vector3()),posT=useRef(new THREE.Vector3());
  const _rc=useRef(new THREE.Raycaster()),_mouse=useRef(new THREE.Vector2());
  const _dir=useRef(new THREE.Vector3()),_yAxis=useRef(new THREE.Vector3(0,1,0));
  const _ld=useRef(new THREE.Vector3()),_lookTarget=useRef(new THREE.Vector3());
  const _vinylPos=useRef(new THREE.Vector3()),_screenPos=useRef(new THREE.Vector3());
  const keys=useRef<Record<string,boolean>>({}),drag=useRef(false),prev=useRef({x:0,y:0}),hovMem=useRef<any>(null),memMeshes=useRef<THREE.Mesh[]>([]),hitAreaMeshes=useRef<THREE.Mesh[]>([]),allClickableRef=useRef<THREE.Object3D[]>([]);
  const videoElRef=useRef<HTMLVideoElement|null>(null),audioElRef=useRef<HTMLAudioElement|null>(null);
  const volOverride=useRef<{video:number|null,audio:number|null}>({video:null,audio:null});
  const vidAnimEntry=useRef<any>(null); // ref to the animTex video entry for track switching
  const scrMeshRef=useRef<THREE.Mesh|null>(null); // cinema screen mesh — userData updated on track switch
  const vpHitRef=useRef<THREE.Mesh|null>(null); // vinyl player hit area — userData updated on track switch
  const [showMedia,setShowMedia]=useState({video:false,audio:false});
  const [vidState,setVidState]=useState({playing:false,loop:true,time:0,duration:0,volume:0});
  const [audState,setAudState]=useState({playing:false,loop:true,time:0,duration:0,volume:0});
  const [vidIdx,setVidIdx]=useState(0);
  const [audIdx,setAudIdx]=useState(0);
  const [mutedPlaying,setMutedPlaying]=useState(false);
  const allVideoMems=useRef<any[]>([]);
  const allAudioMems=useRef<any[]>([]);
  const onboardingModeRef=useRef(onboardingMode);
  useEffect(()=>{onboardingModeRef.current=onboardingMode;},[onboardingMode]);
  const onOnboardingLookDoneRef=useRef(onOnboardingLookDone);
  useEffect(()=>{onOnboardingLookDoneRef.current=onOnboardingLookDone;},[onOnboardingLookDone]);
  const onCinematicStepRef=useRef(onCinematicStep);
  useEffect(()=>{onCinematicStepRef.current=onCinematicStep;},[onCinematicStep]);
  const onMemoryClickRef=useRef(onMemoryClick);
  useEffect(()=>{onMemoryClickRef.current=onMemoryClick;},[onMemoryClick]);
  const wing=wingDataProp||DEFAULT_WINGS.find(r=>r.id===roomId),mems=memories||[];

  // ── FINGERPRINT: split structural vs display to avoid unnecessary full rebuilds ──
  // Structural fingerprint: memory identity & content — requires full scene rebuild
  const structuralFingerprint=useMemo(()=>mems.map((m:any)=>`${m.id}:${m.type}:${m.dataUrl?.slice(0,30)||""}`).join("|"),[mems]);
  // Display fingerprint: which memories are displayed & where — changes when user
  // toggles displayed/displayUnit in the media panel. Debounced with a longer
  // window (800ms) to prevent rapid teardown/rebuild cycles that exhaust WebGL
  // contexts and cause a pitch-dark scene. The debounce also coalesces multiple
  // rapid toggles (common when the user assigns furniture in RoomMediaPanel).
  const rawDisplayFP=useMemo(()=>mems.map((m:any)=>`${m.displayed}:${m.displayUnit||""}`).join("|"),[mems]);
  const [debouncedDisplayFP,setDebouncedDisplayFP]=useState(rawDisplayFP);
  const displayDebounceRef=useRef<ReturnType<typeof setTimeout>|null>(null);
  const isFirstDisplayRender=useRef(true);
  useEffect(()=>{
    // On first render apply immediately so the scene builds without delay
    if(isFirstDisplayRender.current) { isFirstDisplayRender.current=false; setDebouncedDisplayFP(rawDisplayFP); return; }
    if(displayDebounceRef.current) clearTimeout(displayDebounceRef.current);
    displayDebounceRef.current=setTimeout(()=>setDebouncedDisplayFP(rawDisplayFP),800);
    return()=>{if(displayDebounceRef.current)clearTimeout(displayDebounceRef.current);};
  },[rawDisplayFP]); // eslint-disable-line react-hooks/exhaustive-deps
  // Combined fingerprint used as dependency — debounced display prevents rapid rebuilds
  const displayFingerprint=`${structuralFingerprint}||${debouncedDisplayFP}`;

  useEffect(()=>{
    const el=mountRef.current;if(!el)return;
    hapticMedium();
    // Cancellation guard — prevents async work (HDRI loading, etc.) from
    // writing into a scene that has already been torn down.
    let alive=true;
    // Remove any stale canvases left from a prior render cycle to prevent
    // multiple WebGL contexts from stacking up (which eventually causes
    // context loss and a pitch-dark scene).
    while(el.firstChild)el.removeChild(el.firstChild);
    let w=el.clientWidth,h=el.clientHeight;
    const layout=layoutForRoom(actualRoomId||roomId,layoutOverride);
    const dlPresetRaw=getLightingPreset();
    // Interior rooms have artificial lighting — enforce minimum brightness
    // so evening/night presets don't make rooms too dark to navigate.
    const dlPreset={...dlPresetRaw,
      ambientIntensity:Math.max(dlPresetRaw.ambientIntensity,0.4),
      sunIntensity:Math.max(dlPresetRaw.sunIntensity,0.6),
      fillIntensity:Math.max(dlPresetRaw.fillIntensity,0.25),
      envBrightness:Math.max(dlPresetRaw.envBrightness,0.35),
      exposure:Math.max(dlPresetRaw.exposure,0.9),
    };
    const scene=new THREE.Scene();scene.background=new THREE.Color(layout.isExhibition?"#87CEEB":dlPreset.fogColor);
    const camera=new THREE.PerspectiveCamera(58,w/h,0.1,layout.isExhibition?120:60);
    const Q=getQuality();
    const ren=borrowRenderer(w,h);
    ren.shadowMap.enabled=Q.shadowsEnabled;if(Q.shadowsEnabled){ren.shadowMap.type=Q.shadowMapSize>=1024?THREE.PCFShadowMap:THREE.BasicShadowMap;ren.shadowMap.autoUpdate=false;ren.shadowMap.needsUpdate=true;}ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.7*dlPreset.exposure;
    ren.outputColorSpace=THREE.SRGBColorSpace;
    el.appendChild(ren.domElement);

    // ── ENVIRONMENT MAP (IBL) — procedural immediate, real HDRI async ──
    const envMapProc=createInteriorEnvMap(ren,{warmth:dlPreset.envWarmth,brightness:dlPreset.envBrightness});
    scene.environment=envMapProc;
    scene.environmentIntensity=0.8;
    let envMapHDRI: THREE.Texture|null=null;
    if(Q.loadEnvHDRI){loadHDRIProgressive(ren,HDRI_INTERIOR,{onProcedural:(p)=>{if(!alive)return;scene.environment=p;scene.environmentIntensity=0.7;},onFull:(hdr)=>{if(!alive){hdr.dispose();return;}envMapHDRI=hdr;scene.environment=hdr;scene.environmentIntensity=0.8;}}).catch(()=>{});}

    // ── POST-PROCESSING — quality tier handles mobile stripping automatically ──
    const composer=createPostProcessing(ren,scene,camera,"interior",{ssao:false});

    // ── ATMOSPHERIC FOG ──
    const isExhibition=!!layout.isExhibition;
    const fogFar=isExhibition?65/dlPreset.fogDensity:22/dlPreset.fogDensity;
    scene.fog=new THREE.Fog(isExhibition?"#B8D8E8":dlPreset.fogColor,isExhibition?8:3,fogFar);

    scene.add(new THREE.HemisphereLight(isExhibition?"#87CEEB":dlPreset.ambientColor,isExhibition?"#D4C8A8":"#C4B8A0",isExhibition?.7:.4*dlPreset.ambientIntensity/0.5));
    const sun=new THREE.DirectionalLight(dlPreset.sunColor,1.1*dlPreset.sunIntensity);sun.position.set(isExhibition?18:10,isExhibition?20:14,-4);sun.castShadow=true;sun.shadow.mapSize.set(Math.min(Q.shadowMapSize,isExhibition?2048:1024),Math.min(Q.shadowMapSize,isExhibition?2048:1024));
    const shCam=isExhibition?20:12;
    sun.shadow.camera.near=0.5;sun.shadow.camera.far=isExhibition?60:30;sun.shadow.camera.left=-shCam;sun.shadow.camera.right=shCam;sun.shadow.camera.top=shCam;sun.shadow.camera.bottom=-shCam;
    scene.add(sun);
    const ambL=new THREE.PointLight(dlPreset.fillColor,.3*dlPreset.fillIntensity/0.35,isExhibition?30:15);ambL.position.set(0,isExhibition?6:4,0);scene.add(ambL);

    // ── REAL PBR TEXTURES (Poly Haven) ──
    const marbleTex=loadMarbleTextures([3,3]);
    const woodTex=loadHerringboneTextures([4,4]);
    const wallTex=loadPlasterWallTextures([3,3]);
    const rugTex=loadFabricTextures([2,2]);
    const velvetTex=loadVelvetTextures([2,2]);
    const allTexSets: PBRTextureSet[]=[marbleTex,woodTex,wallTex,rugTex,velvetTex];

    const MS={
      wall:new THREE.MeshStandardMaterial({color:wing?.wall||"#DDD4C6",roughness:.88,map:wallTex.map,normalMap:wallTex.normalMap,normalScale:new THREE.Vector2(.3,.3),roughnessMap:wallTex.roughnessMap,aoMap:wallTex.aoMap,aoMapIntensity:.6}),
      floor:new THREE.MeshStandardMaterial({color:"#8A7358",roughness:.45,metalness:.1,map:woodTex.map,normalMap:woodTex.normalMap,normalScale:new THREE.Vector2(.5,.5),roughnessMap:woodTex.roughnessMap,aoMap:woodTex.aoMap,aoMapIntensity:.7}),
      floorL:new THREE.MeshStandardMaterial({color:"#B8A480",roughness:.5,map:woodTex.map,normalMap:woodTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      ceil:new THREE.MeshStandardMaterial({color:"#F0EAE0",roughness:.95}),
      trim:new THREE.MeshStandardMaterial({color:"#CFC3AE",roughness:.55,metalness:.12}),
      gold:new THREE.MeshStandardMaterial({color:"#C8A868",roughness:.28,metalness:.6}),
      dkW:new THREE.MeshStandardMaterial({color:"#3E2A18",roughness:.5,metalness:.08,map:woodTex.map,normalMap:woodTex.normalMap,normalScale:new THREE.Vector2(.4,.4),aoMap:woodTex.aoMap,aoMapIntensity:.5}),
      ltW:new THREE.MeshStandardMaterial({color:"#A08060",roughness:.55,map:woodTex.map,normalMap:woodTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      wain:new THREE.MeshStandardMaterial({color:"#B8A890",roughness:.65,normalMap:wallTex.normalMap,normalScale:new THREE.Vector2(.2,.2),roughnessMap:wallTex.roughnessMap}),
      leather:new THREE.MeshStandardMaterial({color:"#5A3020",roughness:.55,metalness:.05,normalMap:velvetTex.normalMap,normalScale:new THREE.Vector2(.15,.15)}),
      leatherD:new THREE.MeshStandardMaterial({color:"#4A2818",roughness:.5,metalness:.04,normalMap:velvetTex.normalMap,normalScale:new THREE.Vector2(.12,.12)}),
      button:new THREE.MeshStandardMaterial({color:"#3A1E10",roughness:.3,metalness:.1}),
      bronze:new THREE.MeshStandardMaterial({color:"#8A7050",roughness:.32,metalness:.48}),
      marble:mkPhys(THREE,{color:"#E8E2DA",roughness:.15,metalness:.06,map:marbleTex.map,normalMap:marbleTex.normalMap,normalScale:new THREE.Vector2(.4,.4),roughnessMap:marbleTex.roughnessMap,aoMap:marbleTex.aoMap,aoMapIntensity:.8,clearcoat:.3,clearcoatRoughness:.2,reflectivity:.6}),
      brick:new THREE.MeshStandardMaterial({color:"#8A5040",roughness:.9}),
      brickD:new THREE.MeshStandardMaterial({color:"#6A3830",roughness:.85}),
      iron:new THREE.MeshStandardMaterial({color:"#3A3A3A",roughness:.5,metalness:.4}),
      fire:new THREE.MeshBasicMaterial({color:"#FF8030",transparent:true,opacity:.7}),
      fireG:new THREE.MeshBasicMaterial({color:"#FFD060",transparent:true,opacity:.5}),
      rug:new THREE.MeshStandardMaterial({color:"#6A2028",roughness:.9,map:rugTex.map,normalMap:rugTex.normalMap,normalScale:new THREE.Vector2(.3,.3),roughnessMap:rugTex.roughnessMap,aoMap:rugTex.aoMap,aoMapIntensity:.5}),
      rugB:new THREE.MeshStandardMaterial({color:"#C8A868",roughness:.8}),
      rugN:new THREE.MeshStandardMaterial({color:"#1A2438",roughness:.9}),
      sconce:new THREE.MeshStandardMaterial({color:"#C8A858",roughness:.28,metalness:.55}),
      glassG:new THREE.MeshStandardMaterial({color:"#FFF8E0",emissive:"#FFE8B0",emissiveIntensity:.5,transparent:true,opacity:.6}),
      screen:new THREE.MeshStandardMaterial({color:"#1A1A1A",roughness:.3,metalness:.1}),
      vinyl:new THREE.MeshStandardMaterial({color:"#1A1A1A",roughness:.15,metalness:.3}),
      vinylL:new THREE.MeshStandardMaterial({color:wing?.accent||"#C66B3D",roughness:.3}),
      pot:new THREE.MeshStandardMaterial({color:"#B8926A",roughness:.6}),
      plant:new THREE.MeshStandardMaterial({color:"#4A7838",roughness:.85}),
      curtain:mkPhys(THREE,{color:"#8A6848",roughness:.95,side:THREE.DoubleSide,sheen:0.3,sheenRoughness:0.8,sheenColor:new THREE.Color("#D4B896"),map:velvetTex.map,normalMap:velvetTex.normalMap,normalScale:new THREE.Vector2(.25,.25)}),
      fG:new THREE.MeshStandardMaterial({color:"#B89850",roughness:.28,metalness:.65}),
      fB:new THREE.MeshStandardMaterial({color:"#7A6040",roughness:.38,metalness:.5}),
      matF:new THREE.MeshStandardMaterial({color:"#F2EDE4",roughness:.95}),
      lamp:new THREE.MeshStandardMaterial({color:"#E8D8C0",roughness:.7,transparent:true,opacity:.8}),
      lampG:new THREE.MeshBasicMaterial({color:dlPreset.sunColor,transparent:true,opacity:.15*dlPreset.sunIntensity}),
      handle:mkPhys(THREE,{color:"#C8A858",roughness:.18,metalness:.85,clearcoat:.4,clearcoatRoughness:.1}),
      glass:mkPhys(THREE,{color:"#E8F0F0",transparent:true,opacity:.15,roughness:.02,metalness:.0,transmission:.85,ior:1.5,thickness:.5}),
    };
    const fMats=[MS.fG,MS.fB,MS.gold];
    memMeshes.current=[];hitAreaMeshes.current=[];
    const animTex: any[]=[];

    const rW=layout.rW,rL=layout.rL,rH=layout.rH;

    // ═══════════════════════════════════════════
    // SHELL: floor, ceiling, walls, wainscoting
    // ═══════════════════════════════════════════
    if(isExhibition){
      // ═══ ROMAN PERISTYLIUM: open-air courtyard with colonnaded porches ═══
      // Layout: rW=30, rL=25, rH=6
      // Portico depth 3.5 on each side. Courtyard interior ~23 x 18.
      const porticoD=3.5; // depth of covered walkway
      const colR=0.2; // column radius (Tuscan — smooth, simple)
      const colRBase=0.24;
      const colSpacingX=3.2; // spacing along X axis
      const colSpacingZ=3.4; // spacing along Z axis
      const entabH=0.7; // entablature height (architrave+frieze+cornice)

      // ── Materials specific to peristylium ──
      const terraMat=new THREE.MeshStandardMaterial({color:"#C4854A",roughness:.75,metalness:.04});
      const terraLightMat=new THREE.MeshStandardMaterial({color:"#D4A06A",roughness:.7,metalness:.03});
      const stoneMat=new THREE.MeshStandardMaterial({color:"#E0D8C8",roughness:.55,metalness:.06,map:marbleTex.map,normalMap:marbleTex.normalMap,normalScale:new THREE.Vector2(.2,.2)});
      const stoneWarmMat=new THREE.MeshStandardMaterial({color:"#E8DCC8",roughness:.6,metalness:.04});
      const waterMat=mkPhys(THREE,{color:"#4A7A8A",roughness:.05,metalness:.15,transparent:true,opacity:.7,clearcoat:1,clearcoatRoughness:.05});
      const mosaicDarkMat=new THREE.MeshStandardMaterial({color:"#8A6040",roughness:.6});
      const mosaicLightMat=new THREE.MeshStandardMaterial({color:"#E8D8B8",roughness:.55});
      const hedgeMat=new THREE.MeshStandardMaterial({color:"#3A6828",roughness:.9});
      const hedgeLightMat=new THREE.MeshStandardMaterial({color:"#4A8038",roughness:.85});
      const roofTileMat=new THREE.MeshStandardMaterial({color:"#B06838",roughness:.8,metalness:.02});

      // ── FLOOR: terracotta tile with mosaic border ──
      // Main courtyard floor
      const fl=new THREE.Mesh(new THREE.PlaneGeometry(rW,rL),terraMat);fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;scene.add(fl);
      // Portico floor — slightly lighter stone
      for(let s=-1;s<=1;s+=2){
        scene.add(mk(new THREE.BoxGeometry(rW,0.01,porticoD),stoneWarmMat,0,.005,s*(rL/2-porticoD/2)));
        scene.add(mk(new THREE.BoxGeometry(porticoD,0.01,rL-porticoD*2),stoneWarmMat,s*(rW/2-porticoD/2),.005,0));
      }
      // Mosaic border around courtyard opening
      const courtInX=rW/2-porticoD, courtInZ=rL/2-porticoD;
      for(let s=-1;s<=1;s+=2){
        scene.add(mk(new THREE.BoxGeometry(courtInX*2+0.4,0.008,0.25),mosaicDarkMat,0,.008,s*courtInZ));
        scene.add(mk(new THREE.BoxGeometry(0.25,0.008,courtInZ*2),mosaicDarkMat,s*courtInX,.008,0));
        scene.add(mk(new THREE.BoxGeometry(courtInX*2-0.2,0.009,0.12),mosaicLightMat,0,.009,s*(courtInZ-0.18)));
        scene.add(mk(new THREE.BoxGeometry(0.12,0.009,courtInZ*2-0.2),mosaicLightMat,s*(courtInX-0.18),.009,0));
      }
      // Decorative mosaic diamond pattern in courtyard center
      for(let dx=-3;dx<=3;dx++){
        for(let dz=-2;dz<=2;dz++){
          const tileMat=(dx+dz)%2===0?mosaicDarkMat:mosaicLightMat;
          const tile=mk(new THREE.BoxGeometry(0.5,0.006,0.5),tileMat,dx*1.2,.007,dz*1.2);
          tile.rotation.y=Math.PI/4;scene.add(tile);
        }
      }

      // ── BACK WALLS (behind colonnades) — where paintings hang ──
      // These are the outer perimeter walls at the very edge
      for(let s=-1;s<=1;s+=2){
        const wm=new THREE.Mesh(new THREE.PlaneGeometry(rL,rH),MS.wall);wm.rotation.y=s*(-Math.PI/2);wm.position.set(s*(rW/2),rH/2,0);wm.receiveShadow=true;scene.add(wm);
      }
      scene.add(mk(new THREE.PlaneGeometry(rW,rH),MS.wall,0,rH/2,-rL/2));
      const bw=new THREE.Mesh(new THREE.PlaneGeometry(rW,rH),MS.wall);bw.rotation.y=Math.PI;bw.position.set(0,rH/2,rL/2);bw.receiveShadow=true;scene.add(bw);
      // Warm plaster dado on back walls
      const dadoH=1.2;
      for(let s=-1;s<=1;s+=2){
        scene.add(mk(new THREE.BoxGeometry(.06,dadoH,rL-.2),terraMat,s*(rW/2-.03),dadoH/2,0));
        scene.add(mk(new THREE.BoxGeometry(.07,.06,rL-.1),MS.gold,s*(rW/2-.035),dadoH+.03,0));
      }
      scene.add(mk(new THREE.BoxGeometry(rW-.2,dadoH,.06),terraMat,0,dadoH/2,-rL/2+.03));
      scene.add(mk(new THREE.BoxGeometry(rW-.1,.06,.07),MS.gold,0,dadoH+.03,-rL/2+.035)); // gold trim on back dado
      // Front wall dado
      scene.add(mk(new THREE.BoxGeometry(rW-.2,dadoH,.06),terraMat,0,dadoH/2,rL/2-.03));
      scene.add(mk(new THREE.BoxGeometry(rW-.1,.06,.07),MS.gold,0,dadoH+.03,rL/2-.035)); // gold trim on front dado

      // ── PORTICO ROOF (covered walkways, NOT over the courtyard center) ──
      // Roof slabs on all 4 sides
      for(let s=-1;s<=1;s+=2){
        // Long sides (along X)
        const roofZ=s*(rL/2-porticoD/2);
        scene.add(mk(new THREE.BoxGeometry(rW,0.12,porticoD+0.3),MS.ceil,0,rH,roofZ));
        // Roof tiles on top
        scene.add(mk(new THREE.BoxGeometry(rW,0.06,porticoD+0.4),roofTileMat,0,rH+0.09,roofZ));
        // Short sides (along Z) — avoid overlap at corners
        const roofX=s*(rW/2-porticoD/2);
        scene.add(mk(new THREE.BoxGeometry(porticoD+0.3,0.12,rL-porticoD*2),MS.ceil,roofX,rH,0));
        scene.add(mk(new THREE.BoxGeometry(porticoD+0.4,0.06,rL-porticoD*2),roofTileMat,roofX,rH+0.09,0));
      }
      // Underside beams for portico roofs (wooden rafters)
      for(let s=-1;s<=1;s+=2){
        // Beams along long sides
        for(let bx=-rW/2+1.5;bx<rW/2;bx+=2.5){
          scene.add(mk(new THREE.BoxGeometry(0.12,0.15,porticoD),MS.ltW,bx,rH-0.08,s*(rL/2-porticoD/2)));
        }
        // Beams along short sides
        for(let bz=-rL/2+porticoD+1;bz<rL/2-porticoD;bz+=2.5){
          scene.add(mk(new THREE.BoxGeometry(porticoD,0.15,0.12),MS.ltW,s*(rW/2-porticoD/2),rH-0.08,bz));
        }
      }

      // ── OPEN SKY (no ceiling in center) — use a sky-colored plane far above ──
      const skyMat=new THREE.MeshBasicMaterial({color:"#87CEEB"});
      const sky=new THREE.Mesh(new THREE.PlaneGeometry(rW+20,rL+20),skyMat);
      sky.rotation.x=Math.PI/2;sky.position.y=rH+8;scene.add(sky);
      // Soft cloud wisps
      const cloudMat=new THREE.MeshBasicMaterial({color:"#FFFFFF",transparent:true,opacity:0.3});
      for(let ci=0;ci<5;ci++){
        const cx2=-8+ci*4+Math.sin(ci)*2, cz2=-4+ci*2.5;
        const cloud=new THREE.Mesh(new THREE.PlaneGeometry(3+ci*0.5,1.5),cloudMat);
        cloud.rotation.x=Math.PI/2;cloud.position.set(cx2,rH+7.5,cz2);scene.add(cloud);
      }

      // ── COLONNADE: Tuscan columns along all 4 sides ──
      // Columns stand at the inner edge of the portico, supporting the roof
      const colY=rH/2-entabH/2; // column shaft center Y
      const colShaftH=rH-entabH-0.4; // shaft height (minus base + capital)
      // Column positions stored for painting collision avoidance
      const colPositions: [number,number][]=[];

      // Long sides (along X, at z = +-courtInZ)
      for(let s=-1;s<=1;s+=2){
        const cz=s*courtInZ;
        for(let cx=-rW/2+porticoD;cx<=rW/2-porticoD;cx+=colSpacingX){
          colPositions.push([cx,cz]);
          // Plinth/base
          scene.add(mk(new THREE.BoxGeometry(0.6,0.2,0.6),stoneMat,cx,0.1,cz));
          scene.add(mk(new THREE.CylinderGeometry(colRBase+0.02,colRBase+0.05,0.12,12),stoneMat,cx,0.26,cz));
          // Shaft (smooth Tuscan — no fluting)
          scene.add(mk(new THREE.CylinderGeometry(colR,colRBase,colShaftH,12),stoneMat,cx,0.32+colShaftH/2,cz));
          // Neck ring
          scene.add(mk(new THREE.CylinderGeometry(colR+0.03,colR,0.06,12),stoneMat,cx,0.32+colShaftH+0.03,cz));
          // Echinus (curved capital element)
          scene.add(mk(new THREE.CylinderGeometry(colR+0.12,colR+0.03,0.12,12),stoneMat,cx,0.32+colShaftH+0.12,cz));
          // Abacus (square slab on top)
          scene.add(mk(new THREE.BoxGeometry(0.55,0.08,0.55),stoneMat,cx,0.32+colShaftH+0.22,cz));
        }
      }
      // Short sides (along Z, at x = +-courtInX) — skip corners (already placed)
      for(let s=-1;s<=1;s+=2){
        const cx2=s*courtInX;
        for(let cz=-courtInZ+colSpacingZ;cz<courtInZ;cz+=colSpacingZ){
          colPositions.push([cx2,cz]);
          scene.add(mk(new THREE.BoxGeometry(0.6,0.2,0.6),stoneMat,cx2,0.1,cz));
          scene.add(mk(new THREE.CylinderGeometry(colRBase+0.02,colRBase+0.05,0.12,12),stoneMat,cx2,0.26,cz));
          scene.add(mk(new THREE.CylinderGeometry(colR,colRBase,colShaftH,12),stoneMat,cx2,0.32+colShaftH/2,cz));
          scene.add(mk(new THREE.CylinderGeometry(colR+0.03,colR,0.06,12),stoneMat,cx2,0.32+colShaftH+0.03,cz));
          scene.add(mk(new THREE.CylinderGeometry(colR+0.12,colR+0.03,0.12,12),stoneMat,cx2,0.32+colShaftH+0.12,cz));
          scene.add(mk(new THREE.BoxGeometry(0.55,0.08,0.55),stoneMat,cx2,0.32+colShaftH+0.22,cz));
        }
      }

      // ── ENTABLATURE (architrave + frieze + cornice) running along colonnade ──
      // Continuous stone band above columns on all 4 sides
      for(let s=-1;s<=1;s+=2){
        // Long sides
        const ez=s*courtInZ;
        scene.add(mk(new THREE.BoxGeometry(rW-porticoD*2+colSpacingX,0.18,0.45),stoneMat,0,rH-entabH+0.09,ez)); // architrave
        scene.add(mk(new THREE.BoxGeometry(rW-porticoD*2+colSpacingX,0.22,0.35),stoneWarmMat,0,rH-entabH+0.29,ez)); // frieze
        scene.add(mk(new THREE.BoxGeometry(rW-porticoD*2+colSpacingX+0.3,0.12,0.55),stoneMat,0,rH-entabH+0.46,ez)); // cornice
        // Dentil blocks on cornice
        for(let dx=-rW/2+porticoD;dx<=rW/2-porticoD;dx+=0.5){
          scene.add(mk(new THREE.BoxGeometry(0.12,0.08,0.08),stoneMat,dx,rH-entabH+0.35,ez+(s>0?-0.22:0.22)));
        }
        // Short sides
        const ex=s*courtInX;
        scene.add(mk(new THREE.BoxGeometry(0.45,0.18,rL-porticoD*2),stoneMat,ex,rH-entabH+0.09,0));
        scene.add(mk(new THREE.BoxGeometry(0.35,0.22,rL-porticoD*2),stoneWarmMat,ex,rH-entabH+0.29,0));
        scene.add(mk(new THREE.BoxGeometry(0.55,0.12,rL-porticoD*2+0.3),stoneMat,ex,rH-entabH+0.46,0));
        for(let dz=-rL/2+porticoD;dz<=rL/2-porticoD;dz+=0.5){
          scene.add(mk(new THREE.BoxGeometry(0.08,0.08,0.12),stoneMat,ex+(s>0?-0.22:0.22),rH-entabH+0.35,dz));
        }
      }

      // ── IMPLUVIUM: shallow reflecting pool in the center ──
      const poolW=5, poolL=3.5, poolDepth=0.2;
      // Pool basin (sunken)
      scene.add(mk(new THREE.BoxGeometry(poolW+0.3,0.08,poolL+0.3),stoneMat,0,0.01,0)); // rim
      scene.add(mk(new THREE.BoxGeometry(poolW,poolDepth,poolL),stoneMat,0,-poolDepth/2+0.01,0)); // basin walls
      // Water surface
      const water=new THREE.Mesh(new THREE.PlaneGeometry(poolW-0.1,poolL-0.1),waterMat);
      water.rotation.x=-Math.PI/2;water.position.set(0,0.005,0);scene.add(water);
      animTex.push({type:"water" as any,mesh:water});
      // Decorative stone edge with moulding
      for(let s=-1;s<=1;s+=2){
        scene.add(mk(new THREE.BoxGeometry(poolW+0.5,0.12,0.2),MS.marble,0,0.06,s*(poolL/2+0.15)));
        scene.add(mk(new THREE.BoxGeometry(0.2,0.12,poolL+0.2),MS.marble,s*(poolW/2+0.15),0.06,0));
      }

      // ── FOUNTAIN in center of impluvium (ornate Roman style) ──
      // Stepped base
      scene.add(mk(new THREE.CylinderGeometry(0.5,0.55,0.08,16),MS.marble,0,0.04,0));
      scene.add(mk(new THREE.CylinderGeometry(0.4,0.45,0.10,16),stoneMat,0,0.13,0));
      // Fluted column
      scene.add(mk(new THREE.CylinderGeometry(0.10,0.14,0.7,12),stoneMat,0,0.53,0));
      // Column rings
      scene.add(mk(new THREE.CylinderGeometry(0.13,0.13,0.04,12),MS.gold,0,0.35,0));
      scene.add(mk(new THREE.CylinderGeometry(0.12,0.12,0.03,12),MS.gold,0,0.65,0));
      // Upper scalloped basin
      scene.add(mk(new THREE.CylinderGeometry(0.50,0.25,0.14,12),stoneMat,0,0.97,0));
      scene.add(mk(new THREE.CylinderGeometry(0.52,0.52,0.03,12),MS.marble,0,1.05,0)); // rim
      // Water in upper basin
      scene.add(mk(new THREE.CylinderGeometry(0.44,0.44,0.03,12),waterMat,0,1.04,0));
      // Upper column rising from basin
      scene.add(mk(new THREE.CylinderGeometry(0.06,0.08,0.35,10),stoneMat,0,1.25,0));
      // Small top basin
      scene.add(mk(new THREE.CylinderGeometry(0.18,0.12,0.08,10),stoneMat,0,1.47,0));
      scene.add(mk(new THREE.CylinderGeometry(0.14,0.14,0.02,10),waterMat,0,1.52,0));
      // Decorative finial — acorn or pine cone shape
      scene.add(mk(new THREE.CylinderGeometry(0.03,0.06,0.10,8),MS.bronze,0,1.58,0));
      scene.add(mk(new THREE.SphereGeometry(0.04,8,8),MS.bronze,0,1.65,0));
      // Subtle water shimmer light
      if(!isMobileGPU()){const fountainLight=new THREE.PointLight("#B0D8E8",0.2,4);fountainLight.position.set(0,1.1,0);scene.add(fountainLight);}

      // ── GARDEN ELEMENTS: potted plants, low hedges, small statues ──
      // Low hedges along the courtyard inner perimeter
      const hedgeInset=1.5; // inset from colonnade
      for(let s=-1;s<=1;s+=2){
        // Along long sides
        scene.add(mk(new THREE.BoxGeometry(courtInX*2-4,0.6,0.5),hedgeMat,0,0.3,s*(courtInZ-hedgeInset)));
        scene.add(mk(new THREE.BoxGeometry(courtInX*2-4.2,0.15,0.55),hedgeLightMat,0,0.68,s*(courtInZ-hedgeInset)));
        // Along short sides (shorter segments)
        scene.add(mk(new THREE.BoxGeometry(0.5,0.6,courtInZ*2-4),hedgeMat,s*(courtInX-hedgeInset),0.3,0));
        scene.add(mk(new THREE.BoxGeometry(0.55,0.15,courtInZ*2-4.2),hedgeLightMat,s*(courtInX-hedgeInset),0.68,0));
      }

      // Terracotta pots with plants at corners of hedge arrangement
      const potPositions: [number,number][]=[
        [-courtInX+hedgeInset,-courtInZ+hedgeInset],[courtInX-hedgeInset,-courtInZ+hedgeInset],
        [-courtInX+hedgeInset,courtInZ-hedgeInset],[courtInX-hedgeInset,courtInZ-hedgeInset]
      ];
      for(const[ppx,ppz] of potPositions){
        // Terracotta pot
        scene.add(mk(new THREE.CylinderGeometry(0.25,0.2,0.4,10),terraMat,ppx,0.2,ppz));
        scene.add(mk(new THREE.CylinderGeometry(0.27,0.27,0.04,10),terraMat,ppx,0.42,ppz));
        // Topiary/bush
        scene.add(mk(new THREE.SphereGeometry(0.35,8,8),hedgeMat,ppx,0.8,ppz));
        scene.add(mk(new THREE.SphereGeometry(0.22,8,8),hedgeLightMat,ppx,1.15,ppz));
      }

      // Small cypress trees flanking the impluvium
      for(let s=-1;s<=1;s+=2){
        const cyX=s*3.5, cyZ=0;
        scene.add(mk(new THREE.CylinderGeometry(0.06,0.08,0.5,6),MS.dkW,cyX,0.25,cyZ)); // trunk
        scene.add(mk(new THREE.ConeGeometry(0.35,2.0,8),hedgeMat,cyX,1.5,cyZ)); // foliage
        scene.add(mk(new THREE.ConeGeometry(0.25,1.5,8),hedgeLightMat,cyX,2.1,cyZ)); // top
      }

      // ── STATUES on pedestals flanking the impluvium ──
      for(let s=-1;s<=1;s+=2){
        const stX=s*1.5, stZ=poolL/2+1.5;
        // Tiered pedestal with moulding
        scene.add(mk(new THREE.BoxGeometry(0.7,0.06,0.7),MS.marble,stX,0.03,stZ));   // base slab
        scene.add(mk(new THREE.BoxGeometry(0.6,0.06,0.6),stoneMat,stX,0.09,stZ));     // lower plinth
        scene.add(mk(new THREE.BoxGeometry(0.5,0.7,0.5),stoneMat,stX,0.47,stZ));      // main shaft
        scene.add(mk(new THREE.BoxGeometry(0.55,0.04,0.55),MS.gold,stX,0.84,stZ));    // gold band
        scene.add(mk(new THREE.BoxGeometry(0.58,0.06,0.58),MS.marble,stX,0.91,stZ));  // cap
        // More detailed figure — draped toga style
        scene.add(mk(new THREE.CylinderGeometry(0.10,0.16,0.55,10),MS.marble,stX,1.21,stZ)); // torso (tapered)
        scene.add(mk(new THREE.CylinderGeometry(0.06,0.10,0.12,8),MS.marble,stX,1.55,stZ));  // neck
        scene.add(mk(new THREE.SphereGeometry(0.11,12,12),MS.marble,stX,1.70,stZ));            // head
        // Arms suggestion (slight protrusions)
        for(const as2 of[-1,1]){
          scene.add(mk(new THREE.CylinderGeometry(0.03,0.04,0.3,6),MS.marble,stX+as2*0.14,1.15,stZ));
        }
      }

      // ── Stone benches in the courtyard (for contemplation) ──
      for(const bz2 of[-3,3]){
        // Wider, more elegant bench with curved legs
        scene.add(mk(new THREE.BoxGeometry(2.8,0.06,0.55),MS.marble,0,0.46,bz2)); // seat
        scene.add(mk(new THREE.BoxGeometry(2.9,0.03,0.58),MS.gold,0,0.48,bz2));   // gilded edge
        for(const blx of[-1.15,0,1.15]){
          scene.add(mk(new THREE.BoxGeometry(0.12,0.40,0.50),stoneMat,blx,0.23,bz2)); // legs
        }
      }
    }else{
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(rW,rL),MS.floor);fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;scene.add(fl);
    scene.add(mk(new THREE.BoxGeometry(rW-1.5,.003,rL-1.5),MS.floorL,0,.002,0));
    for(let s=-1;s<=1;s+=2){scene.add(mk(new THREE.BoxGeometry(.05,.004,rL-2),MS.dkW,s*(rW/2-.9),.003,0));scene.add(mk(new THREE.BoxGeometry(rW-2,.004,.05),MS.dkW,0,.003,s*(rL/2-.9)));}
    const ce=new THREE.Mesh(new THREE.PlaneGeometry(rW,rL),MS.ceil);ce.rotation.x=Math.PI/2;ce.position.y=rH;scene.add(ce);
    for(let s=-1;s<=1;s+=2){scene.add(mk(new THREE.BoxGeometry(.1,.14,rL),MS.gold,s*(rW/2-.05),rH-.07,0));scene.add(mk(new THREE.BoxGeometry(rW,.14,.1),MS.gold,0,rH-.07,s*(rL/2-.05)));}
    for(let s=-1;s<=1;s+=2){
      const wm=new THREE.Mesh(new THREE.PlaneGeometry(rL,rH),MS.wall);wm.rotation.y=s*(-Math.PI/2);wm.position.set(s*(rW/2),rH/2,0);wm.receiveShadow=true;scene.add(wm);
    }
    scene.add(mk(new THREE.PlaneGeometry(rW,rH),MS.wall,0,rH/2,-rL/2));
    const bw=new THREE.Mesh(new THREE.PlaneGeometry(rW,rH),MS.wall);bw.rotation.y=Math.PI;bw.position.set(0,rH/2,rL/2);bw.receiveShadow=true;scene.add(bw);
    for(let s=-1;s<=1;s+=2){scene.add(mk(new THREE.BoxGeometry(.05,1.2,rL-.3),MS.wain,s*(rW/2-.025),.6,0));scene.add(mk(new THREE.BoxGeometry(.06,.07,rL-.2),MS.gold,s*(rW/2-.03),1.23,0));scene.add(mk(new THREE.BoxGeometry(.08,.18,rL-.1),MS.dkW,s*(rW/2-.04),.09,0));}
    scene.add(mk(new THREE.BoxGeometry(rW-.3,1.2,.05),MS.wain,0,.6,-rL/2+.025));scene.add(mk(new THREE.BoxGeometry(rW-.2,.07,.06),MS.gold,0,1.23,-rL/2+.03));
    } // end shell isExhibition branch

    // ── ERA-SPECIFIC ROOM MODIFICATIONS ──
    if (styleEra === "renaissance") {
      // ─── RICH COFFERED CEILING (5×5 grid) ───
      const cofN=5;
      const cSpanX=(rW-0.6)/cofN, cSpanZ=(rL-0.6)/cofN;
      for(let cx=0;cx<cofN;cx++){for(let cz=0;cz<cofN;cz++){
        const cofX=-rW/2+0.3+cSpanX*(cx+0.5), cofZ=-rL/2+0.3+cSpanZ*(cz+0.5);
        const cW=cSpanX*0.75, cD=cSpanZ*0.75;
        // outer frame
        scene.add(mk(new THREE.BoxGeometry(cW+0.06,0.04,cD+0.06),MS.trim,cofX,rH-0.02,cofZ));
        // inner frame
        scene.add(mk(new THREE.BoxGeometry(cW,0.06,cD),MS.gold,cofX,rH-0.05,cofZ));
        // recessed coffer panel
        scene.add(mk(new THREE.BoxGeometry(cW-0.08,0.02,cD-0.08),MS.trim,cofX,rH-0.15,cofZ));
        // center rosette
        const ros=new THREE.Mesh(new THREE.CircleGeometry(Math.min(cW,cD)*0.18,12),MS.gold);
        ros.rotation.x=Math.PI/2;ros.position.set(cofX,rH-0.149,cofZ);scene.add(ros);
        // boss
        scene.add(mk(new THREE.SphereGeometry(Math.min(cW,cD)*0.06,8,8),MS.gold,cofX,rH-0.13,cofZ));
      }}
      // Ceiling beams between coffers
      for(let bx=0;bx<=cofN;bx++){
        const x=-rW/2+0.3+bx*cSpanX;
        scene.add(mk(new THREE.BoxGeometry(0.06,0.08,rL-0.4),MS.trim,x,rH-0.04,0));
      }
      for(let bz=0;bz<=cofN;bz++){
        const z=-rL/2+0.3+bz*cSpanZ;
        scene.add(mk(new THREE.BoxGeometry(rW-0.4,0.08,0.06),MS.trim,0,rH-0.04,z));
      }
      // Molding strip at ceiling-wall junction
      for(let s=-1;s<=1;s+=2){
        scene.add(mk(new THREE.BoxGeometry(0.08,0.06,rL-0.1),MS.gold,s*(rW/2-0.04),rH-0.03,0));
        scene.add(mk(new THREE.BoxGeometry(rW-0.1,0.06,0.08),MS.gold,0,rH-0.03,s*(rL/2-0.04)));
      }

      // ─── FULL WAINSCOTING (all 4 walls) ───
      const wainH=1.2, baseH=0.12, chairH=0.07;
      // Side walls: 4 panels each
      for(let s=-1;s<=1;s+=2){
        const wx=s*(rW/2-0.025);
        // base rail
        scene.add(mk(new THREE.BoxGeometry(0.06,baseH,rL-0.3),MS.dkW,wx,baseH/2,0));
        // chair rail
        scene.add(mk(new THREE.BoxGeometry(0.07,chairH,rL-0.2),MS.gold,wx,wainH+chairH/2,0));
        // panel backing
        scene.add(mk(new THREE.BoxGeometry(0.04,wainH-baseH-chairH,rL-0.3),MS.wain,wx,(baseH+wainH)/2,0));
        // 4 raised panels
        const panelLen=(rL-0.6)/4;
        for(let p=0;p<4;p++){
          const pz=-rL/2+0.3+panelLen*(p+0.5);
          scene.add(mk(new THREE.BoxGeometry(0.02,wainH-baseH-chairH-0.12,panelLen-0.12),MS.wain,wx+s*0.025,(baseH+wainH)/2,pz));
          // stile between panels
          if(p<3) scene.add(mk(new THREE.BoxGeometry(0.05,wainH-baseH,0.04),MS.dkW,wx,(baseH+wainH)/2,-rL/2+0.3+panelLen*(p+1)));
        }
      }
      // Back wall (behind fireplace skipped — do front wall)
      {
        const wz=rL/2-0.025;
        scene.add(mk(new THREE.BoxGeometry(rW-0.3,baseH,0.06),MS.dkW,0,baseH/2,wz));
        scene.add(mk(new THREE.BoxGeometry(rW-0.2,chairH,0.07),MS.gold,0,wainH+chairH/2,wz));
        scene.add(mk(new THREE.BoxGeometry(rW-0.3,wainH-baseH-chairH,0.04),MS.wain,0,(baseH+wainH)/2,wz));
        const panelLen2=(rW-0.6)/3;
        for(let p=0;p<3;p++){
          const px=-rW/2+0.3+panelLen2*(p+0.5);
          scene.add(mk(new THREE.BoxGeometry(panelLen2-0.12,wainH-baseH-chairH-0.12,0.02),MS.wain,px,(baseH+wainH)/2,wz-0.025));
          if(p<2) scene.add(mk(new THREE.BoxGeometry(0.04,wainH-baseH,0.05),MS.dkW,-rW/2+0.3+panelLen2*(p+1),(baseH+wainH)/2,wz));
        }
      }
      // Back wall wainscoting (flanking fireplace)
      {
        const wz2=-rL/2+0.025;
        // left of fireplace
        scene.add(mk(new THREE.BoxGeometry((rW/2-1.5),wainH-baseH-chairH,0.04),MS.wain,-(rW/2+1.5)/2,(baseH+wainH)/2,wz2));
        // right of fireplace
        scene.add(mk(new THREE.BoxGeometry((rW/2-1.5),wainH-baseH-chairH,0.04),MS.wain,(rW/2+1.5)/2,(baseH+wainH)/2,wz2));
      }

      // ─── TAPESTRY PANELS (above wainscoting) ───
      const tapColors=["#6B1A2A","#2D4A2D","#1A2A6B","#6B1A2A"];
      const tapW=1.2, tapH2=1.8;
      // Side walls: 2 tapestries each
      for(let s=-1;s<=1;s+=2){
        for(let ti=0;ti<2;ti++){
          const tz=-rL/4+ti*(rL/2);
          const tapMat=new THREE.MeshStandardMaterial({color:tapColors[(s>0?0:2)+ti],roughness:0.85,side:THREE.DoubleSide});
          const tap=new THREE.Mesh(new THREE.PlaneGeometry(tapH2,tapW),tapMat);
          tap.rotation.y=s*(-Math.PI/2);tap.position.set(s*(rW/2-0.03),wainH+0.15+tapW/2,tz);scene.add(tap);
          // gold hanging rod
          const rod=mk(new THREE.CylinderGeometry(0.015,0.015,tapH2+0.15,6),MS.gold,s*(rW/2-0.04),wainH+0.15+tapW+0.02,tz);
          rod.rotation.z=Math.PI/2;scene.add(rod);
          // tassels at bottom corners
          for(let tc=-1;tc<=1;tc+=2){
            scene.add(mk(new THREE.CylinderGeometry(0.015,0.015,0.12,4),MS.gold,s*(rW/2-0.04),wainH+0.09,tz+tc*(tapH2/2-0.05)));
            scene.add(mk(new THREE.ConeGeometry(0.025,0.06,4),MS.gold,s*(rW/2-0.04),wainH+0.02,tz+tc*(tapH2/2-0.05)));
          }
        }
      }

      // ─── GLOBE ON STAND ───
      const globeX=rW/2-1.2, globeZ=rL/2-1.5, globeY=0.9;
      const globeMat=new THREE.MeshStandardMaterial({color:"#4A6A5A",roughness:0.5,metalness:0.15});
      scene.add(mk(new THREE.SphereGeometry(0.18,16,16),globeMat,globeX,globeY+0.18,globeZ));
      // meridian ring (tilted 23°)
      const meridian=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.008,8,32),MS.gold);
      meridian.position.set(globeX,globeY+0.18,globeZ);meridian.rotation.z=23*Math.PI/180;scene.add(meridian);
      // horizon ring
      const horizon=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.008,8,32),MS.gold);
      horizon.position.set(globeX,globeY+0.18,globeZ);horizon.rotation.x=Math.PI/2;scene.add(horizon);
      // 3 curved legs
      for(let li=0;li<3;li++){
        const la=li*(Math.PI*2/3);
        const lx=Math.cos(la)*0.12, lz2=Math.sin(la)*0.12;
        scene.add(mk(new THREE.CylinderGeometry(0.012,0.018,globeY,6),MS.dkW,globeX+lx,globeY/2,globeZ+lz2));
      }
      // base
      scene.add(mk(new THREE.CylinderGeometry(0.15,0.15,0.02,12),MS.dkW,globeX,0.01,globeZ));

      // ─── WRITING DESK ENHANCEMENTS ───
      const dkXr=-rW/2+1.8, dkZr=rL/2-2.2, dkYr=0.82;
      // Open book: two angled pages
      const pageL=new THREE.Mesh(new THREE.PlaneGeometry(0.14,0.2),new THREE.MeshStandardMaterial({color:"#FFFFF0",roughness:0.9,side:THREE.DoubleSide}));
      pageL.position.set(dkXr-0.07,dkYr+0.02,dkZr+0.05);pageL.rotation.set(-0.15,0,0.08);scene.add(pageL);
      const pageR=new THREE.Mesh(new THREE.PlaneGeometry(0.14,0.2),new THREE.MeshStandardMaterial({color:"#FFFFF0",roughness:0.9,side:THREE.DoubleSide}));
      pageR.position.set(dkXr+0.07,dkYr+0.02,dkZr+0.05);pageR.rotation.set(-0.15,0,-0.08);scene.add(pageR);
      // Ink well
      scene.add(mk(new THREE.CylinderGeometry(0.03,0.035,0.04,8),new THREE.MeshStandardMaterial({color:"#1A1A1A",roughness:0.4,metalness:0.3}),dkXr+0.4,dkYr+0.02,dkZr-0.15));
      // Quill pen
      const quill=mk(new THREE.CylinderGeometry(0.004,0.004,0.25,4),new THREE.MeshStandardMaterial({color:"#E8D8B8",roughness:0.7}),dkXr+0.42,dkYr+0.06,dkZr-0.12);
      quill.rotation.set(0,0.3,-0.5);scene.add(quill);
      // Scroll
      scene.add(mk(new THREE.CylinderGeometry(0.02,0.02,0.18,8),new THREE.MeshStandardMaterial({color:"#E8D8B0",roughness:0.8}),dkXr-0.4,dkYr+0.02,dkZr-0.2));
      const scrollTrail=new THREE.Mesh(new THREE.PlaneGeometry(0.15,0.18),new THREE.MeshStandardMaterial({color:"#E8D8B0",roughness:0.8,side:THREE.DoubleSide}));
      scrollTrail.position.set(dkXr-0.32,dkYr+0.01,dkZr-0.12);scrollTrail.rotation.x=-Math.PI/2+0.05;scene.add(scrollTrail);
      // Wax seal
      scene.add(mk(new THREE.CylinderGeometry(0.018,0.018,0.008,8),new THREE.MeshStandardMaterial({color:"#8B1A1A",roughness:0.5,emissive:"#3A0808",emissiveIntensity:0.3}),dkXr-0.25,dkYr+0.015,dkZr-0.08));

      // ─── CANDELABRA ON FIREPLACE MANTLE (2 matching) ───
      for(let cs=-1;cs<=1;cs+=2){
        const candX=cs*0.9, candZ=-rL/2+0.3, candY=1.35;
        // central shaft
        scene.add(mk(new THREE.CylinderGeometry(0.012,0.018,0.35,6),MS.gold,candX,candY+0.175,candZ));
        // base
        scene.add(mk(new THREE.CylinderGeometry(0.05,0.05,0.02,8),MS.gold,candX,candY+0.01,candZ));
        // 4 arms + central candle = 5 branches
        const armAngles=[0,Math.PI/2,Math.PI,Math.PI*1.5];
        for(let ai=0;ai<armAngles.length;ai++){
          const aa=armAngles[ai], armLen=0.08;
          const ax2=candX+Math.cos(aa)*armLen, az2=candZ+Math.sin(aa)*armLen;
          // arm
          scene.add(mk(new THREE.CylinderGeometry(0.006,0.006,armLen,4),MS.gold,(candX+ax2)/2,candY+0.25,(candZ+az2)/2));
          // candle cup
          scene.add(mk(new THREE.CylinderGeometry(0.012,0.012,0.02,6),MS.gold,ax2,candY+0.26,az2));
          // candle
          scene.add(mk(new THREE.CylinderGeometry(0.008,0.008,0.06,6),new THREE.MeshStandardMaterial({color:"#FFF8E8",roughness:0.9}),ax2,candY+0.30,az2));
          // emissive tip
          scene.add(mk(new THREE.SphereGeometry(0.006,4,4),new THREE.MeshBasicMaterial({color:"#FFCC44"}),ax2,candY+0.335,az2));
        }
        // central candle (taller)
        scene.add(mk(new THREE.CylinderGeometry(0.01,0.01,0.08,6),new THREE.MeshStandardMaterial({color:"#FFF8E8",roughness:0.9}),candX,candY+0.39,candZ));
        scene.add(mk(new THREE.SphereGeometry(0.007,4,4),new THREE.MeshBasicMaterial({color:"#FFCC44"}),candX,candY+0.435,candZ));
      }

      // ─── HERALDIC SHIELD ABOVE FIREPLACE ───
      const shX=0, shY=1.8, shZ=-rL/2+0.28;
      scene.add(mk(new THREE.BoxGeometry(0.5,0.6,0.04),MS.gold,shX,shY,shZ));
      // colored quarters
      const qMats=[
        new THREE.MeshStandardMaterial({color:"#8B1A1A",roughness:0.6}),
        new THREE.MeshStandardMaterial({color:"#1A2A6B",roughness:0.6}),
        new THREE.MeshStandardMaterial({color:"#1A2A6B",roughness:0.6}),
        new THREE.MeshStandardMaterial({color:"#8B1A1A",roughness:0.6})
      ];
      for(let qr=0;qr<2;qr++)for(let qc=0;qc<2;qc++){
        scene.add(mk(new THREE.BoxGeometry(0.2,0.24,0.01),qMats[qr*2+qc],shX+(qc-0.5)*0.2,shY+(qr-0.5)*0.24,shZ+0.025));
      }
      // small flanking decorations
      for(let sd=-1;sd<=1;sd+=2){
        scene.add(mk(new THREE.SphereGeometry(0.04,6,6),MS.gold,shX+sd*0.4,shY,shZ+0.02));
      }

    } else {
      // ═══ ROMAN CUBICULUM / TRICLINIUM ═══

      // ─── FULL MOSAIC FLOOR ───
      // Center medallion: compass rose (8 triangular segments)
      const medallionR=0.6;
      const compassColors=[
        new THREE.MeshStandardMaterial({color:"#1A1A18",roughness:0.5}),
        new THREE.MeshStandardMaterial({color:"#F5F0E8",roughness:0.5}),
        new THREE.MeshStandardMaterial({color:"#C17040",roughness:0.5})
      ];
      for(let ci=0;ci<8;ci++){
        const triShape=new THREE.BufferGeometry();
        const a1=ci*Math.PI/4, a2=(ci+1)*Math.PI/4;
        const verts=new Float32Array([0,0,0, Math.cos(a1)*medallionR,0,Math.sin(a1)*medallionR, Math.cos(a2)*medallionR,0,Math.sin(a2)*medallionR]);
        triShape.setAttribute("position",new THREE.BufferAttribute(verts,3));
        triShape.computeVertexNormals();
        const triM=new THREE.Mesh(triShape,compassColors[ci%3]);
        triM.position.set(0,0.006,0);scene.add(triM);
      }
      // Compass rose border ring
      const compassRing=new THREE.Mesh(new THREE.TorusGeometry(medallionR,0.02,8,32),MS.gold);
      compassRing.rotation.x=-Math.PI/2;compassRing.position.y=0.008;scene.add(compassRing);

      // Greek key meander border (repeating L-shaped segments)
      const mdrMat1=new THREE.MeshStandardMaterial({color:"#C17040",roughness:0.6});
      const mdrMat2=new THREE.MeshStandardMaterial({color:"#F5F0E8",roughness:0.6});
      const mdrStep=0.2, mdrW2=0.05;
      for(let s=-1;s<=1;s+=2){
        // along X edges
        for(let mi=0;mi<Math.floor((rW-1)/mdrStep);mi++){
          const mx=-rW/2+0.5+mi*mdrStep;
          const mMat=mi%2===0?mdrMat1:mdrMat2;
          scene.add(mk(new THREE.BoxGeometry(mdrStep*0.4,0.005,mdrW2),mMat,mx,0.004,s*(rL/2-0.8)));
          scene.add(mk(new THREE.BoxGeometry(mdrW2,0.005,mdrStep*0.3),mMat,mx+mdrStep*0.15,0.004,s*(rL/2-0.8+s*mdrStep*0.15)));
        }
        // along Z edges
        for(let mi=0;mi<Math.floor((rL-1)/mdrStep);mi++){
          const mz=-rL/2+0.5+mi*mdrStep;
          const mMat=mi%2===0?mdrMat1:mdrMat2;
          scene.add(mk(new THREE.BoxGeometry(mdrW2,0.005,mdrStep*0.4),mMat,s*(rW/2-0.8),0.004,mz));
          scene.add(mk(new THREE.BoxGeometry(mdrStep*0.3,0.005,mdrW2),mMat,s*(rW/2-0.8+s*mdrStep*0.15),0.004,mz+mdrStep*0.15));
        }
      }

      // Diamond grid of alternating black/white tiles (InstancedMesh)
      const tileSize=0.3, tileMats=[
        new THREE.MeshStandardMaterial({color:"#1A1A18",roughness:0.5}),
        new THREE.MeshStandardMaterial({color:"#F5F0E8",roughness:0.5})
      ];
      const tileGeo=new THREE.PlaneGeometry(tileSize*0.65,tileSize*0.65);
      for(let tmi=0;tmi<2;tmi++){
        const cols=Math.floor((rW-2.4)/tileSize), rows=Math.floor((rL-2.4)/tileSize);
        let count=0;
        // count matching tiles
        for(let tr=0;tr<rows;tr++)for(let tc=0;tc<cols;tc++){if((tr+tc)%2===tmi)count++;}
        if(count===0)continue;
        const inst=new THREE.InstancedMesh(tileGeo,tileMats[tmi],count);
        const dm=new THREE.Matrix4();let idx=0;
        for(let tr=0;tr<rows;tr++)for(let tc=0;tc<cols;tc++){
          if((tr+tc)%2!==tmi)continue;
          const tx=-rW/2+1.2+tc*tileSize+tileSize/2, tz=-rL/2+1.2+tr*tileSize+tileSize/2;
          // skip center medallion area
          if(Math.sqrt(tx*tx+tz*tz)<medallionR+0.15)continue;
          dm.makeRotationX(-Math.PI/2);
          dm.setPosition(tx,0.005,tz);
          // rotate 45° for diamond pattern
          const rot=new THREE.Matrix4().makeRotationZ(Math.PI/4);
          dm.multiply(rot);
          dm.setPosition(tx,0.005,tz);
          inst.setMatrixAt(idx++,dm);
        }
        inst.count=idx;inst.instanceMatrix.needsUpdate=true;
        scene.add(inst);
      }

      // Threshold strip at door (front wall)
      scene.add(mk(new THREE.BoxGeometry(1.2,0.01,0.15),MS.marble,0,0.005,rL/2-0.3));

      // ─── POMPEIAN FRESCO WALLS ───
      const socleH=0.6, friezeH=0.8, mainH=rH-socleH-friezeH;
      const pomRed=new THREE.MeshStandardMaterial({color:"#8B2500",roughness:0.7});
      const pomBlack=new THREE.MeshStandardMaterial({color:"#1A1A18",roughness:0.65});
      const pomOchre=new THREE.MeshStandardMaterial({color:"#C17040",roughness:0.7});
      const pomCream=new THREE.MeshStandardMaterial({color:"#E8DCC8",roughness:0.7});
      const pomFrieze=new THREE.MeshStandardMaterial({color:"#D4C8B0",roughness:0.75});
      const panelMats=[pomRed,pomBlack,pomOchre];
      const socle=new THREE.MeshStandardMaterial({color:"#1A1A18",roughness:0.6});

      // Side walls
      for(let s=-1;s<=1;s+=2){
        const wx=s*(rW/2-0.01);
        // socle zone
        scene.add(mk(new THREE.BoxGeometry(0.01,socleH,rL-0.2),socle,wx,socleH/2,0));
        // upper frieze
        scene.add(mk(new THREE.BoxGeometry(0.01,friezeH,rL-0.2),pomFrieze,wx,rH-friezeH/2,0));
        // frieze geometric border
        scene.add(mk(new THREE.BoxGeometry(0.015,0.04,rL-0.3),MS.gold,wx,rH-friezeH,0));
        // 3 main panels
        const panelW=(rL-0.8)/3;
        for(let pi=0;pi<3;pi++){
          const pz=-rL/2+0.4+panelW*(pi+0.5);
          const pMat=panelMats[(pi+(s>0?1:0))%3];
          // recessed panel
          scene.add(mk(new THREE.BoxGeometry(0.015,mainH-0.2,panelW-0.15),pMat,wx-s*0.008,socleH+mainH/2,pz));
          // subtle border lines (not framed like a painting)
          scene.add(mk(new THREE.BoxGeometry(0.016,0.015,panelW-0.12),pomCream,wx,socleH+0.1,pz));
          scene.add(mk(new THREE.BoxGeometry(0.016,0.015,panelW-0.12),pomCream,wx,socleH+mainH-0.1,pz));
          // pilaster between panels
          if(pi<2){
            scene.add(mk(new THREE.BoxGeometry(0.02,mainH+socleH,0.06),pomCream,wx,socleH/2+mainH/2,pz+panelW/2));
          }
        }
      }
      // Back wall (behind fireplace flanks)
      for(let bSide=-1;bSide<=1;bSide+=2){
        const bz=-rL/2+0.01;
        const bpW=(rW/2-1.5);
        if(bpW>0.3){
          const bpX=bSide*(rW/2+1.5)/2;
          scene.add(mk(new THREE.BoxGeometry(bpW,socleH,0.01),socle,bpX,socleH/2,bz));
          scene.add(mk(new THREE.BoxGeometry(bpW,mainH-0.2,0.015),panelMats[bSide>0?0:2],bpX,socleH+mainH/2,bz+0.005));
          scene.add(mk(new THREE.BoxGeometry(bpW,friezeH,0.01),pomFrieze,bpX,rH-friezeH/2,bz));
        }
      }
      // Front wall
      {
        const fz=rL/2-0.01;
        scene.add(mk(new THREE.BoxGeometry(rW-0.3,socleH,0.01),socle,0,socleH/2,fz));
        scene.add(mk(new THREE.BoxGeometry(rW-0.3,friezeH,0.01),pomFrieze,0,rH-friezeH/2,fz));
        const fpW=(rW-0.6)/2;
        for(let fi=0;fi<2;fi++){
          const fpx=-rW/2+0.3+fpW*(fi+0.5);
          scene.add(mk(new THREE.BoxGeometry(fpW-0.15,mainH-0.2,0.015),panelMats[fi],fpx,socleH+mainH/2,fz-0.005));
        }
      }

      // ─── AMPHORA DECORATIONS (4) ───
      const ampMat=new THREE.MeshStandardMaterial({color:"#B87040",roughness:0.65});
      const ampPositions:[number,number,number,number][]=[
        [-rW/2+0.5,0,rL/2-0.5,0.55],
        [rW/2-0.5,0,-rL/2+0.8,0.65],
        [-0.9,0,-rL/2+0.5,0.5],
        [0.9,0,-rL/2+0.5,0.6]
      ];
      for(const [ax,_ay,az,ah] of ampPositions){
        const neckH=ah*0.2, bodyH=ah*0.7, lipH=ah*0.1;
        // body (tapered)
        scene.add(mk(new THREE.CylinderGeometry(ah*0.18,ah*0.22,bodyH,10),ampMat,ax,bodyH/2,az));
        // neck
        scene.add(mk(new THREE.CylinderGeometry(ah*0.08,ah*0.15,neckH,8),ampMat,ax,bodyH+neckH/2,az));
        // lip
        scene.add(mk(new THREE.CylinderGeometry(ah*0.12,ah*0.08,lipH,8),ampMat,ax,bodyH+neckH+lipH/2,az));
        // handles (2 torus handles)
        for(let hs=-1;hs<=1;hs+=2){
          const handle=new THREE.Mesh(new THREE.TorusGeometry(ah*0.1,0.012,6,12),ampMat);
          handle.position.set(ax+hs*ah*0.22,bodyH+neckH*0.3,az);
          handle.rotation.y=hs*Math.PI/4;
          scene.add(handle);
        }
      }

      // ─── OIL LAMP ON TABLE ───
      const lampX=0, lampZ2=rL/2-3.5-1.7, lampY=0.56;
      const bronzeLamp=MS.bronze;
      // dish
      scene.add(mk(new THREE.CylinderGeometry(0.06,0.05,0.025,10),bronzeLamp,lampX,lampY,lampZ2));
      // handle (back)
      scene.add(mk(new THREE.CylinderGeometry(0.01,0.01,0.08,4),bronzeLamp,lampX-0.06,lampY+0.02,lampZ2));
      // nozzle (front)
      scene.add(mk(new THREE.CylinderGeometry(0.008,0.015,0.06,4),bronzeLamp,lampX+0.07,lampY,lampZ2));
      // emissive warm glow
      scene.add(mk(new THREE.SphereGeometry(0.012,4,4),new THREE.MeshBasicMaterial({color:"#FFAA44"}),lampX+0.09,lampY+0.02,lampZ2));
      // point light
      if(!isMobileGPU()){const oilLight=new THREE.PointLight("#FF9930",0.3,3);oilLight.position.set(lampX+0.09,lampY+0.05,lampZ2);scene.add(oilLight);}

      // ─── ROMAN CEILING BEAMS ───
      const beamCount=7;
      const beamSpacing=rL/(beamCount+1);
      for(let bi=1;bi<=beamCount;bi++){
        const bz3=-rL/2+bi*beamSpacing;
        scene.add(mk(new THREE.BoxGeometry(rW-0.3,0.14,0.1),MS.dkW,0,rH-0.07,bz3));
      }
    }

    // ═══════════════════════════════════════════
    // FIREPLACE (back wall center) — skipped in exhibition mode
    // ═══════════════════════════════════════════
    const fpX=0,fpZ=-rL/2+.3;
    if(!isExhibition){
    scene.add(mk(new THREE.BoxGeometry(2.8,.12,.5),MS.marble,fpX,1.3,fpZ));
    scene.add(mk(new THREE.BoxGeometry(2.6,.08,.4),MS.gold,fpX,1.24,fpZ+.02));
    scene.add(mk(new THREE.BoxGeometry(1.6,1.1,.3),MS.brickD,fpX,.55,fpZ));
    scene.add(mk(new THREE.BoxGeometry(.2,1.1,.3),MS.brick,fpX-.9,.55,fpZ));
    scene.add(mk(new THREE.BoxGeometry(.2,1.1,.3),MS.brick,fpX+.9,.55,fpZ));
    scene.add(mk(new THREE.BoxGeometry(2,.18,.3),MS.brick,fpX,1.19,fpZ));
    scene.add(mk(new THREE.BoxGeometry(2.6,.06,.6),MS.marble,fpX,.03,fpZ+.15));
    const fireL=new THREE.PointLight("#FF8030",isMobileGPU()?0:.6,5);fireL.position.set(fpX,.5,fpZ+.2);if(!isMobileGPU())scene.add(fireL);
    animTex.push({type:"fire",light:fireL});
    for(let l=0;l<3;l++){const log=mk(new THREE.CylinderGeometry(.06,.07,.5+Math.random()*.3,6),MS.dkW,fpX-.25+l*.25,.12,fpZ+.1);log.rotation.z=Math.PI/2+Math.random()*.2;scene.add(log);}
    for(let f=0;f<5;f++){const fl2=new THREE.Mesh(new THREE.ConeGeometry(.06+Math.random()*.04,.2+Math.random()*.15,4),f%2?MS.fire:MS.fireG);fl2.position.set(fpX-.2+f*.1,.2+Math.random()*.1,fpZ+.1);animTex.push({type:"flame",mesh:fl2,baseY:.2+Math.random()*.1,phase:Math.random()*6});scene.add(fl2);}
    scene.add(mk(new THREE.BoxGeometry(2.4,rH-1.3,.08),MS.wall,fpX,1.3+(rH-1.3)/2,fpZ-.02));
    scene.add(mk(new THREE.BoxGeometry(.2,.3,.12),MS.bronze,fpX,1.45,fpZ+.15));
    scene.add(mk(new THREE.CylinderGeometry(.12,.12,.02,16),MS.gold,fpX,1.62,fpZ+.15));
    } // end !isExhibition fireplace

    // ═══════════════════════════════════════════
    // CHESTERFIELD SOFA (center-right area, facing fireplace)
    // ═══════════════════════════════════════════
    const sofaZ=rL/2-3.5;
    if(!isExhibition){
    // Sofa legs (raised off floor to avoid z-fighting)
    for(let lx of[-1,1])for(let lz of[-1,1])scene.add(mk(new THREE.CylinderGeometry(.04,.045,.12,6),MS.dkW,lx*1,.06,sofaZ+lz*.35));
    // Seat base
    scene.add(mk(new THREE.BoxGeometry(2.4,.25,.9),MS.leather,0,.245,sofaZ));
    // Back
    scene.add(mk(new THREE.BoxGeometry(2.4,.48,.12),MS.leatherD,0,.6,sofaZ+.39));
    // Arms
    for(let s=-1;s<=1;s+=2)scene.add(mk(new THREE.BoxGeometry(.14,.38,.8),MS.leatherD,s*1.13,.39,sofaZ));
    // Buttons
    for(let bx=-3;bx<=3;bx++)for(let by=0;by<2;by++){scene.add(mk(new THREE.SphereGeometry(.02,6,6),MS.button,bx*.3,.5+by*.18,sofaZ+.44));}
    scene.add(mk(new THREE.BoxGeometry(.45,.22,.35),new THREE.MeshStandardMaterial({color:"#8A5838",roughness:.8}),-0.7,.48,sofaZ-.15));
    scene.add(mk(new THREE.BoxGeometry(.4,.2,.32),new THREE.MeshStandardMaterial({color:wing?.accent||"#C66B3D",roughness:.85}),.8,.46,sofaZ-.12));
    } // end !isExhibition sofa

    // ═══════════════════════════════════════════
    // ARMCHAIRS (flanking fireplace — skip left if reading chair present)
    // ═══════════════════════════════════════════
    if(!isExhibition){
    for(let s=-1;s<=1;s+=2){
      if(s===-1&&layout.readingChair)continue; // reading chair occupies this spot
      const ax=s*Math.min(3.5,rW/2-2.5),az=fpZ+2.5;
      // Legs (cylinders raised off floor)
      for(let abx of[-1,1])for(let abz of[-1,1])scene.add(mk(new THREE.CylinderGeometry(.03,.035,.18,6),MS.dkW,ax+abx*.4,.09,az+abz*.3));
      // Seat
      scene.add(mk(new THREE.BoxGeometry(1,.12,.8),MS.leather,ax,.24,az));
      // Back
      scene.add(mk(new THREE.BoxGeometry(1,.42,.1),MS.leatherD,ax,.48,az+.35));
      // Arms
      for(let as=-1;as<=1;as+=2)scene.add(mk(new THREE.BoxGeometry(.12,.3,.7),MS.leatherD,ax+as*.44,.36,az));
    }
    } // end !isExhibition armchairs

    // ═══════════════════════════════════════════
    // COFFEE TABLE / LOW TABLE (between sofa and fireplace)
    // ═══════════════════════════════════════════
    const ctZ=sofaZ-1.7;
    if(!isExhibition){
    scene.add(mk(new THREE.BoxGeometry(1.2,.04,.6),MS.dkW,0,.52,ctZ));
    for(let cx of[-1,1])for(let cz of[-1,1])scene.add(mk(new THREE.CylinderGeometry(.03,.03,.5,6),MS.dkW,cx*.5,.25,ctZ+cz*.22));
    scene.add(mk(new THREE.BoxGeometry(1.1,.02,.5),MS.gold,0,.54,ctZ));
    } // end !isExhibition coffee table

    // ═══════════════════════════════════════════
    // WRITING DESK / SCRIBE TABLE (front-left corner, facing back wall)
    // ═══════════════════════════════════════════
    const dkX=-rW/2+1.8, dkZ=rL/2-2.2;
    if(!isExhibition){
    scene.add(mk(new THREE.BoxGeometry(1.6,.06,.75),MS.dkW,dkX,.78,dkZ));
    for(let dx of[-1,1])for(let dz of[-1,1])scene.add(mk(new THREE.CylinderGeometry(.035,.04,.75,8),MS.dkW,dkX+dx*.65,.38,dkZ+dz*.28));
    for(let dd=-1;dd<=1;dd+=2){scene.add(mk(new THREE.BoxGeometry(.5,.1,.02),MS.ltW,dkX+dd*.4,.7,dkZ+.37));scene.add(mk(new THREE.CylinderGeometry(.012,.012,.06,6),MS.bronze,dkX+dd*.4,.7,dkZ+.39));}
    scene.add(mk(new THREE.CylinderGeometry(.035,.04,.05,8),MS.iron,dkX-.5,.82,dkZ-.1));
    scene.add(mk(new THREE.BoxGeometry(.22,.06,.15),MS.leatherD,dkX+.35,.82,dkZ-.12));
    scene.add(mk(new THREE.BoxGeometry(.2,.05,.14),new THREE.MeshStandardMaterial({color:"#5A4A38",roughness:.8}),dkX+.35,.86,dkZ-.12));
    const chZ=dkZ+.7;
    scene.add(mk(new THREE.BoxGeometry(.48,.04,.45),MS.dkW,dkX,.46,chZ));
    scene.add(mk(new THREE.BoxGeometry(.48,.4,.04),MS.dkW,dkX,.66,chZ+.2));
    for(let cx2 of[-1,1])for(let cz2 of[-1,1])scene.add(mk(new THREE.CylinderGeometry(.022,.022,.43,6),MS.dkW,dkX+cx2*.18,.23,chZ+cz2*.17));
    scene.add(mk(new THREE.CylinderGeometry(.03,.05,.3,6),MS.bronze,dkX-.6,.93,dkZ-.15));
    const dkShade=mk(new THREE.CylinderGeometry(.05,.09,.12,8,1,true),MS.lamp,dkX-.6,1.12,dkZ-.15);scene.add(dkShade);
    if(!isMobileGPU()){const dkLight=new THREE.PointLight("#FFE8C0",.25,3);dkLight.position.set(dkX-.6,1.15,dkZ-.15);scene.add(dkLight);}
    } // end !isExhibition desk
    // Clickable hit area for desk (opens upload when empty — placed after memory routing below)

    // ═══════════════════════════════════════════
    // MEMORY PLACEMENT — type routing
    // Only show memories marked for display (or first N if no flag set)
    // ═══════════════════════════════════════════
    const SLOT_COUNTS: Record<string,number>=isExhibition
      ?{painting:20,frame:0,photo:0,album:0,video:1,audio:0,case:0,document:0,orb:0}
      :{painting:1,frame:1,photo:1,album:3,video:1,audio:3,case:3,document:5,orb:4};

    // Route memories to display slots based on displayUnit (if set) or type
    // "frame" and "painting" are SEPARATE slots to avoid painting-fallback ambiguity
    const slotBuckets: Record<string, any[]> = {};
    for(const key of Object.keys(SLOT_COUNTS)) slotBuckets[key]=[];

    mems.forEach((m: any)=>{
      let targetSlot=m.type;
      if(m.displayUnit){
        const unitToSlot: Record<string,string>={
          frame:"frame",painting:"painting",album:"album",
          screen:"video",vinyl:"audio",vitrine:"case",
          bookshelf:"document"
        };
        targetSlot=unitToSlot[m.displayUnit]||m.type;
      }
      if(targetSlot==="voice"||targetSlot==="interview") targetSlot="audio";
      if(targetSlot==="orb") targetSlot="case";
      if(targetSlot==="text") targetSlot="document";
      if(!slotBuckets[targetSlot]) slotBuckets[targetSlot]=[];
      slotBuckets[targetSlot].push(m);
    });

    const pickDisplayed=(slot: string)=>{
      const all=slotBuckets[slot]||[];
      const limit=SLOT_COUNTS[slot]||4;
      const explicit=all.filter((m: any)=>m.displayed===true);
      const unmarked=all.filter((m: any)=>m.displayed===undefined||m.displayed===null);
      const hidden=all.filter((m: any)=>m.displayed===false);
      if(explicit.length>0||hidden.length>0) return explicit.slice(0,limit);
      return unmarked.slice(0,limit);
    };

    const frameMems=pickDisplayed("frame");
    const photoMems=pickDisplayed("photo"); // unassigned photos (no displayUnit)
    const paintingMems=pickDisplayed("painting");
    const albumMems=pickDisplayed("album");
    const videoMems=pickDisplayed("video");
    const orbMems=pickDisplayed("orb");
    const caseMems=pickDisplayed("case");
    const audioMems=pickDisplayed("audio");
    const docMems=pickDisplayed("document");

    // Store ALL video/audio mems (not just displayed) for playlist navigation
    // Playlist filters: use displayUnit first (explicit assignment), then fall back to type
    allVideoMems.current=mems.filter((m: any)=>m.displayUnit==="screen"||(m.type==="video"&&m.displayUnit!=="vinyl"));
    allAudioMems.current=mems.filter((m: any)=>(m.displayUnit==="vinyl"&&m.dataUrl)||((m.type==="audio"||(m.type==="voice")||(m.type==="interview"))&&m.dataUrl&&m.displayUnit!=="screen"));

    // ── PAINTING: large painting above fireplace (or museum grid in exhibition) ──
    if(isExhibition){
      // ═══ PERISTYLIUM: paintings on colonnade back walls ═══
      // Paintings hang on the outer perimeter walls, visible from under the portico.
      // Back wall (z=-rL/2): 6 paintings, split 3+3 to leave center clear for the screen
      // Front wall (z=+rL/2): 4 paintings, split 2+2 to leave center clear for the door
      // Short walls (x=+-rW/2): 4 paintings each, positioned between column projections
      // Total: 6 + 4 + 4 + 4 = 18 slots (slot count remains 20)
      const exPaintings=paintingMems.slice(0,20);
      const paintW=1.6,paintH=1.2,frameDepth=0.12;
      const eyeHeight=2.8; // comfortable eye level for outdoor courtyard
      let paintIdx=0;

      // Redeclare colonnade constants (originally in shell block scope)
      const exPorticoD=3.5, exColSpacingX=3.2, exColSpacingZ=3.4;
      const exCourtInX=rW/2-exPorticoD, exCourtInZ=rL/2-exPorticoD;
      // Column X positions on long walls for collision avoidance
      const colXPositions: number[]=[];
      for(let cx=-rW/2+exPorticoD;cx<=rW/2-exPorticoD;cx+=exColSpacingX) colXPositions.push(cx);
      // Column Z positions on short walls for collision avoidance
      const colZPositions: number[]=[];
      for(let cz=-exCourtInZ+exColSpacingZ;cz<exCourtInZ;cz+=exColSpacingZ) colZPositions.push(cz);

      // Helper: nudge position p away from nearest column if too close
      // Returns adjusted position. dir=1 or -1 indicates preferred nudge direction.
      const nudgeFromColumns=(p: number,colPositions: number[],dir: number,margin=0.7): number=>{
        for(const c of colPositions){
          if(Math.abs(p-c)<margin){
            // Move to clear the margin in the preferred direction
            return c+dir*margin;
          }
        }
        return p;
      };

      // Helper to place a single painting on a wall
      const placePainting=(px: number,py: number,pz: number,facingDir: "x"|"z",facingSign: number)=>{
        const isZ=facingDir==="z";
        // Frame (thick outline + gold inner)
        if(isZ){
          scene.add(mk(new THREE.BoxGeometry(paintW+0.18,paintH+0.18,0.08),MS.fG,px,py,pz-facingSign*0.02));
          scene.add(mk(new THREE.BoxGeometry(paintW+0.04,paintH+0.04,0.02),MS.gold,px,py,pz-facingSign*0.06));
        }else{
          scene.add(mk(new THREE.BoxGeometry(0.08,paintH+0.18,paintW+0.18),MS.fG,px-facingSign*0.02,py,pz));
          scene.add(mk(new THREE.BoxGeometry(0.02,paintH+0.04,paintW+0.04),MS.gold,px-facingSign*0.06,py,pz));
        }
        // Warm spotlight (skip on mobile)
        if(!isMobileGPU()){
        const pSpot=new THREE.SpotLight("#FFF5E0",0.5,5,Math.PI/8,0.5,1.2);
        if(isZ){
          pSpot.position.set(px,rH-0.3,pz+facingSign*1);
          pSpot.target.position.set(px,py,pz);
        }else{
          pSpot.position.set(px+facingSign*1,rH-0.3,pz);
          pSpot.target.position.set(px,py,pz);
        }
        scene.add(pSpot);scene.add(pSpot.target);}
        // Canvas or empty station
        const mem=exPaintings[paintIdx];
        if(mem){
          const tex=paintTex(mem);
          const canvas=new THREE.Mesh(new THREE.PlaneGeometry(paintW,paintH),new THREE.MeshStandardMaterial({map:tex,roughness:0.8}));
          if(isZ){
            canvas.position.set(px,py,pz+facingSign*frameDepth);
            if(facingSign<0) canvas.rotation.y=Math.PI;
          }else{
            canvas.position.set(px+facingSign*frameDepth,py,pz);
            canvas.rotation.y=facingSign>0?-Math.PI/2:Math.PI/2;
          }
          canvas.userData={memory:mem};scene.add(canvas);memMeshes.current.push(canvas);
        }else{
          const emptyMat=new THREE.Mesh(new THREE.PlaneGeometry(paintW-0.1,paintH-0.1),MS.matF);
          if(isZ){
            emptyMat.position.set(px,py,pz+facingSign*frameDepth);
            if(facingSign<0) emptyMat.rotation.y=Math.PI;
          }else{
            emptyMat.position.set(px+facingSign*frameDepth,py,pz);
            emptyMat.rotation.y=facingSign>0?-Math.PI/2:Math.PI/2;
          }
          emptyMat.userData={isStation:true};scene.add(emptyMat);memMeshes.current.push(emptyMat);
        }
        // Small nameplate below painting
        if(isZ){
          scene.add(mk(new THREE.BoxGeometry(0.35,0.05,0.03),MS.bronze,px,py-paintH/2-0.12,pz-facingSign*0.04));
        }else{
          scene.add(mk(new THREE.BoxGeometry(0.03,0.05,0.35),MS.bronze,px-facingSign*0.04,py-paintH/2-0.12,pz));
        }
        paintIdx++;
      };

      // ── Back wall (z=-rL/2): 3 paintings on each side of screen gap ──
      // Screen is centered at x=0, z=-rL/2+0.2 with total frame width ~4.6
      // Place 3 paintings on left side (x < -3) and 3 on right side (x > 3)
      const backWallZ=-rL/2+0.15; // actual back wall surface
      const screenGapHalf=2.8; // half-width of screen reserved zone
      const backSideWidth=rW/2-2-screenGapHalf; // available width per side (~9.2)
      const backPaintingsPerSide=3;
      const backSpacing=backSideWidth/backPaintingsPerSide;
      for(let side=-1;side<=1;side+=2){
        const startX=side>0?screenGapHalf+backSpacing*0.5:-(screenGapHalf+backSpacing*0.5);
        for(let i=0;i<backPaintingsPerSide;i++){
          let px=startX+side*i*backSpacing;
          px=nudgeFromColumns(px,colXPositions,side);
          placePainting(px,eyeHeight,backWallZ,"z",1);
        }
      }

      // ── Front wall (z=+rL/2): 4 paintings, 2 per side of door gap ──
      // Door centered at x=0 extends ~x=-1.5 to +1.5; windows at x=+-10
      // Place 2 paintings per side, avoiding door center and window positions
      const frontWallZ=rL/2-0.15; // actual front wall surface
      const doorGapHalf=2.0; // reserved zone for door
      const frontSideWidth=rW/2-2-doorGapHalf; // available width per side (~11)
      const frontPaintingsPerSide=2;
      const frontSpacing=frontSideWidth/frontPaintingsPerSide;
      for(let side=-1;side<=1;side+=2){
        const startX=side>0?doorGapHalf+frontSpacing*0.5:-(doorGapHalf+frontSpacing*0.5);
        for(let i=0;i<frontPaintingsPerSide;i++){
          let px=startX+side*i*frontSpacing;
          px=nudgeFromColumns(px,colXPositions,side);
          // Avoid window positions (x=+-10) — wider margin to prevent frame overlap
          if(Math.abs(Math.abs(px)-10)<1.8){px+=side*2.0;}
          placePainting(px,eyeHeight,frontWallZ,"z",-1);
        }
      }

      // Short walls: 4 paintings each (x = +-rW/2), positioned between columns
      // Columns on short walls at z: [-5.6, -2.2, 1.2, 4.6, 8.0]
      // Place paintings in midpoints between adjacent columns for even spacing
      const shortWallPaintings=4;
      for(let wall=-1;wall<=1;wall+=2){
        const wX=wall*(-rW/2+0.15);
        // Compute midpoints between column z-positions for optimal placement
        const sortedColZ=[...colZPositions].sort((a,b)=>a-b);
        // Add wall endpoints for first/last gaps
        const allZ=[-exCourtInZ,...sortedColZ,exCourtInZ];
        // Pick the widest gaps for paintings
        const gaps: {mid: number,width: number}[]=[];
        for(let gi=0;gi<allZ.length-1;gi++){
          gaps.push({mid:(allZ[gi]+allZ[gi+1])/2,width:allZ[gi+1]-allZ[gi]});
        }
        gaps.sort((a,b)=>b.width-a.width);
        // Take the 4 widest gaps
        const paintingZs=gaps.slice(0,shortWallPaintings).map(g=>g.mid).sort((a,b)=>a-b);
        for(const pz of paintingZs){
          placePainting(wX,eyeHeight,pz,"x",-wall);
        }
      }
    }else{
    // Priority: explicit painting assignment > unassigned photo fallback
    const bigPaintMem=paintingMems.length>0?paintingMems[0]:photoMems.length>0?photoMems[0]:null;
    const bigPaintUsedPhoto=paintingMems.length===0&&photoMems.length>0;// track if we borrowed an unassigned photo
    if(bigPaintMem){
      // Frame only shown when there's actual content
      scene.add(mk(new THREE.BoxGeometry(1.8,1.3,.1),MS.fG,fpX,2.4,fpZ+.02));
      scene.add(mk(new THREE.BoxGeometry(1.65,1.15,.02),MS.gold,fpX,2.4,fpZ+.08));
      if(!isMobileGPU()){const fpSp=new THREE.SpotLight("#FFF5E0",.8,5,Math.PI/7,.5,1.2);fpSp.position.set(fpX,rH-.2,fpZ+.5);fpSp.target.position.set(fpX,2.4,fpZ);scene.add(fpSp);scene.add(fpSp.target);}
      const om=bigPaintMem;const t=paintTex(om);
      const omc=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.1),new THREE.MeshStandardMaterial({map:t,roughness:.8}));
      omc.position.set(fpX,2.4,fpZ+.12);omc.userData={memory:om};scene.add(omc);memMeshes.current.push(omc);
    }else if((actualRoomId||roomId)==="ro1"){
      // "Me, Over Time" placeholder — ornate frame with personalised title
      scene.add(mk(new THREE.BoxGeometry(1.8,1.3,.1),MS.fG,fpX,2.4,fpZ+.02));
      scene.add(mk(new THREE.BoxGeometry(1.65,1.15,.02),MS.gold,fpX,2.4,fpZ+.08));
      if(!isMobileGPU()){const fpSp2=new THREE.SpotLight("#FFF5E0",.6,5,Math.PI/7,.5,1.2);fpSp2.position.set(fpX,rH-.2,fpZ+.5);fpSp2.target.position.set(fpX,2.4,fpZ);scene.add(fpSp2);scene.add(fpSp2.target);}
      const cvs=document.createElement("canvas");cvs.width=512;cvs.height=352;
      const ctx=cvs.getContext("2d")!;
      ctx.fillStyle="#F5F0E6";ctx.fillRect(0,0,512,352);
      for(let i=0;i<800;i++){ctx.fillStyle=`rgba(180,160,130,${Math.random()*0.04})`;ctx.fillRect(Math.random()*512,Math.random()*352,2,2);}
      ctx.textAlign="center";ctx.textBaseline="middle";
      const displayName=userName||"Your";
      const now=new Date();const month=now.toLocaleString("en",{month:"long"});const year=now.getFullYear();
      ctx.fillStyle="#8B7355";ctx.font="italic 22px Georgia, serif";
      ctx.fillText(t("paintingTitle",{name:displayName}),256,150);
      ctx.fillStyle="#A09889";ctx.font="italic 16px Georgia, serif";
      ctx.fillText(t("paintingDate",{date:`${month} ${year}`}),256,195);
      ctx.strokeStyle="#C8B898";ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(160,225);ctx.lineTo(352,225);ctx.stroke();
      const tex=new THREE.CanvasTexture(cvs);tex.colorSpace=THREE.SRGBColorSpace;
      const placeholderMat=new THREE.MeshStandardMaterial({map:tex,roughness:.85});
      const phMesh=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.1),placeholderMat);
      phMesh.position.set(fpX,2.4,fpZ+.12);phMesh.userData={isUploadPainting:true};scene.add(phMesh);hitAreaMeshes.current.push(phMesh);
    }

    // ── PHOTO FRAMES: small fireplace frame ──
    // Priority: explicit frame assignment > remaining unassigned photos
    const framePhoto=frameMems.length>0?frameMems[0]:(bigPaintUsedPhoto?photoMems.slice(1):photoMems)[0]||null;
    if(framePhoto){const pm=paintTex(framePhoto);const pf=new THREE.Mesh(new THREE.PlaneGeometry(.25,.2),new THREE.MeshStandardMaterial({map:pm,roughness:.8}));pf.position.set(fpX-.5,1.46,fpZ+.18);pf.userData={memory:framePhoto};scene.add(pf);memMeshes.current.push(pf);scene.add(mk(new THREE.BoxGeometry(.32,.27,.04),MS.fB,fpX-.5,1.46,fpZ+.15));}
    // Wall paintings removed — only the big fireplace painting is shown
    } // end !isExhibition painting block

    // ── ALBUM: elegant open photo albums on coffee table ──
    if(!isExhibition){
    const albumCover=new THREE.MeshStandardMaterial({color:"#5A2215",roughness:.45,metalness:.06});
    const albumPage=new THREE.MeshStandardMaterial({color:"#F5F0E8",roughness:.92});
    const albumSpineMat=new THREE.MeshStandardMaterial({color:"#3E1A0E",roughness:.5,metalness:.08});
    albumMems.slice(0,3).forEach((m: any,i: any)=>{
      const t=paintTex(m);
      const ax=-.4+i*.4,ay=.555,az=ctZ;
      const aGrp=new THREE.Group();aGrp.position.set(ax,0,az);
      aGrp.rotation.y=i===1?.08:i===2?-.06:0;
      const albL=new THREE.Mesh(new THREE.BoxGeometry(.22,.018,.30),albumCover);
      albL.position.set(-.12,ay,0);albL.rotation.z=.06;aGrp.add(albL);
      const albR=new THREE.Mesh(new THREE.BoxGeometry(.22,.018,.30),albumCover);
      albR.position.set(.12,ay,0);albR.rotation.z=-.06;aGrp.add(albR);
      const sp=new THREE.Mesh(new THREE.BoxGeometry(.03,.025,.30),albumSpineMat);
      sp.position.set(0,ay+.004,0);aGrp.add(sp);
      const spTrim=mk(new THREE.BoxGeometry(.035,.003,.31),MS.gold,0,ay+.018,0);aGrp.add(spTrim);
      const pages=new THREE.Mesh(new THREE.BoxGeometry(.40,.012,.28),albumPage);
      pages.position.set(0,ay-.008,0);aGrp.add(pages);
      for(let p=0;p<3;p++){
        const fp=new THREE.Mesh(new THREE.PlaneGeometry(.19,.27),albumPage);
        fp.rotation.x=-Math.PI/2;fp.position.set(-.11+p*.005,ay+.010+p*.001,0);aGrp.add(fp);
      }
      const photoMat=new THREE.MeshStandardMaterial({map:t,roughness:.75});
      const pg=new THREE.Mesh(new THREE.PlaneGeometry(.18,.25),photoMat);
      pg.rotation.x=-Math.PI/2+.02;pg.position.set(.11,ay+.016,0);
      pg.userData={memory:m};aGrp.add(pg);memMeshes.current.push(pg);
      const matBorder=new THREE.Mesh(new THREE.PlaneGeometry(.20,.27),albumPage);
      matBorder.rotation.x=-Math.PI/2+.02;matBorder.position.set(.11,ay+.015,0);aGrp.add(matBorder);
      for(const cz of[-.13,.13])for(const cx of[-.22,.22]){
        const corner=mk(new THREE.BoxGeometry(.025,.020,.025),MS.gold,cx*.53,ay+.010,cz);aGrp.add(corner);
      }
      scene.add(aGrp);
    });
    } // end !isExhibition album

    // ═══════════════════════════════════════════
    // BOOKSHELVES (left wall, floor to ceiling)
    // ═══════════════════════════════════════════
    if(!isExhibition){
    const bsX=-rW/2+.35;
    const bookPalette=["#6B1A1A","#1A2744","#2A4A2A","#4A1A2A","#8B6914","#3A2010","#1A3A4A","#5A2A3A","#2A3A1A","#6A4A2A","#3A1A3A","#1A4A3A","#7A3A1A","#2A2A4A","#4A3A1A","#5A1A1A"];
    let bSeed=0;for(const c of (actualRoomId||roomId))bSeed=(bSeed*31+c.charCodeAt(0))>>>0;
    const bRng=()=>{bSeed=(bSeed*16807+1)>>>0;return(bSeed&0x7fffffff)/0x7fffffff;};
    for(let shelf=0;shelf<5;shelf++){
      const sy=.35+shelf*.75;
      scene.add(mk(new THREE.BoxGeometry(.5,.05,rL-2),MS.dkW,bsX,sy,0));
      scene.add(mk(new THREE.BoxGeometry(.52,.02,rL-1.9),MS.ltW,bsX,sy+.025,0));
      let bz=-rL/2+1.2;const shelfEnd=rL/2-1.2;
      while(bz<shelfEnd){
        if(bRng()<.08){
          scene.add(mk(new THREE.BoxGeometry(.18,.22,.02),MS.bronze,bsX+.1,sy+.03+.11,bz));
          scene.add(mk(new THREE.BoxGeometry(.12,.02,.1),MS.bronze,bsX+.1,sy+.03+.01,bz+.04));
          bz+=.08;continue;
        }
        if(bRng()<.05){bz+=.06+bRng()*.08;continue;}
        const bh=.22+bRng()*.3;
        const bw2=.05+bRng()*.05;
        const bd=.18+bRng()*.1;
        const tilt=(bRng()-.5)*.06;
        const ci=Math.floor(bRng()*bookPalette.length);
        const baseColor=bookPalette[ci];
        const bookMat=new THREE.MeshStandardMaterial({color:baseColor,roughness:.7+bRng()*.2,metalness:.02});
        const book=mk(new THREE.BoxGeometry(bw2,bh,bd),bookMat,bsX+.08,sy+.03+bh/2,bz);
        book.rotation.z=tilt;scene.add(book);
        const bands=bRng()<.6?1:2;
        for(let bn=0;bn<bands;bn++){
          const bandY=sy+.03+bh*(bn===0?.35:.7);
          const bandH=.015+bRng()*.01;
          scene.add(mk(new THREE.BoxGeometry(bw2+.003,bandH,bd*.7),MS.gold,bsX+.08+bw2*.02,bandY,bz));
        }
        if(bRng()<.4){
          const dotY=sy+.03+bh*.55;
          scene.add(mk(new THREE.BoxGeometry(bw2+.004,.025,.03),MS.gold,bsX+.08+bw2*.02,dotY,bz));
        }
        if(bRng()<.12){book.position.x+=.03;}
        bz+=bw2+.005+bRng()*.01;
      }
    }
    scene.add(mk(new THREE.BoxGeometry(.55,rH-.2,.06),MS.dkW,bsX,rH/2,-rL/2+.1));
    scene.add(mk(new THREE.BoxGeometry(.55,rH-.2,.06),MS.dkW,bsX,rH/2,rL/2-.1));
    scene.add(mk(new THREE.BoxGeometry(.55,.06,rL-.1),MS.dkW,bsX,rH-.1,0));
    scene.add(mk(new THREE.BoxGeometry(.06,rH-.2,rL-.1),MS.dkW,bsX-.23,rH/2,0));
    scene.add(mk(new THREE.BoxGeometry(.6,.04,rL-.05),MS.gold,bsX,rH-.06,0));
    scene.add(mk(new THREE.BoxGeometry(.58,.02,rL-.08),MS.ltW,bsX,rH-.02,0));
    docMems.slice(0,5).forEach((m: any,i: any)=>{
      const sy=.35+((i+1)%5)*.75;const bz=-rL/2+1.5+i*((rL-3)/5);
      const spine=new THREE.Mesh(new THREE.BoxGeometry(.12,.4,.22),new THREE.MeshStandardMaterial({color:`hsl(${m.hue},${m.s}%,${m.l}%)`,roughness:.6,metalness:.05}));
      spine.position.set(bsX+.15,sy+.23,bz);spine.userData={memory:m};scene.add(spine);memMeshes.current.push(spine);
      scene.add(mk(new THREE.BoxGeometry(.13,.06,.05),MS.gold,bsX+.15,sy+.25,bz+.09));
    });
    const bsHit=new THREE.Mesh(new THREE.BoxGeometry(.6,rH-.5,rL-2),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    bsHit.position.set(bsX,rH/2,0);
    bsHit.userData=docMems.length>0?{memory:docMems[0],isHitArea:true}:{isStation:true};
    scene.add(bsHit);hitAreaMeshes.current.push(bsHit);
    } // end !isExhibition bookshelf

    // ═══════════════════════════════════════════
    // CINEMA SCREEN (right wall)
    // ═══════════════════════════════════════════
    // Peristylium: screen centered on back wall (z=-rL/2), paintings split to left/right sides
    // Screen sits at eye level on the clear center section of the back wall
    const scrX=isExhibition?0:rW/2-.2;
    const scrZ=isExhibition?-rL/2+0.2:0;
    const scrY=isExhibition?3.2:2.2;
    const scrPlaneW=isExhibition?3.2:2.8, scrPlaneH=isExhibition?1.8:1.8;
    if(isExhibition){
      // Elegant marble-framed screen niche on back wall center — paintings are split 3+3 around it
      // Dark backing panel
      scene.add(mk(new THREE.BoxGeometry(scrPlaneW+0.4,scrPlaneH+0.4,0.1),MS.screen,scrX,scrY,scrZ));
      // Marble frame elements
      scene.add(mk(new THREE.BoxGeometry(scrPlaneW+0.8,0.14,0.18),MS.marble,scrX,scrY+scrPlaneH/2+0.15,scrZ)); // top cornice
      scene.add(mk(new THREE.BoxGeometry(scrPlaneW+0.6,0.06,0.14),MS.gold,scrX,scrY+scrPlaneH/2+0.26,scrZ)); // gilded cornice cap
      scene.add(mk(new THREE.BoxGeometry(scrPlaneW+0.8,0.10,0.18),MS.marble,scrX,scrY-scrPlaneH/2-0.12,scrZ)); // bottom ledge
      for(const sx of [-1,1]){
        // Fluted pilaster sides
        scene.add(mk(new THREE.BoxGeometry(0.14,scrPlaneH+0.5,0.14),MS.marble,scrX+sx*(scrPlaneW/2+0.28),scrY,scrZ));
        // Small capitals on pilasters
        scene.add(mk(new THREE.BoxGeometry(0.22,0.08,0.22),MS.marble,scrX+sx*(scrPlaneW/2+0.28),scrY+scrPlaneH/2+0.08,scrZ));
      }
      // Warm accent light on screen
      const scrAccent=new THREE.SpotLight("#FFF5E0",0.4,6,Math.PI/6,0.5,1.2);
      scrAccent.position.set(scrX,rH-0.3,scrZ+1.5);scrAccent.target.position.set(scrX,scrY,scrZ);
      scene.add(scrAccent);scene.add(scrAccent.target);
    }else{
      scene.add(mk(new THREE.BoxGeometry(.08,2,3),MS.screen,scrX,scrY,scrZ));
      scene.add(mk(new THREE.BoxGeometry(.04,.15,.15),MS.iron,scrX,1.15,scrZ));
    }
    if(videoMems.length>0){
      const vc=document.createElement("canvas");vc.width=384;vc.height=256;
      const vctx=vc.getContext("2d")!;
      // Initialize canvas to black to avoid green screen flash
      vctx.fillStyle="#1A1510";vctx.fillRect(0,0,384,256);
      const vtex=new THREE.CanvasTexture(vc);vtex.colorSpace=THREE.SRGBColorSpace;
      const scrMesh=new THREE.Mesh(new THREE.PlaneGeometry(scrPlaneW,scrPlaneH),new THREE.MeshBasicMaterial({map:vtex}));
      if(isExhibition){scrMesh.position.set(scrX,scrY,scrZ+0.06);}
      else{scrMesh.rotation.y=-Math.PI/2;scrMesh.position.set(scrX-.06,scrY,scrZ);}
      scrMesh.userData={memory:videoMems[0]};
      scrMeshRef.current=scrMesh;
      scene.add(scrMesh);memMeshes.current.push(scrMesh);
      let videoEl: HTMLVideoElement|null=null,screenImg: HTMLImageElement|null=null;
      const vm=videoMems[0];
      if(vm.dataUrl){
        // Type flags take priority over URL extension (dataUrl may be a thumbnail)
        const isVidSrc=vm.videoBlob||vm.type==="video"||/\.(mp4|webm|mov|avi|mkv|m4v)/i.test(vm.dataUrl)||vm.dataUrl.startsWith("data:video/");
        if(isVidSrc){
          videoEl=document.createElement("video");
          videoEl.loop=true;videoEl.playsInline=true;videoEl.volume=1;
          videoEl.preload="auto";
          // Some browsers won't decode an unattached media element reliably — attach hidden.
          videoEl.style.position="fixed";videoEl.style.left="-9999px";videoEl.style.top="-9999px";
          videoEl.style.width="1px";videoEl.style.height="1px";videoEl.style.opacity="0";
          videoEl.style.pointerEvents="none";
          (videoEl as any).setAttribute("playsinline","");
          document.body.appendChild(videoEl);
          // Draw loading frame on canvas with title
          vctx.fillStyle="#1A1510";vctx.fillRect(0,0,384,256);
          vctx.fillStyle="rgba(255,255,255,.3)";vctx.font="16px Georgia,serif";vctx.textAlign="center";
          vctx.fillText(t("loadingVideo"),192,128);vtex.needsUpdate=true;
          // Start paused — first frame renders as thumbnail, user presses play.
          // Leave muted initially so the browser will allow initial decode; the play
          // button unmutes on user gesture.
          videoEl.muted=true;
          videoEl.oncanplay=()=>{vtex.needsUpdate=true;};
          videoEl.oncanplaythrough=()=>{vtex.needsUpdate=true;};
          videoEl.onloadeddata=()=>{vtex.needsUpdate=true;};
          videoEl.onloadedmetadata=()=>{vtex.needsUpdate=true;};
          // Auto-recover from network errors / stalled streams — reload source once.
          let videoReloaded=false;
          videoEl.onerror=()=>{
            const ve=videoElRef.current;
            if(ve&&!videoReloaded&&ve.src){videoReloaded=true;const s=ve.src;ve.src="";ve.src=s;ve.load();ve.muted=true;ve.play().catch(()=>{});}
          };
          videoEl.onstalled=()=>{
            const ve=videoElRef.current;
            // If stalled with no usable data, reload
            if(ve&&ve.readyState<2&&!videoReloaded&&ve.src){videoReloaded=true;const s=ve.src;ve.src="";ve.src=s;ve.load();ve.muted=true;ve.play().catch(()=>{});}
          };
          // Use ?stream=1 for same-origin (avoids tainted canvas). Range requests supported for seeking.
          const vidSrc=vm.dataUrl.startsWith("/api/media/")?vm.dataUrl+(vm.dataUrl.includes("?")?"&":"?")+"stream=1":vm.dataUrl;
          videoEl.src=vidSrc;
          try{videoEl.load();}catch{}
          // Muted autoplay is allowed by browsers — triggers frame decode so
          // readyState reaches 2+ and the animation loop can draw to canvas.
          videoEl.play().catch(()=>{});
          videoElRef.current=videoEl;
        }else{
          const si=new Image();si.onload=()=>{screenImg=si;};si.crossOrigin="anonymous";si.src=vm.dataUrl;
        }
      }
      const vidEntry={type:"video",canvas:vc,ctx:vctx,tex:vtex,mem:vm,w:384,h:256,phase:Math.random()*100,screenImg:()=>screenImg,videoEl:()=>videoEl};
      animTex.push(vidEntry);
      vidAnimEntry.current=vidEntry;
      if(!isMobileGPU()){const scrGl=new THREE.PointLight(`hsl(${vm.hue},40%,60%)`,isExhibition?.3:.15,isExhibition?8:4);scrGl.position.set(isExhibition?scrX:scrX-.5,scrY,isExhibition?scrZ+1:scrZ);scene.add(scrGl);}
    }else{
      const idleC=document.createElement("canvas");idleC.width=384;idleC.height=256;const ic=idleC.getContext("2d")!;
      ic.fillStyle="#1A1A1A";ic.fillRect(0,0,384,256);ic.fillStyle="#333";ic.font="24px Georgia,serif";ic.textAlign="center";ic.fillText(t("noVideos"),192,128);
      const idleTex=new THREE.CanvasTexture(idleC);idleTex.colorSpace=THREE.SRGBColorSpace;
      const idleMesh=new THREE.Mesh(new THREE.PlaneGeometry(scrPlaneW,scrPlaneH),new THREE.MeshBasicMaterial({map:idleTex}));
      if(isExhibition){idleMesh.position.set(scrX,scrY,scrZ+0.06);}
      else{idleMesh.rotation.y=-Math.PI/2;idleMesh.position.set(scrX-.06,scrY,scrZ);}
      idleMesh.userData={isStation:true};scene.add(idleMesh);memMeshes.current.push(idleMesh);
    }

    // ═══════════════════════════════════════════
    // VINYL RECORD PLAYER (right wall, near front)
    // ═══════════════════════════════════════════
    const vpX=rW/2-1.5,vpZ=rL/2-2;
    let vinylAudio: HTMLAudioElement|null=null;
    if(!isExhibition){
    scene.add(mk(new THREE.BoxGeometry(.8,.04,.6),MS.dkW,vpX,.78,vpZ));
    for(let vl=-1;vl<=1;vl+=2)for(let vlz=-1;vlz<=1;vlz+=2)scene.add(mk(new THREE.CylinderGeometry(.03,.03,.75,6),MS.dkW,vpX+vl*.3,.38,vpZ+vlz*.22));
    scene.add(mk(new THREE.BoxGeometry(.55,.08,.45),MS.ltW,vpX,.84,vpZ));
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.01,24),MS.vinyl);disc.position.set(vpX-.05,.89,vpZ);scene.add(disc);
    const discLabel=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.012,16),MS.vinylL);discLabel.position.set(vpX-.05,.895,vpZ);scene.add(discLabel);
    animTex.push({type:"disc",mesh:disc,label:discLabel});
    const arm=mk(new THREE.BoxGeometry(.18,.015,.02),MS.bronze,vpX+.12,.9,vpZ-.05);arm.rotation.y=-.3;scene.add(arm);
    audioMems.slice(0,3).forEach((m: any,i: any)=>{
      const recTex=paintTex(m);
      const rec=new THREE.Mesh(new THREE.PlaneGeometry(.3,.3),new THREE.MeshStandardMaterial({map:recTex,roughness:.6}));
      rec.position.set(vpX+.5,.15+i*.01,vpZ-.3+i*.12);rec.rotation.z=.1+i*.05;rec.rotation.y=-Math.PI/4;
      rec.userData={memory:m};scene.add(rec);memMeshes.current.push(rec);
      scene.add(mk(new THREE.BoxGeometry(.32,.32,.015),new THREE.MeshStandardMaterial({color:`hsl(${m.hue},${m.s}%,${Math.max(20,m.l-20)}%)`,roughness:.5}),vpX+.5,.15+i*.01,vpZ-.3+i*.12));
    });
    const vpHit=new THREE.Mesh(new THREE.BoxGeometry(1.2,.5,1),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    vpHit.position.set(vpX,.85,vpZ);
    vpHit.userData=audioMems.length>0?{memory:audioMems[0],isHitArea:true}:{isStation:true};
    vpHitRef.current=vpHit;
    scene.add(vpHit);hitAreaMeshes.current.push(vpHit);
    if(audioMems.length>0&&audioMems[0].dataUrl){
      vinylAudio=document.createElement("audio");
      vinylAudio.src=audioMems[0].dataUrl;vinylAudio.loop=true;vinylAudio.volume=1;
      audioElRef.current=vinylAudio;
    }
    } // end !isExhibition vinyl

    // ═══════════════════════════════════════════
    // VITRINE / GLASS DISPLAY CASE (left of fireplace, against back wall)
    // ═══════════════════════════════════════════
    if(!isExhibition){
    const vtX=-rW/2+2, vtZ=-rL/2+0.7;
    const vtW=1.4, vtD=0.7, vtBaseH=0.55, vtGlassH=1.0;
    const vtBrassMat=new THREE.MeshStandardMaterial({color:"#B8963E",roughness:.22,metalness:.7});
    const vtVelvet=new THREE.MeshStandardMaterial({color:"#1A0A2E",roughness:.95,metalness:0});
    scene.add(mk(new THREE.BoxGeometry(vtW+.08,.06,vtD+.08),MS.dkW,vtX,.03,vtZ));
    for(const sx of [-1,1])for(const sz of [-1,1]){
      scene.add(mk(new THREE.SphereGeometry(.05,8,8),vtBrassMat,vtX+sx*(vtW/2-.06),.06,vtZ+sz*(vtD/2-.06)));
    }
    scene.add(mk(new THREE.BoxGeometry(vtW,vtBaseH-.06,vtD),MS.dkW,vtX,.06+(vtBaseH-.06)/2,vtZ));
    scene.add(mk(new THREE.BoxGeometry(vtW-.12,.03,.01),vtBrassMat,vtX,vtBaseH*.55,vtZ+vtD/2+.005));
    for(const sx of [-1,1]){
      scene.add(mk(new THREE.BoxGeometry(.03,vtBaseH-.12,.03),vtBrassMat,vtX+sx*(vtW/2-.02),vtBaseH/2,vtZ+vtD/2-.02));
    }
    scene.add(mk(new THREE.BoxGeometry(vtW-.2,vtBaseH-.2,.015),new THREE.MeshStandardMaterial({color:"#4A3520",roughness:.45,metalness:.1}),vtX,vtBaseH/2,vtZ+vtD/2+.005));
    scene.add(mk(new THREE.SphereGeometry(.025,8,8),vtBrassMat,vtX,vtBaseH*.45,vtZ+vtD/2+.02));
    scene.add(mk(new THREE.BoxGeometry(vtW+.06,.04,vtD+.06),MS.dkW,vtX,vtBaseH,vtZ));
    scene.add(mk(new THREE.BoxGeometry(vtW+.1,.015,vtD+.1),vtBrassMat,vtX,vtBaseH+.02,vtZ));
    scene.add(mk(new THREE.BoxGeometry(vtW-.06,.01,vtD-.06),vtVelvet,vtX,vtBaseH+.03,vtZ));
    const vtGBot=vtBaseH+.04;
    const vtGlassMat=mkPhys(THREE,{color:"#E0EEF0",transparent:true,opacity:.07,roughness:.02,metalness:.03,transmission:.94,ior:1.5,thickness:.3,side:THREE.DoubleSide});
    const vtMidY=vtGBot+vtGlassH*.5;
    scene.add(mk(new THREE.BoxGeometry(vtW-.1,.012,vtD-.1),mkPhys(THREE,{color:"#E8F4F4",transparent:true,opacity:.1,roughness:.01,metalness:0,transmission:.95,ior:1.5,thickness:.15}),vtX,vtMidY,vtZ));
    const vtTopY=vtGBot+vtGlassH;
    scene.add(mk(new THREE.BoxGeometry(vtW+.04,.05,vtD+.04),MS.dkW,vtX,vtTopY,vtZ));
    scene.add(mk(new THREE.BoxGeometry(vtW+.08,.015,vtD+.08),vtBrassMat,vtX,vtTopY+.025,vtZ));
    scene.add(mk(new THREE.BoxGeometry(vtW+.12,.02,vtD+.12),MS.dkW,vtX,vtTopY+.04,vtZ));
    const glassF=new THREE.Mesh(new THREE.PlaneGeometry(vtW-.1,vtGlassH-.04),vtGlassMat);glassF.position.set(vtX,vtGBot+vtGlassH/2,vtZ+vtD/2-.03);glassF.raycast=()=>{};scene.add(glassF);
    const glassB=new THREE.Mesh(new THREE.PlaneGeometry(vtW-.1,vtGlassH-.04),vtGlassMat);glassB.position.set(vtX,vtGBot+vtGlassH/2,vtZ-vtD/2+.03);glassB.rotation.y=Math.PI;glassB.raycast=()=>{};scene.add(glassB);
    const glassL=new THREE.Mesh(new THREE.PlaneGeometry(vtD-.1,vtGlassH-.04),vtGlassMat);glassL.rotation.y=Math.PI/2;glassL.position.set(vtX-vtW/2+.03,vtGBot+vtGlassH/2,vtZ);glassL.raycast=()=>{};scene.add(glassL);
    const glassR=new THREE.Mesh(new THREE.PlaneGeometry(vtD-.1,vtGlassH-.04),vtGlassMat);glassR.rotation.y=-Math.PI/2;glassR.position.set(vtX+vtW/2-.03,vtGBot+vtGlassH/2,vtZ);glassR.raycast=()=>{};scene.add(glassR);
    for(const sx of [-1,1])for(const sz of [-1,1]){
      scene.add(mk(new THREE.BoxGeometry(.03,vtGlassH,.03),vtBrassMat,vtX+sx*(vtW/2-.02),vtGBot+vtGlassH/2,vtZ+sz*(vtD/2-.02)));
      scene.add(mk(new THREE.SphereGeometry(.025,8,8),vtBrassMat,vtX+sx*(vtW/2-.02),vtTopY+.065,vtZ+sz*(vtD/2-.02)));
    }
    scene.add(mk(new THREE.BoxGeometry(vtW,.02,.025),vtBrassMat,vtX,vtTopY-.01,vtZ+vtD/2-.015));
    scene.add(mk(new THREE.BoxGeometry(vtW,.02,.025),vtBrassMat,vtX,vtTopY-.01,vtZ-vtD/2+.015));
    scene.add(mk(new THREE.BoxGeometry(.025,.02,vtD),vtBrassMat,vtX-vtW/2+.015,vtTopY-.01,vtZ));
    scene.add(mk(new THREE.BoxGeometry(.025,.02,vtD),vtBrassMat,vtX+vtW/2-.015,vtTopY-.01,vtZ));
    scene.add(mk(new THREE.BoxGeometry(vtW,.02,.025),vtBrassMat,vtX,vtGBot+.01,vtZ+vtD/2-.015));
    scene.add(mk(new THREE.BoxGeometry(vtW,.02,.025),vtBrassMat,vtX,vtGBot+.01,vtZ-vtD/2+.015));
    if(!isMobileGPU()){const vtLight=new THREE.PointLight("#FFF5E0",.8,3);vtLight.position.set(vtX,vtTopY-.06,vtZ);scene.add(vtLight);
    const vtLight2=new THREE.PointLight("#FFF0D0",.4,1.5);vtLight2.position.set(vtX,vtMidY-.05,vtZ);scene.add(vtLight2);}
    caseMems.slice(0,3).forEach((m: any,i: any)=>{
      const recTex=paintTex(m);
      const rec=new THREE.Mesh(new THREE.PlaneGeometry(.45,.45),new THREE.MeshStandardMaterial({map:recTex,roughness:.4,metalness:.05}));
      rec.position.set(vtX-.4+i*.4,vtGBot+vtGlassH*.35,vtZ+.05);rec.rotation.y=.1-i*.1;
      rec.userData={memory:m};scene.add(rec);memMeshes.current.push(rec);
    });
    const vtHit=new THREE.Mesh(new THREE.BoxGeometry(vtW,vtBaseH+vtGlassH,vtD),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    vtHit.position.set(vtX,(vtBaseH+vtGlassH)/2,vtZ);
    vtHit.userData=caseMems.length>0?{memory:caseMems[0],isHitArea:true}:{isStation:true};
    scene.add(vtHit);hitAreaMeshes.current.push(vtHit);
    } // end !isExhibition vitrine

    // ═══════════════════════════════════════════
    // SCRIBE DESK — document memories as scrolls/papers on desk
    // ═══════════════════════════════════════════
    if(!isExhibition){
    const scribeMems=docMems.slice(5,8);
    const albumOverflow=albumMems.slice(3,5);
    const deskItems=[...scribeMems,...albumOverflow];
    deskItems.slice(0,3).forEach((m: any,i: any)=>{
      const t=paintTex(m);
      const paper=new THREE.Mesh(new THREE.PlaneGeometry(.28,.36),new THREE.MeshStandardMaterial({map:t,roughness:.85}));
      paper.rotation.x=-Math.PI/2+.02;paper.rotation.z=(i-1)*.15;
      paper.position.set(dkX-.3+i*.35,.82,dkZ-.05);paper.userData={memory:m};scene.add(paper);memMeshes.current.push(paper);
    });
    const dkHit=new THREE.Mesh(new THREE.BoxGeometry(1.6,.3,.75),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    dkHit.position.set(dkX,.85,dkZ);
    dkHit.userData=deskItems.length>0?{memory:deskItems[0],isHitArea:true}:{isStation:true};
    scene.add(dkHit);hitAreaMeshes.current.push(dkHit);
    } // end !isExhibition scribe desk

    // ═══════════════════════════════════════════
    // RUG (center of seating area)
    // ═══════════════════════════════════════════
    if(!isExhibition){
    const rugZ=(sofaZ+fpZ)/2+.2;
    if(layout.rugStyle==="persian"){
    scene.add(mk(new THREE.BoxGeometry(4,.012,3),MS.rug,0,.006,rugZ));
    }else{
    const rr=Math.min(rW,rL)*0.2;
    scene.add(mk(new THREE.CylinderGeometry(rr,rr,.012,24),MS.rug,0,.006,rugZ));
    }
    } // end !isExhibition rug

    // ═══════════════════════════════════════════
    // TABLE LAMPS
    // ═══════════════════════════════════════════
    if(!isExhibition){
    for(const[lx,lz] of [[rW/2-1.5,-rL/2+1.5]]){
      scene.add(mk(new THREE.CylinderGeometry(.2,.25,.6,8),MS.dkW,lx,.3,lz));
      scene.add(mk(new THREE.CylinderGeometry(.28,.28,.04,10),MS.gold,lx,.62,lz));
      scene.add(mk(new THREE.CylinderGeometry(.04,.06,.4,6),MS.bronze,lx,.82,lz));
      const shade=mk(new THREE.CylinderGeometry(.08,.14,.2,8,1,true),MS.lamp,lx,1.1,lz);scene.add(shade);
      if(!isMobileGPU()){const lampL=new THREE.PointLight("#FFE8C0",.35,4);lampL.position.set(lx,1.2,lz);scene.add(lampL);}
      const halo=new THREE.Mesh(new THREE.SphereGeometry(.25,8,8),MS.lampG);halo.position.set(lx,1.1,lz);scene.add(halo);
    }
    } // end !isExhibition table lamps

    // ═══════════════════════════════════════════
    // WALL SCONCES
    // ═══════════════════════════════════════════
    const sconceH=isExhibition?3.5:3; // peristylium: wall-mounted oil lamps
    if(isExhibition){
      // ═══ PERISTYLIUM: Roman oil lamp sconces on perimeter walls ═══
      // Sconces are placed high (3.5m) above painting eye height (2.8m) to avoid overlap.
      // Back wall: 4 sconces, 2 per side — skipping center screen zone (|x| < 3)
      // Front wall: 6 sconces evenly spaced
      // Short walls: 2 sconces each, between the 3 paintings
      const addSconce=(sx2: number,sz2: number,dir: number)=>{
        // Wall bracket (bronze arm with rosette)
        scene.add(mk(new THREE.BoxGeometry(.08,.12,.08),MS.bronze,sx2,sconceH,sz2));
        scene.add(mk(new THREE.CylinderGeometry(.05,.05,.02,8),MS.gold,sx2,sconceH-.08,sz2)); // rosette
        // Oil lamp bowl
        scene.add(mk(new THREE.CylinderGeometry(.06,.04,.05,8),MS.bronze,sx2,sconceH+.12,sz2+dir*0.04));
        // Flame
        const fl3=new THREE.Mesh(new THREE.SphereGeometry(.025,5,5),MS.glassG);fl3.position.set(sx2,sconceH+.18,sz2+dir*0.04);scene.add(fl3);
        if(!isMobileGPU()){const sl3=new THREE.PointLight("#FFE0B0",.15,3.5);sl3.position.set(sx2,sconceH+.1,sz2+dir*0.15);scene.add(sl3);}
      };
      // Back wall sconces (z=-rL/2): skip center screen zone (|x|<3)
      for(const bsx of [-10,-5,5,10]){
        addSconce(bsx,-rL/2+0.06,1);
      }
      // Front wall sconces (z=+rL/2): skip center door zone (|x|<2.5)
      for(const fsx of [-10,-5.5,5.5,10]){
        addSconce(fsx,rL/2-0.06,-1);
      }
      // Short wall sconces: 3 per wall, evenly spaced between paintings
      for(let s=-1;s<=1;s+=2){
        for(const fsz of[-6,0,6]){
          const sx3=s*(-rW/2+0.06);
          scene.add(mk(new THREE.BoxGeometry(.08,.12,.08),MS.bronze,sx3,sconceH,fsz));
          scene.add(mk(new THREE.CylinderGeometry(.05,.05,.02,8),MS.gold,sx3,sconceH-.08,fsz));
          scene.add(mk(new THREE.CylinderGeometry(.06,.04,.05,8),MS.bronze,sx3+s*0.04,sconceH+.12,fsz));
          const fl4=new THREE.Mesh(new THREE.SphereGeometry(.025,5,5),MS.glassG);fl4.position.set(sx3+s*0.04,sconceH+.18,fsz);scene.add(fl4);
          if(!isMobileGPU()){const sl4=new THREE.PointLight("#FFE0B0",.12,3);sl4.position.set(sx3+s*0.12,sconceH+.1,fsz);scene.add(sl4);}
        }
      }
      // Sunlight pouring into the open courtyard — bright directional fill
      if(!isMobileGPU()){const courtyardSun=new THREE.DirectionalLight("#FFF5E0",0.8);
      courtyardSun.position.set(5,rH+6,-3);courtyardSun.target.position.set(0,0,0);
      scene.add(courtyardSun);scene.add(courtyardSun.target);}
      // Warm ambient uplighting from courtyard floor
      if(!isMobileGPU()){const courtAmbient=new THREE.PointLight("#FFE8D0",0.3,15);courtAmbient.position.set(0,1,0);scene.add(courtAmbient);}
    }else{
    for(let s=-1;s<=1;s+=2){
      for(const sz of[-2,2]){
        scene.add(mk(new THREE.BoxGeometry(.07,.15,.07),MS.sconce,s*(rW/2-.04),sconceH,sz));
        scene.add(mk(new THREE.CylinderGeometry(.045,.03,.07,6),MS.sconce,s*(rW/2-.08),sconceH+.15,sz));
        const bl=new THREE.Mesh(new THREE.SphereGeometry(.03,6,6),MS.glassG);bl.position.set(s*(rW/2-.08),sconceH+.22,sz);scene.add(bl);
        if(!isMobileGPU()){const sl=new THREE.PointLight("#FFE0B0",.2,3);sl.position.set(s*(rW/2-.15),sconceH+.1,sz);scene.add(sl);}
      }
    }
    if(layout.extraSconces){
      for(const sx of[-2,2]){
        scene.add(mk(new THREE.BoxGeometry(.07,.15,.07),MS.sconce,sx,sconceH,-rL/2+.04));
        scene.add(mk(new THREE.CylinderGeometry(.045,.03,.07,6),MS.sconce,sx,sconceH+.15,-rL/2+.08));
        const bl2=new THREE.Mesh(new THREE.SphereGeometry(.03,6,6),MS.glassG);bl2.position.set(sx,sconceH+.22,-rL/2+.08);scene.add(bl2);
        if(!isMobileGPU()){const sl2=new THREE.PointLight("#FFE0B0",.15,3);sl2.position.set(sx,sconceH+.1,-rL/2+.15);scene.add(sl2);}
      }
    }
    } // end sconce block

    // ═══════════════════════════════════════════
    // WINDOWS
    // ═══════════════════════════════════════════
    // Peristylium (exhibition) is an outdoor scene — no windows needed
    const winPositions: [number,number][]=isExhibition
      ?[]
      :layout.windowCount===2
      ?[[rW/2-2,-rL/2+.01],[-rW/2+2,-rL/2+.01]]
      :[[rW/2-2,-rL/2+.01]];
    for(const[winX,winZ] of winPositions){
      // Windows on back wall (z<0) face inward (+z), on front wall (z>0) face inward (-z)
      const wDir=winZ>0?-1:1; // inward direction multiplier
      {
      const winH=2.6;
      // Sky/light visible through window opening
      scene.add(mk(new THREE.PlaneGeometry(1.1,1.8),new THREE.MeshBasicMaterial({color:dlPreset.fogColor}),winX,winH,winZ+wDir*.01));
      // Bright daylight glow overlay
      scene.add(mk(new THREE.PlaneGeometry(1.1,1.8),new THREE.MeshBasicMaterial({color:dlPreset.sunColor,transparent:true,opacity:.45*dlPreset.sunIntensity}),winX,winH,winZ+wDir*.015));
      // Window frame
      scene.add(mk(new THREE.BoxGeometry(1.5,.12,.12),MS.trim,winX,winH+.95,winZ+wDir*.04));// top
      scene.add(mk(new THREE.BoxGeometry(1.5,.12,.12),MS.trim,winX,winH-.95,winZ+wDir*.04));// bottom
      scene.add(mk(new THREE.BoxGeometry(.12,2,.12),MS.trim,winX-.68,winH,winZ+wDir*.04));// left
      scene.add(mk(new THREE.BoxGeometry(.12,2,.12),MS.trim,winX+.68,winH,winZ+wDir*.04));// right
      scene.add(mk(new THREE.BoxGeometry(.06,1.8,.08),MS.dkW,winX,winH,winZ+wDir*.03));// center divider
      scene.add(mk(new THREE.BoxGeometry(1.1,.06,.08),MS.dkW,winX,winH,winZ+wDir*.03));// cross bar
      // Curtains
      const c1=new THREE.Mesh(new THREE.PlaneGeometry(.45,2.2),MS.curtain);c1.position.set(winX-.85,winH,winZ+wDir*.06);scene.add(c1);
      const c2=new THREE.Mesh(new THREE.PlaneGeometry(.45,2.2),MS.curtain);c2.position.set(winX+.85,winH,winZ+wDir*.06);scene.add(c2);
      // Strong directional light through window
      if(!isMobileGPU()){const winSp=new THREE.SpotLight(dlPreset.sunColor,.8*dlPreset.sunIntensity,12,Math.PI/4,.5,1.2);winSp.position.set(winX,winH+.4,winZ+wDir*.5);winSp.target.position.set(winX,.5,winZ+wDir*3);scene.add(winSp);scene.add(winSp.target);}
      // Light shaft particles effect (warm glow on floor)
      const shaftGeo=new THREE.PlaneGeometry(1.5,4);const shaftMat=new THREE.MeshBasicMaterial({color:dlPreset.sunColor,transparent:true,opacity:.06*dlPreset.sunIntensity});
      const shaft=new THREE.Mesh(shaftGeo,shaftMat);shaft.position.set(winX,1.5,winZ+wDir*2);shaft.rotation.x=wDir*(-.6);scene.add(shaft);
      }
    }

    // ═══════════════════════════════════════════
    // PLANTS
    // ═══════════════════════════════════════════
    const allCorners: [number,number][]=[[-rW/2+.8,-rL/2+.8],[rW/2-.8,-rL/2+.8],[-rW/2+.8,rL/2-.8],[rW/2-.8,rL/2-.8]];
    for(const ci of layout.plantCorners){
      if(ci>=allCorners.length)continue;
      const[px2,pz2]=allCorners[ci];
      scene.add(mk(new THREE.CylinderGeometry(.12,.16,.28,8),MS.pot,px2,.14,pz2));
      for(let lf=0;lf<6;lf++){const a=(lf/6)*Math.PI*2;const leaf=new THREE.Mesh(new THREE.SphereGeometry(.08+Math.random()*.04,5,5),lf%2?MS.plant:new THREE.MeshStandardMaterial({color:"#385828",roughness:.8}));leaf.position.set(px2+Math.cos(a)*.08,.35+Math.random()*.15,pz2+Math.sin(a)*.08);leaf.scale.y=.5;scene.add(leaf);}
      scene.add(mk(new THREE.SphereGeometry(.12,6,6),MS.plant,px2,.5,pz2));
    }

    // ═══════════════════════════════════════════
    // EXHIBITION: museum benches + decorative columns
    // ═══════════════════════════════════════════
    if(isExhibition){
      // ═══ PERISTYLIUM: additional courtyard ornaments ═══

      // ── Mosaic floor detail: Greek key / meander pattern border around impluvium ──
      for(let s=-1;s<=1;s+=2){
        for(let mx=-3;mx<=3;mx++){
          const keyMat=mx%2===0?MS.bronze:MS.marble;
          scene.add(mk(new THREE.BoxGeometry(0.3,0.005,0.12),keyMat,mx*0.55,0.012,s*2.8));
          scene.add(mk(new THREE.BoxGeometry(0.12,0.005,0.3),keyMat,s*3.5,0.012,mx*0.55));
        }
      }

      // ── Terracotta urns along portico walkways ──
      // Positioned in portico areas away from columns and screen/door centers
      const urnPositions: [number,number][]=[
        [-rW/2+1.5,-6],[-rW/2+1.5,0],[-rW/2+1.5,6],  // left portico (3 urns)
        [rW/2-1.5,-6],[rW/2-1.5,0],[rW/2-1.5,6],      // right portico (3 urns)
        [-7,-rL/2+1.5],[7,-rL/2+1.5],                   // back portico, flanking screen
        [-5,rL/2-1.5],[5,rL/2-1.5],                      // front portico, flanking door
      ];
      for(const[ux,uz] of urnPositions){
        // Elegant amphora on a stone base
        scene.add(mk(new THREE.BoxGeometry(0.4,0.06,0.4),MS.marble,ux,0.03,uz)); // stone base
        scene.add(mk(new THREE.CylinderGeometry(0.15,0.18,0.5,8),MS.pot,ux,0.31,uz));
        scene.add(mk(new THREE.CylinderGeometry(0.18,0.12,0.15,8),MS.pot,ux,0.64,uz));
        scene.add(mk(new THREE.CylinderGeometry(0.08,0.15,0.1,8),MS.pot,ux,0.68,uz));
        // Trailing vine with more leaves
        for(let lf=0;lf<6;lf++){
          const la=lf*Math.PI/3;
          scene.add(mk(new THREE.SphereGeometry(0.05,5,5),MS.plant,ux+Math.cos(la)*0.16,0.72+Math.sin(lf)*0.04,uz+Math.sin(la)*0.16));
        }
      }

      // ── Sundial on a pedestal (offset to avoid fountain) ──
      const sdX=3, sdZ=-3;
      scene.add(mk(new THREE.BoxGeometry(0.5,0.06,0.5),MS.marble,sdX,0.03,sdZ)); // base slab
      scene.add(mk(new THREE.CylinderGeometry(0.2,0.25,0.5,8),MS.marble,sdX,0.31,sdZ)); // pedestal
      scene.add(mk(new THREE.CylinderGeometry(0.3,0.3,0.04,12),MS.marble,sdX,0.58,sdZ)); // dial face
      // Hour lines etched on dial
      for(let hi=0;hi<12;hi++){
        const ha=hi*Math.PI/6;
        scene.add(mk(new THREE.BoxGeometry(0.01,0.005,0.18),MS.bronze,sdX+Math.cos(ha)*0.08,0.605,sdZ+Math.sin(ha)*0.08));
      }
      scene.add(mk(new THREE.BoxGeometry(0.02,0.18,0.02),MS.bronze,sdX,0.69,sdZ)); // gnomon

      // ── Stone viewing benches in the portico (for contemplating paintings) ──
      // Two benches on each long side portico, positioned between columns
      for(let s=-1;s<=1;s+=2){
        for(const bx of [-6,6]){
          const benchZ=s*(rL/2-1.8);
          // Bench slab
          scene.add(mk(new THREE.BoxGeometry(2.2,0.08,0.45),MS.marble,bx,0.42,benchZ));
          // Bench legs (stone plinths)
          for(const blx of [-0.85,0.85]){
            scene.add(mk(new THREE.BoxGeometry(0.18,0.38,0.45),MS.marble,bx+blx,0.19,benchZ));
          }
          // Scrollwork on bench ends
          for(const blx of [-0.85,0.85]){
            scene.add(mk(new THREE.CylinderGeometry(0.06,0.06,0.42,8),MS.marble,bx+blx,0.42,benchZ));
          }
        }
      }
      // Additional benches along side porticos (facing inward)
      for(let s=-1;s<=1;s+=2){
        const benchX=s*(rW/2-1.8);
        scene.add(mk(new THREE.BoxGeometry(0.45,0.08,2.2),MS.marble,benchX,0.42,0));
        for(const blz of [-0.85,0.85]){
          scene.add(mk(new THREE.BoxGeometry(0.45,0.38,0.18),MS.marble,benchX,0.19,blz));
        }
      }

      // ── Garland swags between columns (rope draped festoons) ──
      // Redeclare colonnade layout constants for this scope
      const garPorticoD=3.5, garColSpacingX=3.2, garEntabH=0.7;
      const garCourtInX=rW/2-garPorticoD, garCourtInZ=rL/2-garPorticoD;
      // Long sides (z=+-courtInZ)
      for(let s=-1;s<=1;s+=2){
        const gz=s*garCourtInZ;
        const colXsOnSide: number[]=[];
        for(let cx=-rW/2+garPorticoD;cx<=rW/2-garPorticoD;cx+=garColSpacingX) colXsOnSide.push(cx);
        for(let gi=0;gi<colXsOnSide.length-1;gi++){
          const gx1=colXsOnSide[gi], gx2=colXsOnSide[gi+1];
          const gmx=(gx1+gx2)/2;
          // Garland drape (center hangs lower)
          scene.add(mk(new THREE.CylinderGeometry(0.015,0.015,gx2-gx1-0.6,4),MS.plant,gmx,rH-garEntabH-0.3,gz));
          // The drape cylinder is horizontal
          const garland=scene.children[scene.children.length-1];
          garland.rotation.z=Math.PI/2;
          // Small leaf clusters at drape points
          scene.add(mk(new THREE.SphereGeometry(0.04,5,5),MS.plant,gx1+0.3,rH-garEntabH-0.15,gz));
          scene.add(mk(new THREE.SphereGeometry(0.04,5,5),MS.plant,gx2-0.3,rH-garEntabH-0.15,gz));
        }
      }
      // Short sides (x=+-courtInX) — garlands between columns on short walls
      const garColSpacingZ=3.4;
      for(let s=-1;s<=1;s+=2){
        const gx=s*garCourtInX;
        const colZsOnSide: number[]=[];
        for(let cz=-garCourtInZ+garColSpacingZ;cz<garCourtInZ;cz+=garColSpacingZ) colZsOnSide.push(cz);
        for(let gi=0;gi<colZsOnSide.length-1;gi++){
          const gz1=colZsOnSide[gi], gz2=colZsOnSide[gi+1];
          const gmz=(gz1+gz2)/2;
          const garland2=mk(new THREE.CylinderGeometry(0.015,0.015,gz2-gz1-0.6,4),MS.plant,gx,rH-garEntabH-0.3,gmz);
          garland2.rotation.x=Math.PI/2;scene.add(garland2);
          scene.add(mk(new THREE.SphereGeometry(0.04,5,5),MS.plant,gx,rH-garEntabH-0.15,gz1+0.3));
          scene.add(mk(new THREE.SphereGeometry(0.04,5,5),MS.plant,gx,rH-garEntabH-0.15,gz2-0.3));
        }
      }

      // ── Decorative wall niches with small busts on back wall ──
      // Placed above the screen, on the back wall between screen and roof
      for(const nx of [-8,8]){
        // Arched niche recess
        scene.add(mk(new THREE.BoxGeometry(0.6,0.8,0.08),new THREE.MeshStandardMaterial({color:"#C8B8A0",roughness:.7}),nx,4.8,-rL/2+0.04));
        // Small bust in niche
        scene.add(mk(new THREE.CylinderGeometry(0.08,0.12,0.3,8),MS.marble,nx,4.55,-rL/2+0.08));
        scene.add(mk(new THREE.SphereGeometry(0.08,10,10),MS.marble,nx,4.82,-rL/2+0.08));
      }
    }

    // ═══════════════════════════════════════════
    // OPTIONAL: READING CHAIR (wingback by fireplace)
    // ═══════════════════════════════════════════
    if(layout.readingChair){
    const rcX=-rW/2+2,rcZ=fpZ+2;
    scene.add(mk(new THREE.BoxGeometry(1,.3,.85),MS.leather,rcX,.15,rcZ));
    scene.add(mk(new THREE.BoxGeometry(1,.7,.1),MS.leatherD,rcX,.55,rcZ+.38));
    for(let ws=-1;ws<=1;ws+=2)scene.add(mk(new THREE.BoxGeometry(.08,.5,.4),MS.leatherD,rcX+ws*.48,.45,rcZ+.2));
    for(let lx of[-1,1])for(let lz of[-1,1])scene.add(mk(new THREE.SphereGeometry(.035,6,6),MS.dkW,rcX+lx*.4,.05,rcZ+lz*.35));
    for(let bx2=-1;bx2<=1;bx2++)for(let by2=0;by2<3;by2++){scene.add(mk(new THREE.SphereGeometry(.015,6,6),MS.button,rcX+bx2*.25,.4+by2*.18,rcZ+.42));}
    }

    // ═══════════════════════════════════════════
    // CHRISTMAS TREE — special decoration for Christmas Traditions room
    // ═══════════════════════════════════════════
    if(currentRoomName.toLowerCase().includes("christmas")&&!isExhibition){
      const txX=-rW/2+1.8,txZ=-rL/2+1.8;
      // ── Elegant tree stand — turned walnut base with brass rim ──
      scene.add(mk(new THREE.CylinderGeometry(.35,.4,.08,16),MS.dkW,txX,.04,txZ));
      scene.add(mk(new THREE.CylinderGeometry(.37,.37,.02,16),MS.gold,txX,.08,txZ));
      // Trunk — tapered, natural
      scene.add(mk(new THREE.CylinderGeometry(.06,.09,0.55,6),new THREE.MeshStandardMaterial({color:"#5A3A20",roughness:.9}),txX,.35,txZ));
      // ── Foliage — 4 layered tiers, high-poly cones for fullness ──
      const fol=new THREE.MeshStandardMaterial({color:"#1B4D1B",roughness:.92,metalness:0,emissive:"#0A1F0A",emissiveIntensity:.05});
      const folD=new THREE.MeshStandardMaterial({color:"#163F16",roughness:.95,metalness:0,emissive:"#081808",emissiveIntensity:.04});
      scene.add(mk(new THREE.ConeGeometry(.95,1.1,12),fol,txX,.95,txZ));
      scene.add(mk(new THREE.ConeGeometry(.78,1.0,12),folD,txX,1.6,txZ));
      scene.add(mk(new THREE.ConeGeometry(.58,.85,12),fol,txX,2.15,txZ));
      scene.add(mk(new THREE.ConeGeometry(.35,.7,10),folD,txX,2.65,txZ));
      // ── Star topper — faceted crystal with warm glow ──
      const starMat=new THREE.MeshStandardMaterial({color:"#F0D060",emissive:"#F0D060",emissiveIntensity:.6,metalness:.95,roughness:.1});
      const star=new THREE.Mesh(new THREE.OctahedronGeometry(.1,0),starMat);
      star.position.set(txX,3.08,txZ);star.rotation.y=Math.PI/4;scene.add(star);
      // Subtle star light halo
      let starLight: THREE.PointLight|null=null;
      if(!isMobileGPU()){starLight=new THREE.PointLight("#FFF0C0",.6,4);starLight.position.set(txX,3.1,txZ);scene.add(starLight);}
      // ── Ornaments — matte glass baubles, muted palette ──
      const ornDefs=[
        {c:"#8B1A1A",e:"#5A1010",tier:0},{c:"#C8A858",e:"#8A7030",tier:0},{c:"#8B1A1A",e:"#5A1010",tier:0},
        {c:"#E8D5B0",e:"#A09070",tier:1},{c:"#C8A858",e:"#8A7030",tier:1},{c:"#8B1A1A",e:"#5A1010",tier:1},
        {c:"#E8D5B0",e:"#A09070",tier:2},{c:"#C8A858",e:"#8A7030",tier:2},
      ];
      ornDefs.forEach((o,i)=>{
        const a=(i/ornDefs.length)*Math.PI*2+i*.4;
        const baseY=[.75,1.45,2.05][o.tier];
        const r2=[.75,.55,.38][o.tier];
        const oy=baseY+.2+Math.sin(i*1.7)*.15;
        const ox=txX+Math.cos(a)*r2,oz=txZ+Math.sin(a)*r2;
        const mat=new THREE.MeshStandardMaterial({color:o.c,emissive:o.e,emissiveIntensity:.15,metalness:.4,roughness:.35});
        scene.add(mk(new THREE.SphereGeometry(.045,10,10),mat,ox,oy,oz));
      });
      // ── Thin gold tinsel lines spiraling up ──
      const tinselMat=new THREE.MeshStandardMaterial({color:"#D4AF37",emissive:"#B8922E",emissiveIntensity:.2,metalness:.85,roughness:.15});
      for(let ti=0;ti<24;ti++){
        const frac=ti/24;const ty=.6+frac*2.2;
        const tr=.85-frac*.55;const ta=frac*Math.PI*6;
        scene.add(mk(new THREE.SphereGeometry(.012,4,4),tinselMat,txX+Math.cos(ta)*tr,ty,txZ+Math.sin(ta)*tr));
      }
      // ── Presents under the tree ──
      const presentMat1=new THREE.MeshStandardMaterial({color:"#8B1A1A",roughness:.7});
      const presentMat2=new THREE.MeshStandardMaterial({color:"#1B4D3E",roughness:.7});
      const ribbonMat=new THREE.MeshStandardMaterial({color:"#D4AF37",metalness:.7,roughness:.2});
      // Present 1 — small square
      scene.add(mk(new THREE.BoxGeometry(.28,.22,.28),presentMat1,txX+.35,.11,txZ+.3));
      scene.add(mk(new THREE.BoxGeometry(.3,.02,.04),ribbonMat,txX+.35,.22,txZ+.3));
      scene.add(mk(new THREE.BoxGeometry(.04,.02,.3),ribbonMat,txX+.35,.22,txZ+.3));
      // Present 2 — wider box
      scene.add(mk(new THREE.BoxGeometry(.38,.16,.26),presentMat2,txX-.3,.08,txZ+.45));
      scene.add(mk(new THREE.BoxGeometry(.4,.02,.04),ribbonMat,txX-.3,.16,txZ+.45));
      scene.add(mk(new THREE.BoxGeometry(.04,.02,.28),ribbonMat,txX-.3,.16,txZ+.45));
      // Present 3 — tiny
      scene.add(mk(new THREE.BoxGeometry(.18,.14,.18),presentMat1,txX+.08,.07,txZ+.5));
      scene.add(mk(new THREE.BoxGeometry(.2,.02,.03),ribbonMat,txX+.08,.14,txZ+.5));
      // ── Warm ambient glow — like the tree is lit from within ──
      let treeLight: THREE.PointLight|null=null;
      if(!isMobileGPU()){treeLight=new THREE.PointLight("#FFE0A0",.8,6);treeLight.position.set(txX,1.5,txZ);scene.add(treeLight);
      const treeLight2=new THREE.PointLight("#FFF5D0",.4,4);treeLight2.position.set(txX,2.5,txZ);scene.add(treeLight2);}
      animTex.push({type:"xmasTree" as any,mesh:star as any,light:treeLight,star:starLight as any,x:txX,z:txZ});
    }

    // ═══════════════════════════════════════════
    // OPTIONAL: GLOBE (decorative, near desk)
    // ═══════════════════════════════════════════
    if(layout.globe){
    const glX=dkX+1.2,glZ=dkZ;
    scene.add(mk(new THREE.CylinderGeometry(.03,.06,.7,8),MS.dkW,glX,.35,glZ));
    scene.add(mk(new THREE.CylinderGeometry(.18,.18,.02,12),MS.dkW,glX,.72,glZ));
    const globe=new THREE.Mesh(new THREE.SphereGeometry(.2,16,12),new THREE.MeshStandardMaterial({color:"#6A8A6A",roughness:.6,metalness:.1}));globe.position.set(glX,.98,glZ);scene.add(globe);
    scene.add(mk(new THREE.TorusGeometry(.21,.008,8,24),MS.gold,glX,.98,glZ));
    animTex.push({type:"globe",mesh:globe});
    }

    // ═══════════════════════════════════════════
    // OPTIONAL: GRAND PIANO (near front-right)
    // ═══════════════════════════════════════════
    if(layout.piano){
    const piX=rW/2-3,piZ=-rL/2+3.5; // back-right area, away from sofa
    scene.add(mk(new THREE.BoxGeometry(1.6,.08,2.2),MS.iron,piX,.82,piZ));
    scene.add(mk(new THREE.BoxGeometry(1.6,.6,.08),MS.iron,piX,.48,piZ-1.05));
    scene.add(mk(new THREE.BoxGeometry(.08,.6,2.2),MS.iron,piX-.78,.48,piZ));
    scene.add(mk(new THREE.BoxGeometry(.08,.6,2),MS.iron,piX+.78,.48,piZ+.08));
    scene.add(mk(new THREE.BoxGeometry(.7,.6,.08),MS.iron,piX+.44,.48,piZ+1.08));
    for(const[plx,plz] of [[piX-.6,piZ-.85],[piX+.6,piZ-.85],[piX,piZ+.85]])scene.add(mk(new THREE.CylinderGeometry(.035,.045,.75,8),MS.iron,plx,.38,plz));
    scene.add(mk(new THREE.BoxGeometry(1.3,.02,.1),MS.marble,piX,.85,piZ-.95));
    for(let k2=0;k2<7;k2++){if(k2===2||k2===5)continue;scene.add(mk(new THREE.BoxGeometry(.05,.02,.06),MS.iron,piX-.45+k2*.14,.865,piZ-.93));}
    const lid=mk(new THREE.BoxGeometry(1.5,.04,1),MS.iron,piX,.82+.7,piZ+.3);lid.rotation.x=-.45;scene.add(lid);
    scene.add(mk(new THREE.CylinderGeometry(.008,.008,.5,4),MS.gold,piX,.82+.35,piZ+.05));
    scene.add(mk(new THREE.BoxGeometry(.8,.04,.3),MS.leatherD,piX,.46,piZ-1.5));
    for(const bxp of[-1,1])for(const bzp of[-1,1])scene.add(mk(new THREE.CylinderGeometry(.02,.02,.43,6),MS.dkW,piX+bxp*.3,.23,piZ-1.5+bzp*.1));
    }

    // ═══════════════════════════════════════════
    // ORBS: floating spheres
    // ═══════════════════════════════════════════
    orbMems.forEach((m: any,i: any)=>{
      const ox=-2+i*2,oy=1.5+Math.random()*.5,oz=rL/2-2-i;
      let orbMat;
      if(m.dataUrl){const orbTex=paintTex(m);orbMat=new THREE.MeshStandardMaterial({map:orbTex,emissive:`hsl(${m.hue},${m.s}%,${m.l-15}%)`,emissiveIntensity:.3,transparent:true,opacity:.9,roughness:.15,metalness:.15});}
      else{orbMat=new THREE.MeshStandardMaterial({color:`hsl(${m.hue},${m.s}%,${m.l}%)`,emissive:`hsl(${m.hue},${m.s}%,${m.l-15}%)`,emissiveIntensity:.4,transparent:true,opacity:.85,roughness:.1,metalness:.2});}
      const sphere=new THREE.Mesh(new THREE.SphereGeometry(.16,14,14),orbMat);sphere.position.set(ox,oy,oz);sphere.userData={memory:m};scene.add(sphere);memMeshes.current.push(sphere);
      const inner=new THREE.Mesh(new THREE.SphereGeometry(.08,10,10),new THREE.MeshBasicMaterial({color:`hsl(${m.hue},${m.s+10}%,${m.l+15}%)`,transparent:true,opacity:.5}));inner.position.set(ox,oy,oz);scene.add(inner);
      let ol: THREE.PointLight|null=null;
      if(!isMobileGPU()){ol=new THREE.PointLight(`hsl(${m.hue},${m.s}%,${m.l}%)`,.3,2.5);ol.position.set(ox,oy,oz);scene.add(ol);}
      animTex.push({type:"orb",mesh:sphere,inner,light:ol,baseY:oy,phase:Math.random()*Math.PI*2});
    });

    // ═══════════════════════════════════════════
    // GRAND BACK-DOOR PORTAL (ornate double doors)
    // Wall runs along X at z=rL/2, so door width=X, depth=Z
    // ═══════════════════════════════════════════
    const bdZ=rL/2-.1;
    const bdMat=new THREE.MeshStandardMaterial({color:"#4A3018",roughness:.42,metalness:.06});
    const bdPanel=new THREE.MeshStandardMaterial({color:"#5C3D22",roughness:.5,metalness:.04});
    const bdAccent=new THREE.MeshStandardMaterial({color:wing?.accent||"#C8A868",roughness:.28,metalness:.55});
    // Outer stone architrave (wide in X, thin in Z)
    scene.add(mk(new THREE.BoxGeometry(2.2,3.6,.18),MS.marble,0,1.8,bdZ));
    // Inner wood surround
    scene.add(mk(new THREE.BoxGeometry(2,3.4,.14),MS.trim,0,1.7,bdZ));
    // Left door (wide in X=0.85, thin in Z)
    scene.add(mk(new THREE.BoxGeometry(0.85,3,.1),bdMat,-.43,1.5,bdZ));
    // Right door
    scene.add(mk(new THREE.BoxGeometry(0.85,3,.1),bdMat,.43,1.5,bdZ));
    // Horizontal bar between doors and transom
    scene.add(mk(new THREE.BoxGeometry(1.8,.02,.12),MS.iron,0,3.02,bdZ));
    // Raised panels — left door (3 panels)
    for(const py of [.7,1.5,2.4]){
      scene.add(mk(new THREE.BoxGeometry(.55,.5,.02),bdPanel,-.43,py,bdZ-.06));
      scene.add(mk(new THREE.BoxGeometry(.6,.55,.005),MS.gold,-.43,py,bdZ-.07));
    }
    // Raised panels — right door (3 panels)
    for(const py of [.7,1.5,2.4]){
      scene.add(mk(new THREE.BoxGeometry(.55,.5,.02),bdPanel,.43,py,bdZ-.06));
      scene.add(mk(new THREE.BoxGeometry(.6,.55,.005),MS.gold,.43,py,bdZ-.07));
    }
    // Cornice / pediment above door
    scene.add(mk(new THREE.BoxGeometry(2.4,.16,.22),MS.marble,0,3.46,bdZ));
    scene.add(mk(new THREE.BoxGeometry(2.5,.08,.18),MS.gold,0,3.56,bdZ));
    // Decorative keystone
    scene.add(mk(new THREE.BoxGeometry(.3,.28,.16),MS.marble,0,3.3,bdZ));
    scene.add(mk(new THREE.BoxGeometry(.22,.22,.12),bdAccent,0,3.32,bdZ-.01));
    // Pilasters (columns) flanking door
    for(const s of [-1,1]){
      const px=s*1.15;
      scene.add(mk(new THREE.CylinderGeometry(.08,.1,3.2,8),MS.marble,px,1.6,bdZ));
      scene.add(mk(new THREE.BoxGeometry(.28,.1,.28),MS.gold,px,3.22,bdZ));
      scene.add(mk(new THREE.BoxGeometry(.24,.06,.24),MS.marble,px,3.28,bdZ));
      scene.add(mk(new THREE.BoxGeometry(.24,.12,.24),MS.marble,px,.06,bdZ));
    }
    // Door handles — ornate lever style (offset in X, protruding in Z)
    for(const s of [-1,1]){
      const hx=s*.35;
      scene.add(mk(new THREE.BoxGeometry(.04,.04,.04),bdAccent,hx,1.5,bdZ-.08));// rosette
      const shaft=mk(new THREE.CylinderGeometry(.015,.015,.12,6),bdAccent,hx,1.5,bdZ-.1);
      shaft.rotation.x=Math.PI/2;scene.add(shaft);// shaft protruding towards camera
      scene.add(mk(new THREE.BoxGeometry(.08,.015,.015),bdAccent,hx,1.48,bdZ-.14));// lever hanging down
    }
    // Transom arch glow (semicircular light above doors, facing into room)
    const tranGeo=new THREE.CircleGeometry(.6,16,0,Math.PI);
    const tranMat=new THREE.MeshBasicMaterial({color:dlPreset.sunColor,transparent:true,opacity:.15*dlPreset.sunIntensity});
    const transom=new THREE.Mesh(tranGeo,tranMat);
    transom.rotation.y=Math.PI;// face into room (towards -Z)
    transom.position.set(0,3.02,bdZ-.02);scene.add(transom);
    // Warm light spilling from corridor
    const bdGlow=new THREE.Mesh(new THREE.PlaneGeometry(2.4,3.8),new THREE.MeshBasicMaterial({color:dlPreset.sunColor,transparent:true,opacity:.04*dlPreset.sunIntensity}));
    bdGlow.position.set(0,1.9,bdZ);scene.add(bdGlow);
    animTex.push({type:"doorGlow",mesh:bdGlow});
    const bdLight=new THREE.SpotLight("#FFE0B0",.5,6,Math.PI/5,.6,1);
    bdLight.position.set(0,2.5,bdZ-.5);bdLight.target.position.set(0,1,bdZ-2);scene.add(bdLight);scene.add(bdLight.target);
    const bdAmbient=new THREE.PointLight("#FFE8C0",.25,4);bdAmbient.position.set(0,2,bdZ-.3);scene.add(bdAmbient);
    // Label
    const bdLabel=document.createElement("canvas");bdLabel.width=280;bdLabel.height=50;
    const blc=bdLabel.getContext("2d")!;
    blc.fillStyle=wing?.accent||"#C8A868";blc.font="bold 16px Georgia,serif";blc.textAlign="center";
    blc.fillText(t("backToCorridor"),140,32);
    const blTex=new THREE.CanvasTexture(bdLabel);blTex.colorSpace=THREE.SRGBColorSpace;
    const bdLabelMesh=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.25),new THREE.MeshBasicMaterial({map:blTex,transparent:true}));
    bdLabelMesh.rotation.y=Math.PI;bdLabelMesh.position.set(0,3.75,bdZ-.02);scene.add(bdLabelMesh);
    // Hit area
    const bdHit=new THREE.Mesh(new THREE.BoxGeometry(2,3.4,.3),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    bdHit.position.set(0,1.7,bdZ);bdHit.userData={isBackDoor:true};scene.add(bdHit);
    memMeshes.current.push(bdHit);

    // Golden dust
    const rdN=isExhibition?180:70,rdG=new THREE.BufferGeometry(),rdP=new Float32Array(rdN*3);
    for(let i=0;i<rdN;i++){rdP[i*3]=(Math.random()-.5)*rW;rdP[i*3+1]=.5+Math.random()*rH;rdP[i*3+2]=(Math.random()-.5)*rL;}
    rdG.setAttribute("position",new THREE.BufferAttribute(rdP,3));
    scene.add(new THREE.Points(rdG,new THREE.PointsMaterial({color:dlPreset.sunColor,size:.03,transparent:true,opacity:.25*dlPreset.sunIntensity,blending:THREE.AdditiveBlending,depthWrite:false})));

    const camY=isExhibition?2.1:2.0;
    const camZ=initialCameraZ!=null?initialCameraZ:isExhibition?rL/2-4:rL/2-2.5;
    pos.current.set(0,camY,camZ);posT.current.set(0,camY,camZ);
    lookT.current={yaw:0,pitch:0};lookA.current={yaw:0,pitch:0};

    // ── DUST PARTICLES ──
    const dust=createDustParticles({count:isExhibition?250:100,bounds:{x:rW/2-.5,y:rH/2,z:rL/2-.5},center:new THREE.Vector3(0,rH/2,0),opacity:0.25,size:isExhibition?0.035:0.025});
    scene.add(dust.points);

    // ── Optimize: deduplicate materials to reduce GPU state changes ──
    optimizeMaterials(scene);

    const clock=new THREE.Clock();
    const _isMobile=window.innerWidth<768||window.innerHeight<500;
    let _frameCount=0;
    let _cinStep=-1;
    const animate=()=>{
      if(!alive)return;
      frameRef.current=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),t=clock.getElapsedTime();_frameCount++;
      lookA.current.yaw+=(lookT.current.yaw-lookA.current.yaw)*.08;lookA.current.pitch+=(lookT.current.pitch-lookA.current.pitch)*.08;
      // ── Onboarding cinematic: multi-step waypoint sequence ──
      // On mobile, each step gets +0.5s extra for readability
      if (onboardingModeRef.current) {
        const ot = clock.getElapsedTime();
        const d=isMobileProp?0.5:0;
        if(ot<=1.0+d){
          // Step 0: look down
          if(_cinStep!==0){_cinStep=0;onCinematicStepRef.current?.(0);}
          const p=Math.min(ot/(1.0+d),1);const ease=p*p*(3-2*p);
          lookT.current.yaw=0;lookT.current.pitch=-0.3390*ease;
        }else if(ot<=2.5+d*2){
          // Step 1: pause looking down
          if(_cinStep!==1){_cinStep=1;onCinematicStepRef.current?.(1);}
          lookT.current.pitch=-0.3390;
        }else if(ot<=4.5+d*3){
          // Step 2: look right
          if(_cinStep!==2){_cinStep=2;onCinematicStepRef.current?.(2);}
          const dur=2.0+d;const p=Math.min((ot-(2.5+d*2))/dur,1);const ease=p*p*(3-2*p);
          lookT.current.yaw=1.3020*ease;
          lookT.current.pitch=-0.3390+(-0.0540-(-0.3390))*ease;
        }else if(ot<=7.0+d*4){
          // Step 3: pause looking right
          if(_cinStep!==3){_cinStep=3;onCinematicStepRef.current?.(3);}
          lookT.current.yaw=1.3020;lookT.current.pitch=-0.0540;
        }else if(ot<=11.0+d*5){
          // Step 4: look left
          if(_cinStep!==4){_cinStep=4;onCinematicStepRef.current?.(4);}
          const dur=4.0+d;const p=Math.min((ot-(7.0+d*4))/dur,1);const ease=p*p*(3-2*p);
          lookT.current.yaw=1.3020+(-1.2720-1.3020)*ease;
          lookT.current.pitch=-0.0540+(-0.1290-(-0.0540))*ease;
        }else if(ot<=13.5+d*6){
          // Step 5: pause looking left
          if(_cinStep!==5){_cinStep=5;onCinematicStepRef.current?.(5);}
          lookT.current.yaw=-1.2720;lookT.current.pitch=-0.1290;
        }else if(ot<=15.5+d*7){
          // Step 6: look straight
          if(_cinStep!==6){_cinStep=6;onCinematicStepRef.current?.(6);}
          const dur=2.0+d;const p=Math.min((ot-(13.5+d*6))/dur,1);const ease=p*p*(3-2*p);
          lookT.current.yaw=-1.2720*(1-ease);
          lookT.current.pitch=-0.1290*(1-ease);
        }else if(ot<=16.0+d*8){
          // Step 7: brief pause
          if(_cinStep!==7){_cinStep=7;onCinematicStepRef.current?.(7);}
          lookT.current.yaw=0;lookT.current.pitch=0;
        }else if(ot<=18.0+d*9){
          // Step 8: walk forward to painting
          if(_cinStep!==8){_cinStep=8;onCinematicStepRef.current?.(8);}
          const dur=2.0+d;const p=Math.min((ot-(16.0+d*8))/dur,1);const ease=p*p*(3-2*p);
          posT.current.z=2.0+(-1.5-2.0)*ease;
          lookT.current.yaw=0;lookT.current.pitch=0;
        }else{
          // Step 9: waiting for painting click
          if(_cinStep!==9){_cinStep=9;onCinematicStepRef.current?.(9);}
          posT.current.z=-1.5;lookT.current.yaw=0;lookT.current.pitch=0;
        }
        // Skip normal movement when in onboarding mode
      } else {
      const spd=(keys.current["shift"]?7.5:2.5)*dt;_dir.current.set(0,0,0);
      const k=keys.current;
      if(k["w"]||k["arrowup"])_dir.current.z-=1;if(k["s"]||k["arrowdown"])_dir.current.z+=1;
      if(k["a"]||k["arrowleft"])_dir.current.x-=1;if(k["d"]||k["arrowright"])_dir.current.x+=1;
      if(_dir.current.length()>0){_dir.current.normalize().multiplyScalar(spd);_dir.current.applyAxisAngle(_yAxis.current,-lookA.current.yaw);posT.current.add(_dir.current);}
      posT.current.x=Math.max(-rW/2+1,Math.min(rW/2-1,posT.current.x));posT.current.z=Math.max(-rL/2+1,Math.min(rL/2-1.5,posT.current.z));
      }
      pos.current.lerp(posT.current,.1);camera.position.copy(pos.current);
      _ld.current.set(Math.sin(lookA.current.yaw)*Math.cos(lookA.current.pitch),Math.sin(lookA.current.pitch),-Math.cos(lookA.current.yaw)*Math.cos(lookA.current.pitch));
      _lookTarget.current.copy(camera.position).add(_ld.current);camera.lookAt(_lookTarget.current);
      // ── Camera debug overlay ──
      if (camDebugRef.current) {
        camDebugRef.current.textContent = `yaw: ${lookA.current.yaw.toFixed(4)}\npitch: ${lookA.current.pitch.toFixed(4)}\npos: ${pos.current.x.toFixed(1)}, ${pos.current.y.toFixed(1)}, ${pos.current.z.toFixed(1)}`;
      }
      animTex.forEach(a=>{
        if(a.type==="fire"){a.light.intensity=.5+Math.sin(t*5)*.15+Math.sin(t*7.3)*.1;}
        if(a.type==="doorGlow"){a.mesh.material.opacity=.03+Math.sin(t*2)*.02;}
        if((a as any).type==="water"){const wm=(a as any).mesh;wm.material.opacity=.65+Math.sin(t*1.2)*.05;wm.position.y=0.005+Math.sin(t*0.8)*0.002;}
        if(a.type==="flame"){a.mesh.position.y=a.baseY+Math.sin(t*4+a.phase)*.06;a.mesh.scale.y=.8+Math.sin(t*6+a.phase)*.3;a.mesh.material.opacity=.5+Math.sin(t*5+a.phase)*.2;}
        if(a.type==="orb"){a.mesh.position.y=a.baseY+Math.sin(t*1.5+a.phase)*.1;a.inner.position.y=a.mesh.position.y;a.light.position.y=a.mesh.position.y;a.mesh.material.emissiveIntensity=.3+Math.sin(t*2+a.phase)*.15;}
        if(a.type==="disc"){a.mesh.rotation.y=t*.5;a.label.rotation.y=t*.5;
          if(vinylAudio){const vo=volOverride.current.audio;vinylAudio.volume=vo!==null?vo:Math.max(0,Math.min(1,1-pos.current.distanceTo(_vinylPos.current.set(vpX,1,vpZ))/8));}
        }
        if(a.type==="globe"){a.mesh.rotation.y=t*.15;}
        if((a as any).type==="xmasTree"){const xl=(a as any).light as THREE.PointLight;xl.intensity=.7+Math.sin(t*1.2)*.15;const sl=(a as any).star as THREE.PointLight;if(sl)sl.intensity=.5+Math.sin(t*2)*.2;const sm=(a as any).mesh;if(sm)sm.rotation.y=t*.3;}
        if(a.type==="video"){
          const cx=a.ctx,cw=a.w,ch=a.h,m=a.mem,ph=t*.5+a.phase;
          const vEl=a.videoEl?a.videoEl():null;
          if(vEl&&!vEl.muted){const vo=volOverride.current.video;vEl.volume=vo!==null?vo:Math.max(0,Math.min(1,1-pos.current.distanceTo(_screenPos.current.set(scrX,scrY,scrZ))/(isExhibition?20:10)));}
          const sImg=a.screenImg?a.screenImg():null;
          let videoFrameChanged=false;
          if(vEl&&vEl.readyState>=2){
            const ct=vEl.currentTime;
            if(ct!==(a as any)._lastVT){
              (a as any)._lastVT=ct;
              videoFrameChanged=true;
              let iw=vEl.videoWidth||cw,ih=vEl.videoHeight||ch;
              // Determine rotation: explicit mem.rotation wins; otherwise auto-rotate
              // portrait-oriented video onto the landscape cinema screen.
              let rot: number = (m.rotation ?? 0) as number;
              if(rot===0 && ih>iw){ rot = 90; }
              cx.fillStyle="#0A0804";cx.fillRect(0,0,cw,ch);
              cx.save();
              cx.translate(cw/2,ch/2);
              if(rot) cx.rotate((rot*Math.PI)/180);
              // effective target box swaps if rotated 90/270
              const tw = (rot===90||rot===270) ? ch : cw;
              const th = (rot===90||rot===270) ? cw : ch;
              const scale=Math.max(tw/iw,th/ih);
              const sw=iw*scale,sh=ih*scale;
              cx.drawImage(vEl,-sw/2,-sh/2,sw,sh);
              cx.restore();
            }
          }else if(sImg){
            videoFrameChanged=true;
            const iw=sImg.width,ih=sImg.height,scale=Math.max(cw/iw,ch/ih);
            const sw=iw*scale,sh=ih*scale;
            cx.drawImage(sImg,(cw-sw)/2,(ch-sh)/2,sw,sh);
            for(let sl=0;sl<ch;sl+=3){cx.fillStyle=`rgba(0,0,0,.015)`;cx.fillRect(0,sl,cw,1);}
            cx.fillStyle=`hsla(${(m.hue+Math.floor(t*10))%360},20%,50%,.03)`;cx.fillRect(0,0,cw,ch);
          }else{
            videoFrameChanged=true;
            const scT=Math.floor(ph*.3)%5;const h1=(m.hue+scT*30)%360,h2=(m.hue+scT*30+40)%360;
            const g=cx.createLinearGradient(0,0,cw,ch);
            g.addColorStop(0,`hsl(${h1},${m.s}%,${m.l-5+Math.sin(ph*2)*8}%)`);
            g.addColorStop(.5,`hsl(${(h1+h2)/2},${m.s-10}%,${m.l+Math.sin(ph*3)*5}%)`);
            g.addColorStop(1,`hsl(${h2},${m.s-5}%,${m.l-8+Math.cos(ph)*6}%)`);
            cx.fillStyle=g;cx.fillRect(0,0,cw,ch);
            for(let s=0;s<4;s++){cx.fillStyle=`hsla(${m.hue+s*25},${m.s+10}%,${m.l+10}%,.1)`;const sx=cw*.2+Math.sin(ph+s*1.5)*cw*.3;cx.beginPath();cx.arc(sx,ch*.3+Math.cos(ph*.7+s)*ch*.2,20+s*10,0,Math.PI*2);cx.fill();}
          }
          if(videoFrameChanged){
            cx.fillStyle="rgba(0,0,0,.35)";cx.fillRect(0,ch-28,cw,28);cx.fillStyle="rgba(255,255,255,.85)";cx.font="13px Georgia,serif";cx.textAlign="center";cx.fillText(m.title,cw/2,ch-9);
            a.tex.needsUpdate=true;
          }
        }
      });
      // Animate particles — throttle to every 2nd frame on mobile for performance
      const _doParticles=!_isMobile||(_frameCount&1)===0;
      if(_doParticles){
        const dp=rdG.attributes.position.array;for(let i=0;i<rdN;i++){dp[i*3+1]+=Math.sin(t*.2+i*.5)*.002;if(dp[i*3+1]>rH)dp[i*3+1]=.5;}rdG.attributes.position.needsUpdate=true;(rdG.attributes.position as any).updateRange={offset:0,count:rdN*3};
        dust.update(t,dt);
      }
      // Skip GPU render when tab is hidden (saves CPU/GPU on mobile)
      if(document.hidden)return;
      composer.render();
    };animate();

    // Do NOT auto-open media bars — they are now driven by the MemoryPalace
    // top-side toggle buttons via useRoomMediaBarStore.

    const onDown=(e: MouseEvent)=>{drag.current=false;prev.current={x:e.clientX,y:e.clientY};};
    const onMove=(e: MouseEvent)=>{const dx=e.clientX-prev.current.x,dy=e.clientY-prev.current.y;if(Math.abs(dx)>2||Math.abs(dy)>2)drag.current=true;
      if(e.buttons===1){lookT.current.yaw-=dx*.003;lookT.current.pitch=Math.max(-.85,Math.min(.5,lookT.current.pitch+dy*.003));prev.current={x:e.clientX,y:e.clientY};}
      const rect=el.getBoundingClientRect();_mouse.current.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);_rc.current.setFromCamera(_mouse.current,camera);
      // Unified raycast — sorted by distance. Hit area boxes block distant items
      // but specific items inside a hit area (within 1 unit behind the face) take priority.
      if(allClickableRef.current.length!==memMeshes.current.length+hitAreaMeshes.current.length){allClickableRef.current=[...memMeshes.current,...hitAreaMeshes.current];}
      const hits=_rc.current.intersectObjects(allClickableRef.current).filter(h=>h.distance<4);
      let found=false;let hitAreaFallback: any=null;let hitAreaDist=Infinity;
      for(const hit of hits){
        const ud=hit.object.userData;
        if(ud.isBackDoor){hovMem.current=ud;found=true;break;}
        // Specific item (not a hit area) — always wins
        if((ud.memory||ud.isStation||ud.isUploadPainting)&&!ud.isHitArea){
          if(ud.isStation||ud.isUploadPainting)hovMem.current=ud;else hovMem.current=ud.memory;found=true;break;
        }
        // Hit area — remember as fallback, keep looking for specific items within 1 unit behind
        if(ud.isHitArea&&!hitAreaFallback){hitAreaFallback=ud;hitAreaDist=hit.distance;continue;}
        // Past the hit area by >1 unit — stop (prevents reaching far-wall items)
        if(hitAreaFallback&&hit.distance>hitAreaDist+1)break;
      }
      if(!found&&hitAreaFallback){
        if(hitAreaFallback.isStation||hitAreaFallback.isUploadPainting)hovMem.current=hitAreaFallback;else if(hitAreaFallback.memory)hovMem.current=hitAreaFallback.memory;
        found=!!hovMem.current;
      }
      const newCur=found?"pointer":"grab";if(el.style.cursor!==newCur)el.style.cursor=newCur;if(!found)hovMem.current=null;};
    const onCk=()=>{if(!drag.current&&hovMem.current){
      // During onboarding, only painting click is allowed
      if(onboardingModeRef.current){
        if(hovMem.current.isUploadPainting)onMemoryClickRef.current("__upload_painting__");
        return;
      }
      if(hovMem.current.isBackDoor)onMemoryClickRef.current("__back__");
      else if(hovMem.current.isUploadPainting)onMemoryClickRef.current("__upload_painting__");
      else if(hovMem.current.isStation)onMemoryClickRef.current("__upload__");
      else onMemoryClickRef.current(hovMem.current);
    }};
    const onKD=(e: KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=true;if(["arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase()))e.preventDefault();};const onKU=(e: KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=false;};
    const onRs=()=>{w=el.clientWidth;h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();ren.setSize(w,h);composer.setSize(w,h);};
    el.addEventListener("mousedown",onDown);el.addEventListener("mousemove",onMove);el.addEventListener("click",onCk);
    window.addEventListener("keydown",onKD);window.addEventListener("keyup",onKU);window.addEventListener("resize",onRs);

    // ── TOUCH SUPPORT ──
    let touchTap2=true,touchLookId2: number|null=null,touchMoveId2: number|null=null;
    const touchMoveDir2={x:0,z:0};
    const onTS2=(e: TouchEvent)=>{
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];const rect=el.getBoundingClientRect();
        const rx=(t.clientX-rect.left)/rect.width,ry=(t.clientY-rect.top)/rect.height;
        if(rx<.25&&ry>.75&&touchMoveId2===null){
          touchMoveId2=t.identifier;touchMoveDir2.x=0;touchMoveDir2.z=0;
          prev.current={x:t.clientX,y:t.clientY};
        }else if(touchLookId2===null){
          touchLookId2=t.identifier;drag.current=false;prev.current={x:t.clientX,y:t.clientY};touchTap2=true;
        }
      }
    };
    const onTM2=(e: TouchEvent)=>{
      e.preventDefault();
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];
        if(t.identifier===touchMoveId2){
          const rect=el.getBoundingClientRect();
          const dx=t.clientX-prev.current.x,dy=t.clientY-prev.current.y;
          const maxR=rect.width*.12;
          touchMoveDir2.x=Math.max(-1,Math.min(1,dx/maxR));touchMoveDir2.z=Math.max(-1,Math.min(1,dy/maxR));
        }else if(t.identifier===touchLookId2){
          const dx=t.clientX-prev.current.x,dy=t.clientY-prev.current.y;
          if(Math.abs(dx)>10||Math.abs(dy)>10){drag.current=true;touchTap2=false;}
          lookT.current.yaw-=dx*.003;lookT.current.pitch=Math.max(-.85,Math.min(.5,lookT.current.pitch+dy*.003));
          prev.current={x:t.clientX,y:t.clientY};
        }
      }
    };
    const onTE2=(e: TouchEvent)=>{
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];
        if(t.identifier===touchMoveId2){touchMoveId2=null;touchMoveDir2.x=0;touchMoveDir2.z=0;}
        if(t.identifier===touchLookId2){
          if(touchTap2){
            const rect=el.getBoundingClientRect();_mouse.current.set(((t.clientX-rect.left)/rect.width)*2-1,-((t.clientY-rect.top)/rect.height)*2+1);
            _rc.current.setFromCamera(_mouse.current,camera);
            // Unified raycast — specific items win over hit areas within 1 unit
            if(allClickableRef.current.length!==memMeshes.current.length+hitAreaMeshes.current.length){allClickableRef.current=[...memMeshes.current,...hitAreaMeshes.current];}
            const hits=_rc.current.intersectObjects(allClickableRef.current).filter(h2=>h2.distance<4);
            let tapped=false;let tHitAreaFallback: any=null;let tHitAreaDist=Infinity;
            // During onboarding, only painting click is allowed
            if(onboardingModeRef.current){
              for(const hit of hits){
                const ud=hit.object.userData;
                if(ud.isUploadPainting&&!ud.isHitArea){onMemoryClickRef.current("__upload_painting__");tapped=true;break;}
                if(ud.isHitArea&&ud.isUploadPainting){tHitAreaFallback=ud;continue;}
              }
              if(!tapped&&tHitAreaFallback)onMemoryClickRef.current("__upload_painting__");
            }else{
            for(const hit of hits){
              const ud=hit.object.userData;
              if(ud.isBackDoor){onMemoryClickRef.current("__back__");tapped=true;break;}
              if((ud.memory||ud.isStation||ud.isUploadPainting)&&!ud.isHitArea){
                if(ud.isUploadPainting)onMemoryClickRef.current("__upload_painting__");else if(ud.isStation)onMemoryClickRef.current("__upload__");else onMemoryClickRef.current(ud.memory);tapped=true;break;
              }
              if(ud.isHitArea&&!tHitAreaFallback){tHitAreaFallback=ud;tHitAreaDist=hit.distance;continue;}
              if(tHitAreaFallback&&hit.distance>tHitAreaDist+1)break;
            }
            if(!tapped&&tHitAreaFallback){
              if(tHitAreaFallback.isUploadPainting)onMemoryClickRef.current("__upload_painting__");
              else if(tHitAreaFallback.isStation)onMemoryClickRef.current("__upload__");
              else if(tHitAreaFallback.memory)onMemoryClickRef.current(tHitAreaFallback.memory);
            }
            }
          }
          touchLookId2=null;
        }
      }
    };
    const touchKeys2=()=>{
      if(touchMoveId2!==null){const k=keys.current;
        k.w=touchMoveDir2.z<-.2;k.s=touchMoveDir2.z>.2;
        k.a=touchMoveDir2.x<-.2;k.d=touchMoveDir2.x>.2;
      }
    };
    const touchTick2=setInterval(touchKeys2,16);
    el.addEventListener("touchstart",onTS2,{passive:true});el.addEventListener("touchmove",onTM2,{passive:false});el.addEventListener("touchend",onTE2,{passive:true});

    // Media state polling — update video and audio independently
    const mediaPoll=setInterval(()=>{
      const v=videoElRef.current,a=audioElRef.current;
      if(v) setVidState({playing:!v.paused,loop:v.loop,time:v.currentTime||0,duration:v.duration||0,volume:v.volume});
      if(a) setAudState({playing:!a.paused,loop:a.loop,time:a.currentTime||0,duration:a.duration||0,volume:a.volume});
    },250);

    return()=>{alive=false;if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);el.removeEventListener("mousedown",onDown);el.removeEventListener("mousemove",onMove);el.removeEventListener("click",onCk);
      window.removeEventListener("keydown",onKD);window.removeEventListener("keyup",onKU);window.removeEventListener("resize",onRs);
      el.removeEventListener("touchstart",onTS2);el.removeEventListener("touchmove",onTM2);el.removeEventListener("touchend",onTE2);
      clearInterval(touchTick2);clearInterval(mediaPoll);
      videoElRef.current=null;audioElRef.current=null;setShowMedia({video:false,audio:false});
      try{useRoomMediaBarStore.getState().setOpen(null);}catch{}
      if(vinylAudio){vinylAudio.pause();vinylAudio.src="";}
      animTex.forEach(a=>{if(a.type==="video"){const vEl=a.videoEl?a.videoEl():null;if(vEl){vEl.pause();vEl.src="";if(vEl.parentNode)vEl.parentNode.removeChild(vEl);}}});
      const _cachedSet=buildCachedTextureSet();
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((m: any) => {
            if (m.map && !_cachedSet.has(m.map)) m.map.dispose();
            if (m.normalMap && !_cachedSet.has(m.normalMap)) m.normalMap.dispose();
            if (m.roughnessMap && !_cachedSet.has(m.roughnessMap)) m.roughnessMap.dispose();
            if (m.emissiveMap && !_cachedSet.has(m.emissiveMap)) m.emissiveMap.dispose();
            m.dispose();
          });
        }
      });
      dust.dispose();
      allTexSets.forEach(disposePBRSet);
      envMapProc.dispose();
      // Dispose the PMREM-processed HDRI env map (the raw HDR data stays cached
      // in assetLoader for reuse, but each renderer produces its own cube map
      // texture that must be freed to avoid GPU memory leaks).
      if(envMapHDRI){envMapHDRI.dispose();envMapHDRI=null;}
      composer.dispose();
      // Return renderer to pool for reuse (avoids WebGL context creation on next scene)
      if(el.contains(ren.domElement))el.removeChild(ren.domElement);
      returnRenderer(ren);
      // Null out scene references to help GC reclaim GPU-backed objects sooner
      scene.environment=null;scene.background=null;scene.fog=null;};
  },[roomId,actualRoomId,layoutOverride,displayFingerprint]);

  // ═══════════════════════════════════════════════════════════════
  // MEDIA REMOTE CONTROL — clean rewrite
  // ═══════════════════════════════════════════════════════════════

  const fmt = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  // Play — tries unmuted first (user gesture), falls back to muted
  const handlePlay = (el: HTMLMediaElement, isVideo: boolean) => {
    if (isVideo) el.muted = false;
    const p = el.play();
    if (p && typeof p.then === "function") {
      p.then(() => { if (isVideo) setMutedPlaying(false); })
       .catch(() => {
         if (isVideo) {
           el.muted = true; setMutedPlaying(true);
           el.play().catch(() => {});
         }
       });
    }
  };

  // Track switching
  const switchTrack = (type: "video" | "audio", newIdx: number) => {
    const isVid = type === "video";
    const list = isVid ? allVideoMems.current : allAudioMems.current;
    if (!list.length) return;
    const idx = ((newIdx % list.length) + list.length) % list.length;
    if (isVid) {
      setVidIdx(idx);
      const vm = list[idx], vEl = videoElRef.current;
      if (vEl && vm.dataUrl) {
        const src = vm.dataUrl.startsWith("/api/media/")
          ? vm.dataUrl + (vm.dataUrl.includes("?") ? "&" : "?") + "stream=1" : vm.dataUrl;
        vEl.pause(); vEl.src = src; vEl.load();
        handlePlay(vEl, true);
      }
      if (vidAnimEntry.current) vidAnimEntry.current.mem = vm;
      if (scrMeshRef.current) scrMeshRef.current.userData = { memory: vm };
    } else {
      setAudIdx(idx);
      const am = list[idx], aEl = audioElRef.current;
      if (aEl && am.dataUrl) { aEl.pause(); aEl.src = am.dataUrl; aEl.load(); aEl.play().catch(() => {}); }
      if (vpHitRef.current) vpHitRef.current.userData = { memory: am, isHitArea: true };
    }
  };

  // Visibility
  const showVid = (roomMediaBarOpen === "video" || showMedia.video) && !!videoElRef.current;
  const showAud = (roomMediaBarOpen === "audio" || showMedia.audio) && !!audioElRef.current;
  const hasMedia = showVid || showAud;
  const activeType: "video" | "audio" | null = showVid ? "video" : showAud ? "audio" : null;

  // Guard: if bar was opened but no media element exists, reset to avoid
  // stuck state where neither bar nor AV pill is visible
  useEffect(() => {
    if (roomMediaBarOpen === "video" && !videoElRef.current) setRoomMediaBarOpen(null);
    if (roomMediaBarOpen === "audio" && !audioElRef.current) setRoomMediaBarOpen(null);
  }, [roomMediaBarOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start video when bar opens — muted only
  useEffect(() => {
    if (!showVid || !videoElRef.current) return;
    const vEl = videoElRef.current;
    if (vEl.paused) {
      vEl.muted = true;
      const p = vEl.play();
      if (p && typeof p.then === "function") {
        p.then(() => setMutedPlaying(true)).catch(() => { setMutedPlaying(true); vEl.play().catch(() => {}); });
      } else setMutedPlaying(true);
    } else if (vEl.muted) setMutedPlaying(true);
  }, [showVid]);

  // Derived state for active bar
  const bRef = activeType === "video" ? videoElRef : audioElRef;
  const bSt = activeType === "video" ? vidState : audState;
  const bIdx = activeType === "video" ? vidIdx : audIdx;
  const bList = activeType === "video" ? allVideoMems.current : allAudioMems.current;
  const bTitle = bList[bIdx]?.title || (activeType === "video" ? t("videoFallback") : t("audioFallback"));
  const bAccent = activeType === "video" ? "#5B8CB8" : "#B87333";
  const bMulti = bList.length > 1;
  const bBoth = allVideoMems.current.length > 0 && allAudioMems.current.length > 0;
  const bIsVid = activeType === "video";

  return (
    <div role="application" aria-label={t("sceneLabel")} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {camDebug && createPortal(<pre ref={camDebugRef} onClick={() => { if (camDebugRef.current) navigator.clipboard.writeText(camDebugRef.current.textContent || ""); }} style={{ position: "fixed", bottom: "6rem", left: "1rem", zIndex: 99999, background: "rgba(0,0,0,0.85)", color: "#0f0", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontFamily: "monospace", fontSize: "0.8125rem", cursor: "pointer", border: "1px solid #0f03", lineHeight: 1.6, userSelect: "all" as const }} />, document.body)}

      {hasMedia && activeType && (
        <div
          onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          style={{
            position: "fixed",
            bottom: `calc(env(safe-area-inset-bottom, 0px) + 3.5rem)`,
            left: "0.75rem", right: "0.75rem", zIndex: 51,
            background: "rgba(26,21,16,0.85)",
            backdropFilter: "blur(0.75rem) saturate(160%)",
            WebkitBackdropFilter: "blur(0.75rem) saturate(160%)",
            borderRadius: "0.5rem",
            border: "0.0625rem solid rgba(255,255,255,0.06)",
            animation: "rcUp .2s ease",
            overflow: "hidden",
          }}
        >
          <style>{`@keyframes rcUp{from{opacity:0;transform:translateY(0.25rem)}to{opacity:1;transform:translateY(0)}}`}</style>

          {/* Thin seek bar — full width at top */}
          <div role="slider" aria-valuenow={Math.round(bSt.duration ? (bSt.time / bSt.duration) * 100 : 0)} aria-valuemin={0} aria-valuemax={100} aria-label={t("seekPosition")}
            style={{ width: "100%", height: "0.1875rem", background: "rgba(255,255,255,0.1)", cursor: "pointer" }}
            onClick={e => { const r = e.currentTarget.getBoundingClientRect(); const pct = (e.clientX - r.left) / r.width; if (bRef.current && bRef.current.duration) bRef.current.currentTime = pct * bRef.current.duration; }}>
            <div style={{ width: `${bSt.duration ? (bSt.time / bSt.duration) * 100 : 0}%`, height: "100%", background: bAccent, transition: "width .15s linear" }} />
          </div>

          {/* Single compact row */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem" }}>
            {/* Play / Pause */}
            <button onClick={() => { const el = bRef.current; if (!el) return; if (bSt.playing) el.pause(); else handlePlay(el, bIsVid); }}
              aria-label={bSt.playing ? t("pause") : t("play")}
              style={{ width: "2.25rem", height: "2.25rem", minWidth: "2.75rem", minHeight: "2.75rem", borderRadius: "50%", background: bAccent, border: "none", color: "#FFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {bSt.playing
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21"/></svg>
              }
            </button>

            {/* Prev / Next (only if multiple tracks) */}
            {bMulti && (<>
              <button onClick={() => switchTrack(activeType, bIdx - 1)} aria-label={t("previous")}
                style={{ width: "2rem", height: "2rem", minWidth: "2.75rem", minHeight: "2.75rem", borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", color: "#F0EAE0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4"/><rect x="5" y="4" width="2" height="16"/></svg>
              </button>
              <button onClick={() => switchTrack(activeType, bIdx + 1)} aria-label={t("next")}
                style={{ width: "2rem", height: "2rem", minWidth: "2.75rem", minHeight: "2.75rem", borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", color: "#F0EAE0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20"/><rect x="17" y="4" width="2" height="16"/></svg>
              </button>
            </>)}

            {/* Title + time — fills remaining space */}
            <div style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", display: "flex", alignItems: "baseline", gap: "0.375rem", marginLeft: "0.125rem" }}>
              <span style={{ fontFamily: T.font.display, fontSize: "0.75rem", fontWeight: 600, color: "#F0EAE0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {bTitle}{bMulti ? ` (${bIdx + 1}/${bList.length})` : ""}
              </span>
              <span style={{ fontFamily: T.font.body, fontSize: "0.625rem", color: "rgba(240,234,224,0.4)", whiteSpace: "nowrap", flexShrink: 0 }}>
                {fmt(bSt.time)}/{fmt(bSt.duration)}
              </span>
            </div>

            {/* Muted indicator (video) */}
            {bIsVid && mutedPlaying && bSt.playing && (
              <button onClick={() => { if (videoElRef.current) { videoElRef.current.muted = false; setMutedPlaying(false); } }}
                aria-label={t("tapForSound")}
                style={{ width: "2rem", height: "2rem", minWidth: "2.75rem", minHeight: "2.75rem", borderRadius: "50%", background: "rgba(200,50,50,0.15)", border: "none", color: "#C05050", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              </button>
            )}

            {/* Video/Audio switch */}
            {bBoth && (
              <button onClick={() => { setShowMedia(s => ({ ...s, [activeType]: false })); setRoomMediaBarOpen(bIsVid ? "audio" : "video"); }}
                aria-label={bIsVid ? t("switchToAudio") : t("switchToVideo")}
                style={{ width: "2rem", height: "2rem", minWidth: "2.75rem", minHeight: "2.75rem", borderRadius: "0.375rem", background: "rgba(255,255,255,0.1)", border: "none", color: "#F0EAE0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
                {bIsVid
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><polygon points="10 8 16 12 10 16" fill="currentColor" stroke="none"/></svg>
                }
              </button>
            )}

            {/* Close — prominent exit button */}
            <button onClick={() => { setShowMedia(s => ({ ...s, [activeType]: false })); setRoomMediaBarOpen(null); }}
              aria-label={t("close")}
              style={{ width: "2.25rem", height: "2.25rem", minWidth: "2.75rem", minHeight: "2.75rem", borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "0.0625rem solid rgba(255,255,255,0.12)", color: "#F0EAE0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(InteriorScene);
