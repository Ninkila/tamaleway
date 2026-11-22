import * as THREE from "three";
import { findRoadRoute, ROAD_SEGMENTS } from "../data/tamaleRoadGraph";
import { TAMALE_LANDMARKS, TAMALE_ROADS } from "../data/tamaleWorldData";
import {
  TAMALE_BENCH_PLACEMENTS,
  TAMALE_BUS_STOPS,
  TAMALE_HOUSE_SPECS,
  TAMALE_LANDMARK_BOX_FOOTPRINTS,
  TAMALE_LANDMARK_CYLINDERS,
  TAMALE_PARKED_MOTOS,
  TAMALE_SHOP_SPECS,
  TAMALE_SPEED_HUMPS,
  TAMALE_STALL_PLACEMENTS,
  TAMALE_TREE_PLACEMENTS,
} from "../data/tamaleWorldLayout";

export interface WorldBox2D {
  id: string;
  category: "landmark" | "shop" | "house" | "road" | "prop";
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WorldValidationIssue {
  severity: "error" | "warning";
  kind:
    | "disconnected_road"
    | "unreachable_landmark"
    | "building_on_road"
    | "building_overlap"
    | "prop_on_road";
  message: string;
}

export interface WorldValidationReport {
  ok: boolean;
  roadSegmentCount: number;
  roadConnectedComponents: number;
  unreachableLandmarkPairs: number;
  buildingVsRoadOverlaps: number;
  buildingVsBuildingOverlaps: number;
  propVsRoadOverlaps: number;
  issues: WorldValidationIssue[];
}

function boxesOverlap(a: WorldBox2D, b: WorldBox2D, pad = 0): boolean {
  return (
    a.minX + pad < b.maxX &&
    a.maxX - pad > b.minX &&
    a.minZ + pad < b.maxZ &&
    a.maxZ - pad > b.minZ
  );
}

function getRotatedAabbExtent(
  x: number,
  z: number,
  halfW: number,
  halfD: number,
  rotY: number
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const c = Math.abs(Math.cos(rotY));
  const s = Math.abs(Math.sin(rotY));
  const hx = halfW * c + halfD * s;
  const hz = halfW * s + halfD * c;
  return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
}

export function getAllWorldRoadBoxes(): WorldBox2D[] {
  return TAMALE_ROADS.map((r) => ({
    id: r.id,
    category: "road",
    minX: r.x - r.width / 2,
    maxX: r.x + r.width / 2,
    minZ: r.z - r.depth / 2,
    maxZ: r.z + r.depth / 2,
  }));
}

export function getAllWorldBuildingBoxes(): WorldBox2D[] {
  const out: WorldBox2D[] = [];

  for (const lm of TAMALE_LANDMARK_BOX_FOOTPRINTS) {
    out.push({
      id: `landmark:${lm.id}`,
      category: "landmark",
      minX: lm.minX,
      maxX: lm.maxX,
      minZ: lm.minZ,
      maxZ: lm.maxZ,
    });
  }

  for (const cyl of TAMALE_LANDMARK_CYLINDERS) {
    out.push({
      id: `landmark:${cyl.id}`,
      category: "landmark",
      minX: cyl.x - cyl.radius,
      maxX: cyl.x + cyl.radius,
      minZ: cyl.z - cyl.radius,
      maxZ: cyl.z + cyl.radius,
    });
  }

  for (const s of TAMALE_SHOP_SPECS) {
    const ext = getRotatedAabbExtent(s.x, s.z, s.w / 2, s.d / 2, s.rotY);
    out.push({ id: `shop:${s.name}`, category: "shop", ...ext });
  }

  for (const h of TAMALE_HOUSE_SPECS) {
    const ext = getRotatedAabbExtent(h.x, h.z, h.halfW, h.halfD, h.rotY);
    out.push({ id: `house:${h.variant}@(${h.x},${h.z})`, category: "house", ...ext });
  }

  return out;
}

export function validateTamaleWorld(): WorldValidationReport {
  const issues: WorldValidationIssue[] = [];
  const roadBoxes = getAllWorldRoadBoxes();
  const buildingBoxes = getAllWorldBuildingBoxes();

  // 1. Road segment connected components
  const visited = new Set<string>();
  let roadConnectedComponents = 0;
  for (const seg of ROAD_SEGMENTS) {
    if (visited.has(seg.id)) continue;
    roadConnectedComponents++;
    const queue = [seg];
    visited.add(seg.id);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const curBox = roadBoxes.find((b) => b.id === cur.id)!;
      for (const other of ROAD_SEGMENTS) {
        if (visited.has(other.id)) continue;
        const otherBox = roadBoxes.find((b) => b.id === other.id)!;
        if (boxesOverlap(curBox, otherBox, -0.5)) {
          visited.add(other.id);
          queue.push(other);
        }
      }
    }
  }
  if (roadConnectedComponents > 1) {
    issues.push({
      severity: "error",
      kind: "disconnected_road",
      message: `Road network has ${roadConnectedComponents} disconnected components.`,
    });
  }

  // 2. Landmark route reachability
  let unreachableLandmarkPairs = 0;
  for (let i = 0; i < TAMALE_LANDMARKS.length; i++) {
    for (let j = i + 1; j < TAMALE_LANDMARKS.length; j++) {
      const a = TAMALE_LANDMARKS[i];
      const b = TAMALE_LANDMARKS[j];
      const path = findRoadRoute(a.x, a.z, b.x, b.z, { directThreshold: 5 });
      if (!path || path.length === 0) {
        unreachableLandmarkPairs++;
        issues.push({
          severity: "error",
          kind: "unreachable_landmark",
          message: `No road path between ${a.id} and ${b.id}`,
        });
      }
    }
  }

