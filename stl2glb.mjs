import fs from 'fs';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const stlPath = './aphrodite.stl';
const glbPath = './public/models/bust_base_female.glb';

const stlData = fs.readFileSync(stlPath);
const loader = new STLLoader();
const geometry = loader.parse(stlData.buffer);

geometry.computeBoundingBox();
const box = geometry.boundingBox;
const center = new THREE.Vector3();
box.getCenter(center);
geometry.translate(-center.x, -center.y, -center.z);

const size = new THREE.Vector3();
box.getSize(size);
const maxDim = Math.max(size.x, size.y, size.z);
const scale = 2.0 / maxDim;
geometry.scale(scale, scale, scale);

const material = new THREE.MeshStandardMaterial({ 
  color: 0xE8DCC8,
  roughness: 0.6,
  metalness: 0.1
});
const mesh = new THREE.Mesh(geometry, material);
mesh.name = 'bust_female';

const scene = new THREE.Scene();
scene.add(mesh);

const exporter = new GLTFExporter();
exporter.parse(scene, (result) => {
  const buffer = Buffer.from(result);
  fs.writeFileSync(glbPath, buffer);
  console.log(`Written GLB: ${glbPath} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
}, (error) => {
  console.error('Export error:', error);
  process.exit(1);
}, { binary: true });
