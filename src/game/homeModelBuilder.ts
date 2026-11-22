import * as THREE from "three";
import { HomeUpgradeId } from "../types/game";
import { ProceduralTextureSet } from "./textures";

export function createPlayerHomeCompoundMesh(
  textures: ProceduralTextureSet,
  upgrades?: Partial<Record<HomeUpgradeId, number>>
): THREE.Group {
  const root = new THREE.Group();
  // Grounded at y = 0. Total plot footprint: width 15m (x: -7.5..7.5), depth 12m (z: -6..6)
  // World center: (20, 0, 81) -> Gate faces South toward Changli Residential Ave (z = 96).

  const plasterWallMat = new THREE.MeshStandardMaterial({
    map: textures.earthPlaster,
    color: "#f6efe2",
    roughness: 0.88,
  });
  const compoundWallMat = new THREE.MeshStandardMaterial({
    map: textures.paverBrick,
    color: "#e2cfb7",
    roughness: 0.9,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: "#0f766e",
    roughness: 0.62,
  });
  const warmTimberMat = new THREE.MeshStandardMaterial({
    color: "#6b3f23",
    roughness: 0.72,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: "#7f1d1d",
    roughness: 0.48,
    metalness: 0.25,
  });
  const gateSteelMat = new THREE.MeshStandardMaterial({
    color: "#1e293b",
    roughness: 0.42,
    metalness: 0.55,
  });
  const courtyardCementMat = new THREE.MeshStandardMaterial({
    map: textures.concreteWall,
    color: "#b7afa5",
    roughness: 0.92,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: "#bae6fd",
    roughness: 0.18,
    metalness: 0.25,
  });
  const blackPlasticMat = new THREE.MeshStandardMaterial({
    color: "#111827",
    roughness: 0.4,
    metalness: 0.15,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: "#cbd5e1",
    roughness: 0.25,
    metalness: 0.75,
  });
  const foliageMat = new THREE.MeshStandardMaterial({
    color: "#15803d",
    roughness: 0.8,
  });
  const terracottaMat = new THREE.MeshStandardMaterial({
    color: "#b45309",
    roughness: 0.78,
  });

  // 1. Compound concrete courtyard slab + driveway apron connecting gate south to Changli Ave sidewalk
  const yardSlab = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.1, 11.8), courtyardCementMat);
  yardSlab.position.set(0, 0.05, 0);
  yardSlab.receiveShadow = true;
  root.add(yardSlab);

  const drivewayApron = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 5.4), courtyardCementMat);
  drivewayApron.position.set(0, 0.04, 8.6);
  drivewayApron.receiveShadow = true;
  root.add(drivewayApron);

  // 2. Compound perimeter walls (with 3.6m open front entrance gate on South wall at z = +5.8)
  const addWall = (x: number, z: number, w: number, h: number, d: number) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), compoundWallMat);
    wall.position.set(x, h / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    root.add(wall);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.12, d + 0.08), trimMat);
    cap.position.set(x, h + 0.06, z);
    root.add(cap);
  };

  addWall(0, -5.85, 14.8, 2.35, 0.3);      // North back wall
  addWall(-7.35, 0, 0.3, 2.35, 11.8);      // West wall
  addWall(7.35, 0, 0.3, 2.35, 11.8);       // East wall
  addWall(-4.65, 5.85, 5.4, 2.2, 0.32);    // South-West front wall
  addWall(4.65, 5.85, 5.4, 2.2, 0.32);     // South-East front wall

  // Gate Pillars + Open Steel Leaves
  for (const gx of [-1.95, 1.95]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.48, 2.65, 0.48), plasterWallMat);
    pillar.position.set(gx, 1.325, 5.85);
    pillar.castShadow = true;
    root.add(pillar);

    const lantern = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.24, 0.24),
      new THREE.MeshBasicMaterial({ color: "#fde047" })
    );
    lantern.position.set(gx, 2.75, 5.85);
    root.add(lantern);

    // Open inward-swung gate door leaf
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.85, 1.55), gateSteelMat);
    leaf.position.set(gx < 0 ? gx + 0.25 : gx - 0.25, 1.0, 5.05);
    root.add(leaf);
  }

  // ECG Electricity Meter Box on right gate wall
  const ecgBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.2), chromeMat);
  ecgBox.position.set(2.9, 1.45, 6.06);
  root.add(ecgBox);
  const ecgDisplay = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.2, 0.04),
    new THREE.MeshBasicMaterial({ color: "#10b981" })
  );
  ecgDisplay.position.set(2.9, 1.56, 6.16);
  root.add(ecgDisplay);

  // Overhead Gate Welcome Signboard ("YINA / HOME")
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512;
  signCanvas.height = 128;
  const ctx = signCanvas.getContext("2d")!;
  ctx.fillStyle = "#0f766e";
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CHANGLI COMPOUND HOME", 256, 56);
  ctx.fillStyle = "#fde68a";
  ctx.font = "24px sans-serif";
  ctx.fillText("N'YIŊA · PERSONAL RESIDENCE", 256, 98);
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const signMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.65, 0.14),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signMesh.position.set(0, 2.75, 5.9);
  root.add(signMesh);

  // 3. Main Residential Building (rear/north half of compound: x: -5.4..5.4, z: -5.2..0.6)
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(10.8, 3.3, 5.6), plasterWallMat);
  mainBody.position.set(0, 1.7, -2.35);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  root.add(mainBody);

  // Verandah porch apron & supporting columns
  const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.22, 1.7), courtyardCementMat);
  porchFloor.position.set(0, 0.11, 1.25);
  root.add(porchFloor);

  for (const px of [-5.0, -1.8, 1.8, 5.0]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.1, 10), plasterWallMat);
    col.position.set(px, 1.65, 1.9);
    col.castShadow = true;
    root.add(col);
  }

  // Pitched Corrugated Zinc Hip-Gable Roof covering house + verandah
  const roofBase = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.22, 7.8), roofMat);
  roofBase.position.set(0, 3.45, -1.5);
  roofBase.castShadow = true;
  root.add(roofBase);

  const roofSlopeF = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.14, 4.3), roofMat);
  roofSlopeF.position.set(0, 4.18, 0.42);
  roofSlopeF.rotation.x = 0.34;
  roofSlopeF.castShadow = true;
  root.add(roofSlopeF);

  const roofSlopeB = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.14, 4.3), roofMat);
  roofSlopeB.position.set(0, 4.18, -3.42);
  roofSlopeB.rotation.x = -0.34;
  roofSlopeB.castShadow = true;
  root.add(roofSlopeB);

  // Rooftop Solar Panels (shown strongly if upgraded, or subtle collector)
  const solarCount = (upgrades?.solar_power ?? 1) >= 2 ? 3 : 1;
  const solarMat = new THREE.MeshStandardMaterial({ color: "#1e3a8a", roughness: 0.2, metalness: 0.6 });
  for (let i = 0; i < solarCount; i++) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 1.05), solarMat);
    panel.position.set(-2.2 + i * 2.2, 4.55, 0.25);
    panel.rotation.x = 0.34;
    root.add(panel);
  }

  // Front House Timber Entry Door & Windows
  const frontDoor = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.25, 0.14), warmTimberMat);
  frontDoor.position.set(0, 1.25, 0.48);
  root.add(frontDoor);

  for (const wx of [-3.4, 3.4]) {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.15, 0.16), warmTimberMat);
    winFrame.position.set(wx, 1.75, 0.47);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.94, 0.18), glassMat);
    winGlass.position.set(wx, 1.75, 0.48);
    root.add(winFrame, winGlass);
  }

  // 4. Elevated Black Polytank Water Tower (East Courtyard)
  const towerFrame = new THREE.Group();
  towerFrame.position.set(5.6, 0, -2.2);
  for (const [lx, lz] of [[-0.65, -0.65], [0.65, -0.65], [-0.65, 0.65], [0.65, 0.65]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.1), gateSteelMat);
    leg.position.set(lx, 1.1, lz);
    towerFrame.add(leg);
  }
  const tankPlat = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.12, 1.55), gateSteelMat);
  tankPlat.position.set(0, 2.2, 0);
  const polytank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.6, 16), blackPlasticMat);
  polytank.position.set(0, 3.06, 0);
  polytank.castShadow = true;
  const polytankLid = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.14, 12), trimMat);
  polytankLid.position.set(0, 3.9, 0);
  towerFrame.add(tankPlat, polytank, polytankLid);
  root.add(towerFrame);

  // 5. Outdoor Courtyard Laundry Tub + Clothesline Poles (West Courtyard)
  const washTub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.45, 14), trimMat);
  washTub.position.set(-5.2, 0.3, 3.4);
  root.add(washTub);

  const standP1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.05, 8), gateSteelMat);
  standP1.position.set(-6.4, 1.025, 1.6);
  const standP2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.05, 8), gateSteelMat);
  standP2.position.set(-6.4, 1.025, 4.4);
  const lineWire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.8, 6), chromeMat);
  lineWire.rotation.x = Math.PI / 2;
  lineWire.position.set(-6.4, 1.9, 3.0);
  root.add(standP1, standP2, lineWire);

  // 6. Outdoor Bench & Verandah Potted Plants
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.46, 0.55), warmTimberMat);
  bench.position.set(4.5, 0.28, 3.6);
  bench.castShadow = true;
  root.add(bench);

  for (const [px, pz] of [[-2.5, 2.1], [2.5, 2.1], [-5.8, -0.5]]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.42, 10), terracottaMat);
    pot.position.set(px, 0.21, pz);
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42, 0), foliageMat);
    bush.position.set(px, 0.62, pz);
    root.add(pot, bush);
  }

  return root;
}