  // 3. Building vs Road overlaps
  let buildingVsRoadOverlaps = 0;
  for (const b of buildingBoxes) {
    for (const r of roadBoxes) {
      if (boxesOverlap(b, r, 0.05)) {
        buildingVsRoadOverlaps++;
        issues.push({
          severity: "error",
          kind: "building_on_road",
          message: `${b.id} overlaps road ${r.id}`,
        });
      }
    }
  }

  // 4. Building vs Building overlaps
  let buildingVsBuildingOverlaps = 0;
  for (let i = 0; i < buildingBoxes.length; i++) {
    for (let j = i + 1; j < buildingBoxes.length; j++) {
      // Allow stadium bowl & its attached gatehouse doorway box to touch
      const idA = buildingBoxes[i].id;
      const idB = buildingBoxes[j].id;
      if (
        (idA.includes("stadium") && idB.includes("stadium")) ||
        (idA.includes("mosque") && idB.includes("mosque"))
      ) {
        continue;
      }
      if (boxesOverlap(buildingBoxes[i], buildingBoxes[j], 0.1)) {
        buildingVsBuildingOverlaps++;
        issues.push({
          severity: "error",
          kind: "building_overlap",
          message: `${idA} overlaps ${idB}`,
        });
      }
    }
  }

  // 5. Props vs Road carriageway overlaps
  let propVsRoadOverlaps = 0;
  const checkPointProp = (label: string, x: number, z: number, radius: number) => {
    const pBox: WorldBox2D = {
      id: label,
      category: "prop",
      minX: x - radius,
      maxX: x + radius,
      minZ: z - radius,
      maxZ: z + radius,
    };
    for (const r of roadBoxes) {
      if (boxesOverlap(pBox, r, 0.05)) {
        propVsRoadOverlaps++;
        issues.push({
          severity: "warning",
          kind: "prop_on_road",
          message: `${label} at (${x}, ${z}) overlaps carriageway ${r.id}`,
        });
      }
    }
  };

  for (const sp of TAMALE_STALL_PLACEMENTS) {
    checkPointProp(`stall:${sp.kind}`, sp.x, sp.z, 0.65);
  }
  for (const [bx, bz] of TAMALE_BENCH_PLACEMENTS) {
    checkPointProp("bench", bx, bz, 0.55);
  }
  for (const [tx, tz, ttype] of TAMALE_TREE_PLACEMENTS) {
    checkPointProp(`tree:${ttype}`, tx, tz, 0.72);
  }
  for (const [mx, mz] of TAMALE_PARKED_MOTOS) {
    checkPointProp("parked_moto", mx, mz, 0.45);
  }
  for (const [bx, bz, , lbl] of TAMALE_BUS_STOPS) {
    checkPointProp(`bus_stop:${lbl}`, bx, bz, 0.55);
  }

  const ok =
    roadConnectedComponents === 1 &&
    unreachableLandmarkPairs === 0 &&
    buildingVsRoadOverlaps === 0 &&
    buildingVsBuildingOverlaps === 0 &&
    propVsRoadOverlaps === 0;

  return {
    ok,
    roadSegmentCount: ROAD_SEGMENTS.length,
    roadConnectedComponents,
    unreachableLandmarkPairs,
    buildingVsRoadOverlaps,
    buildingVsBuildingOverlaps,
    propVsRoadOverlaps,
    issues,
  };
}

/**
 * Dev-only wireframe overlay showing road graph corridors, building collision bounds,
 * speed humps, and landmark centers. Toggleable (off by default).
 */
export function buildWorldDebugWireframeGroup(): THREE.Group {
  const group = new THREE.Group();
  group.name = "worldDebugOverlay";
  group.visible = false;

  const roadLineMat = new THREE.LineBasicMaterial({ color: "#38bdf8" });
  const bldgOkMat = new THREE.LineBasicMaterial({ color: "#22c55e" });
  const bldgErrMat = new THREE.LineBasicMaterial({ color: "#ef4444" });

  // Road centerlines at elevated debug Y=0.45 (plus bridge at Y=6.8)
  for (const seg of ROAD_SEGMENTS) {
    const pts =
      seg.orientation === "ew"
        ? [new THREE.Vector3(seg.min, 0.45, seg.coord), new THREE.Vector3(seg.max, 0.45, seg.coord)]
        : [new THREE.Vector3(seg.coord, 0.45, seg.min), new THREE.Vector3(seg.coord, 0.45, seg.max)];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), roadLineMat));
  }

  // Building footprint wire rectangles
  const roadBoxes = getAllWorldRoadBoxes();
  for (const b of getAllWorldBuildingBoxes()) {
    const hasRoadHit = roadBoxes.some((r) => boxesOverlap(b, r, 0.05));
    const pts = [
      new THREE.Vector3(b.minX, 0.5, b.minZ),
      new THREE.Vector3(b.maxX, 0.5, b.minZ),
      new THREE.Vector3(b.maxX, 0.5, b.maxZ),
      new THREE.Vector3(b.minX, 0.5, b.maxZ),
      new THREE.Vector3(b.minX, 0.5, b.minZ),
    ];
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        hasRoadHit ? bldgErrMat : bldgOkMat
      )
    );
  }

  // Speed hump markers
  const humpMat = new THREE.MeshBasicMaterial({ color: "#facc15", wireframe: true });
  for (const sh of TAMALE_SPEED_HUMPS) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(sh.w ?? 9, 0.5, 1.0), humpMat);
    marker.position.set(sh.x, 0.4, sh.z);
    marker.rotation.y = sh.rotY;
    group.add(marker);
  }

  return group;
}
