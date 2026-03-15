"use client";
import { useRef, useEffect } from "react";
import * as THREE from "three";

/**
 * TutorialSpirit — A glowing ethereal orb rendered into an existing Three.js scene.
 * Call addToScene() to inject the spirit, animate() each frame, and removeFromScene() to clean up.
 */

export interface SpiritHandle {
  group: THREE.Group;
  animate: (t: number) => void;
  setTarget: (x: number, y: number, z: number) => void;
  setVisible: (v: boolean) => void;
}

export function createSpirit(): SpiritHandle {
  const group = new THREE.Group();
  group.visible = false;

  // Core orb — warm golden
  const coreGeo = new THREE.SphereGeometry(0.15, 16, 16);
  const coreMat = new THREE.MeshBasicMaterial({
    color: "#FFEEBB",
    transparent: true,
    opacity: 0.95,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // Inner glow
  const glowGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: "#FFD080",
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  group.add(glow);

  // Outer halo
  const haloGeo = new THREE.SphereGeometry(0.5, 16, 16);
  const haloMat = new THREE.MeshBasicMaterial({
    color: "#FFE0A0",
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  group.add(halo);

  // Particle ring (tiny orbiting sparks)
  const particleCount = 20;
  const particleGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const a = (i / particleCount) * Math.PI * 2;
    pPos[i * 3] = Math.cos(a) * 0.35;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
    pPos[i * 3 + 2] = Math.sin(a) * 0.35;
  }
  particleGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const particleMat = new THREE.PointsMaterial({
    color: "#FFE8B0",
    size: 0.04,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  group.add(particles);

  // Point light for scene illumination
  const light = new THREE.PointLight("#FFE0A0", 0.6, 4);
  group.add(light);

  // Target position for smooth movement
  const target = new THREE.Vector3(0, 2, 0);

  return {
    group,
    animate: (t: number) => {
      if (!group.visible) return;
      // Smooth follow
      group.position.lerp(target, 0.03);
      // Gentle bob
      core.position.y = Math.sin(t * 2) * 0.06;
      glow.position.y = core.position.y;
      // Pulse
      const pulse = 0.95 + Math.sin(t * 3) * 0.05;
      glow.scale.setScalar(pulse);
      halo.scale.setScalar(0.9 + Math.sin(t * 1.5) * 0.1);
      glowMat.opacity = 0.25 + Math.sin(t * 2.5) * 0.08;
      // Rotate particles
      particles.rotation.y = t * 0.5;
      const pp = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        pp[i * 3 + 1] = Math.sin(t * 1.5 + i * 0.8) * 0.15;
      }
      particleGeo.attributes.position.needsUpdate = true;
      // Light pulse
      light.intensity = 0.5 + Math.sin(t * 2) * 0.15;
    },
    setTarget: (x, y, z) => {
      target.set(x, y, z);
    },
    setVisible: (v) => {
      group.visible = v;
    },
  };
}
