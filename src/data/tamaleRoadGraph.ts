import { TAMALE_ROADS } from "./tamaleWorldData";

export interface RoadSegmentInfo {
  id: string;
  name: string;
  orientation: "ew" | "ns";
  coord: number; // z for ew, x for ns
  min: number; // minX for ew, minZ for ns
  max: number; // maxX for ew, maxZ for ns
  halfWidth: number;
}

export const ROAD_SEGMENTS: RoadSegmentInfo[] = TAMALE_ROADS.map((r) => {
  if (r.orientation === "ew") {
    return {
      id: r.id,
      name: r.name,
      orientation: "ew",
      coord: r.z,
      min: r.x - r.width / 2,
      max: r.x + r.width / 2,
      halfWidth: r.depth / 2,
    };
  }
  return {
    id: r.id,
    name: r.name,
    orientation: "ns",
    coord: r.x,
    min: r.z - r.depth / 2,
    max: r.z + r.depth / 2,
    halfWidth: r.width / 2,
  };
});

export const EW_ROAD_SEGMENTS = ROAD_SEGMENTS.filter((r) => r.orientation === "ew");
export const NS_ROAD_SEGMENTS = ROAD_SEGMENTS.filter((r) => r.orientation === "ns");

export const ALL_EW_ROAD_COORDS = EW_ROAD_SEGMENTS.map((r) => r.coord);
export const ALL_NS_ROAD_COORDS = NS_ROAD_SEGMENTS.map((r) => r.coord);

export function getRoadSegmentAt(
  axis: "x" | "z",
  roadCoord: number
): RoadSegmentInfo | undefined {
  const targetOrientation = axis === "x" ? "ew" : "ns";
  return ROAD_SEGMENTS.find(
    (s) => s.orientation === targetOrientation && Math.abs(s.coord - roadCoord) < 0.5
  );
}

/**
 * Returns sorted intersecting crossroad coordinates that physically meet the given road.
 */
export function getCrossRoadsAlong(axis: "x" | "z", roadCoord: number): number[] {
  const seg = getRoadSegmentAt(axis, roadCoord);
  if (!seg) return [];
  const crossSegs = axis === "x" ? NS_ROAD_SEGMENTS : EW_ROAD_SEGMENTS;
  const crosses: number[] = [];
  for (const c of crossSegs) {
    const withinMain = c.coord >= seg.min - 1 && c.coord <= seg.max + 1;
    const withinCross = roadCoord >= c.min - 1 && roadCoord <= c.max + 1;
    if (withinMain && withinCross) {
      crosses.push(c.coord);
    }
  }
  crosses.sort((a, b) => a - b);
  return crosses;
}

export function getRoadExtentBounds(
  axis: "x" | "z",
  roadCoord: number
): { min: number; max: number } {
  const seg = getRoadSegmentAt(axis, roadCoord);
  if (!seg) {
    return axis === "x" ? { min: -195, max: 195 } : { min: -172, max: 172 };
  }
  return {
    min: Math.max(-210, seg.min + 6),
    max: Math.min(210, seg.max - 6),
  };
}

interface GraphNode {
  id: string;
  x: number;
  z: number;
  neighbors: Array<{ id: string; cost: number }>;
}

const INTERSECTION_NODES: GraphNode[] = [];
const NODE_BY_ID = new Map<string, GraphNode>();

function buildRoadGraph() {
  if (INTERSECTION_NODES.length > 0) return;

  const ewSegNodes = new Map<string, GraphNode[]>();
  const nsSegNodes = new Map<string, GraphNode[]>();

  for (const ew of EW_ROAD_SEGMENTS) ewSegNodes.set(ew.id, []);
  for (const ns of NS_ROAD_SEGMENTS) nsSegNodes.set(ns.id, []);

  // Create intersection nodes wherever EW & NS roads overlap
  for (const ew of EW_ROAD_SEGMENTS) {
    for (const ns of NS_ROAD_SEGMENTS) {
      const hitsX = ns.coord >= ew.min - 1.5 && ns.coord <= ew.max + 1.5;
      const hitsZ = ew.coord >= ns.min - 1.5 && ew.coord <= ns.max + 1.5;
      if (hitsX && hitsZ) {
        const id = `ix_${ns.coord}_${ew.coord}`;
        const node: GraphNode = {
          id,
          x: ns.coord,
          z: ew.coord,
          neighbors: [],
        };
        INTERSECTION_NODES.push(node);
        NODE_BY_ID.set(id, node);
        ewSegNodes.get(ew.id)!.push(node);
        nsSegNodes.get(ns.id)!.push(node);
      }
    }
  }

  // Also add terminal endpoint nodes so dead-end spurs (e.g. Airport N10 North, Vittin East) stay reachable
  for (const seg of ROAD_SEGMENTS) {
    const list =
      seg.orientation === "ew" ? ewSegNodes.get(seg.id)! : nsSegNodes.get(seg.id)!;
    for (const endVal of [seg.min + 4, seg.max - 4]) {
      const x = seg.orientation === "ew" ? endVal : seg.coord;
      const z = seg.orientation === "ew" ? seg.coord : endVal;
      const nearExisting = list.some((n) => Math.hypot(n.x - x, n.z - z) < 12);
      if (!nearExisting) {
        const id = `end_${seg.id}_${Math.round(endVal)}`;
        const node: GraphNode = { id, x, z, neighbors: [] };
        INTERSECTION_NODES.push(node);
        NODE_BY_ID.set(id, node);
        list.push(node);
      }
    }
  }

  // Link adjacent nodes along each EW corridor
  for (const nodes of ewSegNodes.values()) {
    nodes.sort((a, b) => a.x - b.x);
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const dist = Math.hypot(b.x - a.x, b.z - a.z);
      a.neighbors.push({ id: b.id, cost: dist });
      b.neighbors.push({ id: a.id, cost: dist });
    }
  }

  // Link adjacent nodes along each NS corridor
  for (const nodes of nsSegNodes.values()) {
    nodes.sort((a, b) => a.z - b.z);
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];
      const dist = Math.hypot(b.x - a.x, b.z - a.z);
      a.neighbors.push({ id: b.id, cost: dist });
      b.neighbors.push({ id: a.id, cost: dist });
    }
  }
}

