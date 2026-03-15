"use client";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, SMAAEffect } from "postprocessing";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";

// ═══ ENTRANCE HALL — Grand Roman Senate / Pantheon Chamber ═══
const HALL_WINGS = ["family","travel","childhood","career","creativity"];
const WING_LABELS: Record<string,string> = {
  family: "FAMILY",
  travel: "TRAVEL",
  childhood: "CHILDHOOD",
  career: "CAREER",
  creativity: "CREATIVITY",
};
const WING_ICONS: Record<string,string> = {
  family: "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}",
  travel: "\u2708\uFE0F",
  childhood: "\u{1F33B}",
  career: "\u{1F4D0}",
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
  const [muted, setMuted] = useState(false);

  // First-person camera refs (matching InteriorScene pattern)
  const lookA = useRef({ yaw: 0, pitch: 0 });
  const lookT = useRef({ yaw: 0, pitch: 0 });
  const pos = useRef(new THREE.Vector3());
  const posT = useRef(new THREE.Vector3());
  const keys = useRef<Record<string, boolean>>({});
  const drag = useRef(false);
  const prev = useRef({ x: 0, y: 0 });
  const hovMem = useRef<any>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let w = el.clientWidth, h = el.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#E8E2D8");
    scene.fog = new THREE.FogExp2("#E8E2D8", 0.006);

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
    const ren = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    ren.setSize(w, h);
    ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    ren.shadowMap.enabled = true;
    ren.shadowMap.type = THREE.PCFSoftShadowMap;
    ren.toneMapping = THREE.ACESFilmicToneMapping;
    ren.toneMappingExposure = 1.5;
    ren.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(ren.domElement);
    // ── POST-PROCESSING ──
    const composer = new EffectComposer(ren);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new EffectPass(camera,
      new BloomEffect({ luminanceThreshold: 0.3, luminanceSmoothing: 0.5, intensity: 1.5, mipmapBlur: true }),
      new VignetteEffect({ darkness: 0.4, offset: 0.3 }),
      new SMAAEffect()
    ));

    // ── MATERIALS (PBR-upgraded) ──
    const MS = {
      marble: new THREE.MeshStandardMaterial({ color: "#F5F0E8", roughness: 0.15, metalness: 0.0, envMapIntensity: 0.8 }),
      marbleWarm: new THREE.MeshStandardMaterial({ color: "#EDE5D8", roughness: 0.2, metalness: 0.0, envMapIntensity: 0.7 }),
      marbleDark: new THREE.MeshStandardMaterial({ color: "#C8B89A", roughness: 0.25, metalness: 0.0, envMapIntensity: 0.6 }),
      gold: new THREE.MeshStandardMaterial({ color: "#D4AF37", roughness: 0.2, metalness: 0.9, envMapIntensity: 1.2, emissive: "#D4AF37", emissiveIntensity: 0.15 }),
      goldDark: new THREE.MeshStandardMaterial({ color: "#B8922E", roughness: 0.25, metalness: 0.85, envMapIntensity: 1.0, emissive: "#B8922E", emissiveIntensity: 0.1 }),
      goldBright: new THREE.MeshStandardMaterial({ color: "#E8C84A", roughness: 0.15, metalness: 0.95, envMapIntensity: 1.4, emissive: "#E8C84A", emissiveIntensity: 0.25 }),
      column: new THREE.MeshStandardMaterial({ color: "#F0E8DC", roughness: 0.2, metalness: 0.0, envMapIntensity: 0.7 }),
      door: new THREE.MeshStandardMaterial({ color: "#8B5E3C", roughness: 0.40, metalness: 0.0, emissive: "#5A3E28", emissiveIntensity: 0.25 }),
      doorFrame: new THREE.MeshStandardMaterial({ color: "#E8C84A", roughness: 0.15, metalness: 0.9, envMapIntensity: 1.4, emissive: "#E8C84A", emissiveIntensity: 0.25 }),
      dome: new THREE.MeshStandardMaterial({ color: "#F5F0E8", roughness: 0.15, metalness: 0.0, envMapIntensity: 0.8, side: THREE.BackSide }),
      domeGold: new THREE.MeshStandardMaterial({ color: "#D4AF37", roughness: 0.2, metalness: 0.9, envMapIntensity: 1.2 }),
      floor: new THREE.MeshStandardMaterial({ color: "#E8DDD0", roughness: 0.08, metalness: 0.05, envMapIntensity: 1.0 }),
      floorDark: new THREE.MeshStandardMaterial({ color: "#C4B8A0", roughness: 0.1, metalness: 0.03, envMapIntensity: 0.9 }),
      floorAccent: new THREE.MeshStandardMaterial({ color: "#A89878", roughness: 0.12, metalness: 0.05, envMapIntensity: 0.8 }),
      bust: new THREE.MeshStandardMaterial({ color: "#E8E0D4", roughness: 0.35, metalness: 0.0, envMapIntensity: 0.5 }),
      bronze: new THREE.MeshStandardMaterial({ color: "#8A7050", roughness: 0.3, metalness: 0.7, envMapIntensity: 0.9 }),
      wall: new THREE.MeshStandardMaterial({ color: "#F5F0E8", roughness: 0.15, metalness: 0.0, envMapIntensity: 0.8, side: THREE.BackSide }),
      lightBeam: new THREE.MeshBasicMaterial({ color: "#FFF5E0", transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      atticDoor: new THREE.MeshStandardMaterial({ color: "#6A5040", roughness: 0.6, metalness: 0.0 }),
      atticStairs: new THREE.MeshStandardMaterial({ color: "#E8DDD0", roughness: 0.12, metalness: 0.03, envMapIntensity: 0.8 }),
      frescoPanel: new THREE.MeshStandardMaterial({ color: "#C4A070", roughness: 0.5, metalness: 0.05, envMapIntensity: 0.4 }),
      spiralRailing: new THREE.MeshStandardMaterial({ color: "#D4AF37", roughness: 0.2, metalness: 0.9, envMapIntensity: 1.2 }),
    };

    // ── ROOM DIMENSIONS ──
    const RADIUS = 20;
    const WALL_H = 12;
    const DOME_H = 14;
    const TOTAL_H = WALL_H + DOME_H;
    const OCULUS_R = 3.0;
    const NUM_COLS = 24;
    const NUM_DOORS = 5;

    // ── DOOR DIMENSIONS (MASSIVE) ──
    const DOOR_H = 7.0;
    const DOOR_W = 3.5;
    const DOOR_PANEL_GAP = 0.08; // gap between double-door panels

    // ── LIGHTING (dramatic PBR upgrade) ──
    // Hemisphere: warm sky / cool dark ground for contrast
    scene.add(new THREE.HemisphereLight("#FFF5E6", "#2A1A0A", 0.3));
    // Main oculus directional light — dramatic and intense
    const sunLight = new THREE.DirectionalLight("#FFF8E0", 3.5);
    sunLight.position.set(0, TOTAL_H + 10, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -12;
    sunLight.shadow.camera.right = 12;
    sunLight.shadow.camera.top = 12;
    sunLight.shadow.camera.bottom = -12;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);
    // Warm fill light (subtle, for depth)
    const fillLight = new THREE.DirectionalLight("#FFE0C0", 0.2);
    fillLight.position.set(-10, 8, 5);
    scene.add(fillLight);
    // Main oculus spotlight — very dramatic beam
    const oculusSpot = new THREE.SpotLight("#FFF8E0", 3.5, 50, Math.PI / 4, 0.5, 0.8);
    oculusSpot.position.set(0, TOTAL_H - 1, 0);
    oculusSpot.target.position.set(0, 0, 0);
    oculusSpot.castShadow = true;
    oculusSpot.shadow.mapSize.set(1024, 1024);
    scene.add(oculusSpot);
    scene.add(oculusSpot.target);
    // Secondary warm fill from oculus
    const oculusFill = new THREE.PointLight("#FFF0D0", 1.2, 40);
    oculusFill.position.set(0, TOTAL_H - 2, 0);
    scene.add(oculusFill);

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
    const centerMedallion = new THREE.Mesh(new THREE.CircleGeometry(3.0, 32), MS.floorDark);
    centerMedallion.rotation.x = -Math.PI / 2;
    centerMedallion.position.y = 0.005;
    centerMedallion.receiveShadow = true;
    scene.add(centerMedallion);
    const innerMedallion = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), MS.gold);
    innerMedallion.rotation.x = -Math.PI / 2;
    innerMedallion.position.y = 0.007;
    scene.add(innerMedallion);
    const starGeo = new THREE.CircleGeometry(1.5, 5);
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
      new THREE.TorusGeometry(RADIUS, 0.18, 8, 64),
      MS.marbleDark
    );
    baseMold.rotation.x = Math.PI / 2;
    baseMold.position.y = 0.18;
    scene.add(baseMold);

    // Top cornice (thicker)
    const cornice = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS - 0.1, 0.3, 8, 64),
      MS.gold
    );
    cornice.rotation.x = Math.PI / 2;
    cornice.position.y = WALL_H;
    scene.add(cornice);
    // Second cornice line
    const cornice2 = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS - 0.15, 0.15, 8, 64),
      MS.goldDark
    );
    cornice2.rotation.x = Math.PI / 2;
    cornice2.position.y = WALL_H - 0.4;
    scene.add(cornice2);

    // ── DOME ──
    const domeGeo = new THREE.SphereGeometry(RADIUS, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMesh = new THREE.Mesh(domeGeo, MS.dome);
    domeMesh.position.y = WALL_H;
    scene.add(domeMesh);

    // Gold rim at dome base
    const domeRim = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS - 0.05, 0.35, 10, 64),
      MS.domeGold
    );
    domeRim.rotation.x = Math.PI / 2;
    domeRim.position.y = WALL_H + 0.1;
    scene.add(domeRim);

    // Dome coffered ribs (more of them for richer detail)
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      for (let t = 0.06; t < 0.48; t += 0.015) {
        const phi = t * Math.PI;
        const r2 = RADIUS * Math.sin(phi);
        const y2 = WALL_H + RADIUS * Math.cos(phi);
        points.push(new THREE.Vector3(Math.cos(angle) * (r2 - 0.1), y2, Math.sin(angle) * (r2 - 0.1)));
      }
      const ribGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.07, 6, false);
      const rib = new THREE.Mesh(ribGeo, MS.goldDark);
      scene.add(rib);
    }
    // Concentric dome rings (more rings)
    for (let ring = 1; ring <= 6; ring++) {
      const phi = (ring / 8) * Math.PI / 2;
      const ringR = RADIUS * Math.sin(phi);
      const ringY = WALL_H + RADIUS * Math.cos(phi);
      const domeRing = new THREE.Mesh(
        new THREE.TorusGeometry(ringR, 0.05, 6, 48),
        MS.goldDark
      );
      domeRing.rotation.x = Math.PI / 2;
      domeRing.position.y = ringY;
      scene.add(domeRing);
    }
    // Coffer recesses (rosettes at intersections)
    for (let ri = 1; ri <= 5; ri++) {
      const phi = (ri / 8) * Math.PI / 2;
      const ringR = RADIUS * Math.sin(phi);
      const ringY = WALL_H + RADIUS * Math.cos(phi);
      for (let i = 0; i < 24; i++) {
        const angle = ((i + 0.5) / 24) * Math.PI * 2;
        const rosette = new THREE.Mesh(
          new THREE.CircleGeometry(0.25, 8),
          MS.goldDark
        );
        rosette.position.set(
          Math.cos(angle) * (ringR - 0.15),
          ringY,
          Math.sin(angle) * (ringR - 0.15)
        );
        // face outward from center of dome
        rosette.lookAt(
          Math.cos(angle) * (ringR + 5),
          ringY,
          Math.sin(angle) * (ringR + 5)
        );
        scene.add(rosette);
      }
    }

    // Oculus opening
    const oculusGeo = new THREE.CircleGeometry(OCULUS_R, 32);
    const oculusMat = new THREE.MeshBasicMaterial({ color: "#F0E8D8", side: THREE.DoubleSide });
    const oculusMesh = new THREE.Mesh(oculusGeo, oculusMat);
    oculusMesh.rotation.x = Math.PI / 2;
    oculusMesh.position.y = TOTAL_H - 0.3;
    scene.add(oculusMesh);
    // Oculus ring (thicker)
    const oculusRing = new THREE.Mesh(
      new THREE.TorusGeometry(OCULUS_R, 0.35, 10, 32),
      MS.gold
    );
    oculusRing.rotation.x = Math.PI / 2;
    oculusRing.position.y = TOTAL_H - 0.3;
    scene.add(oculusRing);

    // ── VOLUMETRIC LIGHT CONES from oculus (realistic overlapping cones) ──
    const beamGeo = new THREE.ConeGeometry(8, 20, 32, 1, true);
    const beamMesh = new THREE.Mesh(beamGeo, MS.lightBeam);
    beamMesh.position.y = TOTAL_H - 10;
    scene.add(beamMesh);
    // Medium cone
    const beamGeo2 = new THREE.ConeGeometry(5.5, 22, 32, 1, true);
    const beamMat2 = new THREE.MeshBasicMaterial({
      color: "#FFF5E0", transparent: true, opacity: 0.04,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const beamMesh2 = new THREE.Mesh(beamGeo2, beamMat2);
    beamMesh2.position.y = TOTAL_H - 11;
    scene.add(beamMesh2);
    // Tight core cone for bright center
    const beamGeo3 = new THREE.ConeGeometry(3, 24, 32, 1, true);
    const beamMat3 = new THREE.MeshBasicMaterial({
      color: "#FFF8E8", transparent: true, opacity: 0.05,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const beamMesh3 = new THREE.Mesh(beamGeo3, beamMat3);
    beamMesh3.position.y = TOTAL_H - 12;
    scene.add(beamMesh3);

    // ── COLUMNS (instanced, with fluting detail) ──
    const colR = 0.4;
    const colH = WALL_H - 0.5;
    // Column shaft
    const colShaftGeo = new THREE.CylinderGeometry(colR, colR * 1.08, colH, 16);
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

    // Column capitals (larger, more ornate)
    const capGeo = new THREE.CylinderGeometry(colR * 1.8, colR * 1.1, 0.6, 16);
    const capMesh = new THREE.InstancedMesh(capGeo, MS.gold, NUM_COLS);
    for (let i = 0; i < NUM_COLS; i++) {
      const angle = (i / NUM_COLS) * Math.PI * 2;
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, colH + 0.3, cz);
      capMesh.setMatrixAt(i, colMatrix);
    }
    capMesh.instanceMatrix.needsUpdate = true;
    scene.add(capMesh);

    // Capital abacus (square top) for Corinthian look
    const abacusGeo = new THREE.BoxGeometry(colR * 3.2, 0.12, colR * 3.2);
    const abacusMesh = new THREE.InstancedMesh(abacusGeo, MS.marbleWarm, NUM_COLS);
    for (let i = 0; i < NUM_COLS; i++) {
      const angle = (i / NUM_COLS) * Math.PI * 2;
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, colH + 0.66, cz);
      abacusMesh.setMatrixAt(i, colMatrix);
    }
    abacusMesh.instanceMatrix.needsUpdate = true;
    scene.add(abacusMesh);

    // Column bases (instanced)
    const baseGeo = new THREE.CylinderGeometry(colR * 1.3, colR * 1.5, 0.35, 16);
    const baseMeshI = new THREE.InstancedMesh(baseGeo, MS.marbleDark, NUM_COLS);
    for (let i = 0; i < NUM_COLS; i++) {
      const angle = (i / NUM_COLS) * Math.PI * 2;
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, 0.175, cz);
      baseMeshI.setMatrixAt(i, colMatrix);
    }
    baseMeshI.instanceMatrix.needsUpdate = true;
    scene.add(baseMeshI);

    // Column fluting (vertical grooves simulated with rings + vertical lines)
    for (let i = 0; i < NUM_COLS; i++) {
      const angle = (i / NUM_COLS) * Math.PI * 2;
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      // Rings at top, middle, bottom
      for (const ry of [0.7, colH * 0.33, colH * 0.66, colH - 0.5]) {
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(colR + 0.02, 0.03, 6, 16), MS.marbleWarm);
        ring2.rotation.x = Math.PI / 2;
        ring2.position.set(cx, ry, cz);
        scene.add(ring2);
      }
      // Fluting lines (vertical tubes around column)
      for (let f = 0; f < 8; f++) {
        const fa = (f / 8) * Math.PI * 2;
        const fx = cx + Math.cos(fa) * (colR + 0.01);
        const fz = cz + Math.sin(fa) * (colR + 0.01);
        const fluteLine = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, colH - 1.2, 4),
          MS.marbleWarm
        );
        fluteLine.position.set(fx, colH / 2, fz);
        scene.add(fluteLine);
      }
    }

    // ── 5 GRAND DOORS (MASSIVE) ──
    const doorMeshes: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; wingId: string; angle: number }[] = [];

    HALL_WINGS.forEach((wingId, i) => {
      const wing = WINGS.find(ww => ww.id === wingId);
      if (!wing) return;
      const accent = wing.accent;
      const angle = (i / NUM_DOORS) * Math.PI * 2 - Math.PI / 2;
      const dx = Math.cos(angle) * (RADIUS - 0.4);
      const dz = Math.sin(angle) * (RADIUS - 0.4);

      // Inward normal (pointing to center)
      const inN = new THREE.Vector3(-Math.cos(angle), 0, -Math.sin(angle));
      // Lateral (perpendicular to door)
      const latN = new THREE.Vector3(Math.cos(angle + Math.PI / 2), 0, Math.sin(angle + Math.PI / 2));

      // Door recess / alcove — recessed INTO the wall (behind door panels)
      const recessGeo = new THREE.BoxGeometry(DOOR_W + 1.0, DOOR_H + 1.0, 0.9);
      const recessMat = new THREE.MeshStandardMaterial({ color: "#1A1008", roughness: 0.9, metalness: 0.0 });
      const recessMesh = mk(recessGeo, recessMat,
        dx - inN.x * 0.5, (DOOR_H + 1.0) / 2, dz - inN.z * 0.5);
      recessMesh.lookAt(0, (DOOR_H + 1.0) / 2, 0);
      scene.add(recessMesh);

      // ── THICK ORNATE GOLDEN FRAME ──
      const frameThick = 0.4;
      const frameDepth = 0.3;
      // Left frame pillar
      const lpGeo = new THREE.BoxGeometry(frameThick, DOOR_H + 0.4, frameDepth);
      const lp = new THREE.Mesh(lpGeo, MS.doorFrame);
      lp.position.set(
        dx + latN.x * (DOOR_W / 2 + frameThick / 2) + inN.x * 0.05,
        (DOOR_H + 0.4) / 2,
        dz + latN.z * (DOOR_W / 2 + frameThick / 2) + inN.z * 0.05
      );
      lp.lookAt(new THREE.Vector3(0, (DOOR_H + 0.4) / 2, 0));
      scene.add(lp);
      // Right frame pillar
      const rp = new THREE.Mesh(lpGeo, MS.doorFrame);
      rp.position.set(
        dx - latN.x * (DOOR_W / 2 + frameThick / 2) + inN.x * 0.05,
        (DOOR_H + 0.4) / 2,
        dz - latN.z * (DOOR_W / 2 + frameThick / 2) + inN.z * 0.05
      );
      rp.lookAt(new THREE.Vector3(0, (DOOR_H + 0.4) / 2, 0));
      scene.add(rp);
      // Top lintel
      const lintelGeo = new THREE.BoxGeometry(DOOR_W + frameThick * 2 + 0.4, 0.4, frameDepth);
      const lintel = new THREE.Mesh(lintelGeo, MS.doorFrame);
      lintel.position.set(dx + inN.x * 0.05, DOOR_H + 0.4, dz + inN.z * 0.05);
      lintel.lookAt(new THREE.Vector3(0, DOOR_H + 0.4, 0));
      scene.add(lintel);
      // Bottom threshold
      const threshGeo = new THREE.BoxGeometry(DOOR_W + frameThick * 2 + 0.4, 0.15, frameDepth);
      const thresh = new THREE.Mesh(threshGeo, MS.goldDark);
      thresh.position.set(dx + inN.x * 0.05, 0.075, dz + inN.z * 0.05);
      thresh.lookAt(new THREE.Vector3(0, 0.075, 0));
      scene.add(thresh);

      // ── ROMAN ARCH above door ──
      const archW = DOOR_W / 2 + 0.5;
      const archH = 1.5;
      const archCurve = new THREE.EllipseCurve(0, 0, archW, archH, 0, Math.PI, false, 0);
      const archPoints = archCurve.getPoints(30).map(p => new THREE.Vector3(p.x, p.y, 0));
      const archGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints), 30, 0.14, 8, false);
      const archMesh = new THREE.Mesh(archGeo, MS.gold);
      archMesh.position.set(dx + inN.x * 0.05, DOOR_H + 0.6, dz + inN.z * 0.05);
      archMesh.lookAt(new THREE.Vector3(0, DOOR_H + 0.6, 0));
      archMesh.rotateY(Math.PI);
      scene.add(archMesh);
      // Keystone at top of arch
      const keystone = mk(new THREE.BoxGeometry(0.4, 0.5, 0.2), MS.goldBright,
        dx + inN.x * 0.44, DOOR_H + 0.6 + archH, dz + inN.z * 0.44);
      keystone.lookAt(new THREE.Vector3(0, DOOR_H + 0.6 + archH, 0));
      scene.add(keystone);

      // ── DOUBLE DOOR PANELS (two panels per door) ──
      const panelW = (DOOR_W - DOOR_PANEL_GAP) / 2;
      const doorMat = new THREE.MeshStandardMaterial({ color: "#B07848", roughness: 0.35, metalness: 0.0, emissive: "#A06830", emissiveIntensity: 0.45 });

      // Left door panel — positioned in front of recess, toward center
      const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(panelW, DOOR_H, 0.25), doorMat);
      leftPanel.position.set(
        dx + latN.x * (panelW / 2 + DOOR_PANEL_GAP / 2) + inN.x * 0.2,
        DOOR_H / 2,
        dz + latN.z * (panelW / 2 + DOOR_PANEL_GAP / 2) + inN.z * 0.2
      );
      leftPanel.lookAt(new THREE.Vector3(0, DOOR_H / 2, 0));
      leftPanel.castShadow = true;
      leftPanel.userData = { wingId };
      scene.add(leftPanel);

      // Right door panel — positioned in front of recess, toward center
      const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(panelW, DOOR_H, 0.25), doorMat);
      rightPanel.position.set(
        dx - latN.x * (panelW / 2 + DOOR_PANEL_GAP / 2) + inN.x * 0.2,
        DOOR_H / 2,
        dz - latN.z * (panelW / 2 + DOOR_PANEL_GAP / 2) + inN.z * 0.2
      );
      rightPanel.lookAt(new THREE.Vector3(0, DOOR_H / 2, 0));
      rightPanel.castShadow = true;
      rightPanel.userData = { wingId };
      scene.add(rightPanel);

      // Use left panel as the main hit target
      doorMeshes.push({ mesh: leftPanel, mat: doorMat, wingId, angle });
      doorMeshes.push({ mesh: rightPanel, mat: doorMat, wingId, angle });

      // Center seam line (golden strip between panels)
      const seamGeo = new THREE.BoxGeometry(0.06, DOOR_H - 0.2, 0.005);
      const seam = new THREE.Mesh(seamGeo, MS.gold);
      seam.position.set(dx + inN.x * 0.35, DOOR_H / 2, dz + inN.z * 0.35);
      seam.lookAt(new THREE.Vector3(0, DOOR_H / 2, 0));
      scene.add(seam);

      // Door panel details: inset rectangles with gold trim + center rosette
      for (const side of [-1, 1]) {
        const panelCenterLat = latN.clone().multiplyScalar(side * (panelW / 2 + DOOR_PANEL_GAP / 2));
        // Panel inset rectangles (top and bottom on each panel)
        for (const py of [1.2, 2.8, 4.6, 5.8]) {
          const detailH = py < 3 ? 1.2 : 0.8;
          // Darker inset recess
          const insetBgGeo = new THREE.BoxGeometry(panelW * 0.72, detailH + 0.04, 0.05);
          const insetBg = new THREE.Mesh(insetBgGeo, new THREE.MeshStandardMaterial({ color: "#5A3E1E", roughness: 0.6 }));
          insetBg.position.set(
            dx + panelCenterLat.x + inN.x * 0.36,
            py,
            dz + panelCenterLat.z + inN.z * 0.36
          );
          insetBg.lookAt(new THREE.Vector3(0, py, 0));
          scene.add(insetBg);
          // Gold trim border
          const insetGeo = new THREE.BoxGeometry(panelW * 0.7, detailH, 0.06);
          const inset = new THREE.Mesh(insetGeo, MS.goldBright);
          inset.position.set(
            dx + panelCenterLat.x + inN.x * 0.38,
            py,
            dz + panelCenterLat.z + inN.z * 0.38
          );
          inset.lookAt(new THREE.Vector3(0, py, 0));
          scene.add(inset);
        }
        // Large ROSETTE / medallion at center of each panel (~3.5m height)
        const rosY = DOOR_H * 0.5;
        const rosetteOuter = new THREE.Mesh(
          new THREE.CircleGeometry(0.35, 16),
          new THREE.MeshStandardMaterial({ color: "#E8C84A", roughness: 0.15, metalness: 0.95, emissive: "#E8C84A", emissiveIntensity: 0.25, side: THREE.DoubleSide })
        );
        rosetteOuter.position.set(
          dx + panelCenterLat.x + inN.x * 0.40,
          rosY,
          dz + panelCenterLat.z + inN.z * 0.40
        );
        rosetteOuter.lookAt(new THREE.Vector3(0, rosY, 0));
        scene.add(rosetteOuter);
        // Inner rosette
        const rosetteInner = new THREE.Mesh(
          new THREE.CircleGeometry(0.22, 12),
          new THREE.MeshStandardMaterial({ color: "#8A6830", roughness: 0.3, metalness: 0.8, side: THREE.DoubleSide })
        );
        rosetteInner.position.set(
          dx + panelCenterLat.x + inN.x * 0.42,
          rosY,
          dz + panelCenterLat.z + inN.z * 0.405
        );
        rosetteInner.lookAt(new THREE.Vector3(0, rosY, 0));
        scene.add(rosetteInner);
        // Rosette center dot
        const rosetteDot = new THREE.Mesh(
          new THREE.CircleGeometry(0.08, 8),
          new THREE.MeshStandardMaterial({ color: "#E8C84A", roughness: 0.15, metalness: 0.95, emissive: "#E8C84A", emissiveIntensity: 0.25, side: THREE.DoubleSide })
        );
        rosetteDot.position.set(
          dx + panelCenterLat.x + inN.x * 0.44,
          rosY,
          dz + panelCenterLat.z + inN.z * 0.1
        );
        rosetteDot.lookAt(new THREE.Vector3(0, rosY, 0));
        scene.add(rosetteDot);
      }

      // ── LARGE BRASS RING HANDLES ──
      for (const side of [-1, 1]) {
        const handleLat = latN.clone().multiplyScalar(side * 0.4);
        // Large ring handle (radius 0.2, thick tube)
        const handleRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.2, 0.045, 12, 20),
          MS.goldBright
        );
        handleRing.position.set(
          dx + handleLat.x + inN.x * 0.46,
          DOOR_H * 0.43,
          dz + handleLat.z + inN.z * 0.46
        );
        handleRing.lookAt(new THREE.Vector3(0, DOOR_H * 0.43, 0));
        scene.add(handleRing);
        // Large mount plate (decorative backplate)
        const handlePlate = new THREE.Mesh(
          new THREE.CircleGeometry(0.13, 12),
          new THREE.MeshStandardMaterial({ color: "#B8922E", roughness: 0.25, metalness: 0.85, emissive: "#B8922E", emissiveIntensity: 0.1, side: THREE.DoubleSide })
        );
        handlePlate.position.set(
          dx + handleLat.x + inN.x * 0.45,
          DOOR_H * 0.43 + 0.2,
          dz + handleLat.z + inN.z * 0.45
        );
        handlePlate.lookAt(new THREE.Vector3(0, DOOR_H * 0.43 + 0.2, 0));
        scene.add(handlePlate);
        // Handle mount pin
        const handleMount = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8),
          MS.goldBright
        );
        handleMount.position.set(
          dx + handleLat.x + inN.x * 0.44,
          DOOR_H * 0.43 + 0.2,
          dz + handleLat.z + inN.z * 0.44
        );
        scene.add(handleMount);
      }

      // WARM fill light illuminating the door surface — bright so wood is visible
      const doorFill = new THREE.PointLight("#FFF0D0", 2.0, 10);
      doorFill.position.set(dx + inN.x * 2.5, DOOR_H * 0.5, dz + inN.z * 2.5);
      scene.add(doorFill);

      // DEDICATED SPOTLIGHT aimed directly at door face (intensity 3.0, from 6m away)
      const doorFaceSpot = new THREE.SpotLight("#FFF5E0", 3.0, 16, Math.PI / 4.5, 0.35, 0.7);
      doorFaceSpot.position.set(dx + inN.x * 6.0, DOOR_H * 0.55, dz + inN.z * 6.0);
      doorFaceSpot.target.position.set(dx, DOOR_H * 0.42, dz);
      scene.add(doorFaceSpot);
      scene.add(doorFaceSpot.target);

      // Focused spotlight near each door (pool of light on floor)
      const doorSpot = new THREE.SpotLight(accent, 1.5, 14, Math.PI / 5, 0.5, 0.9);
      doorSpot.position.set(
        dx + inN.x * 1.5,
        DOOR_H + 0.5,
        dz + inN.z * 1.5
      );
      doorSpot.target.position.set(
        dx + inN.x * 2.5,
        0,
        dz + inN.z * 2.5
      );
      scene.add(doorSpot);
      scene.add(doorSpot.target);

      // ── WING ACCENT COLOR STRIPS on each side of door frame ──
      const accentStripW = 0.1;
      const accentStripMat = new THREE.MeshStandardMaterial({
        color: accent, roughness: 0.3, metalness: 0.2,
        emissive: accent, emissiveIntensity: 0.4,
      });
      for (const stripSide of [-1, 1]) {
        const stripMesh = new THREE.Mesh(
          new THREE.BoxGeometry(accentStripW, DOOR_H + 0.4, 0.12),
          accentStripMat
        );
        stripMesh.position.set(
          dx + latN.x * stripSide * (DOOR_W / 2 + frameThick + accentStripW / 2) + inN.x * 0.05,
          (DOOR_H + 0.4) / 2,
          dz + latN.z * stripSide * (DOOR_W / 2 + frameThick + accentStripW / 2) + inN.z * 0.05
        );
        stripMesh.lookAt(new THREE.Vector3(0, (DOOR_H + 0.4) / 2, 0));
        scene.add(stripMesh);
      }

      // ── LARGE STATUE above door on pedestal ──
      const statueBaseY = DOOR_H + archH + 1.2;
      const sBx = dx + inN.x * 0.15;
      const sBz = dz + inN.z * 0.15;

      // Large pedestal
      scene.add(mk(new THREE.BoxGeometry(2.0, 0.4, 0.8), MS.marbleDark, sBx, statueBaseY, sBz));
      scene.add(mk(new THREE.BoxGeometry(1.6, 0.2, 0.7), MS.marble, sBx, statueBaseY + 0.3, sBz));

      // Statue material with wing accent tint
      const statueMat = new THREE.MeshStandardMaterial({
        color: "#E8E0D4",
        roughness: 0.35,
        metalness: 0.0,
        envMapIntensity: 0.5,
        emissive: new THREE.Color(accent),
        emissiveIntensity: 0.05,
      });

      // Build statue based on wing type
      const sY = statueBaseY + 0.4; // base of statue
      const statueH = 3.5;

      if (wingId === "family") {
        // Parent holding child — two figures
        // Adult body
        scene.add(mk(new THREE.CylinderGeometry(0.35, 0.45, 1.6, 10), statueMat, sBx, sY + 0.8, sBz)); // torso
        scene.add(mk(new THREE.SphereGeometry(0.3, 12, 12), statueMat, sBx, sY + 1.9, sBz)); // head
        // Arms reaching down to child
        const armGeo = new THREE.CylinderGeometry(0.08, 0.07, 1.0, 6);
        const lArm = new THREE.Mesh(armGeo, statueMat);
        lArm.position.set(sBx + latN.x * 0.45, sY + 1.2, sBz + latN.z * 0.45);
        lArm.rotation.z = 0.4;
        scene.add(lArm);
        const rArm = new THREE.Mesh(armGeo, statueMat);
        rArm.position.set(sBx - latN.x * 0.3, sY + 1.0, sBz - latN.z * 0.3);
        rArm.rotation.z = -0.6;
        scene.add(rArm);
        // Child figure
        scene.add(mk(new THREE.CylinderGeometry(0.2, 0.25, 0.9, 8), statueMat, sBx - latN.x * 0.4, sY + 0.45, sBz - latN.z * 0.4));
        scene.add(mk(new THREE.SphereGeometry(0.2, 10, 10), statueMat, sBx - latN.x * 0.4, sY + 1.1, sBz - latN.z * 0.4));
        // Legs
        scene.add(mk(new THREE.CylinderGeometry(0.12, 0.14, 1.0, 6), statueMat, sBx + latN.x * 0.15, sY + 0.0 - 0.1, sBz + latN.z * 0.15));
        scene.add(mk(new THREE.CylinderGeometry(0.12, 0.14, 1.0, 6), statueMat, sBx - latN.x * 0.1, sY + 0.0 - 0.1, sBz - latN.z * 0.1));
      } else if (wingId === "travel") {
        // Figure with globe, adventurous stance
        // Body
        scene.add(mk(new THREE.CylinderGeometry(0.35, 0.4, 1.8, 10), statueMat, sBx, sY + 0.9, sBz)); // torso
        scene.add(mk(new THREE.SphereGeometry(0.3, 12, 12), statueMat, sBx, sY + 2.1, sBz)); // head
        // Legs (one forward, adventurous)
        scene.add(mk(new THREE.CylinderGeometry(0.12, 0.14, 1.1, 6), statueMat, sBx + latN.x * 0.15, sY - 0.1, sBz + latN.z * 0.15));
        const legFwd = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.1, 6), statueMat);
        legFwd.position.set(sBx - latN.x * 0.15 + inN.x * 0.3, sY - 0.05, sBz - latN.z * 0.15 + inN.z * 0.3);
        legFwd.rotation.x = 0.3;
        scene.add(legFwd);
        // Right arm holding globe up
        const armUp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 1.2, 6), statueMat);
        armUp.position.set(sBx + latN.x * 0.5, sY + 1.8, sBz + latN.z * 0.5);
        armUp.rotation.z = -0.8;
        scene.add(armUp);
        // Globe
        scene.add(mk(new THREE.SphereGeometry(0.3, 12, 12), MS.goldDark, sBx + latN.x * 0.8, sY + 2.5, sBz + latN.z * 0.8));
        // Globe latitude lines
        for (const lat of [0.1, 0.2]) {
          const gRing = new THREE.Mesh(new THREE.TorusGeometry(0.3 * Math.cos(Math.asin(lat / 0.3)), 0.01, 4, 12), MS.gold);
          gRing.position.set(sBx + latN.x * 0.8, sY + 2.5 + lat, sBz + latN.z * 0.8);
          gRing.rotation.x = Math.PI / 2;
          scene.add(gRing);
        }
        // Left arm on hip
        const armHip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.9, 6), statueMat);
        armHip.position.set(sBx - latN.x * 0.5, sY + 1.2, sBz - latN.z * 0.5);
        armHip.rotation.z = 0.6;
        scene.add(armHip);
      } else if (wingId === "childhood") {
        // Playful seated figure reading
        // Seated body (shorter torso, angled)
        scene.add(mk(new THREE.CylinderGeometry(0.3, 0.35, 1.2, 10), statueMat, sBx, sY + 0.6, sBz)); // torso
        scene.add(mk(new THREE.SphereGeometry(0.28, 12, 12), statueMat, sBx + inN.x * 0.44, sY + 1.5, sBz + inN.z * 0.44)); // head (tilted forward reading)
        // Legs (crossed/seated)
        const seatLeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.9, 6), statueMat);
        seatLeg1.position.set(sBx + latN.x * 0.2, sY + 0.0, sBz + latN.z * 0.2);
        seatLeg1.rotation.z = Math.PI / 2 * 0.8;
        scene.add(seatLeg1);
        const seatLeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.9, 6), statueMat);
        seatLeg2.position.set(sBx - latN.x * 0.15 + inN.x * 0.15, sY + 0.0, sBz - latN.z * 0.15 + inN.z * 0.15);
        seatLeg2.rotation.x = 0.5;
        scene.add(seatLeg2);
        // Arms holding book
        const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.8, 6), statueMat);
        armR.position.set(sBx + latN.x * 0.35 + inN.x * 0.2, sY + 0.9, sBz + latN.z * 0.35 + inN.z * 0.2);
        armR.rotation.z = 0.5;
        scene.add(armR);
        const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.8, 6), statueMat);
        armL.position.set(sBx - latN.x * 0.35 + inN.x * 0.2, sY + 0.9, sBz - latN.z * 0.35 + inN.z * 0.2);
        armL.rotation.z = -0.5;
        scene.add(armL);
        // Book
        scene.add(mk(new THREE.BoxGeometry(0.5, 0.06, 0.35), MS.goldDark, sBx + inN.x * 0.4, sY + 0.9, sBz + inN.z * 0.4));
      } else if (wingId === "career") {
        // Toga-wearing figure with scroll, dignified standing
        // Body with wider toga shape
        scene.add(mk(new THREE.CylinderGeometry(0.4, 0.5, 2.0, 10), statueMat, sBx, sY + 1.0, sBz)); // toga torso
        scene.add(mk(new THREE.SphereGeometry(0.3, 12, 12), statueMat, sBx, sY + 2.3, sBz)); // head
        // Legs
        scene.add(mk(new THREE.CylinderGeometry(0.13, 0.15, 1.0, 6), statueMat, sBx + latN.x * 0.15, sY - 0.05, sBz + latN.z * 0.15));
        scene.add(mk(new THREE.CylinderGeometry(0.13, 0.15, 1.0, 6), statueMat, sBx - latN.x * 0.15, sY - 0.05, sBz - latN.z * 0.15));
        // Right arm holding scroll outward
        const armScroll = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 1.2, 6), statueMat);
        armScroll.position.set(sBx + latN.x * 0.55, sY + 1.5, sBz + latN.z * 0.55);
        armScroll.rotation.z = -1.0;
        scene.add(armScroll);
        // Scroll
        scene.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), MS.marbleWarm, sBx + latN.x * 0.9, sY + 1.8, sBz + latN.z * 0.9));
        // Left arm at side
        const armSide = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 1.0, 6), statueMat);
        armSide.position.set(sBx - latN.x * 0.45, sY + 1.2, sBz - latN.z * 0.45);
        armSide.rotation.z = 0.15;
        scene.add(armSide);
        // Laurel wreath on head
        const laurel = new THREE.Mesh(
          new THREE.TorusGeometry(0.32, 0.04, 6, 16),
          MS.goldBright
        );
        laurel.position.set(sBx, sY + 2.45, sBz);
        laurel.rotation.x = Math.PI / 6;
        scene.add(laurel);
      } else if (wingId === "creativity") {
        // Figure with lyre, artistic pose
        // Body (slight lean)
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 1.8, 10), statueMat);
        torso.position.set(sBx, sY + 0.9, sBz);
        torso.rotation.z = 0.08;
        scene.add(torso);
        scene.add(mk(new THREE.SphereGeometry(0.3, 12, 12), statueMat, sBx + latN.x * 0.05, sY + 2.1, sBz + latN.z * 0.05)); // head tilted
        // Legs
        scene.add(mk(new THREE.CylinderGeometry(0.12, 0.14, 1.0, 6), statueMat, sBx + latN.x * 0.15, sY - 0.05, sBz + latN.z * 0.15));
        scene.add(mk(new THREE.CylinderGeometry(0.12, 0.14, 1.0, 6), statueMat, sBx - latN.x * 0.15, sY - 0.05, sBz - latN.z * 0.15));
        // Left arm holding lyre
        const armLyre = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 1.0, 6), statueMat);
        armLyre.position.set(sBx - latN.x * 0.5, sY + 1.3, sBz - latN.z * 0.5);
        armLyre.rotation.z = 0.7;
        scene.add(armLyre);
        // Lyre (simplified: U-shape + crossbar)
        const lyreX = sBx - latN.x * 0.75;
        const lyreZ = sBz - latN.z * 0.75;
        const lyreY = sY + 1.5;
        // U-shape arms
        for (const s of [-1, 1]) {
          const lyreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), MS.goldBright);
          lyreArm.position.set(lyreX + latN.x * s * 0.15, lyreY + 0.35, lyreZ + latN.z * s * 0.15);
          scene.add(lyreArm);
        }
        // Crossbar
        scene.add(mk(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), MS.goldBright, lyreX, lyreY + 0.65, lyreZ));
        // Strings
        for (let s = -1; s <= 1; s++) {
          const str = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.6, 4), MS.gold);
          str.position.set(lyreX + latN.x * s * 0.06, lyreY + 0.3, lyreZ + latN.z * s * 0.06);
          scene.add(str);
        }
        // Lyre body (rounded base)
        scene.add(mk(new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), MS.goldDark, lyreX, lyreY, lyreZ));
        // Right arm reaching up artistically
        const armUp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 1.1, 6), statueMat);
        armUp.position.set(sBx + latN.x * 0.5, sY + 1.7, sBz + latN.z * 0.5);
        armUp.rotation.z = -0.9;
        scene.add(armUp);
      }

      // Statue spotlight from above
      const statueSpot = new THREE.SpotLight("#FFF8E0", 0.8, 12, Math.PI / 8, 0.5, 1);
      statueSpot.position.set(sBx + inN.x * 2, WALL_H - 1, sBz + inN.z * 2);
      statueSpot.target.position.set(sBx, statueBaseY + 1.5, sBz);
      scene.add(statueSpot);
      scene.add(statueSpot.target);

      // ── LARGE WING NAME LABEL ON THE DOOR SURFACE (at ~3.0m height) ──
      {
        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = 1024;
        labelCanvas.height = 256;
        const lctx = labelCanvas.getContext("2d")!;
        // Solid dark background for maximum contrast
        lctx.fillStyle = "#1A1008";
        lctx.fillRect(0, 0, 1024, 256);
        // Thick gold border
        lctx.strokeStyle = "#E8C84A";
        lctx.lineWidth = 10;
        lctx.strokeRect(6, 6, 1012, 244);
        // Inner gold border
        lctx.strokeStyle = "#D4AF37";
        lctx.lineWidth = 4;
        lctx.strokeRect(18, 18, 988, 220);
        // Wing icon (emoji) on the left
        const wingIcon = WING_ICONS[wingId] || "";
        lctx.font = "90px sans-serif";
        lctx.textAlign = "left";
        lctx.textBaseline = "middle";
        lctx.fillStyle = "#FFFFFF";
        lctx.fillText(wingIcon, 40, 128);
        // Wing name in HUGE gold text (120px bold Georgia)
        const eyeLabel = WING_LABELS[wingId] || wingId.toUpperCase();
        lctx.fillStyle = "#E8C84A";
        lctx.font = "bold 120px Georgia, 'Times New Roman', serif";
        lctx.textAlign = "center";
        lctx.textBaseline = "middle";
        lctx.fillText(eyeLabel, 560, 120);
        // Bright gold highlight (offset text for depth/glow effect)
        lctx.fillStyle = "#FFF5D0";
        lctx.globalAlpha = 0.35;
        lctx.fillText(eyeLabel, 560, 117);
        lctx.globalAlpha = 1.0;
        // Decorative line under text
        lctx.strokeStyle = "#E8C84A";
        lctx.lineWidth = 4;
        lctx.beginPath();
        lctx.moveTo(160, 200);
        lctx.lineTo(864, 200);
        lctx.stroke();

        const labelTex = new THREE.CanvasTexture(labelCanvas);
        labelTex.colorSpace = THREE.SRGBColorSpace;
        const labelMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(3.0, 0.75),
          new THREE.MeshBasicMaterial({
            map: labelTex, side: THREE.DoubleSide,
          })
        );
        // Position ON the door panel surface at ~3.0m height (in front of panels)
        labelMesh.position.set(
          dx + inN.x * 0.45,
          3.0,
          dz + inN.z * 0.45
        );
        labelMesh.lookAt(new THREE.Vector3(0, 3.0, 0));
        scene.add(labelMesh);
      }

      // ── FRESCO WING NAME (large 3D text via canvas texture — above statues) ──
      const frescoY = DOOR_H + archH + 0.3;
      const frescoW = 4.0;
      const frescoH = 2.0;

      // Fresco background panel
      const frescoPanelGeo = new THREE.BoxGeometry(frescoW + 0.6, frescoH + 0.4, 0.08);
      const frescoBg = new THREE.Mesh(frescoPanelGeo, MS.frescoPanel);
      frescoBg.position.set(dx + inN.x * 0.02, frescoY + frescoH / 2, dz + inN.z * 0.02);
      frescoBg.lookAt(new THREE.Vector3(0, frescoY + frescoH / 2, 0));
      frescoBg.rotateY(Math.PI);
      scene.add(frescoBg);

      // Gold border trim around fresco (4 edges)
      const trimThick = 0.12;
      const trimDepth = 0.04;
      // Top border
      const topTrim = new THREE.Mesh(new THREE.BoxGeometry(frescoW + 0.8, trimThick, trimDepth), MS.goldBright);
      topTrim.position.set(dx + inN.x * 0.36, frescoY + frescoH + 0.22, dz + inN.z * 0.36);
      topTrim.lookAt(new THREE.Vector3(0, frescoY + frescoH + 0.22, 0));
      topTrim.rotateY(Math.PI);
      scene.add(topTrim);
      // Bottom border
      const botTrim = new THREE.Mesh(new THREE.BoxGeometry(frescoW + 0.8, trimThick, trimDepth), MS.goldBright);
      botTrim.position.set(dx + inN.x * 0.36, frescoY - 0.02, dz + inN.z * 0.36);
      botTrim.lookAt(new THREE.Vector3(0, frescoY - 0.02, 0));
      botTrim.rotateY(Math.PI);
      scene.add(botTrim);

      // Fresco text (canvas texture for large text)
      const frescoCanvas = document.createElement("canvas");
      frescoCanvas.width = 1024;
      frescoCanvas.height = 512;
      const fCtx = frescoCanvas.getContext("2d")!;
      // Warm fresco background
      const gradient = fCtx.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, "#C4A070");
      gradient.addColorStop(0.5, "#B89060");
      gradient.addColorStop(1, "#C4A070");
      fCtx.fillStyle = gradient;
      fCtx.fillRect(0, 0, 1024, 512);
      // Aged texture effect
      fCtx.globalAlpha = 0.15;
      for (let p = 0; p < 200; p++) {
        fCtx.fillStyle = Math.random() > 0.5 ? "#A08050" : "#D4B888";
        fCtx.fillRect(Math.random() * 1024, Math.random() * 512, Math.random() * 30 + 5, Math.random() * 30 + 5);
      }
      fCtx.globalAlpha = 1.0;
      // Large golden text
      fCtx.fillStyle = "#D4B060";
      fCtx.strokeStyle = "#8A6830";
      fCtx.lineWidth = 3;
      fCtx.font = "bold 140px Georgia, 'Times New Roman', serif";
      fCtx.textAlign = "center";
      fCtx.textBaseline = "middle";
      const label = WING_LABELS[wingId] || wingId.toUpperCase();
      fCtx.strokeText(label, 512, 256);
      fCtx.fillText(label, 512, 256);
      // Gold highlight
      fCtx.fillStyle = "#E8C870";
      fCtx.globalAlpha = 0.4;
      fCtx.fillText(label, 512, 254);
      fCtx.globalAlpha = 1.0;

      const frescoTex = new THREE.CanvasTexture(frescoCanvas);
      frescoTex.colorSpace = THREE.SRGBColorSpace;
      const frescoMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(frescoW, frescoH),
        new THREE.MeshStandardMaterial({ map: frescoTex, roughness: 0.45, metalness: 0.05 })
      );
      frescoMesh.position.set(dx + inN.x * 0.08, frescoY + frescoH / 2, dz + inN.z * 0.08);
      frescoMesh.lookAt(new THREE.Vector3(0, frescoY + frescoH / 2, 0));
      frescoMesh.rotateY(Math.PI);
      scene.add(frescoMesh);
    });

    // ── SPIRAL STAIRCASE TO ATTIC (positioned against the wall) ──
    // Place it between doors 0 (family) and 4 (creativity), at a gap in the wall
    // The staircase hugs the curved wall as it spirals up
    {
      // Position: against the wall, between the family and creativity doors
      // Door 0 (family) is at angle = -PI/2, Door 4 (creativity) at angle = -PI/2 + 4/5*2PI = ~-PI/2 + 8PI/5
      // The gap between door 4 and door 0 (going clockwise) is centered at angle ~ PI/2 + PI/5
      const spiralWallAngle = Math.PI / 2 + Math.PI / 5; // angle on the circular wall
      const spiralCX = Math.cos(spiralWallAngle) * (RADIUS - 2.2);
      const spiralCZ = Math.sin(spiralWallAngle) * (RADIUS - 2.2);
      const spiralBaseY = 0;
      const spiralTopY = 8.5;
      const spiralHeight = spiralTopY - spiralBaseY;
      const spiralRadius = 1.8;
      const numSteps = 36;
      const totalRotation = Math.PI * 2 * 1.8;
      const stepH = 0.15;
      const stepW = 1.2;
      const stepD = 0.35;

      // Central column
      const centralCol = mk(new THREE.CylinderGeometry(0.25, 0.25, spiralHeight + 1, 16), MS.marbleDark,
        spiralCX, spiralHeight / 2 + 0.5, spiralCZ);
      scene.add(centralCol);
      scene.add(mk(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 16), MS.marbleDark, spiralCX, 0.15, spiralCZ));
      scene.add(mk(new THREE.CylinderGeometry(0.45, 0.3, 0.25, 16), MS.gold, spiralCX, spiralHeight + 1.1, spiralCZ));

      for (let s = 0; s < numSteps; s++) {
        const t = s / numSteps;
        const stepAngle = t * totalRotation;
        const stepY = spiralBaseY + t * spiralHeight;
        const sx = spiralCX + Math.cos(stepAngle) * (spiralRadius * 0.5);
        const sz = spiralCZ + Math.sin(stepAngle) * (spiralRadius * 0.5);
        const stepMesh = mk(new THREE.BoxGeometry(stepW, stepH, stepD), MS.atticStairs, sx, stepY, sz);
        stepMesh.rotation.y = -stepAngle + Math.PI / 2;
        stepMesh.castShadow = true;
        stepMesh.receiveShadow = true;
        scene.add(stepMesh);
        if (s % 3 === 0) {
          const railX = spiralCX + Math.cos(stepAngle) * (spiralRadius + 0.1);
          const railZ = spiralCZ + Math.sin(stepAngle) * (spiralRadius + 0.1);
          scene.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), MS.spiralRailing, railX, stepY + 0.5, railZ));
          scene.add(mk(new THREE.SphereGeometry(0.05, 6, 6), MS.goldBright, railX, stepY + 1.0, railZ));
        }
      }

      // Outer handrail
      const handrailPoints: THREE.Vector3[] = [];
      for (let t = 0; t <= 1; t += 0.02) {
        const ha = t * totalRotation;
        handrailPoints.push(new THREE.Vector3(
          spiralCX + Math.cos(ha) * (spiralRadius + 0.1),
          spiralBaseY + t * spiralHeight + 1.0,
          spiralCZ + Math.sin(ha) * (spiralRadius + 0.1)
        ));
      }
      if (handrailPoints.length > 2) {
        scene.add(new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(handrailPoints), 60, 0.035, 6, false),
          MS.spiralRailing
        ));
      }

      // Inner railing
      const innerRailPoints: THREE.Vector3[] = [];
      for (let t = 0; t <= 1; t += 0.02) {
        const ha = t * totalRotation;
        innerRailPoints.push(new THREE.Vector3(
          spiralCX + Math.cos(ha) * 0.35,
          spiralBaseY + t * spiralHeight + 1.0,
          spiralCZ + Math.sin(ha) * 0.35
        ));
      }
      if (innerRailPoints.length > 2) {
        scene.add(new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(innerRailPoints), 60, 0.025, 6, false),
          MS.goldDark
        ));
      }

      // Landing platform at top — positioned flush against the wall
      const landingY = spiralTopY;
      const wallDirX = Math.cos(spiralWallAngle);
      const wallDirZ = Math.sin(spiralWallAngle);
      const landingX = spiralCX + wallDirX * 1.0;
      const landingZ = spiralCZ + wallDirZ * 1.0;
      scene.add(mk(new THREE.BoxGeometry(2.0, 0.2, 1.5), MS.atticStairs, landingX, landingY, landingZ));

      // Attic door SET INTO THE WALL
      const atDoorH = 2.2;
      const atDoorW = 1.0;
      const atWallAngle = spiralWallAngle;
      const atDx = Math.cos(atWallAngle) * (RADIUS - 0.3);
      const atDz = Math.sin(atWallAngle) * (RADIUS - 0.3);

      const atDoor = mk(new THREE.BoxGeometry(atDoorW, atDoorH, 0.25), MS.atticDoor, atDx, landingY + atDoorH / 2, atDz);
      atDoor.lookAt(0, landingY + atDoorH / 2, 0);
      scene.add(atDoor);

      // Door recess in the wall
      const recessMat = new THREE.MeshStandardMaterial({ color: "#2A1A0A", roughness: 0.5 });
      const recessMesh = mk(new THREE.BoxGeometry(atDoorW + 0.4, atDoorH + 0.3, 0.6), recessMat,
        Math.cos(atWallAngle) * (RADIUS - 0.2), landingY + (atDoorH + 0.3) / 2, Math.sin(atWallAngle) * (RADIUS - 0.2));
      recessMesh.lookAt(0, landingY + (atDoorH + 0.3) / 2, 0);
      scene.add(recessMesh);

      // Attic door frame
      const atFrameGeo = new THREE.BoxGeometry(0.12, atDoorH + 0.2, 0.15);
      for (const side of [-1, 1]) {
        const latX = -Math.sin(atWallAngle) * side * (atDoorW / 2 + 0.06);
        const latZ = Math.cos(atWallAngle) * side * (atDoorW / 2 + 0.06);
        const atF = new THREE.Mesh(atFrameGeo, MS.bronze);
        atF.position.set(atDx + latX, landingY + (atDoorH + 0.2) / 2, atDz + latZ);
        atF.lookAt(0, landingY + (atDoorH + 0.2) / 2, 0);
        scene.add(atF);
      }

      // Small arch above attic door
      const atArchCurve = new THREE.EllipseCurve(0, 0, atDoorW / 2 + 0.1, 0.5, 0, Math.PI, false, 0);
      const atArchPts = atArchCurve.getPoints(16).map(p => new THREE.Vector3(p.x, p.y, 0));
      const atArchGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(atArchPts), 16, 0.05, 6, false);
      const atArch = new THREE.Mesh(atArchGeo, MS.bronze);
      atArch.position.set(atDx, landingY + atDoorH + 0.1, atDz);
      atArch.lookAt(0, landingY + atDoorH + 0.1, 0);
      atArch.rotateY(Math.PI);
      scene.add(atArch);

      // "The Attic" label — facing inward so player can read it
      const atCanvas = document.createElement("canvas");
      atCanvas.width = 256;
      atCanvas.height = 64;
      const atx = atCanvas.getContext("2d")!;
      atx.fillStyle = "#6A5040";
      atx.fillRect(0, 0, 256, 64);
      atx.fillStyle = "#D4B888";
      atx.fillRect(3, 3, 250, 58);
      atx.fillStyle = "#6A5040";
      atx.fillRect(6, 6, 244, 52);
      atx.fillStyle = "#D4B060";
      atx.font = "bold 28px Georgia, serif";
      atx.textAlign = "center";
      atx.textBaseline = "middle";
      atx.fillText("THE ATTIC", 128, 32);
      const atTex = new THREE.CanvasTexture(atCanvas);
      atTex.colorSpace = THREE.SRGBColorSpace;
      const atLabel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 0.25),
        new THREE.MeshStandardMaterial({ map: atTex, roughness: 0.4 })
      );
      atLabel.position.set(atDx, landingY + atDoorH + 0.6, atDz);
      atLabel.lookAt(0, landingY + atDoorH + 0.6, 0);
      scene.add(atLabel);

      // Small lantern light at spiral staircase
      const spiralLight = new THREE.PointLight("#FFE0A0", 0.6, 10);
      spiralLight.position.set(spiralCX, spiralTopY + 1, spiralCZ);
      scene.add(spiralLight);
      scene.add(mk(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color: "#FFE0A0" }),
        spiralCX, spiralTopY + 1.5, spiralCZ));

      // Store staircase position for collision detection
      (scene as any).__spiralCX = spiralCX;
      (scene as any).__spiralCZ = spiralCZ;
      (scene as any).__spiralRadius = spiralRadius;
    }

    // ── DUST PARTICLES (upgraded: varied sizes, concentrated in beam, additive glow) ──
    const dustN = 700;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustN * 3);
    const dustSizes = new Float32Array(dustN);
    for (let i = 0; i < dustN; i++) {
      const a = Math.random() * Math.PI * 2;
      // 70% of particles concentrated in the light beam area
      const inBeam = Math.random() < 0.7;
      const r2 = inBeam ? Math.random() * OCULUS_R * 1.5 : Math.random() * RADIUS * 0.8;
      dustPos[i * 3] = Math.cos(a) * r2;
      dustPos[i * 3 + 1] = 1 + Math.random() * (TOTAL_H - 2);
      dustPos[i * 3 + 2] = Math.sin(a) * r2;
      dustSizes[i] = 0.02 + Math.random() * 0.13; // varied sizes 0.02 to 0.15
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute("size", new THREE.BufferAttribute(dustSizes, 1));
    const dustMat = new THREE.PointsMaterial({
      color: "#FFF8E0", size: 0.1, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
      sizeAttenuation: true,
    });
    scene.add(new THREE.Points(dustGeo, dustMat));

    // ── EXIT PORTAL (back to exterior) ──
    const exitAngle = Math.PI / 2;
    const exitX = Math.cos(exitAngle) * (RADIUS - 0.5);
    const exitZ = Math.sin(exitAngle) * (RADIUS - 0.5);
    const portalGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 3.5),
      new THREE.MeshBasicMaterial({ color: "#FFF8E0", transparent: true, opacity: 0.04, side: THREE.DoubleSide })
    );
    portalGlow.position.set(exitX, 1.8, exitZ);
    portalGlow.lookAt(0, 1.8, 0);
    scene.add(portalGlow);
    scene.add(mk(new THREE.BoxGeometry(0.15, 3.5, 0.15), MS.gold,
      exitX + Math.cos(exitAngle + Math.PI / 2) * 1.1, 1.75, exitZ + Math.sin(exitAngle + Math.PI / 2) * 1.1));
    scene.add(mk(new THREE.BoxGeometry(0.15, 3.5, 0.15), MS.gold,
      exitX + Math.cos(exitAngle - Math.PI / 2) * 1.1, 1.75, exitZ + Math.sin(exitAngle - Math.PI / 2) * 1.1));
    scene.add(mk(new THREE.BoxGeometry(2.4, 0.15, 0.15), MS.gold, exitX, 3.55, exitZ));
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

    // ── ENVIRONMENT MAP (critical for PBR reflections) ──
    const pmrem = new THREE.PMREMGenerator(ren);
    pmrem.compileEquirectangularShader();
    const envRT = pmrem.fromScene(scene, 0, 0.1, 100);
    scene.environment = envRT.texture;
    pmrem.dispose();

    // ── FIRST-PERSON CAMERA ──
    // Player starts near the exit portal (entrance), facing toward the room center.
    // The look-direction formula uses: x = sin(yaw), z = -cos(yaw).
    // From angle A on the circle, direction to center is (-cos(A), 0, -sin(A)),
    // so the correct yaw to face inward is A - PI/2.
    const startAngle = exitAngle - Math.PI / 2;
    pos.current.set(
      Math.cos(exitAngle) * (RADIUS - 3),
      1.7,
      Math.sin(exitAngle) * (RADIUS - 3)
    );
    posT.current.copy(pos.current);
    lookT.current = { yaw: startAngle, pitch: 0 };
    lookA.current = { yaw: startAngle, pitch: 0 };

    // Store collision obstacles: column positions, staircase center
    const colPositions: { x: number; z: number; r: number }[] = [];
    for (let i = 0; i < NUM_COLS; i++) {
      const angle = (i / NUM_COLS) * Math.PI * 2;
      colPositions.push({
        x: Math.cos(angle) * (RADIUS - 0.8),
        z: Math.sin(angle) * (RADIUS - 0.8),
        r: 0.7, // column collision radius
      });
    }
    const spirCX = (scene as any).__spiralCX || 0;
    const spirCZ = (scene as any).__spiralCZ || 0;
    const spirR = (scene as any).__spiralRadius || 1.8;

    const clock = new THREE.Clock();
    let hoveredWing: string | null = null;

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      // ── Smooth look interpolation ──
      lookA.current.yaw += (lookT.current.yaw - lookA.current.yaw) * 0.08;
      lookA.current.pitch += (lookT.current.pitch - lookA.current.pitch) * 0.08;

      // ── Movement (WASD / Arrow keys) ──
      const spd = 4.0 * dt;
      const dir = new THREE.Vector3();
      const k = keys.current;
      if (k["w"] || k["arrowup"]) dir.z -= 1;
      if (k["s"] || k["arrowdown"]) dir.z += 1;
      if (k["a"] || k["arrowleft"]) dir.x -= 1;
      if (k["d"] || k["arrowright"]) dir.x += 1;
      if (dir.length() > 0) {
        dir.normalize().multiplyScalar(spd);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), -lookA.current.yaw);
        posT.current.add(dir);
      }

      // ── Collision detection ──
      // Wall: stay within circular room
      const distFromCenter = Math.sqrt(posT.current.x ** 2 + posT.current.z ** 2);
      if (distFromCenter > RADIUS - 1.2) {
        const ang = Math.atan2(posT.current.z, posT.current.x);
        posT.current.x = Math.cos(ang) * (RADIUS - 1.2);
        posT.current.z = Math.sin(ang) * (RADIUS - 1.2);
      }
      // Columns
      for (const col of colPositions) {
        const dx2 = posT.current.x - col.x;
        const dz2 = posT.current.z - col.z;
        const dist = Math.sqrt(dx2 * dx2 + dz2 * dz2);
        if (dist < col.r) {
          const pushAng = Math.atan2(dz2, dx2);
          posT.current.x = col.x + Math.cos(pushAng) * col.r;
          posT.current.z = col.z + Math.sin(pushAng) * col.r;
        }
      }
      // Spiral staircase
      const sDx = posT.current.x - spirCX;
      const sDz = posT.current.z - spirCZ;
      const sDist = Math.sqrt(sDx * sDx + sDz * sDz);
      if (sDist < spirR + 0.5) {
        const pushAng = Math.atan2(sDz, sDx);
        posT.current.x = spirCX + Math.cos(pushAng) * (spirR + 0.5);
        posT.current.z = spirCZ + Math.sin(pushAng) * (spirR + 0.5);
      }

      // Keep at eye level
      posT.current.y = 1.7;

      // Smooth position interpolation
      pos.current.lerp(posT.current, 0.1);
      camera.position.copy(pos.current);

      // Look direction
      const ld = new THREE.Vector3(
        Math.sin(lookA.current.yaw) * Math.cos(lookA.current.pitch),
        Math.sin(lookA.current.pitch),
        -Math.cos(lookA.current.yaw) * Math.cos(lookA.current.pitch)
      );
      camera.lookAt(camera.position.clone().add(ld));

      // ── Distance-based door glow (strong baseline) ──
      doorMeshes.forEach(d => {
        const wing = WINGS.find(ww => ww.id === d.wingId);
        const accent = wing?.accent || "#C8A858";
        // Calculate distance from player to door
        const doorAngle = d.angle;
        const doorX = Math.cos(doorAngle) * (RADIUS - 0.4);
        const doorZ = Math.sin(doorAngle) * (RADIUS - 0.4);
        const distToDoor = Math.sqrt(
          (pos.current.x - doorX) ** 2 + (pos.current.z - doorZ) ** 2
        );
        const isHover = hoveredWing === d.wingId;
        // Strong baseline glow (0.25) + proximity boost + hover pulse
        const baseGlow = 0.25;
        const proximityGlow = Math.max(0, 1 - distToDoor / 10) * 0.35;
        const hoverGlow = isHover ? 0.35 + Math.sin(t * 3) * 0.12 : 0;
        d.mat.emissive = new THREE.Color(accent);
        d.mat.emissiveIntensity = Math.max(baseGlow, proximityGlow, hoverGlow);
      });

      // Portal pulse
      portalGlow.material.opacity = 0.03 + Math.sin(t * 2) * 0.015;
      portalLight.intensity = 0.35 + Math.sin(t * 1.5) * 0.1;

      // Dust float (upward drift, stronger in beam area)
      const dp = dustGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < dustN; i++) {
        const px = dp[i * 3], pz = dp[i * 3 + 2];
        const distFromCenter = Math.sqrt(px * px + pz * pz);
        const inBeamArea = distFromCenter < OCULUS_R * 2;
        const upDrift = inBeamArea ? 0.0025 : 0.0006;
        dp[i * 3] += Math.sin(t * 0.15 + i * 0.7) * 0.002;
        dp[i * 3 + 1] += Math.sin(t * 0.2 + i * 0.5) * 0.001 + upDrift;
        dp[i * 3 + 2] += Math.cos(t * 0.15 + i * 0.3) * 0.002;
        if (dp[i * 3 + 1] > TOTAL_H - 1) dp[i * 3 + 1] = 1;
      }
      dustGeo.attributes.position.needsUpdate = true;

      // Light beam breathing (cone opacities)
      (beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.05 + Math.sin(t * 0.5) * 0.02;
      beamMat2.opacity = 0.03 + Math.sin(t * 0.7) * 0.015;
      beamMat3.opacity = 0.04 + Math.sin(t * 0.9) * 0.018;

      composer.render();
    };
    animate();

    // ── MOUSE CONTROLS (first-person look + click) ──
    const onDown = (e: MouseEvent) => {
      drag.current = false;
      prev.current = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: MouseEvent) => {
      const dx2 = e.clientX - prev.current.x;
      const dy2 = e.clientY - prev.current.y;
      if (Math.abs(dx2) > 2 || Math.abs(dy2) > 2) drag.current = true;
      if (e.buttons === 1) {
        lookT.current.yaw -= dx2 * 0.003;
        lookT.current.pitch = Math.max(-0.6, Math.min(0.6, lookT.current.pitch + dy2 * 0.003));
        prev.current = { x: e.clientX, y: e.clientY };
      }
      // Raycast for hover detection
      const rect = el.getBoundingClientRect();
      const rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      ), camera);
      let found: string | null = null;
      let portalHov = false;
      doorMeshes.forEach(d => {
        const hits = rc.intersectObject(d.mesh);
        if (hits.length > 0 && hits[0].distance < 15) found = d.wingId;
      });
      const pHits = rc.intersectObject(portalHit);
      if (pHits.length > 0 && pHits[0].distance < 15) portalHov = true;
      hoveredWing = found;
      hovMem.current = found || (portalHov ? "__exterior__" : null);
      el.style.cursor = (found || portalHov) ? "pointer" : "grab";
    };
    const onClick = () => {
      if (!drag.current && hovMem.current) {
        if (hovMem.current === "__exterior__") onDoorClick("__exterior__");
        else onDoorClick(hovMem.current);
      }
    };
    const onKD = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    const onKU = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    const onResize = () => {
      w = el.clientWidth;
      h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      ren.setSize(w, h);
      composer.setSize(w, h);
    };
    el.addEventListener("mousedown", onDown);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("click", onClick);
    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup", onKU);
    window.addEventListener("resize", onResize);

    // ── TOUCH SUPPORT (first-person: left side = move, right side = look) ──
    let touchTap = true;
    let touchLookId: number | null = null;
    let touchMoveId: number | null = null;
    const touchMoveDir = { x: 0, z: 0 };
    const onTS = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const tch = e.changedTouches[i];
        const rect = el.getBoundingClientRect();
        const rx = (tch.clientX - rect.left) / rect.width;
        const ry = (tch.clientY - rect.top) / rect.height;
        if (rx < 0.25 && ry > 0.75 && touchMoveId === null) {
          touchMoveId = tch.identifier;
          touchMoveDir.x = 0;
          touchMoveDir.z = 0;
          prev.current = { x: tch.clientX, y: tch.clientY };
        } else if (touchLookId === null) {
          touchLookId = tch.identifier;
          drag.current = false;
          prev.current = { x: tch.clientX, y: tch.clientY };
          touchTap = true;
        }
      }
    };
    const onTM = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const tch = e.changedTouches[i];
        if (tch.identifier === touchMoveId) {
          const rect = el.getBoundingClientRect();
          const dx2 = tch.clientX - prev.current.x;
          const dy2 = tch.clientY - prev.current.y;
          const maxR = rect.width * 0.12;
          touchMoveDir.x = Math.max(-1, Math.min(1, dx2 / maxR));
          touchMoveDir.z = Math.max(-1, Math.min(1, dy2 / maxR));
        } else if (tch.identifier === touchLookId) {
          const dx2 = tch.clientX - prev.current.x;
          const dy2 = tch.clientY - prev.current.y;
          if (Math.abs(dx2) > 2 || Math.abs(dy2) > 2) { drag.current = true; touchTap = false; }
          lookT.current.yaw -= dx2 * 0.003;
          lookT.current.pitch = Math.max(-0.6, Math.min(0.6, lookT.current.pitch + dy2 * 0.003));
          prev.current = { x: tch.clientX, y: tch.clientY };
        }
      }
    };
    const onTE = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const tch = e.changedTouches[i];
        if (tch.identifier === touchMoveId) {
          touchMoveId = null;
          touchMoveDir.x = 0;
          touchMoveDir.z = 0;
        }
        if (tch.identifier === touchLookId) {
          if (touchTap) {
            const rect = el.getBoundingClientRect();
            const rc = new THREE.Raycaster();
            rc.setFromCamera(new THREE.Vector2(
              ((tch.clientX - rect.left) / rect.width) * 2 - 1,
              -((tch.clientY - rect.top) / rect.height) * 2 + 1
            ), camera);
            let found: string | null = null;
            doorMeshes.forEach(d => {
              const hits = rc.intersectObject(d.mesh);
              if (hits.length > 0 && hits[0].distance < 15) found = d.wingId;
            });
            if (found) onDoorClick(found);
            else {
              const pHits = rc.intersectObject(portalHit);
              if (pHits.length > 0 && pHits[0].distance < 15) onDoorClick("__exterior__");
            }
          }
          touchLookId = null;
        }
      }
    };
    // Touch-to-keys polling (for joystick integration from MobileJoystick)
    const touchKeys = () => {
      if (touchMoveId !== null) {
        const k = keys.current;
        k.w = touchMoveDir.z < -0.2;
        k.s = touchMoveDir.z > 0.2;
        k.a = touchMoveDir.x < -0.2;
        k.d = touchMoveDir.x > 0.2;
      }
    };
    const touchTick = setInterval(touchKeys, 16);
    el.addEventListener("touchstart", onTS, { passive: true });
    el.addEventListener("touchmove", onTM, { passive: false });
    el.addEventListener("touchend", onTE, { passive: true });

    // ── AUDIO with fade-in ──
    let audioFadeInterval: ReturnType<typeof setInterval> | null = null;
    try {
      const audio = new Audio("/audio/entrance-ambient.mp3");
      audio.loop = true;
      audio.volume = 0;
      const targetVol = 0.3;
      const playAudio = () => {
        audio.play().then(() => {
          // Fade in over ~2 seconds
          audioFadeInterval = setInterval(() => {
            if (audio.volume < targetVol - 0.01) {
              audio.volume = Math.min(targetVol, audio.volume + 0.015);
            } else {
              audio.volume = targetVol;
              if (audioFadeInterval) clearInterval(audioFadeInterval);
            }
          }, 50);
        }).catch(() => {
          // Autoplay blocked; play on first user interaction
          const tryPlay = () => {
            audio.play().then(() => {
              audioFadeInterval = setInterval(() => {
                if (audio.volume < targetVol - 0.01) {
                  audio.volume = Math.min(targetVol, audio.volume + 0.015);
                } else {
                  audio.volume = targetVol;
                  if (audioFadeInterval) clearInterval(audioFadeInterval);
                }
              }, 50);
              document.removeEventListener("click", tryPlay);
              document.removeEventListener("touchstart", tryPlay);
            }).catch(() => {});
          };
          document.addEventListener("click", tryPlay, { once: true });
          document.addEventListener("touchstart", tryPlay, { once: true });
        });
      };
      playAudio();
      audioRef.current = audio;
    } catch (_) {}

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKD);
      window.removeEventListener("keyup", onKU);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("touchstart", onTS);
      el.removeEventListener("touchmove", onTM);
      el.removeEventListener("touchend", onTE);
      clearInterval(touchTick);
      if (audioFadeInterval) clearInterval(audioFadeInterval);
      // Fade out audio
      if (audioRef.current) {
        const a = audioRef.current;
        const fadeOut = setInterval(() => {
          if (a.volume > 0.02) {
            a.volume = Math.max(0, a.volume - 0.03);
          } else {
            a.pause();
            clearInterval(fadeOut);
          }
        }, 50);
        audioRef.current = null;
      }
      envRT.texture.dispose();
      envRT.dispose();
      composer.dispose();
      if (el.contains(ren.domElement)) el.removeChild(ren.domElement);
      ren.dispose();
    };
  }, []);

  // Handle mute toggle
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      {/* Mute/unmute button overlay */}
      <button
        onClick={() => setMuted(m => !m)}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          border: "1px solid rgba(200, 168, 104, 0.3)",
          background: "rgba(250, 245, 235, 0.7)",
          backdropFilter: "blur(8px)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          color: "#6A5A48",
          zIndex: 40,
          transition: "opacity 0.3s",
          opacity: 0.7,
        }}
        onMouseEnter={e => { (e.target as HTMLElement).style.opacity = "1"; }}
        onMouseLeave={e => { (e.target as HTMLElement).style.opacity = "0.7"; }}
        title={muted ? "Unmute music" : "Mute music"}
      >
        {muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"}
      </button>
    </div>
  );
}
