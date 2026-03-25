"use client";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { WINGS as DEFAULT_WINGS } from "@/lib/constants/wings";
import type { Wing } from "@/lib/constants/wings";
import { mk } from "@/lib/3d/meshHelpers";
import { createPostProcessing } from "@/lib/3d/postprocessing";
import { createInteriorEnvMap } from "@/lib/3d/environmentMaps";
import { createDustParticles, createLightBeam } from "@/lib/3d/atmosphericEffects";
import { loadHDRI, HDRI_INTERIOR, loadMarbleTextures, loadDarkWoodTextures, loadPlasterWallTextures, loadFloorTileTextures, disposePBRSet, isCachedTexture, type PBRTextureSet } from "@/lib/3d/assetLoader";
import { loadBustModel, type BustStyle, type BustGender } from "@/lib/3d/bustBuilder";
import type { BustPedestalData } from "@/lib/stores/userStore";

// ═══ ENTRANCE HALL — Grand Roman Senate / Pantheon Chamber ═══
const HALL_DOORS = [
  { id: "family",     label: "FAMILY",      locked: false },
  { id: "locked1",    label: "", locked: true  },
  { id: "travel",     label: "TRAVEL",      locked: false },
  { id: "childhood",  label: "CHILDHOOD",   locked: false },
  { id: "locked2",    label: "", locked: true  },
  { id: "career",     label: "CAREER",      locked: false },
  { id: "creativity", label: "CREATIVITY",  locked: false },
];
const NUM_HALL_DOORS = HALL_DOORS.length; // 7
// Door angles pre-computed for column skip logic
const DOOR_ANGLES = HALL_DOORS.map((_, i) => {
  let a = (i / NUM_HALL_DOORS) * Math.PI * 2 - Math.PI / 2;
  while (a < 0) a += Math.PI * 2;
  return a;
});

/** Add 3D bust to scene — loads GLB torso + cameo head for user, full bust for others */
function addBustToScene(
  scene: THREE.Scene, bx: number, bz: number, bustAngle: number,
  style: BustStyle,
  pedestalTopY: number,
  faceImageUrl?: string | null,
  marblePBR?: { map?: THREE.Texture; normalMap?: THREE.Texture; roughnessMap?: THREE.Texture; aoMap?: THREE.Texture } | null,
  gender?: BustGender | null,
  renderer?: THREE.WebGLRenderer | null,
) {
  loadBustModel(style, gender || "male", faceImageUrl, marblePBR).then((bustGroup) => {
    // Enable clipping on the renderer for torso clipping planes
    if (renderer) renderer.localClippingEnabled = true;

    // Measure raw model bounds
    const box = new THREE.Box3().setFromObject(bustGroup);
    const modelHeight = box.max.y - box.min.y;
    const targetHeight = 1.1;
    const scale = targetHeight / Math.max(modelHeight, 0.01);

    // Center the model at origin first, then scale and position
    const center = box.getCenter(new THREE.Vector3());
    bustGroup.position.set(-center.x, -box.min.y, -center.z);

    // Wrap in a container for clean positioning
    const container = new THREE.Group();
    container.add(bustGroup);
    container.scale.set(scale, scale, scale);
    container.position.set(bx, pedestalTopY, bz);
    // Face toward hall center — lookAt points -Z toward center,
    // but this model faces +Z natively, so rotate 180° after
    container.lookAt(0, pedestalTopY, 0);
    container.rotateY(Math.PI);
    scene.add(container);
  }).catch((err) => {
    console.error("[Bust] FAILED to load:", err);
  });
}

/** Create a name plaque texture for the pedestal */
function createNamePlaqueTexture(name: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;

  // Subtle marble-like plaque background
  ctx.fillStyle = "#E8E0D4";
  ctx.fillRect(0, 0, 512, 128);

  // Thin border
  ctx.strokeStyle = "#B8A890";
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 496, 112);

  // Roman-style uppercase text with letter spacing
  const displayName = name.toUpperCase();
  // Add manual letter spacing for Roman feel
  const spaced = displayName.split("").join("\u2009"); // thin space between letters
  ctx.fillStyle = "#2a1a0a";
  ctx.font = 'bold 38px "Times New Roman", "Palatino Linotype", Georgia, serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const measured = ctx.measureText(spaced);
  if (measured.width > 470) {
    ctx.font = 'bold 26px "Times New Roman", "Palatino Linotype", Georgia, serif';
  }
  ctx.fillText(spaced, 256, 68);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}


