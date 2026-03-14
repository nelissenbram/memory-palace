"use client";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { WINGS } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";

// ═══ EXTERIOR ═══
export default function ExteriorScene({onRoomHover,onRoomClick,hoveredRoom}: {onRoomHover: any,onRoomClick: any,hoveredRoom: any}){
  const mountRef=useRef<HTMLDivElement|null>(null),frameRef=useRef<number|null>(null);
  const camO=useRef({theta:Math.PI*.25,phi:Math.PI*.28}),camOT=useRef({theta:Math.PI*.25,phi:Math.PI*.28}),camD=useRef(90);
  const drag=useRef(false),prev=useRef({x:0,y:0}),mse=useRef(new THREE.Vector2()),ray=useRef(new THREE.Raycaster());

  useEffect(()=>{
    const el=mountRef.current;if(!el)return;let w=el.clientWidth,h=el.clientHeight;
    const scene=new THREE.Scene();scene.fog=new THREE.Fog("#D8DDE8",180,500);
    // ── SKY ──
    const skyGeo=new THREE.SphereGeometry(450,32,24);
    const skyC=document.createElement("canvas");skyC.width=1024;skyC.height=512;
    const skx=skyC.getContext("2d")!;
    const skyG=skx.createLinearGradient(0,0,0,512);
    skyG.addColorStop(0,"#2868A8");skyG.addColorStop(.15,"#4888C0");skyG.addColorStop(.3,"#78A8D0");skyG.addColorStop(.5,"#A8C8E0");skyG.addColorStop(.65,"#D0DDE8");skyG.addColorStop(.8,"#E8DDD0");skyG.addColorStop(.9,"#E0C8A0");skyG.addColorStop(1,"#C8A870");
    skx.fillStyle=skyG;skx.fillRect(0,0,1024,512);
    // Wispy clouds
    for(let ci=0;ci<30;ci++){skx.fillStyle=`rgba(255,255,255,${.06+Math.random()*.06})`;skx.beginPath();skx.ellipse(Math.random()*1024,50+Math.random()*120,50+Math.random()*80,6+Math.random()*10,Math.random(),0,Math.PI*2);skx.fill();}
    // Warm sun glow
    const sunG=skx.createRadialGradient(700,380,0,700,380,200);sunG.addColorStop(0,"rgba(255,240,200,.25)");sunG.addColorStop(.3,"rgba(255,220,160,.1)");sunG.addColorStop(1,"rgba(255,200,120,0)");
    skx.fillStyle=sunG;skx.fillRect(0,0,1024,512);
    const skyTex=new THREE.CanvasTexture(skyC);skyTex.colorSpace=THREE.SRGBColorSpace;
    scene.add(new THREE.Mesh(skyGeo,new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide})));

    const camera=new THREE.PerspectiveCamera(32,w/h,0.1,600);
    const ren=new THREE.WebGLRenderer({antialias:true});ren.setSize(w,h);ren.setPixelRatio(Math.min(window.devicePixelRatio,2));
    ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.8;
    el.appendChild(ren.domElement);
    // Blazing sun lighting
    scene.add(new THREE.HemisphereLight("#FFF8E8","#A8C890",0.55));
    const sun=new THREE.DirectionalLight("#FFE4B0",2.5);sun.position.set(35,50,20);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);sun.shadow.camera.near=1;sun.shadow.camera.far=200;sun.shadow.camera.left=-80;sun.shadow.camera.right=80;sun.shadow.camera.top=80;sun.shadow.camera.bottom=-80;sun.shadow.bias=-0.0003;scene.add(sun);
    const fl=new THREE.DirectionalLight("#FFF0D0",0.5);fl.position.set(-20,15,-10);scene.add(fl);
    const warmAm=new THREE.PointLight("#FFD8A0",.3,100);warmAm.position.set(0,20,0);scene.add(warmAm);

    const M={
      stone:new THREE.MeshStandardMaterial({color:"#E8DDD0",roughness:.75,metalness:.02}),
      stoneL:new THREE.MeshStandardMaterial({color:"#F0E8DC",roughness:.78}),
      stoneW:new THREE.MeshStandardMaterial({color:"#E0D4C4",roughness:.72}),
      trim:new THREE.MeshStandardMaterial({color:"#D8C8B0",roughness:.5,metalness:.12}),
      gold:new THREE.MeshStandardMaterial({color:"#C8A858",roughness:.28,metalness:.6}),
      stoneD:new THREE.MeshStandardMaterial({color:"#C0B4A0",roughness:.65,metalness:.05}),
      roof:new THREE.MeshStandardMaterial({color:"#C07048",roughness:.55,metalness:.04}),
      roofD:new THREE.MeshStandardMaterial({color:"#A86040",roughness:.5,metalness:.06}),
      dome:new THREE.MeshStandardMaterial({color:"#607858",roughness:.3,metalness:.3}),
      domeT:new THREE.MeshStandardMaterial({color:"#708868",roughness:.35,metalness:.25}),
      col:new THREE.MeshStandardMaterial({color:"#E8E0D4",roughness:.45,metalness:.08}),
      grass:new THREE.MeshStandardMaterial({color:"#6A9848",roughness:.82}),
      grassL:new THREE.MeshStandardMaterial({color:"#7AAC58",roughness:.85}),
      grassD:new THREE.MeshStandardMaterial({color:"#588838",roughness:.8}),
      water:new THREE.MeshStandardMaterial({color:"#80B0C8",roughness:.05,metalness:.2,transparent:true,opacity:.65}),
      win:new THREE.MeshStandardMaterial({color:"#FFF8E0",emissive:"#FFF0C8",emissiveIntensity:.2,roughness:.1,transparent:true,opacity:.55}),
      door:new THREE.MeshStandardMaterial({color:"#3A2818",roughness:.5}),
      path:new THREE.MeshStandardMaterial({color:"#D8C8A8",roughness:.85}),
      pathD:new THREE.MeshStandardMaterial({color:"#C0B090",roughness:.8}),
      bronze:new THREE.MeshStandardMaterial({color:"#8A7050",roughness:.3,metalness:.5}),
      marble:new THREE.MeshStandardMaterial({color:"#F0EAE0",roughness:.2,metalness:.05}),
      hedge:new THREE.MeshStandardMaterial({color:"#3A6828",roughness:.85}),
      hedgeL:new THREE.MeshStandardMaterial({color:"#4A7838",roughness:.82}),
      flower:new THREE.MeshStandardMaterial({color:"#D870A0",roughness:.8}),
      flowerW:new THREE.MeshStandardMaterial({color:"#E8D8D0",roughness:.8}),
      bark:new THREE.MeshStandardMaterial({color:"#6A5438",roughness:.7}),
      barkD:new THREE.MeshStandardMaterial({color:"#5A4428",roughness:.7}),
    };

    // ── TERRAIN: hilltop plateau ──
    const hillMain=new THREE.Mesh(new THREE.CylinderGeometry(80,120,12,64),M.grassL);hillMain.position.set(0,-6,0);hillMain.receiveShadow=true;scene.add(hillMain);
    const plateau=new THREE.Mesh(new THREE.CylinderGeometry(72,78,2,64),new THREE.MeshStandardMaterial({color:"#80AC58",roughness:.85}));plateau.position.set(0,-.8,0);plateau.receiveShadow=true;scene.add(plateau);
    // Gravel courtyard
    scene.add(mk(new THREE.CylinderGeometry(35,36,.1,48),M.path,0,.02,0));
    scene.add(mk(new THREE.CylinderGeometry(33,34,.06,48),M.pathD,0,.04,0));

    const palace=new THREE.Group(),clickTargets: THREE.Mesh[]=[];

    // ══════════════════════════════════════════
    // GRAND CENTRAL HALL — massive domed rotunda
    // ══════════════════════════════════════════
    const cW=22,cD=22,cH=10;
    // Base plinth (stepped)
    palace.add(mk(new THREE.BoxGeometry(cW+8,1,cD+8),M.stoneD,0,.5,0));
    palace.add(mk(new THREE.BoxGeometry(cW+5,.8,cD+5),M.stone,0,1.4,0));
    palace.add(mk(new THREE.BoxGeometry(cW+2,.5,cD+2),M.stoneL,0,2.05,0));
    // Main walls
    palace.add(mk(new THREE.BoxGeometry(cW,cH,cD),M.stone,0,cH/2+2.3,0));
    // Cornice + entablature
    palace.add(mk(new THREE.BoxGeometry(cW+1,.6,cD+1),M.trim,0,cH+2.6,0));
    palace.add(mk(new THREE.BoxGeometry(cW+1.5,.25,cD+1.5),M.gold,0,cH+2.95,0));
    // Drum (cylinder base for dome)
    palace.add(mk(new THREE.CylinderGeometry(8,9,3,32),M.stoneW,0,cH+4.4,0));
    palace.add(mk(new THREE.CylinderGeometry(8.5,8.5,.4,32),M.trim,0,cH+2.95,0));
    // Dome
    const dm=new THREE.Mesh(new THREE.SphereGeometry(7.5,32,24,0,Math.PI*2,0,Math.PI*.45),M.dome);dm.position.set(0,cH+5.9,0);dm.castShadow=true;palace.add(dm);
    // Lantern atop dome
    palace.add(mk(new THREE.CylinderGeometry(1.2,1.5,2,12),M.stoneW,0,cH+10,0));
    palace.add(mk(new THREE.CylinderGeometry(.4,.6,.8,8),M.trim,0,cH+11.2,0));
    palace.add(mk(new THREE.SphereGeometry(.35,8,8),M.gold,0,cH+11.8,0));
    // Drum windows
    for(let dw=0;dw<12;dw++){const da=(dw/12)*Math.PI*2;const dx=Math.cos(da)*8.1,dz=Math.sin(da)*8.1;
      const dwm=mk(new THREE.BoxGeometry(.3,1.5,.6),M.win,dx,cH+4.4,dz);dwm.rotation.y=da;palace.add(dwm);}

    // ── GRAND PORTICO (front entrance with colonnade) ──
    const pW=16,pD=6,pH=cH+1;
    palace.add(mk(new THREE.BoxGeometry(pW,.5,pD),M.stoneL,0,2.3,-(cD/2+pD/2)));
    palace.add(mk(new THREE.BoxGeometry(pW,pH-2,1.5),M.stone,0,(pH-2)/2+2.3,-(cD/2+pD-.5)));
    // 10 grand columns
    for(let ci=0;ci<10;ci++){const cx=-pW/2+1.2+ci*(pW-2.4)/9;const cz=-(cD/2+pD-.3);
      palace.add(mk(new THREE.CylinderGeometry(.45,.55,pH-1,12),M.col,cx,(pH-1)/2+2.3,cz));
      palace.add(mk(new THREE.BoxGeometry(1.1,.35,1.1),M.trim,cx,pH+1.8,cz));// capital
      palace.add(mk(new THREE.BoxGeometry(.9,.2,.9),M.gold,cx,pH+2,cz));
      palace.add(mk(new THREE.CylinderGeometry(.6,.6,.15,12),M.stoneD,cx,2.35,cz));// base
    }
    // Pediment (triangular gable)
    palace.add(mk(new THREE.BoxGeometry(pW+1,.5,pD+.5),M.trim,0,pH+2.3,-(cD/2+pD/2)));
    const pedL=mk(new THREE.BoxGeometry(pW/2+1,.3,pD+.8),M.roof,-(pW/4+.2),pH+3.3,-(cD/2+pD/2));pedL.rotation.z=.18;palace.add(pedL);
    const pedR=mk(new THREE.BoxGeometry(pW/2+1,.3,pD+.8),M.roof,(pW/4+.2),pH+3.3,-(cD/2+pD/2));pedR.rotation.z=-.18;palace.add(pedR);
    // Grand entrance doors
    palace.add(mk(new THREE.BoxGeometry(4.5,6,.3),M.door,0,5.3,-(cD/2+.15)));
    palace.add(mk(new THREE.BoxGeometry(5,6.5,.15),M.trim,0,5.55,-(cD/2+.05)));
    palace.add(mk(new THREE.BoxGeometry(5.5,.4,.2),M.gold,0,8.5,-(cD/2+.1)));

    // ══════════════════════════════════════════
    // 5 GRAND WINGS — arched colonnades + end pavilions
    // ══════════════════════════════════════════
    const wingDefs=[{room:WINGS[0],length:32},{room:WINGS[1],length:28},{room:WINGS[2],length:25},{room:WINGS[3],length:26},{room:WINGS[4],length:30}];
    wingDefs.forEach((def,i)=>{
      const angle=(i/5)*Math.PI*2-Math.PI/2;
      const wg=new THREE.Group();const wW=8,wH=7,wL=def.length;const roofM=i%2===0?M.roof:M.roofD;
      const wingMeshes: THREE.Mesh[]=[];
      function addM(m: any){wg.add(m);if(m.material&&!m.material.transparent)wingMeshes.push(m);return m;}
      // Connection block
      addM(mk(new THREE.BoxGeometry(5,wH-1,5),M.stone,0,(wH-1)/2+2.3,-2.5));
      addM(mk(new THREE.BoxGeometry(5.5,.4,5.5),M.trim,0,wH+1.3,-2.5));
      // Wing body
      addM(mk(new THREE.BoxGeometry(wW,wH,wL),M.stone,0,wH/2+2.3,-(5+wL/2)));
      // Base plinth
      addM(mk(new THREE.BoxGeometry(wW+1.5,.8,wL+1),M.stoneD,0,1.9,-(5+wL/2)));
      // Cornice
      addM(mk(new THREE.BoxGeometry(wW+.5,.35,wL+.3),M.trim,0,wH+2.45,-(5+wL/2)));
      addM(mk(new THREE.BoxGeometry(wW+.8,.15,wL+.5),M.gold,0,wH+2.65,-(5+wL/2)));
      // Terracotta roof slabs
      for(let side=-1;side<=1;side+=2){const rs=mk(new THREE.BoxGeometry(wW/2+1,.2,wL+.8),roofM,side*(wW/4+.3),wH+3,-(5+wL/2));rs.rotation.z=side*0.22;addM(rs);}
      // Ridge line
      addM(mk(new THREE.BoxGeometry(.3,.15,wL+.5),M.trim,0,wH+3.8,-(5+wL/2)));
      // ARCHED COLONNADE along both sides
      const archN=Math.floor(wL/3.5);
      for(let ai=0;ai<archN;ai++){const az=-(5+2+ai*3.5);
        for(let s=-1;s<=1;s+=2){
          const ax=s*(wW/2+.01);
          wg.add(mk(new THREE.CylinderGeometry(.2,.25,wH-.5,10),M.col,ax,(wH-.5)/2+2.3,az));
          wg.add(mk(new THREE.BoxGeometry(.55,.2,.55),M.trim,ax,wH+1.8,az));
          // Arch top between columns
          if(ai<archN-1)wg.add(mk(new THREE.BoxGeometry(.15,.8,1.8),M.trim,ax,wH+1,az-1.75));
          // Windows
          wg.add(mk(new THREE.BoxGeometry(.12,1.8,.9),M.win,ax,wH*.55+2.3,az));
        }
      }
      // END PAVILION — larger terminal building
      const eW=wW+4,eD=8,eH=wH+2,eZ=-(5+wL+eD/2);
      addM(mk(new THREE.BoxGeometry(eW,eH,eD),M.stoneL,0,eH/2+2.3,eZ));
      addM(mk(new THREE.BoxGeometry(eW+1.5,.8,eD+1),M.stoneD,0,1.9,eZ));
      addM(mk(new THREE.BoxGeometry(eW+.5,.35,eD+.3),M.trim,0,eH+2.45,eZ));
      addM(mk(new THREE.BoxGeometry(eW+.8,.15,eD+.5),M.gold,0,eH+2.65,eZ));
      for(let side=-1;side<=1;side+=2){const pr=mk(new THREE.BoxGeometry(eW/2+1.2,.2,eD+.6),roofM,side*(eW/4+.3),eH+3.3,eZ);pr.rotation.z=side*0.2;addM(pr);}
      // End pavilion colonnade (front face)
      for(let ei=0;ei<4;ei++){const ex=-eW/2+2+ei*(eW-4)/3;
        wg.add(mk(new THREE.CylinderGeometry(.25,.3,eH-.5,10),M.col,ex,(eH-.5)/2+2.3,eZ-eD/2-.01));
        wg.add(mk(new THREE.BoxGeometry(.65,.25,.65),M.trim,ex,eH+1.8,eZ-eD/2));}
      // Entrance door
      wg.add(mk(new THREE.BoxGeometry(2.5,4,.2),M.door,0,4.3,eZ-eD/2-.05));
      wg.add(mk(new THREE.BoxGeometry(3,4.5,.1),M.trim,0,4.55,eZ-eD/2-.02));
      // Large windows on end pavilion
      for(let s=-1;s<=1;s+=2){
        for(let wi=0;wi<2;wi++){wg.add(mk(new THREE.BoxGeometry(.12,2.2,1.4),M.win,s*(eW/2+.01),eH*.45+2.3,eZ-2+wi*4));}
        wg.add(mk(new THREE.BoxGeometry(1.4,2.2,.12),M.win,s*3,eH*.45+2.3,eZ-eD/2-.01));
      }

      wg.rotation.y=angle;const att=cD/2;
      wg.position.set(Math.sin(angle)*att,0,Math.cos(angle)*att);
      palace.add(wg);

      const tLen=5+wL+eD;
      const ct=new THREE.Mesh(new THREE.BoxGeometry(eW+3,eH+4,tLen+3),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
      const mid=att+tLen/2;ct.position.set(Math.sin(angle)*mid,eH/2+2,Math.cos(angle)*mid);ct.rotation.y=angle;
      ct.userData={roomId:def.room.id,wingMeshes,accent:def.room.accent};
      scene.add(ct);clickTargets.push(ct);
    });

    // ══════════════════════════════════════════
    // COURTYARD GARDENS
    // ══════════════════════════════════════════
    // Grand central fountain
    scene.add(mk(new THREE.CylinderGeometry(4,4.5,.8,24),M.marble,0,.4,-18));
    scene.add(mk(new THREE.CylinderGeometry(3.5,3.5,.15,24),M.marble,0,.85,-18));
    const fWater=new THREE.Mesh(new THREE.CylinderGeometry(3.3,3.3,.06,24),M.water);fWater.position.set(0,.9,-18);scene.add(fWater);
    scene.add(mk(new THREE.CylinderGeometry(.8,1,2,12),M.marble,0,1.9,-18));
    scene.add(mk(new THREE.CylinderGeometry(1.8,1.8,.15,16),M.marble,0,3,-18));
    const fWater2=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,.06,16),M.water);fWater2.position.set(0,3.05,-18);scene.add(fWater2);
    scene.add(mk(new THREE.CylinderGeometry(.3,.4,1.5,8),M.marble,0,3.75,-18));
    scene.add(mk(new THREE.SphereGeometry(.4,8,8),M.bronze,0,4.7,-18));
    // Formal hedges (parterres)
    const hedgePositions=[[-10,-12],[10,-12],[-10,-24],[10,-24],[-15,-18],[15,-18]];
    hedgePositions.forEach(([hx,hz])=>{
      scene.add(mk(new THREE.BoxGeometry(6,.8,4),M.hedge,hx,.4,hz));
      scene.add(mk(new THREE.BoxGeometry(5.5,.1,3.5),M.hedgeL,hx,.82,hz));
      // Flower beds on top
      for(let fi=0;fi<4;fi++){const fb=new THREE.Mesh(new THREE.SphereGeometry(.3+Math.random()*.15,6,6),fi%2?M.flower:M.flowerW);fb.position.set(hx-1.5+fi,1+Math.random()*.1,hz+Math.random()-.5);scene.add(fb);}
    });
    // Reflecting pool (long, formal)
    scene.add(mk(new THREE.BoxGeometry(4,.35,20),M.stoneD,0,.18,-18));
    const pool=new THREE.Mesh(new THREE.BoxGeometry(3.5,.08,19),M.water);pool.position.set(0,.38,-18);scene.add(pool);
    // Topiary trees (conical)
    const topPositions=[[-6,-8],[6,-8],[-6,-28],[6,-28],[-18,-10],[18,-10],[-18,-26],[18,-26]];
    topPositions.forEach(([tx,tz])=>{
      scene.add(mk(new THREE.CylinderGeometry(.12,.18,2.5,6),M.barkD,tx,1.25,tz));
      scene.add(mk(new THREE.ConeGeometry(.8,2.5,8),M.hedge,tx,3.5,tz));
      scene.add(mk(new THREE.CylinderGeometry(.5,.5,.12,10),M.stoneD,tx,.08,tz));
    });
    // Rose-lined paths
    for(let pi=0;pi<20;pi++){scene.add(mk(new THREE.BoxGeometry(3,.06,.8),M.pathD,0,.04,-8-pi*1.6));}
    // Stone benches
    for(let[bx,bz] of [[-8,-18],[8,-18]]){scene.add(mk(new THREE.BoxGeometry(2,.35,.6),M.marble,bx,.18,bz));scene.add(mk(new THREE.BoxGeometry(.3,.35,.6),M.stoneD,bx-.7,.18,bz));scene.add(mk(new THREE.BoxGeometry(.3,.35,.6),M.stoneD,bx+.7,.18,bz));}
    // Urns/vases on pedestals
    for(let[ux,uz] of [[-4,-8],[4,-8],[-4,-28],[4,-28]]){
      scene.add(mk(new THREE.BoxGeometry(.6,.08,.6),M.marble,ux,.04,uz));scene.add(mk(new THREE.CylinderGeometry(.22,.28,.8,8),M.marble,ux,.44,uz));
      scene.add(mk(new THREE.CylinderGeometry(.15,.22,.5,8),M.bronze,ux,.95,uz));
      scene.add(mk(new THREE.SphereGeometry(.18,6,6),M.hedgeL,ux,1.3,uz));
    }

    // ══════════════════════════════════════════
    // TUSCAN LANDSCAPE — rolling hills, vineyards, fields
    // ══════════════════════════════════════════
    // Distant rolling hills
    const hColors=["#5A8840","#6B9848","#7AA050","#4E7830","#5A8438","#6A9440","#7AA848"];
    [[-150,-130,90,5],[100,-180,70,4],[-80,-220,110,6],[180,-100,60,3.5],[-200,-80,75,5],[0,-280,120,5.5],
     [130,-250,80,4],[-180,-200,85,4.5],[200,-200,65,3.5],[-120,-300,100,5],[80,-320,90,4.5],[-250,-160,70,4],
     [250,-120,55,3],[-60,-350,110,5],[170,-320,75,4]].forEach(([hx,hz,hr,hh],hi)=>{
      const hm=new THREE.Mesh(new THREE.SphereGeometry(hr,16,12),new THREE.MeshStandardMaterial({color:hColors[hi%hColors.length],roughness:.88}));
      hm.position.set(hx,-hr+hh+Math.random()*2,hz);hm.scale.y=.1;hm.receiveShadow=true;scene.add(hm);
    });
    // Patchwork fields
    const fColors=["#B8C040","#D0C050","#98B838","#C8B048","#88A830","#D8C858","#A8C848","#C0A840","#78A028"];
    for(let fi=0;fi<50;fi++){
      const fx=-280+Math.random()*560,fz=-80-Math.random()*300;
      const fw=18+Math.random()*30,fl2=12+Math.random()*25;
      const fm=new THREE.Mesh(new THREE.PlaneGeometry(fw,fl2),new THREE.MeshStandardMaterial({color:fColors[fi%fColors.length],roughness:.85}));
      fm.rotation.x=-Math.PI/2;fm.position.set(fx,.2+Math.random(),fz);fm.rotation.z=Math.random()*.5-.25;scene.add(fm);
    }
    // Vineyard rows (4 patches, each with many rows)
    const vineColors=[new THREE.MeshStandardMaterial({color:"#4A6830",roughness:.85}),new THREE.MeshStandardMaterial({color:"#5A7838",roughness:.8})];
    for(let vi=0;vi<5;vi++){
      const vx=-100+vi*55+Math.random()*30,vz=-70-vi*40-Math.random()*30;
      const vAngle=Math.random()*.5-.25;
      for(let row=0;row<16;row++){
        const rm=mk(new THREE.BoxGeometry(.5,1,22+Math.random()*8),vineColors[row%2],vx+row*2.8,.5,vz);
        rm.rotation.y=vAngle;scene.add(rm);}
    }
    // Cypress trees (tall, narrow — Tuscan signature)
    const cypPos=[[-35,-35],[-40,-42],[-30,-48],[38,-30],[42,-38],[35,-50],[-55,-65],[-62,-72],[55,-58],[60,-68],
      [-75,-90],[-82,-100],[72,-85],[78,-95],[-28,-25],[30,-22],[-48,-20],[46,-24],[-65,-40],[62,-42],[-90,-55],[88,-50],
      [-100,-75],[95,-70],[-45,-85],[50,-90],[-110,-110],[105,-105],[-70,-130],[75,-125]];
    cypPos.forEach(([cx,cz])=>{
      const ch=4+Math.random()*4;
      scene.add(mk(new THREE.CylinderGeometry(.15,.22,ch*.25,6),M.barkD,cx,ch*.12,cz));
      const cone=new THREE.Mesh(new THREE.ConeGeometry(.6+Math.random()*.3,ch,6),new THREE.MeshStandardMaterial({color:`hsl(${120+Math.random()*20},${35+Math.random()*15}%,${25+Math.random()*10}%)`,roughness:.85}));
      cone.position.set(cx,ch*.55,cz);cone.castShadow=true;scene.add(cone);
    });
    // Olive trees on meadow slopes
    for(let oi=0;oi<16;oi++){const ox=-50+Math.random()*100,oz=-15-Math.random()*40;
      if(Math.abs(ox)<25&&oz>-35)continue;
      scene.add(mk(new THREE.CylinderGeometry(.2,.25,2.5,6),M.bark,ox,1.25,oz));
      const cn=new THREE.Mesh(new THREE.SphereGeometry(2+Math.random()*.8,8,8),new THREE.MeshStandardMaterial({color:"#6A8848",roughness:.82}));
      cn.position.set(ox,3+Math.random()*.5,oz);cn.scale.y=.55;cn.castShadow=true;scene.add(cn);
    }
    // Distant farmhouses
    [[-110,-150],[130,-120],[-50,-210],[90,-240],[-170,-110],[190,-160],[-30,-280],[60,-300]].forEach(([fx,fz])=>{
      const fh=2+Math.random()*1.5;
      scene.add(mk(new THREE.BoxGeometry(4,fh,3),new THREE.MeshStandardMaterial({color:"#F0E0C8",roughness:.75}),fx,fh/2+.5,fz));
      const fr=mk(new THREE.BoxGeometry(5,.2,4),M.roof,fx,fh+.7,fz);fr.rotation.z=.12;scene.add(fr);
    });
    // Winding road into distance
    for(let ri=0;ri<30;ri++){
      const rz=-50-ri*10;const rx=Math.sin(ri*.3)*20;
      scene.add(mk(new THREE.BoxGeometry(3,.05,8),M.pathD,rx,.15,rz));
    }

    // Dust motes / pollen in warm air
    const dustN=150,dG=new THREE.BufferGeometry(),dP=new Float32Array(dustN*3);
    for(let i=0;i<dustN;i++){dP[i*3]=(Math.random()-.5)*100;dP[i*3+1]=2+Math.random()*18;dP[i*3+2]=(Math.random()-.5)*100;}
    dG.setAttribute("position",new THREE.BufferAttribute(dP,3));
    scene.add(new THREE.Points(dG,new THREE.PointsMaterial({color:"#FFF0D0",size:.1,transparent:true,opacity:.15,blending:THREE.AdditiveBlending,depthWrite:false})));
    scene.add(palace);

    let prevHovered: string|null=null;
    const clock=new THREE.Clock();
    const animate=()=>{
      frameRef.current=requestAnimationFrame(animate);const t=clock.getElapsedTime();
      camO.current.theta+=(camOT.current.theta-camO.current.theta)*.04;camO.current.phi+=(camOT.current.phi-camO.current.phi)*.04;
      const r=camD.current;camera.position.set(r*Math.sin(camO.current.phi)*Math.cos(camO.current.theta),r*Math.cos(camO.current.phi)+5,r*Math.sin(camO.current.phi)*Math.sin(camO.current.theta));
      camera.lookAt(0,5,0);
      pool.material.opacity=.55+Math.sin(t*1.2)*.08;fWater.material.opacity=.6+Math.sin(t*1.5)*.08;fWater2.material.opacity=.6+Math.sin(t*1.8)*.08;
      clickTargets.forEach((ct: any)=>{
        const isHov=hoveredRoom===ct.userData.roomId;
        const accentColor=new THREE.Color(ct.userData.accent);
        ct.userData.wingMeshes.forEach((wm: any)=>{
          if(wm.material.emissive){
            if(isHov){wm.material.emissive.copy(accentColor);wm.material.emissiveIntensity+=(0.12-wm.material.emissiveIntensity)*.1;}
            else{wm.material.emissiveIntensity+=(0-wm.material.emissiveIntensity)*.1;}
          }
        });
      });
      // Animate dust
      const dp=dG.attributes.position.array;
      for(let i=0;i<dustN;i++){dp[i*3]+=Math.sin(t*.1+i*.3)*.01;dp[i*3+1]+=Math.sin(t*.15+i*.5)*.005;if(dp[i*3+1]>20)dp[i*3+1]=2;}
      dG.attributes.position.needsUpdate=true;
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
    return()=>{if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);el.removeEventListener("mousedown",onDown);el.removeEventListener("mousemove",onMove);el.removeEventListener("click",onCk);el.removeEventListener("wheel",onWh);window.removeEventListener("resize",onRs);if(el.contains(ren.domElement))el.removeChild(ren.domElement);ren.dispose();};
  },[]);
  return <div ref={mountRef} style={{width:"100%",height:"100%",cursor:hoveredRoom?"pointer":"grab"}}/>;
}
