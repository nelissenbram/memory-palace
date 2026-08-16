"use client";
import { useRef, useEffect, useState, memo } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";
import { createPostProcessing } from "@/lib/3d/postprocessing";
import { createInteriorEnvMap } from "@/lib/3d/environmentMaps";
import { getLightingPreset } from "@/lib/3d/daylightCycle";
import { EXPOSURE, PLASTER, PLASTER_RAMP, TRAVERTINE_GROUT, INK, GOLD, EMBER } from "@/lib/3d/canon";
import { flag3d } from "@/lib/3d/flags3d";
import { EYE_HEIGHT, MAX_WALK_SPEED, SPRINT_SPEED, MAX_YAW_DEG_S, easeInOutCubic } from "@/lib/3d/cameraComfort";
import { computeSalonHang, mountSalonHang, type SalonHangMount, type SalonMemoryRef } from "@/lib/3d/salonHang";
import { createFocusMode, type FocusMode, type FocusTarget } from "@/lib/3d/focusMode";
import { makeFrauncesLabel } from "@/lib/3d/frauncesLabel";
import { loadModel } from "@/lib/3d/modelLoader";
import { mountAmbientMusic, playFootstep } from "@/lib/3d/ambientAudio";
import { prefersReducedMotion } from "@/lib/3d/reducedMotion";
import { createDustParticles } from "@/lib/3d/atmosphericEffects";
import { loadHDRI, loadHDRIProgressive, HDRI_INTERIOR, loadMarbleTextures, loadDarkWoodTextures, loadPlasterWallTextures, loadHerringboneTextures, loadFloorTileTextures, loadFabricTextures, loadVelvetTextures, disposePBRSet, isCachedTexture, buildCachedTextureSet, registerCachedTexture, releaseEnvMap, type PBRTextureSet } from "@/lib/3d/assetLoader";
import { acquireMaterialSet, releaseMaterialSet, buildCachedMaterialSet } from "@/lib/3d/materialCache";
import { getQuality, mkPhys, isMobileGPU } from "@/lib/3d/mobilePerf";
import { borrowRenderer, returnRenderer } from "@/lib/3d/rendererPool";
import { measure, autoFit } from "@/lib/3d/fitRenderer";
import { optimizeMaterials, mergeBufferGeometries } from "@/lib/3d/geometryOptimizer";
import { useTranslation } from "@/lib/hooks/useTranslation";

