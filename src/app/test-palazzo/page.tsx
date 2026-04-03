"use client";

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const MODELS = [
  { name: "Architectural Facade", file: "architectural-facade-web.glb" },
  { name: "Classical Temple", file: "classical-temple-web.glb" },
  { name: "Classical Villa", file: "classical-villa-web.glb" },
  { name: "Courtyard Garden", file: "courtyard-garden-web.glb" },
  { name: "Stone Arch Ruin", file: "stone-arch-ruin-web.glb" },
  { name: "UUID Model", file: "uuid-model-web.glb" },
];

export default function TestPalazzo() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    currentModel: THREE.Group | null;
    frame: number;
  } | null>(null);
  const [activeModel, setActiveModel] = useState(0);
  const [status, setStatus] = useState("Initializing...");

  // Setup scene once
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const w = el.clientWidth, h = el.clientHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#B8D4E3");
    scene.fog = new THREE.FogExp2("#B8D4E3", 0.003);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(30, 20, 40);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 5, 0);

    // Lighting — warm Tuscan golden hour
    const ambient = new THREE.HemisphereLight("#FFE8C0", "#4A6741", 0.8);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight("#FFD4A0", 3);
    sun.position.set(25, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 150;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    scene.add(sun);

    const fill = new THREE.DirectionalLight("#8CB4D0", 0.5);
    fill.position.set(-15, 10, -20);
    scene.add(fill);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.MeshStandardMaterial({
      color: "#8B9A6B",
      roughness: 0.95,
      metalness: 0,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid helper for scale reference
    const grid = new THREE.GridHelper(100, 50, "#6B7A5B", "#6B7A5B");
    grid.position.y = 0.01;
    (grid.material as THREE.Material).opacity = 0.15;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    // Animate
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const nw = el.clientWidth, nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    sceneRef.current = { scene, camera, renderer, controls, currentModel: null, frame };

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, []);

  // Load model when activeModel changes
  useEffect(() => {
    const ctx = sceneRef.current;
    if (!ctx) return;

    // Remove previous model
    if (ctx.currentModel) {
      ctx.scene.remove(ctx.currentModel);
      ctx.currentModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      ctx.currentModel = null;
    }

    const modelInfo = MODELS[activeModel];
    setStatus(`Loading ${modelInfo.name}...`);

    const loader = new GLTFLoader();
    loader.load(
      `/models/roman/${modelInfo.file}`,
      (gltf) => {
        if (!sceneRef.current) return;
        const model = gltf.scene;

        // Auto-scale: fit model to ~30 unit width
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 30 / maxDim;
        model.scale.setScalar(scale);

        // Re-center on ground
        const scaledBox = new THREE.Box3().setFromObject(model);
        const center = scaledBox.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= scaledBox.min.y; // sit on ground

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        ctx.scene.add(model);
        ctx.currentModel = model;

        // Reset camera to frame the model
        const finalBox = new THREE.Box3().setFromObject(model);
        const finalSize = finalBox.getSize(new THREE.Vector3());
        const finalCenter = finalBox.getCenter(new THREE.Vector3());
        ctx.controls.target.copy(finalCenter);
        ctx.camera.position.set(
          finalCenter.x + finalSize.x * 1.2,
          finalCenter.y + finalSize.y * 0.8,
          finalCenter.z + finalSize.z * 1.2
        );

        setStatus(`${modelInfo.name} — ${(finalSize.x).toFixed(1)} x ${(finalSize.y).toFixed(1)} x ${(finalSize.z).toFixed(1)} units`);
      },
      (progress) => {
        if (progress.total) {
          setStatus(`Loading ${modelInfo.name}... ${Math.round((progress.loaded / progress.total) * 100)}%`);
        }
      },
      (err) => {
        setStatus(`FAILED to load ${modelInfo.name}: ${err}`);
        console.error(err);
      }
    );
  }, [activeModel]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#000" }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%", position: "absolute" }} />

      {/* Controls overlay */}
      <div style={{
        position: "absolute", top: "1rem", left: "1rem", right: "1rem",
        display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center",
        zIndex: 10,
      }}>
        {MODELS.map((m, i) => (
          <button
            key={m.file}
            onClick={() => setActiveModel(i)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: i === activeModel ? "rgba(193,127,89,0.9)" : "rgba(0,0,0,0.6)",
              color: "#fff",
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "0.875rem",
              fontWeight: i === activeModel ? 700 : 400,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              transition: "all 0.2s",
            }}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Status bar */}
      <div style={{
        position: "absolute", bottom: "1rem", left: "1rem",
        fontFamily: "monospace", fontSize: "0.8125rem", color: "#fff",
        background: "rgba(0,0,0,0.6)", padding: "0.5rem 1rem",
        borderRadius: "0.5rem", zIndex: 10, backdropFilter: "blur(8px)",
      }}>
        {status} | Scroll to zoom, drag to orbit
      </div>
    </div>
  );
}
