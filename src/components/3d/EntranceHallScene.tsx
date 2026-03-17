"use client";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";
import { createPostProcessing } from "@/lib/3d/postprocessing";
import { createInteriorEnvMap } from "@/lib/3d/environmentMaps";
import { createDustParticles, createLightBeam } from "@/lib/3d/atmosphericEffects";
import { loadHDRI, HDRI_INTERIOR, loadMarbleTextures, loadDarkWoodTextures, loadPlasterWallTextures, loadFloorTileTextures, disposePBRSet, type PBRTextureSet } from "@/lib/3d/assetLoader";

// ═══ ENTRANCE HALL — Grand Roman Senate / Pantheon Chamber ═══
const HALL_WINGS = ["family","travel","childhood","career","creativity"];
const WING_LABELS: Record<string,string> = {
  family: "FAMILY",
  travel: "TRAVEL",
  childhood: "CHILDHOOD",
  career: "CAREER",
  creativity: "CREATIVITY",
};
// Door angles pre-computed for column skip logic
const DOOR_ANGLES = HALL_WINGS.map((_, i) => {
  let a = (i / 5) * Math.PI * 2 - Math.PI / 2;
  while (a < 0) a += Math.PI * 2;
  return a;
});

export default function EntranceHallScene({
  onDoorClick,
  wings: wingsProp,
  highlightDoor,
}: {
  onDoorClick: (wingId: string) => void;
  wings?: Wing[];
  highlightDoor?: string | null;
}) {
  const WINGS = wingsProp || DEFAULT_WINGS;
  const mountRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const onDoorClickRef = useRef(onDoorClick);
  useEffect(() => { onDoorClickRef.current = onDoorClick; }, [onDoorClick]);
  const highlightDoorRef = useRef(highlightDoor);
  useEffect(() => { highlightDoorRef.current = highlightDoor; }, [highlightDoor]);
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
    ren.toneMappingExposure = 1.1;
    ren.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(ren.domElement);

    // ── ENVIRONMENT MAP (IBL) — procedural immediate, real HDRI async ──
    const envMapProc = createInteriorEnvMap(ren, { warmth: 0.8, brightness: 0.35 });
    scene.environment = envMapProc;
    scene.environmentIntensity = 0.6;
    let envMapHDRI: THREE.Texture | null = null;
    loadHDRI(ren, HDRI_INTERIOR).then((hdr) => {
      envMapHDRI = hdr;
      scene.environment = hdr;
      scene.environmentIntensity = 0.6;
    }).catch(() => {}); // keep procedural fallback

    // ── POST-PROCESSING (with SSAO) ──
    const composer = createPostProcessing(ren, scene, camera, "entrance", {
      bloom: { luminanceThreshold: 0.45, luminanceSmoothing: 0.5, intensity: 0.8 },
      vignette: { darkness: 0.4, offset: 0.3 },
    });

    // ── REAL PBR TEXTURES (from Poly Haven) ──
    const marbleTex = loadMarbleTextures([6, 6]);
    const floorTileTex = loadFloorTileTextures([4, 4]);
    const woodDoorTex = loadDarkWoodTextures([2, 3]);
    const wallTex = loadPlasterWallTextures([4, 4]);
    const allTexSets: PBRTextureSet[] = [marbleTex, floorTileTex, woodDoorTex, wallTex];

    // ── MATERIALS (PBR-upgraded with real textures + env map) ──
    const MS = {
      marble: new THREE.MeshPhysicalMaterial({ color: "#F5F0E8", roughness: 0.12, metalness: 0.0, envMapIntensity: 1.0, map: marbleTex.map, normalMap: marbleTex.normalMap, normalScale: new THREE.Vector2(.4, .4), roughnessMap: marbleTex.roughnessMap, aoMap: marbleTex.aoMap, aoMapIntensity: 0.8, clearcoat: 0.3, clearcoatRoughness: 0.15, reflectivity: 0.7 }),
      marbleWarm: new THREE.MeshPhysicalMaterial({ color: "#EDE5D8", roughness: 0.18, metalness: 0.0, envMapIntensity: 0.9, map: floorTileTex.map, normalMap: floorTileTex.normalMap, normalScale: new THREE.Vector2(.3, .3), roughnessMap: floorTileTex.roughnessMap, aoMap: floorTileTex.aoMap, aoMapIntensity: 0.7, clearcoat: 0.2, clearcoatRoughness: 0.2 }),
      marbleDark: new THREE.MeshStandardMaterial({ color: "#C8B89A", roughness: 0.25, metalness: 0.0, envMapIntensity: 0.8, normalMap: marbleTex.normalMap, normalScale: new THREE.Vector2(.2, .2) }),
      gold: new THREE.MeshPhysicalMaterial({ color: "#D4AF37", roughness: 0.15, metalness: 0.95, envMapIntensity: 1.5, emissive: "#D4AF37", emissiveIntensity: 0.15, clearcoat: 0.3, clearcoatRoughness: 0.1 }),
      goldDark: new THREE.MeshStandardMaterial({ color: "#B8922E", roughness: 0.25, metalness: 0.85, envMapIntensity: 1.2, emissive: "#B8922E", emissiveIntensity: 0.1 }),
      goldBright: new THREE.MeshPhysicalMaterial({ color: "#E8C84A", roughness: 0.1, metalness: 0.95, envMapIntensity: 1.8, emissive: "#E8C84A", emissiveIntensity: 0.25, clearcoat: 0.4, clearcoatRoughness: 0.05 }),
      column: new THREE.MeshStandardMaterial({ color: "#F0E8DC", roughness: 0.2, metalness: 0.0, envMapIntensity: 0.9, normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(.3, .3) }),
      door: new THREE.MeshStandardMaterial({ color: "#8B5E3C", roughness: 0.40, metalness: 0.0, emissive: "#5A3E28", emissiveIntensity: 0.25, map: woodDoorTex.map, normalMap: woodDoorTex.normalMap, normalScale: new THREE.Vector2(.4, .4), roughnessMap: woodDoorTex.roughnessMap, aoMap: woodDoorTex.aoMap, aoMapIntensity: 0.6 }),
      doorFrame: new THREE.MeshPhysicalMaterial({ color: "#E8C84A", roughness: 0.1, metalness: 0.95, envMapIntensity: 1.8, emissive: "#E8C84A", emissiveIntensity: 0.25, clearcoat: 0.4, clearcoatRoughness: 0.05 }),
      dome: new THREE.MeshStandardMaterial({ color: "#F5F0E8", roughness: 0.15, metalness: 0.0, envMapIntensity: 0.8, side: THREE.BackSide, normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(.2, .2) }),
      domeGold: new THREE.MeshPhysicalMaterial({ color: "#D4AF37", roughness: 0.15, metalness: 0.95, envMapIntensity: 1.5, clearcoat: 0.3, clearcoatRoughness: 0.1 }),
      floor: new THREE.MeshPhysicalMaterial({ color: "#E8DDD0", roughness: 0.06, metalness: 0.05, envMapIntensity: 1.2, map: marbleTex.map, normalMap: marbleTex.normalMap, normalScale: new THREE.Vector2(.3, .3), roughnessMap: marbleTex.roughnessMap, aoMap: marbleTex.aoMap, aoMapIntensity: 0.8, clearcoat: 0.4, clearcoatRoughness: 0.1, reflectivity: 0.8 }),
      floorDark: new THREE.MeshPhysicalMaterial({ color: "#C4B8A0", roughness: 0.08, metalness: 0.03, envMapIntensity: 1.0, normalMap: floorTileTex.normalMap, normalScale: new THREE.Vector2(.2, .2), clearcoat: 0.3, clearcoatRoughness: 0.15 }),
      floorAccent: new THREE.MeshStandardMaterial({ color: "#A89878", roughness: 0.12, metalness: 0.05, envMapIntensity: 0.9 }),
      bust: new THREE.MeshStandardMaterial({ color: "#E8E0D4", roughness: 0.35, metalness: 0.0, envMapIntensity: 0.7, normalMap: marbleTex.normalMap, normalScale: new THREE.Vector2(.15, .15) }),
      bronze: new THREE.MeshPhysicalMaterial({ color: "#8A7050", roughness: 0.25, metalness: 0.8, envMapIntensity: 1.1, clearcoat: 0.2, clearcoatRoughness: 0.3 }),
      wall: new THREE.MeshStandardMaterial({ color: "#F5F0E8", roughness: 0.15, metalness: 0.0, envMapIntensity: 0.8, side: THREE.BackSide, normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(.2, .2), roughnessMap: wallTex.roughnessMap }),
      lightBeam: new THREE.MeshBasicMaterial({ color: "#FFF5E0", transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      atticDoor: new THREE.MeshStandardMaterial({ color: "#6A5040", roughness: 0.6, metalness: 0.0, map: woodDoorTex.map, normalMap: woodDoorTex.normalMap, normalScale: new THREE.Vector2(.3, .3), roughnessMap: woodDoorTex.roughnessMap }),
      frescoPanel: new THREE.MeshStandardMaterial({ color: "#C4A070", roughness: 0.5, metalness: 0.05, envMapIntensity: 0.5 }),
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

    // ── COLUMNS (skip columns that would block doors) ──
    const colR = 0.4;
    const colH = WALL_H - 0.5;
    const COL_SKIP_THRESHOLD = 0.22; // skip columns within ~12.5° of a door center
    const validColAngles: number[] = [];
    for (let i = 0; i < NUM_COLS; i++) {
      let colAngle = (i / NUM_COLS) * Math.PI * 2;
      let skip = false;
      for (const dA of DOOR_ANGLES) {
        let diff = Math.abs(colAngle - dA);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < COL_SKIP_THRESHOLD) { skip = true; break; }
      }
      if (!skip) validColAngles.push(colAngle);
    }
    const NUM_VALID_COLS = validColAngles.length;

    // Column shaft
    const colShaftGeo = new THREE.CylinderGeometry(colR, colR * 1.08, colH, 16);
    const colBaseMesh = new THREE.InstancedMesh(colShaftGeo, MS.column, NUM_VALID_COLS);
    colBaseMesh.castShadow = true;
    colBaseMesh.receiveShadow = true;
    const colMatrix = new THREE.Matrix4();
    validColAngles.forEach((angle, idx) => {
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, colH / 2, cz);
      colBaseMesh.setMatrixAt(idx, colMatrix);
    });
    colBaseMesh.instanceMatrix.needsUpdate = true;
    scene.add(colBaseMesh);

    // Column capitals
    const capGeo = new THREE.CylinderGeometry(colR * 1.8, colR * 1.1, 0.6, 16);
    const capMesh = new THREE.InstancedMesh(capGeo, MS.gold, NUM_VALID_COLS);
    validColAngles.forEach((angle, idx) => {
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, colH + 0.3, cz);
      capMesh.setMatrixAt(idx, colMatrix);
    });
    capMesh.instanceMatrix.needsUpdate = true;
    scene.add(capMesh);

    // Capital abacus
    const abacusGeo = new THREE.BoxGeometry(colR * 3.2, 0.12, colR * 3.2);
    const abacusMesh = new THREE.InstancedMesh(abacusGeo, MS.marbleWarm, NUM_VALID_COLS);
    validColAngles.forEach((angle, idx) => {
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, colH + 0.66, cz);
      abacusMesh.setMatrixAt(idx, colMatrix);
    });
    abacusMesh.instanceMatrix.needsUpdate = true;
    scene.add(abacusMesh);

    // Column bases
    const baseGeo = new THREE.CylinderGeometry(colR * 1.3, colR * 1.5, 0.35, 16);
    const baseMeshI = new THREE.InstancedMesh(baseGeo, MS.marbleDark, NUM_VALID_COLS);
    validColAngles.forEach((angle, idx) => {
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      colMatrix.makeTranslation(cx, 0.175, cz);
      baseMeshI.setMatrixAt(idx, colMatrix);
    });
    baseMeshI.instanceMatrix.needsUpdate = true;
    scene.add(baseMeshI);

    // Column fluting
    for (const angle of validColAngles) {
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      for (const ry of [0.7, colH * 0.33, colH * 0.66, colH - 0.5]) {
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(colR + 0.02, 0.03, 6, 16), MS.marbleWarm);
        ring2.rotation.x = Math.PI / 2;
        ring2.position.set(cx, ry, cz);
        scene.add(ring2);
      }
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

      // Door recess / alcove — recessed INTO the wall
      const recessGeo = new THREE.BoxGeometry(DOOR_W + 0.8, DOOR_H + 0.6, 0.9);
      const recessMat = new THREE.MeshStandardMaterial({ color: "#1A1008", roughness: 0.9, metalness: 0.0 });
      const recessMesh = mk(recessGeo, recessMat,
        dx - inN.x * 0.5, (DOOR_H + 0.6) / 2, dz - inN.z * 0.5);
      recessMesh.lookAt(0, (DOOR_H + 0.6) / 2, 0);
      scene.add(recessMesh);

      // ── ELEGANT MARBLE FRAME (not gold — classy stone) ──
      const frameThick = 0.3;
      const frameDepth = 0.25;
      const frameMat = MS.marbleDark;
      // Left frame pillar
      const lpGeo = new THREE.BoxGeometry(frameThick, DOOR_H + 0.3, frameDepth);
      const lp = new THREE.Mesh(lpGeo, frameMat);
      lp.position.set(
        dx + latN.x * (DOOR_W / 2 + frameThick / 2) + inN.x * 0.05,
        (DOOR_H + 0.3) / 2,
        dz + latN.z * (DOOR_W / 2 + frameThick / 2) + inN.z * 0.05
      );
      lp.lookAt(new THREE.Vector3(0, (DOOR_H + 0.3) / 2, 0));
      scene.add(lp);
      // Right frame pillar
      const rp = new THREE.Mesh(lpGeo, frameMat);
      rp.position.set(
        dx - latN.x * (DOOR_W / 2 + frameThick / 2) + inN.x * 0.05,
        (DOOR_H + 0.3) / 2,
        dz - latN.z * (DOOR_W / 2 + frameThick / 2) + inN.z * 0.05
      );
      rp.lookAt(new THREE.Vector3(0, (DOOR_H + 0.3) / 2, 0));
      scene.add(rp);
      // Top lintel
      const lintelGeo = new THREE.BoxGeometry(DOOR_W + frameThick * 2 + 0.2, 0.35, frameDepth);
      const lintel = new THREE.Mesh(lintelGeo, frameMat);
      lintel.position.set(dx + inN.x * 0.05, DOOR_H + 0.3, dz + inN.z * 0.05);
      lintel.lookAt(new THREE.Vector3(0, DOOR_H + 0.3, 0));
      scene.add(lintel);
      // Bottom threshold
      const threshGeo = new THREE.BoxGeometry(DOOR_W + frameThick * 2 + 0.2, 0.12, frameDepth);
      const thresh = new THREE.Mesh(threshGeo, MS.marbleDark);
      thresh.position.set(dx + inN.x * 0.05, 0.06, dz + inN.z * 0.05);
      thresh.lookAt(new THREE.Vector3(0, 0.06, 0));
      scene.add(thresh);

      // ── SUBTLE ARCH above door (thin, elegant) ──
      const archW = DOOR_W / 2 + 0.3;
      const archH = 1.2;
      const archCurve = new THREE.EllipseCurve(0, 0, archW, archH, 0, Math.PI, false, 0);
      const archPoints = archCurve.getPoints(30).map(p => new THREE.Vector3(p.x, p.y, 0));
      const archGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints), 30, 0.08, 8, false);
      const archMesh = new THREE.Mesh(archGeo, MS.goldDark);
      archMesh.position.set(dx + inN.x * 0.05, DOOR_H + 0.45, dz + inN.z * 0.05);
      archMesh.lookAt(new THREE.Vector3(0, DOOR_H + 0.45, 0));
      archMesh.rotateY(Math.PI);
      scene.add(archMesh);
      // Small keystone
      const keystone = mk(new THREE.BoxGeometry(0.25, 0.35, 0.15), MS.goldDark,
        dx + inN.x * 0.3, DOOR_H + 0.45 + archH, dz + inN.z * 0.3);
      keystone.lookAt(new THREE.Vector3(0, DOOR_H + 0.45 + archH, 0));
      scene.add(keystone);

      // ── DOUBLE DOOR PANELS ──
      const panelW = (DOOR_W - DOOR_PANEL_GAP) / 2;
      const doorMat = new THREE.MeshStandardMaterial({
        color: "#7A5030", roughness: 0.45, metalness: 0.0,
        emissive: "#5A3A20", emissiveIntensity: 0.2,
      });

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

      doorMeshes.push({ mesh: leftPanel, mat: doorMat, wingId, angle });
      doorMeshes.push({ mesh: rightPanel, mat: doorMat, wingId, angle });

      // Thin seam line between panels
      const seamGeo = new THREE.BoxGeometry(0.04, DOOR_H - 0.3, 0.005);
      const seam = new THREE.Mesh(seamGeo, MS.goldDark);
      seam.position.set(dx + inN.x * 0.35, DOOR_H / 2, dz + inN.z * 0.35);
      seam.lookAt(new THREE.Vector3(0, DOOR_H / 2, 0));
      scene.add(seam);

      // ── SIMPLE INSET PANELS (2 per door panel, subtle depth) ──
      for (const side of [-1, 1]) {
        const panelCenterLat = latN.clone().multiplyScalar(side * (panelW / 2 + DOOR_PANEL_GAP / 2));
        // Upper and lower inset
        for (const py of [2.0, 4.8]) {
          const detailH = 1.8;
          // Recessed darker wood panel
          const insetGeo = new THREE.BoxGeometry(panelW * 0.65, detailH, 0.04);
          const inset = new THREE.Mesh(insetGeo, new THREE.MeshStandardMaterial({
            color: "#5A3A1E", roughness: 0.55, metalness: 0.0,
          }));
          inset.position.set(
            dx + panelCenterLat.x + inN.x * 0.36,
            py,
            dz + panelCenterLat.z + inN.z * 0.36
          );
          inset.lookAt(new THREE.Vector3(0, py, 0));
          scene.add(inset);
          // Thin gold border around inset
          const borderGeo = new THREE.BoxGeometry(panelW * 0.68, detailH + 0.06, 0.02);
          const border = new THREE.Mesh(borderGeo, MS.goldDark);
          border.position.set(
            dx + panelCenterLat.x + inN.x * 0.35,
            py,
            dz + panelCenterLat.z + inN.z * 0.35
          );
          border.lookAt(new THREE.Vector3(0, py, 0));
          scene.add(border);
        }
      }

      // ── SIMPLE RING HANDLES (one per panel, centered) ──
      for (const side of [-1, 1]) {
        const handleLat = latN.clone().multiplyScalar(side * 0.35);
        const handleRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.14, 0.03, 10, 16),
          MS.goldDark
        );
        handleRing.position.set(
          dx + handleLat.x + inN.x * 0.42,
          DOOR_H * 0.48,
          dz + handleLat.z + inN.z * 0.42
        );
        handleRing.lookAt(new THREE.Vector3(0, DOOR_H * 0.48, 0));
        scene.add(handleRing);
        // Small mount plate
        const handlePlate = new THREE.Mesh(
          new THREE.CircleGeometry(0.06, 10),
          new THREE.MeshStandardMaterial({ color: "#8A7040", roughness: 0.3, metalness: 0.7, side: THREE.DoubleSide })
        );
        handlePlate.position.set(
          dx + handleLat.x + inN.x * 0.41,
          DOOR_H * 0.48 + 0.14,
          dz + handleLat.z + inN.z * 0.41
        );
        handlePlate.lookAt(new THREE.Vector3(0, DOOR_H * 0.48 + 0.14, 0));
        scene.add(handlePlate);
      }

      // Warm fill light for door visibility
      const doorFill = new THREE.PointLight("#FFF0D0", 1.5, 10);
      doorFill.position.set(dx + inN.x * 2.5, DOOR_H * 0.5, dz + inN.z * 2.5);
      scene.add(doorFill);

      // Spotlight on door face
      const doorFaceSpot = new THREE.SpotLight("#FFF5E0", 2.0, 16, Math.PI / 4.5, 0.4, 0.7);
      doorFaceSpot.position.set(dx + inN.x * 6.0, DOOR_H * 0.55, dz + inN.z * 6.0);
      doorFaceSpot.target.position.set(dx, DOOR_H * 0.42, dz);
      scene.add(doorFaceSpot);
      scene.add(doorFaceSpot.target);

      // ── ELEGANT WING NAME LABEL (upper portion of door, above handles) ──
      {
        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = 1024;
        labelCanvas.height = 192;
        const lctx = labelCanvas.getContext("2d")!;
        // Transparent dark wood background
        lctx.fillStyle = "#3A2818";
        lctx.fillRect(0, 0, 1024, 192);
        // Thin elegant gold border
        lctx.strokeStyle = "#C8A050";
        lctx.lineWidth = 3;
        lctx.strokeRect(12, 12, 1000, 168);
        // Wing name in refined serif
        const eyeLabel = WING_LABELS[wingId] || wingId.toUpperCase();
        lctx.fillStyle = "#D4B878";
        lctx.font = "bold 100px Georgia, 'Times New Roman', serif";
        lctx.textAlign = "center";
        lctx.textBaseline = "middle";
        lctx.fillText(eyeLabel, 512, 96);
        // Subtle decorative line under text
        lctx.strokeStyle = "#C8A050";
        lctx.lineWidth = 2;
        lctx.beginPath();
        lctx.moveTo(280, 155);
        lctx.lineTo(744, 155);
        lctx.stroke();

        const labelTex = new THREE.CanvasTexture(labelCanvas);
        labelTex.colorSpace = THREE.SRGBColorSpace;
        const labelMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(2.8, 0.54),
          new THREE.MeshBasicMaterial({ map: labelTex, side: THREE.DoubleSide })
        );
        // Position at upper third of door (y=5.5), well above handles (y=3.36)
        labelMesh.position.set(
          dx + inN.x * 0.40,
          5.5,
          dz + inN.z * 0.40
        );
        labelMesh.lookAt(new THREE.Vector3(0, 5.5, 0));
        scene.add(labelMesh);
      }
    });

    // ── STORAGE ROOM — small door in the wall ──
    {
      const srAngle = Math.PI / 2 + Math.PI / 5; // same position as old staircase
      const srR = RADIUS - 0.1;
      const srX = Math.cos(srAngle) * srR;
      const srZ = Math.sin(srAngle) * srR;
      const srDW = 1.0, srDH = 2.2; // smaller than wing doors

      // Door recess
      const srRecess = mk(new THREE.BoxGeometry(0.15, srDH, srDW + 0.1), MS.wall, srX, srDH / 2, srZ);
      srRecess.lookAt(0, srDH / 2, 0);
      scene.add(srRecess);

      // Simple wooden door
      const srDoorMat = MS.atticDoor.clone();
      const srDoor = mk(new THREE.BoxGeometry(0.08, srDH - 0.1, srDW - 0.08), srDoorMat, srX, (srDH - 0.1) / 2, srZ);
      srDoor.lookAt(0, (srDH - 0.1) / 2, 0);
      scene.add(srDoor);
      // Register as clickable door
      doorMeshes.push({ mesh: srDoor, mat: srDoorMat, wingId: "attic", angle: srAngle });

      // Small nameplate
      const srPlq = document.createElement("canvas"); srPlq.width = 200; srPlq.height = 36;
      const srPc = srPlq.getContext("2d")!;
      srPc.fillStyle = "#5A4A38"; srPc.fillRect(0, 0, 200, 36);
      srPc.fillStyle = "#C8A868"; srPc.fillRect(2, 2, 196, 32);
      srPc.fillStyle = "#5A4A38"; srPc.fillRect(4, 4, 192, 28);
      srPc.fillStyle = "#F0EAE0"; srPc.font = "bold 14px Georgia,serif"; srPc.textAlign = "center"; srPc.textBaseline = "middle";
      srPc.fillText("Storage Room", 100, 18);
      const srPtex = new THREE.CanvasTexture(srPlq); srPtex.colorSpace = THREE.SRGBColorSpace;
      const srPlm = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.16), new THREE.MeshStandardMaterial({ map: srPtex, roughness: 0.4 }));
      srPlm.position.set(srX, srDH + 0.2, srZ);
      srPlm.lookAt(0, srDH + 0.2, 0);
      scene.add(srPlm);

      // Simple handle
      scene.add(mk(new THREE.SphereGeometry(0.025, 6, 6), MS.bronze, srX - Math.sin(srAngle) * 0.06, 1.1, srZ + Math.cos(srAngle) * 0.06));
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

    // Store collision obstacles: column positions
    const colPositions: { x: number; z: number; r: number }[] = [];
    for (const angle of validColAngles) {
      colPositions.push({
        x: Math.cos(angle) * (RADIUS - 0.8),
        z: Math.sin(angle) * (RADIUS - 0.8),
        r: 0.7,
      });
    }

    // ── WALKTHROUGH HIGHLIGHT RINGS ──
    // ── WALKTHROUGH HIGHLIGHT — golden glow on target door meshes ──
    const hlDoorLights: Map<string,THREE.PointLight>=new Map();
    const seenWings=new Set<string>();
    doorMeshes.forEach(d=>{
      if(seenWings.has(d.wingId))return;seenWings.add(d.wingId);
      const dx2=Math.cos(d.angle)*(RADIUS-2);const dz2=Math.sin(d.angle)*(RADIUS-2);
      const light=new THREE.PointLight("#D4AF37",0,15);light.position.set(dx2,3,dz2);scene.add(light);
      hlDoorLights.set(d.wingId,light);
    });
    const goldColor=new THREE.Color("#D4AF37");

    // ── DUST PARTICLES (oculus light beam) ──
    const dust = createDustParticles({ count: 150, bounds: { x: 8, y: 10, z: 8 }, center: new THREE.Vector3(0, 12, 0), opacity: 0.2, size: 0.04, color: "#FFF8D0" });
    scene.add(dust.points);

    // ── VOLUMETRIC LIGHT BEAM from oculus ──
    const oculusBeam = createLightBeam({ position: new THREE.Vector3(0, TOTAL_H, 0), direction: new THREE.Vector3(0, -1, 0), length: TOTAL_H - 1, radius: 3.5, color: "#FFF8D0", opacity: 0.04 });
    scene.add(oculusBeam.mesh);

    const clock = new THREE.Clock();
    let hoveredWing: string | null = null;

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      // Walkthrough highlight — pulse golden emissive on target door
      const hlTarget=highlightDoorRef.current;
      doorMeshes.forEach(d=>{
        if(hlTarget===d.wingId){
          const pulse=0.6+Math.sin(t*2.5)*.25;
          d.mat.emissive=goldColor.clone();
          d.mat.emissiveIntensity+=(pulse-d.mat.emissiveIntensity)*.12;
        }
      });
      hlDoorLights.forEach((light,id)=>{
        if(hlTarget===id)light.intensity=3+Math.sin(t*2)*1.5;
        else light.intensity+=(0-light.intensity)*.05;
      });

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
        // Skip normal glow for walkthrough-highlighted door
        if(hlTarget===d.wingId)return;
        const wing = WINGS.find(ww => ww.id === d.wingId);
        const accent = wing?.accent || "#C8A858";
        const doorAngle = d.angle;
        const doorX = Math.cos(doorAngle) * (RADIUS - 0.4);
        const doorZ = Math.sin(doorAngle) * (RADIUS - 0.4);
        const distToDoor = Math.sqrt(
          (pos.current.x - doorX) ** 2 + (pos.current.z - doorZ) ** 2
        );
        const isHover = hoveredWing === d.wingId;
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

      dust.update(t, dt);
      oculusBeam.update(t);

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
        if (hovMem.current === "__exterior__") onDoorClickRef.current("__exterior__");
        else onDoorClickRef.current(hovMem.current);
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
            if (found) onDoorClickRef.current(found);
            else {
              const pHits = rc.intersectObject(portalHit);
              if (pHits.length > 0 && pHits[0].distance < 15) onDoorClickRef.current("__exterior__");
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
      dust.dispose();
      oculusBeam.dispose();
      allTexSets.forEach(disposePBRSet);
      envMapProc.dispose();
      if (envMapHDRI) envMapHDRI.dispose();
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