export default function EntranceHallScene({
  onDoorClick,
  wings: wingsProp,
  highlightDoor,
  styleEra = "roman",
  onInlayClick,
  onBustClick,
  bustPedestals,
  bustTextureUrl,
  bustModelUrl,
  bustProportions,
  bustName,
  bustGender,
}: {
  onDoorClick: (wingId: string) => void;
  wings?: Wing[];
  highlightDoor?: string | null;
  styleEra?: string;
  onInlayClick?: () => void;
  onBustClick?: (pedestalIndex: number) => void;
  bustPedestals?: Record<number, BustPedestalData>;
  bustTextureUrl?: string | null;
  bustModelUrl?: string | null;
  bustProportions?: Record<string, number> | null;
  bustName?: string | null;
  bustGender?: string | null;
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
      ssao: false, // disabled for performance
      bloom: { luminanceThreshold: 0.5, luminanceSmoothing: 0.6, intensity: 0.3 },
      vignette: { darkness: 0.3, offset: 0.3 },
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
    const NUM_DOORS = NUM_HALL_DOORS;

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
    sunLight.shadow.mapSize.set(1024, 1024);
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
    // Alternating floor tiles in rings — merged into single geometry
    {
      const tileShapes: THREE.Shape[] = [];
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
          tileShapes.push(shape);
        }
      }
      const mergedTileGeos = tileShapes.map(s => new THREE.ShapeGeometry(s));
      const mergedTile = mergeGeometries(mergedTileGeos);
      if (mergedTile) {
        const tileMesh = new THREE.Mesh(mergedTile, MS.floorDark);
        tileMesh.rotation.x = -Math.PI / 2;
        tileMesh.position.y = 0.002;
        tileMesh.receiveShadow = true;
        scene.add(tileMesh);
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

    // Dome coffered ribs
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
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
    for (let ring = 1; ring <= 4; ring++) {
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
    for (let ri = 1; ri <= 3; ri++) {
      const phi = (ri / 6) * Math.PI / 2;
      const ringR = RADIUS * Math.sin(phi);
      const ringY = WALL_H + RADIUS * Math.cos(phi);
      for (let i = 0; i < 12; i++) {
        const angle = ((i + 0.5) / 12) * Math.PI * 2;
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

    // ── VOLUMETRIC LIGHT CONE from oculus ──
    const beamGeo = new THREE.ConeGeometry(6, 22, 16, 1, true);
    const beamMesh = new THREE.Mesh(beamGeo, MS.lightBeam);
    beamMesh.position.y = TOTAL_H - 11;
    scene.add(beamMesh);

    // ── COLUMNS (skip columns that would block doors or exit portal) ──
    const colR = 0.4;
    const colH = WALL_H - 0.5;
    const COL_SKIP_THRESHOLD = 0.22; // skip columns within ~12.5° of a door center
    const EXIT_PORTAL_ANGLE = Math.PI / 2;
    const SKIP_ANGLES = [...DOOR_ANGLES, EXIT_PORTAL_ANGLE]; // skip near doors AND exit
    const validColAngles: number[] = [];
    for (let i = 0; i < NUM_COLS; i++) {
      let colAngle = (i / NUM_COLS) * Math.PI * 2;
      let skip = false;
      for (const dA of SKIP_ANGLES) {
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

    // Column fluting — simplified: just 2 rings per column (instanced)
    const fluteRingGeo = new THREE.TorusGeometry(colR + 0.02, 0.03, 6, 16);
    const fluteRingCount = NUM_VALID_COLS * 2;
    const fluteRingInst = new THREE.InstancedMesh(fluteRingGeo, MS.marbleWarm, fluteRingCount);
    const fMatrix = new THREE.Matrix4();
    const fQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    validColAngles.forEach((angle, idx) => {
      const cx = Math.cos(angle) * (RADIUS - 0.8);
      const cz = Math.sin(angle) * (RADIUS - 0.8);
      for (let ri = 0; ri < 2; ri++) {
        const ry = ri === 0 ? 0.7 : colH - 0.5;
        fMatrix.compose(new THREE.Vector3(cx, ry, cz), fQuat, new THREE.Vector3(1, 1, 1));
        fluteRingInst.setMatrixAt(idx * 2 + ri, fMatrix);
      }
    });
    fluteRingInst.instanceMatrix.needsUpdate = true;
    scene.add(fluteRingInst);

    // ── 7 GRAND DOORS ──
    const doorMeshes: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; wingId: string; angle: number }[] = [];

    HALL_DOORS.forEach((doorDef, i) => {
      const wingId = doorDef.id;
      const wing = WINGS.find(ww => ww.id === wingId);
      const isPlaceholderLocked = doorDef.locked;
      const isUnlocked = !isPlaceholderLocked && wing && wing.unlocked !== false;
      const accent = wing?.accent;
      const angle = (i / NUM_DOORS) * Math.PI * 2 - Math.PI / 2;
      const dx = Math.cos(angle) * (RADIUS - 0.4);
      const dz = Math.sin(angle) * (RADIUS - 0.4);

      // Inward normal (pointing to center)
      const inN = new THREE.Vector3(-Math.cos(angle), 0, -Math.sin(angle));
      // Lateral (perpendicular to door)
      const latN = new THREE.Vector3(Math.cos(angle + Math.PI / 2), 0, Math.sin(angle + Math.PI / 2));

      // Door recess / alcove — flat plane only (no side walls that protrude)
      const recessGeo = new THREE.PlaneGeometry(DOOR_W + 0.8, DOOR_H + 0.6);
      const recessMat = isUnlocked
        ? new THREE.MeshStandardMaterial({ color: "#1A1008", roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: "#D8D0C4", roughness: 0.35, metalness: 0.0, side: THREE.DoubleSide, normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(.15, .15) });
      const recessMesh = mk(recessGeo, recessMat,
        dx - inN.x * 0.15, (DOOR_H + 0.6) / 2, dz - inN.z * 0.15);
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
      // Bottom threshold (raised above floor to avoid z-fighting)
      const threshGeo = new THREE.BoxGeometry(DOOR_W + frameThick * 2 + 0.2, 0.10, frameDepth);
      const thresh = new THREE.Mesh(threshGeo, MS.marbleDark);
      thresh.position.set(dx + inN.x * 0.05, 0.08, dz + inN.z * 0.05);
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

      if (isUnlocked) {
      // ── DOUBLE DOOR PANELS (unlocked wing) ──
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
      } else {
      // ── SEALED WALL NICHE (locked wing) ──
      // Flat stone panel filling the alcove — slightly recessed from wall surface
      const nicheMat = new THREE.MeshStandardMaterial({
        color: "#E0D8CC", roughness: 0.3, metalness: 0.0,
        envMapIntensity: 0.6,
        normalMap: wallTex.normalMap,
        normalScale: new THREE.Vector2(.2, .2),
      });
      const nichePanel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, DOOR_H, 0.15), nicheMat);
      nichePanel.position.set(
        dx + inN.x * 0.1,
        DOOR_H / 2,
        dz + inN.z * 0.1
      );
      nichePanel.lookAt(new THREE.Vector3(0, DOOR_H / 2, 0));
      nichePanel.castShadow = true;
      nichePanel.userData = { wingId };
      scene.add(nichePanel);

      // Register niche as clickable (still triggers door click for upgrade prompt)
      doorMeshes.push({ mesh: nichePanel, mat: nicheMat, wingId, angle });

      // Subtle recessed arch outline on the sealed surface (thin gold line)
      const nicheArchW = DOOR_W / 2 - 0.15;
      const nicheArchH = 1.0;
      const nicheArchCurve = new THREE.EllipseCurve(0, 0, nicheArchW, nicheArchH, 0, Math.PI, false, 0);
      const nicheArchPts = nicheArchCurve.getPoints(24).map(p => new THREE.Vector3(p.x, p.y, 0));
      const nicheArchGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(nicheArchPts), 24, 0.035, 6, false);
      const nicheArchOutlineMat = new THREE.MeshStandardMaterial({
        color: "#B8A070", roughness: 0.3, metalness: 0.5,
        emissive: "#B8A070", emissiveIntensity: 0.08,
      });
      const nicheArchOutline = new THREE.Mesh(nicheArchGeo, nicheArchOutlineMat);
      nicheArchOutline.position.set(dx + inN.x * 0.19, DOOR_H * 0.75, dz + inN.z * 0.19);
      nicheArchOutline.lookAt(new THREE.Vector3(0, DOOR_H * 0.75, 0));
      nicheArchOutline.rotateY(Math.PI);
      scene.add(nicheArchOutline);

      // Vertical side lines connecting arch to floor (faint etched lines)
      const etchMat = new THREE.MeshStandardMaterial({
        color: "#B8A070", roughness: 0.35, metalness: 0.4,
        emissive: "#B8A070", emissiveIntensity: 0.06,
      });
      for (const side of [-1, 1]) {
        const etchLine = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, DOOR_H * 0.75, 0.02),
          etchMat
        );
        etchLine.position.set(
          dx + latN.x * side * (nicheArchW - 0.02) + inN.x * 0.19,
          DOOR_H * 0.75 / 2,
          dz + latN.z * side * (nicheArchW - 0.02) + inN.z * 0.19
        );
        etchLine.lookAt(new THREE.Vector3(0, DOOR_H * 0.75 / 2, 0));
        scene.add(etchLine);
      }

      // Small lock medallion in center of niche
      const lockMedallionGeo = new THREE.CircleGeometry(0.22, 24);
      const lockMedallionMat = new THREE.MeshStandardMaterial({
        color: "#C8B080", roughness: 0.25, metalness: 0.7,
        emissive: "#C8B080", emissiveIntensity: 0.05,
        side: THREE.DoubleSide,
      });
      const lockMedallion = new THREE.Mesh(lockMedallionGeo, lockMedallionMat);
      lockMedallion.position.set(
        dx + inN.x * 0.20,
        DOOR_H * 0.45,
        dz + inN.z * 0.20
      );
      lockMedallion.lookAt(new THREE.Vector3(0, DOOR_H * 0.45, 0));
      scene.add(lockMedallion);

      // Lock keyhole shape (small dark circle + triangle below)
      const keyholeCircle = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 12),
        new THREE.MeshStandardMaterial({ color: "#2A2010", roughness: 0.8, metalness: 0.0, side: THREE.DoubleSide })
      );
      keyholeCircle.position.set(
        dx + inN.x * 0.21,
        DOOR_H * 0.45 + 0.03,
        dz + inN.z * 0.21
      );
      keyholeCircle.lookAt(new THREE.Vector3(0, DOOR_H * 0.45 + 0.03, 0));
      scene.add(keyholeCircle);
      // Keyhole slot (small narrow rect below circle)
      const keyholeSlot = new THREE.Mesh(
        new THREE.PlaneGeometry(0.035, 0.1),
        new THREE.MeshStandardMaterial({ color: "#2A2010", roughness: 0.8, metalness: 0.0, side: THREE.DoubleSide })
      );
      keyholeSlot.position.set(
        dx + inN.x * 0.21,
        DOOR_H * 0.45 - 0.06,
        dz + inN.z * 0.21
      );
      keyholeSlot.lookAt(new THREE.Vector3(0, DOOR_H * 0.45 - 0.06, 0));
      scene.add(keyholeSlot);
      }

      // Warm fill light for door visibility (dimmer for locked niches)
      const doorFill = new THREE.PointLight("#FFF0D0", isUnlocked ? 1.5 : 0.5, 10);
      doorFill.position.set(dx + inN.x * 2.5, DOOR_H * 0.5, dz + inN.z * 2.5);
      scene.add(doorFill);

      // Spotlight on door face (dimmer for locked niches)
      const doorFaceSpot = new THREE.SpotLight("#FFF5E0", isUnlocked ? 2.0 : 0.6, 16, Math.PI / 4.5, 0.4, 0.7);
      doorFaceSpot.position.set(dx + inN.x * 6.0, DOOR_H * 0.55, dz + inN.z * 6.0);
      doorFaceSpot.target.position.set(dx, DOOR_H * 0.42, dz);
      scene.add(doorFaceSpot);
      scene.add(doorFaceSpot.target);

      // ── ELEGANT WING NAME LABEL (upper portion of door/niche) ──
      if (doorDef.label) {
        const labelCanvas = document.createElement("canvas");
        labelCanvas.width = 1024;
        labelCanvas.height = 192;
        const lctx = labelCanvas.getContext("2d")!;
        if (isUnlocked) {
          // Transparent dark wood background
          lctx.fillStyle = "#3A2818";
          lctx.fillRect(0, 0, 1024, 192);
          // Thin elegant gold border
          lctx.strokeStyle = "#C8A050";
          lctx.lineWidth = 3;
          lctx.strokeRect(12, 12, 1000, 168);
          // Wing name in refined serif
          const eyeLabel = doorDef.label;
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
        } else {
          // Muted stone-colored label for locked niche
          lctx.fillStyle = "#C8BFA8";
          lctx.fillRect(0, 0, 1024, 192);
          // Subtle border
          lctx.strokeStyle = "#A89878";
          lctx.lineWidth = 2;
          lctx.strokeRect(12, 12, 1000, 168);
          // Wing name — dimmer, with lock symbol
          const eyeLabel = doorDef.label;
          lctx.fillStyle = "#8A7E68";
          lctx.font = "bold 90px Georgia, 'Times New Roman', serif";
          lctx.textAlign = "center";
          lctx.textBaseline = "middle";
          lctx.fillText(eyeLabel, 512, 96);
        }

        const labelTex = new THREE.CanvasTexture(labelCanvas);
        labelTex.colorSpace = THREE.SRGBColorSpace;
        const labelMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(2.8, 0.54),
          new THREE.MeshBasicMaterial({ map: labelTex, side: THREE.DoubleSide, transparent: !isUnlocked, opacity: isUnlocked ? 1.0 : 0.7 })
        );
        // Position at upper third of door/niche
        labelMesh.position.set(
          dx + inN.x * 0.40,
          isUnlocked ? 5.5 : 5.2,
          dz + inN.z * 0.40
        );
        labelMesh.lookAt(new THREE.Vector3(0, isUnlocked ? 5.5 : 5.2, 0));
        scene.add(labelMesh);
      }
    });

    // (Inlay panels removed — locked doors are now part of the 7-door ring above)
    const inlayMeshes: THREE.Mesh[] = []; // kept for click handler compatibility

    // ── BUST PEDESTALS — 10 positions evenly spaced, avoiding doors ──
    const bustMeshes: THREE.Mesh[] = [];
    // Pre-compute 10 valid pedestal angles that don't overlap doors
    const PEDESTAL_COUNT = 10;
    const candidateAngles: number[] = [];
    const totalSlots = PEDESTAL_COUNT + DOOR_ANGLES.length;
    for (let i = 0; i < totalSlots * 2; i++) {
      const a = (i / (totalSlots * 2)) * Math.PI * 2;
      const tooClose = DOOR_ANGLES.some(da => {
        let diff = Math.abs(a - da);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        return diff < Math.PI / 9;
      });
      if (!tooClose) candidateAngles.push(a);
    }
    // Pick PEDESTAL_COUNT evenly spaced from candidates
    const pedestalAngles: number[] = [];
    const step = Math.max(1, Math.floor(candidateAngles.length / PEDESTAL_COUNT));
    for (let i = 0; i < candidateAngles.length && pedestalAngles.length < PEDESTAL_COUNT; i += step) {
      pedestalAngles.push(candidateAngles[i]);
    }

    const bR = RADIUS - 1.8;
    const bustStyle: BustStyle = styleEra === "renaissance" ? "renaissance" : "roman";

    for (let bi = 0; bi < pedestalAngles.length; bi++) {
      const bustAngle = pedestalAngles[bi];
      const bx = Math.cos(bustAngle) * bR, bz = Math.sin(bustAngle) * bR;

      // Pedestal — square base, column, matching top (all aligned at 0.55)
      const pedBaseH = 0.15;
      scene.add(mk(new THREE.BoxGeometry(0.55, pedBaseH, 0.55), MS.marble, bx, pedBaseH / 2, bz));
      const pedColH = 0.7;
      const pedColY = pedBaseH + pedColH / 2;
      scene.add(mk(new THREE.BoxGeometry(0.30, pedColH, 0.30), MS.marble, bx, pedColY, bz));
      const pedTopH = 0.1;
      const pedTopY = pedBaseH + pedColH + pedTopH / 2;
      scene.add(mk(new THREE.BoxGeometry(0.55, pedTopH, 0.55), MS.marble, bx, pedTopY, bz));

      const pedestalTopY = pedBaseH + pedColH + pedTopH;

      // Per-pedestal data — each pedestal can have its own face/name/gender
      const pedData = bustPedestals?.[bi];
      const thisFaceUrl = pedData?.faceUrl || null;
      const thisName = pedData?.name || null;
      const thisGender: BustGender = pedData?.gender || (bi % 2 === 0 ? "male" : "female");

      // Name plaque on pedestal base, facing inward
      if (thisName) {
        const plaqueTex = createNamePlaqueTexture(thisName);
        const plaqueGeo = new THREE.PlaneGeometry(0.40, 0.12);
        const plaqueMat = new THREE.MeshStandardMaterial({
          map: plaqueTex,
          roughness: 0.3,
          metalness: 0.1,
          side: THREE.DoubleSide,
        });
        const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
        const toCenterLen = Math.sqrt(bx * bx + bz * bz);
        const nDx = -bx / toCenterLen, nDz = -bz / toCenterLen;
        plaque.position.set(
          bx + nDx * 0.285,
          pedBaseH * 0.55,
          bz + nDz * 0.285,
        );
        plaque.rotation.y = Math.atan2(nDx, nDz);
        scene.add(plaque);
      }

      // Bust — uses per-pedestal face if available, otherwise generic with alternating gender
      addBustToScene(
        scene, bx, bz, bustAngle, bustStyle, pedestalTopY,
        thisFaceUrl,
        marbleTex,
        thisGender,
        ren,
      );

      // Click target — all busts are interactive
      const bustClick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 1.5, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      bustClick.position.set(bx, pedestalTopY + 0.55, bz);
      bustClick.userData = { isBust: true, pedestalIndex: bi };
      scene.add(bustClick);
      bustMeshes.push(bustClick);
    }

    // ── ERA-SPECIFIC MODIFICATIONS ──
    if (styleEra === "renaissance") {
      // ═══ RENAISSANCE CORTILE ═══

      // ── Brunelleschi Arcade: round arches between ALL columns ──
      const COL_R_POS = RADIUS - 0.8; // column center radius (matches column placement)
      for (let ci = 0; ci < validColAngles.length; ci++) {
        const a1 = validColAngles[ci];
        const a2 = validColAngles[(ci + 1) % validColAngles.length];
        const x1 = Math.cos(a1) * COL_R_POS, z1 = Math.sin(a1) * COL_R_POS;
        const x2 = Math.cos(a2) * COL_R_POS, z2 = Math.sin(a2) * COL_R_POS;
        const midX = (x1 + x2) / 2, midZ = (z1 + z2) / 2;
        const span = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
        const archY = colH + 0.3; // top of capital
        const archRadius = span / 2;

        // Semicircular arch (TorusGeometry, half-ring)
        const archGeo = new THREE.TorusGeometry(archRadius, 0.12, 8, 16, Math.PI);
        const arch = new THREE.Mesh(archGeo, MS.column);
        arch.position.set(midX, archY, midZ);
        // Orient arch to face center and stand upright
        arch.lookAt(0, archY, 0);
        arch.rotateX(Math.PI / 2);
        arch.rotateZ(Math.PI / 2);
        arch.castShadow = true;
        scene.add(arch);

        // Springer stones where arch meets columns
        const springerGeo = new THREE.BoxGeometry(0.25, 0.2, 0.25);
        const sp1 = mk(springerGeo, MS.marble, x1, archY, z1);
        sp1.lookAt(0, archY, 0);
        scene.add(sp1);
        const sp2 = mk(springerGeo, MS.marble, x2, archY, z2);
        sp2.lookAt(0, archY, 0);
        scene.add(sp2);

        // Spandrel medallion between arches (above arch peak)
        const medallionY = archY + archRadius + 0.3;
        const spandrelMat = ci % 2 === 0 ? MS.gold : MS.marble;
        const medallion = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), spandrelMat);
        medallion.position.set(midX, medallionY, midZ);
        medallion.lookAt(0, medallionY, 0);
        scene.add(medallion);

        // Entablature beam spanning columns
        const entGeo = new THREE.BoxGeometry(span, 0.2, 0.35);
        const ent = mk(entGeo, MS.column, midX, archY + archRadius + 0.08, midZ);
        ent.lookAt(0, archY + archRadius + 0.08, 0);
        ent.rotateY(Math.PI / 2);
        scene.add(ent);
      }

      // ── Column Enhancement: Corinthian capitals + Attic bases ──
      validColAngles.forEach((angle) => {
        const cx = Math.cos(angle) * COL_R_POS;
        const cz = Math.sin(angle) * COL_R_POS;

        // Corinthian capital: flared box
        const capFlare = mk(new THREE.BoxGeometry(0.65, 0.15, 0.65), MS.column, cx, colH + 0.05, cz);
        scene.add(capFlare);
        // Abacus plate
        const abacus = mk(new THREE.BoxGeometry(0.75, 0.06, 0.75), MS.marble, cx, colH + 0.18, cz);
        scene.add(abacus);
        // 4 volute details at corners
        const voluteGeo = new THREE.SphereGeometry(0.06, 6, 4);
        for (let v = 0; v < 4; v++) {
          const va = (v / 4) * Math.PI * 2 + Math.PI / 4;
          const vx = cx + Math.cos(va) * 0.28;
          const vz = cz + Math.sin(va) * 0.28;
          scene.add(mk(voluteGeo, MS.gold, vx, colH + 0.1, vz));
        }

        // Attic base: wider cylinder + torus molding
        const atkBase = mk(new THREE.CylinderGeometry(colR * 1.6, colR * 1.8, 0.15, 16), MS.marble, cx, 0.075, cz);
        scene.add(atkBase);
        const torusMold = new THREE.Mesh(new THREE.TorusGeometry(colR * 1.4, 0.04, 6, 16), MS.column);
        torusMold.position.set(cx, 0.18, cz);
        torusMold.rotation.x = Math.PI / 2;
        scene.add(torusMold);
      });

      // ── Groin Vault Ribs: cross-ribs on ceiling between column bays ──
      for (let ci = 0; ci < validColAngles.length; ci++) {
        const a1 = validColAngles[ci];
        const a2 = validColAngles[(ci + 1) % validColAngles.length];
        const aMid = (a1 + a2) / 2;
        // Inner and outer points for the bay
        const outerR = COL_R_POS;
        const innerR = COL_R_POS - 4;
        const ribY = WALL_H - 0.3;
        const ribPeak = WALL_H + 1.0;

        // Two diagonal ribs per bay
        for (let d = 0; d < 2; d++) {
          const startA = d === 0 ? a1 : a1;
          const endA = d === 0 ? a2 : a2;
          const startR = d === 0 ? outerR : innerR;
          const endR = d === 0 ? innerR : outerR;

          const p0 = new THREE.Vector3(Math.cos(startA) * startR, ribY, Math.sin(startA) * startR);
          const p3 = new THREE.Vector3(Math.cos(endA) * endR, ribY, Math.sin(endA) * endR);
          const mid = new THREE.Vector3((p0.x + p3.x) / 2, ribPeak, (p0.z + p3.z) / 2);
          const curve = new THREE.CatmullRomCurve3([p0, mid, p3]);
          const tubeGeo = new THREE.TubeGeometry(curve, 12, 0.06, 6, false);
          const rib = new THREE.Mesh(tubeGeo, MS.column);
          rib.castShadow = true;
          scene.add(rib);
        }

        // Central boss at intersection
        const bossX = Math.cos(aMid) * ((outerR + innerR) / 2);
        const bossZ = Math.sin(aMid) * ((outerR + innerR) / 2);
        scene.add(mk(new THREE.SphereGeometry(0.08, 8, 6), MS.gold, bossX, ribPeak, bossZ));
      }

      // ── Checkerboard Floor: diamond-rotated 45° in center, alternating tiles ──
      {
        const tileSz = 1.0;
        const darkFloorMat = new THREE.MeshStandardMaterial({ color: "#4A4A42", roughness: 0.15, metalness: 0.05, envMapIntensity: 0.8 });
        const lightFloorMat = new THREE.MeshStandardMaterial({ color: "#E8E0D4", roughness: 0.12, metalness: 0.03, envMapIntensity: 0.9 });
        const tileGeo = new THREE.BoxGeometry(tileSz, 0.02, tileSz);

        // Use InstancedMesh for performance
        const darkPositions: THREE.Matrix4[] = [];
        const lightPositions: THREE.Matrix4[] = [];
        const mat4 = new THREE.Matrix4();
        const rot45 = new THREE.Matrix4().makeRotationY(Math.PI / 4);

        for (let tx = -18; tx <= 18; tx += 1) {
          for (let tz = -18; tz <= 18; tz += 1) {
            const dist = Math.sqrt(tx * tx + tz * tz);
            if (dist > RADIUS - 2) continue;
            const isDark = (tx + tz) % 2 !== 0;
            const m = new THREE.Matrix4();
            if (dist < 5) {
              // Diamond rotation in center zone
              m.multiply(new THREE.Matrix4().makeTranslation(tx * tileSz, 0.003, tz * tileSz));
              m.multiply(rot45);
            } else {
              m.makeTranslation(tx * tileSz, 0.003, tz * tileSz);
            }
            (isDark ? darkPositions : lightPositions).push(m);
          }
        }

        const darkInst = new THREE.InstancedMesh(tileGeo, darkFloorMat, darkPositions.length);
        darkPositions.forEach((m, i) => darkInst.setMatrixAt(i, m));
        darkInst.instanceMatrix.needsUpdate = true;
        darkInst.receiveShadow = true;
        scene.add(darkInst);

        const lightInst = new THREE.InstancedMesh(tileGeo, lightFloorMat, lightPositions.length);
        lightPositions.forEach((m, i) => lightInst.setMatrixAt(i, m));
        lightInst.instanceMatrix.needsUpdate = true;
        lightInst.receiveShadow = true;
        scene.add(lightInst);
      }

      // ── Upper Gallery: windows with pietra serena surrounds + portrait medallions ──
      {
        const galleryY = colH + 3.0;
        const pietraSerenaMat = new THREE.MeshStandardMaterial({ color: "#8A8A80", roughness: 0.4, metalness: 0.0 });
        for (let ci = 0; ci < validColAngles.length; ci++) {
          const a = validColAngles[ci];
          const aNext = validColAngles[(ci + 1) % validColAngles.length];
          const aMid = (a + aNext) / 2;
          const wR = RADIUS - 0.3;

          // Window surround
          const wx = Math.cos(aMid) * wR, wz = Math.sin(aMid) * wR;
          const surround = mk(new THREE.BoxGeometry(0.12, 1.6, 1.0), pietraSerenaMat, wx, galleryY, wz);
          surround.lookAt(0, galleryY, 0);
          scene.add(surround);
          // Window opening (lighter recessed area)
          const windowPane = mk(new THREE.BoxGeometry(0.06, 1.2, 0.7), MS.marble, wx, galleryY, wz);
          windowPane.lookAt(0, galleryY, 0);
          scene.add(windowPane);

          // Portrait medallion roundel between windows
          const pmY = galleryY + 1.4;
          const pmx = Math.cos(aMid) * (wR + 0.05), pmz = Math.sin(aMid) * (wR + 0.05);
          const pm = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), MS.bronze);
          pm.position.set(pmx, pmY, pmz);
          pm.lookAt(0, pmY, 0);
          scene.add(pm);
        }
      }

      // ── Coat of Arms above entrance ──
      {
        const entranceAngle = DOOR_ANGLES[0]; // first door
        const coaR = RADIUS - 0.15;
        const coaX = Math.cos(entranceAngle) * coaR;
        const coaZ = Math.sin(entranceAngle) * coaR;
        const coaY = DOOR_H + 1.2;

        // Shield
        const shield = mk(new THREE.BoxGeometry(0.1, 1.0, 0.8), MS.gold, coaX, coaY, coaZ);
        shield.lookAt(0, coaY, 0);
        scene.add(shield);

        // Flanking scroll brackets
        for (const side of [-1, 1]) {
          const perpX = -Math.sin(entranceAngle) * 0.6 * side;
          const perpZ = Math.cos(entranceAngle) * 0.6 * side;
          const scroll = mk(new THREE.TorusGeometry(0.15, 0.04, 6, 8, Math.PI), MS.gold,
            coaX + perpX, coaY, coaZ + perpZ);
          scroll.lookAt(0, coaY, 0);
          scene.add(scroll);
        }
      }

      // ── Candelabra Wall Sconces (6 pieces) ──
      {
        const candelPositions: number[] = [];
        // Pick 6 evenly-spaced column bays that don't overlap doors
        for (let ci = 0; ci < validColAngles.length && candelPositions.length < 6; ci += Math.max(1, Math.floor(validColAngles.length / 6))) {
          const a = validColAngles[ci];
          const aNext = validColAngles[(ci + 1) % validColAngles.length];
          candelPositions.push((a + aNext) / 2);
        }

        const candleTipMat = new THREE.MeshStandardMaterial({
          color: "#FFE8A0", emissive: "#FFE8A0", emissiveIntensity: 0.5, roughness: 0.3,
        });

        candelPositions.forEach((cAngle) => {
          const cR = RADIUS - 0.4;
          const cx = Math.cos(cAngle) * cR, cz = Math.sin(cAngle) * cR;
          const baseY = 3.5;

          // Vertical stem
          scene.add(mk(new THREE.CylinderGeometry(0.02, 0.03, 0.8, 6), MS.bronze, cx, baseY, cz));

          // Three branches
          for (let b = -1; b <= 1; b++) {
            const perpX = -Math.sin(cAngle) * 0.15 * b;
            const perpZ = Math.cos(cAngle) * 0.15 * b;
            const branchY = baseY + 0.3 + Math.abs(b) * 0.1;
            // Horizontal arm
            const arm = mk(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 4), MS.bronze,
              cx + perpX, branchY, cz + perpZ);
            arm.rotation.z = Math.PI / 2;
            scene.add(arm);
            // Candle tip (emissive cone)
            scene.add(mk(new THREE.ConeGeometry(0.025, 0.08, 6), candleTipMat,
              cx + perpX, branchY + 0.06, cz + perpZ));
          }

          // PointLight per candelabra
          const candleLight = new THREE.PointLight("#FFF5E0", 0.3, 4);
          candleLight.position.set(cx, baseY + 0.5, cz);
          scene.add(candleLight);
        });
      }

    } else {
      // ═══ ROMAN ATRIUM ═══

      // ── Grand Impluvium: recessed pool 7×5 ──
      const implW = 7, implD = 5, implDepth = 0.35;
      const waterMat = new THREE.MeshPhysicalMaterial({
        color: "#4A8A7A", roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.65,
        envMapIntensity: 1.4, clearcoat: 0.6, clearcoatRoughness: 0.05,
      });

      // Pool bottom
      scene.add(mk(new THREE.BoxGeometry(implW, 0.06, implD), MS.marble, 0, -implDepth, 0));
      // Pool walls (4 sides)
      scene.add(mk(new THREE.BoxGeometry(implW, implDepth, 0.08), MS.marble, 0, -implDepth / 2, implD / 2));
      scene.add(mk(new THREE.BoxGeometry(implW, implDepth, 0.08), MS.marble, 0, -implDepth / 2, -implD / 2));
      scene.add(mk(new THREE.BoxGeometry(0.08, implDepth, implD), MS.marble, implW / 2, -implDepth / 2, 0));
      scene.add(mk(new THREE.BoxGeometry(0.08, implDepth, implD), MS.marble, -implW / 2, -implDepth / 2, 0));

      // Water surface
      const water = mk(new THREE.BoxGeometry(implW - 0.1, 0.03, implD - 0.1), waterMat, 0, -0.05, 0);
      scene.add(water);

      // Marble rim with double molding
      const rimH = 0.12;
      // Outer rim
      scene.add(mk(new THREE.BoxGeometry(implW + 0.6, rimH, 0.2), MS.marble, 0, rimH / 2, implD / 2 + 0.2));
      scene.add(mk(new THREE.BoxGeometry(implW + 0.6, rimH, 0.2), MS.marble, 0, rimH / 2, -(implD / 2 + 0.2)));
      scene.add(mk(new THREE.BoxGeometry(0.2, rimH, implD + 0.6), MS.marble, implW / 2 + 0.2, rimH / 2, 0));
      scene.add(mk(new THREE.BoxGeometry(0.2, rimH, implD + 0.6), MS.marble, -(implW / 2 + 0.2), rimH / 2, 0));
      // Inner rim (second molding)
      scene.add(mk(new THREE.BoxGeometry(implW + 0.3, rimH * 0.7, 0.1), MS.marble, 0, rimH * 0.35, implD / 2 + 0.05));
      scene.add(mk(new THREE.BoxGeometry(implW + 0.3, rimH * 0.7, 0.1), MS.marble, 0, rimH * 0.35, -(implD / 2 + 0.05)));
      scene.add(mk(new THREE.BoxGeometry(0.1, rimH * 0.7, implD + 0.3), MS.marble, implW / 2 + 0.05, rimH * 0.35, 0));
      scene.add(mk(new THREE.BoxGeometry(0.1, rimH * 0.7, implD + 0.3), MS.marble, -(implW / 2 + 0.05), rimH * 0.35, 0));

      // Central fountain pedestal with bust figure
      scene.add(mk(new THREE.CylinderGeometry(0.25, 0.35, 0.8, 8), MS.marble, 0, -implDepth + 0.4, 0));
      scene.add(mk(new THREE.CylinderGeometry(0.15, 0.2, 0.3, 8), MS.marble, 0, -implDepth + 0.95, 0));
      scene.add(mk(new THREE.SphereGeometry(0.12, 8, 6), MS.bust, 0, -implDepth + 1.2, 0));

      // 4 short columns at impluvium corners
      const implCorners = [
        [implW / 2 + 0.4, implD / 2 + 0.4],
        [-(implW / 2 + 0.4), implD / 2 + 0.4],
        [implW / 2 + 0.4, -(implD / 2 + 0.4)],
        [-(implW / 2 + 0.4), -(implD / 2 + 0.4)],
      ];
      implCorners.forEach(([icx, icz]) => {
        scene.add(mk(new THREE.CylinderGeometry(0.12, 0.14, 1.2, 8), MS.column, icx, 0.6, icz));
        scene.add(mk(new THREE.SphereGeometry(0.08, 6, 4), MS.marble, icx, 1.24, icz));
      });

      // ── Mosaic Floor: concentric rings + Greek key border ──
      {
        const mosaicBlack = new THREE.MeshStandardMaterial({ color: "#1A1A18", roughness: 0.2, metalness: 0.0 });
        const mosaicWhite = new THREE.MeshStandardMaterial({ color: "#F5F0E8", roughness: 0.15, metalness: 0.0 });
        const terracottaMat = new THREE.MeshStandardMaterial({ color: "#C17040", roughness: 0.4, metalness: 0.0 });
        const creamMat = new THREE.MeshStandardMaterial({ color: "#F0E8D8", roughness: 0.3, metalness: 0.0 });
        const tileGeo = new THREE.BoxGeometry(0.4, 0.01, 0.4);

        // Concentric ring tiles around impluvium
        const ringDark: THREE.Matrix4[] = [];
        const ringLight: THREE.Matrix4[] = [];
        for (let ring = 0; ring < 6; ring++) {
          const rDist = 4.5 + ring * 1.2;
          const numSegs = Math.floor(rDist * 4);
          for (let s = 0; s < numSegs; s++) {
            const a = (s / numSegs) * Math.PI * 2;
            const tx = Math.cos(a) * rDist;
            const tz = Math.sin(a) * rDist;
            if (Math.sqrt(tx * tx + tz * tz) > RADIUS - 3) continue;
            const m = new THREE.Matrix4().makeTranslation(tx, 0.002, tz);
            (ring % 2 === 0 ? ringDark : ringLight).push(m);
          }
        }

        if (ringDark.length > 0) {
          const darkRingInst = new THREE.InstancedMesh(tileGeo, mosaicBlack, ringDark.length);
          ringDark.forEach((m, i) => darkRingInst.setMatrixAt(i, m));
          darkRingInst.instanceMatrix.needsUpdate = true;
          darkRingInst.receiveShadow = true;
          scene.add(darkRingInst);
        }
        if (ringLight.length > 0) {
          const lightRingInst = new THREE.InstancedMesh(tileGeo, mosaicWhite, ringLight.length);
          ringLight.forEach((m, i) => lightRingInst.setMatrixAt(i, m));
          lightRingInst.instanceMatrix.needsUpdate = true;
          lightRingInst.receiveShadow = true;
          scene.add(lightRingInst);
        }

        // Greek key border: meander pattern around edge of floor
        const borderR = RADIUS - 2;
        const keySegGeo = new THREE.BoxGeometry(0.3, 0.012, 0.12);
        const keyPositionsTerra: THREE.Matrix4[] = [];
        const keyPositionsCream: THREE.Matrix4[] = [];
        const keySegments = 80;
        for (let s = 0; s < keySegments; s++) {
          const a = (s / keySegments) * Math.PI * 2;
          const kx = Math.cos(a) * borderR;
          const kz = Math.sin(a) * borderR;
          const m = new THREE.Matrix4();
          m.makeTranslation(kx, 0.006, kz);
          m.multiply(new THREE.Matrix4().makeRotationY(-a));
          (s % 2 === 0 ? keyPositionsTerra : keyPositionsCream).push(m);
        }

        if (keyPositionsTerra.length > 0) {
          const terraInst = new THREE.InstancedMesh(keySegGeo, terracottaMat, keyPositionsTerra.length);
          keyPositionsTerra.forEach((m, i) => terraInst.setMatrixAt(i, m));
          terraInst.instanceMatrix.needsUpdate = true;
          terraInst.receiveShadow = true;
          scene.add(terraInst);
        }
        if (keyPositionsCream.length > 0) {
          const creamInst = new THREE.InstancedMesh(keySegGeo, creamMat, keyPositionsCream.length);
          keyPositionsCream.forEach((m, i) => creamInst.setMatrixAt(i, m));
          creamInst.instanceMatrix.needsUpdate = true;
          creamInst.receiveShadow = true;
          scene.add(creamInst);
        }
      }

      // ── Pompeian Wall Paintings (12 panels between columns) ──
      {
        // Authentic Pompeian palette
        const dadoMat = new THREE.MeshStandardMaterial({ color: "#D0C8B8", roughness: 0.4, metalness: 0.0 }); // faux marble dado
        const pomRedMat = new THREE.MeshStandardMaterial({ color: "#A42A2E", roughness: 0.45, metalness: 0.0 }); // Pompeian red
        const ochreMat = new THREE.MeshStandardMaterial({ color: "#C9A961", roughness: 0.45, metalness: 0.0 }); // yellow ochre
        const blackPanelMat = new THREE.MeshStandardMaterial({ color: "#2B2B2B", roughness: 0.4, metalness: 0.0 }); // Roman black
        const friezeMat = new THREE.MeshStandardMaterial({ color: "#F0ECD8", roughness: 0.35, metalness: 0.0 }); // cream frieze
        const panelColors = [pomRedMat, ochreMat, blackPanelMat];
        const wallPanelR = RADIUS - 0.12;

        for (let ci = 0; ci < validColAngles.length; ci++) {
          const a1 = validColAngles[ci];
          const a2 = validColAngles[(ci + 1) % validColAngles.length];
          const aMid = (a1 + a2) / 2;
          // Skip panels that overlap with doors or exit portal
          const tooCloseToDoor = DOOR_ANGLES.some(da => {
            let diff = Math.abs(aMid - da); if (diff > Math.PI) diff = Math.PI * 2 - diff;
            return diff < 0.28; // ~16° clearance
          });
          const EXIT_A = Math.PI / 2;
          let diffExit = Math.abs(aMid - EXIT_A); if (diffExit > Math.PI) diffExit = Math.PI * 2 - diffExit;
          if (tooCloseToDoor || diffExit < 0.28) continue;
          const px = Math.cos(aMid) * wallPanelR;
          const pz = Math.sin(aMid) * wallPanelR;

          // Dado zone (bottom 0.8m)
          const dado = mk(new THREE.BoxGeometry(2.0, 0.8, 0.04), dadoMat, px, 0.4, pz);
          dado.lookAt(0, 0.4, 0);
          scene.add(dado);

          // Main panel (middle ~4m)
          const mainPanelMat = panelColors[ci % 3];
          const mainPanel = mk(new THREE.BoxGeometry(2.0, 4.0, 0.04), mainPanelMat, px, 2.8, pz);
          mainPanel.lookAt(0, 2.8, 0);
          scene.add(mainPanel);

          // Gold frame border (thin strips around main panel)
          const frameThick = 0.05;
          // Top frame
          const ft = mk(new THREE.BoxGeometry(2.1, frameThick, 0.05), MS.gold, px, 4.8, pz);
          ft.lookAt(0, 4.8, 0);
          scene.add(ft);
          // Bottom frame
          const fb = mk(new THREE.BoxGeometry(2.1, frameThick, 0.05), MS.gold, px, 0.8, pz);
          fb.lookAt(0, 0.8, 0);
          scene.add(fb);
          // Left frame
          const fl = mk(new THREE.BoxGeometry(frameThick, 4.1, 0.05), MS.gold, px, 2.8, pz);
          fl.lookAt(0, 2.8, 0);
          fl.rotateY(Math.PI / 2);
          scene.add(fl);
          // Right frame
          const fr = mk(new THREE.BoxGeometry(frameThick, 4.1, 0.05), MS.gold, px, 2.8, pz);
          fr.lookAt(0, 2.8, 0);
          fr.rotateY(-Math.PI / 2);
          scene.add(fr);

          // Upper frieze (top 1m)
          const frieze = mk(new THREE.BoxGeometry(2.0, 1.0, 0.04), friezeMat, px, 5.3, pz);
          frieze.lookAt(0, 5.3, 0);
          scene.add(frieze);
        }
      }

      // ── Garland festoons between columns (authentic peristylium decoration) ──
      {
        const garlandMat = new THREE.MeshStandardMaterial({ color: "#4A6B3A", roughness: 0.6, metalness: 0.0 });
        const garlandGoldMat = new THREE.MeshStandardMaterial({ color: "#C8A050", roughness: 0.3, metalness: 0.5 });
        const garlandY = colH - 0.3; // hang from just below capitals
        for (let ci = 0; ci < validColAngles.length; ci++) {
          const a1 = validColAngles[ci];
          const a2 = validColAngles[(ci + 1) % validColAngles.length];
          // Skip garlands that cross door openings
          const gMid = (a1 + a2) / 2;
          const crossesDoor = DOOR_ANGLES.some(da => {
            let diff = Math.abs(gMid - da); if (diff > Math.PI) diff = Math.PI * 2 - diff;
            return diff < 0.25;
          });
          if (crossesDoor) continue;

          const colRPos = RADIUS - 0.8;
          const x1 = Math.cos(a1) * colRPos, z1 = Math.sin(a1) * colRPos;
          const x2 = Math.cos(a2) * colRPos, z2 = Math.sin(a2) * colRPos;
          // Catenary curve between columns
          const pts: THREE.Vector3[] = [];
          const segments = 12;
          for (let s = 0; s <= segments; s++) {
            const t = s / segments;
            const x = x1 + (x2 - x1) * t;
            const z = z1 + (z2 - z1) * t;
            const sag = Math.sin(t * Math.PI) * 0.6; // droop amount
            pts.push(new THREE.Vector3(x, garlandY - sag, z));
          }
          const garlandGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.06, 6, false);
          scene.add(new THREE.Mesh(garlandGeo, garlandMat));
          // Gold rosette knots at attachment points
          for (const [px, pz] of [[x1, z1], [x2, z2]]) {
            const rosette = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), garlandGoldMat);
            rosette.position.set(px, garlandY, pz);
            scene.add(rosette);
          }
        }
      }

      // ── Oil Lamp Illumination (8 lamps between every other column) ──
      {
        const lampBronzeMat = MS.bronze;
        const lampGlowMat = new THREE.MeshStandardMaterial({
          color: "#FF9040", emissive: "#FF9040", emissiveIntensity: 0.3, roughness: 0.4,
        });

        for (let ci = 0; ci < validColAngles.length && ci < 16; ci += 2) {
          const a = validColAngles[ci];
          const aNext = validColAngles[(ci + 1) % validColAngles.length];
          const lAngle = (a + aNext) / 2;
          // Skip if lamp would land on a door or exit portal
          const tooCloseToOpening = SKIP_ANGLES.some(sa => {
            let diff = Math.abs(lAngle - sa); if (diff > Math.PI) diff = Math.PI * 2 - diff;
            return diff < 0.25;
          });
          if (tooCloseToOpening) continue;
          const lR = RADIUS - 0.35;
          const lx = Math.cos(lAngle) * lR, lz = Math.sin(lAngle) * lR;
          const lY = 3.2;

          // Wall bracket (horizontal arm)
          const arm = mk(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), lampBronzeMat, lx, lY, lz);
          arm.lookAt(0, lY, 0);
          arm.rotateX(Math.PI / 2);
          scene.add(arm);

          // Dish
          const inwardX = Math.cos(lAngle) * (lR - 0.35);
          const inwardZ = Math.sin(lAngle) * (lR - 0.35);
          scene.add(mk(new THREE.CylinderGeometry(0.1, 0.08, 0.04, 8), lampBronzeMat, inwardX, lY, inwardZ));

          // Emissive glow on dish
          scene.add(mk(new THREE.SphereGeometry(0.04, 6, 4), lampGlowMat, inwardX, lY + 0.05, inwardZ));

          // PointLight per lamp
          const lampLight = new THREE.PointLight("#FF9040", 0.4, 6);
          lampLight.position.set(inwardX, lY + 0.15, inwardZ);
          scene.add(lampLight);
        }
      }

      // ── Marble Benches (4 benches between bust pedestals) ──
      {
        const benchAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
        benchAngles.forEach((bAngle) => {
          const benchR = RADIUS - 3.5;
          const bx = Math.cos(bAngle) * benchR;
          const bz = Math.sin(bAngle) * benchR;

          // Seat
          const seat = mk(new THREE.BoxGeometry(1.2, 0.08, 0.4), MS.marble, bx, 0.54, bz);
          seat.lookAt(0, 0.54, 0);
          seat.rotateY(Math.PI / 2);
          scene.add(seat);

          // Two slab legs
          for (const offset of [-0.4, 0.4]) {
            const perpX = -Math.sin(bAngle) * offset;
            const perpZ = Math.cos(bAngle) * offset;
            const leg = mk(new THREE.BoxGeometry(0.35, 0.5, 0.06), MS.marble, bx + perpX, 0.25, bz + perpZ);
            leg.lookAt(0, 0.25, 0);
            leg.rotateY(Math.PI / 2);
            scene.add(leg);
          }
        });
      }

      // ── Decorative Amphorae (4 pieces) ──
      {
        const terracottaMat = new THREE.MeshStandardMaterial({ color: "#C17040", roughness: 0.5, metalness: 0.0 });
        const amphoraAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        amphoraAngles.forEach((aAngle) => {
          // Check not too close to a door
          const tooClose = DOOR_ANGLES.some(da => {
            let diff = Math.abs(aAngle - da);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            return diff < Math.PI / 6;
          });
          if (tooClose) return;

          const aR = RADIUS - 1.8;
          const ax = Math.cos(aAngle) * aR, az = Math.sin(aAngle) * aR;

          // Body (tapered cylinder)
          scene.add(mk(new THREE.CylinderGeometry(0.12, 0.18, 0.6, 8), terracottaMat, ax, 0.3, az));
          // Neck
          scene.add(mk(new THREE.CylinderGeometry(0.06, 0.1, 0.2, 8), terracottaMat, ax, 0.7, az));
          // Lip
          scene.add(mk(new THREE.CylinderGeometry(0.08, 0.06, 0.04, 8), terracottaMat, ax, 0.82, az));
          // Handles (torus on each side)
          for (const side of [-1, 1]) {
            const hx = ax + (-Math.sin(aAngle) * 0.16 * side);
            const hz = az + (Math.cos(aAngle) * 0.16 * side);
            const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 8, Math.PI), terracottaMat);
            handle.position.set(hx, 0.5, hz);
            handle.lookAt(ax, 0.5, az);
            handle.rotateX(Math.PI / 2);
            scene.add(handle);
          }
        });
      }

      // ── Ceiling Coffers around Oculus ──
      {
        const OCULUS_R_LOCAL = OCULUS_R || 3.0;
        const cofferRingR = OCULUS_R_LOCAL + 2.5;
        const numCoffers = 12;
        const cofferGeo = new THREE.BoxGeometry(1.8, 0.15, 1.2);
        const cofferFrameGeo = new THREE.BoxGeometry(1.9, 0.06, 1.3);

        for (let c = 0; c < numCoffers; c++) {
          const cAngle = (c / numCoffers) * Math.PI * 2;
          const ccx = Math.cos(cAngle) * cofferRingR;
          const ccz = Math.sin(cAngle) * cofferRingR;
          const cofferY = WALL_H - 0.5;

          // Recessed panel
          const coffer = mk(cofferGeo, MS.wall, ccx, cofferY, ccz);
          coffer.lookAt(0, cofferY, 0);
          scene.add(coffer);

          // Gold trim frame
          const frame = mk(cofferFrameGeo, MS.gold, ccx, cofferY + 0.1, ccz);
          frame.lookAt(0, cofferY + 0.1, 0);
          scene.add(frame);

          // Rosette in alternating coffers
          if (c % 2 === 0) {
            const rosetteR2 = OCULUS_R_LOCAL + 2.5;
            const rx = Math.cos(cAngle) * rosetteR2;
            const rz = Math.sin(cAngle) * rosetteR2;
            const rosette = new THREE.Mesh(new THREE.CircleGeometry(0.25, 12), MS.gold);
            rosette.position.set(rx, cofferY + 0.12, rz);
            rosette.lookAt(0, cofferY + 0.12, 0);
            scene.add(rosette);
          }
        }
      }
    }

    // Storage room removed — kept virtual (accessible via menu only)

    // ── DUST PARTICLES (upgraded: varied sizes, concentrated in beam, additive glow) ──
    const dustN = 300;
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

    // ── GRAND EXIT PORTAL (back to exterior) — larger and more imposing than wing doors ──
    const exitAngle = Math.PI / 2;
    const exitX = Math.cos(exitAngle) * (RADIUS - 0.3);
    const exitZ = Math.sin(exitAngle) * (RADIUS - 0.3);
    const exitInN = new THREE.Vector3(-Math.cos(exitAngle), 0, -Math.sin(exitAngle));
    const exitLatN = new THREE.Vector3(Math.cos(exitAngle + Math.PI / 2), 0, Math.sin(exitAngle + Math.PI / 2));
    const EXIT_W = 4.0, EXIT_H = 8.5;

    // Bright outdoor light plane (sky visible through opening)
    const portalGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(EXIT_W - 0.4, EXIT_H - 0.5),
      new THREE.MeshBasicMaterial({ color: "#F0E8D0", transparent: true, opacity: 0.08, side: THREE.DoubleSide })
    );
    portalGlow.position.set(exitX, EXIT_H / 2, exitZ);
    portalGlow.lookAt(0, EXIT_H / 2, 0);
    scene.add(portalGlow);

    // Massive marble columns flanking the entrance (thicker than wing door frames)
    const exitColR = 0.55;
    for (const side of [-1, 1]) {
      const cx = exitX + exitLatN.x * side * (EXIT_W / 2 + exitColR / 2);
      const cz = exitZ + exitLatN.z * side * (EXIT_W / 2 + exitColR / 2);
      // Column shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(exitColR, exitColR * 1.08, EXIT_H - 1, 16), MS.marble);
      shaft.position.set(cx, (EXIT_H - 1) / 2, cz);
      shaft.castShadow = true;
      scene.add(shaft);
      // Corinthian capital
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(exitColR * 1.9, exitColR * 1.1, 0.7, 16), MS.gold);
      cap.position.set(cx, EXIT_H - 0.65, cz);
      scene.add(cap);
      // Abacus
      const ab = mk(new THREE.BoxGeometry(exitColR * 3.5, 0.15, exitColR * 3.5), MS.marbleWarm, cx, EXIT_H - 0.2, cz);
      scene.add(ab);
      // Base
      const base = new THREE.Mesh(new THREE.CylinderGeometry(exitColR * 1.4, exitColR * 1.6, 0.4, 16), MS.marbleDark);
      base.position.set(cx, 0.2, cz);
      scene.add(base);
    }

    // Grand arch above entrance (semicircular, larger than wing arches)
    const exitArchW = EXIT_W / 2 + 0.5;
    const exitArchH = 1.8;
    const exitArchCurve = new THREE.EllipseCurve(0, 0, exitArchW, exitArchH, 0, Math.PI, false, 0);
    const exitArchPoints = exitArchCurve.getPoints(36).map(p => new THREE.Vector3(p.x, p.y, 0));
    const exitArchGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(exitArchPoints), 36, 0.14, 8, false);
    const exitArch = new THREE.Mesh(exitArchGeo, MS.gold);
    exitArch.position.set(exitX + exitInN.x * 0.1, EXIT_H, exitZ + exitInN.z * 0.1);
    exitArch.lookAt(new THREE.Vector3(0, EXIT_H, 0));
    exitArch.rotateY(Math.PI);
    scene.add(exitArch);

    // Keystone at arch apex
    const exitKeystone = mk(new THREE.BoxGeometry(0.4, 0.5, 0.2), MS.goldDark,
      exitX + exitInN.x * 0.3, EXIT_H + exitArchH, exitZ + exitInN.z * 0.3);
    exitKeystone.lookAt(new THREE.Vector3(0, EXIT_H + exitArchH, 0));
    scene.add(exitKeystone);

    // Heavy marble lintel/entablature
    const exitLintel = mk(new THREE.BoxGeometry(EXIT_W + 1.8, 0.5, 0.4), MS.marble,
      exitX + exitInN.x * 0.05, EXIT_H + 0.05, exitZ + exitInN.z * 0.05);
    exitLintel.lookAt(new THREE.Vector3(0, EXIT_H + 0.05, 0));
    scene.add(exitLintel);

    // Threshold step (marble)
    const exitThresh = mk(new THREE.BoxGeometry(EXIT_W + 1.0, 0.2, 0.6), MS.marbleDark,
      exitX + exitInN.x * 0.1, 0.1, exitZ + exitInN.z * 0.1);
    exitThresh.lookAt(new THREE.Vector3(0, 0.1, 0));
    scene.add(exitThresh);

    // Sky-blue gradient visible through doorway (suggests outdoors)
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 256; skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext("2d")!;
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
    skyGrad.addColorStop(0, "#87CEEB");   // sky blue top
    skyGrad.addColorStop(0.5, "#B8DCF0"); // lighter middle
    skyGrad.addColorStop(0.85, "#E8DCC8"); // warm horizon
    skyGrad.addColorStop(1, "#C8B89A");   // ground hint
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 256, 512);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(EXIT_W - 0.6, EXIT_H - 0.5),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    skyPlane.position.set(exitX + exitInN.x * 0.05, EXIT_H / 2, exitZ + exitInN.z * 0.05);
    skyPlane.lookAt(0, EXIT_H / 2, 0);
    scene.add(skyPlane);

    // Click target
    const portalHit = new THREE.Mesh(
      new THREE.BoxGeometry(EXIT_W, EXIT_H, 0.5),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    portalHit.position.set(exitX, EXIT_H / 2, exitZ);
    portalHit.lookAt(0, EXIT_H / 2, 0);
    scene.add(portalHit);

    // Strong outdoor light streaming in
    const portalLight = new THREE.PointLight("#FFF8E0", 1.2, 12);
    portalLight.position.set(exitX - exitInN.x * 1.0, EXIT_H * 0.6, exitZ - exitInN.z * 1.0);
    scene.add(portalLight);
    const portalSpot = new THREE.SpotLight("#FFF5E0", 1.5, 18, Math.PI / 5, 0.5, 0.7);
    portalSpot.position.set(exitX + exitInN.x * 3, EXIT_H * 0.5, exitZ + exitInN.z * 3);
    portalSpot.target.position.set(exitX - exitInN.x * 4, 0, exitZ - exitInN.z * 4);
    scene.add(portalSpot);
    scene.add(portalSpot.target);

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

      // Light beam breathing
      (beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.05 + Math.sin(t * 0.5) * 0.02;

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
      let inlayHov = false;
      let bustHov: number | null = null;
      doorMeshes.forEach(d => {
        const hits = rc.intersectObject(d.mesh);
        if (hits.length > 0 && hits[0].distance < 15) found = d.wingId;
      });
      const pHits = rc.intersectObject(portalHit);
      if (pHits.length > 0 && pHits[0].distance < 15) portalHov = true;
      // Check inlay clicks
      inlayMeshes.forEach(im => {
        const hits = rc.intersectObject(im);
        if (hits.length > 0 && hits[0].distance < 15) inlayHov = true;
      });
      // Check bust clicks
      bustMeshes.forEach(bm => {
        const hits = rc.intersectObject(bm);
        if (hits.length > 0 && hits[0].distance < 15) bustHov = bm.userData.pedestalIndex;
      });
      hoveredWing = found;
      hovMem.current = found || (portalHov ? "__exterior__" : (inlayHov ? "__inlay__" : (bustHov !== null ? `__bust_${bustHov}__` : null)));
      el.style.cursor = (found || portalHov || inlayHov || bustHov !== null) ? "pointer" : "grab";
    };
    const onClick = () => {
      if (!drag.current && hovMem.current) {
        if (hovMem.current === "__exterior__") onDoorClickRef.current("__exterior__");
        else if (hovMem.current === "__inlay__") onInlayClick?.();
        else if (hovMem.current.startsWith("__bust_")) onBustClick?.(parseInt(hovMem.current.replace("__bust_","").replace("__","")));
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
            if (m.map && !isCachedTexture(m.map)) m.map.dispose();
            if (m.normalMap && !isCachedTexture(m.normalMap)) m.normalMap.dispose();
            if (m.roughnessMap && !isCachedTexture(m.roughnessMap)) m.roughnessMap.dispose();
            if (m.emissiveMap && !isCachedTexture(m.emissiveMap)) m.emissiveMap.dispose();
            m.dispose();
          });
        }
      });
      dust.dispose();
      oculusBeam.dispose();
      allTexSets.forEach(disposePBRSet);
      envMapProc.dispose();
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
          top: 56,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          border: "1px solid rgba(200, 168, 104, 0.3)",
          background: "rgba(250, 245, 235, 0.7)",
          backdropFilter: "blur(8px)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          color: "#6A5A48",
          zIndex: 30,
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
