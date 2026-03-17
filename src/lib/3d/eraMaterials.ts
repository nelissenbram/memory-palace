import * as THREE from "three";
import { T } from "@/lib/theme";
import {
  loadMarbleTextures,
  loadTravertineTextures,
  loadTerracottaTileTextures,
  loadSandstoneTextures,
  loadOrnatePlasterTextures,
  loadFlorentineTileTextures,
  loadWalnutWoodTextures,
  loadPlasterWallTextures,
  loadDarkWoodTextures,
  loadFloorTileTextures,
  loadHerringboneTextures,
  disposePBRSet,
  type PBRTextureSet,
} from "./assetLoader";

export interface EraMatSet {
  wall: THREE.MeshStandardMaterial;
  floor: THREE.MeshPhysicalMaterial;
  column: THREE.MeshStandardMaterial;
  ceiling: THREE.MeshStandardMaterial;
  door: THREE.MeshStandardMaterial;
  doorFrame: THREE.MeshPhysicalMaterial;
  trim: THREE.MeshStandardMaterial;
  gold: THREE.MeshPhysicalMaterial;
  marble: THREE.MeshPhysicalMaterial;
  accent: THREE.MeshStandardMaterial;
  dome: THREE.MeshStandardMaterial;
  bust: THREE.MeshStandardMaterial;
  bronze: THREE.MeshPhysicalMaterial;
  inlay: THREE.MeshStandardMaterial;
  wainscot: THREE.MeshStandardMaterial;
  texSets: PBRTextureSet[];
}

export type StyleEra = "roman" | "renaissance";

export function createEraMaterials(era: StyleEra): EraMatSet {
  if (era === "roman") {
    return createRomanMaterials(T.era.roman);
  }
  return createRenaissanceMaterials(T.era.renaissance);
}

function createRomanMaterials(c: typeof T.era.roman): EraMatSet {
  const marbleTex = loadMarbleTextures([5, 5]);
  const travertineTex = loadTravertineTextures([4, 4]);
  const terracottaTex = loadTerracottaTileTextures([3, 3]);
  const floorTex = loadFloorTileTextures([4, 4]);
  const woodTex = loadDarkWoodTextures([2, 3]);
  const wallTex = loadPlasterWallTextures([3, 3]);

  const texSets = [marbleTex, travertineTex, terracottaTex, floorTex, woodTex, wallTex];

  return {
    wall: new THREE.MeshStandardMaterial({
      color: c.primary, roughness: 0.7, envMapIntensity: 0.5,
      map: travertineTex.map, normalMap: travertineTex.normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughnessMap: travertineTex.roughnessMap,
    }),
    floor: new THREE.MeshPhysicalMaterial({
      color: c.marble, roughness: 0.08, metalness: 0.05, envMapIntensity: 1.2,
      map: marbleTex.map, normalMap: marbleTex.normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughnessMap: marbleTex.roughnessMap, aoMap: marbleTex.aoMap, aoMapIntensity: 0.8,
      clearcoat: 0.4, clearcoatRoughness: 0.1, reflectivity: 0.8,
    }),
    column: new THREE.MeshStandardMaterial({
      color: "#F0E8DC", roughness: 0.2, envMapIntensity: 0.9,
      normalMap: marbleTex.normalMap, normalScale: new THREE.Vector2(0.3, 0.3),
    }),
    ceiling: new THREE.MeshStandardMaterial({
      color: "#F5F0E8", roughness: 0.85,
      normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(0.15, 0.15),
    }),
    door: new THREE.MeshStandardMaterial({
      color: "#8B5E3C", roughness: 0.4,
      map: woodTex.map, normalMap: woodTex.normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: woodTex.roughnessMap, aoMap: woodTex.aoMap, aoMapIntensity: 0.6,
      emissive: "#5A3E28", emissiveIntensity: 0.25,
    }),
    doorFrame: new THREE.MeshPhysicalMaterial({
      color: "#E8C84A", roughness: 0.1, metalness: 0.95, envMapIntensity: 1.8,
      emissive: "#E8C84A", emissiveIntensity: 0.25,
      clearcoat: 0.4, clearcoatRoughness: 0.05,
    }),
    trim: new THREE.MeshStandardMaterial({
      color: c.accent, roughness: 0.5, metalness: 0.1,
    }),
    gold: new THREE.MeshPhysicalMaterial({
      color: "#D4AF37", roughness: 0.15, metalness: 0.95, envMapIntensity: 1.5,
      emissive: "#D4AF37", emissiveIntensity: 0.15,
      clearcoat: 0.3, clearcoatRoughness: 0.1,
    }),
    marble: new THREE.MeshPhysicalMaterial({
      color: c.marble, roughness: 0.12, envMapIntensity: 1.0,
      map: marbleTex.map, normalMap: marbleTex.normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: marbleTex.roughnessMap, aoMap: marbleTex.aoMap, aoMapIntensity: 0.8,
      clearcoat: 0.3, clearcoatRoughness: 0.15, reflectivity: 0.7,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: c.secondary, roughness: 0.6,
      map: terracottaTex.map, normalMap: terracottaTex.normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
    }),
    dome: new THREE.MeshStandardMaterial({
      color: "#F5F0E8", roughness: 0.15, side: THREE.BackSide,
      normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(0.2, 0.2),
    }),
    bust: new THREE.MeshStandardMaterial({
      color: "#E8E0D4", roughness: 0.35, envMapIntensity: 0.7,
      normalMap: marbleTex.normalMap, normalScale: new THREE.Vector2(0.15, 0.15),
    }),
    bronze: new THREE.MeshPhysicalMaterial({
      color: c.bronze, roughness: 0.25, metalness: 0.8, envMapIntensity: 1.1,
      clearcoat: 0.2, clearcoatRoughness: 0.3,
    }),
    inlay: new THREE.MeshStandardMaterial({
      color: c.primary, roughness: 0.65,
      map: travertineTex.map, normalMap: travertineTex.normalMap,
      normalScale: new THREE.Vector2(0.25, 0.25),
    }),
    wainscot: new THREE.MeshStandardMaterial({
      color: "#D4C5A9", roughness: 0.6,
      normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(0.2, 0.2),
    }),
    texSets,
  };
}

