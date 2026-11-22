import * as THREE from "three";
import { HomeLaundryState, HomeState, InteriorRoomSpec } from "../types/game";
import type { InteriorBoxCollider } from "./interiorBuilder";
import { ProceduralTextureSet } from "./textures";

export interface HomeInteriorDynamicHandles {
  syncVisuals: (home?: HomeState | null, laundry?: HomeLaundryState | null) => void;
}

function addPartitionWall(
  group: THREE.Group,
  colliders: InteriorBoxCollider[],
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  disposables: Array<{ dispose: () => void }>
) {
  const geo = new THREE.BoxGeometry(w, h, d);
  disposables.push(geo);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  colliders.push({
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
    minY: 0,
    maxY: h,
  });
}

function addFurnitureBox(
  group: THREE.Group,
  colliders: InteriorBoxCollider[],
  x: number,
  yCenter: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  disposables: Array<{ dispose: () => void }>,
  collide = true
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  disposables.push(geo);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, yCenter, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  if (collide) {
    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      minY: 0,
      maxY: yCenter + h / 2,
    });
  }
  return mesh;
}

function makeZoneSign(
  title: string,
  subtitle: string,
  bgHex: string,
  disposables: Array<{ dispose: () => void }>
): THREE.Material {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, 504, 120);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, 256, 56);
  ctx.fillStyle = "#fde68a";
  ctx.font = "20px sans-serif";
  ctx.fillText(subtitle, 256, 94);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  disposables.push(tex, mat);
  return mat;
}

