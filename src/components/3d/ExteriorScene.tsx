"use client";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";
import { createPostProcessing } from "@/lib/3d/postprocessing";
import { createExteriorEnvMap } from "@/lib/3d/environmentMaps";
import { loadHDRI, HDRI_EXTERIOR, HDRI_TUSCAN_LANDSCAPE, loadPlasterWallTextures, loadDarkWoodTextures, disposePBRSet, type PBRTextureSet } from "@/lib/3d/assetLoader";

// ═══ EXTERIOR — Fantasy Castle ═══
export default function ExteriorScene({onRoomHover,onRoomClick,hoveredRoom,wings:wingsProp,highlightDoor}: {onRoomHover: any,onRoomClick: any,hoveredRoom: any,wings?: Wing[],highlightDoor?: string|null}){
  const WINGS = wingsProp || DEFAULT_WINGS;
  const mountRef=useRef<HTMLDivElement|null>(null),frameRef=useRef<number|null>(null);
  const camO=useRef({theta:Math.PI*.25,phi:Math.PI*.28}),camOT=useRef({theta:Math.PI*.25,phi:Math.PI*.28}),camD=useRef(90);
  const drag=useRef(false),prev=useRef({x:0,y:0}),mse=useRef(new THREE.Vector2()),ray=useRef(new THREE.Raycaster());
  const hoveredRoomRef=useRef(hoveredRoom);
  const onRoomClickRef=useRef(onRoomClick);
  const highlightDoorRef=useRef(highlightDoor);

  // Keep refs in sync so event listeners always read the latest value
  useEffect(()=>{hoveredRoomRef.current=hoveredRoom;},[hoveredRoom]);
  useEffect(()=>{onRoomClickRef.current=onRoomClick;},[onRoomClick]);
  useEffect(()=>{highlightDoorRef.current=highlightDoor;},[highlightDoor]);

  useEffect(()=>{
    const el=mountRef.current;if(!el)return;let w=el.clientWidth,h=el.clientHeight;
    const scene=new THREE.Scene();scene.fog=new THREE.FogExp2("#C8B8A0",.0018);
    // ── PHOTOREALISTIC TUSCAN GOLDEN HOUR SKY ──
    const skyGeo=new THREE.SphereGeometry(500,64,40);
    const skyC=document.createElement("canvas");skyC.width=4096;skyC.height=2048;
    const skx=skyC.getContext("2d")!;
    // Base gradient — warm Tuscan golden hour with subtle atmospheric scattering
    const skyG=skx.createLinearGradient(0,0,0,2048);
    skyG.addColorStop(0,"#0D1B38");skyG.addColorStop(.04,"#152848");skyG.addColorStop(.1,"#1E3A60");
    skyG.addColorStop(.18,"#2A5078");skyG.addColorStop(.26,"#3A6890");skyG.addColorStop(.34,"#5590B0");
    skyG.addColorStop(.42,"#78B0C8");skyG.addColorStop(.5,"#98C8D8");skyG.addColorStop(.56,"#B8D8E0");
    skyG.addColorStop(.62,"#D0E0E0");skyG.addColorStop(.68,"#E0DDD0");skyG.addColorStop(.74,"#E8D4B8");
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
    scene.add(new THREE.Mesh(skyGeo,new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide})));

    const camera=new THREE.PerspectiveCamera(32,w/h,0.1,600);
    const ren=new THREE.WebGLRenderer({antialias:false,powerPreference:"high-performance"});ren.setSize(w,h);ren.setPixelRatio(Math.min(window.devicePixelRatio,2));
    ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=2.0;
    ren.outputColorSpace=THREE.SRGBColorSpace;
    el.appendChild(ren.domElement);

    // ── ENVIRONMENT MAP (IBL) — procedural immediate, real HDRI async ──
    const envMapProc=createExteriorEnvMap(ren,{sunIntensity:0.9,skyBrightness:0.7});
    scene.environment=envMapProc;
    scene.environmentIntensity=0.6;
    let envMapHDRI: THREE.Texture|null=null;
    loadHDRI(ren,HDRI_EXTERIOR).then((hdr)=>{envMapHDRI=hdr;scene.environment=hdr;scene.environmentIntensity=0.7;}).catch(()=>{});
    // Load Tuscan landscape HDRI as background panorama for photorealistic horizon
    loadHDRI(ren,HDRI_TUSCAN_LANDSCAPE).then((hdr)=>{scene.background=hdr;scene.backgroundIntensity=0.35;scene.backgroundBlurriness=0.02;}).catch(()=>{});

    // ── POST-PROCESSING (with SSAO) ──
    const composer=createPostProcessing(ren,scene,camera,"exterior");

    // ── REAL PBR TEXTURES ──
    const stoneTex=loadPlasterWallTextures([4,4]);
    const woodDoorTex=loadDarkWoodTextures([2,3]);
    const allTexSets: PBRTextureSet[]=[stoneTex,woodDoorTex];

    // Hover label overlay
    const hovLabel=document.createElement("div");
    hovLabel.style.cssText="position:absolute;display:none;pointer-events:none;z-index:10;transform:translate(-50%,-100%);font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.6),0 0 30px rgba(74,140,63,.5);padding:8px 20px;background:rgba(74,140,63,.7);border-radius:12px;backdrop-filter:blur(6px);white-space:nowrap;border:1px solid rgba(255,255,255,.2);";
    el.appendChild(hovLabel);

    // Dramatic golden-hour lighting
    scene.add(new THREE.HemisphereLight("#FFF0D8","#6A8858",0.5));
    const sun=new THREE.DirectionalLight("#FFD898",2.8);sun.position.set(40,55,25);sun.castShadow=true;
    sun.shadow.mapSize.set(4096,4096);sun.shadow.camera.near=1;sun.shadow.camera.far=200;
    sun.shadow.camera.left=-80;sun.shadow.camera.right=80;sun.shadow.camera.top=80;sun.shadow.camera.bottom=-80;sun.shadow.bias=-0.0003;scene.add(sun);
    const fill=new THREE.DirectionalLight("#B8C8E0",0.4);fill.position.set(-25,20,-15);scene.add(fill);
    const rim=new THREE.DirectionalLight("#FFE8C8",0.6);rim.position.set(-15,30,30);scene.add(rim);
    // Warm uplight for drama
    const uplight=new THREE.PointLight("#FFC880",.4,80);uplight.position.set(0,2,0);scene.add(uplight);

    const M={
      // Castle stones — warm cream/sandstone with normal maps
      stone:new THREE.MeshStandardMaterial({color:"#E8DDD0",roughness:.7,metalness:.02,map:stoneTex.map,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.4,.4),roughnessMap:stoneTex.roughnessMap,aoMap:stoneTex.aoMap,aoMapIntensity:.5,envMapIntensity:.5}),
      stoneL:new THREE.MeshStandardMaterial({color:"#F2EAE0",roughness:.65,map:stoneTex.map,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.3,.3),roughnessMap:stoneTex.roughnessMap,envMapIntensity:.5}),
      stoneW:new THREE.MeshStandardMaterial({color:"#F0E4D4",roughness:.6,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.35,.35),roughnessMap:stoneTex.roughnessMap,envMapIntensity:.5}),
      stoneD:new THREE.MeshStandardMaterial({color:"#C8B8A4",roughness:.72,metalness:.04,map:stoneTex.map,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.5,.5),roughnessMap:stoneTex.roughnessMap,aoMap:stoneTex.aoMap,aoMapIntensity:.4}),
      stoneDk:new THREE.MeshStandardMaterial({color:"#A8987C",roughness:.75,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.4,.4),roughnessMap:stoneTex.roughnessMap}),
      // Trims and gold — upgraded to Physical for reflections
      trim:new THREE.MeshStandardMaterial({color:"#D8C8B0",roughness:.45,metalness:.12,envMapIntensity:.7}),
      gold:new THREE.MeshPhysicalMaterial({color:"#C8A858",roughness:.18,metalness:.85,emissive:"#C8A858",emissiveIntensity:.12,clearcoat:.3,clearcoatRoughness:.1,envMapIntensity:1.3}),
      goldBright:new THREE.MeshPhysicalMaterial({color:"#E0C060",roughness:.12,metalness:.9,emissive:"#E0C060",emissiveIntensity:.2,clearcoat:.4,clearcoatRoughness:.08,envMapIntensity:1.5}),
      bronze:new THREE.MeshPhysicalMaterial({color:"#8A7050",roughness:.25,metalness:.7,clearcoat:.2,clearcoatRoughness:.3,envMapIntensity:1.0}),
      copper:new THREE.MeshPhysicalMaterial({color:"#6A9880",roughness:.2,metalness:.65,clearcoat:.25,clearcoatRoughness:.2,envMapIntensity:1.0}),
      // Roofs
      roof:new THREE.MeshStandardMaterial({color:"#607858",roughness:.4,metalness:.2,envMapIntensity:.4}),
      roofD:new THREE.MeshStandardMaterial({color:"#506848",roughness:.45,metalness:.18}),
      roofSlate:new THREE.MeshStandardMaterial({color:"#708068",roughness:.35,metalness:.22,envMapIntensity:.5}),
      tile:new THREE.MeshStandardMaterial({color:"#C07048",roughness:.55,metalness:.04}),
      // Architectural — columns with normal maps
      col:new THREE.MeshStandardMaterial({color:"#F0E8DC",roughness:.35,metalness:.08,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.2,.2),envMapIntensity:.6}),
      marble:new THREE.MeshPhysicalMaterial({color:"#F4EEE4",roughness:.1,metalness:.05,clearcoat:.3,clearcoatRoughness:.15,envMapIntensity:.8,reflectivity:.6}),
      marbleVein:new THREE.MeshPhysicalMaterial({color:"#E8DED0",roughness:.15,metalness:.06,clearcoat:.2,clearcoatRoughness:.2,envMapIntensity:.7}),
      // Windows — warm glow with glass physics
      win:new THREE.MeshPhysicalMaterial({color:"#FFF8E0",emissive:"#FFF0C0",emissiveIntensity:.35,roughness:.02,transparent:true,opacity:.5,transmission:.3,ior:1.5}),
      winBlue:new THREE.MeshPhysicalMaterial({color:"#C0D8F0",emissive:"#A0C0E8",emissiveIntensity:.15,roughness:.05,transparent:true,opacity:.4,transmission:.3,ior:1.5}),
      // Woodwork — with wood grain textures
      door:new THREE.MeshStandardMaterial({color:"#5A3018",roughness:.45,metalness:.05,map:woodDoorTex.map,normalMap:woodDoorTex.normalMap,normalScale:new THREE.Vector2(.4,.4),roughnessMap:woodDoorTex.roughnessMap,aoMap:woodDoorTex.aoMap,aoMapIntensity:.5}),
      doorRich:new THREE.MeshStandardMaterial({color:"#6A3820",roughness:.4,metalness:.08,map:woodDoorTex.map,normalMap:woodDoorTex.normalMap,normalScale:new THREE.Vector2(.3,.3),roughnessMap:woodDoorTex.roughnessMap,aoMap:woodDoorTex.aoMap,aoMapIntensity:.4}),
      // Nature
      grass:new THREE.MeshStandardMaterial({color:"#5A8840",roughness:.82}),
      grassL:new THREE.MeshStandardMaterial({color:"#6A9C48",roughness:.85}),
      grassD:new THREE.MeshStandardMaterial({color:"#488030",roughness:.8}),
      grassRich:new THREE.MeshStandardMaterial({color:"#4A7830",roughness:.82}),
      water:new THREE.MeshPhysicalMaterial({color:"#6898B8",roughness:.0,metalness:.1,transparent:true,opacity:.5,transmission:.4,ior:1.33,thickness:2,envMapIntensity:1.2}),
      waterDeep:new THREE.MeshPhysicalMaterial({color:"#506880",roughness:.02,metalness:.1,transparent:true,opacity:.6,transmission:.3,ior:1.33,thickness:3,envMapIntensity:1.0}),
      path:new THREE.MeshStandardMaterial({color:"#D8C8A8",roughness:.82,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.3,.3)}),
      pathD:new THREE.MeshStandardMaterial({color:"#C0B090",roughness:.78,normalMap:stoneTex.normalMap,normalScale:new THREE.Vector2(.2,.2)}),
      hedge:new THREE.MeshStandardMaterial({color:"#2A5820",roughness:.85}),
      hedgeL:new THREE.MeshStandardMaterial({color:"#3A6828",roughness:.82}),
      flower:new THREE.MeshStandardMaterial({color:"#D870A0",roughness:.8}),
      flowerY:new THREE.MeshStandardMaterial({color:"#E8C040",roughness:.8}),
      flowerW:new THREE.MeshStandardMaterial({color:"#F0E8E0",roughness:.8}),
      flowerLav:new THREE.MeshStandardMaterial({color:"#9878B8",roughness:.8}),
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

    // ── TERRAIN ──
    // Main hilltop — lush green with gentle contours
    const hillMain=new THREE.Mesh(new THREE.CylinderGeometry(85,130,14,64),M.grassL);hillMain.position.set(0,-7,0);hillMain.receiveShadow=true;scene.add(hillMain);
    const plateau=new THREE.Mesh(new THREE.CylinderGeometry(75,82,3,64),new THREE.MeshStandardMaterial({color:"#6AA050",roughness:.85}));plateau.position.set(0,-.5,0);plateau.receiveShadow=true;scene.add(plateau);
    // Cobblestone courtyard
    scene.add(mk(new THREE.CylinderGeometry(38,40,.12,48),M.pathD,0,.03,0));
    scene.add(mk(new THREE.CylinderGeometry(36,37,.08,48),M.path,0,.05,0));
    // Decorative courtyard ring
    scene.add(mk(new THREE.TorusGeometry(28,.12,8,48),M.stoneD,0,.12,0));

    const palace=new THREE.Group(),clickTargets: THREE.Mesh[]=[];
    // Track each section group for split/lift animation: {group, id, targetY, currentY, meshes}
    const sectionGroups: {group:THREE.Group,id:string,targetY:number,currentY:number,meshes:THREE.Mesh[],accent:string}[]=[];

    // ══════════════════════════════════════════
    // GRAND CENTRAL KEEP — massive multi-tiered tower
    // ══════════════════════════════════════════
    const centralGroup=new THREE.Group();
    const centralBodyMeshes: THREE.Mesh[]=[];
    const cW=20,cD=20,cH=12;

    // Stepped base plinth with beveled edges
    centralGroup.add(mk(new THREE.CylinderGeometry(16,18,1.5,8),M.stoneDk,0,.75,0));
    centralGroup.add(mk(new THREE.CylinderGeometry(14.5,16,.8,8),M.stoneD,0,1.9,0));
    centralGroup.add(mk(new THREE.BoxGeometry(cW+4,.6,cD+4),M.stone,0,2.3,0));

    // Main walls — octagonal base feel with buttresses
    centralGroup.add(mk(new THREE.BoxGeometry(cW,cH,cD),M.stone,0,cH/2+2.6,0));
    // Corner buttresses (8 at each corner)
    for(let cx=-1;cx<=1;cx+=2)for(let cz=-1;cz<=1;cz+=2){
      const bx=cx*(cW/2-.5),bz=cz*(cD/2-.5);
      centralGroup.add(mk(new THREE.BoxGeometry(1.5,cH+2,1.5),M.stoneW,bx,cH/2+2,bz));
      centralGroup.add(mk(new THREE.BoxGeometry(1.8,.4,1.8),M.trim,bx,cH+3.2,bz));
      // Pinnacle on each buttress
      centralGroup.add(mk(new THREE.ConeGeometry(.45,2,6),M.roofSlate,bx,cH+4.4,bz));
      centralGroup.add(mk(new THREE.SphereGeometry(.15,6,6),M.goldBright,bx,cH+5.5,bz));
    }

    // Horizontal stone bands for visual richness
    for(let band=0;band<3;band++){
      const by=5+band*3.5;
      centralGroup.add(mk(new THREE.BoxGeometry(cW+.5,.2,cD+.5),M.trim,0,by,0));
    }

    // Grand entablature + cornice with dentil detail
    centralGroup.add(mk(new THREE.BoxGeometry(cW+1.5,.5,cD+1.5),M.trim,0,cH+2.85,0));
    centralGroup.add(mk(new THREE.BoxGeometry(cW+2,.2,cD+2),M.gold,0,cH+3.15,0));
    // Dentil moulding
    for(let di=0;di<24;di++){
      const da=(di/24)*Math.PI*2,dr=cW/2+.8;
      centralGroup.add(mk(new THREE.BoxGeometry(.25,.25,.25),M.stoneW,Math.cos(da)*dr,cH+2.7,Math.sin(da)*dr));
    }

    // ── DRUM (octagonal gallery for dome) ──
    const drumR=9,drumH=4;
    centralGroup.add(mk(new THREE.CylinderGeometry(drumR,drumR+.5,drumH,8),M.stoneW,0,cH+3.3+drumH/2,0));
    centralGroup.add(mk(new THREE.CylinderGeometry(drumR+.6,drumR+.4,.35,8),M.trim,0,cH+3.3+drumH+.2,0));
    // Drum gallery windows (tall, Gothic)
    for(let dw=0;dw<8;dw++){
      const da=(dw/8)*Math.PI*2;
      gothicWindow(centralGroup,Math.cos(da)*(drumR+.05),cH+5.3,Math.sin(da)*(drumR+.05),da,1);
      // Pilasters between windows
      const pa=(dw/8+1/16)*Math.PI*2;
      centralGroup.add(mk(new THREE.BoxGeometry(.3,drumH-.5,.3),M.col,Math.cos(pa)*(drumR+.1),cH+3.3+drumH/2,Math.sin(pa)*(drumR+.1)));
    }

    // ── GRAND DOME ──
    const domeR=8.5;
    const dome=new THREE.Mesh(new THREE.SphereGeometry(domeR,32,24,0,Math.PI*2,0,Math.PI*.42),M.copper);
    dome.position.set(0,cH+drumH+3.6,0);dome.castShadow=true;centralGroup.add(dome);
    // Dome ribs
    for(let ri=0;ri<8;ri++){
      const ra=(ri/8)*Math.PI*2;
      for(let rj=0;rj<8;rj++){
        const phi=(rj/20)*Math.PI;
        const rx=Math.cos(ra)*(domeR+.05)*Math.sin(phi);
        const ry=domeR*Math.cos(phi);
        const rz=Math.sin(ra)*(domeR+.05)*Math.sin(phi);
        centralGroup.add(mk(new THREE.SphereGeometry(.08,4,4),M.gold,rx,cH+drumH+3.6+ry,rz));
      }
    }
    // Lantern atop dome
    centralGroup.add(mk(new THREE.CylinderGeometry(1.5,1.8,2.5,8),M.stoneW,0,cH+drumH+domeR+2.6,0));
    for(let lw=0;lw<8;lw++){
      const la=(lw/8)*Math.PI*2;
      centralGroup.add(mk(new THREE.BoxGeometry(.05,.8,.3),M.win,Math.cos(la)*1.6,cH+drumH+domeR+2.6,Math.sin(la)*1.6));
    }
    centralGroup.add(mk(new THREE.ConeGeometry(1.2,3,8),M.roof,0,cH+drumH+domeR+5.2,0));
    centralGroup.add(mk(new THREE.SphereGeometry(.35,8,8),M.goldBright,0,cH+drumH+domeR+6.9,0));
    // Cross/finial
    centralGroup.add(mk(new THREE.CylinderGeometry(.06,.06,1,6),M.goldBright,0,cH+drumH+domeR+7.6,0));
    centralGroup.add(mk(new THREE.BoxGeometry(.5,.08,.08),M.goldBright,0,cH+drumH+domeR+7.8,0));

    // ── FOUR GRAND CORNER TOWERS ──
    const towerOffset=cW/2+1.5;
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz],ti)=>{
      buildTower(centralGroup,sx*towerOffset,sz*towerOffset,2.2,cH+4,5,M.stoneL,ti%2===0?M.roof:M.roofD);
    });

    // ── GRAND PORTICO (front entrance with twin flanking towers) ──
    const pW=18,pD=7,pH=cH+2;
    // Portico platform
    centralGroup.add(mk(new THREE.BoxGeometry(pW+2,.6,pD+2),M.stoneD,0,2.3,-(cD/2+pD/2)));
    // Portico back wall
    centralGroup.add(mk(new THREE.BoxGeometry(pW,pH-2,1.2),M.stone,0,(pH-2)/2+2.6,-(cD/2+pD-.4)));
    // 12 grand columns (double row for grandeur)
    for(let row=0;row<2;row++){
      const cz=-(cD/2+1+row*(pD-2));
      for(let ci=0;ci<6;ci++){
        const cx=-pW/2+2+ci*(pW-4)/5;
        // Fluted column
        centralGroup.add(mk(new THREE.CylinderGeometry(.4,.5,pH-1,12),M.col,cx,(pH-1)/2+2.6,cz));
        // Ionic capital
        centralGroup.add(mk(new THREE.BoxGeometry(1.2,.3,1.2),M.trim,cx,pH+2.1,cz));
        centralGroup.add(mk(new THREE.BoxGeometry(1,.15,1),M.gold,cx,pH+2.3,cz));
        // Attic base
        centralGroup.add(mk(new THREE.CylinderGeometry(.55,.6,.2,12),M.stoneD,cx,2.7,cz));
      }
    }
    // Pediment — triangular with relief
    centralGroup.add(mk(new THREE.BoxGeometry(pW+2,.5,pD+1),M.trim,0,pH+2.5,-(cD/2+pD/2)));
    const pedL=mk(new THREE.BoxGeometry(pW/2+1.5,.35,pD+1.5),M.roofSlate,-(pW/4+.3),pH+3.8,-(cD/2+pD/2));pedL.rotation.z=.2;centralGroup.add(pedL);
    const pedR=mk(new THREE.BoxGeometry(pW/2+1.5,.35,pD+1.5),M.roofSlate,(pW/4+.3),pH+3.8,-(cD/2+pD/2));pedR.rotation.z=-.2;centralGroup.add(pedR);
    // Pediment acroterion (decorative finials)
    centralGroup.add(mk(new THREE.SphereGeometry(.4,8,8),M.goldBright,0,pH+4.6,-(cD/2+pD/2)));
    centralGroup.add(mk(new THREE.SphereGeometry(.3,8,8),M.goldBright,-(pW/2+.5),pH+2.8,-(cD/2+pD/2)));
    centralGroup.add(mk(new THREE.SphereGeometry(.3,8,8),M.goldBright,(pW/2+.5),pH+2.8,-(cD/2+pD/2)));
    // Entrance towers (flanking the portico)
    buildTower(centralGroup,-(pW/2+2),-(cD/2+pD/2),1.8,pH+3,4.5,M.stoneW,M.roof);
    buildTower(centralGroup,(pW/2+2),-(cD/2+pD/2),1.8,pH+3,4.5,M.stoneW,M.roof);

    // Grand entrance — double doors with elaborate surround
    centralGroup.add(mk(new THREE.BoxGeometry(5.5,7.5,.3),M.doorRich,0,6.35,-(cD/2+.1)));
    centralGroup.add(mk(new THREE.BoxGeometry(6,8,.15),M.trim,0,6.6,-(cD/2+.02)));
    centralGroup.add(mk(new THREE.BoxGeometry(6.5,.5,.2),M.gold,0,10.3,-(cD/2+.08)));
    // Door panels
    centralGroup.add(mk(new THREE.BoxGeometry(.08,7,.15),M.gold,0,6.1,-(cD/2+.25)));
    for(let dp=-1;dp<=1;dp+=2){
      centralGroup.add(mk(new THREE.BoxGeometry(2,3,.08),M.door,dp*1.3,5.1,-(cD/2+.28)));
      centralGroup.add(mk(new THREE.BoxGeometry(2,3,.08),M.door,dp*1.3,8.6,-(cD/2+.28)));
      // Door ring handles
      centralGroup.add(mk(new THREE.TorusGeometry(.2,.04,6,12),M.goldBright,dp*.8,6,-(cD/2+.32)));
    }
    // Gothic arch over door
    centralGroup.add(mk(new THREE.ConeGeometry(3.2,2.5,3),M.trim,0,11.5,-(cD/2+.05)));
    // Rose window above door
    centralGroup.add(mk(new THREE.CylinderGeometry(1.5,1.5,.1,16),M.win,0,12.5,-(cD/2+.05)));
    centralGroup.add(mk(new THREE.TorusGeometry(1.5,.08,8,16),M.gold,0,12.5,-(cD/2+.04)));
    // Window tracery
    for(let rw=0;rw<6;rw++){
      const ra=(rw/6)*Math.PI*2;
      centralGroup.add(mk(new THREE.BoxGeometry(.06,1.3,.06),M.gold,Math.cos(ra)*1,12.5+Math.sin(ra)*1,-(cD/2+.03)));
    }
    // Collect central meshes for hover/glow
    centralGroup.traverse((child: THREE.Object3D)=>{
      if(child instanceof THREE.Mesh && child.material && !(child.material as any).transparent) centralBodyMeshes.push(child);
    });
    palace.add(centralGroup);

    // ══════════════════════════════════════════
    // 5 GRAND WINGS — with towers, flying buttresses, Gothic windows
    // ══════════════════════════════════════════
    const wingDefs=[{room:WINGS[0],length:34},{room:WINGS[1],length:30},{room:WINGS[2],length:27},{room:WINGS[3],length:28},{room:WINGS[4],length:32}];
    wingDefs.forEach((def,i)=>{
      const angle=(i/5)*Math.PI*2-Math.PI/2;
      const wg=new THREE.Group();const wW=8,wH=8,wL=def.length;const roofM=i%2===0?M.roof:M.roofD;
      const wingMeshes: THREE.Mesh[]=[];
      function addM(m: any){wg.add(m);if(m.material&&!m.material.transparent)wingMeshes.push(m);return m;}

      // Connection passage with small turret
      addM(mk(new THREE.BoxGeometry(5,wH,5),M.stone,0,wH/2+2.3,-2.5));
      addM(mk(new THREE.BoxGeometry(5.5,.4,5.5),M.trim,0,wH+2.5,-2.5));

      // Wing body with deeper profile
      addM(mk(new THREE.BoxGeometry(wW,wH,wL),M.stone,0,wH/2+2.3,-(5+wL/2)));
      // Plinth
      addM(mk(new THREE.BoxGeometry(wW+2,.8,wL+1.5),M.stoneD,0,1.9,-(5+wL/2)));
      // Entablature
      addM(mk(new THREE.BoxGeometry(wW+.5,.35,wL+.5),M.trim,0,wH+2.45,-(5+wL/2)));
      addM(mk(new THREE.BoxGeometry(wW+.8,.15,wL+.7),M.gold,0,wH+2.65,-(5+wL/2)));
      // Steep pitched roof
      for(let side=-1;side<=1;side+=2){
        const rs=mk(new THREE.BoxGeometry(wW/2+1.2,.25,wL+1.2),roofM,side*(wW/4+.3),wH+3.4,-(5+wL/2));rs.rotation.z=side*0.28;addM(rs);
      }
      // Roof ridge with cresting
      addM(mk(new THREE.BoxGeometry(.25,.15,wL+.8),M.gold,0,wH+4.4,-(5+wL/2)));
      for(let ri=0;ri<Math.floor(wL/2);ri++){
        addM(mk(new THREE.ConeGeometry(.15,.4,4),M.gold,0,wH+4.65,-(5+1+ri*2)));
      }

      // GOTHIC COLONNADE with flying buttresses
      const archN=Math.floor(wL/3.2);
      for(let ai=0;ai<archN;ai++){
        const az=-(5+1.6+ai*3.2);
        for(let s=-1;s<=1;s+=2){
          const ax=s*(wW/2+.01);
          // Column
          wg.add(mk(new THREE.CylinderGeometry(.18,.25,wH-.3,10),M.col,ax,(wH-.3)/2+2.3,az));
          wg.add(mk(new THREE.BoxGeometry(.55,.25,.55),M.trim,ax,wH+1.9,az));
          // Gothic pointed arch
          if(ai<archN-1){
            wg.add(mk(new THREE.BoxGeometry(.12,1,1.8),M.trim,ax,wH+1.2,az-1.6));
            wg.add(mk(new THREE.ConeGeometry(.5,.6,3),M.trim,ax,wH+1.9,az-1.6));
          }
          // Gothic windows with tracery
          gothicWindow(wg,ax,wH*.5+2.3,az,s>0?Math.PI/2:-Math.PI/2,.85);
          // Flying buttress (every other bay)
          if(ai%2===0){
            const bx=s*(wW/2+1.5);
            wg.add(mk(new THREE.BoxGeometry(.3,wH*.5,.3),M.stoneD,bx,wH*.25+2.3,az));
            // Angled strut
            const strut=mk(new THREE.BoxGeometry(.2,.15,2.2),M.stoneD,s*(wW/2+.75),wH*.55+2.3,az);
            strut.rotation.z=s*-.3;wg.add(strut);
            // Pinnacle on buttress
            wg.add(mk(new THREE.ConeGeometry(.2,1,6),roofM,bx,wH*.5+3,az));
          }
        }
      }

      // MID-WING TOWER (turret at halfway point)
      const midZ=-(5+wL/2);
      buildTower(wg,wW/2+1.5,midZ,1.4,wH+2,3.5,M.stoneW,roofM);
      buildTower(wg,-(wW/2+1.5),midZ,1.4,wH+2,3.5,M.stoneW,roofM);

      // END PAVILION — grand terminal building with towers
      const eW=wW+5,eD=9,eH=wH+3,eZ=-(5+wL+eD/2);
      addM(mk(new THREE.BoxGeometry(eW,eH,eD),M.stoneL,0,eH/2+2.3,eZ));
      addM(mk(new THREE.BoxGeometry(eW+2,.8,eD+1.5),M.stoneD,0,1.9,eZ));
      addM(mk(new THREE.BoxGeometry(eW+.5,.35,eD+.5),M.trim,0,eH+2.45,eZ));
      addM(mk(new THREE.BoxGeometry(eW+.8,.15,eD+.7),M.gold,0,eH+2.65,eZ));
      // Pavilion roof — hipped with dormers
      for(let side=-1;side<=1;side+=2){
        const pr=mk(new THREE.BoxGeometry(eW/2+1.5,.25,eD+1),roofM,side*(eW/4+.3),eH+3.6,eZ);pr.rotation.z=side*0.22;addM(pr);
      }
      addM(mk(new THREE.BoxGeometry(.2,.15,eD+.5),M.gold,0,eH+4.5,eZ));
      // Pavilion corner turrets
      for(let tx=-1;tx<=1;tx+=2){
        buildTower(wg,tx*(eW/2+.5),eZ,1.5,eH+1,3.5,M.stoneW,roofM);
      }
      // Front colonnade
      for(let ei=0;ei<5;ei++){
        const ex=-eW/2+2+ei*(eW-4)/4;
        wg.add(mk(new THREE.CylinderGeometry(.22,.3,eH-.5,10),M.col,ex,(eH-.5)/2+2.3,eZ-eD/2-.01));
        wg.add(mk(new THREE.BoxGeometry(.6,.25,.6),M.trim,ex,eH+1.8,eZ-eD/2));
      }
      // Grand entrance with pointed arch
      wg.add(mk(new THREE.BoxGeometry(3,5,.25),M.doorRich,0,4.8,eZ-eD/2-.08));
      wg.add(mk(new THREE.BoxGeometry(3.5,5.5,.12),M.trim,0,5.05,eZ-eD/2-.04));
      wg.add(mk(new THREE.ConeGeometry(1.8,1.5,3),M.trim,0,8,eZ-eD/2-.04));
      wg.add(mk(new THREE.BoxGeometry(4,.4,.15),M.gold,0,7.3,eZ-eD/2-.06));
      // Large Gothic windows on pavilion
      for(let s=-1;s<=1;s+=2){
        for(let wi=0;wi<2;wi++){
          gothicWindow(wg,s*(eW/2+.01),eH*.4+2.3,eZ-2+wi*4,s>0?Math.PI/2:-Math.PI/2,1);
        }
        gothicWindow(wg,s*3,eH*.4+2.3,eZ-eD/2-.01,Math.PI,1);
      }

      wg.rotation.y=angle;const att=cD/2;
      wg.position.set(Math.sin(angle)*att,0,Math.cos(angle)*att);
      palace.add(wg);

      // Register this wing group for split/lift animation
      sectionGroups.push({group:wg,id:def.room.id,targetY:0,currentY:0,meshes:wingMeshes,accent:def.room.accent});

      const tLen=5+wL+eD;
      const ct=new THREE.Mesh(new THREE.BoxGeometry(eW+4,eH+6,tLen+2),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
      ct.position.set(0,eH/2+2,-(tLen+2)/2);
      ct.userData={roomId:def.room.id,wingMeshes,accent:def.room.accent};
      wg.add(ct);clickTargets.push(ct);
    });

    // ══════════════════════════════════════════
    // COURTYARD GARDENS — grand formal parterre
    // ══════════════════════════════════════════

    // Grand tiered fountain (3 levels) — moved further from palace
    const fX=0,fZ=-28;
    // Bottom basin
    scene.add(mk(new THREE.CylinderGeometry(5,5.5,1,32),M.marble,fX,.5,fZ));
    scene.add(mk(new THREE.CylinderGeometry(4.5,4.5,.15,32),M.marbleVein,fX,1.05,fZ));
    const fW1=new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.2,.08,32),M.water);fW1.position.set(fX,1.1,fZ);scene.add(fW1);
    // Middle tier
    scene.add(mk(new THREE.CylinderGeometry(1,1.4,2.5,12),M.marble,fX,2.4,fZ));
    scene.add(mk(new THREE.CylinderGeometry(2.5,2.5,.15,20),M.marbleVein,fX,3.7,fZ));
    const fW2=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,.06,20),M.water);fW2.position.set(fX,3.75,fZ);scene.add(fW2);
    // Top tier
    scene.add(mk(new THREE.CylinderGeometry(.5,.7,1.8,8),M.marble,fX,4.6,fZ));
    scene.add(mk(new THREE.CylinderGeometry(1.2,1.2,.12,12),M.marbleVein,fX,5.6,fZ));
    const fW3=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.06,12),M.water);fW3.position.set(fX,5.63,fZ);scene.add(fW3);
    // Sculptural finial
    scene.add(mk(new THREE.CylinderGeometry(.2,.3,.8,8),M.bronze,fX,6.1,fZ));
    scene.add(mk(new THREE.SphereGeometry(.3,8,8),M.goldBright,fX,6.7,fZ));

    // Symmetrical parterre gardens with flower beds
    const parterreData=[[-14,-18],[14,-18],[-14,-38],[14,-38],[-22,-28],[22,-28]];
    parterreData.forEach(([hx,hz])=>{
      // Hedge border
      scene.add(mk(new THREE.BoxGeometry(7,.9,5),M.hedge,hx,.45,hz));
      scene.add(mk(new THREE.BoxGeometry(6.5,.12,4.5),M.hedgeL,hx,.92,hz));
      // Inner flower beds (geometric)
      const flowers=[M.flower,M.flowerY,M.flowerW,M.flowerLav];
      for(let fi=0;fi<8;fi++){
        const fx=hx-2+fi*.6,fz2=hz+(fi%2?.3:-.3);
        scene.add(new THREE.Mesh(new THREE.SphereGeometry(.2+Math.random()*.12,6,6),flowers[fi%4]).translateX(fx).translateY(1+Math.random()*.08).translateZ(fz2));
      }
    });

    // Grand reflecting pool
    scene.add(mk(new THREE.BoxGeometry(5,.4,22),M.stoneD,fX,.2,fZ));
    scene.add(mk(new THREE.BoxGeometry(4,.3,.3),M.marble,fX,.38,fZ-11));
    scene.add(mk(new THREE.BoxGeometry(4,.3,.3),M.marble,fX,.38,fZ+11));
    const pool=new THREE.Mesh(new THREE.BoxGeometry(4.2,.08,21),M.waterDeep);pool.position.set(fX,.42,fZ);scene.add(pool);

    // Topiary — conical, spiral, and ball shapes
    const topPositions=[[-8,-18,"cone"],[8,-18,"cone"],[-8,-38,"ball"],[8,-38,"ball"],[-24,-18,"spiral"],[24,-18,"spiral"],[-24,-38,"cone"],[24,-38,"cone"]];
    topPositions.forEach(([tx,tz,shape]: any)=>{
      scene.add(mk(new THREE.CylinderGeometry(.12,.18,2,6),M.barkD,tx,1,tz));
      scene.add(mk(new THREE.CylinderGeometry(.5,.5,.1,10),M.stoneD,tx,.06,tz));
      if(shape==="cone"){
        scene.add(mk(new THREE.ConeGeometry(.7,2.8,8),M.hedge,tx,3.4,tz));
      }else if(shape==="ball"){
        scene.add(mk(new THREE.SphereGeometry(.8,8,8),M.hedge,tx,2.8,tz));
      }else{// spiral — cone + sphere
        scene.add(mk(new THREE.ConeGeometry(.6,2,8),M.hedge,tx,3,tz));
        scene.add(mk(new THREE.SphereGeometry(.5,8,8),M.hedgeL,tx,4.3,tz));
      }
    });

    // Stone urns on pedestals (along paths)
    for(const[ux,uz]of[[-6,-18],[6,-18],[-6,-38],[6,-38],[-18,-18],[18,-18],[-18,-38],[18,-38]]){
      scene.add(mk(new THREE.BoxGeometry(.5,.5,.5),M.marble,ux,.25,uz));
      scene.add(mk(new THREE.BoxGeometry(.6,.1,.6),M.trim,ux,.52,uz));
      scene.add(mk(new THREE.CylinderGeometry(.18,.25,.7,8),M.marble,ux,.9,uz));
      scene.add(mk(new THREE.CylinderGeometry(.12,.18,.4,8),M.bronze,ux,1.35,uz));
      // Flowers spilling from urn
      scene.add(mk(new THREE.SphereGeometry(.2,6,6),M.flowerLav,ux+.1,1.6,uz));
      scene.add(mk(new THREE.SphereGeometry(.15,6,6),M.flower,ux-.1,1.55,uz+.1));
    }

    // Stone benches
    for(const[bx,bz]of[[-11,-28],[11,-28]]){
      scene.add(mk(new THREE.BoxGeometry(2.5,.06,1),M.marble,bx,.54,bz));
      scene.add(mk(new THREE.BoxGeometry(2.5,.35,.7),M.marbleVein,bx,.18+.17,bz));
      for(const s of[-.9,.9])scene.add(mk(new THREE.BoxGeometry(.4,.35,.7),M.stoneD,bx+s,.18+.17,bz));
    }

    // Gravel paths (radiating)
    for(let pi=0;pi<25;pi++)scene.add(mk(new THREE.BoxGeometry(3.5,.05,.7),M.pathD,0,.04,-16-pi*1.3));

    // ══════════════════════════════════════════
    // ══════════════════════════════════════════════════════════
    // PHOTOREALISTIC TUSCAN LANDSCAPE — summery Val d'Orcia
    // ══════════════════════════════════════════════════════════

    // Helper: atmospheric color — objects fade to blue-golden haze with distance
    const atmosColor=(baseColor: string,dist: number)=>{
      const c=new THREE.Color(baseColor);const haze=new THREE.Color("#C8BDA0");
      const f=Math.min(1,Math.max(0,(dist-60)/400));
      c.lerp(haze,f*.65);return c;
    };

    // ── TERRAIN: Gently undulating ground plane extending to horizon ──
    // Base terrain — large ground disc
    const terrainGeo=new THREE.CylinderGeometry(500,500,2,64);
    const terrainMat=new THREE.MeshStandardMaterial({color:"#6A9848",roughness:.9});
    const terrain=new THREE.Mesh(terrainGeo,terrainMat);
    terrain.position.set(0,-1.5,0);terrain.receiveShadow=true;scene.add(terrain);

    // ── ROLLING HILLS: 5 depth layers with atmospheric perspective ──
    const hillLayers=[
      {dist:420,count:12,rMin:140,rMax:250,hMin:5,hMax:12,sat:25,light:42},// very far — hazy blue-green
      {dist:320,count:14,rMin:100,rMax:200,hMin:4,hMax:10,sat:30,light:38},// far
      {dist:230,count:16,rMin:60,rMax:140,hMin:3,hMax:8,sat:38,light:34},// mid-far
      {dist:160,count:14,rMin:40,rMax:100,hMin:2,hMax:6,sat:42,light:30},// mid
      {dist:100,count:10,rMin:30,rMax:70,hMin:1.5,hMax:4,sat:48,light:28},// near
    ];
    hillLayers.forEach(layer=>{
      for(let i=0;i<layer.count;i++){
        const angle=((i/layer.count)+Math.random()*.08)*Math.PI*2;
        const dist=layer.dist+Math.random()*50-25;
        const hx=Math.cos(angle)*dist,hz=Math.sin(angle)*dist-40;
        const hr=layer.rMin+Math.random()*(layer.rMax-layer.rMin);
        const hh=layer.hMin+Math.random()*(layer.hMax-layer.hMin);
        const hue=100+Math.random()*30;
        const col=atmosColor(`hsl(${hue},${layer.sat+Math.random()*10}%,${layer.light+Math.random()*8}%)`,dist);
        const hm=new THREE.Mesh(new THREE.SphereGeometry(hr,24,16),new THREE.MeshStandardMaterial({color:col,roughness:.88}));
        hm.position.set(hx,-hr+hh+Math.random()*2,hz);hm.scale.y=.06+Math.random()*.04;
        hm.receiveShadow=true;scene.add(hm);
      }
    });

    // ── PATCHWORK FIELDS: golden wheat, green crops, lavender, sunflowers ──
    // Realistic Tuscan agriculture — denser, more color variety, organized patches
    const fieldPalette=[
      "#C8B440","#D4C448","#B8A838","#D0BC40",// golden wheat
      "#88A830","#78A028","#90B838","#98C040",// green crops
      "#A088B8","#9878B0","#B098C0","#8878A8",// lavender
      "#D8C040","#E0C848","#C8B838","#E8D050",// sunflower gold
      "#708828","#608020","#809830","#68882A",// olive/artichoke green
      "#C0A430","#B89828","#D0B448","#A89028",// dry summer grass
    ];
    for(let fi=0;fi<120;fi++){
      const angle=Math.random()*Math.PI*2;
      const dist=80+Math.random()*340;
      const fx=Math.cos(angle)*dist,fz=Math.sin(angle)*dist-40;
      if(Math.sqrt(fx*fx+(fz+40)*(fz+40))<75)continue;
      const fw=12+Math.random()*40,fl=8+Math.random()*30;
      const fCol=atmosColor(fieldPalette[fi%fieldPalette.length],Math.sqrt(fx*fx+fz*fz));
      const fm=new THREE.Mesh(new THREE.PlaneGeometry(fw,fl),new THREE.MeshStandardMaterial({color:fCol,roughness:.88}));
      fm.rotation.x=-Math.PI/2;fm.position.set(fx,.2+Math.random()*.3,fz);fm.rotation.z=Math.random()*.5-.25;scene.add(fm);
      // Subtle field texture lines (plowing rows)
      if(Math.random()>.5){
        for(let row=0;row<Math.min(8,Math.floor(fl/3));row++){
          const rowM=new THREE.Mesh(new THREE.PlaneGeometry(fw*.9,.15),
            new THREE.MeshStandardMaterial({color:fCol.clone().multiplyScalar(.85),roughness:.9}));
          rowM.rotation.x=-Math.PI/2;rowM.position.set(fx+Math.random()*2-1,.22,fz-fl/2+row*(fl/8)+Math.random()*2);
          rowM.rotation.z=Math.random()*.5-.25;scene.add(rowM);
        }
      }
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
        const rm=mk(new THREE.BoxGeometry(.35,.7,rowLen),new THREE.MeshStandardMaterial({color:vCol,roughness:.84}),rx,.35,rz);
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
      const ch=4+Math.random()*6;
      const cCol=atmosColor(`hsl(${128+Math.random()*12},${40+Math.random()*10}%,${20+Math.random()*8}%)`,d);
      scene.add(mk(new THREE.CylinderGeometry(.1,.18,ch*.18,5),M.barkD,cx2,ch*.09,cz));
      const cone=new THREE.Mesh(new THREE.ConeGeometry(.4+Math.random()*.2,ch,6),new THREE.MeshStandardMaterial({color:cCol,roughness:.85}));
      cone.position.set(cx2,ch*.55,cz);cone.castShadow=d<150;scene.add(cone);
    });

    // ── OLIVE GROVES: silver-green, gnarled ──
    for(let oi=0;oi<40;oi++){
      const angle=Math.random()*Math.PI*2,dist=38+Math.random()*120;
      const ox=Math.cos(angle)*dist,oz=Math.sin(angle)*dist-20;
      if(Math.sqrt(ox*ox+oz*oz)<48)continue;
      const d=Math.sqrt(ox*ox+oz*oz);
      const oCol=atmosColor(`hsl(${102+Math.random()*18},${22+Math.random()*18}%,${36+Math.random()*12}%)`,d);
      scene.add(mk(new THREE.CylinderGeometry(.12,.2,2,5),M.bark,ox,1,oz));
      const cn=new THREE.Mesh(new THREE.SphereGeometry(1.8+Math.random()*.8,8,7),new THREE.MeshStandardMaterial({color:oCol,roughness:.84}));
      cn.position.set(ox,2.8+Math.random()*.3,oz);cn.scale.set(1,.4,1);cn.castShadow=d<120;scene.add(cn);
    }

    // ── STONE PINES (umbrella pines) ──
    for(let pi=0;pi<18;pi++){
      const angle=Math.random()*Math.PI*2,dist=70+Math.random()*200;
      const px=Math.cos(angle)*dist,pz=Math.sin(angle)*dist-50;
      if(Math.sqrt(px*px+(pz+50)*(pz+50))<55)continue;
      const d=Math.sqrt(px*px+pz*pz);
      const ph=5+Math.random()*4;
      const pCol=atmosColor("#3A6830",d);
      scene.add(mk(new THREE.CylinderGeometry(.18,.28,ph,6),M.bark,px,ph/2,pz));
      const canopy=new THREE.Mesh(new THREE.SphereGeometry(2.5+Math.random()*1.2,10,8),new THREE.MeshStandardMaterial({color:pCol,roughness:.82}));
      canopy.position.set(px,ph+.8,pz);canopy.scale.set(1,.28,1);canopy.castShadow=d<130;scene.add(canopy);
    }

    // ── FARMHOUSES & VILLAS: warm stone, terracotta roofs, shutters ──
    const farmPositions=[[-110,-140],[135,-120],[-55,-200],[95,-230],[-170,-110],[190,-160],[-35,-270],[65,-290],
      [-150,-195],[165,-215],[-85,-280],[105,-165],[-195,-140],[225,-110],[-125,-250],[155,-275],
      [-40,-150],[130,-190],[-90,-110],[180,-250],[-210,-200],[250,-180],[-160,-300],[200,-310]];
    farmPositions.forEach(([fx,fz])=>{
      const d=Math.sqrt(fx*fx+fz*fz);
      const fh=2+Math.random()*2.5;const fw=3.5+Math.random()*3;const fd=fw*.65+Math.random();
      const wallCol=atmosColor(`hsl(${28+Math.random()*10},${18+Math.random()*12}%,${78+Math.random()*10}%)`,d);
      // Main building
      scene.add(mk(new THREE.BoxGeometry(fw,fh,fd),new THREE.MeshStandardMaterial({color:wallCol,roughness:.78}),fx,fh/2+.3,fz));
      // Terracotta roof — slight overhang
      const roofCol=atmosColor("#C07048",d);
      const rf=mk(new THREE.BoxGeometry(fw+.8,.25,fd+.6),new THREE.MeshStandardMaterial({color:roofCol,roughness:.6}),fx,fh+.5,fz);
      rf.rotation.z=.08+Math.random()*.06;scene.add(rf);
      // Chimney
      if(Math.random()>.4){
        scene.add(mk(new THREE.BoxGeometry(.4,1.2,.4),new THREE.MeshStandardMaterial({color:wallCol,roughness:.75}),fx+fw*.3,fh+1,fz));
      }
      // Shutters (tiny boxes on walls)
      const shutterCol=atmosColor(`hsl(${140+Math.random()*40},${25+Math.random()*15}%,${30+Math.random()*15}%)`,d);
      for(let wi=0;wi<2;wi++){
        scene.add(mk(new THREE.BoxGeometry(fw*.15,.25,.03),new THREE.MeshStandardMaterial({color:shutterCol,roughness:.7}),fx-fw*.25+wi*fw*.5,fh*.6,fz+fd/2+.02));
      }
      // Extension wing on larger farms
      if(Math.random()>.55){
        const eh=fh*.7,ew=fw*.6;
        scene.add(mk(new THREE.BoxGeometry(ew,eh,fd*.8),new THREE.MeshStandardMaterial({color:wallCol,roughness:.78}),fx+fw*.5+ew*.4,eh/2+.3,fz));
        scene.add(mk(new THREE.BoxGeometry(ew+.5,.2,fd*.8+.4),new THREE.MeshStandardMaterial({color:roofCol,roughness:.6}),fx+fw*.5+ew*.4,eh+.5,fz));
      }
      // Warm window glow
      if(d<250){
        const wl=new THREE.PointLight("#FFE0A0",.15,8);wl.position.set(fx,fh*.6,fz+fd/2+1);scene.add(wl);
      }
    });

    // ── WINDING WHITE ROAD (strada bianca) ──
    for(let ri=0;ri<55;ri++){
      const rz=-42-ri*6.5;const rx=Math.sin(ri*.2)*30+Math.cos(ri*.08)*12;
      const rw=2.8+Math.sin(ri*.4)*.4;
      const d=Math.sqrt(rx*rx+rz*rz);
      const roadCol=atmosColor("#D8C8A8",d);
      scene.add(mk(new THREE.BoxGeometry(rw,.03,6),new THREE.MeshStandardMaterial({color:roadCol,roughness:.88}),rx,.12,rz));
    }

    // ── STONE BRIDGE over winding stream ──
    const bridgeZ=-85;
    scene.add(mk(new THREE.BoxGeometry(7,.35,3.5),M.stoneD,18,.75,bridgeZ));
    // Arch support
    scene.add(mk(new THREE.CylinderGeometry(.4,.5,1,8),M.stoneD,15,.5,bridgeZ));
    scene.add(mk(new THREE.CylinderGeometry(.4,.5,1,8),M.stoneD,21,.5,bridgeZ));
    // Bridge walls
    scene.add(mk(new THREE.BoxGeometry(.3,.5,3.5),M.stoneD,14.5,1.2,bridgeZ));
    scene.add(mk(new THREE.BoxGeometry(.3,.5,3.5),M.stoneD,21.5,1.2,bridgeZ));
    // Winding stream — longer, more natural
    for(let si=0;si<30;si++){
      const sx=8+si*2.5+Math.sin(si*.3)*4;const sz=bridgeZ+Math.sin(si*.35)*6-si*.5;
      const sw=new THREE.Mesh(new THREE.BoxGeometry(2.5+Math.random()*.5,.04,2.2),M.water);
      sw.position.set(sx,.12+Math.random()*.1,sz);sw.rotation.y=Math.atan2(Math.cos(si*.35)*6*.35,2.5)+Math.random()*.2;
      scene.add(sw);
    }

    // ── MEDIEVAL HILLTOP VILLAGES (2 villages for depth) ──
    [[-195,-270,20],[-280,-190,15],[250,-300,18]].forEach(([vx,vz,vr])=>{
      const d=Math.sqrt(vx*vx+vz*vz);
      const hillCol=atmosColor("#5A8040",d);
      const vh=new THREE.Mesh(new THREE.SphereGeometry(vr,14,10),new THREE.MeshStandardMaterial({color:hillCol,roughness:.86}));
      vh.position.set(vx,-(vr as number)+3,vz);vh.scale.y=.12;scene.add(vh);
      const nHouses=6+Math.floor(Math.random()*6);
      for(let hi=0;hi<nHouses;hi++){
        const hx=vx-6+Math.random()*12,hz=vz-4+Math.random()*8;
        const hh=1.2+Math.random()*1.8;
        const wCol=atmosColor("#E8D8C0",d);
        scene.add(mk(new THREE.BoxGeometry(1.5+Math.random(),hh,1.5+Math.random()),new THREE.MeshStandardMaterial({color:wCol,roughness:.72}),hx,hh/2+1.8,hz));
        scene.add(mk(new THREE.BoxGeometry(2,.12,2),new THREE.MeshStandardMaterial({color:atmosColor("#C07048",d),roughness:.6}),hx,hh+2,hz));
      }
      // Bell tower / church
      const tCol=atmosColor("#E0D0B8",d);
      scene.add(mk(new THREE.BoxGeometry(1.8,5,1.8),new THREE.MeshStandardMaterial({color:tCol,roughness:.68}),vx,4.5,vz));
      scene.add(mk(new THREE.ConeGeometry(1.2,2.5,4),new THREE.MeshStandardMaterial({color:atmosColor("#C07048",d),roughness:.6}),vx,8,vz));
    });

    // ── SUNFLOWER FIELDS: bright yellow patches ──
    for(let sf=0;sf<8;sf++){
      const angle=Math.random()*Math.PI*2,dist=100+Math.random()*180;
      const sx=Math.cos(angle)*dist,sz=Math.sin(angle)*dist-30;
      if(Math.sqrt(sx*sx+(sz+30)*(sz+30))<80)continue;
      const d=Math.sqrt(sx*sx+sz*sz);
      const sfCol=atmosColor("#E8C830",d);
      const sfm=new THREE.Mesh(new THREE.PlaneGeometry(20+Math.random()*15,15+Math.random()*10),
        new THREE.MeshStandardMaterial({color:sfCol,roughness:.82}));
      sfm.rotation.x=-Math.PI/2;sfm.position.set(sx,.25,sz);sfm.rotation.z=Math.random()*.4;scene.add(sfm);
    }

    // ── STONE WALLS: dry stone walls between fields ──
    for(let sw=0;sw<20;sw++){
      const angle=Math.random()*Math.PI*2,dist=60+Math.random()*200;
      const wx=Math.cos(angle)*dist,wz=Math.sin(angle)*dist-40;
      if(Math.sqrt(wx*wx+(wz+40)*(wz+40))<70)continue;
      const wLen=8+Math.random()*20,wAng=Math.random()*Math.PI;
      const d=Math.sqrt(wx*wx+wz*wz);
      const wCol=atmosColor("#B0A888",d);
      const wall=mk(new THREE.BoxGeometry(wLen,.5,.3),new THREE.MeshStandardMaterial({color:wCol,roughness:.9}),wx,.3,wz);
      wall.rotation.y=wAng;scene.add(wall);
    }

    // ── DISTANT MOUNTAIN RANGE (far horizon) ──
    for(let mi=0;mi<8;mi++){
      const mAngle=-Math.PI*.3+mi*.25+Math.random()*.1;
      const mDist=450+Math.random()*50;
      const mx=Math.cos(mAngle)*mDist,mz=Math.sin(mAngle)*mDist-80;
      const mr=80+Math.random()*60,mh=15+Math.random()*12;
      const mCol=atmosColor(`hsl(${210+Math.random()*20},${15+Math.random()*10}%,${55+Math.random()*10}%)`,mDist);
      const mm=new THREE.Mesh(new THREE.ConeGeometry(mr,mh,8),new THREE.MeshStandardMaterial({color:mCol,roughness:.9}));
      mm.position.set(mx,mh*.3,mz);mm.scale.set(1.5,.5,1);scene.add(mm);
    }

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

    // Subtle ground mist
    const mistN=40;
    const mistMeshes: THREE.Mesh[]=[];
    for(let i=0;i<mistN;i++){
      const mx=(Math.random()-.5)*200,mz=(Math.random()-.5)*200-30;
      const mm=new THREE.Mesh(new THREE.PlaneGeometry(15+Math.random()*15,3+Math.random()*2),
        new THREE.MeshBasicMaterial({color:"#E8E0D8",transparent:true,opacity:.04+Math.random()*.03,depthWrite:false,side:THREE.DoubleSide}));
      mm.position.set(mx,.5+Math.random(),mz);mm.rotation.x=-Math.PI/2;mm.rotation.z=Math.random()*Math.PI;
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
    // centralBodyMeshes already collected from centralGroup above
    const centralMeshes=centralBodyMeshes;
    // Register central group for split/lift animation
    sectionGroups.push({group:centralGroup,id:entranceId,targetY:0,currentY:0,meshes:centralMeshes,accent:"#E0C060"});
    // Entrance click target — sized to match just the central keep, NOT overlapping wings
    const ect=new THREE.Mesh(new THREE.CylinderGeometry(cW/2-1,cW/2-1,cH+drumH+domeR+4,8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    ect.position.set(0,(cH+drumH+domeR)/2+2,0);ect.userData={roomId:entranceId,wingMeshes:centralMeshes,accent:"#E0C060"};
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

    scene.add(palace);

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
    const animate=()=>{
      frameRef.current=requestAnimationFrame(animate);const t=clock.getElapsedTime();

      // Walkthrough highlight — pulse golden emissive on target meshes
      const hlTarget=highlightDoorRef.current;
      clickTargets.forEach((ct: any)=>{
        const active=hlTarget===ct.userData.roomId;
        const hl=hlLights.get(ct.userData.roomId);
        if(active){
          const pulse=0.15+Math.sin(t*2.5)*.1;
          ct.userData.wingMeshes.forEach((wm: any)=>{
            if(wm.material.emissive){wm.material.emissive.lerp(goldColor,.15);wm.material.emissiveIntensity+=(pulse-wm.material.emissiveIntensity)*.1;}
          });
          if(hl)hl.intensity=3+Math.sin(t*2)*1.5;
        }else{
          if(hl&&!hoveredRoomRef.current)hl.intensity+=(0-hl.intensity)*.05;
        }
      });
      camO.current.theta+=(camOT.current.theta-camO.current.theta)*.04;
      camO.current.phi+=(camOT.current.phi-camO.current.phi)*.04;
      const r=camD.current;
      camera.position.set(r*Math.sin(camO.current.phi)*Math.cos(camO.current.theta),r*Math.cos(camO.current.phi)+5,r*Math.sin(camO.current.phi)*Math.sin(camO.current.theta));
      camera.lookAt(0,8,0);

      // Animate water shimmer
      pool.material.opacity=.6+Math.sin(t*1.2)*.06;
      fW1.material.opacity=.55+Math.sin(t*1.5)*.08;
      fW2.material.opacity=.55+Math.sin(t*1.8)*.08;
      fW3.material.opacity=.55+Math.sin(t*2.1)*.06;

      // ── SECTION SPLIT / LIFT ANIMATION ──
      const anyHovered=hoveredRoomRef.current!==null;
      const greenColor=new THREE.Color("#4A8C3F");
      sectionGroups.forEach(sg=>{
        const isHov=hoveredRoomRef.current===sg.id;
        // Hovered section lifts up; others stay at 0
        sg.targetY=isHov?3.5:0;
        // Smooth lerp
        sg.currentY+=(sg.targetY-sg.currentY)*.07;
        sg.group.position.y=sg.currentY;

        // Hovered section turns green; non-hovered sections dim when something is hovered
        // Skip color/emissive changes if walkthrough is highlighting this section
        const isWtHighlight=hlTarget===sg.id;
        sg.meshes.forEach((wm: any)=>{
          if(!wm.material||wm.material.transparent)return;
          const mat=wm.material as THREE.MeshStandardMaterial;
          // Store original color once
          if(!wm.userData._origColor){
            wm.userData._origColor=mat.color.clone();
          }
          if(isWtHighlight){
            // Walkthrough golden glow — strong pulse
            mat.color.lerp(wm.userData._origColor,.06);
            mat.emissive.lerp(goldColor,.12);
            mat.emissiveIntensity+=(0.4+Math.sin(t*2.5)*.2-mat.emissiveIntensity)*.1;
          }else if(isHov){
            // Tint green
            mat.color.lerp(greenColor,.08);
            mat.emissive.lerp(greenColor,.1);
            mat.emissiveIntensity+=(0.3-mat.emissiveIntensity)*.08;
          }else if(anyHovered){
            // Dim non-hovered
            const darkened=wm.userData._origColor.clone().multiplyScalar(0.5);
            mat.color.lerp(darkened,.08);
            mat.emissive.lerp(new THREE.Color(0,0,0),.1);
            mat.emissiveIntensity+=(0-mat.emissiveIntensity)*.06;
          }else if(hlTarget){
            // Walkthrough active but this isn't the target — dim it
            const darkened=wm.userData._origColor.clone().multiplyScalar(0.6);
            mat.color.lerp(darkened,.04);
            mat.emissive.lerp(new THREE.Color(0,0,0),.1);
            mat.emissiveIntensity+=(0-mat.emissiveIntensity)*.06;
          }else{
            // Restore to original
            mat.color.lerp(wm.userData._origColor,.06);
            mat.emissive.lerp(new THREE.Color(0,0,0),.1);
            mat.emissiveIntensity+=(0-mat.emissiveIntensity)*.06;
          }
        });
      });

      // ── HOVER LABEL — project hovered section's world position to screen ──
      if(hovLabel&&camera){
        const hovId=hoveredRoomRef.current;
        if(hovId){
          const sg=sectionGroups.find(s=>s.id===hovId);
          if(sg){
            const wp=new THREE.Vector3();
            sg.group.getWorldPosition(wp);
            wp.y+=sg.id==="__entrance__"?25:18;
            const projected=wp.clone().project(camera);
            const sx=(projected.x*.5+.5)*w;
            const sy=(-(projected.y)*.5+.5)*h;
            hovLabel.style.display="block";
            hovLabel.style.left=sx+"px";
            hovLabel.style.top=sy+"px";
            // Find wing name
            const wingDef=WINGS.find((wi: any)=>wi.id===hovId);
            hovLabel.textContent=wingDef?`${wingDef.icon} ${wingDef.name}`:hovId==="__entrance__"?"Entrance Hall":"";
          }
        }else{
          hovLabel.style.display="none";
        }
      }

      // Wing hover glow — emissive body + accent point light + window brightening
      const warmGlow=new THREE.Color("#FFE8B0");
      clickTargets.forEach((ct: any)=>{
        const isHov=hoveredRoomRef.current===ct.userData.roomId;
        const isWtHl=hlTarget===ct.userData.roomId;
        const accentColor=new THREE.Color(ct.userData.accent);
        // Smooth emissive glow on wing body meshes (skip cloned window mats + walkthrough highlighted)
        const winSet=wingWindowMats.get(ct.userData.roomId);
        const winMeshSet=new Set(winSet?.map(e=>e.mesh));
        ct.userData.wingMeshes.forEach((wm: any)=>{
          if(winMeshSet?.has(wm))return;// handled separately
          if(isWtHl)return;// walkthrough glow handled above
          if(wm.material.emissive){
            if(isHov){wm.material.emissive.lerp(accentColor,.12);wm.material.emissiveIntensity+=(0.22-wm.material.emissiveIntensity)*.08;}
            else{wm.material.emissiveIntensity+=(0-wm.material.emissiveIntensity)*.06;}
          }
        });
        // Window glow — cloned materials, independent per wing
        if(winSet){
          winSet.forEach(({cloned,baseIntensity})=>{
            const targetI=isHov?baseIntensity+0.85:baseIntensity;
            cloned.emissiveIntensity+=(targetI-cloned.emissiveIntensity)*.08;
            if(isHov){
              cloned.emissive.lerp(warmGlow,.12);
              cloned.opacity+=(0.88-cloned.opacity)*.08;
            }else{
              cloned.emissive.lerp(new THREE.Color("#FFF0C0"),.04);
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

      composer.render();
    };animate();

    const onDown=(e: MouseEvent)=>{drag.current=false;prev.current={x:e.clientX,y:e.clientY};};
    const onMove=(e: MouseEvent)=>{const dx=e.clientX-prev.current.x,dy=e.clientY-prev.current.y;if(Math.abs(dx)>3||Math.abs(dy)>3)drag.current=true;
      if(e.buttons===1){camOT.current.theta-=dx*.004;camOT.current.phi=Math.max(.08,Math.min(Math.PI*.44,camOT.current.phi+dy*.004));prev.current={x:e.clientX,y:e.clientY};}
      const rect=el.getBoundingClientRect();mse.current.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
      ray.current.setFromCamera(mse.current,camera);const hits=ray.current.intersectObjects(clickTargets);onRoomHover(hits.length>0?hits[0].object.userData.roomId:null);};
    const onCk=(e: MouseEvent)=>{if(drag.current)return;const rect=el.getBoundingClientRect();mse.current.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
      ray.current.setFromCamera(mse.current,camera);const hits=ray.current.intersectObjects(clickTargets);if(hits.length>0)onRoomClickRef.current(hits[0].object.userData.roomId);};
    const onWh=(e: WheelEvent)=>{camD.current=Math.max(40,Math.min(180,camD.current+e.deltaY*.05));};
    const onRs=()=>{w=el.clientWidth;h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();ren.setSize(w,h);composer.setSize(w,h);};
    el.addEventListener("mousedown",onDown);el.addEventListener("mousemove",onMove);el.addEventListener("click",onCk);el.addEventListener("wheel",onWh,{passive:true});window.addEventListener("resize",onRs);

    // ── TOUCH SUPPORT ──
    let touchStartDist=0,touchStartCamD=camD.current,touchTap=true;
    const onTS=(e: TouchEvent)=>{
      if(e.touches.length===1){const t=e.touches[0];drag.current=false;prev.current={x:t.clientX,y:t.clientY};touchTap=true;}
      if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;touchStartDist=Math.hypot(dx,dy);touchStartCamD=camD.current;touchTap=false;}
    };
    const onTM=(e: TouchEvent)=>{
      e.preventDefault();
      if(e.touches.length===1){const t=e.touches[0];const dx=t.clientX-prev.current.x,dy=t.clientY-prev.current.y;
        if(Math.abs(dx)>3||Math.abs(dy)>3){drag.current=true;touchTap=false;}
        camOT.current.theta-=dx*.004;camOT.current.phi=Math.max(.08,Math.min(Math.PI*.44,camOT.current.phi+dy*.004));prev.current={x:t.clientX,y:t.clientY};
      }
      if(e.touches.length===2){const dx=e.touches[0].clientX-e.touches[1].clientX,dy=e.touches[0].clientY-e.touches[1].clientY;
        const dist=Math.hypot(dx,dy);if(touchStartDist>0){camD.current=Math.max(40,Math.min(180,touchStartCamD*(touchStartDist/dist)));}
      }
    };
    const onTE=(e: TouchEvent)=>{
      if(touchTap&&e.changedTouches.length===1){const tc=e.changedTouches[0];const rect=el.getBoundingClientRect();
        mse.current.set(((tc.clientX-rect.left)/rect.width)*2-1,-((tc.clientY-rect.top)/rect.height)*2+1);
        ray.current.setFromCamera(mse.current,camera);const hits=ray.current.intersectObjects(clickTargets);
        if(hits.length>0){const hitId=hits[0].object.userData.roomId;onRoomHover(hitId);
          // Brief delay so the lift animation is visible before navigating
          setTimeout(()=>onRoomClickRef.current(hitId),250);
        }
      }
    };
    el.addEventListener("touchstart",onTS,{passive:true});el.addEventListener("touchmove",onTM,{passive:false});el.addEventListener("touchend",onTE,{passive:true});

    return()=>{if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);el.removeEventListener("mousedown",onDown);el.removeEventListener("mousemove",onMove);el.removeEventListener("click",onCk);el.removeEventListener("wheel",onWh);window.removeEventListener("resize",onRs);
      el.removeEventListener("touchstart",onTS);el.removeEventListener("touchmove",onTM);el.removeEventListener("touchend",onTE);
      if(el.contains(hovLabel))el.removeChild(hovLabel);
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
      allTexSets.forEach(disposePBRSet);
      envMapProc.dispose();
      if(envMapHDRI)envMapHDRI.dispose();
      composer.dispose();
      if(el.contains(ren.domElement))el.removeChild(ren.domElement);ren.dispose();};
  },[]);
  return <div ref={mountRef} style={{width:"100%",height:"100%",cursor:hoveredRoom?"pointer":"grab"}}/>;
}
