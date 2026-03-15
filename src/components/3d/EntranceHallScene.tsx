"use client";
import { useRef, useEffect } from "react";
import * as THREE from "three";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";

// ═══ ENTRANCE HALL — Grand Roman Senate / Pantheon Chamber ═══
const HALL_WINGS = ["family","travel","childhood","career","creativity"];
const WING_ICONS: Record<string,string> = {
  family: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}",
  travel: "\u2708\uFE0F",
  childhood: "\u{1F33B}",
  career: "\u{1F4BC}",
  creativity: "\u{1F3A8}",
};

export default function EntranceHallScene({
  onDoorClick,
  wings: wingsProp,
}: {
  onDoorClick: (wingId: string) => void;
  wings?: Wing[];
}) {
  const WINGS = wingsProp || DEFAULT_WINGS;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let w = el.clientWidth, h = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#E8E2D8");
    scene.fog = new THREE.FogExp2("#E8E2D8", 0.008);

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
    const ren = new THREE.WebGLRenderer({ antialias: true });
    ren.setSize(w, h);
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    ren.shadowMap.enabled = true;
    ren.shadowMap.type = THREE.PCFSoftShadowMap;
    ren.toneMapping = THREE.ACESFilmicToneMapping;
    ren.toneMappingExposure = 1.4;
    el.appendChild(ren.domElement);

    // ── MATERIALS ──
    const MS = {
      marble: new THREE.MeshStandardMaterial({ color: "#FAFAF7", roughness: 0.25, metalness: 0.05 }),
      marbleWarm: new THREE.MeshStandardMaterial({ color: "#F0EAE0", roughness: 0.3 }),
      marbleDark: new THREE.MeshStandardMaterial({ color: "#D4C5B2", roughness: 0.35, metalness: 0.08 }),
      gold: new THREE.MeshStandardMaterial({ color: "#C8A858", roughness: 0.22, metalness: 0.65 }),
      goldDark: new THREE.MeshStandardMaterial({ color: "#A08038", roughness: 0.3, metalness: 0.5 }),
      column: new THREE.MeshStandardMaterial({ color: "#F2EDE7", roughness: 0.28, metalness: 0.04 }),
      door: new THREE.MeshStandardMaterial({ color: "#5A3E28", roughness: 0.4, metalness: 0.06 }),
      doorFrame: new THREE.MeshStandardMaterial({ color: "#C8A858", roughness: 0.25, metalness: 0.55 }),
      dome: new THREE.MeshStandardMaterial({ color: "#F5F0E8", roughness: 0.4, side: THREE.BackSide }),
      domeGold: new THREE.MeshStandardMaterial({ color: "#C8A858", roughness: 0.3, metalness: 0.5 }),
      floor: new THREE.MeshStandardMaterial({ color: "#E8E0D4", roughness: 0.2, metalness: 0.08 }),
      floorDark: new THREE.MeshStandardMaterial({ color: "#C4B8A0", roughness: 0.25, metalness: 0.06 }),
      floorAccent: new THREE.MeshStandardMaterial({ color: "#A89878", roughness: 0.3, metalness: 0.1 }),
      bust: new THREE.MeshStandardMaterial({ color: "#E8E2DA", roughness: 0.2, metalness: 0.06 }),
      bronze: new THREE.MeshStandardMaterial({ color: "#8A7050", roughness: 0.3, metalness: 0.5 }),
      wall: new THREE.MeshStandardMaterial({ color: "#FAFAF7", roughness: 0.35, side: THREE.BackSide }),
      lightBeam: new THREE.MeshBasicMaterial({ color: "#FFF8E0", transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      atticDoor: new THREE.MeshStandardMaterial({ color: "#6A5040", roughness: 0.5 }),
      atticStairs: new THREE.MeshStandardMaterial({ color: "#D4C5B2", roughness: 0.35 }),
    };

    // ── ROOM DIMENSIONS ──
    const RADIUS = 18;
    const WALL_H = 10;
    const DOME_H = 12;
    const TOTAL_H = WALL_H + DOME_H;
    const OCULUS_R = 2.5;
    const NUM_COLS = 24;
    const NUM_DOORS = 5;

    // ── LIGHTING ──
    // Warm ambient
    scene.add(new THREE.HemisphereLight("#FFF5E0", "#C8B8A0", 0.4));
    // Oculus directional light (from above)
    const sunLight = new THREE.DirectionalLight("#FFF8E0", 2.0);
    sunLight.position.set(0, TOTAL_H + 10, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -8;
    sunLight.shadow.camera.right = 8;
    sunLight.shadow.camera.top = 8;
    sunLight.shadow.camera.bottom = -8;
    scene.add(sunLight);
    // Fill light
    const fillLight = new THREE.DirectionalLight("#FFE0C0", 0.3);
    fillLight.position.set(-10, 8, 5);
    scene.add(fillLight);
    // Center spotlight from oculus
    const oculusSpot = new THREE.SpotLight("#FFF8E0", 1.5, 40, Math.PI / 5, 0.6, 1);
    oculusSpot.position.set(0, TOTAL_H - 1, 0);
    oculusSpot.target.position.set(0, 0, 0);
    scene.add(oculusSpot);
    scene.add(oculusSpot.target);

    // ── FLOOR — radial marble mosaic ──
    const floorGeo = new THREE.CircleGeometry(RADIUS + 1, 64);
    const floorMesh = new THREE.Mesh(floorGeo, MS.floor);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Radial floor rings
    for (let r = 2; r < RADIUS; r += 3) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r, r + 0.15, 64),
        MS.floorAccent
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.003;
      ring.receiveShadow = true;
      scene.add(ring);
    }
    // Radial spokes
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const spoke = mk(new THREE.BoxGeometry(0.1, 0.004, RADIUS - 2), MS.floorAccent,
        Math.sin(angle) * (RADIUS / 2 - 1), 0.004, Math.cos(angle) * (RADIUS / 2 - 1));
      spoke.rotation.y = -angle;
      scene.add(spoke);
    }
    // Center medallion
    const centerMedallion = new THREE.Mesh(new THREE.CircleGeometry(2.5, 32), MS.floorDark);
    centerMedallion.rotation.x = -Math.PI / 2;
    centerMedallion.position.y = 0.005;
    centerMedallion.receiveShadow = true;
    scene.add(centerMedallion);
    const innerMedallion = new THREE.Mesh(new THREE.CircleGeometry(1.8, 32), MS.gold);
    innerMedallion.rotation.x = -Math.PI / 2;
    innerMedallion.position.y = 0.007;
    scene.add(innerMedallion);
    const starGeo = new THREE.CircleGeometry(1.2, 5);
    const starMesh = new THREE.Mesh(starGeo, MS.marbleDark);
    starMesh.rotation.x = -Math.PI / 2;
    starMesh.position.y = 0.009;
    scene.add(starMesh);
    // Alternating floor tiles in rings
    for (let r = 4; r < RADIUS - 1; r += 3) {
      const segments = Math.floor(r * 2);
      for (let s = 0; s < segments; s++) {
        if (s % 2 === 0) continue;
        const a1 = (s / segments) * Math.PI * 2;
        const a2 = ((s + 1) / segments) * Math.PI * 2;
        const shape = new THREE.Shape();
        shape.moveTo(Math.cos(a1) * r, Math.sin(a1) * r);
        shape.lineTo(Math.cos(a1) * (r + 2.5), Math.sin(a1) * (r + 2.5));
        shape.lineTo(Math.cos(a2) * (r + 2.5), Math.sin(a2) * (r + 2.5));
        shape.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
        shape.closePath();
        const tileGeo = new THREE.ShapeGeometry(shape);
        const tile = new THREE.Mesh(tileGeo, MS.floorDark);
        tile.rotation.x = -Math.PI / 2;
        tile.position.y = 0.002;
        tile.receiveShadow = true;
        scene.add(tile);
      }
    }

    // ── CYLINDRICAL WALL ──
    const wallGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, WALL_H, 64, 1, true);
    const wallMesh = new THREE.Mesh(wallGeo, MS.wall);
    wallMesh.position.y = WALL_H / 2;
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);

    // Base molding
    const baseMold = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS, 0.15, 8, 64),
      MS.marbleDark
    );
    baseMold.rotation.x = Math.PI / 2;
    baseMold.position.y = 0.15;
    scene.add(baseMold);

    // Top cornice
    const cornice = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS - 0.1, 0.2, 8, 64),
      MS.gold
    );
    cornice.rotation.x = Math.PI / 2;
    cornice.position.y = WALL_H;
    scene.add(cornice);

    // ── DOME ──
    const domeGeo = new THREE.SphereGeometry(RADIUS, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMesh = new THREE.Mesh(domeGeo, MS.dome);
    domeMesh.position.y = WALL_H;
    scene.add(domeMesh);

    // Gold rim at dome base
    const domeRim = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS - 0.05, 0.3, 10, 64),
      MS.domeGold
    );
    domeRim.rotation.x = Math.PI / 2;
    domeRim.position.y = WALL_H + 0.1;
    scene.add(domeRim);

    // Dome coffered ribs (radial lines on dome)
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const points = [];
      for (let t = 0.08; t < 0.48; t += 0.02) {
        const phi = t * Math.PI;
        const r2 = RADIUS * Math.sin(phi);
        const y2 = WALL_H + RADIUS * Math.cos(phi);
        points.push(new THREE.Vector3(Math.cos(angle) * (r2 - 0.1), y2, Math.sin(angle) * (r2 - 0.1)));
      }
      const ribGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, 0.06, 6, false);
      const rib = new THREE.Mesh(ribGeo, MS.goldDark);
      scene.add(rib);
    }
    // Concentric dome rings
    for (let ring = 1; ring <= 4; ring++) {
      const phi = (ring / 6) * Math.PI / 2;
      const ringR = RADIUS * Math.sin(phi);
      const ringY = WALL_H + RADIUS * Math.cos(phi);
      const domeRing = new THREE.Mesh(
        new THREE.TorusGeometry(ringR, 0.04, 6, 48),
        MS.goldDark
      );
      domeRing.rotation.x = Math.PI / 2;
      domeRing.position.y = ringY;
      scene.add(domeRing);
    }

    // Oculus opening — cut visual by placing a bright disc
    const oculusGeo = new THREE.CircleGeometry(OCULUS_R, 32);
    const oculusMat = new THREE.MeshBasicMaterial({ color: "#E8E0D0", side: THREE.DoubleSide });
    const oculusMesh = new THREE.Mesh(oculusGeo, oculusMat);
    oculusMesh.rotation.x = Math.PI / 2;
    oculusMesh.position.y = TOTAL_H - 0.3;
    scene.add(oculusMesh);
    // Oculus ring
    const oculusRing = new THREE.Mesh(
      new THREE.TorusGeometry(OCULUS_R, 0.25, 10, 32),
      MS.gold
    );
    oculusRing.rotation.x = Math.PI / 2;
    oculusRing.position.y = TOTAL_H - 0.3;
    scene.add(oculusRing);

    // ── VOLUMETRIC LIGHT BEAMS from oculus ──
    const beamGeo = new THREE.CylinderGeometry(OCULUS_R * 0.8, OCULUS_R * 1.8, TOTAL_H, 32, 1, true);
    const beamMesh = new THREE.Mesh(beamGeo, MS.lightBeam);
    beamMesh.position.y = TOTAL_H / 2;
    scene.add(beamMesh);
    // Extra inner beam
    const beamGeo2 = new THREE.CylinderGeometry(OCULUS_R * 0.4, OCULUS_R * 1.2, TOTAL_H, 32, 1, true);
    const beamMat2 = MS.lightBeam.clone();
    beamMat2.opacity = 0.025;
    const beamMesh2 = new THREE.Mesh(beamGeo2, beamMat2);
    beamMesh2.position.y = TOTAL_H / 2;
    scene.add(beamMesh2);

    // ── COLUMNS (instanced for performance) ──
    const colR = 0.35;
    const colH = WALL_H - 0.5;
    // Column shaft
    const colShaftGeo = new THREE.CylinderGeometry(colR, colR * 1.08, colH, 12);
    const colBaseMesh = new THREE.InstancedMesh(colShaftGeo, MS.column, NUM_COLS);
    colBaseMesh.castShadow = true;
    colBaseMesh.receiveShadow = true;
    const colMatrix = new THREE.Matrix4();
    for (let i = 0; i < NUM_COLS; i++) {
      const angle = (i / NUM_COLS) * Math.PI * 2;
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, colH / 2, cz);
      colBaseMesh.setMatrixAt(i, colMatrix);
    }
    colBaseMesh.instanceMatrix.needsUpdate = true;
    scene.add(colBaseMesh);

    // Column capitals (instanced)
    const capGeo = new THREE.CylinderGeometry(colR * 1.6, colR * 1.1, 0.5, 12);
    const capMesh = new THREE.InstancedMesh(capGeo, MS.gold, NUM_COLS);
    for (let i = 0; i < NUM_COLS; i++) {
      const angle = (i / NUM_COLS) * Math.PI * 2;
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, colH + 0.25, cz);
      capMesh.setMatrixAt(i, colMatrix);
    }
    capMesh.instanceMatrix.needsUpdate = true;
    scene.add(capMesh);

    // Column bases (instanced)
    const baseGeo = new THREE.CylinderGeometry(colR * 1.3, colR * 1.5, 0.3, 12);
    const baseMeshI = new THREE.InstancedMesh(baseGeo, MS.marbleDark, NUM_COLS);
    for (let i = 0; i < NUM_COLS; i++) {
      const angle = (i / NUM_COLS) * Math.PI * 2;
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, 0.15, cz);
      baseMeshI.setMatrixAt(i, colMatrix);
    }
    baseMeshI.instanceMatrix.needsUpdate = true;
    scene.add(baseMeshI);

    // Column fluting detail (decorative rings on each column)
    for (let i = 0; i < NUM_COLS; i++) {
      const angle = (i / NUM_COLS) * Math.PI * 2;
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      // Just top and bottom rings per column
      for (const ry of [0.8, colH - 0.5]) {
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(colR + 0.02, 0.025, 6, 12), MS.marbleWarm);
        ring2.rotation.x = Math.PI / 2;
        ring2.position.set(cx, ry, cz);
        scene.add(ring2);
      }
    }

    // ── 5 GRAND DOORS ──
    const doorH = 4.5;
    const doorW = 2.2;
    const doorMeshes: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; wingId: string; angle: number }[] = [];

    HALL_WINGS.forEach((wingId, i) => {
      const wing = WINGS.find(ww => ww.id === wingId);
      if (!wing) return;
      const accent = wing.accent;
      const angle = (i / NUM_DOORS) * Math.PI * 2 - Math.PI / 2; // start from front
      const dx = Math.cos(angle) * (RADIUS - 0.4);
      const dz = Math.sin(angle) * (RADIUS - 0.4);

      // Door recess / alcove
      const recessGeo = new THREE.BoxGeometry(doorW + 0.6, doorH + 0.5, 0.6);
      const recessMesh = mk(recessGeo, MS.marbleDark, dx - Math.cos(angle) * 0.3, (doorH + 0.5) / 2, dz - Math.sin(angle) * 0.3);
      recessMesh.lookAt(0, (doorH + 0.5) / 2, 0);
      scene.add(recessMesh);

      // Door frame
      const frameMat = MS.doorFrame;
      // Left pillar
      const lp = mk(new THREE.BoxGeometry(0.2, doorH + 0.2, 0.2), frameMat, 0, (doorH + 0.2) / 2, 0);
      lp.position.set(
        dx + Math.cos(angle + Math.PI / 2) * (doorW / 2 + 0.15),
        (doorH + 0.2) / 2,
        dz + Math.sin(angle + Math.PI / 2) * (doorW / 2 + 0.15)
      );
      scene.add(lp);
      // Right pillar
      const rp = mk(new THREE.BoxGeometry(0.2, doorH + 0.2, 0.2), frameMat, 0, (doorH + 0.2) / 2, 0);
      rp.position.set(
        dx + Math.cos(angle - Math.PI / 2) * (doorW / 2 + 0.15),
        (doorH + 0.2) / 2,
        dz + Math.sin(angle - Math.PI / 2) * (doorW / 2 + 0.15)
      );
      scene.add(rp);
      // Lintel
      const lintel = mk(new THREE.BoxGeometry(doorW + 0.7, 0.3, 0.25), frameMat, dx, doorH + 0.35, dz);
      lintel.lookAt(0, doorH + 0.35, 0);
      scene.add(lintel);
      // Arch above door
      const archCurve = new THREE.EllipseCurve(0, 0, doorW / 2 + 0.2, 0.8, 0, Math.PI, false, 0);
      const archPoints = archCurve.getPoints(20).map(p => new THREE.Vector3(p.x, p.y, 0));
      const archGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints), 20, 0.08, 8, false);
      const archMesh = new THREE.Mesh(archGeo, MS.gold);
      archMesh.position.set(dx, doorH + 0.5, dz);
      archMesh.lookAt(0, doorH + 0.5, 0);
      archMesh.rotateY(Math.PI);
      scene.add(archMesh);

      // Door panel (clickable)
      const doorMat = new THREE.MeshStandardMaterial({ color: "#5A3E28", roughness: 0.4, metalness: 0.06 });
      const doorGeo = new THREE.BoxGeometry(doorW, doorH, 0.1);
      const doorMesh = new THREE.Mesh(doorGeo, doorMat);
      doorMesh.position.set(dx, doorH / 2, dz);
      doorMesh.lookAt(0, doorH / 2, 0);
      doorMesh.castShadow = true;
      doorMesh.userData = { wingId };
      scene.add(doorMesh);
      doorMeshes.push({ mesh: doorMesh, mat: doorMat, wingId, angle });

      // Door panel details (inset rectangles)
      for (const py of [0.6, 2.0, 3.2]) {
        const panelGeo = new THREE.BoxGeometry(doorW * 0.38, 0.8, 0.005);
        for (const sx of [-1, 1]) {
          const panel = new THREE.Mesh(panelGeo, MS.gold);
          panel.position.copy(doorMesh.position.clone());
          panel.position.y = py;
          // offset slightly toward center
          const inward = new THREE.Vector3(-Math.cos(angle), 0, -Math.sin(angle)).multiplyScalar(0.06);
          const lateral = new THREE.Vector3(Math.cos(angle + Math.PI / 2), 0, Math.sin(angle + Math.PI / 2)).multiplyScalar(sx * doorW * 0.25);
          panel.position.add(inward).add(lateral);
          panel.lookAt(new THREE.Vector3(0, py, 0));
          scene.add(panel);
        }
      }

      // Door handles
      for (const sx of [-0.15, 0.15]) {
        const handle = mk(new THREE.SphereGeometry(0.05, 8, 8), MS.gold, 0, 0, 0);
        handle.position.copy(doorMesh.position.clone());
        handle.position.y = doorH * 0.45;
        const lat = new THREE.Vector3(Math.cos(angle + Math.PI / 2), 0, Math.sin(angle + Math.PI / 2)).multiplyScalar(sx);
        const fwd = new THREE.Vector3(-Math.cos(angle), 0, -Math.sin(angle)).multiplyScalar(0.08);
        handle.position.add(lat).add(fwd);
        scene.add(handle);
      }

      // Point light near each door
      const doorLight = new THREE.PointLight(accent, 0.4, 6);
      doorLight.position.set(
        dx - Math.cos(angle) * 1.5,
        3,
        dz - Math.sin(angle) * 1.5
      );
      scene.add(doorLight);

      // ── NAME PLAQUE below door ──
      const plqCanvas = document.createElement("canvas");
      plqCanvas.width = 320;
      plqCanvas.height = 56;
      const pc = plqCanvas.getContext("2d")!;
      pc.fillStyle = "#3E3020";
      pc.fillRect(0, 0, 320, 56);
      pc.fillStyle = "#C8A868";
      pc.fillRect(2, 2, 316, 52);
      pc.fillStyle = "#3E3020";
      pc.fillRect(5, 5, 310, 46);
      pc.fillStyle = "#F0EAE0";
      pc.font = "bold 20px Georgia, serif";
      pc.textAlign = "center";
      pc.textBaseline = "middle";
      pc.fillText(`${wing.icon}  ${wing.name}`, 160, 28);
      const plqTex = new THREE.CanvasTexture(plqCanvas);
      plqTex.colorSpace = THREE.SRGBColorSpace;
      const plqMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.3),
        new THREE.MeshStandardMaterial({ map: plqTex, roughness: 0.4 })
      );
      plqMesh.position.set(dx, doorH + 0.8, dz);
      plqMesh.lookAt(0, doorH + 0.8, 0);
      plqMesh.rotateY(Math.PI);
      scene.add(plqMesh);

      // ── BUST / STATUE above each door ──
      const bustX = dx - Math.cos(angle) * 0.1;
      const bustZ = dz - Math.sin(angle) * 0.1;
      const bustBaseY = doorH + 1.3;
      // Pedestal shelf
      scene.add(mk(new THREE.BoxGeometry(1.0, 0.12, 0.5), MS.marbleDark, bustX, bustBaseY, bustZ));
      // Bust: sphere head + cylinder neck/chest
      scene.add(mk(new THREE.CylinderGeometry(0.18, 0.28, 0.5, 8), MS.bust, bustX, bustBaseY + 0.37, bustZ));
      scene.add(mk(new THREE.SphereGeometry(0.2, 10, 10), MS.bust, bustX, bustBaseY + 0.75, bustZ));
      // Small accent color disc behind bust
      const accentDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.15, 12),
        new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.3 })
      );
      accentDisc.position.set(bustX + Math.cos(angle) * 0.2, bustBaseY + 0.75, bustZ + Math.sin(angle) * 0.2);
      accentDisc.lookAt(0, bustBaseY + 0.75, 0);
      scene.add(accentDisc);
    });

    // ── ATTIC DOOR — small staircase on one side ──
    {
      // Place between door 0 and door 4 (a gap area)
      const atticAngle = ((0.5 / NUM_DOORS) * Math.PI * 2 - Math.PI / 2) + (4 / NUM_DOORS) * Math.PI * 2;
      const ax = Math.cos(atticAngle) * (RADIUS - 1.2);
      const az = Math.sin(atticAngle) * (RADIUS - 1.2);
      // Small staircase (5 steps)
      for (let step = 0; step < 5; step++) {
        const stepW = 1.2 - step * 0.04;
        const stepH = 0.25;
        const sy = step * stepH;
        const dist = 1.2 - step * 0.22;
        const sx2 = ax - Math.cos(atticAngle) * dist;
        const sz2 = az - Math.sin(atticAngle) * dist;
        const stepMesh = mk(new THREE.BoxGeometry(stepW, stepH, 0.3), MS.atticStairs, sx2, sy + stepH / 2, sz2);
        stepMesh.lookAt(0, sy + stepH / 2, 0);
        scene.add(stepMesh);
      }
      // Small door at top of stairs
      const atDoorY = 5 * 0.25;
      const atDx = ax - Math.cos(atticAngle) * 0.1;
      const atDz = az - Math.sin(atticAngle) * 0.1;
      const atDoor = mk(new THREE.BoxGeometry(0.8, 1.6, 0.08), MS.atticDoor, atDx, atDoorY + 0.8, atDz);
      atDoor.lookAt(0, atDoorY + 0.8, 0);
      scene.add(atDoor);
      // Small arch
      const atArch = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.04, 6, 12, Math.PI),
        MS.bronze
      );
      atArch.position.set(atDx, atDoorY + 1.6, atDz);
      atArch.lookAt(0, atDoorY + 1.6, 0);
      atArch.rotateZ(Math.PI);
      scene.add(atArch);
      // "Attic" label
      const atCanvas = document.createElement("canvas");
      atCanvas.width = 128;
      atCanvas.height = 32;
      const atx = atCanvas.getContext("2d")!;
      atx.fillStyle = "#8A7050";
      atx.font = "italic 16px Georgia, serif";
      atx.textAlign = "center";
      atx.fillText("The Attic", 64, 22);
      const atTex = new THREE.CanvasTexture(atCanvas);
      atTex.colorSpace = THREE.SRGBColorSpace;
      const atLabel = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.18),
        new THREE.MeshBasicMaterial({ map: atTex, transparent: true })
      );
      atLabel.position.set(atDx, atDoorY + 1.85, atDz);
      atLabel.lookAt(0, atDoorY + 1.85, 0);
      atLabel.rotateY(Math.PI);
      scene.add(atLabel);
    }

    // ── DUST PARTICLES ──
    const dustN = 200;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) {
      const a = Math.random() * Math.PI * 2;
      const r2 = Math.random() * OCULUS_R * 2.5; // concentrated near light beam
      dustPos[i * 3] = Math.cos(a) * r2;
      dustPos[i * 3 + 1] = 1 + Math.random() * (TOTAL_H - 2);
      dustPos[i * 3 + 2] = Math.sin(a) * r2;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: "#FFF8E0", size: 0.06, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.Points(dustGeo, dustMat));

    // ── EXIT PORTAL (back to exterior) — at center back ──
    const exitAngle = Math.PI / 2; // back of room
    const exitX = Math.cos(exitAngle) * (RADIUS - 0.5);
    const exitZ = Math.sin(exitAngle) * (RADIUS - 0.5);
    const portalGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 3.5),
      new THREE.MeshBasicMaterial({ color: "#FFF8E0", transparent: true, opacity: 0.04, side: THREE.DoubleSide })
    );
    portalGlow.position.set(exitX, 1.8, exitZ);
    portalGlow.lookAt(0, 1.8, 0);
    scene.add(portalGlow);
    // Portal frame
    scene.add(mk(new THREE.BoxGeometry(0.15, 3.5, 0.15), MS.gold,
      exitX + Math.cos(exitAngle + Math.PI / 2) * 1.1, 1.75, exitZ + Math.sin(exitAngle + Math.PI / 2) * 1.1));
    scene.add(mk(new THREE.BoxGeometry(0.15, 3.5, 0.15), MS.gold,
      exitX + Math.cos(exitAngle - Math.PI / 2) * 1.1, 1.75, exitZ + Math.sin(exitAngle - Math.PI / 2) * 1.1));
    scene.add(mk(new THREE.BoxGeometry(2.4, 0.15, 0.15), MS.gold, exitX, 3.55, exitZ));
    // Portal label
    const plC = document.createElement("canvas");
    plC.width = 240;
    plC.height = 36;
    const plx = plC.getContext("2d")!;
    plx.fillStyle = "#C8A868";
    plx.font = "bold 14px Georgia, serif";
    plx.textAlign = "center";
    plx.fillText("\u2190 Return to Exterior", 120, 24);
    const plT = new THREE.CanvasTexture(plC);
    plT.colorSpace = THREE.SRGBColorSpace;
    const plLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.25),
      new THREE.MeshBasicMaterial({ map: plT, transparent: true })
    );
    plLabel.position.set(exitX, 3.85, exitZ);
    plLabel.lookAt(0, 3.85, 0);
    plLabel.rotateY(Math.PI);
    scene.add(plLabel);
    const portalHit = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 3.5, 0.4),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    portalHit.position.set(exitX, 1.8, exitZ);
    portalHit.lookAt(0, 1.8, 0);
    scene.add(portalHit);
    const portalLight = new THREE.PointLight("#FFE8C0", 0.4, 6);
    portalLight.position.set(exitX - Math.cos(exitAngle) * 0.5, 2.5, exitZ - Math.sin(exitAngle) * 0.5);
    scene.add(portalLight);

    // ── CAMERA — auto-orbiting from center ──
    const camOrbit = { theta: 0, targetTheta: 0, autoSpeed: 0.03, radius: 8, height: 2.2, autoOrbit: true };
    camera.position.set(0, camOrbit.height, camOrbit.radius);
    camera.lookAt(0, 4, 0);

    // ── CONTROLS ──
    const drag2 = { v: false };
    const prev = { x: 0, y: 0 };
    let hoveredWing: string | null = null;
    const clock = new THREE.Clock();
    const mse = new THREE.Vector2();

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      // Auto orbit
      if (camOrbit.autoOrbit) {
        camOrbit.targetTheta += camOrbit.autoSpeed * dt;
      }
      camOrbit.theta += (camOrbit.targetTheta - camOrbit.theta) * 0.05;

      camera.position.x = Math.sin(camOrbit.theta) * camOrbit.radius;
      camera.position.z = Math.cos(camOrbit.theta) * camOrbit.radius;
      camera.position.y = camOrbit.height;
      camera.lookAt(0, 4.5, 0);

      // Door hover glow
      doorMeshes.forEach(d => {
        const isH = hoveredWing === d.wingId;
        const wing = WINGS.find(ww => ww.id === d.wingId);
        const accent = wing?.accent || "#C8A858";
        d.mat.emissive = isH ? new THREE.Color(accent) : new THREE.Color(0);
        d.mat.emissiveIntensity = isH ? 0.2 + Math.sin(t * 3) * 0.08 : 0;
      });

      // Portal pulse
      portalGlow.material.opacity = 0.03 + Math.sin(t * 2) * 0.015;
      portalLight.intensity = 0.35 + Math.sin(t * 1.5) * 0.1;

      // Dust float
      const dp = dustGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < dustN; i++) {
        dp[i * 3] += Math.sin(t * 0.15 + i * 0.7) * 0.002;
        dp[i * 3 + 1] += Math.sin(t * 0.2 + i * 0.5) * 0.001 + 0.001;
        dp[i * 3 + 2] += Math.cos(t * 0.15 + i * 0.3) * 0.002;
        if (dp[i * 3 + 1] > TOTAL_H - 1) dp[i * 3 + 1] = 1;
      }
      dustGeo.attributes.position.needsUpdate = true;

      // Light beam breathing
      beamMesh.material.opacity = 0.03 + Math.sin(t * 0.5) * 0.01;
      beamMat2.opacity = 0.02 + Math.sin(t * 0.7) * 0.008;

      ren.render(scene, camera);
    };
    animate();

    // ── MOUSE CONTROLS ──
    const onDown = (e: MouseEvent) => {
      drag2.v = false;
      prev.x = e.clientX;
      prev.y = e.clientY;
      camOrbit.autoOrbit = false;
    };
    const onMove = (e: MouseEvent) => {
      const dx2 = e.clientX - prev.x;
      if (Math.abs(dx2) > 2 || Math.abs(e.clientY - prev.y) > 2) drag2.v = true;
      if (e.buttons === 1) {
        camOrbit.targetTheta -= dx2 * 0.004;
        prev.x = e.clientX;
        prev.y = e.clientY;
      }
      // Raycast hover
      const rect = el.getBoundingClientRect();
      mse.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const rc = new THREE.Raycaster();
      rc.setFromCamera(mse, camera);
      let found: string | null = null;
      let portalHov = false;
      doorMeshes.forEach(d => {
        const hits = rc.intersectObject(d.mesh);
        if (hits.length > 0 && hits[0].distance < 30) found = d.wingId;
      });
      const ph = rc.intersectObject(portalHit);
      if (ph.length > 0 && ph[0].distance < 30) portalHov = true;
      hoveredWing = found;
      el.style.cursor = (found || portalHov) ? "pointer" : "grab";
    };
    const onClick = () => {
      if (!drag2.v && hoveredWing) {
        onDoorClick(hoveredWing);
      } else if (!drag2.v) {
        // Check portal
        const rect = el.getBoundingClientRect();
        const rc = new THREE.Raycaster();
        rc.setFromCamera(new THREE.Vector2(
          ((prev.x - rect.left) / rect.width) * 2 - 1,
          -((prev.y - rect.top) / rect.height) * 2 + 1
        ), camera);
        const ph = rc.intersectObject(portalHit);
        if (ph.length > 0 && ph[0].distance < 30) onDoorClick("__exterior__");
      }
    };
    const onUp = () => {
      // Resume auto-orbit after a delay
      setTimeout(() => { camOrbit.autoOrbit = true; }, 3000);
    };
    const onWheel = (e: WheelEvent) => {
      camOrbit.radius = Math.max(4, Math.min(14, camOrbit.radius + e.deltaY * 0.01));
    };
    const onResize = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      ren.setSize(w, h);
    };
    el.addEventListener("mousedown", onDown);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("click", onClick);
    el.addEventListener("mouseup", onUp);
    el.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("resize", onResize);

    // ── TOUCH SUPPORT ──
    let touchTap = true;
    let touchStartX = 0, touchStartY = 0;
    const onTS = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchTap = true;
        camOrbit.autoOrbit = false;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        prev.x = e.touches[0].clientX;
        prev.y = e.touches[0].clientY;
      }
    };
    const onTM = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const dx2 = e.touches[0].clientX - prev.x;
        if (Math.abs(e.touches[0].clientX - touchStartX) > 8 || Math.abs(e.touches[0].clientY - touchStartY) > 8) {
          touchTap = false;
        }
        camOrbit.targetTheta -= dx2 * 0.004;
        prev.x = e.touches[0].clientX;
        prev.y = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        // Pinch to zoom
        touchTap = false;
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        camOrbit.radius = Math.max(4, Math.min(14, camOrbit.radius - (d - 300) * 0.001));
      }
    };
    const onTE = (e: TouchEvent) => {
      if (touchTap && e.changedTouches.length > 0) {
        const t2 = e.changedTouches[0];
        const rect = el.getBoundingClientRect();
        const rc = new THREE.Raycaster();
        rc.setFromCamera(new THREE.Vector2(
          ((t2.clientX - rect.left) / rect.width) * 2 - 1,
          -((t2.clientY - rect.top) / rect.height) * 2 + 1
        ), camera);
        let found: string | null = null;
        doorMeshes.forEach(d => {
          const hits = rc.intersectObject(d.mesh);
          if (hits.length > 0 && hits[0].distance < 30) found = d.wingId;
        });
        if (found) onDoorClick(found);
        else {
          const ph = rc.intersectObject(portalHit);
          if (ph.length > 0 && ph[0].distance < 30) onDoorClick("__exterior__");
        }
      }
      setTimeout(() => { camOrbit.autoOrbit = true; }, 3000);
    };
    el.addEventListener("touchstart", onTS, { passive: true });
    el.addEventListener("touchmove", onTM, { passive: false });
    el.addEventListener("touchend", onTE, { passive: true });

    // ── AUDIO ──
    try {
      const audio = new Audio("/audio/entrance-ambient.mp3");
      audio.loop = true;
      audio.volume = 0.15;
      audio.play().catch(() => {});
      audioRef.current = audio;
    } catch (_) {}

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("click", onClick);
      el.removeEventListener("mouseup", onUp);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("touchstart", onTS);
      el.removeEventListener("touchmove", onTM);
      el.removeEventListener("touchend", onTE);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (el.contains(ren.domElement)) el.removeChild(ren.domElement);
      ren.dispose();
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