buildRoadGraph();

function projectPointToNearestRoad(
  px: number,
  pz: number
): { x: number; z: number; seg: RoadSegmentInfo } {
  let bestDist = Infinity;
  let bestX = px;
  let bestZ = pz;
  let bestSeg = ROAD_SEGMENTS[0];

  for (const seg of ROAD_SEGMENTS) {
    let cx: number;
    let cz: number;
    if (seg.orientation === "ew") {
      cx = Math.max(seg.min + 3, Math.min(seg.max - 3, px));
      cz = seg.coord;
    } else {
      cx = seg.coord;
      cz = Math.max(seg.min + 3, Math.min(seg.max - 3, pz));
    }
    const d = Math.hypot(cx - px, cz - pz);
    if (d < bestDist) {
      bestDist = d;
      bestX = cx;
      bestZ = cz;
      bestSeg = seg;
    }
  }
  return { x: bestX, z: bestZ, seg: bestSeg };
}

function getNodesOnSegment(seg: RoadSegmentInfo): GraphNode[] {
  return INTERSECTION_NODES.filter((n) =>
    seg.orientation === "ew"
      ? Math.abs(n.z - seg.coord) < 0.6 && n.x >= seg.min - 2 && n.x <= seg.max + 2
      : Math.abs(n.x - seg.coord) < 0.6 && n.z >= seg.min - 2 && n.z <= seg.max + 2
  );
}

/**
 * Prevents vehicles or pedestrians routed through (0, 0) Naa Gbewaa Interchange
 * from clipping the central roundabout island ([-4.1..4.1, -4.1..4.1]) or bridge piers.
 */
function routeAroundInterchangeRoundabout(
  pts: Array<{ x: number; z: number }>,
  ringRadius = 5.4
): Array<{ x: number; z: number }> {
  const out: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (Math.hypot(p.x, p.z) < 2.0 && i > 0 && i < pts.length - 1) {
      const prev = pts[i - 1];
      const next = pts[i + 1];
      const a1 = Math.atan2(prev.z, prev.x);
      const a2 = Math.atan2(next.z, next.x);
      let delta = a2 - a1;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      const steps = Math.abs(delta) > Math.PI * 0.72 ? 2 : 1;
      for (let s = 1; s <= steps; s++) {
        const ang = a1 + (delta * s) / (steps + 1);
        out.push({
          x: Math.round(Math.cos(ang) * ringRadius * 10) / 10,
          z: Math.round(Math.sin(ang) * ringRadius * 10) / 10,
        });
      }
      continue;
    }
    out.push(p);
  }
  return out;
}

export interface FindRoadRouteOptions {
  /** Offset from centerline (e.g. 6.2..7.5 for pedestrian sidewalks along streets, 0 for center asphalt) */
  sidewalkOffset?: number;
  /** Threshold below which direct point-to-point movement is returned without road snapping */
  directThreshold?: number;
}

/**
 * Computes an interconnected, obstacle-safe road/sidewalk path across Tamale's
 * full 17-road network (primary arterials + secondary neighbourhood connectors).
 */
