"use client";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";

// ═══ EXTERIOR — Fantasy Castle ═══
export default function ExteriorScene({onRoomHover,onRoomClick,hoveredRoom,wings:wingsProp}: {onRoomHover: any,onRoomClick: any,hoveredRoom: any,wings?: Wing[]}){
  const WINGS = wingsProp || DEFAULT_WINGS;
  const mountRef=useRef<HTMLDivElement|null>(null),frameRef=useRef<number|null>(null);
  const camO=useRef({theta:Math.PI*.25,phi:Math.PI*.28}),camOT=useRef({theta:Math.PI*.25,phi:Math.PI*.28}),camD=useRef(90);
  const drag=useRef(false),prev=useRef({x:0,y:0}),mse=useRef(new THREE.Vector2()),ray=useRef(new THREE.Raycaster());
  const hoveredRoomRef=useRef(hoveredRoom);

  // Keep hoveredRoom ref in sync so the animation loop always reads the latest value
  useEffect(()=>{hoveredRoomRef.current=hoveredRoom;},[hoveredRoom]);

  useEffect(()=>{
    const el=mountRef.current;if(!el)return;let w=el.clientWidth,h=el.clientHeight;
    const scene=new THREE.Scene();scene.fog=new THREE.FogExp2("#C8B8A0",.0018);
    // ── GOLDEN HOUR SKY ──
    const skyGeo=new THREE.SphereGeometry(500,48,32);
    const skyC=document.createElement("canvas");skyC.width=2048;skyC.height=1024;
    const skx=skyC.getContext("2d")!;
    const skyG=skx.createLinearGradient(0,0,0,1024);
    skyG.addColorStop(0,"#1A2850");skyG.addColorStop(.08,"#2A4878");skyG.addColorStop(.18,"#3A6898");
    skyG.addColorStop(.3,"#5A98C0");skyG.addColorStop(.42,"#88B8D8");skyG.addColorStop(.52,"#B0D0E0");
    skyG.addColorStop(.6,"#D0DDE0");skyG.addColorStop(.7,"#E8D8C0");skyG.addColorStop(.8,"#F0C898");
    skyG.addColorStop(.88,"#E8A870");skyG.addColorStop(.94,"#D08850");skyG.addColorStop(1,"#B07040");
    skx.fillStyle=skyG;skx.fillRect(0,0,2048,1024);
    // Layered clouds with depth
    for(let layer=0;layer<4;layer++){
      const yBase=60+layer*50,alpha=.04+layer*.015;
      for(let ci=0;ci<25;ci++){
        skx.fillStyle=`rgba(255,${245-layer*10},${230-layer*15},${alpha+Math.random()*.03})`;
        skx.beginPath();
        skx.ellipse(Math.random()*2048,yBase+Math.random()*60,60+Math.random()*120,4+Math.random()*8,Math.random()*.3,0,Math.PI*2);
        skx.fill();
      }
    }
    // Sun with dramatic rays
    const sunX=1400,sunY=780;
    for(let r=0;r<5;r++){
      const rad=80+r*60,a=.12-.02*r;
      const sg=skx.createRadialGradient(sunX,sunY,0,sunX,sunY,rad);
      sg.addColorStop(0,`rgba(255,248,220,${a})`);sg.addColorStop(.5,`rgba(255,220,160,${a*.6})`);sg.addColorStop(1,"rgba(255,200,120,0)");
      skx.fillStyle=sg;skx.fillRect(0,0,2048,1024);
    }
    // God rays
    for(let gr=0;gr<8;gr++){
      const angle=-Math.PI*.6+gr*.15;const len=400;
      skx.strokeStyle=`rgba(255,240,200,${.02+Math.random()*.02})`;
      skx.lineWidth=8+Math.random()*12;skx.beginPath();
      skx.moveTo(sunX,sunY);skx.lineTo(sunX+Math.cos(angle)*len,sunY+Math.sin(angle)*len);skx.stroke();
    }
    // Stars in upper sky
    for(let si=0;si<60;si++){
      skx.fillStyle=`rgba(255,255,240,${.03+Math.random()*.05})`;
      skx.beginPath();skx.arc(Math.random()*2048,Math.random()*200,Math.random()*1.5,.0,Math.PI*2);skx.fill();
    }
    const skyTex=new THREE.CanvasTexture(skyC);skyTex.colorSpace=THREE.SRGBColorSpace;
    scene.add(new THREE.Mesh(skyGeo,new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide})));

    const camera=new THREE.PerspectiveCamera(32,w/h,0.1,600);
    const ren=new THREE.WebGLRenderer({antialias:true});ren.setSize(w,h);ren.setPixelRatio(Math.min(window.devicePixelRatio,2));
    ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.9;
    el.appendChild(ren.domElement);

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
      // Castle stones — warm cream/sandstone palette
      stone:new THREE.MeshStandardMaterial({color:"#E8DDD0",roughness:.7,metalness:.02}),
      stoneL:new THREE.MeshStandardMaterial({color:"#F2EAE0",roughness:.65}),
      stoneW:new THREE.MeshStandardMaterial({color:"#F0E4D4",roughness:.6}),
      stoneD:new THREE.MeshStandardMaterial({color:"#C8B8A4",roughness:.72,metalness:.04}),
      stoneDk:new THREE.MeshStandardMaterial({color:"#A8987C",roughness:.75}),
      // Trims and gold
      trim:new THREE.MeshStandardMaterial({color:"#D8C8B0",roughness:.45,metalness:.12}),
      gold:new THREE.MeshStandardMaterial({color:"#C8A858",roughness:.22,metalness:.65}),
      goldBright:new THREE.MeshStandardMaterial({color:"#E0C060",roughness:.18,metalness:.7}),
      bronze:new THREE.MeshStandardMaterial({color:"#8A7050",roughness:.3,metalness:.5}),
      copper:new THREE.MeshStandardMaterial({color:"#6A9880",roughness:.25,metalness:.45}),
      // Roofs
      roof:new THREE.MeshStandardMaterial({color:"#607858",roughness:.4,metalness:.2}),
      roofD:new THREE.MeshStandardMaterial({color:"#506848",roughness:.45,metalness:.18}),
      roofSlate:new THREE.MeshStandardMaterial({color:"#708068",roughness:.35,metalness:.22}),
      tile:new THREE.MeshStandardMaterial({color:"#C07048",roughness:.55,metalness:.04}),
      // Architectural
      col:new THREE.MeshStandardMaterial({color:"#F0E8DC",roughness:.35,metalness:.08}),
      marble:new THREE.MeshStandardMaterial({color:"#F4EEE4",roughness:.15,metalness:.05}),
      marbleVein:new THREE.MeshStandardMaterial({color:"#E8DED0",roughness:.2,metalness:.06}),
      // Windows — warm glow
      win:new THREE.MeshStandardMaterial({color:"#FFF8E0",emissive:"#FFF0C0",emissiveIntensity:.35,roughness:.05,transparent:true,opacity:.6}),
      winBlue:new THREE.MeshStandardMaterial({color:"#C0D8F0",emissive:"#A0C0E8",emissiveIntensity:.15,roughness:.08,transparent:true,opacity:.5}),
      // Woodwork
      door:new THREE.MeshStandardMaterial({color:"#5A3018",roughness:.45,metalness:.05}),
      doorRich:new THREE.MeshStandardMaterial({color:"#6A3820",roughness:.4,metalness:.08}),
      // Nature
      grass:new THREE.MeshStandardMaterial({color:"#5A8840",roughness:.82}),
      grassL:new THREE.MeshStandardMaterial({color:"#6A9C48",roughness:.85}),
      grassD:new THREE.MeshStandardMaterial({color:"#488030",roughness:.8}),
      grassRich:new THREE.MeshStandardMaterial({color:"#4A7830",roughness:.82}),
      water:new THREE.MeshStandardMaterial({color:"#6898B8",roughness:.02,metalness:.25,transparent:true,opacity:.6}),
      waterDeep:new THREE.MeshStandardMaterial({color:"#506880",roughness:.05,metalness:.2,transparent:true,opacity:.7}),
      path:new THREE.MeshStandardMaterial({color:"#D8C8A8",roughness:.82}),
      pathD:new THREE.MeshStandardMaterial({color:"#C0B090",roughness:.78}),
      hedge:new THREE.MeshStandardMaterial({color:"#2A5820",roughness:.85}),
      hedgeL:new THREE.MeshStandardMaterial({color:"#3A6828",roughness:.82}),
      flower:new THREE.MeshStandardMaterial({color:"#D870A0",roughness:.8}),
      flowerY:new THREE.MeshStandardMaterial({color:"#E8C040",roughness:.8}),
      flowerW:new THREE.MeshStandardMaterial({color:"#F0E8E0",roughness:.8}),
      flowerLav:new THREE.MeshStandardMaterial({color:"#9878B8",roughness:.8}),
      bark:new THREE.MeshStandardMaterial({color:"#6A5438",roughness:.7}),
      barkD:new THREE.MeshStandardMaterial({color:"#5A4428",roughness:.72}),
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
      const ct=new THREE.Mesh(new THREE.BoxGeometry(eW+4,eH+6,tLen+4),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
      const mid=att+tLen/2;ct.position.set(Math.sin(angle)*mid,eH/2+2,Math.cos(angle)*mid);ct.rotation.y=angle;
      ct.userData={roomId:def.room.id,wingMeshes,accent:def.room.accent};
      scene.add(ct);clickTargets.push(ct);
    });

    // ══════════════════════════════════════════
    // COURTYARD GARDENS — grand formal parterre
    // ══════════════════════════════════════════

    // Grand tiered fountain (3 levels)
    const fX=0,fZ=-18;
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
    const parterreData=[[-12,-12],[12,-12],[-12,-24],[12,-24],[-18,-18],[18,-18]];
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
    const topPositions=[[-7,-8,"cone"],[7,-8,"cone"],[-7,-28,"ball"],[7,-28,"ball"],[-20,-10,"spiral"],[20,-10,"spiral"],[-20,-26,"cone"],[20,-26,"cone"]];
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
    for(const[ux,uz]of[[-5,-8],[5,-8],[-5,-28],[5,-28],[-15,-8],[15,-8],[-15,-28],[15,-28]]){
      scene.add(mk(new THREE.BoxGeometry(.5,.5,.5),M.marble,ux,.25,uz));
      scene.add(mk(new THREE.BoxGeometry(.6,.1,.6),M.trim,ux,.52,uz));
      scene.add(mk(new THREE.CylinderGeometry(.18,.25,.7,8),M.marble,ux,.9,uz));
      scene.add(mk(new THREE.CylinderGeometry(.12,.18,.4,8),M.bronze,ux,1.35,uz));
      // Flowers spilling from urn
      scene.add(mk(new THREE.SphereGeometry(.2,6,6),M.flowerLav,ux+.1,1.6,uz));
      scene.add(mk(new THREE.SphereGeometry(.15,6,6),M.flower,ux-.1,1.55,uz+.1));
    }

    // Stone benches
    for(const[bx,bz]of[[-9,-18],[9,-18]]){
      scene.add(mk(new THREE.BoxGeometry(2.5,.06,1),M.marble,bx,.54,bz));
      scene.add(mk(new THREE.BoxGeometry(2.5,.35,.7),M.marbleVein,bx,.18+.17,bz));
      for(const s of[-.9,.9])scene.add(mk(new THREE.BoxGeometry(.4,.35,.7),M.stoneD,bx+s,.18+.17,bz));
    }

    // Gravel paths (radiating)
    for(let pi=0;pi<25;pi++)scene.add(mk(new THREE.BoxGeometry(3.5,.05,.7),M.pathD,0,.04,-7-pi*1.3));

    // ══════════════════════════════════════════
    // TUSCAN LANDSCAPE — dramatically improved
    // ══════════════════════════════════════════

    // Distant rolling hills with varied shapes and layers
    const hillLayers=[
      // Far background hills
      {dist:350,count:8,rMin:100,rMax:180,hMin:4,hMax:8,colors:["#4A6838","#3A5828","#506840","#445830"]},
      // Mid-distance hills
      {dist:220,count:12,rMin:60,rMax:120,hMin:3,hMax:7,colors:["#5A7840","#4A6830","#5A8838","#6A8848"]},
      // Near hills
      {dist:140,count:10,rMin:40,rMax:80,hMin:2,hMax:5,colors:["#6A9848","#5A8840","#7AA850","#6A9040"]},
    ];
    hillLayers.forEach(layer=>{
      for(let i=0;i<layer.count;i++){
        const angle=((i/layer.count)+Math.random()*.1)*Math.PI*2;
        const dist=layer.dist+Math.random()*60-30;
        const hx=Math.cos(angle)*dist,hz=Math.sin(angle)*dist-60;
        const hr=layer.rMin+Math.random()*(layer.rMax-layer.rMin);
        const hh=layer.hMin+Math.random()*(layer.hMax-layer.hMin);
        const col=layer.colors[i%layer.colors.length];
        const hm=new THREE.Mesh(new THREE.SphereGeometry(hr,20,14),new THREE.MeshStandardMaterial({color:col,roughness:.88}));
        hm.position.set(hx,-hr+hh+Math.random()*2,hz);hm.scale.y=.08+Math.random()*.04;
        hm.receiveShadow=true;scene.add(hm);
      }
    });

    // Patchwork agricultural fields (golden wheat, green crops, lavender, sunflowers)
    const fieldColors=["#C8B848","#D8C850","#98B838","#B8A840","#88A830","#D0C058","#A8C048","#B8A038",
      "#9878B0","#D8C040","#78A028","#E0C848","#C0A838","#8898C0","#A8B830","#C8B040"];
    for(let fi=0;fi<70;fi++){
      const angle=Math.random()*Math.PI*2;
      const dist=90+Math.random()*280;
      const fx=Math.cos(angle)*dist,fz=Math.sin(angle)*dist-40;
      if(Math.sqrt(fx*fx+(fz+40)*(fz+40))<80)continue;// skip palace area
      const fw=15+Math.random()*35,fl=10+Math.random()*28;
      const fm=new THREE.Mesh(new THREE.PlaneGeometry(fw,fl),new THREE.MeshStandardMaterial({color:fieldColors[fi%fieldColors.length],roughness:.85}));
      fm.rotation.x=-Math.PI/2;fm.position.set(fx,.15+Math.random()*.5,fz);fm.rotation.z=Math.random()*.6-.3;scene.add(fm);
    }

    // Vineyard rows — more numerous and organized
    const vineM=[new THREE.MeshStandardMaterial({color:"#3A5828",roughness:.85}),new THREE.MeshStandardMaterial({color:"#4A6830",roughness:.82})];
    for(let vi=0;vi<8;vi++){
      const vAngle=Math.random()*Math.PI*2;
      const vDist=100+vi*35+Math.random()*20;
      const vx=Math.cos(vAngle)*vDist,vz=Math.sin(vAngle)*vDist-40;
      if(Math.sqrt(vx*vx+(vz+40)*(vz+40))<90)continue;
      const vRot=vAngle+Math.PI/2+Math.random()*.3-.15;
      for(let row=0;row<20;row++){
        const rm=mk(new THREE.BoxGeometry(.4,.8,18+Math.random()*8),vineM[row%2],vx+Math.cos(vRot)*row*2.2,.4,vz+Math.sin(vRot)*row*2.2);
        rm.rotation.y=vRot;scene.add(rm);
      }
    }

    // Cypress trees — THE Tuscan signature, many more, clustered along roads and ridges
    const cypressPositions: number[][]=[];
    // Line along winding road
    for(let ri=0;ri<35;ri++){
      const rz=-45-ri*9;const rx=Math.sin(ri*.25)*25;
      if(Math.random()>.4)cypressPositions.push([rx-4+Math.random()*2,rz+Math.random()*3]);
      if(Math.random()>.4)cypressPositions.push([rx+4+Math.random()*2,rz+Math.random()*3]);
    }
    // Clusters on hilltops
    for(let ci=0;ci<20;ci++){
      const angle=Math.random()*Math.PI*2,dist=60+Math.random()*200;
      cypressPositions.push([Math.cos(angle)*dist,Math.sin(angle)*dist-50]);
    }
    // Groups of 3-5 on ridges
    for(let g=0;g<8;g++){
      const gx=-180+Math.random()*360,gz=-80-Math.random()*250;
      for(let t=0;t<3+Math.floor(Math.random()*3);t++){
        cypressPositions.push([gx+Math.random()*6-3,gz+Math.random()*6-3]);
      }
    }
    cypressPositions.forEach(([cx,cz])=>{
      if(Math.sqrt(cx*cx+cz*cz)<45)return;// skip courtyard
      const ch=5+Math.random()*5;
      scene.add(mk(new THREE.CylinderGeometry(.12,.2,ch*.2,6),M.barkD,cx,ch*.1,cz));
      const cone=new THREE.Mesh(new THREE.ConeGeometry(.5+Math.random()*.25,ch,7),
        new THREE.MeshStandardMaterial({color:`hsl(${125+Math.random()*15},${38+Math.random()*12}%,${22+Math.random()*10}%)`,roughness:.85}));
      cone.position.set(cx,ch*.55,cz);cone.castShadow=true;scene.add(cone);
    });

    // Olive trees — gnarled trunks, silver-green canopies
    for(let oi=0;oi<24;oi++){
      const angle=Math.random()*Math.PI*2,dist=40+Math.random()*80;
      const ox=Math.cos(angle)*dist,oz=Math.sin(angle)*dist-20;
      if(Math.sqrt(ox*ox+oz*oz)<35)continue;
      scene.add(mk(new THREE.CylinderGeometry(.15,.22,2.2,5),M.bark,ox,1.1,oz));
      // Wider, flatter canopy
      const cn=new THREE.Mesh(new THREE.SphereGeometry(2.2+Math.random()*.8,8,8),
        new THREE.MeshStandardMaterial({color:`hsl(${105+Math.random()*15},${25+Math.random()*15}%,${38+Math.random()*10}%)`,roughness:.82}));
      cn.position.set(ox,3.2+Math.random()*.4,oz);cn.scale.set(1,.45,1);cn.castShadow=true;scene.add(cn);
    }

    // Stone pine trees (umbrella pines) — iconic Mediterranean
    for(let pi=0;pi<10;pi++){
      const angle=Math.random()*Math.PI*2,dist=80+Math.random()*150;
      const px=Math.cos(angle)*dist,pz=Math.sin(angle)*dist-50;
      if(Math.sqrt(px*px+(pz+50)*(pz+50))<60)continue;
      const ph=6+Math.random()*3;
      scene.add(mk(new THREE.CylinderGeometry(.2,.3,ph,6),M.bark,px,ph/2,pz));
      // Flat umbrella canopy
      const canopy=new THREE.Mesh(new THREE.SphereGeometry(3+Math.random(),10,8),
        new THREE.MeshStandardMaterial({color:"#3A6830",roughness:.82}));
      canopy.position.set(px,ph+1,pz);canopy.scale.set(1,.3,1);canopy.castShadow=true;scene.add(canopy);
    }

    // Distant farmhouses & villas with terracotta roofs
    const farmData=[[-120,-160],[140,-130],[-60,-220],[100,-250],[-180,-120],[200,-170],[-40,-290],[70,-310],
      [-160,-210],[170,-230],[-90,-300],[110,-180],[-200,-150],[230,-120],[-130,-270],[160,-290]];
    farmData.forEach(([fx,fz])=>{
      const fh=2+Math.random()*2;const fw=3+Math.random()*3;
      scene.add(mk(new THREE.BoxGeometry(fw,fh,fw*.7),new THREE.MeshStandardMaterial({color:`hsl(30,${20+Math.random()*15}%,${80+Math.random()*10}%)`,roughness:.75}),fx,fh/2+.5,fz));
      const fr=mk(new THREE.BoxGeometry(fw+1,.2,fw*.7+.5),M.tile,fx,fh+.7,fz);fr.rotation.z=.1+Math.random()*.08;scene.add(fr);
      // Some with towers
      if(Math.random()>.6){
        const th=fh+2+Math.random()*2;
        scene.add(mk(new THREE.BoxGeometry(fw*.3,th,fw*.3),new THREE.MeshStandardMaterial({color:"#E8D8C0",roughness:.7}),fx+fw*.4,th/2+.5,fz));
        scene.add(mk(new THREE.ConeGeometry(fw*.25,1.5,4),M.tile,fx+fw*.4,th+1.2,fz));
      }
    });

    // Winding Tuscan road
    for(let ri=0;ri<40;ri++){
      const rz=-45-ri*8;const rx=Math.sin(ri*.25)*25;
      const rw=3+Math.sin(ri*.5)*.5;
      scene.add(mk(new THREE.BoxGeometry(rw,.04,7),M.pathD,rx,.12,rz));
    }

    // Ancient stone bridge over a small stream
    const bridgeZ=-90;
    scene.add(mk(new THREE.BoxGeometry(8,.4,4),M.stoneD,15,.8,bridgeZ));
    scene.add(mk(new THREE.BoxGeometry(.6,1.2,4),M.stoneD,11,.6,bridgeZ));
    scene.add(mk(new THREE.BoxGeometry(.6,1.2,4),M.stoneD,19,.6,bridgeZ));
    // Stream
    for(let si=0;si<15;si++){
      const sw=new THREE.Mesh(new THREE.BoxGeometry(2+Math.random(),.05,3),M.water);
      sw.position.set(10+si*3+Math.random()*2,.15+Math.random()*.2,bridgeZ+Math.sin(si*.4)*3);
      sw.rotation.y=Math.random()*.3;scene.add(sw);
    }

    // Distant medieval hilltop village
    const villageX=-200,villageZ=-280;
    const villageHill=new THREE.Mesh(new THREE.SphereGeometry(25,12,10),new THREE.MeshStandardMaterial({color:"#5A8040",roughness:.85}));
    villageHill.position.set(villageX,-20,villageZ);villageHill.scale.y=.15;scene.add(villageHill);
    for(let vi=0;vi<8;vi++){
      const vx=villageX-8+Math.random()*16,vz=villageZ-4+Math.random()*8;
      const vh=1.5+Math.random()*2;
      scene.add(mk(new THREE.BoxGeometry(2+Math.random(),vh,2+Math.random()),new THREE.MeshStandardMaterial({color:"#E8D8C0",roughness:.7}),vx,vh/2+2,vz));
      scene.add(mk(new THREE.BoxGeometry(2.5,.15,2.5),M.tile,vx,vh+2.1,vz));
    }
    // Church tower
    scene.add(mk(new THREE.BoxGeometry(2,6,2),new THREE.MeshStandardMaterial({color:"#E0D0B8",roughness:.65}),villageX,5,villageZ));
    scene.add(mk(new THREE.ConeGeometry(1.5,3,4),M.tile,villageX,9.5,villageZ));

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

    let prevHovered: string|null=null;
    const clock=new THREE.Clock();
    const animate=()=>{
      frameRef.current=requestAnimationFrame(animate);const t=clock.getElapsedTime();
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
        sg.meshes.forEach((wm: any)=>{
          if(!wm.material||wm.material.transparent)return;
          const mat=wm.material as THREE.MeshStandardMaterial;
          // Store original color once
          if(!wm.userData._origColor){
            wm.userData._origColor=mat.color.clone();
          }
          if(isHov){
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
        const accentColor=new THREE.Color(ct.userData.accent);
        // Smooth emissive glow on wing body meshes (skip cloned window mats)
        const winSet=wingWindowMats.get(ct.userData.roomId);
        const winMeshSet=new Set(winSet?.map(e=>e.mesh));
        ct.userData.wingMeshes.forEach((wm: any)=>{
          if(winMeshSet?.has(wm))return;// handled separately
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

      ren.render(scene,camera);
    };animate();

    const onDown=(e: MouseEvent)=>{drag.current=false;prev.current={x:e.clientX,y:e.clientY};};
    const onMove=(e: MouseEvent)=>{const dx=e.clientX-prev.current.x,dy=e.clientY-prev.current.y;if(Math.abs(dx)>3||Math.abs(dy)>3)drag.current=true;
      if(e.buttons===1){camOT.current.theta-=dx*.004;camOT.current.phi=Math.max(.08,Math.min(Math.PI*.44,camOT.current.phi+dy*.004));prev.current={x:e.clientX,y:e.clientY};}
      const rect=el.getBoundingClientRect();mse.current.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
      ray.current.setFromCamera(mse.current,camera);const hits=ray.current.intersectObjects(clickTargets);onRoomHover(hits.length>0?hits[0].object.userData.roomId:null);};
    const onCk=(e: MouseEvent)=>{if(drag.current)return;const rect=el.getBoundingClientRect();mse.current.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
      ray.current.setFromCamera(mse.current,camera);const hits=ray.current.intersectObjects(clickTargets);if(hits.length>0)onRoomClick(hits[0].object.userData.roomId);};
    const onWh=(e: WheelEvent)=>{camD.current=Math.max(40,Math.min(180,camD.current+e.deltaY*.05));};
    const onRs=()=>{w=el.clientWidth;h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();ren.setSize(w,h);};
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
          setTimeout(()=>onRoomClick(hitId),250);
        }
      }
    };
    el.addEventListener("touchstart",onTS,{passive:true});el.addEventListener("touchmove",onTM,{passive:false});el.addEventListener("touchend",onTE,{passive:true});

    return()=>{if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);el.removeEventListener("mousedown",onDown);el.removeEventListener("mousemove",onMove);el.removeEventListener("click",onCk);el.removeEventListener("wheel",onWh);window.removeEventListener("resize",onRs);
      el.removeEventListener("touchstart",onTS);el.removeEventListener("touchmove",onTM);el.removeEventListener("touchend",onTE);
      if(el.contains(hovLabel))el.removeChild(hovLabel);
      if(el.contains(ren.domElement))el.removeChild(ren.domElement);ren.dispose();};
  },[]);
  return <div ref={mountRef} style={{width:"100%",height:"100%",cursor:hoveredRoom?"pointer":"grab"}}/>;
}
