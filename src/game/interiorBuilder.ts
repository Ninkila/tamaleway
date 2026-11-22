import * as THREE from "three";
import { HomeLaundryState, HomeState, InteriorRoomSpec } from "../types/game";
import { buildPlayerHomeInterior } from "./homeInteriorBuilder";
import { CharacterRig, createCharacterRig } from "./models";
import { ProceduralTextureSet } from "./textures";

export interface InteriorBoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
}

export interface BuiltInteriorScene {
  group: THREE.Group;
  colliders: InteriorBoxCollider[];
  animatedFans: THREE.Group[];
  stationMarkers: Array<{ id: string; ring: THREE.Mesh }>;
  danceRigs: CharacterRig[];
  clubLights: THREE.PointLight[];
  syncHomeVisuals?: (home?: HomeState | null, laundry?: HomeLaundryState | null) => void;
  dispose: () => void;
}

function makeRoomSignTexture(title: string, subtitle: string, bg: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 120);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title.slice(0, 34), 256, 56);
  ctx.fillStyle = "#fde68a";
  ctx.font = "20px sans-serif";
  ctx.fillText(subtitle.slice(0, 42), 256, 94);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addDesk(
  group: THREE.Group,
  colliders: InteriorBoxCollider[],
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  baseMat: THREE.Material,
  topMat: THREE.Material
) {
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), baseMat);
  body.position.set(x, h / 2, z);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.08, d + 0.16), topMat);
  top.position.set(x, h + 0.04, z);
  group.add(top);

  colliders.push({
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
    minY: 0,
    maxY: h + 0.08,
  });
}

function addCeilingFan(group: THREE.Group, x: number, y: number, z: number): THREE.Group {
  const fan = new THREE.Group();
  fan.position.set(x, y, z);
  const metal = new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.5, roughness: 0.4 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), metal);
  stem.position.y = 0.17;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10), metal);
  fan.add(stem, hub);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.02, 0.14), metal);
    blade.rotation.y = (i * Math.PI * 2) / 3;
    blade.position.x = Math.cos(blade.rotation.y) * 0.52;
    blade.position.z = -Math.sin(blade.rotation.y) * 0.52;
    fan.add(blade);
  }
  group.add(fan);
  return fan;
}

function addInteriorAttendant(
  group: THREE.Group,
  x: number,
  z: number,
  rotY: number,
  primary: string,
  accent: string,
  headwear: "none" | "kufi" | "headwrap" | "braids",
  textures: ProceduralTextureSet,
  colliders?: InteriorBoxCollider[]
) {
  const rig = createCharacterRig(
    {
      outfit: "polo",
      headwear,
      primaryColor: primary,
      accentColor: accent,
      skinTone: "#62381f",
    },
    textures
  );
  rig.root.position.set(x, 0, z);
  rig.root.rotation.y = rotY;
  group.add(rig.root);
  if (colliders) {
    colliders.push({
      minX: x - 0.36,
      maxX: x + 0.36,
      minZ: z - 0.36,
      maxZ: z + 0.36,
      minY: 0,
      maxY: 1.75,
    });
  }
}

/**
 * Builds an isolated, fully enclosed walkable 3D room tailored specifically to a Tamale landmark's function.
 * Placed at world offset `originY` (e.g. y = 0 inside a dedicated interior chamber at x = 0, z = 0 offset or scene swap).
 */