export function buildPlayerHomeInterior(
  spec: InteriorRoomSpec,
  group: THREE.Group,
  colliders: InteriorBoxCollider[],
  disposables: Array<{ dispose: () => void }>,
  textures: ProceduralTextureSet,
  addFanFn: (g: THREE.Group, x: number, y: number, z: number) => THREE.Group,
  animatedFans: THREE.Group[]
): HomeInteriorDynamicHandles {
  const h = spec.height;

  const plasterMat = new THREE.MeshStandardMaterial({
    map: textures.earthPlaster,
    color: "#f8f2e8",
    roughness: 0.86,
  });
  const tileMat = new THREE.MeshStandardMaterial({
    color: "#d1fae5",
    roughness: 0.35,
    metalness: 0.08,
  });
  const yardMat = new THREE.MeshStandardMaterial({
    map: textures.paverBrick,
    color: "#b4aaa0",
    roughness: 0.92,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: "#78350f", roughness: 0.72 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: "#451a03", roughness: 0.7 });
  const sofaMat = new THREE.MeshStandardMaterial({ color: "#0f766e", roughness: 0.78 });
  const sofaUpgradeMat = new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.68 });
  const rugMat = new THREE.MeshStandardMaterial({
    map: textures.batakariCloth,
    color: "#d97706",
    roughness: 0.9,
  });
  const ceramicMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.22 });
  const steelMat = new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.7, roughness: 0.3 });
  const screenMat = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.2, metalness: 0.4 });
  const bedLinenMat = new THREE.MeshStandardMaterial({ color: "#0284c7", roughness: 0.82 });
  const pillowMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.75 });
  const dirtMat = new THREE.MeshStandardMaterial({ color: "#78716c", roughness: 0.95 });
  const rubbishMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.65 });
  const laundryMatA = new THREE.MeshStandardMaterial({ color: "#0284c7", roughness: 0.75 });
  const laundryMatB = new THREE.MeshStandardMaterial({ color: "#f59e0b", roughness: 0.75 });
  const laundryMatC = new THREE.MeshStandardMaterial({ color: "#15803d", roughness: 0.75 });

  disposables.push(
    plasterMat,
    tileMat,
    yardMat,
    woodMat,
    darkWoodMat,
    sofaMat,
    sofaUpgradeMat,
    rugMat,
    ceramicMat,
    steelMat,
    screenMat,
    bedLinenMat,
    pillowMat,
    dirtMat,
    rubbishMat,
    laundryMatA,
    laundryMatB,
    laundryMatC
  );

  // Courtyard outdoor floor strip (z: 2.5..9) + Bathroom tiled floor (x: 1.4..10, z: -9..-3.2)
  const yardOverlayGeo = new THREE.PlaneGeometry(19.8, 6.4);
  disposables.push(yardOverlayGeo);
  const yardOverlay = new THREE.Mesh(yardOverlayGeo, yardMat);
  yardOverlay.rotation.x = -Math.PI / 2;
  yardOverlay.position.set(0, 0.015, 5.75);
  yardOverlay.receiveShadow = true;
  group.add(yardOverlay);

  const bathFloorGeo = new THREE.PlaneGeometry(8.5, 5.7);
  disposables.push(bathFloorGeo);
  const bathFloor = new THREE.Mesh(bathFloorGeo, tileMat);
  bathFloor.rotation.x = -Math.PI / 2;
  bathFloor.position.set(5.7, 0.015, -6.1);
  bathFloor.receiveShadow = true;
  group.add(bathFloor);

  // =========================================================================
  // INTERIOR PARTITION WALLS WITH WIDE 2.6m-2.8m DOORWAYS
  // =========================================================================
  // Front wall separating Courtyard (z > 2.5) from House interior (z < 2.5)
  // Doorway open at x: [-1.4 .. 1.4]
  addPartitionWall(group, colliders, -5.7, 2.5, 8.6, h, 0.24, plasterMat, disposables);
  addPartitionWall(group, colliders, 5.7, 2.5, 8.6, h, 0.24, plasterMat, disposables);

  // Center North-South divider at x = 1.4 between Living Room / Bedroom (West) & Kitchen / Bathroom (East)
  // Doorway open between Living Room and Kitchen at z: [-1.4 .. 1.4]
  addPartitionWall(group, colliders, 1.4, -6.1, 0.24, h, 5.8, plasterMat, disposables); // Full wall between Bedroom & Bath
  addPartitionWall(group, colliders, 1.4, -2.3, 0.24, h, 1.8, plasterMat, disposables); // Living-Kitchen North stub
  addPartitionWall(group, colliders, 1.4, 1.95, 0.24, h, 1.1, plasterMat, disposables); // Living-Kitchen South stub

  // Horizontal divider at z = -3.2 separating Living/Kitchen from Bedroom/Bath
  // Doorway into Bedroom at x: [-3.6 .. -1.0], Doorway into Bathroom at x: [3.4 .. 6.0]
  addPartitionWall(group, colliders, -6.8, -3.2, 6.4, h, 0.24, plasterMat, disposables);
  addPartitionWall(group, colliders, 0.2, -3.2, 2.4, h, 0.24, plasterMat, disposables);
  addPartitionWall(group, colliders, 2.4, -3.2, 2.0, h, 0.24, plasterMat, disposables);
  addPartitionWall(group, colliders, 8.0, -3.2, 4.0, h, 0.24, plasterMat, disposables);

  // Ceiling fans inside Living Room & Bedroom
  animatedFans.push(addFanFn(group, -4.6, h - 0.35, -0.5));
  animatedFans.push(addFanFn(group, -5.0, h - 0.35, -6.0));
  animatedFans.push(addFanFn(group, 5.6, h - 0.35, -0.4));

  // Room Plaques
  const roomSigns: Array<[string, string, number, number, number]> = [
    ["LIVING LOUNGE", "Zombu & Smart TV", -5.2, 2.35, 0],
    ["HOME KITCHEN", "Duɣibu Shee", 5.8, 2.35, 0],
    ["BEDROOM", "Gɔbu Shee", -5.4, -8.85, 0],
    ["BATHROOM", "Kɔm Suɣibu", 5.8, -8.85, 0],
  ];
  for (const [title, sub, sx, sz, srot] of roomSigns) {
    const signGeo = new THREE.BoxGeometry(2.4, 0.56, 0.08);
    disposables.push(signGeo);
    const signMesh = new THREE.Mesh(
      signGeo,
      makeZoneSign(title, sub, "#115e59", disposables)
    );
    signMesh.position.set(sx, 2.65, sz);
    signMesh.rotation.y = srot;
    group.add(signMesh);
  }

  // =========================================================================
  // 1. COURTYARD PATIO FURNITURE (z: 2.5..9)
  // =========================================================================
  // Polytank Water Drum (West Courtyard corner)
  const tankGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.5, 14);
  disposables.push(tankGeo);
  const tankMesh = new THREE.Mesh(tankGeo, rubbishMat);
  tankMesh.position.set(-8.6, 1.45, 4.2);
  const tankStand = addFurnitureBox(group, colliders, -8.6, 0.35, 4.2, 1.5, 0.7, 1.5, steelMat, disposables, true);
  tankStand.castShadow = true;
  group.add(tankMesh);

  // Laundry Wash Tub (-6.8, 5.2)
  addFurnitureBox(group, colliders, -6.8, 0.42, 5.2, 1.15, 0.84, 0.9, ceramicMat, disposables, true);

  // Clothesline frame (-3.8, 5.8)
  addFurnitureBox(group, colliders, -5.0, 1.0, 6.2, 0.12, 2.0, 0.12, steelMat, disposables, true);
  addFurnitureBox(group, colliders, -2.6, 1.0, 6.2, 0.12, 2.0, 0.12, steelMat, disposables, true);
  addFurnitureBox(group, colliders, -3.8, 1.9, 6.2, 2.4, 0.04, 0.04, steelMat, disposables, false);

  const clotheslineGarments: THREE.Mesh[] = [];
  const garColors = [laundryMatA, laundryMatB, laundryMatC];
  for (let i = 0; i < 3; i++) {
    const gm = addFurnitureBox(
      group,
      colliders,
      -4.5 + i * 0.7,
      1.52,
      6.2,
      0.46,
      0.66,
      0.06,
      garColors[i],
      disposables,
      false
    );
    gm.visible = false;
    clotheslineGarments.push(gm);
  }

  // Broom & Cleaning Rack (5.8, 4.4)
  addFurnitureBox(group, colliders, 5.8, 0.75, 3.3, 0.7, 1.5, 0.35, woodMat, disposables, true);

  // Rubbish Bin (8.2, 6.6)
  addFurnitureBox(group, colliders, 8.2, 0.42, 6.6, 0.65, 0.84, 0.65, steelMat, disposables, true);
  const rubbishBagMesh = addFurnitureBox(group, colliders, 7.6, 0.25, 6.6, 0.45, 0.5, 0.45, rubbishMat, disposables, false);

  // =========================================================================
  // 2. LIVING ROOM (x: -10..1.4, z: -3.2..2.5)
  // =========================================================================
  // Batakari Rug under lounge
  const rugGeo = new THREE.PlaneGeometry(4.4, 3.0);
  disposables.push(rugGeo);
  const rug = new THREE.Mesh(rugGeo, rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-5.0, 0.02, -0.4);
  group.add(rug);

  // Sofa & Coffee Table + TV Console
  const sofaBase = addFurnitureBox(group, colliders, -5.2, 0.4, 0.85, 3.1, 0.8, 1.0, sofaMat, disposables, true);
  addFurnitureBox(group, colliders, -5.2, 0.24, -0.5, 1.7, 0.48, 0.85, woodMat, disposables, true);
  // TV Stand & Flatscreen
  addFurnitureBox(group, colliders, -5.2, 0.35, -2.55, 2.4, 0.7, 0.55, darkWoodMat, disposables, true);
  const tvScreen = addFurnitureBox(group, colliders, -5.2, 1.32, -2.6, 1.75, 0.96, 0.1, screenMat, disposables, false);

  // Home Upgrades Ledger Desk (-8.8, -1.8)
  addFurnitureBox(group, colliders, -8.8, 0.45, -1.8, 1.2, 0.9, 1.6, woodMat, disposables, true);

  // =========================================================================
  // 3. KITCHEN (x: 1.4..10, z: -3.2..2.5)
  // =========================================================================
  // Fridge (3.6, -2.3)
  addFurnitureBox(group, colliders, 3.6, 0.98, -2.3, 1.1, 1.96, 0.9, steelMat, disposables, true);
  // Gas Cooker / Stove (6.8, -2.3)
  addFurnitureBox(group, colliders, 6.8, 0.46, -2.3, 1.5, 0.92, 0.88, ceramicMat, disposables, true);
  // Cooking pot on stove
  const potGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.24, 12);
  disposables.push(potGeo);
  const potMesh = new THREE.Mesh(potGeo, steelMat);
  potMesh.position.set(6.6, 1.04, -2.2);
  group.add(potMesh);

  // Kitchen Sink Counter (8.8, 0.4)
  addFurnitureBox(group, colliders, 8.8, 0.46, 0.4, 1.0, 0.92, 2.2, woodMat, disposables, true);
  const sinkBasin = addFurnitureBox(group, colliders, 8.75, 0.95, 0.4, 0.6, 0.08, 0.9, steelMat, disposables, false);
  sinkBasin.castShadow = false;
  // Dirty Dishes Stack on Sink (toggled dynamically)
  const dirtyDishesGroup = addFurnitureBox(
    group,
    colliders,
    8.75,
    1.08,
    0.4,
    0.42,
    0.26,
    0.42,
    ceramicMat,
    disposables,
    false
  );

  // =========================================================================
  // 4. BEDROOM (x: -10..1.4, z: -9..-3.2)
  // =========================================================================
  // Bed Frame, Mattress & Pillows (-7.2, -7.2)
  addFurnitureBox(group, colliders, -7.2, 0.28, -7.2, 2.4, 0.56, 2.5, darkWoodMat, disposables, true);
  const mattressMesh = addFurnitureBox(group, colliders, -7.2, 0.62, -7.2, 2.24, 0.24, 2.34, bedLinenMat, disposables, false);
  addFurnitureBox(group, colliders, -7.7, 0.8, -8.1, 0.72, 0.14, 0.44, pillowMat, disposables, false);
  addFurnitureBox(group, colliders, -6.7, 0.8, -8.1, 0.72, 0.14, 0.44, pillowMat, disposables, false);

  // Wardrobe Closet (-1.2, -7.8)
  addFurnitureBox(group, colliders, -1.2, 1.05, -7.8, 2.0, 2.1, 0.85, woodMat, disposables, true);

  // Nightstand & Phone Dock (-9.2, -4.6)
  addFurnitureBox(group, colliders, -9.2, 0.35, -4.6, 0.75, 0.7, 0.75, woodMat, disposables, true);

  // =========================================================================
  // 5. BATHROOM & TOILET (x: 1.4..10, z: -9..-3.2)
  // =========================================================================
  // Walk-in Shower Glass/Stall (8.4, -7.4)
  addFurnitureBox(group, colliders, 8.4, 0.08, -7.4, 2.0, 0.16, 2.0, ceramicMat, disposables, false);
  addFurnitureBox(group, colliders, 9.2, 1.4, -7.4, 0.14, 2.2, 0.14, steelMat, disposables, true);
  // Bathroom Sink & Wall Mirror (4.8, -8.4)
  addFurnitureBox(group, colliders, 4.8, 0.45, -8.4, 1.2, 0.9, 0.65, ceramicMat, disposables, true);
  const mirrorMat = new THREE.MeshStandardMaterial({ color: "#e0f2fe", metalness: 0.85, roughness: 0.08 });
  disposables.push(mirrorMat);
  addFurnitureBox(group, colliders, 4.8, 1.55, -8.72, 1.05, 0.95, 0.06, mirrorMat, disposables, false);
  // Toilet (8.8, -4.6)
  addFurnitureBox(group, colliders, 8.8, 0.34, -4.6, 0.7, 0.68, 0.85, ceramicMat, disposables, true);

  // =========================================================================
  // DYNAMIC DIRT / CLUTTER SPOTS (PER ZONE)
  // =========================================================================
  const dirtSpots: Array<{ room: keyof HomeState["roomDirt"]; mesh: THREE.Mesh }> = [];
  const dirtCoords: Array<[keyof HomeState["roomDirt"], number, number]> = [
    ["courtyard", 2.8, 5.2],
    ["livingRoom", -3.4, 0.3],
    ["kitchen", 5.8, -0.4],
    ["bedroom", -4.4, -6.2],
    ["bathroom", 6.2, -5.8],
  ];
  for (const [rm, dx, dz] of dirtCoords) {
    const discGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.03, 10);
    disposables.push(discGeo);
    const spot = new THREE.Mesh(discGeo, dirtMat);
    spot.position.set(dx, 0.025, dz);
    spot.visible = false;
    group.add(spot);
    dirtSpots.push({ room: rm, mesh: spot });
  }

  const syncVisuals = (home?: HomeState | null, laundry?: HomeLaundryState | null) => {
    if (home) {
      dirtyDishesGroup.visible = home.dirtyDishesCount > 0;
      rubbishBagMesh.visible = home.rubbishCount > 0;
      for (const spot of dirtSpots) {
        spot.mesh.visible = (home.roomDirt[spot.room] ?? 0) >= 25;
      }
      // Visual upgrade feedback: Sofa & TV upgrade tint + Bed tier mattress scale
      sofaBase.material = (home.upgrades.tv_entertainment ?? 1) >= 2 ? sofaUpgradeMat : sofaMat;
      tvScreen.visible = (home.upgrades.tv_entertainment ?? 1) >= 1;
      tvScreen.scale.setScalar((home.upgrades.tv_entertainment ?? 1) >= 2 ? 1.25 : 0.88);
      mattressMesh.scale.y = (home.upgrades.bed_tier ?? 1) >= 2 ? 1.35 : 1.0;
    }
    if (laundry) {
      const hanging = Math.min(3, laundry.dryingOnLineCount);
      for (let i = 0; i < clotheslineGarments.length; i++) {
        clotheslineGarments[i].visible = i < hanging;
      }
    }
  };

  return { syncVisuals };
}