// ── Corridor painting texture cache — module-level, URL-keyed (mirrors
// assetLoader's compressedTextureCache). Decodes off the main thread via
// createImageBitmap (flipY at decode, so tex.flipY=false) with a classic
// TextureLoader fallback. Every cached texture is registered with assetLoader's
// cached-texture exemption so the scene's dispose sweep leaves it alive across
// corridor transitions.
const paintingTextureCache = new Map<string, THREE.Texture>();
const paintingTexturePending = new Map<string, Promise<THREE.Texture>>();
function loadPaintingTexture(url: string): Promise<THREE.Texture> {
  const cached = paintingTextureCache.get(url);
  if (cached) return Promise.resolve(cached);
  const pending = paintingTexturePending.get(url);
  if (pending) return pending;
  // Owner bug 2026-08-06 (#5) ROOT CAUSE: uploaded Library photos carry
  // `/api/media/…` dataUrls, and that route 302-redirects to a presigned
  // cross-origin storage URL (R2/Supabase). Both fetch(mode:"cors") and the
  // TextureLoader fallback (crossOrigin="anonymous") fail the CORS check on
  // the redirect hop, the promise rejected silently, and the salon piece kept
  // its 1×1 warm-cream placeholder forever — the "photo looks covered" frame.
  // `?stream=1` is the app-wide contract (paintTex, RoomMediaPanel,
  // InteriorScene video) that forces same-origin streaming: no redirect, no
  // CORS, auth cookies included. Cache stays keyed on the ORIGINAL url — the
  // applier's slot.appliedUrl fingerprint contract is untouched.
  const fetchUrl = url.startsWith("/api/media/")
    ? url + (url.includes("?") ? "&" : "?") + "stream=1"
    : url;
  const p = (async () => {
    let tex: THREE.Texture;
    try {
      const res = await fetch(fetchUrl, { mode: "cors", credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob, { imageOrientation: "flipY", premultiplyAlpha: "none" });
      tex = new THREE.Texture(bitmap);
      tex.flipY = false; // bitmap already flipped at decode
      tex.needsUpdate = true;
    } catch {
      // Fallback (decoder edge cases): main-thread TextureLoader on the same
      // stream URL (same-origin, so its crossOrigin="anonymous" is harmless)
      tex = await new THREE.TextureLoader().loadAsync(fetchUrl);
    }
    tex.colorSpace = THREE.SRGBColorSpace;
    paintingTextureCache.set(url, tex);
    registerCachedTexture(tex);
    paintingTexturePending.delete(url);
    return tex;
  })();
  p.catch(() => { paintingTexturePending.delete(url); });
  paintingTexturePending.set(url, p);
  return p;
}
// 1x1 warm-canvas placeholder — keeps USE_MAP defined on painting materials so
// swapping in the real texture later is a uniform update, not a shader recompile.
let _paintingPlaceholderTex: THREE.DataTexture | null = null;
function getPaintingPlaceholderTex(): THREE.DataTexture {
  if (!_paintingPlaceholderTex) {
    _paintingPlaceholderTex = new THREE.DataTexture(new Uint8Array([200, 188, 160, 255]), 1, 1);
    _paintingPlaceholderTex.colorSpace = THREE.SRGBColorSpace;
    _paintingPlaceholderTex.needsUpdate = true;
    registerCachedTexture(_paintingPlaceholderTex); // shared across mounts — never dispose
  }
  return _paintingPlaceholderTex;
}

// ═══ CORRIDOR — grand gallery hallway with ornate doors ═══
// ═══ CORRIDOR — luxurious wing-specific gallery ═══
function CorridorScene({wingId,rooms:roomsProp,onDoorHover,onDoorClick,hoveredDoor,wingData:wingDataProp,corridorPaintings,highlightDoor,styleEra="roman",onInlayClick,onPaintingClick,autoWalkTo,onboardingMode,onCinematicStep,isMobile:isMobileProp,corridorEnterClicked,onReady}: {wingId: any,rooms?: WingRoom[],onDoorHover: any,onDoorClick: any,hoveredDoor: any,wingData?: Wing,corridorPaintings?: Record<string,{url?: string, title?: string, size?: string}>,highlightDoor?: string|null,styleEra?: string,onInlayClick?: ()=>void,onPaintingClick?: ()=>void,autoWalkTo?: string|null,onboardingMode?: boolean,onCinematicStep?: (step: number)=>void,isMobile?: boolean,corridorEnterClicked?: boolean,onReady?: ()=>void}){
  const { t } = useTranslation("corridor3d");
  const { t: tWings } = useTranslation("wings");
  const mountRef=useRef<HTMLDivElement|null>(null),frameRef=useRef<number|null>(null);
  const camDebugRef = useRef<HTMLPreElement | null>(null);
  const camDebug = false; // set true to show camera debug overlay
  const onDoorClickRef=useRef(onDoorClick);
  const onCinematicStepRef=useRef(onCinematicStep);
  useEffect(()=>{onCinematicStepRef.current=onCinematicStep;},[onCinematicStep]);
  useEffect(()=>{onDoorClickRef.current=onDoorClick;},[onDoorClick]);
  const highlightDoorRef=useRef(highlightDoor);
  useEffect(()=>{highlightDoorRef.current=highlightDoor;},[highlightDoor]);
  const corridorEnterClickedRef=useRef(corridorEnterClicked);
  useEffect(()=>{corridorEnterClickedRef.current=corridorEnterClicked;},[corridorEnterClicked]);
  const autoWalkToRef=useRef(autoWalkTo);
  useEffect(()=>{autoWalkToRef.current=autoWalkTo;},[autoWalkTo]);
  const onboardingModeRef=useRef(onboardingMode);
  useEffect(()=>{onboardingModeRef.current=onboardingMode;},[onboardingMode]);
  const onReadyRef=useRef(onReady);
  useEffect(()=>{onReadyRef.current=onReady;},[onReady]);
  const readyFiredRef=useRef(false); // onReady fires EXACTLY once per mount (survives effect re-runs)
  const wing=wingDataProp||DEFAULT_WINGS.find(w=>w.id===wingId)!;
  const rooms=roomsProp||[];
  const doorMeshes=useRef<any[]>([]);
  // ── W2 (WS5-9): onboarding cinematic UI state — ember Skip button ──
  const [w2CinActive,setW2CinActive]=useState(false);
  const w2CinActiveRef=useRef(false);
  const w2CinSkipRef=useRef(false);

  // ── Paintings prop handled IN PLACE (no scene rebuild / React remount) ──
  // corridorPaintings populates async in MemoryPalace after the corridor mounts,
  // so it must NOT be part of the mount key or mount-effect deps. The mount effect
  // publishes an applier that swaps texture maps on the existing painting meshes;
  // this effect (keyed on a content fingerprint) invokes it on any change.
  const corridorPaintingsRef=useRef(corridorPaintings);
  const applyPaintingsRef=useRef<((paintings: Record<string,{url?: string, title?: string, size?: string}>|undefined)=>void)|null>(null);
  const paintingsFingerprint=JSON.stringify(corridorPaintings||{});
  const appliedPaintingsFpRef=useRef<string|null>(null);
  useEffect(()=>{
    corridorPaintingsRef.current=corridorPaintings;
    if(appliedPaintingsFpRef.current===paintingsFingerprint)return;
    appliedPaintingsFpRef.current=paintingsFingerprint;
    applyPaintingsRef.current?.(corridorPaintings);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[paintingsFingerprint]);

  useEffect(()=>{
    const el=mountRef.current;if(!el)return;const { w, h } = measure(el);
    // ── MUSEO VIVO Wave-1 corridor flag (WS5, WS8, WS10, WS12) — read once at
    // mount per flags3d semantics; the flag-off path is the untouched legacy
    // corridor. Guarded so a missing module degrades to legacy.
    const W1=(()=>{try{return !!flag3d("w1_corridor");}catch{return false;}})();
    // ── MUSEO VIVO Wave-2 corridor flag (WS5-5..9) — requires W1 (baked light
    // bands, canon sweep, awClick tap-is-travel are its substrate). Flag-off =
    // W1 behavior fully intact.
    const W2=W1&&(()=>{try{return !!flag3d("w2_corridor");}catch{return false;}})();
    // ── MUSEO VIVO Wave-3 corridor "The Threshold Procession" (masterplan
    // docs/CORRIDOR_GRAPHICS_MASTERPLAN.md). Sits on the full W1+W2 substrate
    // (baked bands + salon hang); flag-off byte-identical. Wave A = code-only
    // composition/correctness fixes (no assets, no owner gate).
    const W3C=W2&&(()=>{try{return !!flag3d("w3_corridor");}catch{return false;}})();
    const reduceMotion=W1&&(()=>{try{return prefersReducedMotion();}catch{return false;}})();
    // WS5-9: show the ember Skip during the W2 onboarding push-in
    if(W2&&onboardingModeRef.current&&!reduceMotion){w2CinSkipRef.current=false;w2CinActiveRef.current=true;setW2CinActive(true);}
    // WS10-1: the one ambient score — idempotent mount, carries across scenes
    if(W1){try{mountAmbientMusic();}catch{}}
    // Kick painting texture fetch+decode off FIRST so the network/decode work
    // overlaps scene construction and uploads land behind the transition overlay.
    if(corridorPaintingsRef.current)for(const pd of Object.values(corridorPaintingsRef.current)){if(pd?.url)loadPaintingTexture(pd.url).catch(()=>{});}
    const dlPreset=getLightingPreset();
    // ── Cached THREE objects (avoid per-frame / per-event allocation) ──
    const _rc=new THREE.Raycaster(),_mouse=new THREE.Vector2();
    const _dir=new THREE.Vector3(),_yAxis=new THREE.Vector3(0,1,0);
    const _ld=new THREE.Vector3(),_lookTarget=new THREE.Vector3();
    // Warm canon background/fog at mount (MUSEO VIVO): the wing-tinted haze is
    // dead — the corridor joins the one golden grade so the hall doorway is
    // continuous, not a jump cut.
    const scene=new THREE.Scene();scene.background=new THREE.Color(dlPreset.fogColor);
    // Add atmospheric fog for depth — owner 2026-08-06 (#2): thinner under W1
    // (.008→.0055) so the far end reads as DEPTH, not haze; canon fog color kept
    scene.fog=new THREE.FogExp2(dlPreset.fogColor,(W1?.0055:.008)*dlPreset.fogDensity);
    // W3C: near 0.3→0.5 — pushing the far plane out to the terminus (below)
    // costs depth precision; raising near is the real lever and kills the
    // far-end floor z-fighting (worst case: max distance + grazing angle).
    // 0.5 (not lower) keeps the focus-glide framing clear of the near plane.
    const camera=new THREE.PerspectiveCamera(55,w/h,W3C?0.5:0.3,80);
    const Q=getQuality();
    const ren=borrowRenderer(w,h);
    // W3C (F13): the corridor was the only canon scene on hard PCFShadowMap;
    // hall/exterior use PCFSoft. Soften to match (still baked: autoUpdate off).
    ren.shadowMap.enabled=Q.shadowsEnabled;if(Q.shadowsEnabled){ren.shadowMap.type=W3C?THREE.PCFSoftShadowMap:(Q.shadowMapSize>=1024?THREE.PCFShadowMap:THREE.BasicShadowMap);ren.shadowMap.autoUpdate=false;ren.shadowMap.needsUpdate=true;}ren.toneMapping=THREE.NoToneMapping;ren.toneMappingExposure=EXPOSURE;// grade lives in the shared EffectPass (NeutralToneMapping @ canon EXPOSURE)
    ren.outputColorSpace=THREE.SRGBColorSpace;
    el.appendChild(ren.domElement);

    // ── ENVIRONMENT MAP (IBL) — procedural immediate, real HDRI async ──
    const envMapProc=createInteriorEnvMap(ren,{warmth:dlPreset.envWarmth,brightness:dlPreset.envBrightness});
    scene.environment=envMapProc;
    scene.environmentIntensity=0.9;
    let envMapHDRI: THREE.Texture|null=null;
    loadHDRIProgressive(ren,HDRI_INTERIOR,{onProcedural:(p)=>{scene.environment=p;scene.environmentIntensity=0.8;},onFull:(hdr)=>{envMapHDRI=hdr;scene.environment=hdr;scene.environmentIntensity=0.9;}}).catch(()=>{});

    // ── POST-PROCESSING — quality tier handles mobile stripping automatically ──
    // W3C (WS11 S6A): deepen the vignette so the eye is funnelled down the axis
    // toward the terminus "weenie" (darkness ≤.45 per canon — edges only).
    const composer=createPostProcessing(ren,scene,camera,"corridor",W3C?{vignette:{darkness:.44,offset:.22}}:undefined);
    const disposeFit=autoFit(el,{camera,renderer:ren,composer});

    // Warm sky + terracotta ground bounce (WS1-6)
    // W1 (WS5-3/4): hemisphere carries the baked compensation for the killed
    // PointLight rows — budget is ≤4 lights (hemi + sun + fill + one portal point)
    // Owner 2026-08-06 (#2): golden hour read too flat indoors — raise the
    // key-vs-ambient ratio (exterior precedent: sun ×1.375, hemi ×0.6). Under
    // W1: sun 1.5→2.1, hemi factor .7→.42, fill 1.0→0.5. Grade law intact
    // (no exposure/tone-mapping change), canon colors kept, legacy path untouched.
    const hemiLight=new THREE.HemisphereLight(dlPreset.ambientColor,dlPreset.groundBounceColor,(W1?.42:.55)*dlPreset.ambientIntensity/0.5);scene.add(hemiLight);
    // W3C (F06/F11): the key sun sat at +x (8,16,-3) — the OPPOSITE side from
    // the window bays (winSide=-1, i.e. -x), so no shaft ever crossed an
    // opening. Move it to the window quadrant so golden light rakes THROUGH
    // the arches. Softer, biased shadows (F13) + a wider frustum fitted to the
    // corridor length come after cL is known (see below).
    const sun=new THREE.DirectionalLight(dlPreset.sunColor,(W1?2.1:1.5)*dlPreset.sunIntensity);
    sun.position.set(W3C?-15:8,16,W3C?-9:-3);sun.castShadow=true;sun.shadow.mapSize.set(Q.shadowMapSize,Q.shadowMapSize);
    sun.shadow.camera.near=0.5;sun.shadow.camera.far=60;sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;
    if(W3C){sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.03;sun.shadow.radius=3;}
    scene.add(sun);
    const fill=new THREE.DirectionalLight(dlPreset.fillColor,(W1?.5:1)*dlPreset.fillIntensity);fill.position.set(W3C?6:-6,10,4);scene.add(fill);

    // ── WING LAYOUTS: each wing is a different museum section ──
    // DRAMATICALLY HIGHER CEILINGS (+2m each)
    const cfg={
      roots:{cW:9,cH:8,sp:8, rugC:"#7A2028",rugB:"#C8A040",accent:"#C66B3D",
        floorPat:"herringbone",ceilStyle:"coffered",wallStyle:"warm_panels"},
      travel:{cW:7.5,cH:8.5,sp:7.5, rugC:"#1A2A48",rugB:"#B88828",accent:"#4A6741",
        floorPat:"marble_strip",ceilStyle:"vaulted_beams",wallStyle:"map_alcoves"},
      nest:{cW:10,cH:7,sp:9, rugC:"#B0856A",rugB:"#E8C868",accent:"#B8926A",
        floorPat:"checkerboard",ceilStyle:"painted",wallStyle:"playful"},
      craft:{cW:8,cH:9,sp:8, rugC:"#1A1A28",rugB:"#808080",accent:"#8B7355",
        floorPat:"dark_parquet",ceilStyle:"grid",wallStyle:"modern"},
      passions:{cW:9.5,cH:7.8,sp:8.5, rugC:"#3A1848",rugB:"#D0A040",accent:"#9B6B8E",
        floorPat:"mosaic",ceilStyle:"exposed_beams",wallStyle:"gallery"},
    };
    const C=(cfg as any)[wingId]||cfg.roots;
    const MAX_ROOMS_PER_WING = 8;
    const hasLockedNiche = rooms.length < MAX_ROOMS_PER_WING;
    const totalSlots = rooms.length + (hasLockedNiche ? 1 : 0);
    const cW=C.cW,cH=C.cH,cL=totalSlots*C.sp+14;
    if(W3C){
      // F40: the far plane (80) clipped the vanishing point off at spawn in the
      // long wings (cL up to ~90) — the terminus "weenie" was literally culled.
      // Reach just past the end wall so the whole nave reads.
      camera.far=cL+15;camera.updateProjectionMatrix();
      // F-depth: swap exponential haze for a length-pinned LINEAR fog — near
      // bays stay crisp (memories brightest), the far door-end melts into the
      // golden grade so the fixed far plane reads as a soft "weenie", not a clip.
      scene.fog=new THREE.Fog(dlPreset.fogColor,cL*0.5,cL*1.7);
      // F12: fit the shadow frustum to the actual corridor (was a fixed ±20 box
      // covering <half the length).
      sun.shadow.camera.left=-cW*0.7;sun.shadow.camera.right=cW*0.7;
      sun.shadow.camera.top=cL*0.55;sun.shadow.camera.bottom=-cL*0.55;
      sun.shadow.camera.far=cL+40;sun.shadow.camera.updateProjectionMatrix();
    }

    // ── REAL PBR TEXTURES (Poly Haven) ──
    const marbleTex=loadMarbleTextures([4,4]);
    const woodTex=loadDarkWoodTextures([3,4]);
    const wallStoneTex=loadPlasterWallTextures([3,3]);
    // Use herringbone for herringbone/parquet wings, floor tiles for others
    const floorTileTex=(C.floorPat==="herringbone"||C.floorPat==="dark_parquet")?loadHerringboneTextures([3,3]):loadFloorTileTextures([3,3]);
    const rugFabricTex=loadFabricTextures([2,2]);
    const velvetTex=loadVelvetTextures([2,2]);
    const allTexSets: PBRTextureSet[]=[marbleTex,woodTex,wallStoneTex,floorTileTex,rugFabricTex,velvetTex];
    // W1 (WS2-1 slice): anisotropic filtering on floor/wall sets — 8 desktop /
    // 4 mobile, clamped to hardware caps. Kills the grazing-angle floor blur.
    if(W1){
      const maxAniso=ren.capabilities?.getMaxAnisotropy?.()??1;
      const aniso=Math.min(isMobileGPU()?4:8,maxAniso);
      for(const set of [marbleTex,woodTex,wallStoneTex,floorTileTex]){
        for(const tx of [set.map,set.normalMap]){
          if(tx&&tx.anisotropy!==aniso){tx.anisotropy=aniso;tx.needsUpdate=true;}
        }
      }
    }
    if(W3C){
      // F01: the base floor texture was a fixed [3,3] repeat stretched over the
      // whole cW×cL plane (~9×80 m) → tiles smeared 3–9× along the axis. Repeat
      // proportional to real metres (~1.4 m tiles) so the floor reads to scale.
      const TILE=1.4;
      for(const tx of [floorTileTex.map,floorTileTex.normalMap,floorTileTex.roughnessMap,floorTileTex.aoMap]){
        if(tx){tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(cW/TILE,cL/TILE);tx.needsUpdate=true;}
      }
    }

    // ── Archetype materials — module-cached so compiled shader programs survive
    // scene transitions (parameter-keyed: wall/floor/rug/accent colors differ per
    // wing, glow tints follow the daylight preset). Cleanup releases instead of
    // disposing; per-door clones stay per-mount and are disposed normally.
    // W1 (WS5-2 canon regrade): walls → PLASTER family, floors → warm travertine
    // (grout canon + plaster-ramp inlays), trim → ink, gold → canon GOLD; metal
    // fixtures → ink. msKey includes the flag so acquireMaterialSet never serves
    // a stale palette. Wall/floor tokens all sit ≥0.5 relative luminance (dogma).
    // W3C (F21): wire the plaster diffuse/rough/AO maps into the wall family
    // at a wall-scaled repeat BEFORE the material set is built — the maps were
    // loaded into VRAM but only the normal was ever used (flat-colour walls).
    if(W3C){
      const wallRepX=Math.max(6,cL/2.6),wallRepY=Math.max(2,cH/2.6);
      for(const tx of [wallStoneTex.map,wallStoneTex.normalMap,wallStoneTex.roughnessMap,wallStoneTex.aoMap]){
        if(tx){tx.wrapS=tx.wrapT=THREE.RepeatWrapping;tx.repeat.set(wallRepX,wallRepY);tx.needsUpdate=true;}
      }
    }
    const msKey=`corridor|w1:${W1?1:0}|w3:${W3C?1:0}|${wingId}|${wing.wall}|${wing.floor}|${C.accent}|${C.rugC}|${C.rugB}|${dlPreset.sunColor}|${dlPreset.sunIntensity}`;
    const MS=acquireMaterialSet(msKey,()=>({
      wall:new THREE.MeshStandardMaterial({color:W1?PLASTER:wing.wall,roughness:.85,...(W3C?{map:wallStoneTex.map,roughnessMap:wallStoneTex.roughnessMap}:{}),normalMap:wallStoneTex.normalMap,normalScale:new THREE.Vector2(W3C?.5:.3,W3C?.5:.3),envMapIntensity:.5}),
      wallD:new THREE.MeshStandardMaterial({color:W1?PLASTER_RAMP.shade:wing.floor,roughness:.8,...(W3C?{map:wallStoneTex.map,roughnessMap:wallStoneTex.roughnessMap}:{}),normalMap:wallStoneTex.normalMap,normalScale:new THREE.Vector2(.2,.2)}),
      floor:new THREE.MeshStandardMaterial({color:W1?TRAVERTINE_GROUT:wing.floor,roughness:.7,metalness:.02,map:floorTileTex.map,normalMap:floorTileTex.normalMap,normalScale:new THREE.Vector2(.5,.5),roughnessMap:floorTileTex.roughnessMap,aoMap:floorTileTex.aoMap,aoMapIntensity:.7,envMapIntensity:.15}),
      floorL:new THREE.MeshStandardMaterial({color:W1?PLASTER_RAMP.light:"#D0C0A0",roughness:.5,normalMap:floorTileTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      floorD:new THREE.MeshStandardMaterial({color:W1?PLASTER_RAMP.dark:"#8A7858",roughness:.5,metalness:.08,normalMap:floorTileTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      ceil:new THREE.MeshStandardMaterial({color:W1?PLASTER_RAMP.light:"#F0EAE0",roughness:.92}),
      trim:new THREE.MeshStandardMaterial({color:W1?INK:"#D0C4B0",roughness:.5,metalness:.12,envMapIntensity:.6}),
      gold:mkPhys(THREE,{color:W1?GOLD:"#C8A858",roughness:.18,metalness:.85,clearcoat:.3,clearcoatRoughness:.1,envMapIntensity:1.3}),
      wain:new THREE.MeshStandardMaterial({color:W1?PLASTER_RAMP.mid:"#C8BCA8",roughness:.6,normalMap:wallStoneTex.normalMap,normalScale:new THREE.Vector2(.2,.2)}),
      wainP:new THREE.MeshStandardMaterial({color:W1?PLASTER_RAMP.shade:"#BEB4A0",roughness:.65,normalMap:wallStoneTex.normalMap,normalScale:new THREE.Vector2(.15,.15)}),
      dkW:new THREE.MeshStandardMaterial({color:"#4A3828",roughness:.5,map:woodTex.map,normalMap:woodTex.normalMap,normalScale:new THREE.Vector2(.4,.4)}),
      door:new THREE.MeshStandardMaterial({color:"#5A3E28",roughness:.4,metalness:.06,map:woodTex.map,normalMap:woodTex.normalMap,normalScale:new THREE.Vector2(.5,.5),roughnessMap:woodTex.roughnessMap,aoMap:woodTex.aoMap,aoMapIntensity:.6}),
      doorD:new THREE.MeshStandardMaterial({color:"#3A2818",roughness:.45,map:woodTex.map,normalMap:woodTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      handle:mkPhys(THREE,{color:W1?GOLD:"#C8A858",roughness:.15,metalness:.85,clearcoat:.4,clearcoatRoughness:.08,envMapIntensity:1.5}),
      bronze:mkPhys(THREE,{color:"#8A7050",roughness:.25,metalness:.7,clearcoat:.2,clearcoatRoughness:.3,envMapIntensity:1.0}),
      marble:mkPhys(THREE,{color:"#E8E2DA",roughness:.12,metalness:.06,map:marbleTex.map,normalMap:marbleTex.normalMap,normalScale:new THREE.Vector2(.4,.4),roughnessMap:marbleTex.roughnessMap,aoMap:marbleTex.aoMap,aoMapIntensity:.8,clearcoat:.3,clearcoatRoughness:.15,reflectivity:.6,envMapIntensity:.8}),
      shared:new THREE.MeshStandardMaterial({color:"#4A6741",roughness:.4,emissive:"#4A6741",emissiveIntensity:.3}),
      rug:new THREE.MeshStandardMaterial({color:C.rugC,roughness:.9,map:rugFabricTex.map,normalMap:rugFabricTex.normalMap,normalScale:new THREE.Vector2(.3,.3),roughnessMap:rugFabricTex.roughnessMap,aoMap:rugFabricTex.aoMap,aoMapIntensity:.5}),
      rugB:new THREE.MeshStandardMaterial({color:C.rugB,roughness:.8}),
      sconce:new THREE.MeshStandardMaterial({color:W1?INK:"#C8A858",roughness:.25,metalness:.55,envMapIntensity:.8}),
      // W1: sconce/chandelier PointLights die (WS5-3) — the emissive glass IS the fixture
      glassG:new THREE.MeshStandardMaterial({color:"#FFF8E0",emissive:"#FFE8B0",emissiveIntensity:W1?.9:.6,transparent:true,opacity:.6}),
      curtain:mkPhys(THREE,{color:C.accent,roughness:.92,side:THREE.DoubleSide,sheen:.3,sheenRoughness:.8,sheenColor:new THREE.Color(C.accent).offsetHSL(0,0,.2),map:velvetTex.map,normalMap:velvetTex.normalMap,normalScale:new THREE.Vector2(.25,.25)}),
      velvet:mkPhys(THREE,{color:C.accent,roughness:.92,sheen:.4,sheenRoughness:.7,sheenColor:new THREE.Color(C.accent).offsetHSL(0,-.1,.15),map:velvetTex.map,normalMap:velvetTex.normalMap,normalScale:new THREE.Vector2(.3,.3),roughnessMap:velvetTex.roughnessMap}),
      statue:new THREE.MeshStandardMaterial({color:"#E0D8CC",roughness:.22,metalness:.08,envMapIntensity:.7}),
      fG:mkPhys(THREE,{color:W1?GOLD:"#B89850",roughness:.2,metalness:.85,clearcoat:.3,clearcoatRoughness:.1,envMapIntensity:1.3}),
      windowFrame:new THREE.MeshStandardMaterial({color:W1?PLASTER_RAMP.mid:"#D0C4B0",roughness:.4,metalness:.15,envMapIntensity:.6}),
      windowGlass:mkPhys(THREE,{color:"#C8E0F0",transparent:true,opacity:.1,side:THREE.DoubleSide,transmission:.6,ior:1.5,roughness:.02,thickness:.3}),
      windowGlow:new THREE.MeshBasicMaterial({color:dlPreset.sunColor,transparent:true,opacity:.15*dlPreset.sunIntensity,depthWrite:false,blending:THREE.AdditiveBlending}),
      bench:new THREE.MeshStandardMaterial({color:"#6A5240",roughness:.6,metalness:.04,normalMap:woodTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      benchCushion:mkPhys(THREE,{color:C.accent,roughness:.92,sheen:.3,sheenRoughness:.8,sheenColor:new THREE.Color(C.accent).offsetHSL(0,0,.15),map:velvetTex.map,normalMap:velvetTex.normalMap,normalScale:new THREE.Vector2(.2,.2)}),
      portalArch:mkPhys(THREE,{color:"#D4AF37",roughness:.15,metalness:.9,emissive:"#D4AF37",emissiveIntensity:.2,clearcoat:.3,clearcoatRoughness:.1,envMapIntensity:1.5}),
      portalPillar:mkPhys(THREE,{color:"#E8E0D4",roughness:.12,metalness:.04,clearcoat:.2,clearcoatRoughness:.2,envMapIntensity:.7}),
      portalKeystone:mkPhys(THREE,{color:W1?GOLD:"#C8A858",roughness:.15,metalness:.85,emissive:W1?GOLD:"#C8A858",emissiveIntensity:.25,clearcoat:.3,clearcoatRoughness:.1,envMapIntensity:1.3}),
      portalGoldTrim:mkPhys(THREE,{color:W1?GOLD:"#FFD700",roughness:.1,metalness:.95,emissive:W1?GOLD:"#FFD700",emissiveIntensity:.1,clearcoat:.4,clearcoatRoughness:.05,envMapIntensity:1.8}),
      frescoBase:new THREE.MeshStandardMaterial({color:W1?PLASTER:wing.wall,roughness:.9}),
      terracotta:new THREE.MeshStandardMaterial({color:"#C4704A",roughness:.8,metalness:.02}),
      foliage:new THREE.MeshStandardMaterial({color:"#3A6828",roughness:.85}),
      foliageDark:new THREE.MeshStandardMaterial({color:"#2A5020",roughness:.85}),
      pedestal:new THREE.MeshStandardMaterial({color:"#D8D0C4",roughness:.3,metalness:.05,normalMap:marbleTex.normalMap,normalScale:new THREE.Vector2(.2,.2),envMapIntensity:.6}),
      floorGoldStrip:mkPhys(THREE,{color:W1?GOLD:"#C8A858",roughness:.2,metalness:.8,clearcoat:.3,clearcoatRoughness:.1,envMapIntensity:1.2}),
      portalFog:new THREE.MeshBasicMaterial({color:dlPreset.sunColor,transparent:true,opacity:.08*dlPreset.sunIntensity,depthWrite:false,blending:THREE.AdditiveBlending}),
    }));

    // (Tuscan landscape removed — windows use simple sky glow)


    // ── FLOOR (varies by wing) ──
    // W3C (F26): the gallery floor was matte (rough .7, envInt .15). Polish it
    // so it catches the golden env + column reflections like a real museum
    // floor — the hall proved this reads as luxury, not glare.
    if(W3C){const f=MS.floor as THREE.MeshPhysicalMaterial;f.roughness=0.22;f.envMapIntensity=0.9;f.clearcoat=0.5;f.clearcoatRoughness=0.18;f.needsUpdate=true;}
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(cW,cL),MS.floor);fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;scene.add(fl);
    MS.floor.polygonOffset=true;MS.floor.polygonOffsetFactor=4;MS.floor.polygonOffsetUnits=4;
    MS.wall.polygonOffset=true;MS.wall.polygonOffsetFactor=4;MS.wall.polygonOffsetUnits=4;
    if(C.floorPat==="herringbone"){
      for(let fz=-cL/2+1;fz<cL/2;fz+=1.5)for(let fx=-cW/2+1;fx<cW/2;fx+=1.5)
        scene.add(mk(new THREE.BoxGeometry(.6,.003,.3),MS.floorL,fx+((Math.floor(fz)%2)?.4:0),.01,fz));
    }else if(C.floorPat==="marble_strip"){
      scene.add(mk(new THREE.BoxGeometry(cW-2,.004,cL-3),MS.floorL,0,.01,0));
      for(let s=-1;s<=1;s+=2)scene.add(mk(new THREE.BoxGeometry(.08,.005,cL-4),MS.gold,s*(cW/2-1.2),.015,0));
    }else if(C.floorPat==="checkerboard"){
      for(let fz=-cL/2+1;fz<cL/2;fz+=1.2)for(let fx=-cW/2+1;fx<cW/2;fx+=1.2)
        if((Math.floor(fx+50)+Math.floor(fz+50))%2===0)scene.add(mk(new THREE.BoxGeometry(1.1,.003,1.1),MS.floorL,fx,.01,fz));
    }else if(C.floorPat==="dark_parquet"){
      scene.add(mk(new THREE.BoxGeometry(cW-1,.004,cL-2),MS.floorD,0,.01,0));
      scene.add(mk(new THREE.BoxGeometry(cW-2,.005,cL-3),MS.floorL,0,.015,0));
    }else{
      // Pre-generate a shared palette of mosaic tile materials instead of one per tile
      // (W1 WS5-2: the hsl() drift dies — travertine value ramp only)
      const mosaicPalette=W1
        ?[PLASTER_RAMP.light,PLASTER_RAMP.base,PLASTER_RAMP.mid,PLASTER_RAMP.shade,PLASTER_RAMP.dark].map(c2=>new THREE.MeshStandardMaterial({color:c2,roughness:.6}))
        :Array.from({length:10},(_,i)=>new THREE.MeshStandardMaterial({color:`hsl(${30+i*2},${25+i*1.5}%,${55+i*1.5}%)`,roughness:.6}));
      // W3C (F24): the mosaic tile colour was Math.random() per tile — a
      // different floor every mount. Seed from tile position so it's stable.
      const mosHash=(a: number,b: number)=>{const s=Math.sin(a*12.9898+b*78.233)*43758.5453;return s-Math.floor(s);};
      for(let fz=-cL/2+1;fz<cL/2;fz+=2)for(let fx=-cW/2+1;fx<cW/2;fx+=2){
        const pick=W3C?Math.floor(mosHash(fx,fz)*mosaicPalette.length):Math.floor(Math.random()*mosaicPalette.length);
        scene.add(mk(new THREE.BoxGeometry(.8,.003,.8),mosaicPalette[pick],fx,.01,fz));}
    }

    // ═══ FLOOR GOLD TRIM STRIPS along both walls ═══
    for(let s of[-1,1]){
      scene.add(mk(new THREE.BoxGeometry(.06,.008,cL-.5),MS.floorGoldStrip,s*(cW/2-.15),.01,0));
      scene.add(mk(new THREE.BoxGeometry(.03,.008,cL-.5),MS.floorGoldStrip,s*(cW/2-.35),.01,0));
    }

    // ── CEILING (varies by wing) ──
    // W3C (F36/A1, owner 2026-08-13 = COVE not clamp): wide wings (cW≥cH) read
    // as a low HALL, not a gallery. Replace the flat ceiling with a shallow
    // segmental VAULT that springs from the wall-tops and rises to an apex
    // ABOVE the width — the section now reads as a nave. Near-zero authoring
    // (parametric mesh + transverse ribs). Narrow wings keep the flat ceiling.
    const cove=W3C&&cW>=cH-0.2;
    MS.ceil.polygonOffset=true;MS.ceil.polygonOffsetFactor=4;MS.ceil.polygonOffsetUnits=4;
    if(cove){
      const rise=cW*0.26;                                    // apex = cH+rise, comfortably > cW
      const yAt=(x: number)=>cH+rise*(1-(2*x/cW)**2);        // segmental parabolic vault
      const NX=28,NZ=Math.max(10,Math.floor(cL/2.2));
      const pos: number[]=[],idx: number[]=[],uv: number[]=[];
      for(let j=0;j<=NZ;j++){const z=-cL/2+(cL*j/NZ);
        for(let i=0;i<=NX;i++){const x=-cW/2+(cW*i/NX);pos.push(x,yAt(x),z);uv.push(i/NX*cW/1.4,j/NZ*cL/1.4);}}
      for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){const a=j*(NX+1)+i,b=a+1,c=a+NX+1,d=c+1;
        // wind so the surface faces DOWN into the corridor (viewer below)
        idx.push(a,c,b,b,c,d);}
      const vGeo=new THREE.BufferGeometry();
      vGeo.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
      vGeo.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
      vGeo.setIndex(idx);vGeo.computeVertexNormals();
      const vMat=(MS.ceil as THREE.MeshStandardMaterial).clone();vMat.side=THREE.DoubleSide;
      const vault=new THREE.Mesh(vGeo,vMat);vault.receiveShadow=true;scene.add(vault);
      // (geometry + cloned material disposed by the scene-traverse cleanup below)
      // Transverse ribs following the vault profile every ~3.4 m (articulation)
      const ribStep=3.4;
      for(let rz=-cL/2+ribStep;rz<cL/2;rz+=ribStep){
        const rp: number[]=[],ri: number[]=[];
        for(let i=0;i<=NX;i++){const x=-cW/2+(cW*i/NX);rp.push(x,yAt(x)-0.02,rz-0.07,x,yAt(x)-0.02,rz+0.07);}
        for(let i=0;i<NX;i++){const a=i*2;ri.push(a,a+1,a+2,a+2,a+1,a+3);}
        const rgeo=new THREE.BufferGeometry();
        rgeo.setAttribute("position",new THREE.Float32BufferAttribute(rp,3));
        rgeo.setIndex(ri);rgeo.computeVertexNormals();
        const rib=new THREE.Mesh(rgeo,MS.trim);rib.renderOrder=1;scene.add(rib);
      }
    }else{
      const ceil=new THREE.Mesh(new THREE.PlaneGeometry(cW,cL),MS.ceil);ceil.rotation.x=Math.PI/2;ceil.position.set(0,cH,0);scene.add(ceil);
    }
    if(cove){/* the vault carries its own transverse ribs — skip flat ceilStyle decor */}
    else if(C.ceilStyle==="coffered"){
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

    // ── PRE-COMPUTE WINDOW POSITIONS (needed before walls to cut openings) ──
    const inlayCount = hasLockedNiche ? 1 : 0;
    const winW=2.0,winH=cH*0.7,winBottom=1.0;
    const winCenterY=winBottom+winH/2;
    const winArchR=winW/2;
    const winRectH=winH-winArchR;
    const winHalfGap=winW/2+0.15; // half-width of wall gap per window
    // Collect door z-positions on solid wall (side=-1)
    const solidWallDoorZsForWin: number[]=[];
    for(let i=0;i<rooms.length;i++){
      if(i%2===0) solidWallDoorZsForWin.push(cL/2-5.5-i*C.sp);
    }
    if(hasLockedNiche){
      for(let ii=0;ii<inlayCount;ii++){
        if(ii%2===0) solidWallDoorZsForWin.push(-cL/2+5.5+ii*C.sp);
      }
    }
    // Generate window z-positions on solid wall
    const finalWinPositions: number[]=[];
    // Windows opposite each door on side=1 (odd-indexed rooms)
    for(let i=0;i<rooms.length;i++){
      if(i%2!==0) finalWinPositions.push(cL/2-5.5-i*C.sp);
    }
    // Extra windows between doors on solid wall
    const solidDoorsW=[...solidWallDoorZsForWin].sort((a,b)=>a-b);
    for(let i=0;i<solidDoorsW.length-1;i++){
      const mid=(solidDoorsW[i]+solidDoorsW[i+1])/2;
      const tooCloseW=finalWinPositions.some(wz=>Math.abs(mid-wz)<2.5)||solidDoorsW.some(dz=>Math.abs(mid-dz)<1.8);
      if(!tooCloseW) finalWinPositions.push(mid);
    }
    // Filter: skip if out of bounds or overlapping doors
    const validWinPositions=finalWinPositions.filter(wz=>
      wz<=cL/2-3&&wz>=-cL/2+3&&!solidWallDoorZsForWin.some(dz=>Math.abs(wz-dz)<2.0)
    ).sort((a,b)=>a-b);

    // ── WALLS + WAINSCOTING (varies by wing) ──
    // Side=1 wall (colonnade side in Roman) — single plane
    {const wm=new THREE.Mesh(new THREE.PlaneGeometry(cL,cH),MS.wall);wm.rotation.y=1*(-Math.PI/2);wm.position.set(1*(cW/2),cH/2,0);scene.add(wm);}
    // Side=-1 wall (solid wall) — split into segments with gaps for windows
    {
      const wallZones=[...validWinPositions].sort((a,b)=>a-b);
      let segStart=-cL/2;
      const wallSegs:{start:number,end:number}[]=[];
      for(const wz of wallZones){
        const gapL=wz-winHalfGap;
        const gapR=wz+winHalfGap;
        if(gapL>segStart+0.1) wallSegs.push({start:segStart,end:gapL});
        segStart=gapR;
      }
      if(cL/2>segStart+0.1) wallSegs.push({start:segStart,end:cL/2});
      for(const seg of wallSegs){
        const segLen=seg.end-seg.start;
        const segCenter=(seg.start+seg.end)/2;
        // Full-height wall segment
        const wallMesh=new THREE.Mesh(new THREE.PlaneGeometry(segLen,cH),MS.wall);
        wallMesh.rotation.y=-1*(-Math.PI/2);
        wallMesh.position.set(-1*(cW/2),cH/2,segCenter);
        scene.add(wallMesh);
      }
      // Fill above and below each window opening (wall material)
      for(const wz of validWinPositions){
        const wx=-1*(cW/2);
        // Wall below window
        if(winBottom>0.01){
          const belowH=winBottom;
          const below=new THREE.Mesh(new THREE.PlaneGeometry(winW+0.3,belowH),MS.wall);
          below.rotation.y=-1*(-Math.PI/2);
          below.position.set(wx,belowH/2,wz);
          scene.add(below);
        }
        // Wall above window
        const winTop=winBottom+winRectH+winArchR;
        if(winTop<cH-0.01){
          const aboveH=cH-winTop;
          const above=new THREE.Mesh(new THREE.PlaneGeometry(winW+0.3,aboveH),MS.wall);
          above.rotation.y=-1*(-Math.PI/2);
          above.position.set(wx,winTop+aboveH/2,wz);
          scene.add(above);
        }
      }
    }
    scene.add(mk(new THREE.PlaneGeometry(cW,cH),MS.wall,0,cH/2,-cL/2));
    const wB=new THREE.Mesh(new THREE.PlaneGeometry(cW,cH),MS.wall);wB.rotation.y=Math.PI;wB.position.set(0,cH/2,cL/2);scene.add(wB);
    for(let s of[-1,1]){
      // Collect door zones for this wall side (used by wainscoting + panels)
      const doorZonesForSide: {center: number, halfW: number}[] = [];
      const occupiedZones: {center: number, halfW: number}[] = [];
      // Locked niches at far end (indices 0..inlayCount-1)
      for (let ii = 0; ii < inlayCount; ii++) {
        const inlaySide = ii % 2 === 0 ? -1 : 1;
        const inlayZ = -cL / 2 + 5.5 + ii * C.sp;
        if (inlayZ > cL / 2 - 3) break;
        if (inlaySide === s) {
          doorZonesForSide.push({ center: inlayZ, halfW: 1.3 });
          occupiedZones.push({ center: inlayZ, halfW: 1.5 });
        }
      }
      // Window zones on the solid wall (side=-1) — skip wainscoting/panels here
      if (s === -1) {
        for (const wz of validWinPositions) {
          doorZonesForSide.push({ center: wz, halfW: winHalfGap });
          occupiedZones.push({ center: wz, halfW: winHalfGap + 0.2 });
        }
      }
      // Room doors near entrance (high z, counting from entrance portal)
      rooms.forEach((_room2: any, ri: number) => {
        const doorSide = ri % 2 === 0 ? -1 : 1;
        const doorZ = cL/2 - 5.5 - ri * C.sp;
        if (doorSide === s) {
          doorZonesForSide.push({ center: doorZ, halfW: 1.3 });
          occupiedZones.push({ center: doorZ, halfW: 1.5 });
        }
        if (doorSide === s && ri < rooms.length - 1) {
          occupiedZones.push({ center: doorZ - C.sp / 2, halfW: 1.4 });
        }
        if (-doorSide === s) occupiedZones.push({ center: doorZ, halfW: 1.2 });
      });
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
        scene.add(mk(new THREE.BoxGeometry(.04,1.4,segLen),MS.wain,s*(cW/2-.06),.7,segCenter));
        scene.add(mk(new THREE.BoxGeometry(.05,.07,segLen),MS.gold,s*(cW/2-.06),1.43,segCenter));
        scene.add(mk(new THREE.BoxGeometry(.06,.12,segLen),MS.dkW,s*(cW/2-.06),.06,segCenter));
      }
      // Crown molding at ceiling (continuous, doesn't clip doors)
      scene.add(mk(new THREE.BoxGeometry(.10,.14,cL-.2),MS.gold,s*(cW/2-.08),cH-.07,0));
      scene.add(mk(new THREE.BoxGeometry(.06,.08,cL-.2),MS.trim,s*(cW/2-.06),cH-.18,0));
      // Wainscoting lower panels between doors (skip zones occupied by doors)
      const pnl=Math.floor(cL/3);
      for(let p=0;p<pnl;p++){
        const pz = -cL/2 + 1.5 + p * 3;
        const blocked = occupiedZones.some(z => Math.abs(pz - z.center) < z.halfW);
        if (blocked) continue;
        scene.add(mk(new THREE.BoxGeometry(.01,.55,1.4),MS.wainP,s*(cW/2-.05),.7,pz));
      }
    }

    // ── W1 SHARED BAKED-LIGHT RESOURCES (WS5-3/4): the window/chandelier/sconce/
    // lamp/door PointLight rows below die under w1_corridor; ONE shared additive
    // gradient texture bakes their rhythm back in as warm floor pools + spaced
    // wall bands (zero dynamic-light cost) plus a gold walkthrough ring decal
    // replacing the per-door intensity-0 PointLights. Disposed by the cleanup sweep.
    let w1PoolMat: THREE.MeshBasicMaterial|null=null;
    let w1BandMat: THREE.MeshBasicMaterial|null=null;
    let w1PoolGeo: THREE.PlaneGeometry|null=null;
    let w1BandGeo: THREE.PlaneGeometry|null=null;
    let w1HlRing: THREE.Mesh|null=null;
    if(W1){
      const gc=document.createElement("canvas");
      gc.width=gc.height=128;
      const gctx=gc.getContext("2d")!;
      const grad=gctx.createRadialGradient(64,64,0,64,64,64);
      grad.addColorStop(0,"rgba(255,216,168,0.85)");
      grad.addColorStop(.5,"rgba(255,196,130,0.30)");
      grad.addColorStop(1,"rgba(255,184,112,0)");
      gctx.fillStyle=grad;gctx.fillRect(0,0,128,128);
      const glowTex=new THREE.CanvasTexture(gc);
      glowTex.colorSpace=THREE.SRGBColorSpace;
      // Owner 2026-08-06 (#2): pools .32→.26, bands .28→.22 — baked warmth eases
      // back now the directional key is stronger. (#6) polygonOffset pulls the
      // near-coplanar decals toward the camera in depth so floor/wall geometry
      // can never z-fight them at grazing angles (depthWrite already false).
      w1PoolMat=new THREE.MeshBasicMaterial({map:glowTex,transparent:true,opacity:.26,blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      w1BandMat=new THREE.MeshBasicMaterial({map:glowTex,transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
      w1PoolGeo=new THREE.PlaneGeometry(3.4,3.4);
      w1BandGeo=new THREE.PlaneGeometry(1.5,3.4);
      // Rhythmic warm wall bands — one per door bay on both walls, clear of windows
      for(const s2 of[-1,1])for(let i2=0;i2<rooms.length;i2++){
        const bz2=cL/2-5.5-i2*C.sp-C.sp*.5;
        if(bz2>cL/2-3||bz2<-cL/2+3)continue;
        if(s2===-1&&validWinPositions.some(wz2=>Math.abs(bz2-wz2)<winHalfGap+.6))continue;
        const band=new THREE.Mesh(w1BandGeo,w1BandMat);
        band.rotation.y=-s2*Math.PI/2;
        band.position.set(s2*(cW/2-.04),2.5,bz2);
        band.renderOrder=1; // explicit transparent-stack order (#6)
        scene.add(band);
      }
      // Gold walkthrough ring decal (replaces the per-door PointLights below)
      // (#6) polygonOffset: the ring floats 3cm over the floor + pattern inlays
      w1HlRing=new THREE.Mesh(
        new THREE.RingGeometry(.55,.75,40),
        new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2})
      );
      w1HlRing.rotation.x=-Math.PI/2;
      w1HlRing.position.y=.03;
      scene.add(w1HlRing);
    }
    const w1AddPool=(px: number,pz2: number,sc=1)=>{
      if(!w1PoolMat||!w1PoolGeo)return;
      const pool=new THREE.Mesh(w1PoolGeo,w1PoolMat);
      pool.rotation.x=-Math.PI/2;
      pool.position.set(px,.032,pz2); // above rug top (.026) — additive, depthWrite off
      pool.scale.setScalar(sc);
      pool.renderOrder=1; // explicit transparent-stack order (#6)
      scene.add(pool);
    };

    // ═══ TALL ARCHED WINDOWS — render into wall openings ═══
    const winStoneMat=new THREE.MeshStandardMaterial({color:W1?PLASTER_RAMP.mid:"#D0C4B0",roughness:.4,metalness:.05});
    const winSide=-1;
    const winX=winSide*(cW/2);
    let winLightCount=0;
    for(const wz of validWinPositions){
      // ── Stone frame — hefty jambs flush with wall ──
      const jW=0.16,jD=0.1;
      for(const zs of[-1,1]){
        scene.add(mk(new THREE.BoxGeometry(jD,winRectH+0.2,jW),winStoneMat,winX,winBottom+winRectH/2,wz+zs*(winW/2+jW/2)));
        // Impost block (transition from jamb to arch)
        scene.add(mk(new THREE.BoxGeometry(jD+0.03,0.08,jW+0.06),winStoneMat,winX,winBottom+winRectH+0.04,wz+zs*(winW/2+jW/2)));
      }
      // ── Smooth semicircular arch ──
      const archCY=winBottom+winRectH;
      const archGeo=new THREE.TorusGeometry(winArchR,0.09,8,24,Math.PI);
      const archMesh=new THREE.Mesh(archGeo,winStoneMat);
      archMesh.position.set(winX+(winSide*0.01),archCY,wz);
      archMesh.rotation.y=winSide*(-Math.PI/2);
      scene.add(archMesh);
      // Keystone
      scene.add(mk(new THREE.BoxGeometry(jD+0.03,0.2,0.18),MS.gold,winX,archCY+winArchR,wz));
      // ── Wide stone sill ──
      scene.add(mk(new THREE.BoxGeometry(0.2,0.1,winW+jW*2+0.14),winStoneMat,winX,winBottom-0.05,wz));
      scene.add(mk(new THREE.BoxGeometry(0.22,0.03,winW+jW*2+0.18),MS.gold,winX,winBottom+0.005,wz));
      // ── Bright sky glow — simple emissive plane behind wall ──
      const skyGlowMat=new THREE.MeshBasicMaterial({color:dlPreset.fogColor});
      const skyGlow=new THREE.Mesh(new THREE.PlaneGeometry(winW-0.1,winH-0.1),skyGlowMat);
      skyGlow.rotation.y=winSide*(-Math.PI/2);
      skyGlow.position.set(winX+(winSide*0.15),winCenterY,wz);
      scene.add(skyGlow);
      // W3C (Wave C, masterplan wow #2 "golden shafts that point at the doors"):
      // an oblique volumetric shaft falls from each window bay to the floor,
      // leaning down the corridor — additive, no new light, one quad per window.
      if(W3C&&!isMobileGPU()){
        const halfW=winW*0.5, botHalf=winW*0.85;
        const topX=winX-winSide*0.05, topY=winBottom+winH*0.86;
        const botX=winX-winSide*3.0, botY=0.05, botZ=wz+2.2; // land inward + down-corridor
        const p=[
          topX,topY,wz-halfW, topX,topY,wz+halfW,
          botX,botY,botZ+botHalf, botX,botY,botZ-botHalf,
        ];
        const sg=new THREE.BufferGeometry();
        sg.setAttribute("position",new THREE.Float32BufferAttribute(p,3));
        sg.setIndex([0,1,2,0,2,3]);sg.computeVertexNormals();
        const shaft=new THREE.Mesh(sg,new THREE.MeshBasicMaterial({color:dlPreset.sunColor,transparent:true,opacity:0.11*dlPreset.sunIntensity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
        scene.add(shaft);
        // dust motes igniting inside the shaft
        const mN=24,mg=new THREE.BufferGeometry(),mp=new Float32Array(mN*3);
        for(let mi=0;mi<mN;mi++){const tt=Math.random();
          mp[mi*3]=topX+(botX-topX)*tt+(Math.random()-0.5)*0.4;
          mp[mi*3+1]=topY+(botY-topY)*tt;
          mp[mi*3+2]=wz+(botZ-wz)*tt+(Math.random()-0.5)*(halfW*1.6);}
        mg.setAttribute("position",new THREE.BufferAttribute(mp,3));
        scene.add(new THREE.Points(mg,new THREE.PointsMaterial({color:dlPreset.sunColor,size:0.05,transparent:true,opacity:0.75*dlPreset.sunIntensity,blending:THREE.AdditiveBlending,depthWrite:false})));
      }
      // ── Mullion grid (square glass dividers) ──
      const mullMat=winStoneMat;
      const mullThick=0.03;
      // Horizontal bars (3 rows dividing window into 4 panes)
      for(let mh=1;mh<=3;mh++){
        const my=winBottom+mh*(winRectH/4);
        scene.add(mk(new THREE.BoxGeometry(mullThick,mullThick,winW-0.12),mullMat,winX+(winSide*0.02),my,wz));
      }
      // Vertical bar (center, dividing into 2 columns)
      scene.add(mk(new THREE.BoxGeometry(mullThick,winRectH-0.1,mullThick),mullMat,winX+(winSide*0.02),winBottom+winRectH/2,wz));
      // ── Bright natural light flooding in — W1 KILL (WS5-3): the 2-per-window
      // PointLight row dies; a baked sun-pool decal on the floor compensates ──
      if(W1)w1AddPool(winX-(winSide*1.0),wz,1.2);
      if(winLightCount<10){
        if(!isMobileGPU()&&!W1){const sunBeam=new THREE.PointLight(dlPreset.sunColor,0.8*dlPreset.sunIntensity,12);
        sunBeam.position.set(winX-(winSide*1.0),winCenterY,wz);
        scene.add(sunBeam);
        // Secondary fill light lower (floor bounce)
        const fillBeam=new THREE.PointLight(dlPreset.fillColor,0.3*dlPreset.fillIntensity,8);
        fillBeam.position.set(winX-(winSide*1.5),winBottom+0.5,wz);
        scene.add(fillBeam);}
        winLightCount++;
      }
    }

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
      const bz=cL/2-5.5-i*C.sp-C.sp/2;
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

    // ── W3C: CENTRAL GALLERY BENCHES + GREENERY (lived-in museum) ──
    // Backless upholstered benches just off the runner, aligned with the salon
    // walls (the classic "sit and contemplate the art" bench), plus a few
    // potted plants — the corridor reads as an inhabited gallery, not a hall.
    if(W3C){
      const terracotta=new THREE.MeshStandardMaterial({color:"#A85A38",roughness:.85,metalness:0});
      const foliage=new THREE.MeshStandardMaterial({color:"#4E6B3A",roughness:.9,metalness:0});
      const foliage2=new THREE.MeshStandardMaterial({color:"#5C7A42",roughness:.9,metalness:0});
      for(let i=0;i<rooms.length-1;i++){
        const bz=cL/2-5.5-i*C.sp-C.sp/2;
        if(bz>cL/2-4||bz<-cL/2+3.5)continue;
        const bx=(i%2===0?1:-1)*1.65; // just off the 2 m runner, alternating
        // legs
        for(const lz of[-.55,.55])for(const lx of[-.28,.28])
          scene.add(mk(new THREE.BoxGeometry(.08,.4,.08),MS.bench,bx+lx,.2,bz+lz));
        // seat plank + double-sided cushion (no back — museum bench) + gold rail
        scene.add(mk(new THREE.BoxGeometry(.74,.08,1.32),MS.bench,bx,.42,bz));
        scene.add(mk(new THREE.BoxGeometry(.03,.06,1.34),MS.gold,bx,.47,bz));
        scene.add(mk(new THREE.BoxGeometry(.64,.12,1.22),MS.benchCushion,bx,.52,bz));
        // a potted plant on every 3rd bay, opposite side, against the wall base
        if(i%3===0){
          const gx=-Math.sign(bx)*(cW/2-.5), gz=bz;
          scene.add(mk(new THREE.CylinderGeometry(.22,.16,.42,14),terracotta,gx,.21,gz));   // pot
          scene.add(mk(new THREE.CylinderGeometry(.24,.24,.05,14),terracotta,gx,.44,gz));    // rim
          for(const[dx,dy,dz,r,fm] of [[0,.75,0,.34,foliage],[.16,.62,.1,.24,foliage2],[-.14,.66,-.08,.22,foliage2],[.05,.9,-.05,.2,foliage]] as [number,number,number,number,THREE.Material][])
            scene.add(mk(new THREE.SphereGeometry(r,8,7),fm,gx+dx,dy,gz+dz));
        }
      }
    }

    // ── CANDLE SCONCES — at z_i + sp*0.25 on both walls, skip near paintings/doors/niches ──
    const paintingZBySide: Record<number, number[]> = {[-1]: [], [1]: []};
    for(let i=0;i<rooms.length-1;i++){
      const doorSide=i%2===0?-1:1;
      paintingZBySide[doorSide].push(cL/2-5.5-i*C.sp-C.sp/2);
    }
    // Collect all door/niche z-positions for sconce overlap
    const allDoorZones: number[] = [];
    for(let ii=0;ii<inlayCount;ii++) allDoorZones.push(-cL/2+5.5+ii*C.sp);
    for(let i=0;i<rooms.length;i++) allDoorZones.push(cL/2-5.5-i*C.sp);
    // Include window positions so sconces/lamps skip them too
    for(const wz of validWinPositions) allDoorZones.push(wz);
    for(let i=0;i<rooms.length;i++){
      const sz=cL/2-5.5-i*C.sp-C.sp*0.25;
      if(sz>cL/2-3||sz<-cL/2+3)continue;
      for(const s of[-1,1]){
        // Skip if sconce would overlap with a painting, door/niche, or window
        const tooClosePainting=paintingZBySide[s].some(pz=>Math.abs(sz-pz)<3.0);
        const tooCloseDoor=allDoorZones.some(dz=>Math.abs(sz-dz)<1.8);
        const tooCloseWin=s===-1&&validWinPositions.some(wz=>Math.abs(sz-wz)<winHalfGap+0.5);
        if(tooClosePainting||tooCloseDoor||tooCloseWin)continue;
        // Mount sconce flush against wall (not protruding into corridor)
        const sx=s*(cW/2-.005);
        scene.add(mk(new THREE.BoxGeometry(.04,.02,.12),MS.bronze,sx-(s*.04),2.6,sz));
        scene.add(mk(new THREE.CylinderGeometry(.025,.02,.1,6),MS.bronze,sx-(s*.08),2.65,sz));
        scene.add(mk(new THREE.CylinderGeometry(.012,.012,.08,5),new THREE.MeshStandardMaterial({color:"#F5F0E0",roughness:.8}),sx-(s*.08),2.74,sz));
        const fG2=new THREE.Mesh(new THREE.SphereGeometry(.018,4,4),new THREE.MeshBasicMaterial({color:"#FFE080",transparent:true,opacity:.7}));
        fG2.position.set(sx-(s*.08),2.8,sz);scene.add(fG2);
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

    // ── RUNNER RUG (raised above floor details to avoid z-fighting) ──
    scene.add(mk(new THREE.BoxGeometry(2,.012,cL-5),MS.rug,0,.02,0));

    // ── CHANDELIERS ──
    const nCh=Math.max(2,Math.ceil(cL/14));
    // W3C cove: the vault apex sits at cH+coveRise — hang chandeliers from it
    // on a longer chain so they don't float below a raised ceiling.
    const coveRise=cove?cW*0.26:0;
    for(let ci=0;ci<nCh;ci++){const cz=-cL/2+cL/(nCh+1)*(ci+1);
      // stem spans from the (vaulted) ceiling apex down to the chandelier body
      const stemLen=.4+coveRise, stemCY=cH-.4+stemLen/2;
      scene.add(mk(new THREE.CylinderGeometry(.015,.015,stemLen,6),MS.bronze,0,stemCY,cz));
      const tr=new THREE.Mesh(new THREE.TorusGeometry(.45,.035,8,20),MS.bronze);tr.position.set(0,cH-.45,cz);scene.add(tr);
      const tr2=new THREE.Mesh(new THREE.TorusGeometry(.28,.018,8,14),MS.gold);tr2.position.set(0,cH-.42,cz);scene.add(tr2);
      for(let b=0;b<6;b++){const ba=(b/6)*Math.PI*2;
        scene.add(mk(new THREE.CylinderGeometry(.01,.008,.06,4),MS.sconce,Math.cos(ba)*.42,cH-.42,cz+Math.sin(ba)*.42));
        const bl=new THREE.Mesh(new THREE.SphereGeometry(.028,5,5),MS.glassG);bl.position.set(Math.cos(ba)*.42,cH-.36,cz+Math.sin(ba)*.42);scene.add(bl);}
      // W1 KILL (WS5-3): chandelier PointLights die — the emissive bulbs read as lit
      if(!isMobileGPU()&&!W1)scene.add(new THREE.PointLight("#FFE8C0",.7,9).translateY(cH-.5).translateZ(cz));
    }

    // ── SCONCES between door zones — at z_i + sp*0.75, skip near paintings/windows ──
    for(const s of[-1,1])for(let i=0;i<rooms.length;i++){
      const sz=cL/2-5.5-i*C.sp-C.sp*0.75;if(sz>cL/2-2||sz<-cL/2+2)continue;
      const tooClose=paintingZBySide[s].some(pz=>Math.abs(sz-pz)<3.0);
      const tooCloseDoor2=allDoorZones.some(dz=>Math.abs(sz-dz)<1.8);
      const tooCloseWin2=s===-1&&validWinPositions.some(wz=>Math.abs(sz-wz)<winHalfGap+0.5);
      if(tooClose||tooCloseDoor2||tooCloseWin2)continue;
      scene.add(mk(new THREE.BoxGeometry(.06,.14,.06),MS.sconce,s*(cW/2-.03),3.5,sz));
      scene.add(mk(new THREE.CylinderGeometry(.04,.03,.06,6),MS.sconce,s*(cW/2-.06),3.62,sz));
      const bl=new THREE.Mesh(new THREE.SphereGeometry(.025,6,6),MS.glassG);bl.position.set(s*(cW/2-.06),3.72,sz);scene.add(bl);
      if(!isMobileGPU()&&!W1)scene.add(new THREE.PointLight("#FFE0B0",.18,3.5).translateX(s*(cW/2-.15)).translateY(3.6).translateZ(sz)); // W1 KILL (WS5-3)
    }

    // ── CENTRAL STATUE on marble pedestal ──
    const sZ=0,pH2=1.2;
    scene.add(mk(new THREE.BoxGeometry(1,.07,1),MS.marble,0,.035,sZ));
    scene.add(mk(new THREE.BoxGeometry(.75,pH2-.1,.75),MS.marble,0,pH2/2+.03,sZ));
    scene.add(mk(new THREE.BoxGeometry(.85,.07,.85),MS.gold,0,pH2+.01,sZ));
    if(wingId==="roots"){scene.add(mk(new THREE.CylinderGeometry(.06,.1,.9,6),MS.bronze,0,pH2+.45,sZ));scene.add(mk(new THREE.SphereGeometry(.28,8,8),new THREE.MeshStandardMaterial({color:"#4A7838",roughness:.8}),0,pH2+1.1,sZ));for(let b=0;b<4;b++){const a=(b/4)*Math.PI*2;const br=mk(new THREE.CylinderGeometry(.015,.03,.35,4),MS.bronze,Math.cos(a)*.1,pH2+.8,sZ+Math.sin(a)*.1);br.rotation.z=Math.cos(a)*.4;br.rotation.x=Math.sin(a)*.4;scene.add(br);}}
    else if(wingId==="travel"){scene.add(mk(new THREE.SphereGeometry(.3,14,10),MS.statue,0,pH2+.5,sZ));const ring=new THREE.Mesh(new THREE.TorusGeometry(.35,.012,8,20),MS.gold);ring.position.set(0,pH2+.5,sZ);scene.add(ring);scene.add(mk(new THREE.CylinderGeometry(.01,.01,.7,4),MS.bronze,0,pH2+.5,sZ));}
    else if(wingId==="nest"){scene.add(mk(new THREE.CylinderGeometry(.25,.3,.45,8),MS.statue,0,pH2+.22,sZ));scene.add(mk(new THREE.ConeGeometry(.3,.35,8),MS.velvet,0,pH2+.62,sZ));scene.add(mk(new THREE.SphereGeometry(.05,6,6),MS.gold,0,pH2+.84,sZ));}
    else if(wingId==="craft"){scene.add(mk(new THREE.BoxGeometry(.14,1,.14),MS.statue,0,pH2+.5,sZ));scene.add(mk(new THREE.ConeGeometry(.1,.22,4),MS.gold,0,pH2+1.12,sZ));}
    else{scene.add(mk(new THREE.CylinderGeometry(.1,.15,.65,8),MS.statue,0,pH2+.33,sZ));scene.add(mk(new THREE.SphereGeometry(.14,8,8),MS.statue,0,pH2+.8,sZ));}
    // W1 KILL (WS5-3): statue spot dies — hemi compensation + envmap carry the marble
    if(!isMobileGPU()&&!W1){const sL=new THREE.SpotLight("#FFF5E0",.7,5,Math.PI/6,.5,1);sL.position.set(0,cH-.1,sZ);sL.target.position.set(0,pH2,sZ);scene.add(sL);scene.add(sL.target);}
    if(W1)w1AddPool(0,sZ,.9);

    // ═══ INTERACTIVE PAINTING/MEDIA SLOTS — 1 painting per door ═══
    const paintingClickMeshes: {mesh: THREE.Mesh, slotKey: string}[] = [];
    // Per-slot canvas mesh + empty placeholder built up front; applyPaintingToSlot
    // toggles between them and swaps cached texture maps in place, so a
    // paintings-prop change never rebuilds the scene.
    const paintingSlots=new Map<string,{canvasMesh: THREE.Mesh, emptyGroup: THREE.Group, appliedUrl: string|null}>();
    let paintingsDisposed=false;
    let paintingSlotIdx = 0;
    const PAINT_Y = 2.05; // lowered below sconce zone (sconces span y=2.8..3.45)
    // Precompute sconce z positions on side=-1 so we can shift paintings off them.
    // Mirrors the sconce loop constants (see Roman section below).
    const _sconceSpacing = 3.2;
    const _sconceCount = Math.max(1, Math.floor(cL / _sconceSpacing) - 1);
    const sconceZsSideMinus: number[] = [];
    for (let si = 1; si <= _sconceCount; si++) {
      const sz = -cL / 2 + si * _sconceSpacing;
      const sSide = si % 2 === 0 ? -1 : 1;
      if (sSide === -1) sconceZsSideMinus.push(sz);
    }
    // ── W2 (WS5-5/6): SALON-HANG — one salon section per door bay, centred in
    // its W1 baked light band (the band IS the "spot" above the piece). Data
    // source unchanged: corridorPaintings = ONE curated memory per room
    // (CorridorGalleryPanel/localStorage) — a SELECTION, not all room memories.
    // Owner feedback 2026-08-06 (#3): the corridor easels are GONE — every
    // piece is a wall-hung painting on the SOLID wall (side=-1); window bays
    // have no wall run there, so those bays are simply skipped (their piece
    // stays omitted — no free-standing colonnade stands). No caps: overflow
    // reports via layout.omitted (maxPieces tier budget 4 mobile / 8 desktop).
    type W2Slot={key:string;secGroup:THREE.Group;side:number;secZ:number;wallX:number;wall:{width:number;height:number};seed:number;mount:SalonHangMount|null;empty:{group:THREE.Group;dispose():void}|null;appliedUrl:string|null;appliedTitle?:string;appliedSize?:string;aspect:number;roomLabel:string};
    // ── Owner feedback 2026-08-06 (#1): per-slot frame size from the gallery
    // panel (small/normal/large, persisted beside url/title in
    // mp_corridor_paintings_*; older saves have no size → normal), over a
    // smaller default: the hero hang used to fill the whole 1.9m usable run
    // (w=1.9) which read too big — new normal is 1.45m (~24% down).
    const W2_SIZE_FACTOR:Record<string,number>={small:.7,normal:1,large:1.25};
    const W2_BASE_W=1.45;
    // ── Owner feedback 2026-08-06 (#2): wainscot-rail clearance. The solid
    // wall carries a gold rail Box(.05,.07) at y=1.43 (top 1.465, front face at
    // wall+.085) over a wainscot box whose front face is wall+.08 — exactly the
    // plane the makeArtwork frame front (mount wall+.07, frame local z −.05..
    // +.01) used to land on. The salon clamp allowed the photo bottom down to
    // 1.2875 (frame bottom 1.1875), burying 28cm of frame inside the wainscot
    // coplanar with its front while the rail sliced through it → z-fighting.
    // Fix is structural: (a) every piece bottom incl. its plaque is clamped
    // ABOVE the rail top, (b) the mount stands off far enough that the frame
    // back face (mount−.05) clears the rail front (wall+.085) by ≥1cm even if
    // geometry ever dips.
    const W2_RAIL_TOP=1.465;
    const W2_PLAQUE_DROP=.35; // frame lip .1 + plaque ≤.22 below the photo + clearance
    const W2_TOP_CLEAR=.3;    // salonHang TOP_CLEAR — keep the top clamp in sync
    const w2Slots=new Map<string,W2Slot>();
    const w2FocusTargets=new Map<string,FocusTarget>();
    const w2Quality:"low"|"med"|"high"=isMobileGPU()?"med":"high";
    // Basic-material builds (Fraunces labels, makeArtwork pieces, empty frames)
    // are DEFERRED past optimizeMaterials. (Comment corrected 2026-08-06: the
    // fingerprint DOES include map.uuid — but before any photo decodes, every
    // salon photo material would hold the SAME shared placeholder map, giving
    // identical fingerprints, so mount-time dedupe would collapse them into ONE
    // material and a later setTexture would repaint every piece at once.
    // Deferral past that pass keeps each piece's material its own.)
    const w2Deferred:(()=>void)[]=[];
    const w2TexAspect=(tex?:THREE.Texture)=>{const im=tex?.image as {width?:number;height?:number}|undefined;return im&&im.width&&im.height?im.width/im.height:0;};
    // Owner feedback 2026-08-06 (#3): the empty state is WALL-MOUNTED — a
    // subtle canon frame (gold + bare PLASTER liner, makeArtwork proportions)
    // with the existing t("hangFirstMemory") small on a Fraunces plaque
    // beneath it. Replaces makeSalonEmptyEasel here; tap contract unchanged —
    // the persistent invisible hit box still routes the click.
    const makeW2EmptyFrame=()=>{
      const g=new THREE.Group();
      // (#2 2026-08-06): centre raised off the sightline so the frame AND its
      // plaque (label bottom = cy−fh/2−.36) clear the wainscot rail top like
      // the hung pieces do — matches the hung-piece clamp band.
      const fw=1.0,fh=.75,cy=W2_RAIL_TOP+.38+fh/2;
      const frameGeo=new THREE.BoxGeometry(fw+.14,fh+.14,.05);
      const frameMat=new THREE.MeshStandardMaterial({color:GOLD,roughness:.28,metalness:.6});
      const frame=new THREE.Mesh(frameGeo,frameMat);frame.position.set(0,cy,.025);
      const linerGeo=new THREE.PlaneGeometry(fw,fh);
      // (#6) liner sat 2mm over the frame's front face (.052 vs .05) — z-fight
      // at distance; 8mm separation + polygonOffset keeps the plaster liner clean
      const linerMat=new THREE.MeshStandardMaterial({color:PLASTER,roughness:.9,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
      const liner=new THREE.Mesh(linerGeo,linerMat);liner.position.set(0,cy,.058);
      const plaque=makeFrauncesLabel(t("hangFirstMemory"),{width:.85,height:.2}) as THREE.Mesh;
      plaque.position.set(0,cy-fh/2-.26,.04);
      g.add(frame,liner,plaque);
      return {group:g,dispose(){
        g.parent?.remove(g);
        frameGeo.dispose();frameMat.dispose();linerGeo.dispose();linerMat.dispose();
        plaque.geometry.dispose();
        const pm=plaque.material as THREE.MeshBasicMaterial;pm.map?.dispose();pm.dispose();
      }};
    };
    const w2Remount=(slot:W2Slot)=>{
      slot.mount?.dispose();slot.mount=null;
      slot.empty?.dispose();slot.empty=null;
      w2FocusTargets.delete(slot.key);
      if(!slot.appliedUrl){
        slot.empty=makeW2EmptyFrame();
        slot.secGroup.add(slot.empty.group);
        return;
      }
      const mems:SalonMemoryRef[]=[{id:slot.key,aspect:slot.aspect,title:slot.appliedTitle||slot.roomLabel}];
      const layout=computeSalonHang(mems,slot.wall,{seed:slot.seed,maxPieces:isMobileGPU()?4:8,maxPieceWidth:1.9});
      // Post-pass on the (single) hero placement — see W2_BASE_W/W2_RAIL_TOP
      // notes above: smaller default × panel size factor, then hard clamps so
      // the piece + plaque always live in the rail→crown band (the "groot"
      // variant shrinks via maxH before it could ever reach the rail).
      const sizeF=W2_SIZE_FACTOR[slot.appliedSize||"normal"]??1;
      for(const p of layout.placements){
        const asp=p.memory.aspect||4/3;
        const maxH=slot.wall.height-W2_TOP_CLEAR-(W2_RAIL_TOP+W2_PLAQUE_DROP);
        p.width=Math.min(p.width,W2_BASE_W*sizeF,maxH*asp);
        p.height=p.width/asp;
        p.y=Math.max(layout.sightY,W2_RAIL_TOP+W2_PLAQUE_DROP+p.height/2);
        p.y=Math.min(p.y,slot.wall.height-W2_TOP_CLEAR-p.height/2);
      }
      slot.mount=mountSalonHang(layout,{
        getTexture:()=>(slot.appliedUrl?paintingTextureCache.get(slot.appliedUrl):undefined)||getPaintingPlaceholderTex(),
        quality:w2Quality,
        rabbet:W3C, // F15: recessed photo + raised molding lip (corridor only)
        onPiece:(art,p)=>{
          art.group.userData={memory:{id:slot.key,title:slot.appliedTitle,url:slot.appliedUrl}};
          // WS5-8 focus target — world frame (secGroup rotY maps wall-local x → ∓z)
          w2FocusTargets.set(slot.key,{
            position:new THREE.Vector3(slot.wallX,p.y,slot.secZ+(slot.side===-1?-p.x:p.x)),
            normal:new THREE.Vector3(slot.side===-1?1:-1,0,0),
            planeHeight:p.height,planeWidth:p.width,data:"paint:"+slot.key,
          });
        },
      });
      slot.secGroup.add(slot.mount.group);
    };
    if(W2)for(let i=0;i<rooms.length;i++){
      const sBz=cL/2-5.5-i*C.sp-C.sp*.5;
      if(sBz>cL/2-3||sBz<-cL/2+3)continue;
      // Owner feedback 2026-08-06 (#3): every section hangs on the SOLID wall
      // (side=-1) — no colonnade easels. A bay whose solid-wall run holds a
      // window has no wall space (above/beside the arch there is none), so the
      // bay is skipped and its piece stays omitted — no contrived stand-ins.
      const s=-1;
      if(validWinPositions.some(wz=>Math.abs(sBz-wz)<winHalfGap+1.6))continue;
      const slotKey=rooms[i]?.id||`corridor-${wingId}-painting-${i}`;
      const secRoom=rooms[i];
      const roomLabel=secRoom?(secRoom.nameKey?tWings(secRoom.nameKey):secRoom.name):"";
      const secGroup=new THREE.Group();
      // (#2 2026-08-06): stand-off .07→.145 — frame back face (mount−.05) now
      // sits at wall+.095, 1cm proud of the gold rail front (wall+.085) and
      // 1.5cm off the wainscot front plane (wall+.08) it used to be coplanar
      // with; the glow decal (mount−.035 = wall+.11) clears everything too.
      const wallX=-(cW/2-.145);
      secGroup.position.set(wallX,0,sBz);
      secGroup.rotation.y=Math.PI/2;
      scene.add(secGroup);
      let seed=0x811c9dc5;const seedStr=wingId+"|"+slotKey;
      for(let k=0;k<seedStr.length;k++){seed^=seedStr.charCodeAt(k);seed=Math.imul(seed,0x01000193);}
      w2Slots.set(slotKey,{key:slotKey,secGroup,side:s,secZ:sBz,wallX,wall:{width:Math.min(C.sp-2.6,2.9),height:Math.min(cH-1,4.4)},seed:seed>>>0,mount:null,empty:null,appliedUrl:null,aspect:4/3,roomLabel});
      // Persistent invisible hit box — raycast contract preserved: stable mesh
      // identity in paintingClickMeshes across remounts, userData.isPaintingSlot.
      const hit=new THREE.Mesh(new THREE.BoxGeometry(.5,3.6,Math.min(C.sp-2.6,2.9)),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
      hit.position.set(-(cW/2-.3),2.1,sBz);
      hit.userData={isPaintingSlot:true,slotKey};
      scene.add(hit);
      paintingClickMeshes.push({mesh:hit,slotKey});
    }
    if(!W2)for(let i=0;i<rooms.length;i+=1){
      // Place painting midway after the i-th door (between door i and door i+1, or past last).
      // This gives exactly N paintings for N rooms.
      let pz=cL/2-5.5-i*C.sp-C.sp/2;
      if(pz>cL/2-3||pz<-cL/2+3)continue;
      // Always side=-1: Roman era has an open colonnade on side=1 (pillars would clip the
      // painting). Renaissance has solid walls on both sides but we keep a single side for
      // consistency + to dodge the bust niches that live on side=1 there.
      const s=-1;
      // Shift painting if it's too close to a sconce on side=-1 (sconces span y=2.8..3.45,
      // but their wall-plate & candelabra arms also flare out near the painting's z-range).
      const paintingHalfLen = 0.72; // fw/2 + a small buffer
      for (const sz of sconceZsSideMinus) {
        if (Math.abs(pz - sz) < paintingHalfLen + 0.35) {
          // Shift away from nearest sconce along z
          pz += (pz >= sz ? 1 : -1) * (paintingHalfLen + 0.4 - Math.abs(pz - sz));
        }
      }
      // Shift painting away from windows instead of skipping (keeps demo paintings visible)
      for (const wz of validWinPositions) {
        if (Math.abs(pz - wz) < winHalfGap + paintingHalfLen + 0.3) {
          pz += (pz >= wz ? 1 : -1) * (winHalfGap + paintingHalfLen + 0.35 - Math.abs(pz - wz));
        }
      }
      if(pz>cL/2-3||pz<-cL/2+3)continue;
      const fx=s*(cW/2-.05);
      // Use room ID as key to match CorridorGalleryPanel's slot keys
      const slotKey=rooms[i]?.id || `corridor-${wingId}-painting-${i}`;
      paintingSlotIdx++;
      const fw=1.3,fh=0.9,frameW=0.07;
      // Gold frame — ornate border
      scene.add(mk(new THREE.BoxGeometry(.03,frameW,fw+frameW*2),MS.gold,fx,PAINT_Y+fh/2+frameW/2,pz)); // top
      scene.add(mk(new THREE.BoxGeometry(.03,frameW,fw+frameW*2),MS.gold,fx,PAINT_Y-fh/2-frameW/2,pz)); // bottom
      scene.add(mk(new THREE.BoxGeometry(.03,fh,frameW),MS.gold,fx,PAINT_Y,pz-fw/2-frameW/2)); // left
      scene.add(mk(new THREE.BoxGeometry(.03,fh,frameW),MS.gold,fx,PAINT_Y,pz+fw/2+frameW/2)); // right
      // Inner frame accent
      scene.add(mk(new THREE.BoxGeometry(.025,frameW*.4,fw+frameW),MS.trim,fx-(s*.002),PAINT_Y+fh/2+frameW*.15,pz));
      scene.add(mk(new THREE.BoxGeometry(.025,frameW*.4,fw+frameW),MS.trim,fx-(s*.002),PAINT_Y-fh/2-frameW*.15,pz));
      // Canvas / painting surface — mesh persists across paintings-prop changes;
      // hidden until its cached texture is ready (matches old async-load behavior)
      const canvasMat=new THREE.MeshStandardMaterial({map:getPaintingPlaceholderTex(),roughness:.65});
      const canvasMesh=new THREE.Mesh(new THREE.PlaneGeometry(fw-.04,fh-.04),canvasMat);
      canvasMesh.rotation.y=s*(-Math.PI/2);
      canvasMesh.position.set(fx-(s*.025),PAINT_Y,pz);
      canvasMesh.visible=false;
      scene.add(canvasMesh);
      // Empty slot — subtle warm canvas placeholder inviting interaction
      const emptyGroup=new THREE.Group();
      const emptyMat=new THREE.MeshStandardMaterial({color:"#C8BCA0",roughness:.85,emissive:"#C8BCA0",emissiveIntensity:.03});
      emptyGroup.add(mk(new THREE.BoxGeometry(.008,fh-.06,fw-.06),emptyMat,fx-(s*.025),PAINT_Y,pz));
      // Small "+" hint in center
      emptyGroup.add(mk(new THREE.BoxGeometry(.006,.2,.03),MS.trim,fx-(s*.01),PAINT_Y,pz));
      emptyGroup.add(mk(new THREE.BoxGeometry(.006,.03,.2),MS.trim,fx-(s*.01),PAINT_Y,pz));
      scene.add(emptyGroup);
      paintingSlots.set(slotKey,{canvasMesh,emptyGroup,appliedUrl:null});
      // Small gold ornament at top center of frame
      scene.add(mk(new THREE.BoxGeometry(.035,.06,.15),MS.gold,fx-(s*.003),PAINT_Y+fh/2+frameW+.01,pz));
      // Invisible click target for painting interaction
      const paintClick=new THREE.Mesh(
        new THREE.BoxGeometry(.3,fh+frameW*2,fw+frameW*2),
        new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})
      );
      paintClick.position.set(fx,PAINT_Y,pz);
      paintClick.userData={isPaintingSlot:true,slotKey};
      scene.add(paintClick);
      paintingClickMeshes.push({mesh:paintClick,slotKey});
    }

    // In-place painting applier: swaps cached texture maps on the existing slot
    // meshes — identical output to a rebuild, without remounting the scene.
    const applyPaintingToSlot=(slotKey: string,url: string|undefined)=>{
      const slot=paintingSlots.get(slotKey);if(!slot)return;
      if(!url){
        slot.appliedUrl=null;
        slot.canvasMesh.visible=false;
        (slot.canvasMesh.material as THREE.MeshStandardMaterial).map=getPaintingPlaceholderTex();
        slot.emptyGroup.visible=true;
        return;
      }
      if(slot.appliedUrl===url)return;
      slot.appliedUrl=url;
      slot.emptyGroup.visible=false;
      loadPaintingTexture(url).then((tex)=>{
        if(paintingsDisposed||slot.appliedUrl!==url)return; // torn down or superseded
        const mat=slot.canvasMesh.material as THREE.MeshStandardMaterial;
        mat.map=tex; // placeholder map kept USE_MAP defined — uniform swap, no recompile
        slot.canvasMesh.visible=true;
      }).catch(()=>{});
    };
    // ── W2 (WS5-5): in-place applier over makeArtwork salon pieces — same
    // fingerprint/ref contract as legacy. Unchanged url → texture uniform swap
    // only (setTexture keeps USE_MAP defined via the shared placeholder);
    // aspect/title change → cheap remount of the few piece meshes (shared
    // frame/liner/glow materials, no shader recompile), never a scene rebuild.
    const w2ApplyToSlot=(slotKey: string,url: string|undefined,title: string|undefined,size: string|undefined)=>{
      const slot=w2Slots.get(slotKey);if(!slot)return;
      if(!url){
        if(!slot.appliedUrl&&(slot.mount||slot.empty))return; // already showing the empty wall frame
        slot.appliedUrl=null;slot.appliedTitle=undefined;slot.appliedSize=undefined;
        w2Remount(slot);return;
      }
      // size participates in the change fingerprint — a panel size flip alone
      // remounts the slot at its new width (owner 2026-08-06 #1).
      if(slot.appliedUrl===url&&slot.appliedTitle===title&&slot.appliedSize===size&&slot.mount)return;
      slot.appliedUrl=url;slot.appliedTitle=title;slot.appliedSize=size;
      const cachedAsp=w2TexAspect(paintingTextureCache.get(url));
      if(cachedAsp)slot.aspect=cachedAsp;
      w2Remount(slot); // shows the warm placeholder canvas until the decode lands
      loadPaintingTexture(url).then((tex)=>{
        if(paintingsDisposed||slot.appliedUrl!==url)return; // torn down or superseded
        const asp=w2TexAspect(tex)||4/3;
        if(Math.abs(asp-slot.aspect)>.02){slot.aspect=asp;w2Remount(slot);} // aspect-correct, never stretch (dogma 6)
        else slot.mount?.artworks.get(slotKey)?.setTexture(tex);
      }).catch(()=>{});
    };
    const applyPaintings=(paintings: Record<string,{url?: string, title?: string, size?: string}>|undefined)=>{
      if(W2){for(const key of w2Slots.keys())w2ApplyToSlot(key,paintings?.[key]?.url,paintings?.[key]?.title,paintings?.[key]?.size);return;}
      for(const key of paintingSlots.keys())applyPaintingToSlot(key,paintings?.[key]?.url);
    };
    if(W2)w2Deferred.push(()=>applyPaintings(corridorPaintingsRef.current)); // after optimizeMaterials — see w2Deferred note
    else applyPaintings(corridorPaintingsRef.current);
    applyPaintingsRef.current=applyPaintings;

    // (Plants at ends are included with the side tables above)

    // ══ DOORS — placed near the entrance (high z), locked niches at far end (low z) ══
    const dMeshes: any[]=[];
    // W3C (F10/F30/F31): the flat 5-box slab doors are replaced by a Blender
    // DRACO GLB hero (paneled walnut leaves + travertine architrave + bronze
    // handles). Collect the procedural visuals per slot so they can be hidden
    // when the GLB lands (canary: procedural stays on 404). The door LEAF keeps
    // its material as an invisible raycast proxy so hit-testing is untouched.
    const w3DoorSlots: {wx:number,z:number,side:number,leafMat:THREE.MeshStandardMaterial,hide:THREE.Object3D[]}[]=[];
    // W3C: a warm walnut MOTIF for the flat procedural door leaf (owner likes
    // the flat door + a material motif). Vertical grain planks + two panel
    // rebates so the leaf reads as a real door without any bulky geometry.
    let w3DoorTex: THREE.CanvasTexture|null=null;
    if(W3C){
      const dc=document.createElement("canvas");dc.width=256;dc.height=512;const x=dc.getContext("2d");
      if(x){
        const PL=3,pw=256/PL;
        for(let p=0;p<PL;p++){
          const h=Math.sin(p*91.7)*4375.5;const v=(h-Math.floor(h))*24-12;
          x.fillStyle=`rgb(${96+v|0},${62+v*0.7|0},${38+v*0.5|0})`;x.fillRect(p*pw,0,pw,512);
          for(let s=0;s<12;s++){const h2=Math.sin((p*13+s)*57.1)*2531.7;const gx=p*pw+(h2-Math.floor(h2))*pw;
            x.strokeStyle=`rgba(40,24,10,${s%3===0?0.4:0.22})`;x.lineWidth=s%4===0?2.4:1.2;
            x.beginPath();x.moveTo(gx,0);for(let yy=0;yy<=512;yy+=32)x.lineTo(gx+Math.sin(yy*0.02+s+p)*3,yy);x.stroke();}
          x.fillStyle="rgba(30,18,8,0.5)";x.fillRect(p*pw,0,1.5,512);
        }
        // two recessed panel rebates (darker inner rectangles)
        for(const[py,ph] of [[64,150],[300,150]] as [number,number][]){
          x.strokeStyle="rgba(24,14,6,0.55)";x.lineWidth=6;x.strokeRect(46,py,164,ph);
          x.strokeStyle="rgba(150,110,70,0.35)";x.lineWidth=2;x.strokeRect(52,py+6,152,ph-12);
        }
      }
      w3DoorTex=new THREE.CanvasTexture(dc);w3DoorTex.colorSpace=THREE.SRGBColorSpace;w3DoorTex.anisotropy=8;
    }
    rooms.forEach((room: any,i: any)=>{
      const side=i%2===0?-1:1;
      const z=cL/2-5.5-i*C.sp;
      const wx=side*(cW/2);
      const dW=1.7,dH=3.6;
      const doorHide: THREE.Object3D[]=[];
      // Minimal door surround — thin trim only at top
      doorHide.push(mk(new THREE.BoxGeometry(.04,.12,dW+.2),MS.trim,wx-(side*.02),dH+.1,z));scene.add(doorHide[doorHide.length-1]);
      // Recess (dark) — captured so the GLB door can replace it too
      {const rc=mk(new THREE.BoxGeometry(.03,dH-.1,dW+.1),MS.doorD,wx-(side*.015),(dH-.1)/2,z);scene.add(rc);doorHide.push(rc);}
      // Door panel — clone material per door because each door needs independent
      // emissive state for hover highlights and pulse animations (see animate loop)
      const doorMat=MS.door.clone();
      const doorMesh=mk(new THREE.BoxGeometry(.05,dH-.2,dW-.05),doorMat,wx-(side*.03),(dH-.2)/2,z);
      doorMesh.userData={roomId:room.id,wingId,idx:i};doorMesh.castShadow=true;scene.add(doorMesh);
      dMeshes.push({mesh:doorMesh,mat:doorMat,room,side,z,x:wx});
      w3DoorSlots.push({wx,z,side,leafMat:doorMat,hide:doorHide});
      // Panel insets
      for(let py=0;py<2;py++)for(let pz2=-1;pz2<=1;pz2+=2){
        const ins=mk(new THREE.BoxGeometry(.004,.6,dW/2-.18),MS.gold,wx-(side*.05),.65+py*1.3,z+pz2*(dW/4));scene.add(ins);doorHide.push(ins);}
      // Handles
      for(let hz of[-.12,.12]){const hh=mk(new THREE.SphereGeometry(.03,6,6),MS.handle,wx-(side*.06),1.5,z+hz);scene.add(hh);doorHide.push(hh);}
      // Warm glow — W1 KILL (WS5-2/3): per-door hsl() PointLight dies; a baked
      // warm threshold pool compensates so no door reads dark
      if(!isMobileGPU()&&!W1)scene.add(new THREE.PointLight(`hsl(${room.coverHue},35%,60%)`,.2,3.5).translateX(wx-(side*.4)).translateY(dH/2).translateZ(z));
      if(W1)w1AddPool(wx-side*1.1,z);
      const roomLabel=room.nameKey?tWings(room.nameKey):room.name;
      if(W2){
        // W2 (WS5-7): canon door lintel — travertine beam over an ink shadow
        // reveal, Fraunces ink-on-cream plaque (replaces the Georgia door
        // plaque), always visible — consistent with the hall's W1 lintels.
        scene.add(mk(new THREE.BoxGeometry(.14,.34,dW+.5),MS.wain,wx-(side*.06),dH+.29,z));
        scene.add(mk(new THREE.BoxGeometry(.15,.06,dW+.5),MS.trim,wx-(side*.065),dH+.09,z));
        w2Deferred.push(()=>{ // Basic-material label — deferred past optimizeMaterials
          // W3C (F34/F35): gilded door lintel plaque (hall precedent) — reads as
          // wayfinding recognition; slightly wider so long/i18n names aren't crushed.
          const lp=makeFrauncesLabel(roomLabel,W3C?{width:2.0,height:.42,gilded:true}:{width:1.7,height:.4}) as THREE.Mesh;
          // (#6) lintel plaque sits 1cm proud of the travertine beam — polygonOffset
          // guards the grazing-angle z-fight (per-label material, never module-shared)
          const lpm=lp.material as THREE.MeshBasicMaterial;lpm.polygonOffset=true;lpm.polygonOffsetFactor=-1;lpm.polygonOffsetUnits=-1;
          lp.rotation.y=side*(-Math.PI/2);lp.position.set(wx-(side*.14),dH+.29,z);scene.add(lp);
        });
      }else{
      // Name plaque — large, centered ON the door
      const plq=document.createElement("canvas");plq.width=560;plq.height=96;
      const pc=plq.getContext("2d")!;pc.fillStyle="#3E3020";pc.fillRect(0,0,560,96);pc.fillStyle="#C8A868";pc.fillRect(3,3,554,90);pc.fillStyle="#3E3020";pc.fillRect(8,8,544,80);
      pc.fillStyle="#F0EAE0";pc.font="bold 30px Georgia,serif";pc.textAlign="center";pc.textBaseline="middle";pc.fillText(roomLabel,280,48);
      const ptex=new THREE.CanvasTexture(plq);ptex.colorSpace=THREE.SRGBColorSpace;
      const plm=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.28),new THREE.MeshStandardMaterial({map:ptex,roughness:.4}));
      plm.rotation.y=side*(-Math.PI/2);plm.position.set(wx-(side*.06),dH*.75,z);scene.add(plm);
      }
      if(room.shared){const badge=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.02,12),MS.shared);badge.rotation.z=side*Math.PI/2;badge.position.set(wx-(side*.005),dH+1.1,z+.5);scene.add(badge);}
    });
    doorMeshes.current=dMeshes;

    // ── ROOM-DOOR HERO — the GLB door read too bulky (owner 2026-08-14); the
    // flat procedural leaf with its gold panel insets + gilded lintel plaque
    // is the preferred look. GLB retired; a warm wood-grain MOTIF is added to
    // the procedural leaf below (W3C) instead. Asset kept on disk.
    void loadModel;
    if(W3C&&w3DoorTex){
      for(const slot of w3DoorSlots){slot.leafMat.map=w3DoorTex;slot.leafMat.color.setRGB(1,1,1);slot.leafMat.needsUpdate=true;}
    }

    // ── LOCKED ROOM NICHES — sealed archway alcoves at the far end of corridor ──
    const inlayClickMeshes: THREE.Mesh[] = [];
    if (inlayCount > 0) {
      const dW=1.7,dH=3.6; // match real door dimensions
      const nicheDepth=0.2; // recess depth
      const nicheMat=new THREE.MeshStandardMaterial({color:W1?PLASTER_RAMP.shade:"#B8AE9C",roughness:.75,normalMap:wallStoneTex.normalMap,normalScale:new THREE.Vector2(.15,.15)});
      const nicheBackMat=new THREE.MeshStandardMaterial({color:W1?PLASTER_RAMP.dark:"#A09888",roughness:.85});
      for (let ii = 0; ii < inlayCount; ii++) {
        const side = ii % 2 === 0 ? -1 : 1;
        const z = -cL / 2 + 5.5 + ii * C.sp;
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
        const archFillMat = new THREE.MeshStandardMaterial({ color: W1?PLASTER_RAMP.mid:"#C4B8A4", roughness: 0.7, transparent: true, opacity: 0.6 });
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
        color: W1?PLASTER_RAMP.light:"#F0EAE0", roughness: 0.8, side: THREE.BackSide,
      });
      const vault = new THREE.Mesh(vaultGeo, vaultMat);
      vault.rotation.z = Math.PI / 2;
      vault.rotation.x = Math.PI / 2;
      vault.position.set(0, cH, 0);
      scene.add(vault);

      // ── VAULT RIBS (transverse arched strips) ──
      const ribCount = 7;
      const ribSpacing = cL / (ribCount + 1);
      const ribMat = new THREE.MeshStandardMaterial({ color: W1?PLASTER_RAMP.mid:"#B8AA90", roughness: 0.5, metalness: 0.15 });
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
      const candleMat = new THREE.MeshStandardMaterial({ color: W1?INK:"#C8A858", roughness: 0.2, metalness: 0.8 });
      let rLightIdx = 0;
      for (let si = 1; si <= sconceLightCount; si++) {
        const sz = -cL / 2 + si * sconceSpacing;
        const sSide = si % 2 === 0 ? -1 : 1;
        // Skip if too close to any door
        if (allDoorZones.some(dz => Math.abs(sz - dz) < 1.8)) continue;
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
        // PointLight (limit to 8 total, skip on mobile; W1 KILL — WS5-3)
        if (!isMobileGPU() && !W1 && rLightIdx < 8) {
          const sLight = new THREE.PointLight("#FFE0A0", 0.3, 4);
          sLight.position.set(sx - sSide * 0.18, 3.4, sz);
          scene.add(sLight);
          rLightIdx++;
        }
      }

      // Renaissance-era inline painting frames removed — unified new loop above handles all eras.

      // ── DIAMOND FLOOR PATTERN (InstancedMesh) ──
      const tileSz = 0.6;
      const tileGeo = new THREE.PlaneGeometry(tileSz, tileSz);
      const tileDarkMat = new THREE.MeshStandardMaterial({ color: W1?INK:"#4A4A42", roughness: 0.5, metalness: 0.08 });
      const tileLightMat = new THREE.MeshStandardMaterial({ color: W1?TRAVERTINE_GROUT:"#E8E0D4", roughness: 0.5, metalness: 0.05 });
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
      const capitalMat = new THREE.MeshStandardMaterial({ color: W1?PLASTER_RAMP.light:"#E0D8CC", roughness: 0.3, metalness: 0.05 });

      // Collect door z-positions on side=1 (odd-indexed rooms) for column/railing skip
      const side1DoorZs: number[] = [];
      rooms.forEach((_: any, ri: number) => {
        if (ri % 2 !== 0) side1DoorZs.push(cL / 2 - 5.5 - ri * C.sp);
      });
      // Also include niche z on side=1 if present
      if (hasLockedNiche && inlayCount > 0) {
        for (let ii = 0; ii < inlayCount; ii++) {
          if (ii % 2 !== 0) side1DoorZs.push(-cL / 2 + 5.5 + ii * C.sp);
        }
      }
      const doorHalfW = 1.3; // half-width of door zone to skip

      for (let ci = 0; ci <= colCount; ci++) {
        const cz = -cL / 2 + 0.5 + ci * colSpacing;
        // Skip columns that overlap with doors on this wall
        if (side1DoorZs.some(dz => Math.abs(cz - dz) < doorHalfW)) continue;
        // Column base
        scene.add(mk(new THREE.CylinderGeometry(colR + 0.08, colR + 0.1, 0.15, 12), MS.marble, colX, 0.075, cz));
        // Column shaft
        scene.add(mk(new THREE.CylinderGeometry(colR, colR, colH, 12), MS.marble, colX, colH / 2 + 0.15, cz));
        // Capital (wider top)
        scene.add(mk(new THREE.CylinderGeometry(colR + 0.12, colR, 0.2, 12), capitalMat, colX, colH + 0.15 + 0.1, cz));
        // Abacus block
        scene.add(mk(new THREE.BoxGeometry(0.6, 0.08, 0.6), capitalMat, colX, colH + 0.39, cz));
      }

      // Low railing between columns — split into segments that skip door openings
      const railZones = [...side1DoorZs].sort((a, b) => a - b);
      let railStart = -cL / 2 + 0.5;
      const railEnd = cL / 2 - 0.5;
      const railSegs: { start: number; end: number }[] = [];
      for (const dz of railZones) {
        const gapL = dz - doorHalfW;
        const gapR = dz + doorHalfW;
        if (gapL > railStart + 0.3) railSegs.push({ start: railStart, end: gapL });
        railStart = gapR;
      }
      if (railEnd > railStart + 0.3) railSegs.push({ start: railStart, end: railEnd });
      for (const seg of railSegs) {
        const segLen = seg.end - seg.start;
        const segCenter = (seg.start + seg.end) / 2;
        scene.add(mk(new THREE.BoxGeometry(0.12, 0.6, segLen), MS.marble, colX, 0.3, segCenter));
        scene.add(mk(new THREE.BoxGeometry(0.18, 0.06, segLen), capitalMat, colX, 0.63, segCenter));
      }

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
      const mCream = new THREE.MeshStandardMaterial({ color: W1?TRAVERTINE_GROUT:"#F0E8D8", roughness: 0.55 });
      const mBlack = new THREE.MeshStandardMaterial({ color: W1?INK:"#2A2A28", roughness: 0.5 });
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

      // ── OIL LAMP BRACKETS on solid wall — skip near doors/niches ──
      const lampBracketMat = MS.bronze;
      const lampCount = Math.min(10, Math.floor(cL / 3));
      const lampSpacing = cL / (lampCount + 1);
      let lampLightCount = 0;
      // Collect door/niche z-positions on the solid wall (side=-1, even-indexed rooms)
      const solidWallDoorZs: number[] = [];
      rooms.forEach((_: any, ri: number) => {
        if (ri % 2 === 0) solidWallDoorZs.push(cL / 2 - 5.5 - ri * C.sp);
      });
      if (hasLockedNiche && inlayCount > 0) {
        for (let ii = 0; ii < inlayCount; ii++) {
          if (ii % 2 === 0) solidWallDoorZs.push(-cL / 2 + 5.5 + ii * C.sp);
        }
      }
      for (let li = 1; li <= lampCount; li++) {
        const lz = -cL / 2 + li * lampSpacing;
        // Skip if too close to a door, niche, or window on this wall
        if (solidWallDoorZs.some(dz => Math.abs(lz - dz) < 1.8)) continue;
        if (validWinPositions.some(wz => Math.abs(lz - wz) < winHalfGap + 0.5)) continue;
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
        // PointLight (limit to 8, skip on mobile; W1 KILL — WS5-3, the emissive
        // flame + wall bands carry the read)
        if (!isMobileGPU() && !W1 && lampLightCount < 8) {
          const lLight = new THREE.PointLight("#FF9040", 0.4, 6);
          lLight.position.set(lx - nicheWall * 0.2, 2.6, lz);
          scene.add(lLight);
          lampLightCount++;
        }
      }

      // ── CEILING BEAMS (exposed timber) ──
      // W3C cove: these Roman flat-ceiling beams sit at cH and would occlude
      // the vault (which rises to cH+rise ABOVE them) — skip when the cove is
      // active; the vault carries its own transverse ribs.
      if(!cove){
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
    }

    // ── WALKTHROUGH HIGHLIGHT — golden glow on target door ──
    // Under w1_corridor the per-door intensity-0 PointLights are deleted (WS5-3);
    // the gold ring decal (w1HlRing) marks the walkthrough target instead.
    const hlDoorLights: Map<string,THREE.PointLight>=new Map();
    if(!W1)dMeshes.forEach(d=>{
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
    // Double arch — outer arch. W3C (F02): more voussoirs, each ROTATED to
    // follow the arch tangent (was axis-aligned boxes → stair-stepped, gappy).
    const archSegs=W3C?26:12;
    for(let ai=0;ai<=archSegs;ai++){
      const ang=(ai/archSegs)*Math.PI;
      const ax=Math.cos(ang)*(pW/2+.2);
      const ay=pH+Math.sin(ang)*.7;
      const vb=mk(W3C?new THREE.BoxGeometry(.34,.2,.26):new THREE.BoxGeometry(.2,.2,.24),MS.portalArch,ax,ay,portalZ);
      if(W3C)vb.rotation.z=ang-Math.PI/2; // tangent to the arch → smooth ring
    }
    // Inner arch — gold trim
    for(let ai=0;ai<=archSegs;ai++){
      const ang=(ai/archSegs)*Math.PI;
      const ax=Math.cos(ang)*(pW/2);
      const ay=pH+Math.sin(ang)*.55;
      const ib=mk(W3C?new THREE.BoxGeometry(.16,.1,.14):new THREE.BoxGeometry(.1,.1,.12),MS.portalGoldTrim,ax,ay,portalZ);
      if(W3C)ib.rotation.z=ang-Math.PI/2;
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
    // Inner glow plane — brighter. W3C (F03): DoubleSide so it reads from the
    // corridor (the player views the portal from -z; the +z-facing plane was
    // back-face culled = invisible invitation).
    const portalGlow=new THREE.Mesh(new THREE.PlaneGeometry(pW-.2,pH-.4),new THREE.MeshBasicMaterial({color:dlPreset.sunColor,transparent:true,opacity:(W3C?.13:.08)*dlPreset.sunIntensity,depthWrite:false,blending:THREE.AdditiveBlending,side:W3C?THREE.DoubleSide:THREE.FrontSide}));
    portalGlow.position.set(0,pH/2+.2,portalZ);scene.add(portalGlow);
    // ── WARM FOG/MIST at base of portal ──
    for(let fi=0;fi<5;fi++){
      const fogPlane=new THREE.Mesh(new THREE.PlaneGeometry(pW*.7+fi*.3,.4),MS.portalFog);
      fogPlane.position.set(0,.2+fi*.08,portalZ-.05-fi*.04);
      fogPlane.material=MS.portalFog.clone();
      (fogPlane.material as THREE.MeshBasicMaterial).opacity=.06-fi*.008;
      if(W3C)(fogPlane.material as THREE.MeshBasicMaterial).side=THREE.DoubleSide; // F03: face the corridor
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
    const sparkPoints=new THREE.Points(sparkG,new THREE.PointsMaterial({color:dlPreset.sunColor,size:.05,transparent:true,opacity:.5*dlPreset.sunIntensity,blending:THREE.AdditiveBlending,depthWrite:false}));
    scene.add(sparkPoints);
    // Portal lights — W1 (WS5-3): the portal keeps ONE warm point (light 4 of the
    // ≤4 budget, now also on mobile); fill point + spot die, the emissive
    // glow/fog planes carry the rest.
    let portalLight: THREE.PointLight | null = null;
    if(W1){
      portalLight=new THREE.PointLight(dlPreset.sunColor,1.0*dlPreset.sunIntensity,9);portalLight.position.set(0,pH/2+.5,portalZ);scene.add(portalLight);
    }else if(!isMobileGPU()){portalLight=new THREE.PointLight(dlPreset.sunColor,1.0*dlPreset.sunIntensity,9);portalLight.position.set(0,pH/2+.5,portalZ);scene.add(portalLight);
    const portalLight2=new THREE.PointLight(dlPreset.fillColor,.4*dlPreset.fillIntensity,5);portalLight2.position.set(0,.5,portalZ);scene.add(portalLight2);
    const portalSpot=new THREE.SpotLight(dlPreset.sunColor,.7*dlPreset.sunIntensity,10,Math.PI/5,.4,1);portalSpot.position.set(0,cH-.2,portalZ-.8);portalSpot.target.position.set(0,pH/2,portalZ);scene.add(portalSpot);scene.add(portalSpot.target);}
    // Invisible hitbox for click
    const portalHit=new THREE.Mesh(new THREE.BoxGeometry(pW,pH,.4),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    portalHit.position.set(0,pH/2,portalZ);scene.add(portalHit);
    if(W2){
      // W2 (WS5-7): portal label joins the Fraunces canon — ink on cream with a
      // gold hairline rule (replaces the gold-gradient Georgia canvas).
      w2Deferred.push(()=>{
        // W3C (F03/F34): gilded, and DoubleSide + faced toward the corridor so
        // the "return" label reads (the +z-facing plane was culled from the
        // player's -z viewpoint).
        const pl=makeFrauncesLabel(t("backToEntrance"),W3C?{width:2.8,height:.5,gilded:true}:{width:2.4,height:.45}) as THREE.Mesh;
        const plm=pl.material as THREE.MeshBasicMaterial;plm.polygonOffset=true;plm.polygonOffsetFactor=-1;plm.polygonOffsetUnits=-1; // (#6)
        if(W3C){plm.side=THREE.DoubleSide;pl.rotation.y=Math.PI;}
        pl.position.set(0,pH+.95,portalZ);scene.add(pl);
      });
    }else{
    // ── ENTRANCE HALL label — LARGER, GOLDEN ──
    const plC=document.createElement("canvas");plC.width=600;plC.height=80;const plx=plC.getContext("2d")!;
    // Gold gradient text background
    plx.fillStyle="rgba(0,0,0,0)";plx.fillRect(0,0,600,80);
    const textGrad=plx.createLinearGradient(0,0,600,0);
    textGrad.addColorStop(0,"#C8A040");textGrad.addColorStop(0.5,"#FFD860");textGrad.addColorStop(1,"#C8A040");
    plx.fillStyle=textGrad;plx.font="bold 36px Georgia,serif";plx.textAlign="center";plx.textBaseline="middle";
    plx.shadowColor="rgba(0,0,0,0.3)";plx.shadowBlur=8;plx.shadowOffsetY=2;
    plx.fillText(t("backToEntrance"),300,40);
    plx.shadowColor="transparent";
    // Decorative underline
    plx.strokeStyle="#D4AF37";plx.lineWidth=2;
    plx.beginPath();plx.moveTo(120,62);plx.lineTo(480,62);plx.stroke();
    const plT=new THREE.CanvasTexture(plC);plT.colorSpace=THREE.SRGBColorSpace;
    scene.add(mk(new THREE.PlaneGeometry(2.4,.36),new THREE.MeshBasicMaterial({map:plT,transparent:true}),0,pH+.95,portalZ));
    }

    // ═══ WING NAME FRESCO — DRAMATIC, on far end wall (-cL/2) ═══
    const wingLabel=(wing.nameKey?tWings(wing.nameKey):wing.name||wingId).toUpperCase();
    let frescoMesh: THREE.Mesh|null=null;
    if(W2){
      // W2 (WS5-7): restrained Fraunces wing plaque — the Georgia fresco (wing-
      // wall gradient, accent swirls, off-canon hues) dies; ink on cream.
      w2Deferred.push(()=>{
        // W3C (F34): the terminus wing plaque is the "weenie" the whole nave
        // aims at — gild it (carved gold-leaf Fraunces, hall precedent) so it
        // reads as a lit destination through the far haze, larger for legibility.
        const wf=makeFrauncesLabel(wingLabel,W3C?{width:cW*.72,height:cW*.15,gilded:true}:{width:cW*.6,height:cW*.12}) as THREE.Mesh;
        // (#6) wing plaque hangs 2cm off the end wall — offset beats far-plane precision
        const wfm=wf.material as THREE.MeshBasicMaterial;wfm.polygonOffset=true;wfm.polygonOffsetFactor=-1;wfm.polygonOffsetUnits=-1;
        wf.position.set(0,cH*(W3C?.52:.5),-cL/2+.02);scene.add(wf);
      });
      // W3C (Wave B — masterplan wow #1 "the weenie at the end of the nave"):
      // compose the end wall into a lit AEDICULA so the terminus reads as a
      // destination the whole one-point-perspective aims at. Pure geometry
      // (no GLB), no new dynamic lights (a warm additive backing glows it).
      if(W3C){
        const tz=-cL/2+0.14;                 // proud of the end wall
        const px0=cW*0.40, pilH=cH*0.78, pilR=0.19;
        for(const s of [-1,1]){
          scene.add(mk(new THREE.BoxGeometry(pilR*2+0.28,0.34,0.56),MS.pedestal,s*px0,0.17,tz));      // plinth
          scene.add(mk(new THREE.CylinderGeometry(pilR,pilR*1.12,pilH,14),MS.portalPillar,s*px0,pilH/2+0.34,tz)); // shaft
          scene.add(mk(new THREE.BoxGeometry(pilR*2+0.22,0.16,0.5),MS.gold,s*px0,pilH+0.34,tz));         // capital
        }
        const entY=pilH+0.5, entW=px0*2+pilR*2+0.7;
        scene.add(mk(new THREE.BoxGeometry(entW,0.3,0.42),MS.marble,0,entY,tz));                        // architrave
        scene.add(mk(new THREE.BoxGeometry(entW+0.3,0.1,0.5),MS.gold,0,entY+0.2,tz));                   // cornice lip
        // triangular pediment (two raking cornices meeting at the apex)
        const pedRise=entW*0.14;
        for(const s of [-1,1]){
          const rk=mk(new THREE.BoxGeometry(Math.hypot(entW/2,pedRise)+0.12,0.14,0.42),MS.marble,s*entW/4,entY+0.32+pedRise/2,tz);
          rk.rotation.z=s*(-Math.atan2(pedRise,entW/2));scene.add(rk);
        }
        scene.add(mk(new THREE.BoxGeometry(0.3,0.3,0.42),MS.gold,0,entY+0.32+pedRise,tz));              // apex acroterion
        // warm additive backing — the terminus GLOWS without a new light
        const back=new THREE.Mesh(new THREE.PlaneGeometry(px0*2-0.1,pilH*0.82),new THREE.MeshBasicMaterial({color:dlPreset.sunColor,transparent:true,opacity:0.055*dlPreset.sunIntensity,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
        back.position.set(0,cH*0.48,tz-0.03);scene.add(back);
        // marble plinth below the plaque — the wing already stands its own
        // centrepiece (potted topiary) here; the plinth gives it a base.
        scene.add(mk(new THREE.BoxGeometry(0.95,0.16,0.62),MS.pedestal,0,0.9,tz));
        scene.add(mk(new THREE.CylinderGeometry(0.3,0.36,1.4,14),MS.marble,0,1.7,tz));
        scene.add(mk(new THREE.BoxGeometry(0.8,0.14,0.56),MS.marble,0,2.46,tz));                        // plinth cap
      }
    }else{
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
    fc.fillText(wing.descKey?tWings(wing.descKey):wing.desc||"",600,235);
    const fTex=new THREE.CanvasTexture(fC);fTex.colorSpace=THREE.SRGBColorSpace;
    // Fresco plane — 80% of corridor width
    const frescoW=cW*.8,frescoH=frescoW*.3;
    // W1: fresco spot/fill die below — baked self-illumination compensates
    frescoMesh=new THREE.Mesh(new THREE.PlaneGeometry(frescoW,frescoH),new THREE.MeshStandardMaterial({map:fTex,roughness:.82,transparent:true,...(W1?{emissive:new THREE.Color("#FFFFFF"),emissiveMap:fTex,emissiveIntensity:.18}:{})}));
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
    } // end !W2 fresco branch
    // Spotlight on fresco — W1 KILL (WS5-3): baked fresco emissive above compensates
    if(!isMobileGPU()&&!W1){const fSpot=new THREE.SpotLight("#FFF5E0",1.0,10,Math.PI/4,.5,1);fSpot.position.set(0,cH-.2,-cL/2+3);fSpot.target.position.set(0,cH*.55,-cL/2);scene.add(fSpot);scene.add(fSpot.target);
    // Secondary fill light
    const fFill=new THREE.PointLight("#FFE8C0",.4,6);fFill.position.set(0,cH*.55,-cL/2+1.5);scene.add(fFill);}

    // Dust particles — duplicate raw-Points system deleted under w1_corridor
    // (WS10-3: createDustParticles below is THE one dust system per scene)
    const rdN=90;
    let rdG: THREE.BufferGeometry|null=null;
    if(!W1){
    rdG=new THREE.BufferGeometry();const rdP=new Float32Array(rdN*3);
    for(let i=0;i<rdN;i++){rdP[i*3]=(Math.random()-.5)*cW;rdP[i*3+1]=.5+Math.random()*cH;rdP[i*3+2]=(Math.random()-.5)*cL;}
    rdG.setAttribute("position",new THREE.BufferAttribute(rdP,3));
    scene.add(new THREE.Points(rdG,new THREE.PointsMaterial({color:dlPreset.sunColor,size:.035,transparent:true,opacity:.28*dlPreset.sunIntensity,blending:THREE.AdditiveBlending,depthWrite:false})));
    }

    // ── CAMERA + CONTROLS ──
    // Eye height = the single shared EYE_HEIGHT constant under w1_corridor (dogma 5)
    const camY0 = W1 ? EYE_HEIGHT : 2.0;
    const startPos = onboardingModeRef.current ? new THREE.Vector3(0, camY0, 25.5) : new THREE.Vector3(0, camY0, cL/2-1);
    camera.position.copy(startPos);
    const lookA={yaw:0,pitch:0},lookT={yaw:0,pitch:0};
    const pos=camera.position.clone(),posT=pos.clone();
    const keys: Record<string,boolean>={},drag={v:false},prev={x:0,y:0},lastRayPos={x:0,y:0};let hovDoor: string|null=null,lastCursor="";

    // ── W2 (WS5-8): DOLLY-TO-FRAME — one shared focus controller. While
    // update(dt) returns true it owns the camera (no walk/autoWalk/cinematic
    // that frame — single camera authority); any manual input cancels; a second
    // tap on the focused piece opens the existing memory flow (onPaintingClick).
    let w2Focus: FocusMode|null=null;
    let w2EnvDimmed=false;
    if(W2){
      const _fl=new THREE.Vector3();
      w2Focus=createFocusMode({
        rig:{
          getPosition:()=>pos,
          getLookAt:()=>{
            _fl.set(Math.sin(lookA.yaw)*Math.cos(lookA.pitch),Math.sin(lookA.pitch),-Math.cos(lookA.yaw)*Math.cos(lookA.pitch));
            return _fl.multiplyScalar(3).add(pos);
          },
          setPose:(p2,la)=>{
            pos.copy(p2);posT.copy(p2);
            const fdx=la.x-p2.x,fdy=la.y-p2.y,fdz=la.z-p2.z;
            const flen=Math.max(1e-4,Math.sqrt(fdx*fdx+fdy*fdy+fdz*fdz));
            const fyaw=Math.atan2(fdx,-fdz),fpitch=Math.asin(Math.max(-1,Math.min(1,fdy/flen)));
            lookT.yaw=fyaw;lookT.pitch=fpitch;lookA.yaw=fyaw;lookA.pitch=fpitch;
          },
        },
        // 15% dim (FOCUS_DIM) via hemi + env ONLY: plaster (≥0.58 rel-lum) ×0.85
        // stays ≥0.5 (dogma 1); photos/plaques are unlit MeshBasic → stay bright.
        setDimmed:(dim)=>{
          if(dim===w2EnvDimmed)return;
          w2EnvDimmed=dim;
          const f=dim?.85:1/.85;
          hemiLight.intensity*=f;
          scene.environmentIntensity*=f; // async HDRI swap may reset this mid-focus: ≤2% drift, self-heals on next undim
        },
        openMemory:()=>{onPaintingClick?.();},
        floorY:0,
      });
    }
    // W2 (WS5-9) cinematic framing: ≤6s push-in ending framed on the salon
    // section nearest the entrance (fallback = the legacy end framing).
    const w2CinStart={x:0,z:Math.min(25.5,cL/2-1.5)};
    let w2CinEnd={x:.4,z:18.2,yaw:-1.899,pitch:-.015};
    if(W2){
      let firstSec: W2Slot|null=null;
      w2Slots.forEach(sl=>{if(!firstSec||sl.secZ>firstSec.secZ)firstSec=sl;});
      if(firstSec){
        const fs=firstSec as W2Slot;
        const ex=fs.side===1?fs.wallX-2.4:fs.wallX+2.4;
        const ez=fs.secZ+.9;
        w2CinEnd={x:ex,z:ez,yaw:Math.atan2(fs.wallX-ex,-(fs.secZ-ez)),pitch:-.03};
      }
    }

    // ── DUST PARTICLES ──
    const dust=createDustParticles({count:130,bounds:{x:cW/2-.5,y:cH/2,z:cL/2},center:new THREE.Vector3(0,cH/2,-cL/2+cL/2),opacity:0.2,size:0.03});
    scene.add(dust.points);

    // ── Optimize: deduplicate materials to reduce GPU state changes ──
    optimizeMaterials(scene);

    // ── W1 (WS11-5): merge the static corridor shell per material ──
    // Runs after optimizeMaterials so deduped materials bucket together.
    // Interactive meshes (doors, painting slots, click targets), animated meshes
    // (portal glow/fog/sparkles, dust), instanced tiles and transparent/additive
    // decals are excluded — only opaque Standard/Physical direct scene children
    // merge, so every raycast/hover/applier contract is untouched while draw
    // calls collapse toward the ≤150 mobile budget.
    if(W1){
      try{
        const mergeSkip=new Set<THREE.Object3D>();
        dMeshes.forEach(d=>mergeSkip.add(d.mesh));
        paintingSlots.forEach(slot=>{mergeSkip.add(slot.canvasMesh);mergeSkip.add(slot.emptyGroup);});
        paintingClickMeshes.forEach(pm=>mergeSkip.add(pm.mesh));
        inlayClickMeshes.forEach(im=>mergeSkip.add(im));
        mergeSkip.add(portalHit);if(frescoMesh)mergeSkip.add(frescoMesh);mergeSkip.add(dust.points);
        w2Slots.forEach(sl=>mergeSkip.add(sl.secGroup));
        scene.updateMatrixWorld(true);
        const attrSig=(g: THREE.BufferGeometry)=>Object.keys(g.attributes).sort().join(",")+"|"+(g.index?"i":"n");
        const mergeBuckets=new Map<string,THREE.Mesh[]>();
        for(const child of scene.children){
          if(!(child instanceof THREE.Mesh))continue;
          const mm=child;
          if(mergeSkip.has(mm))continue;
          if(mm instanceof THREE.InstancedMesh||mm instanceof THREE.SkinnedMesh)continue;
          if(Array.isArray(mm.material))continue;
          const mat=mm.material as THREE.Material;
          if(!mat||(mat.type!=="MeshStandardMaterial"&&mat.type!=="MeshPhysicalMaterial"))continue;
          if(mat.transparent)continue;
          const ud=mm.userData||{};
          if(ud.roomId||ud.isInlay||ud.isPaintingSlot||ud.isMergedStatic)continue;
          const key=mat.uuid+"|"+attrSig(mm.geometry);
          if(!mergeBuckets.has(key))mergeBuckets.set(key,[]);
          mergeBuckets.get(key)!.push(mm);
        }
        const mergedAway: THREE.Mesh[]=[];
        let mergedCount=0,removedCount=0;
        for(const bucket of mergeBuckets.values()){
          if(bucket.length<2)continue;
          const clones=bucket.map(mm2=>{const g=mm2.geometry.clone();g.applyMatrix4(mm2.matrixWorld);return g;});
          const mergedGeo=mergeBufferGeometries(clones);
          clones.forEach(g=>g.dispose());
          if(!mergedGeo)continue;
          const mergedMesh=new THREE.Mesh(mergedGeo,bucket[0].material as THREE.Material);
          mergedMesh.castShadow=true;mergedMesh.receiveShadow=true;
          mergedMesh.userData.isMergedStatic=true;
          scene.add(mergedMesh);
          for(const mm2 of bucket){scene.remove(mm2);mergedAway.push(mm2);}
          mergedCount++;removedCount+=bucket.length;
        }
        // Dispose original geometries no longer referenced by the scene
        if(mergedAway.length){
          const liveGeos=new Set<string>();
          scene.traverse(o=>{const g=(o as THREE.Mesh).geometry;if(g)liveGeos.add(g.uuid);});
          const disposed=new Set<string>();
          for(const mm2 of mergedAway){
            const g=mm2.geometry;
            if(g&&!liveGeos.has(g.uuid)&&!disposed.has(g.uuid)){g.dispose();disposed.add(g.uuid);}
          }
        }
        if(process.env.NODE_ENV!=="production"&&mergedCount>0)console.debug(`[CorridorScene] mergeStatic: ${removedCount} meshes → ${mergedCount} merged draws`);
      }catch(e){if(process.env.NODE_ENV!=="production")console.warn("[CorridorScene] mergeStatic skipped:",e);}
    }

    // ── W2: run the deferred Basic-material builds (Fraunces lintels/portal/
    // wing plaques + the initial salon-hang apply) AFTER optimizeMaterials +
    // mergeStatic, so map-less Basic fingerprints can't dedupe labels/photos
    // onto one texture and artwork never merges away.
    if(W2)for(const fn of w2Deferred)fn();

    const clock=new THREE.Clock();
    // ── W1 tap-is-travel target (WS8-4): any-distance door/painting/portal tap
    // auto-walks (comfort-capped, easeInOutCubic arrival) then enters — the 5m
    // dead-click gate is gone. Pattern shared with the hall's awClick/startAutoWalk.
    const awClick: {id: string|null; x: number; z: number; fx: number; fz: number}={id:null,x:0,z:0,fx:0,fz:0};
    const startAutoWalk=(id: string,ax: number,az: number,fx: number,fz: number)=>{awClick.id=id;awClick.x=ax;awClick.z=az;awClick.fx=fx;awClick.fz=fz;};
    const fireAwClick=(id: string)=>{
      if(id==="__portal__")onDoorClickRef.current("__portal__");
      else if(id==="__inlay__")onInlayClick?.();
      else if(id.startsWith("paint:"))onPaintingClick?.();
      else onDoorClickRef.current(id);
    };
    // Shared W1 picker for mouse click + touch tap: nearest hit wins; near → enter
    // immediately (legacy behavior), far → walk there first.
    const w1Pick=(cx: number,cy: number)=>{
      const rect2=el.getBoundingClientRect();
      _mouse.set(((cx-rect2.left)/rect2.width)*2-1,-((cy-rect2.top)/rect2.height)*2+1);
      _rc.setFromCamera(_mouse,camera);
      const bestRef={v:null as null|{id: string;dist: number;ax: number;az: number;fx: number;fz: number}};
      const consider=(id: string,hit: THREE.Intersection|undefined,ax: number,az: number,fx2: number,fz2: number)=>{
        if(hit&&(!bestRef.v||hit.distance<bestRef.v.dist))bestRef.v={id,dist:hit.distance,ax,az,fx:fx2,fz:fz2};
      };
      dMeshes.forEach(d=>consider(d.room.id,_rc.intersectObject(d.mesh)[0],d.x-d.side*1.6,d.z,d.x,d.z));
      consider("__portal__",_rc.intersectObject(portalHit)[0],0,portalZ-2.2,0,portalZ);
      inlayClickMeshes.forEach(im=>consider("__inlay__",_rc.intersectObject(im)[0],im.position.x-Math.sign(im.position.x||1)*1.6,im.position.z,im.position.x,im.position.z));
      paintingClickMeshes.forEach(pm=>consider("paint:"+pm.slotKey,_rc.intersectObject(pm.mesh)[0],pm.mesh.position.x-Math.sign(pm.mesh.position.x||1)*1.6,pm.mesh.position.z,pm.mesh.position.x,pm.mesh.position.z));
      const b=bestRef.v;
      if(!b){
        // W2 (WS5-8): tapping empty space exits/cancels focus (handleTap(null))
        if(w2Focus&&w2Focus.state()!=="idle")w2Focus.handleTap(null);
        return false;
      }
      if(w2Focus){
        if(b.id.startsWith("paint:")){
          const tg=w2FocusTargets.get(b.id.slice(6));
          if(tg){
            // W2 (WS5-8) dolly-to-frame state machine: idle→glide→focused;
            // second tap on the same piece opens the existing memory flow.
            awClick.id=null;
            w2Focus.handleTap(tg);
            return true;
          }
          if(w2Focus.state()!=="idle")w2Focus.cancel(); // empty slot → legacy walk/open (gallery panel)
        }else if(w2Focus.state()!=="idle")w2Focus.cancel(); // door/portal tap cancels focus, then travels
      }
      if(b.dist<5)fireAwClick(b.id);
      else startAutoWalk(b.id,b.ax,b.az,b.fx,b.fz);
      return true;
    };
    const _isMobile=window.innerWidth<768||window.innerHeight<500;
    let _frameCount=0;
    let _cinStep=-1;
    let w3cCinT=0; // F04: stall-proof cinematic time (accumulated clamped dt)
    const animate=()=>{
      frameRef.current=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),t=clock.getElapsedTime();_frameCount++;
      // F04: the entry cinematic ran on absolute wall-clock — a compile stall /
      // hidden-tab pause ate seconds of the 6 s shot. Accumulate the clamped dt
      // so a stall advances the cinematic by at most 0.05 s (W3C-gated).
      if(onboardingModeRef.current)w3cCinT+=dt;
      // Framerate-independent smoothing: 1-exp(-k*dt) with k=-ln(1-f)*60, so the
      // old per-frame factors (f=.08 look, f=.1 pos) are preserved exactly at 60fps
      // and fps dips no longer add rubber-band lag (dt is clamped above).
      const kLook=1-Math.exp(-5.0029*dt),kPos=1-Math.exp(-6.3216*dt);
      lookA.yaw+=(lookT.yaw-lookA.yaw)*kLook;lookA.pitch+=(lookT.pitch-lookA.pitch)*kLook;
      // ── W2 (WS5-8) focus integrator — an externally-set autoWalk target
      // (walkthrough/nudge) takes precedence and cancels focus; otherwise while
      // update(dt) returns true, focus mode is the ONE camera authority.
      if(w2Focus&&autoWalkToRef.current&&w2Focus.state()!=="idle")w2Focus.cancel();
      const focusOwns=w2Focus?w2Focus.update(dt):false;
      // ── Onboarding cinematic: multi-step waypoint sequence ──
      // Steps: 0=initial pause 3s, 1=walk forward 3s, 2=turn left 1.5s, 3=walk left 1s,
      //        4=pause 2s, 5=walk back 2s, 6=pause 2s, 7=auto-walk to door
      // On mobile, each step gets +0.5s extra for readability
      if(onboardingModeRef.current&&!autoWalkToRef.current&&!awClick.id&&!focusOwns){
        if(W2){
          // ── W2 (WS5-9): ≤6s onboarding cinematic in the hall grammar — one
          // eased push-in past the first light band, ending framed on the
          // nearest salon artwork; ember Skip button; reduced-motion jumps
          // straight to the end framing (W1 behavior kept). onCinematicStep
          // contract intact: 0=start, 6=wait-for-Enter, 7=enter walk
          // (intermediate steps 1-5 are retired under W2).
          const ot=W3C?w3cCinT:clock.getElapsedTime();
          const CIN=6.0;
          if(reduceMotion||w2CinSkipRef.current||ot>=CIN){
            if(_cinStep!==6&&_cinStep!==7){
              _cinStep=6;onCinematicStepRef.current?.(6);
              posT.x=w2CinEnd.x;posT.z=w2CinEnd.z;lookT.yaw=w2CinEnd.yaw;lookT.pitch=w2CinEnd.pitch;
              pos.set(w2CinEnd.x,EYE_HEIGHT,w2CinEnd.z);lookA.yaw=lookT.yaw;lookA.pitch=lookT.pitch;
            }else if(_cinStep===6){
              posT.x=w2CinEnd.x;posT.z=w2CinEnd.z;lookT.yaw=w2CinEnd.yaw;lookT.pitch=w2CinEnd.pitch;
              if(corridorEnterClickedRef.current){_cinStep=7;onCinematicStepRef.current?.(7);autoWalkToRef.current="ro1";}
            }
            if(w2CinActiveRef.current){w2CinActiveRef.current=false;setW2CinActive(false);}
          }else{
            if(_cinStep!==0){_cinStep=0;onCinematicStepRef.current?.(0);}
            const p=easeInOutCubic(ot/CIN);
            posT.x=w2CinStart.x+(w2CinEnd.x-w2CinStart.x)*p;
            posT.z=w2CinStart.z+(w2CinEnd.z-w2CinStart.z)*p;
            // yaw eases in over the back ~3.6s: ≈|endYaw|/2s peak ≈ 15-45°/s — inside the comfort cap
            const yp=easeInOutCubic(Math.min(1,Math.max(0,(ot-CIN*.4)/(CIN*.6))));
            lookT.yaw=w2CinEnd.yaw*yp;lookT.pitch=w2CinEnd.pitch*yp;
          }
        }else if(reduceMotion){
          // W1 (WS12-1): reduced motion skips the forced pan/walk sequence
          // straight to its end framing (step-6 wait state) — no camera motion;
          // the user's Enter click still drives the (comfort-capped) walk.
          if(_cinStep!==6&&_cinStep!==7){
            _cinStep=6;onCinematicStepRef.current?.(6);
            posT.x=0.4;posT.z=18.2;lookT.yaw=-1.8990;lookT.pitch=-0.0150;
            pos.set(0.4,EYE_HEIGHT,18.2);lookA.yaw=lookT.yaw;lookA.pitch=lookT.pitch;
          }else if(_cinStep===6){
            posT.x=0.4;posT.z=18.2;lookT.yaw=-1.8990;lookT.pitch=-0.0150;
            if(corridorEnterClickedRef.current){_cinStep=7;onCinematicStepRef.current?.(7);autoWalkToRef.current="ro1";}
          }
        }else{
        const ot=clock.getElapsedTime();
        const d=isMobileProp?0.5:0;
        if(ot<=3.0+d){
          // Step 0: initial pause — let user take in the corridor
          if(_cinStep!==0){_cinStep=0;onCinematicStepRef.current?.(0);}
          posT.z=25.5;posT.x=0;lookT.yaw=0;lookT.pitch=0;
        }else if(ot<=6.0+d*2){
          // Step 1: walk from pos 0,2,25.5 → 0,2,16.6
          if(_cinStep!==1){_cinStep=1;onCinematicStepRef.current?.(1);}
          const dur=3.0+d;const p=Math.min((ot-(3.0+d))/dur,1);
          posT.z=25.5+(16.6-25.5)*p;
          posT.x=0;lookT.yaw=0;lookT.pitch=0;
        }else if(ot<=7.5+d*3){
          // Step 2: turn to face left wall
          if(_cinStep!==2){_cinStep=2;onCinematicStepRef.current?.(2);}
          const dur=1.5+d;const p=Math.min((ot-(6.0+d*2))/dur,1);
          const ease=p*p*(3-2*p);
          lookT.yaw=-1.5540*ease;
          lookT.pitch=-0.0930*ease;
          posT.z=16.6;posT.x=0;
        }else if(ot<=8.5+d*4){
          // Step 3: walk left to -2.1,2,16.6
          if(_cinStep!==3){_cinStep=3;onCinematicStepRef.current?.(3);}
          const dur=1.0+d;const p=Math.min((ot-(7.5+d*3))/dur,1);
          posT.x=-2.1*p;
          lookT.yaw=-1.5540;lookT.pitch=-0.0930;
        }else if(ot<=10.5+d*5){
          // Step 4: pause in front of door
          if(_cinStep!==4){_cinStep=4;onCinematicStepRef.current?.(4);}
          lookT.yaw=-1.5540;lookT.pitch=-0.0930;
        }else if(ot<=12.5+d*6){
          // Step 5: walk backwards to 0.4,2,18.2
          if(_cinStep!==5){_cinStep=5;onCinematicStepRef.current?.(5);}
          const dur=2.0+d;const p=Math.min((ot-(10.5+d*5))/dur,1);
          const ease=p*p*(3-2*p);
          posT.x=-2.1+(0.4-(-2.1))*ease;
          posT.z=16.6+(18.2-16.6)*ease;
          lookT.yaw=-1.5540+(-1.8990-(-1.5540))*ease;
          lookT.pitch=-0.0930+(-0.0150-(-0.0930))*ease;
        }else{
          // Step 6: pause — show "Enter The Room" button, wait for user click
          if(_cinStep<6){_cinStep=6;onCinematicStepRef.current?.(6);}
          if(_cinStep===6){
            posT.x=0.4;posT.z=18.2;
            lookT.yaw=-1.8990;lookT.pitch=-0.0150;
            // Step 7: user clicked "Enter Room" → auto-walk to door
            if(corridorEnterClickedRef.current){
              _cinStep=7;onCinematicStepRef.current?.(7);
              autoWalkToRef.current="ro1";
            }
          }
          // Step 7+: don't override position — let auto-walk handle movement
        }
        } // end non-reduced-motion cinematic branch
      }
      // ── Auto-walk toward target door ──
      const awTarget=autoWalkToRef.current;
      if(awTarget&&dMeshes.length>0){
        const dm=dMeshes.find((d: any)=>d.room.id===awTarget);
        if(dm){
          // F08: targetX was dm.x + dm.side*2 — for side=-1 (left wall,
          // dm.x=-cW/2) that lands 2 m BEYOND the wall, so the dist>0.5 test
          // never clears and onDoorClick never fires (input locks). Stand IN
          // FRONT of the door, toward the corridor centre.
          const targetX=W3C?dm.x-dm.side*1.7:dm.x+dm.side*2;
          const targetZ=dm.z;
          const dx2=targetX-posT.x;
          const dz2=targetZ-posT.z;
          const dist=Math.sqrt(dx2*dx2+dz2*dz2);
          if(dist>0.5){
            // W1 (WS8-1/2 mercy): autoWalk clamps to MAX_WALK_SPEED and the
            // MAX_YAW_DEG_S yaw cap — no per-scene speed numbers
            const speed=(W1?MAX_WALK_SPEED:5.0)*dt;
            posT.x+=(dx2/dist)*speed;
            posT.z+=(dz2/dist)*speed;
            const targetYaw=Math.atan2(dm.x-posT.x,-(dm.z-posT.z));
            if(W1){
              let dyaw=targetYaw-lookT.yaw;dyaw=Math.atan2(Math.sin(dyaw),Math.cos(dyaw));
              const maxYaw=MAX_YAW_DEG_S*(Math.PI/180)*dt;
              lookT.yaw+=Math.max(-maxYaw,Math.min(maxYaw,dyaw*3.6*dt));
              playFootstep();
            }else lookT.yaw+=(targetYaw-lookT.yaw)*0.06;
          }else{
            autoWalkToRef.current=null;
            onDoorClickRef.current(awTarget);
          }
        }
      }
      // ── W1 tap-is-travel integrator (WS8-4): comfort-capped walk to the tapped
      // target, easeInOutCubic deceleration into arrival, then enter ──
      if(W1&&!awTarget&&awClick.id&&!focusOwns){
        const adx=awClick.x-posT.x,adz=awClick.z-posT.z;
        const dist=Math.sqrt(adx*adx+adz*adz);
        if(dist>0.45){
          const sp=Math.max(.5,MAX_WALK_SPEED*easeInOutCubic(Math.min(1,dist/2.5)))*dt;
          posT.x+=(adx/dist)*sp;posT.z+=(adz/dist)*sp;
          const targetYaw=Math.atan2(awClick.fx-posT.x,-(awClick.fz-posT.z));
          let dyaw=targetYaw-lookT.yaw;dyaw=Math.atan2(Math.sin(dyaw),Math.cos(dyaw));
          const maxYaw=MAX_YAW_DEG_S*(Math.PI/180)*dt;
          lookT.yaw+=Math.max(-maxYaw,Math.min(maxYaw,dyaw*3.6*dt));
          playFootstep();
        }else{const id=awClick.id;awClick.id=null;fireAwClick(id);}
      }
      if(!awTarget){
      if(W1){
        // WS8-1/2 comfort caps + owner overrule 2026-08-06: sprint is BACK as
        // an explicit Shift modifier (comfort-capped SPRINT_SPEED, not the
        // legacy 9 — same pattern as the hall). Manual input cancels a pending
        // tap-travel. Footsteps while actually walking.
        const w1Spd=(keys["shift"]?SPRINT_SPEED:MAX_WALK_SPEED)*dt;
        _dir.set(0,0,0);
        if(keys.w||keys.arrowup)_dir.z-=1;if(keys.s||keys.arrowdown)_dir.z+=1;
        if(keys.a||keys.arrowleft)_dir.x-=1;if(keys.d||keys.arrowright)_dir.x+=1;
        if(_dir.length()>0){awClick.id=null;w2Focus?.cancel();_dir.normalize().multiplyScalar(w1Spd);_dir.applyAxisAngle(_yAxis,-lookA.yaw);posT.add(_dir);playFootstep();}
      }else{
      const spd=(keys["shift"]?9:3)*dt;_dir.set(0,0,0);
      if(keys.w||keys.arrowup)_dir.z-=1;if(keys.s||keys.arrowdown)_dir.z+=1;
      if(keys.a||keys.arrowleft)_dir.x-=1;if(keys.d||keys.arrowright)_dir.x+=1;
      if(_dir.length()>0){_dir.normalize().multiplyScalar(spd);_dir.applyAxisAngle(_yAxis,-lookA.yaw);posT.add(_dir);}
      }
      }
      posT.x=Math.max(-cW/2+1,Math.min(cW/2-1,posT.x));posT.z=Math.max(-cL/2+1.5,Math.min(cL/2-1.5,posT.z));
      if(W1)posT.y=EYE_HEIGHT; // dogma 5: the one shared eye height
      pos.lerp(posT,kPos);camera.position.copy(pos);
      _ld.set(Math.sin(lookA.yaw)*Math.cos(lookA.pitch),Math.sin(lookA.pitch),-Math.cos(lookA.yaw)*Math.cos(lookA.pitch));
      _lookTarget.copy(camera.position).add(_ld);camera.lookAt(_lookTarget);
      // ── Camera debug overlay ──
      if (camDebugRef.current) {
        camDebugRef.current.textContent = `yaw: ${lookA.yaw.toFixed(4)}\npitch: ${lookA.pitch.toFixed(4)}\npos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
      }
      const hlTarget=highlightDoorRef.current;
      if(W1){
        // w1_corridor (WS5-3/4): gold ring decal marks the walkthrough target —
        // no PointLight, no gold emissive pulse; hover accent is EMBER (dogma 3).
        if(w1HlRing){
          const rm=w1HlRing.material as THREE.MeshBasicMaterial;
          const hlDoor=hlTarget?dMeshes.find(d=>d.room.id===hlTarget):undefined;
          if(hlDoor){
            w1HlRing.position.set(hlDoor.x-hlDoor.side*1.2,.03,hlDoor.z);
            rm.opacity=.45+Math.sin(t*2.5)*.2;
          }else if(rm.opacity>.005)rm.opacity+=(0-rm.opacity)*.08;
        }
        dMeshes.forEach(d=>{
          const isH=hovDoor===d.room.id;
          if(isH)d.mat.emissive.set(EMBER);else d.mat.emissive.setScalar(0);
          d.mat.emissiveIntensity=isH?.12+Math.sin(t*3)*.04:0;
        });
      }else{
      dMeshes.forEach(d=>{
        if(hlTarget===d.room.id){
          // Walkthrough golden glow — strong pulse
          const pulse=0.6+Math.sin(t*2.5)*.25;
          d.mat.emissive.copy(goldColor);
          d.mat.emissiveIntensity+=(pulse-d.mat.emissiveIntensity)*.12;
        }else{
          const isH=hovDoor===d.room.id;
          if(isH)d.mat.emissive.set(wing.accent);else d.mat.emissive.setScalar(0);
          d.mat.emissiveIntensity=isH?.12+Math.sin(t*3)*.04:0;
        }
      });
      hlDoorLights.forEach((light,id)=>{
        if(hlTarget===id)light.intensity=3+Math.sin(t*2)*1.5;
        else light.intensity+=(0-light.intensity)*.05;
      });
      }
      portalGlow.material.opacity=.06+Math.sin(t*2)*.04;if(portalLight)portalLight.intensity=.9+Math.sin(t*1.5)*.2;
      // Portal sparkle animation
      const sp2=sparkG.attributes.position.array as Float32Array;
      for(let i=0;i<sparkN;i++){sp2[i*3+1]+=Math.sin(t*2+i*1.2)*.004;sp2[i*3]+=Math.cos(t*1.5+i)*.0015;}
      sparkG.attributes.position.needsUpdate=true;(sparkG.attributes.position as any).updateRange={offset:0,count:sparkN*3};
      (sparkPoints.material as THREE.PointsMaterial).opacity=.35+Math.sin(t*3)*.2;
      // Animate particles — throttle to every 2nd frame on mobile for performance
      const _doParticles=!_isMobile||(_frameCount&1)===0;
      if(_doParticles){
        // (legacy duplicate dust — only mounted when w1_corridor is off)
        if(rdG){const dp=rdG.attributes.position.array;for(let i=0;i<rdN;i++){dp[i*3+1]+=Math.sin(t*.2+i*.5)*.002;if(dp[i*3+1]>cH)dp[i*3+1]=.5;}rdG.attributes.position.needsUpdate=true;(rdG.attributes.position as any).updateRange={offset:0,count:rdN*3};}
        dust.update(t,dt);
      }
      // Skip GPU render when tab is hidden (saves CPU/GPU on mobile)
      if(document.hidden)return;
      composer.render();
      if(!readyFiredRef.current){readyFiredRef.current=true;try{onReadyRef.current?.();}catch{}}
    };animate();
    const onDown=(e: MouseEvent)=>{drag.v=false;prev.x=e.clientX;prev.y=e.clientY;};
    const onMove=(e: MouseEvent)=>{const dx=e.clientX-prev.x,dy=e.clientY-prev.y;if(Math.abs(dx)>2||Math.abs(dy)>2)drag.v=true;
      if(e.buttons===1){if(drag.v)w2Focus?.cancel();lookT.yaw-=dx*.003;lookT.pitch=Math.max(-.85,Math.min(.5,lookT.pitch+dy*.003));prev.x=e.clientX;prev.y=e.clientY;}
      const rdx=e.clientX-lastRayPos.x,rdy=e.clientY-lastRayPos.y;if(rdx*rdx+rdy*rdy<9)return;lastRayPos.x=e.clientX;lastRayPos.y=e.clientY;
      const rect=el.getBoundingClientRect();_mouse.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);_rc.setFromCamera(_mouse,camera);
      let found=null;let portalHov=false;
      dMeshes.forEach(d=>{const hits=_rc.intersectObject(d.mesh);if(hits.length>0&&hits[0].distance<5)found=d.room.id;});
      const ph2=_rc.intersectObject(portalHit);if(ph2.length>0&&ph2[0].distance<5)portalHov=true;
      let inlHov=false;
      inlayClickMeshes.forEach(im=>{const hits=_rc.intersectObject(im);if(hits.length>0&&hits[0].distance<5)inlHov=true;});
      let paintHov=false;
      paintingClickMeshes.forEach(pm=>{const hits=_rc.intersectObject(pm.mesh);if(hits.length>0)paintHov=true;});
      hovDoor=found;const newCursor=(found||portalHov||inlHov||paintHov)?"pointer":"grab";
      if(newCursor!==lastCursor){lastCursor=newCursor;el.style.cursor=newCursor;}
      onDoorHover(found||(portalHov?"__portal__":null));};
    const onCk=()=>{
      if(W1){
        // WS8-4 no-dead-clicks: fresh raycast without the 5m gate — near targets
        // enter immediately (legacy feel), far targets walk-then-enter.
        if(!drag.v)w1Pick(prev.x,prev.y);
        return;
      }
      if(!drag.v&&hovDoor)onDoorClickRef.current(hovDoor);
      else if(!drag.v){
        const rect2=el.getBoundingClientRect();_mouse.set(((prev.x-rect2.left)/rect2.width)*2-1,-((prev.y-rect2.top)/rect2.height)*2+1);_rc.setFromCamera(_mouse,camera);
        const ph3=_rc.intersectObject(portalHit);if(ph3.length>0&&ph3[0].distance<5)onDoorClickRef.current("__portal__");
        let inlHit=false;inlayClickMeshes.forEach(im=>{const h=_rc.intersectObject(im);if(h.length>0&&h[0].distance<5)inlHit=true;});
        if(inlHit){onInlayClick?.();return;}
        // Check painting slot clicks
        paintingClickMeshes.forEach(pm=>{const h=_rc.intersectObject(pm.mesh);if(h.length>0){onPaintingClick?.();}});
      }};

    const _cMap:Record<string,string>={"KeyW":"w","KeyA":"a","KeyS":"s","KeyD":"d","ShiftLeft":"shift","ShiftRight":"shift","ArrowUp":"arrowup","ArrowDown":"arrowdown","ArrowLeft":"arrowleft","ArrowRight":"arrowright"};
    const _isFormField=(e: KeyboardEvent)=>{const el2=e.target as HTMLElement|null;return !!(el2&&(el2.tagName==="INPUT"||el2.tagName==="TEXTAREA"||el2.isContentEditable));};
    const onKD=(e: KeyboardEvent)=>{if(_isFormField(e))return;const k=_cMap[e.code]||e.key.toLowerCase();keys[k]=true;if(k.startsWith("arrow"))e.preventDefault();};
    const onKU=(e: KeyboardEvent)=>{if(_isFormField(e))return;const k=_cMap[e.code]||e.key.toLowerCase();keys[k]=false;};
    el.addEventListener("mousedown",onDown);el.addEventListener("mousemove",onMove);el.addEventListener("click",onCk);
    window.addEventListener("keydown",onKD);window.addEventListener("keyup",onKU);

    // ── TOUCH SUPPORT ──
    let touchTap=true,touchLookId: number|null=null,touchMoveId: number|null=null;
    const touchMoveDir={x:0,z:0};
    const onTS=(e: TouchEvent)=>{
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];const rect=el.getBoundingClientRect();
        const rx=(t.clientX-rect.left)/rect.width,ry=(t.clientY-rect.top)/rect.height;
        if(rx<.25&&ry>.75&&touchMoveId===null&&!document.querySelector("[data-mp-joystick]")){
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
          if(Math.abs(dx)>2||Math.abs(dy)>2){drag.v=true;touchTap=false;w2Focus?.cancel();}
          lookT.yaw-=dx*.003;lookT.pitch=Math.max(-.85,Math.min(.5,lookT.pitch+dy*.003));
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
            if(W1){
              // WS8-4 tap-is-travel — same no-dead-clicks picker as mouse
              w1Pick(t.clientX,t.clientY);
            }else{
            const rect=el.getBoundingClientRect();_mouse.set(((t.clientX-rect.left)/rect.width)*2-1,-((t.clientY-rect.top)/rect.height)*2+1);
            _rc.setFromCamera(_mouse,camera);
            let found: string|null=null;
            dMeshes.forEach(d=>{const hits=_rc.intersectObject(d.mesh);if(hits.length>0&&hits[0].distance<5)found=d.room.id;});
            if(found)onDoorClickRef.current(found);
            else{
              const ph=_rc.intersectObject(portalHit);if(ph.length>0&&ph[0].distance<5)onDoorClickRef.current("__portal__");
            }
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

    return()=>{paintingsDisposed=true;applyPaintingsRef.current=null;
      if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);el.removeEventListener("mousedown",onDown);el.removeEventListener("mousemove",onMove);el.removeEventListener("click",onCk);
      window.removeEventListener("keydown",onKD);window.removeEventListener("keyup",onKU);disposeFit();
      el.removeEventListener("touchstart",onTS);el.removeEventListener("touchmove",onTM);el.removeEventListener("touchend",onTE);
      clearInterval(touchTick);
      // W2 teardown: dispose focus + salon mounts BEFORE the traverse sweep so
      // makeArtwork's shared (module-cached) frame/liner/glow materials are
      // detached from the scene and survive for other scenes/mounts.
      w2Focus?.dispose();
      w2Slots.forEach(sl=>{sl.mount?.dispose();sl.mount=null;sl.empty?.dispose();sl.empty=null;});
      w2FocusTargets.clear();
      const _cachedSet=buildCachedTextureSet();
      const _cachedMats=buildCachedMaterialSet();
      scene.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((m: any) => {
            if (_cachedMats.has(m)) return; // archetype material — programs stay warm
            if (m.map && !_cachedSet.has(m.map)) m.map.dispose();
            if (m.normalMap && !_cachedSet.has(m.normalMap)) m.normalMap.dispose();
            if (m.roughnessMap && !_cachedSet.has(m.roughnessMap)) m.roughnessMap.dispose();
            if (m.emissiveMap && !_cachedSet.has(m.emissiveMap)) m.emissiveMap.dispose();
            m.dispose();
          });
        }
      });
      releaseMaterialSet(msKey);
      dust.dispose();
      allTexSets.forEach(disposePBRSet);
      releaseEnvMap(envMapProc);
      // Release PMREM-processed HDRI (kept warm in the env-map cache for the next mount)
      if(envMapHDRI){releaseEnvMap(envMapHDRI);envMapHDRI=null;}
      composer.dispose();
      if(el.contains(ren.domElement))el.removeChild(ren.domElement);
      returnRenderer(ren);
      scene.environment=null;scene.background=null;scene.fog=null;};
  },[wingId]);
  return (
    <div style={{width:"100%",height:"100%",position:"relative"}}>
      <div ref={mountRef} role="application" aria-label={t("sceneLabel")} style={{width:"100%",height:"100%"}}/>
      {/* W2 (WS5-9): ember Skip during the 6s onboarding push-in (dogma 3 — ember is THE interactive accent) */}
      {w2CinActive&&(
        <button
          onClick={()=>{w2CinSkipRef.current=true;w2CinActiveRef.current=false;setW2CinActive(false);}}
          aria-label={t("skipIntro")}
          style={{position:"absolute",top:"1.5rem",right:"1.5rem",zIndex:30,fontFamily:"Fraunces, Georgia, serif",fontSize:"0.8125rem",fontWeight:500,color:"#FFF6EC",background:EMBER,border:"none",borderRadius:"0.5rem",padding:"0.5rem 1rem",cursor:"pointer",minHeight:"2.75rem",minWidth:"2.75rem",boxShadow:"0 0.125rem 0.5rem rgba(64,59,54,0.35)"}}
        >{t("skipIntro")}</button>
      )}
      {camDebug && createPortal(<pre ref={camDebugRef} onClick={() => { if (camDebugRef.current) navigator.clipboard.writeText(camDebugRef.current.textContent || ""); }} style={{ position: "fixed", bottom: "6rem", left: "1rem", zIndex: 99999, background: "rgba(0,0,0,0.85)", color: "#0f0", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontFamily: "monospace", fontSize: "0.8125rem", cursor: "pointer", border: "1px solid #0f03", lineHeight: 1.6, userSelect: "all" as const }} />, document.body)}
    </div>
  );
}

export default memo(CorridorScene);