export function findRoadRoute(
  sx: number,
  sz: number,
  tx: number,
  tz: number,
  options: FindRoadRouteOptions = {}
): Array<{ x: number; z: number }> {
  const directThreshold = options.directThreshold ?? 22;
  const distTotal = Math.hypot(tx - sx, tz - sz);
  if (distTotal < directThreshold) {
    return [{ x: tx, z: tz }];
  }

  const startProj = projectPointToNearestRoad(sx, sz);
  const endProj = projectPointToNearestRoad(tx, tz);

  // If both endpoints project onto the exact same road and aren't obstructed by (0,0) island
  if (
    startProj.seg.id === endProj.seg.id &&
    !(
      startProj.seg.coord === 0 &&
      ((startProj.seg.orientation === "ew" && startProj.x * endProj.x < 0) ||
        (startProj.seg.orientation === "ns" && startProj.z * endProj.z < 0))
    )
  ) {
    return [
      { x: startProj.x, z: startProj.z },
      { x: endProj.x, z: endProj.z },
      { x: tx, z: tz },
    ];
  }

  // Temporary start & goal nodes linked onto their respective road segments
  const startCandidates = getNodesOnSegment(startProj.seg);
  const endCandidates = getNodesOnSegment(endProj.seg);

  const distMap = new Map<string, number>();
  const prevMap = new Map<string, string>();
  const visited = new Set<string>();
  const queue: Array<{ id: string; cost: number }> = [];

  for (const node of INTERSECTION_NODES) {
    distMap.set(node.id, Infinity);
  }
  distMap.set("__GOAL__", Infinity);

  const startId = "__START__";
  const goalId = "__GOAL__";

  // Seed Dijkstra from start projection to its segment nodes
  for (const n of startCandidates) {
    const c = Math.hypot(n.x - startProj.x, n.z - startProj.z);
    if (c < (distMap.get(n.id) ?? Infinity)) {
      distMap.set(n.id, c);
      prevMap.set(n.id, startId);
      queue.push({ id: n.id, cost: c });
    }
  }

  // Fallback if segment had no candidates (should never happen)
  if (queue.length === 0) {
    return [{ x: startProj.x, z: startProj.z }, { x: endProj.x, z: endProj.z }, { x: tx, z: tz }];
  }

  const endCandidateMap = new Map<string, number>();
  for (const n of endCandidates) {
    endCandidateMap.set(n.id, Math.hypot(endProj.x - n.x, endProj.z - n.z));
  }

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const cur = queue.shift()!;
    if (visited.has(cur.id)) continue;
    visited.add(cur.id);
    if (cur.id === goalId) break;

    const toGoalCost = endCandidateMap.get(cur.id);
    if (toGoalCost !== undefined) {
      const nextGoalCost = cur.cost + toGoalCost;
      if (nextGoalCost < (distMap.get(goalId) ?? Infinity)) {
        distMap.set(goalId, nextGoalCost);
        prevMap.set(goalId, cur.id);
        queue.push({ id: goalId, cost: nextGoalCost });
      }
    }

    const node = NODE_BY_ID.get(cur.id);
    if (!node) continue;
    for (const edge of node.neighbors) {
      if (visited.has(edge.id)) continue;
      const alt = cur.cost + edge.cost;
      if (alt < (distMap.get(edge.id) ?? Infinity)) {
        distMap.set(edge.id, alt);
        prevMap.set(edge.id, cur.id);
        queue.push({ id: edge.id, cost: alt });
      }
    }
  }

  // Reconstruct path
  const rawPts: Array<{ x: number; z: number }> = [];
  let trace: string | undefined = prevMap.get(goalId);
  const stack: Array<{ x: number; z: number }> = [];
  while (trace && trace !== startId) {
    const n = NODE_BY_ID.get(trace);
    if (n) stack.push({ x: n.x, z: n.z });
    trace = prevMap.get(trace);
  }
  stack.reverse();

  const sidewalkOffset = options.sidewalkOffset ?? 0;
  rawPts.push({ x: startProj.x, z: startProj.z });
  for (let i = 0; i < stack.length; i++) {
    const p = stack[i];
    if (sidewalkOffset > 0) {
      // Shift intersection corner slightly onto consistent sidewalk edge (SE side of intersections)
      const prev = i === 0 ? startProj : stack[i - 1];
      const dx = p.x - prev.x;
      const dz = p.z - prev.z;
      const shiftX = Math.abs(dz) > Math.abs(dx) ? sidewalkOffset : sidewalkOffset * 0.65;
      const shiftZ = Math.abs(dx) > Math.abs(dz) ? sidewalkOffset : sidewalkOffset * 0.65;
      rawPts.push({ x: p.x + shiftX, z: p.z + shiftZ });
    } else {
      rawPts.push(p);
    }
  }
  rawPts.push({ x: endProj.x, z: endProj.z });
  rawPts.push({ x: tx, z: tz });

  const roundaboutSafe = routeAroundInterchangeRoundabout(
    rawPts,
    sidewalkOffset > 0 ? 6.4 : 5.4
  );

  // Deduplicate closely spaced waypoints
  const deduped: Array<{ x: number; z: number }> = [];
  for (const pt of roundaboutSafe) {
    const prev = deduped[deduped.length - 1];
    if (!prev || Math.hypot(pt.x - prev.x, pt.z - prev.z) > 2.2) {
      deduped.push(pt);
    }
  }
  return deduped;
}
