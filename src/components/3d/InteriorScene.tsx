"use client";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { WINGS } from "@/lib/constants/wings";
import { paintTex } from "@/lib/3d/textureHelpers";
import { mk } from "@/lib/3d/meshHelpers";

// ═══ ROOM INTERIOR — cosy personal den with media stations ═══
export default function InteriorScene({roomId,memories,onMemoryClick}: {roomId: any,memories: any,onMemoryClick: any}){
  const mountRef=useRef<HTMLDivElement|null>(null),frameRef=useRef<number|null>(null);
  const lookA=useRef({yaw:0,pitch:0}),lookT=useRef({yaw:0,pitch:0});
  const pos=useRef(new THREE.Vector3()),posT=useRef(new THREE.Vector3());
  const keys=useRef<Record<string,boolean>>({}),drag=useRef(false),prev=useRef({x:0,y:0}),hovMem=useRef<any>(null),memMeshes=useRef<THREE.Mesh[]>([]);
  const wing=WINGS.find(r=>r.id===roomId),mems=memories||[];
  console.log("InteriorScene mount/update — roomId:",roomId,"mems count:",mems.length,"types:",mems.map((m: any)=>m.type).join(","));

  useEffect(()=>{
    const el=mountRef.current;if(!el)return;let w=el.clientWidth,h=el.clientHeight;
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
    };
    const fMats=[MS.fG,MS.fB,MS.gold];
    memMeshes.current=[];
    const animTex: any[]=[];

    const rW=12,rL=10,rH=4.5;
    // Floor + herringbone-style inlay
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(rW,rL),MS.floor);fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;scene.add(fl);
    scene.add(mk(new THREE.BoxGeometry(rW-1.5,.003,rL-1.5),MS.floorL,0,.002,0));
    for(let s=-1;s<=1;s+=2){scene.add(mk(new THREE.BoxGeometry(.05,.004,rL-2),MS.dkW,s*(rW/2-.9),.003,0));scene.add(mk(new THREE.BoxGeometry(rW-2,.004,.05),MS.dkW,0,.003,s*(rL/2-.9)));}
    // Ceiling
    const ce=new THREE.Mesh(new THREE.PlaneGeometry(rW,rL),MS.ceil);ce.rotation.x=Math.PI/2;ce.position.y=rH;scene.add(ce);
    // Crown molding
    for(let s=-1;s<=1;s+=2){scene.add(mk(new THREE.BoxGeometry(.1,.14,rL),MS.gold,s*(rW/2-.05),rH-.07,0));scene.add(mk(new THREE.BoxGeometry(rW,.14,.1),MS.gold,0,rH-.07,s*(rL/2-.05)));}
    // Walls
    for(let s=-1;s<=1;s+=2){
      const wm=new THREE.Mesh(new THREE.PlaneGeometry(rL,rH),MS.wall);wm.rotation.y=s*(-Math.PI/2);wm.position.set(s*(rW/2),rH/2,0);wm.receiveShadow=true;scene.add(wm);
    }
    scene.add(mk(new THREE.PlaneGeometry(rW,rH),MS.wall,0,rH/2,-rL/2));
    const bw=new THREE.Mesh(new THREE.PlaneGeometry(rW,rH),MS.wall);bw.rotation.y=Math.PI;bw.position.set(0,rH/2,rL/2);bw.receiveShadow=true;scene.add(bw);
    // Wainscoting
    for(let s=-1;s<=1;s+=2){scene.add(mk(new THREE.BoxGeometry(.05,1.2,rL-.3),MS.wain,s*(rW/2-.025),.6,0));scene.add(mk(new THREE.BoxGeometry(.06,.07,rL-.2),MS.gold,s*(rW/2-.03),1.23,0));scene.add(mk(new THREE.BoxGeometry(.08,.18,rL-.1),MS.dkW,s*(rW/2-.04),.09,0));}
    scene.add(mk(new THREE.BoxGeometry(rW-.3,1.2,.05),MS.wain,0,.6,-rL/2+.025));scene.add(mk(new THREE.BoxGeometry(rW-.2,.07,.06),MS.gold,0,1.23,-rL/2+.03));

    // ══ FIREPLACE (back wall center) ══
    const fpX=0,fpZ=-rL/2+.3;
    // Mantel
    scene.add(mk(new THREE.BoxGeometry(2.8,.12,.5),MS.marble,fpX,1.3,fpZ));
    scene.add(mk(new THREE.BoxGeometry(2.6,.08,.4),MS.gold,fpX,1.24,fpZ+.02));
    // Firebox opening
    scene.add(mk(new THREE.BoxGeometry(1.6,1.1,.3),MS.brickD,fpX,.55,fpZ));
    scene.add(mk(new THREE.BoxGeometry(.2,1.1,.3),MS.brick,fpX-.9,.55,fpZ));
    scene.add(mk(new THREE.BoxGeometry(.2,1.1,.3),MS.brick,fpX+.9,.55,fpZ));
    scene.add(mk(new THREE.BoxGeometry(2,.18,.3),MS.brick,fpX,1.19,fpZ));
    // Hearth
    scene.add(mk(new THREE.BoxGeometry(2.6,.06,.6),MS.marble,fpX,.03,fpZ+.15));
    // Fire glow (animated)
    const fireL=new THREE.PointLight("#FF8030",.6,5);fireL.position.set(fpX,.5,fpZ+.2);scene.add(fireL);
    animTex.push({type:"fire",light:fireL});
    // Logs
    for(let l=0;l<3;l++){const log=mk(new THREE.CylinderGeometry(.06,.07,.5+Math.random()*.3,6),MS.dkW,fpX-.25+l*.25,.12,fpZ+.1);log.rotation.z=Math.PI/2+Math.random()*.2;scene.add(log);}
    // Flames (triangles)
    for(let f=0;f<5;f++){const fl2=new THREE.Mesh(new THREE.ConeGeometry(.06+Math.random()*.04,.2+Math.random()*.15,4),f%2?MS.fire:MS.fireG);fl2.position.set(fpX-.2+f*.1,.2+Math.random()*.1,fpZ+.1);animTex.push({type:"flame",mesh:fl2,baseY:.2+Math.random()*.1,phase:Math.random()*6});scene.add(fl2);}
    // Chimney breast
    scene.add(mk(new THREE.BoxGeometry(2.4,rH-1.3,.08),MS.wall,fpX,1.3+(rH-1.3)/2,fpZ-.02));
    // Mantel clock (decorative)
    scene.add(mk(new THREE.BoxGeometry(.2,.3,.12),MS.bronze,fpX,1.45,fpZ+.15));
    scene.add(mk(new THREE.CylinderGeometry(.12,.12,.02,16),MS.gold,fpX,1.62,fpZ+.15));

    // ══ CHESTERFIELD SOFA (center, facing fireplace) ══
    const sofaZ=1.5;
    scene.add(mk(new THREE.BoxGeometry(2.4,.35,.9),MS.leather,0,.175,sofaZ));// seat
    scene.add(mk(new THREE.BoxGeometry(2.4,.55,.12),MS.leatherD,0,.55,sofaZ+.39));// back
    for(let s=-1;s<=1;s+=2)scene.add(mk(new THREE.BoxGeometry(.14,.45,.8),MS.leatherD,s*1.13,.35,sofaZ));// arms
    // Tufted buttons (chesterfield style)
    for(let bx=-3;bx<=3;bx++)for(let by=0;by<2;by++){scene.add(mk(new THREE.SphereGeometry(.02,6,6),MS.button,bx*.3,.45+by*.18,sofaZ+.44));}
    // Legs
    for(let lx of[-1,1])for(let lz of[-1,1])scene.add(mk(new THREE.SphereGeometry(.04,6,6),MS.dkW,lx*1,.04,sofaZ+lz*.35));
    // Cushions
    scene.add(mk(new THREE.BoxGeometry(.45,.22,.35),new THREE.MeshStandardMaterial({color:"#8A5838",roughness:.8}),-0.7,.48,sofaZ-.15));
    scene.add(mk(new THREE.BoxGeometry(.4,.2,.32),new THREE.MeshStandardMaterial({color:wing?.accent||"#C17F59",roughness:.85}),.8,.46,sofaZ-.12));

    // ══ ARMCHAIRS (flanking fireplace) ══
    for(let s=-1;s<=1;s+=2){
      const ax=s*3.5,az=-2;
      scene.add(mk(new THREE.BoxGeometry(1,.3,.8),MS.leather,ax,.15,az));
      scene.add(mk(new THREE.BoxGeometry(1,.45,.1),MS.leatherD,ax,.45,az+.35));
      for(let as=-1;as<=1;as+=2)scene.add(mk(new THREE.BoxGeometry(.12,.35,.7),MS.leatherD,ax+as*.44,.3,az));
      for(let abx of[-1,1])for(let abz of[-1,1])scene.add(mk(new THREE.SphereGeometry(.03,6,6),MS.dkW,ax+abx*.4,.03,az+abz*.3));
    }

    // ══ COFFEE TABLE (between sofa and fireplace) ══
    scene.add(mk(new THREE.BoxGeometry(1.2,.04,.6),MS.dkW,0,.52,-.2));
    for(let cx of[-1,1])for(let cz of[-1,1])scene.add(mk(new THREE.CylinderGeometry(.03,.03,.5,6),MS.dkW,cx*.5,.25,-.2+cz*.22));
    scene.add(mk(new THREE.BoxGeometry(1.1,.02,.5),MS.gold,0,.54,-.2));

    // ══ MEMORY PLACEMENT — strict type routing ══
    // photo → wall frames (beside fireplace) + overmantel if first
    // album → open books on coffee table
    // video → cinema screen (with actual video playback if file available)
    // orb → floating spheres
    // journal/case → vinyl record sleeves
    const photoMems=mems.filter((m: any)=>m.type==="photo");
    const albumMems=mems.filter((m: any)=>m.type==="album");
    const videoMems=mems.filter((m: any)=>m.type==="video");
    const orbMems=mems.filter((m: any)=>m.type==="orb");
    const audioMems=mems.filter((m: any)=>m.type==="case");

    // ── PHOTO FRAMES: overmantel + wall frames ──
    if(photoMems.length>0){
      // First photo: large overmantel
      const om=photoMems[0];const t=paintTex(om);
      const omc=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.1),new THREE.MeshStandardMaterial({map:t,roughness:.8}));
      omc.position.set(fpX,2.4,fpZ+.05);omc.userData={memory:om};scene.add(omc);memMeshes.current.push(omc);
      scene.add(mk(new THREE.BoxGeometry(1.8,1.3,.1),MS.fG,fpX,2.4,fpZ+.02));
      scene.add(mk(new THREE.BoxGeometry(1.65,1.15,.02),MS.gold,fpX,2.4,fpZ+.08));
      const fpSp=new THREE.SpotLight("#FFF5E0",.8,5,Math.PI/7,.5,1.2);fpSp.position.set(fpX,rH-.2,fpZ+.5);fpSp.target.position.set(fpX,2.4,fpZ);scene.add(fpSp);scene.add(fpSp.target);
    }
    // Small mantel frame (second photo)
    if(photoMems.length>1){const pm=paintTex(photoMems[1]);const pf=new THREE.Mesh(new THREE.PlaneGeometry(.25,.2),new THREE.MeshStandardMaterial({map:pm,roughness:.8}));pf.position.set(fpX-.5,1.46,fpZ+.18);pf.userData={memory:photoMems[1]};scene.add(pf);memMeshes.current.push(pf);scene.add(mk(new THREE.BoxGeometry(.32,.27,.04),MS.fB,fpX-.5,1.46,fpZ+.15));}
    // Wall photos (3rd+ photos, on back wall beside fireplace)
    photoMems.slice(2,5).forEach((m: any,i: any)=>{
      const wy=2.2+Math.sin(i*.9)*.15,wz=-rL/2+.08;
      const xOff=i===0?-2.2:i===1?2.2:3.5;
      const t=paintTex(m);const cv=new THREE.Mesh(new THREE.PlaneGeometry(1,0.75),new THREE.MeshStandardMaterial({map:t,roughness:.8}));
      cv.position.set(xOff,wy,wz);cv.userData={memory:m};scene.add(cv);memMeshes.current.push(cv);
      scene.add(mk(new THREE.BoxGeometry(1.15,.9,.08),fMats[i%3],xOff,wy,wz-.02));
      scene.add(mk(new THREE.BoxGeometry(1.05,.8,.02),MS.gold,xOff,wy,wz+.04));
      const sp=new THREE.SpotLight("#FFF5E0",.7,5,Math.PI/8,.5,1.2);sp.position.set(xOff,rH-.2,wz+.8);sp.target.position.set(xOff,wy,wz);sp.castShadow=true;scene.add(sp);scene.add(sp.target);
    });

    // ── ALBUM: open books on coffee table ──
    albumMems.slice(0,3).forEach((m: any,i: any)=>{
      const t=paintTex(m);
      const albL=mk(new THREE.BoxGeometry(.35,.015,.45),MS.dkW,-.35+i*.35,.565,-.2);albL.rotation.z=.05;scene.add(albL);
      const albR=mk(new THREE.BoxGeometry(.35,.015,.45),MS.dkW,-.35+i*.35+.18,.565,-.2);albR.rotation.z=-.05;scene.add(albR);
      const pg=new THREE.Mesh(new THREE.PlaneGeometry(.28,.38),new THREE.MeshStandardMaterial({map:t,roughness:.85}));
      pg.rotation.x=-Math.PI/2+.05;pg.position.set(-.35+i*.35+.1,.58,-.2);pg.userData={memory:m};scene.add(pg);memMeshes.current.push(pg);
    });

    // ══ BOOKSHELVES (left wall, floor to ceiling) ══
    const bsX=-rW/2+.35;
    for(let shelf=0;shelf<5;shelf++){
      const sy=.35+shelf*.75;
      scene.add(mk(new THREE.BoxGeometry(.5,.06,rL-2),MS.dkW,bsX,sy,0));
      // Books
      for(let b=0;b<Math.floor((rL-2.5)/.25);b++){
        const bh=.2+Math.random()*.35;const bw2=.06+Math.random()*.04;
        scene.add(mk(new THREE.BoxGeometry(bw2,bh,.2+Math.random()*.08),new THREE.MeshStandardMaterial({color:`hsl(${b*25+shelf*40+Math.random()*20},${20+Math.random()*25}%,${30+Math.random()*25}%)`,roughness:.8}),bsX+.08,sy+.03+bh/2,-rL/2+1.2+b*.25));
      }
    }
    // Shelf frame
    scene.add(mk(new THREE.BoxGeometry(.55,rH-.2,.06),MS.dkW,bsX,rH/2,-rL/2+.1));
    scene.add(mk(new THREE.BoxGeometry(.55,rH-.2,.06),MS.dkW,bsX,rH/2,rL/2-.1));
    scene.add(mk(new THREE.BoxGeometry(.55,.06,rL-.1),MS.dkW,bsX,rH-.1,0));
    scene.add(mk(new THREE.BoxGeometry(.06,rH-.2,rL-.1),MS.dkW,bsX-.23,rH/2,0));

    // ══ CINEMA SCREEN (right wall) — plays actual video if available ══
    const scrX=rW/2-.2;
    scene.add(mk(new THREE.BoxGeometry(.08,2,3),MS.screen,scrX,2.2,0));
    scene.add(mk(new THREE.BoxGeometry(.04,.15,.15),MS.iron,scrX,1.15,0));
    if(videoMems.length>0){
      const vc=document.createElement("canvas");vc.width=384;vc.height=256;
      const vctx=vc.getContext("2d");
      const vtex=new THREE.CanvasTexture(vc);vtex.colorSpace=THREE.SRGBColorSpace;
      const scrMesh=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.8),new THREE.MeshBasicMaterial({map:vtex}));
      scrMesh.rotation.y=-Math.PI/2;scrMesh.position.set(scrX-.06,2.2,0);scrMesh.userData={memory:videoMems[0]};
      scene.add(scrMesh);memMeshes.current.push(scrMesh);
      // Try to create actual video element if dataUrl is a video blob
      let videoEl: HTMLVideoElement|null=null,screenImg: HTMLImageElement|null=null;
      const vm=videoMems[0];
      if(vm.dataUrl){
        if(vm.videoBlob){
          // Actual video file — create <video> element for frame drawing
          videoEl=document.createElement("video");
          videoEl.src=vm.dataUrl;videoEl.crossOrigin="anonymous";videoEl.loop=true;videoEl.muted=true;videoEl.playsInline=true;
          videoEl.play().catch(()=>{});
        }else{
          // Image uploaded as "video" display type — show as still
          const si=new Image();si.onload=()=>{screenImg=si;};si.src=vm.dataUrl;
        }
      }
      animTex.push({type:"video",canvas:vc,ctx:vctx,tex:vtex,mem:vm,w:384,h:256,phase:Math.random()*100,screenImg:()=>screenImg,videoEl:()=>videoEl});
      const scrGl=new THREE.PointLight(`hsl(${vm.hue},40%,60%)`,.15,4);scrGl.position.set(scrX-.5,2.2,0);scene.add(scrGl);
    }else{
      const idleC=document.createElement("canvas");idleC.width=384;idleC.height=256;const ic=idleC.getContext("2d")!;
      ic.fillStyle="#1A1A1A";ic.fillRect(0,0,384,256);ic.fillStyle="#333";ic.font="24px Georgia,serif";ic.textAlign="center";ic.fillText("No videos yet",192,128);
      const idleTex=new THREE.CanvasTexture(idleC);idleTex.colorSpace=THREE.SRGBColorSpace;
      const idleMesh=new THREE.Mesh(new THREE.PlaneGeometry(2.8,1.8),new THREE.MeshBasicMaterial({map:idleTex}));
      idleMesh.rotation.y=-Math.PI/2;idleMesh.position.set(scrX-.06,2.2,0);scene.add(idleMesh);
    }

    // ══ VINYL RECORD PLAYER (side table near right wall) ══
    const vpX=rW/2-1.5,vpZ=3;
    // Side table
    scene.add(mk(new THREE.BoxGeometry(.8,.04,.6),MS.dkW,vpX,.78,vpZ));
    for(let vl=-1;vl<=1;vl+=2)for(let vlz=-1;vlz<=1;vlz+=2)scene.add(mk(new THREE.CylinderGeometry(.03,.03,.75,6),MS.dkW,vpX+vl*.3,.38,vpZ+vlz*.22));
    // Player body
    scene.add(mk(new THREE.BoxGeometry(.55,.08,.45),MS.ltW,vpX,.84,vpZ));
    // Turntable disc
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.01,24),MS.vinyl);disc.position.set(vpX-.05,.89,vpZ);scene.add(disc);
    const discLabel=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.012,16),MS.vinylL);discLabel.position.set(vpX-.05,.895,vpZ);scene.add(discLabel);
    animTex.push({type:"disc",mesh:disc,label:discLabel});
    // Tonearm
    const arm=mk(new THREE.BoxGeometry(.18,.015,.02),MS.bronze,vpX+.12,.9,vpZ-.05);arm.rotation.y=-.3;scene.add(arm);
    // Audio memories as "record sleeves" leaning against table — show real image
    const audios=mems.filter((m: any)=>m.type==="journal"||m.type==="case");
    audios.slice(0,3).forEach((m: any,i: any)=>{
      const recTex=paintTex(m);
      const rec=new THREE.Mesh(new THREE.PlaneGeometry(.3,.3),new THREE.MeshStandardMaterial({map:recTex,roughness:.6}));
      rec.position.set(vpX+.5,.15+i*.01,vpZ-.3+i*.12);rec.rotation.z=.1+i*.05;rec.rotation.y=-Math.PI/4;
      rec.userData={memory:m};scene.add(rec);memMeshes.current.push(rec);
      // Record sleeve frame
      scene.add(mk(new THREE.BoxGeometry(.32,.32,.015),new THREE.MeshStandardMaterial({color:`hsl(${m.hue},${m.s}%,${Math.max(20,m.l-20)}%)`,roughness:.5}),vpX+.5,.15+i*.01,vpZ-.3+i*.12));
    });

    // ══ PERSIAN RUG (center) ══
    scene.add(mk(new THREE.BoxGeometry(4.5,.005,3.5),MS.rugB,0,.003,.5));
    scene.add(mk(new THREE.BoxGeometry(4.2,.007,3.2),MS.rug,0,.006,.5));
    scene.add(mk(new THREE.BoxGeometry(3.6,.008,2.6),MS.rugN,0,.008,.5));
    scene.add(mk(new THREE.BoxGeometry(3,.009,2),MS.rug,0,.01,.5));
    const rugMed=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.003,20),MS.rugB);rugMed.position.set(0,.013,.5);scene.add(rugMed);

    // ══ TABLE LAMPS ══
    for(let[lx,lz] of [[-rW/2+1.5,3],[rW/2-1.5,-3]]){
      // Side table
      scene.add(mk(new THREE.CylinderGeometry(.2,.25,.6,8),MS.dkW,lx,.3,lz));
      scene.add(mk(new THREE.CylinderGeometry(.28,.28,.04,10),MS.gold,lx,.62,lz));
      // Lamp
      scene.add(mk(new THREE.CylinderGeometry(.04,.06,.4,6),MS.bronze,lx,.82,lz));
      const shade=mk(new THREE.CylinderGeometry(.08,.14,.2,8,1,true),MS.lamp,lx,1.1,lz);scene.add(shade);
      const lampL=new THREE.PointLight("#FFE8C0",.35,4);lampL.position.set(lx,1.2,lz);scene.add(lampL);
      // Lamp glow halo
      const halo=new THREE.Mesh(new THREE.SphereGeometry(.25,8,8),MS.lampG);halo.position.set(lx,1.1,lz);scene.add(halo);
    }

    // ══ WALL SCONCES ══
    for(let s=-1;s<=1;s+=2){
      for(let sz of[-2,2]){
        scene.add(mk(new THREE.BoxGeometry(.07,.15,.07),MS.sconce,s*(rW/2-.04),3,sz));
        scene.add(mk(new THREE.CylinderGeometry(.045,.03,.07,6),MS.sconce,s*(rW/2-.08),3.15,sz));
        const bl=new THREE.Mesh(new THREE.SphereGeometry(.03,6,6),MS.glassG);bl.position.set(s*(rW/2-.08),3.22,sz);scene.add(bl);
        const sl=new THREE.PointLight("#FFE0B0",.2,3);sl.position.set(s*(rW/2-.15),3.1,sz);scene.add(sl);
      }
    }

    // ══ WINDOW (back-right corner) ══
    const winZ=-rL/2+.01,winX=rW/2-2;
    scene.add(mk(new THREE.PlaneGeometry(1.3,2.2),new THREE.MeshBasicMaterial({color:"#FFF8E0",transparent:true,opacity:.1}),winX,2.6,winZ));
    scene.add(mk(new THREE.BoxGeometry(1.7,2.6,.12),MS.trim,winX,2.6,winZ+.04));
    scene.add(mk(new THREE.BoxGeometry(.06,.02,1.4),MS.dkW,winX+.02,2.6,winZ+.03));
    const c1=new THREE.Mesh(new THREE.PlaneGeometry(.4,2.4),MS.curtain);c1.position.set(winX-.65,2.6,winZ+.03);scene.add(c1);
    const c2=new THREE.Mesh(new THREE.PlaneGeometry(.4,2.4),MS.curtain);c2.position.set(winX+.65,2.6,winZ+.03);scene.add(c2);
    const winSp=new THREE.SpotLight("#FFE8C0",.4,8,Math.PI/4,.5,1.5);winSp.position.set(winX,3,winZ+.5);winSp.target.position.set(winX,.5,winZ+2);scene.add(winSp);scene.add(winSp.target);

    // ══ PLANTS ══
    for(let[px2,pz2] of [[-rW/2+.8,rL/2-.8],[rW/2-.8,rL/2-.8],[-rW/2+.8,-rL/2+.8]]){
      scene.add(mk(new THREE.CylinderGeometry(.12,.16,.28,8),MS.pot,px2,.14,pz2));
      for(let lf=0;lf<6;lf++){const a=(lf/6)*Math.PI*2;const leaf=new THREE.Mesh(new THREE.SphereGeometry(.08+Math.random()*.04,5,5),lf%2?MS.plant:new THREE.MeshStandardMaterial({color:"#385828",roughness:.8}));leaf.position.set(px2+Math.cos(a)*.08,.35+Math.random()*.15,pz2+Math.sin(a)*.08);leaf.scale.y=.5;scene.add(leaf);}
      scene.add(mk(new THREE.SphereGeometry(.12,6,6),MS.plant,px2,.5,pz2));
    }

    // ── ORB: floating spheres ──
    orbMems.forEach((m: any,i: any)=>{
      const ox=-2+i*2,oy=1.5+Math.random()*.5,oz=3-i;
      let orbMat;
      if(m.dataUrl){const orbTex=paintTex(m);orbMat=new THREE.MeshStandardMaterial({map:orbTex,emissive:`hsl(${m.hue},${m.s}%,${m.l-15}%)`,emissiveIntensity:.3,transparent:true,opacity:.9,roughness:.15,metalness:.15});}
      else{orbMat=new THREE.MeshStandardMaterial({color:`hsl(${m.hue},${m.s}%,${m.l}%)`,emissive:`hsl(${m.hue},${m.s}%,${m.l-15}%)`,emissiveIntensity:.4,transparent:true,opacity:.85,roughness:.1,metalness:.2});}
      const sphere=new THREE.Mesh(new THREE.SphereGeometry(.16,14,14),orbMat);sphere.position.set(ox,oy,oz);sphere.userData={memory:m};scene.add(sphere);memMeshes.current.push(sphere);
      const inner=new THREE.Mesh(new THREE.SphereGeometry(.08,10,10),new THREE.MeshBasicMaterial({color:`hsl(${m.hue},${m.s+10}%,${m.l+15}%)`,transparent:true,opacity:.5}));inner.position.set(ox,oy,oz);scene.add(inner);
      const ol=new THREE.PointLight(`hsl(${m.hue},${m.s}%,${m.l}%)`,.3,2.5);ol.position.set(ox,oy,oz);scene.add(ol);
      animTex.push({type:"orb",mesh:sphere,inner,light:ol,baseY:oy,phase:Math.random()*Math.PI*2});
    });

    // ══ BACK-DOOR PORTAL — arched door at far wall leading back to corridor ══
    const bdZ=rL/2-.15;
    const bdMat=new THREE.MeshStandardMaterial({color:"#5A3E28",roughness:.42,metalness:.06});
    scene.add(mk(new THREE.BoxGeometry(.12,3.2,1.6),MS.trim,0,1.6,bdZ));// frame
    scene.add(mk(new THREE.BoxGeometry(.1,3,1.4),bdMat,0,1.5,bdZ));// door panel
    scene.add(mk(new THREE.BoxGeometry(.08,.16,1.7),MS.gold,0,3.25,bdZ));// header
    // Handle
    scene.add(mk(new THREE.SphereGeometry(.04,8,8),MS.handle,.5,1.5,bdZ-.04));
    // Glow around frame
    const bdGlow=new THREE.Mesh(new THREE.PlaneGeometry(1.8,3.4),new THREE.MeshBasicMaterial({color:"#FFE8C0",transparent:true,opacity:.04,side:THREE.DoubleSide}));
    bdGlow.position.set(0,1.7,bdZ);scene.add(bdGlow);
    animTex.push({type:"doorGlow",mesh:bdGlow});
    const bdLight=new THREE.PointLight("#FFE8C0",.2,3);bdLight.position.set(0,2,bdZ-.3);scene.add(bdLight);
    // Label
    const bdLabel=document.createElement("canvas");bdLabel.width=200;bdLabel.height=40;
    const blc=bdLabel.getContext("2d")!;blc.fillStyle="#C8A868";blc.font="14px Georgia,serif";blc.textAlign="center";blc.fillText("\u2190 Back to corridor",100,26);
    const blTex=new THREE.CanvasTexture(bdLabel);blTex.colorSpace=THREE.SRGBColorSpace;
    scene.add(mk(new THREE.PlaneGeometry(1.2,.24),new THREE.MeshBasicMaterial({map:blTex,transparent:true}),0,3.5,bdZ));
    // Clickable hit area
    const bdHit=new THREE.Mesh(new THREE.BoxGeometry(1.6,3.2,.3),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    bdHit.position.set(0,1.6,bdZ);bdHit.userData={isBackDoor:true};scene.add(bdHit);
    memMeshes.current.push(bdHit);// so raycaster picks it up

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
      // WASD + Arrow keys = camera-relative movement
      const k=keys.current;
      if(k["w"]||k["arrowup"])dir.z-=1;if(k["s"]||k["arrowdown"])dir.z+=1;
      if(k["a"]||k["arrowleft"])dir.x-=1;if(k["d"]||k["arrowright"])dir.x+=1;
      if(dir.length()>0){dir.normalize().multiplyScalar(spd);dir.applyAxisAngle(new THREE.Vector3(0,1,0),-lookA.current.yaw);posT.current.add(dir);}
      posT.current.x=Math.max(-rW/2+1,Math.min(rW/2-1,posT.current.x));posT.current.z=Math.max(-rL/2+1,Math.min(rL/2-1.5,posT.current.z));
      pos.current.lerp(posT.current,.1);camera.position.copy(pos.current);
      const ld=new THREE.Vector3(Math.sin(lookA.current.yaw)*Math.cos(lookA.current.pitch),Math.sin(lookA.current.pitch),-Math.cos(lookA.current.yaw)*Math.cos(lookA.current.pitch));
      camera.lookAt(camera.position.clone().add(ld));
      // Animate
      animTex.forEach(a=>{
        if(a.type==="fire"){a.light.intensity=.5+Math.sin(t*5)*.15+Math.sin(t*7.3)*.1;}
        if(a.type==="doorGlow"){a.mesh.material.opacity=.03+Math.sin(t*2)*.02;}
        if(a.type==="flame"){a.mesh.position.y=a.baseY+Math.sin(t*4+a.phase)*.06;a.mesh.scale.y=.8+Math.sin(t*6+a.phase)*.3;a.mesh.material.opacity=.5+Math.sin(t*5+a.phase)*.2;}
        if(a.type==="orb"){a.mesh.position.y=a.baseY+Math.sin(t*1.5+a.phase)*.1;a.inner.position.y=a.mesh.position.y;a.light.position.y=a.mesh.position.y;a.mesh.material.emissiveIntensity=.3+Math.sin(t*2+a.phase)*.15;}
        if(a.type==="disc"){a.mesh.rotation.y=t*.5;a.label.rotation.y=t*.5;}
        if(a.type==="video"){
          const cx=a.ctx,cw=a.w,ch=a.h,m=a.mem,ph=t*.5+a.phase;
          // Priority: actual video > still image > generated gradient
          const vEl=a.videoEl?a.videoEl():null;
          const sImg=a.screenImg?a.screenImg():null;
          if(vEl&&vEl.readyState>=2){
            // Draw actual video frame
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

    const onDown=(e: MouseEvent)=>{drag.current=false;prev.current={x:e.clientX,y:e.clientY};};
    const onMove=(e: MouseEvent)=>{const dx=e.clientX-prev.current.x,dy=e.clientY-prev.current.y;if(Math.abs(dx)>2||Math.abs(dy)>2)drag.current=true;
      if(e.buttons===1){lookT.current.yaw-=dx*.003;lookT.current.pitch=Math.max(-.5,Math.min(.5,lookT.current.pitch+dy*.003));prev.current={x:e.clientX,y:e.clientY};}
      const rect=el.getBoundingClientRect();const r2=new THREE.Raycaster();r2.setFromCamera(new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1),camera);
      const hits=r2.intersectObjects(memMeshes.current);
      if(hits.length>0&&hits[0].distance<12){hovMem.current=hits[0].object.userData.isBackDoor?hits[0].object.userData:hits[0].object.userData.memory;el.style.cursor="pointer";}else{hovMem.current=null;el.style.cursor="grab";}};
    const onCk=()=>{if(!drag.current&&hovMem.current){if(hovMem.current.isBackDoor)onMemoryClick("__back__");else onMemoryClick(hovMem.current);}};
    const onKD=(e: KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=true;if(["arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase()))e.preventDefault();};const onKU=(e: KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=false;};
    const onRs=()=>{w=el.clientWidth;h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();ren.setSize(w,h);};
    el.addEventListener("mousedown",onDown);el.addEventListener("mousemove",onMove);el.addEventListener("click",onCk);
    window.addEventListener("keydown",onKD);window.addEventListener("keyup",onKU);window.addEventListener("resize",onRs);
    return()=>{if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);el.removeEventListener("mousedown",onDown);el.removeEventListener("mousemove",onMove);el.removeEventListener("click",onCk);
      window.removeEventListener("keydown",onKD);window.removeEventListener("keyup",onKU);window.removeEventListener("resize",onRs);if(el.contains(ren.domElement))el.removeChild(ren.domElement);ren.dispose();};
  },[roomId]);
  return <div ref={mountRef} style={{width:"100%",height:"100%"}}/>;
}
