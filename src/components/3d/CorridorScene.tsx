"use client";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing, WingRoom } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";

// ═══ CORRIDOR — grand gallery hallway with ornate doors ═══
// ═══ CORRIDOR — luxurious wing-specific gallery ═══
export default function CorridorScene({wingId,rooms:roomsProp,onDoorHover,onDoorClick,hoveredDoor,wingData:wingDataProp}: {wingId: any,rooms?: WingRoom[],onDoorHover: any,onDoorClick: any,hoveredDoor: any,wingData?: Wing}){
  const mountRef=useRef<HTMLDivElement|null>(null),frameRef=useRef<number|null>(null);
  const wing=wingDataProp||DEFAULT_WINGS.find(w=>w.id===wingId)!;
  const rooms=roomsProp||[];
  const doorMeshes=useRef<any[]>([]);

  useEffect(()=>{
    const el=mountRef.current;if(!el)return;let w=el.clientWidth,h=el.clientHeight;
    const scene=new THREE.Scene();scene.background=new THREE.Color(wing.wall);
    const camera=new THREE.PerspectiveCamera(55,w/h,0.1,80);
    const ren=new THREE.WebGLRenderer({antialias:true});ren.setSize(w,h);ren.setPixelRatio(Math.min(window.devicePixelRatio,2));
    ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.6;
    el.appendChild(ren.domElement);
    scene.add(new THREE.HemisphereLight("#FFF2E0","#C4B8A0",.5));
    const sun=new THREE.DirectionalLight("#FFE8C0",1.4);sun.position.set(8,14,-3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);
    const fill=new THREE.DirectionalLight("#FFD8A8",.3);fill.position.set(-6,8,4);scene.add(fill);

    // ── WING LAYOUTS: each wing is a different museum section ──
    const cfg={
      family:{cW:9,cH:6,sp:8, rugC:"#7A2028",rugB:"#C8A040",accent:"#C17F59",
        floorPat:"herringbone",ceilStyle:"coffered",wallStyle:"warm_panels"},
      travel:{cW:7.5,cH:6.5,sp:7.5, rugC:"#1A2A48",rugB:"#B88828",accent:"#4A6741",
        floorPat:"marble_strip",ceilStyle:"vaulted_beams",wallStyle:"map_alcoves"},
      childhood:{cW:10,cH:5,sp:9, rugC:"#B0856A",rugB:"#E8C868",accent:"#B8926A",
        floorPat:"checkerboard",ceilStyle:"painted",wallStyle:"playful"},
      career:{cW:8,cH:7,sp:8, rugC:"#1A1A28",rugB:"#808080",accent:"#8B7355",
        floorPat:"dark_parquet",ceilStyle:"grid",wallStyle:"modern"},
      creativity:{cW:9.5,cH:5.8,sp:8.5, rugC:"#3A1848",rugB:"#D0A040",accent:"#9B6B8E",
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
    };

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
    // ── CEILING (varies by wing) ──
    const ceil=new THREE.Mesh(new THREE.PlaneGeometry(cW,cL),MS.ceil);ceil.rotation.x=Math.PI/2;ceil.position.set(0,cH,0);scene.add(ceil);
    if(C.ceilStyle==="coffered"){
      for(let i=0;i<Math.floor(cL/3);i++){const bz=-cL/2+1.5+i*3;scene.add(mk(new THREE.BoxGeometry(cW-.5,.18,.14),MS.trim,0,cH-.09,bz));}
      for(let s=-1;s<=1;s+=2)scene.add(mk(new THREE.BoxGeometry(.14,.18,cL-.5),MS.trim,s*(cW/2-1.5),cH-.09,0));
      // Rosettes at intersections
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
      scene.add(mk(new THREE.BoxGeometry(.05,1.4,cL-.4),MS.wain,s*(cW/2-.025),.7,0));
      scene.add(mk(new THREE.BoxGeometry(.06,.07,cL-.3),MS.gold,s*(cW/2-.03),1.43,0));
      scene.add(mk(new THREE.BoxGeometry(.08,.18,cL-.2),MS.dkW,s*(cW/2-.04),.09,0));
      scene.add(mk(new THREE.BoxGeometry(.08,.12,cL-.2),MS.gold,s*(cW/2-.04),cH-.06,0));
      // Wall panels between doors
      const pnl=Math.floor(cL/3);
      for(let p=0;p<pnl;p++)scene.add(mk(new THREE.BoxGeometry(.01,.55,1.4),MS.wainP,s*(cW/2-.01),.7,-cL/2+1.5+p*3));
    }
    // ── RUNNER RUG (layered, wing-colored) ──
    scene.add(mk(new THREE.BoxGeometry(2.4,.004,cL-5),MS.rugB,0,.003,0));
    scene.add(mk(new THREE.BoxGeometry(2,.007,cL-5.5),MS.rug,0,.006,0));
    scene.add(mk(new THREE.BoxGeometry(1.4,.009,cL-6),MS.rugB,0,.008,0));
    // ── CHANDELIERS ──
    const nCh=Math.max(2,Math.ceil(cL/14));
    for(let ci=0;ci<nCh;ci++){const cz=-cL/2+cL/(nCh+1)*(ci+1);
      scene.add(mk(new THREE.CylinderGeometry(.015,.015,.35,6),MS.bronze,0,cH-.18,cz));
      const tr=new THREE.Mesh(new THREE.TorusGeometry(.4,.03,8,18),MS.bronze);tr.position.set(0,cH-.4,cz);scene.add(tr);
      const tr2=new THREE.Mesh(new THREE.TorusGeometry(.25,.015,8,12),MS.gold);tr2.position.set(0,cH-.38,cz);scene.add(tr2);
      for(let b=0;b<5;b++){const ba=(b/5)*Math.PI*2;
        scene.add(mk(new THREE.CylinderGeometry(.01,.008,.06,4),MS.sconce,Math.cos(ba)*.38,cH-.38,cz+Math.sin(ba)*.38));
        const bl=new THREE.Mesh(new THREE.SphereGeometry(.025,5,5),MS.glassG);bl.position.set(Math.cos(ba)*.38,cH-.32,cz+Math.sin(ba)*.38);scene.add(bl);}
      scene.add(new THREE.PointLight("#FFE8C0",.6,8).translateY(cH-.45).translateZ(cz));
    }
    // ── SCONCES between door zones ──
    for(let s of[-1,1])for(let i=0;i<=rooms.length;i++){
      const sz=-cL/2+3+i*C.sp;if(sz>cL/2-2)continue;
      scene.add(mk(new THREE.BoxGeometry(.06,.14,.06),MS.sconce,s*(cW/2-.03),3,sz));
      scene.add(mk(new THREE.CylinderGeometry(.04,.03,.06,6),MS.sconce,s*(cW/2-.06),3.12,sz));
      const bl=new THREE.Mesh(new THREE.SphereGeometry(.025,6,6),MS.glassG);bl.position.set(s*(cW/2-.06),3.2,sz);scene.add(bl);
      scene.add(new THREE.PointLight("#FFE0B0",.15,3).translateX(s*(cW/2-.15)).translateY(3.1).translateZ(sz));
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
    // ── PAINTINGS (flat on wall, between doors) ──
    const pZ=[];for(let i=0;i<Math.min(3,rooms.length);i++){const pz=-cL/2+3+i*C.sp+C.sp/2;if(pz<cL/2-3)pZ.push(pz);}
    pZ.forEach((pz,idx)=>{
      const s=idx%2===0?1:-1;const fx=s*(cW/2-.005);const pw=1.6,ph2b=1.1;
      // Frame
      scene.add(mk(new THREE.BoxGeometry(.04,ph2b+.18,.04),MS.fG,fx,2.6,pz-pw/2-.09));
      scene.add(mk(new THREE.BoxGeometry(.04,ph2b+.18,.04),MS.fG,fx,2.6,pz+pw/2+.09));
      scene.add(mk(new THREE.BoxGeometry(.04,.04,pw+.22),MS.fG,fx,2.6-ph2b/2-.09,pz));
      scene.add(mk(new THREE.BoxGeometry(.04,.04,pw+.22),MS.fG,fx,2.6+ph2b/2+.09,pz));
      const cv=document.createElement("canvas");cv.width=400;cv.height=280;const cx=cv.getContext("2d")!;
      const hue=parseInt(wing.accent.slice(1),16)%360;
      const g=cx.createLinearGradient(0,0,400,280);g.addColorStop(0,`hsl(${(hue+idx*50)%360},35%,55%)`);g.addColorStop(1,`hsl(${(hue+idx*50+35)%360},25%,42%)`);
      cx.fillStyle=g;cx.fillRect(0,0,400,280);
      for(let b=0;b<12;b++){cx.fillStyle=`hsla(${(hue+idx*50+b*20)%360},30%,${50+Math.random()*15}%,.06)`;cx.fillRect(Math.random()*400-40,Math.random()*280-8,90+Math.random()*100,5);}
      const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
      const pm=new THREE.Mesh(new THREE.PlaneGeometry(pw,ph2b),new THREE.MeshStandardMaterial({map:tex,roughness:.8}));
      pm.rotation.y=s*(-Math.PI/2);pm.position.set(fx-(s*.003),2.6,pz);scene.add(pm);
      scene.add(new THREE.SpotLight("#FFF5E0",.5,4,Math.PI/7,.5,1).translateX(fx-(s*.4)).translateY(cH-.2).translateZ(pz));
    });
    // ── PLANTS at ends ──
    for(let pz of[-cL/2+1.5,cL/2-1.5])for(let px of[-cW/2+.8,cW/2-.8]){
      scene.add(mk(new THREE.CylinderGeometry(.12,.16,.25,8),MS.bronze,px,.12,pz));
      for(let lf=0;lf<5;lf++){const a=(lf/5)*Math.PI*2;scene.add(mk(new THREE.SphereGeometry(.08,5,5),new THREE.MeshStandardMaterial({color:"#4A7838",roughness:.85}),px+Math.cos(a)*.08,.35+Math.random()*.12,pz+Math.sin(a)*.08));}
    }

    // ══ DOORS ══
    const dMeshes: any[]=[];
    rooms.forEach((room: any,i: any)=>{
      const side=i%2===0?-1:1;
      const z=-cL/2+5.5+i*C.sp;
      const wx=side*(cW/2);
      const dW=1.7,dH=3.4;
      // Frame (flush on wall)
      scene.add(mk(new THREE.BoxGeometry(.05,dH+.3,.28),MS.trim,wx-(side*.025),dH/2+.15,z-dW/2-.14));
      scene.add(mk(new THREE.BoxGeometry(.05,dH+.3,.28),MS.trim,wx-(side*.025),dH/2+.15,z+dW/2+.14));
      scene.add(mk(new THREE.BoxGeometry(.05,.28,dW+.56),MS.trim,wx-(side*.025),dH+.44,z));
      // Gold capitals + keystone
      scene.add(mk(new THREE.BoxGeometry(.04,.08,.32),MS.gold,wx-(side*.02),dH+.05,z-dW/2-.14));
      scene.add(mk(new THREE.BoxGeometry(.04,.08,.32),MS.gold,wx-(side*.02),dH+.05,z+dW/2+.14));
      scene.add(mk(new THREE.BoxGeometry(.05,.16,.18),MS.gold,wx-(side*.02),dH+.62,z));
      // Recess (thin dark alcove)
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
      scene.add(new THREE.PointLight(`hsl(${room.coverHue},35%,60%)`,.18,3).translateX(wx-(side*.4)).translateY(dH/2).translateZ(z));
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

    // ══ EXIT PORTAL ══
    const portalZ=cL/2-1.2;
    const portalMat=new THREE.MeshStandardMaterial({color:"#C8A868",emissive:"#C8A868",emissiveIntensity:.2,roughness:.3,metalness:.5});
    scene.add(mk(new THREE.BoxGeometry(.2,3.5,.2),portalMat,-1,1.75,portalZ));
    scene.add(mk(new THREE.BoxGeometry(.2,3.5,.2),portalMat,1,1.75,portalZ));
    scene.add(mk(new THREE.BoxGeometry(2.2,.2,.2),portalMat,0,3.55,portalZ));
    scene.add(mk(new THREE.BoxGeometry(2,.08,.15),MS.gold,0,3.68,portalZ));
    const portalGlow=new THREE.Mesh(new THREE.PlaneGeometry(1.8,3.2),new THREE.MeshBasicMaterial({color:"#FFF8E0",transparent:true,opacity:.05,side:THREE.DoubleSide}));
    portalGlow.position.set(0,1.8,portalZ);scene.add(portalGlow);
    const portalLight=new THREE.PointLight("#FFE8C0",.4,5);portalLight.position.set(0,2.2,portalZ);scene.add(portalLight);
    const portalHit=new THREE.Mesh(new THREE.BoxGeometry(1.8,3.2,.3),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));
    portalHit.position.set(0,1.8,portalZ);scene.add(portalHit);
    const plC=document.createElement("canvas");plC.width=200;plC.height=36;const plx=plC.getContext("2d")!;
    plx.fillStyle="#C8A868";plx.font="bold 14px Georgia,serif";plx.textAlign="center";plx.fillText("\u2190 Entrance Hall",100,24);
    const plT=new THREE.CanvasTexture(plC);plT.colorSpace=THREE.SRGBColorSpace;
    scene.add(mk(new THREE.PlaneGeometry(1.4,.25),new THREE.MeshBasicMaterial({map:plT,transparent:true}),0,3.85,portalZ));

    // Dust
    const rdN=70,rdG=new THREE.BufferGeometry(),rdP=new Float32Array(rdN*3);
    for(let i=0;i<rdN;i++){rdP[i*3]=(Math.random()-.5)*cW;rdP[i*3+1]=.5+Math.random()*cH;rdP[i*3+2]=(Math.random()-.5)*cL;}
    rdG.setAttribute("position",new THREE.BufferAttribute(rdP,3));
    scene.add(new THREE.Points(rdG,new THREE.PointsMaterial({color:"#FFF8E0",size:.03,transparent:true,opacity:.25,blending:THREE.AdditiveBlending,depthWrite:false})));

    // ── CAMERA + CONTROLS ──
    camera.position.set(0,1.7,cL/2-3);
    const lookA={yaw:0,pitch:0},lookT={yaw:0,pitch:0};
    const pos=camera.position.clone(),posT=pos.clone();
    const keys: Record<string,boolean>={},drag={v:false},prev={x:0,y:0};let hovDoor: string|null=null;
    const clock=new THREE.Clock();
    const animate=()=>{
      frameRef.current=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),t=clock.getElapsedTime();
      lookA.yaw+=(lookT.yaw-lookA.yaw)*.08;lookA.pitch+=(lookT.pitch-lookA.pitch)*.08;
      const spd=3*dt,dir=new THREE.Vector3();
      // WASD + Arrow keys = camera-relative movement
      if(keys.w||keys.arrowup)dir.z-=1;if(keys.s||keys.arrowdown)dir.z+=1;
      if(keys.a||keys.arrowleft)dir.x-=1;if(keys.d||keys.arrowright)dir.x+=1;
      if(dir.length()>0){dir.normalize().multiplyScalar(spd);dir.applyAxisAngle(new THREE.Vector3(0,1,0),-lookA.yaw);posT.add(dir);}
      posT.x=Math.max(-cW/2+1,Math.min(cW/2-1,posT.x));posT.z=Math.max(-cL/2+1.5,Math.min(cL/2-1.5,posT.z));
      pos.lerp(posT,.1);camera.position.copy(pos);
      const ld=new THREE.Vector3(Math.sin(lookA.yaw)*Math.cos(lookA.pitch),Math.sin(lookA.pitch),-Math.cos(lookA.yaw)*Math.cos(lookA.pitch));
      camera.lookAt(camera.position.clone().add(ld));
      dMeshes.forEach(d=>{const isH=hovDoor===d.room.id;d.mat.emissive=isH?new THREE.Color(wing.accent):new THREE.Color(0);d.mat.emissiveIntensity=isH?.12+Math.sin(t*3)*.04:0;});
      portalGlow.material.opacity=.04+Math.sin(t*2)*.02;portalLight.intensity=.35+Math.sin(t*1.5)*.1;
      const dp=rdG.attributes.position.array;for(let i=0;i<rdN;i++){dp[i*3+1]+=Math.sin(t*.2+i*.5)*.002;if(dp[i*3+1]>cH)dp[i*3+1]=.5;}rdG.attributes.position.needsUpdate=true;
      ren.render(scene,camera);
    };animate();
    const onDown=(e: MouseEvent)=>{drag.v=false;prev.x=e.clientX;prev.y=e.clientY;};
    const onMove=(e: MouseEvent)=>{const dx=e.clientX-prev.x,dy=e.clientY-prev.y;if(Math.abs(dx)>2||Math.abs(dy)>2)drag.v=true;
      if(e.buttons===1){lookT.yaw-=dx*.003;lookT.pitch=Math.max(-.4,Math.min(.4,lookT.pitch+dy*.003));prev.x=e.clientX;prev.y=e.clientY;}
      const rect=el.getBoundingClientRect();const rc=new THREE.Raycaster();rc.setFromCamera(new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1),camera);
      let found=null;let portalHov=false;
      dMeshes.forEach(d=>{const hits=rc.intersectObject(d.mesh);if(hits.length>0&&hits[0].distance<5)found=d.room.id;});
      const ph2=rc.intersectObject(portalHit);if(ph2.length>0&&ph2[0].distance<5)portalHov=true;
      hovDoor=found;el.style.cursor=(found||portalHov)?"pointer":"grab";onDoorHover(found||(portalHov?"__portal__":null));};
    const onCk=()=>{if(!drag.v&&hovDoor)onDoorClick(hovDoor);else if(!drag.v){
      const rect2=el.getBoundingClientRect();const rc2=new THREE.Raycaster();rc2.setFromCamera(new THREE.Vector2(((prev.x-rect2.left)/rect2.width)*2-1,-((prev.y-rect2.top)/rect2.height)*2+1),camera);
      const ph3=rc2.intersectObject(portalHit);if(ph3.length>0&&ph3[0].distance<5)onDoorClick("__portal__");}};
    const onKD=(e: KeyboardEvent)=>{keys[e.key.toLowerCase()]=true;if(["arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase()))e.preventDefault();};
    const onKU=(e: KeyboardEvent)=>{keys[e.key.toLowerCase()]=false;};
    const onRs=()=>{w=el.clientWidth;h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();ren.setSize(w,h);};
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
          // Bottom-left 25% = virtual joystick
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
            else{const ph=rc.intersectObject(portalHit);if(ph.length>0&&ph[0].distance<5)onDoorClick("__portal__");}
          }
          touchLookId=null;
        }
      }
    };
    // Patch keys to include virtual joystick
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
      if(el.contains(ren.domElement))el.removeChild(ren.domElement);ren.dispose();};
  },[wingId]);
  return <div ref={mountRef} style={{width:"100%",height:"100%"}}/>;
}
