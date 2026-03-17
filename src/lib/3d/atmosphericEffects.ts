import * as THREE from "three";

/**
 * Atmospheric effects: dust particles, enhanced fog, volumetric light beams.
 */

// ════════════════════════════════════════════
// FLOATING DUST MOTES
// ════════════════════════════════════════════

export interface DustSystem {
  points: THREE.Points;
  update: (time: number, dt: number) => void;
  dispose: () => void;
}

export function createDustParticles(options: {
  count?: number;
  bounds?: { x: number; y: number; z: number }; // half-extents
  center?: THREE.Vector3;
  color?: string;
  size?: number;
  opacity?: number;
  speed?: number;
} = {}): DustSystem {
  const {
    count = 120,
    bounds = { x: 6, y: 4, z: 6 },
    center = new THREE.Vector3(0, 2, 0),
    color = "#FFF8E0",
    size = 0.03,
    opacity = 0.35,
    speed = 0.15,
  } = options;

  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * bounds.x * 2 + center.x;
    positions[i * 3 + 1] = Math.random() * bounds.y * 2 + center.y - bounds.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * bounds.z * 2 + center.z;

    velocities[i * 3] = (Math.random() - 0.5) * speed;
    velocities[i * 3 + 1] = Math.random() * speed * 0.5 + speed * 0.1; // gentle upward drift
    velocities[i * 3 + 2] = (Math.random() - 0.5) * speed;

    phases[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);

  const update = (time: number, _dt: number) => {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = phases[i];

      // Gentle floating motion with individual phase offsets
      arr[i3] += Math.sin(time * 0.3 + phase) * 0.002;
      arr[i3 + 1] += velocities[i3 + 1] * 0.01 + Math.sin(time * 0.5 + phase * 1.7) * 0.001;
      arr[i3 + 2] += Math.cos(time * 0.25 + phase * 0.8) * 0.002;

      // Wrap around bounds
      if (arr[i3] > center.x + bounds.x) arr[i3] = center.x - bounds.x;
      if (arr[i3] < center.x - bounds.x) arr[i3] = center.x + bounds.x;
      if (arr[i3 + 1] > center.y + bounds.y) {
        arr[i3 + 1] = center.y - bounds.y;
        arr[i3] = (Math.random() - 0.5) * bounds.x * 2 + center.x;
        arr[i3 + 2] = (Math.random() - 0.5) * bounds.z * 2 + center.z;
      }
      if (arr[i3 + 2] > center.z + bounds.z) arr[i3 + 2] = center.z - bounds.z;
      if (arr[i3 + 2] < center.z - bounds.z) arr[i3 + 2] = center.z + bounds.z;
    }
    pos.needsUpdate = true;

    // Subtle pulsing opacity
    material.opacity = opacity * (0.85 + Math.sin(time * 0.8) * 0.15);
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return { points, update, dispose };
}

// ════════════════════════════════════════════
// VOLUMETRIC LIGHT BEAMS (simple cone approach)
// ════════════════════════════════════════════

export interface LightBeam {
  mesh: THREE.Mesh;
  update: (time: number) => void;
  dispose: () => void;
}

export function createLightBeam(options: {
  position?: THREE.Vector3;
  direction?: THREE.Vector3;
  length?: number;
  radius?: number;
  color?: string;
  opacity?: number;
} = {}): LightBeam {
  const {
    position = new THREE.Vector3(0, 6, 0),
    direction = new THREE.Vector3(0, -1, 0),
    length = 5,
    radius = 1.5,
    color = "#FFF8D0",
    opacity = 0.06,
  } = options;

  const geo = new THREE.CylinderGeometry(radius * 0.3, radius, length, 16, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(position);

  // Orient beam along direction
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, direction.normalize());
  mesh.quaternion.copy(quat);
  mesh.position.add(direction.multiplyScalar(length * 0.5));

  const update = (time: number) => {
    mat.opacity = opacity * (0.8 + Math.sin(time * 0.4) * 0.2);
  };

  const dispose = () => {
    geo.dispose();
    mat.dispose();
  };

  return { mesh, update, dispose };
}

// ════════════════════════════════════════════
// ENHANCED FOG SETUP
// ════════════════════════════════════════════

/** Configure atmospheric fog with color matching scene lighting */
export function setupAtmosphericFog(
  scene: THREE.Scene,
  type: "interior" | "corridor" | "exterior",
  options: {
    color?: string;
    density?: number;
    near?: number;
    far?: number;
  } = {}
): void {
  if (type === "exterior") {
    scene.fog = new THREE.FogExp2(
      options.color || "#C8B8A0",
      options.density || 0.0018
    );
  } else if (type === "corridor") {
    scene.fog = new THREE.FogExp2(
      options.color || "#E8DDD0",
      options.density || 0.015
    );
  } else {
    // Interior — subtle linear fog for depth
    scene.fog = new THREE.Fog(
      options.color || "#D8CFC0",
      options.near || 2,
      options.far || 25
    );
  }
}