function createRenaissanceMaterials(c: typeof T.era.renaissance): EraMatSet {
  const marbleTex = loadMarbleTextures([5, 5]);
  const sandstoneTex = loadSandstoneTextures([4, 4]);
  const plasterTex = loadOrnatePlasterTextures([3, 3]);
  const floorTex = loadFlorentineTileTextures([4, 4]);
  const walnutTex = loadWalnutWoodTextures([2, 3]);
  const wallTex = loadPlasterWallTextures([3, 3]);

  const texSets = [marbleTex, sandstoneTex, plasterTex, floorTex, walnutTex, wallTex];

  return {
    wall: new THREE.MeshStandardMaterial({
      color: c.secondary, roughness: 0.75, envMapIntensity: 0.5,
      map: plasterTex.map, normalMap: plasterTex.normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughnessMap: plasterTex.roughnessMap,
    }),
    floor: new THREE.MeshPhysicalMaterial({
      color: "#E0D8C8", roughness: 0.1, metalness: 0.03, envMapIntensity: 1.0,
      map: floorTex.map, normalMap: floorTex.normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughnessMap: floorTex.roughnessMap, aoMap: floorTex.aoMap, aoMapIntensity: 0.7,
      clearcoat: 0.3, clearcoatRoughness: 0.15,
    }),
    column: new THREE.MeshStandardMaterial({
      color: c.primary, roughness: 0.3, envMapIntensity: 0.8,
      map: sandstoneTex.map, normalMap: sandstoneTex.normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughnessMap: sandstoneTex.roughnessMap,
    }),
    ceiling: new THREE.MeshStandardMaterial({
      color: "#F0EAE0", roughness: 0.8,
      normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(0.15, 0.15),
    }),
    door: new THREE.MeshStandardMaterial({
      color: "#6A4E3A", roughness: 0.35,
      map: walnutTex.map, normalMap: walnutTex.normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: walnutTex.roughnessMap, aoMap: walnutTex.aoMap, aoMapIntensity: 0.6,
      emissive: "#4A3828", emissiveIntensity: 0.2,
    }),
    doorFrame: new THREE.MeshPhysicalMaterial({
      color: c.primary, roughness: 0.25, metalness: 0.05, envMapIntensity: 0.9,
      map: sandstoneTex.map, normalMap: sandstoneTex.normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
    }),
    trim: new THREE.MeshStandardMaterial({
      color: c.primary, roughness: 0.4,
      map: sandstoneTex.map, normalMap: sandstoneTex.normalMap,
      normalScale: new THREE.Vector2(0.2, 0.2),
    }),
    gold: new THREE.MeshPhysicalMaterial({
      color: c.accent, roughness: 0.12, metalness: 0.95, envMapIntensity: 1.6,
      emissive: c.accent, emissiveIntensity: 0.15,
      clearcoat: 0.35, clearcoatRoughness: 0.08,
    }),
    marble: new THREE.MeshPhysicalMaterial({
      color: c.marble, roughness: 0.12, envMapIntensity: 1.0,
      map: marbleTex.map, normalMap: marbleTex.normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: marbleTex.roughnessMap, aoMap: marbleTex.aoMap, aoMapIntensity: 0.8,
      clearcoat: 0.3, clearcoatRoughness: 0.15, reflectivity: 0.7,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: c.fresco, roughness: 0.5,
      normalMap: plasterTex.normalMap, normalScale: new THREE.Vector2(0.2, 0.2),
    }),
    dome: new THREE.MeshStandardMaterial({
      color: "#F0EAE0", roughness: 0.2, side: THREE.BackSide,
      normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(0.2, 0.2),
    }),
    bust: new THREE.MeshStandardMaterial({
      color: "#7A6850", roughness: 0.3, metalness: 0.6, envMapIntensity: 0.8,
    }),
    bronze: new THREE.MeshPhysicalMaterial({
      color: c.bronze, roughness: 0.2, metalness: 0.85, envMapIntensity: 1.2,
      clearcoat: 0.25, clearcoatRoughness: 0.25,
    }),
    inlay: new THREE.MeshStandardMaterial({
      color: c.primary, roughness: 0.5,
      map: sandstoneTex.map, normalMap: sandstoneTex.normalMap,
      normalScale: new THREE.Vector2(0.25, 0.25),
    }),
    wainscot: new THREE.MeshStandardMaterial({
      color: "#6A4E3A", roughness: 0.4,
      map: walnutTex.map, normalMap: walnutTex.normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughnessMap: walnutTex.roughnessMap,
    }),
    texSets,
  };
}

export function disposeEraMaterials(mats: EraMatSet) {
  for (const set of mats.texSets) disposePBRSet(set);
  for (const key of Object.keys(mats) as (keyof EraMatSet)[]) {
    if (key === "texSets") continue;
    const mat = mats[key];
    if (mat && typeof mat === "object" && "dispose" in mat) {
      (mat as THREE.Material).dispose();
    }
  }
}
