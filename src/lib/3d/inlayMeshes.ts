import * as THREE from "three";
import { mk } from "./meshHelpers";
import type { EraMatSet, StyleEra } from "./eraMaterials";

/**
 * Creates a locked wing inlay panel — a decorative stone panel with an arch outline
 * and a circular seal element. Used in the entrance hall between wing doors.
 */
export function createWingInlay(era: StyleEra, mats: EraMatSet): THREE.Group {
  const group = new THREE.Group();
  group.userData.isInlay = true;

  // Stone panel (recessed)
  const panelW = 2.2, panelH = 4.0, panelD = 0.15;
  const panel = mk(new THREE.BoxGeometry(panelW, panelH, panelD), mats.inlay, 0, panelH / 2, 0);
  panel.castShadow = true;
  group.add(panel);

  // Arch outline at top
  const archGeo = new THREE.TorusGeometry(0.8, 0.06, 8, 16, Math.PI);
  const arch = new THREE.Mesh(archGeo, mats.trim);
  arch.position.set(0, panelH - 0.3, panelD / 2 + 0.01);
  group.add(arch);

  // Vertical side borders
  for (const side of [-1, 1]) {
    const border = mk(new THREE.BoxGeometry(0.08, panelH - 0.6, 0.04), mats.trim,
      side * (panelW / 2 - 0.04), panelH / 2, panelD / 2 + 0.01);
    group.add(border);
  }

  // Bottom border
  const bottomBorder = mk(new THREE.BoxGeometry(panelW - 0.08, 0.08, 0.04), mats.trim,
    0, 0.3, panelD / 2 + 0.01);
  group.add(bottomBorder);

  // Circular seal element (lock icon)
  const sealGeo = new THREE.CircleGeometry(0.35, 24);
  const sealMat = era === "roman" ? mats.bronze : mats.gold;
  const seal = new THREE.Mesh(sealGeo, sealMat);
  seal.position.set(0, panelH * 0.45, panelD / 2 + 0.02);
  group.add(seal);

  // Lock keyhole shape on seal
  const keyholeBody = mk(new THREE.CircleGeometry(0.08, 12), mats.inlay,
    0, panelH * 0.45 + 0.03, panelD / 2 + 0.03);
  group.add(keyholeBody);
  const keyholeSlot = mk(new THREE.BoxGeometry(0.05, 0.12, 0.01), mats.inlay,
    0, panelH * 0.45 - 0.06, panelD / 2 + 0.03);
  group.add(keyholeSlot);

  return group;
}

/**
 * Creates a smaller locked room inlay panel for corridors.
 */
export function createRoomInlay(era: StyleEra, mats: EraMatSet): THREE.Group {
  const group = new THREE.Group();
  group.userData.isInlay = true;

  const panelW = 1.4, panelH = 2.5, panelD = 0.12;
  const panel = mk(new THREE.BoxGeometry(panelW, panelH, panelD), mats.inlay, 0, panelH / 2, 0);
  panel.castShadow = true;
  group.add(panel);

  // Small arch
  const archGeo = new THREE.TorusGeometry(0.5, 0.04, 8, 12, Math.PI);
  const arch = new THREE.Mesh(archGeo, mats.trim);
  arch.position.set(0, panelH - 0.2, panelD / 2 + 0.01);
  group.add(arch);

  // Seal
  const sealGeo = new THREE.CircleGeometry(0.22, 20);
  const sealMat = era === "roman" ? mats.bronze : mats.gold;
  const seal = new THREE.Mesh(sealGeo, sealMat);
  seal.position.set(0, panelH * 0.45, panelD / 2 + 0.02);
  group.add(seal);

  return group;
}
