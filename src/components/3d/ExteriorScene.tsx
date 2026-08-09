"use client";
import { useRef, useEffect, memo, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";
import { useUserStore } from "@/lib/stores/userStore";
import { createPostProcessing } from "@/lib/3d/postprocessing";
import { createExteriorEnvMap } from "@/lib/3d/environmentMaps";
import { getLightingPreset } from "@/lib/3d/daylightCycle";
import { EXPOSURE, GOLDEN, PLASTER_RAMP, CLEAR_COLOR, GOLD, EMBER, INK, TRAVERTINE_GROUT } from "@/lib/3d/canon";
import { flag3d } from "@/lib/3d/flags3d";
import { mountAmbientMusic } from "@/lib/3d/ambientAudio";
import { MAX_YAW_DEG_S } from "@/lib/3d/cameraComfort";
import { prefersReducedMotion } from "@/lib/3d/reducedMotion";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { loadHDRI, loadHDRIProgressive, HDRI_EXTERIOR, HDRI_TUSCAN_LANDSCAPE, loadPlasterWallTextures, loadWornPlasterTextures, loadClayPlasterTextures, loadTerracottaTileTextures, loadDarkWoodTextures, loadGrassTextures, loadGroundTextures, loadCropTextures, loadWhiteGravelTextures, loadGravelRoadTextures, loadSandstoneTextures, loadDisplacementMap, disposePBRSet, isCachedTexture, buildCachedTextureSet, releaseEnvMap, type PBRTextureSet } from "@/lib/3d/assetLoader";
import { createGrassSystem, createWheatField, createSharedWheatMaterial } from "@/lib/3d/grassShader";
import { createTuscanTerrain, getHeightAt } from "@/lib/3d/tuscanTerrain";
import { getQuality, mkPhys, isMobileGPU } from "@/lib/3d/mobilePerf";
import { makeFrauncesLabel } from "@/lib/3d/frauncesLabel";
import { optimizeMaterials } from "@/lib/3d/geometryOptimizer";
import { loadModel, warmDracoDecoder } from "@/lib/3d/modelLoader";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { hapticLight } from "@/lib/native/haptics";

// ── Wing SVG icon strings for hover labels (matches WingRoomIcons.tsx) ──
const WING_SVG_STRINGS: Record<string,string> = {
  roots: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,14 12,4 21,14"/><line x1="6" y1="14" x2="6" y2="20"/><line x1="18" y1="14" x2="18" y2="20"/><line x1="3" y1="20" x2="21" y2="20"/><path d="M10,20 L10,16 Q12,13 14,16 L14,20"/></svg>`,
  travel: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polygon points="12,3 13,10 12,11 11,10" fill="currentColor" fill-opacity="0.15" stroke="currentColor"/><polygon points="12,21 11,14 12,13 13,14" fill="currentColor" fill-opacity="0.08" stroke="currentColor"/><polygon points="3,12 10,11 11,12 10,13" fill="currentColor" fill-opacity="0.08" stroke="currentColor"/><polygon points="21,12 14,13 13,12 14,11" fill="currentColor" fill-opacity="0.08" stroke="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor" fill-opacity="0.3"/></svg>`,
  nest: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="7"/><path d="M7,9 Q7,7 12,7 Q17,7 17,9 L12,20 Z" fill="currentColor" fill-opacity="0.06"/><ellipse cx="12" cy="10" rx="5" ry="1.5"/><circle cx="12" cy="20" r="0.6" fill="currentColor" fill-opacity="0.25"/></svg>`,
  craft: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10,20 Q4,16 4,10 Q4,6 8,4" fill="none"/><path d="M6,14 Q8,13 8,11"/><path d="M5,11 Q7,10.5 7.5,8.5"/><path d="M5.5,8 Q7.5,7.5 8,5.5"/><path d="M14,20 Q20,16 20,10 Q20,6 16,4" fill="none"/><path d="M18,14 Q16,13 16,11"/><path d="M19,11 Q17,10.5 16.5,8.5"/><path d="M18.5,8 Q16.5,7.5 16,5.5"/><path d="M10,20 L12,21 L14,20"/></svg>`,
  passions: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8,20 L8,18 Q8,16 10,15 L14,15 Q16,16 16,18 L16,20"/><line x1="7" y1="20" x2="17" y2="20"/><path d="M8,18 Q5,14 6,8 Q6.5,5 9,4" fill="none"/><path d="M16,18 Q19,14 18,8 Q17.5,5 15,4" fill="none"/><line x1="7" y1="7" x2="17" y2="7"/><line x1="10" y1="7" x2="10" y2="15"/><line x1="12" y1="7" x2="12" y2="15"/><line x1="14" y1="7" x2="14" y2="15"/></svg>`,
  attic: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="3" ry="1"/><path d="M9,5 Q9,8 8,9" fill="none"/><path d="M15,5 Q15,8 16,9" fill="none"/><path d="M8,9 Q5,12 6,16 Q7,20 12,21 Q17,20 18,16 Q19,12 16,9" fill="currentColor" fill-opacity="0.05"/><path d="M8,9 Q4,10 5.5,14" fill="none"/><path d="M16,9 Q20,10 18.5,14" fill="none"/></svg>`,
};

// ═══ EXTERIOR — Fantasy Castle ═══
function ExteriorScene({onRoomHover,onRoomClick,hoveredRoom,wings:wingsProp,highlightDoor,styleEra="roman",autoWalkTo,onReady,onboardingMode,onCinematicPause,cinematicResumed}: {onRoomHover: any,onRoomClick: any,hoveredRoom: any,wings?: Wing[],highlightDoor?: string|null,styleEra?: string,autoWalkTo?: string|null,onReady?: () => void,onboardingMode?: boolean,onCinematicPause?: () => void,cinematicResumed?: boolean}){
  const WINGS = wingsProp || DEFAULT_WINGS;
  const ownerName = useUserStore((s) => s.userName);
  const { t } = useTranslation("exterior3d");
  const entranceHallLabel = t("entranceHall");
  const entranceHallLabelRef = useRef(entranceHallLabel);
  entranceHallLabelRef.current = entranceHallLabel;
  // W2 (WS3-5): the tympanum-name canvas lives inside the mount effect; these
  // refs let a late store hydration (or name change) redraw it in place.
  const ownerNameRef = useRef(ownerName);
  const tymNameRedrawRef = useRef<(() => void) | null>(null);
  useEffect(() => { ownerNameRef.current = ownerName; tymNameRedrawRef.current?.(); }, [ownerName]);
  const mountRef=useRef<HTMLDivElement|null>(null),frameRef=useRef<number|null>(null);
  const camDebugRef=useRef<HTMLPreElement|null>(null);
  const camDebug=false; // set true to show camera debug overlay
  // Cinematic pause: camera holds at WP1, parent shows prompt, sets cinematicResumed=true to continue
  const cinematicPauseFiredRef = useRef(false);
  const cinematicResumeTimeRef = useRef<number|null>(null);
  const cinematicResumedRef = useRef(!!cinematicResumed);
  useEffect(() => { cinematicResumedRef.current = !!cinematicResumed; }, [cinematicResumed]);
  const onCinematicPauseRef = useRef(onCinematicPause);
  useEffect(() => { onCinematicPauseRef.current = onCinematicPause; }, [onCinematicPause]);
  // Camera starts at waypoint 1 of the cinematic trajectory
  const camO=useRef({theta:Math.PI*1.4987,phi:Math.PI*0.4387}),camOT=useRef({theta:Math.PI*1.4987,phi:Math.PI*0.4387}),camD=useRef(180);
  const drag=useRef(false),prev=useRef({x:0,y:0}),mse=useRef(new THREE.Vector2()),ray=useRef(new THREE.Raycaster());
  const hoveredRoomRef=useRef(hoveredRoom);
  const onRoomClickRef=useRef(onRoomClick);
  const highlightDoorRef=useRef(highlightDoor);
  const autoWalkToRef=useRef(autoWalkTo);
  const onboardingModeRef=useRef(onboardingMode);

  // Keep refs in sync so event listeners always read the latest value
  useEffect(()=>{hoveredRoomRef.current=hoveredRoom;},[hoveredRoom]);
  useEffect(()=>{onRoomClickRef.current=onRoomClick;},[onRoomClick]);
  useEffect(()=>{highlightDoorRef.current=highlightDoor;},[highlightDoor]);
  useEffect(()=>{autoWalkToRef.current=autoWalkTo;},[autoWalkTo]);
  useEffect(()=>{onboardingModeRef.current=onboardingMode;},[onboardingMode]);

  // Set initial camera to cinematic start when in onboarding mode
  useEffect(()=>{
    if(onboardingMode){
      camO.current={theta:Math.PI*1.4987,phi:Math.PI*0.4387};
      camOT.current={theta:Math.PI*1.4987,phi:Math.PI*0.4387};
      camD.current=180;
    }
  },[]);// eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{
    const el=mountRef.current;if(!el)return;let w=el.clientWidth||window.innerWidth,h=el.clientHeight||window.innerHeight;
    const dlPreset=getLightingPreset();
    const Q=getQuality();
    const isMobileQ=Q.maxEagerTextureSets<=6;
    // MUSEO VIVO Wave-1 exterior pass (WS3-4 retunes, WS2-1/3/4 terrain + shared
    // field materials, emissive-lerp kill). Staging ON / prod OFF via flags3d.
    const W1=flag3d("w1_exterior");
    // MUSEO VIVO Wave-2 exterior pass (WS3-5..11): owner's name on the
    // tympanum, Fraunces signposts replacing the hover label, Renaissance
    // coercion, instanced cypresses, per-frame material-mutation deletion,
    // 18s establishing dolly, tap-is-travel entrance. W2 builds on the W1
    // infrastructure, so it requires W1; flag OFF ⇒ W1 behavior intact.
    const W2=W1&&flag3d("w2_exterior");
    // MUSEO VIVO Wave-3 (Blender-authored hero assets, docs/BLENDER_EXTERIOR_MASTERPLAN.md).
    // W3 = W2 && flag; staging ON / prod OFF automatically. First deliverable is
    // the dome-shell pipeline canary: a DRACO-compressed GLB with baked AO on UV0
    // streamed through modelLoader, replacing the procedural terracotta shell +
    // ribs. Additive-safe: any load failure keeps the procedural dome (fallback).
    const W3=W2&&flag3d("w3_exterior");
    // ══════════════════════════════════════════════════════════════════════
    // W2 MASTERPLAN — GRONDPLAN v3: "un corpo unico, cresciuto nei secoli"
    // (owner-APPROVED plan, public/concepts/moodboard.html §3). Replaces the
    // W1 radial 5-wing windmill with ONE CONTINUOUS ASYMMETRIC CORPS: a high
    // compact hoofdblok carries the terracotta dome (the hero on world (0,0),
    // footprint ~7% of total — it rules by HEIGHT, not by ground), from which a
    // long low galerij grows east, a teruglig-tak folds back to embrace an
    // irregular cortile, a lower dienstvleugel closes rear-west, and a walled
    // broncourt-range hangs off the gallery. Seven casa-torri rise from the
    // knots/corners as a grown hill-town profile; two poorttorens flank the
    // entrance. The five WINGS[0..4] chapters survive only as invisible interior
    // anchors — no wing is entered from outside (entrance hall only).
    //
    // GROUNDS (Stage 1, BUILT, kept verbatim below): stone apron at the stair,
    // gravel parterre + four buxus + centre urn on the −Z axis, marble benches,
    // cypressenlaan up the hill for the 18s dolly. Dome + drum + gold lantern,
    // the monumental stair + gold tympanum with the owner's name — all kept.
    //
    // NEW MASSA / TOWERS / ANCHORS: see the fully-documented block/tower/anchor
    // tables at the W2 build (`if (W2) {` after the wing loop), with the
    // collision proof. All new geometry merges per material into a handful of
    // static meshes; the −Z arrival wedge (±22°) stays mass-free; the ~7.5s
    // name-beat frames the tympanum between poorttorens T1(−13,−14)/T2(+11,−14).
    // Flag OFF ⇒ radial W1 legacy, byte-identical.
    // ══════════════════════════════════════════════════════════════════════
    // W1 (WS10-2): mount the ONE ambient score — idempotent singleton, plays on
    // across scene transitions, so deliberately NOT stopped in cleanup.
    if(W1)mountAmbientMusic();
    const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(GOLDEN.fogExterior,.0018*dlPreset.fogDensity);
    // ── PHOTOREALISTIC TUSCAN GOLDEN HOUR SKY ──
    // Mobile: 512x256 (4x fewer pixels), Desktop: 2048x1024
    const skyGeo=new THREE.SphereGeometry(500,Q.skyCanvasWidth>=2048?64:24,Q.skyCanvasHeight>=1024?40:16);
    const skyC=document.createElement("canvas");skyC.width=Q.skyCanvasWidth;skyC.height=Q.skyCanvasHeight;
    const skx=skyC.getContext("2d")!;
    // Scale factor: coordinates are authored at 4096x2048 virtual space
    const skyScaleX=Q.skyCanvasWidth/4096;const skyScaleY=Q.skyCanvasHeight/2048;
    skx.scale(skyScaleX,skyScaleY);
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
    // Mobile: 2 layers x 10 clouds; Desktop: 6 layers x 40 clouds
    const cirrusLayers=isMobileQ?2:6,cirrusPer=isMobileQ?10:40;
    for(let layer=0;layer<cirrusLayers;layer++){
      const yBase=80+layer*65,alpha=.025+layer*.01;
      for(let ci=0;ci<cirrusPer;ci++){
        const cx2=Math.random()*4096,cy=yBase+Math.random()*50;
        const cw=80+Math.random()*200,ch2=2+Math.random()*5;
        skx.fillStyle=`rgba(255,${250-layer*8},${238-layer*12},${alpha+Math.random()*.02})`;
        skx.beginPath();skx.ellipse(cx2,cy,cw,ch2,Math.random()*.2-.1,0,Math.PI*2);skx.fill();
        // Sub-wisps for texture (skip on mobile)
        if(!isMobileQ){for(let sw=0;sw<3;sw++){
          skx.fillStyle=`rgba(255,${248-layer*8},${235-layer*10},${alpha*.4})`;
          skx.beginPath();skx.ellipse(cx2+Math.random()*cw-cw/2,cy+Math.random()*8-4,cw*.4,ch2*.6,Math.random()*.15,0,Math.PI*2);skx.fill();
        }}
      }
    }
    // Mid-level cumulus clouds — softer, more voluminous
    const cumulusCount=isMobileQ?4:18;
    for(let ci=0;ci<cumulusCount;ci++){
      const cx2=Math.random()*4096,cy=400+Math.random()*250;
      const baseW=100+Math.random()*160;
      const cumulusParts=isMobileQ?3:8;
      for(let p=0;p<cumulusParts;p++){
        const pw=baseW*(0.4+Math.random()*.6),ph=(8+Math.random()*12)*(1-p*.05);
        skx.fillStyle=`rgba(255,${250-p*2},${240-p*4},${.03+Math.random()*.015})`;
        skx.beginPath();skx.ellipse(cx2+Math.random()*baseW*.6-baseW*.3,cy+Math.random()*15-7,pw,ph,Math.random()*.1,0,Math.PI*2);skx.fill();
      }
    }
    // Low horizon clouds — backlit golden edges
    const horizonCloudCount=isMobileQ?6:25;
    for(let ci=0;ci<horizonCloudCount;ci++){
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
    // Outer atmospheric glow — fewer layers on mobile
    const sunGlowLayers=isMobileQ?3:8;
    for(let r=0;r<sunGlowLayers;r++){
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
    // God rays — fewer on mobile
    const godRayCount=isMobileQ?4:14;
    for(let gr=0;gr<godRayCount;gr++){
      const angle=-Math.PI*.7+gr*.11+Math.random()*.04;const len=300+Math.random()*300;
      skx.strokeStyle=`rgba(255,235,190,${.01+Math.random()*.015})`;
      skx.lineWidth=10+Math.random()*20;skx.beginPath();
      skx.moveTo(sunX,sunY);skx.lineTo(sunX+Math.cos(angle)*len,sunY+Math.sin(angle)*len);skx.stroke();
    }
    // Stars in deep sky — fewer on mobile
    const starCount=isMobileQ?20:120;
    for(let si=0;si<starCount;si++){
      const sy=Math.random()*500;
      skx.fillStyle=`rgba(255,255,245,${.02+Math.random()*.04*(1-sy/500)})`;
      skx.beginPath();skx.arc(Math.random()*4096,sy,Math.random()*1.2,.0,Math.PI*2);skx.fill();
    }
    const skyTex=new THREE.CanvasTexture(skyC);skyTex.colorSpace=THREE.SRGBColorSpace;
    // Release canvas memory AFTER first render ensures GPU texture upload completed
    requestAnimationFrame(()=>{requestAnimationFrame(()=>{skyC.width=0;skyC.height=0;});});
    // Procedural sky sphere used as fallback only — hidden when HDRI background loads
    const skySphere=new THREE.Mesh(skyGeo,new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide}));
    scene.add(skySphere);
    // UNCONDITIONAL golden sky at mount, every tier (MUSEO VIVO WS1-5/WS9-1):
    // the procedural sky is the background from the very first frame — the
    // black void while the 6.5MB HDRI decoded is dead. Where the HDRI still
    // loads (desktop) it replaces this background asynchronously below.
    // (The sky sphere mesh alone can be clipped by the camera far plane (300)
    // since its radius (500) exceeds it — the background texture cannot.)
    scene.background=skyTex;scene.backgroundIntensity=1.0;
    if(!Q.loadBackgroundHDRI){skySphere.visible=false;}

    // Owner feedback 2026-08-06 #6 (z-fighting): near 1.0→2.5 — the dolly/orbit
    // never comes closer than ~14 world units to any geometry (min camD is 35,
    // user zoom clamps at 40), and depth precision at the far haze scales with
    // near, so this alone buys 2.5× depth resolution on the distant planes.
    const camera=new THREE.PerspectiveCamera(32,w/h,2.5,300);
    let ren:THREE.WebGLRenderer;
    try{ren=new THREE.WebGLRenderer({antialias:Q.antialias,powerPreference:"high-performance"});}catch{ren=new THREE.WebGLRenderer({antialias:false,powerPreference:"default"});}
    ren.setSize(w,h);ren.setPixelRatio(Math.min(window.devicePixelRatio,Q.maxPixelRatio));
    ren.shadowMap.enabled=Q.shadowsEnabled;if(Q.shadowsEnabled){ren.shadowMap.type=Q.shadowMapSize>=2048?THREE.PCFSoftShadowMap:THREE.BasicShadowMap;ren.shadowMap.autoUpdate=false;ren.shadowMap.needsUpdate=true;}ren.toneMapping=THREE.NoToneMapping;ren.toneMappingExposure=EXPOSURE;// grade lives in the shared EffectPass (NeutralToneMapping @ canon EXPOSURE)
    ren.setClearColor(CLEAR_COLOR,1);
    ren.outputColorSpace=THREE.SRGBColorSpace;
    ren.domElement.addEventListener("webglcontextlost",(e)=>{e.preventDefault();});
    ren.domElement.addEventListener("webglcontextrestored",()=>{ren.shadowMap.needsUpdate=true;});
    el.appendChild(ren.domElement);

    // Cache root font size for rem calculations in render loop (avoid per-frame getComputedStyle)
    let cachedRem=parseFloat(getComputedStyle(document.documentElement).fontSize);

    // ── ENVIRONMENT MAP (IBL) — procedural immediate, real HDRI async ──
    const envMapProc=createExteriorEnvMap(ren,{sunIntensity:0.9*dlPreset.sunIntensity,skyBrightness:0.7*dlPreset.envBrightness/0.45});
    scene.environment=envMapProc;
    // Owner feedback 2026-08-06 #6A (contrast): under W1 the IBL fill comes down a
    // step so shadow sides deepen — contrast lives in the light RATIO, never in a
    // per-scene exposure tweak (the one-grade law stands).
    const ENV_INT=W1?0.5:0.6, ENV_INT_HDRI=W1?0.55:0.7;
    scene.environmentIntensity=ENV_INT;
    let envMapHDRI: THREE.Texture|null=null;
    let bgMapHDRI: THREE.Texture|null=null;
    if(Q.loadEnvHDRI){loadHDRIProgressive(ren,HDRI_EXTERIOR,{onProcedural:(p)=>{scene.environment=p;scene.environmentIntensity=ENV_INT;},onFull:(hdr)=>{envMapHDRI=hdr;scene.environment=hdr;scene.environmentIntensity=ENV_INT_HDRI;}}).catch(()=>{});}
    // Load Rolling Hills HDRI as background panorama — warm sunrise over dry grassy hilltops (Tuscan feel)
    // Skipped on mobile (6.5 MB) — the procedural sky sphere provides adequate background
    if(Q.loadBackgroundHDRI){loadHDRI(ren,HDRI_TUSCAN_LANDSCAPE).then((hdr)=>{bgMapHDRI=hdr;scene.background=hdr;scene.backgroundIntensity=0.4;scene.backgroundBlurriness=0.03;skySphere.visible=false;}).catch(()=>{});}

    // ── POST-PROCESSING ──
    // Quality tier from mobilePerf.ts automatically disables SSAO/DOF/Bloom/SMAA on mobile
    const composer=createPostProcessing(ren,scene,camera,"exterior");

    // ── REAL PBR TEXTURES ──
    // On mobile, load only critical texture sets eagerly (walls, roof, door, ground).
    // Landscape textures (grass, crops, gravel) are deferred — they use the same
    // plaster/travertine base textures anyway and are tinted via material color.
    const stoneTex=loadPlasterWallTextures([4,4]);
    const clayPlasterTex=loadClayPlasterTextures([2,2]);
    const paintedPlasterTex=loadPlasterWallTextures([2,2]);
    const roofTileTex=loadTerracottaTileTextures([3,3]);
    const woodDoorTex=loadDarkWoodTextures([2,3]);
    // Deferred on mobile — these are stand-in textures (plaster/travertine) tinted via vertex colors
    const wornPlasterTex=isMobileQ?paintedPlasterTex:loadWornPlasterTextures([3,3]);
    const grassTex=isMobileQ?paintedPlasterTex:loadGrassTextures([12,12]);
    const groundTex=isMobileQ?paintedPlasterTex:loadGroundTextures([8,8]);
    const cropTex=isMobileQ?paintedPlasterTex:loadCropTextures([6,6]);
    const whiteGravelTex=isMobileQ?stoneTex:loadWhiteGravelTextures([4,4]);
    const roadTex=isMobileQ?stoneTex:loadGravelRoadTextures([3,3]);
    // WS2-3: real terrain textures. The plaster stand-in terrain is replaced by the
    // sandstone PBR set (dry Tuscan soil read) on ALL tiers — the terrain is the
    // largest visible surface in the scene, so it earns an eager 1k set even on mobile.
    const terrainTex=W1?loadSandstoneTextures([64,64]):null;
    const allTexSets: PBRTextureSet[]=[stoneTex,wornPlasterTex,clayPlasterTex,paintedPlasterTex,roofTileTex,woodDoorTex,grassTex,groundTex,cropTex,whiteGravelTex,roadTex,...(terrainTex?[terrainTex]:[])];
    // WS2-1: anisotropic filtering on ground-plane texture sets (4 mobile / 8 desktop,
    // clamped to hardware max). Grazing-angle floor blur is the most visible cheapness.
    const aniso=W1?Math.min(isMobileQ?4:8,ren.capabilities.getMaxAnisotropy()):0;
    if(W1&&aniso>1){
      for(const set of [terrainTex,whiteGravelTex,roadTex,cropTex,grassTex,groundTex]){
        if(!set)continue;
        for(const tex of [set.map,set.normalMap,set.roughnessMap]){tex.anisotropy=aniso;tex.needsUpdate=true;}
      }
    }

    // Hover label overlay — W2 (WS3-6/WS3-10): the hover-only Cormorant label
    // and its per-frame screen projection are dead; the persistent Fraunces
    // travertine signposts below replace it (dogma 7: all 3D type Fraunces).
    const hovLabel: HTMLDivElement|null=W2?null:document.createElement("div");
    if(hovLabel){
      hovLabel.style.cssText="position:absolute;display:none;pointer-events:none;z-index:10;transform:translate(-50%,-100%);font-family:'Cormorant Garamond',serif;font-size:1.375rem;font-weight:600;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.6),0 0 30px rgba(42,34,24,.5);padding:0.5rem 1.25rem;background:rgba(42,34,24,0.85);border-radius:0.75rem;backdrop-filter:blur(6px);white-space:nowrap;border:1px solid rgba(255,255,255,.2);";
      el.appendChild(hovLabel);
    }
    // W2 (WS3-10 dolly): cream veil for the reduced-motion stills crossfade (lazy)
    let rmVeil: HTMLDivElement|null=null;
    const ensureRmVeil=()=>{
      if(!rmVeil){
        rmVeil=document.createElement("div");
        rmVeil.style.cssText=`position:absolute;inset:0;background:${CLEAR_COLOR};opacity:0;pointer-events:none;z-index:5;`;
        el.appendChild(rmVeil);
      }
      return rmVeil;
    };

    // Dramatic golden-hour lighting
    // ══ Owner feedback 2026-08-06 #6A — CONTRAST, inside the one-grade law ══
    // The grade (NeutralToneMapping @ canon EXPOSURE in the shared EffectPass)
    // is untouched. Contrast comes from the light RATIO instead: sun up ~35%,
    // hemisphere/fill/bounce down ~45%, and a tighter shadow frustum (sharper
    // shadow texels over the palace instead of a 160m blur). Lit faces stay
    // golden; shadow sides finally fall away — the palace reads sculptural
    // against the sky instead of bathing evenly in gold. W1-gated (staging
    // iteration inside the wave); flag OFF keeps the legacy balance.
    scene.add(new THREE.HemisphereLight(dlPreset.ambientColor,dlPreset.groundBounceColor,(W1?0.36:0.6)*dlPreset.ambientIntensity/0.5));
    const sun=new THREE.DirectionalLight(dlPreset.sunColor,(W1?4.4:3.2)*dlPreset.sunIntensity);sun.position.set(dlPreset.sunPosition[0],dlPreset.sunPosition[1],dlPreset.sunPosition[2]);sun.castShadow=true;
    const shadowExt=W1?58:80; // W1: frustum hugs palace+wings+courtyard — crisper, deeper shadows
    sun.shadow.mapSize.set(Q.shadowMapSize,Q.shadowMapSize);sun.shadow.camera.near=1;sun.shadow.camera.far=200;
    sun.shadow.camera.left=-shadowExt;sun.shadow.camera.right=shadowExt;sun.shadow.camera.top=shadowExt;sun.shadow.camera.bottom=-shadowExt;sun.shadow.bias=-0.0003;scene.add(sun);
    const fill=new THREE.DirectionalLight(dlPreset.fillColor,(W1?0.22:0.4)*dlPreset.fillIntensity/0.35);fill.position.set(-25,20,-15);scene.add(fill);
    // Rim slightly up under W1: golden-hour edge on the dome/cornice silhouette
    if(!isMobileGPU()){const rim=new THREE.DirectionalLight(dlPreset.sunColor,(W1?1.0:0.8)*dlPreset.sunIntensity);rim.position.set(-15,30,30);scene.add(rim);}
    // Warm uplight for drama — W1: halved so courtyard-facing shadow walls stay dim
    if(!isMobileGPU()){const uplight=new THREE.PointLight(dlPreset.fillColor,(W1?.18:.4)*dlPreset.fillIntensity/0.35,80);uplight.position.set(0,2,0);scene.add(uplight);}
    if(!isMobileGPU()){const porticoWarm=new THREE.SpotLight("#FFE0A0",0.3,60,Math.PI*0.3);porticoWarm.position.set(0,2,-20);porticoWarm.target.position.set(0,5,0);scene.add(porticoWarm);scene.add(porticoWarm.target);}

    const M={
      // ── WALLS — sun-bleached canon plaster (MUSEO VIVO: honey comes from the sun, not albedo)
      stone:new THREE.MeshStandardMaterial({color:PLASTER_RAMP.base,roughness:.72,metalness:0,envMapIntensity:.65,map:paintedPlasterTex.map,normalMap:clayPlasterTex.normalMap,normalScale:new THREE.Vector2(.9,.9),roughnessMap:clayPlasterTex.roughnessMap}),
      stoneL:new THREE.MeshStandardMaterial({color:PLASTER_RAMP.light,roughness:.65,metalness:0,envMapIntensity:.65,map:paintedPlasterTex.map,normalMap:clayPlasterTex.normalMap,normalScale:new THREE.Vector2(.8,.8),roughnessMap:clayPlasterTex.roughnessMap}),
      stoneW:new THREE.MeshStandardMaterial({color:PLASTER_RAMP.mid,roughness:.70,metalness:0,envMapIntensity:.65,map:paintedPlasterTex.map,normalMap:clayPlasterTex.normalMap,normalScale:new THREE.Vector2(.95,.95),roughnessMap:clayPlasterTex.roughnessMap}),
      stoneD:new THREE.MeshStandardMaterial({color:PLASTER_RAMP.shade,roughness:.75,metalness:0,envMapIntensity:.6,map:paintedPlasterTex.map,normalMap:clayPlasterTex.normalMap,normalScale:new THREE.Vector2(.95,.95),roughnessMap:clayPlasterTex.roughnessMap}),
      stoneDk:new THREE.MeshStandardMaterial({color:PLASTER_RAMP.dark,roughness:.82,metalness:0,map:paintedPlasterTex.map,normalMap:clayPlasterTex.normalMap,normalScale:new THREE.Vector2(1,1),roughnessMap:clayPlasterTex.roughnessMap}),
      // ── TRIM — pietra serena (cool blue-grey sandstone) & aged gold
      trim:new THREE.MeshStandardMaterial({color:"#EDE4D4",roughness:.60,metalness:0,envMapIntensity:.6,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.15,.15)}),
      gold:mkPhys(THREE,{color:"#B8973A",roughness:.35,metalness:.92,emissive:"#3D3010",emissiveIntensity:.08,clearcoat:.15,clearcoatRoughness:.4,envMapIntensity:1.0}),
      goldBright:mkPhys(THREE,{color:"#CFB53B",roughness:.18,metalness:.95,emissive:"#4A3A10",emissiveIntensity:.12,clearcoat:.35,clearcoatRoughness:.08,envMapIntensity:1.5}),
      bronze:mkPhys(THREE,{color:"#6B5238",roughness:.3,metalness:.82,emissive:"#2A1E10",emissiveIntensity:.06,clearcoat:.2,clearcoatRoughness:.3,envMapIntensity:1.0}),
      copper:mkPhys(THREE,{color:"#5A9A80",roughness:.55,metalness:.30,emissive:"#1A3028",emissiveIntensity:.05,clearcoat:0,envMapIntensity:.7}),
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
      win:mkPhys(THREE,{color:"#FFF8E7",emissive:"#FFAA44",emissiveIntensity:.25,roughness:.08,transparent:true,opacity:.7,transmission:.6,ior:1.52}),
      winBlue:mkPhys(THREE,{color:"#D8E8F0",emissive:"#88AACC",emissiveIntensity:.12,roughness:.1,transparent:true,opacity:.65,transmission:.5,ior:1.52}),
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

    // ══ MUSEO VIVO WS3-4 — material/emissive/envMap retune for Neutral@1.15 ══
    // Every value below was tuned for ACESFilmic@2.4; under the Neutral grade the
    // scene reads dimmer and flatter, so envMapIntensity lifts recover the sun-
    // bleached warmth while emissives come DOWN (no neon under the honest grade).
    // Hues anchor to canon.ts tokens or restrained earth tones — teal/verdigris die.
    if(W1){
      // Walls already on PLASTER_RAMP (atomic commit) — lift env response so plaster catches the golden PMREM
      M.stone.envMapIntensity=.85;M.stoneL.envMapIntensity=.85;M.stoneW.envMapIntensity=.85;M.stoneD.envMapIntensity=.8;
      // Gold: canon #D4AF37, calmer emissive/clearcoat — gold may gleam, never glow
      M.gold.color.set(GOLD);M.gold.emissiveIntensity=.05;
      M.goldBright.color.set(GOLD);M.goldBright.emissiveIntensity=.06;M.goldBright.envMapIntensity=1.1;
      // Copper was teal (#5A9A80) — off-canon; retone to aged bronze
      M.copper.color.set("#8A6B4E");M.copper.emissive.set("#2A2014");M.copper.emissiveIntensity=.04;M.copper.metalness=.5;
      // Terracotta roofs — warmer, sun-struck, catching more sky
      M.roof.color.set("#B08262");M.roof.envMapIntensity=.5;
      M.roofD.color.set("#8C6F5C");M.roofD.envMapIntensity=.35;
      M.roofSlate.color.set("#8A7A66");M.roofSlate.metalness=.1;
      // Owner r7 #1: roofs read too shiny + too white — darken the coppo to a muted
      // aged terracotta and kill the specular (envMap 1.0→.22, rougher).
      M.tile.color.set("#96684A");M.tile.envMapIntensity=.22;M.tile.roughness=.9;
      M.roof.color.set("#9A6B50");M.roof.envMapIntensity=.22;
      // Owner r7 #1: the palace reads too white/shiny overall — warm-down the near-
      // white travertine trim + marble and drop their specular so the stone reads matte.
      M.trim.color.set("#DBCDB0");M.trim.envMapIntensity=.3;M.trim.roughness=.72;
      M.marble.color.set("#D6CBB4");M.marble.envMapIntensity=.14;M.marble.roughness=.66;
      M.marbleVein.color.set("#CEC3AC");M.marbleVein.envMapIntensity=.14;
      M.col.roughness=.62;
      // Windows: warm glass, emissive down .25→.16 so panes never bloom at 1.15
      M.win.emissive.set("#FFC488");M.win.emissiveIntensity=.16;
      M.winBlue.color.set("#F2ECDC");M.winBlue.emissive.set("#FFD8A0");M.winBlue.emissiveIntensity=.06;
      // Doors: lift from near-black walnut so they read as wood at golden hour (60+ eyes)
      M.door.color.set("#6B4526");M.doorRich.color.set("#7A4E2C");
      // Water: kill the teal — hazy golden-sky reflection tones
      M.water.color.set("#8C9884");M.waterDeep.color.set("#76806C");
      // Vegetation: cool greens → sun-dried olive family
      M.grass.color.set("#7A7E48");M.grassL.color.set("#8A8C54");M.grassD.color.set("#6A7040");M.grassRich.color.set("#6E7242");
      M.hedge.color.set("#44502E");M.hedgeL.color.set("#525E38");M.ivy.color.set("#4E5C38");
      // Travertine columns — modest golden env (owner r7 #1: dial back the shine)
      M.col.envMapIntensity=.5;
    }

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
    const terrain = W1
      ? createTuscanTerrain(scene, {
          cropMap: terrainTex!.map, cropNormal: terrainTex!.normalMap, cropRoughness: terrainTex!.roughnessMap, cropAO: terrainTex!.aoMap,
        }, { anisotropy: aniso, warm: true })
      : createTuscanTerrain(scene, {
          cropMap: cropTex.map, cropNormal: cropTex.normalMap, cropRoughness: cropTex.roughnessMap,
        });
    // Cobblestone courtyard — completely matte to avoid specular glare.
    // W1: real sandstone maps (WS2-3) instead of the tinted plaster stand-in.
    const courtyardGroundTex = W1 ? terrainTex! : groundTex;
    const courtyardMat = new THREE.MeshStandardMaterial({ color: W1 ? "#CDBC9A" : "#C8B898", roughness: 0.92, metalness: 0, map: courtyardGroundTex.map, normalMap: courtyardGroundTex.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: courtyardGroundTex.roughnessMap });
    if (!W2) {
      const cyGeo = new THREE.CircleGeometry(39, 64);
      cyGeo.rotateX(-Math.PI / 2);
      const cyMesh = new THREE.Mesh(cyGeo, courtyardMat);
      cyMesh.position.y = HILL_Y + 0.35;
      cyMesh.receiveShadow = true;
      scene.add(cyMesh);
      // Decorative courtyard rings — cobblestone pattern (legacy only: under the
      // W2 masterplan the whole "target-disc" hardscape is retired below)
      for(const [rr,tube,rSeg,ry] of [[28,.12,8,.42],[20,.08,4,.38],[14,.06,4,.38]] as [number,number,number,number][]){
        const ring=mk(new THREE.TorusGeometry(rr,tube,rSeg,rr===14?36:48),M.stoneD,0,HILL_Y+ry,0);
        scene.add(ring);
      }
      // Compass rose / medallion at courtyard centre
      // W1: gold is reserved for entrance/tympanum (canon dogma) — medallion reads as pale travertine inlay
      const medallion = new THREE.Mesh(new THREE.CircleGeometry(2,16),W1?M.trim:M.goldBright);
      medallion.rotation.x = -Math.PI/2;
      medallion.position.set(0,HILL_Y+0.4,0);
      scene.add(medallion);
    } else {
      // ══ W2 MASTERPLAN GROUNDS — the circle disc dies ══
      // Paving lives ONLY around the stair: a rectangular stone apron under the
      // stair foot / urn plinths / signpost. South of it the formal parterre
      // rides a low gravel garden terrace (its 1.6-deep body walls down to the
      // falling ground at the far corners, so the garden itself reads terraced).
      // Everything else is terrain, grass and planting. All shared/canon
      // materials, receive-only shadows, deterministic literals.
      // Stone apron — courtyardMat (sandstone under W1), top 8.42, sunk 0.5
      const apron = mk(new THREE.BoxGeometry(26, 0.5, 7.5), courtyardMat, 0, HILL_Y + 0.17, -19.75);
      apron.castShadow = false; scene.add(apron);
      // Parterre garden terrace — warm gravel carpet x ±17, z -23.25..-46.85.
      // Overlaps the apron 0.25 in z (stepped tops 8.42→8.36, never coplanar).
      const parterreGravelMat = new THREE.MeshStandardMaterial({
        color: "#D9CCAC", roughness: .94, envMapIntensity: .12,
        map: whiteGravelTex.map, normalMap: whiteGravelTex.normalMap, normalScale: new THREE.Vector2(.6, .6),
        roughnessMap: whiteGravelTex.roughnessMap, aoMap: whiteGravelTex.aoMap, aoMapIntensity: .3,
      });
      const carpet = mk(new THREE.BoxGeometry(34, 1.6, 23.6), parterreGravelMat, 0, HILL_Y - 0.44, -35.05);
      carpet.castShadow = false; scene.add(carpet);
      // ══ Owner review 2026-08-08 r6 #5 — the forecourt must read as a real
      // giardino all'italiana, not flat green panels ("de tuin is te knullig").
      // Four box-parterre compartments: a clipped-hedge broderie enclosing four
      // coloured flower beds, corner topiary balls + a central topiary cone, on a
      // gravel bed; potted lemon trees line the walks and a stone fountain sits on
      // the cross-axis. Everything merges per material → a handful of draw calls.
      {
        // Owner r7 #2: keep the forecourt SOBER — clipped-green box parterre on
        // gravel, muted santolina/sage infill (no bright flower blocks), green
        // potted bays (no yellow lemons). Restrained giardino, not a flower show.
        const sageMat = new THREE.MeshStandardMaterial({ color: "#7E8A5E", roughness: 0.88 });
        const santoMat = new THREE.MeshStandardMaterial({ color: "#94997A", roughness: 0.9 });
        const gHedge: THREE.BufferGeometry[] = [], gBed: THREE.BufferGeometry[] = [],
              gTopi: THREE.BufferGeometry[] = [], gSage: THREE.BufferGeometry[] = [],
              gSanto: THREE.BufferGeometry[] = [];
        const B = (arr: THREE.BufferGeometry[], w: number, h: number, d: number, x: number, y: number, z: number) =>
          arr.push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
        const y0 = HILL_Y + 0.42;
        for (const [px, pz] of [[-11.5, -29], [11.5, -29], [-11.5, -41], [11.5, -41]] as [number, number][]) {
          B(gBed, 8.2, 0.14, 8.0, px, y0, pz);                                           // gravel bed
          for (const s of [-1, 1]) { B(gHedge, 8.2, 0.6, 0.5, px, y0 + 0.3, pz + s * 3.75); B(gHedge, 0.5, 0.6, 8.0, px + s * 3.85, y0 + 0.3, pz); } // clipped border
          B(gHedge, 7.0, 0.44, 0.34, px, y0 + 0.24, pz); B(gHedge, 0.34, 0.44, 7.0, px, y0 + 0.24, pz); // broderie cross
          const fm = [gSage, gSanto, gSanto, gSage]; let qi = 0;
          for (const sz of [-1, 1]) for (const sx of [-1, 1]) B(fm[qi++], 2.5, 0.16, 2.5, px + sx * 1.9, y0 + 0.11, pz + sz * 1.9); // low muted infill
          for (const sz of [-1, 1]) for (const sx of [-1, 1]) gTopi.push(new THREE.SphereGeometry(0.46, 8, 6).translate(px + sx * 3.4, y0 + 0.55, pz + sz * 3.4)); // corner topiary
          gTopi.push(new THREE.ConeGeometry(0.62, 2.1, 8).translate(px, y0 + 1.15, pz)); // central cone
        }
        ([[gBed, parterreGravelMat], [gHedge, M.hedge], [gTopi, M.hedgeL], [gSage, sageMat], [gSanto, santoMat]] as [THREE.BufferGeometry[], THREE.Material][])
          .forEach(([geos, mat]) => { if (!geos.length) return; const m = mergeGeometries(geos); geos.forEach(g => g.dispose()); if (m) { const mesh = new THREE.Mesh(m, mat); mesh.receiveShadow = true; mesh.castShadow = true; scene.add(mesh); } });
        // Potted clipped bays along the walks (terracotta pot + green ball) — a
        // sober pair flanking the cross-axis, not a row of fruit trees.
        for (const [lx, lz] of [[-18, -35], [18, -35]] as [number, number][]) {
          scene.add(mk(new THREE.CylinderGeometry(0.6, 0.42, 1.0, 10), M.tile, lx, HILL_Y + 0.9, lz));
          scene.add(mk(new THREE.CylinderGeometry(0.66, 0.6, 0.18, 10), M.trim, lx, HILL_Y + 1.42, lz));
          const ball = mk(new THREE.SphereGeometry(1.0, 10, 8), M.hedge, lx, HILL_Y + 2.45, lz); ball.castShadow = true; scene.add(ball);
        }
        // Stone fountain on the cross-axis (0,-35): basin + water + tazza + finial
        const fountainWater = new THREE.MeshStandardMaterial({ color: "#5E7E86", roughness: 0.24, metalness: 0.1, transparent: true, opacity: 0.85, envMapIntensity: 0.6 });
        scene.add(mk(new THREE.CylinderGeometry(3.1, 3.3, 0.8, 20), M.trim, 0, HILL_Y + 0.4, -35));        // basin wall
        scene.add(mk(new THREE.CylinderGeometry(2.7, 2.7, 0.45, 20), fountainWater, 0, HILL_Y + 0.62, -35)); // water
        scene.add(mk(new THREE.CylinderGeometry(0.5, 0.75, 1.3, 12), M.trim, 0, HILL_Y + 1.1, -35));       // pedestal
        scene.add(mk(new THREE.CylinderGeometry(1.3, 0.5, 0.35, 16), M.trim, 0, HILL_Y + 1.85, -35));      // upper tazza
        scene.add(mk(new THREE.CylinderGeometry(0.18, 0.28, 0.7, 10), M.trim, 0, HILL_Y + 2.3, -35));      // stem
        scene.add(mk(new THREE.SphereGeometry(0.26, 10, 8), M.bronze, 0, HILL_Y + 2.75, -35));             // finial
      }
      // Two marble benches on the cross path (z -35 gap between hedge rows)
      for (const bx of [-13, 13]) {
        scene.add(mk(new THREE.BoxGeometry(2.5, 0.06, 1), M.marble, bx, HILL_Y + 0.71, -35));
        scene.add(mk(new THREE.BoxGeometry(2.5, 0.35, 0.7), M.marbleVein, bx, HILL_Y + 0.52, -35));
        for (const s of [-0.9, 0.9]) scene.add(mk(new THREE.BoxGeometry(0.4, 0.35, 0.7), M.stoneD, bx + s, HILL_Y + 0.5, -35));
      }

      // ══ Owner review 2026-08-07 #4 (MOST IMPORTANT) — BUILT ON A HILL, TERRACED ══
      // A monumental cascade of garden terraces descends the slope in front of the
      // palace. The parterre forecourt is retained as terrace 1; below it two more
      // balustraded terraces step DOWN the hillside, linked by a grand central
      // stair on the −Z axis. Big retained bodies bury into the falling terrain so
      // the whole palace reads as a hilltop villa on multiple levels. All merged.
      {
        const gPave: THREE.BufferGeometry[] = [], gWallR: THREE.BufferGeometry[] = [],
              gTrimR: THREE.BufferGeometry[] = [], gGrassR: THREE.BufferGeometry[] = [];
        const B = (arr: THREE.BufferGeometry[], w: number, h: number, d: number, x: number, y: number, z: number) =>
          arr.push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
        // Rusticated retaining-wall face (proud ashlar courses) on a downhill edge.
        const retainX = (halfX: number, z: number, yTop: number, drop: number) => {
          B(gWallR, halfX * 2 + 0.4, drop + 0.6, 1.2, 0, yTop - drop / 2, z);       // wall body
          for (let ry = yTop - 0.3; ry > yTop - drop; ry -= 0.9)
            B(gTrimR, halfX * 2 + 0.7, 0.5, 0.4, 0, ry, z - 0.55);                  // proud courses
        };
        // Balustrade along X at (z), coping at yTop; central gap for the stair.
        const baluX = (halfX: number, z: number, yTop: number, gap: boolean) => {
          B(gTrimR, halfX * 2, 0.28, 0.7, 0, yTop + 0.15, z);                        // plinth rail
          B(gTrimR, halfX * 2, 0.24, 0.85, 0, yTop + 1.5, z);                        // coping
          for (let bx = -halfX + 0.7; bx <= halfX - 0.7; bx += 0.9) {
            if (gap && Math.abs(bx) < 7) continue;
            gTrimR.push(new THREE.CylinderGeometry(0.17, 0.21, 1.1, 8).translate(bx, yTop + 0.85, z));
          }
        };
        const baluZ = (x: number, z0: number, z1: number, yTop: number) => {
          B(gTrimR, 0.7, 0.28, z1 - z0, x, yTop + 0.15, (z0 + z1) / 2);
          B(gTrimR, 0.85, 0.24, z1 - z0, x, yTop + 1.5, (z0 + z1) / 2);
          for (let bz = z0 + 0.7; bz <= z1 - 0.7; bz += 0.9)
            gTrimR.push(new THREE.CylinderGeometry(0.17, 0.21, 1.1, 8).translate(x, yTop + 0.85, bz));
        };
        // Terrace 1 = the parterre forecourt (top ≈ HILL_Y+0.3): retain its front
        // (z −47) and flanks so it reads as a raised terrace, not flat ground.
        const t1 = HILL_Y + 0.3;
        retainX(40, -47, t1, 3.2);
        baluX(40, -47, t1, true);
        for (const sx of [-1, 1]) { B(gWallR, 1.2, 3.8, 31, sx * 40, t1 - 1.9, -31.5); baluZ(sx * 40, -47, -16, t1); }
        // Terraces 2 & 3 — full platforms stepping down, retained + balustraded.
        const terr: [number, number, number, number][] = [
          [HILL_Y - 3.0, -63, -47, 34], // T2
          [HILL_Y - 6.4, -79, -63, 28], // T3
        ];
        for (const [topY, zF, zB, hx] of terr) {
          const dep = zB - zF;
          B(gPave, hx * 2, 0.5, dep, 0, topY + 0.2, (zF + zB) / 2);         // paving deck
          B(gWallR, hx * 2, 14, dep, 0, topY - 7, (zF + zB) / 2);           // massive retained body (buried)
          retainX(hx, zF, topY, 3.4);
          baluX(hx, zF, topY, true);
          for (const sx of [-1, 1]) baluZ(sx * hx, zF, zB, topY);
          for (const sx of [-1, 1]) B(gGrassR, hx - 7, 0.16, dep - 5, sx * (hx * 0.48), topY + 0.46, (zF + zB) / 2);
        }
        // GRAND CENTRAL STAIR — cascades T1 → T2 → T3 on the −Z axis.
        { let y = t1 - 0.1, z = -47.4; for (let s = 0; s < 34; s++) { B(gPave, 13, 0.34, 1.3, 0, y, z); y -= 0.30; z -= 1.15; } }
        ([[gPave, courtyardMat, false], [gWallR, M.stoneD, true], [gTrimR, M.trim, true], [gGrassR, M.grassRich, false]] as [THREE.BufferGeometry[], THREE.Material, boolean][])
          .forEach(([geos, mat, sh]) => {
            if (!geos.length) return;
            const m = mergeGeometries(geos); geos.forEach(g => g.dispose());
            if (!m) return;
            const mesh = new THREE.Mesh(m, mat); mesh.castShadow = sh; mesh.receiveShadow = true; scene.add(mesh);
          });
      }
    }

    const palace=new THREE.Group(),clickTargets: THREE.Mesh[]=[];
    // Owner feedback 2026-08-06 #6B: under W2 the exterior is no longer a click-hub.
    // Wing hit-boxes move OUT of the raycast list into these anchors — they still
    // feed targetWorldPos (walkthrough highlightDoor light keeps working) but no
    // click target fires onRoomClick for a wing anymore; wings are reached through
    // the entrance hall. The onRoomClick/onRoomHover props and contracts are unchanged.
    const wingAnchors: THREE.Mesh[]=[];
    palace.position.y=HILL_Y+0.3; // Elevate palace slightly above terrain to prevent clipping
    // Track each section group for split/lift animation: {group, id, targetY, currentY, meshes}
    const sectionGroups: {group:THREE.Group,id:string,targetY:number,currentY:number,meshes:THREE.Mesh[],accent:string}[]=[];

    // W2 (WS3-7, owner decision 2): styleEra is coerced to the canon Roman
    // path under the flag — no data migration; flag OFF keeps the era fork.
    const isRenaissance = !W2 && styleEra === "renaissance";

    // Shared variables for entrance click target (assigned inside era branch)
    let centralGroup: THREE.Group;
    let centralBodyMeshes: THREE.Mesh[];
    let entranceCoreMeshes: THREE.Mesh[];
    let entrClickRadius = 10, entrClickHeight = 20;

    // Collect standalone materials/geometries for explicit cleanup
    const extraDisposables: THREE.Material[] = [];
    const extraGeoDisposables: THREE.BufferGeometry[] = [];
    // W3 canary handles (see the dome-load block below): the loaded GLB group,
    // the procedural rib mesh (to re-show on load failure), and an unmount guard.
    let w3DomeCanary: THREE.Group | null = null;
    let w3EntranceCaps: THREE.Group | null = null;
    let w3Roofs: THREE.Group | null = null;
    let w3RibMesh: THREE.Mesh | null = null;
    let w3Disposed = false;

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
      const arnoMat = mkPhys(THREE,{ color: "#5A8A7A", roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.6, envMapIntensity: 1.0 });
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
    // W1 retunes: garden green → sun-dried olive, teal water → warm sky reflection, mullions → canon ink
    const gardenGreen = new THREE.MeshStandardMaterial({ color: W1 ? "#66703E" : "#4A7A3A", roughness: 0.9 });
    const waterMat = new THREE.MeshStandardMaterial({ color: W1 ? "#8C9884" : "#4A7A7A", roughness: 0.7, metalness: 0, transparent: true, opacity: 0.45, envMapIntensity: W1 ? 0.3 : 0.1 });
    extraDisposables.push(gardenGreen, waterMat);

    // ── Helper: arched window assembly with shutters & deep reveal ──
    const mullionMat = new THREE.MeshStandardMaterial({ color: W1 ? INK : "#1A1A1A", roughness: 0.9, metalness: 0 });
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

    // ══ W2 grandeur pass (owner feedback 2026-08-06 #6B) — EAVE PARAPET RING ══
    // Raises the cornice line of the central block: a plaster parapet with
    // travertine cap and corner piers ringing the ROOF EAVE (outside the
    // overhang, so it never cuts the hipped tile slopes — Villa Rotonda-style
    // roof balustrade). The massing now steps: stair → facade → parapet ring →
    // roof ridge → crossing attic → drum → dome → lantern.
    // Shared canon materials, 12 static meshes, no new lights.
    if (W2) {
      const parX = vW / 2 + 1.45, parZ = vD / 2 + 1.15, parY = vH + 1.9; // eave line
      for (const s of [-1, 1]) {
        // Front/back parapet walls + caps — cap length ends 0.04 INSIDE the
        // corner piers (0.62 not 0.70): at 0.70 the cap end faces sat exactly
        // coplanar with the pier faces at ±(parX+0.35) and z-fought (#6).
        centralGroup.add(mk(new THREE.BoxGeometry(parX * 2 + 0.4, 0.8, 0.35), M.stoneL, 0, parY, s * parZ));
        centralGroup.add(mk(new THREE.BoxGeometry(parX * 2 + 0.62, 0.14, 0.5), M.trim, 0, parY + 0.45, s * parZ));
        // Side parapet walls + caps
        centralGroup.add(mk(new THREE.BoxGeometry(0.35, 0.8, parZ * 2 + 0.4), M.stoneL, s * parX, parY, 0));
        centralGroup.add(mk(new THREE.BoxGeometry(0.5, 0.14, parZ * 2 + 0.62), M.trim, s * parX, parY + 0.45, 0));
      }
      // Corner piers
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        centralGroup.add(mk(new THREE.BoxGeometry(0.7, 1.1, 0.7), M.trim, sx * parX, parY + 0.1, sz * parZ));
      }
    }

    // Arched windows on central domus walls (front and back)
    // Water stains: transparent facade decals — no depth write, and at +0.09
    // off the wall (was +0.06, which straddled the decorative wall panels'
    // front faces at +0.06 by only 0.01 — z-fighting sweep #6)
    const waterStainMat = new THREE.MeshStandardMaterial({ color: "#8A7860", roughness: 0.95, transparent: true, opacity: 0.15, depthWrite: false });
    for (let wi = 0; wi < 3; wi++) {
      const wx = -6 + wi * 6;
      // Front face (-Z), skip center (entrance)
      if (Math.abs(wx) > 2) {
        addArchedWindow(centralGroup, wx, vH * 0.5 + 1.3, -(vD / 2 + 0.05), 1.4, 2.2, "x", M.trim);
        // Water staining streak below front window
        centralGroup.add(mk(new THREE.BoxGeometry(0.6, 1.0, 0.02), waterStainMat, wx, vH * 0.5 + 1.3 - 1.5, -(vD / 2 + 0.09)));
      }
      // Back face (+Z)
      addArchedWindow(centralGroup, wx, vH * 0.5 + 1.3, (vD / 2 + 0.05), 1.4, 2.2, "x", M.trim);
      // Water staining streak below back window
      centralGroup.add(mk(new THREE.BoxGeometry(0.6, 1.0, 0.02), waterStainMat, wx, vH * 0.5 + 1.3 - 1.5, (vD / 2 + 0.09)));
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
    // ══ Owner review 2026-08-07 #3 — the entrance must read as the app LOGO:
    // a temple-front (columns + pediment) on a 3-STEP STYLOBATE. The steps nest
    // directly under the colonnade (the grand cascade continues down in front),
    // widening toward the ground exactly like the logo's crepidoma.
    if (W2) {
      centralGroup.add(mk(new THREE.BoxGeometry(15.6, 0.36, 8.2), M.marble, 0, 0.18, vestZ));
      centralGroup.add(mk(new THREE.BoxGeometry(14.0, 0.36, 7.4), M.marble, 0, 0.54, vestZ));
      centralGroup.add(mk(new THREE.BoxGeometry(12.6, 0.36, 6.8), M.marble, 0, 0.90, vestZ));
    }
    // Portico platform
    centralGroup.add(mk(new THREE.BoxGeometry(12, 0.4, 7), M.marble, 0, 1.12, vestZ));

    // 6 Corinthian columns
    // Fluting material — subtle dark lines for column grooves
    const fluteMat = new THREE.MeshStandardMaterial({ color: "#C8C0A8", roughness: 0.7, metalness: 0 });
    // ══ Owner review 2026-08-08 r6 #4 — "de ingang valt niet op (anders kleuren?)".
    // The temple-front now reads as a distinct PIETRA-SERENA (grey-blue) order —
    // Brunelleschi's signature grey stone against the cream plaster — so the whole
    // colonnade + pediment pops as a framed entrance instead of blending in.
    const serenaOrder = new THREE.MeshStandardMaterial({ color: "#7C8288", roughness: 0.72, metalness: 0, envMapIntensity: 0.5, normalMap: stoneTex.normalMap, normalScale: new THREE.Vector2(0.2, 0.2) });
    extraDisposables.push(fluteMat, serenaOrder);
    const centralFluteGeo = new THREE.BoxGeometry(0.02, 5.2, 0.06);
    extraGeoDisposables.push(centralFluteGeo);
    for (let ci = 0; ci < 6; ci++) {
      const cx = -5 + ci * 2;
      // Column shaft — thicker radius 0.65 (owner review #3: columns must read)
      centralGroup.add(mk(new THREE.CylinderGeometry(0.65, 0.7, 5.5, 18), serenaOrder, cx, 4.3, vestZ));
      // Column fluting — 8 thin dark vertical stripes around circumference
      for (let fl = 0; fl < 8; fl++) {
        const fa = (fl / 8) * Math.PI * 2;
        const stripe = mk(centralFluteGeo, fluteMat,
          cx + Math.cos(fa) * 0.67, 4.3, vestZ + Math.sin(fa) * 0.67);
        stripe.rotation.y = fa;
        centralGroup.add(stripe);
      }
      // Echinus + flared box-capital — W3 replaces these with a scanned
      // Corinthian capital GLB (entrance_w3.glb), so skip when the flag is on.
      if (!W3) {
      // Echinus — small cylinder below capital for abacus/echinus effect
      centralGroup.add(mk(new THREE.CylinderGeometry(0.7, 0.65, 0.15, 16), serenaOrder, cx, 6.775, vestZ));
      // Flared capital — wider box + transitional cylinder
      centralGroup.add(mk(new THREE.BoxGeometry(1.4, 0.3, 1.4), serenaOrder, cx, 7.15, vestZ));
      centralGroup.add(mk(new THREE.CylinderGeometry(0.7, 0.6, 0.3, 16), serenaOrder, cx, 6.95, vestZ));
      }
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

    // Marble entablature beam — 11.94 not 12: at 12 its end faces at x=±6 were
    // exactly coplanar with the frieze-band end faces in their y-overlap
    // (7.6–7.8) and z-fought from side angles (z-fighting sweep #6)
    centralGroup.add(mk(new THREE.BoxGeometry(11.94, 0.5, 2), serenaOrder, 0, 7.55, vestZ));

    // TRIGLYPHS — 6 grooved vertical panels across the frieze area
    for (let ti = 0; ti < 6; ti++) {
      const tx = -5 + ti * 2;
      centralGroup.add(mk(new THREE.BoxGeometry(0.4, 0.5, 0.15), serenaOrder, tx, 7.6, vestZ - 1.05));
    }

    // Classical triangular pediment — spans full entablature (12 units wide)
    const pedBaseY = 7.9, pedHalfSpan = 6.2, pedAngle = Math.atan2(1.1, pedHalfSpan);
    const pedSlab = Math.sqrt(pedHalfSpan * pedHalfSpan + 1.1 * 1.1) + 0.3; // slab length
    const pedApexY = pedBaseY + 1.1;
    const pedLeft = mk(new THREE.BoxGeometry(pedSlab, 0.28, 2.2), serenaOrder, -pedHalfSpan / 2, pedBaseY + 0.55, vestZ);
    pedLeft.rotation.z = pedAngle;
    centralGroup.add(pedLeft);
    // Right slab is 0.04 shallower (2.16): both raking slabs cross at the apex
    // and their front/back faces at vestZ±1.1 were exactly coplanar in the
    // overlap — the left slab now wins cleanly there (z-fighting sweep #6).
    const pedRight = mk(new THREE.BoxGeometry(pedSlab, 0.28, 2.16), serenaOrder, pedHalfSpan / 2, pedBaseY + 0.55, vestZ);
    pedRight.rotation.z = -pedAngle;
    centralGroup.add(pedRight);
    // Pediment base beam — depth 2.16 (was 2.2: its faces sat coplanar with the
    // raking-slab faces where the slab ends dip to y≈7.74) and +0.02 up so its
    // top face no longer shares the frieze-band top plane at y 8.0 (#6).
    centralGroup.add(mk(new THREE.BoxGeometry(pedHalfSpan * 2 + 1, 0.2, 2.16), serenaOrder, 0, pedBaseY + 0.02, vestZ));

    // CORONA / GEISON — projecting cornice shelf
    centralGroup.add(mk(new THREE.BoxGeometry(pedHalfSpan * 2 + 1.2, 0.15, 2.5), serenaOrder, 0, pedBaseY - 0.15, vestZ));

    // RAKING CORNICE MOLDING — gilded strips along pediment slopes
    const rakLeft = mk(new THREE.BoxGeometry(pedSlab, 0.10, 0.15), M.gold, -pedHalfSpan / 2, pedBaseY + 0.55 + 0.18, vestZ);
    rakLeft.rotation.z = pedAngle;
    centralGroup.add(rakLeft);
    // 0.13 deep (left strip is 0.15): the two gilded strips cross at the apex —
    // equal depths left their front faces coplanar there (z-fighting sweep #6)
    const rakRight = mk(new THREE.BoxGeometry(pedSlab, 0.10, 0.13), M.gold, pedHalfSpan / 2, pedBaseY + 0.55 + 0.18, vestZ);
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
      // W1 (WS3-4): tympanum reads as honed travertine — the gold hue moves to the sun, not the stone
      const tymMat = new THREE.MeshStandardMaterial({
        color: W1 ? TRAVERTINE_GROUT : "#D8B458", roughness: W1 ? 0.7 : 0.75, metalness: 0,
        envMapIntensity: W1 ? 0.7 : 1,
        normalMap: clayPlasterTex.normalMap, normalScale: new THREE.Vector2(.6, .6),
      });
      const tymMesh = new THREE.Mesh(tymGeo, tymMat);
      // 0.03 in front of the raking-slab faces (was 0.01 — depth-marginal on
      // the long dolly; z-fighting sweep #6)
      tymMesh.position.set(0, pedBaseY + 0.05, vestZ - 1.13);
      tymMesh.rotation.y = Math.PI; // face outward (-Z, toward entrance)
      centralGroup.add(tymMesh);

      if(!W2){
        // SCULPTURAL RELIEF — laurel wreath frame in bronze (legacy: empty wreath)
        // (tracks the tympanum plane at vestZ-1.13 so the bronze keeps the same
        // relief now the plane moved 0.02 forward — z-fighting sweep #6)
        const wreathGeo = new THREE.TorusGeometry(1.2, 0.08, 8, 24);
        const wreathMesh = new THREE.Mesh(wreathGeo, M.bronze);
        wreathMesh.position.set(0, 8.65, vestZ - 1.145);
        centralGroup.add(wreathMesh);
        // Ribbon tails at bottom of wreath — two angled crossing strips
        const ribbonL = mk(new THREE.BoxGeometry(0.8, 0.06, 0.15), M.bronze, -0.3, 7.5, vestZ - 1.145);
        ribbonL.rotation.z = 0.35;
        centralGroup.add(ribbonL);
        const ribbonR = mk(new THREE.BoxGeometry(0.8, 0.06, 0.15), M.bronze, 0.3, 7.5, vestZ - 1.145);
        ribbonR.rotation.z = -0.35;
        centralGroup.add(ribbonR);
      }else{
        // ══ W2 (WS3-5) — the owner's name on the tympanum, in Fraunces ══
        // Gold leaf over the honed travertine (the tympanum is gold's one
        // allowed home besides frames — canon dogma 3), with an ink carve
        // shadow for relief. Redraws when the Fraunces webfont lands or the
        // store hydrates the name; falls back to the localized hall label so
        // the pediment never reads blank. Personal by ~0:08 of the dolly.
        const nameC=document.createElement("canvas");nameC.width=1024;nameC.height=160;
        const nameCtx=nameC.getContext("2d")!;
        const nameTex=new THREE.CanvasTexture(nameC);nameTex.colorSpace=THREE.SRGBColorSpace;nameTex.anisotropy=4;
        const drawTymName=()=>{
          const label=(ownerNameRef.current||entranceHallLabelRef.current||"").toUpperCase();
          nameCtx.clearRect(0,0,1024,160);
          nameCtx.font="600 92px Fraunces, Georgia, serif";
          nameCtx.textAlign="center";nameCtx.textBaseline="middle";
          try{
            (nameCtx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing="10px";
          }catch{/* letterSpacing unsupported — plain tracking is fine */}
          nameCtx.fillStyle=INK;nameCtx.fillText(label,515,84,940);
          nameCtx.fillStyle=GOLD;nameCtx.fillText(label,512,80,940);
          nameTex.needsUpdate=true;
        };
        drawTymName();
        if(document.fonts?.ready)document.fonts.ready.then(drawTymName).catch(()=>{});
        tymNameRedrawRef.current=drawTymName;
        // Transparent decal over the tympanum: 0.03 in front of the tym plane
        // (which itself moved to vestZ-1.13), no depth write + late renderOrder
        // so the gold leaf can never depth-spar with the stone or the window
        // glass on the long dolly (z-fighting sweep #6).
        const namePlane=new THREE.Mesh(new THREE.PlaneGeometry(5.6,0.875),new THREE.MeshBasicMaterial({map:nameTex,transparent:true,depthWrite:false}));
        namePlane.position.set(0,8.28,vestZ-1.16);
        namePlane.rotation.y=Math.PI; // face outward with the tympanum (-Z)
        namePlane.renderOrder=2;
        centralGroup.add(namePlane);
      }

    }

    // ── DEEP PORTAL (owner r6 #4 — the entrance must READ) — the doors sit in a
    //    dark recessed niche framed by a bold pietra-serena architrave + a
    //    projecting hood cornice, so the opening reads as a deep shadowed portal
    //    that draws the eye (dark void + grey stone frame against cream walls).
    const portalDark = new THREE.MeshStandardMaterial({ color: "#17120C", roughness: 0.95, metalness: 0 });
    extraDisposables.push(portalDark);
    centralGroup.add(mk(new THREE.BoxGeometry(4.9, 6.0, 0.5), portalDark, 0, 4.5, -(vD / 2 - 0.15)));   // dark reveal behind the doors
    // bold serena architrave frame (proud), + jambs, + hood cornice
    centralGroup.add(mk(new THREE.BoxGeometry(5.5, 0.55, 0.45), serenaOrder, 0, 7.7, -(vD / 2 + 0.12)));  // lintel/architrave head
    centralGroup.add(mk(new THREE.BoxGeometry(6.2, 0.4, 0.7), serenaOrder, 0, 8.05, -(vD / 2 + 0.22)));   // projecting hood cornice
    for (const s of [-1, 1]) centralGroup.add(mk(new THREE.BoxGeometry(0.55, 6.4, 0.42), serenaOrder, s * 2.72, 4.5, -(vD / 2 + 0.12))); // jambs
    // Grand double doors
    centralGroup.add(mk(new THREE.BoxGeometry(4.5, 5.5, 0.25), M.doorRich, 0, 4.3, -(vD / 2 + 0.1)));
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
    centralGroup.add(mk(new THREE.BoxGeometry(0.3, 5.5, 0.15), serenaOrder, -2.8, 4.3, -(vD / 2 + 0.18)));
    centralGroup.add(mk(new THREE.BoxGeometry(0.3, 5.5, 0.15), serenaOrder,  2.8, 4.3, -(vD / 2 + 0.18)));
    // Pilaster capitals
    centralGroup.add(mk(new THREE.BoxGeometry(0.4, 0.2, 0.2), serenaOrder, -2.8, 7.25, -(vD / 2 + 0.18)));
    centralGroup.add(mk(new THREE.BoxGeometry(0.4, 0.2, 0.2), serenaOrder,  2.8, 7.25, -(vD / 2 + 0.18)));
    // Threshold / entrance step
    centralGroup.add(mk(new THREE.BoxGeometry(5.5, 0.2, 1.5), M.marble, 0, 1.2, -(vD / 2 + 0.8)));

    // ══ W2 grandeur pass (owner feedback 2026-08-06 #6B) — MONUMENTAL STAIR ══
    // A widening marble cascade from the portico platform down to the courtyard:
    // the royal approach to the ONE door. Widths are capped at 15 so the lowest
    // tread clears the wing-2/3 gallery foundations that flank the forecourt
    // (perp distance > 4.5 at every tread corner). Two travertine plinths with
    // bronze urns flank the foot of the stair. Shared materials, 10 meshes.
    if (W2 && !W3) { // W3 replaces the cascade + urns with entrance_w3.glb (grander stair, parapets, scanned urns)
      for (let si = 0; si < 4; si++) {
        centralGroup.add(mk(new THREE.BoxGeometry(12 + si, 0.22, 1.5), M.marble, 0, 0.92 - si * 0.21, -(15.6 + si * 1.05)));
      }
      for (const s of [-1, 1]) {
        // Plinth 0.03 lower so its base sinks just below the courtyard disc at
        // world y 8.35 instead of resting exactly ON its plane (z-fighting
        // sweep #6); the urn follows to keep the same seat.
        centralGroup.add(mk(new THREE.BoxGeometry(1.7, 1.6, 1.7), M.trim, s * 9.4, 0.82, -21.2));
        centralGroup.add(mk(new THREE.CylinderGeometry(0.42, 0.62, 1.15, 10), M.bronze, s * 9.4, 2.22, -21.2));
        centralGroup.add(mk(new THREE.CylinderGeometry(0.55, 0.38, 0.35, 10), M.bronze, s * 9.4, 2.97, -21.2));
      }
    }

    // ── WALL SCONCES — central domus front face (-Z) ──
    for (const [x, y] of [[-8, vH * 0.4 + 1.3], [-3, vH * 0.4 + 1.3], [3, vH * 0.4 + 1.3], [8, vH * 0.4 + 1.3]] as [number, number][]) {
      // Sconce bracket
      centralGroup.add(mk(new THREE.BoxGeometry(0.15, 0.08, 0.4), M.bronze, x, y, -(vD / 2 + 0.15)));
      // Warm glow (small point light, skip on mobile)
      if(!isMobileGPU()){const sconce = new THREE.PointLight("#FFD080", 0.08, 6);
      sconce.position.set(x, y + 0.4, -(vD / 2 + 0.4));
      centralGroup.add(sconce);}
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
      // Warm lantern light (skip on mobile)
      if(!isMobileGPU()){const lantern = new THREE.PointLight("#FFE0A0", 0.12, 8);
      lantern.position.set(lx, 6.5, vestZ);
      centralGroup.add(lantern);}
    }

    // ── GROUND-LEVEL UPLIGHTS — outermost vestibulum column bases (skip on mobile) ──
    if(!isMobileGPU()){for (const ux of [-5, 5]) {
      const uplight = new THREE.PointLight("#FFE8C0", 0.06, 5);
      uplight.position.set(ux, 1.5, vestZ);
      centralGroup.add(uplight);
    }}

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

    // ── MOSAIC FLOOR BORDER — ring around impluvium (W1: travertine, gold is frames/tympanum only) ──
    const mosaicRing = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.08, 4, 32), W1 ? M.trim : M.goldBright);
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
    // ══ Owner review 2026-08-06 #1 — THE DOME IS THE HERO, BY HEIGHT ══
    // The render read the dome as too low/small, drowning between the towers and
    // eaves. The 10%-rule governs the GROUND footprint, not the height — so the
    // TAMBOER (drum) is lengthened dramatically (rDrumH 5.2→11.0) while the
    // diameter drops to ⌀~16.4 (rDrumR 8.2) so the footprint stays ~7%. A tall
    // TWO-STAGE crossing attic (a broad lower storey + a stepped upper stage,
    // both travertine-corniced) lifts the drum monumentally off the roof so the
    // transition block→attic→drum→shell→lantern is gradual — no thin stem.
    // Result (local frame, palace at world +8.3): drum top L≈19.5, shell apex
    // L≈27.7 (world ≈36), lantern finial L≈35 (world ≈43). Every casa-torre is
    // now capped well below (tallest world 31.3), so the lantern-crowned dome
    // unmistakably bekroont the silhouette from the arrival dolly. Materials stay
    // canon; geometry counts stay flat (same pilaster/window/rib loops, bigger
    // dimensions + two extra attic boxes).
    const rDomeR = W2 ? 8.0 : 8;
    const rDrumR = W2 ? 8.2 : 8.5, rDrumH = W2 ? 11.0 : 3.5;
    const drumBaseY = W2 ? vH + 5.5 : vH + 1.8;
    if (W2) {
      // TWO-STAGE monumental crossing carrying the raised drum. Stage 1 (broad)
      // rises from the roof ridge; stage 2 (stepped-in) meets the drum base. Each
      // stage tops with a travertine cornice band; the drum base cornice lands
      // INSIDE the upper stage so nothing is coplanar (all cornice tops offset in
      // Y from the box tops they cap — no z-fight from a high camera, #6).
      // Stage 1: broad lower attic (villa roof → ~L 12), 19×17.4.
      centralGroup.add(mk(new THREE.BoxGeometry(19, 4.6, 17.4), ochreWall, 0, vH + 2.6, 0));
      centralGroup.add(mk(new THREE.BoxGeometry(19.8, 0.34, 18.2), M.trim, 0, vH + 5.0, 0));
      // Stage 2: stepped-in upper drum-base storey carrying the drum (⌀16.4),
      // 17.4×17.4 so the drum base cornice (⌀17.2) lands inside it — the drum
      // sits ON a masonry crossing, never on a thin stem. Rises to just under the
      // drum base cornice.
      centralGroup.add(mk(new THREE.BoxGeometry(17.4, 3.4, 17.4), ochreWall, 0, vH + 5.9, 0));
      centralGroup.add(mk(new THREE.BoxGeometry(18.0, 0.3, 18.0), M.trim, 0, vH + 7.55, 0));
      // Corner acroteria piers on stage 2 anchoring the drum visually (canon
      // travertine, no gold) — four squat piers at the upper-stage corners.
      for (const sx of [-1, 1]) for (const sz of [-1, 1])
        centralGroup.add(mk(new THREE.BoxGeometry(1.1, 1.6, 1.1), M.trim, sx * 7.7, vH + 7.0, sz * 7.7));
    }
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
    // Drum windows — W2: a full tamboer window ring (1.05×2.9) so the golden-hour
    // glass reads as a glowing band under the dome; legacy 0.7×1.6.
    // W3 replaces these flat stickers with modeled arched thermal-bay aediculae.
    if (!W3) for (let dw = 0; dw < 12; dw++) {
      const da = (dw / 12) * Math.PI * 2;
      centralGroup.add(mk(new THREE.BoxGeometry(W2 ? 1.05 : 0.7, W2 ? 2.9 : 1.6, 0.12), M.win,
        Math.cos(da) * (rDrumR + 0.05), drumBaseY + rDrumH * 0.6, Math.sin(da) * (rDrumR + 0.05)));
    }
    // Hemispherical dome — W1: verdigris teal is off-canon; aged sun-struck bronze instead.
    // W2 (Sette Sorelle iter 2, owner brief): the low-roughness metal shell read
    // as a MIRROR-GOLD Taj-Mahal dome and broke canon dogma (gold = lantern +
    // tympanum only). Brunelleschi instead: matte terracotta coppo (M.tile
    // family, one shade deeper red so the big smooth curve doesn't wash pink),
    // metalness 0, the same coppo maps as the roofs, and calm env response —
    // the golden hour warms it like every other roof; gold stays the crown.
    const domeMat = new THREE.MeshStandardMaterial({
      color: W2 ? '#A5674E' : (W1 ? '#8A6F52' : '#6B9A85'),
      roughness: W2 ? 0.82 : 0.65, metalness: W2 ? 0 : (W1 ? 0.45 : 0.35),
      map: W2 ? roofTileTex.map : null,
      normalMap: W2 ? roofTileTex.normalMap : clayPlasterTex.normalMap,
      normalScale: new THREE.Vector2(W2 ? 0.7 : 1.2, W2 ? 0.7 : 1.2),
      roughnessMap: W2 ? roofTileTex.roughnessMap : clayPlasterTex.roughnessMap,
      envMapIntensity: W2 ? 0.45 : (W1 ? 0.85 : 0.7),
    });
    extraDisposables.push(domeMat);
    const rDome = new THREE.Mesh(
      new THREE.SphereGeometry(rDomeR, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5),
      domeMat
    );
    rDome.position.set(0, drumBaseY + rDrumH + 0.2, 0);
    rDome.castShadow = true;
    rDome.visible = !W3; // W3 canary: Blender dome-shell GLB replaces this
    centralGroup.add(rDome);
    // Dome exterior ribs — 8 radial coffers running from drum top toward oculus.
    // ══ Owner review 2026-08-06 #2 — SOLID SHELL, ribs as ACCENT not frame ══
    // The old ribs read as a thin parasol frame (spichtig white spokes into the
    // sky). Now the terracotta shell is the massive read (coppo maps, warm
    // terracotta, above) and the 8 meridians become BROADER, LOWER-CONTRAST
    // bands: much wider (Z 1.05→0.7 taper vs 0.46), a touch less proud (0.26),
    // and a SUBDUED warm-cream travertine (near the shell, not stark white) so
    // they lie neatly ON the surface as ribs, never as free spokes. All 56
    // segments merge into ONE static mesh (legacy loop was 40 draw calls).
    const domeOriginY = drumBaseY + rDrumH + 0.2;
    if (W2) {
      // Subdued warm-cream rib stone — lower contrast against the terracotta
      // shell than stark M.trim white; canon travertine family, no gold.
      const ribMat = new THREE.MeshStandardMaterial({ color: "#CDBE9E", roughness: 0.64, metalness: 0, envMapIntensity: 0.55 });
      extraDisposables.push(ribMat);
      const ribGeos: THREE.BufferGeometry[] = [];
      const RIB_SEGS = 7, RIB_SWEEP = Math.PI * 0.47; // ends tucked under the oculus disc (r≈0.75 < 1.5)
      const segLen = (rDomeR * RIB_SWEEP) / RIB_SEGS + 0.30; // overlap so the rib reads continuous
      for (let r = 0; r < 8; r++) {
        const ra = (r / 8) * Math.PI * 2;
        for (let seg = 0; seg < RIB_SEGS; seg++) {
          const phi = ((seg + 0.5) / RIB_SEGS) * RIB_SWEEP;
          const g = new THREE.BoxGeometry(0.26, segLen, 1.05 - seg * 0.11); // X=proud depth (lower), Y=meridian run, Z=WIDTH (broad, tapers toward the crown)
          // Orient: local +X → outward surface normal, local +Y → meridian tangent
          g.rotateZ(phi);
          g.rotateY(-ra);
          const rc = rDomeR + 0.05; // rib center just above the shell — reads as a raised band, most of the 0.26 rides proud but reads flat/wide
          g.translate(Math.cos(ra) * rc * Math.cos(phi), domeOriginY + rc * Math.sin(phi), Math.sin(ra) * rc * Math.cos(phi));
          ribGeos.push(g);
        }
      }
      const ribMerged = mergeGeometries(ribGeos);
      ribGeos.forEach(g => g.dispose());
      if (ribMerged) {
        extraGeoDisposables.push(ribMerged);
        const ribMesh = new THREE.Mesh(ribMerged, ribMat);
        ribMesh.castShadow = true;
        ribMesh.visible = !W3; // W3 canary: rib geometry is baked into the GLB
        w3RibMesh = ribMesh; // handle for the W3 fallback path
        centralGroup.add(ribMesh);
      }
    } else {
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
    }
    // Oculus + lantern — W3 bakes these into the hero-crown GLB (colonnaded
    // lantern with an emissive gold finial), so skip the procedural build when on.
    if (!W3) {
    // Oculus opening (dark circle at apex)
    centralGroup.add(mk(new THREE.CylinderGeometry(1.5, 1.5, 0.15, 24), M.stoneD, 0, drumBaseY + rDrumH + rDomeR + 0.1, 0));
    // Oculus rim — W2: travertine collar the eight meridians die into (canon:
    // gold is lantern + tympanum ONLY — the gold band moved off the shell with
    // the rest of the Taj look); legacy keeps the bold gold band.
    centralGroup.add(mk(new THREE.TorusGeometry(1.5, 0.18, 8, 24), W2 ? M.trim : M.gold, 0, drumBaseY + rDrumH + rDomeR + 0.2, 0));
    // Lantern above oculus — cylinder with 8 windows, cone roof, gold finial.
    // ══ Owner review 2026-08-06 #2 — FORSER lantaarntje, in proportion to the
    // now much taller/higher dome. Bigger cylinder (R 1.3→1.7), taller (H 2.6→
    // 3.4), a travertine colonnade collar (8 corner pilasters), a broader kap,
    // and a bigger gold-finial ball+spike so the crown reads unmistakably from
    // the arrival dolly. Gold stays lantern-finial + tympanum ONLY (canon).
    const lanternY = drumBaseY + rDrumH + rDomeR + 0.35;
    const lanR = W2 ? 1.7 : 0.8, lanH = W2 ? 3.4 : 1.5;
    // Travertine base ring the lantern stands on (reads as a proper podium)
    if (W2) centralGroup.add(mk(new THREE.CylinderGeometry(lanR + 0.5, lanR + 0.6, 0.4, 16), M.trim, 0, lanternY + 0.2, 0));
    centralGroup.add(mk(new THREE.CylinderGeometry(lanR, lanR, lanH, 16), M.stoneL, 0, lanternY + lanH / 2 + (W2 ? 0.4 : 0), 0));
    const lanCoreY = lanternY + lanH / 2 + (W2 ? 0.4 : 0);
    for (let lw = 0; lw < (W2 ? 8 : 6); lw++) {
      const lwa = (lw / (W2 ? 8 : 6)) * Math.PI * 2;
      centralGroup.add(mk(new THREE.BoxGeometry(W2 ? 0.55 : 0.25, W2 ? 1.7 : 0.55, 0.1), M.win,
        Math.cos(lwa) * (lanR + 0.02), lanCoreY, Math.sin(lwa) * (lanR + 0.02)));
      // Corner colonnette (canon travertine) between each pair of lights
      if (W2) {
        const cpa = ((lw + 0.5) / 8) * Math.PI * 2;
        centralGroup.add(mk(new THREE.CylinderGeometry(0.13, 0.13, lanH, 8),
          M.col, Math.cos(cpa) * (lanR + 0.05), lanCoreY, Math.sin(cpa) * (lanR + 0.05)));
      }
    }
    const lanTopY = lanternY + lanH + (W2 ? 0.4 : 0);
    // Lantern entablature + broad cone kap
    if (W2) centralGroup.add(mk(new THREE.CylinderGeometry(lanR + 0.35, lanR + 0.2, 0.35, 16), M.trim, 0, lanTopY + 0.18, 0));
    centralGroup.add(mk(new THREE.ConeGeometry(W2 ? 1.65 : 0.6, W2 ? 2.4 : 1.0, 16), M.trim, 0, lanTopY + (W2 ? 1.55 : 0.5), 0));
    // Gold finial: ball + spike (canon gold — lantern/tympanum only)
    centralGroup.add(mk(new THREE.SphereGeometry(W2 ? 0.45 : 0.18, 12, 8), M.goldBright, 0, lanTopY + (W2 ? 3.0 : 0.55), 0));
    if (W2) centralGroup.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), M.goldBright, 0, lanTopY + 3.9, 0));
    } // end !W3 — procedural oculus + lantern (replaced by the W3 crown GLB)

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
    // ══ W3 CANARY — Blender dome-shell GLB (docs/BLENDER_EXTERIOR_MASTERPLAN.md,
    // Wave 0 pipeline canary). Streams a Blender-authored dome shell (terracotta
    // coppo + travertine meridian ribs, baked AO on UV0) through the production
    // modelLoader, dropping it onto the exact procedural dome origin and hiding
    // the procedural shell/ribs. try/catch: any failure silently keeps the
    // (re-shown) procedural dome. Material is CLONED before mutation so the
    // shared cache master is never poisoned; the clone is only removed — never
    // disposed — at unmount (loadModel returns a geometry/material-sharing clone).
    //
    // Wave-1 hero crown: an ogival ribbed terracotta shell + 12 arched drum
    // thermal-bay aediculae (dark glass + keystone) replacing the procedural dome,
    // ribs and flat drum-window stickers. DRACO-compressed GLB with AO baked on
    // UV0 (CSP allows the decoder worker + embedded textures: next.config.ts
    // worker-src/connect-src blob:). The crown is authored at absolute
    // centralGroup heights, so it drops in at the origin. A decimated LOD1
    // (~4.4k tris) serves mobile GPUs. try/catch keeps the procedural crown.
    if (W3) {
      warmDracoDecoder(); // pre-warm the decoder worker so the first load doesn't stall the dolly
      const domeOrigin = new THREE.Vector3(0, 0, 0);
      // 3 baked LODs by GPU tier (maxEagerTextureSets: desktop 20 / mobile 4 / potato 2)
      const _q = getQuality();
      const _domeV = "?v=22"; // asset version — bump when re-authoring the crown/entrance/roof GLBs (cache-bust)
      const domePath = (_q.maxEagerTextureSets >= 12
        ? "/models/exterior/dome_w3.glb"         // desktop — full stepped courses
        : _q.maxEagerTextureSets <= 3
        ? "/models/exterior/dome_w3_lod2.glb"    // potato
        : "/models/exterior/dome_w3_lod1.glb")   // mobile
        + _domeV;
      loadModel(domePath).then((g) => {
        if (w3Disposed) return;
        g.traverse((c) => {
          const m = c as THREE.Mesh;
          if (!m.isMesh) return;
          const mat = (m.material as THREE.MeshStandardMaterial).clone(); // don't poison the cache master
          if (mat.aoMap) { mat.aoMap.channel = 0; mat.aoMapIntensity = 0.5; } // AO on UV0, softened so tiles/stone read brighter
          mat.envMapIntensity = 0.7; // brighter ambient for the tiled terracotta + cream stone
          // Terracotta now carries its colour in per-tile vertex colours (same
          // palette as the roofs); white base + matched envMap so the dome and
          // the roofs share the exact same colour combination + lighting response.
          if (mat.name.includes("clay")) { mat.color.setHex(0xFFFFFF); mat.vertexColors = true; mat.envMapIntensity = 0.55; mat.roughness = 0.9; }
          mat.needsUpdate = true;
          m.material = mat;
          m.castShadow = true;
          m.receiveShadow = true;
        });
        g.position.copy(domeOrigin);
        g.name = "w3_dome_canary";
        if (w3Disposed) return;
        centralGroup.add(g);
        w3DomeCanary = g;
      }).catch((err) => {
        // Fallback: re-show the procedural dome/ribs the flag had hidden.
        rDome.visible = true;
        if (w3RibMesh) w3RibMesh.visible = true;
        console.warn("[W3] dome canary load failed, using procedural dome", err);
      });
      // Wave-2 hero: scanned Corinthian capitals (Sketchfab, CC-BY — credit
      // "fts_ltx") on the 6 entrance columns, replacing the procedural box-caps.
      loadModel("/models/exterior/entrance_w3.glb" + _domeV).then((g) => {
        if (w3Disposed) return;
        g.traverse((c) => {
          const m = c as THREE.Mesh;
          if (!m.isMesh) return;
          const mat = (m.material as THREE.MeshStandardMaterial).clone();
          mat.envMapIntensity = 0.6;
          mat.needsUpdate = true;
          m.material = mat;
          m.castShadow = true; m.receiveShadow = true;
        });
        g.name = "w3_entrance_caps";
        if (w3Disposed) return;
        centralGroup.add(g);
        w3EntranceCaps = g;
      }).catch(() => { /* columns simply keep no ornate cap on load failure */ });
      // Wave-3 roofs (proof): modeled Tuscan coppi hip-roofs over the two front
      // pavilions, laid ADDITIVELY over the procedural roof slabs (the corps roofs
      // live in a merged bucket that can't be hidden without a step-0 un-merge).
      const roofPath = _q.maxEagerTextureSets >= 12
        ? "/models/exterior/roofs_w3.glb"        // desktop — full coppi
        : _q.maxEagerTextureSets <= 3
        ? "/models/exterior/roofs_w3_lod2.glb"   // potato
        : "/models/exterior/roofs_w3_lod1.glb";  // mobile
      loadModel(roofPath + _domeV).then((g) => {
        if (w3Disposed) return;
        g.traverse((c) => {
          const m = c as THREE.Mesh;
          if (!m.isMesh) return;
          const mat = (m.material as THREE.MeshStandardMaterial).clone();
          // Per-tile terracotta lives in the GLB vertex colours (like the dome);
          // white base + DoubleSide so no coppo is culled from any angle.
          mat.color.setHex(0xFFFFFF);
          mat.vertexColors = true;
          mat.side = THREE.DoubleSide;
          mat.roughness = 0.9;
          mat.envMapIntensity = 0.55;
          mat.needsUpdate = true;
          m.material = mat;
          m.castShadow = true; m.receiveShadow = true;
        });
        g.name = "w3_roofs";
        // The corps blocks live in massGroup (position.x = 2); these roofs are
        // authored in raw block coords, so shift +2 in X to seat on their walls.
        g.position.x = 2;
        if (w3Disposed) return;
        centralGroup.add(g);
        w3Roofs = g;
      }).catch(() => {});
    }
    // W2 grandeur: the raised two-stage crossing lifts the dome far higher — the
    // tap-is-travel cylinder grows with it so the whole silhouette (lantern
    // included) stays one big entrance target.
    entrClickRadius = 12; entrClickHeight = vH + rDrumH + rDomeR + (W2 ? 12 : 4);

    // ══════════════════════════════════════════
    // 5 ROMAN VILLA WINGS — colonnaded galleries with arched arcades & tower pavilions
    // ══════════════════════════════════════════
    const wingDefs = [{ room: WINGS[0], length: 22 }, { room: WINGS[1], length: 20 }, { room: WINGS[2], length: 18 }, { room: WINGS[3], length: 19 }, { room: WINGS[4], length: 21 }];
    // ══ W2 (Sette Sorelle iter 2, owner: "niet manu militari") — WING VARIATIO ══
    // Five identical wings read as a barracks diagram. Under W2 every wing keeps
    // its FUNCTIONAL contract — same length, same pavilion + door position, the
    // invisible anchor box (targetWorldPos → walkthrough highlight) untouched —
    // but the MASS varies: ridge heights ±15-25%, per-wing coppo pitch, one
    // broad-and-low wing, one wing carrying an open loggia storey under a
    // lifted roof, and shallow risalits (0.6-0.8 proud) with their own shed
    // roofs. From the dolly the plus-plan now reads as a complex grown around
    // the dome. Flag OFF: the exact legacy literals (7 / 5 / 0.26 everywhere).
    // [wall height, gallery width, roof pitch, loggia storey height, risalit depth]
    const WING_VAR: { wH: number, wW: number, pitch: number, loggia: number, risalit: number }[] = [
      { wH: 6.2, wW: 7,   pitch: 0.30, loggia: 0,   risalit: 0.6 }, // 0 rear — tallest ridge (+24%): the "oldest grange" behind the dome, beside the free rear tower
      { wH: 5.0, wW: 7,   pitch: 0.26, loggia: 2.4, risalit: 0   }, // 1 E — open loggia storey under a roof lifted 2.4; the low-E tower rises through it
      { wH: 4.2, wW: 7,   pitch: 0.30, loggia: 0,   risalit: 0   }, // 2 front-E — low (-16%) under Sorella E
      { wH: 5.9, wW: 7,   pitch: 0.22, loggia: 0,   risalit: 0.8 }, // 3 front-W — taller (+18%) + risalit: the front pair is deliberately unequal
      { wH: 4.3, wW: 8.6, pitch: 0.24, loggia: 0,   risalit: 0   }, // 4 W — broad & low (stockier profile; hooks to the lone W tower)
    ];
    // ══ W2 CORPS-DE-LOGIS re-layout (owner: "groter in de breedte / niet
    // manu militari") — bespoke world-bearing + length + attach-offset per
    // wing, replacing the (i/5)·2π radial windmill. The bearing IS the world
    // compass of the wing's outward axis (wg.rotation.y=angle+π maps local −Z
    // → world (sinθ,cosθ)). Two long ±X side-arms (breadth), two forward
    // returns framing the court, one rear wing; the −Z entrance axis is kept
    // wing-free (nearest wing 55° off). `len` OVERRIDES def.length under W2
    // (side-arms grow to 29). `att` is the radial attach-offset (was a flat 2).
    // Flag OFF ⇒ legacy angle=(i/5)·2π, len=def.length, att=2 (byte-identical).
    const D2R = Math.PI / 180;
    const WING_W2: { angle: number, len: number, att: number }[] = [
      { angle:   0 * D2R, len: 20, att: 2 }, // 0 rear — closes behind the dome (+Z)
      { angle:  82 * D2R, len: 29, att: 3 }, // 1 E side-arm — long, canted 8° forward
      { angle: 125 * D2R, len: 18, att: 2 }, // 2 front-E return — frames the court
      { angle: 235 * D2R, len: 19, att: 2 }, // 3 front-W return — deliberately unequal to #2
      { angle: 278 * D2R, len: 29, att: 3 }, // 4 W side-arm — long, broad & low
    ];
    const wingFluteGeo = new THREE.BoxGeometry(0.015, (5 - 0.5) * 0.9, 0.04); // colH = wH - 0.5, shared across all wing columns
    extraGeoDisposables.push(wingFluteGeo);
    // ── LEGACY/W1 RADIAL MASSING (flag OFF) ──────────────────────────────────
    // The 5 radial wings + their end-pavilions are the pre-W2 (W1) massing. Under
    // W2 (grondplan v3) this whole windmill is REPLACED by the one continuous
    // asymmetric corps below (blocks A–E + 7 casa-torri + 5 invisible anchors),
    // so it runs ONLY when the flag is off — flag OFF stays byte-identical.
    if (!W2) wingDefs.forEach((def, i) => {
      const angle = W2 ? WING_W2[i].angle : (i / 5) * Math.PI * 2;
      const wg = new THREE.Group();
      const WV = W2 ? WING_VAR[i] : null;
      const wW = WV ? WV.wW : 7, wH = WV ? WV.wH : 5, wL = W2 ? WING_W2[i].len : def.length;
      const roofLift = WV ? WV.loggia : 0; // loggia storey height — the roof rides up by this
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
      // W2 variatio: per-wing pitch, and the whole roof block rides on rB —
      // the wall top PLUS the loggia storey (wing 1), so a lifted roof needs
      // no duplicated geometry.
      const roofOverhang = 1.2;
      const roofAngle = WV ? WV.pitch : 0.26; // legacy ~15 degrees
      const rB = wH + roofLift; // roof base line
      const roofSlabW = (wW + roofOverhang * 2) / 2 + 0.3;
      const roofSlabL = wL + roofOverhang * 2;
      const wRidgeY = rB + 2.0 + Math.sin(roofAngle) * roofSlabW;
      const wRidgeCenterZ = -(vD / 2 + wL / 2);
      // Left slope
      const roofLeft = mk(new THREE.BoxGeometry(roofSlabW, 0.18, roofSlabL), M.tile, -(roofSlabW / 2 - 0.15), rB + 1.8, wRidgeCenterZ);
      roofLeft.rotation.z = roofAngle;
      addM(roofLeft);
      // Right slope
      const roofRight = mk(new THREE.BoxGeometry(roofSlabW, 0.18, roofSlabL), M.tile, (roofSlabW / 2 - 0.15), rB + 1.8, wRidgeCenterZ);
      roofRight.rotation.z = -roofAngle;
      addM(roofRight);
      // Front hip slope (triangular end piece — approximated as tapered box)
      const hipEndL = roofSlabW * 2 - 0.2;
      const roofFront = mk(new THREE.BoxGeometry(hipEndL, 0.18, roofSlabW * 1.05), M.tile, 0, rB + 1.8, wRidgeCenterZ + roofSlabL / 2 - roofSlabW * 0.4);
      roofFront.rotation.x = -roofAngle;
      addM(roofFront);
      // Back hip slope
      const roofBack = mk(new THREE.BoxGeometry(hipEndL, 0.18, roofSlabW * 1.05), M.tile, 0, rB + 1.8, wRidgeCenterZ - roofSlabL / 2 + roofSlabW * 0.4);
      roofBack.rotation.x = roofAngle;
      addM(roofBack);
      // Ridge beam along the top
      addM(mk(new THREE.BoxGeometry(0.3, 0.25, roofSlabL - roofSlabW * 1.6), M.tile, 0, wRidgeY - 0.05, wRidgeCenterZ));
      // Ridge cap tiles (half-cylinder) along the main ridge
      { const wrc = mk(new THREE.CylinderGeometry(0.15, 0.15, roofSlabL - roofSlabW * 1.6, 6, 1, false, 0, Math.PI), M.tile, 0, wRidgeY + 0.1, wRidgeCenterZ); wrc.rotation.x = -Math.PI / 2; addM(wrc); }
      // Fascia boards under eave overhangs (long sides)
      addM(mk(new THREE.BoxGeometry(roofSlabW * 2 + 0.1, 0.1, 0.15), M.door, 0, rB + 1.55, wRidgeCenterZ - roofSlabL / 2));
      addM(mk(new THREE.BoxGeometry(roofSlabW * 2 + 0.1, 0.1, 0.15), M.door, 0, rB + 1.55, wRidgeCenterZ + roofSlabL / 2));
      // Fascia boards on short (hip) ends
      addM(mk(new THREE.BoxGeometry(0.15, 0.1, roofSlabL + 0.1), M.door, -(roofSlabW - 0.1), rB + 1.55, wRidgeCenterZ));
      addM(mk(new THREE.BoxGeometry(0.15, 0.1, roofSlabL + 0.1), M.door, (roofSlabW - 0.1), rB + 1.55, wRidgeCenterZ));
      // ── W2: LOGGIA STOREY (wing 1) — an open colonnaded belvedere between
      // the wall cornice and the lifted roof: recessed plaster core, twin
      // travertine column screens, low parapets. The low-E tower shaft rises
      // through it (San Gimignano houses grow around their towers). Static
      // meshes in the wing group (they ride the section lift), canon mats.
      if (roofLift > 0) {
        const lgY = wH + 1.55, lgL = wL - 4;
        // Recessed core wall (0.8 in from each face; faces never coplanar with the gallery walls)
        addM(mk(new THREE.BoxGeometry(wW - 1.6, roofLift + 0.25, lgL), ochreWall, 0, lgY + roofLift / 2, wRidgeCenterZ));
        for (const s of [-1, 1]) {
          // Parapet + top beam under the eave
          addM(mk(new THREE.BoxGeometry(0.18, 0.55, lgL), M.stoneL, s * (wW / 2 - 0.35), lgY + 0.28, wRidgeCenterZ));
          addM(mk(new THREE.BoxGeometry(0.26, 0.16, lgL), M.trim, s * (wW / 2 - 0.35), lgY + roofLift + 0.12, wRidgeCenterZ));
          // Column screen — 7 slender travertine columns per side
          for (let lc = 0; lc < 7; lc++) {
            const lz = wRidgeCenterZ - lgL / 2 + 1 + lc * (lgL - 2) / 6;
            wg.add(mk(new THREE.CylinderGeometry(0.16, 0.19, roofLift - 0.4, 8), M.col, s * (wW / 2 - 0.35), lgY + 0.35 + (roofLift - 0.4) / 2, lz));
          }
        }
      }
      // ── W2: RISALIT (wings 0 & 3) — a shallow avant-corps (0.6-0.8 proud)
      // mid-gallery on the outward face, with its own tilted coppo shed and a
      // travertine sill: the façade depth-step that breaks the extruded read.
      if (WV && WV.risalit > 0) {
        const rd = WV.risalit;
        const rx = wW / 2 + rd / 2 - 0.2; // embedded 0.2 in the gallery wall
        addM(mk(new THREE.BoxGeometry(rd + 0.2, wH - 0.9, 6), ochreWall, rx, (wH - 0.9) / 2 + 1.35, wRidgeCenterZ));
        addM(mk(new THREE.BoxGeometry(rd + 0.5, 0.13, 6.5), M.trim, rx, wH + 0.52, wRidgeCenterZ));
        const shed = mk(new THREE.BoxGeometry(rd + 1.0, 0.14, 6.6), M.tile, rx + 0.12, wH + 0.88, wRidgeCenterZ);
        shed.rotation.z = -0.32; // leans back against the gallery wall
        addM(shed);
        addArchedWindow(wg, wW / 2 + rd - 0.05, wH * 0.5 + 1.3, wRidgeCenterZ, 1.0, 2.0, "z", M.trim);
      }
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
          // Column fluting — 6 thin dark vertical stripes (shared geometry;
          // W2 variatio: scaled to the per-wing column height so stripes
          // never overshoot the capitals on the shorter wings)
          for (let fl = 0; fl < 6; fl++) {
            const fa = (fl / 6) * Math.PI * 2;
            const stripe = mk(wingFluteGeo, fluteMat,
              cx + Math.cos(fa) * 0.36, colH / 2 + 1.3, cz + Math.sin(fa) * 0.36);
            if (WV) stripe.scale.y = colH / 4.5;
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
      // W1: wing towers lose their gold — bronze accents; gold is entrance/tympanum only
      addM(mk(new THREE.CircleGeometry(0.8, 16), W1 ? M.bronze : M.goldBright, 0, eH * 0.5 + 1.3, eZ - eD / 2 - 0.06));

      // Tower entrance door
      addM(mk(new THREE.BoxGeometry(2.8, 4.5, 0.2), M.doorRich, 0, 3.7, eZ - eD / 2 - 0.08));
      addM(mk(new THREE.BoxGeometry(3.2, 5, 0.1), M.trim, 0, 3.9, eZ - eD / 2 - 0.04));
      // Tower door divider
      addM(mk(new THREE.BoxGeometry(0.07, 4.5, 0.1), W1 ? M.bronze : M.gold, 0, 3.7, eZ - eD / 2 - 0.19));
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
      const att = W2 ? WING_W2[i].att : 2;
      wg.position.set(Math.sin(angle) * att, 0, Math.cos(angle) * att);
      palace.add(wg);
      sectionGroups.push({ group: wg, id: def.room.id, targetY: 0, currentY: 0, meshes: wingMeshes, accent: def.room.accent });

      const tLen = vD / 2 + wL + eD;
      const ct = new THREE.Mesh(new THREE.BoxGeometry(eW + 4, eH + 6, tLen + 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      ct.position.set(0, eH / 2 + 2, -(tLen + 2) / 2);
      ct.userData = { roomId: def.room.id, wingMeshes, accent: def.room.accent };
      wg.add(ct);
      // W2 grandeur pass (owner feedback 2026-08-06 #6B): wings are no longer
      // clickable from the exterior — the hit-box becomes a position anchor only
      // (targetWorldPos → walkthrough highlight light). Wings are entered via
      // the entrance hall; onRoomClick contract untouched, just never fired here.
      if (W2) wingAnchors.push(ct); else clickTargets.push(ct);
    });

    // ══════════════════════════════════════════════════════════════════════
    // W2 — GRONDPLAN v3: "un corpo unico, cresciuto nei secoli"
    // (owner-approved plan, public/concepts/moodboard.html §3). Replaces the
    // W1 radial windmill above with ONE continuous asymmetric corps around the
    // kept terracotta dome (the hero on world (0,0), footprint ~7% of total).
    // World coords: X=east+, Z=rear/north+, −Z=arrival(front). All literals
    // deterministic (no random). Everything merges per-material into a handful
    // of static meshes — draw budget stays flat vs the old massing.
    //
    // MASSA BLOCKS  centre(X,Z) · w×d · h   (built as ONE overlapping volume —
    // adjacent blocks interpenetrate ~1.5 w.u. at every seam so the outline
    // reads continuous, walkable corner-to-corner, staggered ridge-lines):
    //   A Hoofdblok      (−2 ,+2 ) · 30×28 · 18   carries the dome, entree −Z
    //   B Galerij        (+52,+2.5) · 78×13 ·  9   long low east arm, arcade
    //   C Teruglig-tak   (+26,+22) · 46×12 · 11   folds back, embraces cortile
    //   D Dienstvleugel  (−28,+8.5) · 26×11 ·  8   lower rear-west
    //   E Broncourt-rng  (+68,+16.5)· 20× 9 ·  8   walled well-court
    //   (cortile grande & broncourt are VOID — courts, not built volumes)
    //
    // 7 CASA-TORRI  centre(X,Z) · fp · topY   (square, H:B 4-6:1, rising from
    // the knots/corners; quoins + one serena band + glowing bifora + double
    // corbel or low coppo cap, NO gold; all top below the lantern finial 30.4):
    //   T1 poort-W (−13,−14)·7 ·29   T2 poort-E (+11,−14)·7 ·29  (gatehouse)
    //   T3 (+90,+12)·5.5·24  T4 (+90,−6)·5·23  (far-east "oude stad")
    //   T6 (−41,+16)·6·24                       (rear-west)
    //   T5 (+50,+32)·5·13    T7 (−13,+30)·5·12  (low, teruglig knots)
    // COLLISION CHECK (tower fp-square vs each block rect; centre never fully
    // inside a block — T1/T2/T4/T6 deliberately embed ≤1.5 into a corner):
    //   T1 embeds 1.5 into A-SW corner   T2 embeds 1.5 into A-SE corner
    //   T3/T4 graze B far-east corner    T6 embeds 1 into D-NW corner
    //   T5,T7 fully free (north of C).   NO tower fully inside a roof. PASS.
    //
    // 5 ANCHORS (invisible, opacity 0, wingAnchors → targetWorldPos only):
    //   0 roots(−28,+9)∈D  1 nest(+28,0)∈B  2 craft(+79,0)∈B
    //   3 travel(+54,−2)∈B  4 passions(+28,+22)∈C   — all clear of the ±22°
    //   arrival wedge and of every tower footprint.
    // ══════════════════════════════════════════════════════════════════════
    if (W2) {
      // ── shared merge buckets (per material → min meshes) ──
      const gWall: THREE.BufferGeometry[] = [], gWallL: THREE.BufferGeometry[] = [],
            gWallD: THREE.BufferGeometry[] = [], gTrimM: THREE.BufferGeometry[] = [],
            gRoof: THREE.BufferGeometry[] = [], gWinM: THREE.BufferGeometry[] = [],
            gSerenaM: THREE.BufferGeometry[] = [], gPlinthM: THREE.BufferGeometry[] = [];
      // Owner review 2026-08-07 r4 — DETAIL/RUSTIC pass: wood joinery (shutters,
      // muntins, doors), wrought iron (railings, muntin bars), climbing ivy, and
      // weathering (water-stain streaks + damp/discolour patches). Own buckets so
      // draw calls stay flat. HI-detail (muntins/shutters/balconies/ivy) is gated
      // off the weakest GPUs.
      const gWood: THREE.BufferGeometry[] = [], gIron: THREE.BufferGeometry[] = [],
            gIvy: THREE.BufferGeometry[] = [], gStain: THREE.BufferGeometry[] = [],
            gMoss: THREE.BufferGeometry[] = [], gMun: THREE.BufferGeometry[] = [],
            gIvy2: THREE.BufferGeometry[] = [], gIvy3: THREE.BufferGeometry[] = [],
            gGlass: THREE.BufferGeometry[] = [];
      const HI = !isMobileGPU();
      // Dark recessed window glass (owner r7 #3: the windows read as a bright card
      // stuck on the wall — "karton voorgeplakt"). Real glass reads DARK from
      // outside; a deep-slate, faintly reflective pane set back in the reveal lets
      // the bold pale-stone cross in front read unmistakably as a kruisraam.
      const glassMat = new THREE.MeshStandardMaterial({ color: "#2B333A", roughness: 0.22, metalness: 0.15, envMapIntensity: 0.7, emissive: "#241A0E", emissiveIntensity: 0.12 });
      // Muntin lattice — very dark, near-matte (owner r5: "kruislatten, donker").
      // Kept off the iron bucket so it reads darker than the semi-metallic railings.
      const munMat = new THREE.MeshStandardMaterial({ color: "#14110D", roughness: 0.9, metalness: 0.15, envMapIntensity: 0.15 });
      extraDisposables.push(glassMat);
      const serenaMat = new THREE.MeshStandardMaterial({ color: "#3E3933", roughness: 0.86, metalness: 0, envMapIntensity: 0.3 });
      const woodMat = new THREE.MeshStandardMaterial({ color: "#5A4630", roughness: 0.82, metalness: 0, envMapIntensity: 0.2 });
      const ironMat = new THREE.MeshStandardMaterial({ color: "#2B2723", roughness: 0.6, metalness: 0.5, envMapIntensity: 0.5 });
      const ivyMat = new THREE.MeshStandardMaterial({ color: "#4A5C34", roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
      // ivy colour variants (owner r6 #3: "meer klimop, in verschillende kleuren")
      const ivyMat2 = new THREE.MeshStandardMaterial({ color: "#6E8248", roughness: 0.88, metalness: 0, side: THREE.DoubleSide }); // fresh light green
      const ivyMat3 = new THREE.MeshStandardMaterial({ color: "#9C6B3A", roughness: 0.9, metalness: 0, side: THREE.DoubleSide });  // autumnal russet
      const stainMat = new THREE.MeshStandardMaterial({ color: "#6B5B45", roughness: 0.96, transparent: true, opacity: 0.22, depthWrite: false });
      const mossMat = new THREE.MeshStandardMaterial({ color: "#6E7248", roughness: 0.98, transparent: true, opacity: 0.3, depthWrite: false });
      extraDisposables.push(serenaMat, woodMat, ironMat, ivyMat, stainMat, mossMat, munMat, ivyMat2, ivyMat3);
      // A rough climbing-ivy patch: a cluster of small leaf quads scattered up a
      // wall corner/pier (deterministic jitter via index; NO Math.random).
      // ── IVY LEAF template (owner r7 #5: the ivy read as post-its — flat squares).
      // A small rounded three-lobe ivy leaf, cloned + jittered per leaf so patches
      // read as a dense leafy mat instead of stuck-on cards.
      const ivyLeafShape = new THREE.Shape();
      ivyLeafShape.moveTo(0, 0.55);
      ivyLeafShape.bezierCurveTo(0.30, 0.50, 0.52, 0.20, 0.44, -0.04);
      ivyLeafShape.bezierCurveTo(0.54, -0.02, 0.56, -0.20, 0.40, -0.28);
      ivyLeafShape.bezierCurveTo(0.26, -0.34, 0.12, -0.44, 0, -0.5);
      ivyLeafShape.bezierCurveTo(-0.12, -0.44, -0.26, -0.34, -0.40, -0.28);
      ivyLeafShape.bezierCurveTo(-0.56, -0.20, -0.54, -0.02, -0.44, -0.04);
      ivyLeafShape.bezierCurveTo(-0.52, 0.20, -0.30, 0.50, 0, 0.55);
      const ivyLeafGeo = new THREE.ShapeGeometry(ivyLeafShape);
      ivyLeafGeo.translate(0, -0.05, 0);
      extraGeoDisposables.push(ivyLeafGeo);
      const ivyPatch = (x: number, y: number, z: number, up: number, wide: number, faceX: boolean, n: number, bucket: THREE.BufferGeometry[] = gIvy) => {
        for (let i = 0; i < n; i++) {
          const t = i / n;
          // leaves cluster along a meandering vine climbing the wall
          const spread = Math.sin(t * 6.3 + x + i) * wide * 0.35 + ((i * 29) % 13 / 13 - 0.5) * wide;
          const py = y + t * up + ((i * 53) % 7 / 7 - 0.5) * 0.5;
          const depth = 0.06 + ((i * 17) % 5) / 5 * 0.16;    // sit slightly proud of the wall
          const s = 0.20 + ((i * 13) % 6) / 6 * 0.22;        // SMALL varied leaves (0.20–0.42), not slabs
          const g = ivyLeafGeo.clone();
          g.scale(s, s, s);
          // random 3D orientation so each leaf catches the light differently
          g.rotateX(((i * 41) % 9 / 9 - 0.5) * 1.7);
          g.rotateZ(((i * 61) % 11 / 11 - 0.5) * 2.0);
          g.rotateY((faceX ? Math.PI / 2 : 0) + ((i * 23) % 7 / 7 - 0.5) * 1.3);
          g.translate(faceX ? x + depth : x + spread, py, faceX ? z + spread : z + depth);
          // mixed foliage: mostly base green, some fresh green, some autumnal russet
          (bucket === gIvy ? (i % 4 === 0 ? gIvy2 : i % 6 === 0 ? gIvy3 : gIvy) : bucket).push(g);
        }
      };
      const box = (arr: THREE.BufferGeometry[], w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, rz = 0) => {
        const g = new THREE.BoxGeometry(w, h, d);
        if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry);
        g.translate(x, y, z); arr.push(g);
      };
      // Palace floor line: the whole group sits at palace.position.y = HILL_Y+0.3,
      // so local y=0 IS the plinth top; foot geometry sinks ~0.4 below it.
      // ══ Owner review 2026-08-06 #4 — MASSA DICHT (no doorkijk at the naden) ══
      // SEAM 0.75→1.15 so every neighbour overlaps ~2.3 at the joins and the
      // corps reads as ONE continuous mass (the old gap between galerij B and
      // hoofdblok A closes). Explicit seam-filler blocks + a continuous crown
      // string + a risaliet on B are added right after the block calls below.
      const SEAM = 1.15; // per-side seam growth → neighbours overlap ~2.3 at joins

      // ══ Owner review 2026-08-07 (screenshot palace design5) ═══════════════════
      // 1) balance L/R  2) meerdere niveau's  3) detail↑ (ramen/klok/ingang+zuilen
      //    = app-logo temple-front)  4) puntdaken minder kinderachtig.
      // The helpers below carry those: a REAL Tuscan hip roof (ridge + overhang),
      // a richly-moulded arched window, and a two-storey window ritme.

      // ── REAL HIP ROOF — ridge along the longer plan axis + 4 slopes + eave
      // overhang. One BufferGeometry per roof, pushed to the DoubleSide roof
      // bucket so a stray winding can never drop a slope (replaces the childish
      // 4-seg pyramid cone). Near-square blocks collapse to a proper pyramid.
      const gRoofDS: THREE.BufferGeometry[] = [];
      // W3 un-merge: the MAIN block hip-roof slabs go in their own bucket so they
      // merge into a separate, individually-hideable mesh (w3BlockHipMesh). W3
      // hides it and streams modeled coppi hip-roofs in its place; the small
      // dormer hips stay in gRoofDS. Flag off ⇒ both buckets render as before.
      const gBlockHip: THREE.BufferGeometry[] = [];
      const roofMatDS = (M.tile as THREE.Material).clone();
      (roofMatDS as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      extraDisposables.push(roofMatDS);
      const hipRoof = (cx: number, cz: number, bw: number, bd: number, eaveY: number, riseH: number, ov: number, mainHip = false) => {
        const bucket = mainHip ? gBlockHip : gRoofDS;
        const ex = bw / 2 + ov, ez = bd / 2 + ov, ry = eaveY + riseH;
        const P: number[] = [];
        const tri = (a: number[], b: number[], c: number[]) => { P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); };
        const e0 = [-ex, eaveY, -ez], e1 = [ex, eaveY, -ez], e2 = [ex, eaveY, ez], e3 = [-ex, eaveY, ez];
        if (bw >= bd) {
          const rx = Math.max(0.001, ex - ez);
          const R0 = [-rx, ry, 0], R1 = [rx, ry, 0];
          tri(e0, e1, R1); tri(e0, R1, R0);   // -z slope
          tri(e2, e3, R0); tri(e2, R0, R1);   // +z slope
          tri(e0, R0, e3);                      // -x hip
          tri(e1, e2, R1);                      // +x hip
        } else {
          const rz = Math.max(0.001, ez - ex);
          const R0 = [0, ry, -rz], R1 = [0, ry, rz];
          tri(e1, e2, R1); tri(e1, R1, R0);   // +x slope
          tri(e3, e0, R0); tri(e3, R0, R1);   // -x slope
          tri(e0, e1, R0);                      // -z hip
          tri(e2, e3, R1);                      // +z hip
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
        g.computeVertexNormals();
        g.translate(cx, 0, cz);
        bucket.push(g);
      };

      // ── RICH ARCHED WINDOW (merged) — deep reveal + glowing pane, moulded
      // travertine surround, keystone, sill on two corbels, a semicircular arch,
      // and (piano-nobile only) a projecting cornice on brackets. `face` gives the
      // outward wall normal; wx/wy/wz = opening centre; ww/wh = light size.
      const richWindow = (face: "+x"|"-x"|"+z"|"-z", wx: number, wy: number, wz: number, ww: number, wh: number, ped: boolean) => {
        const onX = face === "+x" || face === "-x";
        const nx = face === "+x" ? 1 : face === "-x" ? -1 : 0;
        const nz = face === "+z" ? 1 : face === "-z" ? -1 : 0;
        const aR = ww / 2;                       // arch radius
        const jamb = 0.16, deep = 0.34;
        // deep dark reveal
        if (onX) box(gWallD, deep, wh + aR, ww, wx + nx * (deep / 2 - 0.02), wy + aR * 0.2, wz);
        else     box(gWallD, ww, wh + aR, deep, wx, wy + aR * 0.2, wz + nz * (deep / 2 - 0.02));
        // DARK glass pane, RECESSED at the wall face (behind the proud stone frame +
        // cross below) so the opening reads as a real recessed window, not a card.
        if (onX) box(gGlass, 0.10, wh, ww - 0.08, wx + nx * 0.03, wy, wz);
        else     box(gGlass, ww - 0.08, wh, 0.10, wx, wy, wz + nz * 0.03);
        // arch fill (half-disc dark glass) + arch ring
        const archFill = new THREE.CylinderGeometry(aR - 0.05, aR - 0.05, 0.10, 12, 1, false, 0, Math.PI);
        archFill.rotateZ(Math.PI); // opening downward → upper half
        if (onX) { archFill.rotateY(Math.PI / 2); archFill.translate(wx + nx * 0.03, wy + wh / 2, wz); }
        else archFill.translate(wx, wy + wh / 2, wz + nz * 0.03);
        gGlass.push(archFill);
        const archRing = new THREE.TorusGeometry(aR, 0.09, 6, 14, Math.PI);
        if (onX) { archRing.rotateY(Math.PI / 2); archRing.translate(wx + nx * 0.24, wy + wh / 2, wz); }
        else archRing.translate(wx, wy + wh / 2, wz + nz * 0.24);
        gTrimM.push(archRing);
        // moulded surround — two jambs + a proud outer frame
        for (const s of [-1, 1]) {
          if (onX) box(gTrimM, 0.22, wh + 0.2, jamb, wx + nx * 0.20, wy, wz + s * (ww / 2 + jamb / 2));
          else     box(gTrimM, jamb, wh + 0.2, 0.22, wx + s * (ww / 2 + jamb / 2), wy, wz + nz * 0.20);
        }
        // keystone at the crown
        if (onX) box(gTrimM, 0.34, 0.42, 0.28, wx + nx * 0.26, wy + wh / 2 + aR - 0.05, wz);
        else     box(gTrimM, 0.28, 0.42, 0.34, wx, wy + wh / 2 + aR - 0.05, wz + nz * 0.26);
        // sill + two corbels
        if (onX) box(gTrimM, 0.30, 0.14, ww + 0.5, wx + nx * 0.22, wy - wh / 2 - 0.10, wz);
        else     box(gTrimM, ww + 0.5, 0.14, 0.30, wx, wy - wh / 2 - 0.10, wz + nz * 0.22);
        for (const s of [-1, 1]) {
          if (onX) box(gSerenaM, 0.18, 0.22, 0.16, wx + nx * 0.18, wy - wh / 2 - 0.24, wz + s * ww * 0.32);
          else     box(gSerenaM, 0.16, 0.22, 0.18, wx + s * ww * 0.32, wy - wh / 2 - 0.24, wz + nz * 0.18);
        }
        // piano-nobile cornice on two little brackets
        if (ped) {
          const cy = wy + wh / 2 + aR + 0.34;
          if (onX) box(gTrimM, 0.30, 0.16, ww + 0.9, wx + nx * 0.26, cy, wz);
          else     box(gTrimM, ww + 0.9, 0.16, 0.30, wx, cy, wz + nz * 0.26);
          for (const s of [-1, 1]) {
            if (onX) box(gSerenaM, 0.20, 0.30, 0.16, wx + nx * 0.20, cy - 0.22, wz + s * (ww / 2 + 0.1));
            else     box(gSerenaM, 0.16, 0.30, 0.20, wx + s * (ww / 2 + 0.1), cy - 0.22, wz + nz * 0.20);
          }
          // ── W3 AEDICULA CROWN — a true classical pediment over the cornice.
          // Alternating triangular / segmental (deterministic by bay position) as
          // on a Renaissance piano nobile. Raking cornices via rz-rotated trim on
          // the front (-z/+z) faces; a shallow segmental arch on the side faces.
          if (W3) {
            const span = ww + 1.1, hs = span / 2, rise = hs * 0.52;
            const seg = (Math.round(wx + wz) % 2 === 0); // ~half segmental, half triangular
            const py = cy + 0.14;
            if (seg) {
              // segmental: a shallow curved cornice (torus arc) hugging the cornice
              const arc = new THREE.TorusGeometry(hs + 0.1, 0.13, 6, 16, Math.PI * 0.62);
              arc.rotateZ(Math.PI * 0.5 - Math.PI * 0.31); // centre the 0.62π arc over the top
              if (onX) { arc.rotateY(Math.PI / 2); arc.translate(wx + nx * 0.28, py + rise * 0.3, wz); }
              else arc.translate(wx, py + rise * 0.3, wz + nz * 0.28);
              gTrimM.push(arc);
            } else if (!onX) {
              // triangular: two raking cornices meeting at the apex + tympanum panel
              const rake = Math.hypot(hs, rise) + 0.12, ang = Math.atan2(rise, hs);
              box(gTrimM, rake, 0.15, 0.30, wx - hs / 2, py + rise / 2, wz + nz * 0.26, 0, ang);
              box(gTrimM, rake, 0.15, 0.30, wx + hs / 2, py + rise / 2, wz + nz * 0.26, 0, -ang);
              box(gWallD, span - 0.3, rise * 0.7, 0.14, wx, py + rise * 0.34, wz + nz * 0.19); // recessed tympanum
              box(gTrimM, 0.34, 0.34, 0.34, wx, py + rise + 0.06, wz + nz * 0.28);            // apex acroterion
            } else {
              // side faces: a shallow segmental arc (triangular rake needs rotateX)
              const arc = new THREE.TorusGeometry(hs + 0.1, 0.13, 6, 16, Math.PI * 0.62);
              arc.rotateZ(Math.PI * 0.5 - Math.PI * 0.31); arc.rotateY(Math.PI / 2);
              arc.translate(wx + nx * 0.28, py + rise * 0.3, wz); gTrimM.push(arc);
            }
          }
        }
        // ── r4 fine detail: iron muntins, wood shutters, iron balcony, weather
        // streak below the sill. Gated to HI-detail GPUs (dense per-window geo).
        if (HI) {
          // ── KRUISRAAM (owner r7 #3 — the cross must READ) — a BOLD pale-stone
          //    mullion (vertical) + transom (horizontal) stand well PROUD of the
          //    recessed dark glass, forming an unmistakable stone cross in the middle
          //    of every light; fine dark leaded bars subdivide each of the four
          //    panes. Depth (proud stone cross over recessed dark glass) kills the
          //    "cardboard stuck on the wall" read.
          const po = onX ? nx * 0.17 : nz * 0.17;   // cross stands ~0.14 proud of the glass
          const mw = 0.22;                          // mullion / transom thickness (bold, reads at distance)
          const tY = wy + wh * 0.05;                // transom just above centre
          const bt = 0.05, bo = onX ? nx * 0.10 : nz * 0.10; // fine leaded bars, over the glass
          if (onX) {
            box(gTrimM, 0.26, wh + aR + 0.1, mw, wx + po, wy + aR * 0.2, wz);           // vertical stone mullion (into the arch)
            box(gTrimM, 0.26, mw, ww + 0.14, wx + po, tY, wz);                           // horizontal stone transom
            for (const sz of [-ww * 0.26, ww * 0.26]) {
              box(gMun, bt, (tY - (wy - wh / 2)) - 0.06, bt, wx + bo, (tY + wy - wh / 2) / 2, wz + sz);
              box(gMun, bt, (wy + wh / 2 - tY) - 0.06, bt, wx + bo, (tY + wy + wh / 2) / 2, wz + sz);
            }
          } else {
            box(gTrimM, mw, wh + aR + 0.1, 0.26, wx, wy + aR * 0.2, wz + po);
            box(gTrimM, ww + 0.14, mw, 0.26, wx, tY, wz + po);
            for (const sx of [-ww * 0.26, ww * 0.26]) {
              box(gMun, bt, (tY - (wy - wh / 2)) - 0.06, bt, wx + sx, (tY + wy - wh / 2) / 2, wz + bo);
              box(gMun, bt, (wy + wh / 2 - tY) - 0.06, bt, wx + sx, (tY + wy + wh / 2) / 2, wz + bo);
            }
          }
          // shutters — a weathered wood leaf on each side, slightly open
          const shW = ww * 0.52, shH = wh + 0.1, shPo = onX ? nx * 0.12 : nz * 0.12;
          for (const s of [-1, 1]) {
            if (onX) box(gWood, 0.06, shH, shW, wx + shPo, wy, wz + s * (ww / 2 + shW * 0.42), s * 0.3);
            else     box(gWood, shW, shH, 0.06, wx + s * (ww / 2 + shW * 0.42), wy, wz + shPo, -s * 0.3);
          }
          // piano-nobile: a small iron-railed balcony on a corbelled slab
          if (ped) {
            const by = wy - wh / 2 - 0.16, bw2 = ww + 0.8, bd2 = 0.7;
            if (onX) box(gTrimM, bd2, 0.14, bw2, wx + nx * (bd2 / 2 + 0.1), by, wz);
            else     box(gTrimM, bw2, 0.14, bd2, wx, by, wz + nz * (bd2 / 2 + 0.1));
            // rail: top bar + uprights
            const ry2 = by + 0.62;
            if (onX) { box(gIron, 0.06, 0.06, bw2, wx + nx * (bd2 + 0.05), ry2, wz); for (let u = -bw2 / 2; u <= bw2 / 2; u += 0.32) box(gIron, 0.05, 0.62, 0.05, wx + nx * (bd2 + 0.05), by + 0.31, wz + u); }
            else { box(gIron, bw2, 0.06, 0.06, wx, ry2, wz + nz * (bd2 + 0.05)); for (let u = -bw2 / 2; u <= bw2 / 2; u += 0.32) box(gIron, 0.05, 0.62, 0.05, wx + u, by + 0.31, wz + nz * (bd2 + 0.05)); }
          }
          // weather streak below the sill (translucent damp stain)
          if (onX) box(gStain, 0.02, wh * 0.9, ww * 0.5, wx + nx * 0.24, wy - wh - 0.3, wz);
          else     box(gStain, ww * 0.5, wh * 0.9, 0.02, wx, wy - wh - 0.3, wz + nz * 0.24);
        }
      };

      // ── ONE PARAMETRIC BLOCK ─────────────────────────────────────────────
      // plaster core (grown by SEAM so joins overlap), travertine plinth + floor
      // string courses (one per storey → reads as levels), crown cornice + corner
      // quoins, a projecting eave, a REAL hip roof (flat-topped for the dome block
      // A so the cupola stays the hero), and a two-storey rich window ritme.
      const buildBlock = (
        cx: number, cz: number, w: number, d: number, h: number,
        opts: { winFaces?: ("+x"|"-x"|"+z"|"-z")[]; loggiaFace?: "+z"|"-z"|"+x"|"-x"; flatRoof?: boolean } = {}
      ) => {
        const bw = w + SEAM * 2, bd = d + SEAM * 2; // grown footprint (seam overlap)
        const twoStorey = h >= 11;                   // tall blocks read as two floors
        // plinth (foot sunk 0.4) — travertine base band
        box(gTrimM, bw + 0.6, 1.0, bd + 0.6, cx, 0.1, cz);
        // plaster body
        box(gWall, bw, h, bd, cx, h / 2 + 0.5, cz);
        // ── RUSTICATED GROUND FLOOR (owner review 2026-08-07 #1 — no blank walls):
        // proud travertine ashlar courses wrapping the lower storey give the base
        // texture + weight and read as the ground floor of a multi-storey palazzo.
        // Cyclopean rusticated ashlar (owner: "rustiek mastodontisch") — deep,
        // heavy courses with vertical joints marking big blocks.
        const rustTop = twoStorey ? h * 0.34 + 0.5 : h * 0.46 + 0.5;
        for (let ry = 1.6; ry < rustTop; ry += 1.35) {
          box(gTrimM, bw + 0.3, 0.85, bd + 0.3, cx, ry, cz);                    // deep proud course
          // vertical joints (dark reveals) staggered per course along both long faces
          const stagger = (Math.round(ry) % 2) ? 1.5 : 0;
          for (let jx = -bw / 2 + 1.5 + stagger; jx < bw / 2 - 1; jx += 3) {
            box(gWallD, 0.16, 0.7, bd + 0.34, cx + jx, ry, cz);
          }
          for (let jz = -bd / 2 + 1.5 + stagger; jz < bd / 2 - 1; jz += 3) {
            box(gWallD, bw + 0.34, 0.7, 0.16, cx, ry, cz + jz);
          }
        }
        // floor string courses — one datum per storey so the mass reads as levels
        const floorYs = twoStorey ? [h * 0.34 + 0.5, h * 0.66 + 0.5] : [h * 0.5 + 0.5];
        for (const fy of floorYs) box(gTrimM, bw + 0.22, 0.22, bd + 0.22, cx, fy, cz);
        // crown cornice (two travertine bands, interpenetrating in Y — no coplanar)
        box(gTrimM, bw + 0.4, 0.28, bd + 0.4, cx, h + 0.45, cz);
        box(gTrimM, bw + 0.7, 0.24, bd + 0.7, cx, h + 0.66, cz);
        // projecting eave fascia (shadow line under the roof overhang) — owner r7
        // #4: trimmed the overhang (1.4→0.9) so no thin fascia tab projects over the
        // gaps between blocks and reads as a floating bar.
        box(gTrimM, bw + 0.9, 0.22, bd + 0.9, cx, h + 0.86, cz);
        // corner quoins (travertine chains, stop under the cornice)
        for (const sx of [-1, 1]) for (const sz of [-1, 1])
          box(gTrimM, 0.5, h - 0.6, 0.5, cx + sx * bw / 2, (h - 0.6) / 2 + 0.5, cz + sz * bd / 2);
        // ── ROOF ──────────────────────────────────────────────────────────
        if (opts.flatRoof) {
          // Block A: flat tiled deck (dome + parapet crown it) — no competing hip.
          box(gRoof, bw + 1.0, 0.2, bd + 1.0, cx, h + 1.0, cz);
        } else {
          // real Tuscan hip roof: ~24° pitch (lower so it reads as roof, not tent),
          // capped rise, generous overhang.
          const eaveY = h + 0.95;
          const riseH = Math.min(Math.min(bw, bd) * 0.26, 4.3);
          hipRoof(cx, cz, bw, bd, eaveY, riseH, 0.95, true); // main block hip → hideable W3 bucket
          // ridge cresting tile for the long wings
          const longAxisX = bw >= bd;
          if (Math.abs(bw - bd) > 6) {
            const along = longAxisX ? bw : bd, rl = along - Math.min(bw, bd);
            if (longAxisX) box(gRoof, rl, 0.3, 0.4, cx, eaveY + riseH - 0.12, cz);   // embedded onto the ridge (owner r7 #4)
            else box(gRoof, 0.4, 0.3, rl, cx, eaveY + riseH - 0.12, cz);
          }
          // ── DORMERS + CHIMNEYS (owner review #2 — roofs must read, not blank
          // brown slabs). Dormers march along the front (−z / −x) slope; slim
          // rusticated chimney stacks rise near the ridge ends.
          const longDim = longAxisX ? bw : bd;
          if (longDim > 22) {
            const nd = Math.floor(longDim / 11);
            const dstep = (longDim - 8) / Math.max(1, nd - 1);
            for (let di = 0; di < nd; di++) {
              const q = -(longDim - 8) / 2 + di * dstep;
              const dx = longAxisX ? cx + q : cx - bw / 2 + 0.9;
              const dz = longAxisX ? cz - bd / 2 + 0.9 : cz + q;
              const dY = eaveY + 1.0;
              box(gWall, 1.5, 1.7, 1.4, dx, dY, dz);                 // dormer cheek
              box(gTrimM, 1.7, 0.16, 1.5, dx, dY + 0.9, dz);         // dormer cornice
              if (longAxisX) box(gWinM, 0.8, 1.0, 0.12, dx, dY + 0.05, dz - 0.72);
              else box(gWinM, 0.12, 1.0, 0.8, dx - 0.72, dY + 0.05, dz);
              hipRoof(dx, dz, 1.7, 1.6, dY + 0.98, 0.7, 0.18);       // little dormer hip
            }
            // chimneys near the two ridge ends — owner r6 #2: "zwevende schouwen".
            // On near-square blocks the hip slope drops below the old fixed base so
            // the stack floated. Anchor the base at the EAVE line (always ≤ the roof
            // surface at any x/z) and run the shaft up through the roof, poking ~3.4
            // above the ridge. Now embedded on every block shape.
            for (const cs of [-1, 1]) {
              const chx = longAxisX ? cx + cs * longDim * 0.32 : cx;
              const chz = longAxisX ? cz : cz + cs * longDim * 0.32;
              const chH = riseH + 3.4, chTop = eaveY + chH;             // base at eaveY, top well above the ridge
              box(gWall, 1.0, chH, 1.0, chx, eaveY + chH / 2, chz);
              box(gTrimM, 1.1, 0.4, 1.1, chx, chTop - 0.75, chz);        // banding just under the cap
              box(gTrimM, 1.35, 0.34, 1.35, chx, chTop, chz);           // cap
            }
          }
        }
        // ── ROOFLINE ORNAMENT (owner review r2 #2/#3 — frivoler, richer). An urn
        // on a plinth (travertine) — scattered on the parapet of the flat dome
        // block, and as acroteria on the eave corners of the hipped wings.
        const urn = (ux: number, uy: number, uz: number, s = 1) => {
          box(gTrimM, 0.7 * s, 0.5 * s, 0.7 * s, ux, uy + 0.25 * s, uz);                                    // plinth
          gTrimM.push(new THREE.CylinderGeometry(0.34 * s, 0.16 * s, 0.7 * s, 10).translate(ux, uy + 0.85 * s, uz)); // vase body
          gTrimM.push(new THREE.CylinderGeometry(0.30 * s, 0.36 * s, 0.22 * s, 10).translate(ux, uy + 1.28 * s, uz)); // lip
          gTrimM.push(new THREE.SphereGeometry(0.12 * s, 8, 6).translate(ux, uy + 1.5 * s, uz));            // finial
        };
        if (opts.flatRoof) {
          // balustraded parapet ring on the flat deck + urns at corners & midpoints
          const py = h + 1.1;
          for (const sz of [-1, 1]) { box(gTrimM, bw + 1.0, 0.22, 0.5, cx, py + 1.15, cz + sz * (bd / 2 + 0.4)); for (let bx = -bw / 2; bx <= bw / 2; bx += 1.0) gTrimM.push(new THREE.CylinderGeometry(0.14, 0.18, 1.0, 6).translate(cx + bx, py + 0.6, cz + sz * (bd / 2 + 0.4))); }
          for (const sx of [-1, 1]) { box(gTrimM, 0.5, 0.22, bd + 1.0, cx + sx * (bw / 2 + 0.4), py + 1.15, cz); for (let bz = -bd / 2; bz <= bd / 2; bz += 1.0) gTrimM.push(new THREE.CylinderGeometry(0.14, 0.18, 1.0, 6).translate(cx + sx * (bw / 2 + 0.4), py + 0.6, cz + bz)); }
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) urn(cx + sx * (bw / 2 + 0.4), py + 1.3, cz + sz * (bd / 2 + 0.4), 1.3);
        } else {
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) urn(cx + sx * (bw / 2 + 0.2), h + 0.9, cz + sz * (bd / 2 + 0.2), 1.15);
        }
        // ── TWO-STOREY RICH WINDOW RITME ────────────────────────────────────
        const rows = twoStorey
          ? [{ y: h * 0.32 + 0.5, hh: Math.min(1.7, h * 0.24), ped: false },   // ground
             { y: h * 0.68 + 0.5, hh: Math.min(2.1, h * 0.30), ped: true }]    // piano nobile
          : [{ y: h * 0.55 + 0.5, hh: Math.min(2.0, h * 0.36), ped: false }];
        for (const face of (opts.winFaces || [])) {
          const along = (face === "+x" || face === "-x") ? bd : bw;
          const n = Math.max(2, Math.floor(along / 6));
          const step = (along - 3.4) / (n - 1);
          for (let k = 0; k < n; k++) {
            const p = -(along - 3.4) / 2 + k * step;
            for (const row of rows) {
              let wx = cx, wz = cz;
              if (face === "+z") { wz = cz + bd / 2; wx = cx + p; }
              else if (face === "-z") { wz = cz - bd / 2; wx = cx + p; }
              else if (face === "+x") { wx = cx + bw / 2; wz = cz + p; }
              else { wx = cx - bw / 2; wz = cz + p; }
              richWindow(face, wx, row.y, wz, 1.5, row.hh, row.ped);
            }
          }
          // ── GIANT-ORDER PILASTERS between the bays (owner review #1) — travertine
          // strips from the plinth to the cornice with a base + capital, breaking
          // the plaster field into a rhythmic order (no more big blank surface).
          const pilBot = 1.6, pilTop = h + 0.3, pilMid = (pilBot + pilTop) / 2, pilH = pilTop - pilBot;
          const np = n + 1, pstep = (along - 1.2) / (np - 1);
          for (let j = 0; j < np; j++) {
            const p = -(along - 1.2) / 2 + j * pstep;
            let px = cx, pz = cz;
            const onX = face === "+x" || face === "-x";
            if (face === "+z") { pz = cz + bd / 2 + 0.18; px = cx + p; }
            else if (face === "-z") { pz = cz - bd / 2 - 0.18; px = cx + p; }
            else if (face === "+x") { px = cx + bw / 2 + 0.18; pz = cz + p; }
            else { px = cx - bw / 2 - 0.18; pz = cz + p; }
            const ww = onX ? 0.34 : 0.72, dd = onX ? 0.72 : 0.34;
            box(gTrimM, ww, pilH, dd, px, pilMid, pz);                              // shaft
            box(gTrimM, ww + 0.28, 0.28, dd + 0.28, px, pilTop - 0.1, pz);          // capital
            box(gTrimM, ww + 0.22, 0.22, dd + 0.22, px, pilBot + 0.1, pz);          // base
          }
        }
        // loggia/arcade screen along one long face (travertine colonnade proud
        // of the plaster) — used on the long gallery B
        if (opts.loggiaFace) {
          const face = opts.loggiaFace;
          const along = (face === "+x" || face === "-x") ? bd : bw;
          const n = Math.max(4, Math.floor(along / 5.5));
          const step = (along - 2) / (n - 1);
          const colH = Math.min(h - 1.2, 6.5);
          for (let k = 0; k < n; k++) {
            const p = -(along - 2) / 2 + k * step;
            let clx = cx, clz = cz;
            if (face === "+z") { clz = cz + bd / 2 + 0.6; clx = cx + p; }
            else if (face === "-z") { clz = cz - bd / 2 - 0.6; clx = cx + p; }
            else if (face === "+x") { clx = cx + bw / 2 + 0.6; clz = cz + p; }
            else { clx = cx - bw / 2 - 0.6; clz = cz + p; }
            gWallL.push(new THREE.CylinderGeometry(0.28, 0.32, colH, 10).translate(clx, colH / 2 + 0.5, clz));
            box(gTrimM, 0.7, 0.16, 0.7, clx, colH + 0.6, clz);        // capital
            box(gTrimM, 0.62, 0.14, 0.62, clx, 0.62, clz);            // base
          }
          // entablature band riding the capitals
          if (face === "+z" || face === "-z")
            box(gTrimM, bw, 0.22, 0.3, cx, colH + 0.75, (face === "+z" ? cz + bd / 2 + 0.6 : cz - bd / 2 - 0.6));
          else
            box(gTrimM, 0.3, 0.22, bd, (face === "+x" ? cx + bw / 2 + 0.6 : cx - bw / 2 - 0.6), colH + 0.75, cz);
        }
        // ── r5 #1 RUSTIC HARDWARE (owner: "nog meer detail / rustiekheid") ──
        // Wrought-iron tie-rod plates (capochiave) march along the floor string
        // course between the bays; a downpipe drops at each rear corner; a couple
        // of thin damp weather-streaks bleed down the plaster. All merged, all-GPU.
        for (const face of (opts.winFaces || [])) {
          const onX = face === "+x" || face === "-x";
          const along = onX ? bd : bw;
          const nBays = Math.max(2, Math.floor(along / 6));
          const nx2 = face === "+x" ? 1 : face === "-x" ? -1 : 0;
          const nz2 = face === "+z" ? 1 : face === "-z" ? -1 : 0;
          const fx = cx + nx2 * (bw / 2 + 0.1), fz = cz + nz2 * (bd / 2 + 0.1);
          for (const fy of floorYs) for (let k = 0; k <= nBays; k++) {
            const p = -along / 2 + (k / nBays) * along;
            const tx2 = onX ? fx : cx + p, tz2 = onX ? cz + p : fz;
            box(gIron, onX ? 0.08 : 0.44, 0.44, onX ? 0.44 : 0.08, tx2, fy, tz2, 0, Math.PI / 4); // lozenge plate
            gIron.push(new THREE.SphereGeometry(0.10, 8, 6).translate(tx2 + nx2 * 0.06, fy, tz2 + nz2 * 0.06)); // boss
          }
          // damp weather-streaks under the string course (thin, translucent)
          for (const p of [-along * 0.28, along * 0.34]) {
            const tx2 = onX ? fx : cx + p, tz2 = onX ? cz + p : fz;
            box(gStain, onX ? 0.02 : 0.5, floorYs[0] * 0.8, onX ? 0.5 : 0.02, tx2, floorYs[0] * 0.5, tz2);
          }
        }
        // downpipes at the two rear (+z) corners — iron pipe + collar brackets
        for (const sx of [-1, 1]) {
          const dpx = cx + sx * (bw / 2 - 0.35), dpz = cz + bd / 2 + 0.22;
          gIron.push(new THREE.CylinderGeometry(0.12, 0.12, h - 0.4, 8).translate(dpx, (h - 0.4) / 2 + 0.5, dpz));
          for (const cy2 of [h * 0.3, h * 0.6]) gIron.push(new THREE.CylinderGeometry(0.16, 0.16, 0.16, 8).translate(dpx, cy2, dpz));
        }
      };

      // ══ Owner review 2026-08-07 r2 — "RUSTIEK MASTODONTISCH": deeper not wider ══
      // Shorter L↔R, more mass FRONT + BACK. Around the central dome block: two
      // SHORTER + DEEPER side wings, a DEEP REAR RANGE piling up behind the dome,
      // and two FRONT PAVILIONS projecting forward to form a cour d'honneur whose
      // open centre gives the approach to the entrance. The whole complex rides a
      // colossal rusticated SUBSTRUCTURE (below) so it grows out of the hill.
      // Symmetric about x=−2. Overlaps at every join → one continuous mass.
      const WING_E = 32, WING_W = -36;
      // A Hoofdblok — tall central hart carrying the dome (flatRoof: dome crowns it).
      buildBlock(-2, 6, 32, 30, 19, { winFaces: ["+x", "-x", "+z"], flatRoof: true });
      // Side wings — SHORTER + DEEPER (mass front-to-back), differently filled.
      buildBlock(WING_E, 6, 30, 22, 13, { winFaces: ["+z", "+x"], loggiaFace: "-z" }); // east: arcaded court
      buildBlock(WING_W, 6, 30, 22, 13, { winFaces: ["+z", "-z", "-x"] });             // west: solid palazzo
      // Deep REAR RANGE piling behind the dome (mass back).
      buildBlock(-2, 30, 54, 16, 15, { winFaces: ["+z", "-z"] });
      // FRONT PAVILIONS projecting forward → cour d'honneur; centre open for the
      // approach to the entrance (mass front).
      buildBlock(24, -14, 22, 20, 12, { winFaces: ["-z", "+x"] });   // east front pavilion
      buildBlock(-28, -14, 22, 20, 12, { winFaces: ["-z", "-x"] });  // west front pavilion

      // ── SEAM FILLERS — close the A↔wing and A↔rear joins (front pavilions already
      // overlap A + the wings, so those joins read continuous without fillers).
      box(gWall, 4, 13, 20, 15.5, 7.0, 6);   box(gWall, 4, 13, 20, -19.5, 7.0, 6);   // A↔wings
      box(gWall, 22, 15, 4, -2, 8.0, 21.5);                                          // A↔rear

      // ── BLOCK A FRONT (−z) upper articulation flanking the central pediment.
      {
        const aFz = 6 - 32.3 / 2; // block A grown front face z ≈ −10.15
        for (const wx of [-5.5, 5.5]) richWindow("-z", wx, 14.0, aFz, 1.4, 2.0, true);
        for (const px of [-7.6, 7.6]) {
          box(gTrimM, 0.7, 16.0, 0.34, px, 8.5, aFz - 0.18);
          box(gTrimM, 1.02, 0.3, 0.5, px, 16.6, aFz - 0.18);
          box(gTrimM, 0.94, 0.24, 0.45, px, 1.5, aFz - 0.18);
        }
      }

      // ── COLOSSAL RUSTICATED SUBSTRUCTURE (owner r2 #4/#5 — built INTO the hill,
      // not floating; "rustiek mastodontisch"). One massive base the whole complex
      // rides on: solid to well below terrain on every side, its downhill faces
      // cyclopean rusticated courses + a blind arcade — the hill's man-made cliff.
      {
        const px0 = -56, px1 = 52, pz0 = -27, pz1 = 40;
        const pcx = (px0 + px1) / 2, pcz = (pz0 + pz1) / 2, pw = px1 - px0, pd = pz1 - pz0;
        gPlinthM.push(new THREE.BoxGeometry(pw, 15, pd).translate(pcx, 0.5 - 7.5, pcz)); // body, buried deep
        // cyclopean rusticated courses on all four faces
        for (let ry = 0.0; ry > -6.5; ry -= 1.5) {
          box(gTrimM, pw + 0.6, 1.05, 0.6, pcx, ry, pz0 - 0.1);
          box(gTrimM, pw + 0.6, 1.05, 0.6, pcx, ry, pz1 + 0.1);
          box(gTrimM, 0.6, 1.05, pd + 0.6, px0 - 0.1, ry, pcz);
          box(gTrimM, 0.6, 1.05, pd + 0.6, px1 + 0.1, ry, pcz);
        }
        // arcade on the downhill (−z) face — big rusticated arches; the central
        // ones hold studded wood doors (owner r4: "meer detail in deuren"), the
        // rest read as deep shadowed openings with a keystone.
        const na = 9;
        for (let i = 0; i < na; i++) {
          const ax = px0 + (i + 0.5) * (pw / na), aw = pw / na - 1.4;
          box(gWallD, aw, 3.4, 0.6, ax, -2.1, pz0 - 0.2);
          const arch = new THREE.CylinderGeometry(aw / 2, aw / 2, 0.6, 12, 1, false, 0, Math.PI);
          arch.rotateZ(Math.PI); arch.translate(ax, -0.4, pz0 - 0.2); gWallD.push(arch);
          box(gTrimM, 0.5, 0.6, 0.7, ax, -0.5 + aw / 2, pz0 - 0.35);   // keystone
          if (i >= 3 && i <= 5) {
            // studded double doors set into the arch
            for (const s of [-1, 1]) {
              box(gWood, aw / 2 - 0.12, 3.0, 0.16, ax + s * aw / 4, -2.3, pz0 - 0.42);
              for (let py = -3.4; py < -1.3; py += 0.5) for (let pxo = -1; pxo <= 1; pxo += 1) // bronze studs
                gIron.push(new THREE.SphereGeometry(0.05, 6, 4).translate(ax + s * aw / 4 + pxo * (aw / 8), py, pz0 - 0.5));
            }
            box(gIron, 0.1, 3.0, 0.1, ax, -2.3, pz0 - 0.5);           // meeting stile
          }
        }
        // heavy cornice capping the podium (the terrace-floor edge)
        box(gTrimM, pw + 1.2, 0.55, pd + 1.2, pcx, 0.35, pcz);
      }

      // ── 7 CASA-TORRI ─────────────────────────────────────────────────────
      // ══ Owner review 2026-08-06 #3 — SUBORDINATE, STURDIER, VARIED ══
      // No tower may top the dome apex (world ≈36 / local ≈27.7): all capped well
      // below (tallest world 31.3). Old towers were thin picket-fence spikes
      // (H:B ~4-8:1, near-equal heights) prikked op dakranden. New rule: each
      // torenvoet is EMBEDDED IN A BLOCK CORNER (footprint straddles the grown
      // block hoek, coords below), footprints 5-8, H:B ~2.2-2.9 (STEVIG), and
      // big height variatie — 2 poort (23), 2 middelhoog (17/19), 3 low (12-14).
      // Vormregels intact (square, quoins, serena-band, bifora, corbel/coppo,
      // NO gold). Block corners (grown by SEAM 0.75/side):
      //  A(-2,2,30×28)→x{-17.75,13.75} z{-12.75,16.75}
      //  B(52,2.5,78×13)→x{12.25,91.75} z{-4.75,9.75}
      //  C(26,22,46×12)→x{2.25,49.75} z{15.25,28.75}
      //  D(-28,8.5,26×11)→x{-41.75,-14.25} z{2.25,14.75}
      // ══ Owner review 2026-08-07 #1/#3/#4 ══
      // #1 BALANCE: the WEST gate-tower becomes a tall CLOCK CAMPANILE (belfry +
      //    clock face + cupola) — a strong west vertical that counter-weights the
      //    long east gallery; the EAST gate-tower is demoted below block A (18) so
      //    the dome reads as the hero (no more "chimneys hiding the cupola").
      // #4 ROOFS: every tower gets a proper steep pyramidal roof with an
      //    overhanging eave + a finial (kills the childish flat/thin caps).
      // kind: "campanile" | "tower". All caps stay below the dome apex (local ~28).
      // SYMMETRIC PAIRS about x=−2, on the NEW compact footprint: a pair on the
      // FRONT-PAVILION outer corners flanking the cour d'honneur (west = clock
      // campanile), a pair on the wing outer corners, and a rear pair on C.
      // [x, z, fp, topY, kind, serena-bandY]
      const TOWERS: [number, number, number, number, "campanile"|"tower", number][] = [
        [-38, -24, 6.5, 21.0, "campanile", 12.0], // front-W — CLOCK CAMPANILE (court gate)
        [ 34, -24, 6.5, 18.5, "tower",     11.0], // front-E — plain (mirror)
        [-50,  16, 6.0, 16.0, "tower",     10.0], // west-wing outer corner
        [ 46,  16, 6.0, 16.0, "tower",     10.0], // east-wing outer corner
        [-26,  37, 5.5, 14.0, "tower",      8.0], // rear-west (C corner)
        [ 22,  37, 5.5, 14.0, "tower",      8.0], // rear-east (C corner)
      ];
      TOWERS.forEach(([tx, tz, fp, topY, kind, bandY]) => {
        // Shaft — square casa-torre, foot sunk 0.6
        gWall.push(new THREE.BoxGeometry(fp, topY + 0.6, fp).translate(tx, (topY - 0.6) / 2, tz));
        // Stone footing plinth
        gPlinthM.push(new THREE.BoxGeometry(fp + 0.8, 1.7, fp + 0.8).translate(tx, 0.15, tz));
        // Quoin chains on 4 corners (stop under crown)
        const qh = topY - 1.6;
        for (const sx of [-1, 1]) for (const sz of [-1, 1])
          gTrimM.push(new THREE.BoxGeometry(0.3, qh, 0.3).translate(tx + sx * fp / 2, qh / 2 - 0.4, tz + sz * fp / 2));
        // Two staggered pietra-serena bands (floor lines → the tower reads leveled)
        gSerenaM.push(new THREE.BoxGeometry(fp + 0.2, 0.5, fp + 0.2).translate(tx, bandY, tz));
        gSerenaM.push(new THREE.BoxGeometry(fp + 0.2, 0.5, fp + 0.2).translate(tx, bandY * 0.55, tz));
        // Crown — double corbelled cornice (interpenetrate 0.02 Y; no gold)
        const crownY = topY + 0.1;
        gTrimM.push(new THREE.BoxGeometry(fp + 0.5, 0.22, fp + 0.5).translate(tx, crownY, tz));
        gTrimM.push(new THREE.BoxGeometry(fp + 0.7, 0.20, fp + 0.7).translate(tx, crownY + 0.19, tz));
        for (const s of [-1, 1]) for (const off of [-fp / 3, 0, fp / 3]) {
          gSerenaM.push(new THREE.BoxGeometry(0.28, 0.55, 0.34).translate(tx + off, crownY - 0.36, tz + s * (fp / 2 + 0.05)));
          gSerenaM.push(new THREE.BoxGeometry(0.34, 0.55, 0.28).translate(tx + s * (fp / 2 + 0.05), crownY - 0.36, tz + off));
        }
        const zF = tz - fp / 2; // arrival (−Z) face

        if (kind === "campanile") {
          // ══ Owner review 2026-08-08 r5 #3 — "bell-tower mag veel beter zijn" ══
          // A properly-articulated Tuscan campanile: a bifora belfry (twin arches +
          // colonnette per face) framed by pier-pilasters, a bronze bell hung on a
          // headstock, four corner pinnacle spirelets, an octagonal drum + coppo
          // cupola + lantern finial, and a pedimented clock aedicule on the shaft.
          const belfryY0 = crownY + 0.4, belfryH = 3.4, belfryTop = belfryY0 + belfryH;
          // corner pier-pilasters with caps
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            gTrimM.push(new THREE.BoxGeometry(0.78, belfryH, 0.78).translate(tx + sx * (fp / 2 - 0.39), belfryY0 + belfryH / 2, tz + sz * (fp / 2 - 0.39)));
            gSerenaM.push(new THREE.BoxGeometry(0.98, 0.26, 0.98).translate(tx + sx * (fp / 2 - 0.39), belfryTop - 0.13, tz + sz * (fp / 2 - 0.39)));
          }
          // belfry-floor parapet band
          gTrimM.push(new THREE.BoxGeometry(fp + 0.3, 0.4, fp + 0.3).translate(tx, belfryY0 + 0.05, tz));
          // BIFORA per face: dark recess, central colonnette, twin arched lights
          for (const [ox, oz, ry] of [[0, -fp / 2, 0], [0, fp / 2, 0], [-fp / 2, 0, Math.PI / 2], [fp / 2, 0, Math.PI / 2]] as [number, number, number][]) {
            const span = fp - 1.7;
            box(gWallD, ry ? 0.34 : span, belfryH - 1.0, ry ? span : 0.34, tx + ox, belfryY0 + belfryH / 2 - 0.15, tz + oz);
            // central colonnette
            gSerenaM.push(new THREE.CylinderGeometry(0.13, 0.15, belfryH - 1.9, 8).translate(tx + ox, belfryY0 + 0.4 + (belfryH - 1.9) / 2, tz + oz));
            gSerenaM.push(new THREE.BoxGeometry(0.34, 0.2, 0.34).translate(tx + ox, belfryY0 + belfryH - 1.35, tz + oz)); // capital
            // twin arches
            for (const s of [-1, 1]) {
              const q = s * span / 4;
              const arch = new THREE.TorusGeometry(span / 4 - 0.04, 0.09, 6, 12, Math.PI);
              if (ry) { arch.rotateY(Math.PI / 2); arch.translate(tx + ox, belfryY0 + belfryH - 1.2, tz + oz + q); }
              else arch.translate(tx + ox + q, belfryY0 + belfryH - 1.2, tz + oz);
              gTrimM.push(arch);
            }
          }
          // BRONZE BELL hung compactly from a SHORT yoke tucked right under the
          // belfry entablature (owner r7 #4: the old full-width headstock beam
          // silhouetted through the open belfry as a floating horizontal bar). The
          // short yoke stays behind the piers so nothing reads as a floating stick.
          gSerenaM.push(new THREE.CylinderGeometry(0.34, 0.58, 0.78, 10).translate(tx, belfryY0 + belfryH - 1.35, tz));
          gSerenaM.push(new THREE.SphereGeometry(0.34, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5).translate(tx, belfryY0 + belfryH - 0.98, tz));
          gTrimM.push(new THREE.BoxGeometry(1.0, 0.16, 0.16).translate(tx, belfryY0 + belfryH - 0.72, tz)); // short yoke
          // belfry entablature
          gTrimM.push(new THREE.BoxGeometry(fp + 0.6, 0.44, fp + 0.6).translate(tx, belfryTop + 0.12, tz));
          // FOUR CORNER PINNACLE SPIRELETS
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            const pcx2 = tx + sx * (fp / 2 - 0.02), pcz2 = tz + sz * (fp / 2 - 0.02);
            gSerenaM.push(new THREE.BoxGeometry(0.5, 0.62, 0.5).translate(pcx2, belfryTop + 0.5, pcz2));
            gSerenaM.push(new THREE.ConeGeometry(0.28, 1.1, 4).translate(pcx2, belfryTop + 1.35, pcz2));
            gSerenaM.push(new THREE.SphereGeometry(0.1, 8, 6).translate(pcx2, belfryTop + 2.0, pcz2));
          }
          // OCTAGONAL DRUM + COPPO CUPOLA + LANTERN FINIAL. Owner r7 #4: the lantern
          // read as FLOATING above the campanile — the thin pyramid apex vanished at
          // distance, leaving sky between cupola and lantern. Fix: a squatter cupola,
          // a SOLID neck bridging the apex, and a lantern drum that overlaps DOWN into
          // it, so the crown reads as one continuous mass.
          gWall.push(new THREE.CylinderGeometry(fp * 0.4, fp * 0.44, 0.9, 8).translate(tx, belfryTop + 0.8, tz));
          gTrimM.push(new THREE.CylinderGeometry(fp * 0.46, fp * 0.46, 0.2, 8).translate(tx, belfryTop + 1.3, tz));
          const cuRise = fp * 0.30;
          hipRoof(tx, tz, fp * 0.82, fp * 0.82, belfryTop + 1.35, cuRise, 0.3, true); // W3 hides → coppi cupola cap
          const cuApex = belfryTop + 1.35 + cuRise;
          gTrimM.push(new THREE.CylinderGeometry(0.32, 0.6, cuRise * 0.85, 8).translate(tx, cuApex - cuRise * 0.35, tz)); // solid neck into the apex
          gTrimM.push(new THREE.CylinderGeometry(0.26, 0.36, 1.0, 8).translate(tx, cuApex + 0.1, tz));                     // lantern drum, overlaps down
          gTrimM.push(new THREE.SphereGeometry(0.22, 10, 8).translate(tx, cuApex + 0.78, tz));
          gTrimM.push(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6).translate(tx, cuApex + 1.18, tz));
          // ── CLOCK AEDICULE on the −Z shaft face: moulded bezel, pale dial, dark
          //    hands/markers (munMat), and a semicircular hood-mould over it.
          const ckY = topY - 3.4, ck = 1.2;
          gSerenaM.push(new THREE.BoxGeometry(ck * 2 + 0.7, ck * 2 + 0.7, 0.16).translate(tx, ckY, zF - 0.02)); // stone panel
          gSerenaM.push(new THREE.CylinderGeometry(ck + 0.14, ck + 0.14, 0.14, 20).rotateX(Math.PI / 2).translate(tx, ckY, zF - 0.10)); // bezel
          gWinM.push(new THREE.CylinderGeometry(ck, ck, 0.14, 20).rotateX(Math.PI / 2).translate(tx, ckY, zF - 0.14)); // pale dial
          const hood = new THREE.TorusGeometry(ck + 0.32, 0.11, 6, 16, Math.PI); hood.translate(tx, ckY, zF - 0.12); gTrimM.push(hood);
          for (let hh = 0; hh < 12; hh++) { const a = hh / 12 * Math.PI * 2; gMun.push(new THREE.BoxGeometry(0.1, 0.1, 0.05).translate(tx + Math.cos(a) * (ck - 0.28), ckY + Math.sin(a) * (ck - 0.28), zF - 0.19)); }
          box(gMun, 0.11, ck - 0.45, 0.05, tx, ckY + (ck - 0.45) / 2 - 0.05, zF - 0.2, 0, 0.5);   // hour hand
          box(gMun, 0.08, ck - 0.15, 0.05, tx, ckY + (ck - 0.15) / 2 - 0.02, zF - 0.2, 0, -0.9);  // minute hand
        } else {
          // ══ Owner review 2026-08-08 r5 #4 — "puntdaken beter afgewerkt" ══
          // A moulded two-band stone eave cornice, a terracotta coppo pyramid with
          // an antefix roll-tile course ringing the eave, and a real drum+ball+spike
          // finial (no more bare cone poking a naked sphere).
          gTrimM.push(new THREE.BoxGeometry(fp + 1.0, 0.3, fp + 1.0).translate(tx, topY + 0.2, tz));
          gTrimM.push(new THREE.BoxGeometry(fp + 0.6, 0.22, fp + 0.6).translate(tx, topY + 0.42, tz));
          const eY = topY + 0.55, rH = fp * 0.66, apexY = eY + rH;
          hipRoof(tx, tz, fp + 0.3, fp + 0.3, eY, rH, 0.45, true); // W3 hides this → coppi tower cap
          // antefix coppo roll-tiles ringing the eave
          const ne = Math.max(3, Math.round(fp));
          for (const [ex, ez, along] of [[0, -1, 1], [0, 1, 1], [-1, 0, 0], [1, 0, 0]] as [number, number, number][]) {
            for (let e = 0; e < ne; e++) {
              const q = -fp / 2 + 0.4 + (e / (ne - 1)) * (fp - 0.8);
              const px2 = along ? tx + q : tx + ex * (fp / 2 + 0.28);
              const pz2 = along ? tz + ez * (fp / 2 + 0.28) : tz + q;
              gRoofDS.push(new THREE.CylinderGeometry(0.11, 0.11, 0.3, 6).rotateX(Math.PI / 2).translate(px2, eY + 0.13, pz2));
            }
          }
          // finial: drum + ball + spike — owner r7 #4: the drum overlaps DOWN into the
          // pyramid apex (bottom well below apexY) so the finial never reads as
          // floating above the thin roof point.
          gSerenaM.push(new THREE.CylinderGeometry(0.28, 0.44, 1.0, 8).translate(tx, apexY - 0.1, tz)); // bottom apexY-0.6, into the pyramid
          gTrimM.push(new THREE.SphereGeometry(0.2, 10, 8).translate(tx, apexY + 0.5, tz));
          gTrimM.push(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6).translate(tx, apexY + 0.95, tz));
          // Bifora facing arrival (−Z): serena surround, two arched lights + colonnette
          const biYs = topY > 16 ? [topY - 2.1, topY - 6.0] : [topY - 2.1];
          for (const biY of biYs) {
            gSerenaM.push(new THREE.BoxGeometry(1.18, 1.62, 0.12).translate(tx, biY + 0.12, zF - 0.01));
            for (const lx of [-0.27, 0.27]) {
              gWinM.push(new THREE.BoxGeometry(0.34, 0.92, 0.16).translate(tx + lx, biY, zF - 0.02));
              const arch = new THREE.CylinderGeometry(0.17, 0.17, 0.16, 10, 1, false, 0, Math.PI);
              arch.rotateX(Math.PI / 2); arch.rotateZ(Math.PI / 2);
              arch.translate(tx + lx, biY + 0.46, zF - 0.02); gWinM.push(arch);
            }
            gTrimM.push(new THREE.CylinderGeometry(0.06, 0.075, 0.95, 8).translate(tx, biY - 0.02, zF - 0.06));
          }
        }
      });

      // ── r4: CLIMBING IVY + WEATHERING (owner: klimop op bepaalde plekken +
      // verkleuring). Ivy climbs a few piers / tower-bases / pavilion corners;
      // a damp moss skirt + broad discolour patches break the flat plaster.
      if (HI) {
        // owner r6 #3: MORE ivy, in varied colours (the mixed-bucket scatter in
        // ivyPatch gives each patch base-green + fresh-green + russet leaves).
        for (let i = 0; i < 9; i += 2) { const aw = 108 / 9, ax = -56 + (i + 0.5) * aw; ivyPatch(ax, -2.5, -27.5, 5.2, 1.7, false, 46); }
        for (const [tx, tz] of [[-38, -24], [-26, 37], [22, 37], [46, 16], [-50, 16]] as [number, number][]) ivyPatch(tx, 0.5, tz - 3.4, 7.5, 1.9, false, 52);
        // both long side faces climb higher, alternating fresh + russet accents
        ivyPatch(-40, 0.5, -25, 9, 1.6, false, 48);
        ivyPatch(40, 0.5, -25, 9, 1.6, false, 48);
        ivyPatch(-49, 4, 6, 8, 1.7, true, 44, gIvy2);   // west palazzo flank — fresh green
        ivyPatch(45, 4, 6, 8, 1.7, true, 44, gIvy3);    // east gallery flank — russet
        // a curtain spilling down each front-pavilion corner
        for (const [px, pz] of [[-26, -25.5], [24, -25.5]] as [number, number][]) ivyPatch(px, 1, pz, 9, 2.1, false, 54);
        // ivy creeping onto the campanile & rear-tower bases
        for (const [tx, tz] of [[36, -24], [22, 37]] as [number, number][]) ivyPatch(tx, 2, tz - 3.4, 10, 1.5, false, 40, gIvy2);
      }
      // damp moss skirt along the front bases (subtle, all GPUs)
      for (let i = 0; i < 9; i++) { const aw = 108 / 9, ax = -56 + (i + 0.5) * aw; box(gMoss, aw - 0.4, 1.0, 0.12, ax, 0.6, -27.6); }
      for (const [sx, sz] of [[-28, -25.3], [24, -25.3]] as [number, number][]) box(gMoss, 20, 0.9, 0.12, sx, 0.7, sz);
      // broad soft discolour patches on the big front faces ("verkleuring")
      for (const [sx, sy, sz, sw, sh2] of [[-28, 7, -25.3, 11, 8], [24, 7, -25.3, 11, 8], [-2, 9, -10.4, 10, 10], [-49, 6, -0.5, 8, 8], [45, 6, -0.5, 8, 8]] as [number, number, number, number, number][])
        box(gStain, sw, sh2, 0.05, sx, sy, sz);

      // ── 5 INVISIBLE CHAPTER-ANCHORS (targetWorldPos only; NOT click targets;
      // NOT raycastable — opacity 0). Redistributed over the balanced wings, all
      // inside the mass, clear of towers + the ±22° arrival wedge. roomId = WING id.
      const ANCHORS: [number, number][] = [
        [-36,  6],  // 0 roots    — west wing
        [ 32,  6],  // 1 nest     — east wing
        [ 24, -14], // 2 craft    — east front pavilion
        [-28, -14], // 3 travel   — west front pavilion
        [ -2, 30],  // 4 passions — deep rear range
      ];
      // ══ Owner review 2026-08-08 r5 #5 — "de koepel moet centraal van het gebouw
      // staan waar het op staat". The WHOLE arrival axis (dome+entrance in
      // centralGroup, the stair, parterre, terraces, cypress avenue and the camera)
      // lives on world x=0, but the built MASS (blocks + towers + substructure) is
      // symmetric about x=−2 — so the dome reads ~2u off-centre over block A. Fix:
      // mount every mass mesh + anchor in a group shifted +2 so the mass centres on
      // the x=0 axis (block A now sits directly under the dome). centralGroup and
      // the landscape are untouched → dolly/name-beat need no retune.
      const massGroup = new THREE.Group();
      massGroup.position.x = 2;
      palace.add(massGroup);

      ANCHORS.forEach(([ax, az], i) => {
        const wing = WINGS[i]; if (!wing) return;
        const anc = new THREE.Mesh(
          new THREE.BoxGeometry(4, 6, 4),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
        );
        anc.position.set(ax, 6, az);
        anc.userData = { roomId: wing.id, wingMeshes: [], accent: wing.accent };
        massGroup.add(anc);
        wingAnchors.push(anc);
      });

      // ── MERGE & MOUNT — each bucket → one static mesh ──
      ([[gWall, ochreWall, true], [gWallL, M.stoneL, true], [gWallD, M.stoneD, true],
        [gTrimM, M.trim, false], [gRoof, M.tile, true], [gRoofDS, roofMatDS, true], [gWinM, M.win, false],
        [gSerenaM, serenaMat, false], [gPlinthM, M.stoneD, false],
        [gWood, woodMat, true], [gIron, ironMat, true], [gIvy, ivyMat, false],
        [gIvy2, ivyMat2, false], [gIvy3, ivyMat3, false], [gGlass, glassMat, false],
        [gStain, stainMat, false], [gMoss, mossMat, false], [gMun, munMat, false]] as [THREE.BufferGeometry[], THREE.Material, boolean][])
        .forEach(([geos, mat, shadow]) => {
          if (!geos.length) return;
          const merged = mergeGeometries(geos);
          geos.forEach(g => g.dispose());
          if (!merged) return;
          extraGeoDisposables.push(merged);
          const mesh = new THREE.Mesh(merged, mat);
          mesh.castShadow = shadow;
          mesh.receiveShadow = true;
          massGroup.add(mesh);
        });
      // W3 un-merge: main block hip-roofs as their OWN mesh, hidden when W3 streams
      // modeled coppi roofs in their place. Flag off ⇒ renders identically.
      if (gBlockHip.length) {
        const mergedHip = mergeGeometries(gBlockHip);
        gBlockHip.forEach(g => g.dispose());
        if (mergedHip) {
          extraGeoDisposables.push(mergedHip);
          const hipMesh = new THREE.Mesh(mergedHip, roofMatDS);
          hipMesh.castShadow = true; hipMesh.receiveShadow = true;
          hipMesh.visible = !W3;
          massGroup.add(hipMesh);
        }
      }
    }
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
      // Dappled shadow disc on ground — 0.09 up (courtyard disc sits at +0.05
      // in this group's frame; 0.06 left only 0.01 clearance) and no depth
      // write: a transparent ground decal must never depth-spar with the
      // courtyard plane at distance (z-fighting sweep #6)
      const shadow = mk(new THREE.CircleGeometry(2.5, 12), new THREE.MeshStandardMaterial({ color: "#2A3A1A", roughness: 1, transparent: true, opacity: 0.12, depthWrite: false }), ox, 0.09, oz);
      shadow.rotation.x = -Math.PI / 2;
      cAdd(shadow);
    });

    // Symmetrical parterre gardens with flower beds
    const parterreData=[[-16,-25],[16,-25],[-16,-45],[16,-45],[-24,-35],[24,-35]];
    const hedgeDark=new THREE.MeshStandardMaterial({color:W1?"#3E4828":"#2E4A22",roughness:.88});
    const hedgeMid=new THREE.MeshStandardMaterial({color:W1?"#4C5A32":"#3A5A2A",roughness:.85});
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
    // Radiating side paths (skip wing zones) — y .05 not .03: these stones lie
    // ON the courtyard disc (world 8.35) and at .03 their top faces landed
    // exactly coplanar with it (z-fighting sweep #6); .05 puts them 0.02 proud
    for(let ri=0;ri<6;ri++){
      const pa=(ri/6)*Math.PI*2;if(Math.abs(Math.sin(pa))<.3&&Math.cos(pa)<0)continue;
      for(let s=0;s<6;s++){
        const pd=22+s*3;
        const px=Math.cos(pa)*pd,pz=Math.sin(pa)*pd;
        if(!isInWingZone(px,pz,2))cAdd(mk(new THREE.BoxGeometry(2.2,.04,1.2),M.pathD,px,.05,pz));
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
    // Mobile: 25% density (3750 blades), Desktop: 15000 blades
    const grassSystem = createGrassSystem(scene, {
      count: Math.round(15000*Q.vegetationDensity),
      radius: 90,
      innerRadius: 38,
      bladeHeight: 1.4,
      baseColor: "#4A5020",
      tipColor1: "#B8A860",
      tipColor2: "#8A8038",
      yOffset: HILL_Y,
    });

    // ── PALACE CYPRESS RING — LatheGeometry with vertex noise for natural columnar shape ──
    // W1 (WS2-4): ~150 unique per-tree hsl foliage materials collapse to 3 shared warm
    // olive tones picked by seed — silhouette variety stays in the per-tree geometry noise.
    // (Full cypress instancing deferred to Wave 2: it breaks per-tree Lathe silhouettes.)
    const cypressFoliageMats=W1?[
      new THREE.MeshStandardMaterial({color:"#26301E",roughness:.92,flatShading:true}),
      new THREE.MeshStandardMaterial({color:"#2E3A22",roughness:.92,flatShading:true}),
      new THREE.MeshStandardMaterial({color:"#39452B",roughness:.92,flatShading:true}),
    ]:null;
    // Distance-bucketed shared materials for the far columnar cypresses (3 haze bands)
    const farCypressMats=W1?[
      new THREE.MeshStandardMaterial({color:atmosColor("#33402A",200),roughness:.9}),
      new THREE.MeshStandardMaterial({color:atmosColor("#33402A",300),roughness:.9}),
      new THREE.MeshStandardMaterial({color:atmosColor("#33402A",430),roughness:.9}),
    ]:null;
    if(cypressFoliageMats)extraDisposables.push(...cypressFoliageMats);
    if(farCypressMats)extraDisposables.push(...farCypressMats);
    // ══ W2 (WS3-8) — instanced cypresses: collect per-tree transforms here and
    // materialize them as InstancedMesh per W1 foliage-material group after the
    // last planting site. Deterministic — reuses the exact positions/heights the
    // per-mesh path produced; each tree's seed derives from its position.
    const cypressNear: {px:number,pz:number,h:number,baseY:number,seed:number}[]|null=W2?[]:null;
    const cypressFar: {px:number,pz:number,h:number,baseY:number,band:number}[]|null=W2?[]:null;
    const buildCypress=(px: number,pz: number,h: number,baseY: number)=>{
      if(cypressNear){cypressNear.push({px,pz,h,baseY,seed:px*137.5+pz*281.3});return;}
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
      let foliageMat: THREE.MeshStandardMaterial;
      if(cypressFoliageMats){
        foliageMat=cypressFoliageMats[Math.abs(Math.floor(seed*7))%3];
      }else{
        const hue=126+Math.sin(seed)*14;
        const sat=38+Math.abs(Math.cos(seed*.5))*10;
        const lt=9+Math.abs(Math.sin(seed*.3))*4;
        foliageMat=new THREE.MeshStandardMaterial({
          color:new THREE.Color(`hsl(${hue},${sat}%,${lt}%)`),roughness:.92,flatShading:true,
        });
      }
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
    const vineRowMat=new THREE.MeshStandardMaterial({color:W1?"#4C5A30":"#3A5828",roughness:.84});
    const vineRowCount=isMobileQ?5:14;
    for(let row=0;row<vineRowCount;row++){
      const vx=35+row*2.2;const vz=35+Math.sin(row*.3)*3;
      const vBaseY=getHeightAt(vx,vz);
      const vr=mk(new THREE.BoxGeometry(.35,.6,16),vineRowMat,vx,vBaseY+.3,vz);
      vr.rotation.y=.15;scene.add(vr);
    }

    // ── COURTYARD BOXWOOD HEDGES ──
    const boxwoodMat=new THREE.MeshStandardMaterial({color:W1?"#3C4828":"#2A4A1E",roughness:.88});
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
    // W1 (WS3-4): warm field tints — greens shift to sun-dried olive
    const greenTints=W1?["#9A9850","#8C8C48","#A29C58"]:["#8A9848","#7A8840","#909850"];
    const earthTints=["#B0A070","#A09060","#B8A878"];
    // ══ W1 (WS2-4): SHARED FIELD MATERIALS + VERTEX-COLOR TINTING ══
    // The ~500 per-patch (+~250 per-vineyard-row, +25 sunflower) unique
    // MeshStandardMaterials collapse to 4 shared materials; the per-patch tint
    // moves into a baked vertex-color attribute, and every bucket merges into
    // ONE mesh — ~790 materials → 4 and ~790 draw calls → 4 on desktop.
    const fieldMats=W1?{
      wheat:new THREE.MeshStandardMaterial({
        map:cropTex.map,normalMap:cropTex.normalMap,normalScale:new THREE.Vector2(.6,.6),
        roughnessMap:cropTex.roughnessMap,aoMap:cropTex.aoMap,aoMapIntensity:.3,
        displacementMap:cropDispMap,displacementScale:0.8,
        vertexColors:true,roughness:.92,envMapIntensity:.15,
      }),
      green:new THREE.MeshStandardMaterial({
        map:grassTex.map,normalMap:grassTex.normalMap,normalScale:new THREE.Vector2(.5,.5),
        roughnessMap:grassTex.roughnessMap,
        vertexColors:true,roughness:.90,envMapIntensity:.12,
      }),
      earth:new THREE.MeshStandardMaterial({
        map:groundTex.map,normalMap:groundTex.normalMap,normalScale:new THREE.Vector2(.4,.4),
        roughnessMap:groundTex.roughnessMap,
        vertexColors:true,roughness:.94,envMapIntensity:.1,
      }),
      vine:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.84}),
    }:null;
    if(fieldMats)extraDisposables.push(fieldMats.wheat,fieldMats.green,fieldMats.earth,fieldMats.vine);
    const fieldBuckets=fieldMats?{
      wheat:[] as THREE.BufferGeometry[],green:[] as THREE.BufferGeometry[],
      earth:[] as THREE.BufferGeometry[],vine:[] as THREE.BufferGeometry[],
    }:null;
    const _fieldDummy=new THREE.Object3D();
    // Bake a uniform tint into a color attribute, apply the world transform, queue for merge
    const pushTinted=(bucket:THREE.BufferGeometry[],geo:THREE.BufferGeometry,tint:THREE.Color,px:number,py:number,pz:number,rx:number,ry:number,rz:number)=>{
      const n=geo.attributes.position.count;const arr=new Float32Array(n*3);
      for(let i=0;i<n;i++){arr[i*3]=tint.r;arr[i*3+1]=tint.g;arr[i*3+2]=tint.b;}
      geo.setAttribute("color",new THREE.BufferAttribute(arr,3));
      _fieldDummy.position.set(px,py,pz);_fieldDummy.rotation.set(rx,ry,rz);_fieldDummy.updateMatrix();
      geo.applyMatrix4(_fieldDummy.matrix);
      bucket.push(geo);
    };
    // VERY dense field coverage — 500 patches for a sea of golden wheat (60 on mobile)
    const fieldPatchCount=isMobileQ?60:500;
    for(let fi=0;fi<fieldPatchCount;fi++){
      const angle=Math.random()*Math.PI*2;
      const dist=65+Math.random()*480;
      const fx=Math.cos(angle)*dist,fz=Math.sin(angle)*dist-40;
      if(Math.sqrt(fx*fx+(fz+40)*(fz+40))<62)continue;
      const fw=18+Math.random()*55,fl=12+Math.random()*40;
      const d=Math.sqrt(fx*fx+fz*fz);
      // 90% golden wheat, 6% green crop, 4% plowed earth
      const fieldType=Math.random();
      if(fieldBuckets){
        const geo=new THREE.PlaneGeometry(fw,fl,16,16);
        const fy=getHeightAt(fx,fz)+.2,frz=Math.random()*.5-.25;
        if(fieldType<0.90)pushTinted(fieldBuckets.wheat,geo,atmosColor(wheatTints[fi%wheatTints.length],d),fx,fy,fz,-Math.PI/2,0,frz);
        else if(fieldType<0.96)pushTinted(fieldBuckets.green,geo,atmosColor(greenTints[fi%greenTints.length],d),fx,fy,fz,-Math.PI/2,0,frz);
        else pushTinted(fieldBuckets.earth,geo,atmosColor(earthTints[fi%earthTints.length],d),fx,fy,fz,-Math.PI/2,0,frz);
        continue;
      }
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
    // W1: warm olive vine tones; every row's unique material collapses into the shared
    // vertex-tinted vine bucket (one merged mesh) instead of ~250 materials/draws.
    const vineM=[new THREE.MeshStandardMaterial({color:W1?"#4C5A30":"#3A5828",roughness:.85}),new THREE.MeshStandardMaterial({color:W1?"#5C6A38":"#4A6830",roughness:.82})];
    extraDisposables.push(...vineM);
    const vineyardCount=isMobileQ?3:14;
    for(let vi=0;vi<vineyardCount;vi++){
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
        if(fieldBuckets){
          pushTinted(fieldBuckets.vine,new THREE.BoxGeometry(.35,.7,rowLen),vCol,rx,getHeightAt(rx,rz)+.35,rz,0,vRot,0);
          continue;
        }
        const rm=mk(new THREE.BoxGeometry(.35,.7,rowLen),new THREE.MeshStandardMaterial({color:vCol,roughness:.84}),rx,getHeightAt(rx,rz)+.35,rz);
        rm.rotation.y=vRot;scene.add(rm);
      }
    }

    // ── CYPRESS TREES: dense Tuscan signature ──
    // Mobile: ~75% fewer trees (only road avenue + 8 hilltop clusters)
    const cypressPositions: number[][]=[];
    // Along winding road — dense avenue
    const roadCypressCount=isMobileQ?15:50;
    for(let ri=0;ri<roadCypressCount;ri++){
      const rz=-45-ri*7;const rx=Math.sin(ri*.22)*28;
      if(Math.random()>.3)cypressPositions.push([rx-4.5+Math.random()*1.5,rz+Math.random()*2]);
      if(Math.random()>.3)cypressPositions.push([rx+4.5+Math.random()*1.5,rz+Math.random()*2]);
    }
    // Hilltop clusters
    const hilltopClusterCount=isMobileQ?8:35;
    for(let ci=0;ci<hilltopClusterCount;ci++){
      const angle=Math.random()*Math.PI*2,dist=55+Math.random()*(isMobileQ?120:280);
      cypressPositions.push([Math.cos(angle)*dist,Math.sin(angle)*dist-50]);
    }
    // Iconic ridge lines of 4-8 trees (skip on mobile)
    if(!isMobileQ){for(let g=0;g<12;g++){
      const gx=-250+Math.random()*500,gz=-60-Math.random()*320;
      const gCount=4+Math.floor(Math.random()*5);
      const gAngle=Math.random()*Math.PI;
      for(let t=0;t<gCount;t++){
        cypressPositions.push([gx+Math.cos(gAngle)*t*4+Math.random()*1.5,gz+Math.sin(gAngle)*t*4+Math.random()*1.5]);
      }
    }}
    // Farmhouse accompaniment (fewer on mobile)
    const farmCypressCount=isMobileQ?5:20;
    for(let f=0;f<farmCypressCount;f++){
      const angle=Math.random()*Math.PI*2,dist=100+Math.random()*(isMobileQ?120:250);
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
      }else if(cypressFar){
        // W2 (WS3-8): far tier joins the per-haze-band instanced buckets
        cypressFar.push({px:cx2,pz:cz,h:ch,baseY:cyBaseY,band:d<260?0:d<360?1:2});
      }else{
        scene.add(mk(new THREE.CylinderGeometry(.06,.12,ch*.2,5),M.barkD,cx2,cyBaseY+ch*.1,cz));
        // Columnar silhouette — tapered cylinder (narrow, not cone-shaped)
        // W1: 3 shared distance-band materials instead of a unique material per tree
        const mat=farCypressMats
          ?farCypressMats[d<260?0:d<360?1:2]
          :new THREE.MeshStandardMaterial({color:atmosColor(`hsl(${126+Math.random()*12},${32+Math.random()*10}%,${10+Math.random()*5}%)`,d),roughness:.9});
        const col=new THREE.Mesh(new THREE.CylinderGeometry(.12,.3,ch*.8,6),mat);
        col.position.set(cx2,cyBaseY+ch*.5,cz);col.castShadow=d<250;scene.add(col);
      }
    });

    // ── W2 CYPRESSENLAAN — the arrival avenue on the entrance axis ──
    // Owner redesign 2026-08-06: a double file of cypresses leads the 18s dolly
    // up the hillside to the stair, so the palace reads as something you come
    // upon in the Tuscan landscape. Deterministic pairs (no random); under W2
    // they join the instanced buckets via buildCypress → cypressNear.
    // Placed south of the parterre (which ends at z≈-47), clear of every wing,
    // tower and the cross-axis path.
    if (W2) {
      for (let a = 0; a < 11; a++) {
        const az = -50 - a * 6;      // z -50 → -110 down the descending slope
        const ax = 6 + a * 0.18;     // splay outward very slightly with distance
        const ah = 8.6 - a * 0.16;   // tall near, tapering into the haze
        for (const sx of [-ax, ax]) buildCypress(sx, az, ah, getHeightAt(sx, az));
      }
    }

    // ── OLIVE GROVES: silver-green, gnarled ──
    const oliveCount=isMobileQ?10:40;
    for(let oi=0;oi<oliveCount;oi++){
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
    const stonePineCount=isMobileQ?4:18;
    for(let pi=0;pi<stonePineCount;pi++){
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
    const farmPositionsAll=[[-110,-140],[135,-120],[-55,-200],[95,-230],[-170,-110],[190,-160],[-35,-270],[65,-290],
      [-150,-195],[165,-215],[-85,-280],[105,-165],[-195,-140],[225,-110],[-125,-250],[155,-275],
      [-40,-150],[130,-190],[-90,-110],[180,-250],[-210,-200],[250,-180],[-160,-300],[200,-310]];
    // Mobile: only the closest 6 farmhouses
    const farmPositions=isMobileQ?farmPositionsAll.slice(0,6):farmPositionsAll;
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
      // Warm window glow (skip on mobile)
      if(!isMobileGPU()&&d<250){
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
      // Dusty shoulder — wider, softer. Transparent overlay: no depth write
      // (z-fighting sweep #6 — decal planes never contest the depth buffer)
      const dustGeo=new THREE.PlaneGeometry(w+2.5,len+1);
      const dustMat=new THREE.MeshStandardMaterial({
        color:atmosColor("#E8DCC4",d),roughness:.96,transparent:true,opacity:.3,depthWrite:false,
      });
      const dust=new THREE.Mesh(dustGeo,dustMat);
      dust.rotation.x=-Math.PI/2;dust.position.set(x,y-.04,z);dust.rotation.z=rotY;
      scene.add(dust);
      // Wheel ruts — two subtle darker tracks. +0.03 over the gravel (was +0.01:
      // right at the 24-bit depth epsilon for the farthest road segments, the
      // classic distance shimmer) + no depth write (z-fighting sweep #6)
      for(const offset of[-w*.28,w*.28]){
        const rutGeo=new THREE.PlaneGeometry(w*.12,len-.5);
        const rutMat=new THREE.MeshStandardMaterial({
          color:atmosColor("#C8B8A0",d),roughness:.96,transparent:true,opacity:.22,depthWrite:false,
        });
        const rut=new THREE.Mesh(rutGeo,rutMat);
        rut.rotation.x=-Math.PI/2;
        rut.position.set(x+Math.cos(rotY)*offset,y+.03,z-Math.sin(rotY)*offset);
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
    const mainRoadSegs=isMobileQ?20:75;
    for(let ri=0;ri<mainRoadSegs;ri++){
      const rz=-110-ri*6;const rx=Math.sin(ri*.18)*35+Math.cos(ri*.07)*15;
      mkStrada(rx,rz,3.5,7,Math.atan2(Math.cos(ri*.18)*.18*35,1)*.1);
    }
    // East branch strada (skip on mobile)
    if(!isMobileQ){for(let ri=0;ri<45;ri++){
      const baseAngle=Math.PI*0.3;
      const rDist=70+ri*7;
      const rx2=Math.cos(baseAngle)*rDist+Math.sin(ri*.15)*18;
      const rz2=-Math.sin(baseAngle)*rDist+Math.cos(ri*.12)*8-55;
      mkStrada(rx2,rz2,3.0,7.5,baseAngle*.3);
    }}
    // West branch strada (skip on mobile)
    if(!isMobileQ){for(let ri=0;ri<40;ri++){
      const baseAngle=-Math.PI*0.35;
      const rDist=75+ri*7;
      const rx3=Math.cos(baseAngle)*rDist+Math.sin(ri*.12)*15;
      const rz3=-65-ri*6;
      mkStrada(rx3,rz3,2.8,7,0);
    }}

    // ── ROMAN AQUEDUCT — Pont du Gard-style two-tier structure ──
    // Skipped on mobile — hundreds of geometry pieces, very far from camera
    if(!isRenaissance&&!isMobileQ){
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
    // Winding stream — longer, more natural (fewer segments on mobile)
    const streamSegments=isMobileQ?10:30;
    for(let si=0;si<streamSegments;si++){
      const sx=8+si*2.5+Math.sin(si*.3)*4;const sz=bridgeZ+Math.sin(si*.35)*6-si*.5;
      const sw=new THREE.Mesh(new THREE.BoxGeometry(2.5+Math.random()*.5,.04,2.2),M.water);
      sw.position.set(sx,getHeightAt(sx,sz)+.12,sz);sw.rotation.y=Math.atan2(Math.cos(si*.35)*6*.35,2.5)+Math.random()*.2;
      scene.add(sw);
    }

    // ── MEDIEVAL HILLTOP VILLAGES removed — Rolling Hills HDRI provides distant scenery ──

    // ── SUNFLOWER/WHEAT FIELDS: dense textured golden patches ──
    const sunflowerTones=["#D8B848","#C8A840","#E4C050","#B89838","#D0B048","#DCC058","#C4A040","#E0C460"];
    const sunflowerCount=isMobileQ?4:25;
    for(let sf=0;sf<sunflowerCount;sf++){
      const angle=Math.random()*Math.PI*2,dist=100+Math.random()*180;
      const sx=Math.cos(angle)*dist,sz=Math.sin(angle)*dist-30;
      if(Math.sqrt(sx*sx+(sz+30)*(sz+30))<80)continue;
      const d=Math.sqrt(sx*sx+sz*sz);
      const sfCol=atmosColor(sunflowerTones[sf%sunflowerTones.length],d);
      const sfGeo=new THREE.PlaneGeometry(22+Math.random()*18,16+Math.random()*12,12,12);
      if(fieldBuckets){
        // W1: fold into the shared wheat bucket (same crop maps — one merged mesh)
        pushTinted(fieldBuckets.wheat,sfGeo,sfCol,sx,getHeightAt(sx,sz)+.25,sz,-Math.PI/2,0,Math.random()*.4);
        continue;
      }
      const sfm=new THREE.Mesh(sfGeo,new THREE.MeshStandardMaterial({
        map:cropTex.map,normalMap:cropTex.normalMap,normalScale:new THREE.Vector2(.5,.5),
        roughnessMap:cropTex.roughnessMap,
        displacementMap:cropDispMap,displacementScale:0.5,
        color:sfCol,roughness:.92,envMapIntensity:.1,
      }));
      sfm.rotation.x=-Math.PI/2;sfm.position.set(sx,getHeightAt(sx,sz)+.25,sz);sfm.rotation.z=Math.random()*.4;
      sfm.receiveShadow=true;scene.add(sfm);
    }

    // ══ W1 (WS2-4): merge each shared-material field bucket into ONE mesh ══
    if(fieldBuckets&&fieldMats){
      ([["wheat",fieldMats.wheat],["green",fieldMats.green],["earth",fieldMats.earth],["vine",fieldMats.vine]] as const).forEach(([key,mat])=>{
        const geos=fieldBuckets[key as keyof typeof fieldBuckets];
        if(!geos.length)return;
        const merged=mergeGeometries(geos);
        geos.forEach(g=>g.dispose());
        if(!merged)return;
        const mesh=new THREE.Mesh(merged,mat);
        mesh.receiveShadow=true;
        scene.add(mesh);
      });
    }

    // ══ W2 (WS3-8) — materialize the instanced cypresses ══
    // Near tier: ONE canonical unit-height Lathe silhouette (fixed seed) × the
    // 3 shared W1 olive foliage materials + one instanced trunk; far tier: ONE
    // tapered column × the 3 haze-band materials + one instanced trunk.
    // ~200 per-tree meshes/geometries collapse to ≤8 draw calls; per-instance
    // scale/lean (from each tree's deterministic seed) keeps the variety.
    if(W2&&cypressNear&&cypressFar&&cypressFoliageMats&&farCypressMats){
      const _cyDummy=new THREE.Object3D();
      const NSEED=12.7,profSegs=18;
      const prof: THREE.Vector2[]=[];
      for(let i=0;i<=profSegs;i++){
        const tt=i/profSegs;let r: number;
        if(tt<0.05)r=.5*.35*(tt/.05);
        else if(tt<0.2)r=.5*(.35+.65*((tt-.05)/.15));
        else if(tt<0.9){const tp=(tt-.2)/.7;r=.5*(1-.4*tp);}
        else{const tp=(tt-.9)/.1;r=.5*.6*(1-tp);}
        const n=Math.sin(NSEED+tt*47.3)*Math.cos(NSEED*.7+tt*31.1);
        prof.push(new THREE.Vector2(Math.max(r*(1+n*.12),.02),tt));
      }
      const nearFoliageGeo=new THREE.LatheGeometry(prof,8);
      nearFoliageGeo.computeVertexNormals();
      const nearTrunkGeo=new THREE.CylinderGeometry(.04,.14,.3,5);nearTrunkGeo.translate(0,.15,0);
      const farColGeo=new THREE.CylinderGeometry(.12,.3,.8,6);farColGeo.translate(0,.5,0);
      const farTrunkGeo=new THREE.CylinderGeometry(.06,.12,.2,5);farTrunkGeo.translate(0,.1,0);
      const setInstances=(mesh:THREE.InstancedMesh,items:{px:number,pz:number,h:number,baseY:number,seed?:number}[],foliage:boolean)=>{
        items.forEach((c,i)=>{
          const seed=c.seed??0;
          if(foliage){
            const lean=(Math.sin(seed*1.7)-.5)*.03;
            const s=1+Math.sin(seed*1.3)*.1;
            _cyDummy.position.set(c.px+lean,c.baseY+c.h*.18,c.pz);
            _cyDummy.rotation.set(0,seed,0);
            _cyDummy.scale.set(s,c.h*.82,s);
          }else{
            _cyDummy.position.set(c.px,c.baseY,c.pz);
            _cyDummy.rotation.set(0,0,0);
            _cyDummy.scale.set(1,c.h,1);
          }
          _cyDummy.updateMatrix();
          mesh.setMatrixAt(i,_cyDummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate=true;
        scene.add(mesh);
      };
      for(let b=0;b<3;b++){
        const items=cypressNear.filter(c=>Math.abs(Math.floor(c.seed*7))%3===b);
        if(!items.length)continue;
        const im=new THREE.InstancedMesh(nearFoliageGeo,cypressFoliageMats[b],items.length);
        im.castShadow=true;
        setInstances(im,items,true);
      }
      if(cypressNear.length){
        setInstances(new THREE.InstancedMesh(nearTrunkGeo,M.barkD,cypressNear.length),cypressNear,false);
      }else{nearFoliageGeo.dispose();nearTrunkGeo.dispose();}
      for(let b=0;b<3;b++){
        const items=cypressFar.filter(c=>c.band===b);
        if(!items.length)continue;
        const im=new THREE.InstancedMesh(farColGeo,farCypressMats[b],items.length);
        im.castShadow=b===0; // only the nearest haze band casts (matches d<250 rule)
        setInstances(im,items,false);
      }
      if(cypressFar.length){
        setInstances(new THREE.InstancedMesh(farTrunkGeo,M.barkD,cypressFar.length),cypressFar,false);
      }else{farColGeo.dispose();farTrunkGeo.dispose();}
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
    // Add many procedurally generated fields across wider area (skip on mobile)
    const extraFieldCount=isMobileQ?0:35;
    for(let extra=0;extra<extraFieldCount;extra++){
      const angle=Math.random()*Math.PI*2;
      const dist=120+Math.random()*250;
      const wx2=Math.cos(angle)*dist;
      const wz2=Math.sin(angle)*dist-60;
      if(Math.sqrt(wx2*wx2+(wz2+60)*(wz2+60))<90)continue;
      wheatPositions.push([wx2,wz2,30+Math.random()*25,20+Math.random()*18]);
    }
    // On mobile, skip far wheat fields entirely and reduce near-field density
    const wheatSubset=isMobileQ?wheatPositions.slice(0,8):wheatPositions;
    // W1 (WS2-4): ONE shared wheat shader material for every field (~45 ShaderMaterials → 1);
    // per-field hsl uniforms are replaced by per-instance variation baked into the shared shader.
    const W1_WHEAT_STALK_H=1.7;
    const sharedWheatMat=W1?createSharedWheatMaterial(W1_WHEAT_STALK_H):null;
    if(sharedWheatMat)extraDisposables.push(sharedWheatMat);
    wheatSubset.forEach(([wx, wz, ww, wd], i) => {
      const isFar = i >= 16;
      const baseCount=isFar ? 600 : (1500 + Math.floor(Math.random() * 1000));
      wheatFields.push(createWheatField(scene, {
        count: Math.round(baseCount*Q.vegetationDensity),
        centerX: wx, centerZ: wz, width: ww, depth: wd,
        stalkHeight: sharedWheatMat ? W1_WHEAT_STALK_H : 1.4 + Math.random() * 0.9,
        color: `hsl(${42 + Math.random() * 15}, ${45 + Math.random() * 20}%, ${58 + Math.random() * 14}%)`,
        headColor: `hsl(${40 + Math.random() * 12}, ${50 + Math.random() * 20}%, ${64 + Math.random() * 12}%)`,
        getHeightAt,
        material: sharedWheatMat ?? undefined,
      }));
    });

    // ── STONE WALLS: dry stone walls between fields ──
    const stoneWallCount=isMobileQ?5:20;
    for(let sw=0;sw<stoneWallCount;sw++){
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

    // ── HOVER / WALKTHROUGH AFFORDANCE ──
    // W1 (WS3-7 + perf audit): the idle emissive-lerp loop that mutated ~1000 cloned
    // materials every frame is DEAD, along with the per-mesh material cloning that fed
    // it and the 12 idle per-wing PointLights. Replacement: ONE shared ember hover
    // light + ONE shared gold walkthrough light, repositioned on state CHANGE only.
    const targetWorldPos=new Map<string,THREE.Vector3>();
    [...clickTargets,...wingAnchors].forEach((ct: any)=>{const pos=new THREE.Vector3();ct.getWorldPosition(pos);targetWorldPos.set(ct.userData.roomId,pos);});

    // ══ W2 (WS3-10/11) — persistent travertine signposts in Fraunces ink ══
    // Always-visible wayfinding replacing the hover-only label: a travertine
    // stele + Fraunces plaque beside every wing and at the entrance approach,
    // each with an oversized invisible hit box (tremor-friendly) that joins
    // clickTargets under the same roomId — so a signpost tap runs the exact
    // wing/entrance tap contract, and the W1 ember hover light answers hover.
    // Unlit label (MeshBasicMaterial) + existing materials: zero new lights.
    // ── Owner feedback 2026-08-06 #6B: the click-hub is retired. Per-wing
    // signposts are DISABLED — the exterior has one goal, the monumental
    // entrance; wings are reached through the entrance hall. The machinery is
    // kept behind this const so the W2 wayfinding can be restored in one flip.
    const WING_SIGNPOSTS_ENABLED=false;
    if(W2){
      const addSignpost=(id: string,label: string,sx: number,sz: number,ry: number)=>{
        const g=new THREE.Group();
        g.position.set(sx,HILL_Y+0.3,sz);g.rotation.y=ry;
        g.add(mk(new THREE.BoxGeometry(0.9,0.3,0.9),M.stoneD,0,0.15,0));
        g.add(mk(new THREE.BoxGeometry(0.34,2.1,0.34),M.trim,0,1.35,0));
        g.add(mk(new THREE.BoxGeometry(0.5,0.12,0.5),M.trim,0,2.46,0));
        const lbl=makeFrauncesLabel(label,{width:2.3,height:0.55});
        lbl.position.set(0,1.85,0.19);
        g.add(lbl);
        const hit=new THREE.Mesh(new THREE.BoxGeometry(3.2,3.4,1.6),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
        hit.position.set(0,1.7,0);hit.userData={roomId:id,wingMeshes:[],accent:EMBER};
        g.add(hit);clickTargets.push(hit);
        scene.add(g);
      };
      if(WING_SIGNPOSTS_ENABLED){
        WINGS.forEach((wing: Wing)=>{
          const p=targetWorldPos.get(wing.id);if(!p)return;
          const r0=Math.hypot(p.x,p.z)||1;
          // Beside the wing (perpendicular offset clears the portico), facing the courtyard
          const sx=p.x+(-p.z/r0)*6.5,sz=p.z+(p.x/r0)*6.5;
          addSignpost(wing.id,wing.name,sx,sz,Math.atan2(-sx,-sz));
        });
      }
      // Entrance signpost stays (tremor-friendly named tap target) — moved off
      // the new monumental stair to the left flank of its foot, facing arrival.
      addSignpost(entranceId,entranceHallLabelRef.current,-7.2,-20.4,Math.PI);
    }
    const hoverLights: {light:THREE.PointLight,targetIntensity:number,wingId:string}[]=[];
    let w1HoverLight: THREE.PointLight|null=null;
    let w1HlLight: THREE.PointLight|null=null;
    if(W1){
      w1HoverLight=new THREE.PointLight(EMBER,0,45);scene.add(w1HoverLight);
      w1HlLight=new THREE.PointLight(GOLD,0,50);scene.add(w1HlLight);
    }else{
      // Legacy: one accent PointLight per wing + entrance
      clickTargets.forEach((ct: any)=>{
        const pos=targetWorldPos.get(ct.userData.roomId)!;
        const hl=new THREE.PointLight(ct.userData.accent,0,45);
        hl.position.set(pos.x,12,pos.z);
        scene.add(hl);
        hoverLights.push({light:hl,targetIntensity:0,wingId:ct.userData.roomId});
      });
    }

    // ── PER-WING WINDOW MATERIALS (legacy path only) ──
    // Clone window materials for each wing so hover glow is independent
    const wingWindowMats: Map<string,{mesh:THREE.Mesh,cloned:THREE.MeshStandardMaterial,baseIntensity:number}[]>=new Map();
    if(!W1){
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
    }

    scene.add(palace);
    if(!isMobileGPU()){scene.add(new THREE.PointLight("#FFD080",0.15,15).translateX(-5).translateY(HILL_Y+5).translateZ(0));
    scene.add(new THREE.PointLight("#FFD080",0.15,15).translateX(5).translateY(HILL_Y+5).translateZ(0));}

    // ── WALKTHROUGH HIGHLIGHT — golden glow on target wing/entrance (legacy: one light per target) ──
    const hlLights: Map<string,THREE.PointLight>=new Map();
    if(!W1){
      clickTargets.forEach((ct: any)=>{
        const pos=targetWorldPos.get(ct.userData.roomId)!;
        const light=new THREE.PointLight("#D4AF37",0,50);light.position.set(pos.x,12,pos.z);scene.add(light);
        hlLights.set(ct.userData.roomId,light);
      });
    }

    let prevHovered: string|null=null;
    // W1 affordance state — lights update only when these change (no per-frame writes)
    let _w1PrevHover: string|null=null,_w1PrevHl: string|null=null;
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
    // ── Optimize: deduplicate materials to reduce GPU state changes ──
    optimizeMaterials(scene);

    const _isMobile=window.innerWidth<768||window.innerHeight<500;
    let _frameCount=0;
    let _lastHovId:string|null=null;
    const animate=()=>{
      frameRef.current=requestAnimationFrame(animate);
      // Skip the entire animation pass (emissive lerps, particles, render) when
      // host is paused (data-paused="1" on portal host). Saves CPU/GPU while the
      // user is in Atrium/Library, but the warm-up frame on mount still runs in
      // full so onReady fires and the scene is ready to show on first unhide.
      const _hostEl=el.parentElement;
      if(_firstFrameDone&&_hostEl&&_hostEl.dataset&&_hostEl.dataset.paused==="1")return;
      // dt clamped so a large delta (tab switch / pause resume) can't snap the camera
      const dt=Math.min(clock.getDelta(),.1);
      const t=clock.getElapsedTime();_frameCount++;
      // Framerate-independent smoothing helper: 1-exp(-k*dt) with k=-ln(1-f)*60
      // preserves the old per-frame factors f exactly at 60fps.
      const _sm=(k:number)=>1-Math.exp(-k*dt);

      // Walkthrough highlight
      const hlTarget=highlightDoorRef.current;
      if(W1){
        // W1: shared lights, repositioned/stepped on state CHANGE only — the per-frame
        // emissive-lerp over ~1000 cloned materials is dead (WS3-7 / audit finding).
        const hovNow=hoveredRoomRef.current;
        if(hovNow!==_w1PrevHover){
          _w1PrevHover=hovNow;
          const p=hovNow?targetWorldPos.get(hovNow):undefined;
          if(w1HoverLight){
            if(p){w1HoverLight.position.set(p.x,12,p.z);w1HoverLight.intensity=1.8;}
            else w1HoverLight.intensity=0;
          }
        }
        const hlNow=hlTarget??null;
        if(hlNow!==_w1PrevHl){
          _w1PrevHl=hlNow;
          const p=hlNow?targetWorldPos.get(hlNow):undefined;
          if(w1HlLight){
            if(p)w1HlLight.position.set(p.x,12,p.z);
            else w1HlLight.intensity=0;
          }
        }
        // Gentle pulse on the single active walkthrough light (one scalar write)
        if(hlNow&&w1HlLight&&targetWorldPos.has(hlNow))w1HlLight.intensity=3+Math.sin(t*2)*1.5;
      }else if(hlTarget){
        // Legacy: pulse golden emissive on target meshes
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
      // ── Onboarding cinematic: WP1 (hold + prompt) → WP2-5 flyover → zoom to entrance ──
      if (onboardingModeRef.current && !autoWalkToRef.current && !camDebugRef.current) {
        const rawT = clock.getElapsedTime();
        const HOLD_DUR = 1.5; // seconds to drift to WP1 before showing prompt

        // Detect cinematicResumed prop becoming true → capture clock time
        if (cinematicResumedRef.current && cinematicResumeTimeRef.current === null && cinematicPauseFiredRef.current) {
          cinematicResumeTimeRef.current = rawT;
        }

        // Phase 0: drift to waypoint 1 & fire pause callback
        if (cinematicResumeTimeRef.current === null) {
          camOT.current.theta = Math.PI * 1.4987;
          camOT.current.phi   = Math.PI * 0.4387;
          camD.current += (180 - camD.current) * _sm(3.0776); // f=.05 @60fps
          if (rawT >= HOLD_DUR && !cinematicPauseFiredRef.current) {
            cinematicPauseFiredRef.current = true;
            if (onCinematicPauseRef.current) onCinematicPauseRef.current();
          }
        } else if (W2 && prefersReducedMotion()) {
          // W2 (WS3-10): reduced-motion = crossfade between 3 composed stills
          // of the same dolly (wide → tympanum beat, name in frame → before
          // the door), cream veil at each cut, then the same entrance handoff.
          const ot = rawT - cinematicResumeTimeRef.current;
          const SHOT=2.4,FADE=.5;
          const stills: [number,number,number][]=[
            [Math.PI*1.4987,Math.PI*0.4387,180],
            [Math.PI*1.5480,Math.PI*0.3060,118], // name-beat (owner review #1): matches the dolly beat — poorttorens ±~13,−13, tall lantern-crowned dome bekroont above
            [Math.PI*1.5,Math.PI*0.22,35],
          ];
          const si=Math.min(Math.floor(ot/SHOT),2);
          const s=stills[si];
          camO.current.theta=camOT.current.theta=s[0];
          camO.current.phi=camOT.current.phi=s[1];
          camD.current=s[2];
          const local=ot-si*SHOT;
          const veil=ensureRmVeil();
          let vo=0;
          if(si>0&&local<FADE)vo=1-local/FADE;
          if(si<2&&local>SHOT-FADE)vo=Math.max(vo,(local-(SHOT-FADE))/FADE);
          veil.style.opacity=String(vo*.9);
          if(si===2&&local>=SHOT){
            veil.style.opacity="0";
            onboardingModeRef.current=false;
            onRoomClickRef.current("__entrance__");
          }
        } else if (W1 && prefersReducedMotion()) {
          // W1 (WS12-1): prefers-reduced-motion skips the WP2-5 flyover pans —
          // cut straight to the end framing and hand off to the entrance. The
          // pause-prompt flow above (phase 0, camera already at WP1) still ran.
          camO.current.theta = camOT.current.theta = Math.PI * 1.5;
          camO.current.phi   = camOT.current.phi   = Math.PI * 0.22;
          camD.current = 35;
          onboardingModeRef.current = false;
          onRoomClickRef.current("__entrance__");
        } else {
          // Resumed — compute time since resume
          const ot = rawT - cinematicResumeTimeRef.current;
          // W2 (WS3-10): ~18s authored establishing dolly INTO the low SW sun —
          // cypress contre-jour over the fields, TYMPANUM BEAT (owner's name
          // legible) at ~7.5s, descending to eye level at camD≈35 before the
          // door. Same Catmull-Rom machinery, same Skip/pause/resume contract;
          // yaw stays under the shared MAX_YAW_DEG_S clamp applied below.
          // Legacy (flag off): 5-waypoint flyover, 7s + 3.8s zoom.
          // Grandeur retune (owner feedback 2026-08-06 #6B-4): the dolly now serves
          // the raised dome — beats 2-4 ride slightly higher and a touch wider so
          // the lantern-crowned silhouette dominates the frame; the TYMPANUM BEAT
          // stays at ~7.5s (name legible), then the descent to the one door.
          // Grondplan v3 (signature): the WP1→WP2 lateral swing to θ=1.66π sweeps
          // the camera sun-side across the E poorttoren and the long broad galerij
          // (B, reaching x≈+92) so the verticals of the wide corps slide past each
          // other as coulisses — free parallax, no extra waypoints.
          // ══ Owner review 2026-08-06 #1 retune — the dome is now much HIGHER
          // (shell apex world ≈36, lantern finial ≈43) and the poorttorens moved
          // slightly wider ((−15,−13)/(+12,−13), fp8). The whole path is pulled a
          // touch HIGHER (phi ↑) and the name-beat a touch further + wider so BOTH
          // widened poorttorens bracket the x=0 tympanum AND the tall lantern-
          // crowned dome bekroont the frame in one read at ~7.5s. The lookAt
          // target also rises (below) so the crowning lantern stays in frame.
          const WP: [number,number,number][] = W2 ? [
            [Math.PI*1.4987, Math.PI*0.4387, 185.0], // 0s: seamless from the WP1 hold
            [Math.PI*1.6600, Math.PI*0.3980, 158.0], // ~3.8s: swing sun-side, cypress contre-jour, tall dome crowning the broad ridge, long galerij sweeping east
            [Math.PI*1.5480, Math.PI*0.3060, 118.0], // ~7.5s: TYMPANUM BEAT — name framed BETWEEN the two poorttorens (±~13,−13), the high lantern-crowned dome bekroont above; wider + further so both bracket the axis and the tall crown reads in one frame
            [Math.PI*1.5000, Math.PI*0.2960,  96.0], // ~11.3s: frontal hold — full stacked massing (stair → parapet → two-stage crossing → tall drum → dome → lantern), galerij spread wide
            [Math.PI*1.5000, Math.PI*0.2620,  63.0], // 15s: descend toward the door
          ] : [
            [Math.PI*1.4987, Math.PI*0.4387, 180.0], // 1: wide establishing shot
            [Math.PI*1.6197, Math.PI*0.3967, 175.0], // 2: pan right & up
            [Math.PI*1.4910, Math.PI*0.3471, 150.0], // 3: sweep left, higher angle
            [Math.PI*1.3854, Math.PI*0.4336, 150.0], // 4: continue left, drop down
            [Math.PI*1.4809, Math.PI*0.4400, 115.0], // 5: settle front, closer
          ];
          const FLY_DUR = W2 ? 15.0 : 7.0;
          const ZOOM_DUR = W2 ? 3.0 : 3.8; // W2: 15+3 = the 18s dolly; legacy: extended zoom

          if (ot < FLY_DUR) {
            const progress = ot / FLY_DUR;
            const n = WP.length - 1;
            const scaled = progress * n;
            const seg = Math.min(Math.floor(scaled), n - 1);
            const local = scaled - seg;
            const lt = local * local * (3 - 2 * local);
            const p0 = WP[Math.max(seg - 1, 0)];
            const p1 = WP[seg];
            const p2 = WP[Math.min(seg + 1, n)];
            const p3 = WP[Math.min(seg + 2, n)];
            const cr = (a: number, b: number, c: number, d: number, tt: number) =>
              0.5*((2*b)+(-a+c)*tt+(2*a-5*b+4*c-d)*tt*tt+(-a+3*b-3*c+d)*tt*tt*tt);
            camOT.current.theta = cr(p0[0],p1[0],p2[0],p3[0],lt);
            camOT.current.phi   = cr(p0[1],p1[1],p2[1],p3[1],lt);
            camD.current += (cr(p0[2],p1[2],p2[2],p3[2],lt) - camD.current) * _sm(5.0029); // f=.08 @60fps
          } else {
            const p = Math.min((ot - FLY_DUR) / ZOOM_DUR, 1.0);
            const accel = p * p * p;
            const lastWP = WP[WP.length - 1];
            const entrTheta = Math.PI * 1.5;
            const entrPhi = Math.PI * 0.22;
            const entrD = 35;
            camOT.current.theta = lastWP[0] + (entrTheta - lastWP[0]) * accel;
            camOT.current.phi   = lastWP[1] + (entrPhi   - lastWP[1]) * accel;
            camD.current += ((entrD + (lastWP[2] - entrD) * (1 - accel)) - camD.current) * _sm(5.0029); // f=.08 @60fps
            if (camD.current < 40) {
              onboardingModeRef.current = false;
              onRoomClickRef.current("__entrance__");
            }
          }
        }
      }
      // Auto-walk: zoom toward entrance (fast exponential approach)
      if(autoWalkToRef.current==="__entrance__"){
        camOT.current.theta=Math.PI*1.5;
        camOT.current.phi=Math.PI*0.22;
        camD.current+=(35-camD.current)*_sm(2.4493); // f=.04 @60fps
        if(Math.abs(camD.current-35)<2){
          autoWalkToRef.current=null;
          onRoomClickRef.current("__entrance__");
        }
      }
      const camLerp=_sm(onboardingModeRef.current?0.9068:autoWalkToRef.current?1.2122:2.4493); // f=.015/.02/.04 @60fps
      let _dTh=(camOT.current.theta-camO.current.theta)*camLerp;
      let _dPh=(camOT.current.phi-camO.current.phi)*camLerp;
      // W1 (WS8-2, WS12-5): automatic pans (cinematic/autoWalk) obey the shared
      // MAX_YAW_DEG_S cap; user drags stay direct-manipulation (legacy when flag off).
      if(W1&&(onboardingModeRef.current||autoWalkToRef.current)){
        const _yawCap=MAX_YAW_DEG_S*(Math.PI/180)*dt;
        _dTh=THREE.MathUtils.clamp(_dTh,-_yawCap,_yawCap);
        _dPh=THREE.MathUtils.clamp(_dPh,-_yawCap,_yawCap);
      }
      camO.current.theta+=_dTh;
      camO.current.phi+=_dPh;
      const r=camD.current;
      camera.position.set(r*Math.sin(camO.current.phi)*Math.cos(camO.current.theta),r*Math.cos(camO.current.phi)+5,r*Math.sin(camO.current.phi)*Math.sin(camO.current.theta));
      // W2 grandeur (owner review #1): look target rises with the now much higher
      // dome (shell apex world ≈36, lantern finial ≈43) so the lantern-crowned
      // silhouette bekroont the frame at every distance.
      camera.lookAt(0,HILL_Y+(W2?13:8),0);

      // ── Camera debug overlay (activated via ?cam=debug) ──
      if(camDebugRef.current){
        const el=camDebugRef.current;
        el.textContent=`theta: Math.PI * ${(camO.current.theta/Math.PI).toFixed(4)}\nphi: Math.PI * ${(camO.current.phi/Math.PI).toFixed(4)}\ndistance: ${camD.current.toFixed(1)}`;
      }

      // Subtle water opacity animation — W2 (WS3-9): the audit's remaining
      // per-frame material mutations are deleted; water reads as a still
      // golden mirror (W1 already killed the emissive-lerp clone system).
      if(!W2){
      if (pool) (pool.material as THREE.MeshStandardMaterial).opacity=.5+Math.sin(t*.8)*.03;
      if (fW1) (fW1.material as THREE.MeshStandardMaterial).opacity=.4+Math.sin(t*.9)*.03;
      if (fW2) (fW2.material as THREE.MeshStandardMaterial).opacity=.4+Math.sin(t*1.0)*.03;
      if (fW3) (fW3.material as THREE.MeshStandardMaterial).opacity=.4+Math.sin(t*1.1)*.02;
      }

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

      // Wing & entrance hover glow — LEGACY path only (W1 killed the per-frame
      // emissive mutation; its affordance is the shared ember light above)
      const _hovRoom=hoveredRoomRef.current;
      if(!W1){
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
      } // end !W1 legacy hover path

      // Animate particles — throttle to every 2nd frame on mobile for performance
      const _doParticles=!_isMobile||(_frameCount&1)===0;
      if(_doParticles){
        // Animate dust motes
        const dp=dG.attributes.position.array;
        for(let i=0;i<dustN;i++){dp[i*3]+=Math.sin(t*.08+i*.3)*.012;dp[i*3+1]+=Math.sin(t*.12+i*.5)*.006;if(dp[i*3+1]>27)dp[i*3+1]=2;}
        dG.attributes.position.needsUpdate=true;(dG.attributes.position as any).updateRange={offset:0,count:dustN*3};

        // Animate floating orbs (gentle rise and drift)
        const op=orbG.attributes.position.array;
        for(let i=0;i<orbN;i++){
          op[i*3]+=Math.sin(t*.05+i*1.7)*.015;
          op[i*3+1]+=Math.sin(t*.08+i*2.3)*.008;
          op[i*3+2]+=Math.cos(t*.06+i*1.1)*.012;
        }
        orbG.attributes.position.needsUpdate=true;(orbG.attributes.position as any).updateRange={offset:0,count:orbN*3};

        // Animate mist drift
        mistMeshes.forEach((mm,i)=>{
          mm.position.x+=Math.sin(t*.02+i)*.01;
          // W2 (WS3-9): no per-frame material mutations — mist opacity is static
          if(!W2)(mm.material as THREE.MeshBasicMaterial).opacity=.03+Math.sin(t*.1+i*2)*.015;
        });

        // Animate birds
        const bp=birdG.attributes.position.array;
        for(let i=0;i<birdN;i++){bp[i*3]+=.02;bp[i*3+1]+=Math.sin(t*3+i)*.01;if(bp[i*3]>60)bp[i*3]=-60;}
        birdG.attributes.position.needsUpdate=true;(birdG.attributes.position as any).updateRange={offset:0,count:birdN*3};
      }

      // Update grass and wheat wind animation
      grassSystem.update();
      if(sharedWheatMat)sharedWheatMat.uniforms.time.value=t; // W1: one uniform write for ALL fields
      else wheatFields.forEach(wf => wf.update());

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
      ray.current.setFromCamera(mse.current,camera);const hits=ray.current.intersectObjects(clickTargets);if(hits.length>0){hapticLight();const hitId=hits[0].object.userData.roomId;
      // W2 (WS3-11): tap-is-travel — an entrance tap from any distance first
      // runs the existing comfort-capped camD approach (the __entrance__
      // autoWalk path fires the same onRoomClick contract on arrival);
      // reduced-motion keeps the direct enter.
      if(W2&&hitId==="__entrance__"&&camD.current>45&&!prefersReducedMotion()){autoWalkToRef.current="__entrance__";return;}
      onRoomClickRef.current(hitId);}};
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
          hapticLight();
          // W2 (WS3-11): tap-is-travel — same walk-then-enter as the mouse path
          if(W2&&hitId==="__entrance__"&&camD.current>45&&!prefersReducedMotion()){autoWalkToRef.current="__entrance__";return;}
          onRoomClickRef.current(hitId);
        }else{
          onRoomHover(null);
        }
      }
    };
    el.addEventListener("touchstart",onTS,{passive:true});el.addEventListener("touchmove",onTM,{passive:false});el.addEventListener("touchend",onTE,{passive:true});

    return()=>{w3Disposed=true;if(w3DomeCanary){w3DomeCanary.removeFromParent();w3DomeCanary=null;}if(w3EntranceCaps){w3EntranceCaps.removeFromParent();w3EntranceCaps=null;}if(w3Roofs){w3Roofs.removeFromParent();w3Roofs=null;}/* remove only — clone shares geometry/material with the modelLoader cache master, never dispose here */if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);el.removeEventListener("mousedown",onDown);el.removeEventListener("mousemove",onMove);el.removeEventListener("click",onCk);el.removeEventListener("wheel",onWh);window.removeEventListener("resize",onRs);window.removeEventListener("orientationchange",onOrient);
      el.removeEventListener("touchstart",onTS);el.removeEventListener("touchmove",onTM);el.removeEventListener("touchend",onTE);
      if(hovLabel&&el.contains(hovLabel))el.removeChild(hovLabel);
      if(rmVeil&&el.contains(rmVeil))el.removeChild(rmVeil);
      tymNameRedrawRef.current=null;
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
      allTexSets.forEach(disposePBRSet);
      extraDisposables.forEach(m => m.dispose());
      extraGeoDisposables.forEach(g => g.dispose());
      grassSystem.dispose();
      wheatFields.forEach(wf => wf.dispose());
      cropDispMap.dispose();
      // Release (not dispose) — these are refcounted entries in the shared env-map cache
      releaseEnvMap(envMapProc);
      if(envMapHDRI){releaseEnvMap(envMapHDRI);envMapHDRI=null;}
      if(bgMapHDRI){releaseEnvMap(bgMapHDRI);bgMapHDRI=null;}
      composer.dispose();
      try{ren.forceContextLoss();}catch{}
      if(el.contains(ren.domElement))el.removeChild(ren.domElement);ren.dispose();
      scene.environment=null;scene.background=null;scene.fog=null;};
  },[]);
  return (<>
    <div ref={mountRef} role="application" aria-label={t("sceneLabel")} style={{width:"100%",height:"100%",cursor:hoveredRoom?"pointer":"grab"}}/>
    {camDebug && createPortal(<pre ref={camDebugRef} onClick={()=>{if(camDebugRef.current)navigator.clipboard.writeText(camDebugRef.current.textContent||"");}} style={{position:"fixed",bottom:"6rem",left:"1rem",zIndex:99999,background:"rgba(0,0,0,0.85)",color:"#0f0",padding:"0.75rem 1rem",borderRadius:"0.5rem",fontFamily:"monospace",fontSize:"0.8125rem",cursor:"pointer",border:"1px solid #0f03",lineHeight:1.6,userSelect:"all"}}/>,document.body)}
  </>);
}

export default memo(ExteriorScene);