export function buildPhysicalInteriorScene(
  spec: InteriorRoomSpec,
  textures: ProceduralTextureSet
): BuiltInteriorScene {
  const group = new THREE.Group();
  const colliders: InteriorBoxCollider[] = [];
  const animatedFans: THREE.Group[] = [];
  const stationMarkers: Array<{ id: string; ring: THREE.Mesh }> = [];
  const danceRigs: CharacterRig[] = [];
  const clubLights: THREE.PointLight[] = [];
  const disposables: Array<{ dispose: () => void }> = [];
  let syncHomeVisuals: ((home?: HomeState | null, laundry?: HomeLaundryState | null) => void) | undefined;

  const halfW = spec.width / 2;
  const halfD = spec.depth / 2;
  const h = spec.height;

  const floorMat = new THREE.MeshStandardMaterial({
    color: spec.floorColor,
    roughness: 0.78,
    metalness: 0.04,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: spec.wallColor,
    roughness: 0.85,
  });
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: spec.ceilingColor,
    roughness: 0.9,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: spec.accentColor,
    roughness: 0.55,
    metalness: 0.12,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: "#7c4a26", roughness: 0.75 });
  const darkTrimMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.55 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: "#bae6fd",
    transparent: true,
    opacity: 0.35,
    roughness: 0.12,
    metalness: 0.15,
  });

  // Floor & Ceiling
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(spec.width, spec.depth), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(spec.width, spec.depth), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = h;
  group.add(ceiling);

  // Enclosed Perimeter Walls
  const wallThick = 0.35;
  const northWall = new THREE.Mesh(new THREE.BoxGeometry(spec.width, h, wallThick), wallMat);
  northWall.position.set(0, h / 2, -halfD);
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(spec.width, h, wallThick), wallMat);
  southWall.position.set(0, h / 2, halfD);
  const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, spec.depth), wallMat);
  westWall.position.set(-halfW, h / 2, 0);
  const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, h, spec.depth), wallMat);
  eastWall.position.set(halfW, h / 2, 0);
  group.add(northWall, southWall, westWall, eastWall);

  // Interior Baseboards / Accent Stripe
  const baseboard = new THREE.Mesh(new THREE.BoxGeometry(spec.width - 0.4, 0.24, 0.12), accentMat);
  baseboard.position.set(0, 0.12, -halfD + 0.22);
  group.add(baseboard);

  // Interior Header Signage above North Wall
  const signTex = makeRoomSignTexture(spec.title, spec.dagbaniTitle, spec.accentColor);
  disposables.push(signTex);
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(7.5, spec.width * 0.55), 1.45),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signMesh.position.set(0, h - 1.0, -halfD + 0.24);
  group.add(signMesh);

  // Glowing Exit Doorway on South Wall
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.6, 0.25), darkTrimMat);
  doorFrame.position.set(0, 1.3, halfD - 0.16);
  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 2.4, 0.12),
    new THREE.MeshStandardMaterial({
      color: "#f59e0b",
      emissive: "#b45309",
      emissiveIntensity: 0.35,
      roughness: 0.45,
    })
  );
  doorPanel.position.set(0, 1.25, halfD - 0.18);
  group.add(doorFrame, doorPanel);

  // Dedicated Indoor Warm/Cool Lighting
  const hemi = new THREE.HemisphereLight(spec.ambientHex, "#44403c", 1.15);
  group.add(hemi);
  const mainLight = new THREE.PointLight("#fff7ed", 28, Math.max(spec.width, spec.depth) * 1.8, 1.4);
  mainLight.position.set(0, h - 0.55, 0);
  group.add(mainLight);
  const fillLight = new THREE.PointLight(spec.ambientHex, 14, 18, 1.5);
  fillLight.position.set(0, h - 0.8, -halfD * 0.45);
  group.add(fillLight);

  // Ceiling fan(s)
  if (spec.archetype !== "player_home_compound") {
    animatedFans.push(addCeilingFan(group, 0, h - 0.35, 0));
  }

  // Archetype-specific Physical Furniture, Props & Staff NPCs
  switch (spec.archetype) {
    case "bank": {
      addDesk(group, colliders, -2.5, -3.5, 4.2, 1.15, 1.0, accentMat, woodMat);
      addDesk(group, colliders, 2.8, -3.5, 4.2, 1.15, 1.0, accentMat, woodMat);
      // Glazed teller partitions
      const glass1 = new THREE.Mesh(new THREE.BoxGeometry(8.8, 1.1, 0.08), glassMat);
      glass1.position.set(0.15, 1.75, -3.5);
      group.add(glass1);
      // ATM Kiosk along East Wall
      addDesk(group, colliders, halfW - 1.1, 2.2, 1.1, 1.9, 1.2, darkTrimMat, accentMat);
      const atmScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.65, 0.48),
        new THREE.MeshBasicMaterial({ color: "#38bdf8" })
      );
      atmScreen.rotation.y = -Math.PI / 2;
      atmScreen.position.set(halfW - 1.67, 1.38, 2.2);
      group.add(atmScreen);
      // Waiting bench
      addDesk(group, colliders, -4.4, 1.8, 1.0, 0.55, 3.4, darkTrimMat, accentMat);
      addInteriorAttendant(group, -2.5, -4.6, 0, "#0369a1", "#f8fafc", "none", textures, colliders);
      addInteriorAttendant(group, 2.8, -4.6, 0, "#facc15", "#0f172a", "headwrap", textures, colliders);
      break;
    }

    case "momo_telecom": {
      const momoYellow = new THREE.MeshStandardMaterial({ color: "#facc15", roughness: 0.5 });
      addDesk(group, colliders, -2.0, -2.8, 3.6, 1.05, 0.9, momoYellow, darkTrimMat);
      addDesk(group, colliders, 2.5, -2.8, 3.6, 1.05, 0.9, accentMat, woodMat);
      // Tall cold-drink fridge
      addDesk(group, colliders, halfW - 1.0, -1.0, 1.0, 2.2, 1.5, darkTrimMat, glassMat);
      addInteriorAttendant(group, -2.0, -3.9, 0, "#facc15", "#1e293b", "braids", textures, colliders);
      addInteriorAttendant(group, 2.5, -3.9, 0, "#0284c7", "#ffffff", "none", textures, colliders);
      break;
    }

    case "restaurant":
    case "fast_food": {
      const counterMat = new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.4 });
      addDesk(group, colliders, -1.0, -3.4, 7.6, 1.08, 1.0, accentMat, counterMat);
      // Kitchen pots / warmers behind counter
      const steel = new THREE.MeshStandardMaterial({ color: "#cbd5e1", metalness: 0.65, roughness: 0.3 });
      for (const px of [-3.2, -1.4, 0.6]) {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.36, 12), steel);
        pot.position.set(px, 1.28, -3.4);
        group.add(pot);
      }
      // Dining tables with plates & chairs
      for (const [tx, tz] of [
        [-4.0, 0.2],
        [3.8, 0.2],
      ]) {
        addDesk(group, colliders, tx, tz, 1.9, 0.78, 1.4, woodMat, woodMat);
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.04, 10), counterMat);
        plate.position.set(tx - 0.35, 0.84, tz);
        group.add(plate);
      }
      addInteriorAttendant(group, -1.4, -4.5, 0, "#ea580c", "#fef3c7", "headwrap", textures, colliders);
      addInteriorAttendant(group, 1.4, -4.5, 0, "#f8fafc", "#dc2626", "none", textures, colliders);
      break;
    }

    case "supermarket": {
      const shelfMat = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.6 });
      const boxColors = ["#ef4444", "#eab308", "#16a34a", "#0284c7", "#f97316"];
      // Two stocked supermarket aisle racks
      for (const ax of [-4.2, 4.2]) {
        addDesk(group, colliders, ax, -0.6, 1.4, 1.9, 5.6, shelfMat, accentMat);
        for (let i = 0; i < 6; i++) {
          const itemMat = new THREE.MeshStandardMaterial({
            color: boxColors[i % boxColors.length],
            roughness: 0.65,
          });
          const item = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.42), itemMat);
          item.position.set(ax + (i % 2 === 0 ? -0.45 : 0.45), 1.45, -2.4 + i * 0.9);
          group.add(item);
        }
      }
      // Cold freezer wall at back
      addDesk(group, colliders, 0, -halfD + 1.1, 6.5, 2.2, 1.1, glassMat, darkTrimMat);
      // Checkout counter near exit
      addDesk(group, colliders, -2.4, 3.6, 3.2, 1.02, 0.9, accentMat, darkTrimMat);
      addInteriorAttendant(group, -2.4, 2.5, Math.PI, "#0284c7", "#ffffff", "braids", textures, colliders);
      break;
    }

    case "barber_salon": {
      const mirrorMat = new THREE.MeshStandardMaterial({
        color: "#e0f2fe",
        metalness: 0.88,
        roughness: 0.1,
      });
      for (const cx of [-2.4, 2.4]) {
        addDesk(group, colliders, cx, -2.2, 1.2, 0.95, 1.1, darkTrimMat, accentMat);
        const mirror = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 0.08), mirrorMat);
        mirror.position.set(cx, 1.75, -halfD + 0.25);
        group.add(mirror);
      }
      addInteriorAttendant(group, -2.4, -3.5, 0, "#7c3aed", "#f8fafc", "none", textures, colliders);
      break;
    }

    case "electronics": {
      const neonMat = new THREE.MeshStandardMaterial({
        color: "#38bdf8",
        emissive: "#0284c7",
        emissiveIntensity: 0.6,
      });
      addDesk(group, colliders, 0, -2.8, 6.4, 1.08, 1.0, darkTrimMat, glassMat);
      addDesk(group, colliders, -4.4, 0.2, 1.1, 1.5, 3.6, darkTrimMat, neonMat);
      // Solar panels display on east wall
      const solar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 2.6), darkTrimMat);
      solar.position.set(halfW - 0.25, 1.8, -1.0);
      group.add(solar);
      addInteriorAttendant(group, 0, -4.0, 0, "#0284c7", "#f8fafc", "kufi", textures, colliders);
      break;
    }

    case "mechanic": {
      const steel = new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.6, roughness: 0.4 });
      const tireMat = new THREE.MeshStandardMaterial({ color: "#18181b", roughness: 0.85 });
      // Hydraulic repair bench & oil drums
      addDesk(group, colliders, -2.2, -1.8, 3.2, 0.35, 2.2, steel, accentMat);
      addDesk(group, colliders, 4.0, -3.0, 3.4, 1.05, 1.0, accentMat, woodMat);
      for (let i = 0; i < 3; i++) {
        const tire = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.14, 8, 16), tireMat);
        tire.rotation.x = Math.PI / 2;
        tire.position.set(4.5, 0.16 + i * 0.26, 1.2);
        group.add(tire);
      }
      colliders.push({
        minX: 3.9,
        maxX: 5.1,
        minZ: 0.6,
        maxZ: 1.8,
        minY: 0,
        maxY: 1.0,
      });
      addInteriorAttendant(group, -2.2, -3.6, 0, "#dc2626", "#f8fafc", "kufi", textures, colliders);
      break;
    }

    case "hospital_clinic":
    case "pharmacy_bakery": {
      const whiteClean = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.5 });
      addDesk(group, colliders, 0, -3.2, 6.2, 1.08, 1.0, whiteClean, accentMat);
      if (spec.archetype === "hospital_clinic") {
        addDesk(group, colliders, -4.6, 0.4, 1.4, 0.65, 2.6, whiteClean, accentMat);
        addDesk(group, colliders, 4.6, 0.4, 1.4, 0.65, 2.6, whiteClean, accentMat);
      }
      addInteriorAttendant(group, -1.2, -4.3, 0, "#f8fafc", "#dc2626", "headwrap", textures, colliders);
      break;
    }

    case "guesthouse":
    case "compound_home": {
      const bedSheet = new THREE.MeshStandardMaterial({ color: "#0f766e", roughness: 0.8 });
      const blanket = new THREE.MeshStandardMaterial({ color: "#f59e0b", roughness: 0.8 });
      // Bed / resting area
      const bedX = spec.archetype === "guesthouse" ? 4.0 : -3.6;
      const bedZ = -2.4;
      addDesk(group, colliders, bedX, bedZ, 2.0, 0.55, 2.6, woodMat, bedSheet);
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 0.55), blanket);
      pillow.position.set(bedX, 0.68, bedZ - 0.9);
      group.add(pillow);
      if (spec.archetype === "guesthouse") {
        addDesk(group, colliders, -3.2, -3.0, 3.6, 1.05, 0.9, woodMat, accentMat);
        addInteriorAttendant(group, -3.2, -4.1, 0, "#0f766e", "#fef3c7", "headwrap", textures, colliders);
      } else {
        // Wardrobe + Table radio
        addDesk(group, colliders, 3.6, -2.4, 1.6, 2.1, 0.9, woodMat, accentMat);
        addDesk(group, colliders, 0, -3.8, 1.4, 0.85, 0.8, woodMat, darkTrimMat);
      }
      break;
    }

    case "fitness_print": {
      addDesk(group, colliders, 3.6, -2.8, 3.2, 1.02, 1.0, darkTrimMat, accentMat);
      addDesk(group, colliders, -3.8, -1.2, 2.2, 1.35, 2.2, darkTrimMat, accentMat);
      addInteriorAttendant(group, 3.6, -4.0, 0, "#dc2626", "#f8fafc", "none", textures, colliders);
      break;
    }

    case "club_lounge": {
      const darkWood = new THREE.MeshStandardMaterial({ color: "#27272a", roughness: 0.55 });
      const glowAmber = new THREE.MeshStandardMaterial({
        color: "#f59e0b",
        emissive: "#d97706",
        emissiveIntensity: 0.7,
      });
      const glowMagenta = new THREE.MeshStandardMaterial({
        color: "#f97316",
        emissive: "#ea580c",
        emissiveIntensity: 0.65,
      });
      disposables.push(darkWood, glowAmber, glowMagenta);

      // DJ booth + twin speaker stacks along north wall
      addDesk(group, colliders, 0, -halfD + 1.4, 3.6, 1.15, 1.1, darkTrimMat, glowAmber);
      for (const sx of [-2.3, 2.3]) {
        addDesk(group, colliders, sx, -halfD + 1.4, 0.9, 2.0, 0.85, darkWood, darkTrimMat);
      }

      // Grill & Drinks bar counter on West flank
      addDesk(group, colliders, -4.4, -3.2, 3.0, 1.05, 1.0, accentMat, woodMat);
      addInteriorAttendant(group, -4.4, -4.4, 0, "#f59e0b", "#18181b", "braids", textures, colliders);
      addInteriorAttendant(group, 0, -halfD + 0.65, 0, "#ea580c", "#fef3c7", "none", textures, colliders);

      // Illuminated tiled dance floor center
      const tileColors = ["#f59e0b", "#ea580c", "#fbbf24", "#0284c7"];
      for (let gx = -1; gx <= 1; gx++) {
        for (let gz = -1; gz <= 1; gz++) {
          const tileMat = new THREE.MeshStandardMaterial({
            color: tileColors[(gx + gz + 4) % tileColors.length],
            emissive: tileColors[(gx + gz + 4) % tileColors.length],
            emissiveIntensity: 0.25,
            roughness: 0.3,
          });
          disposables.push(tileMat);
          const tile = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 1.15), tileMat);
          tile.position.set(gx * 1.25, 0.02, -0.5 + gz * 1.25);
          group.add(tile);
        }
      }

      // Animated dancing club patrons
      const dancers: Array<[number, number, number, string, string, "none" | "headwrap" | "braids"]> = [
        [-1.3, -1.0, 0.4, "#f59e0b", "#1e293b", "braids"],
        [1.4, -0.2, -0.5, "#0284c7", "#fef3c7", "none"],
        [-0.5, 0.9, Math.PI * 0.85, "#be123c", "#fde68a", "headwrap"],
      ];
      for (const [dx, dz, rotY, pri, acc, hw] of dancers) {
        const dRig = createCharacterRig(
          {
            outfit: "polo",
            headwear: hw,
            primaryColor: pri,
            accentColor: acc,
            skinTone: "#5f361e",
          },
          textures
        );
        dRig.root.position.set(dx, 0, dz);
        dRig.root.rotation.y = rotY;
        group.add(dRig.root);
        danceRigs.push(dRig);
      }

      // Oware & Ludo wooden game table on East side
      addDesk(group, colliders, 4.6, 0.5, 1.8, 0.82, 1.3, woodMat, woodMat);
      const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.52), glowAmber);
      boardMesh.position.set(4.6, 0.9, 0.5);
      group.add(boardMesh);

      // Pulsing club stage lights
      const l1 = new THREE.PointLight("#f59e0b", 18, 12, 1.4);
      l1.position.set(-2.5, h - 0.7, -1.2);
      const l2 = new THREE.PointLight("#fb7185", 16, 12, 1.4);
      l2.position.set(2.5, h - 0.7, -1.2);
      group.add(l1, l2);
      clubLights.push(l1, l2);
      break;
    }

    case "police_station": {
      const policeBlue = new THREE.MeshStandardMaterial({ color: "#1e3a8a", roughness: 0.45 });
      const silverSteel = new THREE.MeshStandardMaterial({ color: "#94a3b8", metalness: 0.5, roughness: 0.4 });
      disposables.push(policeBlue, silverSteel);

      // Charge Office Desk + Partition + Locker Cabinet
      addDesk(group, colliders, 0, -2.8, 6.2, 1.12, 1.0, policeBlue, woodMat);
      addDesk(group, colliders, -4.8, -0.2, 1.1, 2.0, 2.8, silverSteel, darkTrimMat);
      addDesk(group, colliders, 4.6, 1.2, 1.0, 0.55, 3.2, darkTrimMat, policeBlue);

      // Uniformed Ghana Police Duty Officer behind Charge Desk
      const dutyRig = createCharacterRig(
        {
          outfit: "polo",
          headwear: "none",
          primaryColor: "#1e3a8a",
          accentColor: "#eab308",
          skinTone: "#5b321b",
          policeUniform: true,
        },
        textures
      );
      dutyRig.root.position.set(0, 0, -4.0);
      dutyRig.root.rotation.y = 0;
      group.add(dutyRig.root);
      colliders.push({ minX: -0.36, maxX: 0.36, minZ: -4.36, maxZ: -3.64, minY: 0, maxY: 1.75 });
      break;
    }

    case "player_home_compound": {
      const homeHandles = buildPlayerHomeInterior(
        spec,
        group,
        colliders,
        disposables,
        textures,
        addCeilingFan,
        animatedFans
      );
      syncHomeVisuals = homeHandles.syncVisuals;
      break;
    }

    default: {
      // Market hall, Cultural gallery, Palace, Mosque
      addDesk(group, colliders, 0, -2.8, 5.2, 0.98, 1.0, woodMat, accentMat);
      addDesk(group, colliders, -4.2, 0.4, 1.1, 0.52, 3.2, woodMat, accentMat);
      addInteriorAttendant(group, 0, -4.0, 0, spec.accentColor, "#fef3c7", "kufi", textures, colliders);
      break;
    }
  }

  // Visual glowing floor markers at every interactive station inside the room
  const markerGeo = new THREE.RingGeometry(0.52, 0.72, 20);
  disposables.push(markerGeo);
  for (const st of spec.stations) {
    const isExit = st.kind === "exit_door";
    const markerMat = new THREE.MeshBasicMaterial({
      color: isExit ? "#fbbf24" : "#34d399",
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
    });
    disposables.push(markerMat);
    const ring = new THREE.Mesh(markerGeo, markerMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(st.x, 0.03, st.z);
    group.add(ring);
    stationMarkers.push({ id: st.id, ring });
  }

  // Track geometries/materials for clean room unload
  disposables.push(floorMat, wallMat, ceilingMat, accentMat, woodMat, darkTrimMat, glassMat);

  return {
    group,
    colliders,
    animatedFans,
    stationMarkers,
    danceRigs,
    clubLights,
    syncHomeVisuals,
    dispose: () => {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}
