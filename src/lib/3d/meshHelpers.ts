import * as THREE from "three";

export function mk(geo: THREE.BufferGeometry, mat: THREE.Material, x?: number, y?: number, z?: number) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function mkFloor(geoW: number, geoL: number, mat: THREE.Material, x?: number, y?: number, z?: number) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(geoW, geoL), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x || 0, y || 0, z || 0);
  m.receiveShadow = true;
  return m;
}

export function mkCeil(geoW: number, geoL: number, mat: THREE.Material, x?: number, y?: number, z?: number) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(geoW, geoL), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(x || 0, y || 0, z || 0);
  return m;
}
