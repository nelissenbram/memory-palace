"use client";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing } from "@/lib/constants/wings";
import { paintTex } from "@/lib/3d/textureHelpers";
import { mk } from "@/lib/3d/meshHelpers";
import { layoutForRoom } from "@/lib/3d/roomLayouts";

// ═══ ROOM INTERIOR — cosy personal den with media stations ═══
// Every room has ALL memory furniture: bookshelf, low table, desk, painting
// wall, screen, vinyl player, vitrine, orbs. Layout varies size & décor.
export default function InteriorScene({roomId,actualRoomId,layoutOverride,memories,onMemoryClick,wingData:wingDataProp}: {roomId: any,actualRoomId?: string,layoutOverride?: string,memories: any,onMemoryClick: any,wingData?: Wing}){
  const mountRef=useRef<HTMLDivElement|null>(null),frameRef=useRef<number|null>(null);
  const lookA=useRef({yaw:0,pitch:0}),lookT=useRef({yaw:0,pitch:0});
  const pos=useRef(new THREE.Vector3()),posT=useRef(new THREE.Vector3());
  const keys=useRef<Record<string,boolean>>({}),drag=useRef(false),prev=useRef({x:0,y:0}),hovMem=useRef<any>(null),memMeshes=useRef<THREE.Mesh[]>([]);
  const videoElRef=useRef<HTMLVideoElement|null>(null),audioElRef=useRef<HTMLAudioElement|null>(null);
  const volOverride=useRef<{video:number|null,audio:number|null}>({video:null,audio:null});
  const vidAnimEntry=useRef<any>(null); // ref to the animTex video entry for track switching
  const [showMedia,setShowMedia]=useState({video:false,audio:false});
  const [vidState,setVidState]=useState({playing:false,loop:true,time:0,duration:0,volume:0});
  const [audState,setAudState]=useState({playing:false,loop:true,time:0,duration:0,volume:0});
  const [vidIdx,setVidIdx]=useState(0);
  const [audIdx,setAudIdx]=useState(0);
  const allVideoMems=useRef<any[]>([]);
  const allAudioMems=useRef<any[]>([]);
  const wing=wingDataProp||DEFAULT_WINGS.find(r=>r.id===roomId),mems=memories||[];

  useEffect(()=>{
    const el=mountRef.current;if(!el)return;let w=el.clientWidth,h=el.clientHeight;
    const layout=layoutForRoom(actualRoomId||roomId,layoutOverride);
    const scene=new THREE.Scene();scene.background=new THREE.Color("#D8CFC0");
    const camera=new THREE.PerspectiveCamera(58,w/h,0.1,60);
    const ren=new THREE.WebGLRenderer({antialias:true});ren.setSize(w,h);ren.setPixelRatio(Math.min(window.devicePixelRatio,2));
    ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.6;
    el.appendChild(ren.domElement);
    scene.add(new THREE.HemisphereLight("#FFF2E0","#C4B8A0",.4));
    const sun=new THREE.DirectionalLight("#FFE8C0",1.1);sun.position.set(10,14,-4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);
    const ambL=new THREE.PointLight("#FFD8A0",.3,15);ambL.position.set(0,4,0);scene.add(ambL);

    const MS={
      wall:new THREE.MeshStandardMaterial({color:wing?.wall||"#DDD4C6",roughness:.88}),
      floor:new THREE.MeshStandardMaterial({color:"#8A7358",roughness:.45,metalness:.1}),
      floorL:new THREE.MeshStandardMaterial({color:"#B8A480",roughness:.5}),
      ceil:new THREE.MeshStandardMaterial({color:"#F0EAE0",roughness:.95}),
      trim:new THREE.MeshStandardMaterial({color:"#CFC3AE",roughness:.55,metalness:.12}),
      gold:new THREE.MeshStandardMaterial({color:"#C8A868",roughness:.28,metalness:.6}),
      dkW:new THREE.MeshStandardMaterial({color:"#3E2A18",roughness:.5,metalness:.08}),
      ltW:new THREE.MeshStandardMaterial({color:"#A08060",roughness:.55}),
      wain:new THREE.MeshStandardMaterial({color:"#B8A890",roughness:.65}),
      leather:new THREE.MeshStandardMaterial({color:"#5A3020",roughness:.55,metalness:.05}),
      leatherD:new THREE.MeshStandardMaterial({color:"#4A2818",roughness:.5,metalness:.04}),
      button:new THREE.MeshStandardMaterial({color:"#3A1E10",roughness:.3,metalness:.1}),
      bronze:new THREE.MeshStandardMaterial({color:"#8A7050",roughness:.32,metalness:.48}),
      marble:new THREE.MeshStandardMaterial({color:"#E8E2DA",roughness:.22,metalness:.06}),
      brick:new THREE.MeshStandardMaterial({color:"#8A5040",roughness:.9}),
      brickD:new THREE.MeshStandardMaterial({color:"#6A3830",roughness:.85}),
      iron:new THREE.MeshStandardMaterial({color:"#3A3A3A",roughness:.5,metalness:.4}),
      fire:new THREE.MeshBasicMaterial({color:"#FF8030",transparent:true,opacity:.7}),
      fireG:new THREE.MeshBasicMaterial({color:"#FFD060",transparent:true,opacity:.5}),
      rug:new THREE.MeshStandardMaterial({color:"#6A2028",roughness:.9}),
      rugB:new THREE.MeshStandardMaterial({color:"#C8A868",roughness:.8}),
      rugN:new THREE.MeshStandardMaterial({color:"#1A2438",roughness:.9}),
      sconce:new THREE.MeshStandardMaterial({color:"#C8A858",roughness:.28,metalness:.55}),
      glassG:new THREE.MeshStandardMaterial({color:"#FFF8E0",emissive:"#FFE8B0",emissiveIntensity:.5,transparent:true,opacity:.6}),
      screen:new THREE.MeshStandardMaterial({color:"#1A1A1A",roughness:.3,metalness:.1}),
      vinyl:new THREE.MeshStandardMaterial({color:"#1A1A1A",roughness:.15,metalness:.3}),
      vinylL:new THREE.MeshStandardMaterial({color:wing?.accent||"#C17F59",roughness:.3}),
      pot:new THREE.MeshStandardMaterial({color:"#B8926A",roughness:.6}),
      plant:new THREE.MeshStandardMaterial({color:"#4A7838",roughness:.85}),
      curtain:new THREE.MeshStandardMaterial({color:"#8A6848",roughness:.95,side:THREE.DoubleSide}),
      fG:new THREE.MeshStandardMaterial({color:"#B89850",roughness:.28,metalness:.65}),
      fB:new THREE.MeshStandardMaterial({color:"#7A6040",roughness:.38,metalness:.5}),
      matF:new THREE.MeshStandardMaterial({color:"#F2EDE4",roughness:.95}),
      lamp:new THREE.MeshStandardMaterial({color:"#E8D8C0",roughness:.7,transparent:true,opacity:.8}),
      lampG:new THREE.MeshBasicMaterial({color:"#FFF0D0",transparent:true,opacity:.15}),
      handle:new THREE.MeshStandardMaterial({color:"#C8A858",roughness:.22,metalness:.65}),
      glass:new THREE.MeshStandardMaterial({color:"#E8F0F0",transparent:true,opacity:.2,roughness:.05,metalness:.1}),
    };
    const fMats=[MS.fG,MS.fB,MS.gold];
    memMeshes.current=[];
    const animTex: any[]=[];

    const rW=layout.rW,rL=layout.rL,rH=layout.rH;

    // ═══════════════════════════════════════════
    // SHELL: floor, ceiling, walls, wainscoting
    // ═══════════════════════════════════════════
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

    // ═══════════════════════════════════════════
    // FIREPLACE (back wall center)
    // ═══════════════════════════════════════════
    const fpX=0,fpZ=-rL/2+.3;
    scene.add(mk(new THREE.BoxGeometry(2.8,.12,.5),MS.marble,fpX,1.3,fpZ));
    scene.add(mk(new THREE.BoxGeometry(2.6,.08,.4),MS.gold,fpX,1.24,fpZ+.02));
    scene.add(mk(new THREE.BoxGeometry(1.6,1.1,.3),MS.brickD,fpX,.55,fpZ));
    scene.add(mk(new THREE.BoxGeometry(.2,1.1,.3),MS.brick,fpX-.9,.55,fpZ));
    scene.add(mk(new THREE.BoxGeometry(.2,1.1,.3),MS.brick,fpX+.9,.55,fpZ));
    scene.add(mk(new THREE.BoxGeometry(2,.18,.3),MS.brick,fpX,1.19,fpZ));
    scene.add(mk(new THREE.BoxGeometry(2.6,.06,.6),MS.marble,fpX,.03,fpZ+.15));
    const fireL=new THREE.PointLight("#FF8030",.6,5);fireL.position.set(fpX,.5,fpZ+.2);scene.add(fireL);
    animTex.push({type:"fire",light:fireL});
    for(let l=0;l<3;l++){const log=mk(new THREE.CylinderGeometry(.06,.07,.5+Math.random()*.3,6),MS.dkW,fpX-.25+l*.25,.12,fpZ+.1);log.rotation.z=Math.PI/2+Math.random()*.2;scene.add(log);}
    for(let f=0;f<5;f++){const fl2=new THREE.Mesh(new THREE.ConeGeometry(.06+Math.random()*.04,.2+Math.random()*.15,4),f%2?MS.fire:MS.fireG);fl2.position.set(fpX-.2+f*.1,.2+Math.random()*.1,fpZ+.1);animTex.push({type:"flame",mesh:fl2,baseY:.2+Math.random()*.1,phase:Math.random()*6});scene.add(fl2);}
    scene.add(mk(new THREE.BoxGeometry(2.4,rH-1.3,.08),MS.wall,fpX,1.3+(rH-1.3)/2,fpZ-.02));
    scene.add(mk(new THREE.BoxGeometry(.2,.3,.12),MS.bronze,fpX,1.45,fpZ+.15));
    scene.add(mk(new THREE.CylinderGeometry(.12,.12,.02,16),MS.gold,fpX,1.62,fpZ+.15));

    // ═══════════════════════════════════════════
    // CHESTERFIELD SOFA (center-right area, facing fireplace)
    // ═══════════════════════════════════════════
    const sofaZ=rL/2-3.5;
    scene.add(mk(new THREE.BoxGeometry(2.4,.35,.9),MS.leather,0,.175,sofaZ));
    scene.add(mk(new THREE.BoxGeometry(2.4,.55,.12),MS.leatherD,0,.55,sofaZ+.39));
    for(let s=-1;s<=1;s+=2)scene.add(mk(new THREE.BoxGeometry(.14,.45,.8),MS.leatherD,s*1.13,.35,sofaZ));
    for(let bx=-3;bx<=3;bx++)for(let by=0;by<2;by++){scene.add(mk(new THREE.SphereGeometry(.02,6,6),MS.button,bx*.3,.45+by*.18,sofaZ+.44));}
    for(let lx of[-1,1])for(let lz of[-1,1])scene.add(mk(new THREE.SphereGeometry(.04,6,6),MS.dkW,lx*1,.04,sofaZ+lz*.35));
    scene.add(mk(new THREE.BoxGeometry(.45,.22,.35),new THREE.MeshStandardMaterial({color:"#8A5838",roughness:.8}),-0.7,.48,sofaZ-.15));
    scene.add(mk(new THREE.BoxGeometry(.4,.2,.32),new THREE.MeshStandardMaterial({color:wing?.accent||"#C17F59",roughness:.85}),.8,.46,sofaZ-.12));

    // ═══════════════════════════════════════════
    // ARMCHAIRS (flanking fireplace)
    // ═══════════════════════════════════════════
    for(let s=-1;s<=1;s+=2){
      const ax=s*Math.min(3.5,rW/2-2.5),az=fpZ+2.5;
      scene.add(mk(new THREE.BoxGeometry(1,.3,.8),MS.leather,ax,.15,az));
      scene.add(mk(new THREE.BoxGeometry(1,.45,.1),MS.leatherD,ax,.45,az+.35));
      for(let as=-1;as<=1;as+=2)scene.add(mk(new THREE.BoxGeometry(.12,.35,.7),MS.leatherD,ax+as*.44,.3,az));
      for(let abx of[-1,1])for(let abz of[-1,1])scene.add(mk(new THREE.SphereGeometry(.03,6,6),MS.dkW,ax+abx*.4,.03,az+abz*.3));
    }

    // ═══════════════════════════════════════════
    // COFFEE TABLE / LOW TABLE (between sofa and fireplace)
    // ═══════════════════════════════════════════
    const ctZ=sofaZ-1.7;
    scene.add(mk(new THREE.BoxGeometry(1.2,.04,.6),MS.dkW,0,.52,ctZ));
    for(let cx of[-1,1])for(let cz of[-1,1])scene.add(mk(new THREE.CylinderGeometry(.03,.03,.5,6),MS.dkW,cx*.5,.25,ctZ+cz*.22));
    scene.add(mk(new THREE.BoxGeometry(1.1,.02,.5),MS.gold,0,.54,ctZ));

    // ═══════════════════════════════════════════
    // WRITING DESK / SCRIBE TABLE (front-left corner, facing back wall)
    // ═══════════════════════════════════════════
    const dkX=-rW/2+1.8, dkZ=rL/2-2.2;
    scene.add(mk(new THREE.BoxGeometry(1.6,.06,.75),MS.dkW,dkX,.78,dkZ));
    for(let dx of[-1,1])for(let dz of[-1,1])scene.add(mk(new THREE.CylinderGeometry(.035,.04,.75,8),MS.dkW,dkX+dx*.65,.38,dkZ+dz*.28));
    // Drawer fronts + handles
    for(let dd=-1;dd<=1;dd+=2){scene.add(mk(new THREE.BoxGeometry(.5,.1,.02),MS.ltW,dkX+dd*.4,.7,dkZ+.37));scene.add(mk(new THREE.CylinderGeometry(.012,.012,.06,6),MS.bronze,dkX+dd*.4,.7,dkZ+.39));}
    // Desktop items: inkwell, small book stack
    scene.add(mk(new THREE.CylinderGeometry(.035,.04,.05,8),MS.iron,dkX-.5,.82,dkZ-.1));
    scene.add(mk(new THREE.BoxGeometry(.22,.06,.15),MS.leatherD,dkX+.35,.82,dkZ-.12));
    scene.add(mk(new THREE.BoxGeometry(.2,.05,.14),new THREE.MeshStandardMaterial({color:"#5A4A38",roughness:.8}),dkX+.35,.86,dkZ-.12));
    // Desk chair
    const chZ=dkZ+.7;
    scene.add(mk(new THREE.BoxGeometry(.48,.04,.45),MS.dkW,dkX,.46,chZ));
    scene.add(mk(new THREE.BoxGeometry(.48,.4,.04),MS.dkW,dkX,.66,chZ+.2));
    for(let cx2 of[-1,1])for(let cz2 of[-1,1])scene.add(mk(new THREE.CylinderGeometry(.022,.022,.43,6),MS.dkW,dkX+cx2*.18,.23,chZ+cz2*.17));
    // Desk lamp
    scene.add(mk(new THREE.CylinderGeometry(.03,.05,.3,6),MS.bronze,dkX-.6,.93,dkZ-.15));
    const dkShade=mk(new THREE.CylinderGeometry(.05,.09,.12,8,1,true),MS.lamp,dkX-.6,1.12,dkZ-.15);scene.add(dkShade);
    const dkLight=new THREE.PointLight("#FFE8C0",.25,3);dkLight.position.set(dkX-.6,1.15,dkZ-.15);scene.add(dkLight);
    // Clickable hit area for desk (opens upload when empty — placed after memory routing below)

    // ═══════════════════════════════════════════
    // MEMORY PLACEMENT — type routing
    // Only show memories marked for display (or first N if no flag set)
    // ═══════════════════════════════════════════
    const DISPLAY_LIMITS: Record<string,number>={photo:5,painting:1,album:3,video:1,orb:4,case:3,audio:1,document:4};
    const filterDisplayed=(type: string)=>{
      const all=mems.filter((m: any)=>m.type===type);
      const explicit=all.filter((m: any)=>m.displayed===true);
      const unmarked=all.filter((m: any)=>m.displayed===undefined||m.displayed===null);
      const hidden=all.filter((m: any)=>m.displayed===false);
      const limit=DISPLAY_LIMITS[type]||4;
      // If any have explicit displayed flag, use those; else use first N
      if(explicit.length>0||hidden.length>0) return explicit.slice(0,limit);
      return unmarked.slice(0,limit);
    };
    const photoMems=filterDisplayed("photo");
    const paintingMems=filterDisplayed("painting");
    const albumMems=filterDisplayed("album");
    const videoMems=filterDisplayed("video");
    const orbMems=filterDisplayed("orb");
    const caseMems=filterDisplayed("case");
    const audioMems=filterDisplayed("audio");
    const docMems=filterDisplayed("document");

    // Store ALL video/audio mems (not just displayed) for playlist navigation
    allVideoMems.current=mems.filter((m: any)=>m.type==="video");
    allAudioMems.current=mems.filter((m: any)=>m.type==="audio");

    // ── PAINTING: large painting above fireplace ──
    // Show painting type first, fall back to first photo, else clickable station
    const bigPaintMem=paintingMems.length>0?paintingMems[0]:photoMems.length>0?photoMems[0]:null;
    const bigPaintUsedPhoto=paintingMems.length===0&&photoMems.length>0;// track if we borrowed a photo
    scene.add(mk(new THREE.BoxGeometry(1.8,1.3,.1),MS.fG,fpX,2.4,fpZ+.02));
    scene.add(mk(new THREE.BoxGeometry(1.65,1.15,.02),MS.gold,fpX,2.4,fpZ+.08));
    const fpSp=new THREE.SpotLight("#FFF5E0",.8,5,Math.PI/7,.5,1.2);fpSp.position.set(fpX,rH-.2,fpZ+.5);fpSp.target.position.set(fpX,2.4,fpZ);scene.add(fpSp);scene.add(fpSp.target);
    if(bigPaintMem){
      const om=bigPaintMem;const t=paintTex(om);
      const omc=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.1),new THREE.MeshStandardMaterial({map:t,roughness:.8}));
      omc.position.set(fpX,2.4,fpZ+.12);omc.userData={memory:om};scene.add(omc);memMeshes.current.push(omc);
    }else{
      const paintHit=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.1,.15),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
      paintHit.position.set(fpX,2.4,fpZ+.05);paintHit.userData={isStation:true};scene.add(paintHit);memMeshes.current.push(paintHit);
    }

    // ── PHOTO FRAMES: small fireplace frame + wall frames ──
    // Skip the first photo if it was used for the big painting
    const wallPhotos=bigPaintUsedPhoto?photoMems.slice(1):photoMems;
    if(wallPhotos.length>0){const pm=paintTex(wallPhotos[0]);const pf=new THREE.Mesh(new THREE.PlaneGeometry(.25,.2),new THREE.MeshStandardMaterial({map:pm,roughness:.8}));pf.position.set(fpX-.5,1.46,fpZ+.18);pf.userData={memory:wallPhotos[0]};scene.add(pf);memMeshes.current.push(pf);scene.add(mk(new THREE.BoxGeometry(.32,.27,.04),MS.fB,fpX-.5,1.46,fpZ+.15));}
    wallPhotos.slice(1,4).forEach((m: any,i: any)=>{
      const wy=2.2+Math.sin(i*.9)*.15,wz=-rL/2+.08;
      const xOff=i===0?-Math.min(2.2,rW/2-1.5):i===1?Math.min(2.2,rW/2-1.5):Math.min(3.5,rW/2-.8);
      const t=paintTex(m);const cv=new THREE.Mesh(new THREE.PlaneGeometry(1,0.75),new THREE.MeshStandardMaterial({map:t,roughness:.8}));
      cv.position.set(xOff,wy,wz);cv.userData={memory:m};scene.add(cv);memMeshes.current.push(cv);
      scene.add(mk(new THREE.BoxGeometry(1.15,.9,.08),fMats[i%3],xOff,wy,wz-.02));
      scene.add(mk(new THREE.BoxGeometry(1.05,.8,.02),MS.gold,xOff,wy,wz+.04));
      const sp=new THREE.SpotLight("#FFF5E0",.7,5,Math.PI/8,.5,1.2);sp.position.set(xOff,rH-.2,wz+.8);sp.target.position.set(xOff,wy,wz);sp.castShadow=true;scene.add(sp);scene.add(sp.target);
    });

    // ── ALBUM: open books on coffee table ──
    albumMems.slice(0,3).forEach((m: any,i: any)=>{
      const t=paintTex(m);
      const albL=mk(new THREE.BoxGeometry(.35,.015,.45),MS.dkW,-.35+i*.35,.565,ctZ);albL.rotation.z=.05;scene.add(albL);
      const albR=mk(new THREE.BoxGeometry(.35,.015,.45),MS.dkW,-.35+i*.35+.18,.565,ctZ);albR.rotation.z=-.05;scene.add(albR);
      const pg=new THREE.Mesh(new THREE.PlaneGeometry(.28,.38),new THREE.MeshStandardMaterial({map:t,roughness:.85}));
      pg.rotation.x=-Math.PI/2+.05;pg.position.set(-.35+i*.35+.1,.58,ctZ);pg.userData={memory:m};scene.add(pg);memMeshes.current.push(pg);
    });

    // ═══════════════════════════════════════════
    // BOOKSHELVES (left wall, floor to ceiling)
    // ═══════════════════════════════════════════
    const bsX=-rW/2+.35;
    // Classic book color palette: deep reds, navy, forest green, burgundy, tan, chocolate
    const bookPalette=["#6B1A1A","#1A2744","#2A4A2A","#4A1A2A","#8B6914","#3A2010","#1A3A4A","#5A2A3A","#2A3A1A","#6A4A2A","#3A1A3A","#1A4A3A","#7A3A1A","#2A2A4A","#4A3A1A","#5A1A1A"];
    // Deterministic seed from roomId for consistent look
    let bSeed=0;for(const c of (actualRoomId||roomId))bSeed=(bSeed*31+c.charCodeAt(0))>>>0;
    const bRng=()=>{bSeed=(bSeed*16807+1)>>>0;return(bSeed&0x7fffffff)/0x7fffffff;};
    for(let shelf=0;shelf<5;shelf++){
      const sy=.35+shelf*.75;
      // Shelf plank with slight edge detail
      scene.add(mk(new THREE.BoxGeometry(.5,.05,rL-2),MS.dkW,bsX,sy,0));
      scene.add(mk(new THREE.BoxGeometry(.52,.02,rL-1.9),MS.ltW,bsX,sy+.025,0));// lighter lip
      let bz=-rL/2+1.2;const shelfEnd=rL/2-1.2;
      while(bz<shelfEnd){
        // Occasional gap or bookend
        if(bRng()<.08){
          // Bronze bookend
          scene.add(mk(new THREE.BoxGeometry(.18,.22,.02),MS.bronze,bsX+.1,sy+.03+.11,bz));
          scene.add(mk(new THREE.BoxGeometry(.12,.02,.1),MS.bronze,bsX+.1,sy+.03+.01,bz+.04));
          bz+=.08;continue;
        }
        if(bRng()<.05){bz+=.06+bRng()*.08;continue;}// empty gap
        const bh=.22+bRng()*.3;
        const bw2=.05+bRng()*.05;
        const bd=.18+bRng()*.1;
        const tilt=(bRng()-.5)*.06;// slight random tilt
        const ci=Math.floor(bRng()*bookPalette.length);
        const baseColor=bookPalette[ci];
        // Book body
        const bookMat=new THREE.MeshStandardMaterial({color:baseColor,roughness:.7+bRng()*.2,metalness:.02});
        const book=mk(new THREE.BoxGeometry(bw2,bh,bd),bookMat,bsX+.08,sy+.03+bh/2,bz);
        book.rotation.z=tilt;scene.add(book);
        // Gold band / title area on spine (1-2 bands)
        const bands=bRng()<.6?1:2;
        for(let bn=0;bn<bands;bn++){
          const bandY=sy+.03+bh*(bn===0?.35:.7);
          const bandH=.015+bRng()*.01;
          scene.add(mk(new THREE.BoxGeometry(bw2+.003,bandH,bd*.7),MS.gold,bsX+.08+bw2*.02,bandY,bz));
        }
        // Occasional gold lettering dot on spine
        if(bRng()<.4){
          const dotY=sy+.03+bh*.55;
          scene.add(mk(new THREE.BoxGeometry(bw2+.004,.025,.03),MS.gold,bsX+.08+bw2*.02,dotY,bz));
        }
        // Some books slightly pulled out
        if(bRng()<.12){book.position.x+=.03;}
        // Rare leaning book (on top of others at shelf edges)
        bz+=bw2+.005+bRng()*.01;
      }
    }
    // Bookcase frame — sides, top, back panel
    scene.add(mk(new THREE.BoxGeometry(.55,rH-.2,.06),MS.dkW,bsX,rH/2,-rL/2+.1));
    scene.add(mk(new THREE.BoxGeometry(.55,rH-.2,.06),MS.dkW,bsX,rH/2,rL/2-.1));
    scene.add(mk(new THREE.BoxGeometry(.55,.06,rL-.1),MS.dkW,bsX,rH-.1,0));
    scene.add(mk(new THREE.BoxGeometry(.06,rH-.2,rL-.1),MS.dkW,bsX-.23,rH/2,0));
    // Crown moulding on top of bookcase
    scene.add(mk(new THREE.BoxGeometry(.6,.04,rL-.05),MS.gold,bsX,rH-.06,0));
    scene.add(mk(new THREE.BoxGeometry(.58,.02,rL-.08),MS.ltW,bsX,rH-.02,0));
    // Document memories on bookshelf (special colored spines)
    docMems.slice(0,5).forEach((m: any,i: any)=>{
      const sy=.35+((i+1)%5)*.75;const bz=-rL/2+1.5+i*((rL-3)/5);
      const spine=new THREE.Mesh(new THREE.BoxGeometry(.12,.4,.22),new THREE.MeshStandardMaterial({color:`hsl(${m.hue},${m.s}%,${m.l}%)`,roughness:.6,metalness:.05}));
      spine.position.set(bsX+.15,sy+.23,bz);spine.userData={memory:m};scene.add(spine);memMeshes.current.push(spine);
      // Gold label on spine
      scene.add(mk(new THREE.BoxGeometry(.13,.06,.05),MS.gold,bsX+.15,sy+.25,bz+.09));
    });
    // Clickable hit area for bookshelf — links to first document or opens upload
    const bsHit=new THREE.Mesh(new THREE.BoxGeometry(.6,rH-.5,rL-2),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    bsHit.position.set(bsX,rH/2,0);
    bsHit.userData=docMems.length>0?{memory:docMems[0]}:{isStation:true};
    scene.add(bsHit);memMeshes.current.push(bsHit);

    // ═══════════════════════════════════════════
    // CINEMA SCREEN (right wall)
    // ═══════════════════════════════════════════
    const scrX=rW/2-.2;
    scene.add(mk(new THREE.BoxGeometry(.08,2,3),MS.screen,scrX,2.2,0));
    scene.add(mk(new THREE.BoxGeometry(.04,.15,.15),MS.iron,scrX,1.15,0));
    if(videoMems.length>0){
      const vc=document.createElement("canvas");vc.width=384;vc.height=256;
      const vctx=vc.getContext("2d")!;
      // Initialize canvas to black to avoid green screen flash
      vctx.fillStyle="#1A1510";vctx.fillRect(0,0,384,256);
      const vtex=new THREE.CanvasTexture(vc);vtex.colorSpace=THREE.SRGBColorSpace;
      const scrMesh=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.8),new THREE.MeshBasicMaterial({map:vtex}));
      scrMesh.rotation.y=-Math.PI/2;scrMesh.position.set(scrX-.06,2.2,0);scrMesh.userData={memory:videoMems[0]};
      scene.add(scrMesh);memMeshes.current.push(scrMesh);
      let videoEl: HTMLVideoElement|null=null,screenImg: HTMLImageElement|null=null;
      const vm=videoMems[0];
      if(vm.dataUrl){
        // Detect if this is a video: check videoBlob flag, type field, or URL extension
        const isVidSrc=vm.videoBlob||vm.type==="video"||/\.(mp4|webm|mov|avi|mkv|m4v)/i.test(vm.dataUrl)||vm.dataUrl.startsWith("data:video/");
        if(isVidSrc){
          videoEl=document.createElement("video");
          videoEl.src=vm.dataUrl;videoEl.crossOrigin="anonymous";videoEl.loop=true;videoEl.playsInline=true;videoEl.volume=0;
          // Draw loading frame on canvas
          vctx.fillStyle="#1A1510";vctx.fillRect(0,0,384,256);
          vctx.fillStyle="rgba(255,255,255,.3)";vctx.font="16px Georgia,serif";vctx.textAlign="center";
          vctx.fillText("Loading video...",192,128);vtex.needsUpdate=true;
          // Try unmuted first (volume=0); if blocked, fall back to muted autoplay
          videoEl.muted=false;
          videoEl.play().catch(()=>{videoEl!.muted=true;videoEl!.play().catch(()=>{});});
          videoElRef.current=videoEl;
        }else{
          const si=new Image();si.onload=()=>{screenImg=si;};si.crossOrigin="anonymous";si.src=vm.dataUrl;
        }
      }
      const vidEntry={type:"video",canvas:vc,ctx:vctx,tex:vtex,mem:vm,w:384,h:256,phase:Math.random()*100,screenImg:()=>screenImg,videoEl:()=>videoEl};
      animTex.push(vidEntry);
      vidAnimEntry.current=vidEntry;
      const scrGl=new THREE.PointLight(`hsl(${vm.hue},40%,60%)`,.15,4);scrGl.position.set(scrX-.5,2.2,0);scene.add(scrGl);
    }else{
      const idleC=document.createElement("canvas");idleC.width=384;idleC.height=256;const ic=idleC.getContext("2d")!;
      ic.fillStyle="#1A1A1A";ic.fillRect(0,0,384,256);ic.fillStyle="#333";ic.font="24px Georgia,serif";ic.textAlign="center";ic.fillText("No videos yet",192,128);
      const idleTex=new THREE.CanvasTexture(idleC);idleTex.colorSpace=THREE.SRGBColorSpace;
      const idleMesh=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.8),new THREE.MeshBasicMaterial({map:idleTex}));
      idleMesh.rotation.y=-Math.PI/2;idleMesh.position.set(scrX-.06,2.2,0);
      idleMesh.userData={isStation:true};scene.add(idleMesh);memMeshes.current.push(idleMesh);
    }

    // ═══════════════════════════════════════════
    // VINYL RECORD PLAYER (right wall, near front)
    // ═══════════════════════════════════════════
    const vpX=rW/2-1.5,vpZ=rL/2-2;
    scene.add(mk(new THREE.BoxGeometry(.8,.04,.6),MS.dkW,vpX,.78,vpZ));
    for(let vl=-1;vl<=1;vl+=2)for(let vlz=-1;vlz<=1;vlz+=2)scene.add(mk(new THREE.CylinderGeometry(.03,.03,.75,6),MS.dkW,vpX+vl*.3,.38,vpZ+vlz*.22));
    scene.add(mk(new THREE.BoxGeometry(.55,.08,.45),MS.ltW,vpX,.84,vpZ));
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.01,24),MS.vinyl);disc.position.set(vpX-.05,.89,vpZ);scene.add(disc);
    const discLabel=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.012,16),MS.vinylL);discLabel.position.set(vpX-.05,.895,vpZ);scene.add(discLabel);
    animTex.push({type:"disc",mesh:disc,label:discLabel});
    const arm=mk(new THREE.BoxGeometry(.18,.015,.02),MS.bronze,vpX+.12,.9,vpZ-.05);arm.rotation.y=-.3;scene.add(arm);
    // Record sleeves leaning against table — audio memories
    audioMems.slice(0,3).forEach((m: any,i: any)=>{
      const recTex=paintTex(m);
      const rec=new THREE.Mesh(new THREE.PlaneGeometry(.3,.3),new THREE.MeshStandardMaterial({map:recTex,roughness:.6}));
      rec.position.set(vpX+.5,.15+i*.01,vpZ-.3+i*.12);rec.rotation.z=.1+i*.05;rec.rotation.y=-Math.PI/4;
      rec.userData={memory:m};scene.add(rec);memMeshes.current.push(rec);
      scene.add(mk(new THREE.BoxGeometry(.32,.32,.015),new THREE.MeshStandardMaterial({color:`hsl(${m.hue},${m.s}%,${Math.max(20,m.l-20)}%)`,roughness:.5}),vpX+.5,.15+i*.01,vpZ-.3+i*.12));
    });
    // Clickable hit area for vinyl player — links to first audio memory or opens upload
    const vpHit=new THREE.Mesh(new THREE.BoxGeometry(1.2,.5,1),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    vpHit.position.set(vpX,.85,vpZ);
    vpHit.userData=audioMems.length>0?{memory:audioMems[0]}:{isStation:true};
    scene.add(vpHit);memMeshes.current.push(vpHit);
    // Audio playback from vinyl player
    let vinylAudio: HTMLAudioElement|null=null;
    if(audioMems.length>0&&audioMems[0].dataUrl){
      vinylAudio=document.createElement("audio");
      vinylAudio.src=audioMems[0].dataUrl;vinylAudio.loop=true;vinylAudio.volume=0;
      // Don't auto-play — user starts vinyl manually via controls
      audioElRef.current=vinylAudio;
    }

    // ═══════════════════════════════════════════
    // VITRINE / GLASS DISPLAY CASE (right wall, between screen and vinyl)
    // ═══════════════════════════════════════════
    const vtX=rW/2-1.2, vtZ=-rL/2+2;
    // Cabinet base
    scene.add(mk(new THREE.BoxGeometry(.8,.5,.5),MS.dkW,vtX,.25,vtZ));
    // Glass case on top
    scene.add(mk(new THREE.BoxGeometry(.75,.02,.45),MS.dkW,vtX,.52,vtZ));// bottom shelf
    scene.add(mk(new THREE.BoxGeometry(.75,.02,.45),MS.dkW,vtX,1.22,vtZ));// top shelf
    // Glass panels (front, sides) — raycast disabled so items inside are clickable
    const glassF=new THREE.Mesh(new THREE.PlaneGeometry(.72,.68),MS.glass);glassF.position.set(vtX,.87,vtZ+.23);glassF.raycast=()=>{};scene.add(glassF);
    const glassL=new THREE.Mesh(new THREE.PlaneGeometry(.42,.68),MS.glass);glassL.rotation.y=Math.PI/2;glassL.position.set(vtX-.37,.87,vtZ);glassL.raycast=()=>{};scene.add(glassL);
    const glassR=new THREE.Mesh(new THREE.PlaneGeometry(.42,.68),MS.glass);glassR.rotation.y=-Math.PI/2;glassR.position.set(vtX+.37,.87,vtZ);glassR.raycast=()=>{};scene.add(glassR);
    // Glass frame edges
    scene.add(mk(new THREE.BoxGeometry(.02,.7,.02),MS.gold,vtX-.37,.87,vtZ+.22));
    scene.add(mk(new THREE.BoxGeometry(.02,.7,.02),MS.gold,vtX+.37,.87,vtZ+.22));
    scene.add(mk(new THREE.BoxGeometry(.76,.02,.02),MS.gold,vtX,1.22,vtZ+.22));
    // Interior light
    const vtLight=new THREE.PointLight("#FFF5E0",.3,2);vtLight.position.set(vtX,1.15,vtZ);scene.add(vtLight);
    // Case memories inside vitrine
    caseMems.slice(0,3).forEach((m: any,i: any)=>{
      const recTex=paintTex(m);
      const rec=new THREE.Mesh(new THREE.PlaneGeometry(.22,.22),new THREE.MeshStandardMaterial({map:recTex,roughness:.6}));
      rec.position.set(vtX-.2+i*.2,.75,vtZ+.05);rec.rotation.y=.1-i*.1;
      rec.userData={memory:m};scene.add(rec);memMeshes.current.push(rec);
    });
    // Clickable hit area for vitrine — links to first case memory or opens upload
    const vtHit=new THREE.Mesh(new THREE.BoxGeometry(.8,.75,.5),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    vtHit.position.set(vtX,.87,vtZ);
    vtHit.userData=caseMems.length>0?{memory:caseMems[0]}:{isStation:true};
    scene.add(vtHit);memMeshes.current.push(vtHit);

    // ═══════════════════════════════════════════
    // SCRIBE DESK — document memories as scrolls/papers on desk
    // ═══════════════════════════════════════════
    const scribeMems=docMems.slice(5,8);// overflow docs beyond bookshelf go to desk
    const albumOverflow=albumMems.slice(3,5);// overflow albums
    const deskItems=[...scribeMems,...albumOverflow];
    deskItems.slice(0,3).forEach((m: any,i: any)=>{
      const t=paintTex(m);
      const paper=new THREE.Mesh(new THREE.PlaneGeometry(.28,.36),new THREE.MeshStandardMaterial({map:t,roughness:.85}));
      paper.rotation.x=-Math.PI/2+.02;paper.rotation.z=(i-1)*.15;
      paper.position.set(dkX-.3+i*.35,.82,dkZ-.05);paper.userData={memory:m};scene.add(paper);memMeshes.current.push(paper);
    });
    // Desk hit area — links to first desk item or opens upload
    const dkHit=new THREE.Mesh(new THREE.BoxGeometry(1.6,.3,.75),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    dkHit.position.set(dkX,.85,dkZ);
    dkHit.userData=deskItems.length>0?{memory:deskItems[0]}:{isStation:true};
    scene.add(dkHit);memMeshes.current.push(dkHit);

    // ═══════════════════════════════════════════
    // RUG (center of seating area)
    // ═══════════════════════════════════════════
    const rugZ=(sofaZ+fpZ)/2+.2;
    if(layout.rugStyle==="persian"){
    scene.add(mk(new THREE.BoxGeometry(4.5,.005,3.5),MS.rugB,0,.003,rugZ));
    scene.add(mk(new THREE.BoxGeometry(4.2,.007,3.2),MS.rug,0,.006,rugZ));
    scene.add(mk(new THREE.BoxGeometry(3.6,.008,2.6),MS.rugN,0,.008,rugZ));
    scene.add(mk(new THREE.BoxGeometry(3,.009,2),MS.rug,0,.01,rugZ));
    const rugMed=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.003,20),MS.rugB);rugMed.position.set(0,.013,rugZ);scene.add(rugMed);
    }else{
    const rr=Math.min(rW,rL)*0.2;
    scene.add(mk(new THREE.CylinderGeometry(rr,rr,.003,24),MS.rugB,0,.003,rugZ));
    scene.add(mk(new THREE.CylinderGeometry(rr-.2,rr-.2,.005,24),MS.rug,0,.005,rugZ));
    scene.add(mk(new THREE.CylinderGeometry(rr-.5,rr-.5,.007,24),MS.rugN,0,.007,rugZ));
    scene.add(mk(new THREE.CylinderGeometry(rr-.8,rr-.8,.008,20),MS.rugB,0,.008,rugZ));
    }

    // ═══════════════════════════════════════════
    // TABLE LAMPS
    // ═══════════════════════════════════════════
    for(const[lx,lz] of [[-rW/2+1.5,rL/2-2],[rW/2-1.5,-rL/2+2]]){
      scene.add(mk(new THREE.CylinderGeometry(.2,.25,.6,8),MS.dkW,lx,.3,lz));
      scene.add(mk(new THREE.CylinderGeometry(.28,.28,.04,10),MS.gold,lx,.62,lz));
      scene.add(mk(new THREE.CylinderGeometry(.04,.06,.4,6),MS.bronze,lx,.82,lz));
      const shade=mk(new THREE.CylinderGeometry(.08,.14,.2,8,1,true),MS.lamp,lx,1.1,lz);scene.add(shade);
      const lampL=new THREE.PointLight("#FFE8C0",.35,4);lampL.position.set(lx,1.2,lz);scene.add(lampL);
      const halo=new THREE.Mesh(new THREE.SphereGeometry(.25,8,8),MS.lampG);halo.position.set(lx,1.1,lz);scene.add(halo);
    }

    // ═══════════════════════════════════════════
    // WALL SCONCES
    // ═══════════════════════════════════════════
    for(let s=-1;s<=1;s+=2){
      for(const sz of[-2,2]){
        scene.add(mk(new THREE.BoxGeometry(.07,.15,.07),MS.sconce,s*(rW/2-.04),3,sz));
        scene.add(mk(new THREE.CylinderGeometry(.045,.03,.07,6),MS.sconce,s*(rW/2-.08),3.15,sz));
        const bl=new THREE.Mesh(new THREE.SphereGeometry(.03,6,6),MS.glassG);bl.position.set(s*(rW/2-.08),3.22,sz);scene.add(bl);
        const sl=new THREE.PointLight("#FFE0B0",.2,3);sl.position.set(s*(rW/2-.15),3.1,sz);scene.add(sl);
      }
    }
    if(layout.extraSconces){
      for(const sx of[-2,2]){
        scene.add(mk(new THREE.BoxGeometry(.07,.15,.07),MS.sconce,sx,3,-rL/2+.04));
        scene.add(mk(new THREE.CylinderGeometry(.045,.03,.07,6),MS.sconce,sx,3.15,-rL/2+.08));
        const bl2=new THREE.Mesh(new THREE.SphereGeometry(.03,6,6),MS.glassG);bl2.position.set(sx,3.22,-rL/2+.08);scene.add(bl2);
        const sl2=new THREE.PointLight("#FFE0B0",.15,3);sl2.position.set(sx,3.1,-rL/2+.15);scene.add(sl2);
      }
    }

    // ═══════════════════════════════════════════
    // WINDOWS
    // ═══════════════════════════════════════════
    const winPositions: [number,number][]=layout.windowCount===2
      ?[[rW/2-2,-rL/2+.01],[-rW/2+2,-rL/2+.01]]
      :[[rW/2-2,-rL/2+.01]];
    for(const[winX,winZ] of winPositions){
      // Sky/light visible through window opening
      scene.add(mk(new THREE.PlaneGeometry(1.1,1.8),new THREE.MeshBasicMaterial({color:"#C8E0F8"}),winX,2.6,winZ+.01));
      // Bright daylight glow overlay
      scene.add(mk(new THREE.PlaneGeometry(1.1,1.8),new THREE.MeshBasicMaterial({color:"#FFF8E0",transparent:true,opacity:.45}),winX,2.6,winZ+.015));
      // Window frame
      scene.add(mk(new THREE.BoxGeometry(1.5,.12,.12),MS.trim,winX,3.55,winZ+.04));// top
      scene.add(mk(new THREE.BoxGeometry(1.5,.12,.12),MS.trim,winX,1.65,winZ+.04));// bottom
      scene.add(mk(new THREE.BoxGeometry(.12,2,.12),MS.trim,winX-.68,2.6,winZ+.04));// left
      scene.add(mk(new THREE.BoxGeometry(.12,2,.12),MS.trim,winX+.68,2.6,winZ+.04));// right
      scene.add(mk(new THREE.BoxGeometry(.06,1.8,.08),MS.dkW,winX,2.6,winZ+.03));// center divider
      scene.add(mk(new THREE.BoxGeometry(1.1,.06,.08),MS.dkW,winX,2.6,winZ+.03));// cross bar
      // Curtains
      const c1=new THREE.Mesh(new THREE.PlaneGeometry(.45,2.2),MS.curtain);c1.position.set(winX-.85,2.6,winZ+.06);scene.add(c1);
      const c2=new THREE.Mesh(new THREE.PlaneGeometry(.45,2.2),MS.curtain);c2.position.set(winX+.85,2.6,winZ+.06);scene.add(c2);
      // Strong directional light through window
      const winSp=new THREE.SpotLight("#FFE8C0",.8,12,Math.PI/4,.5,1.2);winSp.position.set(winX,3,winZ+.5);winSp.target.position.set(winX,.5,winZ+3);scene.add(winSp);scene.add(winSp.target);
      // Light shaft particles effect (warm glow on floor)
      const shaftGeo=new THREE.PlaneGeometry(1.5,4);const shaftMat=new THREE.MeshBasicMaterial({color:"#FFF8D0",transparent:true,opacity:.06,side:THREE.DoubleSide});
      const shaft=new THREE.Mesh(shaftGeo,shaftMat);shaft.position.set(winX,1.5,winZ+2);shaft.rotation.x=-.6;scene.add(shaft);
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
    // OPTIONAL: READING CHAIR (wingback by fireplace)
    // ═══════════════════════════════════════════
    if(layout.readingChair){
    const rcX=-rW/2+2,rcZ=fpZ+2;
    scene.add(mk(new THREE.BoxGeometry(1,.3,.85),MS.leather,rcX,.15,rcZ));
    scene.add(mk(new THREE.BoxGeometry(1,.7,.1),MS.leatherD,rcX,.55,rcZ+.38));
    for(let ws=-1;ws<=1;ws+=2)scene.add(mk(new THREE.BoxGeometry(.08,.5,.4),MS.leatherD,rcX+ws*.48,.45,rcZ+.2));
    for(let lx of[-1,1])for(let lz of[-1,1])scene.add(mk(new THREE.SphereGeometry(.035,6,6),MS.dkW,rcX+lx*.4,.03,rcZ+lz*.35));
    for(let bx2=-1;bx2<=1;bx2++)for(let by2=0;by2<3;by2++){scene.add(mk(new THREE.SphereGeometry(.015,6,6),MS.button,rcX+bx2*.25,.4+by2*.18,rcZ+.42));}
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
      const ol=new THREE.PointLight(`hsl(${m.hue},${m.s}%,${m.l}%)`,.3,2.5);ol.position.set(ox,oy,oz);scene.add(ol);
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
    const tranMat=new THREE.MeshBasicMaterial({color:"#FFF8E0",transparent:true,opacity:.15,side:THREE.DoubleSide});
    const transom=new THREE.Mesh(tranGeo,tranMat);
    transom.rotation.y=Math.PI;// face into room (towards -Z)
    transom.position.set(0,3.02,bdZ-.02);scene.add(transom);
    // Warm light spilling from corridor
    const bdGlow=new THREE.Mesh(new THREE.PlaneGeometry(2.4,3.8),new THREE.MeshBasicMaterial({color:"#FFE8C0",transparent:true,opacity:.04,side:THREE.DoubleSide}));
    bdGlow.position.set(0,1.9,bdZ);scene.add(bdGlow);
    animTex.push({type:"doorGlow",mesh:bdGlow});
    const bdLight=new THREE.SpotLight("#FFE0B0",.5,6,Math.PI/5,.6,1);
    bdLight.position.set(0,2.5,bdZ-.5);bdLight.target.position.set(0,1,bdZ-2);scene.add(bdLight);scene.add(bdLight.target);
    const bdAmbient=new THREE.PointLight("#FFE8C0",.25,4);bdAmbient.position.set(0,2,bdZ-.3);scene.add(bdAmbient);
    // Label
    const bdLabel=document.createElement("canvas");bdLabel.width=280;bdLabel.height=50;
    const blc=bdLabel.getContext("2d")!;
    blc.fillStyle=wing?.accent||"#C8A868";blc.font="bold 16px Georgia,serif";blc.textAlign="center";
    blc.fillText("\u2190 Back to corridor",140,32);
    const blTex=new THREE.CanvasTexture(bdLabel);blTex.colorSpace=THREE.SRGBColorSpace;
    const bdLabelMesh=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.25),new THREE.MeshBasicMaterial({map:blTex,transparent:true}));
    bdLabelMesh.rotation.y=Math.PI;bdLabelMesh.position.set(0,3.75,bdZ-.02);scene.add(bdLabelMesh);
    // Hit area
    const bdHit=new THREE.Mesh(new THREE.BoxGeometry(2,3.4,.3),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    bdHit.position.set(0,1.7,bdZ);bdHit.userData={isBackDoor:true};scene.add(bdHit);
    memMeshes.current.push(bdHit);

    // Golden dust
    const rdN=70,rdG=new THREE.BufferGeometry(),rdP=new Float32Array(rdN*3);
    for(let i=0;i<rdN;i++){rdP[i*3]=(Math.random()-.5)*rW;rdP[i*3+1]=.5+Math.random()*rH;rdP[i*3+2]=(Math.random()-.5)*rL;}
    rdG.setAttribute("position",new THREE.BufferAttribute(rdP,3));
    scene.add(new THREE.Points(rdG,new THREE.PointsMaterial({color:"#FFF8E0",size:.03,transparent:true,opacity:.25,blending:THREE.AdditiveBlending,depthWrite:false})));

    pos.current.set(0,1.7,rL/2-2.5);posT.current.set(0,1.7,rL/2-2.5);
    lookT.current={yaw:0,pitch:0};lookA.current={yaw:0,pitch:0};

    const clock=new THREE.Clock();
    const animate=()=>{
      frameRef.current=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),t=clock.getElapsedTime();
      lookA.current.yaw+=(lookT.current.yaw-lookA.current.yaw)*.08;lookA.current.pitch+=(lookT.current.pitch-lookA.current.pitch)*.08;
      const spd=2.5*dt,dir=new THREE.Vector3();
      const k=keys.current;
      if(k["w"]||k["arrowup"])dir.z-=1;if(k["s"]||k["arrowdown"])dir.z+=1;
      if(k["a"]||k["arrowleft"])dir.x-=1;if(k["d"]||k["arrowright"])dir.x+=1;
      if(dir.length()>0){dir.normalize().multiplyScalar(spd);dir.applyAxisAngle(new THREE.Vector3(0,1,0),-lookA.current.yaw);posT.current.add(dir);}
      posT.current.x=Math.max(-rW/2+1,Math.min(rW/2-1,posT.current.x));posT.current.z=Math.max(-rL/2+1,Math.min(rL/2-1.5,posT.current.z));
      pos.current.lerp(posT.current,.1);camera.position.copy(pos.current);
      const ld=new THREE.Vector3(Math.sin(lookA.current.yaw)*Math.cos(lookA.current.pitch),Math.sin(lookA.current.pitch),-Math.cos(lookA.current.yaw)*Math.cos(lookA.current.pitch));
      camera.lookAt(camera.position.clone().add(ld));
      animTex.forEach(a=>{
        if(a.type==="fire"){a.light.intensity=.5+Math.sin(t*5)*.15+Math.sin(t*7.3)*.1;}
        if(a.type==="doorGlow"){a.mesh.material.opacity=.03+Math.sin(t*2)*.02;}
        if(a.type==="flame"){a.mesh.position.y=a.baseY+Math.sin(t*4+a.phase)*.06;a.mesh.scale.y=.8+Math.sin(t*6+a.phase)*.3;a.mesh.material.opacity=.5+Math.sin(t*5+a.phase)*.2;}
        if(a.type==="orb"){a.mesh.position.y=a.baseY+Math.sin(t*1.5+a.phase)*.1;a.inner.position.y=a.mesh.position.y;a.light.position.y=a.mesh.position.y;a.mesh.material.emissiveIntensity=.3+Math.sin(t*2+a.phase)*.15;}
        if(a.type==="disc"){a.mesh.rotation.y=t*.5;a.label.rotation.y=t*.5;
          if(vinylAudio){const vo=volOverride.current.audio;vinylAudio.volume=vo!==null?vo:Math.max(0,Math.min(1,1-pos.current.distanceTo(new THREE.Vector3(vpX,1,vpZ))/8));}
        }
        if(a.type==="globe"){a.mesh.rotation.y=t*.15;}
        if(a.type==="video"){
          const cx=a.ctx,cw=a.w,ch=a.h,m=a.mem,ph=t*.5+a.phase;
          const vEl=a.videoEl?a.videoEl():null;
          if(vEl&&!vEl.muted){const vo=volOverride.current.video;vEl.volume=vo!==null?vo:Math.max(0,Math.min(1,1-pos.current.distanceTo(new THREE.Vector3(scrX,2.2,0))/10));}
          const sImg=a.screenImg?a.screenImg():null;
          if(vEl&&vEl.readyState>=2){
            const iw=vEl.videoWidth||cw,ih=vEl.videoHeight||ch,scale=Math.max(cw/iw,ch/ih);
            const sw=iw*scale,sh=ih*scale;
            cx.drawImage(vEl,(cw-sw)/2,(ch-sh)/2,sw,sh);
          }else if(sImg){
            const iw=sImg.width,ih=sImg.height,scale=Math.max(cw/iw,ch/ih);
            const sw=iw*scale,sh=ih*scale;
            cx.drawImage(sImg,(cw-sw)/2,(ch-sh)/2,sw,sh);
            for(let sl=0;sl<ch;sl+=3){cx.fillStyle=`rgba(0,0,0,.015)`;cx.fillRect(0,sl,cw,1);}
            cx.fillStyle=`hsla(${(m.hue+Math.floor(t*10))%360},20%,50%,.03)`;cx.fillRect(0,0,cw,ch);
          }else{
            const scT=Math.floor(ph*.3)%5;const h1=(m.hue+scT*30)%360,h2=(m.hue+scT*30+40)%360;
            const g=cx.createLinearGradient(0,0,cw,ch);
            g.addColorStop(0,`hsl(${h1},${m.s}%,${m.l-5+Math.sin(ph*2)*8}%)`);
            g.addColorStop(.5,`hsl(${(h1+h2)/2},${m.s-10}%,${m.l+Math.sin(ph*3)*5}%)`);
            g.addColorStop(1,`hsl(${h2},${m.s-5}%,${m.l-8+Math.cos(ph)*6}%)`);
            cx.fillStyle=g;cx.fillRect(0,0,cw,ch);
            for(let s=0;s<4;s++){cx.fillStyle=`hsla(${m.hue+s*25},${m.s+10}%,${m.l+10}%,.1)`;const sx=cw*.2+Math.sin(ph+s*1.5)*cw*.3;cx.beginPath();cx.arc(sx,ch*.3+Math.cos(ph*.7+s)*ch*.2,20+s*10,0,Math.PI*2);cx.fill();}
          }
          cx.fillStyle="rgba(0,0,0,.35)";cx.fillRect(0,ch-28,cw,28);cx.fillStyle="rgba(255,255,255,.85)";cx.font="13px Georgia,serif";cx.textAlign="center";cx.fillText(m.title,cw/2,ch-9);
          a.tex.needsUpdate=true;
        }
      });
      const dp=rdG.attributes.position.array;for(let i=0;i<rdN;i++){dp[i*3+1]+=Math.sin(t*.2+i*.5)*.002;if(dp[i*3+1]>rH)dp[i*3+1]=.5;}rdG.attributes.position.needsUpdate=true;
      ren.render(scene,camera);
    };animate();

    // Auto-show media controls when video or audio memories exist
    if(videoMems.length>0||audioMems.length>0) setShowMedia({video:videoMems.length>0,audio:audioMems.length>0});

    const onDown=(e: MouseEvent)=>{drag.current=false;prev.current={x:e.clientX,y:e.clientY};};
    const onMove=(e: MouseEvent)=>{const dx=e.clientX-prev.current.x,dy=e.clientY-prev.current.y;if(Math.abs(dx)>2||Math.abs(dy)>2)drag.current=true;
      if(e.buttons===1){lookT.current.yaw-=dx*.003;lookT.current.pitch=Math.max(-.5,Math.min(.5,lookT.current.pitch+dy*.003));prev.current={x:e.clientX,y:e.clientY};}
      const rect=el.getBoundingClientRect();const r2=new THREE.Raycaster();r2.setFromCamera(new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1),camera);
      const hits=r2.intersectObjects(memMeshes.current).filter(h=>h.distance<12);
      if(hits.length>0){
        // Prefer memories and back-door over station hit areas
        const memHit=hits.find(h=>h.object.userData.memory||h.object.userData.isBackDoor);
        const ud=(memHit||hits[0]).object.userData;
        if(ud.isBackDoor) hovMem.current=ud;
        else if(ud.isStation) hovMem.current=ud;
        else if(ud.memory) hovMem.current=ud.memory;
        else hovMem.current=null;
        el.style.cursor=hovMem.current?"pointer":"grab";
      }else{hovMem.current=null;el.style.cursor="grab";}};
    const onCk=()=>{if(!drag.current&&hovMem.current){
      if(hovMem.current.isBackDoor)onMemoryClick("__back__");
      else if(hovMem.current.isStation)onMemoryClick("__upload__");
      else onMemoryClick(hovMem.current);
    }};
    const onKD=(e: KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=true;if(["arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase()))e.preventDefault();};const onKU=(e: KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=false;};
    const onRs=()=>{w=el.clientWidth;h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();ren.setSize(w,h);};
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
          if(Math.abs(dx)>2||Math.abs(dy)>2){drag.current=true;touchTap2=false;}
          lookT.current.yaw-=dx*.003;lookT.current.pitch=Math.max(-.5,Math.min(.5,lookT.current.pitch+dy*.003));
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
            const rect=el.getBoundingClientRect();const r2=new THREE.Raycaster();
            r2.setFromCamera(new THREE.Vector2(((t.clientX-rect.left)/rect.width)*2-1,-((t.clientY-rect.top)/rect.height)*2+1),camera);
            const hits=r2.intersectObjects(memMeshes.current).filter(h2=>h2.distance<12);
            if(hits.length>0){
              const memHit=hits.find(h2=>h2.object.userData.memory||h2.object.userData.isBackDoor);
              const ud=(memHit||hits[0]).object.userData;
              if(ud.isBackDoor)onMemoryClick("__back__");
              else if(ud.isStation)onMemoryClick("__upload__");
              else if(ud.memory)onMemoryClick(ud.memory);
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

    return()=>{if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);el.removeEventListener("mousedown",onDown);el.removeEventListener("mousemove",onMove);el.removeEventListener("click",onCk);
      window.removeEventListener("keydown",onKD);window.removeEventListener("keyup",onKU);window.removeEventListener("resize",onRs);
      el.removeEventListener("touchstart",onTS2);el.removeEventListener("touchmove",onTM2);el.removeEventListener("touchend",onTE2);
      clearInterval(touchTick2);clearInterval(mediaPoll);
      videoElRef.current=null;audioElRef.current=null;setShowMedia({video:false,audio:false});
      if(vinylAudio){vinylAudio.pause();vinylAudio.src="";}
      animTex.forEach(a=>{if(a.type==="video"){const vEl=a.videoEl?a.videoEl():null;if(vEl){vEl.pause();vEl.src="";}}});
      if(el.contains(ren.domElement))el.removeChild(ren.domElement);ren.dispose();};
  },[roomId,actualRoomId,layoutOverride]);

  const fmt=(s: number)=>{if(!s||!isFinite(s))return"0:00";const m=Math.floor(s/60),sec=Math.floor(s%60);return`${m}:${sec<10?"0":""}${sec}`;};
  const accent=wing?.accent||"#C17F59";
  const btnS={borderRadius:8,border:"none",background:"rgba(255,255,255,.08)",color:"#F0EAE0",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"} as const;
  const playBtnS={...btnS,borderRadius:10,background:accent,color:"#FFF"} as const;

  // Direct handlers — no useCallback chains, just read refs directly
  const act=(ref: React.RefObject<HTMLVideoElement|HTMLAudioElement|null>,fn: (el: HTMLMediaElement)=>void)=>{if(ref.current)fn(ref.current);};

  // Track switching for video
  const switchVideoTrack=(newIdx: number)=>{
    const list=allVideoMems.current;
    if(!list.length)return;
    const idx=((newIdx%list.length)+list.length)%list.length;
    setVidIdx(idx);
    const vm=list[idx];
    const vEl=videoElRef.current;
    if(vEl&&vm.dataUrl){
      vEl.pause();vEl.src=vm.dataUrl;vEl.load();
      vEl.muted=false;vEl.play().catch(()=>{vEl.muted=true;vEl.play().catch(()=>{});});
    }
    // Update the animTex entry's mem reference for title rendering
    if(vidAnimEntry.current) vidAnimEntry.current.mem=vm;
  };

  // Track switching for audio
  const switchAudioTrack=(newIdx: number)=>{
    const list=allAudioMems.current;
    if(!list.length)return;
    const idx=((newIdx%list.length)+list.length)%list.length;
    setAudIdx(idx);
    const am=list[idx];
    const aEl=audioElRef.current;
    if(aEl&&am.dataUrl){
      aEl.pause();aEl.src=am.dataUrl;aEl.load();
      aEl.play().catch(()=>{});
    }
  };

  const renderBar=(type:"video"|"audio",ref: React.RefObject<HTMLVideoElement|HTMLAudioElement|null>,st: typeof vidState,title: string)=>{
    const isVid=type==="video";
    const barAccent=isVid?"#5B8CB8":"#B87333";
    const barBorder=isVid?"rgba(91,140,184,.35)":"rgba(184,115,51,.35)";
    const playlist=isVid?allVideoMems.current:allAudioMems.current;
    const curIdx=isVid?vidIdx:audIdx;
    const hasMultiple=playlist.length>1;
    const switchTrack=isVid?switchVideoTrack:switchAudioTrack;
    return(
    <div style={{background:"rgba(30,26,22,.88)",backdropFilter:"blur(16px)",borderRadius:14,border:`1px solid ${barBorder}`,padding:"8px 12px",display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,boxShadow:"0 8px 40px rgba(0,0,0,.35)",maxWidth:"min(580px, 92vw)"}} onMouseDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()}>
      <div style={{width:28,height:28,borderRadius:isVid?6:14,background:isVid?"linear-gradient(135deg,#1A2744,#3A5A7A)":"linear-gradient(135deg,#3A2010,#6A4A2A)",display:"flex",alignItems:"center",justifyContent:"center",border:`1.5px solid ${barAccent}40`,flexShrink:0}}>
        <span style={{fontSize:13}}>{isVid?"\uD83D\uDCFA":"\uD83D\uDCBF"}</span>
      </div>
      <div style={{minWidth:0,maxWidth:120}}>
        <div style={{fontFamily:"system-ui,sans-serif",fontSize:8,color:barAccent,textTransform:"uppercase",letterSpacing:"1.2px",fontWeight:700,marginBottom:1}}>
          {isVid?"Cinema Screen":"Vinyl Player"}{hasMultiple?` (${curIdx+1}/${playlist.length})`:""}
        </div>
        <div style={{fontFamily:"Georgia,serif",fontSize:11,color:"#F0EAE0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</div>
        <div style={{fontFamily:"system-ui,sans-serif",fontSize:9,color:"rgba(240,234,224,.5)",marginTop:1}}>{fmt(st.time)} / {fmt(st.duration)}</div>
      </div>
      <div style={{flex:"1 1 60px",minWidth:40,height:4,background:"rgba(255,255,255,.12)",borderRadius:2,cursor:"pointer"}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();const pct=(e.clientX-r.left)/r.width;act(ref,el=>{if(el.duration)el.currentTime=pct*el.duration;});}}>
        <div style={{width:`${st.duration?(st.time/st.duration)*100:0}%`,height:"100%",background:barAccent,borderRadius:2,transition:"width .2s"}}/>
      </div>
      <div style={{display:"flex",gap:3,alignItems:"center"}}>
        {/* Prev track */}
        {hasMultiple&&<button onClick={()=>switchTrack(curIdx-1)} title="Previous" style={{width:28,height:28,fontSize:11,...btnS}}>{"\u23EE"}</button>}
        <button onClick={()=>act(ref,el=>{el.pause();el.currentTime=0;})} title="Stop" style={{width:28,height:28,fontSize:13,...btnS}}>{"\u23F9"}</button>
        {st.playing
          ?<button onClick={()=>act(ref,el=>el.pause())} title="Pause" style={{width:32,height:32,fontSize:14,...btnS,borderRadius:10,background:barAccent,color:"#FFF"}}>{"\u23F8"}</button>
          :<button onClick={()=>act(ref,el=>{el.muted=false;el.play().catch(()=>{});})} title="Play" style={{width:32,height:32,fontSize:14,...btnS,borderRadius:10,background:barAccent,color:"#FFF"}}>{"\u25B6"}</button>
        }
        {/* Next track */}
        {hasMultiple&&<button onClick={()=>switchTrack(curIdx+1)} title="Next" style={{width:28,height:28,fontSize:11,...btnS}}>{"\u23ED"}</button>}
        <button onClick={()=>act(ref,el=>{el.loop=!el.loop;})} title={st.loop?"Loop on":"Loop off"} style={{width:28,height:28,fontSize:12,...btnS,border:st.loop?`1.5px solid ${barAccent}`:"none",background:st.loop?`${barAccent}20`:"rgba(255,255,255,.08)",color:st.loop?barAccent:"#F0EAE0"}}>{"\uD83D\uDD01"}</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:4}}>
        <span style={{fontSize:11,color:"rgba(240,234,224,.5)"}}>{"\uD83D\uDD0A"}</span>
        <input type="range" min={0} max={1} step={0.01} value={st.volume} onChange={e=>{const v=parseFloat(e.target.value);volOverride.current[type]=v;act(ref,el=>{el.muted=false;el.volume=v;});}}
          style={{width:50,height:4,accentColor:barAccent,cursor:"pointer"}}/>
      </div>
      <button onClick={()=>setShowMedia(s=>({...s,[type]:false}))} style={{...btnS,width:24,height:24,borderRadius:12,fontSize:11,color:"rgba(240,234,224,.6)"}}>{"\u2715"}</button>
    </div>
    );
  };

  const hasMedia=showMedia.video||showMedia.audio;

  return(
    <div style={{position:"relative",width:"100%",height:"100%"}}>
      <div ref={mountRef} style={{width:"100%",height:"100%"}}/>
      {hasMedia&&<div style={{position:"absolute",bottom:60,left:"50%",transform:"translateX(-50%)",zIndex:40,animation:"fadeUp .25s ease",display:"flex",flexDirection:"column",gap:8,alignItems:"center"}}>
        {showMedia.video&&videoElRef.current&&renderBar("video",videoElRef,vidState,allVideoMems.current[vidIdx]?.title||"Video")}
        {showMedia.audio&&audioElRef.current&&renderBar("audio",audioElRef,audState,allAudioMems.current[audIdx]?.title||"Audio")}
      </div>}
    </div>
  );
}
